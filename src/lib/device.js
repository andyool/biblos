import { useEffect, useState } from 'react';
import { getState } from './store.js';
import { allTexts } from './texts.js';
import { dayKey } from './dates.js';

// ── Home screen install ────────────────────────────────────────────────────────

export const isStandalone = () =>
  typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);

export const isIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

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

export async function exportBackup() {
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
