// Levels the raw generated sounds in audio-src/ into public/audio/ (needs ffmpeg).
// The generator returns every file at full scale, whatever it is; here each one
// gets its place in the mix: a quiet bed, soft touches, and only the big pulls loud.
//
//   node scripts/master-audio.mjs
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const src = fileURLToPath(new URL('../audio-src/', import.meta.url));
const out = fileURLToPath(new URL('../public/audio/', import.meta.url));

// mean / peak: the level the file ends up at (dBFS), whichever is reached first.
// lowpass takes the hiss and edge off; cut shortens a file the generator padded.
const MIX = {
  'music-stage': { mean: -29, peak: -12, loop: true },
  'card-hover': { mean: -40, peak: -20, loop: true },
  'pack-shimmer': { mean: -36, peak: -16, lowpass: 9000 },
  'pack-tap': { mean: -32, peak: -12 },
  tension: { mean: -30, peak: -10, lowpass: 9000 },
  tear: { mean: -27, peak: -8, lowpass: 8000 },
  burst: { mean: -27, peak: -8, lowpass: 9000 },
  'card-whoosh': { mean: -31, peak: -11, lowpass: 9000 },
  'card-land': { mean: -32, peak: -11, cut: 0.25 },
  'flip-common': { mean: -31, peak: -11, lowpass: 9000, cut: 0.4 },
  'flip-rare': { mean: -29, peak: -10, lowpass: 9000 },
  'flip-epic': { mean: -27, peak: -9, lowpass: 9000 },
  'flip-legendary': { mean: -26, peak: -7 },
  'flip-mythic': { mean: -24, peak: -6 },
  'sting-rare': { mean: -31, peak: -12 },
  'sting-epic': { mean: -27, peak: -10 },
  'sting-legendary': { mean: -24, peak: -8, lowpass: 10000 },
  'sting-mythic': { mean: -23, peak: -7 },
  'announce-mythic': { mean: -22, peak: -6, hall: true },
  collect: { mean: -30, peak: -11, lowpass: 9000 },
};

function master(from, to, name) {
  const mix = MIX[name];
  const shape = [];
  // no silence before the sound (it would land late against the picture) or after it
  if (!mix.loop) {
    shape.push(
      'silenceremove=start_periods=1:start_threshold=-45dB',
      'silenceremove=stop_periods=1:stop_duration=0.08:stop_threshold=-55dB',
    );
  }
  if (mix.cut) shape.push(`atrim=0:${mix.cut}`);
  if (mix.lowpass) shape.push(`lowpass=f=${mix.lowpass}`);
  if (mix.hall) shape.push('apad=pad_dur=0.5', 'aecho=0.8:0.5:70|130:0.22|0.14');

  // ffmpeg writes the volumedetect report to stderr
  const report = spawnSync(
    'ffmpeg',
    ['-hide_banner', '-nostats', '-i', from, '-af', [...shape, 'volumedetect'].join(','), '-f', 'null', '-'],
    { encoding: 'utf8' },
  ).stderr;
  const level = (key) => Number(new RegExp(`${key}: (-?[0-9.]+)`).exec(report)?.[1]);
  const gain = Math.min(mix.mean - level('mean_volume'), mix.peak - level('max_volume'));
  if (!Number.isFinite(gain)) throw new Error(`no level for ${name}`);

  const chain = [...shape, `volume=${gain.toFixed(1)}dB`];
  // short fades at both ends, so nothing starts or stops with a click
  if (!mix.loop) chain.push('afade=t=in:d=0.004', 'areverse', 'afade=t=in:d=0.05', 'areverse');
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', from, '-af', chain.join(','), '-ar', '44100', '-b:a', '128k', to]);
  console.log(`${name.padEnd(16)} ${gain.toFixed(1).padStart(6)} dB  ${to.slice(out.length)}`);
}

for (const name of Object.keys(MIX)) {
  if (name === 'announce-mythic' || name === 'music-stage') continue;
  const from = `${src}${name}.mp3`;
  if (existsSync(from)) master(from, `${out}${name}.mp3`, name);
  else console.log(`${name.padEnd(16)} no source`);
}
// the background tracks to choose from, all levelled as the music bed
const music = `${src}music/`;
if (existsSync(music)) {
  mkdirSync(`${out}music`, { recursive: true });
  for (const file of readdirSync(music)) master(`${music}${file}`, `${out}music/${file}`, 'music-stage');
}
const voices = `${src}voices/`;
if (existsSync(voices)) {
  for (const voice of readdirSync(voices)) {
    mkdirSync(`${out}voices/${voice}`, { recursive: true });
    master(`${voices}${voice}/announce-mythic.mp3`, `${out}voices/${voice}/announce-mythic.mp3`, 'announce-mythic');
  }
}
