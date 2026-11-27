// Zhongshan Road's markings beyond the plain lane lines, as on photographs of 27 November 2026: lane arrows on
// the approaches to the Hankou Road crossing, the diamond that warns of a crosswalk ahead, hatched guide
// areas (导流线) where the kerb lane tapers away after the crossing, yellow bus-stop boxes (公交车站) on the river side, and a yellow no-stopping grid. All of it
// worn: chipped where the tyres run, scuffed at the edges. One mesh, one atlas, one draw call.
import * as THREE from 'three';
import { L, crossing } from './layout.js';
import { makeCanvas, tex, rng, FONT } from './canvas.js';

const Y = 0.0135;                                    // a hair over the lane paint
const WHITE = new THREE.Color(0xdcdad2), YELLOW = new THREE.Color(0xc99a22);
// atlas: 4 x 2 cells of 256 x 512 px; each is drawn "far end up", as a driver sees it coming
const CELL = { straight: 0, straightRight: 1, left: 2, bus: 4, diamond: 5, solid: 7 };

function atlas() {
  const W = 256, H = 512, [c, ctx] = makeCanvas(W * 4, H * 2), r = rng(311);
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff';
  const at = (i, fn) => { ctx.save(); ctx.translate((i % 4) * W, Math.floor(i / 4) * H); fn(); ctx.restore(); };
  // an arrow: shaft from the bottom, a head at the top; bend = -1 left, 1 right, 0 none; keep: also straight on
  const arrow = (bend, keep) => {
    const sx = W / 2 - (bend ? bend * 34 : 0), sw = 30;
    if (!bend || keep) {
      ctx.fillRect(sx - sw / 2, 150, sw, 352);
      ctx.beginPath(); ctx.moveTo(sx, 8); ctx.lineTo(sx + 58, 160); ctx.lineTo(sx - 58, 160); ctx.closePath(); ctx.fill();
    }
    if (bend) {
      if (!keep) ctx.fillRect(sx - sw / 2, 260, sw, 242);
      // a branch leaving the shaft, turning toward the side, its head pointing out
      ctx.lineWidth = sw; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(sx, keep ? 380 : 275); ctx.quadraticCurveTo(sx, keep ? 280 : 200, sx + bend * 60, keep ? 270 : 190); ctx.stroke();
      const hx = sx + bend * 60, hy = keep ? 270 : 190;
      ctx.beginPath(); ctx.moveTo(hx + bend * 76, hy); ctx.lineTo(hx, hy - 56); ctx.lineTo(hx, hy + 56); ctx.closePath(); ctx.fill();
    }
  };
  at(CELL.straight, () => arrow(0));
  at(CELL.straightRight, () => arrow(1, true));
  at(CELL.left, () => arrow(-1, false));
  // painted words: tall, narrow characters stacked along the lane, the first one nearest the driver
  const words = (txt) => {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `700 120px ${FONT.sans}`;
    const n = txt.length, step = H / n;
    for (let k = 0; k < n; k++) { ctx.save(); ctx.translate(W / 2, H - step * (k + 0.5)); ctx.scale(1.55, step / 120 * 0.92); ctx.fillText(txt[k], 0, 6); ctx.restore(); }
  };
  at(CELL.bus, () => words('公交车站'));
  at(CELL.diamond, () => { ctx.lineWidth = 22; ctx.beginPath(); ctx.moveTo(W / 2, 14); ctx.lineTo(W - 24, H / 2); ctx.lineTo(W / 2, H - 14); ctx.lineTo(24, H / 2); ctx.closePath(); ctx.stroke(); });
  at(CELL.solid, () => ctx.fillRect(0, 0, W, H));
  // wear: chips and pits knocked out of the paint (alpha), heavier toward the middle of each cell where the
  // wheels run, and dirt worked into what is left
  const img = ctx.getImageData(0, 0, W * 4, H * 2), d = img.data;
  for (let i = 0; i < 2600; i++) {
    const x = r() * W * 4, y = r() * H * 2, rad = 1 + r() * r() * 9;
    for (let yy = Math.max(0, y - rad | 0); yy < Math.min(H * 2, y + rad + 1); yy++) for (let xx = Math.max(0, x - rad | 0); xx < Math.min(W * 4, x + rad + 1); xx++) {
      if ((xx - x) ** 2 + (yy - y) ** 2 > rad * rad * (0.6 + 0.4 * r())) continue;
      d[(yy * W * 4 + xx) * 4 + 3] = 0;
    }
  }
  for (let i = 0; i < W * 4 * H * 2; i++) { const v = 205 + r() * 50; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; }
  ctx.putImageData(img, 0, 0);
  const t = tex(c, { repeat: false });
  return t;
}

