// The two stations' fabric and Line 2's tunnels (static), from world/metroLayout.js's plan; what moves (the
// gates' flaps, the screen doors, the escalators' steps) is returned for world/metro.js to drive.
//   concourse  polished granite, white enamel wall panels, a slatted aluminium ceiling with light lines,
//              columns; the exits' ways in; ticket machines; the service centre astride the gate line;
//              security (the X-ray machine, its belts and its screen, the fence); the gate line (stainless
//              cabinets, glass flaps, a green arrow or a red cross at each end); posters, the line map;
//              hanging signs (dark grey, white Chinese over English, Line 2's green, yellow exit numbers);
//              the escalator well with its glass balustrade
//   down       an up escalator, a fixed stair, a down escalator: glass balustrades, black handrails,
//              steps that move (the texture scrolls), comb plates
//   platform   granite, the yellow tactile line, the door markings (wait either side, the way out in the
//              middle), round stainless columns with the station's name, benches, full-height screen doors
//              (fixed glass, doors that slide, a header over each with the line and the direction); behind
//              them the track: ballastless bed, rails, sleepers, the rigid overhead conductor rail, the
//              far wall with the station's name and light boxes; the tunnels' mouths at both ends
//   tunnels    a bored tube each way (segment rings), a light every 25 m, from out of sight west of East
//              Nanjing Road to out of sight east of Lujiazui
import * as THREE from 'three';
import { Batch } from './geo.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Y, CONC, PLAT, GATE, gateP, SEC, ESC, TVM, SERVICE, COLS, DOOR_AS, STATIONS, rampY } from './metroLayout.js';
import { LENGTH, trackAt, STOP_S } from '../engine/metroLine.js';
import {
  graniteTex, panelTex, ceilingTex, trackWallTex, tunnelTex, signTex, nameTex, lineMapTex, psdHeaderTex, doorMarkTex, tactileTex,
  tvmTex, gateTopTex, posterTex, IDX, makeCanvas, tex,
} from './metroTextures.js';

// ---- materials (shared by both stations) ----
export function metroMaterials() {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const basic = (c, o = {}) => { const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(...c), ...o }); m.userData.todSkip = true; return m; };
  const g = graniteTex(3), gp = graniteTex(8, [178, 176, 172]), pan = panelTex(5), ceil = ceilingTex(), tw = trackWallTex(), tun = tunnelTex(), tac = tactileTex();
  // an escalator's treads (one step a texture repeat): brushed aluminium, fine grooves, yellow edges, the riser's shadow
  const steps = () => { const [c, x] = makeCanvas(128, 256); x.fillStyle = '#9a9ea2'; x.fillRect(0, 0, 128, 256); for (let i = 0; i < 128; i += 6) { x.fillStyle = '#6a6e72'; x.fillRect(0, i * 2, 128, 4); } x.fillStyle = '#2a2c2f'; x.fillRect(0, 0, 18, 256); x.fillStyle = '#e8c21a'; x.fillRect(18, 0, 7, 256); x.fillRect(18, 0, 110, 8); x.fillRect(18, 248, 110, 8); const t = tex(c); return t; };
  const up = steps(), down = steps();
  return {
    granite: std({ map: g, roughness: 0.2, metalness: 0.0 }),
    platform: std({ map: gp, roughness: 0.24, metalness: 0.0 }),
    panel: std({ map: pan, roughness: 0.32, metalness: 0.05 }),
    ceiling: std({ map: ceil, roughness: 0.55, metalness: 0.3 }),
    steel: std({ color: 0xbfc3c7, metalness: 0.9, roughness: 0.22 }),
    dark: std({ color: 0x33373b, metalness: 0.5, roughness: 0.42 }),
    black: std({ color: 0x121314, roughness: 0.55 }),
    rubber: std({ color: 0x141516, roughness: 0.5 }),
    glass: std({ color: 0xc4d8dc, metalness: 0.1, roughness: 0.04, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
    psdGlass: std({ color: 0xbcd2d6, metalness: 0.1, roughness: 0.04, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }),
    flap: std({ color: 0xa8c8d8, metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
    trackbed: std({ color: 0x3a3b3c, roughness: 0.95 }),
    sleeper: std({ color: 0x77777a, roughness: 0.9 }),
    rail: std({ color: 0x8d8f92, metalness: 0.9, roughness: 0.3 }),
    trackWall: std({ map: tw, roughness: 0.8 }),
    tunnel: new THREE.MeshBasicMaterial({ map: tun, color: new THREE.Color(0.16, 0.16, 0.17), side: THREE.BackSide }),
    tactile: std({ map: tac, roughness: 0.6 }),
    light: basic([2.4, 2.4, 2.45]),
    lightWarm: basic([2.2, 2.05, 1.8]),
    tunnelLamp: basic([2.6, 2.4, 2.0]),
    green: basic([0.3, 2.2, 0.5]), red: basic([2.4, 0.2, 0.15]),
    screen: basic([0.6, 0.9, 1.2]),
    stepsUp: std({ map: up, roughness: 0.42, metalness: 0.7, side: THREE.DoubleSide }), stepsDown: std({ map: down, roughness: 0.42, metalness: 0.7, side: THREE.DoubleSide }),
    yellow: std({ color: 0xe0b418, roughness: 0.6 }),
    tvm: std({ map: tvmTex(), roughness: 0.4, metalness: 0.2 }),
    gateTop: std({ map: gateTopTex(), roughness: 0.35, metalness: 0.5 }),
    mark: new THREE.MeshBasicMaterial({ map: doorMarkTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, color: new THREE.Color(0.85, 0.85, 0.85) }),
  };
}

// a sloped box: its underside runs from (a0, ya) to (a1, yb), h thick above it, across p0..p1 (local)
function slab(batch, F, a0, a1, ya, yb, h, p0, p1) {
  const c = [[a0, ya, p0], [a1, yb, p0], [a1, yb, p1], [a0, ya, p1]].map(([a, y, p]) => { const [x, z] = F.toW(a, p); return new THREE.Vector3(x, y, z); });
  const t = c.map((v) => v.clone().setY(v.y + h));
  const faces = [[c[0], c[1], c[2], c[3]], [t[3], t[2], t[1], t[0]], [c[0], c[3], t[3], t[0]], [c[1], t[1], t[2], c[2]], [c[0], t[0], t[1], c[1]], [c[3], c[2], t[2], t[3]]];
  const pos = [], uv = [];
  for (const [A, B, C2, D] of faces) { pos.push(...A.toArray(), ...C2.toArray(), ...B.toArray(), ...A.toArray(), ...D.toArray(), ...C2.toArray()); const w = A.distanceTo(B) / 2, hh = A.distanceTo(D) / 2; uv.push(0, 0, w, hh, w, 0, 0, 0, 0, hh, w, hh); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
  batch.push(g);
}
// a flat quad (local corners, each [a, y, p]), uv u along a0->a1 in tiles of `tile` metres
function quad(batch, F, pts, tileU = 1, tileV = 1) {
  const v = pts.map(([a, y, p]) => { const [x, z] = F.toW(a, p); return [x, y, z]; });
  const lu = Math.hypot(v[1][0] - v[0][0], v[1][1] - v[0][1], v[1][2] - v[0][2]) / tileU, lv = Math.hypot(v[3][0] - v[0][0], v[3][1] - v[0][1], v[3][2] - v[0][2]) / tileV;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...v[0], ...v[1], ...v[2], ...v[0], ...v[2], ...v[3]], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, lu, 0, lu, lv, 0, 0, lu, lv, 0, lv], 2));
  g.computeVertexNormals(); batch.push(g);
}

