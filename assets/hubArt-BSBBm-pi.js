import{s as e}from"./icons-B4UciC06.js";import{R as t,ft as n,tn as r,u as i,x as a,z as o}from"./geometry-CzHUig4W.js";import{a as s,o as c}from"./card-xWt4fB0H.js";var l=`
varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying vec3 vTangentW;
varying vec3 vBitangentW;
varying vec3 vCardZ;
varying vec2 vLocal;
varying vec3 vPos;
varying vec3 vNormalL;
#ifdef BEND
uniform float uBend;
uniform float uLen;
#endif

void main() {
  vUv = uv;
  vec3 pos = position;
#ifdef BEND
  // the blade hangs down from its pin (the origin): its far end bends furthest
  float t = clamp(-pos.y / uLen, 0.0, 1.0);
  pos.x += uBend * t * t;
#endif
  vLocal = pos.xy;
  vPos = pos;
  vNormalL = normal;
  vec4 wp = modelMatrix * vec4(pos, 1.0);
  vWorldPos = wp.xyz;
  mat3 m = mat3(modelMatrix);
  vNormalW = normalize(m * normal);
  vTangentW = normalize(m * vec3(1.0, 0.0, 0.0));
  vBitangentW = normalize(m * vec3(0.0, 1.0, 0.0));
  vCardZ = normalize(m * vec3(0.0, 0.0, 1.0));
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`,u=s+`
#define TAU 6.2831853
uniform float uN;
uniform float uWin;
uniform float uWinK;
uniform float uParty;
uniform float uSpinK;
uniform float uDim;
uniform vec3 uWinCol;
varying vec3 vPos;
varying vec3 vNormalL;

// clockwise from the top, 0..TAU
float angleOf(vec2 p) {
  float a = atan(p.x, p.y);
  return a < 0.0 ? a + TAU : a;
}
`,d=u+`
uniform sampler2D uCol;
uniform sampler2D uMask;
uniform float uTexel;
uniform float uBlur;      // radians of arc the face smears over this frame
uniform float uSweep;     // 0..1 a light running out over the winner after the stop

vec2 turn(vec2 p, float a) {
  float c = cos(a), s = sin(a);
  return vec2(c * p.x + s * p.y, -s * p.x + c * p.y);
}

void main() {
  Surf s = surf();
  vec2 p = vLocal;
  float r = length(p);
  float a = angleOf(p);
  float seg = TAU / uN;
  float fi = a / seg + 0.5;
  float idx = mod(floor(fi), uN);
  float u = fract(fi) * 2.0 - 1.0;      // -1 .. 1 across the segment

  vec2 uv = vUv;
  vec3 base;
  vec4 mk;
  float sharp = 1.0;
  if (uBlur > 0.004) {
    // motion blur along the turn: five looks, a little softer each
    base = vec3(0.0);
    mk = vec4(0.0);
    for (int k = -2; k <= 2; k++) {
      vec2 q = turn(p, uBlur * float(k) * 0.25) * 0.5 + 0.5;
      base += texture2D(uCol, q, 1.5).rgb;
      mk += texture2D(uMask, q, 1.5);
    }
    base *= 0.2;
    mk *= 0.2;
    sharp = 1.0 - smoothstep(0.004, 0.08, uBlur);
  } else {
    base = texture2D(uCol, uv).rgb;
    mk = texture2D(uMask, uv);
  }

  // each segment a shallow dome between its dividers, so it catches the lights at its own angle
  vec2 rad = p / max(r, 1e-4);
  vec2 tng = vec2(rad.y, -rad.x);
  float half_ = seg * 0.5;
  float hr = smoothstep(0.24, 0.42, r) * (1.0 - smoothstep(0.82, 0.93, r));
  float dhr = (smoothstep(0.24, 0.42, r + 0.01) * (1.0 - smoothstep(0.82, 0.93, r + 0.01)) - hr) / 0.01;
  float h = 1.0 - u * u;
  vec2 grad = tng * (-2.0 * u / half_ / max(r, 0.2)) * hr + rad * h * dhr;
  vec2 g = -grad * 0.016;
  // the emboss (sharp only: a smear has no edges left to catch)
  float t = uTexel;
  float ex = texture2D(uMask, uv + vec2(t, 0.0)).b - texture2D(uMask, uv - vec2(t, 0.0)).b;
  float ey = texture2D(uMask, uv + vec2(0.0, t)).b - texture2D(uMask, uv - vec2(0.0, t)).b;
  g -= vec2(ex, ey) * 3.2 * sharp;
  vec3 N = perturb(s, g);
  float NoV = sat1(dot(N, s.V));

  // holographic film: its colours move with the view and as the segment turns
  float phase = dot(s.V, s.T) * 1.6 + dot(s.V, s.B) * 1.1 + r * 2.4 + a * 0.6;
  vec3 rainbow = 0.55 + 0.45 * cos(TAU * (phase + vec3(0.0, 0.33, 0.67)));
  float holo = mk.a;
  vec3 F0 = mix(base, rainbow * mix(vec3(1.0), base * 1.4 + 0.2, 0.4), holo * 0.85);
  F0 = clamp(F0, 0.0, 1.0);
  vec3 foil = keySpec(N, s.V, F0, 0.24) * 1.1 + envSpec(N, s.V, F0, 0.22) * 1.35 + F0 * printLight(N) * 0.16;
  float rough = mix(0.45, 0.14, mk.g);
  vec3 ink = base * printLight(N) * 0.85
           + envSpec(N, s.V, base * 0.5 + 0.03, 0.34) * 0.5
           + keySpec(N, s.V, vec3(0.04), rough) * 0.9 + envSpec(N, s.V, vec3(0.04), rough) * (0.4 + 0.6 * mk.g);
  vec3 col = mix(ink, foil, mk.r);
  col += pow(1.0 - NoV, 3.0) * uRimCol * 0.08;

  // the winner lit in the prize's colour, its frame glowing; the others dimmed
  float isWin = (1.0 - step(0.5, abs(idx - uWin))) * step(0.24, r) * (1.0 - step(0.93, r));
  float pulse = 0.5 + 0.5 * sin(uTime * 6.0);
  col *= mix(1.0 - 0.5 * uWinK, 1.0 + 0.3 * uWinK, isWin);
  float frame = smoothstep(0.84, 0.97, abs(u)) + exp(-pow((r - 0.9) / 0.012, 2.0)) + exp(-pow((r - 0.27) / 0.012, 2.0));
  col += isWin * uWinK * uWinCol * ((0.08 + 0.06 * pulse) * (0.4 + mk.r) + frame * (0.9 + 0.6 * pulse));
  float sw = mix(0.15, 1.15, uSweep);
  col += isWin * uWinCol * 1.4 * exp(-pow((r - sw) / 0.06, 2.0)) * (1.0 - uSweep) * step(0.001, uSweep);

  col *= 1.0 - uDim;
  gl_FragColor = vec4(shoulder(col), 1.0);
  #include <colorspace_fragment>
}
`,f=u+`
uniform vec3 uBase;       // F0 of the metal (linear)
uniform vec3 uTint;       // a little diffuse colour (anodised parts)
uniform float uRough;
uniform vec3 uGlowCol;
uniform float uGlow;
#ifdef LAMPS
uniform float uChase;
uniform float uLampR;     // radius of the ring of lamps
uniform float uLampZ;     // the rim's front face
#endif
#ifdef LOGO
uniform sampler2D uLogo;
uniform float uLogoR;
uniform float uLogoTexel;
uniform vec3 uGreen;
#endif

void main() {
  Surf s = surf();
  vec3 N = s.Ng;
  vec3 F0 = uBase;
  float rough = uRough;
  vec3 tint = uTint;
  vec3 emit = vec3(0.0);

  // spun metal: fine rings round the axis on faces that look along it
  float rr = length(vPos.xy);
  float facing = abs(vNormalL.z);
  float ringAA = 1.0 - smoothstep(0.2, 0.5, fwidth(rr) * 300.0);
  float spun = sin(rr * 1900.0) * 0.5 + 0.5;
  rough = mix(rough, rough * (0.75 + 0.5 * spun), facing * ringAA);

#ifdef LOGO
  vec2 luv = vPos.xy / (2.0 * uLogoR) + 0.5;
  vec4 lm = texture2D(uLogo, luv);
  float lt = uLogoTexel;
  float lx = texture2D(uLogo, luv + vec2(lt, 0.0)).b - texture2D(uLogo, luv - vec2(lt, 0.0)).b;
  float ly = texture2D(uLogo, luv + vec2(0.0, lt)).b - texture2D(uLogo, luv - vec2(0.0, lt)).b;
  N = perturb(s, -vec2(lx, ly) * 2.5 * facing);
  F0 = mix(F0, uGreen * 0.95, lm.r);
  tint = mix(tint, uGreen * 0.12, lm.r);
  rough = mix(rough, 0.2, lm.r);
  emit += uGreen * lm.r * (0.05 + 0.5 * uWinK * (0.5 + 0.5 * sin(uTime * 6.0)));
#endif

#ifdef LAMPS
  // lamps let into the rim's front: a dark socket, a bevelled ring, a domed lens that lights up
  float nL = uN * 3.0;
  float bs = TAU / nL;
  float ang = angleOf(vPos.xy);
  float kb = floor(ang / bs);
  float bc = (kb + 0.5) * bs;
  vec2 lc = uLampR * vec2(sin(bc), cos(bc));
  vec2 dv = vPos.xy - lc;
  float d = length(dv);
  float onFront = step(uLampZ - 0.006, vPos.z) * step(0.8, vNormalL.z);
  float idle = 0.22 + 0.16 * sin(uTime * 1.7 - kb * 0.75);
  float chase = step(fract((kb - uChase) / 3.0), 0.34);
  float blink = step(0.5, fract(uTime * 3.2 + mod(kb, 2.0) * 0.5));
  float bright = mix(idle, 0.12 + 1.25 * chase, uSpinK);
  bright = mix(bright, 0.25 + 1.4 * blink, uParty);
  // the lamps nearest the pointer flare with the win
  bright += uWinK * (1.0 - uParty) * 0.5 * exp(-pow(min(bc, TAU - bc) / 0.5, 2.0));
  vec3 lamp = mix(vec3(1.0, 0.82, 0.55), uWinCol * 1.15 + 0.1, max(0.4 * uWinK, 0.85 * uParty));
  float socket = (1.0 - smoothstep(0.03, 0.034, d)) * onFront;
  float lens = (1.0 - smoothstep(0.021, 0.024, d)) * onFront;
  // the socket's bevel: its normal tilts in towards the lamp
  vec2 dn = dv / max(d, 1e-4);
  float bevel = socket * (1.0 - lens);
  vec3 Nb = normalize(N - (s.T * dn.x + s.B * dn.y) * 0.9 * bevel + (s.T * dn.x + s.B * dn.y) * 0.6 * lens * (d / 0.022));
  N = mix(N, Nb, socket);
  F0 = mix(F0, F0 * 0.35, bevel);
  // the lens: tinted glass over a filament, hot in the middle and deeper in colour to its edge
  float rl = sat1(d / 0.022);
  float core = exp(-rl * rl * 3.5);
  F0 = mix(F0, vec3(0.04), lens);
  tint = mix(tint, lamp * 0.05, lens);
  rough = mix(rough, 0.08, lens);
  vec3 glass = mix(lamp * lamp * 0.8, vec3(1.0, 0.97, 0.9), core * sat1(bright));
  emit += glass * lens * (0.05 + 2.4 * bright) * (0.3 + 0.7 * core);
  // light spilling on the metal round it
  emit += lamp * bright * 0.22 * exp(-d * d / 0.0018) * onFront * (1.0 - socket);
#endif

  vec3 col = keySpec(N, s.V, F0, rough) * 1.1 + envSpec(N, s.V, F0, rough) * 1.3
           + (F0 * 0.06 + tint) * printLight(N);
  col += pow(1.0 - sat1(dot(N, s.V)), 3.0) * uRimCol * 0.1;
  col += emit + uGlowCol * uGlow;
  col *= 1.0 - uDim;
  gl_FragColor = vec4(shoulder(col), 1.0);
  #include <colorspace_fragment>
}
`,p=`
varying vec2 vP;
void main() {
  vP = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,m=`
