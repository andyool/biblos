import Glyph from './Glyph.jsx';
import { renderWord } from './VerseText.jsx';
import { KIND, KINDS, MAX_TEXT, entryRef, shortDate } from '../lib/journal.js';

/**
 * One entry in a list: what it was about, the question, and the start of what you wrote.
 * `compact`, for a list on the passage's or verse's own sheet, leaves out what that sheet shows.
 */
export function JournalCard({ entry: e, onOpen, label, compact = false }) {
  const ref = compact ? '' : entryRef(e);
  const kind = KIND[e.kind];
  return (
    <button className={`journal-entry is-${e.kind}`} onClick={() => onOpen(e.id)}>
      {label && <span className="journal-label">{label}</span>}
      <span className="journal-head">
        <strong>
          {!ref && <Glyph name={kind.glyph} size={14} />}
          {ref || kind.label}
        </strong>
        <span className="journal-marks">
          {e.starred && <Glyph name="star" size={15} className="journal-star" title="Starred" />}
          <small>{shortDate(e.created)}</small>
        </span>
      </span>
      {e.title && !compact && <span className="journal-title gold-soft">{e.title}</span>}
      {e.prompt && !(compact && e.passage) && <span className="journal-prompt">{e.prompt}</span>}
      <span className="journal-note">{e.text}</span>
      {(e.answered || (ref && e.kind !== 'thought')) && (
        <span className="journal-tags">
          {ref && e.kind !== 'thought' && (
            <span className="journal-tag">
              <Glyph name={kind.glyph} size={13} /> {kind.label}
            </span>
          )}
          {e.answered && (
            <span className="journal-tag is-answered">
              <Glyph name="check" size={13} strokeWidth={2} /> Answered
            </span>
          )}
        </span>
      )}
    </button>
  );
}

/** Thought, prayer or thanks. */
export function KindPicker({ value, onChange }) {
  return (
    <div className="segmented is-three journal-kinds" role="radiogroup" aria-label="Kind of entry">
      {KINDS.map((k) => (
        <button key={k.id} role="radio" aria-checked={value === k.id} className={value === k.id ? 'is-on' : ''} onClick={() => onChange(k.id)}>
          {k.label}
        </button>
      ))}
    </div>
  );
}

/** The verses an entry quotes, each with a way to take it out while editing (onRemove). */
export function Quotes({ entry, onRemove }) {
  if (!entry.quotes?.length) return null;
  const where = entry.passage ? '' : entryRef(entry);
  return (
    <blockquote className="journal-quote">
      {entry.quotes.map((q) => (
        <p key={q.v}>
          <sup>{q.v}</sup>
          <span className="journal-quote-words">{renderWord(q.t)}</span>
          {onRemove && (
            <button className="journal-quote-remove" onClick={() => onRemove(q.v)} aria-label={`Take out verse ${q.v}`}>
              <Glyph name="close" size={14} />
            </button>
          )}
        </p>
      ))}
      {(where || entry.tr) && <cite>{[where, entry.tr].filter(Boolean).join(' · ')}</cite>}
    </blockquote>
  );
}

/** How much more there is room for, once it is nearly full. */
export function Room({ text }) {
  if (text.length < MAX_TEXT - 500) return null;
  return (
    <p className={`field-note journal-room ${text.length >= MAX_TEXT ? 'is-error' : ''}`}>
      {text.length.toLocaleString()} / {MAX_TEXT.toLocaleString()}
    </p>
  );
}
