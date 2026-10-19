import { useMemo, useState } from 'react';
import { useStore } from '../lib/store.js';
import { useApp } from '../AppContext.js';
import Glyph from '../components/Glyph.jsx';
import { Divider, Frame } from '../components/Ornaments.jsx';
import { VerseText } from '../components/VerseText.jsx';
import { PathList } from '../sheets/PathsSheet.jsx';
import { useVerseText } from '../lib/hooks.js';
import { tokenize } from '../lib/text.js';
import { getText, joinVerses, useTextsVersion } from '../lib/texts.js';
import { freshness, isDue } from '../lib/srs.js';
import { dayKey } from '../lib/dates.js';
import { verseTr } from '../lib/lesson.js';
import { setActivePath } from '../lib/actions.js';
import { CURATED_IDS } from '../data/paths.js';
import { getTranslation } from '../data/translations.js';
import { useYouVersionReady } from '../lib/bible.js';
import { formatRef } from '../data/books.js';
import { LEVELS } from '../data/levels.js';
import Woolly from '../components/Woolly.jsx';

function verseOfTheDay() {
  const key = dayKey();
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CURATED_IDS[h % CURATED_IDS.length];
}

function VerseOfTheDay() {
  const chosen = useStore((s) => s.settings.translation);
  const ready = useYouVersionReady();
  // Until the NIV is connected, show the verse in the ESV rather than an empty card.
  const tr = getTranslation(chosen).source === 'yv' && !ready ? 'ESV' : chosen;
  const { openVerse } = useApp();
  const id = verseOfTheDay();
  const { entry, status } = useVerseText(tr, id);
  return (
    <Frame
      className="votd"
      size={36}
      onClick={() => openVerse(id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openVerse(id);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Verse of the day: ${formatRef(id)}`}
    >
      <p className="today-kicker">Verse of the day</p>
      {status === 'ready' ? (
        <VerseText tokens={tokenize(entry.verses)} dropCap compact />
      ) : status === 'error' ? (
        <p className="votd-ref-only">Tap to open {formatRef(id)}</p>
      ) : (
        <div className="loading-lines">
          <span />
          <span />
        </div>
      )}
      <p className="votd-ref gold-text">
        {formatRef(id)} <small>{tr}</small>
      </p>
    </Frame>
  );
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'learning', label: 'Learning' },
  { id: 'due', label: 'Needs tending' },
  { id: 'memorised', label: 'Memorised' },
];

export default function Library() {
  const state = useStore();
  useTextsVersion();
  const { openVerse, openSheet, go } = useApp();
  const [filter, setFilter] = useState('all');
  const now = Date.now();

  const mine = useMemo(() => {
    const list = Object.values(state.verses).filter((v) => v.level >= 1 || state.custom.includes(v.id));
    return list.sort((a, b) => (b.lastPracticed || b.added || 0) - (a.lastPracticed || a.added || 0));
  }, [state.verses, state.custom]);

  const shown = mine.filter((v) => {
    if (filter === 'learning') return v.level < 4;
    if (filter === 'due') return isDue(v, now);
    if (filter === 'memorised') return v.level >= 4;
    return true;
  });

  return (
    <div className="screen library">
      <h1 className="screen-title">
        <span className="gold-text">My Verses</span>
      </h1>
      <Divider width={200} className="center" />

      <VerseOfTheDay />

      <button className="btn btn-ghost btn-block add-verse" onClick={() => openSheet({ type: 'add' })}>
        <Glyph name="plus" size={18} /> Add any verse
      </button>

      {mine.length > 0 && (
        <>
          <div className="filters" role="tablist">
            {FILTERS.map((f) => (
              <button key={f.id} role="tab" aria-selected={filter === f.id} className={`filter ${filter === f.id ? 'is-on' : ''}`} onClick={() => setFilter(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="verse-list">
            {shown.map((v) => {
              const tr = verseTr(state, v.id);
              const text = joinVerses(getText(tr, v.id));
              const fresh = freshness(v, now);
              const due = isDue(v, now);
              return (
                <button key={v.id} className={`verse-row ${due ? 'is-due' : ''}`} onClick={() => openVerse(v.id)}>
                  <span className={`verse-row-icon level-${v.level}`}>
                    <Glyph name={LEVELS[Math.max(1, v.level)].icon} size={20} />
                  </span>
                  <span className="verse-row-text">
                    <strong>
                      {formatRef(v.id)} <small>{tr}</small>
                    </strong>
                    <span className="verse-row-snippet">{text ? text.replace(/\bLORD\b/g, 'Lord') : 'Tap to load'}</span>
                    <span className="verse-row-meta">
                      {LEVELS[v.level].name}
                      {due && <em> · ready to review</em>}
                    </span>
                  </span>
                  {fresh !== null && v.level >= 4 && (
                    <span className="bars" aria-label="Memory strength">
                      {[0, 1, 2, 3].map((i) => (
                        <i key={i} className={fresh > i / 4 ? 'is-on' : ''} />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
            {!shown.length && <p className="empty">Nothing here yet.</p>}
          </div>
        </>
      )}

      {!mine.length && <Woolly size={120} act="look-around" className="empty-woolly" />}
      {!mine.length && (
        <p className="empty">
          The verses you learn will gather here.
          <br />
          Begin from a path, or add any verse you love.
        </p>
      )}

      <h2 className="section-heading">Paths</h2>
      <PathList
        active={state.settings.activePath}
        onPick={(id) => {
          setActivePath(id);
          go('path');
        }}
      />
    </div>
  );
}
