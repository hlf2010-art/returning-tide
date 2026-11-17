// The Huangpu river cruise (phase 4.4): a pier at the south end of the promenade and a sightseeing boat
// you walk onto and ride, in the engine, not a fade. Hourly from 10 am to 9 pm (engine/cruiseRoute.js:
// out along the Bund side, past Lujiazui, round and back on the Pudong side, about 5 minutes real,
// 20 on the game clock). Buy a ticket at the gate (¥120 by phone); the gate opens. Aboard, the open
// top deck is yours to walk about: the boat carries you, turns you with it, and keeps you inside its
// rails. An announcer on the boat's speakers (recorded voices). E at the wheelhouse door skips to
// the end of the trip. The real Huangpu cruise piers are a little further south, at Shiliupu; the
// game puts one within reach (layout.js PIER) and says so.
import * as THREE from 'three';
import { Batch } from './geo.js';
import { makeCanvas, tex, FONT } from './canvas.js';
import { PIER, L as LAYOUT, movers, addDynamicCollider } from './layout.js';
import { REFLECT_LAYER } from './sky.js';
import { createPerson } from './people.js';
import { asLight } from './dayNight.js';
import { cruiseAt, DOCK, FARE, TRIP_MINUTES, PA_AT } from '../engine/cruiseRoute.js';
import { stamp, pay, clockText } from '../engine/life.js';
import { FERRY, nextFerry } from '../engine/ferry.js';
import { getLang } from '../ui/i18n.js';

const T = (zh, en) => (getLang() === 'zh' ? zh : en);
const Y = LAYOUT.deckY;                         // the top deck is level with the promenade (boarding is flat)
const HALF_W = 5, HALF_L = 22;                  // the hull
const WALK = { x: 3.6, z0: -19.2, z1: 12.8 };  // the open top deck you can walk (inside the benches and the wheelhouse)
const GATE = { z: 1.8 };                        // the opening in the rail on the boat's left (the pier side when docked)
// the announcer (cruisepa: tools/voice/cast.json)
export const CRUISE_LINES = {
  board: ['cruisepa', '各位游客，本班游船即将开航，请抓紧时间登船。', 'Ladies and gentlemen, this sailing leaves shortly. Please come aboard.'],
  welcome: ['cruisepa', '欢迎乘坐浦江游览，本次航程大约半小时，请在甲板上注意安全。', 'Welcome aboard the Huangpu River cruise. We\'ll be out for about half an hour; please take care on deck.'],
  bund: ['cruisepa', '左手边是外滩，一百多年前的银行和洋行，被称为万国建筑博览群。', 'On your left, the Bund: banks and trading houses from a century ago, the city\'s "museum of world architecture".'],
  lujiazui: ['cruisepa', '右手边就是陆家嘴：东方明珠、金茂大厦、环球金融中心和上海中心。', 'On your right, Lujiazui: the Oriental Pearl, Jin Mao, the World Financial Center and the Shanghai Tower.'],
  turn: ['cruisepa', '游船现在调头，沿浦东一侧返回。', 'We\'re turning now, and coming back along the Pudong side.'],
  back: ['cruisepa', '再往前就是外滩码头了。', 'The Bund pier is just ahead.'],
  arrive: ['cruisepa', '游船即将靠岸，请带好随身物品，注意脚下。', 'We\'re coming in to the pier. Please take your belongings and mind your step.'],
};

