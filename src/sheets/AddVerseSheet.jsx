import { useEffect, useMemo, useRef, useState } from 'react';
import Sheet from '../components/Sheet.jsx';
import Glyph from '../components/Glyph.jsx';
import { renderWord } from '../components/VerseText.jsx';
import TranslationPicker from '../components/TranslationPicker.jsx';
import PasteText from './PasteText.jsx';
import { useStore } from '../lib/store.js';
import { useApp } from '../AppContext.js';
import { BOOK_BY_CODE, NEW_TESTAMENT, chaptersIn, findBook, formatRef, makeId, oldTestament, parseId, parseReference } from '../data/books.js';
import { versesIn } from '../data/chapters.js';
import { getTranslation } from '../data/translations.js';
import { loadRange } from '../lib/bible.js';
import { getText, setText, useTextsVersion } from '../lib/texts.js';
import { addCustomVerses, setActivePath } from '../lib/actions.js';
import { useBack } from '../lib/nav.js';
import { toast } from '../lib/ui.js';
import { cueSoon } from '../mascot/bus.js';

// Find a verse the way you would in a printed Bible: a book, then a chapter, then the verses.
// You can also type a reference, which opens its chapter with those verses chosen.

const squash = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** The book part of what was typed ("1 Cor 13:4" → "1cor"). */
const bookPart = (query) => squash(query.match(/^\s*([1-3]\s*)?[^\d]*/)[0]);

const matchesBook = (book, key) =>
  !key || squash(book.name).includes(key) || squash(book.short).startsWith(key) || book.aliases.some((a) => squash(a).startsWith(key));

/** Verse numbers next to each other, in runs: [1, 2, 3, 7] → [[1, 2, 3], [7]]. */
function runsOf(numbers) {
  const runs = [];
  for (const n of [...numbers].sort((a, b) => a - b)) {
    const last = runs[runs.length - 1];
    if (last && n === last[last.length - 1] + 1) last.push(n);
    else runs.push([n]);
  }
  return runs;
}

/** "Romans 12", "Psalm 23" */
const chapterLabel = (book, chapter) => formatRef(`${book}.${chapter}.1`).split(':')[0];

/** "Romans 12:1–2, 9" */
function selectionLabel(book, chapter, runs) {
  const [first, ...rest] = runs.map((r) => makeId({ book, chapter, start: r[0], end: r[r.length - 1] }));
  return [formatRef(first), ...rest.map((id) => formatRef(id).split(':')[1])].join(', ');
}

