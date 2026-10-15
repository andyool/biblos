import { PATH_BY_ID } from './paths.js';

const count = (s, min) => Object.values(s.verses).filter((v) => v.level >= min).length;
const pathDone = (s, id) => PATH_BY_ID[id].verses.every((v) => (s.verses[v]?.level || 0) >= 4);
const anyPathDone = (s) => Object.keys(PATH_BY_ID).some((id) => pathDone(s, id));
const pathCount = (s, id) => PATH_BY_ID[id].verses.filter((v) => (s.verses[v]?.level || 0) >= 4).length;

const n = (value, target) => ({ value: Math.min(value, target), target });

// Seals: each has a test, a progress reading and a reward in talents.
export const ACHIEVEMENTS = [
  { id: 'first_light', name: 'First Light', desc: 'Complete your first lesson.', icon: 'sun', reward: 10, progress: (s) => n(s.stats.lessons, 1) },
  { id: 'sower', name: 'The Sower', desc: 'Begin learning five verses.', icon: 'seed', reward: 15, progress: (s) => n(count(s, 1), 5) },
  { id: 'fruit_1', name: 'First Fruits', desc: 'Memorise your first verse.', icon: 'vine', reward: 20, progress: (s) => n(count(s, 4), 1) },
  { id: 'heart_1', name: 'Treasure Hidden', desc: 'Hide your first verse in your heart.', icon: 'heart', reward: 30, progress: (s) => n(count(s, 5), 1) },
  { id: 'fruit_10', name: 'Fruitful Branch', desc: 'Memorise ten verses.', icon: 'olive', reward: 40, progress: (s) => n(count(s, 4), 10) },
  { id: 'heart_10', name: 'Treasury of Ten', desc: 'Hide ten verses in your heart.', icon: 'sun', reward: 60, progress: (s) => n(count(s, 5), 10) },
  { id: 'heart_25', name: 'Crown of Life', desc: 'Hide twenty-five verses in your heart.', icon: 'crown', reward: 100, progress: (s) => n(count(s, 5), 25) },
  { id: 'heart_50', name: 'Living Library', desc: 'Hide fifty verses in your heart.', icon: 'scroll', reward: 200, progress: (s) => n(count(s, 5), 50) },
  { id: 'heart_100', name: 'Psalmist', desc: 'Hide one hundred verses in your heart.', icon: 'star', reward: 400, progress: (s) => n(count(s, 5), 100) },
  { id: 'streak_3', name: 'Kindled', desc: 'Keep your lamp burning three days in a row.', icon: 'lamp', reward: 10, progress: (s) => n(s.stats.bestStreak, 3) },
  { id: 'streak_7', name: 'A Lamp to My Feet', desc: 'A seven-day streak.', icon: 'lamp', reward: 25, progress: (s) => n(s.stats.bestStreak, 7) },
  { id: 'streak_30', name: 'Keeper of the Flame', desc: 'A thirty-day streak.', icon: 'flame', reward: 75, progress: (s) => n(s.stats.bestStreak, 30) },
  { id: 'streak_100', name: 'Watchman', desc: 'A hundred-day streak.', icon: 'shield', reward: 200, progress: (s) => n(s.stats.bestStreak, 100) },
  { id: 'streak_365', name: 'A Year of Faithfulness', desc: 'A streak of a whole year.', icon: 'crown', reward: 500, progress: (s) => n(s.stats.bestStreak, 365) },
  { id: 'perfect_1', name: 'Without Blemish', desc: 'Finish a lesson without a single slip.', icon: 'star', reward: 10, progress: (s) => n(s.stats.perfect, 1) },
  { id: 'perfect_25', name: 'Refined as Gold', desc: 'Finish twenty-five flawless lessons.', icon: 'crown', reward: 60, progress: (s) => n(s.stats.perfect, 25) },
  { id: 'goal_7', name: 'Daily Bread', desc: 'Meet your daily goal on seven days.', icon: 'wheat', reward: 30, progress: (s) => n(s.stats.goalDays, 7) },
  { id: 'path_any', name: 'Pilgrim', desc: 'Memorise every verse in a path.', icon: 'key', reward: 50, progress: (s) => n(anyPathDone(s) ? 1 : 0, 1) },
  { id: 'path_shepherd', name: 'The Good Shepherd', desc: 'Memorise all of Psalm 23.', icon: 'crook', reward: 50, progress: (s) => n(pathCount(s, 'shepherd'), PATH_BY_ID.shepherd.verses.length) },
  { id: 'path_prayer', name: 'Teach Us to Pray', desc: 'Memorise the Lord’s Prayer.', icon: 'chirho', reward: 50, progress: (s) => n(pathCount(s, 'prayer'), PATH_BY_ID.prayer.verses.length) },
  { id: 'path_armour', name: 'Fully Armed', desc: 'Memorise the Armour of God.', icon: 'shield', reward: 60, progress: (s) => n(pathCount(s, 'armour'), PATH_BY_ID.armour.verses.length) },
  { id: 'morning', name: 'Morning Watch', desc: 'Practise before seven in the morning.', icon: 'sun', reward: 15, progress: (s) => n(s.stats.morning ? 1 : 0, 1) },
  { id: 'night', name: 'Night Watch', desc: 'Practise after ten at night.', icon: 'star', reward: 15, progress: (s) => n(s.stats.night ? 1 : 0, 1) },
  { id: 'scribe', name: 'Diligent Scribe', desc: 'Recall two thousand words.', icon: 'quill', reward: 40, progress: (s) => n(s.stats.letters, 2000) },
  { id: 'own_verse', name: 'Treasure Seeker', desc: 'Add a verse of your own.', icon: 'key', reward: 10, progress: (s) => n(s.custom.length, 1) },
  { id: 'xp_1000', name: 'Talents Multiplied', desc: 'Earn 1,000 XP.', icon: 'wheat', reward: 40, progress: (s) => n(s.stats.xp, 1000) },
  { id: 'xp_10000', name: 'Good and Faithful', desc: 'Earn 10,000 XP.', icon: 'crown', reward: 200, progress: (s) => n(s.stats.xp, 10000) },
];

export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

export function newlyEarned(state) {
  return ACHIEVEMENTS.filter((a) => {
    if (state.achievements[a.id]) return false;
    const p = a.progress(state);
    return p.value >= p.target;
  });
}
