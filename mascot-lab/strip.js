import * as THREE from 'three';
import { buildLamb } from '/src/mascot/lamb.js';
import { Animator } from '/src/mascot/animator.js';
import { CLIPS, BASES } from '/src/mascot/clips.js';

// Filmstrips: ?clips=hop,cheer&n=8&variant=female&base=idle&size=120
const q = new URLSearchParams(location.search);
const size = Number(q.get('size') || 120);
const n = Number(q.get('n') || 8);
const variant = q.get('variant') || 'female';
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(size * 2, size * 2);
const zoom = Number(q.get('zoom') || 1);
const cam = new THREE.OrthographicCamera(-6.5 / zoom, 6.5 / zoom, 6.2 + 7 / zoom, 6.2 - 7 / zoom, -50, 50);
cam.position.set(0, 0, 20);
document.body.style.cssText = 'margin:0;background:#141a2c;font:10px system-ui;color:#aaa';
for (const clip of (q.get('clips') || 'wave').split(',')) {
  const lamb = buildLamb(variant);
  const scene = new THREE.Scene();
  scene.add(lamb.root);
  const anim = new Animator(lamb);
  anim.nextBlink = anim.nextGlance = anim.nextFidget = 1e9;
  if (q.get('base')) anim.setBase(q.get('base'));
  for (let i = 0; i < 60; i++) anim.update(1 / 60);
  const duration = (CLIPS[clip] || BASES[clip]).duration;
  if (CLIPS[clip]) anim.play(clip); else anim.setBase(clip);
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:2px;margin-bottom:2px';
  document.body.append(row);
  let t = 0;
  const end = BASES[clip] ? duration + 0.6 : duration;
  for (let i = 0; i < n; i++) {
    const target = (end * i) / (n - 1);
    while (t < target - 1e-6) { const d = Math.min(1 / 60, target - t); anim.update(d); t += d; }
    lamb.root.updateMatrixWorld(true);
    renderer.render(scene, cam);
    const c = document.createElement('canvas');
    c.width = c.height = size;
    c.style.cssText = `width:${size}px;height:${size}px;background:#1b2238`;
    const g = c.getContext('2d');
    g.drawImage(renderer.domElement, 0, 0, size, size);
    g.fillStyle = '#9aa'; g.fillText(`${i ? '' : clip + ' '}${target.toFixed(2)}`, 3, 10);
    row.append(c);
  }
}
window.__ready = true;
