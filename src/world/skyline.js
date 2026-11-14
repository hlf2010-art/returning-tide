// Pudong across the Huangpu: scenery only, never walkable. Built to real-ish scale
// (Oriental Pearl 468 m, Shanghai Tower 632 m, ~450 m of river) so it looms correctly.
import * as THREE from 'three';
import { Batch } from './geo.js';
import { makeCanvas, tex, rng, FONT } from './canvas.js';
import { REFLECT_LAYER } from './sky.js';

const SHORE_X = 470;           // Pudong river wall
export const PEARL = { x: 640, z: -42 };

// Window-light atlas shared by the generic towers: 64 x 64 cells of 3 m x 4 m.
export function towerAtlas(seed, warmth) {
  // Glass towers at dusk: dark bodies, floors lit in runs rather than as confetti.
  const [c, ctx] = makeCanvas(512, 1024), r = rng(seed);
  const bg = ctx.createLinearGradient(0, 0, 0, 1024); bg.addColorStop(0, '#0f1a30'); bg.addColorStop(1, '#0a1120');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 512, 1024);
  for (let row = 0; row < 64; row++) {
    const kind = r();
    if (kind < 0.05) {                                       // a continuous band: sky lobby, plant floor, LED line
      ctx.fillStyle = r() < warmth ? 'rgba(255,214,150,0.85)' : 'rgba(190,215,255,0.85)';
      ctx.fillRect(0, row * 16 + 5, 512, 5);
      continue;
    }
    const occupancy = kind < 0.3 ? 0.04 : 0.1 + r() * 0.3;
    let run = 0, tone = 0, bright = 0;
    for (let col = 0; col < 64; col++) {
      if (run <= 0) {
        if (r() > occupancy) continue;
        run = 1 + Math.floor(r() * r() * 9); tone = r(); bright = 0.3 + r() * 0.6;
      }
      run--;
      const colr = tone < warmth ? [255, 205, 140] : tone < warmth + 0.3 ? [215, 230, 255] : [140, 185, 255];
      ctx.fillStyle = `rgb(${colr.map((v) => Math.floor(v * bright)).join(',')})`;
      ctx.fillRect(col * 8 + 1, row * 16 + 4, 6, 9);
    }
  }
  ctx.fillStyle = 'rgba(6,10,18,0.8)';
  for (let x = 0; x < 512; x += 64) ctx.fillRect(x, 0, 3, 1024);     // structural bays
  return tex(c, { aniso: 4 });
}

function basic(map, gain = 1) {
  const m = new THREE.MeshBasicMaterial({ map });
  m.color.setScalar(gain);
  return m;
}

// Box tower with window UVs at 3 m x 4 m per cell. Top/bottom faces go dark.
function tower(batch, x, z, w, d, h, r, y0 = 0) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  const ou = Math.floor(r() * 64) / 64, ov = Math.floor(r() * 64) / 64;
  const dims = [d, d, 0, 0, w, w];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
    const k = f * 4 + i;
    if (f === 2 || f === 3) uv.setXY(k, 0.004, 0.004);
    else uv.setXY(k, ou + (uv.getX(k) * dims[f]) / 3 / 64, ov + (uv.getY(k) * h) / 4 / 64);
  }
  g.translate(x, y0 + h / 2, z);
  batch.push(g);
}

