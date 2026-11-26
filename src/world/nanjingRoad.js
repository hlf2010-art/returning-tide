// Nanjing Road East from the Bund to Henan Middle Road: the pedestrian street (paved wall to wall since
// the 2020 extension), its 1920s-30s stone and art-deco blocks and later towers, shopfronts lit to the
// pavement, the vertical neon blade signs Nanjing Road is known for, LED screens, lamp posts; Henan
// Middle Road crossing it (traffic: world/henanTraffic.js); and two entrances to East Nanjing Road
// station (Exits 7 and 2: stairwells with Shanghai Metro's signs, stairs down to a lit landing).
// The shops are generic (invented names in the street's style), not the real tenants; the buildings
// are typical of the street, not surveyed one by one.
import { asLight, glassByDay } from './dayNight.js';
import * as THREE from 'three';
import { L, NJ, METRO, METRO_DEPTH, DUMPLING, njRuns, njCross, njLamps } from './layout.js';
import { createBronzeCovers } from './njCovers.js';
import { Batch, batchSet, flush } from './geo.js';
import { mirrorPeople } from './materials.js';
import { tiers } from './bund.js';
import { makeCanvas, tex, rng, FONT } from './canvas.js';
import { towerAtlas } from './skyline.js';
import { markCanvas } from '../ui/brands.js';
import { createShopfronts } from './shopfronts.js';
import { createSignAtlas, loadSignFonts } from './shopSigns.js';
import { LANDMARK_BUILDERS, tower } from './njLandmarks.js';
import { placedShops } from './njShops.js';

const CH = L.curbH;
const NAMES = ['stone', 'stoneDark', 'flute', 'classic', 'arched', 'rustic', 'deco', 'brick', 'roof', 'copper', 'bronze', 'glassDark'];
export const LINE_COLOR = { 2: '#82BF25', 10: '#C6AFD4' };      // Wikipedia's Shanghai Metro palette (not an official spec)

// ---- invented shops, for frontages no real shop has been placed on ----
const SHOP_TYPES = [['丝绸', 'SILK'], ['钟表', 'WATCHES'], ['工艺美术', 'ARTS & CRAFTS'], ['珠宝', 'JEWELLERY'], ['糕团', 'PASTRY'], ['照相器材', 'CAMERAS'],
  ['运动', 'SPORTS'], ['书店', 'BOOKS'], ['茶庄', 'TEA'], ['药房', 'PHARMACY'], ['百货', 'DEPARTMENT STORE'], ['鞋帽', 'SHOES & HATS'], ['咖啡', 'COFFEE'],
  ['酒家', 'RESTAURANT'], ['眼镜', 'OPTICIAN'], ['食品', 'FOOD HALL'], ['时装', 'FASHION'], ['箱包', 'LUGGAGE'], ['生煎', 'FRIED BUNS'], ['纪念品', 'SOUVENIRS'], ['数码', 'DIGITAL']];
