// Rare: cool brushed satin metal. Fine horizontal brushing in the normal; anisotropic GGX
// (tight across the brushing, wide along it) makes the key light a vertical band that sweeps
// sideways as the card turns, and a bent normal stretches the room's strip lights the same way.
// Metal is strongest on the printed frame, light over art and panels, and kept off bright type.

export const rareShade = /* glsl */ `
float D_aniso(float ToH, float BoH, float NoH, float at, float ab) {
  float d = (ToH * ToH) / (at * at) + (BoH * BoH) / (ab * ab) + NoH * NoH;
  return 1.0 / (PI * at * ab * d * d);
}

vec3 shade(vec2 uv, Surf s) {
  vec3 art = texture2D(uArt, uv).rgb;
  vec4 m = texture2D(uMap, uv);
  float L = luma(art);
  float fz = frameZone(uv);
  float wz = windowZone(uv);
  float pz = 1.0 - max(fz, wz);

  // brushing: long horizontal streaks at two scales
  float fine = texture2D(uNoiseA, vec2(uv.x * 0.05, uv.y * uCard.y * 1.4)).b;
  float coarse = texture2D(uNoiseB, vec2(uv.x * 0.12, uv.y * uCard.y * 2.2)).r;
  float streak = fine * 0.6 + coarse * 0.4;
  vec3 N = perturb(s, (m.rg - 0.5) * (0.15 + 0.35 * fz) + vec2(0.0, (streak - 0.5) * 0.16));

  float protect = smoothstep(0.5, 0.9, L);
  float metal = (fz * 0.9 + wz * 0.32 + pz * 0.26) * (1.0 - 0.8 * protect);

  // anisotropic key highlight (grooves along T => highlight stretched along B). The key is
  // treated as a lamp a few units away, so the band sits at one place on the card and sweeps
  // across it as the card turns, instead of lighting the whole face at once.
  vec3 Lk = keyL();
  vec3 H = normalize(Lk + s.V);
  float NoL = sat1(dot(N, Lk));
  float NoV = max(dot(N, s.V), 1e-3);
  float D = D_aniso(dot(s.T, H), dot(s.B, H), sat1(dot(N, H)), 0.055, 0.5);
  float F = 0.55 + 0.45 * pow(1.0 - sat1(dot(s.V, H)), 5.0);
  float band = D * F * NoL * 0.22 / (NoV + NoL - NoV * NoL + 0.2);

  // environment through a bent normal: grooves along T scatter reflections vertically, so the
  // normal keeps its sideways (T) tilt, which sets where a strip light lands, but faces the
  // viewer vertically. The strips become full-height bands that sweep across as the card turns.
  vec3 aT = cross(s.T, s.V);
  vec3 aN = normalize(cross(aT, s.T));
  vec3 bent = normalize(mix(N, aN, 0.85));
  vec3 Rb = roomDir(reflect(-s.V, bent));
  vec3 env = studioEnv(Rb, 0.3);

  // The streak: each tall strip light, smeared full-height by the brushing, lands on the card
  // where the bent reflection's azimuth meets the light's. A bright core with a soft skirt; it
  // sits at one place on the card and runs across the frame as the card turns.
  // (the two room strips plus a weaker one beside the camera, so some streak is on the card at
  // most angles)
  float az = atan(Rb.x, Rb.z);
  float dl = (az + 0.58) / 0.04;
  float dr = (az - 0.66) / 0.036;
  float dc = (az - 0.05) / 0.034;
  float core = exp(-dl * dl) + 0.85 * exp(-dr * dr) + 0.6 * exp(-dc * dc);
  float skirt = exp(-dl * dl * 0.1) + 0.85 * exp(-dr * dr * 0.1) + 0.6 * exp(-dc * dc * 0.1);
  float streak2 = core + 0.12 * skirt + band * 0.3;

  vec3 blue = uAccent * vec3(0.8, 1.0, 1.4);
  vec3 streakCol = mix(blue * 1.7, vec3(0.95, 1.05, 1.2) * 1.3, sat1(core * 0.9 - 0.35));
  float onStreak = fz * 1.3 + wz * 0.45 + pz * 0.8;

  vec3 tint = mix(uAccent * 1.25, vec3(1.0), 0.32);
  vec3 inkTint = mix(vec3(L), art, 0.5) * 1.2 + 0.15;
  vec3 metalCol = env * 0.3 * tint * inkTint;

  vec3 col = art * printLight(N) * (1.0 - metal * 0.3) + metalCol * metal;
  col += streakCol * streak2 * onStreak * (1.0 - 0.6 * protect);
  // satin: a cool blue lift at glancing angles
  col += pow(1.0 - NoV, 3.0) * uAccent * 0.18 * (0.4 + metal);
  return col;
}
`;
