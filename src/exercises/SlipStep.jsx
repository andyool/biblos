import { useRef, useState } from 'react';
import { play } from '../lib/sound.js';
import { pop } from '../lib/fx.js';
import { splitPunct } from '../lib/text.js';
import { renderWord } from '../components/VerseText.jsx';
import Glyph from '../components/Glyph.jsx';
import { formatRef } from '../data/books.js';

/**
 * Spot the slip: the verse with a few words changed for near twins (shall for will, heart for
 * soul). Tap each one. Checking every word against memory is what keeps a verse exact.
 */
export default function SlipStep({ step, tokens, locked, onComplete }) {
  const slips = Object.keys(step.swaps).map(Number);
  const [found, setFound] = useState([]);
  const [shown, setShown] = useState([]);
  const [wrongAt, setWrongAt] = useState(null);
  const mistakes = useRef(0);
  const done = useRef(false);
  const left = slips.filter((i) => !found.includes(i) && !shown.includes(i));

  const finish = (nextFound, nextShown) => {
    if (done.current || nextFound.length + nextShown.length < slips.length) return;
    done.current = true;
    setTimeout(() => onComplete({ correct: nextFound.length, mistakes: mistakes.current, missed: nextShown }), 650);
  };

  const tap = (i) => {
    if (locked || done.current || found.includes(i) || shown.includes(i)) return;
    if (step.swaps[i] !== undefined) {
      const next = [...found, i];
      setFound(next);
      play('tick');
      pop();
      finish(next, shown);
    } else {
      mistakes.current += 1;
      play('wrong');
      setWrongAt({ i, n: Date.now() });
    }
  };

  const reveal = () => {
    if (locked || done.current || !left.length) return;
    mistakes.current += 1;
    const next = [...shown, left[0]];
    setShown(next);
    finish(found, next);
  };

  return (
    <div className="ex ex-slip">
      <p className="ex-kicker">Spot the {slips.length === 1 ? 'word that has slipped' : `${slips.length} words that have slipped`}</p>
      <h3 className="ex-ref gold-text">{formatRef(step.verseId)}</h3>
      <div className="letters-scroll">
        <p className={`verse-text ex-verse slip-verse ${tokens.length > 48 ? 'is-long' : ''}`}>
          {tokens.map((t) => {
            const swapped = step.swaps[t.i];
            const fixed = found.includes(t.i) || shown.includes(t.i);
            if (fixed) {
              const [lead, core, trail] = splitPunct(t.w);
              return (
                <span key={t.i} className={`slip-fixed ${shown.includes(t.i) ? 'is-shown' : ''}`}>
                  {lead}
                  <s>{renderWord(splitPunct(swapped)[1])}</s> <span className="slip-right">{renderWord(core)}</span>
                  {trail}{' '}
                </span>
              );
            }
            const shaking = wrongAt?.i === t.i;
            return (
              <span key={t.i}>
                <button key={shaking ? wrongAt.n : 'w'} type="button" className={`slip-word ${shaking ? 'is-wrong' : ''}`} onClick={() => tap(t.i)} disabled={locked}>
                  {renderWord(swapped ?? t.w)}
                </button>{' '}
              </span>
            );
          })}
        </p>
        <p className="ex-hint slip-hint">Read it through as you know it, and tap each word that isn’t as written.</p>
      </div>
      <div className="letters-bar">
        <span className="letters-count">
          {left.length ? `${left.length} to find` : 'All found'}
        </span>
        <button className="btn-link" onClick={reveal} disabled={locked || !left.length}>
          <Glyph name="eye" size={18} /> Show me one
        </button>
      </div>
    </div>
  );
}
