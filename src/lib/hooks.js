import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
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

/** Whether a CSS media query matches, kept up to date. */
export function useMedia(query) {
  const subscribe = useCallback(
    (onChange) => {
      const list = matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => matchMedia(query).matches, () => false);
}

/** A short screen (a small phone, or a browser's bars taking room), where Woolly stands smaller. */
export const SHORT_SCREEN = '(max-height: 720px)';
