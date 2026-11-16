// Lujiazui's ground, collisions and traffic routes (world/lujiazuiLayout.js), walked in node.
//   node tests/lujiazui.test.mjs
import { createBody, stepBody } from '../src/engine/movement.js';
import { groundHeight } from '../src/world/layout.js';
import { C, RING, RAMPS, SPUR, APPLE, METRO_LJZ, IFC, LJZ, ROUTES, ZEBRAS, GREEN, polar, fromAP, toAP, applePt, appleAng, wellPt, carriage, zebra, inDistrict, onDeck, ljzGround, ljzState, signalAt, ljzZone, inLake, loopPt } from '../src/world/lujiazuiLayout.js';

let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const body = createBody();
const put = (x, z, y) => { body.x = x; body.z = z; body.vx = body.vz = body.vy = 0; body.air = false; body.y = groundHeight(x, z, y); };
// walk toward a point (straight), up to `secs`; returns the distance left
function walk(tx, tz, secs = 60, run = false) {
  for (let i = 0; i < secs * 60; i++) {
    const dx = tx - body.x, dz = tz - body.z, d = Math.hypot(dx, dz);
    if (d < 0.25) return d;
    stepBody(body, dx / d, dz / d, run, 1 / 60);
  }
  return Math.hypot(tx - body.x, tz - body.z);
}
const rC = () => Math.hypot(body.x - C.x, body.z - C.z), rA = () => Math.hypot(body.x - APPLE.x, body.z - APPLE.z);

// ---- the ground ----
ok(groundHeight(-60, 0) === 0 && groundHeight(15, 0) === 3, 'the Bund is untouched (Hankou Road 0, the deck 3)');
ok(ljzGround(C.x + 35, C.z) === 0 && ljzGround(...polar(35, 60)) === 0.15, 'roundabout carriageway 0, pavement 0.15');
ok(ljzGround(...polar(20, 50), 5.5) === 5.5 && ljzGround(...polar(20, 50), 0.15) === 0.15, 'the ring: 5.5 on the deck, the pavement under it');
ok(ljzGround(680, 48, 134.4) === null, 'the 32nd floor is still its own floor');
ok(LJZ.metroExits.length === 3 && [LJZ.ifcLobbyStand, LJZ.kerbPickup, LJZ.appleEntrance, LJZ.greenGate, LJZ.greenLawn, ...LJZ.greenBenches, ...LJZ.metroExits].every((p) => inDistrict(p.x, p.z) && !carriage(p.x, p.z)), 'the exported positions are on walkable ground');

