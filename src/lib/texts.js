import { useSyncExternalStore } from 'react';

// Verse text cache, kept apart from progress so saving progress stays light.
// Entry: { verses: [{ v, t }], src: 'bolls' | 'yv' | 'user', at }
const KEY = 'biblos.texts.v1';

let texts = {};
try {
  texts = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
} catch {
  texts = {};
}

let version = 0;
const listeners = new Set();
let timer = null;

function persist() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(texts));
    } catch {
      /* ignore */
    }
  }, 200);
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
