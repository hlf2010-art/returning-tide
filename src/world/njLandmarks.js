// Nanjing Road's great department stores (四大公司) as they stand: their corner towers, built stage by stage
// on top of the street builder's blocks (world/nanjingRoad.js). Each tower is a stack of stages, from the
// bottom: a square or octagonal shaft, a ring of columns round a core, a drum, a dome, a lantern, a
// spire, a flagpole. Materials are the street's batches (stone, copper, bronze, roof...), floodlit at
// night like the rest of the façades. What each building is: docs/nanjing-road-landmarks.md.
import * as THREE from 'three';
import { makeCanvas, tex, FONT } from './canvas.js';
import { asLight } from './dayNight.js';

const oct = (r, h) => new THREE.CylinderGeometry(r, r, h, 8, 1).rotateY(Math.PI / 8);
// stages: [{ kind, w (across), h, mat, cols, flood, cap (a cornice slab on top: { out, h }) }]
//   box | oct | cyl      a shaft
//   colonnade            columns round a core (core: its width as a fraction), an entablature on top
//   dome                 half a sphere, squashed or stretched to h
//   cone                 a spire (8 sides)
//   pole                 a flagpole
export function tower(B, { x, z, y0 = 0, stages, flood = 0.9 }) {
  let y = y0;
  for (const s of stages) {
    const m = B[s.mat || 'stone'], w = s.w, h = s.h, f = { flood: s.flood ?? flood };
    if (s.kind === 'box') m.box(x, y, z, w, h, s.d || w, f);
    else if (s.kind === 'oct') m.add(oct(w / 2 / Math.cos(Math.PI / 8), h), { x, y: y + h / 2, z, ...f });
    else if (s.kind === 'cyl') m.add(new THREE.CylinderGeometry(w / 2, (s.w0 || w) / 2, h, 20, 1), { x, y: y + h / 2, z, ...f });
    else if (s.kind === 'colonnade') {
      const n = s.cols || 8, r = w / 2 - 0.25, core = B[s.coreMat || 'glassDark'];
      core.add(s.round ? new THREE.CylinderGeometry(w * (s.core || 0.55) / 2, w * (s.core || 0.55) / 2, h, 16, 1) : oct(w * (s.core || 0.55) / 2, h), { x, y: y + h / 2, z, ...f });
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + (s.phase || Math.PI / n);
        m.add(new THREE.CylinderGeometry(s.r || 0.2, (s.r || 0.2) * 1.12, h - 0.3, 10, 1), { x: x + Math.cos(a) * r, y: y + 0.15 + (h - 0.3) / 2, z: z + Math.sin(a) * r, ...f });
      }
      m.add(s.round ? new THREE.CylinderGeometry(w / 2 + 0.1, w / 2 + 0.1, 0.3, 20, 1) : oct(w / 2 / Math.cos(Math.PI / 8) + 0.1, 0.3), { x, y: y + h - 0.15, z, ...f });   // the entablature
      m.add(s.round ? new THREE.CylinderGeometry(w / 2, w / 2, 0.15, 20, 1) : oct(w / 2 / Math.cos(Math.PI / 8), 0.15), { x, y: y + 0.075, z, ...f });               // the base
    } else if (s.kind === 'dome') m.add(new THREE.SphereGeometry(w / 2, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), { x, y, z, sy: h / (w / 2), ...f });
    else if (s.kind === 'cone') m.add(new THREE.ConeGeometry(w / 2, h, s.sides || 8, 1), { x, y: y + h / 2, z, ...f });
    else if (s.kind === 'pole') m.add(new THREE.CylinderGeometry(0.04, 0.06, h, 6, 1), { x, y: y + h / 2, z, ...f });
    if (s.cap) { const c = s.cap; m.box(x, y + h - c.h, z, w + 2 * c.out, c.h, (s.d || w) + 2 * c.out, f); }
    y += h;
  }
  return y;
}

