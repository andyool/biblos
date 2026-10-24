import Sheet from '../components/Sheet.jsx';
import TranslationPicker from '../components/TranslationPicker.jsx';
import { useApp } from '../AppContext.js';
import { useStore } from '../lib/store.js';
import { updateSettings } from '../lib/actions.js';
import { hasYouVersion } from '../lib/bible.js';
import { getTranslation } from '../data/translations.js';

/** The Bible new verses are learned in, from the Today card or Me. */
export default function TranslationSheet({ onClose }) {
  const translation = useStore((s) => s.settings.translation);
  const { openSheet } = useApp();
  return (
    <Sheet title="Your Bible" onClose={onClose}>
      <p className="lead">New verses use this Bible. Verses you’ve begun keep their own.</p>
      <TranslationPicker
        value={translation}
        onPick={(id) => {
          updateSettings({ translation: id });
          onClose();
          if (getTranslation(id).source === 'yv' && !hasYouVersion()) openSheet({ type: 'niv' });
        }}
      />
    </Sheet>
  );
}
