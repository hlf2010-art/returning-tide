// Room 612 at the Peace Hotel, Ji Bai's room, after what guests and the restoration's designers describe of the
// hotel's rooms since 2010 (docs/living-city-buildings.md):
//   - the entry: vintage herringbone parquet (复古斜纹地板), the minibar and coffee things in walnut, the wardrobe
//   - the room: a dark-gold carpet with an Art Deco pattern (暗金色底色的地毯); walls in the soft buff of the hotel's
//     "buff and blue-grey" scheme over a walnut-burl dado; a cornice and a coffered ceiling with a flush Deco light
//   - a 2 m bed with a leather headboard (皮质的床头), walnut-burl nightstands, two pink glass table lamps with pale
//     yellow shades (两只粉红琉璃台灯, 浅黄色灯罩), a bench at its foot in blue-grey
//   - a solid-wood desk (实木书桌) between the windows, its chair with a dark-red velvet back (暗红色天鹅绒靠背)
//   - a brown corduroy sofa (咖啡色灯芯绒) with the television hidden in a cabinet beside it; a coffee table with
//     fruit and a handwritten welcome letter; oil paintings and blue-and-white porcelain
//   - the windows: double glazing that doesn't open, old-fashioned drapes tied back with bands, sheers
//   - the bathroom: black marble floor and counter, white marble walls (黑色系大理石 / 白色系), a free-standing
//     tub on decorative legs in the middle (欧式带装饰腿), a separate rain shower, two basins, the WC in its own
//     room, a small television set in the marble by the tub; robes and slippers
// The real hotel's standard rooms look onto the courtyard or the city; its river views come with the suites. The game
// keeps 612 on the Bund for its story (and gives it a suite's view).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeCanvas, tex, rng, tileNoise, normalFromHeight } from './canvas.js';
import { plasterTextures } from './surfaceDetail.js';
import { sidedGlass, createRoomProbe } from './glass.js';

// the plan (x: west to east, the Bund to the east; z: north to south)
export const ROOM = {
  x0: -43.0, x1: -35.4, z0: -233, z1: -225.4, door: [-227.7, -226.7],
  bath: { x0: -43.0, x1: -39.6, z0: -233, z1: -228.6, door: [-41.3, -40.4] },
  wc: { x0: -43.0, x1: -41.9, z0: -229.9, z1: -228.6 },
  win: [[-232.2, -230.6], [-228.4, -226.8]], sill: 0.55, head: 2.95, gx: -34.75,
  bed: { x: -37.5 }, desk: { z: -229.5 }, sofa: { x: -38.05 }, tub: { x: -41.5, z: -230.95 },
};
const R = ROOM, B = R.bath;

// colliders for what stands in the room (hotelUpper.js's solid(), on this storey only)
export function room612Colliders(solid) {
  // the bathroom's walls (a door in the south one), the WC's partitions
  solid(B.x1 - 0.06, B.x1 + 0.06, B.z0, B.z1);
  solid(B.x0, B.door[0], B.z1 - 0.06, B.z1 + 0.06); solid(B.door[1], B.x1 + 0.06, B.z1 - 0.06, B.z1 + 0.06);
  solid(R.wc.x1 - 0.05, R.wc.x1 + 0.05, R.wc.z0, R.wc.z1); solid(R.wc.x0, R.wc.x1, R.wc.z0 - 0.05, R.wc.z0 + 0.05);
  const f = (a, b, c, d) => solid(a, b, c, d, 'furniture');
  f(-42.85, -40.75, B.z0, -232.42);                           // the vanity
  f(-40.7, -40.6, B.z0, -231.95);                             // the shower's glass
  f(R.tub.x - 0.88, R.tub.x + 0.88, R.tub.z - 0.42, R.tub.z + 0.42);   // the tub
  f(-43.0, -41.35, -226.02, R.z1);                            // the wardrobe
  f(-41.25, -39.85, -225.98, R.z1);                           // the minibar
  f(-38.62, -36.38, R.z0, -230.78);                           // the bed
  f(-39.36, -38.78, R.z0, -232.42); f(-36.22, -35.64, R.z0, -232.42);   // the nightstands
  f(-38.28, -36.72, -230.66, -230.2);                         // the bench
  f(-36.04, -35.4, R.desk.z - 0.66, R.desk.z + 0.66);         // the desk
  f(R.sofa.x - 0.98, R.sofa.x + 0.98, -226.3, R.z1);          // the sofa
  f(R.sofa.x - 0.5, R.sofa.x + 0.5, -227.3, -226.7);          // the coffee table
  f(-36.88, -35.72, -225.98, R.z1);                           // the television cabinet
}

