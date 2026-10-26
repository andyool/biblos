import { useEffect, useMemo } from 'react';
import { useSaving, useStore } from '../lib/store.js';
import { useApp } from '../AppContext.js';
import { TopBar } from '../components/Chrome.jsx';
import Glyph from '../components/Glyph.jsx';
import { Divider, EmblemBadge, Frame, LevelRing } from '../components/Ornaments.jsx';
import { getPath } from '../data/paths.js';
import { formatRefShort } from '../data/books.js';
import { LEVELS, roman } from '../data/levels.js';
import { FIELD, nextToLearn, planNext, recitePlan, verseTr } from '../lib/lesson.js';
import { isDue } from '../lib/srs.js';
import { prefetch, useYouVersionReady } from '../lib/bible.js';
import { getTranslation } from '../data/translations.js';
import { androidBrowser, backupDue, exportBackup, isAndroid, isIOS, isStandalone, useInstallPrompt } from '../lib/device.js';
import { sessionsDone, snoozeBackup, updateSettings } from '../lib/actions.js';
import { toast } from '../lib/ui.js';
import { DAY, dayKey, startOfDay } from '../lib/dates.js';
import { bookProgress, portionRef, readingTr, sectionRef, useBook } from '../lib/reading.js';
import { planPortion, planProgress, planStatus, readingMinutes } from '../lib/plans.js';
import { BOOK_BY_CODE } from '../data/books.js';
import Woolly from '../components/Woolly.jsx';
import { SHORT_SCREEN, useMedia } from '../lib/hooks.js';
import { useUpdateReady } from '../lib/update.js';

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

// Where "Add to Home screen" is in each Android browser.
const ANDROID_STEPS = {
  chrome: (
    <>
      Tap <b className="menu-key">⋮</b> at the top right of Chrome, then <em>Add to Home screen</em> or <em>Install app</em>.
    </>
  ),
  samsung: (
    <>
      Tap <b className="menu-key">☰</b> at the bottom right, then <em>Add page to</em> → <em>Home screen</em>.
    </>
  ),
  firefox: (
    <>
      Tap <b className="menu-key">⋮</b>, then <em>Add to Home screen</em> or <em>Install</em>.
    </>
  ),
};

function InstallHint() {
  const promptInstall = useInstallPrompt();
  const { openSheet } = useApp();
  const ios = isIOS();
  return (
    <div className="hint-card">
      <Glyph name="phone" size={26} />
      <div>
        <strong>Put Biblos on your Home Screen</strong>
        {promptInstall ? (
          <p>It opens full-screen, like an app, and works offline.</p>
        ) : ios ? (
          <p>
            It keeps its own progress, apart from Safari, so take yours with you: copy it here, then tap <Glyph name="share" size={15} className="inline-glyph" /> Share and <em>Add to Home Screen</em>.
          </p>
        ) : (
          <p>{ANDROID_STEPS[androidBrowser()]}</p>
        )}
        {promptInstall && (
          <button className="btn btn-gold btn-small" onClick={promptInstall}>
            Install
          </button>
        )}
        {ios && !promptInstall && (
          <button className="btn btn-gold btn-small" onClick={() => openSheet({ type: 'transfer' })}>
            Copy my progress
          </button>
        )}
      </div>
      <button className="icon-btn" onClick={() => updateSettings({ installDismissed: true })} aria-label="Dismiss">
        <Glyph name="close" size={18} />
      </button>
    </div>
  );
}

/** Progress lives only on this phone, so suggest a backup now and then. */
function BackupHint() {
  const last = useStore((s) => s.settings.lastBackup);
  const weeks = last ? Math.max(1, Math.round((Date.now() - last) / (7 * DAY))) : 0;
  const save = async () => {
    const result = await exportBackup();
    if (result === 'downloaded') toast('Backup saved to your downloads', 'check');
  };
  return (
    <div className="hint-card">
      <Glyph name="shield" size={26} />
      <div>
        <strong>Keep your progress safe</strong>
        <p>
          {last ? `Your last backup was ${weeks} week${weeks === 1 ? '' : 's'} ago.` : 'Your progress is kept only on this phone.'} Save a copy to Files, or send it to yourself.
        </p>
        <button className="btn btn-gold btn-small" onClick={save}>
          Save a backup
        </button>
      </div>
      <button className="icon-btn" onClick={() => snoozeBackup()} aria-label="Remind me next week">
        <Glyph name="close" size={18} />
      </button>
    </div>
  );
}

