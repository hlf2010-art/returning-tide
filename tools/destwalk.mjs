// Places a Kuaima takes you to, when you were asked: by car to IFC 32F for Xuan's robot-arm review
// (the whole ride), the scene answered 1-4, back by the lift; then the North Bund flat with Yinuo.
// node tools/destwalk.mjs (URL=, OUT=)
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const dir = (process.env.OUT || '.') + '/';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
let failed = 0; const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
await p.goto(`${process.env.URL || 'http://localhost:4173/'}?q=4&nolock&life=0&fresh&lang=en`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 180000 });
await p.evaluate(() => window.__bund.start()); await p.waitForTimeout(1500);
await p.evaluate(() => { window.__bund.dtMax = 0.25; const s = document.createElement('style'); s.textContent = '#minimap,#dev{display:none!important}'; document.head.appendChild(s); });
const click = (sel) => p.evaluate((s) => document.querySelector(s).click(), sel);
const invite = (id, from) => p.evaluate(([id, from]) => { const L = window.__bund.life; let inv = L.invites.find((i) => i.id === id); if (!inv) { inv = { id, from, thread: from, title: id, place: id, deadline: 0 }; L.invites.push(inv); } inv.status = 'accepted'; inv.at = L.clock.day * 1440 + L.clock.minute + 20; }, [id, from]);
// answer every question with 1, until the scene is done
async function playScene(tag) {
  let asks = 0, shot = 0;
  for (let i = 0; i < 120; i++) {
    await p.waitForTimeout(1200);
    const s = await p.evaluate(() => { const c = window.__bund.world.dest.scene; return c ? { ask: !!c.ask, done: c.done, sp: document.querySelector('#ride-sub .sp').textContent, tx: document.querySelector('#ride-sub .tx').textContent } : null; });
    if (!s || s.done) break;
    if (i === 3 && shot === 0) { shot++; await p.screenshot({ path: `${dir}dest-${tag}-talk.png`, timeout: 120000 }); }
    if (s.ask) { asks++; if (asks === 1) await p.screenshot({ path: `${dir}dest-${tag}-ask.png`, timeout: 120000 }); await p.keyboard.press('Digit1'); }
  }
  return asks;
}
// ---- 1. by Kuaima to Lujiazui, asked to be there now ----
await invite('xuan-arm', 'xuan');
await p.evaluate(() => window.__bund.player.teleport(-3.2, -17.0, Math.PI / 2 + 0.25, -0.05));
await p.keyboard.press('KeyP'); await p.waitForTimeout(600);
await p.keyboard.press('Enter'); await p.waitForTimeout(1200);
await click('#phone [data-act="app"][data-id="didi"]'); await p.waitForTimeout(500);
await click('#phone [data-act="didiTo"][data-id="lujiazui"]'); await p.waitForTimeout(400);
await click('#phone [data-act="didiCall"]'); await p.waitForTimeout(500);
await p.keyboard.press('KeyP'); await p.waitForTimeout(400);
await p.waitForFunction(() => window.__bund.world.didi.state === 'waiting', null, { timeout: 200000 });
const car = await p.evaluate(() => { const c = window.__bund.world.didi.car; return { x: c.x, z: c.z }; });
await p.evaluate(([x, z]) => window.__bund.player.teleport(x + 2.3, z + 0.3, Math.atan2(2.3, 0), -0.15), [car.x, car.z]); await p.waitForTimeout(1500);
await p.keyboard.press('KeyE'); await p.waitForTimeout(2000);
ok(await p.evaluate(() => window.__bund.mode === 'ride'), 'in the car to Lujiazui');
for (let i = 0; i < 200; i++) {
  await p.waitForTimeout(1000);
  const st = await p.evaluate(() => ({ ch: !document.querySelector('#ride-sub .ch').classList.contains('hidden') && document.getElementById('ride-sub').classList.contains('on'), here: window.__bund.world.dest.here, card: window.__bund.world.rideFlow.card }));
  if (st.ch && !st.here) await p.keyboard.press('Digit1');
  if (st.here || st.card) break;
}
await p.waitForFunction(() => window.__bund.mode === 'play', null, { timeout: 60000 });
let s = await p.evaluate(() => ({ here: window.__bund.world.dest.here, y: window.__bund.player.body.y, card: window.__bund.world.rideFlow.card }));
ok(s.here === 'lujiazui' && Math.abs(s.y - 134.4) < 0.1 && !s.card, `arrived: walked into IFC 32F (y=${s.y.toFixed(1)}), no card`);
await p.waitForTimeout(2500); await p.screenshot({ path: `${dir}dest-ifc-arrive.png`, timeout: 120000 });
let asks = await playScene('ifc');
let st = await p.evaluate(() => { const L = window.__bund.life; return { kept: L.invites.find((i) => i.id === 'xuan-arm').kept, said: L.flags.lujiazuiSaid, aff: L.relations.xuan }; });
ok(asks === 2 && st.kept && st.said && st.said.includes('fix'), `the review: ${asks} questions answered, invite kept, said ${JSON.stringify(st.said)}`);
const drops = await p.evaluate(() => window.__bund.world.dest.scene === null ? -1 : 0);
await p.evaluate(() => window.__bund.player.teleport(686.6, 52.0, 1.35, -0.06, 134.4)); await p.waitForTimeout(2500); await p.screenshot({ path: `${dir}dest-ifc-view.png`, timeout: 120000 });
await p.evaluate(() => window.__bund.player.teleport(675.6, 49.4, 0.95, -0.32, 134.4)); await p.waitForTimeout(2500); await p.screenshot({ path: `${dir}dest-ifc-arm.png`, timeout: 120000 });
// the lift: back to the Bund
await p.evaluate(() => window.__bund.player.teleport(688.4, 55.6, -Math.PI / 2, 0, 134.4)); await p.waitForTimeout(1500);
let pr = await p.evaluate(() => document.getElementById('prompt').innerText.replace(/\n/g, ' '));
ok(/Lift/.test(pr), `at the lift: "${pr}"`);
const w0 = await p.evaluate(() => window.__bund.life.wallet.wechat);
await p.keyboard.press('KeyE'); await p.waitForFunction(() => window.__bund.mode === 'play' && !window.__bund.world.dest.here, null, { timeout: 60000 });
s = await p.evaluate(() => ({ x: window.__bund.player.body.x, z: window.__bund.player.body.z, y: window.__bund.player.body.y, w: window.__bund.life.wallet.wechat }));
ok(Math.abs(s.z - -19.7) < 1 && s.y < 1 && s.w < w0, `back on the Bund by Kuaima (paid ¥${(w0 - s.w).toFixed(1)})`);
// ---- 2. the North Bund flat ----
await invite('yinuo-flat', 'yinuo');
await p.evaluate(() => window.__bund.world.dest.arrive('northbund'));
await p.waitForFunction(() => window.__bund.mode === 'play' && window.__bund.world.dest.here === 'northbund', null, { timeout: 60000 });
await p.waitForTimeout(2500); await p.screenshot({ path: `${dir}dest-nb-arrive.png`, timeout: 120000 });
asks = await playScene('nb');
st = await p.evaluate(() => { const L = window.__bund.life; return { kept: L.invites.find((i) => i.id === 'yinuo-flat').kept, said: L.flags.northbundSaid }; });
ok(asks === 2 && st.kept, `the viewing: ${asks} questions, invite kept, said ${JSON.stringify(st.said)}`);
await p.evaluate(() => window.__bund.player.teleport(52, -1347.5, -2.75, -0.12, 160)); await p.waitForTimeout(3000); await p.screenshot({ path: `${dir}dest-nb-view.png`, timeout: 120000 });
await p.evaluate(() => window.__bund.player.teleport(47, -1362, -2.3, -0.05, 160)); await p.waitForTimeout(2500); await p.screenshot({ path: `${dir}dest-nb-room.png`, timeout: 120000 });
// walls hold up here
await p.evaluate(() => window.__bund.player.teleport(62, -1346, -2.4, 0, 160)); await p.keyboard.down('KeyW'); await p.waitForTimeout(3000); await p.keyboard.up('KeyW'); await p.waitForTimeout(500);
s = await p.evaluate(() => window.__bund.player.body);
ok(s.x < 64 && s.z < -1344 && Math.abs(s.y - 160) < 0.1, `the glass holds (${s.x.toFixed(1)}, ${s.z.toFixed(1)}, y ${s.y.toFixed(1)})`);
ok(errs.length === 0, `no errors (${errs.slice(0, 3).join(' | ')})`);
console.log(failed ? `${failed} FAILED` : 'all passed');
await b.close();
