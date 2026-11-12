// The card edge: laminated stock seen side-on. Across the thickness (uv.y, back 0 -> front 1):
// a back skin, paper, a black core (as real cards have), paper and a front skin. The skin and
// how much of the edge is treated depend on the rarity: plain paper (common), blue metal skins
// (rare), a rainbow skin (epic), a fully gilded edge (legendary), a near-black edge whose core
// smoulders (mythic). The normal rolls toward the faces at the top and bottom, like a cut,
// slightly rounded edge.

export const edgeShade = /* glsl */ `
uniform float uStyle;     // 0 common .. 4 mythic
uniform vec3 uBackTint;

vec3 shade(vec2 uv, Surf s) {
  float v = uv.y;
  vec3 N = normalize(s.Ng + vCardZ * (v - 0.5) * 1.8);
  vec4 g = texture2D(uNoiseA, vec2(uv.x * 40.0, v * 0.35));
  vec3 paper = vec3(0.62, 0.6, 0.56) * (0.85 + 0.3 * g.b);
  float core = smoothstep(0.4, 0.44, v) * (1.0 - smoothstep(0.56, 0.6, v));
  float skinF = smoothstep(0.84, 0.88, v);
  float skinB = 1.0 - smoothstep(0.12, 0.16, v);

  vec3 albedo = mix(paper, vec3(0.015), core);
  albedo = mix(albedo, uBackTint, skinB);
  float metal = 0.0;
  vec3 F0 = vec3(0.04);
  float rough = 0.5;
  vec3 emit = vec3(0.0);

  if (uStyle < 0.5) {
    albedo = mix(albedo, vec3(0.7), skinF);
  } else if (uStyle < 1.5) {
    metal = skinF + skinB * 0.6;
    F0 = mix(uAccent, vec3(0.9), 0.25);
    rough = 0.3;
  } else if (uStyle < 2.5) {
    float hue = uv.x * 18.0 + dot(s.V, s.T) * 2.0;
    vec3 rainbow = 0.55 + 0.45 * cos(6.2831853 * (hue + vec3(0.0, 0.33, 0.67)));
    metal = skinF;
    F0 = rainbow;
    rough = 0.2;
  } else if (uStyle < 3.5) {
    metal = 1.0 - core * 0.8;
    F0 = vec3(1.0, 0.74, 0.32) * (0.85 + 0.25 * g.b);
    rough = 0.28;
  } else {
    albedo = mix(vec3(0.05, 0.012, 0.012), vec3(0.01), core);
    metal = skinF * 0.8;
    F0 = mix(uAccent, vec3(0.2, 0.02, 0.02), 0.3);
    rough = 0.2;
    float pulse = 0.6 + 0.4 * sin(uTime * 0.9 + uv.x * 25.0);
    emit = vec3(1.2, 0.22, 0.04) * core * pulse * (0.6 + 0.6 * g.a);
  }

  vec3 diffuse = albedo * printLight(N) * 0.8;
  vec3 dielectric = diffuse + keySpec(N, s.V, vec3(0.04), rough) * 0.5 + envSpec(N, s.V, vec3(0.04), rough) * 0.5;
  vec3 metallic = keySpec(N, s.V, F0, rough) + envSpec(N, s.V, F0, rough) * 1.4 + F0 * 0.12;
  return mix(dielectric, metallic, metal) + emit;
}
`;
