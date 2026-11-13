import * as THREE from "three";
import { head } from "../materials/shared.glsl.js";
import { createLightUniforms } from "../materials/index.js";
import { PACK_W, PACK_H, SEAL_H, TEAR_Y } from "./packMesh.js";

// The pouch's foil, lit by the same showroom as the cards (studioEnv, key lamp, rim):
//   - bare foil: a metal mirror in the pack's foil colour, crinkled by soft wrinkles and sharp
//     creases, with holographic film where the art asks for it
//   - printed ink: ink on metallised film (some metal still shows through), gloss varnish on the
//     rings, mark and grid, embossed type
//   - crimped seals: fine vertical ridges, pinked (zig-zag) top and bottom edges
//   - the tear: a ragged line under the top seal that splits body and cap once torn
//   - mythic only: ember veins smouldering under the ink
// Plus the show's light: an idle sweep across the pouch and light gathering at the tear line.

const vertexShader = /* glsl */ `
attribute float aSide;
varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying vec3 vTangentW;
varying vec3 vBitangentW;
varying vec3 vCardZ;
varying vec2 vLocal;
varying float vSide;

void main() {
  vUv = uv;
  vLocal = position.xy;
  vSide = aSide;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  mat3 m = mat3(modelMatrix);
  vNormalW = normalize(m * normal);
  vTangentW = normalize(m * vec3(aSide > 0.5 ? 1.0 : -1.0, 0.0, 0.0));
  vBitangentW = normalize(m * vec3(0.0, 1.0, 0.0));
  vCardZ = normalize(m * vec3(0.0, 0.0, 1.0));
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const fragmentShader = head + /* glsl */ `
uniform sampler2D uColF;
uniform sampler2D uMaskF;
uniform sampler2D uColB;
uniform sampler2D uMaskB;
uniform vec2 uTexel;
uniform vec2 uSize;
uniform float uSealH;
uniform float uTearY;
uniform float uPart;     // 0 body, 1 cap
uniform float uTorn;     // 0 sealed, 1 torn (the cut goes ragged)
uniform float uHolo;
uniform float uEmber;
uniform float uSweep;    // position of the light sweep along the diagonal; off when far out
uniform float uGather;   // 0..1 light gathering at the tear line
uniform vec3 uTrim;      // linear trim colour
uniform float uLift;     // hover: a touch more light
uniform float uFade;     // 1 visible
varying float vSide;

float tri(float x) { return abs(fract(x) - 0.5) * 2.0; }

