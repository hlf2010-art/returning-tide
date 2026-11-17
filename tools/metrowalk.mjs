// Walkthrough: Line 2, East Nanjing Road -> Lujiazui, done the way a player does it. Down Exit 7's stairs,
// across the concourse, (with a bag: stopped at security, the bag on the belt), tap in at a gate, down the
// escalator, wait behind the screen doors, board the eastbound train, ride it under the river, off at
// Lujiazui, up, tap out (¥3 on Alipay), out by Exit 6 to Century Avenue. Screenshots on the way.
// (The plan, the floors and the timetable are tested in node: tests/metro.test.mjs.)
//   URL=http://localhost:4181/ OUT=<dir> UILANG=en|zh [BAG=1] [HOUR=10:00] [SHOTS=0] node tools/metrowalk.mjs
import { createRequire } from 'module';
import { STATIONS, GATE, gateP, ESC, PLAT, DOOR_AS, SEC, Y } from '../src/world/metroLayout.js';
const { chromium } = createRequire(import.meta.url)('playwright');
const url = process.env.URL || 'http://localhost:4181/', out = `${process.env.OUT || '.'}/`, lang = process.env.UILANG || 'en', hour = process.env.HOUR || '10:00', shots = process.env.SHOTS !== '0';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const p = await browser.newPage({ viewport: { width: Number(process.env.W || 960), height: Number(process.env.H || 540) } });
const errors = [];
p.on('console', (m) => { const t = m.text(); if (m.type() === 'error' && !/ERR_CONNECTION_REFUSED|8790|11434/.test(t)) errors.push(t.slice(0, 300)); if (/Metro built|Lujiazui built/.test(t)) console.log('  ' + t); });
p.on('pageerror', (e) => errors.push(e.message));
await p.goto(`${url}?q=4&nolock&fresh&legacy&lang=${lang}&life=0&hour=${hour}`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 300000 });
const ev = (f, a) => p.evaluate(f, a);
await ev(() => { window.__bund.start(); window.__bund.dtMax = 0.25; const s = document.createElement('style'); s.textContent = '#dev,#tip{display:none!important}'; document.head.appendChild(s); });
await p.waitForTimeout(1500);
const prompt = () => ev(() => (document.getElementById('prompt').classList.contains('on') ? document.getElementById('prompt').innerText.replace(/\n/g, ' ') : ''));
const body = () => ev(() => { const b = window.__bund.player.body; return { x: b.x, y: b.y, z: b.z }; });
const zone = () => ev(() => { const m = window.__bund.world.metro, z = m.zone; return { riding: m.riding, level: z && z.level, st: z && z.st.id, a: z && z.a, p: z && z.p, under: m.under }; });
const settle = (ms = 900) => p.waitForTimeout(ms);
const W = (st, a, pp) => st.F.toW(a, pp);
const stand = async (x, z, y, tx, ty, tz) => { await ev(([x, z, y, tx, ty, tz]) => { const B = window.__bund, eye = 1.68, d = Math.hypot(tx - x, tz - z); B.player.teleport(x, z, Math.atan2(-(tx - x), -(tz - z)), Math.atan2(ty - (y + eye), d), y); }, [x, z, y, tx, ty, tz]); };
const look = (tx, ty, tz) => ev(([tx, ty, tz]) => { const B = window.__bund, b = B.player.body, d = Math.hypot(tx - b.x, tz - b.z); B.player.yaw = Math.atan2(-(tx - b.x), -(tz - b.z)); B.player.pitch = Math.atan2(ty - (b.y + 1.68), d); }, [tx, ty, tz]);
async function walkTo(x, z, secs = 40) {
  secs *= Number(process.env.SLOW || 4);
  await p.keyboard.down('KeyW');
  const t0 = Date.now(); let d = 99;
  while (Date.now() - t0 < secs * 1000) {
    d = await ev(([x, z]) => { const B = window.__bund, b = B.player.body; B.player.yaw = Math.atan2(-(x - b.x), -(z - b.z)); B.player.pitch = -0.05; return Math.hypot(x - b.x, z - b.z); }, [x, z]);
    if (d < 0.45) break;
    await p.waitForTimeout(50);
  }
  await p.keyboard.up('KeyW');
  return d;
}
const walkL = (st, a, pp, secs) => walkTo(...W(st, a, pp), secs);
const shot = async (name) => { if (!shots) return; await settle(800); await p.screenshot({ path: `${out}metro-${name}.png`, timeout: 240000 }); console.log(`  shot metro-${name}.png`); };
const alipay = () => ev(() => window.__bund.life.wallet.alipay);
const [E, L] = STATIONS;

