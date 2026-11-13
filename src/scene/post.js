import * as THREE from "three";

// The pack screen's full-screen pass. The scene renders into a linear half-float target (MSAA),
// then one composite draws it to the canvas with:
//   bloom      a bright pass at 1/4 size, blurred, plus a wider level at 1/8 (phone-safe: five
//              small passes)
//   reveal     everything that makes a reveal fill the screen, centred on the card's projected
//              position: a shock ring running out past the screen edges (with a refraction
//              wobble and a chromatic split at its front), light rays and streaks thrown from
//              the card, a colour flood, darkness (mythic), an exposure lift, a vignette and a
//              flash.
// The viewer screen doesn't use it (Stage renders straight to the canvas there).

const fullVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// bright pass + 4-tap downsample: only light over the knee reaches the bloom
const brightFrag = /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 uTexel;
uniform float uKnee;
varying vec2 vUv;
vec3 pick(vec2 uv) {
  vec3 c = texture2D(tSrc, uv).rgb;
  float l = max(c.r, max(c.g, c.b));
  float k = max(l - uKnee, 0.0);
  return c * (k * k / (k + 0.25)) / max(l, 1e-4);
}
void main() {
  vec2 o = uTexel * 1.0;
  vec3 c = pick(vUv + vec2(-o.x, -o.y)) + pick(vUv + vec2(o.x, -o.y)) + pick(vUv + vec2(-o.x, o.y)) + pick(vUv + vec2(o.x, o.y));
  gl_FragColor = vec4(min(c * 0.25, vec3(16.0)), 1.0);
}
`;

const copyFrag = /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 uTexel;
varying vec2 vUv;
void main() {
  vec2 o = uTexel;
  vec3 c = texture2D(tSrc, vUv + vec2(-o.x, -o.y)).rgb + texture2D(tSrc, vUv + vec2(o.x, -o.y)).rgb
         + texture2D(tSrc, vUv + vec2(-o.x, o.y)).rgb + texture2D(tSrc, vUv + vec2(o.x, o.y)).rgb;
  gl_FragColor = vec4(c * 0.25, 1.0);
}
`;

