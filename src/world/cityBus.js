// A Shanghai city bus, built as a real vehicle rather than a stack of boxes: a 12 m low-floor
// electric single-decker (the type that runs the Bund routes), the body a hollow shell you can see
// into, painted the way a bus is painted.
//
//  - Paint: one MeshPhysicalMaterial for the whole shell. Solid pearl white under a clear coat
//    (base roughness ~0.4, clear coat ~0.1), the green skirt a metallic green, both reflecting the
//    captured street (scene.environment). The livery is a painted texture atlas, not flat colours:
//    the green swoosh and its lime accent, the black-out band, panel seams and service-flap lines
//    (also in the bump map), rubber arch trims, fleet name and BEV marks, and the grime a bus wears:
//    darker and rougher toward the sills, road spray behind each wheel, streaks under the windows.
//  - Glass: bonded panes with a black ceramic frit border, tinted, reflective, the lit cabin behind
//    them (floor, blue seats, yellow stanchions, ceiling light strips that brighten at dusk).
//  - Rubber: window seals, beltline and gutter strips, bumpers, mud flaps; the ram's-horn mirrors.
//  - Wheels: 22.5" steel disc wheels (ten studs, hub cap) in dark tyres, drawn by the traffic
//    instancer (vehicles.js).
// Kerb side = the bus's right = -x. Nose toward +z, origin at the centre of the footprint, on the ground.
// The livery is generic, not any one operator's.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeCanvas, tex, FONT, rng } from './canvas.js';
import { TOD, asLight } from './dayNight.js';

// heights (m)
const Y_SKIRT = 0.28, Y_FLOOR = 0.38, Y_BELT = 1.15, Y_GLASS = 2.45, Y_ROOF = 2.98, Y_WHEEL = 0.5;
const CR = 0.12;                  // plan-view corner radius
const AR = 0.6;                   // wheel-arch radius
const HM = 3.2;                   // metres of height an atlas side / front / rear region covers

// ---------------------------------------------------------------- the livery atlas
// one 2048² colour canvas; the detail (R bump, G roughness, B metalness) and clear-coat
// (R amount, G roughness) canvases share its layout at half resolution
const CW = 2048;
const RG = {
  road: { x: 0, y: 0, w: 2048, h: 560 }, kerb: { x: 0, y: 560, w: 2048, h: 560 },
  front: { x: 0, y: 1120, w: 640, h: 800 }, rear: { x: 640, y: 1120, w: 640, h: 800 },
  roof: { x: 1280, y: 1120, w: 768, h: 800 }, dark: { x: 0, y: 1920, w: 2048, h: 128 },
};
const PAL = {
  color:  { paint: '#eceeeb', roof: '#dcdedb', green: '#0f6e55', accent: '#86c440', black: '#0a0c0d', rubber: '#141516', seam: 'rgba(40,46,48,0.6)', latch: 'rgba(30,32,34,0.75)' },
  detail: { paint: 'rgb(128,105,0)', roof: 'rgb(128,140,0)', green: 'rgb(128,100,90)', accent: 'rgb(128,105,0)', black: 'rgb(128,60,0)', rubber: 'rgb(128,228,0)', seam: 'rgb(25,125,0)', latch: 'rgb(60,150,0)' },
  coat:   { paint: 'rgb(255,80,0)', roof: 'rgb(200,140,0)', green: 'rgb(255,80,0)', accent: 'rgb(255,80,0)', black: 'rgb(255,60,0)', rubber: 'rgb(0,255,0)', seam: 'rgb(150,170,0)', latch: 'rgb(60,200,0)' },
};
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function wheelZs(spec) { const zf = spec.len / 2 - 2.45; return [zf, zf - spec.wheelbase]; }
function doorZs(spec) { return [spec.len / 2 - 1.1, -0.35]; }
// window bays along one side: [z0, z1] pairs (front to back), glazed
function bays(spec, s) {
  const hl = spec.len / 2, [dF, dM] = doorZs(spec), out = [];
  const split = (a, b, w) => { const n = Math.max(1, Math.round((b - a) / w)); for (let i = 0; i < n; i++) out.push([b - (i + 1) * (b - a) / n, b - i * (b - a) / n]); };
  if (s > 0) { out.push([hl - 1.5, hl - CR - 0.05]); split(-hl + CR + 0.05, hl - 1.5, 1.45); }      // driver's window, then the saloon
  else { out.push([dF + 0.62, hl - CR - 0.05]); split(dM + 0.62, dF - 0.62, 1.4); split(-hl + CR + 0.05, dM - 0.62, 1.35); }
  return out;
}
// the green skirt's top edge along the side (z in m): low at the nose, sweeping up toward the tail
const skirtTop = (z, hl) => 0.6 + 0.08 * smooth(hl - 0.9, hl, z) - 0.03 * smooth(4.5, 3.4, z) * smooth(1.5, 2.6, z) + 0.36 * smooth(0.8, -hl + 0.4, z);

