import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { getState, useStore } from './lib/store.js';
import { AppContext } from './AppContext.js';
import { GoldDefs } from './components/Ornaments.jsx';
import { TabBar, TopEdge } from './components/Chrome.jsx';
import Overlays from './components/Overlays.jsx';
import Home from './screens/Home.jsx';
import Library from './screens/Library.jsx';
import Treasury from './screens/Treasury.jsx';
import Profile from './screens/Profile.jsx';
import Onboarding from './screens/Onboarding.jsx';
import Lesson from './screens/Lesson.jsx';
import LessonComplete from './screens/LessonComplete.jsx';
import Read from './screens/Read.jsx';
import Reading from './screens/Reading.jsx';
import VerseSheet from './sheets/VerseSheet.jsx';
import AddVerseSheet from './sheets/AddVerseSheet.jsx';
import PathsSheet from './sheets/PathsSheet.jsx';
import NivSheet from './sheets/NivSheet.jsx';
import TextProblemSheet from './sheets/TextProblemSheet.jsx';
import BooksSheet from './sheets/BooksSheet.jsx';
import SectionSheet from './sheets/SectionSheet.jsx';
import PlansSheet from './sheets/PlansSheet.jsx';
import JournalSheet from './sheets/JournalSheet.jsx';
import { buildSession, learnPlan, planNext, verseTr } from './lib/lesson.js';
import { checkServerKey, loadPassage } from './lib/bible.js';
import { checkStreak, finishReading, finishSession, setActivePath, setReadingBook } from './lib/actions.js';
import { planProgress } from './lib/plans.js';
import { bookProgress, bookSections, buildReading, loadSection, prefetchSection, readingTr } from './lib/reading.js';
import { guideNow, loadGuide } from './data/guides/index.js';
import { fontFor, themeFor, THEMES } from './data/shop.js';
import { toast } from './lib/ui.js';
import { useBack } from './lib/nav.js';
import { useUpdateReady } from './lib/update.js';
import Glyph from './components/Glyph.jsx';
import Woolly, { WoollyCameo } from './components/Woolly.jsx';
import { cue } from './mascot/bus.js';

const THEME_BG = Object.fromEntries(THEMES.map((t) => [t.id, t.colors[0]]));

/** The next passage of the book being read, once its guide has loaded. */
function nextReading(state) {
  const code = state.reading.book;
  const guide = code && guideNow(code);
  return guide ? bookProgress(state, code, bookSections(code, guide, readingTr(state, code))).next : null;
}

/** A new version has arrived: offer to reload (not in the middle of a lesson). */
function UpdateNote() {
  const ready = useUpdateReady();
  if (!ready) return null;
  return (
    <button className="hint-card is-action update-note" onClick={() => window.location.reload()}>
      <Glyph name="refresh" size={24} />
      <div>
        <strong>A new version of Biblos is ready</strong>
        <p>Tap to reload. Your progress is kept.</p>
      </div>
    </button>
  );
}

const DARK = '(prefers-color-scheme: dark)';
const subscribeScheme = (onChange) => {
  const query = matchMedia(DARK);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};

function useAppearance() {
  const settings = useStore((s) => s.settings);
  const phoneIsDark = useSyncExternalStore(subscribeScheme, () => matchMedia(DARK).matches);
  const theme = themeFor(settings, phoneIsDark);
  const font = settings.verseFont;
  const textSize = settings.textSize || 1;
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    const f = fontFor(font);
    root.style.setProperty('--font-verse', f.family);
    root.style.setProperty('--verse-scale', String(f.scale));
    root.style.setProperty('--text-scale', String(textSize));
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_BG[theme] || '#0a0f1d');
  }, [theme, font, textSize]);
}

