// Street moments (phase 4.3): small things that happen to you out on the street, now and then, each
// with real people (Rocketbox avatars), recorded voices and, where you have something to do, a short
// side quest in the journal:
//   lost     a visitor from abroad looking for the metro on Nanjing Road (walk him to the station, or
//            point the way), or asking the way to the shopping street on the Bund
//   photo    a couple at the railing ask you to take their picture with the Pearl behind them: you
//            frame it yourself (Space or a click), they tell you if you cut their heads off
//   phone    someone walking past drops their phone; pick it up and get it back to them
// At most one at a time, each at most once a day, at the hours they'd happen, never in the middle of
// something else. Off for measurement tools (?q=) unless ?moments.
import * as THREE from 'three';
import { createPerson } from './people.js';
import { groundHeight, METRO, NJ, addDynamicCollider } from './layout.js';
import { blocked } from '../engine/crowd.js';
import { questState } from '../engine/quests.js';
import { receive } from '../engine/life.js';
import { getLang } from '../ui/i18n.js';
import { PEARL } from './skyline.js';

const T = (zh, en) => (getLang() === 'zh' ? zh : en);
const B = (zh, en) => ({ zh, en });
const M = (L) => (L.flags.moments || (L.flags.moments = {}));

// ---- what you can be asked to do: side quests (engine/quests.js) ----
export const MOMENT_QUESTS = [
  { id: 'm-lost', giver: 'tourist', title: B('迷路的游客', 'A lost visitor'),
    summary: B('一位外国游客在南京路上找地铁站。', 'A visitor from abroad is looking for the metro on Nanjing Road.'),
    start: (L) => M(L).lost === 'walk', onStart: (L) => { questState(L).tracked = 'm-lost'; },
    fail: (L) => M(L).lost === 'gone',
    steps: [{ id: 'walk', text: B('带他走到南京东路站的入口', 'Walk him to the entrance of East Nanjing Road station'), target: (L) => M(L).lostTo || null, done: (L) => M(L).lost === 'arrived' }] },
  { id: 'm-photo', giver: 'couple', title: B('帮忙拍照', 'Take our photo'),
    summary: B('江边一对情侣想请你帮他们和东方明珠合个影。', 'A couple at the railing would like a picture with the Pearl behind them.'),
    start: (L) => M(L).photo === 'framing', onStart: (L) => { questState(L).tracked = 'm-photo'; },
    fail: (L) => M(L).photo === 'declined',
    steps: [{ id: 'shoot', text: B('把两个人和东方明珠都拍进去（空格 / 点击）', 'Get both of them and the Pearl in the frame (Space / click)'), done: (L) => M(L).photo === 'done' }] },
  { id: 'm-phone', giver: 'owner', title: B('捡到的手机', 'A dropped phone'),
    summary: B('有人在江边掉了手机，自己还没发现。', 'Someone dropped their phone on the promenade and hasn\'t noticed.'),
    start: (L) => M(L).phone === 'found', onStart: (L) => { questState(L).tracked = 'm-phone'; },
    fail: (L) => M(L).phone === 'gone',
    steps: [{ id: 'return', text: B('把手机还给失主（穿深色外套，往前走了）', 'Give the phone back to its owner (dark jacket, walked on ahead)'), target: (L) => M(L).ownerAt || null, done: (L) => M(L).phone === 'returned' }] },
];

