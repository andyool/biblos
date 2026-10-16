import { useEffect, useState } from 'react';
import { BOOK_BY_CODE, chaptersIn, formatRef } from '../data/books.js';
import { versesIn } from '../data/chapters.js';
import { guideNow, isGuided, loadGuide } from '../data/guides/index.js';
import { CATHOLIC_BIBLE, getTranslation } from '../data/translations.js';
import { hasYouVersion, loadRange } from './bible.js';
import { shuffle } from './text.js';

// Reading whole books in order, one section a sitting, for the meaning rather than the words.

// ── Sections ───────────────────────────────────────────────────────────────────

// Books without a guide go a chapter at a time; very long chapters are read in parts.
const LONG_CHAPTER = 45;
const PART = 30;

function chapterParts(code, chapter, catholic) {
  const n = versesIn(code, chapter, catholic);
  if (n <= LONG_CHAPTER) return [[1, n]];
  const size = Math.ceil(n / Math.ceil(n / PART));
  const parts = [];
  for (let s = 1; s <= n; s += size) parts.push([s, Math.min(n, s + size - 1)]);
  return parts;
}

const sectionCache = new Map();

/**
 * A book's sections in reading order: { id, book, chapter, start, end, whole, index, part, parts }
 * plus, for guided books, { title, summary, look, questions, reflect }.
 * A Catholic translation (tr) reads the longer Esther and Daniel.
 */
export function bookSections(code, guide = guideNow(code), tr = null) {
  const catholic = Boolean(tr && getTranslation(tr).catholic);
  const key = `${code}${guide ? '+guide' : ''}${catholic ? '+catholic' : ''}`;
  if (sectionCache.has(key)) return sectionCache.get(key);
  let list = [];
  if (guide) {
    list = guide.sections.map((s) => {
      const [chapter, verses] = s.ref.split(':');
      const [start, end] = verses.split('-').map(Number);
      return { ...s, chapter: Number(chapter), start, end };
    });
  } else {
    for (let c = 1; c <= chaptersIn(code, catholic); c += 1) {
      const parts = chapterParts(code, c, catholic);
      parts.forEach(([start, end], p) => list.push({ chapter: c, start, end, part: parts.length > 1 ? p + 1 : 0, parts: parts.length }));
    }
  }
  list = list.map((s, index) => ({
    ...s,
    book: code,
    index,
    id: `${code}.${s.chapter}.${s.start}-${s.end}`,
    whole: s.start === 1 && s.end === versesIn(code, s.chapter, catholic),
  }));
  sectionCache.set(key, list);
  return list;
}

