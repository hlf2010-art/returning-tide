// Walkthrough: player basics (phase 4.5). The map (M): open, set a waypoint on a place, see it on the
// minimap, walk there and it clears. A gamepad (simulated through the Gamepad API): the stick walks
// and looks, Y opens the phone. Saves: copy to a slot, export a file, import it into another, load a
// slot. First-play tips. The benchmark: a run, a result.
//   URL=http://localhost:4174/ OUT=<dir> NODE_PATH=$(npm root -g) node tools/basicswalk.mjs
import { createRequire } from 'module';
import { readFileSync } from 'fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const url = process.env.URL || 'http://localhost:4174/', out = process.env.OUT || '.';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, acceptDownloads: true });
const p = await ctx.newPage();
const errors = [];
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
p.on('pageerror', (e) => errors.push(e.message));
const boot = async (q) => {
  await p.goto(`${url}?q=3&nolock&lang=en&crowd=0.2&tips${q || ''}`, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 400000 });
  await p.evaluate(() => { window.__bund.start(); window.__bund.dtMax = 0.25; });
  await p.waitForTimeout(2500);
};
await boot('&fresh');
const ev = (f, a) => p.evaluate(f, a);
const until = async (f, a, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(f, a)) return true; await p.waitForTimeout(300); } return false; };

// ---- tips ----
ok(await until(() => document.getElementById('tip').classList.contains('on') && /WASD/.test(document.getElementById('tip').textContent), null, 30000), 'the first tip: how to walk, look and act');
await p.screenshot({ path: `${out}/basics-tip.png` });

// ---- the map ----
await p.keyboard.press('KeyM'); await p.waitForTimeout(1500);
ok(await ev(() => window.__bund.mode === 'map' && !document.getElementById('worldmap').classList.contains('hidden')), 'M: the map opens');
const legend = await ev(() => [...document.querySelectorAll('#worldmap .wm-legend button')].map((b) => b.textContent));
ok(legend.some((t) => /Shengjian/.test(t)) && legend.some((t) => /cruise pier/.test(t)) && legend.some((t) => /Exit 7/.test(t)) && legend.some((t) => /Peace Hotel/.test(t)), `the places: ${legend.length} (${legend.slice(0, 5).join(', ')}…)`);
await p.screenshot({ path: `${out}/basics-map.png` });
await ev(() => { const b = [...document.querySelectorAll('#worldmap .wm-legend button')].find((x) => /Shengjian/.test(x.textContent)); b.click(); });
await p.waitForTimeout(800);
await p.screenshot({ path: `${out}/basics-map-waypoint.png` });
const wp = await ev(() => window.__bund.getWaypoint());
ok(wp && Math.abs(wp.x + 145) < 2, `a waypoint on the shengjian shop (${wp && wp.x.toFixed(0)}, ${wp && wp.z.toFixed(0)})`);
await p.keyboard.press('KeyM'); await p.waitForTimeout(800);
ok(await ev(() => window.__bund.mode === 'play'), 'M again: back to the street');
await ev(() => window.__bund.player.teleport(-145, -193));
ok(await until(() => window.__bund.getWaypoint() === null, null, 20000), 'walk there: the waypoint clears ("You\'re there")');

// ---- a gamepad ----
await ev(() => {
  const btn = () => ({ pressed: false, value: 0 });
  window.__pad = { id: 'Test pad', connected: true, mapping: 'standard', buttons: Array.from({ length: 17 }, btn), axes: [0, 0, 0, 0] };
  navigator.getGamepads = () => [window.__pad];
  const e = new Event('gamepadconnected'); e.gamepad = window.__pad; window.dispatchEvent(e);
});
await ev(() => window.__bund.player.teleport(18, 0, 0, 0));
const g0 = await ev(() => ({ z: window.__bund.player.body.z, yaw: window.__bund.player.yaw }));
await ev(() => { window.__pad.axes[1] = -1; window.__pad.axes[2] = 0.7; });
await p.waitForTimeout(3000);
await ev(() => { window.__pad.axes[1] = 0; window.__pad.axes[2] = 0; });
await p.waitForTimeout(1500);                                                                // (a few slow frames)
const g1 = await ev(() => ({ z: window.__bund.player.body.z, yaw: window.__bund.player.yaw, f: window.__bund.player.input.f }));
ok(Math.hypot(g1.z - g0.z) > 0.5 && Math.abs(g1.yaw - g0.yaw) > 0.1 && !g1.f, `the left stick walks (${Math.abs(g1.z - g0.z).toFixed(1)} m), the right stick turns (${(g1.yaw - g0.yaw).toFixed(2)} rad), let go and you stop`);
await ev(() => { window.__pad.buttons[3] = { pressed: true, value: 1 }; }); await p.waitForTimeout(1000); await ev(() => { window.__pad.buttons[3] = { pressed: false, value: 0 }; }); await p.waitForTimeout(1300);   // (held long enough for a slow software frame to see it)
ok(await ev(() => window.__bund.phone.isOpen), 'Y: the phone comes out');
await ev(() => { window.__pad.buttons[3] = { pressed: true, value: 1 }; }); await p.waitForTimeout(1000); await ev(() => { window.__pad.buttons[3] = { pressed: false, value: 0 }; }); await p.waitForTimeout(1300);   // (held long enough for a slow software frame to see it)
ok(await ev(() => !window.__bund.phone.isOpen), 'Y again: put away');

