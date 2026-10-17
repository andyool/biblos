// The newer exercises: how each is built from a verse's words.
//   glimpse  Look, cover, rebuild: a phrase shows for a moment, then is rebuilt from memory.
//   pairs    Join the beginning of each phrase to its ending.
//   chain    What comes next? Choose the next phrase from near misses.
//   slip     Spot the words that have been changed.
//   sort     Phrases from two alike verses, each sorted to its own.
//   opening  From the reference alone, choose how the verse begins.
//   rush     Tap the words in order before the lamp burns low.
//   spell    Write a few key words out in full.
// Most take `weak`, the verse's shaky words worst first, and aim at them.

import { STOP, bare, norm, orderGroups, phrases, pick, shuffle, splitPunct, startsSentence } from './text.js';

// Words easily put in each other's place when reciting. Never two spellings of one word
// (honour/honor): both are right in some Bible. Words that are both noun and verb (love, light,
// sin, good) are left out, so a stand-in never reads as plainly wrong.
const ALIKE = [
  'lord god',
  'christ jesus',
  'shall will',
  'eternal everlasting',
  'world earth',
  'heart soul',
  'heart mind',
  'hearts minds',
  'strength power',
  'loved cherished',
  'loves cherishes',
  'strong mighty',
  'great mighty',
  'joy gladness',
  'peace rest',
  'hope trust',
  'faith belief',
  'believe trust',
  'believes trusts',
  'believed trusted',
  'wisdom knowledge understanding',
  'righteous upright',
  'righteousness justice',
  'sins iniquities transgressions',
  'gave sent',
  'give grant',
  'son child',
  'sons children',
  'people nations',
  'glory majesty',
  'praise worship',
  'sing shout',
  'path way',
  'paths ways',
  'word law',
  'commands precepts statutes decrees',
  'salvation deliverance',
  'refuge fortress stronghold',
  'shield rock',
  'keep guard',
  'guide lead',
  'comfort console',
  'mercy grace',
  'goodness kindness',
  'steadfast unfailing faithful',
  'afraid dismayed',
  'fear dread',
  'trouble distress',
  'rejoice delight',
  'glad joyful',
  'blessed happy',
  'call cry',
  'hear listen',
  'see behold',
  'know understand',
  'seek search',
  'walk go',
  'rise stand',
  'forever always',
  'everyone whoever',
  'perish die',
  'plans thoughts purposes',
  'prosper succeed',
  'harm evil',
  'weary tired',
  'renew restore',
  'faint fall',
  'door gate',
  'narrow small',
  'wide broad',
  'burden load',
  'gentle meek',
  'humble lowly',
  'anxious worried',
  'prayer petition',
  'pure clean',
  'lovely beautiful',
  'created made',
  'heavens skies',
  'darkness night',
  'said spoke',
  'live dwell',
  'dwell abide',
  'remain abide',
  'fruit harvest',
  'gift reward',
  'saved rescued',
  'eyes face',
  'hand arm',
  'hands arms',
  'mouth lips',
  'speak say',
  'pastures meadows',
  'waters streams',
  'rod staff',
  'house temple',
  'days years',
  'temptation testing',
  'debts sins',
  'bread food',
  'kingdom reign',
  'enemies foes',
  'mountains hills',
];

const ALIKE_MAP = new Map();
for (const line of ALIKE) {
  const words = line.split(' ');
  for (const w of words) {
    const set = ALIKE_MAP.get(w) || new Set();
    words.forEach((o) => o !== w && set.add(o));
    ALIKE_MAP.set(w, set);
  }
}

const SUFFIXES = ['ness', 'ings', 'ing', 'eth', 'est', 'ies', 'ed', 'ly', 'es', 's'];
const suffixOf = (n) => SUFFIXES.find((s) => n.endsWith(s) && n.length > s.length + 2) || '';
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/** Give a word the capitals of the one it stands in for (LORD → GOD, Lord → God, lord → god). */
function matchCase(word, model) {
  if (model.length > 1 && model === model.toUpperCase() && /\p{Lu}/u.test(model)) return word.toUpperCase();
  if (/^\p{Lu}/u.test(model)) return word[0].toUpperCase() + word.slice(1);
  return word;
}