uniform vec2 uHalf;       // the plinth's half size on the floor (x, depth)
uniform vec3 uGlowCol;
uniform float uGlow;
uniform vec3 uGreen;
uniform float uDim;
varying vec2 vP;
void main() {
  // (the plane is laid flat with rotation.x = -pi/2: vP.y runs away from the camera)
  vec2 q = abs(vP) - uHalf;
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  float shadow = exp(-max(d, 0.0) / 0.06) * 0.85 + (1.0 - smoothstep(-0.02, 0.18, d)) * 0.1;
  float pool = exp(-max(d, 0.0) / 0.35);
  // the neon strip on the plinth's front, mirrored: a streak running towards the camera
  float strip = exp(-pow(vP.x / (uHalf.x * 0.9), 6.0)) * exp(-max(-vP.y - uHalf.y, 0.0) / 0.12) * step(vP.y, -uHalf.y);
  vec3 add = uGreen * strip * 0.16 + uGlowCol * uGlow * pool * 0.35;
  add *= 1.0 - uDim;
  gl_FragColor = vec4(add, shadow * 0.9);
  #include <colorspace_fragment>
}
`,h=1024,g=h/2,_=Math.PI*2,v=1/h,y=.235,b=.925,x=`#fff`,S=`oklch(91% 0.075 195)`,C={rare:{foil:`oklch(66% 0.15 255)`,ink:`oklch(97% 0.015 250)`,edge:`oklch(22% 0.06 258)`,holo:.25},epic:{foil:`oklch(62% 0.2 305)`,ink:`oklch(97% 0.02 305)`,edge:`oklch(20% 0.08 305)`,holo:.75},legendary:{foil:`oklch(84% 0.14 86)`,ink:`oklch(22% 0.05 70)`,edge:`oklch(24% 0.06 70)`,holo:.3},mythic:{foil:`oklch(62% 0.19 32)`,ink:`oklch(97% 0.02 30)`,edge:`oklch(20% 0.08 30)`,holo:.4},common:{foil:`oklch(80% 0.01 210)`,ink:`oklch(20% 0.01 210)`,edge:`oklch(20% 0.01 210)`,holo:0}},w=new Path2D(`M7 4h10l4 5.2L12 20.5 3 9.2z`),T=new Path2D(`M3 9.2h18M9.5 4 8 9.2l4 11.3 4-11.3L14.5 4`),E=new Path2D(`M8 9.2 12 4l4 5.2z`);function D(){let e=document.createElement(`canvas`);return e.width=e.height=h,e}function O(e,t,n){e.font=`${t} ${n}px Saira, system-ui, sans-serif`,`fontStretch`in e&&(e.fontStretch=`condensed`)}function k(e,t,n,r,i,a){O(e,r,i);let o=e.measureText(t).width;o>a&&O(e,r,Math.floor(i*a/o))}function A(e,t,n,r,i){e.beginPath(),e.arc(0,0,i,t-n/2,t+n/2),e.arc(0,0,r,t+n/2,t-n/2,!0),e.closePath()}function j(e,t,n,r,i){e.save(),e.translate(0,t),e.scale(n/24,n/24),e.translate(-12,-12.2),e.fillStyle=r,e.strokeStyle=r,e.lineJoin=`round`,e.fill(w),e.lineWidth=1.2,e.stroke(w);let a=i===`color`?`oklch(30% 0.06 200)`:i===`emboss`?`#555`:i===`foil`?`#888`:null;a&&(e.strokeStyle=a,e.lineWidth=.9,e.stroke(T),i===`color`&&(e.fillStyle=`oklch(97% 0.04 195)`,e.globalAlpha=.55,e.fill(E))),e.restore()}function M(e,t,n,r,i){let a=n*.72;for(let[o,s]of[[-.2,-.22],[.14,.12]])e.save(),e.translate(o*a,t),e.rotate(s),e.beginPath(),e.roundRect(-a/2,-n/2,a,n,n*.1),e.fillStyle=r,e.fill(),e.lineWidth=n*.07,e.strokeStyle=i,e.stroke(),e.beginPath(),e.arc(0,0,a*.22,0,_),e.lineWidth=n*.05,e.stroke(),e.restore()}function N(t,n,r){let i=_/n.length,a=r===`color`,o=e=>`rgb(${Math.round(e*255)} ${Math.round(e*255)} ${Math.round(e*255)})`;t.save(),t.translate(g,g),t.textAlign=`center`,t.textBaseline=`middle`,a&&(t.fillStyle=`oklch(10% 0.01 220)`,t.fillRect(-512,-512,h,h)),n.forEach((n,s)=>{let c=-Math.PI/2+s*i,l=n.type===`card`?C[n.rarity??`rare`]:null,u=n.gems??0,d=u===200,f=u>=500;if(A(t,c,i,y*g,b*g),a){if(l)t.fillStyle=l.foil;else if(f)t.fillStyle=`oklch(62% 0.08 200)`;else{let e=Math.min(1,Math.log(Math.max(10,u)/10)/Math.log(20)),n=t.createRadialGradient(0,0,g*y,0,0,g*b);n.addColorStop(0,`oklch(${(12+3*e).toFixed(1)}% ${(.02+.02*e).toFixed(3)} 215)`),n.addColorStop(1,`oklch(${(19+9*e).toFixed(1)}% ${(.04+.04*e).toFixed(3)} 205)`),t.fillStyle=n}}else t.fillStyle=o(r===`foil`?l?.88:f?.85:0:r===`gloss`?l||f?0:.25:r===`emboss`?.12:l?l.holo:+!!f);if(t.fill(),d&&r!==`gloss`&&r!==`holo`){t.save(),A(t,c,i,y*g,b*g),t.clip(),t.fillStyle=a?`oklch(70% 0.08 200)`:o(r===`foil`?.7:.2);for(let e=-4;e<=4;e++){let n=c+e/9*i,r=i/40;t.beginPath(),t.moveTo(0,0),t.arc(0,0,g,n-r,n+r),t.closePath(),t.fill()}t.restore()}r!==`holo`&&(t.save(),A(t,c,i,y*g,b*g),t.clip(),t.lineWidth=26,t.strokeStyle=a?l?l.edge:`oklch(8% 0.01 220)`:o(0),t.stroke(),t.lineWidth=14,t.strokeStyle=a?l?l.foil:S:o(r===`foil`?1:r===`emboss`?.8:0),A(t,c,i,128.32,b*g-8),t.stroke(),t.restore()),t.save(),t.rotate(s*i);let p=e=>2*e*g*Math.sin(i/2)*.8;if(l){let i=e[n.rarity??`rare`],o=a?l.ink:x;if(r===`color`||r===`gloss`||r===`emboss`?M(t,-.46*g,.17*g,a?`oklch(13% 0.02 220)`:r===`emboss`?`#999`:x,a?l.foil:x):r===`foil`&&M(t,-.46*g,.17*g,`#000`,x),r!==`holo`){let e=i.label.toUpperCase();k(t,e,0,850,.13*g,p(.73)),t.fillStyle=r===`foil`?`#000`:o,t.fillText(e,0,-.73*g)}}else{let e=a?f?`oklch(15% 0.03 215)`:S:x;if(r!==`holo`&&r!==`gloss`&&j(t,-.77*g,.17*g,a?S:x,r),r!==`holo`){let n=String(u);k(t,n,0,850,.26*g,p(.5)),f?(t.lineWidth=10,t.lineJoin=`round`,t.strokeStyle=a?S:r===`foil`||r===`emboss`?x:`#000`,t.strokeText(n,0,-.55*g),t.fillStyle=r===`foil`?`#000`:e,t.fillText(n,0,-.55*g)):r!==`gloss`&&(t.fillStyle=e,t.fillText(n,0,-.55*g))}}t.restore()}),(r===`color`||r===`foil`||r===`emboss`)&&(t.beginPath(),t.arc(0,0,1.925/2*g,0,_),t.lineWidth=g*.07499999999999996,t.strokeStyle=a?`oklch(9% 0.01 220)`:`#000`,t.stroke(),t.beginPath(),t.arc(0,0,g*b-3,0,_),t.lineWidth=6,t.strokeStyle=a?S:x,t.stroke()),t.beginPath(),t.arc(0,0,g*y,0,_),t.fillStyle=a?`oklch(8% 0.01 220)`:`#000`,t.fill(),t.restore()}function P(e,t){let n=D().getContext(`2d`,{willReadFrequently:!0});n.fillStyle=`#000`,n.fillRect(0,0,h,h),N(n,e,t);let r=n.getImageData(0,0,h,h).data,i=new Float32Array(h*h);for(let e=0;e<i.length;e++)i[e]=r[e*4]/255;return i}function F(e,r){let i=new Uint8Array(e*e*4);for(let t=0;t<e;t++)for(let n=0;n<e;n++){let a=t*e+n,o=((e-1-t)*e+n)*4;for(let e=0;e<4;e++)i[o+e]=Math.round((r[e]?.[a]??0)*255)}let s=new a(i,e,e,n);return s.generateMipmaps=!0,s.minFilter=o,s.magFilter=t,s.anisotropy=4,s.needsUpdate=!0,s}function*I(e){let t=D();N(t.getContext(`2d`),e,`color`),yield;let n=P(e,`foil`);yield;let a=P(e,`gloss`);yield;let o=P(e,`emboss`);yield;let s=c(o,h,h,2,2);yield;let l=P(e,`holo`);yield;let u=F(h,[n,a,s,l]),d=new i(t);return d.colorSpace=r,d.anisotropy=8,{col:d,mask:u}}var L=256,R=L/2,z={x:12/13,y:-8.4/13};function B(){let e=document.createElement(`canvas`);e.width=e.height=L;let t=e.getContext(`2d`,{willReadFrequently:!0});t.fillStyle=`#000`,t.fillRect(0,0,L,L);let n=L*.25;t.fillStyle=`#fff`,t.beginPath(),t.arc(R,R,n,0,Math.PI*2),t.fill(),t.globalCompositeOperation=`destination-out`,t.lineWidth=3.5/13*n,t.lineCap=`round`,t.beginPath(),t.moveTo(R-z.x*n*1.25,R-z.y*n*1.25),t.lineTo(R+z.x*n*1.25,R+z.y*n*1.25),t.stroke(),t.globalCompositeOperation=`source-over`,t.strokeStyle=`#fff`,t.lineWidth=L*.025,t.beginPath(),t.arc(R,R,L*.43,0,Math.PI*2),t.stroke();let r=t.getImageData(0,0,L,L).data,i=new Float32Array(L*L);for(let e=0;e<i.length;e++)i[e]=r[e*4]/255;let a=c(i,L,L,2,2);return F(L,[i,new Float32Array,a,new Float32Array])}var V=1/L;export{y as a,m as c,l as d,v as i,p as l,B as n,I as o,b as r,d as s,V as t,f as u};