// ---- the lines (recorded: tools/voice/extract.mjs finds [who, zh, en]) ----
const LOST_METRO = [
  ['tourist', '不好意思……请问，地铁二号线，南京东路站，怎么走？', 'Excuse me, sorry. Line 2, East Nanjing Road station, which way is it?'],
  ['tourist', '我的地图一直在转圈。', 'My map keeps spinning round.'],
];
const LOST_BUND = [['tourist', '你好！请问南京路步行街往哪边走？', 'Hi! Which way is the Nanjing Road shopping street?']];
const LOST_THANKS = ['tourist', '太好了，谢谢你！', 'Brilliant, thank you!'];
const LOST_NO = ['tourist', '没关系，还是谢谢你。', 'No worries, thanks anyway.'];
const LOST_FOLLOW = ['tourist', '好的，我跟着你。', 'Great, I\'ll follow you.'];
const LOST_HERE = ['tourist', '就是这里！太感谢了，祝你玩得开心！', 'This is it! Thank you so much. Have a lovely evening!'];
const LOST_WAIT = ['tourist', '等等我！', 'Wait for me!'];
const LOST_HAIL = ['tourist', '你好，请问……', 'Hello, excuse me…'];
const PHOTO_ASK = ['couple', '你好！能帮我们拍张照吗？要把东方明珠拍进去！', 'Hi! Could you take a photo of us? With the Pearl in it!'];
const PHOTO_GOOD = ['couple', '哇，拍得真好！谢谢你！', 'Oh, that\'s lovely! Thank you!'];
const PHOTO_PEARL = ['couple', '能把东方明珠也拍进去吗？', 'Could you get the Pearl in too?'];
const PHOTO_CUT = ['couple', '诶，我们的头被切掉了……再来一张？', 'Oh, you\'ve cut our heads off. One more?'];
const PHOTO_FAR = ['couple', '可以再近一点吗？', 'Could you come a bit closer?'];
const PHOTO_MEH = ['couple', '没关系，就这样吧，谢谢！', 'That\'s fine, it\'ll do. Thanks!'];
const PHOTO_BYE = ['couple', '好吧，没事，谢谢。', 'Oh, okay. Thanks anyway.'];
const PHONE_BACK = [
  ['owner', '诶？这是我的手机！我还以为丢了！', 'Hey, that\'s my phone! I thought I\'d lost it!'],
  ['owner', '太谢谢你了。我请你喝杯咖啡吧？', 'Thank you so much. Let me buy you a coffee?'],
];
const PHONE_COFFEE = ['owner', '我转给你了，拿着拿着。', 'There, I\'ve sent it. Go on, take it.'];
const PHONE_NO = ['owner', '好人啊，谢谢谢谢！', 'You\'re a good one. Thanks, really!'];
export const MOMENT_LINES = [...LOST_METRO, ...LOST_BUND, LOST_THANKS, LOST_NO, LOST_FOLLOW, LOST_HERE, LOST_WAIT, LOST_HAIL, PHOTO_ASK, PHOTO_GOOD, PHOTO_PEARL, PHOTO_CUT, PHOTO_FAR, PHOTO_MEH, PHOTO_BYE, ...PHONE_BACK, PHONE_COFFEE, PHONE_NO];

// who's speaking, on screen (main.js gives sceneTalk these too)
export const MOMENT_NAMES = { tourist: ['游客', 'Visitor'], couple: ['路人', 'Passer-by'], owner: ['路人', 'Passer-by'] };
const ROLES = { tourist: ['c5', 'c6', 'c7', 'p4'], couple: [['c1', 'p1'], ['c3', 'c6'], ['p2', 'p3']], owner: ['p1', 'p3', 'c6', 'c7'] };
const turnTo = (h, want, k) => { let d = want - h; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return h + d * Math.min(1, k); };
const onDeck = (b) => b.y > 2 && b.x > 3 && b.x < 25.5;
const onNanjing = (b) => b.x < -60 && b.x > NJ.xWest && Math.abs(b.z - NJ.zc) < 9;

