import * as THREE from "three";

// Tileable noise baked once on the CPU, so the shaders fetch noise instead of computing it
// (much cheaper on phone GPUs).
//   noiseA: rg = fine grain normal (paper fibre / brushing), b = grain height, a = smooth fbm
//   noiseB: rgba = four independent smooth fbm fields (mythic smoke and veins, rare streaks)

const SIZE = 256;

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Periodic value noise: a lattice of `period` cells that wraps across the texture.
function valueLayer(period, rand) {
  const lat = new Float32Array(period * period);
  for (let i = 0; i < lat.length; i++) lat[i] = rand();
  const out = new Float32Array(SIZE * SIZE);
  const cell = SIZE / period;
  for (let y = 0; y < SIZE; y++) {
    const fy = y / cell;
    const y0 = Math.floor(fy);
    const ty = fy - y0;
    const sy = ty * ty * (3 - 2 * ty);
    const ya = (y0 % period) * period;
    const yb = ((y0 + 1) % period) * period;
    for (let x = 0; x < SIZE; x++) {
      const fx = x / cell;
      const x0 = Math.floor(fx);
      const tx = fx - x0;
      const sx = tx * tx * (3 - 2 * tx);
      const xa = x0 % period;
      const xb = (x0 + 1) % period;
      const a = lat[ya + xa] + (lat[ya + xb] - lat[ya + xa]) * sx;
      const b = lat[yb + xa] + (lat[yb + xb] - lat[yb + xa]) * sx;
      out[y * SIZE + x] = a + (b - a) * sy;
    }
  }
  return out;
}

function fbm(seed, basePeriod, octaves) {
  const rand = rng(seed);
  const out = new Float32Array(SIZE * SIZE);
  let amp = 0.5;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const layer = valueLayer(Math.min(SIZE, basePeriod << o), rand);
    for (let i = 0; i < out.length; i++) out[i] += layer[i] * amp;
    total += amp;
    amp *= 0.5;
  }
  // stretch to the full 0..1 range so channels are comparable
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < out.length; i++) {
    out[i] /= total;
    lo = Math.min(lo, out[i]);
    hi = Math.max(hi, out[i]);
  }
  for (let i = 0; i < out.length; i++) out[i] = (out[i] - lo) / (hi - lo);
  return out;
}

function toTexture(channels) {
  const data = new Uint8Array(SIZE * SIZE * 4);
  for (let i = 0; i < SIZE * SIZE; i++) {
    for (let c = 0; c < 4; c++) data[i * 4 + c] = Math.round(Math.min(1, Math.max(0, channels[c][i])) * 255);
  }
  const tex = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

export function createNoiseTextures() {
  // grain: mostly the two finest octaves, so it reads as paper tooth rather than blotches
  const grain = fbm(11, 64, 3);
  const nx = new Float32Array(SIZE * SIZE);
  const ny = new Float32Array(SIZE * SIZE);
  const at = (x, y) => grain[((y + SIZE) % SIZE) * SIZE + ((x + SIZE) % SIZE)];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      nx[y * SIZE + x] = 0.5 + (at(x - 1, y) - at(x + 1, y)) * 2.5;
      ny[y * SIZE + x] = 0.5 + (at(x, y - 1) - at(x, y + 1)) * 2.5;
    }
  }
  const smooth = fbm(23, 4, 5);
  const noiseA = toTexture([nx, ny, grain, smooth]);
  const noiseB = toTexture([fbm(37, 4, 5), fbm(41, 4, 5), fbm(53, 8, 4), fbm(67, 4, 4)]);
  return { noiseA, noiseB };
}
