// Generates the effect and music files listed in public/audio/manifest.json
// with the ElevenLabs sound-generation API. Announcer lines are made
// separately (gen-voice.mjs).
//
//   node scripts/gen-audio.mjs <key file> [event ...] [--force]
//
// Existing files are kept unless --force is given.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const [keyFile, ...rest] = process.argv.slice(2);
const force = rest.includes('--force');
const only = rest.filter((a) => !a.startsWith('--'));
const key = readFileSync(keyFile, 'utf8').trim();
// raw files go to audio-src/; master-audio.mjs levels them into public/audio/
const dir = new URL('../audio-src/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('../public/audio/manifest.json', import.meta.url), 'utf8'));

const MIN_SECONDS = 0.5;
const MAX_SECONDS = 30;

for (const [name, event] of Object.entries(manifest.events)) {
  if (event.bus === 'voice') continue;
  if (only.length && !only.includes(name)) continue;
  const out = new URL(event.file, dir);
  if (existsSync(out) && !force) {
    console.log(`keep  ${name}`);
    continue;
  }
  const seconds = Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, event.duration));
  const response = await fetch(
    'https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128',
    {
      method: 'POST',
      headers: { 'xi-api-key': key, 'content-type': 'application/json' },
      body: JSON.stringify({
        text: event.prompt,
        duration_seconds: seconds,
        prompt_influence: 0.5,
        loop: event.loop,
        model_id: 'eleven_text_to_sound_v2',
      }),
    },
  );
  if (!response.ok) {
    console.log(`FAIL  ${name} ${response.status} ${(await response.text()).slice(0, 300)}`);
    continue;
  }
  writeFileSync(out, Buffer.from(await response.arrayBuffer()));
  console.log(`made  ${name} (${seconds}s)`);
}
