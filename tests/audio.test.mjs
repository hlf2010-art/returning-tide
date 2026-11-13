// Pure rules behind the soundscape (the graph itself is checked in the browser: tools/audiotest.mjs).
import { footSurface, FOOT_SURFACES, duckGain, DUCK_DB, airCutoff, tyreLevel } from '../src/engine/audio.js';
import { surfaceAt, L } from '../src/world/layout.js';

let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };

const kinds = new Set();
for (let x = -90; x <= 25; x += 0.5) for (let z = -59; z <= 94; z += 1.5) kinds.add(footSurface(surfaceAt(x, z)));
ok(FOOT_SURFACES.length === 2 && [...kinds].every((k) => FOOT_SURFACES.includes(k)) && kinds.size === 2, `footsteps use exactly two surfaces across the map (${[...kinds].join(', ')})`);
ok(footSurface(surfaceAt(-16, 20)) === 'asphalt' && footSurface(surfaceAt(-31, 20)) === 'stone' && footSurface(surfaceAt(15, 0)) === 'stone' && footSurface(surfaceAt(5, 0)) === 'stone', 'road = asphalt; pavement, stair and deck = stone');
const dbAt = (l) => 20 * Math.log10(duckGain(l));
ok(Math.abs(dbAt(0)) < 1e-9 && Math.abs(dbAt(1) - DUCK_DB) < 1e-9 && dbAt(5) === dbAt(1) && dbAt(-1) === 0, `duck spans 0 to ${DUCK_DB} dB and never goes further (never silent)`);
let mono = true; for (let l = 0; l < 1; l += 0.05) if (duckGain(l + 0.05) > duckGain(l)) mono = false;
ok(mono, 'more speech, more ducking (monotonic)');
ok(airCutoff(1) > 15000 && airCutoff(100) < 4000 && airCutoff(400) >= 600 && airCutoff(50) > airCutoff(150), `distance dulls the top end (${airCutoff(10).toFixed(0)} Hz at 10 m, ${airCutoff(100).toFixed(0)} Hz at 100 m)`);
ok(tyreLevel(0) === 0 && tyreLevel(6) < tyreLevel(12) && tyreLevel(12) === 1 && tyreLevel(30) === 1, 'tyre noise: silent at rest, rising with speed, capped');
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
