import * as THREE from "three";
import { createCardGeometry, CARD_W } from "./geometry.js";
import { createNoiseTextures } from "./noise.js";
import { analyzeCard, MW } from "./analyze.js";
import { createBackTextures } from "./backTexture.js";
import { createStampTexture } from "./stampTexture.js";
import { createMaterials } from "../materials/index.js";
import { rarityById, printLabel } from "../data/cards.js";

// Shared by every Card on the page: the noise, the geometry and each card image's textures
// (art, derived map, zones, print stamp). Several cards can be on screen at once (the pack
// reveal), so each Card owns its materials and uniforms but never duplicates these.
let noise = null;
let geometry = null;
const NEUTRAL = new THREE.Color(1, 1, 1);
const loaded = new Map();

export function sharedNoise() {
  if (!noise) noise = createNoiseTextures();
  return noise;
}

// Loads (once per page) a card image and everything derived from it.
export function loadCard(card, renderer) {
  const key = `${card.id}:${card.print ?? ""}`;
  if (loaded.has(key)) return loaded.get(key);
  const p = new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      const art = new THREE.Texture(img);
      art.colorSpace = THREE.SRGBColorSpace;
      art.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      art.minFilter = THREE.LinearMipmapLinearFilter;
      art.generateMipmaps = true;
      art.needsUpdate = true;
      const { map, zones, info } = analyzeCard(img, card.id);
      const stamp = card.print != null ? createStampTexture(printLabel(card)) : null;
      resolve({ art, map, zones, info, stamp });
    };
    img.onerror = () => reject(new Error(`could not load ${card.id}`));
    img.src = `${import.meta.env.BASE_URL}cards/${card.id}.webp`;
  });
  loaded.set(key, p);
  return p;
}

// The 3D card: one mesh, materials [front for the card's rarity, back, edge].
export class Card {
  constructor(renderer) {
    this.renderer = renderer;
    this.mats = createMaterials(sharedNoise());
    if (!geometry) geometry = createCardGeometry();
    this.geometry = geometry;
    this.mesh = new THREE.Mesh(this.geometry, [this.mats.fronts.common, this.mats.back, this.mats.edge]);
    this.group = new THREE.Group();
    this.group.add(this.mesh);
    this.current = null;
    this.accentTarget = new THREE.Color(1, 1, 1);
    const b = createBackTextures();
    this.mats.back.uniforms.uBackCol.value = b.color;
    this.mats.back.uniforms.uBackMask.value = b.mask;
    this.mats.edge.uniforms.uBackTint.value.setRGB(...b.edgeTint);
  }

  get shared() {
    return this.mats.shared;
  }

  load(card) {
    return loadCard(card, this.renderer);
  }

  async show(card) {
    const tex = await this.load(card);
    const u = this.mats.card;
    u.uArt.value = tex.art;
    u.uMap.value = tex.map;
    u.uStamp.value = tex.stamp;
    // everything below is measured from this card's own image (card/zones.js)
    u.uZones.value = tex.zones;
    u.uDepthOn.value = tex.info.depthOn ? 1 : 0;
    const o = tex.info.outline;
    const px = CARD_W / MW; // world units per analysis pixel
    const ins = (v) => Math.min(v, 6) * px;
    u.uOutline.value.set(ins(o.inset.l), ins(o.inset.b), ins(o.inset.r), ins(o.inset.t));
    u.uPaintR.value = Math.min(o.radius, 30) * px;
    u.uStampRect.value.set(...tex.info.stamp);
    const rarity = rarityById[card.rarity];
    this.mesh.material[0] = this.mats.fronts[rarity.id];
    this.mats.edge.uniforms.uStyle.value = rarity.index;
    this.accentTarget.setRGB(...rarity.linear);
    this.mats.shared.uAccent.value.copy(this.accentTarget);
    this.current = card;
    this.style = rarity.index;
  }

  // Face down in a pack, the card must not give its rarity away: the edge is plain stock and the
  // accent neutral for every card until the flip starts (conceal(false)).
  conceal(on) {
    this.mats.edge.uniforms.uStyle.value = on ? 0 : this.style ?? 0;
    this.mats.shared.uAccent.value.copy(on ? NEUTRAL : this.accentTarget);
  }

  // Compile every front material up front so switching rarity never hitches. Uses a scratch
  // scene so the live card keeps its material while frames render in between.
  async warmUp(camera) {
    const scratch = new THREE.Scene();
    for (const m of Object.values(this.mats.fronts)) {
      scratch.add(new THREE.Mesh(this.geometry, [m, this.mats.back, this.mats.edge]));
    }
    if (this.renderer.compileAsync) await this.renderer.compileAsync(scratch, camera);
    else this.renderer.compile(scratch, camera);
  }
}
