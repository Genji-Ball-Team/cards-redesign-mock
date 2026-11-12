// Hand corrections to the per-card zone detection (card/zones.js). Check a card in the dev page
// zones.html (or `node scripts/zones.mjs`) and with `depth-on-<id>` shots, and correct it here
// only where detection is wrong.
//   depth: true / false   force the art-window depth on or off for this card
//   stamp: [x, y]         place the mythic print stamp by hand (top-left, in 320x440 pixels)
//
// Depth is off for these because, although the window was found, something painted straddles
// its edge and gets sliced or shifted when the art sinks (checked at rx=-8 ry=32, 2026-11-12):
export const ZONE_OVERRIDES = {
  "dr-gybbus": { depth: false }, // type-bar medallion clipped, "Dr. Gybbus" plate shifts off the name
  fealthy: { depth: false }, // open top: the subtitle shifts against the name
  fynxa: { depth: false }, // type-bar medallion clipped, smear at the left wall
  god: { depth: false }, // medallion and star badge on the type bar cut by the wall
  ipseity: { depth: false }, // the type bar's upper half disappears under the art
  onikiri: { depth: false }, // "Realm of the Eclipse" bar clipped and smeared
  "prime-baxy": { depth: false }, // "Swedish Musketeers" bar cut along its top, signature slides
  // frame lines not found (busy red border) and every bottom spot is type or flourish: the
  // stamp goes on the dark crowd at the art's lower left, just above the Ability bar
  "shadow-monarch": { stamp: [36, 222] },
};
