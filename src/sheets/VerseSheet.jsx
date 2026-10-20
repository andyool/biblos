import { useRef, useState } from 'react';
import Sheet from '../components/Sheet.jsx';
import Glyph from '../components/Glyph.jsx';
import { VerseText } from '../components/VerseText.jsx';
import TranslationPicker from '../components/TranslationPicker.jsx';
import PasteText from './PasteText.jsx';
import ShareImageSheet from './ShareImageSheet.jsx';
import { useStore } from '../lib/store.js';
import { useApp } from '../AppContext.js';
import { useVerseText } from '../lib/hooks.js';
import { tokenize } from '../lib/text.js';
import { learnPlan, resting, verseTr } from '../lib/lesson.js';
import { freshness, isDue, reviewsToHidden } from '../lib/srs.js';
import { whenText } from '../lib/dates.js';
import { removeCustomVerse, resetVerse, setVerseTranslation } from '../lib/actions.js';
import { ask, toast } from '../lib/ui.js';
import { canSpeak, speak } from '../lib/speech.js';
import { joinVerses, removeText } from '../lib/texts.js';
import { formatRef } from '../data/books.js';
import { LEVELS, LESSON_NAMES } from '../data/levels.js';
import { getTranslation } from '../data/translations.js';

function ErrorNote({ error, retry, tr, onConnect }) {
  return (
    <div className="note note-error">
      <p>{error?.message || 'The words could not be loaded.'}</p>
      <div className="note-actions">
        {(['needs-key', 'auth', 'license'].includes(error?.kind)) && (
          <button className="btn btn-gold btn-small" onClick={onConnect}>
            Connect the {tr}
          </button>
        )}
        <button className="btn btn-ghost btn-small" onClick={retry}>
          <Glyph name="refresh" size={16} /> Try again
        </button>
      </div>
    </div>
  );
}

