import { useMemo, useRef, useState } from 'react';
import { shuffleMixed } from '../lib/text.js';
import { play } from '../lib/sound.js';
import { renderWord } from '../components/VerseText.jsx';
import { formatRef } from '../data/books.js';

export default function OrderStep({ step, tokens, locked, onComplete }) {
  const phrases = useMemo(() => step.groups.map((g) => g.map((i) => tokens[i].w).join(' ')), [step, tokens]);
  const order = useMemo(() => shuffleMixed(phrases.map((_, i) => i)), [phrases]);
  const [placed, setPlaced] = useState([]);
  const [shake, setShake] = useState(null);
  const mistakes = useRef(0);

  const tap = (i) => {
    if (locked || placed.includes(i)) return;
    if (phrases[i] === phrases[placed.length]) {
      const next = [...placed, i];
      setPlaced(next);
      play('tick');
      if (next.length === phrases.length) {
        setTimeout(() => onComplete({ correct: phrases.length, mistakes: mistakes.current }), 380);
      }
    } else {
      mistakes.current += 1;
      play('wrong');
      setShake(i);
      setTimeout(() => setShake(null), 450);
    }
  };

  return (
    <div className="ex ex-order">
      <p className="ex-kicker">Arrange the phrases</p>
      <h3 className="ex-ref gold-text">{formatRef(step.verseId)}</h3>
      <div className="built">
        {placed.map((i, n) => (
          <span key={n} className="built-phrase">
            {renderWord(phrases[i])}{' '}
          </span>
        ))}
        {placed.length < phrases.length && <span className="built-caret" />}
      </div>
      <div className="tiles tiles-phrases">
        {order.map((i) => (
          <button key={i} className={`tile tile-phrase ${placed.includes(i) ? 'is-used' : ''} ${shake === i ? 'is-wrong' : ''}`} onClick={() => tap(i)} disabled={placed.includes(i)}>
            {renderWord(phrases[i])}
          </button>
        ))}
      </div>
    </div>
  );
}
