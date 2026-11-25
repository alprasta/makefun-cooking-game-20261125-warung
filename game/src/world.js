// Warung Malam's rules: the cook, the tickets, the wok's flame timing, chopping, serving
// and the rush. Everything the game does lives in one step() call per frame; render.js only
// paints the state this file keeps. Deterministic: all randomness comes from the seeded rng.
import {
  CHOP_SECONDS, COLORS, COMBO_STEP, DINEIN, DISH_IDS, FLOOR, FLAME_SPEED, GREEN_HALF,
  INGREDIENTS, INTERACT_RADIUS, patienceSeconds, PERFECT_BONUS, PLAYER, RECIPES,
  SHIFT_SECONDS, spawnIntervalSeconds, STATIONS, starThresholds, TEA, URGENT_SECONDS, YELLOW_HALF,
} from './config.js';
import { dinerAt, createDineIn, maybeSeatDiner, pourStep, serveTea, stepDineIn, tableOf } from './dinein.js';
import { createRandom } from './random.js';
import { sfx } from './audio.js';

export const EVENT_TICKET = 1;
export const EVENT_SERVED = 2;
export const EVENT_BURNT = 4;
export const EVENT_OVER = 8;
export const EVENT_PERFECT = 16;

let ticketId = 0;

/** The station nearest the cook, or null when no station is in reach. */
export function stationNear(state) {
  const { x, y } = state.player;
  let best = null;
  let bestDist = INTERACT_RADIUS;
  const consider = (kind, id, cx, cy) => {
    const dist = Math.hypot(cx - x, cy - y);
    if (dist < bestDist) { bestDist = dist; best = { kind, id, x: cx, y: cy, dist }; }
  };
  for (const crate of STATIONS.crates) consider('crate', crate.id, crate.x + crate.w / 2, crate.y + crate.h / 2);
  const b = STATIONS.board;
  consider('board', 'board', b.x + b.w / 2, b.y + b.h / 2);
  const w = STATIONS.wok;
  consider('wok', 'wok', w.x + w.w / 2, w.y + w.h / 2);
  const win = STATIONS.window;
  consider('window', 'window', win.x + win.w / 2, win.y + win.h / 2);
  const teh = STATIONS.teh;
  consider('teh', 'teh', teh.x + teh.w / 2, teh.y + teh.h / 2);
  for (const table of STATIONS.tables) consider('table', table.id, table.cx, table.cy);
  return best;
}

/** True when the wok's items are exactly one recipe's shopping list, in any order. */
function matchingRecipe(items) {
  if (items.length === 0) return null;
  for (const id of DISH_IDS) {
    const needs = RECIPES[id].needs;
    if (needs.length !== items.length) continue;
    const rest = [...items];
    let ok = true;
    for (const need of needs) {
      const at = rest.indexOf(need);
      if (at === -1) { ok = false; break; }
      rest.splice(at, 1);
    }
    if (ok) return id;
  }
  return null;
}

function burst(state, x, y, color, count, speed, rng) {
  // rng defaults to the core game's stream; dine-in feedback passes the
  // dine-in stream, so a tip burst never shifts the next ticket or flame.
  const draw = rng || state.rng;
  for (let i = 0; i < count; i += 1) {
    const angle = draw.range(0, Math.PI * 2);
    const v = draw.range(speed * 0.4, speed);
    state.particles.push({
      x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v - 40,
      life: draw.range(0.4, 0.9), maxLife: 0.9, color, size: draw.range(2, 5),
    });
  }
}

function floater(state, x, y, text, color) {
  state.floaters.push({ x, y, text, color: color || COLORS.cream, life: 1.4 });
}

function spawnTicket(state) {
  // Never stack three of the same dish on the board at once.
  let dish = state.rng.pick(DISH_IDS);
  for (let tries = 0; tries < 6; tries += 1) {
    const same = state.tickets.filter((t) => t.dish === dish).length;
    if (same < 2) break;
    dish = state.rng.pick(DISH_IDS);
  }
  const rush = 1 - state.timeLeft / SHIFT_SECONDS;
  const patience = patienceSeconds(rush);
  state.tickets.push({ id: ticketId += 1, dish, patience, maxPatience: patience });
  sfx.ticket();
  return EVENT_TICKET;
}

