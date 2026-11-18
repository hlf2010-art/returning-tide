// Music in the world: what plays where, when, and how loud you hear it. Pure (no Web Audio, no DOM);
// world/music.js plays it. Diegetic only: there is no score over the game. What you hear is a shop's own
// speaker, a café's playlist, a driver's radio, the way Shanghai actually sounds: the Manner on Hankou
// Road plays a low-key playlist all day, the stores on Nanjing Road push something brighter out of their
// doors while they are open, a DiDi driver has the radio on.
//
// The tracks: modern instrumentals their composers put in the public domain (CC0 1.0) on OpenGameArt:
// no licence conditions and no royalties, free to ship in the game. Each was checked on its own page
// (18 Nov 2026): CC0 the only licence; an original composition (one candidate, a re-arrangement of
// Coltrane's "Giant Steps", was left out: a CC0 on an arrangement does not clear the tune). They are credited
// anyway, as a courtesy (Settings, and docs/music.md). Levelled to -18 LUFS, mono, 80 kbps (public/music/).
// Local Shanghai and Chinese artists are being asked for permission (Notion: the request letter); their
// tracks join these playlists as permission comes in.
const OGA = (slug) => `https://opengameart.org/content/${slug}`;
export const TRACKS = {
  chill:     { title: 'Chill lofi inspired', artist: 'omfgdude', page: OGA('chill-lofi-inspired'), file: 'chill-lofi-inspired.mp3', secs: 123 },
  jam:       { title: 'Funky Hip Hop Lofi Jam', artist: 'omfgdude', page: OGA('funky-hip-hop-lofi-jam'), file: 'funky-hip-hop-lofi-jam.mp3', secs: 189 },
  mocha:     { title: 'Mocha Frapp', artist: 'Pro Sensory', page: OGA('mocha-frapp'), file: 'mocha-frapp.mp3', secs: 130 },
  stride:    { title: 'Slow Stride', artist: 'isaiah658', page: OGA('slow-stride'), file: 'slow-stride.mp3', secs: 131 },
  lofi:      { title: 'lofi Compilation', artist: 'TAD', page: OGA('lofi-compilation'), file: 'lofi-compilation.mp3', secs: 169 },
  disco:     { title: 'Funky Disco Beats to Boogie/Woogie to', artist: 'Fupi', page: OGA('funky-disco-beats-to-boogiewoogie-to'), file: 'funky-disco-beats.mp3', secs: 133 },
  garden:    { title: 'Rhythm Garden', artist: 'congusbongus', page: OGA('rhythm-garden'), file: 'rhythm-garden.mp3', secs: 207 },
  wednesday: { title: 'Wednesday Night [Funk Fusion]', artist: 'Zane Little Music', page: OGA('wednesday-night-funk-fusion'), file: 'wednesday-night.mp3', secs: 177 },
  redmoon:   { title: 'Red Moon', artist: 'Pro Sensory', page: OGA('red-moon'), file: 'red-moon.mp3', secs: 138 },
  djfunk:    { title: 'DJ Synth Wave / Funk', artist: 'Pro Sensory', page: OGA('dj-synth-wave-funk'), file: 'dj-synth-wave-funk.mp3', secs: 297 },
  midnight:  { title: 'After midnight', artist: 'dant-e', page: OGA('after-midnight'), file: 'after-midnight.mp3', secs: 454 },
  void:      { title: 'Melancholic Void', artist: 'Gena Sealov', page: OGA('melancholic-void'), file: 'melancholic-void.mp3', secs: 182 },
  undefined: { title: 'Undefined Emotion', artist: 'Gena Sealov', page: OGA('undefined-emotion'), file: 'undefined-emotion.mp3', secs: 146 },
  jamie:     { title: 'Jamie', artist: 'lifeasaghost', page: OGA('jamie'), file: 'jamie.mp3', secs: 140 },
};
export const LICENCE = { name: 'CC0 1.0', url: 'https://creativecommons.org/publicdomain/zero/1.0/' };
export const credit = (id) => { const t = TRACKS[id]; return `“${t.title}” by ${t.artist} (${t.page}), dedicated to the public domain (${LICENCE.name}, ${LICENCE.url})`; };

