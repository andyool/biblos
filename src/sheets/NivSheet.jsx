import { useState } from 'react';
import Sheet from '../components/Sheet.jsx';
import Glyph from '../components/Glyph.jsx';
import { useStore } from '../lib/store.js';
import { serverKeyConfigured, testYouVersionKey } from '../lib/bible.js';
import { updateSettings } from '../lib/actions.js';
import { toast } from '../lib/ui.js';

const LICENCES = 'https://platform.youversion.com/platform/licenses';

export default function NivSheet({ onClose }) {
  const saved = useStore((s) => s.settings.yvKey);
  const [key, setKey] = useState(saved);
  const [status, setStatus] = useState(null); // { ok, text }
  const [busy, setBusy] = useState(false);
  const fromServer = !saved && serverKeyConfigured();

  const connect = async () => {
    if (!key.trim()) return;
    setBusy(true);
    setStatus(null);
    try {
      await testYouVersionKey(key);
      updateSettings({ yvKey: key.trim() });
      setStatus({ ok: true, text: 'Connected — the NIV is ready.' });
      toast('NIV connected', 'check');
      setTimeout(onClose, 900);
    } catch (err) {
      if (err.kind === 'license') {
        // The key itself is good — keep it, so the NIV switches on as soon as the licence is accepted.
        updateSettings({ yvKey: key.trim() });
        setStatus({ ok: false, license: true });
      } else {
        setStatus({
          ok: false,
          text:
            err.kind === 'auth' || err.kind === 'needs-key'
              ? 'YouVersion did not recognise that key. Copy the App Key again from your app on platform.youversion.com and paste it here.'
              : err.message,
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const disconnect = () => {
    updateSettings({ yvKey: '' });
    setKey('');
    setStatus(null);
  };

  return (
    <Sheet title="Unlock the NIV" onClose={onClose} woolly="hint">
      <p className="lead">
        The New International Version is copyrighted by Biblica, so free Bible services may not share it. YouVersion — the makers of the Bible App — give a free key that unlocks it.
      </p>
      <ol className="steps">
        <li>
          Open{' '}
          <a href="https://platform.youversion.com" target="_blank" rel="noreferrer">
            platform.youversion.com
          </a>{' '}
          and sign in with your Bible App account (or create one — it’s free).
        </li>
        <li>Create an app (call it “Biblos”) and copy its <strong>App Key</strong>.</li>
        <li>
          Open{' '}
          <a href={LICENCES} target="_blank" rel="noreferrer">
            Licenses
          </a>{' '}
          in the portal and accept the <strong>Biblica</strong> licence (it covers the NIV).
        </li>
        <li>Paste the key below.</li>
      </ol>
      {fromServer && (
        <div className="note note-ok">
          <Glyph name="check" size={16} /> A key is set up on your Vercel server, so the NIV already works on every device.
        </div>
      )}
      <label className="field">
        <span>YouVersion App Key</span>
        <input className="input" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Paste your key" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      </label>
      {status?.license ? (
        <div className="note note-error">
          <p>
            <strong>Your key works</strong> and is saved — but your YouVersion app hasn’t accepted the NIV licence yet.
          </p>
          <p>
            Open{' '}
            <a href={LICENCES} target="_blank" rel="noreferrer">
              Licenses on platform.youversion.com
            </a>
            , accept the <strong>Biblica</strong> licence (NIV), then come back and tap Connect again.
          </p>
        </div>
      ) : (
        status && <div className={`note ${status.ok ? 'note-ok' : 'note-error'}`}>{status.text}</div>
      )}
      <div className="sheet-actions">
        <button className="btn btn-gold btn-block" onClick={connect} disabled={busy || !key.trim()}>
          {busy ? 'Checking…' : 'Connect'}
        </button>
        {saved && (
          <button className="btn btn-ghost btn-block" onClick={disconnect}>
            Remove key
          </button>
        )}
      </div>
      <p className="small-print">
        The key is saved on this phone. To make the NIV work on every device, add it in Vercel → Settings → Environment Variables as <code>YVP_APP_KEY</code> and redeploy. Until then you can paste NIV text for any verse by hand.
      </p>
    </Sheet>
  );
}
