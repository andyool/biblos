import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getState, useStore } from './lib/store.js';
import { AppContext } from './AppContext.js';
import { GoldDefs, LogoMark } from './components/Ornaments.jsx';
import { TabBar } from './components/Chrome.jsx';
import Overlays from './components/Overlays.jsx';
import Home from './screens/Home.jsx';
import Library from './screens/Library.jsx';
import Treasury from './screens/Treasury.jsx';
import Profile from './screens/Profile.jsx';
import Onboarding from './screens/Onboarding.jsx';
import Lesson from './screens/Lesson.jsx';
import LessonComplete from './screens/LessonComplete.jsx';
import VerseSheet from './sheets/VerseSheet.jsx';
import AddVerseSheet from './sheets/AddVerseSheet.jsx';
import PathsSheet from './sheets/PathsSheet.jsx';
import NivSheet from './sheets/NivSheet.jsx';
import TextProblemSheet from './sheets/TextProblemSheet.jsx';
import { buildSession, planNext, verseTr } from './lib/lesson.js';
import { checkServerKey, loadPassage } from './lib/bible.js';
import { checkStreak, finishSession, setActivePath } from './lib/actions.js';
import { fontFor, THEMES } from './data/shop.js';
import { toast } from './lib/ui.js';

const THEME_BG = Object.fromEntries(THEMES.map((t) => [t.id, t.colors[0]]));

function useAppearance() {
  const theme = useStore((s) => s.settings.theme);
  const font = useStore((s) => s.settings.verseFont);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    const f = fontFor(font);
    root.style.setProperty('--font-verse', f.family);
    root.style.setProperty('--verse-scale', String(f.scale));
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_BG[theme] || '#0a0f1d');
  }, [theme, font]);
}

export default function App() {
  useAppearance();
  const onboarded = useStore((s) => s.settings.onboarded);
  const [tab, setTab] = useState('path');
  const [sheets, setSheets] = useState([]);
  const [session, setSession] = useState(null);
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

  const go = useCallback((next) => {
    setTab(next);
    setSheets([]);
    mainRef.current?.scrollTo({ top: 0 });
  }, []);

  const ctx = useMemo(() => ({ start, openSheet, closeSheet, go, openVerse: (id) => openSheet({ type: 'verse', id }) }), [start, openSheet, closeSheet, go]);

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
  } else if (summary) {
    const more = planNext(getState());
    body = (
      <LessonComplete
        summary={summary}
        onDone={() => {
          setSummary(null);
          mainRef.current?.scrollTo({ top: 0 });
        }}
        onMore={more ? () => start(more) : null}
        moreLabel={more ? (more.kind === 'review' ? 'Review next' : more.kind === 'practice' ? 'Practise more' : 'Next lesson') : null}
      />
    );
  } else {
    body = (
      <div className="app">
        <main className="app-main" ref={mainRef}>
          {tab === 'path' && <Home />}
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
      {body}
      {sheetView}
      {preparing && (
        <div className="preparing" role="status">
          <LogoMark size={86} className="spin-slow" />
          <p>Unrolling the scroll…</p>
        </div>
      )}
      <Overlays />
    </AppContext.Provider>
  );
}
