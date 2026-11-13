import { analyzePixels, MW, MH } from "./analyzeCore.js";

// Card loading off the main thread: fetches the image, decodes it and answers with the art as a
// bitmap ready to upload (rows bottom-up, as a texture wants them) and the two analysis maps.
// See analyze.js for the page side.
self.onmessage = async ({ data: { n, url, id } }) => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    const blob = await res.blob();
    const [bitmap, art] = await Promise.all([
      createImageBitmap(blob),
      createImageBitmap(blob, { imageOrientation: "flipY", premultiplyAlpha: "none", colorSpaceConversion: "none" }),
    ]);
    const ctx = new OffscreenCanvas(MW, MH).getContext("2d", { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0, MW, MH);
    bitmap.close();
    const { map, zones, info } = analyzePixels(ctx.getImageData(0, 0, MW, MH).data, id);
    self.postMessage({ n, art, map, zones, info }, [art, map.buffer, zones.buffer]);
  } catch (err) {
    self.postMessage({ n, error: String(err?.message ?? err) });
  }
};
