// Two ground floors you can walk into on the northern Bund (their exteriors are bund.js):
//
// THE PEACE HOTEL (No.20, Sassoon House, 1929), entered from Nanjing Road East through the revolving
// door under the bronze canopy, as the real main entrance is (the Bund door has been shut for decades).
//   - one great hall laid out as the original arcades crossing at an octagon (the 2007-10 restoration took
//     out the concrete mezzanine that had filled it): cream marble underfoot with bands of other stones round
//     the octagon; eight octagonal cream marble pillars with bronze Deco capitals; above, the drum carrying a
//     silver-leaf relief of the Bund, and the octagonal stained-glass laylight in warm yellows on steel ribs;
//     the antique brass chandelier of black metal and engraved glass hanging from its heart; the glass peace
//     dove (施森彬, for the hotel's ninetieth year) on a plinth in the middle
//   - the arcades: pale coffered-beam ceilings (井格梁平顶), antique bronze openwork wall lights (古铜镂花壁灯),
//     walnut wainscot, cream plaster in brass-moulded panels, frosted relief glass in the Lalique manner
//   Sources: docs/living-city-buildings.md (the Peace Hotel lobby)
//   - the front desk (they know you: you told your father you're staying here) and the concierge,
//     who holds what couriers left for you
//   - the Jasmine Lounge along the Bund windows; the Jazz Bar's door (world/jazzBar.js)
//   - the lift lobby: guests only, a guard on it; with your key card, up to the sixth floor and your
//     room (world/hotelUpper.js), whose south end is hoarded off for a refit
//   - a staff-only door that the staff will stop you trying, if they see you
// THE AIA BUILDING (No.17, 1924), through the arched door on the Bund:
//   - a granite lobby, the reception desk, a tenant directory, a visitor QR stand
//   - face-recognition speed gates and a guard. Staff badge through now and then; follow one while
//     the guard is busy with his phone and you're in. Let him see you and you're walked back.
//   - beyond: the lift lobby (badge only)
// Everything here is the game's own: layouts follow published descriptions, not plans; the AIA
// lobby isn't publicly documented, so it is plausible rather than accurate. Text in the world
// (the hotel's name, signs) stays as it would be on site.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { L, colliders, addDynamicCollider } from './layout.js';
import { createPerson } from './people.js';
import { dressHotelSecurity, dressReceptionist, dressConcierge, dressFrontDesk, dressPeaceAmbassador } from './outfits.js';
import { getLang } from '../ui/i18n.js';
import { waitingAt } from '../engine/shopping.js';
import { JAZZ } from './jazzBar.js';
import { contactShadow } from './contactShadow.js';
import { twoBone } from './driverPose.js';
import { sidedGlass, createRoomProbe } from './glass.js';
import { TOD } from './dayNight.js';
import { SIGN_FONTS, loadSignFonts } from './shopSigns.js';
import { woodTextures, plasterTextures, brushedTextures, liftDoorTexture, staffDoorTexture, steelDoorTexture } from './surfaceDetail.js';

export const PEACE = { x0: -60, x1: -35.4, z0: -244, z1: -212.6, h: 5.6, door: [-50, -46], oct: { x: -48, z: -229, r: 6.2, top: 10.5 } };
// the guest lifts in the north wall (the middle one is the one you take), the call plates between them, the floors
// as the dials and the car's buttons number them (British: G, then 1 to 9)
const LIFT = { xs: [-52, -48, -44], car: -48, w: 1.36, h: 2.5, plates: [-50.85, -46.85], floors: ['G', '1', '2', '3', '4', '5', '6', '7', '8', '9'] };
// the attendant's place by the east call plate (facing into the hall), where she steps to press it, and the button
const ATT = { home: { x: -46.15, z: -243.15, yaw: -0.35 }, press: { x: -46.6, z: -243.56 }, plate: -46.85, button: new THREE.Vector3(-46.85, L.curbH + 1.21, -243.95) };
export const AIA = { x0: -47, x1: -34.6, z0: -152, z1: -139, h: 6.2, door: [-147.2, -143.8], gateX: -41.5, gates: [-147.3, -146.1, -144.9, -143.7] };
const T = (zh, en) => (getLang() === 'zh' ? zh : en);
const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const turnTo = (a, b, k) => a + angDiff(a, b) * Math.min(1, k);
const smooth = (t) => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x); };
const Y0 = L.curbH;

// ---- the ground plan: colliders carved out of the solid blocks, roofs over the rain ----
function carve() {
  const zN = L.zNorth - 1, P = PEACE, A = AIA;
  const replace = (tag, boxes) => { const i = colliders.findIndex((c) => c.tag === tag); if (i >= 0) colliders.splice(i, 1, ...boxes.map(([minX, maxX, minZ, maxZ, t]) => ({ minX, maxX, minZ, maxZ, tag: t || tag }))); };
  replace('peace-block', [
    [-140, P.x0, zN, -212], [P.x0, L.facadeX, zN, P.z0], [P.x1, L.facadeX, P.z0, -212],
    [P.x0, P.door[0], P.z1, -212, 'peace-front'], [P.door[1], P.x1, P.z1, -212, 'peace-front'],
    // the front desk and concierge (west), the lift lobby's back wall (north), the lounge piano
    [P.x0 + 1.3, P.x0 + 3.6, -233.2, -224.6, 'desk'], [P.x0 + 1.3, P.x0 + 3.2, -239.6, -235.4, 'desk'],
    [-41.2, -39.6, -243.0, -240.65, 'piano'], [-40.8, -40.0, -243.5, -243.15, 'piano'],
  ]);
  for (let i = 0; i < 8; i++) {                                     // the eight pillars round the octagon
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8, x = P.oct.x + Math.cos(a) * P.oct.r, z = P.oct.z + Math.sin(a) * P.oct.r;
    colliders.push({ minX: x - 0.5, maxX: x + 0.5, minZ: z - 0.5, maxZ: z + 0.5, tag: 'pillar' });
  }
  colliders.push({ minX: P.oct.x - 0.6, maxX: P.oct.x + 0.6, minZ: P.oct.z - 0.6, maxZ: P.oct.z + 0.6, tag: 'pillar' });   // the dove's plinth
  replace('aia-block', [
    [-140, L.facadeX, -190, A.z0], [-140, L.facadeX, A.z1, -131], [-140, A.x0, A.z0, A.z1],
    [A.x1, L.facadeX, A.z0, A.door[0], 'aia-front'], [A.x1, L.facadeX, A.door[1], A.z1, 'aia-front'],
    [-40.7, -36.3, -141.35, A.z1, 'desk'],                          // reception, on the public side by the south wall (the receptionist behind it)
    [-35.85, -35.35, -140.55, -140.05, 'desk'],                     // the visitor QR stand
  ]);
  // the Doric columns either side of the door, outside on the pavement (their plinths)
  for (const z of [A.door[0] - 0.6, A.door[1] + 0.6]) colliders.push({ minX: L.facadeX + 0.05, maxX: L.facadeX + 0.85, minZ: z - 0.4, maxZ: z + 0.4, tag: 'pillar' });
  // the gate line: solid but for the gate lanes (each lane has its own flap collider, opened by a badge)
  const lanes = A.gates, w = 0.55;
  const solid = [[A.z0, lanes[0] - w]];
  for (let i = 0; i < lanes.length - 1; i++) solid.push([lanes[i] + w, lanes[i + 1] - w]);
  solid.push([lanes[lanes.length - 1] + w, A.z1]);                   // wall to wall: no way round
  for (const [a, b] of solid) if (b > a) colliders.push({ minX: A.gateX - 0.15, maxX: A.gateX + 0.15, minZ: a, maxZ: b, tag: 'gates' });
}
carve();
// furniture, pillars and gates stand on the ground floor only (the upper storey is world/hotelUpper.js)
for (const c of colliders) if (['desk', 'piano', 'pillar', 'gates'].includes(c.tag)) { c.y0 = 0; c.y1 = 8; }

