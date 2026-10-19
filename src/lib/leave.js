import { useLayoutEffect } from 'react';

const still = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * React takes an overlay off the screen the moment it closes. This leaves a lifeless copy
 * behind for just as long as `animate(copy)` runs, so every way of closing — the X, a tap
 * outside, a swipe, the back button, or the app moving on — ends with the same exit.
 * Elements marked `data-keep-scroll` keep their scroll position in the copy.
 */
export function useLeave(ref, animate) {
  useLayoutEffect(() => {
    const node = ref.current;
    return () => {
      if (!node || still()) return;
      const scrolls = [...node.querySelectorAll('[data-keep-scroll]')].map((el) => el.scrollTop);
      // Only a real removal leaves (React may unmount and remount once while developing).
      queueMicrotask(() => {
        if (node.isConnected) return;
        const copy = node.cloneNode(true);
        copy.classList.add('is-leaving');
        copy.setAttribute('aria-hidden', 'true');
        copy.inert = true;
        document.body.appendChild(copy);
        copy.querySelectorAll('[data-keep-scroll]').forEach((el, i) => {
          el.scrollTop = scrolls[i] || 0;
        });
        const runs = animate(copy).filter(Boolean);
        const gone = () => copy.remove();
        Promise.all(runs.map((a) => a.finished))
          .catch(() => {})
          .finally(gone);
        // Animations wait while the app is in the background; the copy needn't.
        setTimeout(gone, 1500);
      });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

/** How far down an element has been dragged (its inline translateY, in px). */
export const draggedBy = (el) => parseFloat(/translateY\((-?[\d.]+)px\)/.exec(el?.style.transform || '')?.[1]) || 0;
