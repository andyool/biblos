import { useState } from 'react';
import { Divider, EmblemBadge, LogoMark } from '../components/Ornaments.jsx';
import Glyph from '../components/Glyph.jsx';
import TranslationPicker from '../components/TranslationPicker.jsx';
import { PathList } from '../sheets/PathsSheet.jsx';
import { GOALS } from '../data/levels.js';
import { getTranslation } from '../data/translations.js';
import { BOOK_BY_CODE } from '../data/books.js';
import { FIRST_BOOKS, loadGuide } from '../data/guides/index.js';
import { setReadingBook, updateProfile, updateSettings } from '../lib/actions.js';
import { planNext } from '../lib/lesson.js';
import { bookSections, readingTr } from '../lib/reading.js';
import { getState } from '../lib/store.js';
import { play } from '../lib/sound.js';
import { useBack } from '../lib/nav.js';
import { useYouVersionReady } from '../lib/bible.js';
import { useApp } from '../AppContext.js';

const AIMS = [
  { id: 'memorise', name: 'Learn verses by heart', desc: 'A few minutes a day, until each verse is hidden in your heart' },
  { id: 'read', name: 'Read the Bible through', desc: 'A passage at a time, with questions on the meaning' },
  { id: 'both', name: 'Both', desc: 'Memorise and read, in one daily rhythm' },
];

export default function Onboarding() {
  const { start, read, go } = useApp();
  const [step, setStep] = useState(0);
  const [aim, setAim] = useState('both');
  const nivReady = useYouVersionReady();
  const [picked, setPicked] = useState(null);
  // The NIV when this Biblos can fetch it; otherwise one that needs no key.
  const translation = picked || (nivReady ? 'NIV' : 'ESV');
  const [goal, setGoal] = useState(20);
  const [path, setPath] = useState('foundations');
  const [book, setBook] = useState('MRK');

  // A path of verses only for memorising, a first book only for reading.
  const steps = ['welcome', 'aim', 'bible', ...(aim !== 'read' ? ['path'] : []), ...(aim !== 'memorise' ? ['book'] : []), 'goal'];
  const page = steps[step];
  const last = step === steps.length - 1;

  const next = () => {
    play('tap');
    setStep((s) => s + 1);
  };
  const back = () => setStep((s) => Math.max(0, s - 1));
  useBack(back, { active: step > 0, guard: true });

  // Straight into a first lesson, or a first reading.
  const finish = async () => {
    updateProfile({ since: Date.now() });
    updateSettings({ translation, dailyGoal: goal, activePath: path, focus: aim, onboarded: true });
    if (aim !== 'memorise') setReadingBook(book);
    play('complete');
    if (aim === 'read') {
      go('read');
      try {
        const guide = await loadGuide(book);
        read(bookSections(book, guide, readingTr(getState(), book))[0]);
      } catch {
        /* the Read tab shows the book, and says if its guide couldn't load */
      }
    } else {
      start(planNext(getState()));
    }
  };

  const cta = (label, className = '') => (
    <button className={`btn btn-gold btn-block ${className}`} onClick={last ? finish : next}>
      {last ? (aim === 'read' ? 'Begin reading' : 'Begin my first lesson') : label}
    </button>
  );

  return (
    <div className="onboarding">
      {step > 0 && (
        <header className="onboarding-head">
          <button className="icon-btn" onClick={back} aria-label="Back">
            <Glyph name="back" size={22} />
          </button>
          <div className="dots">
            {steps.slice(1).map((s, i) => (
              <i key={s} className={i < step ? 'is-on' : ''} />
            ))}
          </div>
          <span style={{ width: 40 }} />
        </header>
      )}

      {page === 'welcome' && (
        <div className="ob-page ob-welcome">
          <LogoMark size={128} className="float" />
          <h1 className="logo-word gold-text">Biblos</h1>
          <Divider width={230} />
          <p className="ob-tag">Hide God’s word in your heart — a few minutes at a time.</p>
          <blockquote className="ob-quote">
            “I have hidden your word in my heart, that I might not sin against you.”
            <cite>Psalm 119:11 (WEB)</cite>
          </blockquote>
          <button className="btn btn-gold btn-block btn-shine" onClick={next}>
            Begin
          </button>
        </div>
      )}

      {page === 'aim' && (
        <div className="ob-page">
          <h2 className="ob-title">What would you like to do?</h2>
          <p className="ob-sub">You can do the other too, whenever you like.</p>
          <div className="goal-list">
            {AIMS.map((a) => (
              <button key={a.id} className={`goal-item ${aim === a.id ? 'is-on' : ''}`} onClick={() => setAim(a.id)} aria-pressed={aim === a.id}>
                <strong>{a.name}</strong>
                <span>{a.desc}</span>
              </button>
            ))}
          </div>
          {cta('Continue')}
        </div>
      )}

      {page === 'bible' && (
        <div className="ob-page">
          <h2 className="ob-title">Which Bible do you read?</h2>
          <p className="ob-sub">You can change this at any time, or for a single verse.</p>
          {getTranslation(translation).source === 'yv' && !nivReady && (
            <div className="note">
              <Glyph name="key" size={16} /> The NIV is copyrighted, so it needs a free key from YouVersion. Biblos will show you how — it takes two minutes, once.
            </div>
          )}
          <TranslationPicker value={translation} onPick={setPicked} />
          {cta('Continue', 'sticky-cta')}
        </div>
      )}

      {page === 'path' && (
        <div className="ob-page">
          <h2 className="ob-title">Which verses first?</h2>
          <p className="ob-sub">Each path is a little collection of verses. You can wander to others whenever you like.</p>
          <PathList active={path} onPick={setPath} />
          {cta('Continue', 'sticky-cta')}
        </div>
      )}

      {page === 'book' && (
        <div className="ob-page">
          <h2 className="ob-title">Which book first?</h2>
          <p className="ob-sub">Any book can be read from the Read tab. These are good places to begin.</p>
          <div className="path-list">
            {FIRST_BOOKS.map((b) => (
              <button key={b.code} className={`path-item ${book === b.code ? 'is-active' : ''}`} onClick={() => setBook(b.code)} aria-pressed={book === b.code}>
                <EmblemBadge id="scroll" size={44} />
                <span className="path-item-text">
                  <strong>{BOOK_BY_CODE[b.code].name}</strong>
                  <small>{b.why}</small>
                </span>
                {book === b.code && <Glyph name="check" size={18} />}
              </button>
            ))}
          </div>
          {cta('Continue')}
        </div>
      )}

      {page === 'goal' && (
        <div className="ob-page">
          <h2 className="ob-title">A daily rhythm</h2>
          <p className="ob-sub">Little and often is the secret. How much each day?</p>
          <div className="goal-list">
            {GOALS.map((g) => (
              <button key={g.xp} className={`goal-item ${goal === g.xp ? 'is-on' : ''}`} onClick={() => setGoal(g.xp)} aria-pressed={goal === g.xp}>
                <strong>{g.name}</strong>
                <span>
                  {g.xp} XP · {g.desc}
                </span>
              </button>
            ))}
          </div>
          {cta('Continue', 'btn-shine')}
        </div>
      )}
    </div>
  );
}
