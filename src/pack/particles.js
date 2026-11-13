import * as THREE from "three";
import { rng } from "./pulls.js";

// One pool of GPU particles for the whole pack screen. A burst writes its particles' start state
// (origin, velocity, birth time, life, size, colour, kind) into the pool once; the vertex shader
// works out where each one is from its age, so the CPU does nothing per frame and a frozen clock
// shows a frozen, exact frame.
//
// Kinds:
//   0 foil shard  a tumbling sliver of foil that glints as it turns; falls with drag
//   1 spark       a hot streak drawn along its motion; gravity and drag
//   2 ember       a glowing mote that rises, sways and flickers
//   3 glow        a soft round mote; drag only (landing puffs, sparkle)
//
// Each particle also has its own drag and gravity scale (aMove): the big reveals throw theirs
// with little drag so they cross the whole screen instead of puffing round the card. Points are
// capped in size and fade out before they reach the lens, so nothing thrown at the camera
// becomes a screen-sized blob.

const vertexShader = /* glsl */ `
attribute vec3 aVel;
attribute vec4 aLife;     // birth, life, size, kind
attribute vec4 aColor;    // rgb, seed
attribute vec2 aMove;     // drag scale, gravity scale
uniform float uTime;
uniform float uPixel;
uniform float uMaxPx;
varying vec3 vColor;
varying float vAlpha;
varying float vKind;
varying float vAngle;
varying float vStretch;
varying float vGlint;

void main() {
  float age = uTime - aLife.x;
  float life = aLife.y;
  float kind = aLife.w;
  float seed = aColor.a;
  vKind = kind;
  vColor = aColor.rgb;
  if (age < 0.0 || age > life) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    vAlpha = 0.0;
    return;
  }
  float k = age / life;
  vec3 g = vec3(0.0);
  float drag = 1.2;
  if (kind < 0.5) { g = vec3(0.0, -2.6, 0.0); drag = 1.6; }
  else if (kind < 1.5) { g = vec3(0.0, -3.2, 0.0); drag = 2.2; }
  else if (kind < 2.5) { g = vec3(0.0, 0.45, 0.0); drag = 1.4; }
  else { drag = 3.0; }
  drag *= aMove.x;
  g *= aMove.y;
  float dv = (1.0 - exp(-drag * age)) / drag;
  vec3 p = position + aVel * dv + 0.5 * g * age * age;
  if (kind > 1.5 && kind < 2.5) {
    p.x += sin(age * 2.3 + seed * 40.0) * 0.08 * age;
    p.z += cos(age * 1.7 + seed * 23.0) * 0.05 * age;
  }
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  float size = aLife.z;
  float fade = 1.0;
  if (kind < 0.5) {
    fade = 1.0 - smoothstep(0.7, 1.0, k);
    float ang = seed * 6.2831 + age * (6.0 + seed * 10.0) * (seed > 0.5 ? 1.0 : -1.0);
    vAngle = ang;
    vGlint = pow(abs(sin(ang * 1.3 + seed * 3.0)), 10.0);
    vStretch = 0.35 + 0.65 * abs(cos(ang * 0.7));
  } else if (kind < 1.5) {
    fade = 1.0 - k;
    // direction of travel on screen, for the streak
    vec3 vNow = aVel * exp(-drag * age) + g * age;
    vec4 a = projectionMatrix * mv;
    vec4 b = projectionMatrix * (modelViewMatrix * vec4(p + vNow * 0.02, 1.0));
    vec2 d = b.xy / b.w - a.xy / a.w;
    vAngle = atan(d.y, d.x);
    vStretch = clamp(length(vNow) * 0.5, 0.15, 1.0);
    size *= 1.0 + vStretch * 1.5;
  } else if (kind < 2.5) {
    fade = smoothstep(0.0, 0.12, k) * (1.0 - smoothstep(0.55, 1.0, k));
    fade *= 0.65 + 0.35 * sin(age * 13.0 + seed * 50.0);
  } else {
    fade = smoothstep(0.0, 0.1, k) * (1.0 - k) * (1.0 - k);
  }
  // fade out near the lens rather than fill the screen
  fade *= smoothstep(0.8, 2.2, -mv.z);
  vAlpha = fade;
  gl_PointSize = min(uPixel * size / max(-mv.z, 0.1), uMaxPx);
}
`;

const fragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
varying float vKind;
varying float vAngle;
varying float vStretch;
varying float vGlint;

