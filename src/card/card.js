import * as THREE from "three";
import { createCardGeometry, CARD_W } from "./geometry.js";
import { createNoiseTextures } from "./noise.js";
import { loadCardTextures, MW } from "./analyze.js";
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

// Uploads textures to the GPU one per frame, ahead of their first draw. Left to the renderer,
// a pull's textures would all upload in the frame its cards first appear: a visible hitch in the
// middle of the pack opening.
let uploads = Promise.resolve();
const nextFrame = () => new Promise((r) => requestAnimationFrame(r));
function upload(renderer, textures) {
  const run = async () => {
    for (const t of textures) {
      if (!t) continue;
      // (a hidden tab has no frames: upload at once instead of waiting for one)
      if (!document.hidden) await nextFrame();
      renderer.initTexture(t);
    }
  };
  uploads = uploads.then(run, run);
  return uploads;
}

// Loads (once per page) a card image and everything derived from it, ready to draw: the image
// decoded and the maps analysed (in a worker, see analyze.js), and every texture on the GPU.
export function loadCard(card, renderer) {
  const key = `${card.id}:${card.print ?? ""}`;
  if (loaded.has(key)) return loaded.get(key);
  const p = (async () => {
    const url = `${import.meta.env.BASE_URL}cards/${card.id}.webp`;
    const { art, map, zones, info } = await loadCardTextures(url, card.id).catch(() => {
      throw new Error(`could not load ${card.id}`);
    });
    art.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const stamp = card.print != null ? createStampTexture(printLabel(card)) : null;
    await upload(renderer, [art, map, zones, stamp]);
    return { art, map, zones, info, stamp };
  })();
  p.catch(() => loaded.delete(key));
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
  //   extra:  more objects to compile along with the card (the pack screen's effect planes)
  //   target: the render target the card is drawn into, if not the canvas. three compiles a
  //           separate program per output colour space, so warming up for the canvas does
  //           nothing for a screen that draws through a render target.
  // With a target it ends with one real draw into a small copy of it: drivers finish compiling
  // a shader the first time it draws, not when it links.
  async warmUp(camera, { extra = [], target = null } = {}) {
    const r = this.renderer;
    const scratch = new THREE.Scene();
    for (const m of Object.values(this.mats.fronts)) {
      scratch.add(new THREE.Mesh(this.geometry, [m, this.mats.back, this.mats.edge]));
    }
    for (const o of extra) scratch.add(o);
    scratch.traverse((o) => {
      o.frustumCulled = false;
    });
    const prev = r.getRenderTarget();
    r.setRenderTarget(target);
    const compiled = r.compileAsync ? r.compileAsync(scratch, camera) : r.compile(scratch, camera);
    r.setRenderTarget(prev);
    await compiled;
    if (!target) return;
    const small = target.clone();
    small.setSize(8, 8);
    r.setRenderTarget(small);
    r.render(scratch, camera);
    r.setRenderTarget(prev);
    small.dispose();
  }
}
