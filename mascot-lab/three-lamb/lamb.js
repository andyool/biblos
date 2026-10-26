// Builds one golden lamb (female or male) as a rigged 3D figure. Proportions are measured
// from the seven reference views: front (01) for widths and heights, profiles (04/05) for
// depth, back (06) and rear three-quarter (07) for the fleece behind. Units are reference
// pixels / 100 with the ground at y = 0 and the lamb facing +z.
import * as THREE from 'three';
import { ellipsoid, roundCone, sphere, unionSmooth, radialGeometry, mergeGeometries, smin } from './sdf.js';
import { toon } from './materials.js';
import { createFace } from './face.js';

const PAL = {
  cream: '#fcebc8',
  gold: '#f1c571',
  deep: '#e2a94e',
  hoof: '#a7692b',
  hoofDark: '#8a5221',
  hoofCleft: '#5a3212',
  inner: '#b66d25',
  inner2: '#e3a74b',
};

// Per-variant measurements. The male is a little broader with a simpler forelock.
const SPEC = {
  female: { headW: 1.95, torsoW: 1.0, curl: 1.0, curlTurns: 1.15, ear: 1.0 },
  male: { headW: 2.02, torsoW: 1.05, curl: 0.86, curlTurns: 0.85, ear: 0.97 },
};

const HEAD = [0, 8.75, 0.3];

function headSdfFor(spec) {
  const w = spec.headW;
  const cranium = ellipsoid([0, 0.05, 0], [w, 2.0, 1.8]);
  const muzzle = ellipsoid([0, -1.08, 1.1], [0.95, 0.72, 1.1]);
  const jaw = [
    [-1.82, -0.65, 0.1, 0.42], [-1.68, -1.35, 0.15, 0.42], [-1.28, -1.8, 0.25, 0.42], [-0.68, -2.0, 0.35, 0.42],
    [0, -2.06, 0.4, 0.42], [0.68, -2.0, 0.35, 0.42], [1.28, -1.8, 0.25, 0.42], [1.68, -1.35, 0.15, 0.42], [1.82, -0.65, 0.1, 0.42],
  ].map(([x, y, z, r]) => sphere([x * (w / 1.95), y, z], r));
  const base = unionSmooth(0.45, cranium, muzzle);
  return (x, y, z) => {
    let d = base(x, y, z);
    for (const j of jaw) d = smin(d, j(x, y, z), 0.12);
    return d;
  };
}

function torsoSdfFor(spec) {
  const k = spec.torsoW;
  return unionSmooth(
    0.9,
    ellipsoid([0, 5.45, 0.38], [1.28 * k, 1.25, 1.3]),
    ellipsoid([0, 3.1, 0.0], [1.75 * k, 1.4, 1.58]),
    roundCone([0, 5.9, 0.3], [0, 7.4, 0.32], 0.88 * k, 0.8 * k),
  );
}

// Fleece puffs: [x, y, z, r, squash]
function headPuffs(spec) {
  const w = spec.headW / 1.95;
  const list = [
    // Crown and temples, read off the front silhouette.
    [0.25, 1.85, 0.25, 0.78], [-1.05, 1.62, 0.25, 0.62], [-1.75, 0.95, 0.05, 0.56], [1.55, 1.4, 0.15, 0.58], [2.05, 0.72, -0.1, 0.48],
    [-0.4, 1.95, -0.35, 0.66], [0.95, 1.85, -0.4, 0.62], [-1.95, 0.25, -0.35, 0.45], [2.0, 0.05, -0.35, 0.45],
  ];
  // Cover the back of the head with a shell of puffs (06-back shows a full cloud).
  const n = 30;
  for (let i = 0; i < n; i++) {
    const yy = 1 - (i + 0.5) / n * 2;
    const r = Math.sqrt(1 - yy * yy);
    const th = i * 2.399963;
    const d = [Math.cos(th) * r, yy, Math.sin(th) * r];
    if (d[2] > -0.05 || d[1] < -0.62) continue;
    list.push([d[0] * 1.7 * w, d[1] * 1.75 + 0.15, d[2] * 1.55 - 0.05, 0.78 - Math.max(0, -d[1]) * 0.15]);
  }
  return list.map(([x, y, z, r, s]) => [x * (x === undefined ? 1 : 1), y, z, r, s]);
}

