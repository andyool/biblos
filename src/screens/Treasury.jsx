import { useState } from 'react';
import { useStore } from '../lib/store.js';
import Glyph from '../components/Glyph.jsx';
import Sheet from '../components/Sheet.jsx';
import { Corner, Divider, EmblemBadge, Seal } from '../components/Ornaments.jsx';
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID } from '../data/achievements.js';
import { EMBLEMS, FONTS, FRAMES, OIL, THEMES } from '../data/shop.js';
import { buy, buyOil, equip } from '../lib/actions.js';
import { ask, toast } from '../lib/ui.js';
import { play } from '../lib/sound.js';

function SealDetail({ id, onClose }) {
  const state = useStore();
  const a = ACHIEVEMENT_BY_ID[id];
  const earnedAt = state.achievements[id];
  const p = a.progress(state);
  return (
    <Sheet title={a.name} onClose={onClose}>
      <div className="seal-detail">
        <Seal icon={a.icon} earned={!!earnedAt} size={110} />
        <p className="lead">{a.desc}</p>
        {earnedAt ? (
          <p className="gold-soft">Earned {new Date(earnedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        ) : (
          <>
            <div className="mini-bar is-wide">
              <span className="mini-bar-done" style={{ width: `${(p.value / p.target) * 100}%` }} />
            </div>
            <p className="small-print">
              {p.value.toLocaleString()} of {p.target.toLocaleString()}
            </p>
          </>
        )}
        <p className="small-print">
          Reward: {a.reward} talents
          {EMBLEMS.find((e) => e.unlock === id) && ` and the ${EMBLEMS.find((e) => e.unlock === id).name} emblem`}
        </p>
      </div>
    </Sheet>
  );
}

function Price({ item, kind }) {
  const owned = useStore((s) => s.owned[kind]);
  const achievements = useStore((s) => s.achievements);
  if (owned.includes(item.id)) return null;
  if (item.unlock && !achievements[item.unlock]) {
    return (
      <span className="price is-locked">
        <Glyph name="lock" size={12} /> {ACHIEVEMENT_BY_ID[item.unlock].name}
      </span>
    );
  }
  return (
    <span className="price">
      <Glyph name="coin" size={13} className="coin" /> {item.price}
    </span>
  );
}

function useItemAction(kind) {
  const state = useStore();
  return async (item) => {
    const owned = state.owned[kind].includes(item.id);
    if (owned) {
      equip(kind, item.id);
      play('tap');
      return;
    }
    if (item.unlock) {
      toast(`Earn the “${ACHIEVEMENT_BY_ID[item.unlock].name}” seal to unlock this.`, 'lock');
      return;
    }
    if (state.stats.talents < item.price) {
      toast(`You need ${item.price - state.stats.talents} more talents.`, 'coin');
      return;
    }
    const ok = await ask({ title: `${item.name}`, message: `Spend ${item.price} talents?`, confirm: 'Buy' });
    if (ok && buy(kind, item.id)) {
      equip(kind, item.id);
      play('level');
      toast(`${item.name} is yours`, 'sparkle');
    }
  };
}

function Shop() {
  const state = useStore();
  const { settings, profile, stats } = state;
  const onTheme = useItemAction('theme');
  const onFont = useItemAction('font');
  const onFrame = useItemAction('frame');
  const onEmblem = useItemAction('emblem');

  const getOil = async () => {
    if (stats.freezes >= OIL.max) return toast('Your flasks are full.', 'lamp');
    if (stats.talents < OIL.price) return toast(`You need ${OIL.price - stats.talents} more talents.`, 'coin');
    const ok = await ask({ title: 'A flask of oil', message: `Spend ${OIL.price} talents? If you miss a day, the oil keeps your lamp — and your streak — burning.`, confirm: 'Buy' });
    if (ok && buyOil()) {
      play('level');
      toast('Flask filled', 'lamp');
    }
  };

  return (
    <>
      <div className="shop-oil">
        <Glyph name="lamp" size={34} lit />
        <div>
          <strong>Flask of oil</strong>
          <p>Keeps your streak alight on a missed day. You have {stats.freezes} of {OIL.max}.</p>
        </div>
        <button className="btn btn-gold btn-small" onClick={getOil} disabled={stats.freezes >= OIL.max}>
          <Glyph name="coin" size={14} /> {OIL.price}
        </button>
      </div>

      <h2 className="section-heading">Themes</h2>
      <div className="shop-grid">
        {THEMES.map((t) => (
          <button key={t.id} className={`shop-item ${settings.theme === t.id ? 'is-equipped' : ''}`} onClick={() => onTheme(t)}>
            <span className="swatch" style={{ background: `linear-gradient(140deg, ${t.colors[0]} 0 55%, ${t.colors[1]} 55% 100%)` }}>
              <span className="swatch-gold" style={{ background: t.colors[2] }} />
            </span>
            <strong>{t.name}</strong>
            {settings.theme === t.id ? <span className="equipped">In use</span> : <Price item={t} kind="theme" />}
          </button>
        ))}
      </div>

      <h2 className="section-heading">Verse lettering</h2>
      <div className="shop-grid">
        {FONTS.map((f) => (
          <button key={f.id} className={`shop-item ${settings.verseFont === f.id ? 'is-equipped' : ''}`} onClick={() => onFont(f)}>
            <span className="font-sample" style={{ fontFamily: f.family, fontSize: `${26 * f.scale}px` }}>
              Grace
            </span>
            <strong>{f.name}</strong>
            {settings.verseFont === f.id ? <span className="equipped">In use</span> : <Price item={f} kind="font" />}
          </button>
        ))}
      </div>

      <h2 className="section-heading">Frames</h2>
      <div className="shop-grid">
        {FRAMES.map((f) => (
          <button key={f.id} className={`shop-item ${settings.frame === f.id ? 'is-equipped' : ''}`} onClick={() => onFrame(f)}>
            <span className="frame-sample">
              <Corner variant={f.id} pos="tl" size={34} />
              <Corner variant={f.id} pos="br" size={34} />
            </span>
            <strong>{f.name}</strong>
            {settings.frame === f.id ? <span className="equipped">In use</span> : <Price item={f} kind="frame" />}
          </button>
        ))}
      </div>

      <h2 className="section-heading">Emblems</h2>
      <div className="shop-grid shop-grid-emblems">
        {EMBLEMS.map((e) => (
          <button key={e.id} className={`shop-item ${profile.emblem === e.id ? 'is-equipped' : ''}`} onClick={() => onEmblem(e)}>
            <EmblemBadge id={e.id} size={50} className={state.owned.emblem.includes(e.id) ? '' : 'is-dim'} />
            <strong>{e.name}</strong>
            {profile.emblem === e.id ? <span className="equipped">Worn</span> : <Price item={e} kind="emblem" />}
          </button>
        ))}
      </div>
    </>
  );
}

export default function Treasury() {
  const state = useStore();
  const [tab, setTab] = useState('seals');
  const [detail, setDetail] = useState(null);
  const earned = Object.keys(state.achievements).length;

  return (
    <div className="screen treasury">
      <h1 className="screen-title">
        <span className="gold-text">Treasury</span>
      </h1>
      <Divider width={200} className="center" />
      <div className="purse">
        <Glyph name="coin" size={44} className="coin coin-big" strokeWidth={1.3} />
        <div>
          <strong className="purse-num gold-text">{state.stats.talents.toLocaleString()}</strong>
          <span>talents</span>
        </div>
      </div>
      <p className="purse-note">Earned by faithful practice — lessons, flawless rounds, streaks and seals.</p>

      <div className="segmented" role="tablist">
        <button role="tab" aria-selected={tab === 'seals'} className={tab === 'seals' ? 'is-on' : ''} onClick={() => setTab('seals')}>
          Seals · {earned}/{ACHIEVEMENTS.length}
        </button>
        <button role="tab" aria-selected={tab === 'shop'} className={tab === 'shop' ? 'is-on' : ''} onClick={() => setTab('shop')}>
          Adornments
        </button>
      </div>

      {tab === 'seals' ? (
        <div className="seal-grid">
          {ACHIEVEMENTS.map((a) => {
            const got = !!state.achievements[a.id];
            const p = a.progress(state);
            return (
              <button key={a.id} className="seal-cell" onClick={() => setDetail(a.id)}>
                <Seal icon={a.icon} earned={got} size={74} />
                <strong>{a.name}</strong>
                {!got && p.target > 1 && (
                  <small>
                    {p.value}/{p.target}
                  </small>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <Shop />
      )}
      {detail && <SealDetail id={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
