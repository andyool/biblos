import { useEffect, useState } from 'react';
import { STATE_VERSION, getState } from './store.js';
import { allTexts } from './texts.js';
import { DAY, dayKey } from './dates.js';
import { noteBackup, sessionsDone } from './actions.js';

// ── Home screen install ────────────────────────────────────────────────────────

export const isStandalone = () =>
  typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);

export const isAndroid = () => typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

// An iPad reports itself as a Mac, so a "Mac" with a touch screen is an iPad too.
export const isIOS = () =>
  typeof navigator !== 'undefined' &&
  !isAndroid() &&
  (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

/** Which Android browser, for the right "Add to Home screen" steps: 'samsung' | 'firefox' | 'chrome'. */
export function androidBrowser() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/SamsungBrowser/i.test(ua)) return 'samsung';
  if (/Firefox/i.test(ua)) return 'firefox';
  return 'chrome';
}

let deferredPrompt = null;
const installListeners = new Set();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installListeners.forEach((l) => l());
  });
}

export function useInstallPrompt() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    installListeners.add(l);
    return () => installListeners.delete(l);
  }, []);
  return deferredPrompt
    ? async () => {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice.catch(() => {});
        deferredPrompt = null;
      }
    : null;
}

// ── Backups ────────────────────────────────────────────────────────────────────

// A reminder after the first few lessons, then every four weeks or fifty lessons and readings.
const FIRST_AFTER = 5;
const EVERY_DAYS = 28;
const EVERY_SESSIONS = 50;

/** Is it time to suggest saving a backup? */
export function backupDue(state, now = Date.now()) {
  const { lastBackup, backupCount = 0, backupSnooze = 0 } = state.settings;
  const done = sessionsDone(state.stats);
  if (done < FIRST_AFTER || backupSnooze > now) return false;
  if (!lastBackup) return true;
  return now - lastBackup >= EVERY_DAYS * DAY || done - backupCount >= EVERY_SESSIONS;
}

/** Save a backup file (shared, or downloaded). Resolves to 'shared', 'downloaded' or 'cancelled'. */
export async function exportBackup() {
  const result = await writeBackup();
  if (result !== 'cancelled') noteBackup();
  return result;
}

function writeBackup() {
  const data = { app: 'biblos', exported: new Date().toISOString(), state: getState(), texts: allTexts() };
  const file = new File([JSON.stringify(data)], `biblos-backup-${dayKey()}.json`, { type: 'application/json' });
  return shareFile(file, 'Biblos backup');
}

/** Hand a file to the phone's share sheet, or download it. Resolves to 'shared', 'downloaded' or 'cancelled'. */
export async function shareFile(file, title) {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'downloaded';
}

const isObject = (x) => Boolean(x) && typeof x === 'object' && !Array.isArray(x);

/** Read a backup file, and make sure it is one before anything is replaced. */
export async function readBackup(file) {
  const notBackup = new Error('That file is not a Biblos backup.');
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw notBackup;
  }
  const s = data?.state;
  // Every backup Biblos has saved has these, with progress in them.
  if (data?.app !== 'biblos' || !isObject(s) || !isObject(s.settings) || !isObject(s.stats) || !isObject(s.verses)) throw notBackup;
  if ((Number(s.v) || 1) > STATE_VERSION) throw new Error('This backup is from a newer version of Biblos. Reload Biblos to update it, then try again.');
  // Only the words that are well formed come with it.
  const texts = isObject(data.texts)
    ? Object.fromEntries(Object.entries(data.texts).filter(([, e]) => isObject(e) && Array.isArray(e.verses) && e.verses.every((v) => isObject(v) && typeof v.t === 'string')))
    : null;
  return { ...data, texts };
}
