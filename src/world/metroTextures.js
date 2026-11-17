// Canvas textures for the metro (world/metroBuild.js, world/metro.js): the stations' stone, panels and
// ceiling, Shanghai Metro's wayfinding (dark grey signs, white Chinese over English, Line 2's green
// square, yellow exit numbers), the Line 2 strip map, the screen doors' headers, the platform's door
// markings, the ticket machines, the gates' tops, the posters, and the train's livery and its screens.
// All procedural; brand-free posters. Colours: Line 2 green #82BF25 (as world/nanjingRoad.js).
import * as THREE from 'three';
import { makeCanvas, tex, rng, grain, FONT } from './canvas.js';
import { markCanvas } from '../ui/brands.js';

export const L2 = '#82BF25', SIGN = '#2c3034', EXIT_Y = '#ffd400';
// Line 2, west to east (徐泾东 to 浦东国际机场); the two you can walk are East Nanjing Rd and Lujiazui
export const LINE2 = [
  ['徐泾东', 'East Xujing'], ['虹桥火车站', 'Hongqiao Railway Stn'], ['虹桥2号航站楼', 'Hongqiao Airport T2'], ['淞虹路', 'Songhong Rd'], ['北新泾', 'Beixinjing'],
  ['威宁路', 'Weining Rd'], ['娄山关路', 'Loushanguan Rd'], ['中山公园', "Zhongshan Park"], ['江苏路', 'Jiangsu Rd'], ['静安寺', "Jing'an Temple"],
  ['南京西路', 'West Nanjing Rd'], ['人民广场', "People's Square"], ['南京东路', 'East Nanjing Rd'], ['陆家嘴', 'Lujiazui'], ['东昌路', 'Dongchang Rd'],
  ['世纪大道', 'Century Avenue'], ['上海科技馆', 'Science & Tech Museum'], ['世纪公园', 'Century Park'], ['龙阳路', 'Longyang Rd'], ['张江高科', 'Zhangjiang Hi-Tech Park'],
  ['金科路', 'Jinke Rd'], ['广兰路', 'Guanglan Rd'],
];
export const IDX = { enr: 12, ljz: 13 };
export const TERMINUS = { 1: ['广兰路', 'Guanglan Rd'], [-1]: ['徐泾东', 'East Xujing'] };
export const METRO_TEXT = LINE2.flat().join('') + '号线往方向出口站厅站台服务中心售票机安检请主动接受勿携带危险品小心站台间隙先下后上下一站本站到达开左边门门即将关闭请勿靠近车门禁止吸烟饮食扶梯紧握扶手照看好老人小孩乘车码支付宝刷码进站出站余额元东路陆家嘴南京换乘暂停使用卫生间无障碍电梯紧急停止按钮天津路外滩河南中路国金中心世纪大道北侧东方明珠环路通道上海地铁欢迎您 Line Exit To Station Next Doors open left Mind the gap Service Center Tickets Security Please stand on the right 0123456789';

