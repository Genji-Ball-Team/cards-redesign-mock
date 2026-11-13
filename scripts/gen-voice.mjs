// Generates the announcer takes with ElevenLabs text-to-speech: one file per
// voice and tier in public/audio/voices/<voice>/announce-<tier>.mp3.
//
//   node scripts/gen-voice.mjs <key file> [voice ...] [--force]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const [keyFile, ...rest] = process.argv.slice(2);
const force = rest.includes('--force');
const only = rest.filter((a) => !a.startsWith('--'));
const key = readFileSync(keyFile, 'utf8').trim();
const dir = new URL('../public/audio/voices/', import.meta.url);

const VOICES = {
  hype: 'IKne3meq5aSn9XLyUdCD', // Charlie: deep, confident, energetic
  warrior: 'SOYHLrjzK2X1ezoPC6cr', // Harry: fierce, rough
  boss: 'pNInz6obpgDQGcFmaJgB', // Adam: dominant, firm
};

const LINES = {
  epic: '[excited] Epic!',
  legendary: '[shouting, triumphant] Legendaryyy!',
  mythic: '[awed, low] Mythic... [shouting] MYTHIC!',
};

for (const [voice, voiceId] of Object.entries(VOICES)) {
  if (only.length && !only.includes(voice)) continue;
  mkdirSync(new URL(`${voice}/`, dir), { recursive: true });
  for (const [tier, text] of Object.entries(LINES)) {
    const out = new URL(`${voice}/announce-${tier}.mp3`, dir);
    if (existsSync(out) && !force) {
      console.log(`keep  ${voice} ${tier}`);
      continue;
    }
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: { 'xi-api-key': key, 'content-type': 'application/json' },
        body: JSON.stringify({ text, model_id: 'eleven_v3' }),
      },
    );
    if (!response.ok) {
      console.log(`FAIL  ${voice} ${tier} ${response.status} ${(await response.text()).slice(0, 300)}`);
      continue;
    }
    writeFileSync(out, Buffer.from(await response.arrayBuffer()));
    console.log(`made  ${voice} ${tier}`);
  }
}
