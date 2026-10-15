import { useState } from 'react';
import Glyph from '../components/Glyph.jsx';
import { renderWord } from '../components/VerseText.jsx';
import { useStore } from '../lib/store.js';
import { addCustomVerses } from '../lib/actions.js';
import { setText } from '../lib/texts.js';
import { toast } from '../lib/ui.js';
import { getTranslation } from '../data/translations.js';

/** Take it to heart: a question to ponder, a note to keep, and a verse to memorise. */
export default function ReflectStep({ step, session, onComplete }) {
  const verses = useStore((s) => s.verses);
  const [note, setNote] = useState('');
  const [picked, setPicked] = useState(null);
  const { sec, tr } = session;
  const chosen = session.verses.find((v) => v.v === picked);
  const chosenId = chosen ? `${sec.book}.${sec.chapter}.${chosen.v}` : null;
  const kept = chosenId && verses[chosenId];

  const memorise = () => {
    setText(tr, chosenId, { verses: [{ v: chosen.v, t: chosen.t }], src: getTranslation(tr).source });
    addCustomVerses([chosenId], tr);
    toast('Added to My Verses — learn it from the Path tab.', 'heart');
  };

  return (
    <div className="ex ex-reflect">
      <p className="ex-kicker">Take it to heart</p>
      <div className="reflect-card">
        <Glyph name="quill" size={24} />
        <p>{step.prompt}</p>
      </div>
      <textarea
        className="input textarea reflect-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Write a thought or a prayer, if you like. It stays on your phone."
        rows={4}
        maxLength={1000}
        autoCapitalize="sentences"
      />

      <div className="keep-verse">
        <p className="keep-verse-label">Memorise a verse from it?</p>
        <div className="verse-chips">
          {session.verses.map((v) => (
            <button key={v.v} className={`chip ${picked === v.v ? 'is-on' : ''}`} onClick={() => setPicked(picked === v.v ? null : v.v)}>
              {v.v}
            </button>
          ))}
        </div>
        {chosen && (
          <div className="keep-verse-preview">
            <p className="verse-text is-compact">{renderWord(chosen.t)}</p>
            {kept ? (
              <p className="small-print">
                <Glyph name="check" size={14} /> In My Verses
              </p>
            ) : (
              <button className="btn btn-ghost btn-small" onClick={memorise}>
                <Glyph name="plus" size={16} /> Add to My Verses
              </button>
            )}
          </div>
        )}
      </div>

      <div className="ex-footer">
        <button className="btn btn-gold btn-block" onClick={() => onComplete({ correct: 0, mistakes: 0, note: note.trim() || undefined })}>
          Finish reading
        </button>
      </div>
    </div>
  );
}