function badge(x, X, Y, s, n = 2) {
  x.fillStyle = L2; x.fillRect(X, Y, s, s);
  x.fillStyle = '#fff'; x.font = `900 ${Math.round(s * 0.74)}px ${FONT.sans}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(n), X + s / 2, Y + s * 0.54);
}
function arrow(x, X, Y, s, dir = 'right', col = '#fff') {
  x.save(); x.translate(X + s / 2, Y + s / 2); x.rotate({ right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2, 'down-right': Math.PI / 4, 'up-right': -Math.PI / 4, 'up-left': -3 * Math.PI / 4 }[dir] || 0);
  x.fillStyle = col; x.beginPath(); const h = s / 2;
  x.moveTo(h * 0.95, 0); x.lineTo(h * 0.05, -h * 0.85); x.lineTo(h * 0.05, -h * 0.32); x.lineTo(-h * 0.9, -h * 0.32); x.lineTo(-h * 0.9, h * 0.32); x.lineTo(h * 0.05, h * 0.32); x.lineTo(h * 0.05, h * 0.85); x.closePath(); x.fill();
  x.restore();
}

// ---- surfaces ----
export function graniteTex(seed = 3, base = [196, 194, 189]) {
  const S = 1024, [c, x] = makeCanvas(S, S), r = rng(seed);
  x.fillStyle = `rgb(${base})`; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 26000; i++) { const v = r(); x.fillStyle = v < 0.5 ? `rgba(70,70,74,${0.12 + r() * 0.2})` : v < 0.8 ? `rgba(255,255,255,${0.1 + r() * 0.2})` : `rgba(120,108,96,${0.15 + r() * 0.2})`; const s = 1 + r() * 3.2; x.fillRect(r() * S, r() * S, s, s); }
  grain(x, S, S, 10, seed);
  // three 0.8 m tiles across (the texture is 2.4 m): slight tone per tile, fine joints
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { x.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${r() * 0.05})`; x.fillRect(i * S / 3, j * S / 3, S / 3, S / 3); }
  x.fillStyle = 'rgba(60,60,60,0.55)'; for (let i = 0; i <= 3; i++) { x.fillRect(i * S / 3 - 1, 0, 2, S); x.fillRect(0, i * S / 3 - 1, S, 2); }
  return tex(c);
}
export function panelTex(seed = 5, col = [232, 232, 228], w = 1.2, h = 2.4) {
  const [c, x] = makeCanvas(512, 1024), r = rng(seed);
  x.fillStyle = `rgb(${col})`; x.fillRect(0, 0, 512, 1024);
  const g = x.createLinearGradient(0, 0, 512, 1024); g.addColorStop(0, 'rgba(255,255,255,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0.06)'); x.fillStyle = g; x.fillRect(0, 0, 512, 1024);
  grain(x, 512, 1024, 4, seed);
  x.fillStyle = 'rgba(40,40,40,0.5)'; x.fillRect(0, 0, 512, 5); x.fillRect(0, 0, 5, 1024); x.fillStyle = 'rgba(255,255,255,0.5)'; x.fillRect(5, 5, 502, 2);
  return tex(c);
}
export function ceilingTex() {
  // linear aluminium slats, a light line every 1.5 m (the texture is 3 m square)
  const [c, x] = makeCanvas(1024, 1024);
  x.fillStyle = '#d9dbdc'; x.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 1024; i += 34) { x.fillStyle = 'rgba(0,0,0,0.13)'; x.fillRect(0, i, 1024, 4); x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(0, i + 4, 1024, 3); }
  return tex(c);
}
export function trackWallTex(seed = 9) {
  const [c, x] = makeCanvas(1024, 512), r = rng(seed);
  x.fillStyle = '#4a4d50'; x.fillRect(0, 0, 1024, 512); grain(x, 1024, 512, 18, seed);
  for (let i = 0; i < 1024; i += 128) { x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(i, 0, 3, 512); }
  for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(0,0,0,${r() * 0.12})`; x.fillRect(r() * 1024, r() * 512, 2 + r() * 40, 60 + r() * 300); }
  return tex(c);
}
export function tunnelTex(seed = 13) {
  // a bored tunnel's segment rings (1.2 m wide), bolt pockets, the cable trays' shadow
  const [c, x] = makeCanvas(512, 1024), r = rng(seed);
  x.fillStyle = '#3c3e40'; x.fillRect(0, 0, 512, 1024); grain(x, 512, 1024, 22, seed);
  for (let i = 0; i < 1024; i += 128) { x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(0, i, 512, 4); for (let k = 0; k < 6; k++) { x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(40 + k * 80, i + 10, 14, 10); } }
  for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(255,255,255,${r() * 0.05})`; x.fillRect(r() * 512, r() * 1024, 80 + r() * 200, 2 + r() * 20); }
  return tex(c);
}

