// A shengjian shop on Nanjing Road East (phase 4.4): pan-fried pork buns, the kind of place that's on
// every other corner in Shanghai. The name, 阿潮生煎 (A-Chao Shengjian), is invented.
// Walk in; order at the counter (1-5 add to the order, Enter pays by phone, Esc cancels); the cook
// lifts the lid of the big iron pan and calls your order; take the tray (E) and sit at a table (E).
// Seated: 1 bite a small hole and sip the soup first (the way to do it), 2 pop one in whole (hot),
// 3 drink the soup; E stands you up. Open 6:30 am to 9:30 pm; the shutter is down otherwise.
import * as THREE from 'three';
import { Batch } from './geo.js';
import { makeCanvas, tex, FONT, glowTexture } from './canvas.js';
import { DUMPLING as D, L as LAYOUT, addDynamicCollider } from './layout.js';
import { createPerson } from './people.js';
import { createSeatedPose } from './driverPose.js';
import { stamp, pay } from '../engine/life.js';
import { getLang } from '../ui/i18n.js';

const T = (zh, en) => (getLang() === 'zh' ? zh : en);
const Y0 = LAYOUT.curbH, H = 4.4;
export const MENU = [
  { id: 'sj4', zh: '生煎（4只）', en: 'Shengjian (4)', price: 12, buns: 4 },
  { id: 'sj8', zh: '生煎（8只）', en: 'Shengjian (8)', price: 22, buns: 8 },
  { id: 'beef', zh: '牛肉粉丝汤', en: 'Beef vermicelli soup', price: 15, soup: 1 },
  { id: 'curry', zh: '咖喱牛肉汤', en: 'Curry beef soup', price: 15, soup: 1 },
  { id: 'soy', zh: '豆浆', en: 'Soy milk', price: 4, drink: 1 },
];
export const SHOP_LINES = {
  hello: ['cashier', '要点什么？', 'What can I get you?'],
  scan: ['cashier', '扫这里就好。', 'Just scan here.'],
  wait: ['cashier', '稍等一下，马上就好。', 'Won\'t be a moment.'],
  ready: ['cook', '生煎好了！小心烫！', 'Shengjian\'s up! Careful, they\'re hot!'],
  bye: ['cashier', '慢走啊！', 'Take care now!'],
};
const open = (m) => m >= 6 * 60 + 30 && m < 21 * 60 + 30;
const cx = (D.x0 + D.x1) / 2;

function signTexture() {
  const [c, x] = makeCanvas(1024, 192);
  const g = x.createLinearGradient(0, 0, 0, 192); g.addColorStop(0, '#9b1b1b'); g.addColorStop(1, '#6e1010');
  x.fillStyle = g; x.fillRect(0, 0, 1024, 192);
  x.fillStyle = '#ffd98a'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `900 112px ${FONT.serif}`; x.fillText('阿潮生煎', 400, 98);
  x.font = `700 34px ${FONT.sans}`; x.fillStyle = '#ffe9c4'; x.fillText('A-CHAO', 860, 76); x.fillText('SHENGJIAN', 860, 120);
  return tex(c, { repeat: false });
}
function menuTexture() {
  const [c, x] = makeCanvas(1024, 384);
  x.fillStyle = '#1b1b1b'; x.fillRect(0, 0, 1024, 384);
  x.fillStyle = '#ffd98a'; x.font = `900 52px ${FONT.serif}`; x.textAlign = 'left'; x.fillText('菜单 MENU', 40, 70);
  MENU.forEach((m, i) => {
    const y = 140 + i * 50; x.fillStyle = '#ffffff'; x.font = `700 38px ${FONT.sans}`; x.fillText(m.zh, 40, y);
    x.fillStyle = '#c9c9c9'; x.font = `500 26px ${FONT.sans}`; x.fillText(m.en, 400, y);
    x.fillStyle = '#ffd98a'; x.font = `800 38px ${FONT.sans}`; x.textAlign = 'right'; x.fillText(`¥${m.price}`, 980, y); x.textAlign = 'left';
  });
  return tex(c, { repeat: false });
}
function tileTexture() {
  const [c, x] = makeCanvas(256, 256);
  x.fillStyle = '#e9e7e1'; x.fillRect(0, 0, 256, 256);
  x.strokeStyle = 'rgba(120,120,115,0.5)'; x.lineWidth = 2;
  for (let i = 0; i <= 256; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(256, i); x.stroke(); }
  return tex(c);
}

