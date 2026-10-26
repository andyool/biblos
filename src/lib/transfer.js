import { getState } from './store.js';
import { allTexts } from './texts.js';
import { checkBackup } from './device.js';
import { restoreBackup } from './actions.js';

// Moving progress to another copy of Biblos, with no account: the Home Screen app on iPhone
// (which keeps its own progress, apart from Safari), or another phone. The progress becomes a
// code to copy and paste, or to send by AirDrop or Messages.

const CODE = /BIBLOS1\.([zj])\.([A-Za-z0-9_-]+)/;

// Settings that belong to the phone rather than the person: each phone keeps its own.
const PER_PHONE = ['yvKey', 'nivUnlocked', 'talentsUnlocked', 'installDismissed'];

const compresses = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

function toBase64Url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const fromBase64Url = (text) => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

const through = async (data, stream) => new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(stream)).arrayBuffer());

/** Does this text hold a transfer code (copied whole or not)? */
export const hasCode = (text) => CODE.test(String(text || '')) || CODE.test(String(text || '').replace(/\s+/g, ''));

/**
 * This phone's progress as a code. Bible words that load again by themselves are left out, to
 * keep it short; words pasted by hand and NIV words come with it.
 */
export async function makeCode() {
  const state = getState();
  const settings = { ...state.settings };
  for (const key of PER_PHONE) delete settings[key];
  const texts = Object.fromEntries(Object.entries(allTexts()).filter(([, entry]) => entry?.src !== 'bolls'));
  const json = JSON.stringify({ app: 'biblos', kind: 'transfer', exported: new Date().toISOString(), state: { ...state, settings }, texts });
  const bytes = new TextEncoder().encode(json);
  return compresses() ? `BIBLOS1.z.${toBase64Url(await through(bytes, new CompressionStream('deflate')))}` : `BIBLOS1.j.${toBase64Url(bytes)}`;
}

/** The progress in a code, checked and ready to bring in. Throws with a message to show. */
export async function readCode(text) {
  const raw = String(text || '');
  const match = raw.match(CODE) || raw.replace(/\s+/g, '').match(CODE);
  if (!match) throw new Error('That isn’t a Biblos transfer code. Copy the whole code and try again.');
  const [, kind, body] = match;
  if (kind === 'z' && !compresses()) throw new Error('This phone can’t read that code. Update it, then try again.');
  let data;
  try {
    const bytes = fromBase64Url(body);
    data = JSON.parse(new TextDecoder().decode(kind === 'z' ? await through(bytes, new DecompressionStream('deflate')) : bytes));
  } catch {
    throw new Error('Part of that code is missing. Copy all of it and try again.');
  }
  return checkBackup(data, new Error('That isn’t a Biblos transfer code. Copy the whole code and try again.'));
}

/** Replace this phone's progress with a code's, keeping the settings that belong to this phone. */
export function bringIn(data) {
  const here = getState().settings;
  const settings = { ...data.state.settings };
  for (const key of PER_PHONE) settings[key] = here[key];
  restoreBackup({ ...data, state: { ...data.state, settings } }, { transfer: true });
}
