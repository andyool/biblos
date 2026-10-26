import { useSyncExternalStore } from 'react';

// The seals just earned, waiting to fall (components/SealDrop.jsx shows them one at a time).

let queue = [];
let current = null;
let timer = null;
let serial = 0;
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

function next() {
  timer = null;
  current = queue.length ? { seal: queue.shift(), key: (serial += 1) } : null;
  emit();
}

/** Let these seals fall, one after another, after `delay` ms (a page may want its own gold to run first). */
export function dropSeals(seals, delay = 0) {
  const fresh = (seals || []).filter((a) => a.id !== current?.seal.id && !queue.some((q) => q.id === a.id));
  if (!fresh.length) return;
  queue.push(...fresh);
  if (!current && !timer) timer = setTimeout(next, delay);
}

/** The seal on screen is cleared (a tap, back, or time); the next falls after a breath. */
export function dismissSeal() {
  if (!current) return;
  current = null;
  emit();
  if (queue.length && !timer) timer = setTimeout(next, 420);
}

const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const snapshot = () => current;

/** The seal falling now ({ seal, key }), or null. */
export const useSealDrop = () => useSyncExternalStore(subscribe, snapshot);