export function buildStation(root, S, m) {
  const F = S.F, g = new THREE.Group(); g.name = `metro-${S.id}`; root.add(g);
  const rotY = -F.rot;
  const B = {}; const bat = (k) => B[k] || (B[k] = new Batch());
  // a box in the station's frame: a0..a1 along, y0..y1, p0..p1 across
  const box = (k, a0, a1, y0, y1, p0, p1, tile = 2) => { const [x, z] = F.toW((a0 + a1) / 2, (p0 + p1) / 2); bat(k).box(x, y0, z, a1 - a0, y1 - y0, p1 - p0, { rotY, tile }); };
  const cyl = (k, a, p, y0, h, r, seg = 14) => { const [x, z] = F.toW(a, p); bat(k).cyl(x, y0, z, r, r, h, seg); };
  // a picture on a plane, facing local direction (fa, fp)
  const planes = [];
  const merged = new Map();                 // material -> geometries (static pictures, one mesh each material)
  const pic = (mat, a, y, p, w, h, fa, fp, name = 'metro-sign', own = false) => {
    const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat), [x, z] = F.toW(a, p), wx = fa * F.ux - fp * F.uz, wz = fa * F.uz + fp * F.ux;
    o.position.set(x, y, z); o.rotation.y = Math.atan2(wx, wz); o.name = name; o.matrixAutoUpdate = false; o.updateMatrix();
    if (own) { g.add(o); planes.push(o); return o; }
    const geo = o.geometry.clone().applyMatrix4(o.matrix); (merged.get(mat) || merged.set(mat, []).get(mat)).push(geo); return o;
  };
  const signMat = (t, k = 1.15) => { const mm = new THREE.MeshBasicMaterial({ map: t }); mm.color.setScalar(k); mm.userData.todSkip = true; return mm; };
  // a hanging sign (both faces), w long, across the station (facing ±a) or along it (facing ±p)
  const hang = (items, a, p, w, fa, fp, y = Y.C + 2.55, both = null) => {
    const h = w / 8, mat = signMat(signTex(items));
    const [x, z] = F.toW(a, p); void x; void z;
    box('dark', a - (fp ? w / 2 : 0.05), a + (fp ? w / 2 : 0.05), y - h / 2 - 0.02, y + h / 2 + 0.02, p - (fa ? w / 2 : 0.05), p + (fa ? w / 2 : 0.05));
    pic(mat, a + fa * 0.06, y, p + fp * 0.06, w, h, fa, fp);
    pic(both ? signMat(signTex(both)) : mat, a - fa * 0.06, y, p - fp * 0.06, w, h, -fa, -fp);
    for (const s of [-0.4, 0.4]) { const ca = a + (fp ? s * w : 0), cp = p + (fa ? s * w : 0); box('steel', ca - 0.015, ca + 0.015, y + h / 2, (y > Y.P + 3 ? Y.ceilC : Y.ceilP), cp - 0.015, cp + 0.015); }
  };
  const C0 = CONC.a0, C1 = CONC.a1, CP = CONC.p, yC = Y.C, yCc = Y.ceilC, yP = Y.P, yPc = Y.ceilP;
  const exits = S.ways.exits, isE = S.id === 'enr';

  // ================= the concourse =================
  // floor round the escalator well; ceiling; light lines
  for (const f of S.floors) if (f.kind === 'C') box('granite', f.a0, f.a1, yC - 0.06, yC, f.p0, f.p1, 2.4);
  box('ceiling', C0, C1, yCc, yCc + 0.05, -CP, CP, 3);
  for (const p of [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5]) box('light', C0 + 1, C1 - 1, yCc - 0.03, yCc, p - 0.07, p + 0.07);
  // walls: what's open where, per station
  const wallA = (p, a0, a1, y0 = yC, y1 = yCc) => { if (a1 - a0 > 0.05) box('panel', a0, a1, y0, y1, p - 0.08, p + 0.08, 2.4); };
  const wallP = (a, p0, p1, y0 = yC, y1 = yCc) => { if (p1 - p0 > 0.05) box('panel', a - 0.08, a + 0.08, y0, y1, p0, p1, 2.4); };
  // the skirting
  const skirtA = (p, a0, a1) => box('dark', a0, a1, yC, yC + 0.12, p - 0.1, p + 0.1);
  if (isE) {
    wallA(-CP, C0, -37.8); wallA(-CP, 6.8, C1); skirtA(-CP + 0.02, 6.8, C1);
    wallA(-13.6, -26.6, -4.4);                                                          // between the two landings
    box('ceiling', -27.4, -3.6, yCc, yCc + 0.05, -13.6, -9.9, 3); box('light', -26, -5, yCc - 0.03, yCc, -11.9, -11.7);
    wallA(CP, C0, C1); wallP(C0, -CP, CP); wallP(C1, -CP, CP);
    // the far (west) end: the way to Line 10, shut
    box('dark', C0 + 0.1, C0 + 0.3, yC, yC + 3.0, -2.5, 2.5);
    pic(signMat(signTex([{ badge: 10 }, { zh: '换乘10号线', en: 'Transfer to Line 10' }, { gap: 40 }, { zh: '暂停使用', en: 'Temporarily closed', col: '#ffb4a0' }])), C0 + 0.35, yC + 2.62, 0, 4.6, 0.575, 1, 0);
  } else {
    for (const s of [-1, 1]) {
      const W = exits.find((e) => Math.sign(e.land[1]) === s), at = W.land[0] - 0.6 - 9.6, pt = W.land[1], hw = 1.8;
      const g0 = at + 11.2 + 0.3, g1 = at + 11.2 + 3.9;
      wallA(s * CP, C0, g0); wallA(s * CP, g1, C1);
      // the corridor: on past the landing, then in under the avenue
      const pIn = pt - s * hw, pOut = pt + s * hw;
      wallA(pOut, at + 11.2, g1); wallP(g1, Math.min(s * CP, pOut), Math.max(s * CP, pOut)); wallP(g0, Math.min(s * CP, pIn), Math.max(s * CP, pIn));
      box('ceiling', at + 9.6, g1, yCc, yCc + 0.05, Math.min(pIn, pOut), Math.max(pIn, pOut), 3);
      box('ceiling', g0, g1, yCc, yCc + 0.05, Math.min(s * CP, pIn), Math.max(s * CP, pIn), 3);
      box('light', g0 + 1.6, g0 + 1.8, yCc - 0.03, yCc, Math.min(s * CP, pt), Math.max(s * CP, pt));
      for (const f of [[at + 9.6, g1, pIn, pOut], [g0, g1, s * CP, pIn]]) box('granite', f[0], f[1], yC - 0.06, yC, Math.min(f[2], f[3]), Math.max(f[2], f[3]), 2.4);
      // at the corridor's end, facing in: which exit
      hang([{ exit: W.exit }, { zh: `${W.exit}号口`, en: `Exit ${W.exit}` }, { gap: 30 }, { zh: W.name.zh, en: W.name.en }], (g0 + g1) / 2, s * (CP - 0.6), 3.4, 0, s, yC + 2.45, [{ zh: '进站', en: 'Entrance' }, { arrow: 'right' }, { badge: 2 }, { zh: '2号线', en: 'Line 2' }]);
    }
    wallP(C1, -CP, CP);
    // the west end: the long passage to Exit 1 (by the Pearl)
    wallP(C0, -CP, -1.6); wallP(C0, 1.6, CP); box('panel', C0 - 0.08, C0 + 0.08, yC + 2.6, yCc, -1.6, 1.6);
    box('black', C0 - 2.0, C0 - 1.9, yC, yC + 2.6, -1.6, 1.6); box('granite', C0 - 2.0, C0, yC - 0.06, yC, -1.6, 1.6); wallA(-1.6, C0 - 2, C0, yC, yC + 2.6); wallA(1.6, C0 - 2, C0, yC, yC + 2.6);
    hang([{ exit: 1 }, { zh: '1号口', en: 'Exit 1' }, { gap: 30 }, { zh: '东方明珠 · 陆家嘴环路', en: 'Oriental Pearl · Ring Rd' }, { arrow: 'left' }], C0 + 3, 0, 4.4, 1, 0, yC + 2.55);
  }
  // columns
  for (const [a, p] of COLS.conc) { box('panel', a - 0.45, a + 0.45, yC, yCc, p - 0.45, p + 0.45, 2.4); box('dark', a - 0.47, a + 0.47, yC, yC + 0.15, p - 0.47, p + 0.47); }
  // posters on the south wall and the line map, the station's name at the way in
  const posters = [];
  const posterAt = (a, p, fp, i) => { box('steel', a - 0.7, a + 0.7, yC + 0.75, yC + 2.75, p - 0.06 * fp, p, 2); const o = pic(signMat(posterTex(i), 1.25), a, yC + 1.75, p - 0.07 * fp, 1.25, 1.88, 0, -fp); posters.push(o); };
  [-14, -6, 22, 30, 40, 50].forEach((a, i) => posterAt(a, CP - 0.1, 1, i + (isE ? 0 : 3)));
  if (isE) [14, 24, 34, 44].forEach((a, i) => posterAt(a, -CP + 0.1, -1, i + 2));
  pic(signMat(lineMapTex(IDX[S.id], 0), 1.2), -36, yC + 1.75, CP - 0.17, 4.2, 0.66, 0, -1);
  pic(signMat(nameTex(S), 1.15), isE ? -15.5 : -3, yC + 2.85, isE ? -13.45 : CP - 0.17, 3.2, 0.8, 0, isE ? 1 : -1);
  // ticket machines (four), their canopy sign
  for (let k = 0; k < 4; k++) { const a0 = TVM.a0 + 0.6 + k * 2.6; box('dark', a0, a0 + 1.1, yC, yC + 1.9, TVM.p - 0.75, TVM.p - 0.05); pic(new THREE.MeshStandardMaterial({ map: m.tvm.map, roughness: 0.4, metalness: 0.2 }), a0 + 0.55, yC + 1.0, TVM.p - 0.77, 1.05, 1.8, 0, -1, 'metro-tvm', true).material.map = (() => { const t = m.tvm.map.clone(); t.repeat.set(0.25, 1); t.offset.set(0.25 * k, 0); t.needsUpdate = true; return t; })(); }
  hang([{ icon: '票' }, { zh: '自动售票机', en: 'Ticket machines' }], (TVM.a0 + TVM.a1) / 2, TVM.p - 2.2, 3.0, 0, 1, yC + 2.6);
  // the service centre: a glass booth with its counter, astride the gate line
  { const { a0, a1, p0, p1 } = SERVICE; box('dark', a0, a1, yC, yC + 1.05, p1 - 0.1, p1); box('glass', a0, a1, yC + 1.05, yC + 2.4, p1 - 0.06, p1 - 0.02); for (const a of [a0, a1]) box('glass', a - 0.03, a + 0.03, yC, yC + 2.4, p0, p1);
    box('dark', a0 - 0.05, a1 + 0.05, yC + 2.4, yC + 2.9, p0, p1 + 0.05); box('steel', a0, a1, yC + 1.05, yC + 1.1, p1 - 0.25, p1);
    pic(signMat(signTex([{ icon: 'i' }, { zh: '服务中心', en: 'Service Center' }], { w: 1024, h: 160 })), (a0 + a1) / 2, yC + 2.65, p1 + 0.07, 3.2, 0.5, 0, 1); }
  // ---- security ----
  { const sb = SEC.belt, sx = SEC.body;
    box('dark', sx.a0, sx.a1, yC, yC + 1.45, sb.p0 - 0.05, sb.p1 + 0.05);                     // the machine
    box('black', sx.a0 - 0.02, sx.a1 + 0.02, yC + 0.78, yC + 1.3, sb.p0 + 0.08, sb.p1 - 0.08);  // its tunnel
    for (const a of [sx.a0 - 0.03, sx.a1 + 0.03]) for (let k = 0; k < 6; k++) box('rubber', a - 0.01, a + 0.01, yC + 0.8, yC + 1.28, sb.p0 + 0.1 + k * 0.14, sb.p0 + 0.22 + k * 0.14);   // lead curtains
    box('rubber', sb.a0, sx.a0, yC + 0.72, yC + 0.78, sb.p0 + 0.05, sb.p1 - 0.05); box('dark', sb.a0, sx.a0, yC, yC + 0.72, sb.p0 + 0.1, sb.p1 - 0.1);   // the belt in
    for (let a = sx.a1 + 0.05; a < sb.a1; a += 0.12) cyl('steel', a, (sb.p0 + sb.p1) / 2, yC + 0.7, 0.001, 0.035, 6);
    box('steel', sx.a1, sb.a1, yC + 0.7, yC + 0.74, sb.p0 + 0.05, sb.p1 - 0.05); box('dark', sx.a1, sb.a1, yC, yC + 0.68, sb.p0 + 0.1, sb.p1 - 0.1);   // the rollers out
    box('yellow', sx.a0, sx.a1, yC + 1.45, yC + 1.5, sb.p0 - 0.05, sb.p1 + 0.05);
    // the operator's desk and screen (the other side of the machine), the fences
    box('dark', 2.6, 4.0, yC, yC + 0.75, sb.p0 - 0.95, sb.p0 - 0.35); box('black', 3.0, 3.6, yC + 0.75, yC + 1.2, sb.p0 - 0.7, sb.p0 - 0.64);
    pic(m.screen, 3.3, yC + 0.98, sb.p0 - 0.705, 0.56, 0.4, 0, -1, 'metro-xray-screen', true);
    const fence = (a0, a1, p0, p1) => { box('steel', a0, a1, yC + 0.98, yC + 1.02, p0, p1); box('glass', a0, a1, yC + 0.1, yC + 0.98, p0, p1); };
    fence(SEC.a - 0.03, SEC.a + 0.03, SEC.divider, SEC.open[0]); fence(SEC.a - 0.03, SEC.a + 0.03, SEC.open[1], sb.p0); fence(SEC.a - 0.03, SEC.a + 0.03, SEC.lane[1], CP);
    fence(SEC.a, sb.a1, SEC.lane[1], SEC.lane[1] + 0.06); fence(SEC.a, GATE.a - GATE.depth, SEC.divider - 0.03, SEC.divider + 0.03);
    for (const [a, p] of [[SEC.a, SEC.divider], [SEC.a, SEC.open[0]], [SEC.a, SEC.open[1]], [SEC.a, SEC.lane[1]], [sb.a1, SEC.lane[1]], [GATE.a - GATE.depth, SEC.divider]]) box('steel', a - 0.04, a + 0.04, yC, yC + 1.05, p - 0.04, p + 0.04);
    hang([{ icon: '检' }, { zh: '安检', en: 'Security check' }, { gap: 30 }, { zh: '请主动接受安检', en: 'Bags through the X-ray, please', col: '#e8e0c8' }], 3.4, 4.0, 4.8, -1, 0, yC + 2.6);
  }
  // ---- the gate line ----
  const flaps = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.6, 1), m.flap, GATE.n * 2); flaps.name = 'metro-flaps'; g.add(flaps); flaps.frustumCulled = false;
  const lamps = [];
  for (let k = 0; k <= GATE.n; k++) {
    const p = GATE.p0 - GATE.pitch / 2 + k * GATE.pitch;
    box('steel', GATE.a - GATE.depth, GATE.a + GATE.depth, yC, yC + 0.98, p - 0.14, p + 0.14);
    box('gateTop', GATE.a - GATE.depth + 0.02, GATE.a + GATE.depth - 0.02, yC + 0.98, yC + 1.0, p - 0.13, p + 0.13, 1.6);
  }
  for (let i = 0; i < GATE.n; i++) {
    // the lamp over each end of the channel: a green arrow the way it lets you through, a red cross the other
    const inward = i >= GATE.out, p = gateP(i);
    for (const s of [-1, 1]) { const lm = pic(m.red, GATE.a + s * (GATE.depth + 0.01), yC + 0.9, p + 0.45 - 0.01, 0.12, 0.12, s, 0, 'metro-gate-lamp', true); lamps.push({ o: lm, i, s, go: (s < 0) === inward }); }
  }
  { const gN = GATE.p0 - GATE.pitch / 2 - 0.14, gS = GATE.p0 + (GATE.n - 0.5) * GATE.pitch + 0.14;
    for (const [p0, p1] of [[SERVICE.p1, gN], [gS, CP]]) { box('glass', GATE.a - 0.02, GATE.a + 0.02, yC + 0.1, yC + 1.1, p0, p1); box('steel', GATE.a - 0.03, GATE.a + 0.03, yC + 1.08, yC + 1.12, p0, p1); } }
  hang([{ zh: '进站', en: 'Entrance', big: true }, { arrow: 'right' }], GATE.a - 1.2, 2.0, 2.6, -1, 0, yC + 2.55, [{ zh: '出站', en: 'Exit', big: true }, { arrow: 'down' }]);
  hang([{ zh: '出站', en: 'Exit', big: true }, { arrow: 'down' }], GATE.a + 1.2, -2.7, 2.6, 1, 0, yC + 2.55, [{ zh: '出站', en: 'Way out', big: true }, { arrow: 'left' }]);
  // in the unpaid hall: the way to the trains
  hang([{ zh: '进站', en: 'Entrance' }, { arrow: 'right' }, { badge: 2 }, { zh: '2号线', en: 'Line 2' }, { gap: 20 }, { logo: true }], isE ? -16 : -24, 0, 4.6, -1, 0, yC + 2.6,
    exits.length ? exits.flatMap((e, j) => [...(j ? [{ gap: 30 }] : []), { exit: e.exit }, { zh: e.name.zh, en: e.name.en }]).concat([{ arrow: isE ? 'up-left' : 'left' }]) : null);
  // ---- the paid side: down to the trains ----
  hang([{ badge: 2 }, { zh: '往 广兰路', en: 'To Guanglan Rd' }, { gap: 20 }, { zh: '往 徐泾东', en: 'To East Xujing' }, { arrow: 'down' }], ESC.aT - 2.5, 0, 4.8, -1, 0, yC + 2.6,
    [{ zh: '出站', en: 'Exit' }, { arrow: 'right' }, ...exits.map((e) => ({ exit: e.exit }))]);
  // the escalator well: balustrade round it
  for (const s of [-1, 1]) { box('glass', ESC.aT, ESC.aB, yC, yC + 1.1, s * ESC.well - 0.02, s * ESC.well + 0.02); box('steel', ESC.aT, ESC.aB, yC + 1.08, yC + 1.13, s * ESC.well - 0.04, s * ESC.well + 0.04); box('steel', ESC.aT, ESC.aB, yC - 0.4, yC, s * ESC.well - 0.06, s * ESC.well + 0.06); }
  box('glass', ESC.aB - 0.02, ESC.aB + 0.02, yC, yC + 1.1, -ESC.well, ESC.well); box('steel', ESC.aB - 0.04, ESC.aB + 0.04, yC + 1.08, yC + 1.13, -ESC.well, ESC.well); box('steel', ESC.aB - 0.06, ESC.aB + 0.06, yC - 0.4, yC, -ESC.well, ESC.well);
  box('ceiling', ESC.aT, ESC.aB, yCc, yCc + 0.05, -ESC.well, ESC.well, 3);

  // ================= down: escalators and the stair =================
  const yT = yC, yB = yP, run = ESC.run, plate = ESC.plate;
  const sl = (a) => rampY(a);
  for (const L of ESC.lanes) {
    const p0 = L.p0 + 0.08, p1 = L.p1 - 0.08;
    if (L.carry) {
      // the moving steps (a sloped strip, the texture runs), the comb plates, glass balustrades, handrails, the truss below
      const k = L.carry > 0 ? 'stepsDown' : 'stepsUp';
      quad(bat(k), F, [[ESC.aT - plate, yT + 0.01, p0 + 0.12], [ESC.aT, yT + 0.01, p0 + 0.12], [ESC.aT, yT + 0.01, p1 - 0.12], [ESC.aT - plate, yT + 0.01, p1 - 0.12]], 0.4, p1 - p0 - 0.24);
      quad(bat(k), F, [[ESC.aT, yT + 0.01, p0 + 0.12], [ESC.aB, yB + 0.01, p0 + 0.12], [ESC.aB, yB + 0.01, p1 - 0.12], [ESC.aT, yT + 0.01, p1 - 0.12]], 0.4, p1 - p0 - 0.24);
      quad(bat(k), F, [[ESC.aB, yB + 0.01, p0 + 0.12], [ESC.aB + plate, yB + 0.01, p0 + 0.12], [ESC.aB + plate, yB + 0.01, p1 - 0.12], [ESC.aB, yB + 0.01, p1 - 0.12]], 0.4, p1 - p0 - 0.24);
      box('steel', ESC.aT - plate - 0.5, ESC.aT - plate, yT - 0.02, yT + 0.015, p0, p1); box('steel', ESC.aB + plate, ESC.aB + plate + 0.5, yB - 0.02, yB + 0.015, p0, p1);
      for (const p of [p0, p1]) {
        slab(bat('steel'), F, ESC.aT - plate, ESC.aT, yT, yT, 0.12, p - 0.03, p + 0.03); slab(bat('steel'), F, ESC.aT, ESC.aB, yT, yB, 0.12, p - 0.03, p + 0.03); slab(bat('steel'), F, ESC.aB, ESC.aB + plate, yB, yB, 0.12, p - 0.03, p + 0.03);
        slab(bat('glass'), F, ESC.aT - plate + 0.3, ESC.aT, yT + 0.12, yT + 0.12, 0.8, p - 0.01, p + 0.01); slab(bat('glass'), F, ESC.aT, ESC.aB, yT + 0.12, yB + 0.12, 0.8, p - 0.01, p + 0.01); slab(bat('glass'), F, ESC.aB, ESC.aB + plate - 0.3, yB + 0.12, yB + 0.12, 0.8, p - 0.01, p + 0.01);
        slab(bat('rubber'), F, ESC.aT - plate + 0.2, ESC.aT, yT + 0.92, yT + 0.92, 0.06, p - 0.04, p + 0.04); slab(bat('rubber'), F, ESC.aT, ESC.aB, yT + 0.92, yB + 0.92, 0.06, p - 0.04, p + 0.04); slab(bat('rubber'), F, ESC.aB, ESC.aB + plate - 0.2, yB + 0.92, yB + 0.92, 0.06, p - 0.04, p + 0.04);
      }
      slab(bat('steel'), F, ESC.aT, ESC.aB, yT - 1.05, yB - 0.4, 1.05, L.p0, L.p1);           // the truss's cladding, seen from below
    } else {
      // the stair: granite treads, a nosing strip each
      const n = Math.round(RISE() / 0.165), tread = run / n, rise = RISE() / n;
      for (let i = 0; i < n; i++) { const a = ESC.aT + i * tread, y = yT - (i + 1) * rise; box('granite', a, a + tread + 0.02, y, y + rise, p0, p1, 1); box('yellow', a, a + 0.05, y + rise - 0.002, y + rise + 0.003, p0 + 0.05, p1 - 0.05); }
      slab(bat('dark'), F, ESC.aT, ESC.aB, yT - 0.9, yB - 0.25, 0.6, L.p0, L.p1);
      for (const p of [p0 + 0.06, p1 - 0.06]) slab(bat('steel'), F, ESC.aT, ESC.aB, yT + 0.86, yB + 0.86, 0.05, p - 0.025, p + 0.025);
    }
  }
  // the dividing walls between the lanes and the well's sides (below the concourse floor)
  for (const p of [-1.4, 1.4]) slab(bat('steel'), F, ESC.aT, ESC.aB, yT - 0.6, yB - 0.6, 0.6, p - 0.07, p + 0.07);
  for (const s of [-1, 1]) { const ps = s * ESC.well; slab(bat('panel'), F, ESC.aT, ESC.aB, yT - 1.0, yB - 0.4, 1.0, ps - 0.08, ps + 0.08); box('panel', ESC.aT - plate, ESC.aT + 8.4, yP, yT - 0.2, ps - 0.08, ps + 0.08); }
  box('panel', ESC.aT - plate - 0.1, ESC.aT - plate, yP, yT - 0.2, -ESC.well, ESC.well);
  // the signs at the top and the bottom
  hang([{ icon: '↓' }, { zh: '站台', en: 'Platform' }, { gap: 20 }, { zh: '请靠右站立', en: 'Stand on the right', col: '#e8e0c8' }], ESC.aT - 0.8, 0, 3.6, -1, 0, yC + 2.6);
  hang([{ zh: '出站', en: 'Way out' }, { arrow: 'up' }, { gap: 20 }, { zh: '站厅', en: 'Concourse' }], ESC.aB + 3.0, 0, 3.6, 1, 0, yP + 2.75);

  // ================= the platform =================
  const A0 = PLAT.a0, A1 = PLAT.a1;
  box('platform', A0, A1, yP - 0.1, yP, -PLAT.edge, PLAT.edge, 2.4);
  for (const s of [-1, 1]) { box('tactile', A0 + 1, A1 - 1, yP, yP + 0.006, s * 5.55 - 0.15, s * 5.55 + 0.15, 0.3); box('dark', A0, A1, Y.rail - 0.3, yP - 0.1, s * PLAT.edge - 0.06, s * PLAT.edge + 0.06); }
  for (const a of DOOR_AS) for (const s of [-1, 1]) quad(bat('mark'), F, s > 0 ? [[a - 0.95, yP + 0.008, 3.55], [a + 0.95, yP + 0.008, 3.55], [a + 0.95, yP + 0.008, 5.3], [a - 0.95, yP + 0.008, 5.3]] : [[a + 0.95, yP + 0.008, -3.55], [a - 0.95, yP + 0.008, -3.55], [a - 0.95, yP + 0.008, -5.3], [a + 0.95, yP + 0.008, -5.3]], 1.9, 1.75);
  // ceiling, light lines, the track's higher dark ceiling
  box('ceiling', A0, A1, yPc, yPc + 0.05, -PLAT.edge, PLAT.edge, 3);
  for (const p of [-4.6, -1.6, 1.6, 4.6]) box('light', A0 + 2, A1 - 2, yPc - 0.03, yPc, p - 0.06, p + 0.06);
  for (const s of [-1, 1]) box('black', A0, A1, -6.4, -6.3, Math.min(s * PLAT.edge, s * PLAT.wall), Math.max(s * PLAT.edge, s * PLAT.wall));
  for (const s of [-1, 1]) box('dark', A0, A1, yPc - 0.6, -6.3, s * PLAT.edge - 0.05, s * PLAT.edge + 0.05);
  // columns: round, stainless, the name on two sides
  const colName = signMat(nameTex(S, { w: 512, h: 512, dark: false }), 1.05);
  for (const [a, p] of COLS.plat) { cyl('steel', a, p, yP, yPc - yP, 0.36, 18); cyl('dark', a, p, yP, 0.12, 0.38, 18); pic(colName, a, yP + 1.65, p + Math.sign(p) * 0.37, 0.5, 0.5, 0, Math.sign(p)); pic(colName, a, yP + 1.65, p - Math.sign(p) * 0.37, 0.5, 0.5, 0, -Math.sign(p)); }
  // benches between the columns
  for (const [a, p] of COLS.plat) if (Math.abs(p) > 0 && a + 6 < A1 - 6 && (a + 6 < ESC.aT - 3 || a + 6 > ESC.aB + 5)) { box('steel', a + 4.8, a + 7.2, yP + 0.42, yP + 0.46, p - 0.22, p + 0.22); box('dark', a + 5.0, a + 5.1, yP, yP + 0.42, p - 0.15, p + 0.15); box('dark', a + 6.9, a + 7.0, yP, yP + 0.42, p - 0.15, p + 0.15); }
  // the ends: walls with a staff door
  for (const [a, s] of [[A0, 1], [A1, -1]]) { box('panel', a - 0.08, a + 0.08, yP, yPc, -PLAT.edge, PLAT.edge, 2.4); box('dark', a + s * 0.09, a + s * 0.12, yP, yP + 2.1, -0.6, 0.6); pic(signMat(signTex([{ zh: '工作人员通道', en: 'Staff only' }], { w: 1024, h: 160 })), a + s * 0.14, yP + 2.35, 0, 1.6, 0.25, s, 0); }
  // the screen doors: posts, fixed glass between doorways, headers; the sliding doors (instanced, moved by metro.js)
  const psd = { doors: [] };
  for (const s of [-1, 1]) {
    const pz = s * PLAT.psd, hdr = signMat(psdHeaderTex(s > 0 ? 1 : -1, null), 1.1);
    const openings = DOOR_AS.map((a) => [a - 1.0, a + 1.0]);
    let a = A0 + 2;
    for (const [o0, o1] of openings) { if (o0 > a) { box('psdGlass', a, o0, yP, yP + 2.45, pz - 0.015, pz + 0.015); } box('steel', o0 - 0.06, o0, yP, yP + 2.45, pz - 0.08, pz + 0.08); box('steel', o1, o1 + 0.06, yP, yP + 2.45, pz - 0.08, pz + 0.08); a = o1; }
    box('psdGlass', a, A1 - 2, yP, yP + 2.45, pz - 0.015, pz + 0.015);
    box('dark', A0 + 2, A1 - 2, yP + 2.45, yP + 3.15, pz - 0.18, pz + 0.18); box('steel', A0 + 2, A1 - 2, yP, yP + 0.06, pz - 0.1, pz + 0.1);
    for (let i = 0; i < DOOR_AS.length; i += 1) pic(hdr, DOOR_AS[i], yP + 2.8, pz - s * 0.19, 1.6, 0.2, 0, -s);
    DOOR_AS.forEach((da, i) => psd.doors.push({ a: da, s, i }));
  }
  const psdGeo = new THREE.BoxGeometry(1.0, 2.38, 0.03);
  const psdDoors = new THREE.InstancedMesh(psdGeo, m.psdGlass, psd.doors.length * 2); psdDoors.name = 'metro-psd-doors'; g.add(psdDoors); psdDoors.frustumCulled = false;
  const psdFrames = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 2.38, 0.07), m.steel, psd.doors.length * 2); psdFrames.name = 'metro-psd-frames'; g.add(psdFrames); psdFrames.frustumCulled = false;
  // the track: bed, rails, sleepers, the conductor rail; the far walls with names and light boxes
  for (const s of [-1, 1]) {
    const pc = s * PLAT.track, p0 = Math.min(s * PLAT.edge, s * PLAT.wall), p1 = Math.max(s * PLAT.edge, s * PLAT.wall);
    box('trackbed', A0, A1, Y.rail - 0.6, Y.rail - 0.18, p0, p1);
    for (let a = A0 + 0.3; a < A1; a += 0.62) box('sleeper', a, a + 0.26, Y.rail - 0.18, Y.rail - 0.16, pc - 1.1, pc + 1.1);
    for (const r of [-0.7175, 0.7175]) { box('rail', A0, A1, Y.rail - 0.16, Y.rail, pc + r - 0.035, pc + r + 0.035); }
    box('dark', A0, A1, Y.rail + 4.25, Y.rail + 4.35, pc - 0.06, pc + 0.06); for (let a = A0 + 5; a < A1; a += 10) box('dark', a - 0.03, a + 0.03, Y.rail + 4.35, -6.3, pc - 0.03, pc + 0.03);
    box('trackWall', A0, A1, Y.rail - 0.6, -6.3, Math.min(s * PLAT.wall, s * (PLAT.wall + 0.15)), Math.max(s * PLAT.wall, s * (PLAT.wall + 0.15)), 4);
    const pw = s * (PLAT.wall - 0.02);
    for (let a = A0 + 10, k = 0; a < A1 - 8; a += 15, k++) {
      if (k % 3 === 1) { box('steel', a - 2.1, a + 2.1, yP - 0.2, yP + 2.6, pw - 0.06 * s, pw); pic(signMat(nameTex(S), 1.1), a, yP + 1.2, pw - 0.07 * s, 4.0, 1.0, 0, -s); }
      else { box('steel', a - 1.6, a + 1.6, yP + 0.2, yP + 2.6, pw - 0.06 * s, pw); pic(signMat(posterTex(k + (s > 0 ? 1 : 4)), 1.3), a, yP + 1.4, pw - 0.07 * s, 1.5, 2.25, 0, -s); }
    }
    // the tunnel mouths at both ends
    for (const a of [A0, A1]) { const k = 'black'; box(k, a - 0.1, a + 0.1, Y.rail + 4.7, -6.3, p0, p1); box(k, a - 0.1, a + 0.1, Y.rail - 0.6, -6.3, s > 0 ? PLAT.edge : -PLAT.wall, s > 0 ? PLAT.edge + 0.1 : -PLAT.wall + 0.1); }
  }
  // the platform's hanging signs: which way each side goes, where the way out is, the line map at the escalators
  for (const a of [A0 + 18, A0 + 54, ESC.aB + 26, A1 - 30]) hang([{ badge: 2 }, { zh: '往 徐泾东', en: 'To East Xujing' }, { arrow: 'left' }, { gap: 60 }, { zh: '往 广兰路', en: 'To Guanglan Rd' }, { arrow: 'right' }], a, 0, 4.8, 1, 0, yP + 2.75,
    [{ badge: 2 }, { zh: '往 广兰路', en: 'To Guanglan Rd' }, { arrow: 'left' }, { gap: 60 }, { zh: '往 徐泾东', en: 'To East Xujing' }, { arrow: 'right' }]);
  for (const a of [A0 + 36, A1 - 50]) hang([{ zh: '出站', en: 'Way out' }, { arrow: a < ESC.aT ? 'right' : 'left' }], a, 0, 2.4, a < ESC.aT ? -1 : 1, 0, yP + 2.75, [{ zh: '出站', en: 'Way out' }, { arrow: a < ESC.aT ? 'left' : 'right' }]);
  for (const s of [-1, 1]) pic(signMat(lineMapTex(IDX[S.id], s > 0 ? 1 : -1), 1.15), ESC.aB + 5, yP + 1.6, s * (ESC.well - 0.1), 3.2, 0.5, 0, s);

  // ---- the meshes ----
  const add = (k, name) => { if (!B[k] || B[k].empty) return; const o = B[k].mesh(m[k], `metro-${S.id}-${name || k}`); o.receiveShadow = false; o.castShadow = false; g.add(o); if (k === 'glass' || k === 'psdGlass') o.renderOrder = 3; };
  for (const k of Object.keys(B)) add(k);
  for (const [mat, geos] of merged) { const o = new THREE.Mesh(mergeGeometries(geos, false), mat); o.name = `metro-${S.id}-signs`; o.matrixAutoUpdate = false; g.add(o); }
  return { group: g, flaps, lamps, psdDoors, psdFrames, psd, posters };
}
function RISE() { return Y.C - Y.P; }

