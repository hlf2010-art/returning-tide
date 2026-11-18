// The map (M): the whole walkable city on one screen, north up. The same ground the minimap paints
// (ui/minimap.js, from layout.js), wider: the Bund and its promenade, Nanjing Road out to Henan Road,
// the river, the Pudong bank. Places, your quest's next step, you. Wheel or +/- zooms, drag or the
// arrows pan, C centres on you; click a place (or anywhere) to set a waypoint (it shows on the
// minimap until you get there), click it again to clear it. M or Esc closes.
import { paint, mapExtras } from './minimap.js';
import { getLang } from './i18n.js';
import { LINE_PTS } from '../engine/metroLine.js';
import { STATIONS, PLAT } from '../world/metroLayout.js';

// Metro Line 2 (Shanghai's light green), underground: its route between the two stations you can ride,
// and each station's roundel and name (the exits are the red numbered places)
const LINE2 = '#8cc63f';
const LINE_PATH = LINE_PTS.filter((_, i) => i % 8 === 0);
const STOPS = STATIONS.map((S) => { const [x, z] = S.F.toW(PLAT.ac, 0); return { x, z, name: S.name }; });
export const metroStops = () => STOPS;

const T = (zh, en) => (getLang() === 'zh' ? zh : en);
const B = { X0: -570, X1: 1340, Z0: -310, Z1: 500 }, P = 2;     // painted bounds (metres), pixels per metre
const LABELS = [
  { x: 14, z: -80, zh: '外滩 · 滨江步道', en: 'The Bund promenade', rot: -Math.PI / 2, size: 13 },
  { x: -16, z: 60, zh: '中山东一路', en: 'Zhongshan Rd E-1', rot: -Math.PI / 2, size: 11 },
  { x: -300, z: -195, zh: '南京东路步行街', en: 'Nanjing Rd East (pedestrian)', rot: 0, size: 12 },
  { x: -505, z: -120, zh: '河南中路', en: 'Henan Rd M', rot: -Math.PI / 2, size: 11 },
  { x: -95, z: 6, zh: '汉口路', en: 'Hankou Rd', rot: 0, size: 11 },
  { x: 250, z: -150, zh: '黄 浦 江', en: 'H U A N G P U   R I V E R', rot: -Math.PI / 2, size: 15, water: true },
  { x: 735, z: 60, zh: '陆家嘴', en: 'Lujiazui', rot: 0, size: 13 },
  { x: 640, z: -86, zh: '东方明珠', en: 'Oriental Pearl', rot: 0, size: 11 },
  { x: 968, z: 232, zh: '世纪大道', en: 'Century Avenue', rot: 0.43, size: 11 },
  { x: 1176, z: 146, zh: '陆家嘴中心绿地', en: 'Central Green', rot: 0, size: 12 },
  { x: 830, z: 322, zh: '国金中心', en: 'IFC', rot: 0, size: 11 },
  { x: 1240, z: 492, zh: '金茂大厦', en: 'Jin Mao', rot: 0, size: 10 }, { x: 1212, z: 670, zh: '上海中心', en: 'Shanghai Tower', rot: 0, size: 10 }, { x: 1300, z: 548, zh: '环球金融中心', en: 'SWFC', rot: 0, size: 10 },
];

