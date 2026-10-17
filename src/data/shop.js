// Everything that can be bought with talents (or unlocked by seals).
export const THEMES = [
  { id: 'midnight', name: 'Midnight & Gold', price: 0, colors: ['#0a0f1d', '#17223a', '#d4af37'] },
  { id: 'parchment', name: 'Parchment', price: 0, light: true, colors: ['#f3ead3', '#fbf5e6', '#a8801f'] },
  { id: 'royal', name: 'Royal Purple', price: 150, colors: ['#170c22', '#2a1840', '#e0b84e'] },
  { id: 'emerald', name: 'Garden of Eden', price: 150, colors: ['#08170f', '#123022', '#d9b45a'] },
  { id: 'crimson', name: 'Crimson & Gold', price: 200, colors: ['#1a080c', '#34121b', '#e3bb5c'] },
  { id: 'ivory', name: 'Ivory Palace', price: 200, light: true, colors: ['#fbf8f1', '#ffffff', '#b8912f'] },
  { id: 'rose', name: 'Rose of Sharon', price: 250, light: true, colors: ['#f6e9e4', '#fdf5f2', '#b5707a'] },
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
  { id: 'cinzel', name: 'Inscription', family: "'Cinzel', Georgia, serif", scale: 0.8, price: 120 },
  { id: 'script', name: 'Copperplate', family: "'Pinyon Script', cursive", scale: 1.12, price: 200 },
];

export const FRAMES = [
  { id: 'filigree', name: 'Filigree', price: 0 },
  { id: 'vine', name: 'Vine & Branches', price: 120 },
  { id: 'illuminated', name: 'Illuminated', price: 220 },
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
  { id: 'heart', name: 'Heart', price: 0, unlock: 'heart_1' },
  { id: 'chirho', name: 'Chi-Rho', price: 0, unlock: 'path_prayer' },
  { id: 'star', name: 'Morning Star', price: 0, unlock: 'streak_30' },
  { id: 'sun', name: 'Sun of Righteousness', price: 0, unlock: 'heart_10' },
  { id: 'crown', name: 'Crown of Life', price: 0, unlock: 'heart_25' },
];

export const OIL = { price: 50, max: 2 };

export const SHOP = { theme: THEMES, font: FONTS, frame: FRAMES, emblem: EMBLEMS };

export const fontFor = (id) => FONTS.find((f) => f.id === id) || FONTS[0];
