// Walkthrough, phase 3: graphics settings, the crowd, the buses, Nanjing Road, the metro.
//   URL=http://localhost:4173/ OUT=<dir> node tools/p3walk.mjs
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const url = process.env.URL || 'http://localhost:4173/', out = process.env.OUT || '.';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
p.on('pageerror', (e) => errors.push(e.message));
// a lighter crowd and the full traffic (software rendering is slow); real presets are checked through the panel
await p.goto(`${url}?q=4&nolock&life=0&fresh&legacy&lang=en&crowd=0.5&traffic=1`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 300000 });
const ev = (f, a) => p.evaluate(f, a);
// 1. graphics settings: the tab, a preset, a custom change
await ev(() => document.querySelector('[data-open-settings]').click());
await ev(() => document.querySelector('#set-tabs button[data-tab="graphics"]').click());
await p.waitForTimeout(400);
ok(await ev(() => !document.querySelector('#settings .tab-body[data-body="graphics"]').hidden), 'Settings has a Graphics tab');
await ev(() => document.querySelector('.seg[data-setting="g.preset"] button[data-v="ultra"]').click());
let g = await ev(() => JSON.parse(localStorage.getItem('bund.gfx')));
ok(g && g.preset === 'ultra', 'choosing Ultra is remembered');
await ev(() => document.querySelector('.seg[data-setting="g.fps"] button[data-v="30"]').click());
g = await ev(() => JSON.parse(localStorage.getItem('bund.gfx')));
ok(g.preset === 'custom' && g.fps === 30 && g.msaa === 4, 'changing the frame cap makes it Custom and keeps the rest of Ultra');
ok(await ev(() => !document.querySelector('#settings .g-reload').hidden), 'a different detail level offers the reload for crowds and traffic');
await ev(() => document.querySelector('.seg[data-setting="g.preset"] button[data-v="mac"]').click());
await p.waitForTimeout(1500);                                               // (let the slow software renderer repaint before the screenshot)
await p.screenshot({ path: `${out}/p3-settings.png` });
await ev(() => document.querySelector('[data-close-settings]').click());
// 2. the crowd and the traffic
await ev(() => { window.__bund.start(); window.__bund.dtMax = 0.25; });
await p.waitForTimeout(3000);
const c = await ev(() => { const w = window.__bund.world; return { n: w.crowd.agents.length, tours: w.crowd.tours.length, veh: window.__bund.traffic.vehicles.length, buses: window.__bund.traffic.vehicles.filter((v) => v.bus).length, henan: w.henan.traffic.vehicles.length }; });
ok(c.n >= 90 && c.tours >= 1, `the crowd: ${c.n} people, ${c.tours} tour group(s)`);
ok(c.veh >= 20 && c.buses >= 2 && c.henan >= 4, `traffic: ${c.veh} on Zhongshan Road (${c.buses} buses), ${c.henan} on Henan Road`);
await ev(() => window.__bund.player.teleport(16, 20, Math.PI, 0.05));
await p.waitForTimeout(3000);
const v = await ev(() => window.__bund.world.crowdView.stats);
ok(v.near >= 1 && v.far >= 10, `near people drawn in full (${v.near}), the rest as impostors (${v.far})`);
await p.screenshot({ path: `${out}/p3-promenade.png` });
// 3. a bus serves a stop (let time run)
await ev(() => { window.__bund.dtMax = 0.5; window.__bund.player.teleport(-31, 30, Math.PI + 0.3, 0.05); });
await p.waitForFunction(() => window.__bund.world.buses.stats.served >= 1, null, { timeout: 600000 }).catch(() => {});
const bs = await ev(() => window.__bund.world.buses.stats);
ok(bs.served >= 1, `a bus pulled in, opened its doors and left again (${bs.log.join(', ')})`);
// 4. Nanjing Road to Henan Road, down Exit 7
await ev(() => { window.__bund.dtMax = 0.25; window.__bund.player.teleport(-476, -209.5, Math.PI / 2, 0); });
await p.waitForTimeout(1500);
await p.screenshot({ path: `${out}/p3-exit7.png` });
await ev(() => window.__bund.player.teleport(-482, -209.5, Math.PI / 2, -0.2));
await p.keyboard.down('KeyW'); await p.waitForTimeout(9000); await p.keyboard.up('KeyW'); await p.waitForTimeout(600);
const down = await ev(() => ({ y: window.__bund.player.body.y, x: window.__bund.player.body.x }));
ok(down.y < -3.5, `walked down Exit 7's stairs to the landing (y ${down.y.toFixed(2)}, x ${down.x.toFixed(1)})`);
await ev(() => { window.__bund.player.teleport(-493.4, -209.5, Math.PI / 2, 0.05, -4.6); });
await p.waitForTimeout(1200);
const pr = await ev(() => { const e = document.getElementById('prompt'); return e.classList.contains('on') ? e.innerText.replace(/\n/g, ' ') : ''; });
ok(/Lujiazui/.test(pr), `at the landing: "${pr}"`);
await p.screenshot({ path: `${out}/p3-landing.png` });
await p.keyboard.press('KeyE');
await p.waitForFunction(() => window.__bund.world.dest.here === 'lujiazui', null, { timeout: 60000 }).catch(() => {});
ok(await ev(() => window.__bund.world.dest.here === 'lujiazui'), 'Line 2 one stop to Lujiazui: out at the IFC');
const led = await ev(() => window.__bund.life.wallet.ledger.slice(-1)[0]);
ok(led && led.amount === -3 && /Metro/.test(led.to), 'the fare (¥3) is in the wallet');
// 5. through the concourse: from Exit 2 to Exit 7
await ev(() => { window.__bund.world.dest.leave && window.__bund.world.dest.leave(); });
await p.waitForTimeout(3000);
await ev(() => window.__bund.player.teleport(-517.6, -209.4, 0, 0.2, -4.6));            // on Exit 2's landing, facing the sign on the side wall
await p.waitForTimeout(1200);
const pr2 = await ev(() => { const e = document.getElementById('prompt'); return e.classList.contains('on') ? e.innerText.replace(/\n/g, ' ') : ''; });
ok(/Exit 7/.test(pr2), `Exit 2's landing, the way through: "${pr2}"`);
if (/Exit 7/.test(pr2)) {
  await p.keyboard.press('KeyE'); await p.waitForTimeout(4500);
  const at = await ev(() => window.__bund.player.body);
  ok(at.x > -495 && at.x < -483 && at.y < -3.5, `out at Exit 7's landing (${at.x.toFixed(1)}, y ${at.y.toFixed(1)})`);
}
// 6. Henan Road: its cars move
const hz0 = await ev(() => window.__bund.world.henan.traffic.vehicles.map((v) => v.s));
await p.waitForTimeout(3000);
const hz1 = await ev(() => window.__bund.world.henan.traffic.vehicles.map((v) => v.s));
ok(hz1.some((s, i) => Math.abs(s - hz0[i]) > 2), 'Henan Road traffic is moving');
ok(await ev(() => window.__bund.world.henan.traffic.stats.redEntries === 0 && window.__bund.traffic.stats.redEntries === 0), 'no car on either road has run a red');
ok(!errors.length, `no errors (${errors.slice(0, 3).join(' | ')})`);
console.log(failed ? `${failed} FAILED` : 'all passed');
await browser.close();
process.exit(failed ? 1 : 0);
