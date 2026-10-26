// Signed distance helpers used to sculpt the lamb's soft shapes, and a mesher that
// turns a star-shaped SDF (every ray from its centre crosses the surface once) into a
// smooth sphere-topology mesh with exact normals.
import * as THREE from 'three';

export const smin = (a, b, k) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};

export const ellipsoid = ([cx, cy, cz], [rx, ry, rz]) => (x, y, z) => {
  const px = (x - cx) / rx, py = (y - cy) / ry, pz = (z - cz) / rz;
  const k0 = Math.hypot(px, py, pz);
  const k1 = Math.hypot(px / rx, py / ry, pz / rz);
  return k1 === 0 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
};

export const sphere = ([cx, cy, cz], r) => (x, y, z) => Math.hypot(x - cx, y - cy, z - cz) - r;

// Capsule whose radius blends from ra at a to rb at b.
export const roundCone = ([ax, ay, az], [bx, by, bz], ra, rb) => (x, y, z) => {
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  const L2 = dx * dx + dy * dy + dz * dz;
  const px = x - ax, py = y - ay, pz = z - az;
  const t = Math.min(1, Math.max(0, (px * dx + py * dy + pz * dz) / L2));
  const qx = px - dx * t, qy = py - dy * t, qz = pz - dz * t;
  return Math.hypot(qx, qy, qz) - (ra + (rb - ra) * t);
};

export const unionSmooth = (k, ...fs) => (x, y, z) => {
  let d = fs[0](x, y, z);
  for (let i = 1; i < fs.length; i++) d = smin(d, fs[i](x, y, z), k);
  return d;
};

// Mesh a star-shaped SDF around `center`. Vertex positions are relative to center.
export function radialGeometry(sdf, center = [0, 0, 0], { w = 64, h = 48, rMax = 8 } = {}) {
  const geo = new THREE.SphereGeometry(1, w, h);
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const [cx, cy, cz] = center;
  const e = 1e-3;
  for (let i = 0; i < pos.count; i++) {
    let dx = pos.getX(i), dy = pos.getY(i), dz = pos.getZ(i);
    const l = Math.hypot(dx, dy, dz) || 1;
    dx /= l; dy /= l; dz /= l;
    let lo = 0, hi = rMax;
    for (let k = 0; k < 34; k++) {
      const m = (lo + hi) / 2;
      if (sdf(cx + dx * m, cy + dy * m, cz + dz * m) < 0) lo = m; else hi = m;
    }
    const x = cx + dx * lo, y = cy + dy * lo, z = cz + dz * lo;
    const gx = sdf(x + e, y, z) - sdf(x - e, y, z);
    const gy = sdf(x, y + e, z) - sdf(x, y - e, z);
    const gz = sdf(x, y, z + e) - sdf(x, y, z - e);
    const gl = Math.hypot(gx, gy, gz) || 1;
    pos.setXYZ(i, x - cx, y - cy, z - cz);
    nor.setXYZ(i, gx / gl, gy / gl, gz / gl);
  }
  geo.deleteAttribute('uv');
  geo.computeBoundingSphere();
  return geo;
}

// Merge several geometries that share the same attributes into one.
export function mergeGeometries(list) {
  let count = 0, icount = 0;
  for (const g of list) { count += g.attributes.position.count; icount += g.index ? g.index.count : g.attributes.position.count; }
  const names = Object.keys(list[0].attributes);
  const out = new THREE.BufferGeometry();
  const index = new Uint32Array(icount);
  const arrays = {};
  for (const n of names) arrays[n] = new Float32Array(count * list[0].attributes[n].itemSize);
  let vo = 0, io = 0;
  for (const g of list) {
    for (const n of names) arrays[n].set(g.attributes[n].array, vo * g.attributes[n].itemSize);
    const idx = g.index ? g.index.array : [...Array(g.attributes.position.count).keys()];
    for (let i = 0; i < idx.length; i++) index[io + i] = idx[i] + vo;
    vo += g.attributes.position.count;
    io += idx.length;
  }
  for (const n of names) out.setAttribute(n, new THREE.BufferAttribute(arrays[n], list[0].attributes[n].itemSize));
  out.setIndex(new THREE.BufferAttribute(index, 1));
  out.computeBoundingSphere();
  return out;
}
