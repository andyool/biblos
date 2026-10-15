import { splitPunct } from '../lib/text.js';
import { formatRef } from '../data/books.js';
import { Frame } from './Ornaments.jsx';
import { useStore } from '../lib/store.js';

/** Show "LORD" and "GOD" in small capitals, as printed Bibles do. */
export function renderWord(w) {
  if (!/(LORD|GOD)/.test(w)) return w;
  return w.split(/(LORD|GOD)/).map((part, i) => {
    if (part === 'LORD') return <span key={i} className="sc">Lord</span>;
    if (part === 'GOD') return <span key={i} className="sc">God</span>;
    return part;
  });
}

function DropCapWord({ w }) {
  const [lead, core, trail] = splitPunct(w);
  const first = core[0] || '';
  let rest = core.slice(1);
  const caps = core.length > 1 && core === core.toUpperCase() && /[A-Z]/.test(core);
  if (caps) rest = <span className="sc">{rest.toLowerCase()}</span>;
  return (
    <>
      <span className="dropcap" aria-hidden="true">
        {lead && <span className="dropcap-lead">{lead}</span>}
        {first}
      </span>
      <span className="sr-only">
        {lead}
        {first}
      </span>
      {rest}
      {trail}
    </>
  );
}

/** A passage rendered word by word. */
export function VerseText({ tokens, dropCap = false, verseNumbers = false, className = '', compact = false }) {
  const multi = verseNumbers && tokens.length && tokens[0].v !== tokens[tokens.length - 1].v;
  return (
    <p className={`verse-text ${compact ? 'is-compact' : ''} ${tokens.length > 48 ? 'is-long' : ''} ${className}`}>
      {tokens.map((t, i) => {
        const showNum = multi && (i === 0 || tokens[i - 1].v !== t.v);
        return (
          <span key={i}>
            {showNum && i > 0 && <sup className="verse-num">{t.v}</sup>}
            {i === 0 && dropCap ? <DropCapWord w={t.w} /> : renderWord(t.w)}{' '}
          </span>
        );
      })}
    </p>
  );
}

/** The verse on an ornamented card with its reference. */
export function VerseCard({ id, tr, tokens, dropCap = true, children, className = '' }) {
  const frame = useStore((s) => s.settings.frame);
  return (
    <Frame variant={frame} className={`verse-card ${className}`}>
      <div className="verse-card-ref">
        <span className="gold-text">{formatRef(id)}</span>
      </div>
      {tokens ? <VerseText tokens={tokens} dropCap={dropCap} verseNumbers /> : children}
      {tr && <div className="verse-card-tr">{tr}</div>}
    </Frame>
  );
}
