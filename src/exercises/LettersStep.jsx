import { useEffect, useMemo, useRef, useState } from 'react';
import { splitPunct } from '../lib/text.js';
import { play } from '../lib/sound.js';
import { renderWord } from '../components/VerseText.jsx';
import Glyph from '../components/Glyph.jsx';
import Keyboard from './Keyboard.jsx';
import { formatRef } from '../data/books.js';

const PROMPTS = {
  faded: 'Type the first letter of each word',
  partial: 'Recall the hidden words — type each first letter',
  blank: 'Recite it from memory — type each first letter',
};

/**
 * The heart of Biblos: recall a verse word by word by typing only first letters.
 * Three misses on a word reveal it.
 */
export default function LettersStep({ step, tokens, locked, onComplete }) {
  const { start, end, hint } = step;
  const visible = useMemo(() => new Set(step.visible || []), [step]);
  const [cur, setCur] = useState(start);
  const [marks, setMarks] = useState({});
  const [flash, setFlash] = useState(null);
  const [wordFlash, setWordFlash] = useState(null);
  const curRef = useRef(start);
  const misses = useRef({});
  const mistakes = useRef(0);
  const okCount = useRef(0);
  const done = useRef(false);
  const currentEl = useRef(null);
  const digits = useMemo(() => tokens.slice(start, end + 1).some((t) => /\d/.test(t.f)), [tokens, start, end]);

  const advance = (i, kind) => {
    setMarks((m) => ({ ...m, [i]: kind }));
    if (kind === 'ok') okCount.current += 1;
    const next = i + 1;
    curRef.current = next;
    setCur(next);
    if (next > end && !done.current) {
      done.current = true;
      setTimeout(() => onComplete({ correct: okCount.current, mistakes: mistakes.current }), 420);
    }
  };

  const press = (ch) => {
    if (locked || done.current) return;
    const i = curRef.current;
    if (i > end) return;
    if (ch === tokens[i].f) {
      play('tick');
      setFlash({ key: ch, kind: 'ok' });
      advance(i, 'ok');
    } else {
      mistakes.current += 1;
      misses.current[i] = (misses.current[i] || 0) + 1;
      play('wrong');
      setFlash({ key: ch, kind: 'bad' });
      setWordFlash({ i, n: Date.now() });
      if (misses.current[i] >= 3) advance(i, 'miss');
    }
  };

  const reveal = () => {
    if (locked || done.current || curRef.current > end) return;
    mistakes.current += 1;
    advance(curRef.current, 'miss');
  };

  // Physical keyboards too.
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^[a-z0-9]$/i.test(e.key)) {
        e.preventDefault();
        press(e.key.toLowerCase());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    currentEl.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [cur]);

  const remaining = Math.max(0, end - cur + 1);

  return (
    <div className="ex ex-letters">
      <p className="ex-kicker">{PROMPTS[hint]}</p>
      <h3 className="ex-ref gold-text">{formatRef(step.verseId)}</h3>
      <div className="letters-scroll">
        <p className={`verse-text ex-verse letters-verse ${tokens.length > 48 ? 'is-long' : ''}`}>
          {tokens.map((t) => {
            if (t.i < start || t.i > end) return <span key={t.i} className="ctx">{renderWord(t.w)} </span>;
            const mark = marks[t.i];
            const isCur = t.i === cur;
            const [lead, core, trail] = splitPunct(t.w);
            if (mark) {
              return (
                <span key={t.i} className={`word is-${mark}`}>
                  {renderWord(t.w)}{' '}
                </span>
              );
            }
            const showFaint = hint === 'faded' || (hint === 'partial' && visible.has(t.i));
            const shaking = wordFlash?.i === t.i;
            return (
              <span key={t.i} ref={isCur ? currentEl : undefined}>
                {showFaint ? (
                  <span key={shaking ? wordFlash.n : 'w'} className={`word is-faint ${isCur ? 'is-current' : ''} ${shaking ? 'is-wrong' : ''}`}>
                    {renderWord(t.w)}
                  </span>
                ) : (
                  <span key={shaking ? wordFlash.n : 's'} className={`slot ${isCur ? 'is-next' : ''} ${shaking ? 'is-wrong' : ''}`} style={{ width: `${Math.max(1.3, (lead.length + core.length + trail.length) * 0.48)}em` }}>
                    {' '}
                  </span>
                )}{' '}
              </span>
            );
          })}
        </p>
      </div>
      <div className="letters-bar">
        <span className="letters-count">
          {remaining} word{remaining === 1 ? '' : 's'} to go
        </span>
        <button className="btn-link" onClick={reveal} disabled={locked || remaining === 0}>
          <Glyph name="eye" size={18} /> Show word
        </button>
      </div>
      <Keyboard onKey={press} digits={digits} disabled={locked || remaining === 0} flash={flash} />
    </div>
  );
}
