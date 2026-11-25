// The deterministic screenshot scenes behind ?shot=cover|prep|rush|end. Each one plays the
// real rules forward from a fresh world, steered by a small autopilot that walks the cook
// between the crates, the board, the wok and the serving window, so the frame is what a real
// game looks like and the same seed always gives the same frame.
import { DINEIN, DISH_IDS, INGREDIENTS, PLAYER, RECIPES, SHIFT_SECONDS, STATIONS, STEP, TEA } from './config.js';
import { neediestDiner, neediestTeaDiner, stageDiner } from './dinein.js';
import { EVENT_OVER, stationNear } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY } from './render.js';

const SAMPLE = STEP;

/** Where the autopilot wants to stand to use a station (just below it, on the floor). */
function standPoint(station) {
  return { x: station.x + station.w / 2, y: station.y + station.h + 42 };
}

/** Where the autopilot stands to serve a dining table: just below it — the
 *  table's own rect would put the cook past the floor's bottom edge. */
function tableStandPoint(table) {
  return { x: table.cx, y: table.cy + 46 };
}

function crateFor(ingredient) {
  return STATIONS.crates.find((c) => c.id === ingredient);
}

/**
 * The autopilot's next move: pick the open ticket it can finish soonest (the one whose
 * recipe best matches what is already in the wok and in hand), fetch what that dish still
 * needs (chopping raw items on the way), cook it at the wok, toss only in the green, and
 * carry the plate to the window. Stale stock — items no open ticket needs — is thrown
 * away instead of clogging the cook's hands.
 */
function ticketScore(state, ticket) {
  const wokItems = [...state.wok.items];
  // Raw stock counts toward the dish it chops into.
  const handItems = state.player.carry.map((c) => (INGREDIENTS[c] && INGREDIENTS[c].chopped) || c);
  let score = 0;
  for (const need of RECIPES[ticket.dish].needs) {
    const wi = wokItems.indexOf(need);
    if (wi !== -1) { wokItems.splice(wi, 1); score += 2; continue; }
    const hi = handItems.indexOf(need);
    if (hi !== -1) { handItems.splice(hi, 1); score += 1; }
  }
  return score;
}

function pickTicket(state) {
  let bestTicket = null;
  let bestScore = -1;
  for (const ticket of state.tickets) {
    const score = ticketScore(state, ticket);
    if (score > bestScore) { bestScore = score; bestTicket = ticket; }
  }
  return bestTicket;
}

/** The last carried item is stale when no open ticket's recipe still needs it. Raw stock
 *  counts as its chopped form — bawang in hand is bawang cincang on its way. */
function lastCarriedIsStale(state, ticket) {
  const p = state.player;
  if (p.carry.length === 0) return false;
  const last = p.carry[p.carry.length - 1];
  if (RECIPES[last]) return false;
  // A carried Es Teh is a delivery, never stale stock.
  if (last === TEA.id) return false;
  const lastAsChopped = (INGREDIENTS[last] && INGREDIENTS[last].chopped) || last;
  const wanted = [...RECIPES[ticket.dish].needs];
  for (const item of state.wok.items) {
    const at = wanted.indexOf(item);
    if (at !== -1) wanted.splice(at, 1);
  }
  for (let i = 0; i < p.carry.length - 1; i += 1) {
    const at = wanted.indexOf(p.carry[i]);
    if (at !== -1) wanted.splice(at, 1);
  }
  return wanted.indexOf(lastAsChopped) === -1;
}

