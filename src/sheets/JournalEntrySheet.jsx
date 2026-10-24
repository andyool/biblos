import { useEffect, useState } from 'react';
import Sheet from '../components/Sheet.jsx';
import Glyph from '../components/Glyph.jsx';
import { KindPicker, Quotes, Room } from '../components/Journal.jsx';
import { getState, useStore } from '../lib/store.js';
import { useApp } from '../AppContext.js';
import { addJournalEntry, deleteJournalEntry, fillJournalContext, restoreJournalEntry, updateJournalEntry } from '../lib/actions.js';
import { KIND, MAX_TEXT, announce, dateText, entryRef, entryText, fillLegacy, shortDate, suggestPrompt } from '../lib/journal.js';
import { readingTr, useBook } from '../lib/reading.js';
import { shareText } from '../lib/device.js';
import { ask, toast } from '../lib/ui.js';
import { cue, cueSoon } from '../mascot/bus.js';

// The parts of an entry that can be changed while writing it.
const formOf = (e) => ({
  kind: e.kind || 'thought',
  text: e.text || '',
  prompt: e.prompt || '',
  passage: e.passage || null,
  title: e.title || null,
  verse: e.verse || null,
  tr: e.tr || null,
  quotes: e.quotes || [],
});
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// Empty parts are left out of the entry.
const tidy = (fields) => Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v === '' || v === null || (Array.isArray(v) && !v.length) ? undefined : v]));

/** The question an entry answers: a reading's question, or what an entry of its own is on. */
function Question({ prompt, kicker, children }) {
  return (
    <div className="context-card journal-question">
      <p className="context-kicker">{kicker}</p>
      <p className="journal-question-text">{prompt}</p>
      {children}
    </div>
  );
}

/** Whether a prayer has been answered, and how. */
function Answered({ entry }) {
  const [note, setNote] = useState(null);
  const { answered } = entry;

  const mark = () => {
    announce(updateJournalEntry(entry.id, { answered: { at: Date.now(), ...(note.trim() && { note: note.trim() }) } }), 'Marked as answered');
    cue('journal');
    setNote(null);
  };
  const unmark = async () => {
    if (answered.note && !(await ask({ title: 'Not answered yet?', message: 'What you wrote about how it was answered will be cleared.', confirm: 'Clear it', danger: true }))) return;
    updateJournalEntry(entry.id, { answered: undefined });
  };

  if (answered) {
    return (
      <div className="context-card journal-answered">
        <p className="context-kicker">
          <Glyph name="check" size={13} strokeWidth={2} /> Answered {dateText(answered.at)}
        </p>
        {answered.note && <p className="journal-answered-note">{answered.note}</p>}
        <button className="btn-link" onClick={unmark}>
          Not answered yet
        </button>
      </div>
    );
  }
  if (note === null) {
    return (
      <button className="btn btn-ghost btn-block" onClick={() => setNote('')}>
        <Glyph name="dove" size={18} /> Mark as answered
      </button>
    );
  }
  return (
    <div className="context-card journal-answered">
      <p className="context-kicker">How was it answered?</p>
      <textarea
        className="input textarea journal-answer-input"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="A line to remember it by, if you like"
        rows={2}
        maxLength={1000}
        autoCapitalize="sentences"
      />
      <div className="sheet-actions-row">
        <button className="btn btn-ghost btn-small" onClick={() => setNote(null)}>
          Cancel
        </button>
        <button className="btn btn-gold btn-small" onClick={mark}>
          <Glyph name="check" size={16} /> Answered
        </button>
      </div>
    </div>
  );
}

/**
 * One journal entry: the question, what you wrote, and ways to change, share or delete it.
 * With a `draft` instead of an `id`, it is a new entry being written: { passage, title, prompt }
 * for a passage, { verse, tr, quotes } for a verse, { kind } or nothing for an entry of its own.
 */
