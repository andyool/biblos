import { useMemo, useRef, useState } from 'react';
import { shuffleMixed } from '../lib/text.js';
import { play } from '../lib/sound.js';
import { pop } from '../lib/fx.js';
import { renderWord } from '../components/VerseText.jsx';
import { formatRef } from '../data/books.js';

/**
 * Pair up: each phrase is cut in two. The beginnings stand in order on the left, the endings
 * are shuffled on the right; join each beginning to its ending. Binds the words of each
 * phrase together and walks the verse in order.
 */
export default function PairsStep({ step, locked, onComplete }) {
  const { pairs } = step;
  const tails = useMemo(() => shuffleMixed(pairs.map((_, i) => i)), [pairs]);
  const [head, setHead] = useState(null);
  const [tail, setTail] = useState(null);
  const [matched, setMatched] = useState({}); // head index → tail index
  const [shake, setShake] = useState(null);
  const mistakes = useRef(0);
  const missed = useRef([]);
  const done = useRef(false);
  const tailUsed = new Set(Object.values(matched));

  // Two beginnings may read the same ("and the"): either of their endings is right.
  const fits = (h, t) => h === t || pairs[h].head === pairs[t].head;

  const join = (h, t) => {
    setHead(null);
    setTail(null);
    if (!fits(h, t)) {
      mistakes.current += 1;
      missed.current.push(pairs[h].at);
      play('wrong');
      setShake({ h, t });
      setTimeout(() => setShake(null), 450);
      return;
    }
    const next = { ...matched, [h]: t };
    setMatched(next);
    play('tick');
    pop();
    if (Object.keys(next).length === pairs.length && !done.current) {
      done.current = true;
      setTimeout(() => onComplete({ correct: pairs.length, mistakes: mistakes.current, missed: missed.current }), 420);
    }
  };

  const pickHead = (h) => {
    if (locked || matched[h] !== undefined) return;
    play('tap');
    if (tail !== null) join(h, tail);
    else setHead(h === head ? null : h);
  };

  const pickTail = (t) => {
    if (locked || tailUsed.has(t)) return;
    play('tap');
    if (head !== null) join(head, t);
    else setTail(t === tail ? null : t);
  };

  return (
    <div className="ex ex-pairs">
      <p className="ex-kicker">Join each beginning to its ending</p>
      <h3 className="ex-ref gold-text">{formatRef(step.verseId)}</h3>
      <div className="pairs-grid">
        <div className="pairs-col">
          {pairs.map((p, h) => (
            <button
              key={h}
              className={`pair-card is-head ${head === h ? 'is-picked' : ''} ${matched[h] !== undefined ? 'is-matched' : ''} ${shake?.h === h ? 'is-wrong' : ''}`}
              onClick={() => pickHead(h)}
              disabled={matched[h] !== undefined}
            >
              {renderWord(p.head)}
              {matched[h] !== undefined && <span className="pair-joined"> {renderWord(pairs[matched[h]].tail)}</span>}
            </button>
          ))}
        </div>
        <div className="pairs-col">
          {tails
            .filter((t) => !tailUsed.has(t))
            .map((t) => (
              <button key={t} className={`pair-card is-tail ${tail === t ? 'is-picked' : ''} ${shake?.t === t ? 'is-wrong' : ''}`} onClick={() => pickTail(t)}>
                {renderWord(pairs[t].tail)}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
