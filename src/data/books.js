// The 66 books: [USFM code, name, short name, chapters, extra aliases]
const RAW = [
  ['GEN', 'Genesis', 'Gen', 50, 'ge gn'],
  ['EXO', 'Exodus', 'Exod', 40, 'ex exo'],
  ['LEV', 'Leviticus', 'Lev', 27, 'le lv'],
  ['NUM', 'Numbers', 'Num', 36, 'nu nm nb'],
  ['DEU', 'Deuteronomy', 'Deut', 34, 'dt de deu'],
  ['JOS', 'Joshua', 'Josh', 24, 'jos jsh'],
  ['JDG', 'Judges', 'Judg', 21, 'jdg jg jdgs'],
  ['RUT', 'Ruth', 'Ruth', 4, 'ru rth'],
  ['1SA', '1 Samuel', '1 Sam', 31, '1sa 1sm 1s'],
  ['2SA', '2 Samuel', '2 Sam', 24, '2sa 2sm 2s'],
  ['1KI', '1 Kings', '1 Kgs', 22, '1ki 1kg 1k'],
  ['2KI', '2 Kings', '2 Kgs', 25, '2ki 2kg 2k'],
  ['1CH', '1 Chronicles', '1 Chr', 29, '1ch 1chron'],
  ['2CH', '2 Chronicles', '2 Chr', 36, '2ch 2chron'],
  ['EZR', 'Ezra', 'Ezra', 10, 'ezr'],
  ['NEH', 'Nehemiah', 'Neh', 13, 'ne'],
  ['EST', 'Esther', 'Esth', 10, 'est es'],
  ['JOB', 'Job', 'Job', 42, 'jb'],
  ['PSA', 'Psalms', 'Ps', 150, 'psa psalm pss psm pslm'],
  ['PRO', 'Proverbs', 'Prov', 31, 'pro pr prv'],
  ['ECC', 'Ecclesiastes', 'Eccl', 12, 'ecc ec qoh'],
  ['SNG', 'Song of Songs', 'Song', 8, 'sng sos songofsolomon canticles'],
  ['ISA', 'Isaiah', 'Isa', 66, 'is'],
  ['JER', 'Jeremiah', 'Jer', 52, 'je jr'],
  ['LAM', 'Lamentations', 'Lam', 5, 'la'],
  ['EZK', 'Ezekiel', 'Ezek', 48, 'eze ezk'],
  ['DAN', 'Daniel', 'Dan', 12, 'da dn'],
  ['HOS', 'Hosea', 'Hos', 14, 'ho'],
  ['JOL', 'Joel', 'Joel', 3, 'jl jol'],
  ['AMO', 'Amos', 'Amos', 9, 'am amo'],
  ['OBA', 'Obadiah', 'Obad', 1, 'ob oba'],
  ['JON', 'Jonah', 'Jonah', 4, 'jnh'],
  ['MIC', 'Micah', 'Mic', 7, 'mc'],
  ['NAM', 'Nahum', 'Nah', 3, 'na nam'],
  ['HAB', 'Habakkuk', 'Hab', 3, 'hb'],
  ['ZEP', 'Zephaniah', 'Zeph', 3, 'zep zp'],
  ['HAG', 'Haggai', 'Hag', 2, 'hg'],
  ['ZEC', 'Zechariah', 'Zech', 14, 'zec zc'],
  ['MAL', 'Malachi', 'Mal', 4, 'ml'],
  ['MAT', 'Matthew', 'Matt', 28, 'mt mat'],
  ['MRK', 'Mark', 'Mark', 16, 'mk mr mrk'],
  ['LUK', 'Luke', 'Luke', 24, 'lk luk'],
  ['JHN', 'John', 'John', 21, 'jn jhn joh'],
  ['ACT', 'Acts', 'Acts', 28, 'ac act'],
  ['ROM', 'Romans', 'Rom', 16, 'ro rm'],
  ['1CO', '1 Corinthians', '1 Cor', 16, '1co'],
  ['2CO', '2 Corinthians', '2 Cor', 13, '2co'],
  ['GAL', 'Galatians', 'Gal', 6, 'ga'],
  ['EPH', 'Ephesians', 'Eph', 6, 'ephes'],
  ['PHP', 'Philippians', 'Phil', 4, 'php pp'],
  ['COL', 'Colossians', 'Col', 4, ''],
  ['1TH', '1 Thessalonians', '1 Thess', 5, '1th 1thes'],
  ['2TH', '2 Thessalonians', '2 Thess', 3, '2th 2thes'],
  ['1TI', '1 Timothy', '1 Tim', 6, '1ti 1tm'],
  ['2TI', '2 Timothy', '2 Tim', 4, '2ti 2tm'],
  ['TIT', 'Titus', 'Titus', 3, 'tit ti'],
  ['PHM', 'Philemon', 'Phlm', 1, 'phm philem'],
  ['HEB', 'Hebrews', 'Heb', 13, 'he'],
  ['JAS', 'James', 'Jas', 5, 'jm jam'],
  ['1PE', '1 Peter', '1 Pet', 5, '1pe 1pt 1p'],
  ['2PE', '2 Peter', '2 Pet', 3, '2pe 2pt 2p'],
  ['1JN', '1 John', '1 John', 5, '1jn 1jo 1joh'],
  ['2JN', '2 John', '2 John', 1, '2jn 2jo 2joh'],
  ['3JN', '3 John', '3 John', 1, '3jn 3jo 3joh'],
  ['JUD', 'Jude', 'Jude', 1, 'jud jd'],
  ['REV', 'Revelation', 'Rev', 22, 're rv revelations apocalypse'],
];

