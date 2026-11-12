import * as THREE from "three";
import { createCardGeometry, CARD_W } from "./geometry.js";
import { createNoiseTextures } from "./noise.js";
import { analyzeCard, MW } from "./analyze.js";
import { createBackTextures } from "./backTexture.js";
import { createStampTexture } from "./stampTexture.js";
import { createMaterials } from "../materials/index.js";
import { rarityById, printLabel } from "../data/cards.js";

// The 3D card: one mesh, materials [front for the card's rarity, back, edge].
// Art, its derived map and the mythic stamp are loaded per card and cached.
export class Card {
  constructor(renderer) {
    this.renderer = renderer;
    this.noise = createNoiseTextures();
    this.mats = createMaterials(this.noise);
    this.geometry = createCardGeometry();
    this.mesh = new THREE.Mesh(this.geometry, [this.mats.fronts.common, this.mats.back, this.mats.edge]);
    this.group = new THREE.Group();
    this.group.add(this.mesh);
    this.cache = new Map();
    this.backs = {};
    this.current = null;
    this.maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    this.accentTarget = new THREE.Color(1, 1, 1);
  }

  get shared() {
    return this.mats.shared;
  }

  load(card) {
    if (this.cache.has(card.id)) return this.cache.get(card.id);
    const p = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        const art = new THREE.Texture(img);
        art.colorSpace = THREE.SRGBColorSpace;
        art.anisotropy = this.maxAniso;
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
    this.cache.set(card.id, p);
    return p;
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
  }

  setBack(variant) {
    if (!this.backs[variant]) this.backs[variant] = createBackTextures(variant);
    const b = this.backs[variant];
    this.mats.back.uniforms.uBackCol.value = b.color;
    this.mats.back.uniforms.uBackMask.value = b.mask;
    this.mats.edge.uniforms.uBackTint.value.setRGB(...b.edgeTint);
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
