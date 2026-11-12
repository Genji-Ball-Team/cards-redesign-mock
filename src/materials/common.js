// Common: plain uncoated card stock, the modest bottom of the ladder. Paper tooth in the normal
// and albedo, one soft broad highlight from the key lamp, and nothing that mirrors the room:
// no strip-light glints, not even on the printed frame. Uncoated stock scatters a little light
// off its fibres, so a faint milky veil rises where the highlight sits and at grazing angles.

export const commonShade = /* glsl */ `
vec3 shade(vec2 uv, Surf s) {
  vec3 art = texture2D(uArt, uv).rgb;
  vec4 m = texture2D(uMap, uv);
  vec4 g = texture2D(uNoiseA, uv * uCard * 2.6);

  vec3 N = perturb(s, (g.rg - 0.5) * 0.13 + (m.rg - 0.5) * 0.05);
  vec3 albedo = art * (0.96 + 0.07 * g.b);
  vec3 col = albedo * printLight(N) * 0.97;

  // one broad, dull highlight (very rough dielectric), no environment reflection
  vec3 sheen = keySpec(N, s.V, vec3(0.03), 0.85);
  float NoV = sat1(dot(N, s.V));
  float veil = luma(sheen) * 0.6 + pow(1.0 - NoV, 2.5) * 0.05;
  col = mix(col, vec3(0.62, 0.63, 0.64), sat1(veil) * 0.25) + sheen * 0.35 * (0.8 + 0.4 * g.b);
  return col;
}
`;
