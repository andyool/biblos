import { useEffect, useState } from 'react';

// Tiny global hosts for confirmation dialogs and toasts.
let dialog = null;
let toastItem = null;
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

export function ask({ title, message, confirm = 'Yes', cancel = 'Cancel', danger = false }) {
  return new Promise((resolve) => {
    dialog = {
      title,
      message,
      confirm,
      cancel,
      danger,
      resolve: (v) => {
        dialog = null;
        emit();
        resolve(v);
      },
    };
    emit();
  });
}

let toastTimer = null;
export function toast(message, icon = null) {
  toastItem = { message, icon, id: Date.now() };
  emit();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastItem = null;
    emit();
  }, 2800);
}

export function useOverlays() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => listeners.delete(l);
  }, []);
  return { dialog, toast: toastItem };
}