export function autopilot(state) {
  const out = { move: { x: 0, y: 0 }, interactPressed: false, interactHeld: false, tossPressed: false, discardPressed: false, confirmPressed: false, pausePressed: false, clickTarget: null };
  const p = state.player;
  const wok = state.wok;
  const near = stationNear(state);

  const goTo = (target) => {
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 10) return true;
    out.move = { x: dx / dist, y: dy / dist };
    return false;
  };

  // 1. A finished plate in hand goes straight to the serving window.
  const dishInHand = p.carry.find((c) => RECIPES[c]);
  if (dishInHand) {
    if (goTo(standPoint(STATIONS.window))) out.interactPressed = true;
    return out;
  }
  // 2. A finished dish waiting at the wok gets picked up.
  if (wok.doneDish) {
    if (goTo(standPoint(STATIONS.wok))) out.interactPressed = true;
    return out;
  }
  // 3. While a dish cooks, stand at the wok and toss the instant the marker is green.
  if (wok.cooking) {
    const marker = Math.sin(wok.phase) * 0.85;
    const arrived = goTo(standPoint(STATIONS.wok));
    if (arrived && Math.abs(marker - wok.greenCenter) <= 0.1) out.tossPressed = true;
    return out;
  }
  // 3b. A carried Es Teh goes to the diner who needs it most; if nobody needs
  // one, the glass is dead weight — throw it away and free the hand.
  if (p.carry.includes(TEA.id)) {
    const needy = neediestDiner(state.dinein);
    if (needy && needy.satisfaction < DINEIN.teaServeBelow) {
      const table = STATIONS.tables.find((t) => t.id === needy.tableId);
      if (goTo(tableStandPoint(table))) out.interactPressed = true;
      return out;
    }
    out.discardPressed = true;
    return out;
  }
  // 3c. A diner who will storm off before finishing without a tea is worth a
  // detour to the Es Teh station — and the need is known the moment he sits
  // down, while the cook is still at the window right above the drink cart.
  // Diners whose meal ends before their satisfaction does never trigger this.
  const needy = neediestTeaDiner(state.dinein);
  if (needy && p.carry.length < PLAYER.carryMax && state.dinein.pour.cooldown <= 0) {
    const pour = state.dinein.pour;
    const arrived = goTo(standPoint(STATIONS.teh));
    if (arrived) {
      const marker = Math.sin(pour.phase) * 0.85;
      if (pour.active && pour.progress >= 0.4 && Math.abs(marker - pour.greenCenter) <= 0.1) {
        // Release: the pour resolves in the green.
      } else {
        out.interactHeld = true;
      }
    }
    return out;
  }
  // 4. A plate waiting at the window with no ticket yet gets picked back up.
  if (state.windowPlate && p.carry.length === 0) {
    if (goTo(standPoint(STATIONS.window))) out.interactPressed = true;
    return out;
  }
  // 5. Otherwise work the ticket that best matches what is already in play.
  if (state.tickets.length === 0) {
    goTo({ x: 640, y: 520 });
    return out;
  }
  const ticket = pickTicket(state);
  // A stale mix in the wok is scraped out before anything else.
  const wokStale = wok.items.some((item) => RECIPES[ticket.dish].needs.indexOf(item) === -1);
  if (wokStale) {
    if (goTo(standPoint(STATIONS.wok))) out.discardPressed = true;
    return out;
  }
  // A stale item on top of the stack is thrown away.
  if (lastCarriedIsStale(state, ticket)) {
    out.discardPressed = true;
    return out;
  }
  const needs = RECIPES[ticket.dish].needs;
  // What the ticket still needs, after the wok's contents and the cook's hands.
  const remaining = [...needs];
  for (const item of wok.items) {
    const at = remaining.indexOf(item);
    if (at !== -1) remaining.splice(at, 1);
  }
  const handAdds = [];
  for (const item of p.carry) {
    const at = remaining.indexOf(item);
    if (at !== -1) { remaining.splice(at, 1); handAdds.push(item); }
  }
  const missing = remaining;
  // Choppable raw stock in hand goes to the board before anything else.
  const rawInHand = p.carry.find((c) => c === 'ayam' || c === 'bawang');
  if (rawInHand) {
    if (goTo(standPoint(STATIONS.board))) out.interactHeld = true;
    return out;
  }
  // Ingredients already in hand go into the wok, last one first.
  if (handAdds.length > 0) {
    if (goTo(standPoint(STATIONS.wok))) out.interactPressed = true;
    return out;
  }
  // Fetch the next missing ingredient; a chopped form needs its raw stock first.
  const next = missing[0];
  if (!next) {
    if (goTo(standPoint(STATIONS.wok))) out.interactPressed = true;
    return out;
  }
  const raw = next === 'ayamCincang' ? 'ayam' : next === 'bawangCincang' ? 'bawang' : next;
  if (goTo(standPoint(crateFor(raw)))) out.interactPressed = true;
  return out;
}

function runAutopilot(world, seconds) {
  let events = 0;
  for (let t = 0; t < seconds; t += SAMPLE) {
    events |= world.step(SAMPLE, autopilot(world.state));
    if (events & EVENT_OVER) break;
  }
  return events;
}

/** Staged frames are stills: fade-out feedback text (pickup notes, perfect-toss
 *  calls) is cleared so it never lands on top of a station label. The frame
 *  stays a real game state — only the transient text is gone. */
