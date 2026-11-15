// Driving the Huracán (src/engine/drive.js). npm test.
import { createDrive, stepDrive, footprint, kmh, CAR } from '../src/engine/drive.js';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const dt = 1 / 60;
{
  const s = createDrive(); let t = 0;
  while (kmh(s.v) < 100 && t < 10) { stepDrive(s, { throttle: 1 }, dt); t += dt; }
  ok(t > 2.8 && t < 4.0, `0-100 km/h in ${t.toFixed(2)} s (the real car: ~3.2 s)`);
  for (let i = 0; i < 60 * 30; i++) stepDrive(s, { throttle: 1 }, dt);
  ok(kmh(s.v) <= kmh(CAR.maxV) + 1 && kmh(s.v) > 140, `held to the town limit: ${kmh(s.v)} km/h, gear ${s.gear}, ${Math.round(s.rpm)} rpm`);
  ok(Math.abs(s.z) < 0.01 && s.x > 300, 'straight ahead is straight (+x)');
}
{
  const s = createDrive(); for (let i = 0; i < 400; i++) stepDrive(s, { throttle: 1 }, dt);
  const v0 = kmh(s.v), x0 = s.x; let t = 0;
  while (s.v > 0.01 && t < 10) { stepDrive(s, { brake: 1 }, dt); t += dt; }
  const d = s.x - x0;
  ok(s.v === 0 && d < v0 * v0 / 250 + 6, `stops from ${v0} km/h in ${d.toFixed(1)} m (${t.toFixed(1)} s), and stays stopped`);
  for (let i = 0; i < 120; i++) stepDrive(s, { brake: 1 }, dt);
  ok(s.v < -1 && s.gear === -1, `holding S once stopped: reverse (${s.v.toFixed(1)} m/s)`);
  for (let i = 0; i < 600; i++) stepDrive(s, { brake: 1 }, dt);
  ok(s.v >= -CAR.reverseMax - 0.01, `reverse is slow (${kmh(s.v)} km/h)`);
}
{
  // turning: left is left; the lock eases at speed
  const s = createDrive(); for (let i = 0; i < 90; i++) stepDrive(s, { throttle: 0.5 }, dt);
  for (let i = 0; i < 120; i++) stepDrive(s, { throttle: 0.2, steer: -1 }, dt);
  ok(s.yaw > 0.3 && s.z < -1, `A turns left (yaw ${s.yaw.toFixed(2)}, z ${s.z.toFixed(1)})`);
  const slow = createDrive(), fast = createDrive({}); fast.v = 30; slow.v = 5;
  for (let i = 0; i < 60; i++) { stepDrive(slow, { steer: 1, throttle: 0.15 }, dt); stepDrive(fast, { steer: 1, throttle: 0.6 }, dt); }
  ok(Math.abs(fast.steer) < Math.abs(slow.steer) * 0.5, `less lock at 108 km/h than at 18 (${fast.steer.toFixed(2)} vs ${slow.steer.toFixed(2)})`);
}
{
  // a wall at x = 20: stops there, reports the hit
  const s = createDrive(); let hit = 0;
  const wall = (x, z, yaw) => footprint(x, z, yaw).some(([px]) => px > 20);
  for (let i = 0; i < 600; i++) { stepDrive(s, { throttle: 1 }, dt, wall); hit = Math.max(hit, s.hit); }
  ok(s.x + CAR.length / 2 <= 20.01 && s.x > 15 && hit > 5, `drives into a wall: stopped at it (front at ${(s.x + CAR.length / 2).toFixed(2)}), hit at ${hit.toFixed(1)} m/s`);
  for (let i = 0; i < 120; i++) stepDrive(s, { throttle: 0, brake: 0 }, dt, wall);
  ok(Math.abs(s.v) < 0.05, 'and stays put');
}
{
  const f = footprint(0, 0, 0);
  ok(Math.max(...f.map((p) => p[0])) === CAR.length / 2 && Math.min(...f.map((p) => p[1])) === -CAR.width / 2, 'footprint: nose along +x, the width either side');
  const g = footprint(0, 0, Math.PI / 2);
  ok(Math.abs(Math.min(...g.map((p) => p[1])) + CAR.length / 2) < 1e-9, 'turned a quarter left: the nose points north (-z)');
}
{
  const s = createDrive(); const revs = [];
  for (let i = 0; i < 60 * 8; i++) { stepDrive(s, { throttle: 1 }, dt); if (i % 30 === 0) revs.push([s.gear, Math.round(s.rpm)]); }
  ok(s.gear >= 4 && revs.every(([, r]) => r <= CAR.redline + 300), `through the gears: ${revs.slice(0, 8).map(([g, r]) => `${g}:${r}`).join(' ')}`);
}
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
