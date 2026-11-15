// The Jazz Bar: shut by day; open at night, the trio playing; Momo's night (the dedication, the
// invite kept); a seat by the stage; a drink. node tools/jazzwalk.mjs (URL=, OUT=)
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const dir = (process.env.OUT || '.') + '/';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
let failed = 0; const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
await p.goto(`${process.env.URL || 'http://localhost:4173/'}?q=4&nolock&life=0&fresh&lang=en`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 180000 });
await p.evaluate(() => window.__bund.start()); await p.waitForTimeout(1500);
await p.evaluate(() => { window.__bund.dtMax = 0.2; const s = document.createElement('style'); s.textContent = '#minimap,#dev{display:none!important}'; document.head.appendChild(s); });
const S = () => p.evaluate(() => { const b = window.__bund.player.body; return { x: b.x, z: b.z, y: b.y, mode: window.__bund.mode }; });
const prompt = () => p.evaluate(() => { const e = document.getElementById('prompt'); return e.classList.contains('on') ? e.innerText.replace(/\n/g, ' ') : ''; });
const walk = async (secs, key = 'KeyW') => { await p.keyboard.down(key); await p.waitForTimeout(secs * 1000); await p.keyboard.up(key); await p.waitForTimeout(400); };
const shot = (n) => p.screenshot({ path: `${dir}jazz-${n}.png`, timeout: 120000 });
const jz = () => p.evaluate(() => { const m = window.__bund.world.jazz.music; return { playing: m.playing, tune: m.tune ? m.tune.title : null, no: m.tuneNo, inBar: window.__bund.world.jazz.inBar }; });
// 17:4x: shut
await p.evaluate(() => window.__bund.player.teleport(-44.0, -224.6, Math.PI, 0)); await p.waitForTimeout(1500);
let pr = await prompt(); ok(/Opens at 7/.test(pr), `before seven, the door: "${pr}"`);
await walk(2); let s = await S(); ok(s.z < -222.6, `the door is shut (z=${s.z.toFixed(2)})`);
// 21:25 on Momo's night, the invite accepted
await p.evaluate(() => { const L = window.__bund.life; let inv = L.invites.find((i) => i.id === 'momo-gig'); if (!inv) { inv = { id: 'momo-gig', from: 'momo', thread: 'wuhu', title: 'Momo trio', place: 'Jazz Bar', at: L.clock.day * 1440 + 1290, deadline: L.clock.day * 1440 + 1260 }; L.invites.push(inv); } inv.status = 'accepted'; L.clock.minute = 21 * 60 + 25; window.__bund.player.teleport(-44.0, -224.8, Math.PI, 0); });
await p.waitForTimeout(2500); let j = await jz(); ok(j.playing, `21:25: the band is playing (${j.tune})`);
await walk(3); await p.waitForTimeout(1500); s = await S(); ok(s.z > -222.9 && (await jz()).inBar, `in through the open door (z=${s.z.toFixed(2)})`);
await p.evaluate(() => window.__bund.player.teleport(-43.0, -217.5, -1.1, -0.04)); await p.waitForTimeout(3000); await shot('room');
// sit at the table Momo kept
await p.evaluate(() => window.__bund.player.teleport(-42.5, -219.2, -0.5, -0.4)); await p.waitForTimeout(1500);
pr = await prompt(); ok(/Momo|table/.test(pr), `at the reserved table: "${pr}"`);
await p.keyboard.press('KeyE'); await p.waitForTimeout(1200); s = await S(); ok(s.mode === 'seat', 'sat down');
await p.waitForTimeout(2500); await shot('stage');
// let two tunes go by quickly: jump the band's clock to the end of each tune
const skipTune = () => p.evaluate(() => window.__bund.world.jazz.music.skipToEnd());
for (let k = 0; k < 2; k++) { await skipTune(); await p.waitForTimeout(16000); }
j = await jz(); ok(j.no >= 2, `tune ${j.no}: ${j.tune}`);
await p.waitForTimeout(2000); await shot('dedication');
await skipTune(); await p.waitForTimeout(6000);
const kept = await p.evaluate(() => { const L = window.__bund.life; return { kept: !!L.invites.find((i) => i.id === 'momo-gig').kept, msg: (L.threads.wuhu.messages.at(-1) || {}).text }; });
ok(kept.kept, `stayed through the dedication: the invite kept ("${kept.msg}")`);
await p.keyboard.press('KeyE'); await p.waitForTimeout(1000); s = await S(); ok(s.mode === 'play', 'stood up');
// a drink
await p.evaluate(() => window.__bund.player.teleport(-41.8, -215.2, Math.PI, -0.25)); await p.waitForTimeout(1500);
pr = await prompt(); ok(/drink/.test(pr), `at the bar: "${pr}"`);
const before = await p.evaluate(() => ({ w: window.__bund.life.wallet.wechat, m: window.__bund.life.clock.minute }));
await p.keyboard.press('KeyE'); await p.waitForFunction(() => window.__bund.mode === 'play', null, { timeout: 60000 }); await p.waitForTimeout(500);
const after = await p.evaluate(() => ({ w: window.__bund.life.wallet.wechat, m: window.__bund.life.clock.minute }));
ok(before.w - after.w === 128 && after.m - before.m >= 20, `a whisky sour: −¥${before.w - after.w}, ${after.m - before.m} min`);
await p.evaluate(() => window.__bund.player.teleport(-38.6, -217.8, 0.15, 0.05)); await p.waitForTimeout(2500); await shot('band');
ok(errs.length === 0, `no errors (${errs.slice(0, 3).join(' | ')})`);
console.log(failed ? `${failed} FAILED` : 'all passed');
await b.close();