// ---- saves ----
await ev(() => { window.__bund.life.clock.day = 3; window.__bund.life.clock.minute = 15 * 60; });
await ev(() => { window.__bund.start && 0; document.querySelector('[data-open-saves]').click(); });
await p.waitForTimeout(600);
ok(await ev(() => !document.getElementById('saves').classList.contains('hidden') && document.querySelectorAll('#saves .slot').length === 3), 'the saves panel: three slots');
await ev(() => document.querySelector('#saves [data-a="copy"][data-n="2"]').click()); await p.waitForTimeout(400);
ok(await ev(() => !!localStorage.getItem('bund-life-v1:slot2') && /Day 3/.test(document.querySelectorAll('#saves .slot')[1].textContent)), 'saved to slot 2 ("Day 3 · 3:00 pm …")');
await p.screenshot({ path: `${out}/basics-saves.png` });
const [dl] = await Promise.all([p.waitForEvent('download'), ev(() => document.querySelector('#saves [data-a="export"][data-n="2"]').click())]);
const file = await dl.path(), text = readFileSync(file, 'utf8');
ok(dl.suggestedFilename() === 'returning-tide-slot2-day3.json' && JSON.parse(text).clock.day === 3, `exported: ${dl.suggestedFilename()}`);
await ev(() => document.querySelector('#saves [data-a="import"][data-n="3"]').click());
await p.setInputFiles('input[type=file]', file); await p.waitForTimeout(800);
ok(await ev(() => !!localStorage.getItem('bund-life-v1:slot3') && /Day 3/.test(document.querySelectorAll('#saves .slot')[2].textContent)), 'imported into slot 3');
await p.setInputFiles('input[type=file]', { name: 'junk.json', mimeType: 'application/json', buffer: Buffer.from('{"nope":1}') });
await ev(() => document.querySelector('#saves [data-a="import"][data-n="3"]').click()); await p.setInputFiles('input[type=file]', { name: 'junk.json', mimeType: 'application/json', buffer: Buffer.from('{"nope":1}') }); await p.waitForTimeout(600);
ok(await ev(() => /isn't a save/.test(document.querySelector('#saves .sv-note').textContent)), 'a file that isn\'t a save is refused');
// load slot 2: the page restarts in it
await Promise.all([p.waitForEvent('load'), ev(() => document.querySelector('#saves [data-a="load"][data-n="2"]').click())]);
await p.goto(`${url}?q=3&nolock&lang=en&crowd=0.2&tips`, { waitUntil: 'load' });              // (the test's first load had ?fresh, which ignores saves)
await p.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 400000 });
ok(await ev(() => localStorage.getItem('bund-slot') === '2' && window.__bund.life.clock.day === 3), 'loaded slot 2: day 3, playing slot 2');
await ev(() => { window.__bund.start(); window.__bund.dtMax = 0.25; });
await p.waitForTimeout(2000);

// ---- the benchmark ----
await ev(() => window.__bund.startBench());
await p.waitForTimeout(12000);
await p.screenshot({ path: `${out}/basics-bench.png` });
ok(await until(() => !window.__bund.benchRunning(), null, 120000), 'the benchmark runs its route and finishes');
const r = await ev(() => ({ res: window.__bund.lastBench, out: document.getElementById('bench-out').textContent, mode: window.__bund.mode }));
ok(r.res && r.res.avg > 0 && r.res.low1 > 0 && r.res.low1 <= r.res.avg && /Average .* fps · 1% low/.test(r.out), `result: "${r.out}"`);

ok(errors.length === 0, `no errors (${errors.slice(0, 3).join(' | ')})`);
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
await browser.close();
process.exit(failed ? 1 : 0);
