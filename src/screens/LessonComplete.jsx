import { useEffect, useRef } from 'react';
import { Laurel, Seal, Divider, LevelRing } from '../components/Ornaments.jsx';
import Glyph from '../components/Glyph.jsx';
import { play } from '../lib/sound.js';
import { LEVELS } from '../data/levels.js';
import { BOOK_BY_CODE, formatRef } from '../data/books.js';
import { whenText } from '../lib/dates.js';
import { BOOK_BONUS } from '../lib/actions.js';
import { unlocksFor } from '../data/shop.js';
import { LevelProgress } from '../components/XpLevel.jsx';
import { useBack } from '../lib/nav.js';
import Woolly from '../components/Woolly.jsx';
import { cue } from '../mascot/bus.js';
import { dropSeals } from '../lib/sealDrop.js';
import { useApp } from '../AppContext.js';
import { useStore } from '../lib/store.js';
import { burst, glory, pop, useCountUp } from '../lib/fx.js';

function headline(summary) {
  if (summary.kind === 'reading') return summary.reading.bookDone ? 'The whole book!' : 'Well read';
  if (summary.changes.some((c) => c.to === 5 && c.from === 4)) return 'Hidden in your heart';
  if (summary.changes.some((c) => c.to === 4 && c.from === 3)) return 'It bears fruit!';
  if (summary.changes.some((c) => c.note === 'almost' || c.note === 'faded')) return 'Keep pressing on';
  if (summary.perfect) return 'Flawless';
  if (summary.kind === 'review') return 'Well tended';
  return 'Well done';
}

// When each part of the page is marked, in ms: the laurel first, then the lamp, each verse's new
// arcs (drawn one after another), the banners and the seals, so the gold runs down the page.
const LAUREL_AT = 150;
const LAMP_AT = 800;
const GROW_AT = 700;
const ARC_GAP = 180;
const VERSE_GAP = 420;
const BANNER_AT = 1100;
const SEAL_AT = 1300;
const SEAL_GAP = 240;
const FX = { pop, burst, glory };

/** Marks an element to be struck by a burst `ms` in (see the effect below), and times its CSS by it. */
const strike = (fx, ms, css = ms) => ({ 'data-fx': fx, 'data-fx-at': ms, style: { '--at': `${css}ms` } });

