import * as THREE from "three";

// Dust drifting through the spotlight. Positions are animated in the vertex shader from a
// per-particle seed, so the CPU does nothing per frame.

const vertexShader = /* glsl */ `
attribute vec4 seed;
uniform float uTime;
uniform float uPixel;
varying float vAlpha;
void main() {
  vec3 p = vec3((seed.x - 0.5) * 5.0, 0.0, -0.2 - seed.z * 2.2);
  float rise = fract(seed.y + uTime * (0.012 + seed.w * 0.02));
  p.y = mix(-2.2, 2.6, rise);
  p.x += sin(uTime * 0.3 + seed.w * 20.0) * 0.12;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float beam = exp(-p.x * p.x * 0.9);
  vAlpha = beam * smoothstep(0.0, 0.15, rise) * (1.0 - smoothstep(0.8, 1.0, rise)) * (0.25 + 0.75 * seed.w);
  gl_PointSize = uPixel * (1.0 + 2.2 * seed.w) / -mv.z;
}
`;

const fragmentShader = /* glsl */ `
varying float vAlpha;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.0, length(d)) * vAlpha;
  gl_FragColor = vec4(vec3(0.75, 0.8, 0.85) * a * 0.35, 0.0);
}
`;

export function createDust(count = 140) {
  const g = new THREE.BufferGeometry();
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
  g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
  g.setAttribute("seed", new THREE.Float32BufferAttribute(seeds, 4));
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPixel: { value: 6 } },
  });
  const points = new THREE.Points(g, material);
  points.frustumCulled = false;
  return { points, uniforms: material.uniforms };
}
