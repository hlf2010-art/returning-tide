// Walkthrough: Lujiazui. Arrive by Line 2 and by DiDi, walk the ring bridge and its stairs, down into
// across the Apple plaza and down the spiral stair to the store, the metro exit, the Green's paths, IFC's lobby up
// to the 32nd floor and back; and photograph each landmark by day and at dusk.
// (The ground and collisions are tested in node: tests/lujiazui.test.mjs.)
//   URL=http://localhost:4181/ OUT=<dir> UILANG=en|zh [ONLY=shots|walk] [VIEWS=ring,apple] [HOURS=13:00,17:42] node tools/ljzwalk.mjs
import { createRequire } from 'module';
import { LJZ, C, RING, RAMPS, SPUR, APPLE, METRO_LJZ, polar, fromAP, applePt, wellPt } from '../src/world/lujiazuiLayout.js';
const { chromium } = createRequire(import.meta.url)('playwright');
const url = process.env.URL || 'http://localhost:4181/', out = `${process.env.OUT || '.'}/`, lang = process.env.UILANG || 'en', only = process.env.ONLY || '';
const views = (process.env.VIEWS || '').split(',').filter(Boolean), hours = (process.env.HOURS || '13:00,17:42').split(',');
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
p.on('console', (m) => { if (m.type() === 'error' && !/ERR_CONNECTION_REFUSED|8790|11434/.test(m.text())) errors.push(m.text().slice(0, 300)); if (/Lujiazui built/.test(m.text())) console.log('  ' + m.text()); });
p.on('pageerror', (e) => errors.push(e.message));
await p.goto(`${url}?q=4&nolock&fresh&legacy&lang=${lang}&life=0&hour=${hours[0]}`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 300000 });
const ev = (f, a) => p.evaluate(f, a);
await ev(() => { window.__bund.start(); window.__bund.dtMax = 0.2; const s = document.createElement('style'); s.textContent = '#dev,#tip{display:none!important}'; document.head.appendChild(s); });
await p.waitForTimeout(1200);
const prompt = () => ev(() => (document.getElementById('prompt').classList.contains('on') ? document.getElementById('prompt').innerText.replace(/\n/g, ' ') : ''));
const mode = (m, t = 120000) => p.waitForFunction((m) => window.__bund.mode === m, m, { timeout: t });
const body = () => ev(() => { const b = window.__bund.player.body; return { x: b.x, y: b.y, z: b.z }; });
const settle = (ms = 900) => p.waitForTimeout(ms);
// stand at (x, z, y) looking at (tx, ty, tz)
const stand = async (x, z, y, tx, ty, tz) => { await ev(([x, z, y, tx, ty, tz]) => { const B = window.__bund, eye = 1.68, d = Math.hypot(tx - x, tz - z); B.player.teleport(x, z, Math.atan2(-(tx - x), -(tz - z)), Math.atan2(ty - (y + eye), d), y); }, [x, z, y, tx, ty, tz]); };
// walk toward a point by steering the yaw and holding W (the real controls), until there or `secs` pass
async function walkTo(x, z, secs = 40, run = false) {
  await p.keyboard.down('KeyW'); if (run) await p.keyboard.down('ShiftLeft');
  const t0 = Date.now(); let d = 99;
  while (Date.now() - t0 < secs * 1000) {
    d = await ev(([x, z]) => { const B = window.__bund, b = B.player.body; B.player.yaw = Math.atan2(-(x - b.x), -(z - b.z)); return Math.hypot(x - b.x, z - b.z); }, [x, z]);
    if (d < 0.7) break;
    await p.waitForTimeout(60);
  }
  await p.keyboard.up('KeyW'); if (run) await p.keyboard.up('ShiftLeft');
  return d;
}
const shot = async (name) => { await settle(700); await p.screenshot({ path: `${out}ljz-${name}.png`, timeout: 180000 }); };
const setHour = (hm) => ev(([h, m]) => window.__bund.setHour(h, m), hm.split(':').map(Number));

