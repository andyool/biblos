// Flat two-tone shading that matches the reference art: every surface is cream where it
// faces the viewer and slightly upward, and turns gold towards its lower and outer edges.
// Overlapping fleece puffs therefore get the same scalloped gold borders as the drawings.
import * as THREE from 'three';

const vertex = /* glsl */ `
#include <common>
#include <skinning_pars_vertex>
attribute float aSide;
varying vec3 vN;
varying vec3 vLocal;
varying vec2 vUv2;
varying float vSide;
void main() {
  #include <beginnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <defaultnormal_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  #include <project_vertex>
  vN = normalize(transformedNormal);
  vLocal = position;
  #ifdef USE_UV2
  vUv2 = uv;
  #endif
  vSide = aSide;
}`;

const fragment = /* glsl */ `
uniform vec3 uLight;
uniform vec3 uDark;
uniform vec3 uDeep;
uniform vec3 uDir;
uniform float uCut;
uniform float uDeepCut;
uniform float uOpacity;
#ifdef FACE
uniform sampler2D uFace;
#endif
#ifdef EAR
uniform vec3 uInner;
uniform vec3 uInner2;
#endif
#ifdef HOOF
uniform float uCleft;
#endif
varying vec3 vN;
varying vec3 vLocal;
varying vec2 vUv2;
varying float vSide;

float band(float s, float cut) {
  float w = max(fwidth(s) * 0.8, 1e-4);
  return smoothstep(cut - w, cut + w, s);
}

void main() {
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  float s = dot(N, normalize(uDir));
  vec3 col = mix(uDeep, uDark, band(s, uDeepCut));
  col = mix(col, uLight, band(s, uCut));
  #ifdef EAR
  if (vSide > 0.5) {
    float u = vUv2.x, v = abs(vUv2.y);
    float inner = (1.0 - smoothstep(0.66, 0.70, v + u * 0.1)) * smoothstep(0.08, 0.12, u) * (1.0 - smoothstep(0.88, 0.92, u + v * 0.25));
    vec3 ic = mix(uInner, uInner2, smoothstep(0.55, 0.6, u + v * 0.35));
    col = mix(col, ic, inner);
  }
  #endif
  #ifdef HOOF
  float c = smoothstep(0.55, 1.0, abs(vLocal.x) / max(uCleft, 1e-3));
  col = mix(uDeep, col, max(c, step(vLocal.z, 0.0)));
  #endif
  #ifdef FACE
  vec3 p = vLocal;
  float yaw = atan(p.x, p.z);
  float pitch = atan(p.y, length(p.xz));
  vec2 fuv = vec2(yaw, pitch) / (3.14159265 * 0.8) + 0.5;
  vec4 f = texture2D(uFace, fuv);
  col = mix(col, f.rgb, f.a * step(0.0, p.z + 0.4));
  #endif
  gl_FragColor = vec4(col, uOpacity);
}`;

// Colours are authored as sRGB and written straight out, so the flat palette survives exactly.
export const raw = (hex) => new THREE.Color().setStyle(hex, THREE.LinearSRGBColorSpace);

export const DIR = new THREE.Vector3(0.12, 0.5, 1).normalize();

export function toon({ light, dark, deep = dark, cut = 0.5, deepCut = -2, face = null, ear = null, hoof = null }) {
  const defines = {};
  const uniforms = {
    uLight: { value: raw(light) },
    uDark: { value: raw(dark) },
    uDeep: { value: raw(deep) },
    uDir: { value: DIR.clone() },
    uCut: { value: cut },
    uDeepCut: { value: deepCut },
    uOpacity: { value: 1 },
  };
  if (face) { defines.FACE = ''; uniforms.uFace = { value: face }; }
  if (ear) {
    defines.EAR = ''; defines.USE_UV2 = '';
    uniforms.uInner = { value: raw(ear.inner) };
    uniforms.uInner2 = { value: raw(ear.inner2) };
  }
  if (hoof) { defines.HOOF = ''; uniforms.uCleft = { value: hoof.cleft }; }
  const m = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms, defines, side: THREE.FrontSide });
  return m;
}