// ---- up a stair, round the ring, back down ----
for (const R of RAMPS.filter((r) => r.kind === 'ring')) {
  put(R.bot[0] + R.dx * 1.5, R.bot[1] + R.dz * 1.5);
  const left = walk(R.top[0] - R.dx * 4.5, R.top[1] - R.dz * 4.5, 40);
  ok(left < 0.3 && Math.abs(body.y - RING.y) < 0.05 && onDeck(body.x, body.z), `the stair at bearing ${R.b}: up to the deck (y ${body.y.toFixed(2)})`);
}
{ // all the way round, leaning on the inner rail; then leaning on the outer one where no stair leaves
  let minR = 99, maxR = 0, sweep = 0, last = 312;
  for (let i = 0; i < 60 * 240 && sweep < 400; i++) {
    const b = Math.atan2(body.x - C.x, -(body.z - C.z));
    stepBody(body, Math.cos(b) - Math.sin(b) * 0.4, Math.sin(b) + Math.cos(b) * 0.4, true, 1 / 60);
    const r = rC(), deg = ((b * 180 / Math.PI) + 360) % 360; minR = Math.min(minR, r); maxR = Math.max(maxR, r);
    let d = deg - last; if (d < -180) d += 360; if (d > 180) d -= 360; sweep += d; last = deg;
  }
  ok(sweep >= 400 && Math.abs(body.y - RING.y) < 0.05, `a full lap of the ring on the deck (${sweep.toFixed(0)}°)`);
  put(...polar(180, 50), 5.5); walk(...polar(180, 80), 8); maxR = Math.max(maxR, rC());
  ok(minR > RING.r0 && maxR < RING.r1 && Math.abs(body.y - RING.y) < 0.05, `the rails hold (r ${minR.toFixed(1)}..${maxR.toFixed(1)})`);
}
// ---- the spur, its stairs, the Apple court, the cylinder, the spiral, the store ----
{
  put(...polar(SPUR.b, 50), 5.5);
  let left = walk(...polar(SPUR.b, 77), 40);
  ok(left < 0.3 && Math.abs(body.y - 0.15) < 0.05, `the spur and its stairs: down to the pavement by the Apple court (y ${body.y.toFixed(2)})`);
  // the glass rail round the court: no way in from the side
  put(...applePt(60, 26)); walk(APPLE.x, APPLE.z, 6);
  ok(rA() > APPLE.rail - 0.05 && body.y > 0.1, `the court's rail holds (stopped ${rA().toFixed(1)} m out)`);
  // in by the top of the stairs, down the right-hand flight
  put(...applePt(0, 24)); left = walk(...applePt(0, 19.3), 10);
  for (const a of [20, 40, 60, 80, 100, 106]) left = walk(...applePt(a, 19.3), 20);
  ok(left < 0.3 && Math.abs(body.y - APPLE.yPlaza) < 0.05, `down the curved stair to the court (y ${body.y.toFixed(2)})`);
  left = walk(...applePt(106, 14), 10); left = walk(...applePt(40, 9), 20); left = walk(...applePt(0, 7), 20);
  ok(left < 0.3 && Math.abs(body.y - APPLE.yPlaza) < 0.05, 'across the court to the cylinder');
  put(...applePt(90, 9), APPLE.yPlaza); walk(APPLE.x, APPLE.z, 5);
  ok(rA() > APPLE.rCyl + 0.3, 'the cylinder is glass: no way through its wall');
  put(...applePt(0, 7), APPLE.yPlaza); left = walk(...applePt(0, 3.2), 8);
  ok(left < 0.3, 'in by the cylinder\'s door');
  let ok2 = true;
  for (let a = 30; a <= 420; a += 15) { left = walk(...applePt(a, 3.2), 10); if (left > 0.4) ok2 = false; }
  ok(ok2 && Math.abs(body.y - APPLE.yStore) < 0.3, `down the spiral stair (y ${body.y.toFixed(2)})`);
  left = walk(...applePt(72, 9), 10);
  ok(left < 0.3 && Math.abs(body.y - APPLE.yStore) < 0.02, 'out at its foot into the store');
  walk(...applePt(200, 30), 12);
  ok(rA() < APPLE.storeR && Math.abs(body.y - APPLE.yStore) < 0.02, 'the store\'s wall holds');
  // and back up
  left = walk(...applePt(72, 9), 20); left = walk(...applePt(66, 3.2), 10);
  for (let a = 420; a >= 15; a -= 15) left = walk(...applePt(a, 3.2), 10);
  left = walk(...applePt(0, 3.2), 10); left = walk(...applePt(0, 8), 10);
  ok(left < 0.3 && Math.abs(body.y - APPLE.yPlaza) < 0.05, `back up the spiral and out of the cylinder (y ${body.y.toFixed(2)})`);
  left = walk(...applePt(-60, 12), 20); left = walk(...applePt(-106, 14), 20); left = walk(...applePt(-106, 19.3), 10);
  for (const a of [-90, -70, -50, -30, -10, 0]) left = walk(...applePt(a, 19.3), 20);
  left = walk(...applePt(0, 25), 10);
  ok(left < 0.3 && Math.abs(body.y - 0.15) < 0.05 && !ljzState.pit, 'up the other curved stair to the street');
}
// ---- kerbs, the zebras, buildings, the metro ----
{
  put(...polar(35, 60)); walk(C.x, C.z, 10);
  ok(rC() > RING.road - 0.01, `the kerb rail at the roundabout holds (${rC().toFixed(1)} m out: the ring is the way across)`);
  put(...fromAP(228, 24)); const left = walk(...fromAP(228, -24), 40);
  ok(left < 0.3 && zebra(...fromAP(228, 0)) === 'z2', 'the zebra across Century Avenue at Yincheng Road can be walked');
  put(...fromAP(200, 24)); walk(...fromAP(200, -24), 12);
  ok(toAP(body.x, body.z)[1] > 15.9, 'elsewhere the avenue\'s kerb rail holds');
  put(...fromAP(176, 22)); walk(IFC.north.cx, IFC.north.cz, 8);
  ok(toAP(body.x, body.z)[1] < 31, 'IFC\'s north tower is solid');
  const m = METRO_LJZ[0];
  put(...wellPt(m, -2)); let l2 = walk(...wellPt(m, m.len - 1), 20);
  ok(l2 < 0.3 && Math.abs(body.y + m.depth) < 0.05, `down Exit 6's stairs to the landing (y ${body.y.toFixed(2)})`);
  walk(...wellPt(m, m.len - 1, 6), 4);
  ok(Math.abs(body.y + m.depth) < 0.05 && Math.hypot(body.x - wellPt(m, m.len - 1, 6)[0], body.z - wellPt(m, m.len - 1, 6)[1]) > 4, 'the stairwell\'s walls hold');
  l2 = walk(...wellPt(m, -2), 30);
  ok(l2 < 0.3 && Math.abs(body.y - 0.15) < 0.05, 'and back up to the street');
  put(...fromAP(300, -120)); walk(...fromAP(432, -188), 60);
  ok(!inLake(...toAP(body.x, body.z)), 'the lake in the Green is water');
  put(...fromAP(280, -100)); walk(...fromAP(280, -400), 120);
  ok(toAP(body.x, body.z)[1] >= GREEN.p0 - 0.01 && body.hit === 'boundary', 'the Green\'s far edge is the district\'s edge');
}
// ---- the loop path, the zones ----
ok([0, 1, 2, 3, 4, 5, 6].every((t) => { const [a, p] = loopPt(t); return !inLake(a, p, 4) && a > GREEN.a0 && a < GREEN.a1 && p > GREEN.p0 && p < GREEN.p1; }), 'the loop path runs round the lake inside the Green');
ok(ljzZone(...polar(20, 50), 5.5) === 'ring' && ljzZone(APPLE.x + 3, APPLE.z, -10) === 'apple' && ljzZone(...fromAP(400, -150)) === 'green' && ljzZone(LJZ.kerbPickup.x, LJZ.kerbPickup.z) === 'ifc', 'zones: the ring, Apple, the Green, IFC');
// ---- traffic ----
for (const R of ROUTES) { const bad = R.pts.filter(([x, z]) => !carriage(x, z)); if (bad.length) console.log('  off the road:', R.id, bad.length, bad.slice(0, 3).map((q) => q.map((v) => v.toFixed(1)))); }
ok(ROUTES.length === 10 && ROUTES.every((R) => R.pts.every(([x, z]) => carriage(x, z)) && R.yaw.every(Number.isFinite) && R.limit.every((v) => v >= 5.5 && v <= 12)), 'every traffic route stays on the carriageway');
ok(ROUTES.filter((R) => /^e-|-e$|yin/.test(R.id)).every((R) => R.stops.length === 1) && ROUTES.filter((R) => R.stops.length).length === 8, 'routes along the avenue and Yincheng Road have their stop lines');
{ const a = signalAt(5), b = signalAt(45), c = signalAt(36); ok(a.ave && !a.yin && a.z1 && !a.z2 && b.yin && !b.ave && b.z2 && !b.z1 && !c.ave && !c.yin, 'the signal: the avenue, all red, Yincheng Road; each zebra walks with the flow beside it'); }
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
