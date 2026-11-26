// Shared bikes (共享单车): rows of them in painted bays at street corners and metro exits, in three operators'
// colours (the game's own operators: Suiqi 随骑 yellow, Yunqi 云骑 blue, Zhuqi 竹骑 green). Scan one with your phone,
// ride it, and leave it in a bay. As in the city:
//   - 1.5 yuan for every quarter of an hour begun, paid with your phone (Xinyu Pay) when you lock it
//   - leave it outside a bay and the operator charges a 5-yuan dispatch fee to fetch it
//   - no riding on Nanjing Road's pedestrian street, on the Bund (its road and the promenade) or indoors: there you
//     walk it beside you
// The bays: Jiujiang Road and Hankou Road just off the Bund, and Henan Road by the metro on Nanjing Road.
import * as THREE from 'three';
import { buildBike, wheelGeo, crankGeo, BIKE_MATERIALS, REAR, FRONT, BB, R } from './bikeModel.js';
import { L, NJ, sideStreets, underCover } from './layout.js';
import { pay } from '../engine/life.js';
import { getLang } from '../ui/i18n.js';

const T = (zh, en) => (getLang() === 'zh' ? zh : en);
// color: the frame; basket; guard: the mudguards; accent: the seat's quick-release lever
export const OPERATORS = [
  { id: 'suiqi', zh: '随骑', en: 'Suiqi', color: 0xf2b705, basket: 0xf4bd12, guard: 0x2b2d30, accent: 0x2b2d30 },
  { id: 'yunqi', zh: '云骑', en: 'Yunqi', color: 0x1f7fd6, basket: 0x2a8be0, guard: 0xd9dde2, accent: 0xe8eaec },
  { id: 'zhuqi', zh: '竹骑', en: 'Zhuqi', color: 0x2f9a52, basket: 0xeef0f0, guard: 0x2f9a52, accent: 0xeef0f0 },
];
export const FARE = { per: 15, price: 1.5, dispatch: 5 };   // minutes, yuan; a fee outside a bay
const jj = sideStreets.find((s) => s.id === 'jiujiang');
// the bays: a strip along the kerb (x0..x1 or z0..z1), the bikes standing across it (yaw: which way they face)
export const BAYS = [
  { id: 'jiujiang', zh: '九江路', en: 'Jiujiang Road', x0: -55.5, x1: -44.0, z0: jj.z0 + 1.2, z1: jj.z0 + 3.0, along: 'x', yaw: 0, n: 16 },
  { id: 'hankou', zh: '汉口路', en: 'Hankou Road', x0: -47.0, x1: -37.0, z0: -L.street.halfW + 0.6, z1: -L.street.roadHalfW - 0.3, along: 'x', yaw: 0, n: 14 },
  { id: 'henan', zh: '河南中路', en: 'Henan Road', x0: NJ.henan.x1 + 1.2, x1: NJ.henan.x1 + 3.2, z0: NJ.z0 - 16, z1: NJ.z0 - 3.5, along: 'z', yaw: Math.PI / 2, n: 18 },
];
const inBay = (b, x, z, m = 0.4) => x > b.x0 - m && x < b.x1 + m && z > b.z0 - m && z < b.z1 + m;
// where you may ride (else you walk it)
export function canRide(x, z, y = 0) {
  if (y > 1.2) return false;                                                         // up on the promenade, a stair, upstairs
  if (x > L.facadeX - 0.3) return false;                                             // the Bund: its pavement, road and promenade
  if (z > NJ.z0 && z < NJ.z1 && x > NJ.xWest && !(x > NJ.henan.x0 - 2 && x < NJ.henan.x1 + 2)) return false;   // the pedestrian street (crossing Henan Road is fine)
  if (underCover(x, z, y + 1)) return false;                                         // indoors, under an arcade
  return true;
}

