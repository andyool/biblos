import { useEffect, useMemo, useState } from 'react';
import Sheet from '../components/Sheet.jsx';
import Glyph from '../components/Glyph.jsx';
import { useStore } from '../lib/store.js';
import { useApp } from '../AppContext.js';
import { guideNow, loadGuide } from '../data/guides/index.js';
import { formatRef } from '../data/books.js';
import { dayKey } from '../lib/dates.js';
import { shareFile } from '../lib/device.js';
import { toast } from '../lib/ui.js';

/** The guide's title for a passage, once its guide has loaded. */
function titleOf(id) {
  const [book, chapter, verses] = id.split('.');
  const ref = `${chapter}:${verses}`;
  return guideNow(book)?.sections.find((s) => s.ref === ref)?.title || '';
}

const dateText = (at) => (at ? new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '');

/** Everything you have written after a reading, newest first. */
export default function JournalSheet({ onClose }) {
  const notes = useStore((s) => s.reading.notes);
  const { openSheet } = useApp();
  const [query, setQuery] = useState('');
  const [, setLoaded] = useState(0);

  const entries = useMemo(
    () =>
      Object.entries(notes)
        .filter(([, n]) => n?.note)
        .map(([id, n]) => ({ id, note: n.note, at: n.at || 0 }))
        .sort((a, b) => b.at - a.at),
    [notes],
  );

  // The passages' titles come from their books' guides.
  const books = [...new Set(entries.map((e) => e.id.split('.')[0]))].join(' ');
  useEffect(() => {
    let alive = true;
    Promise.allSettled(books.split(' ').filter(Boolean).map(loadGuide)).then(() => alive && setLoaded((n) => n + 1));
    return () => {
      alive = false;
    };
  }, [books]);

  const q = query.trim().toLowerCase();
  const shown = q ? entries.filter((e) => `${formatRef(e.id)} ${titleOf(e.id)} ${e.note}`.toLowerCase().includes(q)) : entries;

  const save = async () => {
    const lines = ['Biblos journal', ''];
    for (const e of entries) {
      const title = titleOf(e.id);
      lines.push(`${formatRef(e.id)}${title ? ` — ${title}` : ''}`, dateText(e.at), '', e.note, '', '');
    }
    const file = new File([lines.join('\n')], `biblos-journal-${dayKey()}.txt`, { type: 'text/plain' });
    const result = await shareFile(file, 'Biblos journal');
    if (result === 'downloaded') toast('Journal saved to your downloads', 'check');
  };

  return (
    <Sheet title="Your journal" onClose={onClose} className="journal-sheet">
      {entries.length > 2 && (
        <label className="journal-search">
          <Glyph name="search" size={18} />
          <input className="input" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your notes" aria-label="Search your notes" />
        </label>
      )}
      <div className="journal-list">
        {shown.map((e) => {
          const title = titleOf(e.id);
          return (
            <button key={e.id} className="journal-entry" onClick={() => openSheet({ type: 'section', id: e.id })}>
              <span className="journal-head">
                <strong>{formatRef(e.id)}</strong>
                <small>{dateText(e.at)}</small>
              </span>
              {title && <span className="journal-title gold-soft">{title}</span>}
              <span className="journal-note">{e.note}</span>
            </button>
          );
        })}
        {!shown.length && <p className="empty">{entries.length ? 'No notes match that.' : 'Notes you write after a reading gather here.'}</p>}
      </div>
      {entries.length > 0 && (
        <div className="sheet-actions">
          <button className="btn btn-ghost btn-block" onClick={save}>
            <Glyph name="share" size={18} /> Save or send your journal
          </button>
        </div>
      )}
    </Sheet>
  );
}
