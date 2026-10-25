import { useEffect, useState } from 'react';
import Glyph from '../components/Glyph.jsx';
import Passage from './Passage.jsx';
import { canSpeak, speak, stopSpeaking } from '../lib/speech.js';
import { sectionRef } from '../lib/reading.js';

/** A day's reading in a plan: its passages one after another, each under its heading. */
export default function PortionStep({ session, onComplete, onProgress }) {
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => stopSpeaking, []);

  const listen = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    speak(
      session.passages.map(({ sec, verses }) => `${sectionRef(sec).replace(':', ', verse ')}. ${verses.map((v) => v.t).join(' ')}`),
      { onEnd: () => setSpeaking(false) },
    );
  };

  // How far down the reading you are fills the bar at the top.
  const onScroll = (e) => {
    const el = e.currentTarget;
    const room = el.scrollHeight - el.clientHeight;
    onProgress?.(room > 0 ? Math.min(1, el.scrollTop / room) : 1);
  };

  return (
    <div className="ex ex-passage ex-portion" onScroll={onScroll}>
      {/* The reference is just above, under the progress bar. */}
      <header className="passage-head">
        <h2 className="passage-title">{session.title}</h2>
      </header>
      {session.intro && (
        <div className="context-card">
          <p className="context-kicker">About this book</p>
          <p>{session.intro}</p>
        </div>
      )}

      {session.passages.map(({ sec, verses }) => (
        <section key={sec.id} className="portion-part">
          <h3 className="portion-head">
            <span>{sec.title}</span>
            <small>{sectionRef(sec)}</small>
          </h3>
          <Passage verses={verses} />
        </section>
      ))}
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