export default function LessonComplete({ summary, onDone, onMore, moreLabel }) {
  const { openSheet } = useApp();
  // What you wrote after the reading, while it is still in the journal.
  const entry = useStore((s) => s.journal[summary.reading?.entry]);
  const levelled = summary.changes.filter((c) => c.to > c.from);
  const growAt = Object.fromEntries(levelled.map((c, i) => [c.id, GROW_AT + i * VERSE_GAP]));
  const failed = summary.changes.some((c) => c.note === 'almost' || c.note === 'faded');
  // After the book's banner, when there is one.
  const goalAt = BANNER_AT + (summary.reading?.bookDone ? 500 : 0);
  const xp = useCountUp(summary.xp, { delay: 250, duration: 800 });
  const page = useRef(null);
  // The very first lesson or reading: all the XP there is came from it.
  const first = summary.totalXp === summary.xp;
  useBack(onDone);
  useEffect(() => {
    play('complete');
    if (levelled.length) setTimeout(() => play('level'), 650);
    // Give the lamb a moment to appear, then react to how it went.
    const t = setTimeout(() => {
      if (summary.kind === 'reading') cue('readFinish', { bookDone: summary.reading.bookDone });
      else if (failed) cue('fail');
      else
        cue('pass', {
          mastered: levelled.some((c) => c.to >= 4),
          perfect: summary.perfect,
          rewarded: summary.earned.length > 0 || summary.goalReached || !!summary.levelUp,
          streak: summary.streakExtended,
        });
    }, 350);
    // Each marked part of the page is struck in its turn.
    const timers = [...page.current.querySelectorAll('[data-fx]')].map((el) => setTimeout(() => FX[el.dataset.fx](el), Number(el.dataset.fxAt)));
    // Then each new seal comes down on the page (SealDrop), as its small one is pressed in.
    dropSeals(summary.earned, SEAL_AT + 250);
    return () => [t, ...timers].forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="complete" ref={page}>
      <div className="complete-hero">
        <Woolly size={168} listen base={summary.kind === 'reading' ? 'read' : 'idle'} className="complete-woolly" />
        {/* Not quite there: a little light, not the whole shower. */}
        <Laurel size={150} {...strike(failed ? 'burst' : 'glory', LAUREL_AT)}>
          <div className="complete-xp">
            <span className="complete-xp-num gold-text">+{xp}</span>
            <span className="complete-xp-label">XP</span>
          </div>
        </Laurel>
        <h1 className="script-title gold-text">{headline(summary)}</h1>
        <Divider width={200} />
      </div>

      <p className="complete-facts">
        {/* Just reading has nothing to be right or wrong about. */}
        {!summary.plain && (
          <span>
            <Glyph name="target" size={16} /> {Math.round(summary.accuracy * 100)}%
          </span>
        )}
        <span>
          <Glyph name="coin" size={16} className="coin" /> +{summary.talents}
        </span>
        <span className={summary.streakExtended ? 'is-glow' : ''} {...(summary.streakExtended && strike('pop', LAMP_AT + 120, LAMP_AT))}>
          <Glyph name="lamp" size={17} lit /> {summary.streak} day{summary.streak === 1 ? '' : 's'}
        </span>
      </p>

      {summary.levelUp && <LevelProgress xp={summary.xp} totalXp={summary.totalXp} levelUp={summary.levelUp} />}

      {/* The first time, a word on what was just earned (nothing is explained before it happens). */}
      {first && (
        <div className="complete-first">
          <p>
            <Glyph name="lamp" size={18} lit /> Your lamp is lit. Practise each day to keep your streak burning.
          </p>
          <p>
            <Glyph name="coin" size={18} className="coin" /> Talents buy new themes and frames in the Treasury.
          </p>
          <p>
            <Glyph name="target" size={18} /> The ring at the top fills up towards your daily goal.
          </p>
        </div>
      )}

      <div className="complete-list">
        {summary.changes.map((c) => (
          <div key={c.id} className="complete-verse">
            <div className="complete-verse-medal" {...(c.id in growAt && strike('pop', growAt[c.id] + (c.to - c.from - 1) * ARC_GAP + 300))}>
              <LevelRing level={c.to} size={46} grewFrom={c.id in growAt ? c.from : null} at={growAt[c.id]} gap={ARC_GAP} />
              <Glyph name={LEVELS[Math.max(1, c.to)].icon} size={18} />
            </div>
            <div className="complete-verse-text">
              <strong>{formatRef(c.id)}</strong>
              {c.to > c.from ? (
                <span className="gold-soft">
                  {LEVELS[c.from].name} → {LEVELS[c.to].name}
                </span>
              ) : c.note === 'rest' ? (
                <span>It has grown enough for one day. It can grow again tomorrow.</span>
              ) : c.note === 'almost' ? (
                <span>
                  Not quite {LEVELS[c.from + 1].name.toLowerCase()} yet — try this lesson again.
                </span>
              ) : c.note === 'faded' ? (
                <span>
                  It has faded since you last practised it, so it goes back to {LEVELS[c.to].name.toLowerCase()}. The next lesson is gentler.
                </span>
              ) : c.note === 'lapse' ? (
                <span>Slipping a little — we’ll bring it back tomorrow.</span>
              ) : (
                <span>{LEVELS[c.to].name}</span>
              )}
              {c.due && c.to >= 4 && <small>Next review {whenText(c.due)}</small>}
            </div>
          </div>
        ))}
        {summary.reading && (
          <div className="complete-verse">
            <div className="complete-verse-medal">
              <Glyph name="scroll" size={24} />
            </div>
            <div className="complete-verse-text">
              <strong>{summary.reading.title || summary.reading.ref}</strong>
              <span>{summary.reading.title ? summary.reading.ref : 'Read and reflected on'}</span>
            </div>
          </div>
        )}
        {entry && (
          <button className="complete-verse complete-journal" onClick={() => openSheet({ type: 'journalEntry', id: entry.id })}>
            <div className="complete-verse-medal">
              <Glyph name="quill" size={24} />
            </div>
            <div className="complete-verse-text">
              <strong>Saved to your journal</strong>
              <small>With its question. Tap to read it or change it.</small>
            </div>
            <Glyph name="chevron" size={16} className="row-chev" />
          </button>
        )}
        {summary.reading?.bookDone && (
          <div className="complete-banner" {...strike('burst', BANNER_AT + 200, BANNER_AT)}>
            <Glyph name="crown" size={20} /> You have read all of {BOOK_BY_CODE[summary.reading.book].name} — +{BOOK_BONUS} talents
          </div>
        )}
        {summary.goalReached && (
          <div className="complete-banner" {...strike('pop', goalAt + 200, goalAt)}>
            <Glyph name="target" size={20} /> Daily goal reached — +5 talents
          </div>
        )}
      </div>

      {summary.earned.length > 0 && (
        <div className="complete-seals">
          <p className="ex-kicker">New seal{summary.earned.length > 1 ? 's' : ''}</p>
          <div className="complete-seals-row">
            {summary.earned.map((a, i) => (
              <div key={a.id} className="complete-seal">
                {/* Struck as the wax is pressed down. */}
                <span className="complete-seal-press" {...strike('burst', SEAL_AT + i * SEAL_GAP + 300, SEAL_AT + i * SEAL_GAP)}>
                  <Seal id={a.id} icon={a.icon} size={70} />
                </span>
                <strong>{a.name}</strong>
                <small>+{a.reward} talents</small>
                {unlocksFor(a.id).map((u) => (
                  <small key={u} className="complete-seal-unlock">
                    + {u}
                  </small>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="complete-actions">
        <button className="btn btn-gold btn-block" onClick={onDone}>
          Continue
        </button>
        {onMore && (
          <button className="btn btn-ghost btn-block" onClick={onMore}>
            {moreLabel || 'One more'}
          </button>
        )}
      </div>
    </div>
  );
}