export function createRoadMarkings() {
  const pos = [], uv = [], col = [];
  const cellUV = (i) => { const u0 = (i % 4) / 4, v1 = 1 - Math.floor(i / 4) / 2; return [u0 + 0.004, v1 - 0.5 + 0.002, u0 + 0.25 - 0.004, v1 - 0.002]; };
  // a marking centred at (x, z), w across and len along the lane, read by a driver heading dir (+1 = +z)
  function mark(cell, x, z, w, len, dir, color = WHITE) {
    const [u0, v0, u1, v1] = cellUV(cell), rx = -dir, h = dir;   // the driver's right is -x when heading +z
    const corner = (s, f) => [x + rx * s * w / 2, z + h * f * len / 2];
    const FL = corner(-1, 1), FR = corner(1, 1), NR = corner(1, -1), NL = corner(-1, -1);
    const P = [[NL, u0, v0], [NR, u1, v0], [FR, u1, v1], [NL, u0, v0], [FR, u1, v1], [FL, u0, v1]];
    // keep the winding facing up
    const up = (FR[0] - NL[0]) * (NR[1] - NL[1]) - (FR[1] - NL[1]) * (NR[0] - NL[0]) > 0;
    const order = up ? P : [P[0], P[2], P[1], P[3], P[5], P[4]];
    for (const [[px, pz], u, v] of order) { pos.push(px, Y, pz); uv.push(u, v); col.push(color.r, color.g, color.b); }
  }
  // a painted line from a to b (x, z), w wide, from the solid cell (still chipped)
  function line(ax, az, bx, bz, w, color = WHITE) {
    const len = Math.hypot(bx - ax, bz - az); if (len < 0.01) return;
    const dx = (bx - ax) / len, dz = (bz - az) / len, nx = -dz * w / 2, nz = dx * w / 2;
    const [u0, v0, u1, v1] = cellUV(CELL.solid), k = Math.min(1, len / 6), vv = v0 + (v1 - v0) * k;
    const A = [ax + nx, az + nz], Bq = [bx + nx, bz + nz], C = [bx - nx, bz - nz], D = [ax - nx, az - nz];
    const P = [[D, u0, v0], [C, u0, vv], [Bq, u1, vv], [D, u0, v0], [Bq, u1, vv], [A, u1, v0]];
    const up = (C[0] - D[0]) * (Bq[1] - D[1]) - (C[1] - D[1]) * (Bq[0] - D[0]) < 0;
    const order = up ? P : [P[0], P[2], P[1], P[3], P[5], P[4]];
    for (const [[px, pz], u, v] of order) { pos.push(px, Y, pz); uv.push(u, v); col.push(color.r, color.g, color.b); }
  }
  const dashed = (ax, az, bx, bz, w, on, off, color) => {
    const len = Math.hypot(bx - ax, bz - az), n = Math.floor(len / (on + off));
    for (let i = 0; i <= n; i++) { const t0 = (i * (on + off)) / len, t1 = Math.min(1, t0 + on / len); if (t0 >= 1) break; line(ax + (bx - ax) * t0, az + (bz - az) * t0, ax + (bx - ax) * t1, az + (bz - az) * t1, w, color); }
  };

  // a line from a to b, painted only where inside(x, z) holds (marching 8 cm steps)
  const clipped = (ax, az, bx, bz, w, inside, color = WHITE) => {
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(len / 0.08));
    let run = null, last = null;
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t, ok = inside(x, z);
      if (ok) { if (!run) run = [x, z]; last = [x, z]; }
      if ((!ok || i === n) && run) { line(run[0], run[1], last[0], last[1], w, color); run = null; }
    }
  };

  // ---- lane arrows on both approaches to the crossing (a T junction: Hankou Road goes off west only) ----
  // southbound (west half, heading +z): kerb lane straight or right into Hankou Road, the others straight on
  const SB = [[-25.6, CELL.straightRight], [-21.4, CELL.straight], [-17.8, CELL.straight]];
  const NB = [[-14.2, CELL.left], [-10.6, CELL.straight], [-6.4, CELL.straight]];   // northbound: inner lane turns left
  for (const zz of [-15, -33]) for (const [x, c] of SB) mark(c, x, zz, 1.7, 6, 1);
  for (const zz of [15, 33]) for (const [x, c] of NB) mark(c, x, zz, 1.7, 6, -1);
  // the crosswalk-ahead diamonds, further back
  for (const [x] of SB.slice(1)) mark(CELL.diamond, x, -62, 1.5, 3.2, 1);
  for (const [x] of NB) mark(CELL.diamond, x, 62, 1.5, 3.2, -1);

  // ---- guide areas: after the crossing the kerb lane tapers into the kerb, a curved edge, hatched ----
  function guide(xKerb, side, z0, z1, width) {
    // side: +1 the area lies to +x of its boundary (east kerb), -1 to -x (west kerb)
    const bx = (z) => { const t = Math.min(1, Math.max(0, (z - z0) / (z1 - z0))); return xKerb - side * width * (1 - t) ** 1.6; };
    const N = 24;
    for (let i = 0; i < N; i++) { const za = z0 + (z1 - z0) * i / N, zb = z0 + (z1 - z0) * (i + 1) / N; line(bx(za), za, bx(zb), zb, 0.15); }
    line(bx(z0), z0, xKerb, z0, 0.15);
    // hatching at 45 degrees, 1.2 m apart, clipped to the area
    const inside = (x, z) => (z - z0) * Math.sign(z1 - z0) >= 0 && (z - z1) * Math.sign(z1 - z0) <= 0 && (x - bx(z)) * side >= 0.12 && (xKerb - x) * side >= 0.05;
    const dirZ = Math.sign(z1 - z0), span = Math.abs(z1 - z0);
    for (let k = -width; k < span; k += 1.2) clipped(xKerb, z0 + dirZ * k, xKerb - side * width * 1.2, z0 + dirZ * (k + width * 1.2), 0.3, inside);
  }
  guide(L.eastCurbX - 0.32, 1, crossing.stopS - 1.2, -24, 3.3);     // northbound, beyond the crossing
  guide(L.westCurbX + 0.3, -1, -crossing.stopS + 1.2, 24, 3.3);     // southbound, beyond it

  // ---- bus stops on the river side: a yellow dashed box in the kerb lane, 公交车站 in it ----
  for (const zc of [-40, -232]) {
    const x0 = L.eastCurbX - 3.2, x1 = L.eastCurbX - 0.35, z0 = zc - 9, z1 = zc + 9;
    dashed(x0, z0, x0, z1, 0.18, 1.5, 1.0, YELLOW); line(x0, z0, x1, z0, 0.18, YELLOW); line(x0, z1, x1, z1, 0.18, YELLOW);
    mark(CELL.bus, (x0 + x1) / 2, zc, 1.6, 5.2, -1, YELLOW);
  }
  // ---- a yellow no-stopping grid in front of the Sightseeing Tunnel's door, in the kerb lane ----
  {
    const x0 = L.eastCurbX - 3.2, x1 = L.eastCurbX - 0.35, z0 = -188, z1 = -176;
    for (const [ax, az, bx2, bz] of [[x0, z0, x1, z0], [x0, z1, x1, z1], [x0, z0, x0, z1], [x1, z0, x1, z1]]) line(ax, az, bx2, bz, 0.18, YELLOW);
    const inBox = (x, z) => x > x0 + 0.1 && x < x1 - 0.1 && z > z0 + 0.1 && z < z1 - 0.1, wB = x1 - x0;
    for (let k = -wB; k < z1 - z0; k += 1.4) { clipped(x0, z0 + k, x1, z0 + k + wB, 0.13, inBox, YELLOW); clipped(x1, z0 + k, x0, z0 + k + wB, 0.13, inBox, YELLOW); }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill([0, 1, 0]).flat(), 3));
  const mat = new THREE.MeshStandardMaterial({ map: atlas(), vertexColors: true, alphaTest: 0.5, roughness: 0.6, metalness: 0, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const mesh = new THREE.Mesh(g, mat); mesh.name = 'road-markings'; mesh.receiveShadow = true; mesh.matrixAutoUpdate = false;
  return mesh;
}
