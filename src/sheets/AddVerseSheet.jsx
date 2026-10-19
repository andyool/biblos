import { useMemo, useState } from 'react';
import Sheet from '../components/Sheet.jsx';
import Glyph from '../components/Glyph.jsx';
import { VerseText } from '../components/VerseText.jsx';
import TranslationPicker from '../components/TranslationPicker.jsx';
import PasteText from './PasteText.jsx';
import { useStore } from '../lib/store.js';
import { useApp } from '../AppContext.js';
import { BOOK_BY_CODE, formatRef, makeId, parseReference } from '../data/books.js';
import { loadPassage } from '../lib/bible.js';
import { getText, useTextsVersion } from '../lib/texts.js';
import { tokenize } from '../lib/text.js';
import { addCustomVerses, setActivePath } from '../lib/actions.js';
import { toast } from '../lib/ui.js';
import { cueSoon } from '../mascot/bus.js';

export default function AddVerseSheet({ onClose }) {
  const settings = useStore((s) => s.settings);
  const custom = useStore((s) => s.custom);
  const { start, go } = useApp();
  useTextsVersion();
  const [query, setQuery] = useState('');
  const [tr, setTr] = useState(settings.translation);
  const [pickTr, setPickTr] = useState(false);
  const [state, setState] = useState({ status: 'idle' });
  const [split, setSplit] = useState(true);

  const parsed = useMemo(() => (query.trim() ? parseReference(query) : null), [query]);
  const wholeChapter = parsed?.wholeChapter;
  const ref = parsed && !parsed.error && !wholeChapter ? parsed : null;
  const id = ref ? makeId(ref) : null;
  const count = ref ? ref.end - ref.start + 1 : 0;
  const entry = id ? getText(tr, id) : null;

  const find = async () => {
    if (!id) return;
    setState({ status: 'loading' });
    try {
      await loadPassage(tr, id);
      setState({ status: 'ready' });
    } catch (error) {
      setState({ status: 'error', error });
    }
  };

  const add = async (andStart) => {
    if (!id || !entry) return;
    let ids = [id];
    if (count > 3 && split) {
      ids = Array.from({ length: count }, (_, i) => makeId({ ...ref, start: ref.start + i, end: ref.start + i }));
      // Split the fetched text into single verses where we know the boundaries.
      try {
        await Promise.all(ids.map((single) => loadPassage(tr, single)));
      } catch {
        ids = [id];
      }
    }
    const fresh = ids.filter((x) => !custom.includes(x));
    addCustomVerses(ids, tr);
    setActivePath('mine');
    toast(fresh.length ? `${formatRef(id)} added to My Verses` : 'Already in My Verses', 'check');
    if (fresh.length && !andStart) cueSoon('verseAdded');
    onClose();
    if (andStart) start({ kind: 'learn', verseIds: [ids[0]], title: 'Sow a new verse', detail: formatRef(ids[0]) });
    else go('path');
  };

  return (
    <Sheet title="Add a verse" onClose={onClose} woolly="search">
      <label className="field">
        <span>Reference</span>
        <input
          className="input input-large"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setState({ status: 'idle' });
          }}
          onKeyDown={(e) => e.key === 'Enter' && find()}
          placeholder="e.g. Romans 12:2 or Psalm 46:1-3"
          autoCapitalize="words"
          autoCorrect="off"
          enterKeyHint="search"
        />
      </label>
      {parsed?.error && <p className="field-note is-error">{parsed.error}</p>}
      {wholeChapter && <p className="field-note">Add verse numbers too — e.g. {BOOK_BY_CODE[parsed.book].name} {parsed.chapter}:1-6.</p>}
      {ref && (
        <p className="field-note is-ok">
          <Glyph name="check" size={14} /> {formatRef(id)}
        </p>
      )}

      <div className="chip-row">
        <button className="chip" onClick={() => setPickTr(!pickTr)}>
          {tr} <Glyph name="down" size={14} />
        </button>
      </div>
      {pickTr && (
        <TranslationPicker
          value={tr}
          compact
          onPick={(t) => {
            setTr(t);
            setPickTr(false);
            setState({ status: 'idle' });
          }}
        />
      )}

      {!entry && (
        <button className="btn btn-gold btn-block" onClick={find} disabled={!id || state.status === 'loading'}>
          {state.status === 'loading' ? 'Finding…' : 'Find verse'}
        </button>
      )}

      {state.status === 'error' && !entry && (
        <>
          <div className="note note-error">{state.error?.message}</div>
          <p className="small-print">Paste the words yourself:</p>
          <PasteText id={id} tr={tr} saveLabel="Use this text" />
        </>
      )}

      {entry && (
        <>
          <div className="preview">
            <VerseText tokens={tokenize(entry.verses)} verseNumbers compact />
          </div>
          {count > 3 && (
            <label className="toggle-row">
              <input type="checkbox" checked={split} onChange={(e) => setSplit(e.target.checked)} />
              <span>Learn it verse by verse ({count} separate verses) — recommended</span>
            </label>
          )}
          <div className="sheet-actions">
            <button className="btn btn-gold btn-block" onClick={() => add(true)}>
              Add & begin
            </button>
            <button className="btn btn-ghost btn-block" onClick={() => add(false)}>
              Add to My Verses
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}
