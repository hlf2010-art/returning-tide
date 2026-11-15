// Two places a DiDi takes you that you can walk into, when you go at the time you were asked to
// (agenda: the invitations). Elsewhere, or another time, the ride ends with the arrival card.
//   NORTH BUND (yinuo-flat): the top floor of a new tower on the North Bund, 160 m up, an empty show
//     flat Yinuo's family wants her to buy. Glass on two sides: the Bund's front to the south, Lujiazui
//     to the south-east across the river. Yinuo at the window, an agent who talks too much. She asks
//     what you see in it, then whether she should buy it.
//   LUJIAZUI (xuan-arm): IFC's tower, 32F, at its real height (~134 m), the robot-arm start-up Xuan
//     wants you to look at. The prototype on the bench keeps dropping parts at speed (watch it); the
//     founder explains, Xuan asks if you're interested. The west windows look back across the river
//     at the Bund you came from (the same modelled street, lit).
// Each is a scene: lines as subtitles, and when you're asked something, four answers (1-4; or say
// nothing). What you say moves how they feel about you and is remembered. Leave by the lift: a
// DiDi back to the Bund (time passes, the fare is paid).
// Positions follow the real geography loosely (the North Bund is ~1.3 km north of where this flat is
// put; IFC stands south-east of the Pearl Tower); the North Bund's streets are a distant set of lit
// blocks, built only for that view.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { colliders, addFloor } from './layout.js';
import { createPerson } from './people.js';
import { getLang } from '../ui/i18n.js';
import { stamp, skipTo, pay, post, nudge } from '../engine/life.js';
import { fare, dest } from '../engine/ride.js';
import { PICKUP } from './didi.js';
import { Batch } from './geo.js';
import { towerAtlas, tower, basic } from './skyline.js';

const T = (zh, en) => (getLang() === 'zh' ? zh : en);
export const PLACES = {
  northbund: { invite: 'yinuo-flat', y: 160, h: 3.6, x0: 40, x1: 64, z0: -1366, z1: -1344, spawn: { x: 44.6, z: -1362.8, yaw: -2.5 }, lift: { x: 44.6, z: -1365.9 }, stay: 90 },
  lujiazui: { invite: 'xuan-arm', y: 134.4, h: 3.4, x0: 668.6, x1: 690, z0: 39, z1: 58, spawn: { x: 678.6, z: 50.4, yaw: 1.25 }, lift: { x: 689.9, z: 55.6 }, stay: 120 },
};
// floors and walls (module load: colliders are read by movement as they are)
for (const P of Object.values(PLACES)) {
  addFloor({ id: `dest-${P.invite}`, x0: P.x0, x1: P.x1, z0: P.z0, z1: P.z1, y: P.y });
  const w = (minX, maxX, minZ, maxZ, tag = 'wall') => colliders.push({ minX, maxX, minZ, maxZ, tag, y0: P.y - 0.3, y1: P.y + P.h });
  w(P.x0 - 0.4, P.x0, P.z0 - 0.4, P.z1 + 0.4); w(P.x1, P.x1 + 0.4, P.z0 - 0.4, P.z1 + 0.4);
  w(P.x0 - 0.4, P.x1 + 0.4, P.z0 - 0.4, P.z0); w(P.x0 - 0.4, P.x1 + 0.4, P.z1, P.z1 + 0.4);
}
{ const P = PLACES.northbund, y0 = P.y - 0.3, y1 = P.y + 1.2, c = (a, b, d, e) => colliders.push({ minX: a, maxX: b, minZ: d, maxZ: e, tag: 'furniture', y0, y1 });
  c(42.6, 46.8, -1360.4, -1358.8); c(48.4, 52.2, -1359.0, -1356.6); c(54.2, 60.4, -1351.4, -1350.2); c(59.2, 60.4, -1355.6, -1351.4); c(55.6, 57.6, -1354.2, -1352.8); }
{ const P = PLACES.lujiazui, y0 = P.y - 0.3, y1 = P.y + 1.2, c = (a, b, d, e) => colliders.push({ minX: a, maxX: b, minZ: d, maxZ: e, tag: 'furniture', y0, y1 });
  c(670.6, 674.0, 46.0, 48.0); for (const z of [42.5, 46.5, 50.5]) c(681.0, 688.0, z - 0.45, z + 0.45); }

