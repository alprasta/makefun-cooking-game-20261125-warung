// The dine-in loop + Es Teh: served dishes seat customers at the dining tables,
// they eat while a satisfaction meter drains, and Es Teh poured at the drink
// station tops satisfaction back up. A happy finish pays a tip; an empty meter
// storms off angry. The pour itself is a timing minigame in the wok's style:
// hold E to fill the glass, let go while the marker sits in the green.
//
// This file owns all dine-in state. world.js wires it in (seating on serve,
// pouring and tea delivery in interact/step, tips and storm-offs in step);
// render.js only paints state.dinein. Deterministic: all randomness comes
// from the seeded rng, never Math.random().
import { DINEIN, STATIONS, TEA } from './config.js';

export function createDineIn(rng) {
  return {
    rng,
    diners: [],
    pour: { active: false, progress: 0, phase: 0, greenCenter: 0, overfill: 0, cooldown: 0 },
    stats: { seated: 0, teasServed: 0, tips: 0, tipCoins: 0, stormOffs: 0 },
  };
}

/** The first table with no diner, or null when both are full. */
export function freeTable(d) {
  return STATIONS.tables.find((t) => !d.diners.some((dn) => dn.tableId === t.id)) || null;
}

/** Seat a diner with this dish at a free table. Returns the diner, or null. */
export function seatDiner(d, dish) {
  const table = freeTable(d);
  if (!table) return null;
  const diner = {
    tableId: table.id, dish,
    satisfaction: 100, eatTime: 0,
    eatDuration: d.rng.range(DINEIN.eatMin, DINEIN.eatMax),
    teaGlass: false,
    shirt: d.rng.pick(DINEIN.shirts),
  };
  d.diners.push(diner);
  d.stats.seated += 1;
  return diner;
}

/**
 * The seat roll, on the dine-in stream: a share of served dishes are eaten at
 * a table. Returns the diner, or null when the dish is taken away / no table.
 */
export function maybeSeatDiner(d, dish) {
  if (d.rng.next() >= DINEIN.seatChance) return null;
  return seatDiner(d, dish);
}

export function dinerAt(d, tableId) {
  return d.diners.find((dn) => dn.tableId === tableId) || null;
}

/** The eating diner whose satisfaction is lowest — the one who needs tea next. */
export function neediestDiner(d) {
  let best = null;
  for (const dn of d.diners) {
    if (!best || dn.satisfaction < best.satisfaction) best = dn;
  }
  return best;
}

/** The eating diner who will storm off before finishing without a tea — the
 *  one whose remaining satisfaction runs out before the plate does. A diner
 *  whose meal ends first never needs one. Null when nobody needs tea. */
export function neediestTeaDiner(d) {
  let best = null;
  let bestMargin = Infinity;
  for (const dn of d.diners) {
    const margin = (dn.satisfaction / 100) * DINEIN.satDrainSeconds - (dn.eatDuration - dn.eatTime);
    if (margin < bestMargin) { bestMargin = margin; best = dn; }
  }
  return bestMargin < 0 ? best : null;
}

export function tableOf(diner) {
  return STATIONS.tables.find((t) => t.id === diner.tableId);
}

/**
 * Serve a carried Es Teh to the diner at this table. Tops satisfaction up and
 * puts a glass on the table. Returns the diner, or null when nobody there
 * needs tea (no diner, or already happy).
 */
export function serveTea(d, tableId) {
  const dn = dinerAt(d, tableId);
  if (!dn || dn.satisfaction >= DINEIN.teaServeBelow) return null;
  dn.satisfaction = Math.min(100, dn.satisfaction + DINEIN.teaBoost);
  dn.teaGlass = true;
  d.stats.teasServed += 1;
  return dn;
}

/**
 * Advance every diner one step: the plate empties over eatDuration while
 * satisfaction drains faster, so a diner with no tea storms off before
 * finishing. Returns [{ type: 'tip' | 'storm', diner, coins, x, y }].
 */
