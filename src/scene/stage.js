import * as THREE from "three";
import { createBackdrop } from "./backdrop.js";
import { createDust } from "./dust.js";
import { Post } from "./post.js";
import { CARD_W, CARD_H } from "../card/geometry.js";

const FOV = 26;
const MAX_DPR = 2;
const MIN_DPR = 1;
const TAN_HALF = Math.tan(THREE.MathUtils.degToRad(FOV / 2));

// Renderer, camera and the room. The camera is fitted so a region of the world (the "fit", in
// world units, centred on the origin) fills the free area between the header and the controls
// (the "box", in CSS pixels), using a lens shift so the origin lands in the middle of that box
// rather than the middle of the screen. Any point on the camera's axis lands there too, at any
// depth, which the pack screen uses to bring a card forward.
//
// The viewer fits one card; the pack screen fits the pack, then the spread of five, and can push
// the camera in towards a card (setView) for the big reveals.
export class Stage {
  constructor(canvas, { adaptive = true } = {}) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.setClearColor(0x050607, 1);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 50);
    this.backdrop = createBackdrop();
    this.scene.add(this.backdrop.mesh);
    this.dust = createDust();
    this.scene.add(this.dust.points);
    this.box = { x: 0, y: 0, w: 1, h: 1 };
    this.fit = { w: CARD_W * 1.12, h: CARD_H * 1.1, obj: CARD_H };
    this.view = { x: 0, y: 0, zoom: 1 };
    this.dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    this.adaptive = adaptive;
    this.frameTimes = [];
    this.cardPx = 1;
    this.worldPerPx = 0.01;
    this.dist = 10;
    this.center = { x: 0, y: 0 };
  }

  get tanHalf() {
    return TAN_HALF;
  }

  setBox(box) {
    this.box = box;
    this.resize();
  }

  // What has to fit the box, in world units. obj: the height the backdrop's halo and floor are
  // scaled to (the main object's height).
  setFit(w, h, obj = h / 1.1) {
    this.fit = { w, h, obj };
    this.updateCamera();
  }

  // Camera offset for pushes and shake: x, y in world units, zoom < 1 moves in.
  setView(x, y, zoom) {
    const v = this.view;
    if (v.x === x && v.y === y && v.zoom === zoom) return;
    v.x = x;
    v.y = y;
    v.zoom = zoom;
    this.placeCamera();
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // point size in device pixels for a mote of ~0.012 world units, before the 1/depth term
    this.dust.uniforms.uPixel.value = 0.012 * this.dpr * (h / (2 * TAN_HALF));
    this.updateCamera();
  }

  updateCamera() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cam = this.camera;
    // world units per CSS pixel so the fit region fills the box
    const worldPerPx = Math.max(this.fit.h / this.box.h, this.fit.w / this.box.w);
    this.worldPerPx = worldPerPx;
    this.dist = (worldPerPx * h) / (2 * TAN_HALF);
    cam.updateProjectionMatrix();
    const cx = this.box.x + this.box.w / 2;
    const cy = this.box.y + this.box.h / 2;
    const shiftX = (2 * cx) / w - 1;
    const shiftY = 1 - (2 * cy) / h;
    cam.projectionMatrix.elements[8] = -shiftX;
    cam.projectionMatrix.elements[9] = -shiftY;
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
    this.cardPx = CARD_H / worldPerPx;
    this.center = { x: cx, y: cy };
    const u = this.backdrop.uniforms;
    u.uRes.value.set(w * this.dpr, h * this.dpr);
    u.uCenter.value.set(cx * this.dpr, (h - cy) * this.dpr);
    u.uCardH.value = (this.fit.obj / worldPerPx) * this.dpr;
    this.placeCamera();
  }

  placeCamera() {
    const v = this.view;
    this.camera.position.set(v.x, v.y, this.dist * v.zoom);
    this.camera.lookAt(v.x, v.y, 0);
    this.camera.updateMatrixWorld();
  }

  // The depth (z) at which something `fitW` x `fitH` world units on the camera axis fills the box.
  depthFor(fitW, fitH) {
    const h = window.innerHeight;
    const wpp = Math.max(fitH / this.box.h, fitW / this.box.w);
    return this.dist - (wpp * h) / (2 * TAN_HALF);
  }

  // CSS pixels per world unit at depth z (no push applied).
  pxPerUnitAt(z) {
    return window.innerHeight / (2 * (this.dist - z) * TAN_HALF);
  }

  // Drop the pixel ratio when frames run long; never raise it again in a session to avoid
  // oscillating. Called once per frame with the frame's duration in ms.
  sample(dt) {
    if (!this.adaptive) return;
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 90) return;
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    const median = sorted[sorted.length >> 1];
    this.frameTimes.length = 0;
    if (median > 19 && this.dpr > MIN_DPR) {
      this.dpr = Math.max(MIN_DPR, this.dpr - 0.25);
      this.resize();
      this.onDpr?.(this.dpr);
    }
  }

  // The pack screen draws through the full-screen pass (bloom and the screen-wide reveals); the
  // viewer renders straight to the canvas.
  usePost(on) {
    if (on && !this.post) this.post = new Post(this.renderer);
    this.postOn = on;
    return this.post;
  }

  render() {
    if (this.postOn) this.post.render(this.scene, this.camera);
    else this.renderer.render(this.scene, this.camera);
  }
}