// ---- the bike itself: world/bikeModel.js (a step-through frame, solid tyres on spoked rims, the basket, the smart lock) ----
export function createSharedBikes({ scene, player, hud, audio, getLife, save }) {
  const group = new THREE.Group(); group.name = 'shared-bikes'; scene.add(group);
  const mats = BIKE_MATERIALS(OPERATORS);
  // the parked bikes: per operator a detailed mesh for the ones near you and a plain one for the rest; each bike
  // { op, x, z, yaw, bay } (bay null: left outside a bay, where the operator will come for it)
  const MAXN = 64, NEAR = 26, mk = (g) => { const m = new THREE.InstancedMesh(g, mats, MAXN); m.count = 0; m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; group.add(m); return m; };
  const near = OPERATORS.map((o) => mk(buildBike(o, OPERATORS)));
  const far = OPERATORS.map((o) => mk(buildBike(o, OPERATORS, { lod: true })));
  const bikes = [];
  // the painted bays: white lines on the pavement, a little sign
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xe8e8e2 }), signMat = new THREE.MeshStandardMaterial({ color: 0x2f6fb5, roughness: 0.6 });
  for (const b of BAYS) {
    const y = 0.17, w = b.x1 - b.x0, d = b.z1 - b.z0, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    for (const [lx, lz, lw, ld] of [[cx, b.z0, w, 0.06], [cx, b.z1, w, 0.06], [b.x0, cz, 0.06, d], [b.x1, cz, 0.06, d]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(lw, ld), lineMat); m.rotation.x = -Math.PI / 2; m.position.set(lx, y, lz); group.add(m); }
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8), new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 0.6, roughness: 0.4 })); post.position.set(b.x0 - 0.3, 0.87, b.z0 - 0.2); group.add(post);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.02), signMat); sign.position.set(b.x0 - 0.3, 1.45, b.z0 - 0.2); group.add(sign);
    for (let k = 0; k < b.n; k++) {
      const t = (k + 0.5) / b.n, x = b.along === 'x' ? b.x0 + w * t : cx, z = b.along === 'x' ? cz : b.z0 + d * t;
      bikes.push({ op: (k * 7 + b.id.length) % 3, x: x + (Math.random() - 0.5) * 0.06, z: z + (Math.random() - 0.5) * 0.06, yaw: b.yaw + (Math.random() - 0.5) * 0.14 + (k % 2 ? Math.PI : 0), bay: b.id });   // (standing side by side across the bay, every other one the other way round)
    }
  }
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _l = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), UP = new THREE.Vector3(0, 1, 0), FWD = new THREE.Vector3(0, 0, 1);
  const LEAN = -0.09;   // (on its side stand: leaning a little to its left)
  let lodAt = null;
  function rebuild(at = lodAt) {
    lodAt = at;
    const nN = [0, 0, 0], nF = [0, 0, 0];
    for (const b of bikes) {
      _q.setFromAxisAngle(UP, b.yaw).multiply(_l.setFromAxisAngle(FWD, LEAN)); _p.set(b.x, 0.16, b.z); _m.compose(_p, _q, _s);
      const close = at && Math.hypot(b.x - at.x, b.z - at.z) < NEAR;
      if (close) near[b.op].setMatrixAt(nN[b.op]++, _m); else far[b.op].setMatrixAt(nF[b.op]++, _m);
    }
    near.forEach((m, i) => { m.count = nN[i]; m.instanceMatrix.needsUpdate = true; });
    far.forEach((m, i) => { m.count = nF[i]; m.instanceMatrix.needsUpdate = true; });
  }
  rebuild();

  // ---- the one you're on: its wheels turn, its cranks go round; it stands beside you when you walk it ----
  const ride = new THREE.Group(); ride.visible = false; group.add(ride);
  const rideFrames = OPERATORS.map((o) => buildBike(o, OPERATORS, { stand: 'up', wheels: false, crank: false }));
  const rideFrame = new THREE.Mesh(rideFrames[0], mats); ride.add(rideFrame);
  const wR = new THREE.Mesh(wheelGeo(true), mats), wF = new THREE.Mesh(wheelGeo(false), mats); wR.position.copy(REAR); wF.position.copy(FRONT); ride.add(wR, wF);
  const crank = new THREE.Mesh(crankGeo(), mats); crank.position.copy(BB); ride.add(crank);
  ride.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  const full = [];
  const S = { on: null, since: 0, push: false, warned: false, confirmT: 0, roll: 0 };
  const L0 = () => getLife();
  const nearest = (pp) => { let best = null, bd = 1.8; for (const b of bikes) { const d = Math.hypot(b.x - pp.x, b.z - pp.z); if (d < bd) { bd = d; best = b; } } return best; };
  const fareFor = (mins) => Math.max(1, Math.ceil(mins / FARE.per)) * FARE.price;
  function start(b) {
    const l = L0(), o = OPERATORS[b.op];
    bikes.splice(bikes.indexOf(b), 1); rebuild();
    rideFrame.geometry = rideFrames[b.op];
    S.on = b; S.since = l.clock.day * 1440 + l.clock.minute; S.warned = false;
    player.bike = { speed: 4.2, fast: 6.2, push: !canRide(player.body.x, player.body.z, player.body.y) };
    player.yaw = b.yaw + Math.PI;   // facing along the bike (the view looks down -z at yaw 0; the bike's front is its +z)
    audio && audio.cue && audio.cue('ping', 0, 0.5);
    hud.toast(T(`${o.zh}单车 · 开锁成功。${FARE.price} 元/${FARE.per} 分钟，骑到画线停车点再还车`, `${o.en} bike unlocked: ${FARE.price} yuan per ${FARE.per} minutes. Lock it in a marked bay`), 3.5);
  }
  // where the bike is (the bay is found from the bike, as the lock's GPS and the bay's beacon do, not from where you stand)
  const bikeAt = (pp) => (S.push ? { x: ride.position.x, z: ride.position.z } : { x: pp.x - Math.sin(player.yaw) * 0.22, z: pp.z - Math.cos(player.yaw) * 0.22 });
  const bayAt = (q) => BAYS.find((b) => inBay(b, q.x, q.z, 1.0));
  function lock(pp, confirmOutside) {
    const l = L0(), mins = l.clock.day * 1440 + l.clock.minute - S.since, q = pp.atBike ? pp : bikeAt(pp), bay = bayAt(q);
    if (!bay && !confirmOutside) { S.confirmT = 4; hud.toast(T(`这里不是停车点，在这里还车要付 ${FARE.dispatch} 元调度费。再按一次确认，或骑到画线的停车点`, `This isn't a bay: leaving it here costs a ${FARE.dispatch}-yuan dispatch fee. Press again to confirm, or ride to a marked bay`), 4); return; }
    const fare = fareFor(mins) + (bay ? 0 : FARE.dispatch), o = OPERATORS[S.on.op];
    const r = pay(l, { method: 'wechat', amount: fare, to: `${o.zh}单车`, memo: bay ? `骑行 ${Math.max(1, Math.round(mins))} 分钟` : `骑行 ${Math.max(1, Math.round(mins))} 分钟 + 调度费`, kind: 'ride' });
    if (!r.ok) { hud.toast(T('信语支付余额不足，先充值再还车', 'Not enough in Xinyu Pay: top up first, then lock it'), 3); return; }
    // into the bay's lines, standing across it like the rest; outside one it stays where you left it, for the operator to fetch
    const at = bay ? { x: Math.min(bay.x1 - 0.2, Math.max(bay.x0 + 0.2, q.x)), z: Math.min(bay.z1 - 0.2, Math.max(bay.z0 + 0.2, q.z)) } : q;
    bikes.push({ op: S.on.op, x: at.x, z: at.z, yaw: bay ? bay.yaw + (Math.random() < 0.5 ? Math.PI : 0) + (Math.random() - 0.5) * 0.12 : player.yaw + Math.PI, bay: bay ? bay.id : null }); rebuild();
    S.on = null; player.bike = null; ride.visible = false;
    audio && audio.cue && audio.cue('click', 0, 0.6);
    hud.toast(T(`已还车 · 支付 ${fare.toFixed(1)} 元${bay ? '' : '（含调度费）'}`, `Locked: paid ${fare.toFixed(1)} yuan${bay ? '' : ' (with the dispatch fee)'}`), 3);
    save && save();
  }

  return {
    group,
    get riding() { return !!S.on; },
    get list() { return bikes; },                          // (tools)
    // for someone else (world/moments.js): the parked bike nearest (x, z) within r, and taking it out of its bay as a mesh
    // they can wheel along (op, mesh: the bike's frame at its own origin, stand up)
    parkedNear(x, z, r = 4, bay = null) { let best = null, bd = r; for (const b of bikes) { if (bay && b.bay !== bay) continue; const d = Math.hypot(b.x - x, b.z - z); if (d < bd) { bd = d; best = b; } } return best; },
    take(b) {
      const k = bikes.indexOf(b); if (k < 0) return null; bikes.splice(k, 1); rebuild();
      const geo = full[b.op] || (full[b.op] = buildBike(OPERATORS[b.op], OPERATORS, { stand: 'up' }));
      const mesh = new THREE.Mesh(geo, mats); mesh.castShadow = true; return { op: b.op, mesh };
    },
    get pushing() { return !!(S.on && S.push); },
    candidates() {
      const pp = player.body;
      if (S.on) { const f = [Math.sin(player.yaw), Math.cos(player.yaw)]; return [{ id: 'bikeLock', x: pp.x - f[0] * 0.6, y: pp.y + 0.9, z: pp.z - f[1] * 0.6, reach: 2.0, cone: 0.2 }]; }
      const b = nearest(pp); return b ? [{ id: 'bike', x: b.x, y: 0.9, z: b.z, reach: 2.0, cone: 0.5 }] : [];
    },
    owns(id) { return id === 'bike' || id === 'bikeLock'; },
    prompt(id) {
      if (id === 'bike') { const b = nearest(player.body), o = b && OPERATORS[b.op]; return o ? { target: T(`${o.zh}单车`, `${o.en} bike`), action: T(`扫码开锁 · ${FARE.price}元/${FARE.per}分钟`, `Scan to unlock · ${FARE.price} yuan/${FARE.per} min`) } : null; }
      if (id === 'bikeLock') { const inside = !!bayAt(bikeAt(player.body)); return { target: T('单车', 'Bike'), action: inside ? T('还车（停车点）', 'Lock it here (a bay)') : T('还车（非停车点）', 'Lock it (not a bay)') }; }
      return null;
    },
    interact(id) {
      const pp = player.body;
      if (id === 'bike' && !S.on) { const b = nearest(pp); if (b) start(b); }
      else if (id === 'bikeLock' && S.on) lock(pp, S.confirmT > 0);
      return true;
    },
    update(dt) {
      S.confirmT = Math.max(0, S.confirmT - dt);
      const pp = player.body;
      group.visible = Math.abs(pp.y) < 30;
      // carried off with you (a lift, a ride, a jump in time and place): it's locked where you left it, and charged as such
      const jumped = S.last && Math.hypot(pp.x - S.last.x, pp.z - S.last.z) > 8; S.last = { x: pp.x, z: pp.z };
      if (S.on && jumped) { const at = S.lastSafe || pp; S.confirmT = 0; lock({ x: at.x, z: at.z, atBike: true }, true); }
      // the detailed bikes are the ones near you
      S.lodT = (S.lodT || 0) - dt; if (S.lodT <= 0) { S.lodT = 0.5; if (!lodAt || Math.hypot(pp.x - lodAt.x, pp.z - lodAt.z) > 3) rebuild({ x: pp.x, z: pp.z }); }
      if (!S.on) { ride.visible = false; return; }
      S.lastSafe = bikeAt(pp);
      // where you may ride: walk it beside you elsewhere (and say so once)
      const can = canRide(pp.x, pp.z, pp.y);
      if (!can && !S.push) { S.push = true; if (!S.warned) { S.warned = true; hud.toast(T('这里不能骑车，推着走吧（步行街、外滩、室内）', 'No riding here: walk it (the pedestrian street, the Bund, indoors)'), 3); } }
      if (can && S.push) S.push = false;
      if (player.bike) player.bike.push = S.push;
      ride.visible = true;
      const y = player.yaw, fx = -Math.sin(y), fz = -Math.cos(y), rx = Math.cos(y), rz = -Math.sin(y);
      if (S.push) ride.position.set(pp.x + rx * 0.55 + fx * 0.25, pp.y, pp.z + rz * 0.55 + fz * 0.25);
      else ride.position.set(pp.x + fx * 0.22, pp.y, pp.z + fz * 0.22);   // (the saddle just behind your eyes, the bars ahead)
      ride.rotation.y = y + Math.PI;
      const v = player.speed || 0; S.roll += v * dt / R;
      wR.rotation.x = wF.rotation.x = S.roll; crank.rotation.x = S.push ? crank.rotation.x : S.roll * 0.45;
      ride.rotation.z = S.push ? 0 : Math.max(-0.12, Math.min(0.12, -(player.lateral || 0) * 0.03));
    },
  };
}