const hasTwin = (t) => (ALIKE_MAP.has(t.n) ? 1 : 0);

/** A word worth changing or hiding: a word of substance, or one with a near twin. */
export const eligible = (t) => !/\d/.test(t.w) && ((t.n.length >= 3 && !STOP.has(t.n)) || ALIKE_MAP.has(t.n));

export const phraseText = (tokens, idx) => idx.map((i) => tokens[i].w).join(' ');

const normText = (s) => norm(s.replace(/\s+/g, ''));

/**
 * A believable stand-in for tokens[i], with its punctuation: a near twin if it has one,
 * otherwise a word of the same length and ending from other verses. Null if none will do.
 */
export function lureWord(tokens, i, pool) {
  const t = tokens[i];
  const [lead, core, trail] = splitPunct(t.w);
  if (!core) return null;
  const inVerse = new Set(tokens.map((x) => x.n));
  // "your will be done": a will, not shall.
  const noun = t.n === 'will' && /^(the|a|my|your|his|her|our|their|thy|its)$/.test(tokens[i - 1]?.n || '');
  const twins = noun ? [] : [...(ALIKE_MAP.get(t.n) || [])].filter((w) => !inVerse.has(w));
  let w = twins.length ? pick(twins) : null;
  if (!w) {
    const isName = /^\p{Lu}/u.test(core) && !startsSentence(tokens[i - 1]?.w);
    const fits = pool.filter((p) => {
      const n = norm(p);
      return n && !inVerse.has(n) && !STOP.has(n) && Math.abs(n.length - t.n.length) <= 2 && /^\p{Lu}/u.test(p) === isName;
    });
    const same = fits.filter((p) => suffixOf(norm(p)) === suffixOf(t.n));
    w = pick(same.length ? same : fits) || null;
    if (w && !isName) w = w.toLowerCase();
  }
  return w ? lead + matchCase(w, core) + trail : null;
}

/**
 * Up to k words to aim at, spread apart: shaky ones first (most of the time), then any.
 * once: only words that appear once in the verse, so the answer isn't showing elsewhere.
 */
export function pickTargets(tokens, k, weak = [], { once = false, test = eligible } = {}) {
  const counts = new Map();
  tokens.forEach((t) => counts.set(t.n, (counts.get(t.n) || 0) + 1));
  const ok = (i) => test(tokens[i]) && (!once || counts.get(tokens[i].n) === 1);
  const chosen = [];
  const apart = (i) => chosen.every((j) => Math.abs(i - j) > 2 && tokens[j].n !== tokens[i].n);
  // Shaky words first (most of the time), then words with a near twin, which make the
  // likeliest slips, then any.
  const rest = shuffle(tokens.map((t) => t.i)).sort((a, b) => hasTwin(tokens[b]) - hasTwin(tokens[a]));
  for (const i of weak) if (chosen.length < k && ok(i) && apart(i) && Math.random() < 0.75) chosen.push(i);
  for (const i of rest) if (chosen.length < k && ok(i) && apart(i)) chosen.push(i);
  return chosen.sort((a, b) => a - b);
}

/** A run of at most `max` phrases: around the shakiest word if there is one. */
function runOf(groups, max, weak) {
  if (groups.length <= max) return [0, groups.length];
  const at = weak.length ? groups.findIndex((g) => g.includes(weak[0])) : -1;
  const lo = at >= 0 ? clamp(at - Math.floor(Math.random() * max), 0, groups.length - max) : Math.floor(Math.random() * (groups.length - max + 1));
  return [lo, lo + max];
}

/**
 * A phrase with one slip in it: a word changed (a shaky one if possible), or failing that two
 * words swapped. { text, miss: the word that slipped } or null.
 */
