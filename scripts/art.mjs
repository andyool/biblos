// Turns the drawn seals, emblems and impact pieces into the small WebP files the app ships,
// and writes src/data/art.js saying which exist. Run `npm run art` after adding or redrawing any.
//
//   seals/<id>.png (1024 square, see seals-brief.md)        → public/seals/<id>.webp
//   emblems/<id>.png (1024 square, see emblems-brief.md)    → public/emblems/<id>.webp
//   biblos-impact-assets/{crack-N,shard-N,dust}.png         → public/fx/*.webp
//
// The originals are big (1–2 MB a seal or emblem, 10 MB a crack) and stay out of git; these
// are a few tens of KB each and load the first time they are shown.
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const SEALS_IN = 'seals';
const EMBLEMS_IN = 'emblems';
const IMPACT_IN = 'biblos-impact-assets';
const SEALS_OUT = 'public/seals';
const EMBLEMS_OUT = 'public/emblems';
const FX_OUT = 'public/fx';
const MANIFEST = 'src/data/art.js';

const pngs = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.png')).sort() : []);
const kb = (f) => `${Math.round(statSync(f).size / 1024)} KB`;

async function convert(input, output, { width, height = width, quality }) {
  mkdirSync(join(output, '..'), { recursive: true });
  await sharp(input).resize(width, height, { fit: 'inside', withoutEnlargement: true }).webp({ quality, effort: 6 }).toFile(output);
  console.log(`${output}  ${kb(output)}`);
}

const seals = [];
for (const f of pngs(SEALS_IN)) {
  const id = f.slice(0, -4);
  // Shown at 74–110px on screen, and about 220px as it lands: 512 keeps it crisp on a 3x phone.
  await convert(join(SEALS_IN, f), join(SEALS_OUT, `${id}.webp`), { width: 512, quality: 84 });
  seals.push(id);
}

const emblems = [];
for (const f of pngs(EMBLEMS_IN)) {
  const id = f.slice(0, -4);
  // Worn at 38–84px, so 256 is crisp on a 3x phone.
  await convert(join(EMBLEMS_IN, f), join(EMBLEMS_OUT, `${id}.webp`), { width: 256, quality: 84 });
  emblems.push(id);
}

const impact = { cracks: 0, shards: 0, dust: false };
for (const f of pngs(IMPACT_IN)) {
  const name = f.slice(0, -4);
  const out = join(FX_OUT, `${name}.webp`);
  if (name.startsWith('crack-')) {
    // A phone screen at 3x; fine white lines, so not too lossy.
    await convert(join(IMPACT_IN, f), out, { width: 1080, height: 2340, quality: 78 });
    impact.cracks += 1;
  } else if (name.startsWith('shard-')) {
    await convert(join(IMPACT_IN, f), out, { width: 256, quality: 80 });
    impact.shards += 1;
  } else if (name === 'dust') {
    await convert(join(IMPACT_IN, f), out, { width: 512, quality: 72 });
    impact.dust = true;
  }
}

if (!seals.length && !emblems.length && !pngs(IMPACT_IN).length) {
  console.log(`Nothing to do: no drawings in ${SEALS_IN}/, ${EMBLEMS_IN}/ or ${IMPACT_IN}/. The files in public/ are kept as they are.`);
  process.exit(0);
}

writeFileSync(
  MANIFEST,
  `// Written by scripts/art.mjs (\`npm run art\`) from the drawings in ${SEALS_IN}/, ${EMBLEMS_IN}/ and ${IMPACT_IN}/. Do not edit.

/** The seals that have a drawing in public/seals/; the rest are drawn in code (Ornaments.jsx). */
export const SEAL_ART = new Set(${JSON.stringify(seals, null, 2).replace(/\n\s*/g, ' ')});

/** The emblems that have a drawing in public/emblems/; the rest are line glyphs (Glyph.jsx). */
export const EMBLEM_ART = new Set(${JSON.stringify(emblems, null, 2).replace(/\n\s*/g, ' ')});

/** The pieces of the seal drop in public/fx/: crack-1…N, shard-1…N and the dust cloud. */
export const IMPACT_ART = ${JSON.stringify(impact)};
`,
);
console.log(`\n${seals.length} seals, ${emblems.length} emblems, ${impact.cracks} cracks, ${impact.shards} shards, dust: ${impact.dust} → ${MANIFEST}`);
