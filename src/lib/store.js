import { useSyncExternalStore } from 'react';

// All progress lives on the device in localStorage (export a backup from the Me tab).
const KEY = 'biblos.state.v1';

export function freshState() {
  const prefersLight = typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: light)').matches;
  return {
    v: 1,
    profile: { name: '', emblem: 'cross', since: Date.now() },
    settings: {
      onboarded: false,
      translation: 'NIV',
      dailyGoal: 20,
      sound: true,
      speechRate: 0.92,
      theme: prefersLight ? 'parchment' : 'midnight',
      verseFont: 'cormorant',
      frame: 'filigree',
      yvKey: '',
      activePath: 'foundations',
      installDismissed: false,
      // Backups: when the last was saved, how many lessons and readings had been done then,
      // and until when the reminder is put off.
      lastBackup: null,
      backupCount: 0,
      backupSnooze: 0,
    },
    stats: {
      xp: 0,
      talents: 0,
      streak: 0,
      bestStreak: 0,
      lastActiveDay: null,
      freezes: 0,
      days: {},
      goalDays: 0,
      lessons: 0,
      perfect: 0,
      reviews: 0,
      letters: 0,
      morning: false,
      night: false,
      readings: 0,
      booksRead: 0,
    },
    verses: {},
    custom: [],
    // Reading whole books in order: the current book, which sections are done, and your notes.
    reading: { book: null, books: {}, notes: {} },
    owned: {
      theme: ['midnight', 'parchment'],
      font: ['cormorant', 'garamond'],
      frame: ['filigree'],
      emblem: ['cross', 'dove', 'lamp'],
    },
    achievements: {},
  };
}

export function migrate(data) {
  const base = freshState();
  if (!data || typeof data !== 'object') return base;
  return {
    ...base,
    ...data,
    profile: { ...base.profile, ...data.profile },
    settings: { ...base.settings, ...data.settings },
    stats: { ...base.stats, ...data.stats },
    owned: { ...base.owned, ...data.owned },
    verses: data.verses || {},
    custom: data.custom || [],
    reading: { ...base.reading, ...data.reading },
    achievements: data.achievements || {},
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch {
    /* fall through to a fresh start */
  }
  return freshState();
}

let state = load();
const listeners = new Set();
let saveTimer = null;

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or unavailable */
  }
}

export function flush() {
  clearTimeout(saveTimer);
  save();
}

export function getState() {
  return state;
}

export function setState(update) {
  state = typeof update === 'function' ? update(state) : update;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 120);
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Subscribe to a slice of state. The selector must return existing objects, not new ones. */
export function useStore(selector = (s) => s) {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  );
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  // Ask the browser not to clear our storage when space runs low.
  navigator.storage?.persist?.().catch(() => {});
}
