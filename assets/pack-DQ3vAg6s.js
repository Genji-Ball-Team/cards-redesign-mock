import{c as e,f as t,n,o as r,s as i}from"./icons-B4UciC06.js";import{K as a,N as o,R as s,bn as c,ft as l,in as u,p as d,t as f,tn as p,u as m,x as h,z as g}from"./geometry-CzHUig4W.js";import{a as ee,i as te,o as _,r as ne}from"./card-DykATURn.js";import{n as re,t as ie}from"./pointer-BcMK_EYi.js";import{S as ae,a as oe,b as v,c as y,g as b,h as x,i as se,l as S,o as C,p as ce,r as le,s as w,u as T,v as E,x as D,y as O}from"./roomLight-DB-ifc0o.js";import{j as k}from"./index-J3lP8W1Y.js";import{a as ue,c as de,i as fe,n as pe,o as me,s as he}from"./pulls-bfB2TnIU.js";import{t as ge}from"./gemTiles-DigZ4rXZ.js";var _e=`
attribute float aSide;
varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying vec3 vTangentW;
varying vec3 vBitangentW;
varying vec3 vCardZ;
varying vec2 vLocal;
varying float vSide;

void main() {
  vUv = uv;
  vLocal = position.xy;
  vSide = aSide;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  mat3 m = mat3(modelMatrix);
  vNormalW = normalize(m * normal);
  vTangentW = normalize(m * vec3(aSide > 0.5 ? 1.0 : -1.0, 0.0, 0.0));
  vBitangentW = normalize(m * vec3(0.0, 1.0, 0.0));
  vCardZ = normalize(m * vec3(0.0, 0.0, 1.0));
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`,ve=ee+`
uniform sampler2D uColF;
uniform sampler2D uMaskF;
uniform sampler2D uColB;
uniform sampler2D uMaskB;
uniform vec2 uTexel;
uniform vec2 uSize;
uniform float uSealH;
uniform float uTearY;
uniform float uPart;     // 0 body, 1 cap
uniform float uTorn;     // 0 sealed, 1 torn (the cut goes ragged)
uniform float uHolo;
uniform float uEmber;
uniform float uSweep;    // position of the light sweep along the diagonal; off when far out
uniform float uGather;   // 0..1 light gathering at the tear line
uniform vec3 uTrim;      // linear trim colour
uniform float uLift;     // hover: a touch more light
uniform float uFade;     // 1 visible
varying float vSide;

float tri(float x) { return abs(fract(x) - 0.5) * 2.0; }

void main() {
  vec2 p = vLocal;
  // pinked top and bottom edges
  float pink = tri(p.x / 0.05) * 0.02;
  if (abs(p.y) > uSize.y * 0.5 - pink) discard;
  // the tear: straight before, ragged after
  float rag = (tri(p.x / 0.083 + 0.3) - 0.5) * 0.03 + (hash12(vec2(floor(p.x / 0.021), 3.0)) - 0.5) * 0.018;
  float cut = uTearY + rag * uTorn;
  if (uPart < 0.5 && p.y > cut) discard;
  if (uPart > 0.5 && p.y < cut) discard;

  Surf s = surf();
  bool front = vSide > 0.5;
  vec2 uv = vUv;
  vec3 base = front ? texture2D(uColF, uv).rgb : texture2D(uColB, uv).rgb;
  vec4 mk = front ? texture2D(uMaskF, uv) : texture2D(uMaskB, uv);

  // inside of the pouch, seen through the torn top: dull silver
  if (!gl_FrontFacing) {
    s.Ng = -s.Ng;
    vec3 Ni = perturb(s, (texture2D(uNoiseB, p * 0.8).rg - 0.5) * 0.4);
    vec3 c = envSpec(Ni, s.V, vec3(0.35), 0.4) * 0.5 + vec3(0.02);
    gl_FragColor = vec4(shoulder(c) * uFade, 1.0);
    #include <colorspace_fragment>
    return;
  }

  // emboss
  float ex = (front ? texture2D(uMaskF, uv + vec2(uTexel.x, 0.0)).b - texture2D(uMaskF, uv - vec2(uTexel.x, 0.0)).b
                    : texture2D(uMaskB, uv + vec2(uTexel.x, 0.0)).b - texture2D(uMaskB, uv - vec2(uTexel.x, 0.0)).b);
  float ey = (front ? texture2D(uMaskF, uv + vec2(0.0, uTexel.y)).b - texture2D(uMaskF, uv - vec2(0.0, uTexel.y)).b
                    : texture2D(uMaskB, uv + vec2(0.0, uTexel.y)).b - texture2D(uMaskB, uv - vec2(0.0, uTexel.y)).b);
  vec2 g = -vec2(ex, ey) * 4.0;

  // foil wrinkles: soft dents plus a few sharp creases, stronger toward the seals and sides
  float inner = uSize.y * 0.5 - uSealH;
  float edgeNear = max(smoothstep(inner - 0.35, inner, abs(p.y)), smoothstep(uSize.x * 0.5 - 0.3, uSize.x * 0.5, abs(p.x)));
  vec2 q = p * 0.42 + 0.17;
  float e = 0.012;
  float h0 = texture2D(uNoiseB, q).a;
  float hx = texture2D(uNoiseB, q + vec2(e, 0.0)).a - h0;
  float hy = texture2D(uNoiseB, q + vec2(0.0, e)).a - h0;
  vec2 q2 = p * vec2(0.9, 0.6) + 0.5;
  float c0 = abs(texture2D(uNoiseB, q2).b - 0.5);
  float cx = abs(texture2D(uNoiseB, q2 + vec2(e, 0.0)).b - 0.5) - c0;
  float cy = abs(texture2D(uNoiseB, q2 + vec2(0.0, e)).b - 0.5) - c0;
  float crease = 1.0 - smoothstep(0.0, 0.05, c0);
  // crimped seals: fine vertical ridges (the seal is pressed flat, so no wrinkles there)
  float seal = smoothstep(inner - 0.004, inner + 0.006, abs(p.y));
  g += ((vec2(hx, hy) * (2.6 + 4.0 * edgeNear) - vec2(cx, cy) * 7.0 * crease * (0.4 + edgeNear))) * (1.0 - 0.85 * seal);
  // (faded out where a ridge gets close to a pixel wide, or it aliases into streaks)
  float ridgeAA = 1.0 - smoothstep(0.25, 0.5, fwidth(p.x) / 0.04);
  g.x += sin(p.x * 6.2831 / 0.04) * 0.35 * seal * ridgeAA;
  // fin seal down the back
  if (!front) g.x += sin(p.x * 6.2831 / 0.03) * 0.3 * ridgeAA * (1.0 - smoothstep(0.03, 0.04, abs(p.x)));
  vec3 N = perturb(s, g);

  float t = uTime;
  float NoV = sat1(dot(N, s.V));
  // holographic film
  float phase = dot(s.V, s.T) * 1.4 + dot(s.V, s.B) * 0.9 + uv.x * 1.6 + uv.y * 0.8 + h0 * 0.8;
  vec3 rainbow = 0.55 + 0.45 * cos(6.2831853 * (phase + vec3(0.0, 0.33, 0.67)));
  float holo = uHolo * max(mk.a, seal * 0.4) ;

  // bare foil
  vec3 F0 = mix(base, rainbow * mix(vec3(1.0), base * 1.4 + 0.2, 0.35), holo);
  F0 = clamp(F0, 0.0, 1.0);
  vec3 foil = keySpec(N, s.V, F0, 0.2) * 1.1 + envSpec(N, s.V, F0, 0.17) * 1.35 + F0 * 0.05;

  // ink on metallised film
  float rough = mix(0.42, 0.13, mk.g);
  vec3 ink = base * printLight(N) * 0.85
           + envSpec(N, s.V, base * 0.6 + 0.03, 0.32) * 0.55
           + keySpec(N, s.V, vec3(0.04), rough) * 0.9 + envSpec(N, s.V, vec3(0.04), rough) * (0.4 + 0.6 * mk.g);

  vec3 col = mix(ink, foil, mk.r);

  // mythic: ember veins under the ink
  if (uEmber > 0.0) {
    vec2 w = (texture2D(uNoiseB, p * 0.3 + vec2(0.0, t * 0.01)).rg - 0.5) * 0.5;
    float n2 = texture2D(uNoiseB, p * 0.38 + w + vec2(t * 0.006, -t * 0.008)).b;
    float vein = pow(1.0 - abs(n2 - 0.5) * 2.0, 28.0);
    float pulse = 0.55 + 0.45 * sin(t * 0.9 + h0 * 8.0);
    col += mix(vec3(0.5, 0.03, 0.01), vec3(1.8, 0.45, 0.08), vein * pulse) * vein * pulse * (1.0 - mk.r) * (1.0 - mk.g * 0.6) * uEmber;
  }

  // light sweep: a soft diagonal band that crosses the pouch
  float d = dot(p, normalize(vec2(0.62, 1.0))) - uSweep;
  float band = exp(-d * d * 22.0);
  col += band * mix(vec3(0.08), F0 * 1.2 + 0.15, mk.r) * (0.5 + 0.5 * pow(1.0 - NoV, 0.5));

  // light gathering at the tear line
  float gl = exp(-abs(p.y - uTearY) * 14.0) * uGather;
  col += uTrim * gl * (1.2 + 1.2 * uGather) + uTrim * uGather * uGather * 0.12;

  // rim, and a lift on hover
  col += pow(1.0 - NoV, 3.0) * uTrim * 0.12;
  col *= 1.0 + uLift * 0.12;

  gl_FragColor = vec4(shoulder(col) * uFade, 1.0);
  #include <colorspace_fragment>
}
`,A=()=>({value:null});function ye(e){let t={...te(e),uColF:A(),uMaskF:A(),uColB:A(),uMaskB:A(),uTexel:{value:new c(1/720,1/1040)},uSize:{value:new c(w,C)},uSealH:{value:y},uTearY:{value:S},uTorn:{value:0},uHolo:{value:0},uEmber:{value:0},uSweep:{value:9},uGather:{value:0},uTrim:{value:new d(1,1,1)},uLift:{value:0}},n=e=>new u({vertexShader:_e,fragmentShader:ve,side:2,uniforms:{...t,uPart:{value:e},uFade:{value:1}}});return{uniforms:t,body:n(0),cap:n(1)}}var j=720,M=Math.round(j*C/w),N=Math.round(y/C*M),P=j/2,F={x:12/13,y:-8.4/13},I=Math.atan2(F.y,F.x);function L(){let e=document.createElement(`canvas`);return e.width=j,e.height=M,e}function R([e,t,n]){let r=e=>Math.round(255*Math.min(1,Math.max(0,e<=.0031308?e*12.92:1.055*e**(1/2.4)-.055)));return`rgb(${r(e)} ${r(t)} ${r(n)})`}function z(e,t,n,r){e.beginPath(),e.arc(t,n,r,0,Math.PI*2)}function B(e,t,n,r,i){let a=L(),o=a.getContext(`2d`);o.fillStyle=i,z(o,t,n,r),o.fill(),o.globalCompositeOperation=`destination-out`,o.lineWidth=3.5/13*r,o.lineCap=`round`,o.beginPath(),o.moveTo(t-F.x*r*1.25,n-F.y*r*1.25),o.lineTo(t+F.x*r*1.25,n+F.y*r*1.25),o.stroke(),e.drawImage(a,0,0)}var V=Math.round(M*.33),H=Math.round(j*.2);function U(e){e.save(),e.translate(P,V),e.rotate(I),e.beginPath(),e.rect(-1080,-23.04,j*3,H*.32),e.restore()}function W(e,t,n){e.beginPath(),e.roundRect(t,N+t*.6,j-t*2,M-N*2-t*1.2,n)}function be(e){let t=M-N-Math.round(M*.2),n=M-N-26,r=P,i=t-120;e.save(),e.beginPath(),e.rect(30,t,660,n-t),e.clip();for(let t=-14;t<=14;t++)e.beginPath(),e.moveTo(r+t*6,i),e.lineTo(r+t*120,n+200),e.stroke();for(let r=0;r<9;r++){let i=1/(1+r*.55),a=t+(n-t)*(1-i)*1.25;if(a>n)break;e.beginPath(),e.moveTo(0,a),e.lineTo(j,a),e.stroke()}e.restore(),e.beginPath(),e.moveTo(40,t),e.lineTo(680,t),e.stroke()}function xe(e,t,n){let r=t.look,i=`#fff`,a=n===`color`,o=R(r.foil),s=e=>n===e||a;if(a){let t=e.createRadialGradient(P,V,30,P,M*.45,M*.8);t.addColorStop(0,r.inkHi),t.addColorStop(1,r.ink),e.fillStyle=t,e.fillRect(0,0,j,M),e.fillStyle=o,e.fillRect(0,0,j,N),e.fillRect(0,M-N,j,N)}else n===`foil`&&(e.fillStyle=i,e.fillRect(0,0,j,N),e.fillRect(0,M-N,j,N));if(s(`gloss`)){e.save(),W(e,26,18),e.clip(),e.strokeStyle=a?r.inkHi:i;for(let t=204,n=0;t<M;t+=20,n++)e.globalAlpha=(a?.7:.9)*Math.max(0,1-(t-H)/(M*.7)),e.lineWidth=n%4==0?3:1.2,e.beginPath(),e.arc(P,V,t,0,Math.PI*2),e.stroke();e.restore()}if((a||n===`foil`||n===`holo`)&&(e.save(),W(e,26,18),e.clip(),U(e),e.fillStyle=a?o:i,e.fill(),e.restore()),(a||n===`foil`||n===`emboss`||n===`holo`)&&(e.strokeStyle=a?o:i,e.lineWidth=6,W(e,22,20),e.stroke(),e.lineWidth=2,W(e,36,12),e.stroke()),a){e.fillStyle=r.ink,z(e,P,V,162),e.fill(),e.strokeStyle=o,e.lineWidth=4,z(e,P,V,174),e.stroke();let t=e.createRadialGradient(P-H*.3,V-H*.4,10,P,V,H);t.addColorStop(0,`oklch(84% 0.13 158)`),t.addColorStop(1,`oklch(64% 0.13 158)`),B(e,P,V,H,t)}else n===`foil`?(e.fillStyle=`#000`,z(e,P,V,162),e.fill(),e.strokeStyle=i,e.lineWidth=4,z(e,P,V,174),e.stroke()):n===`holo`?(e.fillStyle=`#000`,z(e,P,V,162),e.fill()):(n===`gloss`||n===`emboss`)&&(B(e,P,V,H,i),n===`emboss`&&(e.strokeStyle=i,e.lineWidth=4,z(e,P,V,174),e.stroke()));let c=Math.round(M*.6);if((a||n===`foil`||n===`emboss`)&&(e.fillStyle=a?r.label:i,k(e,`GENJI BALL`,P,c,{size:98,weight:800,tracking:6})),(a||n===`foil`||n===`emboss`)&&(e.fillStyle=a?r.trim:i,k(e,t.label.toUpperCase(),P,c+74,{size:52,weight:760,tracking:16})),a||n===`gloss`){e.fillStyle=a?r.label:i,e.globalAlpha=a?.55:1;let n=t.slots.length;k(e,`TRADING CARDS  ·  ${n} CARD${n===1?``:`S`}`,P,c+122,{size:24,weight:700,tracking:7}),e.globalAlpha=1}(a||n===`gloss`)&&(e.strokeStyle=a?r.trim:i,e.globalAlpha=a?.35:1,e.lineWidth=2,be(e),e.globalAlpha=1)}function Se(e,t,n){let r=t.look,i=n===`color`,a=`#fff`,o=R(r.foil);i?(e.fillStyle=r.ink,e.fillRect(0,0,j,M),e.fillStyle=o,e.fillRect(0,0,j,N),e.fillRect(0,M-N,j,N),e.fillRect(334,0,52,M)):n===`foil`&&(e.fillStyle=a,e.fillRect(0,0,j,N),e.fillRect(0,M-N,j,N),e.fillRect(334,0,52,M));let s=M-N-90;if(i||n===`gloss`){e.strokeStyle=i?r.inkHi:a,e.lineWidth=3,e.lineCap=`round`;let t=Math.cos(I)*12,n=Math.sin(I)*12;for(let r=N+30,i=0;r<M-N-10;r+=40,i++)for(let a=30+i%2*30;a<j;a+=60)Math.abs(a-P)<50||Math.abs(a-167)<110&&Math.abs(r-(s-5))<65||(e.beginPath(),e.moveTo(a-t,r-n),e.lineTo(a+t,r+n),e.stroke())}if(i||n===`emboss`||n===`gloss`){let t=i?`oklch(76% 0.13 158)`:a;B(e,167,s-10,26,t),e.fillStyle=i?r.label:a,k(e,`GENJI BALL`,167,s+40,{size:26,weight:800,tracking:5})}}function G(e,t,n){let r=L().getContext(`2d`,{willReadFrequently:!0});r.fillStyle=`#000`,r.fillRect(0,0,j,M),e(r,t,n);let i=r.getImageData(0,0,j,M).data,a=new Float32Array(j*M);for(let e=0;e<a.length;e++)a[e]=i[e*4]/255;return a}function*K(e,t){let n=L();e(n.getContext(`2d`),t,`color`),yield;let r=G(e,t,`foil`);yield;let i=G(e,t,`gloss`);yield;let a=G(e,t,`emboss`);yield;let o=_(a,j,M,2,2);yield;let c=G(e,t,`holo`);yield;let u=new Uint8Array(j*M*4);for(let e=0;e<M;e++)for(let t=0;t<j;t++){let n=e*j+t,a=((M-1-e)*j+t)*4;u[a]=Math.round(r[n]*255),u[a+1]=Math.round(i[n]*255),u[a+2]=Math.round(o[n]*255),u[a+3]=Math.round(c[n]*255)}let d=new m(n);d.colorSpace=p,d.anisotropy=8;let f=new h(u,j,M,l);return f.generateMipmaps=!0,f.minFilter=g,f.magFilter=s,f.needsUpdate=!0,{col:d,mask:f}}function*q(e){let t=yield*K(xe,e);return yield,{front:t,back:yield*K(Se,e),texel:[1/j,1/M]}}var J=new Map;function Ce(e){let t=J.get(e.id);if(!t){let n=q(e),r=n.next();for(;!r.done;)r=n.next();t=r.value,J.set(e.id,t)}return t}async function we(e,t){let n=()=>new Promise(e=>document.hidden?setTimeout(e,0):requestAnimationFrame(e));for(let r of t){if(!J.has(r.id)){let e=q(r),t=e.next();for(;!t.done&&!J.has(r.id);)await n(),t=e.next();t.done&&!J.has(r.id)&&J.set(r.id,t.value)}let t=J.get(r.id);for(let r of[t.front.col,t.front.mask,t.back.col,t.back.mask])await n(),e.initTexture(r)}}var Te=class t{mat;body;cap;capPivot;inner;group;trim;type;fx;constructor(e){let n=T();this.mat=ye(e),this.body=new a(n.body,this.mat.body),this.cap=new a(n.cap,this.mat.cap),this.capPivot=new o,this.capPivot.position.y=(S+C/2)/2,this.cap.position.y=-this.capPivot.position.y,this.capPivot.add(this.cap),this.inner=new o,this.inner.add(this.body,this.capPivot),this.group=new o,this.group.add(this.inner),this.trim=new d(1,1,1),this.type=null,this.fx=t.rest()}static rest(){return{scale:1,shakeX:0,shakeY:0,shakeR:0,gather:0,torn:0,capX:0,capY:0,capRx:0,capRz:0,capFade:1,dropY:0,dropR:0,fade:1,lift:0}}get uniforms(){return this.mat.uniforms}setType(t){this.type=t;let n=Ce(t),r=this.mat.uniforms;r.uColF.value=n.front.col,r.uMaskF.value=n.front.mask,r.uColB.value=n.back.col,r.uMaskB.value=n.back.mask,r.uTexel.value.set(...n.texel),r.uHolo.value=t.look.holo,r.uEmber.value=t.look.ember,this.trim.setRGB(...e(t.look.trim)),r.uTrim.value.copy(this.trim)}resetFx(){Object.assign(this.fx,t.rest())}apply(e,{sweep:t=9,hover:n=0}={}){let r=this.fx,i=this.mat.uniforms;this.inner.rotation.set(e.pitch,e.yaw,e.roll+r.shakeR,`XYZ`),this.inner.position.set(r.shakeX,e.lift+r.shakeY+r.lift,0),this.inner.scale.setScalar(r.scale),this.group.position.y=r.dropY,this.group.rotation.x=r.dropR,this.capPivot.position.x=r.capX,this.capPivot.position.y=(S+C/2)/2+r.capY,this.capPivot.rotation.set(r.capRx,0,r.capRz),i.uGather.value=r.gather,i.uTorn.value=r.torn,i.uSweep.value=t,i.uLift.value=n,this.mat.body.uniforms.uFade.value=r.fade,this.mat.cap.uniforms.uFade.value=r.fade*r.capFade,this.body.visible=r.fade>.002,this.cap.visible=r.fade*r.capFade>.002}},Ee=.75;function De(e){let t=new b,{pack:n,slots:r,particles:i,audio:a,room:o}=e,s=n.fx,c=n.trim.toArray(),l=n.type.look.foil;if(t.set(0,()=>{e.packGone=!1,e.camMix=0;for(let e of r)e.arc=0,e.shown=!1,e.away=0}),e.reduced)return t.tween(0,.3,e=>{s.fade=1-e}),t.tween(.3,0,()=>{e.packGone=!0}),t.tween(0,.45,t=>{e.camMix=t},E.inOut2),t.cue(.15,()=>a.play(`burst`)),r.forEach((e,n)=>{t.tween(.2+n*.05,0,()=>{e.shown=!0,e.arc=1})}),t.tween(.5,0,()=>{}),t;t.cue(0,()=>a.play(`tension`)),t.tween(0,.55,e=>{let t=.55*e,n=.022*e*e;s.scale=1+.06*E.out2(e),s.shakeX=v(t,57)*n,s.shakeY=v(t+2,49)*n*.6,s.shakeR=v(t+5,41)*n*1.6,s.gather=E.in2(e)}),t.cue(.55,e=>{a.play(`tear`);let t=S*1.06;i.burst({kind:D.shard,count:70,at:e,origin:{x:0,y:t,z:.08},spread:[w*.5,.03,.06],dir:[0,1,.3],cone:.75,speed:[1,3.2],life:[.8,1.5],size:[.06,.12],colors:[l,c,[1,1,1]],seed:3}),i.burst({kind:D.spark,count:30,at:e,origin:{x:0,y:t,z:.1},spread:[w*.5,.02,.02],dir:[0,1,.2],cone:.6,speed:[2,4],life:[.35,.7],size:[.03,.05],colors:[c,[1,1,1]],seed:5})}),t.tween(.55,.5,e=>{s.torn=1,s.scale=1.06+.03*E.out3(e),s.shakeX=s.shakeY=s.shakeR=0,s.gather=1-E.out2(e),s.lift=.06*E.out3(e)}),t.tween(.55,.65,e=>{s.capX=.5*e,s.capY=1.6*E.out2(e)-.4*e*e,s.capRz=-.9*e,s.capRx=-1.5*e,s.capFade=1-E.in2(Math.max(0,(e-.45)/.55))}),t.cue(.62,e=>{a.play(`burst`),i.burst({kind:D.glow,count:44,at:e,origin:{x:0,y:S,z:.05},spread:[w*.35,.02,.05],dir:[0,1,.2],cone:.6,speed:[1.2,3],life:[.6,1.2],size:[.06,.13],colors:[c,[1,1,1]],seed:7})});let u={x:0,y:S*.98,z:.1},d=x(t,o,()=>u,c,2.1);return d.screen(.4,.6,.6,.66,{rays:.3,bloom:.25,vignette:.25,weight:.4},E.in2),d.wave(.6,.85,{amp:1.15,reach:2.5}),d.wave(.7,.9,{amp:.5,reach:2.2}),d.screen(.58,.64,.74,1.3,{flood:.45,rays:.8,bloom:.7,exposure:.3,chroma:.3,distort:.7,vignette:.2}),Y(t,.6,.62,.62,.9,e=>{o.shake+=.016*e}),t.cue(.62,e=>{let t=[l,c,[1,1,1]];i.burst({kind:D.shard,count:90,at:e,origin:u,spread:[w*.4,.05,.05],dir:[0,1,0],cone:1,flat:.35,drag:.16,gravity:.35,speed:[4,12],life:[1,1.6],size:[.08,.15],colors:t,seed:13}),i.burst({kind:D.spark,count:50,at:e,origin:u,spread:[w*.4,.05,.05],dir:[0,1,0],cone:1,flat:.35,drag:.2,gravity:.3,speed:[6,14],life:[.5,.9],size:[.04,.07],colors:[c,[1,1,1]],seed:17})}),Y(t,.55,.62,.62,.95,e=>{o.flash=Math.max(o.flash,.32*e),o.flashCol=c,o.glow+=.8*e,o.glowCol=c}),r.forEach((n,r)=>{let o=n.i,s=.7+r*.1;t.tween(s,0,()=>{n.shown=!0}),t.tween(s,Ee,e=>{n.arc=e}),t.cue(s,()=>a.play(`card-whoosh`,{rate:.9+r*.055,gain:.85+.03*r})),t.cue(s+Ee,t=>{a.play(`card-land`,{rate:.96+r*.02});let n=e.slotTarget(o);i.burst({kind:D.glow,count:10,at:t,origin:{x:n.x,y:n.y-.95,z:.05},spread:[.6,.03,.05],dir:[0,1,.3],cone:.9,speed:[.2,.6],life:[.4,.7],size:[.04,.08],colors:[[.75,.8,.85]],seed:11+r})})}),t.tween(.7,.9,t=>{e.camMix=t},E.inOut2),t.tween(1.1,.5,e=>{s.dropY=-3.4*E.in2(e),s.dropR=.5*e,s.fade=1-E.in2(Math.max(0,(e-.5)/.5))}),t.tween(1.6,0,()=>{e.packGone=!0}),t.tween(1.95,0,()=>{}),t}function Oe(e){let t=new b,{pack:n,slots:r,audio:i}=e,a=n.fx;return t.cue(0,()=>i.play(`collect`)),e.reduced?(t.tween(0,0,()=>{for(let e of r)e.shown=!1;e.packGone=!1,e.camMix=0}),t.tween(0,.3,e=>{a.fade=e}),t):(r.forEach((e,n)=>{t.tween(n*.04,.45,t=>{e.away=t},E.in2)}),t.tween(.5,0,()=>{for(let e of r)e.shown=!1}),t.tween(.15,.7,t=>{e.camMix=1-t},E.inOut2),t.tween(.35,0,()=>{e.packGone=!1}),t.tween(.35,.6,e=>{a.dropY=3.4*(1-E.outBack(e,1.2)),a.fade=Math.min(1,e*3)}),t.tween(.95,0,()=>{}),t)}function Y(e,t,n,r,i,a){e.tween(t,i-t,e=>{let o=t+e*(i-t);a(o<n?E.out2((o-t)/Math.max(1e-4,n-t)):o<=r?1:1-E.inOut2((o-r)/Math.max(1e-4,i-r)))})}var X=.16,Z=.34;function ke(){let e=f+.22;return{kind:`row`,slots:[0,1,3,4,2].map(t=>{let n=t-2;return{x:n*e,y:.16-.06*n*n,rz:-n*.035}}),fitW:5*f+.88+Z,fitH:2.4+Z,obj:2.5}}function Q(){let e=(f+X)/2,t=2+X;return{kind:`212`,slots:[{x:-e,y:t,rz:.012},{x:e,y:t,rz:-.012},{x:-e,y:-t,rz:-.012},{x:e,y:-t,rz:.012},{x:0,y:0,rz:0}],fitW:2*f+X+Z,fitH:6+2*X+Z,obj:4.6}}function $(){let e=f+X,t=(2+X)/2;return{kind:`32`,slots:[{x:-e,y:t,rz:.02},{x:e,y:t,rz:-.02},{x:-e/2,y:-t,rz:.01},{x:e/2,y:-t,rz:-.01},{x:0,y:t+.05,rz:0}],fitW:3*f+2*X+Z,fitH:4+X+.05+Z,obj:3.2}}function Ae(){return{kind:`1`,slots:[{x:0,y:0,rz:0}],fitW:f*1.5+Z,fitH:2.9+Z,obj:2.2}}function je(e,t,n){let r=null;for(let i of n===1?[Ae]:[ke,$,Q]){let n=i(),a=Math.max(n.fitW/e,n.fitH/t);(!r||a<r.wpp)&&(r={...n,wpp:a})}return r}function Me(e,t){e.innerHTML=`
    <header class="top">
      <div class="name" style="visibility: hidden">
        <span class="rarity-tag">&nbsp;</span>
        <h1 class="card-name">&nbsp;</h1>
        <p class="card-title">&nbsp;</p>
      </div>
    </header>
    <p class="sr-only" aria-live="polite"></p>
    <nav class="dock pack-dock" aria-label="Pack" data-mode="idle">
      <div class="reveal-actions">
        <button class="btn" data-act="flipAll" hidden>${n.flipAll}<span>Flip all</span></button>
        <button class="btn primary" data-act="done" hidden>${n.done}<span>Done</span></button>
      </div>
    </nav>`;let a=t=>e.querySelector(t);a(`.reveal-actions`).addEventListener(`click`,e=>{let n=e.target.closest(`button[data-act]`);n&&t[n.dataset.act]?.()});let o=a(`.sr-only`),s=a(`.pack-dock`),c=a(`.name`),l=``;return{header:a(`.top`),dock:s,setMode(e){s.dataset.mode=e,s.toggleAttribute(`inert`,e!==`reveal`)},setActions({flipAll:e,done:t,one:r=!1}){let i=`${e}${t}${r}`;if(i===l)return;l=i;let o=a(`[data-act="flipAll"]`);o.hidden=!e,o.innerHTML=r?`${n.flip}<span>Flip</span>`:`${n.flipAll}<span>Flip all</span>`,a(`[data-act="done"]`).hidden=!t},setCard(t){if(c.style.visibility=t?``:`hidden`,!t)return;let n=i[t.rarity];e.style.setProperty(`--accent`,`var(--r-${n.id})`),a(`.rarity-tag`).textContent=t.print==null?n.label:`${n.label} · ${r(t)}`,a(`.card-name`).textContent=t.name,a(`.card-title`).textContent=t.title},say(e){o.textContent=e}}}var Ne=Math.PI/180,Pe=Math.PI*2;function Fe({stage:e,root:n,audio:r,reduced:i,still:a},s){let c=new o;c.visible=!1,e.scene.add(c);let l=ne(),u=Math.min(innerWidth,innerHeight)<600||(navigator.hardwareConcurrency??8)<=4,p=new ae(u?1100:1800,u?.6:1),m=oe(),h=new Te(l),g=Me(n,{flipAll:()=>be(),done:()=>xe()}),ee=new ce({audio:r,reduced:i,onLand:e=>s.showGems?.(e)}),te=new ge(n,5),_=new se({stage:e,flights:ee,tiles:te,noise:l,particles:p,audio:r,reduced:i,still:a,room:m,onReveal:e=>{g.setCard(e.data),g.say(`${e.rarity.label}: ${e.data.name}`),F.setRGB(...e.rarity.linear),U()}});c.add(h.group,_.group,p.points);let v={pack:h,get slots(){return _.slots},particles:p,audio:r,room:m,reduced:i,camMix:0,packGone:!1,slotTarget:e=>_.target(e)},y=!1,b=`idle`,x=null,S=0,T=0,E=de[t.pack??``]??de[s.initialType]??he[0],D=[],k=!1,_e=!1,ve=!0,A=null,ye=null,j=null,M=0,N=0,P=!1,F=new d,I=ue(t.seed??(a?7:Date.now()&16777215^23505)),L=new re({reduced:i,still:a,yaw:t.ry*Ne,pitch:t.rx*Ne}),R=new re({reduced:i,still:a});function z(e){let n;return n=ve&&t.pull?fe(t.pull,E,I,e=>s.owns?.(e)??!1):ve&&!_e?pe(E,I):me(E,I),ve=!1,D=n,ye=_.deal(n,e),ye}function B(e){return E=de[e],h.setType(E),F.copy(h.trim),Z&&Z.slots.length!==E.slots.length&&Fe(),z()}function V(e){b===`idle`&&de[e]&&(A?A.id=e:e!==E.id&&(_e=!0,r.play(`pack-shimmer`),i||a?B(e):(L.spin(1),A={at:S+.2,id:e})))}function H(e){b=e,g.setMode(e===`idle`?`idle`:e===`reveal`?`reveal`:`opening`),U(),s.onMode(e)}function U(){let e=b===`reveal`,t=_.faceDown.length,n=_.slots.length===1;g.setActions({flipAll:e&&t>=(n?1:2)&&!_.focus,done:e&&_.allUp&&!_.busy,one:n})}function W(){if(!y||b!==`idle`||A||k||!s.canOpen(E.id))return;let e=s.onOpen(E.id,D),t=e?e.cards.map(e=>e.gems):[];H(`opening`),r.play(`pack-tap`),L.restYaw=Math.round(L.restYaw/Pe)*Pe,g.setCard(null),g.say(`${E.label} pack opened`),ye.then(()=>{_.setGems(t),x=De(v),x.onEnd=()=>{x=null,H(`reveal`)},x.play(S)})}function be(){b===`reveal`&&(K(),_.flipAll(S),U())}function xe(){if(b!==`reveal`||!_.allUp)return;K(),q(null),_.hovered=null,H(`collect`),g.setCard(null);let e;z(new Promise(t=>e=t)),x=Oe(v),x.onEnd=()=>{x=null,p.clear(),ee.clear(),F.copy(h.trim),H(`idle`),e(),s.onCollected()},x.play(S)}function Se(e){e&&(!e.faceUp&&!e.flip?(_.flipSlot(e,S),q(null),U()):e.faceUp&&!e.flip&&e.gems===0&&G(e))}function G(e){_.focus=e,_.hovered=null,R.restYaw=0,R.yaw=0,R.pitch=0,R.yawV=R.pitchV=0,g.setCard(e.data),r.play(`card-whoosh`,{rate:.8,gain:.6}),U()}function K(){_.focus&&(_.focus=null,r.play(`card-whoosh`,{rate:.7,gain:.5}),U())}function q(e){e!==j&&(j&&r.loop(j,!1),j=e,e&&r.loop(e,!0))}let J=e.canvas,Ce=()=>{let t=1/e.worldPerPx;return{cx:e.center.x,cy:e.center.y,hw:w/2*t,hh:C/2*t}};ie(J,L,e,{onTap:W,rect:Ce,enabled:()=>y&&b===`idle`&&!A});let Ee=()=>_.focus?_.screenRect(_.focus):{cx:-1e4,cy:-1e4,hw:0,hh:0};ie(J,R,e,{onTap:()=>R.flip(),rect:Ee,enabled:()=>y&&!!_.focus});let Y=null;J.addEventListener(`pointermove`,e=>{if(y){if(b===`idle`){let t=Ce();P=!k&&e.pointerType===`mouse`&&Math.abs(e.clientX-t.cx)<t.hw&&Math.abs(e.clientY-t.cy)<t.hh,J.style.cursor=P?`pointer`:``}else if(b===`reveal`&&!_.focus){if(_.pointer={x:e.clientX,y:e.clientY},e.pointerType!==`mouse`)return;_.hovered=_.hit(e.clientX,e.clientY),J.style.cursor=_.hovered?`pointer`:``}}}),J.addEventListener(`pointerleave`,()=>{P=!1,b===`reveal`&&!Y&&(_.hovered=null)}),J.addEventListener(`pointerdown`,e=>{if(!y||b!==`reveal`)return;if(_.focus){let t=Ee();Y=Math.abs(e.clientX-t.cx)>t.hw*1.35||Math.abs(e.clientY-t.cy)>t.hh*1.35?{away:!0,x:e.clientX,y:e.clientY}:null;return}let t=_.hit(e.clientX,e.clientY);_.pointer={x:e.clientX,y:e.clientY},Y=t?{slot:t,x:e.clientX,y:e.clientY}:null,t&&e.pointerType!==`mouse`&&(_.hovered=t)});let X=e=>{if(!Y)return;let t=Y;Y=null,e.pointerType!==`mouse`&&(_.hovered=null),e.type===`pointercancel`||Math.hypot(e.clientX-t.x,e.clientY-t.y)>24||(t.away?K():_.hit(e.clientX,e.clientY)===t.slot&&Se(t.slot))};J.addEventListener(`pointerup`,X),J.addEventListener(`pointercancel`,X);let Z=null,ke={w:w*1.3,h:C*1.18,obj:C},Q={x:0,y:0,w:1,h:1},$=Q,Ae=e=>e<=0?Q:e>=1?$:{x:O(Q.x,$.x,e),y:O(Q.y,$.y,e),w:O(Q.w,$.w,e),h:O(Q.h,$.h,e)};function Fe(){if(!y)return;let n=innerWidth,r=innerHeight,i=n>=720?24:10,a=i,o=r-i;t.hideUi||(a=g.header.getBoundingClientRect().bottom+i*.6,o=g.dock.getBoundingClientRect().top-i),$={x:i,y:a,w:n-2*i,h:Math.max(120,o-a)},Q=!t.hideUi&&s.idleBox()||$,e.setBox(Ae(v.camMix)),Z=je($.w,$.h,E.slots.length),_.setLayout(Z),Ie()}function Ie(){if(!Z)return;let t=v.camMix;e.setFit(O(ke.w,Z.fitW,t),O(ke.h,Z.fitH,t),O(ke.obj,Z.obj,t))}let Le=e.backdrop.uniforms,Re=le(e),ze=()=>Re.apply(m,[h.uniforms,..._.lightSets],S,T,N);function Be(t,n,r){if(T=n,S=r,Object.assign(m,oe()),h.resetFx(),_.beginFrame(),A&&r>=A.at){let e=A.id;A=null,B(e)}x&&x.update(r),_.runFlips(r),b===`reveal`&&!_.busy&&U();let o=9;if(b===`idle`&&!i){let e=T%5.5;e<1.5&&(o=-2.3+4.6*e/1.5),k||(h.fx.gather=.1+.08*Math.sin(T*2.1))}M+=((P&&b===`idle`?1:0)-M)*(a?1:1-Math.exp(-10*t)),N+=((k&&b===`idle`?1:0)-N)*(a?1:1-Math.exp(-6*t));let s=L.update(t,T);h.group.visible=!v.packGone,h.apply(s,{sweep:o,hover:M});let c=_.focus?R.update(t,T):null;Z&&(_.focusZ=e.depthFor(f*1.2,2.7)),_.compose(t,T,c);let l=_.hovered;q(l&&!l.faceUp&&!l.flip?`card-hover`:null),Z&&e.moveBox(Ae(v.camMix)),Ie(),ze(),Le.uAccent.value.lerp(F,a?1:1-Math.exp(-3*t)),h.uniforms.uTime.value=T,_.setTime(T),p.uniforms.uPixel.value=e.dpr*innerHeight/(2*e.tanHalf),p.uniforms.uMaxPx.value=56*e.dpr,p.update(r),ee.update(r)}h.setType(E),F.copy(h.trim),H(`idle`);let Ve=z().then(()=>{a||_.warmUp(e.camera,e.post?.scene??null).catch(()=>{}).then(()=>we(e.renderer,he)).catch(()=>{})}),He=a||t.opened||t.seq!=null||t.revealed.length>0||t.flip!=null||t.focus!=null||t.hover!=null?Ve:Promise.resolve();function Ue(e){if(!(t.opened||t.seq!=null||t.revealed.length||t.flip!=null||t.focus!=null||t.hover!=null))return;S=e,b=`opening`,x=De(v),x.onEnd=()=>{x=null,H(`reveal`)};let n=t.seq==null;if(x.seek(e,n?x.duration+10:t.seq),!n){H(`opening`);return}x.update(e),_.setGems(s.repeatGems?.(D)??[]);let r=e=>e==null?void 0:_.slots[e];for(let e of t.revealed){let t=r(e);t&&(_.setFaceUp(t),_.onReveal(t))}let i=r(t.flip);i&&_.seekFlip(i,e,t.ft);let a=r(t.hover);a&&(_.hovered=a);let o=r(t.focus);o&&(o.faceUp||(_.setFaceUp(o),_.onReveal(o)),o.gems===0&&G(o)),U()}return{ready:He,layout:Fe,applyStartState:Ue,show(){y=!0,n.hidden=!1,c.visible=!0,e.usePost(!0),Fe()},hide(){y=!1,n.hidden=!0,c.visible=!1,ee.clear(),q(null),Re.reset([h.uniforms,..._.lightSets]),e.usePost(!1)},update:Be,setType:V,open:W,get typeId(){return A?.id??E.id},get mode(){return b},setLocked(e){k=e,e&&(P=!1)},keydown(e){if(b===`idle`){if(e===` `||e===`enter`)W();else return!1;return!0}if(b===`reveal`){if(e>=`1`&&e<=`5`)Se(_.slots[Number(e)-1]);else if(e===`f`)be();else if(e===`escape`)K();else if(e===`enter`&&_.allUp&&!_.busy)xe();else return!1;return!0}return!1}}}export{Fe as createPackScreen};