function puffGeometry(puffs, seg = [20, 14]) {
  const base = new THREE.SphereGeometry(1, seg[0], seg[1]);
  base.deleteAttribute('uv');
  const m = new THREE.Matrix4();
  return mergeGeometries(puffs.map(([x, y, z, r, s = 1]) => {
    const g = base.clone();
    m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(r, r * s, r));
    g.applyMatrix4(m);
    return g;
  }));
}

// One soft cloud with a scalloped edge: puffs smooth-unioned into a single surface, so
// only the outer scallops get gold borders (like the chest bib and belly in 01-front).
function cloudGeometry(puffs) {
  const fs = puffs.map(([x, y, z, r]) => sphere([x, y, z], r));
  const sdf = (x, y, z) => {
    let d = fs[0](x, y, z);
    for (let i = 1; i < fs.length; i++) d = smin(d, fs[i](x, y, z), 0.22);
    return d;
  };
  const n = puffs.length;
  const c = puffs.reduce((a, p) => [a[0] + p[0] / n, a[1] + p[1] / n, a[2] + p[2] / n], [0, 0, 0]);
  const g = radialGeometry(sdf, c, { w: 64, h: 48 });
  g.translate(...c);
  return g;
}

// Put puffs on the front of a surface: for each (x, y) find the surface z and sink the
// puff into it so only a soft dome stands proud.
function frontPuffs(sdf, list, sink = 0.55) {
  return list.map(([x, y, r, s = 1]) => {
    let lo = -1, hi = 4;
    for (let k = 0; k < 26; k++) {
      const m = (lo + hi) / 2;
      if (sdf(x, y, m) < 0) lo = m; else hi = m;
    }
    return [x, y, lo - r * sink, r, s];
  });
}

// A spiral lock of wool (the forelock curl), as a tapering tube.
function curlGeometry(spec) {
  const turns = spec.curlTurns;
  const pts = [];
  const N = 60;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const a = Math.PI * 0.25 + t * Math.PI * 2 * turns;
    const R = 0.78 * spec.curl * (1 - t * 0.78);
    pts.push(new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, -t * 0.08));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const tube = new THREE.TubeGeometry(curve, 90, 1, 14, false);
  // Taper the tube radius along its length.
  const pos = tube.attributes.position, nor = tube.attributes.normal;
  const radial = 15;
  for (let i = 0; i <= 90; i++) {
    const t = i / 90;
    const c = curve.getPointAt(t);
    const r = (0.3 * (1 - t) + 0.08) * spec.curl;
    for (let j = 0; j < radial; j++) {
      const k = i * radial + j;
      pos.setXYZ(k, c.x + nor.getX(k) * r, c.y + nor.getY(k) * r, c.z + nor.getZ(k) * r * 0.8);
    }
  }
  tube.deleteAttribute('uv');
  tube.computeVertexNormals();
  return tube;
}

// A capsule along -y, skinned between two bones that meet at `joint` (distance from top).
function limbGeometry(length, r0, r1, joint, { segs = 28, radial = 16 } = {}) {
  const geo = new THREE.CylinderGeometry(1, 1, 1, radial, segs, true);
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const idx = [], wts = [];
  for (let i = 0; i < pos.count; i++) {
    const t = 0.5 - pos.getY(i); // 0 at top .. 1 at bottom
    const r = r0 + (r1 - r0) * t;
    const y = -t * length;
    pos.setXYZ(i, pos.getX(i) * r, y, pos.getZ(i) * r);
    nor.setXYZ(i, pos.getX(i) / r, 0, pos.getZ(i) / r);
    const d = (-y - joint) / 0.35;
    const w = Math.min(1, Math.max(0, 0.5 + d * 0.5));
    const s = w * w * (3 - 2 * w);
    idx.push(0, 1, 0, 0);
    wts.push(1 - s, s, 0, 0);
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(wts, 4));
  geo.deleteAttribute('uv');
  // Close the ends with spheres so nothing looks hollow.
  return geo;
}

