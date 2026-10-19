// Plays Woolly's drawings. Each clip is one sprite sheet (built by scripts/build-woolly.py):
// the drawings it uses side by side, shown in `order` at `fps`. A lamb is a plain element
// whose background steps through the sheet, so it costs no canvas and no per-frame layout.
import data from './clips.json';

const urls = import.meta.glob('./sheets/*.webp', { eager: true, query: '?url', import: 'default' });

/** Width over height of one drawing. */
export const ASPECT = data.cell[0] / data.cell[1];
/** Clips that repeat until something else happens. */
export const LOOPS = new Set(['idle', 'read', 'pray', 'listen', 'sway', 'look-around', 'spin']);

// Each sheet is fetched and decoded once, then shared by every lamb on screen.
const sheets = new Map();
export function loadClip(lamb, name) {
  const key = `${lamb}/${name}`;
  let sheet = sheets.get(key);
  if (!sheet) {
    const url = urls[`./sheets/woolly-${lamb}-${name}.webp`];
    sheet = new Promise((resolve, reject) => {
      if (!url) return reject(new Error(`Woolly has no clip ${key}`));
      const img = new Image();
      // Decoded before it's shown, so a new clip never flashes blank; but decoding can stall
      // in a page that isn't being drawn, so it gets only a moment.
      img.onload = () => Promise.race([img.decode?.().catch(() => {}), new Promise((ok) => setTimeout(ok, 120))]).then(() => resolve(img));
      img.onerror = () => reject(new Error(`Woolly's ${key} could not load`));
      img.src = url;
    });
    // Try again next time (perhaps back online).
    sheet.catch(() => sheets.delete(key));
    sheets.set(key, sheet);
  }
  return sheet;
}

// Once a lamb is showing, fetch the clips the app uses most, one at a time, while it's quiet.
const COMMON = ['nod', 'wave', 'jump', 'encourage', 'celebrate', 'sway', 'look-around', 'spin', 'turn-away-and-back'];
const warmed = new Set();
export function warm(lamb) {
  if (warmed.has(lamb) || navigator.connection?.saveData) return;
  warmed.add(lamb);
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 400));
  const next = (i) => i < COMMON.length && idle(() => loadClip(lamb, COMMON[i]).finally(() => next(i + 1)));
  setTimeout(() => next(0), 1500);
}

// One animation frame loop drives every lamb.
const running = new Set();
let raf = 0;
function tick(now) {
  raf = 0;
  for (const lamb of running) lamb.frame(now);
  if (running.size) raf = requestAnimationFrame(tick);
}

const FIDGETS = ['sway', 'look-around'];

export class Lamb {
  /**
   * @param el the element to paint
   * @param lamb 'female' or 'male'
   * @param base the loop to rest in: 'idle', 'read', 'pray' or 'listen'
   * @param still show poses without movement (reduced motion)
   */
  constructor(el, { lamb, base = 'idle', still = false }) {
    this.el = el;
    this.lamb = lamb;
    this.base = base;
    this.still = still;
    this.cur = null;
    this.seq = 0;
    this.asked = 0;
    this.url = '';
    this.cell = -1;
    this.visible = true;
    this.io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver((seen) => (this.visible = seen[seen.length - 1].isIntersecting)) : null;
    this.io?.observe(el);
    this.rest();
  }

  /** Play clips one after another, then settle back into the base loop. False if cut short. */
  async play(names) {
    const seq = ++this.seq;
    clearTimeout(this.fidget);
    for (const name of names) {
      await this.show(name, name === 'spin' ? 2 : 1);
      if (seq !== this.seq) return false;
    }
    this.rest();
    return true;
  }

  get resting() {
    return !this.cur || this.cur.cycles === Infinity;
  }

  setBase(name) {
    if (name === this.base) return;
    this.base = name;
    if (this.resting) this.rest();
  }

  rest() {
    const seq = ++this.seq;
    clearTimeout(this.fidget);
    this.show(this.base, Infinity).then((shown) => {
      // A loop that can't load (offline, say) falls back to standing about.
      if (shown === null && seq === this.seq && this.base !== 'idle') this.show('idle', Infinity);
    });
    // Now and then, while just standing about, a little sway or a look around.
    if (this.base === 'idle' && !this.still) {
      this.fidget = setTimeout(() => seq === this.seq && this.visible && !document.hidden && this.play([FIDGETS[Math.floor(Math.random() * FIDGETS.length)]]), 7000 + Math.random() * 9000);
    }
  }

  // Show one clip `cycles` times. Resolves true once it has played, false if something else
  // was asked for first, and null if it can't be shown at all.
  async show(name, cycles) {
    const def = data.clips[this.lamb]?.[name];
    if (!def || this.dead) return null;
    const ask = ++this.asked;
    let img;
    try {
      img = await loadClip(this.lamb, name);
    } catch {
      return ask === this.asked ? null : false;
    }
    // The latest request wins, whichever sheet arrives first.
    if (this.dead || ask !== this.asked) return false;
    this.cur?.done(false);
    clearTimeout(this.hold);
    return new Promise((done) => {
      this.cur = { def, url: img.src, start: performance.now(), cycles, done };
      const length = def.order.length;
      if (this.still) {
        // A held pose instead of movement: the middle drawing of a one-off clip, for as long as it lasts.
        this.paint(def.order[cycles === Infinity ? 0 : Math.floor(length / 2)]);
        if (cycles !== Infinity) this.hold = setTimeout(() => this.finish(), (length / def.fps) * 1000);
        return;
      }
      this.paint(def.order[0]);
      running.add(this);
      raf ||= requestAnimationFrame(tick);
    });
  }

  finish() {
    const cur = this.cur;
    this.cur = null;
    running.delete(this);
    cur?.done(true);
  }

  frame(now) {
    const cur = this.cur;
    if (!cur) return running.delete(this);
    const { order, fps } = cur.def;
    const i = Math.floor(((now - cur.start) / 1000) * fps);
    if (i >= order.length * cur.cycles) return this.finish();
    if (this.visible) this.paint(order[i % order.length]);
  }

  paint(cell) {
    const { def, url } = this.cur;
    const s = this.el.style;
    if (url !== this.url) {
      this.url = url;
      this.cell = -1;
      s.backgroundImage = `url("${url}")`;
      s.backgroundSize = `${def.cells * 100}% 100%`;
    }
    if (cell === this.cell) return;
    this.cell = cell;
    s.backgroundPosition = `${def.cells > 1 ? (cell / (def.cells - 1)) * 100 : 0}% 0`;
  }

  destroy() {
    this.dead = true;
    this.seq++;
    clearTimeout(this.fidget);
    clearTimeout(this.hold);
    running.delete(this);
    this.io?.disconnect();
    this.cur?.done(false);
    this.cur = null;
  }
}
