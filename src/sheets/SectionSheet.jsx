import { useMemo } from 'react';
import Sheet from '../components/Sheet.jsx';
import Glyph from '../components/Glyph.jsx';
import { JournalCard } from '../components/Journal.jsx';
import { useStore } from '../lib/store.js';
import { useApp } from '../AppContext.js';
import { readingTr, sectionRef, useBook } from '../lib/reading.js';
import { entriesAbout } from '../lib/journal.js';

/** One passage of the book you are reading: what you made of it, and a way back in. */
export default function SectionSheet({ id, onClose }) {
  const reading = useStore((s) => s.reading);
  const journal = useStore((s) => s.journal);
  const { read, openSheet } = useApp();
  const book = id.split('.')[0];
  const tr = useStore((s) => readingTr(s, book));
  const { sections } = useBook(book, tr);
  const sec = sections.find((s) => s.id === id);
  const mine = useMemo(() => entriesAbout(journal, id), [journal, id]);
  if (!sec) return null;
  const doneAt = reading.books[book]?.done?.[id];
  const write = () => openSheet({ type: 'journalEntry', draft: { passage: id, title: sec.title, prompt: sec.reflect } });

  return (
    <Sheet title={sectionRef(sec)} onClose={onClose} className="section-sheet">
      {sec.title && <p className="section-sheet-title gold-soft">{sec.title}</p>}
      <div className="chip-row">
        <span className={`chip ${doneAt ? 'is-on' : 'chip-muted'}`}>
          {doneAt ? (
            <>
              <Glyph name="check" size={14} /> Read {new Date(doneAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
            </>
          ) : (
            'Not read yet'
          )}
        </span>
        <span className="chip chip-muted">{sec.end - sec.start + 1} verses</span>
      </div>

      {/* The summary is the answer to one of the questions, so it waits until you have read it. */}
      {doneAt && sec.summary && <p className="section-sheet-summary">{sec.summary}</p>}
      {mine.length > 0 && (
        <div className="section-sheet-journal">
          <p className="context-kicker">In your journal</p>
          {mine.map((e) => (
            <JournalCard key={e.id} entry={e} compact onOpen={(entryId) => openSheet({ type: 'journalEntry', id: entryId })} />
          ))}
        </div>
      )}
      {doneAt && (
        <button className="btn btn-ghost btn-block" onClick={write}>
          <Glyph name="quill" size={18} /> {mine.length ? 'Write again' : 'Write about it'}
        </button>
      )}

      <div className="sheet-actions">
        <button className="btn btn-gold btn-block btn-shine" onClick={() => read(sec)}>
          {doneAt ? 'Read it again' : 'Read'}
        </button>
      </div>
    </Sheet>
  );
}
