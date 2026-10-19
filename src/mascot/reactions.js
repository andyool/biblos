// How Woolly answers each cue from the app: clips to play in turn, an optional loop to settle
// into afterwards, and a priority so a small reaction never cuts off a big one.
export function reaction(name, data = {}) {
  switch (name) {
    // A lesson or reading is over.
    case 'pass':
      return { clips: data.levelled || data.perfect ? ['celebrate', 'jump'] : ['jump', 'nod'], priority: 5 };
    case 'fail':
      return { clips: ['encourage'], priority: 5 };
    case 'readFinish':
      return { clips: data.bookDone ? ['celebrate', 'jump'] : ['nod'], priority: 5, base: 'idle' };
    // Around the app.
    case 'hello':
      return { clips: ['wave'], priority: 3 };
    case 'purchase':
      return { clips: ['celebrate'], priority: 4 };
    case 'cantAfford':
      return { clips: ['encourage'], priority: 3 };
    case 'equip':
      return { clips: ['nod'], priority: 2 };
    case 'verseAdded':
      return { clips: ['jump'], priority: 4 };
    case 'plan':
      return { clips: ['celebrate'], priority: 4 };
    case 'download':
      return { clips: ['celebrate'], priority: 4 };
    case 'backup':
      return { clips: ['nod'], priority: 3 };
    case 'journal':
      return { clips: ['pray'], priority: 4 };
    case 'share':
      return { clips: ['wave'], priority: 3 };
    case 'problem':
      return { clips: ['look-around'], priority: 3 };
    case 'streakLost':
      return { clips: ['encourage'], priority: 4 };
    case 'streakKept':
      return { clips: ['nod'], priority: 3 };
    case 'empty':
      return { clips: ['look-around'], priority: 2 };
    default:
      return null;
  }
}

// Moments worth popping in from the side for, when no lamb is on screen to answer.
export const CAMEOS = new Set(['verseAdded', 'plan', 'download', 'backup', 'journal', 'share', 'problem', 'streakLost', 'purchase']);

// Tapping Woolly: something different each time.
const TAPS = ['jump', 'wave', 'spin', 'nod', 'turn-away-and-back', 'celebrate', 'sway'];
export const tapReaction = (count) => ({ clips: [TAPS[count % TAPS.length]], priority: 2 });

/** What the lamb does over a step's feedback. */
export const feedbackAct = (tone, combo = 0) => (tone === 'perfect' ? (combo >= 3 ? 'celebrate' : 'jump') : tone === 'good' ? 'nod' : 'encourage');
