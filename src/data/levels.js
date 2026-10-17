// A verse grows like seed in good soil (Mark 4:20) until it is hidden in the heart (Psalm 119:11).
export const LEVELS = [
  { n: 0, name: 'Unsown', icon: 'seed', desc: 'Not begun yet.' },
  { n: 1, name: 'Sown', icon: 'seed', desc: 'You have read it and taken the first steps.' },
  { n: 2, name: 'Rooted', icon: 'sprout', desc: 'You can rebuild it with a little help.' },
  { n: 3, name: 'Growing', icon: 'wheat', desc: 'You can recall most of it with gentle hints.' },
  { n: 4, name: 'Fruitful', icon: 'vine', desc: 'You can recite it from memory. Keep tending it.' },
  { n: 5, name: 'Hidden in the Heart', short: 'Hidden', icon: 'heart', desc: 'Remembered across weeks — written on the tablet of your heart.' },
];

export const LESSON_NAMES = ['Sow a new verse', 'Put down roots', 'Help it grow', 'Bear fruit'];

export const levelName = (n) => LEVELS[n]?.short || LEVELS[n]?.name || '';

export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX'];

export function roman(n) {
  return ROMAN[n] || String(n);
}

// Daily goals, in XP. A lesson or a reading is worth roughly 20 XP.
export const GOALS = [
  { xp: 20, name: 'Gentle', desc: 'About one lesson or reading a day' },
  { xp: 40, name: 'Steady', desc: 'About two a day' },
  { xp: 60, name: 'Devoted', desc: 'About three a day' },
  { xp: 100, name: 'Zealous', desc: 'Five or more' },
];

// Titles grow with the number of verses hidden in the heart.
export const TITLES = [
  { at: 0, name: 'Seeker' },
  { at: 3, name: 'Disciple' },
  { at: 10, name: 'Scribe' },
  { at: 25, name: 'Psalmist' },
  { at: 50, name: 'Elder' },
  { at: 100, name: 'Sage' },
];

export function titleFor(hidden) {
  return [...TITLES].reverse().find((t) => hidden >= t.at).name;
}
