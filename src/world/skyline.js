// Pudong across the Huangpu: scenery only, never walkable. Built to real-ish scale
// (Oriental Pearl 468 m, Shanghai Tower 632 m, ~450 m of river) so it looms correctly.
import * as THREE from 'three';
import { skylineGlass } from './facade.js';
import { Batch } from './geo.js';
import { makeCanvas, tex, rng, FONT } from './canvas.js';
import { REFLECT_LAYER } from './sky.js';
import { TOD, asLight, glassByDay } from './dayNight.js';

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

export function basic(map, gain = 1) {
  const m = new THREE.MeshBasicMaterial({ map });
  m.color.setScalar(gain);
  return m;
}

// Box tower with window UVs at 3 m x 4 m per cell. Top/bottom faces go dark.
export function tower(batch, x, z, w, d, h, r, y0 = 0) {
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
const PEARL_LIGHT = { value: 1 };     // the Pearl's own lighting: the colour show, a dimmer static glow late at night, off by day
function floodlit(mat, { spheres, deckLights }) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.pearlLight = PEARL_LIGHT;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = (modelMatrix * vec4(position, 1.0)).xyz;');
    const sph = spheres.map(([y, r]) => `spill += exp(-max(0.0, distance(vWP, vec3(${PEARL.x.toFixed(1)}, ${y.toFixed(1)}, ${PEARL.z.toFixed(1)})) - ${r.toFixed(1)}) / 9.0);`).join('\n');
    const decks = deckLights.map(([y, k]) => `up += ${k.toFixed(2)} * step(${y.toFixed(1)}, vWP.y) * exp(-(vWP.y - ${y.toFixed(1)}) / 38.0);`).join('\n');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; uniform float pearlLight;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      {
        float up = 0.0, spill = 0.0;
        ${decks}
        ${sph}
        float facing = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
        float shade = 0.3 + 0.7 * pow(facing, 0.8);
        totalEmissiveRadiance += (vec3(1.0, 0.93, 0.84) * up + vec3(1.0, 0.35, 0.8) * spill * 0.28) * shade * 0.85 * pearlLight;
      }`);
  };
  return mat;
}

// ---- the landmarks' own façades. Each map is what the tower shows after dark; by day skylineGlass
// reads it as the curtain wall's pattern under its own tint and the sky it reflects. Every map is laid
// out in floors (v) and bays (u) so the shader's mullions and slabs (its `grid`) fall on them: a lit
// window fills the upper ~80 % of its floor, the spandrel the bottom. ----
// paint one floor's run of bays, ceiling lights brighter than the desks below
function litBay(ctx, x, y, w, h, rgb, k) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  const c = (m) => `rgb(${rgb.map((v) => Math.min(255, v * k * m) | 0).join(',')})`;
  g.addColorStop(0, c(1.08)); g.addColorStop(0.55, c(0.9)); g.addColorStop(1, c(0.62));
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
}
// floor-by-floor occupancy: whole floors lit, long runs, dark floors; not a scatter of single windows
function officeFloors(ctx, r, { W, H, floors, bays, y0 = 0, y1 = floors, occ = 0.35, warm = 0.2, gain = 1, cool = [214, 230, 255], hot = [255, 212, 150] }) {
  const fh = H / floors, bw = W / bays;
  for (let f = y0; f < y1; f++) {
    const top = H - (f + 1) * fh, k = r();
    if (k > occ) continue;                                    // a dark floor
    const full = k < occ * 0.35, rgb = r() < warm ? hot : cool;
    let b = 0;
    while (b < bays) {
      const run = full ? bays : 2 + Math.floor(r() * bays * 0.45);
      const gap = full ? 0 : Math.floor(r() * bays * 0.4);
      b += gap;
      const n = Math.min(run, bays - b); if (n <= 0) break;
      litBay(ctx, b * bw, top + fh * 0.04, n * bw, fh * 0.78, rgb, (0.5 + r() * 0.35) * gain);
      b += n + 1;
    }
  }
}
// Shanghai Tower: a double skin of pale glass in nine zones; at each zone's top the sky lobby, its ring
// of white light round the outer wall; offices mostly dark late, the hotel near the top warm
function shanghaiTowerTexture() {
  const W = 128, H = 2048, floors = 128, [c, ctx] = makeCanvas(W, H), r = rng(632);
  const bg = ctx.createLinearGradient(0, H, 0, 0); bg.addColorStop(0, '#0d1824'); bg.addColorStop(1, '#101f2e');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const zones = [0, 16, 30, 44, 58, 72, 86, 100, 113, 124];
  for (let z = 0; z < zones.length - 1; z++) {
    officeFloors(ctx, r, { W, H, floors, bays: 16, y0: zones[z] + 2, y1: zones[z + 1], occ: z >= 7 ? 0.4 : 0.2, warm: z >= 7 ? 0.8 : 0.3, gain: 0.6 });
  }
  const fh = H / floors;
  for (const f of zones.slice(1)) {                      // sky lobby: lit floors and the ring of LED on the outer skin
    litBay(ctx, 0, H - (f + 2) * fh + 4, W, fh * 1.2, [200, 225, 255], 0.38);
    ctx.fillStyle = 'rgba(235,245,255,0.9)'; ctx.fillRect(0, H - f * fh - 1.6, W, 1.6);
    ctx.fillStyle = 'rgba(160,200,255,0.25)'; ctx.fillRect(0, H - f * fh - 7, W, 4.8);
  }
  return tex(c, { aniso: 8 });
}
// World Financial Center: blue-grey glass, a fine square grid, mostly dark late with lit office runs;
// the hotel and the observatory at the top lit warmer
function swfcTexture() {
  const W = 128, H = 1024, floors = 100, [c, ctx] = makeCanvas(W, H), r = rng(492);
  const bg = ctx.createLinearGradient(0, H, 0, 0); bg.addColorStop(0, '#0a1422'); bg.addColorStop(1, '#0e1b2e');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  officeFloors(ctx, r, { W, H, floors, bays: 32, y0: 3, y1: 78, occ: 0.32, warm: 0.1, gain: 0.9 });
  officeFloors(ctx, r, { W, H, floors, bays: 32, y0: 79, y1: 94, occ: 0.6, warm: 0.75, gain: 0.85 });
  officeFloors(ctx, r, { W, H, floors, bays: 32, y0: 94, y1: 100, occ: 0.9, warm: 0.2, gain: 1.05 });
  return tex(c, { aniso: 8 });
}
// Jin Mao: the pagoda's silver fins, floodlit gold from every setback so each tier glows brightest at
// its foot and fades upward; warm windows between
const JINMAO_TIERS = [64, 56, 48, 40, 34, 28, 24, 20, 16, 14, 12, 10, 8], JINMAO_H = 421;
function jinMaoTexture() {
  const W = 256, H = 1024, floors = 88, bays = 40, [c, ctx] = makeCanvas(W, H), r = rng(421);
  ctx.fillStyle = '#120d07'; ctx.fillRect(0, 0, W, H);
  officeFloors(ctx, r, { W, H, floors, bays, y0: 2, y1: 52, occ: 0.28, warm: 0.6, gain: 0.55 });
  officeFloors(ctx, r, { W, H, floors, bays, y0: 53, y1: 87, occ: 0.6, warm: 0.95, gain: 0.6 });  // the hotel
  const bw = W / bays;
  let y = 0;
  for (const h of JINMAO_TIERS) {
    const top = H * (1 - (y + h) / JINMAO_H), bot = H * (1 - y / JINMAO_H);
    const g = ctx.createLinearGradient(0, bot, 0, top);
    g.addColorStop(0, 'rgba(255,206,120,0.95)'); g.addColorStop(0.45, 'rgba(255,190,100,0.55)'); g.addColorStop(1, 'rgba(255,180,90,0.22)');
    ctx.fillStyle = g;
    for (let b = 0; b < bays; b++) ctx.fillRect(b * bw + bw * 0.42, top, bw * 0.22, bot - top);        // a fin per bay
    const glow = ctx.createLinearGradient(0, bot, 0, bot - (bot - top) * 0.35);
    glow.addColorStop(0, 'rgba(255,190,110,0.32)'); glow.addColorStop(1, 'rgba(255,190,110,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, bot - (bot - top) * 0.35, W, (bot - top) * 0.35);        // the setback's floods
    y += h;
  }
  return tex(c, { aniso: 8 });
}
// world-space UVs for a merged box mesh: u along whichever face (metres / U), v = height / V
function worldUV(geo, U, V) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const nx = n.getX(i), nz = n.getZ(i);
    const u = Math.abs(nx) > 0.5 ? p.getZ(i) * -Math.sign(nx) : Math.abs(nz) > 0.5 ? p.getX(i) * Math.sign(nz) : 0;
    uv.setXY(i, u / U, p.getY(i) / V);
  }
  uv.needsUpdate = true;
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
  g.setIndex(idx); g.computeVertexNormals();
  const mat = basic(shanghaiTowerTexture(), 1.05);
  mat.userData.glass = { day: [0.58, 0.67, 0.72], f0: 0.24, grid: [16, 128] };
  group.add(Object.assign(new THREE.Mesh(g, mat), { name: 'shanghai-tower' }));
  // the lit crown
  const crown = new Batch();
  crown.cyl(x, 596, z, 15, 22, 34, 18, { open: true });
  group.add(crown.mesh(new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.6, 2.2), side: THREE.DoubleSide }), 'st-crown'));
  // a line of white LEDs up the notch as it twists round the tower (the photos: a sparkling spiral)
  const pts = [];
  for (let k = 0; k < 900; k++) {
    const t = 0.015 + (k / 900) * 0.92, rad = 44 * (1 - 0.46 * Math.pow(t, 1.25)), a = t * 2.1 + 1.05;
    const lobe = 1 + 0.16 * Math.cos(3 * 1.05) - 0.05;
    pts.push(x + Math.cos(a) * rad * lobe * 1.02, t * H, z + Math.sin(a) * rad * lobe * 1.02);
  }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  group.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: new THREE.Color(2.6, 2.5, 2.3), size: 2.2, sizeAttenuation: false })));
  // the crown's message band, facing the Bund, scrolling
  const tk = tickerTexture('WELCOME TO SHANGHAI   ·   欢迎来到上海   ·   ');
  const arc = 1.9, rad = 31.5, bandH = 22;
  tk.repeat.set((arc * rad / bandH) * 128 / 2048, 1);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * 1.03, bandH, 40, 1, true, -Math.PI / 2 - arc / 2, arc),
    new THREE.MeshBasicMaterial({ map: tk, color: new THREE.Color(1.6, 1.6, 1.7), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  band.position.set(x, 548, z); group.add(band);
  return tk;
}

function buildSWFC(group, x, z) {
  // 492 m "bottle opener": square base resolving to a single diagonal blade with a trapezoid opening
  const H = 492, b = 29, yCut = 432;
  const mat = basic(swfcTexture(), 1.05);
  mat.userData.glass = { day: [0.4, 0.5, 0.6], f0: 0.22, grid: [32, 100] };
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
  g.setIndex(idx); g.computeVertexNormals();
  const body = new THREE.Mesh(g, mat); body.name = 'swfc'; body.material.side = THREE.DoubleSide;
  group.add(body);
  // the opening: two prongs and the top bar
  const top = new Batch(), r = ring(yCut), ang = Math.atan2(r[2][1] - r[0][1], r[2][0] - r[0][0]);
  const half = Math.hypot(r[2][0] - r[0][0], r[2][1] - r[0][1]) / 2;
  for (const s of [-1, 1]) top.box(x + Math.cos(ang) * s * (half - 4), yCut, z + Math.sin(ang) * s * (half - 4), 8, H - yCut, 9, { rotY: -ang, tile: 300 });
  top.box(x, H - 12, z, half * 2, 12, 9, { rotY: -ang, tile: 300 });
  group.add(top.mesh(mat, 'swfc-top'));
  const edge = new Batch();
  for (const ci of [0, 2]) for (let j = 0; j < levels.length - 1; j++) {
    const a0 = ring(levels[j])[ci], a1 = ring(levels[j + 1])[ci];
    bar(edge, new THREE.Vector3(x + a0[0] * 1.01, levels[j], z + a0[1] * 1.01), new THREE.Vector3(x + a1[0] * 1.01, levels[j + 1], z + a1[1] * 1.01), 1.3);
  }
  for (const sgn of [-1, 1]) bar(edge, new THREE.Vector3(x + Math.cos(ang) * sgn * half, yCut, z + Math.sin(ang) * sgn * half), new THREE.Vector3(x + Math.cos(ang) * sgn * half, H, z + Math.sin(ang) * sgn * half), 1.3);
  edge.box(x, H - 1, z, half * 2, 1.5, 10, { rotY: -ang });
  edge.box(x, yCut - 1, z, half * 2 - 14, 1.2, 10, { rotY: -ang });
  group.add(edge.mesh(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 1.25, 3.0) }), 'swfc-edge'));
}

function buildJinMao(group, x, z) {
  // 421 m tiered pagoda: thirteen shrinking segments, warm white
  const mat = basic(jinMaoTexture(), 1.25);
  mat.userData.glass = { day: [0.36, 0.38, 0.42], f0: 0.2, grid: [40, 88] };
  const b = new Batch(), trim = new Batch();
  const heights = JINMAO_TIERS;
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
  const body = b.mesh(mat, 'jinmao'); worldUV(body.geometry, 60, JINMAO_H);
  group.add(body, trim.mesh(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 1.55, 0.95) }), 'jinmao-trim'));
}

function ledTexture() {
  // a building-sized LED screen: the image drawn small, then shown as a grid of round pixels with dark
  // gaps between, a slight brightness falloff at the edges, so it reads as a screen in the façade
  const [src, sx] = makeCanvas(128, 64);
  const g = sx.createLinearGradient(0, 0, 128, 64);
  g.addColorStop(0, '#16307a'); g.addColorStop(1, '#3a1466');
  sx.fillStyle = g; sx.fillRect(0, 0, 128, 64);
  sx.fillStyle = '#fff'; sx.textAlign = 'center'; sx.textBaseline = 'middle';
  sx.font = `700 38px ${FONT.sans}`;
  sx.fillText('I', 27, 34); sx.fillText('SH', 99, 34);
  sx.fillStyle = '#ff3355'; sx.font = '38px sans-serif'; sx.fillText('♥', 54, 35);
  const px = sx.getImageData(0, 0, 128, 64).data;
  const [c, ctx] = makeCanvas(512, 256);
  ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, 512, 256);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 128; x++) {
    const i = (y * 128 + x) * 4, e = 0.82 + 0.18 * Math.min(1, Math.min(x, 127 - x, y * 2, (63 - y) * 2) / 10);
    ctx.fillStyle = `rgb(${(px[i] * e) | 0},${(px[i + 1] * e) | 0},${(px[i + 2] * e) | 0})`;
    ctx.beginPath(); ctx.arc(x * 4 + 2, y * 4 + 2, 1.45, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  for (let y = 0; y < 256; y += 32) ctx.fillRect(0, y, 512, 1);          // the cabinet joints
  for (let x = 0; x < 512; x += 64) ctx.fillRect(x, 0, 1, 256);
  return tex(c, { repeat: false, aniso: 8 });
}


// ---- night façades from the reference photos (Lujiazui from the Bund at blue hour) ----
// Many Lujiazui towers are not lit as windows at all but as architecture: every slab edge a gold
// line (the "gold bars" towers), whole faces of violet or green LED mesh, cyan edge lines.
// Texture space for these is in metres: 48 m across (16 bays of 3 m), 1024 m up (256 storeys of 4 m).
function bandTexture({ line = '#ffcd78', glass = '#140d05', haze = 'rgba(255,170,70,0.10)', seed = 1, skip = 0.03 }) {
  const [c, ctx] = makeCanvas(64, 1024), r = rng(seed);
  ctx.fillStyle = glass; ctx.fillRect(0, 0, 64, 1024);
  ctx.fillStyle = haze; ctx.fillRect(0, 0, 64, 1024);
  for (let row = 0; row < 256; row++) {
    const a = 0.7 + r() * 0.3;
    ctx.globalAlpha = a; ctx.fillStyle = line;
    for (let bay = 0; bay < 16; bay++) if (r() > skip) ctx.fillRect(bay * 4, row * 4, 4, 1.35);
    ctx.globalAlpha = 0.12 + r() * 0.1; ctx.fillRect(0, row * 4 + 1.35, 64, 0.8);       // the glow under each line
  }
  ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(0,0,0,0.35)';
  for (let x = 0; x < 64; x += 4) ctx.fillRect(x, 0, 0.6, 1024);                       // mullions
  return tex(c, { aniso: 8 });
}
// a full-façade LED mesh: points on a fine grid, colour graded up the tower, a few brighter bands
function meshTexture(bottom, top, { seed = 3, bands = 0.06, dark = '#06040c' } = {}) {
  const [c, ctx] = makeCanvas(64, 1024), r = rng(seed);
  ctx.fillStyle = dark; ctx.fillRect(0, 0, 64, 1024);
  const g = ctx.createLinearGradient(0, 1024, 0, 0); g.addColorStop(0, bottom); g.addColorStop(1, top);
  for (let row = 0; row < 256; row++) {
    const band = r() < bands;
    ctx.fillStyle = g; ctx.globalAlpha = band ? 1 : 0.55 + r() * 0.25;
    for (let x = 0; x < 64; x += 2) ctx.fillRect(x + 0.4, row * 4 + 0.5, 1.2, band ? 3 : 2.2);
  }
  ctx.globalAlpha = 1;
  return tex(c, { aniso: 8 });
}
// a box tower in façade metres (for band / mesh textures). Top and bottom go dark.
function metreTower(batch, x, z, w, d, h, y0 = 0, r = Math.random) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  const ou = Math.floor(r() * 16) / 16, ov = Math.floor(r() * 32) * 4 / 1024;
  const dims = [d, d, 0, 0, w, w];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
    const k = f * 4 + i;
    if (f === 2 || f === 3) uv.setXY(k, 0.03, 1 - 3 / 1024);                         // between two lines: dark
    else uv.setXY(k, ou + (uv.getX(k) * dims[f]) / 48, ov + (y0 + uv.getY(k) * h) / 1024);
  }
  g.translate(x, y0 + h / 2, z);
  batch.push(g);
}
// a thin lit bar from a to b (edge lines)
function bar(batch, a, b, t = 1.1) {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length();
  const g = new THREE.BoxGeometry(t, t, len);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  batch.push(g);
}
// the animated media façade (the Bund-facing LED walls): slow colour fields and a travelling sheen,
// drawn as an LED pixel grid so it never looks like a flat screen
function mediaMaterial(kind = 0) {
  const m = new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { time: { value: 0 }, kind: { value: kind } }]),
    vertexShader: /* glsl */ `
      varying vec3 vW; varying vec3 vN;
      #include <common>
      #include <fog_pars_vertex>
      void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; vN = normal;
        vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform float time; uniform float kind; uniform float todOn, todDay, todAmb; varying vec3 vW; varying vec3 vN;
      #include <common>
      #include <fog_pars_fragment>
      void main() {
        vec3 dull = vec3(0.36, 0.4, 0.46) * todDay * todAmb;           // switched off: dark glass, grey by day
        if (abs(vN.y) > 0.5) { gl_FragColor = vec4(vec3(0.01, 0.01, 0.02) + dull * 0.7, 1.0); return; }
        vec2 p = vec2(abs(vN.x) > 0.5 ? vW.z : vW.x, vW.y);
        vec2 cell = floor(p / 1.5), f = fract(p / 1.5) - 0.5;
        float led = smoothstep(0.42, 0.18, length(f));
        float t = time * 0.12;
        vec3 col;
        if (kind < 0.5) {
          // electric blue veins crawling over violet (the pavilion wall below the Pearl)
          float v = sin(cell.x * 0.21 + sin(cell.y * 0.13 + t * 3.0) * 2.0 + t * 4.0) * sin(cell.y * 0.17 - t * 2.0);
          float vein = smoothstep(0.82, 0.98, abs(v));
          col = mix(vec3(0.05, 0.04, 0.22), vec3(0.25, 0.3, 1.0), 0.5 + 0.5 * sin(cell.y * 0.05 + t)) + vec3(0.7, 0.85, 1.6) * vein;
        } else {
          // gold and magenta stripes sweeping up the tower
          float s = fract(cell.y * 0.035 - t * 0.8 + 0.15 * sin(cell.x * 0.3 + t));
          col = mix(vec3(1.2, 0.55, 0.12), vec3(1.0, 0.18, 0.75), smoothstep(0.3, 0.7, s)) * (0.45 + 0.55 * smoothstep(0.0, 0.2, s) * smoothstep(1.0, 0.8, s));
        }
        gl_FragColor = vec4(mix(vec3(0.02, 0.025, 0.035) + dull * (0.85 + 0.15 * led), col * (0.15 + 0.85 * led) * 1.2, todOn), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  Object.assign(m.uniforms, { todOn: TOD.media, todDay: TOD.day, todAmb: TOD.amb });
  return m;
}
// rooftop signs on Lujiazui towers, facing the Bund: the banks' own names in light
function signTexture(lines, colour, w = 1024, h = 256) {
  const [c, ctx] = makeCanvas(w, h);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = colour;
  ctx.shadowColor = colour; ctx.shadowBlur = 14;
  if (lines.length === 1) { ctx.font = `900 ${h * 0.72}px ${FONT.sans}`; ctx.fillText(lines[0], w / 2, h * 0.54); }
  else { ctx.font = `900 ${h * 0.5}px ${FONT.sans}`; ctx.fillText(lines[0], w / 2, h * 0.33); ctx.font = `800 ${h * 0.3}px ${FONT.sans}`; ctx.fillText(lines[1], w / 2, h * 0.78); }
  return tex(c, { repeat: false, aniso: 8 });
}
function sign(group, lines, colour, x, y, z, w, h, gain = 1.6) {
  const m = new THREE.MeshBasicMaterial({ map: signTexture(lines, colour), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  m.color.setScalar(gain);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  mesh.position.set(x, y, z); mesh.rotation.y = -Math.PI / 2;                          // faces west, across the river
  group.add(mesh);
  return mesh;
}
// a scrolling LED message band (the Shanghai Tower's crown, the waterfront screens)
function tickerTexture(text) {
  const [c, ctx] = makeCanvas(2048, 128);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 2048, 128);
  ctx.font = `800 92px ${FONT.sans}`; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
  const wd = ctx.measureText(text).width; let x = 0;
  while (x < 2048) { ctx.fillText(text, x, 68); x += wd + 120; }
  // LED pixels
  const img = ctx.getImageData(0, 0, 2048, 128);
  for (let y = 0; y < 128; y++) for (let xx = 0; xx < 2048; xx++) if ((xx % 6) > 3 || (y % 6) > 3) { const i = (y * 2048 + xx) * 4; img.data[i] *= 0.15; img.data[i + 1] *= 0.15; img.data[i + 2] *= 0.15; }
  ctx.putImageData(img, 0, 0);
  const t = tex(c, { aniso: 8 }); t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export function createSkyline() {
  const group = new THREE.Group(); group.name = 'pudong';
  const r = rng(2026);
  const cool = basic(towerAtlas(5, 0.2), 1.0), warm = basic(towerAtlas(6, 0.6), 1.0);
  const A = new Batch(), B = new Batch(), dark = new Batch(), accents = new Batch();

  // (each landmark's meshes are remembered: up close, world/lujiazui.js puts the three supertalls where they really stand)
  const landmarks = {}, HOME = { jinmao: [800, 205], swfc: [935, 285], tower: [860, 395] };
  const part = (name, fn) => { const n = group.children.length, out = fn(); landmarks[name] = group.children.slice(n); return out; };
  const pearlMat = part('pearl', () => buildPearl(group));
  part('jinmao', () => buildJinMao(group, ...HOME.jinmao));
  part('swfc', () => buildSWFC(group, ...HOME.swfc));
  const ticker = part('tower', () => buildShanghaiTower(group, ...HOME.tower));

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
  // how each is lit at night (from the reference photos): window grids, gold slab lines, cool white
  // slab lines, violet or green LED mesh. Index-matched to `anchors`; the filler draws from a mix.
  const looks = ['white', 'violet', 'win', 'win', 'gold', 'gold', 'gold', 'white', 'gold', 'violet', 'win', 'win',
    'white', 'gold', 'green', 'white', 'media2', 'green', 'white', 'gold', 'violet', 'win', 'win', 'win', 'win', 'white', 'win'];
  const M = {
    gold: new Batch(), white: new Batch(), violet: new Batch(), green: new Batch(), media: new Batch(), media2: new Batch(),
  };
  const edges = { cyan: new Batch(), magenta: new Batch() };
  const place = (look, x, z, w, d, h, crown) => {
    const target = look === 'win' ? (r() < 0.5 ? A : B) : M[look];
    const put = (xx, zz, ww, dd, hh, y0) => (look === 'win' ? tower(target, xx, zz, ww, dd, hh, r, y0) : metreTower(target, xx, zz, ww, dd, hh, y0, r));
    if (crown) { put(x, z, w, d, h * 0.86, 0); put(x, z, w * 0.62, d * 0.62, h * 0.14, h * 0.86); }
    else put(x, z, w, d, h, 0);
    const top = crown ? h : h, cw = crown ? w * 0.62 : w, cd = crown ? d * 0.62 : d;
    if (look === 'white' || (look === 'win' && r() < 0.3)) accents.box(x, top, z, cw + 1, 1.4, cd + 1);   // lit parapet
    if (look === 'white' && r() < 0.6) {                                                                 // cyan corner lines
      for (const [sx, sz] of [[-1, -1], [-1, 1]]) bar(edges.cyan, new THREE.Vector3(x + sx * (w / 2 + 0.3), 0, z + sz * (d / 2 + 0.3)), new THREE.Vector3(x + sx * (w / 2 + 0.3), crown ? h * 0.86 : h, z + sz * (d / 2 + 0.3)), 0.9);
    }
    if (look === 'violet') for (const [sx, sz] of [[-1, -1], [-1, 1]]) bar(edges.magenta, new THREE.Vector3(x + sx * (w / 2 + 0.3), 0, z + sz * (d / 2 + 0.3)), new THREE.Vector3(x + sx * (w / 2 + 0.3), crown ? h * 0.86 : h, z + sz * (d / 2 + 0.3)), 0.8);
  };
  anchors.forEach(([x, z, w, d, h], i) => {
    const crown = h > 140 && r() < 0.55 && !String(looks[i]).startsWith('media');
    place(looks[i] || 'win', x, z, w, d, h, crown);
    if (r() < 0.35) dark.cyl(x, h, z, 0.5, 2, 30 + r() * 30, 6);       // mast
  });
  // the banks' names on their towers, as the photos show them (facing the Bund)
  const roof = (i) => { const [x, z, w, , h] = anchors[i]; return { x: x - w / 2 - 0.6, y: h, z }; };
  { const a = roof(8); sign(group, ['中国银行'], '#ffe2a8', a.x, a.y - 9, a.z, 40, 10); }
  { const a = roof(6); sign(group, ['震旦'], '#ff2a22', a.x, a.y - 10, a.z, 30, 14, 2.2); }
  { const a = roof(1); sign(group, ['DBS', '星展银行'], '#ffffff', a.x, a.y - 9, a.z, 36, 13); }
  { const a = roof(3); sign(group, ['citi', '花旗银行'], '#cfe6ff', a.x, a.y - 9, a.z, 34, 13); }
  for (let i = 0; i < 46; i++) {
    const x = 520 + r() * 620, z = -900 + r() * 1800;
    if (Math.hypot(x - PEARL.x, z - PEARL.z) < 110) continue;
    if (x > 560 && x < 1010 && z > 130 && z < 470) continue;            // keep the supertall trio readable
    const h = 50 + r() * r() * 170 + (x - 520) * 0.1, w = 26 + r() * 26, k = r();
    place(k < 0.55 ? 'win' : k < 0.7 ? 'gold' : k < 0.85 ? 'white' : k < 0.93 ? 'violet' : 'green', x, z, w, w * (0.7 + r() * 0.5), h, false);
  }
  // the media pavilion at the Pearl's foot: blue veins crawling over violet LED (photo: under the Pearl)
  metreTower(M.media, 578, 6, 34, 46, 40, 0, r);
  // low riverside: tree line, river wall, the convention centre with its two globes
  dark.box(SHORE_X + 20, -3, 0, 60, 9, 2400);
  dark.box(SHORE_X + 30, 6, 0, 30, 9, 2400);
  tower(B, 560, -120, 40, 150, 34, r);
  const globes = new Batch();
  for (const gz of [-185, -55]) globes.add(new THREE.SphereGeometry(24, 20, 14), { x: 545, y: 30, z: gz });
  {
    const [gc, gx] = makeCanvas(512, 256);
    gx.fillStyle = '#04241c'; gx.fillRect(0, 0, 512, 256);
    const gg = gx.createLinearGradient(0, 256, 0, 0); gg.addColorStop(0, 'rgba(120,255,210,0.55)'); gg.addColorStop(1, 'rgba(60,200,170,0.15)');
    gx.fillStyle = gg; gx.fillRect(0, 0, 512, 256);
    gx.strokeStyle = 'rgba(190,255,235,0.95)'; gx.lineWidth = 2;
    for (let u = 0; u <= 512; u += 512 / 24) { gx.beginPath(); gx.moveTo(u, 0); gx.lineTo(u, 256); gx.stroke(); }
    for (let v = 0; v <= 256; v += 256 / 12) { gx.beginPath(); gx.moveTo(0, v); gx.lineTo(512, v); gx.stroke(); }
    group.add(globes.mesh(basic(tex(gc, { aniso: 8 }), 1.15), 'globes'));
  }
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
  const media = [mediaMaterial(0), mediaMaterial(1)];
  const mats = {
    gold: basic(bandTexture({ line: '#ffc35e', glass: '#170e04', seed: 11 }), 1.3),
    white: basic(bandTexture({ line: '#dbe9ff', glass: '#08101f', haze: 'rgba(110,150,255,0.08)', seed: 12 }), 1.1),
    violet: basic(meshTexture('#6a2cff', '#ff4ed6', { seed: 13 }), 1.25),
    green: basic(meshTexture('#18c870', '#c4ff70', { seed: 14, bands: 0.1 }), 1.0),
  };
  for (const k of Object.keys(mats)) if (M[k].list.length) group.add(M[k].mesh(mats[k], `towers-${k}`));
  // the tall one in the anchors list gets the gold-magenta sweep; the pavilion the blue veins
  group.add(M.media.mesh(media[0], 'towers-media'), M.media2.mesh(media[1], 'towers-media2'));
  group.add(edges.cyan.mesh(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.45, 1.3, 2.6) }), 'edges-cyan'));
  group.add(edges.magenta.mesh(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.5, 2.0) }), 'edges-magenta'));
  group.add(dark.mesh(new THREE.MeshBasicMaterial({ color: 0x0a0f18 }), 'shore'));
  group.add(accents.mesh(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 1.0, 1.5) }), 'accents'));

  group.traverse((o) => { o.layers.enable(REFLECT_LAYER); o.matrixAutoUpdate = false; o.updateMatrix(); });
  // by day: the window atlases become hazy glass (each tower its own tint), the lit trims and names
  // dull fixtures, the far bank's lamps and the aircraft lights off; the LED walls are their own
  // (a sunny day: blue-green and bronze glass, steel-grey Jin Mao, white stone, not one pale grey)
  // (by day Lujiazui is mostly blue-grey and silver curtain wall; the night palettes' tints only a hint)
  const DAY_GLASS = { 'towers-a': [0.26, 0.36, 0.46], 'towers-b': [0.36, 0.36, 0.37], 'towers-gold': [0.42, 0.4, 0.36], 'towers-white': [0.48, 0.52, 0.56],
    'towers-violet': [0.3, 0.35, 0.44], 'towers-green': [0.27, 0.35, 0.38], jinmao: [0.34, 0.36, 0.4], 'swfc-top': [0.36, 0.48, 0.6], globes: [0.62, 0.66, 0.72], shore: [0.26, 0.3, 0.24] };
  // the curtain wall's bays and floors in each atlas's own units (tower(): 3 m x 4 m cells, 64 to the
  // atlas; metreTower(): 16 bays across, 256 storeys up)
  const GRID = { 'towers-a': [64, 64], 'towers-b': [64, 64], 'towers-gold': [16, 256], 'towers-white': [16, 256], 'towers-violet': [16, 256], 'towers-green': [16, 256] };
  asLight(led.material, 'screens', 0.12);   // a big screen: on all day (7 am - 11 pm), not with the LED façades' evening show
  group.traverse((o) => {
    if (!o.material || o.material.userData.tod) return;
    const m = o.material;
    const gl = m.userData.glass || {};
    if (m.isMeshBasicMaterial && !m.transparent && m.blending !== THREE.AdditiveBlending && (m.map || DAY_GLASS[o.name])) skylineGlass(m, gl.day || DAY_GLASS[o.name] || [0.46, 0.53, 0.6], gl.f0 ?? 0.2, { grid: gl.grid || GRID[o.name] });
    else if (m.isMeshBasicMaterial || m.isPointsMaterial) asLight(m, 'outline', 0.3);
  });

  // the Pearl's lattice changes colour through the evening: pink, violet, deep blue, magenta (as in the
  // photos), each held a while and blended across a few seconds
  const palette = [new THREE.Color(1, 1, 1), new THREE.Color(0.78, 0.72, 1.45), new THREE.Color(0.32, 0.58, 1.9), new THREE.Color(1.25, 0.7, 1.1)];
  return {
    group,
    // In Pudong (world/lujiazui.js): the far skyline is arranged for the view from the Bund. Up close
    // the Pearl stays where it is, the three supertalls move to their real places (at: { jinmao, swfc,
    // tower } as { x, z }) and the generic far towers are hidden: the district draws its own. Off:
    // exactly as built.
    setNear(on, at = {}) {
      const kept = new Set(Object.values(landmarks).flat());
      for (const o of group.children) if (!kept.has(o)) o.visible = !on;
      for (const k of Object.keys(HOME)) for (const o of landmarks[k]) {
        const p = on ? at[k] : null, h = o.userData.home || (o.userData.home = o.position.clone());
        o.position.set(h.x + (p ? p.x - HOME[k][0] : 0), h.y, h.z + (p ? p.z - HOME[k][1] : 0)); o.updateMatrix();
      }
    },
    // the hour: the Pearl's show runs with the LED walls; late at night it holds a dim glow
    setTime(st) { PEARL_LIGHT.value = Math.max(st.media, 0.35 * st.outline); },
    update(t) {
      const k = t / 24, i = Math.floor(k) % palette.length, f = THREE.MathUtils.smoothstep(k - Math.floor(k), 0.75, 1);
      pearlMat.emissive.lerpColors(palette[i], palette[(i + 1) % palette.length], f).multiplyScalar(PEARL_LIGHT.value);
      for (const m of media) m.uniforms.time.value = t;
      ticker.offset.x = (t * 0.018) % 1;
    },
  };
}
