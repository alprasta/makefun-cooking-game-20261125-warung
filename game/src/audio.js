// Procedural sound for the warung: no audio files, every noise is synthesized with
// WebAudio at the moment it happens. If the browser has no audio (headless screenshots),
// every call is a safe no-op — the game never depends on sound.
let context = null;
let sizzleNode = null;

function audioContext() {
  if (context) return context;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    context = new AC();
  } catch {
    return null;
  }
  return context;
}

/** Unlock audio on the first real gesture; browsers block sound before one. */
export function unlockAudio() {
  const ctx = audioContext();
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

function blip(freq, seconds, type, gainValue) {
  const ctx = audioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainValue, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + seconds);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + seconds);
  } catch { /* sound is decoration, never a failure */ }
}

function noiseBurst(seconds, gainValue, filterFreq) {
  const ctx = audioContext();
  if (!ctx) return;
  try {
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.value = gainValue;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
  } catch { /* sound is decoration, never a failure */ }
}

export const sfx = {
  pickup() { blip(520, 0.07, 'triangle', 0.12); },
  chop() { noiseBurst(0.08, 0.25, 1800); },
  chopDone() { blip(660, 0.09, 'triangle', 0.14); blip(880, 0.12, 'triangle', 0.12); },
  tossPerfect() { blip(880, 0.1, 'sine', 0.18); blip(1320, 0.14, 'sine', 0.14); },
  tossOk() { blip(620, 0.09, 'sine', 0.14); },
  burnt() { noiseBurst(0.35, 0.3, 300); blip(140, 0.3, 'sawtooth', 0.12); },
  serve() { blip(523, 0.1, 'triangle', 0.16); blip(659, 0.1, 'triangle', 0.16); blip(784, 0.18, 'triangle', 0.16); },
  ticket() { blip(392, 0.12, 'square', 0.07); blip(523, 0.12, 'square', 0.06); },
  urgent() { blip(980, 0.08, 'square', 0.08); },
  denied() { blip(180, 0.12, 'square', 0.1); },
  sizzleStart() {
    const ctx = audioContext();
    if (!ctx || sizzleNode) return;
    try {
      const length = ctx.sampleRate;
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 3000;
      const gain = ctx.createGain();
      gain.gain.value = 0.045;
      source.connect(filter).connect(gain).connect(ctx.destination);
      source.start();
      sizzleNode = { source, gain };
    } catch { /* sound is decoration, never a failure */ }
  },
  sizzleStop() {
    if (!sizzleNode) return;
    try { sizzleNode.source.stop(); } catch { /* already stopped */ }
    sizzleNode = null;
  },
};
