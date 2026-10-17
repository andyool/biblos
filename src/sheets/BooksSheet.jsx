import { useEffect, useState } from 'react';
import Sheet from '../components/Sheet.jsx';
import Glyph from '../components/Glyph.jsx';
import { EmblemBadge } from '../components/Ornaments.jsx';
import { getState, useStore } from '../lib/store.js';
import { carryOverReading, setReadingBook } from '../lib/actions.js';
import { bookProgress, bookSections, readingTr } from '../lib/reading.js';
import { SUGGESTED, guideNow, isGuided, loadGuide } from '../data/guides/index.js';
import { BOOK_BY_CODE, NEW_TESTAMENT, oldTestament } from '../data/books.js';
import { getTranslation } from '../data/translations.js';

/** Choose which book to read through. */
export default function BooksSheet({ onClose }) {
  const state = useStore();
  const current = state.reading.book;
  // A Catholic Bible adds Tobit, Judith, Wisdom, Sirach, Baruch and 1–2 Maccabees to the Old Testament.
  const catholic = Boolean(getTranslation(state.settings.translation).catholic);
  const testaments = [
    { title: 'Old Testament', books: oldTestament(catholic) },
    { title: 'New Testament', books: NEW_TESTAMENT },
  ];
  const [, setLoaded] = useState(0);

  // Load the guides of the suggested books and of every book you have started, for their
  // taglines and progress; a book you haven't started has nothing to show yet.
  const started = Object.keys(state.reading.books);
  const wanted = [...new Set([...SUGGESTED, ...started])].join(' ');
  useEffect(() => {
    let alive = true;
    const codes = wanted.split(' ');
    Promise.allSettled(codes.map(loadGuide)).then(() => {
      if (!alive) return;
      codes.forEach((code) => guideNow(code) && carryOverReading(code, bookSections(code, guideNow(code), readingTr(getState(), code))));
      setLoaded((n) => n + 1);
    });
    return () => {
      alive = false;
    };
  }, [wanted]);

  // Progress is only known once a book's guide has loaded.
  const progressOf = (code) => {
    if (isGuided(code) && !guideNow(code)) return null;
    return bookProgress(state, code, bookSections(code, guideNow(code), readingTr(state, code)));
  };

  const choose = (code) => {
    setReadingBook(code);
    onClose();
  };

  return (
    <Sheet title="Choose a book" onClose={onClose} className="books-sheet">
      <p className="small-print">Every book comes with a focus for each reading, questions on the meaning and a summary to choose.</p>

      <h3 className="section-heading">Good places to start</h3>
      <div className="path-list">
        {SUGGESTED.map((code) => {
          const p = progressOf(code);
          const guide = guideNow(code);
          return (
            <button key={code} className={`path-item ${current === code ? 'is-active' : ''}`} onClick={() => choose(code)}>
              <EmblemBadge id="scroll" size={42} />
              <span className="path-item-text">
                <strong>{BOOK_BY_CODE[code].name}</strong>
                <small>{[guide?.tagline, p && `${p.count}/${p.total} read`].filter(Boolean).join(' · ') || ' '}</small>
                <span className="mini-bar">
                  <span className="mini-bar-done" style={{ width: `${p ? (p.count / Math.max(1, p.total)) * 100 : 0}%` }} />
                </span>
              </span>
              {current === code ? <Glyph name="check" size={18} /> : <Glyph name="chevron" size={18} />}
            </button>
          );
        })}
      </div>

      {testaments.map((t) => (
        <div key={t.title}>
          <h3 className="section-heading">{t.title}</h3>
          <div className="book-grid">
            {t.books.map((b) => {
              const p = progressOf(b.code);
              return (
                <button key={b.code} className={`book-cell ${current === b.code ? 'is-active' : ''} ${p?.finished ? 'is-done' : ''}`} onClick={() => choose(b.code)}>
                  <span className="book-cell-name">{b.name}</span>
                  <span className="mini-bar">
                    <span className="mini-bar-done" style={{ width: `${p ? (p.count / Math.max(1, p.total)) * 100 : 0}%` }} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </Sheet>
  );
}
