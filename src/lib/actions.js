import { getState, setState, freshState, migrate, withoutNiv } from './store.js';
import { DAY, addDays, dayKey, daysBetween } from './dates.js';
import { newSchedule, review, spread, HIDDEN_AFTER_DAYS } from './srs.js';
import { FADED_AFTER_DAYS, GROWTH_PER_DAY, PASS_MARK, grownToday, stepXp } from './lesson.js';
import { newlyEarned } from '../data/achievements.js';
import { levelReward, xpLevel } from '../data/levels.js';
import { OIL, SHOP, isLightTheme, themeFor } from '../data/shop.js';
import { clearTexts, replaceTexts } from './texts.js';
import { carryOver } from './reading.js';
import { planProgress } from './plans.js';
import { updateSkills, updateWeak } from './adapt.js';

// ── Settings & profile ─────────────────────────────────────────────────────────

export function updateSettings(patch) {
  setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
}

// The secret word that unlocks the NIV, kept as a hash so it can't be read straight from the code.
// It's a light lock, not real security: anyone who digs into the app could get round it.
const NIV_WORD = 2087556069;
const hashWord = (word) => [...word.trim().toLowerCase()].reduce((h, ch) => ((h * 33) ^ ch.charCodeAt(0)) >>> 0, 5381);

/** Unlock the NIV on this phone, and go back to it if it was put away. False if the word is wrong. */
export function unlockNiv(word) {
  if (hashWord(word) !== NIV_WORD) return false;
  setState((s) => {
    const { nivWas, ...settings } = s.settings;
    return { ...s, settings: { ...settings, nivUnlocked: true, translation: nivWas || settings.translation } };
  });
  return true;
}

export function lockNiv() {
  setState((s) => withoutNiv({ ...s, settings: { ...s.settings, nivUnlocked: false } }));
}

export function updateProfile(patch) {
  setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
}

export function setActivePath(id) {
  updateSettings({ activePath: id });
}

// ── Verses ─────────────────────────────────────────────────────────────────────

export function addCustomVerses(ids, tr) {
  setState((s) => {
    const verses = { ...s.verses };
    for (const id of ids) {
      if (!verses[id]) verses[id] = { id, tr, level: 0, added: Date.now() };
    }
    const custom = [...s.custom, ...ids.filter((id) => !s.custom.includes(id))];
    return awardAchievements({ ...s, verses, custom }).state;
  });
}

export function removeCustomVerse(id) {
  setState((s) => {
    const verses = { ...s.verses };
    delete verses[id];
    return { ...s, verses, custom: s.custom.filter((c) => c !== id) };
  });
}

export function resetVerse(id) {
  setState((s) => {
    const verses = { ...s.verses };
    if (s.custom.includes(id)) verses[id] = { id, tr: verses[id]?.tr || s.settings.translation, level: 0, added: Date.now() };
    else delete verses[id];
    return { ...s, verses };
  });
}

/** Switch one verse to another translation. Its progress restarts gently (at most Sown). */
export function setVerseTranslation(id, tr) {
  setState((s) => {
    const old = s.verses[id];
    const level = Math.min(old?.level || 0, 1);
    return {
      ...s,
      verses: { ...s.verses, [id]: { ...(old || { id, added: Date.now() }), id, tr, level, srs: undefined, weak: undefined } },
    };
  });
}

// ── Streaks ────────────────────────────────────────────────────────────────────

/** Bring the streak up to date for today: lamp oil covers missed days, otherwise it resets. */
function reconcileStats(stats, today) {
  if (!stats.lastActiveDay) return { stats, event: null };
  const gap = daysBetween(stats.lastActiveDay, today);
  if (gap <= 1) return { stats, event: null };
  const missed = gap - 1;
  if (stats.streak > 0 && stats.freezes >= missed) {
    return {
      stats: { ...stats, freezes: stats.freezes - missed, lastActiveDay: addDays(today, -1) },
      event: { type: 'oil', missed },
    };
  }
  if (stats.streak === 0) return { stats, event: null };
  return { stats: { ...stats, streak: 0 }, event: { type: 'lost', streak: stats.streak } };
}