function alterPhrase(tokens, g, pool, weak, avoid = new Set()) {
  const words = g.filter((i) => eligible(tokens[i]) && !avoid.has(i));
  const shaky = words.filter((i) => weak.includes(i));
  const twins = shuffle(words).sort((a, b) => hasTwin(tokens[b]) - hasTwin(tokens[a]));
  for (const i of [...shuffle(shaky), ...twins]) {
    const w = lureWord(tokens, i, pool);
    if (w) return { text: g.map((j) => (j === i ? w : tokens[j].w)).join(' '), miss: i };
  }
  // Words with capitals stay put, so a swap never shows a capital in the wrong place.
  const parts = g.map((i) => splitPunct(tokens[i].w));
  const lower = (n) => !/^\p{Lu}/u.test(parts[n][1]);
  const k = g.findIndex((i, n) => n < g.length - 1 && !avoid.has(i) && tokens[i].n !== tokens[g[n + 1]].n && lower(n) && lower(n + 1));
  if (k < 0 || g.length < 3) return null;
  const out = parts.map(([l, c, t]) => l + c + t);
  out[k] = parts[k][0] + parts[k + 1][1] + parts[k][2];
  out[k + 1] = parts[k + 1][0] + parts[k][1] + parts[k + 1][2];
  return { text: out.join(' '), miss: g[k] };
}

// ── The exercises ──────────────────────────────────────────────────────────────

/** Look, cover, rebuild: up to four phrases, each with one look-alike word among its tiles. */
export function glimpseStep(id, tokens, pool, weak = []) {
  const groups = orderGroups(tokens);
  if (!groups.length) return null;
  const [lo, hi] = runOf(groups, 4, weak);
  const run = groups.slice(lo, hi);
  const lures = run.map((g) => {
    const words = g.filter((i) => eligible(tokens[i]));
    const w = words.length ? lureWord(tokens, pick(words), pool) : null;
    return w ? bare(w) : null;
  });
  return { type: 'glimpse', verseId: id, groups: run, lures };
}

/** Each phrase cut in two, to be joined again. */
export function pairsStep(id, tokens, weak = []) {
  const groups = orderGroups(tokens).filter((g) => g.length >= 2);
  if (groups.length < 3) return null;
  const [lo, hi] = runOf(groups, 5, weak);
  const pairs = groups.slice(lo, hi).map((g) => {
    const cut = clamp(Math.round(g.length * 0.45), 1, g.length - 1);
    return { head: phraseText(tokens, g.slice(0, cut)), tail: phraseText(tokens, g.slice(cut)), at: g[cut] };
  });
  if (new Set(pairs.map((p) => p.tail)).size < pairs.length) return null;
  return { type: 'pairs', verseId: id, pairs };
}

/**
 * What comes next, phrase by phrase. Beside the right phrase: the same phrase with a word
 * changed, and a phrase from further on (jumping ahead is the usual slip).
 */
export function chainStep(id, tokens, pool, weak = []) {
  const groups = orderGroups(tokens);
  if (groups.length < 3) return null;
  const [lo, hi] = runOf(groups, 5, weak);
  const rounds = [];
  for (let p = lo; p < hi; p += 1) {
    const g = groups[p];
    const right = phraseText(tokens, g);
    const options = [{ text: right, ok: true }];
    const seen = new Set([normText(right)]);
    const add = (opt) => {
      if (!opt || seen.has(normText(opt.text))) return;
      seen.add(normText(opt.text));
      options.push(opt);
    };
    const altered = alterPhrase(tokens, g, pool, weak);
    add(altered);
    const unseen = (q) => q >= 0 && q < groups.length && !seen.has(normText(phraseText(tokens, groups[q])));
    const jump = [p + 1, p + 2].find(unseen);
    if (jump != null) add({ text: phraseText(tokens, groups[jump]), miss: g[0] });
    // At the end there is nothing to jump to: a second slip instead, or a phrase from before.
    if (options.length < 3 && altered) add(alterPhrase(tokens, g, pool, weak, new Set([altered.miss])));
    const back = [p - 2, p - 1].find(unseen);
    if (options.length < 3 && back != null) add({ text: phraseText(tokens, groups[back]), miss: g[0] });
    if (options.length < 2) return null;
    rounds.push({ at: p, options: shuffle(options) });
  }
  return { type: 'chain', verseId: id, from: groups[lo][0], rounds };
}

