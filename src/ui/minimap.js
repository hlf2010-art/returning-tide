// Minimap: a small heading-up disc, bottom left. Drawn from layout.js (the same data the colliders
// use), so it can't disagree with the world. Static ground is painted once into an offscreen
// canvas; each frame only rotates it under the player and adds the live marks (you, the objective,
// people nearby). Shown and hidden by engine/minimapLogic.js; CSS does the fade.
import { S, tr, onLang } from './i18n.js';
import { L, colliders, crossing, planterIslands, streetTrees, stall, npcs as npcLayout } from '../world/layout.js';

const PPM = 2.4;                                   // pixels per metre in the offscreen map
const X0 = -170, X1 = 60, Z0 = -75, Z1 = 110;      // world bounds painted
const SIZE = 168, R = SIZE / 2, VIEW = 0.62;       // display px; metres shown ~ R / (PPM * VIEW)
const C = {
  water: '#0c1c2c', deck: '#272c34', road: '#15181d', pave: '#30343c', block: '#454a55', blockEdge: '#5b616d',
  zebra: 'rgba(230,226,215,0.55)', tree: 'rgba(120,150,96,0.75)', text: 'rgba(236,230,216,0.78)',
};

function paint() {
  const W = Math.round((X1 - X0) * PPM), H = Math.round((Z1 - Z0) * PPM);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const px = (x) => (x - X0) * PPM, pz = (z) => (z - Z0) * PPM;
  const rect = (x0, x1, z0, z1, fill) => { g.fillStyle = fill; g.fillRect(px(x0), pz(z0), (x1 - x0) * PPM, (z1 - z0) * PPM); };
  rect(X0, X1, Z0, Z1, C.pave);
  rect(L.deckEdgeX, X1, Z0, Z1, C.water);
  rect(L.wallX, L.deckEdgeX, Z0, Z1, C.deck);
  rect(L.westCurbX, L.eastCurbX, Z0, Z1, C.road);                                   // Zhongshan East 1st Road
  rect(X0, L.westCurbX, -L.street.roadHalfW, L.street.roadHalfW, C.road);           // Hankou Road
  for (const b of colliders) {
    if (!/customs|hsbc|north-block|portico/.test(b.tag)) continue;
    rect(Math.max(X0, b.minX), Math.min(X1, b.maxX), Math.max(Z0, b.minZ), Math.min(Z1, b.maxZ), C.block);
    g.strokeStyle = C.blockEdge; g.lineWidth = 1;
    g.strokeRect(px(Math.max(X0, b.minX)), pz(Math.max(Z0, b.minZ)), (Math.min(X1, b.maxX) - Math.max(X0, b.minX)) * PPM, (Math.min(Z1, b.maxZ) - Math.max(Z0, b.minZ)) * PPM);
  }
  const cw = crossing.crosswalk;
  if (cw) { g.fillStyle = C.zebra; for (let x = cw.x0; x < cw.x1; x += 1.1) g.fillRect(px(x), pz(cw.z0), 0.55 * PPM, (cw.z1 - cw.z0) * PPM); }
  for (const p of planterIslands) rect(p.x0, p.x1, p.z0, p.z1, '#2f3a2f');
  g.fillStyle = C.tree;
  for (const t of [...streetTrees, ...planterIslands.map((p) => ({ x: (p.x0 + p.x1) / 2, z: (p.z0 + p.z1) / 2 }))]) { g.beginPath(); g.arc(px(t.x), pz(t.z), 2.2 * PPM, 0, Math.PI * 2); g.fill(); }
  return { c, px, pz };
}