export function createMoments({ scene, people, player, camera, canvas, hud, audio, voice, sceneTalk, getLife, save, getHour, isFree, enabled = true }) {
  const S = { cool: 150, check: 3, cur: null, framing: null, flash: 0 };
  const L0 = () => getLife();
  const day = () => L0().clock.day;
  const done = (id) => { const m = M(L0()); return (m.days || {})[id] === day(); };
  const markDone = (id) => { const m = M(L0()); (m.days || (m.days = {}))[id] = day(); save && save(); };
  const pickRole = (list) => { const ok = list.filter((r) => (Array.isArray(r) ? r.every((x) => people.manifest.cast[x]) : people.manifest.cast[r])); return ok[Math.floor(Math.random() * ok.length)]; };

  // ---- people of the moment: a person who stands, turns to you, walks somewhere, follows you ----
  function actor(role, x, z, h) {
    const p = createPerson(people, role);
    p.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(p.root);
    const a = { p, x, z, y: groundHeight(x, z, 9), h, goal: null, speed: 1.25, stopAt: 0.5, anim: 'idle', look: null, v: 0, box: addDynamicCollider('npc'), follow: false };
    p.root.position.set(a.x, a.y, a.z); p.root.rotation.y = h;
    return a;
  }
  function drop(a) {
    if (!a) return;
    scene.remove(a.p.root); a.p.root.traverse((o) => { if (o.isSkinnedMesh) o.skeleton.dispose(); });
    a.box.minX = a.box.maxX = 1e6;
  }
  function stepActor(a, dt, pp) {
    let moving = false;
    if (a.follow && pp) {                                     // a step behind you, to your side
      const d = Math.hypot(pp.x - a.x, pp.z - a.z);
      a.goal = d > 2.2 ? { x: pp.x, z: pp.z } : null; a.stopAt = 1.8;
      a.speed = d > 8 ? 2.4 : d > 4 ? 1.7 : 1.3;
    }
    if (a.goal) {
      const dx = a.goal.x - a.x, dz = a.goal.z - a.z, d = Math.hypot(dx, dz);
      if (d > a.stopAt) {
        const sp = Math.min(a.speed, d * 1.5), nx = a.x + (dx / d) * sp * dt, nz = a.z + (dz / d) * sp * dt;
        if (!blocked(nx, nz, 0.25)) { a.x = nx; a.z = nz; } else if (!blocked(nx, a.z, 0.25)) a.x = nx; else if (!blocked(a.x, nz, 0.25)) a.z = nz;
        a.h = turnTo(a.h, Math.atan2(dx, dz), dt * 6); moving = true; a.v = sp;
      } else if (!a.follow) a.goal = null;
    }
    if (!moving) a.v = 0;
    if (!moving && a.face) a.h = turnTo(a.h, Math.atan2(a.face.x - a.x, a.face.z - a.z), dt * 4);
    a.y = groundHeight(a.x, a.z, a.y + 0.5);
    a.p.play(moving ? 'walk' : a.anim, 0.3); a.p.setGait(a.v);
    a.p.root.position.set(a.x, a.y, a.z); a.p.root.rotation.y = a.h;
    a.p.update(dt, a.look);
    const b = a.box; b.minX = a.x - 0.22; b.maxX = a.x + 0.22; b.minZ = a.z - 0.22; b.maxZ = a.z + 0.22; b.y0 = a.y - 0.5; b.y1 = a.y + 1.9;
  }
  const head = (a) => { const v = new THREE.Vector3(); if (a.p.bones.head) a.p.bones.head.getWorldPosition(v); else v.set(a.x, a.y + 1.6, a.z); return v; };
  const say = (a, line) => { const [who, zh, en] = line; const h = head(a); voice.say({ zh, en, who, at: [h.x, h.y, h.z] }); hud.bark({ speaker: { zh: MOMENT_NAMES[who][0], en: MOMENT_NAMES[who][1] }, text: { zh, en }, voice: false, seconds: 3.4 }); };
  const talkWith = (a, script, onDone) => sceneTalk.play(script, { at: () => { const h = head(a); return [h.x, h.y, h.z]; }, onDone });

  // ---- the moments ----
  const KINDS = {
    lost: {
      when: (m) => m >= 9 * 60 && m < 22 * 60 + 30,
      where: (b) => onNanjing(b) || onDeck(b),
      spawn(b) {
        const role = pickRole(ROLES.tourist); if (!role) return null;
        let x, z, variant;
        if (onNanjing(b)) {                                  // on the shopping street: away from the station, so there's a walk
          variant = 'metro';
          const ex = METRO.slice().sort((p, q) => Math.abs((p.x0 + p.x1) / 2 - b.x) - Math.abs((q.x0 + q.x1) / 2 - b.x))[0];
          const dir = b.x < (ex.x0 + ex.x1) / 2 ? -1 : 1;
          x = b.x + dir * (18 + Math.random() * 8); z = NJ.zc + (Math.random() - 0.5) * 3;
        } else { variant = 'bund'; x = 18 + Math.random() * 3; z = b.z + (Math.random() < 0.5 ? -1 : 1) * (16 + Math.random() * 8); }
        if (blocked(x, z, 0.4) || z < -250 || z > 88 || x < -555) return null;
        const a = actor(role, x, z, Math.random() * 6.28); a.anim = 'phone';
        return { kind: 'lost', variant, a, t: 0, greeted: false };
      },
      update(c, dt, b) {
        const a = c.a, d = Math.hypot(b.x - a.x, b.z - a.z), L = L0();
        if (c.stage == null) {
          if (d < 7 && !c.greeted) { c.greeted = true; a.face = b; a.anim = 'wave'; a.look = [b.x, b.z]; say(a, LOST_HAIL); setTimeout(() => { if (S.cur === c && !c.stage) a.anim = 'idle'; }, 2600); }
          if (c.greeted) { a.face = b; a.look = d < 9 ? [b.x, b.z] : null; }
          if (c.t > 200 && d > 30) return 'end';
        } else if (c.stage === 'walk') {
          const to = M(L).lostTo;
          if (Math.hypot(a.x - to.x, a.z - to.z) < 5 && d < 9) {
            M(L).lost = 'arrived'; a.follow = false; a.goal = null; a.face = b; a.look = [b.x, b.z]; a.anim = 'wave'; say(a, LOST_HERE); save && save();
            c.stage = 'leave'; c.leaveAt = c.t + 4; c.exit = to; return;
          }
          if (d > 26 && !c.waited) { c.waited = true; say(a, LOST_WAIT); }
          if (d < 10) c.waited = false;
          if (d > 70) { M(L).lost = 'gone'; c.stage = 'leave'; c.leaveAt = c.t; save && save(); }
        } else if (c.stage === 'leave' || c.stage === 'off') {
          if (c.t >= c.leaveAt && c.stage === 'leave') {        // down the station stairs, or off along the street
            c.stage = 'off'; a.follow = false; a.face = null; a.look = null; a.anim = 'idle';
            const ex = c.exit ? METRO.find((m) => Math.abs((m.x0 + m.x1) / 2 - c.exit.x) < 20) : null;
            a.goal = ex ? { x: ex.bottom, z: (ex.z0 + ex.z1) / 2 } : c.away || { x: a.x + (Math.random() - 0.5) * 60, z: a.z + (Math.random() < 0.5 ? -60 : 60) };
            a.stopAt = 0.6; a.speed = 1.3;
          }
          if (c.stage === 'off' && (!a.goal || d > 45)) return 'end';
        }
      },
      prompt: (c) => (c.stage == null ? { target: T('外国游客', 'A visitor'), action: T('帮他', 'Help him') } : null),
      interact(c) {
        const a = c.a, L = L0(), b = player.body;
        c.stage = 'talk'; a.face = b; a.look = [b.x, b.z]; a.anim = 'idle';
        if (c.variant === 'metro') {
          const ex = METRO.slice().sort((p, q) => Math.abs((p.x0 + p.x1) / 2 - a.x) - Math.abs((q.x0 + q.x1) / 2 - a.x))[0];
          const top = { x: ex.top + Math.sign(ex.top - ex.bottom) * 1.2, z: (ex.z0 + ex.z1) / 2 }, metres = Math.round(Math.abs(top.x - a.x) / 10) * 10, west = top.x < a.x;
          talkWith(a, [...LOST_METRO, { ask: [
            { zh: '跟我来，我带你过去。', en: 'Come with me, I\'ll walk you there.', set: 'walk', then: [LOST_FOLLOW] },
            { zh: `往${west ? '西' : '东'}走大概 ${metres} 米，${ex.exit} 号口就在路边。`, en: `About ${metres} metres ${west ? 'west' : 'east'}, Exit ${ex.exit}, right by the street.`, set: 'point', then: [LOST_THANKS] },
            { zh: '不好意思，我也不太清楚。', en: 'Sorry, I\'m not sure myself.', set: 'no', then: [LOST_NO] },
          ] }], (set) => {
            if (set === 'walk') { M(L).lost = 'walk'; M(L).lostTo = { x: top.x, z: top.z, label: B(`${ex.exit} 号口`, `Exit ${ex.exit}`) }; a.follow = true; c.stage = 'walk'; }
            else { c.stage = 'leave'; c.leaveAt = c.t + 1; c.exit = set === 'point' ? top : null; if (!c.exit) c.away = { x: a.x + (a.x > -300 ? 80 : -80), z: NJ.zc }; }
            save && save();
          });
        } else {
          talkWith(a, [...LOST_BUND, { ask: [
            { zh: '往北走，过了和平饭店往左拐就是。', en: 'North along the river, then left at the Peace Hotel.', set: 'right', then: [LOST_THANKS] },
            { zh: '往南，海关大楼那边。', en: 'South, past the Customs House.', set: 'wrong', then: [LOST_THANKS] },
            { zh: '不好意思，我也不太清楚。', en: 'Sorry, I\'m not sure myself.', set: 'no', then: [LOST_NO] },
          ] }], (set) => {
            if (set === 'wrong') M(L).misdirected = (M(L).misdirected || 0) + 1;
            c.stage = 'leave'; c.leaveAt = c.t + 1; c.away = { x: a.x, z: set === 'wrong' ? 80 : -240 };
            save && save();
          });
        }
        return true;
      },
    },
    photo: {
      when: (m) => m >= 7 * 60 && m < 23 * 60 + 30,
      where: (b) => onDeck(b),
      spawn(b) {
        const pair = pickRole(ROLES.couple); if (!pair) return null;
        const z = b.z + (Math.random() < 0.5 ? -1 : 1) * (12 + Math.random() * 8), x = 24.3;
        if (z < -250 || z > 88 || blocked(x, z, 0.3) || blocked(x, z + 0.75, 0.3)) return null;
        const A = actor(pair[0], x, z, Math.PI / 2), Bb = actor(pair[1], x, z + 0.75, Math.PI / 2);   // looking at the river until you're near
        A.anim = 'idle'; Bb.anim = 'look';
        return { kind: 'photo', a: A, b: Bb, t: 0, tries: 0 };
      },
      update(c, dt, b) {
        const d = Math.hypot(b.x - c.a.x, b.z - c.a.z);
        if (c.stage == null) {
          if (d < 7 && !c.asked) { c.asked = true; c.a.face = b; c.a.anim = 'wave'; c.a.look = [b.x, b.z]; say(c.a, PHOTO_ASK); setTimeout(() => { if (S.cur === c) c.a.anim = 'idle'; }, 2600); }
          if (c.asked) { c.a.face = b; c.a.look = d < 10 ? [b.x, b.z] : null; }
          if (c.t > 200 && d > 30) return 'end';
        } else if (c.stage === 'pose') {
          for (const p of [c.a, c.b]) { p.face = null; p.h = turnTo(p.h, -Math.PI / 2, dt * 4); p.anim = 'idle'; p.look = [b.x, b.z]; }   // backs to the river, smiling at you
        } else if (c.stage === 'after') {
          if (c.t > c.leaveAt) { c.stage = 'off'; for (const p of [c.a, c.b]) { p.face = null; p.look = null; p.goal = { x: 19, z: p.z + (c.a.z > -80 ? -70 : 70) }; p.speed = 1.1; } }
        } else if (c.stage === 'off' && (d > 45 || (!c.a.goal && !c.b.goal))) return 'end';
      },
      prompt: (c) => (c.stage == null ? { target: T('一对情侣', 'A couple'), action: T('帮他们拍照', 'Take their photo') } : null),
      interact(c) { c.stage = 'pose'; M(L0()).photo = 'framing'; frame(true); save && save(); return true; },
    },
    phone: {
      when: (m) => m >= 9 * 60 && m < 23 * 60,
      where: (b) => onDeck(b) && player.speed > 0.6,
      spawn(b) {
        const role = pickRole(ROLES.owner); if (!role) return null;
        const yaw = player.yaw, fx = -Math.sin(yaw), fz = -Math.cos(yaw);
        const dir = Math.abs(fz) > 0.3 ? Math.sign(fz) : 1, x = Math.min(22, Math.max(15, b.x + 1.5)), z = b.z - dir * 7;   // behind you, about to overtake
        if (blocked(x, z, 0.4) || z < -245 || z > 85) return null;
        const a = actor(role, x, z, dir > 0 ? 0 : Math.PI); a.speed = 1.75; a.stopAt = 0.4;
        a.goal = { x, z: Math.max(-245, Math.min(85, b.z + dir * 60)) };
        return { kind: 'phone', a, dir, t: 0, dropAt: null, phone: null };
      },
      update(c, dt, b) {
        const a = c.a, L = L0(), d = Math.hypot(b.x - a.x, b.z - a.z);
        // a few steps past you, out of a pocket it goes
        if (!c.phone && (a.z - b.z) * c.dir > 5) {
          c.phone = phoneMesh(); c.phone.position.set(a.x + 0.15, a.y + 0.012, a.z - c.dir * 0.6); c.phone.rotation.y = Math.random() * 3; scene.add(c.phone);
          audio && audio.cue && audio.cue('shutter', 0, 0.35);                                // a small clack on the stone
          a.speed = 1.3;
        }
        if (c.phone && !c.held) {
          c.buzz = (c.buzz || 0) - dt; c.phone.userData.screen.material.color.setScalar(c.buzz > 7.4 ? 1.6 : 0.12);
          if (c.buzz <= 0) { c.buzz = 8; if (Math.hypot(b.x - c.phone.position.x, b.z - c.phone.position.z) < 9 && audio && audio.cue) audio.cue('ping', 0, 0.45); }
          if (c.t > 170) { M(L).phone = null; return 'end'; }                                    // he came back for it while you weren't looking
        }
        if (!a.goal && !c.stood) { c.stood = true; a.anim = 'look'; }                           // patting his pockets, looking about
        if (c.held) {
          M(L).ownerAt = { x: a.x, z: a.z, label: B('失主', 'The owner') };
          if (c.t - c.heldAt > 360 && d > 30) { M(L).phone = 'gone'; save && save(); return 'end'; }
        }
        if (c.stage === 'off' && d > 40) return 'end';
      },
      // two things to do: pick it up, then give it back
      cands(c) {
        if (c.phone && !c.held) { const p = c.phone.position; return [{ id: 'moment:pick', x: p.x, y: p.y + 0.05, z: p.z, reach: 2.2, cone: 0.75 }]; }
        if (c.held && c.stage !== 'off' && c.stage !== 'talk') { const h = head(c.a); return [{ id: 'moment:give', x: h.x, y: h.y - 0.3, z: h.z, reach: 3, cone: 0.6 }]; }
        return [];
      },
      prompt: (c, id) => (id === 'moment:pick' ? { target: T('一部手机', 'A phone'), action: T('捡起来', 'Pick it up') } : { target: T('失主', 'The owner'), action: T('把手机还给他', 'Give it back') }),
      interact(c, id) {
        const L = L0(), a = c.a, b = player.body;
        if (id === 'moment:pick') {
          c.held = true; c.heldAt = c.t; scene.remove(c.phone); M(L).phone = 'found'; save && save();
          hud.toast(T('手机屏幕上：“老婆 · 3 个未接来电”。失主应该没走远。', 'On the screen: "Wife · 3 missed calls". The owner can\'t have gone far.'), 4);
          return true;
        }
        c.stage = 'talk'; a.goal = null; a.face = b; a.look = [b.x, b.z]; a.anim = 'idle';
        talkWith(a, [...PHONE_BACK, { ask: [
          { zh: '不用不用，举手之劳。', en: 'No need, really.', set: 'no', then: [PHONE_NO] },
          { zh: '好啊，那谢谢了。', en: 'Go on then, thanks.', set: 'coffee', then: [PHONE_COFFEE] },
        ] }], (set) => {
          M(L).phone = 'returned';
          if (set === 'coffee' && L.wallet) receive(L, { method: 'wechat', amount: 30, from: T('陌生人', 'A stranger'), memo: T('请你喝咖啡 · 谢谢你捡到手机', 'A coffee, for finding my phone') });
          c.stage = 'off'; a.face = null; a.look = null; a.goal = { x: a.x, z: a.z + c.dir * 70 }; a.speed = 1.3;
          save && save();
        });
        return true;
      },
    },
  };
  function phoneMesh() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.009, 0.155), new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.3, metalness: 0.5 }));
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.068, 0.145).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x1e2a3a }));
    screen.position.y = 0.0048; g.add(body, screen); g.userData.screen = screen; body.castShadow = true;
    return g;
  }

  // ---- taking the couple's photo: a viewfinder over the screen; Space or a click shoots ----
  const vf = document.createElement('div'); vf.id = 'moment-vf'; vf.className = 'hidden';
  vf.innerHTML = '<div class="c tl"></div><div class="c tr"></div><div class="c bl"></div><div class="c br"></div><div class="g"><i></i><i></i><i></i><i></i></div><div class="flash"></div><div class="hint"></div>';
  document.body.appendChild(vf);
  const card = document.createElement('div'); card.id = 'moment-photo'; document.body.appendChild(card);
  function frame(on) {
    S.framing = on ? S.cur : null; vf.classList.toggle('hidden', !on);
    vf.querySelector('.hint').textContent = T('空格 / 点击 拍照 · Q 把手机还给他们', 'Space / click: take it · Q: hand the phone back');
  }
  window.addEventListener('mousedown', (e) => { if (S.framing && e.button === 0 && isFree()) shoot(); });
  const _v = new THREE.Vector3();
  const ndc = (p) => { _v.copy(p).project(camera); const behind = _v.z > 1; return { x: _v.x, y: _v.y, ok: !behind && Math.abs(_v.x) < 0.88 && Math.abs(_v.y) < 0.88 }; };   // (the frame's corners: 6% in from the edges)
  function shoot() {
    const c = S.framing; if (!c) return;
    audio && audio.cue && audio.cue('shutter', 0, 0.8);
    vf.querySelector('.flash').classList.remove('on'); void vf.offsetWidth; vf.querySelector('.flash').classList.add('on');
    camera.updateMatrixWorld();
    const people2 = [c.a, c.b].map((p) => { const h = head(p); return { h: ndc(h), w: ndc(new THREE.Vector3(p.x, p.y + 1.0, p.z)) }; });
    const pearl = [ndc(new THREE.Vector3(PEARL.x, 93, PEARL.z)), ndc(new THREE.Vector3(PEARL.x, 272, PEARL.z))].some((q) => q.ok);
    const inFrame = people2.every((q) => q.h.ok && q.w.ok && q.h.y < 0.84);
    const big = people2.every((q) => Math.abs(q.h.y - q.w.y) > 0.13);
    c.tries++;
    S.pendingShot = true;
    const L = L0();
    let line;
    if (inFrame && pearl && big) line = PHOTO_GOOD; else if (c.tries >= 3) line = PHOTO_MEH;
    else line = !inFrame ? PHOTO_CUT : !big ? PHOTO_FAR : PHOTO_PEARL;
    say(c.a, line);
    if (line === PHOTO_GOOD || line === PHOTO_MEH) {
      M(L).photo = 'done'; if (line === PHOTO_GOOD) M(L).photoGood = (M(L).photoGood || 0) + 1;
      frame(false); c.stage = 'after'; c.leaveAt = c.t + 18; S.showCard = true; save && save();
    }
  }
  function capture() {
    S.pendingShot = false;
    if (!S.showCard) return;
    S.showCard = false;
    try {
      const src = canvas, cv = document.createElement('canvas'); cv.width = 240; cv.height = 150;
      cv.getContext('2d').drawImage(src, 0, 0, 240, 150);
      card.innerHTML = `<img src="${cv.toDataURL('image/jpeg', 0.75)}" alt=""><span>${T('他们的照片', 'Their photo')}</span>`;
      card.classList.add('on'); setTimeout(() => card.classList.remove('on'), 5000);
    } catch { /* a lost context: no card */ }
  }

  function end() {
    const c = S.cur; if (!c) return;
    if (S.framing) frame(false);
    drop(c.a); drop(c.b); if (c.phone) scene.remove(c.phone);
    const L = L0();
    if (c.kind === 'photo' && M(L).photo === 'framing') M(L).photo = 'declined';
    if (c.kind === 'lost' && M(L).lost === 'walk') M(L).lost = 'gone';
    if (c.kind === 'phone' && M(L).phone === 'found') M(L).phone = 'gone';
    S.cur = null; S.cool = 240 + Math.random() * 180; save && save();
  }
  function start(kind) {
    const b = player.body, K = KINDS[kind];
    const c = K.spawn(b); if (!c) return false;
    const L = L0();
    // a fresh moment: yesterday's answers don't carry over
    if (kind === 'lost') { M(L).lost = null; M(L).lostTo = null; } if (kind === 'photo') M(L).photo = null; if (kind === 'phone') { M(L).phone = null; M(L).ownerAt = null; }
    S.cur = c; markDone(kind);
    return true;
  }

  return {
    get active() { return S.cur ? S.cur.kind : null; },
    get framing() { return !!S.framing; },
    get current() { return S.cur; },                       // (tools)
    // tools: start one now (near you, if there's room)
    force(kind) { if (S.cur) end(); return start(kind); },
    end,
    others() { const c = S.cur; return c ? [c.a, c.b].filter(Boolean).map((a) => ({ x: a.x, z: a.z, vx: 0, vz: 0 })) : []; },
    update(dt, { playing = true } = {}) {
      if (dt <= 0) return;
      const b = player.body, c = S.cur;
      if (c) {
        c.t += dt;
        for (const a of [c.a, c.b]) if (a) stepActor(a, dt, b);
        if (KINDS[c.kind].update(c, dt, b) === 'end') end();
        return;
      }
      if (!enabled || !playing) return;
      S.cool -= dt; S.check -= dt;
      if (S.cool > 0 || S.check > 0) return;
      S.check = 10;
      if (!isFree()) return;
      const m = getHour(), ok = Object.keys(KINDS).filter((k) => !done(k) && KINDS[k].when(m) && KINDS[k].where(b));
      if (ok.length && Math.random() < 0.35) start(ok[Math.floor(Math.random() * ok.length)]);
    },
    // E-interaction (main.js places)
    candidates() {
      const c = S.cur; if (!c || S.framing || sceneTalk.active) return [];
      if (KINDS[c.kind].cands) return KINDS[c.kind].cands(c);
      if (c.stage != null) return [];
      const h = head(c.a); return [{ id: 'moment:talk', x: h.x, y: h.y - 0.25, z: h.z, reach: c.kind === 'photo' ? 5.5 : 3.2, cone: 0.6 }];   // (a photo is taken from a few steps back)
    },
    owns: (id) => id.startsWith('moment:'),
    prompt(id) { const c = S.cur; return c ? KINDS[c.kind].prompt(c, id) : null; },
    interact(id) { const c = S.cur; return c ? KINDS[c.kind].interact(c, id) : false; },
    // keys while walking about: answers (1-4) and the shutter
    key(code) {
      if (sceneTalk.asking && sceneTalk.key(code)) return true;
      if (S.framing) {
        if (code === 'Space') { shoot(); return true; }
        if (code === 'Escape' || code === 'KeyQ') { const c = S.framing; frame(false); M(L0()).photo = 'declined'; say(c.a, PHOTO_BYE); c.stage = 'after'; c.leaveAt = c.t + 6; save && save(); return true; }
      }
      return false;
    },
    afterRender() { if (S.pendingShot) capture(); },
  };
}