export function stepDineIn(d, dt) {
  const events = [];
  for (let i = d.diners.length - 1; i >= 0; i -= 1) {
    const dn = d.diners[i];
    dn.eatTime += dt;
    dn.satisfaction = Math.max(0, dn.satisfaction - (100 / DINEIN.satDrainSeconds) * dt);
    const table = tableOf(dn);
    const x = table.cx;
    const y = table.cy - 70;
    if (dn.satisfaction <= 0) {
      d.diners.splice(i, 1);
      d.stats.stormOffs += 1;
      events.push({ type: 'storm', diner: dn, coins: DINEIN.stormPenalty, x, y });
    } else if (dn.eatTime >= dn.eatDuration) {
      d.diners.splice(i, 1);
      const tip = Math.round(DINEIN.tipBase + dn.satisfaction * DINEIN.tipPerSat);
      d.stats.tips += 1;
      d.stats.tipCoins += tip;
      events.push({ type: 'tip', diner: dn, coins: tip, x, y });
    }
  }
  return events;
}

/**
 * The pour minigame: hold E at the Es Teh station to fill the glass while the
 * marker swings like the wok flame. The glass fills in about a second and then
 * waits — let go while the marker sits in the green for a perfect pour, yellow
 * is fine, red spills it. Holding a full glass too long overflows it. Returns
 * 'perfect' | 'ok' | 'spill' when a pour resolves, else null. A spill cools the
 * station down for a few seconds so nobody mashes E through it.
 */
export function pourStep(d, dt, input, near, carryFull) {
  const pour = d.pour;
  if (pour.cooldown > 0) pour.cooldown -= dt;
  const atTeh = near && near.kind === 'teh';
  if (!atTeh || carryFull) {
    if (pour.active) { pour.active = false; pour.progress = 0; pour.overfill = 0; }
    return null;
  }
  if (!pour.active) {
    if (!input.interactHeld) return null;
    pour.active = true;
    pour.progress = 0;
    pour.overfill = 0;
    pour.phase = d.rng.range(0, Math.PI * 2);
    pour.greenCenter = d.rng.range(-0.45, 0.45);
    return null;
  }
  if (input.interactHeld) {
    pour.progress = Math.min(1, pour.progress + dt / DINEIN.pourSeconds);
    pour.phase += DINEIN.pourSpeed * dt;
    if (pour.progress >= 1) {
      // Full glass, still holding: the marker keeps swinging for a green
      // release, but dawdle and it overflows.
      pour.overfill += dt;
      if (pour.overfill > DINEIN.pourOverfillSeconds) {
        pour.active = false;
        pour.progress = 0;
        pour.overfill = 0;
        pour.cooldown = DINEIN.pourSpillCooldown;
        return 'spill';
      }
    }
    return null;
  }
  // Let go: too early and the pour fizzles, otherwise judge the marker.
  if (pour.progress < DINEIN.pourMinProgress) {
    pour.active = false;
    pour.progress = 0;
    pour.overfill = 0;
    return null;
  }
  const marker = Math.sin(pour.phase) * 0.85;
  const distance = Math.abs(marker - pour.greenCenter);
  pour.active = false;
  pour.progress = 0;
  pour.overfill = 0;
  if (distance <= DINEIN.pourGreenHalf) return 'perfect';
  if (distance <= DINEIN.pourYellowHalf) return 'ok';
  pour.cooldown = DINEIN.pourSpillCooldown;
  return 'spill';
}

/** Park a diner at a table for a staged screenshot: a real diner, mid-meal. */
export function stageDiner(d, tableId, dish, satisfaction, teaGlass, eatTime) {
  if (dinerAt(d, tableId)) return null;
  const diner = {
    tableId, dish, satisfaction,
    eatTime: eatTime || 0, eatDuration: 13,
    teaGlass: !!teaGlass,
    shirt: d.rng.pick(DINEIN.shirts),
  };
  d.diners.push(diner);
  d.stats.seated += 1;
  return diner;
}

export { TEA };
