import { useSyncExternalStore } from 'react';
import { getTranslation } from '../data/translations.js';
import { getText } from './texts.js';

// All progress lives on the device in localStorage (export a backup from the Me tab).
const KEY = 'biblos.state.v1';

// The shape of saved progress. A backup from a later shape is refused rather than half read.
export const STATE_VERSION = 1;

export function freshState() {
  const prefersLight = typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: light)').matches;
  return {
    v: STATE_VERSION,
    profile: { name: '', emblem: 'cross', since: Date.now() },
    settings: {
      onboarded: false,
      translation: 'ESV',
      // The NIV is only offered on a phone it has been unlocked on (see withoutNiv below).
      nivUnlocked: false,
      // The flourish on the Me page hands out talents once the same word has been given.
      talentsUnlocked: false,
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

// Saved data is laid over the defaults one level down. A part saved in the wrong shape (a list
// where an object belongs, a null…) keeps its default rather than break a screen.
const isObject = (x) => Boolean(x) && typeof x === 'object' && !Array.isArray(x);

function merge(base, data) {
  if (!isObject(data)) return base;
  const out = { ...base };
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (isObject(base[key]) && !isObject(value)) continue;
    if (Array.isArray(base[key]) && !Array.isArray(value)) continue;
    out[key] = value;
  }
  return out;
}

export function migrate(data) {
  const base = freshState();
  if (!isObject(data)) return base;
  return withoutNiv({
    ...base,
    ...data,
    profile: merge(base.profile, data.profile),
    settings: merge(base.settings, data.settings),
    stats: merge(base.stats, data.stats),
    owned: merge(base.owned, data.owned),
    verses: isObject(data.verses) ? data.verses : {},
    custom: Array.isArray(data.custom) ? data.custom : [],
    reading: merge(base.reading, data.reading),
    achievements: isObject(data.achievements) ? data.achievements : {},
  });
}

// Progress that could not be read is copied here before anything is saved over it.
const UNREADABLE = 'biblos.state.unreadable';

// What storage held when it was last read or written. Anything else there now was saved by
// another copy of Biblos: a second tab, or the Home Screen app beside the browser.
let stored = null;

function load() {
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return freshState();
  }
  stored = raw;
  if (!raw) return freshState();
  try {
    return migrate(JSON.parse(raw));
  } catch {
    try {
      if (!localStorage.getItem(UNREADABLE)) localStorage.setItem(UNREADABLE, raw);
    } catch {
      /* nothing more can be done */
    }
    return freshState();
  }
}

/** Can this browser keep anything at all? (Not in some private modes, or with storage blocked.) */
function storageWorks() {
  try {
    localStorage.setItem('biblos.probe', '1');
    localStorage.removeItem('biblos.probe');
    return true;
  } catch {
    return false;
  }
}

let state = load();
const listeners = new Set();
let saveTimer = null;
// Changes not yet written to storage.
let unsaved = false;
// False while the browser refuses to save, so the app can say so.
let saving = typeof window === 'undefined' || storageWorks();
const savingListeners = new Set();

function save() {
  clearTimeout(saveTimer);
  if (!unsaved) return;
  let ok = true;
  try {
    const raw = JSON.stringify(state);
    localStorage.setItem(KEY, raw);
    stored = raw;
    unsaved = false;
  } catch {
    ok = false;
  }
  if (ok !== saving) {
    saving = ok;
    savingListeners.forEach((listener) => listener());
  }
}

export function flush() {
  save();
}

export function getState() {
  return state;
}

export function setState(update) {
  const next = typeof update === 'function' ? update(state) : update;
  // Nothing changed, so nothing to save: an old copy of the app must not write its old progress back.
  if (next === state) return;
  state = next;
  unsaved = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 120);
  listeners.forEach((listener) => listener());
}

/** Take up what another copy of Biblos has saved, unless this one has changes of its own to save. */
function adopt(raw) {
  if (!raw || raw === stored || unsaved) return;
  try {
    state = migrate(JSON.parse(raw));
  } catch {
    return;
  }
  stored = raw;
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

function subscribeSaving(listener) {
  savingListeners.add(listener);
  return () => savingListeners.delete(listener);
}

/** False while this browser won't keep progress (storage blocked, full, or private browsing). */
export const savingWorks = () => saving;

export function useSaving() {
  return useSyncExternalStore(subscribeSaving, savingWorks, savingWorks);
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flush);
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) adopt(e.newValue);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flush();
      return;
    }
    // Back in front: another copy may have saved in the meantime.
    try {
      adopt(localStorage.getItem(KEY));
    } catch {
      /* storage unavailable */
    }
  });
  // Ask the browser not to clear our storage when space runs low.
  navigator.storage?.persist?.().catch(() => {});
}
