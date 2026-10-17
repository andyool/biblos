// Fitting lessons to the learner. Every exercise trains one skill; how well each skill goes is
// remembered, and so are the words of each verse you stumble on. Lessons then lean towards the
// weakest skill and aim at the shaky words, while the exercises take turns so none grows stale.

export const SKILLS = {
  flow: { name: 'Flow', desc: 'What comes next' },
  wording: { name: 'Wording', desc: 'The exact words' },
  recall: { name: 'Recall', desc: 'The whole verse from memory' },
  reference: { name: 'Reference', desc: 'Where it is written' },
  distinct: { name: 'Distinction', desc: 'Keeping verses apart' },
  fluency: { name: 'Fluency', desc: 'Swift and sure' },
};

export const SKILL_OF = {
  order: 'flow',
  pairs: 'flow',
  glimpse: 'flow',
  chain: 'flow',
  link: 'flow',
  cloze: 'wording',
  bank: 'wording',
  slip: 'wording',
  spell: 'wording',
  letters: 'recall',
  reference: 'reference',
  opening: 'reference',
  sort: 'distinct',
  rush: 'fluency',
};

/** The newer exercises, by name: the first time one appears, the lesson says so. */
export const ACTIVITY_NAMES = {
  glimpse: 'Glimpse',
  pairs: 'Pair up',
  chain: 'What comes next',
  slip: 'Spot the slip',
  sort: 'Verse sort',
  opening: 'From the reference',
  rush: 'Word rush',
  spell: 'Write it out',
};

// Exercises that can be aimed at a particular word.
const AIMED = new Set(['cloze', 'bank', 'slip', 'spell', 'chain']);

const PRIOR = 0.85;
const round2 = (x) => Math.round(x * 100) / 100;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/** How a step went, 0–1. A word rush also counts how swiftly it was done. */
function score(r) {
  const total = (r.correct || 0) + (r.mistakes || 0);
  if (!total) return null;
  const acc = r.correct / total;
  return r.pace == null ? acc : acc * (0.6 + 0.4 * r.pace);
}

/** A running average per skill: { [skill]: { a, n } }. Early results move it most. */
export function updateSkills(skills = {}, results) {
  const next = { ...skills };
  for (const r of results) {
    const skill = SKILL_OF[r.type];
    const s = score(r);
    if (!skill || s == null || r.relearn || r.redo) continue;
    const cur = next[skill] || { a: PRIOR, n: 0 };
    const w = cur.n < 3 ? 1 / (cur.n + 2) : 0.2;
    next[skill] = { a: round2(cur.a + (s - cur.a) * w), n: cur.n + 1 };
  }
  return next;
}

/** How strongly to favour each skill's exercises: 1 when it goes well, up to 3 when it is weak. */
export function skillBoosts(skills = {}) {
  const out = {};
  for (const k of Object.keys(SKILLS)) {
    const s = skills[k];
    out[k] = s && s.n >= 2 ? round2(1 + 2 * clamp((0.92 - s.a) / 0.3, 0, 1)) : 1;
  }
  return out;
}

/** The skill that needs most help, once there is enough to tell. */
export function weakestSkill(skills = {}) {
  const known = Object.entries(skills).filter(([k, s]) => SKILLS[k] && s.n >= 3 && k !== 'recall');
  if (!known.length) return null;
  const [k, s] = known.sort((a, b) => a[1].a - b[1].a)[0];
  return s.a < 0.9 ? k : null;
}

/** Fade the old stumbles a little and add this lesson's. Keeps the sixteen worst words. */
export function updateWeak(weak = {}, missed = []) {
  const next = {};
  for (const [i, w] of Object.entries(weak)) if (w * 0.6 >= 0.25) next[i] = round2(w * 0.6);
  for (const i of missed) next[i] = round2((next[i] || 0) + 1);
  const top = Object.entries(next)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 16);
  return top.length ? Object.fromEntries(top) : undefined;
}

/** A verse's shaky words, worst first, as token indices. */
export function weakIndices(verse, tokens) {
  if (!verse?.weak) return [];
  return Object.entries(verse.weak)
    .map(([i, w]) => [Number(i), w])
    .filter(([i, w]) => i < tokens.length && w >= 0.5)
    .sort((a, b) => b[1] - a[1])
    .map(([i]) => i);
}

/** What a session needs to choose exercises: recent ones, ones met before, and skill boosts. */
export function pickContext(state) {
  return {
    recent: [...(state.stats.recent || [])],
    acts: { ...(state.stats.acts || {}) },
    boosts: skillBoosts(state.stats.skills),
    used: new Set(),
  };
}

function weightOf(type, ctx, aimed) {
  let w = 1;
  // Taking turns: an exercise done lately waits a while.
  const last = ctx.recent.lastIndexOf(type);
  if (last >= 0) w *= 0.25 + 0.75 * Math.min(1, (ctx.recent.length - 1 - last) / 10);
  if (ctx.used.has(type)) w *= 0.1;
  w *= ctx.boosts[SKILL_OF[type]] || 1;
  if (ACTIVITY_NAMES[type] && !ctx.acts[type]) w *= 1.6;
  if (aimed && AIMED.has(type)) w *= 1.4;
  return w;
}

/**
 * Choose one exercise from [type, build] candidates, where build() makes the step or null when
 * the verse doesn't suit it. `aimed`: the verse has shaky words to aim at.
 */
export function choose(candidates, ctx, aimed = false) {
  let left = candidates.filter(Boolean);
  while (left.length) {
    const weights = left.map(([type]) => weightOf(type, ctx, aimed));
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    let k = 0;
    while (k < weights.length - 1 && r >= weights[k]) {
      r -= weights[k];
      k += 1;
    }
    const [type, build] = left[k];
    const step = build();
    if (step) {
      const skill = SKILL_OF[type];
      const focus = skill && skill !== 'recall' && ctx.boosts[skill] >= 1.6 ? skill : null;
      const isNew = !!ACTIVITY_NAMES[type] && !ctx.acts[type];
      ctx.used.add(type);
      ctx.acts[type] = (ctx.acts[type] || 0) + 1;
      return { ...step, ...(focus && { focus }), ...(isNew && { isNew }) };
    }
    left = left.filter((_, i) => i !== k);
  }
  return null;
}