export function createWorldMap({ getState, onClose, onWaypoint }) {
  const root = document.createElement('div'); root.id = 'worldmap'; root.className = 'hidden';
  root.innerHTML = `<canvas></canvas><div class="wm-head"><b></b><span></span></div><div class="wm-legend"></div><div class="wm-foot"></div>`;
  document.body.appendChild(root);
  const cv = root.querySelector('canvas'), g = cv.getContext('2d');
  let ground = null, raf = 0, drag = null;
  const V = { cx: 0, cz: 0, s: 2.2 };                       // centre (world) and screen px per metre
  const dpr = () => Math.min(2, window.devicePixelRatio || 1);
  function size() { const r = dpr(); cv.width = innerWidth * r; cv.height = innerHeight * r; cv.style.width = `${innerWidth}px`; cv.style.height = `${innerHeight}px`; }
  const toScreen = (x, z) => [innerWidth / 2 + (x - V.cx) * V.s, innerHeight / 2 + (z - V.cz) * V.s];
  const toWorld = (sx, sy) => [V.cx + (sx - innerWidth / 2) / V.s, V.cz + (sy - innerHeight / 2) / V.s];
  function paintGround() {
    const base = paint(B, P), c = base.c, x = c.getContext('2d');
    // the Pudong bank across the water
    if (mapExtras.length) return base;                        // (Lujiazui paints its own ground: world/lujiazui.js)
    x.fillStyle = '#132328'; x.fillRect(base.px(470), 0, c.width - base.px(470), c.height);
    x.fillStyle = '#1d343b'; for (const [tx, tz, w, d] of [[640, -42, 30, 30], [700, 40, 40, 40], [520, -120, 36, 40], [540, 70, 30, 60]]) if (tx - w / 2 < B.X1) x.fillRect(base.px(tx - w / 2), base.pz(tz - d / 2), w * P, d * P);
    return base;
  }
  function draw() {
    const s = getState(), r = dpr();
    g.setTransform(r, 0, 0, r, 0, 0); g.fillStyle = '#070b0f'; g.fillRect(0, 0, innerWidth, innerHeight);
    if (!ground) ground = paintGround();
    const [ox, oy] = toScreen(B.X0, B.Z0), k = V.s / P;
    g.imageSmoothingEnabled = true; g.drawImage(ground.c, ox, oy, ground.c.width * k, ground.c.height * k);
    // Line 2 under the streets and the river, the two stations on it
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    const line = (w, col, dash) => { g.strokeStyle = col; g.lineWidth = w; g.setLineDash(dash); g.beginPath(); LINE_PATH.forEach(([x, z], i) => { const [a, b] = toScreen(x, z); if (i) g.lineTo(a, b); else g.moveTo(a, b); }); g.stroke(); };
    line(7, 'rgba(7,11,15,0.75)', []); line(4, LINE2, [10, 6]);
    g.setLineDash([]);
    for (const st of STOPS) {
      const [a, b] = toScreen(st.x, st.z);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(a, b, 13, 0, Math.PI * 2); g.fill();
      g.strokeStyle = LINE2; g.lineWidth = 4; g.beginPath(); g.arc(a, b, 11, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#1b1b1b'; g.font = '800 12px "Noto Sans SC", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('2', a, b + 0.5);
      g.font = '600 13px "Noto Sans SC", sans-serif'; g.textAlign = 'left'; g.lineWidth = 3; g.strokeStyle = 'rgba(7,11,15,0.85)';
      const label = T(`${st.name.zh}站 · 地铁2号线`, `${st.name.en} · Metro Line 2`);
      g.strokeText(label, a + 18, b - 14); g.fillStyle = '#e9f5d8'; g.fillText(label, a + 18, b - 14);
    }
    g.restore();
    // names
    for (const l of LABELS) {
      const [a, b] = toScreen(l.x, l.z); g.save(); g.translate(a, b); if (l.rot && V.s < 4) g.rotate(l.rot);
      g.font = `600 ${Math.round(l.size * Math.min(1.4, Math.max(0.8, V.s / 2.2)))}px "Noto Sans SC", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = l.water ? 'rgba(140,175,210,0.5)' : 'rgba(236,230,216,0.72)'; g.fillText(T(l.zh, l.en), 0, 0); g.restore();
    }
    // places
    const R = 10;
    for (const p of s.blips || []) {
      const [a, b] = toScreen(p.x, p.z);
      g.fillStyle = p.bg; g.beginPath(); g.arc(a, b, R, 0, Math.PI * 2); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 1.2; g.stroke();
      g.fillStyle = p.fg; g.font = '700 11px "Noto Sans SC", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(p.glyph, a, b + 0.5);
      if (p.name && V.s > 1.6) { g.font = '500 11px "Noto Sans SC", sans-serif'; g.fillStyle = 'rgba(236,230,216,0.85)'; g.textAlign = 'left'; g.fillText(T(p.name.zh, p.name.en), a + R + 4, b); }
    }
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 380);
    const mark = (o, col, label) => { const [a, b] = toScreen(o.x, o.z); g.strokeStyle = col.replace('A', String(0.35 + 0.45 * pulse)); g.lineWidth = 2; g.beginPath(); g.arc(a, b, 9 + 3 * pulse, 0, Math.PI * 2); g.stroke(); g.fillStyle = col.replace('A', '1'); g.beginPath(); g.arc(a, b, 4.5, 0, Math.PI * 2); g.fill(); if (label) { g.font = '600 12px "Noto Sans SC", sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(label, a + 14, b - 12); } };
    if (s.objective) mark(s.objective, 'rgba(231,185,106,A)', s.objective.label || T('目标', 'Objective'));
    if (s.waypoint) mark(s.waypoint, 'rgba(120,200,255,A)', T(`路标 · ${Math.round(Math.hypot(s.waypoint.x - s.x, s.waypoint.z - s.z))} 米`, `Waypoint · ${Math.round(Math.hypot(s.waypoint.x - s.x, s.waypoint.z - s.z))} m`));
    // you: an arrow along your view (north up: the view direction is (-sin yaw, -cos yaw))
    { const [a, b] = toScreen(s.x, s.z), dx = -Math.sin(s.yaw), dz = -Math.cos(s.yaw), ang = Math.atan2(dz, dx) + Math.PI / 2;
      g.save(); g.translate(a, b); g.rotate(ang); g.fillStyle = '#f3ead8'; g.strokeStyle = '#111'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(0, -11); g.lineTo(8, 8); g.lineTo(0, 4); g.lineTo(-8, 8); g.closePath(); g.stroke(); g.fill(); g.restore(); }
    // north and the scale
    g.fillStyle = 'rgba(231,185,106,0.9)'; g.font = '700 14px "Noto Sans SC", sans-serif'; g.textAlign = 'center'; g.fillText('N ↑', innerWidth - 40, 70);
    const m = V.s > 4 ? 25 : V.s > 1.5 ? 100 : 250; g.fillStyle = 'rgba(236,230,216,0.8)'; g.fillRect(28, innerHeight - 48, m * V.s, 3); g.font = '500 11px "Noto Sans SC", sans-serif'; g.textAlign = 'left'; g.fillText(`${m} m`, 28, innerHeight - 56);
    raf = requestAnimationFrame(draw);
  }
  function legend() {
    const s = getState();
    root.querySelector('.wm-head b').textContent = T('地图', 'Map');
    root.querySelector('.wm-head span').textContent = s.clock || '';
    root.querySelector('.wm-legend').innerHTML = (s.blips || []).filter((p) => p.name).map((p, i) => `<button data-i="${i}"><i style="background:${p.bg};color:${p.fg}">${p.glyph}</i>${T(p.name.zh, p.name.en)}</button>`).join('')
      + (s.waypoint ? `<button data-clear="1" class="clr">${T('清除路标', 'Clear the waypoint')}</button>` : '');
    root.querySelector('.wm-foot').textContent = T('滚轮 / + - 缩放 · 拖动 / 方向键 平移 · C 回到自己 · 点地点设路标 · M 或 Esc 关闭', 'Wheel / + - zoom · drag / arrows pan · C: centre on you · click a place: waypoint · M or Esc: close');
  }
  root.querySelector('.wm-legend').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.clear) { onWaypoint(null); legend(); return; }
    const p = (getState().blips || [])[+b.dataset.i]; if (p) { onWaypoint({ x: p.x, z: p.z, label: p.name }); V.cx = p.x; V.cz = p.z; legend(); }
  });
  cv.addEventListener('wheel', (e) => { e.preventDefault(); const [wx, wz] = toWorld(e.clientX, e.clientY); V.s = Math.max(0.6, Math.min(9, V.s * (e.deltaY < 0 ? 1.18 : 1 / 1.18))); const [nx, nz] = toWorld(e.clientX, e.clientY); V.cx += wx - nx; V.cz += wz - nz; }, { passive: false });
  cv.addEventListener('mousedown', (e) => { drag = { x: e.clientX, y: e.clientY, cx: V.cx, cz: V.cz, moved: false }; });
  window.addEventListener('mousemove', (e) => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.hypot(dx, dy) > 4) drag.moved = true; V.cx = drag.cx - dx / V.s; V.cz = drag.cz - dy / V.s; });
  window.addEventListener('mouseup', (e) => {
    if (!drag) return; const d = drag; drag = null; if (d.moved || root.classList.contains('hidden')) return;
    const s = getState(), [wx, wz] = toWorld(e.clientX, e.clientY);
    if (s.waypoint && Math.hypot(...toScreen(s.waypoint.x, s.waypoint.z).map((v, i) => v - [e.clientX, e.clientY][i])) < 14) { onWaypoint(null); legend(); return; }
    const hit = (s.blips || []).find((p) => { const [a, b] = toScreen(p.x, p.z); return Math.hypot(a - e.clientX, b - e.clientY) < 13; });
    onWaypoint(hit ? { x: hit.x, z: hit.z, label: hit.name } : { x: wx, z: wz }); legend();
  });
  window.addEventListener('resize', () => { if (!root.classList.contains('hidden')) size(); });
  const api = {
    get isOpen() { return !root.classList.contains('hidden'); },
    open() { const s = getState(); V.cx = s.x; V.cz = s.z; V.s = 2.2; size(); legend(); root.classList.remove('hidden'); cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); },
    close() { if (!api.isOpen) return; root.classList.add('hidden'); cancelAnimationFrame(raf); onClose && onClose(); },
    key(code) {
      const step = 60 / V.s;
      if (code === 'ArrowLeft' || code === 'KeyA') V.cx -= step; else if (code === 'ArrowRight' || code === 'KeyD') V.cx += step;
      else if (code === 'ArrowUp' || code === 'KeyW') V.cz -= step; else if (code === 'ArrowDown' || code === 'KeyS') V.cz += step;
      else if (code === 'Equal' || code === 'NumpadAdd') V.s = Math.min(9, V.s * 1.25); else if (code === 'Minus' || code === 'NumpadSubtract') V.s = Math.max(0.6, V.s / 1.25);
      else if (code === 'KeyC') { const s = getState(); V.cx = s.x; V.cz = s.z; }
      else return false;
      return true;
    },
    view: V,
  };
  return api;
}