// 9-tap gaussian in 5 linear-filtered fetches
const blurFrag = /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 uDir;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tSrc, vUv).rgb * 0.227027;
  vec2 o1 = uDir * 1.384615;
  vec2 o2 = uDir * 3.230769;
  c += (texture2D(tSrc, vUv + o1).rgb + texture2D(tSrc, vUv - o1).rgb) * 0.316216;
  c += (texture2D(tSrc, vUv + o2).rgb + texture2D(tSrc, vUv - o2).rgb) * 0.070270;
  gl_FragColor = vec4(c, 1.0);
}
`;

const compositeFrag = /* glsl */ `
uniform sampler2D tScene;
uniform sampler2D tBloomA;
uniform sampler2D tBloomB;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uOrigin;     // the card on screen, uv
uniform vec3 uCol;        // the reveal's colour, linear
uniform float uWave;      // ring radius, in screen heights
uniform float uWaveA;
uniform float uRays;
uniform float uFlood;
uniform float uFloodR;    // how far the flood has spread, screen heights
uniform float uDark;
uniform float uBloom;
uniform float uExposure;
uniform float uVignette;
uniform float uChroma;
uniform float uDistort;
uniform vec3 uFlash;
uniform float uSeed;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  float aspect = uRes.x / uRes.y;
  vec2 d = (vUv - uOrigin) * vec2(aspect, 1.0);
  float r = length(d);
  vec2 dir = d / max(r, 1e-4);
  vec2 dirUv = dir / vec2(aspect, 1.0);

  // the shock ring: a band at radius uWave, wider as it travels
  float w = 0.035 + 0.09 * uWave;
  float x = r - uWave;
  float band = exp(-x * x / (w * w));
  float front = band * uWaveA;

  // refraction: the ring pushes the image outward at its front edge, pulls it in behind
  float disp = (-x / w) * band * uDistort * 0.018;
  vec2 uv = vUv - dirUv * disp;

  // chromatic split along the ray from the card, strongest at the ring and toward the edges
  float ca = uChroma * (0.0025 + 0.012 * band + 0.004 * r);
  vec3 col;
  col.r = texture2D(tScene, uv + dirUv * ca).r;
  col.g = texture2D(tScene, uv).g;
  col.b = texture2D(tScene, uv - dirUv * ca).b;

  vec3 bloom = texture2D(tBloomA, uv).rgb * 0.75 + texture2D(tBloomB, uv).rgb * 1.1;
  col += bloom * uBloom;

  // mythic: the whole room goes dark except the card itself
  col *= 1.0 - uDark * smoothstep(0.08, 0.45, r);

  vec3 hot = mix(uCol, vec3(1.0), 0.45);

  // flood: the reveal's colour washes over the screen behind the ring, brightest at the card
  float reach = smoothstep(uFloodR + 0.12, uFloodR - 0.12, r);
  float fall = 0.35 + 0.65 * exp(-r * 1.4);
  col = mix(col, col * (0.35 + uCol * 1.6), uFlood * reach * 0.55);
  col += uCol * uFlood * reach * fall * 0.16;

  // rays and streaks from the card, out across the whole frame
  if (uRays > 0.001) {
    float a = atan(d.y, d.x);
    float spokes = pow(0.5 + 0.5 * sin(a * 7.0 + uSeed + sin(a * 3.0 + uTime * 0.4) * 1.3), 6.0)
                 + 0.7 * pow(0.5 + 0.5 * sin(a * 19.0 - uTime * 0.6 + uSeed * 2.0), 14.0);
    float streak = pow(0.5 + 0.5 * sin(a * 41.0 + uSeed * 5.0), 40.0) * (0.5 + 0.5 * sin(r * 14.0 - uTime * 18.0));
    float core = smoothstep(0.0, 0.06, r) * (0.25 + 0.75 * exp(-r * 0.9));
    col += hot * (spokes * 0.22 + streak * 0.5) * core * uRays;
  }

  // the ring itself: a hot leading edge with a coloured tail inside it
  float tail = exp(-max(-x, 0.0) * 5.0) * step(x, 0.0) * smoothstep(0.0, 0.1, uWave);
  col += hot * front * 0.9 + uCol * tail * uWaveA * 0.12;

  col *= 1.0 + uExposure;
  col += uFlash;

  // vignette: the reveal frames the card
  vec2 q = (vUv - 0.5) * vec2(aspect, 1.0);
  col *= 1.0 - uVignette * smoothstep(0.25, 1.0, length(q) / max(0.5 * aspect, 0.5) * 0.85);

  // soft highlight roll-off so floods and blooms don't clip to flat white
  col = col / (1.0 + max(col - 0.85, 0.0) * 0.9);

  gl_FragColor = vec4(max(col, 0.0), 1.0);
  #include <colorspace_fragment>
  gl_FragColor.rgb += (hash(vUv * uRes + fract(uTime)) - 0.5) / 255.0;
}
`;

export function restPost() {
  return { x: 0.5, y: 0.5, col: [1, 1, 1], wave: 0, waveA: 0, rays: 0, flood: 0, floodR: 9, dark: 0, bloom: 0, exposure: 0, vignette: 0, chroma: 0, distort: 0, flash: [0, 0, 0], seed: 0 };
}

export class Post {
  constructor(renderer) {
    this.renderer = renderer;
    const ext = renderer.extensions;
    const half = ext.has("EXT_color_buffer_half_float") || ext.has("EXT_color_buffer_float");
    const type = half ? THREE.HalfFloatType : THREE.UnsignedByteType;
    const opts = { type, depthBuffer: false, stencilBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    this.scene = new THREE.WebGLRenderTarget(1, 1, { type, samples: 4, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    this.a1 = new THREE.WebGLRenderTarget(1, 1, opts);
    this.a2 = new THREE.WebGLRenderTarget(1, 1, opts);
    this.b1 = new THREE.WebGLRenderTarget(1, 1, opts);
    this.b2 = new THREE.WebGLRenderTarget(1, 1, opts);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.quadScene = new THREE.Scene();
    this.quadScene.add(this.quad);
    const mat = (fragmentShader, uniforms) => new THREE.ShaderMaterial({ vertexShader: fullVert, fragmentShader, uniforms, depthTest: false, depthWrite: false });
    this.bright = mat(brightFrag, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uKnee: { value: 0.72 } });
    this.copy = mat(copyFrag, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } });
    this.blur = mat(blurFrag, { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } });
    this.composite = mat(compositeFrag, {
      tScene: { value: this.scene.texture },
      tBloomA: { value: this.a1.texture },
      tBloomB: { value: this.b1.texture },
      uRes: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uOrigin: { value: new THREE.Vector2(0.5, 0.5) },
      uCol: { value: new THREE.Color(1, 1, 1) },
      uWave: { value: 0 },
      uWaveA: { value: 0 },
      uRays: { value: 0 },
      uFlood: { value: 0 },
      uFloodR: { value: 9 },
      uDark: { value: 0 },
      uBloom: { value: 0.2 },
      uExposure: { value: 0 },
      uVignette: { value: 0 },
      uChroma: { value: 0 },
      uDistort: { value: 0 },
      uFlash: { value: new THREE.Color(0, 0, 0) },
      uSeed: { value: 0 },
    });
    this.base = { bloom: 0.22 };
    this.w = 0;
    this.h = 0;
  }

  get uniforms() {
    return this.composite.uniforms;
  }

  setSize(w, h) {
    if (w === this.w && h === this.h) return;
    this.w = w;
    this.h = h;
    this.scene.setSize(w, h);
    const qw = Math.max(1, Math.round(w / 4));
    const qh = Math.max(1, Math.round(h / 4));
    const ew = Math.max(1, Math.round(w / 8));
    const eh = Math.max(1, Math.round(h / 8));
    this.a1.setSize(qw, qh);
    this.a2.setSize(qw, qh);
    this.b1.setSize(ew, eh);
    this.b2.setSize(ew, eh);
    this.composite.uniforms.uRes.value.set(w, h);
  }

  // this frame's reveal state (restPost() shape)
  set(p, time) {
    const u = this.composite.uniforms;
    u.uTime.value = time;
    u.uOrigin.value.set(p.x, p.y);
    u.uCol.value.setRGB(p.col[0], p.col[1], p.col[2]);
    u.uWave.value = p.wave;
    u.uWaveA.value = p.waveA;
    u.uRays.value = p.rays;
    u.uFlood.value = p.flood;
    u.uFloodR.value = p.floodR;
    u.uDark.value = Math.min(0.95, p.dark);
    u.uBloom.value = this.base.bloom + p.bloom;
    u.uExposure.value = p.exposure;
    u.uVignette.value = Math.min(0.9, p.vignette);
    u.uChroma.value = p.chroma;
    u.uDistort.value = p.distort;
    u.uFlash.value.setRGB(p.flash[0], p.flash[1], p.flash[2]);
    u.uSeed.value = p.seed;
  }

  pass(material, target) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.quadScene, this.camera);
  }

  render(scene, camera) {
    const r = this.renderer;
    const size = r.getDrawingBufferSize(new THREE.Vector2());
    this.setSize(size.x, size.y);
    r.setRenderTarget(this.scene);
    r.render(scene, camera);

    this.bright.uniforms.tSrc.value = this.scene.texture;
    this.bright.uniforms.uTexel.value.set(1 / this.w, 1 / this.h);
    this.pass(this.bright, this.a1);
    this.blurPair(this.a1, this.a2);
    this.copy.uniforms.tSrc.value = this.a1.texture;
    this.copy.uniforms.uTexel.value.set(0.5 / this.a1.width, 0.5 / this.a1.height);
    this.pass(this.copy, this.b1);
    this.blurPair(this.b1, this.b2);

    this.pass(this.composite, null);
  }

  blurPair(t, tmp) {
    const b = this.blur.uniforms;
    b.tSrc.value = t.texture;
    b.uDir.value.set(1 / t.width, 0);
    this.pass(this.blur, tmp);
    b.tSrc.value = tmp.texture;
    b.uDir.value.set(0, 1 / t.height);
    this.pass(this.blur, t);
  }
}
