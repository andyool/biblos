import { useRef, useState } from 'react';
import { useStore } from '../lib/store.js';
import { useApp } from '../AppContext.js';
import Glyph from '../components/Glyph.jsx';
import Sheet from '../components/Sheet.jsx';
import { Divider, EmblemBadge, Frame } from '../components/Ornaments.jsx';
import TranslationPicker from '../components/TranslationPicker.jsx';
import { GOALS, LEVELS, titleFor } from '../data/levels.js';
import { TRANSLATIONS, getTranslation } from '../data/translations.js';
import { FONTS, TEXT_SIZES, THEMES } from '../data/shop.js';
import { addDays, dayKey } from '../lib/dates.js';
import { resetEverything, restoreBackup, setAutoTheme, updateProfile, updateSettings, equip } from '../lib/actions.js';
import { exportBackup, readBackup, isAndroid, isIOS, isStandalone } from '../lib/device.js';
import { hasYouVersion, useYouVersionReady } from '../lib/bible.js';
import { bibleTr, downloadAll, offlineSupported, removeSaved, useOffline } from '../lib/offline.js';
import { ask, toast } from '../lib/ui.js';
import { SKILLS, weakestSkill } from '../lib/adapt.js';

function ThemeChips({ themes, isOn }) {
  return (
    <div className="chip-row wrap">
      {themes.map((t) => (
        <button key={t.id} className={`chip ${isOn(t.id) ? 'is-on' : ''}`} onClick={() => equip('theme', t.id)} aria-pressed={isOn(t.id)}>
          <span className="chip-dot" style={{ background: t.colors[0], boxShadow: `inset 0 0 0 3px ${t.colors[2]}` }} /> {t.name}
        </button>
      ))}
    </div>
  );
}

function Heatmap({ days }) {
  const weeks = 16;
  const today = dayKey();
  const dow = (new Date().getDay() + 6) % 7; // Monday first
  const startKey = addDays(today, 6 - dow - (weeks * 7 - 1));
  const cells = [];
  for (let i = 0; i < weeks * 7; i += 1) {
    const key = addDays(startKey, i);
    const xp = days[key] || 0;
    const future = key > today;
    const lvl = future ? -1 : xp === 0 ? 0 : xp < 15 ? 1 : xp < 35 ? 2 : xp < 70 ? 3 : 4;
    cells.push(<i key={key} className={`heat heat-${lvl}`} title={`${key}: ${xp} XP`} />);
  }
  return (
    <div className="heatmap" style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }}>
      {cells}
    </div>
  );
}

