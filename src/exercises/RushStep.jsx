import { useEffect, useMemo, useRef, useState } from 'react';
import { bare, norm, shuffleMixed, splitPunct } from '../lib/text.js';
import { play } from '../lib/sound.js';
import { pop } from '../lib/fx.js';
import { renderWord } from '../components/VerseText.jsx';
import Glyph from '../components/Glyph.jsx';
import { formatRef } from '../data/books.js';

// A little tilt and offset for each tile, so the field looks scattered.
const jitter = () => ({ '--tilt': `${(Math.random() * 7 - 3.5).toFixed(1)}deg`, '--lift': `${Math.round(Math.random() * 10 - 5)}px` });

/**
 * Word rush: the words lie scattered; tap them in order before the lamp burns low. A verse
 * known well comes quickly — speed is practice for fluency, not just accuracy.
 */
export default function RushStep({ step, tokens, locked, onComplete }) {
  const { start, end, seconds } = step;
  const total = end - start + 1;
  const tiles = useMemo(
    () =>
      shuffleMixed([
        ...tokens.slice(start, end + 1).map((t) => ({ id: `w${t.i}`, w: bare(t.w), n: t.n, style: jitter() })),
        ...step.lures.map((w, k) => ({ id: `l${k}`, w, n: norm(w), style: jitter() })),
      ]),
    [step, tokens, start, end],
  );
  const [began, setBegan] = useState(null);
  const [filled, setFilled] = useState(0);
  const [used, setUsed] = useState([]);
  const [shake, setShake] = useState(null);
  const [late, setLate] = useState(false);
  const mistakes = useRef(0);
  const missed = useRef([]);

  useEffect(() => {
    if (!began) return undefined;
    const t = setTimeout(() => setLate(true), seconds * 1000);
    return () => clearTimeout(t);
  }, [began, seconds]);

  const tap = (tile) => {
    if (locked || !began || used.includes(tile.id) || filled >= total) return;
    const at = start + filled;
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
    if (next === total) {
      const took = (Date.now() - began) / 1000;
      const pace = took <= seconds ? 1 : Math.max(0, 1 - (took - seconds) / seconds);
      const swift = took <= seconds && mistakes.current <= 1;
      setTimeout(() => onComplete({ correct: total, mistakes: mistakes.current, missed: missed.current, pace, bonus: swift ? 3 : 0, swift }), 420);
    }
  };

  return (
    <div className="ex ex-rush">
      <p className="ex-kicker">Tap the words in order — swiftly</p>
      <h3 className="ex-ref gold-text">{formatRef(step.verseId)}</h3>
      <div className={`rush-oil ${began ? 'is-burning' : ''} ${late ? 'is-out' : ''}`} aria-hidden="true">
        <Glyph name="lamp" size={18} lit={!late} />
        <span className="rush-oil-bar">
          <span style={{ animationDuration: `${seconds}s` }} />
        </span>
      </div>
      <p className={`verse-text ex-verse rush-verse ${tokens.length > 48 ? 'is-long' : ''}`}>
        {tokens.map((t) => {
          if (t.i < start || t.i > end) return <span key={t.i} className="ctx">{renderWord(t.w)} </span>;
          const [lead, core, trail] = splitPunct(t.w);
          const isFilled = t.i < start + filled;
          return (
            <span key={t.i}>
              {lead}
              <span className={`slot ${isFilled ? 'is-filled' : ''} ${t.i === start + filled && began ? 'is-next' : ''}`} style={isFilled ? undefined : { width: `${Math.max(1.3, core.length * 0.45)}em` }}>
                {isFilled ? renderWord(core) : ' '}
              </span>
              {isFilled ? trail : ''}{' '}
            </span>
          );
        })}
      </p>
      {began ? (
        <div className="tiles rush-field">
          {tiles.map((tile) => (
            <button key={tile.id} style={tile.style} className={`tile rush-tile ${used.includes(tile.id) ? 'is-used' : ''} ${shake === tile.id ? 'is-wrong' : ''}`} onClick={() => tap(tile)} disabled={used.includes(tile.id)}>
              {renderWord(tile.w)}
            </button>
          ))}
        </div>
      ) : (
        <div className="rush-start">
          <p className="ex-hint">
            {total} words in {seconds} seconds. Finish before the lamp burns low for a bonus.
          </p>
          <button
            className="btn btn-gold btn-block"
            onClick={() => {
              play('tap');
              setBegan(Date.now());
            }}
            disabled={locked}
          >
            Begin
          </button>
        </div>
      )}
      {late && filled < total && <p className="rush-late">The lamp is low — keep going</p>}
    </div>
  );
}
