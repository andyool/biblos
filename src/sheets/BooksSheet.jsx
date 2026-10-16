import { useEffect, useState } from 'react';
import Sheet from '../components/Sheet.jsx';
import Glyph from '../components/Glyph.jsx';
import { EmblemBadge } from '../components/Ornaments.jsx';
import { useStore } from '../lib/store.js';
import { setReadingBook } from '../lib/actions.js';
import { bookProgress, bookSections, readingTr } from '../lib/reading.js';
import { GUIDED, guideNow, isGuided, loadGuide } from '../data/guides/index.js';
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

  useEffect(() => {
    let alive = true;
    Promise.allSettled(GUIDED.map(loadGuide)).then(() => alive && setLoaded((n) => n + 1));
    return () => {
      alive = false;
    };
  }, []);

  // Progress is only known once a guided book's sections have loaded.
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
      <p className="small-print">Guided books come with a focus for each reading, questions on the meaning and a summary to choose. Any other book can be read a chapter at a time, summed up in your own words.</p>

      <h3 className="section-heading">Guided</h3>
      <div className="path-list">
        {GUIDED.map((code) => {
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
                  <span className="book-cell-name">
                    {b.name}
                    {isGuided(b.code) && <Glyph name="sparkle" size={11} className="book-cell-guided" />}
                  </span>
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
