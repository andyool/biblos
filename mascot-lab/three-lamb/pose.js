// Pose channels: every animatable value of the lamb, in plain numbers so clips can blend
// them freely. Angles are radians. "L" is the lamb's own left (the viewer's right).
import { REST } from './lamb.js';

const THIGH = 0.95, SHIN = 0.7, LEG = THIGH + SHIN;

export const BODY_CHANNELS = {
  x: 0, y: 0, z: 0, yaw: 0, lean: 0, roll: 0,
  hipsY: 0, hipsX: 0, hipsY2: 0, hipsZ: 0,
  spineX: 0, spineY: 0, spineZ: 0, squash: 0, breathe: 0,
  neckX: 0,
  headX: 0, headY: 0, headZ: 0,
  earLX: 0, earLZ: 0, earRX: 0, earRZ: 0,
  armLX: 0, armLZ: 0, armLY: 0, elbowL: 0, elbowLY: 0, handLX: 0, handLZ: 0,
  armRX: 0, armRZ: 0, armRY: 0, elbowR: 0, elbowRY: 0, handRX: 0, handRZ: 0,
  legLX: 0, legLZ: 0, kneeL: 0, footLX: 0,
  legRX: 0, legRZ: 0, kneeR: 0, footRX: 0,
  tailX: 0, tailY: 0, curl: 0,
  book: 0, bookOpen: 0, bookFlip: 0,
};

export const FACE_CHANNELS = {
  blink: 0, lookX: 0, lookY: 0, smile: 1, open: 0, mouthW: 1, browRaise: 0, browTilt: 0, happy: 0, squint: 0, wide: 0, blush: 0,
};

export const CHANNELS = { ...BODY_CHANNELS, ...FACE_CHANNELS };

export function applyPose(lamb, p) {
  const r = lamb.rig;
  r.root.position.set(p.x, p.y, p.z);
  r.root.rotation.set(p.lean, p.yaw, p.roll, 'YXZ');
  r.hips.position.y = 2.6 + p.hipsY;
  r.hips.rotation.set(p.hipsX, p.hipsY2, p.hipsZ);
  const sq = 1 + p.squash, br = 1 + p.breathe * 0.025;
  r.hips.scale.set(1 / Math.sqrt(sq) * br, sq, 1 / Math.sqrt(sq) * br);
  r.spine.rotation.set(p.spineX, p.spineY, p.spineZ);
  r.neck.rotation.set(p.neckX, 0, 0);
  r.head.rotation.set(p.headX, p.headY, p.headZ, 'YXZ');
  // Keep the head round when the body squashes.
  r.head.scale.set(Math.sqrt(sq) / br, 1 / sq, Math.sqrt(sq) / br);
  r.earL0.rotation.set(REST.earX + p.earLX, REST.earTwist, REST.earZ + p.earLZ, 'ZXY');
  r.earR0.rotation.set(REST.earX + p.earRX, -REST.earTwist, -(REST.earZ + p.earRZ), 'ZXY');
  r.shoulderL.rotation.set(-p.armLX, p.armLY, REST.shoulderZ + p.armLZ);
  r.shoulderR.rotation.set(-p.armRX, -p.armRY, -(REST.shoulderZ + p.armRZ));
  // elbow*Y turns the hinge around the upper arm, so the forearm can bend up or sideways.
  r.elbowL.rotation.set(-p.elbowL, p.elbowLY, 0, 'YXZ');
  r.elbowR.rotation.set(-p.elbowR, -p.elbowRY, 0, 'YXZ');
  r.handL.rotation.set(-p.handLX, 0, p.handLZ);
  r.handR.rotation.set(-p.handRX, 0, -p.handRZ);
  // Legs: keep the hooves planted when the hips drop (two-bone IK), then add the pose.
  const d = Math.min(LEG, Math.max(0.5, LEG + p.hipsY));
  const ik = d < LEG - 1e-4;
  const alpha = ik ? Math.acos((THIGH * THIGH + d * d - SHIN * SHIN) / (2 * THIGH * d)) : 0;
  const beta = ik ? Math.PI - Math.acos((THIGH * THIGH + SHIN * SHIN - d * d) / (2 * THIGH * SHIN)) : 0;
  const lLX = p.legLX + alpha, lRX = p.legRX + alpha, kL = p.kneeL + beta, kR = p.kneeR + beta;
  r.thighL.rotation.set(-lLX, 0, p.legLZ);
  r.thighR.rotation.set(-lRX, 0, -p.legRZ);
  r.thighL.scale.set(1 / r.hips.scale.x, 1 / r.hips.scale.y, 1 / r.hips.scale.z);
  r.thighR.scale.copy(r.thighL.scale);
  r.kneeL.rotation.set(kL, 0, 0);
  r.kneeR.rotation.set(kR, 0, 0);
  r.footL.rotation.set(lLX - kL - p.footLX, 0, -p.legLZ);
  r.footR.rotation.set(lRX - kR - p.footRX, 0, p.legRZ);
  r.tail.rotation.set(p.tailX, p.tailY, 0);
  r.curl.rotation.z = p.curl;
  // The little Bible: grows into the hooves, opens, and a page can flip across.
  const b = lamb.book;
  const k = Math.max(0, Math.min(1, p.book));
  b.group.visible = k > 0.001;
  b.group.scale.setScalar(k * k * (3 - 2 * k));
  const a = Math.PI / 2 - Math.max(0, Math.min(1, p.bookOpen)) * (Math.PI / 2 - 0.38);
  b.left.rotation.y = -a;
  b.right.rotation.y = a;
  const f = Math.max(0, Math.min(1, p.bookFlip));
  b.page.visible = f > 0.001 && f < 0.999;
  b.page.rotation.y = a + f * (Math.PI - 2 * a);
}
