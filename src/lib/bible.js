import { BOOK_BY_CODE, parseId } from '../data/books.js';
import { getTranslation } from '../data/translations.js';
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

export const hasYouVersion = () => Boolean(youVersionKey()) || serverHasKey;
export const serverKeyConfigured = () => serverHasKey;

/** True when NIV text can be fetched (a key on this device or on the server). */
export function useYouVersionReady() {
  useStore((s) => s.settings.yvKey);
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

const chapters = new Map();

function bollsChapter(code, bookNumber, chapter) {
  const key = `${code}/${bookNumber}/${chapter}`;
  if (!chapters.has(key)) {
    const p = fetchJSON(`${BOLLS_BASE}/get-text/${code}/${bookNumber}/${chapter}/`).catch((err) => {
      chapters.delete(key);
      throw err;
    });
    chapters.set(key, p);
  }
  return chapters.get(key);
}

async function fromBolls(translation, id) {
  const { book, chapter, start, end } = parseId(id);
  const data = await bollsChapter(translation.code, BOOK_BY_CODE[book].number, chapter);
  if (!Array.isArray(data) || !data.length) throw new BibleError('not-found', 'That chapter is not available in this translation.');
  const verses = [];
  for (let v = start; v <= end; v += 1) {
    const row = data.find((r) => r.verse === v);
    if (!row) {
      throw new BibleError('not-found', `${BOOK_BY_CODE[book].name} ${chapter} has ${data[data.length - 1].verse} verses in the ${translation.id}.`);
    }
    if (/prohibited me from using/i.test(row.text)) throw new BibleError('needs-key', 'This translation needs a YouVersion key.');
    verses.push({ v, t: cleanVerseText(row.text, { book, verse: v }) });
  }
  return verses;
}

const contentOf = (data) => data?.content ?? data?.data?.content ?? '';

async function youVersionVerse(yvId, usfm, key) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new BibleError('offline', 'You seem to be offline.');
  }
  const path = `bibles/${yvId}/passages/${usfm}`;
  const headers = key ? { 'X-YVP-App-Key': key, Accept: 'application/json' } : { Accept: 'application/json' };

  // 1) Through our own Vercel function (api/yv.js): no browser restrictions, real error codes.
  let res = null;
  try {
    res = await fetch(`/api/yv?path=${encodeURIComponent(path)}&format=text`, { headers });
  } catch {
    res = null;
  }
  if (res && (res.headers.get('content-type') || '').includes('json')) {
    if (res.status === 401) {
      throw key ? new BibleError('auth', 'YouVersion did not accept that key.') : new BibleError('needs-key', 'The NIV needs a free YouVersion key.');
    }
    if (res.status === 403) throw new BibleError('license', 'Your YouVersion app has not accepted the licence for this translation yet.');
    if (res.status === 404) throw new BibleError('not-found', 'That passage could not be found.');
    if (!res.ok) throw new BibleError('network', `YouVersion answered with an error (${res.status}). Please try again.`);
    const content = contentOf(await res.json());
    if (!content) throw new BibleError('not-found', 'That passage came back empty.');
    return content;
  }

  // 2) Straight to YouVersion (when hosted somewhere without the /api function).
  if (!key) throw new BibleError('needs-key', 'The NIV needs a free YouVersion key.');
  try {
    const content = contentOf(await fetchJSON(`${YV_BASE}/${path}?format=text`, { headers }));
    if (!content) throw new BibleError('not-found', 'That passage came back empty.');
    return content;
  } catch (err) {
    if (err.kind === 'network') throw new BibleError('auth', 'Could not load from YouVersion — check your connection and that your key is correct.');
    throw err;
  }
}

async function fromYouVersion(translation, id) {
  const key = youVersionKey();
  const { book, chapter, start, end } = parseId(id);
  const nums = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  const texts = await Promise.all(nums.map((v) => youVersionVerse(translation.yv, `${book}.${chapter}.${v}`, key)));
  return nums.map((v, i) => ({ v, t: cleanVerseText(texts[i], { book, verse: v }) }));
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

/** Check a YouVersion key by fetching one NIV verse. */
export async function testYouVersionKey(key, yvId = 111) {
  const content = await youVersionVerse(yvId, 'JHN.3.16', key.trim());
  return cleanVerseText(content, { book: 'JHN', verse: 16 });
}

/** Read the passage on bible.com (handy for copying text by hand). */
export function bibleComUrl(tr, id) {
  const translation = getTranslation(tr);
  const { book, chapter, start, end } = parseId(id);
  const versionId = translation.yv || { ESV: 59, NKJV: 114, NLT: 116, CSB: 1713, NASB: 100, KJV: 1, AMP: 1588, MSG: 97, NET: 107, BSB: 3034, WEB: 206, LSB: 3345 }[tr] || 111;
  return `https://www.bible.com/bible/${versionId}/${book}.${chapter}.${start}${end > start ? `-${end}` : ''}.${tr}`;
}

/** Quietly fetch passages in the background so lessons open instantly. */
export function prefetch(pairs) {
  pairs.forEach(([tr, id], i) => {
    setTimeout(() => loadPassage(tr, id).catch(() => {}), i * 250);
  });
}
