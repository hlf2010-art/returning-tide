// Lujiazui's traffic and its people.
//   Traffic: taxis, private cars and the new-energy lookalikes on fixed routes through the roundabout
//   (world/lujiazuiLayout.js ROUTES: in by one road, anticlockwise round the island, out by another),
//   along Century Avenue and across it on Yincheng Road. They keep their distance, give way to what is
//   already on the roundabout, stop at the Yincheng junction's signals and for anyone on a zebra.
//   People: a few on the ring (stopping to photograph the Pearl), office people along the avenue, a
//   jogger and strollers round the lake, someone by the Apple cylinder. Skinned people are the dearest
//   thing to draw: there are about ten, made only when you first come to Pudong, drawn within ~90 m.
import * as THREE from 'three';
import { createVehicles } from './vehicles.js';
import { createPerson } from './people.js';
import { holdPhone } from './pedestriansReal.js';
import { C, RING, ROUTES, APPLE, LOOP, CH, signalAt, bearingOf, wrap180, polar, rpolar, fromAP, applePt, ljzGround } from './lujiazuiLayout.js';
import { PEARL } from './skyline.js';

const MIX = [
  ['taxi', 4.6, 1.78, 1.5, 2.82], ['sedan', 4.6, 1.78, 1.5, 2.82, 0xe8e8e6], ['nio-et5', 4.790, 1.960, 1.499, 2.888], ['taxi', 4.6, 1.78, 1.5, 2.82],
  ['sedan', 4.6, 1.78, 1.5, 2.82, 0x101216], ['li-l9', 5.218, 1.998, 1.800, 3.105], ['taxi', 4.6, 1.78, 1.5, 2.82], ['aito-m9', 5.230, 1.999, 1.800, 3.110],
  ['sedan', 4.6, 1.78, 1.5, 2.82, 0x9aa0a6], ['luxeed-r7', 4.956, 1.999, 1.656, 2.950], ['sedan', 4.6, 1.78, 1.5, 2.82, 0xf2f2f0], ['taxi', 4.6, 1.78, 1.5, 2.82],
];
// where each route enters the roundabout (metres along it) and at what bearing
for (const R of ROUTES) {
  R.enter = null;
  for (let i = 0; i < R.pts.length; i++) if (Math.hypot(R.pts[i][0] - C.x, R.pts[i][1] - C.z) < RING.road + 1.5) { R.enter = i * 2; R.enterB = bearingOf(...R.pts[i]); break; }
}

