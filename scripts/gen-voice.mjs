// Generates the announcer takes with ElevenLabs text-to-speech. Only a mythic
// is announced: one raw file per voice in audio-src/voices/<voice>/announce-mythic.mp3.
// Run master-audio.mjs afterwards to level them into public/audio.
//
//   node scripts/gen-voice.mjs <key file> [voice ...] [--force]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const [keyFile, ...rest] = process.argv.slice(2);
const force = rest.includes('--force');
const only = rest.filter((a) => !a.startsWith('--'));
const key = readFileSync(keyFile, 'utf8').trim();
const dir = new URL('../audio-src/voices/', import.meta.url);

const VOICES = {
  brian: 'nPczCjzI2devNBz1zQrb', // deep, resonant
  george: 'JBFqnCBsd6RMkjVDRZzb', // warm British storyteller
  callum: 'N2lVS1w4EtoT3dr4eOWO', // husky, unsettling
  lily: 'pFZP5JQG7iQjIQuC4Bku', // velvety British
};

// said quietly: the room has gone dark, nobody shouts
const LINE = '[quietly, slow, in awe] Mythic.';

for (const [voice, voiceId] of Object.entries(VOICES)) {
  if (only.length && !only.includes(voice)) continue;
  mkdirSync(new URL(`${voice}/`, dir), { recursive: true });
  const out = new URL(`${voice}/announce-mythic.mp3`, dir);
  if (existsSync(out) && !force) {
    console.log(`keep  ${voice}`);
    continue;
  }
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'xi-api-key': key, 'content-type': 'application/json' },
      body: JSON.stringify({ text: LINE, model_id: 'eleven_v3' }),
    },
  );
  if (!response.ok) {
    console.log(`FAIL  ${voice} ${response.status} ${(await response.text()).slice(0, 300)}`);
    continue;
  }
  writeFileSync(out, Buffer.from(await response.arrayBuffer()));
  console.log(`made  ${voice}`);
}