// ---- textures ----
const loader = new THREE.TextureLoader();
function tx(name, rep, srgb) { const t = loader.load(`./textures/${name}`); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; return t; }
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
// the octagonal stained-glass laylight over the atrium, as restored in 2010: geometric Art Deco leading in warm
// yellows (honey, amber, pale gold, cream), a sunburst at the heart, rings of chevrons and stepped diamonds, a
// stepped border; a few small panes of teal and garnet for the jewel notes. Drawn flat, seen from below.
const stainedGlass = () => canvasTex(1024, 1024, (x, w) => {
  const c = w / 2, oct = (r, rot = Math.PI / 8) => { x.beginPath(); for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI * 2 + rot; i ? x.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r) : x.moveTo(c + Math.cos(a) * r, c + Math.sin(a) * r); } x.closePath(); };
  const HONEY = '#e9b64c', AMBER = '#c98428', GOLD = '#f5d985', CREAM = '#f6ead0', DEEP = '#a8621f', TEAL = '#5a8f7c', GARNET = '#9a4a2a';
  x.fillStyle = '#14100a'; x.fillRect(0, 0, w, w);
  // segments of each ring between angle a0..a1 and radii r0..r1, as wedges
  const wedge = (r0, r1, a0, a1, col) => { x.beginPath(); x.arc(c, c, r1, a0, a1); x.arc(c, c, r0, a1, a0, true); x.closePath(); x.fillStyle = col; x.fill(); };
  // the border: stepped zigzag in amber and cream
  oct(c * 0.995); x.fillStyle = DEEP; x.fill();
  for (let i = 0; i < 64; i++) { const a0 = (i / 64) * Math.PI * 2, a1 = ((i + 1) / 64) * Math.PI * 2; wedge(c * 0.86, c * (i % 2 ? 0.95 : 0.91), a0, a1, i % 2 ? CREAM : HONEY); }
  // stepped diamonds: 16 round, honey on amber, a teal or garnet jewel in every fourth
  for (let i = 0; i < 16; i++) { const a0 = (i / 16) * Math.PI * 2; wedge(c * 0.62, c * 0.86, a0, a0 + Math.PI / 8, i % 2 ? AMBER : HONEY);
    const am = a0 + Math.PI / 16, rm = c * 0.74; x.beginPath(); x.moveTo(c + Math.cos(am) * (rm + c * 0.06), c + Math.sin(am) * (rm + c * 0.06)); x.lineTo(c + Math.cos(am + 0.06) * rm, c + Math.sin(am + 0.06) * rm); x.lineTo(c + Math.cos(am) * (rm - c * 0.06), c + Math.sin(am) * (rm - c * 0.06)); x.lineTo(c + Math.cos(am - 0.06) * rm, c + Math.sin(am - 0.06) * rm); x.closePath();
    x.fillStyle = i % 4 === 0 ? TEAL : i % 4 === 2 ? GARNET : GOLD; x.fill(); x.strokeStyle = '#17110a'; x.lineWidth = 3; x.stroke(); }
  // chevrons pointing in, 32 round
  for (let i = 0; i < 32; i++) { const a0 = (i / 32) * Math.PI * 2, a1 = a0 + Math.PI / 16, am = (a0 + a1) / 2;
    x.beginPath(); x.moveTo(c + Math.cos(a0) * c * 0.6, c + Math.sin(a0) * c * 0.6); x.lineTo(c + Math.cos(am) * c * 0.42, c + Math.sin(am) * c * 0.42); x.lineTo(c + Math.cos(a1) * c * 0.6, c + Math.sin(a1) * c * 0.6); x.closePath(); x.fillStyle = i % 2 ? CREAM : GOLD; x.fill();
    x.beginPath(); x.moveTo(c + Math.cos(a0) * c * 0.42, c + Math.sin(a0) * c * 0.42); x.lineTo(c + Math.cos(am) * c * 0.42, c + Math.sin(am) * c * 0.42); x.lineTo(c + Math.cos(a0) * c * 0.6, c + Math.sin(a0) * c * 0.6); x.closePath(); x.fillStyle = AMBER; x.fill(); }
  // the sunburst: rays of alternating gold and cream from a white-gold heart
  for (let i = 0; i < 24; i++) { const a0 = (i / 24) * Math.PI * 2; wedge(c * 0.1, c * 0.42, a0, a0 + Math.PI / 12, i % 2 ? GOLD : CREAM); }
  const g = x.createRadialGradient(c, c, 0, c, c, c * 0.14); g.addColorStop(0, '#fffaf0'); g.addColorStop(1, GOLD); x.beginPath(); x.arc(c, c, c * 0.12, 0, Math.PI * 2); x.fillStyle = g; x.fill();
  // the leading: rings, radial lines, a little irregular hand-made texture in each pane
  x.strokeStyle = '#17110a'; x.lineCap = 'round';
  x.lineWidth = 7; for (const r of [0.12, 0.42, 0.6, 0.62, 0.86, 0.995]) { oct(c * r); x.stroke(); }
  x.lineWidth = 3; for (const r of [0.91, 0.95]) { x.beginPath(); x.arc(c, c, c * r, 0, Math.PI * 2); x.stroke(); }
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; x.lineWidth = 3; x.beginPath(); x.moveTo(c + Math.cos(a) * c * 0.12, c + Math.sin(a) * c * 0.12); x.lineTo(c + Math.cos(a) * c * 0.42, c + Math.sin(a) * c * 0.42); x.stroke(); }
  for (let i = 0; i < 64; i++) { const a = (i / 64) * Math.PI * 2; x.lineWidth = 2.5; x.beginPath(); x.moveTo(c + Math.cos(a) * c * 0.86, c + Math.sin(a) * c * 0.86); x.lineTo(c + Math.cos(a) * c * 0.95, c + Math.sin(a) * c * 0.95); x.stroke(); }
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; x.lineWidth = 9; x.beginPath(); x.moveTo(c + Math.cos(a) * c * 0.12, c + Math.sin(a) * c * 0.12); x.lineTo(c + Math.cos(a) * c, c + Math.sin(a) * c); x.stroke(); }   // the steel ribs' shadow lines
  const img = x.getImageData(0, 0, w, w), d = img.data;                                                            // seedy, uneven antique glass
  for (let i = 0; i < d.length; i += 4) { const n = ((Math.sin(i * 12.9898) * 43758.5453) % 1) * 18 - 9; d[i] += n; d[i + 1] += n * 0.9; d[i + 2] += n * 0.6; }
  x.putImageData(img, 0, 0);
});
// a silver-leaf relief of the Bund (the restored atrium has one along its elevations): the waterfront's skyline,
// left to right from the Peace Hotel's pyramid to the Customs House clock tower and the HSBC dome, the river
// and a steamer in front; drawn as a height map, shaded to read as raised silver
const bundRelief = () => {
  const W = 2048, H = 256, [cv, x] = (() => { const c = document.createElement('canvas'); c.width = W; c.height = H; return [c, c.getContext('2d')]; })();
  const r = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const v = (h) => `rgb(${h},${h},${h})`;
  x.fillStyle = v(46); x.fillRect(0, 0, W, H);                                                                 // the ground of the relief
  const sky = 196;                                                                                                // the river line
  // building silhouettes: [x, width, height, top]
  const B = [[20, 120, 120, 'flat'], [150, 90, 104, 'flat'], [250, 150, 150, 'pyramid'], [410, 120, 130, 'flat'], [540, 110, 120, 'stepped'], [660, 140, 100, 'flat'], [810, 100, 110, 'flat'],
    [920, 130, 120, 'flat'], [1060, 110, 180, 'clock'], [1180, 180, 150, 'dome'], [1370, 120, 110, 'flat'], [1500, 130, 125, 'stepped'], [1640, 110, 100, 'flat'], [1760, 140, 118, 'cupola'], [1910, 120, 96, 'flat']];
  for (const [bx, bw, bh, top] of B) {
    const y0 = sky - bh;
    x.fillStyle = v(150); x.fillRect(bx, y0, bw, bh);
    x.fillStyle = v(118); for (let fy = y0 + 18; fy < sky - 14; fy += 26) for (let fx = bx + 12; fx < bx + bw - 12; fx += 20) x.fillRect(fx, fy, 8, 13);   // windows, sunk
    x.fillStyle = v(172); for (let fx = bx + 6; fx < bx + bw - 4; fx += 40) x.fillRect(fx, y0 + 8, 4, bh - 10);                                    // pilasters, raised
    x.fillStyle = v(180); x.fillRect(bx - 3, y0, bw + 6, 5);                                                      // cornice
    x.fillStyle = v(165);
    if (top === 'pyramid') { x.beginPath(); x.moveTo(bx + bw * 0.3, y0); x.lineTo(bx + bw / 2, y0 - 46); x.lineTo(bx + bw * 0.7, y0); x.fill(); }
    if (top === 'stepped') { x.fillRect(bx + bw * 0.2, y0 - 14, bw * 0.6, 14); x.fillRect(bx + bw * 0.35, y0 - 26, bw * 0.3, 12); }
    if (top === 'clock') { x.fillRect(bx + bw * 0.3, y0 - 60, bw * 0.4, 60); x.fillStyle = v(205); x.beginPath(); x.arc(bx + bw / 2, y0 - 38, 11, 0, Math.PI * 2); x.fill(); x.fillStyle = v(165); x.beginPath(); x.moveTo(bx + bw * 0.3, y0 - 60); x.lineTo(bx + bw / 2, y0 - 84); x.lineTo(bx + bw * 0.7, y0 - 60); x.fill(); }
    if (top === 'dome') { x.beginPath(); x.ellipse(bx + bw / 2, y0, bw * 0.24, 40, 0, Math.PI, 0); x.fill(); x.fillRect(bx + bw / 2 - 3, y0 - 54, 6, 14); }
    if (top === 'cupola') { x.fillRect(bx + bw * 0.4, y0 - 20, bw * 0.2, 20); x.beginPath(); x.ellipse(bx + bw / 2, y0 - 20, bw * 0.12, 14, 0, Math.PI, 0); x.fill(); }
  }
  // the river: ripples, a steamer with two funnels, a junk's sail
  for (let y = sky + 6; y < H - 4; y += 7) { x.fillStyle = v(70 + r() * 30); for (let xx = 0; xx < W; xx += 30 + r() * 30) x.fillRect(xx, y, 14 + r() * 20, 2); }
  x.fillStyle = v(175); x.fillRect(700, sky + 18, 220, 22); x.fillRect(740, sky + 4, 120, 14); x.fillRect(770, sky - 18, 16, 22); x.fillRect(812, sky - 18, 16, 22);
  x.beginPath(); x.moveTo(1500, sky + 36); x.lineTo(1560, sky + 36); x.lineTo(1540, sky + 46); x.lineTo(1512, sky + 46); x.fill(); x.beginPath(); x.moveTo(1528, sky + 34); x.quadraticCurveTo(1520, sky - 6, 1532, sky - 24); x.lineTo(1556, sky + 34); x.fill();
  // shade the height map as raised silver: light from the upper left
  const hm = x.getImageData(0, 0, W, H).data, out = x.createImageData(W, H), o = out.data;
  for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
    const i = (yy * W + xx) * 4, hgt = hm[i], hl = hm[(yy * W + Math.max(0, xx - 2)) * 4], hu = hm[(Math.max(0, yy - 2) * W + xx) * 4];
    const slope = (hgt - hl) * 1.6 + (hgt - hu) * 1.6, base = 92 + hgt * 0.6 + slope;   // (a strong relief: it has to read from the floor, 6-8 m below)
    o[i] = Math.max(40, Math.min(255, base * 0.97)); o[i + 1] = Math.max(40, Math.min(255, base * 0.98)); o[i + 2] = Math.max(40, Math.min(255, base * 1.02)); o[i + 3] = 255;
  }
  x.putImageData(out, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
};
// a frosted relief glass panel in the Lalique manner (moulded, satin, lit from behind): a stylised fountain of
// leaves and falling water, framed in a stepped border
const laliqueGlass = () => canvasTex(256, 768, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#cfc6b4'); g.addColorStop(0.5, '#f4eee2'); g.addColorStop(1, '#cfc6b4'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.strokeStyle = 'rgba(120,108,90,0.55)'; x.lineWidth = 4; x.strokeRect(10, 10, w - 20, h - 20); x.strokeRect(22, 22, w - 44, h - 44);
  const leaf = (cx, cy, a, l) => { x.save(); x.translate(cx, cy); x.rotate(a); x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(l * 0.3, -l * 0.18, l, 0); x.quadraticCurveTo(l * 0.3, l * 0.18, 0, 0); x.fillStyle = 'rgba(255,255,255,0.75)'; x.fill(); x.strokeStyle = 'rgba(110,98,80,0.5)'; x.lineWidth = 2; x.stroke(); x.restore(); };
  for (let k = 0; k < 9; k++) { const y = h - 90 - k * 66; for (const s of [-1, 1]) leaf(w / 2, y, s > 0 ? -0.5 - k * 0.04 : Math.PI + 0.5 + k * 0.04, 60 + (k % 3) * 8); }
  x.strokeStyle = 'rgba(255,255,255,0.8)'; x.lineWidth = 3; for (let k = -3; k <= 3; k++) { x.beginPath(); x.moveTo(w / 2 + k * 6, 60); x.bezierCurveTo(w / 2 + k * 22, 160, w / 2 + k * 30, 300, w / 2 + k * 34, h - 60); x.stroke(); }
  x.fillStyle = 'rgba(110,98,80,0.35)'; x.beginPath(); x.moveTo(w / 2 - 50, h - 50); x.lineTo(w / 2 + 50, h - 50); x.lineTo(w / 2 + 30, h - 80); x.lineTo(w / 2 - 30, h - 80); x.fill();
});
// the chandelier's glass: translucent, engraved with interlocking curves and V shapes (as described of the
// octagon's antique brass chandelier)
const chandelierGlass = () => canvasTex(256, 384, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#fff3d6'); g.addColorStop(1, '#f2d39a'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.strokeStyle = 'rgba(150,110,60,0.55)'; x.lineWidth = 5;
  for (let k = 0; k < 4; k++) { const y = 40 + k * 90; x.beginPath(); x.moveTo(20, y); x.lineTo(w / 2, y + 60); x.lineTo(w - 20, y); x.stroke(); }                 // the V's
  x.lineWidth = 3; for (let k = 0; k < 3; k++) { const y = 85 + k * 90; x.beginPath(); x.arc(w * 0.3, y, 34, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.arc(w * 0.7, y, 34, 0, Math.PI * 2); x.stroke(); }   // interlocking rings
  x.strokeRect(6, 6, w - 12, h - 12);
});
// the openwork of a bronze wall light: a pierced lattice of lozenges and scrolls (alpha: the holes let the glow out)
const fretwork = () => canvasTex(256, 256, (x, w, h) => {
  x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'destination-out';
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const cx = 32 + i * 64, cy = 32 + j * 64; x.beginPath(); x.moveTo(cx, cy - 24); x.lineTo(cx + 18, cy); x.lineTo(cx, cy + 24); x.lineTo(cx - 18, cy); x.closePath(); x.fill();
    x.beginPath(); x.arc(cx + 32, cy + 32, 7, 0, Math.PI * 2); x.fill(); }
  x.globalCompositeOperation = 'source-over';
});
// the gilt frieze under the cornice: stepped chevrons and sunbursts in relief on walnut, 1.2 m a repeat
const friezeTexture = () => { const t = canvasTex(512, 192, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2a180d'); g.addColorStop(1, '#1a0e07'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  const gilt = (draw) => { x.save(); x.translate(1.5, 2); x.strokeStyle = 'rgba(0,0,0,0.6)'; x.fillStyle = 'rgba(0,0,0,0.6)'; draw(); x.restore();
    const gg = x.createLinearGradient(0, 0, 0, h); gg.addColorStop(0, '#f0d58e'); gg.addColorStop(0.5, '#b88a3c'); gg.addColorStop(1, '#e2c070'); x.strokeStyle = gg; x.fillStyle = gg; draw(); };
  gilt(() => { x.fillRect(0, 8, w, 6); x.fillRect(0, h - 14, w, 6); });
  // a sunburst in the middle of the repeat, chevrons stepping out either side
  gilt(() => { x.lineWidth = 4; const cx = w / 2, cy = h - 22; for (let k = 0; k <= 10; k++) { const a = Math.PI + (k / 10) * Math.PI; x.beginPath(); x.moveTo(cx + Math.cos(a) * 18, cy + Math.sin(a) * 18); x.lineTo(cx + Math.cos(a) * 128, cy + Math.sin(a) * 128); x.stroke(); }
    x.beginPath(); x.arc(cx, cy, 18, Math.PI, 0); x.fill(); });
  gilt(() => { x.lineWidth = 5; for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { const ox = w / 2 + s * (150 + k * 26); x.beginPath(); x.moveTo(ox - 13, h - 22); x.lineTo(ox, 30); x.lineTo(ox + 13, h - 22); x.stroke(); } });
  gilt(() => { x.lineWidth = 3; for (const ex of [0, w]) { x.beginPath(); x.arc(ex, h / 2 + 8, 34, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.arc(ex, h / 2 + 8, 18, 0, Math.PI * 2); x.stroke(); } });
}); t.wrapS = THREE.RepeatWrapping; return t; };
// the octagon inlaid in the cream marble floor: bands of other stones round it (black Marquina, a red-brown
// Rosso, a grey-green), brass strips between, a compass of eight points in cream and grey at the heart
const floorInlay = () => canvasTex(1024, 1024, (x, w) => {
  const c = w / 2; x.clearRect(0, 0, w, w);
  const oct = (r) => { x.beginPath(); for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; const px = c + Math.cos(a) * r, py = c + Math.sin(a) * r; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath(); };
  const vein = (col, n) => { x.save(); x.clip(); x.strokeStyle = col; for (let k = 0; k < n; k++) { x.lineWidth = 0.5 + Math.random() * 1.5; x.beginPath(); let px = Math.random() * w, py = Math.random() * w; x.moveTo(px, py); for (let s2 = 0; s2 < 8; s2++) { px += (Math.random() - 0.4) * 90; py += (Math.random() - 0.5) * 60; x.lineTo(px, py); } x.stroke(); } x.restore(); };
  oct(c * 0.99); x.fillStyle = '#16171a'; x.fill(); oct(c * 0.99); vein('rgba(230,230,230,0.35)', 40);              // Nero Marquina, white-veined
  oct(c * 0.9); x.fillStyle = '#7a3a2c'; x.fill(); oct(c * 0.9); vein('rgba(220,190,170,0.25)', 30);                // Rosso
  oct(c * 0.84); x.fillStyle = '#e9e0cf'; x.fill(); oct(c * 0.84); vein('rgba(150,135,110,0.25)', 50);               // the cream field
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, a2 = a + Math.PI / 16 * (i % 2 ? 1 : 1), l = i % 2 ? c * 0.36 : c * 0.62;   // the compass
    for (const [side, col] of [[-1, i % 2 ? '#9aa39b' : '#5f6b63'], [1, i % 2 ? '#c9c2b3' : '#e9e0cf']]) { x.beginPath(); x.moveTo(c, c); x.lineTo(c + Math.cos(a + side * 0.13) * c * 0.16, c + Math.sin(a + side * 0.13) * c * 0.16); x.lineTo(c + Math.cos(a) * l, c + Math.sin(a) * l); x.closePath(); x.fillStyle = col; x.fill(); } void a2; }
  x.beginPath(); x.arc(c, c, c * 0.06, 0, Math.PI * 2); x.fillStyle = '#16171a'; x.fill();
  x.strokeStyle = '#c8a050'; x.lineWidth = 6; for (const r of [0.99, 0.9, 0.84, 0.66]) { oct(c * r); x.stroke(); }
  x.lineWidth = 3; x.beginPath(); x.arc(c, c, c * 0.06, 0, Math.PI * 2); x.stroke();
});
// No.17's walls: black marble inlaid with gold mosaic (as the building's interiors are described), here 2.2 m a bay:
// a polished black dado to 1.1 m, black panels framed in bands of gold tesserae above, a gold mosaic frieze at the
// top; a second canvas marks the gold for the metalness map
const nero = (() => { let cache = null; return () => cache || (cache = (() => {
  const W = 352, H = 992, px = H / 6.2, mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return [c, c.getContext('2d')]; };
  const [c, x] = mk(), [mc, m] = mk();
  x.fillStyle = '#121214'; x.fillRect(0, 0, W, H); m.fillStyle = '#000'; m.fillRect(0, 0, W, H);
  let s2 = 17; const r = () => ((s2 = (s2 * 16807) % 2147483647) / 2147483647);
  for (let k2 = 0; k2 < 26; k2++) { x.strokeStyle = `rgba(200,200,205,${0.04 + r() * 0.09})`; x.lineWidth = 0.5 + r() * 1.1; x.beginPath(); let a = r() * W, b = r() * H; x.moveTo(a, b); for (let q = 0; q < 7; q++) { a += (r() - 0.45) * 70; b += (r() - 0.3) * 90; x.lineTo(a, b); } x.stroke(); }   // white veins
  const y = (metres) => H - metres * px;
  const gold = (x0, y0, w, h) => {                                                                          // a band of gold tesserae
    const t = 5; for (let yy = y0; yy < y0 + h; yy += t) for (let xx = x0; xx < x0 + w; xx += t) { const g = 160 + r() * 80; x.fillStyle = `rgb(${g},${g * 0.78 | 0},${g * 0.36 | 0})`; x.fillRect(xx, yy, t - 1, t - 1); }
    m.fillStyle = '#fff'; m.fillRect(x0, y0, w, h);
  };
  x.fillStyle = 'rgba(255,255,255,0.05)'; x.fillRect(0, y(1.1), W, 1.1 * px);                             // the dado, a shade glossier
  gold(0, y(1.15), W, 0.05 * px);                                                                         // its gold line
  gold(0.18 * px, y(5.1), 0.06 * px, 3.7 * px); gold(W - 0.24 * px, y(5.1), 0.06 * px, 3.7 * px);       // the panel's frame
  gold(0.18 * px, y(5.1), W - 0.36 * px, 0.06 * px); gold(0.18 * px, y(1.46), W - 0.36 * px, 0.06 * px);
  gold(0.42 * px, y(4.86), W - 0.84 * px, 0.025 * px); gold(0.42 * px, y(1.66), W - 0.84 * px, 0.025 * px); // an inner fillet
  gold(0, y(5.85), W, 0.42 * px);                                                                         // the frieze
  x.fillStyle = '#121214'; for (let k2 = 0; k2 < 8; k2++) { const cx = (k2 + 0.5) * W / 8, cy = y(5.64); x.beginPath(); x.moveTo(cx, cy - 18); x.lineTo(cx + 12, cy); x.lineTo(cx, cy + 18); x.lineTo(cx - 12, cy); x.fill(); }   // black lozenges in it
  const map = new THREE.CanvasTexture(c), metal = new THREE.CanvasTexture(mc);
  map.colorSpace = THREE.SRGBColorSpace; for (const t of [map, metal]) { t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8; }
  return { map, metal };
})()); })();
// the vestibule's dome: gold mosaic, a rosette of darker gold at the crown, rings and rays of tesserae
const goldMosaic = () => canvasTex(1024, 1024, (x, w) => {
  const c = w / 2; let s2 = 23; const r = () => ((s2 = (s2 * 16807) % 2147483647) / 2147483647);
  for (let yy = 0; yy < w; yy += 6) for (let xx = 0; xx < w; xx += 6) { const d = Math.hypot(xx - c, yy - c) / c, g = 150 + r() * 90 - (d < 0.18 ? 50 : 0) - ((Math.floor(d * 12) % 3 === 0) ? 25 : 0); x.fillStyle = `rgb(${g | 0},${g * 0.78 | 0},${g * 0.34 | 0})`; x.fillRect(xx, yy, 5, 5); }
  x.strokeStyle = 'rgba(70,40,10,0.7)'; x.lineWidth = 6; for (const rr of [0.18, 0.5, 0.75, 0.97]) { x.beginPath(); x.arc(c, c, c * rr, 0, Math.PI * 2); x.stroke(); }
  x.lineWidth = 3; for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; x.beginPath(); x.moveTo(c + Math.cos(a) * c * 0.18, c + Math.sin(a) * c * 0.18); x.lineTo(c + Math.cos(a) * c * 0.5, c + Math.sin(a) * c * 0.5); x.stroke(); }
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; x.fillStyle = 'rgba(40,60,90,0.55)'; x.beginPath(); x.arc(c + Math.cos(a) * c * 0.625, c + Math.sin(a) * c * 0.625, c * 0.05, 0, Math.PI * 2); x.fill(); }   // lapis roundels
});
// the plaster ceiling's relief (石膏拓花): a grid of coffers with rosettes, cream, shaded as if lit from the room
const plasterRelief = () => { const t = canvasTex(512, 512, (x, w) => {
  x.fillStyle = '#e9e1cf'; x.fillRect(0, 0, w, w);
  const sh = (x0, y0, ww, hh, d) => { x.fillStyle = 'rgba(255,255,255,0.55)'; x.fillRect(x0, y0, ww, d); x.fillRect(x0, y0, d, hh); x.fillStyle = 'rgba(90,75,50,0.35)'; x.fillRect(x0, y0 + hh - d, ww, d); x.fillRect(x0 + ww - d, y0, d, hh); };
  sh(20, 20, w - 40, w - 40, 10); sh(52, 52, w - 104, w - 104, 6);
  const c = w / 2; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; x.fillStyle = i % 2 ? 'rgba(90,75,50,0.25)' : 'rgba(255,255,255,0.5)'; x.beginPath(); x.ellipse(c + Math.cos(a) * 44, c + Math.sin(a) * 44, 30, 12, a, 0, Math.PI * 2); x.fill(); }
  x.fillStyle = 'rgba(90,75,50,0.3)'; x.beginPath(); x.arc(c, c, 16, 0, Math.PI * 2); x.fill();
  for (const [a, b] of [[36, 36], [w - 36, 36], [36, w - 36], [w - 36, w - 36]]) { x.fillStyle = 'rgba(255,255,255,0.5)'; x.beginPath(); x.arc(a, b, 9, 0, Math.PI * 2); x.fill(); }
}); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
// the 百寿图 in No.17's lobby: a relief of a hundred forms of 寿 (longevity), made for the building when AIA opened it
// in 1998 (Xinhua, 6 Aug 2025: "由100个不同形态的篆书'寿'字组成"). Ten by ten, each in its own cartouche, gilt on a dark
// bronze ground; the forms vary by face, proportion, weight and frame (the game has no seal-script face, so the
// hundred are drawn from the four sign faces, squared and stretched toward the seal manner). Returns { map,
// normalMap, redraw } (redraw once the faces have loaded).
function longevityRelief() {
  const N = 1024, mk = () => { const c = document.createElement('canvas'); c.width = c.height = N; return [c, c.getContext('2d')]; };
  const [c, x] = mk(), [hc, h] = mk(), [nc, n] = mk();
  const map = new THREE.CanvasTexture(c), normalMap = new THREE.CanvasTexture(nc); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = normalMap.anisotropy = 8;
  const faces = [SIGN_FONTS.kai, SIGN_FONTS.song, SIGN_FONTS.wei, SIGN_FONTS.hei];
  const draw = () => {
    const g = x.createLinearGradient(0, 0, N, N); g.addColorStop(0, '#3b2a17'); g.addColorStop(1, '#24180c'); x.fillStyle = g; x.fillRect(0, 0, N, N);
    h.fillStyle = '#000'; h.fillRect(0, 0, N, N);
    const M = 44, cell = (N - 2 * M) / 10;
    // a raised border round the field
    for (const ctx of [x, h]) { ctx.strokeStyle = ctx === x ? '#c9a24a' : '#fff'; ctx.lineWidth = 10; ctx.strokeRect(18, 18, N - 36, N - 36); ctx.lineWidth = 3; ctx.strokeRect(34, 34, N - 68, N - 68); }
    let s2 = 1998; const r = () => ((s2 = (s2 * 16807) % 2147483647) / 2147483647);
    for (let j = 0; j < 10; j++) for (let i = 0; i < 10; i++) {
      const k = j * 10 + i, cx = M + (i + 0.5) * cell, cy = M + (j + 0.5) * cell, R = cell * 0.44;
      const frame = k % 5, face = faces[(k * 7 + j) % 4], sx = 0.78 + ((k * 13) % 7) * 0.05, sy = 1.0 + ((k * 5) % 4) * 0.06, weight = (k * 3) % 4;
      const path = (ctx) => { ctx.beginPath();
        if (frame === 0) ctx.arc(cx, cy, R, 0, Math.PI * 2);
        else if (frame === 1) ctx.rect(cx - R, cy - R, 2 * R, 2 * R);
        else if (frame === 2) { for (let q = 0; q <= 8; q++) { const a = (q / 8) * Math.PI * 2 + Math.PI / 8; q ? ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R) : ctx.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); } }
        else if (frame === 3) { ctx.moveTo(cx, cy - R); ctx.lineTo(cx + R, cy); ctx.lineTo(cx, cy + R); ctx.lineTo(cx - R, cy); ctx.closePath(); }
        else ctx.ellipse(cx, cy, R * 0.8, R, 0, 0, Math.PI * 2); };
      // the cartouche: a sunk field with a gilt rim
      path(x); x.fillStyle = 'rgba(0,0,0,0.25)'; x.fill(); x.strokeStyle = '#b8903e'; x.lineWidth = 2.5; x.stroke();
      path(h); h.strokeStyle = '#888'; h.lineWidth = 2.5; h.stroke();
      // the character, gilt, raised
      for (const [ctx, fill] of [[x, null], [h, '#fff']]) {
        ctx.save(); ctx.translate(cx, cy); ctx.scale(sx, sy); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `${weight > 1 ? 900 : 400} ${Math.round(cell * 0.6)}px ${face}`;
        if (fill) { ctx.fillStyle = fill; ctx.fillText('寿', 0, 2); }
        else {
          ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillText('寿', 1.5, 3.5);                                     // its shadow on the ground
          const gg = ctx.createLinearGradient(0, -cell * 0.3, 0, cell * 0.3); gg.addColorStop(0, '#f6dc8e'); gg.addColorStop(0.5, '#c79a42'); gg.addColorStop(1, '#e8c56c');
          ctx.fillStyle = gg; ctx.fillText('寿', 0, 2);
          if (weight === 3) { ctx.strokeStyle = '#8a6528'; ctx.lineWidth = 1.2; ctx.strokeText('寿', 0, 2); }
        }
        ctx.restore();
      }
      void r;
    }
    // the normal map from the height
    const H = h.getImageData(0, 0, N, N).data, out = n.createImageData(N, N), o = out.data;
    for (let yy = 0; yy < N; yy++) for (let xx = 0; xx < N; xx++) {
      const at = (a, b) => H[((Math.min(N - 1, Math.max(0, b))) * N + Math.min(N - 1, Math.max(0, a))) * 4];
      const dx = (at(xx + 1, yy) - at(xx - 1, yy)) / 255, dy = (at(xx, yy + 1) - at(xx, yy - 1)) / 255, i = (yy * N + xx) * 4;
      const nx = -dx * 2.2, ny = dy * 2.2, l = Math.hypot(nx, ny, 1);
      o[i] = (nx / l * 0.5 + 0.5) * 255; o[i + 1] = (ny / l * 0.5 + 0.5) * 255; o[i + 2] = (1 / l * 0.5 + 0.5) * 255; o[i + 3] = 255;
    }
    n.putImageData(out, 0, 0);
    map.needsUpdate = true; normalMap.needsUpdate = true;
  };
  draw();
  loadSignFonts().then(draw);
  return { map, normalMap };
}
const signTex = (lines, { bg = '#1a1510', fg = '#d9b46a', w = 512, h = 128 } = {}) => canvasTex(w, h, (x) => {
  x.fillStyle = bg; x.fillRect(0, 0, w, h); x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  lines.forEach(([t, size], i) => { x.font = `600 ${size}px "Noto Serif SC", serif`; x.fillText(t, w / 2, h * (i + 1) / (lines.length + 1)); });
});

