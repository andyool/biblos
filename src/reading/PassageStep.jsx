import { useEffect, useState } from 'react';
import Glyph from '../components/Glyph.jsx';
import Passage from './Passage.jsx';
import { canSpeak, speak, stopSpeaking } from '../lib/speech.js';

export default function PassageStep({ session, onComplete }) {
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => stopSpeaking, []);

  const listen = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    speak(`${session.ref.replace(':', ', verse ')}. ${session.verses.map((v) => v.t).join(' ')}`, { onEnd: () => setSpeaking(false) });
  };

  return (
    <div className="ex ex-passage">
      {session.intro && (
        <div className="context-card">
          <p className="context-kicker">About this book</p>
          <p>{session.intro}</p>
        </div>
      )}
      {session.previous?.text && (
        <div className="context-card">
          <p className="context-kicker">Previously · {session.previous.ref}</p>
          <p>{session.previous.text}</p>
        </div>
      )}
      <div className="look-card">
        <Glyph name="eye" size={20} />
        <p>{session.look}</p>
      </div>

      <header className="passage-head">
        <p className="passage-ref gold-text">{session.ref}</p>
        {session.title && <h2 className="passage-title">{session.title}</h2>}
      </header>
      <Passage verses={session.verses} />
      <p className="passage-tr">{session.tr}</p>

      <div className="ex-footer">
        {canSpeak() && (
          <button className={`btn btn-ghost btn-round ${speaking ? 'is-active' : ''}`} onClick={listen} aria-label={speaking ? 'Stop' : 'Listen'}>
            <Glyph name="speaker" size={22} />
          </button>
        )}
        <button
          className="btn btn-gold btn-wide"
          onClick={() => {
            stopSpeaking();
            onComplete({ correct: 0, mistakes: 0 });
          }}
        >
          I’ve read it
        </button>
      </div>
    </div>
  );
}
