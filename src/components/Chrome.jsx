import { useStore } from '../lib/store.js';
import { dayKey } from '../lib/dates.js';
import { toast } from '../lib/ui.js';
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