export function createMinimap(el) {
  const canvas = document.createElement('canvas'), dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = canvas.height = SIZE * dpr; canvas.style.width = canvas.style.height = `${SIZE}px`;
  el.appendChild(canvas);
  const label = document.createElement('div'); label.className = 'mm-area'; el.appendChild(label);
  const g = canvas.getContext('2d');
  let base = null, lastArea = '';
  onLang(() => { lastArea = ''; });

  // state: { x, z, yaw, objective: {x, z, label}|null, people: [{x, z}], area }
  function draw(s) {
    if (!base) base = paint();
    const k = PPM * VIEW;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, SIZE, SIZE);
    g.save();
    g.beginPath(); g.arc(R, R, R - 1, 0, Math.PI * 2); g.clip();
    // heading-up: rotate the world by the player's yaw about the centre. The view looks along
    // (-sin yaw, -cos yaw) in x/z; on the map +z is down, so "forward" must end up pointing up.
    g.translate(R, R); g.rotate(s.yaw); g.scale(VIEW, VIEW);
    g.drawImage(base.c, -base.px(s.x), -base.pz(s.z));
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // live marks, placed by the same transform
    const toScreen = (x, z) => {
      const dx = (x - s.x) * k, dz = (z - s.z) * k, c = Math.cos(s.yaw), sn = Math.sin(s.yaw);
      return [R + dx * c - dz * sn, R + dx * sn + dz * c];
    };
    g.fillStyle = 'rgba(236,230,216,0.55)';
    for (const p of s.people || []) { const [a, b] = toScreen(p.x, p.z); if (Math.hypot(a - R, b - R) < R - 4) { g.beginPath(); g.arc(a, b, 1.8, 0, Math.PI * 2); g.fill(); } }
    g.restore();
    // places (blips): a small disc with a glyph, inside the rim only
    for (const p of s.blips || []) {
      const [a, b] = toScreen(p.x, p.z); if (Math.hypot(a - R, b - R) > R - 8) continue;
      g.fillStyle = p.bg; g.beginPath(); g.arc(a, b, 6.5, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1; g.stroke();
      g.fillStyle = p.fg; g.font = '700 8px "Noto Sans SC", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(p.glyph, a, b + 0.5); g.textBaseline = 'alphabetic';
    }
    // objective: on the map if within range, else pinned to the rim pointing the way
    if (s.objective) {
      let [a, b] = toScreen(s.objective.x, s.objective.z);
      const d = Math.hypot(a - R, b - R), edge = R - 9, pinned = d > edge;
      if (pinned) { a = R + (a - R) / d * edge; b = R + (b - R) / d * edge; }
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 380);
      g.strokeStyle = `rgba(231,185,106,${0.35 + 0.4 * pulse})`; g.lineWidth = 1.5;
      g.beginPath(); g.arc(a, b, 6 + 2 * pulse, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#e7b96a'; g.beginPath(); g.arc(a, b, 3.2, 0, Math.PI * 2); g.fill();
      const metres = Math.round(Math.hypot(s.objective.x - s.x, s.objective.z - s.z));
      if (pinned) { g.fillStyle = C.text; g.font = '600 10px "Noto Sans SC", sans-serif'; g.textAlign = 'center'; g.fillText(`${metres} m`, a, b + (b > R ? -10 : 17)); }
    }
    // you: a small arrow, always pointing up
    g.fillStyle = '#f3ead8'; g.beginPath(); g.moveTo(R, R - 7); g.lineTo(R + 5, R + 5); g.lineTo(R, R + 2.5); g.lineTo(R - 5, R + 5); g.closePath(); g.fill();
    // north on the rim
    // north is -z; rotated by yaw like everything else it lands at (sin yaw, -cos yaw) from the centre
    const nxp = R + Math.sin(s.yaw) * (R - 10), nyp = R - Math.cos(s.yaw) * (R - 10);
    g.fillStyle = 'rgba(231,185,106,0.9)'; g.font = '700 10px "Noto Sans SC", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('N', nxp, nyp); g.textBaseline = 'alphabetic';
    if (s.area !== lastArea) { lastArea = s.area; label.textContent = S.areas[s.area] ? tr(S.areas[s.area]) : ''; }
  }
  return {
    draw,
    setShown(on) { el.classList.toggle('on', !!on); },
    poi: { stall, lin: npcLayout.list[0] },
  };
}
