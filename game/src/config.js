// Warung Malam: every number that tunes the night shift lives here — the recipes, the
// stations on the floor, the shift clock and the rush curve. Nothing in here draws or moves;
// world.js reads these values and render.js paints them.
export const VIEW = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const SHIFT_SECONDS = 180;
export const BEST_KEY = 'warung-malam-best-coins';

// --- ingredients -------------------------------------------------------------
// id: short key used in code. label: what the ticket and the counter show.
// chopped: the id this becomes after a turn at the chopping board (null = ready to use).
// color: the swatch the crates and counters paint it with. emoji-free: all art is canvas.
export const INGREDIENTS = {
  nasi:       { label: 'Nasi',         color: '#f5ecd7', chopped: null },
  mie:        { label: 'Mie',          color: '#f2c14e', chopped: null },
  telur:      { label: 'Telur',        color: '#fff3c4', chopped: null },
  sayur:      { label: 'Sayur',        color: '#7dc383', chopped: null },
  ayam:       { label: 'Ayam',         color: '#e8a08a', chopped: 'ayamCincang' },
  bawang:     { label: 'Bawang',       color: '#d9a7c7', chopped: 'bawangCincang' },
  kecap:      { label: 'Kecap',        color: '#5b3a29', chopped: null },
  sambal:     { label: 'Sambal',       color: '#d9381e', chopped: null },
  bwgGoreng:  { label: 'Bawang Goreng', short: 'Bwg Goreng', color: '#c98a3d', chopped: null },
  ayamCincang:   { label: 'Ayam Cincang',   color: '#eda58f', chopped: null },
  bawangCincang: { label: 'Bawang Cincang', color: '#e3b3d2', chopped: null },
};

// --- recipes ----------------------------------------------------------------
// Each dish is a base plus its own combination of ingredients and one spice.
// tosses: how many well-timed wok tosses finish it. coins: what a served plate pays.
export const RECIPES = {
  nasiGoreng: {
    label: 'Nasi Goreng', short: 'NasGor',
    needs: ['nasi', 'telur', 'bawangCincang', 'kecap'],
    tosses: 3, coins: 120, plate: '#f2c14e',
  },
  mieGoreng: {
    label: 'Mie Goreng', short: 'MieGor',
    needs: ['mie', 'telur', 'sayur', 'sambal'],
    tosses: 3, coins: 110, plate: '#e8a13c',
  },
  sateAyam: {
    label: 'Sate Ayam', short: 'Sate',
    needs: ['ayamCincang', 'bawangCincang', 'kecap'],
    tosses: 2, coins: 140, plate: '#c96f3f',
  },
  gadoGado: {
    label: 'Gado-Gado', short: 'Gado',
    needs: ['sayur', 'telur', 'bwgGoreng', 'sambal'],
    tosses: 1, coins: 100, plate: '#8fbf6a',
  },
  sotoAyam: {
    label: 'Soto Ayam', short: 'Soto',
    needs: ['ayamCincang', 'sayur', 'bwgGoreng'],
    tosses: 2, coins: 130, plate: '#e8c85a',
  },
};
export const DISH_IDS = Object.keys(RECIPES);

// --- the floor ---------------------------------------------------------------
// Stations sit along the back wall; the cook walks the open floor below them.
// anchor: where the cook stands to use it. label: painted above the station.
export const STATIONS = {
  crates: [
    { id: 'nasi',      x: 30,  y: 196, w: 58, h: 64 },
    { id: 'mie',       x: 96,  y: 196, w: 58, h: 64 },
    { id: 'telur',     x: 162, y: 196, w: 58, h: 64 },
    { id: 'sayur',     x: 228, y: 196, w: 58, h: 64 },
    { id: 'ayam',      x: 294, y: 196, w: 58, h: 64 },
    { id: 'bawang',    x: 360, y: 196, w: 58, h: 64 },
    { id: 'kecap',     x: 426, y: 196, w: 58, h: 64 },
    { id: 'sambal',    x: 492, y: 196, w: 58, h: 64 },
    { id: 'bwgGoreng', x: 558, y: 196, w: 58, h: 64 },
  ],
  board: { x: 660, y: 190, w: 170, h: 76, label: 'TALENAN' },
  wok:   { x: 872, y: 190, w: 190, h: 86, label: 'WOK' },
  window:{ x: 1104, y: 190, w: 150, h: 86, label: 'JENDELA SAJI' },
};
export const FLOOR = { top: 280, bottom: 700, left: 16, right: 1264 };
export const PLAYER = { speed: 270, radius: 24, carryMax: 3 };
export const INTERACT_RADIUS = 120;

// --- timing ------------------------------------------------------------------
export const CHOP_SECONDS = 1.2;
export const FLAME_SPEED = 2.6;          // radians per second of the flame marker
export const GREEN_HALF = 0.13;          // marker distance for a perfect toss
export const YELLOW_HALF = 0.30;         // marker distance for an okay toss
export const PERFECT_BONUS = 25;
export const COMBO_STEP = 0.1;           // +10% coins per combo level
export const URGENT_SECONDS = 8;         // patience left when the screen edge pulses red

// Rush: as the shift runs out, tickets arrive faster and patience shrinks.
export function spawnIntervalSeconds(rush) { return 18 - 10 * rush; }
export function patienceSeconds(rush) { return 52 - 22 * rush; }
export function starThresholds() { return [400, 800, 1250]; }

// --- palette -----------------------------------------------------------------
export const COLORS = {
  night: '#171029', nightTop: '#241a3d', floor: '#3a2a1e', floorLine: '#4a3826',
  wood: '#7a5230', woodDark: '#5d3c22', woodLight: '#96683d',
  lantern: '#ffb347', lanternGlow: 'rgba(255,179,71,0.35)',
  cream: '#fff3d6', ink: '#2b1c12', muted: '#b8a88f',
  ticket: '#fff8e6', ticketEdge: '#d9c48f',
  green: '#58c96b', yellow: '#f2c14e', red: '#e5484d',
  wok: '#2e2a28', steel: '#8f97a3', flame: '#ff7a1a',
};
