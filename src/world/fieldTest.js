// At dusk, on the promenade: putting the night gimbal in people's hands (engine/studio.js keeps the
// score, world/work.js has the words).
//   E on someone who's taking a photo at the railing   lend it to them for a few minutes
//   E on one of the three who are there every evening  the same, but they remember: what they said
//                                                       last time, whether you came back, what's changed
//     老陈  opposite the Customs House, 17:15 – 19:45, shooting the clock (his back to the river)
//     小叶  facing the Pearl, 18:30 – 21:45, between clients
//     阿哲  up at the Nanjing Road end, 20:00 – 22:40, talking to his stream
// A go takes a few seconds of your time and eight minutes of the clock's; what they say arrives as
// they hand it back. By day the passers-by tell you a phone is steady enough in daylight, and the
// regulars aren't there. Nothing here exists unless you've built the gimbal; the regulars are three
// people at most, made only when you're near enough to see them and their hours have come.
import * as THREE from 'three';
import { createPerson } from './people.js';
import { groundHeight, addDynamicCollider } from './layout.js';
import { getLang } from '../ui/i18n.js';
import { stamp, skipTo } from '../engine/life.js';
import { studio, hasProduct, rev, fieldTest, anonTester, regularTester, isDusk, goesLeft, REGULARS } from '../engine/studio.js';
import { REG, QUOTES, ISSUE_TEXT, PERSONA_NAME, quoteOf } from './work.js';
import { createGimbalProp } from './props/gimbal.js';

const T = (zh, en) => (getLang() === 'zh' ? zh : en);
const P = (b) => (getLang() === 'zh' ? b.zh : b.en);
// where they stand, what they're turned toward, who they are (Rocketbox roles, with fallbacks)
export const SPOTS = {
  chen: { x: 22.6, z: 23.5, face: [-45, 26], roles: ['p4', 'p3', 'c5'], anim: 'idle', phone: 0.0 },
  ye: { x: 23.4, z: -74, face: [640, -42], roles: ['c2', 'c1', 'c8'], anim: 'idle', phone: 0.75 },
  zhe: { x: 21.8, z: -166, face: [640, -42], roles: ['c6', 'c7', 'p1'], anim: 'talk1', phone: 0.0 },
};
const NEXT = { chen: 'ye', ye: 'zhe' };                       // each tells you about the next one along
const HINT = {
  chen: ['往北走，正对着东方明珠那一段，有个给人拍照的姑娘，天天在。她的眼睛比我毒。', 'Go north, where it faces the Pearl. There\'s a young woman who photographs people there every night. Her eye is harder than mine.'],
  ye: ['靠南京路那头，八点以后有个做直播的，一播三个钟头。你这个撑不撑得住，问他。', 'Up at the Nanjing Road end there\'s a streamer from eight, three hours at a stretch. Whether yours can take that, ask him.'],
};
const GO_SECONDS = 4.2, GO_MINUTES = 8;