// ---- the scenes: [who, zh, en] lines; { ask: [...4 answers] } where each answer has its reply ----
const YINUO = [
  ['agent', '沈先生是吧？程小姐在里面等您。这套是顶层，三百二十平，整层就这一户。', "Mr Shen? Ms Cheng's inside. Top floor, three hundred and twenty square metres, the only flat on the floor."],
  ['yinuo', '来了。', 'You came.'],
  ['yinuo', '家里想让我在上海有个落脚的地方。他们看中的是这个景。', "My family want me to have somewhere in Shanghai. It's the view they're buying."],
  ['yinuo', '你是学设计的。除了景，这房子还有什么？', 'You studied design. Apart from the view, what is there to this place?'],
  { ask: [
    { zh: '窗框太粗，把江切成一格一格的。层高三米六，吊顶一做就压了。', en: "The mullions are too heavy, they cut the river into panels. And it's three point six metres: put a ceiling in and it'll feel low.", d: 3, flag: 'faults',
      then: [['yinuo', '……中介没说过这个。', "...The agent didn't mention that."], ['yinuo', '你还是这样，看东西先看毛病。', "You haven't changed. You always see the faults first."]] },
    { zh: '景是真的好。', en: 'The view really is good.', d: 0, then: [['yinuo', '嗯。所有人都这么说。', 'Mm. Everyone says that.']] },
    { zh: '你自己想住这儿吗？', en: 'Do you want to live here, though?', d: 2, flag: 'asked', then: [['yinuo', '……没人问过我这个。', "...Nobody's asked me that."]] },
    { zh: '（看江，不说话）', en: '(Look at the river. Say nothing.)', d: 1, then: [['yinuo', '你也不说话。', "You're not saying anything either."], ['yinuo', '那就好。中介说得够多了。', 'Good. The agent talks enough.']] },
  ] },
  ['agent', '程小姐，业主那边说价格还能谈，一点八个亿是挂牌价。', "Ms Cheng, the owner says there's room on the price. A hundred and eighty million is only the asking."],
  ['yinuo', '我再想想。', "I'll think about it."],
  ['yinuo', '你觉得呢？买不买？', 'What do you think? Should I buy it?'],
  { ask: [
    { zh: '别买。你要的不是一个景，是一个你自己选的地方。', en: "Don't. You don't need a view. You need somewhere you chose yourself.", d: 4, flag: 'own',
      then: [['yinuo', '……你回来才几天，就开始管我了。', "...You've been back, what, three days, and you're already telling me what to do."]] },
    { zh: '买。这个位置十年后只会更贵。', en: 'Buy it. This only goes up in ten years.', d: 0, flag: 'buy', then: [['yinuo', '你跟我爸一个口气。', 'You sound like my father.']] },
    { zh: '先租一年住住看。', en: 'Rent somewhere for a year first and see.', d: 2, flag: 'rent', then: [['yinuo', '租。程家的人租房子。', 'Rent. A Cheng, renting.'], ['yinuo', '……也不是不行。', '...Not impossible, I suppose.']] },
    { zh: '（不说话）', en: '(Say nothing.)', d: 1, then: [['yinuo', '好。你不说，我自己定。', "Fine. If you won't say, I'll decide myself."]] },
  ] },
  ['yinuo', '走吧。……我还要跟中介谈，你自己打车。', "Go on. ...I've still got to talk to the agent. Get yourself a car."],
];
const XUAN = [
  ['xuan', '白白！来来来。这是周学长，我们学校机械系的，现在做协作机械臂。', "Baibai! Come in. This is Zhou, a senior from our university, mechanical engineering. Cobots now."],
  ['founder', '你好你好。明轩说你在旧金山做过硬件。', 'Hi, hi. Mingxuan says you did hardware in San Francisco.'],
  ['founder', '问题是这样：速度上到每分钟四十次，夹爪就开始掉件。电机、控制都查过了。客户月底要看演示。', "Here's the thing. Once we're up to forty picks a minute, the gripper starts dropping parts. We've been through the motors and the control loop. The customer wants a demo at the end of the month."],
  ['founder', '你看，就是这样。', 'Watch. There it goes.', { drop: true }],
  { ask: [
    { zh: '掉件都在转腕那一下。是加速度，不是夹力：指尖太硬，没有顺应。换软一点的指垫，或者把腕部的急转平滑掉。', en: "It always lets go on the wrist turn. That's acceleration, not grip: the fingertips are too stiff, there's no compliance. Softer pads, or smooth the jerk out of the wrist move.", d: 4, flag: 'fix',
      then: [['founder', '……指垫。我们一直在加夹力。', '...The pads. We kept turning up the grip force.'], ['engineer', '我去拿硅胶的那套！', "I'll get the silicone set!"]] },
    { zh: '我得多看几次才敢说。', en: "I'd need to watch it a few more times.", d: 1, then: [['founder', '没问题，你随便看。', 'Sure. Take your time.']] },
    { zh: '客户真的需要每分钟四十次吗？', en: 'Does the customer actually need forty a minute?', d: 2, flag: 'spec', then: [['xuan', '……好问题。合同里写的是三十。', '...Good question. The contract says thirty.'], ['founder', '四十是我们自己加的……', 'Forty was our own idea...']] },
    { zh: '（看着它，不说话）', en: '(Watch it. Say nothing.)', d: 0, then: [['xuan', '他就这样，看东西不说话，说了就准。', "He's like this. Quiet while he looks, and then he's right."]] },
  ] },
  ['xuan', '怎么样，有没有兴趣？他们缺一个懂产品又懂工程的人。', 'So, interested? They need someone who gets product and engineering both.'],
  { ask: [
    { zh: '可以先当顾问，帮你们把演示做出来。', en: 'I can advise for now. Get the demo working.', d: 3, flag: 'advisor', then: [['founder', '太好了！', 'Brilliant!'], ['xuan', '我就知道。', 'Knew it.']] },
    { zh: '我刚回来，还没想好要做什么。', en: "I've only just got back. I haven't decided what I'm doing.", d: 0, then: [['xuan', '理解，不急。', 'Fair enough. No rush.']] },
    { zh: '你是想让我帮你看这个项目值不值得投吧？', en: "You want me to tell you whether it's worth investing in, don't you?", d: 2, flag: 'saw', then: [['xuan', '被你看穿了。两件事都想。', "You've got me. Both, honestly."]] },
    { zh: '（不说话）', en: '(Say nothing.)', d: 0, then: [['xuan', '行，你回去想想。资料我发你。', "OK, think about it. I'll send you the deck."]] },
  ] },
  ['xuan', '晚上一起吃饭？……算了，你先回去倒时差。', "Dinner tonight? ...Actually no. Go home and sleep off the jet lag."],
];
const NAMES = { agent: ['中介', 'Agent'], yinuo: ['程以诺', 'Yinuo'], xuan: ['陆明轩', 'Mingxuan'], founder: ['周学长', 'Zhou'], engineer: ['工程师', 'Engineer'] };
const WHO = { yinuo: 'yinuo', xuan: 'xuan' };

