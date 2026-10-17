import { useRef, useState } from 'react';
import { play } from '../lib/sound.js';
import { renderWord } from '../components/VerseText.jsx';
import { formatRef } from '../data/books.js';
import { useStore } from '../lib/store.js';
import { Frame } from '../components/Ornaments.jsx';

/**
 * From the reference: only the reference is given — how does the verse begin? Beside the
 * right opening stand other verses' openings and one with a slip. Being asked "do you know
 * John 3:16?" is how a verse is most often called on.
 */
export default function OpeningStep({ step, locked, onComplete }) {
  const frame = useStore((s) => s.settings.frame);
  const [wrong, setWrong] = useState([]);
  const [done, setDone] = useState(false);
  const missed = useRef([]);
  const right = step.options.find((o) => o.ok);

  const choose = (k) => {
    const opt = step.options[k];
    if (locked || done || wrong.includes(k)) return;
    if (opt.ok) {
      setDone(true);
      play('correct');
      setTimeout(() => onComplete({ correct: 1, mistakes: wrong.length, missed: missed.current }), 650);
    } else {
      if (opt.miss != null) missed.current.push(opt.miss);
      setWrong((w) => [...w, k]);
      play('wrong');
    }
  };

  return (
    <div className="ex ex-opening">
      <p className="ex-kicker">How does it begin?</p>
      <Frame variant={frame} className="verse-card opening-card">
        <div className="opening-ref gold-text">{formatRef(step.verseId)}</div>
        <p className={`verse-text opening-text ${done ? 'is-shown' : ''}`}>{done ? <>“{renderWord(right.text)}{step.more ? ' …' : '”'}</> : '“ … ”'}</p>
      </Frame>
      <div className="choices choices-list choices-phrases">
        {step.options.map((opt, k) => (
          <button key={k} className={`choice ${wrong.includes(k) ? 'is-wrong' : ''} ${done && opt.ok ? 'is-right' : ''}`} onClick={() => choose(k)} disabled={wrong.includes(k)}>
            {renderWord(opt.text)} …
          </button>
        ))}
      </div>
    </div>
  );
}
