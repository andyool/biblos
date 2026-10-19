import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../lib/store.js';
import { useApp } from '../AppContext.js';
import { TopBar } from '../components/Chrome.jsx';
import Glyph from '../components/Glyph.jsx';
import { Divider, EmblemBadge, Frame } from '../components/Ornaments.jsx';
import { bookProgress, prefetchSection, readingTr, sectionRef, useBook } from '../lib/reading.js';
import { useYouVersionReady } from '../lib/bible.js';
import { carryOverReading, setReadingBook } from '../lib/actions.js';
import { BOOK_BY_CODE } from '../data/books.js';
import { getTranslation } from '../data/translations.js';
import { updateReady } from '../lib/update.js';
import { planProgress, planStatus } from '../lib/plans.js';
import { FIRST_BOOKS } from '../data/guides/index.js';
import Woolly from '../components/Woolly.jsx';

/** The reading plan you follow: how far through, and what is left for today. */
function PlanCard({ code, sections }) {
  const state = useStore();
  const { openSheet } = useApp();
  const p = planProgress(state);
  if (!p) return null;
  const pct = (n) => `${Math.min(100, (n / p.total) * 100)}%`;
  const verses = sections.reduce((sum, s) => sum + s.end - s.start + 1, 0);
  const perReading = sections.length ? verses / sections.length : 15;
  const readings = Math.max(1, Math.round(p.today / perReading));
  return (
    <div className="plan-card">
      <div className="plan-card-head">
        <Glyph name="calendar" size={22} />
        <strong>{p.plan.name}</strong>
        <button className="btn-link" onClick={() => openSheet({ type: 'plans' })}>
          Change
        </button>
      </div>
      <div className="plan-bar" role="img" aria-label={`${Math.round((p.read / p.total) * 100)}% read`}>
        <span className="plan-bar-done" style={{ width: pct(p.read) }} />
        {!p.finished && <i className="plan-bar-mark" style={{ left: pct(p.daily * p.day) }} />}
      </div>
      {p.finished ? (
        <p className="plan-status">Plan complete: every book read.</p>
      ) : (
        <>
          <p className="plan-status">
            Day {p.day} of {p.plan.days} · <em className={p.behind ? 'is-behind' : ''}>{planStatus(p)}</em>
          </p>
          <p className="plan-today">{p.today ? `Today: about ${readings} more reading${readings === 1 ? '' : 's'} (${p.today} verses)` : 'Today’s reading is done.'}</p>
        </>
      )}
      {p.book && p.book !== code && (
        <button className="btn btn-ghost btn-small" onClick={() => setReadingBook(p.book)}>
          Go on with {BOOK_BY_CODE[p.book].name}
        </button>
      )}
    </div>
  );
}

/** Ways in to a reading plan and to your journal. */
function ReadLinks() {
  const { openSheet } = useApp();
  const planned = useStore((s) => Boolean(s.reading.plan));
  const notes = useStore((s) => Object.values(s.reading.notes).filter((n) => n?.note).length);
  if (planned && !notes) return null;
  return (
    <div className="rows read-links">
      {!planned && (
        <button className="row" onClick={() => openSheet({ type: 'plans' })}>
          <Glyph name="calendar" size={20} />
          <span className="row-label">Follow a reading plan</span>
          <Glyph name="chevron" size={16} className="row-chev" />
        </button>
      )}
      {notes > 0 && (
        <button className="row" onClick={() => openSheet({ type: 'journal' })}>
          <Glyph name="quill" size={20} />
          <span className="row-label">Your journal</span>
          <span className="row-value">
            {notes} note{notes === 1 ? '' : 's'}
          </span>
          <Glyph name="chevron" size={16} className="row-chev" />
        </button>
      )}
    </div>
  );
}

