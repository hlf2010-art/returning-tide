// The flood wall's lower level, on the river side of Zhongshan East 1st Road north of the Customs House:
// the wall under the promenade is a row of small shops, cafés and the Bund's service points, as on the
// photographs a friend took on 27 November 2026 (fast food, coffee, a noodle shop, gelato, a convenience
// store, the Bund Sightseeing Tunnel's way down, the Bund Comprehensive Service Center).
//
// The brands are stand-ins with the street's look (dark box signs over glass, a red one, a yellow one,
// the tunnel's rainbow neon): the public places keep their real names. Each shop is a glass front with
// a real room behind it (world/shopfronts.js: the Nanjing Road fronts, so the photographed rooms load
// once), a hinged glass door, a lit box sign on a charcoal fascia; between the shops, louvred plant-room
// grilles and steel service doors with their numbers; stone piers between the bays; a dark coping under
// the promenade's railing.
import * as THREE from 'three';
import { Batch } from './geo.js';
import { L } from './layout.js';
import { asLight } from './dayNight.js';
import { makeCanvas, tex, FONT, fitText } from './canvas.js';

// the run of the arcade along the wall (z, north end first), and the wall's face
export const ARCADE = { zN: -258, zS: -146 };
const X = L.wallX - 0.02, CH = L.curbH, TOP = 2.3, FASCIA = [2.36, 2.88], COPE = 2.88;

// South to north. kind: 'shop' (glass, door, sign), 'grille' (louvres), 'door' (a service door, numbered).
// room: which photographed room is behind the glass (shopfronts.js ROOMS). sign: an index in SIGNS.
export const UNITS = [
  { z: [-146, -152], kind: 'grille' },
  { z: [-152, -160], kind: 'shop', sign: 0, room: 'phone_shop' },
  { z: [-160, -163], kind: 'door', no: '73' },
  { z: [-163, -168], kind: 'shop', menu: true, sign: 1, room: 'comfy_cafe' },
  { z: [-168, -175], kind: 'shop', menu: true, sign: 2, room: 'comfy_cafe', parasol: 0x1e5a3c },
  { z: [-175, -180], kind: 'shop', menu: true, sign: 3, room: 'warm_restaurant' },
  { z: [-180, -186], kind: 'shop', menu: true, sign: 4, room: 'comfy_cafe', parasol: 0x8c1d26 },
  { z: [-186, -189], kind: 'door', no: '77' },
  { z: [-189, -199], kind: 'shop', sign: 5, room: 'museum_of_ethnography', wide: true },
  { z: [-199, -204], kind: 'shop', menu: true, sign: 6, room: 'comfy_cafe' },
  { z: [-204, -210], kind: 'shop', menu: true, sign: 7, room: 'warm_restaurant' },
  { z: [-210, -213], kind: 'grille' },
  { z: [-213, -218], kind: 'shop', sign: 8, room: 'decor_shop' },
  { z: [-218, -223], kind: 'shop', menu: true, sign: 9, room: 'comfy_cafe' },
  { z: [-223, -229], kind: 'shop', menu: true, sign: 10, room: 'warm_restaurant', parasol: 0x9a2a1e },
  { z: [-229, -232], kind: 'door', no: '79' },
  { z: [-232, -238], kind: 'shop', sign: 11, room: 'warm_restaurant' },
  { z: [-238, -243], kind: 'shop', sign: 12, room: 'museum_of_ethnography' },
  { z: [-243, -250], kind: 'grille' },
  { z: [-250, -253], kind: 'door', no: '81' },
  { z: [-253, -258], kind: 'grille' },
];
// closed parasols outside the cafés (for world/dressingData.js: drawn and stepped round there)
export const PARASOLS = UNITS.filter((u) => u.parasol).flatMap((u) => [0.3, 0.7].map((f) => ({ x: X - 1.15, z: u.z[0] + (u.z[1] - u.z[0]) * f, colour: u.parasol })));

