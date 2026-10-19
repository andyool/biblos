import { useEffect, useRef, useState } from 'react';
import { useStore } from '../lib/store.js';
import { updateSettings } from '../lib/actions.js';
import { onCue } from '../mascot/bus.js';
import { CAMEOS, reaction, tapReaction } from '../mascot/reactions.js';
import { ASPECT, LOOPS, Lamb, warm } from '../mascot/woolly.js';

const stillPlease = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Which lamb keeps you company ('female' or 'male'), or null when Woolly is turned off. */
export function useWoolly() {
  const on = useStore((s) => s.settings.woolly !== false);
  const lamb = useStore((s) => (s.settings.woollyLamb === 'male' ? 'male' : 'female'));
  return on ? lamb : null;
}

/**
 * Woolly, the golden lamb.
 *
 * `base` is the loop it rests in (idle, read, pray, listen); `intro` plays once it appears,
 * after `delay` ms; `act` is a shorthand for either. With `listen` it answers cues from
 * anywhere in the app (mascot/bus.js). With `peek` it pops up from behind whatever card it
 * is placed on (the CSS for each place tucks it in). `onDone` follows the intro.
 */
export default function Woolly({ size = 140, base = 'idle', intro, act, listen = false, peek = false, delay = 0, lamb: only, className = '', onDone }) {
  const chosen = useWoolly();
  const lamb = only || chosen;
  if (act) {
    if (LOOPS.has(act)) base = act;
    else intro = act;
  }
  const art = useRef(null);
  const inst = useRef(null);
  const busy = useRef({ priority: -1, run: 0 });
  const taps = useRef(0);
  const latest = useRef({ base, onDone });
  latest.current = { base, onDone };

  // Play a reaction, unless a bigger one is under way. Resolves true once it has played.
  const run = (r) => {
    const l = inst.current;
    const b = busy.current;
    if (!l || !r || (!l.resting && r.priority < b.priority)) return Promise.resolve(false);
    const id = ++b.run;
    b.priority = r.priority;
    if (r.base) l.base = r.base;
    return l.play(r.clips).then((played) => {
      if (b.run === id) b.priority = -1;
      return played;
    });
  };

  useEffect(() => {
    if (!lamb) return undefined;
    const l = new Lamb(art.current, { lamb, base: latest.current.base, still: stillPlease() });
    inst.current = l;
    warm(lamb);
    const t = intro && setTimeout(() => run({ clips: [].concat(intro), priority: 3 }).then((played) => played && latest.current.onDone?.()), delay);
    return () => {
      clearTimeout(t);
      l.destroy();
      inst.current = null;
    };
  }, [lamb]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    inst.current?.setBase(base);
  }, [base]);

  useEffect(() => {
    if (!listen || !lamb) return undefined;
    return onCue((name, data) => {
      const r = reaction(name, data);
      const l = inst.current;
      if (!r || !l || !l.visible) return false;
      run(r);
      return true;
    });
  }, [listen, lamb]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!lamb) return null;

  const tap = () => {
    const l = inst.current;
    if (!l) return;
    // Holding a book or praying, the lamb only gives a little hop; otherwise a new trick each time.
    if (l.base === 'read' || l.base === 'pray') {
      if (!stillPlease()) art.current.animate([{ transform: 'none' }, { transform: 'translateY(-7%) scale(0.98, 1.02)' }, { transform: 'none' }], { duration: 360, easing: 'ease-out' });
    } else run(tapReaction(taps.current++));
  };

  const width = Math.round(size * ASPECT);
  return (
    <div
      className={`woolly ${peek ? 'is-peek' : ''} ${className}`}
      style={{ width, height: size, '--woolly-w': `${width}px`, '--woolly-h': `${size}px`, '--woolly-delay': `${delay}ms` }}
      onClick={tap}
      aria-hidden="true"
    >
      <div ref={art} className="woolly-art" />
    </div>
  );
}

/** Choose the girl or the boy lamb. */
export function WoollyPicker({ size = 120 }) {
  const chosen = useStore((s) => (s.settings.woollyLamb === 'male' ? 'male' : 'female'));
  const on = useStore((s) => s.settings.woolly !== false);
  return (
    <div className="woolly-pick" role="radiogroup" aria-label="Woolly is a">
      {[
        ['female', 'Girl'],
        ['male', 'Boy'],
      ].map(([lamb, name]) => {
        const picked = on && chosen === lamb;
        return (
          <button
            key={lamb}
            role="radio"
            aria-checked={picked}
            className={`woolly-option ${picked ? 'is-on' : ''}`}
            onClick={() => updateSettings({ woolly: true, woollyLamb: lamb })}
          >
            <Woolly lamb={lamb} size={size} intro={picked ? 'wave' : undefined} key={picked ? 'picked' : 'not'} />
            <strong>{name}</strong>
          </button>
        );
      })}
    </div>
  );
}

/**
 * When something worth a cheer happens and no lamb is on screen, Woolly leans in from the
 * edge of the screen, plays its part, and slips away again.
 */
export function WoollyCameo() {
  const lamb = useWoolly();
  const [visit, setVisit] = useState(null);
  const leaving = useRef(null);

  const leave = () => {
    setVisit((v) => v && { ...v, out: true });
    clearTimeout(leaving.current);
    leaving.current = setTimeout(() => setVisit(null), 420);
  };

  useEffect(() => {
    if (!lamb) return undefined;
    return onCue(
      (name, data) => {
        const r = CAMEOS.has(name) && reaction(name, data);
        if (!r) return;
        clearTimeout(leaving.current);
        setVisit({ id: Date.now(), clips: r.clips, side: name === 'problem' || name === 'streakLost' ? 'left' : 'right', out: false });
      },
      { cameo: true },
    );
  }, [lamb]);

  // However the visit goes, it doesn't outstay its welcome.
  useEffect(() => {
    if (!visit || visit.out) return undefined;
    const t = setTimeout(leave, 7000);
    return () => clearTimeout(t);
  }, [visit]);

  if (!visit || !lamb) return null;

  return (
    <div key={visit.id} className={`woolly-cameo is-${visit.side} ${visit.out ? 'is-out' : ''}`} onClick={leave}>
      <Woolly size={124} intro={visit.clips} delay={380} onDone={() => setTimeout(leave, 500)} />
    </div>
  );
}
