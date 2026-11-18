// The friends, in person, after the first days (world/agenda.js sets these up on the phone):
//   RUOAN at the AIA Building (her invitation, 19:00 on day 4): she's at the gates with her site
//     badge; E goes through with her (the guard nods), and beyond the gates she shows you the lobby's
//     coffered ceiling she's restoring. With the Pocket LiDAR you can scan it for her (two weeks of
//     measuring saved); without it she wishes someone had one. Either way you were there.
//   MOMO in room 612 (the night you said he could crash): asleep in the armchair by the window. E to
//     wake him; T to talk.
//   SCANS (the Pocket LiDAR, engine/maker.js): E at a few places with detail worth keeping (the AIA
//     ceiling, the Peace Hotel's rotunda, the Customs House clock): a sweep of laser points settles
//     over it; Maker XP, and the point clouds go in your Sketchbook.
import * as THREE from 'three';
import { L as LAY } from './layout.js';
import { createPerson } from './people.js';
import { createSeatedPose, turn } from './driverPose.js';
import { AIA } from './interiors.js';
import { SIX } from './hotelUpper.js';
import { getLang } from '../ui/i18n.js';
import { stamp, nudge, post } from '../engine/life.js';
import { logTime, slept } from '../engine/allot.js';
import { maker, owns, gainXp, achieve } from '../engine/maker.js';

const T = (zh, en) => (getLang() === 'zh' ? zh : en);
const Y0 = LAY.curbH;
export const SCAN_SPOTS = [
  { id: 'aiaCeiling', zh: '友邦大堂的藻井天花', en: 'The AIA lobby\'s coffered ceiling', x: -44, y: Y0 + 5.6, z: -146, r: 3.2, from: { y: [0, 5] } },
  { id: 'rotunda', zh: '和平饭店的彩色玻璃穹顶', en: 'The Peace Hotel\'s stained-glass rotunda', x: -48, y: Y0 + 9.8, z: -229, r: 6.5, from: { y: [0, 5] } },
  { id: 'clock', zh: '海关大楼的钟', en: 'The Customs House clock', x: -45, y: 50, z: 26, r: 5, from: { y: [0, 5] }, reach: 60 },
];

