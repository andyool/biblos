import { useEffect, useState } from 'react';
import { VerseCard } from '../components/VerseText.jsx';
import Glyph from '../components/Glyph.jsx';
import { canSpeak, speak, stopSpeaking } from '../lib/speech.js';
import { formatRef } from '../data/books.js';

export default function ReadStep({ step, tokens, tr, onComplete }) {
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => stopSpeaking, []);

  const listen = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    speak(`${formatRef(step.verseId).replace(':', ', verse ')}. ${tokens.map((t) => t.w).join(' ')}`, { onEnd: () => setSpeaking(false) });
  };

  return (
    <div className="ex ex-read">
      <p className="ex-kicker">{step.intro ? 'A new verse to sow' : 'Read it once more'}</p>
      <VerseCard id={step.verseId} tr={tr} tokens={tokens} />
      <p className="ex-hint">Read it slowly — aloud if you can. Notice where each phrase begins.</p>
      <div className="ex-footer">
        {canSpeak() && (
          <button className={`btn btn-ghost btn-round ${speaking ? 'is-active' : ''}`} onClick={listen} aria-label={speaking ? 'Stop' : 'Listen'}>
            <Glyph name="speaker" size={22} />
          </button>
        )}
        <button className="btn btn-gold btn-wide" onClick={() => onComplete({ correct: 1, mistakes: 0 })}>
          I’ve read it
        </button>
      </div>
    </div>
  );
}
