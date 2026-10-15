import { useState } from 'react';
import { bibleComUrl } from '../lib/bible.js';
import { setText } from '../lib/texts.js';
import { cleanVerseText } from '../lib/text.js';
import { parseId } from '../data/books.js';
import Glyph from '../components/Glyph.jsx';

/** Paste (or correct) a passage's words by hand. */
export default function PasteText({ id, tr, initial = '', onSaved, saveLabel = 'Save text' }) {
  const [draft, setDraft] = useState(initial);
  const { book, start } = parseId(id);
  const save = () => {
    const t = cleanVerseText(draft, { book });
    if (t.split(/\s+/).length < 2) return;
    setText(tr, id, { verses: [{ v: start, t }], src: 'user' });
    onSaved?.();
  };
  return (
    <div className="paste">
      <textarea
        className="input textarea"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={`Paste the ${tr} text here…`}
        rows={5}
        autoCapitalize="sentences"
      />
      <div className="paste-actions">
        <a className="btn btn-ghost btn-small" href={bibleComUrl(tr, id)} target="_blank" rel="noreferrer">
          <Glyph name="globe" size={16} /> bible.com
        </a>
        <button className="btn btn-gold btn-small" onClick={save} disabled={draft.trim().split(/\s+/).length < 2}>
          {saveLabel}
        </button>
      </div>
    </div>
  );
}
