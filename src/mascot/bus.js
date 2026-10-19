// What the app tells Woolly. Kept tiny so any module can import it cheaply.
// cue('wrong'), cue('pass', { perfect: true }), cue('purchase') …
const lambs = new Set();
const cameos = new Set();

/**
 * Lambs on screen answer first (each returns true if it reacted where it can be seen).
 * When none did, Woolly may pop in from the side instead (see WoollyCameo).
 */
export function cue(name, data = {}) {
  let seen = false;
  for (const l of lambs) if (l(name, data)) seen = true;
  if (!seen) for (const l of cameos) l(name, data);
}

/** For a cue sent as a sheet closes: wait until it has gone, so a lamb that stays answers. */
export const cueSoon = (name, data) => setTimeout(() => cue(name, data), 380);

export function onCue(fn, { cameo = false } = {}) {
  const set = cameo ? cameos : lambs;
  set.add(fn);
  return () => set.delete(fn);
}
