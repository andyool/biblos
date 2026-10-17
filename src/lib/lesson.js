import { CURATED_IDS, PATHS, getPath } from '../data/paths.js';
import { LESSON_NAMES, LEVELS } from '../data/levels.js';
import { formatRef, parseId } from '../data/books.js';
import { allTexts, getText } from './texts.js';
import { STOP, bare, midSentence, norm, orderGroups, phrases, pick, shuffle, tokenize } from './text.js';
import { isDue } from './srs.js';
import { dayKey } from './dates.js';
import { choose, pickContext, weakIndices } from './adapt.js';
import { chainStep, glimpseStep, openingStep, pairsStep, rushStep, slipStep, sortStep, spellStep } from './activities.js';

export const verseTr = (state, id) => state.verses[id]?.tr || state.settings.translation;
export const verseLevel = (state, id) => state.verses[id]?.level || 0;

// A verse grows at most two stages a day (Sown and Rooted today, Growing and Fruitful
// tomorrow): memory settles overnight, so a verse crammed in one sitting is soon lost.
export const GROWTH_PER_DAY = 2;

// The accuracy each of the four lessons needs before the verse grows. Below it, the verse
// stays where it is and the lesson can be tried again.
export const PASS_MARK = [0.6, 0.6, 0.6, 0.8];

/** How many stages a verse has grown today. */
export const grownToday = (verse, now = Date.now()) => (verse?.grew?.day === dayKey(now) ? verse.grew.n : 0);

/** A verse that is still being learned and has grown all it can today. */
export const resting = (verse, now = Date.now()) => (verse?.level || 0) < 4 && grownToday(verse, now) >= GROWTH_PER_DAY;

// ── What to do next ────────────────────────────────────────────────────────────

export function planNext(state, now = Date.now()) {
  const all = Object.values(state.verses);
  const due = all.filter((v) => isDue(v, now)).sort((a, b) => a.srs.due - b.srs.due);
  if (due.length) {
    return {
      kind: 'review',
      verseIds: due.slice(0, 3).map((v) => v.id),
      title: 'Tend your verses',
      detail: `${due.length} ${due.length === 1 ? 'verse is' : 'verses are'} ready to be recalled`,
    };
  }
  const learning = all.filter((v) => v.level >= 1 && v.level <= 3 && !resting(v, now)).sort((a, b) => (a.lastPracticed || 0) - (b.lastPracticed || 0));
  if (learning.length) {
    const v = learning[0];
    return {
      kind: 'learn',
      verseIds: [v.id],
      title: LESSON_NAMES[v.level],
      detail: `${formatRef(v.id)} · ${LEVELS[v.level].name} → ${LEVELS[v.level + 1].name}`,
    };
  }
  const path = getPath(state, state.settings.activePath);
  const fresh = path.verses.find((id) => verseLevel(state, id) === 0);
  if (fresh) return { kind: 'learn', verseIds: [fresh], title: 'Sow a new verse', detail: formatRef(fresh) };
  const nextPath = PATHS.find((p) => p.verses.some((id) => verseLevel(state, id) === 0));
  if (nextPath) {
    const id = nextPath.verses.find((v) => verseLevel(state, v) === 0);
    return { kind: 'learn', verseIds: [id], title: 'Sow a new verse', detail: `${formatRef(id)} · ${nextPath.title}`, pathId: nextPath.id };
  }
  const known = all.filter((v) => v.level >= 4).sort((a, b) => a.srs.due - b.srs.due);
  if (known.length) {
    return { kind: 'practice', verseIds: known.slice(0, 3).map((v) => v.id), title: 'Strengthen your verses', detail: 'Nothing is due — keep them shining' };
  }
  const settling = all.filter((v) => resting(v, now));
  if (settling.length) {
    return { kind: 'practice', verseIds: settling.slice(0, 3).map((v) => v.id), title: 'Go over today’s verses', detail: 'They grow again tomorrow' };
  }
  return null;
}

export function learnPlan(state, id) {
  const level = verseLevel(state, id);
  if (level >= 4) {
    return { kind: isDue(state.verses[id]) ? 'review' : 'practice', verseIds: [id], title: 'Recall', detail: formatRef(id) };
  }
  return { kind: 'learn', verseIds: [id], title: LESSON_NAMES[level], detail: formatRef(id) };
}