export function createInteriors({ scene, people, hud, audio, getLife, save, player, onCard, onLift, renderer }) {
  const group = new THREE.Group(); group.name = 'interiors'; scene.add(group);
  const marble = new THREE.MeshStandardMaterial({ map: tx('marble_01_diff_1k.jpg', 3, true), normalMap: tx('marble_01_nor_gl_1k.jpg', 3, false), roughnessMap: tx('marble_01_rough_1k.jpg', 3, false), roughness: 0.42, color: 0xefe7d8, envMapIntensity: 1.2 });
  const marbleDark = new THREE.MeshStandardMaterial({ map: marble.map, normalMap: marble.normalMap, roughness: 0.25, color: 0x3d4a44, envMapIntensity: 1.3 });
  // close up these are grained walnut, trowelled plaster and brushed brass (world/surfaceDetail.js), not flat colours;
  // UVs are in metres (metricUV below), so the grain and the trowel marks keep their size on every piece
  const wd = woodTextures('walnut'), pl = plasterTextures(), br = brushedTextures();
  const walnut = new THREE.MeshStandardMaterial({ map: wd.map, normalMap: wd.normalMap, normalScale: new THREE.Vector2(0.5, 0.5), roughnessMap: wd.roughnessMap, color: 0xf0dcc8, roughness: 0.55, metalness: 0.05, emissive: 0x070302 });
  const plaster = new THREE.MeshStandardMaterial({ map: pl.map, normalMap: pl.normalMap, normalScale: new THREE.Vector2(0.6, 0.6), color: 0xece0c8, roughness: 0.9, emissive: 0x22180c });   // warm: lamplight, not the blue night outside
  const brass = new THREE.MeshStandardMaterial({ color: 0xc89b4a, roughness: 0.55, roughnessMap: br.roughnessMap, normalMap: br.normalMap, normalScale: new THREE.Vector2(0.3, 0.3), metalness: 1, envMapIntensity: 1.4 });
  const granite = new THREE.MeshStandardMaterial({ map: tx('granite_tile_04_diff_1k.jpg', 1, true), color: 0xb9b2a6, roughness: 0.5, emissive: 0x0d0c0a });
  const frosted = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.45, 1.22, 0.9) });             // lit glass (bloom makes it glow)
  // the panes (world/glass.js): what's behind them plus a reflection of your own side, Fresnel-weighted; "inside" is
  // each building's hall, its lamplit floor and ceiling what the glass gives back from within
  const PEACE_BOX = { min: [PEACE.x0, Y0 - 1, PEACE.z0], max: [PEACE.x1, Y0 + 12, PEACE.z1] }, AIA_BOX = { min: [AIA.x0, Y0 - 1, AIA.z0], max: [AIA.x1, Y0 + 10, AIA.z1] };
  const glass = sidedGlass({ name: 'peace-glass', box: PEACE_BOX, proj: { min: [PEACE.x0, Y0, PEACE.z0], max: [PEACE.x1, Y0 + PEACE.h, PEACE.z1] }, room: { floor: [0.3, 0.23, 0.15], ceil: [0.62, 0.48, 0.31] } });
  const glassAia = sidedGlass({ name: 'aia-glass', box: AIA_BOX, proj: { min: [AIA.x0, Y0, AIA.z0], max: [AIA.x1, Y0 + AIA.h, AIA.z1] }, room: { floor: [0.42, 0.4, 0.36], ceil: [0.52, 0.47, 0.38] } });
  const aiaPanes = [glassAia];
  const dark = new THREE.MeshStandardMaterial({ color: 0x141210, roughness: 0.7 });
  // a geometry's UVs in metres / tile (planes and boxes; anything else is left as it is)
  const metricUV = (geo, tile = 1) => {
    const p = geo.parameters || {}, uv = geo.attributes.uv;
    if (geo.type === 'PlaneGeometry') { for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * p.width / tile, uv.getY(i) * p.height / tile); }
    else if (geo.type === 'BoxGeometry') {
      const dims = [[p.depth, p.height], [p.depth, p.height], [p.width, p.depth], [p.width, p.depth], [p.width, p.height], [p.width, p.height]];
      for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / tile, uv.getY(i) * dims[f][1] / tile); }
    }
    else if (geo.type === 'RoundedBoxGeometry') {
      // projected from the position by the face's main axis (a rounded box has no per-face sizes to go by)
      const pos = geo.attributes.position, nrm = geo.attributes.normal;
      for (let i = 0; i < uv.count; i++) {
        const ax = Math.abs(nrm.getX(i)), ay = Math.abs(nrm.getY(i)), az = Math.abs(nrm.getZ(i));
        if (ax >= ay && ax >= az) uv.setXY(i, pos.getZ(i) / tile, pos.getY(i) / tile); else if (ay >= az) uv.setXY(i, pos.getX(i) / tile, pos.getZ(i) / tile); else uv.setXY(i, pos.getX(i) / tile, pos.getY(i) / tile);
      }
    }
    return geo;
  };
  const TILED = new Set([walnut, plaster, brass]);
  const add = (geo, mat, x, y, z, ry = 0, rx = 0) => { if (TILED.has(mat)) metricUV(geo, mat === plaster ? 2 : mat === brass ? 0.5 : 1); const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); m.receiveShadow = true; group.add(m); return m; };
  const box = (w, h, d, mat, x, y, z, ry = 0) => add(new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z, ry);
  const rbox = (w, h, d, r, mat, x, y, z) => add(new RoundedBoxGeometry(w, h, d, 3, r), mat, x, y + h / 2, z);
  // an inward-facing wall from (ax, az) to (bx, bz), y0..y1, facing the point (cx, cz)
  function wall(ax, az, bx, bz, y0, y1, mat, cx, cz) {
    const len = Math.hypot(bx - ax, bz - az), m = add(new THREE.PlaneGeometry(len, y1 - y0), mat, (ax + bx) / 2, (y0 + y1) / 2, (az + bz) / 2);
    const nx = -(bz - az) / len, nz = (bx - ax) / len, toward = (cx - m.position.x) * nx + (cz - m.position.z) * nz > 0 ? 1 : -1;
    m.rotation.y = Math.atan2(nx * toward, nz * toward); return m;
  }
  // a wall with openings [a, b] along it (door height dh), wainscot to 1.3 m, plaster above
  function walls(ax, az, bx, bz, h, cx, cz, openings = [], dh = 3.2, wain = walnut, upper = plaster) {
    const len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
    const at = (t) => [ax + ux * t, az + uz * t];
    let t0 = 0;
    for (const [o0, o1] of [...openings, [len, len]]) {
      if (o0 > t0) { const [x0, z0] = at(t0), [x1, z1] = at(o0); wall(x0, z0, x1, z1, Y0, Y0 + 1.3, wain, cx, cz); wall(x0, z0, x1, z1, Y0 + 1.3, Y0 + h, upper, cx, cz); }
      if (o1 > o0 && o1 < len) { const [x0, z0] = at(o0), [x1, z1] = at(o1); wall(x0, z0, x1, z1, Y0 + dh, Y0 + h, upper, cx, cz); }
      t0 = o1;
    }
  }
  const lights = [];   // extra light sources for world/lighting.js's pool
  const clerestory = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75, 0.62, 0.45) });   // dim glazing round the drum
  // a club armchair in oxblood leather (the Jasmine Lounge's): a rounded plinth, a loose cushion, a back that leans a
  // little with a stitched panel line, rolled arms, short tapered walnut legs on brass cups; geometry shared
  const chairMat = new THREE.MeshPhysicalMaterial({ color: 0x5a1a17, roughness: 0.45, clearcoat: 0.3, clearcoatRoughness: 0.45, sheen: 0.25, sheenColor: new THREE.Color(0x8a4a40) });
  const legWood = new THREE.MeshStandardMaterial({ color: 0x3b2618, roughness: 0.45 }), seamMat = new THREE.MeshStandardMaterial({ color: 0x2a0b09, roughness: 0.7 });
  const CHR = { body: new RoundedBoxGeometry(0.74, 0.3, 0.72, 4, 0.05), cushion: new RoundedBoxGeometry(0.52, 0.12, 0.54, 4, 0.05), back: new RoundedBoxGeometry(0.74, 0.46, 0.17, 4, 0.07),
    arm: new RoundedBoxGeometry(0.13, 0.24, 0.68, 4, 0.05), roll: new THREE.CylinderGeometry(0.08, 0.08, 0.68, 20, 1).rotateX(Math.PI / 2), seam: new THREE.BoxGeometry(0.5, 0.008, 0.012),
    leg: new THREE.CylinderGeometry(0.022, 0.014, 0.09, 10), cup: new THREE.CylinderGeometry(0.016, 0.016, 0.02, 10) };
  function armchair(x, z, ry) {
    const g = new THREE.Group(); g.position.set(x, Y0, z); g.rotation.y = ry; group.add(g);
    const put = (geo, mat, px, py, pz, rx = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.rotation.x = rx; m.castShadow = m.receiveShadow = true; g.add(m); };
    contactShadow(group, x, Y0, z, 0.95, 0.95, 0.45, ry);
    put(CHR.body, chairMat, 0, 0.24, 0); put(CHR.cushion, chairMat, 0, 0.45, 0.06); put(CHR.back, chairMat, 0, 0.62, -0.28, -0.12); put(CHR.seam, seamMat, 0, 0.64, -0.19, -0.12);
    for (const sx of [-1, 1]) { put(CHR.arm, chairMat, sx * 0.305, 0.48, 0); put(CHR.roll, chairMat, sx * 0.305, 0.61, 0); }
    for (const sx of [-0.3, 0.3]) for (const sz of [-0.29, 0.29]) { put(CHR.leg, legWood, sx, 0.045, sz); put(CHR.cup, brass, sx, 0.008, sz); }
  }

  // ================= THE PEACE HOTEL =================
  const P = PEACE, pcx = (P.x0 + P.x1) / 2, pcz = (P.z0 + P.z1) / 2;
  add(new THREE.PlaneGeometry(P.x1 - P.x0, P.z1 - P.z0), marble, pcx, Y0 + 0.004, pcz, 0, -Math.PI / 2);
  add(new THREE.PlaneGeometry(P.oct.r * 2.6, P.oct.r * 2.6), new THREE.MeshStandardMaterial({ map: floorInlay(), transparent: true, roughness: 0.3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), P.oct.x, Y0 + 0.008, P.oct.z, 0, -Math.PI / 2);
  // walls: south (Nanjing Rd, the door), east (the Bund, windows on the lounge), north (lifts), west (desk, staff door)
  walls(P.x0, P.z1, P.x1, P.z1, P.h, pcx, pcz, [[P.door[0] - P.x0, P.door[1] - P.x0]]);
  walls(P.x1, P.z1, P.x1, P.z0, P.h, pcx, pcz, [[16, 19], [22, 25], [27.5, 30.5]], 3.6);                 // windows onto the Bund (glazed below)
  walls(P.x1, P.z0, P.x0, P.z0, P.h, pcx, pcz, LIFT.xs.map((x) => [P.x1 - x - LIFT.w / 2, P.x1 - x + LIFT.w / 2]).sort((a, b) => a[0] - b[0]), LIFT.h);   // the lifts' openings
  walls(P.x0, P.z0, P.x0, P.z1, P.h, pcx, pcz, [[(P.z1 - 21.1) - P.z0 - 0.66, (P.z1 - 21.1) - P.z0 + 0.66]], 2.4);   // the staff door (its opening behind the door leaf)
  // the lounge's windows onto the Bund: bronze frames in three lights with a transom, a marble upstand, drapes tied back
  {
    const bronzeW = new THREE.MeshStandardMaterial({ color: 0x4a3420, roughness: 0.35, metalness: 0.85, envMapIntensity: 1.2 });
    const drapeTex = canvasTex(256, 64, (x, w, h) => { for (let i = 0; i < w; i++) { const v = 0.78 + 0.22 * Math.sin(i / w * Math.PI * 14) * Math.sin(i / w * Math.PI * 3 + 1); x.fillStyle = `rgb(${Math.round(222 * v)},${Math.round(200 * v)},${Math.round(160 * v)})`; x.fillRect(i, 0, 1, h); } });
    const drape = new THREE.MeshStandardMaterial({ map: drapeTex, roughness: 0.85, sheen: 0.5 });
    for (const [a, b] of [[16, 19], [22, 25], [27.5, 30.5]]) {
      const z0 = P.z1 - a, z1 = P.z1 - b, zc2 = (z0 + z1) / 2, W = Math.abs(z1 - z0), xw = P.x1 - 0.12;
      add(new THREE.PlaneGeometry(W, 3.45), glass, P.x1 - 0.1, Y0 + 0.15 + 3.45 / 2, zc2, Math.PI / 2);
      box(0.3, 0.15, W, marbleDark, P.x1 - 0.15, Y0, zc2);                                                   // the upstand
      for (const dz of [-W / 2, W / 2]) box(0.12, 3.45, 0.09, bronzeW, xw, Y0 + 0.15, zc2 + dz);            // jambs
      box(0.12, 0.1, W, bronzeW, xw, Y0 + 3.5, zc2); box(0.12, 0.07, W, bronzeW, xw, Y0 + 2.75, zc2);       // head, transom
      for (const k of [1, 2]) box(0.1, 3.4, 0.05, bronzeW, xw, Y0 + 0.15, z0 - Math.sign(z0 - z1) * 0 + (z1 - z0) * k / 3);   // mullions
      box(0.1, 0.05, W, bronzeW, xw, Y0 + 0.9, zc2);                                                        // a guard rail across the lower lights
      // the drapes, tied back either side, and a pelmet over
      for (const s2 of [-1, 1]) { const d = add(new THREE.BoxGeometry(0.14, 3.9, 0.55), drape, P.x1 - 0.32, Y0 + 1.95, zc2 + s2 * (W / 2 + 0.25)); d.castShadow = true; box(0.18, 0.05, 0.6, brass, P.x1 - 0.32, Y0 + 1.1, zc2 + s2 * (W / 2 + 0.25)); }
      box(0.24, 0.34, W + 1.3, drape, P.x1 - 0.28, Y0 + 3.85, zc2);
    }
  }
  // ceiling with the octagon open to the drum and the laylight
  const ringPt = (i, r) => { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; return [P.oct.x + Math.cos(a) * r, P.oct.z + Math.sin(a) * r]; };
  const R0 = P.oct.r + 0.6, ceilY = Y0 + P.h;
  const bronzeDark = new THREE.MeshStandardMaterial({ color: 0x3b2a18, roughness: 0.4, metalness: 0.9, envMapIntensity: 1.2 });
  const blackMetal = new THREE.MeshStandardMaterial({ color: 0x141312, roughness: 0.45, metalness: 0.8 });
  const paleBeam = new THREE.MeshStandardMaterial({ map: pl.map, normalMap: pl.normalMap, normalScale: new THREE.Vector2(0.4, 0.4), color: 0xf3ead8, roughness: 0.85, emissive: 0x1a130a });
  {
    // (shape y becomes world z once turned face-down by +90° about x)
    const sh = new THREE.Shape(); sh.moveTo(P.x0, P.z0); sh.lineTo(P.x1, P.z0); sh.lineTo(P.x1, P.z1); sh.lineTo(P.x0, P.z1); sh.closePath();
    const hole = new THREE.Path(); for (let i = 0; i <= 8; i++) { const [x, z] = ringPt(i, R0); i ? hole.lineTo(x, z) : hole.moveTo(x, z); }
    sh.holes.push(hole);
    const ceil = add(new THREE.ShapeGeometry(sh), plaster, 0, ceilY, 0, 0, Math.PI / 2); ceil.material = plaster.clone(); ceil.material.side = THREE.DoubleSide; ceil.material.color.set(0xf1e6d0);
    // the arcades' coffered-beam ceiling (井格梁平顶, pale, simplified classical mouldings): beams on a 3.1 m grid,
    // each with a fillet under it; in alternate coffers an octagonal flush light of frosted glass in a brass ring
    const beams = [], flush = [], CELL = 3.1, near = (x, z) => Math.hypot(x - P.oct.x, z - P.oct.z) < R0 + 0.4;
    const beam = (x, z, lx, lz) => { if (near(x, z)) return; const g = new THREE.BoxGeometry(lx, 0.34, lz); g.translate(x, ceilY - 0.17, z); beams.push(g); const f = new THREE.BoxGeometry(lx + (lx > lz ? 0 : 0.12), 0.05, lz + (lz > lx ? 0 : 0.12)); f.translate(x, ceilY - 0.365, z); beams.push(f); };
    for (let x = P.x0 + CELL; x < P.x1 - 0.5; x += CELL) for (let z = P.z0; z < P.z1 - 0.01; z += CELL / 2) beam(x, Math.min(z + CELL / 4, P.z1 - 0.1), 0.3, Math.min(CELL / 2, P.z1 - z));
    for (let z = P.z0 + CELL; z < P.z1 - 0.5; z += CELL) for (let x = P.x0; x < P.x1 - 0.01; x += CELL / 2) beam(Math.min(x + CELL / 4, P.x1 - 0.1), z, Math.min(CELL / 2, P.x1 - x), 0.3);
    let k = 0;
    for (let x = P.x0 + CELL / 2; x < P.x1; x += CELL) for (let z = P.z0 + CELL / 2; z < P.z1; z += CELL) { if (near(x, z) || ((k++) % 2)) continue; flush.push([x, z]); }
    if (beams.length) { const m = new THREE.Mesh(mergeGeometries(beams), paleBeam); m.receiveShadow = true; group.add(m); }
    const fg = new THREE.CircleGeometry(0.42, 8, Math.PI / 8).rotateX(Math.PI / 2), rg = new THREE.TorusGeometry(0.44, 0.03, 4, 8).rotateX(Math.PI / 2);
    for (const [x, z] of flush) { const f = new THREE.Mesh(fg, frosted); f.position.set(x, ceilY - 0.02, z); group.add(f); const r = new THREE.Mesh(rg, brass); r.position.set(x, ceilY - 0.03, z); group.add(r); }
    // the drum: eight panels rising from the ceiling to the laylight; on each, a stretch of the silver-leaf relief of
    // the Bund, framed in brass; clerestory glazing above, a moulded ring at the foot
    const relief = bundRelief(), top = Y0 + P.oct.top;
    const silver = new THREE.MeshStandardMaterial({ map: relief, color: 0xebe7df, roughness: 0.45, metalness: 0.35, envMapIntensity: 0.7, emissive: 0x4a4640, emissiveMap: relief });   // (silver leaf under warm lamplight)
    for (let i = 0; i < 8; i++) {
      const [ax, az] = ringPt(i, R0), [bx, bz] = ringPt(i + 1, R0);
      wall(ax, az, bx, bz, ceilY, top - 0.9, plaster, P.oct.x, P.oct.z);
      wall(ax, az, bx, bz, top - 0.9, top - 0.45, clerestory, P.oct.x, P.oct.z);
      wall(ax, az, bx, bz, top - 0.45, top, plaster, P.oct.x, P.oct.z);
      // the relief panel: 1.6 m tall, a little in from the panel's corners, a face of the panorama each
      const ins = 0.12, cx = (ax + bx) / 2, cz = (az + bz) / 2, toC = Math.hypot(P.oct.x - cx, P.oct.z - cz), nx = (P.oct.x - cx) / toC, nz = (P.oct.z - cz) / toC;
      const len = Math.hypot(bx - ax, bz - az) * (1 - 2 * ins), g = new THREE.PlaneGeometry(len, 1.6), uv = g.attributes.uv;
      for (let j = 0; j < uv.count; j++) uv.setX(j, ((i % 4) + uv.getX(j)) / 4);   // (the skyline twice round the drum)
      const m = new THREE.Mesh(g, silver); m.position.set(cx + nx * 0.03, ceilY + 2.05, cz + nz * 0.03); m.rotation.y = Math.atan2(nx, nz); group.add(m);
      const frame = (w, h, y, off) => { const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), brass); f.position.set(cx + nx * 0.05, y, cz + nz * 0.05); f.rotation.y = Math.atan2(nx, nz); f.translateX(off); group.add(f); };
      frame(len + 0.1, 0.06, ceilY + 2.88, 0); frame(len + 0.1, 0.06, ceilY + 1.22, 0); frame(0.06, 1.72, ceilY + 2.05, -len / 2 - 0.02); frame(0.06, 1.72, ceilY + 2.05, len / 2 + 0.02);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(bx - ax, bz - az) + 0.1, 0.3, 0.16), paleBeam); foot.position.set(cx + nx * 0.08, ceilY + 0.15, cz + nz * 0.08); foot.rotation.y = Math.atan2(nx, nz); group.add(foot);
    }
    // the laylight: the stained glass in a shallow faceted octagonal dome on eight steel ribs, lit from behind
    // (daylight by day, the cavity's lamps at night); a plain ring of plaster round it at the drum's head
    {
      const rise = [0, 0.55, 1.0], radii = [R0, R0 * 0.55, 0], pos = [], uvs = [], idx = [];
      const vtx = (i, ring) => { const [x, z] = ring === 2 ? [P.oct.x, P.oct.z] : ringPt(i, radii[ring]); pos.push(x - P.oct.x, rise[ring], z - P.oct.z); uvs.push(0.5 + (x - P.oct.x) / (2 * R0), 0.5 - (z - P.oct.z) / (2 * R0)); return pos.length / 3 - 1; };
      for (let i = 0; i < 8; i++) { const a0 = vtx(i, 0), a1 = vtx(i + 1, 0), b0 = vtx(i, 1), b1 = vtx(i + 1, 1), c = vtx(i, 2); idx.push(a0, a1, b1, a0, b1, b0, b0, b1, c); }
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); lg.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); lg.setIndex(idx); lg.computeVertexNormals();
      const lay = new THREE.Mesh(lg, new THREE.MeshBasicMaterial({ map: stainedGlass(), side: THREE.DoubleSide, color: new THREE.Color(1.3, 1.18, 1.0) })); lay.position.set(P.oct.x, top, P.oct.z); group.add(lay);
      for (let i = 0; i < 8; i++) {                                                                         // the ribs
        const [x0, z0] = ringPt(i, R0), [x1, z1] = ringPt(i, R0 * 0.55);
        for (const [pa, pb] of [[[x0, top, z0], [x1, top + 0.55, z1]], [[x1, top + 0.55, z1], [P.oct.x, top + 1.0, P.oct.z]]]) {
          const A = new THREE.Vector3(...pa), Bv = new THREE.Vector3(...pb), rib = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, A.distanceTo(Bv)), blackMetal);
          rib.position.copy(A).add(Bv).multiplyScalar(0.5); rib.lookAt(Bv); rib.position.y -= 0.04; group.add(rib);
        }
      }
      const ring = new THREE.Shape(); for (let i = 0; i <= 8; i++) { const [x, z] = ringPt(i, R0 + 0.9); i ? ring.lineTo(x, z) : ring.moveTo(x, z); }
      const rh = new THREE.Path(); for (let i = 0; i <= 8; i++) { const [x, z] = ringPt(i, R0); i ? rh.lineTo(x, z) : rh.moveTo(x, z); } ring.holes.push(rh);
      const cap = add(new THREE.ShapeGeometry(ring), plaster, 0, top + 0.01, 0, 0, Math.PI / 2); cap.material = plaster.clone(); cap.material.side = THREE.DoubleSide;
    }
    // the octagon's chandelier: antique brass and black metal, an octagonal lantern of translucent engraved glass,
    // a stepped crown and a pointed finial, on a rod from the laylight's heart
    {
      const ch = new THREE.Group(); ch.position.set(P.oct.x, Y0 + 7.0, P.oct.z); group.add(ch);
      const glassM = new THREE.MeshBasicMaterial({ map: chandelierGlass(), color: new THREE.Color(1.5, 1.32, 1.05), side: THREE.DoubleSide });
      const rr = 0.72, hh = 1.15, side = 2 * rr * Math.tan(Math.PI / 8);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2, px = Math.sin(a) * rr, pz = Math.cos(a) * rr;
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(side, hh), glassM); pane.position.set(px, 0, pz); pane.rotation.y = a; ch.add(pane);
        const ca = a + Math.PI / 8, rc = rr / Math.cos(Math.PI / 8), post = new THREE.Mesh(new THREE.BoxGeometry(0.05, hh + 0.1, 0.05), blackMetal); post.position.set(Math.sin(ca) * rc, 0, Math.cos(ca) * rc); post.rotation.y = ca; ch.add(post);
      }
      const band = (r, h, y, m, r2 = r) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r2, h, 8, 1), m); b.rotation.y = Math.PI / 8; b.position.y = y; ch.add(b); return b; };
      band(rr / Math.cos(Math.PI / 8) + 0.05, 0.1, hh / 2 + 0.05, brass); band(rr / Math.cos(Math.PI / 8) + 0.05, 0.1, -hh / 2 - 0.05, brass);
      band(0.62, 0.16, hh / 2 + 0.18, blackMetal, 0.8); band(0.4, 0.16, hh / 2 + 0.34, brass, 0.6); band(0.18, 0.2, hh / 2 + 0.52, blackMetal, 0.36);        // the stepped crown
      band(0.05, 0.4, -hh / 2 - 0.28, brass, 0.72);                                                                             // the finial, a glass point in brass
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.5, 8), glassM); tip.rotation.set(Math.PI, Math.PI / 8, 0); tip.position.y = -hh / 2 - 0.36; ch.add(tip);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), brass); knob.position.y = -hh / 2 - 0.64; ch.add(knob);
      const rodLen = top + 1.0 - (Y0 + 7.0 + hh / 2 + 0.62), rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, rodLen, 8), blackMetal); rod.position.y = hh / 2 + 0.62 + rodLen / 2; ch.add(rod);
      lights.push({ x: P.oct.x, y: Y0 + 6.6, z: P.oct.z, intensity: 22, distance: 15, color: new THREE.Color(1.0, 0.84, 0.6) });
    }
  }
  // the eight pillars round the octagon: octagonal shafts of cream marble on black Marquina plinths, a stepped
  // bronze Deco capital with a band of frosted glass, lit from within
  const marbleCream = new THREE.MeshStandardMaterial({ map: marble.map, normalMap: marble.normalMap, roughnessMap: marble.roughnessMap, color: 0xf3ead9, roughness: 0.35, envMapIntensity: 1.3 });
  const marquina = new THREE.MeshStandardMaterial({ map: marble.map, normalMap: marble.normalMap, color: 0x1d1e21, roughness: 0.2, envMapIntensity: 1.4 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8, x = P.oct.x + Math.cos(a) * P.oct.r, z = P.oct.z + Math.sin(a) * P.oct.r;
    const shaft = add(new THREE.CylinderGeometry(0.4, 0.4, P.h - 1.45, 8), marbleCream, x, Y0 + 0.55 + (P.h - 1.45) / 2, z); shaft.rotation.y = Math.PI / 8;
    const pl0 = add(new THREE.CylinderGeometry(0.52, 0.56, 0.5, 8), marquina, x, Y0 + 0.25, z); pl0.rotation.y = Math.PI / 8;
    contactShadow(group, x, Y0, z, 1.7, 1.7, 0.45);
    const pl1 = add(new THREE.CylinderGeometry(0.46, 0.5, 0.06, 8), brass, x, Y0 + 0.53, z); pl1.rotation.y = Math.PI / 8;
    [[0.44, 0.08, P.h - 0.9, brass], [0.47, 0.22, P.h - 0.75, frosted], [0.5, 0.08, P.h - 0.5, brass], [0.56, 0.12, P.h - 0.4, bronzeDark], [0.64, 0.14, P.h - 0.26, brass]]
      .forEach(([r, h, y, m]) => { const c = add(new THREE.CylinderGeometry(r, r, h, 8), m, x, Y0 + y + h / 2, z); c.rotation.y = Math.PI / 8; });
  }
  // the peace dove (和平鸽): a glass dove taking wing on a black marble plinth at the heart of the octagon, given to
  // the hotel by the glass artist Shi Senbin (施森彬) for its ninetieth year
  {
    const plinth = add(new THREE.CylinderGeometry(0.5, 0.55, 0.95, 8), marquina, P.oct.x, Y0 + 0.475, P.oct.z); plinth.rotation.y = Math.PI / 8;
    contactShadow(group, P.oct.x, Y0, P.oct.z, 1.7, 1.7, 0.45);
    const lip = add(new THREE.CylinderGeometry(0.56, 0.56, 0.05, 8), brass, P.oct.x, Y0 + 0.97, P.oct.z); lip.rotation.y = Math.PI / 8;
    const block = add(new THREE.BoxGeometry(0.34, 0.1, 0.34), new THREE.MeshStandardMaterial({ color: 0xdfeaf0, roughness: 0.05, transparent: true, opacity: 0.55, envMapIntensity: 2 }), P.oct.x, Y0 + 1.05, P.oct.z); block.rotation.y = 0.4;   // a clear glass base
    const dove = new THREE.Group(); dove.position.set(P.oct.x, Y0 + 1.3, P.oct.z); dove.rotation.y = 0.4; dove.scale.setScalar(1.7); group.add(dove);   // (facing the door, a little turned)
    const crystal = new THREE.MeshStandardMaterial({ color: 0xeaf3f8, roughness: 0.05, metalness: 0.15, transparent: true, opacity: 0.82, envMapIntensity: 2.6, emissive: 0x2a3a42 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 14), crystal); body.scale.set(0.8, 0.75, 1.6); body.rotation.x = -0.35; dove.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), crystal); head.position.set(0, 0.17, 0.25); dove.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.07, 8), crystal); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.16, 0.34); dove.add(beak);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.3, 10, 1, true), crystal); tail.scale.set(1, 1, 0.25); tail.rotation.x = -Math.PI / 2 - 0.5; tail.position.set(0, -0.12, -0.32); dove.add(tail);
    // the wings: a feathered outline (scalloped trailing edge), raised in a V and swept back
    const wing = new THREE.Shape(); wing.moveTo(0, 0); wing.bezierCurveTo(0.18, 0.12, 0.42, 0.2, 0.62, 0.16);
    for (let f = 0; f < 5; f++) { const x0 = 0.62 - f * 0.12, x1 = x0 - 0.12; wing.quadraticCurveTo(x0 - 0.02, 0.02 - f * 0.012, x1, 0.05 - f * 0.01); }
    wing.lineTo(0, -0.06); wing.closePath();
    const wg = new THREE.ExtrudeGeometry(wing, { depth: 0.012, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 1 });
    for (const s2 of [1, -1]) { const w = new THREE.Mesh(wg, crystal); w.scale.x = s2; w.position.set(s2 * 0.05, 0.04, 0.02); w.rotation.set(-0.1, s2 * 0.5, s2 * 0.42); dove.add(w); }
    lights.push({ x: P.oct.x, y: Y0 + 2.4, z: P.oct.z, intensity: 4, distance: 4, color: new THREE.Color(0.95, 0.97, 1.0) });   // a pin spot on it
  }
  // wall lights: antique bronze openwork (古铜镂花) half-lanterns on every wall, a dim warm glow through the fret
  const fret = fretwork(), fretMat = new THREE.MeshStandardMaterial({ color: 0x5a3e22, metalness: 0.9, roughness: 0.4, alphaMap: fret, alphaTest: 0.5, side: THREE.DoubleSide });
  const glowIn = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.15, 0.7) });
  const sconce = (x, z, ry) => {
    const g = new THREE.Group(); g.position.set(x, Y0 + 2.5, z); g.rotation.y = ry; group.add(g);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.12, 0.5, 12, 1, true, -Math.PI / 2, Math.PI), fretMat); sh.position.z = 0.02; g.add(sh);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.07, 0.4, 10, 1, true, -Math.PI / 2, Math.PI), glowIn); core.position.z = 0.02; g.add(core);
    for (const [y, r] of [[0.27, 0.19], [-0.27, 0.14]]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.04, 12, 1, false, -Math.PI / 2, Math.PI), bronzeDark); c.position.set(0, y, 0.02); g.add(c); }
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.03), bronzeDark); back.position.z = 0.015; g.add(back);
  };
  for (let x = P.x0 + 4; x < P.x1 - 3; x += 4) { if (Math.abs(x - -50) > 0.8 && Math.abs(x - -46) > 0.8 && [-52, -48, -44].every((lx) => Math.abs(lx - x) > 0.9)) sconce(x, P.z0 + 0.03, 0); }
  for (let z = P.z1 - 4; z > P.z0 + 3; z -= 4) { if (Math.abs(z - (P.z1 - 21.1)) > 1.2 && Math.abs(z - -228.9) > 4.4) sconce(P.x0 + 0.03, z, Math.PI / 2); }   // (clear of the desk's sign and its glass panels)
  // the Lalique-manner glass: tall frosted relief panels, backlit, between the lift doors and flanking the desk's sign
  {
    const lal = new THREE.MeshBasicMaterial({ map: laliqueGlass(), color: new THREE.Color(1.15, 1.08, 0.98) });
    const panel = (x, z, ry) => { const g = new THREE.Group(); g.position.set(x, Y0 + 1.6, z); g.rotation.y = ry; group.add(g);
      const p2 = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.86), lal); p2.position.z = 0.05; g.add(p2);
      for (const [w, h, px, py] of [[0.74, 0.06, 0, 0.96], [0.74, 0.06, 0, -0.96], [0.06, 1.98, -0.37, 0], [0.06, 1.98, 0.37, 0]]) { const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), brass); f.position.set(px, py, 0.05); g.add(f); } };
    for (const x of [-50, -46]) panel(x, P.z0 + 0.04, 0);
    for (const z of [-224.9, -232.45]) panel(P.x0 + 0.04, z, Math.PI / 2);   // (clear of the staff door's architrave at -233)
  }
  // the front desk's lamps: two Deco lamps of frosted glass on stepped brass bases
  for (const z of [-226.2, -231.6]) {
    box(0.22, 0.05, 0.22, brass, P.x0 + 2.4, Y0 + 1.13, z); box(0.14, 0.05, 0.14, brass, P.x0 + 2.4, Y0 + 1.18, z);
    add(new THREE.CylinderGeometry(0.015, 0.015, 0.32, 8), brass, P.x0 + 2.4, Y0 + 1.39, z);
    add(new THREE.CylinderGeometry(0.1, 0.17, 0.2, 8, 1), frosted, P.x0 + 2.4, Y0 + 1.6, z);
  }
  // the walls' dressing, as in the restored hall: a gilt Art Deco frieze under the cornice, the plaster between
  // the pilasters set out in moulded panels, a brass dado rail on the walnut wainscot, a dark marble skirting
  {
    const friezeMat = new THREE.MeshStandardMaterial({ map: friezeTexture(), roughness: 0.45, metalness: 0.35, emissive: 0x1a1006 });
    const fy = Y0 + P.h - 0.53, fh = 0.44;
    const strip = (ax, az, bx, bz, nx, nz) => {
      const len = Math.hypot(bx - ax, bz - az), g = new THREE.PlaneGeometry(len, fh), uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * len / 1.2);
      const m = add(g, friezeMat, (ax + bx) / 2 + nx * 0.035, fy, (az + bz) / 2 + nz * 0.035, Math.atan2(nx, nz)); return m;
    };
    strip(P.x0, P.z0, P.x1, P.z0, 0, 1); strip(P.x0, P.z1, JAZZ.x0, P.z1, 0, -1); strip(P.x0, P.z0, P.x0, P.z1, 1, 0);
    for (const [ax, az, bx] of [[P.x0, P.z0, P.x1], [P.x0, P.z1, JAZZ.x0]]) {
      const inward = az < -230 ? 1 : -1, zz = az + inward * 0.03;
      // (on the lift wall they stop at each lift's surround)
      const cuts = az < -230 ? LIFT.xs.map((x) => [x - LIFT.w / 2 - 0.1, x + LIFT.w / 2 + 0.1]).sort((a, b) => a[0] - b[0]) : [];
      let from = ax;
      for (const [c0, c1] of [...cuts, [bx, bx]]) {
        if (c0 > from) {
          box(c0 - from, 0.05, 0.05, brass, (from + c0) / 2, Y0 + 1.28, zz + inward * 0.02);                // dado rail
          box(c0 - from, 0.16, 0.04, marbleDark, (from + c0) / 2, Y0, zz + inward * 0.015);                 // skirting
        }
        from = c1;
      }
    }
    box(0.05, 0.05, P.z1 - P.z0, brass, P.x0 + 0.05, Y0 + 1.28, pcz); box(0.04, 0.16, P.z1 - P.z0, marbleDark, P.x0 + 0.045, Y0, pcz);
    // moulded panels between the pilasters (shorter over the lifts, none where the door or the bar is)
    const mould = (cx, z, y0, y1, w, inward) => {
      const t = 0.035, zz = z + inward * 0.05;
      box(w, t, t, brass, cx, y0, zz); box(w, t, t, brass, cx, y1 - t, zz);
      box(t, y1 - y0, t, brass, cx - w / 2 + t / 2, y0, zz); box(t, y1 - y0, t, brass, cx + w / 2 - t / 2, y0, zz);
      const inner = 0.12;                                                                                     // an inner fillet, finer
      for (const [a, b, c, d] of [[w - 2 * inner, 0.018, cx, y0 + inner], [w - 2 * inner, 0.018, cx, y1 - inner - 0.018]]) box(a, b, 0.02, brass, c, d, zz);
      for (const sx of [-1, 1]) box(0.018, y1 - y0 - 2 * inner, 0.02, brass, cx + sx * (w / 2 - inner), y0 + inner, zz);
    };
    for (let x = P.x0 + 4; x + 1.6 < P.x1 - 0.3; x += 4) {
      const overLift = [-52, -48, -44].some((lx) => Math.abs(lx - x) < 1.2);
      mould(x, P.z0, overLift ? Y0 + 3.45 : Y0 + 1.7, Y0 + P.h - 0.95, 3.0, 1);
      const nearDoor = x > P.door[0] - 2.5 && x < P.door[1] + 2.5;
      if (!nearDoor && x + 1.6 < JAZZ.x0 - 0.6) mould(x, P.z1, Y0 + 1.7, Y0 + P.h - 0.95, 3.0, -1);
    }
  }
  // Art Deco detail: brass-capped walnut pilasters along the walls, a stepped cornice under the ceiling
  for (let x = P.x0 + 2; x < P.x1 - 1; x += 4) for (const z of [P.z0 + 0.12, P.z1 - 0.12]) { if (z > -213 && ((x > P.door[0] - 1 && x < P.door[1] + 1) || x > JAZZ.x0 - 0.5)) continue; const lal = z < -230 && [-50, -46].some((lx) => Math.abs(lx - x) < 0.5);   // (between the lifts the Lalique panels stand in the pilaster's place; it carries on above them)
    if (lal) box(0.34, P.h - 0.4 - 2.6, 0.14, walnut, x, Y0 + 2.6, z); else box(0.34, P.h - 0.4, 0.14, walnut, x, Y0, z); box(0.4, 0.14, 0.18, brass, x, Y0 + P.h - 0.54, z); }
  for (const [ax, az, bx, bz] of [[P.x0, P.z0, P.x1, P.z0], [P.x0, P.z1, P.x1, P.z1]]) box(Math.abs(bx - ax), 0.22, 0.3, walnut, (ax + bx) / 2, Y0 + P.h - 0.26, az + (az < -230 ? 0.15 : -0.15));
  for (const x of [P.x0, P.x1]) box(0.3, 0.22, P.z1 - P.z0, walnut, x + (x < -50 ? 0.15 : -0.15), Y0 + P.h - 0.26, pcz);
  box(0.06, 0.05, P.z1 - P.z0, brass, P.x0 + 0.33, Y0 + P.h - 0.3, pcz); box(0.06, 0.05, P.z1 - P.z0, brass, P.x1 - 0.33, Y0 + P.h - 0.3, pcz);
  // the front desk and concierge: walnut, marble tops, brass rails, a backlit panel with the name
  contactShadow(group, P.x0 + 2.4, Y0, -228.9, 3.0, 9.0, 0.45); contactShadow(group, P.x0 + 2.2, Y0, -237.5, 2.6, 4.8, 0.45);
  rbox(2.2, 1.1, 8.2, 0.04, walnut, P.x0 + 2.4, Y0, -228.9); box(2.3, 0.06, 8.4, marbleDark, P.x0 + 2.4, Y0 + 1.1, -228.9);
  box(0.05, 0.05, 8.2, brass, P.x0 + 3.53, Y0 + 0.95, -228.9);
  add(new THREE.PlaneGeometry(6, 1.1), new THREE.MeshBasicMaterial({ map: signTex([['费尔蒙和平饭店', 58], ['FAIRMONT PEACE HOTEL · 1929', 24]], { w: 872, h: 160 }), color: new THREE.Color(1.3, 1.3, 1.3) }), P.x0 + 0.06, Y0 + 3.4, -228.9, Math.PI / 2);
  rbox(1.8, 1.1, 4, 0.04, walnut, P.x0 + 2.2, Y0, -237.5); box(1.9, 0.06, 4.2, marbleDark, P.x0 + 2.2, Y0 + 1.1, -237.5);
  // the parcels waiting for guests, on a walnut shelf unit against the wall behind the concierge
  { const sx = P.x0 + 0.24, sz = -236.3;
    for (const dz of [-0.82, 0.82]) box(0.4, 1.9, 0.04, walnut, sx, Y0, sz + dz);                                     // the sides
    for (const y of [0.04, 0.62, 1.12, 1.62, 1.86]) box(0.4, 0.04, 1.68, walnut, sx, Y0 + y, sz);                     // the shelves and top
    box(0.02, 1.9, 1.68, walnut, P.x0 + 0.05, Y0, sz);                                                                // the back
    const card = new THREE.MeshStandardMaterial({ color: 0xa88458, roughness: 0.9 }), bag = new THREE.MeshStandardMaterial({ color: 0x1d1d22, roughness: 0.7 });
    [[0.66, -0.45, 0.36, 0.22, card], [0.66, 0.05, 0.3, 0.3, card], [0.66, 0.5, 0.28, 0.18, bag], [1.16, -0.4, 0.34, 0.26, card], [1.16, 0.3, 0.4, 0.2, card], [0.08, -0.3, 0.32, 0.4, bag], [0.08, 0.35, 0.36, 0.3, card]]
      .forEach(([y, dz, w, h, m]) => box(0.3, h, w, m, sx, Y0 + y, sz + dz)); }
  // the lift lobby: three lifts in the north wall. Each is a pair of engraved brass leaves that part and slide into
  // the wall, in a brass surround, with an Art Deco floor dial over it: a needle sweeping from G to 9 (the floors are
  // numbered the British way, G the ground floor, so "1" is the floor above). The call plates sit between them. The
  // middle lift is the one the attendant calls; its car is behind it: walnut panels, a brass rail, and the button
  // panel with the card reader (you tap your own card and press your floor). The other two stay shut.
  const liftDoor = new THREE.MeshStandardMaterial({ map: liftDoorTexture(), color: 0xffffff, roughness: 0.38, metalness: 1, envMapIntensity: 1.5 });
  const leafGeo = (side) => { const g = new THREE.PlaneGeometry(LIFT.w / 2 + 0.02, LIFT.h), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, side < 0 ? uv.getX(i) * 0.5 : 0.5 + uv.getX(i) * 0.5); return g; };
  const dialTex = canvasTex(256, 256, (x, w) => {
    const c = w / 2, R = 120;
    const g = x.createLinearGradient(0, 0, 0, c); g.addColorStop(0, '#e8c77e'); g.addColorStop(1, '#a8803c');
    x.fillStyle = g; x.beginPath(); x.arc(c, c, R, Math.PI, 0); x.closePath(); x.fill();
    x.strokeStyle = '#6b4c1c'; x.lineWidth = 6; x.beginPath(); x.arc(c, c, R - 4, Math.PI, 0); x.stroke();
    x.lineWidth = 2; x.beginPath(); x.arc(c, c, R - 40, Math.PI, 0); x.stroke();
    x.fillStyle = '#3a2810'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '700 22px "Noto Serif SC", serif';
    LIFT.floors.forEach((f, i) => { const a = Math.PI - (i / (LIFT.floors.length - 1)) * Math.PI; x.fillText(f, c + Math.cos(a) * (R - 22), c - Math.sin(a) * (R - 22));
      x.fillRect(c + Math.cos(a) * (R - 40) - 1.5, c - Math.sin(a) * (R - 40) - 1.5, 3, 3); });
    for (let k = 0; k < 7; k++) { const a = Math.PI * (0.15 + k * 0.117); x.strokeStyle = 'rgba(80,56,20,0.55)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(c, c); x.lineTo(c + Math.cos(a) * (R - 46), c - Math.sin(a) * (R - 46)); x.stroke(); }   // a sunburst
  });
  const dialFace = new THREE.MeshStandardMaterial({ map: dialTex, transparent: true, alphaTest: 0.5, metalness: 0.75, roughness: 0.35, envMapIntensity: 1.3 });
  const needleMat = new THREE.MeshStandardMaterial({ color: 0x1a120a, roughness: 0.5, metalness: 0.4 });
  const lifts = [];   // { x, leaves: [l, r], needle, floor }
  for (const x of LIFT.xs) {
    const leaves = [-1, 1].map((s) => { const m = add(leafGeo(s), liftDoor, x + s * (LIFT.w / 4 + 0.01), Y0 + LIFT.h / 2, P.z0 - 0.03); return m; });
    // the surround: jambs and head in brass, deep enough to cover the leaves' edges, a brass sill
    for (const s of [-1, 1]) box(0.1, LIFT.h + 0.1, 0.16, brass, x + s * (LIFT.w / 2 + 0.05), Y0, P.z0);
    box(LIFT.w + 0.2, 0.1, 0.16, brass, x, Y0 + LIFT.h, P.z0);
    box(LIFT.w, 0.008, 0.2, brass, x, Y0, P.z0 - 0.02);
    box(1.8, 0.12, 0.12, walnut, x, Y0 + 2.62, P.z0 + 0.08);                                  // the walnut lintel
    // the floor dial: the face, a brass bezel, the needle on its boss
    add(new THREE.CircleGeometry(0.28, 32, 0, Math.PI), dialFace, x, Y0 + 2.78, P.z0 + 0.065);
    add(new THREE.TorusGeometry(0.28, 0.012, 6, 32, Math.PI), brass, x, Y0 + 2.78, P.z0 + 0.065);
    const needle = new THREE.Group(); needle.position.set(x, Y0 + 2.78, P.z0 + 0.075); group.add(needle);
    const nd = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.004), needleMat); nd.position.x = 0.1; needle.add(nd);
    const boss = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.01, 16), brass); boss.rotation.x = Math.PI / 2; needle.add(boss);
    const floor = x === LIFT.car ? 5 : 2 + Math.floor(Math.random() * 7);
    lifts.push({ x, leaves, needle, floor, want: floor, t: 10 + Math.random() * 30 });
  }
  // the car behind the middle lift: small (the guests call these lifts tiny and slow), walnut-panelled, warm-lit
  {
    const cx = LIFT.car, w = 1.6, d = 1.4, h = 2.45, zb = P.z0 - 0.05 - d, zc = P.z0 - 0.05 - d / 2;
    const carWood = new THREE.MeshStandardMaterial({ map: wd.map, normalMap: wd.normalMap, normalScale: new THREE.Vector2(0.5, 0.5), roughnessMap: wd.roughnessMap, color: 0xf0dcc8, roughness: 0.5, metalness: 0.05, emissive: 0x2a1508 });
    const carPanel = (geo) => metricUV(geo, 1);
    const put = (geo, mat, px, py, pz, ry = 0, rx = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.rotation.set(rx, ry, 0); m.receiveShadow = true; group.add(m); return m; };
    put(new THREE.PlaneGeometry(w, d), marbleDark, cx, Y0 + 0.004, zc, 0, -Math.PI / 2);                                                       // the floor
    put(carPanel(new THREE.PlaneGeometry(w, h)), carWood, cx, Y0 + h / 2, zb);                                                                 // the back
    for (const s of [-1, 1]) put(carPanel(new THREE.PlaneGeometry(d, h)), carWood, cx + s * w / 2, Y0 + h / 2, zc, -s * Math.PI / 2);         // the sides
    put(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.6 }), cx, Y0 + h, zc, 0, Math.PI / 2);     // the ceiling
    put(new THREE.PlaneGeometry(w - 0.5, d - 0.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.25, 1.02, 0.74) }), cx, Y0 + h - 0.01, zc, 0, Math.PI / 2);   // its light
    // brass mouldings round the panels, a handrail on three sides
    box(w - 0.02, 0.025, 0.02, brass, cx, Y0 + 1.0, zb + 0.012);                                                                             // the dado between the panels
    box(w - 0.1, 0.04, 0.04, brass, cx, Y0 + 0.88, zb + 0.07);
    for (const s of [-1, 1]) box(0.04, 0.04, d - 0.2, brass, cx + s * (w / 2 - 0.07), Y0 + 0.88, zc);
    for (const s of [-1, 1]) box(0.02, h - 0.3, 0.02, brass, cx + s * 0.4, Y0 + 0.15, zb + 0.012);
    // the button panel on the east wall by the door: G to 9 and the card reader over them (its light green when read)
    const bp = new THREE.Group(); bp.position.set(cx + w / 2 - 0.012, Y0 + 1.25, P.z0 - 0.32); bp.rotation.y = -Math.PI / 2; group.add(bp);
    bp.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.62, 0.012), brass));
    const btnFace = new THREE.MeshStandardMaterial({ color: 0xf2e6c8, roughness: 0.4, emissive: 0x3a2a12 });
    LIFT.floors.forEach((f, i) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.01, 12), btnFace); b.rotation.x = Math.PI / 2; b.position.set(i % 2 ? 0.04 : -0.04, -0.24 + Math.floor(i / 2) * 0.075, 0.01); bp.add(b); });
    const reader = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.014), new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.3 })); reader.position.set(0, 0.2, 0.012); bp.add(reader);
    const led = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.006), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 0.9, 0.35) })); led.position.set(0, 0.17, 0.02); bp.add(led);
  }
  // the call buttons: a brass plate with an up and a down between the doors and the glass panels; a button glows
  // amber while its call stands
  const btnOff = new THREE.MeshStandardMaterial({ color: 0xe9d6a8, roughness: 0.3, metalness: 0.6, emissive: 0x1e1406 });
  const btnOn = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.25, 0.55) });
  const callUp = {};
  for (const x of LIFT.plates) { box(0.12, 0.28, 0.02, brass, x, Y0 + 1.0, P.z0 + 0.03); for (const dy of [0.07, -0.07]) { const b2 = add(new THREE.CylinderGeometry(0.02, 0.02, 0.012, 16), btnOff, x, Y0 + 1.14 + dy, P.z0 + 0.045); b2.rotation.x = Math.PI / 2; if (dy > 0) callUp[x] = b2; } }
  // the Jasmine Lounge: round tables, chairs, a grand piano by the windows
  for (const [x, z] of [[-38.2, -230], [-38.4, -234.5], [-38.2, -238], [-41.5, -232], [-41.6, -236.4]]) {
    add(new THREE.CylinderGeometry(0.45, 0.45, 0.04, 24), marbleDark, x, Y0 + 0.74, z); add(new THREE.CylinderGeometry(0.05, 0.12, 0.72, 10), brass, x, Y0 + 0.36, z);
    for (const a of [0, Math.PI]) armchair(x + Math.sin(a) * 0.85, z + Math.cos(a) * 0.85, a + Math.PI);
  }
  // the grand piano (a parlour grand, 1.9 m): the case with its straight bass side and curved treble side, open,
  // showing the soundboard and the gilt iron frame and strings; the lid hinged along the straight side and propped
  // on its stick; the keyboard out in front with its cheeks and fallboard, the music desk, three tapered legs on brass
  // castors, the pedal lyre with three brass pedals, and a bench. Keyboard to the north, the pianist's back to the wall.
  {
    const PX = -40.4, PZ = -242.6, lacquer = new THREE.MeshPhysicalMaterial({ color: 0x050505, roughness: 0.14, metalness: 0.05, clearcoat: 0.7, clearcoatRoughness: 0.12, envMapIntensity: 0.75 });
    const pg = new THREE.Group(); pg.position.set(PX, Y0, PZ); group.add(pg);
    // the outline, in plan (x across, y = distance back from the keyboard)
    const outline = (k = 1) => { const sh = new THREE.Shape(), c = (x, y) => [x * k, 0.95 + (y - 0.95) * k]; const m = (x, y) => sh.moveTo(...c(x, y)), l = (x, y) => sh.lineTo(...c(x, y)), bz = (a1, b1, a2, b2, a3, b3) => sh.bezierCurveTo(...c(a1, b1), ...c(a2, b2), ...c(a3, b3));
      m(-0.74, 0); l(0.74, 0); l(0.74, 0.5); bz(0.74, 0.95, 0.12, 1.0, 0.1, 1.45); bz(0.08, 1.8, -0.1, 1.92, -0.35, 1.92); bz(-0.6, 1.92, -0.74, 1.8, -0.74, 1.55); l(-0.74, 0); return sh; };
    const toPlan = (g) => { g.rotateX(Math.PI / 2); return g; };   // shape y -> z (back), extrusion down
    const RB = 0.66, RT = 0.98;                                                                        // the rim's bottom and top
    { const sh = outline(1); sh.holes.push(outline(0.95)); const rim = new THREE.Mesh(toPlan(new THREE.ExtrudeGeometry(sh, { depth: RT - RB, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2, curveSegments: 24 })), lacquer); rim.position.y = RT; rim.castShadow = true; pg.add(rim); }
    const bottom = new THREE.Mesh(toPlan(new THREE.ShapeGeometry(outline(1), 24)), lacquer); bottom.position.y = RB; pg.add(bottom);   // (faces down)
    const board = new THREE.Mesh(toPlan(new THREE.ShapeGeometry(outline(0.95), 24)), new THREE.MeshStandardMaterial({ color: 0xc89a5a, roughness: 0.6, side: THREE.DoubleSide })); board.position.y = RB + 0.12; pg.add(board);   // the spruce soundboard
    { // the iron frame (gilt) and the strings over it
      const pt = canvasTex(256, 512, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = '#b8903e'; x.beginPath(); x.moveTo(20, 20); x.lineTo(w - 20, 20); x.lineTo(w - 30, 200); x.quadraticCurveTo(w * 0.45, 330, w * 0.42, h - 30); x.lineTo(40, h - 30); x.closePath(); x.fill();
        x.fillStyle = 'rgba(0,0,0,0.35)'; for (const [cx, cy, r] of [[90, 140, 26], [170, 150, 22], [80, 300, 30], [150, 260, 18]]) { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); }
        x.strokeStyle = 'rgba(235,230,220,0.85)'; x.lineWidth = 1; for (let i = 0; i < 70; i++) { const sx = 30 + i * 2.8; x.beginPath(); x.moveTo(sx, 24); x.lineTo(sx * 0.55 + 30, h - 34 - (i * 3.2)); x.stroke(); } });
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.65), new THREE.MeshStandardMaterial({ map: pt, transparent: true, alphaTest: 0.1, metalness: 0.7, roughness: 0.35 }));
      plate.rotation.x = -Math.PI / 2; plate.position.set(-0.05, RB + 0.16, 0.9); pg.add(plate);
    }
    // the lid: the same outline, hinged on the straight (bass) side, propped open about 38 degrees
    const hinge = new THREE.Group(); hinge.position.set(-0.745, RT + 0.012, 0); pg.add(hinge);
    const lidG = toPlan(new THREE.ExtrudeGeometry(outline(1.005), { depth: 0.022, bevelEnabled: false, curveSegments: 24 })); lidG.translate(0.745, 0, 0);
    const lid = new THREE.Mesh(lidG, lacquer); lid.position.y = 0.022; lid.castShadow = true; hinge.add(lid); hinge.rotation.z = 0.66;
    { const tip = new THREE.Vector3(0.5, RT, 0.95), top = new THREE.Vector3(0.5, 0, 0.95); top.x = -0.745 + Math.cos(0.66) * (0.5 + 0.745); top.y = RT + 0.012 + Math.sin(0.66) * (0.5 + 0.745);
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, tip.distanceTo(top), 8), lacquer); stick.position.copy(tip).add(top).multiplyScalar(0.5); stick.lookAt(top); stick.rotateX(Math.PI / 2); pg.add(stick); }
    // the keyboard: keybed, keys (white with raised black), cheeks, the fallboard, the music desk
    const keyTex = canvasTex(1024, 64, (x, w, h) => { x.fillStyle = '#f4f1e8'; x.fillRect(0, 0, w, h); x.fillStyle = '#9a968c'; for (let i = 0; i <= 52; i++) x.fillRect(Math.round(i * w / 52), 0, 1, h); });
    const keybed = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.34), lacquer); keybed.position.set(0, 0.66, -0.15); pg.add(keybed);
    const keys = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.024, 0.15), [lacquer, lacquer, new THREE.MeshStandardMaterial({ map: keyTex, roughness: 0.35 }), lacquer, lacquer, new THREE.MeshStandardMaterial({ color: 0xf4f1e8, roughness: 0.35 })]);
    keys.position.set(0, 0.722, -0.2); pg.add(keys);
    const blackKeys = []; for (let i = 0; i < 52 - 1; i++) { const n = i % 7; if (n === 2 || n === 6) continue; const g = new THREE.BoxGeometry(0.0125, 0.02, 0.095); g.translate(-0.62 + (i + 1) * (1.24 / 52), 0.744, -0.17); blackKeys.push(g); }
    const bk = new THREE.Mesh(mergeGeometries(blackKeys), new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.25 })); pg.add(bk);
    for (const sx of [-1, 1]) { const ch = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.32), lacquer); ch.position.set(sx * 0.68, 0.76, -0.15); pg.add(ch); }
    const fall = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.07, 0.06), lacquer); fall.position.set(0, 0.77, -0.085); pg.add(fall);
    const desk = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.28, 0.015), lacquer); desk.position.set(0, RT + 0.15, 0.05); desk.rotation.x = 0.28; pg.add(desk);
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.015, 0.04), lacquer); ledge.position.set(0, RT + 0.02, 0.01); pg.add(ledge);
    // legs on brass castors; the pedal lyre
    for (const [lx, lz] of [[-0.62, 0.1], [0.62, 0.1], [-0.42, 1.62]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.04, RB - 0.04, 14), lacquer); leg.position.set(lx, 0.04 + (RB - 0.04) / 2, lz); leg.castShadow = true; pg.add(leg);
      const cs = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), brass); cs.position.set(lx, 0.035, lz); pg.add(cs);
    }
    for (const sx of [-0.06, 0.06]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.025, RB - 0.1, 0.05), lacquer); r.position.set(sx, 0.08 + (RB - 0.1) / 2, 0.22); pg.add(r); }
    const lyreBox = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 0.1), lacquer); lyreBox.position.set(0, 0.07, 0.2); pg.add(lyreBox);
    for (const px of [-0.07, 0, 0.07]) { const pd = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.012, 0.11), brass); pd.position.set(px, 0.09, 0.12); pd.rotation.x = 0.12; pg.add(pd); }
    // the bench, at the keyboard
    const bench = new THREE.Group(); bench.position.set(0, 0, -0.72); pg.add(bench);
    { const seat = new THREE.Mesh(new RoundedBoxGeometry(0.78, 0.07, 0.36, 3, 0.02), lacquer); seat.position.y = 0.5; bench.add(seat);
      const pad = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.04, 0.3, 3, 0.015), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 })); pad.position.y = 0.55; bench.add(pad);
      for (const sx of [-0.34, 0.34]) for (const sz of [-0.14, 0.14]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.47, 10), lacquer); l.position.set(sx, 0.235, sz); bench.add(l); } }
    pg.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
    contactShadow(group, PX, Y0, PZ + 0.9, 1.9, 2.6, 0.4);
  }
  // (the Jazz Bar, in the hall's south-east corner, is world/jazzBar.js)
  // the staff door
  box(0.1, 2.3, 1.3, dark, P.x0 + 0.06, Y0, P.z1 - 21.1);
  add(new THREE.PlaneGeometry(1.26, 2.28), new THREE.MeshStandardMaterial({ map: staffDoorTexture([70, 64, 56]), roughness: 0.6, metalness: 0.1 }), P.x0 + 0.113, Y0 + 1.14, P.z1 - 21.1, Math.PI / 2);
  for (const dz of [-0.7, 0.7]) box(0.06, 2.4, 0.08, walnut, P.x0 + 0.1, Y0, P.z1 - 21.1 + dz);   // the architrave
  box(0.06, 0.08, 1.48, walnut, P.x0 + 0.1, Y0 + 2.36, P.z1 - 21.1);
  add(new THREE.PlaneGeometry(0.9, 0.22), new THREE.MeshBasicMaterial({ map: signTex([['员工通道  STAFF ONLY', 40]], { bg: '#2a2a2a', fg: '#ddd', w: 512, h: 120 }) }), P.x0 + 0.13, Y0 + 2.55, P.z1 - 21.1, Math.PI / 2);
  // outside on Nanjing Road: the bronze canopy, the revolving door, the name in bronze letters
  const doorX = (P.door[0] + P.door[1]) / 2;
  box(6.4, 0.25, 2.6, brass, doorX, Y0 + 3.6, -211.0);
  for (const x of [doorX - 3, doorX + 3]) add(new THREE.CylinderGeometry(0.06, 0.06, 3.6, 8), brass, x, Y0 + 1.8, -209.9);
  const glowTex = canvasTex(256, 256, (x, w, h) => { const g = x.createRadialGradient(w / 2, h * 0.7, 10, w / 2, h * 0.6, w * 0.7); g.addColorStop(0, '#c9935a'); g.addColorStop(0.5, '#6b4524'); g.addColorStop(1, '#1d130b'); x.fillStyle = g; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(255,220,160,0.5)'; for (let i = 0; i < 3; i++) x.fillRect(w * (0.2 + i * 0.25), h * 0.08, w * 0.12, h * 0.05); });
  void glowTex;
  // the doorway through the façade (world/bund.js cuts it): granite reveals, a soffit, a step
  for (const x of [P.door[0], P.door[1]]) box(0.14, 3.2, 0.62, granite, x + (x < doorX ? -0.07 : 0.07), Y0 - 0.01, -212.3);
  box(4.28, 0.14, 0.62, granite, doorX, Y0 + 3.2, -212.3);
  box(4.0, 0.02, 1.0, marbleDark, doorX, Y0 - 0.005, -212.1);
  // the revolving door: a glass drum in bronze, four glass wings with bronze edges and push bars, a lit crown
  const drum = new THREE.Group(); drum.position.set(doorX, Y0, -212.2); group.add(drum);
  const R = 1.35, H = 2.75;
  for (const c of [Math.PI / 2, -Math.PI / 2]) {
    const arc = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 28, 1, true, c - 0.95, 1.9), glass); arc.position.y = H / 2; arc.renderOrder = 3; drum.add(arc);
    for (const a of [c - 0.95, c + 0.95]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, H, 8), brass); post.position.set(Math.sin(a) * R, H / 2, Math.cos(a) * R); drum.add(post); }
    for (const y of [0.06, 0.95, H - 0.04]) { const rail = new THREE.Mesh(new THREE.TorusGeometry(R, 0.022, 6, 28, 1.9), brass); rail.rotation.set(Math.PI / 2, 0, -(c - 0.95) + Math.PI / 2 - 1.9); rail.position.y = y; drum.add(rail); }
  }
  const mat = new THREE.Mesh(new THREE.CircleGeometry(R - 0.02, 32).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1b1714, roughness: 0.95 })); mat.position.y = 0.012; drum.add(mat);
  const vanes = new THREE.Group(); drum.add(vanes);
  for (let i = 0; i < 4; i++) {
    const w = new THREE.Group(); w.rotation.y = -i * Math.PI / 2; vanes.add(w);
    const v = new THREE.Mesh(new THREE.PlaneGeometry(R - 0.08, H - 0.12), glass); v.position.set((R - 0.08) / 2 + 0.04, H / 2, 0); w.add(v);
    for (const [bx, by, bw, bh] of [[R - 0.06, H / 2, 0.05, H - 0.1], [(R) / 2, 0.08, R - 0.04, 0.07], [(R) / 2, H - 0.08, R - 0.04, 0.06]]) { const f = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.05), brass); f.position.set(bx, by, 0); w.add(f); }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.7, 8), brass); bar.rotation.z = Math.PI / 2; bar.position.set(R * 0.62, 1.05, 0.07); w.add(bar);
    const bar2 = bar.clone(); bar2.position.z = -0.07; w.add(bar2);
  }
  const post0 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, H, 12), brass); post0.position.y = H / 2; vanes.add(post0);
  const drumTop = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.06, R + 0.06, 0.3, 32), brass); drumTop.position.y = H + 0.15; drum.add(drumTop);
  const crown = new THREE.Mesh(new THREE.CircleGeometry(R - 0.1, 32).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.05, 0.88, 0.64) })); crown.position.y = H - 0.005; drum.add(crown);
  lights.push({ x: doorX, y: Y0 + H - 0.2, z: -212.2, intensity: 5, distance: 6, color: new THREE.Color(1.0, 0.8, 0.55) });
  add(new THREE.PlaneGeometry(5.6, 0.7), new THREE.MeshBasicMaterial({ map: signTex([['和 平 饭 店', 70]], { bg: '#00000000', fg: '#d9b46a', w: 800, h: 100 }), transparent: true }), doorX, Y0 + 4.4, -211.86);
  // light: the hall's own lamps join the lighting pool (only the nearest get real lights)
  for (const [x, z] of [[-48, -229], [-56, -218], [-40, -218], [-56, -240], [-40, -238], [-48, -240.5], [-57, -229]]) lights.push({ x, y: Y0 + P.h - 0.4, z, intensity: 14, distance: 11, color: new THREE.Color(1.0, 0.82, 0.58) });

  // ================= THE AIA BUILDING =================
  // after the building's own interiors (1924; refitted for AIA over eighteen months, opened May 1998): white marble
  // floors, walls of black marble inlaid with gold mosaic, plaster ceilings in relief, the entrance hall's dome in
  // gold mosaic (Xinhua 2025: "大理石地坪、墙面与金色马赛克穹庐顶"), the 百寿图 relief; outside, Doric columns and a
  // marble lintel at the door. Sources: docs/living-city-buildings.md (No.17)
  const A = AIA, acx = (A.x0 + A.x1) / 2, acz = (A.z0 + A.z1) / 2, DOME = { x: -38.1, z: (A.door[0] + A.door[1]) / 2, r: 2.9 };
  const whiteMarble = new THREE.MeshStandardMaterial({ map: marble.map, normalMap: marble.normalMap, roughnessMap: marble.roughnessMap, color: 0xf6f3ec, roughness: 0.28, envMapIntensity: 1.3 });
  const blackMarble = new THREE.MeshStandardMaterial({ map: marble.map, normalMap: marble.normalMap, color: 0x1b1b1e, roughness: 0.18, envMapIntensity: 1.5 });
  add(new THREE.PlaneGeometry(A.x1 - A.x0, A.z1 - A.z0), whiteMarble, acx, Y0 + 0.004, acz, 0, -Math.PI / 2);
  { // a black marble border round the room, and a roundel under the dome: black ring, brass, a star
    for (const [w, d, x, z] of [[A.x1 - A.x0 - 0.6, 0.3, acx, A.z0 + 0.45], [A.x1 - A.x0 - 0.6, 0.3, acx, A.z1 - 0.45], [0.3, A.z1 - A.z0 - 0.6, A.x0 + 0.45, acz], [0.3, A.z1 - A.z0 - 0.6, A.x1 - 0.45, acz]]) add(new THREE.PlaneGeometry(w, d), blackMarble, x, Y0 + 0.007, z, 0, -Math.PI / 2);
    const rt = canvasTex(512, 512, (x, w) => { const c = w / 2; x.clearRect(0, 0, w, w); x.fillStyle = '#18181b'; x.beginPath(); x.arc(c, c, c * 0.98, 0, Math.PI * 2); x.fill(); x.fillStyle = '#f2eee6'; x.beginPath(); x.arc(c, c, c * 0.84, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#18181b'; x.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? c * 0.3 : c * 0.78; x.lineTo(c + Math.cos(a) * rr, c + Math.sin(a) * rr); } x.closePath(); x.fill();
      x.strokeStyle = '#c8a050'; x.lineWidth = 5; for (const rr of [0.98, 0.84]) { x.beginPath(); x.arc(c, c, c * rr, 0, Math.PI * 2); x.stroke(); } });
    add(new THREE.CircleGeometry(1.6, 48), new THREE.MeshStandardMaterial({ map: rt, transparent: true, roughness: 0.25, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), DOME.x, Y0 + 0.009, DOME.z, 0, -Math.PI / 2);
  }
  // the walls: black marble and gold mosaic (UVs: 2.2 m a bay along, the room's height up)
  const NERO = nero(), neroMat = new THREE.MeshStandardMaterial({ map: NERO.map, metalnessMap: NERO.metal, metalness: 1, roughness: 0.22, color: 0xffffff, envMapIntensity: 1.5, emissive: 0x0a0806 });
  const aiaWall = (ax, az, bx, bz, cx, cz, gaps = []) => {
    const len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len; let t0 = 0;
    for (const [g0, g1, gh] of [...gaps, [len, len, 0]]) {
      const piece = (ta, tb, y0, y1) => { if (tb - ta < 0.01) return; const m = wall(ax + ux * ta, az + uz * ta, ax + ux * tb, az + uz * tb, y0, y1, neroMat, cx, cz); const uv = m.geometry.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, (ta + uv.getX(i) * (tb - ta)) / 2.2, (y0 - Y0 + uv.getY(i) * (y1 - y0)) / A.h); };
      piece(t0, g0, Y0, Y0 + A.h); if (g1 > g0 && g1 < len) piece(g0, g1, Y0 + gh, Y0 + A.h); t0 = g1;
    }
  };
  aiaWall(A.x0, A.z0, A.x1, A.z0, acx, acz); aiaWall(A.x1, A.z1, A.x0, A.z1, acx, acz); aiaWall(A.x0, A.z1, A.x0, A.z0, acx, acz);
  aiaWall(A.x1, A.z0, A.x1, A.z1, acx, acz, [[A.door[0] - A.z0, A.door[1] - A.z0, 4.6]]);
  // the ceiling: plaster in relief, with the dome over the entrance hall cut into it
  {
    const sh = new THREE.Shape(); sh.moveTo(A.x0, A.z0); sh.lineTo(A.x1, A.z0); sh.lineTo(A.x1, A.z1); sh.lineTo(A.x0, A.z1); sh.closePath();
    const hole = new THREE.Path(); hole.absarc(DOME.x, DOME.z, DOME.r, 0, Math.PI * 2, true); sh.holes.push(hole);
    const cg = new THREE.ShapeGeometry(sh, 32), uv = cg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2.2, uv.getY(i) / 2.2);
    add(cg, new THREE.MeshStandardMaterial({ map: plasterRelief(), roughness: 0.85, color: 0xf4eee2, emissive: 0x1c1810, side: THREE.DoubleSide }), 0, Y0 + A.h, 0, 0, Math.PI / 2);
    // a moulded cornice round the room, gilt-edged
    const corn = new THREE.MeshStandardMaterial({ color: 0xece4d2, roughness: 0.7 });
    for (const [w, d, x, z] of [[A.x1 - A.x0, 0.32, acx, A.z0 + 0.16], [A.x1 - A.x0, 0.32, acx, A.z1 - 0.16], [0.32, A.z1 - A.z0, A.x0 + 0.16, acz], [0.32, A.z1 - A.z0, A.x1 - 0.16, acz]]) { box(w, 0.3, d, corn, x, Y0 + A.h - 0.3, z); box(w > d ? w : 0.04, 0.03, w > d ? 0.04 : d, brass, x + (w > d ? 0 : (x < acx ? 0.16 : -0.16)), Y0 + A.h - 0.33, z + (w > d ? (z < acz ? 0.16 : -0.16) : 0)); }
    // the dome: gold mosaic on a shallow cap, a moulded ring at its foot, lit from a cove round the ring
    const dg = new THREE.SphereGeometry(DOME.r, 48, 12, 0, Math.PI * 2, 0, Math.PI / 2), pos = dg.attributes.position, duv = dg.attributes.uv;
    for (let i = 0; i < pos.count; i++) duv.setXY(i, 0.5 + pos.getX(i) / (2 * DOME.r), 0.5 + pos.getZ(i) / (2 * DOME.r));
    const gm = goldMosaic(), dome = add(dg, new THREE.MeshStandardMaterial({ map: gm, metalness: 0.85, roughness: 0.32, color: 0xffffff, emissive: 0x3a2a10, emissiveMap: gm, side: THREE.BackSide, envMapIntensity: 1.6 }), DOME.x, Y0 + A.h, DOME.z);
    dome.scale.y = 0.5;
    const ring = add(new THREE.TorusGeometry(DOME.r, 0.09, 8, 64), corn, DOME.x, Y0 + A.h - 0.04, DOME.z, 0, Math.PI / 2); ring.castShadow = false;
    add(new THREE.TorusGeometry(DOME.r - 0.1, 0.025, 6, 64), brass, DOME.x, Y0 + A.h - 0.1, DOME.z, 0, Math.PI / 2);
    // a bronze lantern from the crown
    const lan = new THREE.Group(); lan.position.set(DOME.x, Y0 + A.h - 0.9, DOME.z); group.add(lan);
    const bronze2 = new THREE.MeshStandardMaterial({ color: 0x5a3e22, roughness: 0.4, metalness: 0.9 });
    const glowA = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.25, 0.9) });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.26, 0.6, 8, 1), glowA); lan.add(body);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, post = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.64, 0.03), bronze2); post.position.set(Math.cos(a) * 0.31, 0, Math.sin(a) * 0.31); post.rotation.z = Math.cos(a) * 0.13; post.rotation.x = -Math.sin(a) * 0.13; lan.add(post); }
    for (const [y, r] of [[0.32, 0.38], [-0.32, 0.28]]) { const c2 = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.05, 8), bronze2); c2.position.y = y; lan.add(c2); }
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.9 + DOME.r * 0.5, 6), bronze2); rod.position.y = 0.32 + (0.9 + DOME.r * 0.5) / 2; lan.add(rod);
    lights.push({ x: DOME.x, y: Y0 + A.h - 1.0, z: DOME.z, intensity: 12, distance: 9, color: new THREE.Color(1.0, 0.85, 0.62) });
  }
  // the 百寿图, on the north wall where you see it as you turn in from the door: a hundred forms of 寿, gilt on bronze,
  // in a brass frame (Xinhua: "一幅百寿图浮雕，在大堂格外醒目")
  {
    const LR = longevityRelief(), W = 3.3, cx = -38.05, y0 = Y0 + 2.05;
    add(new THREE.PlaneGeometry(W, W), new THREE.MeshStandardMaterial({ map: LR.map, normalMap: LR.normalMap, normalScale: new THREE.Vector2(1.2, 1.2), metalness: 0.75, roughness: 0.38, envMapIntensity: 1.5, emissive: 0x2a1c0c, emissiveMap: LR.map }), cx, y0 + W / 2, A.z0 + 0.06, 0);
    for (const [w, hh, x, y] of [[W + 0.2, 0.1, cx, y0 - 0.05], [W + 0.2, 0.1, cx, y0 + W - 0.05], [0.1, W + 0.2, cx - W / 2 - 0.05, y0 - 0.1], [0.1, W + 0.2, cx + W / 2 + 0.05, y0 - 0.1]]) box(w, hh, 0.08, brass, x, y, A.z0 + 0.05);
    lights.push({ x: cx, y: Y0 + 5.6, z: A.z0 + 1.4, intensity: 6, distance: 6, color: new THREE.Color(1.0, 0.86, 0.62) });   // a wash on it from above
  }
  // the hundred years, on the wall over reception: gilt letters on black marble
  add(new THREE.PlaneGeometry(4.2, 1.84), new THREE.MeshStandardMaterial({ map: signTex([['源于上海 · 1919', 44], ['1919  史带在上海创业，由此而始', 22], ['1928  友邦租用字林大楼底层大厅', 22], ['1992  改革开放后首家获准设立的外资保险公司在上海开业', 22], ['1996  整楼长期租赁外滩17号，定名友邦大厦；1998年5月启用', 22], ['2010  友邦保险在香港联交所上市', 22], ['2020  友邦人寿成为内地首家外资独资人身保险公司', 22], ['2025  续签友邦大厦整楼租约', 22]], { bg: '#101012', fg: '#d8b46a', w: 1024, h: 448 }), roughness: 0.3, metalness: 0.3, emissive: 0x161210 }), -38.5, Y0 + 3.3, A.z1 - 0.05, Math.PI);
  // the doorway through the façade (world/bund.js cuts it): granite reveals and soffit; the bronze-and-glass
  // double doors stand open into the lobby; a bronze fanlight; a lantern either side outside
  { const zc = (A.door[0] + A.door[1]) / 2, xd = (A.x1 + L.facadeX) / 2, dep = L.facadeX - A.x1 + 0.02;
    for (const z of A.door) box(dep, 4.75, 0.14, granite, xd, Y0 - 0.01, z + (z < zc ? -0.07 : 0.07));
    box(dep, 0.16, 3.6, granite, xd, Y0 + 4.75, zc); box(dep + 0.5, 0.03, 3.4, marbleDark, xd + 0.25, Y0 - 0.01, zc);
    const bronze = new THREE.MeshStandardMaterial({ color: 0x6b4a26, roughness: 0.35, metalness: 0.95, envMapIntensity: 1.3 });
    box(0.08, 0.12, 3.4, bronze, A.x1 + 0.02, Y0 + 4.18, zc);                                            // the transom bar
    box(0.02, 0.5, 3.36, glassAia, A.x1 + 0.02, Y0 + 4.24, zc);                                             // the fanlight: glass in a bronze grille
    for (let k = -3; k <= 3; k++) box(0.03, 0.5, 0.025, bronze, A.x1 + 0.03, Y0 + 4.24, zc + k * 0.45);
    box(0.03, 0.025, 3.36, bronze, A.x1 + 0.03, Y0 + 4.5, zc);
    for (const s of [-1, 1]) {
      // a leaf (1.7 m wide), hinged at the door's edge, folded right back against the wall inside (held open)
      const z = zc + s * 1.66, leaf = new THREE.Group(); leaf.position.set(A.x1 - 0.06, Y0, z); leaf.rotation.y = s * Math.PI / 2; group.add(leaf);
      const W = 1.68, Hh = 4.15, fr = (w, h, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.07), bronze); m.position.set(x, y, 0); leaf.add(m); };
      fr(W, 0.16, -W / 2, 0.08); fr(W, 0.12, -W / 2, Hh - 0.06); fr(0.12, Hh, -0.06, Hh / 2); fr(0.12, Hh, -W + 0.06, Hh / 2); fr(W, 0.08, -W / 2, 1.05); fr(W, 0.06, -W / 2, 2.7);
      fr(0.05, Hh - 0.3, -W / 2, Hh / 2);
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.2, Hh - 0.3), glassAia); pane.position.set(-W / 2, Hh / 2, 0); pane.renderOrder = 3; leaf.add(pane);
      const pull = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 8), brass); pull.position.set(-W + 0.22, 1.15, -s * 0.06); leaf.add(pull);   // (on the room side)
      // the lantern on the jamb outside
      const lz = zc + s * 3.25;
      box(0.06, 0.06, 0.06, bronze, L.facadeX + 0.6, Y0 + 3.4, lz); box(0.36, 0.55, 0.36, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.2, 0.75) }), L.facadeX + 0.75, Y0 + 2.75, lz);
      box(0.42, 0.06, 0.42, bronze, L.facadeX + 0.75, Y0 + 3.3, lz); box(0.42, 0.05, 0.42, bronze, L.facadeX + 0.75, Y0 + 2.72, lz);
      lights.push({ x: L.facadeX + 1.0, y: Y0 + 2.9, z: lz, intensity: 4, distance: 6, color: new THREE.Color(1.0, 0.76, 0.48) });
    }
    lights.push({ x: A.x1 - 1.5, y: Y0 + 4.2, z: zc, intensity: 10, distance: 10, color: new THREE.Color(1.0, 0.86, 0.66) });   // the lobby's light, falling out of the door
    // the door's frame on the Bund: a pair of Doric columns rising through the two-storey granite base either side
    // of the door, and a marble lintel over it (a 2009 visitor: "大门口有多立克柱式和大理石门额"; the columns
    // "贯穿一、两层")
    const colStone = new THREE.MeshStandardMaterial({ map: granite.map, color: 0xc9c2b4, roughness: 0.6 }), whiteM = new THREE.MeshStandardMaterial({ map: marble.map, normalMap: marble.normalMap, color: 0xf2efe8, roughness: 0.32, envMapIntensity: 1.2 });
    const cxo = L.facadeX + 0.45, H8 = 7.7;
    for (const s of [-1, 1]) {
      const z = zc + s * (1.7 + 0.6);
      box(0.84, 0.5, 0.84, colStone, cxo, Y0, z);                                                                     // plinth
      add(new THREE.CylinderGeometry(0.31, 0.36, H8 - 1.05, 24), colStone, cxo, Y0 + 0.5 + (H8 - 1.05) / 2, z);      // shaft
      add(new THREE.CylinderGeometry(0.44, 0.32, 0.25, 24), colStone, cxo, Y0 + H8 - 0.55 + 0.125, z);               // echinus
      box(0.92, 0.2, 0.92, colStone, cxo, Y0 + H8 - 0.3, z);                                                          // abacus
      contactShadow(group, cxo, Y0, z, 1.4, 1.4, 0.4);
    }
    box(0.7, 0.62, 3.9, whiteM, L.facadeX + 0.3, Y0 + 4.78, zc);                                                       // the marble lintel
    box(0.74, 0.06, 3.94, whiteM, L.facadeX + 0.3, Y0 + 5.4, zc);
  }
  // reception: a long granite desk on the south side; a tenant directory; a visitor QR stand
  contactShadow(group, -38.5, Y0, -140.6, 5.0, 2.2, 0.45);
  rbox(4.2, 1.1, 1.0, 0.05, blackMarble, -38.5, Y0, -140.8);                                             // reception, south side of the public lobby: black marble
  box(4.3, 0.05, 1.1, whiteMarble, -38.5, Y0 + 1.1, -140.8); box(4.22, 0.04, 0.02, brass, -38.5, Y0 + 0.9, -141.31);
  for (const x of [-39.6, -37.4]) { box(0.36, 0.26, 0.02, dark, x, Y0 + 1.15, -140.55); box(0.06, 0.1, 0.06, dark, x, Y0 + 1.1, -140.5); }   // two monitors on the desk, their backs to the room
  add(new THREE.PlaneGeometry(1.1, 0.68), new THREE.MeshBasicMaterial({ map: signTex([['友邦大厦 · 楼层指引', 34], ['8F  天台花园 Roof garden', 24], ['4–7F  友邦人寿 办公 Offices', 24], ['2–3F  会议中心 Meeting rooms', 24], ['1F  大堂 · 访客接待 Lobby', 24]], { bg: '#121417', fg: '#e8e2d6', w: 768, h: 480 }) }), -35.3, Y0 + 1.75, A.z0 + 0.06, 0);   // (a plaque by the 百寿图; AIA takes the whole building, its roof garden on top)
  box(0.4, 1.2, 0.3, dark, -35.6, Y0, -140.3);
  add(new THREE.PlaneGeometry(0.34, 0.5), new THREE.MeshBasicMaterial({ map: signTex([['访客预约', 40], ['扫码登记', 30], ['Visitor sign-in', 26]], { bg: '#f4f4f4', fg: '#222', w: 300, h: 420 }) }), -35.6, Y0 + 1.3, -140.46, Math.PI);
  // the speed gates, as in a modern head-office lobby: a brushed-steel cabinet between each pair of lanes, D-ended,
  // under a black glass lid with a card pad at the entry end; a pair of tall curved glass wings to each lane that swing
  // aside to let you through; a face-recognition screen on a short post at the entry; red-cross / green-arrow lamps on
  // the cabinet ends; a light line along each lane; glass balustrades from the outer cabinets to the walls
  const flaps = []; let GATE_M = null; const gateMats = () => GATE_M;
  {
    const GL = 1.5, GH = 0.98, GW = 0.2, gx = A.gateX, TOP = GH + 0.025;   // TOP: the lid's top; the wings and the balustrades keep to it
    const steel = new THREE.MeshStandardMaterial({ color: 0xd6d9dd, metalness: 0.9, roughness: 0.42, roughnessMap: br.roughnessMap, normalMap: br.normalMap, normalScale: new THREE.Vector2(0.25, 0.25), envMapIntensity: 1.3 });
    const lid = new THREE.MeshStandardMaterial({ color: 0x08090b, metalness: 0.2, roughness: 0.06, envMapIntensity: 1.6 });
    const wingGlass = sidedGlass({ name: 'aia-wing-glass', box: AIA_BOX, proj: { min: [AIA.x0, Y0, AIA.z0], max: [AIA.x1, Y0 + AIA.h, AIA.z1] }, room: { floor: [0.42, 0.4, 0.36], ceil: [0.52, 0.47, 0.38] }, f0: 0.09, through: 0.88, tint: [0.9, 0.98, 0.97], between: true });   // (toughened; the hall on both sides)
    aiaPanes.push(wingGlass);
    const tex2 = (w, h, f) => canvasTex(w, h, (x) => f(x, w, h));
    const arrowTex = tex2(64, 64, (x, w) => { x.fillStyle = '#050805'; x.fillRect(0, 0, w, w); x.fillStyle = '#3dff7a'; x.beginPath(); x.moveTo(14, 26); x.lineTo(34, 26); x.lineTo(34, 14); x.lineTo(54, 32); x.lineTo(34, 50); x.lineTo(34, 38); x.lineTo(14, 38); x.closePath(); x.fill(); });
    const crossTex = tex2(64, 64, (x, w) => { x.fillStyle = '#080505'; x.fillRect(0, 0, w, w); x.strokeStyle = '#ff3b30'; x.lineWidth = 9; x.lineCap = 'round'; x.beginPath(); x.moveTo(18, 18); x.lineTo(46, 46); x.moveTo(46, 18); x.lineTo(18, 46); x.stroke(); });
    const padTex = tex2(128, 96, (x, w, h) => { x.fillStyle = '#0a0d12'; x.fillRect(0, 0, w, h); x.strokeStyle = '#5ab4ff'; x.lineWidth = 3; x.strokeRect(10, 10, w - 20, h - 20);
      x.lineWidth = 4; for (const r of [10, 20, 30]) { x.beginPath(); x.arc(w / 2 - 14, h / 2, r, -0.7, 0.7); x.stroke(); } x.fillStyle = '#5ab4ff'; x.fillRect(w / 2 + 14, h / 2 - 16, 20, 32); });
    const faceTex = (ok) => tex2(128, 200, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, ok ? '#0b3b1c' : '#0b1626'); g.addColorStop(1, '#05080d'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.strokeStyle = ok ? '#3dff7a' : '#5ab4ff'; x.lineWidth = 3; x.beginPath(); x.ellipse(w / 2, 82, 34, 44, 0, 0, Math.PI * 2); x.stroke();
      for (const [cx, cy, dx, dy] of [[24, 30, 1, 1], [104, 30, -1, 1], [24, 134, 1, -1], [104, 134, -1, -1]]) { x.beginPath(); x.moveTo(cx, cy + dy * 14); x.lineTo(cx, cy); x.lineTo(cx + dx * 14, cy); x.stroke(); }
      x.fillStyle = ok ? '#3dff7a' : '#cfe6ff'; x.textAlign = 'center'; x.font = '600 16px "Noto Sans SC", sans-serif'; x.fillText(ok ? '验证通过' : '请刷脸通行', w / 2, 168); x.font = '11px sans-serif'; x.fillText(ok ? 'Verified' : 'Face to pass', w / 2, 186); });
    const M = { arrow: new THREE.MeshBasicMaterial({ map: arrowTex }), cross: new THREE.MeshBasicMaterial({ map: crossTex }), pad: new THREE.MeshBasicMaterial({ map: padTex, color: new THREE.Color(1.2, 1.2, 1.2) }),
      faceOff: new THREE.MeshBasicMaterial({ map: faceTex(false) }), faceOk: new THREE.MeshBasicMaterial({ map: faceTex(true) }),
      stripOff: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.8, 1.4) }), stripOk: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 1.5, 0.6) }) };
    GATE_M = M;
    // the cabinets: at the outer edges and between lanes
    const L0 = A.gates[0] - 0.6, cabZ = [L0, ...A.gates.map((z) => z + 0.6)];
    const bodyGeo = new RoundedBoxGeometry(GL - GW, GH, GW, 3, 0.02), endGeo = new THREE.CylinderGeometry(GW / 2, GW / 2, GH, 20), lidGeo = new RoundedBoxGeometry(GL, 0.025, GW + 0.01, 2, 0.01);
    for (const z of cabZ) {
      add(bodyGeo, steel, gx, Y0 + GH / 2, z).castShadow = true;
      for (const ex of [-1, 1]) add(endGeo, steel, gx + ex * (GL - GW) / 2, Y0 + GH / 2, z);
      add(lidGeo, lid, gx, Y0 + GH + 0.012, z);
      contactShadow(group, gx, Y0, z, GL + 0.3, 0.6, 0.45);
    }
    // each lane: the wings, the lamps, the face screen and card pad (on the cabinet to your right as you go in, the
    // north one), the light lines
    for (const z of A.gates) {
      const wings = [];
      for (const side of [-1, 1]) {                                  // -1: from the north cabinet, +1: from the south
        const pivot = new THREE.Group(); pivot.position.set(gx + 0.1, Y0, z + side * (0.6 - GW / 2)); group.add(pivot);
        const sh = new THREE.Shape(), w = 0.48, hh = TOP - 0.01; sh.moveTo(0, 0.22); sh.lineTo(w, 0.22); sh.lineTo(w, hh - 0.12); sh.quadraticCurveTo(w, hh, w - 0.12, hh); sh.lineTo(0, hh); sh.closePath();   // (level with the lid)
        const g = new THREE.ShapeGeometry(sh, 8); g.rotateY(side < 0 ? -Math.PI / 2 : Math.PI / 2);   // extends toward the lane's middle
        const wing = new THREE.Mesh(g, wingGlass); wing.renderOrder = 3; pivot.add(wing);
        const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.04, TOP - 0.24, 0.04), steel); clamp.position.set(0, 0.22 + (TOP - 0.24) / 2, 0); pivot.add(clamp);
        wings.push({ pivot, side });
      }
      const ends = [];
      for (const ex of [-1, 1]) for (const cz of [z - 0.6, z + 0.6]) {         // the lamps on the cabinet ends, facing each way
        const lamp = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.07), M.cross); lamp.position.set(gx + ex * (GL / 2 + 0.002), Y0 + GH - 0.12, cz + (cz < z ? 0.06 : -0.06)); lamp.rotation.y = ex > 0 ? Math.PI / 2 : -Math.PI / 2; group.add(lamp); ends.push(lamp);
      }
      const strips = [];
      for (const cz of [z - 0.6 + GW / 2 + 0.002, z + 0.6 - GW / 2 - 0.002]) { const st = new THREE.Mesh(new THREE.PlaneGeometry(GL - GW - 0.1, 0.012), M.stripOff); st.position.set(gx, Y0 + GH - 0.05, cz); st.rotation.y = cz < z ? 0 : Math.PI; group.add(st); strips.push(st); }
      // the face screen on a post at the entry end (the public side, east), angled toward who comes up; the card pad
      const sx = gx + GL / 2 - 0.12, sz = z - 0.6;
      add(new THREE.CylinderGeometry(0.018, 0.022, 0.3, 10), steel, sx, Y0 + GH + 0.15, sz);
      const term = new THREE.Group(); term.position.set(sx, Y0 + GH + 0.4, sz); term.rotation.set(0, Math.PI / 2 - 0.35, 0); group.add(term);
      const bezel = new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.24, 0.025, 2, 0.008), lid); term.add(bezel);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.128, 0.2), M.faceOff); screen.position.z = 0.014; term.add(screen);
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.13), M.pad); pad.rotation.x = -Math.PI / 2; pad.position.set(gx + GL / 2 - 0.42, Y0 + GH + 0.026, sz); group.add(pad);
      const col = addDynamicCollider('gate'); Object.assign(col, { y0: 0, y1: 8, minX: gx - 0.1, maxX: gx + 0.1, minZ: z - 0.5, maxZ: z + 0.5 });
      flaps.push({ z, wings, ends, strips, screen, col, open: 0, until: 0, lit: null });
    }
    // glass balustrades from the outer cabinets to the walls: clear glass in steel posts, a steel handrail
    for (const [za, zb] of [[A.z0, L0 - GW / 2], [cabZ[cabZ.length - 1] + GW / 2, A.z1]]) {
      const len = zb - za, zc2 = (za + zb) / 2;
      // (the same line as the gates: glass up to the lids' height, a flat steel cap level with them)
      const gh = TOP - 0.12, pane = add(new THREE.PlaneGeometry(len, gh), wingGlass, gx, Y0 + 0.1 + gh / 2, zc2, Math.PI / 2); pane.renderOrder = 3;
      box(0.05, 0.025, len, steel, gx, Y0 + TOP - 0.025, zc2);
      for (let zz = za + 0.05; zz <= zb + 0.01; zz += Math.max(0.9, len / Math.ceil(len / 1.4))) add(new THREE.CylinderGeometry(0.022, 0.026, TOP - 0.025, 12), steel, gx, Y0 + (TOP - 0.025) / 2, Math.min(zz, zb - 0.05));
    }
  }
  const steelDoor = new THREE.MeshStandardMaterial({ map: steelDoorTexture(), color: 0xffffff, metalness: 1, roughness: 0.32 });
  for (const z of [-148.5, -145.5, -142.5]) {
    box(1.4, 2.7, 0.08, new THREE.MeshStandardMaterial({ color: 0x8b9096, metalness: 1, roughness: 0.3 }), A.x0 + 0.06, Y0, z, Math.PI / 2);   // lift doors
    add(new THREE.PlaneGeometry(1.36, 2.66), steelDoor, A.x0 + 0.105, Y0 + 1.33, z, Math.PI / 2);
    box(1.6, 0.12, 0.05, new THREE.MeshStandardMaterial({ color: 0x5c6166, metalness: 1, roughness: 0.4 }), A.x0 + 0.08, Y0 + 2.7, z, Math.PI / 2);   // the head
  }
  // the lifts' fittings: a steel architrave round each door, a floor display over it (amber digits on black glass),
  // call buttons between the doors
  {
    const frameM = new THREE.MeshStandardMaterial({ color: 0xb9bdc2, metalness: 1, roughness: 0.3 });
    const disp = (txt) => new THREE.MeshBasicMaterial({ map: canvasTex(160, 64, (x, w, h) => { x.fillStyle = '#050506'; x.fillRect(0, 0, w, h); x.fillStyle = '#ffb02e'; x.font = '700 40px "Noto Sans SC", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, w / 2, h / 2 + 2); }), color: new THREE.Color(1.3, 1.3, 1.3) });
    [['5 ▲', -148.5], ['1', -145.5], ['3 ▼', -142.5]].forEach(([txt, z]) => {
      for (const dz of [-0.76, 0.76]) box(0.1, 2.82, 0.08, frameM, A.x0 + 0.07, Y0, z + dz);
      box(0.1, 0.1, 1.62, frameM, A.x0 + 0.07, Y0 + 2.76, z);
      box(0.04, 0.16, 0.4, dark, A.x0 + 0.04, Y0 + 3.0, z);
      add(new THREE.PlaneGeometry(0.36, 0.13), disp(txt), A.x0 + 0.065, Y0 + 3.08, z, Math.PI / 2);
    });
    const ring = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.4, 1.5) });
    for (const z of [-147.0, -144.0]) {
      box(0.02, 0.26, 0.1, frameM, A.x0 + 0.02, Y0 + 1.02, z);                                                                 // the plate
      for (const dy of [0.065, -0.065]) { const b = add(new THREE.CylinderGeometry(0.018, 0.018, 0.012, 16), ring, A.x0 + 0.035, Y0 + 1.15 + dy, z); b.rotation.z = Math.PI / 2; }
    }
  }
  for (const [x, z] of [[-44.5, -145.5], [-38, -150.2], [-38, -140.8]]) lights.push({ x, y: Y0 + A.h - 0.4, z, intensity: 11, distance: 9, color: new THREE.Color(1.0, 0.88, 0.7) });

  group.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });

  // ================= people =================
  const ppl = {};
  const placePerson = (id, role, x, z, yaw, clip = 'idle') => {
    if (!people) return null;
    const p = createPerson(people, people.manifest.cast[role] ? role : 'p1'); p.root.position.set(x, Y0, z); p.root.rotation.y = yaw; p.play(clip, 0);
    p.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); scene.add(p.root); ppl[id] = p; p.home = { x, z, yaw }; return p;
  };
  { const r = placePerson('receptionist', 'c2', P.x0 + 0.7, -227.6, Math.PI / 2); if (r) dressFrontDesk(r); }   // the front desk: near-black, a gold name badge, her hair up
  { const c = placePerson('concierge', 'p3', P.x0 + 0.7, -237.5, Math.PI / 2); if (c) dressConcierge(c); }                                     // the concierge: dark suit, the golden crossed keys on his lapels
  // the hotel's security: a middle-aged man in a dark suit with an earpiece on the Nanjing Road door (world/outfits.js)
  const guard = (id, x, z, yaw, o) => { const g = placePerson(id, 'lin', x, z, yaw); if (g) dressHotelSecurity(g, o); return g; };
  guard('doorman', doorX + 2.6, -210.4, -0.35);                       // beside the revolving door, facing the street
  // at the lifts, not a guard but a Peace Ambassador, of the front-of-house team in black tuxedos (Shanghai Daily,
  // 2015): she greets you and presses the call button before you reach it, as guests describe. (The lift operators
  // who rode the old cage lifts are long gone; inside, you tap your own card.)
  { const a = placePerson('liftAttendant', 'p2', ATT.home.x, ATT.home.z, ATT.home.yaw); if (a) dressPeaceAmbassador(a); }
  placePerson('guestA', 'vivian', -54.6, -221.0, -2.4, 'talk1');
  placePerson('guestB', 'p5', -55.8, -222.1, 0.8, 'talk2');
  { const r = placePerson('aiaDesk', 'p2', -38.5, -139.75, Math.PI); if (r) dressReceptionist(r); }   // (in the front desk's uniform: an agent in the lobby wears the same body)
  placePerson('aiaGuard', 'p4', A.gateX + 0.9, -141.9, Math.PI + 0.9);
  const worker = placePerson('aiaWorker', 'p3', A.x1 + 3, -145.5, -Math.PI / 2, 'walk');
  if (worker) worker.root.visible = false;

  // the halls as the glass reflects them (world/glass.js): each taken the first time you're inside, half a second
  // in (the nearest lamps have come on by then), and again when you're inside and day has turned to night or back
  const probes = [
    { box: PEACE_BOX, p: createRoomProbe([glass], [-44, Y0 + 1.8, -233]), wait: 0.5 },
    { box: AIA_BOX, p: createRoomProbe(aiaPanes, [-38.5, Y0 + 1.8, -145.5]), wait: 0.5 },
  ];
  const inBox = (pp, b) => pp.x > b.min[0] && pp.x < b.max[0] && pp.z > b.min[2] && pp.z < b.max[2] && pp.y < b.max[1];
  function updateProbes(dt, pp) {
    if (!renderer) return;
    for (const pr of probes) {
      if (!inBox(pp, pr.box)) { pr.wait = 0.5; continue; }
      if (pr.p.taken && pr.p.day === Math.round(TOD.day.value)) continue;
      if ((pr.wait -= dt) <= 0) pr.p.take(renderer, scene);
    }
  }
  const S = { key: false, said: {}, workerT: 20, workerPhase: 'away', guardPhone: 0, guardT: 0, caught: 0, inside: null, drumSpin: 0 };
  const L0 = () => getLife();
  // what the hotel's staff say depends on the hour: the greeting, and what the Jazz Bar is doing (doors at 19:00,
  // the band from 20:00 to 00:30)
  const nowMin = () => { const L = getLife && getLife(); return L ? L.clock.minute : 1200; };
  const part = () => { const m = nowMin(); return m < 4 * 60 ? 'evening' : m < 11 * 60 ? 'morning' : m < 13 * 60 ? 'noon' : m < 18 * 60 ? 'afternoon' : 'evening'; };
  const DOOR_HELLO = { morning: ['hotelguard', '早上好，纪先生。', 'Good morning, Mr Ji.'], noon: ['hotelguard', '中午好，纪先生。', 'Good afternoon, Mr Ji.'], afternoon: ['hotelguard', '下午好，纪先生。', 'Good afternoon, Mr Ji.'], evening: ['hotelguard', '晚上好，纪先生。', 'Good evening, Mr Ji.'] };
  const DESK_KEY = {
    morning: ['hoteldesk', '纪先生，早上好，欢迎回来。这是您的房卡，612，江景房。', "Good morning, Mr Ji, welcome back. Here's your key card: 612, a river-view room."],
    noon: ['hoteldesk', '纪先生，中午好，欢迎回来。这是您的房卡，612，江景房。', "Good afternoon, Mr Ji, welcome back. Here's your key card: 612, a river-view room."],
    afternoon: ['hoteldesk', '纪先生，下午好，欢迎回来。这是您的房卡，612，江景房。', "Good afternoon, Mr Ji, welcome back. Here's your key card: 612, a river-view room."],
    evening: ['hoteldesk', '纪先生，晚上好，欢迎回来。这是您的房卡，612，江景房。', "Good evening, Mr Ji, welcome back. Here's your key card: 612, a river-view room."],
  };
  const DESK_JAZZ = {
    before: ['hoteldesk', '爵士吧晚上七点开门，八点开始现场演出，是老年爵士乐队。要帮您留位吗？', 'The Jazz Bar opens at seven tonight, and the Old Jazz Band plays from eight. Shall I hold a table for you?'],
    open: ['hoteldesk', '爵士吧已经开门了，八点开始演出，是老年爵士乐队。要帮您留位吗？', "The Jazz Bar's open now; the Old Jazz Band starts at eight. Shall I hold a table for you?"],
    playing: ['hoteldesk', '爵士吧正在演出，老年爵士乐队，现在过去正好。要帮您留位吗？', "The Old Jazz Band is playing in the Jazz Bar right now; it's a good time to go. Shall I hold a table?"],
    over: ['hoteldesk', '今晚的演出已经结束了，明晚八点还有，到时候帮您留位？', "Tonight's set has finished; there's another tomorrow at eight. Shall I hold you a table then?"],
  };
  const jazzNow = () => { const m = nowMin(); return m >= 20 * 60 || m < 30 ? 'playing' : m >= 19 * 60 ? 'open' : m < 6 * 60 ? 'over' : 'before'; };
  const sayLine = ([who, zh, en], secs) => say(who === 'hotelguard' ? T('保安', 'Security') : who === 'hotellift' ? T('服务员', 'Attendant') : T('前台', 'Front desk'), zh, en, secs);   // (latin keys: tools/voice reads them and voices each by its own cast entry)
  const say = (who, zh, en, secs = 3) => hud.bark({ speaker: who, text: { zh, en }, seconds: secs });

  // ---------- the Peace Hotel's lifts and their attendant ----------
  // She greets you by the hour and calls the lift for you; the car comes down floor by floor (the dial's needle
  // sweeping to G), the lantern's bell, the doors part; inside you tap your own card and press 6.
  const LIFT_HELLO = {
    morning: ['hotellift', '纪先生，早上好。我帮您按电梯。', "Good morning, Mr Ji. I'll call the lift for you."],
    noon: ['hotellift', '纪先生，中午好。我帮您按电梯。', "Good afternoon, Mr Ji. I'll call the lift for you."],
    afternoon: ['hotellift', '纪先生，下午好。我帮您按电梯。', "Good afternoon, Mr Ji. I'll call the lift for you."],
    evening: ['hotellift', '纪先生，晚上好。我帮您按电梯。', "Good evening, Mr Ji. I'll call the lift for you."],
  };
  const LIFT_WAIT = ['hotellift', '电梯马上就到，您稍等。', "It's on its way, sir. Just a moment."];
  const LIFT_IN = ['hotellift', '您请。进去刷一下房卡，再按楼层就可以了。', 'After you, sir. Tap your card inside, then press your floor.'];
  const LIFT_SIX = ['hotellift', '纪先生，六楼南边在装修，您那间不受影响。', "Mr Ji, the south end of six is being refitted; your room's not affected."];
  const LIFT_NOKEY = ['hotellift', '先生您好，上楼要刷房卡。您是住店客人吗？前台在那边。', "Hello, sir. The lifts need a room card. Are you staying with us? Reception's over there."];
  const LIFT_OUT = { day: ['hotellift', '纪先生，您慢走。', 'Have a good day, Mr Ji.'], evening: ['hotellift', '纪先生，您慢走。', 'Have a good evening, Mr Ji.'] };
  const car = lifts.find((l) => l.x === LIFT.car);
  const LS = { phase: 'idle', open: 0, t: 0, served: false, wasUp: false, boarded: 0 };
  const att = ppl.liftAttendant;
  const AT = { phase: 'home', t: 0, w: 0, lit: false, arm: null, bye: 0 };
  const WRIST = new THREE.Vector3(0, -0.035, 0.085);
  const arms = att ? ['L', 'R'].map((s) => ({ s, upper: att.root.getObjectByName(`Bip01_${s}_UpperArm`), fore: att.root.getObjectByName(`Bip01_${s}_Forearm`), hand: att.root.getObjectByName(`Bip01_${s}_Hand`) })).filter((a) => a.upper && a.fore && a.hand) : [];
  const wrist = new THREE.Vector3(), poleV = new THREE.Vector3(), sh = new THREE.Vector3(), qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qi = new THREE.Quaternion();
  // her hand to the button: two-bone IK on the nearer arm, faded in over the clip by w
  function reachButton(w) {
    if (w <= 0.001 || !arms.length) return;
    wrist.copy(ATT.button).add(WRIST);                                                 // the wrist a hand's length short of the button
    if (!AT.arm) { let best = Infinity; for (const a of arms) { const dd = a.upper.getWorldPosition(sh).distanceTo(wrist); if (dd < best) { best = dd; AT.arm = a; } } }
    const arm = AT.arm;
    const side = arm.s === 'L' ? 1 : -1, yaw = att.root.rotation.y;
    poleV.set(Math.cos(yaw) * side * 0.5, -1, -Math.sin(yaw) * side * 0.5).normalize();   // the elbow down and a little out
    qa.copy(arm.upper.quaternion); qb.copy(arm.fore.quaternion);
    twoBone(arm.upper, arm.fore, arm.hand, wrist, poleV);
    if (w < 1) { qi.copy(arm.upper.quaternion); arm.upper.quaternion.slerpQuaternions(qa, qi, w); qi.copy(arm.fore.quaternion); arm.fore.quaternion.slerpQuaternions(qb, qi, w); arm.upper.updateMatrixWorld(true); }
  }
  function callLift() {                                       // the call stands: the button lit, the car on its way
    if (LS.phase === 'called' || LS.phase === 'open') return;
    LS.phase = 'called'; car.want = 0; callUp[ATT.plate].material = btnOn;
    audio && audio.cue && audio.cue('click', 0, 0.6);
  }
  // someone wants to go up: she steps to the plate and presses it (or, with nobody there, the call is simply made)
  // (late at night, 23:00 to 7:00, nobody is at the lifts: you press it yourself)
  const staffed = () => !!(att && att.root.visible);
  function request(greet) {
    if (staffed()) {
      if (greet) sayLine(LIFT_HELLO[part()], 4.4);
      if (LS.phase !== 'open' && LS.phase !== 'called' && AT.phase === 'home') { AT.phase = 'step'; att.play('walk', 0.25); }
    } else if (LS.phase !== 'open' && LS.phase !== 'called') { callLift(); hud.toast(T('你按了上行键', 'You press the up button'), 2); }
  }
  function board() {
    LS.boarded++;
    if (LS.boarded === 1) sayLine(LIFT_IN, 4.8); else if (LS.boarded === 2) sayLine(LIFT_SIX, 4.4);
    hud.toast(T('刷房卡 · 按 6', 'Tap your card · press 6'), 2.4); audio && audio.cue && audio.cue('click', 0.5, 0.6);
    LS.phase = 'closing'; car.want = 6; LS.served = true;
    onLift && onLift();
  }
  function updateLifts(dt, pp) {
    // the cars: each needle follows its car floor by floor (under a second a floor); the idle ones wander
    for (const l of lifts) {
      if (l !== car || LS.phase === 'idle') { l.t -= dt; if (l.t <= 0 && Math.hypot(pp.x - l.x, pp.z - P.z0) > 6) { l.want = 1 + Math.floor(Math.random() * 9); l.t = 20 + Math.random() * 40; } }
      if (Math.abs(l.want - l.floor) > 0.01) l.floor += Math.sign(l.want - l.floor) * Math.min(Math.abs(l.want - l.floor), dt * 1.3);
      l.needle.rotation.z = Math.PI - (l.floor / (LIFT.floors.length - 1)) * Math.PI;
    }
    if (LS.phase === 'called' && car.floor <= 0.01) {
      LS.phase = 'open'; LS.t = 7; callUp[ATT.plate].material = btnOff;
      audio && audio.cue && audio.cue('liftBell', 0, 0.8);
    }
    if (LS.phase === 'open') {
      const inDoor = Math.abs(pp.x - LIFT.car) < 0.9 && pp.z < P.z0 + 1.2 && pp.y < Y0 + 3;
      LS.t -= dt; if (LS.t <= 0 && !inDoor) LS.phase = 'closing';
    }
    const want = LS.phase === 'open' ? 1 : 0;
    LS.open += Math.sign(want - LS.open) * Math.min(Math.abs(want - LS.open), dt * (want ? 0.9 : 0.7));
    if (LS.phase === 'closing' && LS.open <= 0) LS.phase = 'idle';
    const e = LS.open * LS.open * (3 - 2 * LS.open);                                   // eased: the leaves start and stop gently
    car.leaves.forEach((m, i) => { const s = i ? 1 : -1; m.position.x = LIFT.car + s * (LIFT.w / 4 + 0.01 + e * (LIFT.w / 2 + 0.04)); });
    // you come down: the doors are open as you step out, and she sees you off
    const up = pp.y > Y0 + 4;
    if (LS.wasUp && !up && Math.hypot(pp.x - LIFT.car, pp.z - (P.z0 + 2.4)) < 2.5) {
      car.floor = car.want = 0; LS.phase = 'open'; LS.open = 1; LS.t = 3.5; LS.served = true;
      if (staffed()) AT.bye = 1.4;
    }
    LS.wasUp = up;
    if (AT.bye > 0 && (AT.bye -= dt) <= 0) sayLine(nowMin() >= 17 * 60 || nowMin() < 4 * 60 ? LIFT_OUT.evening : LIFT_OUT.day, 2.4);
    if (up) return;
    // walk up to the lifts with your card: she calls one for you (once, until you've gone away again)
    const hasKey = S.key || L0().flags.hotelKey, d = Math.hypot(pp.x - LIFT.car, pp.z - (P.z0 + 1));
    if (d > 7.5) LS.served = false;
    if (hasKey && !LS.served && d < 4.8 && staffed()) { LS.served = true; request(true); }
  }
  // the attendant: home by the plate, a step to it, a turn, the press, back
  function updateAttendant(dt, pp) {
    if (!att || !att.root.visible) return;
    const r = att.root, near = Math.hypot(pp.x - r.position.x, pp.z - r.position.z) < 6;
    const walkTo = (tx, tz) => { const dx = tx - r.position.x, dz = tz - r.position.z, dd = Math.hypot(dx, dz); if (dd < 0.03) return true; const st = Math.min(dd, 0.85 * dt); r.position.x += dx / dd * st; r.position.z += dz / dd * st; r.rotation.y = turnTo(r.rotation.y, Math.atan2(dx, dz), dt * 6); att.setGait(0.85); return false; };
    let look = near ? [pp.x, pp.z] : null;
    if (AT.phase === 'home') r.rotation.y = turnTo(r.rotation.y, ATT.home.yaw, dt * 2);
    else if (AT.phase === 'step') { look = null; if (walkTo(ATT.press.x, ATT.press.z)) { AT.phase = 'turn'; att.play('idle', 0.3); } }
    else if (AT.phase === 'turn') { look = null; const want = Math.atan2(ATT.button.x - r.position.x, ATT.button.z - r.position.z); r.rotation.y = turnTo(r.rotation.y, want, dt * 5); if (Math.abs(angDiff(r.rotation.y, want)) < 0.06) { AT.phase = 'press'; AT.t = 0; AT.lit = false; AT.arm = null; } }
    else if (AT.phase === 'press') {
      look = null; AT.t += dt;
      AT.w = AT.t < 0.4 ? smooth(AT.t / 0.4) : AT.t < 0.75 ? 1 : Math.max(0, 1 - smooth((AT.t - 0.75) / 0.4));
      if (!AT.lit && AT.t > 0.42) { AT.lit = true; callLift(); }
      if (AT.t > 1.2) { AT.phase = 'back'; AT.w = 0; att.play('walk', 0.25); }
    } else if (AT.phase === 'back') { if (walkTo(ATT.home.x, ATT.home.z)) { AT.phase = 'home'; att.play('idle', 0.3); } }
    att.update(dt, look);
    if (AT.phase === 'press') reachButton(AT.w);
  }

  // ---------- AIA: the badge-in loop, the guard's attention, tailgating ----------
  function updateAia(dt, pp) {
    // a worker comes in from the street every ~45 s, badges through gate 2, walks to the lifts, rides up
    const w = worker; S.workerT -= dt;
    if (w) {
      const lane = A.gates[1];
      if (S.workerPhase === 'away' && S.workerT <= 0) { S.workerPhase = 'in'; w.root.visible = true; w.root.position.set(L.facadeX + 3, Y0, -145.5); w.play('walk', 0.2); }
      const go = (tx, tz, speed = 1.3) => { const dx = tx - w.root.position.x, dz = tz - w.root.position.z, d = Math.hypot(dx, dz); if (d < 0.08) return true; const st = Math.min(d, speed * dt); w.root.position.x += dx / d * st; w.root.position.z += dz / d * st; w.root.rotation.y = Math.atan2(dx, dz); w.setGait(speed); return false; };
      if (S.workerPhase === 'in' && go(A.gateX + 1.2, lane)) { S.workerPhase = 'badge'; S.workerT = 0.8; w.play('idle', 0.2); }
      if (S.workerPhase === 'badge') { if (S.workerT <= 0) { const f = flaps.find((q) => q.z === lane); f.until = 2.8; S.workerPhase = 'through'; w.play('walk', 0.2); audio && audio.cue && audio.cue('ping', 0, 0.3); } }
      if (S.workerPhase === 'through' && go(A.x0 + 1.8, -145.5)) { S.workerPhase = 'lift'; S.workerT = 3; w.play('idle', 0.3); }
      if (S.workerPhase === 'lift' && S.workerT <= 0) { w.root.visible = false; S.workerPhase = 'away'; S.workerT = 35 + Math.random() * 25; }
      if (w.root.visible) w.update(dt);
    }
    // the gates: flaps fold away while open
    for (const f of flaps) {
      f.until = Math.max(0, f.until - dt); const want = f.until > 0 ? 1 : 0;
      f.open += (want - f.open) * Math.min(1, dt * 6);
      // the wings swing aside, each toward the way through (parallel to the lane, against its cabinet)
      for (const w of f.wings) w.pivot.rotation.y = w.side * (Math.PI / 2) * f.open;
      const ok = f.until > 0;
      if (f.lit !== ok) { f.lit = ok; const G = gateMats(); for (const e of f.ends) e.material = ok ? G.arrow : G.cross; for (const st of f.strips) st.material = ok ? G.stripOk : G.stripOff; f.screen.material = ok ? G.faceOk : G.faceOff; }
      if (f.open > 0.6) Object.assign(f.col, { minX: 1e6, maxX: 1e6 }); else Object.assign(f.col, { minX: A.gateX - 0.1, maxX: A.gateX + 0.1, minZ: f.z - 0.5, maxZ: f.z + 0.5 });
    }
    // the guard: watches the gates, but every so often he's on his phone
    const g = ppl.aiaGuard;
    if (g) {
      S.guardT -= dt;
      if (S.guardT <= 0) { S.guardPhone = S.guardPhone > 0 ? 0 : 1; S.guardT = S.guardPhone ? 6 + Math.random() * 4 : 9 + Math.random() * 8; }
      g.setPhoneHold(S.guardPhone ? 1 : 0); g.play(S.guardPhone ? 'idle' : 'look', 0.5);
      g.update(dt, S.guardPhone ? null : [pp.x, pp.z]);
      // through the gate line without a badge: seen (unless he's on his phone) -> walked back
      S.caught = Math.max(0, S.caught - dt);
      if (pp.x > A.x1 + 2) S.escorted = false;                              // left the building: an escort's over
      if (pp.x < A.gateX - 0.3 && pp.x > A.x0 && pp.z > A.z0 && pp.z < A.z1 && !S.passedAia && !S.escorted) {
        const d = Math.hypot(pp.x - g.root.position.x, pp.z - g.root.position.z);
        if (!S.guardPhone && d < 9 && S.caught <= 0) {
          S.caught = 4; say(T('保安', 'Security'), '先生，先生！请刷卡，没有预约不能进去。', 'Sir! Sir, you need to badge in. No entry without an appointment.', 3.2);
          player.teleport(A.gateX + 1.6, -145.5, -Math.PI / 2, 0);
        } else if (S.caught <= 0) { S.passedAia = true; hud.toast(T('你跟着别人混了进去', 'You slipped in behind someone'), 3); L0().flags.aiaTailgated = true; save && save(); }
      }
      if (pp.x > A.gateX + 0.3) S.passedAia = false;
    }
    for (const id of ['aiaDesk']) if (ppl[id]) ppl[id].update(dt, Math.hypot(pp.x - ppl[id].root.position.x, pp.z - ppl[id].root.position.z) < 6 ? [pp.x, pp.z] : null);
  }

  // ---------- the Peace Hotel: staff watching, the revolving door ----------
  function updatePeace(dt, pp) {
    const near = (p, d) => p && Math.hypot(pp.x - p.root.position.x, pp.z - p.root.position.z) < d;
    for (const id of ['receptionist', 'concierge', 'doorman', 'guestA', 'guestB']) { const p = ppl[id]; if (p) p.update(dt, near(p, 6) && !id.startsWith('guest') ? [pp.x, pp.z] : null); }
    updateLifts(dt, pp); updateAttendant(dt, pp);
    // the revolving door turns as you go through
    const inDoor = Math.abs(pp.x - doorX) < 1.4 && Math.abs(pp.z - -212.2) < 1.6;
    S.drumSpin += ((inDoor ? 1.6 : 0) - S.drumSpin) * Math.min(1, dt * 2); vanes.rotation.y += S.drumSpin * dt;
    if (inDoor && !S.doormanSaid && ppl.doorman) { S.doormanSaid = true; sayLine(DOOR_HELLO[part()], 2.2); }
    if (!inDoor && pp.z > -209) S.doormanSaid = false;
  }

  // ---------- what E does ----------
  const targets = [
    { id: 'pReception', x: P.x0 + 3.6, y: Y0 + 1.4, z: -227.6, reach: 2.6 },
    { id: 'pConcierge', x: P.x0 + 3.3, y: Y0 + 1.4, z: -237.5, reach: 2.6 },
    { id: 'pLifts', x: -48, y: Y0 + 1.6, z: P.z0 + 0.2, reach: 3.2 },
    { id: 'pStaff', x: P.x0 + 0.1, y: Y0 + 1.3, z: P.z1 - 21.1, reach: 2.2 },
    { id: 'aDesk', x: -38.5, y: Y0 + 1.4, z: -140.7, reach: 2.6 },
    { id: 'aQR', x: -36, y: Y0 + 1.3, z: -150.4, reach: 2.0 },
    ...A.gates.map((z, i) => ({ id: `aGate${i}`, x: A.gateX + 0.6, y: Y0 + 1.0, z, reach: 1.6 })),
    { id: 'aLifts', x: A.x0 + 0.8, y: Y0 + 1.6, z: -149.7, reach: 2.6 },
  ];
  const PROMPT = {
    pReception: () => [T('前台', 'Front desk'), T('交谈', 'Talk')], pConcierge: () => [T('礼宾部', 'Concierge'), waitingAt(L0(), 'hotel').length ? T('取快递', 'Collect your parcels') : T('交谈', 'Talk')],
    pLifts: () => [T('电梯', 'Lifts'), LS.phase === 'open' ? T('进电梯', 'Step in') : LS.phase === 'called' ? T('等电梯', 'Wait for it') : T('上楼', 'Go up')], pStaff: () => [T('员工通道', 'Staff only'), T('推门', 'Try the door')],
    aDesk: () => [T('前台', 'Reception'), T('交谈', 'Talk')], aQR: () => [T('访客预约', 'Visitor sign-in'), T('扫码', 'Scan')], aLifts: () => [T('电梯', 'Lifts'), T('呼叫', 'Call')],
  };
  // the desk staff look up now and then; busy with a guest or the screen otherwise
  const staffSees = () => (performance.now() / 1000) % 14 > 8;
  function interact(id) {
    const l = L0();
    if (id === 'pReception') {
      if (!S.key) { S.key = true; l.flags.hotelKey = true; sayLine(DESK_KEY[part()], 3.6); hud.toast(T('拿到房卡 612', 'Key card for room 612'), 3); }
      else sayLine(DESK_JAZZ[jazzNow()], 3.8);
    } else if (id === 'pConcierge') {
      const items = waitingAt(l, 'hotel');
      if (items.length) { for (const it of items) it.where = 'me'; say(T('礼宾部', 'Concierge'), `纪先生，您的快递，一共${items.length}件，都在这儿。`, `Mr Ji, your parcels: ${items.length}, all here.`, 3); hud.toast(T(`取回：${items.map((i) => i.name).join('、')}`, `Collected: ${items.map((i) => i.en).join(', ')}`), 3.6); save && save(); }
      else say(T('礼宾部', 'Concierge'), '目前没有您的快递哦。需要叫车的话我帮您约。', "Nothing waiting for you at the moment. If you need a car, I can book one.", 3);
    } else if (id === 'pLifts') {
      if (!(S.key || l.flags.hotelKey)) { if (staffed()) sayLine(LIFT_NOKEY, 5.6); else hud.toast(T('电梯需要刷房卡', 'The lifts need a room card'), 2.4); }
      else if (LS.phase === 'open') board();
      else if (LS.phase === 'called' || (staffed() && AT.phase !== 'home')) { if (staffed()) sayLine(LIFT_WAIT, 2.4); else hud.toast(T('电梯在下来了', 'The lift is on its way down'), 2); }
      else { const first = !LS.served; LS.served = true; request(first); if (!first && staffed()) sayLine(LIFT_WAIT, 2.4); }
    } else if (id === 'pStaff') {
      if (staffSees()) say(T('前台', 'Front desk'), '先生，那边是员工通道哦。', "Sir, that's the staff corridor.", 2.6);
      else hud.toast(T('门锁着。刷卡的。', "Locked. It takes a staff card."), 2.6);
    } else if (id === 'aDesk') {
      say(T('前台', 'Reception'), '您好，请问您找哪位？没有预约的话需要先在小程序上登记，被访同事确认后，人脸就能过闸机了。', 'Hello, who are you here to see? Without an appointment you register on the mini-program first; once your colleague confirms, your face opens the gates.', 5);
    } else if (id === 'aQR') {
      hud.toast(T('访客预约：请填写被访人手机号（你没有预约）', 'Visitor sign-in: enter your host\'s phone number (you have no appointment)'), 3.6);
    } else if (id.startsWith('aGate')) {
      hud.toast(T('人脸识别失败 · 请到前台登记', 'Face not recognised · please register at reception'), 2.6); audio && audio.cue && audio.cue('bump', 0, 0.3);
    } else if (id === 'aLifts') hud.toast(T('电梯需刷工卡', 'The lifts need a staff badge'), 2.4);
    return true;
  }

  return {
    group, lights,
    candidates() { return targets.map((t) => ({ ...t, cone: 0.6 })); },
    prompt(id) { const p = PROMPT[id] || (id.startsWith('aGate') ? () => [T('闸机', 'Gate'), T('刷脸', 'Face scan')] : null); if (!p) return null; const [target, action] = p(); return { target, action }; },
    owns(id) { return targets.some((t) => t.id === id); },
    interact,
    // someone with a badge takes you through (Yu'an): a gate opens and the guard lets you be
    escort(lane = 1, secs = 7) { const f = flaps.find((q) => q.z === A.gates[lane]); if (f) f.until = secs; S.escorted = true; if (audio && audio.cue) audio.cue('ping', 0, 0.3); },
    get escorted() { return !!S.escorted; },
    get liftState() { return { phase: LS.phase, open: +LS.open.toFixed(2), floor: +car.floor.toFixed(2), att: AT.phase, w: +AT.w.toFixed(2), served: LS.served }; },   // (tools)
    // the two guests talking in the hall (world/ambient.js gives them new things to say)
    talkPairs() {
      const a = ppl.guestA, b = ppl.guestB; if (!a || !b) return [];
      const at = (p) => () => [p.root.position.x, p.root.position.y + 1.6, p.root.position.z];
      return [{ keys: ['a', 'b'], near: (pp) => pp.y < 5 && Math.hypot(pp.x - a.root.position.x, pp.z - a.root.position.z) < 9,
        who: { a: { persona: 'office', card: 'a woman in her forties from Hong Kong staying at the Peace Hotel for a family wedding, chatty', at: at(a) }, b: { persona: 'office', card: 'her younger sister who lives in Shanghai, dry, practical', at: at(b) } } }];
    },
    talkables() {
      const P2 = { receptionist: 'receptionist', concierge: 'concierge', liftAttendant: 'liftAttendant', doorman: 'doorman', aiaDesk: 'aiaDesk', aiaGuard: 'aiaGuard' };
      return Object.entries(P2).filter(([k]) => ppl[k] && ppl[k].root.visible).map(([k, persona]) => { const r = ppl[k].root.position; return { key: k, persona, x: r.x, y: r.y + 1.62, z: r.z, hold() {} }; });
    },
    update(dt, pp) {
      const nearPeace = pp.z < -200 && pp.z > -262, nearAia = pp.z < -125 && pp.z > -165;
      updateProbes(dt, pp);
      if (nearPeace) updatePeace(dt, pp);
      if (nearAia) updateAia(dt, pp);
      for (const p of Object.values(ppl)) if (p !== worker) p.root.visible = p.home.z < -200 ? pp.z < -170 : Math.abs(pp.z - -145) < 60;   // only when you could see them
      // No.17's receptionist keeps office hours (8:30-18:30); the guard is there round the clock
      { const L = getLife && getLife(), m = L ? L.clock.minute : 720; if (ppl.aiaDesk && (m < 510 || m >= 1110)) ppl.aiaDesk.root.visible = false;
        if (ppl.liftAttendant && (m < 420 || m >= 1380)) ppl.liftAttendant.root.visible = false; }   // (the Peace's lift attendant: 7:00 to 23:00)
    },
  };
}
