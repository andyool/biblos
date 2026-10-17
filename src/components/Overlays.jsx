import { createPortal } from 'react-dom';
import { useOverlays } from '../lib/ui.js';
import Glyph from './Glyph.jsx';
import { useBack } from '../lib/nav.js';

function Dialog({ dialog }) {
  useBack(() => dialog.resolve(false));
  return (
    <div className="dialog-backdrop" onClick={() => dialog.resolve(false)}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" onClick={(e) => e.stopPropagation()}>
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
        </div>
      )}
    </>,
    document.body,
  );
}
