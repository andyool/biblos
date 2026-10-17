import { useId } from 'react';
import Glyph from './Glyph.jsx';

const stops = (list) => list.map(([offset, g, opacity]) => <stop key={offset} offset={offset} style={{ stopColor: `var(--${g})`, stopOpacity: opacity }} />);

// Shared gradients. Rendered once near the root of the app.
export function GoldDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        {/* Polished gold, with the bright and dark bands of reflected light. */}
        <linearGradient id="gold-fill" x1="0" y1="0" x2="1" y2="1">
          {stops([[0, 'g3'], [0.22, 'g1'], [0.3, 'g0'], [0.44, 'g2'], [0.58, 'g3'], [0.7, 'g2'], [0.84, 'g1'], [1, 'g3']])}
        </linearGradient>
        <linearGradient id="gold-stroke" x1="0" y1="0" x2="1" y2="1">
          {stops([[0, 'g2'], [0.28, 'g0'], [0.5, 'g1'], [0.72, 'g3'], [1, 'g2']])}
        </linearGradient>
        {/* A domed face, lit from the top left. */}
        <radialGradient id="gold-dome" cx="0.36" cy="0.3" r="0.78">
          {stops([[0, 'g0'], [0.2, 'g1'], [0.5, 'g2'], [0.82, 'g3'], [1, 'g4']])}
        </radialGradient>
        <radialGradient id="gold-glare" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="gold-glow" cx="0.5" cy="0.5" r="0.5">
          {stops([[0, 'g1', 0.55], [1, 'g2', 0]])}
        </radialGradient>
        {/* For the 24×24 line glyphs: set in their own units, so straight lines catch it too. */}
        <linearGradient id="glyph-shine" x1="0" y1="2" x2="0" y2="22" gradientUnits="userSpaceOnUse">
          {stops([[0, 't0'], [0.26, 't1'], [0.47, 't2'], [0.56, 't3'], [0.68, 't4'], [1, 't5']])}
        </linearGradient>
      </defs>
    </svg>
  );
}

