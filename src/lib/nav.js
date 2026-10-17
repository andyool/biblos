import { useEffect, useRef } from 'react';

// The phone's back gesture (and the browser's back button) closes whatever is open — a sheet,
// a dialog, a lesson — instead of leaving the app. Each open layer has one history entry,
// numbered by its depth: { biblos: 1 }, { biblos: 2 }…

const layers = [];
let traversing = false;
let timer = null;

const depthNow = () => (typeof window.history.state?.biblos === 'number' ? window.history.state.biblos : 0);

/** Bring the history entries in line with the layers that are open. */
function sync() {
  timer = null;
  if (traversing) return;
  const cur = depthNow();
  const want = layers.length;
  if (cur > want) {
    traversing = true;
    // If the browser can't go back that far, don't wait for it forever.
    setTimeout(() => {
      if (traversing) {
        traversing = false;
        schedule();
      }
    }, 1000);
    window.history.go(want - cur);
  } else {
    for (let d = cur + 1; d <= want; d += 1) window.history.pushState({ biblos: d }, '');
  }
}

function schedule() {
  if (!timer) timer = setTimeout(sync, 0);
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (traversing) {
      traversing = false;
      sync();
      return;
    }
    // Back was pressed: close the layers above the entry we are now on.
    const depth = depthNow();
    const closed = [];
    while (layers.length > depth && !layers[layers.length - 1].guard) closed.push(layers.pop());
    const guarded = layers.length > depth ? layers[layers.length - 1] : null;
    sync();
    closed.forEach((layer) => layer.onBack());
    // A guarded layer (a lesson) stays open until its onBack decides, e.g. after asking.
    guarded?.onBack();
  });
}

/**
 * While active, let back call onBack. A guarded layer keeps its place in the history, so
 * onBack can ask before closing (or step back within it) and back works again afterwards.
 */
export function useBack(onBack, { active = true, guard = false } = {}) {
  const ref = useRef(onBack);
  ref.current = onBack;
  useEffect(() => {
    if (!active) return undefined;
    const layer = { guard, onBack: () => ref.current?.() };
    layers.push(layer);
    schedule();
    return () => {
      const i = layers.indexOf(layer);
      if (i >= 0) {
        layers.splice(i, 1);
        schedule();
      }
    };
  }, [active, guard]);
}
