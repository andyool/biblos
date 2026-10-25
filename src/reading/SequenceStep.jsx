import { useMemo, useRef, useState } from 'react';
import { shuffleMixed } from '../lib/text.js';
import { play } from '../lib/sound.js';
import { pop } from '../lib/fx.js';
import { renderWord } from '../components/VerseText.jsx';

const COPY = {
  flow: { kicker: 'Follow the flow', hint: 'Tap these lines in the order they come in the passage.' },
  recap: { kicker: 'The story so far', hint: 'Before you read on, put the last few passages back in order.' },
};

/** Put lines from the passage (or earlier passages) back in order. */
export default function SequenceStep({ step, locked, onComplete }) {
  const order = useMemo(() => shuffleMixed(step.items.map((_, i) => i)), [step]);
  const [placed, setPlaced] = useState([]);
  const [shake, setShake] = useState(null);
  const mistakes = useRef(0);
  const copy = COPY[step.type];

  const tap = (i) => {
    if (locked || placed.includes(i)) return;
    if (i === placed.length) {
      const next = [...placed, i];
      setPlaced(next);
      play('tick');
      pop();
      if (next.length === step.items.length) setTimeout(() => onComplete({ correct: step.items.length, mistakes: mistakes.current }), 380);
    } else {
      mistakes.current += 1;
      play('wrong');
      setShake(i);
      setTimeout(() => setShake(null), 450);
    }
  };

  return (
    <div className="ex ex-sequence">
      <p className="ex-kicker">{copy.kicker}</p>
      <p className="ex-hint">{copy.hint}</p>
      <ol className="seq-built">
        {step.items.map((item, n) => (
          <li key={n} className={`seq-slot ${placed[n] !== undefined ? 'is-filled' : ''} ${n === placed.length ? 'is-current' : ''}`}>
            <span className="seq-num">{n + 1}</span>
            {placed[n] !== undefined ? (
              <span className="seq-text">
                {renderWord(step.items[placed[n]].text)} <small>{step.items[placed[n]].label}</small>
              </span>
            ) : (
              <span className="seq-text is-empty" />
            )}
          </li>
        ))}
      </ol>
      <div className="seq-tiles">
        {order.map((i) =>
          placed.includes(i) ? null : (
            <button key={i} className={`tile seq-tile ${shake === i ? 'is-wrong' : ''}`} onClick={() => tap(i)}>
              {renderWord(step.items[i].text)}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