function drawAtlas(mode, spec) {
  const scale = mode === 'color' ? 1 : 0.5, P = PAL[mode];
  const [cv, c] = makeCanvas(CW * scale, CW * scale);
  c.scale(scale, scale);
  const hl = spec.len / 2, hw = spec.width / 2, Ln = spec.len, W = spec.width, r = rng(mode === 'color' ? 7 : 7);
  const fill = (rect, col) => { c.fillStyle = col; c.fillRect(rect.x, rect.y, rect.w, rect.h); };
  for (const k of ['road', 'kerb', 'front', 'rear']) fill(RG[k], P.paint);
  fill(RG.roof, P.roof); fill(RG.dark, P.rubber);
  // grime: darker (colour) / rougher, less clear coat (detail, coat) toward the bottom
  const grime = (x0, x1, Y, top = 0.95, k = 1) => {
    const g = c.createLinearGradient(0, Y(0), 0, Y(top));
    if (mode === 'color') { g.addColorStop(0, `rgba(${150 - 30 * k},${140 - 30 * k},${120 - 28 * k},1)`); g.addColorStop(0.35, 'rgb(214,208,196)'); g.addColorStop(1, 'rgb(255,255,255)'); c.globalCompositeOperation = 'multiply'; }
    else if (mode === 'detail') { g.addColorStop(0, `rgba(128,185,0,${0.75 * k})`); g.addColorStop(1, 'rgba(128,185,0,0)'); }
    else { g.addColorStop(0, `rgba(120,255,0,${0.7 * k})`); g.addColorStop(1, 'rgba(120,255,0,0)'); }
    c.fillStyle = g; c.fillRect(x0, Y(top), x1 - x0, Y(0) - Y(top)); c.globalCompositeOperation = 'source-over';
  };
  const spray = (x, y, rad, k = 1) => {
    const g = c.createRadialGradient(x, y, 0, x, y, rad);
    if (mode === 'color') { g.addColorStop(0, `rgb(${170 - 40 * k},${160 - 40 * k},${140 - 36 * k})`); g.addColorStop(1, 'rgb(255,255,255)'); c.globalCompositeOperation = 'multiply'; }
    else if (mode === 'detail') { g.addColorStop(0, `rgba(128,200,0,${0.6 * k})`); g.addColorStop(1, 'rgba(128,200,0,0)'); }
    else { g.addColorStop(0, `rgba(100,255,0,${0.6 * k})`); g.addColorStop(1, 'rgba(100,255,0,0)'); }
    c.fillStyle = g; c.fillRect(x - rad, y - rad, rad * 2, rad * 2); c.globalCompositeOperation = 'source-over';
  };
  const text = (str, x, y, px, col, weight = 800, align = 'left', font = FONT.sans) => {
    if (mode !== 'color') return;
    c.fillStyle = col; c.font = `${weight} ${px}px ${font}`; c.textAlign = align; c.textBaseline = 'alphabetic'; c.fillText(str, x, y);
  };

  // ---- the two sides
  for (const s of [1, -1]) {
    const R = s > 0 ? RG.road : RG.kerb;
    const X = (z) => R.x + (s > 0 ? hl - z : z + hl) / Ln * R.w, Y = (y) => R.y + (1 - y / HM) * R.h, mz = R.w / Ln, my = R.h / HM;
    c.save(); c.beginPath(); c.rect(R.x, R.y, R.w, R.h); c.clip();
    // green swoosh, a white gap, the lime accent
    const curve = (off) => { for (let i = 0; i <= 60; i++) { const z = hl - (i / 60) * Ln; c.lineTo(X(z), Y(skirtTop(z, hl) + off)); } };
    c.fillStyle = P.accent; c.beginPath(); c.moveTo(X(hl), Y(0)); curve(0.085); c.lineTo(X(-hl), Y(0)); c.closePath(); c.fill();
    c.fillStyle = P.paint; c.beginPath(); c.moveTo(X(hl), Y(0)); curve(0.05); c.lineTo(X(-hl), Y(0)); c.closePath(); c.fill();
    c.fillStyle = P.green; c.beginPath(); c.moveTo(X(hl), Y(0)); curve(0); c.lineTo(X(-hl), Y(0)); c.closePath(); c.fill();
    // the black-out band behind the glass, and the rubber at its foot
    c.fillStyle = P.black; c.fillRect(R.x, Y(Y_GLASS + 0.02), R.w, (Y_GLASS + 0.02 - Y_BELT + 0.01) * my);
    c.fillStyle = P.rubber; c.fillRect(R.x, Y(Y_BELT + 0.01), R.w, 0.035 * my);
    // panel seams: vertical joints at the pillars, the service flaps' line along the skirt, latches
    c.fillStyle = P.seam;
    const joints = [hl - CR - 0.02, -hl + CR + 0.02];
    for (const [a, b] of bays(spec, s)) joints.push(a, b);
    for (const z of joints) c.fillRect(X(z) - 2, Y(Y_BELT), 4, (Y_BELT - Y_SKIRT) * my);
    const [wf, wr] = wheelZs(spec);
    for (const [a, b] of [[wf - AR - 0.1, hl - CR], [wr + AR + 0.1, wf - AR - 0.1], [-hl + CR, wr - AR - 0.1]]) {
      const x0 = Math.min(X(a), X(b)), x1 = Math.max(X(a), X(b));
      c.fillRect(x0, Y(0.66) - 2, x1 - x0, 4);
      c.fillStyle = P.latch; for (let z = Math.min(a, b) + 0.5; z < Math.max(a, b) - 0.3; z += 1.6) c.fillRect(X(z) - 0.06 * mz, Y(0.6), 0.12 * mz, 0.025 * my);
      c.fillStyle = P.seam;
    }
    c.fillRect(R.x, Y(2.62) - 1.5, R.w, 3);                                  // the roof skin's joint above the windows
    // wheel arches: black inside, a rubber trim round the edge, spray behind
    for (const wz of [wf, wr]) {
      spray(X(wz - 0.75), Y(0.45), 1.0 * mz, 1);                         // road spray thrown back off the tyre
      spray(X(wz), Y(0.55), 0.9 * mz, 0.5);
      c.fillStyle = P.rubber; c.beginPath(); c.arc(X(wz), Y(Y_WHEEL), (AR + 0.06) * mz, 0, Math.PI * 2); c.fill();
      c.fillStyle = P.black; c.beginPath(); c.arc(X(wz), Y(Y_WHEEL), AR * mz, 0, Math.PI * 2); c.fill();
    }
    // the doors' frames (kerb side): black rubber surrounds
    if (s < 0) for (const dz of doorZs(spec)) { c.fillStyle = P.rubber; c.fillRect(Math.min(X(dz - 0.66), X(dz + 0.66)), Y(Y_GLASS), 1.32 * mz, (Y_GLASS - Y_SKIRT) * my); }
    // marks: fleet name toward the front, BEV on the skirt toward the tail, the fleet number over the door
    const nameZ = 2.75, al = s > 0 ? 'left' : 'right';                     // just behind the front arch, reading toward the tail
    text('城市公交', X(nameZ), Y(0.88), 0.2 * my, '#0f6e55', 900, al);
    text('CITY BUS', X(nameZ), Y(0.75), 0.085 * my, '#0f6e55', 700, al, '"Inter", sans-serif');
    text('纯电动  BEV', X(-hl + 1.6), Y(0.42), 0.12 * my, 'rgba(255,255,255,0.92)', 800, 'center');
    text('S2-0517', X(hl - 0.9), Y(2.72), 0.08 * my, '#30363a', 700, 'center', '"Inter", sans-serif');
    if (s < 0 && mode === 'color') {                                         // the accessible-door pictogram beside the middle door
      const px = X(doorZs(spec)[1] - 0.85), py = Y(1.02), sz = 0.15 * my;
      c.fillStyle = '#1f5fae'; c.fillRect(px - sz / 2, py - sz / 2, sz, sz);
      c.strokeStyle = '#fff'; c.fillStyle = '#fff'; c.lineWidth = sz * 0.09;
      c.beginPath(); c.arc(px - sz * 0.02, py - sz * 0.3, sz * 0.08, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(px - sz * 0.05, py - sz * 0.18); c.lineTo(px - sz * 0.05, py + sz * 0.05); c.lineTo(px + sz * 0.18, py + sz * 0.05); c.lineTo(px + sz * 0.26, py + sz * 0.3); c.stroke();
      c.beginPath(); c.arc(px - sz * 0.03, py + sz * 0.15, sz * 0.2, 0.2 * Math.PI, 1.6 * Math.PI); c.stroke();
    }
    // grime, and streaks running down from the window corners
    grime(R.x, R.x + R.w, Y, 1.0, 1);
    if (mode === 'color') {
      c.globalCompositeOperation = 'multiply';
      for (const [a, b] of bays(spec, s)) for (const z of [a + 0.05, b - 0.05, (a + b) / 2 + (r() - 0.5) * 0.4]) {
        const len = 0.15 + r() * 0.5, g = c.createLinearGradient(0, Y(Y_BELT), 0, Y(Y_BELT - len));
        g.addColorStop(0, 'rgb(205,200,190)'); g.addColorStop(1, 'rgb(255,255,255)');
        c.fillStyle = g; c.fillRect(X(z) - 1.5 - r() * 2, Y(Y_BELT - 0.02), 2 + r() * 3, len * my);
      }
      c.globalCompositeOperation = 'source-over';
    }
    c.restore();
  }

  // ---- the front: windscreen black-out, sign recess, the green continued round the nose
  {
    const R = RG.front, X = (x) => R.x + (x + hw) / W * R.w, Y = (y) => R.y + (1 - y / HM) * R.h, mx = R.w / W, my = R.h / HM;
    c.save(); c.beginPath(); c.rect(R.x, R.y, R.w, R.h); c.clip();
    const band = (off) => { for (let i = 0; i <= 30; i++) { const x = -hw + (i / 30) * W, e = Math.pow(Math.abs(x) / hw, 2.2); c.lineTo(X(x), Y(0.44 + 0.24 * e + off)); } };
    c.fillStyle = P.accent; c.beginPath(); c.moveTo(X(-hw), Y(0)); band(0.085); c.lineTo(X(hw), Y(0)); c.closePath(); c.fill();
    c.fillStyle = P.paint; c.beginPath(); c.moveTo(X(-hw), Y(0)); band(0.05); c.lineTo(X(hw), Y(0)); c.closePath(); c.fill();
    c.fillStyle = P.green; c.beginPath(); c.moveTo(X(-hw), Y(0)); band(0); c.lineTo(X(hw), Y(0)); c.closePath(); c.fill();
    c.fillStyle = P.black; c.fillRect(R.x, Y(Y_GLASS + 0.04), R.w, (Y_GLASS + 0.04 - 0.98) * my);
    c.fillRect(X(-hw + 0.2), Y(2.94), (W - 0.4) * mx, 0.38 * my);
    c.strokeStyle = P.seam; c.lineWidth = 4; c.strokeRect(X(-0.75), Y(0.92), 1.5 * mx, 0.36 * my);         // the service hatch
    c.fillStyle = P.black; for (const sx of [-1, 1]) c.fillRect(X(sx * (hw - 0.36)) - 0.24 * mx, Y(0.74), 0.48 * mx, 0.2 * my);   // lamp recesses
    if (mode === 'color') { const g = c.createLinearGradient(0, Y(0.86), 0, Y(0.8)); g.addColorStop(0, '#f4f6f7'); g.addColorStop(0.5, '#8d959b'); g.addColorStop(1, '#e3e7ea'); c.fillStyle = g; c.fillRect(X(-0.32), Y(0.86), 0.64 * mx, 0.06 * my); }
    text('纯电动', X(0), Y(0.62), 0.07 * my, 'rgba(255,255,255,0.9)', 800, 'center');
    grime(R.x, R.x + R.w, Y, 0.9, 0.8);
    c.restore();
  }
  // ---- the rear: window, the battery / motor bay grille and its hatch, heavy grime
  {
    const R = RG.rear, X = (x) => R.x + (hw - x) / W * R.w, Y = (y) => R.y + (1 - y / HM) * R.h, mx = R.w / W, my = R.h / HM;
    c.save(); c.beginPath(); c.rect(R.x, R.y, R.w, R.h); c.clip();
    c.fillStyle = P.accent; c.fillRect(R.x, Y(0.7), R.w, 0.03 * my);
    c.fillStyle = P.green; c.fillRect(R.x, Y(0.64), R.w, 0.64 * my);
    c.fillStyle = P.black; c.fillRect(R.x, Y(Y_GLASS + 0.03), R.w, (Y_GLASS + 0.03 - 1.55) * my);
    c.fillRect(X(hw - 0.3), Y(2.92), (W - 0.6) * mx, 0.34 * my);
    c.strokeStyle = P.seam; c.lineWidth = 4; c.strokeRect(X(0.95), Y(1.46), 1.9 * mx, 0.74 * my);
    c.fillStyle = P.rubber; for (let y = 0.82; y < 1.36; y += 0.045) c.fillRect(X(0.7), Y(y), 1.4 * mx, 0.022 * my);
    for (const sx of [-1, 1]) { c.fillStyle = P.black; c.fillRect(X(sx * (hw - 0.12)) - 0.1 * mx, Y(1.05), 0.2 * mx, 0.6 * my); }
    grime(R.x, R.x + R.w, Y, 1.4, 1.2);
    c.restore();
  }
  // ---- the roof: weathered, streaked toward the edges
  {
    const R = RG.roof;
    if (mode === 'color') {
      c.globalCompositeOperation = 'multiply';
      for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(${200 + r() * 40},${196 + r() * 40},${188 + r() * 40},1)`; c.fillRect(R.x + r() * R.w, R.y, 2 + r() * 6, R.h); }
      const g = c.createLinearGradient(R.x, 0, R.x + R.w, 0); g.addColorStop(0, 'rgb(190,185,175)'); g.addColorStop(0.15, 'rgb(255,255,255)'); g.addColorStop(0.85, 'rgb(255,255,255)'); g.addColorStop(1, 'rgb(190,185,175)');
      c.fillStyle = g; c.fillRect(R.x, R.y, R.w, R.h); c.globalCompositeOperation = 'source-over';
    }
  }
  if (mode === 'color') {                                                    // fine grain over everything: paint, not plastic
    const img = c.getImageData(0, 0, CW, CW), d = img.data, rr = rng(11);
    for (let i = 0; i < d.length; i += 4) { const n = (rr() - 0.5) * 7; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    c.putImageData(img, 0, 0);
  }
  return tex(cv, { srgb: mode === 'color', repeat: false });
}

// frit-bordered glass: black ceramic edge (opaque) round a tinted, see-through middle
function fritTexture(kind) {
  const [cv, c] = makeCanvas(512, 512);
  c.scale(2, 2);
  c.fillStyle = 'rgba(16,24,28,0.68)'; c.fillRect(0, 0, 256, 256);
  const edge = (t, b, l, r) => {
    c.fillStyle = '#07090a'; c.fillRect(0, 0, 256, t); c.fillRect(0, 256 - b, 256, b); c.fillRect(0, 0, l, 256); c.fillRect(256 - r, 0, r, 256);
    // the dot-matrix fade inboard of the solid band
    const dot = (x, y, k) => { c.beginPath(); c.arc(x, y, k, 0, Math.PI * 2); c.fill(); };
    for (let i = 0; i < 5; i++) { const k = 1.1 - i * 0.2; c.fillStyle = '#07090a';
      for (let x = l + 1 + i * 2.5; x < 256 - r - i * 2.5; x += 2.5) { dot(x, t + 1 + i * 2.5, k); dot(x, 256 - b - 1.5 - i * 2.5, k); }
      for (let y = t + i * 2.5; y < 256 - b - i * 2.5; y += 2.5) { dot(l + 1 + i * 2.5, y, k); dot(256 - r - 1.5 - i * 2.5, y, k); } }
  };
  if (kind === 'screen') edge(46, 14, 10, 10);
  else if (kind === 'door') { edge(14, 14, 22, 22); c.fillStyle = '#07090a'; c.fillRect(0, 120, 256, 14); }
  else edge(14, 12, 12, 12);
  const t = tex(cv, { repeat: false });
  return t;
}

// planar atlas UVs by each face's dominant direction (bus space, after the geometry is in place)
function atlasUV(geo, spec, { edgeToSide = false } = {}) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const p = g.attributes.position, uv = new Float32Array(p.count * 2), hl = spec.len / 2, hw = spec.width / 2;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3(), e = new THREE.Vector3();
  const put = (i, region, v) => {
    const R = RG[region]; let px, py;
    if (region === 'road') { px = R.x + (hl - v.z) / spec.len * R.w; py = R.y + (1 - v.y / HM) * R.h; }
    else if (region === 'kerb') { px = R.x + (v.z + hl) / spec.len * R.w; py = R.y + (1 - v.y / HM) * R.h; }
    else if (region === 'front') { px = R.x + (v.x + hw) / spec.width * R.w; py = R.y + (1 - v.y / HM) * R.h; }
    else if (region === 'rear') { px = R.x + (hw - v.x) / spec.width * R.w; py = R.y + (1 - v.y / HM) * R.h; }
    else if (region === 'roof') { px = R.x + (v.x + hw) / spec.width * R.w; py = R.y + (1 - (v.z + hl) / spec.len) * R.h; }
    else { px = R.x + R.w / 2; py = R.y + R.h / 2; }
    uv[i * 2] = px / CW; uv[i * 2 + 1] = 1 - py / CW;
  };
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    n.subVectors(b, a).cross(e.subVectors(c, a)).normalize();
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z), cx = (a.x + b.x + c.x) / 3, cy = (a.y + b.y + c.y) / 3;
    let region;
    if (ax >= ay && ax >= az) region = n.x > 0 ? 'road' : 'kerb';
    else if (edgeToSide) region = cx > 0 ? 'road' : 'kerb';
    else if (ay >= az) region = n.y > 0 && cy > 2.3 ? 'roof' : 'dark';
    else region = n.z > 0 ? 'front' : 'rear';
    put(i, region, a); put(i + 1, region, b); put(i + 2, region, c);
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

// keep only position / normal / uv / color so pieces from different generators merge
function clean(g, keep = ['position', 'normal', 'uv']) {
  let out = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(out.attributes)) if (!keep.includes(k)) out.deleteAttribute(k);
  return out;
}
const boxAt = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
function painted(g, rgb) {                                  // vertex colour for the cabin's merged geometry
  g = clean(g, ['position', 'normal']);
  const c = new THREE.Color(rgb), a = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < a.length; i += 3) { a[i] = c.r; a[i + 1] = c.g; a[i + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}

// ---------------------------------------------------------------- shared materials (built once)
let SHARED = null;
function shared(spec) {
  if (SHARED) return SHARED;
  const atlas = drawAtlas('color', spec), detail = drawAtlas('detail', spec), coat = drawAtlas('coat', spec);
  const paint = new THREE.MeshPhysicalMaterial({
    map: atlas, roughness: 1, roughnessMap: detail, metalness: 1, metalnessMap: detail, bumpMap: detail, bumpScale: 2.2,
    clearcoat: 1, clearcoatMap: coat, clearcoatRoughness: 0.32, clearcoatRoughnessMap: coat, envMapIntensity: 1.2,
  });
  paint.name = 'bus-paint';
  const rubber = new THREE.MeshStandardMaterial({ color: 0x0f1011, roughness: 0.82, metalness: 0, envMapIntensity: 0.5, name: 'bus-rubber' });
  const glassOpts = { color: 0xffffff, transparent: true, depthWrite: false, roughness: 0.03, metalness: 0, envMapIntensity: 2.2, side: THREE.DoubleSide };
  const glass = new THREE.MeshStandardMaterial({ ...glassOpts, map: fritTexture('pane'), name: 'bus-glass' });
  const screen = new THREE.MeshStandardMaterial({ ...glassOpts, map: fritTexture('screen'), name: 'bus-screen' });
  const doorGlass = new THREE.MeshStandardMaterial({ ...glassOpts, map: fritTexture('door'), name: 'bus-door' });
  const mirror = new THREE.MeshStandardMaterial({ color: 0xc9ced2, metalness: 1, roughness: 0.08, name: 'bus-mirror' });
  // the cabin: its own colours, lit by its strip lights (brighter as the street lamps come on)
  const cabin = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0, name: 'bus-cabin' });
  cabin.onBeforeCompile = (sh) => {
    sh.uniforms.todLamps = TOD.lamps;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float todLamps;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance = vColor.rgb * (0.16 + 0.5 * todLamps);');
  };
  cabin.customProgramCacheKey = () => 'bus-cabin';
  const strip = asLight(new THREE.MeshBasicMaterial({ color: new THREE.Color(1.7, 1.68, 1.55), name: 'bus-strip' }), 'lamps', 0.55);
  SHARED = { paint, rubber, glass, screen, doorGlass, mirror, cabin, strip };
  return SHARED;
}

// ---------------------------------------------------------------- wheels (instanced by vehicles.js)
let WHEEL = null;
export function busWheelParts() {
  if (WHEEL) return WHEEL;
  const tyreProfile = [[0.288, -0.135], [0.4, -0.148], [0.468, -0.14], [0.494, -0.115], [0.5, -0.08], [0.5, 0.08], [0.494, 0.115], [0.468, 0.14], [0.4, 0.148], [0.288, 0.135]];
  const tyre = new THREE.LatheGeometry(tyreProfile.map(([r, x]) => new THREE.Vector2(r, x)), 28);
  const back = new THREE.CircleGeometry(0.29, 20).rotateY(-Math.PI / 2).translate(-0.1, 0, 0);   // the inboard side, closed
  const toAxle = (g) => g.rotateZ(-Math.PI / 2);                                          // lathe axis (y) -> axle (x)
  const dark = [clean(toAxle(tyre)), clean(back)];
  for (let i = 0; i < 8; i++) {                                                          // hand-holes in the disc (dark: see-through to the drum)
    const a = ((i + 0.5) / 8) * Math.PI * 2, h = new THREE.CylinderGeometry(0.026, 0.026, 0.012, 10).rotateZ(Math.PI / 2).translate(0.07, Math.cos(a) * 0.19, Math.sin(a) * 0.19);
    dark.push(clean(h));
  }
  const tyreG = mergeGeometries(dark, false);
  // the steel disc: rim lip, dished face, ten studs, the hub cap
  const disc = new THREE.LatheGeometry([[0.29, 0.128], [0.284, 0.118], [0.262, 0.1], [0.22, 0.072], [0.17, 0.066], [0.12, 0.076], [0.09, 0.092], [0.0, 0.092]].map(([r, x]) => new THREE.Vector2(r, x)), 28);
  const parts = [clean(toAxle(disc))];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2, stud = new THREE.CylinderGeometry(0.014, 0.016, 0.03, 6).rotateZ(Math.PI / 2).translate(0.105, Math.cos(a) * 0.112, Math.sin(a) * 0.112);
    parts.push(clean(stud));
  }
  const cap = new THREE.SphereGeometry(0.075, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ(-Math.PI / 2).scale(0.55, 1, 1).translate(0.09, 0, 0);
  parts.push(clean(cap));
  const hubG = mergeGeometries(parts, false);
  WHEEL = {
    tyre: tyreG, hub: hubG,
    rubber: new THREE.MeshStandardMaterial({ color: 0x151617, roughness: 0.9, metalness: 0, side: THREE.DoubleSide, name: 'bus-tyre' }),
    metal: new THREE.MeshStandardMaterial({ color: 0xa9adb1, roughness: 0.38, metalness: 0.85, side: THREE.DoubleSide, name: 'bus-hub' }),
  };
  return WHEEL;
}

// ---------------------------------------------------------------- the bus
// opts: { headMat, tailRun, tailBrake, ledSign(text, w, h, small), makeWheel() -> pivot }
export function buildCityBus(spec, { headMat, tailRun, tailBrake, ledSign, makeWheel }) {
  const M = shared(spec);
  const g = new THREE.Group(), Ln = spec.len, W = spec.width, hl = Ln / 2, hw = W / 2;
  const [wf, wr] = wheelZs(spec), [dF, dM] = doorZs(spec);
  const paintG = [], rubberG = [], glassG = [], screenG = [], cabinG = [], mirrorG = [];

  // ---- side plates below the windows: arches cut out, and the doorways on the kerb side
  const plate = (s, z0, z1) => {
    // shape space: x = -z (so the extrusion, turned a quarter about y, runs along +x), y = y
    const sh = new THREE.Shape(), pts = [];
    pts.push([z0, Y_SKIRT]);
    for (const wz of [wr, wf]) {
      if (wz - AR < z0 || wz + AR > z1) continue;
      const a0 = Math.PI + Math.asin((Y_WHEEL - Y_SKIRT) / AR), a1 = -Math.asin((Y_WHEEL - Y_SKIRT) / AR);
      for (let i = 0; i <= 24; i++) { const a = a0 + (a1 - a0) * (i / 24); pts.push([wz + Math.cos(a) * AR, Y_WHEEL + Math.sin(a) * AR]); }
    }
    pts.push([z1, Y_SKIRT], [z1, Y_BELT], [z0, Y_BELT]);
    pts.reverse();                                                         // (x = -z flips the winding back)
    pts.forEach(([z, y], i) => (i ? sh.lineTo(-z, y) : sh.moveTo(-z, y)));
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2, curveSegments: 4 });
    geo.rotateY(Math.PI / 2);                                              // shape x -> -z, extrusion -> +x
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    geo.translate(s > 0 ? hw - bb.max.x : -hw - bb.min.x, 0, 0);
    paintG.push(atlasUV(geo, spec, { edgeToSide: true }));
  };
  plate(1, -hl + CR, hl - CR);
  plate(-1, -hl + CR, dM - 0.62); plate(-1, dM + 0.62, dF - 0.62); plate(-1, dF + 0.62, hl - CR);
  // corners: quarter cylinders, full height to the roof
  for (const [sx, sz, t0] of [[1, 1, 0], [1, -1, Math.PI / 2], [-1, -1, Math.PI], [-1, 1, Math.PI * 1.5]]) {
    const cyl = new THREE.CylinderGeometry(CR, CR, Y_GLASS - Y_SKIRT + 0.02, 8, 1, true, t0, Math.PI / 2).translate(sx * (hw - CR), (Y_GLASS + Y_SKIRT) / 2, sz * (hl - CR));
    paintG.push(atlasUV(cyl, spec));
  }
  // front lower panel (under the windscreen) and rear panel (under the rear window)
  paintG.push(atlasUV(boxAt(W - 2 * CR + 0.002, 0.98 - Y_SKIRT, 0.06, 0, (0.98 + Y_SKIRT) / 2, hl - 0.03), spec));
  paintG.push(atlasUV(boxAt(W - 2 * CR + 0.002, 1.55 - Y_SKIRT, 0.06, 0, (1.55 + Y_SKIRT) / 2, -hl + 0.03), spec));
  for (const sx of [-1, 1]) paintG.push(atlasUV(boxAt(0.15, Y_GLASS - 1.55 + 0.02, 0.06, sx * (hw - CR - 0.07), (Y_GLASS + 1.55) / 2, -hl + 0.03), spec));   // rear window's side pillars
  // the roof: a rounded section over the length, its ends rounded by the bevel; the battery pod on top
  const roofSection = (halfW, y0, y1, rr, len, bev, zc) => {
    const s = new THREE.Shape(), a = halfW - bev, b0 = y0 + bev, b1 = y1 - bev, r = rr;
    s.moveTo(-a, b0); s.lineTo(a, b0); s.lineTo(a, b1 - r); s.quadraticCurveTo(a, b1, a - r, b1); s.lineTo(-a + r, b1); s.quadraticCurveTo(-a, b1, -a, b1 - r); s.lineTo(-a, b0);
    const geo = new THREE.ExtrudeGeometry(s, { depth: len - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 6 });
    geo.translate(0, 0, zc - (len - 2 * bev) / 2);
    return geo;
  };
  paintG.push(atlasUV(roofSection(hw, Y_GLASS - 0.03, Y_ROOF, 0.2, Ln, 0.1, 0), spec));
  paintG.push(atlasUV(roofSection(1.02, Y_ROOF - 0.02, 3.2, 0.06, 7.2, 0.07, -0.7), spec));

  // ---- glass: side panes between pillars, sealed in rubber; the windscreen and rear window
  const yG0 = Y_BELT + 0.02, yG1 = Y_GLASS - 0.02;
  for (const s of [1, -1]) {
    const bl = bays(spec, s);
    for (const [z0, z1] of bl) {
      const w = z1 - z0 - 0.06, zc = (z0 + z1) / 2;
      const pane = new THREE.PlaneGeometry(w, yG1 - yG0).rotateY(s * Math.PI / 2).translate(s * (hw - 0.012), (yG0 + yG1) / 2, zc);
      glassG.push(clean(pane));
      // rubber seal round the pane, a little proud of the glass
      for (const [dw, dh, dy, dz] of [[w + 0.04, 0.022, yG1 + 0.006, 0], [w + 0.04, 0.022, yG0 - 0.006, 0], [0.022, yG1 - yG0, (yG0 + yG1) / 2, w / 2 + 0.006], [0.022, yG1 - yG0, (yG0 + yG1) / 2, -w / 2 - 0.006]])
        rubberG.push(clean(boxAt(0.016, dh, dw === 0.022 ? 0.022 : dw, s * (hw - 0.004), dy, zc + dz)));
    }
    // pillars (behind the frit) and the beltline / gutter rubber
    const edges = new Set(); for (const [a, b] of bl) { edges.add(a.toFixed(3)); edges.add(b.toFixed(3)); }
    for (const z of edges) rubberG.push(clean(boxAt(0.04, Y_GLASS - Y_BELT, 0.09, s * (hw - 0.04), (Y_GLASS + Y_BELT) / 2, Number(z))));
    rubberG.push(clean(boxAt(0.03, 0.035, Ln - 2 * CR, s * (hw + 0.004), Y_BELT + 0.005, 0)));
    rubberG.push(clean(boxAt(0.03, 0.025, Ln - 2 * CR, s * (hw + 0.002), Y_GLASS + 0.01, 0)));
  }
  // kerb-side doorway surrounds (the door leaves themselves move: below)
  for (const dz of [dF, dM]) for (const e of [-1, 1]) rubberG.push(clean(boxAt(0.05, Y_GLASS - Y_SKIRT, 0.05, -hw + 0.02, (Y_GLASS + Y_SKIRT) / 2, dz + e * 0.63)));
  // windscreen: one big raked pane wrapping to the corners; the rear window
  { const ws = new THREE.PlaneGeometry(W - 0.06, Y_GLASS + 0.02 - 0.98, 8, 1);
    const p = ws.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), u = Math.abs(x) / (hw - 0.03); p.setZ(i, -Math.pow(u, 6) * 0.1 - (y + (Y_GLASS - 0.98) / 2) * 0.06); }
    ws.computeVertexNormals(); ws.translate(0, (Y_GLASS + 0.02 + 0.98) / 2, hl + 0.04); screenG.push(clean(ws)); }
  screenG.push(clean(new THREE.PlaneGeometry(W - 0.5, Y_GLASS - 1.6).rotateY(Math.PI).translate(0, (Y_GLASS + 1.6) / 2 - 0.02, -hl - 0.005)));
  rubberG.push(clean(boxAt(W - 0.04, 0.04, 0.06, 0, 0.98, hl + 0.01)), clean(boxAt(W - 0.46, 0.035, 0.03, 0, 1.58, -hl - 0.01)));
  // wipers parked along the foot of the windscreen
  for (const x of [-0.55, 0.45]) rubberG.push(clean(new THREE.BoxGeometry(0.95, 0.02, 0.02).rotateZ(x < 0 ? 0.05 : -0.05).translate(x, 1.03, hl + 0.06)));
  // bumpers, mud flaps, the underbody, lamp housings
  rubberG.push(clean(boxAt(W - 0.06, 0.26, 0.14, 0, 0.36, hl + 0.02)), clean(boxAt(W - 0.06, 0.28, 0.14, 0, 0.37, -hl - 0.02)));
  for (const wz of [wf, wr]) for (const s of [1, -1]) rubberG.push(clean(boxAt(0.36, 0.32, 0.012, s * (hw - 0.3), 0.3, wz - AR - 0.04)));
  rubberG.push(clean(boxAt(W - 1.15, 0.12, Ln - 0.6, 0, 0.24, 0)));
  for (const sx of [-1, 1]) rubberG.push(clean(boxAt(0.5, 0.22, 0.05, sx * (hw - 0.36), 0.64, hl + 0.01)));
  for (const sx of [-1, 1]) rubberG.push(clean(boxAt(0.22, 0.64, 0.05, sx * (hw - 0.12), 0.76, -hl - 0.01)));
  // ram's-horn mirrors arching forward from the roof's front edge
  for (const s of [1, -1]) {
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(s * (hw - 0.3), 2.86, hl - 0.12), new THREE.Vector3(s * (hw + 0.05), 2.98, hl + 0.2), new THREE.Vector3(s * (hw + 0.24), 2.74, hl + 0.42), new THREE.Vector3(s * (hw + 0.26), 2.3, hl + 0.44)]);
    rubberG.push(clean(new THREE.TubeGeometry(curve, 16, 0.022, 6, false)));
    rubberG.push(clean(boxAt(0.1, 0.38, 0.2, s * (hw + 0.26), 2.12, hl + 0.44)));
    mirrorG.push(clean(new THREE.PlaneGeometry(0.17, 0.34).translate(0, 0, 0.0).rotateY(Math.PI).translate(s * (hw + 0.26), 2.12, hl + 0.335)));
  }
  // the roof: AC grilles on the pod
  for (const z of [1.6, -2.9]) rubberG.push(clean(boxAt(1.3, 0.025, 0.9, 0, 3.21, z)));

  // ---- the cabin: floor, linings, wheel boxes, seats, stanchions, ceiling, the driver's place
  const CAB = { floor: 0x55595d, lining: 0x8f9396, dark: 0x2a2c2e, ceil: 0xd8dad6, seat: 0x2c64a0, frame: 0x6f7378, pole: 0xe2b31c, dash: 0x1b1c1e };
  // (the floor and linings stop short of the wheel arches; a dark housing boxes each wheel in)
  const archGap = [wr, wf].map((wz) => [wz - AR - 0.07, wz + AR + 0.07]);
  const runsOf = (a, b) => { const out = []; let z = a; for (const [g0, g1] of archGap) { if (g1 < z || g0 > b) continue; if (g0 > z) out.push([z, g0]); z = Math.max(z, g1); } if (z < b) out.push([z, b]); return out; };
  cabinG.push(painted(boxAt(W - 1.1, 0.1, Ln - 0.12, 0, Y_FLOOR - 0.05, 0), CAB.floor));
  cabinG.push(painted(boxAt(W - 0.12, 0.02, Ln - 0.2, 0, Y_GLASS - 0.045, 0), CAB.ceil));
  for (const s of [1, -1]) {
    for (const [a, b] of runsOf(-hl + 0.06, hl - 0.06)) cabinG.push(painted(boxAt(0.46, 0.1, b - a, s * (hw - 0.28), Y_FLOOR - 0.05, (a + b) / 2), CAB.floor));
    const runs = s > 0 ? [[-hl + 0.1, hl - 0.1]] : [[-hl + 0.1, dM - 0.62], [dM + 0.62, dF - 0.62], [dF + 0.62, hl - 0.1]];
    for (const [a0, b0] of runs) for (const [a, b] of runsOf(a0, b0)) cabinG.push(painted(boxAt(0.02, Y_BELT - Y_FLOOR, b - a, s * (hw - 0.065), (Y_BELT + Y_FLOOR) / 2, (a + b) / 2), CAB.lining));
    for (const [g0, g1] of archGap) {
      const zc = (g0 + g1) / 2, len = g1 - g0, top = Y_WHEEL + AR + 0.04;
      const h = top - Y_SKIRT, yc = (top + Y_SKIRT) / 2;
      cabinG.push(painted(boxAt(0.03, h, len, s * (hw - 0.5), yc, zc), CAB.dark));                              // inboard wall
      cabinG.push(painted(boxAt(0.46, 0.04, len, s * (hw - 0.28), top, zc), CAB.dark));                         // the platform over the wheel
      for (const e of [g0, g1]) cabinG.push(painted(boxAt(0.46, h, 0.03, s * (hw - 0.28), yc, e), CAB.dark));
    }
  }
  for (const dz of [dF, dM]) cabinG.push(painted(boxAt(0.06, 0.012, 1.18, -hw + 0.08, Y_FLOOR + 0.006, dz), CAB.pole));   // step edges
  cabinG.push(painted(boxAt(W - 0.12, 1.55 - Y_FLOOR, 0.02, 0, (1.55 + Y_FLOOR) / 2, -hl + 0.08), CAB.lining));   // (below the rear window: you see through it)
  const seat = (x, z, base = Y_FLOOR) => {
    cabinG.push(painted(boxAt(0.42, 0.06, 0.4, x, base + 0.44, z), CAB.seat));
    cabinG.push(painted(boxAt(0.42, 0.5, 0.05, x, base + 0.72, z - 0.2).rotateX(0), CAB.seat));
    cabinG.push(painted(boxAt(0.08, 0.42, 0.26, x, base + 0.21, z), CAB.frame));
  };
  const onArch = (z) => [wf, wr].some((wz) => Math.abs(z - wz) < AR + 0.06);
  for (let z = dM - 0.95; z > -hl + 0.5; z -= 0.78) for (const s of [1, -1]) for (const x of [hw - 0.33, hw - 0.77]) {
    const raised = onArch(z) && x === hw - 0.33;
    if (onArch(z) && !raised) continue;
    seat(s * x, z, raised ? Y_WHEEL + AR : Y_FLOOR);
  }
  for (const z of [dM + 0.95, dM + 1.75, dM + 2.55]) seat(hw - 0.33, z);
  seat(hw - 0.33, wf, Y_WHEEL + AR);
  for (let z = dM - 1.4; z > -hl + 0.6; z -= 1.56) for (const s of [1, -1]) cabinG.push(painted(new THREE.CylinderGeometry(0.019, 0.019, Y_GLASS - Y_FLOOR - 0.06, 8).translate(s * 0.4, (Y_GLASS + Y_FLOOR) / 2 - 0.03, z), CAB.pole));
  for (const z of [dM + 0.7, dM - 0.7, dF - 0.7, dF + 0.62]) cabinG.push(painted(new THREE.CylinderGeometry(0.019, 0.019, Y_GLASS - Y_FLOOR - 0.06, 8).translate(-hw + 0.25, (Y_GLASS + Y_FLOOR) / 2 - 0.03, z), CAB.pole));
  for (const s of [1, -1]) cabinG.push(painted(new THREE.CylinderGeometry(0.017, 0.017, Ln - 1.6, 8).rotateX(Math.PI / 2).translate(s * 0.45, 1.96, -0.4), CAB.pole));
  // the driver (left-hand side, +x): dash across the front, the wheel, a seat, the cab screen behind
  cabinG.push(painted(boxAt(W - 0.2, 0.6, 0.42, 0, Y_FLOOR + 0.42, hl - 0.3), CAB.dash));
  cabinG.push(painted(new THREE.TorusGeometry(0.22, 0.022, 6, 20).rotateX(-1.1).translate(hw - 0.65, 1.12, hl - 0.62), CAB.dash));
  cabinG.push(painted(boxAt(0.5, 0.1, 0.48, hw - 0.65, Y_FLOOR + 0.48, hl - 1.15), CAB.dark), painted(boxAt(0.5, 0.72, 0.08, hw - 0.65, Y_FLOOR + 0.9, hl - 1.42), CAB.dark));
  cabinG.push(painted(boxAt(0.04, 1.3, 0.9, hw - 1.0, Y_FLOOR + 0.95, hl - 1.2), CAB.frame));
  cabinG.push(painted(boxAt(0.3, 0.9, 0.3, -hw + 0.35, Y_FLOOR + 0.45, dF - 1.0), CAB.frame));      // the fare box by the front door

  const mesh = (list, mat) => { const m = new THREE.Mesh(mergeGeometries(list, false), mat); g.add(m); return m; };
  // detail: what isn't worth a draw call from far off (the cabin behind tinted glass, mirrors, the
  // door leaves, light strips, side sign, indicators); world/vehicles.js hides it beyond a few tens of metres
  const detail = [];
  mesh(paintG, M.paint); mesh(rubberG, M.rubber); detail.push(mesh(cabinG, M.cabin), mesh(mirrorG, M.mirror));
  const gm = mesh(glassG, M.glass), sm = mesh(screenG, M.screen); gm.renderOrder = sm.renderOrder = 2;
  // ceiling light strips
  const strips = [1, -1].map((s) => boxAt(0.14, 0.02, Ln - 2.2, s * 0.62, Y_GLASS - 0.06, -0.3));
  const stripM = new THREE.Mesh(mergeGeometries(strips.map((x) => clean(x, ['position', 'normal'])), false), M.strip); g.add(stripM); detail.push(stripM);

  // ---- signs: front destination, side by the front door, rear number
  const route = spec.route || '55';
  const front = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.5, 0.32), ledSign(`${route}路`)); front.position.set(0, 2.75, hl + 0.012); g.add(front);
  const side = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.26), ledSign(`${route}`, 512, 96, '路')); side.position.set(-hw + 0.02, 2.25, dF - 1.15); side.rotation.y = -Math.PI / 2; g.add(side); detail.push(side);
  const rear = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.3), ledSign(`${route}`)); rear.position.set(0, 2.7, -hl - 0.012); rear.rotation.y = Math.PI; g.add(rear);
  // lamps: twin headlamps in each housing with a light bar above, tail clusters
  const lamps = [];
  for (const sx of [-1, 1]) for (const dx of [-0.1, 0.1]) lamps.push(new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.02, 14).rotateX(Math.PI / 2).translate(sx * (hw - 0.36) + dx, 0.62, hl + 0.04)));
  for (const sx of [-1, 1]) lamps.push(new THREE.Mesh(boxAt(0.44, 0.025, 0.02, sx * (hw - 0.36), 0.725, hl + 0.04)));
  g.add(new THREE.Mesh(mergeGeometries(lamps.map((m) => clean(m.geometry, ['position', 'normal'])), false), headMat));
  const tailMat = new THREE.MeshBasicMaterial({ color: tailRun.clone() });
  const tails = [-1, 1].map((sx) => clean(boxAt(0.15, 0.5, 0.02, sx * (hw - 0.12), 0.85, -hl - 0.04), ['position', 'normal']));
  g.add(new THREE.Mesh(mergeGeometries(tails, false), tailMat));
  // doors (kerb side): glass leaves that slide open
  const doors = [];
  for (const dz of [dF, dM]) for (const sz of [-1, 1]) {
    const leafG = new THREE.BoxGeometry(0.035, 2.08, 0.6);
    const leaf = new THREE.Mesh(leafG, M.doorGlass); leaf.renderOrder = 2; leaf.position.set(-hw - 0.005, Y_SKIRT + 0.02 + 1.04, dz + sz * 0.3); g.add(leaf);
    const edge = new THREE.Mesh(boxAt(0.05, 2.08, 0.03, 0, 0, -sz * 0.29), M.rubber); leaf.add(edge);   // the rubber nosing where the leaves meet
    doors.push({ leaf, z: dz + sz * 0.3, sz }); detail.push(edge);
  }
  // indicators on the kerb side, for pulling in and out
  const blinkMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 0.08, 0) });
  { const bl = [hl - 0.06, -hl + 0.06].map((z) => new THREE.BoxGeometry(0.06, 0.14, 0.12).translate(-hw + 0.04, 0.95, z));
    bl.push(new THREE.BoxGeometry(0.02, 0.05, 0.14).translate(-hw - 0.01, 0.98, wf + AR + 0.25));
    const b = new THREE.Mesh(mergeGeometries(bl.map((x) => clean(x, ['position', 'normal'])), false), blinkMat); g.add(b); detail.push(b); }
  // wheels
  const wl = [];
  for (const z of [wf, wr]) for (const sx of [-1, 1]) { const w = makeWheel(); w.position.set(sx * (hw - 0.2), Y_WHEEL, z); if (sx < 0) w.rotation.y = Math.PI; g.add(w); wl.push(w); }
  let open = 0;
  return {
    g, wheels: wl, wheelRadius: Y_WHEEL, detail,
    setBraking(b) { tailMat.color.copy(b ? tailBrake : tailRun); },
    // 0..1 doors open; blink: indicator on
    setDoors(k) { open = k; for (const d of doors) { d.leaf.position.x = -hw - 0.005 - 0.08 * Math.min(1, k * 3); d.leaf.position.z = d.z + d.sz * 0.52 * k; } },
    setBlink(on) { blinkMat.color.setRGB(on ? 3.2 : 0.2, on ? 1.4 : 0.08, 0); },
    get doorsOpen() { return open; },
  };
}
