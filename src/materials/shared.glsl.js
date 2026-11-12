// GLSL shared by every card material: varyings, the showroom environment, GGX lighting,
// zones of the printed card (frame / art window / text panels) and the parallax lookup.

export const vertexShader = /* glsl */ `
uniform float uTangentSign;
varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying vec3 vTangentW;
varying vec3 vBitangentW;
varying vec3 vCardZ;
varying vec2 vLocal;

void main() {
  vUv = uv;
  vLocal = position.xy;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  mat3 m = mat3(modelMatrix);
  vNormalW = normalize(m * normal);
  vTangentW = normalize(m * vec3(uTangentSign, 0.0, 0.0));
  vBitangentW = normalize(m * vec3(0.0, 1.0, 0.0));
  vCardZ = normalize(m * vec3(0.0, 0.0, 1.0));
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const head = /* glsl */ `
uniform float uTime;
uniform vec3 uKeyDir;     // towards the key light (upper left, in front)
uniform vec3 uKeyCol;
uniform vec3 uRimDir;     // towards the rim light (behind, upper right)
uniform vec3 uRimCol;
uniform vec3 uAccent;     // rarity colour, linear
uniform vec2 uCard;       // card width, height in world units
uniform sampler2D uNoiseA;
uniform sampler2D uNoiseB;

varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying vec3 vTangentW;
varying vec3 vBitangentW;
varying vec3 vCardZ;
varying vec2 vLocal;

#define PI 3.14159265

float sat1(float x) { return clamp(x, 0.0, 1.0); }
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

// The showroom, as seen in reflections. Analytic, so roughness can widen every light's edge
// (a cheap stand-in for a prefiltered environment map).
//   - two tall strip lights left and right of the camera (product-shot style)
//   - an overhead softbox
//   - a thin green neon line running round the room at eye height (brand accent)
//   - faint warm floor bounce, and an almost black room
vec3 studioEnv(vec3 R, float rough) {
  float az = atan(R.x, R.z);
  float el = asin(clamp(R.y, -1.0, 1.0));
  float w = 0.025 + rough * 0.5;
  float narrow = mix(1.0, 0.3, rough);
  vec3 c = vec3(0.010, 0.012, 0.016);
  c += vec3(0.035, 0.028, 0.022) * smoothstep(0.0, -0.7, el);
  float top = smoothstep(0.42 - w, 0.42 + w, el) * (1.0 - smoothstep(0.75, 0.75 + w * 1.5, abs(az)));
  c += vec3(2.2, 2.15, 2.05) * top * mix(1.0, 0.65, rough);
  float sl = (1.0 - smoothstep(0.07, 0.07 + w, abs(az + 0.58)))
           * smoothstep(-0.45 - w, -0.35, el) * (1.0 - smoothstep(0.7, 0.8 + w, el));
  c += vec3(2.6, 2.75, 3.0) * sl * narrow;
  float sr = (1.0 - smoothstep(0.04, 0.04 + w, abs(az - 0.66)))
           * smoothstep(-0.3 - w, -0.2, el) * (1.0 - smoothstep(0.55, 0.65 + w, el));
  c += vec3(2.4, 2.1, 1.8) * sr * narrow;
  float neon = 1.0 - smoothstep(0.012, 0.012 + w * 0.6, abs(el + 0.12));
  c += vec3(0.25, 0.85, 0.5) * neon * 0.45 * narrow;
  float front = exp(-(az * az + el * el) * 3.0);
  c += vec3(0.10, 0.11, 0.12) * front;
  return c;
}

float D_GGX(float NoH, float a) {
  float a2 = a * a;
  float d = NoH * NoH * (a2 - 1.0) + 1.0;
  return a2 / (PI * d * d);
}
float V_Smith(float NoV, float NoL, float a) {
  float k = a * 0.5;
  return 0.25 / ((NoV * (1.0 - k) + k) * (NoL * (1.0 - k) + k));
}
vec3 F_Schlick(vec3 f0, float VoH) { return f0 + (1.0 - f0) * pow(1.0 - VoH, 5.0); }

// The key is a lamp a few units out along uKeyDir, so highlights land somewhere on the card
// (and move over it) instead of washing a flat face evenly.
vec3 keyL() { return normalize(uKeyDir * 3.2 - vWorldPos); }

