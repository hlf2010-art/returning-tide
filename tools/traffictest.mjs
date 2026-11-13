// Dev tool: the crossing in the real page: signal heads follow the controller, vehicle meshes
// follow the sim, brake lights / wheels animate, the player crosses with real key presses,
// pause freezes everything, no console errors, draw-call cost of the traffic.
//   NODE_PATH=$(npm root -g) node tools/traffictest.mjs [url] [outDir]
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const [url = 'http://localhost:5173/', out = '.'] = process.argv.slice(2);
let failed = 0;
const ok = (c, msg) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`); if (!c) failed++; };
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url + '?q=5&nolock', { waitUntil: 'load' });
await page.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 240000 });
await page.click('#begin'); await page.waitForTimeout(1200);
const ev = (f, a) => page.evaluate(f, a);
// Software GL runs a few fps; advance the (frame-rate independent) sim directly between frames.
const advance = (sec) => ev((sec) => {
  const b = window.__bund, p = b.player.body;
  for (let i = 0; i < sec * 30; i++) b.traffic.update(1 / 30, { player: p.y > 1 ? null : { x: p.x, z: p.z, vx: p.vx, vz: p.vz } });
}, sec);
const until = async (cond, maxSec = 200) => { for (let s = 0; s < maxSec; s += 0.5) { if (await ev(cond)) return true; await advance(0.5); } return false; };
const tp = (x, z, yaw, pitch = 0) => ev(([x, z, y, p]) => window.__bund.player.teleport(x, z, y, p), [x, z, yaw, pitch]);

// 1. heads mirror the controller through a whole cycle
const headState = () => ev(() => {
  const b = window.__bund, sig = b.scene.getObjectByName('crossing-signals');
  const lens = sig.children.filter((m) => m.geometry && m.geometry.type === 'CircleGeometry');
  const lit = lens.filter((m) => m.material.color.r + m.material.color.g > 3).map((m) => (m.material.color.r > 3 && m.material.color.g > 2 ? 'yellow' : m.material.color.r > 3 ? 'red' : 'green'));
  return { phase: b.traffic.controller.phase, veh: b.traffic.controller.vehAspect, ped: b.traffic.controller.pedAspect, lit: [...new Set(lit)] };
});
const seen = new Set(); let mismatch = 0;
for (let i = 0; i < 160; i++) {
  await ev(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));   // two real frames copy state to the heads
  const h = await headState();
  seen.add(h.phase);
  const want = h.veh === 'green-flash' ? null : h.veh;
  if (want && (h.lit.length !== 1 || h.lit[0] !== want)) mismatch++;
  await advance(0.5);
}
ok(['VG', 'VGF', 'VY', 'AR1', 'PW', 'PF', 'AR2'].every((p) => seen.has(p)), `observed every phase in the page (${[...seen].join(' ')})`);
ok(mismatch === 0, 'vehicle heads always show exactly the controller\'s aspect');
await tp(-1.5, 13, Math.atan2(15.5, 15), 0.08);
await until(() => window.__bund.traffic.controller.vehAspect === 'red' && window.__bund.traffic.vehicles.some((v) => v.active && v.v < 0.05 && v.s > -30 && v.s < -5));
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/tr-red-queue.png` });

// 2. meshes follow the sim; brake lights; wheels turn
const meshCheck = await ev(() => {
  const b = window.__bund; let worst = 0, brakeOk = true, spinning = 0;
  for (const v of b.traffic.vehicles) {
    const g = b.scene.getObjectByName(`vehicle-${v.id}`);
    if (!v.active) { if (g.visible) worst = 99; continue; }
    worst = Math.max(worst, Math.hypot(g.position.x - v.x, g.position.z - v.z));
  }
  return { worst };
});
ok(meshCheck.worst < 0.6, `vehicle meshes sit on their simulated positions (worst lag ${meshCheck.worst.toFixed(2)} m within one frame)`);
const brake = await ev(() => {
  const b = window.__bund, stopped = b.traffic.vehicles.find((v) => v.active && v.v < 0.05 && v.braking);
  if (!stopped) return null;
  const g = b.scene.getObjectByName(`vehicle-${stopped.id}`);
  let max = 0; g.traverse((o) => { if (o.material && o.material.isMeshBasicMaterial && o.material.color.r > o.material.color.g * 5) max = Math.max(max, o.material.color.r); });
  return { id: stopped.id, max };
});
ok(brake && brake.max > 3, `a stopped vehicle (${brake && brake.id}) shows bright brake lamps (r=${brake && brake.max.toFixed(1)})`);
const wheel0 = await ev(() => { const b = window.__bund, v = b.traffic.vehicles.find((q) => q.active && q.v > 3); if (!v) return null; const g = b.scene.getObjectByName(`vehicle-${v.id}`); let w = null; g.traverse((o) => { if (!w && o.visibleOwner !== undefined) w = o; }); return { id: v.id, rx: w.rotation.x }; });
await advance(0.3); await page.waitForTimeout(400);
const wheel1 = wheel0 && await ev((id) => { const g = window.__bund.scene.getObjectByName(`vehicle-${id}`); let w = null; g.traverse((o) => { if (!w && o.visibleOwner !== undefined) w = o; }); return w.rotation.x; }, wheel0.id);
ok(wheel0 && Math.abs(wheel1 - wheel0.rx) > 0.1, `wheels of a moving vehicle (${wheel0 && wheel0.id}) turn`);

