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
// The agents wear their own business clothes and the red company lanyard with a staff card. Lines in Mandarin are
// voiced (tools/voice); Shanghainese is subtitled (with a Mandarin gloss for Chinese readers), as elsewhere.
// Product names are generic: no real policy is named. Sources: docs/living-city-buildings.md (No.17).
import * as THREE from 'three';
import { L, colliders } from './layout.js';
import { createPerson } from './people.js';
import { createSeatedPose } from './driverPose.js';
import { dressAgent, greyHair } from './outfits.js';
import { holdPhone } from './pedestriansReal.js';
import { WHO, AIA_TALK } from './aiaTalk.js';
export { AIA_TALK };

const Y0 = L.curbH;
export const AIA_HOURS = [9 * 60, 19 * 60];
const T1 = { x: -39.5, z: -150.45 }, T2 = { x: -36.6, z: -150.45 };

const est = (l) => Math.max(2.4, (l[1] || '').length * (l[3] === 'wuu' ? 0.2 : 0.27) + 0.8);   // (the recorded lines run about a quarter second a character)

// the consultation corner's tables and chairs, on the floor plan
for (const t of [T1, T2]) colliders.push({ minX: t.x - 1.1, maxX: t.x + 1.1, minZ: t.z - 1.0, maxZ: t.z + 1.05, tag: 'desk', y0: 0, y1: 8 });