export function createLjzTraffic({ group, factor = 1 }) {
  const n = Math.max(8, Math.round(20 * factor)), specs = [], per = {};
  for (let i = 0; i < n; i++) { const [model, len, width, height, wheelbase, paint] = MIX[i % MIX.length]; specs.push({ id: `ljz${i}`, model, len, width, height, wheelbase, paint }); }
  const vehicles = createVehicles(specs); vehicles.group.name = 'ljz-vehicles'; group.add(vehicles.group);
  const cars = specs.map((sp, i) => {
    const R = ROUTES[i % ROUTES.length], k = (per[R.id] = (per[R.id] || 0) + 1);
    return { id: sp.id, len: sp.len, width: sp.width, R, s: (R.len * ((k * 0.37 + i * 0.11) % 1)), v: 6, x: 0, z: 0, yaw: 0, hx: 0, hz: 1, active: true, hidden: false, wheelDist: 0, braking: false, pace: 0.86 + ((i * 7) % 10) * 0.025, stuck: 0, free: 0, rank: (i * 37 % n) / n };
  });
  const place = (c) => {
    const R = c.R, f = c.s / 2, i = Math.min(R.pts.length - 2, Math.floor(f)), t = f - i, a = R.pts[i], b = R.pts[i + 1];
    c.x = a[0] + (b[0] - a[0]) * t; c.z = a[1] + (b[1] - a[1]) * t;
    let dy = R.yaw[i + 1] - R.yaw[i]; if (dy > Math.PI) dy -= 2 * Math.PI; if (dy < -Math.PI) dy += 2 * Math.PI;
    c.yaw = R.yaw[i] + dy * t; c.hx = Math.sin(c.yaw); c.hz = Math.cos(c.yaw); c.i = i;
  };
  cars.forEach(place);
  let density = 1;
  const _eye = { x: 0, z: 0 };
  return {
    cars, vehicles,
    setDensity(d) { density = d; },
    // player: { x, z } when standing on a carriageway (a zebra), else null
    update(dt, t, player, eye) {
      const sig = signalAt(t);
      for (let i = 0; i < cars.length; i++) {
        const c = cars[i], R = c.R;
        // fewer at night: those beyond the hour's share leave at the end of their route
        if (!c.active) { if (c.rank < density) { c.active = true; c.s = 0; c.v = 8; place(c); } else continue; }
        let lim = R.limit[c.i] * c.pace;
        for (let k = 1; k <= 7; k++) { const j = c.i + k; if (j < R.limit.length) lim = Math.min(lim, R.limit[j] * c.pace + k * 0.35); }
        let gap = 1e9;
        for (const st of R.stops) if (!(st.on === 'ave' ? sig.ave : sig.yin) && c.s < st.s - 0.5 && st.s - c.s < 60) gap = Math.min(gap, st.s - c.s - 1.0);
        const cone = (ox, oz, half, reach, side) => { const dx = ox - c.x, dz = oz - c.z, f = dx * c.hx + dz * c.hz; if (f > 0 && f < reach && Math.abs(dx * c.hz - dz * c.hx) < side) gap = Math.min(gap, f - c.len / 2 - half - 1.6); };
        if (c.free <= 0) for (let j = 0; j < cars.length; j++) { const o = cars[j]; if (o !== c && o.active) cone(o.x, o.z, o.len / 2, 26, 2.1); }
        if (player) cone(player.x, player.z, 0.4, 20, 2.6);
        // give way to what is already on the roundabout
        if (R.enter != null && c.s < R.enter && R.enter - c.s < 16 && c.free <= 0) {
          for (let j = 0; j < cars.length; j++) {
            const o = cars[j]; if (o === c || !o.active || o.R.enter == null || o.s < o.R.enter) continue;
            if (Math.hypot(o.x - C.x, o.z - C.z) > RING.road) continue;
            const d = wrap180(bearingOf(o.x, o.z) - R.enterB); if (d > -6 && d < 40) { gap = Math.min(gap, R.enter - c.s - 1.5); break; }
          }
        }
        if (gap < 1e8) lim = Math.min(lim, Math.sqrt(Math.max(0, 2 * 3.2 * gap)));
        const want = lim - c.v; c.braking = want < -0.4;
        c.v = Math.max(0, c.v + Math.max(-7 * dt, Math.min(2.4 * dt, want)));
        if (c.v < 0.15 && !R.stops.some((st) => Math.abs(st.s - c.s) < 30 && !(st.on === 'ave' ? sig.ave : sig.yin))) { c.stuck += dt; if (c.stuck > 5) { c.free = 2.5; c.stuck = 0; } } else c.stuck = 0;
        if (c.free > 0) c.free -= dt;
        c.s += c.v * dt; c.wheelDist += c.v * dt;
        if (c.s >= R.len - 2) { if (c.rank >= density) { c.active = false; continue; } c.s = 0; c.v = 9; }
        place(c);
      }
      if (eye) { _eye.x = eye.x; _eye.z = eye.z; }
      vehicles.update(cars, eye ? _eye : null);
    },
  };
}