export default function App() {
  useAppearance();
  const onboarded = useStore((s) => s.settings.onboarded);
  // Someone who came to read through the Bible starts on the Read tab.
  const home = useStore((s) => (s.settings.focus === 'read' ? 'read' : 'path'));
  const [tab, setTab] = useState(() => (getState().settings.focus === 'read' ? 'read' : 'path'));
  const [sheets, setSheets] = useState([]);
  const [session, setSession] = useState(null);
  const [reading, setReading] = useState(null);
  const [summary, setSummary] = useState(null);
  const [preparing, setPreparing] = useState(false);
  const mainRef = useRef(null);

  useEffect(() => {
    checkServerKey();
  }, []);

  // Streak upkeep at launch and whenever the app comes back to the foreground.
  useEffect(() => {
    const check = () => {
      const event = checkStreak();
      if (event) cue(event.type === 'lost' ? 'streakLost' : 'streakKept');
      if (event?.type === 'oil') toast(`A flask of oil kept your lamp burning (${event.missed} day${event.missed > 1 ? 's' : ''} missed).`, 'lamp');
      if (event?.type === 'lost') toast(`Your ${event.streak}-day streak has ended. Light the lamp again today.`, 'lamp');
    };
    check();
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const openSheet = useCallback((sheet) => setSheets((list) => [...list.filter((s) => s.type !== sheet.type), sheet]), []);
  const closeSheet = useCallback((type) => setSheets((list) => (type ? list.filter((s) => s.type !== type) : list.slice(0, -1))), []);

  const start = useCallback(
    async (plan) => {
      if (!plan) return;
      setPreparing(true);
      const state = getState();
      const failures = [];
      await Promise.all(
        plan.verseIds.map((id) =>
          loadPassage(verseTr(state, id), id).catch((error) => {
            failures.push({ id, error });
          }),
        ),
      );
      setPreparing(false);
      let ready = plan;
      if (failures.length) {
        const ok = plan.verseIds.filter((id) => !failures.some((f) => f.id === id));
        if (plan.kind !== 'learn' && ok.length) {
          ready = { ...plan, verseIds: ok };
          toast(`${failures.length} verse${failures.length > 1 ? 's' : ''} could not load and will wait for later.`);
        } else {
          const f = failures[0];
          setSheets([{ type: 'problem', id: f.id, tr: verseTr(state, f.id), error: f.error, plan }]);
          return;
        }
      }
      if (plan.pathId) setActivePath(plan.pathId);
      setSheets([]);
      setSummary(null);
      setSession(buildSession(ready, getState()));
    },
    [],
  );

  // Open one passage of the book being read through.
  const read = useCallback(async (sec) => {
    const state = getState();
    const tr = readingTr(state, sec.book);
    setPreparing(true);
    try {
      const verses = await loadSection(tr, sec);
      const guide = guideNow(sec.book);
      setSheets([]);
      setSummary(null);
      setReading(buildReading({ sec, sections: bookSections(sec.book, guide, tr), guide, verses, tr }));
    } catch (error) {
      toast(error?.message || 'The passage could not be loaded.');
      if (['needs-key', 'auth', 'license'].includes(error?.kind)) setSheets([{ type: 'niv' }]);
    } finally {
      setPreparing(false);
    }
  }, []);

  const go = useCallback((next) => {
    setTab(next);
    setSheets([]);
    mainRef.current?.scrollTo({ top: 0 });
  }, []);

  useBack(() => go(home), { active: onboarded && tab !== home });

  const ctx = useMemo(() => ({ start, read, openSheet, closeSheet, go, openVerse: (id) => openSheet({ type: 'verse', id }) }), [start, read, openSheet, closeSheet, go]);

  const sheetView = sheets.map((s) => {
    const close = () => closeSheet(s.type);
    switch (s.type) {
      case 'verse':
        return <VerseSheet key="verse" id={s.id} onClose={close} />;
      case 'add':
        return <AddVerseSheet key="add" onClose={close} />;
      case 'paths':
        return <PathsSheet key="paths" onClose={close} />;
      case 'niv':
        return <NivSheet key="niv" onClose={close} />;
      case 'problem':
        return <TextProblemSheet key="problem" {...s} onClose={close} />;
      case 'books':
        return <BooksSheet key="books" onClose={close} />;
      case 'section':
        return <SectionSheet key="section" id={s.id} onClose={close} />;
      case 'plans':
        return <PlansSheet key="plans" onClose={close} />;
      case 'journal':
        return <JournalSheet key="journal" onClose={close} />;
      default:
        return null;
    }
  });

  let body;
  if (!onboarded) {
    body = <Onboarding />;
  } else if (session) {
    body = (
      <Lesson
        key={session.startedAt}
        session={session}
        onExit={() => setSession(null)}
        onFinish={(results) => {
          setSummary(finishSession(session, results));
          setSession(null);
        }}
      />
    );
  } else if (reading) {
    body = (
      <Reading
        key={reading.startedAt}
        session={reading}
        onExit={() => setReading(null)}
        onFinish={(results) => {
          const result = finishReading(reading, results);
          // In a reading plan, a finished book leads on to the plan's next one.
          const plan = planProgress(getState());
          if (result.reading.bookDone && plan?.book) {
            setReadingBook(plan.book);
            loadGuide(plan.book)
              .then(() => setSummary((s) => s && { ...s }))
              .catch(() => {});
          }
          prefetchSection(readingTr(getState()), nextReading(getState()));
          setSummary(result);
          setReading(null);
        }}
      />
    );
  } else if (summary?.kind === 'reading') {
    const next = nextReading(getState());
    body = (
      <LessonComplete
        summary={summary}
        onDone={() => {
          setSummary(null);
          mainRef.current?.scrollTo({ top: 0 });
        }}
        onMore={next ? () => read(next) : null}
        moreLabel="Read the next passage"
      />
    );
  } else if (summary) {
    // A lesson that fell short of its pass mark is offered again straight away.
    const missed = summary.changes.find((c) => c.note === 'almost');
    const more = missed ? learnPlan(getState(), missed.id) : planNext(getState());
    body = (
      <LessonComplete
        summary={summary}
        onDone={() => {
          setSummary(null);
          mainRef.current?.scrollTo({ top: 0 });
        }}
        onMore={more ? () => start(more) : null}
        moreLabel={missed ? 'Try again' : more ? (more.kind === 'review' ? 'Review next' : more.kind === 'practice' ? 'Practise more' : 'Next lesson') : null}
      />
    );
  } else {
    body = (
      <div className="app">
        <main className="app-main" ref={mainRef}>
          <UpdateNote />
          {tab === 'path' && <Home />}
          {tab === 'read' && <Read />}
          {tab === 'verses' && <Library />}
          {tab === 'treasury' && <Treasury />}
          {tab === 'me' && <Profile />}
        </main>
        <TabBar tab={tab} />
      </div>
    );
  }

  return (
    <AppContext.Provider value={ctx}>
      <GoldDefs />
      <TopEdge key={`edge-${!onboarded ? 'onboarding' : session ? session.startedAt : reading ? reading.startedAt : summary ? 'summary' : tab}`} />
      {body}
      {sheetView}
      {preparing && (
        <div className="preparing" role="status">
          <Woolly size={150} act="loading" />
          <p>Unrolling the scroll…</p>
        </div>
      )}
      <WoollyCameo />
      <Overlays />
    </AppContext.Provider>
  );
}
