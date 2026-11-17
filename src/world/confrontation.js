// A row outside the Peace Hotel, late in the evening: a man out of a long client dinner won't let a
// young woman go. Once in a game (engine/fight.js mayBegin), on Nanjing Road East by the hotel door.
//   notice   you hear them before you reach them. E on him: step in. Walk on, and that was your answer.
//   talk     1-4. Talk him down, stand between them, shout for the hotel's security, dial 110, walk
//            away, or square up. Most roads end with nobody hit (engine/fight.js: the dispute).
//   blows    first person, him in front of you, your hands up (engine/fight.js: the blows).
//              F / left click  jab        R / right click  cross       Space  guard (hold)
//              A  D  slip to the side     W  S  in and out             Q  back off, get away (hold)
//            (gamepad, through its usual keys: A jab, Y cross, X or LT guard, B back off, the stick moves)
//            He draws his arm back before he swings: slip it or block it, then hit him while he's open.
//   after    the bystander's phone, the hotel's security, the police if it went far or someone called:
//            a statement, a warning or a fine, hours gone. Then engine/fight.js applies what follows:
//            the injury, reputation, the heart of whoever was with you, the morning's messages, the fact.
// The people (two or three, the officers later) exist only while it runs. There are no combat clips in
// the Rocketbox set: every punch, guard, flinch and stagger here is posed on the bones each frame over
// the idle / walk clips (two-bone IK for the arms, turns of the spine and neck, curled fingers).
import * as THREE from 'three';
import './confrontation.css';
import { createPerson } from './people.js';
import { dressPolice } from './officer.js';
import { twoBone, turn } from './driverPose.js';
import { groundHeight, addDynamicCollider } from './layout.js';
import { blocked, onRoad } from '../engine/crowd.js';
import { getLang } from '../ui/i18n.js';
import { createSceneTalk } from '../ui/sceneTalk.js';
import { stamp, skipTo, clockText } from '../engine/life.js';
import { hurt } from '../engine/year.js';
import { createDispute, choices, disputeStep, createFight, stepFight, fightSummary, settle, applyOutcome, morningAfter, mayBegin, fightState, policeCome, policeVerdict, FIGHT, INJURY } from '../engine/fight.js';
import { FIGHT_NAMES, NOTICE, PROMPT, SAY, SAY_HELP, OPEN, OPEN_WITH, AFTER_MOVE, POLICE_CALLED, BARKS, aftermath, policeScene, verdictLines, lostTime, closing, doormanLine, HINT, MIRROR } from './fightText.js';

const T = (zh, en) => (getLang() === 'zh' ? zh : en);
const TP = (p) => T(p[0], p[1]);
const wrap = (a) => { let r = a; while (r > Math.PI) r -= Math.PI * 2; while (r < -Math.PI) r += Math.PI * 2; return r; };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
const UP = new THREE.Vector3(0, 1, 0);
const DOOR = { x: -48, z: -210.3 }, DOORMAN = { x: -45.4, z: -210.4 };
// where it can start by itself: Nanjing Road East, the stretch outside the hotel
const STRETCH = { x0: -100, x1: -37, z0: -211.4, z1: -190.6 };
// who plays whom (Rocketbox roles in people.json; the first that exists). The drunk is the one in a pale jumper: he reads at night.
const ROLES = { drunk: ['c5', 'p3', 'c7'], girl: ['c2', 'c8', 'c1', 'c3'], film: ['c6', 'c7', 'p3'], guard: ['p4', 'p1'], cop: ['p3', 'c7'], cop2: ['c7', 'c6', 'p3'] };

// ---- posing on the bones ----
function rig(root) {
  const b = (n) => root.getObjectByName(n);
  const arm = (s) => ({ upper: b(`Bip01_${s}_UpperArm`), fore: b(`Bip01_${s}_Forearm`), hand: b(`Bip01_${s}_Hand`),
    fingers: [1, 2, 3, 4].map((i) => [b(`Bip01_${s}_Finger${i}`), b(`Bip01_${s}_Finger${i}1`), b(`Bip01_${s}_Finger${i}2`)]), thumb: [b(`Bip01_${s}_Finger0`), b(`Bip01_${s}_Finger01`)] });
  const G = { spine: b('Bip01_Spine'), spine1: b('Bip01_Spine1'), neck: b('Bip01_Neck'), head: b('Bip01_Head'), L: arm('L'), R: arm('R') };
  G.ok = !!(G.spine && G.head && G.L.upper && G.L.fore && G.L.hand && G.R.upper && G.R.fore && G.R.hand);
  return G;
}
const newPose = () => ({ L: new THREE.Vector3(), R: new THREE.Vector3(), w: 0, twist: 0, lean: 0, back: 0, roll: 0, fist: 0, drop: 0 });
const _a = new THREE.Vector3(), _c = new THREE.Vector3(), _ax = new THREE.Vector3(), _t = new THREE.Vector3(), _pole = new THREE.Vector3();
const _q0 = new THREE.Quaternion(), _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
// close a hand: every finger turned about the line of the knuckles (index -> little finger), toward the palm
function fist(G, s, k) {
  const A = G[s];
  if (k < 0.03 || !A.fingers[0][0] || !A.fingers[3][0]) return;
  _ax.subVectors(A.fingers[3][0].getWorldPosition(_c), A.fingers[0][0].getWorldPosition(_a)).normalize();
  const sg = s === 'L' ? -1 : 1;
  for (const f of A.fingers) { if (f[0]) turn(f[0], _ax, 1.2 * k * sg); if (f[1]) turn(f[1], _ax, 1.5 * k * sg); if (f[2]) turn(f[2], _ax, 1.0 * k * sg); }
  if (A.thumb[0]) turn(A.thumb[0], _ax, 0.3 * k * sg); if (A.thumb[1]) turn(A.thumb[1], _ax, 0.6 * k * sg);
}
// one arm to a world point, the elbow toward `pole`, blended over what the clip did by weight w
function reach(A, target, pole, w) {
  if (w < 0.02) return;
  if (w < 0.98) { _q0.copy(A.upper.quaternion); _q1.copy(A.fore.quaternion); }
  twoBone(A.upper, A.fore, A.hand, target, pole);
  if (w < 0.98) {
    _q2.copy(A.upper.quaternion); A.upper.quaternion.copy(_q0).slerp(_q2, w);
    _q2.copy(A.fore.quaternion); A.fore.quaternion.copy(_q1).slerp(_q2, w);
    A.upper.updateMatrixWorld(true);
  }
}
// ease a pose toward what's wanted (rate per second; a strike is fast, settling is slow)
function easePose(P, want, dt) {
  const k = 1 - Math.exp(-(want.rate || 10) * dt);
  P.L.lerp(want.L, k); P.R.lerp(want.R, k);
  for (const n of ['w', 'twist', 'lean', 'back', 'roll', 'fist', 'drop']) P[n] += ((want[n] || 0) - P[n]) * k;
}

