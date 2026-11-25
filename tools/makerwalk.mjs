// The maker loop: to the Yangpu makerspace, buy the parts, build the night gimbal (solder six
// joints), back to the Bund, photograph the Oriental Pearl in photo mode, the camera roll and the
// Sketchbook, share it. node tools/makerwalk.mjs (URL=, OUT=)
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const dir = (process.env.OUT || '.') + '/';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_CONNECTION_REFUSED|8790|11434/.test(m.text())) errs.push(m.text().slice(0, 200)); });
let failed = 0; const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
await p.goto(`${process.env.URL || 'http://localhost:4173/'}?q=4&nolock&life=0&fresh&lang=en`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 180000 });
await p.evaluate(() => window.__bund.start()); await p.waitForTimeout(1500);
await p.evaluate(() => { window.__bund.dtMax = 0.2; const s = document.createElement('style'); s.textContent = '#minimap,#dev{display:none!important}'; document.head.appendChild(s); });
const prompt = () => p.evaluate(() => document.getElementById('prompt').classList.contains('on') ? document.getElementById('prompt').innerText.replace(/\n/g, ' ') : '');
const mode = (m) => p.waitForFunction((m) => window.__bund.mode === m, m, { timeout: 60000 });
// 1. there (the Kuaima's arrival goes straight in)
ok(await p.evaluate(() => window.__bund.world.makerspace.arrive('yangpu')), 'a Kuaima to Yangpu: in through the door');
await mode('play'); await p.waitForTimeout(2500);
await p.screenshot({ path: `${dir}maker-space.png`, timeout: 120000 });
// 2. the shelf: buy what the gimbal needs
await p.evaluate(() => window.__bund.player.teleport(302.4, -2602.6, 0, -0.2)); await p.waitForTimeout(1500);
let pr = await prompt(); ok(/Parts shelf/.test(pr), `at the shelf: "${pr}"`);
await p.keyboard.press('KeyE'); await mode('build'); await p.waitForTimeout(600);
const w0 = await p.evaluate(() => window.__bund.life.wallet.wechat);
for (const [k, n] of [['esp32', 1], ['imu', 1], ['gimbalMotor', 3], ['lipo', 1]]) for (let i = 0; i < n; i++) { await p.evaluate((k) => document.querySelector(`#build [data-b="buy:${k}"]`).click(), k); await p.waitForTimeout(150); }
const w1 = await p.evaluate(() => window.__bund.life.wallet.wechat);
ok(w0 - w1 === 337, `bought the parts: ¥${w0 - w1}`);
await p.evaluate(() => document.querySelector('#build [data-b="tab:plans"]').click()); await p.waitForTimeout(400);
await p.screenshot({ path: `${dir}maker-bench.png`, timeout: 120000 });
// 3. build it: the print (a fade), then six joints
await p.evaluate(() => document.querySelector('#build [data-b="build:gimbal"]').click());
await p.waitForFunction(() => window.__bund.world.makerspace.step === 'solder', null, { timeout: 60000 });
await p.waitForTimeout(800); await p.screenshot({ path: `${dir}maker-solder.png`, timeout: 120000 });
for (let i = 0; i < 6; i++) { await p.waitForTimeout(700); await p.keyboard.press('Space'); }
await p.waitForFunction(() => window.__bund.life.flags.maker.gadgets.gimbal, null, { timeout: 30000 });
const g = await p.evaluate(() => ({ q: window.__bund.life.flags.maker.gadgets.gimbal.quality, xp: window.__bund.life.flags.maker.xp, ach: window.__bund.life.flags.maker.achievements }));
ok(g.xp > 0, `the night gimbal is built: quality ${Math.round(g.q * 100)}%, ${g.xp} XP, ${JSON.stringify(g.ach)}`);
await mode('play');
// 4. back on the Bund: photo mode, the Pearl from the promenade
await p.evaluate(() => window.__bund.player.teleport(26, -8, -Math.PI / 2 - 0.05, 0.22)); await p.waitForTimeout(2000);
await p.keyboard.press('KeyG'); await mode('photo'); await p.waitForTimeout(2500);
const best = await p.evaluate(() => { const b = window.__bund.world.photo.best; return b ? { id: b.t.id, stars: b.stars } : null; });
ok(best && best.id === 'pearl', `the viewfinder sees the Pearl: ${JSON.stringify(best)}`);
await p.screenshot({ path: `${dir}maker-photo.png`, timeout: 120000 });
await p.keyboard.press('Space'); await p.waitForTimeout(2500);
const ph = await p.evaluate(() => { const m = window.__bund.life.flags.maker; return { n: m.photos.length, last: m.photos.at(-1) && { target: m.photos.at(-1).target, stars: m.photos.at(-1).stars, thumb: (m.photos.at(-1).thumb || '').length }, shot: m.shot }; });
ok(ph.n === 1 && ph.last.target === 'pearl' && ph.last.thumb > 2000, `a photo of the Pearl in the camera roll (${ph.last.stars}★, a ${ph.last.thumb}-byte thumbnail)`);
await p.keyboard.press('KeyG'); await mode('play');
// 5. the phone: Photos, share; the Sketchbook
await p.keyboard.press('KeyP'); await p.waitForTimeout(600); await p.keyboard.press('Enter'); await p.waitForTimeout(1000);
await p.evaluate(() => document.querySelector('#phone [data-act="app"][data-id="photos"]').click()); await p.waitForTimeout(600);
const f0 = await p.evaluate(() => window.__bund.life.flags.maker.followers);
await p.evaluate(() => document.querySelector('#phone [data-act="sharePhoto"]').click()); await p.waitForTimeout(800);
const f1 = await p.evaluate(() => window.__bund.life.flags.maker.followers);
ok(f1 > f0, `shared to Moments: +${f1 - f0} followers`);
await p.screenshot({ path: `${dir}maker-photos-app.png`, timeout: 120000 });
await p.evaluate(() => document.querySelector('#phone [data-act="back"]').click()); await p.waitForTimeout(400);
await p.evaluate(() => document.querySelector('#phone [data-act="app"][data-id="sketch"]').click()); await p.waitForTimeout(600);
const sk = await p.evaluate(() => document.querySelector('#phone .view.sketch') ? document.querySelector('#phone .view.sketch').innerText.slice(0, 200) : '');
ok(/Maker/.test(sk) && /Night gimbal/.test(sk), 'the Sketchbook: Maker level, builds, friends, achievements');
await p.screenshot({ path: `${dir}maker-sketch.png`, timeout: 120000 });
ok(errs.length === 0, `no errors (${errs.slice(0, 3).join(' | ')})`);
console.log(failed ? `${failed} FAILED` : 'all passed');
await b.close();
