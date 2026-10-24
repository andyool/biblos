import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Glyph from './Glyph.jsx';
import { Divider } from './Ornaments.jsx';
import Woolly from './Woolly.jsx';
import { useBack } from '../lib/nav.js';
import { useFocusTrap } from '../lib/focus.js';
import { draggedBy, useLeave } from '../lib/leave.js';

// Slide down from wherever the sheet is (it may be part-way, mid-swipe) while the dim fades.
function slideAway(copy) {
  const panel = copy.querySelector('.sheet-panel');
  const scrim = copy.querySelector('.sheet-scrim');
  const height = panel.offsetHeight || 1;
  const from = Math.max(0, draggedBy(panel));
  const duration = 150 + 170 * (1 - from / height);
  return [
    panel.animate([{ transform: `translateY(${from}px)` }, { transform: 'translateY(100%)' }], { duration, easing: 'cubic-bezier(0.45, 0, 0.9, 0.55)', fill: 'forwards' }),
    scrim.animate([{ opacity: getComputedStyle(scrim).opacity }, { opacity: 0 }], { duration, easing: 'ease-out', fill: 'forwards' }),
  ];
}

// Touches that belong to the content, not to the sheet.
const KEEP = 'input, textarea, select, [contenteditable="true"], [data-no-drag]';

/** Something between the touch and the sheet that is scrolled and would scroll back up first. */
function scrolledWithin(target, sheet) {
  for (let el = target; el && el !== sheet; el = el.parentElement) {
    if (el.scrollTop > 0 && el.scrollHeight > el.clientHeight) return true;
  }
  return false;
}

/**
 * Swipe the sheet down to close it: by the handle at any time, or from anywhere on it once
 * it is scrolled to the top. Let go early and it settles back.
 */
function useSwipeDown({ panel, scrim, sheet, onClose }) {
  const drag = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;

  const settle = () => {
    const p = panel.current;
    const s = scrim.current;
    if (!p || !s) return;
    const off = draggedBy(p);
    const opacity = s.style.opacity || '1';
    p.style.transform = '';
    s.style.opacity = '';
    if (!off) return;
    p.animate([{ transform: `translateY(${off}px)` }, { transform: 'translateY(0)' }], { duration: 300, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1.15)' });
    s.animate([{ opacity }, { opacity: 1 }], { duration: 300, easing: 'ease-out' });
  };

  const begin = (y) => {
    drag.current = { from: y, y, t: performance.now(), v: 0, height: panel.current.offsetHeight || 1 };
    panel.current.classList.add('is-dragging');
  };

  const follow = (y) => {
    const d = drag.current;
    const now = performance.now();
    if (now > d.t) d.v = 0.7 * ((y - d.y) / (now - d.t)) + 0.3 * d.v;
    d.y = y;
    d.t = now;
    const pull = y - d.from;
    // Down follows the finger; up gives a little and then holds.
    const off = pull >= 0 ? pull : -Math.min(18, Math.sqrt(-pull) * 2);
    panel.current.style.transform = `translateY(${off}px)`;
    scrim.current.style.opacity = String(Math.max(0, 1 - Math.max(0, off) / d.height));
  };

  const release = () => {
    const d = drag.current;
    drag.current = null;
    const p = panel.current;
    if (!d || !p) return;
    p.classList.remove('is-dragging');
    const off = draggedBy(p);
    if (close.current && (off > Math.min(d.height * 0.3, 170) || (d.v > 0.45 && off > 16))) {
      // The sheet leaves from where it was let go (see slideAway), so it never jumps.
      close.current();
      setTimeout(() => p.isConnected && settle(), 160);
      return;
    }
    settle();
  };

  // The handle: mouse, pen or touch.
  const handle = {
    onPointerDown: (e) => {
      if (e.button !== 0) return;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* not a live pointer; the drag still follows it while it stays over the handle */
      }
      begin(e.clientY);
    },
    onPointerMove: (e) => drag.current && follow(e.clientY),
    onPointerUp: release,
    onPointerCancel: release,
  };

  // The rest of the sheet: a downward pull while it is scrolled to the top.
  useEffect(() => {
    const el = sheet.current;
    if (!el) return undefined;
    let touch = null;
    const start = (e) => {
      const t = e.target;
      touch = e.touches.length === 1 && !t.closest('.sheet-grab') && !t.closest(KEEP) && !scrolledWithin(t, el) ? { x: e.touches[0].clientX, y: e.touches[0].clientY, pulling: false } : null;
    };
    const move = (e) => {
      if (!touch) return;
      const p = e.touches[0];
      if (!touch.pulling) {
        const dx = p.clientX - touch.x;
        const dy = p.clientY - touch.y;
        if (!dx && !dy) return;
        if (el.scrollTop > 0 || dy <= 0 || Math.abs(dx) > dy || !e.cancelable) {
          touch = null;
          return;
        }
        touch.pulling = true;
        begin(touch.y);
      }
      e.preventDefault();
      follow(p.clientY);
    };
    const end = () => {
      if (touch?.pulling) release();
      touch = null;
    };
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
    return () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', end);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return handle;
}

/**
 * A bottom sheet that slides up over the app, and back down when it closes. With `woolly`
 * (a clip such as 'wave', or a loop such as 'pray'), the lamb peeks up over its top edge.
 * With `guard`, onClose may decide not to close (e.g. after asking), and back still works after.
 */
export default function Sheet({ title, onClose, children, className = '', flourish = true, woolly, guard = false }) {
  const root = useRef(null);
  const scrim = useRef(null);
  const panel = useRef(null);
  const ref = useRef(null);
  useBack(onClose, { active: Boolean(onClose), guard });
  useFocusTrap(ref);
  useLeave(root, slideAway);
  const handle = useSwipeDown({ panel, scrim, sheet: ref, onClose });
  useEffect(() => {
    // Only the sheet on top closes, when one is open over another.
    const onKey = (e) => e.key === 'Escape' && root.current === [...document.querySelectorAll('.sheet-backdrop:not(.is-leaving)')].at(-1) && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div ref={root} className="sheet-backdrop" onClick={onClose}>
      <div ref={scrim} className="sheet-scrim" />
      <div ref={panel} className={`sheet-panel ${woolly ? 'has-woolly' : ''}`} onClick={(e) => e.stopPropagation()}>
        {woolly && <Woolly act={woolly} size={112} peek delay={300} listen className="sheet-woolly" />}
        <div ref={ref} tabIndex={-1} className={`sheet ${className}`} role="dialog" aria-modal="true" aria-label={title} data-keep-scroll>
          <div className="sheet-grab" {...handle}>
            <div className="sheet-handle" />
          </div>
          {onClose && (
            <button className="icon-btn sheet-close" onClick={onClose} aria-label="Close">
              <Glyph name="close" size={20} />
            </button>
          )}
          {title && (
            <header className="sheet-head">
              <h2 className="sheet-title">{title}</h2>
              {flourish && <Divider width={150} className="sheet-divider" />}
            </header>
          )}
          <div className="sheet-body">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