export function createDestinations({ scene, people, hud, audio, getLife, save, player, travel, voice = null }) {
  const groups = {}, lights = [], ppl = {};
  const el = (id) => document.getElementById(id);
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const glassMat = std({ color: 0x9fb2b8, roughness: 0.03, metalness: 0.3, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide });
  const white = std({ color: 0xf2f0ec, roughness: 0.85, emissive: 0x1c1a17 });
  const ceil = std({ color: 0xf4f2ee, roughness: 0.9, emissive: 0x24221e, side: THREE.DoubleSide });
  const mullion = std({ color: 0x2a2c30, roughness: 0.4, metalness: 0.7 });
  const lamp = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.35, 1.1) });
  function kit(g) {
    const add = (geo, mat, x, y, z, ry = 0, rx = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); m.receiveShadow = true; g.add(m); return m; };
    return { add, box: (w, h, d, mat, x, y, z, ry = 0) => add(new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z, ry), rbox: (w, h, d, r, mat, x, y, z) => add(new RoundedBoxGeometry(w, h, d, 3, r), mat, x, y + h / 2, z) };
  }
  // a room: floor, ceiling, solid walls on some sides, floor-to-ceiling glass on the others
  function room(g, P, glassSides, floorMat) {
    const { add, box } = kit(g), F = P.y, cx = (P.x0 + P.x1) / 2, cz = (P.z0 + P.z1) / 2, W = P.x1 - P.x0, D = P.z1 - P.z0;
    add(new THREE.PlaneGeometry(W, D), floorMat, cx, F + 0.002, cz, 0, -Math.PI / 2);
    add(new THREE.PlaneGeometry(W, D), ceil, cx, F + P.h, cz, 0, Math.PI / 2);
    const sides = { N: [P.x1, P.z0, P.x0, P.z0], S: [P.x0, P.z1, P.x1, P.z1], E: [P.x1, P.z1, P.x1, P.z0], W: [P.x0, P.z0, P.x0, P.z1] };
    for (const [k, [ax, az, bx, bz]] of Object.entries(sides)) {
      const len = Math.hypot(bx - ax, bz - az), m = add(new THREE.PlaneGeometry(len, P.h), glassSides.includes(k) ? glassMat : white, (ax + bx) / 2, F + P.h / 2, (az + bz) / 2);
      const nx = -(bz - az) / len, nz = (bx - ax) / len, toward = (cx - m.position.x) * nx + (cz - m.position.z) * nz > 0 ? 1 : -1; m.rotation.y = Math.atan2(nx * toward, nz * toward);
      if (glassSides.includes(k)) {
        const n = Math.round(len / 1.8);
        for (let i = 0; i <= n; i++) { const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t; box(0.06, P.h, 0.06, mullion, x, F, z); }
        box(Math.abs(bx - ax) + 0.06, 0.08, Math.abs(bz - az) + 0.06, mullion, (ax + bx) / 2, F, (az + bz) / 2);
      } else box(Math.abs(bx - ax) + 0.02, 0.1, Math.abs(bz - az) + 0.02, std({ color: 0x8a8580, roughness: 0.6 }), (ax + bx) / 2, F, (az + bz) / 2);
    }
    for (let x = P.x0 + 1.5; x < P.x1; x += 3) for (let z = P.z0 + 1.5; z < P.z1; z += 3) add(new THREE.CircleGeometry(0.07, 12), lamp, x, F + P.h - 0.004, z, 0, Math.PI / 2);
  }
  const person = (id, role, x, y, z, yaw, g) => { if (!people) return null; const p = createPerson(people, people.manifest.cast[role] ? role : 'p1'); p.root.position.set(x, y, z); p.root.rotation.y = yaw; p.play('idle', 0); p.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); g.add(p.root); ppl[id] = p; p.home = { x, z, yaw }; return p; };

  // ================= the North Bund flat =================
  function buildNorthBund() {
    const P = PLACES.northbund, g = new THREE.Group(); g.name = 'dest-northbund'; scene.add(g); groups.northbund = g;
    const { add, box, rbox } = kit(g), F = P.y;
    room(g, P, ['S', 'E'], std({ color: 0xb08a62, roughness: 0.45 }));
    // the lift lobby door, a kitchen island, the dining table, an L sofa on a rug, art, a big plant
    box(1.4, 2.5, 0.06, std({ color: 0x9a9690, metalness: 0.9, roughness: 0.3 }), P.lift.x, F, P.z0 + 0.04);
    rbox(4.2, 0.92, 1.6, 0.02, std({ color: 0xe9e6e0, roughness: 0.25 }), 44.7, F, -1359.6);
    box(2.0, 0.9, 0.6, std({ color: 0x2b2b2b, roughness: 0.4 }), P.x0 + 0.35, F, -1360, Math.PI / 2);
    rbox(3.8, 0.04, 1.2, 0.01, std({ color: 0x3a2a1e, roughness: 0.35 }), 50.3, F + 0.74, -1357.8);
    for (const dx of [-1.6, 1.6]) for (const dz of [-0.45, 0.45]) box(0.05, 0.74, 0.05, mullion, 50.3 + dx, F, -1357.8 + dz);
    for (let i = 0; i < 6; i++) rbox(0.46, 0.8, 0.46, 0.05, std({ color: 0xcfc8bc, roughness: 0.8 }), 48.8 + (i % 3) * 1.5, F, -1357.8 + (i < 3 ? -0.95 : 0.95));
    add(new THREE.PlaneGeometry(7.5, 5.5), std({ color: 0x8c8378, roughness: 1 }), 57.3, F + 0.006, -1352.6, 0, -Math.PI / 2);
    rbox(6.2, 0.42, 1.0, 0.12, std({ color: 0xd8d2c6, roughness: 0.9 }), 57.3, F, -1350.8); rbox(6.2, 0.4, 0.25, 0.1, std({ color: 0xd8d2c6, roughness: 0.9 }), 57.3, F + 0.42, -1350.4);
    rbox(1.0, 0.42, 4.2, 0.12, std({ color: 0xd8d2c6, roughness: 0.9 }), 59.8, F, -1353.5);
    rbox(2.0, 0.35, 1.2, 0.04, std({ color: 0x1c1c1c, roughness: 0.2 }), 56.6, F, -1353.5);
    add(new THREE.PlaneGeometry(2.4, 1.6), std({ color: 0x0f0f12, roughness: 0.5 }), P.x0 + 0.03, F + 1.8, -1352, Math.PI / 2);
    add(new THREE.PlaneGeometry(2.2, 1.4), basic(towerAtlas(41, 0.9), 0.5), P.x0 + 0.04, F + 1.8, -1352, Math.PI / 2);          // an abstract canvas (someone's art)
    add(new THREE.CylinderGeometry(0.35, 0.28, 0.6, 16), std({ color: 0x3a3632, roughness: 0.7 }), P.x1 - 0.9, F + 0.3, -1361);
    for (let i = 0; i < 14; i++) add(new THREE.SphereGeometry(0.28 + Math.random() * 0.2, 8, 6), std({ color: 0x2e4a2a, roughness: 0.8 }), P.x1 - 0.9 + (Math.random() - 0.5) * 0.7, F + 0.9 + Math.random() * 1.4, -1361 + (Math.random() - 0.5) * 0.7);
    for (const [x, z] of [[50.3, -1357.8], [57.3, -1352.6]]) { add(new THREE.CylinderGeometry(0.4, 0.4, 0.06, 24, 1, true), lamp, x, F + 2.6, z); lights.push({ x, y: F + 2.8, z, intensity: 5, distance: 9, color: new THREE.Color(1.0, 0.86, 0.68) }); }
    lights.push({ x: 45, y: F + 3, z: -1360, intensity: 4, distance: 8, color: new THREE.Color(1.0, 0.9, 0.78) });
    // the tower itself, and around it the North Bund at night: a set of lit blocks, the riverbank,
    // Hongkou's streets back to Suzhou Creek, a few new towers on the bank (for the view only)
    const B = new Batch(), r = rngLocal(77);
    tower(B, 52, -1355, 32, 30, F + 3.8, r);
    for (let i = 0; i < 260; i++) {
      const x = -900 + r() * 920, z = -1750 + r() * 1400;
      if (x > 10 && z > -1400 && z < -1310) continue;
      if (z > -360) continue;
      const near = Math.max(0, 1 - Math.hypot(x - 40, z + 1350) / 500);
      const h = 18 + r() * r() * (60 + near * 120), w = 20 + r() * 30;
      tower(B, x, z, w, w * (0.6 + r() * 0.6), h, r);
    }
    for (const [x, z, h] of [[-20, -1240, 300], [-60, -1180, 210], [10, -1500, 180], [-110, -1420, 150]]) tower(B, x, z, 40, 40, h, r);
    for (let i = 0; i < 40; i++) { const x = 480 + r() * 500, z = -1750 + r() * 840; tower(B, x, z, 30 + r() * 20, 30 + r() * 20, 30 + r() * 90, r); }   // Pudong's northern riverside
    g.add(B.mesh(basic(towerAtlas(19, 0.55), 0.95), 'northbund-city'));
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1500), new THREE.MeshBasicMaterial({ color: 0x07090d })); ground.rotation.x = -Math.PI / 2; ground.position.set(-480, 0.02, -1050); g.add(ground);
    const east = new THREE.Mesh(new THREE.PlaneGeometry(600, 900), new THREE.MeshBasicMaterial({ color: 0x07090d })); east.rotation.x = -Math.PI / 2; east.position.set(780, 0.02, -1320); g.add(east);
    const creek = new THREE.Mesh(new THREE.PlaneGeometry(1000, 22), new THREE.MeshBasicMaterial({ color: 0x0d1420 })); creek.rotation.x = -Math.PI / 2; creek.position.set(-480, 0.05, -345); g.add(creek);
    const lampsPts = []; for (let z = -1700; z < -360; z += 9) lampsPts.push(22, 4, z); for (let x = -900; x < 20; x += 11) lampsPts.push(x, 4, -365, x, 4, -900 + (x % 7));
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(lampsPts, 3));
    g.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: new THREE.Color(2.2, 1.7, 1.0), size: 2.4, sizeAttenuation: false })));
    person('agent', 'p1', 46.6, F, -1361.6, 2.6, g);
    person('yinuo', 'p5', 55.4, F, -1345.4, Math.PI, g);
    g.visible = false;
  }
  function rngLocal(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  // ================= IFC 32F: the robot-arm start-up =================
  const ARM = { x: 672.3, z: 47.0, y: 0 };
  let arm = null;
  function buildIfc() {
    const P = PLACES.lujiazui, g = new THREE.Group(); g.name = 'dest-ifc'; scene.add(g); groups.lujiazui = g;
    const { add, box, rbox } = kit(g), F = P.y;
    room(g, P, ['W', 'N'], std({ color: 0x5a5d62, roughness: 0.9 }));
    box(1.4, 2.5, 0.06, std({ color: 0x9a9690, metalness: 0.9, roughness: 0.3 }), P.x1 - 0.04, F, P.lift.z, Math.PI / 2);
    // the bench, the arm on it, a parts tray and a bin; desks with screens; a whiteboard
    ARM.y = F + 0.9;
    box(3.4, 0.06, 2.0, std({ color: 0xd8d8d4, roughness: 0.5 }), ARM.x, F + 0.84, ARM.z);
    for (const dx of [-1.6, 1.6]) for (const dz of [-0.9, 0.9]) box(0.05, 0.84, 0.05, mullion, ARM.x + dx, F, ARM.z + dz);
    box(0.3, 0.02, 0.26, std({ color: 0x2b5fa8, roughness: 0.6 }), ARM.x + Math.sin(-2.25) * 0.46, ARM.y, ARM.z + Math.cos(-2.25) * 0.46);   // the parts tray
    box(0.3, 0.12, 0.26, std({ color: 0x3a3a3a, roughness: 0.6 }), ARM.x + Math.sin(2.2) * 0.46, ARM.y, ARM.z + Math.cos(2.2) * 0.46);     // the bin
    for (const z of [42.5, 46.5, 50.5]) {
      box(7.0, 0.04, 0.9, std({ color: 0xe8e6e0, roughness: 0.5 }), 684.5, F + 0.72, z);
      for (let i = 0; i < 4; i++) { box(0.6, 0.36, 0.03, std({ color: 0x111111, roughness: 0.3 }), 682 + i * 1.7, F + 0.95, z - 0.2); add(new THREE.PlaneGeometry(0.56, 0.32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.14, 0.2) }), 682 + i * 1.7, F + 1.13, z - 0.18); }
    }
    add(new THREE.PlaneGeometry(4, 1.6), std({ color: 0xf6f6f2, roughness: 0.3, emissive: 0x202020 }), P.x1 - 0.03, F + 1.6, 46, -Math.PI / 2);
    for (let x = P.x0 + 2; x < P.x1; x += 3.2) add(new THREE.PlaneGeometry(0.12, P.z1 - P.z0 - 1), lamp, x, F + P.h - 0.004, (P.z0 + P.z1) / 2, 0, Math.PI / 2);
    lights.push({ x: 674, y: F + 3.1, z: 47, intensity: 6, distance: 9, color: new THREE.Color(0.95, 0.95, 1.0) });
    lights.push({ x: 684, y: F + 3.1, z: 46, intensity: 5, distance: 9, color: new THREE.Color(0.95, 0.95, 1.0) });
    // the arm: base, turret, shoulder, upper arm, elbow, forearm, wrist, two fingers
    const metal = std({ color: 0xe6e6e8, roughness: 0.35, metalness: 0.4 }), joint = std({ color: 0x2a6fd6, roughness: 0.4, metalness: 0.2 });
    const base = new THREE.Group(); base.position.set(ARM.x, ARM.y, ARM.z); g.add(base);
    const m = (geo, mat, parent, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
    m(new THREE.CylinderGeometry(0.11, 0.13, 0.08, 20), joint, base, 0, 0.04);
    const turret = new THREE.Group(); turret.position.y = 0.08; base.add(turret); m(new THREE.CylinderGeometry(0.08, 0.09, 0.14, 16), metal, turret, 0, 0.07);
    const shoulder = new THREE.Group(); shoulder.position.y = 0.16; turret.add(shoulder); m(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 16).rotateZ(Math.PI / 2), joint, shoulder);
    m(new THREE.BoxGeometry(0.07, 0.36, 0.07), metal, shoulder, 0, 0.18);
    const elbow = new THREE.Group(); elbow.position.y = 0.36; shoulder.add(elbow); m(new THREE.CylinderGeometry(0.055, 0.055, 0.12, 16).rotateZ(Math.PI / 2), joint, elbow);
    m(new THREE.BoxGeometry(0.055, 0.3, 0.055), metal, elbow, 0, 0.15);
    const wrist = new THREE.Group(); wrist.position.y = 0.3; elbow.add(wrist); m(new THREE.CylinderGeometry(0.045, 0.045, 0.1, 14).rotateZ(Math.PI / 2), joint, wrist);
    m(new THREE.BoxGeometry(0.06, 0.08, 0.05), metal, wrist, 0, 0.05);
    const fingers = [-1, 1].map((s) => m(new THREE.BoxGeometry(0.012, 0.06, 0.03), std({ color: 0x222222, roughness: 0.7 }), wrist, s * 0.025, 0.12));
    const tip = new THREE.Object3D(); tip.position.y = 0.13; wrist.add(tip);
    const part = m(new THREE.BoxGeometry(0.04, 0.04, 0.04), std({ color: 0xd8a040, roughness: 0.4, metalness: 0.6 }), g, ARM.x + 0.55, ARM.y + 0.07, ARM.z - 0.35);
    arm = { turret, shoulder, elbow, wrist, fingers, tip, part, t: 0, held: false, fall: null, fixed: false, drops: 0 };
    person('xuan', 'p4', 674.6, F, 49.4, -2.2, g);
    person('founder', 'p3', 672.4, F, 49.0, Math.PI, g);
    person('engineer', 'p2', 683.2, F, 48.4, Math.PI * 0.9, g);
    g.visible = false;
  }
  // two-link reach for the arm: shoulder pitch, elbow pitch, wrist pitch so the gripper points down at
  // a point r out and h up from the shoulder
  function reach(r, h) {
    const L1 = 0.36, L2 = 0.3, wy = h + 0.13, d = Math.min(L1 + L2 - 1e-3, Math.hypot(r, wy));
    const a2 = Math.acos((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2)), a1 = Math.atan2(r, wy) - Math.asin(L2 * Math.sin(a2) / d);
    const sh = a1, el = Math.PI - a2, wr = Math.PI - sh - el;
    return [sh, el, wr];
  }
  const POSES = { pick: { yaw: -2.25, r: 0.46, h: -0.2 }, place: { yaw: 2.2, r: 0.46, h: -0.1 } };
  const _v = new THREE.Vector3();
  function stepArm(dt, jam) {
    const A = arm; A.t += dt;
    const cyc = 5.2, k = (A.t % cyc) / cyc;
    const ease = (x) => x * x * (3 - 2 * x), seg = (a, b) => Math.min(1, Math.max(0, (k - a) / (b - a)));
    // 0-.15 down to pick, .15-.25 close, .25-.35 up, .35-.6 turn, .6-.7 down, .7-.75 open, .75-1 back
    const P1 = POSES.pick, P2 = POSES.place;
    let yaw = P1.yaw, hgt = P1.h + 0.18, grip = 0;
    if (k < 0.15) hgt = P1.h + 0.18 * (1 - ease(seg(0, 0.15)));
    else if (k < 0.25) { hgt = P1.h; grip = seg(0.15, 0.25); }
    else if (k < 0.35) { hgt = P1.h + 0.18 * ease(seg(0.25, 0.35)); grip = 1; }
    else if (k < 0.6) { const s = seg(0.35, 0.6); yaw = P1.yaw + (P2.yaw - P1.yaw) * (jam ? Math.min(1, s * 1.15) : ease(s)); hgt = P1.h + 0.18; grip = 1; }
    else if (k < 0.7) { yaw = P2.yaw; hgt = P2.h + 0.18 * (1 - ease(seg(0.6, 0.7))); grip = 1; }
    else if (k < 0.75) { yaw = P2.yaw; hgt = P2.h; grip = 1 - seg(0.7, 0.75); }
    else { const s = ease(seg(0.75, 1)); yaw = P2.yaw + (P1.yaw - P2.yaw) * s; hgt = P2.h + 0.18; }
    const [sh, el, wr] = reach(k < 0.35 || k > 0.75 ? P1.r : P2.r, hgt);
    A.turret.rotation.y = yaw; A.shoulder.rotation.x = sh; A.elbow.rotation.x = el; A.wrist.rotation.x = wr;
    for (const [i, f] of A.fingers.entries()) f.position.x = (i ? 1 : -1) * (0.03 - 0.008 * grip);
    A.tip.getWorldPosition(_v);
    // the part: picked up when the fingers close on it; dropped on the fast wrist turn (unless fixed)
    if (!A.held && !A.fall && !A.reset && grip > 0.9 && k < 0.3) { A.held = true; A.slip = A.forced || (jam && !A.fixed && Math.random() < 0.6); A.forced = false; }
    if (A.held) {
      A.part.position.copy(_v);
      const turning = k > 0.42 && k < 0.5;
      if (A.slip && turning) { A.held = false; A.fall = { vx: Math.cos(yaw) * 0.8, vz: -Math.sin(yaw) * 0.8, vy: 0.2 }; A.drops++; if (audio && audio.cue) audio.cue('bump', 0.25, 0.25); }
      if (k > 0.72) { A.held = false; A.reset = true; }                          // let go in the bin
    }
    if (A.fall) {
      const f = A.fall; f.vy -= 9.8 * dt; A.part.position.x += f.vx * dt; A.part.position.y += f.vy * dt; A.part.position.z += f.vz * dt; f.vx *= 0.98; f.vz *= 0.98;
      if (A.part.position.y < ARM.y + 0.02) { A.part.position.y = ARM.y + 0.02; f.vy = 0; f.vx *= 0.8; f.vz *= 0.8; }
    }
    if (k < 0.05 && (A.fall || A.reset)) { A.fall = null; A.reset = false; placeOnTray(); }   // the next part on the tray
  }
  function placeOnTray() {
    // where the gripper comes down at the pick pose: put the next part there
    const yaw = POSES.pick.yaw, r = POSES.pick.r;
    arm.part.position.set(ARM.x + Math.sin(yaw) * r, ARM.y + 0.04, ARM.z + Math.cos(yaw) * r);
  }

  // ================= the scene runner =================
  let cur = null;   // { id, P, script, i, t, wait, ask, answerT, said: {}, done }
  function show(who, text, choices = null) {
    const box = el('ride-sub'); if (!box) return;
    box.classList.add('on'); box.querySelector('.sp').textContent = who ? T(...NAMES[who]) : T('你', 'You');
    box.querySelector('.tx').textContent = text;
    const ch = box.querySelector('.ch'); ch.innerHTML = choices ? choices.map((c, i) => `<span><kbd>${i + 1}</kbd>${c}</span>`).join('') : ''; ch.classList.toggle('hidden', !choices);
  }
  const hide = () => { const box = el('ride-sub'); if (box) box.classList.remove('on'); };
  const lineSecs = (s) => Math.min(7, 1.8 + s.length * (getLang() === 'zh' ? 0.16 : 0.055));
  function next() {
    const c = cur; if (!c) return;
    if (c.queue.length) {
      const [who, zh, en, opt] = c.queue.shift(); c.speaking = who; c.wait = lineSecs(T(zh, en)); show(who, T(zh, en));
      if (voice) { const p = ppl[who]; voice.say({ zh, en, who, at: p ? [p.root.position.x, p.root.position.y + 1.6, p.root.position.z] : null, onEnd: () => { if (cur && cur.speaking === who) cur.wait = Math.min(cur.wait, 0.5); } }).then((h) => { if (h && h.duration && cur) cur.wait = Math.max(cur.wait, h.duration + 0.4); }); }
      if (opt && opt.drop && arm) arm.forceSlip = true;
      return;
    }
    if (c.i >= c.script.length) { c.done = true; c.wait = 0; hide(); finishScene(); return; }
    const beat = c.script[c.i++];
    if (Array.isArray(beat)) { c.queue.push(beat); next(); return; }
    c.ask = beat.ask; c.answerT = 10; c.wait = Infinity;
    show(null, '', c.ask.map((a) => T(a.zh, a.en)));
    const box = el('ride-sub'); if (box) box.querySelector('.sp').textContent = T('你', 'You');
  }
  function answer(i) {
    const c = cur; if (!c || !c.ask) return false;
    const a = c.ask[i]; c.ask = null;
    const l = getLife(), who = WHO[c.P === PLACES.northbund ? 'yinuo' : 'xuan'];
    if (a.d) nudge(l, who, a.d, `${c.id}:${a.flag || i}`);
    if (a.flag) (l.flags[`${c.id}Said`] ||= []).push(a.flag);
    if (a.flag === 'fix' && arm) setTimeout(() => { arm.fixed = true; }, 25000);
    if (i !== 3) { show(null, T(a.zh, a.en)); c.wait = lineSecs(T(a.zh, a.en)); c.speaking = null; }
    else { c.wait = 1.2; hide(); }
    c.queue.push(...a.then);
    save && save(); return true;
  }
  function finishScene() {
    const l = getLife(), inv = l.invites.find((x) => x.id === cur.P.invite);
    if (inv && !inv.kept) { inv.status = 'accepted'; inv.kept = true; nudge(l, inv.from, 3, `kept:${inv.id}`); }
    const from = cur.P === PLACES.northbund ? 'yinuo' : 'xuan', follow = from === 'yinuo' ? '今天谢谢。' : '今天多亏你了，资料晚上发你。';
    setTimeout(() => post(getLife(), inv ? inv.thread || inv.from : from, { from, kind: 'text', text: follow }), 40000);
    hud.toast(T('乘电梯下楼，打车回外滩', 'Take the lift down and a car back to the Bund'), 4);
    save && save();
  }

  // ================= arriving, leaving =================
  let here = null;   // the place you're in
  function arrive(id, info = {}) {
    const P = PLACES[id]; if (!P) return false;
    if (id === 'northbund' && !groups.northbund) buildNorthBund();
    if (id === 'lujiazui' && !groups.lujiazui) buildIfc();
    here = id; groups[id].visible = true;
    cur = { id, P, script: id === 'northbund' ? YINUO : XUAN, i: 0, queue: [], wait: 2.5, ask: null, answerT: 0, done: false, method: info.method || 'wechat' };
    if (arm) { arm.t = 0; arm.fixed = false; placeOnTray(); }
    travel(async () => { player.teleport(P.spawn.x, P.spawn.z, P.spawn.yaw, 0, P.y); }, { line: T(id === 'northbund' ? '北外滩 · 顶层' : '陆家嘴 · 国金中心 32 层', id === 'northbund' ? 'North Bund · the top floor' : 'Lujiazui · IFC, 32nd floor'), hold: 900, to: 'play' });
    return true;
  }
  function leave() {
    const id = here, P = PLACES[id], l = getLife(), d = dest(id);
    const stay = cur && cur.done ? P.stay : 20, back = fare(d, (l.clock.minute + stay) % 1440);
    hide(); cur = null;
    travel(async () => {
      skipTo(l, stamp(l) + stay + d.mins);
      const r = pay(l, { method: 'wechat', amount: back, to: '滴滴出行', memo: '快车 → 外滩', kind: 'ride' }); if (r.ok) r.entry.memoEn = 'DiDi Express to the Bund';
      groups[id].visible = false; here = null;
      player.teleport(PICKUP.x, PICKUP.z - 1.2, Math.PI / 2, 0);
      save && save();
    }, { line: T(`一辆滴滴把你送回了外滩 · ¥${back}`, `A DiDi brings you back to the Bund · ¥${back}`), hold: 1400, to: 'play' });
  }

  const targets = () => {
    if (!here) return [];
    const P = PLACES[here];
    const t = [{ id: 'dLift', x: P.lift.x, y: P.y + 1.4, z: P.lift.z, reach: 2.6 }];
    if (here === 'lujiazui') t.push({ id: 'dArm', x: ARM.x, y: ARM.y + 0.3, z: ARM.z, reach: 2.6 });
    return t;
  };
  return {
    lights, arrive, has: (id) => !!PLACES[id],
    get here() { return here; },
    get scene() { return cur; },
    // once the scene's done, you can keep talking to them
    talkables() { if (!here || (cur && !cur.done)) return []; return Object.entries(ppl).filter(([, p]) => groups[here].children.includes(p.root)).map(([k, p]) => ({ key: k, persona: k, x: p.root.position.x, y: p.root.position.y + 1.62, z: p.root.position.z, hold() {} })); },
    candidates() { return targets().map((t) => ({ ...t, cone: 0.6 })); },
    prompt(id) {
      if (id === 'dLift') return { target: T('电梯', 'Lift'), action: cur && !cur.done ? T('先走了（打车回外滩）', 'Leave now (a car back to the Bund)') : T('下楼，打车回外滩', 'Down, and a car back to the Bund') };
      if (id === 'dArm') return { target: T('机械臂原型', 'The arm prototype'), action: T('凑近看', 'Look closer') };
      return null;
    },
    owns(id) { return id === 'dLift' || id === 'dArm'; },
    interact(id) {
      if (id === 'dLift') leave();
      else if (id === 'dArm') hud.toast(arm && arm.fixed ? T('换了硅胶指垫以后，一个都没掉。', 'With the silicone pads on, it hasn’t dropped one.') : T(`掉了 ${arm ? arm.drops : 0} 次。每次都在手腕急转的那一下。`, `Dropped ${arm ? arm.drops : 0} so far. Every time on the sharp wrist turn.`), 3.6);
      return true;
    },
    key(code) { const i = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(code); return i >= 0 && cur && cur.ask ? answer(i) : false; },
    update(dt, pp) {
      if (!here) return;
      // the scene
      if (cur && !cur.done) {
        if (cur.ask) { cur.answerT -= dt; if (cur.answerT <= 0) answer(3); }
        else { cur.wait -= dt; if (cur.wait <= 0) next(); }
      }
      // people: face whoever's talking, or you
      for (const [id, p] of Object.entries(ppl)) {
        if (!groups[here].children.includes(p.root)) continue;
        const talking = cur && cur.speaking === id;
        const tgt = talking || !cur || cur.speaking === null ? [pp.x, pp.z] : (ppl[cur.speaking] ? [ppl[cur.speaking].root.position.x, ppl[cur.speaking].root.position.z] : [pp.x, pp.z]);
        p.play(talking ? 'talk1' : 'idle', 0.4);
        p.update(dt, Math.hypot(tgt[0] - p.root.position.x, tgt[1] - p.root.position.z) < 12 ? tgt : null);
      }
      if (here === 'lujiazui' && arm) {
        if (arm.forceSlip) { arm.forceSlip = false; arm.t = 0; arm.held = false; arm.fall = null; arm.reset = false; arm.forced = true; placeOnTray(); }
        stepArm(dt, true);
      }
    },
  };
}