const SYL = ['华', '美', '新', '恒', '永', '丰', '德', '益', '昌', '兴', '和', '泰', '瑞', '鸿', '宝', '光', '大', '协'];
const NEON = ['#ff3b3b', '#ffd23a', '#ffffff', '#3bd1ff', '#ff4fd8', '#5bff8f', '#ff8a2a'];
// ad slides for the LED screens (cycled)
function screenAtlas() {
  const [c, x] = makeCanvas(512, 1024);
  const slides = [['#3a0ca3', '#f72585', '上海 · 夜', 'SHANGHAI NIGHTS'], ['#003049', '#fcbf49', '南京路', 'SINCE 1851'], ['#1b4332', '#95d5b2', '外滩', 'THE BUND'], ['#240046', '#ff9e00', '新品上市', 'NEW SEASON']];
  slides.forEach(([a, b, t1, t2], i) => {
    const g = x.createLinearGradient(0, i * 256, 512, i * 256 + 256); g.addColorStop(0, a); g.addColorStop(1, b);
    x.fillStyle = g; x.fillRect(0, i * 256, 512, 256);
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `900 88px ${FONT.sans}`; x.fillText(t1, 256, i * 256 + 110); x.font = `700 34px ${FONT.sans}`; x.fillText(t2, 256, i * 256 + 190);
  });
  const t = tex(c, { repeat: false }); t.repeat.set(1, 0.25); return t;
}
// through the doors at the bottom: the concourse, its ceiling lights, the ticket gates, people
function concourseTex() {
  const [c, x] = makeCanvas(256, 256), r = rng(10);
  const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#9aa3ab'); g.addColorStop(0.45, '#6f777f'); g.addColorStop(1, '#3a3e42');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  x.fillStyle = 'rgba(255,255,255,0.95)'; for (let i = 0; i < 5; i++) x.fillRect(10 + i * 50, 30 + i * 2, 36, 4);       // ceiling strips
  x.fillStyle = '#16181c'; x.fillRect(0, 120, 256, 26);                                                                    // the signs band
  x.fillStyle = LINE_COLOR[2]; x.fillRect(16, 124, 18, 18); x.fillStyle = LINE_COLOR[10]; x.fillRect(40, 124, 18, 18);
  for (let i = 0; i < 6; i++) { x.fillStyle = '#2a2e33'; x.fillRect(8 + i * 42, 182, 30, 40); x.fillStyle = '#4cd964'; x.fillRect(16 + i * 42, 188, 10, 6); }   // gates
  for (let i = 0; i < 5; i++) { const px = 20 + r() * 216, h = 50 + r() * 16; x.fillStyle = 'rgba(30,30,34,0.85)'; x.beginPath(); x.ellipse(px, 236 - h, 5, 6, 0, 0, Math.PI * 2); x.fill(); x.fillRect(px - 6, 242 - h, 12, h - 8); }
  return tex(c, { repeat: false });
}
// the metro sign: logo, station name, line badges, exit number
// the back panel of an exit (the closed end, toward the street): a lit station board, white, with the
// line diagram and the neighbourhood map as Shanghai Metro's street boards carry them
function metroBoard(exit) {
  const [c, x] = makeCanvas(512, 1024);
  x.fillStyle = '#f4f5f6'; x.fillRect(0, 0, 512, 1024);
  x.fillStyle = '#EC1C24'; x.fillRect(0, 0, 512, 150);
  const logo = markCanvas('shanghaimetro', { color: '#ffffff', bg: '#EC1C24', size: 110, pad: 0.1 }); x.drawImage(logo, 20, 20, 110, 110);
  x.fillStyle = '#fff'; x.textBaseline = 'middle'; x.textAlign = 'left'; x.font = `900 52px ${FONT.sans}`; x.fillText('南京东路站', 146, 62);
  x.font = `600 24px ${FONT.sans}`; x.fillText('East Nanjing Road Station', 148, 112);
  // the two lines through the station
  [[2, 230], [10, 330]].forEach(([n, y]) => {
    x.fillStyle = LINE_COLOR[n]; x.fillRect(40, y - 8, 432, 16);
    for (let k = 0; k < 6; k++) { x.fillStyle = '#fff'; x.beginPath(); x.arc(60 + k * 78, y, 12, 0, 7); x.fill(); x.strokeStyle = LINE_COLOR[n]; x.lineWidth = 5; x.stroke(); }
    x.fillStyle = '#222'; x.font = `800 26px ${FONT.sans}`; x.fillText(`${n}号线 Line ${n}`, 40, y - 40);
  });
  // a street map: the blocks round the station, the exits marked
  x.fillStyle = '#dfe3e6'; x.fillRect(40, 400, 432, 400);
  x.fillStyle = '#fff'; x.fillRect(40, 580, 432, 40); x.fillRect(236, 400, 40, 400);
  x.fillStyle = '#333'; x.font = `600 18px ${FONT.sans}`; x.fillText('南京东路 Nanjing Rd (E)', 54, 600); x.save(); x.translate(262, 780); x.rotate(-Math.PI / 2); x.fillText('河南中路 Henan Rd (M)', 0, 0); x.restore();
  [[150, 570, 2], [330, 570, 7], [150, 630, 3], [330, 630, 4]].forEach(([X, Y, n]) => { x.fillStyle = n === exit ? '#ffd400' : '#9aa3aa'; x.fillRect(X - 18, Y - 18, 36, 36); x.fillStyle = '#111'; x.font = `900 24px ${FONT.sans}`; x.textAlign = 'center'; x.fillText(String(n), X, Y + 1); x.textAlign = 'left'; });
  x.fillStyle = '#EC1C24'; x.beginPath(); x.arc(256, 600, 9, 0, 7); x.fill();
  x.fillStyle = '#222'; x.font = `700 30px ${FONT.sans}`; x.fillText(`您在 ${exit} 号口`, 40, 860); x.font = `500 22px ${FONT.sans}`; x.fillText(`You are at Exit ${exit}`, 40, 900);
  x.fillStyle = '#888'; x.font = `500 18px ${FONT.sans}`; x.fillText('首班车 05:30   末班车 22:50', 40, 960);
  return tex(c, { repeat: false, aniso: 8 });
}
function metroSign(exit) {
  const [c, x] = makeCanvas(1024, 256);
  x.fillStyle = '#16181c'; x.fillRect(0, 0, 1024, 256);
  const logo = markCanvas('shanghaimetro', { color: '#EC1C24', bg: '#ffffff', size: 200, pad: 0.12 });
  x.drawImage(logo, 28, 28, 200, 200);
  x.fillStyle = '#fff'; x.textBaseline = 'middle'; x.textAlign = 'left';
  x.font = `900 84px ${FONT.sans}`; x.fillText('南京东路站', 262, 92);
  x.font = `600 38px ${FONT.sans}`; x.fillText('East Nanjing Road', 266, 176);
  [2, 10].forEach((n, i) => {
    const X = 690 + i * 88; x.fillStyle = LINE_COLOR[n]; x.fillRect(X, 140, 76, 76);
    x.fillStyle = n === 2 ? '#fff' : '#2a1a3a'; x.font = `900 ${n > 9 ? 44 : 56}px ${FONT.sans}`; x.textAlign = 'center'; x.fillText(String(n), X + 38, 180);
  });
  x.fillStyle = '#ffd400'; x.fillRect(880, 20, 124, 108); x.fillStyle = '#111'; x.font = `900 92px ${FONT.sans}`; x.textAlign = 'center'; x.fillText(String(exit), 942, 78);
  x.fillStyle = '#fff'; x.font = `700 30px ${FONT.sans}`; x.fillText(`${exit}号口 Exit ${exit}`, 942, 180);
  return tex(c, { repeat: false, aniso: 8 });
}
function landingSign() {
  const [c, x] = makeCanvas(1024, 192);
  x.fillStyle = '#16181c'; x.fillRect(0, 0, 1024, 192);
  [[2, '2号线', 'Line 2'], [10, '10号线', 'Line 10']].forEach(([n, zh, en], i) => {
    const X = 40 + i * 420; x.fillStyle = LINE_COLOR[n]; x.fillRect(X, 46, 100, 100);
    x.fillStyle = n === 2 ? '#fff' : '#2a1a3a'; x.font = `900 64px ${FONT.sans}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(n), X + 50, 98);
    x.fillStyle = '#fff'; x.textAlign = 'left'; x.font = `800 54px ${FONT.sans}`; x.fillText(zh, X + 124, 78); x.font = `500 32px ${FONT.sans}`; x.fillText(en, X + 126, 128);
  });
  x.fillStyle = '#fff'; x.textAlign = 'right'; x.font = `800 60px ${FONT.sans}`; x.fillText('进站 →', 990, 82); x.font = `500 30px ${FONT.sans}`; x.fillText('Entrance', 990, 132);
  return tex(c, { repeat: false, aniso: 8 });
}

export function createNanjingRoad(M, { roomSize = 512 } = {}) {
  const group = new THREE.Group(); group.name = 'nanjing-road';
  const B = batchSet(NAMES), P = { paving: new Batch(), asphalt: new Batch(), granite: new Batch(), paint: new Batch(), yellow: new Batch(), steel: new Batch(), hoard: new Batch(), dark: new Batch(), tile: new Batch() };
  const r = rng(1851), h = NJ.henan, lights = [];
  // ---- the ground ----
  const holes = [[h.x0, h.x1], ...METRO.map((m) => [m.x0, m.x1])].sort((a, b) => a[0] - b[0]);
  P.paving.box((L.facadeX + L.westCurbX) / 2, -0.3, (-206 + -196) / 2, L.westCurbX - L.facadeX, 0.3 + CH, 10, { tile: 2.4 });   // the Bund pavement across the mouth
  P.paving.box((NJ.xWest + L.facadeX) / 2, -0.3, (NJ.z0 + -211.3) / 2, L.facadeX - NJ.xWest, 0.3 + CH, 0.7, { tile: 2.4 });
  P.paving.box((NJ.xWest + L.facadeX) / 2 + 0, -0.3, (-207.7 + NJ.z1) / 2, L.facadeX - NJ.xWest, 0.3 + CH, NJ.z1 + 207.7, { tile: 2.4 });
  { let x = L.facadeX; for (const [a, b] of [...holes].reverse()) { if (x > b) P.paving.box((x + b) / 2, -0.3, -209.5, x - b, 0.3 + CH, 3.6, { tile: 2.4 }); x = a; } P.paving.box((x + NJ.xWest) / 2, -0.3, -209.5, x - NJ.xWest, 0.3 + CH, 3.6, { tile: 2.4 }); }
  // the paving pattern: granite bands across the street every 6 m (as on the pedestrian street)
  for (let x = -40; x > h.x1 + 1; x -= 6) P.granite.floor(x - 0.2, x + 0.2, NJ.z0 + (METRO.some((m) => x > m.x0 && x < m.x1) ? 3.6 : 0), NJ.z1, CH + 0.004);
  // west of Henan Road the 1999 street's 金带: a 4.2 m strip of red granite a little north of the centre line,
  // the sightseeing train's lane (world/tram.js) along its south side
  P.belt = new Batch(); P.belt.floor(NJ.xWest + 2, h.x0 - 1, NJ.zc - 1.3 - 2.1, NJ.zc - 1.3 + 2.1, CH + 0.008, 1.6);
  // Henan Road: carriageway, kerbs, its pavements (beyond the junction too, for the view), markings
  const HL = 420;
  P.asphalt.floor(h.x0, h.x1, NJ.zc - HL, NJ.zc + HL, 0, 6);
  for (const [a, b] of [[NJ.zc - HL, NJ.z0], [NJ.z1, NJ.zc + HL]]) {
    P.paving.box(h.x1 + 2.5, -0.3, (a + b) / 2, 5, 0.3 + CH, b - a, { tile: 2.4 }); P.paving.box(h.x0 - 2.5, -0.3, (a + b) / 2, 5, 0.3 + CH, b - a, { tile: 2.4 });
  }
  for (const x of [h.x0 - 0.08, h.x1 + 0.08]) for (const [a, b] of [[NJ.zc - HL, NJ.z0], [NJ.z1, NJ.zc + HL]]) P.granite.box(x, -0.3, (a + b) / 2, 0.16, 0.3 + CH + 0.005, b - a);
  for (const sx of [-1, 1]) for (const [a, b] of [[NJ.zc - HL, NJ.zc - 7], [NJ.zc + 7, NJ.zc + HL]]) P.yellow.floor(h.xc + sx * 0.18 - 0.07, h.xc + sx * 0.18 + 0.07, a, b, 0.012);
  for (const x of [h.xc - 3.9, h.xc + 3.9]) for (let z = NJ.zc - HL; z < NJ.zc + HL; z += 10) if (Math.abs(z + 2 - NJ.zc) > 9) P.paint.floor(x - 0.07, x + 0.07, z, z + 4, 0.012);
  for (let x = h.x0 + 0.4; x < h.x1 - 0.4; x += 0.9) P.paint.floor(x, x + 0.45, NJ.zc - 3.4, NJ.zc + 3.4, 0.012);           // the zebra
  P.paint.floor(h.x0 + 0.3, h.xc - 0.3, NJ.zc - 5.6, NJ.zc - 5.2, 0.012); P.paint.floor(h.xc + 0.3, h.x1 - 0.3, NJ.zc + 5.2, NJ.zc + 5.6, 0.012);
  // ---- the buildings ----
  // (the sign faces by atlas page: page -> Batch)
  const signs = [], letters = [], blades = [], boards = new Batch(), onPage = (list, k) => list[k] || (list[k] = new Batch());
  // the signs: each shop's own, drawn into atlases (world/shopSigns.js) once the sign faces have loaded
  const signAt = createSignAtlas(2048, 2048), bladeAt = createSignAtlas(2048, 2048);
  // a generic shop (where no real one has been placed): an invented name in the street's manner
  const PLAQUE_BG = ['#111010', '#121212', '#5e0f12', '#1a1410'], BRAND_BG = ['#b8141c', '#0d3b7a', '#0f5a3a', '#1d1d1f', '#c8102e', '#5a2a82'];
  const generic = (rr) => {
    const [zh, en] = SHOP_TYPES[Math.floor(rr() * SHOP_TYPES.length)], name = SYL[Math.floor(rr() * SYL.length)] + SYL[Math.floor(rr() * SYL.length)] + zh, k = rr();
    return { zh: name, en, type: zh, sign: k < 0.45 ? { style: 'plaque', bg: PLAQUE_BG[Math.floor(rr() * 4)], font: rr() < 0.7 ? 'kai' : 'wei' } : k < 0.8 ? { style: 'brand', bg: BRAND_BG[Math.floor(rr() * BRAND_BG.length)] } : { style: 'deco' },
      blade: rr() < 0.5 ? { bladeStyle: rr() < 0.5 ? 'neon' : 'plaque', neon: NEON[Math.floor(rr() * NEON.length)] } : null };
  };
  // a signboard out in front of the façade (clear of the ground floor's cornice, 0.3 m out): w x h, its
  // bottom at y; standing letters have no board
  const signboard = (spec, cx, zf, dir, w, h, y) => {
    const st = spec.style || 'brand', bare = st === 'letters' && !spec.board, off = 0.34, d = bare ? 0 : 0.12, zFace = zf + dir * (off + d + 0.004);
    const uv = signAt.add(spec, w / h);
    if (d) boards.box(cx, y - 0.04, zf + dir * (off + d / 2), w + 0.08, h + 0.08, d);
    quad(onPage(bare ? letters : signs, uv[4]), dir > 0 ? cx - w / 2 : cx + w / 2, zFace, dir > 0 ? cx + w / 2 : cx - w / 2, zFace, y, y + h, uv);
    if (d) for (const bx of [cx - w * 0.35, cx + w * 0.35]) boards.box(bx, y + h * 0.4, zf + dir * off / 2, 0.06, 0.08, off);   // brackets back to the wall
  };
  // a vertical sign standing out from the façade, both faces
  const bladeSign = (spec, bx, zf, dir, y0, hgt) => {
    const f = bladeAt.add(spec, hgt / 1.1 * 0.9, { blade: true });
    // each face just proud of its side of the 8 cm board (on the board's own plane they'd be inside it)
    const fa = bx - dir * 0.046, fb = bx + dir * 0.046;
    quad(onPage(blades, f[4]), fa, zf + dir * 0.3, fa, zf + dir * 1.4, y0, y0 + hgt, f);
    quad(onPage(blades, f[4]), fb, zf + dir * 1.4, fb, zf + dir * 0.3, y0, y0 + hgt, [f[2], f[1], f[0], f[3]]);
    boards.box(bx, y0 - 0.05, zf + dir * 0.85, 0.08, hgt + 0.1, 1.2);
  };
  // the shopfronts: glass with the real shop behind it, frames, automatic doors (world/shopfronts.js)
  const fronts = createShopfronts({ size: roomSize, rnd: rng(2020) });
  const quad = (batch, ax, az, bx, bz, y0, y1, uv) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([ax, y0, az, bx, y0, bz, bx, y1, bz, ax, y0, az, bx, y1, bz, ax, y1, az], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([uv[0], uv[1], uv[2], uv[1], uv[2], uv[3], uv[0], uv[1], uv[2], uv[3], uv[0], uv[3]], 2));
    g.computeVertexNormals(); batch.push(g);
  };
  // one building: footprint along the street, its street face at zf facing `dir` (+1 south, -1 north)
  function building(xa, xb, zf, dir, seed, opts = {}) {
    const rr = rng(seed), w = xb - xa, kind = rr();
    const depth = 18, fp = dir > 0 ? { x0: xa, x1: xb, z0: zf - depth, z1: zf } : { x0: xa, x1: xb, z0: zf, z1: zf + depth };
    const face = dir > 0 ? 'S' : 'N', gain = { [face]: 1, E: 0.55, W: 0.55 };
    const base = 5.4, style = opts.style || (kind < 0.4 ? 'classic' : kind < 0.65 ? 'deco' : kind < 0.85 ? 'arched' : 'brick');
    const up = opts.up || 12 + Math.floor(rr() * 5) * 3.6, top = opts.top ?? rr() < 0.5;
    // the great department stores: built as they are (world/njLandmarks.js)
    const lmk = opts.shop && opts.shop.landmark && LANDMARK_BUILDERS[opts.shop.landmark];
    const lmHeight = lmk ? lmk({ B, tiers, steel: P.steel, globes: lmGlobes, group, seed }, xa, xb, zf, dir) : 0;
    if (!lmk) tiers(B, fp, 0, [
      { h: base, style: 'rustic', bay: 4, f0: 0.55, f1: 0.45, cornice: { out: 0.3, h: 0.45 } },
      { h: up, style, floors: Math.round(up / 3.6), bay: style === 'deco' ? 3 : 4, f0: 0.5, f1: 0.28, cornice: { out: 0.55, h: 0.7 } },
      ...(top ? [{ h: 3.6, style, floors: 1, bay: 4, inset: 1.6, f0: 0.35, f1: 0.25 }] : []),
    ], `${face}EW`, seed, gain);
    // the shopfront (the room behind the glass follows what the sign says it sells), with a door at each
    // spot the crowd goes in by (engine/crowd.js: every 13 m from x -46)
    // which shop: a real one placed here (world/njShops.js), else an invented one
    const shop = opts.shop || generic(rr);
    const doorAt = [];
    for (let dx = -46; dx > xa; dx -= 13) if (dx > xa + 2.6 && dx < xb - 2.6) { doorAt.push(dx); doorList.push({ x: dx, z: zf, dir }); }
    if (shop.doors) for (const dx of shop.doors) if (dx > xa + 2.6 && dx < xb - 2.6 && !doorAt.some((u) => Math.abs(u - dx) < 5.2)) doorAt.push(dx);
    if (shop.front !== false) fronts.addFront({ axis: 'x', plane: zf, out: dir }, xa, xb, { y0: CH, top: (shop.front && shop.front.top) || 4.1, doorAt, type: shop.type, room: opts.room || shop.room || null });
    if (opts.signs === false || shop.noSign) return lmHeight || base + up + (top ? 3.6 : 0);
    // the signboard over the shopfront, out in front of the cornice
    const sg = { zh: shop.zh, en: shop.en, since: shop.since, ...shop.sign }, st = sg.style || 'brand';
    const size = (g, wide) => {
      const t = g.style || 'brand', h = g.h || (t === 'letters' ? 1.0 : t === 'plaque' ? 1.3 : 1.15);
      return [Math.min(w - 1.2, g.width || (t === 'plaque' ? Math.max(5, [...(g.zh || '')].length * 1.5) : wide), 13), h];
    };
    const [sw, sh] = size(sg, 11), y = sg.y || ((shop.front && shop.front.top) > 6 ? 5.6 : 4.3);
    const sx = Math.min(xb - sw / 2 - 0.4, Math.max(xa + sw / 2 + 0.4, shop.signAt ?? (xa + xb) / 2));
    signboard(sg, sx, zf, dir, sw, sh, y);
    // the other shops in the same building (their own signs over their own windows)
    for (const m of shop.more || []) {
      const g = { zh: m.zh, en: m.en, ...m.sign }, [mw, mh] = size(g, 6);
      signboard(g, Math.min(xb - mw / 2 - 0.4, Math.max(xa + mw / 2 + 0.4, m.x)), zf, dir, mw, mh, g.y || 4.3);
    }
    // a vertical sign standing out from the façade
    if (shop.blade) {
      const bx = shop.blade.at ?? (dir > 0 ? xb - 1.6 : xa + 1.6), y0 = base + 0.8, hgt = Math.min(9, 1.2 * [...(shop.blade.text || shop.zh)].length + 1.2);
      bladeSign({ ...sg, ...shop.blade, blade: shop.blade.text || shop.zh }, bx, zf, dir, y0, hgt);
    }
    return lmHeight || base + up + (top ? 3.6 : 0);
  }
  let seed = 11;
  const doorList = [], lmGlobes = new Batch();
  // the real shops (world/njShops.js), each at its street number on its side of the street
  const PLACED = placedShops();
  const placedAt = (dir, x) => PLACED.find((p) => p.dir === dir && Math.abs(x - p.x1) < 0.01);
  const screens = [];
  // the shengjian shop's building (world/dumpling.js does its ground floor): storeys above an open shopfront
  function shopBuilding(xa, xb, zf) {
    const fp = { x0: xa, x1: xb, z0: zf, z1: zf + 18 };
    tiers(B, fp, 4.6, [
      { h: 0.8, style: 'rustic', bay: 4, f0: 0.55, f1: 0.45, cornice: { out: 0.3, h: 0.45 } },
      { h: 14.4, style: 'classic', floors: 4, bay: 3.3, f0: 0.5, f1: 0.28, cornice: { out: 0.55, h: 0.7 } },
    ], 'NEW', 977, { N: 1, E: 0.55, W: 0.55 });
    // the shop's back wall (the rest of the ground floor behind it is the building's)
    tiers(B, { x0: xa, x1: xb, z0: DUMPLING.z1 + 0.3, z1: zf + 18 }, 0, [{ h: 4.6, style: 'rustic', bay: 4, f0: 0.55, f1: 0.45 }], 'N', 978, { N: 0.4 });
  }
  for (const [zf, dir] of [[NJ.z0, 1], [NJ.z1, -1]]) for (const [ea, eb] of njRuns(dir)) {
    let x = Math.max(ea, eb);
    const end = Math.min(ea, eb);
    while (x - end > 6) {
      if (dir < 0 && Math.abs(x - DUMPLING.x1) < 0.01) { shopBuilding(DUMPLING.x0, DUMPLING.x1, zf); x = DUMPLING.x0; continue; }
      const here = placedAt(dir, x);
      if (here && here.x0 >= end - 0.01) { building(here.x0, x, zf, dir, seed++, { ...here.building, shop: here.shop }); x = here.x0; continue; }
      let w = Math.min(x - end, 16 + r() * 22);
      if (dir < 0 && x > DUMPLING.x1 && x - w < DUMPLING.x1 + 0.01) w = x - DUMPLING.x1;    // stop at the shengjian shop
      const next = PLACED.find((p) => p.dir === dir && x > p.x1 + 0.01 && x - w < p.x1 + 0.01 && p.x0 >= end - 0.01);
      if (next) {                                                                             // stop at a real shop
        if (x - next.x1 < 5) { building(next.x0, x, zf, dir, seed++, { ...next.building, shop: next.shop }); x = next.x0; continue; }   // (no sliver between)
        w = x - next.x1;
      }
      if (x - w - end < 5 && x - w > end) w = x - end;                                         // (nor at the end of the block)
      const hgt = building(x - w, x, zf, dir, seed++);
      if (r() < 0.12 && w > 18) screens.push({ x: x - w / 2, z: zf + dir * 0.2, dir, y: Math.min(hgt - 4, 14), w: Math.min(w * 0.6, 12) });
      x -= w;
    }
  }
  // along Henan Road near the junction: buildings facing the road (its pavements are walkable 30 m)
  for (const [xf, dir] of [[h.x1 + 5, 1], [h.x0 - 5, -1]]) for (const [za, zb] of [[NJ.z0 - 34, NJ.z0 - 18], [NJ.z1 + 18, NJ.z1 + 34]]) {
    const fp = dir > 0 ? { x0: xf, x1: xf + 16, z0: za, z1: zb } : { x0: xf - 16, x1: xf, z0: za, z1: zb };
    tiers(B, fp, 0, [{ h: 5.4, style: 'rustic', bay: 4, f0: 0.5, f1: 0.4, cornice: { out: 0.3, h: 0.45 } }, { h: 18, style: 'classic', floors: 5, bay: 4, f0: 0.45, f1: 0.25, cornice: { out: 0.5, h: 0.6 } }], dir > 0 ? 'W' : 'E', seed++, { W: 1, E: 1 });
    fronts.addFront({ axis: 'z', plane: xf, out: -dir }, za + 0.3, zb - 0.3, { y0: CH });
  }
  // ---- the city behind and around: real façades (the street's own kit), not cards ----
  // backdrop(fp, faces, rr): one block of the 1920s-30s fabric (rusticated base, four to seven storeys of
  // stone, deco or brick, sometimes a set-back attic), or now and then a later glass tower behind it.
  // Faces toward the viewer at full light, the rest in shade.
  const parkTrees = [];
  const far = new Batch(), towerUV = (g, w, d, hh, rr) => { const uv = g.attributes.uv, ou = rr(), ov = rr(); for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * Math.max(w, d)) / 3 / 64 + ou, (uv.getY(i) * hh) / 4 / 64 + ov); };
  const backdrop = (fp, faces, rr, { front = faces[0], tall = 0.12 } = {}) => {
    const gains = { N: 0.6, S: 0.6, E: 0.6, W: 0.6, [front]: 1 };
    const w = fp.x1 - fp.x0, d = fp.z1 - fp.z0;
    if (rr() < tall && w > 14 && d > 14) {                  // a 1990s-2000s tower on a stone podium
      tiers(B, fp, 0, [{ h: 5.4, style: 'rustic', bay: 4, f0: 0.5, f1: 0.4, cornice: { out: 0.3, h: 0.45 } }, { h: 10.8, style: 'classic', floors: 3, bay: 4, f0: 0.45, f1: 0.3, cornice: { out: 0.4, h: 0.5 } }], faces, seed++, gains);
      const tw = Math.min(w, d) - 6, hh = 45 + rr() * 70, g = new THREE.BoxGeometry(tw, hh, tw);
      towerUV(g, tw, tw, hh, rr); g.translate((fp.x0 + fp.x1) / 2, 16.2 + hh / 2, (fp.z0 + fp.z1) / 2); far.push(g);
      return;
    }
    const style = ['classic', 'deco', 'arched', 'brick', 'classic'][Math.floor(rr() * 5)], up = 10.8 + Math.floor(rr() * 5) * 3.6;
    tiers(B, fp, 0, [
      { h: 5.4, style: 'rustic', bay: 4, f0: 0.5, f1: 0.4, cornice: { out: 0.3, h: 0.45 } },
      { h: up, style, floors: Math.round(up / 3.6), bay: style === 'deco' ? 3 : 4, f0: 0.45, f1: 0.25, cornice: { out: 0.5, h: 0.6 } },
      ...(rr() < 0.35 ? [{ h: 7.2, style, floors: 2, bay: 4, inset: 2.5, f0: 0.35, f1: 0.2, cornice: { out: 0.3, h: 0.4 } }] : []),
    ], faces, seed++, gains);
  };
  // a run of blocks along x (a frontage facing `front`) from xa down to xb, skipping the gaps
  const runX = (xa, xb, z0, z1, faces, rr, gaps = [], opts) => {
    let x = xa;
    while (x > xb + 6) {
      const inGap = gaps.find(([g0, g1]) => x > g0 - 0.3 && x <= g1 + 0.6);
      if (inGap) { x = inGap[0] - 0.6; continue; }
      let w = Math.min(x - xb, 14 + rr() * 18);
      const cut = gaps.find(([, g1]) => g1 < x && g1 > x - w); if (cut) w = x - cut[1] - 0.6;
      if (w > 5) backdrop({ x0: x - w, x1: x, z0, z1 }, faces, rr, opts);
      x -= Math.max(w, 1) + 0.4;
    }
  };
  // and a run along z (a frontage facing E or W)
  const runZ = (za, zb, x0, x1, faces, rr, opts) => {
    let z = za;
    while (z < zb - 6) { const d = Math.min(zb - z, 16 + rr() * 22); backdrop({ x0, x1, z0: z, z1: z + d }, faces, rr, opts); z += d + 0.4; }
  };
  { const rb = rng(77);
    // Henan Road, beyond the junction's own buildings, both sides, both ways
    for (const [x0, x1, face] of [[h.x1 + 5, h.x1 + 30, 'W'], [h.x0 - 30, h.x0 - 5, 'E']]) {
      runZ(NJ.zc - HL, NJ.z0 - 34, x0, x1, face + 'NS', rb, { front: face });
      runZ(NJ.z1 + 34, NJ.zc + HL, x0, x1, face + 'NS', rb, { front: face });
    }
    // behind both frontages west of Henan Road: a first row (open where the side streets run north and
    // south) and a deeper row that closes the side streets' views; seen over the roofs, down the side
    // streets and across Century Square
    const xa = h.x0 - 31, xb = NJ.xizang.x1 + 1, C = NJ.century;
    const gapsN = njCross(1).map((c) => [c.x0, c.x1]), gapsS = [...njCross(-1).map((c) => [c.x0, c.x1]), [C.x0 - 7, C.x1 + 7]];
    runX(xa, xb, NJ.z0 - 50, NJ.z0 - 19, 'SEW', rb, gapsN, { front: 'S' });
    runX(xa, xb, NJ.z0 - 88, NJ.z0 - 51, 'SEW', rb, [], { front: 'S', tall: 0.3 });
    runX(xa, xb, NJ.z1 + 19, NJ.z1 + 50, 'NEW', rb, gapsS, { front: 'N' });
    runX(xa, C.x1 + 7, NJ.z1 + 51, NJ.z1 + 88, 'NEW', rb, [], { front: 'N', tall: 0.3 });
    runX(C.x0 - 7, xb, NJ.z1 + 51, NJ.z1 + 88, 'NEW', rb, [], { front: 'N', tall: 0.3 });
    runX(C.x1 + 7, C.x0 - 7, NJ.z1 + 57, NJ.z1 + 88, 'NEW', rb, [], { front: 'N', tall: 0.5 });
    // Xizang Road's east side, north and south of the street's corner blocks, facing the road
    runZ(NJ.zc - 165, NJ.z0 - 89, NJ.xizang.x1 + 1, NJ.xizang.x1 + 26, 'WNS', rb, { front: 'W' });
    runZ(NJ.z1 + 89, NJ.zc + 165, NJ.xizang.x1 + 1, NJ.xizang.x1 + 26, 'WNS', rb, { front: 'W' });
  }
  const farMat = glassByDay(new THREE.MeshBasicMaterial({ map: towerAtlas(31, 0.75) }), [0.36, 0.42, 0.5]); farMat.color.setScalar(0.85);
  // ---- the cross streets: closed off a few metres in (roadworks hoardings), on the sides they open ----
  const hoard = (x0, x1, z0, z1) => { P.hoard.box((x0 + x1) / 2, 0, (z0 + z1) / 2, Math.max(0.12, x1 - x0), 2.5, Math.max(0.12, z1 - z0)); };
  for (const c of njCross(1)) { hoard(c.x0, c.x1, NJ.z0 - 8.6, NJ.z0 - 8.48); P.paving.box((c.x0 + c.x1) / 2, -0.3, NJ.z0 - 4.3, c.x1 - c.x0, 0.3 + CH, 8.6, { tile: 2.4 }); }
  for (const c of njCross(-1)) { hoard(c.x0, c.x1, NJ.z1 + 8.48, NJ.z1 + 8.6); P.paving.box((c.x0 + c.x1) / 2, -0.3, NJ.z1 + 4.3, c.x1 - c.x0, 0.3 + CH, 8.6, { tile: 2.4 }); }
  // ---- Century Square (南京路世纪广场): an open square off the south side, the old Wing On annexe's tower
  // behind it, planted, with benches ----
  {
    const C = NJ.century, zb = NJ.z1 + C.depth;
    P.paving.box((C.x0 + C.x1) / 2, -0.3, NJ.z1 + C.depth / 2, C.x1 - C.x0, 0.3 + CH, C.depth, { tile: 2.4 });
    tiers(B, { x0: C.x0 - 6, x1: C.x1 + 6, z0: zb, z1: zb + 20 }, 0, [
      { h: 6, style: 'rustic', bay: 4, f0: 0.55, f1: 0.45, cornice: { out: 0.3, h: 0.45 } },
      { h: 25.2, style: 'deco', floors: 7, bay: 3, f0: 0.5, f1: 0.28, cornice: { out: 0.55, h: 0.7 } },
      { h: 10.8, style: 'deco', floors: 3, bay: 3, inset: 6, f0: 0.4, f1: 0.25 },
    ], 'NEW', 1918, { N: 1, E: 0.55, W: 0.55 });
    fronts.addFront({ axis: 'x', plane: zb, out: -1 }, C.x0 - 4, C.x1 + 4, { y0: CH, type: '百货' });
    for (const x of [C.x0 + 1, C.x1 - 1]) P.granite.box(x, CH, NJ.z1 + C.depth / 2, 0.4, 0.5, C.depth - 4);   // low walls down the sides
    for (let x = C.x0 + 8; x < C.x1 - 6; x += 12) for (const z of [NJ.z1 + 12, NJ.z1 + 24]) {
      P.granite.box(x, CH, z, 2.6, 0.5, 2.6); parkTrees.push({ x, y: CH + 0.5, z, h: 6.5 + ((x + z) % 3 + 3) % 3 * 0.5, species: 'plane', seed: 700 + parkTrees.length, bare: 0.18 });   // planters, each with a plane tree (late November: turning)
      P.steel.box(x + 3, CH + 0.42, z, 1.8, 0.06, 0.5);                                                  // and a bench
    }
  }
  // ---- the Christmas tree outside Shimao Festival City, on the Xizang Road corner (lit late November to New
  // Year: Shimao lit its tree on 22 November 2025), a tiered cone strung with warm bulbs, a star on top ----
  const xmas = new THREE.Group(); xmas.name = 'nj-christmas'; xmas.visible = false; group.add(xmas);
  { const X = -1514, Z = NJ.z1 - 3.4, tierB = new Batch(), bulbB = new Batch(), r0 = rng(1225);
    tierB.cyl(X, CH, Z, 1.6, 1.7, 0.6, 16);                                                          // the planter
    for (let i = 0; i < 6; i++) { const y = CH + 0.6 + i * 1.35, rb = 2.6 - i * 0.38; tierB.add(new THREE.ConeGeometry(rb, 2.0, 18, 1, true), { x: X, y: y + 1.0, z: Z });
      for (let k = 0; k < 14 - i; k++) { const a = r0() * Math.PI * 2, h = r0() * 1.6, rr = rb * (1 - h / 2.0) + 0.04; bulbB.add(new THREE.SphereGeometry(0.06, 6, 4), { x: X + Math.cos(a) * rr, y: y + h, z: Z + Math.sin(a) * rr }); } }
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.42), asLight(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.0, 0.9) }), 'lamps', 0.6)); star.position.set(X, CH + 9.6, Z); xmas.add(star);
    xmas.add(tierB.mesh(new THREE.MeshStandardMaterial({ color: 0x1f4a2a, roughness: 0.8, side: THREE.DoubleSide }), 'xmas-tree'), bulbB.mesh(asLight(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.6, 0.8) }), 'lamps', 0.5), 'xmas-bulbs')); }
  // ---- the west end: Xizang Middle Road, its carriageway railed off at the kerb; People's Square beyond ----
  {
    const X = NJ.xizang, HZ = 160;
    P.asphalt.floor(X.x0, X.x1, NJ.zc - HZ, NJ.zc + HZ, 0, 6);
    P.granite.box(X.x1 + 0.08, -0.3, NJ.zc, 0.16, 0.3 + CH + 0.005, HZ * 2);
    for (let x = X.x0 + 0.5; x < X.x1 - 0.5; x += 0.9) P.paint.floor(x, x + 0.45, NJ.zc - 3.4, NJ.zc + 3.4, 0.012);    // the zebra (closed: railed)
    for (const sx of [-0.18, 0.18]) P.yellow.floor((X.x0 + X.x1) / 2 + sx - 0.07, (X.x0 + X.x1) / 2 + sx + 0.07, NJ.zc - HZ, NJ.zc + HZ, 0.012);
    // the pedestrian railing along the kerb (Shanghai's white-and-grey steel), with its posts
    for (let z = NJ.z0 - 1; z <= NJ.z1 + 1; z += 2.2) P.steel.box(X.x1 + 0.4, CH, z, 0.06, 1.1, 0.06);
    for (const y of [0.35, 1.05]) P.steel.box(X.x1 + 0.4, CH + y, NJ.zc, 0.05, 0.05, NJ.z1 - NJ.z0 + 2);
    // across the road: Nanjing West Road runs on west between New World City (新世界城, the north-west
    // corner, the Radisson New World's saucer-topped tower rising behind it) and People's Park (the
    // south-west corner: trees behind a low railing); buildings line Xizang Road north and south of them
    const W0 = X.x0, WZ0 = NJ.zc - 11, WZ1 = NJ.zc + 11, rx = rng(78);
    P.asphalt.floor(W0 - 260, W0, WZ0 + 3.5, WZ1 - 3.5, 0, 6);
    for (const sx of [-0.18, 0.18]) P.yellow.floor(W0 - 260, W0, NJ.zc + sx - 0.07, NJ.zc + sx + 0.07, 0.012);
    for (const [za, zb] of [[WZ0, WZ0 + 3.5], [WZ1 - 3.5, WZ1]]) { P.paving.box(W0 - 130, -0.3, (za + zb) / 2, 260, 0.3 + CH, zb - za, { tile: 2.4 }); P.granite.box(W0 - 130, -0.3, za < NJ.zc ? zb + 0.08 : za - 0.08, 260, 0.3 + CH + 0.005, 0.16); }
    for (const [za, zb] of [[NJ.zc - 165, WZ0 + 3.5], [WZ1 - 3.5, NJ.zc + 165]]) {      // Xizang Road's west pavement and kerb
      P.paving.box(W0 - 3, -0.3, (za + zb) / 2, 6, 0.3 + CH, zb - za, { tile: 2.4 }); P.granite.box(W0 - 0.08, -0.3, (za + zb) / 2, 0.16, 0.3 + CH + 0.005, zb - za); }
    // New World City: a broad 1990s block on the corner, its own LED screen over the corner
    tiers(B, { x0: W0 - 92, x1: W0 - 4, z0: NJ.zc - 80, z1: WZ0 }, 0, [
      { h: 6, style: 'rustic', bay: 4, f0: 0.6, f1: 0.5, cornice: { out: 0.3, h: 0.45 } },
      { h: 28.8, style: 'deco', floors: 8, bay: 3, f0: 0.55, f1: 0.3, cornice: { out: 0.55, h: 0.7 } },
      { h: 10.8, style: 'deco', floors: 3, bay: 3, inset: 5, f0: 0.4, f1: 0.25 },
    ], 'ESW', 1993, { E: 1, S: 1, W: 0.6 });
    // the Radisson Collection Hotel New World (208 m): a round shaft, the 'flying saucer' near the top, a mast
    { const rxz = { x: W0 - 46, z: NJ.zc - 52 };
      tower(B, { ...rxz, y0: 45.6, flood: 0.5, stages: [
        { kind: 'cyl', w: 30, h: 128, mat: 'stone', flood: 0.35 },
        { kind: 'cyl', w: 31, h: 1.2, mat: 'stoneDark' },
        { kind: 'cyl', w: 46, w0: 34, h: 6, mat: 'glassDark', flood: 0.9 },
        { kind: 'cyl', w: 34, w0: 46, h: 5, mat: 'stone', flood: 0.9 },
        { kind: 'cyl', w: 22, h: 8, mat: 'glassDark' },
        { kind: 'dome', w: 22, h: 4, mat: 'stone' },
        { kind: 'pole', w: 1, h: 10 },
      ] }); }
    runZ(NJ.zc - 165, NJ.zc - 81, W0 - 30, W0 - 4, 'ENS', rx, { front: 'E' });
    // People's Park: a low railing on the corner, the park's trees (world/trees.js), the city beyond
    for (let x = W0 - 4; x > W0 - 140; x -= 2.4) P.steel.box(x, CH, WZ1 + 0.6, 0.05, 1.0, 0.05);
    P.steel.box(W0 - 72, CH + 0.9, WZ1 + 0.6, 136, 0.05, 0.05);
    for (let z = WZ1 + 0.6; z < NJ.zc + 130; z += 2.4) P.steel.box(W0 - 6.2, CH, z, 0.05, 1.0, 0.05);
    P.steel.box(W0 - 6.2, CH + 0.9, (WZ1 + NJ.zc + 130) / 2, 0.05, 0.05, NJ.zc + 130 - WZ1);
    P.paving.box(W0 - 86, -0.3, NJ.zc + 72, 160, 0.3 + CH - 0.02, 120, { tile: 2.4 });
    { const T = (x, z) => parkTrees.push({ x, y: CH, z, h: 9 + rx() * 5, species: rx() < 0.6 ? 'camphor' : 'plane', seed: 900 + parkTrees.length });   // its edge rows only: the
      for (let x = W0 - 10; x > W0 - 95; x -= 8.5 + rx() * 2) { T(x, WZ1 + 4 + rx()); T(x - 4, WZ1 + 11 + rx() * 2); }                       // park reads from its kerb
      for (let z = WZ1 + 18; z < NJ.zc + 100; z += 10 + rx() * 3) T(W0 - 11 - rx(), z); }
    runZ(NJ.zc + 132, NJ.zc + 165, W0 - 30, W0 - 4, 'ENS', rx, { front: 'E' });
    // the vista down Nanjing West Road: the Park Hotel's quarter, a kilometre off
    runZ(WZ0 - 40, WZ1 + 40, W0 - 300, W0 - 270, 'ENS', rx, { front: 'E', tall: 0.6 });
    runX(W0 - 96, W0 - 268, NJ.zc - 60, WZ0, 'SEW', rx, [], { front: 'S', tall: 0.3 });
  }
  group.add(far.mesh(farMat, 'nj-backdrop-towers'));
  // ---- the night glow on the paving: the street is lit kerb to kerb by its shop windows, signs and
  // screens (brightest along the frontages, never black in the middle); an additive wash that comes up
  // with the shop lights ----
  { const [c, x] = makeCanvas(4, 256), g = x.createLinearGradient(0, 0, 0, 256);
    for (const [t, a] of [[0, 1], [0.12, 0.7], [0.3, 0.48], [0.5, 0.42], [0.7, 0.48], [0.88, 0.7], [1, 1]]) { const v = Math.round(a * 255); g.addColorStop(t, `rgb(${v},${v},${v})`); }   // (an alphaMap reads green)
    x.fillStyle = g; x.fillRect(0, 0, 4, 256);
    // (the paving's own texture through it, so the stones still read: the wash on uv, the gradient on uv1)
    const t = tex(c, { repeat: false }); t.channel = 1;
    const glow = new THREE.MeshBasicMaterial({ map: M.sidewalk.map, alphaMap: t, color: new THREE.Color(1.6, 1.22, 0.88), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    asLight(glow, 'signs');                                // dusk to 11 pm, as the neon
    const wash = new Batch();
    for (const [xa, xb] of [[h.x1 + 0.5, -40], [NJ.xWest, h.x0 - 0.5]]) {
      wash.floor(xa, xb, NJ.z0, NJ.z1, CH + 0.012, 2.4); const g2 = wash.list[wash.list.length - 1], uv = g2.attributes.uv, uv1 = uv.clone();
      for (let i = 0; i < uv.count; i++) uv1.setXY(i, 0.5, (uv.getY(i) * 2.4 + NJ.z1) / (NJ.z1 - NJ.z0));
      g2.setAttribute('uv1', uv1);
    }
    const m = wash.mesh(glow, 'nj-night-glow'); m.renderOrder = 2; group.add(m); }
  for (const z of [NJ.z0 - h.walkTo - 0.5, NJ.z1 + h.walkTo + 0.5]) { hoard(h.x1, h.x1 + 5, z - 0.06, z + 0.06); hoard(h.x0 - 5, h.x0, z - 0.06, z + 0.06); }
  // ---- lamp posts: down both sides of the 2020 extension, down the golden belt west of Henan Road (layout.js njLamps) ----
  const lampGlass = new Batch();
  for (const [x, z] of njLamps()) {
    const belt = x < h.x0;                                   // (one line instead of two: a little brighter each)
    P.steel.cyl(x, CH + (belt ? 0.008 : 0), z, 0.07, 0.11, 6.2, 8); P.steel.box(x, 6.1, z, 1.8, 0.08, 0.08);
    for (const dx of [-0.85, 0, 0.85]) lampGlass.add(new THREE.SphereGeometry(0.2, 12, 8), { x: x + dx, y: dx ? 5.85 : 6.55, z });
    lights.push({ x, y: 6, z, color: new THREE.Color(1.0, 0.88, 0.72), intensity: belt ? 12 : 9, distance: belt ? 21 : 18, out: true });
  }
  const glow = asLight(new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 1.7, 1.4) }), 'lamps', 0.45);
  group.add(lampGlass.mesh(glow, 'nj-lamps'));
  if (lmGlobes.list.length) group.add(lmGlobes.mesh(glow, 'nj-landmark-globes'));
  // ---- the metro entrances ----
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xa8c4cc, metalness: 0.1, roughness: 0.04, transparent: true, opacity: 0.28, side: THREE.DoubleSide });
  const glassB = new Batch(), stairs = new Batch(), walls = new Batch(), strips = new Batch();
  for (const m of METRO) {
    const zc = (m.z0 + m.z1) / 2, wz = m.z1 - m.z0, down = Math.sign(m.bottom - m.top), run = Math.abs(m.bottom - m.top), rise = CH + METRO_DEPTH;
    // stairs: treads from the top down
    const n = Math.round(rise / 0.155), tread = run / n;
    for (let i = 0; i < n; i++) {
      const y = CH - (i + 1) * (rise / n), x = m.top + down * (i + 0.5) * tread;
      P.granite.box(x, y - 0.2, zc, tread + 0.02, 0.2 + rise / n, wz);
      strips.box(x - down * tread * 0.45, y + rise / n - 0.004, zc, 0.04, 0.01, wz - 0.3);          // nosing light
    }
    const lx0 = Math.min(m.bottom, m.x0 === m.top ? m.x1 : m.x0), lx1 = Math.max(m.bottom, m.x0 === m.top ? m.x1 : m.x0);
    P.tile.box((lx0 + lx1) / 2, -METRO_DEPTH - 0.3, zc, lx1 - lx0, 0.3, wz);                          // the landing
    // walls of the well, below the street: white tile; the end wall carries the way in
    for (const z of [m.z0 - 0.06, m.z1 + 0.06]) walls.box((m.x0 + m.x1) / 2, -METRO_DEPTH, z, m.x1 - m.x0, METRO_DEPTH + CH, 0.12);
    const endX = m.top === m.x1 ? m.x0 - 0.06 : m.x1 + 0.06;
    walls.box(endX, -0.8, zc, 0.12, 0.8 + CH, wz + 0.24);                                                // (below: open on to the concourse)
    // above the street: the closed end, a steel-framed lit station board on its street face, glass above
    P.steel.box(endX, CH, zc, 0.16, 2.6, wz + 0.24);
    { const bm = asLight(new THREE.MeshBasicMaterial({ map: metroBoard(m.exit) }), 'lamps', 0.85), out = m.top === m.x1 ? -1 : 1;
      const b = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.4), bm); b.position.set(endX + out * 0.085, CH + 1.3, zc); b.rotation.y = out * Math.PI / 2; group.add(b); }
    walls.box((m.x0 + m.x1) / 2, 3.1, zc, m.x1 - m.x0 + 0.6, 0.12, wz + 0.8);                         // canopy roof frame
    // glass balustrades (three sides) and the canopy's glass
    for (const z of [m.z0, m.z1]) { glassB.box((m.x0 + m.x1) / 2, CH, z, m.x1 - m.x0, 1.1, 0.03); P.steel.box((m.x0 + m.x1) / 2, CH + 1.1, z, m.x1 - m.x0, 0.05, 0.06); }
    glassB.box(endX, CH, zc, 0.03, 1.1, wz);
    for (const x of [m.x0, m.x1]) for (const z of [m.z0, m.z1]) P.steel.box(x, CH, z, 0.1, 3.0, 0.1);
    glassB.box((m.x0 + m.x1) / 2, 3.04, zc, m.x1 - m.x0 + 0.4, 0.02, wz + 0.6);
    // the sign over the open end, both faces; a smaller one on the street side
    const signMat = new THREE.MeshBasicMaterial({ map: metroSign(m.exit) }); signMat.color.setScalar(1.35);
    const topX = m.top + (m.top === m.x1 ? 0.15 : -0.15);
    for (const s of [1, -1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(wz + 0.4, (wz + 0.4) / 4), signMat); p.position.set(topX, 3.55, zc); p.rotation.y = s * Math.PI / 2; group.add(p); }
    const side = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.1), signMat); side.position.set((m.x0 + m.x1) / 2, 3.55, m.z1 + 0.42); group.add(side);
    const sb = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.2, 0.8), new THREE.MeshStandardMaterial({ color: 0x8e959c, roughness: 0.35, metalness: 0.7 })); sb.position.set((m.x0 + m.x1) / 2, 3.55, m.z1 + 0.0); group.add(sb);   // brushed steel
    const side2 = side.clone(); side2.position.z = m.z1 - 0.42; side2.rotation.y = Math.PI; group.add(side2);                          // the sign on its other face too
    lights.push({ x: (lx0 + lx1) / 2, y: -METRO_DEPTH + 2.6, z: zc, color: new THREE.Color(0.95, 0.97, 1.0), intensity: 2.2, distance: 8 });
    lights.push({ x: (m.x0 + m.x1) / 2, y: 2.8, z: zc, color: new THREE.Color(0.92, 0.96, 1.0), intensity: 5, distance: 9 });
    m.sign = { x: topX, z: zc };
  }
  // LED screens
  const scrTex = screenAtlas(), scrMat = new THREE.MeshBasicMaterial({ map: scrTex }); scrMat.color.setScalar(1.6); asLight(scrMat, 'screens', 0.08);
  for (const s of screens) { const p = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.w * 0.5), scrMat); p.position.set(s.x, s.y, s.z); if (s.dir < 0) p.rotation.y = Math.PI; group.add(p); }
  // ---- materials ----
  flush(B, M, group, 'nj-');
  // the signs: lit at night, painted boards by day; drawn now and again once the sign faces are in
  signAt.draw(); bladeAt.draw(); loadSignFonts().then(() => { signAt.draw(); bladeAt.draw(); });
  const pageMats = (list, atlas, make) => list.forEach((b, k) => { if (b && b.list.length) group.add(b.mesh(make(atlas.textures[k]), `nj-signs-${k}`)); });
  const boardMat = new THREE.MeshStandardMaterial({ color: 0x1b1916, metalness: 0.6, roughness: 0.4 });
  group.add(fronts.build());
  pageMats(signs, signAt, (t) => { const m = new THREE.MeshBasicMaterial({ map: t }); m.color.setScalar(1.35); return asLight(m, 'signs', 0.62); });
  pageMats(letters, signAt, (t) => { const m = new THREE.MeshBasicMaterial({ map: t, alphaTest: 0.5 }); m.color.setScalar(1.5); return asLight(m, 'signs', 0.7); });
  pageMats(blades, bladeAt, (t) => { const m = new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }); m.color.setScalar(1.5); return asLight(m, 'signs', 0.6); });
  group.add(boards.mesh(boardMat, 'nj-sign-boards'));
  { // polished red granite: speckled, slab joints every 1.6 m
    const [c, x] = makeCanvas(256, 256), r0 = rng(1999);
    x.fillStyle = '#6b2a22'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) { const v = r0(); x.fillStyle = v < 0.45 ? 'rgba(40,12,10,0.55)' : v < 0.8 ? 'rgba(170,90,78,0.45)' : 'rgba(225,200,190,0.5)'; x.fillRect(r0() * 256, r0() * 256, 1 + r0() * 2, 1 + r0() * 2); }
    x.fillStyle = 'rgba(20,8,6,0.8)'; x.fillRect(0, 0, 256, 2); x.fillRect(0, 0, 2, 256);
    const belt = mirrorPeople(new THREE.MeshStandardMaterial({ map: tex(c), roughness: 0.3, metalness: 0.05 }), { sheen: 1.5 });   // (polished: people show in it)
    group.add(P.belt.mesh(belt, 'nj-golden-belt'));
    createBronzeCovers(group, CH + 0.009); }                 // its 37 bronze drain covers (world/njCovers.js)
  group.add(P.paving.mesh(M.sidewalk, 'nj-paving'), P.asphalt.mesh(M.asphalt, 'henan-asphalt'), P.granite.mesh(M.granite, 'nj-granite'));
  const paint = new THREE.MeshStandardMaterial({ color: 0xe8e8e2, roughness: 0.6 }), yellow = new THREE.MeshStandardMaterial({ color: 0xe0b020, roughness: 0.6 });
  group.add(P.paint.mesh(paint, 'henan-paint'), P.yellow.mesh(yellow, 'henan-yellow'));
  const steel = new THREE.MeshStandardMaterial({ color: 0x8a9096, metalness: 0.85, roughness: 0.35 });
  group.add(P.steel.mesh(steel, 'nj-steel'), P.hoard.mesh(new THREE.MeshStandardMaterial({ color: 0x2f6aa8, roughness: 0.7 }), 'nj-hoarding'));
  group.add(P.tile.mesh(new THREE.MeshStandardMaterial({ color: 0x8e8b86, roughness: 0.35 }), 'metro-landing'), walls.mesh(new THREE.MeshStandardMaterial({ color: 0xa9aba9, roughness: 0.45 }), 'metro-walls'));
  if (!P.dark.empty) group.add(P.dark.mesh(new THREE.MeshStandardMaterial({ color: 0x15181c, roughness: 0.15, metalness: 0.6 }), 'metro-panels'));
  group.add(glassB.mesh(glassMat, 'metro-glass'), strips.mesh(new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.6, 1.7) }), 'metro-strips'));
  return {
    group, lights, doors: doorList, fronts, signAtlas: signAt, bladeAtlas: bladeAt, placed: PLACED,
    trees: parkTrees,                                    // for world/trees.js (Century Square, People's Park)
    update(t) { scrTex.offset.y = (Math.floor(t / 6) % 4) * 0.25; },
    // the season's decorations: date = { m, d }
    season(date) { xmas.visible = !!date && ((date.m === 11 && date.d >= 22) || date.m === 12 || (date.m === 1 && date.d <= 3)); },
    // the automatic doors: open for whoever comes up to them (people: [{ x, z }])
    doorsUpdate(dt, people, eye) { fronts.update(dt, people, eye); },
  };
}
