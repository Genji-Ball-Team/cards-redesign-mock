import{K as e,N as t,R as n,Sn as r,Yt as i,bn as a,cn as o,f as s,ft as c,in as l,n as u,p as d,r as f,rn as p,t as m,tn as h,u as g,x as _,xn as v,z as y}from"./geometry-CzHUig4W.js";import{j as b}from"./index-J3lP8W1Y.js";import{o as x,s as S}from"./icons-B4UciC06.js";var C=256;function w(e){let t=e>>>0;return()=>{t=t+1831565813>>>0;let e=t;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}}function T(e,t){let n=new Float32Array(e*e);for(let e=0;e<n.length;e++)n[e]=t();let r=new Float32Array(C*C),i=C/e;for(let t=0;t<C;t++){let a=t/i,o=Math.floor(a),s=a-o,c=s*s*(3-2*s),l=o%e*e,u=(o+1)%e*e;for(let a=0;a<C;a++){let o=a/i,s=Math.floor(o),d=o-s,f=d*d*(3-2*d),p=s%e,m=(s+1)%e,h=n[l+p]+(n[l+m]-n[l+p])*f,g=n[u+p]+(n[u+m]-n[u+p])*f;r[t*C+a]=h+(g-h)*c}}return r}function E(e,t,n){let r=w(e),i=new Float32Array(C*C),a=.5,o=0;for(let e=0;e<n;e++){let n=T(Math.min(C,t<<e),r);for(let e=0;e<i.length;e++)i[e]+=n[e]*a;o+=a,a*=.5}let s=1/0,c=-1/0;for(let e=0;e<i.length;e++)i[e]/=o,s=Math.min(s,i[e]),c=Math.max(c,i[e]);for(let e=0;e<i.length;e++)i[e]=(i[e]-s)/(c-s);return i}function D(e){let t=new Uint8Array(C*C*4);for(let n=0;n<C*C;n++)for(let r=0;r<4;r++)t[n*4+r]=Math.round(Math.min(1,Math.max(0,e[r][n]))*255);let r=new _(t,C,C,c);return r.wrapS=r.wrapT=i,r.magFilter=n,r.minFilter=y,r.generateMipmaps=!0,r.anisotropy=4,r.needsUpdate=!0,r}function O(){let e=E(11,64,3),t=new Float32Array(C*C),n=new Float32Array(C*C),r=(t,n)=>e[(n+C)%C*C+(t+C)%C];for(let e=0;e<C;e++)for(let i=0;i<C;i++)t[e*C+i]=.5+(r(i-1,e)-r(i+1,e))*2.5,n[e*C+i]=.5+(r(i,e-1)-r(i,e+1))*2.5;return{noiseA:D([t,n,e,E(23,4,5)]),noiseB:D([E(37,4,5),E(41,4,5),E(53,8,4),E(67,4,4)])}}function k(e,t,n,r,i=2){let a=Float32Array.from(e),o=new Float32Array(a.length);for(let e=0;e<i;e++){for(let e=0;e<n;e++){let n=0;for(let i=-r;i<=r;i++)n+=a[e*t+Math.min(t-1,Math.max(0,i))];for(let i=0;i<t;i++){o[e*t+i]=n/(2*r+1);let s=a[e*t+Math.min(t-1,i+r+1)],c=a[e*t+Math.max(0,i-r)];n+=s-c}}for(let e=0;e<t;e++){let i=0;for(let a=-r;a<=r;a++)i+=o[Math.min(n-1,Math.max(0,a))*t+e];for(let s=0;s<n;s++){a[s*t+e]=i/(2*r+1);let c=o[Math.min(n-1,s+r+1)*t+e],l=o[Math.max(0,s-r)*t+e];i+=c-l}}}return a}var A=(e,t,n)=>Math.min(n,Math.max(t,e)),ee=(e,t,n)=>{let r=A((n-e)/(t-e),0,1);return r*r*(3-2*r)};function j(e,t){let n=new Float32Array(e.length);for(let r=0;r<e.length;r++){let i=[];for(let n=Math.max(0,r-t);n<=Math.min(e.length-1,r+t);n++)i.push(e[n]);i.sort((e,t)=>e-t),n[r]=i[i.length>>1]}return n}function M(e,t){let n=new Float32Array(e.length);for(let r=0;r<e.length;r++){let i=0,a=0;for(let n=Math.max(0,r-t);n<=Math.min(e.length-1,r+t);n++)i+=e[n],a++;n[r]=i/a}return n}function te(e,t,n){let r=(r,i)=>e[A(i,0,n-1)*t+A(r,0,t-1)],i=new Float32Array(t*n),a=new Float32Array(t*n);for(let e=0;e<n;e++)for(let n=0;n<t;n++){let o=r(n+1,e-1)+2*r(n+1,e)+r(n+1,e+1)-r(n-1,e-1)-2*r(n-1,e)-r(n-1,e+1),s=r(n-1,e+1)+2*r(n,e+1)+r(n+1,e+1)-r(n-1,e-1)-2*r(n,e-1)-r(n+1,e-1),c=Math.abs(o),l=Math.abs(s);i[e*t+n]=l>c*1.3?l:0,a[e*t+n]=c>l*1.3?c:0}let o=new Float32Array(t*n),s=new Float32Array(t*n);for(let e=0;e<n;e++)for(let r=0;r<t;r++){let c=0,l=0;for(let o=-6;o<=6;o++)c+=i[e*t+A(r+o,0,t-1)],l+=a[A(e+o,0,n-1)*t+r];o[e*t+r]=c/13,s[e*t+r]=l/13}return{H:o,V:s}}function N(e,t,n,r,i,{a0:a=0,a1:o=t,innermost:s=!0}={}){let c=(a+o)/2,l=[],u=0;for(let t=-6;t<=6;t++){let i=t*.004;for(let t=n;t<=r;t++){let n=0;for(let r=a;r<o;r+=2)n+=e(r,Math.round(t+i*(r-c)));let r=n/Math.ceil((o-a)/2);l.push([t,i,r]),u=Math.max(u,r)}}let d=new Float32Array(t),f=new Float32Array(t);if(u<i*.5)return{pos:d.fill(NaN),pres:f,found:0,score:u};let p=new Map;for(let[e,t,n]of l)(!p.has(e)||p.get(e)[1]<n)&&p.set(e,[t,n]);let m=null;for(let e=n;e<=r;e++){let[t,n]=p.get(e);if(!(n<u*.55)&&!((p.get(e-1)?.[1]??0)>n||(p.get(e+1)?.[1]??0)>n)&&((!m||s)&&(m=[e,t]),!s))break}let[h,g]=m;for(let n=0;n<t;n++){let t=Math.round(h+g*(n-c)),r=t,i=-1;for(let a=t-1;a<=t+1;a++){let t=e(n,a);t>i&&(i=t,r=a)}d[n]=r}let _=M(j(d,10),3);for(let n=0;n<t;n++){let t=Math.round(_[n]);f[n]=ee(i*.6,i*1.6,Math.max(e(n,t),e(n,t-1),e(n,t+1)))}let v=M(j(f,6),6),y=0;for(let e=a;e<o;e++)y+=v[e];return{pos:_,pres:v,found:y/(o-a),score:u}}function ne(e,t,n){let r=(r,i)=>{let a=(A(i,0,n-1)*t+A(r,0,t-1))*4;return[e[a],e[a+1],e[a+2]]},i=(e,t)=>Math.hypot(e[0]-t[0],e[1]-t[1],e[2]-t[2]),a=[[0,0,1,1],[t-1,0,-1,1],[0,n-1,1,-1],[t-1,n-1,-1,-1]].map(([e,t,n,a])=>{let o=r(e,t);for(let s=1;s<40;s++)if(i(r(e+n*s,t+a*s),o)>70)return s;return 0}),o=(e,t,n,a)=>{let o=r(e,t),s=0;for(s=1;s<12&&!(i(r(e+n*s,t+a*s),o)>70);s++);return s>=12?0:s},s=(e,t,n,r)=>{let i=0;for(let a=-20;a<=20;a+=5)i+=o(e+(r?a:0),t+(n?a:0),n,r);return i/9},c=(e,r,i,a)=>{let s=i?n:t,c=[];for(let t=-8;t<=8;t++){let n=Math.round(t*.05*s);c.push(o(e+(a?n:0),r+(i?n:0),i,a))}return c.sort((e,t)=>e-t),c[1]},l={l:s(0,n>>1,1,0),r:s(t-1,n>>1,-1,0),t:s(t>>1,0,0,1),b:s(t>>1,n-1,0,-1)},u={l:c(0,n>>1,1,0),r:c(t-1,n>>1,-1,0),t:c(t>>1,0,0,1),b:c(t>>1,n-1,0,-1)},d=(u.l+u.r+u.t+u.b)/4,f=a.map(e=>Math.max(0,(e-d)/(1-Math.SQRT1_2)));return f.sort((e,t)=>e-t),{inset:l,cut:u,radius:(f[1]+f[2])/2,diag:a}}function re(e,t,n){let r=t*n,i=new Float32Array(r);for(let t=0;t<r;t++)i[t]=(.2126*e[t*4]+.7152*e[t*4+1]+.0722*e[t*4+2])/255;let{H:a,V:o}=te(k(i,t,n,1,1),t,n),s=(e,r)=>o[A(r,0,n-1)*t+A(e,0,t-1)],c=(e,r)=>a[A(r,0,n-1)*t+A(e,0,t-1)],l=ne(e,t,n),u=.32,d=Math.round(t*.09),f=Math.round(n*.08),p=N((e,t)=>s(t,e),n,Math.round(l.inset.l)+3,d,u),m=N((e,n)=>s(t-1-n,e),n,Math.round(l.inset.r)+3,d,u),h=N((e,t)=>c(e,t),t,Math.round(l.inset.t)+3,f,u),g=N((e,t)=>c(e,n-1-t),t,Math.round(l.inset.b)+3,f,u),_={innermost:!1},v=N((e,t)=>c(e,t),t,Math.round(l.inset.t)+3,f,u,_),y=N((e,t)=>c(e,n-1-t),t,Math.round(l.inset.b)+3,f,u,_),b=(e,t,n)=>{let r=0;for(let i=t;i<n;i++)c(i,e)>u&&r++;return r/(n-t)},x=Math.round(t*.12),S=Math.round(t*.88),C=new Float32Array(n);for(let e=0;e<n;e++)C[e]=b(e,x,S);let w=-1;{let e=Math.round(n*.36),t=Math.round(n*.66),r=0;for(let n=e;n<=t;n++)r=Math.max(r,C[n]);if(r>.45){for(let n=e;n<=t;n++)if(C[n]>=r*.75&&C[n]>=C[n-1]&&C[n]>=C[n+1]){w=n;break}}}let T=-1;{let e=Math.round(n*.025),r=Math.round(n*.2);for(let n=r;n>=e;n--){let e=Math.min(b(n,x,Math.round(t*.25)),b(n,Math.round(t*.75),S));if(C[n]>.6&&e>.5&&C[n]>=C[n-1]&&C[n]>=C[n+1]){T=n;break}}}let E=e=>e<0?null:N((e,t)=>c(e,t),t,e-4,e+4,u,{a0:x,a1:S}),D=E(w),O=E(T),j=new Float32Array(r),M=new Float32Array(r),re=new Float32Array(r),ie=t*.16,P=(e,t)=>e?e.pres[A(t,0,e.pres.length-1)]:0,F=(e,t,n)=>{let r=e.pos[A(t,0,e.pos.length-1)];return Number.isNaN(r)?n:r},ae=e=>O?O.pos[e]:F(h,e,l.inset.t+8),oe=e=>D?D.pos[e]:NaN,I=0,L=0,R=0;for(let e=0;e<n;e++)for(let r=0;r<t;r++){let i=e*t+r,a=F(p,e,l.inset.l+8),o=t-1-F(m,e,l.inset.r+8);F(h,r,l.inset.t+8),n-1-F(g,r,l.inset.b+8);let s=F(v,r,l.inset.t+8),c=n-1-F(y,r,l.inset.b+8);j[i]=1-ee(-2,2,Math.min(r-a,o-r,e-s,c-e));let u=ae(r),d=oe(r);if(Number.isNaN(d))continue;let f=r-a,_=o-r,b=e-u,x=d-e,S=ee(-2,2,Math.min(f,_,b,x));if(M[i]=S,S<=0)continue;I+=S;let C=(e,t)=>1-(1-t)*(1-ee(0,ie,e));re[i]=S*C(f,P(p,e))*C(_,P(m,e))*C(b,O?P(O,r):0)*C(x,P(D,r))}if(D){let e=n,t=0;for(let n=x;n<S;n++)e=Math.min(e,ae(n)),t=Math.max(t,oe(n));for(let n=Math.round(e);n<=Math.round(t);n++)L+=P(p,n)+P(m,n),R+=2;for(let e=x;e<S;e++)L+=P(D,e)+(O?P(O,e):0),R+=O?2:1}let z=R?L/R:0,B=Math.round(n*.042),V=Math.round(B*2.67),H=(e,r,a=V)=>{let o=0;for(let l=r;l<r+B;l++)for(let r=e;r<e+a;r++)o+=c(r,l)+s(r,l)+Math.max(0,i[A(l,0,n-1)*t+A(r,0,t-1)]-.45);return o/(a*B)},se=(e,t)=>{let n=Math.round(V/3);return Math.max(H(e,t,n),H(e+n,t,n),H(e+2*n,t,V-2*n))},ce=(e,r)=>{let i=n-1-F(g,r?t-40:40,l.inset.b+8)-3,a=Math.round(i-B),o=F(e,a+(B>>1),8)+4,s=Math.round(r?t-1-o-V:o);return{x0:s,y0:a,busy:H(s,a)}},U=ce(p,!1),W=ce(m,!0),G=W.busy<U.busy*.6?W:U;if(G.busy>.3)for(let e of[g,y])for(let r=Math.round(l.inset.l)+6;r+V<t-l.inset.r-6;r+=3){let i=n-1-F(e,r+(V>>1),l.inset.b+8)-3,a=Math.round(i-B),o=Math.min(r,t-r-V)/t,s=H(r,a);s*(1+o)<G.busy&&(G={x0:r,y0:a,busy:s})}if(G.busy>.3&&D){let e=Math.round(F(p,w,l.inset.l+8)+6),n=Math.round(t-1-F(m,w,l.inset.r+8)-6-V),r=Math.round(t*.12),i={x0:0,y0:0,busy:1/0};for(let a=0;a<=r;a+=3)for(let r of[e+a,n-a]){let e=Math.min(D.pos[A(r,0,t-1)],D.pos[A(r+V,0,t-1)])-4,n=Math.round(e-B),o=H(r,n);o*(1+a/t)<i.busy&&(i={x0:r,y0:n,busy:o})}se(i.x0,i.y0)<se(G.x0,G.y0)*.6&&(G=i)}let K=[G.x0/t,1-(G.y0+B)/n,(G.x0+V)/t,1-G.y0/n];return{frame:j,window:M,depth:k(re,t,n,1,1),info:{outline:l,stamp:K,stampBusy:[+U.busy.toFixed(3),+W.busy.toFixed(3)],barY:w,headY:T,confidence:Math.round(z*100)/100,found:{left:+p.found.toFixed(2),right:+m.found.toFixed(2),top:+h.found.toFixed(2),bottom:+g.found.toFixed(2)},windowShare:+(I/r).toFixed(3),sides:{left:p.pos,right:m.pos,top:h.pos,bottom:g.pos},winTop:O?.pos??null,winBottom:D?.pos??null,winTopPres:O?.pres??null,winBottomPres:D?.pres??null,leftPres:p.pres,rightPres:m.pres}}}var ie={"dr-gybbus":{depth:!1},fealthy:{depth:!1},fynxa:{depth:!1},god:{depth:!1},ipseity:{depth:!1},onikiri:{depth:!1},"prime-baxy":{depth:!1}};function P(e,t){let n=140800,r=new Float32Array(n);for(let e=0;e<n;e++)r[e]=Math.max(0,t[e]-.3);let i=k(e,320,440,7,2),a=k(r,320,440,7,2),o=new Float32Array(n);for(let e=0;e<n;e++)o[e]=i[e]*6+a[e]*2.2;let s=Float32Array.from(o).sort(),c=s[28160],l=s[105600],u=new Float32Array(n);for(let e=0;e<n;e++){let t=Math.min(1,Math.max(0,(o[e]-c)/(l-c||1)));u[e]=1-t*t*(3-2*t)}return k(u,320,440,3,1)}function F(e,t){let n=140800,r=new Float32Array(n);for(let t=0;t<n;t++)r[t]=(.2126*e[t*4]+.7152*e[t*4+1]+.0722*e[t*4+2])/255;let i=k(r,320,440,1,1),a=(e,t)=>i[Math.min(439,Math.max(0,t))*320+Math.min(319,Math.max(0,e))],o=new Float32Array(n),s=new Uint8Array(n*4);for(let e=0;e<440;e++)for(let t=0;t<320;t++){let n=(a(t+1,e)-a(t-1,e))*.5,r=(a(t,e-1)-a(t,e+1))*.5;o[e*320+t]=Math.hypot(n,r);let i=((439-e)*320+t)*4;s[i]=Math.round(Math.min(1,Math.max(0,.5-n*3))*255),s[i+1]=Math.round(Math.min(1,Math.max(0,.5-r*3))*255)}let c=k(o,320,440,2,1),l=P(o,r);for(let e=0;e<440;e++)for(let t=0;t<320;t++){let n=((439-e)*320+t)*4;s[n+2]=Math.round(l[e*320+t]*255),s[n+3]=Math.round(Math.min(1,c[e*320+t]*8)*255)}let u=ae(e,t),d=new Uint8Array(n*4);for(let e=0;e<440;e++)for(let t=0;t<320;t++){let n=e*320+t,r=((439-e)*320+t)*4;d[r]=Math.round(u.window[n]*255),d[r+1]=Math.round(u.frame[n]*255),d[r+2]=Math.round(u.depth[n]*255),d[r+3]=255}return{map:s,zones:d,info:u.info}}function ae(e,t){let n=re(e,320,440),r=ie[t]??{};if(n.info.override=Object.keys(r).length?r:null,n.info.depthOn=r.depth??n.info.confidence>=.6,r.stamp){let[e,t]=r.stamp,[i,a,o,s]=n.info.stamp,c=o-i,l=s-a;n.info.stamp=[e/320,1-t/440-l,e/320+c,1-t/440]}return n}function oe(e,t,n){let r=document.createElement(`canvas`);r.width=t,r.height=n;let i=r.getContext(`2d`,{willReadFrequently:!0});return i.drawImage(e,0,0,t,n),i.getImageData(0,0,t,n).data}function I(e){let t=new _(e,320,440,c);return t.magFilter=n,t.minFilter=y,t.generateMipmaps=!0,t.wrapS=t.wrapT=s,t.needsUpdate=!0,t}function L(e,t){let n=new o(e);return n.colorSpace=h,n.flipY=t,n.premultiplyAlpha=!1,n.minFilter=y,n.generateMipmaps=!0,n.needsUpdate=!0,n}function R(e){let t=new Image;return t.decoding=`async`,t.src=e,t.decode().then(()=>t)}var z=null,B=typeof Worker>`u`||typeof OffscreenCanvas>`u`,V=0,H=new Map;function se(e,t){z||(z=new Worker(new URL(`/cards-redesign-mock/assets/analyze.worker-D_VGlK7h.js`,``+import.meta.url),{type:`module`}),z.onmessage=({data:e})=>{let t=H.get(e.n);H.delete(e.n),e.error?t.reject(Error(e.error)):t.resolve(e)},z.onerror=()=>{B=!0;for(let e of H.values())e.reject(Error(`card analysis worker failed`));H.clear()});let n=z;return new Promise((r,i)=>{let a=++V;H.set(a,{resolve:r,reject:i}),n.postMessage({n:a,url:e,id:t})})}async function ce(e,t){if(!B)try{let n=await se(new URL(e,location.href).href,t);return{art:L(n.art,!1),map:I(n.map),zones:I(n.zones),info:n.info}}catch{}let n=await R(e),r=F(oe(n,320,440),t);return{art:L(n,!0),map:I(r.map),zones:I(r.zones),info:r.info}}var U=1024,W=1408,G=1024,K=1408,le={inner:`oklch(17% 0.006 215)`,outer:`oklch(8.5% 0.005 220)`,band:`oklch(6% 0.004 220)`,pattern:`oklch(24% 0.006 215)`,patternBand:`oklch(13% 0.004 220)`,foil:`oklch(66% 0.008 215)`,ringType:`oklch(70% 0.006 215)`,ball:`oklch(79% 0.132 158)`,ballDeep:`oklch(64% 0.13 158)`},q=U/2,J=W/2,Y=196,ue=44,de=42,fe=266,pe=332,me=52,he=700,ge=22,_e=282,ve=350;function X(e,t,n,r,i,a){e.beginPath(),e.roundRect(t,n,r,i,a)}var Z={x:12/13,y:-8.4/13};function ye(e,t){e.beginPath(),e.arc(q,J,t,0,Math.PI*2)}function be(e,t,n=1){e.beginPath(),e.moveTo(q-Z.x*t*n,J-Z.y*t*n),e.lineTo(q+Z.x*t*n,J+Z.y*t*n)}function xe(e,t){t(),e.save(),e.translate(q,J),e.rotate(Math.PI),e.translate(-512,-704),t(),e.restore()}function Se(e,t,n){if(n===`color`){let n=e.createRadialGradient(q,J,40,q,J,W*.6);n.addColorStop(0,t.inner),n.addColorStop(1,t.outer),e.fillStyle=n,e.fillRect(0,0,U,W),e.fillStyle=t.band,X(e,0,0,U,W,de),X(e,ue,ue,936,1320,22),e.fill(`evenodd`)}}function Ce(e,t,n){let r=n===`color`?t.pattern:`#fff`;e.save(),X(e,62,62,900,1284,14),e.clip(),e.strokeStyle=r;for(let t=ve,r=0;t<1100;t+=22,r++)e.globalAlpha=(n===`color`?.9:1)*Math.max(0,1-(t-ve)/820),e.lineWidth=r%4==0?3.2:1.4,e.beginPath(),e.arc(q,J,t,0,Math.PI*2),e.stroke();e.lineCap=`round`;let i=Math.atan2(Z.y,Z.x),a=Math.cos(i)*15,o=Math.sin(i)*15;for(let t=-16;t<=16;t++){let r=J+t*46,i=Math.abs(t)%2?34:0;for(let t=-8;t<=8;t++){let s=q+i+t*68,c=Math.hypot(s-q,r-J),l=Math.min(1,Math.max(0,(c-ve-40)/240));l<=0||(e.globalAlpha=l*(n===`color`?.85:1),e.lineWidth=3.5,e.beginPath(),e.moveTo(s-a,r-o),e.lineTo(s+a,r+o),e.stroke())}}e.restore(),e.save(),X(e,0,0,U,W,de),X(e,ue,ue,936,1320,22),e.clip(`evenodd`),e.strokeStyle=n===`color`?t.patternBand:`#fff`,e.globalAlpha=n===`color`?1:.6,e.lineWidth=2;for(let t=-1408;t<2432;t+=9)e.beginPath(),e.moveTo(t,0),e.lineTo(t+W*.7,W),e.stroke();e.restore()}function we(e,t,n){let r=n===`color`?t.foil:`#fff`;e.strokeStyle=r,e.fillStyle=r,e.lineWidth=4,X(e,54,54,916,1300,18),e.stroke(),e.lineWidth=1.6,X(e,66,66,892,1276,10),e.stroke();let i=[[66,66,1,1],[958,66,-1,1],[66,1342,1,-1],[958,1342,-1,-1]];e.lineWidth=5,e.lineCap=`round`;for(let[t,n,r,a]of i)e.beginPath(),e.moveTo(t+r*10,n+a*46),e.lineTo(t+r*46,n+a*10),e.stroke(),e.beginPath(),e.arc(t+r*24,n+a*24,5,0,Math.PI*2),e.fill();e.lineWidth=3,e.beginPath(),e.arc(q,J,230,0,Math.PI*2),e.stroke(),e.lineWidth=1.5,e.beginPath(),e.arc(q,J,246,0,Math.PI*2),e.stroke(),e.lineWidth=3,e.lineCap=`round`,e.save(),e.beginPath(),e.arc(q,J,246,0,Math.PI*2),e.arc(q,J,210,0,Math.PI*2,!0),e.clip(`evenodd`),be(e,246,1),e.stroke(),e.restore(),e.lineWidth=2.5,e.beginPath(),e.arc(q,J,fe,0,Math.PI*2),e.stroke(),e.lineWidth=4,e.beginPath(),e.arc(q,J,pe,0,Math.PI*2),e.stroke(),xe(e,()=>{e.beginPath(),e.moveTo(799,J),e.lineTo(811,692),e.lineTo(823,J),e.lineTo(811,716),e.closePath(),e.fill()})}function Te(e,t,n){let r=document.createElement(`canvas`);r.width=e.canvas.width,r.height=e.canvas.height;let i=r.getContext(`2d`);if(i.setTransform(e.getTransform()),n===`color`){let e=i.createRadialGradient(q,J,20,q,J,Y);e.addColorStop(0,t.ball),e.addColorStop(1,t.ballDeep),i.fillStyle=e}else i.fillStyle=`#fff`;ye(i,Y),i.fill(),i.globalCompositeOperation=`destination-out`,i.lineWidth=3.5/13*Y,i.lineCap=`round`,be(i,Y,1.2),i.stroke(),e.save(),e.setTransform(1,0,0,1,0,0),e.drawImage(r,0,0),e.restore()}function Ee(e,t,n){e.save(),e.fillStyle=n===`color`?t.ringType:`#fff`,e.font=`${he} ${me}px Saira, system-ui, sans-serif`;let r=1;`fontStretch`in e?e.fontStretch=`condensed`:r=.78,e.textBaseline=`alphabetic`,e.textAlign=`center`;let i=[...`GENJI BALL`],a=ge,o=i.map(t=>e.measureText(t).width*r),s=o.reduce((e,t)=>e+t,0)+a*(i.length-1);xe(e,()=>{let t=-s/2;for(let n=0;n<i.length;n++){let s=(t+o[n]/2)/_e;e.save(),e.translate(q+Math.sin(s)*_e,J-Math.cos(s)*_e),e.rotate(s),e.scale(r,1),e.fillText(i[n],0,0),e.restore(),t+=o[n]+a}}),e.restore()}function De(e,t){let n=document.createElement(`canvas`);return n.width=e,n.height=t,n}function Q(e,t,n){let r=De(G,K).getContext(`2d`,{willReadFrequently:!0});r.fillStyle=`#000`,r.fillRect(0,0,G,K),r.scale(G/U,K/W);for(let i of e)i(r,t,n);let i=r.getImageData(0,0,G,K).data,a=new Float32Array(G*K);for(let e=0;e<a.length;e++)a[e]=i[e*4]/255;return a}var $=null;function Oe(){if($)return $;let e=le,t=De(U,W),r=t.getContext(`2d`);Se(r,e,`color`),Ce(r,e,`color`),we(r,e,`color`),Te(r,e,`color`),Ee(r,e,`color`);let i=Q([we,Te,Ee],e,`mask`),a=Q([Ce],e,`mask`),o=k(Q([we,Te],e,`mask`),G,K,2,2),s=k(Q([Ee],e,`mask`),G,K,1,2),l=k(Q([Te],e,`mask`),G,K,6,2),u=new Uint8Array(G*K*4);for(let e=0;e<K;e++)for(let t=0;t<G;t++){let n=e*G+t,r=((1407-e)*G+t)*4;u[r]=Math.round(i[n]*255),u[r+1]=Math.round(a[n]*255),u[r+2]=Math.round(Math.max(0,Math.min(1,o[n]*.6+l[n]*.5+.12-s[n]*.12))*255),u[r+3]=255}let d=new g(t);d.colorSpace=h,d.anisotropy=8;let f=new _(u,G,K,c);return f.generateMipmaps=!0,f.minFilter=y,f.magFilter=n,f.needsUpdate=!0,$={color:d,mask:f,edgeTint:[.012,.013,.014]},$}function ke(e){let t=document.createElement(`canvas`);t.width=256,t.height=96;let n=t.getContext(`2d`,{willReadFrequently:!0});n.fillStyle=`#000`,n.fillRect(0,0,256,96),n.fillStyle=`#fff`,n.strokeStyle=`#fff`,e(n);let r=n.getImageData(0,0,256,96).data,i=new Float32Array(24576);for(let e=0;e<i.length;e++)i[e]=r[e*4]/255;return i}function Ae(e,t){e.beginPath(),e.roundRect(t,t,256-t*2,96-t*2,22-t*.5)}function je(e){let t=ke(t=>b(t,e,128,69,{size:58,weight:800,tracking:4})),r=k(t,256,96,2,2),i=ke(e=>{Ae(e,3),e.fill()}),a=ke(e=>{e.lineWidth=3,Ae(e,9),e.stroke()}),o=new Uint8Array(98304);for(let e=0;e<96;e++)for(let n=0;n<256;n++){let s=e*256+n,c=((95-e)*256+n)*4;o[c]=Math.round(t[s]*255),o[c+1]=Math.round(r[s]*255),o[c+2]=Math.round(i[s]*255),o[c+3]=Math.round(a[s]*255)}let s=new _(o,256,96,c);return s.generateMipmaps=!0,s.minFilter=y,s.magFilter=n,s.needsUpdate=!0,s}var Me=`
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
`,Ne=`
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
`,Pe=`
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
`,Fe=`
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
`,Ie=`
vec3 shade(vec2 uv, Surf s) {
  vec3 art = texture2D(uArt, uv).rgb;
  vec4 m = texture2D(uMap, uv);
  vec4 g = texture2D(uNoiseA, uv * uCard * 2.6);

  vec3 N = perturb(s, (g.rg - 0.5) * 0.13 + (m.rg - 0.5) * 0.05);
  vec3 albedo = art * (0.96 + 0.07 * g.b);
  vec3 col = albedo * printLight(N) * 0.97;

  // one broad, dull highlight (very rough dielectric), no environment reflection
  vec3 sheen = keySpec(N, s.V, vec3(0.03), 0.85);
  float NoV = sat1(dot(N, s.V));
  float veil = luma(sheen) * 0.6 + pow(1.0 - NoV, 2.5) * 0.05;
  col = mix(col, vec3(0.62, 0.63, 0.64), sat1(veil) * 0.25) + sheen * 0.35 * (0.8 + 0.4 * g.b);
  return col;
}
`,Le=`
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
  // Over the art and the text panels the streak must not flatten what is drawn there (faces,
  // names): it is added in full only on dark, quiet ink (where foil would show), and on lighter
  // or detailed ink it brightens the ink instead of laying a white veil over it, so the dark
  // lines that draw a face or outline a title keep their contrast.
  float inner = wz * 0.45 + pz * 0.8;
  float darkInk = 1.0 - smoothstep(0.02, 0.22, L);
  float detail = smoothstep(0.25, 0.8, m.a);
  float veil = mix(0.2, 0.5, darkInk) * (1.0 - 0.75 * detail);
  // (the wide skirt stays on the frame: over the art it is what reads as a veil)
  float streakIn = core + 0.03 * skirt + band * 0.3;

  vec3 tint = mix(uAccent * 1.25, vec3(1.0), 0.32);
  vec3 inkTint = mix(vec3(L), art, 0.5) * 1.2 + 0.15;
  vec3 metalCol = env * 0.3 * tint * inkTint;

  vec3 col = art * printLight(N) * (1.0 - metal * 0.3) + metalCol * metal;
  col += streakCol * (streak2 * fz * 1.3 + streakIn * inner * veil) * (1.0 - 0.6 * protect);
  col += art * streakCol * streakIn * inner * (1.0 - veil) * 0.9;
  // satin: a cool blue lift at glancing angles
  col += pow(1.0 - NoV, 3.0) * uAccent * 0.18 * (0.4 + metal);
  return col;
}
`,Re=`
vec3 spectral(float w) {
  // Zucconi's spectral approximation, w = 0..1 across 400..700nm
  const vec3 cs = vec3(3.54541723, 2.86670055, 2.29421995);
  const vec3 xs = vec3(0.69548916, 0.49416934, 0.28269708);
  const vec3 ys = vec3(0.02320775, 0.15936245, 0.53520021);
  vec3 x = cs * (w - xs);
  return clamp(1.0 - x * x - ys, 0.0, 1.0);
}

vec3 diffraction(vec3 g, vec3 gp, vec3 L, vec3 V, float period, float sharp) {
  vec3 LV = L + V;
  float u = abs(dot(g, LV));
  float across = dot(gp, LV);
  float lobe = exp(-across * across * sharp);
  vec3 c = vec3(0.0);
  for (int m = 1; m <= 3; m++) {
    float lam = period * u / float(m);
    c += spectral((lam - 0.4) / 0.3) / float(m);
  }
  return c * lobe;
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

  // diamond micro-pattern: ~120 cells across the card, each its own grating
  vec2 p = uv * uCard * 80.0;
  vec2 q = vec2(p.x + p.y, p.y - p.x) * 0.70710678;
  vec2 id = floor(q);
  vec2 f = fract(q) - 0.5;
  float h = hash12(id);
  float border = smoothstep(0.36, 0.5, max(abs(f.x), abs(f.y)));
  vec2 cc = (uv - vec2(0.5, 0.62)) * uCard;
  // (each cell turned only a little against its neighbours: turned far, every cell shows its own
  // unrelated colour and dark art reads as a coarse pixel mosaic instead of a holo)
  float th = atan(cc.y, cc.x) + (h - 0.5) * 0.3;
  vec3 g = s.T * cos(th) + s.B * sin(th);
  vec3 N = perturb(s, (m.rg - 0.5) * 0.14);
  vec3 gp = cross(N, g);

  vec3 holo = diffraction(g, gp, keyL(), s.V, 1.35, 16.0) * uKeyCol;
  holo += diffraction(g, gp, normalize(vec3(0.0, 0.62, 0.78)), s.V, 1.35, 16.0) * 0.6;
  // cells catch the light a beat apart, so the rainbow glints instead of flooding
  // (the seams between cells stay faint: drawn dark, they put a pixel grid over the whole art)
  holo *= (0.7 + 0.3 * h) * (1.0 - 0.3 * border);

  // the silver foil base reflects the room
  vec3 mirror = envSpec(N, s.V, vec3(0.55), 0.2) * 0.1 + keySpec(N, s.V, vec3(0.55), 0.2) * 0.1;

  // foil shows through dark ink only (L is linear: 0.05 ~ 25% grey, 0.3 ~ 58% grey)
  float ink = 1.0 - smoothstep(0.03, 0.3, L);
  // (detailed ink, the lines that draw a face or hair, keeps the foil off more over the art)
  float foil = (fz * 1.0 + wz * 0.75 + pz * 0.25) * ink * (1.0 - m.a * (0.5 + 0.35 * wz));

  vec3 col = art * printLight(N);
  col += (holo * 0.7 + mirror) * foil;
  // a whisper of holo over the light inks too, so the whole face reacts to the tilt
  col += holo * 0.06 * (1.0 - foil) * fz;
  // over the art the foil runs under mid tones too: the cells (and their embossed seams) read
  // across the illustration, not only in its shadows; the brightest highlights stay clean
  float mid = (1.0 - foil) * (1.0 - smoothstep(0.45, 0.85, L)) * wz * (1.0 - 0.6 * m.a);
  col += holo * 0.2 * mid;
  col *= 1.0 - 0.03 * border * wz * (1.0 - smoothstep(0.6, 0.9, L));
  // a faint violet sheen keeps the whole card in the epic family
  col += pow(1.0 - sat1(dot(N, s.V)), 3.0) * uAccent * 0.15;
  col += envSpec(N, s.V, vec3(0.04), 0.3) * 0.4;
  return col;
}
`,ze=`
vec3 glitter(vec2 uv, Surf s) {
  vec2 p = uv * uCard * 92.0;
  vec2 id = floor(p);
  vec2 f = fract(p);
  float present = step(0.48, hash12(id + 17.0));
  vec2 c = 0.22 + 0.56 * hash22(id);
  float shape = smoothstep(0.34, 0.0, length(f - c));
  vec2 tilt = (hash22(id + 3.7) - 0.5) * 0.8;
  vec3 n = normalize(s.Ng + s.T * tilt.x + s.B * tilt.y);
  float g = pow(sat1(dot(n, normalize(keyL() + s.V))), 700.0);
  g += pow(sat1(dot(n, normalize(normalize(vec3(-0.55, 0.15, 0.82)) + s.V))), 700.0) * 0.8;
  g += pow(sat1(dot(n, normalize(normalize(vec3(0.0, 0.62, 0.78)) + s.V))), 700.0) * 0.6;
  g += pow(sat1(dot(n, normalize(normalize(vec3(0.6, 0.05, 0.8)) + s.V))), 700.0) * 0.5;
  float tw = hash12(id + 9.1);
  return vec3(1.0, 0.86, 0.6) * g * shape * present * (0.6 + 0.8 * tw) * 9.0;
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

  // how gold is the printed ink here: warm hue, some chroma, some brightness
  float warm = sat1((art.r * 0.9 + art.g * 0.7 - art.b * 1.7) * 1.8);
  float goldInk = warm * smoothstep(0.06, 0.45, L) * (1.0 - smoothstep(0.75, 0.98, L) * 0.5);
  float metal = sat1(fz * 0.75 + goldInk * mix(1.0, 0.3, wz));

  vec3 N = perturb(s, (m.rg - 0.5) * (0.12 + 1.1 * metal));
  const vec3 GOLD = vec3(1.0, 0.74, 0.32);
  float rough = 0.24;
  vec3 refl = envSpec(N, s.V, GOLD, rough) + keySpec(N, s.V, GOLD, rough);
  vec3 inkHue = art / max(max(art.r, max(art.g, art.b)), 0.04);
  vec3 metalCol = refl * (0.35 + 1.1 * L) * mix(vec3(1.0), inkHue, 0.35) + art * 0.25;

  vec3 diffuse = art * printLight(N);
  vec3 col = mix(diffuse, diffuse * 0.6 + metalCol, metal * 0.8);
  col += envSpec(N, s.V, vec3(0.04), 0.3) * 0.4 * (1.0 - metal);

  float protect = smoothstep(0.55, 0.9, L) * (1.0 - goldInk);
  float gmask = (0.35 + 0.65 * metal) * (wz * 0.8 + fz + pz * 0.45) * (1.0 - protect);
  col += glitter(uv, s) * gmask;
  col += pow(1.0 - sat1(dot(N, s.V)), 4.0) * uAccent * 0.15;
  return col;
}
`,Be=`
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
  // the figure: these cards put their subject in the middle of the art window, standing on the
  // type bar. Cracks of fire across a coat or a face read as damage to the figure, so the veins
  // keep to the window's sides (the backdrop), the frame and the panels.
  float figure = wz * (1.0 - smoothstep(0.17, 0.33, abs(uv.x - 0.5)));
  float veinThrough = through * (1.0 - 0.9 * figure);

  vec3 N = perturb(s, (m.rg - 0.5) * 0.22);
  // the darkest card: shadows sink under the lacquer, deeper still where smoke drifts
  float smoke = smoothstep(0.35, 0.9, n1.a * 0.6 + n2.a * 0.6);
  vec3 col = art * printLight(N) * mix(1.0, 0.55, dark * zone * (0.4 + 0.6 * calm)) * (1.0 - 0.4 * smoke * through);
  // a faint crimson glow inside the smoke, then the veins burning through it
  col += vec3(0.06, 0.005, 0.007) * smoke * through;
  col += emberCol * vein * veinThrough * pulse * 1.15;

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
`,Ve=`
uniform sampler2D uBackCol;
uniform sampler2D uBackMask;
uniform vec2 uMaskTexel;

vec3 shade(vec2 uv, Surf s) {
  // (half a mip sharper: the back is mostly fine type and rules, and seen small in the pack
  // spread the default mip turned the ring's name to a blur)
  vec3 base = texture2D(uBackCol, uv, -0.5).rgb;
  vec4 mk = texture2D(uBackMask, uv, -0.5);
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
`,He=`
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
`,Ue={common:Ie,rare:Le,epic:Re,legendary:ze,mythic:Be};function We({noiseA:e,noiseB:t}){return{uTime:{value:0},uKeyDir:{value:new v(-.45,.55,.7).normalize()},uKeyCol:{value:new d(1,.96,.9)},uRimDir:{value:new v(.65,.35,-.68).normalize()},uRimCol:{value:new d(.55,.85,.75)},uCard:{value:new a(m,2)},uNoiseA:{value:e},uNoiseB:{value:t},uParallax:{value:1},uDepth:{value:.11},uAccent:{value:new d(1,1,1)}}}function Ge(e){let t=We(e),n={uArt:{value:null},uMap:{value:null},uZones:{value:null},uDepthOn:{value:0},uOutline:{value:new r},uPaintR:{value:0},uStamp:{value:null},uStampRect:{value:new r(.06,.035,.27,.08)},uStampTexel:{value:new a(1/256,1/96)},uStampOn:{value:1},uCornerR:{value:u}},i=(e,n,r=1,i=!1)=>new l({vertexShader:Me,fragmentShader:Ne+(i?Pe:``)+e+Fe,uniforms:{...t,...n,uTangentSign:{value:r}}}),o={};for(let[e,t]of Object.entries(Ue))o[e]=i(t,n,1,!0),o[e].name=`front-${e}`;let s=i(Ve,{uBackCol:{value:null},uBackMask:{value:null},uMaskTexel:{value:new a(1/1024,1/1408)}},-1);s.name=`back`;let c=i(He,{uStyle:{value:0},uBackTint:{value:new d(.02,.025,.025)}});return c.name=`edge`,{shared:t,card:n,fronts:o,back:s,edge:c}}var Ke=null,qe=null,Je=new d(1,1,1),Ye=new Map;function Xe(){return Ke||=O(),Ke}var Ze=Promise.resolve(),Qe=()=>new Promise(e=>requestAnimationFrame(e));function $e(e,t){let n=async()=>{for(let n of t)n&&(document.hidden||await Qe(),e.initTexture(n))};return Ze=Ze.then(n,n),Ze}function et(e,t){let n=`${e.id}:${e.print??``}`,r=Ye.get(n);if(r)return r;let i=(async()=>{let{art:n,map:r,zones:i,info:a}=await ce(`/cards-redesign-mock/cards/${e.id}.webp`,e.id).catch(()=>{throw Error(`could not load ${e.id}`)});n.anisotropy=Math.min(8,t.capabilities.getMaxAnisotropy());let o=e.print==null?null:je(x(e));return await $e(t,[n,r,i,o]),{art:n,map:r,zones:i,info:a,stamp:o}})();return i.catch(()=>Ye.delete(n)),Ye.set(n,i),i}var tt=class{renderer;mats;geometry;mesh;group;current;accentTarget;style;constructor(n){this.renderer=n,this.mats=Ge(Xe()),qe||=f(),this.geometry=qe,this.mesh=new e(this.geometry,[this.mats.fronts.common,this.mats.back,this.mats.edge]),this.group=new t,this.group.add(this.mesh),this.current=null,this.accentTarget=new d(1,1,1);let r=Oe();this.mats.back.uniforms.uBackCol.value=r.color,this.mats.back.uniforms.uBackMask.value=r.mask,this.mats.edge.uniforms.uBackTint.value.setRGB(...r.edgeTint)}get shared(){return this.mats.shared}load(e){return et(e,this.renderer)}async show(e){let t=await this.load(e),n=this.mats.card;n.uArt.value=t.art,n.uMap.value=t.map,n.uStamp.value=t.stamp,n.uZones.value=t.zones,n.uDepthOn.value=+!!t.info.depthOn;let r=t.info.outline,i=m/320,a=e=>Math.max(0,Math.min(e,6)-1)*i;n.uOutline.value.set(a(r.cut.l),a(r.cut.b),a(r.cut.r),a(r.cut.t)),n.uPaintR.value=Math.min(r.radius,30)*i,n.uStampRect.value.set(...t.info.stamp);let o=S[e.rarity];this.mesh.material[0]=this.mats.fronts[o.id],this.mats.edge.uniforms.uStyle.value=o.index,this.accentTarget.setRGB(...o.linear),this.mats.shared.uAccent.value.copy(this.accentTarget),this.current=e,this.style=o.index}conceal(e){this.mats.edge.uniforms.uStyle.value=e?0:this.style??0,this.mats.shared.uAccent.value.copy(e?Je:this.accentTarget)}async warmUp(t,{extra:n=[],target:r=null}={}){let i=this.renderer,a=new p;for(let t of Object.values(this.mats.fronts))a.add(new e(this.geometry,[t,this.mats.back,this.mats.edge]));for(let e of n)a.add(e);a.traverse(e=>{e.frustumCulled=!1});let o=i.getRenderTarget();i.setRenderTarget(r);let s=i.compileAsync?i.compileAsync(a,t):i.compile(a,t);if(i.setRenderTarget(o),await s,!r)return;let c=r.clone();c.setSize(8,8),i.setRenderTarget(c),i.render(a,t),i.setRenderTarget(o),c.dispose()}};export{Ne as a,We as i,et as n,k as o,Xe as r,tt as t};