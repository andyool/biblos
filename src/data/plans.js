import { NEW_TESTAMENT, oldTestament } from './books.js';

// Reading plans: books to read through in order, and the days to take. A Catholic Bible
// reads the whole Bible with Tobit, Judith, Wisdom, Sirach, Baruch and 1–2 Maccabees.
const codes = (books) => books.map((b) => b.code);

export const PLANS = [
  { id: 'gospels', name: 'The Gospels in 30 days', desc: 'Matthew, Mark, Luke and John', days: 30, books: () => ['MAT', 'MRK', 'LUK', 'JHN'] },
  { id: 'nt90', name: 'The New Testament in 90 days', desc: 'Matthew to Revelation', days: 90, books: () => codes(NEW_TESTAMENT) },
  { id: 'psalms', name: 'The Psalms in 60 days', desc: 'All 150 psalms, two or three a day', days: 60, books: () => ['PSA'] },
  { id: 'year', name: 'The whole Bible in a year', desc: 'Genesis to Revelation', days: 365, books: (catholic) => [...codes(oldTestament(catholic)), ...codes(NEW_TESTAMENT)] },
];

export const PLAN_BY_ID = Object.fromEntries(PLANS.map((p) => [p.id, p]));
