// Separable box blur on a Float32Array image (w x h), radius r, repeated `passes` times.
export function boxBlur(src, w, h, r, passes = 2) {
  const a = Float32Array.from(src);
  const b = new Float32Array(a.length);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) {
      let acc = 0;
      for (let x = -r; x <= r; x++) acc += a[y * w + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        b[y * w + x] = acc / (2 * r + 1);
        const add = a[y * w + Math.min(w - 1, x + r + 1)];
        const sub = a[y * w + Math.max(0, x - r)];
        acc += add - sub;
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += b[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        a[y * w + x] = acc / (2 * r + 1);
        const add = b[Math.min(h - 1, y + r + 1) * w + x];
        const sub = b[Math.max(0, y - r) * w + x];
        acc += add - sub;
      }
    }
  }
  return a;
}