export default function VerseSheet({ id, onClose }) {
  const state = useStore();
  const { start, openSheet } = useApp();
  const v = state.verses[id];
  const level = v?.level || 0;
  const tr = verseTr(state, id);
  const { entry, status, error, retry } = useVerseText(tr, id);
  const [mode, setMode] = useState(null); // 'translation' | 'edit'
  const [sharing, setSharing] = useState(false);
  // While the verse is read aloud, Woolly listens along.
  const [listening, setListening] = useState(false);
  const listens = useRef(0);
  const listen = () => {
    const n = ++listens.current;
    setListening(true);
    speak(`${formatRef(id)}. ${joinVerses(entry)}`, { onEnd: () => n === listens.current && setListening(false) });
  };
  const due = isDue(v);
  const fresh = freshness(v);
  const isCustom = state.custom.includes(id);

  const settling = resting(v);
  const [fewest, most] = level === 4 && v?.srs ? reviewsToHidden(v.srs) : [0, 0];
  const toHidden = fewest === 0 ? '' : most === 1 ? 'One more good review' : `${fewest === most ? fewest : `${fewest}–${most}`} more good reviews`;
  const primary = level >= 4 ? (due ? 'Review now' : 'Practise') : level === 0 ? 'Begin learning' : settling ? 'Practise' : LESSON_NAMES[level];

  const begin = () => {
    onClose();
    start(learnPlan(state, id));
  };

  const changeTranslation = async (next) => {
    if (next === tr) return setMode(null);
    if (level > 0) {
      const ok = await ask({
        title: `Learn it in the ${next}?`,
        message: `The words will change, so ${formatRef(id)} will start again from “Sown”.`,
        confirm: `Switch to ${next}`,
      });
      if (!ok) return;
    }
    setVerseTranslation(id, next);
    setMode(null);
  };

  const reset = async () => {
    const ok = await ask({ title: 'Start this verse again?', message: 'Its progress will be cleared.', confirm: 'Start again', danger: true });
    if (ok) {
      resetVerse(id);
      toast('Progress cleared');
    }
  };

  const remove = async () => {
    const ok = await ask({ title: 'Remove this verse?', message: 'It will be taken out of My Verses along with its progress.', confirm: 'Remove', danger: true });
    if (ok) {
      removeCustomVerse(id);
      onClose();
    }
  };

  const restoreText = () => {
    removeText(tr, id);
    retry();
  };

  return (
    <Sheet title={formatRef(id)} onClose={onClose} className="verse-sheet" woolly={listening ? 'listen' : 'read'}>
      <div className="chip-row">
        <button className="chip" onClick={() => setMode(mode === 'translation' ? null : 'translation')}>
          {tr} <Glyph name="down" size={14} />
        </button>
        {entry?.src === 'user' && <span className="chip chip-muted">Your own text</span>}
        <span className={`chip chip-level level-${level}`}>
          <Glyph name={LEVELS[Math.max(1, level)].icon} size={14} /> {LEVELS[level].name}
        </span>
      </div>

      {mode === 'translation' && <TranslationPicker value={tr} onPick={changeTranslation} compact />}

      {mode === 'edit' ? (
        <PasteText
          id={id}
          tr={tr}
          initial={joinVerses(entry)}
          onSaved={() => {
            setMode(null);
            toast('Text saved');
          }}
        />
      ) : status === 'ready' ? (
        <div className="verse-sheet-text">
          <VerseText tokens={tokenize(entry.verses)} dropCap verseNumbers />
        </div>
      ) : status === 'error' ? (
        <>
          <ErrorNote error={error} retry={retry} tr={tr} onConnect={() => openSheet({ type: 'niv' })} />
          <p className="small-print">Or paste the words yourself:</p>
          <PasteText id={id} tr={tr} />
        </>
      ) : (
        <div className="loading-lines">
          <span />
          <span />
          <span />
        </div>
      )}

      <div className="growth">
        {LEVELS.slice(1).map((l) => (
          <div key={l.n} className={`growth-step ${level >= l.n ? 'is-on' : ''} ${level + 1 === l.n ? 'is-next' : ''}`}>
            <Glyph name={l.icon} size={20} />
            <span>{l.short || l.name}</span>
          </div>
        ))}
      </div>
      <p className="growth-desc">
        {LEVELS[level].desc}
        {settling && ' It has grown twice today, so let it settle: it can grow again tomorrow.'}
        {v?.srs && level >= 4 && (
          <>
            {' '}
            {due ? 'It is ready to be recalled now.' : `Next review ${whenText(v.srs.due)}.`}
          </>
        )}
        {toHidden && (
          <>
            {' '}
            {toHidden} and it will be Hidden in the Heart.
          </>
        )}
      </p>
      {fresh !== null && level >= 4 && (
        <div className="freshness" aria-label="Memory strength">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={fresh > i / 4 ? 'is-on' : ''} />
          ))}
          <small>{fresh > 0.75 ? 'Fresh' : fresh > 0.5 ? 'Steady' : fresh > 0.25 ? 'Fading' : 'Needs tending'}</small>
        </div>
      )}

      <div className="sheet-actions">
        <button className="btn btn-gold btn-block btn-shine" onClick={begin} disabled={status !== 'ready'}>
          {primary}
        </button>
        <div className="sheet-actions-row">
          {canSpeak() && status === 'ready' && (
            <button className="btn btn-ghost btn-small" onClick={listen}>
              <Glyph name="speaker" size={16} /> Listen
            </button>
          )}
          {status === 'ready' && (
            <button className="btn btn-ghost btn-small" onClick={() => setSharing(true)}>
              <Glyph name="share" size={16} /> Picture
            </button>
          )}
          {status === 'ready' && mode !== 'edit' && (
            <button className="btn btn-ghost btn-small" onClick={() => setMode('edit')}>
              <Glyph name="pen" size={16} /> Edit text
            </button>
          )}
          {entry?.src === 'user' && getTranslation(tr).source !== 'yv' && (
            <button className="btn btn-ghost btn-small" onClick={restoreText}>
              <Glyph name="refresh" size={16} /> Original
            </button>
          )}
          {level > 0 && (
            <button className="btn btn-ghost btn-small" onClick={reset}>
              <Glyph name="refresh" size={16} /> Restart
            </button>
          )}
          {isCustom && (
            <button className="btn btn-ghost btn-small btn-danger-text" onClick={remove}>
              <Glyph name="trash" size={16} /> Remove
            </button>
          )}
        </div>
      </div>
      <p className="small-print">{getTranslation(tr).copyright}</p>
      {sharing && entry && <ShareImageSheet id={id} tr={tr} text={joinVerses(entry)} onClose={() => setSharing(false)} />}
    </Sheet>
  );
}
