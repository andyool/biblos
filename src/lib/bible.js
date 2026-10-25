import { BOOKS, BOOK_BY_CODE, chaptersIn, parseId } from '../data/books.js';
import { CATHOLIC_BIBLE, getTranslation } from '../data/translations.js';
import { cleanVerseText } from './text.js';
import { getText, setText } from './texts.js';
import { useEffect, useState } from 'react';
import { getState, useStore } from './store.js';

const YV_BASE = 'https://api.youversion.com/v1';
const BOLLS_BASE = 'https://bolls.life';

/** The YouVersion key saved on this device (if any). */
export function youVersionKey() {
  return (getState().settings.yvKey || '').trim();
}

// A key can also live on the server (Vercel → Environment Variables → YVP_APP_KEY).
let serverHasKey = false;
const yvListeners = new Set();

export async function checkServerKey() {
  try {
    const res = await fetch('/api/yv?path=status', { cache: 'no-store' });
    if (res.ok && (res.headers.get('content-type') || '').includes('json')) {
      serverHasKey = Boolean((await res.json()).serverKey);
      yvListeners.forEach((l) => l());
    }
  } catch {
    /* static hosting without the /api function */
  }
}

/** The NIV is only for a phone it has been unlocked on (Me → tap "About"). */
export const nivUnlocked = () => Boolean(getState().settings.nivUnlocked);

export const hasYouVersion = () => nivUnlocked() && (Boolean(youVersionKey()) || serverHasKey);
export const serverKeyConfigured = () => serverHasKey;

/** True when NIV text can be fetched (a key on this device or on the server). */
export function useYouVersionReady() {
  useStore((s) => s.settings.yvKey);
  useStore((s) => s.settings.nivUnlocked);
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    yvListeners.add(l);
    return () => yvListeners.delete(l);
  }, []);
  return hasYouVersion();
}

export class BibleError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind; // 'needs-key' | 'auth' | 'license' | 'not-found' | 'offline' | 'network'
  }
}

async function fetchJSON(url, options = {}) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new BibleError('offline', 'You seem to be offline.');
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    if (res.status === 401) throw new BibleError('auth', 'That YouVersion key was not accepted.');
    if (res.status === 403) throw new BibleError('license', 'Your YouVersion app has not accepted the licence for this translation yet.');
    if (res.status === 404) throw new BibleError('not-found', 'That passage could not be found.');
    if (!res.ok) throw new BibleError('network', `The Bible service answered with an error (${res.status}).`);
    return await res.json();
  } catch (err) {
    if (err instanceof BibleError) throw err;
    throw new BibleError('network', 'Could not reach the Bible service. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }
}

/** The deuterocanonical books, and Daniel 13–14, are only in Catholic Bibles. */
function checkCanon(translation, book, chapter) {
  const b = BOOK_BY_CODE[book];
  if (translation.catholic || (!b.deutero && chapter <= b.chapters)) return;
  throw new BibleError('not-found', `${b.deutero ? b.name : `${b.name} ${chapter}`} is only in Catholic Bibles. Choose the ${CATHOLIC_BIBLE.id} to read it.`);
}

// Chapters saved on the phone, by the service worker or by "Download for offline" (lib/offline.js).
// The service worker uses the same cache name.
export const TEXTS_CACHE = 'biblos-texts';

export const bollsUrl = (code, bookNumber, chapter) => `${BOLLS_BASE}/get-text/${code}/${bookNumber}/${chapter}/`;

async function savedChapter(url) {
  try {
    const hit = await caches.match(url);
    return hit ? await hit.json() : null;
  } catch {
    return null; // no Cache Storage here (e.g. plain http)
  }
}

const chapters = new Map();

function bollsChapter(code, bookNumber, chapter) {
  const url = bollsUrl(code, bookNumber, chapter);
  if (!chapters.has(url)) {
    const p = savedChapter(url)
      .then((saved) => saved || fetchJSON(url))
      .catch((err) => {
        chapters.delete(url);
        throw err;
      });
    chapters.set(url, p);
  }
  return chapters.get(url);
}

async function fromBolls(translation, id) {
  const { book, chapter, start, end } = parseId(id);
  checkCanon(translation, book, chapter);
  const data = await bollsChapter(translation.code, BOOK_BY_CODE[book].number, chapter);
  if (!Array.isArray(data) || !data.length) throw new BibleError('not-found', 'That chapter is not available in this translation.');
  const verses = [];
  for (let v = start; v <= end; v += 1) {
    const row = data.find((r) => r.verse === v);
    if (!row) {
      throw new BibleError('not-found', `${BOOK_BY_CODE[book].name} ${chapter} has ${data[data.length - 1].verse} verses in the ${translation.id}.`);
    }
    if (/prohibited me from using/i.test(row.text)) throw new BibleError('needs-key', 'This translation needs a YouVersion key.');
    verses.push({ v, t: cleanVerseText(row.text, { book, chapter, verse: v, boldHeadings: translation.boldHeadings }) });
  }
  return verses;
}

const contentOf = (data) => data?.content ?? data?.data?.content ?? '';

async function youVersionPassage(yvId, usfm, key, format = 'text') {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new BibleError('offline', 'You seem to be offline.');
  }
  const path = `bibles/${yvId}/passages/${usfm}`;
  const headers = key ? { 'X-YVP-App-Key': key, Accept: 'application/json' } : { Accept: 'application/json' };

  // 1) Through our own Vercel function (api/yv.js): no browser restrictions, real error codes.
  let res = null;
  try {
    res = await fetch(`/api/yv?path=${encodeURIComponent(path)}&format=${format}`, { headers });
  } catch {
    res = null;
  }
  if (res && (res.headers.get('content-type') || '').includes('json')) {
    if (res.status === 401) {
      throw key ? new BibleError('auth', 'YouVersion did not accept that key.') : new BibleError('needs-key', 'The NIV needs a free YouVersion key.');
    }
    if (res.status === 403) throw new BibleError('license', 'Your YouVersion app has not accepted the licence for this translation yet.');
    if (res.status === 404) throw new BibleError('not-found', 'That passage could not be found.');
    // YouVersion allows each key 200 requests an hour, shared by everyone using the app.
    if (res.status === 429) throw new BibleError('network', 'Lots of people are reading the NIV right now. Please try again in a little while.');
    if (!res.ok) throw new BibleError('network', `YouVersion answered with an error (${res.status}). Please try again.`);
    const content = contentOf(await res.json());
    if (!content) throw new BibleError('not-found', 'That passage came back empty.');
    return content;
  }

  // 2) Straight to YouVersion (when hosted somewhere without the /api function).
  if (!key) throw new BibleError('needs-key', 'The NIV needs a free YouVersion key.');
  try {
    const content = contentOf(await fetchJSON(`${YV_BASE}/${path}?format=${format}`, { headers }));
    if (!content) throw new BibleError('not-found', 'That passage came back empty.');
    return content;
  } catch (err) {
    if (err.kind === 'network') throw new BibleError('auth', 'Could not load from YouVersion — check your connection and that your key is correct.');
    throw err;
  }
}