function startCooking(state) {
  const dish = matchingRecipe(state.wok.items);
  state.wok.cooking = true;
  state.wok.dish = dish;
  state.wok.tossesLeft = RECIPES[dish].tosses;
  state.wok.perfectTosses = 0;
  state.wok.phase = state.rng.range(0, Math.PI * 2);
  state.wok.greenCenter = state.rng.range(-0.45, 0.45);
  state.wok.items = [];
  sfx.sizzleStart();
  burst(state, STATIONS.wok.x + 95, STATIONS.wok.y + 30, '#ff9a3c', 10, 90);
}

function resolveToss(state) {
  const wok = state.wok;
  const marker = Math.sin(wok.phase) * 0.85;
  const distance = Math.abs(marker - wok.greenCenter);
  const cx = STATIONS.wok.x + 95;
  const cy = STATIONS.wok.y + 20;
  if (distance <= GREEN_HALF) {
    wok.tossesLeft -= 1;
    wok.perfectTosses += 1;
    state.combo += 1;
    state.perfectCount += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    sfx.tossPerfect();
    burst(state, cx, cy, '#ffd94d', 16, 160);
    burst(state, cx, cy, '#58c96b', 10, 120);
    floater(state, cx, cy - 30, 'SEMPURNA! +' + PERFECT_BONUS, '#58c96b');
    if (wok.tossesLeft > 0) wok.greenCenter = state.rng.range(-0.45, 0.45);
    return EVENT_PERFECT;
  }
  if (distance <= YELLOW_HALF) {
    wok.tossesLeft -= 1;
    sfx.tossOk();
    burst(state, cx, cy, '#f2c14e', 10, 120);
    floater(state, cx, cy - 30, 'Lumayan', '#f2c14e');
    if (wok.tossesLeft > 0) wok.greenCenter = state.rng.range(-0.45, 0.45);
    return 0;
  }
  // Red zone: the dish burns, the wok is scraped clean, the combo dies.
  wok.cooking = false;
  wok.dish = null;
  wok.tossesLeft = 0;
  wok.perfectTosses = 0;
  state.combo = 0;
  state.burntCount += 1;
  sfx.burnt();
  sfx.sizzleStop();
  burst(state, cx, cy, '#555', 18, 90);
  floater(state, cx, cy - 30, 'GOSONG!', '#e5484d');
  return EVENT_BURNT;
}

function serveDish(state, dish) {
  const ticketIndex = state.tickets.findIndex((t) => t.dish === dish);
  if (ticketIndex === -1) return false;
  const ticket = state.tickets[ticketIndex];
  state.tickets.splice(ticketIndex, 1);
  const base = RECIPES[dish].coins + state.wokServedPerfect * PERFECT_BONUS;
  const patienceBonus = Math.round((ticket.patience / ticket.maxPatience) * 30);
  const paid = Math.round((base + patienceBonus) * (1 + state.combo * COMBO_STEP));
  state.coins += paid;
  state.score += paid;
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.servedCount += 1;
  state.wokServedPerfect = 0;
  sfx.serve();
  const win = STATIONS.window;
  burst(state, win.x + 75, win.y + 20, '#ffd94d', 18, 150);
  floater(state, win.x + 75, win.y - 14, '+' + paid + ' Rp', '#ffd94d');
  // Half of served dishes are eaten at a table instead of taken away: the
  // customer sits down with the plate and a satisfaction meter starts draining.
  // The roll lives on the dine-in stream, so the core game's own random draws
  // (tickets, flame swings) are exactly what they were before dine-in existed.
  const diner = maybeSeatDiner(state.dinein, dish);
  if (diner) {
    const table = tableOf(diner);
    floater(state, table.cx, table.cy - 100, RECIPES[dish].label + ' — makan di tempat!', '#7dc383');
  }
  return true;
}

