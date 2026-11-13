import{l as e,s as t,t as n}from"./icons-B4UciC06.js";import{a as r}from"./pulls-bfB2TnIU.js";import{K as i,N as a,O as o,at as s,bn as c,c as l,in as u,it as d,n as f,p,q as m,s as h,t as g,xn as _}from"./geometry-CzHUig4W.js";import{n as v}from"./post-D3XBq8Hq.js";import{t as y}from"./card-DykATURn.js";var b=`
attribute vec3 aVel;
attribute vec4 aLife;     // birth, life, size, kind
attribute vec4 aColor;    // rgb, seed
attribute vec2 aMove;     // drag scale, gravity scale
uniform float uTime;
uniform float uPixel;
uniform float uMaxPx;
varying vec3 vColor;
varying float vAlpha;
varying float vKind;
varying float vAngle;
varying float vStretch;
varying float vGlint;

void main() {
  float age = uTime - aLife.x;
  float life = aLife.y;
  float kind = aLife.w;
  float seed = aColor.a;
  vKind = kind;
  vColor = aColor.rgb;
  if (age < 0.0 || age > life) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    vAlpha = 0.0;
    return;
  }
  float k = age / life;
  vec3 g = vec3(0.0);
  float drag = 1.2;
  if (kind < 0.5) { g = vec3(0.0, -2.6, 0.0); drag = 1.6; }
  else if (kind < 1.5) { g = vec3(0.0, -3.2, 0.0); drag = 2.2; }
  else if (kind < 2.5) { g = vec3(0.0, 0.45, 0.0); drag = 1.4; }
  else { drag = 3.0; }
  drag *= aMove.x;
  g *= aMove.y;
  float dv = (1.0 - exp(-drag * age)) / drag;
  vec3 p = position + aVel * dv + 0.5 * g * age * age;
  if (kind > 1.5 && kind < 2.5) {
    p.x += sin(age * 2.3 + seed * 40.0) * 0.08 * age;
    p.z += cos(age * 1.7 + seed * 23.0) * 0.05 * age;
  }
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  float size = aLife.z;
  float fade = 1.0;
  if (kind < 0.5) {
    fade = 1.0 - smoothstep(0.7, 1.0, k);
    float ang = seed * 6.2831 + age * (6.0 + seed * 10.0) * (seed > 0.5 ? 1.0 : -1.0);
    vAngle = ang;
    vGlint = pow(abs(sin(ang * 1.3 + seed * 3.0)), 10.0);
    vStretch = 0.35 + 0.65 * abs(cos(ang * 0.7));
  } else if (kind < 1.5) {
    fade = 1.0 - k;
    // direction of travel on screen, for the streak
    vec3 vNow = aVel * exp(-drag * age) + g * age;
    vec4 a = projectionMatrix * mv;
    vec4 b = projectionMatrix * (modelViewMatrix * vec4(p + vNow * 0.02, 1.0));
    vec2 d = b.xy / b.w - a.xy / a.w;
    vAngle = atan(d.y, d.x);
    vStretch = clamp(length(vNow) * 0.5, 0.15, 1.0);
    size *= 1.0 + vStretch * 1.5;
  } else if (kind < 2.5) {
    fade = smoothstep(0.0, 0.12, k) * (1.0 - smoothstep(0.55, 1.0, k));
    fade *= 0.65 + 0.35 * sin(age * 13.0 + seed * 50.0);
  } else {
    fade = smoothstep(0.0, 0.1, k) * (1.0 - k) * (1.0 - k);
  }
  // fade out near the lens rather than fill the screen
  fade *= smoothstep(0.8, 2.2, -mv.z);
  vAlpha = fade;
  gl_PointSize = min(uPixel * size / max(-mv.z, 0.1), uMaxPx);
}
`,x=`
varying vec3 vColor;
varying float vAlpha;
varying float vKind;
varying float vAngle;
varying float vStretch;
varying float vGlint;

void main() {
  vec2 q = gl_PointCoord - 0.5;
  q.y = -q.y;
  float a = 0.0;
  vec3 col = vColor;
  if (vKind < 0.5) {
    // a thin tumbling sliver: a rotated, foreshortened diamond
    float c = cos(vAngle), s = sin(vAngle);
    vec2 r = vec2(c * q.x - s * q.y, s * q.x + c * q.y);
    r.x /= vStretch;
    float d = abs(r.x) * 1.7 + abs(r.y) * 2.6;
    a = 1.0 - smoothstep(0.75, 0.95, d);
    col = vColor * (0.25 + 0.5 * vStretch) + vec3(1.0) * vGlint * 1.6;
  } else if (vKind < 1.5) {
    float c = cos(vAngle), s = sin(vAngle);
    vec2 r = vec2(c * q.x + s * q.y, -s * q.x + c * q.y);
    float len = 0.12 + 0.36 * vStretch;
    float d = length(vec2(max(abs(r.x) - len, 0.0), r.y));
    a = exp(-d * d * 900.0) + exp(-d * d * 90.0) * 0.35;
    col = mix(vColor, vec3(1.0, 0.95, 0.85), exp(-d * d * 2500.0));
  } else {
    float d = length(q);
    a = exp(-d * d * 40.0) * 0.9 + exp(-d * d * 400.0) * 0.6;
  }
  a *= vAlpha;
  if (a < 0.003) discard;
  gl_FragColor = vec4(col * a, 1.0);
}
`,S={shard:0,spark:1,ember:2,glow:3},C=class{capacity;scale;next;pos;vel;life;col;move;geometry;material;points;dirty;constructor(e,t=1){this.capacity=e,this.scale=t,this.next=0;let n=new l;this.pos=new Float32Array(e*3),this.vel=new Float32Array(e*3),this.life=new Float32Array(e*4),this.col=new Float32Array(e*4),this.move=new Float32Array(e*2).fill(1);for(let t=0;t<e;t++)this.life[t*4]=-1e6;n.setAttribute(`position`,new h(this.pos,3)),n.setAttribute(`aVel`,new h(this.vel,3)),n.setAttribute(`aLife`,new h(this.life,4)),n.setAttribute(`aColor`,new h(this.col,4)),n.setAttribute(`aMove`,new h(this.move,2)),this.geometry=n,this.material=new u({vertexShader:b,fragmentShader:x,transparent:!0,depthWrite:!1,blending:2,uniforms:{uTime:{value:0},uPixel:{value:600},uMaxPx:{value:120}}}),this.points=new s(n,this.material),this.points.frustumCulled=!1,this.points.renderOrder=5,this.dirty=!1}get uniforms(){return this.material.uniforms}burst({kind:e,count:t,at:n,origin:i,dir:a=[0,1,0],cone:o=1,speed:s=[1,2],life:c=[.6,1.2],size:l=[.03,.06],colors:u=[[1,1,1]],spread:d=[0,0,0],seed:f=1,drag:p=1,gravity:m=1,flat:h=1}){let g=Math.max(1,Math.round(t*this.scale)),v=r(Math.floor(f*9973+n*1e3)),y=new _(...a).normalize(),b=new _;for(let t=0;t<g;t++){let t=this.next;this.next=(this.next+1)%this.capacity,b.set(v()*2-1,v()*2-1,v()*2-1),b.lengthSq()<1e-4&&b.set(0,1,0),b.normalize().lerp(y,1-o),b.z*=h,b.normalize();let r=s[0]+(s[1]-s[0])*v();this.pos[t*3]=i.x+(v()*2-1)*d[0],this.pos[t*3+1]=i.y+(v()*2-1)*d[1],this.pos[t*3+2]=i.z+(v()*2-1)*d[2],this.vel[t*3]=b.x*r,this.vel[t*3+1]=b.y*r,this.vel[t*3+2]=b.z*r,this.life[t*4]=n+v()*.04,this.life[t*4+1]=c[0]+(c[1]-c[0])*v(),this.life[t*4+2]=l[0]+(l[1]-l[0])*v(),this.life[t*4+3]=e;let a=u[Math.floor(v()*u.length)];this.col[t*4]=a[0],this.col[t*4+1]=a[1],this.col[t*4+2]=a[2],this.col[t*4+3]=v(),this.move[t*2]=p,this.move[t*2+1]=m}this.dirty=!0}stream({t0:e,t1:t,rate:n,...r}){let i=Math.round((t-e)*n*this.scale);if(i<=0)return;let a=this.scale;this.scale=1;for(let n=0;n<i;n++)this.burst({...r,count:1,at:e+(t-e)*n/i,seed:(r.seed??1)+n*.37});this.scale=a}update(e){if(this.material.uniforms.uTime.value=e,this.dirty){for(let e of Object.values(this.geometry.attributes))e.needsUpdate=!0;this.dirty=!1}}clear(){for(let e=0;e<this.capacity;e++)this.life[e*4]=-1e6;this.dirty=!0}},w=1.1,T=`
float rrect(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
`,E=`
varying vec2 vP;
void main() {
  vP = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,D=`
