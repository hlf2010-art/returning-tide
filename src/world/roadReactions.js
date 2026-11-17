// People and your car, in the street: the decisions are engine/roadIncident.js's (pure, tested);
// this puts them in the world.
//   - while you drive, anyone in the car's path steps or jumps aside in time (the crowd through
//     crowd.shove, the crossing's own pedestrians through their `shove`), flinches, glares, and if it
//     was close, shouts at you; heads turn; a car or two behind you honks
//   - a close one at speed (or a touch at 8-30 km/h): angrier, and a passer-by says they'll report
//     you; on the zebra its camera sends a ticket (交管12123)
//   - a real hit (30+ km/h, someone who couldn't get clear): the car stops (you never drive through
//     anyone); they go down and sit on the ground, shaken. Someone shouts, people gather round at the
//     kerb and some film it, someone calls 110, cars honk, and a traffic officer comes on foot from
//     Hankou Road. You get out; the car goes to the kerb for the night; the fine, the points and the
//     pedestrian's costs are paid; it goes on the record. They get up, and walk off, slowly.
// Nobody is shown badly hurt. The victim is a stand-in of the same person (their own avatar) while
// the original is taken out of the crowd / the crossing; they come back where the stand-in leaves.
import * as THREE from 'three';
import { createPerson } from './people.js';
import { twoBone, turn } from './driverPose.js';
import { dressPolice } from './officer.js';
import { WHO } from './bumps.js';
import { L as LAY, groundHeight } from './layout.js';
import { startFlinch } from '../engine/flinch.js';
import { blocked as wallAt, onRoad } from '../engine/crowd.js';
import { CAR } from '../engine/drive.js';
import { ROAD, dodgePlan, classify, kmhOf, applyIncident, honkers, gatherSpots, LINES, lineFor, shoutFor, summaryText, TIER_RANK } from '../engine/roadIncident.js';
import { getLang } from '../ui/i18n.js';

const T = (zh, en) => (getLang() === 'zh' ? zh : en);
const UP = new THREE.Vector3(0, 1, 0);
const NAMES = {
  witness: { zh: '路人', en: 'Passer-by' }, onlooker: { zh: '围观的人', en: 'Onlooker' },
  victim: { zh: '被撞的行人', en: 'The pedestrian' }, cop: { zh: '交警', en: 'Traffic officer' },
};
const COP_ROLES = ['p3', 'c7', 'c6'];

// sat on the ground where they fell: pelvis down, legs out in front with the knees up a little,
// hands on the ground behind, leaning back on them. k: 0 standing (the clip as it is) .. 1 sat
const g1 = new THREE.Vector3(), g2 = new THREE.Vector3(), g3 = new THREE.Vector3(), g4 = new THREE.Vector3(), gPole = new THREE.Vector3(), gF = new THREE.Vector3(), gR = new THREE.Vector3();
function groundSit(person, k, h, ground) {
  if (k <= 0.001) return;
  const r = person.root, B = person._gs || (person._gs = { pelvis: r.getObjectByName('Bip01_Pelvis'), spine: r.getObjectByName('Bip01_Spine'),
    L: ['Thigh', 'Calf', 'Foot', 'UpperArm', 'Forearm', 'Hand'].map((n) => r.getObjectByName(`Bip01_L_${n}`)), R: ['Thigh', 'Calf', 'Foot', 'UpperArm', 'Forearm', 'Hand'].map((n) => r.getObjectByName(`Bip01_R_${n}`)) });
  if (!B.pelvis || !B.L[0] || !B.R[5]) return;
  r.updateMatrixWorld(true);
  gF.set(Math.sin(h), 0, Math.cos(h)); gR.crossVectors(gF, UP).normalize();          // gR: their right
  B.pelvis.getWorldPosition(g1);
  g2.set(r.position.x - gF.x * 0.12, ground + 0.13, r.position.z - gF.z * 0.12);
  g3.copy(g1).lerp(g2, k);
  r.position.add(g4.subVectors(g3, g1)); r.updateMatrixWorld(true);
  turn(B.spine, gR, 0.22 * k);                                                     // leaning back on the hands
  for (const [s, side] of [[B.L, 1], [B.R, -1]]) {
    s[2].getWorldPosition(g1);
    g2.copy(g3).addScaledVector(gF, 0.62 + (side > 0 ? 0.04 : -0.06)).addScaledVector(gR, -side * 0.17); g2.y = ground + 0.07;
    g1.lerp(g2, k); gPole.copy(gF).addScaledVector(UP, 0.9).normalize();
    twoBone(s[0], s[1], s[2], g1, gPole);
  }
  for (const [s, side] of [[B.L, 1], [B.R, -1]]) {
    s[5].getWorldPosition(g1);
    g2.copy(g3).addScaledVector(gF, -0.2).addScaledVector(gR, -side * 0.27); g2.y = ground + 0.04;
    g1.lerp(g2, k); gPole.copy(gF).multiplyScalar(-0.7).addScaledVector(gR, -side * 0.5).normalize();
    twoBone(s[3], s[4], s[5], g1, gPole);
  }
}

