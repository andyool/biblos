import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Glyph from './Glyph.jsx';
import { Divider } from './Ornaments.jsx';

/** A bottom sheet that slides up over the app. */
export default function Sheet({ title, onClose, children, className = '', flourish = true }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className={`sheet ${className}`} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
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
    </div>,
    document.body,
  );
}
