import * as THREE from "three";
import { analyzePixels, zonesFrom, MW, MH } from "./analyzeCore.js";

// Derives a surface map from a finished card image at runtime. The art itself is never changed.
//   r, g: relief normal from luminance (ink relief / embossed frame), 0.5 = flat
//   b:    calm: 1 where the neighbourhood is quiet and dark, 0 where it is already busy
//         (dense detail, bright strokes like painted lightning). Normalised per card, so every
//         card's own calmest areas count as calm. Mythic lets its veins live there.
//   a:    local detail (edge energy), used to keep foil and glitter off fine type
// and a zone map from the card's own layout (zones.js): r window, g frame, b art-window depth.
//
// Decoding the image and the arithmetic (analyzeCore.js) take tens of milliseconds a card, so
// both run in a worker: on the page they would drop frames whenever a new pull loads. Without
// worker support they run here.

export { MW, MH };
export { boxBlur } from "./blur.js";

function pixels(image, w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h).data;
}

function dataTexture(data) {
  const tex = new THREE.DataTexture(data, MW, MH, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

function artTexture(image, flipY) {
  const tex = new THREE.Texture(image);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = flipY; // a worker's bitmap is already flipped
  tex.premultiplyAlpha = false;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

function loadImage(url) {
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  return img.decode().then(() => img);
}

let worker = null;
let workerBroken = typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined";
let jobs = 0;
const waiting = new Map();

function analyzeInWorker(url, id) {
  if (!worker) {
    worker = new Worker(new URL("./analyze.worker.js", import.meta.url), { type: "module" });
    worker.onmessage = ({ data }) => {
      const job = waiting.get(data.n);
      waiting.delete(data.n);
      if (data.error) job.reject(new Error(data.error));
      else job.resolve(data);
    };
    worker.onerror = () => {
      workerBroken = true;
      for (const job of waiting.values()) job.reject(new Error("card analysis worker failed"));
      waiting.clear();
    };
  }
  return new Promise((resolve, reject) => {
    const n = ++jobs;
    waiting.set(n, { resolve, reject });
    worker.postMessage({ n, url, id });
  });
}

// Loads a card image and derives its maps: { art, map, zones } textures and the zones' info.
export async function loadCardTextures(url, id) {
  if (!workerBroken) {
    try {
      const d = await analyzeInWorker(new URL(url, location.href).href, id);
      return { art: artTexture(d.art, false), map: dataTexture(d.map), zones: dataTexture(d.zones), info: d.info };
    } catch {
      // fall through to the page
    }
  }
  const image = await loadImage(url);
  const d = analyzePixels(pixels(image, MW, MH), id);
  return { art: artTexture(image, true), map: dataTexture(d.map), zones: dataTexture(d.zones), info: d.info };
}

export function measureZones(image, id) {
  return zonesFrom(pixels(image, MW, MH), id);
}