// ---- down Exit 7 ----
const ex7 = E.ways.exits.find((e) => e.exit === 7);
await stand(-482.2, -209.5, 0.15, -490, -4, -209.5);
await settle(2500);
await walkL(E, ex7.land[0] - 0.4, ex7.land[1], 30);
await walkL(E, -8, -8, 20);
let z = await zone();
ok(z.level === 'unpaid' && z.st === 'enr', `down Exit 7's stairs into East Nanjing Road's concourse (${JSON.stringify(z)})`);
await look(...W(E, GATE.a, 0), Y.C + 1.6);
await shot('enr-concourse');
// with a bag: security
if (process.env.BAG) {
  await ev(() => { window.__bund.life.inventory.push({ id: 'tea', kind: 'gift', name: '茶叶', where: 'me' }); });
  await walkL(E, SEC.a - 1.2, 1.0, 15); await walkL(E, SEC.a + 1.5, 1.0, 6);
  z = await zone(); ok(z.a < SEC.a, `with a bag, the officer stops you at the open way (a ${z.a.toFixed(2)})`);
  await walkL(E, SEC.a - 1.0, 4.6, 10); await look(...W(E, SEC.infeed, 3.25), Y.C + 0.8);
  await settle(600); const pr = await prompt(); ok(/belt|传送带/.test(pr), `at the belt: "${pr}"`);
  await p.keyboard.press('KeyE'); await settle(800);
  await shot('enr-security');
  await walkL(E, SEC.outfeed, 4.6, 12); await settle(3500); await walkL(E, SEC.belt.a1 + 1.2, 3.4, 8);
  z = await zone(); ok(z.a > SEC.a + 1, `bag screened, through security (a ${z.a.toFixed(2)})`);
}
// ---- the gates: tap in (no bag: the open way past security) ----
const gi = 6;
if (!process.env.BAG) { await walkL(E, SEC.a - 1.4, 0.9, 30); await walkL(E, SEC.a + 1.4, 0.9, 20); }
await walkL(E, GATE.a - 1.6, gateP(gi), 20);
await look(...W(E, GATE.a, gateP(gi)), Y.C + 0.9); await settle(500);
let pr = await prompt();
ok(/Tap in|刷/.test(pr), `at an entry gate: "${pr}"`);
await p.keyboard.press('KeyE'); await settle(400);
await shot('enr-gate-qr');
let opened = 0;
for (let k = 0; k < 40 && opened < 0.5; k++) { await settle(250); opened = await ev((i) => { const m = window.__bund.world.metro, g = m.gatesOf(m.debug.STATIONS[0])[i]; return Math.max(g.open, g.want); }, gi); }
ok(opened > 0.5, `the gate opens (${opened.toFixed(2)})`);
await walkL(E, GATE.a + 1.6, gateP(gi), 10);
z = await zone(); ok(z.level === 'paid', `through the gate onto the paid side (${z.level})`);
// ---- down the escalator ----
await walkL(E, ESC.aT - 2.0, 2.17, 15); await walkL(E, ESC.aT + 0.2, 2.17, 6);
await look(...W(E, ESC.aB, 2.17), Y.P + 1);
await shot('enr-escalator');
await walkL(E, ESC.aB + 2.5, 2.17, 40);
z = await zone(); ok(z.level === 'platform', `down to the platform (${z.level}, y ${(await body()).y.toFixed(2)})`);
// wait at a door for the eastbound train
const di = 18, da = DOOR_AS[di];
await walkL(E, ESC.aB + 2.6, 3.2, 8); await walkL(E, da + 0.9, 3.2, 20); await walkL(E, da + 0.9, 4.9, 6);
await look(...W(E, da - 12, 7.5), Y.P + 1.2);
await shot('enr-platform');
const waitFor = async (fn, arg, secs) => { const t0 = Date.now(); while (Date.now() - t0 < secs * 1000) { if (await ev(fn, arg)) return true; await p.waitForTimeout(250); } return false; };
const standing = (st) => { const m = window.__bund.world.metro; return m.trains.some((t) => t.dir === 1 && t.phase === 'dwell' && t.station === st && t.doors > 0.95 && t.dwellT < 18); };
ok(await waitFor(standing, 0, 240), 'an eastbound train comes in and opens its doors');
await look(...W(E, da, 7.6), Y.P + 1.3);
await shot('enr-train-in');
await walkL(E, da, 4.9, 5); await walkL(E, da, 7.3, 6);
z = await zone(); ok(z.riding, `aboard (${JSON.stringify(z)})`);
await walkTo(...W(E, da - 2.5, 7.7), 6);
await shot('car-standing');
const moving = () => { const m = window.__bund.world.metro, t = m.stats.rideTrain; return t && t.phase !== 'dwell' && t.v > 12; };
ok(await waitFor(moving, null, 90), 'the doors shut and the train pulls out');
const deep = () => window.__bund.player.body.y < -16 && window.__bund.world.metro.riding;
ok(await waitFor(deep, null, 240), `under the river, still aboard (${JSON.stringify(await body())})`);
await shot('car-tunnel');
const arrived = () => { const m = window.__bund.world.metro, t = m.stats.rideTrain; return t && t.phase === 'dwell' && t.station === 1 && t.doors > 0.95; };
ok(await waitFor(arrived, null, 240), 'at Lujiazui, doors open');
ok(await ev(() => window.__bund.world.ljz.built), 'Lujiazui was built on the way');
// ---- off, up, out ----
const bb = await body(), [la, lp] = L.F.toL(bb.x, bb.z);
const door = DOOR_AS.reduce((best, a) => (Math.abs(a - la) < Math.abs(best - la) ? a : best));
await walkL(L, door, 6.9, 5); await walkL(L, door, 4.6, 6);
z = await zone(); ok(z.level === 'platform' && z.st === 'ljz', `off onto Lujiazui's platform (${JSON.stringify(z)})`);
await walkL(L, door, 3.2, 6); await walkL(L, ESC.aB + 2.8, 3.2, 60); await walkL(L, ESC.aB + 2.8, -2.17, 6);
await walkL(L, ESC.aB + 0.6, -2.17, 6); await walkL(L, ESC.aT - 2.0, -2.17, 40);
z = await zone(); ok(z.level === 'paid' && z.st === 'ljz', `up the escalator to the concourse (${z.level})`);
await shot('ljz-concourse');
const go = 1, before = await alipay();
await walkL(L, GATE.a + 1.6, gateP(go), 20); await look(...W(L, GATE.a, gateP(go)), Y.C + 0.9); await settle(500);
pr = await prompt(); ok(/Tap out|出站/.test(pr), `at an exit gate: "${pr}"`);
await p.keyboard.press('KeyE'); await settle(1600);
ok(before - (await alipay()) === 3, `¥3 off Alipay (${before} -> ${await alipay()})`);
await walkL(L, GATE.a - 1.6, gateP(go), 10); await walkL(L, SEC.a - 1.2, -3.0, 20);
const e6 = L.ways.exits.find((e) => e.exit === 6);
await walkL(L, -6, 3, 20); await walkL(L, e6.land[0] + 2.6, 8, 20); await walkL(L, e6.land[0] + 2.6, e6.land[1], 15); await walkL(L, e6.land[0] - 0.5, e6.land[1], 10);
await walkL(L, e6.land[0] - 11, e6.land[1], 25);
const top = await body(), zl = await ev(() => window.__bund.world.ljz.zone(window.__bund.player.body));
ok(top.y > 0, `up Exit 6 to the street (${JSON.stringify(top)}, ${zl})`);
await shot('ljz-exit6');
const fps = await ev(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else r((n / 3).toFixed(1)); }; requestAnimationFrame(f); }));
console.log('  render', JSON.stringify(await ev(() => { const i = window.__bund.R.renderer.info; return { calls: i.render.calls, tris: i.render.triangles }; })));
console.log('  fps', fps, 'metro', JSON.stringify(await ev(() => { const s = window.__bund.world.metro.stats; return { rides: s.rides, folk: s.folk ? s.folk.agents.length : null }; })));
ok(errors.length === 0, `no console errors${errors.length ? ': ' + errors.slice(0, 5).join(' | ') : ''}`);
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nall passed'); process.exit(failed ? 1 : 0);
