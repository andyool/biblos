import { chaptersIn, parseId } from '../data/books.js';
import { versesIn } from '../data/chapters.js';
import { PLAN_BY_ID } from '../data/plans.js';
import { getTranslation } from '../data/translations.js';
import { dayKey, daysBetween } from './dates.js';

// How far through a reading plan you are, counted in verses: every passage you have read in
// the plan's books counts, so a plan needs none of the guides to be loaded.

const bookTotals = new Map();

/** Verses in a book (a Catholic Bible has longer Esther and Daniel). */
export function versesInBook(code, catholic) {
  const key = `${code}${catholic ? '+c' : ''}`;
  if (!bookTotals.has(key)) {
    let n = 0;
    for (let c = 1; c <= chaptersIn(code, catholic); c += 1) n += versesIn(code, c, catholic);
    bookTotals.set(key, n);
  }
  return bookTotals.get(key);
}

/** Verses read in a book, from the ids of the passages read, counting overlaps once. */
export function versesReadIn(done = {}) {
  const chapters = new Map();
  for (const id of Object.keys(done)) {
    const { chapter, start, end } = parseId(id);
    if (!chapters.has(chapter)) chapters.set(chapter, []);
    chapters.get(chapter).push([start, end]);
  }
  let n = 0;
  for (const ranges of chapters.values()) {
    ranges.sort((a, b) => a[0] - b[0]);
    let upTo = 0;
    for (const [start, end] of ranges) {
      if (end <= upTo) continue;
      n += end - Math.max(start, upTo + 1) + 1;
      upTo = end;
    }
  }
  return n;
}

/**
 * The plan you follow, and how it is going: { plan, day, total, read, today (verses still to
 * read today), behind / ahead (days), finished, book (the book to read next) }, or null.
 */
export function planProgress(state, now = Date.now()) {
  const current = state.reading.plan;
  const plan = current && PLAN_BY_ID[current.id];
  if (!plan) return null;
  const catholic = Boolean(getTranslation(state.settings.translation).catholic);
  let total = 0;
  let read = 0;
  let book = null;
  for (const code of plan.books(catholic)) {
    const inBook = versesInBook(code, catholic);
    const done = Math.min(inBook, versesReadIn(state.reading.books[code]?.done));
    total += inBook;
    read += done;
    if (!book && done < inBook) book = code;
  }
  const day = Math.max(1, daysBetween(dayKey(current.started), dayKey(now)) + 1);
  const daily = total / plan.days;
  const byTonight = Math.min(total, daily * day);
  const byLastNight = Math.min(total, daily * (day - 1));
  return {
    plan,
    started: current.started,
    day: Math.min(day, plan.days),
    overdue: day > plan.days,
    total,
    read,
    daily,
    today: Math.max(0, Math.ceil(byTonight - read)),
    behind: read < byLastNight ? Math.ceil((byLastNight - read) / daily) : 0,
    ahead: read > byTonight ? Math.floor((read - byTonight) / daily) : 0,
    finished: !book,
    book,
  };
}

/** "On track", "2 days behind", "3 days ahead". */
export function planStatus(p) {
  if (p.finished) return 'Plan complete';
  if (p.behind) return `${p.behind} day${p.behind === 1 ? '' : 's'} behind`;
  if (p.ahead) return `${p.ahead} day${p.ahead === 1 ? '' : 's'} ahead`;
  return 'On track';
}