function nameTexture() {
  const [c, x] = makeCanvas(1024, 128);
  x.fillStyle = '#f2efe8'; x.fillRect(0, 0, 1024, 128);
  x.fillStyle = '#1d2f5a'; x.font = `900 76px ${FONT.serif}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('汇潮号  ·  HUICHAO', 512, 66);
  return tex(c, { repeat: false });
}
function windowsTexture() {
  const [c, x] = makeCanvas(512, 64);
  x.fillStyle = '#1a1714'; x.fillRect(0, 0, 512, 64);
  for (let i = 0; i < 16; i++) {
    const g = x.createLinearGradient(0, 8, 0, 58); g.addColorStop(0, '#fff2d6'); g.addColorStop(1, i % 4 === 1 ? '#e2a66a' : '#f4cf98');
    x.fillStyle = g; x.fillRect(i * 32 + 3, 8, 26, 50);
    x.fillStyle = 'rgba(40,30,25,0.6)'; x.fillRect(i * 32 + 3 + (i * 7) % 18, 30, 6, 28);       // someone at a table inside
  }
  const t = tex(c, { repeat: true }); return t;
}
function signTexture() {
  const [c, x] = makeCanvas(1024, 256);
  x.fillStyle = '#0d1a2e'; x.fillRect(0, 0, 1024, 256);
  x.fillStyle = '#ffd38a'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `900 92px ${FONT.serif}`; x.fillText('浦江游览', 512, 92);
  x.font = `700 44px ${FONT.sans}`; x.fillStyle = '#e8eef8'; x.fillText('HUANGPU RIVER CRUISE', 512, 186);
  return tex(c, { repeat: false });
}
function timetableTexture() {
  const [c, x] = makeCanvas(512, 512);
  x.fillStyle = '#132238'; x.fillRect(0, 0, 512, 512);
  x.fillStyle = '#ffd38a'; x.font = `900 46px ${FONT.serif}`; x.textAlign = 'center'; x.fillText('浦江游览 · 船期', 256, 70);
  x.fillStyle = '#e8eef8'; x.font = `600 28px ${FONT.sans}`; x.fillText('Huangpu River Cruise', 256, 116);
  x.font = `700 34px ${FONT.sans}`; x.fillText('10:00 – 21:00', 256, 200); x.font = `500 26px ${FONT.sans}`; x.fillText('每整点开航 · hourly', 256, 244);
  x.fillText('航程约半小时 · ~30 min', 256, 290);
  x.fillStyle = '#ffd38a'; x.font = `800 40px ${FONT.sans}`; x.fillText(`¥${FARE}`, 256, 370);
  x.fillStyle = '#9fb3cc'; x.font = `500 22px ${FONT.sans}`; x.fillText('扫码购票 · scan to buy', 256, 420);
  return tex(c, { repeat: false });
}

function ferryTexture() {
  const [c, x] = makeCanvas(512, 512);
  x.fillStyle = '#0f2a24'; x.fillRect(0, 0, 512, 512);
  x.fillStyle = '#ffe08a'; x.font = `900 52px ${FONT.serif}`; x.textAlign = 'center'; x.fillText('轮渡 · 过江', 256, 74);
  x.fillStyle = '#e8f2ee'; x.font = `600 28px ${FONT.sans}`; x.fillText('Ferry across the river', 256, 118);
  x.font = `800 34px ${FONT.sans}`; x.fillText('外滩 → 陆家嘴', 256, 196); x.font = `500 24px ${FONT.sans}`; x.fillText('The Bund → Lujiazui (Dongchang Rd)', 256, 234);
  x.font = `700 34px ${FONT.sans}`; x.fillText('06:00 – 23:00', 256, 304); x.font = `500 24px ${FONT.sans}`; x.fillText('每15分钟一班 · every 15 min', 256, 344);
  x.fillStyle = '#ffe08a'; x.font = `800 44px ${FONT.sans}`; x.fillText(`¥${FERRY.fare}`, 256, 418);
  x.fillStyle = '#9fc6b8'; x.font = `500 22px ${FONT.sans}`; x.fillText('刷码乘船 · scan to board', 256, 462);
  return tex(c, { repeat: false });
}

export function createCruise({ scene, people, player, hud, audio, voice, getLife, save, travel, skipTo, ferryTo = null, roles = [], clock = null }) {
  const L0 = () => getLife();
  const C = () => { const l = L0(); return l.flags.cruise || (l.flags.cruise = { rides: 0, ticket: null }); };
  const std = (o) => new THREE.MeshStandardMaterial(o);

  // ---- the pier: a walkway out over the water at deck level, its rails, the gate and the sign ----
  const pier = new THREE.Group(); pier.name = 'cruise-pier';
  {
    const deck = new Batch(), iron = new Batch(), stone = new Batch();
    const zc = (PIER.z0 + PIER.z1) / 2, w = PIER.z1 - PIER.z0;
    deck.box((PIER.x0 + PIER.x1) / 2 + 0.2, Y - 0.35, zc, PIER.x1 - PIER.x0 + 0.4, 0.35, w, { tile: 1.2 });
    for (let x = PIER.x0 + 2; x <= PIER.x1; x += 4) for (const z of [PIER.z0 + 0.4, PIER.z1 - 0.4]) stone.cyl(x, LAYOUT.waterY - 1, z, 0.28, 0.32, Y - 0.35 - LAYOUT.waterY + 1, 10);   // piles
    for (const z of [PIER.z0 - 0.15, PIER.z1 + 0.15]) {
      iron.box((PIER.x0 + PIER.x1) / 2, Y + 1.05, z, PIER.x1 - PIER.x0, 0.06, 0.06);
      iron.box((PIER.x0 + PIER.x1) / 2, Y + 0.5, z, PIER.x1 - PIER.x0, 0.04, 0.04);
      for (let x = PIER.x0; x <= PIER.x1; x += 1.5) iron.box(x, Y, z, 0.07, 1.08, 0.07);
    }
    // the arch over the gate, with the sign
    for (const z of [PIER.z0 - 0.1, PIER.z1 + 0.1]) iron.box(PIER.x0 + 0.4, Y, z, 0.18, 3.6, 0.18);
    iron.box(PIER.x0 + 0.4, Y + 3.5, (PIER.z0 + PIER.z1) / 2, 0.22, 0.25, w + 0.6);
    const signMat = new THREE.MeshBasicMaterial({ map: signTexture() }); signMat.color.setScalar(1.3); asLight(signMat, 'outline', 0.55);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.15), signMat); sign.position.set(PIER.x0 + 0.25, Y + 2.85, zc); sign.rotation.y = -Math.PI / 2; pier.add(sign);
    // the timetable board by the gate, on the promenade
    const tt = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ map: timetableTexture() }));
    tt.material.color.setScalar(0.95); tt.position.set(PIER.x0 - 0.9, Y + 1.25, PIER.z1 + 0.9); tt.rotation.y = -Math.PI / 2 + 0.5; pier.add(tt);
    stone.box(PIER.x0 - 0.9, Y, PIER.z1 + 0.9, 0.12, 0.6, 0.12, { rotY: 0.5 });
    // the cross-river ferry's board on the other side of the gate (E there: across to Lujiazui)
    const fb = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ map: ferryTexture() }));
    fb.material.color.setScalar(0.95); fb.position.set(PIER.x0 - 0.9, Y + 1.25, PIER.z0 - 0.9); fb.rotation.y = -Math.PI / 2 - 0.5; pier.add(fb);
    stone.box(PIER.x0 - 0.9, Y, PIER.z0 - 0.9, 0.12, 0.6, 0.12, { rotY: -0.5 });
    // the turnstile gate
    for (const z of [PIER.z0 + 1.2, PIER.z1 - 1.2]) iron.box(PIER.x0 + 1.1, Y, z, 0.5, 1.0, 0.25);
    pier.add(deck.mesh(std({ color: 0x6b5843, roughness: 0.75 }), 'pier-deck'), iron.mesh(std({ color: 0x1b2128, roughness: 0.45, metalness: 0.6 }), 'pier-iron'), stone.mesh(std({ color: 0x8a8780, roughness: 0.8 }), 'pier-piles'));
    pier.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.layers.enable(REFLECT_LAYER); } });
    scene.add(pier);
  }
  const gateBox = addDynamicCollider('gate'), endBox = addDynamicCollider('gate');

  // ---- the boat ----
  const boat = new THREE.Group(); boat.name = 'cruise-boat';
  const ledA = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.8, 1.3) }), ledB = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 1.3, 1.8) });
  {
    // hull: a plan shape (square stern, a pointed bow) extruded up from below the waterline
    const plan = new THREE.Shape();
    plan.moveTo(-HALF_W, -HALF_L); plan.lineTo(HALF_W, -HALF_L); plan.lineTo(HALF_W, 12); plan.quadraticCurveTo(HALF_W, 19, 0, HALF_L + 1.5); plan.quadraticCurveTo(-HALF_W, 19, -HALF_W, 12); plan.lineTo(-HALF_W, -HALF_L);
    const hull = (y0, y1, mat) => { const g = new THREE.ExtrudeGeometry(plan, { depth: y1 - y0, bevelEnabled: false }); g.rotateX(Math.PI / 2); g.translate(0, y1, 0); const m = new THREE.Mesh(g, mat); boat.add(m); return m; };
    hull(LAYOUT.waterY - 1, LAYOUT.waterY + 1.0, std({ color: 0x1b2c4f, roughness: 0.5 }));
    hull(LAYOUT.waterY + 1.0, 0.0, std({ color: 0xe9e6de, roughness: 0.45 }));
    // the name along both sides
    const nm = new THREE.MeshBasicMaterial({ map: nameTexture(), transparent: false }); nm.color.setScalar(0.9);
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.1), nm); p.position.set(s * (HALF_W + 0.02), LAYOUT.waterY + 1.9, -6); p.rotation.y = s * Math.PI / 2; boat.add(p); }
    // the main cabin below the top deck: rows of warm windows
    const cab = new Batch(); cab.box(0, 0, -3, (HALF_W - 0.35) * 2, 2.75, 34);
    const winMat = new THREE.MeshBasicMaterial({ map: windowsTexture() }); winMat.color.setScalar(1.15);
    const cabin = cab.mesh(winMat, 'cruise-cabin');
    { const uv = cabin.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 8); }
    boat.add(cabin);
    // the top deck: planks, the rail round it (open at the gate), benches, the wheelhouse, a mast
    const deck = new Batch(), rail = new Batch(), wood = new Batch(), house = new Batch();
    deck.box(0, Y - 0.25, -3, HALF_W * 2 - 0.3, 0.25, 36, { tile: 1.5 });
    const rx = HALF_W - 0.25;
    for (const s of [-1, 1]) {
      const spans = s > 0 ? [[-20.5, -GATE.z], [GATE.z, 15.2]] : [[-20.5, 15.2]];
      for (const [a, b] of spans) {
        rail.box(s * rx, Y + 1.0, (a + b) / 2, 0.06, 0.06, b - a); rail.box(s * rx, Y + 0.5, (a + b) / 2, 0.04, 0.04, b - a);
        for (let z = a; z <= b + 0.01; z += 1.6) rail.box(s * rx, Y, z, 0.06, 1.03, 0.06);
      }
    }
    rail.box(0, Y + 1.0, -20.6, HALF_W * 2 - 0.5, 0.06, 0.06); rail.box(0, Y + 0.5, -20.6, HALF_W * 2 - 0.5, 0.04, 0.04);
    for (const s of [-1, 1]) for (const [a, b] of (s > 0 ? [[-18.5, -GATE.z - 0.8], [GATE.z + 0.8, 11.5]] : [[-18.5, 11.5]])) {
      for (let z = a; z < b - 1.9; z += 2.6) { wood.box(s * 4.15, Y + 0.42, z + 1, 0.42, 0.06, 2.2); wood.box(s * 4.35, Y + 0.48, z + 1, 0.05, 0.42, 2.2); iron_leg(z + 0.2, s); iron_leg(z + 1.8, s); }
    }
    function iron_leg(z, s) { rail.box(s * 4.15, Y, z, 0.05, 0.42, 0.05); }
    house.box(0, Y, 15.8, 6.2, 2.5, 4.4); house.box(0, Y + 2.5, 15.8, 6.6, 0.15, 4.8);
    rail.box(0, Y + 2.65, 15.2, 0.1, 4.5, 0.1);                                                          // the mast
    boat.add(deck.mesh(std({ color: 0x8a6a4a, roughness: 0.7 }), 'cruise-deck'), rail.mesh(std({ color: 0xd8dde2, roughness: 0.35, metalness: 0.7 }), 'cruise-rail'),
      wood.mesh(std({ color: 0x6e4f33, roughness: 0.6 }), 'cruise-benches'), house.mesh(std({ color: 0xf0eee8, roughness: 0.5 }), 'cruise-house'));
    // the wheelhouse windows, lit
    const hw = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.1), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 1.0, 1.1) }));
    hw.position.set(0, Y + 1.7, 18.02); boat.add(hw); asLight(hw.material, 'lamps', 0.25);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.0), std({ color: 0x2a3340, roughness: 0.4 })); door.position.set(0, Y + 1.0, 13.58); door.rotation.y = Math.PI; boat.add(door);
    // LED strips along the cabin roof and the hull's top edge (the colours drift, as on the real boats)
    const strip = new Batch(), strip2 = new Batch();
    for (const s of [-1, 1]) { strip.box(s * (HALF_W - 0.3), Y - 0.3, -3, 0.08, 0.08, 34); strip2.box(s * (HALF_W + 0.02), -0.06, -3, 0.06, 0.08, 38); }
    boat.add(strip.mesh(ledA, 'cruise-led'), strip2.mesh(ledB, 'cruise-led2'));
    // strung lights from the mast to the stern
    const pts = [];
    for (const s of [-1, 1]) for (let k = 0; k <= 24; k++) { const f = k / 24, z = 15.2 + (-20 - 15.2) * f, x = s * 3.8 * f, y = Y + 7.1 - 5.0 * f + Math.sin(f * Math.PI) * -0.6; pts.push(x, y, z); }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const bulbs = new THREE.Points(pg, new THREE.PointsMaterial({ color: new THREE.Color(2.4, 1.9, 1.2), size: 2.2, sizeAttenuation: false })); boat.add(bulbs);
    asLight(bulbs.material, 'lamps', 0);
  }
  // the deck's own warm light (it goes where the boat goes); off by day, and when you're nowhere near
  const deckLight = new THREE.PointLight(new THREE.Color(1.0, 0.8, 0.55), 0, 26, 2); deckLight.position.set(0, Y + 3.4, -3); boat.add(deckLight);
  boat.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } o.layers.enable(REFLECT_LAYER); });
  scene.add(boat);
  // a few other passengers at the rails (Rocketbox people, aboard with the boat)
  const riders = [];
  if (people) {
    const SPOTS = [[-3.2, -12, -Math.PI / 2, 'look'], [-3.1, -10.9, -Math.PI / 2, 'phone'], [3.1, -6, Math.PI / 2, 'look'], [-3.2, 4, -Math.PI / 2, 'idle'], [-2.9, 4.9, -Math.PI / 2 + 0.5, 'phone'], [2.9, 8, Math.PI / 2, 'look'], [0.4, -17.5, Math.PI, 'idle']];
    const pool = roles.filter((r) => people.manifest.cast[r] && !people.manifest.cast[r].child);
    SPOTS.forEach(([x, z, h, anim], i) => {
      if (!pool.length) return;
      const p = createPerson(people, pool[(i * 3 + 1) % pool.length]);
      p.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      p.root.position.set(x, Y, z); p.root.rotation.y = h; p.play(anim, 0);
      boat.add(p.root); riders.push({ p, x, z });
    });
  }

  // ---- where the boat is, and the people aboard ----
  const S = { x: DOCK.x, z: DOCK.z, h: Math.PI, bob: 0, st: cruiseAt(0), said: {}, dep: null, aboard: false, prevAboard: false, t: 0 };
  const toLocal = (x, z, s = S) => { const dx = x - s.x, dz = z - s.z, c = Math.cos(s.h), n = Math.sin(s.h); return [dx * c - dz * n, dx * n + dz * c]; };
  const toWorld = (lx, lz, s = S) => { const c = Math.cos(s.h), n = Math.sin(s.h); return [s.x + lx * c + lz * n, s.z - lx * n + lz * c]; };
  const docked = () => S.st.status === 'docked';
  const onDeck = (x, z, y, s = S) => { if (y == null || Math.abs(y - (Y + s.bob)) > 1.6) return false; const [lx, lz] = toLocal(x, z, s); return Math.abs(lx) <= HALF_W && lz >= -21 && lz <= 21; };
  const mover = {
    ground(x, z, y) { return onDeck(x, z, y) ? Y + S.bob : null; },
    // inside the rails (and off the benches, out of the wheelhouse); the gate opens onto the pier when docked
    keep(b) {
      if (!onDeck(b.x, b.z, b.y)) return;
      let [lx, lz] = toLocal(b.x, b.z);
      const r = LAYOUT.radius || 0.3;
      const gate = docked() && Math.abs(lz) < GATE.z - r;
      // at the rail: inside it, or (coming from the pier where there's no gate) back out onto the pier
      if (lx > WALK.x && !gate) lx = lx > (WALK.x + HALF_W) / 2 ? HALF_W + 0.35 : WALK.x;
      lx = Math.max(-WALK.x, Math.min(HALF_W + 1.5, lx));
      lz = Math.max(WALK.z0, Math.min(WALK.z1, lz));
      for (const q of riders) { const dx = lx - q.x, dz = lz - q.z, d = Math.hypot(dx, dz); if (d < 0.5 && d > 1e-4) { lx = q.x + (dx / d) * 0.5; lz = q.z + (dz / d) * 0.5; } }
      [b.x, b.z] = toWorld(lx, lz);
    },
  };
  movers.push(mover);

  function place(minute, t) {
    const st = cruiseAt(minute);
    S.st = st; S.x = st.x; S.z = st.z; S.h = st.h;
    S.bob = st.status === 'out' ? Math.sin(t * 0.8) * 0.035 : 0;
    boat.position.set(S.x, S.bob, S.z); boat.rotation.set(0, S.h, st.status === 'out' ? Math.sin(t * 0.6) * 0.008 : 0);
  }
  const pa = (key) => { const [who, zh, en] = CRUISE_LINES[key]; const [x, z] = toWorld(0, 14); voice.say({ zh, en, who, at: [x, Y + 4, z], gain: 1.1 }); };
  const nowMin = () => { if (clock) return clock(); const l = L0(); return l.clock.minute + l.clock.sec / 60; };
  const ticketOk = () => { const c = C(); return c.ticket != null && (docked() ? c.ticket === S.st.next : false); };

  place(nowMin(), 0);
  return {
    group: boat, pier,
    get state() { return S.st; },
    get aboard() { return S.aboard; },
    // ahead of the player's own update: the boat moves, and carries whoever is on it
    update(dt, pp, { playing = true } = {}) {
      S.t += dt;
      const prev = { x: S.x, z: S.z, h: S.h, bob: S.bob };
      const wasAboard = onDeck(pp.body.x, pp.body.z, pp.body.y, prev);
      const before = S.st.status;
      place(nowMin(), S.t);
      if (wasAboard) {
        const [lx, lz] = toLocal(pp.body.x, pp.body.z, prev);
        [pp.body.x, pp.body.z] = toWorld(lx, lz);
        pp.body.y += S.bob - prev.bob;
        let dh = S.h - prev.h; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI;
        pp.yaw += dh;
      }
      S.aboard = onDeck(pp.body.x, pp.body.z, pp.body.y);
      const c = C(), l = L0();
      // sailing: the ride counts if you're aboard as she leaves
      if (before === 'docked' && S.st.status === 'out') {
        S.said = {}; S.dep = S.st.dep;
        if (S.aboard) { c.rides = (c.rides || 0) + 1; c.lastRide = stamp(l); if (c.rides === 1) hud.achievement(T('夜游黄浦江', 'The Huangpu by night')); save && save(); }
        c.ticket = null;
        audio && audio.cue && audio.cue('shiphorn', 0, S.aboard ? 1 : 0.6);
      }
      // the announcer: aboard, or near enough on the promenade to hear
      const [bx, bz] = toWorld(0, 0), near = S.aboard || Math.hypot(pp.body.x - bx, pp.body.z - bz) < 60;
      if (S.st.status === 'out' && near) for (const p of PA_AT) if (p.s >= 0 && S.st.s >= p.s && S.st.s < p.s + 60 && !S.said[p.at]) { S.said[p.at] = true; pa(p.at); }
      if (docked() && S.st.next != null && S.st.next - nowMin() < 5 && S.said.boardFor !== S.st.next && near) { S.said.boardFor = S.st.next; pa('board'); }
      // the gate from the promenade: shut unless you have a ticket for the boat at the pier (you can always walk back out)
      const shut = !ticketOk() && pp.body.x < PIER.x0 + 0.3;
      Object.assign(gateBox, shut ? { minX: PIER.x0 - 0.1, maxX: PIER.x0 + 0.35, minZ: PIER.z0, maxZ: PIER.z1 } : { minX: 1e6, maxX: 1e6, minZ: 1e6, maxZ: 1e6 });
      // the end of the pier: open only onto the boat alongside
      Object.assign(endBox, docked() ? { minX: 1e6, maxX: 1e6, minZ: 1e6, maxZ: 1e6 } : { minX: PIER.x1, maxX: PIER.x1 + 0.4, minZ: PIER.z0, maxZ: PIER.z1 });
      audio && audio.setBoat && audio.setBoat(S.aboard ? 1 : 0, S.st.v || 0);
      // the boat's LED strips drift through colours (dim by day, like the others on the river)
      const on = Math.max(0.12, 1 - (l.clock.minute > 7 * 60 && l.clock.minute < 17 * 60 ? 0.85 : 0));
      ledA.color.setHSL((0.92 + S.t * 0.01) % 1, 0.8, 0.6).multiplyScalar(2 * on); ledB.color.setHSL((0.52 + S.t * 0.008) % 1, 0.8, 0.6).multiplyScalar(2 * on);
      const close = S.aboard || Math.hypot(pp.body.x - bx, pp.body.z - bz) < 90;
      if (close) for (const q of riders) q.p.update(dt * 0.6);
      deckLight.intensity = close ? 22 * (l.clock.minute > 7 * 60 && l.clock.minute < 17 * 60 ? 0.1 : 1) : 0;
    },
    // E at the gate (ticket / wait) and at the wheelhouse door (stay to the end)
    candidates() {
      const out = [], b = player.body;
      if (!S.aboard && Math.abs(b.z - (PIER.z0 + PIER.z1) / 2) < 6 && b.x > 18 && b.x < PIER.x0 + 1.5 && !ticketOk()) out.push({ id: 'cruise:gate', x: PIER.x0 + 0.5, y: Y + 1.3, z: (PIER.z0 + PIER.z1) / 2, reach: 4, cone: 0.7 });
      if (ferryTo && !S.aboard && Math.hypot(b.x - (PIER.x0 - 0.9), b.z - (PIER.z0 - 0.9)) < 5) out.push({ id: 'cruise:ferry', x: PIER.x0 - 0.9, y: Y + 1.25, z: PIER.z0 - 0.9, reach: 3.5, cone: 0.7 });
      if (S.aboard && S.st.status === 'out' && S.st.s < 1400) { const [x, z] = toWorld(0, 13.5); out.push({ id: 'cruise:skip', x, y: Y + 1.2, z, reach: 3, cone: 0.6 }); }
      return out;
    },
    owns: (id) => id.startsWith('cruise:'),
    // (the ferry board is beside the gate: it has its own map blip in main's list via mapBlip)
    prompt(id) {
      if (id === 'cruise:ferry') { const m = L0().clock.minute, n = nextFerry(m); return { target: T('轮渡 · 外滩 → 陆家嘴', 'Ferry · the Bund → Lujiazui'), action: n == null ? T('今天的轮渡已停 · 早上6点首班', 'No more ferries today · first at 6 am') : T(`过江 · ¥${FERRY.fare} · ${clockText(n)} 开`, `Cross the river · ¥${FERRY.fare} · leaves ${clockText(n)}`) }; }
      if (id === 'cruise:skip') return { target: T('驾驶室', 'The wheelhouse'), action: T('一直坐到靠岸（跳过）', 'Stay aboard till we\'re back (skip)') };
      const st = S.st;
      if (st.status === 'docked' && st.next != null) return { target: T('浦江游览', 'River cruise'), action: T(`买票 ¥${FARE} · ${clockText(st.next)} 开`, `Buy a ticket · ¥${FARE} · sails ${clockText(st.next)}`) };
      if (st.status === 'out') { const back = Math.ceil(st.dep + TRIP_MINUTES); const next = st.dep + 60; return { target: T('浦江游览', 'River cruise'), action: next <= 21 * 60 ? T(`船在江上 · 等到 ${clockText(back)} 回来`, `Out on the river · wait till ${clockText(back)}`) : T('今天最后一班已开走', 'The last sailing has gone') }; }
      return { target: T('浦江游览', 'River cruise'), action: T('今天的船已经停了 · 明早十点', 'No more sailings today · first at 10 am') };
    },
    interact(id) {
      const l = L0(), c = C(), st = S.st;
      if (id === 'cruise:ferry') {
        const n = nextFerry(l.clock.minute);
        if (n == null) { hud.toast(T('今天的轮渡已经停了。地铁2号线（南京东路站）或叫车也能过江。', 'No more ferries today. Line 2 (East Nanjing Road) or a DiDi still cross.'), 3.6); return true; }
        const r = pay(l, { method: 'alipay', amount: FERRY.fare, to: '上海轮渡 Shanghai Ferry', memo: '金陵东路 → 东昌路', kind: 'transport' });
        if (!r.ok) { hud.toast(T('支付宝余额不足。', 'Not enough on Alipay.'), 3); return true; }
        r.entry.memoEn = 'Jinling Rd E → Dongchang Rd ferry';
        audio && audio.cue && audio.cue('ping', 0, 0.6);
        const arrive = Math.floor(stamp(l) / 1440) * 1440 + n + FERRY.crossing;
        travel(() => { skipTo(arrive); ferryTo({ method: 'ferry', fare: FERRY.fare }); }, { line: T(`轮渡 · ${clockText(n)} · 金陵东路 → 东昌路 · 八分钟过江`, `The ferry · ${clockText(n)} · Jinling Rd E → Dongchang Rd · eight minutes across`), hold: 1700 });
        return true;
      }
      if (id === 'cruise:skip') {
        const end = Math.floor(stamp(l) / 1440) * 1440 + Math.ceil(st.dep + TRIP_MINUTES) + 0.5;
        travel(() => { skipTo(end); }, { line: T('江风，灯，船慢慢靠岸……', 'River wind, lights, the boat easing in…'), hold: 1400 });
        return true;
      }
      if (st.status === 'docked' && st.next != null) {
        const r = pay(l, { method: 'alipay', amount: FARE, to: '浦江游览 Huangpu River Cruise', memo: `${clockText(st.next)} 班`, kind: 'leisure' });
        if (!r.ok) { hud.toast(T('支付宝余额不足。', 'Not enough on Alipay.'), 3); return true; }
        c.ticket = st.next; save && save();
        audio && audio.cue && audio.cue('ping', 0, 0.8);
        hud.toast(T(`扫码进闸 · ¥${FARE} · ${clockText(st.next)} 开船，可以上船了`, `Through the gate · ¥${FARE} · sails at ${clockText(st.next)}, boarding now`), 3.6);
        return true;
      }
      if (st.status === 'out' && st.dep + 60 <= 21 * 60) {
        const back = Math.floor(stamp(l) / 1440) * 1440 + Math.ceil(st.dep + TRIP_MINUTES) + 1;
        travel(() => { skipTo(back); }, { line: T('等船回来……', 'Waiting for the boat to come back…'), hold: 900 });
        return true;
      }
      hud.toast(T('今天的船已经停了，明天上午十点开始。', 'No more sailings today; they start again at 10 am.'), 3.4);
      return true;
    },
    mapBlip() { return { x: PIER.x0 - 1, z: (PIER.z0 + PIER.z1) / 2, glyph: '⛴', bg: '#13325a', fg: '#ffd38a', name: { zh: '浦江游览码头', en: 'River cruise pier' } }; },
  };
}