export function checkStreak() {
  let event = null;
  setState((s) => {
    const r = reconcileStats(s.stats, dayKey());
    event = r.event;
    return r.stats === s.stats ? s : { ...s, stats: r.stats };
  });
  return event;
}

// ── Achievements ───────────────────────────────────────────────────────────────

/** The adornments that come with the seals you have: emblems, frames and themes. */
function withUnlocks(state) {
  let owned = state.owned;
  for (const [kind, items] of Object.entries(SHOP)) {
    const add = items.filter((i) => i.unlock && state.achievements[i.unlock] && !owned[kind].includes(i.id)).map((i) => i.id);
    if (add.length) owned = { ...owned, [kind]: [...owned[kind], ...add] };
  }
  return owned === state.owned ? state : { ...state, owned };
}

/** Give the adornments for seals earned before those adornments came with them. */
export function claimUnlocks() {
  setState(withUnlocks);
}

function awardAchievements(state) {
  const earned = newlyEarned(state);
  if (!earned.length) return { state, earned };
  const achievements = { ...state.achievements };
  let talents = state.stats.talents;
  for (const a of earned) {
    achievements[a.id] = Date.now();
    talents += a.reward;
  }
  return { state: withUnlocks({ ...state, achievements, stats: { ...state.stats, talents } }), earned };
}

// ── Finishing a lesson ─────────────────────────────────────────────────────────

const STREAK_BONUS = { 7: 25, 30: 75, 100: 200, 365: 500 };

const REVIEW_GRADED = new Set(['letters', 'reference', 'opening']);

/**
 * Count practice towards today: XP, the daily goal, the streak, levels and the early/late seals.
 * The first lesson or reading of the day is first fruits, and counts double.
 */
function creditDay(stats, earned, dailyGoal, now) {
  const today = dayKey(now);
  const hour = new Date(now).getHours();
  const before = stats.days[today] || 0;
  const firstFruits = before === 0;
  const xp = firstFruits ? earned * 2 : earned;
  const after = before + xp;
  const goalReached = before < dailyGoal && after >= dailyGoal;
  let talents = goalReached ? 5 : 0;

  // Each level reached brings talents.
  const from = xpLevel(stats.xp).level;
  const to = xpLevel(stats.xp + xp).level;
  let levelTalents = 0;
  for (let level = from + 1; level <= to; level += 1) levelTalents += levelReward(level);
  talents += levelTalents;

  let streakExtended = false;
  let streak = stats.streak;
  if (stats.lastActiveDay !== today) {
    const gap = stats.lastActiveDay ? daysBetween(stats.lastActiveDay, today) : null;
    streak = gap === 1 ? stats.streak + 1 : 1;
    streakExtended = true;
    talents += STREAK_BONUS[streak] || 0;
  }

  return {
    stats: {
      ...stats,
      xp: stats.xp + xp,
      streak,
      bestStreak: Math.max(stats.bestStreak, streak),
      lastActiveDay: today,
      days: { ...stats.days, [today]: after },
      goalDays: stats.goalDays + (goalReached ? 1 : 0),
      morning: stats.morning || hour < 7,
      night: stats.night || hour >= 22,
    },
    talents,
    xp,
    firstFruits,
    levelUp: to > from ? { from, to, talents: levelTalents } : null,
    streak,
    streakExtended,
    goalReached,
    dailyXp: after,
  };
}

/**
 * Apply a finished session. results: [{ verseId, type, hint, correct, mistakes }]
 * Returns a summary for the celebration screen.
 */
