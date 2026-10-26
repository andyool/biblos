// Every movement the lamb can make. Times are seconds, angles radians.
//
// BASES are looping, absolute poses (what the lamb does while nothing else happens).
// CLIPS are additive: each channel starts and ends at zero, so an action can begin
// from whatever the lamb is doing and always lands back on it smoothly.
//
// Channel signs: yaw + turns to the viewer's right; headX + nods down; headZ + tilts the
// top of the head to the viewer's left; arm*X + raises forward; arm*Z + raises outward;
// elbow + bends forward; ear*Z + lifts the ear; ear*X + swings it back; hipsY - crouches
// (the legs bend by themselves to keep the hooves planted).
const PI = Math.PI;

const wave = (t0, n, step, ch, amp) => Array.from({ length: n }, (_, i) => [t0 + i * step, { [ch]: i % 2 ? -amp : amp }]);

export const BASES = {
  idle: {
    duration: 6,
    loop: true,
    absolute: true,
    fidgets: ['earFlick', 'lookAround', 'tailWag', 'shift', 'glanceUp', 'stretch', 'earFlick', 'tailWag', 'smileAt'],
    keys: [
      [0, { spineZ: 0, headZ: 0.03, hipsZ: 0, armLZ: 0, armRZ: 0, x: 0 }],
      [1.5, { spineZ: 0.018, headZ: 0.0, hipsZ: -0.01, armLZ: 0.03, armRZ: -0.01, x: 0.03 }],
      [3, { spineZ: 0, headZ: -0.03, hipsZ: 0, armLZ: 0, armRZ: 0, x: 0 }],
      [4.5, { spineZ: -0.018, headZ: 0.0, hipsZ: 0.01, armLZ: -0.01, armRZ: 0.03, x: -0.03 }],
      [6, { spineZ: 0, headZ: 0.03, hipsZ: 0, armLZ: 0, armRZ: 0, x: 0 }],
    ],
  },
  happy: {
    duration: 1.2,
    loop: true,
    absolute: true,
    fidgets: ['tailWag', 'earFlick', 'smileAt'],
    keys: [
      [0, { hipsY: 0, headZ: 0.05, smile: 1.3, armLZ: 0.08, armRZ: 0.08 }],
      [0.3, { hipsY: -0.06, headZ: 0.0 }],
      [0.6, { hipsY: 0, headZ: -0.05, smile: 1.3, armLZ: 0.08, armRZ: 0.08 }],
      [0.9, { hipsY: -0.06, headZ: 0.0 }],
      [1.2, { hipsY: 0, headZ: 0.05, smile: 1.3, armLZ: 0.08, armRZ: 0.08 }],
    ],
  },
  sleep: {
    duration: 4.4,
    loop: true,
    absolute: true,
    keys: [
      [0, { headX: 0.32, headZ: 0.12, neckX: 0.08, spineX: 0.06, earLZ: -0.3, earRZ: -0.3, blink: 1, smile: 0.4, breathe: 0, hipsY: -0.08, armLX: 0.25, armRX: 0.25, armLZ: -0.4, armRZ: -0.4, elbowL: 0.7, elbowR: 0.7 }],
      [2.2, { headX: 0.4, headZ: 0.14, breathe: 2.5, open: 0.12, mouthW: 0.5, spineX: 0.1 }],
      [4.4, { headX: 0.32, headZ: 0.12, neckX: 0.08, spineX: 0.06, earLZ: -0.3, earRZ: -0.3, blink: 1, smile: 0.4, breathe: 0, hipsY: -0.08, armLX: 0.25, armRX: 0.25, armLZ: -0.4, armRZ: -0.4, elbowL: 0.7, elbowR: 0.7, open: 0 }],
    ],
  },
  read: {
    duration: 5,
    loop: true,
    absolute: true,
    fidgets: ['turnPage', 'readNod', 'turnPage'],
    keys: [
      [0, { book: 1, bookOpen: 1, armLX: 0.55, armRX: 0.55, armLZ: -0.38, armRZ: -0.38, elbowL: 0.95, elbowR: 0.95, headX: 0.32, lookY: -0.9, lookX: -0.3, smile: 0.9, headZ: 0.04, yaw: -0.18 }],
      [2.5, { headX: 0.34, lookX: 0.35, headZ: 0.0, headY: 0.06 }],
      [5, { book: 1, bookOpen: 1, armLX: 0.55, armRX: 0.55, armLZ: -0.38, armRZ: -0.38, elbowL: 0.95, elbowR: 0.95, headX: 0.32, lookY: -0.9, lookX: -0.3, smile: 0.9, headZ: 0.04, yaw: -0.18, headY: 0 }],
    ],
  },
  think: {
    duration: 3.2,
    loop: true,
    absolute: true,
    fidgets: ['tapFoot'],
    keys: [
      [0, { armRX: 1.25, armRZ: -0.55, elbowR: 2.05, handRX: 0.3, headZ: -0.1, headX: -0.08, lookX: 0.5, lookY: 0.7, smile: 0.2, mouthW: 0.8, browRaise: 0.4, browTilt: 0.3, earLZ: 0.1, armLZ: -0.05 }],
      [1.6, { headZ: -0.14, lookX: 0.6, lookY: 0.75 }],
      [3.2, { armRX: 1.25, armRZ: -0.55, elbowR: 2.05, handRX: 0.3, headZ: -0.1, headX: -0.08, lookX: 0.5, lookY: 0.7, smile: 0.2, mouthW: 0.8, browRaise: 0.4, browTilt: 0.3, earLZ: 0.1, armLZ: -0.05 }],
    ],
  },
  sad: {
    duration: 4,
    loop: true,
    absolute: true,
    keys: [
      [0, { headX: 0.2, earLZ: -0.35, earRZ: -0.35, earLX: 0.2, earRX: 0.2, browTilt: 0.9, smile: -0.6, lookY: -0.5, spineX: 0.08, armLZ: -0.35, armRZ: -0.35, hipsY: -0.04 }],
      [2, { headX: 0.24, breathe: 1.5 }],
      [4, { headX: 0.2, earLZ: -0.35, earRZ: -0.35, earLX: 0.2, earRX: 0.2, browTilt: 0.9, smile: -0.6, lookY: -0.5, spineX: 0.08, armLZ: -0.35, armRZ: -0.35, hipsY: -0.04, breathe: 0 }],
    ],
  },
  worried: {
    duration: 3,
    loop: true,
    absolute: true,
    keys: [
      [0, { armLX: 0.95, armRX: 0.95, armLZ: -0.62, armRZ: -0.62, elbowL: 1.35, elbowR: 1.35, browTilt: 1, browRaise: 0.3, smile: -0.4, mouthW: 0.7, lookX: -0.4, earLZ: -0.2, earRZ: -0.2, headZ: 0.05 }],
      [1.5, { lookX: 0.4, headY: 0.08, headZ: -0.04 }],
      [3, { armLX: 0.95, armRX: 0.95, armLZ: -0.62, armRZ: -0.62, elbowL: 1.35, elbowR: 1.35, browTilt: 1, browRaise: 0.3, smile: -0.4, mouthW: 0.7, lookX: -0.4, earLZ: -0.2, earRZ: -0.2, headZ: 0.05, headY: 0 }],
    ],
  },
  walk: {
    duration: 0.9,
    loop: true,
    absolute: true,
    keys: [
      [0, { yaw: -0.65, legLX: 0.4, legRX: -0.35, kneeR: 0.4, armLX: -0.35, armRX: 0.35, hipsY: -0.04, spineY: 0.06, headX: -0.03, smile: 1.1 }],
      [0.225, { legLX: 0.05, legRX: 0.05, kneeL: 0.0, kneeR: 0.75, hipsY: 0.06, armLX: 0, armRX: 0, headX: 0.02 }],
      [0.45, { legLX: -0.35, legRX: 0.4, kneeL: 0.4, kneeR: 0, armLX: 0.35, armRX: -0.35, hipsY: -0.04, spineY: -0.06, headX: -0.03 }],
      [0.675, { legLX: 0.05, legRX: 0.05, kneeL: 0.75, kneeR: 0.0, hipsY: 0.06, armLX: 0, armRX: 0, headX: 0.02 }],
      [0.9, { yaw: -0.65, legLX: 0.4, legRX: -0.35, kneeL: 0, kneeR: 0.4, armLX: -0.35, armRX: 0.35, hipsY: -0.04, spineY: 0.06, headX: -0.03, smile: 1.1 }],
    ],
  },
};

