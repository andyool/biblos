import { useEffect, useRef, useState } from 'react';
import { splitPunct } from '../lib/text.js';
import { play } from '../lib/sound.js';
import { renderWord } from '../components/VerseText.jsx';
import Glyph from '../components/Glyph.jsx';
import Keyboard from './Keyboard.jsx';
import { formatRef } from '../data/books.js';

/** The part of a word shown once `count` of its letters have been typed (skipping apostrophes). */
function typedPart(core, count) {
  let seen = 0;
  let k = 0;
  while (k < core.length && seen < count) {
    if (/[\p{L}\p{N}]/u.test(core[k])) seen += 1;
    k += 1;
  }
  return core.slice(0, k);
}

/**
 * Write it out: a few key words are missing; type each one in full. Producing the whole word,
 * not only its first letter, fixes the words that carry the verse's meaning.
 */
export default function SpellStep({ step, tokens, locked, onComplete }) {
  const { targets } = step;
  const [k, setK] = useState(0); // which missing word
  const [pos, setPos] = useState(0); // letters typed of it
  const [doneWords, setDoneWords] = useState({}); // index → 'ok' | 'miss'
  const [flash, setFlash] = useState(null);
  const [wordFlash, setWordFlash] = useState(null);
  const state = useRef({ k: 0, pos: 0 });
  const misses = useRef(0); // wrong letters on the current letter
  const wordSlips = useRef(0);
  const mistakes = useRef(0);
  const correct = useRef(0); // letters right, so a long word with one slip still scores well
  const missed = useRef([]);
  const finished = useRef(false);

  const nextWord = (kind) => {
    const i = targets[state.current.k];
    setDoneWords((d) => ({ ...d, [i]: kind }));
    if (kind === 'miss' || wordSlips.current > 0) missed.current.push(i);
    const nk = state.current.k + 1;
    state.current = { k: nk, pos: 0 };
    wordSlips.current = 0;
    misses.current = 0;
    setK(nk);
    setPos(0);
    if (nk >= targets.length && !finished.current) {
      finished.current = true;
      setTimeout(() => onComplete({ correct: correct.current, mistakes: mistakes.current, missed: missed.current }), 480);
    }
  };

  const press = (ch) => {
    if (locked || finished.current) return;
    const { k: wk, pos: p } = state.current;
    const target = tokens[targets[wk]];
    if (!target) return;
    if (ch === target.n[p]) {
      correct.current += 1;
      play('tick');
      setFlash({ key: ch, kind: 'ok' });
      misses.current = 0;
      const np = p + 1;
      state.current = { k: wk, pos: np };
      setPos(np);
      if (np >= target.n.length) nextWord(wordSlips.current >= 3 ? 'miss' : 'ok');
    } else {
      mistakes.current += 1;
      misses.current += 1;
      wordSlips.current += 1;
      play('wrong');
      setFlash({ key: ch, kind: 'bad' });
      setWordFlash({ i: targets[wk], n: Date.now() });
      // Three misses on one letter: it is filled in.
      if (misses.current >= 3) {
        misses.current = 0;
        const np = p + 1;
        state.current = { k: wk, pos: np };
        setPos(np);
        if (np >= target.n.length) nextWord('miss');
      }
    }
  };

  const reveal = () => {
    if (locked || finished.current) return;
    mistakes.current += 1;
    nextWord('miss');
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^[a-z]$/i.test(e.key)) {
        e.preventDefault();
        press(e.key.toLowerCase());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const left = targets.length - k;

  return (
    <div className="ex ex-letters ex-spell">
      <p className="ex-kicker">Write the missing words in full</p>
      <h3 className="ex-ref gold-text">{formatRef(step.verseId)}</h3>
      <div className="letters-scroll">
        <p className={`verse-text ex-verse letters-verse ${tokens.length > 48 ? 'is-long' : ''}`}>
          {tokens.map((t) => {
            const n = targets.indexOf(t.i);
            if (n < 0) return <span key={t.i}>{renderWord(t.w)} </span>;
            const mark = doneWords[t.i];
            if (mark) {
              return (
                <span key={t.i} className={`word is-${mark}`}>
                  {renderWord(t.w)}{' '}
                </span>
              );
            }
            const [lead, core, trail] = splitPunct(t.w);
            const isCur = n === k;
            const typed = isCur ? typedPart(core, pos) : '';
            const shaking = wordFlash?.i === t.i;
            return (
              <span key={t.i}>
                {lead}
                <span key={shaking ? wordFlash.n : 's'} className={`spell-slot ${isCur ? 'is-next' : ''} ${shaking ? 'is-wrong' : ''}`}>
                  <span className="spell-typed">{renderWord(typed)}</span>
                  {Array.from({ length: Math.max(0, t.n.length - (isCur ? pos : 0)) }, (_, j) => (
                    <i key={j} className={j === 0 && isCur ? 'is-caret' : ''} />
                  ))}
                </span>
                {trail}{' '}
              </span>
            );
          })}
        </p>
      </div>
      <div className="letters-bar">
        <span className="letters-count">
          {left} word{left === 1 ? '' : 's'} to write
        </span>
        <button className="btn-link" onClick={reveal} disabled={locked || left === 0}>
          <Glyph name="eye" size={18} /> Show word
        </button>
      </div>
      <Keyboard onKey={press} disabled={locked || left === 0} flash={flash} />
    </div>
  );
}
