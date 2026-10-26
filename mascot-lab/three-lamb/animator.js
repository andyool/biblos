// Drives a lamb: a looping base layer (idle, sleeping, reading…), additive action clips
// layered on top, procedural life (breathing, blinks, glances) and spring physics so the
// ears, tail and forelock follow through after every move.
import { CHANNELS, FACE_CHANNELS, applyPose } from './pose.js';
import { CLIPS, BASES } from './clips.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Cubic Hermite through keys with Catmull-Rom tangents; keys are [t, v, ease?].
function sample(track, t) {
  const n = track.length;
  if (t <= track[0][0]) return track[0][1];
  if (t >= track[n - 1][0]) return track[n - 1][1];
  let i = 0;
  while (i < n - 2 && t > track[i + 1][0]) i++;
  const [t0, v0] = track[i], [t1, v1, ease] = track[i + 1];
  const u = (t - t0) / (t1 - t0 || 1);
  if (ease === 'step') return u < 1 ? v0 : v1;
  if (ease === 'lin') return v0 + (v1 - v0) * u;
  const prev = track[i - 1], next = track[i + 2];
  const dt = t1 - t0;
  let m0 = prev ? ((v1 - prev[1]) / (t1 - prev[0])) * dt : 0;
  let m1 = next ? ((next[1] - v0) / (next[0] - t0)) * dt : 0;
  if (ease === 'out') m1 = 0; // settle into the key
  if (ease === 'in') m0 = 0;
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * m1;
}

// Compile [[t, {channel: value}], ...] into per-channel tracks.
function compile(clip) {
  if (clip.tracks) return clip;
  const tracks = {};
  const D = clip.duration;
  for (const [t, pose, ease] of clip.keys) {
    for (const [ch, v] of Object.entries(pose)) {
      if (!(ch in CHANNELS)) throw new Error(`Unknown channel ${ch}`);
      (tracks[ch] ||= []).push([t, v, ease]);
    }
  }
  for (const [ch, tr] of Object.entries(tracks)) {
    tr.sort((a, b) => a[0] - b[0]);
    if (!clip.absolute) {
      if (tr[0][0] > 0) tr.unshift([0, 0]);
      if (tr[tr.length - 1][0] < D && !clip.hold) tr.push([D, 0, 'out']);
    }
  }
  clip.tracks = tracks;
  return clip;
}

class Spring {
  constructor(k = 60, c = 7) { this.k = k; this.c = c; this.x = 0; this.v = 0; }
  step(force, dt) {
    const a = force - this.k * this.x - this.c * this.v;
    this.v += a * dt;
    this.x += this.v * dt;
    this.x = clamp(this.x, -1.2, 1.2);
    return this.x;
  }
}

export class Animator {
  constructor(lamb, { reducedMotion = false } = {}) {
    this.lamb = lamb;
    this.reduced = reducedMotion;
    this.time = 0;
    this.base = { from: null, to: compile(BASES.idle), mix: 1, t: 0 };
    this.actions = []; // { clip, t, weight, fading, resolve }
    this.pose = { ...CHANNELS };
    this.look = { yaw: 0, pitch: 0, tYaw: 0, tPitch: 0 };
    this.springs = { earL: new Spring(55, 6), earR: new Spring(55, 6), earLX: new Spring(45, 6), earRX: new Spring(45, 6), tail: new Spring(80, 5), curl: new Spring(90, 8) };
    this.prev = null;
    this.nextBlink = 1.5;
    this.blinkT = -1;
    this.nextGlance = 2.5;
    this.glance = { x: 0, y: 0, tx: 0, ty: 0 };
    this.nextFidget = 7 + Math.random() * 5;
    this.fidgets = BASES.idle.fidgets || [];
    this.listeners = new Set();
  }

