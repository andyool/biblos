import { useEffect, useRef, useState } from 'react';
import Sheet from '../components/Sheet.jsx';
import Glyph from '../components/Glyph.jsx';
import { getState, useStore } from '../lib/store.js';
import { sessionsDone, undoRestore } from '../lib/actions.js';
import { isIOS, isStandalone, progressSummary, savedOn } from '../lib/device.js';
import { bringIn, hasCode, makeCode, readCode } from '../lib/transfer.js';
import { ask, toast } from '../lib/ui.js';

/**
 * Move your progress with no account: copy a code here and paste it into Biblos elsewhere, the
 * Home Screen app on iPhone (which keeps its own progress, apart from Safari) or another phone.
 */
export default function TransferSheet({ onClose }) {
  const begun = useStore((s) => s.settings.onboarded && sessionsDone(s.stats) > 0);
  // In Safari on iPhone, where the Home Screen app will start empty.
  const fromSafari = begun && isIOS() && !isStandalone();
  const [code, setCode] = useState('');
  const [draft, setDraft] = useState('');
  const codeRef = useRef(null);
  const pasteRef = useRef(null);
  const busy = useRef(false);

  // Made as the sheet opens, so Copy can put it on the clipboard at once (Safari only allows that
  // straight from the tap).
  useEffect(() => {
    if (!begun) return undefined;
    let live = true;
    makeCode()
      .then((c) => live && setCode(c))
      .catch(() => live && toast('The code could not be made. Save a backup instead.'));
    return () => {
      live = false;
    };
  }, [begun]);

  const copy = async () => {
    let copied = false;
    try {
      await navigator.clipboard.writeText(code);
      copied = true;
    } catch {
      // Some browsers (those inside other apps, say) refuse the clipboard: the older way may still work.
      codeRef.current?.select();
      try {
        copied = document.execCommand('copy');
      } catch {
        copied = false;
      }
    }
    if (copied) toast(fromSafari ? 'Code copied. Now add Biblos to your Home Screen.' : 'Code copied. Now paste it into the other Biblos.', 'check');
    else toast('Copy the code by hand: it is selected.');
  };

  const send = async () => {
    try {
      await navigator.share({ title: 'Biblos transfer code', text: `My Biblos progress. In Biblos, open Me, then Settings, then Move your progress, and paste this:\n\n${code}` });
    } catch {
      /* cancelled */
    }
  };

  const take = async (text) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const data = await readCode(text);
      const copied = Date.parse(data.exported);
      const ok = await ask({
        title: 'Bring in this progress?',
        message: `${copied ? `Copied ${savedOn(copied)}, with` : 'It holds'} ${progressSummary(data.state)}.${begun ? ` It replaces what is here now: ${progressSummary(getState())}. You can undo that for a week.` : ''}`,
        confirm: 'Bring it in',
        woolly: 'unsure',
      });
      if (!ok) return;
      bringIn(data);
      onClose();
      toast('Your progress is here', 'check', { label: 'Undo', run: () => undoRestore() && toast('Your progress is back as it was', 'check') });
    } catch (err) {
      toast(err.message || 'That code could not be read.');
    } finally {
      busy.current = false;
    }
  };

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (hasCode(text)) {
        setDraft(text);
        take(text);
        return;
      }
      if (text) toast('What you copied isn’t a Biblos transfer code. Copy the whole code and try again.');
    } catch {
      /* not allowed here: paste by hand */
    }
    pasteRef.current?.focus();
  };

  return (
    <Sheet title="Move your progress" onClose={onClose}>
      {begun && (
        <>
          <p className="lead">
            {fromSafari
              ? 'Biblos on your Home Screen keeps its own progress, apart from Safari. Copy this code, then paste it there.'
              : 'Copy this code, then paste it into Biblos on your other phone. No account needed.'}
          </p>
          {fromSafari && (
            <ol className="steps">
              <li>Copy the code.</li>
              <li>
                Tap <Glyph name="share" size={15} className="inline-glyph" /> <strong>Share</strong>, then <strong>Add to Home Screen</strong>.
              </li>
              <li>
                Open Biblos from the new icon, and tap <strong>Paste your progress</strong>.
              </li>
            </ol>
          )}
          <textarea
            ref={codeRef}
            className="input textarea transfer-code"
            value={code || 'Making your code…'}
            readOnly
            rows={3}
            onFocus={(e) => e.target.select()}
            aria-label="Your transfer code"
          />
          <div className="sheet-actions">
            <button className="btn btn-gold btn-block" onClick={copy} disabled={!code}>
              Copy the code
            </button>
            {!fromSafari && typeof navigator.share === 'function' && (
              <button className="btn btn-ghost btn-block" onClick={send} disabled={!code}>
                <Glyph name="share" size={18} /> Send it to your other phone
              </button>
            )}
          </div>
          <p className="small-print">The code holds your verses, streak, journal and settings. Anyone who pastes it gets a copy of them, so send it only to yourself.</p>
          <h3 className="section-heading">Onto this phone</h3>
        </>
      )}
      <p className={begun ? 'small-print' : 'lead'}>
        {begun ? 'Bringing in a code replaces the progress here.' : 'Paste the code you copied in Safari or on your other phone.'}
      </p>
      <button className={`btn ${begun ? 'btn-ghost' : 'btn-gold'} btn-block`} onClick={paste}>
        <Glyph name="upload" size={18} /> Paste your progress
      </button>
      <textarea
        ref={pasteRef}
        className="input textarea transfer-code"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          if (hasCode(e.target.value)) take(e.target.value);
        }}
        placeholder="…or paste the code here"
        rows={3}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        aria-label="Paste a transfer code"
      />
    </Sheet>
  );
}
