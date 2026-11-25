// The five people Ji Bai might come to love, in the street (world/romance.js says who is where and
// what's said; engine/hearts.js keeps the score). Each is where her own day puts her:
//   Nanxing   at the railing at night with a tripod, north of Nanjing Road; opposite the Customs
//             House clock for the lights at ten
//   Gu Nian   in the AIA Building lobby after office hours, trying out a start-up's camera; by the
//             Manner window on Hankou Road at one; at the cruise pier
//   Kexin     filming in the Peace Hotel Jazz Bar on its busy nights; outside the shengjian shop
//   Zhiwei    in the Peace Hotel lobby the first night; by the river after a late one at the office
//   Yu'an     under the octagon's glass in June; at the river off Nanjing Road
//   and any of them across the Jazz Bar's table by the stage, on an evening he's said yes to
// E: a first meeting, or the date itself, as a conversation (1-4 to answer; a seated one at the Jazz
// Bar's table). T: talk in your own words (they are told only what has really happened). Walk off
// in the middle of it and it's over for the evening, and noticed.
// At most two of them exist at once, made only when you're near where one of them is; nothing runs
// per frame when nobody is near. They are Microsoft Rocketbox adults, the same set the crowd is
// cast from (no other avatars exist): each has her own, but you will see those faces in the street.
import * as THREE from 'three';
import '../ui/romance.css';
import { createPerson } from './people.js';
import { createSeatedPose } from './driverPose.js';
import { groundHeight, addDynamicCollider, L as LAY } from './layout.js';
import { getLang } from '../ui/i18n.js';
import { stamp, skipTo, clockText } from '../engine/life.js';
import { slept } from '../engine/allot.js';
import { ROMANCE, heart } from '../engine/hearts.js';
import { CAST, ROMANCE_SCENES, ROMANCE_NAMES, presence, sceneScript, startScene, endScene, leftScene, takeNews, datesAhead, romanceStanding } from './romance.js';

const T = (zh, en) => (getLang() === 'zh' ? zh : en);
const P = (b) => (b ? (getLang() === 'zh' ? b.zh : b.en) : '');
const B = (zh, en) => ({ zh, en });
const Y0 = LAY.curbH;
// Where they can be. Re-point these as places are built (x, z; face: what they're turned toward;
// deck: on the promenade deck; null: not somewhere you can walk to yet, so she's reachable by phone only).
export const SPOTS = {
  railNorth: { x: 24.3, z: -108, face: [640, -42], deck: true, name: B('外滩 · 北段的栏杆', 'The Bund · the railing, north end') },
  railCustoms: { x: 24.3, z: 30.5, face: [640, -42], deck: true, name: B('外滩 · 海关大楼对面的栏杆', 'The Bund · the railing opposite the Customs House') },
  railPeace: { x: 24.3, z: -196, face: [640, -42], deck: true, name: B('外滩 · 南京路口的栏杆', 'The Bund · the railing by Nanjing Road') },
  pier: { x: 23.4, z: 63.6, face: [30, 65], deck: true, name: B('外滩 · 游船码头', 'The Bund · the cruise pier') },
  peaceLobby: { x: -52.8, z: -216.6, face: [-48, -213], name: B('和平饭店 · 大堂', 'Peace Hotel · the lobby') },
  peaceHall: { x: -48.6, z: -228.2, face: [-48, -240], name: B('和平饭店 · 八角厅', 'Peace Hotel · the octagon hall') },
  aiaLobby: { x: -38.6, z: -150.2, face: [-37, -146], name: B('友邦大楼 · 大堂', 'AIA Building · the lobby') },
  manner: { x: -74.1, z: -5.2, face: [-74, 0], name: B('汉口路 · Linger 窗口', 'Hankou Road · the Linger window') },
  shengjian: { x: -142.4, z: -191.8, face: [-145, -197], name: B('南京东路 · 生煎店门口', 'Nanjing Road East · outside the shengjian shop') },
  jazzFloor: { x: -39.3, z: -218.0, face: [-38, -221], name: B('和平饭店 · 爵士吧', 'Peace Hotel · the Jazz Bar') },
  jazzTable: { x: -40.58, z: -220.0, yaw: -Math.PI / 2, seat: true, name: B('和平饭店 · 爵士吧', 'Peace Hotel · the Jazz Bar') },   // the chair across the table by the stage
  office: null,       // the firm's floor in Lujiazui (being built elsewhere)
  lujiazui: null,     // the Lujiazui district (being built elsewhere)
};
const MORNING = { x: -48, z: -241.6, yaw: Math.PI };            // where the lift leaves you in the lobby
const NEAR = 70, FAR = 95, LINGER = 26, MAX = 2;

