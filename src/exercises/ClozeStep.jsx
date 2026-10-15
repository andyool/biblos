import { useState } from 'react';
import { splitPunct } from '../lib/text.js';
import { play } from '../lib/sound.js';
import { renderWord } from '../components/VerseText.jsx';
import { formatRef } from '../data/books.js';

export default function ClozeStep({ step, tokens, locked, onComplete }) {
  const [wrong, setWrong] = useState([]);
  const [done, setDone] = useState(false);

  const choose = (opt) => {
    if (locked || done || wrong.includes(opt.w)) return;
    if (opt.ok) {
      setDone(true);
      play('correct');
      setTimeout(() => onComplete({ correct: 1, mistakes: wrong.length }), 450);
    } else {
      setWrong((w) => [...w, opt.w]);
      play('wrong');
    }
  };

  return (
    <div className="ex ex-cloze">
      <p className="ex-kicker">Which word belongs here?</p>
      <h3 className="ex-ref gold-text">{formatRef(step.verseId)}</h3>
      <p className="verse-text ex-verse">
        {tokens.map((t) => {
          if (t.i !== step.target) return <span key={t.i}>{renderWord(t.w)} </span>;
          const [lead, core, trail] = splitPunct(t.w);
          return (
            <span key={t.i}>
              {lead}
              <span className={`blank ${done ? 'is-filled' : ''}`} style={{ minWidth: `${Math.max(2.2, core.length * 0.55)}em` }}>
                {done ? renderWord(core) : ' '}
              </span>
              {trail}{' '}
            </span>
          );
        })}
      </p>
      <div className="choices">
        {step.options.map((opt) => (
          <button
            key={opt.w}
            className={`choice ${wrong.includes(opt.w) ? 'is-wrong' : ''} ${done && opt.ok ? 'is-right' : ''}`}
            onClick={() => choose(opt)}
            disabled={wrong.includes(opt.w)}
          >
            {renderWord(opt.w)}
          </button>
        ))}
      </div>
    </div>
  );
}
