// Hand-drawn line glyphs (24×24) — UI icons, emblems and level marks.

function starPath(points, outer, inner, cx = 12, cy = 12) {
  const d = [];
  for (let i = 0; i < points * 2; i += 1) {
    const r = i % 2 ? inner : outer;
    const a = (Math.PI * i) / points - Math.PI / 2;
    d.push(`${i ? 'L' : 'M'}${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `${d.join(' ')} Z`;
}

const sunRays = Array.from({ length: 12 }, (_, i) => {
  const a = (Math.PI * 2 * i) / 12;
  const r1 = 6.4;
  const r2 = i % 2 ? 8.6 : 10;
  return `M${(12 + r1 * Math.cos(a)).toFixed(2)} ${(12 + r1 * Math.sin(a)).toFixed(2)} L${(12 + r2 * Math.cos(a)).toFixed(2)} ${(12 + r2 * Math.sin(a)).toFixed(2)}`;
}).join(' ');

export const GLYPHS = {
  // ── Emblems ──
  cross: () => (
    <>
      <path d="M12 2.6v18.8M6.4 8h11.2" />
      <path d="M12 2.6l-.9 1.2M12 2.6l.9 1.2M6.4 8l1.2-.9M6.4 8l1.2.9M17.6 8l-1.2-.9M17.6 8l-1.2.9" strokeWidth="1" />
    </>
  ),
  dove: () => (
    <>
      <path d="M2.8 12.2l1.6-.5c.5-1.5 1.8-2.3 3.2-2.1 1.3.2 2.2 1 3 1.9l4.6 1c2.2.4 4.2.1 6.2-1.2-.8 2.2-2.4 3.6-4.6 4.1-2.4 1.8-5.6 2.4-8.6 1.4-1.8-.6-3.2-2.1-3.8-3.8z" />
      <path d="M10.2 11.4c.2-3.4 2-6.4 5.8-8.2-.4 2.4.2 4.4 2 5.4-1.8.8-2.8 2.2-3.2 4" />
      <path d="M12.4 10.2c.8-1.6 2-2.8 3.6-3.6" strokeWidth="1" />
      <path d="M3.2 12.4c-.8 1.2-.8 2.6 0 3.8M3 14.2c-.9-.2-1.4.3-1.6 1 .8.2 1.4-.2 1.6-1z" strokeWidth="1" />
      <circle cx="5.9" cy="11.3" r=".5" fill="currentColor" stroke="none" />
    </>
  ),
  lamp: (lit) => (
    <>
      <path d="M3.6 14.4c0-2 3-2.8 6-2.8h4.8l4.4-2c.8-.3 1.4.4 1 1l-2.6 3.6c-1.2 1.8-3.8 2.8-6.8 2.8-4 0-6.8-.6-6.8-2.6z" />
      <path d="M4.1 13.1c-2-.4-2.2-2.8-.4-2.8 1.2 0 1.8.8 2 1.5M8 16.9l-.6 2.5h6.2l-.6-2.5M10.8 11.6c0-1.2 2-1.2 2 0" />
      <path
        d="M19.7 8.4c-1-1.2-.6-3 .8-4.8.6 1.6 1.6 2.6 1 4-.3.7-1 1.1-1.8.8z"
        fill={lit ? 'currentColor' : 'none'}
        className="glyph-flame"
      />
    </>
  ),
  crook: () => (
    <>
      <path d="M15.2 21.4V9c0-3.6-2-5.8-5-5.8-2.8 0-4.4 2-4.4 4.2 0 1.8 1.2 3 2.8 3 1.2 0 2-.8 2-1.8" />
      <path d="M13.4 21.4h3.6" />
    </>
  ),
  chirho: () => (
    <>
      <path d="M12 3v18M12 3.4h2.6c2.6 0 2.6 5.4 0 5.4H12M7.4 9.6l9.2 9.2M16.6 9.6l-9.2 9.2" />
    </>
  ),
  sun: () => (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d={sunRays} />
    </>
  ),
  heart: () => <path d="M12 20.4S3.6 15.2 3.6 9.4c0-2.8 2.1-4.8 4.5-4.8 1.7 0 3.1.9 3.9 2.4.8-1.5 2.2-2.4 3.9-2.4 2.5 0 4.5 2 4.5 4.8 0 5.8-8.4 11-8.4 11z" />,
  crown: () => (
    <>
      <path d="M3.6 17.4l1.1-9.8 4.1 4L12 5.2l3.2 6.4 4.1-4 1.1 9.8z" />
      <path d="M3.6 20h16.8" />
      <circle cx="12" cy="4.3" r=".9" />
      <circle cx="4.6" cy="6.7" r=".8" />
      <circle cx="19.4" cy="6.7" r=".8" />
    </>
  ),
  scroll: () => (
    <>
      <path d="M7 4.4h10.4c1.4 0 2.2 1 2.2 2.2v.6h-3.2" />
      <path d="M7 4.4c1.4 0 2.2 1 2.2 2.2v11.2c0 1.2.8 2 2 2" />
      <path d="M7 4.4c-1.4 0-2.4 1-2.4 2.2S5.6 8.8 7 8.8h2.2" />
      <path d="M16.4 7.2v10.6c0 1.2-.8 2-2 2H11.2" />
      <path d="M11.6 9.6h2.8M11.6 12.2h2.8M11.6 14.8h2" strokeWidth="1" />
    </>
  ),
  flame: () => (
    <>
      <path d="M12 21c-3.8 0-6-2.6-6-5.8 0-3.8 3.4-5.6 3.6-9.6 2.8 1.8 3.6 3.8 3.4 6 1-.8 1.6-2 1.8-3.2 2 2 3.2 4.4 3.2 6.8 0 3.2-2.2 5.8-6 5.8z" />
      <path d="M12 18.8c-1.4 0-2.2-1-2.2-2.2 0-1.6 1.6-2.4 2-4 1.6 1.2 2.4 2.6 2.4 4 0 1.2-.8 2.2-2.2 2.2z" strokeWidth="1" />
    </>
  ),
  anchor: () => (
    <>
      <circle cx="12" cy="4.6" r="1.8" />
      <path d="M12 6.4v14.1M8.4 9.4h7.2M4.5 14.4c.7 3.8 3.9 6.1 7.5 6.1s6.8-2.3 7.5-6.1" />
      <path d="M3.2 16.2l1.3-1.9 2.1 1.1M20.8 16.2l-1.3-1.9-2.1 1.1" strokeWidth="1.1" />
    </>
  ),
  shield: () => (
    <>
      <path d="M12 3l7.4 2.8v5.4c0 4.6-3.1 8.2-7.4 9.8-4.3-1.6-7.4-5.2-7.4-9.8V5.8z" />
      <path d="M12 7.4v9.2M8.6 10.6h6.8" />
    </>
  ),
  star: () => <path d={starPath(8, 9.6, 3.6)} />,
  olive: () => (
    <>
      <path d="M5 20.4c3-5 7-10.6 14.2-16" />
      <path d="M8 15.6c-1.8-.4-3-2-2.8-3.6 1.8.4 2.8 2 2.8 3.6zM8 15.6c.4 1.8 2 2.8 3.6 2.6-.4-1.8-2-2.8-3.6-2.6zM11.6 11.2c-1.6-.6-2.6-2.2-2.2-3.8 1.6.6 2.6 2.2 2.2 3.8zM11.6 11.2c.6 1.6 2.2 2.4 3.8 2-.6-1.6-2.2-2.4-3.8-2zM15.4 7.2c-1.2-.8-1.8-2.4-1.2-3.8 1.2.8 1.8 2.4 1.2 3.8zM15.4 7.2c1 1 2.6 1.4 3.8.8-1-1-2.6-1.4-3.8-.8z" />
      <circle cx="13.6" cy="15.6" r="1.1" />
    </>
  ),
  ichthys: () => (
    <>
      <path d="M2.4 7.4c4.6 10.4 13.4 10.2 19.2 4.6-5.8-5.6-14.6-5.8-19.2 4.6" />
      <circle cx="17.4" cy="11.2" r=".5" fill="currentColor" stroke="none" />
    </>
  ),
  key: () => (
    <>
      <circle cx="7.2" cy="7.2" r="3.6" />
      <circle cx="7.2" cy="7.2" r="1.2" strokeWidth="1" />
      <path d="M9.8 9.8l10.4 10.4M15.6 15.6l2-2M18 18l2-2" />
    </>
  ),
  wheat: () => (
    <>
      <path d="M12 21.6V6.6" />
      <path d="M12 6.2c-.9-1.2-.8-2.8 0-3.8.8 1 .9 2.6 0 3.8zM12 9.4c-2-.4-3-2-2.7-3.8 1.9.5 2.8 2 2.7 3.8zm0 0c2-.4 3-2 2.7-3.8-1.9.5-2.8 2-2.7 3.8zM12 12.8c-2-.4-3-2-2.7-3.8 1.9.5 2.8 2 2.7 3.8zm0 0c2-.4 3-2 2.7-3.8-1.9.5-2.8 2-2.7 3.8zM12 16.2c-2-.4-3-2-2.7-3.8 1.9.5 2.8 2 2.7 3.8zm0 0c2-.4 3-2 2.7-3.8-1.9.5-2.8 2-2.7 3.8z" />
    </>
  ),
  vine: () => (
    <>
      <path d="M12 8.2c0-2 1-3.6 3-4.6M12 6.4C9 3.4 5.6 4.2 5 6.6c2.6 1 5 1 7-.2z" />
      <circle cx="10" cy="10.2" r="1.9" />
      <circle cx="14" cy="10.2" r="1.9" />
      <circle cx="8" cy="13.6" r="1.9" />
      <circle cx="12" cy="13.6" r="1.9" />
      <circle cx="16" cy="13.6" r="1.9" />
      <circle cx="10" cy="17" r="1.9" />
      <circle cx="14" cy="17" r="1.9" />
      <circle cx="12" cy="20.3" r="1.9" />
    </>
  ),
  quill: () => (
    <>
      <path d="M19.8 3.2c-6.4 1-11.2 5.6-13 12l-.8 4 3.4-2.8c5.6-1.8 9.6-6.8 10.4-13.2z" />
      <path d="M4.2 21l7.4-8.8M9.4 16.4l-1.2-1.8M12 14.2l-1.6-1.4M14.4 11.6l-1.6-1" strokeWidth="1" />
    </>
  ),
  seed: () => <path d="M12 19.4c-3.6 0-5-3-4.2-6 1-3.4 4.2-5 4.2-5s3.2 1.6 4.2 5c.8 3-.6 6-4.2 6zM12 10.6v6.4" />,
  sprout: () => (
    <>
      <path d="M12 20.4v-9M12 13.2c-3 0-5.4-2-5.4-5 3 0 5.4 2 5.4 5zM12 11.6c2.6 0 5-1.9 5-4.6-2.6 0-5 2-5 4.6z" />
      <path d="M12 20.4c-1 .8-2.4 1.2-3.6 1.2M12 20.4c1 .8 2.4 1.2 3.6 1.2" strokeWidth="1" />
    </>
  ),

  // ── Interface ──
  path: () => (
    <>
      <path d="M7 21.2c0-4.2 10-4.2 10-8.4S7 8.6 7 4.4" strokeDasharray="0.1 3.2" />
      <circle cx="7" cy="4" r="2" />
      <circle cx="17" cy="12.8" r="2" />
      <circle cx="7" cy="20.8" r="2" />
    </>
  ),
  book: () => (
    <>
      <path d="M12 6.2C9.4 4.6 6 4.4 3.2 5.4v13.4c2.8-1 6.2-.8 8.8.8 2.6-1.6 6-1.8 8.8-.8V5.4c-2.8-1-6.2-.8-8.8.8z" />
      <path d="M12 6.2v13.4" />
    </>
  ),
  treasury: () => (
    <>
      <path d="M3.6 10.4h16.8v9.2H3.6zM3.6 10.4c0-3.4 2.4-5.6 8.4-5.6s8.4 2.2 8.4 5.6M3.6 13.6h16.8" />
      <path d="M10.6 12.4h2.8v3h-2.8z" />
    </>
  ),
  coin: () => (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <circle cx="12" cy="12" r="6.2" strokeWidth="0.9" strokeDasharray="0.6 1.6" />
      <path d="M12 8.4v7.2M9.6 10.4h4.8" strokeWidth="1.3" />
    </>
  ),
  close: () => <path d="M6 6l12 12M18 6L6 18" />,
  check: () => <path d="M5 12.6l4.6 4.4L19 7.2" />,
  chevron: () => <path d="M9 5.6L15.4 12 9 18.4" />,
  back: () => <path d="M15 5.6L8.6 12l6.4 6.4" />,
  down: () => <path d="M5.6 9l6.4 6.4L18.4 9" />,
  plus: () => <path d="M12 5v14M5 12h14" />,
  lock: () => (
    <>
      <rect x="5.6" y="10.6" width="12.8" height="9.4" rx="2" />
      <path d="M8.4 10.6V8a3.6 3.6 0 017.2 0v2.6" />
    </>
  ),
  speaker: () => (
    <>
      <path d="M4 9.4h3.6L12.4 5.4v13.2L7.6 14.6H4z" />
      <path d="M15.6 9c1.4 1.6 1.4 4.4 0 6M18.2 6.6c2.8 3 2.8 7.8 0 10.8" />
    </>
  ),
  calendar: () => (
    <>
      <rect x="3.8" y="5.4" width="16.4" height="14.8" rx="2.4" />
      <path d="M3.8 9.8h16.4M8.2 3.4v4M15.8 3.4v4" />
    </>
  ),
  search: () => (
    <>
      <circle cx="10.6" cy="10.6" r="6.2" />
      <path d="M15.2 15.2l5 5" />
    </>
  ),
  eye: () => (
    <>
      <path d="M2.4 12c2.8-5 16.4-5 19.2 0-2.8 5-16.4 5-19.2 0z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  pen: () => (
    <>
      <path d="M15.8 4.6l3.6 3.6L8.6 19H5v-3.6z" />
      <path d="M13.6 6.8l3.6 3.6" />
    </>
  ),
  refresh: () => <path d="M19.4 12a7.4 7.4 0 11-2.2-5.2M19.6 4.4v4.2h-4.2" />,
  trash: () => <path d="M4.6 7h14.8M9.4 7V4.8h5.2V7M6.6 7l.9 12.6h9L17.4 7M10.2 10.4v6.2M13.8 10.4v6.2" />,
  share: () => <path d="M12 15.4V3.6M7.8 7.6L12 3.4l4.2 4.2M5.6 11.6v7.8h12.8v-7.8" />,
  upload: () => <path d="M12 3.6v11.8M7.8 11.2l4.2 4.2 4.2-4.2M5.6 19.4h12.8" />,
  globe: () => (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M3.4 12h17.2M12 3.4c2.4 2.4 3.6 5.2 3.6 8.6s-1.2 6.2-3.6 8.6c-2.4-2.4-3.6-5.2-3.6-8.6S9.6 5.8 12 3.4z" />
    </>
  ),
  sparkle: () => <path d="M12 2.4c.5 5.4 4.2 9.1 9.6 9.6-5.4.5-9.1 4.2-9.6 9.6-.5-5.4-4.2-9.1-9.6-9.6 5.4-.5 9.1-4.2 9.6-9.6z" />,
  info: () => (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 11v5.4M12 7.6v.2" />
    </>
  ),
  phone: () => (
    <>
      <rect x="6.6" y="2.8" width="10.8" height="18.4" rx="2.4" />
      <path d="M10.4 18.2h3.2" />
    </>
  ),
  bolt: () => <path d="M13.4 2.8L5.6 13.4h5.6l-1 7.8 8-10.8h-5.8z" />,
  target: () => (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <circle cx="12" cy="12" r="4.8" />
      <circle cx="12" cy="12" r="1.2" />
    </>
  ),
};

export default function Glyph({ name, size = 24, strokeWidth = 1.5, lit, className = '', title, style }) {
  const draw = GLYPHS[name] || GLYPHS.cross;
  return (
    <svg
      className={`glyph ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      style={style}
    >
      {title && <title>{title}</title>}
      {draw(lit)}
    </svg>
  );
}
