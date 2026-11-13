import * as THREE from "three";
import { CARD_W, CARD_H, CORNER_R } from "../card/geometry.js";

// Light effects around one card in the reveal, all additive and cheap:
//   halo   a plane behind the card (it doesn't turn with it): edge glow in the rarity colour,
//          light rays, and an expanding shock ring
//   sheen  a band of light that sweeps the face once it's up (turns with the card)
//   leak   light breaking out of the back before the turn: cracks and edges (legendary, mythic)
//   stamp  a hot plate slamming onto the print number (mythic)
// Each slot has its own uniforms; the reveal sets them every frame.

const HALO_PAD = 1.1;

const roundRect = /* glsl */ `
float rrect(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
`;

const planeVert = /* glsl */ `
varying vec2 vP;
void main() {
  vP = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const haloFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uGlow;
uniform float uRays;
uniform float uRing;     // 0..1 progress of the shock ring
uniform float uRingA;
uniform float uTime;
uniform vec2 uHalf;
varying vec2 vP;
${roundRect}
void main() {
  float d = rrect(vP, uHalf, ${CORNER_R.toFixed(3)});
  float out_ = max(d, 0.0);
  // tight edge glow + broad soft bloom
  float g = exp(-out_ * 9.0) * 0.9 + exp(-out_ * 4.0) * 0.3;
  g *= smoothstep(-0.05, 0.0, d);
  // soft limit: a strong glow gets wider in colour, never a white band
  float gi = g * uGlow;
  vec3 col = uColor * gi / (1.0 + gi * 0.6);
  // rays: soft spokes turning slowly, from behind the card
  float a = atan(vP.y, vP.x);
  float spokes = pow(0.5 + 0.5 * sin(a * 9.0 + uTime * 0.5 + sin(a * 4.0 - uTime * 0.3) * 1.6), 5.0)
               + 0.6 * pow(0.5 + 0.5 * sin(a * 23.0 - uTime * 0.8), 9.0);
  float rays = spokes * exp(-out_ * 1.15) * smoothstep(0.0, 0.08, d);
  col += mix(uColor, vec3(1.0), 0.25) * rays * uRays * 0.55;
  // shock ring
  float R = uRing * 1.05;
  float ring = exp(-pow((d - R) * 16.0, 2.0)) * (1.0 - uRing) * smoothstep(-0.02, 0.02, d);
  float ri = ring * uRingA * 1.6;
  col += mix(uColor, vec3(1.0), 0.2) * ri / (1.0 + ri * 0.5);
  // reach zero well inside the plane's edge (linear light + bloom show even a faint cut)
  col *= 1.0 - smoothstep(0.6, ${(HALO_PAD * 0.98).toFixed(3)}, out_);
  gl_FragColor = vec4(col, 1.0);
}
`;

const sheenFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uSheen;    // band position along the diagonal; outside about +-1.6 it's gone
uniform float uA;
uniform vec2 uHalf;
varying vec2 vP;
${roundRect}
void main() {
  float d = rrect(vP, uHalf, ${CORNER_R.toFixed(3)});
  if (d > 0.0) discard;
  float x = dot(vP, normalize(vec2(0.55, 1.0))) - uSheen;
  float band = exp(-x * x * 30.0) + exp(-x * x * 4.0) * 0.25;
  vec3 col = mix(uColor, vec3(1.0), 0.55) * band * uA * 0.55;
  gl_FragColor = vec4(col, 1.0);
}
`;

const leakFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uLeak;
uniform float uTime;
uniform sampler2D uNoise;
uniform vec2 uHalf;
varying vec2 vP;
${roundRect}
void main() {
  float d = rrect(vP, uHalf, ${CORNER_R.toFixed(3)});
  if (d > 0.0) discard;
  // cracks: zero-crossings of noise, opening up as the leak grows
  vec2 w = (texture2D(uNoise, vP * 0.21 + 0.3).rg - 0.5) * 0.35;
  float n = texture2D(uNoise, vP * 0.33 + w + vec2(0.0, uTime * 0.01)).b;
  float width = mix(26.0, 7.0, uLeak);
  float crack = pow(1.0 - abs(n - 0.5) * 2.0, width) * smoothstep(0.0, 0.35, uLeak);
  // light through the edges, strongest first
  float edge = exp(d * 22.0) * smoothstep(0.0, 0.25, uLeak);
  float flick = 0.85 + 0.15 * sin(uTime * 23.0 + vP.y * 9.0);
  vec3 hot = mix(uColor, vec3(1.0, 0.97, 0.9), 0.5);
  vec3 col = (hot * crack * 1.5 + uColor * edge * 0.9) * uLeak * flick;
  gl_FragColor = vec4(col, 1.0);
}
`;

const stampFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uA;
varying vec2 vP;
${roundRect}
void main() {
  float d = rrect(vP, vec2(0.5, 0.5), 0.08);
  float fill = smoothstep(0.02, -0.02, d);
  float rim = exp(-abs(d) * 40.0);
  float glow = exp(-max(d, 0.0) * 9.0);
  vec3 col = (mix(uColor, vec3(1.0, 0.9, 0.8), 0.5) * (fill * 0.35 + rim * 1.2) + uColor * glow * 0.5) * uA;
  col *= 1.0 - smoothstep(0.3, 0.5, max(abs(vP.x), abs(vP.y)));
  gl_FragColor = vec4(col, 1.0);
}
`;

let geos = null;
function geometries() {
  if (geos) return geos;
  geos = {
    halo: new THREE.PlaneGeometry(CARD_W + HALO_PAD * 2, CARD_H + HALO_PAD * 2),
    face: new THREE.PlaneGeometry(CARD_W, CARD_H),
    unit: new THREE.PlaneGeometry(1, 1),
  };
  return geos;
}

// (three's non-premultiplied additive blend is SRC_ALPHA, ONE: the shaders write alpha 1)
const additive = (fragmentShader, uniforms, side = THREE.FrontSide) =>
  new THREE.ShaderMaterial({
    vertexShader: planeVert,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side,
  });

export function createSlotFx(noise) {
  const g = geometries();
  const half = new THREE.Vector2(CARD_W / 2, CARD_H / 2);
  const color = new THREE.Color(1, 1, 1);
  const time = { value: 0 };

  const halo = new THREE.Mesh(
    g.halo,
    additive(haloFrag, {
      uColor: { value: color },
      uGlow: { value: 0 },
      uRays: { value: 0 },
      uRing: { value: 0 },
      uRingA: { value: 0 },
      uTime: time,
      uHalf: { value: half },
    }),
  );
  halo.position.z = -0.09;
  halo.renderOrder = 1;

  const sheen = new THREE.Mesh(g.face, additive(sheenFrag, { uColor: { value: color }, uSheen: { value: 9 }, uA: { value: 0 }, uHalf: { value: half } }));
  sheen.position.z = 0.0115;
  sheen.renderOrder = 2;

  const leak = new THREE.Mesh(
    g.face,
    additive(leakFrag, { uColor: { value: color }, uLeak: { value: 0 }, uTime: time, uNoise: { value: noise.noiseB }, uHalf: { value: half } }),
  );
  leak.position.z = -0.0115;
  leak.rotation.y = Math.PI;
  leak.renderOrder = 2;

  const stamp = new THREE.Mesh(g.unit, additive(stampFrag, { uColor: { value: color }, uA: { value: 0 } }));
  stamp.position.z = 0.013;
  stamp.renderOrder = 3;

  const all = [halo, sheen, leak, stamp];
  return {
    halo,
    sheen,
    leak,
    stamp,
    color,
    time,
    // Applies this frame's values; meshes with nothing to show are skipped by the renderer.
    apply(v) {
      const hu = halo.material.uniforms;
      // scaled down: the post pass's bloom spreads it further
      hu.uGlow.value = v.glow * 0.65;
      hu.uRays.value = v.rays;
      hu.uRing.value = v.ring;
      hu.uRingA.value = v.ringA;
      halo.visible = v.glow > 0.002 || v.rays > 0.002 || (v.ringA > 0.002 && v.ring < 1);
      sheen.material.uniforms.uSheen.value = v.sheen;
      sheen.material.uniforms.uA.value = v.sheenA;
      sheen.visible = v.sheenA > 0.002 && Math.abs(v.sheen) < 1.95;
      leak.material.uniforms.uLeak.value = v.leak;
      leak.visible = v.leak > 0.002;
      stamp.material.uniforms.uA.value = v.stampA;
      stamp.visible = v.stampA > 0.002;
    },
    // where the print-number plate sits on the face, from the card's uStampRect (uv corners)
    placeStamp(rect, scale) {
      const [x0, y0, x1, y1] = rect;
      stamp.position.x = ((x0 + x1) / 2 - 0.5) * CARD_W;
      stamp.position.y = ((y0 + y1) / 2 - 0.5) * CARD_H;
      stamp.scale.set((x1 - x0) * CARD_W * scale, (y1 - y0) * CARD_H * scale, 1);
    },
    dispose() {
      for (const m of all) m.material.dispose();
    },
  };
}

// A dark veil between the spread and a card brought forward.
export function createVeil() {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshBasicMaterial({ color: 0x020304, transparent: true, opacity: 0, depthWrite: false }),
  );
  m.position.z = 0.45;
  m.renderOrder = 4;
  m.visible = false;
  return m;
}
