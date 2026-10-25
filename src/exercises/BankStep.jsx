import { useMemo, useRef, useState } from 'react';
import { bare, norm, shuffleMixed, splitPunct } from '../lib/text.js';
import { play } from '../lib/sound.js';
import { pop } from '../lib/fx.js';
import { renderWord } from '../components/VerseText.jsx';
import { formatRef } from '../data/books.js';

export default function BankStep({ step, tokens, locked, onComplete }) {
  const { start, end } = step;
  const tiles = useMemo(
    () =>
      shuffleMixed([
        ...tokens.slice(start, end + 1).map((t) => ({ id: `w${t.i}`, w: bare(t.w), n: t.n })),
        ...step.distractors.map((w, k) => ({ id: `d${k}`, w, n: norm(w) })),
      ]),
    [step, tokens, start, end],
  );
  const [filled, setFilled] = useState(0);
  const [used, setUsed] = useState([]);
  const [shake, setShake] = useState(null);
  const mistakes = useRef(0);
  const total = end - start + 1;

  const tap = (tile) => {
    if (locked || used.includes(tile.id) || filled >= total) return;
    if (tile.n === tokens[start + filled].n) {
      const next = filled + 1;
      setFilled(next);
      setUsed((u) => [...u, tile.id]);
      play('tick');
      pop();
      if (next === total) setTimeout(() => onComplete({ correct: total, mistakes: mistakes.current }), 380);
    } else {
      mistakes.current += 1;
      play('wrong');
      setShake(tile.id);
      setTimeout(() => setShake(null), 450);
    }
  };

  return (
    <div className="ex ex-bank">
      <p className="ex-kicker">Fill in the missing words</p>
      <h3 className="ex-ref gold-text">{formatRef(step.verseId)}</h3>
      <p className={`verse-text ex-verse ${tokens.length > 48 ? 'is-long' : ''}`}>
        {tokens.map((t) => {
          if (t.i < start || t.i > end) return <span key={t.i} className="ctx">{renderWord(t.w)} </span>;
          const [lead, core, trail] = splitPunct(t.w);
          const isFilled = t.i < start + filled;
          const isNext = t.i === start + filled;
          return (
            <span key={t.i}>
              {lead}
              <span className={`slot ${isFilled ? 'is-filled' : ''} ${isNext ? 'is-next' : ''}`} style={isFilled ? undefined : { width: `${Math.max(1.6, core.length * 0.5)}em` }}>
                {isFilled ? renderWord(core) : ' '}
              </span>
              {isFilled ? trail : ''}{' '}
            </span>
          );
        })}
      </p>
      <div className="tiles">
        {tiles.map((tile) => (
          <button key={tile.id} className={`tile ${used.includes(tile.id) ? 'is-used' : ''} ${shake === tile.id ? 'is-wrong' : ''}`} onClick={() => tap(tile)} disabled={used.includes(tile.id)}>
            {renderWord(splitPunct(tile.w)[1] || tile.w)}
          </button>
        ))}
      </div>
    </div>
  );
}
