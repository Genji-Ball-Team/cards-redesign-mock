import * as THREE from "three";
import { createPackGeometries, PACK_H, TEAR_Y } from "./packMesh.js";
import { createPackMaterial } from "./packMaterial.js";
import { packTextures } from "./packArt.js";
import { cssOklchToLinear } from "../color.js";

// The booster pack on the stage: body + cap meshes, its material, and the per-type look.
// Pose comes from a Motion (tilt, drag, float); the opening sequence adds its own offsets
// through `fx`, which is reset every frame before the timeline writes it.

export class Pack {
  constructor(noise) {
    const geo = createPackGeometries();
    this.mat = createPackMaterial(noise);
    this.body = new THREE.Mesh(geo.body, this.mat.body);
    this.cap = new THREE.Mesh(geo.cap, this.mat.cap);
    // the cap turns about its own middle when it flies off
    this.capPivot = new THREE.Group();
    this.capPivot.position.y = (TEAR_Y + PACK_H / 2) / 2;
    this.cap.position.y = -this.capPivot.position.y;
    this.capPivot.add(this.cap);
    this.inner = new THREE.Group(); // pose (motion) + anticipation
    this.inner.add(this.body, this.capPivot);
    this.group = new THREE.Group();
    this.group.add(this.inner);
    this.trim = new THREE.Color(1, 1, 1);
    this.type = null;
    this.fx = Pack.rest();
  }

  static rest() {
    return {
      scale: 1, // anticipation swell
      shakeX: 0,
      shakeY: 0,
      shakeR: 0,
      gather: 0,
      torn: 0,
      capX: 0,
      capY: 0,
      capRx: 0,
      capRz: 0,
      capFade: 1,
      dropY: 0, // the whole pack: drop away after the burst, or drop in when a new one arrives
      dropR: 0,
      fade: 1,
      lift: 0,
    };
  }

  get uniforms() {
    return this.mat.uniforms;
  }

  setType(type) {
    this.type = type;
    const t = packTextures(type);
    const u = this.mat.uniforms;
    u.uColF.value = t.front.col;
    u.uMaskF.value = t.front.mask;
    u.uColB.value = t.back.col;
    u.uMaskB.value = t.back.mask;
    u.uTexel.value.set(...t.texel);
    u.uHolo.value = type.look.holo;
    u.uEmber.value = type.look.ember;
    this.trim.setRGB(...cssOklchToLinear(type.look.trim));
    u.uTrim.value.copy(this.trim);
  }

  resetFx() {
    Object.assign(this.fx, Pack.rest());
  }

  // pose: { pitch, yaw, roll, lift } from Motion
  apply(pose, { sweep = 9, hover = 0 } = {}) {
    const f = this.fx;
    const u = this.mat.uniforms;
    this.inner.rotation.set(pose.pitch, pose.yaw, pose.roll + f.shakeR, "XYZ");
    this.inner.position.set(f.shakeX, pose.lift + f.shakeY + f.lift, 0);
    this.inner.scale.setScalar(f.scale);
    this.group.position.y = f.dropY;
    this.group.rotation.x = f.dropR;
    this.capPivot.position.x = f.capX;
    this.capPivot.position.y = (TEAR_Y + PACK_H / 2) / 2 + f.capY;
    this.capPivot.rotation.set(f.capRx, 0, f.capRz);
    u.uGather.value = f.gather;
    u.uTorn.value = f.torn;
    u.uSweep.value = sweep;
    u.uLift.value = hover;
    this.mat.body.uniforms.uFade.value = f.fade;
    this.mat.cap.uniforms.uFade.value = f.fade * f.capFade;
    this.body.visible = f.fade > 0.002;
    this.cap.visible = f.fade * f.capFade > 0.002;
  }
}
