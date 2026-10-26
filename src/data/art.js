// Written by scripts/art.mjs (`npm run art`) from the drawings in seals/, emblems/ and biblos-impact-assets/. Do not edit.

/** The seals that have a drawing in public/seals/; the rest are drawn in code (Ornaments.jsx). */
export const SEAL_ART = new Set([ "answered_1", "book_1", "first_light", "fruit_1", "fruit_10", "goal_7", "heart_1", "heart_10", "heart_100", "heart_25", "heart_50", "journal_1", "journal_10", "journal_7", "morning", "night", "own_verse", "path_any", "path_armour", "path_prayer", "path_shepherd", "perfect_1", "perfect_25", "reader_1", "reader_100", "reader_30", "scribe", "sower", "streak_100", "streak_3", "streak_30", "streak_365", "streak_7", "xp_1000", "xp_10000" ]);

/** The emblems that have a drawing in public/emblems/; the rest are line glyphs (Glyph.jsx). */
export const EMBLEM_ART = new Set([ "anchor", "chalice", "chirho", "crook", "cross", "crown", "dove", "flame", "harp", "heart", "ichthys", "key", "lamp", "olive", "quill", "scroll", "shield", "star", "sun", "vine", "wheat" ]);

/** The pieces of the seal drop in public/fx/: crack-1…N, shard-1…N and the dust cloud. */
export const IMPACT_ART = {"cracks":3,"shards":8,"dust":true};