function Welcome() {
  const { openSheet } = useApp();
  return (
    <>
      <h1 className="screen-title">
        <span className="gold-text">Read Through</span>
      </h1>
      <Divider width={200} className="center" />
      <Woolly size={130} listen act="read" className="read-woolly" />
      <p className="lead read-lead">
        Read the Bible in order, one passage at a time — for the meaning, not just the words. Each reading has a focus, a few questions and a moment to take it to heart.
      </p>
      <h2 className="section-heading">Where to begin</h2>
      <div className="path-list">
        {FIRST_BOOKS.map((s) => (
          <button key={s.code} className="path-item" onClick={() => setReadingBook(s.code)}>
            <EmblemBadge id="scroll" size={44} />
            <span className="path-item-text">
              <strong>{BOOK_BY_CODE[s.code].name}</strong>
              <small>{s.why}</small>
            </span>
            <Glyph name="chevron" size={18} />
          </button>
        ))}
      </div>
      <button className="btn btn-ghost btn-block read-choose" onClick={() => openSheet({ type: 'books' })}>
        <Glyph name="book" size={18} /> Choose any book
      </button>
      <ReadLinks />
    </>
  );
}

const chapterName = (code, chapter) => (code === 'PSA' ? `Psalm ${chapter}` : `Chapter ${chapter}`);