export function finishSession(session, results) {
  const now = Date.now();
  const today = dayKey(now);
  let summary = null;

  setState((s0) => {
    let { stats } = reconcileStats(s0.stats, today);
    const verses = { ...s0.verses };

    // Accuracy per verse grades it. Reading steps don't count, nor do joins with the verses
    // either side, nor a second try after a poor recall: a review is graded on the first.
    // A review is graded on recall and the reference alone: the exercises after the recalls
    // are practice.
    const graded = results.filter((r) => r.type !== 'read');
    const per = {};
    const missed = {};
    for (const r of graded) {
      if (r.missed?.length && r.type !== 'link') (missed[r.verseId] ||= []).push(...new Set(r.missed));
      if (r.type === 'link' || r.relearn) continue;
      if (session.kind === 'review' && !REVIEW_GRADED.has(r.type)) continue;
      per[r.verseId] ||= { correct: 0, mistakes: 0 };
      per[r.verseId].correct += r.correct;
      per[r.verseId].mistakes += r.mistakes;
    }
    const accOf = (id) => {
      const p = per[id];
      return p && p.correct + p.mistakes > 0 ? p.correct / (p.correct + p.mistakes) : 1;
    };
    const totalCorrect = graded.reduce((a, r) => a + r.correct, 0);
    const totalMistakes = graded.reduce((a, r) => a + r.mistakes, 0);
    const accuracy = totalCorrect + totalMistakes ? totalCorrect / (totalCorrect + totalMistakes) : 1;
    const perfect = totalMistakes === 0;

    let talents = 3 + (perfect ? 2 : 0);
    const changes = [];

    // How many reviews fall on each day, so new ones can be spread over the quieter days.
    const load = {};
    for (const v of Object.values(verses)) {
      if (v.srs && !session.verseIds.includes(v.id)) load[dayKey(v.srs.due)] = (load[dayKey(v.srs.due)] || 0) + 1;
    }

    for (const id of session.verseIds) {
      if (!per[id] && session.kind !== 'learn') continue;
      const old = verses[id] || { id, tr: session.trs[id], level: 0, added: now };
      const v = { ...old, tr: session.trs[id], lastPracticed: now, lessons: (old.lessons || 0) + 1, started: old.started || now };
      // The words stumbled on, so the next lessons can aim at them.
      v.weak = updateWeak(old.weak, missed[id]);
      const acc = accOf(id);
      const from = old.level || 0;
      let to = from;
      let note = null;

      if (session.kind === 'learn' && from < 4) {
        const grown = grownToday(old, now);
        if (grown >= GROWTH_PER_DAY) {
          note = 'rest';
        } else if (acc < PASS_MARK[from] && from >= 2 && now - (old.lastPracticed || now) >= FADED_AFTER_DAYS * DAY) {
          // Left a long while, it has faded: a stage back, so the next lesson is gentler.
          to = from - 1;
          note = 'faded';
        } else if (acc < PASS_MARK[from]) {
          note = 'almost';
        } else {
          to = from + 1;
          v.grew = { day: today, n: grown + 1 };
          if (to === 4) {
            v.srs = newSchedule(now);
            talents += 10;
          }
        }
      } else if (session.kind === 'review' || (session.kind === 'recite' && old.srs && old.srs.due <= now)) {
        const next = spread(review(old.srs, acc, now), load);
        v.srs = next;
        load[dayKey(next.due)] = (load[dayKey(next.due)] || 0) + 1;
        if (next.q < 3) note = 'lapse';
        if (next.interval >= HIDDEN_AFTER_DAYS && from === 4) {
          to = 5;
          talents += 20;
        } else if (next.q < 3 && from === 5) {
          to = 4;
        }
        stats = { ...stats, reviews: stats.reviews + 1 };
      } else if (from >= 4 && acc < 0.6 && old.srs) {
        // A shaky practice brings the next review forward.
        v.srs = { ...old.srs, due: now };
        note = 'lapse';
      }
      v.level = to;
      verses[id] = v;
      changes.push({ id, from, to, acc, note, due: v.srs?.due || null });
    }

    const xp = results.reduce((sum, r) => sum + (r.xp ?? stepXp(r)), 0) + 5 + (perfect ? 5 : 0);
    const day = creditDay(stats, xp, s0.settings.dailyGoal, now);
    talents += day.talents;
    const letters = results.filter((r) => r.type === 'letters' || r.type === 'link').reduce((a, r) => a + r.correct, 0);

    // How each skill is going, and which exercises were done, so the next lessons can lean
    // towards the weakest skill and give every exercise its turn.
    const done = results.filter((r) => r.type !== 'read').map((r) => r.type);
    const acts = { ...stats.acts };
    done.forEach((t) => (acts[t] = (acts[t] || 0) + 1));

    stats = {
      ...day.stats,
      talents: stats.talents + talents,
      lessons: stats.lessons + 1,
      perfect: stats.perfect + (perfect ? 1 : 0),
      letters: stats.letters + letters,
      skills: updateSkills(stats.skills, results),
      recent: [...(stats.recent || []), ...done].slice(-24),
      acts,
    };

    const awarded = awardAchievements({ ...s0, verses, stats });
    const earnedTalents = awarded.earned.reduce((a, e) => a + e.reward, 0);
    summary = {
      kind: session.kind,
      xp: day.xp,
      firstFruits: day.firstFruits,
      levelUp: day.levelUp,
      totalXp: day.stats.xp,
      talents: talents + earnedTalents,
      accuracy,
      perfect,
      changes,
      streak: day.streak,
      streakExtended: day.streakExtended,
      goalReached: day.goalReached,
      dailyXp: day.dailyXp,
      dailyGoal: s0.settings.dailyGoal,
      earned: awarded.earned,
    };
    return awarded.state;
  });
  return summary;
}