  setBase(name) {
    const clip = BASES[name] || BASES.idle;
    if (this.base.to === clip) return;
    this.base = { from: this.base.to, fromT: this.base.t, to: compile(clip), mix: 0, t: 0 };
    this.fidgets = clip.fidgets || [];
    this.nextFidget = 6 + Math.random() * 6;
  }

  get baseName() {
    return Object.keys(BASES).find((k) => BASES[k] === this.base.to);
  }

  // Play an action on top of the base; any running action hands over smoothly.
  play(name, { then } = {}) {
    const clip = CLIPS[name];
    if (!clip) return Promise.resolve();
    compile(clip);
    for (const a of this.actions) a.fading = true;
    return new Promise((resolve) => {
      this.actions.push({ clip, t: 0, weight: 1, fading: false, resolve, name });
      if (then) this.setBase(then);
      else if (clip.base) this.setBase(clip.base);
      this.nextFidget = Math.max(this.nextFidget, this.time + clip.duration + 5);
    });
  }

  get busy() {
    return this.actions.some((a) => !a.fading);
  }

  lookAt(yaw, pitch) {
    this.look.tYaw = clamp(yaw, -0.9, 0.9);
    this.look.tPitch = clamp(pitch, -0.5, 0.5);
  }

  update(dt) {
    dt = Math.min(dt, 0.05);
    this.time += dt;
    const P = this.pose;
    for (const k in CHANNELS) P[k] = CHANNELS[k];

    // Base layer (absolute), crossfading between bases.
    const b = this.base;
    b.t += dt;
    b.mix = Math.min(1, b.mix + dt / 0.6);
    const m = b.mix * b.mix * (3 - 2 * b.mix);
    const evalBase = (clip, t) => {
      const out = {};
      const tt = clip.loop ? t % clip.duration : Math.min(t, clip.duration);
      for (const [ch, tr] of Object.entries(clip.tracks)) out[ch] = sample(tr, tt);
      return out;
    };
    const cur = evalBase(b.to, b.t);
    if (b.from && m < 1) {
      b.fromT += dt;
      const old = evalBase(b.from, b.fromT);
      for (const ch of new Set([...Object.keys(cur), ...Object.keys(old)])) {
        const v0 = ch in old ? old[ch] : CHANNELS[ch], v1 = ch in cur ? cur[ch] : CHANNELS[ch];
        P[ch] = v0 + (v1 - v0) * m;
      }
    } else for (const ch in cur) P[ch] = cur[ch];

    // Procedural life: breathing, blinking, small glances.
    P.breathe += Math.sin(this.time * 1.7) * 0.6;
    P.spineX += Math.sin(this.time * 1.7) * 0.006;
    if (this.time > this.nextBlink && this.blinkT < 0) this.blinkT = 0;
    if (this.blinkT >= 0) {
      this.blinkT += dt;
      const u = this.blinkT / 0.16;
      P.blink = Math.max(P.blink, u < 1 ? Math.sin(u * Math.PI) : 0);
      if (u >= 1) {
        this.blinkT = -1;
        this.nextBlink = this.time + 2 + Math.random() * 3.5 + (Math.random() < 0.15 ? -1.8 : 0);
      }
    }
    if (this.time > this.nextGlance) {
      this.glance.tx = (Math.random() - 0.5) * 0.7;
      this.glance.ty = (Math.random() - 0.5) * 0.4;
      if (Math.random() < 0.4) { this.glance.tx = 0; this.glance.ty = 0; }
      this.nextGlance = this.time + 1.2 + Math.random() * 2.8;
    }
    const gk = 1 - Math.exp(-dt * 18);
    this.glance.x += (this.glance.tx - this.glance.x) * gk;
    this.glance.y += (this.glance.ty - this.glance.y) * gk;
    P.lookX += this.glance.x;
    P.lookY += this.glance.y;

    // Look-at (e.g. towards a tap), head following the eyes.
    const lk = 1 - Math.exp(-dt * 5);
    this.look.yaw += (this.look.tYaw - this.look.yaw) * lk;
    this.look.pitch += (this.look.tPitch - this.look.pitch) * lk;
    P.headY += this.look.yaw * 0.6;
    P.headX -= this.look.pitch * 0.5;
    P.lookX += this.look.yaw * 1.2;
    P.lookY += this.look.pitch * 1.2;

    // Fidgets keep the idle alive.
    if (!this.actions.length && this.fidgets.length && this.time > this.nextFidget) {
      this.play(this.fidgets[Math.floor(Math.random() * this.fidgets.length)]);
      this.nextFidget = this.time + 8 + Math.random() * 8;
    }

    // Additive actions.
    for (const a of this.actions) {
      a.t += dt;
      if (a.fading) a.weight = Math.max(0, a.weight - dt / 0.3);
      const c = a.clip;
      const t = Math.min(a.t, c.duration);
      const k = this.reduced ? 0.3 : 1;
      for (const [ch, tr] of Object.entries(c.tracks)) {
        const face = ch in FACE_CHANNELS;
        P[ch] += sample(tr, t) * a.weight * (face ? 1 : k);
      }
      if ((a.t >= c.duration && !c.hold) || a.weight <= 0) a.done = true;
    }
    this.actions = this.actions.filter((a) => {
      if (a.done) a.resolve();
      return !a.done;
    });

    // Secondary motion: ears, tail and curl lag behind the body.
    const yawW = P.yaw + P.spineY + P.headY + P.hipsY2;
    const rollW = P.roll + P.spineZ + P.headZ + P.hipsZ;
    const pitchW = P.lean + P.spineX + P.headX + P.hipsX + P.neckX;
    const lift = P.y + P.hipsY;
    if (!this.prev) this.prev = { yawW, rollW, pitchW, lift, vy: 0, vyaw: 0, vroll: 0, vpitch: 0 };
    const pr = this.prev;
    const inv = 1 / Math.max(dt, 1e-3);
    const vy = (lift - pr.lift) * inv, vyaw = (yawW - pr.yawW) * inv, vroll = (rollW - pr.rollW) * inv, vpitch = (pitchW - pr.pitchW) * inv;
    const ay = (vy - pr.vy) * inv, ayaw = (vyaw - pr.vyaw) * inv, aroll = (vroll - pr.vroll) * inv, apitch = (vpitch - pr.vpitch) * inv;
    Object.assign(pr, { yawW, rollW, pitchW, lift, vy, vyaw, vroll, vpitch });
    const s = this.springs;
    const lim = (v) => clamp(v, -400, 400);
    // Going up pushes the ears down; landing flips them up. Turning swings them back.
    const earL = s.earL.step(lim(-ay * 0.02 + aroll * 0.25), dt);
    const earR = s.earR.step(lim(-ay * 0.02 - aroll * 0.25), dt);
    const earLX = s.earLX.step(lim(ayaw * 0.12 + apitch * 0.2), dt);
    const earRX = s.earRX.step(lim(-ayaw * 0.12 + apitch * 0.2), dt);
    P.earLZ += earL; P.earRZ += earR; P.earLX += earLX; P.earRX += earRX;
    P.tailY += s.tail.step(lim(-ayaw * 0.3 + aroll * 0.2), dt);
    P.curl += s.curl.step(lim(aroll * 0.08 - ay * 0.01), dt);

    // Face limits.
    P.blink = clamp(P.blink, 0, 1);
    P.happy = clamp(P.happy, 0, 1);
    P.open = clamp(P.open, 0, 1);
    P.squint = clamp(P.squint, 0, 1);
    P.wide = clamp(P.wide, -0.5, 1);
    P.blush = clamp(P.blush, 0, 1);
    P.lookX = clamp(P.lookX, -1.2, 1.2);
    P.lookY = clamp(P.lookY, -1, 1);

    applyPose(this.lamb, P);
    const face = {};
    for (const k in FACE_CHANNELS) face[k] = P[k];
    this.lamb.face.draw(face);
  }
}