function Stat({ icon, value, label, lit }) {
  return (
    <div className="stat-tile">
      <Glyph name={icon} size={20} lit={lit} className={icon === 'coin' ? 'coin' : ''} />
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Row({ icon, label, value, onClick, children }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className="row" onClick={onClick}>
      <Glyph name={icon} size={20} />
      <span className="row-label">{label}</span>
      {value && <span className="row-value">{value}</span>}
      {children}
      {onClick && <Glyph name="chevron" size={16} className="row-chev" />}
    </Tag>
  );
}

const SKILL_ICONS = { flow: 'path', wording: 'quill', recall: 'heart', reference: 'scroll', distinct: 'key', fluency: 'bolt' };

/** How each memory skill is going, and which one lessons are leaning towards. */
function Skills({ skills }) {
  const shown = Object.keys(SKILLS).filter((k) => skills?.[k]?.n);
  if (!shown.length) return null;
  const weakest = weakestSkill(skills);
  return (
    <>
      <h2 className="section-heading">How you remember</h2>
      <div className="rows">
        {shown.map((k) => {
          const pct = Math.round(skills[k].a * 100);
          return (
            <div className={`row skill-row ${k === weakest ? 'is-focus' : ''}`} key={k}>
              <Glyph name={SKILL_ICONS[k]} size={20} />
              <div className="row-label">
                {SKILLS[k].name}
                {k === weakest && <span className="skill-tag">Focus</span>}
                <span className="row-note">{SKILLS[k].desc}</span>
                <span className="mini-bar">
                  <span className="mini-bar-done" style={{ width: `${pct}%` }} />
                </span>
              </div>
              <span className="row-value">{pct}%</span>
            </div>
          );
        })}
      </div>
      <p className="small-print">
        {weakest
          ? `Lessons lean towards ${SKILLS[weakest].name.toLowerCase()} for now — ${SKILLS[weakest].desc.toLowerCase()} — and aim at the words you stumble on.`
          : 'Lessons give every kind of exercise its turn, and aim at the words you stumble on.'}
      </p>
    </>
  );
}

function Offline({ tr }) {
  const { progress, saved } = useOffline();
  const niv = getTranslation(tr).source === 'yv';
  const unfinished = !progress.running && progress.tr === tr && progress.total > 0 && (progress.done < progress.total || progress.failed > 0);

  const onDownload = async () => {
    if (navigator.onLine === false) {
      toast('Connect to the internet first, then try again.');
      return;
    }
    const result = await downloadAll();
    if (result.done < result.total) toast('The connection dropped. Tap again to finish when you’re back online.');
    else if (result.failed) toast(`${result.failed} ${result.failed === 1 ? 'chapter' : 'chapters'} didn’t download. Tap again to finish.`);
    else toast(`The ${result.tr} is saved for offline`, 'check');
  };

  const onRemove = async (id) => {
    const ok = await ask({ title: `Remove the ${id}?`, message: 'It will need a connection again until you download it.', confirm: 'Remove', danger: true });
    if (!ok) return;
    await removeSaved(id);
    toast(`The ${id} was removed from this phone`);
  };

  // The Bible you read in comes first: downloading, ready to download, or saved.
  let current = null;
  if (progress.running) {
    const pct = Math.round((progress.done / progress.total) * 100) || 0;
    current = (
      <div className="row">
        <Glyph name="upload" size={20} />
        <div className="row-label">
          Saving the {progress.tr}…
          <span className="mini-bar">
            <span className="mini-bar-done" style={{ width: `${pct}%` }} />
          </span>
        </div>
        <span className="row-value">{pct}%</span>
      </div>
    );
  } else if (!niv && (!saved[tr] || unfinished)) {
    current = <Row icon="upload" label={`${unfinished ? 'Finish downloading' : 'Download'} the ${tr}`} onClick={onDownload} />;
  }

  const ids = Object.keys(saved)
    .filter((id) => !(current && id === (progress.running ? progress.tr : tr)))
    .sort((a, b) => (a === tr ? -1 : b === tr ? 1 : saved[b].at - saved[a].at));

  return (
    <>
      <h2 className="section-heading">Use it offline</h2>
      <p className="small-print">
        {niv
          ? 'The NIV can’t be downloaded, because YouVersion only lets Biblos fetch it a little at a time. NIV memory verses you have already opened stay on this phone. To read the whole Bible offline, choose another translation, then download it here.'
          : 'Save the whole Bible and every memory verse on this phone, so Biblos works with no signal. Each translation takes about 6 MB, and you can keep several. Best done on Wi-Fi; it takes a few minutes.'}
      </p>
      {(current || ids.length > 0) && (
        <div className="rows">
          {current}
          {ids.map((id) => (
            <div className="row" key={id}>
              <Glyph name="check" size={20} />
              <span className="row-label">{id}</span>
              <span className="row-value">Saved {new Date(saved[id].at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
              <button className="row-action" onClick={() => onRemove(id)} aria-label={`Remove the ${id} from this phone`}>
                <Glyph name="trash" size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function Profile() {
  const state = useStore();
  const { openSheet, go } = useApp();
  const { profile, stats, settings, verses } = state;
  const nivReady = useYouVersionReady();
  const [editingName, setEditingName] = useState(false);
  const [sheet, setSheet] = useState(null);
  const fileRef = useRef(null);
  const all = Object.values(verses);
  const counts = LEVELS.map((l) => all.filter((v) => v.level === l.n).length);
  const memorised = counts[4] + counts[5];
  const title = titleFor(memorised);
  const since = new Date(profile.since).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const ownedThemes = THEMES.filter((t) => state.owned.theme.includes(t.id));

  const onImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = await readBackup(file);
      const ok = await ask({ title: 'Restore this backup?', message: 'Your current progress on this device will be replaced.', confirm: 'Restore' });
      if (ok) {
        restoreBackup(data);
        toast('Backup restored', 'check');
      }
    } catch (err) {
      toast(err.message || 'That file could not be read.');
    }
  };

  const onExport = async () => {
    const result = await exportBackup();
    if (result === 'downloaded') toast('Backup saved to your downloads', 'check');
  };

  const onReset = async () => {
    const ok = await ask({ title: 'Erase all progress?', message: 'Every verse, streak, talent and seal will be cleared from this device. This cannot be undone.', confirm: 'Erase everything', danger: true });
    if (ok) {
      resetEverything();
      go('path');
    }
  };

  return (
    <div className="screen profile">
      <Frame className="profile-card" size={40}>
        <button className="profile-emblem" onClick={() => go('treasury')} aria-label="Change emblem">
          <EmblemBadge id={profile.emblem} size={84} />
        </button>
        {editingName ? (
          <input
            className="input name-input"
            autoFocus
            defaultValue={profile.name}
            maxLength={28}
            onBlur={(e) => {
              updateProfile({ name: e.target.value.trim() });
              setEditingName(false);
            }}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
        ) : (
          <button className="profile-name" onClick={() => setEditingName(true)}>
            <span className="script-name gold-text">{profile.name || 'Pilgrim'}</span>
            <Glyph name="pen" size={14} />
          </button>
        )}
        <p className="profile-title">
          {title} · since {since}
        </p>
      </Frame>

      <div className="stat-grid">
        <Stat icon="lamp" lit value={stats.streak} label="day streak" />
        <Stat icon="crown" value={stats.bestStreak} label="best streak" />
        <Stat icon="heart" value={memorised} label="memorised" />
        <Stat icon="sparkle" value={stats.xp.toLocaleString()} label="total XP" />
        <Stat icon="star" value={stats.perfect} label="flawless" />
        <Stat icon="book" value={stats.lessons} label="lessons" />
      </div>

      <h2 className="section-heading">Faithfulness</h2>
      <Heatmap days={stats.days} />

      <h2 className="section-heading">Your garden</h2>
      <div className="garden">
        {LEVELS.slice(1).map((l) => (
          <div key={l.n} className={`garden-cell level-${l.n}`}>
            <Glyph name={l.icon} size={22} />
            <strong>{counts[l.n]}</strong>
            <span>{l.short || l.name}</span>
          </div>
        ))}
      </div>

      <Skills skills={stats.skills} />

      <Divider width={200} className="center spaced" />

      <h2 className="section-heading">Settings</h2>
      <div className="rows">
        <Row icon="book" label="Bible translation" value={settings.translation} onClick={() => setSheet('translation')} />
        <Row icon="key" label="NIV access" value={nivReady ? 'Connected' : 'Not connected'} onClick={() => openSheet({ type: 'niv' })} />
        <Row icon="target" label="Daily goal" value={`${GOALS.find((g) => g.xp === settings.dailyGoal)?.name || ''} · ${settings.dailyGoal} XP`} onClick={() => setSheet('goal')} />
        <Row icon="sparkle" label="Theme" value={settings.autoTheme ? 'Matches your phone' : THEMES.find((t) => t.id === settings.theme)?.name} onClick={() => setSheet('look')} />
        <Row icon="eye" label="Text size" value={(TEXT_SIZES.find((t) => t.scale === settings.textSize) || TEXT_SIZES[0]).name} onClick={() => setSheet('text')} />
        <label className="row">
          <Glyph name="speaker" size={20} />
          <span className="row-label">Sound effects</span>
          <input type="checkbox" className="switch" checked={settings.sound} onChange={(e) => updateSettings({ sound: e.target.checked })} />
        </label>
        <div className="row row-slider">
          <Glyph name="speaker" size={20} />
          <span className="row-label">Reading voice speed</span>
          <input type="range" min="0.6" max="1.2" step="0.05" value={settings.speechRate} onChange={(e) => updateSettings({ speechRate: Number(e.target.value) })} />
        </div>
      </div>

      {offlineSupported() && <Offline tr={bibleTr(state)} />}

      <h2 className="section-heading">Keep your progress safe</h2>
      <p className="small-print">Progress is stored on this phone. Save a backup now and then — you can restore it on any device.</p>
      <div className="rows">
        <Row
          icon="share"
          label="Save a backup"
          value={settings.lastBackup ? `Last ${new Date(settings.lastBackup).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : 'Never'}
          onClick={onExport}
        />
        <Row icon="upload" label="Restore from a backup" onClick={() => fileRef.current?.click()} />
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImport} />
        {!isStandalone() && <Row icon="phone" label="Add to Home Screen" onClick={() => setSheet('install')} />}
      </div>

      <h2 className="section-heading">About</h2>
      <div className="about">
        <p>
          <em>Biblos</em> helps you hide God’s word in your heart, a few minutes at a time. Verses grow from <strong>Sown</strong> to <strong>Hidden in the Heart</strong> as you recall them across days and weeks.
        </p>
        <p className="small-print">
          Bible text loads from bolls.life and, for the NIV, the YouVersion Platform.{' '}
          {TRANSLATIONS.filter((t) => t.copyright !== 'Public domain.')
            .map((t) => t.copyright)
            .join(' ')}
        </p>
      </div>
      <button className="btn btn-ghost btn-block btn-danger-text" onClick={onReset}>
        <Glyph name="trash" size={16} /> Erase all progress
      </button>

      {sheet === 'translation' && (
        <Sheet title="Your Bible" onClose={() => setSheet(null)}>
          <p className="lead">New verses use this translation. Verses you have already begun keep their own — change one from its page.</p>
          <TranslationPicker
            value={settings.translation}
            onPick={(id) => {
              updateSettings({ translation: id });
              setSheet(null);
              if (getTranslation(id).source === 'yv' && !hasYouVersion()) openSheet({ type: 'niv' });
            }}
          />
        </Sheet>
      )}
      {sheet === 'goal' && (
        <Sheet title="Daily goal" onClose={() => setSheet(null)}>
          <div className="goal-list">
            {GOALS.map((g) => (
              <button
                key={g.xp}
                className={`goal-item ${settings.dailyGoal === g.xp ? 'is-on' : ''}`}
                onClick={() => {
                  updateSettings({ dailyGoal: g.xp });
                  setSheet(null);
                }}
              >
                <strong>{g.name}</strong>
                <span>
                  {g.xp} XP · {g.desc}
                </span>
              </button>
            ))}
          </div>
        </Sheet>
      )}
      {sheet === 'look' && (
        <Sheet title="Appearance" onClose={() => setSheet(null)}>
          <p className="small-print">Your themes and lettering. More wait in the Treasury.</p>
          <div className="rows">
            <label className="row">
              <Glyph name="sun" size={20} />
              <span className="row-label">
                Match my phone
                <small className="row-note">Light when your phone is light, dark when it is dark</small>
              </span>
              <input type="checkbox" className="switch" checked={Boolean(settings.autoTheme)} onChange={(e) => setAutoTheme(e.target.checked)} />
            </label>
          </div>
          {settings.autoTheme ? (
            <>
              <p className="small-print">Light</p>
              <ThemeChips themes={ownedThemes.filter((t) => t.light)} isOn={(id) => id === settings.lightTheme} />
              <p className="small-print">Dark</p>
              <ThemeChips themes={ownedThemes.filter((t) => !t.light)} isOn={(id) => id === settings.darkTheme} />
            </>
          ) : (
            <ThemeChips themes={ownedThemes} isOn={(id) => id === settings.theme} />
          )}
          <div className="chip-row wrap">
            {FONTS.filter((f) => state.owned.font.includes(f.id)).map((f) => (
              <button key={f.id} className={`chip ${settings.verseFont === f.id ? 'is-on' : ''}`} onClick={() => equip('font', f.id)} style={{ fontFamily: f.family }}>
                {f.name}
              </button>
            ))}
          </div>
          <button
            className="btn btn-gold btn-block"
            onClick={() => {
              setSheet(null);
              go('treasury');
            }}
          >
            Visit the Treasury
          </button>
        </Sheet>
      )}
      {sheet === 'text' && (
        <Sheet title="Text size" onClose={() => setSheet(null)}>
          <p className="small-print">Every word in Biblos grows with it, verses included.</p>
          <div className="goal-list">
            {TEXT_SIZES.map((t) => (
              <button key={t.scale} className={`goal-item ${(settings.textSize || 1) === t.scale ? 'is-on' : ''}`} onClick={() => updateSettings({ textSize: t.scale })} aria-pressed={(settings.textSize || 1) === t.scale}>
                <strong>{t.name}</strong>
                <span style={{ fontSize: `${17 * t.scale}px` }}>Thy word is a lamp unto my feet</span>
              </button>
            ))}
          </div>
        </Sheet>
      )}
      {sheet === 'install' && (
        <Sheet title="Add to Home Screen" onClose={() => setSheet(null)}>
          <ol className="steps">
            {/* Only this phone's steps, or both when we can't tell. */}
            <li>{isIOS() ? 'Open this page in Safari.' : isAndroid() ? 'Open this page in Chrome.' : 'Open this page in Safari (on iPhone) or Chrome (on Android).'}</li>
            {!isAndroid() && (
              <li>
                {isIOS() ? 'Tap' : 'iPhone: tap'} <Glyph name="share" size={15} className="inline-glyph" /> <strong>Share</strong>, then <strong>Add to Home Screen</strong>.
              </li>
            )}
            {!isIOS() && (
              <li>
                {isAndroid() ? 'Tap' : 'Android: tap'} the <strong>⋮</strong> menu at the top right, then <strong>Install app</strong> or <strong>Add to Home screen</strong>.
              </li>
            )}
            <li>Open Biblos from the new icon. It runs full-screen and works offline.</li>
            <li>
              On Wi-Fi, go to <strong>Me → Use it offline</strong> and download your Bible, so it works with no signal.
            </li>
          </ol>
          {!isAndroid() && <p className="small-print">On iPhone the Home Screen app keeps its own progress, separate from Safari — so start using it from the icon.</p>}
        </Sheet>
      )}
    </div>
  );
}