function NivCard() {
  const translation = useStore((s) => s.settings.translation);
  const { openSheet } = useApp();
  const t = getTranslation(translation);
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

/** One note at a time above Today, the most pressing first. */
function HomeHint() {
  const state = useStore();
  const nivReady = useYouVersionReady();
  const promptInstall = useInstallPrompt();
  const update = useUpdateReady();
  const saving = useSaving();
  // The app shows these above every tab, so nothing more here.
  if (update || !saving) return null;
  if (backupDue(state)) return <BackupHint />;
  if (getTranslation(state.settings.translation).source === 'yv' && !nivReady) return <NivCard />;
  // Once there is some progress worth keeping.
  const canInstall = isIOS() || isAndroid() || promptInstall;
  if (sessionsDone(state.stats) > 0 && !state.settings.installDismissed && !isStandalone() && canInstall) return <InstallHint />;
  return null;
}

/** Did anything happen today? Memory practice and reading each count. */
const practisedToday = (state) => Object.values(state.verses).some((v) => (v.lastPracticed || 0) >= startOfDay());
const readToday = (state) => Object.values(state.reading.books).some((b) => Object.values(b.done || {}).some((t) => t >= startOfDay()));

/** The other half of today: the next passage of the book you are reading through. */
function ReadingToday({ state }) {
  const { read, go } = useApp();
  const code = state.reading.book;
  const { ready, sections } = useBook(code, readingTr(state));
  const next = ready ? bookProgress(state, code, sections).next : null;
  const plan = planProgress(state);
  const portion = ready ? planPortion(state, code, sections) : null;
  const done = readToday(state);

  let title;
  let detail;
  let action;
  if (portion?.ahead) {
    // In a plan, today's passages are read together.
    title = 'Today’s reading is done';
    detail = [planStatus(plan), `Next: ${portionRef(portion.secs)}`].join(' · ');
    action = { label: 'Read on', run: () => read(portion) };
  } else if (portion) {
    title = `Read ${portionRef(portion.secs)}`;
    detail = [`About ${readingMinutes(portion.verses)} min`, planStatus(plan)].join(' · ');
    action = { label: 'Read', run: () => read(portion) };
  } else if (!code) {
    title = 'Read the Bible through';
    detail = 'A passage at a time, with questions on the meaning';
    action = { label: 'Choose', run: () => go('read') };
  } else if (!ready) {
    title = `Read ${BOOK_BY_CODE[code].name}`;
    detail = ' ';
  } else if (!next) {
    title = `${BOOK_BY_CODE[code].name}, read through`;
    detail = 'Choose your next book';
    action = { label: 'Choose', run: () => go('read') };
  } else {
    title = `${done ? 'Next:' : 'Read'} ${sectionRef(next)}`;
    detail = [done && 'Read today', next.title, plan && !plan.finished && planStatus(plan)].filter(Boolean).join(' · ');
    action = { label: done ? 'Read on' : 'Read', run: () => read(next) };
  }

  return (
    <div className="today-read">
      <span className={`today-read-icon ${done ? 'is-done' : ''}`}>
        <Glyph name={done ? 'check' : 'scroll'} size={20} strokeWidth={done ? 2 : 1.5} />
      </span>
      <span className="today-read-text">
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      {action && (
        <button className="btn btn-ghost btn-small" onClick={action.run}>
          {action.label}
        </button>
      )}
    </div>
  );
}

// Woolly waves once each time the app is opened, and sleeps late at night.
let waved = false;
const bedtime = () => {
  const hour = new Date().getHours();
  return hour >= 22 || hour < 5;
};

export default function Home() {
  const state = useStore();
  const { start, openVerse, openSheet } = useApp();
  const short = useMedia(SHORT_SCREEN);
  const plan = useMemo(() => planNext(state), [state]);
  const begun = sessionsDone(state.stats) > 0;
  // A verse not yet begun is learned in your Bible, which can be changed right here.
  const newVerse = plan?.kind === 'learn' && !state.verses[plan.verseIds[0]];
  const path = getPath(state, state.settings.activePath);
  // Where the path goes on: the verse today's lesson is for, when it is on this path, otherwise
  // this path's own next. None when nothing on it can grow until tomorrow.
  const nextId = plan?.kind === 'learn' && path.verses.includes(plan.verseIds[0]) ? plan.verseIds[0] : nextToLearn(state, path, Date.now(), path.verses);
  const memorised = path.verses.filter((id) => (state.verses[id]?.level || 0) >= 4).length;
  const complete = path.verses.length > 0 && memorised === path.verses.length;

  useEffect(() => {
    waved = true;
  }, []);

  // Fetch the next few verses quietly so lessons open instantly.
  useEffect(() => {
    const ids = new Set([...(plan?.verseIds || []), ...path.verses.filter((id) => (state.verses[id]?.level || 0) < 4).slice(0, FIELD + 1)]);
    prefetch([...ids].map((id) => [verseTr(state, id), id]));
  }, [plan, path.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="screen home">
      <TopBar />
      <HomeHint />

      <Frame className="today" size={40}>
        <Woolly
          size={short ? 96 : 132}
          listen
          base={bedtime() ? 'sleep' : plan ? 'idle' : 'breathe'}
          // Someone new is welcomed and shown where to begin.
          intro={waved || bedtime() ? undefined : plan && !state.stats.lessons ? ['welcome', 'point-down'] : 'wave'}
          delay={250}
          className="today-woolly"
        />
        <p className="today-kicker">
          Today’s practice
          {practisedToday(state) && (
            <span className="today-done">
              {' '}
              · <Glyph name="check" size={12} strokeWidth={2.4} /> done
            </span>
          )}
        </p>
        {plan ? (
          <>
            <h2 className="today-title gold-text">{plan.title}</h2>
            <p className="today-detail">
              {plan.detail}
              {newVerse && (
                <button className="today-tr" onClick={() => openSheet({ type: 'translation' })} aria-label={`Bible: ${state.settings.translation}. Change`}>
                  {state.settings.translation} <Glyph name="down" size={12} strokeWidth={2} />
                </button>
              )}
            </p>
            <button className="btn btn-gold btn-block btn-shine" onClick={() => start(plan)}>
              {plan.kind === 'review' ? 'Begin review' : plan.kind === 'practice' ? 'Practise' : 'Begin'}
            </button>
            <p className="today-time">
              About {plan.kind === 'review' ? plan.verseIds.length : 2}–3 minutes
              {begun && !state.stats.days[dayKey()] && <span className="today-bonus"> · double XP for today’s first</span>}
            </p>
          </>
        ) : (
          <>
            <h2 className="today-title gold-text">All is well tended</h2>
            <p className="today-detail">Add a verse of your own, or choose a new path.</p>
          </>
        )}
        <ReadingToday state={state} />
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

      {path.verses.length > 1 && memorised > 0 && (
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
