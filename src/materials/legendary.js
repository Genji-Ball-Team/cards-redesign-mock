// Legendary: gold foil. The printed gold (warm, saturated, bright ink) and the frame become a
// gold metal (GGX, F0 of gold) reflecting the showroom, with the painted relief used as an
// embossed normal so ornaments catch light on their edges. On top, a layer of glitter: on a
// fine grid, about half the cells hold a flake with its own random tilt; a flake flashes only
// when its tilt lines a light up with the eye, so sparkles fire point by point as the card turns.

export const legendaryShade = /* glsl */ `
vec3 glitter(vec2 uv, Surf s) {
  vec2 p = uv * uCard * 92.0;
  vec2 id = floor(p);
  vec2 f = fract(p);
  float present = step(0.48, hash12(id + 17.0));
  vec2 c = 0.22 + 0.56 * hash22(id);
  float shape = smoothstep(0.34, 0.0, length(f - c));
  vec2 tilt = (hash22(id + 3.7) - 0.5) * 0.8;
  vec3 n = normalize(s.Ng + s.T * tilt.x + s.B * tilt.y);
  float g = pow(sat1(dot(n, normalize(keyL() + s.V))), 700.0);
  g += pow(sat1(dot(n, normalize(normalize(vec3(-0.55, 0.15, 0.82)) + s.V))), 700.0) * 0.8;
  g += pow(sat1(dot(n, normalize(normalize(vec3(0.0, 0.62, 0.78)) + s.V))), 700.0) * 0.6;
  g += pow(sat1(dot(n, normalize(normalize(vec3(0.6, 0.05, 0.8)) + s.V))), 700.0) * 0.5;
  float tw = hash12(id + 9.1);
  return vec3(1.0, 0.86, 0.6) * g * shape * present * (0.6 + 0.8 * tw) * 9.0;
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

  // how gold is the printed ink here: warm hue, some chroma, some brightness
  float warm = sat1((art.r * 0.9 + art.g * 0.7 - art.b * 1.7) * 1.8);
  float goldInk = warm * smoothstep(0.06, 0.45, L) * (1.0 - smoothstep(0.75, 0.98, L) * 0.5);
  float metal = sat1(fz * 0.75 + goldInk * mix(1.0, 0.3, wz));

  vec3 N = perturb(s, (m.rg - 0.5) * (0.12 + 1.1 * metal));
  const vec3 GOLD = vec3(1.0, 0.74, 0.32);
  float rough = 0.24;
  vec3 refl = envSpec(N, s.V, GOLD, rough) + keySpec(N, s.V, GOLD, rough);
  vec3 inkHue = art / max(max(art.r, max(art.g, art.b)), 0.04);
  vec3 metalCol = refl * (0.35 + 1.1 * L) * mix(vec3(1.0), inkHue, 0.35) + art * 0.25;

  vec3 diffuse = art * printLight(N);
  vec3 col = mix(diffuse, diffuse * 0.6 + metalCol, metal * 0.8);
  col += envSpec(N, s.V, vec3(0.04), 0.3) * 0.4 * (1.0 - metal);

  float protect = smoothstep(0.55, 0.9, L) * (1.0 - goldInk);
  float gmask = (0.35 + 0.65 * metal) * (wz * 0.8 + fz + pz * 0.45) * (1.0 - protect);
  col += glitter(uv, s) * gmask;
  col += pow(1.0 - sat1(dot(N, s.V)), 4.0) * uAccent * 0.15;
  return col;
}
`;
