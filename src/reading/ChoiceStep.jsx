import { useState } from 'react';
import { play } from '../lib/sound.js';
import { burst } from '../lib/fx.js';

const COPY = {
  question: { kicker: 'What does it mean?' },
  summary: { kicker: 'Sum it up', q: 'Which sentence best sums up this passage?' },
};

/** A question on the meaning, or choosing the summary that fits. */
export default function ChoiceStep({ step, locked, onComplete }) {
  const [wrong, setWrong] = useState([]);
  const [done, setDone] = useState(false);
  const copy = COPY[step.type];

  const choose = (i) => {
    const opt = step.options[i];
    if (locked || done || wrong.includes(i)) return;
    if (opt.ok) {
      setDone(true);
      play('correct');
      burst();
      setTimeout(() => onComplete({ correct: 1, mistakes: wrong.length }), 450);
    } else {
      setWrong((w) => [...w, i]);
      play('wrong');
    }
  };

  return (
    <div className="ex ex-choice">
      <p className="ex-kicker">{copy.kicker}</p>
      <h2 className="ex-question">{step.q || copy.q}</h2>
      <div className="choices choices-list choices-text">
        {step.options.map((opt, i) => (
          <button key={i} className={`choice ${wrong.includes(i) ? 'is-wrong' : ''} ${done && opt.ok ? 'is-right' : ''}`} onClick={() => choose(i)} disabled={wrong.includes(i)}>
            {opt.text}
          </button>
        ))}
      </div>
    </div>
  );
}