export const PLAYLISTS = {
  cafe: ['chill', 'mocha', 'stride', 'jam', 'lofi'],                 // low-key: a takeaway coffee window
  shop: ['disco', 'wednesday', 'garden', 'redmoon', 'djfunk'],       // brighter, pushed out of a store's door
  radio: ['midnight', 'void', 'jamie', 'undefined'],                 // a driver's evening station
};

const H = (h, m = 0) => h * 60 + m;
// where, and how each place is heard. ref / max: metres at which it is at full level and at nothing;
// level: the speaker's own loudness (a café's playlist is quiet, a shop door is not); hours: the share of
// that level at minute-of-day m (0 = off)
export const VENUES = [
  // Manner, Hankou Road (world/layout.js manner: x -77.3, the window at z -6.48): the speaker inside the
  // takeaway window. The shop has no closing time in the game (world/baristas.js), so neither has its
  // playlist; between one and seven in the morning it is turned down.
  { id: 'manner', playlist: 'cafe', x: -77.3, y: 2.2, z: -6.1, ref: 2.5, max: 24, level: 0.32, hours: (m) => (m >= H(1) && m < H(7) ? 0.45 : 1) },
  // two stores on Nanjing Road East (the pedestrian street, z -212 to -190; world/nanjingRoad.js has
  // generic shopfronts both sides): a door on the north side between Sichuan and Jiangxi roads, one on the
  // south side between Jiangxi and Henan roads. Open 10:00-22:00 like the street's shops (todState.shops).
  { id: 'nj-north', playlist: 'shop', x: -338, y: 3.2, z: -190.6, ref: 4, max: 42, level: 0.42, hours: (m) => (m >= H(10) && m < H(22) ? 1 : 0) },
  { id: 'nj-south', playlist: 'shop', x: -452, y: 3.2, z: -211.4, ref: 4, max: 42, level: 0.42, hours: (m) => (m >= H(10) && m < H(22) ? 1 : 0), offset: 97 },
  // the DiDi driver's radio: in the car, not placed in the street (world/rideFlow.js)
  { id: 'radio', playlist: 'radio', cabin: true, level: 0.28, hours: () => 1, offset: 41 },
];

// what a playlist is playing `secs` into its loop (it runs in real time, like a real shop's, whether or not
// anyone is there to hear it): the track and how far into it
export function trackAt(playlist, secs, available = null) {
  const ids = PLAYLISTS[playlist].filter((id) => !available || available.has(id));
  if (!ids.length) return null;
  const total = ids.reduce((s, id) => s + TRACKS[id].secs, 0);
  let t = ((secs % total) + total) % total;
  for (const id of ids) { if (t < TRACKS[id].secs) return { id, offset: t }; t -= TRACKS[id].secs; }
  return { id: ids[0], offset: 0 };
}

// how loud a venue is for someone `dist` metres away: its level, by the hour, falling off between ref and
// max (an inverse-square-ish curve that reaches zero at max), less through a wall (inside: 0..1)
export function gainAt(v, dist, minute, inside = 0) {
  const h = v.hours(((minute % 1440) + 1440) % 1440);
  if (!h) return 0;
  if (v.cabin) return v.level * h;
  if (dist >= v.max) return 0;
  const near = dist <= v.ref ? 1 : v.ref / dist;                 // 1 at the speaker, halves as distance doubles
  const edge = 1 - Math.max(0, (dist - v.max * 0.6) / (v.max * 0.4));   // and fades out over the last 40 %
  return v.level * h * near * Math.max(0, edge) * (1 - 0.75 * inside);
}
// how muffled (a low-pass cut-off, Hz): through a doorway from down the street, or from outside a building
export const cutoffAt = (v, dist, inside = 0) => (v.cabin ? 7500 : Math.max(900, 16000 - dist * 260) * (1 - 0.8 * inside) + 400);
