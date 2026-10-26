// One WebGL renderer for every lamb on screen. Each <Mascot> owns a plain 2D canvas; the
// engine animates its lamb, renders it off-screen and copies the frame across, so the app
// never holds more than one WebGL context however many lambs are showing.
import * as THREE from 'three';
import { buildLamb } from './lamb.js';
import { Animator } from './animator.js';

// What part of the lamb a canvas shows: centre height and visible height, in lamb units.
const FRAMING = {
  full: { cy: 6.4, h: 14.2 },
  bust: { cy: 8.3, h: 8.2 },
  face: { cy: 8.8, h: 6 },
};

let renderer = null;
const pool = { female: [], male: [] };
const live = new Set();
let raf = 0;
let last = 0;

function getRenderer() {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(1);
    renderer.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault());
  }
  return renderer;
}

function frame(now) {
  raf = 0;
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
  last = now;
  const shown = [...live].filter((i) => i.visible && i.canvas.width > 0);
  if (!shown.length) {
    last = 0;
    return;
  }
  const r = getRenderer();
  const W = Math.max(...shown.map((i) => i.canvas.width));
  const H = Math.max(...shown.map((i) => i.canvas.height));
  const size = r.getSize(new THREE.Vector2());
  if (size.x < W || size.y < H) r.setSize(Math.max(W, size.x), Math.max(H, size.y), false);
  const RH = r.domElement.height;
  for (const inst of shown) {
    inst.anim.update(dt);
    const { width: w, height: h } = inst.canvas;
    const f = FRAMING[inst.framing] || FRAMING.full;
    const aspect = w / h;
    const cam = inst.cam;
    cam.top = f.cy + f.h / 2;
    cam.bottom = f.cy - f.h / 2;
    cam.left = (-f.h * aspect) / 2;
    cam.right = (f.h * aspect) / 2;
    cam.updateProjectionMatrix();
    r.setViewport(0, 0, w, h);
    r.setScissor(0, 0, w, h);
    r.setScissorTest(true);
    r.clear();
    r.render(inst.scene, cam);
    inst.ctx.clearRect(0, 0, w, h);
    inst.ctx.drawImage(r.domElement, 0, RH - h, w, h, 0, 0, w, h);
  }
  raf = requestAnimationFrame(frame);
}

function wake() {
  if (!raf) raf = requestAnimationFrame(frame);
}

export function mount(canvas, { variant = 'female', framing = 'full', base = 'idle', reduced = false } = {}) {
  const lamb = pool[variant]?.pop() || buildLamb(variant);
  const scene = new THREE.Scene();
  scene.add(lamb.root);
  const anim = new Animator(lamb, { reducedMotion: reduced });
  anim.setBase(base);
  anim.base.mix = 1;
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -50, 50);
  cam.position.set(0, 0, 20);
  const inst = { canvas, ctx: canvas.getContext('2d'), lamb, scene, anim, cam, framing, visible: true, variant };
  const io = typeof IntersectionObserver !== 'undefined'
    ? new IntersectionObserver(([e]) => {
      inst.visible = e.isIntersecting;
      if (inst.visible) wake();
    })
    : null;
  io?.observe(canvas);
  live.add(inst);
  wake();
  return {
    play: (name, opts) => {
      wake();
      return anim.play(name, opts);
    },
    setBase: (name) => anim.setBase(name),
    lookAt: (yaw, pitch) => anim.lookAt(yaw, pitch),
    get busy() {
      return anim.busy;
    },
    get base() {
      return anim.baseName;
    },
    setFraming: (f) => {
      inst.framing = f;
    },
    destroy: () => {
      io?.disconnect();
      live.delete(inst);
      scene.remove(lamb.root);
      pool[variant]?.push(lamb);
    },
  };
}

// Build the lambs ahead of time (e.g. while the welcome screen is showing).
export function warm(variant) {
  if (!pool[variant].length) pool[variant].push(buildLamb(variant));
}