// Key light specular (radiance already multiplied in).
vec3 keySpec(vec3 N, vec3 V, vec3 f0, float rough) {
  vec3 L = keyL();
  vec3 H = normalize(L + V);
  float NoL = sat1(dot(N, L));
  float NoV = max(dot(N, V), 1e-3);
  float a = max(rough * rough, 0.002);
  return D_GGX(sat1(dot(N, H)), a) * V_Smith(NoV, NoL, a) * F_Schlick(f0, sat1(dot(V, H))) * NoL * uKeyCol * 3.0;
}

// The room has a size: a reflected ray leaves from this point on the card, so the lights it hits
// shift across a flat card instead of the whole face mirroring one light at once.
const float ROOM = 3.0;
vec3 roomDir(vec3 R) { return normalize(R * ROOM + vWorldPos); }

// Environment reflection with a roughness-aware Fresnel.
vec3 envSpec(vec3 N, vec3 V, vec3 f0, float rough) {
  vec3 R = roomDir(reflect(-V, N));
  float NoV = sat1(dot(N, V));
  vec3 F = f0 + (max(vec3(1.0 - rough), f0) - f0) * pow(1.0 - NoV, 5.0);
  return studioEnv(R, rough) * F;
}

// Diffuse light on printed ink, calibrated so the card facing the camera shows the art ~1:1.
vec3 printLight(vec3 N) {
  float k = sat1(dot(N, uKeyDir));
  float r = sat1(dot(N, uRimDir));
  return vec3(0.5) + uKeyCol * k * 0.66 + uRimCol * r * 0.4 + studioEnv(N, 1.0) * 0.2;
}

// Highlight shoulder: leaves the art untouched below ~0.8 linear, rolls off foil peaks.
vec3 shoulder(vec3 c) {
  const float a = 0.8;
  vec3 over = max(c - a, 0.0);
  return min(c, vec3(a)) + (1.0 - a) * (1.0 - exp(-over / (1.0 - a)));
}

struct Surf { vec3 Ng; vec3 T; vec3 B; vec3 V; };
Surf surf() {
  Surf s;
  s.Ng = normalize(vNormalW);
  s.T = normalize(vTangentW);
  s.B = normalize(vBitangentW);
  s.V = normalize(cameraPosition - vWorldPos);
  return s;
}
vec3 perturb(Surf s, vec2 g) { return normalize(s.Ng + s.T * g.x + s.B * g.y); }
vec3 toTangent(Surf s, vec3 d) { return vec3(dot(d, s.T), dot(d, s.B), dot(d, s.Ng)); }
`;

// Front-only helpers: the printed card's zones and the parallax lookup. The zones come from the
// card's own image (card/zones.js), never from a fixed layout: every card is drawn differently.
export const frontHead = /* glsl */ `
#define FRONT_FACE
uniform sampler2D uArt;
uniform sampler2D uMap;
uniform sampler2D uZones;  // r window, g frame band, b how deep the art may sink (0..1)
uniform float uParallax;   // 0 = off, 1 = on (eased)
uniform float uDepthOn;    // 0 when this card's window wasn't found confidently
uniform float uDepth;      // how far the art window sits behind the frame (world units)

float frameZone(vec2 uv) { return texture2D(uZones, uv).g; }
float windowZone(vec2 uv) { return texture2D(uZones, uv).r; }
float depthAt(vec2 uv) { return texture2D(uZones, uv).b; }