/**
 * Split a chapter of YouVersion's HTML into verses: Map(verse → raw text).
 * Verses start at <span class="yv-v" v="N">. Headings (.yv-h), footnotes and cross references
 * (.yv-n) and the printed verse numbers (.yv-vlbl) are left out, and so is anything before
 * verse 1, such as a psalm's title.
 */
export function versesFromHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('.yv-h, .yv-n, .yv-vlbl').forEach((el) => el.remove());
  const verses = new Map();
  let current = 0;
  const add = (text) => {
    if (current) verses.set(current, (verses.get(current) || '') + text);
  };
  const walk = (node) => {
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        add(child.textContent);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        if (child.classList.contains('yv-v') && child.hasAttribute('v')) current = parseInt(child.getAttribute('v'), 10) || current;
        walk(child);
        // A new paragraph or line of poetry: keep a space between the words either side.
        if (child.tagName !== 'SPAN') add(' ');
      }
    }
  };
  walk(doc.body);
  return verses;
}

// One request per chapter, shared by every verse and reading in it, because YouVersion
// allows the whole app only 200 requests an hour.
const yvChapters = new Map();

function youVersionChapter(translation, book, chapter) {
  // Words already on the phone still open (loadPassage looks there first); nothing new is fetched.
  if (!nivUnlocked()) return Promise.reject(new BibleError('locked', `The ${translation.id} isn’t available. Choose another translation.`));
  const key = `${translation.yv}/${book}.${chapter}`;
  if (!yvChapters.has(key)) {
    const p = youVersionPassage(translation.yv, `${book}.${chapter}`, youVersionKey(), 'html')
      .then(versesFromHtml)
      .catch((err) => {
        yvChapters.delete(key);
        throw err;
      });
    yvChapters.set(key, p);
  }
  return yvChapters.get(key);
}

async function fromYouVersion(translation, id) {
  const { book, chapter, start, end } = parseId(id);
  checkCanon(translation, book, chapter);
  const texts = await youVersionChapter(translation, book, chapter);
  const verses = [];
  for (let v = start; v <= end; v += 1) {
    const t = cleanVerseText(texts.get(v), { book, verse: v });
    if (!t) throw new BibleError('not-found', `${BOOK_BY_CODE[book].name} ${chapter}:${v} is not in the ${translation.id}.`);
    verses.push({ v, t });
  }
  return verses;
}

const pending = new Map();