/** Every verse of a chapter that the translation has: { status, verses: [{ v, t }], error }. */
function useChapter(tr, book, chapter) {
  const [attempt, setAttempt] = useState(0);
  const key = book && chapter ? `${tr}|${book}.${chapter}|${attempt}` : null;
  const [result, setResult] = useState({ key: null });
  useEffect(() => {
    if (!key) return undefined;
    let alive = true;
    loadRange(tr, book, chapter, 1, versesIn(book, chapter, Boolean(getTranslation(tr).catholic)))
      .then((verses) => alive && setResult({ key, status: 'ready', verses }))
      .catch((error) => alive && setResult({ key, status: 'error', error }));
    return () => {
      alive = false;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const current = result.key === key ? result : { status: 'loading' };
  return { ...current, retry: () => setAttempt((n) => n + 1) };
}

export default function AddVerseSheet({ onClose }) {
  const settings = useStore((s) => s.settings);
  const verses = useStore((s) => s.verses);
  const custom = useStore((s) => s.custom);
  const { start, go } = useApp();
  useTextsVersion();
  const [tr, setTr] = useState(settings.translation);
  const [pickTr, setPickTr] = useState(false);
  const [query, setQuery] = useState('');
  const [book, setBook] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [picked, setPicked] = useState([]);
  const [split, setSplit] = useState(null); // null: as recommended
  const [scrollTo, setScrollTo] = useState(null);
  const top = useRef(null);

  const catholic = Boolean(getTranslation(tr).catholic);
  const step = chapter ? 'verses' : book ? 'chapter' : 'book';
  const chapterCount = book ? chaptersIn(book, catholic) : 0;
  const loaded = useChapter(tr, step === 'verses' ? book : null, chapter);

  const goTo = (code, c, pick = []) => {
    setBook(code);
    setChapter(c);
    setPicked(pick);
    setSplit(null);
  };
  const toBooks = () => goTo(null, null);
  const toChapters = () => goTo(book, null);
  // A book of one chapter (Obadiah, Philemon, Jude…) goes straight to its verses.
  const openBook = (code) => goTo(code, chaptersIn(code, catholic) === 1 ? 1 : null);

  // The phone's back gesture steps back through the picker before it closes the sheet.
  useBack(toBooks, { active: step !== 'book' });
  useBack(toChapters, { active: step === 'verses' && chapterCount > 1 });

  // Each step starts at its top; a typed reference scrolls to its verse instead.
  useEffect(() => {
    top.current?.closest('.sheet')?.scrollTo({ top: 0 });
  }, [step, book, chapter]);
  useEffect(() => {
    if (loaded.status !== 'ready' || !scrollTo) return;
    top.current?.closest('.sheet')?.querySelector(`[data-verse="${scrollTo}"]`)?.scrollIntoView({ block: 'center' });
    setScrollTo(null);
  }, [loaded.status, scrollTo]);

  // What is already in My Verses: books, chapters and verses get a mark.
  const mine = useMemo(() => Object.values(verses).filter((v) => v.level >= 1 || custom.includes(v.id)).map((v) => parseId(v.id)), [verses, custom]);
  const booksWithMine = new Set(mine.map((r) => r.book));
  const chaptersWithMine = new Set(mine.filter((r) => r.book === book).map((r) => r.chapter));
  const versesWithMine = new Set(mine.filter((r) => r.book === book && r.chapter === chapter).flatMap((r) => Array.from({ length: r.end - r.start + 1 }, (_, i) => r.start + i)));

  // A typed reference: "Romans 12" opens the chapter, "Romans 12:1-2" also chooses the verses.
  const parsed = /\d/.test(query.replace(/^\s*[1-3]/, '')) ? parseReference(query) : null;
  const typed = parsed && !parsed.error ? parsed : null;
  const key = bookPart(query);
  const testaments = [
    { title: 'Old Testament', books: oldTestament(catholic).filter((b) => matchesBook(b, key)) },
    { title: 'New Testament', books: NEW_TESTAMENT.filter((b) => matchesBook(b, key)) },
  ];
  const found = testaments.flatMap((t) => t.books);
  const goTyped = () => {
    if (!typed) {
      // Just a book: open it (the one named, or else the first that matches).
      const named = findBook(query);
      const only = found.find((b) => b === named) || found[0];
      if (key && only) openBook(only.code);
      return;
    }
    setQuery('');
    if (typed.wholeChapter) {
      goTo(typed.book, typed.chapter);
      return;
    }
    goTo(
      typed.book,
      typed.chapter,
      Array.from({ length: typed.end - typed.start + 1 }, (_, i) => typed.start + i),
    );
    setScrollTo(typed.start);
  };

  const toggle = (v) => setPicked((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));

  const ready = loaded.status === 'ready';
  const available = ready ? new Set(loaded.verses.map((v) => v.v)) : null;
  const chosen = available ? picked.filter((v) => available.has(v)) : picked;
  const runs = runsOf(chosen);
  const longest = Math.max(0, ...runs.map((r) => r.length));
  const splitOn = split ?? longest > 3;
  const label = chosen.length ? selectionLabel(book, chapter, runs) : '';
  // When the text could not be loaded, a passage of neighbouring verses can be pasted by hand.
  const pastedId = !ready && runs.length === 1 ? makeId({ book, chapter, start: runs[0][0], end: runs[0][runs[0].length - 1] }) : null;
  const pasted = pastedId ? getText(tr, pastedId) : null;

  const add = (andStart) => {
    let ids;
    if (ready) {
      const passages = splitOn ? chosen.map((v) => [v]) : runs.flatMap((r) => Array.from({ length: Math.ceil(r.length / 30) }, (_, i) => r.slice(i * 30, i * 30 + 30)));
      ids = passages.map((r) => makeId({ book, chapter, start: r[0], end: r[r.length - 1] }));
      passages.forEach((r, i) => {
        // Keep any text you corrected by hand.
        if (!getText(tr, ids[i])) setText(tr, ids[i], { verses: loaded.verses.filter((v) => r.includes(v.v)), src: getTranslation(tr).source });
      });
    } else if (pasted) {
      ids = [pastedId];
    } else return;
    const fresh = ids.filter((x) => !custom.includes(x));
    addCustomVerses(ids, tr);
    setActivePath('mine');
    toast(fresh.length ? `${label} added to My Verses` : 'Already in My Verses', 'check');
    if (fresh.length && !andStart) cueSoon('verseAdded');
    onClose();
    const first = fresh[0] || ids[0];
    if (andStart) start({ kind: 'learn', verseIds: [first], title: 'Sow a new verse', detail: formatRef(first) });
    else go('path');
  };

  const trChip = (
    <button className="chip" onClick={() => setPickTr(!pickTr)} aria-expanded={pickTr}>
      {tr} <Glyph name="down" size={14} />
    </button>
  );
  const trPicker = pickTr && (
    <TranslationPicker
      value={tr}
      compact
      onPick={(t) => {
        setTr(t);
        setPickTr(false);
        if (!book) return;
        // A book only Catholic Bibles have can't be browsed in another translation.
        if (BOOK_BY_CODE[book].deutero && !getTranslation(t).catholic) toBooks();
        else if (chapter > chaptersIn(book, Boolean(getTranslation(t).catholic))) toChapters();
      }}
    />
  );

  return (
    <Sheet title="Add a verse" onClose={onClose} className="add-verse-sheet" woolly="search">
      <div ref={top} className="pick-top">
        {step === 'book' ? (
          <div className="pick-bar">
            <input
              className="input pick-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && goTyped()}
              placeholder="Find a book, or John 3:16"
              aria-label="Find a book or type a reference"
              autoCapitalize="words"
              autoCorrect="off"
              enterKeyHint="go"
            />
            {trChip}
          </div>
        ) : (
          <div className="pick-bar">
            <button className="btn-link pick-back" onClick={step === 'verses' && chapterCount > 1 ? toChapters : toBooks}>
              <Glyph name="back" size={16} /> {step === 'verses' && chapterCount > 1 ? 'Chapters' : 'Books'}
            </button>
            <h3 className="pick-title">{step === 'verses' && chapterCount > 1 ? chapterLabel(book, chapter) : BOOK_BY_CODE[book].name}</h3>
            {trChip}
          </div>
        )}
      </div>
      {trPicker}

      {step === 'book' && (
        <>
          {typed && (
            <button className="btn btn-gold btn-block" onClick={goTyped}>
              Open {typed.wholeChapter ? chapterLabel(typed.book, typed.chapter) : formatRef(makeId(typed))} <Glyph name="chevron" size={16} />
            </button>
          )}
          {parsed?.error && <p className="field-note is-error">{parsed.error}</p>}
          {testaments.map((t) => {
            if (!t.books.length) return null;
            return (
              <div key={t.title}>
                <h3 className="section-heading">{t.title}</h3>
                <div className="book-grid">
                  {t.books.map((b) => (
                    <button key={b.code} className="book-cell is-plain" onClick={() => openBook(b.code)}>
                      <span className="book-cell-name">{b.name}</span>
                      {booksWithMine.has(b.code) && <i className="pick-dot" aria-label="Has verses in My Verses" />}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {!found.length && <p className="empty">No book by that name.</p>}
        </>
      )}

      {step === 'chapter' && (
        <>
          <p className="small-print pick-hint">{book === 'PSA' ? 'Choose a psalm.' : 'Choose a chapter.'}</p>
          <div className="chapter-grid">
            {Array.from({ length: chapterCount }, (_, i) => i + 1).map((c) => (
              <button key={c} className="chapter-cell" onClick={() => goTo(book, c)} aria-label={`${book === 'PSA' ? 'Psalm' : 'Chapter'} ${c}`}>
                {c}
                {chaptersWithMine.has(c) && <i className="pick-dot" aria-hidden="true" />}
              </button>
            ))}
          </div>
        </>
      )}

      {step === 'verses' && (
        <>
          {loaded.status === 'loading' && (
            <div className="verse-pick-list">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="verse-pick is-tile is-loading">
                  <div className="loading-lines">
                    <span />
                    <span />
                  </div>
                </div>
              ))}
            </div>
          )}

          {loaded.status === 'error' && (
            <>
              <div className="note note-error">{loaded.error?.message}</div>
              {['offline', 'network'].includes(loaded.error?.kind) ? (
                <>
                  <button className="btn btn-ghost btn-block" onClick={loaded.retry}>
                    <Glyph name="refresh" size={18} /> Try again
                  </button>
                  <p className="small-print">Or choose the verses and paste the words yourself:</p>
                </>
              ) : (
                <p className="small-print">Choose another Bible above, or paste the words yourself:</p>
              )}
            </>
          )}

          {ready && <p className="small-print pick-hint">Tap the verses you want.</p>}

          {ready && (
            <div className="verse-pick-list" role="group" aria-label="Verses">
              {loaded.verses.map((v) => {
                const on = picked.includes(v.v);
                return (
                  <button key={v.v} data-verse={v.v} className={`verse-pick is-tile ${on ? 'is-on' : ''}`} onClick={() => toggle(v.v)} aria-pressed={on}>
                    <span className="verse-pick-num">{v.v}</span>
                    <span className="verse-pick-text">
                      {renderWord(v.t)}
                      {versesWithMine.has(v.v) && (
                        <small className="verse-pick-saved">
                          <Glyph name="check" size={12} strokeWidth={2} /> In My Verses
                        </small>
                      )}
                    </span>
                    <span className="verse-pick-mark">{on && <Glyph name="check" size={16} strokeWidth={2} />}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Without the text, the verses are numbers only. */}
          {loaded.status === 'error' && (
            <div className="chapter-grid">
              {Array.from({ length: versesIn(book, chapter, catholic) }, (_, i) => i + 1).map((v) => (
                <button key={v} className={`chapter-cell ${picked.includes(v) ? 'is-on' : ''}`} onClick={() => toggle(v)} aria-pressed={picked.includes(v)}>
                  {v}
                </button>
              ))}
            </div>
          )}

          {chosen.length > 0 && (
            <div className="pick-footer">
              <div className="pick-summary">
                <strong className="gold-text">{label}</strong>
                <button className="btn-link" onClick={() => setPicked([])}>
                  Clear
                </button>
              </div>
              {ready && longest > 1 && (
                <label className="toggle-row">
                  <input type="checkbox" checked={splitOn} onChange={(e) => setSplit(e.target.checked)} />
                  <span>
                    Learn verse by verse ({chosen.length} separate verses){longest > 3 && ' — recommended'}
                  </span>
                </label>
              )}
              {!ready && !pasted && (pastedId ? <PasteText key={pastedId} id={pastedId} tr={tr} saveLabel="Use this text" /> : <p className="small-print">Choose verses next to each other to paste them as one passage.</p>)}
              {(ready || pasted) && (
                <div className="pick-actions">
                  <button className="btn btn-gold" onClick={() => add(true)}>
                    Add & begin
                  </button>
                  <button className="btn btn-ghost" onClick={() => add(false)}>
                    Add
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}