// ---- photographs: each landmark by day and at dusk ----
if (only !== 'walk') {
  await stand(LJZ.kerbPickup.x, LJZ.kerbPickup.z, 0.15, C.x, 6, C.z);
  await p.waitForFunction(() => window.__bund.world.ljz.active, null, { timeout: 180000 });
  const st = await ev(() => window.__bund.world.ljz.stats);
  console.log('  built:', JSON.stringify(st));
  if (process.env.DIAG) console.log(await ev(() => window.__bund.scene.children.map((o) => { let n = 0; o.traverse((q) => { if ((q.isMesh || q.isPoints) && q.visible) n++; }); return `${o.name || o.type}:${o.visible ? '' : 'hidden:'}${n}`; }).join('  ')));
  const A = APPLE, T = LJZ.towers, m6 = METRO_LJZ[0], lob = LJZ.ifcLobbyDoor;
  const VIEWS = {
    'ring-pearl': [...applePt(-6, 30), 0.15, T.pearl.x, 120, T.pearl.z],
    'ring-under': [...polar(200, 62), 0.15, ...polar(120, 30).slice(0, 1), 5, polar(120, 30)[1]],
    'ring-deck': [...polar(200, 50), RING.y, T.pearl.x, 150, T.pearl.z],
    'ring-ifc': [...polar(SPUR.b - 14, 51), RING.y, A.x, 6, A.z],
    'ring-stairs': [RAMPS[1].bot[0] + RAMPS[1].dx * 7 + RAMPS[1].px * 6, RAMPS[1].bot[1] + RAMPS[1].dz * 7 + RAMPS[1].pz * 6, 0.15, RAMPS[1].top[0], 3.5, RAMPS[1].top[1]],
    'apple-street': [...applePt(-28, 30), 0.15, A.x, 2.5, A.z],
    'apple-plaza': [...applePt(-20, 15), A.yPlaza, A.x, 5, A.z],
    'apple-mall': [...applePt(-10, 21), A.yPlaza, ...applePt(180, 30).slice(0, 1), 10, applePt(180, 30)[1]],
    'apple-pearl': [...applePt(196, 26.5), A.yPlaza, T.pearl.x, 60, T.pearl.z],
    'apple-spiral': [...applePt(-8, 3.6), A.yPlaza, ...applePt(120, 3).slice(0, 1), A.yPlaza - 3.3, applePt(120, 3)[1]],
    'apple-store': [...applePt(70, 12.5), A.yStore, A.x, A.yStore + 1.6, A.z],
    'apple-forum': [...applePt(20, 9), A.yStore, ...applePt(242, 19).slice(0, 1), A.yStore + 2, applePt(242, 19)[1]],
    'ifc-corner': [...fromAP(40, 22), 0.15, ...fromAP(150, 90).slice(0, 1), 70, fromAP(150, 90)[1]],
    'ifc-lobby': [LJZ.kerbPickup.x - 14, LJZ.kerbPickup.z - 2, 0.15, lob.x, 6, lob.z],
    'ifc-towers': [...fromAP(120, -30), 0.15, T.ifcNorth.x, 150, T.ifcNorth.z],
    'metro-exit6': [...wellPt(m6, -7, 3.5), 0.15, ...wellPt(m6, 4), 1.5].map((v, i, a) => (i === 4 ? a[5] : i === 5 ? a[4] : v)),
    'metro-landing': [...wellPt(m6, m6.run - 2.5), -3.0, ...wellPt(m6, m6.len), -3.2].map((v, i, a) => (i === 4 ? a[5] : i === 5 ? a[4] : v)),
    'century': [...fromAP(130, -22), 0.15, ...fromAP(520, -4).slice(0, 1), 30, fromAP(520, -4)[1]],
    'junction': [...fromAP(214, -22), 0.15, ...fromAP(250, -2).slice(0, 1), 2, fromAP(250, -2)[1]],
    'green-gate': [...fromAP(262, -40), 0.15, ...fromAP(330, -150).slice(0, 1), 3, fromAP(330, -150)[1]],
    'green-lake': [...fromAP(352, -238), 0.15, T.jinmao.x, 150, T.jinmao.z],
    'green-pearl': [...fromAP(500, -150), 0.15, T.pearl.x, 110, T.pearl.z],
    'skyline': [...polar(40, 51), RING.y, T.shanghaiTower.x, 250, T.shanghaiTower.z],
    'west': [...polar(262, 100), 0.15, 0, 10, -40],
  };
  for (const hm of hours) {
    await setHour(hm); await settle(1500);
    for (const [name, v] of Object.entries(VIEWS)) {
      if (views.length && !views.some((k) => name.includes(k))) continue;
      await stand(...v); await shot(`${name}-${hm.replace(':', '')}`);
    }
    if (!views.length || views.includes('air')) {                // from above (the camera lifted off the player: for checking the layout only)
      await ev(([cx, cz]) => { const B = window.__bund, pu = B.player.update; B.__pu = pu; B.player.update = (dt) => { pu(dt); B.camera.position.set(cx - 150, 330, cz + 330); B.camera.lookAt(cx + 130, 0, cz + 40); }; }, [C.x, C.z]);
      await shot(`air-${hm.replace(':', '')}`);
      await ev(([cx, cz]) => { const B = window.__bund; B.player.update = (dt) => { B.__pu(dt); B.camera.position.set(cx + 20, 95, cz + 150); B.camera.lookAt(cx + 30, 0, cz + 40); }; }, [C.x, C.z]);
      await shot(`air-ring-${hm.replace(':', '')}`);
      await ev(() => { const B = window.__bund; B.player.update = B.__pu; });
    }
    const info = await ev(() => { const r = window.__bund.R.renderer.info.render; return { calls: r.calls, tris: r.triangles }; });
    console.log(`  ${hm}: last frame ${info.calls} draw calls, ${info.tris} triangles`);
  }
}
if (only === 'shots') { console.log(errors.length ? `errors:\n${errors.join('\n')}` : 'no page errors'); await browser.close(); process.exit(errors.length ? 1 : 0); }
// ---- the walk ----
await ev(() => { window.__bund.dtMax = 0.25; });
const waitPrompt = (re, t = 90000) => p.waitForFunction((src) => { const e = document.getElementById('prompt'); return e.classList.contains('on') && new RegExp(src, 'i').test(e.innerText); }, re.source, { timeout: t }).then(() => true).catch(() => false);
const ledger = () => ev(() => window.__bund.life.wallet.ledger.slice(-1)[0]);
const near = (b, q, d = 1.5) => Math.hypot(b.x - q.x, b.z - q.z) < d;
// 1. Line 2 from East Nanjing Road: out at Exit 6, up to the street
await setHour('13:00');
await ev(() => window.__bund.player.teleport(-493.4, -209.5, Math.PI / 2, 0.05, -4.6));
ok(await waitPrompt(/Lujiazui|陆家嘴/), 'East Nanjing Road, Exit 7\'s landing: the way in offers one stop to Lujiazui');
await p.keyboard.press('KeyE');
await p.waitForFunction(() => window.__bund.player.body.x > 500 && window.__bund.mode === 'play', null, { timeout: 180000 }).catch(() => {});
let b = await body();
ok(near(b, LJZ.metroArrive) && Math.abs(b.y + 4.6) < 0.1 && await ev(() => window.__bund.world.ljz.active && !window.__bund.world.dest.here), `by metro: on Exit 6's landing under Century Avenue (y ${b.y.toFixed(2)}), not on the 32nd floor`);
{ const l = await ledger(); ok(l && l.amount === -3, 'the fare (¥3) is in the wallet'); }
const m6 = METRO_LJZ[0];
await walkTo(...wellPt(m6, -2.5), 60); b = await body();
ok(Math.abs(b.y - 0.15) < 0.06, `up Exit 6's stairs to the pavement (y ${b.y.toFixed(2)})`);
await shot('walk-exit6-top');
// 2. the ring: up the spur's stairs from the Apple side, round to the east stair, down
const SR = RAMPS[RAMPS.length - 1], ER = RAMPS[1];
await ev(([x, z]) => window.__bund.player.teleport(x, z, 0, 0), [SR.bot[0] + SR.dx * 2, SR.bot[1] + SR.dz * 2]);
await walkTo(...polar(SPUR.b, 51), 90, true); b = await body();
ok(Math.abs(b.y - RING.y) < 0.06, `up the stairs from the Apple side onto the ring (y ${b.y.toFixed(2)})`);
for (const bb of [136, 122, 108, 95, 85]) await walkTo(...polar(bb, 50.5), 60, true);
b = await body();
ok(Math.abs(b.y - RING.y) < 0.06 && Math.abs(Math.hypot(b.x - C.x, b.z - C.z) - 50.5) < 2, 'round the deck over Century Avenue (the traffic passes underneath)');
await walkTo(...polar(90, 80), 6, true); b = await body();
ok(Math.hypot(b.x - C.x, b.z - C.z) < RING.r1 && Math.abs(b.y - RING.y) < 0.06, 'the deck\'s rail holds');
await walkTo(...polar(82, 53), 20); await walkTo(ER.bot[0] + ER.dx * 2, ER.bot[1] + ER.dz * 2, 90, true); b = await body();
ok(Math.abs(b.y - 0.15) < 0.06, `down the east stair to Century Avenue's north pavement (y ${b.y.toFixed(2)})`);
await walkTo(C.x, C.z, 8, true); b = await body();
ok(Math.hypot(b.x - C.x, b.z - C.z) > RING.road - 0.05, 'at street level the roundabout\'s kerb rail holds: the ring is the way across');
// 3. Apple: across the plaza (street level), in by the cylinder's door, down the spiral to the store, back up
await ev(([x, z]) => window.__bund.player.teleport(x, z, 0, 0), applePt(-40, 27));
await walkTo(...applePt(0, 9), 40); b = await body();
ok(Math.abs(b.y - APPLE.yPlaza) < 0.08 && APPLE.yPlaza === 0.15, `across the plaza to the cylinder, no steps (y ${b.y.toFixed(2)})`);
await walkTo(...applePt(0, 3.3), 20);
b = await body();
ok(Math.hypot(b.x - APPLE.x, b.z - APPLE.z) < APPLE.rCyl, 'in through the cylinder\'s door');
await shot('walk-cylinder');
for (let a = 40; a <= 420; a += 20) await walkTo(...applePt(a, 3.2), 20);
b = await body();
ok(b.y < APPLE.yStore + 0.4, `down the spiral glass stair (y ${b.y.toFixed(2)})`);
await walkTo(...applePt(72, 8.5), 20); b = await body();
ok(Math.abs(b.y - APPLE.yStore) < 0.05 && await ev(() => window.__bund.world.ljz.zone(window.__bund.player.body) === 'apple'), 'out at its foot into the store under the plaza');
{ const t = APPLE.tables[1], [tx, tz] = applePt(t.ang, t.r), [sx, sz] = applePt(t.ang + 12, t.r); await stand(sx, sz, APPLE.yStore, tx, APPLE.yStore + 1, tz); }
ok(await waitPrompt(/devices|样机/), 'the store: a table to look at');
await stand(...applePt(72, 8.5), APPLE.yStore, APPLE.x, APPLE.yStore + 1.6, APPLE.z);
await walkTo(...applePt(66, 3.2), 20); for (let a = 400; a >= 40; a -= 20) await walkTo(...applePt(a, 3.2), 20);
await walkTo(...applePt(0, 3.2), 20); await walkTo(...applePt(0, 8), 20); b = await body();
ok(Math.abs(b.y - APPLE.yPlaza) < 0.08 && Math.hypot(b.x - APPLE.x, b.z - APPLE.z) > APPLE.rCyl, 'back up the spiral and out on to the plaza');
// 4. the Green: in at the corner, along the path to the lake, which is water
await ev(([x, z]) => window.__bund.player.teleport(x, z, 0, 0), [LJZ.greenGate.x, LJZ.greenGate.z]);
await walkTo(...fromAP(290, -100), 60, true); await walkTo(...fromAP(330, -178), 90, true); b = await body();
ok(await ev(() => window.__bund.world.ljz.zone(window.__bund.player.body) === 'green') && Math.abs(b.y - 0.15) < 0.05, 'the Central Green: in at the corner gate and along the path');
await walkTo(...fromAP(384, -214), 25, true);
{ const [a, pp] = (await ev(() => window.__bund.world.ljz.debug.toAP(window.__bund.player.body.x, window.__bund.player.body.z))); ok(((a - 384) / 30) ** 2 + ((pp + 214) / 22) ** 2 >= 0.98, 'the lake is water: you stop at its edge'); }
await shot('walk-green');
// 5. by DiDi; IFC: the lobby door up to the 32nd floor, the lift back down to the lobby
await ev(() => { const L = window.__bund.life, i = L.invites.find((q) => q.id === 'xuan-arm'); if (i) { i.at = L.clock.day * 1440 + L.clock.minute; i.status = 'accepted'; i.kept = false; } });
const hasInvite = await ev(() => !!window.__bund.life.invites.find((q) => q.id === 'xuan-arm'));
await ev(() => window.__bund.world.dest.arrive('lujiazui', { method: 'wechat', fare: 31.5, invite: window.__bund.life.invites.find((q) => q.id === 'xuan-arm') ? 'xuan-arm' : null }));   // what a DiDi's arrival calls (world/rideFlow.js finish)
await p.waitForFunction(([x, z]) => { const q = window.__bund.player.body; return Math.hypot(q.x - x, q.z - z) < 1 && window.__bund.mode === 'play'; }, [LJZ.kerbPickup.x, LJZ.kerbPickup.z], { timeout: 120000 }).catch(() => {});
b = await body();
ok(near(b, LJZ.kerbPickup, 1) && Math.abs(b.y - 0.15) < 0.05 && !(await ev(() => window.__bund.world.dest.here)), 'by DiDi (the arrival a ride ends with): set down at IFC\'s kerb on Century Avenue, at street level');
await shot('walk-kerb');
const lob = LJZ.ifcLobbyDoor;
await walkTo(lob.x + lob.nx * 2.6, lob.z + lob.nz * 2.6, 60);
await stand(lob.x + lob.nx * 2.6, lob.z + lob.nz * 2.6, 0.15, lob.x, 1.6, lob.z);
ok(await waitPrompt(/lift|电梯/), `IFC's lobby door: "${await prompt()}"`);
await p.keyboard.press('KeyE');
await p.waitForFunction(() => window.__bund.world.dest.here === 'lujiazui' && window.__bund.player.body.y > 130 && window.__bund.mode === 'play', null, { timeout: 120000 }).catch(() => {});
b = await body();
ok(Math.abs(b.y - 134.4) < 0.1, `up to the 32nd floor (y ${b.y.toFixed(1)})`);
ok(await ev((h) => !h || (window.__bund.world.dest.scene && window.__bund.world.dest.scene.invite === 'xuan-arm'), hasInvite), `the invitation you came for is the scene you walk into (invite present: ${hasInvite})`);
ok(await ev(() => !window.__bund.world.ljz.active), 'up there the street is put away');
await stand(LJZ.officeLift.x - 1.8, LJZ.officeLift.z, 134.4, LJZ.officeLift.x, 135.8, LJZ.officeLift.z);
ok(await waitPrompt(/lobby|大堂/), `the lift on 32F: "${await prompt()}"`);
await p.keyboard.press('KeyE');
await p.waitForFunction(() => !window.__bund.world.dest.here && window.__bund.player.body.y < 2 && window.__bund.mode === 'play', null, { timeout: 120000 }).catch(() => {});
b = await body();
ok(near(b, LJZ.ifcLobbyStand, 1) && await ev(() => window.__bund.world.ljz.active), 'the lift comes down to the lobby: back on Century Avenue');
// 6. back to the Bund: a car from the kerb; then again by Line 2
const K = LJZ.kerbPickup, [aux, auz] = [Math.sin(114.7 * Math.PI / 180), -Math.cos(114.7 * Math.PI / 180)];
await stand(K.x, K.z, 0.15, K.x - aux * 3.2, 2.3, K.z - auz * 3.2);
ok(await waitPrompt(/Bund|外滩/), `the ride-hailing point: "${await prompt()}"`);
await p.keyboard.press('KeyE');
await p.waitForFunction(() => window.__bund.player.body.x < 30 && window.__bund.mode === 'play', null, { timeout: 120000 }).catch(() => {});
b = await body();
{ const l = await ledger(); ok(b.x < 0 && Math.abs(b.z + 19.7) < 2 && l && /滴滴/.test(l.to) && await ev(() => !window.__bund.world.ljz.active && window.__bund.scene.getObjectByName('street').visible), `a car back through the tunnel: on the Bund at the pick-up point, ¥${l && -l.amount} paid, the Bund drawn again`); }
await shot('walk-bund-again');
await stand(...wellPt(m6, m6.len - 1.8), -m6.depth, ...wellPt(m6, m6.len).slice(0, 1), -m6.depth + 1.6, wellPt(m6, m6.len)[1]);
ok(await waitPrompt(/East Nanjing|南京东路/), `Lujiazui station, Exit 6's landing: "${await prompt()}"`);
await p.keyboard.press('KeyE');
await p.waitForFunction(() => window.__bund.player.body.x < -400 && window.__bund.mode === 'play', null, { timeout: 180000 }).catch(() => {});
b = await body();
ok(b.x < -480 && Math.abs(b.y + 4.6) < 0.1, 'Line 2 back: on East Nanjing Road station\'s landing');
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
if (errors.length) console.log(`page errors:\n${errors.join('\n')}`);
await browser.close();
process.exit(failed || errors.length ? 1 : 0);
