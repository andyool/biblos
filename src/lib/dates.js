export const DAY = 86_400_000;

const pad = (n) => String(n).padStart(2, '0');

/** Local calendar day, e.g. "2026-10-15" */
export function dayKey(time = Date.now()) {
  const d = new Date(time);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function startOfDay(time = Date.now()) {
  const d = new Date(time);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** The start of the day n calendar days after time's day. Counted in days, not hours, so a clock change can't move it. */
export function dayAfter(time, n) {
  const d = new Date(time);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n).getTime();
}

function keyToUTC(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Whole days from one day key to another (positive when b is later). */
export function daysBetween(a, b) {
  return Math.round((keyToUTC(b) - keyToUTC(a)) / DAY);
}

export function addDays(key, n) {
  const d = new Date(keyToUTC(key) + n * DAY);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function whenText(due, now = Date.now()) {
  const days = Math.round((startOfDay(due) - startOfDay(now)) / DAY);
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days < 14) return `in ${days} days`;
  if (days < 60) return `in ${Math.round(days / 7)} weeks`;
  return `in ${Math.round(days / 30)} months`;
}
