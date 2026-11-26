// The AIA lobby's working day (No.17 The Bund; its rooms are world/interiors.js). AIA began in Shanghai in 1919 (C. V.
// Starr's agency), went public in Hong Kong in 2010 after leaving AIG, and in 2020 its Shanghai branch became AIA
// Life, the first wholly foreign-owned life insurer in mainland China. Its business here is sold mostly through its
// agents (in 2025 about 85% of new business value came from the agency channel), and protection is the core of it:
// critical illness, medical (from the million-yuan plans to high-end cover with private and VIP clinics), and on
// the savings side annuities and increasing whole life; employee benefits (group cover) for companies.
// So, in office hours (9:00-19:00):
//   - in the consultation corner, two tables: a senior agent with a young couple (critical illness for the husband,
//     who must disclose a thyroid nodule; medical cover past the company plan; a budget of a tenth of income), and
//     a Shanghai agent with a retired couple, in Shanghainese (increasing whole life for the grandson, the cash
//     value written in the contract; medical after heart stents and the city's 沪惠保; the firm's long history)
//   - at reception, an employee-benefits manager meeting a company's HR director (group cover with families,
//     flexible benefits, global medical for foreign staff)
//   - beyond the gates, a young agent on the phone to a client (underwriting wants one more report; signing online
//     and the recorded sales step, 双录)
// And now and then something happens (a complaint, a signing, a client asking about a rebate, the recorded sale,
// a visitor with a camera, a delivery stopped at the gates, an agent recruiting): see SCRIPTS and the deck below.
// The agents wear their own business clothes and the red company lanyard with a staff card. Lines in Mandarin are
// voiced (tools/voice); Shanghainese is subtitled (with a Mandarin gloss for Chinese readers), as elsewhere.
// Product names are generic: no real policy is named. Sources: docs/living-city-buildings.md (No.17).
import * as THREE from 'three';
import { L, colliders } from './layout.js';
import { AIA } from './interiors.js';
import { createPerson } from './people.js';
import { createSeatedPose } from './driverPose.js';
import { dressAgent, greyHair, dressRider } from './outfits.js';
import { holdPhone } from './pedestriansReal.js';
import { WHO, AIA_TALK, AIA_EVENTS } from './aiaTalk.js';
import { contactShadow } from './contactShadow.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
export { AIA_TALK };

const Y0 = L.curbH;
export const AIA_HOURS = [9 * 60, 19 * 60];
const T1 = { x: -39.5, z: -150.45 }, T2 = { x: -36.6, z: -150.45 };

const est = (l) => Math.max(2.4, (l[1] || '').length * (l[3] === 'wuu' ? 0.2 : 0.27) + 0.8);   // (the recorded lines run about a quarter second a character)

// the consultation corner's tables and chairs, on the floor plan
for (const t of [T1, T2]) colliders.push({ minX: t.x - 1.1, maxX: t.x + 1.1, minZ: t.z - 1.0, maxZ: t.z + 1.05, tag: 'desk', y0: 0, y1: 8 });