export function createWorld(rng, seed) {
  // Dine-in runs on its own seeded stream, derived from the night's seed, so
  // no dine-in draw ever shifts the core game's tickets or flame swings — the
  // night plays exactly as it did before dine-in existed, plus the new loop.
  const dineRng = createRandom(((typeof seed === 'number' ? (seed ^ 0xd1e17) >>> 0 : Math.floor(rng.next() * 4294967296)) || 1));
  const state = {
    rng,
    timeLeft: SHIFT_SECONDS,
    spawnTimer: 4,
    tickets: [],
    player: { x: 640, y: 520, carry: [], facing: 1 },
    wok: { items: [], cooking: false, dish: null, tossesLeft: 0, perfectTosses: 0, phase: 0, greenCenter: 0, doneDish: null },
    wokServedPerfect: 0,
    boardProgress: 0,
    lastChopQuarter: -1,
    windowPlate: null,
    coins: 0, score: 0, combo: 0, bestCombo: 0,
    servedCount: 0, perfectCount: 0, burntCount: 0, expiredCount: 0,
    dinein: createDineIn(dineRng),
    particles: [], floaters: [],
    hint: '', hintTimer: 0,
    over: false, stars: 0,
  };

  function reset() {
    state.timeLeft = SHIFT_SECONDS;
    state.spawnTimer = 4;
    state.tickets = [];
    state.player = { x: 640, y: 520, carry: [], facing: 1 };
    state.wok = { items: [], cooking: false, dish: null, tossesLeft: 0, perfectTosses: 0, phase: 0, greenCenter: 0, doneDish: null };
    state.wokServedPerfect = 0;
    state.boardProgress = 0;
    state.lastChopQuarter = -1;
    state.windowPlate = null;
    state.coins = 0; state.score = 0; state.combo = 0; state.bestCombo = 0;
    state.servedCount = 0; state.perfectCount = 0; state.burntCount = 0; state.expiredCount = 0;
    state.dinein = createDineIn(dineRng);
    state.particles = []; state.floaters = [];
    state.hint = ''; state.hintTimer = 0;
    state.over = false; state.stars = 0;
    spawnTicket(state);
    spawnTicket(state);
  }

  function movePlayer(dt, input) {
    const p = state.player;
    let mx = input.move.x;
    let my = input.move.y;
    if (mx === 0 && my === 0 && input.clickTarget) {
      const dx = input.clickTarget.x - p.x;
      const dy = input.clickTarget.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 8) { mx = dx / dist; my = dy / dist; }
    }
    const len = Math.hypot(mx, my);
    if (len > 0) {
      mx /= len; my /= len;
      p.x += mx * PLAYER.speed * dt;
      p.y += my * PLAYER.speed * dt;
      if (Math.abs(mx) > 0.1) p.facing = mx > 0 ? 1 : -1;
    }
    p.x = Math.max(FLOOR.left + PLAYER.radius, Math.min(FLOOR.right - PLAYER.radius, p.x));
    p.y = Math.max(FLOOR.top + PLAYER.radius, Math.min(FLOOR.bottom - PLAYER.radius, p.y));
  }

  function interact() {
    const near = stationNear(state);
    if (!near) return;
    const p = state.player;
    if (near.kind === 'crate') {
      if (p.carry.length >= PLAYER.carryMax) {
        state.hint = 'Tangan penuh! (maks 3)'; state.hintTimer = 1.5; sfx.denied();
        return;
      }
      p.carry.push(near.id);
      sfx.pickup();
      floater(state, p.x, p.y - 40, '+ ' + INGREDIENTS[near.id].label, COLORS.cream);
      return;
    }
    if (near.kind === 'wok') {
      const wok = state.wok;
      if (wok.doneDish) {
        if (p.carry.length >= PLAYER.carryMax) {
          state.hint = 'Tangan penuh!'; state.hintTimer = 1.5; sfx.denied();
          return;
        }
        state.wokServedPerfect = wok.perfectTosses;
        p.carry.push(wok.doneDish);
        wok.doneDish = null;
        sfx.pickup();
        floater(state, p.x, p.y - 40, RECIPES[p.carry[p.carry.length - 1]].label + ' siap!', '#ffd94d');
        return;
      }
      if (wok.cooking) {
        state.hint = 'Lagi dimasak — lempar pas hijau! (Spasi)'; state.hintTimer = 1.5;
        return;
      }
      if (p.carry.length === 0) {
        state.hint = 'Bawa bahan ke wok dulu'; state.hintTimer = 1.5;
        return;
      }
      // Drop the last carried ingredient into the wok — a carried Es Teh stays
      // in hand, it is a drink for a diner, not wok stock.
      let itemIndex = p.carry.length - 1;
      while (itemIndex >= 0 && p.carry[itemIndex] === TEA.id) itemIndex -= 1;
      if (itemIndex === -1) {
        state.hint = 'Bawa bahan ke wok dulu'; state.hintTimer = 1.5;
        return;
      }
      const item = p.carry.splice(itemIndex, 1)[0];
      wok.items.push(item);
      sfx.pickup();
      burst(state, STATIONS.wok.x + 95, STATIONS.wok.y + 25, INGREDIENTS[item].color, 8, 80);
      if (matchingRecipe(wok.items)) {
        startCooking(state);
        state.hint = 'Masak! Lempar pas hijau (Spasi)';
        state.hintTimer = 2;
      } else if (wok.items.length >= 4) {
        // Four ingredients and still no recipe: wrong mix, scrape it out.
        wok.items = [];
        state.combo = 0;
        sfx.burnt();
        floater(state, STATIONS.wok.x + 95, STATIONS.wok.y - 10, 'Racikan salah!', '#e5484d');
        state.hint = 'Itu bukan resep apa-apa — cek papan resep'; state.hintTimer = 2;
      }
      return;
    }
    if (near.kind === 'teh') {
      // The pour itself is hold-to-fill (pourStep in step()); a tap just explains it.
      if (p.carry.length >= PLAYER.carryMax) {
        state.hint = 'Tangan penuh! (maks 3)'; state.hintTimer = 1.5; sfx.denied();
      } else {
        state.hint = 'Tahan E — tuang pas hijau!'; state.hintTimer = 1.5;
      }
      return;
    }
    if (near.kind === 'table') {
      const teaIndex = p.carry.indexOf(TEA.id);
      if (teaIndex === -1) {
        const dn = dinerAt(state.dinein, near.id);
        state.hint = dn ? 'Bawakan Es Teh biar dia senang!' : 'Meja ini masih kosong';
        state.hintTimer = 1.5;
        return;
      }
      const dn = serveTea(state.dinein, near.id);
      if (!dn) {
        state.hint = 'Tidak ada yang butuh teh di meja ini'; state.hintTimer = 1.5; sfx.denied();
        return;
      }
      p.carry.splice(teaIndex, 1);
      const table = tableOf(dn);
      sfx.serve();
      burst(state, table.cx, table.cy - 40, '#c96f3f', 10, 100, state.dinein.rng);
      floater(state, table.cx, table.cy - 90, 'Es Teh! Puas +' + DINEIN.teaBoost, '#c96f3f');
      return;
    }
    if (near.kind === 'window') {
      const dishIndex = p.carry.findIndex((c) => RECIPES[c]);
      if (dishIndex !== -1) {
        const dish = p.carry.splice(dishIndex, 1)[0];
        if (serveDish(state, dish)) return;
        state.windowPlate = dish;
        state.hint = 'Belum ada yang pesan ' + RECIPES[dish].label + ' — piring menunggu di jendela';
        state.hintTimer = 2;
        return;
      }
      if (state.windowPlate && p.carry.length < PLAYER.carryMax) {
        state.wokServedPerfect = 0;
        p.carry.push(state.windowPlate);
        state.windowPlate = null;
        sfx.pickup();
      }
      return;
    }
  }

  function chop(dt, input) {
    const near = stationNear(state);
    if (!near || near.kind !== 'board' || !input.interactHeld) {
      state.boardProgress = Math.max(0, state.boardProgress - dt * 2);
      return;
    }
    const p = state.player;
    const index = p.carry.findIndex((c) => INGREDIENTS[c] && INGREDIENTS[c].chopped);
    if (index === -1) {
      state.boardProgress = 0;
      return;
    }
    state.boardProgress += dt / CHOP_SECONDS;
    const quarter = Math.floor(state.boardProgress * 4);
    if (quarter !== state.lastChopQuarter) {
      state.lastChopQuarter = quarter;
      sfx.chop();
      burst(state, STATIONS.board.x + 85, STATIONS.board.y + 30, '#fff3d6', 3, 50);
    }
    if (state.boardProgress >= 1) {
      const raw = p.carry[index];
      p.carry[index] = INGREDIENTS[raw].chopped;
      state.boardProgress = 0;
      sfx.chopDone();
      burst(state, STATIONS.board.x + 85, STATIONS.board.y + 30, INGREDIENTS[raw].color, 10, 100);
      floater(state, p.x, p.y - 40, INGREDIENTS[raw].label + ' cincang!', '#7dc383');
    }
  }

  function step(dt, input) {
    let events = 0;
    if (state.over) return events;

    state.timeLeft -= dt;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      state.over = true;
      sfx.sizzleStop();
      const [one, two, three] = starThresholds();
      state.stars = state.coins >= three ? 3 : state.coins >= two ? 2 : state.coins >= one ? 1 : 0;
      return EVENT_OVER;
    }

    movePlayer(dt, input);
    if (input.interactPressed) interact();
    if (input.tossPressed) {
      const near = stationNear(state);
      if (near && near.kind === 'wok' && state.wok.cooking) events |= resolveToss(state);
    }
    if (input.discardPressed) {
      const p = state.player;
      const near = stationNear(state);
      if (near && near.kind === 'wok' && state.wok.items.length > 0) {
        // Q at the wok scrapes out a wrong mix, whatever the cook is carrying.
        state.wok.items = [];
        state.hint = 'Wok dibersihkan'; state.hintTimer = 1.5;
      } else if (p.carry.length > 0) {
        const dropped = p.carry.pop();
        const droppedLabel = RECIPES[dropped] ? RECIPES[dropped].label
          : dropped === TEA.id ? TEA.label : INGREDIENTS[dropped].label;
        floater(state, p.x, p.y - 40, 'Buang: ' + droppedLabel, COLORS.muted);
      }
    }
    chop(dt, input);

    // Es Teh pour minigame at the drink station: hold E to fill, release green.
    const pourResult = pourStep(state.dinein, dt, input, stationNear(state), state.player.carry.length >= PLAYER.carryMax);
    if (pourResult === 'perfect' || pourResult === 'ok') {
      state.player.carry.push(TEA.id);
      sfx.pickup();
      const teh = STATIONS.teh;
      if (pourResult === 'perfect') {
        state.combo += 1;
        state.bestCombo = Math.max(state.bestCombo, state.combo);
        floater(state, teh.x + teh.w / 2, teh.y - 16, 'Es Teh sempurna!', '#58c96b');
      } else {
        floater(state, teh.x + teh.w / 2, teh.y - 16, 'Es Teh dituang', '#f2c14e');
      }
    } else if (pourResult === 'spill') {
      state.combo = 0;
      sfx.burnt();
      floater(state, STATIONS.teh.x + 50, STATIONS.teh.y - 16, 'Es teh tumpah!', '#e5484d');
      state.hint = 'Tumpah! Tuang pas hijau'; state.hintTimer = 1.5;
    }

    // Wok flame keeps swinging while a dish cooks.
    if (state.wok.cooking) {
      state.wok.phase += FLAME_SPEED * dt;
      if (state.wok.tossesLeft <= 0) {
        state.wok.cooking = false;
        state.wok.doneDish = state.wok.dish;
        state.wok.dish = null;
        sfx.sizzleStop();
        sfx.chopDone();
        burst(state, STATIONS.wok.x + 95, STATIONS.wok.y + 20, '#ffd94d', 14, 130);
        floater(state, STATIONS.wok.x + 95, STATIONS.wok.y - 16, RECIPES[state.wok.doneDish].label + ' matang!', '#ffd94d');
      }
    }

    // Tickets arrive faster and run out sooner as the rush builds.
    const rush = 1 - state.timeLeft / SHIFT_SECONDS;
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0 && state.tickets.length < 5) {
      state.spawnTimer = spawnIntervalSeconds(rush);
      events |= spawnTicket(state);
    }
    let urgentBeep = false;
    for (let i = state.tickets.length - 1; i >= 0; i -= 1) {
      const ticket = state.tickets[i];
      const before = ticket.patience;
      ticket.patience -= dt;
      if (before > URGENT_SECONDS && ticket.patience <= URGENT_SECONDS) urgentBeep = true;
      if (ticket.patience <= 0) {
        state.tickets.splice(i, 1);
        state.expiredCount += 1;
        state.combo = 0;
        sfx.denied();
        floater(state, 300, 120, 'Order ' + RECIPES[ticket.dish].label + ' hangus!', '#e5484d');
      }
    }
    if (urgentBeep) sfx.urgent();

    // Diners eat, satisfaction drains, tips and storm-offs land here.
    for (const ev of stepDineIn(state.dinein, dt)) {
      if (ev.type === 'tip') {
        state.coins += ev.coins;
        state.score += ev.coins;
        state.combo += 1;
        state.bestCombo = Math.max(state.bestCombo, state.combo);
        sfx.serve();
        burst(state, ev.x, ev.y, '#ffd94d', 14, 130, state.dinein.rng);
        floater(state, ev.x, ev.y - 20, 'TIP +' + ev.coins + ' Rp', '#ffd94d');
      } else {
        state.coins = Math.max(0, state.coins - ev.coins);
        state.score = Math.max(0, state.score - ev.coins);
        state.combo = 0;
        sfx.denied();
        floater(state, ev.x, ev.y - 20, 'Kabur marah! -' + ev.coins + ' Rp', '#e5484d');
      }
    }

    if (state.hintTimer > 0) state.hintTimer -= dt;

    // Particles and floating score text fade out.
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const pt = state.particles[i];
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 160 * dt;
      if (pt.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.floaters.length - 1; i >= 0; i -= 1) {
      const f = state.floaters[i];
      f.life -= dt;
      f.y -= 34 * dt;
      if (f.life <= 0) state.floaters.splice(i, 1);
    }
    return events;
  }

  reset();
  return { state, reset, step };
}