export function recitePlan(path) {
  return { kind: 'recite', verseIds: [...path.verses], title: `Recite ${path.title}`, detail: `${path.verses.length} verses, from beginning to end` };
}

// ── Building exercises ─────────────────────────────────────────────────────────

const FALLBACK_WORDS =
  'grace mercy heaven glory spirit faith light peace truth heart life hope power kingdom righteous strength father world people earth name salvation holy praise wisdom path joy blessed shepherd water bread mountain servant river morning promise refuge comfort temple nations prayer gospel children rejoice glorious'.split(
    ' ',
  );

function distractorPool(excludeNorms) {
  const words = new Map();
  for (const entry of Object.values(allTexts())) {
    for (const v of entry.verses) {
      const raws = v.t.split(/\s+/);
      raws.forEach((raw, i) => {
        const w = bare(raw);
        const n = norm(w);
        if (n.length >= 3 && !STOP.has(n) && !excludeNorms.has(n) && !words.has(n)) words.set(n, midSentence(w, raws[i - 1]));
      });
    }
    if (words.size > 600) break;
  }
  FALLBACK_WORDS.forEach((w) => !excludeNorms.has(w) && !words.has(w) && words.set(w, w));
  return [...words.values()];
}

function clozeStep(id, tokens, used, pool, weak = []) {
  const inVerse = new Map();
  tokens.forEach((t) => inVerse.set(t.n, (inVerse.get(t.n) || 0) + 1));
  let candidates = tokens.filter((t) => t.n.length >= 4 && !STOP.has(t.n) && !used.has(t.i));
  if (!candidates.length) candidates = tokens.filter((t) => t.n.length >= 2 && !used.has(t.i));
  if (!candidates.length) candidates = tokens;
  // A word that appears only once, so the answer isn't showing elsewhere in the verse.
  const once = candidates.filter((t) => inVerse.get(t.n) === 1);
  // Most of the time, a word you have stumbled on before.
  const shaky = once.filter((t) => weak.includes(t.i));
  const target = shaky.length && Math.random() < 0.7 ? shaky[0] : pick(once.length ? once : candidates);
  used.add(target.i);
  const word = midSentence(bare(target.w), tokens[target.i - 1]?.w);
  const isName = /^\p{Lu}/u.test(word);

  // Distractors must look alike: names compete with names, ordinary words with ordinary words.
  // They come from other verses: a word from this one could be spotted elsewhere in it.
  const near = (w) => Math.abs(w.length - word.length) <= 3;
  const alike = (w) => /^\p{Lu}/u.test(w) === isName;
  const ordered = [...shuffle(pool).filter(near), ...shuffle(pool)].filter(alike);
  if (isName) ordered.push(...shuffle(['God', 'Lord', 'Jesus', 'Christ', 'Spirit', 'Father', 'Israel', 'David', 'Moses', 'Abraham', 'Zion', 'Jerusalem']));
  const seen = new Set([target.n]);
  const options = [];
  for (const w of ordered) {
    const n = norm(w);
    if (n.length < 3 || STOP.has(n) || seen.has(n) || inVerse.has(n)) continue;
    seen.add(n);
    options.push({ w, ok: false });
    if (options.length === 3) break;
  }
  options.push({ w: word, ok: true });
  return { type: 'cloze', verseId: id, target: target.i, options: shuffle(options) };
}

function bankStep(id, tokens, size, avoid, pool, distractors = 0, weak = []) {
  const n = tokens.length;
  size = Math.max(2, Math.min(size, 12, n));
  const starts = phrases(tokens)
    .map((g) => g[0])
    .filter((s) => s + size <= n);
  let candidates = starts.length ? starts : [Math.max(0, n - size)];
  if (avoid) {
    const apart = candidates.filter((s) => s > avoid[1] || s + size - 1 < avoid[0]);
    if (apart.length) candidates = apart;
  }
  // Most of the time, a gap over a word you have stumbled on.
  const covering = candidates.filter((s) => weak.some((i) => i >= s && i < s + size));
  if (covering.length && Math.random() < 0.7) candidates = covering;
  const start = pick(candidates);
  const end = Math.min(n - 1, start + size - 1);
  const inGap = new Set(tokens.slice(start, end + 1).map((t) => t.n));
  const extra = shuffle(pool.filter((w) => !inGap.has(norm(w)))).slice(0, distractors);
  return { type: 'bank', verseId: id, start, end, distractors: extra };
}