export default function JournalEntrySheet({ id, draft, onClose }) {
  const entry = useStore((s) => (id ? s.journal[id] : null));
  const { read, openVerse } = useApp();
  const [editing, setEditing] = useState(!id);
  const [start, setStart] = useState(() => formOf(entry || draft || {}));
  const [form, setForm] = useState(start);
  // A question suggested for an entry of its own may bring its passage along, and can go again.
  const [suggested, setSuggested] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const dirty = editing && !same(form, start);

  // A note from before the journal kept questions gets its passage's question.
  const legacy = Boolean(entry?.legacy);
  useEffect(() => {
    if (legacy) fillLegacy({ [entry.id]: entry }, fillJournalContext);
  }, [legacy]); // eslint-disable-line react-hooks/exhaustive-deps

  // The passage, to read it again.
  const passage = editing ? form.passage : entry?.passage;
  const book = passage?.split('.')[0] || null;
  const tr = useStore((s) => (book ? readingTr(s, book) : null));
  const { sections } = useBook(book, tr);
  const sec = sections.find((s) => s.id === passage);

  if (id && !entry) return null;
  const shown = editing ? form : entry;
  const kind = KIND[shown.kind];

  const discard = () =>
    ask({
      title: 'Discard your changes?',
      message: id ? 'The entry stays as it was.' : 'What you have written here will be lost.',
      confirm: 'Discard',
      cancel: 'Keep writing',
      danger: true,
    });

  const close = async () => {
    if (dirty && !(await discard())) return;
    onClose();
  };

  const edit = () => {
    const f = formOf(entry);
    setStart(f);
    setForm(f);
    setSuggested(false);
    setEditing(true);
  };

  const cancel = async () => {
    if (dirty && !(await discard())) return;
    if (id) setEditing(false);
    else onClose();
  };

  const save = () => {
    const text = form.text.trim();
    if (!text) return;
    const done = { ...form, text, prompt: form.prompt.trim() };
    if (!id) {
      const { earned } = addJournalEntry(tidy(done));
      announce(earned, 'Saved to your journal');
      cueSoon('journal');
      onClose();
      return;
    }
    // Only what changed is written, so a question filled in meanwhile stays.
    const changed = Object.fromEntries(Object.entries(done).filter(([k, v]) => !same(v, start[k])));
    if (done.kind !== 'prayer' && entry.answered) changed.answered = undefined;
    if (Object.keys(changed).length) announce(updateJournalEntry(id, { ...tidy(changed), edited: Date.now() }), 'Entry saved');
    setEditing(false);
  };

  const suggest = async () => {
    setSuggesting(true);
    const found = await suggestPrompt(getState(), { kind: form.kind, verse: form.verse, not: form.prompt });
    setSuggesting(false);
    // A general question takes the place of a passage's, passage and all.
    if (found.passage) set({ prompt: found.prompt, passage: found.passage, title: found.title });
    else set({ prompt: found.prompt, ...(suggested && { passage: null, title: null }) });
    setSuggested(Boolean(found.passage));
  };

  const unsuggest = () => {
    set({ prompt: '', passage: null, title: null });
    setSuggested(false);
  };

  const star = () => updateJournalEntry(id, { starred: entry.starred ? undefined : true });

  const share = async () => {
    const result = await shareText(entryText(entry), entryRef(entry) || 'Journal entry');
    if (result === 'shared') cue('share');
    else if (result === 'copied') toast('Copied, ready to paste', 'check');
    else if (result === 'failed') toast('This entry couldn’t be shared here.');
  };

  const remove = async () => {
    const ok = await ask({ title: 'Delete this entry?', message: 'It will be taken out of your journal.', confirm: 'Delete', danger: true });
    if (!ok) return;
    onClose();
    const gone = deleteJournalEntry(id);
    if (gone) toast('Entry deleted', 'trash', { label: 'Undo', run: () => restoreJournalEntry(gone) });
  };

  const title = entryRef(shown) || (id ? kind.label : 'New entry');
  const kicker = shown.passage ? 'The question' : 'Writing on';

  return (
    <Sheet title={title} onClose={close} guard className="journal-entry-sheet" woolly={editing ? 'write' : kind.woolly}>
      {shown.title && <p className="section-sheet-title gold-soft">{shown.title}</p>}

      {editing ? (
        <>
          <KindPicker value={form.kind} onChange={(k) => set({ kind: k })} />
          {form.passage ? (
            form.prompt && (
              <Question prompt={form.prompt} kicker="The question">
                {suggested && (
                  <div className="journal-question-actions">
                    <button className="btn-link" onClick={suggest} disabled={suggesting}>
                      <Glyph name="refresh" size={14} /> Another
                    </button>
                    <button className="btn-link" onClick={unsuggest}>
                      <Glyph name="close" size={14} /> No question
                    </button>
                  </div>
                )}
              </Question>
            )
          ) : (
            <div className="journal-ask">
              <textarea
                className="input journal-ask-input"
                value={form.prompt}
                onChange={(e) => set({ prompt: e.target.value.replace(/\n/g, ' ') })}
                placeholder="A question or a title, if you like"
                aria-label="A question or a title"
                rows={2}
                maxLength={300}
                autoCapitalize="sentences"
              />
              <button className="btn btn-ghost btn-round" onClick={suggest} disabled={suggesting} aria-label="Suggest a question" title="Suggest a question">
                <Glyph name="sparkle" size={20} />
              </button>
            </div>
          )}
          <Quotes entry={form} onRemove={(v) => set({ quotes: form.quotes.filter((q) => q.v !== v) })} />
          <textarea
            className="input textarea journal-textarea"
            value={form.text}
            onChange={(e) => set({ text: e.target.value })}
            placeholder={kind.placeholder}
            aria-label="What you write"
            rows={7}
            maxLength={MAX_TEXT}
            autoCapitalize="sentences"
          />
          <Room text={form.text} />
          <div className="sheet-actions">
            <button className="btn btn-gold btn-block" onClick={save} disabled={!form.text.trim()}>
              {id ? 'Save changes' : 'Keep it'}
            </button>
            <button className="btn btn-ghost btn-block" onClick={cancel}>
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="chip-row wrap journal-chips">
            <span className="chip chip-muted">
              <Glyph name={kind.glyph} size={14} /> {kind.label}
            </span>
            <span className="chip chip-muted">{dateText(entry.created) || 'Undated'}</span>
            {entry.edited && <span className="chip chip-muted">Edited {shortDate(entry.edited)}</span>}
          </div>
          {entry.prompt && <Question prompt={entry.prompt} kicker={kicker} />}
          <Quotes entry={entry} />
          <p className="journal-text">{entry.text}</p>
          {entry.kind === 'prayer' && <Answered key={entry.id} entry={entry} />}

          <div className="sheet-actions">
            {sec && (
              <button className="btn btn-ghost btn-block" onClick={() => read(sec)}>
                <Glyph name="book" size={18} /> Read the passage again
              </button>
            )}
            {entry.verse && (
              <button className="btn btn-ghost btn-block" onClick={() => openVerse(entry.verse)}>
                <Glyph name="heart" size={18} /> Open the verse
              </button>
            )}
            <div className="sheet-actions-row">
              <button className="btn btn-ghost btn-small" onClick={edit}>
                <Glyph name="pen" size={16} /> Edit
              </button>
              <button className={`btn btn-ghost btn-small ${entry.starred ? 'is-active' : ''}`} onClick={star} aria-pressed={Boolean(entry.starred)}>
                <Glyph name="star" size={16} /> {entry.starred ? 'Starred' : 'Star'}
              </button>
              <button className="btn btn-ghost btn-small" onClick={share}>
                <Glyph name="share" size={16} /> Share
              </button>
              <button className="btn btn-ghost btn-small btn-danger-text" onClick={remove}>
                <Glyph name="trash" size={16} /> Delete
              </button>
            </div>
          </div>
        </>
      )}
    </Sheet>
  );
}
