import { useSyncExternalStore } from 'react';

// New versions arrive as a new service worker (src/sw-template.js). Once it has taken over,
// the page offers to reload — unless the page already runs that version.
/* global __BUILD__ */

let ready = false;
const listeners = new Set();

function emit() {
  listeners.forEach((l) => l());
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  const sw = navigator.serviceWorker;
  const ask = () => sw.controller?.postMessage({ type: 'version' });

  sw.addEventListener('message', (event) => {
    if (event.data?.type === 'version' && event.data.version !== __BUILD__ && !ready) {
      ready = true;
      emit();
    }
  });
  sw.addEventListener('controllerchange', ask);

  window.addEventListener('load', () => {
    sw.register('/sw.js')
      .then((reg) => {
        // A Home Screen app is often resumed rather than reopened, so look for updates then too.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => {});
        });
      })
      .catch(() => {});
    ask();
  });
}

export const updateReady = () => ready;

function subscribe(l) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** True once a new version of Biblos is waiting for a reload. */
export function useUpdateReady() {
  return useSyncExternalStore(subscribe, () => ready, () => ready);
}
