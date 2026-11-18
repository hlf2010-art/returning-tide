// Line 2, East Nanjing Road ⇄ Lujiazui, walked and ridden. You go down an exit's stairs into the
// concourse, through security if you're carrying a bag (on the X-ray belt; with nothing to screen you
// walk past), tap Alipay's Metro QR code at a gate (E), take the escalator or the stair down, wait behind
// the screen doors, and when a train comes in (the alert, the announcement, the doors) you step aboard.
// The train is real: you stand in it as it pulls out and runs under the river (the lights in the tunnel
// go by the windows), the screens over the doors and the announcements tell you the next station, and at
// the other end the doors open on to the other platform. Up, tap out (¥3 on Alipay), and up an exit.
//   The plan: world/metroLayout.js. The line and the timetable: engine/metroLine.js. The fabric:
//   world/metroBuild.js; the trains: world/metroTrain.js; the people: world/metroFolk.js; the sound:
//   engine/metroAudio.js (procedural) and recorded announcements (cast: metropa, metrostaff).
// Trains run from about 5:30 am to 11 pm; outside those the gates won't let you in.
// Nothing is built until you come near a station; nothing is drawn unless you're near one or aboard.
import * as THREE from 'three';
import { getLang } from '../ui/i18n.js';
import { movers } from './layout.js';
import { STATIONS, HOOK, Y, PLAT, GATE, gateP, SEC, ESC, CONC, CAR, metroZone, stationAt } from './metroLayout.js';
import { trainsAt, trainClock, carAt, trackAt, lineAt, LENGTH, RUN, DOORS, STOP_S } from '../engine/metroLine.js';
import { createMetroAudio } from '../engine/metroAudio.js';
import { metroMaterials, buildStation, buildTunnels } from './metroBuild.js';
import { createTrainSet, carToWorld, worldToCar, CAR_IN, CAR_SEATS, FLOOR } from './metroTrain.js';
import { IDX, METRO_TEXT, alipayQr, makeCanvas } from './metroTextures.js';
import { FONT, loadFonts } from './canvas.js';
import { pay as lifePay, stamp } from '../engine/life.js';
import { withMe } from '../engine/shopping.js';
import { inPudong } from './lujiazuiLayout.js';

const T = (zh, en) => (getLang() === 'zh' ? zh : en);
// what the station and the trains say (the voices: tools/voice/cast.json metropa, metrostaff)
export const METRO_LINES = {
  arriveE: ['metropa', '开往广兰路方向的列车即将进站，请站在黄色安全线以内候车，先下后上。', 'The train to Guanglan Road is arriving. Please stand behind the yellow line, and let passengers off first.'],
  arriveW: ['metropa', '开往徐泾东方向的列车即将进站，请站在黄色安全线以内候车，先下后上。', 'The train to East Xujing is arriving. Please stand behind the yellow line, and let passengers off first.'],
  closing: ['metropa', '车门即将关闭，请勿靠近车门。', 'The doors are closing. Please stand clear of the doors.'],
  departE: ['metropa', '欢迎乘坐轨道交通2号线，本次列车开往广兰路方向。下一站，陆家嘴，开左边门。', 'Welcome aboard Line 2. This train is bound for Guanglan Road. The next station is Lujiazui. Doors will open on the left.'],
  departW: ['metropa', '欢迎乘坐轨道交通2号线，本次列车开往徐泾东方向。下一站，南京东路，可换乘10号线，开左边门。', 'Welcome aboard Line 2. This train is bound for East Xujing. The next station is East Nanjing Road, interchange with Line 10. Doors will open on the left.'],
  atLjz: ['metropa', '陆家嘴站到了。下车的乘客请带好随身物品，从左边门下车。', 'We are arriving at Lujiazui. Please take your belongings and leave by the doors on the left.'],
  atEnr: ['metropa', '南京东路站到了，可换乘10号线。下车的乘客请带好随身物品，从左边门下车。', 'We are arriving at East Nanjing Road, interchange with Line 10. Please take your belongings and leave by the doors on the left.'],
  nextE: ['metropa', '下一站，东昌路。', 'The next station is Dongchang Road.'],
  nextW: ['metropa', '下一站，人民广场，可换乘1号线、8号线。', "The next station is People's Square, interchange with Lines 1 and 8."],
  escalator: ['metropa', '乘坐扶梯时，请紧握扶手，照看好身边的老人和小孩。', 'On the escalator, please hold the handrail, and look after children and the elderly.'],
  belongings: ['metropa', '各位乘客，请照看好您的随身物品，注意安全。', 'Passengers, please keep an eye on your belongings.'],
  bagAsk: ['metrostaff', '您好，包放上来过一下安检。', 'Hello, put your bag on the belt for the X-ray, please.'],
  bagStop: ['metrostaff', '先生，包要过一下安检。', 'Sir, your bag needs to go through the X-ray.'],
  bagOk: ['metrostaff', '好了，拿好您的包。', "That's fine. Here's your bag."],
  wrongGate: ['metrostaff', '这边是出站的，进站走右边。', "That's the way out. The way in is on the right."],
};
const NAMES = { enr: { zh: '南京东路', en: 'East Nanjing Rd' }, ljz: { zh: '陆家嘴', en: 'Lujiazui' } };
const BAG_KINDS = new Set(['gift', 'home', 'part', 'tool']);
export const carryingBag = (L) => !!L && withMe(L).some((i) => BAG_KINDS.has(i.kind) || (i.kind === 'gadget' && !i.use));

