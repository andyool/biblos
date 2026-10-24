import { useEffect, useState } from 'react';

// Tiny global hosts for confirmation dialogs and toasts.
let dialog = null;
let toastItem = null;
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

// `woolly` names what the lamb does as it peeks over the dialog (if the lamb is on).
export function ask({ title, message, confirm = 'Yes', cancel = 'Cancel', danger = false, woolly = null }) {
  return new Promise((resolve) => {
    dialog = {
      title,
      message,
      confirm,
      cancel,
      danger,
      woolly,
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
const hideToast = () => {
  clearTimeout(toastTimer);
  toastItem = null;
  emit();
};

/** A note at the top of the screen. With an action ({ label, run }), it offers a button too, e.g. Undo. */
export function toast(message, icon = null, action = null) {
  const run = () => {
    hideToast();
    action.run();
  };
  toastItem = { message, icon, id: Date.now(), action: action && { label: action.label, run } };
  emit();
  clearTimeout(toastTimer);
  // Long enough to read, and longer when there is something to tap.
  toastTimer = setTimeout(hideToast, Math.max(action ? 6000 : 2800, message.length * 55));
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
