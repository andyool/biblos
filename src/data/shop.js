// Everything that can be bought with talents (or unlocked by seals).
export const THEMES = [
  { id: 'midnight', name: 'Midnight & Gold', price: 0, colors: ['#0a0f1d', '#17223a', '#ecc04e'] },
  { id: 'parchment', name: 'Parchment', price: 0, light: true, colors: ['#f3ead3', '#fbf5e6', '#cf9d30'] },
  { id: 'royal', name: 'Royal Purple', price: 120, colors: ['#170c22', '#2a1840', '#efc455'] },
  { id: 'ivory', name: 'Ivory Palace', price: 140, light: true, colors: ['#eef0f4', '#ffffff', '#d0a038'] },
  { id: 'emerald', name: 'Garden of Eden', price: 160, colors: ['#08170f', '#123022', '#e6bd52'] },
  { id: 'lily', name: 'Lily of the Field', price: 180, light: true, colors: ['#dce7d3', '#f4f8ef', '#c99e36'] },
  { id: 'galilee', name: 'Sea of Galilee', price: 200, colors: ['#061518', '#102b31', '#e9bf50'] },
  { id: 'rose', name: 'Rose of Sharon', price: 220, light: true, colors: ['#f3d9dc', '#fdf2f3', '#d99a9c'] },
  { id: 'cedar', name: 'Cedar of Lebanon', price: 240, colors: ['#140d08', '#2a1d13', '#eabd55'] },
  { id: 'desert', name: 'Desert in Bloom', price: 260, light: true, colors: ['#f0d2b6', '#fcefe2', '#c98a52'] },
  { id: 'crimson', name: 'Crimson & Gold', price: 280, colors: ['#1a080c', '#34121b', '#efc35c'] },
  { id: 'silver', name: 'Refined Silver', price: 300, colors: ['#0d0f12', '#1c2129', '#b9c0ca'] },
];

export const isLightTheme = (id) => Boolean(THEMES.find((t) => t.id === id)?.light);

/** The theme to show: your own choice, or with "Match my phone", your light or dark one. */
export function themeFor(settings, phoneIsDark) {
  if (!settings.autoTheme) return settings.theme;
  return phoneIsDark ? settings.darkTheme || 'midnight' : settings.lightTheme || 'parchment';
}

// Text sizes: every size in the app is multiplied by this.
export const TEXT_SIZES = [
  { scale: 1, name: 'Standard' },
  { scale: 1.15, name: 'Large' },
  { scale: 1.3, name: 'Larger' },
];

export const FONTS = [
  { id: 'cormorant', name: 'Cormorant', family: "'Cormorant Garamond', Georgia, serif", scale: 1, price: 0 },
  { id: 'garamond', name: 'Garamond', family: "'EB Garamond', Georgia, serif", scale: 0.9, price: 0 },
  { id: 'fell', name: 'Old Press', family: "'IM Fell English', Georgia, serif", scale: 0.92, price: 100 },
  { id: 'jost', name: 'Modern', family: "'Jost', 'Helvetica Neue', sans-serif", scale: 0.82, price: 100 },
  { id: 'cinzel', name: 'Inscription', family: "'Cinzel', Georgia, serif", scale: 0.8, price: 120 },
  { id: 'alegreya', name: 'Humanist', family: "'Alegreya Sans', 'Helvetica Neue', sans-serif", scale: 0.84, price: 120 },
  { id: 'script', name: 'Copperplate', family: "'Pinyon Script', cursive", scale: 1.12, price: 200 },
  { id: 'gutenberg', name: 'Gutenberg', family: "'UnifrakturMaguntia', Georgia, serif", scale: 0.82, price: 250 },
];

export const FRAMES = [
  { id: 'filigree', name: 'Filigree', price: 0 },
  { id: 'vine', name: 'Vine & Branches', price: 120 },
  { id: 'greekkey', name: 'Greek Key', price: 140 },
  { id: 'trinity', name: 'Trinity Knot', price: 160 },
  { id: 'starry', name: 'Starry Host', price: 180 },
  { id: 'illuminated', name: 'Illuminated', price: 220 },
  { id: 'cathedral', name: 'Cathedral', price: 220 },
  { id: 'pearl', name: 'Gates of Pearl', price: 260 },
];

export const EMBLEMS = [
  { id: 'cross', name: 'Cross', price: 0 },
  { id: 'dove', name: 'Dove', price: 0 },
  { id: 'lamp', name: 'Lamp', price: 0 },
  { id: 'ichthys', name: 'Ichthys', price: 60 },
  { id: 'olive', name: 'Olive Branch', price: 60 },
  { id: 'anchor', name: 'Anchor', price: 80 },
  { id: 'crook', name: 'Shepherd’s Crook', price: 80 },
  { id: 'scroll', name: 'Scroll', price: 80 },
  { id: 'wheat', name: 'Sheaf', price: 90 },
  { id: 'vine', name: 'True Vine', price: 100 },
  { id: 'key', name: 'Keys', price: 100 },
  { id: 'quill', name: 'Quill', price: 100 },
  { id: 'shield', name: 'Shield of Faith', price: 120 },
  { id: 'flame', name: 'Flame', price: 120 },
  { id: 'harp', name: 'David’s Harp', price: 120 },
  { id: 'chalice', name: 'Cup of Blessing', price: 120 },
  { id: 'heart', name: 'Heart', price: 0, unlock: 'heart_1' },
  { id: 'chirho', name: 'Chi-Rho', price: 0, unlock: 'path_prayer' },
  { id: 'star', name: 'Morning Star', price: 0, unlock: 'streak_30' },
  { id: 'sun', name: 'Sun of Righteousness', price: 0, unlock: 'heart_10' },
  { id: 'crown', name: 'Crown of Life', price: 0, unlock: 'heart_25' },
];

export const OIL = { price: 50, max: 2 };

export const SHOP = { theme: THEMES, font: FONTS, frame: FRAMES, emblem: EMBLEMS };

export const fontFor = (id) => FONTS.find((f) => f.id === id) || FONTS[0];
