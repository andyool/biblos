import { useState } from 'react';
import { Divider, EmblemBadge, LogoMark } from '../components/Ornaments.jsx';
import Glyph from '../components/Glyph.jsx';
import TranslationPicker from '../components/TranslationPicker.jsx';
import { PathList } from '../sheets/PathsSheet.jsx';
import { GOALS } from '../data/levels.js';
import { getTranslation } from '../data/translations.js';
import { updateProfile, updateSettings } from '../lib/actions.js';
import { play } from '../lib/sound.js';
import { useBack } from '../lib/nav.js';
import { useYouVersionReady } from '../lib/bible.js';

const FREE_EMBLEMS = [
  { id: 'cross', name: 'Cross' },
  { id: 'dove', name: 'Dove' },
  { id: 'lamp', name: 'Lamp' },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [emblem, setEmblem] = useState('cross');
  const nivReady = useYouVersionReady();
  const [picked, setPicked] = useState(null);
  // The NIV when this Biblos can fetch it; otherwise one that needs no key.
  const translation = picked || (nivReady ? 'NIV' : 'ESV');
  const [goal, setGoal] = useState(20);
  const [path, setPath] = useState('foundations');

  const next = () => {
    play('tap');
    setStep((s) => s + 1);
  };
  const back = () => setStep((s) => Math.max(0, s - 1));
  useBack(back, { active: step > 0, guard: true });

  const finish = () => {
    updateProfile({ name: name.trim(), emblem, since: Date.now() });
    updateSettings({ translation, dailyGoal: goal, activePath: path, onboarded: true });
    play('complete');
  };

  return (
    <div className="onboarding">
      {step > 0 && (
        <header className="onboarding-head">
          <button className="icon-btn" onClick={back} aria-label="Back">
            <Glyph name="back" size={22} />
          </button>
          <div className="dots">
            {[1, 2, 3, 4].map((i) => (
              <i key={i} className={i <= step ? 'is-on' : ''} />
            ))}
          </div>
          <span style={{ width: 40 }} />
        </header>
      )}

      {step === 0 && (
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

      {step === 1 && (
        <div className="ob-page">
          <h2 className="ob-title">What shall we call you?</h2>
          <input className="input input-large center" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={28} autoComplete="given-name" />
          <p className="ob-sub">Choose your emblem</p>
          <div className="emblem-pick">
            {FREE_EMBLEMS.map((e) => (
              <button key={e.id} className={`emblem-choice ${emblem === e.id ? 'is-on' : ''}`} onClick={() => setEmblem(e.id)}>
                <EmblemBadge id={e.id} size={72} />
                <span>{e.name}</span>
              </button>
            ))}
          </div>
          <p className="small-print center">More emblems can be earned in the Treasury.</p>
          <button className="btn btn-gold btn-block" onClick={next}>
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="ob-page">
          <h2 className="ob-title">Which Bible do you read?</h2>
          <p className="ob-sub">You can change this at any time, or for a single verse.</p>
          {getTranslation(translation).source === 'yv' && !nivReady && (
            <div className="note">
              <Glyph name="key" size={16} /> The NIV is copyrighted, so it needs a free key from YouVersion. Biblos will show you how — it takes two minutes, once.
            </div>
          )}
          <TranslationPicker value={translation} onPick={setPicked} />
          <button className="btn btn-gold btn-block sticky-cta" onClick={next}>
            Continue
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="ob-page">
          <h2 className="ob-title">A daily rhythm</h2>
          <p className="ob-sub">Little and often is the secret. How much each day?</p>
          <div className="goal-list">
            {GOALS.map((g) => (
              <button key={g.xp} className={`goal-item ${goal === g.xp ? 'is-on' : ''}`} onClick={() => setGoal(g.xp)}>
                <strong>{g.name}</strong>
                <span>
                  {g.xp} XP · {g.desc}
                </span>
              </button>
            ))}
          </div>
          <button className="btn btn-gold btn-block" onClick={next}>
            Continue
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="ob-page">
          <h2 className="ob-title">Where shall we begin?</h2>
          <p className="ob-sub">Each path is a little collection of verses. You can wander to others whenever you like.</p>
          <PathList active={path} onPick={setPath} />
          <button className="btn btn-gold btn-block btn-shine sticky-cta" onClick={finish}>
            Begin my journey
          </button>
        </div>
      )}
    </div>
  );
}
