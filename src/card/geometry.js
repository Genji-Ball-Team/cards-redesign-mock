import * as THREE from "three";

// Card proportions. The art is 640x880 (aspect 0.727). Height 2 world units.
export const CARD_H = 2;
export const CARD_W = CARD_H * (640 / 880);
export const CARD_T = 0.02; // exaggerated a little over real card stock so the layered edge reads
export const CORNER_R = 0.06;

// Rounded-rectangle outline, counter-clockwise, with a 2D outward normal per point.
function outline(w, h, r, seg) {
  const pts = [];
  const corners = [
    [w / 2 - r, h / 2 - r, 0],
    [-w / 2 + r, h / 2 - r, Math.PI / 2],
    [-w / 2 + r, -h / 2 + r, Math.PI],
    [w / 2 - r, -h / 2 + r, (3 * Math.PI) / 2],
  ];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * (Math.PI / 2);
      const nx = Math.cos(a);
      const ny = Math.sin(a);
      pts.push({ x: cx + nx * r, y: cy + ny * r, nx, ny });
    }
  }
  return pts;
}

// One BufferGeometry with three groups: 0 front, 1 back, 2 edge.
// Front/back are fans from the centre (the outline is convex). Back UVs are mirrored so the back
// image reads correctly when the card is turned round. Edge UV: u = position round the perimeter,
// v = 0 at the back face to 1 at the front face (the shader draws the paper layers along v).
export function createCardGeometry() {
  const w = CARD_W;
  const h = CARD_H;
  const t = CARD_T;
  const pts = outline(w, h, CORNER_R, 16);
  const n = pts.length;

  const pos = [];
  const nor = [];
  const uv = [];
  const idx = [];

  // front
  const f0 = 0;
  pos.push(0, 0, t / 2);
  nor.push(0, 0, 1);
  uv.push(0.5, 0.5);
  for (const p of pts) {
    pos.push(p.x, p.y, t / 2);
    nor.push(0, 0, 1);
    uv.push(p.x / w + 0.5, p.y / h + 0.5);
  }
  const frontStart = idx.length;
  for (let i = 0; i < n; i++) idx.push(f0, f0 + 1 + i, f0 + 1 + ((i + 1) % n));
  const frontCount = idx.length - frontStart;

  // back
  const b0 = pos.length / 3;
  pos.push(0, 0, -t / 2);
  nor.push(0, 0, -1);
  uv.push(0.5, 0.5);
  for (const p of pts) {
    pos.push(p.x, p.y, -t / 2);
    nor.push(0, 0, -1);
    uv.push(0.5 - p.x / w, p.y / h + 0.5);
  }
  const backStart = idx.length;
  for (let i = 0; i < n; i++) idx.push(b0, b0 + 1 + ((i + 1) % n), b0 + 1 + i);
  const backCount = idx.length - backStart;

  // edge: a strip round the perimeter (first point repeated at the end so u wraps cleanly)
  const e0 = pos.length / 3;
  let perim = 0;
  const lens = [0];
  for (let i = 1; i <= n; i++) {
    const a = pts[i - 1];
    const b = pts[i % n];
    perim += Math.hypot(b.x - a.x, b.y - a.y);
    lens.push(perim);
  }
  for (let i = 0; i <= n; i++) {
    const p = pts[i % n];
    const u = lens[i] / perim;
    pos.push(p.x, p.y, -t / 2, p.x, p.y, t / 2);
    nor.push(p.nx, p.ny, 0, p.nx, p.ny, 0);
    uv.push(u, 0, u, 1);
  }
  const edgeStart = idx.length;
  for (let i = 0; i < n; i++) {
    const a = e0 + i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    idx.push(a, c, b, b, c, d);
  }
  const edgeCount = idx.length - edgeStart;

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.addGroup(frontStart, frontCount, 0);
  g.addGroup(backStart, backCount, 1);
  g.addGroup(edgeStart, edgeCount, 2);
  g.computeBoundingSphere();
  return g;
}
