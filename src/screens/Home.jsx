import { useEffect, useMemo } from 'react';
import { useStore } from '../lib/store.js';
import { useApp } from '../AppContext.js';
import { TopBar } from '../components/Chrome.jsx';
import Glyph from '../components/Glyph.jsx';
import { Divider, EmblemBadge, Frame, LevelRing } from '../components/Ornaments.jsx';
import { getPath } from '../data/paths.js';
import { formatRefShort } from '../data/books.js';
import { LEVELS, roman } from '../data/levels.js';
import { planNext, recitePlan, verseTr } from '../lib/lesson.js';
import { isDue } from '../lib/srs.js';
import { prefetch, useYouVersionReady } from '../lib/bible.js';
import { getTranslation } from '../data/translations.js';
import { isIOS, isStandalone, useInstallPrompt } from '../lib/device.js';
import { updateSettings } from '../lib/actions.js';

const SWAY = [0, 54, 82, 54, 0, -54, -82, -54];
const GAP = 118;

function PathTrail({ path, state, nextId, onNode }) {
  const now = Date.now();
  const points = path.verses.map((id, i) => ({ id, x: SWAY[i % SWAY.length], y: 86 + i * GAP }));
  const height = points.length * GAP + 50;
  const d = points.reduce((acc, p, i) => {
    if (!i) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    return `${acc} C ${prev.x} ${prev.y + GAP / 2}, ${p.x} ${p.y - GAP / 2}, ${p.x} ${p.y}`;
  }, '');

  return (
    <div className="trail" style={{ height }}>
      <svg className="trail-line" width="320" height={height} viewBox={`-160 0 320 ${height}`} aria-hidden="true">
        <path d={d} className="trail-path-glow" />
        <path d={d} className="trail-path" />
      </svg>
      {points.map((p, i) => {
        const v = state.verses[p.id];
        const level = v?.level || 0;
        const due = isDue(v, now);
        const isNext = p.id === nextId;
        return (
          <button
            key={p.id}
            className={`node level-${level} ${isNext ? 'is-next' : ''} ${due ? 'is-due' : ''}`}
            style={{ left: `calc(50% + ${p.x}px)`, top: p.y }}
            onClick={() => onNode(p.id)}
            aria-label={`${formatRefShort(p.id)} — ${LEVELS[level].name}`}
          >
            {isNext && <span className="node-bubble">{level ? 'Continue' : 'Begin'}</span>}
            <span className="node-medal">
              <LevelRing level={level} size={84} due={due} />
              <span className="node-disc">
                {level >= 5 ? <Glyph name="heart" size={26} strokeWidth={1.6} /> : <span className="node-numeral">{roman(i + 1)}</span>}
              </span>
              {due && (
                <span className="node-due" title="Ready for review">
                  <Glyph name="lamp" size={14} lit />
                </span>
              )}
            </span>
            <span className="node-label">{formatRefShort(p.id)}</span>
          </button>
        );
      })}
    </div>
  );
}

function InstallHint() {
  const dismissed = useStore((s) => s.settings.installDismissed);
  const promptInstall = useInstallPrompt();
  if (dismissed || isStandalone()) return null;
  if (!isIOS() && !promptInstall) return null;
  return (
    <div className="hint-card">
      <Glyph name="phone" size={26} />
      <div>
        <strong>Put Biblos on your Home Screen</strong>
        {isIOS() ? (
          <p>
            Tap <Glyph name="share" size={15} className="inline-glyph" /> Share in Safari, then <em>Add to Home Screen</em>.
          </p>
        ) : (
          <p>It opens full-screen, like an app, and works offline.</p>
        )}
        {promptInstall && (
          <button className="btn btn-gold btn-small" onClick={promptInstall}>
            Install
          </button>
        )}
      </div>
      <button className="icon-btn" onClick={() => updateSettings({ installDismissed: true })} aria-label="Dismiss">
        <Glyph name="close" size={18} />
      </button>
    </div>
  );
}

function NivCard() {
  const translation = useStore((s) => s.settings.translation);
  const ready = useYouVersionReady();
  const { openSheet } = useApp();
  const t = getTranslation(translation);
  if (t.source !== 'yv' || ready) return null;
  return (
    <button className="hint-card is-action" onClick={() => openSheet({ type: 'niv' })}>
      <Glyph name="key" size={26} />
      <div>
        <strong>Unlock the {t.id} text</strong>
        <p>The NIV is copyrighted, so it needs a free YouVersion key. Two minutes, once — tap here.</p>
      </div>
      <Glyph name="chevron" size={18} />
    </button>
  );
}

export default function Home() {
  const state = useStore();
  const { start, openVerse, openSheet } = useApp();
  const plan = useMemo(() => planNext(state), [state]);
  const path = getPath(state, state.settings.activePath);
  const nextId = path.verses.find((id) => (state.verses[id]?.level || 0) < 4);
  const memorised = path.verses.filter((id) => (state.verses[id]?.level || 0) >= 4).length;
  const complete = path.verses.length > 0 && memorised === path.verses.length;

  // Fetch the next few verses quietly so lessons open instantly.
  useEffect(() => {
    const ids = new Set([...(plan?.verseIds || []), ...path.verses.filter((id) => (state.verses[id]?.level || 0) < 4).slice(0, 3)]);
    prefetch([...ids].map((id) => [verseTr(state, id), id]));
  }, [plan, path.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="screen home">
      <TopBar />
      <InstallHint />
      <NivCard />

      <Frame className="today" size={40}>
        <p className="today-kicker">Today’s practice</p>
        {plan ? (
          <>
            <h2 className="today-title gold-text">{plan.title}</h2>
            <p className="today-detail">{plan.detail}</p>
            <button className="btn btn-gold btn-block btn-shine" onClick={() => start(plan)}>
              {plan.kind === 'review' ? 'Begin review' : plan.kind === 'practice' ? 'Practise' : 'Begin'}
            </button>
            <p className="today-time">About {plan.kind === 'review' ? plan.verseIds.length : 2}–3 minutes</p>
          </>
        ) : (
          <>
            <h2 className="today-title gold-text">All is well tended</h2>
            <p className="today-detail">Add a verse of your own, or choose a new path.</p>
          </>
        )}
      </Frame>

      <div className="path-head">
        <EmblemBadge id={path.emblem} size={46} />
        <div className="path-head-text">
          <h2>{path.title}</h2>
          <p>
            {path.subtitle} · {memorised}/{path.verses.length} memorised
          </p>
        </div>
        <button className="btn btn-ghost btn-small" onClick={() => openSheet({ type: 'paths' })}>
          Paths
        </button>
      </div>
      <Divider width={240} className="center" />

      {path.verses.length ? (
        <PathTrail path={path} state={state} nextId={nextId} onNode={openVerse} />
      ) : (
        <div className="empty">
          <p>No verses here yet.</p>
          <button className="btn btn-ghost" onClick={() => openSheet({ type: 'add' })}>
            Add a verse
          </button>
        </div>
      )}

      {path.verses.length > 1 && (
        <div className={`recite-card ${complete ? 'is-ready' : ''}`}>
          <Glyph name="crown" size={30} />
          <div>
            <strong>Recite the whole {path.id === 'mine' ? 'collection' : 'path'}</strong>
            <p>{complete ? 'Every verse is memorised. Say them all, one after another.' : `Unlocks when all ${path.verses.length} verses are Fruitful.`}</p>
          </div>
          <button className="btn btn-gold btn-small" disabled={!complete} onClick={() => start(recitePlan(path))}>
            Recite
          </button>
        </div>
      )}
    </div>
  );
}
