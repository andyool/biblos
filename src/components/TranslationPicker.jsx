import { TRANSLATIONS } from '../data/translations.js';
import { useYouVersionReady } from '../lib/bible.js';
import { useStore } from '../lib/store.js';
import Glyph from './Glyph.jsx';

export default function TranslationPicker({ value, onPick, compact = false }) {
  const hasKey = useYouVersionReady();
  const nivUnlocked = useStore((s) => s.settings.nivUnlocked);
  // The NIV only shows where it is unlocked (or for a verse already learnt in it).
  const shown = TRANSLATIONS.filter((t) => t.source !== 'yv' || nivUnlocked || t.id === value);
  return (
    <div className={`tr-list ${compact ? 'is-compact' : ''}`} role="radiogroup">
      {shown.map((t) => (
        <button key={t.id} role="radio" aria-checked={value === t.id} className={`tr-item ${value === t.id ? 'is-on' : ''}`} onClick={() => onPick(t.id)}>
          <span className="tr-abbr">{t.id}</span>
          <span className="tr-name">
            {t.name}
            {t.note && <small> · {t.note}</small>}
          </span>
          {t.source === 'yv' && !hasKey && nivUnlocked && (
            <span className="tr-tag">
              <Glyph name="key" size={13} /> key
            </span>
          )}
          {value === t.id && <Glyph name="check" size={18} className="tr-check" />}
        </button>
      ))}
    </div>
  );
}