// Drooping leaf ear: a thin cupped shell, inner face (aSide = 1) toward +z, hanging along -y.
function earGeometry(scale) {
  const L = 3.5 * scale, W = 0.82 * scale;
  const nu = 28, nv = 18;
  const P = [], N = [], UV = [], S = [], SI = [], SW = [], I = [];
  const width = (u) => W * (0.38 + 0.62 * Math.sin(Math.PI * Math.min(1, u ** 1.35 * 0.98))) * Math.sqrt(Math.max(0, 1 - u ** 4));
  const cup = (u, v) => -0.16 * scale * (1 - v * v) * Math.sin(Math.PI * Math.min(1, u * 1.1));
  const thick = (u, v) => 0.09 * scale * Math.sqrt(Math.max(0, 1 - v * v)) * (1 - u ** 4) + 0.004;
  for (const side of [1, 0]) {
    for (let i = 0; i <= nu; i++) {
      const u = i / nu;
      for (let j = 0; j <= nv; j++) {
        const v = (j / nv) * 2 - 1;
        const x = v * width(u);
        const y = -u * L;
        const z = cup(u, v) + (side ? 1 : -1) * thick(u, v);
        P.push(x, y, z);
        N.push(0, 0, side ? 1 : -1);
        UV.push(u, v);
        S.push(side);
        const b = u * 2.6;
        const i0 = Math.min(2, Math.floor(b)), f = Math.min(1, b - i0);
        if (i0 >= 2) { SI.push(2, 2, 0, 0); SW.push(1, 0, 0, 0); } else { SI.push(i0, i0 + 1, 0, 0); SW.push(1 - f, f, 0, 0); }
      }
    }
  }
  const row = nv + 1, half = (nu + 1) * row;
  for (const side of [1, 0]) {
    const o = side ? 0 : half;
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const a = o + i * row + j, b = a + 1, c = a + row, d = c + 1;
      if (side) I.push(a, c, b, b, c, d); else I.push(a, b, c, b, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
  geo.setAttribute('aSide', new THREE.Float32BufferAttribute(S, 1));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(SW, 4));
  geo.setIndex(I);
  geo.computeVertexNormals();
  return geo;
}

function addSide(geo, value = 0) {
  geo.setAttribute('aSide', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count).fill(value), 1));
  return geo;
}

function bone(name, parent, [x, y, z]) {
  const b = new THREE.Bone();
  b.name = name;
  b.position.set(x, y, z);
  parent.add(b);
  return b;
}

