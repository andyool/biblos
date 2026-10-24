import { createPortal } from 'react-dom';
import { useOverlays } from '../lib/ui.js';
import Glyph from './Glyph.jsx';
import { useRef } from 'react';
import { useBack } from '../lib/nav.js';
import { useFocusTrap } from '../lib/focus.js';
import { useLeave } from '../lib/leave.js';
import Woolly from './Woolly.jsx';

// The dim fades and the card sinks back a little as it goes.
function shrinkAway(copy) {
  const options = { duration: 170, easing: 'ease-in', fill: 'forwards' };
  return [
    copy.querySelector('.dialog-scrim').animate([{ opacity: 1 }, { opacity: 0 }], options),
    copy.querySelector('.dialog-wrap').animate([{ transform: 'none', opacity: 1 }, { transform: 'scale(0.94)', opacity: 0 }], options),
  ];
}

function Dialog({ dialog }) {
  const root = useRef(null);
  const ref = useRef(null);
  useBack(() => dialog.resolve(false));
  useFocusTrap(ref);
  useLeave(root, shrinkAway);
  return (
    <div ref={root} className="dialog-backdrop" onClick={() => dialog.resolve(false)}>
      <div className="dialog-scrim" />
      <div className={`dialog-wrap ${dialog.woolly ? 'has-woolly' : ''}`} onClick={(e) => e.stopPropagation()}>
        {dialog.woolly && <Woolly act={dialog.woolly} size={112} peek delay={160} className="dialog-woolly" />}
        <div ref={ref} tabIndex={-1} className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title">
        <h3 className="dialog-title" id="dialog-title">
          {dialog.title}
        </h3>
        {dialog.message && <p className="dialog-message">{dialog.message}</p>}
        <div className="dialog-actions">
          <button className="btn btn-ghost" onClick={() => dialog.resolve(false)} autoFocus>
            {dialog.cancel}
          </button>
          <button className={`btn ${dialog.danger ? 'btn-danger' : 'btn-gold'}`} onClick={() => dialog.resolve(true)}>
            {dialog.confirm}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}

export default function Overlays() {
  const { dialog, toast } = useOverlays();
  return createPortal(
    <>
      {dialog && <Dialog dialog={dialog} />}
      {toast && (
        <div className="toast" key={toast.id} role="status">
          {toast.icon && <Glyph name={toast.icon} size={18} />}
          <span>{toast.message}</span>
          {toast.action && (
            <button className="toast-action" onClick={toast.action.run}>
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </>,
    document.body,
  );
}