/** A centred flourish: diamond, curls and fading rules. */
export function Divider({ className = '', width = 220 }) {
  const id = useId().replace(/:/g, '');
  const half = (
    <>
      <path d="M130 12 C 140 3.5, 153 4.5, 155.5 10 C 157.5 14.5, 152.5 17.5, 149.5 15 C 147.5 13.2, 148.8 10.6, 151.2 11.4" />
      <path d="M130 12 C 140 18.5, 156 19, 166 13.2" strokeWidth="0.9" />
      <path d="M166 12.6 H 238" stroke={`url(#${id}-fade)`} strokeWidth="0.9" />
      <circle cx="166.5" cy="12.8" r="1.5" fill="currentColor" stroke="none" />
      <path d="M137.5 7.6 c 2.2 -3.2 5.6 -3.6 7.4 -2.4 c -2 2.4 -4.8 3.2 -7.4 2.4 z" fill="currentColor" stroke="none" opacity="0.85" />
    </>
  );
  return (
    <svg className={`divider ${className}`} width={width} viewBox="0 0 240 24" fill="none" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-fade`} x1="166" x2="238" y1="0" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.9" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      {half}
      <g transform="translate(240 0) scale(-1 1)">{half}</g>
      <path d="M120 4.6 L 126 12 L 120 19.4 L 114 12 Z" fill="url(#gold-fill)" stroke="var(--matt-deep)" strokeWidth="0.5" />
      <path d="M120 6.4 L 122.4 9.6 L 120 12 L 117.6 9.6 Z" fill="var(--g0)" stroke="none" opacity="0.7" />
      <circle cx="120" cy="12" r="1.2" fill="var(--bg)" stroke="none" />
      <circle cx="109.5" cy="12" r="1.4" fill="url(#gold-fill)" stroke="none" />
      <circle cx="130.5" cy="12" r="1.4" fill="url(#gold-fill)" stroke="none" />
    </svg>
  );
}

const CORNERS = {
  filigree: (
    <>
      <path d="M3 58 V 15 C 3 8, 8 3, 15 3 H 58" />
      <path d="M9 40 V 19 C 9 13.5, 13.5 9, 19 9 H 40" strokeWidth="0.7" opacity="0.6" />
      <path d="M15 15 C 21.5 14, 25.5 18.5, 25 23.5 C 24.6 27.6, 20.4 28.6, 18.6 26.2 C 17.2 24.3, 18.6 21.6, 21 22.4" />
      <path d="M25 15.5 C 31 13.5, 37.5 14.5, 42 18.5" strokeWidth="0.8" />
      <path d="M15.5 25 C 13.5 31, 14.5 37.5, 18.5 42" strokeWidth="0.8" />
      <path d="M33 11.8 c 3.2 -3.8 7.6 -4.2 10.4 -2.4 c -2.8 3.2 -6.8 4.2 -10.4 2.4 z" fill="currentColor" stroke="none" opacity="0.8" />
      <path d="M11.8 33 c -3.8 3.2 -4.2 7.6 -2.4 10.4 c 3.2 -2.8 4.2 -6.8 2.4 -10.4 z" fill="currentColor" stroke="none" opacity="0.8" />
      <circle cx="58" cy="3" r="1.9" fill="url(#gold-fill)" stroke="none" />
      <circle cx="3" cy="58" r="1.9" fill="url(#gold-fill)" stroke="none" />
      <path d="M3 3 l 6 0 l -6 6 z" fill="url(#gold-fill)" stroke="none" />
    </>
  ),
  vine: (
    <>
      <path d="M4 60 C 4 30, 30 4, 60 4" />
      <path d="M12 44 c -4 -2 -6 -6 -5 -10 c 4 1 6 5 5 10 z M 20 30 c -4.5 -1 -7 -4.5 -6.6 -8.6 c 4.2 .6 7 4 6.6 8.6 z M 30 20 c -1 -4.5 1.2 -8.4 5 -9.6 c .8 4.2 -1.2 8 -5 9.6 z M 44 12 c -2 -4 -.6 -8 2.8 -9.6 c 1.6 3.8 .4 7.8 -2.8 9.6 z" fill="currentColor" stroke="none" opacity="0.85" />
      <path d="M22 26 c 4 2 8 1 10 -2" strokeWidth="0.8" />
      <circle cx="14" cy="20" r="2" fill="url(#gold-fill)" stroke="none" />
      <circle cx="18" cy="16.5" r="1.6" fill="url(#gold-fill)" stroke="none" />
      <circle cx="13.5" cy="15" r="1.4" fill="url(#gold-fill)" stroke="none" />
    </>
  ),
  illuminated: (
    <>
      <path d="M3 60 V 3 H 60" strokeWidth="2.2" />
      <path d="M9 60 V 9 H 60" strokeWidth="0.8" />
      <rect x="1" y="1" width="16" height="16" fill="var(--accent)" stroke="currentColor" strokeWidth="1.2" />
      <path d="M9 3.5 L 14.5 9 L 9 14.5 L 3.5 9 Z" fill="url(#gold-fill)" stroke="none" />
      <circle cx="9" cy="9" r="1.4" fill="var(--accent)" stroke="none" />
      <path d="M22 9 h 6 M 34 9 h 3 M 9 22 v 6 M 9 34 v 3" strokeWidth="1.6" />
    </>
  ),
};

export function Corner({ variant = 'filigree', pos = 'tl', size = 46 }) {
  const t = { tl: '', tr: 'scale(-1 1)', bl: 'scale(1 -1)', br: 'scale(-1 -1)' }[pos];
  return (
    <svg className={`corner corner-${pos}`} width={size} height={size} viewBox="0 0 62 62" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" aria-hidden="true">
      <g transform={t} style={{ transformOrigin: '31px 31px' }}>
        {CORNERS[variant] || CORNERS.filigree}
      </g>
    </svg>
  );
}

/** Ornamented card. */
export function Frame({ variant = 'filigree', className = '', children, size = 46, ...rest }) {
  return (
    <div className={`frame frame-${variant} ${className}`} {...rest}>
      <Corner variant={variant} pos="tl" size={size} />
      <Corner variant={variant} pos="tr" size={size} />
      <Corner variant={variant} pos="bl" size={size} />
      <Corner variant={variant} pos="br" size={size} />
      {children}
    </div>
  );
}

/** Two laurel branches curving round a centre. */
const R = 70;
const onCircle = (deg) => [90 + R * Math.sin((deg * Math.PI) / 180), 90 - R * Math.cos((deg * Math.PI) / 180)];

function laurelBranch(side) {
  // Angles are measured clockwise from the top of the circle.
  const from = side < 0 ? 212 : 148;
  const to = side < 0 ? 332 : 28;
  const [x0, y0] = onCircle(from);
  const [x1, y1] = onCircle(to);
  const leaves = [];
  const n = 8;
  for (let i = 0; i < n; i += 1) {
    const t = i / (n - 1);
    const theta = from + (to - from) * t;
    const [x, y] = onCircle(theta);
    const tangent = side < 0 ? theta : theta + 180;
    const s = 1 - t * 0.35;
    leaves.push(
      <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(2)})`}>
        <ellipse cx="7.5" cy="0" rx="7.8" ry="2.9" transform={`rotate(${tangent - 38})`} fill="url(#gold-fill)" />
        <ellipse cx="7.5" cy="0" rx="7.8" ry="2.9" transform={`rotate(${tangent + 38})`} fill="url(#gold-fill)" opacity="0.8" />
      </g>,
    );
  }
  const [tx, ty] = onCircle(to);
  leaves.push(<ellipse key="tip" cx="6" cy="0" rx="6.5" ry="2.4" transform={`translate(${tx.toFixed(1)} ${ty.toFixed(1)}) rotate(${side < 0 ? to : to + 180})`} fill="url(#gold-fill)" />);
  return (
    <g>
      <path d={`M${x0.toFixed(1)} ${y0.toFixed(1)} A${R} ${R} 0 0 ${side < 0 ? 1 : 0} ${x1.toFixed(1)} ${y1.toFixed(1)}`} fill="none" stroke="var(--matt)" strokeWidth="1.3" />
      {leaves}
    </g>
  );
}

