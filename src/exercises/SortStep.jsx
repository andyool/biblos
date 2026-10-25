import { useRef, useState } from 'react';
import { play } from '../lib/sound.js';
import { pop } from '../lib/fx.js';
import { renderWord } from '../components/VerseText.jsx';
import { formatRef } from '../data/books.js';

/**
 * Verse sort: phrases from this verse and one like it, one at a time — which is it from?
 * Verses that share words blur together; setting them side by side keeps each distinct.
 */
export default function SortStep({ step, locked, onComplete }) {
  const { cards, sides } = step;
  const [at, setAt] = useState(0);
  const [wrong, setWrong] = useState(null);
  const [went, setWent] = useState(null);
  const [counts, setCounts] = useState(() => Object.fromEntries(sides.map((s) => [s, 0])));
  const mistakes = useRef(0);
  const missed = useRef([]);
  const card = cards[at];

  const choose = (ref) => {
    if (locked || went !== null || !card) return;
    if (ref !== card.ref) {
      mistakes.current += 1;
      if (card.at != null) missed.current.push(card.at);
      play('wrong');
      setWrong({ ref, n: Date.now() });
      return;
    }
    play('tick');
    pop();
    setWent(sides.indexOf(ref));
    setCounts((c) => ({ ...c, [ref]: c[ref] + 1 }));
    setTimeout(() => {
      setWent(null);
      setWrong(null);
      if (at === cards.length - 1) onComplete({ correct: cards.length, mistakes: mistakes.current, missed: missed.current });
      else setAt((a) => a + 1);
    }, 380);
  };

  return (
    <div className="ex ex-sort">
      <p className="ex-kicker">Which verse is it from?</p>
      <p className="sort-count">
        {Math.min(at + 1, cards.length)} of {cards.length}
      </p>
      <div className="sort-stage">
        {card && (
          <blockquote key={`${at}-${wrong?.n || 0}`} className={`quote-card sort-card ${went === 0 ? 'is-left' : went === 1 ? 'is-right' : ''} ${wrong ? 'is-wrong' : ''}`}>
            <p className="verse-text">… {renderWord(card.text)} …</p>
          </blockquote>
        )}
      </div>
      <div className="sort-sides">
        {sides.map((ref) => (
          <button key={wrong?.ref === ref ? `${ref}-${wrong.n}` : ref} className={`choice sort-side ${wrong?.ref === ref ? 'is-miss' : ''}`} onClick={() => choose(ref)} disabled={locked}>
            <span className="sort-ref">{formatRef(ref)}</span>
            <span className="sort-pile" aria-label={`${counts[ref]} sorted`}>
              {Array.from({ length: counts[ref] }, (_, k) => (
                <i key={k} />
              ))}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