// the tunnels between and beyond the stations: one bored tube a track, segment rings, lamps
export function buildTunnels(root, m) {
  const g = new THREE.Group(); g.name = 'metro-tunnels'; root.add(g);
  const [E, L] = STATIONS;
  // where the platforms' ends fall on the line
  const sAt = (st, a) => (st === E ? STOP_S[0] : STOP_S[1]) + (a - PLAT.ac);
  const spans = [[0, sAt(E, PLAT.a0)], [sAt(E, PLAT.a1), sAt(L, PLAT.a0)], [sAt(L, PLAT.a1), LENGTH]];
  const lamps = new Batch(), trays = new Batch();
  for (const dir of [1, -1]) for (const [s0, s1] of spans) {
    const pts = []; for (let s = s0; s <= s1 + 0.01; s += Math.max(4, (s1 - s0) / 400)) { const t = trackAt(Math.min(s, s1), dir); pts.push(new THREE.Vector3(t.x, t.y + 1.6, t.z)); }
    const curve = new THREE.CatmullRomCurve3(pts), len = s1 - s0, segs = Math.max(8, Math.round(len / 3));
    const geo = new THREE.TubeGeometry(curve, segs, 2.85, 16, false), uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 2.4, uv.getY(i) * 4);
    const o = new THREE.Mesh(geo, m.tunnel); o.name = 'metro-tube'; o.matrixAutoUpdate = false; g.add(o);
    // the bed, a light every 25 m on the outer wall, the cable trays
    for (let s = s0 + 3; s < s1 - 3; s += 25) {
      const t = trackAt(s, dir), ox = -t.hz * dir, oz = t.hx * dir;            // toward the line's outside (away from the other track)
      lamps.box(t.x + ox * 2.45, t.y + 2.1, t.z + oz * 2.45, 0.12, 0.08, 0.5, { rotY: -Math.atan2(t.hz, t.hx) });
    }
    for (let s = s0; s < s1; s += 6) { const t = trackAt(s, dir), t2 = trackAt(Math.min(s1, s + 6), dir), ox = -t.hz * dir, oz = t.hx * dir, l = Math.hypot(t2.x - t.x, t2.z - t.z) + 0.05;
      trays.box((t.x + t2.x) / 2 + ox * 2.5, (t.y + t2.y) / 2 + 1.2, (t.z + t2.z) / 2 + oz * 2.5, l, 0.12, 0.3, { rotY: -Math.atan2(t2.z - t.z, t2.x - t.x) });
      trays.box((t.x + t2.x) / 2, (t.y + t2.y) / 2 - 0.25, (t.z + t2.z) / 2, l, 0.2, 3.4, { rotY: -Math.atan2(t2.z - t.z, t2.x - t.x) }); }
  }
  const lm = lamps.mesh(m.tunnelLamp, 'metro-tunnel-lamps'), tm = trays.mesh(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.07, 0.07, 0.075) }), 'metro-tunnel-trays');
  g.add(lm, tm);
  return g;
}