export function createFieldTest({ scene, people, player, hud, audio = null, voice = null, getLife, save, getCrowdView = () => null, getRain = () => 0, isFree = () => true, enabled = true }) {
  const L0 = () => getLife();
  const actors = {};                                           // regular id -> { p, x, z, y, h, box, prop, raise }
  const tried = new Map();                                     // crowd agent id -> the evening they had their go
  const S = { cur: null, check: 0, said: 0, queue: [] };
  const role = (list) => (people ? list.find((r) => people.manifest.cast[r]) : null);
  const here = (id, minute) => minute >= REGULARS[id].from && minute < REGULARS[id].to;

  function make(id) {
    const sp = SPOTS[id], r = role(sp.roles); if (!r) return null;
    const p = createPerson(people, r);
    p.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(p.root);
    const prop = createGimbalProp(); prop.group.visible = false; scene.add(prop.group);
    const a = { id, p, x: sp.x, z: sp.z, y: groundHeight(sp.x, sp.z, 9), h: Math.atan2(sp.face[0] - sp.x, sp.face[1] - sp.z), box: addDynamicCollider('npc'), prop, raise: sp.phone, t: Math.random() * 20 };
    p.root.position.set(a.x, a.y, a.z); p.root.rotation.y = a.h; p.play(sp.anim, 0); p.update(0);
    const b = a.box; b.minX = a.x - 0.24; b.maxX = a.x + 0.24; b.minZ = a.z - 0.24; b.maxZ = a.z + 0.24; b.y0 = a.y - 0.5; b.y1 = a.y + 1.9; b.id = `reg:${id}`;
    return a;
  }
  function drop(id) {
    const a = actors[id]; if (!a) return;
    scene.remove(a.p.root, a.prop.group); a.p.root.traverse((o) => { if (o.isSkinnedMesh) o.skeleton.dispose(); });
    a.box.minX = a.box.maxX = a.box.minZ = a.box.maxZ = 1e6; delete actors[id];
  }
  const headOf = (a) => { const v = new THREE.Vector3(); if (a.p.bones.head) a.p.bones.head.getWorldPosition(v); else v.set(a.x, a.y + 1.6, a.z); return v; };
  // someone speaks: a bark on screen (and a voice, if you've chosen one for new lines)
  function speak(name, line, at, secs) {
    const [zh, en] = Array.isArray(line) ? line : [line.zh, line.en];
    if (voice) voice.say({ zh, en, who: 'passer', at }).catch?.(() => {});
    hud.bark({ speaker: name, text: { zh, en }, voice: false, seconds: secs || Math.min(7, 2.4 + (getLang() === 'zh' ? zh.length * 0.16 : en.length * 0.055)) });
  }
  const secsFor = (line) => { const [zh, en] = Array.isArray(line) ? line : [line.zh, line.en]; return Math.min(7, 2.4 + (getLang() === 'zh' ? zh.length * 0.16 : en.length * 0.055)); };
  const sayLater = (name, line, at) => S.queue.push({ name, line, at });

  // the go itself: start, a few seconds in their hands, then what they make of it
  function lend(c) {
    const L = L0(), minute = L.clock.minute, reg = c.reg, name = reg ? REG[reg].name : (PERSONA_NAME[c.persona] || PERSONA_NAME.office);
    const at = () => (reg && actors[reg] ? headOf(actors[reg]).toArray() : c.agent ? [c.agent.x, c.agent.y + 1.6, c.agent.z] : null);
    // nothing to wait for: daylight, the same version, a flat battery
    const St = studio(L), known = reg ? St.people[reg] : null;
    const quick = !isDusk(minute) || (known && known.tries && known.rev >= rev(L)) || goesLeft(L) < 1;
    if (quick) { finish({ ...c, name, at }); return; }
    const first = reg && !known;
    if (first) speak(name, REG[reg].intro, at());
    S.cur = { ...c, name, at, t: 0, wait: first ? secsFor(REG[reg].intro) + 0.4 : 0.2, lent: false };
    if (c.agent) { const a = c.agent; a._saved = { state: a.state, act: a.act, wait: a.wait }; a.state = 'act'; a.act = 'photo'; a.wait = 999; }
  }
  function finish(c) {
    const L = L0(), reg = c.reg;
    const res = fieldTest(L, reg ? regularTester(reg) : anonTester(c.persona), { minute: L.clock.minute, rain: getRain() });
    const where = c.at();
    if (c.agent) { tried.set(c.agent.id, stamp(L)); const a = c.agent; if (a._saved) { a.state = a._saved.state === 'act' ? 'act' : 'walk'; a.act = a._saved.act; a.wait = Math.min(a._saved.wait || 2, 4); a._saved = null; } }
    if (reg && actors[reg]) { actors[reg].prop.group.visible = false; actors[reg].raise = SPOTS[reg].phone; }
    const t = { who: reg || 'anon', persona: c.persona, kind: res.kind, issue: res.issue, v: res.v };
    if (res.kind === 'dead') {
      hud.thought(`没电了。今晚才借出去 ${summaryTonight(L)} 个人。`, `Flat. And only ${summaryTonight(L)} ${summaryTonight(L) === 1 ? 'person has' : 'people have'} had a go tonight.`);
      if (res.first) setTimeout(() => hud.toast(T('新问题：电不够一晚上（记在本子里了，还没整理）', "New: it won't last an evening (noted; not written up yet)"), 4.5), 1800);
      save && save(); return;
    }
    if (res.kind === 'day' || res.kind === 'same' || res.kind === 'none') { speak(c.name, res.kind === 'same' ? REG[reg].same : QUOTES.day[res.v || 0], where); if (res.kind === 'day') hud.toast(T('夜里用的东西，要夜里试。泛光灯 17:10 亮。', 'A thing for the night has to be tried at night. The floodlights come on at 5:10.'), 4.5); return; }
    skipTo(L, stamp(L) + GO_MINUTES);
    // a regular first says what they notice has changed, and whether you kept your word
    if (reg) {
      if (res.late) sayLater(c.name, REG[reg].late, c.at);
      for (const i of res.noticed.slice(0, 2)) sayLater(c.name, REG[reg].noticed[i], c.at);
    }
    sayLater(c.name, quoteOf(t, L), c.at);
    if (reg && (res.kind === 'found' || res.kind === 'again')) {
      sayLater(c.name, REG[reg].promise, c.at);
      const nx = NEXT[reg], St = studio(L);
      if (nx && !St.people[nx] && !(St.heardOf || {})[nx]) { (St.heardOf ||= {})[nx] = true; sayLater(c.name, HINT[reg], c.at); }
    }
    const note = res.kind === 'found' ? T(`新问题：${P(ISSUE_TEXT[res.issue].name)}（记下了，还没整理）`, `New: ${P(ISSUE_TEXT[res.issue].name).toLowerCase()} (noted; not written up yet)`)
      : res.kind === 'again' ? T(`又一个人说：${P(ISSUE_TEXT[res.issue].name)}（${studio(L).found[res.issue].n} 人）`, `Someone else says: ${P(ISSUE_TEXT[res.issue].name).toLowerCase()} (${studio(L).found[res.issue].n} now)`)
        : res.kind === 'like' && res.listed ? T(`名单 +${res.units || 1}${res.deposit ? ` · 收到定金 ¥${res.deposit}` : ''}`, `On the list: +${res.units || 1}${res.deposit ? ` · deposit received, ¥${res.deposit}` : ''}`)
          : res.kind === 'dear' ? T('喜欢，但嫌贵（名单页可以改价钱）', 'Liked it, but not the price (you can change it on the List page)') : '';
    const left = goesLeft(L), more = left > 0 ? T(` · 电还够借 ${left} 次`, ` · ${left} more ${left === 1 ? 'go' : 'goes'} in the battery`) : T(' · 电快没了', ' · the battery is nearly flat');
    S.note = note ? { text: note + more, good: res.kind === 'like' } : null;
    audio && audio.cue && audio.cue(res.kind === 'like' ? 'chime' : 'ping', 0, 0.3);
    save && save();
  }
  const summaryTonight = (L) => studio(L).tests.filter((t) => t.eve === studio(L).usedEve && t.kind !== 'dead').length;

  return {
    get busy() { return !!S.cur; },
    actors,
    // the regulars and whoever has it in their hands stand still: the crowd walks round them
    others() { return Object.values(actors).map((a) => ({ x: a.x, z: a.z, vx: 0, vz: 0 })); },
    talkables() { return Object.values(actors).map((a) => ({ key: `reg:${a.id}`, persona: a.id, x: a.x, y: a.y + 1.62, z: a.z, hold() {} })); },
    candidates() {
      if (!enabled || S.cur || S.queue.length || !hasProduct(L0()) || !isFree()) return [];
      const out = [], L = L0(), now = stamp(L);
      for (const a of Object.values(actors)) { const h = headOf(a); out.push({ id: `ft:${a.id}`, x: h.x, y: h.y - 0.1, z: h.z, reach: 3.4, cone: 0.62 }); }
      const cv = getCrowdView();
      if (cv) for (const a of cv.nearAgents()) {
        if (a.gone || a.state !== 'act' || (a.act !== 'photo' && a.act !== 'selfie') || a.kind === 'guide' || a.child || a._saved) continue;
        if (now - (tried.get(a.id) ?? -1e9) < 300) continue;                   // they've had their go this evening
        if (Math.abs(a.y - player.body.y) > 1.2) continue;
        out.push({ id: `ft:a${a.id}`, x: a.x, y: a.y + 1.5 * (a.scale || 1), z: a.z, reach: 3.0, cone: 0.62 });
      }
      return out;
    },
    owns(id) { return typeof id === 'string' && id.startsWith('ft:'); },
    prompt(id) {
      const k = id.slice(3);
      if (REG[k]) { const met = !!studio(L0()).people[k]; return { target: met ? P(REG[k].name) : T(k === 'ye' ? '拍照的姑娘' : k === 'zhe' ? '做直播的人' : '拍钟的老人', k === 'ye' ? 'A photographer' : k === 'zhe' ? 'A streamer' : 'An old man photographing the clock'), action: T(k === 'ye' ? '把云台借给她试试' : '把云台借给他试试', 'Lend the gimbal') }; }
      const cv = getCrowdView(), a = cv && cv.nearAgents().find((x) => `a${x.id}` === k);
      return { target: P(PERSONA_NAME[a && a.persona] || PERSONA_NAME.office), action: T('把云台借出去试试', 'Lend the gimbal') };
    },
    interact(id) {
      const k = id.slice(3);
      if (REG[k]) { if (actors[k]) lend({ reg: k, persona: k }); return true; }
      const cv = getCrowdView(), a = cv && cv.nearAgents().find((x) => `a${x.id}` === k);
      if (a) lend({ agent: a, persona: a.persona });
      return true;
    },
    update(dt, pp) {
      if (!enabled || !people) return;
      const L = L0();
      // who's out: checked a few times a second
      if ((S.check -= dt) <= 0) {
        S.check = 0.4;
        const on = hasProduct(L), minute = L.clock.minute;
        for (const id of Object.keys(SPOTS)) {
          const sp = SPOTS[id], d = Math.hypot(pp.x - sp.x, pp.z - sp.z), want = on && here(id, minute) && d < 85 && pp.y < 8;
          if (want && !actors[id]) { const a = make(id); if (a) actors[id] = a; }
          else if (actors[id] && !(S.cur && S.cur.reg === id) && (!on || !here(id, minute) || d > 120)) drop(id);
        }
      }
      for (const a of Object.values(actors)) {
        const d = Math.hypot(pp.x - a.x, pp.z - a.z), mine = S.cur && S.cur.reg === a.id;
        if (d > 60 && !mine) continue;                                         // too far to see what they're doing
        a.t += dt;
        // Old Chen lifts his phone to the clock now and then; the others have theirs up most of the time
        const up = mine && S.cur.lent ? 1 : a.id === 'chen' ? (a.t % 22 < 7 ? 1 : 0) : SPOTS[a.id].phone;
        a.raise += (up - a.raise) * Math.min(1, dt * 3);
        a.p.setPhoneHold(a.raise);
        const look = d < 5 && !(mine && S.cur.lent) ? [pp.x, pp.z] : null;
        a.p.update(dt, look);
        if (a.prop.group.visible) { const h = a.p.anchors.phone.position; a.prop.group.position.set(h.x, h.y - 0.1, h.z); a.prop.group.rotation.y = a.h; }
      }
      // what's being said, one line after another
      if (S.said > 0) S.said -= dt;
      if (S.said <= 0 && S.queue.length) { const q = S.queue.shift(); speak(q.name, q.line, q.at()); S.said = secsFor(q.line) + 0.25; if (!S.queue.length && S.note) { const n = S.note; S.note = null; setTimeout(() => hud.toast(n.text, 4.5), (S.said - 0.6) * 1000); } }
      const c = S.cur; if (!c) return;
      c.t += dt;
      if (!c.lent && c.t >= c.wait) {
        c.lent = true; c.t = 0;
        hud.toast(T('借出去了……', 'In their hands...'), GO_SECONDS - 0.4);
        if (c.reg && actors[c.reg]) { const a = actors[c.reg]; a.prop.setState(studio(L).fixes); a.prop.group.visible = true; }
      } else if (c.lent && c.t >= GO_SECONDS) { S.cur = null; finish(c); }
    },
    // (tools)
    debug: { spots: SPOTS, tried, state: S },
  };
}