export function createFriendScenes({ scene, people, hud, audio, voice, getLife, save, player, interiors }) {
  const L0 = () => getLife();
  const say = (who, whoKey, zh, en, secs = 3.5, at = null) => hud.bark({ speaker: who, text: { zh, en }, who: whoKey, at, seconds: secs });
  const S = { yuan: { phase: 'off' }, momo: { awake: false }, scanning: null };
  // ---- Yu'an ----
  let yuan = null;
  // Lin Yu'an (the old drafts' Ruoan): the same body as in her romance scenes (c1), at her 167 cm
  if (people) { yuan = createPerson(people, 'c1'); { const b = new THREE.Box3().setFromObject(yuan.root), h = b.max.y - b.min.y; if (h > 1.2 && h < 2.2) yuan.root.scale.multiplyScalar(1.67 / h); } yuan.root.visible = false; yuan.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); scene.add(yuan.root); }
  const yuanInv = () => L0().invites.find((i) => i.id === 'yuan-aia');
  const yuanOn = () => { const i = yuanInv(), now = stamp(L0()); return i && i.status === 'accepted' && !i.kept && now >= i.at - 30 && now <= i.at + 150; };
  // ---- Momo, asleep in the armchair ----
  let momo = null, momoFrame = null, momoPose = null;
  if (people) {
    momoFrame = new THREE.Group(); momoFrame.position.set(-36.4, SIX.y, -228.6); momoFrame.rotation.y = Math.PI / 2 + 0.5; scene.add(momoFrame);
    momo = createPerson(people, 'p3'); momo.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); momoFrame.add(momo.root); momo.play('idle', 0); momo.update(0);
    momoPose = createSeatedPose(momo, { recline: 0.35, elbows: 0.3 }); momoFrame.visible = false;
  }
  const momoCabin = { hip: new THREE.Vector3(0, 0.48, 0.02), pedals: [new THREE.Vector3(-0.15, 0.06, 0.62), new THREE.Vector3(0.18, 0.06, 0.66)],
    rimPoint(a, out) { const v = new THREE.Vector3(a * 0.18, 0.62, 0.28); return out.copy(momoFrame.localToWorld(v)); } };
  const momoOn = () => { const l = L0(); return !!l.flags.momoCrash && l.fired && l.fired.m2 && stamp(l) >= l.fired.m2 + 20 && stamp(l) < Math.floor(l.fired.m2 / 1440) * 1440 + 1440 + 10 * 60; };
  // ---- the scan effect: points settle over the subject ----
  const scanGroup = new THREE.Group(); scene.add(scanGroup);
  function scanEffect(spot) {
    const n = 2400, pos = new Float32Array(n * 3), geo = new THREE.BufferGeometry();
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * spot.r; pos[i * 3] = spot.x + Math.cos(a) * rr; pos[i * 3 + 1] = spot.y + (Math.random() - 0.5) * spot.r * 0.25; pos[i * 3 + 2] = spot.z + Math.sin(a) * rr; }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setDrawRange(0, 0);
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: new THREE.Color(0.3, 1.6, 1.2), size: 0.05, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    scanGroup.add(pts); S.scanning = { spot, pts, t: 0, n };
    audio && audio.cue && audio.cue('ping', 0, 0.4);
  }
  function finishScan(spot) {
    const l = L0(), M = maker(l); (M.scans ||= []);
    const first = !M.scans.includes(spot.id); if (first) M.scans.push(spot.id);
    const r = first ? gainXp(l, 60, `scan:${spot.id}`) : { xp: 0 };
    hud.toast(T(`点云已保存 · ${spot.zh}${r.xp ? ` · +${r.xp} 创客经验` : ''}`, `Point cloud saved · ${spot.en}${r.xp ? ` · +${r.xp} Maker XP` : ''}`), 3.5);
    if (M.scans.length >= 3) { const a = achieve(l, 'scanner'); if (a) setTimeout(() => hud.achievement && hud.achievement(T(a.zh, a.en)), 1200); }
    if (spot.id === 'aiaCeiling' && S.yuan.phase === 'ceiling') yuanDone(true);
    save && save();
  }
  function yuanDone(scanned) {
    const l = L0(), inv = yuanInv(); if (!inv || inv.kept) return;
    inv.kept = true; logTime(l, 'friends', 75, 'yuan'); nudge(l, 'yuan', scanned ? 7 : 3, `kept:yuan-aia${scanned ? ':scan' : ''}`);
    S.yuan.phase = 'done';
    if (scanned) { say(T('林予安', 'Yu\'an'), 'yuan', '……你知道这省了我们多少事吗？两周的测绘。下次请你吃饭，我请。', "...Do you know how much work that just saved us? Two weeks of measuring. Dinner's on me next time.", 5, yuanHead()); gainXp(l, 80, 'yuan:scan'); }
    else { say(T('林予安', 'Yu\'an'), 'yuan', '每一格都是手工做的，九十多年了。……要是有台便携的激光雷达就好了，我们量了三个礼拜。', "Every one of those coffers was made by hand, ninety-odd years ago. ...If only we had a portable LiDAR. We've been measuring for three weeks.", 6, yuanHead()); l.flags.yuanWantsLidar = true; }
    setTimeout(() => post(getLife(), 'yuan', { from: 'yuan', kind: 'text', text: scanned ? '点云我看了，比我们的全站仪还细。你这个东西，能不能借我们工地用一个月？' : '今天谢谢你来。你看天花的样子，跟小时候看我画画一样。' }), 60000);
    save && save();
  }
  const yuanHead = () => (yuan ? [yuan.root.position.x, yuan.root.position.y + 1.6, yuan.root.position.z] : null);
  // where Yu'an walks: the gates, then under the ceiling
  const R_GATE = { x: AIA.gateX + 1.1, z: -146.1 }, R_CEIL = { x: -44.4, z: -146.4 };
  const targets = () => {
    const out = [], pp = player.body;
    if (yuan && yuan.root.visible && S.yuan.phase === 'waiting') out.push({ id: 'fYu\'anGo', x: yuan.root.position.x, y: Y0 + 1.5, z: yuan.root.position.z, reach: 3 });
    if (yuan && yuan.root.visible && S.yuan.phase === 'ceiling' && !owns(L0(), 'lidar')) out.push({ id: 'fYu\'anCeil', x: R_CEIL.x, y: Y0 + 3.2, z: R_CEIL.z, reach: 6 });
    if (momoFrame && momoFrame.visible) out.push({ id: 'fMomo', x: -36.4, y: SIX.y + 0.9, z: -228.6, reach: 2.6 });
    if (owns(L0(), 'lidar') && !S.scanning) for (const s of SCAN_SPOTS) if (pp.y >= s.from.y[0] && pp.y <= s.from.y[1] && (s.id !== 'aiaCeiling' || pp.x < AIA.gateX)) out.push({ id: `scan:${s.id}`, x: s.x, y: s.y, z: s.z, reach: s.reach || 12 });
    return out;
  };
  return {
    candidates() { return targets().map((t) => ({ ...t, cone: t.id.startsWith('scan:') ? 0.9 : 0.6, anyHeight: t.id.startsWith('scan:') || t.id === 'fYu\'anCeil' })); },
    prompt(id) {
      if (id === 'fYu\'anGo') return { target: T('予安', 'Yu\'an'), action: T('跟她过闸机', 'Go through with her') };
      if (id === 'fYu\'anCeil') return { target: T('藻井天花', 'The coffered ceiling'), action: T('抬头看', 'Look up') };
      if (id === 'fMomo') return { target: 'Momo', action: S.momo.awake ? T('让他接着睡', 'Let him sleep') : T('叫醒他', 'Wake him') };
      if (id.startsWith('scan:')) { const s = SCAN_SPOTS.find((x) => `scan:${x.id}` === id); return { target: T(s.zh, s.en), action: T('激光雷达扫描', 'Scan (LiDAR)') }; }
      return null;
    },
    owns(id) { return ['fYu\'anGo', 'fYu\'anCeil', 'fMomo'].includes(id) || id.startsWith('scan:'); },
    interact(id) {
      if (id === 'fYu\'anGo') {
        interiors.escort(1, 8); S.yuan.phase = 'walking';
        say(T('林予安', 'Yu\'an'), 'yuan', '跟紧我。保安认识我。', "Stay close. The guard knows me.", 2.6, yuanHead());
      } else if (id === 'fYu\'anCeil') yuanDone(false);
      else if (id === 'fMomo') {
        if (!S.momo.awake) { S.momo.awake = true; say('Momo', 'momo', '……嗯？几点了……你这椅子比我床还舒服。我就再睡十分钟，十分钟……', "...Hm? What time is it... this chair is comfier than my bed. Ten more minutes. Ten...", 5, [-36.4, SIX.y + 1.1, -228.6]); }
        else say('Momo', 'momo', '白白……谢了。真的。', 'Baibai... thanks. Really.', 3, [-36.4, SIX.y + 1.1, -228.6]);
      } else if (id.startsWith('scan:')) scanEffect(SCAN_SPOTS.find((x) => `scan:${x.id}` === id));
      return true;
    },
    talkables() {
      const out = [];
      if (yuan && yuan.root.visible) out.push({ key: 'yuan', persona: 'yuan', x: yuan.root.position.x, y: Y0 + 1.6, z: yuan.root.position.z, hold() {} });
      if (momoFrame && momoFrame.visible && S.momo.awake) out.push({ key: 'momo', persona: 'momo', x: -36.4, y: SIX.y + 1.1, z: -228.6, hold() {} });
      return out;
    },
    update(dt, pp) {
      // Yu'an: at the gates while it's her evening; through, and to the ceiling
      if (yuan) {
        const on = yuanOn() || (S.yuan.phase !== 'off' && S.yuan.phase !== 'done');
        if (on && S.yuan.phase === 'off') { S.yuan.phase = 'waiting'; yuan.root.position.set(R_GATE.x, Y0, R_GATE.z); yuan.root.rotation.y = Math.PI / 2; yuan.play('idle', 0); }
        yuan.root.visible = on || S.yuan.phase === 'done' && Math.abs(pp.z - -146) < 30 && stamp(L0()) < (yuanInv() || { at: 0 }).at + 180;
        if (yuan.root.visible) {
          if (S.yuan.phase === 'waiting' && !S.yuan.greeted && Math.hypot(pp.x - R_GATE.x, pp.z - R_GATE.z) < 5) { S.yuan.greeted = true; say(T('林予安', 'Yu\'an'), 'yuan', '来啦。准时，难得。', 'You came. On time, for once.', 2.8, yuanHead()); }
          if (S.yuan.phase === 'walking') {
            const r = yuan.root.position, dx = R_CEIL.x - r.x, dz = R_CEIL.z - r.z, d = Math.hypot(dx, dz);
            if (d > 0.1) { const st = Math.min(d, 1.2 * dt); r.x += dx / d * st; r.z += dz / d * st; yuan.root.rotation.y = Math.atan2(dx, dz); yuan.play('walk', 0.2); yuan.setGait(1.2); }
            else { S.yuan.phase = 'ceiling'; yuan.play('idle', 0.3); say(T('林予安', 'Yu\'an'), 'yuan', owns(L0(), 'lidar') ? '你看上面。……你带那个了？扫一遍给我看看。' : '你看上面。', owns(L0(), 'lidar') ? "Look up. ...Did you bring that thing? Scan it for me." : 'Look up.', 3.2, yuanHead()); }
          }
          yuan.update(dt, Math.hypot(pp.x - yuan.root.position.x, pp.z - yuan.root.position.z) < 6 ? [pp.x, pp.z] : null);
        }
      }
      // Momo, while it's his night in your room
      if (momoFrame) {
        momoFrame.visible = momoOn() && pp.y > SIX.y - 6;
        if (momoFrame.visible) { momo.root.position.set(0, 0, 0); momo.update(dt * 0.5, S.momo.awake ? [pp.x, pp.z] : null); momoFrame.updateMatrixWorld(true); momoPose(momoCabin, momoFrame); if (!S.momo.awake) { const h = momo.bones.head; if (h) turn(h, new THREE.Vector3(Math.cos(momoFrame.rotation.y), 0, -Math.sin(momoFrame.rotation.y)), 0.5); } }
      }
      // a scan in progress
      if (S.scanning) {
        const s = S.scanning; s.t += dt; s.pts.geometry.setDrawRange(0, Math.floor(Math.min(1, s.t / 3) * s.n)); s.pts.material.opacity = s.t < 3 ? 0.9 : Math.max(0, 0.9 - (s.t - 3) * 0.6);
        if (s.t >= 3 && !s.done) { s.done = true; finishScan(s.spot); }
        if (s.t > 4.6) { scanGroup.remove(s.pts); s.pts.geometry.dispose(); S.scanning = null; }
      }
    },
  };
}
