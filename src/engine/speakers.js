// Music in the world: what plays where, when, and how loud you hear it. Pure (no Web Audio, no DOM);
// world/music.js plays it. Diegetic only: there is no score over the game. What you hear is a shop's own
// speaker, a café's playlist, a driver's radio, the way Shanghai actually sounds: the Manner on Hankou
// Road plays a low-key playlist all day, the stores on Nanjing Road push something brighter out of their
// doors while they are open, a DiDi driver has the radio on.
//
// The tracks: modern instrumentals released by their artists under Creative Commons Attribution 3.0 on
// ccMixter (each checked on its own upload record, 18 Nov 2026). CC BY: free to use and to ship in the
// game, with credit to the artist, a link to the work and the licence (docs/music.md, and in the game:
// Settings). The files go in public/music/ under `file`; any that are missing are simply skipped, so
// nothing plays rather than anything breaking. Local Shanghai and Chinese artists are being asked for
// permission (Notion: the request letter); their tracks join these playlists as permission comes in.
export const TRACKS = {
  nightwalk:  { title: 'nightWalk', artist: 'airtone', page: 'https://ccmixter.org/files/airtone/56520', file: 'airtone-nightwalk.mp3', source: 'airtone_-_nightWalk.mp3', secs: 280 },
  purple:     { title: 'Purple Nurple', artist: 'Alex Beroza', page: 'https://ccmixter.org/files/AlexBeroza/27187', file: 'alexberoza-purple-nurple.mp3', source: 'AlexBeroza_-_Purple_Nurple.mp3', secs: 191 },
  shiro:      { title: 'Shiro (Kirkoid Mix)', artist: 'Kirkoid', page: 'https://ccmixter.org/files/Kirkoid/43938', file: 'kirkoid-shiro.mp3', source: 'Kirkoid_-_Shiro_(Kirkoid_Mix)_1.mp3', secs: 123 },
  rain:       { title: 'Reflections in the Rain', artist: 'Mana Junkie', page: 'https://ccmixter.org/files/mana_junkie/34419', file: 'manajunkie-reflections-in-the-rain.mp3', source: 'mana_junkie_-_Reflections_in_the_Rain.mp3', secs: 233 },
  tube:       { title: 'Warm Vacuum Tube', artist: 'Admiral Bob', page: 'https://ccmixter.org/files/admiralbob77/59533', file: 'admiralbob-warm-vacuum-tube.mp3', source: 'admiralbob77_-_Warm_Vacuum_Tube_.mp3', secs: 213 },
  emerge:     { title: 'Emerge', artist: 'Alex Beroza', page: 'https://ccmixter.org/files/AlexBeroza/30132', file: 'alexberoza-emerge.mp3', source: 'AlexBeroza_-_Emerge.mp3', secs: 226 },
  toronto:    { title: 'Toronto Is My Beat', artist: 'Whitewolf', page: 'https://ccmixter.org/files/Whitewolf225/60181', file: 'whitewolf-toronto-is-my-beat.mp3', source: 'Whitewolf225_-_Toronto_Is_My_Beat.mp3', secs: 202 },
  nightcall:  { title: 'The night is calling', artist: 'Kraftamt', page: 'https://ccmixter.org/files/Karstenholymoly/62739', file: 'kraftamt-the-night-is-calling.mp3', source: 'Karstenholymoly_-_The_night_is_calling.mp3', secs: 214 },
  renovation: { title: 'reNovation', artist: 'airtone', page: 'https://ccmixter.org/files/airtone/60674', file: 'airtone-renovation.mp3', source: 'airtone_-_reNovation_1.mp3', secs: 211 },
};
export const LICENCE = { name: 'CC BY 3.0', url: 'https://creativecommons.org/licenses/by/3.0/' };
export const credit = (id) => { const t = TRACKS[id]; return `“${t.title}” by ${t.artist} (${t.page}), licensed under ${LICENCE.name} (${LICENCE.url})`; };

export const PLAYLISTS = {
  cafe: ['nightwalk', 'rain', 'shiro', 'purple'],          // low-key: a takeaway coffee window
  shop: ['tube', 'emerge', 'toronto'],                     // brighter, pushed out of a store's door
  radio: ['nightcall', 'renovation', 'nightwalk', 'emerge'], // a driver's evening station
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
