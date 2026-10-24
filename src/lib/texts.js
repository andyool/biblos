import { useSyncExternalStore } from 'react';

// Verse text cache, kept apart from progress so saving progress stays light.
// Entry: { verses: [{ v, t }], src: 'bolls' | 'yv' | 'user', at }
const KEY = 'biblos.texts.v1';

const read = (raw) => {
  try {
    const data = JSON.parse(raw || '{}');
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
};

let stored = null;
try {
  stored = localStorage.getItem(KEY);
} catch {
  /* storage unavailable */
}
let texts = read(stored);

let version = 0;
const listeners = new Set();
let timer = null;

function persist() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    try {
      const raw = JSON.stringify(texts);
      localStorage.setItem(KEY, raw);
      stored = raw;
    } catch {
      /* the progress store warns when saving fails */
    }
  }, 200);
}

/** Take up words another copy of Biblos (a second tab, the Home Screen app) has saved. */
function adopt(raw) {
  if (!raw || raw === stored || timer) return;
  stored = raw;
  texts = read(raw);
  version += 1;
  listeners.forEach((l) => l());
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) adopt(e.newValue);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    try {
      adopt(localStorage.getItem(KEY));
    } catch {
      /* storage unavailable */
    }
  });
}

function changed() {
  version += 1;
  persist();
  listeners.forEach((l) => l());
}

const k = (tr, id) => `${tr}|${id}`;

export function getText(tr, id) {
  return texts[k(tr, id)] || null;
}

export function setText(tr, id, entry) {
  texts = { ...texts, [k(tr, id)]: { ...entry, at: Date.now() } };
  changed();
}

export function removeText(tr, id) {
  if (!texts[k(tr, id)]) return;
  const next = { ...texts };
  delete next[k(tr, id)];
  texts = next;
  changed();
}

export function allTexts() {
  return texts;
}

export function replaceTexts(next) {
  texts = next && typeof next === 'object' ? next : {};
  changed();
}

export function clearTexts() {
  replaceTexts({});
}

function subscribe(l) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Re-render when any cached text changes. */
export function useTextsVersion() {
  return useSyncExternalStore(subscribe, () => version, () => version);
}

export function joinVerses(entry) {
  return entry ? entry.verses.map((v) => v.t).join(' ') : '';
}
