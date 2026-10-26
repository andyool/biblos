import { useEffect, useRef, useState } from 'react';

// Little bursts of gold for the moments worth marking: a word put in its place, a right answer,
// a lesson done. They fly in one layer over everything (fx.css), in the gold of the theme, and
// are left out when the phone asks for less motion.

const STILL = '(prefers-reduced-motion: reduce)';
export const motionReduced = () => typeof matchMedia === 'function' && matchMedia(STILL).matches;
const canAnimate = typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';

// Where the last tap landed, so a burst can start under the finger.
let tap = null;
if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointerdown',
    (e) => {
      tap = { x: e.clientX, y: e.clientY, at: performance.now() };
    },
    { capture: true, passive: true },
  );
}

/** Where you tapped just now, if you did (a key pressed on a keyboard is nowhere on the screen). */
export function lastTap(within = 1000) {
  return tap && performance.now() - tap.at < within ? { x: tap.x, y: tap.y } : null;
}

/** The centre of an element, or a point as it is, or (given neither) the last tap. */
function pointOf(at) {
  if (!at) return lastTap();
  if (at instanceof Element) {
    if (!at.isConnected) return null;
    const r = at.getBoundingClientRect();
    return r.width || r.height ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
  }
  return at;
}

const ready = (at) => (canAnimate && !motionReduced() ? pointOf(at) : null);

let layer = null;
// Enough for a few bursts at once; past that, a new one waits for the old to clear.
const MOST = 300;

function bit(kind, { x, y }, w, h = w) {
  if (!layer?.isConnected) {
    layer = document.createElement('div');
    layer.className = 'fx';
    layer.setAttribute('aria-hidden', 'true');
    document.body.append(layer);
  }
  if (layer.childElementCount >= MOST) return null;
  const el = document.createElement('i');
  el.className = `fx-${kind}`;
  el.style.cssText = `left:${x}px;top:${y}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px`;
  layer.append(el);
  return el;
}

function run(el, frames, timing) {
  if (!el) return;
  const a = el.animate(frames, { fill: 'forwards', ...timing });
  a.onfinish = () => el.remove();
  a.oncancel = () => el.remove();
}

const rand = (a, b) => a + Math.random() * (b - a);
const CENTRE = 'translate(-50%, -50%)';
const f1 = (n) => n.toFixed(1);

/** Thrown out from the point: quick at first, slowed by the air, falling a little by the end. */
function fling(el, angle, dist, fall, duration, delay) {
  const spin = rand(-160, 160);
  const frames = [];
  for (let k = 0; k <= 10; k += 1) {
    const t = k / 10;
    const out = 1 - (1 - t) ** 3;
    const x = Math.cos(angle) * dist * out;
    const y = Math.sin(angle) * dist * out + fall * t * t;
    const scale = t < 0.12 ? 0.5 + (t / 0.12) * 0.6 : 1.1 - ((t - 0.12) / 0.88) * 0.9;
    frames.push({
      transform: `${CENTRE} translate(${f1(x)}px, ${f1(y)}px) rotate(${Math.round(spin * t)}deg) scale(${scale.toFixed(2)})`,
      opacity: t > 0.6 ? (1 - t) / 0.4 : 1,
    });
  }
  run(el, frames, { duration, delay, easing: 'linear' });
}

/** Sparks all round the point, every `stars`th a four-pointed star. */
function sparks(p, { count, dist: [d0, d1], size: [s0, s1], fall, time: [t0, t1], stars = 0, delay = 0 }) {
  const turn = Math.random() * Math.PI * 2;
  for (let i = 0; i < count; i += 1) {
    const star = stars > 0 && i % stars === 0;
    const angle = turn + (Math.PI * 2 * i) / count + rand(-0.3, 0.3);
    fling(bit(star ? 'star' : 'spark', p, rand(s0, s1) * (star ? 1.9 : 1)), angle, rand(d0, d1), fall, rand(t0, t1), delay + rand(0, 40));
  }
}

/** A ring spreading out from the point and fading, like a ripple of light. */
function ring(p, size, duration, delay = 0) {
  run(
    bit('ring', p, size),
    [
      { transform: `${CENTRE} scale(0.18)`, opacity: 0.95 },
      { transform: `${CENTRE} scale(1)`, opacity: 0 },
    ],
    { duration, delay, easing: 'cubic-bezier(0.15, 0.7, 0.3, 1)' },
  );
}

/** A soft flash of light behind it all. */
function glow(p, size, duration, delay = 0) {
  run(
    bit('glow', p, size),
    [
      { transform: `${CENTRE} scale(0.3)`, opacity: 0 },
      { transform: `${CENTRE} scale(0.85)`, opacity: 1, offset: 0.22 },
      { transform: `${CENTRE} scale(1.1)`, opacity: 0 },
    ],
    { duration, delay, easing: 'ease-out' },
  );
}

/** Flakes of gold leaf thrown up, then drifting down as they turn over and over. */
function leaves(p, count, delay = 0) {
  for (let i = 0; i < count; i += 1) {
    const drift = rand(-1, 1) * rand(70, 220);
    const rise = rand(90, 240);
    const fall = rand(300, 520);
    const flips = rand(1.5, 3.5);
    const sway = rand(6, 16);
    const spin = rand(-260, 260);
    const frames = [];
    for (let k = 0; k <= 18; k += 1) {
      const t = k / 18;
      // Up quickly to the top of its rise (a third of the way through), then down, slower.
      const y = t < 0.3 ? -rise * Math.sin((t / 0.3) * (Math.PI / 2)) : -rise + (rise + fall) * ((t - 0.3) / 0.7) ** 1.3;
      const x = drift * (1 - (1 - t) ** 2) + sway * Math.sin(t * flips * Math.PI * 2);
      const turnOver = Math.cos(t * flips * Math.PI * 2);
      frames.push({
        transform: `${CENTRE} translate(${f1(x)}px, ${f1(y)}px) rotate(${Math.round(spin * t)}deg) scaleX(${turnOver.toFixed(2)})`,
        opacity: t < 0.05 ? t / 0.05 : t > 0.75 ? (1 - t) / 0.25 : 1,
      });
    }
    run(bit('leaf', p, rand(6, 9), rand(9, 14)), frames, { duration: rand(1900, 2900), delay: delay + rand(0, 160), easing: 'linear' });
  }
}