// 3. the player crosses on the green figure with real key presses
await tp(-3.4, 0.6, Math.PI / 2, 0);                                              // east kerb, facing west
await until(() => window.__bund.traffic.controller.pedAspect === 'walk');
let unsafe = 0;
await page.keyboard.down('ShiftLeft'); await page.keyboard.down('KeyW');
for (let i = 0; i < 400; i++) {
  await page.waitForTimeout(150);
  const s = await ev(() => { const b = window.__bund; return { x: b.player.body.x, veh: b.traffic.controller.vehAspect, conf: b.traffic.stats.pedConflicts }; });
  if (s.x > -28 && s.x < -4 && s.veh !== 'red') unsafe++;
  if (i === 6) await page.screenshot({ path: `${out}/tr-player-crossing.png` });
  if (s.x < -28.6) break;
}
await page.keyboard.up('KeyW'); await page.keyboard.up('ShiftLeft');
const after = await ev(() => ({ x: window.__bund.player.body.x, conf: window.__bund.traffic.stats.pedConflicts, phase: window.__bund.traffic.controller.phase }));
ok(after.x < -28.4, `player reached the west kerb (x=${after.x.toFixed(1)})`);
ok(unsafe === 0 && after.conf === 0, 'vehicles stayed red the whole time the player was on the carriageway');

// 4. pause freezes traffic; resume continues
await page.keyboard.press('Escape'); await page.waitForTimeout(400);
const p0 = await ev(() => ({ mode: window.__bund.mode, s: window.__bund.traffic.vehicles.map((v) => v.s).join(), ped: window.__bund.traffic.peds.map((p) => p.x.toFixed(3)).join(), t: window.__bund.traffic.controller.time }));
await page.waitForTimeout(2500);
const p1 = await ev(() => ({ s: window.__bund.traffic.vehicles.map((v) => v.s).join(), ped: window.__bund.traffic.peds.map((p) => p.x.toFixed(3)).join(), t: window.__bund.traffic.controller.time }));
ok(p0.mode === 'pause' && p0.s === p1.s && p0.ped === p1.ped && p0.t === p1.t, 'pause: vehicles, pedestrians and signal timers all hold');
await page.keyboard.press('Escape'); await page.waitForTimeout(1500);
const p2 = await ev(() => ({ mode: window.__bund.mode, t: window.__bund.traffic.controller.time }));
ok(p2.mode === 'play' && p2.t !== p1.t, 'resume: the signal timer runs again');

// 5. existing story NPCs and Mission One untouched
const story = await ev(() => ({ lin: !!window.__bund.scene.getObjectByName('npc-lin'), su: !!window.__bund.scene.getObjectByName('npc-su'), mission: window.__bund.mission.step }));
ok(story.lin && story.su && story.mission === 'idle', 'Old Lin, Ms. Su and Mission One are still there');

// 6. what the traffic costs in draw calls
const calls = await ev(() => new Promise((res) => {
  const b = window.__bund; b.player.teleport(-1.5, 13, Math.atan2(15.5, 15), 0.05);
  const groups = ['traffic-vehicles', 'crossing-signals', 'crossing-pedestrians'].map((n) => b.scene.getObjectByName(n));
  // (the wheel instancer lives inside traffic-vehicles)
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const on = b.R.renderer.info.render.calls;
    groups.forEach((g) => { g.visible = false; });
    requestAnimationFrame(() => requestAnimationFrame(() => { const off = b.R.renderer.info.render.calls; groups.forEach((g) => { g.visible = true; }); res({ on, off }); }));
  }));
}));
console.log(`INFO  draw calls looking at the crossing: ${calls.on} with traffic, ${calls.off} without (+${calls.on - calls.off})`);
ok(errors.length === 0, `no console errors (${errors.slice(0, 3).join(' | ')})`);
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
await browser.close();
process.exit(failed ? 1 : 0);
