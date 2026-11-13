// Mythic: the darkest, and alive. Under a clear lacquer, two layers sit at different depths
// below the surface (they parallax with the view whether or not art parallax is on):
//   - smoke: slow domain-warped fbm, a crimson haze that deepens the dark parts of the art
//   - ember veins: the zero-crossings of a warped fbm, glowing deep red to orange, breathing slowly
// Both only show through dark ink in the art's calm areas, never over type or on detail that is
// already busy. The lacquer reflects the room through a thin-film interference tint kept in the
// red / magenta / violet family (dark iridescence). The print number is hot-stamped in red foil
// on its own black plate.

export const mythicShade = /* glsl */ `
uniform sampler2D uStamp;
uniform vec4 uStampRect;
uniform vec2 uStampTexel;
uniform float uStampOn;

vec3 thinFilm(float phase) {
  // crimson -> magenta -> violet, never warm enough to turn the blacks brown
  return vec3(0.42, 0.05, 0.24) + vec3(0.32, 0.05, 0.26) * cos(6.2831853 * (phase + vec3(0.0, 0.25, 0.5)));
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
  float t = uTime;

  vec3 Vt = toTangent(s, s.V);
  vec2 vdir = Vt.xy / max(Vt.z, 0.4);
  vec2 wp = uv * uCard;                      // world-scaled surface coordinates

  // smoke, deepest layer
  vec2 c1 = (wp - vdir * 0.16) * 0.32 + vec2(0.0, t * 0.010);
  vec4 n1 = texture2D(uNoiseB, c1);
  // veins, middle layer, warped by the smoke
  vec2 warp = (n1.rg - 0.5) * 0.45;
  vec2 c2 = (wp - vdir * 0.07) * 0.42 + warp + vec2(t * 0.006, -t * 0.008);
  vec4 n2 = texture2D(uNoiseB, c2);
  vec2 c3 = (wp - vdir * 0.04) * 0.9 - warp * 0.6 + vec2(-t * 0.009, t * 0.004);
  float n3 = texture2D(uNoiseB, c3).a;

  float ridge = 1.0 - abs(n2.b - 0.5) * 2.0;
  float ridge2 = 1.0 - abs(n3 - 0.5) * 2.0;
  float vein = pow(ridge, 34.0) + pow(ridge2, 48.0) * 0.7;
  float pulse = 0.55 + 0.45 * sin(t * 0.8 + n1.a * 9.0);
  vec3 emberCol = mix(vec3(0.5, 0.025, 0.01), vec3(1.9, 0.5, 0.1), sat1(vein * pulse));

  float dark = 1.0 - smoothstep(0.03, 0.2, L);
  float zone = wz * 0.95 + fz * 0.7 + pz * 0.45;
  // calm (uMap.b): where the art is already busy or bright (painted lightning, dense detail)
  // the effect backs off, so it lives in the quiet dark areas and the art keeps its shape
  float calm = m.b;
  float through = dark * zone * (1.0 - m.a * 0.7) * calm * calm * calm;

  vec3 N = perturb(s, (m.rg - 0.5) * 0.22);
  // the darkest card: shadows sink under the lacquer, deeper still where smoke drifts
  float smoke = smoothstep(0.35, 0.9, n1.a * 0.6 + n2.a * 0.6);
  vec3 col = art * printLight(N) * mix(1.0, 0.55, dark * zone * (0.4 + 0.6 * calm)) * (1.0 - 0.4 * smoke * through);
  // a faint crimson glow inside the smoke, then the veins burning through it
  col += vec3(0.06, 0.005, 0.007) * smoke * through;
  col += emberCol * vein * through * pulse * 1.15;

  // lacquer with dark iridescence
  float NoV = sat1(dot(N, s.V));
  vec3 film = thinFilm(NoV * 1.6 + n1.b * 0.5 + t * 0.01);
  // a smoked lacquer: dim straight on, the film colours rise towards grazing angles
  float graze = 0.35 + 0.65 * pow(1.0 - NoV, 1.5);
  col += envSpec(N, s.V, vec3(0.02), 0.14) * film * graze * 0.8;
  col += keySpec(N, s.V, vec3(0.04), 0.12) * mix(film, vec3(1.0), 0.3);
  col += pow(1.0 - NoV, 3.0) * uAccent * 0.25;

  // The print number, hot-foil stamped on its own plate in the same place on every mythic:
  // a smooth black lacquer plate (covers what is printed under it, so the number never fights
  // the art), a thin red foil rim, and the number pressed into the plate in red foil (the
  // bevel is inverted: the glyphs sit lower than the plate).
  vec2 st = (uv - uStampRect.xy) / (uStampRect.zw - uStampRect.xy);
  if (uStampOn > 0.001 && st.x > 0.0 && st.x < 1.0 && st.y > 0.0 && st.y < 1.0) {
    vec4 sm = texture2D(uStamp, st);
    float hx = texture2D(uStamp, st + vec2(uStampTexel.x, 0.0)).g - texture2D(uStamp, st - vec2(uStampTexel.x, 0.0)).g;
    float hy = texture2D(uStamp, st + vec2(0.0, uStampTexel.y)).g - texture2D(uStamp, st - vec2(0.0, uStampTexel.y)).g;
    vec3 Ns = perturb(s, vec2(hx, hy) * 4.0);
    vec3 F0 = vec3(0.95, 0.2, 0.1);
    // a red mirror: the room's lights where they reach it, a lit red body everywhere else
    vec3 foilCol = envSpec(Ns, s.V, F0, 0.2) * 1.4 + keySpec(Ns, s.V, F0, 0.2)
                 + vec3(0.55, 0.05, 0.03) * (0.65 + 0.55 * sat1(dot(Ns, keyL())));
    vec3 plateCol = vec3(0.012, 0.004, 0.005) + envSpec(s.Ng, s.V, vec3(0.04), 0.08) * 0.8
                  + keySpec(s.Ng, s.V, vec3(0.04), 0.1) * 0.6;
    col = mix(col, plateCol, sm.b * uStampOn);
    col = mix(col, foilCol, max(sm.r, sm.a * 0.9) * uStampOn);
  }
  return col;
}
`;