// Each takes an element, a point ({ x, y } on the screen) or nothing, for where you just tapped.

/** The tip of a bar as it grows, or a key pressed right: a glint and a few motes. */
export function glint(at) {
  const p = ready(at);
  if (!p) return;
  glow(p, 24, 360);
  sparks(p, { count: 4, dist: [7, 15], size: [2, 3], fall: 4, time: [280, 380] });
}

/** A word, phrase or pair put in its place: a little flash, a ring and a ring of sparks. */
export function pop(at) {
  const p = ready(at);
  if (!p) return;
  glow(p, 64, 420);
  ring(p, 68, 480);
  sparks(p, { count: 9, dist: [22, 44], size: [3.5, 6], fall: 14, time: [440, 600] });
}

/** A right answer: a flash, two rings and a spray of sparks and stars. */
export function burst(at) {
  const p = ready(at);
  if (!p) return;
  glow(p, 190, 620);
  ring(p, 150, 700);
  ring(p, 90, 560, 80);
  sparks(p, { count: 16, dist: [50, 104], size: [4, 7.5], fall: 34, time: [640, 920], stars: 3 });
}

/**
 * A lesson done, a seal, a new level, something bought: a blaze of light, three rings, sparks
 * flung far with a second, nearer shower just behind them, and gold leaf.
 */
export function glory(at) {
  const p = ready(at);
  if (!p) return;
  glow(p, 420, 1100);
  ring(p, 360, 1100);
  ring(p, 230, 900, 110);
  ring(p, 480, 1300, 220);
  sparks(p, { count: 34, dist: [110, 220], size: [4.5, 9], fall: 70, time: [1000, 1450], stars: 3 });
  sparks(p, { count: 14, dist: [40, 90], size: [2.5, 4.5], fall: 30, time: [700, 1000], delay: 140 });
  leaves(p, 30, 60);
}

/**
 * Something heavy has struck the screen at the point: shards of glass flung out, falling as they
 * go, and a puff of dust that drifts up and thins. With the drawn pieces (public/fx) when the app
 * has them (`shards` how many, `dust` whether), else shapes made here.
 */
export function shatter(at, { shards = 0, dust = false } = {}) {
  const p = ready(at);
  if (!p) return;
  const turn = Math.random() * Math.PI * 2;
  const count = 14;
  for (let i = 0; i < count; i += 1) {
    const angle = turn + (Math.PI * 2 * i) / count + rand(-0.4, 0.4);
    const size = rand(16, 38);
    const el = bit('shard', p, size, size * rand(0.7, 1.3));
    if (el && shards) {
      el.classList.add('is-drawn');
      el.style.backgroundImage = `url(/fx/shard-${1 + (i % shards)}.webp)`;
    }
    fling(el, angle, rand(90, 280), rand(140, 260), rand(750, 1150), rand(0, 50));
  }
  const cloud = bit('dust', p, 300);
  if (cloud && dust) cloud.classList.add('is-drawn');
  run(
    cloud,
    [
      { transform: `${CENTRE} translateY(16px) scale(0.3)`, opacity: 0 },
      { transform: `${CENTRE} translateY(-6px) scale(0.9)`, opacity: 0.8, offset: 0.22 },
      { transform: `${CENTRE} translateY(-56px) scale(1.6)`, opacity: 0 },
    ],
    { duration: 1400, easing: 'ease-out' },
  );
}

/** The element swells and settles, as if struck; or, `growing`, grows into its place from small. */
export function bump(el, { size = 1.14, growing = false, delay = 0 } = {}) {
  if (!el?.animate || motionReduced()) return;
  const frames = growing
    ? [
        { scale: 0.3, opacity: 0 },
        { scale: size, opacity: 1, offset: 0.6 },
        { scale: 1, opacity: 1 },
      ]
    : [{ scale: 1 }, { scale: size, offset: 0.35 }, { scale: 1 }];
  el.animate(frames, { duration: growing ? 480 : 380, delay, fill: 'backwards', easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)' });
}

/** A number counting up to `to`, after `delay` ms (straight to it when motion is reduced). */
export function useCountUp(to, { delay = 0, duration = 700 } = {}) {
  const [n, setN] = useState(() => (motionReduced() ? to : 0));
  useEffect(() => {
    if (motionReduced()) {
      setN(to);
      return undefined;
    }
    const start = performance.now() + delay;
    let frame = requestAnimationFrame(function step(now) {
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      setN(Math.round(to * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [to, delay, duration]);
  return n;
}

/** A glint at the end of a progress bar's fill each time it grows, once it has slid there. */
export function useGrowthGlint(fill, value, on = true) {
  const was = useRef(value);
  useEffect(() => {
    const grew = value > was.current;
    was.current = value;
    if (!on || !grew) return undefined;
    // Just after the fill's width has eased out (lesson.css).
    const t = setTimeout(() => {
      const r = fill.current?.getBoundingClientRect();
      if (r) glint({ x: r.right - 6, y: r.top + r.height / 2 });
    }, 380);
    return () => clearTimeout(t);
  }, [fill, value, on]);
}
