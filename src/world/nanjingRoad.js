// Nanjing Road East from the Bund to Henan Middle Road: the pedestrian street (paved wall to wall since
// the 2020 extension), its 1920s-30s stone and art-deco blocks and later towers, shopfronts lit to the
// pavement, the vertical neon blade signs Nanjing Road is known for, LED screens, lamp posts; Henan
// Middle Road crossing it (traffic: world/henanTraffic.js); and two entrances to East Nanjing Road
// station (Exits 7 and 2: stairwells with Shanghai Metro's signs, stairs down to a lit landing).
// The shops are generic (invented names in the street's style), not the real tenants; the buildings
// are typical of the street, not surveyed one by one.
import { asLight, glassByDay } from './dayNight.js';
import * as THREE from 'three';
import { L, NJ, METRO, METRO_DEPTH, DUMPLING } from './layout.js';
import { Batch, batchSet, flush } from './geo.js';
import { tiers } from './bund.js';
import { makeCanvas, tex, rng, FONT } from './canvas.js';
import { towerAtlas } from './skyline.js';
import { markCanvas } from '../ui/brands.js';
import { createShopfronts } from './shopfronts.js';
import { createSignAtlas, loadSignFonts } from './shopSigns.js';
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
  for (let x = -40; x > NJ.xWest; x -= 6) if (x > h.x1 + 1 || x < h.x0 - 1) P.granite.floor(x - 0.2, x + 0.2, NJ.z0 + (METRO.some((m) => x > m.x0 && x < m.x1) ? 3.6 : 0), NJ.z1, CH + 0.004);
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
  const signs = new Batch(), letters = new Batch(), blades = new Batch(), boards = new Batch();
  // the signs: each shop's own, drawn into atlases (world/shopSigns.js) once the sign faces have loaded
  const signAt = createSignAtlas(4096, 2048), bladeAt = createSignAtlas(2048, 2048);
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
    const st = spec.style || 'brand', off = 0.34, d = st === 'letters' ? 0 : 0.12, zFace = zf + dir * (off + d + 0.004);
    const uv = signAt.add(spec, w / h);
    if (d) boards.box(cx, y - 0.04, zf + dir * (off + d / 2), w + 0.08, h + 0.08, d);
    quad(st === 'letters' ? letters : signs, dir > 0 ? cx - w / 2 : cx + w / 2, zFace, dir > 0 ? cx + w / 2 : cx - w / 2, zFace, y, y + h, uv);
    if (d) for (const bx of [cx - w * 0.35, cx + w * 0.35]) boards.box(bx, y + h * 0.4, zf + dir * off / 2, 0.06, 0.08, off);   // brackets back to the wall
  };
  // a vertical sign standing out from the façade, both faces
  const bladeSign = (spec, bx, zf, dir, y0, hgt) => {
    const f = bladeAt.add(spec, hgt / 1.1 * 0.9, { blade: true });
    quad(blades, bx, zf + dir * 0.3, bx, zf + dir * 1.4, y0, y0 + hgt, f);
    quad(blades, bx, zf + dir * 1.4, bx, zf + dir * 0.3, y0, y0 + hgt, [f[2], f[1], f[0], f[3]]);
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
    tiers(B, fp, 0, [
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
    if (shop.front !== false) fronts.addFront({ axis: 'x', plane: zf, out: dir }, xa, xb, { y0: CH, doorAt, type: shop.type, room: opts.room || shop.room || null });
    if (opts.signs === false || shop.noSign) return base + up + (top ? 3.6 : 0);
    // the signboard over the shopfront, out in front of the cornice
    const sg = { zh: shop.zh, en: shop.en, since: shop.since, ...shop.sign }, st = sg.style || 'brand';
    const sh = sg.h || (st === 'letters' ? 1.0 : st === 'plaque' ? 1.3 : 1.15), sw = Math.min(w - 1.2, sg.width || (st === 'plaque' ? Math.max(5, [...shop.zh].length * 1.5) : 11), 13);
    signboard(sg, sg.at ?? (xa + xb) / 2, zf, dir, sw, sh, 4.3);
    // a vertical sign standing out from the façade
    if (shop.blade) {
      const bx = shop.blade.at ?? (dir > 0 ? xb - 1.6 : xa + 1.6), y0 = base + 0.8, hgt = Math.min(9, 1.2 * [...(shop.blade.text || shop.zh)].length + 1.2);
      bladeSign({ ...sg, ...shop.blade, blade: shop.blade.text || shop.zh }, bx, zf, dir, y0, hgt);
    }
    return base + up + (top ? 3.6 : 0);
  }
  let seed = 11;
  const doorList = [];
  // the real shops (world/njShops.js), each at its street number on its side of the street
  const PLACED = placedShops();
  const placedAt = (dir, x) => PLACED.find((p) => p.dir === dir && Math.abs(x - p.x1) < 0.01);
  const runs = [[-84, NJ.cross[0].x1], [NJ.cross[0].x0, NJ.cross[1].x1], [NJ.cross[1].x0, h.x1 + 5], [h.x0 - 5, NJ.xWest - 2]];
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
  for (const [ea, eb] of runs) for (const [zf, dir] of [[NJ.z0, 1], [NJ.z1, -1]]) {
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
  // and further along Henan Road: the street's walls, seen in perspective (simple massing, lit windows)
  const far = new Batch(), fr = rng(77);
  for (const [x0, x1] of [[h.x1 + 5, h.x1 + 30], [h.x0 - 30, h.x0 - 5]]) for (const sgn of [-1, 1]) {
    let z = sgn < 0 ? NJ.z0 - 34 : NJ.z1 + 34;
    while (Math.abs(z - NJ.zc) < HL) {
      const d = 20 + fr() * 25, hh = 18 + fr() * fr() * 60, g = new THREE.BoxGeometry(x1 - x0, hh, d), uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * d) / 3 / 64 + fr(), (uv.getY(i) * hh) / 4 / 64);
      g.translate((x0 + x1) / 2, hh / 2, z + sgn * d / 2); far.push(g); z += sgn * (d + 0.3);
    }
  }
  const farMat = glassByDay(new THREE.MeshBasicMaterial({ map: towerAtlas(31, 0.75) }), [0.44, 0.45, 0.47]); farMat.color.setScalar(0.85);
  group.add(far.mesh(farMat, 'henan-walls'));
  // ---- the west end and the cross streets: closed off (roadworks hoardings) ----
  const hoard = (x0, x1, z0, z1) => { P.hoard.box((x0 + x1) / 2, 0, (z0 + z1) / 2, Math.max(0.12, x1 - x0), 2.5, Math.max(0.12, z1 - z0)); };
  hoard(NJ.xWest - 0.6, NJ.xWest - 0.48, NJ.z0, NJ.z1);
  for (const c of NJ.cross) { hoard(c.x0, c.x1, NJ.z0 - 8.6, NJ.z0 - 8.48); hoard(c.x0, c.x1, NJ.z1 + 8.48, NJ.z1 + 8.6); P.paving.box((c.x0 + c.x1) / 2, -0.3, NJ.z0 - 4.3, c.x1 - c.x0, 0.3 + CH, 8.6, { tile: 2.4 }); P.paving.box((c.x0 + c.x1) / 2, -0.3, NJ.z1 + 4.3, c.x1 - c.x0, 0.3 + CH, 8.6, { tile: 2.4 }); }
  for (const z of [NJ.z0 - h.walkTo - 0.5, NJ.z1 + h.walkTo + 0.5]) { hoard(h.x1, h.x1 + 5, z - 0.06, z + 0.06); hoard(h.x0 - 5, h.x0, z - 0.06, z + 0.06); }
  // ---- lamp posts down both sides ----
  const lampGlass = new Batch();
  for (let x = -46; x > NJ.xWest + 4; x -= 24) {
    if (x < h.x1 + 3 && x > h.x0 - 3) continue;
    for (const z of [NJ.z0 + 4.2, NJ.z1 - 1.4]) {
      if (METRO.some((m) => x > m.x0 - 1.5 && x < m.x1 + 1.5 && z < m.z1 + 1.5)) continue;
      P.steel.cyl(x, CH, z, 0.07, 0.11, 6.2, 8); P.steel.box(x, 6.1, z, 1.8, 0.08, 0.08);
      for (const dx of [-0.85, 0, 0.85]) lampGlass.add(new THREE.SphereGeometry(0.2, 12, 8), { x: x + dx, y: dx ? 5.85 : 6.55, z });
      lights.push({ x, y: 6, z, color: new THREE.Color(1.0, 0.88, 0.72), intensity: 9, distance: 18, out: true });
    }
  }
  const glow = asLight(new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 1.7, 1.4) }), 'lamps', 0.45);
  group.add(lampGlass.mesh(glow, 'nj-lamps'));
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
    P.dark.box(endX, CH, zc, 0.14, 3.0, wz + 0.24);                                                   // above the street: a dark glass panel
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
    const sb = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.2, 0.8), new THREE.MeshStandardMaterial({ color: 0x1c1f24, roughness: 0.5 })); sb.position.set((m.x0 + m.x1) / 2, 3.55, m.z1 + 0.0); group.add(sb);
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
  const signMat = new THREE.MeshBasicMaterial({ map: signAt.texture }); signMat.color.setScalar(1.35); asLight(signMat, 'signs', 0.62);
  const letterMat = new THREE.MeshBasicMaterial({ map: signAt.texture, alphaTest: 0.5 }); letterMat.color.setScalar(1.5); asLight(letterMat, 'signs', 0.7);
  const bladeMat = new THREE.MeshBasicMaterial({ map: bladeAt.texture, side: THREE.DoubleSide }); bladeMat.color.setScalar(1.5); asLight(bladeMat, 'signs', 0.6);
  const boardMat = new THREE.MeshStandardMaterial({ color: 0x1b1916, metalness: 0.6, roughness: 0.4 });
  group.add(fronts.build());
  group.add(signs.mesh(signMat, 'nj-signs'), blades.mesh(bladeMat, 'nj-blades'), boards.mesh(boardMat, 'nj-sign-boards'));
  if (letters.list.length) group.add(letters.mesh(letterMat, 'nj-sign-letters'));
  group.add(P.paving.mesh(M.sidewalk, 'nj-paving'), P.asphalt.mesh(M.asphalt, 'henan-asphalt'), P.granite.mesh(M.granite, 'nj-granite'));
  const paint = new THREE.MeshStandardMaterial({ color: 0xe8e8e2, roughness: 0.6 }), yellow = new THREE.MeshStandardMaterial({ color: 0xe0b020, roughness: 0.6 });
  group.add(P.paint.mesh(paint, 'henan-paint'), P.yellow.mesh(yellow, 'henan-yellow'));
  const steel = new THREE.MeshStandardMaterial({ color: 0x8a9096, metalness: 0.85, roughness: 0.35 });
  group.add(P.steel.mesh(steel, 'nj-steel'), P.hoard.mesh(new THREE.MeshStandardMaterial({ color: 0x2f6aa8, roughness: 0.7 }), 'nj-hoarding'));
  group.add(P.tile.mesh(new THREE.MeshStandardMaterial({ color: 0x8e8b86, roughness: 0.35 }), 'metro-landing'), walls.mesh(new THREE.MeshStandardMaterial({ color: 0xa9aba9, roughness: 0.45 }), 'metro-walls'));
  group.add(P.dark.mesh(new THREE.MeshStandardMaterial({ color: 0x15181c, roughness: 0.15, metalness: 0.6 }), 'metro-panels'));
  group.add(glassB.mesh(glassMat, 'metro-glass'), strips.mesh(new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.6, 1.7) }), 'metro-strips'));
  return {
    group, lights, doors: doorList, fronts,
    update(t) { scrTex.offset.y = (Math.floor(t / 6) % 4) * 0.25; },
    // the automatic doors: open for whoever comes up to them (people: [{ x, z }])
    doorsUpdate(dt, people, eye) { fronts.update(dt, people, eye); },
  };
}