void main() {
  vec2 p = vLocal;
  // pinked top and bottom edges
  float pink = tri(p.x / 0.05) * 0.02;
  if (abs(p.y) > uSize.y * 0.5 - pink) discard;
  // the tear: straight before, ragged after
  float rag = (tri(p.x / 0.083 + 0.3) - 0.5) * 0.03 + (hash12(vec2(floor(p.x / 0.021), 3.0)) - 0.5) * 0.018;
  float cut = uTearY + rag * uTorn;
  if (uPart < 0.5 && p.y > cut) discard;
  if (uPart > 0.5 && p.y < cut) discard;

  Surf s = surf();
  bool front = vSide > 0.5;
  vec2 uv = vUv;
  vec3 base = front ? texture2D(uColF, uv).rgb : texture2D(uColB, uv).rgb;
  vec4 mk = front ? texture2D(uMaskF, uv) : texture2D(uMaskB, uv);

  // inside of the pouch, seen through the torn top: dull silver
  if (!gl_FrontFacing) {
    s.Ng = -s.Ng;
    vec3 Ni = perturb(s, (texture2D(uNoiseB, p * 0.8).rg - 0.5) * 0.4);
    vec3 c = envSpec(Ni, s.V, vec3(0.35), 0.4) * 0.5 + vec3(0.02);
    gl_FragColor = vec4(shoulder(c) * uFade, 1.0);
    #include <colorspace_fragment>
    return;
  }

  // emboss
  float ex = (front ? texture2D(uMaskF, uv + vec2(uTexel.x, 0.0)).b - texture2D(uMaskF, uv - vec2(uTexel.x, 0.0)).b
                    : texture2D(uMaskB, uv + vec2(uTexel.x, 0.0)).b - texture2D(uMaskB, uv - vec2(uTexel.x, 0.0)).b);
  float ey = (front ? texture2D(uMaskF, uv + vec2(0.0, uTexel.y)).b - texture2D(uMaskF, uv - vec2(0.0, uTexel.y)).b
                    : texture2D(uMaskB, uv + vec2(0.0, uTexel.y)).b - texture2D(uMaskB, uv - vec2(0.0, uTexel.y)).b);
  vec2 g = -vec2(ex, ey) * 4.0;

  // foil wrinkles: soft dents plus a few sharp creases, stronger toward the seals and sides
  float inner = uSize.y * 0.5 - uSealH;
  float edgeNear = max(smoothstep(inner - 0.35, inner, abs(p.y)), smoothstep(uSize.x * 0.5 - 0.3, uSize.x * 0.5, abs(p.x)));
  vec2 q = p * 0.42 + 0.17;
  float e = 0.012;
  float h0 = texture2D(uNoiseB, q).a;
  float hx = texture2D(uNoiseB, q + vec2(e, 0.0)).a - h0;
  float hy = texture2D(uNoiseB, q + vec2(0.0, e)).a - h0;
  vec2 q2 = p * vec2(0.9, 0.6) + 0.5;
  float c0 = abs(texture2D(uNoiseB, q2).b - 0.5);
  float cx = abs(texture2D(uNoiseB, q2 + vec2(e, 0.0)).b - 0.5) - c0;
  float cy = abs(texture2D(uNoiseB, q2 + vec2(0.0, e)).b - 0.5) - c0;
  float crease = 1.0 - smoothstep(0.0, 0.05, c0);
  // crimped seals: fine vertical ridges (the seal is pressed flat, so no wrinkles there)
  float seal = smoothstep(inner - 0.004, inner + 0.006, abs(p.y));
  g += ((vec2(hx, hy) * (2.6 + 4.0 * edgeNear) - vec2(cx, cy) * 7.0 * crease * (0.4 + edgeNear))) * (1.0 - 0.85 * seal);
  // (faded out where a ridge gets close to a pixel wide, or it aliases into streaks)
  float ridgeAA = 1.0 - smoothstep(0.25, 0.5, fwidth(p.x) / 0.04);
  g.x += sin(p.x * 6.2831 / 0.04) * 0.35 * seal * ridgeAA;
  // fin seal down the back
  if (!front) g.x += sin(p.x * 6.2831 / 0.03) * 0.3 * ridgeAA * (1.0 - smoothstep(0.03, 0.04, abs(p.x)));
  vec3 N = perturb(s, g);

  float t = uTime;
  float NoV = sat1(dot(N, s.V));
  // holographic film
  float phase = dot(s.V, s.T) * 1.4 + dot(s.V, s.B) * 0.9 + uv.x * 1.6 + uv.y * 0.8 + h0 * 0.8;
  vec3 rainbow = 0.55 + 0.45 * cos(6.2831853 * (phase + vec3(0.0, 0.33, 0.67)));
  float holo = uHolo * max(mk.a, seal * 0.4) ;

  // bare foil
  vec3 F0 = mix(base, rainbow * mix(vec3(1.0), base * 1.4 + 0.2, 0.35), holo);
  F0 = clamp(F0, 0.0, 1.0);
  vec3 foil = keySpec(N, s.V, F0, 0.2) * 1.1 + envSpec(N, s.V, F0, 0.17) * 1.35 + F0 * 0.05;

  // ink on metallised film
  float rough = mix(0.42, 0.13, mk.g);
  vec3 ink = base * printLight(N) * 0.85
           + envSpec(N, s.V, base * 0.6 + 0.03, 0.32) * 0.55
           + keySpec(N, s.V, vec3(0.04), rough) * 0.9 + envSpec(N, s.V, vec3(0.04), rough) * (0.4 + 0.6 * mk.g);

  vec3 col = mix(ink, foil, mk.r);

  // mythic: ember veins under the ink
  if (uEmber > 0.0) {
    vec2 w = (texture2D(uNoiseB, p * 0.3 + vec2(0.0, t * 0.01)).rg - 0.5) * 0.5;
    float n2 = texture2D(uNoiseB, p * 0.38 + w + vec2(t * 0.006, -t * 0.008)).b;
    float vein = pow(1.0 - abs(n2 - 0.5) * 2.0, 28.0);
    float pulse = 0.55 + 0.45 * sin(t * 0.9 + h0 * 8.0);
    col += mix(vec3(0.5, 0.03, 0.01), vec3(1.8, 0.45, 0.08), vein * pulse) * vein * pulse * (1.0 - mk.r) * (1.0 - mk.g * 0.6) * uEmber;
  }

  // light sweep: a soft diagonal band that crosses the pouch
  float d = dot(p, normalize(vec2(0.62, 1.0))) - uSweep;
  float band = exp(-d * d * 22.0);
  col += band * mix(vec3(0.08), F0 * 1.2 + 0.15, mk.r) * (0.5 + 0.5 * pow(1.0 - NoV, 0.5));

  // light gathering at the tear line
  float gl = exp(-abs(p.y - uTearY) * 14.0) * uGather;
  col += uTrim * gl * (1.2 + 1.2 * uGather) + uTrim * uGather * uGather * 0.12;

  // rim, and a lift on hover
  col += pow(1.0 - NoV, 3.0) * uTrim * 0.12;
  col *= 1.0 + uLift * 0.12;

  gl_FragColor = vec4(shoulder(col) * uFade, 1.0);
  #include <colorspace_fragment>
}
`;

export function createPackMaterial(noise) {
  const uniforms = {
    ...createLightUniforms(noise),
    uColF: { value: null },
    uMaskF: { value: null },
    uColB: { value: null },
    uMaskB: { value: null },
    uTexel: { value: new THREE.Vector2(1 / 720, 1 / 1040) },
    uSize: { value: new THREE.Vector2(PACK_W, PACK_H) },
    uSealH: { value: SEAL_H },
    uTearY: { value: TEAR_Y },
    uTorn: { value: 0 },
    uHolo: { value: 0 },
    uEmber: { value: 0 },
    uSweep: { value: 9 },
    uGather: { value: 0 },
    uTrim: { value: new THREE.Color(1, 1, 1) },
    uLift: { value: 0 },
  };
  const make = (part) =>
    new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
      // body and cap fade separately (the cap goes first)
      uniforms: { ...uniforms, uPart: { value: part }, uFade: { value: 1 } },
    });
  return { uniforms, body: make(0), cap: make(1) };
}
