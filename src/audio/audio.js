import { settings } from "../settings.js";

// Sound for the pack screen: named events, each played from public/audio/<file> when that file
// exists, and silent when it doesn't (no synth stand-ins). public/audio/manifest.json lists every
// event: file, ideal length, whether it loops, its bus and a description for whoever makes it.
//
//   audio.play("tear")                       one-shot
//   audio.play("card-whoosh", { rate: 1.1 }) varied per use
//   audio.loop("card-hover", true / false)   start / stop a loop (faded)
//   audio.unlock()                           on the first user gesture (browsers start muted)
//
// Buses: music, fx, voice -> master. Mute is kept across visits. Nothing piles up: each event
// has a minimum gap and a voice cap, a new sting fades the one before, and the announcer ducks
// music and effects while it speaks. Files are only fetched after the first gesture, so a page
// that never gets one (the screenshot script) makes no requests.

const BASE = `${import.meta.env.BASE_URL}audio/`;
const FADE = 0.12;
const VOICES = ["hype", "warrior", "boss"];
const asked = new URLSearchParams(location.search).get("voice");
const VOICE = VOICES.includes(asked) ? asked : VOICES[0];

export class Audio {
  constructor() {
    this.ctx = null;
    this.manifest = {};
    this.buffers = new Map(); // name -> AudioBuffer | null (missing) | Promise
    this.voices = new Map(); // name -> [{ src, gain, t }]
    this.loops = new Map(); // name -> { src, gain } | "pending"
    this.wantLoops = new Set();
    this.lastPlay = new Map();
    this.muted = settings.muted;
    this.ready = fetch(`${BASE}manifest.json`)
      .then((r) => (r.ok ? r.json() : { events: {} }))
      .then((m) => {
        this.manifest = m.events ?? {};
      })
      .catch(() => {});
  }

  get unlocked() {
    return !!this.ctx && this.ctx.state === "running";
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(ctx.destination);
    this.bus = {};
    for (const [name, level] of [["music", 0.45], ["fx", 0.9], ["voice", 1]]) {
      const g = ctx.createGain();
      g.gain.value = level;
      g.connect(this.master);
      this.bus[name] = g;
      g.level = level;
    }
    // fetch everything once, in the background
    this.ready.then(() => {
      for (const name of Object.keys(this.manifest)) this.buffer(name);
      for (const name of this.wantLoops) this.startLoop(name);
    });
  }

  setMuted(m) {
    this.muted = m;
    settings.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.04);
  }

  buffer(name) {
    if (this.buffers.has(name)) return this.buffers.get(name);
    const ev = this.manifest[name];
    if (!ev || !this.ctx) return null;
    // announcer lines exist once per voice, picked with ?voice=
    const path = ev.bus === "voice" ? `voices/${VOICE}/${ev.file}` : ev.file;
    const p = fetch(BASE + path)
      .then((r) => {
        const type = r.headers.get("content-type") || "";
        // a dev server's index.html fallback is not a sound
        if (!r.ok || type.includes("text/html")) return null;
        return r.arrayBuffer().then((b) => this.ctx.decodeAudioData(b));
      })
      .catch(() => null)
      .then((buf) => {
        this.buffers.set(name, buf);
        return buf;
      });
    this.buffers.set(name, p);
    return p;
  }

  // One-shot. Returns nothing; a missing or still-loading file is simply skipped (sounds that
  // arrive late would be out of sync with the picture).
  play(name, { rate = 1, gain = 1, delay = 0 } = {}) {
    if (!this.unlocked) return;
    const ev = this.manifest[name];
    const buf = this.buffers.get(name);
    if (!ev || !buf || buf instanceof Promise) return;
    const now = this.ctx.currentTime;
    const minGap = ev.minGap ?? 0.04;
    if (now - (this.lastPlay.get(name) ?? -1) < minGap) return;
    this.lastPlay.set(name, now);

    const list = (this.voices.get(name) ?? []).filter((v) => v.end > now);
    const max = ev.maxVoices ?? 3;
    while (list.length >= max) this.fadeOut(list.shift());
    // stings replace each other, the newest wins
    if (ev.group) {
      for (const [other, vs] of this.voices) {
        if (other !== name && this.manifest[other]?.group === ev.group) vs.forEach((v) => this.fadeOut(v));
      }
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = this.ctx.createGain();
    g.gain.value = gain * (ev.gain ?? 1);
    src.connect(g).connect(this.bus[ev.bus ?? "fx"]);
    const at = now + delay;
    src.start(at);
    const v = { src, gain: g, end: at + buf.duration / rate };
    list.push(v);
    this.voices.set(name, list);
    if (ev.duck) this.duck(at, buf.duration / rate);
  }

  fadeOut(v) {
    const t = this.ctx.currentTime;
    v.gain.gain.setTargetAtTime(0, t, FADE / 3);
    v.src.stop(t + FADE);
    v.end = t;
  }

  // the announcer speaks over a quieter room
  duck(at, dur) {
    for (const name of ["music", "fx"]) {
      const g = this.bus[name].gain;
      const lvl = this.bus[name].level;
      g.cancelScheduledValues(at);
      g.setTargetAtTime(lvl * 0.45, at, 0.05);
      g.setTargetAtTime(lvl, at + dur, 0.25);
    }
  }

  loop(name, on) {
    if (on) {
      this.wantLoops.add(name);
      this.startLoop(name);
    } else {
      this.wantLoops.delete(name);
      const l = this.loops.get(name);
      if (l && l !== "pending") {
        const t = this.ctx.currentTime;
        l.gain.gain.setTargetAtTime(0, t, 0.15);
        l.src.stop(t + 0.8);
      }
      this.loops.delete(name);
    }
  }

  startLoop(name) {
    if (!this.unlocked || this.loops.has(name)) return;
    const ev = this.manifest[name];
    if (!ev) return;
    this.loops.set(name, "pending");
    Promise.resolve(this.buffer(name)).then((buf) => {
      if (this.loops.get(name) !== "pending" || !this.wantLoops.has(name)) return;
      if (!buf) {
        this.loops.delete(name);
        return;
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const g = this.ctx.createGain();
      g.gain.value = 0;
      g.gain.setTargetAtTime(ev.gain ?? 1, this.ctx.currentTime, 0.2);
      src.connect(g).connect(this.bus[ev.bus ?? "fx"]);
      src.start();
      this.loops.set(name, { src, gain: g });
    });
  }

  // page hidden: everything stops making sound; back: carries on
  suspend(hidden) {
    if (!this.ctx) return;
    if (hidden) this.ctx.suspend();
    else this.ctx.resume();
  }
}