// ---- the four great companies, and New Wing On ----
// Each builder gets the street builder's batches and the frontage (xa..xb along the street, the façade at zf,
// facing dir: 1 south (the north side of the street), -1 north), builds the whole building, and returns its
// height. ctx: { B (façade batches), tiers, steel (railings), globes (lamps that light up), group (for the
// odd textured piece), seed }. Sources: docs/nanjing-road-landmarks.md.
// a clock face: black dial, Roman numerals in white, gilt hands at ten past ten
function clockTexture() {
  const [c, x] = makeCanvas(256, 256);
  x.fillStyle = '#f2efe6'; x.fillRect(0, 0, 256, 256);
  x.beginPath(); x.arc(128, 128, 112, 0, Math.PI * 2); x.fillStyle = '#111214'; x.fill();
  x.lineWidth = 6; x.strokeStyle = '#c9a24a'; x.stroke();
  x.fillStyle = '#f2efe6'; x.font = `600 26px ${FONT.serif}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].forEach((n, i) => { const a = (i / 12) * Math.PI * 2 - Math.PI / 2; x.fillText(n, 128 + Math.cos(a) * 86, 128 + Math.sin(a) * 86); });
  x.strokeStyle = '#d8b25a'; x.lineCap = 'round';
  for (const [a, l, w] of [[(10 / 12) * Math.PI * 2 + (1 / 6) * (Math.PI / 6), 52, 8], [(2 / 12) * Math.PI * 2, 78, 5]]) { x.lineWidth = w; x.beginPath(); x.moveTo(128, 128); x.lineTo(128 + Math.sin(a) * l, 128 - Math.cos(a) * l); x.stroke(); }
  return tex(c, { repeat: false, aniso: 4 });
}
// the MIDO screen that wraps the foot of Sincere's tower
function midoTexture() {
  const [c, x] = makeCanvas(512, 256);
  const g = x.createLinearGradient(0, 0, 512, 256); g.addColorStop(0, '#0d1b2a'); g.addColorStop(1, '#20334a');
  x.fillStyle = g; x.fillRect(0, 0, 512, 256);
  x.strokeStyle = '#ff8a1e'; x.lineWidth = 10; x.strokeRect(5, 5, 502, 246);
  x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `700 110px ${FONT.serif}`; x.fillText('MIDO', 256, 112);
  x.font = `500 26px ${FONT.sans}`; x.fillText('SWISS WATCHES SINCE 1918', 256, 196);
  return tex(c, { repeat: false, aniso: 4 });
}
// New Wing On's thermometer: a tall red column with its scale, °C and °F
function thermoTexture() {
  const [c, x] = makeCanvas(64, 512);
  x.fillStyle = '#1a1a1a'; x.fillRect(0, 0, 64, 512);
  x.fillStyle = '#e8e2d2'; x.fillRect(22, 24, 20, 440);
  x.fillStyle = '#d0121b'; x.fillRect(26, 250, 12, 214); x.beginPath(); x.arc(32, 474, 18, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#e8e2d2'; x.font = `600 12px ${FONT.sans}`; x.textAlign = 'center';
  for (let i = 0; i <= 10; i++) { x.fillRect(8, 40 + i * 40, 10, 2); x.fillRect(46, 40 + i * 40, 10, 2); }
  x.fillText('°C', 12, 16); x.fillText('°F', 52, 16);
  return tex(c, { repeat: false });
}
const plane = (ctx, map, w, h, x, y, z, ry, { light = null, basic = true } = {}) => {
  const m = basic ? new THREE.MeshBasicMaterial({ map }) : new THREE.MeshStandardMaterial({ map, roughness: 0.6 });
  if (light) asLight(m, light, 0.75);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, y, z); p.rotation.y = ry; ctx.group.add(p); return p;
};
// four faces of a square stage at (x, y, z), half-size h, a texture on each
const fourFaces = (ctx, map, size, x, y, z, half, opts) => { for (const [dx, dz, ry] of [[0, half, 0], [half, 0, Math.PI / 2], [0, -half, Math.PI], [-half, 0, -Math.PI / 2]]) plane(ctx, map, size, size, x + dx, y, z + dz, ry, opts); };
// iron railing along a run (x0..x1 at z, or along z at x), with globe lamps on posts every `gap` m
function railing(ctx, a0, a1, at, y, alongX = true, gap = 4, globes = true) {
  const L = Math.abs(a1 - a0), m = (a0 + a1) / 2;
  if (alongX) { ctx.steel.box(m, y + 0.95, at, L, 0.05, 0.05); ctx.steel.box(m, y + 0.1, at, L, 0.05, 0.05); } else { ctx.steel.box(at, y + 0.95, m, 0.05, 0.05, L); ctx.steel.box(at, y + 0.1, m, 0.05, 0.05, L); }
  for (let s = Math.min(a0, a1); s <= Math.max(a0, a1) + 0.01; s += gap) {
    const px = alongX ? s : at, pz = alongX ? at : s;
    ctx.steel.box(px, y, pz, 0.08, 1.6, 0.08);
    if (globes) ctx.globes.add(new THREE.SphereGeometry(0.17, 10, 8), { x: px, y: y + 1.75, z: pz });
  }
}

export const LANDMARK_BUILDERS = {
  // 先施公司 (1917, Lester, Johnson & Morriss), now the Shanghai Fashion Store: off-white neo-Baroque; an arcade
  // of round arches with a balustraded balcony over it; big arched openings on the 2nd and 3rd floors; plain
  // windows above; ~27 m to the parapet; on the corner a white tower: a clock stage, a stage with an arch
  // in each face, a smaller columned stage, a round open colonnade under a small dome, a cross; the MIDO
  // screen wrapping the tower's foot
  sincere(ctx, xa, xb, zf, dir) {
    const { B } = ctx, depth = 60, fp = dir > 0 ? { x0: xa, x1: xb, z0: zf - depth, z1: zf } : { x0: xa, x1: xb, z0: zf, z1: zf + depth };
    const face = dir > 0 ? 'S' : 'N';
    ctx.tiers(B, fp, 0, [
      { h: 6.0, style: 'arched', bay: 4.2, f0: 0.6, f1: 0.5, cornice: { out: 0.5, h: 0.5 } },
      { h: 8.4, style: 'arched', floors: 2, bay: 4.2, f0: 0.55, f1: 0.35, cornice: { out: 0.45, h: 0.55 } },
      { h: 13.2, style: 'classic', floors: 4, bay: 3.6, f0: 0.5, f1: 0.3, cornice: { out: 0.8, h: 0.9 } },
    ], `${face}EW`, ctx.seed, { [face]: 1, E: 0.8, W: 0.55 });
    // the balcony over the arcade, its balustrade
    B.stone.box((xa + xb) / 2, 6.0, zf + dir * 0.7, xb - xa, 0.25, 1.4, { flood: 0.8 });
    for (let x = xa + 0.4; x < xb - 0.2; x += 0.45) B.stone.box(x, 6.25, zf + dir * 1.35, 0.14, 0.7, 0.14, { flood: 0.8 });
    B.stone.box((xa + xb) / 2, 6.95, zf + dir * 1.35, xb - xa, 0.12, 0.3, { flood: 0.8 });
    // the tower, over the corner on Zhejiang Road (the east end)
    const tx = xb - 4.5, tz = zf - dir * 4.5;
    B.stone.box(tx + 0.15, 0, tz + dir * 0.15, 9.3, 27.6, 9.3, { flood: 0.9 });          // the corner bay, carried up (a little proud of both faces)
    const y0 = 27.6;
    const top = tower(B, { x: tx, z: tz, y0, stages: [
      { kind: 'box', w: 7.2, h: 5.2, cap: { out: 0.35, h: 0.45 } },                          // the clock stage
      { kind: 'box', w: 6.0, h: 5.0, cap: { out: 0.3, h: 0.4 } },                            // arched stage
      { kind: 'colonnade', w: 5.0, h: 4.0, cols: 8, r: 0.22, coreMat: 'stone', core: 0.6 },  // columned stage
      { kind: 'colonnade', w: 4.0, h: 4.4, cols: 8, r: 0.16, round: true, core: 0.4 },        // the round open colonnade
      { kind: 'dome', w: 4.2, h: 2.4 },
      { kind: 'cyl', w: 0.9, h: 1.4 },                                                       // the finial's base
      { kind: 'pole', h: 5.2, mat: 'bronze' },
    ] });
    B.bronze.box(tx, top - 2.2, tz, 1.3, 0.14, 0.14);                                       // the cross-bar
    // dark arches in the second stage, a clock in each face of the first
    for (const [dx, dz, w, d] of [[0, 3.01, 2.2, 0.05], [0, -3.01, 2.2, 0.05], [3.01, 0, 0.05, 2.2], [-3.01, 0, 0.05, 2.2]]) B.glassDark.box(tx + dx, y0 + 5.9, tz + dz, w, 3.2, d);
    fourFaces(ctx, clockTexture(), 3.4, tx, y0 + 2.6, tz, 3.62, { basic: false });
    // the MIDO screen: three faces at the foot of the tower (not the back)
    const scr = midoTexture();
    for (const [dx, dz, ry] of [[0, 4.56 * dir, dir > 0 ? 0 : Math.PI], [4.56, 0, Math.PI / 2], [-4.56, 0, -Math.PI / 2]]) plane(ctx, scr, 8.6, 4.2, tx + dx, 25.2, tz + dz, ry, { light: 'screens' });
    return top;
  },

  // 永安公司 (1918, Palmer & Turner): cream render; six storeys under a heavy bracketed cornice (~24 m), a
  // setback roof floor behind an iron railing with globe lamps; the rounded corner on Zhejiang Road with its
  // flagpole; the 绮云阁 tower on the Nanjing Road front just west of the corner (a pilastered square base, a
  // stage of paired columns with a balustrade and globes, an open crown, a lantern, a mast); the big red neon
  // 永安百货 on the roof
  wingon(ctx, xa, xb, zf, dir) {
    const { B } = ctx, depth = 70, fp = dir > 0 ? { x0: xa, x1: xb, z0: zf - depth, z1: zf } : { x0: xa, x1: xb, z0: zf, z1: zf + depth };
    const face = dir > 0 ? 'S' : 'N';
    ctx.tiers(B, fp, 0, [
      { h: 5.6, style: 'classic', bay: 5.6, f0: 0.6, f1: 0.45, cornice: { out: 0.4, h: 0.5 } },
      { h: 18.4, style: 'classic', floors: 5, bay: 3.5, f0: 0.5, f1: 0.3, cornice: { out: 1.1, h: 1.3 } },
      { h: 3.6, style: 'classic', floors: 1, bay: 3.5, inset: 2.2, f0: 0.4, f1: 0.25 },
    ], `${face}EW`, ctx.seed, { [face]: 1, E: 0.85, W: 0.55 });
    // the rounded corner (Zhejiang Road: the east end), its crest and flagpole
    const cx = xb - 3.6, cz = zf - dir * 3.6;
    B.classic.add(new THREE.CylinderGeometry(4.2, 4.2, 24, 20, 1, false, 0, Math.PI * 2), { x: cx, y: 12, z: cz, flood: 0.9 });
    B.stone.add(new THREE.CylinderGeometry(4.7, 4.7, 1.3, 20, 1), { x: cx, y: 23.35, z: cz, flood: 0.9 });
    B.stone.box(cx, 24, cz, 3.4, 2.4, 3.4, { flood: 0.9 }); B.bronze.add(new THREE.CylinderGeometry(0.05, 0.07, 7, 6), { x: cx, y: 29.9, z: cz });
    // the roof terrace railing with globe lamps, along the front and the Zhejiang side
    railing(ctx, xa + 1, xb - 6, zf - dir * 0.6, 24.0, true, 4.5);
    railing(ctx, zf - dir * 8, zf - dir * (depth - 2), xb - 0.6, 24.0, false, 4.5);
    // 绮云阁, on the front west of the corner
    const tx = xb - 15, tz = zf - dir * 3.6;
    B.classic.box(tx, 0, tz, 7, 24, 7, { flood: 0.9 });
    const top = tower(B, { x: tx, z: tz, y0: 24, stages: [
      { kind: 'box', w: 6.2, h: 5.0, mat: 'classic', cap: { out: 0.4, h: 0.5 } },
      { kind: 'colonnade', w: 5.4, h: 5.0, cols: 8, r: 0.24, coreMat: 'stone', core: 0.62, phase: 0.2 },
      { kind: 'box', w: 4.6, h: 0.5 },
      { kind: 'colonnade', w: 4.0, h: 3.6, cols: 4, r: 0.4, coreMat: 'glassDark', core: 0.35, phase: Math.PI / 4 },   // the open crown
      { kind: 'dome', w: 4.2, h: 1.8 },
      { kind: 'box', w: 1.1, h: 2.6 }, { kind: 'cone', w: 1.1, h: 1.8, sides: 4 },               // the lantern and obelisk
      { kind: 'pole', h: 5, mat: 'bronze' },
    ] });
    for (const [dx, dz] of [[2.9, 2.9], [-2.9, 2.9], [2.9, -2.9], [-2.9, -2.9]]) ctx.globes.add(new THREE.SphereGeometry(0.22, 10, 8), { x: tx + dx, y: 34.4, z: tz + dz });
    return top;
  },

  // 新永安大楼 (1933, 七重天): a stepped Art Deco tower of buff brick on a wedge between Zhejiang and Hubei Roads,
  // its narrow prow to Nanjing Road, ~92 m with its penthouse and mast; the giant thermometer on its face;
  // two enclosed bridges over Zhejiang Road to Wing On at the 4th floor
  newwingon(ctx, xa, xb, zf, dir) {
    const { B } = ctx, depth = 40, fp = dir > 0 ? { x0: xa, x1: xb, z0: zf - depth, z1: zf } : { x0: xa, x1: xb, z0: zf, z1: zf + depth };
    const face = dir > 0 ? 'S' : 'N';
    ctx.tiers(B, fp, 0, [
      { h: 6.0, style: 'deco', bay: 3, f0: 0.55, f1: 0.45, cornice: { out: 0.3, h: 0.4 } },
      { h: 32.4, style: 'brick', floors: 9, bay: 2.6, f0: 0.5, f1: 0.3 },
      { h: 21.6, style: 'brick', floors: 6, bay: 2.6, inset: 1.4, f0: 0.45, f1: 0.28 },
      { h: 14.4, style: 'brick', floors: 4, bay: 2.6, inset: 2.8, f0: 0.4, f1: 0.25 },
      { h: 7.2, style: 'brick', floors: 2, bay: 2.6, inset: 4.0, f0: 0.35, f1: 0.25 },
    ], `${face}EWN`, ctx.seed, { [face]: 1, E: 0.75, W: 0.75, N: 0.5 });
    const cx = (xa + xb) / 2, cz = zf - dir * depth / 2;
    const top = tower(B, { x: cx, z: cz, y0: 81.6, stages: [{ kind: 'box', w: 4.2, h: 4.4, mat: 'brick', cap: { out: 0.2, h: 0.3 } }, { kind: 'pole', h: 7, mat: 'bronze' }] });
    plane(ctx, thermoTexture(), 1.4, 11, cx, 24, zf + dir * 0.06, dir > 0 ? 0 : Math.PI, { light: 'signs' });
    // the bridges to Wing On, across Zhejiang Road (its east kerb is this building's west end... here xa)
    for (const z of [zf - dir * 14, zf - dir * 22]) { B.brick.box(xa - 7, 12.6, z, 14.2, 6.4, 4.2, { flood: 0.6 }); B.glassDark.box(xa - 7, 13.6, z, 14.25, 1.0, 4.25); B.glassDark.box(xa - 7, 16.4, z, 14.25, 1.0, 4.25); }
    return top;
  },

  // 新新公司 (1926, C. H. Gonda), now the No.1 Food Store: cream render, strong vertical piers, recessed
  // spandrels; a bracketed cornice on the 6th floor with an iron-railed balcony; what's left of the central
  // tower (two open stages of square piers); a small glazed lantern pavilion on the corner (Guangxi Road, the
  // east end)
  sunsun(ctx, xa, xb, zf, dir) {
    const { B } = ctx, depth = 55, fp = dir > 0 ? { x0: xa, x1: xb, z0: zf - depth, z1: zf } : { x0: xa, x1: xb, z0: zf, z1: zf + depth };
    const face = dir > 0 ? 'S' : 'N';
    ctx.tiers(B, fp, 0, [
      { h: 5.4, style: 'classic', bay: 4, f0: 0.6, f1: 0.45, cornice: { out: 0.4, h: 0.45 } },
      { h: 14.4, style: 'deco', floors: 4, bay: 3.4, f0: 0.5, f1: 0.3, cornice: { out: 0.4, h: 0.4 } },
      { h: 3.6, style: 'deco', floors: 1, bay: 3.4, f0: 0.45, f1: 0.28, cornice: { out: 1.2, h: 0.7 } },
      { h: 3.6, style: 'deco', floors: 1, bay: 3.4, inset: 1.2, f0: 0.4, f1: 0.25, cornice: { out: 0.4, h: 0.4 } },
    ], `${face}EW`, ctx.seed, { [face]: 1, E: 0.8, W: 0.55 });
    railing(ctx, xa + 0.5, xb - 0.5, zf + dir * 0.9, 23.4, true, 3, false);                 // the 6th-floor balcony
    const tx = (xa + xb) / 2 - 2, tz = zf - dir * 5;
    const top = tower(B, { x: tx, z: tz, y0: 27, stages: [
      { kind: 'colonnade', w: 7.2, h: 5.0, cols: 4, r: 0.5, coreMat: 'glassDark', core: 0.45, phase: Math.PI / 4 },
      { kind: 'box', w: 7.6, h: 0.6 },
      { kind: 'colonnade', w: 5.6, h: 4.4, cols: 4, r: 0.42, coreMat: 'glassDark', core: 0.4, phase: Math.PI / 4 },
      { kind: 'box', w: 6.0, h: 0.6 },
    ] });
    // the glazed lantern pavilion on the corner
    const lx = xb - 2.5, lz = zf - dir * 2.5;
    B.glassDark.box(lx, 27, lz, 3, 3, 3); B.stone.box(lx, 30, lz, 3.6, 0.35, 3.6, { flood: 0.9 }); B.roof.add(new THREE.ConeGeometry(2.2, 1.4, 4).rotateY(Math.PI / 4), { x: lx, y: 31.05, z: lz });
    return top;
  },

  // 大新公司 (1936, Kwan, Chu & Yang), now the No.1 Department Store: ten storeys (~43 m), cream glazed tile
  // over a black granite base with a sun-shade band between; a rounded corner on Xizang Road (the west end)
  // with a small white ringed turret; white top floors behind fins rising over a pierced parapet; a flat
  // white canopy over the shopfronts
  sunco(ctx, xa, xb, zf, dir) {
    const { B } = ctx, depth = 46, fp = dir > 0 ? { x0: xa, x1: xb, z0: zf - depth, z1: zf } : { x0: xa, x1: xb, z0: zf, z1: zf + depth };
    const face = dir > 0 ? 'S' : 'N';
    ctx.tiers(B, fp, 0, [
      { h: 5.6, style: 'stoneDark', bay: 4, f0: 0.55, f1: 0.45 },
      { h: 1.0, style: 'stone', bay: 4, f0: 0.5, f1: 0.4, cornice: { out: 1.4, h: 0.35 } },        // the sun-shade band
      { h: 25.2, style: 'deco', floors: 7, bay: 3, f0: 0.5, f1: 0.3 },
      { h: 7.2, style: 'classic', floors: 2, bay: 3, f0: 0.45, f1: 0.28, cornice: { out: 0.3, h: 0.4 } },
      { h: 4.0, style: 'classic', floors: 1, bay: 3, inset: 2.4, f0: 0.4, f1: 0.25 },
    ], `${face}EW`, ctx.seed, { [face]: 1, W: 0.85, E: 0.55 });
    // the canopy over the shopfronts
    B.stone.box((xa + xb) / 2, 4.55, zf + dir * 1.1, xb - xa - 0.6, 0.22, 2.2, { flood: 0.6 });
    // the rounded corner (Xizang Road: the west end) and its turret
    const cx = xa + 6, cz = zf - dir * 6;
    B.deco.add(new THREE.CylinderGeometry(6.3, 6.3, 32, 24, 1), { x: cx, y: 22, z: cz, flood: 0.9 });
    B.stoneDark.add(new THREE.CylinderGeometry(6.35, 6.35, 5.6, 24, 1), { x: cx, y: 2.8, z: cz });
    const top = tower(B, { x: cx, z: cz, y0: 39, stages: [
      { kind: 'cyl', w: 4.6, h: 3.4, cap: null }, { kind: 'cyl', w: 5.0, h: 0.35 }, { kind: 'cyl', w: 4.0, h: 1.4 }, { kind: 'cyl', w: 4.4, h: 0.3 }, { kind: 'dome', w: 3.8, h: 1.4 }, { kind: 'pole', h: 4, mat: 'bronze' },
    ] });
    // fins over the parapet along the front
    for (let x = xa + 8; x < xb - 1; x += 3) B.stone.box(x, 39, zf - dir * 0.3, 0.35, 2.4, 0.6, { flood: 0.9 });
    return Math.max(top, 43);
  },
};
