// The Yangpu riverside makerspace: an old factory floor by the river where Jibai rents a bench (a DiDi
// away; 杨浦滨江 is lined with converted warehouses like it). Brick, steel trusses, hanging lamps,
// benches, two 3D printers, a CNC, a laser cutter, a shelf of parts, a whiteboard of sketches, and
// Kai, who runs the place (T to talk).
//   E at the bench    the build panel: what you can make, what it needs, build it
//                      (print the housing -> solder six joints, timing your hand -> tune)
//   E at the shelf     buy parts (WeChat Pay)
//   E at the door      a DiDi back to the Bund
// engine/maker.js keeps the score; the space itself is the game's own.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { L, colliders } from './layout.js';
import { createPerson } from './people.js';
import { getLang } from '../ui/i18n.js';
import { stamp, skipTo, pay } from '../engine/life.js';
import { fare, dest } from '../engine/ride.js';
import { PICKUP } from './didi.js';
import { PARTS, BLUEPRINTS, PERKS, maker, level, nextLevelAt, canBuild, buyPart, startBuild, finishBuild, solderJoint, solderWindow } from '../engine/maker.js';

const T = (zh, en) => (getLang() === 'zh' ? zh : en);
export const MAKERS = { x0: 300, x1: 324, z0: -2622, z1: -2600, h: 6.5, spawn: { x: 321.6, z: -2602.4, yaw: 0.84 } };          // in at the door, looking down the room
const M = MAKERS, F = L.deckY;                 // (out here the ground reads as deck height)
{
  const w = (minX, maxX, minZ, maxZ, tag = 'wall') => colliders.push({ minX, maxX, minZ, maxZ, tag, y0: 0, y1: 14 });
  w(M.x0 - 0.4, M.x0, M.z0 - 0.4, M.z1 + 0.4); w(M.x1, M.x1 + 0.4, M.z0 - 0.4, M.z1 + 0.4); w(M.x0 - 0.4, M.x1 + 0.4, M.z0 - 0.4, M.z0); w(M.x0 - 0.4, M.x1 + 0.4, M.z1, M.z1 + 0.4);
  for (const [a, b, c, d] of [[303, 309, -2612.6, -2611.4], [313, 319, -2612.6, -2611.4], [300.2, 301.4, -2620, -2606], [304, 306, -2621.8, -2620.4], [308, 310, -2621.8, -2620.4], [312, 315, -2621.6, -2620.2], [317.5, 320.5, -2618.6, -2616.4]]) w(a, b, c, d, 'furniture');
}

