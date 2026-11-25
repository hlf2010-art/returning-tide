// The credits screen (src/ui/credits.js): every licensed thing the game ships is credited.   node tests/credits.test.mjs
import { existsSync, readdirSync } from 'node:fs';
import { CREDITS, creditsHtml } from '../src/ui/credits.js';

let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const by = Object.fromEntries(CREDITS.map((c) => [c.id, c]));
const covers = (path) => CREDITS.some((c) => c.files.some((f) => path === f || path.startsWith(f + '/')));

ok(new Set(CREDITS.map((c) => c.id)).size === CREDITS.length, 'no two credits share an id');
ok(CREDITS.every((c) => c.what.zh && c.what.en && c.who && c.licence.zh && c.licence.en), 'every credit says what, who and the licence, in both languages');
ok(CREDITS.every((c) => [c.url, c.licenceUrl].every((u) => u === null || /^(https:\/\/|\.\/)/.test(u))), 'links are https, or a licence file the game serves itself');
ok(CREDITS.filter((c) => c.licenceUrl?.startsWith('./')).every((c) => existsSync('public/' + c.licenceUrl.slice(2))), 'the licence files it links to are shipped');

// what the licences ask for
ok(by.osm && by.osm.who === '© OpenStreetMap contributors' && /odbl/i.test(by.osm.licence.en), 'OpenStreetMap: "© OpenStreetMap contributors" and the ODbL (its licence requires that wording)');
ok(!by.elevenlabs && !existsSync('tools/voice/eleven.json') && !CREDITS.some((c) => /elevenlabs|non-commercial/i.test(c.who + c.licence.en)), 'nothing shipped is under a non-commercial licence (the ElevenLabs free-plan audio is gone)');
ok(/MattDoesBlender/.test(by['byd-han']?.who) && /changed/i.test(by['byd-han'].who) && /CC BY 4\.0/.test(by['byd-han'].licence.en), 'the BYD Han (CC BY): author, licence, and that it was changed');
ok(/Microsoft/.test(by.rocketbox?.who) && by.rocketbox.licence.en === 'MIT', 'Rocketbox: the MIT copyright line and its licence file');

// nothing licensed ships uncredited
const shipped = [
  'public/models/huracan.glb', 'public/models/cars/byd-han.glb', 'public/ambience/lights-out.mp3', 'public/ambience/murmur.mp3',
  ...['public/ambience/beds', 'public/ambience/pay', 'public/ambience/breath'].flatMap((d) => (existsSync(d) ? readdirSync(d).map((f) => `${d}/${f}`) : [])),
].filter((p) => existsSync(p));
const missing = shipped.filter((p) => !covers(p));
ok(shipped.length > 10 && missing.length === 0, `every shipped model and recorded sound has a credit${missing.length ? ` (missing: ${missing.join(', ')})` : ''}`);
for (const c of CREDITS) for (const f of c.files) ok(existsSync(f), `${c.id}: ${f} exists (a credit for something removed should go too)`);

// the list
const en = creditsHtml('en'), zh = creditsHtml('zh');
ok((en.match(/<li>/g) || []).length === CREDITS.length && /OpenStreetMap contributors/.test(zh) && /全部配音/.test(zh) && !/全部配音/.test(en), 'one item per credit, in the chosen language');
ok(/target="_blank" rel="noopener"/.test(en) && !/<a href="null"/.test(en), 'links open in a new tab; a credit with no link is plain text');

if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log('\nall passed');