export const CLIPS = {
  // Hello! Raise a hoof and wave, ears perking up.
  wave: {
    duration: 2.4,
    keys: [
      [0.12, { hipsY: -0.06, headZ: 0.05, earLZ: -0.05 }],
      [0.42, { armLZ: 1.0, armLX: 0.3, elbowLY: 1.57, elbowL: 1.35, handLX: 0.2, headZ: -0.14, headY: 0.06, smile: 0.4, open: 0.35, earLZ: 0.35, earRZ: 0.25, spineZ: -0.05, hipsY: 0.02, browRaise: 0.3 }],
      ...wave(0.6, 6, 0.17, 'elbowL', 0.0).map(([t], i) => [t, { elbowL: i % 2 ? 1.05 : 1.65, handLZ: i % 2 ? -0.2 : 0.25 }]),
      [1.65, { armLZ: 1.0, elbowL: 1.35, handLZ: 0, headZ: -0.1, open: 0.2 }],
      [2.1, { armLZ: 0.05, armLX: 0.05, elbowL: 0.1, elbowLY: 0.4, headZ: 0.02, open: 0, smile: 0.2 }],
    ],
  },

  // A right answer: a quick happy hop.
  hop: {
    duration: 1.0,
    keys: [
      [0.12, { hipsY: -0.3, squash: -0.06, spineX: 0.08, armLX: -0.25, armRX: -0.25, earLZ: 0.1, earRZ: 0.1 }],
      [0.26, { y: 0.75, hipsY: 0, squash: 0.08, spineX: -0.06, armLZ: 0.45, armRZ: 0.45, armLX: 0.35, armRX: 0.35, elbowL: 1.7, elbowR: 1.7, elbowLY: 1.2, elbowRY: 1.2, happy: 1, smile: 0.4, open: 0.45, kneeL: 0.2, kneeR: 0.2 }],
      [0.4, { y: 0.95, squash: 0.02, kneeL: 0.45, kneeR: 0.45, legLX: 0.2, legRX: 0.2 }],
      [0.55, { y: 0, hipsY: -0.25, squash: -0.09, armLZ: 0.25, armRZ: 0.25, elbowL: 1.3, elbowR: 1.3, kneeL: 0, kneeR: 0, legLX: 0, legRX: 0 }],
      [0.72, { hipsY: 0.04, squash: 0.02, happy: 1 }],
      [0.85, { hipsY: 0, squash: 0, happy: 0.2, open: 0.1 }],
    ],
  },

  // A streak or perfect step: a big jump with both hooves up.
  cheer: {
    duration: 1.7,
    keys: [
      [0.16, { hipsY: -0.38, squash: -0.08, spineX: 0.12, armLX: -0.35, armRX: -0.35, headX: 0.08 }],
      [0.32, { y: 1.3, hipsY: 0, squash: 0.12, spineX: -0.1, armLZ: 1.6, armRZ: 1.6, elbowL: 0.2, elbowR: 0.2, headX: -0.15, happy: 1, open: 0.7, smile: 0.5, earLZ: -0.2, earRZ: -0.2, wide: 0 }],
      [0.52, { y: 1.55, squash: 0.03, kneeL: 0.6, kneeR: 0.6, legLX: 0.3, legRX: 0.3, legLZ: 0.15, legRZ: 0.15 }],
      [0.74, { y: 0, hipsY: -0.32, squash: -0.1, kneeL: 0, kneeR: 0, legLX: 0, legRX: 0, legLZ: 0, legRZ: 0, armLZ: 1.45, armRZ: 1.45 }],
      [0.92, { hipsY: 0.03, squash: 0.03 }],
      ...wave(1.0, 3, 0.14, 'handLZ', 0.35),
      ...wave(1.0, 3, 0.14, 'handRZ', -0.35),
      [1.35, { armLZ: 1.35, armRZ: 1.35, happy: 1, open: 0.5, hipsY: 0, handLZ: 0, handRZ: 0 }],
    ],
  },

  // A wrong answer: a small wince, a gentle head shake, then a brave little nod.
  oops: {
    duration: 1.8,
    keys: [
      [0.14, { hipsY: -0.14, headX: -0.1, spineX: -0.05, blink: 0.55, squint: 0.6, browTilt: 1, smile: -1.4, mouthW: -0.2, earLZ: -0.35, earRZ: -0.35, armLZ: -0.25, armRZ: -0.25, armLX: 0.3, armRX: 0.3 }],
      [0.42, { headY: -0.16, headX: 0.04, blink: 0.1, squint: 0.2, hipsY: -0.06 }],
      [0.62, { headY: 0.16 }],
      [0.82, { headY: -0.1 }],
      [1.0, { headY: 0, browTilt: 0.5, smile: -0.6, earLZ: -0.2, earRZ: -0.2 }],
      [1.22, { headX: 0.16, browTilt: -0.3, browRaise: -0.1, smile: 0, earLZ: 0.05, earRZ: 0.05, armLZ: 0, armRZ: 0, armLX: 0, armRX: 0 }],
      [1.45, { headX: -0.02, smile: 0.1, browTilt: 0 }],
    ],
  },

  // After a failed lesson: "You can do it" with a hoof pump.
  encourage: {
    duration: 2.6,
    keys: [
      [0.2, { headZ: 0.12, browTilt: 0.5, smile: -0.2, earLZ: -0.1, earRZ: -0.1 }],
      [0.6, { armLX: 0.9, armLZ: 0.15, elbowL: 2.1, headZ: -0.05, browTilt: -0.45, smile: 0.2, earLZ: 0.2, earRZ: 0.15, spineZ: -0.04, hipsY: -0.05 }],
      [0.82, { armLX: 0.55, elbowL: 2.25, hipsY: -0.12, headX: 0.12 }],
      [1.0, { armLX: 0.95, elbowL: 2.0, hipsY: -0.02, headX: -0.04 }],
      [1.2, { armLX: 0.55, elbowL: 2.25, hipsY: -0.12, headX: 0.12 }],
      [1.45, { armLX: 0.9, elbowL: 2.05, hipsY: 0, headX: -0.06, open: 0.35, smile: 0.4 }],
      [2.0, { armLX: 0.85, elbowL: 2.0, open: 0.1 }],
      [2.45, { armLX: 0.1, elbowL: 0.2, browTilt: 0, open: 0 }],
    ],
  },

  // Lesson complete: crouch, leap into a full turn, land in a ta-da.
  celebrate: {
    duration: 3.2,
    keys: [
      [0.25, { hipsY: -0.45, squash: -0.1, spineX: 0.15, armLX: -0.4, armRX: -0.4, armLZ: -0.1, armRZ: -0.1, headX: 0.1, blink: 0.4 }],
      [0.45, { y: 1.5, hipsY: 0, squash: 0.14, spineX: -0.08, armLZ: 2.3, armRZ: 2.3, armLX: 0, armRX: 0, headX: -0.18, happy: 1, open: 0.8, blink: 0, earLZ: -0.3, earRZ: -0.3, yaw: 0.6 }],
      [0.7, { y: 1.85, squash: 0.02, kneeL: 0.7, kneeR: 0.7, legLX: 0.3, legRX: 0.3, yaw: PI }],
      [0.95, { y: 1.1, yaw: PI * 1.65, kneeL: 0.3, kneeR: 0.3 }],
      [1.12, { y: 0, hipsY: -0.4, squash: -0.12, yaw: PI * 2, kneeL: 0, kneeR: 0, legLX: 0, legRX: 0, armLZ: 1.4, armRZ: 1.4, earLZ: 0.4, earRZ: 0.4 }, 'out'],
      [1.35, { hipsY: 0.05, squash: 0.04, yaw: PI * 2 }],
      [1.55, { hipsY: 0, squash: 0, armLZ: 1.5, armRZ: 1.5, armLX: 0.35, armRX: 0.35, elbowL: 0.25, elbowR: 0.25, spineX: -0.08, headX: -0.1, yaw: PI * 2 }],
      [2.6, { armLZ: 1.4, armRZ: 1.4, happy: 1, open: 0.6, yaw: PI * 2, earLZ: 0, earRZ: 0 }],
      [3.2, { armLZ: 0, armRZ: 0, armLX: 0, armRX: 0, elbowL: 0, elbowR: 0, happy: 0, open: 0, spineX: 0, headX: 0, yaw: PI * 2 }],
    ],
  },

  // Achievement / level up: chest out, hooves on hips, chin up, then a little bounce.
  proud: {
    duration: 2.8,
    keys: [
      [0.3, { spineX: -0.16, headX: -0.22, armLZ: 0.55, armRZ: 0.55, armLX: -0.35, armRX: -0.35, elbowL: 1.5, elbowR: 1.5, happy: 1, smile: 0.4, earLZ: 0.25, earRZ: 0.25, hipsY: 0.05, squash: 0.04 }],
      [1.3, { spineX: -0.18, headX: -0.25, headZ: 0.06 }],
      [1.55, { hipsY: -0.12, squash: -0.04 }],
      [1.75, { y: 0.35, hipsY: 0, squash: 0.05 }],
      [1.95, { y: 0, hipsY: -0.1, squash: -0.04 }],
      [2.2, { hipsY: 0, squash: 0, spineX: -0.05, headX: -0.05, happy: 0.5 }],
    ],
  },

  // Applause.
  clap: {
    duration: 2.0,
    keys: [
      [0.25, { armLX: 1.05, armRX: 1.05, armLZ: -0.62, armRZ: -0.62, elbowL: 0.75, elbowR: 0.75, happy: 1, open: 0.4, headZ: 0.06 }],
      ...[0.38, 0.62, 0.86, 1.1, 1.34].flatMap((t) => [
        [t, { armLZ: -0.95, armRZ: -0.95, hipsY: -0.04 }],
        [t + 0.12, { armLZ: -0.58, armRZ: -0.58, hipsY: 0 }],
      ]),
      [1.6, { armLX: 0.9, armRX: 0.9, armLZ: -0.6, armRZ: -0.6, happy: 1, open: 0.3 }],
      [1.95, { armLX: 0.05, armRX: 0.05, armLZ: 0, armRZ: 0, elbowL: 0, elbowR: 0, happy: 0, open: 0 }],
    ],
  },

  // Agreement: two soft nods.
  nod: {
    duration: 1.1,
    keys: [
      [0.18, { headX: 0.22, smile: 0.3, blink: 0.3, earLZ: -0.05, earRZ: -0.05 }],
      [0.36, { headX: -0.04, blink: 0 }],
      [0.56, { headX: 0.18 }],
      [0.78, { headX: -0.02, smile: 0.3 }],
    ],
  },

  // A polite bow (thank you).
  bow: {
    duration: 1.9,
    keys: [
      [0.4, { lean: 0.28, spineX: 0.22, headX: 0.25, armRX: 0.8, armRZ: -0.55, elbowR: 1.5, blink: 1, smile: 0.3, earLZ: -0.25, earRZ: -0.25, hipsY: -0.06 }],
      [0.9, { lean: 0.3, spineX: 0.24, headX: 0.28, blink: 1 }],
      [1.35, { lean: 0, spineX: -0.02, headX: -0.05, armRX: 0.1, armRZ: 0, elbowR: 0.2, blink: 0, happy: 0.6, hipsY: 0 }],
    ],
  },

  // Showing something off: hooves open wide.
  present: {
    duration: 1.9,
    keys: [
      [0.14, { hipsY: -0.08, armLZ: -0.15, armRZ: -0.15, armLX: 0.3, armRX: 0.3 }],
      [0.42, { armLZ: 0.95, armRZ: 0.95, armLX: 0.55, armRX: 0.55, elbowL: 0.25, elbowR: 0.25, spineX: -0.08, headX: -0.08, open: 0.5, smile: 0.4, hipsY: 0.03, earLZ: 0.25, earRZ: 0.25, browRaise: 0.4 }],
      [1.3, { armLZ: 0.9, armRZ: 0.9, armLX: 0.5, armRX: 0.5, open: 0.4 }],
      [1.75, { armLZ: 0, armRZ: 0, armLX: 0, armRX: 0, elbowL: 0, elbowR: 0, open: 0, spineX: 0, headX: 0, browRaise: 0 }],
    ],
  },

  // Pointing down-right, towards the button.
  point: {
    duration: 2.4,
    keys: [
      [0.3, { yaw: 0.35, headY: 0.15, headX: 0.12, lookX: 0.8, lookY: -0.4, armLX: 0.85, armLZ: 0.55, elbowL: 0.1, spineY: 0.12, smile: 0.3, open: 0.25, earLZ: 0.15 }],
      [0.5, { armLX: 0.75, armLZ: 0.5 }],
      [0.7, { armLX: 0.9, armLZ: 0.55 }],
      [1.6, { yaw: 0.3, headY: 0.0, headX: 0.0, lookX: 0, lookY: 0, open: 0.1 }],
      [2.1, { yaw: 0, armLX: 0, armLZ: 0, elbowL: 0, spineY: 0 }],
    ],
  },

  // Nothing here: shrug.
  shrug: {
    duration: 1.9,
    keys: [
      [0.3, { armLZ: 0.45, armRZ: 0.45, armLX: 0.3, armRX: 0.3, elbowL: 1.3, elbowR: 1.3, handLZ: -0.4, handRZ: -0.4, headZ: 0.16, browRaise: 0.7, smile: -0.7, mouthW: -0.15, spineZ: 0.03, earLZ: 0.2, earRZ: 0.2, hipsY: 0.06 }],
      [1.1, { headZ: 0.14, armLZ: 0.42, armRZ: 0.42 }],
      [1.6, { armLZ: 0, armRZ: 0, armLX: 0, armRX: 0, elbowL: 0, elbowR: 0, handLZ: 0, handRZ: 0, headZ: 0, browRaise: 0, smile: 0, hipsY: 0 }],
    ],
  },

  // Startled by a tap.
  surprise: {
    duration: 1.3,
    keys: [
      [0.1, { y: 0.35, z: -0.15, hipsY: 0.05, wide: 1, open: 0.45, mouthW: -0.45, smile: -1, earLZ: 0.75, earRZ: 0.75, armLZ: 0.4, armRZ: 0.4, armLX: 0.55, armRX: 0.55, elbowL: 1.5, elbowR: 1.5, elbowLY: 1.0, elbowRY: 1.0, headX: -0.1, browRaise: 1 }],
      [0.3, { y: 0, z: -0.15, hipsY: -0.12, squash: -0.05 }],
      [0.55, { hipsY: 0, squash: 0, wide: 0.6 }],
      [1.0, { z: 0, wide: 0, open: 0, mouthW: 0, smile: 0, armLZ: 0, armRZ: 0, armLX: 0, armRX: 0, elbowL: 0, elbowR: 0, elbowLY: 0, elbowRY: 0, earLZ: 0, earRZ: 0, browRaise: 0, headX: 0 }],
    ],
  },

  // Tickled: hooves to mouth, giggling.
  giggle: {
    duration: 1.9,
    keys: [
      [0.22, { armLX: 1.15, armRX: 1.15, armLZ: -0.6, armRZ: -0.6, elbowL: 1.85, elbowR: 1.85, happy: 1, blush: 1, headX: 0.1, hipsY: -0.08, earLZ: 0.2, earRZ: 0.2 }],
      ...[0.35, 0.5, 0.65, 0.8, 0.95, 1.1, 1.25].map((t, i) => [t, { spineZ: i % 2 ? -0.06 : 0.06, headZ: i % 2 ? 0.08 : -0.08, hipsY: i % 2 ? -0.1 : -0.05 }]),
      [1.45, { spineZ: 0, headZ: 0.05, blush: 0.8 }],
      [1.8, { armLX: 0, armRX: 0, armLZ: 0, armRZ: 0, elbowL: 0, elbowR: 0, happy: 0, blush: 0, headX: 0, hipsY: 0 }],
    ],
  },

  // A full turn on the spot, stepping round.
  spin: {
    duration: 2.0,
    keys: [
      [0.15, { hipsY: -0.1, armLZ: 0.5, armRZ: 0.5, happy: 1, smile: 0.4 }],
      [0.4, { yaw: PI * 0.45, legLX: 0.35, kneeL: 0.5, hipsY: 0.02 }],
      [0.65, { yaw: PI * 0.9, legLX: 0, kneeL: 0, legRX: 0.35, kneeR: 0.5, hipsY: -0.04 }],
      [0.9, { yaw: PI * 1.35, legRX: 0, kneeR: 0, legLX: 0.35, kneeL: 0.5, hipsY: 0.02 }],
      [1.15, { yaw: PI * 1.8, legLX: 0, kneeL: 0, legRX: 0.35, kneeR: 0.5, hipsY: -0.04 }],
      [1.4, { yaw: PI * 2, legRX: 0, kneeR: 0, hipsY: 0, armLZ: 0.9, armRZ: 0.9, open: 0.4 }, 'out'],
      [2.0, { yaw: PI * 2, armLZ: 0, armRZ: 0, happy: 0, open: 0, smile: 0 }],
    ],
  },

  // Looking around (searching, waiting, curious).
  lookAround: {
    duration: 3.8,
    keys: [
      [0.25, { lookX: -1 }],
      [0.6, { headY: -0.55, yaw: -0.12, spineY: -0.1, headZ: 0.05, earRX: -0.15 }],
      [1.3, { headY: -0.6, lookX: -1, headX: -0.05 }],
      [1.55, { lookX: 1 }],
      [2.1, { headY: 0.55, yaw: 0.12, spineY: 0.1, headZ: -0.05, earLX: -0.15, earRX: 0 }],
      [2.8, { headY: 0.6, lookX: 1, headX: -0.05 }],
      [3.05, { lookX: 0 }],
      [3.6, { headY: 0, yaw: 0, spineY: 0, headZ: 0, earLX: 0, headX: 0 }],
    ],
  },

  glanceUp: {
    duration: 2.2,
    keys: [
      [0.2, { lookY: 1, lookX: 0.3 }],
      [0.6, { headX: -0.18, headZ: -0.08, browRaise: 0.3 }],
      [1.5, { headX: -0.16, lookY: 1 }],
      [1.9, { headX: 0, headZ: 0, lookY: 0, lookX: 0, browRaise: 0 }],
    ],
  },

  smileAt: {
    duration: 1.6,
    keys: [
      [0.3, { headZ: 0.12, happy: 1, smile: 0.4, earLZ: 0.1, earRZ: 0.1 }],
      [1.1, { headZ: 0.1, happy: 1 }],
      [1.5, { headZ: 0, happy: 0 }],
    ],
  },

  earFlick: {
    duration: 0.7,
    keys: [
      [0.08, { earLZ: 0.55, earLX: -0.2 }],
      [0.2, { earLZ: -0.1, earLX: 0.05 }],
      [0.3, { earLZ: 0.3 }],
      [0.45, { earLZ: 0.0 }],
    ],
  },

  tailWag: {
    duration: 1.3,
    keys: [...wave(0.1, 7, 0.14, 'tailY', 0.7), [1.1, { tailY: 0 }]],
  },

  shift: {
    duration: 2.4,
    keys: [
      [0.6, { x: 0.12, hipsZ: 0.06, spineZ: -0.07, kneeR: 0.35, legRX: 0.12, headZ: -0.06 }],
      [1.6, { x: 0.12, hipsZ: 0.06, spineZ: -0.07, kneeR: 0.35, legRX: 0.12, headZ: -0.07 }],
      [2.3, { x: 0, hipsZ: 0, spineZ: 0, kneeR: 0, legRX: 0, headZ: 0 }],
    ],
  },

  // A big stretch with a yawn.
  stretch: {
    duration: 3.2,
    keys: [
      [0.5, { armLZ: 2.3, armRZ: 2.3, armLX: 0.2, armRX: 0.2, elbowL: 0.25, elbowR: 0.25, spineX: -0.14, headX: -0.25, squash: 0.06, blink: 1, open: 0.8, mouthW: -0.25, smile: -1, earLZ: 0.3, earRZ: 0.3 }],
      [1.5, { armLZ: 2.4, armRZ: 2.4, spineX: -0.17, headX: -0.28, squash: 0.08, open: 0.9 }],
      [2.1, { armLZ: 0.6, armRZ: 0.6, spineX: 0.05, headX: 0.08, squash: -0.03, open: 0, mouthW: 0, smile: 0.2, blink: 0.4, elbowL: 0.4, elbowR: 0.4 }],
      [2.6, { armLZ: 0, armRZ: 0, spineX: 0, headX: 0, squash: 0, blink: 0, smile: 0, earLZ: 0, earRZ: 0, elbowL: 0, elbowR: 0, armLX: 0, armRX: 0 }],
    ],
  },

  // Getting sleepy: yawn, then settle into sleep.
  yawn: {
    duration: 2.4,
    base: 'sleep',
    keys: [
      [0.5, { headX: -0.4, open: 0.85, mouthW: -0.25, smile: -1.3, blink: 1, armLX: 0.8, armLZ: -0.5, elbowL: 1.9, earLZ: 0.2, earRZ: 0.2 }],
      [1.4, { headX: -0.35, open: 0.8 }],
      [2.0, { headX: 0, open: 0, mouthW: 0, smile: 0, armLX: 0, armLZ: 0, elbowL: 0, earLZ: 0, earRZ: 0 }],
    ],
  },

  // Waking up from sleep.
  wake: {
    duration: 1.6,
    base: 'idle',
    keys: [
      [0.15, { blink: -0.5, wide: 0.8, earLZ: 0.5, earRZ: 0.5, headX: -0.15 }],
      [0.5, { y: 0.15, wide: 0.4, browRaise: 0.6 }],
      [0.8, { y: 0, hipsY: -0.08 }],
      [1.3, { wide: 0, earLZ: 0, earRZ: 0, headX: 0, browRaise: 0, hipsY: 0 }],
    ],
  },

  // Saving a reflection: hooves together over the heart.
  heart: {
    duration: 2.8,
    keys: [
      [0.4, { armLX: 1.0, armRX: 1.0, armLZ: -0.66, armRZ: -0.66, elbowL: 1.45, elbowR: 1.45, blink: 1, smile: 0.4, headZ: 0.14, headX: 0.08, blush: 0.6, earLZ: -0.1, earRZ: -0.1 }],
      [1.2, { spineZ: 0.04, headZ: 0.18 }],
      [1.9, { spineZ: -0.02, headZ: 0.12, blink: 1 }],
      [2.5, { armLX: 0, armRX: 0, armLZ: 0, armRZ: 0, elbowL: 0, elbowR: 0, blink: 0, smile: 0, headZ: 0, headX: 0, blush: 0, spineZ: 0 }],
    ],
  },

  // Settling into a sad moment, then finding a small smile.
  sigh: {
    duration: 2.6,
    keys: [
      [0.5, { headX: 0.25, earLZ: -0.4, earRZ: -0.4, browTilt: 1, smile: -1.4, blink: 0.5, spineX: 0.1, breathe: -2, armLZ: -0.3, armRZ: -0.3 }],
      [1.5, { headX: 0.2, blink: 0.2, lookY: -0.6 }],
      [2.2, { headX: -0.04, earLZ: -0.1, earRZ: -0.1, browTilt: 0.4, smile: -0.2, lookY: 0, spineX: 0, breathe: 0, armLZ: 0, armRZ: 0 }],
    ],
  },

  tapFoot: {
    duration: 1.4,
    keys: [
      [0.15, { legLX: 0.15, footLX: -0.35 }],
      [0.3, { footLX: 0.1 }],
      [0.45, { footLX: -0.35 }],
      [0.6, { footLX: 0.1 }],
      [0.75, { footLX: -0.35 }],
      [0.95, { footLX: 0, legLX: 0 }],
    ],
  },

  // While reading.
  turnPage: {
    duration: 1.4,
    keys: [
      [0.3, { armRZ: 0.35, armRX: 0.15, elbowR: 0.5, handRZ: 0.4, headY: -0.08, lookX: -0.6, bookFlip: 0.5 }],
      [0.65, { armRZ: -0.15, armRX: 0.1, handRZ: -0.3, headY: 0.06, lookX: 0.4, bookFlip: 1 }],
      [1.1, { armRZ: 0, armRX: 0, elbowR: 0, handRZ: 0, headY: 0, lookX: 0, bookFlip: 1 }],
      [1.4, { bookFlip: 0 }, 'step'],
    ],
  },

  readNod: {
    duration: 1.6,
    keys: [
      [0.3, { headX: 0.06, smile: 0.4, browRaise: 0.3 }],
      [0.6, { headX: -0.04 }],
      [0.9, { headX: 0.06 }],
      [1.3, { headX: 0, smile: 0, browRaise: 0 }],
    ],
  },

  // Opening a book to begin reading (the read base brings the book into the hooves).
  openBook: {
    duration: 1.5,
    base: 'read',
    keys: [
      [0.0, { bookOpen: -1 }],
      [0.55, { bookOpen: -1, headX: -0.1, browRaise: 0.4, smile: 0.3 }],
      [1.0, { bookOpen: 0, headX: 0.02 }, 'out'],
      [1.5, { browRaise: 0, smile: 0, headX: 0 }],
    ],
  },

  // Closing the book; the idle base puts it away.
  closeBook: {
    duration: 1.2,
    base: 'idle',
    keys: [
      [0.0, { bookOpen: 0 }],
      [0.3, { bookOpen: -1, happy: 1, headX: 0.1 }],
      [0.8, { happy: 0.6, headX: 0 }],
    ],
  },

  // Excited little dance (two side steps).
  dance: {
    duration: 3.0,
    keys: [
      [0.25, { x: -0.35, roll: -0.08, hipsY: -0.08, legRZ: 0.25, kneeR: 0.4, armLZ: 1.2, armRZ: 0.3, elbowL: 0.6, happy: 1, open: 0.4, headZ: -0.12, yaw: -0.2 }],
      [0.55, { x: -0.35, roll: 0, hipsY: 0, legRZ: 0, kneeR: 0, headZ: 0 }],
      [0.85, { x: 0.35, roll: 0.08, hipsY: -0.08, legLZ: 0.25, kneeL: 0.4, armLZ: 0.3, armRZ: 1.2, elbowR: 0.6, elbowL: 0, headZ: 0.12, yaw: 0.2 }],
      [1.15, { x: 0.35, roll: 0, hipsY: 0, legLZ: 0, kneeL: 0, headZ: 0 }],
      [1.45, { x: -0.35, roll: -0.08, hipsY: -0.08, legRZ: 0.25, kneeR: 0.4, armLZ: 1.2, armRZ: 0.3, elbowL: 0.6, elbowR: 0, headZ: -0.12, yaw: -0.2 }],
      [1.75, { x: -0.35, roll: 0, hipsY: 0, legRZ: 0, kneeR: 0, headZ: 0 }],
      [2.05, { x: 0.35, roll: 0.08, hipsY: -0.08, legLZ: 0.25, kneeL: 0.4, armLZ: 0.3, armRZ: 1.2, elbowR: 0.6, elbowL: 0, headZ: 0.12, yaw: 0.2 }],
      [2.35, { x: 0.35, roll: 0, hipsY: 0, legLZ: 0, kneeL: 0, headZ: 0 }],
      [2.85, { x: 0, yaw: 0, armLZ: 0, armRZ: 0, elbowR: 0, happy: 0, open: 0 }],
    ],
  },

  // A quick turn to look at something to the side, then back.
  peekRight: {
    duration: 1.8,
    keys: [
      [0.15, { lookX: 1 }],
      [0.45, { yaw: 0.5, headY: 0.25, spineY: 0.08, legLX: 0.15, kneeL: 0.3 }],
      [0.6, { legLX: 0, kneeL: 0 }],
      [1.2, { yaw: 0.5, headY: 0.25, lookX: 0.8 }],
      [1.65, { yaw: 0, headY: 0, spineY: 0, lookX: 0 }],
    ],
  },
  peekLeft: {
    duration: 1.8,
    keys: [
      [0.15, { lookX: -1 }],
      [0.45, { yaw: -0.5, headY: -0.25, spineY: -0.08, legRX: 0.15, kneeR: 0.3 }],
      [0.6, { legRX: 0, kneeR: 0 }],
      [1.2, { yaw: -0.5, headY: -0.25, lookX: -0.8 }],
      [1.65, { yaw: 0, headY: 0, spineY: 0, lookX: 0 }],
    ],
  },
};
