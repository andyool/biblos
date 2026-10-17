import { useSyncExternalStore } from 'react';
import { BOOK_BY_CODE, NEW_TESTAMENT, chaptersIn, oldTestament, parseId } from '../data/books.js';
import { CURATED_IDS } from '../data/paths.js';
import { getTranslation } from '../data/translations.js';
import { TEXTS_CACHE, bollsUrl, hasYouVersion, loadPassage } from './bible.js';
import { verseTr } from './lesson.js';
import { readingTr } from './reading.js';
import { getState } from './store.js';

// "Download for offline": saves every chapter of the Bible you read in, and every memory
// verse, so the whole app works with no signal. The app itself is kept by the service worker.

// When it last finished on this phone: { tr, at }. Kept apart from progress, because a
// backup restored on another phone doesn't bring the text with it.
const KEY = 'biblos.offline.v1';
const WORKERS = 4;

let saved = null;
try {
  saved = JSON.parse(localStorage.getItem(KEY) || 'null');
} catch {
  saved = null;
}

let progress = { running: false, done: 0, total: 0, failed: 0 };
let version = 0;
const listeners = new Set();

function changed() {
  version += 1;
  listeners.forEach((l) => l());
}

export const offlineSupported = () => typeof caches !== 'undefined';

/** Everything to save: Bible chapters from bolls.life, and NIV verses (YouVersion only gives them a verse at a time). */
function plan(state) {
  const chapters = new Set();
  const verses = [];
  const addChapter = (tr, code, chapter) => {
    const t = getTranslation(tr);
    if (BOOK_BY_CODE[code].deutero && !t.catholic) return;
    chapters.add(bollsUrl(t.code, BOOK_BY_CODE[code].number, chapter));
  };

  // Reading through: every book on the shelf, in the translation it is read in.
  const catholic = Boolean(getTranslation(state.settings.translation).catholic);
  const books = [...oldTestament(catholic), ...NEW_TESTAMENT].map((b) => b.code);
  if (state.reading.book && !books.includes(state.reading.book)) books.push(state.reading.book);
  for (const code of books) {
    const tr = readingTr(state, code);
    const t = getTranslation(tr);
    if (t.source !== 'bolls') continue;
    for (let c = 1; c <= chaptersIn(code, t.catholic); c += 1) addChapter(tr, code, c);
  }

  // Memory verses: every path, your own verses and any you have begun, each in its own translation.
  const ids = new Set([...CURATED_IDS, ...state.custom, ...Object.keys(state.verses)]);
  for (const id of ids) {
    const tr = verseTr(state, id);
    const { book, chapter } = parseId(id);
    if (getTranslation(tr).source === 'bolls') addChapter(tr, book, chapter);
    else if (hasYouVersion()) verses.push([tr, id]);
  }
  return { chapters: [...chapters], verses };
}

async function saveChapter(cache, url) {
  if (await cache.match(url)) return;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`bolls.life answered ${res.status}`);
  const data = await res.clone().json();
  if (!Array.isArray(data) || !data.length) throw new Error('empty chapter');
  await cache.put(url, res);
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetries(job) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await job();
    } catch (err) {
      if (attempt === 3 || navigator.onLine === false) throw err;
      await wait(attempt * 1500);
    }
  }
}

/**
 * Save everything for offline use. Anything already saved is skipped, so running it
 * again finishes an interrupted download quickly. Resolves to { done, total, failed }.
 */
export async function downloadAll() {
  if (progress.running) return progress;
  const state = getState();
  const { chapters, verses } = plan(state);
  const cache = await caches.open(TEXTS_CACHE);
  const jobs = [...chapters.map((url) => () => saveChapter(cache, url)), ...verses.map(([tr, id]) => () => loadPassage(tr, id))];
  progress = { running: true, done: 0, total: jobs.length, failed: 0 };
  changed();

  let next = 0;
  const worker = async () => {
    // Stop when the connection drops; the rest can be finished later.
    while (next < jobs.length && navigator.onLine !== false) {
      const job = jobs[next];
      next += 1;
      try {
        await withRetries(job);
      } catch {
        progress = { ...progress, failed: progress.failed + 1 };
      }
      progress = { ...progress, done: progress.done + 1 };
      changed();
    }
  };
  await Promise.all(Array.from({ length: WORKERS }, worker));

  progress = { ...progress, running: false };
  if (progress.done === progress.total && !progress.failed) {
    saved = { tr: state.settings.translation, at: Date.now() };
    try {
      localStorage.setItem(KEY, JSON.stringify(saved));
    } catch {
      /* storage full */
    }
  }
  changed();
  return progress;
}

function subscribe(l) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** The download's progress, and when it last finished: { progress, saved }. */
export function useOffline() {
  useSyncExternalStore(subscribe, () => version, () => version);
  return { progress, saved };
}