// ---------------- surfaces (canvas; made once) ----------------
const made = {};
const once = (k, f) => made[k] || (made[k] = f());
const mirrored = (t) => { t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; return t; };
// burl walnut: a flowing figure round clusters of little dark eyes; tiled mirrored, as veneer is book-matched
const burl = () => once('burl', () => {
  const S = 512, [c, x] = makeCanvas(S, S), r = rng(612);
  const g = x.createLinearGradient(0, 0, S, S); g.addColorStop(0, '#80502c'); g.addColorStop(0.5, '#6e4224'); g.addColorStop(1, '#7a4a28');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  for (let k = 0; k < 1100; k++) {
    const y0 = r() * S, amp = 3 + r() * 16, f = 0.008 + r() * 0.03, ph = r() * 6.28, light = r() < 0.45;
    x.strokeStyle = light ? `rgba(176,118,66,${0.05 + r() * 0.1})` : `rgba(42,22,10,${0.05 + r() * 0.12})`; x.lineWidth = 0.6 + r() * 1.8;
    x.beginPath(); for (let xx = 0; xx <= S; xx += 5) { const yy = y0 + Math.sin(xx * f + ph) * amp + Math.sin(xx * f * 2.7 + ph * 1.3) * amp * 0.45; if (xx) x.lineTo(xx, yy); else x.moveTo(xx, yy); } x.stroke();
  }
  for (let k = 0; k < 170; k++) {
    const cx = r() * S, cy = r() * S, n = 1 + Math.floor(r() * 5);
    for (let j = 0; j < n; j++) {
      const ex = cx + (r() - 0.5) * 24, ey = cy + (r() - 0.5) * 24, rr = 1.2 + r() * 2.8, sq = 0.55 + r() * 0.5, rot = r() * 3;
      for (let q = 4; q >= 1; q--) { x.strokeStyle = `rgba(34,16,6,${0.08 + 0.06 * (4 - q)})`; x.lineWidth = 1; x.beginPath(); x.ellipse(ex, ey, rr + q * 2.4, (rr + q * 2.4) * sq, rot, 0, 6.283); x.stroke(); }
      x.fillStyle = 'rgba(28,13,5,0.75)'; x.beginPath(); x.arc(ex, ey, rr * 0.55, 0, 6.283); x.fill();
    }
  }
  return mirrored(tex(c));
});
// the carpet: dark gold, an Art Deco lattice of stepped diamonds in bronze with blue-grey studs, a fan in each cell
const carpet = () => once('carpet', () => {
  const S = 512, [c, x] = makeCanvas(S, S), r = rng(77), n = tileNoise(S, 48, 78, 2);
  x.fillStyle = '#80602a'; x.fillRect(0, 0, S, S);
  const line = (w, col, path) => { x.strokeStyle = col; x.lineWidth = w; x.beginPath(); path(); x.stroke(); };
  for (const [w, col] of [[10, '#3a2a10'], [3, '#9c7d3e']]) {
    line(w, col, () => { for (const o of [-S, 0, S]) { x.moveTo(o, 0); x.lineTo(o + S, S); x.moveTo(o + S, 0); x.lineTo(o, S); } });
  }
  const fan = (cx, cy, rad) => { for (let k = 1; k <= 3; k++) line(2.5, k === 3 ? '#b08f4c' : '#7d6232', () => x.arc(cx, cy, rad * k / 3, Math.PI * 1.15, Math.PI * 1.85));
    for (let k = 0; k <= 4; k++) { const a = Math.PI * (1.15 + k * 0.175); line(2, '#7d6232', () => { x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); }); } };
  for (const [cx, cy] of [[S / 2, S * 0.36], [0, S * 0.86], [S, S * 0.86], [S / 2, S * 0.86 - S], [0, S * 0.36 - S + S], [S / 2, S * 1.36]]) fan(cx, cy, 70);
  const stud = (cx, cy) => { x.fillStyle = '#5c6a74'; x.fillRect(cx - 9, cy - 9, 18, 18); x.fillStyle = '#3a2a10'; x.fillRect(cx - 4, cy - 4, 8, 8); };
  for (const [cx, cy] of [[0, 0], [S, 0], [0, S], [S, S], [S / 2, S / 2]]) stud(cx, cy);
  const img = x.getImageData(0, 0, S, S);
  for (let i = 0; i < S * S; i++) { const k = 0.86 + n[i] * 0.22 + (r() - 0.5) * 0.06; for (let ch = 0; ch < 3; ch++) img.data[i * 4 + ch] = Math.min(255, img.data[i * 4 + ch] * k); }
  x.putImageData(img, 0, 0);
  return tex(c);
});
// marble: black (white veins) and white (grey veins); tiled mirrored
function marbleCanvas(seed, base, vein, ground) {
  const S = 512, [c, x] = makeCanvas(S, S), r = rng(seed), n = tileNoise(S, 6, seed + 1, 4);
  const img = x.createImageData(S, S);
  for (let i = 0; i < S * S; i++) { const k = (n[i] - 0.5) * ground; img.data.set([base[0] + k, base[1] + k, base[2] + k, 255], i * 4); }
  x.putImageData(img, 0, 0);
  const flow = r() * 6.28;                                                     // the veins run mostly one way, as in a slab
  for (let v = 0; v < 18; v++) {
    const pts = []; let px = r() * S, py = r() * S, a = flow + (r() - 0.5) * 0.8;
    for (let s2 = 0; s2 < 90; s2++) { a += (r() - 0.5) * 0.12 + (flow - a) * 0.02; px += Math.cos(a) * 7; py += Math.sin(a) * 7; pts.push([px, py]); }
    const w = 0.5 + r() * 1.6, al = 0.18 + r() * 0.4;
    for (const [lw, la] of [[w * 4, al * 0.12], [w * 2, al * 0.3], [w, al]]) {   // a soft halo, then the line
      x.strokeStyle = `rgba(${vein[0]},${vein[1]},${vein[2]},${la})`; x.lineWidth = lw; x.lineJoin = 'round'; x.beginPath(); pts.forEach(([qx, qy], i) => (i ? x.lineTo(qx, qy) : x.moveTo(qx, qy))); x.stroke();
    }
  }
  return mirrored(tex(c));
}
const marbleBlack = () => once('mb', () => marbleCanvas(91, [24, 24, 27], [214, 210, 204], 14));
const marbleWhite = () => once('mw', () => marbleCanvas(92, [232, 229, 224], [128, 126, 124], 12));
// corduroy: fine ribs (normal map) for the sofa
const cord = () => once('cord', () => { const [c, x] = makeCanvas(64, 64); for (let i = 0; i < 64; i++) { const v = 128 + 110 * Math.sin((i / 64) * Math.PI * 2 * 8); x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(i, 0, 1, 64); } return tex(normalFromHeight(c, 3), { srgb: false }); });
// a lampshade's pleats, pale yellow
const pleats = () => once('pleat', () => { const [c, x] = makeCanvas(256, 32); for (let i = 0; i < 256; i++) { const k = 0.86 + 0.14 * Math.abs(Math.sin((i / 256) * Math.PI * 24)); x.fillStyle = `rgb(${Math.round(246 * k)},${Math.round(226 * k)},${Math.round(160 * k)})`; x.fillRect(i, 0, 1, 32); } return tex(c); });
// blue-and-white porcelain: cobalt bands and a scrolling lotus round the belly, on white glaze
const porcelain = () => once('porc', () => {
  const [c, x] = makeCanvas(512, 256), r = rng(5);
  x.fillStyle = '#f2f1ec'; x.fillRect(0, 0, 512, 256);
  x.fillStyle = '#23408e'; for (const [y, h] of [[18, 6], [34, 3], [210, 3], [222, 7]]) x.fillRect(0, y, 512, h);
  x.strokeStyle = '#2a4a9e'; x.lineWidth = 3; x.beginPath(); for (let u = 0; u <= 512; u += 4) { const y = 128 + Math.sin(u / 512 * Math.PI * 8) * 34; if (u) x.lineTo(u, y); else x.moveTo(u, y); } x.stroke();
  for (let k = 0; k < 8; k++) { const u = 32 + k * 64, y = 128 + Math.sin((u / 512) * Math.PI * 8) * 34; x.fillStyle = '#2b4ea6';
    for (let p = 0; p < 6; p++) { const a = p / 6 * 6.283; x.beginPath(); x.ellipse(u + Math.cos(a) * 12, y - 30 + Math.sin(a) * 9, 9, 5, a, 0, 6.283); x.fill(); }
    x.fillStyle = '#1b3478'; x.beginPath(); x.arc(u, y - 30, 5, 0, 6.283); x.fill(); }
  for (let k = 0; k < 40; k++) { x.fillStyle = 'rgba(35,64,142,0.5)'; x.beginPath(); x.arc(r() * 512, 60 + r() * 20, 2.5, 0, 6.283); x.fill(); }
  return tex(c);
});
// an oil painting: the Bund from the river in the 1930s, warm, in short brush strokes over the scene
const painting = (kind) => once(`paint:${kind}`, () => {
  const W = 512, H = 384, [c, x] = makeCanvas(W, H), r = rng(kind === 'bund' ? 1930 : 1931);
  if (kind === 'bund') {
    const sky = x.createLinearGradient(0, 0, 0, H * 0.55); sky.addColorStop(0, '#9fb0b4'); sky.addColorStop(1, '#e6d4ac'); x.fillStyle = sky; x.fillRect(0, 0, W, H * 0.6);
    for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(255,248,230,${0.15 + r() * 0.2})`; x.beginPath(); x.ellipse(r() * W, 30 + r() * 110, 30 + r() * 60, 8 + r() * 14, 0, 0, 6.283); x.fill(); }
    // the waterfront: a row of stone buildings, the clock tower, the green pyramid
    let bx = 0; const y0 = H * 0.58;
    while (bx < W) { const w = 30 + r() * 46, h = 50 + r() * 70; x.fillStyle = ['#b8a283', '#a99577', '#c4b394', '#9d8a6e'][Math.floor(r() * 4)]; x.fillRect(bx, y0 - h, w - 2, h);
      x.fillStyle = 'rgba(60,48,34,0.45)'; for (let wy = y0 - h + 8; wy < y0 - 6; wy += 9) for (let wx = bx + 4; wx < bx + w - 6; wx += 7) x.fillRect(wx, wy, 3, 5); bx += w; }
    x.fillStyle = '#a89070'; x.fillRect(150, y0 - 150, 26, 150); x.fillStyle = '#e8e2d0'; x.beginPath(); x.arc(163, y0 - 128, 8, 0, 6.283); x.fill();   // the Customs House clock
    x.fillStyle = '#b6a385'; x.fillRect(372, y0 - 140, 50, 140); x.fillStyle = '#3f6b5a'; x.beginPath(); x.moveTo(366, y0 - 140); x.lineTo(397, y0 - 186); x.lineTo(428, y0 - 140); x.fill();   // the Peace Hotel's pyramid
    const river = x.createLinearGradient(0, y0, 0, H); river.addColorStop(0, '#8a8064'); river.addColorStop(1, '#5d5640'); x.fillStyle = river; x.fillRect(0, y0, W, H - y0);
    for (let i = 0; i < 140; i++) { x.fillStyle = `rgba(230,214,170,${0.08 + r() * 0.15})`; x.fillRect(r() * W, y0 + 4 + r() * (H - y0), 10 + r() * 30, 1.5); }
    for (const [jx, jy, s] of [[90, H * 0.8, 1.2], [300, H * 0.72, 0.8], [440, H * 0.86, 1.4]]) {   // junks under sail
      x.fillStyle = '#3c2c1c'; x.beginPath(); x.moveTo(jx - 30 * s, jy); x.lineTo(jx + 30 * s, jy); x.lineTo(jx + 22 * s, jy + 9 * s); x.lineTo(jx - 24 * s, jy + 9 * s); x.fill();
      x.fillStyle = '#7b4a2a'; for (const dx of [-12, 8]) { x.beginPath(); x.moveTo(jx + dx * s, jy); x.lineTo(jx + dx * s, jy - 46 * s); x.lineTo(jx + (dx + 18) * s, jy - 30 * s); x.lineTo(jx + (dx + 16) * s, jy); x.fill(); } }
  } else {
    // a still life: peonies in a blue-and-white jar on a dark table, a warm ground
    const bg = x.createRadialGradient(W * 0.5, H * 0.4, 20, W * 0.5, H * 0.5, W * 0.7); bg.addColorStop(0, '#6b5434'); bg.addColorStop(1, '#2a1f14'); x.fillStyle = bg; x.fillRect(0, 0, W, H);
    x.fillStyle = '#3a2618'; x.fillRect(0, H * 0.74, W, H * 0.26);
    x.fillStyle = '#e9e6dc'; x.beginPath(); x.ellipse(W * 0.5, H * 0.6, 62, 74, 0, 0, 6.283); x.fill(); x.fillStyle = '#2b4a9a'; x.fillRect(W * 0.5 - 50, H * 0.56, 100, 10);
    for (let i = 0; i < 9; i++) { const fx = W * 0.5 + (r() - 0.5) * 220, fy = H * 0.3 + (r() - 0.5) * 120, rr = 22 + r() * 18; x.fillStyle = ['#d98a96', '#f1c6cb', '#c25866', '#f4e4e0'][i % 4];
      for (let p = 0; p < 7; p++) { const a = p / 7 * 6.283; x.beginPath(); x.ellipse(fx + Math.cos(a) * rr * 0.4, fy + Math.sin(a) * rr * 0.4, rr * 0.55, rr * 0.4, a, 0, 6.283); x.fill(); } }
    for (let i = 0; i < 14; i++) { x.fillStyle = '#3d5a2c'; x.beginPath(); x.ellipse(W * 0.5 + (r() - 0.5) * 240, H * 0.35 + (r() - 0.5) * 140, 18, 7, r() * 3, 0, 6.283); x.fill(); }
  }
  // the brushwork: short strokes laid over in the scene's own colours
  const src = x.getImageData(0, 0, W, H).data;
  for (let i = 0; i < 9000; i++) {
    const px = Math.floor(r() * W), py = Math.floor(r() * H), k = (py * W + px) * 4, j = (r() - 0.5) * 22;
    x.fillStyle = `rgba(${src[k] + j},${src[k + 1] + j},${src[k + 2] + j},0.55)`;
    x.save(); x.translate(px, py); x.rotate((r() - 0.5) * 0.9 + (py > H * 0.58 ? 0 : 0.2)); x.fillRect(-4 - r() * 4, -1.2, 8 + r() * 8, 2.4 + r() * 1.5); x.restore();
  }
  return tex(c);
});
// the herringbone floor of the entry, drawn for its exact size (no tiling): oak-toned planks at 45 degrees
function herringbone(wm, hm) {
  const P = 220, W = Math.round(wm * P), H = Math.round(hm * P), [c, x] = makeCanvas(W, H), r = rng(31);
  x.fillStyle = '#5a3c20'; x.fillRect(0, 0, W, H);
  const L = 0.42 * P, w = 0.07 * P;
  x.save(); x.translate(W / 2, H / 2); x.rotate(Math.PI / 4);
  const ext = Math.hypot(W, H);
  for (let col = -ext; col < ext; col += 2 * w * Math.SQRT1_2 * 2) {
    for (let row = -ext; row < ext; row += w * Math.SQRT2 * 1) {
      for (const side of [0, 1]) {
        const tone = 0.86 + r() * 0.26, base = [158 * tone, 116 * tone, 72 * tone];
        x.save(); x.translate(col + side * (L * Math.SQRT1_2), row); x.rotate(side ? Math.PI / 2 : 0);
        x.fillStyle = `rgb(${base.map(Math.round).join(',')})`; x.fillRect(0, 0, L - 1, w - 1);
        x.strokeStyle = 'rgba(70,42,20,0.3)'; x.lineWidth = 1; for (let g = 0; g < 6; g++) { const gy = 2 + r() * (w - 4); x.beginPath(); x.moveTo(1, gy); x.bezierCurveTo(L * 0.3, gy + (r() - 0.5) * 3, L * 0.6, gy + (r() - 0.5) * 3, L - 2, gy); x.stroke(); }
        x.restore();
      }
    }
  }
  x.restore();
  return tex(c, { repeat: false });
}
// a letter in a fountain-pen hand
const letterTex = () => once('letter', () => {
  const [c, x] = makeCanvas(512, 360); x.fillStyle = '#f6f0e2'; x.fillRect(0, 0, 512, 360);
  x.strokeStyle = 'rgba(160,130,70,0.6)'; x.lineWidth = 3; x.strokeRect(14, 14, 484, 332);
  x.fillStyle = '#9a7a3e'; x.font = '600 26px "Noto Serif SC", serif'; x.textAlign = 'center'; x.fillText('和平饭店 · PEACE HOTEL', 256, 56);
  x.fillStyle = '#1f2a4a'; x.textAlign = 'left'; x.font = 'italic 30px "Noto Serif SC", serif';
  [['纪先生：', 110], ['欢迎回到和平饭店。', 162], ['愿您在外滩的每一天都顺心。', 212], ['—— 礼宾部 敬上', 290]].forEach(([t, y]) => x.fillText(t, t.startsWith('——') ? 230 : 48, y));
  return tex(c);
});

// a drape: a cloth in folds, `s` the side it's drawn back to (+1: toward +z). Full width up top, gathered to a quarter at
// the band (0.95 m), flaring a little below; anchored at its outer edge, so it gathers toward the side
function curtain(W, Hh, s) {
  const nu = 28, nv = 24, g = new THREE.PlaneGeometry(1, 1, nu, nv), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) + 0.5, y = (p.getY(i) + 0.5) * Hh;                                        // u 0 (outer edge) .. 1
    const band = 0.95, k = y > band ? 0.28 + 0.72 * Math.min(1, (y - band) / 0.9) : 0.28 + 0.3 * Math.min(1, (band - y) / 0.9);
    const width = W * k, depth = Math.sin(u * Math.PI * 9) * 0.045 * (0.6 + 0.6 * (1 - k)) + 0.02 * (1 - k);
    p.setXYZ(i, depth, y, -s * u * width);
  }
  g.computeVertexNormals();
  return g;
}

// a sheer: fine, even folds, hanging straight (its top at y = height, its first edge at z = 0, running toward +z)
function sheer(W, Hh) {
  const g = new THREE.PlaneGeometry(1, 1, 40, 2), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const u = p.getX(i) + 0.5, y = (p.getY(i) + 0.5) * Hh; p.setXYZ(i, Math.sin(u * Math.PI * 16) * 0.018, y, u * W); }
  g.computeVertexNormals();
  return g;
}

// ---------------- the build ----------------
// ctx: { group, F, H, lights }. Returns the panes and probes for the glass, and a few things the room's update needs
export function buildRoom612({ group, F, H, lights }) {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const pl = plasterTextures();
  const M = {
    buff: std({ map: pl.map, normalMap: pl.normalMap, normalScale: new THREE.Vector2(0.4, 0.4), color: 0xdcc9a4, roughness: 0.9, emissive: 0x1c140a }),
    ceil: std({ map: pl.map, color: 0xf2e9d8, roughness: 0.92, emissive: 0x2a2014 }),
    burl: new THREE.MeshPhysicalMaterial({ map: burl(), color: 0xf0d8c0, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.18, emissive: 0x0a0503 }),
    walnut: std({ color: 0x3e2617, roughness: 0.4, metalness: 0.05 }),
    nickel: std({ color: 0xd9d8d2, roughness: 0.16, metalness: 1, envMapIntensity: 1.2 }),
    bronze: std({ color: 0x4a3622, roughness: 0.35, metalness: 0.85 }),
    gilt: std({ color: 0xbf9a4e, roughness: 0.35, metalness: 0.9 }),
    carpet: std({ map: carpet(), roughness: 0.97, color: 0xffffff, emissive: 0x0c0804 }),
    leather: new THREE.MeshPhysicalMaterial({ color: 0xcbb592, roughness: 0.5, sheen: 0.3, sheenColor: new THREE.Color(0xe8d8b8), clearcoat: 0.15, clearcoatRoughness: 0.5 }),
    blueGrey: new THREE.MeshPhysicalMaterial({ color: 0x5f6d78, roughness: 0.85, sheen: 0.6, sheenColor: new THREE.Color(0x9aa8b4) }),
    velvet: new THREE.MeshPhysicalMaterial({ color: 0x5e1418, roughness: 0.8, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color(0xb03040) }),
    cord: std({ color: 0x6a4a30, roughness: 0.9, normalMap: cord(), normalScale: new THREE.Vector2(0.8, 0.8) }),
    linen: std({ color: 0xf6f3ec, roughness: 0.85, emissive: 0x1c1915 }),
    pinkGlass: new THREE.MeshPhysicalMaterial({ color: 0xeaa2a6, roughness: 0.08, transparent: true, opacity: 0.88, emissive: 0x5a2226, clearcoat: 1 }),
    shade: std({ map: pleats(), color: 0xffffff, roughness: 0.9, emissive: 0xc8a050, emissiveIntensity: 0.9, side: THREE.DoubleSide }),
    marbleB: std({ map: marbleBlack(), roughness: 0.18, envMapIntensity: 1.1 }),
    marbleW: std({ map: marbleWhite(), roughness: 0.22, emissive: 0x141210 }),
    porcelain: new THREE.MeshPhysicalMaterial({ map: porcelain(), roughness: 0.15, clearcoat: 1 }),
    ceramic: new THREE.MeshPhysicalMaterial({ color: 0xf7f6f2, roughness: 0.12, clearcoat: 1 }),
    tub: new THREE.MeshPhysicalMaterial({ color: 0xf7f6f2, roughness: 0.12, clearcoat: 1, side: THREE.DoubleSide, emissive: 0x1a1a18 }),
    basin: new THREE.MeshPhysicalMaterial({ color: 0xe9e8e3, roughness: 0.1, clearcoat: 1 }),
    black: std({ color: 0x0b0b0c, roughness: 0.25, metalness: 0.3 }),
    glow: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.08, 0.78) }),
    sheer: std({ color: 0xf6f1e4, transparent: true, opacity: 0.4, roughness: 1, side: THREE.DoubleSide, depthWrite: false, emissive: 0x2a2620 }),
  };
  const metric = (geo, tile) => { const uv = geo.attributes.uv, p = geo.parameters || {}; if (geo.type === 'PlaneGeometry') for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * p.width / tile, uv.getY(i) * p.height / tile);
    else if (geo.type === 'BoxGeometry') { const d = [[p.depth, p.height], [p.depth, p.height], [p.width, p.depth], [p.width, p.depth], [p.width, p.height], [p.width, p.height]]; for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * d[f][0] / tile, uv.getY(i) * d[f][1] / tile); } } return geo; };
  const TILE = new Map([[M.buff, 2], [M.ceil, 2], [M.burl, 0.9], [M.marbleB, 0.9], [M.marbleW, 1.1], [M.cord, 0.25]]);
  const add = (geo, mat, x, y, z, ry = 0, rx = 0, parent = group) => { if (TILE.has(mat) && (geo.type === 'PlaneGeometry' || geo.type === 'BoxGeometry')) metric(geo, TILE.get(mat)); const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); m.receiveShadow = true; if (!mat.transparent && !mat.isMeshBasicMaterial) m.castShadow = true; parent.add(m); return m; };
  const box = (w, h, d, mat, x, y, z, ry = 0, parent) => add(new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z, ry, 0, parent);
  const rbox = (w, h, d, r, mat, x, y, z, ry = 0, parent) => add(new RoundedBoxGeometry(w, h, d, 3, r), mat, x, y + h / 2, z, ry, 0, parent);
  // a wall from (ax, az) to (bx, bz) facing (cx, cz), y0..y1 above the floor
  const wall = (ax, az, bx, bz, y0, y1, mat, cx, cz) => {
    const len = Math.hypot(bx - ax, bz - az), m = add(new THREE.PlaneGeometry(len, y1 - y0), mat, (ax + bx) / 2, F + (y0 + y1) / 2, (az + bz) / 2);
    const nx = -(bz - az) / len, nz = (bx - ax) / len, s = (cx - m.position.x) * nx + (cz - m.position.z) * nz > 0 ? 1 : -1;
    m.rotation.y = Math.atan2(nx * s, nz * s); m.castShadow = false; return m;
  };
  // a room's wall with openings [[t0, t1, sill, head]]: a walnut-burl dado to 0.9 m with a nickel rail, buff above
  const DADO = 0.9;
  const dressed = (ax, az, bx, bz, cx, cz, openings = [], upper = M.buff, dado = true) => {
    const len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len, at = (t) => [ax + ux * t, az + uz * t];
    const nx = -uz, nz = ux, s = (cx - (ax + bx) / 2) * nx + (cz - (az + bz) / 2) * nz > 0 ? 1 : -1, ox = nx * s, oz = nz * s;
    let t0 = 0;
    const seg = (a, b, y0, y1) => { if (b - a < 1e-3 || y1 - y0 < 1e-3) return; const [x0, z0] = at(a), [x1, z1] = at(b);
      if (dado && y0 < DADO) { wall(x0, z0, x1, z1, y0, Math.min(DADO, y1), M.burl, cx, cz); if (y1 > DADO) wall(x0, z0, x1, z1, DADO, y1, upper, cx, cz); }
      else wall(x0, z0, x1, z1, y0, y1, upper, cx, cz);
      if (dado && y0 < DADO && y1 > DADO) { const L2 = b - a, mx = (x0 + x1) / 2 + ox * 0.012, mz = (z0 + z1) / 2 + oz * 0.012; const rail = add(new THREE.BoxGeometry(L2, 0.03, 0.024), M.nickel, mx, F + DADO, mz); rail.rotation.y = Math.atan2(ux, uz) - Math.PI / 2; }
      if (y0 < 0.01) { const mx = (x0 + x1) / 2 + ox * 0.01, mz = (z0 + z1) / 2 + oz * 0.01; const sk = add(new THREE.BoxGeometry(b - a, 0.12, 0.02), M.walnut, mx, F + 0.06, mz); sk.rotation.y = Math.atan2(ux, uz) - Math.PI / 2; } };
    for (const [o0, o1, sill = 0, head = H] of [...openings].sort((p, q) => p[0] - q[0]).concat([[len, len, 0, H]])) {
      seg(t0, o0, 0, H);
      if (o1 > o0 && o0 < len) { if (sill > 0) seg(o0, o1, 0, sill); if (head < H) seg(o0, o1, head, H); }
      t0 = o1;
    }
  };
  const cx = (R.x0 + R.x1) / 2, cz = (R.z0 + R.z1) / 2, bcx = (B.x0 + B.x1) / 2, bcz = (B.z0 + B.z1) / 2;

  // ---- floors and ceilings ----
  { const g = new THREE.PlaneGeometry(R.x1 - B.x1, R.z1 - R.z0), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (R.x1 - B.x1) / 1.1, uv.getY(i) * (R.z1 - R.z0) / 1.1);   // (a 1.1 m repeat)
    add(g, M.carpet, (B.x1 + R.x1) / 2, F + 0.004, cz, 0, -Math.PI / 2); }
  add(new THREE.PlaneGeometry(B.x1 - R.x0, R.z1 - B.z1), std({ map: herringbone(B.x1 - R.x0, R.z1 - B.z1), roughness: 0.38, metalness: 0.02 }), (R.x0 + B.x1) / 2, F + 0.004, (B.z1 + R.z1) / 2, 0, -Math.PI / 2);
  add(new THREE.PlaneGeometry(B.x1 - B.x0, B.z1 - B.z0), M.marbleB, bcx, F + 0.004, bcz, 0, -Math.PI / 2);
  add(new THREE.PlaneGeometry(R.x1 - R.x0, R.z1 - R.z0), M.ceil, cx, F + H, cz, 0, Math.PI / 2).castShadow = false;
  // the cornice: three steps round the room, and a coffer in the bedroom's ceiling with a warm cove and a Deco light
  const around = (x0, x1, z0, z1, fn) => { fn((x0 + x1) / 2, z0 + 0.0001, x1 - x0, 0); fn((x0 + x1) / 2, z1 - 0.0001, x1 - x0, Math.PI); fn(x0 + 0.0001, (z0 + z1) / 2, z1 - z0, Math.PI / 2); fn(x1 - 0.0001, (z0 + z1) / 2, z1 - z0, -Math.PI / 2); };
  around(B.x1, R.x1, R.z0, R.z1, (x, z, L2, ry) => { for (const [d, h, y] of [[0.05, 0.14, H - 0.14], [0.09, 0.06, H - 0.2], [0.13, 0.03, H - 0.23]]) { const m = add(new THREE.BoxGeometry(L2, h, d), M.ceil, x, F + y + h / 2, z, ry); m.translateZ(d / 2); m.castShadow = false; } });
  around(R.x0, B.x1, B.z1, R.z1, (x, z, L2, ry) => { const m = add(new THREE.BoxGeometry(L2, 0.12, 0.06), M.ceil, x, F + H - 0.06, z, ry); m.translateZ(0.03); m.castShadow = false; });
  {
    const k0 = B.x1 + 0.7, k1 = R.x1 - 0.7, q0 = R.z0 + 0.9, q1 = R.z1 - 0.9, cove = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75, 0.58, 0.36) });
    around(k0, k1, q0, q1, (x, z, L2, ry) => { const m = add(new THREE.BoxGeometry(L2, 0.1, 0.12), M.ceil, x, F + H - 0.1, z, ry); m.translateZ(-0.06); m.castShadow = false; });
    for (const [x, z, w, d] of [[(k0 + k1) / 2, q0 + 0.03, k1 - k0, 0.05], [(k0 + k1) / 2, q1 - 0.03, k1 - k0, 0.05], [k0 + 0.03, (q0 + q1) / 2, 0.05, q1 - q0], [k1 - 0.03, (q0 + q1) / 2, 0.05, q1 - q0]]) add(new THREE.BoxGeometry(w, 0.004, d), cove, x, F + H - 0.003, z).castShadow = false;   // the cove's glow
    // the light: a stepped dish of frosted glass in a nickel ring
    const lx = (k0 + k1) / 2, lz = (q0 + q1) / 2;
    add(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 32), M.nickel, lx, F + H - 0.03, lz);
    add(new THREE.CylinderGeometry(0.3, 0.22, 0.08, 32), M.glow, lx, F + H - 0.085, lz);
    add(new THREE.CylinderGeometry(0.16, 0.1, 0.06, 32), M.glow, lx, F + H - 0.15, lz);
    add(new THREE.SphereGeometry(0.03, 12, 8), M.nickel, lx, F + H - 0.19, lz);
    lights.push({ x: lx, y: F + H - 0.4, z: lz, intensity: 5.5, distance: 8, color: new THREE.Color(1.0, 0.82, 0.58) });
  }

  // ---- the walls ----
  dressed(B.x1, R.z0, R.x1, R.z0, cx, cz);                                                                        // north, behind the bed
  dressed(R.x1, R.z1, R.x0, R.z1, cx, cz);                                                                        // south
  dressed(R.x0, R.z1, R.x0, B.z1, cx, cz, [[R.z1 - R.door[1], R.z1 - R.door[0], 0, 2.2]]);                        // the entry's west wall, the door
  dressed(R.x1, R.z0, R.x1, R.z1, cx, cz, R.win.map(([a, b]) => [a - R.z0, b - R.z0, R.sill, R.head]));            // east, the windows
  dressed(B.x1, R.z0, B.x1, B.z1, cx, cz);                                                                        // the bathroom's wall, room side
  dressed(R.x0, B.z1, B.x1, B.z1, (R.x0 + B.x1) / 2, R.z1, [[B.door[0] - R.x0, B.door[1] - R.x0, 0, 2.2]]);       // the bathroom's wall, entry side
  // the entry's door: the leaf is hotelUpper.js's (it swings); a walnut architrave on this side
  for (const z of R.door) box(0.04, 2.28, 0.08, M.walnut, R.x0 + 0.02, F, z + (z === R.door[0] ? -0.04 : 0.04));
  box(0.04, 0.08, R.door[1] - R.door[0] + 0.16, M.walnut, R.x0 + 0.02, F + 2.2, (R.door[0] + R.door[1]) / 2);

  // ---- the windows: deep reveals, steel casements in bronze with a transom, the glass (world/glass.js), a black
  // marble sill; heavy blue-grey drapes tied back with bands and tassels, sheers, a pelmet ----
  const roomBox = { min: [R.x0, F - 0.5, R.z0], max: [R.x1, F + H + 0.5, R.z1] };
  const winGlass = sidedGlass({ name: 'room612-glass', box: roomBox, room: { floor: [0.24, 0.18, 0.11], ceil: [0.42, 0.33, 0.22] } });
  const roomMirror = sidedGlass({ name: 'room612-mirror', box: roomBox, room: { floor: [0.24, 0.18, 0.11], ceil: [0.42, 0.33, 0.22] }, mirror: true, tint: [0.93, 0.92, 0.88] });
  const drape = new THREE.MeshPhysicalMaterial({ color: 0x55636e, roughness: 0.9, sheen: 0.7, sheenColor: new THREE.Color(0x98a6b2), side: THREE.DoubleSide });
  for (const [a, b] of R.win) {
    const zc = (a + b) / 2, w = b - a, gx = R.gx, d = R.x1 - gx;
    wall(R.x1, a, gx, a, R.sill, R.head, M.buff, R.x1 - 1, zc); wall(R.x1, b, gx, b, R.sill, R.head, M.buff, R.x1 - 1, zc);
    add(new THREE.PlaneGeometry(d, w), M.buff, (R.x1 + gx) / 2, F + R.head, zc, 0, Math.PI / 2).castShadow = false;
    box(d + 0.1, 0.04, w + 0.06, M.marbleB, (R.x1 + gx) / 2 - 0.05, F + R.sill - 0.04, zc);
    add(new THREE.PlaneGeometry(w, R.head - R.sill), winGlass, gx, F + (R.sill + R.head) / 2, zc, -Math.PI / 2).renderOrder = 3;
    const fx = gx - 0.03;
    for (const dz of [-w / 2 + 0.03, 0, w / 2 - 0.03]) box(0.05, R.head - R.sill, dz === 0 ? 0.035 : 0.06, M.bronze, fx, F + R.sill, zc + dz);
    for (const y of [R.sill + 0.03, R.head - 0.6, R.head - 0.03]) box(0.05, y === R.head - 0.6 ? 0.04 : 0.06, w, M.bronze, fx, F + y - 0.03, zc);
    for (const dz of [-w / 4, w / 4]) box(0.03, 0.02, 0.012, M.nickel, fx - 0.03, F + 1.3, zc + dz);   // the catches
    // drapes: hanging in folds from the pelmet, gathered by a band a metre up and falling loose below; a tassel
    for (const s of [-1, 1]) {
      const outer = zc + s * (w / 2 + 0.42), m = add(curtain(0.62, H - 0.3, s), drape, R.x1 - 0.16, F, outer); m.castShadow = true;
      box(0.07, 0.05, 0.16, M.gilt, R.x1 - 0.14, F + 0.95, outer - s * 0.12);
      add(new THREE.ConeGeometry(0.035, 0.16, 10), M.gilt, R.x1 - 0.08, F + 0.82, outer - s * 0.12);
    }
    { const sh = add(sheer(w * 0.5, R.head - R.sill - 0.05), M.sheer, R.x1 - 0.05, F + R.sill + 0.02, a + 0.04); sh.castShadow = false; }   // the sheer, drawn half across, inside the reveal
    box(0.2, 0.32, w + 0.95, M.blueGrey, R.x1 - 0.12, F + H - 0.6, zc); box(0.205, 0.025, w + 0.96, M.gilt, R.x1 - 0.12, F + H - 0.62, zc);   // the pelmet, a gilt edge
  }

  // ---- the bed: 2 m, a tall channel-stitched leather headboard in a walnut-burl frame, white linen with a blue-grey
  // runner, a bench at its foot; walnut-burl nightstands with the two pink glass lamps ----
  {
    const bx = R.bed.x, bz = R.z0;
    rbox(2.0, 0.34, 2.1, 0.03, M.walnut, bx, F + 0.04, bz + 1.17);                                                          // the base
    for (const sx of [-0.92, 0.92]) for (const sz of [0.2, 2.12]) box(0.06, 0.06, 0.06, M.nickel, bx + sx, F, bz + sz);   // its feet
    rbox(1.98, 0.27, 2.04, 0.08, M.linen, bx, F + 0.37, bz + 1.16);                                                          // the mattress
    rbox(2.06, 0.08, 1.5, 0.04, M.linen, bx, F + 0.62, bz + 1.4);                                                            // the duvet, folded down
    box(2.12, 0.03, 0.48, M.blueGrey, bx, F + 0.69, bz + 1.72);                                                              // the runner
    for (const dx of [-0.5, 0.5]) { rbox(0.74, 0.2, 0.42, 0.09, M.linen, bx + dx, F + 0.62, bz + 0.38).rotation.x = -0.25; rbox(0.66, 0.16, 0.34, 0.07, M.linen, bx + dx, F + 0.68, bz + 0.6).rotation.x = -0.4; }
    rbox(0.5, 0.18, 0.18, 0.06, M.blueGrey, bx, F + 0.72, bz + 0.72).rotation.x = -0.3;                                      // a bolster
    // the headboard: eleven leather channels in a burl frame, a nickel line round it
    const hw = 2.4, hb = F + 0.32, ht = 1.32, n = 11, cw = (hw - 0.2) / n;
    box(hw + 0.12, ht + 0.12, 0.06, M.burl, bx, hb - 0.06, bz + 0.035);
    for (let i = 0; i < n; i++) rbox(cw - 0.012, ht - 0.12, 0.09, 0.035, M.leather, bx - (hw - 0.2) / 2 + cw * (i + 0.5), hb + 0.0, bz + 0.1);
    for (const y of [hb - 0.06, hb + ht + 0.05]) box(hw + 0.14, 0.012, 0.012, M.nickel, bx, y, bz + 0.07);
    // the bench
    rbox(1.5, 0.12, 0.42, 0.04, M.blueGrey, bx, F + 0.36, bz + 2.43);
    for (const sx of [-0.68, 0.68]) for (const sz of [-0.16, 0.16]) box(0.04, 0.36, 0.04, M.walnut, bx + sx, F, bz + 2.43 + sz);
    // nightstands, lamps, a carafe and a glass, slippers on a mat
    for (const [nx, side] of [[-39.07, -1], [-35.93, 1]]) {
      rbox(0.58, 0.58, 0.5, 0.015, M.burl, nx, F + 0.04, bz + 0.3); box(0.6, 0.02, 0.52, M.walnut, nx, F + 0.62, bz + 0.3);
      for (const y of [0.22, 0.42]) box(0.18, 0.012, 0.012, M.nickel, nx, F + y, bz + 0.555);                                // the drawer pulls
      box(0.5, 0.04, 0.42, M.walnut, nx, F, bz + 0.3);
      // the lamp: a baluster of pink glass on a nickel foot, a pleated pale-yellow shade
      const base = new THREE.LatheGeometry([[0, 0], [0.075, 0], [0.08, 0.03], [0.06, 0.08], [0.1, 0.18], [0.11, 0.26], [0.08, 0.34], [0.03, 0.4], [0.025, 0.46], [0, 0.46]].map(([r2, y]) => new THREE.Vector2(r2, y)), 28);
      add(new THREE.CylinderGeometry(0.085, 0.09, 0.02, 24), M.nickel, nx, F + 0.64, bz + 0.26);
      add(base, M.pinkGlass, nx, F + 0.65, bz + 0.26);
      add(new THREE.CylinderGeometry(0.13, 0.19, 0.24, 28, 1, true), M.shade, nx, F + 1.23, bz + 0.26);
      add(new THREE.SphereGeometry(0.06, 12, 8), M.glow, nx, F + 1.16, bz + 0.26);
      lights.push({ x: nx, y: F + 1.2, z: bz + 0.45, intensity: 2.6, distance: 4.5, color: new THREE.Color(1.0, 0.78, 0.5) });
      if (side > 0) { add(new THREE.CylinderGeometry(0.04, 0.05, 0.2, 16), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, roughness: 0.05 }), nx - 0.18, F + 0.74, bz + 0.38);
        add(new THREE.CylinderGeometry(0.03, 0.028, 0.09, 14), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, roughness: 0.05 }), nx - 0.08, F + 0.68, bz + 0.42); }
      else { box(0.15, 0.03, 0.22, std({ color: 0x2c3a52, roughness: 0.7 }), nx + 0.12, F + 0.64, bz + 0.36); }                   // a book
    }
    for (const dx of [-0.08, 0.08]) rbox(0.1, 0.03, 0.27, 0.02, M.linen, bx - 1.25 + dx, F, bz + 1.6);                      // slippers
  }

  // ---- the desk between the windows: solid walnut, a leather-topped writing surface, a nickel lamp, stationery; the
  // chair with its dark-red velvet back; a mirror in a gilt frame over it ----
  {
    const dz = R.desk.z, dx = R.x1 - 0.32;
    rbox(0.62, 0.04, 1.3, 0.008, M.walnut, dx, F + 0.72, dz);
    for (const sz of [-0.6, 0.6]) box(0.56, 0.72, 0.05, M.walnut, dx, F, dz + sz);
    box(0.5, 0.12, 0.6, M.burl, dx + 0.02, F + 0.6, dz);                                                                    // the drawer
    box(0.4, 0.004, 0.58, std({ color: 0x1f3a2c, roughness: 0.6 }), dx - 0.05, F + 0.76, dz);                                // the leather blotter
    box(0.16, 0.004, 0.22, std({ color: 0xf3ede0, roughness: 0.9 }), dx - 0.06, F + 0.764, dz - 0.1);                       // notepaper
    add(new THREE.CylinderGeometry(0.006, 0.006, 0.14, 8), M.gilt, dx - 0.1, F + 0.772, dz + 0.12, 0, Math.PI / 2);         // a pen
    add(new THREE.CylinderGeometry(0.07, 0.08, 0.02, 20), M.nickel, dx + 0.1, F + 0.77, dz + 0.45);
    add(new THREE.CylinderGeometry(0.008, 0.008, 0.38, 8), M.nickel, dx + 0.1, F + 0.97, dz + 0.45);
    add(new THREE.CylinderGeometry(0.09, 0.14, 0.17, 24, 1, true), M.shade, dx + 0.1, F + 1.22, dz + 0.45);
    // the chair, facing the desk (east)
    const ch = new THREE.Group(); ch.position.set(dx - 0.62, F, dz); ch.rotation.y = Math.PI / 2; group.add(ch);
    rbox(0.48, 0.07, 0.46, 0.02, M.velvet, 0, 0.44, 0, 0, ch);
    rbox(0.46, 0.5, 0.06, 0.03, M.velvet, 0, 0.52, -0.22, 0, ch).rotation.x = 0.08;
    box(0.5, 0.04, 0.48, M.walnut, 0, 0.4, 0, 0, ch);
    for (const sx of [-0.21, 0.21]) for (const sz of [-0.2, 0.2]) box(0.04, 0.4, 0.04, M.walnut, sx, 0, sz, 0, ch);
    for (const sx of [-0.21, 0.21]) box(0.04, 0.6, 0.04, M.walnut, sx, 0.42, -0.23, 0, ch);
    // the mirror over it, in a gilt frame (it gives back the room: world/glass.js)
    box(0.04, 0.95, 0.75, M.gilt, R.x1 - 0.02, F + 1.35, dz);
    add(new THREE.PlaneGeometry(0.66, 0.86), roomMirror, R.x1 - 0.042, F + 1.825, dz, -Math.PI / 2).renderOrder = 2;
  }

  // ---- the sitting corner: the brown corduroy sofa against the south wall, a coffee table with fruit and the letter,
  // the television's cabinet beside the sofa (its doors closed: the set pulls out), a floor lamp ----
  {
    const sx = R.sofa.x, sz = R.z1 - 0.44;
    rbox(1.9, 0.26, 0.86, 0.06, M.cord, sx, F + 0.12, sz);                                                                  // the plinth
    for (const dx of [-0.43, 0.43]) rbox(0.84, 0.16, 0.66, 0.07, M.cord, sx + dx, F + 0.38, sz - 0.08);                     // seat cushions
    for (const dx of [-0.43, 0.43]) rbox(0.84, 0.46, 0.2, 0.08, M.cord, sx + dx, F + 0.46, sz + 0.3).rotation.x = -0.1;      // back cushions
    for (const s of [-1, 1]) rbox(0.16, 0.42, 0.86, 0.07, M.cord, sx + s * 0.95, F + 0.12, sz);                             // the arms
    for (const s of [-1, 1]) for (const dz of [-0.36, 0.36]) box(0.05, 0.12, 0.05, M.walnut, sx + s * 0.88, F, sz + dz);
    rbox(0.42, 0.36, 0.14, 0.06, M.blueGrey, sx - 0.55, F + 0.52, sz + 0.12).rotation.set(-0.2, 0.15, 0.1);                   // a cushion
    // the coffee table: an oval of walnut burl on a nickel pedestal
    const tz = -227.0, top = new THREE.CylinderGeometry(0.5, 0.5, 0.035, 40); top.scale(1, 1, 0.56);
    add(top, M.burl, sx, F + 0.42, tz);
    add(new THREE.CylinderGeometry(0.05, 0.12, 0.4, 16), M.nickel, sx, F + 0.2, tz);
    { const foot = new THREE.CylinderGeometry(0.28, 0.3, 0.02, 32); foot.scale(1, 1, 0.6); add(foot, M.nickel, sx, F + 0.01, tz); }
    // fruit in a nickel bowl, the welcome letter beside it
    add(new THREE.SphereGeometry(0.16, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), std({ color: 0xd9d8d2, roughness: 0.15, metalness: 1, side: THREE.DoubleSide }), sx - 0.12, F + 0.6, tz);
    const fruit = [[0xb8262a, 0.045], [0xe08a22, 0.05], [0xd4c040, 0.043], [0xb8262a, 0.045], [0x6a8a2a, 0.04]];
    fruit.forEach(([c, r2], i) => { const a = i / fruit.length * 6.283; add(new THREE.SphereGeometry(r2, 14, 10), std({ color: c, roughness: 0.45 }), sx - 0.12 + Math.cos(a) * 0.07, F + 0.5 + (i === 4 ? 0.05 : 0), tz + Math.sin(a) * 0.07); });
    for (let i = 0; i < 9; i++) add(new THREE.SphereGeometry(0.014, 8, 6), std({ color: 0x4a2a4a, roughness: 0.3 }), sx - 0.06 + (i % 3) * 0.022, F + 0.52 + Math.floor(i / 3) * 0.02, tz + 0.05);
    add(new THREE.PlaneGeometry(0.21, 0.15), std({ map: letterTex(), roughness: 0.85 }), sx + 0.22, F + 0.442, tz + 0.02, 0.25, -Math.PI / 2);
    // the television's cabinet: walnut burl, nickel pulls, a blue-and-white vase on it
    const tx = -36.3;
    rbox(1.1, 0.86, 0.54, 0.012, M.burl, tx, F + 0.04, R.z1 - 0.29); box(1.12, 0.02, 0.56, M.walnut, tx, F + 0.9, R.z1 - 0.29); box(1.0, 0.04, 0.46, M.walnut, tx, F, R.z1 - 0.29);
    box(0.004, 0.76, 0.004, M.walnut, tx, F + 0.08, R.z1 - 0.56);
    for (const dx of [-0.05, 0.05]) box(0.012, 0.2, 0.012, M.nickel, tx + dx, F + 0.42, R.z1 - 0.565);
    const vase = new THREE.LatheGeometry([[0, 0], [0.07, 0], [0.09, 0.04], [0.14, 0.14], [0.15, 0.22], [0.12, 0.32], [0.06, 0.4], [0.05, 0.46], [0.07, 0.5], [0.065, 0.5], [0.045, 0.46], [0, 0.46]].map(([r2, y]) => new THREE.Vector2(r2, y)), 32);
    add(vase, M.porcelain, tx + 0.25, F + 0.92, R.z1 - 0.3);
    add(new THREE.BoxGeometry(0.16, 0.012, 0.05), M.black, tx - 0.3, F + 0.926, R.z1 - 0.3);                               // the remote
    // the floor lamp at the sofa's end
    add(new THREE.CylinderGeometry(0.16, 0.18, 0.02, 24), M.nickel, sx - 1.28, F + 0.01, R.z1 - 0.35);
    add(new THREE.CylinderGeometry(0.012, 0.012, 1.45, 8), M.nickel, sx - 1.28, F + 0.74, R.z1 - 0.35);
    add(new THREE.CylinderGeometry(0.2, 0.24, 0.3, 28, 1, true), M.shade, sx - 1.28, F + 1.52, R.z1 - 0.35);
    add(new THREE.SphereGeometry(0.06, 10, 8), M.glow, sx - 1.28, F + 1.45, R.z1 - 0.35);
    lights.push({ x: sx - 1.28, y: F + 1.45, z: R.z1 - 0.5, intensity: 2.4, distance: 4.5, color: new THREE.Color(1.0, 0.78, 0.5) });
    // an oil painting over the sofa: the Bund from the river
    box(1.24, 0.94, 0.05, M.gilt, sx, F + 1.25, R.z1 - 0.03);
    add(new THREE.PlaneGeometry(1.1, 0.8), std({ map: painting('bund'), roughness: 0.75, emissive: 0x100c08 }), sx, F + 1.72, R.z1 - 0.058, Math.PI);
  }
  // a still life on the bathroom wall over the bed's west side
  box(0.05, 0.8, 1.0, M.gilt, B.x1 + 0.03, F + 1.3, -231.6);
  add(new THREE.PlaneGeometry(0.88, 0.68), std({ map: painting('peony'), roughness: 0.75, emissive: 0x100c08 }), B.x1 + 0.058, F + 1.7, -231.6, Math.PI / 2);

  // ---- the entry: the wardrobe (walnut burl, nickel pulls, a cornice), the minibar with the coffee things on black
  // marble, a ginger jar; a mirror over the minibar ----
  {
    rbox(1.62, 2.36, 0.6, 0.012, M.burl, -42.18, F + 0.04, R.z1 - 0.31); box(1.68, 0.06, 0.64, M.walnut, -42.18, F + 2.4, R.z1 - 0.31);
    box(0.004, 2.2, 0.004, M.walnut, -42.18, F + 0.12, R.z1 - 0.613);
    for (const dx of [-0.06, 0.06]) box(0.014, 0.42, 0.014, M.nickel, -42.18 + dx, F + 0.95, R.z1 - 0.62);
    const mx = -40.55;
    rbox(1.38, 0.86, 0.54, 0.012, M.burl, mx, F + 0.04, R.z1 - 0.29); box(1.42, 0.035, 0.57, M.marbleB, mx, F + 0.9, R.z1 - 0.3);
    for (const dx of [-0.35, 0.35]) box(0.16, 0.012, 0.012, M.nickel, mx + dx, F + 0.7, R.z1 - 0.565);
    // the coffee machine, the kettle, two cups, the tea caddy, glasses on a tray
    rbox(0.16, 0.26, 0.28, 0.02, M.black, mx - 0.45, F + 0.935, R.z1 - 0.3); box(0.17, 0.02, 0.29, M.nickel, mx - 0.45, F + 1.18, R.z1 - 0.3);
    add(new THREE.CylinderGeometry(0.075, 0.09, 0.2, 20), M.nickel, mx - 0.18, F + 1.035, R.z1 - 0.3);
    for (const dx of [0.05, 0.17]) { add(new THREE.CylinderGeometry(0.06, 0.06, 0.008, 18), M.ceramic, mx + dx, F + 0.94, R.z1 - 0.38); add(new THREE.CylinderGeometry(0.038, 0.03, 0.06, 18, 1, true), M.ceramic, mx + dx, F + 0.975, R.z1 - 0.38); }
    add(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 18), std({ color: 0x8a1f24, roughness: 0.4, metalness: 0.4 }), mx + 0.12, F + 0.995, R.z1 - 0.2);
    box(0.36, 0.015, 0.22, M.walnut, mx + 0.45, F + 0.935, R.z1 - 0.3);
    for (const dx of [0.36, 0.45, 0.54]) add(new THREE.CylinderGeometry(0.03, 0.026, 0.1, 14), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, roughness: 0.05 }), mx + dx, F + 1.0, R.z1 - 0.3);
    const jar = new THREE.LatheGeometry([[0, 0], [0.06, 0], [0.1, 0.05], [0.11, 0.12], [0.08, 0.2], [0.05, 0.22], [0.05, 0.25], [0.03, 0.27], [0, 0.27]].map(([r2, y]) => new THREE.Vector2(r2, y)), 28);
    add(jar, M.porcelain, mx + 0.62, F + 0.92, R.z1 - 0.45);
    box(0.9, 0.9, 0.04, M.gilt, mx, F + 1.25, R.z1 - 0.02);
    add(new THREE.PlaneGeometry(0.8, 0.8), roomMirror, mx, F + 1.7, R.z1 - 0.042, Math.PI).renderOrder = 2;
  }

  // ---- the bathroom: white marble walls, black marble floor; the double vanity with its mirror, the free-standing
  // tub on four legs in the middle with its filler, the glass rain shower, the WC in its own room, the television in
  // the marble, robes and towels; its door stands open ----
  const bathBox = { min: [B.x0, F - 0.5, B.z0], max: [B.x1, F + H + 0.5, B.z1] };
  const bathRoom = { floor: [0.3, 0.29, 0.28], ceil: [0.6, 0.58, 0.55] };
  const mirrorMat = sidedGlass({ name: 'bath-mirror', box: bathBox, room: bathRoom, mirror: true, tint: [0.95, 0.96, 0.97] });
  const showerGlass = sidedGlass({ name: 'shower-glass', box: bathBox, room: bathRoom, between: true, f0: 0.09 });
  {
    for (const [ax, az, bx2, bz2] of [[B.x0, B.z0, B.x1, B.z0], [B.x1, B.z0, B.x1, B.z1], [B.x0, B.z1, B.x0, B.z0]]) wall(ax, az, bx2, bz2, 0, H, M.marbleW, bcx, bcz);
    // its south wall (the door) from inside
    { const d0 = B.door[0] - B.x0, d1 = B.door[1] - B.x0;
      wall(B.x0, B.z1, B.x0 + d0, B.z1, 0, H, M.marbleW, bcx, bcz); wall(B.x0 + d1, B.z1, B.x1, B.z1, 0, H, M.marbleW, bcx, bcz); wall(B.x0 + d0, B.z1, B.x0 + d1, B.z1, 2.2, H, M.marbleW, bcx, bcz); }
    // the doorway's reveals and the leaf, open against the wall
    for (const x of B.door) wall(x, B.z1 - 0.06, x, B.z1 + 0.06, 0, 2.2, M.walnut, (B.door[0] + B.door[1]) / 2, B.z1);
    { const leaf = box(0.04, 2.15, B.door[1] - B.door[0] - 0.02, M.walnut, B.door[1] - 0.03, F, B.z1 - (B.door[1] - B.door[0]) / 2 - 0.04);
      leaf.position.x = B.door[1] - 0.04; add(new THREE.SphereGeometry(0.025, 10, 8), M.nickel, B.door[1] - 0.08, F + 1.0, B.z1 - (B.door[1] - B.door[0]) + 0.1); }
    add(new THREE.PlaneGeometry(B.x1 - B.x0, B.z1 - B.z0), std({ color: 0xf4f1ea, roughness: 0.9, emissive: 0x2a2620 }), bcx, F + H - 0.3, bcz, 0, Math.PI / 2).castShadow = false;
    for (const [lx, lz] of [[-41.9, -232.2], [-40.6, -232.2], [-41.5, -230.0]]) { add(new THREE.CircleGeometry(0.06, 16), M.glow, lx, F + H - 0.302, lz, 0, Math.PI / 2); }
    lights.push({ x: bcx, y: F + H - 0.5, z: bcz, intensity: 4.5, distance: 6, color: new THREE.Color(1.0, 0.86, 0.68) });
    // the vanity: walnut burl under a black marble top, two basins, nickel taps
    const vx = -41.8, vz = B.z0 + 0.28;
    rbox(2.1, 0.78, 0.52, 0.012, M.burl, vx, F + 0.04, vz); box(2.14, 0.04, 0.58, M.marbleB, vx, F + 0.82, vz + 0.01); box(1.9, 0.04, 0.44, M.walnut, vx, F, vz);
    for (const dx of [-0.5, 0.5]) {
      add(new THREE.CircleGeometry(0.19, 28), M.basin, vx + dx, F + 0.8615, vz + 0.04, 0, -Math.PI / 2).scale.set(1, 0.7, 1);   // the basin, under the counter
      add(new THREE.CircleGeometry(0.018, 12), M.nickel, vx + dx, F + 0.862, vz + 0.04, 0, -Math.PI / 2);
      add(new THREE.CylinderGeometry(0.016, 0.02, 0.22, 12), M.nickel, vx + dx, F + 0.97, vz - 0.17);
      add(new THREE.CylinderGeometry(0.01, 0.01, 0.14, 10), M.nickel, vx + dx, F + 1.07, vz - 0.11, 0, Math.PI / 2);
      for (const s of [-0.09, 0.09]) add(new THREE.CylinderGeometry(0.018, 0.018, 0.04, 10), M.nickel, vx + dx + s, F + 0.88, vz - 0.17);
    }
    // the mirror (world/glass.js: it gives back the bathroom), in a nickel frame, a light bar over it
    add(new THREE.PlaneGeometry(1.96, 0.98), mirrorMat, vx, F + 1.62, B.z0 + 0.012).renderOrder = 2;
    for (const [w, h, ox, oy] of [[2.02, 0.03, 0, 0.505], [2.02, 0.03, 0, -0.505], [0.03, 1.04, -0.995, 0], [0.03, 1.04, 0.995, 0]]) box(w, h, 0.02, M.nickel, vx + ox, F + 1.62 + oy - h / 2, B.z0 + 0.01);
    box(1.4, 0.05, 0.08, M.nickel, vx, F + 2.2, B.z0 + 0.04); add(new THREE.PlaneGeometry(1.36, 0.03), M.glow, vx, F + 2.2, B.z0 + 0.081);
    // towels: a stack under the counter, one on a ring by the basin
    for (let i = 0; i < 3; i++) rbox(0.36, 0.07, 0.26, 0.03, M.linen, vx - 0.75, F + 0.1 + i * 0.075, vz + 0.02);
    // the tub: an oval roll-top bath on four claw feet, its filler standing at the foot
    const tb = new THREE.Group(); tb.position.set(R.tub.x, F, R.tub.z); group.add(tb);
    const prof = [[0.001, 0.13], [0.27, 0.13], [0.33, 0.2], [0.37, 0.4], [0.39, 0.58], [0.4, 0.62], [0.385, 0.645], [0.36, 0.635], [0.345, 0.58], [0.31, 0.32], [0.24, 0.2], [0.001, 0.19]].map(([r2, y]) => new THREE.Vector2(r2, y));
    const tg = new THREE.LatheGeometry(prof, 48); tg.scale(2.15, 1, 1); tg.computeVertexNormals();
    add(tg, M.tub, 0, 0, 0, 0, 0, tb);
    for (const sx of [-0.62, 0.62]) for (const sz of [-0.2, 0.2]) {
      const leg = add(new THREE.CylinderGeometry(0.035, 0.022, 0.16, 10), M.nickel, sx, 0.08, sz, 0, 0, tb); leg.rotation.z = sx > 0 ? -0.25 : 0.25;
      add(new THREE.SphereGeometry(0.032, 10, 8), M.nickel, sx * 1.04, 0.02, sz * 1.04, 0, 0, tb);
    }
    const fx = R.tub.x + 1.02;
    add(new THREE.CylinderGeometry(0.05, 0.06, 0.03, 16), M.nickel, fx, F + 0.015, R.tub.z);
    add(new THREE.CylinderGeometry(0.018, 0.018, 0.9, 12), M.nickel, fx, F + 0.47, R.tub.z);
    { const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(fx, F + 0.92, R.tub.z), new THREE.Vector3(fx, F + 1.08, R.tub.z), new THREE.Vector3(fx - 0.2, F + 0.98, R.tub.z));
      add(new THREE.TubeGeometry(curve, 16, 0.014, 8, false), M.nickel, 0, 0, 0); }
    add(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 10), M.nickel, fx + 0.03, F + 0.75, R.tub.z + 0.06);   // the hand shower
    // the shower: glass on two sides, a rain head on an arm, a mixer
    add(new THREE.PlaneGeometry(B.z0 + 1.15 - B.z0, 2.1), showerGlass, -40.65, F + 1.08, B.z0 + 0.575, Math.PI / 2).renderOrder = 3;
    add(new THREE.PlaneGeometry(0.5, 2.1), showerGlass, -40.4, F + 1.08, B.z0 + 1.15).renderOrder = 3;
    box(0.02, 2.1, 0.02, M.nickel, -40.65, F + 0.03, B.z0 + 1.15); box(0.52, 0.02, 0.02, M.nickel, -40.39, F + 2.12, B.z0 + 1.15);
    add(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 28), M.nickel, -40.1, F + 2.35, B.z0 + 0.5);
    box(0.02, 0.02, 0.4, M.nickel, -40.1, F + 2.37, B.z0 + 0.22);
    add(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 16), M.nickel, -39.62, F + 1.15, B.z0 + 0.6, 0, 0).rotation.z = Math.PI / 2;
    add(new THREE.PlaneGeometry(0.9, 1.0), M.marbleB, -40.12, F + 0.006, B.z0 + 0.57, 0, -Math.PI / 2);
    // the WC's own room: marble partitions and a walnut door, shut
    const W2 = R.wc;
    wall(W2.x1, W2.z0, W2.x1, W2.z1, 0, 2.3, M.marbleW, bcx, bcz); wall(W2.x0, W2.z0, W2.x1, W2.z0, 0, 2.3, M.marbleW, bcx, bcz);
    box(0.1, 0.05, W2.z1 - W2.z0, M.marbleW, W2.x1, F + 2.3, (W2.z0 + W2.z1) / 2); box(W2.x1 - W2.x0, 0.05, 0.1, M.marbleW, (W2.x0 + W2.x1) / 2, F + 2.3, W2.z0);
    box(0.04, 2.05, 0.72, M.walnut, W2.x1 + 0.02, F, (W2.z0 + W2.z1) / 2); add(new THREE.SphereGeometry(0.022, 10, 8), M.nickel, W2.x1 + 0.05, F + 1.0, (W2.z0 + W2.z1) / 2 - 0.27);
    // the television in the marble wall by the tub
    box(0.62, 0.38, 0.02, M.black, B.x1 - 0.025, F + 1.35, -230.4, Math.PI / 2);
    // a robe on its hook by the door, slippers below
    box(0.04, 0.04, 0.04, M.nickel, B.x1 - 0.03, F + 1.75, B.z1 - 0.32);
    { const robe = new THREE.LatheGeometry([[0.001, 0], [0.2, 0.02], [0.22, 0.5], [0.17, 1.0], [0.1, 1.15], [0.001, 1.18]].map(([r2, y]) => new THREE.Vector2(r2, y)), 16); robe.scale(1, 1, 0.45);
      add(robe, M.linen, B.x1 - 0.14, F + 0.55, B.z1 - 0.32); }
    for (const dz of [-0.08, 0.08]) rbox(0.1, 0.03, 0.27, 0.02, M.linen, B.x1 - 0.3, F, B.z1 - 0.62 + dz);
  }

  // the glass and its probes: the room from the middle of the bedroom (for the windows), the bathroom from over the
  // tub (for the mirror and the shower's glass)
  const probes = [
    { box: roomBox, p: createRoomProbe([winGlass, roomMirror], [-37.6, F + 1.55, -229.0]), wait: 0.5 },
    { box: roomBox, p: createRoomProbe([mirrorMat, showerGlass], [R.tub.x, F + 1.6, R.tub.z - 0.6]), wait: 0.8 },   // (taken from anywhere in the room: the mirror shows through the door)
  ];
  return { probes, roomBox, bathBox };
}
