import { formatRef } from '../data/books.js';
import { guideNow, loadGuide } from '../data/guides/index.js';
import { PROMPTS } from '../data/prompts.js';
import { DAY, dayKey } from './dates.js';
import { pick } from './text.js';
import { toast } from './ui.js';
import { dropSeals } from './sealDrop.js';

// The journal: what you write after a reading, about a verse, or on its own. Each entry keeps
// the question it answers, so it still makes sense when you read it back months later.

export const KINDS = [
  { id: 'thought', label: 'Thought', glyph: 'quill', woolly: 'write', placeholder: 'Write a thought, if you like. It stays on your phone.' },
  { id: 'prayer', label: 'Prayer', glyph: 'dove', woolly: 'pray', placeholder: 'Write a prayer, if you like. It stays on your phone.' },
  { id: 'thanks', label: 'Thanks', glyph: 'heart', woolly: 'heart', placeholder: 'What are you thankful for? It stays on your phone.' },
];
export const KIND = Object.fromEntries(KINDS.map((k) => [k.id, k]));

export const MAX_TEXT = 5000;

/** Newest first. */
export const journalEntries = (journal) => Object.values(journal).sort((a, b) => b.created - a.created);

/** What an entry is about, if anything: a reading's passage, or a verse. */
export const entryAbout = (e) => e.passage || e.verse || null;
export const entryRef = (e) => (entryAbout(e) ? formatRef(entryAbout(e)) : '');
export const entryBook = (e) => entryAbout(e)?.split('.')[0] || null;

/** Entries about one passage or verse, newest first. */
export const entriesAbout = (journal, id) => journalEntries(journal).filter((e) => entryAbout(e) === id);

/** A passage's title and question, from its guide. Null until the guide has loaded. */
export function passageContext(passage) {
  const [book, chapter, verses] = passage.split('.');
  const guide = guideNow(book);
  if (!guide) return null;
  const sec = guide.sections.find((s) => s.ref === `${chapter}:${verses}`);
  return { title: sec?.title, prompt: sec?.reflect };
}

/** The books whose guides old entries are waiting on for their questions. */
export const booksToFill = (journal) => [...new Set(Object.values(journal).filter((e) => e.legacy && e.passage).map(entryBook))];

/** Load those guides, then fill the questions in with fill (see fillJournalContext). */
export function fillLegacy(journal, fill) {
  const books = booksToFill(journal);
  if (!books.length) return;
  Promise.allSettled(books.map(loadGuide)).then(() => fill(passageContext));
}

/** Let the seals the journal earned fall (SealDrop), or else tell of what was done. */
export function announce(earned, done) {
  if (earned.length) dropSeals(earned, 300);
  else if (done) toast(done, 'check');
}

// ── Dates ──────────────────────────────────────────────────────────────────────

export const dateText = (at) => (at ? new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '');

/** "3 Nov", with the year when it isn't this one. */
export function shortDate(at) {
  if (!at) return '';
  const sameYear = new Date(at).getFullYear() === new Date().getFullYear();
  return new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', ...(!sameYear && { year: 'numeric' }) });
}

export const monthLabel = (at) => (at ? new Date(at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : 'Earlier');

// ── Finding ────────────────────────────────────────────────────────────────────

export function entryMatches(e, q) {
  return [entryRef(e), e.title, e.prompt, e.text, e.answered?.note, KIND[e.kind]?.label]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(q);
}

/** Entries in the months they were written: [{ label, entries }]. */
export function byMonth(entries) {
  const months = [];
  for (const e of entries) {
    const label = monthLabel(e.created);
    if (months.at(-1)?.label !== label) months.push({ label, entries: [] });
    months.at(-1).entries.push(e);
  }
  return months;
}

const LOOK_BACK = [
  { months: 12, label: 'A year ago' },
  { months: 6, label: 'Six months ago' },
  { months: 1, label: 'A month ago' },
];

/** Something you wrote about a year, six months or a month ago, give or take a few days. */
export function lookBack(entries, now = Date.now()) {
  for (const { months, label } of LOOK_BACK) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - months);
    const then = d.getTime();
    const near = entries.filter((e) => e.created && Math.abs(e.created - then) <= 3 * DAY).sort((a, b) => Math.abs(a.created - then) - Math.abs(b.created - then));
    if (near.length) return { entry: near[0], label };
  }
  return null;
}

// ── Questions to write from ────────────────────────────────────────────────────

const pickOther = (list, not) => pick(list.filter((p) => p !== not)) || pick(list);

/**
 * A question to write from: for a verse, one about the verse; for a thought, often the
 * question of a passage you have read ({ prompt, passage, title }), or else a general one.
 */
export async function suggestPrompt(state, { kind = 'thought', verse = null, not = null } = {}) {
  if (verse) return { prompt: pickOther(PROMPTS.verse, not) };
  const read = Object.values(state.reading.books).flatMap((b) => Object.keys(b.done || {}));
  if (kind === 'thought' && read.length && Math.random() < 0.6) {
    const passage = pick(read);
    try {
      await loadGuide(passage.split('.')[0]);
      const found = passageContext(passage);
      if (found?.prompt && found.prompt !== not) return { prompt: found.prompt, title: found.title, passage };
    } catch {
      /* offline: a general question will do */
    }
  }
  return { prompt: pickOther(PROMPTS[kind] || PROMPTS.thought, not) };
}

// ── Sharing ────────────────────────────────────────────────────────────────────

/** The quoted verses as one line: “…” (v. 3–4, ESV). */
export function quoteLine(e) {
  if (!e.quotes?.length) return '';
  const where = e.passage ? `v. ${e.quotes.map((q) => q.v).join(', ')}` : entryRef(e);
  return `“${e.quotes.map((q) => q.t).join(' ')}” (${[where, e.tr].filter(Boolean).join(', ')})`;
}

/** One entry as plain text, question first. */
export function entryText(e) {
  const lines = [];
  const head = [entryRef(e), e.title].filter(Boolean).join(' — ');
  if (head) lines.push(head);
  lines.push([dateText(e.created), KIND[e.kind]?.label, e.starred && 'Starred'].filter(Boolean).join(' · '));
  if (e.prompt) lines.push('', e.prompt);
  if (e.quotes?.length) lines.push('', quoteLine(e));
  lines.push('', e.text);
  if (e.answered) lines.push('', `Answered ${dateText(e.answered.at)}${e.answered.note ? `: ${e.answered.note}` : ''}`);
  return lines.join('\n');
}

export function journalFile(entries) {
  const text = ['Biblos journal', '', '', entries.map(entryText).join('\n\n\n'), ''].join('\n');
  return new File([text], `biblos-journal-${dayKey()}.txt`, { type: 'text/plain' });
}
