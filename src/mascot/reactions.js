// How Woolly answers each cue from the app: clips to play in turn, an optional loop to settle
// into afterwards, and a priority so a small reaction never cuts off a big one.
export function reaction(name, data = {}) {
  switch (name) {
    // A lesson is over: a celebration, then what stood out — a verse grown to Fruitful or
    // Hidden, a flawless round, then a seal or the daily goal, or the streak growing.
    case 'pass': {
      const clips = ['celebrate'];
      if (data.mastered) clips.push('proud');
      else if (data.perfect) clips.push('dance');
      if (data.rewarded) clips.push('reward');
      else if (data.streak) clips.push('streak');
      return { clips, priority: 5 };
    }
    case 'fail':
      return { clips: ['retry'], priority: 5 };
    case 'readFinish':
      return { clips: data.bookDone ? ['celebrate', 'proud'] : ['page-turn', 'bow'], priority: 5, base: 'idle' };
    // Around the app.
    case 'hello':
      return { clips: ['wave'], priority: 3 };
    case 'purchase':
      return { clips: ['surprised', 'celebrate'], priority: 4 };
    case 'cantAfford':
      // The lamb in the Treasury stands beside the talents, so it points them out.
      return { clips: ['point-left', 'unsure'], priority: 3 };
    case 'locked':
      return { clips: ['unsure'], priority: 2 };
    case 'equip':
      return { clips: ['nod'], priority: 2 };
    case 'verseAdded':
      return { clips: ['heart'], priority: 4 };
    case 'plan':
      return { clips: ['welcome'], priority: 4 };
    case 'download':
      return { clips: ['celebrate'], priority: 4 };
    case 'backup':
      // The note saying where it went is at the top of the screen.
      return { clips: ['point-up', 'nod'], priority: 3 };
    case 'journal':
      return { clips: ['bow'], priority: 4 };
    case 'share':
      return { clips: ['heart'], priority: 3 };
    case 'problem':
      return { clips: [data.offline ? 'offline' : 'error'], priority: 3 };
    case 'streakLost':
      return { clips: ['encourage'], priority: 4 };
    case 'streakKept':
      return { clips: ['streak'], priority: 3 };
    default:
      return null;
  }
}

// Moments worth popping in from the side for, when no lamb is on screen to answer.
export const CAMEOS = new Set(['verseAdded', 'plan', 'download', 'backup', 'journal', 'share', 'problem', 'streakLost', 'purchase']);
// Lively news makes the lamb run in; the rest it walks in for.
export const RUN_IN = new Set(['verseAdded', 'plan', 'download', 'purchase', 'share']);

// Tapping Woolly: a start the first time, then something different each time. Asleep, it
// wakes; reading, it turns the page; with something else in its paws, nothing (null).
const TAPS = ['hop', 'wave', 'spin', 'high-five', 'turn-away-and-back', 'dance', 'nod', 'sway', 'clap'];
export function tapReaction(count, base) {
  if (base === 'sleep') return { clips: ['wake'], priority: 3, base: 'idle' };
  if (base === 'read') return { clips: ['page-turn'], priority: 2 };
  if (base === 'reflect') return { clips: ['pray'], priority: 2 };
  if (base !== 'idle' && base !== 'breathe') return null;
  return { clips: [count === 0 ? 'surprised' : TAPS[(count - 1) % TAPS.length]], priority: 2 };
}

/**
 * What the lamb does over a step's feedback: right first time, a little better each time in a
 * row; close; or a slip — with "once more" when the step comes round again.
 */
export function feedbackAct(tone, { combo = 0, again = false } = {}) {
  if (tone === 'perfect') return combo >= 5 ? 'dance' : combo >= 3 ? 'high-five' : 'correct';
  if (tone === 'good') return 'clap';
  return again ? 'retry' : 'encourage';
}