function lettersStep(id, tokens, hint, part = 'all', weak = []) {
  const n = tokens.length;
  let start = 0;
  let end = n - 1;
  if (part === 'first') end = Math.max(0, Math.ceil(n / 2) - 1);
  if (part === 'second') start = Math.ceil(n / 2);
  // Half the words show as hints; the shaky ones are kept hidden, to be recalled.
  const range = tokens.slice(start, end + 1).map((t) => t.i);
  const visible = hint === 'partial' ? shuffle(range.filter((i) => !weak.includes(i))).slice(0, Math.ceil(range.length * 0.5)) : [];
  return { type: 'letters', verseId: id, start, end, hint, visible };
}

/** After a poor recall in a review: the same verse once more, with half the words showing. */
export function relearnStep(step, tokens) {
  return { ...lettersStep(step.verseId, tokens, 'partial'), relearn: true, key: `${step.key}-again` };
}

// ── Joining verses ─────────────────────────────────────────────────────────────

/** The verses that come just before and after this one, among those you know: { prev, next }. */
function neighbours(state, id) {
  const a = parseId(id);
  let prev = null;
  let next = null;
  for (const v of Object.values(state.verses)) {
    if (v.level < 3 || v.id === id) continue;
    const b = parseId(v.id);
    if (b.book !== a.book || b.chapter !== a.chapter) continue;
    if (b.end === a.start - 1) prev = v.id;
    if (b.start === a.end + 1) next = v.id;
  }
  return { prev, next };
}

/**
 * What comes next? The end of one verse, then the first words of the next to recall by
 * their first letters: the joins are what a passage learned verse by verse loses.
 */
function linkStep(state, fromId, toId) {
  const from = getText(verseTr(state, fromId), fromId);
  const to = getText(verseTr(state, toId), toId);
  if (!from || !to) return null;
  const a = tokenize(from.verses);
  const b = tokenize(to.verses);
  if (a.length < 3 || b.length < 3) return null;
  // Whole phrases where they are short enough: the last of one verse, the first of the next.
  const tail = a.slice(-Math.max(3, Math.min(9, phrases(a).at(-1).length)));
  const first = phrases(b)[0].length;
  const head = b.slice(0, Math.max(3, first <= 9 ? first : 6));
  const tokens = [...tail, ...head].map((t, i) => ({ ...t, i, w: i === 0 ? `…${t.w}` : t.w }));
  return {
    type: 'link',
    verseId: toId,
    from: fromId,
    tokens,
    start: tail.length,
    end: tokens.length - 1,
    hint: 'blank',
    kicker: 'What comes next? Type each first letter',
    ref: `${formatRef(fromId)} → ${formatRef(toId).split(':').pop()}`,
  };
}

/** Joins with the neighbouring verses, once both sides are at least Growing. */
function linkSteps(state, ids) {
  const pairs = new Map();
  for (const id of ids) {
    if (verseLevel(state, id) < 3) continue;
    const { prev, next } = neighbours(state, id);
    if (prev) pairs.set(`${prev}>${id}`, [prev, id]);
    if (next) pairs.set(`${id}>${next}`, [id, next]);
  }
  return [...pairs.values()].map(([from, to]) => linkStep(state, from, to)).filter(Boolean);
}

function referenceStep(id, refPool) {
  const others = shuffle(refPool.filter((r) => r !== id && formatRef(r) !== formatRef(id))).slice(0, 3);
  if (others.length < 3) return null;
  return { type: 'reference', verseId: id, options: shuffle([id, ...others]) };
}

