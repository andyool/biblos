import { useState } from 'react';
import { play } from '../lib/sound.js';
import { burst } from '../lib/fx.js';
import { renderWord } from '../components/VerseText.jsx';
import { formatRef } from '../data/books.js';

export default function ReferenceStep({ step, tokens, locked, onComplete }) {
  const [wrong, setWrong] = useState([]);
  const [done, setDone] = useState(false);
  const shown = tokens.slice(0, 22);

  const choose = (id) => {
    if (locked || done || wrong.includes(id)) return;
    if (id === step.verseId) {
      setDone(true);
      play('correct');
      burst();
      setTimeout(() => onComplete({ correct: 1, mistakes: wrong.length }), 450);
    } else {
      setWrong((w) => [...w, id]);
      play('wrong');
    }
  };

  return (
    <div className="ex ex-reference">
      <p className="ex-kicker">Where is it written?</p>
      <blockquote className="quote-card">
        <p className="verse-text">
          “{shown.map((t, i) => <span key={i}>{renderWord(t.w)}{i < shown.length - 1 ? ' ' : ''}</span>)}
          {tokens.length > shown.length ? ' …' : ''}”
        </p>
      </blockquote>
      <div className="choices choices-list">
        {step.options.map((id) => (
          <button key={id} className={`choice ${wrong.includes(id) ? 'is-wrong' : ''} ${done && id === step.verseId ? 'is-right' : ''}`} onClick={() => choose(id)} disabled={wrong.includes(id)}>
            {formatRef(id)}
          </button>
        ))}
      </div>
    </div>
  );
}
