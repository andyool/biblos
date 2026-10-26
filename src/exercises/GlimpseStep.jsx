import { useEffect, useMemo, useRef, useState } from 'react';
import { bare, norm, shuffleMixed, splitPunct } from '../lib/text.js';
import { play } from '../lib/sound.js';
import { pop } from '../lib/fx.js';
import { renderWord } from '../components/VerseText.jsx';
import { formatRef } from '../data/books.js';
import { useStore } from '../lib/store.js';
import Glyph from '../components/Glyph.jsx';

/**
 * Look, cover, rebuild: each phrase shows for a few moments, then is covered and rebuilt from
 * memory with word tiles (one of them a look-alike). Holding a whole phrase in mind and
 * producing it again lays it down as one piece. A phrase that slipped away can be shown again.
 */
export default function GlimpseStep({ step, tokens, locked, onComplete }) {
  const { groups, lures } = step;
  const [round, setRound] = useState(0);
  const [covered, setCovered] = useState(false);
  const [filled, setFilled] = useState(0);
  const [used, setUsed] = useState([]);
  const [shake, setShake] = useState(null);
  const mistakes = useRef(0);
  const missed = useRef([]);
  const done = useRef(false);
  const group = groups[round];
  // Longer with larger text, which takes longer to read.
  const textScale = useStore((s) => s.settings.textSize) || 1;
  const lookMs = Math.round((1800 + 450 * group.length) * textScale);

  const tiles = useMemo(
    () =>
      shuffleMixed([
        ...group.map((i) => ({ id: `w${i}`, w: bare(tokens[i].w), n: tokens[i].n })),
        ...(lures[round] ? [{ id: 'lure', w: lures[round], n: norm(lures[round]) }] : []),
      ]),
    [group, lures, round, tokens],
  );

  // The phrase covers itself once the gold bar runs out.
  useEffect(() => {
    if (covered) return undefined;
    const t = setTimeout(() => setCovered(true), lookMs);
    return () => clearTimeout(t);
  }, [covered, lookMs]);

  const tap = (tile) => {
    if (locked || done.current || !covered || used.includes(tile.id) || filled >= group.length) return;
    const at = group[filled];
    if (tile.n !== tokens[at].n) {
      mistakes.current += 1;
      missed.current.push(at);
      play('wrong');
      setShake(tile.id);
      setTimeout(() => setShake(null), 450);
      return;
    }
    const next = filled + 1;
    setFilled(next);
    setUsed((u) => [...u, tile.id]);
    play('tick');
    pop();
    if (next < group.length) return;
    if (round === groups.length - 1) {
      done.current = true;
      const total = groups.reduce((a, g) => a + g.length, 0);
      setTimeout(() => onComplete({ correct: total, mistakes: mistakes.current, missed: missed.current }), 420);
    } else {
      setTimeout(() => {
        setRound((r) => r + 1);
        setCovered(false);
        setFilled(0);
        setUsed([]);
      }, 520);
    }
  };

  // Look again, and rebuild the phrase from its start.
  const showAgain = () => {
    setCovered(false);
    setFilled(0);
    setUsed([]);
  };

  const first = groups[0][0];
  const last = group[group.length - 1];

  return (
    <div className="ex ex-glimpse">
      <p className="ex-kicker">{covered ? 'Now rebuild it from memory' : 'Look closely, then it hides'}</p>
      <h3 className="ex-ref gold-text">{formatRef(step.verseId)}</h3>
      <p className={`verse-text ex-verse ${tokens.length > 48 ? 'is-long' : ''}`}>
        {tokens.map((t) => {
          if (t.i > last) return null;
          if (t.i < first) return <span key={t.i} className="ctx">{renderWord(t.w)} </span>;
          if (!group.includes(t.i)) return <span key={t.i}>{renderWord(t.w)} </span>;
          if (!covered) {
            return (
              <span key={t.i} className="glimpse-word">
                {renderWord(t.w)}{' '}
              </span>
            );
          }
          const [lead, core, trail] = splitPunct(t.w);
          const k = group.indexOf(t.i);
          const isFilled = k < filled;
          return (
            <span key={t.i}>
              {lead}
              <span className={`slot ${isFilled ? 'is-filled' : ''} ${k === filled ? 'is-next' : ''}`} style={isFilled ? undefined : { width: `${Math.max(1.6, core.length * 0.5)}em` }}>
                {isFilled ? renderWord(core) : ' '}
              </span>
              {isFilled ? trail : ''}{' '}
            </span>
          );
        })}
      </p>
      <div className="glimpse-progress" aria-hidden="true">
        {groups.map((g, k) => (
          <i key={k} className={k < round ? 'is-done' : k === round ? 'is-current' : ''} />
        ))}
      </div>
      {covered ? (
        <>
          <div className="tiles">
            {tiles.map((tile) => (
              <button key={tile.id} className={`tile ${used.includes(tile.id) ? 'is-used' : ''} ${shake === tile.id ? 'is-wrong' : ''}`} onClick={() => tap(tile)} disabled={used.includes(tile.id)}>
                {renderWord(tile.w)}
              </button>
            ))}
          </div>
          <button className="btn-link glimpse-again" onClick={showAgain} disabled={locked || filled >= group.length}>
            <Glyph name="eye" size={18} /> Show it again
          </button>
        </>
      ) : (
        <div className="glimpse-look">
          <div className="glimpse-timer" key={round}>
            <span style={{ '--drain': `${lookMs}ms` }} />
          </div>
          <button className="btn btn-ghost btn-block" onClick={() => setCovered(true)} disabled={locked}>
            I have it — cover it
          </button>
        </div>
      )}
    </div>
  );
}
