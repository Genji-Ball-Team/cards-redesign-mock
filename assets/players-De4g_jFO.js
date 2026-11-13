import{a as e,d as t,i as n,l as r,n as i,o as a,r as o,w as s}from"./index-J3lP8W1Y.js";import{n as c,t as l}from"./players-Cjq-Relx.js";import{a as u,c as d,i as f,n as p,r as m,t as h}from"./tiles-Bk9c6msT.js";import{t as g}from"./rooms-BNkw98pp.js";import{a as _,n as v}from"./icons-B4UciC06.js";var y=i.length,b=[[`daily`,`Daily`],[`starter`,`Starter`],[`epic`,`Epic`],[`legendary`,`Legendary`],[`mythic`,`Mythic`],[`bonus`,`Bonus`]],x=`<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2h8l3 4-7 8-7-8z" fill="currentColor" opacity=".9"/><path d="M1 6h14M5.5 6 8 14l2.5-8M4 2l1.5 4L8 2l2.5 4L12 2" fill="none" stroke="oklch(20% 0.02 210 / .45)" stroke-width=".8"/></svg>`,S=(e,t)=>e.avatar?`<img class="${t}" src="${a(e.avatar)}" alt="" width="64" height="64" loading="lazy" decoding="async">`:`<span class="${t} is-initial" aria-hidden="true">${a((e.username.trim()[0]??`?`).toUpperCase())}</span>`,C=e=>e.toLocaleString(`en-US`);function w(w){let{audio:E}=w;return g(w,`players`,!0,g=>{g.body.innerHTML=`
      <section class="pl-list">
        <header class="rhead">
          <h1 class="rtitle">Players</h1>
          <p class="rsub gb-num pl-stats" aria-live="polite"></p>
        </header>
        <div class="pl-tools">
          <label class="pl-search">${T}<input type="search" placeholder="Search players" aria-label="Search players" autocomplete="off" spellcheck="false"></label>
          <div class="seg" role="group" aria-label="Sort">
            <button type="button" data-sort="cards" aria-pressed="true">Most cards</button>
            <button type="button" data-sort="packs" aria-pressed="false">Most packs opened</button>
          </div>
        </div>
        <ol class="pl-rows"></ol>
        <p class="rempty-line pl-none" hidden></p>
      </section>
      <section class="pl-one" hidden></section>`;let w=e=>g.body.querySelector(e),D=w(`.pl-list`),O=w(`.pl-one`),k=w(`.pl-rows`),A=w(`.pl-stats`),j=w(`.pl-none`),M=w(`.pl-search input`),N=`cards`,P=``,F=null,I=0,L=!0;s.subscribe(()=>L=!0);function R(){let e=c().players,t=P.trim().toLowerCase(),n=N===`packs`?[...e].sort((e,t)=>t.packs.total-e.packs.total||t.total-e.total||e.username.localeCompare(t.username)):e,r=new Map(n.map((e,t)=>[e.id,t+1])),i=n.filter(e=>!t||e.username.toLowerCase().includes(t));A.textContent=t?`${i.length} of ${e.length} players`:`${e.length} players`,j.hidden=i.length>0,j.textContent=e.length?`No players match that name.`:`Nobody here yet.`,k.innerHTML=i.map(e=>{let t=r.get(e.id)??0,n=[..._].reverse().filter(t=>t.id!==`common`&&e.byRarity[t.id]>0).map(t=>`<span class="rpill r-${t.id}" title="${t.label}">${e.byRarity[t.id]} ${t.label[0]}</span>`).join(``);return`<li><a class="pl-row${e.isMe?` is-me`:``}${t<=3?` is-top is-top-${t}`:``}" href="#/players/${e.id}">
            <span class="pl-rank gb-num">${t}</span>
            ${S(e,`pl-av`)}
            <span class="pl-main">
              <span class="pl-name"><span class="pl-name-t">${a(e.username)}</span>${e.isMe?`<span class="you">You</span>`:``}</span>
              <span class="pl-line gb-num"><span><b>${e.total}</b> / ${y} cards</span><span class="pl-dot"></span><span class="pl-gems">${x}${C(e.gems)}</span><span class="pl-dot"></span><span title="Packs opened">${C(e.packs.total)} packs</span></span>
              <span class="pbar" aria-hidden="true"><i style="transform:scaleX(${e.total/y})"></i></span>
              ${n?`<span class="pl-pills">${n}</span>`:``}
            </span>
          </a></li>`}).join(``)}M.addEventListener(`input`,()=>{P=M.value,R()}),w(`.seg`).addEventListener(`click`,e=>{let t=e.target.closest(`button[data-sort]`);if(t&&t.dataset.sort!==N){N=t.dataset.sort;for(let e of w(`.seg`).querySelectorAll(`button`))e.setAttribute(`aria-pressed`,String(e===t));E.play(`card-land`,{gain:.3,rate:1.25}),R()}});let z=[],B=!1,V=m(()=>{E.play(`card-land`,{gain:.3,rate:1.25}),W()}),H=()=>V.value===`all`?z:z.filter(e=>e.rarity===V.value);function U(n){let r=l(n);if(`error`in r){O.innerHTML=`<a class="pl-back" href="#/players">${v.back}<span>All players</span></a><p class="rempty-line">${a(r.error)}</p>`,z=[];return}let s=r.player;z=o(i.filter(e=>r.owned[t(e)]));let c=b.filter(([e])=>s.packs[e]>0).map(([e,t])=>`<span class="kpill k-${e}">${t} <b class="gb-num">${C(s.packs[e])}</b></span>`).join(``);O.innerHTML=`
        <a class="pl-back" href="#/players">${v.back}<span>All players</span></a>
        <header class="pl-hero${s.isMe?` is-me`:``}">
          ${S(s,`pl-hero-av`)}
          <div class="pl-hero-t">
            <h1 class="rtitle pl-hero-name">${a(s.username)}${s.isMe?` <span class="you-p">(you)</span>`:``}</h1>
            <p class="pl-hero-line gb-num"><span><b>${s.total}</b> / ${y} cards collected</span><span class="pl-gems">${x}${C(s.gems)}</span></p>
            <span class="pbar" aria-hidden="true"><i style="transform:scaleX(${s.total/y})"></i></span>
          </div>
        </header>
        <div class="pl-packs"><p class="pl-packs-n gb-num"><b>${C(s.packs.total)}</b> packs opened</p>${c?`<div class="pl-kinds">${c}</div>`:``}</div>
        <div class="rbar is-dock"></div>
        <div class="pl-grid"></div>`,O.querySelector(`.rbar`).append(V.el),V.set(`all`);let u=e(z),d=_.filter(e=>u[e.id]>0).length;V.el.hidden=d<2,V.render(u,z.length),O.dataset.me=String(s.isMe),W()}function W(){let e=O.querySelector(`.pl-grid`);if(!e||!F)return;let n=O.dataset.me===`true`;if(!z.length){e.innerHTML=`<p class="rempty-line">${n?`You haven't`:`They haven't`} pulled any cards yet.</p>`;return}let a=F,o=s.collection().owned;e.innerHTML=f(H(),e=>{let i=o[t(e)],s=i&&e.rarity===`mythic`?r(i.serial):null;return d(e,{href:`#/players/${a}/${encodeURIComponent(e.id)}`,lit:!0,state:n?{text:``,kind:`none`,serial:s}:u(!!i,s),srText:n?``:h})},{note:e=>p(z.filter(t=>t.rarity===e).length,i.filter(t=>t.rarity===e).length,`collected`)})}O.addEventListener(`click`,e=>{e.target.closest(`a.pl-back`)&&B&&(e.preventDefault(),history.back())});let G=e=>{let r=s.collection().owned;return{list:H(),owned:e=>{let i=n(e);return i?r[t(i)]?.serial??null:null},hrefFor:t=>`#/players/${e}/${encodeURIComponent(t)}`,backHref:`#/players/${e}`,backLabel:(()=>{let t=l(e);return`error`in t?`Player`:t.player.isMe?`You`:t.player.username})()}};return{sync(e){let t=e[0]??null,n=!D.hidden&&F===null;if(t!==F||L){t&&!F&&(I=g.scroll.scrollTop);let e=t===F;F=t,t?(e||(B=n),U(t)):R(),t&&L&&R(),L=!1,D.hidden=!!t,O.hidden=!t,e||(g.scroll.scrollTop=t?0:I)}},viewerFor(e){let t=e[0],r=e[1]?n(e[1]):void 0;return!t||!r||!z.some(e=>e.id===r.id||e.evolvesTo===r.id)?null:{id:r.id,ctx:G(t)}}}})}var T=`<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="m16 16 4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;export{w as createPlayersScreen};