export function createRomanceScenes({ scene, people, player, hud, audio = null, sceneTalk, travel, jazz = null, dinner = null, getLife, save, isFree = () => true, enabled = true }) {
  const L0 = () => getLife();
  const actors = {};                                             // who -> { who, p, spot, x, y, z, h, box, frame, pose, props }
  const S = { check: 0, cur: null, hello: {}, toasts: [], toastIn: 0, reminded: {}, fadeAt: 0 };
  sceneTalk.addNames(ROMANCE_NAMES);
  const role = (list) => (people ? list.find((r) => people.manifest.cast[r]) : null);
  const spotY = (sp) => (sp.seat ? Y0 : groundHeight(sp.x, sp.z, sp.deck ? 9 : 1));
  const mat = (c, r = 0.6, m = 0.2) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });

  // ---- small things they have with them ----
  function tripod(a) {
    const g = new THREE.Group(), dark = mat(0x1b1b1d, 0.5, 0.6);
    for (let i = 0; i < 3; i++) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 1.42, 6), dark); const an = (i / 3) * Math.PI * 2 + 0.5; leg.position.set(Math.cos(an) * 0.2, 0.69, Math.sin(an) * 0.2); leg.rotation.z = Math.cos(an) * 0.28; leg.rotation.x = -Math.sin(an) * 0.28; g.add(leg); }
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.08), mat(0x111113, 0.6, 0.3)); body.position.y = 1.44; g.add(body);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.1, 12), mat(0x08080a, 0.3, 0.7)); lens.rotation.z = Math.PI / 2; lens.position.set(0.11, 1.44, 0); g.add(lens);
    g.position.set(a.x + 0.95, a.y, a.z + 0.55); g.rotation.y = -0.2; g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return g;
  }
  function suitcase(a) {   // (Lin Yu'an's survey-instrument case in the octagon hall)
    const g = new THREE.Group(), shell = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.62, 0.26), mat(0x2f4a5c, 0.55, 0.1)); shell.position.y = 0.36; g.add(shell);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.34, 0.02), mat(0x777a80, 0.4, 0.8)); handle.position.set(0, 0.84, -0.1); g.add(handle);
    g.position.set(a.x + 0.55, a.y, a.z + 0.2); g.rotation.y = 0.5; g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return g;
  }
  const PROPS = { 'nanxing:railNorth': tripod, 'yuan:peaceHall': suitcase };

  // ---- the people ----
  function make(who, spotId) {
    const sp = SPOTS[spotId], r = role(CAST[who].avatar); if (!sp || !r) return null;
    const p = createPerson(people, r);
    p.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    // her own height where the Character Bible locks one (Zhiwei 1.78 m) and the body is a shared stand-in;
    // standing only, so seated poses keep the hip height they were fitted to
    if (CAST[who].height && !sp.seat) { const b = new THREE.Box3().setFromObject(p.root), h = b.max.y - b.min.y; if (h > 1.2 && h < 2.2) p.root.scale.multiplyScalar(CAST[who].height / h); }
    const a = { who, p, spot: spotId, seat: !!sp.seat, x: sp.x, z: sp.z, y: spotY(sp), t: Math.random() * 10, props: [] };
    if (sp.seat) {
      a.frame = new THREE.Group(); a.frame.position.set(sp.x, a.y, sp.z); a.frame.rotation.y = sp.yaw; scene.add(a.frame);
      a.frame.add(p.root); p.play('idle', 0); p.update(0); a.pose = createSeatedPose(p, { recline: 0.06, elbows: 0.5 });
      a.cabin = { hip: new THREE.Vector3(0, 0.47, 0), pedals: [new THREE.Vector3(-0.13, 0.05, 0.42), new THREE.Vector3(0.14, 0.05, 0.46)], rimPoint(k, out) { return out.copy(a.frame.localToWorld(new THREE.Vector3(k * 0.2, 0.79, 0.34))); } };
    } else {
      a.h = Math.atan2(sp.face[0] - sp.x, sp.face[1] - sp.z);
      scene.add(p.root); p.root.position.set(a.x, a.y, a.z); p.root.rotation.y = a.h; p.play('idle', 0); p.update(0);
      a.box = addDynamicCollider('npc'); Object.assign(a.box, { minX: a.x - 0.24, maxX: a.x + 0.24, minZ: a.z - 0.24, maxZ: a.z + 0.24, y0: a.y - 0.5, y1: a.y + 1.9, id: `heart:${who}` });
      const prop = PROPS[`${who}:${spotId}`]; if (prop) { const g = prop(a); scene.add(g); a.props.push(g); }
    }
    return a;
  }
  function drop(who) {
    const a = actors[who]; if (!a) return;
    if (a.frame) scene.remove(a.frame); else scene.remove(a.p.root);
    for (const g of a.props) { scene.remove(g); g.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); }
    a.p.root.traverse((o) => { if (o.isSkinnedMesh) o.skeleton.dispose(); });
    if (a.box) a.box.minX = a.box.maxX = a.box.minZ = a.box.maxZ = 1e6;
    delete actors[who];
  }
  const headOf = (a) => { const v = new THREE.Vector3(); if (a.p.bones.head) a.p.bones.head.getWorldPosition(v); else v.set(a.x, a.y + 1.6, a.z); return v; };
  const nameOf = (who) => P(heart(L0(), who).stage === 'stranger' ? null : CAST[who].short);

  // ---- a scene: lines and answers through ui/sceneTalk.js, with fades where the script has them ----
  function begin(a, id) {
    const l = L0(), sc = ROMANCE_SCENES[id];
    startScene(l, id);
    const chunks = [[]];
    for (const b of sceneScript(l, id)) { if (b && b.fade) chunks.push(b, []); else chunks[chunks.length - 1].push(b); }
    S.cur = { who: a.who, id, seat: !!sc.seat, chunks: chunks.filter((c) => c.fade || c.length), t: 0 };
    if (sc.seat && jazz) jazz.sit();
    save && save(); next();
  }
  function next() {
    const c = S.cur; if (!c) return;
    const part = c.chunks.shift();
    if (!part) { finish(); return; }
    if (part.fade) {
      const mins = part.minutes || 0;
      c.fading = true;
      travel(async () => { const l = L0(); skipTo(l, stamp(l) + mins); save && save(); setTimeout(() => { if (S.cur === c) { c.fading = false; next(); } }, 2600); }, { line: P(part.fade), down: 700, hold: 1900, up: 800 });
      return;
    }
    const a = actors[c.who];
    sceneTalk.play(part, { at: () => (a ? headOf(a).toArray() : null), onDone: () => { if (S.cur === c) next(); } });
  }
  function finish() {
    const c = S.cur, l = L0(); S.cur = null;
    const r = endScene(l, c.id);
    audio && audio.cue && audio.cue('chime', 0, 0.3);
    save && save();
    if (r.cut) {                                                           // the evening ends upstairs: cut away to the morning
      if (c.seat && jazz && jazz.seated) jazz.stand();
      travel(async () => { slept(l, 7); skipTo(l, r.cut.until); drop(c.who); player.teleport(MORNING.x, MORNING.z, MORNING.yaw, 0.02); if (player.stamina) { player.stamina.energy = 1; player.stamina.winded = 0; } save && save(); },
        { line: `${P(r.cut.line)}`, down: 900, hold: 3600, up: 900 });
    } else if (c.seat) hud.toast(T('E 起身', 'E to stand up'), 3);
  }
  function abandon() {
    const c = S.cur; if (!c) return;
    S.cur = null; sceneTalk.stop(); leftScene(L0(), c.id); save && save();
    hud.toast(T('你走开了。她没有叫住你。', "You walk away. She doesn't call after you."), 4);
  }

  // ---- who should be here now ----
  function sweep(pp) {
    const l = L0(), wants = [];
    for (const who of ROMANCE) {
      const pr = presence(l, who), sp = pr && SPOTS[pr.spot];
      if (!sp) continue;
      if (sp.seat && dinner && dinner.here) continue;                    // that chair is his father's tonight
      const d = Math.hypot(pp.x - sp.x, pp.z - sp.z), level = Math.abs(pp.y - spotY(sp)) < 6;
      wants.push({ who, pr, d: level ? d : 1e6 });
    }
    wants.sort((a, b) => a.d - b.d);
    const keep = new Set();
    for (const w of wants.slice(0, MAX)) {
      const a = actors[w.who];
      if (a && a.spot === w.pr.spot) { keep.add(w.who); a.scene = w.pr.scene; a.free = w.pr.free; continue; }
      if (a || w.d > NEAR || Object.keys(actors).length >= MAX) continue;  // (elsewhere a moment ago: she's still there until you've left)
      const made = make(w.who, w.pr.spot); if (made) { actors[w.who] = made; made.scene = w.pr.scene; made.free = w.pr.free; keep.add(w.who); }
    }
    for (const who of Object.keys(actors)) {
      const a = actors[who]; if (S.cur && S.cur.who === who) continue;
      const d = Math.hypot(pp.x - a.x, pp.z - a.z);
      if (keep.has(who)) { if (d > FAR) drop(who); continue; }
      a.scene = null;                                                     // her reason to be here has passed: she stays while you're by her
      if (d > LINGER || Math.abs(pp.y - a.y) > 6) drop(who);
    }
    // someone is waiting for him: say so once, when it's time
    for (const d of datesAhead(l)) {
      if (S.reminded[d.id] || stamp(l) < d.at - 20 || !SPOTS[d.spot]) continue;
      S.reminded[d.id] = true;
      S.toasts.push(T(`${CAST[d.who].short.zh}在等你 · ${SPOTS[d.spot].name.zh} · ${clockText(d.at)}`, `${CAST[d.who].short.en} is waiting for you · ${SPOTS[d.spot].name.en} · ${clockText(d.at)}`));
    }
    for (const n of takeNews(l)) {
      if (n.type !== 'stage' || n.stage === 'stranger') continue;
      const nm = P(CAST[n.id].name), st = P(romanceStanding(l, n.id).stage);
      S.toasts.push(n.stage === 'known' ? T(`认识了${nm}（J 日志 · 人）`, `You've met ${nm} (J: journal, People)`) : `${nm} · ${st}`);
    }
  }

  return {
    get busy() { return !!S.cur; },
    actors,
    others() { return Object.values(actors).filter((a) => !a.seat).map((a) => ({ x: a.x, z: a.z, vx: 0, vz: 0 })); },
    // T: only someone he's met (a stranger is met first, with E)
    talkables() { return Object.values(actors).filter((a) => heart(L0(), a.who).stage !== 'stranger' && !(S.cur && S.cur.who === a.who)).map((a) => { const h = headOf(a); return { key: `heart:${a.who}`, persona: a.who, x: h.x, y: h.y, z: h.z, hold() {} }; }); },
    candidates() {
      if (!enabled || S.cur || !isFree()) return [];
      return Object.values(actors).filter((a) => a.scene || !S.hello[a.who]).map((a) => { const h = headOf(a); return { id: `rs:${a.who}`, x: h.x, y: h.y - 0.1, z: h.z, reach: a.seat ? 4.2 : 3.4, cone: 0.62, ignore: [`heart:${a.who}`] }; });
    },
    owns(id) { return typeof id === 'string' && id.startsWith('rs:'); },
    prompt(id) {
      const a = actors[id.slice(3)]; if (!a) return null;
      const sc = a.scene && ROMANCE_SCENES[a.scene];
      return { target: nameOf(a.who) || P(sc ? sc.label : CAST[a.who].name), action: sc ? P(sc.action) : T('打个招呼', 'Say hello') };
    },
    interact(id) {
      const a = actors[id.slice(3)]; if (!a) return true;
      if (a.scene && ROMANCE_SCENES[a.scene]) { begin(a, a.scene); return true; }
      S.hello[a.who] = true;
      const line = CAST[a.who].lines.hello;
      hud.bark({ speaker: CAST[a.who].name, text: line, voice: false, seconds: Math.min(6, 2.4 + (getLang() === 'zh' ? line.zh.length * 0.16 : line.en.length * 0.055)) });
      return true;
    },
    // answers while a standing scene is on (a seated one gets its keys through the seat)
    key(code) { return !!S.cur && sceneTalk.asking && sceneTalk.key(code); },
    mapBlips() {
      const l = L0(), now = stamp(l);
      return datesAhead(l).filter((d) => SPOTS[d.spot] && d.at - now < 180).map((d) => ({ x: SPOTS[d.spot].x, z: SPOTS[d.spot].z, glyph: '♥', bg: '#5a2338', fg: '#ffd9e4', name: B(`${CAST[d.who].short.zh} · ${d.title.zh}`, `${CAST[d.who].short.en} · ${d.title.en}`) }));
    },
    update(dt, pp) {
      if (!enabled || !people) return;
      if ((S.check -= dt) <= 0) { S.check = 0.5; sweep(pp); for (const k of Object.keys(S.hello)) if (!actors[k]) delete S.hello[k]; }
      if (S.toasts.length && (S.toastIn -= dt) <= 0 && isFree() && !S.cur) { hud.toast(S.toasts.shift(), 5); S.toastIn = 5.5; }
      const c = S.cur;
      if (c && !c.fading) {
        const a = actors[c.who];
        if (!a) abandon();
        else if (c.seat ? (jazz && !jazz.seated) : Math.hypot(pp.x - a.x, pp.z - a.z) > 9) abandon();
      }
      for (const a of Object.values(actors)) {
        const d = Math.hypot(pp.x - a.x, pp.z - a.z), mine = S.cur && S.cur.who === a.who;
        if (d > 60 && !mine) continue;                                       // too far to see what she's doing
        a.t += dt;
        const look = mine || d < 5 ? [pp.x, pp.z] : null;
        if (a.seat) { a.p.root.position.set(0, 0, 0); a.p.update(dt * 0.5, look); a.frame.updateMatrixWorld(true); a.pose(a.cabin, a.frame); continue; }
        if (a.who === 'kexin' && a.spot === 'jazzFloor') { a.raise = (a.raise ?? 0.8) + ((mine || d < 2.5 ? 0 : 0.8) - (a.raise ?? 0.8)) * Math.min(1, dt * 3); a.p.setPhoneHold(a.raise); }   // filming the trio until you're in front of her
        a.p.update(dt, look);
      }
    },
    debug: { state: S, spots: SPOTS },
  };
}
