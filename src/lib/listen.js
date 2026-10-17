import { norm } from './text.js';

// Reciting aloud: the phone's speech recognition turns what you say into words, which are
// matched against the verse one by one. (Chrome sends the audio to Google to do this, Safari
// to Apple or the phone itself.)

const recognition = () => (typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null);
let blocked = false;

export const canListen = () => Boolean(recognition()) && !blocked;

/**
 * Listen until stopped or the speaker falls silent. onWords receives every word heard so far
 * (normalised); the last one may still change unless `final` is true.
 * Returns a function that stops listening.
 */
export function listen({ onWords, onEnd, onError }) {
  const Recognition = recognition();
  const rec = new Recognition();
  const lang = navigator.language || 'en-US';
  rec.lang = lang.toLowerCase().startsWith('en') ? lang : 'en-US';
  rec.continuous = true;
  rec.interimResults = true;
  rec.onresult = (event) => {
    const results = Array.from(event.results);
    const text = results.map((r) => r[0].transcript).join(' ');
    onWords(text.split(/\s+/).map(norm).filter(Boolean), results[results.length - 1]?.isFinal);
  };
  rec.onerror = (event) => {
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') blocked = true;
    onError?.(event.error);
  };
  rec.onend = () => onEnd?.();
  try {
    rec.start();
  } catch {
    onError?.('start');
    onEnd?.();
  }
  return () => {
    try {
      rec.stop();
    } catch {
      /* already stopped */
    }
  };
}

const NUMBERS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

// Words that sound the same, which speech recognition often mixes up.
const SOUNDS_ALIKE = [
  ['to', 'two', 'too'],
  ['for', 'four', 'fore'],
  ['one', 'won'],
  ['son', 'sun'],
  ['no', 'know'],
  ['knew', 'new'],
  ['there', 'their', 'theyre'],
  ['hear', 'here'],
  ['right', 'write', 'rite'],
  ['whole', 'hole'],
  ['soul', 'sole'],
  ['pray', 'prey'],
  ['reign', 'rain', 'rein'],
  ['see', 'sea'],
  ['be', 'bee'],
  ['i', 'eye', 'aye'],
  ['by', 'buy', 'bye'],
  ['heard', 'herd'],
  ['through', 'threw'],
  ['whose', 'whos'],
  ['thee', 'the'],
  ['peace', 'piece'],
  ['wait', 'weight'],
  ['way', 'weigh'],
  ['great', 'grate'],
  ['holy', 'wholly'],
  // Older words, as a recogniser tends to write them.
  ['hath', 'has'],
  ['saith', 'says', 'sayeth'],
  ['doth', 'does'],
  ['unto', 'onto'],
];
const ALIKE = new Map();
for (const group of SOUNDS_ALIKE) for (const w of group) ALIKE.set(w, new Set(group));
NUMBERS.forEach((w, n) => {
  ALIKE.set(w, new Set([...(ALIKE.get(w) || [w]), String(n)]));
  ALIKE.set(String(n), new Set([w, String(n)]));
});

function distance(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const row = [i];
    for (let j = 1; j <= b.length; j += 1) row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = row;
  }
  return prev[b.length];
}

/** Does a heard word (normalised) match a word of the verse (normalised)? */
export function sameWord(heard, word) {
  if (heard === word || ALIKE.get(word)?.has(heard)) return true;
  // Close enough: a slip of the recogniser ("forgiven" for "forgive", "shepard" for "shepherd").
  if (word.length >= 4 && heard[0] === word[0]) return distance(heard, word) <= (word.length >= 8 ? 2 : 1);
  return false;
}
