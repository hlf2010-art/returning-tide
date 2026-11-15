// Your Huracán, once it's been delivered (engine/carPurchase.js): get in at the driver's door and drive
// it on the roads that are here (Hankou Road, Zhongshan Road along the Bund, the side streets to
// Nanjing Road), then park it wherever you stop and get out (it stays there, saved).
//   W / S     throttle / brake (S again once stopped: reverse)     A / D   steer
//   Space     handbrake      V   chase camera / driver's seat      H   horn      E   get out (stopped)
// engine/drive.js is the car; engine/carAudio.js the V10. The road's edges are its kerbs (you can't
// mount the pavement), and other cars and people stop it: you can bump into a car, never run anyone
// over. The traffic sees you as a car (they queue behind you); people step round it, and look.
import * as THREE from 'three';
import { L, inSideRoad } from './layout.js';
import { HURACAN_SPOT } from './huracan.js';
import { createDrive, stepDrive, footprint, kmh, CAR } from '../engine/drive.js';
import { createCarAudio } from '../engine/carAudio.js';
import { getLang } from '../ui/i18n.js';

const T = (zh, en) => (getLang() === 'zh' ? zh : en);
const S0 = L.street;
// the carriageways (with a little margin inside the kerb)
export function onRoad(x, z) {
  if (x >= L.westCurbX + 0.05 && x <= L.eastCurbX - 0.05 && z >= L.zNorth + 2 && z <= L.zSouth - 2) return true;   // Zhongshan Road
  if (Math.abs(z) < S0.roadHalfW - 0.05 && x >= -138 && x <= L.westCurbX + 0.5) return true;                     // Hankou Road
  return x < L.westCurbX + 0.5 && inSideRoad(x, z);                                                               // Jiujiang Road, Nanjing Road
}

