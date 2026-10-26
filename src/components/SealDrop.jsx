import { useEffect, useMemo, useRef, useState } from 'react';
import { Seal } from './Ornaments.jsx';
import { IMPACT_ART } from '../data/art.js';
import { unlocksFor } from '../data/shop.js';
import { glory, motionReduced, shatter } from '../lib/fx.js';
import { play } from '../lib/sound.js';
import { useBack } from '../lib/nav.js';
import { useLeave } from '../lib/leave.js';
import { dismissSeal, useSealDrop } from '../lib/sealDrop.js';

// A seal just earned falls from above and strikes the screen: the page dims, the glass cracks
// from where it lands, shards and dust fly, and its name is read beneath. A tap clears it.
// The crack, shards and dust are drawn pieces (public/fx) when the app has them (data/art.js);
// until then, shapes made here.

const SIZE = 220; // the seal, in px
const FALL = 560; // how long it falls, in ms (the shadow in fx.css grows for the same time)
const LAND = 42; // where it lands: this far down the screen, in % (the crack is drawn around that point)
const LINGER = 6000; // cleared by itself after this, if not tapped

const rand = (a, b) => a + Math.random() * (b - a);

/** A crack made in code: long fractures from the point with short side branches, and chips around the centre. */
function crackPaths(cx, cy, reach) {
  const paths = [];
  const n = 7 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i += 1) {
    let a = (Math.PI * 2 * i) / n + rand(-0.3, 0.3);
    let x = cx;
    let y = cy;
    let d = `M${cx} ${cy}`;
    const steps = 6 + Math.floor(Math.random() * 4);
    const step = (reach * rand(0.45, 1)) / steps;
    for (let k = 0; k < steps; k += 1) {
      a += rand(-0.45, 0.45);
      x += Math.cos(a) * step;
      y += Math.sin(a) * step;
      d += ` L${x.toFixed(0)} ${y.toFixed(0)}`;
      if (k > 1 && Math.random() < 0.5) {
        const ba = a + rand(0.5, 1.2) * (Math.random() < 0.5 ? 1 : -1);
        const bl = step * rand(0.8, 2.2);
        paths.push({ d: `M${x.toFixed(0)} ${y.toFixed(0)} l${(Math.cos(ba) * bl).toFixed(0)} ${(Math.sin(ba) * bl).toFixed(0)}`, w: 1 });
      }
    }
    paths.push({ d, w: 2.2 });
  }
  for (let i = 0; i < 14; i += 1) {
    const a = rand(0, Math.PI * 2);
    const r = rand(8, 44);
    const l = rand(10, 28);
    paths.push({ d: `M${(cx + Math.cos(a) * r).toFixed(0)} ${(cy + Math.sin(a) * r).toFixed(0)} l${(Math.cos(a + 1.3) * l).toFixed(0)} ${(Math.sin(a + 1.3) * l).toFixed(0)}`, w: 1 });
  }
  return paths;
}

function CodeCrack() {
  const { w, h, paths } = useMemo(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    return { w, h, paths: crackPaths(w / 2, (h * LAND) / 100, Math.max(w, h) * 0.6) };
  }, []);
  return (
    <svg className="drop-crack" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      {paths.map((p, i) => (
        <path key={`u${i}`} d={p.d} strokeWidth={p.w + 1.6} className="drop-crack-under" />
      ))}
      {paths.map((p, i) => (
        <path key={i} d={p.d} strokeWidth={p.w} className="drop-crack-line" />
      ))}
    </svg>
  );
}

/** The whole picture jolts as the seal lands: the page beneath and the stage over it, together. */
function jolt(...els) {
  const frames = [
    { transform: 'translate(0, 0)' },
    { transform: 'translate(-7px, 13px)', offset: 0.1 },
    { transform: 'translate(6px, -9px)', offset: 0.26 },
    { transform: 'translate(-4px, 6px)', offset: 0.46 },
    { transform: 'translate(3px, -3px)', offset: 0.7 },
    { transform: 'translate(0, 0)' },
  ];
  els.forEach((el) => el?.animate(frames, { duration: 540, easing: 'ease-out' }));
}

