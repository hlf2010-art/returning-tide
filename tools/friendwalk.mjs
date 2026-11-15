// The friends after the first days: the beats arrive on the phone in both languages; Ruoan takes you
// through the AIA's gates to her ceiling; the Pocket LiDAR scans the Peace Hotel's rotunda; Momo
// asleep in 612. node tools/friendwalk.mjs (URL=, OUT=)
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const dir = (process.env.OUT || '.') + '/';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_CONNECTION_REFUSED|8790|11434/.test(m.text())) errs.push(m.text().slice(0, 200)); });
let failed = 0; const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
await p.goto(`${process.env.URL || 'http://localhost:4173/'}?q=4&nolock&fresh&lang=en`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 180000 });
await p.evaluate(() => window.__bund.start()); await p.waitForTimeout(1500);
await p.evaluate(() => { window.__bund.dtMax = 0.2; const s = document.createElement('style'); s.textContent = '#minimap,#dev{display:none!important}'; document.head.appendChild(s); });
const prompt = () => p.evaluate(() => document.getElementById('prompt').classList.contains('on') ? document.getElementById('prompt').innerText.replace(/\n/g, ' ') : '');
// 1. days go by: the beats fire, everything has its English
await p.evaluate(() => { const L = window.__bund.life; L.clock.day = 4; L.clock.minute = 18 * 60 + 40; });
await p.waitForTimeout(6000);
const beats = await p.evaluate(() => Object.keys(window.__bund.life.fired));
ok(['r2', 'r3', 'z2', 'm2', 'mu1', 'y3'].every((k) => beats.includes(k)) || ['r2', 'r3', 'z2', 'm2', 'mu1'].every((k) => beats.includes(k)), `the days after: ${beats.filter((k) => /^(r|z|m|x|y|mu|d)\d/.test(k)).join(' ')}`);
const msgs = await p.evaluate(() => { const L = window.__bund.life; return ['ruoan', 'zhixia', 'momo', 'mum'].flatMap((t) => (L.threads[t] ? L.threads[t].messages.filter((m) => m.from !== 'me').map((m) => m.text) : [])); });
ok(msgs.length >= 5, `${msgs.length} new messages from Ruoan, Zhixia, Momo and Mum`);
// 2. Ruoan's evening at the AIA: accept, then be there at seven
await p.evaluate(() => { const L = window.__bund.life, inv = L.invites.find((i) => i.id === 'ruoan-aia'); inv.status = 'accepted'; L.clock.minute = 18 * 60 + 58; window.__bund.player.teleport(-38.6, -146.1, Math.PI / 2, -0.05); });
await p.waitForTimeout(3000);
let pr = await prompt(); ok(/Ruoan.*Go through/.test(pr), `Ruoan at the gates: "${pr}"`);
await p.screenshot({ path: `${dir}friends-ruoan.png`, timeout: 120000 });
await p.keyboard.press('KeyE'); await p.waitForTimeout(800);
await p.keyboard.down('KeyW'); await p.waitForTimeout(3500); await p.keyboard.up('KeyW'); await p.waitForTimeout(2500);
let s = await p.evaluate(() => window.__bund.player.body.x);
ok(s < -42.2, `through the gates with her, the guard lets you be (x=${s.toFixed(1)})`);
await p.waitForFunction(() => document.getElementById('prompt').innerText.includes('ceiling') || document.getElementById('prompt').innerText.includes('Look up'), null, { timeout: 60000 }).catch(() => {});
await p.evaluate(() => window.__bund.player.teleport(-43.2, -146.2, Math.PI / 2, 0.9)); await p.waitForTimeout(1500);
pr = await prompt(); ok(/ceiling|Look up/.test(pr), `under the ceiling: "${pr}"`);
await p.keyboard.press('KeyE'); await p.waitForTimeout(1500);
const kept = await p.evaluate(() => ({ kept: window.__bund.life.invites.find((i) => i.id === 'ruoan-aia').kept, wants: window.__bund.life.flags.ruoanWantsLidar }));
ok(kept.kept && kept.wants, 'you were there; she wishes someone had a portable LiDAR');
// 3. the Pocket LiDAR: scan the rotunda
await p.evaluate(() => { const M = window.__bund.life.flags.maker || (window.__bund.life.flags.maker = { xp: 0, parts: {}, gadgets: {}, builds: [], photos: [], shot: {}, achievements: [], followers: 3412, log: [] }); M.gadgets.lidar = { quality: 0.9 }; window.__bund.player.teleport(-48, -225.5, 0, 1.1); });
await p.waitForTimeout(1500);
pr = await prompt(); ok(/rotunda.*Scan/.test(pr), `under the dome with the LiDAR: "${pr}"`);
const x0 = await p.evaluate(() => window.__bund.life.flags.maker.xp);
await p.keyboard.press('KeyE'); await p.waitForTimeout(1800); await p.screenshot({ path: `${dir}friends-scan.png`, timeout: 120000 });
await p.waitForFunction(() => (window.__bund.life.flags.maker.scans || []).includes('rotunda'), null, { timeout: 60000 });
ok(await p.evaluate((x0) => window.__bund.life.flags.maker.xp > x0, x0), 'scanned: a point cloud of the rotunda, Maker XP');
// 4. Momo, asleep in your armchair
await p.evaluate(() => { const L = window.__bund.life; L.flags.momoCrash = true; L.fired.m2 = L.clock.day * 1440 + L.clock.minute - 60; window.__bund.player.teleport(-38.4, -229.6, -Math.PI / 2 + 0.4, -0.25, 23.5); });
await p.waitForTimeout(2500);
pr = await prompt(); ok(/Momo.*Wake/.test(pr), `Momo in 612: "${pr}"`);
await p.screenshot({ path: `${dir}friends-momo.png`, timeout: 120000 });
await p.keyboard.press('KeyE'); await p.waitForTimeout(1200);
pr = await prompt(); ok(/Talk|Let him/.test(pr), `awake: "${pr}"`);
ok(errs.length === 0, `no errors (${errs.slice(0, 3).join(' | ')})`);
console.log(failed ? `${failed} FAILED` : 'all passed');
await b.close();
