import { useEffect, useMemo, useState } from 'react';
import Woolly, { useWoolly } from '../components/Woolly.jsx';
import Glyph from '../components/Glyph.jsx';
import Sheet from '../components/Sheet.jsx';
import { renderWord } from '../components/VerseText.jsx';
import { KindPicker, Quotes, Room } from '../components/Journal.jsx';
import { useStore } from '../lib/store.js';
import { addCustomVerses } from '../lib/actions.js';
import { setText } from '../lib/texts.js';
import { toast } from '../lib/ui.js';
import { KIND, MAX_TEXT, entriesAbout, shortDate } from '../lib/journal.js';
import { getTranslation } from '../data/translations.js';
import { cue } from '../mascot/bus.js';
import { pop } from '../lib/fx.js';

// What you are writing stays on the phone until the reading is finished, so leaving part-way
// (or the app being closed) doesn't lose it: { text, kind, quotes: [verse numbers] }.
const draftKey = (id) => `biblos.draft.${id}`;

function readDraft(id) {
  try {
    const d = JSON.parse(localStorage.getItem(draftKey(id)));
    return d && typeof d.text === 'string' ? { text: d.text, kind: KIND[d.kind] ? d.kind : 'thought', quotes: Array.isArray(d.quotes) ? d.quotes : [] } : null;
  } catch {
    return null;
  }
}

function keepDraft(id, draft) {
  try {
    if (draft.text.trim() || draft.quotes.length || draft.kind !== 'thought') localStorage.setItem(draftKey(id), JSON.stringify(draft));
    else localStorage.removeItem(draftKey(id));
  } catch {
    /* storage unavailable: the words stay on screen */
  }
}

function dropDraft(id) {
  try {
    localStorage.removeItem(draftKey(id));
  } catch {
    /* storage unavailable */
  }
}

/** Tap verses of the passage to choose them. */
function VersePicker({ title, note, verses, isOn, onPick, onClose, woolly }) {
  return (
    <Sheet title={title} onClose={onClose} className="verse-pick-sheet" woolly={woolly}>
      <p className="small-print">{note}</p>
      <div className="verse-pick-list">
        {verses.map((v) => {
          const on = isOn(v);
          return (
            <button key={v.v} className={`verse-pick ${on ? 'is-on' : ''}`} onClick={() => onPick(v)} aria-pressed={on}>
              <span className="verse-pick-num">{v.v}</span>
              <span className="verse-pick-text">{renderWord(v.t)}</span>
              <span className="verse-pick-mark">{on ? <Glyph name="check" size={18} strokeWidth={2} /> : <Glyph name="plus" size={18} />}</span>
            </button>
          );
        })}
      </div>
      <div className="sheet-actions">
        <button className="btn btn-gold btn-block" onClick={onClose}>
          Done
        </button>
      </div>
    </Sheet>
  );
}

