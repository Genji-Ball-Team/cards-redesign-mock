// Epic: holographic diffraction foil. The foil is a mosaic of tiny diamond cells, each an
// embossed diffraction grating. A grating with period d sends wavelength
//     lambda = d * |g . (L + V)| / m      (orders m = 1..3)
// towards the eye, where g is the grating direction on the surface. Every cell's grating is
// turned a little differently (around a starburst centred on the card), so colours break up
// cell by cell and sweep across the card as it tilts. Lit by the key light and the overhead
// softbox. The foil shows through dark ink and is held back on bright type and the text panels.
// The art window uses the parallax lookup, while the foil stays on the surface above it.

export const epicShade = /* glsl */ `
vec3 spectral(float w) {
  // Zucconi's spectral approximation, w = 0..1 across 400..700nm
  const vec3 cs = vec3(3.54541723, 2.86670055, 2.29421995);
  const vec3 xs = vec3(0.69548916, 0.49416934, 0.28269708);
  const vec3 ys = vec3(0.02320775, 0.15936245, 0.53520021);
  vec3 x = cs * (w - xs);
  return clamp(1.0 - x * x - ys, 0.0, 1.0);
}

vec3 diffraction(vec3 g, vec3 gp, vec3 L, vec3 V, float period, float sharp) {
  vec3 LV = L + V;
  float u = abs(dot(g, LV));
  float across = dot(gp, LV);
  float lobe = exp(-across * across * sharp);
  vec3 c = vec3(0.0);
  for (int m = 1; m <= 3; m++) {
    float lam = period * u / float(m);
    c += spectral((lam - 0.4) / 0.3) / float(m);
  }
  return c * lobe;
}

vec3 shade(vec2 uv, Surf s) {
  float shadeP;
  vec2 uvP = parallaxUv(uv, s, shadeP);
  vec3 art = texture2D(uArt, uvP).rgb * shadeP;
  vec4 m = texture2D(uMap, uvP);
  float L = luma(art);
  float fz = frameZone(uv);
  float wz = windowZone(uv);
  float pz = 1.0 - max(fz, wz);

  // diamond micro-pattern: ~80 cells across the card, each its own grating
  vec2 p = uv * uCard * 55.0;
  vec2 q = vec2(p.x + p.y, p.y - p.x) * 0.70710678;
  vec2 id = floor(q);
  vec2 f = fract(q) - 0.5;
  float h = hash12(id);
  float border = smoothstep(0.36, 0.5, max(abs(f.x), abs(f.y)));
  vec2 cc = (uv - vec2(0.5, 0.62)) * uCard;
  float th = atan(cc.y, cc.x) + (h - 0.5) * 1.1;
  vec3 g = s.T * cos(th) + s.B * sin(th);
  vec3 N = perturb(s, (m.rg - 0.5) * 0.14);
  vec3 gp = cross(N, g);

  vec3 holo = diffraction(g, gp, keyL(), s.V, 1.35, 16.0) * uKeyCol;
  holo += diffraction(g, gp, normalize(vec3(0.0, 0.62, 0.78)), s.V, 1.35, 16.0) * 0.6;
  // cells catch the light a beat apart, so the rainbow glints instead of flooding
  holo *= (0.45 + 0.55 * h) * (1.0 - 0.7 * border);

  // the silver foil base reflects the room
  vec3 mirror = envSpec(N, s.V, vec3(0.55), 0.2) * 0.1 + keySpec(N, s.V, vec3(0.55), 0.2) * 0.1;

  // foil shows through dark ink only (L is linear: 0.05 ~ 25% grey, 0.3 ~ 58% grey)
  float ink = 1.0 - smoothstep(0.03, 0.3, L);
  float foil = (fz * 1.0 + wz * 0.75 + pz * 0.25) * ink * (1.0 - m.a * 0.5);

  vec3 col = art * printLight(N);
  col += (holo * 0.7 + mirror) * foil;
  // a whisper of holo over the light inks too, so the whole face reacts to the tilt
  col += holo * 0.06 * (1.0 - foil) * fz;
  // over the art the foil runs under mid tones too: the cells (and their embossed seams) read
  // across the illustration, not only in its shadows; the brightest highlights stay clean
  float mid = (1.0 - foil) * (1.0 - smoothstep(0.45, 0.85, L)) * wz;
  col += holo * 0.2 * mid;
  col *= 1.0 - 0.07 * border * wz * (1.0 - smoothstep(0.6, 0.9, L));
  // a faint violet sheen keeps the whole card in the epic family
  col += pow(1.0 - sat1(dot(N, s.V)), 3.0) * uAccent * 0.15;
  col += envSpec(N, s.V, vec3(0.04), 0.3) * 0.4;
  return col;
}
`;
