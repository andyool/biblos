import { useEffect } from 'react';
import { Laurel, Seal, Sparkles, Divider, LevelRing } from '../components/Ornaments.jsx';
import Glyph from '../components/Glyph.jsx';
import { play } from '../lib/sound.js';
import { LEVELS } from '../data/levels.js';
import { BOOK_BY_CODE, formatRef } from '../data/books.js';
import { whenText } from '../lib/dates.js';
import { BOOK_BONUS } from '../lib/actions.js';
import { useBack } from '../lib/nav.js';
import Woolly from '../components/Woolly.jsx';
import { cue } from '../mascot/bus.js';

function headline(summary) {
  if (summary.kind === 'reading') return summary.reading.bookDone ? 'The whole book!' : 'Well read';
  if (summary.changes.some((c) => c.to === 5 && c.from === 4)) return 'Hidden in your heart';
  if (summary.changes.some((c) => c.to === 4 && c.from === 3)) return 'It bears fruit!';
  if (summary.changes.some((c) => c.note === 'almost')) return 'Keep pressing on';
  if (summary.perfect) return 'Flawless';
  if (summary.kind === 'review') return 'Well tended';
  return 'Well done';
}

export default function LessonComplete({ summary, onDone, onMore, moreLabel }) {
  const levelled = summary.changes.filter((c) => c.to > c.from);
  useBack(onDone);
  useEffect(() => {
    play('complete');
    if (levelled.length) setTimeout(() => play('level'), 650);
    // Give the lamb a moment to appear, then react to how it went.
    const t = setTimeout(() => {
      if (summary.kind === 'reading') cue('readFinish', { bookDone: summary.reading.bookDone });
      else if (summary.changes.some((c) => c.note === 'almost')) cue('fail');
      else
        cue('pass', {
          mastered: levelled.some((c) => c.to >= 4),
          perfect: summary.perfect,
          rewarded: summary.earned.length > 0 || summary.goalReached,
          streak: summary.streakExtended,
        });
    }, 350);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="complete">
      <Sparkles />
      <div className="complete-hero">
        <Woolly size={168} listen base={summary.kind === 'reading' ? 'read' : 'idle'} className="complete-woolly" />
        <Laurel size={150}>
          <div className="complete-xp">
            <span className="complete-xp-num gold-text">+{summary.xp}</span>
            <span className="complete-xp-label">XP</span>
          </div>
        </Laurel>
        <h1 className="script-title gold-text">{headline(summary)}</h1>
        <Divider width={200} />
      </div>

      <div className="complete-stats">
        <div className="stat-tile">
          <Glyph name="target" size={20} />
          <strong>{Math.round(summary.accuracy * 100)}%</strong>
          <span>accuracy</span>
        </div>
        <div className="stat-tile">
          <Glyph name="coin" size={20} className="coin" />
          <strong>+{summary.talents}</strong>
          <span>talents</span>
        </div>
        <div className={`stat-tile ${summary.streakExtended ? 'is-glow' : ''}`}>
          <Glyph name="lamp" size={22} lit />
          <strong>{summary.streak}</strong>
          <span>day streak</span>
        </div>
      </div>

      <div className="complete-list">
        {summary.changes.map((c) => (
          <div key={c.id} className="complete-verse">
            <div className="complete-verse-medal">
              <LevelRing level={c.to} size={46} />
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
        {summary.reading?.bookDone && (
          <div className="complete-banner">
            <Glyph name="crown" size={20} /> You have read all of {BOOK_BY_CODE[summary.reading.book].name} — +{BOOK_BONUS} talents
          </div>
        )}
        {summary.goalReached && (
          <div className="complete-banner">
            <Glyph name="target" size={20} /> Daily goal reached — +5 talents
          </div>
        )}
      </div>

      {summary.earned.length > 0 && (
        <div className="complete-seals">
          <p className="ex-kicker">New seal{summary.earned.length > 1 ? 's' : ''}</p>
          <div className="complete-seals-row">
            {summary.earned.map((a) => (
              <div key={a.id} className="complete-seal">
                <Seal icon={a.icon} size={70} />
                <strong>{a.name}</strong>
                <small>+{a.reward} talents</small>
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
