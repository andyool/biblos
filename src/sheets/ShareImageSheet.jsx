import { useEffect, useState } from 'react';
import Sheet from '../components/Sheet.jsx';
import Glyph from '../components/Glyph.jsx';
import { useStore } from '../lib/store.js';
import { verseImage } from '../lib/verseImage.js';
import { shareFile } from '../lib/device.js';
import { toast } from '../lib/ui.js';
import { formatRef } from '../data/books.js';
import { cue } from '../mascot/bus.js';

/**
 * A verse as a picture, to look at first and then share. (Phones only open the share sheet
 * straight after a tap, so the picture is drawn before the Share button is pressed.)
 */
export default function ShareImageSheet({ id, tr, text, onClose }) {
  const frame = useStore((s) => s.settings.frame);
  const verseFont = useStore((s) => s.settings.verseFont);
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let alive = true;
    let made = null;
    verseImage({ id, tr, text, frame, verseFont })
      .then((f) => {
        if (!alive) return;
        made = URL.createObjectURL(f);
        setFile(f);
        setUrl(made);
      })
      .catch(() => alive && toast('The picture could not be made.'));
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [id, tr, text, frame, verseFont]);

  const share = async () => {
    cue('share');
    const result = await shareFile(file, formatRef(id));
    if (result === 'downloaded') toast('Picture saved to your downloads', 'check');
  };

  return (
    <Sheet title="Share as a picture" onClose={onClose} className="share-sheet">
      <div className="share-preview">
        {url ? (
          <img src={url} alt={`${formatRef(id)} in your frame and lettering`} />
        ) : (
          <div className="loading-lines">
            <span />
            <span />
          </div>
        )}
      </div>
      <p className="small-print center">In your theme, frame and lettering.</p>
      <div className="sheet-actions">
        <button className="btn btn-gold btn-block" onClick={share} disabled={!file}>
          <Glyph name="share" size={18} /> Share
        </button>
      </div>
    </Sheet>
  );
}
