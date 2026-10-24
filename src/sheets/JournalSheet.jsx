import { useEffect, useMemo, useState } from 'react';
import Sheet from '../components/Sheet.jsx';
import Glyph from '../components/Glyph.jsx';
import { JournalCard } from '../components/Journal.jsx';
import { useStore } from '../lib/store.js';
import { useApp } from '../AppContext.js';
import { fillJournalContext } from '../lib/actions.js';
import { byMonth, entryBook, entryMatches, fillLegacy, journalEntries, journalFile, lookBack, monthLabel } from '../lib/journal.js';
import { BOOKS, BOOK_BY_CODE } from '../data/books.js';
import { shareFile } from '../lib/device.js';
import { toast } from '../lib/ui.js';
import { cue } from '../mascot/bus.js';

const FILTERS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'starred', label: 'Starred', test: (e) => e.starred },
  { id: 'prayer', label: 'Prayers', test: (e) => e.kind === 'prayer' },
  { id: 'waiting', label: 'Unanswered', test: (e) => e.kind === 'prayer' && !e.answered },
  { id: 'answered', label: 'Answered', test: (e) => e.kind === 'prayer' && e.answered },
  { id: 'thanks', label: 'Thanks', test: (e) => e.kind === 'thanks' },
];
const ORDER = Object.fromEntries(BOOKS.map((b, i) => [b.code, i]));

/** Everything you have written: after a reading, about a verse, or on its own. */
export default function JournalSheet({ onClose }) {
  const journal = useStore((s) => s.journal);
  const { openSheet } = useApp();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [book, setBook] = useState(null);
  const [oldest, setOldest] = useState(false);

  const entries = useMemo(() => journalEntries(journal), [journal]);
  const books = useMemo(() => [...new Set(entries.map(entryBook).filter(Boolean))].sort((a, b) => ORDER[a] - ORDER[b]), [entries]);
  const back = useMemo(() => lookBack(entries), [entries]);

  // Notes from before the journal kept questions get them from their passages' guides.
  useEffect(() => {
    fillLegacy(journal, fillJournalContext);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const q = query.trim().toLowerCase();
  const test = FILTERS.find((f) => f.id === filter).test;
  const shown = entries.filter((e) => test(e) && (!book || entryBook(e) === book) && (!q || entryMatches(e, q)));
  if (oldest) shown.reverse();
  const narrowed = shown.length !== entries.length;
  const filters = FILTERS.filter((f) => f.id === 'all' || f.id === filter || entries.some(f.test));

  const open = (id) => openSheet({ type: 'journalEntry', id });
  const write = () => openSheet({ type: 'journalEntry', draft: {} });

  const save = async () => {
    const result = await shareFile(journalFile(shown), 'Biblos journal');
    if (result === 'cancelled') return;
    cue('journal');
    if (result === 'downloaded') toast('Journal saved to your downloads', 'check');
  };

  const since = entries.length ? entries.at(-1).created : 0;
  const summary = [`${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`, books.length && `${books.length} book${books.length === 1 ? '' : 's'}`, since && `since ${monthLabel(since)}`].filter(Boolean).join(' · ');

  return (
    <Sheet title="Your journal" onClose={onClose} className="journal-sheet" woolly="write">
      {entries.length > 0 && <p className="journal-summary">{summary}</p>}
      <button className="btn btn-gold btn-block btn-shine" onClick={write}>
        <Glyph name="quill" size={18} /> New entry
      </button>

      {back && !q && filter === 'all' && !book && (
        <div className="journal-back">
          <JournalCard entry={back.entry} onOpen={open} label={`${back.label} you wrote`} />
        </div>
      )}

      {entries.length > 2 && (
        <label className="journal-search">
          <Glyph name="search" size={18} />
          <input className="input" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your journal" aria-label="Search your journal" />
        </label>
      )}
      {entries.length > 2 && (filters.length > 1 || books.length > 1) && (
        <div className="journal-filters">
          {filters.length > 1 && (
            <div className="filters" role="tablist" aria-label="Show">
              {filters.map((f) => (
                <button key={f.id} role="tab" aria-selected={filter === f.id} className={`filter ${filter === f.id ? 'is-on' : ''}`} onClick={() => setFilter(f.id)}>
                  {f.label}
                </button>
              ))}
            </div>
          )}
          {books.length > 1 && (
            <div className="filters" role="tablist" aria-label="Book">
              <button role="tab" aria-selected={!book} className={`filter ${!book ? 'is-on' : ''}`} onClick={() => setBook(null)}>
                Every book
              </button>
              {books.map((code) => (
                <button key={code} role="tab" aria-selected={book === code} className={`filter ${book === code ? 'is-on' : ''}`} onClick={() => setBook(book === code ? null : code)}>
                  {BOOK_BY_CODE[code].name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {shown.length > 1 && (
        <div className="journal-order">
          <span>{narrowed ? `${shown.length} of ${entries.length}` : ''}</span>
          <button className="btn-link" onClick={() => setOldest(!oldest)}>
            {oldest ? 'Oldest first' : 'Newest first'}
          </button>
        </div>
      )}

      <div className="journal-list">
        {byMonth(shown).map((m) => (
          <section key={m.label} className="journal-month" aria-label={m.label}>
            <h3 className="journal-month-name">{m.label}</h3>
            {m.entries.map((e) => (
              <JournalCard key={e.id} entry={e} onOpen={open} />
            ))}
          </section>
        ))}
        {!shown.length && (
          <p className="empty">{entries.length ? 'Nothing in your journal matches that.' : 'What you write after a reading gathers here, with the question it answers. You can write an entry of your own, too.'}</p>
        )}
      </div>

      {shown.length > 0 && (
        <div className="sheet-actions">
          <button className="btn btn-ghost btn-block" onClick={save}>
            <Glyph name="share" size={18} /> {!narrowed ? 'Save or send your journal' : shown.length === 1 ? 'Save or send this entry' : `Save or send these ${shown.length} entries`}
          </button>
        </div>
      )}
    </Sheet>
  );
}
