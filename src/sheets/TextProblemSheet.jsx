import Sheet from '../components/Sheet.jsx';
import Glyph from '../components/Glyph.jsx';
import PasteText from './PasteText.jsx';
import { useApp } from '../AppContext.js';
import { getState } from '../lib/store.js';
import { setVerseTranslation } from '../lib/actions.js';
import { formatRef } from '../data/books.js';

export default function TextProblemSheet({ id, tr, error, plan, onClose }) {
  const { start, openSheet } = useApp();
  const needsKey = ['needs-key', 'auth', 'license'].includes(error?.kind);
  const fallback = 'ESV';

  const retry = () => {
    onClose();
    start(plan);
  };

  const useFallback = () => {
    setVerseTranslation(id, fallback);
    onClose();
    start({ ...plan, verseIds: plan.verseIds });
  };

  return (
    <Sheet title={needsKey ? `Unlock the ${tr}` : 'The words wouldn’t load'} onClose={onClose} woolly={needsKey ? 'hint' : navigator.onLine === false ? 'offline' : 'error'}>
      <p className="lead">
        {needsKey
          ? `To learn ${formatRef(id)} in the ${tr}, connect a free YouVersion key — or paste the words yourself.`
          : `${error?.message || 'Something went wrong.'} You can try again, paste the words yourself, or learn it in another translation.`}
      </p>
      <div className="sheet-actions">
        {needsKey ? (
          <button className="btn btn-gold btn-block" onClick={() => openSheet({ type: 'niv' })}>
            <Glyph name="key" size={18} /> Connect the {tr}
          </button>
        ) : (
          <button className="btn btn-gold btn-block" onClick={retry}>
            <Glyph name="refresh" size={18} /> Try again
          </button>
        )}
      </div>
      <p className="small-print">Paste the {tr} text of {formatRef(id)}:</p>
      <PasteText id={id} tr={tr} saveLabel="Save & begin" onSaved={retry} />
      {getState().settings.translation !== fallback && (
        <button className="btn btn-ghost btn-block" onClick={useFallback}>
          Learn this verse in the {fallback} instead
        </button>
      )}
    </Sheet>
  );
}