// The deuterocanonical books, which only Catholic Bibles have.
// [USFM code, name, short name, chapters, extra aliases, bolls.life book number, the book it follows]
const DEUTERO = [
  ['TOB', 'Tobit', 'Tob', 14, 'tb', 68, 'NEH'],
  ['JDT', 'Judith', 'Jdt', 16, 'jdth', 69, 'NEH'],
  ['1MA', '1 Maccabees', '1 Macc', 16, '1ma 1mac', 74, 'EST'],
  ['2MA', '2 Maccabees', '2 Macc', 15, '2ma 2mac', 75, 'EST'],
  ['WIS', 'Wisdom', 'Wis', 19, 'ws wisdomofsolomon', 70, 'SNG'],
  ['SIR', 'Sirach', 'Sir', 51, 'ecclesiasticus ecclus', 71, 'SNG'],
  ['BAR', 'Baruch', 'Bar', 6, '', 73, 'LAM'],
];

// Catholic Bibles also have Susanna and Bel and the Dragon, as Daniel 13 and 14.
const CATHOLIC_CHAPTERS = { DAN: 14 };

const toBook = ([code, name, short, chapters, aliases], number, extra) => ({
  code,
  name,
  short,
  chapters,
  number,
  aliases: aliases.split(' ').filter(Boolean),
  ...(CATHOLIC_CHAPTERS[code] && { catholicChapters: CATHOLIC_CHAPTERS[code] }),
  ...extra,
});

const PROTESTANT = RAW.map((row, index) => toBook(row, index + 1));
const DEUTERO_BOOKS = DEUTERO.map((row) => toBook(row, row[5], { deutero: true, follows: row[6] }));

export const BOOKS = [...PROTESTANT, ...DEUTERO_BOOKS];

/** The Old Testament: 39 books, or 46 in a Catholic Bible, with the deuterocanonical books in their places. */
export const oldTestament = (catholic) =>
  PROTESTANT.slice(0, 39).flatMap((b) => (catholic ? [b, ...DEUTERO_BOOKS.filter((d) => d.follows === b.code)] : [b]));

export const NEW_TESTAMENT = PROTESTANT.slice(39);

export const BOOK_BY_CODE = Object.fromEntries(BOOKS.map((b) => [b.code, b]));

/** How many chapters a book has, in a Catholic Bible or not. */
export const chaptersIn = (code, catholic) => (catholic && BOOK_BY_CODE[code].catholicChapters) || BOOK_BY_CODE[code].chapters;

const squash = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const LOOKUP = new Map();
for (const book of BOOKS) {
  LOOKUP.set(squash(book.name), book);
  LOOKUP.set(squash(book.short), book);
  LOOKUP.set(squash(book.code), book);
  for (const alias of book.aliases) LOOKUP.set(squash(alias), book);
}

export function findBook(input) {
  let s = input.trim().toLowerCase();
  s = s
    .replace(/^(iii|third|3rd)\s+/, '3 ')
    .replace(/^(ii|second|2nd)\s+/, '2 ')
    .replace(/^(i|first|1st)\s+(?=[a-z])/, '1 ');
  const key = squash(s);
  if (!key) return null;
  if (LOOKUP.has(key)) return LOOKUP.get(key);
  const matches = BOOKS.filter((b) => squash(b.name).startsWith(key));
  return matches.length === 1 ? matches[0] : null;
}

/** "Romans 8:38-39" → { book: 'ROM', chapter: 8, start: 38, end: 39 } (or an { error }) */
export function parseReference(input) {
  const text = String(input || '').trim().replace(/[–—]/g, '-');
  const m = text.match(/^((?:[1-3]|i{1,3})?\s*[a-z][a-z .]*?)\s*(\d+)(?:\s*[:.,\s]\s*(\d+)(?:\s*-\s*(\d+))?)?\s*$/i);
  if (!m) return { error: 'Try a reference like “John 3:16” or “Psalm 23:1-3”.' };
  const book = findBook(m[1]);
  if (!book) return { error: `I don’t recognise the book “${m[1].trim()}”.` };
  const chapter = Number(m[2]);
  const most = book.catholicChapters || book.chapters;
  if (chapter < 1 || chapter > most) {
    return { error: `${book.name} has ${most} chapter${most > 1 ? 's' : ''}.` };
  }
  if (!m[3]) return { book: book.code, chapter, start: 1, end: null, wholeChapter: true };
  const start = Number(m[3]);
  const end = m[4] ? Number(m[4]) : start;
  if (start < 1 || end < start) return { error: 'That verse range doesn’t look right.' };
  if (end - start > 29) return { error: 'Please choose 30 verses or fewer at a time.' };
  return { book: book.code, chapter, start, end };
}

export function makeId({ book, chapter, start, end }) {
  return `${book}.${chapter}.${start}${end && end > start ? `-${end}` : ''}`;
}

export function parseId(id) {
  const [book, chapter, verses] = id.split('.');
  const [start, end] = verses.split('-').map(Number);
  return { book, chapter: Number(chapter), start, end: end || start };
}

function bookLabel(code, chapterOnly) {
  if (code === 'PSA' && !chapterOnly) return 'Psalm';
  return BOOK_BY_CODE[code]?.name || code;
}

/** "John 3:16", "Ephesians 2:8–9" */
export function formatRef(id) {
  const { book, chapter, start, end } = parseId(id);
  return `${bookLabel(book)} ${chapter}:${start}${end > start ? `–${end}` : ''}`;
}

/** "Jn 3:16" style, for small labels */
export function formatRefShort(id) {
  const { book, chapter, start, end } = parseId(id);
  return `${BOOK_BY_CODE[book]?.short || book} ${chapter}:${start}${end > start ? `–${end}` : ''}`;
}

export function chapterVerse(id) {
  const { chapter, start, end } = parseId(id);
  return `${chapter}:${start}${end > start ? `–${end}` : ''}`;
}