export function buildLamb(variant = 'female') {
  const spec = SPEC[variant];
  const root = new THREE.Group();
  root.name = `lamb-${variant}`;

  const fleece = toon({ light: PAL.cream, dark: PAL.gold, deep: PAL.deep, cut: 0.6, deepCut: -0.1 });
  const skin = toon({ light: PAL.cream, dark: PAL.gold, deep: PAL.deep, cut: 0.6, deepCut: -0.15 });
  const hoof = toon({ light: PAL.hoof, dark: PAL.hoofDark, deep: PAL.hoofCleft, cut: 0.35, hoof: { cleft: 0.06 } });
  const earMat = toon({ light: PAL.cream, dark: PAL.gold, cut: 0.45, ear: { inner: PAL.inner, inner2: PAL.inner2 } });

  // --- Skeleton (bind pose: arms and legs straight down, ears hanging down) ---
  const rig = {};
  rig.root = new THREE.Bone(); rig.root.name = 'root'; root.add(rig.root);
  rig.hips = bone('hips', rig.root, [0, 2.6, 0.05]);
  rig.spine = bone('spine', rig.hips, [0, 1.4, 0.15]);
  rig.neck = bone('neck', rig.spine, [0, 2.3, 0.1]);
  rig.head = bone('head', rig.neck, [0, HEAD[1] - 6.3, HEAD[2] - 0.3]);
  for (const s of [1, -1]) {
    const L = s > 0 ? 'L' : 'R';
    rig[`shoulder${L}`] = bone(`shoulder${L}`, rig.spine, [s * 1.0 * spec.torsoW, 1.8, 0.2]);
    rig[`elbow${L}`] = bone(`elbow${L}`, rig[`shoulder${L}`], [0, -1.35, 0]);
    rig[`hand${L}`] = bone(`hand${L}`, rig[`elbow${L}`], [0, -1.27, 0]);
    rig[`thigh${L}`] = bone(`thigh${L}`, rig.hips, [s * 0.78, -0.5, 0.2]);
    rig[`knee${L}`] = bone(`knee${L}`, rig[`thigh${L}`], [0, -0.95, 0]);
    rig[`foot${L}`] = bone(`foot${L}`, rig[`knee${L}`], [0, -0.7, 0]);
    rig[`ear${L}0`] = bone(`ear${L}0`, rig.head, [s * 1.7 * (spec.headW / 1.95), 0.3, -0.5]);
    rig[`ear${L}1`] = bone(`ear${L}1`, rig[`ear${L}0`], [0, -1.35 * spec.ear, 0]);
    rig[`ear${L}2`] = bone(`ear${L}2`, rig[`ear${L}1`], [0, -1.35 * spec.ear, 0]);
  }
  rig.tail = bone('tail', rig.hips, [0.95, -0.05, -1.15]);
  root.updateMatrixWorld(true);

  const skinned = (geo, mat, bones) => {
    const mesh = new THREE.SkinnedMesh(geo, mat);
    mesh.frustumCulled = false;
    root.add(mesh);
    mesh.bind(new THREE.Skeleton(bones), new THREE.Matrix4());
    return mesh;
  };
  const rigid = (geo, mat, parent, at = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(addSide(geo), mat);
    const wp = new THREE.Vector3(...at);
    parent.worldToLocal(wp);
    mesh.position.copy(wp);
    mesh.frustumCulled = false;
    parent.add(mesh);
    return mesh;
  };

  // --- Torso, skinned between hips, spine and neck ---
  const torsoSdf = torsoSdfFor(spec);
  const torsoCenter = [0, 4.2, 0.2];
  const torsoGeo = radialGeometry(torsoSdf, torsoCenter, { w: 56, h: 44 });
  {
    const pos = torsoGeo.attributes.position;
    const idx = [], wts = [];
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(i, pos.getX(i) + torsoCenter[0], pos.getY(i) + torsoCenter[1], pos.getZ(i) + torsoCenter[2]);
      const y = pos.getY(i);
      const a = THREE.MathUtils.smoothstep(y, 3.0, 4.6);
      const b = THREE.MathUtils.smoothstep(y, 6.2, 7.0);
      idx.push(0, 1, 2, 0);
      wts.push(1 - a, a * (1 - b), b, 0);
    }
    torsoGeo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4));
    torsoGeo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(wts, 4));
    addSide(torsoGeo);
    skinned(torsoGeo, skin, [rig.hips, rig.spine, rig.neck]);
  }

  // Chest bib and belly patch: scalloped clouds on the front of the body (01-front).
  rigid(cloudGeometry(frontPuffs(torsoSdf, [
    [-0.72, 5.95, 0.42], [-0.25, 6.12, 0.44], [0.27, 6.1, 0.44], [0.74, 5.92, 0.42],
    [-0.62, 5.4, 0.44], [0.0, 5.55, 0.5], [0.6, 5.4, 0.44], [-0.32, 5.0, 0.4], [0.32, 5.0, 0.4],
  ].map(([x, y, r]) => [x * spec.torsoW, y, r + 0.05]), 0.55)), fleece, rig.spine);
  rigid(cloudGeometry(frontPuffs(torsoSdf, [
    [-1.12, 2.62, 0.42], [-0.56, 2.42, 0.44], [0.0, 2.36, 0.46], [0.56, 2.42, 0.44], [1.12, 2.62, 0.42],
    [-1.05, 3.4, 0.46], [-0.4, 3.75, 0.5], [0.4, 3.75, 0.5], [1.05, 3.4, 0.46], [0, 3.1, 0.7],
  ].map(([x, y, r]) => [x * spec.torsoW, y, r]), 0.8)), fleece, rig.hips);

  // Fleece over the back and flanks (profile and back views).
  {
    const back = [];
    const n = 44;
    for (let i = 0; i < n; i++) {
      const yy = 1 - (i + 0.5) / n * 2;
      const r = Math.sqrt(1 - yy * yy);
      const th = i * 2.399963;
      const d = [Math.cos(th) * r, yy, Math.sin(th) * r];
      if (d[2] > -0.35 || d[1] > 0.75) continue;
      const y = 3.6 + d[1] * 2.1;
      const width = y > 4.6 ? 1.2 : 1.62;
      back.push([d[0] * width * spec.torsoW * 0.92, y, 0.1 + d[2] * (y > 4.6 ? 0.85 : 1.15), 0.6]);
    }
    const lower = back.filter((p) => p[1] < 4.3), upper = back.filter((p) => p[1] >= 4.3);
    rigid(puffGeometry(lower), fleece, rig.hips);
    rigid(puffGeometry(upper), fleece, rig.spine);
  }

  // --- Head ---
  const headSdf = headSdfFor(spec);
  const face = createFace(variant, headSdf);
  const faceMat = toon({ light: PAL.cream, dark: PAL.gold, deep: PAL.deep, cut: 0.3, deepCut: -0.25, face: face.texture });
  const headGeo = addSide(radialGeometry(headSdf, [0, 0, 0], { w: 72, h: 56 }));
  const headMesh = new THREE.Mesh(headGeo, faceMat);
  headMesh.frustumCulled = false;
  rig.head.add(headMesh);
  const hp = headPuffs(spec);
  const crown = new THREE.Mesh(addSide(puffGeometry(hp)), fleece);
  crown.frustumCulled = false;
  rig.head.add(crown);
  const curl = new THREE.Mesh(addSide(curlGeometry(spec)), fleece);
  curl.position.set(0.25, 1.5, 1.35);
  curl.rotation.set(-0.35, 0.12, 0);
  curl.scale.setScalar(1.3);
  curl.frustumCulled = false;
  rig.head.add(curl);
  rig.curl = curl;

  // --- Ears ---
  for (const s of [1, -1]) {
    const L = s > 0 ? 'L' : 'R';
    const geo = earGeometry(spec.ear);
    // Bake the ear into bind space at its root bone.
    const wp = rig[`ear${L}0`].getWorldPosition(new THREE.Vector3());
    geo.translate(wp.x, wp.y, wp.z);
    skinned(geo, earMat, [rig[`ear${L}0`], rig[`ear${L}1`], rig[`ear${L}2`]]);
  }

  // --- Arms and legs ---
  for (const s of [1, -1]) {
    const L = s > 0 ? 'L' : 'R';
    const sp = rig[`shoulder${L}`].getWorldPosition(new THREE.Vector3());
    const arm = limbGeometry(2.62, 0.42, 0.33, 1.35);
    arm.translate(sp.x, sp.y, sp.z);
    addSide(arm);
    skinned(arm, skin, [rig[`shoulder${L}`], rig[`elbow${L}`]]);
    const shoulderCap = new THREE.Mesh(addSide(new THREE.SphereGeometry(0.42, 18, 12)), skin);
    rig[`shoulder${L}`].add(shoulderCap);
    // Hoof hand.
    const hh = radialGeometry(ellipsoid([0, -0.22, 0.02], [0.38, 0.34, 0.33]), [0, -0.2, 0], { w: 28, h: 20 });
    hh.translate(0, -0.2, 0);
    const hand = new THREE.Mesh(addSide(hh), hoof);
    rig[`hand${L}`].add(hand);
    rig[`handMesh${L}`] = hand;

    const tp = rig[`thigh${L}`].getWorldPosition(new THREE.Vector3());
    const leg = limbGeometry(1.75, 0.41, 0.36, 0.95);
    leg.translate(tp.x, tp.y, tp.z);
    addSide(leg);
    skinned(leg, skin, [rig[`thigh${L}`], rig[`knee${L}`]]);
    // Hoof foot: a rounded wedge, flat underneath.
    const fsdf = (x, y, z) => Math.max(ellipsoid([0, 0.0, 0.08], [0.52, 0.62, 0.55])(x, y, z), -(y + 0.45));
    const fg = radialGeometry(fsdf, [0, -0.1, 0.05], { w: 32, h: 24 });
    fg.translate(0, -0.1, 0.05);
    const foot = new THREE.Mesh(addSide(fg), hoof);
    rig[`foot${L}`].add(foot);
  }

  // --- Tail ---
  const tail = new THREE.Mesh(addSide(puffGeometry([[0, 0, 0, 0.42], [0.18, 0.3, -0.12, 0.34], [-0.15, 0.22, -0.2, 0.32], [0.05, -0.25, -0.15, 0.34]])), fleece);
  rig.tail.add(tail);

  const book = buildBook();
  book.group.position.set(0, 0.75, 1.95);
  book.group.rotation.set(0.75, 0, 0);
  rig.spine.add(book.group);

  return { root, rig, face, book, variant, materials: [fleece, skin, hoof, earMat, faceMat, ...book.materials] };
}