/** Load (and cache) a passage. Resolves to { verses, src }. */
export function loadPassage(tr, id) {
  const cached = getText(tr, id);
  if (cached) return Promise.resolve(cached);
  const key = `${tr}|${id}`;
  if (pending.has(key)) return pending.get(key);
  const translation = getTranslation(tr);
  const job = (translation.source === 'yv' ? fromYouVersion(translation, id) : fromBolls(translation, id))
    .then((verses) => {
      const entry = { verses, src: translation.source };
      setText(tr, id, entry);
      return entry;
    })
    .finally(() => pending.delete(key));
  pending.set(key, job);
  return job;
}

/**
 * Every verse in a range that the translation has, for reading through a book.
 * Unlike loadPassage, verses a translation leaves out (e.g. Mark 9:44) are skipped, not errors.
 * Resolves to [{ v, t }]. Nothing is cached here; see lib/reading.js.
 */
export async function loadRange(tr, book, chapter, start, end) {
  const translation = getTranslation(tr);
  checkCanon(translation, book, chapter);
  if (translation.source === 'yv') {
    const texts = await youVersionChapter(translation, book, chapter);
    const verses = [];
    for (let v = start; v <= end; v += 1) {
      const t = cleanVerseText(texts.get(v), { book, verse: v });
      if (t) verses.push({ v, t });
    }
    if (!verses.length) throw new BibleError('not-found', 'That passage could not be found.');
    return verses;
  }
  const data = await bollsChapter(translation.code, BOOK_BY_CODE[book].number, chapter);
  const rows = Array.isArray(data) ? data.filter((r) => r.verse >= start && r.verse <= end) : [];
  if (!rows.length) throw new BibleError('not-found', 'That chapter is not available in this translation.');
  if (rows.some((r) => /prohibited me from using/i.test(r.text))) throw new BibleError('needs-key', 'This translation needs a YouVersion key.');
  return rows.map((r) => ({ v: r.verse, t: cleanVerseText(r.text, { book, chapter, verse: r.verse, boldHeadings: translation.boldHeadings }) })).filter((r) => r.t);
}

const BOOK_BY_NUMBER = Object.fromEntries(BOOKS.map((b) => [b.number, b]));

/**
 * Verses with these words in them, from bolls.life: the whole phrase first, then verses with
 * some of the words. The NIV can't be searched, so its words are looked for in the ESV (a
 * verse is the same verse in any Bible). Resolves to { tr (the Bible searched), exact (how
 * many match the whole phrase), total, results: [{ id, book, chapter, verse, text }] }, where
 * text still has the <mark>s around the words found.
 */
export async function searchVerses(tr, words, limit = 24) {
  const chosen = getTranslation(tr);
  const translation = chosen.source === 'bolls' ? chosen : getTranslation('ESV');
  const query = new URLSearchParams({ search: words, match_case: 'false', match_whole: 'false', limit: String(limit), page: '1' });
  const data = await fetchJSON(`${BOLLS_BASE}/v2/find/${translation.code}?${query}`);
  const catholic = Boolean(translation.catholic);
  const rows = Array.isArray(data?.results) ? data.results : [];
  const results = [];
  let exact = 0;
  rows.forEach((r, i) => {
    const book = BOOK_BY_NUMBER[r.book];
    // Only books and chapters this Bible has (some services number other books too).
    if (!book || (book.deutero && !catholic) || r.chapter > chaptersIn(book.code, catholic)) return;
    if (i < (data.exact_matches || 0)) exact += 1;
    results.push({ id: `${book.code}.${r.chapter}.${r.verse}`, book: book.code, chapter: r.chapter, verse: r.verse, text: r.text });
  });
  return { tr: translation.id, exact, total: Number(data?.total) || results.length, results };
}

/** Check a YouVersion key by fetching one NIV verse. */
export async function testYouVersionKey(key, yvId = 111) {
  const content = await youVersionPassage(yvId, 'JHN.3.16', key.trim());
  return cleanVerseText(content, { book: 'JHN', verse: 16 });
}

/** Read the passage on bible.com (handy for copying text by hand). */
export function bibleComUrl(tr, id) {
  const translation = getTranslation(tr);
  const { book, chapter, start, end } = parseId(id);
  const versionId = translation.yv || { ESV: 59, NKJV: 114, NLT: 116, CSB: 1713, NASB: 100, KJV: 1, AMP: 1588, MSG: 97, NET: 107, BSB: 3034, WEB: 206, LSB: 3345, NRSVCE: 2015 }[tr] || 111;
  return `https://www.bible.com/bible/${versionId}/${book}.${chapter}.${start}${end > start ? `-${end}` : ''}.${tr}`;
}

/** Quietly fetch passages in the background so lessons open instantly. */
export function prefetch(pairs) {
  pairs.forEach(([tr, id], i) => {
    setTimeout(() => loadPassage(tr, id).catch(() => {}), i * 250);
  });
}
