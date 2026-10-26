// The lamb's face is drawn flat, in the style of the reference art, and wrapped onto the
// head. Shapes are authored in front-view coordinates measured from 01-front.png (head
// centre at the origin, 1 unit = 100 reference pixels, y up), then projected onto the
// head surface and stored by yaw/pitch so the head shader can look them up from any angle.
import * as THREE from 'three';

const SIZE = 512;
const RANGE = Math.PI * 0.8; // yaw and pitch covered by the texture (±72°)

const C = {
  white: '#fffaf0',
  iris: '#46240c',
  iris2: '#a9652a',
  pupil: '#241005',
  lid: '#3e1f0b',
  lower: '#9b5f20',
  socket: '#f6cf83',
  brow: '#8f5622',
  nose: '#c98a45',
  nose2: '#a7611f',
  mouth: '#8f5622',
  inside: '#5b2a10',
  tongue: '#e39a6c',
  skin: '#fcebc8',
  blush: '#f3b07a',
};

// Measured shapes (viewer-left eye / brow; the other side is mirrored).
const DESIGN = {
  female: {
    eye: [[-1.65, -0.25], [-1.22, -0.07], [-0.79, -0.15], [-0.64, -0.5], [-0.69, -0.92], [-1.12, -0.98], [-1.52, -0.7]],
    iris: [-0.99, -0.52, 0.37],
    wing: true,
    brow: [[-1.49, 0.1, 0.012], [-1.27, 0.3, 0.06], [-1.02, 0.4, 0.095], [-0.8, 0.34, 0.1]],
  },
  male: {
    eye: [[-1.58, -0.36], [-1.14, -0.07], [-0.77, -0.17], [-0.64, -0.55], [-0.71, -0.95], [-1.16, -1.01], [-1.49, -0.76]],
    iris: [-0.99, -0.5, 0.39],
    wing: false,
    brow: [[-1.53, 0.13, 0.035], [-1.22, 0.3, 0.115], [-0.97, 0.36, 0.13], [-0.77, 0.34, 0.13]],
  },
};

const lerp = (a, b, t) => a + (b - a) * t;
const lerp2 = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];

// Centripetal-ish Catmull-Rom through points; closed or open.
function spline(pts, n = 12, closed = false) {
  const out = [];
  const N = pts.length;
  const get = (i) => (closed ? pts[(i + N) % N] : pts[Math.max(0, Math.min(N - 1, i))]);
  const segs = closed ? N : N - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  if (!closed) out.push(pts[N - 1]);
  return out;
}

// Turn a centre line with per-point half-widths into a filled outline.
function ribbon(line, widths) {
  const left = [], right = [];
  for (let i = 0; i < line.length; i++) {
    const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l; dy /= l;
    const w = widths[i];
    left.push([line[i][0] - dy * w, line[i][1] + dx * w]);
    right.push([line[i][0] + dy * w, line[i][1] - dx * w]);
  }
  return left.concat(right.reverse());
}

function resample(fn, n) {
  return Array.from({ length: n }, (_, i) => fn(i / (n - 1)));
}

