import { useEffect, useRef } from 'react';
import { useStore } from '../lib/store.js';
import { updateSettings } from '../lib/actions.js';
import { onCue } from '../mascot/bus.js';
import { reaction, tapReaction } from '../mascot/reactions.js';

// three.js and the lamb are loaded the first time a lamb is shown.
let engine = null;
export const loadMascot = () => (engine ||= import('../mascot/engine.js'));

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// The golden lamb. `base` is what it does when nothing else is happening (idle, read,
// sleep, think, worried, walk, happy); `intro` plays once when it appears; with `listen`
// it reacts to cues from anywhere in the app (see mascot/bus.js and mascot/reactions.js).
export default function Mascot({ size = 140, width, framing = 'full', base = 'idle', intro, listen = false, variant, className = '', label }) {
  const chosen = useStore((s) => s.settings.mascot);
  const kind = variant || chosen || 'female';
  const ref = useRef(null);
  const inst = useRef(null);
  const busy = useRef({ priority: -1, token: 0 });
  const taps = useRef(0);
  const baseRef = useRef(base);
  baseRef.current = base;

  // Play a reaction: its clips in turn, then settle into its base.
  const run = (r) => {
    const lamb = inst.current;
    if (!lamb || !r) return;
    const b = busy.current;
    if (lamb.busy && r.priority < b.priority) return;
    const token = ++b.token;
    b.priority = r.priority;
    if (r.base) lamb.setBase(r.base);
    (async () => {
      for (const clip of r.clips) {
        if (b.token !== token) return;
        await lamb.play(clip);
      }
      if (b.token === token) b.priority = -1;
    })();
  };

  useEffect(() => {
    if (kind === 'off') return undefined;
    let dead = false;
    const canvas = ref.current;
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
    };
    fit();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(canvas);
    loadMascot().then((m) => {
      if (dead) return;
      inst.current = m.mount(canvas, { variant: kind, framing, base: baseRef.current, reduced: reducedMotion() });
      if (intro) run({ clips: Array.isArray(intro) ? intro : [intro], priority: 3 });
    });
    return () => {
      dead = true;
      ro?.disconnect();
      inst.current?.destroy();
      inst.current = null;
    };
  }, [kind, framing]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    inst.current?.setBase(base);
  }, [base]);

  useEffect(() => {
    if (!listen) return undefined;
    return onCue((name, data) => run(reaction(name, data)));
  }, [listen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (kind === 'off') return null;

  const tap = (e) => {
    const lamb = inst.current;
    if (!lamb) return;
    // Glance towards where the tap landed, then react.
    const r = e.currentTarget.getBoundingClientRect();
    lamb.lookAt(((e.clientX - r.left) / r.width - 0.5) * 1.2, (0.4 - (e.clientY - r.top) / r.height) * 0.8);
    setTimeout(() => inst.current?.lookAt(0, 0), 1400);
    run(tapReaction(taps.current++, lamb.base));
  };

  return (
    <canvas
      ref={ref}
      className={`mascot ${className}`}
      style={{ width: width ?? size, height: size }}
      onClick={tap}
      role="img"
      aria-label={label || (kind === 'male' ? 'The golden lamb (he)' : 'The golden lamb (she)')}
    />
  );
}

// Choose the companion: she, he, or none.
export function LambPicker() {
  const chosen = useStore((s) => s.settings.mascot) || 'female';
  return (
    <div className="lamb-pick">
      {[
        ['female', 'She'],
        ['male', 'He'],
      ].map(([v, name]) => (
        <button key={v} className={`lamb-option ${chosen === v ? 'is-on' : ''}`} aria-pressed={chosen === v} onClick={() => updateSettings({ mascot: v })}>
          <Mascot variant={v} size={150} base={chosen === v ? 'happy' : 'idle'} label={`The golden lamb (${name.toLowerCase()})`} />
          <strong>{name}</strong>
        </button>
      ))}
      <button className={`lamb-none ${chosen === 'off' ? 'is-on' : ''}`} aria-pressed={chosen === 'off'} onClick={() => updateSettings({ mascot: 'off' })}>
        No companion
      </button>
    </div>
  );
}
