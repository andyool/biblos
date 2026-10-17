import { useEffect, useMemo, useRef, useState } from 'react';
import { STOP, splitPunct } from '../lib/text.js';
import { play } from '../lib/sound.js';
import { canListen, listen, sameWord } from '../lib/listen.js';
import { toast } from '../lib/ui.js';
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
 * The heart of Biblos: recall a verse word by word by typing only first letters, or by
 * saying it aloud. Three misses on a word reveal it.
 * Also used for joins between verses (step.type 'link'), with the tokens on the step.
 */
export default function LettersStep({ step, tokens, locked, onComplete }) {
  const { start, end, hint } = step;
  const visible = useMemo(() => new Set(step.visible || []), [step]);
  const [cur, setCur] = useState(start);
  const [marks, setMarks] = useState({});
  const [flash, setFlash] = useState(null);
  const [wordFlash, setWordFlash] = useState(null);
  const [listening, setListening] = useState(false);
  const curRef = useRef(start);
  const misses = useRef({});
  const mistakes = useRef(0);
  const okCount = useRef(0);
  const done = useRef(false);
  const currentEl = useRef(null);
  const stopListening = useRef(null);
  const heardUpTo = useRef(0);
  const digits = useMemo(() => tokens.slice(start, end + 1).some((t) => /\d/.test(t.f)), [tokens, start, end]);

  const advance = (i, kind, credit = kind === 'ok') => {
    setMarks((m) => ({ ...m, [i]: kind }));
    if (credit) okCount.current += 1;
    const next = i + 1;
    curRef.current = next;
    setCur(next);
    if (next > end && !done.current) {
      done.current = true;
      stopListening.current?.();
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

  // Words heard so far. The last may still change while you speak, so it waits.
  const hear = (words, final) => {
    const usable = final ? words.length : words.length - 1;
    while (heardUpTo.current < usable && !done.current) {
      const w = words[heardUpTo.current];
      heardUpTo.current += 1;
      const i = curRef.current;
      // The word expected, or one a little further on if the recogniser missed one.
      const ahead = [0, 1, 2].find((k) => i + k <= end && (k === 0 || !STOP.has(tokens[i + k].n)) && sameWord(w, tokens[i + k].n));
      if (ahead === undefined) continue;
      for (let k = 0; k < ahead; k += 1) {
        // Little words are often lost by the recogniser, so they cost nothing.
        if (STOP.has(tokens[i + k].n)) {
          advance(i + k, 'ok', false);
        } else {
          mistakes.current += 1;
          advance(i + k, 'miss');
        }
      }
      play('tick');
      advance(i + ahead, 'ok');
    }
  };
  const hearRef = useRef(hear);
  hearRef.current = hear;

  const toggleListening = () => {
    if (listening) {
      stopListening.current?.();
      return;
    }
    heardUpTo.current = 0;
    setListening(true);
    stopListening.current = listen({
      onWords: (words, final) => hearRef.current(words, final),
      onEnd: () => {
        stopListening.current = null;
        setListening(false);
      },
      onError: (error) => {
        if (error === 'not-allowed' || error === 'service-not-allowed') toast('Biblos can’t use the microphone here. Type the first letters instead.', 'mic');
        else if (error === 'no-speech') toast('Nothing was heard. Tap “Say it” and try again.', 'mic');
      },
    });
  };

  useEffect(() => () => stopListening.current?.(), []);

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
      <p className="ex-kicker">{step.kicker || PROMPTS[hint]}</p>
      <h3 className="ex-ref gold-text">{step.ref || formatRef(step.verseId)}</h3>
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
                    {' '}
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
        <span className="letters-actions">
          {canListen() && (
            <button className={`btn-link ${listening ? 'is-listening' : ''}`} onClick={toggleListening} disabled={locked || remaining === 0} aria-pressed={listening}>
              <Glyph name="mic" size={18} /> {listening ? 'Listening…' : 'Say it'}
            </button>
          )}
          <button className="btn-link" onClick={reveal} disabled={locked || remaining === 0}>
            <Glyph name="eye" size={18} /> Show word
          </button>
        </span>
      </div>
      <Keyboard onKey={press} digits={digits} disabled={locked || remaining === 0} flash={flash} />
    </div>
  );
}
