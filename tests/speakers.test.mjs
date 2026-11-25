// Music in the world (src/engine/speakers.js): what plays where, when, and how loud.   node tests/speakers.test.mjs
import { TRACKS, PLAYLISTS, VENUES, LICENCE, credit, trackAt, gainAt, cutoffAt } from '../src/engine/speakers.js';

let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const H = (h, m = 0) => h * 60 + m;
const V = Object.fromEntries(VENUES.map((v) => [v.id, v]));

// the tracks and their credits
const ids = Object.keys(TRACKS), files = ids.map((id) => TRACKS[id].file);
ok(ids.every((id) => TRACKS[id].title && TRACKS[id].artist && /^https:\/\/opengameart\.org\/content\//.test(TRACKS[id].page) && TRACKS[id].secs > 60 && /^[a-z0-9-]+\.mp3$/.test(TRACKS[id].file)), 'every track has a title, an artist, its OpenGameArt page, a length and a plain file name');
ok(!ids.some((id) => /giant steps/i.test(TRACKS[id].title)), 'no arrangement of a copyrighted tune (a CC0 on an arrangement does not clear the composition)');
ok(new Set(files).size === files.length, 'no two tracks share a file');
ok(Object.values(PLAYLISTS).every((p) => p.length >= 3 && p.every((id) => TRACKS[id])), 'every playlist has at least three tracks, all of them known');
ok(LICENCE.url === 'https://creativecommons.org/publicdomain/zero/1.0/' && /“After midnight” by dant-e \(https:\/\/opengameart\.org\/content\/after-midnight\), dedicated to the public domain \(CC0 1\.0/.test(credit('midnight')), 'public domain (CC0): no conditions, but each is credited anyway with its work, artist and link');
ok(VENUES.every((v) => PLAYLISTS[v.playlist]) && VENUES.filter((v) => v.cabin).length === 1, 'every venue has a playlist; one of them is a car radio');

// the schedule: real time, round and round, skipping what isn't there
const cafe = PLAYLISTS.cafe, loop = cafe.reduce((s, id) => s + TRACKS[id].secs, 0);
ok(trackAt('cafe', 0).id === cafe[0] && trackAt('cafe', 0).offset === 0, 'at the start of the loop: the first track, from the top');
ok(trackAt('cafe', TRACKS[cafe[0]].secs + 5).id === cafe[1] && Math.abs(trackAt('cafe', TRACKS[cafe[0]].secs + 5).offset - 5) < 1e-9, 'five seconds after the first ends: five seconds into the second');
ok(trackAt('cafe', loop + 12).id === cafe[0] && Math.abs(trackAt('cafe', loop + 12).offset - 12) < 1e-9 && trackAt('cafe', -3).id === cafe[cafe.length - 1], 'it goes round (and before zero is the end of the loop)');
ok(trackAt('cafe', 0, new Set([cafe[2]])).id === cafe[2] && trackAt('cafe', 999, new Set()) === null, 'a missing file is skipped; with none at all, nothing plays');

// when and how loud
ok(gainAt(V['nj-north'], 5, H(9, 59)) === 0 && gainAt(V['nj-north'], 5, H(10)) > 0 && gainAt(V['nj-north'], 5, H(21, 59)) > 0 && gainAt(V['nj-north'], 5, H(22)) === 0, 'the Nanjing Road shops play while they are open, 10:00 to 22:00');
ok(gainAt(V.manner, 3, H(3)) > 0 && gainAt(V.manner, 3, H(3)) < gainAt(V.manner, 3, H(15)), 'Linger never closes in the game, so its playlist never stops; in the small hours it is turned down');
ok(gainAt(V.manner, 2, H(15)) > gainAt(V.manner, 8, H(15)) && gainAt(V.manner, 8, H(15)) > gainAt(V.manner, 16, H(15)) && gainAt(V.manner, V.manner.max, H(15)) === 0 && gainAt(V.manner, 60, H(15)) === 0, 'it falls away with distance and is gone by its edge');
ok(gainAt(V['nj-south'], 6, H(15), 1) < gainAt(V['nj-south'], 6, H(15), 0) * 0.3, 'through a wall it is a quarter as loud');
ok(cutoffAt(V['nj-south'], 30) < cutoffAt(V['nj-south'], 3) && cutoffAt(V['nj-south'], 3, 1) < cutoffAt(V['nj-south'], 3, 0), 'and duller from down the street, or from indoors');
ok(gainAt(V.radio, 0, H(3)) === gainAt(V.radio, 0, H(15)) && gainAt(V.radio, 0, H(15)) > 0, 'the radio in the car is the same at any hour');
ok(gainAt(V.manner, 1, H(15)) < gainAt(V['nj-north'], 1, H(15)), "a café's playlist is quieter than a store's door");

console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
