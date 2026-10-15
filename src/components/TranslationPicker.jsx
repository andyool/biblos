import { TRANSLATIONS } from '../data/translations.js';
import { useYouVersionReady } from '../lib/bible.js';
import Glyph from './Glyph.jsx';

export default function TranslationPicker({ value, onPick, compact = false }) {
  const hasKey = useYouVersionReady();
  return (
    <div className={`tr-list ${compact ? 'is-compact' : ''}`} role="radiogroup">
      {TRANSLATIONS.map((t) => (
        <button key={t.id} role="radio" aria-checked={value === t.id} className={`tr-item ${value === t.id ? 'is-on' : ''}`} onClick={() => onPick(t.id)}>
          <span className="tr-abbr">{t.id}</span>
          <span className="tr-name">
            {t.name}
            {t.note && <small> · {t.note}</small>}
          </span>
          {t.source === 'yv' && !hasKey && (
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