/** Other verses whose words are at hand, the most alike first: { id, tokens }. */
function otherVerses(state, id, tokens) {
  const tr = verseTr(state, id);
  const mine = new Set(tokens.filter((t) => t.n.length >= 3 && !STOP.has(t.n)).map((t) => t.n));
  const book = parseId(id).book;
  const seen = new Set([id]);
  const found = [];
  const consider = (otherId, otherTr, known) => {
    if (seen.has(otherId)) return;
    seen.add(otherId);
    const entry = getText(otherTr, otherId);
    if (!entry) return;
    const ts = tokenize(entry.verses);
    if (ts.length < 4) return;
    const shared = new Set(ts.filter((t) => mine.has(t.n)).map((t) => t.n)).size;
    found.push({ id: otherId, tokens: ts, score: shared * 2 + (parseId(otherId).book === book ? 1 : 0) + (known ? 1.5 : 0) + Math.random() });
  };
  for (const v of Object.values(state.verses)) if (v.level >= 1) consider(v.id, verseTr(state, v.id), true);
  if (found.length < 3) {
    for (const key of Object.keys(allTexts())) {
      const [keyTr, otherId] = key.split('|');
      if (keyTr === tr) consider(otherId, keyTr, false);
      if (found.length >= 6) break;
    }
  }
  return found.sort((a, b) => b.score - a.score);
}

/**
 * The steps of one lesson. Each lesson has its shape (read, take in, fill gaps, recall), and
 * at each place one of a few fitting exercises is chosen: in turn, aimed at your weakest
 * skill and at the words of this verse you stumble on.
 */
function learnSteps(c, id, tokens, level) {
  const { pool, refPool, pk } = c;
  const n = tokens.length;
  const weak = c.weak[id];
  const used = new Set();
  const steps = [];
  const push = (s) => s && steps.push(s);
  const others = () => (c.others[id] ||= otherVerses(c.state, id, tokens));
  const groups = orderGroups(tokens);
  const order = () => (groups.length >= 3 ? { type: 'order', verseId: id, groups } : null);
  const pickOne = (...cands) => choose(cands, pk, weak.length > 0);

  const glimpse = ['glimpse', () => glimpseStep(id, tokens, pool, weak)];
  const pairs = ['pairs', () => pairsStep(id, tokens, weak)];
  const chain = ['chain', () => chainStep(id, tokens, pool, weak)];
  const slip = (k) => ['slip', () => slipStep(id, tokens, pool, weak, k)];
  const spell = (k) => ['spell', () => spellStep(id, tokens, weak, k)];
  const rush = ['rush', () => rushStep(id, tokens, pool, weak)];
  const sort = ['sort', () => sortStep(id, tokens, others()[0])];
  const opening = ['opening', () => openingStep(id, tokens, pool, weak, others())];
  const reference = ['reference', () => referenceStep(id, refPool)];
  const cloze = ['cloze', () => clozeStep(id, tokens, used, pool, weak)];
  const bank = (share, extra = 0, avoid = null) => ['bank', () => bankStep(id, tokens, share, avoid, pool, extra, weak)];

  if (level === 0) {
    push({ type: 'read', verseId: id, intro: true });
    push(pickOne(['order', order], glimpse, pairs));
    push(pickOne(cloze, bank(n < 10 ? 2 : 4)));
    push(pickOne(['order', order], glimpse, pairs));
    push(pickOne(cloze, bank(n < 10 ? 2 : 4)));
    push(lettersStep(id, tokens, 'faded'));
  } else if (level === 1) {
    push({ type: 'read', verseId: id });
    push(pickOne(['order', order], chain, pairs, glimpse));
    const a = pickOne(bank(Math.round(n * 0.35)), glimpse);
    push(a);
    push(pickOne(cloze, slip(1), spell(2)));
    push(lettersStep(id, tokens, 'partial', 'all', weak));
    push(pickOne(bank(Math.round(n * 0.35), 1, a?.type === 'bank' ? [a.start, a.end] : null), chain));
  } else if (level === 2) {
    push(pickOne(['order', order], chain));
    push(pickOne(bank(Math.round(n * 0.5), 1), spell()));
    push(lettersStep(id, tokens, 'partial', 'all', weak));
    push(pickOne(reference, opening));
    push(pickOne(slip(), sort, chain, rush));
    push(lettersStep(id, tokens, 'blank', n > 24 ? 'first' : 'all'));
    if (n > 24) push(lettersStep(id, tokens, 'blank', 'second'));
  } else {
    push(lettersStep(id, tokens, 'partial', 'all', weak));
    push(pickOne(bank(Math.round(n * 0.7), 2), rush, slip(), sort));
    push(pickOne(reference, opening));
    push(pickOne(slip(), spell(), chain, sort, rush));
    push(lettersStep(id, tokens, 'blank'));
  }
  return steps;
}