// Parallax: the art window is a tray sunk behind the printed frame, its floor depth given per
// pixel by the zone map. Right up to a painted window line the floor is fully sunk, so the line
// becomes the tray's rim and the art slides under it; where nothing painted marks the edge
// (art breaking out, a badge or banner across it) the floor rises gently to the surface instead,
// so nothing painted is cut. The view ray is marched down to the floor; where it meets a side
// wall instead, the wall shows near black. The rim shades the floor from the key light.
// Returns the art uv to sample and a 'shade' multiplier.
vec2 parallaxUv(vec2 uv, Surf s, out float shade) {
  shade = 1.0;
  float amt = uParallax * uDepthOn;
  if (amt <= 0.001 || depthAt(uv) <= 0.002) return uv;
  float d = uDepth * amt;
  vec3 Vt = toTangent(s, s.V);
  vec2 off = Vt.xy / max(Vt.z, 0.35) / uCard * d;   // uv shift at full depth
  // march: the ray is at depth h; it lands where the floor (depth D) is no deeper than the ray
  vec2 p = uv;
  float hPrev = 0.0;
  float gPrev = depthAt(uv);
  for (int i = 1; i <= 10; i++) {
    float h = float(i) / 10.0;
    vec2 q = uv - off * h;
    float D = depthAt(q);
    if (h >= D) {
      // refine between the last two samples
      float a = (gPrev - hPrev) / max((gPrev - hPrev) - (D - h), 1e-4);
      p = uv - off * mix(hPrev, h, a);
      break;
    }
    p = q;
    hPrev = h;
    gPrev = D;
  }
  float Dp = depthAt(p);
  // a side wall: the floor changes steeply where the ray landed
  vec2 e = normalize(off + 1e-6) * vec2(1.0 / 320.0, 1.0 / 440.0) * 1.5;
  float slope = abs(depthAt(p + e) - depthAt(p - e));
  float wall = smoothstep(0.25, 0.6, slope);
  // the rim's shadow (the floor towards the key light is higher) and contact darkening
  vec3 Lt = toTangent(s, keyL());
  vec2 offL = Lt.xy / max(Lt.z, 0.35) / uCard * d;
  float occl = sat1((Dp - depthAt(p + offL * Dp)) * 2.5);
  float Dblur = texture2D(uZones, p, 3.0).b;
  float ao = 1.0 - 0.3 * sat1((Dp - Dblur) * 3.0);
  float floorShade = (1.0 - 0.45 * occl) * ao;
  float wallShade = 0.1;
  shade = mix(floorShade, wallShade, wall);
  return p;
}
`;

export const fragmentMain = /* glsl */ `
#ifdef FRONT_FACE
// The die-cut edge of the face: a thin bevel of bare stock round the outline. The art is
// painted right out to the image edge (noisy borders, square corners), so without it the
// silhouette is whatever pixel happens to sit at the cut; with it the outline is one clean line
// that catches the light like a real cut edge.
// Where the image has backdrop outside the painted card's own border (measured per card:
// uOutline = inset left, bottom, right, top; uPaintR = its corner radius), that is trimmed to
// stock too, so the cut follows the painted border instead of showing the backdrop.
uniform float uCornerR;
uniform vec4 uOutline;
uniform float uPaintR;
float rrect(vec2 p, vec2 halfSize, float r) {
  vec2 q = abs(p) - halfSize + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;   // < 0 inside
}
vec3 cutEdge(vec3 c, Surf s) {
  vec2 h = uCard * 0.5 - uCornerR;
  vec2 q = abs(vLocal) - h;
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uCornerR;   // < 0 inside
  // the painted outline, as a rounded rect shifted by the per-side insets
  vec2 pc = vec2(uOutline.x - uOutline.z, uOutline.y - uOutline.w) * 0.5;
  vec2 ph = uCard * 0.5 - vec2(uOutline.x + uOutline.z, uOutline.y + uOutline.w) * 0.5;
  float dp = rrect(vLocal - pc, ph, max(uPaintR, 0.001));
  float inset = min(-d, -dp);
  float rim = 1.0 - smoothstep(0.004, 0.0075, inset);
  if (rim <= 0.0) return c;
  vec2 out2 = q.x > 0.0 && q.y > 0.0 ? normalize(q) : (q.x > q.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0));
  out2 *= sign(vLocal);
  vec3 N = normalize(s.Ng + (s.T * out2.x + s.B * out2.y) * 0.9);
  vec3 stock = vec3(0.045, 0.045, 0.05) + uAccent * 0.02;
  vec3 e = stock * printLight(N) + keySpec(N, s.V, vec3(0.05), 0.3) * 0.8 + envSpec(N, s.V, vec3(0.05), 0.3) * 0.5;
  return mix(c, e, rim * 0.9);
}
#endif

void main() {
  Surf s = surf();
  vec3 c = shade(vUv, s);
#ifdef FRONT_FACE
  c = cutEdge(c, s);
#endif
  gl_FragColor = vec4(shoulder(c), 1.0);
  #include <colorspace_fragment>
}
`;
