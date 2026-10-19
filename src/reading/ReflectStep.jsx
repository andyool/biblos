import { useState } from 'react';
import Woolly, { useWoolly } from '../components/Woolly.jsx';
import Glyph from '../components/Glyph.jsx';
import Sheet from '../components/Sheet.jsx';
import { renderWord } from '../components/VerseText.jsx';
import { useStore } from '../lib/store.js';
import { addCustomVerses } from '../lib/actions.js';
import { setText } from '../lib/texts.js';
import { toast } from '../lib/ui.js';
import { getTranslation } from '../data/translations.js';
import { cue } from '../mascot/bus.js';

/** Take it to heart: a question to ponder, a note to keep, and a verse to memorise. */
export default function ReflectStep({ step, session, onComplete }) {
  const woolly = useWoolly();
  const [writing, setWriting] = useState(false);
  const verses = useStore((s) => s.verses);
  const [note, setNote] = useState('');
  const [choosing, setChoosing] = useState(false);
  const { sec, tr } = session;
  const idOf = (v) => `${sec.book}.${sec.chapter}.${v.v}`;
  const kept = session.verses.filter((v) => verses[idOf(v)]);

  const memorise = (v) => {
    const id = idOf(v);
    setText(tr, id, { verses: [{ v: v.v, t: v.t }], src: getTranslation(tr).source });
    addCustomVerses([id], tr);
    toast(`Verse ${v.v} added to My Verses — learn it from the Path tab.`, 'heart');
    cue('verseAdded');
  };

  return (
    <div className="ex ex-reflect">
      <p className="ex-kicker">Take it to heart</p>
      <div className="reflect-card">
        {/* Woolly reflects with you, and writes while you do. */}
        {woolly ? <Woolly act={writing ? 'write' : 'reflect'} size={84} className="reflect-woolly" /> : <Glyph name="quill" size={24} />}
        <p>{step.prompt}</p>
      </div>
      <textarea
        className="input textarea reflect-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onFocus={() => setWriting(true)}
        onBlur={() => setWriting(false)}
        placeholder="Write a thought or a prayer, if you like. It stays on your phone."
        rows={4}
        maxLength={1000}
        autoCapitalize="sentences"
      />

      <button className="btn btn-ghost btn-block" onClick={() => setChoosing(true)}>
        <Glyph name="heart" size={18} /> Memorise a verse from it
      </button>
      {kept.length > 0 && (
        <p className="keep-verse-note">
          <Glyph name="check" size={14} /> In My Verses: {kept.map((v) => `v. ${v.v}`).join(', ')}
        </p>
      )}

      <div className="ex-footer">
        <button className="btn btn-gold btn-block" onClick={() => onComplete({ correct: 0, mistakes: 0, note: note.trim() || undefined })}>
          Finish reading
        </button>
      </div>

      {choosing && (
        <Sheet title="Memorise a verse" onClose={() => setChoosing(false)} className="verse-pick-sheet" woolly="heart">
          <p className="small-print">Read through and tap the verse you would like to learn by heart. It goes into My Verses, ready on the Path tab.</p>
          <div className="verse-pick-list">
            {session.verses.map((v) => {
              const isKept = Boolean(verses[idOf(v)]);
              return (
                <button key={v.v} className={`verse-pick ${isKept ? 'is-kept' : ''}`} onClick={() => !isKept && memorise(v)} aria-pressed={isKept}>
                  <span className="verse-pick-num">{v.v}</span>
                  <span className="verse-pick-text">{renderWord(v.t)}</span>
                  <span className="verse-pick-mark">{isKept ? <Glyph name="check" size={18} strokeWidth={2} /> : <Glyph name="plus" size={18} />}</span>
                </button>
              );
            })}
          </div>
          <div className="sheet-actions">
            <button className="btn btn-gold btn-block" onClick={() => setChoosing(false)}>
              Done
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
