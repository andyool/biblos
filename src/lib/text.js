// Turning verse text into words we can hide, shuffle and check.

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };

function decode(s) {
  return s
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
      if (e[0] === '#') {
        const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : m;
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    });
}

// Words that only appear in psalm headings ("To the choirmaster. A Psalm of David.")
const HEADING = /\b(psalm|song|musician|director|choirmaster|choir|maskil|miktam|michtam|maschil|shiggaion|korah|asaph|david|solomon|moses|heman|ethan|jeduthun|alamoth|sheminith|gittith|neginoth|nehiloth|lilies|mahalath|labben|aijeleth|ascents|degrees|sabbath|dedication|stringed|flutes)\b/i;

/** Drop leading heading sentences from Psalm verse 1, keeping the verse itself. */
function stripPsalmHeading(s) {
  let rest = s;
  for (let i = 0; i < 4; i += 1) {
    const m = rest.match(/^([^.!?]{2,200}\.)\s+(?=\S)/);
    if (!m || !HEADING.test(m[1])) break;
    rest = rest.slice(m[0].length);
  }
  return rest.length > 12 ? rest : s;
}

/** Strip markup, footnote markers and psalm titles from API text. */
export function cleanVerseText(raw, { book, verse } = {}) {
  let s = String(raw || '');
  const psalmOpening = book === 'PSA' && verse === 1;
  s = s.replace(/<S>\s*\d+\s*<\/S>/gi, '');
  s = s.replace(/<sup>[\s\S]*?<\/sup>/gi, '');
  if (psalmOpening) {
    s = s.replace(/^\s*(<(b|i)>[\s\S]*?<\/\2>\s*)+/i, '');
    // A short heading line ending in <br> ("A David psalm<br/>")
    s = s.replace(/^\s*([^<]{1,60}?)\s*<br\s*\/?>/i, (m, line) => (/psalm|song|prayer|david|asaph|korah/i.test(line) ? '' : m));
  }
  s = s.replace(/<br\s*\/?>/gi, ' ');
  s = s.replace(/<\/?[a-z][^>]*>/gi, '');
  s = decode(s);
  s = s.replace(/\[\d+\]/g, ' ');
  s = s.replace(/[Ⓐ-ⓩ]/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  if (psalmOpening) s = stripPsalmHeading(s);
  // Drop a leading verse number some sources include ("16 For God so…")
  if (verse && s.startsWith(`${verse} `)) s = s.slice(String(verse).length + 1);
  return s;
}

export function norm(word) {
  return word
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Split a token into [leading punctuation, word, trailing punctuation]. */
export function splitPunct(w) {
  const m = w.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u);
  return m ? [m[1], m[2], m[3]] : ['', w, ''];
}

export const bare = (w) => splitPunct(w)[1];

/**
 * Words of a passage: { w: shown text, n: normalised, f: first letter, v: verse number, i: index }
 */
export function tokenize(verses) {
  const tokens = [];
  for (const { v, t } of verses) {
    const parts = t.replace(/([—–])(?=\S)/g, '$1 ').split(/\s+/).filter(Boolean);
    let lead = '';
    for (const part of parts) {
      const n = norm(part);
      if (!n) {
        const last = tokens[tokens.length - 1];
        if (last && last.v === v && !/^[“‘"'(\[]+$/.test(part)) last.w += /^[—–-]+$/.test(part) ? ` ${part}` : part;
        else lead += part;
        continue;
      }
      tokens.push({ w: lead + part, n, f: n[0], v, i: tokens.length });
      lead = '';
    }
    if (lead && tokens.length) tokens[tokens.length - 1].w += lead;
  }
  return tokens;
}

const BREAK = /[,;:.!?—–)]["”’']*$/;

/** Natural phrases (by punctuation), kept between 3 and ~9 words. */
export function phrases(tokens) {
  let groups = [];
  let cur = [];
  tokens.forEach((t, i) => {
    cur.push(i);
    if (BREAK.test(t.w) || i === tokens.length - 1) {
      groups.push(cur);
      cur = [];
    }
  });
  // Merge very short phrases into a neighbour.
  const merged = [];
  for (let gi = 0; gi < groups.length; gi += 1) {
    const g = groups[gi];
    if (g.length < 3 && gi < groups.length - 1) {
      groups[gi + 1] = [...g, ...groups[gi + 1]];
    } else if (g.length < 3 && merged.length) {
      merged[merged.length - 1] = [...merged[merged.length - 1], ...g];
    } else {
      merged.push(g);
    }
  }
  groups = [];
  // Split long phrases into even pieces.
  for (const g of merged) {
    if (g.length <= 10) {
      groups.push(g);
      continue;
    }
    const pieces = Math.ceil(g.length / 8);
    const size = Math.ceil(g.length / pieces);
    for (let i = 0; i < g.length; i += size) groups.push(g.slice(i, i + size));
  }
  return groups;
}

/** Phrases for the ordering exercise — at least three pieces when the verse allows it. */
export function orderGroups(tokens) {
  let groups = phrases(tokens);
  if (groups.length >= 3 || tokens.length < 6) return groups;
  const size = Math.ceil(tokens.length / 3);
  groups = [];
  for (let i = 0; i < tokens.length; i += size) groups.push(tokens.slice(i, i + size).map((t) => t.i));
  return groups;
}

export const STOP = new Set(
  'a an and are as at be but by for from had has have he her him his i in is it its me my of on or our she so that the their them they this to us was we were will with you your shall not unto thee thou thy who which what when then than there these those into upon all ye do did does no nor if am been being o'.split(
    ' ',
  ),
);

export function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Shuffle so the result is never in the original order (when possible). */
export function shuffleMixed(list) {
  if (list.length < 2) return [...list];
  for (let tries = 0; tries < 8; tries += 1) {
    const s = shuffle(list);
    if (s.some((x, i) => x !== list[i])) return s;
  }
  return [...list.slice(1), list[0]];
}

export const pick = (list) => list[Math.floor(Math.random() * list.length)];

/** Speakable text: "LORD" → "Lord" */
export function speakable(text) {
  return text.replace(/\bLORD\b/g, 'Lord').replace(/\bGOD\b/g, 'God');
}
