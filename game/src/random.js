// A tiny seeded random source (mulberry32) so the same seed always deals the same night:
// the same tickets, the same flame swings, the same rush. No Math.random() anywhere in the
// world — screenshots staged from a seed are reproducible frame for frame.
export function createRandom(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  return {
    next() {
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), state | 1);
      t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    range(min, max) { return min + this.next() * (max - min); },
    pick(list) { return list[Math.floor(this.next() * list.length)]; },
    int(min, max) { return min + Math.floor(this.next() * (max - min + 1)); },
  };
}
