import { useState } from 'react';

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

/** An on-screen keyboard — no autocorrect, no zooming, works the same on every phone. */
export default function Keyboard({ onKey, digits = false, disabled = false, flash }) {
  const [pressed, setPressed] = useState(null);
  const rows = digits ? ['1234567890', ...ROWS] : ROWS;

  const down = (e, ch) => {
    e.preventDefault();
    if (disabled) return;
    setPressed(ch);
    setTimeout(() => setPressed((p) => (p === ch ? null : p)), 140);
    onKey(ch);
  };

  return (
    <div className={`keyboard ${disabled ? 'is-disabled' : ''}`} role="group" aria-label="Letters">
      {rows.map((row) => (
        <div className="kb-row" key={row}>
          {[...row].map((ch) => (
            <button
              key={ch}
              type="button"
              className={`kb-key ${pressed === ch ? 'is-pressed' : ''} ${flash?.key === ch ? `is-${flash.kind}` : ''}`}
              onPointerDown={(e) => down(e, ch)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && down(e, ch)}
              aria-label={ch}
            >
              {ch}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
