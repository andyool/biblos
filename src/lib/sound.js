import { getState } from './store.js';

// Small bell-like sounds made on the fly with Web Audio — no audio files needed.
let ctx = null;

function audio() {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function bell(c, freq, at, dur = 0.6, gain = 0.1) {
  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, at);
  out.gain.exponentialRampToValueAtTime(gain, at + 0.008);
  out.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  out.connect(c.destination);
  [
    [1, 1],
    [2.01, 0.28],
    [3.02, 0.1],
  ].forEach(([mult, level]) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq * mult;
    g.gain.value = level;
    osc.connect(g).connect(out);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  });
}

function thud(c, at) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(200, at);
  osc.frequency.exponentialRampToValueAtTime(120, at + 0.18);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.12, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
  osc.connect(g).connect(c.destination);
  osc.start(at);
  osc.stop(at + 0.25);
}

export function play(name) {
  if (!getState().settings.sound) return;
  const c = audio();
  if (!c) return;
  const t = c.currentTime + 0.01;
  switch (name) {
    case 'tick':
      bell(c, 1318.5, t, 0.22, 0.035);
      break;
    case 'tap':
      bell(c, 987.8, t, 0.25, 0.05);
      break;
    case 'correct':
      bell(c, 1046.5, t, 0.5, 0.08);
      bell(c, 1568, t + 0.09, 0.8, 0.07);
      break;
    case 'wrong':
      thud(c, t);
      if (navigator.vibrate && navigator.userActivation?.hasBeenActive !== false) navigator.vibrate(18);
      break;
    case 'complete':
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => bell(c, f, t + i * 0.11, 1.4, 0.07));
      break;
    case 'level':
      [1568, 2093, 2637, 3136, 4186].forEach((f, i) => bell(c, f, t + i * 0.07, 1.1, 0.035));
      break;
    default:
      break;
  }
}
