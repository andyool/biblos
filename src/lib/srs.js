import { DAY, dayAfter, dayKey, startOfDay } from './dates.js';

// Spaced repetition (a gentle SM-2): each good review pushes the next one further away.
export const HIDDEN_AFTER_DAYS = 21;

// Of the days a review came late, how many count towards the next interval, by grade: a verse
// recalled well after a longer gap than planned has shown it lasts that long.
const LATE_CREDIT = { 3: 0, 4: 0.5, 5: 1 };

export function newSchedule(now = Date.now()) {
  return { interval: 1, ease: 2.5, reps: 0, lapses: 0, last: now, due: dayAfter(now, 1) };
}

export function grade(accuracy) {
  if (accuracy >= 0.97) return 5;
  if (accuracy >= 0.85) return 4;
  if (accuracy >= 0.7) return 3;
  if (accuracy >= 0.5) return 2;
  return 1;
}

export function review(schedule, accuracy, now = Date.now()) {
  const q = grade(accuracy);
  let { interval = 1, ease = 2.5, reps = 0, lapses = 0 } = schedule || {};
  if (q < 3) {
    // A near miss on a verse known for a while goes back a step; one that has slipped away
    // starts over.
    const near = q === 2 && reps >= 2;
    lapses += 1;
    reps = near ? 1 : 0;
    interval = 1;
    ease = Math.max(1.3, ease - (near ? 0.1 : 0.2));
  } else {
    const elapsed = schedule?.last ? Math.round((startOfDay(now) - startOfDay(schedule.last)) / DAY) : interval;
    const stretch = 1 + (Math.max(0, elapsed - interval) * LATE_CREDIT[q]) / interval;
    // The first two reviews come at set steps, unless a late recall has already carried it further.
    const step = [q === 5 ? 3 : 2, q === 5 ? 7 : q === 4 ? 6 : 4][reps];
    interval = Math.round((step > interval ? step : interval * ease * (q === 5 ? 1.15 : q === 3 ? 0.8 : 1)) * stretch);
    ease = Math.min(3, Math.max(1.3, ease + (q === 5 ? 0.1 : q === 3 ? -0.14 : 0)));
    reps += 1;
  }
  interval = Math.max(1, Math.min(interval, 365));
  return { interval, ease, reps, lapses, last: now, due: dayAfter(now, interval), q };
}

/**
 * Move a review a little earlier or later, to the quietest day near it, so verses learned
 * together don't all fall due on the same day. Short intervals stay as they are, and a review
 * never crosses the three weeks that hide a verse in the heart. load: { [dayKey]: reviews due }.
 */
export function spread(schedule, load = {}) {
  const { interval, due } = schedule;
  if (interval < 4) return schedule;
  const reach = Math.max(1, Math.round(interval * 0.1));
  const hidden = interval >= HIDDEN_AFTER_DAYS;
  let best = 0;
  for (let d = 1; d <= reach; d += 1) {
    // Earlier before later: a review a day early is safer than one a day late.
    for (const shift of [-d, d]) {
      if ((interval + shift >= HIDDEN_AFTER_DAYS) !== hidden) continue;
      if ((load[dayKey(dayAfter(due, shift))] || 0) < (load[dayKey(dayAfter(due, best))] || 0)) best = shift;
    }
  }
  return best ? { ...schedule, interval: interval + best, due: dayAfter(due, best) } : schedule;
}

/** How many more good reviews a Fruitful verse needs to be hidden in the heart: [if near perfect, if just good]. */
export function reviewsToHidden(schedule, now = Date.now()) {
  const count = (accuracy) => {
    let s = schedule;
    let n = 0;
    do {
      // Each review on the day it falls due, or today if it is overdue.
      s = review(s, accuracy, Math.max(s.due, now));
      n += 1;
    } while (s.interval < HIDDEN_AFTER_DAYS && n < 20);
    return n;
  };
  return [count(1), count(0.85)];
}

export const isDue = (verse, now = Date.now()) => !!verse && verse.level >= 4 && !!verse.srs && verse.srs.due <= now;

/** 0–1: how fresh a memorised verse is (drops below 0.5 once it is due). */
export function freshness(verse, now = Date.now()) {
  if (!verse?.srs) return null;
  const span = Math.max(verse.srs.due - verse.srs.last, DAY / 2);
  const elapsed = now - verse.srs.last;
  if (elapsed <= span) return 1 - 0.5 * (elapsed / span);
  return Math.max(0.05, 0.5 - 0.25 * ((elapsed - span) / Math.max(span, DAY)));
}