export function Laurel({ size = 180, className = '', children }) {
  return (
    <div className={`laurel ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 180 180" width={size} height={size} aria-hidden="true">
        <circle cx="90" cy="90" r="62" fill="url(#gold-glow)" />
        {laurelBranch(-1)}
        {laurelBranch(1)}
        <path d="M 78 158 C 84 153, 96 153, 102 158 M 84 150 l 12 14 M 96 150 l -12 14" stroke="url(#gold-stroke)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </svg>
      <div className="laurel-centre">{children}</div>
    </div>
  );
}

function scallops(r, bumps, depth) {
  let d = '';
  for (let i = 0; i < bumps; i += 1) {
    const a0 = (Math.PI * 2 * i) / bumps;
    const a1 = (Math.PI * 2 * (i + 1)) / bumps;
    const am = (a0 + a1) / 2;
    const p0 = [50 + r * Math.cos(a0), 50 + r * Math.sin(a0)];
    const p1 = [50 + r * Math.cos(a1), 50 + r * Math.sin(a1)];
    const c = [50 + (r + depth) * Math.cos(am), 50 + (r + depth) * Math.sin(am)];
    d += `${i ? '' : `M${p0[0].toFixed(2)} ${p0[1].toFixed(2)}`} Q${c[0].toFixed(2)} ${c[1].toFixed(2)} ${p1[0].toFixed(2)} ${p1[1].toFixed(2)} `;
  }
  return `${d}Z`;
}

const SEAL_EDGE = scallops(42, 28, 5);

/** A wax-seal style medallion for achievements and emblems. */
export function Seal({ icon, earned = true, size = 76, className = '' }) {
  const face = `${useId().replace(/:/g, '')}-face`;
  return (
    <div className={`seal ${earned ? 'is-earned' : 'is-locked'} ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        <defs>
          <clipPath id={face}>
            <circle cx="50" cy="50" r="31" />
          </clipPath>
        </defs>
        <path d={SEAL_EDGE} className="seal-edge" />
        <circle cx="50" cy="50" r="36" className="seal-ring" />
        <circle cx="50" cy="50" r="31" className="seal-inner" />
        <circle cx="50" cy="50" r="33.5" className="seal-dots" />
        {/* The glare moves as the seal scrolls (metal.css), but never off its face. */}
        <g clipPath={`url(#${face})`}>
          <g className="seal-shine">
            <ellipse cx="40" cy="34" rx="15" ry="8" transform="rotate(-32 40 34)" />
          </g>
        </g>
      </svg>
      <span className="seal-icon">
        <Glyph name={icon} size={Math.round(size * 0.4)} strokeWidth={earned ? 1.6 : 1.3} />
      </span>
      {!earned && (
        <span className="seal-lock">
          <Glyph name="lock" size={Math.max(12, Math.round(size * 0.18))} strokeWidth={1.6} />
        </span>
      )}
    </div>
  );
}

/** Small round emblem badge used for avatars. */
export function EmblemBadge({ id, size = 44, className = '' }) {
  return (
    <span className={`emblem-badge ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
        <circle cx="24" cy="24" r="22.5" className="emblem-badge-rim" />
        <circle cx="24" cy="24" r="19.5" className="emblem-badge-bg" />
      </svg>
      <Glyph name={id} size={Math.round(size * 0.52)} strokeWidth={1.5} />
    </span>
  );
}

function arc(cx, cy, r, a0, a1) {
  const p = (a) => [cx + r * Math.cos(((a - 90) * Math.PI) / 180), cy + r * Math.sin(((a - 90) * Math.PI) / 180)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/** Five gold arcs around a disc — one per level. */
export function LevelRing({ level = 0, size = 80, due = false }) {
  const segments = [0, 1, 2, 3, 4].map((i) => {
    const a0 = i * 72 + 5;
    const a1 = (i + 1) * 72 - 5;
    return <path key={i} d={arc(40, 40, 37, a0, a1)} className={i < level ? 'ring-on' : 'ring-off'} />;
  });
  return (
    <svg className={`level-ring ${due ? 'is-due' : ''}`} viewBox="0 0 80 80" width={size} height={size} aria-hidden="true">
      {segments}
    </svg>
  );
}

/** Daily goal progress ring. */
export function GoalRing({ value, goal, size = 40, children }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, goal ? value / goal : 0);
  return (
    <span className={`goal-ring ${p >= 1 ? 'is-full' : ''}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
        <circle cx="20" cy="20" r={r} className="goal-track" />
        <circle cx="20" cy="20" r={r} className="goal-fill" strokeDasharray={`${(c * p).toFixed(2)} ${c.toFixed(2)}`} transform="rotate(-90 20 20)" />
      </svg>
      <span className="goal-ring-label">{children}</span>
    </span>
  );
}

/** The Biblos mark: an open book with a heart above it. */
export function LogoMark({ size = 96, className = '' }) {
  return (
    <svg className={`logo-mark ${className}`} viewBox="0 0 120 120" width={size} height={size} aria-hidden="true">
      <circle cx="60" cy="60" r="56" fill="none" stroke="url(#gold-stroke)" strokeWidth="1.6" />
      <circle cx="60" cy="60" r="51" fill="none" stroke="url(#gold-stroke)" strokeWidth="0.6" strokeDasharray="0.5 3.2" strokeLinecap="round" />
      <path d="M60 50 C 60 50, 46 41, 46 33 C 46 28, 50 25, 54 25 C 57 25, 59 27, 60 29 C 61 27, 63 25, 66 25 C 70 25, 74 28, 74 33 C 74 41, 60 50, 60 50 Z" fill="url(#gold-fill)" />
      <path d="M60 18 v -6 M 47 22 l -4 -4 M 73 22 l 4 -4 M 42 33 h -6 M 78 33 h 6" stroke="url(#gold-stroke)" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M58 88 C 48 81, 36 79, 24 82 V 57 C 36 54, 48 56, 58 63 Z" fill="url(#gold-fill)" />
      <path d="M62 88 C 72 81, 84 79, 96 82 V 57 C 84 54, 72 56, 62 63 Z" fill="url(#gold-fill)" />
      <path d="M29 63.5 C 37 61.5, 45 62.5, 52 66 M 29 69.5 C 37 67.5, 45 68.5, 52 72 M 29 75.5 C 37 73.5, 45 74.5, 52 78" stroke="var(--logo-lines)" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M91 63.5 C 83 61.5, 75 62.5, 68 66 M 91 69.5 C 83 67.5, 75 68.5, 68 72 M 91 75.5 C 83 73.5, 75 74.5, 68 78" stroke="var(--logo-lines)" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M20 86 C 34 82, 48 84, 60 92 C 72 84, 86 82, 100 86" stroke="url(#gold-stroke)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** Burst of gold sparks for celebrations. */
export function Sparkles({ count = 26 }) {
  return (
    <div className="sparkles" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const angle = (360 / count) * i + Math.random() * 10;
        const dist = 90 + Math.random() * 110;
        const style = {
          '--dx': `${Math.cos((angle * Math.PI) / 180) * dist}px`,
          '--dy': `${Math.sin((angle * Math.PI) / 180) * dist}px`,
          '--delay': `${Math.random() * 0.25}s`,
          '--size': `${4 + Math.random() * 7}px`,
        };
        return <i key={i} style={style} className={i % 3 === 0 ? 'spark-star' : ''} />;
      })}
    </div>
  );
}