// The spheres are clad in a lattice of mirrored, pink-tinted glass panels: each diamond panel sits at
// its own slight angle (so reflections break up panel by panel), the seams are dark, and LED points sit
// at the lattice nodes. Three maps from one canvas pass: tangent-space normals, roughness, glow.
// 32 diamonds around x 16 rows over the sphere's UVs.
function pearlPanels() {
  const W = 1024, H = 512, cw = W / 32, ch = H / 16, r = rng(468);
  const [nc, nx] = makeCanvas(W, H), [rc, rx] = makeCanvas(W, H), [ec, ex] = makeCanvas(W, H);
  nx.fillStyle = 'rgb(128,128,255)'; nx.fillRect(0, 0, W, H);
  rx.fillStyle = 'rgb(150,150,150)'; rx.fillRect(0, 0, W, H);
  ex.fillStyle = '#000'; ex.fillRect(0, 0, W, H);
  const diamond = (ctx, cx, cy, k) => { ctx.beginPath(); ctx.moveTo(cx, cy - ch / 2 * k); ctx.lineTo(cx + cw / 2 * k, cy); ctx.lineTo(cx, cy + ch / 2 * k); ctx.lineTo(cx - cw / 2 * k, cy); ctx.closePath(); };
  for (let row = -1; row <= 16; row++) for (let col = -1; col <= 32; col++) {
    for (const off of [0, 0.5]) {                                   // two interleaved grids = a diamond lattice
      const cx = (col + off) * cw, cy = (row + off) * ch + ch / 2;
      // each panel tilted a little: a flat colour in the normal map
      const tx = (r() - 0.5) * 0.34, ty = (r() - 0.5) * 0.34, tz = Math.sqrt(1 - tx * tx - ty * ty);
      nx.fillStyle = `rgb(${Math.round((tx * 0.5 + 0.5) * 255)},${Math.round((ty * 0.5 + 0.5) * 255)},${Math.round((tz * 0.5 + 0.5) * 255)})`;
      diamond(nx, cx, cy, 0.9); nx.fill();
      const rough = 0.1 + r() * 0.16;                               // polished glass, not all panels alike
      rx.fillStyle = `rgb(${Math.round(rough * 255)},${Math.round(rough * 255)},${Math.round(rough * 255)})`;
      diamond(rx, cx, cy, 0.9); rx.fill();
      // the glass glows faintly from the lighting behind it; some panels a touch brighter
      const g = 0.42 + r() * 0.14 + (r() < 0.06 ? 0.2 : 0);
      ex.fillStyle = `rgba(255,${Math.round(40 + r() * 35)},${Math.round(160 + r() * 40)},${g})`;
      diamond(ex, cx, cy, 0.86); ex.fill();
    }
  }
  // LED points at the lattice nodes
  for (let row = 0; row <= 32; row++) for (let col = 0; col <= 64; col++) {
    const x = col * cw / 2, y = row * ch / 2 + ((col % 2) ? ch / 2 : 0) % ch;
    const grd = ex.createRadialGradient(x, y, 0, x, y, 3);
    grd.addColorStop(0, 'rgba(255,225,248,0.8)'); grd.addColorStop(0.45, 'rgba(255,120,220,0.35)'); grd.addColorStop(1, 'rgba(255,90,200,0)');
    ex.fillStyle = grd; ex.fillRect(x - 5, y - 5, 10, 10);
  }
  const normal = tex(nc, { aniso: 8 }), roughness = tex(rc, { aniso: 8 }), glow = tex(ec, { aniso: 8 });
  normal.colorSpace = THREE.NoColorSpace; roughness.colorSpace = THREE.NoColorSpace;
  return { normal, roughness, glow };
}