function canvasTex(w, h, draw, rep = [1, 1]) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); return t; }
const brickTex = () => canvasTex(512, 512, (x, w) => {
  x.fillStyle = '#5a2e22'; x.fillRect(0, 0, w, w);
  for (let r = 0; r < 16; r++) for (let c = 0; c < 8; c++) { const off = r % 2 ? 32 : 0; const v = 0.75 + Math.random() * 0.35; x.fillStyle = `rgb(${Math.round(150 * v)},${Math.round(72 * v)},${Math.round(52 * v)})`; x.fillRect(c * 64 + off + 2, r * 32 + 2, 60, 28); }
  x.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 300; i++) x.fillRect(Math.random() * w, Math.random() * w, 3, 3);
}, [6, 2]);
const concreteTex = () => canvasTex(512, 512, (x, w) => { x.fillStyle = '#6b6b68'; x.fillRect(0, 0, w, w); for (let i = 0; i < 9000; i++) { const g = 80 + Math.random() * 60; x.fillStyle = `rgba(${g},${g},${g - 4},0.12)`; x.fillRect(Math.random() * w, Math.random() * w, 2, 2); } x.strokeStyle = 'rgba(30,30,30,0.35)'; x.lineWidth = 2; x.strokeRect(0, 0, w, w); }, [6, 6]);
const boardTex = () => canvasTex(1024, 512, (x, w, h) => {
  x.fillStyle = '#f4f3ef'; x.fillRect(0, 0, w, h); x.strokeStyle = '#1d3a8a'; x.lineWidth = 4; x.fillStyle = '#1d3a8a'; x.font = '600 34px "Noto Sans SC", sans-serif';
  x.fillText('NIGHT GIMBAL v1', 40, 60); x.beginPath(); x.arc(200, 230, 90, 0, Math.PI * 2); x.stroke(); x.strokeRect(120, 150, 160, 40); x.beginPath(); x.moveTo(200, 320); x.lineTo(200, 420); x.stroke();
  x.strokeStyle = '#b3261e'; x.fillStyle = '#b3261e'; x.fillText('PID: P 0.8  I 0.02  D 1.4', 40, 480); x.fillText('激光雷达？', 600, 80);
  x.strokeRect(600, 120, 300, 180); x.beginPath(); for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI; x.moveTo(750, 300); x.lineTo(750 + Math.cos(a) * 140, 300 - Math.sin(a) * 140); } x.stroke();
  x.fillStyle = '#2b7a3d'; x.fillText('知夏: CAN @ 500k', 600, 380); x.fillText('ToF 8x8 zones', 600, 430);
});
const signTex = (lines, { bg = '#0b0b0d', fg = '#ff5a36', w = 1024, h = 256 } = {}) => canvasTex(w, h, (x) => { x.fillStyle = bg; x.fillRect(0, 0, w, h); x.textAlign = 'center'; x.textBaseline = 'middle'; lines.forEach(([t, s, c], i) => { x.font = `700 ${s}px "Noto Sans SC", sans-serif`; x.shadowColor = c || fg; x.shadowBlur = 18; x.fillStyle = c || fg; x.fillText(t, w / 2, h * (i + 1) / (lines.length + 1)); }); });