/** A book's sections in a translation, loading its guide first when it has one. */
export function useBook(code, tr) {
  const [failed, setFailed] = useState(false);
  const [, force] = useState(0);
  const guided = Boolean(code) && isGuided(code);
  const guide = code ? guideNow(code) : null;

  useEffect(() => {
    if (!guided || guide) return undefined;
    let alive = true;
    setFailed(false);
    loadGuide(code)
      .then(() => alive && force((n) => n + 1))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [code, guided, guide]);

  if (!code || (guided && !guide)) return { ready: false, failed, guide: null, sections: [] };
  return { ready: true, failed: false, guide: guide || null, sections: bookSections(code, guide, tr) };
}

const bookLabel = (code) => (code === 'PSA' ? 'Psalm' : BOOK_BY_CODE[code]?.name || code);

/** "Mark 2:1–12", or "Psalm 23" for a whole chapter. */
export function sectionRef(sec) {
  if (sec.whole) return `${bookLabel(sec.book)} ${sec.chapter}`;
  return formatRef(sec.id);
}

/** The guide's heading, else the one you wrote, else the reference. */
export function sectionTitle(sec, notes) {
  return sec.title || notes?.[sec.id]?.heading || sectionRef(sec);
}

export function bookProgress(state, code, sections) {
  const done = state.reading.books[code]?.done || {};
  const count = sections.filter((s) => done[s.id]).length;
  const next = sections.find((s) => !done[s.id]) || null;
  return { done, count, total: sections.length, next, finished: sections.length > 0 && !next };
}

/** Your chosen translation — or the ESV until the NIV is connected, and a Catholic Bible for the books only it has. */
export function readingTr(state, code = state.reading.book) {
  const chosen = state.settings.translation;
  if (BOOK_BY_CODE[code]?.deutero && !getTranslation(chosen).catholic) return CATHOLIC_BIBLE.id;
  return getTranslation(chosen).source === 'yv' && !hasYouVersion() ? 'ESV' : chosen;
}

// ── Passage text ───────────────────────────────────────────────────────────────

// The last few passages stay on the phone, so the current and next readings open offline.
const KEY = 'biblos.passages.v1';
const KEEP = 8;

let kept = [];
try {
  kept = JSON.parse(localStorage.getItem(KEY) || '[]');
} catch {
  kept = [];
}
if (!Array.isArray(kept)) kept = [];

function keep(k, verses) {
  kept = [...kept.filter((e) => e.k !== k), { k, verses }].slice(-KEEP);
  try {
    localStorage.setItem(KEY, JSON.stringify(kept));
  } catch {
    /* storage full */
  }
}

const loading = new Map();

/** Load a section's verses: [{ v, t }]. */
export function loadSection(tr, sec) {
  const k = `${tr}|${sec.id}`;
  const hit = kept.find((e) => e.k === k);
  if (hit) return Promise.resolve(hit.verses);
  if (!loading.has(k)) {
    const job = loadRange(tr, sec.book, sec.chapter, sec.start, sec.end)
      .then((verses) => {
        keep(k, verses);
        return verses;
      })
      .finally(() => loading.delete(k));
    loading.set(k, job);
  }
  return loading.get(k);
}

/** Fetch the next reading quietly, so it opens at once (and offline). */
export function prefetchSection(tr, sec) {
  if (sec) setTimeout(() => loadSection(tr, sec).catch(() => {}), 600);
}

// ── Building a reading ─────────────────────────────────────────────────────────

// For books without a guide: a focus for reading, and a question to take away.
const LOOKS = [
  'Read it slowly. Notice who is speaking, and to whom.',
  'Watch for words and ideas that repeat.',
  'Notice what happens first, what comes next, and how it ends.',
  'Look for what this shows about God’s character.',
  'Notice how people respond to God, and why.',
  'Look for a promise, a command or a warning.',
];

const REFLECTS = [
  'What does this passage show you about God?',
  'What do you learn here about people — their faith, their failings, their hopes?',
  'Is there a promise to hold on to, a command to obey, or an example to follow?',
  'Which verse stood out to you, and why?',
  'How does this passage carry the book on from what came before?',
  'Turn what you have read into a short prayer.',
  'What would change this week if you took this passage to heart?',
];

const XP = { passage: 5, question: 3, flow: 3, summary: 3, recap: 3, heading: 2, reflect: 2 };
export const readingXp = (type) => XP[type] || 1;

function snippet(text, words) {
  const w = text.split(/\s+/);
  if (w.length <= words) return text;
  return `${w.slice(0, words).join(' ').replace(/[,;:.!?—–-]+$/, '')}…`;
}

/** Put a few verses, spread through the passage, back in order. */
function flowStep(verses) {
  if (verses.length < 3) return null;
  const k = Math.min(4, verses.length);
  const picks = [...new Set(Array.from({ length: k }, (_, i) => Math.round((i * (verses.length - 1)) / (k - 1))))];
  for (let words = 9; words <= 25; words += 4) {
    const items = picks.map((i) => ({ text: snippet(verses[i].t, words), label: `v. ${verses[i].v}` }));
    if (new Set(items.map((x) => x.text)).size === items.length) return { type: 'flow', items };
  }
  return null;
}

/** Which summary fits? The others come from nearby sections of the same book. */
function summaryStep(sec, sections) {
  const others = sections.filter((s) => s.id !== sec.id && s.summary && s.summary !== sec.summary);
  const near = others.filter((s) => Math.abs(s.index - sec.index) <= 8);
  const wrong = shuffle(near.length >= 3 ? near : others).slice(0, 3);
  if (wrong.length < 3) return null;
  return { type: 'summary', options: shuffle([{ text: sec.summary, ok: true }, ...wrong.map((s) => ({ text: s.summary, ok: false }))]) };
}

function questionStep(q) {
  return { type: 'question', q: q.q, why: q.why, options: shuffle(q.a.map((text, i) => ({ text, ok: i === 0 }))) };
}

/** At the start of a new chapter, recall the last few sections in order. */
function recapStep(sec, sections, notes, guided) {
  const prev = sections[sec.index - 1];
  if (!prev || prev.chapter === sec.chapter) return null;
  if (!guided && sec.chapter % 3 !== 1) return null;
  let pool = guided ? sections.filter((s) => s.chapter === prev.chapter) : [];
  if (pool.length < 3) pool = sections.slice(Math.max(0, sec.index - 4), sec.index);
  pool = pool.slice(-4);
  const items = [];
  for (const s of pool) {
    const text = s.title || notes[s.id]?.heading;
    if (text) items.push({ text, label: sectionRef(s) });
    else items.length = 0; // keep an unbroken run of titled sections
  }
  if (items.length < 3 || new Set(items.map((x) => x.text)).size !== items.length) return null;
  return { type: 'recap', items };
}

export function buildReading({ sec, sections, guide, verses, tr, notes }) {
  const steps = [];
  const push = (s) => s && steps.push(s);
  push(recapStep(sec, sections, notes, Boolean(guide)));
  push({ type: 'passage' });
  (sec.questions || []).forEach((q) => push(questionStep(q)));
  push(flowStep(verses));
  push(guide ? summaryStep(sec, sections) : { type: 'heading' });
  push({ type: 'reflect', prompt: sec.reflect || REFLECTS[sec.index % REFLECTS.length] });

  const prev = sections[sec.index - 1];
  return {
    kind: 'reading',
    sec,
    tr,
    verses,
    ref: sectionRef(sec),
    title: sec.title || notes[sec.id]?.heading || null,
    look: sec.look || LOOKS[sec.index % LOOKS.length],
    intro: sec.index === 0 ? guide?.intro || null : null,
    previous: prev ? { ref: sectionRef(prev), text: prev.summary || notes[prev.id]?.heading || null } : null,
    sectionIds: sections.map((s) => s.id),
    steps: steps.map((s, i) => ({ ...s, key: `${i}-${s.type}` })),
    startedAt: Date.now(),
  };
}