/** Take it to heart: a question to ponder, a note to keep, and a verse to memorise. */
export default function ReflectStep({ step, session, onComplete }) {
  const woolly = useWoolly();
  const [writing, setWriting] = useState(false);
  const verses = useStore((s) => s.verses);
  const journal = useStore((s) => s.journal);
  const { sec, tr } = session;
  const [draft, setDraft] = useState(() => readDraft(sec.id) || { text: '', kind: 'thought', quotes: [] });
  const [choosing, setChoosing] = useState(null); // 'memorise' | 'quote'
  const idOf = (v) => `${sec.book}.${sec.chapter}.${v.v}`;
  const kept = session.verses.filter((v) => verses[idOf(v)]);
  // The last time you wrote about this passage, if you have read it before.
  const before = useMemo(() => entriesAbout(journal, sec.id)[0], [journal, sec.id]);
  const quotes = session.verses.filter((v) => draft.quotes.includes(v.v)).map((v) => ({ v: v.v, t: v.t }));

  const change = (patch) => setDraft((d) => ({ ...d, ...patch }));
  useEffect(() => keepDraft(sec.id, draft), [sec.id, draft]);

  const memorise = (v) => {
    const id = idOf(v);
    if (verses[id]) return;
    setText(tr, id, { verses: [{ v: v.v, t: v.t }], src: getTranslation(tr).source });
    addCustomVerses([id], tr);
    toast(`Verse ${v.v} added to My Verses — learn it from the Path tab.`, 'heart');
    pop();
    cue('verseAdded');
  };
  const quote = (v) => change({ quotes: draft.quotes.includes(v.v) ? draft.quotes.filter((n) => n !== v.v) : [...draft.quotes, v.v].sort((a, b) => a - b) });

  const finish = () => {
    const text = draft.text.trim();
    dropDraft(sec.id);
    onComplete({ correct: 0, mistakes: 0, note: text ? { text, kind: draft.kind, quotes } : undefined });
  };

  return (
    <div className="ex ex-reflect">
      <p className="ex-kicker">Take it to heart</p>
      <div className="reflect-card">
        {/* Woolly reflects with you (or prays), and writes while you do. */}
        {woolly ? <Woolly act={writing ? 'write' : draft.kind === 'prayer' ? 'pray' : 'reflect'} size={84} className="reflect-woolly" /> : <Glyph name="quill" size={24} />}
        <p>{step.prompt}</p>
      </div>

      {before && (
        <details className="journal-before">
          <summary>
            <Glyph name="quill" size={14} /> Last time you wrote · {shortDate(before.created)}
          </summary>
          <p>{before.text}</p>
        </details>
      )}

      <KindPicker value={draft.kind} onChange={(kind) => change({ kind })} />
      <textarea
        className="input textarea reflect-note"
        value={draft.text}
        onChange={(e) => change({ text: e.target.value })}
        onFocus={() => setWriting(true)}
        onBlur={() => setWriting(false)}
        placeholder={KIND[draft.kind].placeholder}
        aria-label="Your note"
        rows={4}
        maxLength={MAX_TEXT}
        autoCapitalize="sentences"
      />
      <Room text={draft.text} />
      <Quotes entry={{ passage: sec.id, quotes, tr }} onRemove={(n) => change({ quotes: draft.quotes.filter((q) => q !== n) })} />

      <div className="sheet-actions-row reflect-actions">
        <button className="btn btn-ghost btn-small" onClick={() => setChoosing('quote')}>
          <Glyph name="quill" size={16} /> Quote a verse in your note
        </button>
        <button className="btn btn-ghost btn-small" onClick={() => setChoosing('memorise')}>
          <Glyph name="heart" size={16} /> Memorise a verse from it
        </button>
      </div>
      {kept.length > 0 && (
        <p className="keep-verse-note">
          <Glyph name="check" size={14} /> In My Verses: {kept.map((v) => `v. ${v.v}`).join(', ')}
        </p>
      )}

      <div className="ex-footer">
        <button className="btn btn-gold btn-block" onClick={finish}>
          Finish reading
        </button>
        {draft.text.trim() && <p className="reflect-saves">It goes into your journal, with the question.</p>}
      </div>

      {choosing === 'memorise' && (
        <VersePicker
          title="Memorise a verse"
          note="Tap a verse to learn it by heart. It goes into My Verses."
          verses={session.verses}
          isOn={(v) => Boolean(verses[idOf(v)])}
          onPick={memorise}
          onClose={() => setChoosing(null)}
          woolly="heart"
        />
      )}
      {choosing === 'quote' && (
        <VersePicker
          title="Quote a verse"
          note="Tap the verses you are writing about. They are kept with your note."
          verses={session.verses}
          isOn={(v) => draft.quotes.includes(v.v)}
          onPick={quote}
          onClose={() => setChoosing(null)}
          woolly="write"
        />
      )}
    </div>
  );
}
