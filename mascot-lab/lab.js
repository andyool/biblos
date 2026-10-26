import * as THREE from 'three';
import { buildLamb } from '/src/mascot/lamb.js';
import { applyPose, CHANNELS, FACE_CHANNELS } from '/src/mascot/pose.js';

// Calibration page: each cell shows the model and the reference for the same view.
// ?variant=female|male&v=0,3&size=380&mode=side|overlay|model  plus any pose channel.
const VIEWS = [
  ['01-front', 0], ['02-front-three-quarter-left', -45], ['03-front-three-quarter-right', 45],
  ['04-profile-left', -90], ['05-profile-right', 90], ['06-back', 180], ['07-rear-three-quarter', 135],
];
const q = new URLSearchParams(location.search);
const size = Number(q.get('size') || 300);
const mode = q.get('mode') || 'side';
const variants = (q.get('variant') || 'female,male').split(',');
const vs = (q.get('v') || '0,1,2,3,4,5,6').split(',').map(Number);
const crop = (q.get('crop') || '0,0,1254,1254').split(',').map(Number); // ref-pixel window
const pose = { ...CHANNELS };
for (const [k, v] of q) if (k in pose) pose[k] = Number(v);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(size * 2, size * 2);
const [cx0, cy0, cx1, cy1] = crop;
const cam = new THREE.OrthographicCamera((cx0 - 627) / 100, (cx1 - 627) / 100, (1185 - cy0) / 100, (1185 - cy1) / 100, -50, 50);
cam.position.set(0, 0, 20);
document.body.style.cssText = 'margin:0;background:#0a0f1d;display:flex;flex-wrap:wrap;gap:4px';

for (const variant of variants) {
  const lamb = buildLamb(variant);
  const face = {};
  for (const k in FACE_CHANNELS) face[k] = pose[k];
  lamb.face.draw(face);
  const scene = new THREE.Scene();
  scene.add(lamb.root);
  for (const vi of vs) {
    const [name, deg] = VIEWS[vi];
    const img = new Image();
    img.src = `./refs/${variant[0]}-${name}.png`;
    await img.decode();
    applyPose(lamb, { ...pose, yaw: pose.yaw + (deg * Math.PI) / 180 });
    lamb.root.updateMatrixWorld(true);
    renderer.render(scene, cam);
    const c = document.createElement('canvas');
    const w = mode === 'side' ? 2 : 1;
    c.width = size * w; c.height = size;
    c.style.cssText = `width:${size * w}px;height:${size}px;background:#141a2c`;
    const g = c.getContext('2d');
    const s = 600 / 1254;
    const drawRef = (x, a) => { g.globalAlpha = a; g.drawImage(img, cx0 * s, cy0 * s, (cx1 - cx0) * s, (cy1 - cy0) * s, x, 0, size, size); g.globalAlpha = 1; };
    if (mode !== 'model') drawRef(mode === 'side' ? size : 0, mode === 'overlay' ? 1 : 1);
    if (mode === 'overlay') g.globalAlpha = 0.55;
    g.drawImage(renderer.domElement, 0, 0, size, size);
    g.globalAlpha = 1;
    document.body.append(c);
  }
}
window.__ready = true;