// A small Bible: navy covers with a gold cross, cream pages, hinged at the spine.
// Held open towards the lamb (-z) the viewer sees the outside of the covers; closed, its
// spine faces the viewer.
function buildBook() {
  const cover = toon({ light: '#3a4f86', dark: '#27375f', cut: 0.35 });
  const gold = toon({ light: '#f1c571', dark: '#d39a3c', cut: 0.35 });
  const paper = toon({ light: '#fff7e4', dark: '#ecd9b2', cut: 0.2 });
  paper.side = THREE.DoubleSide;
  const W = 0.98, H = 1.3, T = 0.06, P = 0.09;
  const group = new THREE.Group();
  const half = (s) => {
    const hinge = new THREE.Group();
    hinge.position.x = s * P;
    const c = new THREE.Mesh(addSide(new THREE.BoxGeometry(W, H, T)), cover);
    c.position.set((s * W) / 2, 0, T / 2);
    const pg = new THREE.Mesh(addSide(new THREE.BoxGeometry(W - 0.06, H - 0.08, P)), paper);
    pg.position.set((s * (W - 0.06)) / 2, 0, -P / 2);
    hinge.add(c, pg);
    return hinge;
  };
  const left = half(-1), right = half(1);
  // Gold cross on the front cover (the lamb's left, +x).
  const bar1 = new THREE.Mesh(addSide(new THREE.BoxGeometry(0.09, 0.62, 0.02)), gold);
  const bar2 = new THREE.Mesh(addSide(new THREE.BoxGeometry(0.38, 0.09, 0.02)), gold);
  bar1.position.set(W / 2, 0, T + 0.01);
  bar2.position.set(W / 2, 0.1, T + 0.01);
  right.add(bar1, bar2);
  const spine = new THREE.Mesh(addSide(new THREE.BoxGeometry(2 * P + 0.04, H, T)), cover);
  spine.position.z = T / 2;
  const band = new THREE.Mesh(addSide(new THREE.BoxGeometry(2 * P + 0.06, 0.06, T + 0.02)), gold);
  band.position.set(0, 0.45, T / 2);
  const band2 = band.clone();
  band2.position.y = -0.45;
  const page = new THREE.Group();
  page.position.set(P, 0, -P - 0.004);
  page.add(new THREE.Mesh(addSide(new THREE.PlaneGeometry(W - 0.1, H - 0.12).translate((W - 0.1) / 2, 0, 0)), paper));
  group.add(left, right, spine, band, band2, page);
  return { group, left, right, page, materials: [cover, gold, paper] };
}

// Rest pose: the reference's relaxed low A-pose.
export const REST = {
  shoulderZ: 0.6,
  earZ: 0.62,
  earTwist: 0.75,
  earX: 0.3,
};