// Floodlit concrete: uplights at the podium and on the decks above each sphere throw light up the
// columns, fading with height; a pink spill near the spheres; rounder-looking because the light falls
// off toward each column's edges. World-space, so it works on the batched geometry.
function floodlit(mat, { spheres, deckLights }) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = (modelMatrix * vec4(position, 1.0)).xyz;');
    const sph = spheres.map(([y, r]) => `spill += exp(-max(0.0, distance(vWP, vec3(${PEARL.x.toFixed(1)}, ${y.toFixed(1)}, ${PEARL.z.toFixed(1)})) - ${r.toFixed(1)}) / 9.0);`).join('\n');
    const decks = deckLights.map(([y, k]) => `up += ${k.toFixed(2)} * step(${y.toFixed(1)}, vWP.y) * exp(-(vWP.y - ${y.toFixed(1)}) / 38.0);`).join('\n');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      {
        float up = 0.0, spill = 0.0;
        ${decks}
        ${sph}
        float facing = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
        float shade = 0.3 + 0.7 * pow(facing, 0.8);
        totalEmissiveRadiance += (vec3(1.0, 0.93, 0.84) * up + vec3(1.0, 0.35, 0.8) * spill * 0.28) * shade * 0.85;
      }`);
  };
  return mat;
}

function stripeTexture(colors, rows, dark = '#070b14') {
  // horizontal floor-light bands for the supertalls
  const [c, ctx] = makeCanvas(64, 1024), r = rng(colors.length * 7 + rows);
  ctx.fillStyle = dark; ctx.fillRect(0, 0, 64, 1024);
  const rh = 1024 / rows;
  for (let i = 0; i < rows; i++) {
    const col = colors[Math.floor(r() * colors.length)], a = 0.25 + r() * 0.6;
    ctx.fillStyle = col; ctx.globalAlpha = a;
    for (let x = 0; x < 64; x += 4) if (r() < 0.8) ctx.fillRect(x, i * rh + rh * 0.3, 3, rh * 0.45);
  }
  ctx.globalAlpha = 1;
  return tex(c, { aniso: 4 });
}

function buildPearl(group) {
  const P = pearlPanels();
  // the spheres: tinted mirror glass. Reflections come from the captured environment (the sky, the
  // Bund and the river), the panels break them up, a clear coat adds the sharp sheen on top, and
  // the lattice glows from inside.
  const pink = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(1.0, 0.36, 0.78), metalness: 0.85, roughness: 1, roughnessMap: P.roughness,
    normalMap: P.normal, normalScale: new THREE.Vector2(1, 1),
    clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 2.2,
    emissive: new THREE.Color(1, 1, 1), emissiveMap: P.glow, emissiveIntensity: 1.5,
  });
  pink.name = 'pearl-glass';
  const concrete = floodlit(new THREE.MeshStandardMaterial({ color: new THREE.Color(0.72, 0.71, 0.74), roughness: 0.62, metalness: 0.04, envMapIntensity: 0.7 }),
    { spheres: [[93, 25], [272, 22.5], [342, 8]], deckLights: [[10, 1.0], [118, 0.75], [294, 0.8], [350, 0.6]] });
  const steel = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.8, 0.82, 0.86), metalness: 1, roughness: 0.28, envMapIntensity: 1.6, emissive: new THREE.Color(0.1, 0.09, 0.12) });
  const hot = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.3, 2.4) });
  const spheres = new Batch(), struct = new Batch(), mast = new Batch(), glow = new Batch();
  const { x, z } = PEARL;
  const sph = (r, y, seg = 48) => spheres.add(new THREE.SphereGeometry(r, seg, Math.floor(seg * 0.6)), { x, y, z });
  sph(25, 93); sph(22.5, 272); sph(8, 342, 28);
  // three main columns with the five small spheres strung between the big ones
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5, cx = x + Math.cos(a) * 7.5, cz = z + Math.sin(a) * 7.5;
    struct.cyl(cx, 0, cz, 4.5, 4.5, 262, 20);
    // raking struts from the ground up into the lower sphere
    const g = new THREE.CylinderGeometry(3.4, 3.4, 110, 16);
    g.rotateZ(0.6); g.rotateY(-a);
    struct.add(g, { x: x + Math.cos(a) * 36, y: 42, z: z + Math.sin(a) * 36 });
  }
  for (let k = 0; k < 5; k++) spheres.add(new THREE.SphereGeometry(6.5, 24, 16), { x, y: 128 + k * 24, z });
  struct.cyl(x, 0, z, 30, 34, 10, 32);                 // podium
  struct.cyl(x, 292, z, 5.5, 8, 44, 20);               // upper shaft
  mast.cyl(x, 349, z, 0.8, 3.2, 119, 10);              // antenna mast -> 468 m
  for (const y of [93, 272]) glow.add(new THREE.TorusGeometry(y === 93 ? 25.4 : 22.9, 0.7, 6, 64), { x, y, z, rx: Math.PI / 2 });
  for (let y = 360; y < 468; y += 18) glow.cyl(x, y, z, 1.6, 1.6, 2, 8);
  const sm = spheres.mesh(pink, 'pearl-spheres');
  group.add(sm, struct.mesh(concrete, 'pearl-structure'), mast.mesh(steel, 'pearl-mast'), glow.mesh(hot, 'pearl-glow'));
  return pink;
}

function buildShanghaiTower(group, x, z) {
  // 632 m, a rounded triangle twisting ~120 degrees as it tapers
  const levels = 56, seg = 30, H = 632;
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= levels; j++) {
    const t = j / levels, y = t * H;
    const rad = 44 * (1 - 0.46 * Math.pow(t, 1.25)), twist = t * 2.1;
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const lobe = 1 + 0.16 * Math.cos(3 * (a - twist)) - 0.05 * Math.pow(Math.max(0, Math.cos(a - twist - 1.05)), 12);
      pos.push(x + Math.cos(a) * rad * lobe, y, z + Math.sin(a) * rad * lobe);
      uv.push((i / seg) * 6, t);
    }
  }
  for (let j = 0; j < levels; j++) for (let i = 0; i < seg; i++) {
    const a = j * (seg + 1) + i, b = a + seg + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  const mat = basic(stripeTexture(['#bcd6ff', '#e6f0ff', '#9fc4ff'], 128, '#0c1526'), 1.1);
  group.add(new THREE.Mesh(g, mat));
  // the lit crown
  const crown = new Batch();
  crown.cyl(x, 596, z, 15, 22, 34, 18, { open: true });
  group.add(crown.mesh(new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.6, 2.2), side: THREE.DoubleSide }), 'st-crown'));
}

function buildSWFC(group, x, z) {
  // 492 m "bottle opener": square base resolving to a single diagonal blade with a trapezoid opening
  const H = 492, b = 29, yCut = 432;
  const mat = basic(stripeTexture(['#cfe0ff', '#a9c8ff'], 100, '#18294a'), 1.5);
  const ring = (y) => {
    const t = y / H, s = 1 - t;                         // two corners close in, two stay out
    const q = b * 1.41 * (0.1 + 0.9 * s), p = b * 1.41 * (1 - 0.1 * t);
    return [[0, -p], [q, 0], [0, p], [-q, 0]];          // diamond plan: the blade runs north-south, broadside to the Bund
  };
  const pos = [], uv = [], idx = [];
  const levels = [0, 120, 260, yCut];
  levels.forEach((y, j) => ring(y).forEach(([px, pz], i) => {
    // duplicate verts per face for clean UVs
    const n = ring(y)[(i + 1) % 4];
    pos.push(x + px, y, z + pz, x + n[0], y, z + n[1]);
    uv.push(i * 0.5, y / H, i * 0.5 + 0.5, y / H);
  }));
  for (let j = 0; j < levels.length - 1; j++) for (let i = 0; i < 4; i++) {
    const a = j * 8 + i * 2, c = a + 8;
    idx.push(a, c, a + 1, a + 1, c, c + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  const body = new THREE.Mesh(g, mat); body.material.side = THREE.DoubleSide;
  group.add(body);
  // the opening: two prongs and the top bar
  const top = new Batch(), r = ring(yCut), ang = Math.atan2(r[2][1] - r[0][1], r[2][0] - r[0][0]);
  const half = Math.hypot(r[2][0] - r[0][0], r[2][1] - r[0][1]) / 2;
  for (const s of [-1, 1]) top.box(x + Math.cos(ang) * s * (half - 4), yCut, z + Math.sin(ang) * s * (half - 4), 8, H - yCut, 9, { rotY: -ang });
  top.box(x, H - 12, z, half * 2, 12, 9, { rotY: -ang });
  group.add(top.mesh(mat, 'swfc-top'));
  const edge = new Batch();
  edge.box(x, H - 1, z, half * 2, 1.5, 10, { rotY: -ang });
  edge.box(x, yCut - 1, z, half * 2 - 14, 1.2, 10, { rotY: -ang });
  group.add(edge.mesh(new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 2.0, 2.6) }), 'swfc-edge'));
}

function buildJinMao(group, x, z) {
  // 421 m tiered pagoda: thirteen shrinking segments, warm white
  const mat = basic(stripeTexture(['#ffe2b0', '#ffd08a', '#fff0d0'], 96, '#1a140c'), 1.35);
  const b = new Batch(), trim = new Batch();
  const heights = [64, 56, 48, 40, 34, 28, 24, 20, 16, 14, 12, 10, 8];
  let y = 0, w = 54;
  heights.forEach((h, i) => {
    b.box(x, y, z, w, h, w, { tile: 300 });
    b.box(x, y, z, w * 0.72, h, w * 1.06, { tile: 300 }); b.box(x, y, z, w * 1.06, h, w * 0.72, { tile: 300 });
    y += h;
    trim.box(x, y - 1.2, z, w + 2.2, 1.6, w + 2.2);
    w -= i < 8 ? 2.2 : 3.4;
  });
  trim.cyl(x, y, z, 0.6, 5, 47, 8);
  trim.box(x, y, z, 12, 12, 12);
  group.add(b.mesh(mat, 'jinmao'), trim.mesh(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 1.55, 0.95) }), 'jinmao-trim'));
}

function ledTexture() {
  const [c, ctx] = makeCanvas(512, 256);
  const g = ctx.createLinearGradient(0, 0, 512, 256);
  g.addColorStop(0, '#16307a'); g.addColorStop(1, '#3a1466');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `700 150px ${FONT.sans}`;
  ctx.fillText('I', 110, 132); ctx.fillText('SH', 395, 132);
  ctx.fillStyle = '#ff3355'; ctx.font = '150px sans-serif'; ctx.fillText('♥', 215, 138);
  return tex(c, { repeat: false, aniso: 4 });
}

export function createSkyline() {
  const group = new THREE.Group(); group.name = 'pudong';
  const r = rng(2026);
  const cool = basic(towerAtlas(5, 0.2), 1.0), warm = basic(towerAtlas(6, 0.6), 1.0);
  const A = new Batch(), B = new Batch(), dark = new Batch(), accents = new Batch();

  const pearlMat = buildPearl(group);
  buildJinMao(group, 800, 205);
  buildSWFC(group, 935, 285);
  buildShanghaiTower(group, 860, 395);

  // Riverfront row and the Lujiazui cluster behind it. Hand-placed anchors, then filler.
  const anchors = [
    // x, z, w, d, h
    [520, -330, 60, 40, 150], [560, -250, 46, 46, 110], [515, -170, 70, 36, 46],
    [545, 70, 50, 44, 185], [520, 150, 44, 44, 110], [600, 120, 40, 40, 150],
    [690, 60, 44, 44, 205], [740, -70, 50, 50, 230], [760, -170, 46, 46, 200],
    [700, 300, 46, 42, 165], [640, 250, 40, 40, 130], [560, 300, 60, 40, 95],
    [720, 420, 50, 50, 240], [600, 470, 54, 46, 190], [530, 430, 60, 36, 90],
    [840, -40, 56, 56, 260], [900, -180, 50, 50, 280], [820, -300, 54, 54, 220],
    [980, 120, 60, 60, 320], [1010, 480, 56, 56, 300], [760, 560, 50, 50, 210],
    [620, 620, 60, 44, 140], [540, 560, 70, 40, 80], [660, -420, 50, 50, 180],
    [540, -470, 70, 40, 100], [780, -520, 56, 56, 230], [600, -600, 60, 46, 150],
  ];
  for (const [x, z, w, d, h] of anchors) {
    const bt = r() < 0.5 ? A : B;
    if (h > 140 && r() < 0.55) {                                         // setback crown
      tower(bt, x, z, w, d, h * 0.86, r); tower(bt, x, z, w * 0.62, d * 0.62, h * 0.14, r, h * 0.86);
      if (r() < 0.5) accents.box(x, h, z, w * 0.62 + 1, 1.4, d * 0.62 + 1);
    } else {
      tower(bt, x, z, w, d, h, r);
      if (r() < 0.3) accents.box(x, h, z, w + 1, 1.4, d + 1);            // lit parapet
    }
    if (r() < 0.35) dark.cyl(x, h, z, 0.5, 2, 30 + r() * 30, 6);       // mast
  }
  for (let i = 0; i < 46; i++) {
    const x = 520 + r() * 620, z = -900 + r() * 1800;
    if (Math.hypot(x - PEARL.x, z - PEARL.z) < 110) continue;
    if (x > 560 && x < 1010 && z > 130 && z < 470) continue;            // keep the supertall trio readable
    const h = 50 + r() * r() * 170 + (x - 520) * 0.1, w = 26 + r() * 26;
    tower(r() < 0.5 ? A : B, x, z, w, w * (0.7 + r() * 0.5), h, r);
  }
  // low riverside: tree line, river wall, the convention centre with its two globes
  dark.box(SHORE_X + 20, -3, 0, 60, 9, 2400);
  dark.box(SHORE_X + 30, 6, 0, 30, 9, 2400);
  tower(B, 560, -120, 40, 150, 34, r);
  const globes = new Batch();
  for (const gz of [-185, -55]) globes.add(new THREE.SphereGeometry(24, 20, 14), { x: 545, y: 30, z: gz });
  group.add(globes.mesh(basic(towerAtlas(9, 0.1), 1.3), 'globes'));
  // promenade lights along the far bank
  const pts = [];
  for (let z = -1100; z < 1100; z += 14) pts.push(SHORE_X + 2, 5.5, z + r() * 4);
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  group.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: new THREE.Color(2.2, 1.7, 1.0), size: 3.2, sizeAttenuation: false })));
  // the big LED wall on a riverfront tower
  const led = new THREE.Mesh(new THREE.PlaneGeometry(56, 72), basic(ledTexture(), 1.5));
  led.position.set(545 - 25.4, 140, 70); led.rotation.y = -Math.PI / 2;
  group.add(led);

  group.add(A.mesh(cool, 'towers-a'), B.mesh(warm, 'towers-b'));
  group.add(dark.mesh(new THREE.MeshBasicMaterial({ color: 0x0a0f18 }), 'shore'));
  group.add(accents.mesh(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 1.0, 1.5) }), 'accents'));

  group.traverse((o) => { o.layers.enable(REFLECT_LAYER); o.matrixAutoUpdate = false; o.updateMatrix(); });

  // the lattice lighting breathes slowly between pink and violet
  const c1 = new THREE.Color(1, 1, 1), c2 = new THREE.Color(0.72, 0.8, 1.35);
  return {
    group,
    update(t) { pearlMat.emissive.lerpColors(c1, c2, 0.5 + 0.5 * Math.sin(t * 0.25)); },
  };
}