/** The verse with a few words changed, to be found. About one change per fourteen words. */
export function slipStep(id, tokens, pool, weak = [], count = 0) {
  const k = count || clamp(Math.round(tokens.length / 14), 1, 3);
  const swaps = {};
  for (const i of pickTargets(tokens, k, weak)) {
    const w = lureWord(tokens, i, pool);
    if (w && norm(w) !== tokens[i].n) swaps[i] = w;
  }
  if (!Object.keys(swaps).length) return null;
  return { type: 'slip', verseId: id, swaps };
}

/** Phrases from this verse and one like it (other: { id, tokens }), each to be put with its own. */
export function sortStep(id, tokens, other) {
  if (!other) return null;
  const a = orderGroups(tokens);
  const b = orderGroups(other.tokens);
  if (a.length < 2 || b.length < 2) return null;
  const take = (gs, tks, ref, mine) => shuffle(gs).slice(0, 3).map((g) => ({ text: phraseText(tks, g), ref, at: mine ? g[0] : null }));
  const cards = [...take(a, tokens, id, true), ...take(b, other.tokens, other.id, false)];
  // A phrase both verses share can go either way, so it is left out.
  const count = new Map();
  cards.forEach((c) => count.set(normText(c.text), (count.get(normText(c.text)) || 0) + 1));
  const sortable = cards.filter((c) => count.get(normText(c.text)) === 1);
  if (sortable.length < 4 || !sortable.some((c) => c.ref === id) || !sortable.some((c) => c.ref === other.id)) return null;
  return { type: 'sort', verseId: id, other: other.id, cards: shuffle(sortable), sides: shuffle([id, other.id]) };
}

const openingOf = (tokens) => {
  const first = phrases(tokens)[0] || [];
  return first.slice(0, clamp(first.length, Math.min(3, tokens.length), 8));
};

/** From the reference alone: the right opening, one with a slip, and other verses' openings. */
export function openingStep(id, tokens, pool, weak = [], others = []) {
  const head = openingOf(tokens);
  if (head.length < 3) return null;
  const options = [{ text: phraseText(tokens, head), ok: true }];
  const seen = new Set([normText(options[0].text)]);
  const altered = alterPhrase(tokens, head, pool, weak);
  if (altered && !seen.has(normText(altered.text))) {
    options.push({ text: altered.text, miss: altered.miss });
    seen.add(normText(altered.text));
  }
  for (const o of others) {
    if (options.length >= 4) break;
    const text = phraseText(o.tokens, openingOf(o.tokens));
    if (!text || seen.has(normText(text))) continue;
    seen.add(normText(text));
    options.push({ text, ref: o.id, miss: head[0] });
  }
  if (options.length < 3) return null;
  return { type: 'opening', verseId: id, options: shuffle(options), more: tokens.length > head.length };
}

/** Up to 22 words against the clock, with three look-alike words thrown in. */
export function rushStep(id, tokens, pool, weak = []) {
  const n = tokens.length;
  const size = Math.min(n, 22);
  if (size < 5) return null;
  let start = 0;
  if (n > size) {
    const starts = phrases(tokens)
      .map((g) => g[0])
      .filter((s) => s + size <= n);
    const covering = starts.filter((s) => weak.some((i) => i >= s && i < s + size));
    start = pick(covering.length ? covering : starts.length ? starts : [n - size]);
  }
  const end = start + size - 1;
  const inRange = new Set(tokens.slice(start, end + 1).map((t) => t.n));
  const lures = [];
  for (const t of shuffle(tokens.slice(start, end + 1))) {
    if (lures.length >= 3) break;
    if (!eligible(t)) continue;
    const w = lureWord(tokens, t.i, pool);
    const b = w && bare(w);
    if (b && !inRange.has(norm(b)) && !lures.some((l) => norm(l) === norm(b))) lures.push(b);
  }
  return { type: 'rush', verseId: id, start, end, lures, seconds: Math.round(6 + size * 1.5) };
}

/** Two or three key words, written out letter by letter. */
export function spellStep(id, tokens, weak = [], count = 0) {
  const k = count || (tokens.length > 20 ? 3 : 2);
  const test = (t) => eligible(t) && t.n.length >= 4 && t.n.length <= 12 && /^[a-z]+$/.test(t.n);
  const targets = pickTargets(tokens, k, weak, { once: true, test });
  if (!targets.length) return null;
  return { type: 'spell', verseId: id, targets };
}