export function createDumpling({ scene, people, player, hud, audio, voice, getLife, save, onMode }) {
  const group = new THREE.Group(); group.name = 'dumpling-shop'; scene.add(group);
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const L0 = () => getLife();
  const F = () => { const l = L0(); return l.flags.food || (l.flags.food = { shengjian: 0, visits: 0 }); };
  // ---- the room ----
  const B = { floor: new Batch(), tile: new Batch(), wall: new Batch(), steel: new Batch(), wood: new Batch(), iron: new Batch(), red: new Batch(), dark: new Batch() };
  const z0 = D.z0, z1 = D.z1, x0 = D.x0, x1 = D.x1;
  B.floor.floor(x0, x1, z0, z1, Y0 + 0.002, 1.2);
  // walls: white tile to 1.4 m, cream above; the ceiling
  for (const [ax, az, bx, bz] of [[x0 + 0.15, z0, x0 + 0.15, z1], [x1 - 0.15, z1, x1 - 0.15, z0], [x0, z1 - 0.01, x1, z1 - 0.01]]) {
    const len = Math.hypot(bx - ax, bz - az), mx = (ax + bx) / 2, mz = (az + bz) / 2, along = Math.abs(bx - ax) > 0.1;
    B.tile.box(mx, Y0, mz, along ? len : 0.04, 1.4, along ? 0.04 : len);
    B.wall.box(mx, Y0 + 1.4, mz, along ? len : 0.03, H - 1.4, along ? 0.03 : len);
  }
  B.wall.box(cx, Y0 + H, (z0 + z1) / 2, x1 - x0, 0.1, z1 - z0);
  // the shopfront: piers either side, a low sill and glass, the door in the middle (layout.js colliders match)
  for (const x of [x0 + 0.2, x1 - 0.2]) B.dark.box(x, Y0, z0 + 0.15, 0.4, H, 0.4);
  for (const [a, b] of [[x0 + 0.4, x0 + 3.6], [x1 - 3.6, x1 - 0.4]]) B.dark.box((a + b) / 2, Y0, z0 + 0.1, b - a, 0.6, 0.2);
  B.dark.box(cx, Y0 + 3.3, z0 + 0.1, x1 - x0 - 0.8, 0.12, 0.2);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), std({ color: 0xbfd2d8, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.22, side: THREE.DoubleSide }));
  for (const [a, b] of [[x0 + 0.4, x0 + 3.6], [x1 - 3.6, x1 - 0.4]]) { const g = glass.clone(); g.scale.set(b - a, 2.7, 1); g.position.set((a + b) / 2, Y0 + 0.6 + 1.35, z0 + 0.08); group.add(g); }
  // the order counter (front left, facing the door) and the kitchen along the back
  B.steel.box(x0 + 1.6, Y0, z0 + 3.4, 2.6, 1.05, 0.7); B.wood.box(x0 + 1.6, Y0 + 1.05, z0 + 3.4, 2.7, 0.05, 0.8);
  B.steel.box(cx, Y0, z1 - 1.0, x1 - x0 - 0.6, 0.95, 0.8);                     // the kitchen counter, with the pass
  B.steel.box(cx, Y0 + 0.95, z1 - 1.0, x1 - x0 - 0.6, 0.04, 0.85);
  // the pans: two big flat iron pans on burners, wooden lids
  const pans = [];
  for (const px of [cx - 1.8, cx + 0.4]) {
    B.iron.cyl(px, Y0 + 0.99, z1 - 1.0, 0.56, 0.52, 0.12, 28);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.05, 28), std({ color: 0x8b6a45, roughness: 0.7 }));
    const pivot = new THREE.Group(); pivot.position.set(px, Y0 + 1.12, z1 - 1.0 - 0.58); lid.position.set(0, 0.02, 0.58); pivot.add(lid); group.add(pivot);
    pans.push({ x: px, z: z1 - 1.0, pivot });
  }
  // a pan full of buns: rows of little white domes, golden underneath, sesame and scallion on top
  const bunGeo = new THREE.SphereGeometry(0.045, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); bunGeo.scale(1, 0.72, 1);
  const bunMat = std({ color: 0xf2e8d6, roughness: 0.7 });
  for (const p of pans) {
    const n = 52, im = new THREE.InstancedMesh(bunGeo, bunMat, n), m = new THREE.Matrix4(); let k = 0;
    for (let r = 0.08; r < 0.5 && k < n; r += 0.1) for (let a = 0; a < Math.PI * 2 && k < n; a += 0.105 / r) { m.makeTranslation(p.x + Math.cos(a) * r, Y0 + 1.06, p.z + Math.sin(a) * r); im.setMatrixAt(k++, m); }
    im.count = k; group.add(im);
  }
  // tables and stools on the right
  const tables = [];
  for (const [tx, tz] of [[x1 - 1.3, z0 + 2.4], [x1 - 1.3, z0 + 4.6], [x1 - 3.4, z0 + 2.4], [x1 - 3.4, z0 + 4.6]]) {
    B.wood.box(tx, Y0 + 0.72, tz, 0.75, 0.04, 0.75); B.iron.box(tx, Y0, tz, 0.06, 0.72, 0.06);
    const seats = [];
    for (const [sx, sz, yaw] of [[0, -0.62, 0], [0, 0.62, Math.PI]]) { B.red.cyl(tx + sx, Y0, tz + sz, 0.17, 0.15, 0.45, 12); seats.push({ x: tx + sx, z: tz + sz, yaw }); }
    tables.push({ x: tx, z: tz, seats, busy: false });
  }
  const mats = {
    floor: std({ map: tileTexture(), roughness: 0.35 }), tile: std({ color: 0xf2f1ee, roughness: 0.2 }), wall: std({ color: 0xece2cc, roughness: 0.8 }),
    steel: std({ color: 0xb8bcc0, metalness: 0.85, roughness: 0.32 }), wood: std({ color: 0x8a6440, roughness: 0.6 }), iron: std({ color: 0x1b1b1d, metalness: 0.6, roughness: 0.5 }),
    red: std({ color: 0xa61d1d, roughness: 0.5 }), dark: std({ color: 0x2a2624, roughness: 0.5, metalness: 0.3 }),
  };
  mats.floor.map.repeat.set(1, 1);
  for (const k of Object.keys(B)) { const m = B[k].mesh(mats[k], `dumpling-${k}`); m.receiveShadow = true; m.castShadow = k !== 'floor'; group.add(m); }
  // the sign over the door, the menu over the kitchen, ceiling panels
  const signMat = new THREE.MeshBasicMaterial({ map: signTexture() }); signMat.color.setScalar(1.15);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 - 0.6, (x1 - x0 - 0.6) * 0.1875), signMat); sign.position.set(cx, Y0 + 3.85, z0 - 0.02); sign.rotation.y = Math.PI; group.add(sign);
  const menuMat = new THREE.MeshBasicMaterial({ map: menuTexture() }); menuMat.color.setScalar(1.1);
  const menu = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.35), menuMat); menu.position.set(cx - 0.6, Y0 + 2.6, z1 - 0.04); menu.rotation.y = Math.PI; group.add(menu);
  const panelMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.85, 1.9) });
  for (const [px, pz] of [[cx - 2.5, z0 + 2.5], [cx + 2.5, z0 + 2.5], [cx - 2.5, z1 - 2.5], [cx + 2.5, z1 - 2.5]]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), panelMat); p.rotation.x = Math.PI / 2; p.position.set(px, Y0 + H - 0.06, pz); group.add(p); }
  // steam off the pans
  const steamMat = new THREE.SpriteMaterial({ map: glowTexture(64, [[0, 0.35], [0.5, 0.12], [1, 0]]), color: 0xffffff, transparent: true, depthWrite: false, opacity: 0.4 });
  const steam = Array.from({ length: 10 }, (_, i) => { const s = new THREE.Sprite(steamMat.clone()); s.userData = { p: pans[i % 2], t: Math.random() * 3 }; group.add(s); return s; });
  // the roller shutter, down when closed
  const shutterTex = (() => { const [c, x] = makeCanvas(64, 256); for (let y = 0; y < 256; y += 8) { x.fillStyle = y % 16 ? '#8d9196' : '#a3a7ab'; x.fillRect(0, y, 64, 8); } return tex(c); })();
  shutterTex.repeat.set(4, 4);
  const shutter = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 - 0.4, 3.3), std({ map: shutterTex, metalness: 0.6, roughness: 0.5 })); shutter.position.set(cx, Y0 + 1.65, z0 - 0.06); shutter.rotation.y = Math.PI; group.add(shutter);
  const doorBox = addDynamicCollider('shop');
  // static furniture colliders
  for (const [a, b, c, d] of [[x0 + 0.25, x0 + 2.95, z0 + 3.0, z0 + 3.8], [x0 + 0.3, x1 - 0.3, z1 - 1.45, z1 - 0.55], ...tables.map((t) => [t.x - 0.42, t.x + 0.42, t.z - 0.42, t.z + 0.42])]) {
    const bx = addDynamicCollider('furniture'); Object.assign(bx, { minX: a, maxX: b, minZ: c, maxZ: d });
  }
  const lights = [[cx - 2, z0 + 3], [cx + 2, z0 + 3], [cx, z1 - 2]].map(([x, z]) => ({ x, y: Y0 + H - 0.4, z, intensity: 9, distance: 9, color: new THREE.Color(0.98, 0.97, 0.95), on: () => open(L0().clock.minute) }));

  // ---- the people: the cashier, the cook, a diner ----
  const ppl = {};
  if (people) {
    const add = (key, role, x, z, yaw, anim) => { if (!people.manifest.cast[role]) return; const p = createPerson(people, role); p.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); p.root.position.set(x, Y0, z); p.root.rotation.y = yaw; p.play(anim, 0); group.add(p.root); ppl[key] = { p, x, z }; };
    add('cashier', 'c4', x0 + 1.6, z0 + 4.15, Math.PI, 'idle');
    add('cook', 'p3', cx - 0.7, z1 - 0.35, Math.PI, 'look');
    // a diner at the far table, eating
    if (people.manifest.cast.c2) {
      const t = tables[3], s = t.seats[1], frame = new THREE.Group(); frame.position.set(s.x, Y0, s.z); frame.rotation.y = s.yaw; group.add(frame);
      const p = createPerson(people, 'c2'); p.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); frame.add(p.root); p.play('idle', 0); p.update(0);
      const pose = createSeatedPose(p, { recline: -0.05, elbows: 0.5 });
      const cabin = { hip: new THREE.Vector3(0, 0.47, 0), pedals: [new THREE.Vector3(-0.12, 0.02, 0.35), new THREE.Vector3(0.13, 0.02, 0.38)], rimPoint(a, out) { return out.copy(frame.localToWorld(new THREE.Vector3(a * 0.16, 0.8, 0.42))); } };
      ppl.diner = { p, frame, pose, cabin }; t.busy = true;
    }
  }
  const headOf = (k) => { const q = ppl[k]; const v = new THREE.Vector3(); if (q && q.p.bones.head) q.p.bones.head.getWorldPosition(v); else v.set(x0 + 1.6, Y0 + 1.6, z0 + 4.1); return v; };
  const say = (key) => { const [who, zh, en] = SHOP_LINES[key]; const h = headOf(who === 'cook' ? 'cook' : 'cashier'); voice.say({ zh, en, who, at: [h.x, h.y, h.z] }); hud.bark({ speaker: who === 'cook' ? { zh: '师傅', en: 'The cook' } : { zh: '收银', en: 'At the counter' }, text: { zh, en }, voice: false, seconds: 3 }); };

  // ---- the order card ----
  const card = document.createElement('div'); card.id = 'shop-menu'; card.className = 'hidden'; document.body.appendChild(card);
  const S = { order: null, cart: {}, ready: 0, tray: null, seated: null, eaten: 0, soup: 0, burnt: false, said: 0, inside: false };
  const total = () => MENU.reduce((s, m) => s + (S.cart[m.id] || 0) * m.price, 0);
  function renderCard() {
    const rows = MENU.map((m, i) => `<button data-i="${i}"><kbd>${i + 1}</kbd><span class="n">${T(m.zh, m.en)}</span><span class="q">${S.cart[m.id] ? `×${S.cart[m.id]}` : ''}</span><span class="p">¥${m.price}</span></button>`).join('');
    card.innerHTML = `<div class="in"><div class="h">${T('阿潮生煎 · 点单', 'A-Chao Shengjian · Order')}</div>${rows}
      <div class="t"><span>${T('合计', 'Total')}</span><b>¥${total()}</b></div>
      <div class="a"><button data-a="pay" class="mbtn primary">${T('易付付款 (Enter)', 'Pay with YiPay (Enter)')}</button><button data-a="clear" class="mbtn">${T('清空 (0)', 'Clear (0)')}</button><button data-a="close" class="mbtn">${T('算了 (Esc)', 'Never mind (Esc)')}</button></div></div>`;
  }
  card.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.i) add(+b.dataset.i); else if (b.dataset.a === 'pay') checkout(); else if (b.dataset.a === 'clear') { S.cart = {}; renderCard(); } else if (b.dataset.a === 'close') closeCard(); });
  const add = (i) => { const m = MENU[i]; if (!m) return; S.cart[m.id] = Math.min(4, (S.cart[m.id] || 0) + 1); renderCard(); };
  function openCard() { S.cart = {}; renderCard(); card.classList.remove('hidden'); S.cardOpen = true; onMode && onMode('menu'); say('hello'); }
  function closeCard() { card.classList.add('hidden'); S.cardOpen = false; onMode && onMode('play'); }
  function checkout() {
    const sum = total(); if (!sum) return;
    const l = L0(), items = MENU.filter((m) => S.cart[m.id]).map((m) => `${m.zh}×${S.cart[m.id]}`).join(' ');
    const r = pay(l, { method: 'alipay', amount: sum, to: '阿潮生煎', memo: items, kind: 'food' });
    if (!r.ok) { hud.toast(T('易付余额不足。', 'Not enough on YiPay.'), 3); return; }
    audio && audio.cue && audio.cue('ping', 0, 0.8);
    const buns = MENU.reduce((s, m) => s + (S.cart[m.id] || 0) * (m.buns || 0), 0), soup = MENU.reduce((s, m) => s + (S.cart[m.id] || 0) * (m.soup || 0), 0), drink = MENU.reduce((s, m) => s + (S.cart[m.id] || 0) * (m.drink || 0), 0);
    S.order = { buns, soup, drink, number: 20 + Math.floor(Math.random() * 60), at: stamp(l) }; S.ready = 12;   // (a batch is already in the pan)
    closeCard(); say('scan'); setTimeout(() => say('wait'), 2200);
    hud.toast(T(`付了 ¥${sum} · 取餐号 ${S.order.number}`, `Paid ¥${sum} · order number ${S.order.number}`), 3.5);
    save && save();
  }

  // ---- the tray on the table: buns, a bowl, the vinegar dish ----
  const trayG = new THREE.Group(); trayG.visible = false; group.add(trayG);
  const plateMat = std({ color: 0xf5f5f2, roughness: 0.25 });
  const trayBuns = [];
  { const tray = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.015, 0.34), std({ color: 0xc23b2a, roughness: 0.4 })); trayG.add(tray);
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.015, 24), plateMat); plate.position.set(-0.08, 0.015, 0); trayG.add(plate);
    const bunGeo2 = new THREE.SphereGeometry(0.03, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2); bunGeo2.scale(1, 0.75, 1);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, r = i < 6 ? 0.06 : 0.0, b = new THREE.Mesh(bunGeo2, bunMat); b.position.set(-0.08 + Math.cos(a) * (i < 7 ? 0.065 : 0), 0.022, Math.sin(a) * (i < 7 ? 0.065 : 0)); trayG.add(b); trayBuns.push(b); }
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.05, 0.07, 20, 1, true), plateMat); bowl.position.set(0.13, 0.05, 0.03); trayG.add(bowl);
    const brothM = std({ color: 0x9a6a3a, roughness: 0.15 }); const broth = new THREE.Mesh(new THREE.CircleGeometry(0.07, 20), brothM); broth.rotation.x = -Math.PI / 2; broth.position.set(0.13, 0.075, 0.03); trayG.add(broth); trayG.userData.broth = broth; trayG.userData.bowl = bowl;
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.012, 16), plateMat); dish.position.set(0.12, 0.012, -0.11); trayG.add(dish);
    const vin = new THREE.Mesh(new THREE.CircleGeometry(0.028, 16), std({ color: 0x3a1a0a, roughness: 0.1 })); vin.rotation.x = -Math.PI / 2; vin.position.set(0.12, 0.02, -0.11); trayG.add(vin);
  }
  function setTray() {
    const o = S.tray; trayBuns.forEach((b, i) => { b.visible = !!o && i < o.buns - S.eaten && i < 8; });
    trayG.userData.bowl.visible = trayG.userData.broth.visible = !!o && o.soup > 0;
    if (o && o.soup) trayG.userData.broth.position.y = 0.075 - 0.05 * Math.min(1, S.soup / 3);
  }
  // seated: the subtitle box shows what's left and the choices (#ride-sub, as in a conversation)
  const sub = () => document.getElementById('ride-sub');
  function showEat(line = '') {
    const box = sub(); if (!box || !S.tray || !S.seated) return;
    const o = S.tray, left = o.buns - S.eaten, soupLeft = o.soup > 0 && S.soup < 3;
    box.classList.add('on'); box.querySelector('.sp').textContent = T('你', 'You');
    box.querySelector('.tx').textContent = line || (left > 0 ? T(`生煎还有 ${left} 只${soupLeft ? '，一碗汤' : ''}。`, `${left} shengjian left${soupLeft ? ', and the soup' : ''}.`) : soupLeft ? T('还剩汤。', 'Just the soup left.') : T('吃完了。E 起身。', 'All gone. E to get up.'));
    const ch = []; if (left > 0) ch.push(T('咬个小口，先吸汤', 'Bite a small hole, sip the soup first'), T('一口吞下', 'Pop one in whole')); if (soupLeft) ch.push(T('喝口汤', 'Drink some soup'));
    const el = box.querySelector('.ch'); el.innerHTML = ch.map((c, i) => `<span><kbd>${i + 1}</kbd>${c}</span>`).join(''); el.classList.toggle('hidden', !ch.length);
  }
  function eat(k) {
    const o = S.tray; if (!o) return false;
    const left = o.buns - S.eaten, opts = []; if (left > 0) opts.push('sip', 'whole'); if (o.soup > 0 && S.soup < 3) opts.push('soup');
    const a = opts[k]; if (!a) return false;
    const f = F();
    if (a === 'sip') { S.eaten++; f.shengjian++; showEat(S.eaten === 1 ? T('咬开一个小口，滚烫的汤汁先吸掉，再蘸点醋。底是脆的。', 'A small bite, the hot soup sipped out first, then a dip in the vinegar. The bottom is crisp.') : T('又是一只。', 'Another one.')); }
    else if (a === 'whole') { S.eaten++; f.shengjian++; S.burnt = true; f.burnt = (f.burnt || 0) + 1; showEat(T('烫！汤汁一下子全在嘴里。下次先咬个小口。', 'Hot! All the soup at once. Next time, a small bite first.')); }
    else { S.soup++; showEat(T('汤是热的，粉丝滑。', 'The soup is hot, the vermicelli slippery.')); }
    setTray();
    if (S.eaten >= o.buns && (!o.soup || S.soup >= 3) && !S.done) { S.done = true; f.meals = (f.meals || 0) + 1; f.last = stamp(L0()); if (f.meals === 1) hud.achievement(T('第一顿生煎', 'Your first shengjian')); setTimeout(() => showEat(), 2600); }
    save && save();
    return true;
  }
  function sit(t, s) {
    S.seated = { t, s }; t.busy = true; S.eaten = 0; S.soup = 0; S.done = false;
    trayG.position.set(t.x + (s.z < t.z ? 0 : 0) , Y0 + 0.745, t.z + (s.z < t.z ? -0.12 : 0.12)); trayG.rotation.y = s.yaw; trayG.visible = true; setTray();
    player.teleport(s.x, s.z - Math.cos(s.yaw) * 0.05, s.yaw + Math.PI, -0.55);
    onMode && onMode('seat'); showEat();
  }
  function stand() {
    const st = S.seated; if (!st) return;
    S.seated = null; st.t.busy = false; trayG.visible = false; S.tray = null; S.order = null;
    const box = sub(); if (box) box.classList.remove('on');
    player.teleport(st.s.x + (st.s.x > cx ? -0.7 : 0.7), st.s.z, player.yaw, -0.05);
    onMode && onMode('play'); setTimeout(() => say('bye'), 600);
  }

  return {
    group, lights,
    get seated() { return !!S.seated; },
    get cardOpen() { return !!S.cardOpen; },
    get order() { return S.order; },
    get tray() { return S.tray; },
    get inside() { return S.inside; },
    get ready() { return S.ready; },                      // (tools)
    seatCamera(camera) { const s = S.seated.s; camera.position.set(s.x, Y0 + 1.12, s.z); camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ'); },
    seatPrompt() { return { target: T('阿潮生煎', 'A-Chao Shengjian'), action: T('起身', 'Get up') }; },
    // keys: the order card (1-5, 0, Enter, Esc) and the meal (1-3, E)
    key(code) {
      if (S.cardOpen) {
        const n = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].indexOf(code);
        if (n >= 0) { add(n); return true; }
        if (code === 'Digit0' || code === 'Backspace') { S.cart = {}; renderCard(); return true; }
        if (code === 'Enter' || code === 'NumpadEnter') { checkout(); return true; }
        if (code === 'Escape' || code === 'KeyE') { closeCard(); return true; }
        return true;
      }
      if (S.seated) {
        const n = ['Digit1', 'Digit2', 'Digit3'].indexOf(code);
        if (n >= 0) return eat(n);
        if (code === 'KeyE') { stand(); return true; }
      }
      return false;
    },
    candidates() {
      const m = L0().clock.minute, b = player.body;
      if (!open(m) || b.x < x0 - 3 || b.x > x1 + 3 || b.z < z0 - 6 || b.z > z1 || S.seated || S.cardOpen) return [];
      const out = [];
      if (!S.order) { const h = headOf('cashier'); out.push({ id: 'shop:order', x: h.x, y: h.y - 0.3, z: h.z, reach: 3, cone: 0.6 }); }
      else if (S.ready <= 0 && !S.tray) out.push({ id: 'shop:take', x: cx - 0.7, y: Y0 + 1.05, z: z1 - 1.55, reach: 3.2, cone: 0.6 });   // (the pass: the front edge of the kitchen counter)
      if (S.tray) for (const t of tables) if (!t.busy) for (const s of t.seats) out.push({ id: `shop:sit:${tables.indexOf(t)}:${t.seats.indexOf(s)}`, x: s.x, y: Y0 + 0.5, z: s.z, reach: 2.4, cone: 0.7 });
      return out;
    },
    owns: (id) => id.startsWith('shop:'),
    prompt(id) {
      if (id === 'shop:order') return { target: T('阿潮生煎', 'A-Chao Shengjian'), action: T('点单', 'Order') };
      if (id === 'shop:take') return { target: T(`取餐 · ${S.order.number} 号`, `Order ${S.order.number}`), action: T('端走托盘', 'Take your tray') };
      return { target: T('空位', 'A free seat'), action: T('坐下来吃', 'Sit down and eat') };
    },
    interact(id) {
      if (id === 'shop:order') { openCard(); return true; }
      if (id === 'shop:take') { S.tray = { ...S.order }; hud.toast(T('托盘在手，找个空位坐下。', 'Tray in hand: find a free seat.'), 3); return true; }
      const [, , ti, si] = id.split(':'); const t = tables[+ti]; sit(t, t.seats[+si]); return true;
    },
    update(dt, pp) {
      const m = L0().clock.minute, isOpen = open(m), near = Math.abs(pp.x - cx) < 40 && Math.abs(pp.z - (z0 + z1) / 2) < 30;
      shutter.visible = !isOpen;
      Object.assign(doorBox, isOpen ? { minX: 1e6, maxX: 1e6, minZ: 1e6, maxZ: 1e6 } : { minX: x0 + 3.6, maxX: x1 - 3.6, minZ: z0 - 0.05, maxZ: z0 + 0.25 });
      for (const k of ['cashier', 'cook']) if (ppl[k]) ppl[k].p.root.visible = isOpen;
      if (ppl.diner) ppl.diner.frame.visible = isOpen;
      S.inside = pp.x > x0 && pp.x < x1 && pp.z > z0 && pp.z < z1;
      if (!near || dt <= 0) return;
      // the order cooks; the lid comes up; your number's called
      if (S.order && S.ready > 0) { S.ready -= dt; if (S.ready <= 0) { pans[0].lift = 2.5; say('ready'); audio && audio.cue && audio.cue('ping', 0, 0.6); } }
      for (const p of pans) { p.lift = Math.max(0, (p.lift || 0) - dt); const want = p.lift > 0 ? -1.1 : 0; p.pivot.rotation.x += (want - p.pivot.rotation.x) * Math.min(1, dt * 4); }
      for (const s of steam) { const u = s.userData; u.t += dt * (u.p.lift > 0 ? 2.2 : 1); const f = (u.t % 3) / 3; s.position.set(u.p.x + Math.sin(u.t * 3) * 0.12, Y0 + 1.2 + f * 1.4, u.p.z + Math.cos(u.t * 2) * 0.12); s.scale.setScalar(0.3 + f * 0.9); s.material.opacity = (u.p.lift > 0 ? 0.55 : 0.18) * (1 - f) * (isOpen ? 1 : 0); }
      if (isOpen) {
        for (const k of ['cashier', 'cook']) if (ppl[k]) ppl[k].p.update(dt, k === 'cashier' && S.inside ? [pp.x, pp.z] : null);
        if (ppl.diner) { const d = ppl.diner; d.p.update(dt * 0.4); d.frame.updateMatrixWorld(true); d.pose(d.cabin, d.frame); }
      }
    },
    mapBlip() { return { x: cx, z: z0 - 1, glyph: '煎', bg: '#8c1717', fg: '#ffd98a', name: { zh: '阿潮生煎', en: 'A-Chao Shengjian' } }; },
  };
}
