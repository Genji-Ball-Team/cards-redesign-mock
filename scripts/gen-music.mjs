// Generates a background track with ElevenLabs Music into audio-src/music/<name>.mp3.
//
//   node scripts/gen-music.mjs <key file> <name> <seconds>
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const [keyFile, name, seconds] = process.argv.slice(2);
const key = readFileSync(keyFile, 'utf8').trim();
const dir = new URL('../audio-src/music/', import.meta.url);

const COMMON =
  'Instrumental only, no vocals. Background music for browsing a trading card collection: relaxed, warm, unobtrusive, steady level with no big drops or loud build-ups. The ending flows back into the beginning so it can repeat.';
const PROMPTS = {
  japan: `A mellow modern beat with Japanese instruments: plucked koto melody, soft shakuhachi flute phrases, gentle taiko accents, over a laid-back hip hop drum groove and warm sub bass, 85 bpm. ${COMMON}`,
  lofi: `Lo-fi hip hop: dusty laid-back drums, warm electric piano chords, soft round bass, a little vinyl crackle, a simple mellow melody, 80 bpm. ${COMMON}`,
};
if (!PROMPTS[name]) throw new Error(`unknown track ${name}`);

const response = await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128', {
  method: 'POST',
  headers: { 'xi-api-key': key, 'content-type': 'application/json' },
  body: JSON.stringify({
    prompt: PROMPTS[name],
    music_length_ms: Number(seconds) * 1000,
    model_id: 'music_v1',
    force_instrumental: true,
  }),
});
if (!response.ok) {
  console.log(`FAIL ${response.status} ${(await response.text()).slice(0, 400)}`);
  process.exit(1);
}
mkdirSync(dir, { recursive: true });
writeFileSync(new URL(`${name}.mp3`, dir), Buffer.from(await response.arrayBuffer()));
console.log(`made ${name} (${seconds}s)`);
