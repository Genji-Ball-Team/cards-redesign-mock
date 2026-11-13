import * as THREE from "three";
import { CARD_W, CARD_H } from "../card/geometry.js";

// The booster pack: a foil pouch with crimped seals top and bottom and a little pillow volume.
// Two sheets (front and back) whose bulge falls to nothing at the sides and in the seals, built
// as two meshes split at the tear line just under the top seal: the body and the cap that tears
// off. The serrated cut edges, the crimp and the wrinkles are drawn by the material.

export const PACK_W = CARD_W * 1.2;
export const PACK_H = CARD_H * 1.3;
export const SEAL_H = 0.17;
export const TEAR_Y = PACK_H / 2 - SEAL_H - 0.05;
const PUFF = 0.14;
const SEAM = 0.0035; // the sheets sit this far apart where they're sealed flat

function bulge(x, y) {
  const fx = Math.max(0, 1 - Math.abs((2 * x) / PACK_W) ** 2.6);
  const inner = PACK_H / 2 - SEAL_H;
  const ay = Math.abs(y);
  // flat in the seals, rising over a short shoulder, then a gentle dome
  const fy = ay >= inner ? 0 : Math.max(0, 1 - (ay / inner) ** 4);
  return PUFF * Math.sqrt(fx) * Math.sqrt(fy);
}

// A sheet between heights y0 and y1. side 1 = front (faces +z), -1 = back.
function sheet(y0, y1, side) {
  const nx = 40;
  const ny = Math.max(4, Math.round(((y1 - y0) / PACK_H) * 72));
  const pos = [];
  const uv = [];
  const sides = [];
  const idx = [];
  for (let j = 0; j <= ny; j++) {
    const y = y0 + ((y1 - y0) * j) / ny;
    for (let i = 0; i <= nx; i++) {
      const x = -PACK_W / 2 + (PACK_W * i) / nx;
      const z = side * (bulge(x, y) + SEAM);
      pos.push(x, y, z);
      uv.push(side > 0 ? x / PACK_W + 0.5 : 0.5 - x / PACK_W, y / PACK_H + 0.5);
      sides.push(side > 0 ? 1 : 0);
    }
  }
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i;
      const b = a + 1;
      const c = a + nx + 1;
      const d = c + 1;
      if (side > 0) idx.push(a, b, c, b, d, c);
      else idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("aSide", new THREE.Float32BufferAttribute(sides, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function merge(a, b) {
  const g = new THREE.BufferGeometry();
  const n = a.attributes.position.count;
  for (const name of ["position", "normal", "uv", "aSide"]) {
    const A = a.attributes[name];
    const B = b.attributes[name];
    const arr = new Float32Array(A.array.length + B.array.length);
    arr.set(A.array);
    arr.set(B.array, A.array.length);
    g.setAttribute(name, new THREE.BufferAttribute(arr, A.itemSize));
  }
  const ia = a.index.array;
  const ib = b.index.array;
  const idx = new Uint32Array(ia.length + ib.length);
  idx.set(ia);
  for (let i = 0; i < ib.length; i++) idx[ia.length + i] = ib[i] + n;
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return g;
}

// body: bottom edge to a little above the tear line; cap: a little below it to the top.
// The overlap is cut away by the material along the same serrated line.
export function createPackGeometries() {
  const over = 0.04;
  const body = merge(sheet(-PACK_H / 2, TEAR_Y + over, 1), sheet(-PACK_H / 2, TEAR_Y + over, -1));
  const cap = merge(sheet(TEAR_Y - over, PACK_H / 2, 1), sheet(TEAR_Y - over, PACK_H / 2, -1));
  return { body, cap };
}