export function createConfrontation({ scene, people, player, camera, canvas = null, hud, audio = null, voice = null, getLife, save, travel, onMode, isFree = () => true, getPlayerBody = () => null, enabled = true }) {
  const L0 = () => getLife();
  const names = { ...FIGHT_NAMES };
  const talk = createSceneTalk({ voice, getLife, save, names });
  const listeners = [];
  const S = { phase: null, t: 0, check: 3, A: {}, D: null, F: null, R0: null, filmed: false, companion: null, timers: [], waits: [], look: null, gest: null, slide: null, hands: 'down',
    in: { guard: false, away: false, jab: false, cross: false }, prevL: false, prevR: false, cam: { yaw: 0, pitch: 0, roll: 0, fwd: 0 }, fall: 0, falling: false, noticeI: 0, noticeT: 2, hintT: 0, ptime: 0, morningT: 2, last: null };
  const role = (list) => (people ? list.find((r) => people.manifest.cast[r]) : null);

  // ---- the HUD: two thin bars, a line of keys, a flush when you're hit, the dark of A&E ----
  const el = document.createElement('div'); el.id = 'fight-hud';
  el.innerHTML = '<div class="flash"></div><div class="hint"></div><div class="bars"><div class="bar hp"><i></i></div><div class="bar st"><i></i></div></div>';
  document.body.appendChild(el);
  const dark = document.createElement('div'); dark.id = 'fight-dark'; dark.innerHTML = '<span></span>'; document.body.appendChild(dark);
  const hpBar = el.querySelector('.hp'), stBar = el.querySelector('.st'), flashEl = el.querySelector('.flash'), hintEl = el.querySelector('.hint');
  function flash(kind, strength = 1) {
    flashEl.classList.toggle('block', kind === 'block');
    flashEl.getAnimations().forEach((a) => a.cancel());
    flashEl.animate([{ opacity: Math.min(1, 0.85 * strength) }, { opacity: 0 }], { duration: kind === 'block' ? 220 : 520, easing: 'ease-out' });
  }

  // ---- the sounds of it: small, dry, close (through the game's own context) ----
  let noise = null;
  function snd(kind, level = 1) {
    const ctx = audio && audio.getContext && audio.getContext(), out = audio && audio.getMaster && audio.getMaster();
    if (!ctx || !out || audio.muted || ctx.state !== 'running') return;
    if (!noise) { noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const t = ctx.currentTime + 0.005;
    const burst = (type, f0, f1, g, dur, q = 0.8, at = 0) => {
      const s = ctx.createBufferSource(); s.buffer = noise; s.playbackRate.value = 0.8 + Math.random() * 0.5;
      const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t + at); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + at + dur);
      const gn = ctx.createGain(); gn.gain.setValueAtTime(0.0001, t + at); gn.gain.linearRampToValueAtTime(g * level, t + at + Math.min(0.03, dur * 0.3)); gn.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
      s.connect(f).connect(gn).connect(out); s.start(t + at); s.stop(t + at + dur + 0.05);
    };
    const tone = (type, f0, f1, g, dur, at = 0) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t + at); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + at + dur);
      const gn = ctx.createGain(); gn.gain.setValueAtTime(0.0001, t + at); gn.gain.linearRampToValueAtTime(g * level, t + at + 0.008); gn.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      o.connect(lp).connect(gn).connect(out); o.start(t + at); o.stop(t + at + dur + 0.05);
    };
    if (kind === 'whoosh') burst('bandpass', 420, 1500, 0.16, 0.2, 1.2);
    else if (kind === 'swish') burst('bandpass', 900, 2400, 0.07, 0.11, 1.4);
    else if (kind === 'hit') { tone('sine', 130, 55, 0.5, 0.11); burst('lowpass', 1400, 300, 0.32, 0.07); }
    else if (kind === 'heavy') { tone('sine', 95, 38, 0.75, 0.2); burst('lowpass', 1800, 250, 0.45, 0.09); burst('highpass', 2600, 2000, 0.1, 0.03); }
    else if (kind === 'glance') burst('lowpass', 1000, 400, 0.2, 0.06);
    else if (kind === 'block') { burst('lowpass', 700, 250, 0.38, 0.08); tone('sine', 160, 90, 0.2, 0.07); }
    else if (kind === 'grunt') { tone('sawtooth', 118 + Math.random() * 14, 84, 0.16, 0.24); burst('bandpass', 600, 480, 0.03, 0.2, 2); }   // his effort: the wind-up, heard before it's seen
    else if (kind === 'gasp') burst('bandpass', 1300, 800, 0.1, 0.24, 1.1);
    else if (kind === 'scuff') burst('bandpass', 1900, 1100, 0.07, 0.14, 0.9);
    else if (kind === 'fall') { tone('sine', 70, 34, 0.7, 0.3); burst('lowpass', 600, 150, 0.4, 0.25); }
  }

  // ---- people of the scene ----
  function actor(key, roleId, x, z, h) {
    const p = createPerson(people, roleId);
    p.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(p.root);
    const a = { key, p, x, z, y: groundHeight(x, z, 9), h, goal: null, speed: 1.2, stopAt: 0.4, anim: 'idle', look: null, face: null, v: 0, back: false, box: addDynamicCollider('npc'), solid: true, rig: rig(p.root), pose: newPose(), want: null, t: Math.random() * 9, lying: 0 };
    p.root.position.set(a.x, a.y, a.z); p.root.rotation.y = h; a.box.id = `confront:${key}`;
    S.A[key] = a; return a;
  }
  function drop(key) {
    const a = S.A[key]; if (!a) return;
    scene.remove(a.p.root); if (a.extra) scene.remove(a.extra);
    a.p.root.traverse((o) => { if (o.isSkinnedMesh) o.skeleton.dispose(); });
    a.box.minX = a.box.maxX = a.box.minZ = a.box.maxZ = 1e6; delete S.A[key];
  }
  const headOf = (a) => { const v = new THREE.Vector3(); if (a && a.p.bones.head) a.p.bones.head.getWorldPosition(v); else if (a) v.set(a.x, a.y + 1.6, a.z); return v; };
  const whoAt = (who) => { const a = S.A[who]; if (a) { const h = headOf(a); return [h.x, h.y, h.z]; } if (who === 'girl' && S.companion && S.companion.at) { const q = S.companion.at(); if (q) return [q.x, (q.y || 0) + 1.6, q.z]; } return null; };
  const turnTo = (h, want, k) => h + wrap(want - h) * Math.min(1, k);
  function stepActor(a, dt) {
    a.t += dt;
    let moving = false;
    if (a.goal) {
      const dx = a.goal.x - a.x, dz = a.goal.z - a.z, d = Math.hypot(dx, dz);
      if (d > a.stopAt) {
        const sp = Math.min(a.speed, d * 1.6 + 0.3), nx = a.x + (dx / d) * sp * dt, nz = a.z + (dz / d) * sp * dt;
        if (!blocked(nx, nz, 0.25)) { a.x = nx; a.z = nz; } else if (!blocked(nx, a.z, 0.25)) a.x = nx; else if (!blocked(a.x, nz, 0.25)) a.z = nz; else a.goal = null;
        if (!a.back) a.h = turnTo(a.h, Math.atan2(dx, dz), dt * 6);
        moving = true; a.v = sp;
      } else { a.goal = null; if (a.arrive) { const f = a.arrive; a.arrive = null; f(); } }
    }
    if (!moving && !a.driven) a.v = 0;
    if (!moving && a.face) a.h = turnTo(a.h, Math.atan2(a.face.x - a.x, a.face.z - a.z), dt * 4);
    a.y = groundHeight(a.x, a.z, a.y + 0.5);
    const walking = a.v > 0.22 && a.lying < 0.05;
    a.p.play(walking ? (a.v > 2 ? 'jog' : 'walk') : a.anim, 0.25); a.p.setGait(a.v);
    if (walking && a.back && a.p.actions.base.walk) { const ts = -Math.abs(a.p.actions.base.walk.timeScale); a.p.actions.base.walk.timeScale = ts; a.p.actions.arm.walk.timeScale = ts; }   // stepping backwards: the walk, run backwards
    a.p.root.position.set(a.x, a.y, a.z); a.p.root.rotation.set(0, a.h, 0);
    if (a.lying > 0.001) {                                             // down on his back (a turn of the whole figure about his feet, eased)
      const e = smooth(a.lying); a.p.root.rotation.set(-1.45 * e, a.h, 0, 'YXZ'); a.p.root.position.y = a.y + 0.14 * e;
    }
    a.p.update(dt, a.lying > 0.3 ? null : typeof a.look === 'function' ? a.look() : a.look);
    if (a.want && a.rig.ok) { easePose(a.pose, a.want, dt); applyBody(a); }
    if (a.extra) a.dress(a);
    const b = a.box;
    if (a.solid && a.lying < 0.3) { b.minX = a.x - 0.22; b.maxX = a.x + 0.22; b.minZ = a.z - 0.22; b.maxZ = a.z + 0.22; b.y0 = a.y - 0.5; b.y1 = a.y + 1.9; } else b.minX = b.maxX = b.minZ = b.maxZ = 1e6;
  }
  // an NPC's pose: offsets are from each shoulder, in his own frame (x toward his right, y up, z forward)
  const _f = new THREE.Vector3(), _r = new THREE.Vector3(), _l = new THREE.Vector3(), _sh = new THREE.Vector3(), _tg = new THREE.Vector3();
  function applyBody(a) {
    const G = a.rig, P = a.pose, W = a.want;
    _f.set(Math.sin(a.h), 0, Math.cos(a.h)); _r.set(-Math.cos(a.h), 0, Math.sin(a.h)); _l.copy(_r).negate();
    if (Math.abs(P.lean) > 0.004) turn(G.spine, _l, P.lean);
    const roll = P.roll + (a.sway || 0);
    if (Math.abs(roll) > 0.004) turn(G.spine, _f, roll);
    if (Math.abs(P.twist) > 0.004 && G.spine1) turn(G.spine1, UP, P.twist);
    if (Math.abs(P.back) > 0.004) { if (G.neck) turn(G.neck, _l, -P.back * 0.4); turn(G.head, _l, -P.back * 0.6); }
    if (P.w > 0.02) for (const s of ['L', 'R']) {
      const A = G[s], off = P[s]; A.upper.getWorldPosition(_sh);
      _tg.copy(_sh).addScaledVector(_r, off.x).addScaledVector(UP, off.y).addScaledVector(_f, off.z);
      if (W.aim && W.aim[s]) {                                         // a blow: the fist goes where you are, as far as the arm reaches
        _t.copy(W.aim[s]).sub(_sh); const len = Math.min(_t.length(), 0.68); _t.setLength(len).add(_sh);
        _tg.lerp(_t, W.aimK ?? 1);
      }
      _pole.copy(_r).multiplyScalar(s === 'R' ? 0.7 : -0.7).addScaledVector(UP, -1).addScaledVector(_f, -0.25).normalize();
      reach(A, _tg, _pole, P.w);
    }
    fist(G, 'L', P.fist * (W.openL ? 0 : 1)); fist(G, 'R', P.fist);
    a.p.root.updateMatrixWorld(true);
  }
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  // what his body is doing, as a pose to ease toward. ps: { act, at, dur, attack, yielding, gassed }; eye: where you are
  const POSE = {
    stance: () => ({ w: 1, R: V(-0.06, -0.06, 0.26), L: V(0.1, -0.16, 0.38), lean: 0.14, fist: 1, rate: 8 }),
    grab: () => ({ w: 0.85, R: V(0.05, -0.5, 0.05), L: V(0.02, -0.12, 0.5), lean: 0.1, fist: 0.3, rate: 5 }),          // one hand out, holding her by the sleeve
    palms: () => ({ w: 1, R: V(0.1, 0.02, 0.36), L: V(-0.1, 0.02, 0.36), lean: -0.06, fist: 0, rate: 7 }),
    spent: () => ({ w: 1, R: V(0.02, -0.56, 0.2), L: V(-0.02, -0.56, 0.2), lean: 0.62, fist: 0.2, rate: 5 }),          // bent over, hands toward his knees
    flat: () => ({ w: 0.6, R: V(0.42, -0.1, 0.02), L: V(-0.42, -0.1, 0.02), fist: 0, rate: 5 }),
  };
  function drunkPose(ps, eye) {
    const k = ps.dur > 0 ? clamp(ps.at / ps.dur, 0, 1) : 1, chest = eye ? eye.clone().setY(eye.y - 0.32) : null;
    switch (ps.act) {
      case 'windup':
        if (ps.attack === 'haymaker') return { w: 1, R: V(0.4, 0.08, -0.24), L: V(0.12, -0.06, 0.42), twist: -0.55 * smooth(k * 1.6), lean: -0.08, fist: 1, rate: 13, openL: true };   // the arm goes back and wide: that's the tell
        if (ps.attack === 'shove') return { w: 1, R: V(-0.02, -0.14, 0.14), L: V(0.02, -0.14, 0.14), lean: -0.1, fist: 0, rate: 14 };                                           // both hands pulled in to the chest
        return { w: 1, R: V(0.06, -0.02, -0.04), L: V(0.1, -0.12, 0.4), twist: -0.32, fist: 1, rate: 15 };                                                                // a short one, cocked at the ear
      case 'strike':
        if (ps.attack === 'shove') return { w: 1, R: V(-0.08, -0.1, 0.6), L: V(0.08, -0.1, 0.6), aim: { R: chest, L: chest }, lean: 0.3, fist: 0, rate: 40 };
        return { w: 1, R: V(-0.1, 0.02, 0.62), L: V(0.14, -0.2, 0.2), aim: { R: eye }, twist: ps.attack === 'haymaker' ? 0.6 : 0.36, lean: 0.3, fist: 1, rate: 42 };
      case 'recover':
        if (k < 0.45) {                                                  // carried through, off balance
          if (ps.attack === 'shove') return { w: 1, R: V(-0.1, -0.2, 0.5), L: V(0.1, -0.2, 0.5), lean: 0.34, fist: 0, rate: 12 };
          return { w: 1, R: V(-0.46, -0.24, 0.3), L: V(0.2, -0.3, 0.1), twist: ps.attack === 'haymaker' ? 0.8 : 0.4, lean: 0.4, back: -0.3, roll: 0.12, fist: 1, rate: 14 };
        }
        return { ...POSE.stance(), rate: 5 };
      case 'flinch': return { w: 1, R: V(-0.1, 0.1, 0.2), L: V(0.1, 0.08, 0.2), twist: -0.28, lean: -0.2, back: 0.55 * (1 - k * 0.6), fist: 0.6, rate: 26 };
      case 'stagger': return { w: 1, R: V(0.34, -0.36, 0.08), L: V(-0.32, -0.3, 0.14), lean: k < 0.4 ? -0.34 : 0.3, roll: 0.22 * Math.sin(k * 5), back: 0.4 * (1 - k), fist: 0.3, rate: 14 };
      case 'backoff': return ps.yielding ? POSE.palms() : POSE.spent();
      case 'down': return POSE.flat();
      default: return POSE.stance();
    }
  }
  // the officers: the same people in dark blue, a cap and a reflective vest panel (world/officer.js)
  const dressOfficer = (a) => dressPolice(scene, a);

  // ---- small machinery: timers and waits that stop when the game does ----
  const after = (sec, fn) => S.timers.push({ t: sec, fn });
  const when = (test, fn, timeout = 20) => S.waits.push({ test, fn, t: timeout });
  function bark(line, seconds = 2.6) {
    const [who, zh, en] = line, at = whoAt(who);
    voice && voice.say && voice.say({ zh, en, who, at });
    hud.bark({ speaker: { zh: names[who][0], en: names[who][1] }, text: { zh, en }, voice: false, seconds });
  }
  function say(lines, done) {
    const ls = (lines || []).filter(Array.isArray);
    if (!ls.length) { done && done(); return; }
    talk.play(ls, { at: whoAt, onDone: () => done && done() });
  }
  // lines with stage directions between them
  function beats(list, done) {
    const i = list.findIndex((b) => !Array.isArray(b));
    if (i < 0) return say(list, done);
    const d = list[i], rest = list.slice(i + 1), go = () => direct(d, () => beats(rest, done));
    if (i > 0) say(list.slice(0, i), go); else go();
  }
  function direct(d, cont) {
    const dr = S.A.drunk, b = player.body;
    if (d.shove) {                                                     // he puts both hands on your chest
      S.hands = 'open';
      S.gest = { t: 0, power: d.shove, hit: false, cont };
    } else if (d.fled) { girlLeaves(); cont(); }
    else if (d.guard) {
      const g = S.A.guard || actor('guard', role(ROLES.guard), DOOR.x + 1.2, DOOR.z + 0.2, 0);
      g.speed = 2.6; g.stopAt = 1.5; g.goal = { x: dr.x + (b.x - dr.x) * 0.5 + 0.9, z: dr.z + (b.z - dr.z) * 0.5 + 0.6 }; g.look = () => [dr.x, dr.z]; g.face = dr; g.anim = 'talk2';
      g.arrive = () => { g.arrived = true; };
      when(() => g.arrived, cont, 14);
    } else cont();
  }
  function girlLeaves() {
    const g = S.A.girl; if (!g || g.gone) return;
    g.gone = true; g.face = null; g.look = null; g.anim = 'idle'; g.speed = 1.9; g.stopAt = 0.5; g.solid = false;
    g.goal = { x: Math.min(-40, g.x + 26), z: clamp(g.z + 4, STRETCH.z0 + 2, STRETCH.z1 - 2) };
  }
  function drunkLeaves(toward = null) {
    const d = S.A.drunk; if (!d) return;
    d.face = null; d.look = null; d.driven = false; d.want = { ...newPose(), roll: 0.05, rate: 3 }; d.anim = 'idle'; d.speed = 0.85; d.stopAt = 0.5; d.solid = false; d.back = false;
    d.goal = toward || { x: d.x - 46, z: clamp(d.z + 3, STRETCH.z0 + 2, STRETCH.z1 - 2) };
  }

  // ---- beginning ----
  function findSpot(near = null) {
    const b = player.body, fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw), cands = [];
    if (near) for (const d of [6.5, 5, 8, 4]) for (const s of [0, 0.5, -0.5]) cands.push({ x: b.x + fx * d - fz * s * d, z: b.z + fz * d + fx * s * d });
    else for (const [x, z] of [[-68.6, -206.1], [-69.4, -204.6], [-72.2, -206], [-92.6, -206.1], [-93.4, -204.6], [-60, -205.5], [-80, -205.5], [-56, -204], [-86, -204]]) cands.push({ x, z });   // under the street lamps along the hotel's side, for preference
    const ok = (c) => ![[0, 0], [-0.95, -0.45], [1.6, 0], [-1.6, 0], [0, 1.6], [0, -1.6], [4.2, 3.4]].some(([ox, oz]) => blocked(c.x + ox, c.z + oz, 0.35) || onRoad(c.x + ox, c.z + oz));
    const good = cands.filter(ok);
    if (near) return good[0] || null;
    // not on top of you, and for preference not where you're looking
    const far = good.filter((c) => { const d = Math.hypot(c.x - b.x, c.z - b.z); return d > 9 && d < 34; });
    const behind = far.filter((c) => ((c.x - b.x) * fx + (c.z - b.z) * fz) / Math.hypot(c.x - b.x, c.z - b.z) < 0.2);
    return (behind.length ? behind : far)[0] || null;
  }
  function begin({ near = false, companion = S.companion } = {}) {
    if (S.phase || !people) return false;
    const spot = findSpot(near); if (!spot) return false;
    const rd = role(ROLES.drunk), rg = role(ROLES.girl), rf = role(ROLES.film); if (!rd) return false;
    const L = L0(), fs = fightState(L);
    fs.seen = true; fs.applied = false; fs.morning = false; fs.day = L.clock.day; delete fs.mirror; delete fs.doorman;   // (a second go only ever comes from tools)
    Object.assign(S, { phase: 'notice', t: 0, D: null, F: null, R0: null, filmed: false, companion: companion || null, noticeI: 0, noticeT: 1.5, look: null, gest: null, slide: null, hands: 'down', fall: 0, falling: false, ended: false, came: false, dark: false });
    S.timers.length = 0; S.waits.length = 0;
    const c = S.companion, withHer = c && c.as === 'target';
    names.girl = withHer && c.name ? [c.name.zh || c.name, c.name.en || c.name] : FIGHT_NAMES.girl;
    const d = actor('drunk', rd, spot.x, spot.z, Math.atan2(-0.95, -0.45)); d.anim = 'angry'; d.want = POSE.grab();
    if (!(withHer && c.at)) {                                           // (someone the romance system already has walking beside you stands in for herself)
      const g = actor('girl', (withHer && c.avatar && people.manifest.cast[c.avatar] ? c.avatar : rg) || rd, spot.x - 0.95, spot.z - 0.45, Math.atan2(0.95, 0.45));
      g.anim = 'idle'; g.look = () => [d.x, d.z]; d.look = () => [g.x, g.z]; d.face = g; g.face = d;
    }
    if (rf) { const f = actor('film', rf, spot.x + 4.2, spot.z + 3.4, Math.atan2(-4.2, -3.4)); f.anim = 'idle'; f.look = () => [d.x, d.z]; f.face = d; }
    save && save();
    return true;
  }
  function engage() {
    if (S.phase !== 'notice') return false;
    const d = S.A.drunk, b = player.body;
    S.phase = 'talk'; S.D = createDispute(); S.look = () => headOf(d);
    onMode('fight');
    d.face = b; d.look = () => [b.x, b.z]; d.want = { ...newPose(), roll: 0.04, rate: 4 }; d.anim = 'angry';
    if (S.A.girl) S.A.girl.look = () => [b.x, b.z];
    say(S.companion && S.companion.as === 'target' ? OPEN_WITH : OPEN, () => ask());
    return true;
  }
  function ask() {
    const D = S.D, node = D.node, opts = choices(D);
    S.hands = node === 'shoved' || node === 'threat' ? 'open' : 'down';
    talk.play([{ ask: opts.map((m) => { const p = node === 'help' && SAY_HELP[m] ? SAY_HELP[m] : SAY[m]; return { zh: p[0], en: p[1], set: m }; }) }], { at: whoAt, onDone: (set) => choose(set) });
  }
  function choose(move) {
    const D = S.D, d = S.A.drunk, g = S.A.girl, b = player.body;
    const end = disputeStep(D, move); if (end === null && !D.path.includes(move)) return ask();
    if (move === 'shield' && d) {                                      // you put yourself between them; she gets behind you
      const gx = g ? g.x : d.x - 0.95, gz = g ? g.z : d.z - 0.45, ux = gx - d.x, uz = gz - d.z, ul = Math.hypot(ux, uz) || 1;
      S.slide = { x: d.x + ux / ul * 1.15, z: d.z + uz / ul * 1.15, t: 0, fx: b.x, fz: b.z };
      if (g) { g.goal = { x: d.x + ux / ul * 2.5, z: d.z + uz / ul * 2.5 }; g.speed = 1.6; g.stopAt = 0.2; g.back = false; g.face = d; }
    }
    if (move === 'security' || move === 'police') S.hands = move === 'police' ? 'phone' : S.hands;
    if (move === 'backdown' || move === 'open') S.hands = 'open';
    const lines = AFTER_MOVE[move === 'police' && end && end.fight ? 'snap' : move] || [];
    beats(lines, () => { if (!end) ask(); else if (end.fight) startFight(end); else endTalk(end); });
  }
  function endTalk(end) {
    const d = S.A.drunk, g = S.A.girl;
    S.hands = 'down'; S.look = null;
    if (end.outcome === 'walked') return conclude({ outcome: 'walked', how: 'leave' });
    if (end.outcome === 'security') {
      const gd = S.A.guard; drunkLeaves({ x: -31.5, z: clamp(d.z + 2, STRETCH.z0 + 2, STRETCH.z1 - 2) });
      if (gd) { gd.anim = 'idle'; gd.face = null; gd.look = null; gd.speed = 0.95; gd.stopAt = 1.2; gd.goal = { x: -33, z: d.z + 1 }; }
      after(5, () => girlLeaves());
      return conclude({ outcome: 'security', how: end.how });
    }
    drunkLeaves();
    if (end.outcome === 'police') return policeCalled();
    after(4, () => girlLeaves());
    return conclude({ outcome: end.outcome, how: end.how });
  }
  // you called, nobody was hit: a few minutes, two officers, a form
  function policeCalled() {
    const b = player.body, L = L0();
    travel(async () => {
      skipTo(L, stamp(L) + 8); drop('drunk'); officers(); const g = S.A.girl; if (g) { g.face = b; g.look = () => [b.x, b.z]; }
    }, { line: TP(POLICE_CALLED.line), hold: 900 });
    when(() => !!S.A.cop && S.mode === 'fight', () => {
      S.look = () => headOf(S.A.cop);
      say(POLICE_CALLED.before, () => talk.play([{ ask: POLICE_CALLED.ask }], { at: whoAt, onDone: (set) => say(POLICE_CALLED.after, () => { S.look = null; after(3, () => { girlLeaves(); officersLeave(); }); conclude({ outcome: 'police', how: 'called' }, { statement: set || 'straight', already: 8 }); }) }));
    }, 30);
  }
  function officers() {
    const b = player.body, fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
    for (const [key, side, dist] of [['cop', -0.35, 1.9], ['cop2', 0.75, 2.5]]) {
      if (S.A[key]) continue; const r = role(ROLES[key]); if (!r) continue;
      let x = b.x + fx * dist - fz * side, z = b.z + fz * dist + fx * side;
      if (blocked(x, z, 0.3)) { x = b.x + fx * 1.4; z = b.z + fz * 1.4; }
      const a = actor(key, r, x, z, Math.atan2(b.x - x, b.z - z)); a.face = b; a.look = () => [b.x, b.z]; a.anim = key === 'cop' ? 'talk2' : 'idle';
      dressOfficer(a);
    }
  }
  function officersLeave() { for (const k of ['cop', 'cop2']) { const a = S.A[k]; if (a) { a.face = null; a.look = null; a.anim = 'idle'; a.speed = 1.2; a.solid = false; a.goal = { x: -31.5, z: a.z + 2 + (k === 'cop2' ? 1 : 0) }; } } }

  // ---- blows ----
  const canStand = (x, z) => !blocked(x, z, 0.3) && !onRoad(x, z);
  function startFight(end) {
    const d = S.A.drunk, b = player.body, f = S.A.film;
    S.phase = 'blows'; S.filmed = true; S.hands = 'fists'; S.look = () => headOf(d);
    S.F = createFight({ started: end.started, called: !!end.called, canStand, you: { x: b.x, z: b.z, h: player.yaw + Math.PI }, him: { x: d.x, z: d.z, h: d.h } });
    Object.assign(S.in, { guard: false, away: false, jab: false, cross: false }); S.prevL = S.prevR = false;
    d.driven = true; d.goal = null; d.face = null; d.solid = false; d.anim = 'idle'; d.look = () => [b.x, b.z];
    if (f) { f.p.setPhoneHold(1); f.filming = true; }                    // the phone comes up
    girlLeaves();
    el.classList.add('on'); hintEl.textContent = TP(HINT); hintEl.classList.add('on'); S.hintT = 7;
    if (end.started === 'him') bark(BARKS.start, 1.6);
    after(1.6, () => { if (S.phase === 'blows') bark(BARKS.crowd, 1.8); });
  }
  function fightEvents(ev) {
    const h = player.head;
    for (const e of ev) {
      if (e.type === 'tell') { snd('grunt', e.attack === 'haymaker' ? 1 : 0.7); snd('scuff', 0.6); }
      else if (e.type === 'strike') snd(e.attack === 'shove' ? 'swish' : 'whoosh');
      else if (e.type === 'swing') { snd('swish', e.kind === 'cross' ? 1 : 0.7); S.cam.fwd += e.kind === 'cross' ? 0.8 : 0.35; }
      else if (e.type === 'dodge') { snd('scuff'); h.roll += -e.dir * 0.09; h.dipV -= 0.45; }
      else if (e.type === 'spent') snd('gasp', 0.6);
      else if (e.type === 'whiff' && e.by === 'him' && e.slip) { S.cam.roll += 0.03; }
      else if (e.type === 'hit' && e.on === 'him') {
        snd(e.glancing ? 'glance' : e.kind === 'cross' ? 'heavy' : 'hit', e.counter ? 1.15 : 1);
        S.cam.pitch -= e.glancing ? 0.008 : e.kind === 'cross' ? 0.03 : 0.014; h.dipV -= e.kind === 'cross' && !e.glancing ? 0.3 : 0.1;   // it comes back up your arm
        if (e.cheap) bark(BARKS.cheap, 2);
      } else if (e.type === 'hit' && e.on === 'you') {
        const big = e.attack === 'haymaker', side = Math.random() < 0.5 ? -1 : 1;
        if (e.blocked) { snd('block', big ? 1 : 0.7); flash('block', big ? 1 : 0.6); h.dipV -= big ? 0.5 : 0.25; S.cam.pitch += 0.02; if (audio && audio.cue) audio.cue('bump', 0, 0.6); }
        else {
          snd(e.attack === 'shove' ? 'block' : big ? 'heavy' : 'hit', 1.2); snd('gasp', 0.9); if (e.attack === 'shove' && audio && audio.cue) audio.cue('bump', 0, 1);
          flash('hit', e.attack === 'shove' ? 0.35 : big ? 1 : 0.7);
          h.dipV -= big ? 1.5 : e.attack === 'shove' ? 0.9 : 0.8; h.roll += side * (big ? 0.2 : 0.08);
          S.cam.yaw += e.attack === 'shove' ? 0 : side * (big ? 0.5 : 0.2); S.cam.pitch += e.attack === 'shove' ? 0.12 : big ? 0.16 : 0.08; S.cam.roll += side * (big ? 0.16 : 0.05);
        }
      } else if (e.type === 'react') {
        if (e.to === 'stagger') bark(BARKS.stagger, 1.2); else if (e.to === 'gassed') bark(BARKS.gassed, 2); else if (e.to === 'yield') bark(BARKS.yield, 2.2); else if (e.to === 'down') snd('fall');
      }
    }
  }
  function stepBlows(dt) {
    const F = S.F, b = player.body, I = player.input;
    const inp = { f: (I.f ? 1 : 0) - (I.b ? 1 : 0), h: player.yaw + Math.PI, guard: S.in.guard, away: S.in.away, jab: S.in.jab, cross: S.in.cross, dodge: I.l && !S.prevL ? -1 : I.r && !S.prevR ? 1 : 0 };
    S.prevL = I.l; S.prevR = I.r; S.in.jab = S.in.cross = false;
    if (!S.hold) fightEvents(stepFight(F, dt, inp));                 // (hold: tools stop the clock to look at a pose)
    b.x = F.you.x; b.z = F.you.z; b.vx = b.vz = 0;
    const d = S.A.drunk;
    if (d) { const sp = Math.hypot(F.him.x - d.x, F.him.z - d.z) / Math.max(dt, 1e-3); d.v += (Math.min(sp, 2) - d.v) * Math.min(1, dt * 8); d.back = F.him.act === 'backoff' || F.him.act === 'stagger'; d.x = F.him.x; d.z = F.him.z; d.h = F.him.h; }
    const k = (v) => Math.round(clamp(v / 100, 0, 1) * 100) / 100;
    hpBar.firstChild.style.transform = `scaleX(${k(F.you.hp)})`; stBar.firstChild.style.transform = `scaleX(${k(F.you.st)})`;
    hpBar.classList.toggle('low', F.you.hp < 40); stBar.classList.toggle('low', F.you.st < 20);
    if (S.hintT > 0 && (S.hintT -= dt) <= 0) hintEl.classList.remove('on');
    if (F.over) endBlows();
  }
  function endBlows() {
    const F = S.F, d = S.A.drunk, b = player.body;
    const R0 = S.R0 = { ...fightSummary(F), filmed: true };
    S.phase = 'after'; S.hands = R0.outcome === 'down' ? 'down' : 'open'; el.classList.remove('on'); hintEl.classList.remove('on');
    Object.assign(S.in, { guard: false, away: false, jab: false, cross: false });
    if (d) { d.driven = false; d.v = 0; d.back = false; d.face = b; }
    const sep = R0.outcome === 'separated' || R0.outcome === 'down';
    if (sep) {                                                         // the hotel's security gets there
      const g = S.A.guard || actor('guard', role(ROLES.guard), DOOR.x + 1.2, DOOR.z + 0.2, 0);
      g.speed = 3; g.stopAt = 0.9; g.goal = { x: (b.x + d.x) / 2 + 0.5, z: (b.z + d.z) / 2 + 0.4 }; g.face = d; g.look = () => [d.x, d.z]; g.anim = 'talk1';
    }
    if (R0.outcome === 'down') { S.falling = true; S.look = null; snd('fall'); if (d) d.want = POSE.stance(); }
    else if (R0.how === 'dropped') { if (d) { d.lyingTo = 1; d.want = POSE.flat(); d.look = null; d.face = null; } }
    else if (R0.outcome === 'won') { if (d) d.want = R0.how === 'spent' ? POSE.spent() : POSE.palms(); }
    else if (R0.outcome === 'broke') { S.look = null; if (d) d.want = POSE.stance(); }
    else if (d) { d.want = POSE.spent(); d.goal = { x: d.x + (d.x - b.x) * 0.7, z: d.z + (d.z - b.z) * 0.7 }; d.back = true; d.speed = 1.2; }
    after(R0.outcome === 'down' ? 1.3 : 0.7, () => say(aftermath(R0), () => {
      if (R0.outcome === 'won' && R0.how !== 'dropped') drunkLeaves();
      if (policeCome(R0)) policeAfter(R0); else conclude(R0);
    }));
  }
  // the officers after blows: who started it, what you say, what they decide
  function policeAfter(R0) {
    const L = L0(), P = policeScene(R0), hosp = R0.outcome === 'down';
    const scene2 = () => {
      S.look = hosp ? null : () => headOf(S.A.cop);
      say(P.before, () => talk.play([{ ask: P.ask }], { at: whoAt, onDone: (set) => {
        const st = set || 'straight', Vd = policeVerdict({ ...R0, filmed: true }, st);
        say(verdictLines(R0, Vd), () => conclude(R0, { statement: st, already: hosp ? 0 : 10 }));
      } }));
    };
    if (hosp) { dark.querySelector('span').textContent = TP(P.line); dark.classList.add('on'); S.dark = true; after(1.6, () => { for (const k of Object.keys(S.A)) drop(k); scene2(); }); return; }
    travel(async () => { skipTo(L, stamp(L) + 10); officers(); drop('guard'); S.fall = 0; S.falling = false; }, { line: TP(P.line), hold: 900 });
    when(() => !!S.A.cop && S.mode === 'fight', scene2, 30);
  }

  // ---- how it ends: worked out, applied once, told to whoever listens ----
  function conclude(R0, { statement = 'straight', already = 0 } = {}) {
    if (S.ended) return; S.ended = true;
    const L = L0(), c = S.companion;
    const R = settle({ ...R0, filmed: S.filmed || !!R0.filmed, called: !!(R0.called || (S.D && S.D.called)), shoved: S.D ? S.D.shoves : 0 }, { statement, companion: c ? { id: c.id, as: c.as } : null });
    const applied = applyOutcome(L, R);
    if (applied) {
      for (const fn of listeners) { try { fn(R, L); } catch (e) { console.error(e); } }
      if (R.companionWrites === false) fightState(L).result.companionWrites = false;   // (the system that owns her will write in her own words)
      if (c && c.name) fightState(L).names = { [c.id]: c.name.zh || c.name };
    }
    S.last = R;
    const left = Math.max(0, R.minutes - already), line = lostTime(R, clockText((stamp(L) + left) % 1440));
    const done = () => { S.look = null; S.hands = 'down'; const cl = closing(R); if (cl[0]) hud.thought(cl[0], cl[1]); save && save(); };
    if (R.outcome === 'passed') { S.phase = 'end'; S.endT = 0; save && save(); return; }
    if (left > 0 && (R.police || R.hospital)) {                        // the station (and A&E): you come out hours later, at the hotel door
      S.phase = 'gone';
      travel(async () => {
        skipTo(L, stamp(L) + left); for (const k of Object.keys(S.A)) drop(k);
        dark.classList.remove('on'); S.dark = false; S.fall = 0; S.falling = false; el.classList.remove('on');
        if (R.blows) player.teleport(DOOR.x, DOOR.z + 1.4, 0, 0);          // (nobody hit: the form is filled in where you stand)
        S.phase = null; S.check = 5;
      }, { line: TP(line), hold: 1500, to: 'play' });
      when(() => S.mode === 'play', done, 30);
      return;
    }
    if (left > 0) skipTo(L, stamp(L) + left);
    S.phase = 'end'; S.endT = 0;
    onMode('play'); done();
  }
  function cleanup() { for (const k of Object.keys(S.A)) drop(k); S.phase = null; S.check = 5; S.timers.length = 0; S.waits.length = 0; el.classList.remove('on'); dark.classList.remove('on'); }

  // ---- your own hands (the first-person body: world/playerBody.js), and the camera's part ----
  const HANDS = {
    open: { w: 1, L: V(-0.21, -0.3, 0.42), R: V(0.21, -0.3, 0.42), fist: 0, rate: 7 },
    phone: { w: 1, L: V(-0.3, -0.62, 0.1), R: V(0.12, -0.2, 0.34), fist: 0.5, rate: 6, oneArm: 'R' },
    fists: { w: 1, L: V(-0.14, -0.2, 0.4), R: V(0.15, -0.24, 0.33), fist: 1, rate: 12 },
    guard: { w: 1, L: V(-0.075, -0.085, 0.3), R: V(0.085, -0.115, 0.27), fist: 1, rate: 18 },
    hurt: { w: 1, L: V(-0.22, -0.4, 0.3), R: V(0.22, -0.42, 0.28), fist: 0.6, rate: 14 },
    away: { w: 1, L: V(-0.23, -0.14, 0.44), R: V(0.23, -0.14, 0.44), fist: 0, rate: 9 },
    down: { w: 0, L: V(-0.2, -0.6, 0.1), R: V(0.2, -0.6, 0.1), fist: 0, rate: 6 },
  };
  let mine = null;                                                     // { rig, pose }
  const _cr = new THREE.Vector3(), _cu = new THREE.Vector3(), _cf = new THREE.Vector3(), _yr = new THREE.Vector3(), _yf = new THREE.Vector3();
  function myHands(dt) {
    const pb = getPlayerBody(); if (!pb || !pb.body) return;
    if (!mine) mine = { rig: rig(pb.body), pose: newPose() };
    if (!mine.rig.ok) return;
    let want = HANDS[S.hands] || HANDS.down, ext = null;
    const F = S.F;
    if (S.phase === 'blows' && F) {
      const Y = F.you;
      want = Y.act === 'hurt' || Y.act === 'stagger' ? HANDS.hurt : S.in.away && Y.act === 'ready' ? HANDS.away : Y.guard || Y.act === 'dodge' ? HANDS.guard : HANDS.fists;
      if (Y.act === 'jab' || Y.act === 'cross') {                        // the arm goes out to where his head is and comes back slower
        const P = FIGHT[Y.act], hit = P.hitAt * (Y.slow || 1), k = Y.at < hit ? smooth(Y.at / hit) : 1 - smooth((Y.at - hit) / (Y.dur - hit));
        ext = { s: Y.hand, k };
      }
    }
    if (want.w === 0 && mine.pose.w < 0.02) { mine.pose.w = 0; return; }
    easePose(mine.pose, want, dt);
    camera.updateMatrixWorld();
    _cr.setFromMatrixColumn(camera.matrixWorld, 0); _cu.setFromMatrixColumn(camera.matrixWorld, 1); _cf.setFromMatrixColumn(camera.matrixWorld, 2).negate();
    _yr.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw)); _yf.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    const P = mine.pose, G = mine.rig;
    for (const s of ['L', 'R']) {
      if (want.oneArm && want.oneArm !== s && P.w > 0.5 && S.hands === 'phone') continue;
      const off = P[s];
      _tg.copy(camera.position).addScaledVector(_cr, off.x).addScaledVector(_cu, off.y).addScaledVector(_cf, off.z);
      if (ext && ext.s === s) {
        const d = S.A.drunk, tgt = d ? headOf(d) : _t.copy(camera.position).addScaledVector(_cf, 1);
        tgt.y -= 0.06; _t.copy(tgt).sub(camera.position); _t.setLength(Math.min(_t.length() - 0.08, 0.86));
        _tg.lerp(_t.add(camera.position), ext.k);
      }
      _pole.copy(_yr).multiplyScalar(s === 'R' ? 0.55 : -0.55).addScaledVector(UP, -1).addScaledVector(_yf, -0.15).normalize();
      reach(G[s], _tg, _pole, P.w);
      fist(G, s, P.fist * P.w);
    }
    pb.body.updateMatrixWorld(true);
  }
  function cameraPart(dt) {
    const C = S.cam;
    if (S.phase === 'blows' || S.phase === 'after' || S.phase === 'talk') {
      const k = Math.exp(-9 * dt); C.yaw *= k; C.pitch *= k; C.roll *= k; C.fwd *= Math.exp(-7 * dt);
    } else { C.yaw = C.pitch = C.roll = C.fwd = 0; }
    let lean = 0, side = 0, twist = 0;
    const F = S.F;
    if (S.phase === 'blows' && F) {
      const Y = F.you;
      if (Y.act === 'jab' || Y.act === 'cross') { const P = FIGHT[Y.act], hit = P.hitAt * (Y.slow || 1), k = Y.at < hit ? smooth(Y.at / hit) : 1 - smooth((Y.at - hit) / (Y.dur - hit)); lean = (Y.act === 'cross' ? 0.2 : 0.11) * k; twist = (Y.act === 'cross' ? -0.05 : 0.02) * k; }
      if (Y.act === 'dodge') side = Math.sin(Math.PI * clamp(Y.at / Y.dur, 0, 1)) * Y.dir;
    }
    if (lean || C.yaw || C.pitch || C.roll || side || C.fwd > 0.001) {
      const yaw = player.yaw;
      lean += C.fwd * 0.03; camera.position.x += -Math.sin(yaw) * lean + Math.cos(yaw) * side * 0.06; camera.position.z += -Math.cos(yaw) * lean - Math.sin(yaw) * side * 0.06; camera.position.y -= lean * 0.18 + Math.abs(side) * 0.1;
      camera.rotation.y += C.yaw; camera.rotation.x = clamp(camera.rotation.x + C.pitch, -1.5, 1.5); camera.rotation.z += C.roll - side * 0.12 + twist;
    }
    if (S.falling || S.fall > 0) {                                     // going down: the street comes up sideways
      S.fall = Math.min(1, S.fall + (S.falling ? dt / 0.75 : -dt));
      const e = smooth(S.fall);
      camera.position.y -= 1.32 * e; camera.rotation.z += 1.25 * e; camera.rotation.x += 0.25 * e;
    }
  }

  // ---- keys and the mouse ----
  function key(code) {
    if (S.phase === 'blows') {
      if (code === 'KeyF' || code === 'KeyE') S.in.jab = true;
      else if (code === 'KeyR' || code === 'KeyP') S.in.cross = true;
      else if (code === 'Space' || code === 'KeyT') S.in.guard = true;
      else if (code === 'KeyQ' || code === 'Escape') S.in.away = true;
      else return false;
      return true;
    }
    return talk.key(code);
  }
  window.addEventListener('keyup', (e) => { if (e.code === 'Space' || e.code === 'KeyT') S.in.guard = false; if (e.code === 'KeyQ' || e.code === 'Escape') S.in.away = false; });
  window.addEventListener('blur', () => { S.in.guard = false; S.in.away = false; });
  window.addEventListener('mousedown', (e) => {
    if (S.phase !== 'blows') return;
    if (e.button === 0) S.in.jab = true; else if (e.button === 2) S.in.cross = true;
    if (canvas && document.pointerLockElement !== canvas && e.target === canvas) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch { /* drag-look */ } }
  });
  window.addEventListener('contextmenu', (e) => { if (S.phase === 'blows') e.preventDefault(); });

  // ---- each frame ----
  function update(dt, { mode = 'play' } = {}) {
    S.mode = mode;
    if (dt <= 0) return;
    const L = L0(), b = player.body;
    talk.update(dt);
    for (let i = S.timers.length - 1; i >= 0; i--) { const tm = S.timers[i]; if ((tm.t -= dt) <= 0) { S.timers.splice(i, 1); tm.fn(); } }
    if (mode !== 'travel') for (let i = S.waits.length - 1; i >= 0; i--) { const w = S.waits[i]; if (w.test() || (w.t -= dt) <= 0) { S.waits.splice(i, 1); w.fn(); } }
    if (!S.phase) return idle(dt, L, b, mode);
    S.t += dt;
    const d = S.A.drunk;
    if (S.phase === 'notice') {
      const dist = d ? Math.hypot(b.x - d.x, b.z - d.z) : 99;
      if (dist < 17 && (S.noticeT -= dt) <= 0 && mode === 'play') { const line = NOTICE[S.noticeI % NOTICE.length]; if (S.A[line[0]] || whoAt(line[0])) bark(line, 3); S.noticeI++; S.noticeT = 3.7; if (S.A.girl && line[0] === 'girl') S.A.girl.anim = 'angry'; }
      if (dist < 9) S.came = true;
      if ((S.came && dist > 34) || dist > 70 || S.t > 170) conclude({ outcome: 'passed', how: S.came ? 'by' : 'unseen' });
    } else if (S.phase === 'talk' || S.phase === 'after' || S.phase === 'blows') {
      if (S.gest) stepGest(dt);
      if (S.slide) { const sl = S.slide; sl.t = Math.min(1, sl.t + dt / 0.7); const e = smooth(sl.t); if (!blocked(sl.x, sl.z, 0.3)) { b.x = sl.fx + (sl.x - sl.fx) * e; b.z = sl.fz + (sl.z - sl.fz) * e; } if (sl.t >= 1) S.slide = null; }
      if (S.phase === 'blows') stepBlows(dt);
      if (S.look && !S.falling) {                                      // your eyes stay on him (the mouse still moves them; they come back)
        const p = S.look(), dx = p.x - camera.position.x, dz = p.z - camera.position.z, hz = Math.hypot(dx, dz) || 1;
        const k = Math.min(1, dt * (S.phase === 'blows' ? 7 : 3.2));
        player.yaw += wrap(Math.atan2(-dx, -dz) - player.yaw) * k;
        player.pitch += (clamp(Math.atan2(p.y - 0.12 - camera.position.y, hz), -0.5, 0.4) - player.pitch) * k;
      }
    } else if (S.phase === 'end') {                                    // they go their ways; when you can't see them, they're gone
      S.endT += dt;
      const far = Object.values(S.A).every((a) => Math.hypot(a.x - b.x, a.z - b.z) > 30 || (!a.goal && S.endT > 25));
      if (S.endT > 70 || (S.endT > 6 && far) || !Object.keys(S.A).length) cleanup();
      else if (S.endT > 14) for (const a of Object.values(S.A)) if (!a.goal && !a.sent) { a.sent = true; a.face = null; a.look = null; a.solid = false; if (a.filming) { a.p.setPhoneHold(0); a.filming = false; } a.want = a.want ? { ...newPose(), rate: 3 } : null; a.lyingTo = 0; a.speed = 1.1; a.goal = { x: a.x + (a.key === 'film' ? 40 : -40), z: clamp(a.z, STRETCH.z0 + 2, STRETCH.z1 - 2) }; }
    }
  }
  // his hands on your chest, in the talk: pulled in, out, and you go back a step
  function stepGest(dt) {
    const g = S.gest, d = S.A.drunk, b = player.body; if (!d) { S.gest = null; g.cont(); return; }
    g.t += dt;
    const dd = Math.hypot(b.x - d.x, b.z - d.z);
    if (g.t < 0.5 && dd > 1.0) { const s = Math.min(1.6 * dt, dd - 1.0); d.x += (b.x - d.x) / dd * s; d.z += (b.z - d.z) / dd * s; d.v = 1.2; } else d.v = 0;
    d.driven = true;
    d.want = drunkPose(g.t < 0.5 ? { act: 'windup', attack: 'shove', at: g.t, dur: 0.5 } : g.t < 0.66 ? { act: 'strike', attack: 'shove', at: g.t - 0.5, dur: 0.16 } : { act: 'recover', attack: 'shove', at: g.t - 0.66, dur: 0.7 }, camera.position);
    if (g.t >= 0.5 && !g.hit) {
      g.hit = true; snd('swish'); if (audio && audio.cue) audio.cue('bump', 0, 1); snd('block', 0.7 * g.power);
      player.head.dipV -= 0.9 * g.power; S.cam.pitch += 0.1 * g.power; flash('hit', 0.28 * g.power);
      const nx = b.x + (b.x - d.x) / dd * 0.55 * g.power, nz = b.z + (b.z - d.z) / dd * 0.55 * g.power; if (canStand(nx, nz)) { b.x = nx; b.z = nz; }
    }
    if (g.t >= 1.25) { S.gest = null; d.driven = false; d.want = S.D && S.D.node === 'threat' ? POSE.stance() : { ...newPose(), roll: 0.04, rate: 4 }; g.cont(); }
  }
  // nothing going on: may it begin? and the days after
  function idle(dt, L, b, mode) {
    const fs = L.flags.fight;
    if ((S.morningT -= dt) <= 0) {
      S.morningT = 1.5;
      if (fs && fs.seen && !fs.applied) { applyOutcome(L, settle({ outcome: 'passed', how: 'unseen' })); save && save(); }   // (a game closed in the middle of it: you weren't there)
      if (fs && fs.applied) {
        if (morningAfter(L, fs.names || {}).length) save && save();
        if (mode === 'play' && isFree() && stamp(L) >= fs.morningAt) {
          const hu = hurt(L);
          if (hu && !fs.mirror) { fs.mirror = true; const inj = INJURY[hu.level]; hud.thought(MIRROR[0] + inj.zh + '。', `${MIRROR[1]}${inj.en}.`); save && save(); }
          else if (!fs.doorman && b.y < 1 && Math.hypot(b.x - DOORMAN.x, b.z - DOORMAN.z) < 4.5) {
            fs.doorman = true; const ln = doormanLine(fs.result, hu ? hu.level : 0);
            hud.bark({ speaker: { zh: FIGHT_NAMES.doorman[0], en: FIGHT_NAMES.doorman[1] }, text: { zh: ln[0], en: ln[1] }, voice: false, seconds: 4.2 }); save && save();
          }
        }
      }
    }
    if (!enabled || !people || mode !== 'play') return;
    if ((S.check -= dt) > 0) return;
    S.check = 4;
    if (!mayBegin(L) || !isFree()) return;
    if (b.y > 1 || b.x < STRETCH.x0 || b.x > STRETCH.x1 || b.z < STRETCH.z0 || b.z > STRETCH.z1) return;
    begin();
  }
  // after the player's body has been posed and the camera placed: the people, your hands, the kicks
  function late(dt) {
    if (dt <= 0 || (!S.phase && !Object.keys(S.A).length)) return;
    cameraPart(dt);
    const d = S.A.drunk, F = S.F;
    if (d) {
      if (d.lyingTo != null) d.lying += (d.lyingTo - d.lying) * Math.min(1, dt * 2.2);
      if (S.phase === 'blows' && F) d.want = drunkPose({ act: F.him.act, at: F.him.at, dur: F.him.dur, attack: F.him.attack, yielding: F.him.yielding }, camera.position);
      { const sway = d.lying > 0.2 ? 0 : S.phase === 'blows' ? 0.035 : 0.055; d.sway = Math.sin(d.t * 1.3) * sway + Math.sin(d.t * 0.73 + 1) * sway * 0.6; }   // he's had a lot
    }
    for (const a of Object.values(S.A)) stepActor(a, dt);
    if (S.phase === 'talk' || S.phase === 'blows' || S.phase === 'after' || (mine && mine.pose.w > 0.02)) myHands(dt);
  }

  const api = {
    get active() { return S.phase; },
    get busy() { return !!S.phase && S.phase !== 'end'; },
    get last() { return S.last; },
    // someone is with you tonight (the romance system says who): { id, as: 'target' | 'witness', name: { zh, en },
    // avatar: a role in people.json (used if she has no body of her own here), at: () => ({ x, z }) | null }
    setCompanion(c) { S.companion = c && c.id ? c : null; },
    // fn(result, life) once it's over and applied. result: engine/fight.js settle(). Set result.companionWrites = false
    // to send the companion's morning message yourself.
    onOutcome(fn) { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; },
    others() { return Object.values(S.A).map((a) => ({ x: a.x, z: a.z, vx: 0, vz: 0 })); },
    update, late, key,
    // E (main.js places)
    candidates() { const d = S.A.drunk; if (S.phase !== 'notice' || !d) return []; const h = headOf(d); return [{ id: 'confront:step', x: h.x, y: h.y - 0.2, z: h.z, reach: 3.6, cone: 0.55, ignore: ['confront:drunk', 'confront:girl'] }]; },
    owns: (id) => id === 'confront:step',
    prompt: () => ({ target: TP(PROMPT.target), action: TP(PROMPT.action) }),
    interact: () => engage(),
    // tools: start it here and now, whatever the hour; drive it by state
    debug: {
      state: S,
      start(opts = {}) { if (S.phase) cleanup(); const L = L0(); delete L.flags.fight; S.last = null; return begin({ near: true, ...opts }); },
      engage, choose: (m) => { if (talk.asking) talk.stop(); return choose(m); },
      get fight() { return S.F; }, get dispute() { return S.D; }, get asking() { return talk.asking; }, get talking() { return talk.active; },
      get actors() { return S.A; }, cleanup,
      // tools: stand some of the cast in a row in front of you, to choose who plays whom
      lineup(roles, officer = false) { const b = player.body, fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw); roles.forEach((r, i) => { const s = (i - (roles.length - 1) / 2) * 0.8, x = b.x + fx * 2.6 - fz * s, z = b.z + fz * 2.6 + fx * s; const a = actor(`line${i}`, r, x, z, Math.atan2(b.x - x, b.z - z)); if (officer) dressOfficer(a); }); S.phase = S.phase || 'end'; S.endT = -1e6; },
    },
  };
  return api;
}