export function createAiaLife({ scene, people, hud }) {
  const group = new THREE.Group(); group.name = 'aia-life'; scene.add(group);
  // ---- the furniture: walnut tables with marble tops, club chairs in grey-blue leather; a tablet, papers, tea ----
  const walnut = new THREE.MeshStandardMaterial({ color: 0x3b2618, roughness: 0.45 }), top = new THREE.MeshStandardMaterial({ color: 0xf1ede5, roughness: 0.25 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x3a4652, roughness: 0.5 }), brass = new THREE.MeshStandardMaterial({ color: 0xc89b4a, roughness: 0.4, metalness: 1 });
  const porcelain = new THREE.MeshStandardMaterial({ color: 0xf6f4ef, roughness: 0.25 }), tea = new THREE.MeshStandardMaterial({ color: 0x8a5a22, roughness: 0.1 });
  const add = (geo, mat, x, y, z, ry = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; group.add(m); return m; };
  const chair = (x, z, ry) => {
    const g = new THREE.Group(); g.position.set(x, Y0, z); g.rotation.y = ry; group.add(g);
    const p = (w, h, d, px, py, pz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), leather); m.position.set(px, py + h / 2, pz); m.castShadow = true; g.add(m); };
    p(0.6, 0.42, 0.58, 0, 0, 0.02); p(0.6, 0.45, 0.14, 0, 0.36, -0.24); p(0.12, 0.22, 0.56, -0.3, 0.38, 0.02); p(0.12, 0.22, 0.56, 0.3, 0.38, 0.02);
    for (const sx of [-0.25, 0.25]) for (const sz of [-0.22, 0.24]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.015, 0.08, 6), brass); l.position.set(sx, 0.04, sz); g.add(l); }
  };
  // seats: the agent on the wall side facing the room; two clients across the table
  const seats = (t) => [{ x: t.x, z: t.z - 0.78, yaw: 0 }, { x: t.x - 0.58, z: t.z + 0.66, yaw: Math.PI - 0.55 }, { x: t.x + 0.58, z: t.z + 0.66, yaw: Math.PI + 0.55 }];
  for (const t of [T1, T2]) {
    add(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 32), top, t.x, Y0 + 0.72, t.z); add(new THREE.CylinderGeometry(0.06, 0.06, 0.68, 12), walnut, t.x, Y0 + 0.36, t.z); add(new THREE.CylinderGeometry(0.3, 0.32, 0.04, 24), walnut, t.x, Y0 + 0.02, t.z);
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

  // ---- the people ----
  const P = {};
  const ready = (p) => { p.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return p; };
  function seated(id, role, t, i, dress) {
    if (!people) return null;
    const s = seats(t)[i], frame = new THREE.Group(); frame.position.set(s.x, Y0, s.z); frame.rotation.y = s.yaw; group.add(frame);
    const p = ready(createPerson(people, role)); frame.add(p.root); p.play('idle', 0); p.update(0); if (dress) dress(p);
    const pose = createSeatedPose(p, { recline: 0.08, elbows: 0.5 });
    const cabin = { hip: new THREE.Vector3(0, 0.5, -0.04), pedals: [new THREE.Vector3(-0.12, 0.06, 0.42), new THREE.Vector3(0.12, 0.06, 0.4)],
      rimPoint(a, out) { const w = new THREE.Vector3(-a * 0.17, 0.78, 0.42); frame.localToWorld(w); return out.copy(w); } };   // (a = -1 his left: local +x)
    P[id] = { p, frame, pose, cabin, seated: true, at: [s.x, Y0 + 1.25, s.z], acc: Math.random() * 0.2 };
    return P[id];
  }
  function standing(id, role, x, z, yaw, dress) {
    if (!people) return null;
    const p = ready(createPerson(people, role)); p.root.position.set(x, Y0, z); p.root.rotation.y = yaw; group.add(p.root); p.play('idle', 0); p.update(0); if (dress) dress(p);
    P[id] = { p, at: [x, Y0 + 1.6, z], home: { x, z, yaw } }; return P[id];
  }
  // dressed as they would be: the agents in suits (most of the agency force is women), the lanyard on; the young
  // couple in jeans and jackets; the retired couple in a cardigan and a long knitted coat, grey-haired; the HR
  // director in a leather jacket
  seated('zhou', 'c4', T1, 0, dressAgent); seated('wife', 'c1', T1, 1); seated('husband', 'p1', T1, 2);
  seated('shen', 'p5', T2, 0, dressAgent); seated('auntie', 'c3', T2, 1, greyHair); seated('uncle', 'c5', T2, 2, greyHair);
  standing('lin', 'p2', -37.4, -141.9, -Math.PI / 2 - 0.25, dressAgent); standing('wang', 'c8', -38.55, -141.75, Math.PI / 2 + 0.2);
  standing('chen', 'c7', -44.2, -147.5, 0, dressAgent);
  const phone = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.15, 0.009), new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: 0.3, metalness: 0.5 })); group.add(phone);

  // ---- the talk: each group runs through its exchanges in turn while you're near it ----
  const GROUPS = {
    t1: { ids: ['zhou', 'wife', 'husband'], at: [T1.x, T1.z], i: 0 }, t2: { ids: ['shen', 'auntie', 'uncle'], at: [T2.x, T2.z], i: 0 },
    rec: { ids: ['lin', 'wang'], at: [-38, -141.8], i: 0 }, phone: { ids: ['chen'], at: [-44.2, -146.5], i: 0 },
  };
  const S = { active: false, playing: null, gap: 2, speaker: null, paceT: 0 };
  function startExchange(key) {
    const g = GROUPS[key], ex = AIA_TALK[key][g.i % AIA_TALK[key].length]; g.i++;
    S.playing = { key, lines: ex.slice(), t: 0 };
    nextLine();
  }
  function nextLine() {
    const pl = S.playing; if (!pl) return;
    const l = pl.lines.shift();
    if (!l) { S.playing = null; S.speaker = null; S.gap = 7 + Math.random() * 6; return; }
    const [who, zh, en, lang, gloss] = l, q = P[who];
    S.speaker = who; pl.t = est(l) + 0.5;
    hud.bark({ speaker: WHO[who], text: { zh, en }, lang: lang || 'zh', gloss: gloss || null, seconds: est(l), who: `aia:${who}`, at: q ? q.at : null });
  }
  return {
    group,
    get state() { return { active: S.active, playing: S.playing && S.playing.key, speaker: S.speaker }; },
    update(dt, pp, minute = 720) {
      const near = pp && pp.x > -48 && pp.x < -30 && pp.z > -153 && pp.z < -138;
      const open = minute >= AIA_HOURS[0] && minute < AIA_HOURS[1];
      group.visible = open;
      if (!open || !near) { S.active = false; S.playing = null; S.speaker = null; return; }
      S.active = true;
      // the talk: the group nearest you (within 5 m) has the floor
      if (S.playing) { S.playing.t -= dt; if (S.playing.t <= 0) nextLine(); }
      else if ((S.gap -= dt) <= 0) {
        let best = null, bd = 5;
        for (const [k, g] of Object.entries(GROUPS)) { const d = Math.hypot(pp.x - g.at[0], pp.z - g.at[1]); if (d < bd) { bd = d; best = k; } }
        if (best) startExchange(best); else S.gap = 1;
      }
      // the bodies: who's speaking gestures (standing) and is looked at; seated people are posed at a lower rate
      for (const [id, q] of Object.entries(P)) {
        const g = Object.values(GROUPS).find((G) => G.ids.includes(id)), speaking = S.speaker === id;
        const talker = S.speaker && g.ids.includes(S.speaker) ? P[S.speaker] : null;
        const lookAt = speaking ? (g.ids.find((o) => o !== id) && P[g.ids.find((o) => o !== id)]) : talker;
        const look = lookAt && lookAt !== q ? [lookAt.at[0], lookAt.at[2]] : (Math.hypot(pp.x - q.at[0], pp.z - q.at[2]) < 3 ? [pp.x, pp.z] : null);
        if (q.seated) {
          q.acc += dt; if (q.acc < 0.12) continue;
          const step = q.acc; q.acc = 0;
          q.p.root.position.set(0, 0, 0); q.p.update(step, look);
          q.frame.updateMatrixWorld(true); q.pose(q.cabin, q.frame);
        } else if (id === 'chen') {
          // pacing a few steps up and down beyond the gates, phone to his ear
          S.paceT += dt; const z = -147.5 + Math.sin(S.paceT * 0.35) * 1.6, dz = Math.cos(S.paceT * 0.35);
          q.p.root.position.set(-44.2, Y0, z); q.p.root.rotation.y = dz > 0 ? 0 : Math.PI; q.at[2] = z;
          q.p.play(Math.abs(dz) > 0.25 ? 'walk' : 'phone', 0.4); q.p.setGait(0.55); q.p.setPhoneHold(1); q.p.update(dt, null); holdPhone(phone, q.p, q.p.root.rotation.y);
        } else {
          q.p.play(speaking ? (id === 'lin' ? 'talk1' : 'talk2') : 'idle', 0.4);
          q.p.update(dt, look);
        }
      }
    },
  };
}
