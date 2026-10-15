import { getState, setState, freshState, migrate } from './store.js';
import { addDays, dayKey, daysBetween } from './dates.js';
import { newSchedule, review, HIDDEN_AFTER_DAYS } from './srs.js';
import { stepXp } from './lesson.js';
import { newlyEarned } from '../data/achievements.js';
import { OIL, SHOP } from '../data/shop.js';
import { clearTexts, replaceTexts } from './texts.js';

// ── Settings & profile ─────────────────────────────────────────────────────────

export function updateSettings(patch) {
  setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
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
      verses: { ...s.verses, [id]: { ...(old || { id, added: Date.now() }), id, tr, level, srs: undefined } },
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

function awardAchievements(state) {
  const earned = newlyEarned(state);
  if (!earned.length) return { state, earned };
  const achievements = { ...state.achievements };
  let talents = state.stats.talents;
  for (const a of earned) {
    achievements[a.id] = Date.now();
    talents += a.reward;
  }
  // Seals that unlock emblems
  const unlocked = SHOP.emblem.filter((e) => e.unlock && achievements[e.unlock] && !state.owned.emblem.includes(e.id)).map((e) => e.id);
  const owned = unlocked.length ? { ...state.owned, emblem: [...state.owned.emblem, ...unlocked] } : state.owned;
  return { state: { ...state, achievements, owned, stats: { ...state.stats, talents } }, earned };
}

// ── Finishing a lesson ─────────────────────────────────────────────────────────

const STREAK_BONUS = { 7: 25, 30: 75, 100: 200, 365: 500 };

/** Count practice towards today: XP, the daily goal, the streak and the early/late seals. */
function creditDay(stats, xp, dailyGoal, now) {
  const today = dayKey(now);
  const hour = new Date(now).getHours();
  const before = stats.days[today] || 0;
  const after = before + xp;
  const goalReached = before < dailyGoal && after >= dailyGoal;
  let talents = goalReached ? 5 : 0;

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

    // Accuracy per verse (reading steps don't count).
    const per = {};
    for (const r of results) {
      if (r.type === 'read') continue;
      per[r.verseId] ||= { correct: 0, mistakes: 0 };
      per[r.verseId].correct += r.correct;
      per[r.verseId].mistakes += r.mistakes;
    }
    const accOf = (id) => {
      const p = per[id];
      return p && p.correct + p.mistakes > 0 ? p.correct / (p.correct + p.mistakes) : 1;
    };
    const totalCorrect = Object.values(per).reduce((a, p) => a + p.correct, 0);
    const totalMistakes = Object.values(per).reduce((a, p) => a + p.mistakes, 0);
    const accuracy = totalCorrect + totalMistakes ? totalCorrect / (totalCorrect + totalMistakes) : 1;
    const perfect = totalMistakes === 0;

    let talents = 3 + (perfect ? 2 : 0);
    const changes = [];

    for (const id of session.verseIds) {
      if (!per[id] && session.kind !== 'learn') continue;
      const old = verses[id] || { id, tr: session.trs[id], level: 0, added: now };
      const v = { ...old, tr: session.trs[id], lastPracticed: now, lessons: (old.lessons || 0) + 1, started: old.started || now };
      const acc = accOf(id);
      const from = old.level || 0;
      let to = from;
      let note = null;

      if (session.kind === 'learn' && from < 4) {
        if (from === 3 && acc < 0.8) {
          note = 'almost';
        } else {
          to = from + 1;
          if (to === 4) {
            v.srs = newSchedule(now);
            talents += 10;
          }
        }
      } else if (session.kind === 'review' || (session.kind === 'recite' && old.srs && old.srs.due <= now)) {
        const next = review(old.srs, acc, now);
        v.srs = next;
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
    const letters = results.filter((r) => r.type === 'letters').reduce((a, r) => a + r.correct, 0);

    stats = {
      ...day.stats,
      talents: stats.talents + talents,
      lessons: stats.lessons + 1,
      perfect: stats.perfect + (perfect ? 1 : 0),
      letters: stats.letters + letters,
    };

    const awarded = awardAchievements({ ...s0, verses, stats });
    const earnedTalents = awarded.earned.reduce((a, e) => a + e.reward, 0);
    summary = {
      kind: session.kind,
      xp,
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

/** Finishing a whole book of the Bible. */
export const BOOK_BONUS = 25;

/**
 * Apply a finished reading. results: [{ type, correct, mistakes, xp, heading?, note? }]
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
    const heading = results.find((r) => r.heading)?.heading;
    const note = results.find((r) => r.note)?.note;
    if (heading || note) notes[sec.id] = { ...notes[sec.id], ...(heading && { heading }), ...(note && { note }), at: now };

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
      xp,
      talents: talents + awarded.earned.reduce((a, e) => a + e.reward, 0),
      accuracy: correct + mistakes ? correct / (correct + mistakes) : 1,
      perfect,
      changes: [],
      reading: { id: sec.id, ref: session.ref, title: session.title || heading || null, bookDone, book: sec.book },
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
  else updateSettings({ [EQUIP_KEY[kind]]: id });
}

export function buyOil() {
  const s = getState();
  if (s.stats.freezes >= OIL.max || s.stats.talents < OIL.price) return false;
  setState({ ...s, stats: { ...s.stats, talents: s.stats.talents - OIL.price, freezes: s.stats.freezes + 1 } });
  return true;
}

// ── Backup & reset ─────────────────────────────────────────────────────────────

export function restoreBackup(data) {
  setState(migrate(data.state));
  if (data.texts) replaceTexts(data.texts);
}

export function resetEverything() {
  const keep = getState().settings;
  const fresh = freshState();
  setState({ ...fresh, settings: { ...fresh.settings, yvKey: keep.yvKey, theme: keep.theme } });
  clearTexts();
}
