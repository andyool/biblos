// Curated learning paths. Only references live here — the words are loaded in
// whichever translation you choose.
const range = (prefix, from, to) => Array.from({ length: to - from + 1 }, (_, i) => `${prefix}.${from + i}`);

export const PATHS = [
  {
    id: 'foundations',
    title: 'Foundations',
    subtitle: 'The heart of the gospel',
    emblem: 'cross',
    verses: ['JHN.3.16', 'ROM.3.23', 'ROM.6.23', 'ROM.5.8', 'EPH.2.8-9', 'JHN.14.6', 'ROM.10.9', '2CO.5.17', '1JN.1.9', 'GAL.2.20', 'ROM.8.1', 'JHN.1.12'],
  },
  {
    id: 'shepherd',
    title: 'The Shepherd’s Psalm',
    subtitle: 'Psalm 23, verse by verse',
    emblem: 'crook',
    verses: range('PSA.23', 1, 6),
  },
  {
    id: 'prayer',
    title: 'The Lord’s Prayer',
    subtitle: 'As Jesus taught us to pray',
    emblem: 'chirho',
    verses: range('MAT.6', 9, 13),
  },
  {
    id: 'peace',
    title: 'Peace for the Anxious',
    subtitle: 'Cast all your cares on him',
    emblem: 'dove',
    verses: ['PHP.4.6', 'PHP.4.7', '1PE.5.7', 'JHN.14.27', 'ISA.26.3', 'MAT.11.28', 'MAT.11.29', 'MAT.11.30', 'MAT.6.33', 'MAT.6.34', 'PSA.46.10'],
  },
  {
    id: 'strength',
    title: 'Strength & Courage',
    subtitle: 'Be strong and take heart',
    emblem: 'sun',
    verses: ['JOS.1.9', 'ISA.40.31', 'PHP.4.13', 'ISA.41.10', '2TI.1.7', 'DEU.31.6', '2CO.12.9', 'PSA.27.1', 'PSA.46.1', 'NEH.8.10'],
  },
  {
    id: 'guidance',
    title: 'Trust & Guidance',
    subtitle: 'A lamp to my feet',
    emblem: 'lamp',
    verses: ['PRO.3.5', 'PRO.3.6', 'JER.29.11', 'ROM.8.28', 'PSA.119.105', 'PSA.32.8', 'ISA.55.8', 'ISA.55.9', 'JAS.1.5', 'PSA.37.5'],
  },
  {
    id: 'love',
    title: 'The Way of Love',
    subtitle: '1 Corinthians 13 and more',
    emblem: 'heart',
    verses: ['1CO.13.4', '1CO.13.5', '1CO.13.6', '1CO.13.7', '1CO.13.8', '1CO.13.13', 'JHN.13.34', 'JHN.13.35', '1JN.4.7', '1JN.4.8', '1JN.4.19'],
  },
  {
    id: 'beatitudes',
    title: 'The Beatitudes',
    subtitle: 'The Sermon on the Mount',
    emblem: 'crown',
    verses: range('MAT.5', 3, 10),
  },
  {
    id: 'word',
    title: 'In the Beginning Was the Word',
    subtitle: 'The prologue of John',
    emblem: 'scroll',
    verses: ['JHN.1.1', 'JHN.1.2', 'JHN.1.3', 'JHN.1.4', 'JHN.1.5', 'JHN.1.14'],
  },
  {
    id: 'spirit',
    title: 'Life in the Spirit',
    subtitle: 'Fruit, faith and faithful living',
    emblem: 'flame',
    verses: ['GAL.5.22-23', 'ROM.12.1', 'ROM.12.2', 'ROM.12.12', 'MIC.6.8', 'COL.3.23', 'PHP.4.8', 'HEB.11.1', 'HEB.11.6', 'JAS.1.22'],
  },
  {
    id: 'promises',
    title: 'Promises of God',
    subtitle: 'An anchor for the soul',
    emblem: 'anchor',
    verses: ['LAM.3.22-23', 'ROM.8.38-39', 'ISA.43.2', 'PSA.37.4', 'JHN.10.10', 'JHN.16.33', 'PHP.1.6', 'NUM.6.24-26', '2CO.4.17', 'REV.21.4'],
  },
  {
    id: 'armour',
    title: 'The Armour of God',
    subtitle: 'Ephesians 6',
    emblem: 'shield',
    verses: range('EPH.6', 10, 18),
  },
  {
    id: 'psalm121',
    title: 'I Lift Up My Eyes',
    subtitle: 'Psalm 121',
    emblem: 'star',
    verses: range('PSA.121', 1, 8),
  },
  {
    id: 'psalm1',
    title: 'The Tree by the Water',
    subtitle: 'Psalm 1',
    emblem: 'olive',
    verses: range('PSA.1', 1, 6),
  },
  {
    id: 'commission',
    title: 'Go and Make Disciples',
    subtitle: 'Witness and mission',
    emblem: 'ichthys',
    verses: ['MAT.28.18', 'MAT.28.19', 'MAT.28.20', 'ACT.1.8', 'ROM.1.16', '1PE.3.15', 'MAT.5.14', 'MAT.5.16'],
  },
  {
    id: 'wisdom',
    title: 'Wisdom from Proverbs',
    subtitle: 'The fear of the Lord',
    emblem: 'key',
    verses: ['PRO.1.7', 'PRO.9.10', 'PRO.4.23', 'PRO.16.3', 'PRO.16.9', 'PRO.18.10', 'PRO.15.1', 'PRO.17.17', 'PRO.22.6', 'PRO.27.17'],
  },
];

export const PATH_BY_ID = Object.fromEntries(PATHS.map((p) => [p.id, p]));

export const CURATED_IDS = [...new Set(PATHS.flatMap((p) => p.verses))];

export function getPath(state, id) {
  if (id === 'mine') {
    return {
      id: 'mine',
      title: 'My Verses',
      subtitle: 'Verses you have chosen yourself',
      emblem: 'quill',
      verses: state.custom,
    };
  }
  return PATH_BY_ID[id] || PATHS[0];
}

export function allPaths(state) {
  return state.custom.length ? [...PATHS, getPath(state, 'mine')] : PATHS;
}
