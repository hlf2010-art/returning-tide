// Lujiazui, across the river: the district you can walk. The roundabout under the Mingzhu Ring (明珠环,
// the circular footbridge), its stairs and escalators; Century Avenue; Shanghai IFC with its mall and
// the lobby that takes you up to the 32nd floor; Apple Pudong's glass cylinder on its plaza,
// the spiral glass stair down into the store; Lujiazui station's exits (Line 2, one stop from East
// Nanjing Road); the Central Green with its lake, lawn and paths; the Pearl, the Shanghai Tower, Jin
// Mao and the World Financial Center standing where they stand.
//   Where things are, the ground and the collisions: world/lujiazuiLayout.js (pure, node-tested).
//   The ground mesh: world/lujiazuiGround.js. Structures: world/lujiazuiBuild.js. Traffic and people:
//   world/lujiazuiLife.js. What is real and what is approximate: docs/lujiazui.md.
// Nothing here is built, drawn or simulated while you are on the Bund: the district is made the first
// time you come to Pudong (during the ride's fade) and is hidden again when you leave.
import * as THREE from 'three';
import { getLang } from '../ui/i18n.js';
import { FONT, loadFonts } from './canvas.js';
import { autoLights } from './dayNight.js';
import { PIER, addDynamicCollider } from './layout.js';
import { FERRY, nextFerry } from '../engine/ferry.js';
import { PICKUP } from './didi.js';
import { stamp, skipTo, pay } from '../engine/life.js';
import { fare, dest } from '../engine/ride.js';
import { createEntrances } from './entrances.js';
import { mapExtras } from '../ui/minimap.js';
import {
  C, RING, ARMS, RAMPS, SPUR, APPLE, METRO_LJZ, IFC, BUILDINGS, GREEN, LAKE, YIN, ZEBRAS, AVE, CH, LJZ,
  dirOf, polar, rpolar, fromAP, toAP, applePt, wellPt, wellLocal, PEARL_PARK, RC, carriage, zebra, inPudong, ljzZone, ljzState, signalAt,
} from './lujiazuiLayout.js';
import { LJZ_TEXT } from './lujiazuiLayout.js';
// The district's builders (ground, structures, traffic and people: some 120 KB) are a chunk of their
// own, not in the startup bundle: fetched in the background once the game is up, and waited for before
// the district is first built.
let mods = null, modsP = null;
const loadMods = () => modsP || (modsP = Promise.all([import('./lujiazuiGround.js'), import('./lujiazuiBuild.js'), import('./lujiazuiLife.js')])
  .then(([g, b, l]) => (mods = { ...g, ...b, ...l })));

export { LJZ };
const T = (zh, en) => (getLang() === 'zh' ? zh : en);

