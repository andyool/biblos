import { useEffect, useState } from 'react';
import { getState } from './store.js';
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

async function writeBackup() {
  const data = { app: 'biblos', exported: new Date().toISOString(), state: getState(), texts: allTexts() };
  const name = `biblos-backup-${dayKey()}.json`;
  const file = new File([JSON.stringify(data)], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Biblos backup' });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'downloaded';
}

export async function readBackup(file) {
  const data = JSON.parse(await file.text());
  if (data?.app !== 'biblos' || !data.state) throw new Error('That file is not a Biblos backup.');
  return data;
}
