import { useCallback, useEffect, useState } from 'react';
import { getText, useTextsVersion } from './texts.js';
import { loadPassage } from './bible.js';

/** The text of a passage, loading it if needed. */
export function useVerseText(tr, id, autoload = true) {
  useTextsVersion();
  const entry = id ? getText(tr, id) : null;
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!id || !autoload || getText(tr, id)) return undefined;
    let alive = true;
    setStatus('loading');
    setError(null);
    loadPassage(tr, id)
      .then(() => alive && setStatus('ready'))
      .catch((err) => {
        if (!alive) return;
        setError(err);
        setStatus('error');
      });
    return () => {
      alive = false;
    };
  }, [tr, id, autoload, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { entry, status: entry ? 'ready' : status, error: entry ? null : error, retry };
}
