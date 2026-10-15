// Guided books: each is split into sections with a reading focus, questions on the
// meaning and a prompt to reflect. Every other book can still be read in order, a
// chapter at a time. The guides load only when they are needed.
// Check them with `npm run check:guides` after editing.
import { BOOKS } from '../books.js';

// Each guide is a file named after its book: genesis.js, mark.js, 1corinthians.js…
const files = import.meta.glob(['./*.js', '!./index.js']);
const fileFor = (book) => `./${book.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.js`;
const LOADERS = Object.fromEntries(BOOKS.filter((b) => files[fileFor(b)]).map((b) => [b.code, files[fileFor(b)]]));

// A suggested order for someone new to reading the Bible through; any others follow.
const SUGGESTED = ['MRK', 'GEN', 'JHN', 'ACT', 'RUT', 'JON', 'PHP', 'JAS', 'ROM'];
export const GUIDED = [...SUGGESTED.filter((c) => LOADERS[c]), ...Object.keys(LOADERS).filter((c) => !SUGGESTED.includes(c))];

export const isGuided = (code) => Boolean(LOADERS[code]);

const guides = new Map();
const pending = new Map();

/** The guide if it has already loaded (else undefined). */
export const guideNow = (code) => guides.get(code);

/** Load a book's guide. Resolves to null for books without one. */
export function loadGuide(code) {
  if (!isGuided(code)) return Promise.resolve(null);
  if (guides.has(code)) return Promise.resolve(guides.get(code));
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