export function createMakerspace({ scene, people, hud, audio, getLife, save, player, travel, onMode }) {
  const group = new THREE.Group(); group.name = 'makerspace'; group.visible = false; scene.add(group);
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const add = (geo, mat, x, y, z, ry = 0, rx = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); m.receiveShadow = true; m.castShadow = !mat.transparent; group.add(m); return m; };
  const box = (w, h, d, mat, x, y, z, ry = 0) => add(new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z, ry);
  const steel = std({ color: 0x2a2d31, metalness: 0.8, roughness: 0.45 }), wood = std({ color: 0x8a6440, roughness: 0.7 }), dark = std({ color: 0x151515, roughness: 0.6 });
  const lampLit = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.25, 0.85) });
  const lights = [];
  const cx = (M.x0 + M.x1) / 2, cz = (M.z0 + M.z1) / 2, W = M.x1 - M.x0, D = M.z1 - M.z0;
  // the shell: concrete floor, brick walls, a dark roof on steel trusses, frosted factory windows high up
  add(new THREE.PlaneGeometry(W, D), std({ map: concreteTex(), roughness: 0.85, color: 0xd8cfc0, emissive: 0x1e1810 }), cx, F + 0.003, cz, 0, -Math.PI / 2);
  const brick = std({ map: brickTex(), roughness: 0.9, emissive: 0x3a1c10, emissiveIntensity: 1 });   // lamp-warmed brick
  for (const [ax, az, bx, bz] of [[M.x0, M.z0, M.x1, M.z0], [M.x1, M.z1, M.x0, M.z1], [M.x0, M.z1, M.x0, M.z0], [M.x1, M.z0, M.x1, M.z1]]) {
    const len = Math.hypot(bx - ax, bz - az), m = add(new THREE.PlaneGeometry(len, M.h), brick, (ax + bx) / 2, F + M.h / 2, (az + bz) / 2);
    const nx = -(bz - az) / len, nz = (bx - ax) / len, tw = (cx - m.position.x) * nx + (cz - m.position.z) * nz > 0 ? 1 : -1; m.rotation.y = Math.atan2(nx * tw, nz * tw);
    m.material = brick.clone(); m.material.map = brick.map.clone(); m.material.map.repeat.set(len / 4, M.h / 4); m.material.map.needsUpdate = true;
  }
  add(new THREE.PlaneGeometry(W, D), std({ color: 0x1b1c1e, roughness: 0.9, side: THREE.DoubleSide }), cx, F + M.h, cz, 0, Math.PI / 2);
  for (let x = M.x0 + 3; x < M.x1; x += 6) { box(0.18, 0.3, D, steel, x, F + M.h - 0.5, cz); for (let z = M.z0 + 1; z < M.z1; z += 2) add(new THREE.BoxGeometry(0.06, 0.6, 0.06), steel, x, F + M.h - 0.35, z, 0, 0.6); }
  const frost = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.22, 0.26, 0.34) });
  for (let x = M.x0 + 2; x < M.x1 - 1; x += 3.2) for (const z of [M.z0 + 0.02, M.z1 - 0.02]) { add(new THREE.PlaneGeometry(2.4, 1.2), frost, x, F + M.h - 1.3, z, z > cz ? Math.PI : 0); }
  // the sign over the door; the door (to the river walk and the cars)
  add(new THREE.PlaneGeometry(4.2, 1.05), new THREE.MeshBasicMaterial({ map: signTex([['杨浦滨江 · 创客空间', 96], ['YANGPU RIVERSIDE MAKERS', 54, '#ffd2a8']]) }), M.x1 - 0.03, F + 3.9, -2603.5, -Math.PI / 2);
  box(0.1, 2.6, 1.8, std({ color: 0x3b4a3f, metalness: 0.6, roughness: 0.5 }), M.x1 - 0.05, F, -2603.5);
  // benches: two long ones down the middle, pegboards with tools above the wall bench
  const benchTop = std({ color: 0xb08a5a, roughness: 0.55 });
  for (const x of [306, 316]) { box(6, 0.06, 1.2, benchTop, x, F + 0.9, -2612); for (const dx of [-2.8, 2.8]) for (const dz of [-0.5, 0.5]) box(0.06, 0.9, 0.06, steel, x + dx, F, -2612 + dz); }
  box(1.2, 0.06, 14, benchTop, 300.8, F + 0.9, -2613); for (const z of [-2619.5, -2613, -2606.5]) box(0.06, 0.9, 1.1, steel, 300.8, F, z);
  const peg = std({ color: 0xd8cfb8, roughness: 0.8 }); add(new THREE.PlaneGeometry(12, 1.8), peg, M.x0 + 0.03, F + 2.0, -2613, Math.PI / 2);
  for (let i = 0; i < 18; i++) box(0.04, 0.2 + Math.random() * 0.3, 0.06 + Math.random() * 0.1, i % 3 ? steel : std({ color: [0xc0392b, 0xe67e22, 0x2c7be5][i % 3], roughness: 0.5 }), M.x0 + 0.08, F + 1.6 + Math.random() * 0.6, -2619 + i * 0.68);
  // on your bench (the east one): a soldering station with its lamp, a gimbal in pieces, a laptop
  const B = { x: 316, z: -2612 };
  box(0.3, 0.12, 0.22, std({ color: 0x1f6fd1, roughness: 0.4 }), B.x - 1.6, F + 0.93, B.z - 0.2);
  add(new THREE.CylinderGeometry(0.01, 0.01, 0.4, 6), steel, B.x - 1.5, F + 1.15, B.z - 0.15).rotation.z = 0.6;
  const lampArm = new THREE.Group(); lampArm.position.set(B.x - 0.4, F + 0.96, B.z - 0.45); group.add(lampArm);
  const la = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 6), steel); la.position.y = 0.35; la.rotation.z = -0.4; lampArm.add(la);
  const lh = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.14, 16, 1, true), dark); lh.position.set(0.28, 0.66, 0); lh.rotation.z = 2.4; lampArm.add(lh);
  const lbulb = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), lampLit); lbulb.position.set(0.31, 0.62, 0); lbulb.rotation.x = Math.PI / 2; lampArm.add(lbulb);
  box(0.36, 0.02, 0.26, dark, B.x + 0.9, F + 0.93, B.z + 0.1); add(new THREE.PlaneGeometry(0.34, 0.22), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.4, 0.55) }), B.x + 0.9, F + 1.05, B.z - 0.02, 0, -0.3);
  const pieces = new THREE.Group(); pieces.position.set(B.x, F + 0.93, B.z); group.add(pieces);
  for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 18), std({ color: 0x222, metalness: 0.7, roughness: 0.4 })); m.position.set(-0.2 + i * 0.12, 0.01, 0.1); pieces.add(m); }
  const finished = new THREE.Group(); finished.visible = false; pieces.parent.add(finished); finished.position.set(B.x + 0.2, F + 0.93, B.z + 0.15);
  { const a = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.04), dark); a.position.y = 0.1; finished.add(a); const b = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.03), dark); b.position.y = 0.21; finished.add(b); const c = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.01), std({ color: 0x111, roughness: 0.2, metalness: 0.5 })); c.position.set(0.07, 0.26, 0); finished.add(c); }
  // two 3D printers (the print head moves), a CNC, a laser cutter
  const printers = [];
  for (const [x, z] of [[305, -2621.1], [309, -2621.1]]) {
    const g = new THREE.Group(); g.position.set(x, F, z); group.add(g);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), std({ color: 0x1a1a1a, roughness: 0.4, transparent: true, opacity: 0.35 })); fr.position.y = 0.95; g.add(fr);
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 1.2), steel); base.position.y = 0.25; g.add(base);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.12), std({ color: 0xe67e22, roughness: 0.4 })); head.position.y = 1.2; g.add(head);
    const part = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.15), std({ color: 0x3a7bd5, roughness: 0.6 })); part.position.y = 0.53; g.add(part);
    printers.push({ head, part, t: Math.random() * 10 });
  }
  box(3, 1.6, 1.4, std({ color: 0x5f6b73, metalness: 0.5, roughness: 0.5 }), 313.5, F, -2620.9);
  add(new THREE.PlaneGeometry(1.2, 0.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.4, 0.25) }), 313.5, F + 1.2, -2620.18);
  box(3, 1.0, 2.2, std({ color: 0xdcdcd8, roughness: 0.5 }), 319, F, -2617.5);
  // the parts shelf (bins), the whiteboard, a sofa and a coffee machine
  for (let r = 0; r < 4; r++) { box(1.2, 0.04, 14, steel, 300.4 + 0, F + 2.9 + r * 0.0, -2613); }
  const shelf = { x: 302.4, z: -2604.2 };
  box(2.4, 2.2, 0.5, steel, shelf.x, F, shelf.z);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) box(0.34, 0.26, 0.4, std({ color: [0x2c7be5, 0xe74c3c, 0xf1c40f, 0x27ae60][(r + c) % 4], roughness: 0.6 }), shelf.x - 0.95 + c * 0.38, F + 0.15 + r * 0.52, shelf.z + 0.03);
  add(new THREE.PlaneGeometry(4, 2), std({ map: boardTex(), roughness: 0.3, emissive: 0x202020 }), 311, F + 1.9, M.z1 - 0.04, Math.PI);
  box(2.2, 0.45, 0.9, std({ color: 0x3d4f5c, roughness: 0.9 }), 306, F, -2602); box(2.2, 0.5, 0.25, std({ color: 0x3d4f5c, roughness: 0.9 }), 306, F + 0.45, -2601.5);
  box(0.4, 0.5, 0.4, dark, 300.8, F + 0.96, -2606.8);
  // hanging lamps
  for (const [x, z] of [[306, -2612], [316, -2612], [311, -2606], [303, -2618], [319, -2606]]) {
    add(new THREE.CylinderGeometry(0.005, 0.005, 2.6, 4), dark, x, F + M.h - 1.3, z);
    add(new THREE.ConeGeometry(0.32, 0.26, 20, 1, true), std({ color: 0x1a3d2f, roughness: 0.4, metalness: 0.4, side: THREE.DoubleSide }), x, F + M.h - 2.65, z);
    add(new THREE.CircleGeometry(0.2, 16), lampLit, x, F + M.h - 2.76, z, 0, Math.PI / 2);
    lights.push({ x, y: F + M.h - 2.9, z, intensity: 14, distance: 14, color: new THREE.Color(1.0, 0.82, 0.6) });
  }
  // Kai
  let kai = null;
  if (people) { kai = createPerson(people, 'p1'); kai.root.position.set(308.6, F, -2610.6); kai.root.rotation.y = 2.2; kai.play('idle', 0); kai.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); group.add(kai.root); }

  // ================= the build panel =================
  const el = document.createElement('div'); el.id = 'build'; document.body.appendChild(el);
  const S = { here: false, open: false, tab: 'plans', building: null, step: null, joints: [], phase: 0, dir: 1, speed: 0.9, kaiSaid: false };
  const L0 = () => getLife();
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function render() {
    const l = L0(), m = maker(l), lv = level(m), nx = nextLevelAt(m);
    const head = `<div class="hd"><b>${T('工作台', 'Workbench')}</b><span class="lv">${T('创客', 'Maker')} ${lv} · ${m.xp}${nx ? ` / ${nx}` : ''} XP</span><span class="x" data-b="close">Esc</span></div>
      <div class="tabs"><span data-b="tab:plans" class="${S.tab === 'plans' ? 'on' : ''}">${T('图纸', 'Blueprints')}</span><span data-b="tab:parts" class="${S.tab === 'parts' ? 'on' : ''}">${T('零件', 'Parts')}</span><span data-b="tab:perks" class="${S.tab === 'perks' ? 'on' : ''}">${T('成长', 'Perks')}</span></div>`;
    if (S.step === 'solder') {
      const n = S.joints.length;
      el.innerHTML = `${head}<div class="solder"><div class="t">${T(`焊第 ${n + 1} / 6 个焊点：标记进入绿色区域时按 空格`, `Joint ${n + 1} of 6: press Space as the marker crosses the green`)}</div>
        <div class="bar"><div class="win" style="left:${(0.5 - solderWindow(level(maker(l)))) * 100}%;width:${solderWindow(level(maker(l))) * 200}%"></div><div class="mk" style="left:${S.phase * 100}%"></div></div>
        <div class="js">${S.joints.map((q) => `<i class="${q > 0.85 ? 'g' : q > 0.5 ? 'o' : 'b'}"></i>`).join('')}</div></div>`;
      return;
    }
    let body = '';
    if (S.tab === 'plans') body = Object.entries(BLUEPRINTS).map(([id, B]) => {
      const c = canBuild(l, id), have = m.gadgets[id];
      const parts = Object.entries(B.parts).map(([k, n]) => { const got = k === 'pla' ? n : Math.min(n, m.parts[k] || 0); return `<span class="${got >= n ? 'ok' : 'no'}">${esc(T(PARTS[k].zh, PARTS[k].en))} ${got}/${n}</span>`; }).join('');
      const why = have ? T('已做好', 'Built') : c.reason === 'level' ? T(`需要创客 ${c.need}`, `Needs Maker ${c.need}`) : c.reason === 'parts' ? T('缺零件', 'Missing parts') : '';
      return `<div class="bp ${have ? 'done' : ''}"><div class="n">${esc(T(B.zh, B.en))}<small>${T('创客', 'Maker')} ${B.level} · +${B.xp} XP</small></div><div class="u">${esc(T(B.use.zh, B.use.en))}</div><div class="ps">${parts}</div>
        ${c.ok ? `<button data-b="build:${id}">${T('开始制作', 'Build it')}</button>` : `<div class="why">${why}</div>`}</div>`;
    }).join('');
    else if (S.tab === 'parts') body = Object.entries(PARTS).filter(([k]) => k !== 'pla').map(([k, P]) => `<div class="pt"><span>${esc(T(P.zh, P.en))}</span><span class="h">${T('有', 'have')} ${m.parts[k] || 0}</span><button data-b="buy:${k}">¥${P.price}</button></div>`).join('') + `<div class="note">${T('货架上的零件用微信支付；也可以在淘宝、京东下单送到酒店。', 'Shelf parts are paid with WeChat Pay; or order them on Taobao or JD to the hotel.')}</div>`;
    else body = Object.entries(PERKS).map(([n, p]) => `<div class="pk ${lv >= +n ? 'on' : ''}"><b>${T('创客', 'Maker')} ${n}</b> ${esc(T(p.zh, p.en))}</div>`).join('') + `<div class="note">${T(`粉丝 ${m.followers.toLocaleString()} · 成就 ${m.achievements.length}`, `Followers ${m.followers.toLocaleString()} · Achievements ${m.achievements.length}`)}</div>`;
    el.innerHTML = `${head}<div class="body">${body}</div>`;
  }
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-b]'); if (!b) return; const [a, v] = b.dataset.b.split(':'); const l = L0();
    if (a === 'close') close();
    else if (a === 'tab') { S.tab = v; render(); }
    else if (a === 'buy') { const r = buyPart(l, v, 1); if (!r.ok) hud.toast(T('余额不足', 'Not enough in WeChat Pay'), 2); else { audio && audio.cue && audio.cue('ping', 0, 0.3); save && save(); } render(); }
    else if (a === 'build') build(v);
  });
  function open() { S.open = true; S.tab = 'plans'; S.step = null; el.classList.add('on'); render(); onMode && onMode('build'); }
  function close() { if (S.step === 'solder') return; S.open = false; el.classList.remove('on'); onMode && onMode('play'); }
  // building: print (time passes), solder six joints, tune -> the gadget
  function build(id) {
    const l = L0(), s = startBuild(l, id); if (!s.ok) return;
    S.building = s.build; save && save();
    el.classList.remove('on');
    travel(async () => { skipTo(l, stamp(l) + 40); }, { line: T('3D 打印外壳 · 四十分钟', '3D printing the housing · forty minutes'), hold: 900, to: 'build' });
    setTimeout(() => { S.step = 'solder'; S.joints = []; S.phase = 0; el.classList.add('on'); render(); }, 2400);
  }
  function solder() {
    const lv = level(maker(L0())), q = solderJoint(S.phase, lv);
    S.joints.push(q); audio && audio.cue && audio.cue(q > 0.6 ? 'ping' : 'bump', 0, 0.25);
    S.speed = 0.9 + S.joints.length * 0.12;
    if (S.joints.length < 6) { render(); return; }
    const quality = S.joints.reduce((a, b) => a + b, 0) / S.joints.length, l = L0();
    const r = finishBuild(l, S.building, quality); S.step = null; S.building = null; save && save();
    finished.visible = true; pieces.visible = false;
    hud.toast(T(`做好了！质量 ${Math.round(quality * 100)}% · +${r.xp} 创客经验${r.levelUp ? ` · 升到创客 ${r.levelUp}` : ''}`, `Built! Quality ${Math.round(quality * 100)}% · +${r.xp} Maker XP${r.levelUp ? ` · Maker ${r.levelUp}` : ''}`), 4.5);
    for (const a of r.achievements) setTimeout(() => hud.achievement && hud.achievement(T(a.zh, a.en)), 1500);
    if (kai) setTimeout(() => hud.bark({ speaker: { zh: '阿凯', en: 'Kai' }, text: quality > 0.8 ? { zh: '可以啊小沈，焊点很漂亮。', en: 'Nice one. Those joints are clean.' } : { zh: '能用就行，下次手再稳一点。', en: 'It works. Steadier hand next time.' }, who: 'maker', seconds: 3 }), 900);
    render(); setTimeout(() => close(), 2500);
  }
  function leave() {
    const l = L0(), d = dest('yangpu'), back = fare(d, l.clock.minute);
    travel(async () => {
      skipTo(l, stamp(l) + 10 + d.mins);
      const r = pay(l, { method: 'wechat', amount: back, to: '滴滴出行', memo: '快车 → 外滩', kind: 'ride' }); if (r.ok) r.entry.memoEn = 'DiDi Express to the Bund';
      S.here = false; group.visible = false; player.teleport(PICKUP.x, PICKUP.z - 1.2, Math.PI / 2, 0); save && save();
    }, { line: T(`一辆滴滴把你送回了外滩 · ¥${back}`, `A DiDi brings you back to the Bund · ¥${back}`), hold: 1400, to: 'play' });
  }
  const targets = [
    { id: 'kBench', x: B.x, y: F + 1.0, z: B.z + 0.4, reach: 2.6 },
    { id: 'kShelf', x: shelf.x, y: F + 1.1, z: shelf.z + 0.3, reach: 2.4 },
    { id: 'kDoor', x: M.x1 - 0.1, y: F + 1.3, z: -2603.5, reach: 2.6 },
  ];
  return {
    group, lights,
    get here() { return S.here; }, get open() { return S.open; }, get step() { return S.step; },
    arrive(id) {
      if (id !== 'yangpu') return false;
      S.here = true; group.visible = true; const m = maker(L0()); finished.visible = !!m.gadgets.gimbal; pieces.visible = !m.gadgets.gimbal;
      travel(async () => { player.teleport(M.spawn.x, M.spawn.z, M.spawn.yaw, 0); }, { line: T('杨浦滨江 · 创客空间', 'Yangpu riverside · the makerspace'), hold: 900, to: 'play' });
      if (!S.kaiSaid && kai) { S.kaiSaid = true; setTimeout(() => hud.bark({ speaker: { zh: '阿凯', en: 'Kai' }, text: { zh: '小沈来啦！你的工作台给你留着，零件在门口那个架子上。', en: "Hey, Shen! Your bench is waiting. Parts are on the shelf by the door." }, who: 'maker', seconds: 4 }), 3500); }
      return true;
    },
    candidates() { return S.here && !S.open ? targets.map((t) => ({ ...t, cone: 0.6 })) : []; },
    prompt(id) { return { kBench: { target: T('工作台', 'Your bench'), action: T('制作', 'Build') }, kShelf: { target: T('零件架', 'Parts shelf'), action: T('买零件', 'Buy parts') }, kDoor: { target: T('门口', 'The door'), action: T('打车回外滩', 'A car back to the Bund') } }[id] || null; },
    owns(id) { return targets.some((t) => t.id === id); },
    interact(id) { if (id === 'kBench') open(); else if (id === 'kShelf') { open(); S.tab = 'parts'; render(); } else if (id === 'kDoor') leave(); return true; },
    talkables() { return S.here && kai ? [{ key: 'kai', persona: 'maker', x: kai.root.position.x, y: F + 1.62, z: kai.root.position.z, hold() {} }] : []; },
    key(code) {
      if (!S.open) return false;
      if (S.step === 'solder' && (code === 'Space' || code === 'KeyE')) { solder(); return true; }
      if (code === 'Escape') { close(); return true; }
      return true;
    },
    update(dt, pp) {
      if (!S.here) return;
      for (const p of printers) { p.t += dt; p.head.position.x = Math.sin(p.t * 3.1) * 0.3; p.head.position.z = Math.cos(p.t * 2.3) * 0.25; p.part.scale.y = 1 + (p.t % 20) / 20; }
      if (kai) kai.update(dt, Math.hypot(pp.x - kai.root.position.x, pp.z - kai.root.position.z) < 5 ? [pp.x, pp.z] : null);
      if (S.step === 'solder') { S.phase += S.dir * S.speed * dt; if (S.phase > 1) { S.phase = 1; S.dir = -1; } if (S.phase < 0) { S.phase = 0; S.dir = 1; } const mk = el.querySelector('.mk'); if (mk) mk.style.left = `${S.phase * 100}%`; }
    },
  };
}