uniform vec3 uColor;
uniform float uGlow;
uniform float uRays;
uniform float uRing;     // 0..1 progress of the shock ring
uniform float uRingA;
uniform float uTime;
uniform vec2 uHalf;
varying vec2 vP;
${T}
void main() {
  float d = rrect(vP, uHalf, ${f.toFixed(3)});
  float out_ = max(d, 0.0);
  // tight edge glow + broad soft bloom
  float g = exp(-out_ * 9.0) * 0.9 + exp(-out_ * 4.0) * 0.3;
  g *= smoothstep(-0.05, 0.0, d);
  // soft limit: a strong glow gets wider in colour, never a white band
  float gi = g * uGlow;
  vec3 col = uColor * gi / (1.0 + gi * 0.6);
  // rays: soft spokes turning slowly, from behind the card
  float a = atan(vP.y, vP.x);
  float spokes = pow(0.5 + 0.5 * sin(a * 9.0 + uTime * 0.5 + sin(a * 4.0 - uTime * 0.3) * 1.6), 5.0)
               + 0.6 * pow(0.5 + 0.5 * sin(a * 23.0 - uTime * 0.8), 9.0);
  float rays = spokes * exp(-out_ * 1.15) * smoothstep(0.0, 0.08, d);
  col += mix(uColor, vec3(1.0), 0.25) * rays * uRays * 0.55;
  // shock ring
  float R = uRing * 1.05;
  float ring = exp(-pow((d - R) * 16.0, 2.0)) * (1.0 - uRing) * smoothstep(-0.02, 0.02, d);
  float ri = ring * uRingA * 1.6;
  col += mix(uColor, vec3(1.0), 0.2) * ri / (1.0 + ri * 0.5);
  // reach zero well inside the plane's edge (linear light + bloom show even a faint cut)
  col *= 1.0 - smoothstep(0.6, ${(w*.98).toFixed(3)}, out_);
  gl_FragColor = vec4(col, 1.0);
}
`,O=`
uniform vec3 uColor;
uniform float uSheen;    // band position along the diagonal; outside about +-1.6 it's gone
uniform float uA;
uniform vec2 uHalf;
varying vec2 vP;
${T}
void main() {
  float d = rrect(vP, uHalf, ${f.toFixed(3)});
  if (d > 0.0) discard;
  float x = dot(vP, normalize(vec2(0.55, 1.0))) - uSheen;
  float band = exp(-x * x * 30.0) + exp(-x * x * 4.0) * 0.25;
  vec3 col = mix(uColor, vec3(1.0), 0.55) * band * uA * 0.55;
  gl_FragColor = vec4(col, 1.0);
}
`,ee=`
uniform vec3 uColor;
uniform float uLeak;
uniform float uTime;
uniform sampler2D uNoise;
uniform vec2 uHalf;
varying vec2 vP;
${T}
void main() {
  float d = rrect(vP, uHalf, ${f.toFixed(3)});
  if (d > 0.0) discard;
  // cracks: zero-crossings of noise, opening up as the leak grows
  vec2 w = (texture2D(uNoise, vP * 0.21 + 0.3).rg - 0.5) * 0.35;
  float n = texture2D(uNoise, vP * 0.33 + w + vec2(0.0, uTime * 0.01)).b;
  float width = mix(26.0, 7.0, uLeak);
  float crack = pow(1.0 - abs(n - 0.5) * 2.0, width) * smoothstep(0.0, 0.35, uLeak);
  // light through the edges, strongest first
  float edge = exp(d * 22.0) * smoothstep(0.0, 0.25, uLeak);
  float flick = 0.85 + 0.15 * sin(uTime * 23.0 + vP.y * 9.0);
  vec3 hot = mix(uColor, vec3(1.0, 0.97, 0.9), 0.5);
  vec3 col = (hot * crack * 1.5 + uColor * edge * 0.9) * uLeak * flick;
  gl_FragColor = vec4(col, 1.0);
}
`,k=`
uniform vec3 uColor;
uniform float uA;
varying vec2 vP;
${T}
void main() {
  float d = rrect(vP, vec2(0.5, 0.5), 0.08);
  float fill = smoothstep(0.02, -0.02, d);
  float rim = exp(-abs(d) * 40.0);
  float glow = exp(-max(d, 0.0) * 9.0);
  vec3 col = (mix(uColor, vec3(1.0, 0.9, 0.8), 0.5) * (fill * 0.35 + rim * 1.2) + uColor * glow * 0.5) * uA;
  col *= 1.0 - smoothstep(0.3, 0.5, max(abs(vP.x), abs(vP.y)));
  gl_FragColor = vec4(col, 1.0);
}
`,A=null;function te(){return A||(A={halo:new d(g+w*2,2+w*2),face:new d(g,2),unit:new d(1,1)},A)}var j=(e,t,n=0)=>new u({vertexShader:E,fragmentShader:e,uniforms:t,transparent:!0,depthWrite:!1,blending:2,side:n});function ne(e){let t=te(),n=new c(g/2,1),r=new p(1,1,1),a={value:0},o=new i(t.halo,j(D,{uColor:{value:r},uGlow:{value:0},uRays:{value:0},uRing:{value:0},uRingA:{value:0},uTime:a,uHalf:{value:n}}));o.position.z=-.09,o.renderOrder=1;let s=new i(t.face,j(O,{uColor:{value:r},uSheen:{value:9},uA:{value:0},uHalf:{value:n}}));s.position.z=.0115,s.renderOrder=2;let l=new i(t.face,j(ee,{uColor:{value:r},uLeak:{value:0},uTime:a,uNoise:{value:e.noiseB},uHalf:{value:n}}));l.position.z=-.0115,l.rotation.y=Math.PI,l.renderOrder=2;let u=new i(t.unit,j(k,{uColor:{value:r},uA:{value:0}}));u.position.z=.013,u.renderOrder=3;let d=[o,s,l,u];return{halo:o,sheen:s,leak:l,stamp:u,color:r,time:a,apply(e){let t=o.material.uniforms;t.uGlow.value=e.glow*.65,t.uRays.value=e.rays,t.uRing.value=e.ring,t.uRingA.value=e.ringA,o.visible=e.glow>.002||e.rays>.002||e.ringA>.002&&e.ring<1,s.material.uniforms.uSheen.value=e.sheen,s.material.uniforms.uA.value=e.sheenA,s.visible=e.sheenA>.002&&Math.abs(e.sheen)<1.95,l.material.uniforms.uLeak.value=e.leak,l.visible=e.leak>.002,u.material.uniforms.uA.value=e.stampA,u.visible=e.stampA>.002},placeStamp(e,t){let[n,r,i,a]=e;u.position.x=((n+i)/2-.5)*g,u.position.y=((r+a)/2-.5)*2,u.scale.set((i-n)*g*t,(a-r)*2*t,1)},dispose(){for(let e of d)e.material.dispose()}}}function re(){let e=new i(new d(60,60),new m({color:131844,transparent:!0,opacity:0,depthWrite:!1}));return e.position.z=.45,e.renderOrder=4,e.visible=!1,e}var M={linear:e=>e,in2:e=>e*e,in3:e=>e*e*e,out2:e=>1-(1-e)*(1-e),out3:e=>1-(1-e)**3,out4:e=>1-(1-e)**4,inOut2:e=>e<.5?2*e*e:1-(-2*e+2)**2/2,inOut3:e=>e<.5?4*e*e*e:1-(-2*e+2)**3/2,outBack:(e,t=1.6)=>1+(t+1)*(e-1)**3+t*(e-1)**2,outElastic:e=>e===0||e===1?e:2**(-9*e)*Math.sin((e*10-.75)*(2*Math.PI/3.2))+1},ie=e=>Math.min(1,Math.max(0,e)),N=(e,t,n)=>e+(t-e)*n,ae=(e,t,n,r)=>e<=t||e>=r?0:e<n?M.out2((e-t)/(n-t)):1-M.in2((e-n)/(r-n)),P=(e,t=31)=>Math.sin(e*t)*.6+Math.sin(e*t*1.73+1.3)*.4,oe=class{tweens;cues;start;time;duration;playing;cueIndex;onEnd;revealAt;constructor(){this.tweens=[],this.cues=[],this.start=0,this.time=0,this.duration=0,this.playing=!1,this.cueIndex=0,this.onEnd=null}set(e,t){return this.tween(e,0,()=>t())}tween(e,t,n,r=M.linear){return this.tweens.push({at:e,dur:t,fn:n,easing:r,order:this.tweens.length}),this.duration=Math.max(this.duration,e+t),this}cue(e,t){return this.cues.push({at:e,fn:t}),this.duration=Math.max(this.duration,e),this}sort(){this.tweens.sort((e,t)=>e.at-t.at||e.order-t.order),this.cues.sort((e,t)=>e.at-t.at)}play(e){return this.sort(),this.start=e,this.playing=!0,this.cueIndex=0,this.time=0,this.evaluate(0),this.fireCues(0),this}seek(e,t){return this.sort(),this.start=e-t,this.playing=!0,this.cueIndex=0,this.time=t,this.fireCues(t),this.evaluate(t),this}update(e){if(!this.playing)return!1;let t=e-this.start;return this.time=t,this.fireCues(t),this.evaluate(t),t>=this.duration&&(this.playing=!1,this.onEnd?.()),!0}fireCues(e){for(;this.cueIndex<this.cues.length&&this.cues[this.cueIndex].at<=e;){let e=this.cues[this.cueIndex++];e.fn(this.start+e.at)}}evaluate(e){for(let t of this.tweens){if(t.at>e)break;let n=t.dur<=0?1:ie((e-t.at)/t.dur);t.fn(t.easing(n))}}stop(){this.playing=!1}},se=[`rays`,`flood`,`dark`,`bloom`,`exposure`,`vignette`,`chroma`,`distort`];function F(e,t,n,r,i=0){let a=e=>{if(e<t.ow)return;let a=n();t.ow=e,t.ox=a.x,t.oy=a.y,t.oz=a.z,t.col=r,t.seed=i};return{aim:a,screen(n,r,i,o,s,c=M.out2,l=M.inOut2){e.tween(n,o-n,e=>{let u=n+e*(o-n),d;if(d=u<r?c((u-n)/Math.max(1e-4,r-n)):u<=i?1:1-l((u-i)/Math.max(1e-4,o-i)),!(d<=0)){a(d*(s.weight??1));for(let e of se)s[e]&&(t[e]=Math.max(t[e],d*s[e]))}})},wave(n,r,{amp:i=1,reach:o=2.4}={}){e.tween(n,r,e=>{let n=o*M.out3(e);if(e<=0||e>=1)return;let r=i*(1-e)**1.4*Math.min(1,e*12);a(r+.01),r>=t.waveA&&(t.wave=n,t.waveA=r),t.floodR=Math.min(t.floodR,n+.1)})}}}function ce(e){let{v:t,ease:n,KIND:r,color:i}=e;e.sound(0,`flip-common`),e.turn(0,.32,n.out3,{lift:.12,tip:.16}),e.env(.22,.3,.3,.55,e=>{t.glow+=e*.4}),e.sting(.3),e.burst(.3,{kind:r.glow,count:8,cone:1,speed:[.25,.7],life:[.35,.6],size:[.05,.09],colors:[e.hot(.3)],spread:[.6,.85,.02]}),e.wave(.28,.45,{amp:.2,reach:.65}),e.screen(.27,.31,.31,.55,{bloom:.1}),e.end(.55)}function le(e){let{v:t,ease:n,KIND:r,color:i}=e;e.sound(0,`flip-rare`),e.env(0,.1,.12,.3,e=>{t.dz-=.05*e,t.s-=.025*e}),e.env(0,.12,.3,.5,e=>{t.glow+=.45*e}),e.turn(.12,.4,n.inOut3,{lift:.2,tip:.24}),e.sting(.42),e.env(.36,.43,.48,.95,e=>{t.glow+=1.15*e}),e.tl.tween(.4,.55,e=>{t.ring=e,t.ringA+=.9},n.out2),e.flash(.38,.42,.42,.7,.13,i),e.tl.tween(.46,.46,e=>{t.sheen=-2+4*e,t.sheenA+=1},n.inOut2),e.burst(.42,{kind:r.glow,count:18,cone:1,speed:[.5,1.3],life:[.5,.9],size:[.05,.1],colors:[i,e.hot(.4)],spread:[.65,.9,.02]}),e.burst(.42,{kind:r.spark,count:10,cone:1,speed:[1.4,2.4],life:[.3,.55],size:[.03,.05],colors:[e.hot(.6)],spread:[.5,.8,.02]}),e.wave(.4,.6,{amp:.75,reach:1.7}),e.screen(.38,.44,.48,.85,{flood:.2,rays:.18,bloom:.3,exposure:.08}),e.fling(.42,{kind:r.spark,count:26,cone:1,speed:[5,9],life:[.45,.8],size:[.035,.06],colors:[e.hot(.5),i],spread:[.5,.8,.02]}),e.end(.95)}var ue=[[.75,.35,1],[.4,.75,1],[1,.45,.85],[.55,1,.85],[1,.9,1]];function de(e){let{v:t,ease:n,KIND:r,color:i}=e;e.sound(0,`flip-epic`),e.env(0,.25,.25,.75,(n,r)=>{t.dz+=.09*n,r<.3&&e.tremble(r,.012*n)},n.in2),e.env(0,.25,.4,.6,e=>{t.glow+=.75*e},n.in2),e.turn(.25,.45,n.inOut3,{lift:.22,tip:.26}),e.sting(.55),e.env(.5,.56,.62,1.25,e=>{t.glow+=1.5*e}),e.env(.52,.62,.8,1.3,e=>{t.rays+=.9*e}),e.tl.tween(.53,.6,e=>{t.ring=e,t.ringA+=1.2},n.out3),e.flash(.5,.55,.55,.85,.2,i),e.tl.tween(.62,.45,e=>{t.sheen=-2+4*e,t.sheenA+=1},n.inOut2),e.burst(.55,{kind:r.shard,count:42,cone:1,speed:[1.2,2.7],life:[.8,1.35],size:[.07,.13],colors:ue,spread:[.55,.85,.02]}),e.burst(.55,{kind:r.glow,count:16,cone:1,speed:[.5,1.4],life:[.6,1],size:[.06,.12],colors:[i,e.hot(.5)],spread:[.6,.9,.02]}),e.screen(.05,.5,.5,.6,{rays:.2,bloom:.15,vignette:.2,weight:.3},n.in2),e.wave(.53,.75,{amp:1,reach:2.3}),e.wave(.64,.8,{amp:.5,reach:2.1}),e.screen(.5,.57,.72,1.25,{flood:.6,rays:.85,bloom:.6,exposure:.22,chroma:.7,distort:.8,vignette:.25}),e.env(.53,.55,.55,.85,t=>{e.room.shake+=.014*t}),e.push(.45,.56,.7,1.2,.45),e.fling(.55,{kind:r.shard,count:80,cone:1,speed:[4,12],life:[.9,1.5],size:[.08,.15],colors:ue,spread:[.5,.8,.02]}),e.fling(.56,{kind:r.glow,count:22,cone:1,speed:[3,8],life:[.6,1],size:[.08,.14],colors:[i,e.hot(.5)],spread:[.5,.8,.02]}),e.end(1.3)}var I=[1,.78,.32],L=[[1,.82,.4],[1,.66,.22],[1,.93,.7]];function fe(e){let{v:t,ease:n,KIND:r,room:i}=e;e.sound(0,`flip-legendary`),e.full?(e.env(0,.35,1.3,2,e=>{t.dz+=.3*e,t.s+=.05*e},n.out3),e.env(.1,.68,.7,.95,e=>{t.leak+=e},n.in2),e.env(0,.7,.72,1,e=>{t.glow+=.8*e},n.in2),e.env(.2,.7,.72,1,e=>{t.rays+=.55*e},n.in2),e.env(.35,.7,.7,.76,(t,n)=>{e.tremble(n,.009*t,73)},n.in2),e.env(0,.6,1,1.8,e=>{i.dim+=.32*e}),e.push(.2,.7,1.6,2.2,1),e.screen(.05,.7,.95,1.05,{dark:.45,vignette:.45,weight:.4},n.out2,n.in2),e.screen(.2,.92,.95,1,{rays:.5,bloom:.2,weight:.5},n.in2),e.turn(.7,.45,n.inOut3,{lift:.16,tip:.2}),e.sting(1),e.env(.96,1.03,1.15,2.1,e=>{t.glow+=1.9*e}),e.env(.96,1.08,1.5,2.2,e=>{t.rays+=1.25*e}),e.tl.tween(.98,.75,e=>{t.ring=e,t.ringA+=1.4},n.out3),e.flash(.97,1.01,1.01,1.4,.28,I),e.env(.95,1.05,1.3,2,e=>{i.glow+=.6*e,i.glowCol=I}),e.burst(1,{kind:r.spark,count:75,cone:1,speed:[2,4.6],life:[.6,1.25],size:[.035,.065],colors:L,spread:[.55,.85,.02]}),e.burst(1,{kind:r.glow,count:30,cone:1,speed:[.5,1.5],life:[.8,1.4],size:[.06,.12],colors:L,spread:[.6,.9,.02]}),e.wave(.98,.9,{amp:1.3,reach:2.7}),e.wave(1.1,1,{amp:.6,reach:2.4}),e.screen(.97,1.04,1.3,1.95,{flood:.85,rays:1.1,bloom:.9,exposure:.4,chroma:.3,distort:.8,vignette:.3}),e.env(.99,1.01,1.01,1.35,e=>{i.shake+=.022*e}),e.fling(1,{kind:r.spark,count:100,cone:1,speed:[6,14],life:[.6,1.2],size:[.04,.07],colors:L,spread:[.5,.8,.02]}),e.fling(1.02,{kind:r.glow,count:34,cone:1,speed:[3,9],life:[.8,1.4],size:[.08,.15],colors:L,spread:[.5,.8,.02]}),e.tl.tween(1.1,.5,e=>{t.sheen=-2+4*e,t.sheenA+=1.2},n.inOut2),e.end(2.2)):(e.env(0,.2,.2,.45,e=>{t.leak+=.6*e,t.glow+=.6*e}),e.turn(.2,.4,n.inOut3,{lift:.2}),e.sting(.5),e.env(.45,.52,.6,1.1,e=>{t.glow+=1.4*e,t.rays+=.6*e}),e.tl.tween(.48,.55,e=>{t.ring=e,t.ringA+=1.1},n.out3),e.flash(.46,.5,.5,.8,.15,I),e.burst(.5,{kind:r.spark,count:40,cone:1,speed:[1.8,3.6],life:[.5,1],size:[.035,.06],colors:L,spread:[.55,.85,.02]}),e.wave(.48,.65,{amp:.85,reach:1.9}),e.screen(.46,.52,.6,1.05,{flood:.38,rays:.45,bloom:.45,exposure:.15,distort:.4}),e.fling(.5,{kind:r.spark,count:30,cone:1,speed:[5,10],life:[.5,.9],size:[.035,.06],colors:L,spread:[.5,.8,.02]}),e.tl.tween(.58,.45,e=>{t.sheen=-2+4*e,t.sheenA+=1},n.inOut2),e.end(1.1))}var R=[[1,.35,.08],[1,.55,.15],[.9,.16,.05]],z=[1,.45,.25];function pe(e){let{v:t,ease:n,KIND:r,room:i,color:a,slot:o}=e;e.sound(0,`flip-mythic`);let s=()=>{let e=o.stampRect;return[((e[0]+e[2])/2-.5)*g,((e[1]+e[3])/2-.5)*2,.05]},c=a=>{e.env(a-.18,a,a+.04,a+.45,(e,n)=>{t.stampA+=e,t.stampScale=n<a?1+1.6*(1-e):1+.15*(1-e)},n.in3),e.stampOn(a),e.env(a,a+.02,a+.02,a+.16,e=>{t.dz-=.05*e,i.shake+=.012*e}),e.burst(a,{kind:r.spark,count:22,cone:1,speed:[1,2.2],life:[.3,.6],size:[.03,.05],colors:[z,[1,.85,.6]],spread:[.15,.04,.01]},s())};if(!e.full)e.env(0,.25,.8,1.4,e=>{i.dim+=.5*e,i.red+=.6*e}),e.env(0,.25,.3,.6,e=>{t.glow+=.7*e,t.leak+=.6*e}),e.turn(.25,.5,n.inOut3,{lift:.2}),e.sting(.62),e.env(.58,.65,.8,1.4,e=>{t.glow+=1.6*e,t.rays+=.7*e}),e.flash(.6,.64,.64,.95,.22,z),e.burst(.62,{kind:r.ember,count:40,cone:1,speed:[.6,1.8],life:[.9,1.6],size:[.04,.07],colors:R,spread:[.6,.9,.02]}),e.screen(0,.25,.55,.66,{dark:.45,vignette:.3,weight:.4}),e.wave(.6,.75,{amp:1,reach:2.2}),e.screen(.6,.66,.8,1.3,{flood:.5,rays:.5,bloom:.6,exposure:.2,chroma:.4,distort:.6}),e.fling(.62,{kind:r.ember,count:50,cone:1,speed:[3,8],life:[.9,1.5],size:[.05,.08],colors:R,spread:[.5,.8,.02]}),c(.85),e.end(1.45);else{e.env(0,.6,3,3.8,e=>{i.dim+=.86*e},n.out2,n.inOut2),e.env(.1,.7,3,3.8,e=>{i.red+=e}),e.env(.15,.6,1.4,1.55,e=>{t.glow+=.45*e}),e.stream(.1,3,{kind:r.ember,rate:34,dir:[0,1,0],cone:.55,speed:[.15,.55],life:[1.4,2.4],size:[.035,.065],colors:R,spread:[.7,.1,.15]},[0,-.9,0]),e.screen(0,.6,2.3,2.37,{dark:.88,vignette:.55,weight:.3},n.out2,n.linear);for(let n of[.7,1.1])e.screen(n,n+.06,n+.06,n+.4,{flood:.3,chroma:.25,bloom:.2,weight:.5}),e.env(n,n+.06,n+.06,n+.36,e=>{t.s+=.035*e,t.glow+=.75*e,i.shake+=.004*e,i.glow+=.25*e,i.glowCol=a});e.env(1,1.5,2.7,3.5,e=>{t.dz+=.32*e,t.s+=.05*e},n.out3),e.env(.9,1.45,1.6,1.95,e=>{t.leak+=e},n.in2),e.env(1.2,1.5,1.5,1.65,(t,n)=>{e.tremble(n,.01*t,67)},n.in2),e.push(1.2,2,3,3.8,.7),e.turn(1.5,.9,n.inOut3,{lift:.18,tip:.3}),e.sting(2.35),e.env(2.3,2.33,2.33,2.75,e=>{i.shake+=.045*e}),e.flash(2.32,2.36,2.36,2.85,.42,z),e.env(2.33,2.4,2.6,3.6,e=>{t.glow+=2*e}),e.env(2.35,2.45,3,3.8,e=>{t.rays+=1.2*e}),e.env(2.33,2.45,2.9,3.7,e=>{i.glow+=.8*e,i.glowCol=a}),e.tl.tween(2.35,.8,e=>{t.ring=e,t.ringA+=1.5},n.out3),e.burst(2.35,{kind:r.ember,count:70,cone:1,speed:[.8,2.3],life:[1,2],size:[.04,.075],colors:R,spread:[.6,.9,.02]}),e.burst(2.35,{kind:r.spark,count:60,cone:1,speed:[2,4.8],life:[.5,1.1],size:[.035,.06],colors:[z,[1,.75,.35],[1,.95,.85]],spread:[.55,.85,.02]}),e.wave(2.33,1.1,{amp:1.6,reach:3}),e.wave(2.47,1.2,{amp:.8,reach:2.8}),e.wave(2.78,.6,{amp:.5,reach:1.4}),e.screen(2.32,2.4,2.7,3.8,{flood:.9,rays:1.1,bloom:.95,exposure:.32,chroma:.9,distort:1.1,vignette:.35},n.out2,n.out2),e.fling(2.35,{kind:r.spark,count:90,cone:1,speed:[7,16],life:[.5,1],size:[.04,.07],colors:[z,[1,.75,.35],[1,.95,.85]],spread:[.5,.8,.02]}),e.fling(2.36,{kind:r.ember,count:90,cone:1,speed:[3,10],life:[1.2,2.2],size:[.05,.09],colors:R,spread:[.5,.8,.02]}),e.everywhere(2.33,1.4,{kind:r.ember,rate:150,dir:[0,1,0],cone:.6,speed:[.2,.9],life:[1,2],size:[.05,.09],colors:R}),c(2.78),e.tl.tween(2.95,.5,e=>{t.sheen=-2+4*e,t.sheenA+=1},n.inOut2),e.end(3.8)}}var me=e(.84,.1,195),B=(e,t=14)=>Math.max(1,Math.min(t,4+Math.round(Math.log2(Math.max(1,e))))),V=null;function he(){return V||(V=document.createElement(`div`),V.className=`gem-sky`,V.setAttribute(`aria-hidden`,`true`),V.innerHTML=`<i class="gem-flare"></i>`,document.body.append(V)),V}var H=(e,t)=>{let n=Math.sin(e*127.1+t*311.7)*43758.5453;return n-Math.floor(n)};function ge(){let e=document.querySelector(`.hud .gems .gem-ico`)??document.querySelector(`.hud .gems`);if(!e)return{cx:innerWidth-60,cy:30,hw:10,hh:10};let t=e.getBoundingClientRect();return{cx:t.left+t.width/2,cy:t.top+t.height/2,hw:t.width/2,hh:t.height/2}}var _e=class{flights=[];spare=[];lands=[];seed=1;opts;flare;constructor(e){this.opts=e,this.flare=he().querySelector(`.gem-flare`)}get flying(){return this.flights.length>0}launch(e,t,n,{count:r=B(n),stagger:i=.045,delay:a=0,size:o=1,spread:s=1}={}){if(n<=0)return;if(this.opts.reduced){this.flights.push({el:this.piece(),t0:e+a,dur:0,share:n,seed:0,size:0,spread:0,from:t,p:null,landed:!1});return}let c=Math.min(r,n),l=Math.floor(n/c),u=n-l*c;for(let n=0;n<c;n++){let r=this.seed++,c=l+ +(u-->0);this.flights.push({el:this.piece(),t0:e+a+n*i+H(r,9)*.03,dur:.62+H(r,1)*.22,share:c,seed:r,size:o*(.8+H(r,2)*.5),spread:s,from:t,p:null,landed:!1})}}piece(){let e=this.spare.pop()??document.createElement(`i`);return e.parentNode||(e.className=`gem-bit`,e.innerHTML=n,he().append(e)),e.style.opacity=`0`,e}update(e){let t=this.flights.length?ge():null;for(let n=this.flights.length-1;n>=0;n--){let r=this.flights[n],i=e-r.t0;if(i<0){r.el.style.opacity=`0`;continue}r.p||=this.path(r,t);let a=r.dur>0?i/r.dur:1;if(a>=1){this.land(r,e),this.flights.splice(n,1);continue}let[o,s,c,l,u,d,f,p]=r.p,m=a<.5?a*(1.15-.3*a):a,h=(1-m)**3,g=3*(1-m)**2*m,_=3*(1-m)*m*m,v=m**3,y=h*o+g*c+_*u+v*f,b=h*s+g*l+_*d+v*p,x=Math.min(1,a/.12),S=r.size*(.4+.9*x*(1-.55*a*a)),C=(H(r.seed,3)-.5)*720*a+(H(r.seed,4)-.5)*60;r.el.style.opacity=String(Math.min(1,x*1.4)),r.el.style.transform=`translate3d(${y.toFixed(1)}px, ${b.toFixed(1)}px, 0) rotate(${C.toFixed(0)}deg) scale(${S.toFixed(3)})`}let n=0;for(let t=this.lands.length-1;t>=0;t--){let r=e-this.lands[t];r>.5||r<0?this.lands.splice(t,1):n+=Math.exp(-r*9)}if(n>.01&&!this.opts.reduced){let e=t??ge();this.flare.style.opacity=String(Math.min(1,n*.6)),this.flare.style.transform=`translate3d(${e.cx.toFixed(1)}px, ${e.cy.toFixed(1)}px, 0) scale(${(.7+Math.min(1.6,n*.35)).toFixed(3)})`}else this.flare.style.opacity=`0`}path(e,t){let n=e.from(),r=t=>H(e.seed,t),i=n.cx+(r(5)-.5)*n.hw*1.2,a=n.cy+(r(6)-.5)*n.hh*1.2,o=Math.atan2(a-n.cy,i-n.cx)+(r(7)-.5)*1.2,s=(60+r(8)*110)*e.spread*Math.min(1.4,Math.max(.6,n.hh/160));return[i,a,i+Math.cos(o)*s,a+Math.sin(o)*s-50*e.spread,t.cx-40-r(10)*120,t.cy+70+r(11)*110,t.cx,t.cy]}land(e,t){e.el.style.opacity=`0`,this.spare.push(e.el),e.landed||(e.landed=!0,this.lands.push(t),this.opts.onLand(e.share),this.opts.reduced||this.opts.audio.play(`card-land`,{rate:2.3+H(e.seed,12)*.5,gain:.32}))}clear(){for(let e of this.flights)e.el.style.opacity=`0`,this.spare.push(e.el);this.flights.length=0,this.lands.length=0,this.flare.style.opacity=`0`}};function ve(e,t,n){let{tl:r,v:i,slot:a,room:o,ease:s,KIND:c}=e,l=r.revealAt??r.duration,u=r.duration;if(r.set(0,()=>{a.gone=0,a.tileK=0}),n){let n=u;r.tween(n,.25,e=>{a.gone=e}),r.tween(n+.05,.25,e=>{a.tileK=e}),r.cue(n,e=>t.launch(e,t.gems,1)),e.end(n+.3);return}let d=Math.max(l+(t.rush?.28:.45),u-.15),f=me,p=F(r,o,()=>a.root.position,f,a.i*2.3+.9),m=a.rarity.index>=3;e.env(d,d+.13,d+.15,d+.24,(t,n)=>{i.glow+=1.4*t,i.s+=.045*t,i.dz+=.06*t,e.tremble(n,.012*t,70)}),r.tween(d,.2,e=>{i.sheen=-2+4*e,i.sheenA+=1},s.inOut2),r.tween(d+.15,.15,e=>{a.gone=e},s.in2),e.flash(d+.14,d+.17,d+.17,d+.42,m?.22:.15,f),p.wave(d+.16,.6,{amp:m?.5:.35,reach:1.2}),p.screen(d+.14,d+.18,d+.2,d+.5,{bloom:.25,exposure:.05,weight:.4});let h=[.85,1,1];e.burst(d+.16,{kind:c.shard,count:m?34:24,cone:1,speed:[1.6,3.6],life:[.45,.85],size:[.035,.07],colors:[f,h,a.rarity.linear],spread:[.5,.75,.02],drag:1.6,gravity:.8,flat:.4}),e.burst(d+.16,{kind:c.glow,count:14,cone:1,speed:[.3,1],life:[.35,.6],size:[.06,.12],colors:[f,h],spread:[.5,.75,.02]}),e.burst(d+.16,{kind:c.spark,count:12,cone:1,speed:[3,6],life:[.25,.45],size:[.025,.045],colors:[h],spread:[.4,.6,.02],drag:.6,gravity:.2,flat:.35}),r.cue(d+.13,()=>e.audio.play(`flip-common`,{rate:1.75,gain:.8})),r.cue(d+.16,()=>e.audio.play(`card-whoosh`,{rate:1.55,gain:.55})),r.cue(d+.17,e=>t.launch(e,t.gems,B(t.gems,t.rush?8:14))),r.tween(d+.26,.34,e=>{a.tileK=e},s.out2),e.end(d+.62)}var ye={common:ce,rare:le,epic:de,legendary:fe,mythic:pe};function U(e,t,n,r,i,a,o=M.out2,s=M.inOut2){e.tween(t,i-t,e=>{let c=t+e*(i-t),l=0;l=c<n?o((c-t)/Math.max(1e-4,n-t)):c<=r?1:1-s((c-r)/Math.max(1e-4,i-r)),a(l,c)})}function be(e){let t=new oe,n=xe(t,e);return e.reduced?Se(n):ye[e.slot.rarity.id](n),e.convert&&ve(n,e.convert,e.reduced),t}function xe(e,t){let{slot:n,room:r,particles:i,audio:a}=t,o=n.v,s=n.rarity.linear,c=F(e,r,()=>n.root.position,s,n.i*1.7+.3),l={tl:e,v:o,room:r,slot:n,full:t.full,color:s,audio:a,ease:M,bump:ae,shake:P,KIND:S,hot:(e=.5,t=s)=>[t[0]+(1-t[0])*e,t[1]+(1-t[1])*e,t[2]+(1-t[2])*e],env:(...t)=>U(e,...t),turn(t,r,i=M.inOut3,{lift:a=.16,tip:s=.22}={}){e.set(0,()=>{n.yaw=Math.PI}),e.tween(t,r,e=>{n.yaw=Math.PI+Math.PI*e;let t=Math.sin(Math.PI*e);o.dz+=a*t,o.pitch-=s*t},i),e.tween(t+r,0,()=>{n.yaw=0})},sting(r){e.revealAt=r,e.cue(r,()=>{n.rarity.id!==`common`&&a.play(`sting-${n.rarity.id}`),t.onReveal?.(n)})},sound(t,n){e.cue(t,()=>a.play(n))},burst(t,r,a=[0,0,0]){e.cue(t,e=>{let t=n.root.position;i.burst({seed:n.i+1,...r,at:e,origin:{x:t.x+a[0],y:t.y+a[1],z:t.z+a[2]+.05}})})},screen:c.screen,wave:c.wave,fling(e,t,n){l.burst(e,{drag:.16,gravity:.3,flat:.35,...t},n)},everywhere(r,a,o){e.cue(r,e=>{let r=t.view();i.stream({seed:n.i+11,...o,t0:e,t1:e+a,origin:{x:r.cx,y:r.cy-r.hh*.2,z:.4},spread:[r.hw*1.05,r.hh*.95,.5]})})},stream(t,r,a,o=[0,0,0]){e.cue(t,e=>{let t=n.root.position;i.stream({seed:n.i+7,...a,t0:e,t1:e+r,origin:{x:t.x+o[0],y:t.y+o[1],z:t.z+o[2]}})})},tremble(e,t,n=61){o.dx+=P(e,n)*t,o.dy+=P(e+3.1,n*.87)*t*.6,o.rz+=P(e+7.7,n*.71)*t*.9},flash(t,i,a,o,s,c=n.rarity.linear){U(e,t,i,a,o,e=>{r.flash=Math.max(r.flash,e*s),r.flashCol=c})},push(t,i,a,o,s){U(e,t,i,a,o,e=>{e*s>r.push&&(r.push=e*s,r.pushX=n.root.position.x,r.pushY=n.root.position.y)},M.inOut2,M.inOut2)},stampOn(t){let r=n.card.mats.card.uStampOn;e.set(0,()=>{r.value=0}),e.tween(t,0,()=>{r.value=1})},end(t){e.tween(t,0,()=>{})}};return l}function Se(e){let{tl:t,v:n,slot:r}=e;return e.sound(0,`flip-${r.rarity.id}`),e.turn(0,.3,M.inOut2,{lift:0,tip:0}),e.env(0,.25,.3,.7,e=>{n.glow+=e*(.4+r.rarity.index*.15)}),r.rarity.id===`mythic`&&e.stampOn(.3),e.sting(.3),e.end(.7),t}var W=g*1.2,G=2.6,K=.17,q=G/2-K-.05,Ce=.14,we=.0035;function Te(e,t){let n=Math.max(0,1-Math.abs(2*e/W)**2.6),r=G/2-K,i=Math.abs(t),a=i>=r?0:Math.max(0,1-(i/r)**4);return Ce*Math.sqrt(n)*Math.sqrt(a)}function J(e,t,n){let r=Math.max(4,Math.round((t-e)/G*72)),i=[],a=[],s=[],c=[];for(let o=0;o<=r;o++){let c=e+(t-e)*o/r;for(let e=0;e<=40;e++){let t=-W/2+W*e/40,r=n*(Te(t,c)+we);i.push(t,c,r),a.push(n>0?t/W+.5:.5-t/W,c/G+.5),s.push(+(n>0))}}for(let e=0;e<r;e++)for(let t=0;t<40;t++){let r=e*41+t,i=r+1,a=r+40+1,o=a+1;n>0?c.push(r,i,a,i,o,a):c.push(r,a,i,i,a,o)}let u=new l;return u.setAttribute(`position`,new o(i,3)),u.setAttribute(`uv`,new o(a,2)),u.setAttribute(`aSide`,new o(s,1)),u.setIndex(c),u.computeVertexNormals(),u}function Ee(e,t){let n=new l,r=e.attributes.position.count;for(let r of[`position`,`normal`,`uv`,`aSide`]){let i=e.attributes[r],a=t.attributes[r],o=new Float32Array(i.array.length+a.array.length);o.set(i.array),o.set(a.array,i.array.length),n.setAttribute(r,new h(o,i.itemSize))}let i=e.index.array,a=t.index.array,o=new Uint32Array(i.length+a.length);o.set(i);for(let e=0;e<a.length;e++)o[i.length+e]=a[e]+r;return n.setIndex(new h(o,1)),n.computeBoundingSphere(),n}function De(){let e=.04;return{body:Ee(J(-G/2,q+e,1),J(-G/2,q+e,-1)),cap:Ee(J(q-e,G/2,1),J(q-e,G/2,-1))}}var Oe=Math.PI,Y=[.32,.95,.62];function ke(){return{dx:0,dy:0,dz:0,s:0,rz:0,pitch:0,glow:0,rays:0,ring:0,ringA:0,sheen:9,sheenA:0,leak:0,stampA:0,stampScale:1}}function Ae(){return{dim:0,red:0,push:0,pushX:0,pushY:0,shake:0,flash:0,flashCol:[1,1,1],glow:0,glowCol:[1,1,1],ox:0,oy:0,oz:0,ow:0,col:[1,1,1],seed:0,src:null,wave:0,waveA:0,rays:0,flood:0,floodR:9,dark:0,bloom:0,exposure:0,vignette:0,chroma:0,distort:0}}var X=new _,je=class{stage;particles;audio;reduced;still;room;onReveal;flights;tiles;group;veil;layout;focus;focusZ;hovered;pointer;queue;dealTurn=0;pool;slots;from;constructor({stage:e,noise:n,particles:r,audio:i,reduced:o,still:s,room:c,onReveal:l,flights:u,tiles:d,size:f=5,from:p}){this.from=p??{x:0,y:q-.6,z:-.05},this.stage=e,this.particles=r,this.audio=i,this.reduced=o,this.still=s,this.room=c,this.onReveal=l,this.flights=u??null,this.tiles=d??null,this.group=new a,this.veil=re(),this.group.add(this.veil),this.layout=null,this.focus=null,this.focusZ=4,this.hovered=null,this.pointer=null,this.queue=[],this.pool=Array.from({length:f},(r,i)=>{let o=new y(e.renderer);o.shared.uParallax.value=0;let s=new a,c=ne(n);return s.add(c.halo,o.group),o.group.add(c.sheen,c.leak,c.stamp),s.visible=!1,this.group.add(s),{i,card:o,root:s,fx:c,v:ke(),yaw:Oe,rarity:t.common,data:null,stampRect:[0,0,0,0],arc:0,shown:!1,away:0,faceUp:!1,flip:null,hover:0,focusAmt:0,tilt:{x:0,y:0},concealed:!0,spin:i%2?1:-1,gems:0,gone:0,tileK:0}}),this.slots=this.pool}async deal(e,n){let r=++this.dealTurn,i=await Promise.all(e.map((e,t)=>this.pool[t].card.load(e)));if(await n,r===this.dealTurn){this.queue.length=0,this.focus=null,this.slots=this.pool.slice(0,e.length);for(let t of this.pool.slice(e.length))t.shown=!1,t.root.visible=!1;await Promise.all(e.map((e,t)=>this.slots[t].card.show(e))),r===this.dealTurn&&e.forEach((e,n)=>{let r=this.slots[n];r.stampRect=i[n].info.stamp,r.data=e,r.rarity=t[e.rarity],r.yaw=Oe,r.faceUp=!1,r.flip=null,r.focusAmt=0,r.tilt.x=r.tilt.y=0,r.gems=r.gone=r.tileK=0,this.tiles?.set(n,null,0),r.card.mats.card.uStampOn.value=r.rarity.id===`mythic`?0:1,this.conceal(r,!0)})}}setGems(e){this.slots.forEach((t,n)=>{t.gems=e[n]??0,this.tiles?.set(n,t.data,t.gems)})}conceal(e,t){e.concealed=t,e.card.conceal(t),e.fx.color.setRGB(...t?Y:e.rarity.linear)}setLayout(e){this.layout=e}get best(){let e=this.slots[0];for(let t of this.slots)t.rarity.index>=e.rarity.index&&(e=t);return e}get faceDown(){return this.slots.filter(e=>!e.faceUp&&!e.flip)}get allUp(){return this.slots.every(e=>e.faceUp)}get busy(){return this.slots.some(e=>e.flip)||this.queue.length>0}flipSlot(e,t,{full:n,rush:r=!1}={}){if(e.faceUp||e.flip)return null;this.conceal(e,!1);let i=this.best,a=this.reduced?!1:n??(e===i||!i.faceUp),o=be({slot:e,room:this.room,particles:this.particles,audio:this.audio,reduced:this.reduced,full:a,view:()=>this.viewRect(),onReveal:e=>{e.faceUp=!0,this.onReveal?.(e)},convert:e.gems>0?{gems:e.gems,rush:r,launch:(t,n,r)=>this.flights?.launch(t,()=>this.screenRect(e),n,{count:r})}:void 0});return o.onEnd=()=>{e.flip=null},e.flip=o,o.play(t),o}flipAll(e){let t=this.best,n=this.faceDown.sort((e,n)=>Number(e===t)-Number(n===t)||e.i-n.i),r=e;this.queue=n.map(e=>{let n={slot:e,at:r,full:e===t,rush:e!==t};return r+=this.reduced?.18:e===t?0:.34,n})}seekFlip(e,t,n){let r=this.flipSlot(e,t);r&&r.seek(t,n)}setFaceUp(e){e.yaw=0,e.faceUp=!0,e.card.mats.card.uStampOn.value=1,this.conceal(e,!1),e.gems>0&&(e.gone=e.tileK=1)}target(e){return this.layout?.slots[e]??{x:0,y:0,rz:0}}viewRect(){let e=this.stage,t=e.worldPerPx;return{cx:(innerWidth/2-e.center.x)*t+e.view.x,cy:(e.center.y-innerHeight/2)*t+e.view.y,hw:innerWidth*t/2,hh:innerHeight*t/2}}screenRect(e){let t=this.stage.camera;e.root.getWorldPosition(X);let n=X.z;X.project(t);let r=(X.x+1)/2*innerWidth,i=(1-X.y)/2*innerHeight,a=this.stage.pxPerUnitAt(n)/this.stage.view.zoom,o=e.root.scale.x;return{cx:r,cy:i,hw:g/2*o*a,hh:1*o*a}}hit(e,t){if(this.focus){let n=this.screenRect(this.focus);return Math.abs(e-n.cx)<n.hw&&Math.abs(t-n.cy)<n.hh?this.focus:null}let n=null;for(let r of this.slots){if(!r.root.visible||r.arc<1||r.away>0||r.gone>.5)continue;let i=this.screenRect(r);Math.abs(e-i.cx)<i.hw*1.04&&Math.abs(t-i.cy)<i.hh*1.04&&(n=r)}return n}beginFrame(){for(let e of this.slots)Object.assign(e.v,ke())}runFlips(e){for(;this.queue.length&&this.queue[0].at<=e;){let e=this.queue.shift();this.flipSlot(e.slot,e.at,{full:e.full,rush:e.rush})}for(let t of this.slots)t.flip&&t.flip.update(e)}compose(e,t,n){let r=(t,n,r)=>this.still||this.reduced?n:t+(n-t)*(1-Math.exp(-r*e)),i=0,a=this.waveOnScreen();for(let e of this.slots){let o=e.v,s=this.target(e.i);if(e.root.visible=e.shown,!e.shown)continue;let c=M.out3(Math.min(1,e.arc)),l=this.from.x,u=this.from.y,d=this.from.z,f=s.x*.5,p=Math.max(s.y,0)+1.6,m=(1-c)*(1-c),h=2*(1-c)*c,g=c*c,_=m*l+h*f+g*s.x,v=m*u+h*p+g*s.y,y=m*d+h*.6,b=N(.6,1,c),x=s.rz+(1-c)*e.spin*2.6,S=(1-c)*.7;if(e.away>0){let t=e.away;_=N(_,_*.4,t),v-=7*t,y+=.4*t,x+=e.spin*.7*t,b*=1-.3*t}let C=e.arc>=1&&e.away===0,w=C&&this.hovered===e&&!this.focus&&!e.flip?1:0;e.hover=r(e.hover,w,14);let T=e.hover;y+=.15*T,b*=1+.04*T,o.glow+=(e.faceUp?.3:.6)*T;let E=0,D=0;if(w&&this.pointer&&!this.reduced){let t=this.screenRect(e);E=Math.max(-1,Math.min(1,(this.pointer.x-t.cx)/t.hw)),D=Math.max(-1,Math.min(1,(this.pointer.y-t.cy)/t.hh))}e.tilt.x=r(e.tilt.x,E,10),e.tilt.y=r(e.tilt.y,D,10),C&&!this.reduced&&(v+=.012*Math.sin(t*.9+e.i*1.7),x+=.006*Math.sin(t*.7+e.i*2.3)),e.faceUp&&!e.flip&&(o.glow+=.08+.06*e.rarity.index);let O=0;if(a&&C&&!e.flip){let t=this.screenRect(e),n=(t.cx-a.x)/innerHeight,r=(t.cy-a.y)/innerHeight,i=Math.hypot(n,r);if(i>.04){O=a.a*Math.exp(-(((a.r-i)/.16)**2));let e=n/i,t=-r/i;o.dx+=e*.16*O,o.dy+=t*.16*O,o.dz+=.1*O,o.rz-=e*.07*O,o.pitch-=t*.18*O,o.glow+=.9*O}}if(e.concealed){let t=Math.min(1,O*2),n=this.room.col;e.fx.color.setRGB(N(Y[0],n[0],t),N(Y[1],n[1],t),N(Y[2],n[2],t))}let ee=+(this.focus===e);e.focusAmt=r(e.focusAmt,ee,9);let k=M.inOut2(e.focusAmt);i=Math.max(i,k);let A=e.yaw;k>.001&&(_=N(_,0,k),v=N(v,0,k),y=N(y,this.focusZ,k),x=N(x,0,k),this.focus===e&&n&&(S+=n.pitch*k,A+=n.yaw*k,x+=n.roll*k,v+=n.lift*k)),e.root.position.set(_+o.dx,v+o.dy,y+o.dz),e.root.rotation.set(0,0,x+o.rz),e.root.scale.setScalar(b*(1+o.s)),e.card.group.rotation.set(S+o.pitch+.16*e.tilt.y,A+.2*e.tilt.x,0,`XYZ`);let te=e.flip||k>.01||T>.01;e.card.mesh.renderOrder=te?2:0,e.gone>0?(e.card.group.scale.setScalar(Math.max(.001,1-e.gone)),o.glow*=1-e.gone,o.rays*=1-e.gone):e.card.group.scale.setScalar(1),e.card.group.visible=e.gone<.999,e.fx.apply(o),e.fx.placeStamp(e.stampRect,o.stampScale)}this.veil.visible=i>.002,this.veil.material.opacity=.72*i;let o=this.tiles;if(o)for(let e of this.pool){let t=e.shown&&this.slots.includes(e)&&e.tileK>0;o.place(e.i,t?this.screenRect(e):null,e.tileK,1-i)}}waveOnScreen(){let e=this.room;return this.reduced||e.waveA<.01?null:(X.set(e.ox,e.oy,e.oz).project(this.stage.camera),{x:(X.x+1)/2*innerWidth,y:(1-X.y)/2*innerHeight,r:e.wave,a:Math.min(1.2,e.waveA)})}setTime(e){for(let t of this.pool)t.card.shared.uTime.value=e,t.fx.time.value=e}get lightSets(){return this.pool.map(e=>e.card.shared)}async warmUp(e,t){let n=this.slots[0],r=[n.fx.halo,n.fx.sheen,n.fx.leak,n.fx.stamp,this.veil].map(e=>new i(e.geometry,e.material));await n.card.warmUp(e,{extra:r,target:t})}},Z=[1,.96,.9],Q=[.55,.85,.75],$=[1,.22,.08],Me=[`rays`,`flood`,`dark`,`bloom`,`exposure`,`vignette`,`chroma`,`distort`];function Ne(e){let t=e.backdrop.uniforms,n=new _,r=v();return{apply(i,a,o,s,c=0){let l=Math.min(.92,Math.max(i.dim,.45*c)),u=Math.min(1,i.red),d=i.col,f=Math.min(1,i.flood+.12*Math.min(1,i.waveA)),p=Z[0]*(1-.8*l)+.42*u+d[0]*f*.9,m=Z[1]*(1-.8*l)+.07*u+d[1]*f*.9,h=Z[2]*(1-.8*l)+.025*u+d[2]*f*.9,g=N(N(Q[0],$[0],u*.85),d[0]*1.4,f*.8),_=N(N(Q[1],$[1],u*.85),d[1]*1.4,f*.8),v=N(N(Q[2],$[2],u*.85),d[2]*1.4,f*.8);for(let e of a)e.uKeyCol.value.setRGB(p,m,h),e.uRimCol.value.setRGB(g,_,v);t.uDim.value=l;let y=i.glowCol,b=i.glow;`isColor`in y?t.uGlow.value.setRGB(y.r*b,y.g*b,y.b*b):t.uGlow.value.setRGB(y[0]*b,y[1]*b,y[2]*b);let x=i.push,S=P(o,47)*i.shake,C=P(o+1.3,53)*i.shake;e.setView(i.pushX*x*.18+S,i.pushY*x*.18+C,1-.1*x),t.uTint.value.setRGB(d[0]*f*.6,d[1]*f*.6,d[2]*f*.6),n.set(i.ox,i.oy,i.oz).project(e.camera),r.x=(n.x+1)/2,r.y=(n.y+1)/2,r.col=d,r.seed=i.seed,r.wave=i.wave,r.waveA=i.waveA,r.floodR=i.floodR;for(let e of Me)r[e]=i[e];let w=Math.min(1,i.flash)*.5,T=i.flashCol,E=`isColor`in T?[T.r,T.g,T.b]:T;r.flash=[E[0]*w,E[1]*w,E[2]*w],e.post?.set(r,s)},reset(n){e.setView(0,0,1),t.uDim.value=0,t.uGlow.value.setRGB(0,0,0),t.uTint.value.setRGB(0,0,0);for(let e of n)e.uKeyCol.value.setRGB(...Z),e.uRimCol.value.setRGB(...Q)}}}export{C as S,ae as _,Ae as a,P as b,K as c,U as d,me as f,oe as g,F as h,je as i,q as l,B as m,Q as n,G as o,_e as p,Ne as r,W as s,Z as t,De as u,M as v,S as x,N as y};