/** After the recalls in a review or a practice: an exercise picked for what you find hardest. */
function extraStep(c, id) {
  const { pool, refPool, pk, tokens } = c;
  const ts = tokens[id];
  const weak = c.weak[id];
  const others = () => (c.others[id] ||= otherVerses(c.state, id, ts));
  // In a session of several verses, sort between two of them; otherwise the most alike.
  const partner = () => {
    const mates = c.verseIds.filter((v) => v !== id);
    return mates.length ? { id: mates[0], tokens: tokens[mates[0]] } : others()[0];
  };
  // A verse still being learned is spared the hardest.
  const settled = (c.state.verses[id]?.level || 0) >= 3;
  return choose(
    [
      ['slip', () => slipStep(id, ts, pool, weak, settled ? 0 : 1)],
      ['chain', () => chainStep(id, ts, pool, weak)],
      ['spell', () => spellStep(id, ts, weak)],
      settled && ['rush', () => rushStep(id, ts, pool, weak)],
      settled && ['sort', () => sortStep(id, ts, partner())],
      ['opening', () => openingStep(id, ts, pool, weak, others())],
      ['reference', () => referenceStep(id, refPool)],
    ],
    pk,
    weak.length > 0,
  );
}

export function buildSession(plan, state) {
  const tokens = {};
  const trs = {};
  const levels = {};
  const weak = {};
  for (const id of plan.verseIds) {
    trs[id] = verseTr(state, id);
    levels[id] = verseLevel(state, id);
    tokens[id] = tokenize(getText(trs[id], id).verses);
    weak[id] = weakIndices(state.verses[id], tokens[id]);
  }
  const exclude = new Set(Object.values(tokens).flatMap((ts) => ts.map((t) => t.n)));
  const pool = distractorPool(exclude);
  const refPool = [...new Set([...CURATED_IDS, ...state.custom])];
  const c = { state, pool, refPool, tokens, weak, others: {}, verseIds: plan.verseIds, pk: pickContext(state) };

  let steps = [];
  if (plan.kind === 'learn') {
    const id = plan.verseIds[0];
    steps = learnSteps(c, id, tokens[id], levels[id]);
    // Bearing fruit: join it to the verses either side, before the last recall.
    if (levels[id] === 3) steps.splice(steps.length - 1, 0, ...linkSteps(state, [id]));
  } else if (plan.kind === 'practice') {
    // Practice is unhurried: something new to do with each verse, then recall it.
    for (const id of plan.verseIds) {
      const extra = extraStep(c, id);
      if (extra) steps.push(extra);
      steps.push(lettersStep(id, tokens[id], levels[id] < 3 ? 'partial' : 'blank', 'all', weak[id]));
    }
  } else {
    for (const id of plan.verseIds) steps.push(lettersStep(id, tokens[id], 'blank'));
    if (plan.kind === 'review') {
      // Only once every verse has been recalled, so nothing gives a recall away.
      const ids = [...plan.verseIds].sort((a, b) => weak[b].length - weak[a].length);
      ids.slice(0, ids.length >= 3 ? 2 : 1).forEach((id) => {
        const extra = extraStep(c, id);
        if (extra) steps.push(extra);
      });
      // A recitation joins its verses already; a review practises up to two joins.
      steps.push(...shuffle(linkSteps(state, plan.verseIds)).slice(0, 2));
    }
  }
  steps = steps.map((s, i) => ({ ...s, key: `${i}-${s.type}` }));
  return { ...plan, tokens, trs, levels, steps, startedAt: Date.now() };
}

const XP = { read: 1, order: 3, cloze: 2, bank: 3, reference: 2, link: 4, glimpse: 3, pairs: 2, chain: 3, slip: 4, sort: 3, opening: 2, rush: 4, spell: 4 };

export function stepXp(step) {
  if (step.type === 'letters') return step.hint === 'blank' ? 6 : step.hint === 'partial' ? 4 : 3;
  return XP[step.type] || 1;
}