export function createAiaLife({ scene, people, hud, getLife = null }) {
  const group = new THREE.Group(); group.name = 'aia-life'; scene.add(group);
  // ---- the furniture: walnut tables with marble tops, club chairs in grey-blue leather; a tablet, papers, tea ----
  const walnut = new THREE.MeshStandardMaterial({ color: 0x3b2618, roughness: 0.45 }), top = new THREE.MeshStandardMaterial({ color: 0xf1ede5, roughness: 0.25 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x3a4652, roughness: 0.5 }), brass = new THREE.MeshStandardMaterial({ color: 0xc89b4a, roughness: 0.4, metalness: 1 });
  const porcelain = new THREE.MeshStandardMaterial({ color: 0xf6f4ef, roughness: 0.25 }), tea = new THREE.MeshStandardMaterial({ color: 0x8a5a22, roughness: 0.1 });
  const add = (geo, mat, x, y, z, ry = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; group.add(m); return m; };
  // a club armchair, made properly: a plinth body with rounded edges, a loose seat cushion, a back that leans
  // a little and is stitched in two panels, rolled arms, short tapered walnut legs with brass cups; deep navy
  // leather with a fine grain and a soft sheen (geometry shared by every chair)
  const grain = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), img = x.createImageData(256, 256), d = img.data;
    let s2 = 9; const r = () => ((s2 = (s2 * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < d.length; i += 4) { const n = 128 + (r() - 0.5) * 40; d[i] = n; d[i + 1] = n; d[i + 2] = 255; d[i + 3] = 255; }
    x.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t; })();
  leather.dispose();
  const hide = new THREE.MeshPhysicalMaterial({ color: 0x24303d, roughness: 0.48, normalMap: grain, normalScale: new THREE.Vector2(0.35, 0.35), clearcoat: 0.25, clearcoatRoughness: 0.5, sheen: 0.3, sheenColor: new THREE.Color(0x6a7a8c) });
  const seam = new THREE.MeshStandardMaterial({ color: 0x141b23, roughness: 0.7 });
  const CH = (() => {
    const rb = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 4, r);
    return {
      body: rb(0.76, 0.3, 0.74, 0.05), cushion: rb(0.54, 0.13, 0.56, 0.055), back: rb(0.76, 0.5, 0.17, 0.07), arm: rb(0.13, 0.26, 0.7, 0.05),
      roll: new THREE.CylinderGeometry(0.085, 0.085, 0.7, 20, 1).rotateX(Math.PI / 2), seam: new THREE.BoxGeometry(0.5, 0.008, 0.012),
      leg: new THREE.CylinderGeometry(0.022, 0.014, 0.09, 10), cup: new THREE.CylinderGeometry(0.016, 0.016, 0.02, 10),
    };
  })();
  const chair = (x, z, ry) => {
    const g = new THREE.Group(); g.position.set(x, Y0, z); g.rotation.y = ry; group.add(g);
    const put = (geo, mat, px, py, pz, rx = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.rotation.x = rx; m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
    put(CH.body, hide, 0, 0.09 + 0.15, 0.0);                                         // the plinth body, on its legs
    put(CH.cushion, hide, 0, 0.39 + 0.065, 0.06);                                     // the seat cushion: top at 0.52
    put(CH.back, hide, 0, 0.39 + 0.25, -0.29, -0.12);                                  // the back, leaning a touch
    put(CH.seam, seam, 0, 0.66, -0.2, -0.12);                                         // its stitched panel line
    for (const sx of [-1, 1]) { put(CH.arm, hide, sx * 0.315, 0.39 + 0.1, 0.0); put(CH.roll, hide, sx * 0.315, 0.39 + 0.24, 0.0); }   // rolled arms
    for (const sx of [-0.31, 0.31]) for (const sz of [-0.3, 0.3]) { put(CH.leg, walnut, sx, 0.045, sz); put(CH.cup, brass, sx, 0.008, sz); }
    contactShadow(group, x, Y0, z, 1.0, 1.0, 0.5, ry);
  };
  // seats: the agent on the wall side facing the room; two clients across the table
  const seats = (t) => [{ x: t.x, z: t.z - 0.78, yaw: 0 }, { x: t.x - 0.58, z: t.z + 0.66, yaw: Math.PI - 0.55 }, { x: t.x + 0.58, z: t.z + 0.66, yaw: Math.PI + 0.55 }];
  for (const t of [T1, T2]) {
    add(new THREE.CylinderGeometry(0.5, 0.49, 0.035, 64), top, t.x, Y0 + 0.722, t.z); add(new THREE.TorusGeometry(0.497, 0.008, 6, 64).rotateX(Math.PI / 2), brass, t.x, Y0 + 0.722, t.z);   // marble top, a brass edge
    add(new THREE.CylinderGeometry(0.05, 0.07, 0.66, 20), walnut, t.x, Y0 + 0.37, t.z); add(new THREE.CylinderGeometry(0.28, 0.32, 0.05, 40), walnut, t.x, Y0 + 0.025, t.z); add(new THREE.TorusGeometry(0.3, 0.01, 6, 40).rotateX(Math.PI / 2), brass, t.x, Y0 + 0.05, t.z);
    contactShadow(group, t.x, Y0, t.z, 1.1, 1.1, 0.4);
    for (const s of seats(t)) chair(s.x - Math.sin(s.yaw) * 0.08, s.z - Math.cos(s.yaw) * 0.08, s.yaw);
    for (const [dx, dz] of [[-0.24, 0.18], [0.26, 0.16]]) { add(new THREE.CylinderGeometry(0.04, 0.03, 0.07, 14), porcelain, t.x + dx, Y0 + 0.775, t.z + dz); add(new THREE.CylinderGeometry(0.035, 0.035, 0.005, 14), tea, t.x + dx, Y0 + 0.808, t.z + dz); add(new THREE.CylinderGeometry(0.07, 0.07, 0.01, 18), porcelain, t.x + dx, Y0 + 0.745, t.z + dz); }
  }
  // the tablet with the proposal on it (a bar chart of cover by age, the premium in a box), turned to the clients
  {
    const c = document.createElement('canvas'); c.width = 256; c.height = 180; const x = c.getContext('2d');
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 256, 180); x.fillStyle = '#c8102e'; x.fillRect(0, 0, 256, 22); x.fillStyle = '#fff'; x.font = 'bold 13px sans-serif'; x.fillText('保障计划建议书', 10, 16);
    x.fillStyle = '#d7dde3'; for (let i = 0; i < 8; i++) { const h = 30 + i * 12; x.fillRect(16 + i * 28, 160 - h, 18, h); }
    x.fillStyle = '#1b2a3a'; x.fillRect(150, 34, 96, 40); x.fillStyle = '#fff'; x.font = '11px sans-serif'; x.fillText('年交保费', 158, 50); x.fillText('重疾 · 医疗', 158, 66);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const tab = new THREE.Group(); tab.position.set(T1.x, Y0 + 0.745, T1.z + 0.05); tab.rotation.y = Math.PI; group.add(tab);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.008, 0.18), new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.3, metalness: 0.5 })); tab.add(body);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.235, 0.165), new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(1.1, 1.1, 1.1) })); scr.rotation.x = -Math.PI / 2; scr.position.y = 0.005; tab.add(scr);
    // papers and a brochure on the other table, and a pen
    const paper = new THREE.MeshStandardMaterial({ color: 0xf8f8f6, roughness: 0.8 });
    for (const [dx, dz, r] of [[-0.05, -0.05, 0.1], [0.06, 0.0, -0.2]]) add(new THREE.BoxGeometry(0.21, 0.003, 0.297), paper, T2.x + dx, Y0 + 0.743, T2.z + dz, r);
    add(new THREE.BoxGeometry(0.15, 0.004, 0.21), new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.5 }), T2.x - 0.18, Y0 + 0.745, T2.z - 0.18, 0.4);
    add(new THREE.CylinderGeometry(0.005, 0.005, 0.14, 6), new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.6, roughness: 0.3 }), T2.x + 0.12, Y0 + 0.748, T2.z + 0.05, 0).rotation.set(0, 0.6, Math.PI / 2);
  }

  // ---- the people: actors that can sit, stand, walk; scripts move them ----
  const P = {}, E = {};                  // the regulars; people an event brings in
  const ready = (p) => { p.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return p; };
  const actor = (name) => P[name] || E[name];
  function seated(id, role, t, i, dress) {
    if (!people) return null;
    const s = seats(t)[i], frame = new THREE.Group(); frame.position.set(s.x, Y0, s.z); frame.rotation.y = s.yaw; group.add(frame);
    const p = ready(createPerson(people, role)); frame.add(p.root); p.play('idle', 0); p.update(0); if (dress) dress(p);
    const pose = createSeatedPose(p, { recline: 0.08, elbows: 0.5 });
    const cabin = { hip: new THREE.Vector3(0, 0.55, -0.02), pedals: [new THREE.Vector3(-0.12, 0.06, 0.42), new THREE.Vector3(0.12, 0.06, 0.4)],
      rimPoint(a, out) { const w = new THREE.Vector3(-a * 0.17, 0.78, 0.42); frame.localToWorld(w); return out.copy(w); } };   // (a = -1 his left: local +x)
    const blob = contactShadow(group, s.x, Y0, s.z, 0.75, 0.75, 0.5); blob.visible = false;
    P[id] = { p, frame, pose, cabin, seat: s, mode: 'seated', x: s.x, z: s.z, yaw: s.yaw, at: [s.x, Y0 + 1.25, s.z], acc: Math.random() * 0.2, blob };
    return P[id];
  }
  function standing(id, role, x, z, yaw, dress, into = P) {
    if (!people) return null;
    const p = ready(createPerson(people, role)); p.root.position.set(x, Y0, z); p.root.rotation.y = yaw; group.add(p.root); p.play('idle', 0); p.update(0); if (dress) dress(p);
    into[id] = { p, mode: 'stand', x, z, yaw, at: [x, Y0 + 1.6, z], home: { x, z, yaw }, blob: contactShadow(group, x, Y0, z, 0.75, 0.75, 0.5) }; return into[id];
  }
  // dressed as they would be: the agents in suits (most of the agency force is women), the lanyard on; the young
  // couple in jeans and jackets; the retired couple in a cardigan and a long knitted coat, grey-haired; the HR
  // director in a leather jacket
  seated('zhou', 'c4', T1, 0, dressAgent); seated('wife', 'c1', T1, 1); seated('husband', 'p1', T1, 2);
  seated('shen', 'p5', T2, 0, dressAgent); seated('auntie', 'c3', T2, 1, greyHair); seated('uncle', 'c5', T2, 2, greyHair);
  standing('lin', 'p2', -37.4, -141.9, -Math.PI / 2 - 0.25, dressAgent); standing('wang', 'c8', -38.55, -141.75, Math.PI / 2 + 0.2);
  standing('chen', 'c7', -44.2, -147.5, 0, dressAgent);
  const phoneMat = new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: 0.3, metalness: 0.5 }), phone = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.15, 0.009), phoneMat); group.add(phone);
  const phone2 = phone.clone(); phone2.visible = false; group.add(phone2);                                   // a visitor's
  // the recorded sale's phone on its little stand, on the second table (out only while it's recording)
  const rig = new THREE.Group(); rig.position.set(T2.x + 0.05, Y0 + 0.74, T2.z - 0.2); rig.rotation.y = Math.PI + 0.2; rig.visible = false; group.add(rig);
  { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.16, 6), phoneMat); st.position.y = 0.08; rig.add(st); const ph = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.15, 0.009), phoneMat); ph.position.y = 0.2; ph.rotation.x = -0.15; rig.add(ph);
    const rec = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 0.2, 0.2) })); rec.position.set(0.028, 0.27, 0.006); rig.add(rec); }
  const bagMat = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.8 });
  // who speaks from where when they aren't one of the actors: the guard at the gates, the receptionist
  const SPOT = { guard: [-40.6, Y0 + 1.6, -141.9], desk: [-38.5, Y0 + 1.5, -139.35] };
  const DOOR = { x: AIA.x1 + 0.6, z: (AIA.door[0] + AIA.door[1]) / 2 };

  // ---- the regular talk: each group runs through its exchanges in turn while you're near it ----
  const GROUPS = {
    t1: { ids: ['zhou', 'wife', 'husband'], at: [T1.x, T1.z], i: 0 }, t2: { ids: ['shen', 'auntie', 'uncle'], at: [T2.x, T2.z], i: 0 },
    rec: { ids: ['lin', 'wang'], at: [-38, -141.8], i: 0 }, phone: { ids: ['chen'], at: [-44.2, -146.5], i: 0 },
  };
  const S = { active: false, playing: null, gap: 2, speaker: null, paceT: 0, clock: 0, evGap: 40 + Math.random() * 30, run: null, wasNear: false };
  const label = (l) => (l[5] === 'w' ? { zh: `${WHO[l[0]].zh}（小声）`, en: `${WHO[l[0]].en} (under the breath)` } : WHO[l[0]]);
  function bark(l) {
    const q = actor(l[0]);
    hud.bark({ speaker: label(l), text: { zh: l[1], en: l[2] }, lang: l[3] || 'zh', gloss: l[4] || null, seconds: est(l), who: `aia:${l[0]}`, at: q ? q.at : SPOT[l[0]] || null });
  }
  function startExchange(key) {
    const g = GROUPS[key], ex = AIA_TALK[key][g.i % AIA_TALK[key].length]; g.i++;
    S.playing = { key, lines: ex.slice(), t: 0 };
    nextLine();
  }
  function nextLine() {
    const pl = S.playing; if (!pl) return;
    const l = pl.lines.shift();
    if (!l) { S.playing = null; S.speaker = null; S.gap = 7 + Math.random() * 6; return; }
    S.speaker = l[0]; pl.t = est(l) + 0.5; bark(l);
  }

  // ---- the things that happen (world/aiaTalk.js AIA_EVENTS): scripts, one at a time ----
  // A script is an async function; its waits run on the game clock and end at once if you walk out (the
  // run is abandoned: everyone goes back to where they belong, the visitors vanish).
  const ABORT = new Error('aia-event-abandoned');
  const waiters = [];
  const until = (cond) => new Promise((res, rej) => { const run = S.run; waiters.push({ cond, res, rej, run }); });
  const wait = (s) => { const end = S.clock + s; return until(() => S.clock >= end); };
  const walk = (name, x, z, speed = 1.15) => { const q = actor(name); if (!q) return Promise.resolve(); q.walk = { x, z, speed }; return until(() => !q.walk); };
  const face = (name, x, z) => { const q = actor(name); if (q) q.yaw = Math.atan2(x - q.x, z - q.z); };
  const faceAt = (name, other) => { const o = actor(other) || (SPOT[other] && { x: SPOT[other][0], z: SPOT[other][2] }); if (o) face(name, o.x, o.z); };
  const clip = (name, c) => { const q = actor(name); if (q) q.clip = c; };
  async function say(l, gesture = true) {
    S.speaker = l[0]; const q = actor(l[0]); if (q && q.mode === 'stand' && gesture && !q.walk) q.talking = true;
    bark(l); await wait(est(l) + 0.35);
    if (q) q.talking = false; S.speaker = null;
  }
  const take = (name) => { const q = actor(name); if (q) { q.ctrl = true; S.run.ctrl.add(name); } return q; };
  function spawn(name, role, x, z, yaw, dress) { const q = standing(name, role, x, z, yaw, dress, E); if (q) { q.ctrl = true; S.run.spawned.push(name); } return q; }
  function despawn(name) { const q = E[name]; if (!q) return; group.remove(q.p.root); q.p.root.traverse((o) => { if (o.isSkinnedMesh) o.skeleton.dispose(); }); group.remove(q.blob); if (q.held) group.remove(q.held); delete E[name]; }
  // up from a chair to the right of it, and back down
  function standUp(name) {
    const q = take(name); if (!q || q.mode !== 'seated') return;
    const s = q.seat; q.frame.remove(q.p.root); group.add(q.p.root); q.mode = 'stand';
    q.x = s.x - Math.cos(s.yaw) * 0.62; q.z = s.z + Math.sin(s.yaw) * 0.62; q.yaw = s.yaw; q.blob.visible = true; q.p.play('idle', 0.2);
  }
  async function sitDown(name) {
    const q = actor(name); if (!q || !q.seat) return;
    const s = q.seat; await walk(name, s.x - Math.cos(s.yaw) * 0.62, s.z + Math.sin(s.yaw) * 0.62, 0.9);
    seatNow(q);
  }
  function seatNow(q) { if (q.mode === 'seated') return; group.remove(q.p.root); q.frame.add(q.p.root); q.p.root.position.set(0, 0, 0); q.p.root.rotation.set(0, 0, 0); q.mode = 'seated'; q.walk = null; q.blob.visible = false; q.x = q.seat.x; q.z = q.seat.z; q.yaw = q.seat.yaw; }
  function settle(run) {                                                       // the end of a run, finished or not
    for (const n of run.spawned) despawn(n);
    for (const n of run.ctrl) { const q = P[n]; if (!q) continue; q.ctrl = false; q.walk = null; q.clip = null; q.talking = false; if (q.seat) seatNow(q); else if (q.home) { q.x = q.home.x; q.z = q.home.z; q.yaw = q.home.yaw; } }
    rig.visible = false; phone2.visible = false; S.speaker = null;
  }

  const SCRIPTS = {
    async complaint(V) {
      spawn('angry', 'c6', DOOR.x, DOOR.z, -Math.PI / 2);
      await walk('angry', -39.7, -141.6, 1.55); faceAt('angry', 'desk'); clip('angry', 'angry');
      await say(V[0]); await say(V[1]); await say(V[2]);
      faceAt('angry', 'guard'); await say(V[3]);
      take('lin'); faceAt('lin', 'wang'); await say(V[4]);
      await walk('lin', -39.0, -142.5, 1.1); faceAt('lin', 'angry'); faceAt('angry', 'lin');
      await say(V[5]); await say(V[6]); clip('angry', null); await say(V[7]);
      // through the gates to a meeting room; she sees him in, and comes back
      await walk('angry', -40.6, -146.1, 1.0); walk('angry', -42.6, -146.1, 1.0); await walk('lin', -40.9, -145.6, 1.0);   // (he goes through a gate lane; she stops at the gates)
      await walk('angry', -46.0, -149.5, 1.0); despawn('angry'); S.run.spawned = S.run.spawned.filter((n) => n !== 'angry');
      await wait(2); await walk('lin', P.lin.home.x, P.lin.home.z, 1.0);
    },
    async celebrate(V) {
      await say(V[0]); await say(V[1]); await wait(2.5); await say(V[2]);
      standUp('zhou'); clip('zhou', 'wave'); await say(V[3]); clip('zhou', null); await say(V[4]);
      take('chen'); await walk('chen', -42.4, -147.3, 1.2); await walk('chen', -40.7, -147.3, 1.2); await walk('chen', -40.7, -148.9, 1.0); faceAt('chen', 'zhou'); faceAt('zhou', 'chen');   // (through a gate lane)
      await say(V[5]); clip('zhou', 'shrug'); await say(V[6]); clip('zhou', null);
      (async () => { await walk('chen', -40.7, -147.3, 1.1); await walk('chen', -42.4, -147.3, 1.1); await walk('chen', -44.2, -147.5, 1.1); })(); await sitDown('zhou'); await until(() => !P.chen.walk && Math.abs(P.chen.x + 44.2) < 0.1);
    },
    async rebate(V) {
      await say(V[0]); await wait(0.8);
      standUp('zhou'); await say(V[1]); standUp('husband');
      // out by the door, away from the tables and the camera over reception
      walk('husband', -35.9, -148.9, 1.0); await walk('zhou', -36.1, -148.1, 1.15); faceAt('zhou', 'husband'); faceAt('husband', 'zhou');
      await say(V[2]); await say(V[3]); await say(V[4]); await say(V[5]);
      sitDown('husband'); await sitDown('zhou'); await until(() => P.husband.mode === 'seated');
    },
    async recording(V) {
      rig.visible = true; await wait(1.5);
      await say(V[0]); await say(V[1]); await say(V[2]); await wait(1.2); await say(V[3]); await say(V[4]); await say(V[5]);
      await wait(2);
    },
    async tourist(V) {
      const q = spawn('tourist', 'c2', DOOR.x, DOOR.z, -Math.PI / 2);
      await walk('tourist', -37.2, -145.2, 0.9); face('tourist', -38.1, -145.6);
      if (q) { q.phoneUp = true; phone2.visible = true; } clip('tourist', 'phone');
      await say(V[0]); await say(V[1]); faceAt('tourist', 'guard'); await say(V[2]); await say(V[3]);
      if (q) q.phoneUp = false; phone2.visible = false; clip('tourist', null); await say(V[4]);
      await walk('tourist', DOOR.x + 1.5, DOOR.z, 1.1);
    },
    async delivery(V) {
      const q = spawn('rider', 'p3', DOOR.x, DOOR.z + 0.4, -Math.PI / 2, (p) => dressRider(p, ['yellow', 'wanji', 'jingsong'][Math.floor(Math.random() * 3)]));
      if (q) { q.held = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.22), bagMat); group.add(q.held); }
      await walk('rider', -40.0, -143.4, 1.9); faceAt('rider', 'guard');
      await say(V[0]); await say(V[1]); await say(V[2]);
      await walk('rider', DOOR.x + 1.5, DOOR.z + 0.4, 2.2);
    },
    async recruit(V) {
      const q = spawn('recruit', 'p3', -36.3, -141.6, Math.PI / 2 + 0.6);
      if (q) { q.phoneUp = true; phone2.visible = true; } clip('recruit', 'phone');
      await wait(3); take('chen');
      await walk('chen', -42.0, -144.9, 1.1); await walk('chen', -37.2, -142.3, 1.1); faceAt('chen', 'recruit');
      if (q) q.phoneUp = false; phone2.visible = false; clip('recruit', null); faceAt('recruit', 'chen');
      await say(V[0]); await say(V[1]); await say(V[2]); await say(V[3]); await say(V[4]);
      walk('recruit', DOOR.x + 1.5, DOOR.z - 0.3, 1.1); await walk('chen', -42.0, -144.9, 1.1); await walk('chen', -44.2, -147.5, 1.1);
      await until(() => !E.recruit || !E.recruit.walk);
    },
  };
  // the deck: each event once a day, in a shuffled order, the variants taking turns (kept in the save)
  function deck() {
    const L = getLife ? getLife() : null, f = L ? (L.flags.aiaEvents ||= {}) : (S.deck ||= {});
    const day = L ? L.clock.day : 0;
    if (f.day !== day) { f.day = day; f.done = []; }
    f.variant ||= {};
    if (!f.order || !f.order.length) { f.order = Object.keys(SCRIPTS).sort(() => Math.random() - 0.5); if (f.last && f.order[0] === f.last) f.order.push(f.order.shift()); }
    const i = f.order.findIndex((id) => !f.done.includes(id));
    if (i < 0) return null;
    const id = f.order.splice(i, 1)[0], vs = AIA_EVENTS[id], v = (f.variant[id] || 0) % vs.length;
    f.variant[id] = v + 1; f.done.push(id); f.last = id;
    return { id, V: vs[v] };
  }
  function startEvent() {
    const pick = deck(); if (!pick) return;
    const run = S.run = { id: pick.id, spawned: [], ctrl: new Set() };
    S.playing = null; S.speaker = null;
    SCRIPTS[pick.id](pick.V).catch((e) => { if (e !== ABORT) console.warn('aia event:', e); }).finally(() => { if (S.run === run) { settle(run); S.run = null; S.evGap = 100 + Math.random() * 90; S.gap = 6; } });
  }
  function abandon() {
    const run = S.run; if (!run) return;
    S.run = null; settle(run);
    for (let i = waiters.length - 1; i >= 0; i--) if (waiters[i].run === run) { const w = waiters.splice(i, 1)[0]; w.rej(ABORT); }
  }

  return {
    group,
    get state() { return { active: S.active, playing: S.playing && S.playing.key, speaker: S.speaker, event: S.run && S.run.id, next: Math.round(S.evGap) }; },
    // for tools: start an event now
    trigger(id) { if (S.run || !SCRIPTS[id]) return false; const f = getLife ? (getLife().flags.aiaEvents ||= {}) : (S.deck ||= {}); f.order = [id, ...(f.order || []).filter((x) => x !== id)]; f.done = (f.done || []).filter((x) => x !== id); startEvent(); return true; },
    update(dt, pp, minute = 720) {
      const near = pp && pp.x > -48 && pp.x < -30 && pp.z > -153 && pp.z < -138;
      const open = minute >= AIA_HOURS[0] && minute < AIA_HOURS[1];
      group.visible = open;
      if (!open || !near) { if (S.run) abandon(); S.active = false; S.playing = null; S.speaker = null; S.wasNear = false; return; }
      if (!S.wasNear) { S.wasNear = true; S.evGap = Math.max(S.evGap, 35 + Math.random() * 35); }
      S.active = true; S.clock += dt;
      for (let i = waiters.length - 1; i >= 0; i--) if (waiters[i].cond()) { const w = waiters.splice(i, 1)[0]; w.res(); }
      // an event now and then; otherwise the regular talk (the group nearest you, within 5 m, has the floor)
      if (!S.run && !S.playing && (S.evGap -= dt) <= 0) startEvent();
      if (!S.run) {
        if (S.playing) { S.playing.t -= dt; if (S.playing.t <= 0) nextLine(); }
        else if ((S.gap -= dt) <= 0) {
          let best = null, bd = 5;
          for (const [k, g] of Object.entries(GROUPS)) { const d = Math.hypot(pp.x - g.at[0], pp.z - g.at[1]); if (d < bd) { bd = d; best = k; } }
          if (best) startExchange(best); else S.gap = 1;
        }
      }
      // the bodies
      for (const [id, q] of [...Object.entries(P), ...Object.entries(E)]) {
        const g = Object.values(GROUPS).find((G) => G.ids.includes(id)), speaking = S.speaker === id;
        const talker = S.speaker && S.speaker !== id ? actor(S.speaker) || (SPOT[S.speaker] && { at: SPOT[S.speaker] }) : null;
        const partner = g && g.ids.find((o) => o !== id);
        const lookAt = speaking ? (partner && P[partner]) : (talker && (!g || g.ids.includes(S.speaker) || S.run) ? talker : null);
        const look = lookAt && lookAt !== q ? [lookAt.at[0], lookAt.at[2]] : (Math.hypot(pp.x - q.at[0], pp.z - q.at[2]) < 3 ? [pp.x, pp.z] : null);
        if (q.mode === 'seated') {
          q.acc += dt; if (q.acc < 0.12) continue;
          const step = q.acc; q.acc = 0;
          q.p.root.position.set(0, 0, 0); q.p.update(step, look);
          q.frame.updateMatrixWorld(true); q.pose(q.cabin, q.frame);
          continue;
        }
        if (id === 'chen' && !q.ctrl) {
          // pacing a few steps up and down beyond the gates, phone to his ear
          S.paceT += dt; const z = -147.5 + Math.sin(S.paceT * 0.35) * 1.6, dz = Math.cos(S.paceT * 0.35);
          q.x = -44.2; q.z = z; q.yaw = dz > 0 ? 0 : Math.PI;
          q.p.play(Math.abs(dz) > 0.25 ? 'walk' : 'phone', 0.4); q.p.setGait(0.55); q.p.setPhoneHold(1);
        } else if (q.walk) {
          const dx = q.walk.x - q.x, dz = q.walk.z - q.z, d = Math.hypot(dx, dz);
          if (d < 0.08) { q.walk = null; q.p.play(q.clip || 'idle', 0.3); }
          else { const k = Math.min(1, (q.walk.speed * dt) / d); q.x += dx * k; q.z += dz * k; q.yaw = Math.atan2(dx, dz); q.p.play(q.walk.speed > 1.7 ? 'jog' : 'walk', 0.25); q.p.setGait(q.walk.speed); }
          if (id === 'chen') q.p.setPhoneHold(0);
        } else {
          q.p.play(q.clip || (q.talking || (speaking && !S.run) ? (id === 'lin' ? 'talk1' : 'talk2') : 'idle'), 0.4);
          if (id === 'chen') q.p.setPhoneHold(0);
        }
        q.p.root.position.set(q.x, Y0, q.z); q.p.root.rotation.y = q.yaw; q.at[0] = q.x; q.at[2] = q.z;
        q.p.update(dt, q.walk ? null : look);
        if (q.blob) q.blob.position.set(q.x, Y0 + 0.012, q.z);
        if (id === 'chen' && !q.ctrl) holdPhone(phone, q.p, q.yaw); else if (id === 'chen') phone.visible = false;
        if (id === 'chen') phone.visible = !q.ctrl;
        if (q.phoneUp) holdPhone(phone2, q.p, q.yaw);
        if (q.held) { q.p.bones.R.getWorldPosition(q.held.position); q.held.position.y -= 0.2; q.held.rotation.y = q.yaw; }
      }
    },
  };
}
