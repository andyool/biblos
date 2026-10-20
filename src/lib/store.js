import { useSyncExternalStore } from 'react';
import { getTranslation } from '../data/translations.js';
import { getText } from './texts.js';

// All progress lives on the device in localStorage (export a backup from the Me tab).
const KEY = 'biblos.state.v1';

export function freshState() {
  const prefersLight = typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: light)').matches;
  return {
    v: 1,
    profile: { name: '', emblem: 'cross', since: Date.now() },
    settings: {
      onboarded: false,
      translation: 'ESV',
      // The NIV is only offered on a phone it has been unlocked on (see withoutNiv below).
      nivUnlocked: false,
      dailyGoal: 20,
      sound: true,
      speechRate: 0.92,
      theme: prefersLight ? 'parchment' : 'midnight',
      // "Match my phone": the light theme by day, the dark one by night.
      autoTheme: false,
      lightTheme: 'parchment',
      darkTheme: 'midnight',
      textSize: 1,
      verseFont: 'cormorant',
      frame: 'filigree',
      yvKey: '',
      activePath: 'foundations',
      focus: 'both', // what you came for: 'memorise', 'read' or 'both'
      // Woolly, the golden lamb who keeps you company: shown or not, and a girl or a boy lamb.
      woolly: true,
      woollyLamb: 'female',
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
      // How each memory skill is going ({ [skill]: { a, n } }), the exercises done lately and
      // how often each has been done: lessons lean towards the weakest skill (see lib/adapt.js).
      skills: {},
      recent: [],
      acts: {},
    },
    verses: {},
    custom: [],
    // Reading whole books in order: the current book, which sections are done, your notes,
    // and the reading plan you follow ({ id, started }).
    reading: { book: null, books: {}, notes: {}, plan: null },
    owned: {
      theme: ['midnight', 'parchment'],
      font: ['cormorant', 'garamond'],
      frame: ['filigree'],
      emblem: ['cross', 'dove', 'lamp'],
    },
    achievements: {},
  };
}

/**
 * Unless this phone has the NIV unlocked (tap "About" on the Me page), the NIV is put away:
 * your Bible becomes the ESV, and so does any verse whose NIV words aren't on the phone.
 * Verses with their NIV words saved keep them, and their progress.
 */
export function withoutNiv(state) {
  if (state.settings.nivUnlocked) return state;
  const isNiv = (tr) => getTranslation(tr).source === 'yv';
  const settings = isNiv(state.settings.translation) ? { ...state.settings, translation: 'ESV', nivWas: state.settings.translation } : state.settings;
  const verses = { ...state.verses };
  let moved = false;
  for (const v of Object.values(verses)) {
    if (isNiv(v.tr) && !getText(v.tr, v.id)) {
      verses[v.id] = { ...v, tr: 'ESV' };
      moved = true;
    }
  }
  if (settings === state.settings && !moved) return state;
  return { ...state, settings, verses: moved ? verses : state.verses };
}

export function migrate(data) {
  const base = freshState();
  if (!data || typeof data !== 'object') return base;
  return withoutNiv({
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
  });
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
