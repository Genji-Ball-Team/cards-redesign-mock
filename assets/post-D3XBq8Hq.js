import{K as e,P as t,R as n,bn as r,et as i,fn as a,in as o,it as s,p as c,rn as l,wn as u}from"./geometry-CzHUig4W.js";var d=`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,f=`
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
`,p=`
uniform sampler2D tSrc;
uniform vec2 uTexel;
varying vec2 vUv;
void main() {
  vec2 o = uTexel;
  vec3 c = texture2D(tSrc, vUv + vec2(-o.x, -o.y)).rgb + texture2D(tSrc, vUv + vec2(o.x, -o.y)).rgb
         + texture2D(tSrc, vUv + vec2(-o.x, o.y)).rgb + texture2D(tSrc, vUv + vec2(o.x, o.y)).rgb;
  gl_FragColor = vec4(c * 0.25, 1.0);
}
`,m=`
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
`,h=`
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
`;function g(){return{x:.5,y:.5,col:[1,1,1],wave:0,waveA:0,rays:0,flood:0,floodR:9,dark:0,bloom:0,exposure:0,vignette:0,chroma:0,distort:0,flash:[0,0,0],seed:0}}function _(e,t,n){return{tScene:{value:e.texture},tBloomA:{value:t.texture},tBloomB:{value:n.texture},uRes:{value:new r(1,1)},uTime:{value:0},uOrigin:{value:new r(.5,.5)},uCol:{value:new c(1,1,1)},uWave:{value:0},uWaveA:{value:0},uRays:{value:0},uFlood:{value:0},uFloodR:{value:9},uDark:{value:0},uBloom:{value:.2},uExposure:{value:0},uVignette:{value:0},uChroma:{value:0},uDistort:{value:0},uFlash:{value:new c(0,0,0)},uSeed:{value:0}}}var v=class{renderer;scene;a1;a2;b1;b2;camera;quad;quadScene;bright;copy;blur;composite;compositeU;base;w;h;constructor(c){this.renderer=c;let g=c.extensions,v=g.has(`EXT_color_buffer_half_float`)||g.has(`EXT_color_buffer_float`)?t:a,y={type:v,depthBuffer:!1,stencilBuffer:!1,minFilter:n,magFilter:n};this.scene=new u(1,1,{type:v,samples:4,minFilter:n,magFilter:n}),this.a1=new u(1,1,y),this.a2=new u(1,1,y),this.b1=new u(1,1,y),this.b2=new u(1,1,y),this.camera=new i(-1,1,1,-1,0,1),this.quad=new e(new s(2,2)),this.quad.frustumCulled=!1,this.quadScene=new l,this.quadScene.add(this.quad);let b=(e,t)=>new o({vertexShader:d,fragmentShader:e,uniforms:t,depthTest:!1,depthWrite:!1});this.bright=b(f,{tSrc:{value:null},uTexel:{value:new r},uKnee:{value:.72}}),this.copy=b(p,{tSrc:{value:null},uTexel:{value:new r}}),this.blur=b(m,{tSrc:{value:null},uDir:{value:new r}}),this.compositeU=_(this.scene,this.a1,this.b1),this.composite=b(h,this.compositeU),this.base={bloom:.22},this.w=0,this.h=0}get uniforms(){return this.compositeU}setSize(e,t){if(e===this.w&&t===this.h)return;this.w=e,this.h=t,this.scene.setSize(e,t);let n=Math.max(1,Math.round(e/4)),r=Math.max(1,Math.round(t/4)),i=Math.max(1,Math.round(e/8)),a=Math.max(1,Math.round(t/8));this.a1.setSize(n,r),this.a2.setSize(n,r),this.b1.setSize(i,a),this.b2.setSize(i,a),this.compositeU.uRes.value.set(e,t)}set(e,t){let n=this.compositeU;n.uTime.value=t,n.uOrigin.value.set(e.x,e.y),n.uCol.value.setRGB(e.col[0],e.col[1],e.col[2]),n.uWave.value=e.wave,n.uWaveA.value=e.waveA,n.uRays.value=e.rays,n.uFlood.value=e.flood,n.uFloodR.value=e.floodR,n.uDark.value=Math.min(.95,e.dark),n.uBloom.value=this.base.bloom+e.bloom,n.uExposure.value=e.exposure,n.uVignette.value=Math.min(.9,e.vignette),n.uChroma.value=e.chroma,n.uDistort.value=e.distort,n.uFlash.value.setRGB(e.flash[0],e.flash[1],e.flash[2]),n.uSeed.value=e.seed}pass(e,t){this.quad.material=e,this.renderer.setRenderTarget(t),this.renderer.render(this.quadScene,this.camera)}render(e,t){let n=this.renderer,i=n.getDrawingBufferSize(new r);this.setSize(i.x,i.y),n.setRenderTarget(this.scene),n.render(e,t),this.bright.uniforms.tSrc.value=this.scene.texture,this.bright.uniforms.uTexel.value.set(1/this.w,1/this.h),this.pass(this.bright,this.a1),this.blurPair(this.a1,this.a2),this.copy.uniforms.tSrc.value=this.a1.texture,this.copy.uniforms.uTexel.value.set(.5/this.a1.width,.5/this.a1.height),this.pass(this.copy,this.b1),this.blurPair(this.b1,this.b2),this.pass(this.composite,null)}blurPair(e,t){let n=this.blur.uniforms;n.tSrc.value=e.texture,n.uDir.value.set(1/e.width,0),this.pass(this.blur,t),n.tSrc.value=t.texture,n.uDir.value.set(0,1/e.height),this.pass(this.blur,e)}};export{g as n,v as t};