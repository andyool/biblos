import { useEffect, useRef } from 'react';

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * While a sheet or dialog is open, move focus into it and keep Tab inside it; when it closes,
 * give focus back to what had it before (for keyboards and screen readers).
 */
export function useFocusTrap(ref) {
  // What had focus when this opened (read while rendering, before anything inside takes it).
  const opener = useRef(undefined);
  if (opener.current === undefined) opener.current = typeof document !== 'undefined' ? document.activeElement : null;

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!el.contains(document.activeElement)) el.focus({ preventScroll: true });
    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const items = [...el.querySelectorAll(FOCUSABLE)].filter((x) => x.getClientRects().length);
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === el)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    el.addEventListener('keydown', onKey);
    return () => {
      el.removeEventListener('keydown', onKey);
      const back = opener.current;
      if (back && back !== document.body && document.contains(back)) back.focus?.({ preventScroll: true });
    };
  }, [ref]);
}