// ---- wayfinding ----
// a hanging sign: items left to right: { badge }, { zh, en }, { arrow: dir }, { exit: n }, { gap }
export function signTex(items, { w = 2048, h = 256, bg = SIGN } = {}) {
  const [c, x] = makeCanvas(w, h);
  x.fillStyle = bg; x.fillRect(0, 0, w, h);
  x.fillStyle = 'rgba(255,255,255,0.06)'; x.fillRect(0, 0, w, 6);
  let X = h * 0.18;
  for (const it of items) {
    if (it.gap) { X += it.gap; continue; }
    if (it.badge) { badge(x, X, h * 0.16, h * 0.68, it.badge); X += h * 0.68 + h * 0.14; continue; }
    if (it.arrow) { arrow(x, X, h * 0.16, h * 0.68, it.arrow, it.col || '#fff'); X += h * 0.68 + h * 0.12; continue; }
    if (it.exit != null) { x.fillStyle = EXIT_Y; x.fillRect(X, h * 0.16, h * 0.68, h * 0.68); x.fillStyle = '#111'; x.font = `900 ${Math.round(h * 0.52)}px ${FONT.sans}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(it.exit), X + h * 0.34, h * 0.52); X += h * 0.68 + h * 0.12; continue; }
    if (it.icon) { x.fillStyle = '#fff'; x.fillRect(X, h * 0.16, h * 0.68, h * 0.68); x.fillStyle = SIGN; x.font = `900 ${Math.round(h * 0.44)}px ${FONT.sans}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(it.icon, X + h * 0.34, h * 0.52); X += h * 0.68 + h * 0.12; continue; }
    if (it.logo) { const l = markCanvas('shanghaimetro', { color: '#EC1C24', bg: '#ffffff', size: 256, pad: 0.12 }); x.drawImage(l, X, h * 0.14, h * 0.72, h * 0.72); X += h * 0.86; continue; }
    x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillStyle = it.col || '#fff';
    x.font = `800 ${Math.round(h * (it.big ? 0.46 : 0.38))}px ${FONT.sans}`; x.fillText(it.zh, X, h * (it.en ? 0.5 : 0.64));
    const wz = x.measureText(it.zh).width;
    let we = 0; if (it.en) { x.font = `500 ${Math.round(h * 0.2)}px ${FONT.sans}`; x.fillStyle = it.col ? it.col : 'rgba(255,255,255,0.85)'; x.fillText(it.en, X + 2, h * 0.82); we = x.measureText(it.en).width; }
    X += Math.max(wz, we) + h * 0.22;
  }
  return tex(c, { repeat: false });
}
// the station's name, as on the track wall behind the screen doors and on the columns
export function nameTex(st, { w = 2048, h = 512, dark = true } = {}) {
  const [c, x] = makeCanvas(w, h);
  x.fillStyle = dark ? '#24272a' : '#f3f3f0'; x.fillRect(0, 0, w, h);
  x.fillStyle = L2; x.fillRect(0, h - 26, w, 26);
  const l = markCanvas('shanghaimetro', { color: '#EC1C24', bg: '#ffffff', size: 256, pad: 0.12 }); x.drawImage(l, 60, h * 0.2, h * 0.5, h * 0.5);
  x.fillStyle = dark ? '#fff' : '#1b1d20'; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
  x.font = `900 ${Math.round(h * 0.42)}px ${FONT.sans}`; x.fillText(st.name.zh, w / 2, h * 0.55);
  x.font = `600 ${Math.round(h * 0.15)}px ${FONT.sans}`; x.fillText(st.name.en, w / 2, h * 0.8);
  badge(x, w - 60 - h * 0.5, h * 0.2, h * 0.5);
  return tex(c, { repeat: false });
}
// Line 2's strip map, this station marked; dir: which way the trains on this side go (for the arrow)
export function lineMapTex(here, dir = 0, { w = 2048, h = 320 } = {}) {
  const [c, x] = makeCanvas(w, h);
  x.fillStyle = '#f4f4f1'; x.fillRect(0, 0, w, h);
  badge(x, 24, 24, 80);
  x.fillStyle = '#222'; x.font = `800 40px ${FONT.sans}`; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText('2号线 Line 2', 124, 64);
  const n = LINE2.length, X0 = 80, X1 = w - 80, Yl = 190, step = (X1 - X0) / (n - 1);
  x.fillStyle = L2; x.fillRect(X0, Yl - 9, X1 - X0, 18);
  if (dir) { x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(dir > 0 ? X0 + here * step : X0, Yl - 9, dir > 0 ? (n - 1 - here) * step : here * step, 18); }
  for (let i = 0; i < n; i++) {
    const X = X0 + i * step, past = dir > 0 ? i < here : dir < 0 ? i > here : false;
    x.fillStyle = i === here ? '#e5262b' : '#fff'; x.strokeStyle = past ? '#aaa' : '#2d5a10'; x.lineWidth = 5;
    x.beginPath(); x.arc(X, Yl, i === here ? 17 : 12, 0, Math.PI * 2); x.fill(); x.stroke();
    x.save(); x.translate(X + 6, Yl - 26); x.rotate(-Math.PI / 4); x.fillStyle = past ? '#9a9a9a' : i === here ? '#e5262b' : '#1d1f22'; x.font = `${i === here ? 900 : 700} 26px ${FONT.sans}`; x.textAlign = 'left'; x.fillText(LINE2[i][0], 0, 0); x.restore();
    x.save(); x.translate(X - 4, Yl + 30); x.rotate(Math.PI / 4); x.fillStyle = past ? '#aaa' : '#555'; x.font = `500 15px ${FONT.sans}`; x.textAlign = 'left'; x.fillText(LINE2[i][1], 0, 0); x.restore();
  }
  return tex(c, { repeat: false });
}
// over the screen doors on one side: the line, which way, the door's number
export function psdHeaderTex(dir, n = 1) {
  const [c, x] = makeCanvas(1024, 128);
  x.fillStyle = '#26292c'; x.fillRect(0, 0, 1024, 128);
  badge(x, 16, 18, 92);
  const [zh, en] = TERMINUS[dir];
  x.fillStyle = '#fff'; x.textAlign = 'left'; x.textBaseline = 'middle'; x.font = `800 52px ${FONT.sans}`; x.fillText(`往 ${zh}`, 130, 50); x.font = `500 26px ${FONT.sans}`; x.fillText(`To ${en}`, 134, 98);
  arrow(x, 600, 26, 76, dir > 0 ? 'right' : 'left');
  if (n != null) { x.fillStyle = EXIT_Y; x.fillRect(880, 18, 120, 92); x.fillStyle = '#111'; x.font = `900 60px ${FONT.sans}`; x.textAlign = 'center'; x.fillText(String(n), 940, 66); }
  else { x.fillStyle = 'rgba(255,255,255,0.75)'; x.font = `600 24px ${FONT.sans}`; x.textAlign = 'right'; x.fillText('小心站台间隙 Mind the gap', 1000, 64); }
  return tex(c, { repeat: false });
}
// on the platform's floor at each door: the two waiting lanes either side, the way out down the middle
export function doorMarkTex() {
  const [c, x] = makeCanvas(512, 512);
  x.clearRect(0, 0, 512, 512);
  x.fillStyle = 'rgba(240,190,20,0.95)';
  for (const X of [36, 404]) { x.fillRect(X, 40, 72, 360); for (let i = 0; i < 3; i++) arrow(x, X + 4, 90 + i * 100, 64, 'up', '#3b3b3b'); }
  x.fillStyle = 'rgba(80,170,70,0.95)'; for (let i = 0; i < 3; i++) arrow(x, 196, 60 + i * 120, 120, 'down');
  x.fillStyle = 'rgba(255,255,255,0.92)'; x.font = `800 44px ${FONT.sans}`; x.textAlign = 'center'; x.fillText('先下后上', 256, 470);
  return tex(c, { repeat: false });
}
export function tactileTex() {
  const [c, x] = makeCanvas(128, 128);
  x.fillStyle = '#e1b318'; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const g = x.createRadialGradient(16 + i * 32, 16 + j * 32, 1, 16 + i * 32, 16 + j * 32, 11); g.addColorStop(0, '#fbe27a'); g.addColorStop(1, '#b88c08'); x.fillStyle = g; x.beginPath(); x.arc(16 + i * 32, 16 + j * 32, 10, 0, 7); x.fill(); }
  return tex(c);
}
// the ticket machines' fronts (five in a row on one texture)
export function tvmTex() {
  const [c, x] = makeCanvas(1024, 512);
  for (let i = 0; i < 4; i++) {
    const X = i * 256; x.fillStyle = '#d4d6d8'; x.fillRect(X, 0, 256, 512); x.fillStyle = '#1e5aa8'; x.fillRect(X, 0, 256, 60);
    x.fillStyle = '#fff'; x.font = `800 30px ${FONT.sans}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('自动售票机', X + 128, 30);
    const g = x.createLinearGradient(0, 90, 0, 260); g.addColorStop(0, '#2e6fc0'); g.addColorStop(1, '#0f2b55'); x.fillStyle = g; x.fillRect(X + 30, 90, 196, 170);
    x.fillStyle = '#fff'; x.font = `700 20px ${FONT.sans}`; x.fillText('请选择目的地', X + 128, 120); x.fillStyle = L2; x.fillRect(X + 50, 150, 156, 12); for (let k = 0; k < 6; k++) { x.fillStyle = '#fff'; x.beginPath(); x.arc(X + 56 + k * 29, 156, 5, 0, 7); x.fill(); }
    x.fillStyle = 'rgba(255,255,255,0.8)'; x.font = `500 15px ${FONT.sans}`; x.fillText('扫码购票 · 现金 · 交通卡', X + 128, 230);
    x.fillStyle = '#25282b'; x.fillRect(X + 60, 300, 136, 40); x.fillRect(X + 90, 380, 76, 24); x.fillStyle = '#4a9'; x.fillRect(X + 200, 310, 20, 20);
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(X, 0, 4, 512);
  }
  return tex(c, { repeat: false });
}
// a gate's top: the QR reader window, the arrow / no-entry indicator are separate (they change)
export function gateTopTex() {
  const [c, x] = makeCanvas(256, 512);
  x.fillStyle = '#b9bdc0'; x.fillRect(0, 0, 256, 512); grain(x, 256, 512, 5, 4);
  x.fillStyle = '#16191c'; x.fillRect(52, 70, 152, 120); x.fillStyle = 'rgba(80,200,255,0.35)'; x.fillRect(62, 80, 132, 100);
  x.fillStyle = '#16191c'; x.fillRect(70, 260, 116, 116); x.strokeStyle = '#ddd'; x.lineWidth = 3; x.strokeRect(80, 270, 96, 96);
  x.fillStyle = '#fff'; x.font = `700 22px ${FONT.sans}`; x.textAlign = 'center'; x.fillText('二维码', 128, 420); x.font = `500 16px ${FONT.sans}`; x.fillText('QR · 交通卡', 128, 446);
  return tex(c, { repeat: false });
}
// posters in the light boxes: generic, brand-free (a phone, coffee, a city break, a bank card, a show)
export function posterTex(i) {
  const [c, x] = makeCanvas(512, 768), r = rng(31 + i * 7);
  const P = [['#0d1b2a', '#e0b84a', '新一代 轻薄旗舰', 'Thin. Light. All day.'], ['#5a3b24', '#f3e3c8', '秋冬 新品拿铁', 'Autumn latte, back again'], ['#1f5f7a', '#ffffff', '周末 去海边', 'A weekend by the sea'], ['#7a1020', '#ffd7a0', '信用卡 境外返现', 'Cashback abroad'], ['#202020', '#ff6a3d', '音乐剧 · 十二月', 'The musical · December'], ['#2f6b3a', '#f2f2e8', '城市 骑行季', 'Ride the city']][i % 6];
  const g = x.createLinearGradient(0, 0, 0, 768); g.addColorStop(0, P[0]); g.addColorStop(1, '#000'); x.fillStyle = g; x.fillRect(0, 0, 512, 768);
  x.globalAlpha = 0.5; for (let k = 0; k < 7; k++) { x.fillStyle = P[1]; x.beginPath(); x.arc(r() * 512, 200 + r() * 360, 30 + r() * 140, 0, 7); x.fill(); } x.globalAlpha = 1;
  x.fillStyle = P[1]; x.font = `900 58px ${FONT.sans}`; x.textAlign = 'center'; x.fillText(P[2], 256, 640); x.font = `500 26px ${FONT.sans}`; x.fillStyle = '#fff'; x.fillText(P[3], 256, 690);
  return tex(c, { repeat: false });
}

// ---- the train ----
// a car's side: white body, the dark window band, Line 2's green stripe under it (the texture is a whole car, 22.8 m)
export function liveryTex() {
  const [c, x] = makeCanvas(2048, 256);
  x.fillStyle = '#eef0f0'; x.fillRect(0, 0, 2048, 256);
  const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, 'rgba(255,255,255,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0.12)'); x.fillStyle = g; x.fillRect(0, 0, 2048, 256);
  x.fillStyle = L2; x.fillRect(0, 168, 2048, 22); x.fillStyle = '#4d7f1a'; x.fillRect(0, 190, 2048, 6);
  x.fillStyle = 'rgba(0,0,0,0.22)'; for (let i = 0; i < 2048; i += 90) x.fillRect(i, 0, 2, 256);
  return tex(c, { repeat: false });
}
// the interchanges along Line 2 (approximate line colours), drawn as small squares by a station's name
export const TRANSFERS = { 1: [10, 17], 2: [10], 7: [3, 4], 8: [11], 9: [7, 14], 10: [12, 13], 11: [1, 8], 12: [10], 13: [14], 15: [4, 6, 9], 18: [7, 16, 18] };
export const LINE_COLORS = { 1: '#e3002b', 3: '#ffd100', 4: '#5f259f', 6: '#d7006f', 7: '#ff6900', 8: '#0094d8', 9: '#87b5e0', 10: '#c6afd4', 11: '#871c2b', 12: '#007a60', 13: '#e999c0', 14: '#827a04', 16: '#77c8c7', 17: '#bc8a6e', 18: '#c4984f' };
// the display over every door inside a car (as on Lines 1, 2 and 10's newer trains): on the left a screen
// (the line, which way, 本站 / 下一站 and the station, which side the doors open); on the right the whole
// line as a lit strip map: the stations passed dimmed, this station (at a platform) red and blinking, the
// next one (between stations) green and blinking, the arrows between running the way the train goes
export function carScreenTex(c, x, { dir, next, here = null, doors = 'left', t = 0 }) {
  const w = c.width, h = c.height, on = Math.floor(t * 2) % 2 === 0;
  x.fillStyle = '#16191d'; x.fillRect(0, 0, w, h);
  // ---- the screen ----
  const SW = Math.round(w * 0.27);
  x.fillStyle = '#05080c'; x.fillRect(10, 10, SW - 20, h - 20);
  x.fillStyle = L2; x.fillRect(10, 10, SW - 20, 8);
  const st = LINE2[next], [tz, te] = TERMINUS[dir];
  x.textBaseline = 'middle'; x.textAlign = 'left';
  badge(x, 28, 34, 44);
  x.fillStyle = '#a9b8c6'; x.font = `600 22px ${FONT.sans}`; x.fillText(`往 ${tz}`, 84, 46); x.font = `500 16px ${FONT.sans}`; x.fillText(`To ${te}`, 84, 70);
  x.fillStyle = here != null ? '#ff6b5e' : '#7fe08a'; x.font = `800 26px ${FONT.sans}`; x.textAlign = 'right';
  x.fillText(here != null ? '本站' : '下一站', SW - 28, 44); x.font = `600 15px ${FONT.sans}`; x.fillText(here != null ? 'This station' : 'Next station', SW - 28, 70);
  x.textAlign = 'center'; x.fillStyle = '#fff'; x.font = `900 ${st[0].length > 4 ? 64 : 78}px ${FONT.sans}`; x.fillText(st[0], SW / 2, 160);
  x.fillStyle = '#d4dde6'; x.font = `600 28px ${FONT.sans}`; x.fillText(st[1], SW / 2, 222);
  x.fillStyle = doors === 'left' ? '#7fd06a' : '#888'; x.font = `700 20px ${FONT.sans}`; x.fillText('◀ 开左边门 Doors open on the left', SW / 2, h - 40);
  // ---- the strip map ----
  const X0 = SW + 50, X1 = w - 40, Yl = 92, n = LINE2.length, step = (X1 - X0) / (n - 1);
  const cur = next, passed = (i) => (dir > 0 ? i < cur : i > cur) || (here == null && i === (cur - dir) && false);
  x.fillStyle = '#0c0e11'; x.fillRect(SW, 10, w - SW - 10, h - 20);
  x.textAlign = 'left'; x.fillStyle = '#9aa6b1'; x.font = `700 20px ${FONT.sans}`; x.fillText('2号线 Line 2', SW + 24, 36);
  // the line itself: passed in grey, ahead in Line 2's green
  for (let i = 0; i < n - 1; i++) {
    const xa = X0 + i * step, gone = dir > 0 ? i + 1 <= cur - (here != null ? 0 : 1) : i >= cur + (here != null ? 0 : 1);
    x.fillStyle = gone ? '#3a3f45' : L2; x.fillRect(xa, Yl - 5, step, 10);
  }
  // the arrows between here and the next station (and on along the line), lit in turn
  for (let i = 0; i < n - 1; i++) {
    const ahead = dir > 0 ? i >= cur - (here != null ? 0 : 1) : i < cur + (here != null ? 0 : 1);
    if (!ahead) continue;
    const xa = X0 + (i + 0.5) * step, lit = (Math.floor(t * 4) + (dir > 0 ? -i : i)) % 3 === 0;
    x.fillStyle = lit ? '#e8ffd0' : 'rgba(255,255,255,0.35)';
    x.beginPath(); x.moveTo(xa + dir * 7, Yl); x.lineTo(xa - dir * 5, Yl - 6); x.lineTo(xa - dir * 5, Yl + 6); x.closePath(); x.fill();
  }
  for (let i = 0; i < n; i++) {
    const X = X0 + i * step, isCur = i === cur, gone = passed(i);
    // the lamp
    let col = gone ? '#4a4f55' : '#f4f6f2', r = 9;
    if (isCur) { r = 13; col = here != null ? (on ? '#ff3b30' : '#6d1612') : (on ? '#4cff6a' : '#1d5a26'); }
    if (isCur) { x.fillStyle = here != null ? 'rgba(255,59,48,0.25)' : 'rgba(76,255,106,0.25)'; x.beginPath(); x.arc(X, Yl, r + 8, 0, 7); x.fill(); }
    x.fillStyle = col; x.beginPath(); x.arc(X, Yl, r, 0, 7); x.fill();
    x.strokeStyle = '#0c0e11'; x.lineWidth = 3; x.stroke();
    // the name, written downwards (as on the real strips), the interchanges above it
    const name = LINE2[i][0];
    x.fillStyle = isCur ? (here != null ? '#ff8a80' : '#9dffad') : gone ? '#5b636b' : '#e9eef2';
    x.font = `${isCur ? 900 : 600} ${isCur ? 22 : 19}px ${FONT.sans}`; x.textAlign = 'center';
    const chars = [...name]; const lh = chars.length > 5 ? 19 : 23;
    chars.forEach((ch, k) => x.fillText(ch, X, Yl + 34 + k * lh));
    (TRANSFERS[i] || []).forEach((ln, k) => { x.fillStyle = LINE_COLORS[ln] || '#999'; x.fillRect(X - 9, Yl - 40 - k * 20, 18, 16); x.fillStyle = '#fff'; x.font = `800 11px ${FONT.sans}`; x.fillText(String(ln), X, Yl - 32 - k * 20); });
  }
}
// the printed map above the windows: the whole line, the interchanges, no lights
export function printedMapTex() {
  const [c, x] = makeCanvas(2048, 300);
  x.fillStyle = '#f4f4ef'; x.fillRect(0, 0, 2048, 300);
  x.fillStyle = L2; x.fillRect(0, 0, 2048, 10);
  badge(x, 20, 26, 56); x.fillStyle = '#222'; x.font = `800 30px ${FONT.sans}`; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText('2号线 Line 2 · 徐泾东 — 广兰路', 92, 54);
  x.fillStyle = '#666'; x.font = `500 18px ${FONT.sans}`; x.textAlign = 'right'; x.fillText('□ 换乘 Interchange', 2020, 54);
  const n = LINE2.length, X0 = 70, X1 = 1980, Yl = 140, step = (X1 - X0) / (n - 1);
  x.fillStyle = L2; x.fillRect(X0, Yl - 7, X1 - X0, 14);
  for (let i = 0; i < n; i++) {
    const X = X0 + i * step; x.fillStyle = '#fff'; x.strokeStyle = '#2d5a10'; x.lineWidth = 4; x.beginPath(); x.arc(X, Yl, 10, 0, 7); x.fill(); x.stroke();
    x.fillStyle = '#1b1d20'; x.font = `700 20px ${FONT.sans}`; x.textAlign = 'center'; [...LINE2[i][0]].forEach((ch, k) => x.fillText(ch, X, Yl + 30 + k * 21));
    (TRANSFERS[i] || []).forEach((ln, k) => { x.fillStyle = LINE_COLORS[ln] || '#999'; x.fillRect(X - 9, Yl - 38 - k * 19, 18, 15); x.fillStyle = '#fff'; x.font = `800 11px ${FONT.sans}`; x.fillText(String(ln), X, Yl - 30 - k * 19); });
  }
  return tex(c, { repeat: false });
}
export function seatTex() {
  const [c, x] = makeCanvas(256, 256);
  x.fillStyle = '#c9ced2'; x.fillRect(0, 0, 256, 256); grain(x, 256, 256, 6, 2);
  for (let i = 0; i < 256; i += 64) { x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(i, 0, 3, 256); x.fillStyle = 'rgba(255,255,255,0.5)'; x.fillRect(i + 3, 0, 2, 256); }
  return tex(c);
}
export function carFloorTex() {
  const [c, x] = makeCanvas(256, 256), r = rng(17);
  x.fillStyle = '#7d8286'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4000; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${r() * 0.12})`; x.fillRect(r() * 256, r() * 256, 2, 2); }
  return tex(c);
}
export function alipayQr(c, x, t = 0) {
  // Alipay's transit code card (a phone on screen): blue header, a QR, the station
  const w = c.width, h = c.height, r = rng(Math.floor(t) + 99);
  x.fillStyle = '#f5f6f8'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#1677ff'; x.fillRect(0, 0, w, 110);
  const l = markCanvas('alipay', { color: '#fff', size: 96, pad: 0.1 }); x.drawImage(l, 18, 8, 92, 92);
  x.fillStyle = '#fff'; x.font = `800 34px ${FONT.sans}`; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText('乘车码 · 上海地铁', 120, 56);
  const S = 300, X = (w - S) / 2, Yq = 150, n = 29, cell = S / n;
  x.fillStyle = '#fff'; x.fillRect(X - 16, Yq - 16, S + 32, S + 32);
  x.fillStyle = '#111';
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const fin = (a, b) => a < 7 && b < 7, inF = fin(i, j) || fin(n - 1 - i, j) || fin(i, n - 1 - j);
    if (inF) { const ii = i < 7 ? i : n - 1 - i, jj = j < 7 ? j : n - 1 - j; if (ii === 0 || ii === 6 || jj === 0 || jj === 6 || (ii >= 2 && ii <= 4 && jj >= 2 && jj <= 4)) x.fillRect(X + i * cell, Yq + j * cell, cell + 0.5, cell + 0.5); continue; }
    if (r() < 0.48) x.fillRect(X + i * cell, Yq + j * cell, cell + 0.5, cell + 0.5);
  }
  x.fillStyle = '#333'; x.font = `500 22px ${FONT.sans}`; x.textAlign = 'center'; x.fillText('对准闸机扫码 · 先乘车后付费', w / 2, Yq + S + 50);
}
export { makeCanvas, tex };
