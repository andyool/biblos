import { CURATED_IDS, PATHS, getPath } from '../data/paths.js';
import { LESSON_NAMES, LEVELS } from '../data/levels.js';
import { formatRef } from '../data/books.js';
import { allTexts, getText } from './texts.js';
import { STOP, bare, norm, orderGroups, phrases, pick, shuffle, tokenize } from './text.js';
import { isDue } from './srs.js';

export const verseTr = (state, id) => state.verses[id]?.tr || state.settings.translation;
export const verseLevel = (state, id) => state.verses[id]?.level || 0;

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
  const learning = all.filter((v) => v.level >= 1 && v.level <= 3).sort((a, b) => (a.lastPracticed || 0) - (b.lastPracticed || 0));
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

const SENTENCE_END = /[.!?:;"“”]["”’']*$/;

/** A word as it would appear mid-sentence: names keep their capital, other words go lower case. */
function midSentence(word, prevRaw) {
  const capital = /^\p{Lu}/u.test(word);
  const startsSentence = !prevRaw || SENTENCE_END.test(prevRaw);
  if (capital && !startsSentence) return word.length > 1 && word === word.toUpperCase() ? word : word[0] + word.slice(1).toLowerCase();
  return word.toLowerCase();
}

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

function clozeStep(id, tokens, used, pool) {
  let candidates = tokens.filter((t) => t.n.length >= 4 && !STOP.has(t.n) && !used.has(t.i));
  if (!candidates.length) candidates = tokens.filter((t) => t.n.length >= 2 && !used.has(t.i));
  if (!candidates.length) candidates = tokens;
  const target = pick(candidates);
  used.add(target.i);
  const word = midSentence(bare(target.w), tokens[target.i - 1]?.w);
  const isName = /^\p{Lu}/u.test(word);

  // Distractors must look alike: names compete with names, ordinary words with ordinary words.
  const fromVerse = shuffle(tokens.map((t) => midSentence(bare(t.w), tokens[t.i - 1]?.w)));
  const near = (w) => Math.abs(w.length - word.length) <= 3;
  const alike = (w) => /^\p{Lu}/u.test(w) === isName;
  const ordered = [...fromVerse.filter(near), ...shuffle(pool).filter(near), ...shuffle(pool)].filter(alike);
  if (isName) ordered.push(...['God', 'Lord', 'Jesus', 'Christ', 'Spirit', 'Father', 'Israel', 'David']);
  const seen = new Set([target.n]);
  const options = [];
  for (const w of ordered) {
    const n = norm(w);
    if (n.length < 3 || STOP.has(n) || seen.has(n)) continue;
    seen.add(n);
    options.push({ w, ok: false });
    if (options.length === 3) break;
  }
  options.push({ w: word, ok: true });
  return { type: 'cloze', verseId: id, target: target.i, options: shuffle(options) };
}

function bankStep(id, tokens, size, avoid, pool, distractors = 0) {
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
  const start = pick(candidates);
  const end = Math.min(n - 1, start + size - 1);
  const inGap = new Set(tokens.slice(start, end + 1).map((t) => t.n));
  const extra = shuffle(pool.filter((w) => !inGap.has(norm(w)))).slice(0, distractors);
  return { type: 'bank', verseId: id, start, end, distractors: extra };
}

function lettersStep(id, tokens, hint, part = 'all') {
  const n = tokens.length;
  let start = 0;
  let end = n - 1;
  if (part === 'first') end = Math.max(0, Math.ceil(n / 2) - 1);
  if (part === 'second') start = Math.ceil(n / 2);
  const visible = hint === 'partial' ? shuffle(tokens.slice(start, end + 1).map((t) => t.i)).slice(0, Math.ceil((end - start + 1) * 0.5)) : [];
  return { type: 'letters', verseId: id, start, end, hint, visible };
}

function referenceStep(id, refPool) {
  const others = shuffle(refPool.filter((r) => r !== id && formatRef(r) !== formatRef(id))).slice(0, 3);
  if (others.length < 3) return null;
  return { type: 'reference', verseId: id, options: shuffle([id, ...others]) };
}

function learnSteps(id, tokens, level, pool, refPool) {
  const n = tokens.length;
  const used = new Set();
  const steps = [];
  const groups = orderGroups(tokens);
  const order = groups.length >= 3 ? { type: 'order', verseId: id, groups } : null;
  const push = (s) => s && steps.push(s);

  if (level === 0) {
    push({ type: 'read', verseId: id, intro: true });
    push(order);
    push(clozeStep(id, tokens, used, pool));
    const gap = bankStep(id, tokens, n < 10 ? 2 : 4, null, pool);
    push(gap);
    push(clozeStep(id, tokens, used, pool));
    push(lettersStep(id, tokens, 'faded'));
  } else if (level === 1) {
    push({ type: 'read', verseId: id });
    push(order);
    const a = bankStep(id, tokens, Math.round(n * 0.35), null, pool);
    push(a);
    push(clozeStep(id, tokens, used, pool));
    push(lettersStep(id, tokens, 'partial'));
    push(bankStep(id, tokens, Math.round(n * 0.35), [a.start, a.end], pool, 1));
  } else if (level === 2) {
    push(order);
    push(bankStep(id, tokens, Math.round(n * 0.5), null, pool, 1));
    push(lettersStep(id, tokens, 'partial'));
    push(referenceStep(id, refPool));
    push(lettersStep(id, tokens, 'blank', n > 24 ? 'first' : 'all'));
    if (n > 24) push(lettersStep(id, tokens, 'blank', 'second'));
  } else {
    push(lettersStep(id, tokens, 'partial'));
    push(bankStep(id, tokens, Math.round(n * 0.7), null, pool, 2));
    push(referenceStep(id, refPool));
    push(lettersStep(id, tokens, 'blank'));
  }
  return steps;
}

export function buildSession(plan, state) {
  const tokens = {};
  const trs = {};
  const levels = {};
  for (const id of plan.verseIds) {
    trs[id] = verseTr(state, id);
    levels[id] = verseLevel(state, id);
    tokens[id] = tokenize(getText(trs[id], id).verses);
  }
  const exclude = new Set(Object.values(tokens).flatMap((ts) => ts.map((t) => t.n)));
  const pool = distractorPool(exclude);
  const refPool = [...new Set([...CURATED_IDS, ...state.custom])];

  let steps = [];
  if (plan.kind === 'learn') {
    const id = plan.verseIds[0];
    steps = learnSteps(id, tokens[id], levels[id], pool, refPool);
  } else {
    for (const id of plan.verseIds) {
      const hint = plan.kind === 'practice' && levels[id] < 3 ? 'partial' : 'blank';
      steps.push(lettersStep(id, tokens[id], hint));
    }
    if (plan.kind !== 'recite') {
      const ref = referenceStep(pick(plan.verseIds), refPool);
      if (ref && Math.random() < 0.6) steps.splice(Math.floor(Math.random() * (steps.length + 1)), 0, ref);
    }
  }
  steps = steps.map((s, i) => ({ ...s, key: `${i}-${s.type}` }));
  return { ...plan, tokens, trs, levels, steps, startedAt: Date.now() };
}

const XP = { read: 1, order: 3, cloze: 2, bank: 3, reference: 2 };

export function stepXp(step) {
  if (step.type === 'letters') return step.hint === 'blank' ? 6 : step.hint === 'partial' ? 4 : 3;
  return XP[step.type] || 1;
}