export function createMetro({ scene, camera, renderer = null, hud, audio, voice, player, people = null, getLife, save, open = () => true, onPudongSoon = null, travel = null }) {
  const root = new THREE.Group(); root.name = 'metro'; root.visible = false; scene.add(root);
  loadFonts([[`800 40px ${FONT.sans}`, METRO_TEXT], [`900 40px ${FONT.sans}`, METRO_TEXT], [`500 40px ${FONT.sans}`, METRO_TEXT], [`600 40px ${FONT.sans}`, METRO_TEXT], [`700 40px ${FONT.sans}`, METRO_TEXT]]);
  const hemi = new THREE.HemisphereLight(0xf4f6fa, 0x8e8a84, 0), sun = new THREE.DirectionalLight(0xfffcf6, 0);
  sun.position.set(0.25, 1, 0.35); root.add(hemi, sun, sun.target);
  const maud = createMetroAudio(audio);
  const S = { built: false, st: {}, tunnels: null, trains: null, folk: null, m: null, clock: 0, T: 0, list: [], near: [], cars: new Map(), ride: null, rideTrain: null,
    under: 0, zone: null, tapIn: null, screened: {}, gates: {}, fired: new Set(), lastPa: -99, escPa: -99, bag: null, hint: {}, holdBark: -99, rides: 0, qr: null, rescue: 0 };
  for (const st of STATIONS) S.gates[st.id] = Array.from({ length: GATE.n }, () => ({ open: 0, want: 0, until: 0 }));

  function build() {
    if (S.built) return; S.built = true;
    const t0 = performance.now();
    S.m = metroMaterials();
    for (const st of STATIONS) S.st[st.id] = buildStation(root, st, S.m);
    S.tunnels = buildTunnels(root, S.m);
    S.trains = createTrainSet(root, { slots: 3 });
    // the bag on the X-ray belt
    S.bagMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.32).translate(0, 0.14, 0), new THREE.MeshStandardMaterial({ color: 0x23282e, roughness: 0.7 })); S.bagMesh.visible = false; root.add(S.bagMesh);
    if (people) import('./metroFolk.js').then(({ createMetroFolk }) => { S.folk = createMetroFolk({ root, people, metro: api }); }).catch((e) => console.warn('metro folk:', e));
    if (renderer) { const was = root.visible; root.visible = true; try { renderer.compile(root, camera, scene); } catch (e) { console.warn('metro: precompile skipped', e); } root.visible = was; }
    // what the polished stone and steel reflect: the station itself, once
    if (renderer) {
      try {
        const rt = new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType }), cam = new THREE.CubeCamera(0.3, 300, rt), st = STATIONS[0], [x, z] = st.F.toW(30, 0);
        const vis = scene.children.map((o) => [o, o.visible]); for (const [o] of vis) if (o !== root) o.visible = false; root.visible = true; hemi.intensity = 1.6; sun.intensity = 0.6;
        cam.position.set(x, Y.C + 1.6, z); cam.update(renderer, scene);
        for (const [o, v] of vis) o.visible = v; root.visible = false; hemi.intensity = sun.intensity = 0;
        const env = new THREE.PMREMGenerator(renderer).fromCubemap(rt.texture).texture;
        for (const k of ['granite', 'platform', 'steel', 'glass', 'psdGlass', 'panel', 'ceiling', 'dark', 'flap']) { S.m[k].envMap = env; S.m[k].envMapIntensity = k === 'granite' || k === 'platform' ? 0.9 : 0.7; S.m[k].needsUpdate = true; }
        for (const k of ['steel', 'seat', 'glass', 'body']) if (S.trains.M[k]) { S.trains.M[k].envMap = env; S.trains.M[k].envMapIntensity = 0.6; S.trains.M[k].needsUpdate = true; }
        rt.dispose();
      } catch (e) { console.warn('metro: env capture skipped', e); }
    }
    console.info('Metro built', Math.round(performance.now() - t0), 'ms');
  }

  // ---- the trains this frame ----
  const absMinute = () => { const l = getLife(); return l.clock.day * 1440 + l.clock.minute + l.clock.sec / 60; };
  const carsOf = (tr) => { let c = S.cars.get(tr.id); if (!c) { c = []; for (let k = 0; k < CAR.n; k++) c.push(carAt(tr, k)); S.cars.set(tr.id, c); } return c; };
  const trainPos = (tr) => trackAt(tr.s, tr.dir);
  // the car a point is in: { tr, k, c, lx, lz } or null
  function carOf(x, z, y, pad = 0) {
    for (const tr of S.near) {
      const c0 = trainPos(tr); if (Math.abs(c0.x - x) > 110 || Math.abs(c0.z - z) > 110) continue;
      const cs = carsOf(tr);
      for (let k = 0; k < cs.length; k++) {
        const c = cs[k]; if (Math.abs(c.x - x) > 13 || Math.abs(c.z - z) > 13) continue;
        if (y != null && Math.abs(y - (c.y + FLOOR)) > 1.1) continue;
        const [lx, lz] = worldToCar(c, x, z);
        if (Math.abs(lz) <= CAR_IN.half + 0.31 && lx >= -CAR_IN.x - 0.1 - pad && lx <= CAR_IN.x + 0.17 + pad) return { tr, k, c, lx, lz };
      }
    }
    return null;
  }
  const leftOpen = (tr) => (tr.phase === 'dwell' ? tr.doors : 0);
  // the car's rules: in its aisle (clear of the benches and the vestibule poles), out by an open door, on through the gangway
  const trainMover = {
    ground(x, z, y) { if (y == null || y > -1.6 || !S.near.length) return null; const h = carOf(x, z, y); return h ? h.c.y + FLOOR : null; },
    keep(b) {
      b.metroTrain = false;
      if (b.y > -1.6 || !S.near.length) return;
      const h = carOf(b.x, b.z, b.y); if (!h) return;
      b.metroTrain = true;
      let { lx, lz } = h; const r = 0.28, open = leftOpen(h.tr) > 0.7;
      const atDoor = CAR.doors.find((d) => Math.abs(lz - d) < CAR.doorW / 2 - r + 0.05);
      const xmax = atDoor != null && open ? 2.2 : CAR_IN.x - r;
      const inSeats = CAR_SEATS.some(([z0, z1]) => lz > z0 - r && lz < z1 + r);
      const side = inSeats ? CAR_IN.seatX - r : CAR_IN.x - r;
      lx = Math.max(-side, Math.min(atDoor != null && open ? xmax : side, lx));
      // the car's ends: the gangway is 1.4 m wide; the cabs close the train's two ends
      const end = CAR_IN.half - r;
      if (Math.abs(lz) > end) { const lead = lz > 0 ? h.k === 0 : h.k === CAR.n - 1; if (lead || Math.abs(lx) > 0.7 - r) lz = Math.sign(lz) * end; }
      for (const d of CAR.doors) { const dz = lz - d, dl = Math.hypot(lx, dz); if (dl < 0.28 && dl > 1e-4) { lx = lx / dl * 0.28; lz = d + dz / dl * 0.28; } }
      [b.x, b.z] = carToWorld(h.c, lx, lz);
    },
  };
  movers.unshift(trainMover);

  // ---- what the layout asks ----
  const doorsAt = (st, side) => { const i = STATIONS.indexOf(st); const tr = S.list.find((t) => t.phase === 'dwell' && t.station === i && t.dir === side); return tr ? tr.doors : 0; };
  HOOK.gateOpen = (st, i) => S.gates[st.id][i].open > 0.55;
  HOOK.doorOpen = (st, side) => doorsAt(st, side) > 0.7;
  HOOK.mustScreen = (st) => carryingBag(getLife()) && !S.screened[st.id];
  HOOK.inTrain = (b) => !!b.metroTrain;
  // shut for the night (about 23:15 to 5:15): the shutters come down, but never on you (only once you're out)
  HOOK.closed = () => S.shut;
  HOOK.onHit = (st, o) => {
    if (o.hold && S.clock - S.holdBark > 5) { S.holdBark = S.clock; staff('bagStop', st); }
    if (o.shut && S.clock - S.holdBark > 4) { S.holdBark = S.clock; hud.toast(T('本站运营已结束，首班车早上五点半左右。', 'The station is shut for the night. The first train is at about 5:30 am.'), 3.4); }
  };

  function line(key) { return METRO_LINES[key]; }
  // an announcement: the subtitle, then Mandarin and English, as Shanghai's are
  function pa(key, { gain = 0.9 } = {}) {
    const [who, zh, en] = line(key);
    hud.bark({ speaker: { zh: '广播', en: 'Announcement' }, text: { zh, en }, seconds: Math.max(4, zh.length / 4.2), voice: false });
    if (voice) voice.say({ zh, en, who, lang: 'zh', gain, onEnd: () => voice.say({ zh, en, who, lang: 'en', gain }) });
    S.lastPa = S.clock;
  }
  function staff(key, st) {
    const [who, zh, en] = line(key), [x, z] = st.F.toW(SEC.belt.a1 + 0.6, SEC.lane[0] + 0.2);
    hud.bark({ speaker: { zh: '安检员', en: 'Security' }, text: { zh, en }, seconds: 3, voice: false });
    if (voice) voice.say({ zh, en, who, at: [x, Y.C + 1.6, z], gain: 1.1 });
  }

  // ---- gates ----
  function openGate(st, i, secs = 3.2, sound = true) {
    const g = S.gates[st.id][i]; g.want = 1; g.until = S.clock + secs;
    if (sound && nearPlayer(st, GATE.a, gateP(i), 14)) maud.gateFlap();
  }
  function nearPlayer(st, a, p, r) { const b = player.body, [x, z] = st.F.toW(a, p); return Math.hypot(b.x - x, b.z - z) < r && Math.abs(b.y - Y.C) < 4; }
  // the QR on your phone, for a moment, as you hold it to the reader
  function showQr(then) {
    if (typeof document === 'undefined') { then(); return; }
    if (!S.qr) {
      const el = document.createElement('div'); el.className = 'metro-qr';
      el.style.cssText = 'position:fixed;left:50%;bottom:16vh;transform:translateX(-50%) translateY(20px);width:220px;padding:10px;border-radius:26px;background:rgba(255,255,255,0.42);backdrop-filter:blur(18px) saturate(1.4);-webkit-backdrop-filter:blur(18px) saturate(1.4);box-shadow:0 0 0 0.5px rgba(255,255,255,0.7) inset,0 12px 40px rgba(0,0,0,0.25);opacity:0;transition:opacity .18s ease,transform .18s ease;pointer-events:none;z-index:40';
      const [c, x] = makeCanvas(440, 560); c.style.cssText = 'width:100%;display:block;border-radius:18px'; el.appendChild(c); document.body.appendChild(el); S.qr = { el, c, x };
    }
    alipayQr(S.qr.c, S.qr.x, S.clock * 3);
    S.qr.el.style.opacity = '1'; S.qr.el.style.transform = 'translateX(-50%) translateY(0)';
    setTimeout(() => { then(); setTimeout(() => { S.qr.el.style.opacity = '0'; S.qr.el.style.transform = 'translateX(-50%) translateY(20px)'; }, 650); }, 520);
  }
  function tapIn(st, i) {
    if (!open()) { maud.denied(); hud.toast(T('闸机关着。末班车已经开走了，首班车早上五点半左右。', 'The gates are shut. The last train has gone; the first is at about 5:30 am.'), 3.6); return; }
    showQr(() => { maud.gate(); openGate(st, i); S.tapIn = { st: st.id, at: stamp(getLife()) }; hud.toast(T('刷码进站 · 支付宝乘车码', 'In · Alipay transit code'), 2.2); });
  }
  function tapOut(st, i) {
    const L = getLife(), from = S.tapIn ? S.tapIn.st : st.id;
    showQr(() => {
      if (L && L.wallet) {
        const r = lifePay(L, { method: 'alipay', amount: 3, to: '上海地铁 Shanghai Metro', memo: `2号线 ${NAMES[from].zh}→${NAMES[st.id].zh}`, kind: 'transport' });
        if (!r.ok) { maud.denied(); hud.toast(T('支付宝余额不足。到服务中心补票，或者先充值。', 'Not enough on Alipay. Top up first.'), 3.4); return; }
        r.entry.memoEn = `Line 2, ${NAMES[from].en} to ${NAMES[st.id].en}`; save && save();
      }
      maud.gate(); openGate(st, i); S.tapIn = null;
      hud.toast(T(`刷码出站 · 支付宝 −¥3 · ${NAMES[st.id].zh}`, `Out · Alipay −¥3 · ${NAMES[st.id].en}`), 2.6);
    });
  }
  // ---- security: your bag on the belt ----
  function screenBag(st) {
    S.screened[st.id] = true; maud.xray();
    S.bag = { st, t: 0, got: false };
    hud.toast(T('包放上了安检机', 'Your bag goes on the belt'), 2);
  }

  // ---- E ----
  const TGT = [];
  function candidates() {
    TGT.length = 0;
    if (!S.built) return TGT;
    const b = player.body, z = S.zone; if (!z) return TGT;
    const st = z.st, { a, p } = z;
    if (z.level === 'unpaid' && a > GATE.a - 2.4 && a < GATE.a - 0.4) for (let i = 0; i < GATE.n; i++) if (Math.abs(p - gateP(i)) < 0.45) { const [x, zz] = st.F.toW(GATE.a - 0.5, gateP(i)); TGT.push({ id: `metro:gate:${st.id}:${i}:in`, x, y: Y.C + 1.0, z: zz, reach: 2.6, cone: 0.7 }); }
    if (z.level === 'paid' && a > GATE.a + 0.4 && a < GATE.a + 2.4) for (let i = 0; i < GATE.n; i++) if (Math.abs(p - gateP(i)) < 0.45) { const [x, zz] = st.F.toW(GATE.a + 0.5, gateP(i)); TGT.push({ id: `metro:gate:${st.id}:${i}:out`, x, y: Y.C + 1.0, z: zz, reach: 2.6, cone: 0.7 }); }
    if (z.level === 'unpaid' && HOOK.mustScreen(st) && a > -2.5 && a < SEC.a + 0.2 && p > SEC.open[1] - 0.4 && p < SEC.lane[1] + 0.3) { const [x, zz] = st.F.toW(SEC.infeed, (SEC.belt.p0 + SEC.belt.p1) / 2); TGT.push({ id: `metro:xray:${st.id}`, x, y: Y.C + 0.85, z: zz, reach: 3, cone: 0.7 }); }
    if (st.id === 'ljz' && a < CONC.a0 + 2.5 && Math.abs(p) < 1.6 && z.level === 'unpaid') { const [x, zz] = st.F.toW(CONC.a0 - 1.5, 0); TGT.push({ id: 'metro:ex1', x, y: Y.C + 1.4, z: zz, reach: 4, cone: 0.6 }); }
    void b;
    return TGT;
  }
  function prompt(id) {
    const [, kind, sid, i, dir] = id.split(':'), st = STATIONS.find((s) => s.id === sid);
    if (kind === 'gate') {
      const out = dir === 'out', wrong = out ? +i >= GATE.out : +i < GATE.out;
      if (wrong) return { target: T('闸机', 'Gate'), action: out ? T('这是进站闸机 · 走左边出站', 'An entry gate · the way out is on the left') : T('这是出站闸机 · 进站走右边', 'An exit gate · the way in is on the right') };
      if (!out && !open()) return { target: T(`${NAMES[sid].zh}站 · 已停运`, `${NAMES[sid].en} · closed`), action: T('末班车已开走 · 首班车约5:30', 'Last train gone · first ~5:30') };
      return out ? { target: T('出站闸机', 'Exit gate'), action: T('刷支付宝乘车码出站（¥3）', 'Tap out with Alipay (¥3)') } : { target: T('进站闸机 · 2号线', 'Entry gate · Line 2'), action: T('刷支付宝乘车码进站', 'Tap in with Alipay') };
    }
    if (kind === 'xray') return { target: T('安检机', 'X-ray belt'), action: T('把包放上传送带', 'Put your bag on the belt') };
    if (id === 'metro:ex1') return { target: T('1号口通道', 'The passage to Exit 1'), action: T('往东方明珠 · 陆家嘴环路', 'To the Oriental Pearl · Ring Rd') };
    void st; return null;
  }
  function interact(id) {
    const [, kind, sid, i, dir] = id.split(':'), st = STATIONS.find((s) => s.id === sid);
    if (kind === 'gate') {
      const out = dir === 'out', wrong = out ? +i >= GATE.out : +i < GATE.out;
      if (wrong) { maud.denied(); staffNear('wrongGate', st); return true; }
      if (out) tapOut(st, +i); else tapIn(st, +i);
      return true;
    }
    if (kind === 'xray') { screenBag(st); return true; }
    if (id === 'metro:ex1') { exit1(); return true; }
    return false;
  }
  function staffNear(key, st) { const [who, zh, en] = line(key); hud.bark({ speaker: { zh: '站务员', en: 'Station staff' }, text: { zh, en }, seconds: 3, voice: false }); const [x, z] = st.F.toW(GATE.a + 2, -5); if (voice) voice.say({ zh, en, who, at: [x, Y.C + 1.6, z] }); }
  // Lujiazui's Exit 1: a long passage, walked in one go (the fade)
  function exit1() {
    const W = STATIONS[1].ways.passages[0].well, t = W.run + 0.6, x = W.top[0] + W.dx * t, z = W.top[1] + W.dz * t;
    const go = () => { player.teleport(x, z, Math.atan2(W.dx, W.dz), 0, -W.depth); hud.toast(T('1号口 · 东方明珠 · 陆家嘴环路', 'Exit 1 · the Oriental Pearl · Ring Rd'), 3); };
    if (travel) travel(async () => go(), { hold: 600, line: T('地下通道 · 往1号口', 'The passage to Exit 1'), to: 'play' }); else go();
  }
  function fromExit1() {
    build();
    const st = STATIONS[1], [x, z] = st.F.toW(CONC.a0 + 1.2, 0);
    const go = () => { player.teleport(x, z, st.F.rot === 0 ? -Math.PI / 2 : Math.atan2(st.F.ux, st.F.uz) + Math.PI, 0, Y.C); hud.toast(T('陆家嘴站 · 站厅', 'Lujiazui station · concourse'), 3); };
    if (travel) travel(async () => go(), { hold: 600, line: T('地下通道 · 往陆家嘴站站厅', 'The passage to the concourse'), to: 'play' }); else go();
  }

  // ---- per frame ----
  // before your own step: the trains move, and whoever is aboard moves with them
  function pre(dt) {
    S.clock += dt; HOOK.dt = dt;
    S.T = trainClock(absMinute());
    S.list = trainsAt(S.T); S.cars.clear();
    const b = player.body;
    const nearLine = S.built && (b.y < -0.5 || stationNear(b, 140));
    S.near = nearLine ? S.list.filter((tr) => { const c = trainPos(tr); return Math.hypot(c.x - b.x, c.z - b.z) < (S.ride ? 260 : 230); }) : [];
    if (S.ride) {
      const tr = S.near.find((t) => t.id === S.ride.id);
      if (!tr) S.ride = null;
      else {
        const c = carsOf(tr)[S.ride.k], [x, z] = carToWorld(c, S.ride.lx, S.ride.lz);
        b.x = x; b.z = z; b.y = c.y + FLOOR + S.ride.dy; player.yaw += c.heading - S.ride.h;
      }
    }
  }
  function stationNear(b, r) { for (const st of STATIONS) { const B = st.box; if (b.x > B.x0 - r && b.x < B.x1 + r && b.z > B.z0 - r && b.z < B.z1 + r) return st; } return null; }

  function update(dt, { playing = true } = {}) {
    const b = player.body;
    const close = stationNear(b, 160);
    if (!S.built && close) build();
    if (!S.built) { S.under = 0; S.zone = null; return; }
    // aboard?
    const h = b.y < -1.6 ? carOf(b.x, b.z, b.y) : null;
    const was = S.ride;
    S.ride = h ? { id: h.tr.id, k: h.k, lx: h.lx, lz: h.lz, h: h.c.heading, dy: Math.max(0, b.y - (h.c.y + FLOOR)) } : null;
    S.rideTrain = h ? h.tr : null;
    if (h && !was) S.rides++;
    // carried on past the last station the game builds (west of East Nanjing Road toward Jing'an Temple, east of
    // Lujiazui toward Dongchang Road): off at the next stop, the train back the other way, and you're on the
    // platform you left, a quarter of an hour later
    if (h && !S.overrun) {
      const tr = h.tr, past = tr.dir < 0 ? tr.s < STOP_S[0] - 70 : tr.s > STOP_S[1] + 70;
      if (past) {
        S.overrun = true;
        const st = STATIONS[tr.dir < 0 ? 0 : 1], next = tr.dir < 0 ? T('人民广场', "People's Square") : T('东昌路', 'Dongchang Road');
        const go = () => { const L = getLife(); if (L) { L.clock.minute = (L.clock.minute + 14) % 1440; } const [x, z] = st.F.toW(PLAT.ac - 6, tr.dir < 0 ? 2.5 : -2.5); player.teleport(x, z, player.yaw, 0, Y.P); S.ride = null; S.rideTrain = null; S.overrun = false; save && save(); };
        const line = T(`坐过了站 · 在${next}下车，坐反方向回来`, `You missed your stop · off at ${next}, and back the other way`);
        if (travel) travel(async () => go(), { hold: 1400, line, to: 'play' }); else { go(); hud && hud.toast(line, 4); }
      }
    }
    S.zone = h ? null : metroZone(b.x, b.z, b.y);
    // underground: how far (the stairwells fade you in)
    const deep = h || S.zone || (b.y < -1.6 && distToLine(b) < 12);
    const target = deep ? Math.max(0, Math.min(1, (-b.y - 0.6) / 2.6)) : 0;
    S.under += (target - S.under) * Math.min(1, dt * 4);
    hemi.intensity = 1.55 * S.under; sun.intensity = 0.55 * S.under;
    // stranded underground off the line (a save loaded mid-ride, a train gone): back to the nearest platform
    if (!h && !S.zone && b.y < -6 && distToLine(b) < 14) { S.rescue += dt; if (S.rescue > 0.5) { const st = STATIONS.reduce((best, s) => (Math.hypot(s.F.ox - b.x, s.F.oz - b.z) < Math.hypot(best.F.ox - b.x, best.F.oz - b.z) ? s : best)); const [x, z] = st.F.toW(PLAT.ac + 10, 0); player.teleport(x, z, player.yaw, 0, Y.P); S.rescue = 0; } } else S.rescue = 0;
    // the night: once the last train has gone and you're not inside, the shutters are down until morning
    { const m = getLife().clock.minute, night = m >= 23 * 60 + 15 || m < 5 * 60 + 15; if (!night) S.shut = false; else if (!S.zone || S.zone.level === 'way') S.shut = true; }
    // what's drawn
    root.visible = !!(close || h || S.under > 0.01);
    for (const st of STATIONS) S.st[st.id].group.visible = root.visible && (stationNear(b, 120) === st || (S.under > 0.01 && Math.hypot(st.F.ox - b.x, st.F.oz - b.z) < 320));
    S.tunnels.visible = root.visible && S.under > 0.01 && (!!h || (S.zone && (S.zone.level === 'platform' || S.zone.level === 'escalator')));
    // deep in a station or aboard, the street overhead can't be seen: not drawn (as Lujiazui stows the Bund)
    const sealed = S.under > 0.97 && (h || (S.zone && (S.zone.level === 'platform' || S.zone.level === 'escalator')));   // (from the concourse the exits' stairs show the street)
    stow(!!sealed);
    // Lujiazui is built in good time (it takes a moment): once you're on your way east
    if (h && h.tr.dir > 0 && onPudongSoon && (h.tr.phase !== 'dwell' || h.tr.station === 0)) onPudongSoon();
    animate(dt);
    events(dt, h);
    if (S.folk) S.folk.update(dt, { playing });
    sound(dt, h);
  }
  const STOW_KEEP = new Set(['metro', 'player', 'lighting']);
  let stowed = [], stowCheck = 0;
  function stow(on) {
    if (on) {
      if ((stowCheck -= 1) > 0 && stowed.length) return; stowCheck = 15;
      for (const o of scene.children) if (o.visible && !STOW_KEEP.has(o.name) && !o.isLight && !o.isCamera) { o.visible = false; stowed.push(o); }
    } else if (stowed.length) {
      const b = player.body;
      for (const o of stowed) o.visible = o.name === 'lujiazui' ? inPudong(b.x, b.y) : true;
      stowed = [];
    }
  }
  function distToLine(b) {
    // coarse: nearest of samples every 20 m
    let best = Infinity; for (let s = 0; s <= LENGTH; s += 20) { const c = lineAt(s); const d = Math.hypot(c.x - b.x, c.z - b.z); if (d < best) best = d; } return best;
  }

  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler(), UP = new THREE.Vector3(0, 1, 0);
  function animate(dt) {
    // trains: the nearest three into the drawn slots
    const tset = S.trains; tset.begin();
    const b = player.body;
    const order = S.near.map((tr) => ({ tr, d: S.rideTrain === tr ? -1 : Math.hypot(trainPos(tr).x - b.x, trainPos(tr).z - b.z) })).sort((u, v) => u.d - v.d).slice(0, tset.slots);
    order.forEach(({ tr }, slot) => tset.place(slot, carsOf(tr), leftOpen(tr), screenInfo(tr)));
    tset.end();
    // stations: screen doors, gates, escalators
    for (const st of STATIONS) {
      const V = S.st[st.id]; if (!V.group.visible) continue;
      for (const side of [-1, 1]) {
        const o = doorsAt(st, side);
        V.psd.doors.forEach((d, j) => {
          if (d.s !== side) return;
          for (const hh of [-1, 1]) {
            const k = j * 2 + (hh > 0 ? 1 : 0), a = d.a + hh * (0.5 + o * 0.98), [x, z] = st.F.toW(a, side * (PLAT.psd + 0.06));
            _m.compose(_p.set(x, Y.P + 1.22, z), _q.setFromAxisAngle(UP, -st.F.rot), _s.set(1, 1, 1)); V.psdDoors.setMatrixAt(k, _m);
            const [ex, ez] = st.F.toW(d.a + hh * o * 0.98, side * (PLAT.psd + 0.06)); _m.compose(_p.set(ex, Y.P + 1.22, ez), _q, _s.set(1, 1, 1)); V.psdFrames.setMatrixAt(k, _m);
          }
        });
      }
      V.psdDoors.instanceMatrix.needsUpdate = true; V.psdFrames.instanceMatrix.needsUpdate = true;
      const G = S.gates[st.id];
      for (let i = 0; i < GATE.n; i++) {
        const g = G[i];
        if (g.want && S.clock > g.until) { const [x, z] = st.F.toW(GATE.a, gateP(i)); if (!(Math.abs(b.y - Y.C) < 2 && Math.hypot(b.x - x, b.z - z) < 0.8)) g.want = 0; }
        g.open += ((g.want ? 1 : 0) - g.open) * Math.min(1, dt / 0.12);
        for (const hh of [-1, 1]) {
          const len = 0.3 * (1 - g.open) + 0.02, pc = gateP(i) + hh * (GATE.half - len / 2), [x, z] = st.F.toW(GATE.a, pc);
          _m.compose(_p.set(x, Y.C + 0.62, z), _q.setFromAxisAngle(UP, -st.F.rot), _s.set(1, 1, len)); V.flaps.setMatrixAt(i * 2 + (hh > 0 ? 1 : 0), _m);
        }
      }
      V.flaps.instanceMatrix.needsUpdate = true;
      V.shutters.visible = S.shut;
      const svc = open();
      for (const l of V.lamps) l.o.material = svc && l.go ? S.m.green : S.m.red;
    }
    if (S.m) { S.m.stepsDown.map.offset.x -= ESC.speed * dt / 0.4; S.m.stepsUp.map.offset.x += ESC.speed * dt / 0.4; }
    // the bag on the belt
    if (S.bag) {
      const B = S.bag; B.t += dt;
      const f = Math.min(1, B.t / 4.2), a = SEC.belt.a0 + 0.3 + (SEC.outfeed - SEC.belt.a0 - 0.3) * f, [x, z] = B.st.F.toW(a, (SEC.belt.p0 + SEC.belt.p1) / 2);
      S.bagMesh.visible = !B.got; S.bagMesh.position.set(x, Y.C + 0.76, z); S.bagMesh.rotation.y = -B.st.F.rot;
      if (B.t > 1.0 && !B.asked) { B.asked = true; }
      const [px, pz] = [b.x, b.z];
      if (f >= 1 && !B.got && Math.hypot(px - x, pz - z) < 1.6) { B.got = true; staff('bagOk', B.st); }
      if (B.got || B.t > 90) { S.bagMesh.visible = false; if (B.got) S.bag = null; }
    }
  }
  function screenInfo(tr) {
    const stIdx = (i) => (i === 0 ? IDX.enr : IDX.ljz), dir = tr.dir, t = S.clock;
    if (tr.phase === 'dwell') return { dir, next: stIdx(tr.station), here: stIdx(tr.station), t };
    // which stops are still ahead
    const ahead = (dir > 0 ? [0, 1] : [1, 0]).filter((i) => { const s = i === 0 ? stopS(0) : stopS(1); return dir > 0 ? tr.s < s - 1 : tr.s > s + 1; });
    if (ahead.length) return { dir, next: stIdx(ahead[0]), here: null, t };
    return { dir, next: dir > 0 ? IDX.ljz + 1 : IDX.enr - 1, here: null, t };
  }
  const stopS = (i) => { const st = STATIONS[i], [x, z] = st.F.toW(PLAT.ac, 0); let best = 0, bd = Infinity; for (let s = 0; s <= LENGTH; s += 1) { const c = lineAt(s); const d = (c.x - x) ** 2 + (c.z - z) ** 2; if (d < bd) { bd = d; best = s; } } return best; };
  const STOPS = [stopS(0), stopS(1)];

  // the announcements, the chimes, the doors: once each per train and station
  function once(key) { if (S.fired.has(key)) return false; S.fired.add(key); if (S.fired.size > 400) S.fired = new Set([...S.fired].slice(-200)); return true; }
  function events(dt, h) {
    const b = player.body, z = S.zone;
    for (const tr of S.near) {
      const stI = tr.station, st = stI != null ? STATIONS[stI] : null, aboard = h && h.tr === tr;
      const c = trainPos(tr), dist = Math.hypot(c.x - b.x, c.z - b.z);
      const onPlat = z && z.level === 'platform';
      if (tr.phase === 'dwell') {
        const key = `${tr.id}:${stI}`;
        if (tr.dwellT >= DOORS.open0 && (aboard || (onPlat && dist < 120)) && once(`${key}:open`)) maud.doors(true);
        if (tr.dwellT >= DOORS.chime && (aboard || (onPlat && dist < 120)) && once(`${key}:chime`)) { maud.doorChime(); if (aboard || (onPlat && z.st === st && Math.abs(z.p - tr.dir * 5) < 6)) pa('closing'); }
        if (tr.dwellT >= DOORS.close0 && (aboard || (onPlat && dist < 120)) && once(`${key}:close`)) maud.doors(false);
      } else {
        // coming in to a platform you're on: the alert tone, then which train it is
        const next = tr.dir > 0 ? (tr.s < STOPS[0] ? 0 : tr.s < STOPS[1] ? 1 : null) : (tr.s > STOPS[1] ? 1 : tr.s > STOPS[0] ? 0 : null);
        if (next != null) {
          const toGo = Math.abs(STOPS[next] - tr.s);
          if (onPlat && z.st === STATIONS[next] && toGo < 420 && once(`${tr.id}:${next}:arrive`)) { maud.arrivalTone(); setTimeout(() => pa(tr.dir > 0 ? 'arriveE' : 'arriveW'), 1300); }
          if (aboard && tr.phase === 'brake' && once(`${tr.id}:${next}:at`)) pa(next === 1 ? 'atLjz' : 'atEnr');
        }
        if (aboard && tr.phase === 'accel' && tr.v > 4 && once(`${tr.id}:${Math.round(tr.s / 300)}:depart`)) {
          const from = tr.dir > 0 ? (tr.s < STOPS[1] ? 0 : 1) : (tr.s > STOPS[0] ? 1 : 0);
          if (tr.dir > 0) pa(from === 0 ? 'departE' : 'nextE'); else pa(from === 1 ? 'departW' : 'nextW');
        }
      }
    }
    // the escalators' own recorded reminder, near them; now and then the station's
    if (z && (z.level === 'escalator' || (Math.abs(z.a - (ESC.aT + ESC.aB) / 2) < 10 && Math.abs(z.p) < 4)) && S.clock - S.escPa > 40 && S.clock - S.lastPa > 8) { S.escPa = S.clock; pa('escalator', { gain: 0.6 }); }
    if (z && S.clock - S.lastPa > 95 && Math.random() < dt / 30) pa('belongings', { gain: 0.6 });
    // a bag, coming up to security: the officer asks
    if (z && z.level === 'unpaid' && HOOK.mustScreen(z.st) && z.a > -6 && z.a < SEC.a && z.p > -1 && !S.hint[`bag:${z.st.id}`]) { S.hint[`bag:${z.st.id}`] = true; staff('bagAsk', z.st); }
    if (!z || z.level !== 'unpaid') for (const k of Object.keys(S.hint)) if (k.startsWith('bag:') && (!z || k !== `bag:${z.st.id}`)) delete S.hint[k];
  }
  function sound(dt, h) {
    const b = player.body, z = S.zone;
    const space = h ? 'car' : !z ? null : z.level === 'platform' || z.level === 'escalator' ? 'platform' : 'concourse';
    let esc = Infinity;
    if (z) { const ac = Math.max(ESC.aT, Math.min(ESC.aB, z.a)); const dy = z.level === 'platform' ? 0 : 0; esc = Math.hypot(z.a - ac, Math.max(0, Math.abs(z.p) - 3)) + dy; }
    const trains = [];
    for (const tr of S.near) {
      if (h && h.tr === tr) continue;
      // the nearest point of the train to you
      const cs = carsOf(tr); let d = Infinity, side = 0;
      for (const c of cs) { const dd = Math.hypot(c.x - b.x, c.z - b.z, (c.y + 2) - b.y); if (dd < d) { d = dd; side = Math.sign(worldToCar(c, b.x, b.z)[0]); } }
      // through the ground from the concourse: muffled, further
      if (z && z.level !== 'platform' && z.level !== 'escalator') d += 25;
      trains.push({ d, v: tr.v, a: tr.a, side: -side });
    }
    maud.update(dt, { under: S.under, space, escalator: esc, trains, car: h ? { v: h.tr.v, a: h.tr.a } : null, crowd: S.folk ? S.folk.density : 0 });
  }

  const api = {
    root, stats: S, HOOK, lines: METRO_LINES, audio: maud, player,
    get built() { return S.built; },
    get under() { return S.under; },
    get riding() { return !!S.ride; },
    get zone() { return S.zone; },
    get trains() { return S.list; },
    get near() { return S.near; },
    get clock() { return S.clock; },
    get minute() { const l = getLife(); return l.clock.minute + l.clock.sec / 60; },
    // where you are, for the map's label (ui/i18n.js areas)
    get areaKey() { if (S.ride) return 'metroTrain'; const z = S.zone; if (!z) return null; return `${z.st.id}${z.level === 'platform' || z.level === 'escalator' ? 'Plat' : 'Conc'}`; },
    // for whoever you're talking to (main.js sceneText)
    sceneLine() {
      if (S.ride) { const tr = S.rideTrain; return `aboard a Shanghai Metro Line 2 train ${tr && tr.phase === 'dwell' ? 'standing at a platform, doors open' : 'running in the tunnel under the Huangpu between East Nanjing Road and Lujiazui'}, the car fairly full, people on their phones`; }
      const z = S.zone; if (!z) return null;
      return `${NAMES[z.st.id].en} metro station (Line 2), ${z.level === 'platform' ? 'on the island platform behind the glass screen doors' : z.level === 'paid' ? 'in the concourse past the ticket gates' : 'in the concourse by the ticket gates and the security check'}`;
    },
    build, pre, update, candidates, owns: (id) => typeof id === 'string' && id.startsWith('metro:'), prompt, interact, fromExit1, openGate, carOf, carsOf, stationNear,
    gatesOf: (st) => S.gates[st.id], screened: S.screened,
    // the bag-and-belt for someone else (the people: world/metroFolk.js)
    beltSound(st) { if (nearPlayer(st, 3, 3, 12)) maud.xray(); },
    gateSound(st, i) { if (nearPlayer(st, GATE.a, gateP(i), 10)) maud.gate(); },
    debug: { trainsAt, RUN, carAt, STATIONS, stationAt, metroZone },
  };
  return api;
}