// ── Reading through a book ─────────────────────────────────────────────────────

export function setReadingBook(code) {
  setState((s) => ({ ...s, reading: { ...s.reading, book: code } }));
}

/** Follow a reading plan from today, reading on from its first unfinished book. */
export function startPlan(id) {
  setState((s) => ({ ...s, reading: { ...s.reading, plan: { id, started: Date.now() } } }));
  const next = planProgress(getState())?.book;
  if (next) setReadingBook(next);
}

export function leavePlan() {
  setState((s) => ({ ...s, reading: { ...s.reading, plan: null } }));
}

/** Keep what was read of a book under its old sections (see carryOver). */
export function carryOverReading(code, sections) {
  const book = getState().reading.books[code];
  const done = book && carryOver(book.done, sections);
  if (!done) return;
  setState((s) => ({ ...s, reading: { ...s.reading, books: { ...s.reading.books, [code]: { ...book, done } } } }));
}

/** Finishing a whole book of the Bible. */
export const BOOK_BONUS = 25;

/**
 * Apply a finished reading. results: [{ type, correct, mistakes, xp, note? }]
 * Returns a summary for the celebration screen.
 */
export function finishReading(session, results) {
  const now = Date.now();
  const { sec } = session;
  let summary = null;

  setState((s0) => {
    let { stats } = reconcileStats(s0.stats, dayKey(now));
    const correct = results.reduce((a, r) => a + (r.correct || 0), 0);
    const mistakes = results.reduce((a, r) => a + (r.mistakes || 0), 0);
    const perfect = mistakes === 0;
    const xp = results.reduce((sum, r) => sum + (r.xp || 0), 0) + 5 + (perfect ? 5 : 0);
    let talents = 3 + (perfect ? 2 : 0);

    const book = s0.reading.books[sec.book] || { done: {}, started: now };
    const done = { ...book.done, [sec.id]: book.done[sec.id] || now };
    const bookDone = !book.finished && session.sectionIds.every((id) => done[id]);
    if (bookDone) talents += BOOK_BONUS;

    const notes = { ...s0.reading.notes };
    const note = results.find((r) => r.note)?.note;
    if (note) notes[sec.id] = { ...notes[sec.id], note, at: now };

    const day = creditDay(stats, xp, s0.settings.dailyGoal, now);
    talents += day.talents;
    stats = {
      ...day.stats,
      talents: stats.talents + talents,
      readings: (stats.readings || 0) + 1,
      booksRead: (stats.booksRead || 0) + (bookDone ? 1 : 0),
    };

    const reading = {
      ...s0.reading,
      book: sec.book,
      books: { ...s0.reading.books, [sec.book]: { ...book, done, ...(bookDone && { finished: now }) } },
      notes,
    };
    const awarded = awardAchievements({ ...s0, stats, reading });
    summary = {
      kind: 'reading',
      xp: day.xp,
      firstFruits: day.firstFruits,
      levelUp: day.levelUp,
      totalXp: day.stats.xp,
      talents: talents + awarded.earned.reduce((a, e) => a + e.reward, 0),
      accuracy: correct + mistakes ? correct / (correct + mistakes) : 1,
      perfect,
      changes: [],
      reading: { id: sec.id, ref: session.ref, title: session.title, bookDone, book: sec.book },
      streak: day.streak,
      streakExtended: day.streakExtended,
      goalReached: day.goalReached,
      dailyXp: day.dailyXp,
      dailyGoal: s0.settings.dailyGoal,
      earned: awarded.earned,
    };
    return awarded.state;
  });
  return summary;
}

