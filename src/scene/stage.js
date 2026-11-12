import * as THREE from "three";
import { createBackdrop } from "./backdrop.js";
import { createDust } from "./dust.js";
import { CARD_W, CARD_H } from "../card/geometry.js";

const FOV = 26;
const MAX_DPR = 2;
const MIN_DPR = 1;

// Renderer, camera and the room. The camera is fitted so the card fills the free area between
// the header and the controls (the "card box", in CSS pixels), using a lens shift so the card's
// centre lands in the middle of that box rather than the middle of the screen.
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
    this.dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    this.adaptive = adaptive;
    this.frameTimes = [];
    this.cardPx = 1;
  }

  setBox(box) {
    this.box = box;
    this.resize();
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(w, h, false);
    const cam = this.camera;
    cam.aspect = w / h;
    // world units per CSS pixel so the card (with room to tilt) fits the box
    const fitH = CARD_H * 1.1;
    const fitW = CARD_W * 1.12;
    const worldPerPx = Math.max(fitH / this.box.h, fitW / this.box.w);
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const dist = (worldPerPx * h) / (2 * tanHalf);
    cam.position.set(0, 0, dist);
    cam.lookAt(0, 0, 0);
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
    u.uCardH.value = this.cardPx * this.dpr;
    // point size in device pixels for a mote of ~0.012 world units, before the 1/depth term
    this.dust.uniforms.uPixel.value = 0.012 * this.dpr * (h / (2 * tanHalf));
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
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
