// How the lamb answers each cue from the app: a sequence of clips, an optional base pose
// to settle into, and a priority so small reactions never cut off big ones.
const pick = (list) => list[Math.floor(Math.random() * list.length)];

export function reaction(name, data = {}) {
  switch (name) {
    // Inside exercises: every tap.
    case 'tick':
      return { clips: [pick(['earFlick', 'nod'])], priority: 0 };
    case 'correct':
      return { clips: [pick(['hop', 'nod', 'hop'])], priority: 1 };
    case 'wrong':
      return { clips: ['oops'], priority: 2 };
    // The end of a step, with its tone.
    case 'step':
      if (data.tone === 'perfect') return { clips: [data.combo >= 3 ? pick(['cheer', 'dance', 'clap']) : pick(['hop', 'cheer'])], priority: 3 };
      if (data.tone === 'good') return { clips: [pick(['nod', 'smileAt', 'hop'])], priority: 3 };
      return { clips: ['encourage'], priority: 3 };
    case 'lessonStart':
      return { clips: ['nod'], priority: 1 };
    // Lesson complete.
    case 'pass':
      if (data.levelled) return { clips: ['celebrate', 'proud'], priority: 5, base: 'happy' };
      if (data.perfect) return { clips: ['celebrate', 'clap'], priority: 5, base: 'happy' };
      return { clips: [pick(['cheer', 'dance']), 'clap'], priority: 5, base: 'happy' };
    case 'fail':
      return { clips: ['sigh', 'encourage'], priority: 5, base: 'idle' };
    case 'achievement':
      return { clips: ['proud', 'clap'], priority: 4 };
    case 'goal':
      return { clips: ['cheer'], priority: 4 };
    // Reading.
    case 'readStart':
      return { clips: ['openBook'], priority: 4, base: 'read' };
    case 'readFinish':
      return { clips: data.bookDone ? ['closeBook', 'celebrate'] : ['closeBook', 'heart'], priority: 5, base: 'happy' };
    case 'journal':
      return { clips: ['heart'], priority: 4 };
    // Around the app.
    case 'hello':
      return { clips: ['wave'], priority: 2 };
    case 'purchase':
      return { clips: ['present', 'bow'], priority: 4 };
    case 'cantAfford':
      return { clips: ['shrug'], priority: 3 };
    case 'equip':
      return { clips: ['smileAt'], priority: 2 };
    case 'verseAdded':
      return { clips: ['nod', 'clap'], priority: 4 };
    case 'plan':
      return { clips: ['proud'], priority: 4 };
    case 'download':
      return { clips: ['cheer'], priority: 4 };
    case 'problem':
      return { clips: ['shrug'], priority: 3, base: 'worried' };
    case 'calm':
      return { clips: [], priority: 0, base: 'idle' };
    case 'share':
      return { clips: ['present'], priority: 3 };
    case 'streakLost':
      return { clips: ['sigh', 'encourage'], priority: 4 };
    case 'streakKept':
      return { clips: ['nod', 'smileAt'], priority: 3 };
    case 'empty':
      return { clips: ['shrug'], priority: 2 };
    case 'point':
      return { clips: ['point'], priority: 2 };
    case 'sleep':
      return { clips: ['yawn'], priority: 1, base: 'sleep' };
    default:
      return null;
  }
}

// Tapping the lamb: a little surprise, then something different each time.
const TAPS = ['surprise', 'giggle', 'spin', 'wave', 'dance', 'smileAt', 'tailWag'];
export function tapReaction(count, base) {
  if (base === 'sleep') return { clips: ['wake'], priority: 2, base: 'idle' };
  if (base === 'read') return { clips: ['readNod'], priority: 2 };
  return { clips: [count === 0 ? 'surprise' : TAPS[count % TAPS.length]], priority: 2 };
}