function clearTransientFx(state) {
  state.floaters.length = 0;
  state.particles.length = 0;
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * cover: mid-service, wok cooking in the green, three tickets, a plate at the window.
 * prep:  the cook chopping at the board with a ticket half-way down.
 * rush:  late shift, four tickets, one about to burn, wok flaming.
 * end:   the shift played out to its results screen.
 */
export function stageShot(name, world) {
  const state = world.state;
  world.reset();
  if (name === 'prep') {
    runAutopilot(world, 14);
    // Park the cook at the board mid-chop with chopped stock on the counter.
    // Slightly left and low, so the ingredients carried above the hat clear
    // the board's food and the "tahan E" label.
    const board = standPoint(STATIONS.board);
    state.player.x = board.x - 55;
    state.player.y = board.y + 14;
    state.player.carry = ['bawang', 'ayam'];
    state.boardProgress = 0.62;
    state.lastChopQuarter = 2;
    clearTransientFx(state);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'rush') {
    runAutopilot(world, 132);
    // Late shift: force the rush state the autopilot may not have reached.
    state.timeLeft = 46;
    while (state.tickets.length < 4) {
      const dish = DISH_IDS[state.tickets.length % DISH_IDS.length];
      state.tickets.push({ id: 900 + state.tickets.length, dish, patience: 26, maxPatience: 30 });
    }
    state.tickets[0].patience = 4.5;
    if (!state.wok.cooking && !state.wok.doneDish) {
      state.wok.cooking = true;
      state.wok.dish = 'nasiGoreng';
      state.wok.tossesLeft = 2;
      state.wok.perfectTosses = 1;
      state.wok.phase = 0.6;
      state.wok.greenCenter = 0.15;
    }
    // Late shift, both tables full: one diner happy with his teh, one about
    // to storm off — the red PUAS bar is the drama of the frame.
    stageDiner(state.dinein, 'table1', 'mieGoreng', 68, true, 6);
    stageDiner(state.dinein, 'table2', 'gadoGado', 28, false, 9);
    clearTransientFx(state);
    return { screen: SCREEN_PLAY, best: state.coins };
  }
  if (name === 'end') {
    runAutopilot(world, 175);
    state.timeLeft = 0.05;
    world.step(STEP, { move: { x: 0, y: 0 }, interactPressed: false, interactHeld: false, tossPressed: false, discardPressed: false, confirmPressed: false, pausePressed: false, clickTarget: null });
    if (!state.over) {
      state.over = true;
      const coins = state.coins;
      state.stars = coins >= 1250 ? 3 : coins >= 800 ? 2 : coins >= 400 ? 1 : 0;
    }
    clearTransientFx(state);
    return { screen: SCREEN_OVER, best: state.coins };
  }
  // cover (default): a busy mid-service frame.
  runAutopilot(world, 42);
  while (state.tickets.length < 3) {
    const dish = DISH_IDS[state.tickets.length % DISH_IDS.length];
    state.tickets.push({ id: 800 + state.tickets.length, dish, patience: 38, maxPatience: 52 });
  }
  // The wok cooks with its marker sitting in the green, and a finished plate waits at the window.
  if (!state.wok.cooking && !state.wok.doneDish) {
    state.wok.cooking = true;
    state.wok.dish = 'mieGoreng';
    state.wok.tossesLeft = 2;
    state.wok.perfectTosses = 1;
    state.wok.phase = Math.asin(0.1 / 0.85);
    state.wok.greenCenter = 0.1;
  } else if (state.wok.cooking) {
    state.wok.phase = Math.asin(Math.max(-1, Math.min(1, state.wok.greenCenter / 0.85)));
  }
  if (!state.windowPlate) state.windowPlate = 'sateAyam';
  // The cook stands at the wok holding the next ingredient: a dish mid-assembly.
  const wokPoint = standPoint(STATIONS.wok);
  state.player.x = wokPoint.x - 27;
  state.player.y = wokPoint.y + 12;
  // Dine-in sells the new depth at a glance: one happy diner mid-meal with a
  // teh glass, one getting impatient, and the cook carrying an Es Teh.
  stageDiner(state.dinein, 'table1', 'nasiGoreng', 74, true, 5);
  stageDiner(state.dinein, 'table2', 'sotoAyam', 52, false, 7);
  state.player.carry = ['esTeh', 'telur'];
  state.timeLeft = 132;
  clearTransientFx(state);
  return { screen: SCREEN_PLAY, best: state.coins };
}
