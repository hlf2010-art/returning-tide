// Walkthrough: Lujiazui. Arrive by Line 2 and by DiDi, walk the ring bridge and its stairs, down into
// the Apple court and the spiral stair to the store, the metro exit, the Green's paths, IFC's lobby up
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
await p.goto(`${url}?q=4&nolock&fresh&lang=${lang}&life=0&hour=${hours[0]}`, { waitUntil: 'load' });
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
  const A = APPLE, T = LJZ.towers, m6 = METRO_LJZ[0], lob = LJZ.ifcLobbyDoor;
  const VIEWS = {
    'ring-pearl': [...applePt(-6, 30), 0.15, T.pearl.x, 120, T.pearl.z],
    'ring-under': [...polar(200, 62), 0.15, ...polar(120, 30).slice(0, 1), 5, polar(120, 30)[1]],
    'ring-deck': [...polar(200, 50), RING.y, T.pearl.x, 150, T.pearl.z],
    'ring-ifc': [...polar(SPUR.b - 14, 51), RING.y, A.x, 6, A.z],
    'ring-stairs': [RAMPS[1].bot[0] + RAMPS[1].dx * 7 + RAMPS[1].px * 6, RAMPS[1].bot[1] + RAMPS[1].dz * 7 + RAMPS[1].pz * 6, 0.15, RAMPS[1].top[0], 3.5, RAMPS[1].top[1]],
    'apple-street': [...applePt(-28, 30), 0.15, A.x, 2.5, A.z],
    'apple-court': [...applePt(-20, 13), A.yPlaza, A.x, 0.5, A.z],
    'apple-spiral': [...applePt(-8, 3.6), A.yPlaza, ...applePt(120, 3).slice(0, 1), -8.5, applePt(120, 3)[1]],
    'apple-store': [...applePt(70, 12.5), A.yStore, A.x, -8.4, A.z],
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
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
if (errors.length) console.log(`page errors:\n${errors.join('\n')}`);
await browser.close();
process.exit(failed || errors.length ? 1 : 0);
