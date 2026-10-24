import { useEffect, useState } from 'react';
import { useStore } from '../lib/store.js';
import { dayKey } from '../lib/dates.js';
import { toast } from '../lib/ui.js';
import { sessionsDone } from '../lib/actions.js';
import Glyph from './Glyph.jsx';
import { EmblemBadge, GoalRing } from './Ornaments.jsx';
import { useApp } from '../AppContext.js';

/** Streak, talents and daily goal along the top of the main screens. */
export function TopBar() {
  const stats = useStore((s) => s.stats);
  const settings = useStore((s) => s.settings);
  const emblem = useStore((s) => s.profile.emblem);
  const { go } = useApp();
  const today = dayKey();
  const todayXp = stats.days[today] || 0;
  const lit = stats.lastActiveDay === today;

  // Before the first lesson or reading there is nothing to count yet: the streak, talents and
  // goal appear, each explained, once the first is done.
  if (!sessionsDone(stats)) {
    return (
      <header className="topbar">
        <button className="topbar-emblem" onClick={() => go('me')} aria-label="Your profile">
          <EmblemBadge id={emblem} size={38} />
        </button>
      </header>
    );
  }

  return (
    <header className="topbar">
      <button className="topbar-emblem" onClick={() => go('me')} aria-label="Your profile">
        <EmblemBadge id={emblem} size={38} />
      </button>
      <div className="topbar-stats">
        <button
          className={`stat-pill ${lit ? 'is-lit' : ''}`}
          onClick={() =>
            toast(
              lit
                ? `Your lamp is burning — ${stats.streak} day${stats.streak === 1 ? '' : 's'} in a row.`
                : stats.streak
                  ? `Practise today to keep your ${stats.streak}-day streak alight.`
                  : 'Finish a lesson today to light your lamp.',
              'lamp',
            )
          }
        >
          <Glyph name="lamp" size={22} lit={lit} />
          <span>{stats.streak}</span>
        </button>
        <button className="stat-pill" onClick={() => go('treasury')}>
          <Glyph name="coin" size={20} className="coin" />
          <span>{stats.talents}</span>
        </button>
      </div>
      <button className="topbar-goal" onClick={() => toast(`${todayXp} of ${settings.dailyGoal} XP today${todayXp >= settings.dailyGoal ? ' — goal reached!' : ''}`, 'target')} aria-label="Daily goal">
        <GoalRing value={todayXp} goal={settings.dailyGoal} size={40}>
          {todayXp >= settings.dailyGoal ? <Glyph name="check" size={16} strokeWidth={2} /> : <small>{Math.round((todayXp / settings.dailyGoal) * 100)}%</small>}
        </GoalRing>
      </button>
    </header>
  );
}

/**
 * On iPhone and iPad, iOS blurs the top edge of the page under the status bar. WebKit leaves the blur off when
 * a fixed, full-width box with a background colour sits at the top edge, and tints the edge with that colour
 * instead (LocalFrameView::fixedContainerEdges). This is that box, kept only while the page is at the top: once
 * it scrolls (the tab screens, or the document on the others), the box goes and the blur is back over the
 * passing content. Remount it (by key) when the page changes, so each page starts at the top.
 */
export function TopEdge() {
  const [atTop, setAtTop] = useState(true);
  useEffect(() => {
    const onScroll = (e) => {
      const el = e.target === document ? document.scrollingElement : e.target;
      if (el === document.scrollingElement || el.classList?.contains('app-main')) setAtTop(el.scrollTop <= 0);
    };
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => document.removeEventListener('scroll', onScroll, { capture: true });
  }, []);
  // WebKit still finds a box with opacity 0, so it has to leave the page.
  return atTop ? <div className="top-edge" aria-hidden="true" /> : null;
}

const TABS = [
  { id: 'path', label: 'Path', icon: 'path' },
  { id: 'read', label: 'Read', icon: 'scroll' },
  { id: 'verses', label: 'Verses', icon: 'book' },
  { id: 'treasury', label: 'Treasury', icon: 'treasury' },
  { id: 'me', label: 'Me', icon: null },
];

export function TabBar({ tab }) {
  const { go } = useApp();
  const emblem = useStore((s) => s.profile.emblem);
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((t) => (
        <button key={t.id} className={`tab ${tab === t.id ? 'is-active' : ''}`} onClick={() => go(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
          <span className="tab-gem" />
          <Glyph name={t.icon || emblem} size={25} strokeWidth={1.4} />
          <span className="tab-label">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

export function SectionTitle({ children, sub }) {
  return (
    <div className="section-title">
      <h2>{children}</h2>
      {sub && <p>{sub}</p>}
    </div>
  );
}