function ChapterMap({ code, sections, done, next, onSection }) {
  const chapters = useMemo(() => {
    const map = new Map();
    for (const s of sections) {
      if (!map.has(s.chapter)) map.set(s.chapter, []);
      map.get(s.chapter).push(s);
    }
    return [...map.entries()];
  }, [sections]);
  const [open, setOpen] = useState(() => new Set(next ? [next.chapter] : []));
  const toggle = (c) => setOpen((o) => new Set(o.has(c) ? [...o].filter((x) => x !== c) : [...o, c]));

  return (
    <div className="chapters">
      {chapters.map(([chapter, list]) => {
        const count = list.filter((s) => done[s.id]).length;
        const single = list.length === 1;
        const isOpen = !single && open.has(chapter);
        const hasNext = next && next.chapter === chapter;
        return (
          <div key={chapter} className={`chapter ${count === list.length ? 'is-done' : ''} ${hasNext ? 'is-next' : ''}`}>
            <button className="chapter-head" onClick={() => (single ? onSection(list[0]) : toggle(chapter))} aria-expanded={single ? undefined : isOpen}>
              <span className="chapter-num">{count === list.length ? <Glyph name="check" size={16} strokeWidth={2} /> : chapter}</span>
              <span className="chapter-text">
                <strong>{chapterName(code, chapter)}</strong>
                {single ? (
                  <small>{list[0].title}</small>
                ) : (
                  <span className="chapter-dots" aria-label={`${count} of ${list.length} read`}>
                    {list.map((s) => (
                      <i key={s.id} className={`${done[s.id] ? 'is-on' : ''} ${next?.id === s.id ? 'is-next' : ''}`} />
                    ))}
                  </span>
                )}
              </span>
              {hasNext && <span className="chapter-badge">Next</span>}
              <Glyph name={single ? 'chevron' : 'down'} size={16} className={isOpen ? 'is-flipped' : ''} />
            </button>
            {isOpen && (
              <div className="chapter-sections">
                {list.map((s) => (
                  <button key={s.id} className={`section-row ${done[s.id] ? 'is-done' : ''} ${next?.id === s.id ? 'is-next' : ''}`} onClick={() => onSection(s)}>
                    <span className="section-mark">{done[s.id] ? <Glyph name="check" size={14} strokeWidth={2} /> : null}</span>
                    <span className="section-text">
                      <strong>{s.title}</strong>
                      <small>{sectionRef(s)}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Read() {
  const state = useStore();
  const { openSheet, read } = useApp();
  const nivReady = useYouVersionReady();
  const code = state.reading.book;
  const tr = readingTr(state);
  const { ready, failed, retry, guide, sections } = useBook(code, tr);
  const progress = bookProgress(state, code, sections);
  const { next } = progress;
  const book = code ? BOOK_BY_CODE[code] : null;

  // Keep what was read before the book had its guide.
  useEffect(() => {
    if (ready) carryOverReading(code, sections);
  }, [ready, code, sections]);

  // Fetch the next passage quietly so it opens at once.
  useEffect(() => {
    if (ready && next) prefetchSection(tr, next);
  }, [ready, next?.id, tr]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!code) {
    return (
      <div className="screen read">
        <TopBar />
        <Welcome />
      </div>
    );
  }

  const chosen = getTranslation(state.settings.translation);
  const fallback = chosen.source === 'yv' && !nivReady;
  const pct = progress.total ? Math.round((progress.count / progress.total) * 100) : 0;

  return (
    <div className="screen read">
      <TopBar />
      {fallback && (
        <button className="hint-card is-action" onClick={() => openSheet({ type: 'niv' })}>
          <Glyph name="key" size={24} />
          <div>
            <strong>Reading in the {tr}</strong>
            <p>Connect the {chosen.id} to read in it — tap here.</p>
          </div>
          <Glyph name="chevron" size={18} />
        </button>
      )}
      {book.deutero && !chosen.catholic && (
        <div className="hint-card">
          <Glyph name="book" size={24} />
          <div>
            <strong>Reading in the {tr}</strong>
            <p>{book.name} is only in Catholic Bibles, so it is read in the {getTranslation(tr).name}, {getTranslation(tr).note}.</p>
          </div>
        </div>
      )}

      <Frame className="today" size={40}>
        <Woolly size={132} listen base={failed ? 'idle' : 'read'} intro={failed ? 'look-around' : undefined} key={failed ? 'failed' : 'ok'} className="today-woolly" />
        <p className="today-kicker">{progress.finished ? 'Book complete' : progress.count ? 'Continue reading' : `Begin ${book.name}`}</p>
        {!ready ? (
          failed ? (
            <>
              <p className="today-detail">The guide for {book.name} could not be loaded. Check your connection and try again.</p>
              {/* After an update, the old version's files may be gone: the new version has them. */}
              <button className="btn btn-ghost btn-block" onClick={() => (updateReady() ? window.location.reload() : retry())}>
                <Glyph name="refresh" size={18} /> Try again
              </button>
            </>
          ) : (
            <div className="loading-lines">
              <span />
              <span />
            </div>
          )
        ) : next ? (
          <>
            <h2 className="today-title gold-text">{next.title}</h2>
            <p className="today-detail">{sectionRef(next)}</p>
            <button className="btn btn-gold btn-block btn-shine" onClick={() => read(next)}>
              {progress.count ? 'Read on' : 'Begin'}
            </button>
            <p className="today-time">With questions on the meaning · {tr}</p>
          </>
        ) : (
          <>
            <h2 className="today-title gold-text">{book.name}, read through</h2>
            <p className="today-detail">Every passage is read. Choose your next book.</p>
            <button className="btn btn-gold btn-block" onClick={() => openSheet({ type: 'books' })}>
              Choose a book
            </button>
          </>
        )}
      </Frame>

      <PlanCard code={code} sections={sections} />
      <ReadLinks />

      <div className="path-head">
        <EmblemBadge id="scroll" size={46} />
        <div className="path-head-text">
          <h2>{book.name}</h2>
          <p>
            {ready && `${guide.tagline} · ${progress.count}/${progress.total} read`}
          </p>
        </div>
        <button className="btn btn-ghost btn-small" onClick={() => openSheet({ type: 'books' })}>
          Books
        </button>
      </div>
      {ready && (
        <div className="mini-bar is-wide read-bar" aria-label={`${pct}% of ${book.name} read`}>
          <span className="mini-bar-done" style={{ width: `${pct}%` }} />
        </div>
      )}
      {guide && progress.count === 0 && <p className="read-intro">{guide.intro}</p>}
      <Divider width={240} className="center" />

      {ready && <ChapterMap key={code} code={code} sections={sections} done={progress.done} next={next} onSection={(s) => openSheet({ type: 'section', id: s.id })} />}
    </div>
  );
}
