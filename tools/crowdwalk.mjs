// Walkthrough: the evening crowd at the Hankou Road crossing and on the promenade, in the real game.
// Counts, while it runs: contacts between passers-by (two bodies touching while moving into each
// other, as engine/social.js detectBumps sees them; once per pair per 8 s), your own bumps (world/bumps.js),
// and people stuck (wanting to walk, going nowhere for more than 2 s), and where. Then a close look
// at a bump: a near person's spine and head during their flinch.
//   (npx vite --port 4193 --strictPort) URL=http://localhost:4193/ SECS=60 node tools/crowdwalk.mjs
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const url = process.env.URL || 'http://localhost:4193/', SECS = Number(process.env.SECS || 60), out = process.env.OUT || null;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const p = await browser.newPage({ viewport: { width: 640, height: 360 } });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
await p.goto(`${url}?q=5&crowd=1&nolock&fresh&lang=en&tod&hour=19:30&shadows=0`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 600000 });
const ev = (f, a) => p.evaluate(f, a);
await ev(() => { window.__bund.start(); window.__bund.dtMax = 1 / 15; });
await p.waitForFunction(() => window.__bund.world && window.__bund.world.crowd && window.__bund.world.crowdView, null, { timeout: 600000 });
await p.waitForTimeout(1500);
// the counters, hooked onto the crowd's own update (so they see every step, whatever the frame rate)
await ev(() => {
  const B = window.__bund, c = B.world.crowd, memo = new Map(), still = new Map();
  const M = window.__m = { steps: 0, simT: 0, contacts: 0, stuck: 0, stuckIds: new Set(), where: {}, player: 0, pb: new Map() };
  const together = (a, o) => o === a.partner || o === a.leader || o.leader === a || (a.leader && o.leader === a.leader) || (a.group && o.group === a.group);
  const zone = (a) => (a.y > 1.5 ? 'promenade' : Math.abs(a.x + 28) < 1.6 ? 'west kerb' : Math.abs(a.x + 4) < 1.6 ? 'east kerb' : a.x < -28 && Math.abs(Math.abs(a.z) - 4) < 1.4 ? 'Hankou kerb' : a.x > -4 ? 'east pavement' : 'west side');
  const u = c.update.bind(c);
  c.update = (dt, o) => {
    for (const a of c.agents) { a._px = a.x; a._pz = a.z; }
    u(dt, o);
    if (dt <= 0) return;
    M.steps++; M.simT += dt;
    const live = c.agents.filter((a) => !a.gone);
    const cell = new Map(), key = (x, z) => `${Math.floor(x / 2)},${Math.floor(z / 2)}`;
    for (const a of live) { a._sp = Math.hypot(a.x - a._px, a.z - a._pz) / dt; const k = key(a.x, a.z); (cell.get(k) || cell.set(k, []).get(k)).push(a); }
    for (const a of live) {
      const cx = Math.floor(a.x / 2), cz = Math.floor(a.z / 2);
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const b of cell.get(`${cx + i},${cz + j}`) || []) {
        if (b.id <= a.id || together(a, b) || Math.abs(a.y - b.y) > 1) continue;
        const px = b.x - a.x, pz = b.z - a.z, d = Math.hypot(px, pz);
        if (d > 0.57 || d < 1e-6) continue;
        const cl = (a.vx * px + a.vz * pz) / d - (b.vx * px + b.vz * pz) / d;
        if (cl < 0.25) continue;
        const k = a.id * 100003 + b.id; if (M.simT - (memo.get(k) ?? -1e9) < 8) continue;
        memo.set(k, M.simT); M.contacts++;
      }
      const boss = a.kind === 'follower' ? a.group.guide : a.leader;
      if ((a.state === 'walk' || a.state === 'cross') && (!boss || boss._sp > 0.3) && a._sp < 0.12) {
        const s = (still.get(a) || 0) + dt; still.set(a, s);
        if (s > 2 && s - dt <= 2) { M.stuck++; M.stuckIds.add(a.id); const z = zone(a); M.where[z] = (M.where[z] || 0) + 1; }
      } else still.delete(a);
    }
  };
});
// The page renders slowly in software (a few frames a second), so the counts come from stepping the
// game's own crowd and crossing (world.crowd, traffic) in the page at 30 steps a second, with you
// standing at the east kerb and then walking the promenade against the flow (2.2 m/s, never giving way).
const sim = await ev(async (SECS) => {
  const B = window.__bund, c = B.world.crowd, T = B.traffic, dt = 1 / 30, me = { x: -2.6, z: 3.0, y: 0.15, vx: 0, vz: 0 };
  B.dtMax = 1e-6;                                                   // (the game itself all but holds still meanwhile)
  for (let f = 0; f < SECS * 30; f++) {
    if (f === SECS * 15) Object.assign(me, { x: 17.6, z: -60, y: 3, vx: 0, vz: 2.2 });
    if (f >= SECS * 15) { me.z += me.vz * dt; if (me.z > 60 || me.z < -60) me.vz = -me.vz; }
    T.update(dt, { player: me.y < 1 ? me : null });
    c.setSignal(T.controller.pedAspect, dt); c.setSignal(B.world.henan.traffic.controller.pedAspect, dt, 'henan');
    B.world.henan.traffic.update(dt, {});
    c.update(dt, { player: me, others: T.peds });
    // your bumps, as world/bumps.js counts them (two bodies touching, moving into each other)
    for (const a of c.agents) if (!a.gone && Math.abs(a.y - me.y) < 1.2) {
      const px = a.x - me.x, pz = a.z - me.z, d = Math.hypot(px, pz);
      if (d < 0.69 && d > 1e-6 && ((me.vx - a.vx) * px + (me.vz - a.vz) * pz) / d > 0.25 && (window.__m.pb.get(a.id) ?? -1e9) < window.__m.simT - 8) { window.__m.pb.set(a.id, window.__m.simT); window.__m.player++; }
    }
    if (f % 300 === 299) await new Promise((r) => setTimeout(r, 0));
  }
  B.dtMax = 1 / 15;
  const M = window.__m;
  return { simSeconds: +M.simT.toFixed(0), people: c.count(), contactsPerMin: +(M.contacts / (M.simT / 60)).toFixed(1), playerBumpsPerMin: +(M.player / (SECS / 2 / 60)).toFixed(2), stuckEvents: M.stuck, stuckPeople: M.stuckIds.size, stuckWhere: M.where };
}, SECS);
console.log('in-page sim:', JSON.stringify(sim));
const tp = (x, z, yaw = 0) => ev(([x, z, y]) => window.__bund.player.teleport(x, z, y, 0), [x, z, yaw]);
// 1) standing at the crossing's east kerb, by the people waiting for the green man
await tp(-2.6, 3.0, Math.PI / 2);
const t0 = Date.now();
while (Date.now() - t0 < 8000) await p.waitForTimeout(1000);
// 2) walking the promenade's main walk against the flow, never giving way (W held, turning round at the ends)
await tp(17.6, -60, Math.PI);
await p.keyboard.down('KeyW');
const t1 = Date.now();
while (Date.now() - t1 < 8000) {
  await p.waitForTimeout(500);
  const z = await ev(() => window.__bund.player.body.z);
  if (z > 50) await ev(() => { window.__bund.player.yaw = 0; });
  if (z < -60) await ev(() => { window.__bund.player.yaw = Math.PI; });
}
await p.keyboard.up('KeyW');
const r = await ev(() => {
  const M = window.__m, B = window.__bund, log = B.bumps ? B.bumps.log : [];
  const mine = log.filter((e) => e.with === 'player').length;
  return { simSeconds: +M.simT.toFixed(0), steps: M.steps, people: B.world.crowd.count(), contactsPerMin: +(M.contacts / (M.simT / 60)).toFixed(1), playerBumpLogged: mine, stuckEvents: M.stuck, stuckPeople: M.stuckIds.size, stuckWhere: M.where, flinchNow: B.world.crowd.agents.filter((a) => a.flinch).length };
});
console.log(JSON.stringify(r));
// 3) a bump, up close: walk into the nearest person and watch their spine and head for 0.6 s
const fl = await ev(async () => {
  const B = window.__bund, c = B.world.crowd, v = B.world.crowdView;
  const near = v.nearAgents().filter((a) => !a.gone && a.state === 'walk' && Math.abs(a.y - B.player.body.y) < 1).sort((a, b) => Math.hypot(a.x - B.player.body.x, a.z - B.player.body.z) - Math.hypot(b.x - B.player.body.x, b.z - B.player.body.z))[0];
  if (!near || !c.flinch) return { near: !!near, flinch: !!c.flinch };
  const body = v.bodyOf(near); if (!body) return { body: false };
  const spine = body.person.root.getObjectByName('Bip01_Spine2'), q0 = spine.getWorldQuaternion(new B.THREE.Quaternion());
  c.flinch(near, near.x + Math.cos(near.heading) * 0.4, near.z - Math.sin(near.heading) * 0.4, 1.2);
  const x0 = near.x, z0 = near.z; let maxAng = 0;
  for (let k = 0; k < 12; k++) { await new Promise((r) => setTimeout(r, 60)); maxAng = Math.max(maxAng, spine.getWorldQuaternion(new B.THREE.Quaternion()).angleTo(q0)); }
  return { id: near.id, spineTurnDeg: +(maxAng * 180 / Math.PI).toFixed(1), stepped: +Math.hypot(near.x - x0, near.z - z0).toFixed(2), flinching: !!near.flinch };
});
console.log(JSON.stringify(fl));
if (out) await p.screenshot({ path: `${out}/crowdwalk.png` });
if (errors.length) console.log('page errors:', errors.slice(0, 5));
await browser.close();