export function createDriving({ huracan, traffic, camera, player, audio, hud, getLife, save, onMode, carSale }) {
  const engine = createCarAudio(audio);
  const S = { on: false, d: null, cam: 'chase', camPos: new THREE.Vector3(), shake: 0, horn: 0, hand: false, lights: false };
  const owned = () => { const l = getLife(); return !!(l.flags.car && l.flags.carBuy && l.flags.carBuy.stage === 'delivered'); };
  const park = () => getLife().flags.carPark || { x: HURACAN_SPOT.x, z: HURACAN_SPOT.z, yaw: 0 };
  const fwdOf = (yaw) => [Math.cos(yaw), -Math.sin(yaw)], leftOf = (yaw) => [-Math.sin(yaw), -Math.cos(yaw)];
  // a speedometer
  const dial = document.createElement('div'); dial.id = 'drive-hud'; dial.innerHTML = '<b>0</b><span>km/h</span><i>1</i>'; document.body.appendChild(dial);
  window.addEventListener('keydown', (e) => { if (e.code === 'Space' && S.on) { S.hand = true; e.preventDefault(); } });
  window.addEventListener('keyup', (e) => { if (e.code === 'Space') S.hand = false; });

  // stand the car at a pose: model, collider (an AABB round the turned body), people's keep-out and interest
  function place(x, z, yaw) {
    const g = huracan.group; g.position.set(x, 0, z); g.rotation.y = yaw;
    const pts = footprint(x, z, yaw, -0.05), c = huracan.collider;
    if (S.on) Object.assign(c, { minX: 1e6, maxX: 1e6, minZ: 1e6, maxZ: 1e6 });
    else Object.assign(c, { minX: Math.min(...pts.map((p) => p[0])), maxX: Math.max(...pts.map((p) => p[0])), minZ: Math.min(...pts.map((p) => p[1])), maxZ: Math.max(...pts.map((p) => p[1])) });
    const [fx, fz] = fwdOf(yaw);
    traffic.setObstacles([-1.5, 0, 1.5].map((k) => ({ x: x + fx * k, z: z + fz * k, r: 1.15 })));
    traffic.setSights([{ id: 'huracan', x, z }]);
  }
  huracan.ready.then((r) => { if (r && owned() && getLife().flags.carPark) { const p = park(); place(p.x, p.z, p.yaw); } });

  // is the car's body allowed here: on the road, clear of other cars and of people
  function blocked(x, z, yaw) {
    const pts = footprint(x, z, yaw);
    for (const [px, pz] of pts) if (!onRoad(px, pz)) return 'kerb';
    const c = Math.cos(yaw), s = Math.sin(yaw), hl = CAR.length / 2 + 0.15, hw = CAR.width / 2 + 0.15;
    const inside = (qx, qz, r) => { const dx = qx - x, dz = qz - z, f = dx * c - dz * s, l = -dx * s - dz * c; return Math.abs(f) < hl + r && Math.abs(l) < hw + r; };
    for (const v of traffic.vehicles) {
      if (!v.active || v.hidden) continue;
      if (Math.hypot(v.x - x, v.z - z) > 9) continue;
      for (const k of [-0.36, 0, 0.36]) if (inside(v.x, v.z + k * v.len, v.width / 2 - 0.1)) return 'car';
    }
    for (const p of traffic.peds) if (Math.hypot(p.x - x, p.z - z) < 4 && inside(p.x, p.z, 0.3)) return 'person';
    return false;
  }

  function start() {
    const p = park();
    S.on = true; S.d = createDrive({ x: huracan.group.position.x || p.x, z: huracan.group.position.z || p.z, yaw: huracan.group.rotation.y || p.yaw });
    S.cam = 'chase'; S.camPos.set(S.d.x - Math.cos(S.d.yaw) * 6, 2.2, S.d.z + Math.sin(S.d.yaw) * 6);
    place(S.d.x, S.d.z, S.d.yaw); huracan.setLights(true);
    player.yaw = 0; player.pitch = -0.04;
    onMode && onMode('drive');
    if (audio && audio.cue) { audio.cue('door', 0, 0.6); audio.cue('v10', 0.5, 0.9); }
    hud.toast(T('W/S 油门刹车 · A/D 转向 · 空格 手刹 · V 视角 · H 喇叭 · E 下车', 'W/S throttle, brake · A/D steer · Space handbrake · V camera · H horn · E get out'), 6);
    dial.classList.add('on');
  }
  function exit() {
    if (!S.on) return false;
    if (Math.abs(S.d.v) > 0.6) { hud.toast(T('先停车', 'Stop first'), 1.6); return true; }
    const d = S.d; S.on = false;
    getLife().flags.carPark = { x: +d.x.toFixed(2), z: +d.z.toFixed(2), yaw: +d.yaw.toFixed(3) }; save && save();
    place(d.x, d.z, d.yaw); huracan.setLights(false); engine.stop(); dial.classList.remove('on');
    if (audio && audio.cue) audio.cue('door', 0, 0.6);
    // out of the driver's door (the left), facing the car
    const [lx, lz] = leftOf(d.yaw), [fx, fz] = fwdOf(d.yaw);
    const ox = d.x + lx * 1.55 - fx * 0.3, oz = d.z + lz * 1.55 - fz * 0.3;
    player.teleport(ox, oz, Math.atan2(-(d.x - ox), -(d.z - oz)), -0.08);
    onMode && onMode('play');
    return true;
  }

  return {
    get driving() { return S.on; },
    get state() { return S.d; },
    owned,
    candidates() {
      if (S.on || !owned() || !huracan.loaded || (carSale && carSale.present)) return [];
      const g = huracan.group, yaw = g.rotation.y, [lx, lz] = leftOf(yaw), [fx, fz] = fwdOf(yaw);
      return [{ id: 'drive', x: g.position.x + lx * 1.05 - fx * 0.2, y: 0.95, z: g.position.z + lz * 1.05 - fz * 0.2, reach: 2.4, cone: 0.55 }];
    },
    prompt(id) { return id === 'drive' ? { target: T('你的 Huracán', 'Your Huracán'), action: T('开车', 'Drive') } : null; },
    owns(id) { return id === 'drive'; },
    interact(id) { if (id === 'drive') start(); return true; },
    exit,
    key(code) {
      if (!S.on) return false;
      if (code === 'KeyE') { exit(); return true; }
      if (code === 'KeyV') { S.cam = S.cam === 'chase' ? 'seat' : 'chase'; player.yaw = 0; player.pitch = -0.04; return true; }
      if (code === 'KeyH') { if (audio && audio.cue) audio.cue('carhorn', 0, 1); S.horn = 1.2; return true; }
      return false;
    },
    // the person the traffic yields to while you drive: a car-sized one
    trafficBody() { const d = S.d, [fx, fz] = fwdOf(d.yaw); return { x: d.x, z: d.z, vx: fx * d.v, vz: fz * d.v, reach: CAR.length / 2 + 0.3, wide: 0.9 }; },
    update(dt, paused = false) {
      if (!S.on) return;
      const d = S.d, inp = player.input;
      if (!paused) {
        stepDrive(d, { throttle: inp.f ? 1 : 0, brake: inp.b ? 1 : 0, steer: (inp.r ? 1 : 0) - (inp.l ? 1 : 0), handbrake: S.hand }, dt, blocked);
        if (d.hit > 1.2) { S.shake = Math.min(1, d.hit / 8); if (audio && audio.cue) audio.cue('bump', 0, Math.min(1, d.hit / 6)); }
        place(d.x, d.z, d.yaw);
        huracan.spinWheels(d.odo);
        engine.update({ rpm: d.rpm, throttle: d.throttle, slip: d.slip, level: 1 });
      } else engine.update({ rpm: 0, throttle: 0, level: 0 });
      player.body.x = d.x; player.body.z = d.z; player.body.y = 0; player.body.vx = Math.cos(d.yaw) * d.v; player.body.vz = -Math.sin(d.yaw) * d.v;
      // the camera
      S.shake = Math.max(0, S.shake - dt * 3);
      const [fx, fz] = fwdOf(d.yaw), [lx, lz] = leftOf(d.yaw), sh = S.shake * 0.08;
      if (S.cam === 'chase') {
        const back = 6.2 + Math.min(2, Math.abs(d.v) / 15), want = new THREE.Vector3(d.x - fx * back, 2.0 + Math.abs(d.v) / 40, d.z - fz * back);
        S.camPos.lerp(want, 1 - Math.exp(-dt * 6));
        camera.position.copy(S.camPos); camera.position.x += (Math.random() - 0.5) * sh; camera.position.y += (Math.random() - 0.5) * sh;
        camera.lookAt(d.x + fx * 4, 0.9, d.z + fz * 4);
      } else {
        player.yaw = Math.max(-1.9, Math.min(1.9, player.yaw)); player.pitch = Math.max(-0.7, Math.min(0.5, player.pitch));
        camera.position.set(d.x - fx * 0.25 + lx * 0.36 + (Math.random() - 0.5) * sh, 0.93, d.z - fz * 0.25 + lz * 0.36);
        camera.rotation.set(player.pitch, d.yaw - Math.PI / 2 + player.yaw, 0, 'YXZ');
      }
      dial.querySelector('b').textContent = kmh(d.v); dial.querySelector('i').textContent = d.gear < 0 ? 'R' : d.v === 0 ? 'N' : d.gear;
    },
  };
}
