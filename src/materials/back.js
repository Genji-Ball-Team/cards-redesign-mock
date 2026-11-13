// Card back. Colour comes from the drawn back texture; a mask texture says what is foil (logo,
// type, rules: r), what is spot-gloss varnish (the pattern: g) and what is embossed (b).
// Base stock gets a satin varnish; the spot-gloss pattern is much glossier so it appears in the
// room's reflections; foil is metal whose colour is the printed colour beneath it.

export const backShade = /* glsl */ `
uniform sampler2D uBackCol;
uniform sampler2D uBackMask;
uniform vec2 uMaskTexel;

vec3 shade(vec2 uv, Surf s) {
  vec3 base = texture2D(uBackCol, uv).rgb;
  vec4 mk = texture2D(uBackMask, uv);
  float hx = texture2D(uBackMask, uv + vec2(uMaskTexel.x, 0.0)).b - texture2D(uBackMask, uv - vec2(uMaskTexel.x, 0.0)).b;
  float hy = texture2D(uBackMask, uv + vec2(0.0, uMaskTexel.y)).b - texture2D(uBackMask, uv - vec2(0.0, uMaskTexel.y)).b;
  vec4 g = texture2D(uNoiseA, uv * uCard * 2.6);
  vec3 N = perturb(s, -vec2(hx, hy) * 5.0 + (g.rg - 0.5) * 0.06 * (1.0 - mk.r));

  vec3 diffuse = base * printLight(N) * (0.96 + 0.06 * g.b);
  float rough = mix(0.5, 0.12, mk.g);
  // the satin stock's broad highlight is kept low so a near-black back stays black when it
  // faces the key light; the spot-gloss pattern keeps its full, tight highlight
  vec3 varnish = keySpec(N, s.V, vec3(0.04), rough) * mix(0.1, 0.8, mk.g) + envSpec(N, s.V, vec3(0.04), rough) * mix(0.12, 0.38, mk.g);

  vec3 F0 = clamp(base * 1.35 + 0.04, 0.0, 1.0);
  vec3 foil = keySpec(N, s.V, F0, 0.2) + envSpec(N, s.V, F0, 0.2) * 1.2 + base * 0.35;

  vec3 col = mix(diffuse + varnish, foil, mk.r);
  col += pow(1.0 - sat1(dot(N, s.V)), 4.0) * vec3(0.04, 0.09, 0.06);
  return col;
}
`;