export function createLujiazui({ scene, camera, M, people, hud, audio, player, travel, getLife, save, skyline, dests, lighting, renderer = null, metroOpen = () => true, metroPassage = null, trafficFactor = 1 }) {
  const root = new THREE.Group(); root.name = 'lujiazui'; root.visible = false; scene.add(root);
  // the fonts' glyphs for the signs, asked for early (in the background) so they are there when the district is built
  loadFonts([[`800 40px ${FONT.sans}`, LJZ_TEXT], [`900 40px ${FONT.sans}`, LJZ_TEXT], [`600 40px ${FONT.sans}`, LJZ_TEXT], [`700 40px ${FONT.sans}`, LJZ_TEXT], [`800 40px ${FONT.serif}`, '陆家嘴中心绿地']]);
  let built = false, active = false, traffic = null, folk = null, heads = null, ent = null, carBoxes = [], stats = null, clock = 0, pending = null;

  const KEEP = new Set(['player', 'sky', 'pudong', 'river', 'bund', 'promenade', 'lighting', 'entrances', 'rain', 'metro']);
  let stowed = [];
  // the district is made in steps: all at once (build), or a step at a time between frames (buildAsync,
  // started while you ride Line 2 east, so it's ready when the train comes out under Pudong)
  let steps = null, building = null;
  if (typeof window !== 'undefined') setTimeout(() => loadMods().catch((e) => console.warn('Lujiazui: modules failed to load', e)), 1500);
  function makeSteps() {
    const { buildGround, buildMarkings, railTexture, ljzMaterials, buildBridge, buildApple, buildIfc, buildMetro, buildTrees, buildGreen, buildSurroundings, buildStreet, lampKit, createLjzTraffic, createLjzPeople } = mods;
    const t0 = performance.now(), m = ljzMaterials(M), kit = lampKit(m), trees = [], C = { t0 };
    return [
      () => {
        const G = buildGround(), P = buildMarkings(); C.G = G;
        const rail = new THREE.MeshStandardMaterial({ map: railTexture(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.3 });
        for (const [geo, mat, name, cast] of [[G.road, m.road, 'road'], [G.pave, m.pave, 'pave'], [G.grass, m.grass, 'grass'], [G.path, m.path, 'paths'], [G.kerb, m.granite, 'kerbs'], [G.rails, rail, 'rails', true], [P.white, m.paint, 'paint'], [P.yellow, m.yellow, 'paint-yellow']]) {
          const o = new THREE.Mesh(geo, mat); o.name = `ljz-${name}`; o.matrixAutoUpdate = false; o.receiveShadow = true; o.castShadow = !!cast; if (name === 'kerbs') mat.side = THREE.DoubleSide; root.add(o);
        }
        { const far = new THREE.Mesh(new THREE.PlaneGeometry(2600, 2600).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2c2f33, roughness: 1 })); far.position.set(1000, -12, 300); far.name = 'ljz-far-ground'; root.add(far); }
      },
      () => { buildBridge(root, m, kit); buildApple(root, m, kit, trees); },
      () => { buildIfc(root, m, kit); buildMetro(root, m, kit); },
      () => { buildGreen(root, m, kit, trees); },
      () => { buildSurroundings(root, m, kit, trees); },
      () => { heads = buildStreet(root, m, kit); C.cards = buildTrees(root, trees); kit.finish(root); autoLights(root, 'lamps', 0.3); },
      () => {
        // where you can go in, marked as on the Bund (a pool of light, a label when it's in view)
        const L = LJZ.ifcLobbyDoor, K = LJZ.kerbPickup, AD = LJZ.appleCylinderDoor, toC = dirOf(APPLE.entry);
        ent = createEntrances({ scene, camera, list: [
          { id: 'ljz-ifc', name: ['国金中心 · 办公楼', 'IFC · the office tower'], act: ['上楼', 'go up'], x: L.x, z: L.z, nx: L.nx, nz: L.nz, y: CH, w: 5 },
          { id: 'ljz-apple', name: ['Apple 浦东', 'Apple Pudong'], act: ['进去 · 旋转楼梯', 'in, down the spiral stair'], x: AD.x - toC[0] * 0.4, z: AD.z - toC[1] * 0.4, nx: toC[0], nz: toC[1], y: APPLE.yPlaza, w: 3, glow: false },
          ...METRO_LJZ.map((W) => ({ id: `ljz-m${W.exit}`, name: [`陆家嘴站 ${W.exit} 号口`, `Lujiazui station, Exit ${W.exit}`], act: ['下楼 · 2号线', 'down to Line 2'], x: W.top[0] - W.dx * 0.8, z: W.top[1] - W.dz * 0.8, nx: -W.dx, nz: -W.dz, y: CH, w: 3, open: metroOpen, glow: false })),
          { id: 'ljz-ferry', name: ['轮渡 · 东昌路码头', 'Ferry · Dongchang Rd pier'], act: ['回外滩', 'back to the Bund'], x: LJZ.ferrySign.x, z: LJZ.ferrySign.z, nx: Math.sin(65 * Math.PI / 180), nz: -Math.cos(65 * Math.PI / 180), y: CH, w: 3, glow: false },
          { id: 'ljz-didi', name: ['网约车上下客点', 'Ride-hailing point'], act: ['回外滩', 'a car back to the Bund'], x: K.x, z: K.z, nx: LJZ.ifcLobbyStand.x - K.x, nz: LJZ.ifcLobbyStand.z - K.z, y: CH, w: 3, glow: false },
        ].map((e) => { const l = Math.hypot(e.nx, e.nz) || 1; return { ...e, nx: e.nx / l, nz: e.nz / l }; }) });
        kit.push(...ent.lights);
        // the real lights go to whichever lamps are nearest (world/lighting.js)
        if (lighting) for (const s of kit) lighting.sources.push({ x: s.x, y: s.y, z: s.z, intensity: s.intensity, distance: s.distance, color: s.color || new THREE.Color(1.0, 0.72, 0.42), angle: s.angle || 1.3, out: !!s.out, on: s.on || null, d: 0, sw: 0 });
        traffic = createLjzTraffic({ group: root, factor: trafficFactor });
        carBoxes = traffic.cars.map(() => addDynamicCollider('vehicle'));
        folk = createLjzPeople({ group: root, people });
        root.updateMatrixWorld(true);
      },
      () => {
        let tris = 0, meshes = 0; root.traverse((o) => { if (o.isMesh && o.geometry) { meshes++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; } });
        stats = { ms: Math.round(performance.now() - C.t0), meshes, tris: Math.round(tris), ground: Math.round(C.G.tris), leafCards: C.cards, lights: kit.length, cars: traffic.cars.length, people: folk.list.length };
        // compile the district's shaders now, behind the fade, not on the first frame you see it (a stall of a
        // second or more on some GPUs and drivers, Windows' ANGLE above all)
        if (renderer) { const was = root.visible; root.visible = true; try { const t1 = performance.now(); renderer.compile(root, camera, scene); stats.compileMs = Math.round(performance.now() - t1); } catch (e) { console.warn('Lujiazui: shader precompile skipped', e); } root.visible = was; }
        console.info('Lujiazui built', stats);
      },
    ];
  }
  // (true once built; false while its modules are still on their way: update() tries again each frame)
  function build() {
    if (built) return true;
    if (!mods) { loadMods(); return false; }
    if (!steps) steps = makeSteps();
    while (steps.length) steps.shift()();
    built = true; return true;
  }
  function buildAsync() {
    if (built || building) return building;
    building = (async () => { await loadMods(); if (!steps) steps = makeSteps(); while (steps.length && !built) { steps.shift()(); await new Promise((r) => setTimeout(r, 40)); } built = true; })();
    return building;
  }
  function show(on) {
    if (on === active) return; active = on; root.visible = on;
    if (skyline && skyline.setNear) skyline.setNear(on, { jinmao: LJZ.towers.jinmao, swfc: LJZ.towers.swfc, tower: LJZ.towers.shanghaiTower });
    // the Bund's own life (its interiors, traffic, people, trees: some 1,500 meshes) is 700 m away across the
    // river: not drawn while you're here. Its façades, the promenade, the river and the sky stay.
    if (on) { stowed = scene.children.filter((o) => o.visible && o !== root && !KEEP.has(o.name) && !o.isLight && !o.isCamera); for (const o of stowed) o.visible = false; }
    else { for (const o of stowed) o.visible = true; stowed = []; }
    // the river's surface is one plane reaching far under Pudong (its ground hides it); here the Apple court
    // and the store go below it, so while you're here it stops at the Pudong bank
    { const w = scene.getObjectByName('water'); if (w && w.geometry.parameters) { const W = w.geometry.parameters.width; if (!w.userData.home) w.userData.home = { x: w.position.x, sx: w.scale.x }; const x0 = w.userData.home.x - W / 2, x1 = on ? 500 : x0 + W; w.scale.x = (x1 - x0) / W; w.position.x = (x0 + x1) / 2; w.updateMatrix(); w.updateMatrixWorld(true); } }
    if (!on) { for (const b of carBoxes) b.minX = b.maxX = b.minZ = b.maxZ = 1e6; if (ent) ent.update(0.2, { eye: camera.position, active: false }); }
  }

  // ---- arriving: by DiDi at IFC's kerb, by Line 2 up Exit 6 ----
  const upstairs = dests.arrive.bind(dests);
  function arriveStreet(info = {}) {
    const behind = info.method === 'metro' || info.method === 'ferry';   // already behind that journey's own fade
    pending = { method: behind ? 'alipay' : info.method || 'wechat', invite: info.invite || null, at: stamp(getLife()) };
    let done = false;
    const go = async () => {
      if (done) return; done = true; await loadMods(); build();
      const p = info.method === 'metro' ? LJZ.metroArrive : info.method === 'ferry' ? LJZ.ferryArrive : LJZ.kerbPickup;
      player.teleport(p.x, p.z, p.yaw, 0, p.y); show(true);
      if (info.method === 'ferry') hud.toast(T('东昌路轮渡码头 · 沿陆家嘴西路走上来', 'Off the Dongchang Road ferry · up West Lujiazui Road'), 3.6);
      else if (info.method !== 'metro') hud.toast(T(`国金中心 · 世纪大道8号${info.fare ? ` · 车费 ¥${info.fare}` : ''}`, `IFC · 8 Century Avenue${info.fare ? ` · fare ¥${info.fare}` : ''}`), 3.6);
    };
    travel(async () => go(), { line: T('陆家嘴', 'Lujiazui'), hold: 900, to: 'play' });
    if (behind) go();
    return true;
  }
  dests.arrive = (id, info = {}) => (id === 'lujiazui' && !info.up ? arriveStreet(info) : upstairs(id, info));
  // the lobby's lifts: up to the 32nd floor (the scene there is world/destinations.js's). An invitation
  // you came for, or one that is due about now, is the one you're keeping.
  function goUp() {
    const l = getLife(), d = dest('lujiazui'), ids = [].concat(d.invite || []);
    const due = l.invites.find((i) => ids.includes(i.id) && Math.abs(stamp(l) - i.at) <= 120 && i.status !== 'declined' && !i.kept);
    const came = pending && pending.invite && l.invites.find((i) => i.id === pending.invite && !i.kept);
    const inv = came || due || null;
    audio && audio.cue && audio.cue('door');
    dests.arrive('lujiazui', { up: true, method: (pending && pending.method) || 'wechat', invite: inv ? inv.id : null });   // (whoever has the floors decides which: the firm on 28, the room on 32)
  }
  // down again: the lift opens on the lobby, you step out onto Century Avenue
  dests.exitTo = (id, finish) => {
    if (id !== 'lujiazui') return false;
    travel(async () => { finish(); await loadMods(); build(); const p = LJZ.ifcLobbyStand; player.teleport(p.x, p.z, p.yaw, 0, p.y); show(true); save && save(); }, { line: T('国金中心 · 一楼大堂', 'IFC · the ground-floor lobby'), hold: 700, to: 'play' });
    return true;
  };
  // back to the Bund: a car from the kerb (through the Yan'an East Road tunnel), the ferry, or Line 2 (world/metro.js)
  function ferryBack() {
    const l = getLife(), n = nextFerry(l.clock.minute);
    if (n == null) { hud.toast(T('今天的轮渡已经停了。地铁或者叫车都能回外滩。', 'No more ferries today. The metro or a DiDi will take you back.'), 3.6); return; }
    const r = pay(l, { method: 'alipay', amount: FERRY.fare, to: '上海轮渡 Shanghai Ferry', memo: '东昌路 → 金陵东路', kind: 'transport' }); if (!r.ok) { hud.toast(T('支付宝余额不足。', 'Not enough on Alipay.'), 3); return; }
    r.entry.memoEn = 'Dongchang Rd → Jinling Rd E ferry';
    travel(async () => {
      skipTo(l, Math.floor(stamp(l) / 1440) * 1440 + n + FERRY.crossing);
      player.teleport(PIER.x0 - 2.6, PIER.z0 - 2.2, Math.PI / 2, 0); show(false); save && save();
    }, { line: T('轮渡 · 东昌路 → 金陵东路 · 八分钟过江', 'The ferry · Dongchang Rd → Jinling Rd E · eight minutes across'), hold: 1600, to: 'play' });
  }
  function carBack() {
    const l = getLife(), d = dest('lujiazui'), back = fare(d, l.clock.minute);
    travel(async () => {
      skipTo(l, stamp(l) + d.mins);
      const r = pay(l, { method: (pending && pending.method) || 'wechat', amount: back, to: '滴滴出行', memo: '快车 → 外滩', kind: 'ride' }); if (r.ok) r.entry.memoEn = 'DiDi Express to the Bund';
      player.teleport(PICKUP.x, PICKUP.z - 1.2, Math.PI / 2, 0); show(false); save && save();
    }, { line: T(`滴滴快车 · 延安东路隧道 → 外滩 · ¥${back}`, `DiDi Express · the Yan'an East Road tunnel → the Bund · ¥${back}`), hold: 1500, to: 'play' });
  }
  // ---- what E does here ----
  const TARGETS = [];
  { const L = LJZ.ifcLobbyDoor; TARGETS.push({ id: 'ljz:lobby', x: L.x, y: CH + 1.5, z: L.z, reach: 4.2, cone: 0.55 }); }
  { const F = LJZ.ferrySign; TARGETS.push({ id: 'ljz:ferry', x: F.x, y: CH + 1.8, z: F.z, reach: 4.0, cone: 0.6 }); }
  { const K = LJZ.kerbPickup, [ux, uz] = dirOf(AVE); TARGETS.push({ id: 'ljz:didi', x: K.x - ux * 3.2, y: CH + 2.2, z: K.z - uz * 3.2, reach: 4.0, cone: 0.6 }); }
  // Exits 6 and 4 come down into the station (world/metro.js); Exit 1's way in is a long passage (the fade)
  for (const W of METRO_LJZ) if (W.exit === 1) { const [x, z] = wellPt(W, W.len - 0.2); TARGETS.push({ id: `ljz:metro:${W.exit}:in`, x, y: -W.depth + 1.6, z, reach: 3.2, cone: 0.5, well: W }); }
  { const [x, z] = applePt(APPLE.tables[1].ang, APPLE.tables[1].r); TARGETS.push({ id: 'ljz:apple:table', x, y: APPLE.yStore + 1.0, z, reach: 2.6, cone: 0.6 }); }

  function mapBlips() {
    const out = [
      { x: LJZ.ifcLobbyDoor.x, z: LJZ.ifcLobbyDoor.z, glyph: '国', bg: '#24303f', fg: '#cfe0f5', name: { zh: '国金中心（办公楼大堂）', en: 'IFC (office lobby)' } },
      { x: APPLE.x, z: APPLE.z, glyph: 'A', bg: '#e9ecee', fg: '#111', name: { zh: 'Apple 浦东', en: 'Apple Pudong' } },
      { x: LJZ.ferrySign.x, z: LJZ.ferrySign.z, glyph: '⛴', bg: '#0f2a24', fg: '#ffe08a', name: { zh: '轮渡（东昌路 → 外滩）', en: 'Ferry (Dongchang Rd → the Bund)' } },
      { x: LJZ.kerbPickup.x, z: LJZ.kerbPickup.z, glyph: 'D', bg: '#ff7a00', fg: '#fff', name: { zh: '网约车上下客点（国金中心）', en: 'Ride-hailing point (IFC)' } },
      { x: LJZ.greenGate.x, z: LJZ.greenGate.z, glyph: '绿', bg: '#2f5a34', fg: '#e3f2dc', name: { zh: '陆家嘴中心绿地', en: 'Lujiazui Central Green' } },
      ...LJZ.metroExits.map((e) => ({ x: e.x, z: e.z, glyph: String(e.exit), bg: '#c8161e', fg: '#fff', name: { zh: `陆家嘴站 ${e.exit} 号口`, en: `Lujiazui station, Exit ${e.exit}` } })),
    ];
    return out;
  }
  // the map's ground east of the river (ui/minimap.js paints its base, then calls this)
  mapExtras.push(({ g, px, pz, P, bounds }) => {
    if (bounds.X1 < 520) return;
    const poly = (pts, fill, stroke = null) => { g.beginPath(); pts.forEach(([x, z], i) => (i ? g.lineTo(px(x), pz(z)) : g.moveTo(px(x), pz(z)))); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1; g.stroke(); } };
    const disc = (x, z, r, fill) => { g.fillStyle = fill; g.beginPath(); g.arc(px(x), pz(z), r * P, 0, 6.2832); g.fill(); };
    const line = (x0, z0, x1, z1, w, col) => { g.strokeStyle = col; g.lineWidth = w * P; g.lineCap = 'butt'; g.beginPath(); g.moveTo(px(x0), pz(z0)); g.lineTo(px(x1), pz(z1)); g.stroke(); };
    g.fillStyle = '#132328'; g.fillRect(px(470), 0, 1e5, 1e5);                           // the Pudong bank
    poly(GREEN.P, '#1f3a33');
    for (const l of LAKE) poly(l.P, '#0d2a33');
    poly(PEARL_PARK, '#1a2f2a');
    for (const A of ARMS) line(C.x + A.dx * 20 + A.px * A.off, C.z + A.dz * 20 + A.pz * A.off, C.x + A.dx * A.len + A.px * A.off, C.z + A.dz * A.len + A.pz * A.off, A.hw * 2, '#0a1317');
    line(...fromAP(YIN.ac, -YIN.len), ...fromAP(YIN.ac, YIN.len), YIN.a1 - YIN.a0, '#0a1317');
    disc(C.x, C.z, RING.road, '#0a1317'); disc(C.x, C.z, RING.island, '#1f3a33');
    for (const q of ZEBRAS) poly([fromAP(q.a0, q.p0), fromAP(q.a1, q.p0), fromAP(q.a1, q.p1), fromAP(q.a0, q.p1)], 'rgba(236,212,154,0.42)');
    const ifcIds = new Set([IFC.north, IFC.south, IFC.mall].map((B) => B.id));
    for (const B of BUILDINGS) if (!B.part || B.min < 3) poly(B.P, ifcIds.has(B.id) ? '#284852' : '#1d343b', 'rgba(200,163,90,0.62)');
    for (const [k, t] of Object.entries(LJZ.towers)) if (!k.startsWith('ifc')) disc(t.x, t.z, k === 'pearl' ? 30 : 26, '#2c3e4f');
    // the ring bridge, its stairs and the spur; the Apple plaza and the mall's curved front; the station's exits
    g.strokeStyle = 'rgba(244,230,196,0.9)'; g.lineWidth = (RING.r1 - RING.r0) * P; g.beginPath(); g.arc(px(RC.x), pz(RC.z), RING.rc * P, 0, 6.2832); g.stroke();
    for (const R of RAMPS) line(R.top[0], R.top[1], R.bot[0], R.bot[1], R.hw * 2, 'rgba(244,230,196,0.9)');
    line(...rpolar(SPUR.b, RING.r1 - 1), ...rpolar(SPUR.b, SPUR.s1), SPUR.hw * 2, 'rgba(244,230,196,0.9)');
    disc(APPLE.x, APPLE.z, APPLE.rOut, '#22404a'); disc(APPLE.x, APPLE.z, APPLE.rCyl, '#cfe6e6');
    for (const W of METRO_LJZ) { const [x, z] = wellPt(W, W.len / 2); line(...W.top, ...wellPt(W, W.len), W.hw * 2, '#c8161e'); g.fillStyle = '#fff'; g.font = `700 ${Math.round(3.4 * P)}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(`M${W.exit}`, px(x), pz(z)); }
  });

  const _p = { x: 0, z: 0 };
  return {
    LJZ, root,
    get built() { return built; }, get active() { return active; }, get stats() { return stats; }, get traffic() { return traffic; }, get people() { return folk; },
    build, buildAsync, mapBlips,
    // is this body in the district (street level, the ring, the court; not the 32nd floor)
    here(b) { return inPudong(b.x, b.y); },
    zone(b) { return ljzZone(b.x, b.z, b.y); },
    // for whoever you are talking to: where you are, in the same shape as main.js's sceneText
    sceneLine(clock, raining, extra = '') {
      const b = player.body, z = ljzZone(b.x, b.z, b.y);
      const where = { ring: 'the Mingzhu Ring, the circular footbridge over the Lujiazui roundabout in Pudong, traffic going round below, the Oriental Pearl Tower just to the north-north-west',
        apple: b.y < APPLE.yPlaza - 3 ? 'the Apple store under the sunken court at IFC in Lujiazui, long oak tables, the spiral glass stair up into the glass cylinder' : 'the sunken round court of Apple Pudong in front of the IFC mall: the 13-metre glass cylinder with the spiral stair in it, broad steps up toward the Oriental Pearl Tower, curved walkways round the wall over an HSBC branch and a Starbucks, trees in planters',
        green: 'Lujiazui Central Green, the lawn and the lake in the middle of the towers: Jin Mao, the World Financial Center and the Shanghai Tower to the south-east',
        ljzMetro: 'an exit of Lujiazui metro station (Line 2), by the roundabout', ifc: 'outside Shanghai IFC on Century Avenue in Lujiazui, the office tower\'s lobby behind, taxis at the kerb',
        roundabout: 'the pavement by the Lujiazui roundabout in Pudong, under the ring footbridge, the Oriental Pearl Tower above', century: 'Century Avenue in Lujiazui, Pudong, among the office towers' }[z] || 'Lujiazui, Pudong';
      return `${clock}, ${raining ? 'a light drizzle' : 'a cool clear November day in Shanghai'}. ${where}.${extra ? ` ${extra}` : ''}`;
    },
    talkables() { return active && folk ? folk.talkables() : []; },
    others() { return active && folk ? folk.others() : []; },
    // ---- a place (main.js: candidates / owns / prompt / interact) ----
    candidates() {
      if (!active) return [];
      const b = player.body, out = [];
      for (const t of TARGETS) if (Math.abs(t.x - b.x) < 8 && Math.abs(t.z - b.z) < 8 && Math.abs(t.y - b.y - 1.6) < 3) out.push(t);
      return out;
    },
    owns(id) { return typeof id === 'string' && id.startsWith('ljz:'); },
    prompt(id) {
      if (id === 'ljz:lobby') return { target: T('国金中心 · 办公楼大堂', 'IFC · the office lobby'), action: T('乘电梯上楼', 'Take the lift up') };
      if (id === 'ljz:ferry') { const n = nextFerry(getLife().clock.minute); return { target: T('轮渡 · 东昌路 → 外滩', 'Ferry · Dongchang Rd → the Bund'), action: n == null ? T('今天的轮渡已停 · 早上6点首班', 'No more ferries today · first at 6 am') : T(`坐轮渡回外滩 · ¥${FERRY.fare} · ${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`, `The ferry back to the Bund · ¥${FERRY.fare} · ${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`) }; }
      if (id === 'ljz:didi') { const back = fare(dest('lujiazui'), getLife().clock.minute); return { target: T('网约车上下客点', 'Ride-hailing point'), action: T(`叫车回外滩（¥${back}）`, `A car back to the Bund (¥${back})`) }; }
      if (id === 'ljz:apple:table') return { target: T('桌上的样机', 'The devices on the table'), action: T('拿起来看看', 'Pick one up') };
      const t = TARGETS.find((q) => q.id === id), W = t && t.well;
      if (!W) return null;
      return { target: T('陆家嘴站 · 1号口通道', 'Lujiazui · the Exit 1 passage'), action: T('走通道去站厅', 'Through the passage to the concourse') };
    },
    interact(id) {
      if (id === 'ljz:lobby') goUp();
      else if (id === 'ljz:didi') carBack();
      else if (id === 'ljz:ferry') ferryBack();
      else if (id === 'ljz:apple:table') hud.toast(T('屏幕都亮着，壁纸是今天的外滩。你把它放回了原位。', 'Every screen is lit; the wallpaper is today\'s Bund. You put it back where it was.'), 3.4);
      else { const t = TARGETS.find((q) => q.id === id); if (t && t.well && metroPassage) metroPassage(); }
      return true;
    },
    // per frame. Nothing happens (and nothing is drawn) unless you are in Pudong.
    update(dt, body, { eye = camera.position, hour = null, playing = true } = {}) {
      const want = inPudong(body.x, body.y);
      if (want && !built) build();                             // (a save loaded here, a tool's teleport)
      if (want !== active) show(want);
      if (!active || !built) return;
      clock += dt;
      if (hour) traffic.setDensity(Math.max(0.3, hour.traffic));
      const onRoad = body.y < 1 && carriage(body.x, body.z) ? ((_p.x = body.x), (_p.z = body.z), _p) : null;
      traffic.update(dt, clock, onRoad, eye);
      for (let i = 0; i < carBoxes.length; i++) {
        const c = traffic.cars[i], b = carBoxes[i];
        if (!c.active || Math.abs(c.x - body.x) > 30 || Math.abs(c.z - body.z) > 30) { b.minX = b.maxX = b.minZ = b.maxZ = 1e6; continue; }
        const ex = Math.abs(c.hx) * c.len / 2 + Math.abs(c.hz) * c.width / 2, ez = Math.abs(c.hz) * c.len / 2 + Math.abs(c.hx) * c.width / 2;
        b.minX = c.x - ex; b.maxX = c.x + ex; b.minZ = c.z - ez; b.maxZ = c.z + ez;
      }
      folk.update(dt, body);
      // the junction's lamps
      const s = signalAt(clock), set = (list, on) => { for (const hd of list) hd.forEach((mat, i) => mat.color.setRGB(...(on[i] || [0.03, 0.03, 0.03]))); };
      const RED = [2.6, 0.12, 0.08], AMB = [2.4, 1.3, 0.1], GRN = [0.1, 2.2, 0.5];
      const veh = (go, near) => (go ? [null, null, GRN] : near ? [null, AMB, null] : [RED, null, null]);
      const cyc = clock % 62;
      set(heads.ave, veh(s.ave, cyc >= 34 && cyc < 36)); set(heads.yin, veh(s.yin, cyc >= 58 && cyc < 60));
      set(heads.z1, s.z1 ? [null, GRN] : [RED, null]); set(heads.z2, s.z2 ? [null, GRN] : [RED, null]);
      ent.update(dt, { eye, prompting: false, active: playing });
    },
    get signal() { return signalAt(clock); },
    debug: { state: ljzState, zebra, wellLocal, toAP, IFC },
  };
}