// The box signs, drawn on one atlas (2 x 7 cells of 1024 x 146): bg, then a painter.
const CELL = { w: 1024, h: 146, cols: 2, rows: 7 };
const bold = (px, f = FONT.sans) => `700 ${px}px ${f}`;
const SIGNS = [
  // 0 the Bund Comprehensive Service Center (a public place: its real name)
  { bg: '#2b2d31', draw(c, w, h) { c.fillStyle = '#f4f4f2'; c.font = bold(64); c.textAlign = 'center'; fitText(c, '外滩综合服务点', w / 2, 76, w - 80); c.font = `500 30px ${FONT.sans}`; fitText(c, 'The Bund Comprehensive Service Center', w / 2, 122, w - 120); } },
  // 1 gelato: a red square with a cone in it
  { bg: '#3a3b3d', draw(c, w, h) {
    c.fillStyle = '#d7262b'; c.fillRect(70, 22, 102, 102); c.fillStyle = '#fff';
    c.beginPath(); c.moveTo(102, 62); c.lineTo(140, 62); c.lineTo(121, 112); c.fill(); c.beginPath(); c.arc(121, 54, 19, Math.PI, 0); c.fill();
    c.font = bold(78); c.textAlign = 'left'; fitText(c, '冰匠', 200, 104, 220);
    c.font = bold(40, 'Inter, sans-serif'); fitText(c, 'GELATO', 440, 66, 260); c.font = `500 34px ${FONT.sans}`; fitText(c, '现做冰淇淋', 440, 114, 280);
  } },
  // 2 a coffee chain: white on black, a green round emblem
  { bg: '#121314', draw(c, w, h) {
    c.fillStyle = '#1e6a45'; c.beginPath(); c.arc(110, 73, 52, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 5; c.beginPath(); c.arc(110, 73, 40, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 6; for (const dy of [-10, 6, 22]) { c.beginPath(); for (let x = -26; x <= 26; x += 2) c.lineTo(110 + x, 73 + dy + Math.sin(x / 6) * 4); c.stroke(); }
    c.fillStyle = '#f5f5f3'; c.font = bold(66, 'Inter, sans-serif'); c.textAlign = 'left'; fitText(c, 'HARBOUR COFFEE', 190, 92, 620); c.font = `500 28px ${FONT.sans}`; fitText(c, '港湾咖啡', 820, 92, 170);
  } },
  // 3 a Shanghai noodle shop: the yellow board, dark red characters
  { bg: '#f1cf33', draw(c, w, h) {
    c.strokeStyle = '#8a1b12'; c.lineWidth = 4; c.strokeRect(14, 12, w - 28, h - 24);
    c.fillStyle = '#8a1b12'; c.font = bold(84, FONT.serif); c.textAlign = 'center'; fitText(c, '上海本帮面', w / 2, 92, w - 260);
    c.font = `600 22px Inter, sans-serif`; fitText(c, 'SHANGHAI LOCAL NOODLES', w / 2, 126, w - 300);
    for (const x of [70, w - 70]) { c.beginPath(); c.arc(x, h / 2, 34, 0, Math.PI * 2); c.stroke(); c.font = bold(30, FONT.serif); c.fillText('面', x, h / 2 + 11); }
  } },
  // 4 another coffee chain: wide white letters on black
  { bg: '#141414', draw(c, w, h) { c.fillStyle = '#f5f5f2'; c.font = bold(74, 'Inter, sans-serif'); c.textAlign = 'center'; fitText(c, 'CORSO  COFFEE', w / 2 - 70, 98, 700); c.font = `500 28px ${FONT.sans}`; fitText(c, '科索咖啡', w - 110, 98, 170); } },
  // 5 the Bund Sightseeing Tunnel: each character a different neon, the English in white (its real name)
  { bg: '#14234b', draw(c, w, h) {
    const cols = ['#ff4fa0', '#ffd23a', '#3ae0ff', '#9b6bff', '#58f06a', '#ff8a2a'];
    c.font = bold(62, FONT.hand); c.textAlign = 'center';
    [...'外滩观光隧道'].forEach((ch, i) => { c.fillStyle = cols[i]; c.shadowColor = cols[i]; c.shadowBlur = 14; c.fillText(ch, 70 + i * 60, 96); });
    c.shadowBlur = 0; c.fillStyle = '#f2f2f6'; c.font = bold(40, 'Inter, sans-serif'); c.textAlign = 'left'; fitText(c, 'THE BUND SIGHTSEEING TUNNEL', 440, 90, 560);
  } },
  // 6 a fruit-tea counter: a yellow chick on a dark board
  { bg: '#2c2c2e', draw(c, w, h) {
    c.fillStyle = '#ffcf2e'; c.beginPath(); c.arc(100, 76, 46, 0, Math.PI * 2); c.fill(); c.fillStyle = '#e8541c'; c.beginPath(); c.moveTo(130, 72); c.lineTo(152, 80); c.lineTo(130, 88); c.fill();
    c.fillStyle = '#222'; c.beginPath(); c.arc(112, 64, 6, 0, Math.PI * 2); c.fill(); c.fillStyle = '#ff8c6a'; c.beginPath(); c.arc(84, 54, 10, Math.PI, 0); c.fill();
    c.fillStyle = '#ffe36a'; c.font = bold(64); c.textAlign = 'left'; fitText(c, '鲜果茶', 180, 96, 230); c.fillStyle = '#f2f2f2'; c.font = bold(34, 'Inter, sans-serif'); fitText(c, 'FRESH FRUIT TEA', 430, 92, 330);
  } },
  // 7 fried chicken: white on red
  { bg: '#c8132c', draw(c, w, h) { c.fillStyle = '#fff'; c.font = bold(72); c.textAlign = 'center'; fitText(c, '湾畔炸鸡', w / 2 - 170, 98, 360); c.font = bold(44, 'Inter, sans-serif'); fitText(c, 'BAYSIDE CHICKEN', w / 2 + 210, 92, 400); } },
  // 8 a convenience store: white board, green and blue stripes
  { bg: '#f3f3f0', draw(c, w, h) {
    c.fillStyle = '#1c9a4a'; c.fillRect(0, 0, w, 20); c.fillStyle = '#1f57b5'; c.fillRect(0, h - 20, w, 20);
    c.fillStyle = '#16843f'; c.font = bold(62); c.textAlign = 'center'; fitText(c, '邻家便利', w / 2 - 190, 96, 320); c.fillStyle = '#1f57b5'; c.font = bold(46, 'Inter, sans-serif'); fitText(c, 'NEIGHBOUR MART', w / 2 + 190, 92, 400);
  } },
  // 9 soft serve: a red oval on a blue board
  { bg: '#1c3c86', draw(c, w, h) {
    c.fillStyle = '#e1262e'; c.beginPath(); c.ellipse(170, 73, 140, 52, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff'; c.font = bold(46, 'Georgia, serif'); c.textAlign = 'center'; fitText(c, 'Milk Crest', 170, 88, 230);
    c.font = bold(58); c.textAlign = 'left'; fitText(c, '奶冠软冰淇淋', 340, 96, 560);
  } },
  // 10 pizza and bakery
  { bg: '#1b1b1c', draw(c, w, h) { c.fillStyle = '#e23b2a'; c.font = bold(40); c.textAlign = 'left'; fitText(c, '海湾披萨', 60, 92, 180); c.fillStyle = '#f2efe6'; c.font = bold(56, 'Inter, sans-serif'); fitText(c, 'Bay Pizza · Fresh Bakes', 270, 94, 700); } },
  // 11 a small restaurant: gold brush characters on dark red
  { bg: '#6e1010', draw(c, w, h) { c.fillStyle = '#e8c06a'; c.font = `400 86px ${FONT.hand}`; c.textAlign = 'center'; fitText(c, '外滩小馆', w / 2, 102, w - 200); c.strokeStyle = '#c9a050'; c.lineWidth = 3; c.strokeRect(20, 16, w - 40, h - 32); } },
  // 12 souvenirs
  { bg: '#b0181e', draw(c, w, h) { c.fillStyle = '#fff'; c.font = bold(62); c.textAlign = 'center'; fitText(c, '外滩礼品', w / 2 - 170, 96, 300); c.font = bold(42, 'Inter, sans-serif'); fitText(c, 'BUND GIFTS · 上海伴手礼', w / 2 + 170, 92, 400); } },
];

function signAtlas() {
  const [cv, c] = makeCanvas(CELL.w * CELL.cols, CELL.h * CELL.rows);
  SIGNS.forEach((s, i) => {
    const ox = (i % CELL.cols) * CELL.w, oy = Math.floor(i / CELL.cols) * CELL.h;
    c.save(); c.translate(ox, oy); c.beginPath(); c.rect(0, 0, CELL.w, CELL.h); c.clip();
    c.fillStyle = s.bg; c.fillRect(0, 0, CELL.w, CELL.h);
    c.textBaseline = 'alphabetic'; s.draw(c, CELL.w, CELL.h);
    // the box sign's edge: a lighter rim where the face meets the returns
    c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 3; c.strokeRect(1.5, 1.5, CELL.w - 3, CELL.h - 3);
    c.restore();
  });
  const t = tex(cv, { repeat: false }); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
// a sign's cell as uv [u0, v0, u1, v1] (the canvas is flipped on upload: row 0 is the top)
const cellUV = (i) => { const cx = i % CELL.cols, cy = Math.floor(i / CELL.cols); return [cx / CELL.cols, 1 - (cy + 1) / CELL.rows, (cx + 1) / CELL.cols, 1 - cy / CELL.rows]; };

// The backlit menu boards hung inside the glass of the food shops, over the counter: photographs of the
// food in a row with names and prices (one atlas of 8 boards, 256 x 160 each, in a 4 x 2 grid)
const FOODS = [['#d98a3a', '#f3d9a0', '招牌套餐', '¥39'], ['#7a3a22', '#e8c79a', '拿铁', '¥32'], ['#e8c840', '#fff3c4', '鲜果茶', '¥19'], ['#c23a2a', '#f5b070', '炸鸡桶', '¥59'],
  ['#f2e4d0', '#d07a9a', '冰淇淋', '¥28'], ['#a8442a', '#e0b060', '本帮爆鱼面', '¥36'], ['#6a4a2a', '#d8b890', '美式', '¥26'], ['#d8a030', '#8a3a1a', '披萨', '¥45']];
function menuAtlas() {
  const [cv, c] = makeCanvas(1024, 320);
  FOODS.forEach(([a, b, name, price], i) => {
    const ox = (i % 4) * 256, oy = Math.floor(i / 4) * 160;
    c.fillStyle = '#f7f4ec'; c.fillRect(ox, oy, 256, 160);
    const g = c.createRadialGradient(ox + 128, oy + 62, 8, ox + 128, oy + 62, 90); g.addColorStop(0, b); g.addColorStop(1, a);
    c.fillStyle = '#2a2622'; c.fillRect(ox + 10, oy + 8, 236, 110); c.fillStyle = g; c.beginPath(); c.ellipse(ox + 128, oy + 64, 84, 46, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(ox + 104, oy + 48, 26, 10, -0.3, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#2a2622'; c.font = bold(26); c.textAlign = 'left'; fitText(c, name, ox + 14, oy + 148, 160);
    c.fillStyle = '#c4242a'; c.font = bold(28, 'Inter, sans-serif'); c.textAlign = 'right'; c.fillText(price, ox + 244, oy + 148);
  });
  return tex(cv, { repeat: false });
}

// a service door's number plate: white figures on a dark blue enamel plate
function plateTexture(no) {
  const [cv, c] = makeCanvas(128, 64);
  c.fillStyle = '#1d3f7a'; c.fillRect(0, 0, 128, 64); c.strokeStyle = '#e9e6dc'; c.lineWidth = 3; c.strokeRect(4, 4, 120, 56);
  c.fillStyle = '#f3efe4'; c.font = bold(40, 'Inter, sans-serif'); c.textAlign = 'center'; c.fillText(no, 64, 47);
  return tex(cv, { repeat: false });
}

// The Nanjing Road shopfront builder (world/shopfronts.js) is handed in, so these rooms share its loads.
export function addFloodWallFronts(fronts) {
  for (const u of UNITS) {
    if (u.kind !== 'shop') continue;
    fronts.addFront({ axis: 'z', plane: X, out: -1 }, u.z[1] + 0.2, u.z[0] - 0.2, { y0: CH, top: TOP, room: u.room, depth: 4, transom: null });
  }
}

export function createFloodWall(M) {
  const group = new THREE.Group(); group.name = 'flood-wall';
  const stone = new Batch(), dark = new Batch(), slat = new Batch(), frame = new Batch(), steel = new Batch(), signs = { pos: [], uv: [] };
  const zlo = ARCADE.zN, zhi = ARCADE.zS;
  // the wall face itself, the coping band under the railing, a granite plinth where it meets the paving
  dark.box(X - 0.06, COPE, (zlo + zhi) / 2, 0.16, L.deckY - COPE + 0.02, zhi - zlo);
  stone.box(X - 0.01, CH, (zlo + zhi) / 2, 0.04, COPE - CH, zhi - zlo, { tile: 1.6 });
  const sign = (i, z0, z1, y0, y1, x) => {
    const [u0, v0, u1, v1] = cellUV(i);
    // facing -x: the viewer's left is north (-z), right south (+z)
    const a = [x, y0, z0], b = [x, y0, z1], c = [x, y1, z1], d = [x, y1, z0];
    for (const [p, uv] of [[a, [u0, v0]], [b, [u1, v0]], [c, [u1, v1]], [a, [u0, v0]], [c, [u1, v1]], [d, [u0, v1]]]) { signs.pos.push(...p); signs.uv.push(...uv); }
  };
  const plates = [], menus = { pos: [], uv: [] };
  // a menu board, cell k, facing -x, centred at z, its bottom at y
  const menu = (k, z, y, w = 0.62, h = 0.39) => {
    const u0 = (k % 4) / 4, u1 = u0 + 0.25, v1 = 1 - Math.floor(k / 4) / 2, v0 = v1 - 0.5, x = X - 0.066;
    const a = [x, y, z - w / 2], b = [x, y, z + w / 2], c = [x, y + h, z + w / 2], d = [x, y + h, z - w / 2];
    for (const [p, uv] of [[a, [u0, v0]], [b, [u1, v0]], [c, [u1, v1]], [a, [u0, v0]], [c, [u1, v1]], [d, [u0, v1]]]) { menus.pos.push(...p); menus.uv.push(...uv); }
  };
  for (const u of UNITS) {
    const zS = u.z[0], zN = u.z[1], zc = (zS + zN) / 2, w = zS - zN;
    // a stone pier at the unit's south end, full height
    stone.box(X - 0.1, CH, zS, 0.2, COPE - CH, 0.36, { tile: 1.6 });
    // the fascia band (charcoal, proud of the wall)
    dark.box(X - 0.08, FASCIA[0], zc, 0.14, FASCIA[1] - FASCIA[0], w - 0.36);
    if (u.kind === 'shop') {
      const sw = Math.min(w - 0.8, u.wide ? 6.2 : 4.4);
      sign(u.sign, zc - sw / 2, zc + sw / 2, FASCIA[0] + 0.05, FASCIA[1] - 0.05, X - 0.176);
      frame.box(X - 0.155, FASCIA[0] + 0.03, zc, 0.03, FASCIA[1] - FASCIA[0] - 0.06, sw + 0.06);               // the sign box's returns
      // a hinged glass door in the middle: a dark frame, two leaves, steel pull handles, a threshold
      const dw = 1.7, dz0 = zc - dw / 2, dz1 = zc + dw / 2, dh = 2.15;
      for (const zz of [dz0, zc, dz1]) frame.box(X - 0.09, CH, zz, 0.06, dh, 0.06);
      frame.box(X - 0.09, CH + dh, zc, 0.06, 0.07, dw + 0.06);
      for (const s of [-1, 1]) {
        steel.box(X - 0.14, CH + 0.75, zc + s * 0.12, 0.03, 0.7, 0.03);
        for (const yy of [CH + 0.8, CH + 1.4]) steel.box(X - 0.115, yy, zc + s * 0.12, 0.05, 0.02, 0.02);
      }
      steel.box(X - 0.25, CH - 0.004, zc, 0.5, 0.012, dw + 0.1);
      // food shops: a row of backlit menu boards in the glass either side of the door, a thin black frame round each
      if (u.menu) for (const side of [-1, 1]) for (let k = 0; k < 2; k++) {
        const mz = zc + side * (dw / 2 + 0.5 + k * 0.7);
        if (Math.abs(mz - zc) > w / 2 - 0.5) continue;
        menu((u.sign * 3 + k + (side > 0 ? 2 : 0)) % 8, mz, 1.82);
        frame.box(X - 0.055, 1.8, mz, 0.01, 0.43, 0.66);
      }
    } else if (u.kind === 'grille') {
      // a louvred plant-room grille: a frame, slats every 9 cm, the void behind them dark
      const z0 = zN + 0.25, z1 = zS - 0.25, h0 = CH + 0.35, h1 = TOP;
      dark.box(X - 0.02, h0, (z0 + z1) / 2, 0.02, h1 - h0, z1 - z0);
      for (const zz of [z0, z1]) frame.box(X - 0.07, h0, zz, 0.08, h1 - h0, 0.07);
      frame.box(X - 0.07, h0 - 0.06, (z0 + z1) / 2, 0.08, 0.06, z1 - z0 + 0.07); frame.box(X - 0.07, h1, (z0 + z1) / 2, 0.08, 0.06, z1 - z0 + 0.07);
      for (let y = h0 + 0.06; y < h1 - 0.03; y += 0.09) slat.box(X - 0.06, y, (z0 + z1) / 2, 0.07, 0.025, z1 - z0);
      for (let zz = z0 + 1.5; zz < z1 - 0.5; zz += 1.5) frame.box(X - 0.075, h0, zz, 0.05, h1 - h0, 0.04);   // its mullions
    } else {
      // a steel service door, flush, its number plate beside it
      const z0 = zN + 0.5, z1 = zS - 0.5;
      steel.box(X - 0.03, CH, (z0 + z1) / 2, 0.03, 2.1, z1 - z0);
      frame.box(X - 0.06, CH, (z0 + z1) / 2, 0.05, 2.18, z1 - z0 + 0.12);
      for (let zz = z0 + 0.55; zz < z1 - 0.2; zz += 0.55) dark.box(X - 0.05, CH + 0.08, zz, 0.02, 1.95, 0.012);   // the door's panel seams
      steel.box(X - 0.1, CH + 1.0, z1 - 0.25, 0.04, 0.04, 0.22);
      plates.push({ no: u.no, z: zc, y: FASCIA[0] + 0.24 });
    }
  }
  stone.box(X - 0.1, CH, ARCADE.zN, 0.2, COPE - CH, 0.36, { tile: 1.6 });       // the last pier

  // the stone: pale grey honed granite, as the wall's cladding is (lighter than the parapet stone)
  const clad = M.granite.clone(); clad.color = new THREE.Color(0xa8a7a2);
  group.add(stone.mesh(clad, 'flood-stone'));
  group.add(dark.mesh(new THREE.MeshStandardMaterial({ color: 0x2b2d30, roughness: 0.6, metalness: 0.1 }), 'flood-fascia'));
  group.add(slat.mesh(new THREE.MeshStandardMaterial({ color: 0x4a4d51, roughness: 0.5, metalness: 0.4 }), 'flood-louvres'));
  group.add(frame.mesh(new THREE.MeshStandardMaterial({ color: 0x1d1f22, roughness: 0.4, metalness: 0.6 }), 'flood-frames'));
  group.add(steel.mesh(M.steel, 'flood-steel'));
  if (typeof document !== 'undefined') {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(signs.pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(signs.uv, 2));
    g.computeVertexNormals(); g.computeBoundingSphere();
    // the box signs light at dusk with the street's neon (dayNight 'signs'); by day they read as lit panels
    const mat = asLight(new THREE.MeshBasicMaterial({ map: signAtlas(), color: new THREE.Color(1.35, 1.35, 1.35) }), 'signs', 0.92);
    const m = new THREE.Mesh(g, mat); m.name = 'flood-signs'; group.add(m);
    if (menus.pos.length) {
      const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(menus.pos, 3)); mg.setAttribute('uv', new THREE.Float32BufferAttribute(menus.uv, 2));
      mg.computeVertexNormals(); mg.computeBoundingSphere();
      const mm = new THREE.Mesh(mg, asLight(new THREE.MeshBasicMaterial({ map: menuAtlas(), color: new THREE.Color(1.15, 1.12, 1.05) }), 'shops', 0.5)); mm.name = 'flood-menus'; group.add(mm);
    }
    for (const p of plates) {
      const pm = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), new THREE.MeshStandardMaterial({ map: plateTexture(p.no), roughness: 0.4 }));
      pm.position.set(X - 0.16, p.y, p.z); pm.rotation.y = -Math.PI / 2; pm.name = `flood-plate-${p.no}`; group.add(pm);
    }
  }
  group.traverse((o) => { if (o.isMesh) { o.receiveShadow = true; o.castShadow = false; } });
  return { group };
}
