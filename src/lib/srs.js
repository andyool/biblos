import { DAY, startOfDay } from './dates.js';

// Spaced repetition (a gentle SM-2): each good review pushes the next one further away.
export const HIDDEN_AFTER_DAYS = 21;

export function newSchedule(now = Date.now()) {
  return { interval: 1, ease: 2.5, reps: 0, lapses: 0, last: now, due: startOfDay(now) + DAY };
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
    lapses += 1;
    reps = 0;
    interval = 1;
    ease = Math.max(1.3, ease - 0.2);
  } else {
    if (reps === 0) interval = q === 5 ? 3 : 2;
    else if (reps === 1) interval = q === 5 ? 7 : q === 4 ? 6 : 4;
    else interval = Math.round(interval * ease * (q === 5 ? 1.15 : q === 3 ? 0.8 : 1));
    ease = Math.min(3, Math.max(1.3, ease + (q === 5 ? 0.1 : q === 3 ? -0.14 : 0)));
    reps += 1;
  }
  interval = Math.max(1, Math.min(interval, 365));
  return { interval, ease, reps, lapses, last: now, due: startOfDay(now) + interval * DAY, q };
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