const fadeAway = (copy) => [copy.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'ease-in', fill: 'forwards' })];

function Drop({ seal }) {
  const root = useRef(null);
  const stage = useRef(null);
  const body = useRef(null);
  const still = useMemo(motionReduced, []);
  const [landed, setLanded] = useState(still);
  // One of the drawn cracks, chosen as it falls; 0 for the crack made in code.
  const crack = useMemo(() => (IMPACT_ART.cracks ? 1 + Math.floor(Math.random() * IMPACT_ART.cracks) : 0), []);
  useBack(dismissSeal);
  useLeave(root, fadeAway);

  useEffect(() => {
    // The sparks (fx.css) take the drop's gold while it is down, and while the last of them fall.
    document.body.classList.add('is-dropping');
    return () => {
      setTimeout(() => {
        if (!document.querySelector('.drop')) document.body.classList.remove('is-dropping');
      }, 3000);
    };
  }, []);

  useEffect(() => {
    // Have the pieces ready before it lands.
    const urls = [];
    if (crack) urls.push(`/fx/crack-${crack}.webp`);
    for (let i = 1; i <= IMPACT_ART.shards; i += 1) urls.push(`/fx/shard-${i}.webp`);
    if (IMPACT_ART.dust) urls.push('/fx/dust.webp');
    urls.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [crack]);

  useEffect(() => {
    const timers = [];
    const el = body.current;
    const land = () => {
      setLanded(true);
      play('impact');
      const r = el.getBoundingClientRect();
      const centre = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      shatter({ x: centre.x, y: r.top + r.height * 0.8 }, { shards: IMPACT_ART.shards, dust: IMPACT_ART.dust });
      glory(centre);
      jolt(document.getElementById('root'), stage.current);
      // It rocks once on its face and settles.
      el.animate(
        [{ transform: 'none' }, { transform: 'scale(0.93) rotate(-2deg)', offset: 0.3 }, { transform: 'scale(1.04) rotate(1.2deg)', offset: 0.65 }, { transform: 'none' }],
        { duration: 520, easing: 'ease-out' },
      );
      timers.push(setTimeout(dismissSeal, LINGER));
    };
    if (still) {
      timers.push(setTimeout(dismissSeal, LINGER));
    } else {
      // Far above and large, as if near the eye, blurred by its speed; then down, ever faster.
      el.animate(
        [
          { transform: 'translateY(-70vh) scale(2.8)', filter: 'blur(8px)', opacity: 0 },
          { opacity: 1, offset: 0.12 },
          { transform: 'none', filter: 'blur(0)', opacity: 1 },
        ],
        { duration: FALL, easing: 'cubic-bezier(0.5, 0, 1, 0.6)', fill: 'both' },
      );
      timers.push(setTimeout(land, FALL - 20));
    }
    return () => timers.forEach(clearTimeout);
  }, [still]);

  return (
    <div ref={root} className={`drop ${still ? 'is-still' : ''}`} role="dialog" aria-label={`New seal: ${seal.name}`} onClick={dismissSeal}>
      <div className="drop-scrim" />
      <div ref={stage} className="drop-stage">
        {landed && !still && (crack ? <img className="drop-crack" src={`/fx/crack-${crack}.webp`} alt="" draggable="false" /> : <CodeCrack />)}
        {landed && !still && <div className="drop-flash" />}
        {!still && <div className="drop-shadow" />}
        <div className="drop-seat">
          <div ref={body} className="drop-seal">
            <Seal id={seal.id} icon={seal.icon} size={SIZE} />
          </div>
        </div>
        <div className={`drop-words ${landed ? 'is-shown' : ''}`}>
          <p className="ex-kicker">New seal</p>
          <h2 className="script-title gold-text">{seal.name}</h2>
          <p className="drop-reward">+{seal.reward} talents</p>
          {unlocksFor(seal.id).map((u) => (
            <p key={u} className="drop-unlock">
              + {u}
            </p>
          ))}
          <p className="drop-hint">Tap to continue</p>
        </div>
      </div>
    </div>
  );
}

export default function SealDrop() {
  const drop = useSealDrop();
  if (!drop) return null;
  return <Drop key={drop.key} seal={drop.seal} />;
}
