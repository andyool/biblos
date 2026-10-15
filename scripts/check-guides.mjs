// Checks the guided-reading files in src/data/guides/.
//   node scripts/check-guides.mjs                 (all guides)
//   node scripts/check-guides.mjs src/data/guides/mark.js
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { BOOK_BY_CODE } from '../src/data/books.js';
import { versesIn } from '../src/data/chapters.js';

const DIR = resolve(import.meta.dirname, '../src/data/guides');
const files = process.argv.slice(2).length
  ? process.argv.slice(2).map((f) => resolve(f))
  : readdirSync(DIR)
      .filter((f) => f.endsWith('.js') && f !== 'index.js')
      .map((f) => resolve(DIR, f));

const LIMITS = { tagline: 32, intro: 420, title: 48, summary: 230, look: 120, q: 150, a: 95, why: 280, reflect: 180 };
const AMERICAN = /\b(color\w*|honor\w*|savior\w*|baptiz\w*|realiz\w*|recogniz\w*|center\w*|neighbor\w*|favor\w*|labor\w*|fulfill(s|ment)?|worship(ed|ing|er|ers)|travel(ed|ing)|apologiz\w*|organiz\w*|emphasiz\w*|symboliz\w*|criticiz\w*|sympathiz\w*|agoniz\w*)\b/i;

let failed = false;

async function check(file) {
  const errors = [];
  const warnings = [];
  let guide;
  try {
    guide = (await import(pathToFileURL(file).href)).default;
  } catch (err) {
    console.log(`✗ ${file}\n    cannot load: ${err.message}`);
    failed = true;
    return;
  }
  const book = BOOK_BY_CODE[guide?.book];
  if (!book) {
    console.log(`✗ ${file}\n    unknown book code ${guide?.book}`);
    failed = true;
    return;
  }

  const text = (where, value, limit) => {
    if (typeof value !== 'string' || !value.trim()) return errors.push(`${where}: missing text`);
    if (value.length > limit) warnings.push(`${where}: ${value.length} characters (aim for ≤ ${limit})`);
    if (/['"]/.test(value)) errors.push(`${where}: use curly quotes (’ “ ”), not straight ones`);
    if (/\s{2,}|^\s|\s$/.test(value)) warnings.push(`${where}: stray spaces`);
    const us = value.match(AMERICAN);
    if (us) warnings.push(`${where}: American spelling “${us[0]}”`);
  };

  text('tagline', guide.tagline, LIMITS.tagline);
  text('intro', guide.intro, LIMITS.intro);
  if (!Array.isArray(guide.sections) || !guide.sections.length) errors.push('no sections');

  const byChapter = new Map();
  (guide.sections || []).forEach((s, i) => {
    const where = `section ${i + 1} (${s?.ref})`;
    const m = String(s?.ref || '').match(/^(\d+):(\d+)-(\d+)$/);
    if (!m) return errors.push(`${where}: ref must look like “3:1-12”`);
    const [chapter, start, end] = m.slice(1).map(Number);
    if (end < start) errors.push(`${where}: range runs backwards`);
    if (end - start + 1 > 40) errors.push(`${where}: ${end - start + 1} verses — split it (≤ 40)`);
    if (!byChapter.has(chapter)) byChapter.set(chapter, []);
    byChapter.get(chapter).push({ start, end, i });

    text(`${where} title`, s.title, LIMITS.title);
    text(`${where} summary`, s.summary, LIMITS.summary);
    text(`${where} look`, s.look, LIMITS.look);
    text(`${where} reflect`, s.reflect, LIMITS.reflect);
    if (!Array.isArray(s.questions) || s.questions.length < 1 || s.questions.length > 2) errors.push(`${where}: needs 1 or 2 questions`);
    (s.questions || []).forEach((q, qi) => {
      const qw = `${where} question ${qi + 1}`;
      text(qw, q.q, LIMITS.q);
      text(`${qw} why`, q.why, LIMITS.why);
      if (!Array.isArray(q.a) || q.a.length !== 4) return errors.push(`${qw}: needs exactly 4 answers`);
      q.a.forEach((a, ai) => text(`${qw} answer ${ai + 1}`, a, LIMITS.a));
      if (new Set(q.a).size !== 4) errors.push(`${qw}: answers repeat`);
      if (q.a.some((a) => /\b(all|none|both) of (the|these) (above|answers)\b/i.test(a))) errors.push(`${qw}: no “all/none of the above”`);
      const lengths = q.a.map((a) => a.length);
      if (lengths[0] > 1.8 * Math.max(...lengths.slice(1))) warnings.push(`${qw}: the right answer is much longer than the others`);
    });
  });

  // Every chapter, in order, covered verse by verse with no gaps or overlaps.
  let lastChapter = 0;
  for (const s of guide.sections || []) {
    const c = Number(String(s.ref).split(':')[0]);
    if (c < lastChapter) errors.push(`section ${s.ref}: out of order`);
    lastChapter = c;
  }
  for (let c = 1; c <= book.chapters; c += 1) {
    const list = byChapter.get(c);
    if (!list) {
      errors.push(`chapter ${c}: no sections`);
      continue;
    }
    let expect = 1;
    for (const { start, end } of list) {
      if (start !== expect) errors.push(`chapter ${c}: expected a section starting at verse ${expect}, found ${start}`);
      expect = end + 1;
    }
    const last = versesIn(book.code, c);
    if (expect - 1 !== last) errors.push(`chapter ${c}: sections end at verse ${expect - 1}, but the chapter has ${last}`);
  }
  for (const c of byChapter.keys()) if (c < 1 || c > book.chapters) errors.push(`chapter ${c}: ${book.name} has ${book.chapters} chapters`);

  const n = guide.sections?.length || 0;
  console.log(`${errors.length ? '✗' : '✓'} ${book.name} — ${n} sections${warnings.length ? `, ${warnings.length} warning${warnings.length > 1 ? 's' : ''}` : ''}`);
  errors.forEach((e) => console.log(`    error: ${e}`));
  warnings.forEach((w) => console.log(`    warning: ${w}`));
  if (errors.length) failed = true;
}

for (const file of files) await check(file);
process.exit(failed ? 1 : 0);
