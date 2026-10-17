import { useEffect, useRef, useState } from 'react';
import { play } from '../lib/sound.js';
import { renderWord } from '../components/VerseText.jsx';
import { formatRef } from '../data/books.js';

/**
 * What comes next: the verse grows phrase by phrase, each chosen from near misses — the same
 * phrase with one word changed, or a phrase from further on. Each phrase becomes the cue for
 * the next, as when reciting.
 */
export default function ChainStep({ step, tokens, locked, onComplete }) {
  const { rounds } = step;
  const [round, setRound] = useState(0);
  const [wrong, setWrong] = useState([]);
  const [chosen, setChosen] = useState(null);
  const mistakes = useRef(0);
  const missed = useRef([]);
  const builtRef = useRef(null);
  const current = rounds[round];
  const begins = current.at === 0 && round === 0;

  useEffect(() => {
    builtRef.current?.scrollTo?.({ top: builtRef.current.scrollHeight, behavior: 'smooth' });
  }, [round]);

  const choose = (k) => {
    const opt = current.options[k];
    if (locked || chosen !== null || wrong.includes(k)) return;
    if (!opt.ok) {
      mistakes.current += 1;
      if (opt.miss != null) missed.current.push(opt.miss);
      setWrong((w) => [...w, k]);
      play('wrong');
      return;
    }
    setChosen(k);
    play('tick');
    setTimeout(() => {
      if (round === rounds.length - 1) {
        onComplete({ correct: rounds.length, mistakes: mistakes.current, missed: missed.current });
      } else {
        setRound((r) => r + 1);
        setWrong([]);
        setChosen(null);
      }
    }, 420);
  };

  const placed = rounds.slice(0, round + (chosen !== null ? 1 : 0)).map((r) => r.options.find((o) => o.ok).text);

  return (
    <div className="ex ex-chain">
      <p className="ex-kicker">{begins ? 'How does it begin?' : 'What comes next?'}</p>
      <h3 className="ex-ref gold-text">{formatRef(step.verseId)}</h3>
      <div className="built chain-built" ref={builtRef}>
        {tokens.slice(0, step.from).map((t) => (
          <span key={t.i} className="ctx">
            {renderWord(t.w)}{' '}
          </span>
        ))}
        {placed.map((text, n) => (
          <span key={n} className="built-phrase">
            {renderWord(text)}{' '}
          </span>
        ))}
        {chosen === null && <span className="built-caret" />}
      </div>
      <div className="choices choices-list choices-phrases" key={round}>
        {current.options.map((opt, k) => (
          <button key={k} className={`choice ${wrong.includes(k) ? 'is-wrong' : ''} ${chosen === k ? 'is-right' : ''}`} onClick={() => choose(k)} disabled={wrong.includes(k)}>
            {renderWord(opt.text)}
          </button>
        ))}
      </div>
    </div>
  );
}
