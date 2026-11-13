import * as THREE from "three";
import { vertexShader, head, frontHead, fragmentMain } from "./shared.glsl.js";
import { commonShade } from "./common.js";
import { rareShade } from "./rare.js";
import { epicShade } from "./epic.js";
import { legendaryShade } from "./legendary.js";
import { mythicShade } from "./mythic.js";
import { backShade } from "./back.js";
import { edgeShade } from "./edge.js";
import { CARD_W, CARD_H, CORNER_R } from "../card/geometry.js";

const FRONT_SHADES = {
  common: commonShade,
  rare: rareShade,
  epic: epicShade,
  legendary: legendaryShade,
  mythic: mythicShade,
};

// The room's lights and time, as uniforms. The pack uses the same set so it sits in the same
// light as the cards.
export function createLightUniforms({ noiseA, noiseB }) {
  return {
    uTime: { value: 0 },
    uKeyDir: { value: new THREE.Vector3(-0.45, 0.55, 0.7).normalize() },
    uKeyCol: { value: new THREE.Color(1.0, 0.96, 0.9) },
    uRimDir: { value: new THREE.Vector3(0.65, 0.35, -0.68).normalize() },
    uRimCol: { value: new THREE.Color(0.55, 0.85, 0.75) },
    uCard: { value: new THREE.Vector2(CARD_W, CARD_H) },
    uNoiseA: { value: noiseA },
    uNoiseB: { value: noiseB },
    uParallax: { value: 1 },
    uDepth: { value: 0.11 },
    uAccent: { value: new THREE.Color(1, 1, 1) },
  };
}

// Builds every card material. Light, time and noise uniforms are the same objects in all of
// them, so updating one value updates every material.
export function createMaterials(noise) {
  const shared = createLightUniforms(noise);

  // this card's values, shared between its five fronts (only one is drawn at a time)
  const card = {
    uArt: { value: null },
    uMap: { value: null },
    uZones: { value: null },
    uDepthOn: { value: 0 },
    uOutline: { value: new THREE.Vector4() },
    uPaintR: { value: 0 },
    uStamp: { value: null },
    uStampRect: { value: new THREE.Vector4(0.06, 0.035, 0.27, 0.08) },
    uStampTexel: { value: new THREE.Vector2(1 / 256, 1 / 96) },
    uStampOn: { value: 1 }, // 0 hides the print stamp until the reveal stamps it on
    uCornerR: { value: CORNER_R },
  };

  const make = (body, extra, tangentSign = 1, withFront = false) =>
    new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: head + (withFront ? frontHead : "") + body + fragmentMain,
      uniforms: { ...shared, ...extra, uTangentSign: { value: tangentSign } },
    });

  const fronts = {};
  for (const [id, body] of Object.entries(FRONT_SHADES)) {
    fronts[id] = make(body, card, 1, true);
    fronts[id].name = `front-${id}`;
  }

  const back = make(backShade, {
    uBackCol: { value: null },
    uBackMask: { value: null },
    uMaskTexel: { value: new THREE.Vector2(1 / 1024, 1 / 1408) },
  }, -1);
  back.name = "back";

  const edge = make(edgeShade, {
    uStyle: { value: 0 },
    uBackTint: { value: new THREE.Color(0.02, 0.025, 0.025) },
  });
  edge.name = "edge";

  return { shared, card, fronts, back, edge };
}
