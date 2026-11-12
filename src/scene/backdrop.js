import * as THREE from "three";

// The showroom behind the card, drawn as one full-screen pass: a near-black room, a spotlight
// beam from above onto the card, a halo in the rarity colour, and a faint perspective floor grid
// in brand green below the card (the arcade part). Dithered so the dark gradients don't band.

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.9999, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uAccent;
uniform vec3 uGreen;
uniform vec2 uCenter;     // card centre in pixels (from bottom-left)
uniform float uCardH;     // card height in pixels
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec2 px = vUv * uRes;
  vec2 p = (px - uCenter) / uCardH;           // card heights from the card centre
  vec3 col = mix(vec3(0.0035, 0.0045, 0.006), vec3(0.011, 0.013, 0.017), smoothstep(-1.0, 1.2, p.y));

  // spotlight beam from above, widening as it falls
  float beamW = 0.2 + max(0.0, 1.4 - p.y) * 0.14;
  float beam = exp(-pow(p.x / beamW, 2.0) * 1.6) * smoothstep(-0.9, 0.6, p.y);
  float haze = 0.75 + 0.25 * sin(p.y * 7.0 - uTime * 0.35 + sin(p.x * 5.0 + uTime * 0.2));
  col += vec3(0.026, 0.029, 0.032) * beam * haze;

  // rarity halo behind the card, tight so a narrow phone screen stays dark at its sides
  float r = length(p * vec2(1.35, 0.95));
  col += uAccent * 0.035 * exp(-r * r * 3.2);

  // floor: a horizon below the card and a receding grid
  float horizon = -0.6;
  if (p.y < horizon) {
    float depth = (horizon - p.y);
    float z = 0.18 / depth;                       // distance into the floor
    float gx = p.x * z * 5.0;
    float gz = z * 3.0 + uTime * 0.12;
    vec2 gd = abs(fract(vec2(gx, gz)) - 0.5) / fwidth(vec2(gx, gz));
    float line = 1.0 - min(min(gd.x, gd.y), 1.0);
    float fade = smoothstep(0.0, 0.25, depth) * exp(-z * 0.35);
    col += uGreen * line * fade * 0.05;
    // pool of light under the card
    col += vec3(0.06, 0.065, 0.07) * exp(-pow(p.x / 0.45, 2.0) - pow(depth / 0.18, 2.0)) * 0.5;
    col += uAccent * 0.025 * exp(-pow(p.x / 0.5, 2.0) - pow(depth / 0.1, 2.0));
  }
  // neon horizon line
  col += uGreen * 0.05 * exp(-pow((p.y - horizon) * 90.0, 2.0)) * exp(-p.x * p.x * 0.5);

  // vignette
  vec2 q = vUv - 0.5;
  col *= 1.0 - dot(q, q) * 1.1;
  // dither
  col += (hash(px + fract(uTime)) - 0.5) / 255.0;
  gl_FragColor = vec4(max(col, 0.0), 1.0);
  #include <colorspace_fragment>
}
`;

export function createBackdrop() {
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uRes: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uAccent: { value: new THREE.Color(1, 1, 1) },
      uGreen: { value: new THREE.Color(0.32, 0.8, 0.5) },
      uCenter: { value: new THREE.Vector2(0, 0) },
      uCardH: { value: 500 },
    },
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  return { mesh, uniforms: material.uniforms };
}
