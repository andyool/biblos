// Every book has a guide: it is split into sections with a reading focus, questions on
// the meaning and a prompt to reflect. The guides load only when they are needed.
// Check them with `npm run check:guides` after editing (it also fails if a book has none).
import { BOOKS } from '../books.js';

// Each guide is a file named after its book: genesis.js, mark.js, 1corinthians.js…
const files = import.meta.glob(['./*.js', '!./index.js']);
const fileFor = (book) => `./${book.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.js`;
const LOADERS = Object.fromEntries(BOOKS.filter((b) => files[fileFor(b)]).map((b) => [b.code, files[fileFor(b)]]));

// Good places to start for someone new to reading the Bible through, in order.
export const SUGGESTED = ['MRK', 'GEN', 'JHN', 'ACT', 'RUT', 'JON', 'PHP', 'JAS', 'ROM'];

// The first three, and why.
export const FIRST_BOOKS = [
  { code: 'MRK', why: 'Short, vivid and fast-moving — the best place to meet Jesus.' },
  { code: 'GEN', why: 'Begin at the very beginning: creation, the fall, and God’s promise to Abraham.' },
  { code: 'JHN', why: 'Slower and deeper: signs and sayings that show who Jesus is.' },
];

const guides = new Map();
const pending = new Map();

/** The guide if it has already loaded (else undefined). */
export const guideNow = (code) => guides.get(code);

/** Load a book's guide. */
export function loadGuide(code) {
  if (guides.has(code)) return Promise.resolve(guides.get(code));
  if (!LOADERS[code]) return Promise.reject(new Error(`No guide for ${code}`));
  if (!pending.has(code)) {
    pending.set(
      code,
      LOADERS[code]()
        .then((m) => {
          guides.set(code, m.default);
          return m.default;
        })
        .finally(() => pending.delete(code)),
    );
  }
  return pending.get(code);
}
