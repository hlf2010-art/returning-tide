import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const [lang = 'en'] = process.argv.slice(2);
const dir = (process.env.OUT || '.') + '/';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
let failed = 0; const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
await p.goto(`${process.env.URL || 'http://localhost:5173/'}?q=5&nolock&life=0&fresh&lang=${lang}`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 180000 });
await p.evaluate(() => window.__bund.start()); await p.waitForTimeout(1500);
await p.evaluate(() => { window.__bund.dtMax = 0.25; });
const click = (sel) => p.click(sel, { force: true });
// stand at the pickup point
await p.evaluate(() => window.__bund.player.teleport(-3.2, -17.0, Math.PI / 2 + 0.25, -0.05));
await p.keyboard.press('KeyP'); await p.waitForTimeout(600);
await p.keyboard.press('Enter'); await p.waitForTimeout(1200);
await click('#phone [data-act="app"][data-id="didi"]'); await p.waitForTimeout(500);
await p.screenshot({ path: `${dir}didi-${lang}-app.png` });
await click('#phone [data-act="didiTo"][data-id="lujiazui"]'); await p.waitForTimeout(400);
await click('#phone [data-act="didiCall"]'); await p.waitForTimeout(500);
await p.waitForFunction(() => { const r = window.__bund.world.rideFlow.ride; return r && r.phase === 'coming' && window.__bund.world.didi.car; }, null, { timeout: 60000 });
await p.waitForTimeout(800);
await p.screenshot({ path: `${dir}didi-${lang}-coming.png` });
const info = await p.evaluate(() => { const r = window.__bund.world.rideFlow.ride; return { d: r.driver.name, plate: r.driver.plate, car: r.car }; });
ok(!!info.car, `a driver accepts: ${JSON.stringify(info)}`);
await p.keyboard.press('KeyP'); await p.waitForTimeout(400);
const t0 = Date.now();
await p.waitForFunction(() => window.__bund.world.didi.state === 'waiting', null, { timeout: 150000 });
ok(true, `the car pulls in at the kerb (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
const car = await p.evaluate(() => { const c = window.__bund.world.didi.car; return { x: c.x, z: c.z }; });
ok(Math.abs(car.x - -5.35) < 0.4 && Math.abs(car.z - -18.5) < 1.5, `stopped at the kerb by the pickup (${car.x.toFixed(2)}, ${car.z.toFixed(2)})`);
// look at the back of the car (plate), then walk to the rear door
await p.evaluate(([x, z]) => window.__bund.player.teleport(x + 1.6, z + 4.2, Math.atan2(1.6, 4.2), -0.12), [car.x, car.z]);
await p.waitForTimeout(1200);
await p.screenshot({ path: `${dir}didi-${lang}-plate.png` });
await p.evaluate(([x, z]) => window.__bund.player.teleport(x + 2.3, z + 0.3, Math.atan2(2.3, 0), -0.15), [car.x, car.z]);
await p.waitForTimeout(1200);
const prompt = await p.evaluate(() => document.getElementById('prompt').classList.contains('on') ? document.getElementById('prompt').innerText : '');
ok(/DiDi|滴滴/.test(prompt), `prompt at the door: "${prompt.replace(/\n/g, ' ')}"`);
await p.keyboard.press('KeyE'); await p.waitForTimeout(2500);
ok(await p.evaluate(() => window.__bund.mode === 'ride'), 'E: in the back seat');
await p.screenshot({ path: `${dir}didi-${lang}-cabin.png` });
// ride: answer whatever comes up with 1 (engage)
let lines = 0, shots = 0;
for (let i = 0; i < 160; i++) {
  await p.waitForTimeout(1000);
  const st = await p.evaluate(() => ({ v: window.__bund.world.didi.car ? +window.__bund.world.didi.car.v.toFixed(1) : null, why: window.__bund.world.didi.car ? window.__bund.world.didi.car.why : '', fb: window.__bund.world.didi.car ? window.__bund.world.didi.car.forceBrake : 0, pk: window.__bund.world.didi.car && window.__bund.world.didi.car.pickup ? window.__bund.world.didi.car.pickup.state : '-', ch: !document.querySelector('#ride-sub .ch').classList.contains('hidden') && document.getElementById('ride-sub').classList.contains('on'), tx: document.querySelector('#ride-sub .tx').textContent, state: window.__bund.world.didi.state, card: window.__bund.world.rideFlow.card, z: window.__bund.world.didi.car ? window.__bund.world.didi.car.z : null }));
  if (st.ch) { lines++; if (shots < 2) { await p.screenshot({ path: `${dir}didi-${lang}-talk${shots++}.png` }); } await p.keyboard.press('Digit1'); }
  if (i % 8 === 0) console.log('t', i, st.state, st.z && st.z.toFixed(1), st.v, st.why, st.fb, st.pk);
  if (i === 12) await p.screenshot({ path: `${dir}didi-${lang}-road.png` });
  if (st.card) break;
}
const card = await p.evaluate(() => window.__bund.world.rideFlow.card);
ok(card, `arrived (answered ${lines} line(s) on the way)`);
await p.waitForTimeout(800);
await p.screenshot({ path: `${dir}didi-${lang}-card.png` });
const life = await p.evaluate(() => ({ rides: window.__bund.life.flags.rides, heard: window.__bund.life.flags.heard }));
ok(life.rides && life.rides.length === 1, `ride recorded: ${JSON.stringify(life.rides)}`);
await p.keyboard.press('KeyE'); await p.waitForTimeout(1500);
ok(await p.evaluate(() => window.__bund.mode === 'play'), 'back on the Bund, walking');
await p.screenshot({ path: `${dir}didi-${lang}-back.png` });
ok(errs.length === 0, `no errors (${errs.slice(0, 3).join(' | ')})`);
console.log(failed ? `${failed} FAILED` : 'all passed');
await b.close();