// ── Treasury ───────────────────────────────────────────────────────────────────

export function buy(kind, id) {
  const s = getState();
  const item = SHOP[kind]?.find((i) => i.id === id);
  if (!item || s.owned[kind].includes(id) || s.stats.talents < item.price) return false;
  setState({
    ...s,
    stats: { ...s.stats, talents: s.stats.talents - item.price },
    owned: { ...s.owned, [kind]: [...s.owned[kind], id] },
  });
  return true;
}

const EQUIP_KEY = { theme: 'theme', font: 'verseFont', frame: 'frame' };

export function equip(kind, id) {
  if (kind === 'emblem') updateProfile({ emblem: id });
  // A theme is also your light or your dark one, for "Match my phone".
  else if (kind === 'theme') updateSettings({ theme: id, [isLightTheme(id) ? 'lightTheme' : 'darkTheme']: id });
  else updateSettings({ [EQUIP_KEY[kind]]: id });
}

/** Turn "Match my phone" on or off. Turning it on keeps the theme you have as your light or dark one. */
export function setAutoTheme(on) {
  const { settings } = getState();
  if (on) {
    updateSettings({ autoTheme: true, [isLightTheme(settings.theme) ? 'lightTheme' : 'darkTheme']: settings.theme });
  } else {
    // Keep the theme that is showing now.
    const dark = typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
    updateSettings({ autoTheme: false, theme: themeFor(settings, dark) });
  }
}

export function buyOil() {
  const s = getState();
  if (s.stats.freezes >= OIL.max || s.stats.talents < OIL.price) return false;
  setState({ ...s, stats: { ...s.stats, talents: s.stats.talents - OIL.price, freezes: s.stats.freezes + 1 } });
  return true;
}

// ── Backup & reset ─────────────────────────────────────────────────────────────

/** Lessons and readings done so far: the backup reminder counts these. */
export const sessionsDone = (stats) => stats.lessons + (stats.readings || 0);

export function noteBackup(at = Date.now()) {
  setState((s) => ({ ...s, settings: { ...s.settings, lastBackup: at, backupCount: sessionsDone(s.stats), backupSnooze: 0 } }));
}

export function snoozeBackup(days = 7) {
  updateSettings({ backupSnooze: Date.now() + days * DAY });
}

export function restoreBackup(data) {
  // The words first, so verses whose NIV words come with the backup keep the NIV.
  if (data.texts) replaceTexts(data.texts);
  setState(migrate(data.state));
  noteBackup(Date.parse(data.exported) || Date.now());
}

export function resetEverything() {
  const keep = getState().settings;
  const fresh = freshState();
  setState({ ...fresh, settings: { ...fresh.settings, yvKey: keep.yvKey, nivUnlocked: keep.nivUnlocked, theme: keep.theme, woolly: keep.woolly, woollyLamb: keep.woollyLamb } });
  clearTexts();
}