// ---- people ----
const lerp = (a, b, t) => a + (b - a) * t;
export function createLjzPeople({ group, people }) {
  if (!people) return { update() {}, talkables: () => [], list: [] };
  const roles = Object.keys(people.manifest.cast).filter((r) => !['lin', 'su', 'player', 'dad', 'k1', 'k2'].includes(r));
  const phoneMat = new THREE.MeshStandardMaterial({ color: 0x16161a, roughness: 0.3, metalness: 0.5 });
  const ringLoop = (dir, r) => { const pts = []; for (let b = 0; b < 360; b += 10) { const [x, z] = rpolar(dir > 0 ? b : 360 - b, r); pts.push([x, z, RING.y]); } return pts; };
  const lakeLoop = (dir, off) => { const pts = []; for (let i = 0; i < 40; i++) { const t = (dir > 0 ? i : 40 - i) / 40 * 6.2832, [x, z] = fromAP(LOOP.a + (LOOP.ra + off) * Math.cos(t), LOOP.p + (LOOP.rp + off) * Math.sin(t)); pts.push([x, z, CH]); } return pts; };
  const ave = (p, a0, a1) => { const pts = []; for (let a = a0; a <= a1; a += 20) { const [x, z] = fromAP(a, p); pts.push([x, z, CH]); } return [...pts, ...pts.slice(1, -1).reverse()]; };
  const PLANS = [
    { kind: 'tourist', persona: 'visitor', speed: 0.9, pts: ringLoop(1, 59.6), photo: true, start: 4 },
    { kind: 'tourist', persona: 'student', speed: 0.85, pts: ringLoop(-1, 56.8), photo: true, start: 20 },
    { kind: 'office', persona: 'office', speed: 1.4, pts: ringLoop(1, 57.8), start: 27, phone: true },
    { kind: 'office', persona: 'office', speed: 1.45, pts: ave(-26, 120, 320), phone: true, start: 1 },
    { kind: 'office', persona: 'youngMan', speed: 1.35, pts: ave(23, 128, 216), start: 3 },
    { kind: 'office', persona: 'office', speed: 1.3, pts: ave(-30, 372, 740), start: 6 },
    { kind: 'jogger', persona: 'youngMan', speed: 2.7, pts: lakeLoop(1, 0.6), jog: true, start: 5 },
    { kind: 'stroller', persona: 'auntie', speed: 0.8, pts: lakeLoop(-1, -0.7), start: 12 },
    { kind: 'stroller', persona: 'elder', speed: 0.7, pts: lakeLoop(1, -0.6), start: 26 },
    { kind: 'visitor', persona: 'visitor', speed: 0, pts: [[...applePt(-30, 9), APPLE.yPlaza]], stand: applePt(0, 0), photo: true, start: 0 },
    { kind: 'visitor', persona: 'student', speed: 0, pts: [[...fromAP(372, -160), CH]], stand: fromAP(432, -188), start: 0 },
  ];
  const list = PLANS.map((P, i) => {
    const person = createPerson(people, roles[(i * 3 + 1) % roles.length]); person.root.visible = false;
    person.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    group.add(person.root);
    const phone = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.15, 0.009), phoneMat); phone.visible = false; group.add(phone);
    const s = P.start % P.pts.length, w = { ...P, id: `ljzp${i}`, person, phone, i: (s + 1) % P.pts.length, x: P.pts[s][0], z: P.pts[s][1], y: P.pts[s][2], act: 0, heading: 0, next: 12 + i * 5, held: false };
    return w;
  });
  return {
    list,
    talkables() {
      return list.filter((w) => w.person.root.visible).map((w) => ({ key: w.id, persona: w.persona, x: w.x, y: w.y + 1.62, z: w.z,
        hold(on, pp) { w.held = on; if (on) w.heading = Math.atan2(pp.x - w.x, pp.z - w.z); } }));
    },
    update(dt, pp) {
      for (const w of list) {
        const far = Math.hypot(w.x - pp.x, w.z - pp.z) > 95 || Math.abs(w.y - pp.y) > 14;
        let moving = w.speed > 0 && !w.held;
        if (w.speed > 0 && !w.held) {
          if (w.act > 0) { w.act -= dt; moving = false; }
          else {
            const tgt = w.pts[w.i], dx = tgt[0] - w.x, dz = tgt[1] - w.z, d = Math.hypot(dx, dz) || 1e-6;
            const px = pp.x - w.x, pz = pp.z - w.z, pd = Math.hypot(px, pz);
            let sp = w.speed, sx = 0, sz = 0;
            if (pd < 1.5 && Math.abs(pp.y - w.y) < 1 && (px * dx + pz * dz) / (pd * d) > 0.4) { sp *= 0.35; sx = -dz / d * 0.8; sz = dx / d * 0.8; }   // you're in the way: slow, step round
            if (d < 0.4) { w.i = (w.i + 1) % w.pts.length; w.next -= 1; if (w.photo && w.next <= 0) { w.act = 4 + Math.random() * 3; w.next = 9 + Math.random() * 9; } }
            else { const st = Math.min(d, sp * dt); w.x += dx / d * st + sx * dt; w.z += dz / d * st + sz * dt; w.heading = Math.atan2(dx, dz); }
            w.y = lerp(w.y, tgt[2], Math.min(1, dt * 4));
          }
        }
        const root = w.person.root; root.visible = !far; w.phone.visible = false;
        if (far) continue;
        const photo = w.photo && (w.act > 0 || w.speed === 0) && !w.held;
        if (photo && w.speed > 0) w.heading = Math.atan2(PEARL.x - w.x, PEARL.z - w.z);
        if (w.speed === 0 && !w.held && w.stand) w.heading = Math.atan2(w.stand[0] - w.x, w.stand[1] - w.z);
        root.position.set(w.x, w.y, w.z);
        let a = w.heading - root.rotation.y; while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; root.rotation.y += a * Math.min(1, dt * 5);
        w.person.play(moving ? (w.jog ? 'jog' : 'walk') : w.held ? 'talk1' : w.speed === 0 && !w.photo ? 'look' : 'idle', 0.3);
        w.person.setGait(moving ? w.speed : 0);
        const up = photo || (w.phone && moving);
        w.person.setPhoneHold(up ? 1 : 0);
        w.person.update(dt, Math.hypot(pp.x - w.x, pp.z - w.z) < 4 ? [pp.x, pp.z] : null);
        if (up) { w.phone.visible = true; holdPhone(w.phone, w.person, root.rotation.y); if (photo) w.phone.rotateZ(Math.PI / 2); }
      }
    },
    others() { return list.filter((w) => w.person.root.visible).map((w) => ({ x: w.x, z: w.z })); },
  };
}
void ljzGround;