export function createRoadReactions({ scene, people, hud, audio, traffic, player, getLife, save, getCrowd = () => null }) {
  const S = { t: 0, timers: [], lastBark: -1e9, said: new Map(), lastHorn: -1e9, lastScare: -1e9, dodging: new Map(), faced: [], H: null, log: [] };
  const after = (sec, fn) => S.timers.push({ t: sec, fn });
  const crowd = () => getCrowd && getCrowd();

  // ---- everyone on foot who might be in the road, in one shape ----
  // { ref, src: 'ped' | 'crowd', id, x, z, persona, kind ('phone' | 'elder' | null), vx, vz }
  function wrap(ref, src) {
    if (src === 'ped') return { ref, src, id: `ped:${ref.id}`, x: ref.x, z: ref.z, vx: ref.vx, vz: ref.vz, persona: ref.persona || 'office', kind: ref.phoneW > 0.5 ? 'phone' : ref.persona === 'elder' ? 'elder' : null, phone: ref.phoneW > 0.5 || ref.phone > 0.5 };
    return { ref, src, id: `crowd:${ref.id}`, x: ref.x, z: ref.z, vx: ref.vx, vz: ref.vz, persona: ref.persona || 'office', kind: ref.phone && ref.v > 0.2 ? 'phone' : ref.kind === 'elder' ? 'elder' : null, phone: !!ref.phone };
  }
  function everyone(x, z, r) {
    const out = [];
    for (const p of traffic.peds) if (!p.hidden && Math.abs(p.x - x) < r && Math.abs(p.z - z) < r) out.push(wrap(p, 'ped'));
    const cr = crowd();
    if (cr) for (const a of cr.agents) if (!a.gone && !a.out && Math.abs(a.x - x) < r && Math.abs(a.z - z) < r && Math.abs((a.y || 0) - 0.15) < 1) out.push(wrap(a, 'crowd'));
    return out;
  }
  const near = (w, x, z) => Math.hypot(w.x - x, w.z - z);

  // ---- speech ----
  function say(line, at, speaker, { seconds = 3, force = false, id = null } = {}) {
    if (!line) return false;
    if (!force && (S.t - S.lastBark < 1.4 || (id && S.t - (S.said.get(id) ?? -1e9) < 12))) return false;
    S.lastBark = S.t; if (id) S.said.set(id, S.t);
    hud.bark({ speaker, text: { zh: line.zh, en: line.en }, gloss: line.gloss, lang: line.lang, who: line.who, at: at ? [at[0], 1.6, at[1]] : null, seconds });
    S.log.push({ t: +S.t.toFixed(2), who: line.who, zh: line.zh });
    while (S.log.length > 40) S.log.shift();
    return true;
  }
  const speakerOf = (w) => (w ? WHO[w.persona] || WHO.office : NAMES.witness);

  // ---- horns: the cars nearest you, a beat apart, louder the nearer ----
  function honk(x, z, n) {
    if (S.t - S.lastHorn < 5 || !audio || !audio.cue) return;
    S.lastHorn = S.t;
    for (const h of honkers(traffic.vehicles, x, z, { n })) audio.cue('carhorn', h.delay, h.level);
  }
  // heads turn to whatever just happened
  function lookOver(x, z, r = 16, skip = null) {
    for (const w of everyone(x, z, r)) {
      if (w.ref === skip || near(w, x, z) > r) continue;
      if (w.src === 'ped') { w.ref.faceTo = [x, z]; w.ref.faceFor = 2.5 + Math.random() * 1.5; }
      else if (!w.ref.faceTo) { w.ref.faceTo = [x, z]; S.faced.push({ a: w.ref, until: S.t + 2.5 + Math.random() * 2 }); }
    }
  }
  // a glare and a word, once they're out of the way
  function scold(w, tier, carAt) {
    const p = w.ref;
    if (w.src === 'ped') { p.faceTo = carAt; p.faceFor = 2.4; p.gesture = tier === 'glare' ? 'look' : 'scold'; p.pause = p.crossing ? 0 : 1.6; }
    else if (p.state === 'walk' && !p.leader && p.kind !== 'follower') { p.state = 'act'; p.act = 'look'; p.wait = 1.8; p.gesture = tier === 'glare' ? 'look' : 'scold'; p.faceTo = carAt; p.heading = Math.atan2(carAt[0] - p.x, carAt[1] - p.z); }
    else if (!p.faceTo) { p.faceTo = carAt; S.faced.push({ a: p, until: S.t + 2.2 }); }
    if (tier === 'glare') return;
    say(shoutFor(tier, w.persona), [w.x, w.z], speakerOf(w), { id: w.id });
  }
  // a close one at speed: horns, and someone says they'll report you (and the zebra's camera)
  function scare(x, z, kmh, zebra, skip = null) {
    if (S.H) return;                                                       // (a hit is being dealt with)
    if (S.t - S.lastScare < 8) { honk(x, z, 2); return; }
    S.lastScare = S.t;
    honk(x, z, 2); lookOver(x, z, 18, skip);
    const wit = everyone(x, z, 20).filter((w) => w.ref !== skip).sort((a, b) => near(a, x, z) - near(b, x, z))[0];
    after(2.4, () => {
      if (S.H) return;
      const at = wit ? [wit.x, wit.z] : [x, z];
      say(lineFor(LINES.report), at, wit ? speakerOf(wit) : NAMES.witness, { force: true, seconds: 3.4 });
      const L = getLife(), res = applyIncident(L, 'scare', { kmh, zebra });
      save && save();
      after(3.2, () => hud.toast(res.ticketed
        ? T(`交管12123：你在中山东一路汉口路斑马线未礼让行人，罚款 ¥${res.fine}，记 ${res.points} 分（已用微信支付）。`, `Traffic police (12123): failing to yield to pedestrians at the Zhongshan Road / Hankou Road crossing. Fine ¥${res.fine}, ${res.points} points (paid by WeChat).`)
        : T('有人说要举报你。慢一点。', 'Someone says they will report you. Slow down.'), 5));
    });
  }

  // ---- getting out of the way ----
  function startDodge(w, plan, d, tier) {
    const p = w.ref, lx = -Math.sin(d.yaw), lz = -Math.cos(d.yaw);
    p.dodge = { t: 0, react: plan.react, dur: Math.max(0.12, plan.need / plan.speed), dx: lx * plan.dir * plan.need, dz: lz * plan.dir * plan.need, makes: plan.makes, started: false, said: false, tier, car: [d.x, d.z] };
    S.dodging.set(p, w);
  }
  function stepDodges(dt) {
    for (const w of [...S.dodging.values()]) {
      const p = w.ref, g = p.dodge;
      if (!g || (w.src === 'ped' && p.hidden) || (w.src === 'crowd' && (p.out || p.gone))) { S.dodging.delete(p); if (g) p.dodge = null; continue; }
      g.t += dt;
      if (!g.started && g.t >= g.react) {
        g.started = true;
        const hard = g.tier === 'glare' ? 0.7 : 1.3;
        if (w.src === 'ped') { p.shove = { x: 0, z: 0, t: g.dur }; startFlinch(p, g.car[0], g.car[1], { hard }); }   // (the step itself is taken below; the shove holds their walking back)
        else { const cr = crowd(); if (cr) { cr.shove(p, g.dx, g.dz, g.dur); cr.flinch(p, g.car[0], g.car[1], hard); } }
      }
      if (g.started && w.src === 'ped' && g.t - dt < g.react + g.dur) {    // the step aside, at an even pace
        const k = Math.max(0, Math.min(g.t, g.react + g.dur) - Math.max(g.t - dt, g.react)) / g.dur;
        p.x += g.dx * k; p.z += g.dz * k;
      }
      if (g.started && !g.said && g.t >= g.react + g.dur + 0.2) { g.said = true; w.x = p.x; w.z = p.z; scold(w, g.tier, g.car); }
      if (g.t > g.react + g.dur + 2) { p.dodge = null; p.dodgeCool = S.t + 2.5; S.dodging.delete(p); }
    }
  }

  // ---- each frame while you drive: who's in the way ----
  function drive(dt, d) {
    const sp = Math.abs(d.v); if (sp < 0.3 || S.H) return;
    const dir = Math.sign(d.v), fx = Math.cos(d.yaw) * dir, fz = -Math.sin(d.yaw) * dir, lx = -Math.sin(d.yaw), lz = -Math.cos(d.yaw);
    const kmh = kmhOf(sp), list = everyone(d.x, d.z, 24);
    const onZebra = (w) => !!(traffic.inCrosswalk && traffic.inCrosswalk(w.x, w.z, 0.5));
    const crowded = list.filter(onZebra).length;
    let worst = null;
    for (const w of list) {
      const p = w.ref;
      if (p.dodge || (p.dodgeCool && p.dodgeCool > S.t) || !onRoad(w.x, w.z)) continue;
      const rx = w.x - d.x, rz = w.z - d.z, ahead = rx * fx + rz * fz, side = rx * lx + rz * lz;
      const pref = Math.sign((w.vx || 0) * lx + (w.vz || 0) * lz) || (side >= 0 ? 1 : -1);
      const plan = dodgePlan({ ahead, side, v: sp, halfLen: CAR.length / 2, halfW: CAR.width / 2, kind: w.kind, pref });
      if (!plan) continue;
      const zebra = onZebra(w), tier = classify({ contact: false, kmh, crowded, close: plan.close, zebra });
      startDodge(w, plan, d, tier);
      if (!worst || TIER_RANK[tier] > TIER_RANK[worst.tier]) worst = { tier, w, zebra };
    }
    if (!worst) return;
    if (worst.tier === 'scare') scare(worst.w.x, worst.w.z, kmh, worst.zebra, worst.w.ref);
    else if (worst.tier === 'startle') { after(0.6, () => honk(d.x, d.z, 1)); lookOver(worst.w.x, worst.w.z, 12, worst.w.ref); }
  }

  // ---- the car touched someone ----
  // who: what world/driving.js's blocked() found (a traffic pedestrian, or a crowd entry with .crowd)
  function contact(who, kmh, d) {
    if (S.H) return 'hit';
    let w = null;
    if (who && who.crowd !== undefined) { const cr = crowd(), a = cr && cr.agents[who.crowd]; if (a) w = wrap(a, 'crowd'); }
    else if (who) w = wrap(who, 'ped');
    if (!w) return null;
    const zebra = !!(traffic.inCrosswalk && traffic.inCrosswalk(w.x, w.z, 1.5));
    const tier = classify({ contact: true, kmh, zebra });
    S.log.push({ t: +S.t.toFixed(2), contact: tier, kmh: Math.round(kmh) });
    if (tier === 'hit') { startHit(w, d, kmh, zebra); return tier; }
    // knocked back a step (startled, unhurt): out of the way, a glare, a word
    const p = w.ref, rx = w.x - d.x, rz = w.z - d.z, lx = -Math.sin(d.yaw), lz = -Math.cos(d.yaw), sd = Math.sign(rx * lx + rz * lz) || 1;
    const push = tier === 'scare' ? 0.9 : 0.6;
    if (p.dodge) p.dodge = null;
    p.dodge = { t: 0, react: 0, dur: 0.3, dx: lx * sd * push, dz: lz * sd * push, makes: true, started: false, said: false, tier, car: [d.x, d.z] };
    S.dodging.set(p, w);
    if (tier === 'scare') scare(w.x, w.z, kmh, zebra, p); else { after(0.5, () => honk(d.x, d.z, 1)); lookOver(w.x, w.z, 12, p); }
    return tier;
  }

  // ---- a hit: the scene ----
  const kerbSide = (x, z) => {
    if (!onRoad(x, z)) return [x, z];
    if (x > LAY.westCurbX && x < LAY.eastCurbX) return [x < (LAY.westCurbX + LAY.eastCurbX) / 2 ? LAY.westCurbX - 0.9 : LAY.eastCurbX + 0.9, z];
    return [x, z < 0 ? -LAY.street.roadHalfW - 0.9 : LAY.street.roadHalfW + 0.9];
  };
  function actor(role, x, z, h) {
    if (!people || !people.manifest.cast[role]) return null;
    const p = createPerson(people, role);
    p.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(p.root);
    const a = { p, x, z, h, y: groundHeight(x, z, 1), goal: null, speed: 1.2, stopAt: 0.4, anim: 'idle', look: null, sit: 0, sitTo: 0, v: 0 };
    p.root.position.set(x, a.y, z); p.root.rotation.y = h;
    return a;
  }
  function dropActor(a) {
    if (!a) return;
    scene.remove(a.p.root); if (a.extra) scene.remove(a.extra);
    a.p.root.traverse((o) => { if (o.isSkinnedMesh) o.skeleton.dispose(); });
  }
  function stepActor(a, dt) {
    if (!a) return;
    let moving = false;
    a.sit += Math.sign(a.sitTo - a.sit) * Math.min(Math.abs(a.sitTo - a.sit), dt / (a.sitTo > a.sit ? 0.45 : 1.6));
    if (a.goal && a.sit < 0.02) {
      const g = typeof a.goal === 'function' ? a.goal() : a.goal, dx = g[0] - a.x, dz = g[1] - a.z, dd = Math.hypot(dx, dz);
      if (dd > a.stopAt) {
        const s = Math.min(a.speed, dd * 1.5 + 0.25), nx = a.x + dx / dd * s * dt, nz = a.z + dz / dd * s * dt;
        if (!wallAt(nx, nz, 0.25)) { a.x = nx; a.z = nz; } else if (!wallAt(nx, a.z, 0.25)) a.x = nx; else if (!wallAt(a.x, nz, 0.25)) a.z = nz; else { a.x = nx; a.z = nz; }   // (round a post; never stuck)
        let dh = Math.atan2(dx, dz) - a.h; while (dh > Math.PI) dh -= Math.PI * 2; while (dh < -Math.PI) dh += Math.PI * 2;
        a.h += dh * Math.min(1, dt * 6); moving = true; a.v = s;
      } else if (a.arrive) { const f = a.arrive; a.arrive = null; f(); }
    }
    if (!moving) a.v = 0;
    if (!moving && a.face) { const f = a.face(); let dh = Math.atan2(f[0] - a.x, f[1] - a.z) - a.h; while (dh > Math.PI) dh -= Math.PI * 2; while (dh < -Math.PI) dh += Math.PI * 2; a.h += dh * Math.min(1, dt * 3); }
    a.y = groundHeight(a.x, a.z, a.y + 0.5);
    a.p.play(moving ? 'walk' : a.anim, 0.3); a.p.setGait(a.v);
    a.p.root.position.set(a.x, a.y, a.z); a.p.root.rotation.set(0, a.h, 0);
    a.p.update(dt, a.look ? a.look() : null);
    groundSit(a.p, a.sit, a.h, a.y);
    if (a.dress) a.dress(a);
  }

  function startHit(w, d, kmh, zebra) {
    const L = getLife(), x = w.x, z = w.z, role = w.src === 'ped' ? w.ref.id : w.ref.role;
    const H = S.H = { t: 0, w, x, z, kmh, zebra, car: { x: d.x, z: d.z, yaw: d.yaw }, victim: null, cop: null, gathered: [], phase: 'down', done: false, applied: false, L };
    // the stand-in, of the same person: down on the ground facing the car, the original out of the scene
    const h = Math.atan2(d.x - x, d.z - z);
    H.victim = actor(role, x, z, h);
    if (H.victim) {
      if (w.src === 'ped') w.ref.hidden = true; else w.ref.out = true;
      H.victim.sitTo = 1; H.victim.look = () => [H.car.x, H.car.z];
      if (w.src === 'crowd' && w.ref.scale) H.victim.p.root.scale.setScalar(0.01 * w.ref.scale);
    }
    if (w.ref.dodge) w.ref.dodge = null;
    if (!H.victim) { if (w.src === 'ped') startFlinch(w.ref, d.x, d.z, { hard: 2 }); else { const c0 = crowd(); if (c0) c0.flinch(w.ref, d.x, d.z, 2); } }
    hud.toast(T('你撞到人了。车停住了，那人坐在地上。别走。', "You've hit someone. The car has stopped; they're sitting on the road. Don't leave."), 5);
    honk(x, z, 2);
    lookOver(x, z, 22, w.ref);
    // people come over and stand round at the kerb; about half hold a phone up at it
    const cr = crowd();
    if (cr) {
      const cand = cr.agents.filter((a) => a !== w.ref && !a.gone && !a.out && !onRoad(a.x, a.z) && Math.hypot(a.x - x, a.z - z) < 26).map((a) => ({ a, x: a.x, z: a.z, phone: a.phone }));
      for (const s of gatherSpots(cand, x, z, { n: 6 })) {
        const [sx, sz] = kerbSide(s.x, s.z);
        if (wallAt(sx, sz, 0.3)) continue;
        if (cr.gather(s.p.a, sx + (Math.random() - 0.5) * 0.8, sz + (Math.random() - 0.5) * 0.8, { face: [x, z], act: s.film ? 'photo' : 'look', wait: 90 })) { H.gathered.push(s.p.a); if (s.film) H.filmed = true; }
      }
    }
    for (const p of traffic.peds) if (!p.hidden && p !== w.ref && Math.hypot(p.x - x, p.z - z) < 20) { p.faceTo = [x, z]; p.faceFor = 25; p.pause = p.crossing ? 0 : 20; p.gesture = 'look'; }
    const others = everyone(x, z, 25).filter((o) => o.ref !== w.ref).sort((a, b) => near(a, x, z) - near(b, x, z));
    const wit = others[0] || null, wit2 = others[1] || wit;
    const at = (o) => (o ? [o.ref.x, o.ref.z] : [x, z]);
    const vAt = () => (H.victim ? [H.victim.x, H.victim.z] : [x, z]);
    after(0.6, () => say(lineFor(LINES.hitShout), at(wit), speakerOf(wit), { force: true }));
    after(2.8, () => say(lineFor(LINES.victim), vAt(), NAMES.victim, { force: true }));
    after(5.4, () => say(lineFor(LINES.witness), at(wit2), speakerOf(wit2), { force: true, seconds: 3.6 }));
    after(8.4, () => say(LINES.call[0] && lineFor([LINES.call[Math.random() < 0.5 ? 0 : 1]]), at(wit), speakerOf(wit), { force: true, seconds: 4 }));
    after(11.6, () => { if (H.filmed) say(lineFor(LINES.filming), H.gathered[0] ? [H.gathered[0].x, H.gathered[0].z] : [x, z], NAMES.onlooker, { force: true }); });
    after(6, () => honk(x, z, 1));
    after(ROAD.policeAfter, () => officerComes(H));
    S.log.push({ t: +S.t.toFixed(2), hit: Math.round(kmh), who: w.id, filmed: !!H.filmed });
  }

  // the officer: on foot from the corner of Hankou Road, to you (or to the car, if you've walked off)
  function officerComes(H) {
    const b = player.body, me = () => (Math.hypot(b.x - H.car.x, b.z - H.car.z) < 30 ? [b.x, b.z] : [H.car.x, H.car.z]);
    const sx = -42, sz = H.z >= 0 ? 5.3 : -5.3;                              // (along the pavement of Hankou Road, from the corner)
    const role = COP_ROLES.find((r) => people && people.manifest.cast[r]);
    const a = role ? actor(role, sx, sz, 0) : null;
    H.phase = 'police';
    if (!a) { after(4, () => talkTo(H)); return; }
    dressPolice(scene, a, '交警');
    a.speed = 1.6; a.stopAt = 1.7; a.goal = me; a.look = () => me(); a.face = me;
    a.arrive = () => talkTo(H);
    H.cop = a;
    hud.toast(T('一名交警走了过来。', 'A traffic officer is walking over.'), 3);
    after(40, () => { if (!H.applied && H.phase === 'police') talkTo(H); });       // (he gets there in the end)
  }
  function talkTo(H) {
    if (H.phase !== 'police') return;
    H.phase = 'talk';
    const c = () => (H.cop ? [H.cop.x, H.cop.z] : [H.car.x, H.car.z]), vAt = () => (H.victim ? [H.victim.x, H.victim.z] : [H.x, H.z]);
    if (H.cop) { H.cop.anim = 'talk2'; H.cop.goal = null; }
    const seq = [[0, LINES.cop[0], c, NAMES.cop], [2.6, LINES.cop[1], c, NAMES.cop], [5.4, LINES.victimOk[0], vAt, NAMES.victim], [8.6, LINES.copAfter[0], c, NAMES.cop], [11.4, LINES.copAfter[1], c, NAMES.cop], [14.2, LINES.copAfter[2], c, NAMES.cop]];
    for (const [t, l, at, sp] of seq) after(t, () => say(lineFor([l]), at(), sp, { force: true, seconds: 3.4 }));
    after(14.6, () => consequences(H));
    after(18.5, () => { if (H.victim) { H.victim.sitTo = 0; } });
    after(21, () => wrapUp(H));
  }
  // what it comes to: out of the car, the car to the kerb till morning, the money, the record
  function consequences(H) {
    if (H.applied) return; H.applied = true;
    if (S.driving && S.driving.driving) S.driving.forceExit();
    if (S.driving) S.driving.toKerb();
    const L = getLife(), res = applyIncident(L, 'hit', { kmh: H.kmh, zebra: H.zebra, filmed: !!H.filmed });
    save && save();
    hud.toast(summaryText(res), 11);
    H.res = res;
  }
  function wrapUp(H) {
    H.phase = 'leaving';
    say(lineFor(LINES.disperse), H.cop ? [H.cop.x, H.cop.z] : [H.x, H.z], NAMES.cop, { force: true });
    const cr = crowd();
    for (const a of H.gathered) if (a.state === 'act' || a.state === 'goto') { if (a.state === 'goto') { a.state = 'act'; a.goal = null; } a.wait = 1 + Math.random() * 5; }
    for (const p of traffic.peds) if (p.faceFor > 3) { p.faceFor = 1 + Math.random() * 2; p.pause = Math.min(p.pause, 1.5); }
    if (H.victim) {                                                         // up, slowly, and off to the pavement (still a little shaken)
      const v = H.victim, [kx, kz] = kerbSide(v.x, v.z);
      v.look = null; v.speed = 0.7; v.stopAt = 0.3; v.goal = [kx, kz + (Math.random() - 0.5)]; v.arrive = () => { H.victimHome = true; };
    }
    if (H.cop) { const c = H.cop; c.anim = 'idle'; c.look = null; c.face = null; c.speed = 1.3; c.stopAt = 0.4; c.goal = [LAY.westCurbX - 2.5, H.z + (H.z > 0 ? 30 : -30)]; c.arrive = () => { H.copGone = true; }; }
    H.endAt = S.t + 30;
    void cr;
  }
  function finish(H) {
    const w = H.w, v = H.victim;
    if (v) {
      if (w.src === 'ped') { const p = w.ref; p.x = v.x; p.z = v.z; p.hidden = false; p.crossing = false; p.detour = null; p.path = []; p.state = 'walk'; p.idx = v.x < (LAY.westCurbX + LAY.eastCurbX) / 2 ? 1 : 5; }
      else { const a = w.ref; a.x = v.x; a.z = v.z; a.out = false; a.vx = a.vz = 0; a.state = 'walk'; }
    }
    dropActor(v); dropActor(H.cop);
    S.H = null;
  }

  return {
    // world/driving.js hands itself over (forceExit, toKerb)
    bind(driving) { S.driving = driving; },
    drive, contact,
    // a hit is being dealt with: the car stays where it is
    get holding() { return !!(S.H && !S.H.applied); },
    get busy() { return !!S.H; },
    // is this person getting out of the car's way (and going to make it)? Then they don't stop it.
    clearing(p) { if (p && p.crowd !== undefined) { const cr = crowd(), a = cr && cr.agents[p.crowd]; return !!(a && a.dodge && a.dodge.makes); } return !!(p && p.dodge && p.dodge.makes); },
    update(dt) {
      if (dt <= 0) return;
      S.t += dt;
      for (let i = S.timers.length - 1; i >= 0; i--) { const tm = S.timers[i]; tm.t -= dt; if (tm.t <= 0) { S.timers.splice(i, 1); try { tm.fn(); } catch (e) { console.warn('road reaction', e); } } }
      stepDodges(dt);
      for (let i = S.faced.length - 1; i >= 0; i--) if (S.t > S.faced[i].until) { const a = S.faced[i].a; if (a.state !== 'act') a.faceTo = null; S.faced.splice(i, 1); }
      const H = S.H;
      if (H) {
        H.t += dt;
        stepActor(H.victim, dt); stepActor(H.cop, dt);
        const b = player.body;
        if (H.phase === 'leaving' && ((H.victimHome || !H.victim) && (H.copGone || !H.cop || Math.hypot(H.cop.x - b.x, H.cop.z - b.z) > 30) || S.t > H.endAt)) finish(H);
      }
    },
    log: S.log,
    get scene() { return S.H; },
  };
}