export function createFace(variant, headSdf) {
  const design = DESIGN[variant];
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.anisotropy = 4;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;

  // Front-view point -> canvas pixel, via the point on the head surface behind it.
  const cache = new Map();
  function project([x, y]) {
    const key = `${Math.round(x * 400)},${Math.round(y * 400)}`;
    let hit = cache.get(key);
    if (!hit) {
      let z;
      if (headSdf(x, y, 0) < 0) {
        let lo = 0, hi = 4;
        for (let k = 0; k < 24; k++) {
          const m = (lo + hi) / 2;
          if (headSdf(x, y, m) < 0) lo = m; else hi = m;
        }
        z = lo;
      } else z = 0;
      const yaw = Math.atan2(x, z);
      const pitch = Math.atan2(y, Math.hypot(x, z));
      hit = [(yaw / RANGE + 0.5) * SIZE, (0.5 - pitch / RANGE) * SIZE];
      cache.set(key, hit);
    }
    return hit;
  }
  function path(pts) {
    ctx.beginPath();
    pts.forEach((p, i) => {
      const [X, Y] = project(p);
      if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
    });
    ctx.closePath();
  }
  function fill(pts, color) {
    path(pts);
    ctx.fillStyle = color;
    ctx.fill();
  }
  const circle = (cx, cy, rx, ry = rx, n = 40) => resample((t) => [cx + Math.cos(t * Math.PI * 2) * rx, cy + Math.sin(t * Math.PI * 2) * ry], n);
  const mirror = (pts, s) => (s < 0 ? pts : pts.map(([x, y]) => [-x, y]));

  function eye(side, e) {
    const m = (p) => (side < 0 ? p : [-p[0], p[1]]);
    const scale = 1 + e.wide * 0.12;
    const raw = design.eye;
    const cx = raw.reduce((s, p) => s + p[0], 0) / raw.length;
    const cy = raw.reduce((s, p) => s + p[1], 0) / raw.length;
    const k = raw.map(([x, y]) => [cx + (x - cx) * scale, cy + (y - cy) * scale]);
    const outline = spline(k, 10, true).map(m);
    // Upper contour runs outer corner -> inner corner; the closed lid is a gentle smile-curve.
    const top = spline(k.slice(0, 5), 8).map(m);
    const corner0 = k[0], corner1 = k[4];
    const sag = lerp(0.14, -0.1, e.happy);
    const closed = resample((t) => {
      const p = lerp2(corner0, corner1, t);
      return m([p[0], p[1] - Math.sin(t * Math.PI) * sag - 0.12 * t]);
    }, top.length);
    const lidT = Math.min(1, Math.max(0, e.blink));
    const lidEdge = top.map((p, i) => lerp2(p, closed[i], lidT));

    // Soft gold socket that hugs the top of the eye.
    fill(spline(k.map(([x, y]) => [cx + (x - cx) * 1.13, cy + 0.05 + (y - cy) * 1.12]), 10, true).map(m), C.socket);

    if (lidT < 0.97) {
      ctx.save();
      path(outline);
      ctx.clip();
      fill(outline, C.white);
      const [ix, iy, ir] = design.iris;
      const lx = e.lookX * 0.2 * (side < 0 ? 1 : 1), ly = e.lookY * 0.14;
      const icx = (side < 0 ? ix : -ix) + lx, icy = iy + ly;
      const pr = ir * (0.62 - e.wide * 0.1);
      fill(circle(icx, icy, ir), C.iris);
      fill(circle(icx + 0.1 * (side < 0 ? 1 : -1), icy - 0.13, ir * 0.62, ir * 0.42), C.iris2);
      fill(circle(icx, icy, ir * 0.82), C.iris);
      fill(circle(icx + 0.03 * (side < 0 ? 1 : -1), icy - 0.01, pr), C.pupil);
      fill(circle(icx + 0.05 * (side < 0 ? 1 : -1), icy + 0.13, ir * 0.2), C.white);
      // Eyelid skin coming down, and the lower lid rising when squinting.
      const lid = lidEdge.concat([[lidEdge[lidEdge.length - 1][0], 2], [lidEdge[0][0], 2]]);
      fill(lid, C.skin);
      if (e.squint > 0.01) {
        const bottom = spline(k.slice(4).concat([k[0]]), 8).map(m);
        const mid = bottom.map(([x, y]) => [x, lerp(y, cy - 0.05, e.squint * 0.75)]);
        fill(mid.concat([[mid[mid.length - 1][0], -3], [mid[0][0], -3]]), C.skin);
      }
      ctx.restore();
      // Lower lid line.
      const bottom = spline(k.slice(4).concat([k[0]]), 8).slice(2, -4).map(m);
      fill(ribbon(bottom, bottom.map((_, i) => 0.018 * Math.sin((i / (bottom.length - 1)) * Math.PI) + 0.004)), C.lower);
    }
    // Upper lid line (and the female's lash wing).
    const n = lidEdge.length;
    const w = lidEdge.map((_, i) => {
      const t = i / (n - 1);
      return lerp(0.05, 0.022, t) * (design.wing ? 1.1 : 1) * Math.min(1, (t + 0.08) * 6);
    });
    let line = lidEdge;
    if (design.wing) {
      const tip = m([corner0[0] - 0.1, corner0[1] + 0.12 - lidT * 0.12]);
      line = [lerp2(tip, lidEdge[0], 0.0), ...lidEdge];
      w.unshift(0.004);
    }
    fill(ribbon(line, w), C.lid);
  }

  function happyEye(side, e) {
    const raw = design.eye;
    const cx = raw.reduce((s, p) => s + p[0], 0) / raw.length;
    const cy = raw.reduce((s, p) => s + p[1], 0) / raw.length - 0.08;
    const line = resample((t) => {
      const a = Math.PI * (0.12 + 0.76 * t);
      return [cx - Math.cos(a) * 0.4, cy + Math.sin(a) * 0.24];
    }, 24).map((p) => (side < 0 ? p : [-p[0], p[1]]));
    fill(ribbon(line, line.map((_, i) => 0.05 * Math.sin((i / 23) * Math.PI) + 0.012)), C.lid);
  }

  function brow(side, e) {
    const pts = design.brow;
    const mid = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const moved = pts.map(([x, y, w]) => {
      const t = (x - mid) / 0.7; // -0.5 outer .. +0.5 inner (for the viewer-left brow)
      return [x, y + e.browRaise * 0.14 + e.browTilt * t * 0.22 - e.happy * 0.02, w];
    });
    const line = spline(moved.map(([x, y]) => [x, y]), 8);
    const widths = spline(moved.map(([, , w]) => [w, 0]), 8).map(([w]) => w);
    fill(mirror(ribbon(line, widths), side), C.brow);
  }

  function nose() {
    const shape = [[-0.29, -1.08], [0, -1.04], [0.3, -1.08], [0.27, -1.17], [0.06, -1.29], [0, -1.31], [-0.06, -1.29], [-0.27, -1.17]];
    const out = spline(shape, 8, true);
    fill(out, C.nose);
    ctx.save();
    path(out);
    ctx.clip();
    fill(circle(0, -1.27, 0.2, 0.12), C.nose2);
    ctx.restore();
  }

  function mouth(e) {
    const w = 0.47 * e.mouthW;
    const yC = -1.4 + 0.06 * e.smile;
    const yU = -1.49 - 0.035 * e.smile;
    const open = Math.max(0, e.open);
    const upper = spline([[-w, yC], [-w * 0.5, lerp(yC, yU, 0.75)], [0, yU], [w * 0.5, lerp(yC, yU, 0.75)], [w, yC]], 8);
    // Philtrum from the nose.
    fill(ribbon([[0, -1.3], [0, yU + 0.01]], [0.016, 0.016]), C.mouth);
    if (open > 0.03) {
      const yL = yU - open * 0.42 * (e.smile >= 0 ? 1 : 0.7);
      const lower = spline([[w, yC], [w * 0.55, lerp(yC, yL, 0.85)], [0, yL], [-w * 0.55, lerp(yC, yL, 0.85)], [-w, yC]], 8);
      const inside = upper.concat(lower);
      fill(inside, C.inside);
      ctx.save();
      path(inside);
      ctx.clip();
      fill(circle(0, yL + 0.02, w * 0.55, open * 0.2 + 0.03), C.tongue);
      ctx.restore();
      fill(ribbon(inside.concat([inside[0]]), inside.concat([0]).map(() => 0.022)), C.mouth);
    } else {
      fill(ribbon(upper, upper.map((_, i) => 0.02 + 0.008 * Math.sin((i / (upper.length - 1)) * Math.PI))), C.mouth);
      // Little upturned corners, like the reference smile.
      if (e.smile > 0.2) for (const s of [-1, 1]) {
        const a = [s * w, yC], b = [s * (w + 0.06), yC + 0.04 * e.smile];
        fill(ribbon([a, b], [0.016, 0.008]), C.mouth);
      }
    }
  }

  function blush(e) {
    if (e.blush < 0.02) return;
    ctx.globalAlpha = e.blush * 0.45;
    for (const s of [-1, 1]) fill(circle(s * 1.35, -1.1, 0.3, 0.17), C.blush);
    ctx.globalAlpha = 1;
  }

  let last = '';
  function draw(e) {
    const key = Object.values(e).map((v) => v.toFixed(2)).join('|');
    if (key === last) return false;
    last = key;
    ctx.clearRect(0, 0, SIZE, SIZE);
    blush(e);
    for (const s of [-1, 1]) {
      if (e.happy < 0.5) eye(s, e); else happyEye(s, e);
      brow(s, e);
    }
    nose();
    mouth(e);
    texture.needsUpdate = true;
    return true;
  }

  return { texture, draw, canvas };
}

export const NEUTRAL_FACE = {
  blink: 0, lookX: 0, lookY: 0, smile: 1, open: 0, mouthW: 1, browRaise: 0, browTilt: 0, happy: 0, squint: 0, wide: 0, blush: 0,
};