void main() {
  vec2 q = gl_PointCoord - 0.5;
  q.y = -q.y;
  float a = 0.0;
  vec3 col = vColor;
  if (vKind < 0.5) {
    // a thin tumbling sliver: a rotated, foreshortened diamond
    float c = cos(vAngle), s = sin(vAngle);
    vec2 r = vec2(c * q.x - s * q.y, s * q.x + c * q.y);
    r.x /= vStretch;
    float d = abs(r.x) * 1.7 + abs(r.y) * 2.6;
    a = 1.0 - smoothstep(0.75, 0.95, d);
    col = vColor * (0.25 + 0.5 * vStretch) + vec3(1.0) * vGlint * 1.6;
  } else if (vKind < 1.5) {
    float c = cos(vAngle), s = sin(vAngle);
    vec2 r = vec2(c * q.x + s * q.y, -s * q.x + c * q.y);
    float len = 0.12 + 0.36 * vStretch;
    float d = length(vec2(max(abs(r.x) - len, 0.0), r.y));
    a = exp(-d * d * 900.0) + exp(-d * d * 90.0) * 0.35;
    col = mix(vColor, vec3(1.0, 0.95, 0.85), exp(-d * d * 2500.0));
  } else {
    float d = length(q);
    a = exp(-d * d * 40.0) * 0.9 + exp(-d * d * 400.0) * 0.6;
  }
  a *= vAlpha;
  if (a < 0.003) discard;
  gl_FragColor = vec4(col * a, 1.0);
}
`;

export const KIND = { shard: 0, spark: 1, ember: 2, glow: 3 };

export class Particles {
  constructor(capacity, scale = 1) {
    this.capacity = capacity;
    this.scale = scale;
    this.next = 0;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(capacity * 3);
    this.vel = new Float32Array(capacity * 3);
    this.life = new Float32Array(capacity * 4);
    this.col = new Float32Array(capacity * 4);
    this.move = new Float32Array(capacity * 2).fill(1);
    // all dead until spawned
    for (let i = 0; i < capacity; i++) this.life[i * 4] = -1e6;
    g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute("aVel", new THREE.BufferAttribute(this.vel, 3));
    g.setAttribute("aLife", new THREE.BufferAttribute(this.life, 4));
    g.setAttribute("aColor", new THREE.BufferAttribute(this.col, 4));
    g.setAttribute("aMove", new THREE.BufferAttribute(this.move, 2));
    this.geometry = g;
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPixel: { value: 600 }, uMaxPx: { value: 120 } },
    });
    this.points = new THREE.Points(g, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    this.dirty = false;
  }

  get uniforms() {
    return this.material.uniforms;
  }

  // origin: Vector3-like; dir: preferred direction (normalised inside), cone: 0 = along dir,
  // 1 = any direction; speed / life / size: [min, max]; colors: list of [r, g, b] (linear);
  // drag, gravity: scales on the kind's own (low drag throws them across the screen); flat:
  // squashes the depth of the direction (0 = in the card's plane, 1 = as rolled).
  burst({ kind, count, at, origin, dir = [0, 1, 0], cone = 1, speed = [1, 2], life = [0.6, 1.2], size = [0.03, 0.06], colors = [[1, 1, 1]], spread = [0, 0, 0], seed = 1, drag = 1, gravity = 1, flat = 1 }) {
    const n = Math.max(1, Math.round(count * this.scale));
    const rand = rng(Math.floor(seed * 9973 + at * 1000));
    const d = new THREE.Vector3(...dir).normalize();
    const v = new THREE.Vector3();
    for (let j = 0; j < n; j++) {
      const i = this.next;
      this.next = (this.next + 1) % this.capacity;
      // random direction inside a cone round d
      v.set(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1);
      if (v.lengthSq() < 1e-4) v.set(0, 1, 0);
      v.normalize().lerp(d, 1 - cone);
      v.z *= flat;
      v.normalize();
      const sp = speed[0] + (speed[1] - speed[0]) * rand();
      this.pos[i * 3] = origin.x + (rand() * 2 - 1) * spread[0];
      this.pos[i * 3 + 1] = origin.y + (rand() * 2 - 1) * spread[1];
      this.pos[i * 3 + 2] = origin.z + (rand() * 2 - 1) * spread[2];
      this.vel[i * 3] = v.x * sp;
      this.vel[i * 3 + 1] = v.y * sp;
      this.vel[i * 3 + 2] = v.z * sp;
      this.life[i * 4] = at + rand() * 0.04;
      this.life[i * 4 + 1] = life[0] + (life[1] - life[0]) * rand();
      this.life[i * 4 + 2] = size[0] + (size[1] - size[0]) * rand();
      this.life[i * 4 + 3] = kind;
      const c = colors[Math.floor(rand() * colors.length)];
      this.col[i * 4] = c[0];
      this.col[i * 4 + 1] = c[1];
      this.col[i * 4 + 2] = c[2];
      this.col[i * 4 + 3] = rand();
      this.move[i * 2] = drag;
      this.move[i * 2 + 1] = gravity;
    }
    this.dirty = true;
  }

  // A stream: `rate` particles a second between t0 and t1, each set up by burst options.
  // Written up front with staggered birth times, so it freezes like everything else.
  stream({ t0, t1, rate, ...opts }) {
    const n = Math.round((t1 - t0) * rate * this.scale);
    if (n <= 0) return;
    const s = this.scale;
    this.scale = 1;
    for (let k = 0; k < n; k++) {
      this.burst({ ...opts, count: 1, at: t0 + ((t1 - t0) * k) / n, seed: (opts.seed ?? 1) + k * 0.37 });
    }
    this.scale = s;
  }

  update(clock) {
    this.material.uniforms.uTime.value = clock;
    if (this.dirty) {
      for (const a of Object.values(this.geometry.attributes)) a.needsUpdate = true;
      this.dirty = false;
    }
  }

  clear() {
    for (let i = 0; i < this.capacity; i++) this.life[i * 4] = -1e6;
    this.dirty = true;
  }
}
