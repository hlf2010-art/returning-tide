// Trees, grown procedurally (no image assets), two species:
//   plane   London plane (法国梧桐), Hankou Road's street trees: clear trunk pruned into the
//           three-forked vase Shanghai's plane trees are known for, mottled peeling bark (cream,
//           olive, grey-brown), big palmate leaves gone yellow and ochre in November, some fallen.
//   camphor camphor laurel (香樟), the promenade's planter trees: short trunk, rounded evergreen
//           crown, dark furrowed bark, small glossy elliptic leaves.
// Wood: curved tapered tubes (trunk -> limbs -> branches -> twigs) with tiled bark colour + normal
// maps. Foliage: one instanced mesh of alpha-tested leaf cards per species, each card a sprig of
// leaves drawn on a canvas atlas, lit with crown-rounded normals so the canopy shades as a volume.
// Wind: wind.js's hierarchical sway runs in the vertex shader of both (and of their shadow depth
// material, so shadows move with the leaves).
import * as THREE from 'three';
import { makeCanvas, tex, rng, tileNoise, normalFromHeight } from './canvas.js';
import { WIND_GLSL } from './wind.js';

export const windUniforms = {
  uWindTime: { value: 0 }, uWind: { value: 0.35 }, uWindRain: { value: 0 }, uWindDir: { value: new THREE.Vector2(-0.848, 0.53) },
  uLeafScale: { value: 1 },
};

const SPECIES = {
  plane: {
    trunkH: 0.36, trunkR: 0.2, limbs: [3, 3], limbAngle: [0.45, 0.66], limbLen: 0.56, kids: [7, 8], kidAngle: [0.55, 0.95],
    kidLen: 0.5, twigs: [7, 8], twigLen: 0.55, cards: [11, 13], card: 0.72, crown: 0.62, cells: [0, 1], cellsAlt: [2, 3],
    up: 0.28, sag: 0.1,
  },
  camphor: {
    trunkH: 0.28, trunkR: 0.1, limbs: [4, 5], limbAngle: [0.6, 0.9], limbLen: 0.52, kids: [4, 5], kidAngle: [0.6, 1.0],
    kidLen: 0.5, twigs: [7, 9], twigLen: 0.45, cards: [10, 12], card: 0.55, crown: 0.62, cells: [4, 5], cellsAlt: [4, 5],
    up: 0.18, sag: 0.04,
  },
};

// ---- textures --------------------------------------------------------------------------------
function barkTextures(kind) {
  const W = 256, H = 512, r = rng(kind === 'plane' ? 71 : 72);
  const [c, ctx] = makeCanvas(W, H), [hc, hctx] = makeCanvas(W, H);
  const n = tileNoise(256, 8, kind === 'plane' ? 3 : 4, 5);
  const col = ctx.createImageData(W, H), hgt = hctx.createImageData(W, H);
  if (kind === 'plane') {
    // patches where the outer bark has flaked off: cream / pale olive under grey-brown
    const cells = []; for (let i = 0; i < 46; i++) cells.push([r() * W, r() * H, r()]);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let best = 1e9, second = 1e9, tone = 0;
      const jx = x + (n[(y % 256) * 256 + (x % 256)] - 0.5) * 60, jy = y + (n[((y + 97) % 256) * 256 + ((x + 31) % 256)] - 0.5) * 60;
      for (const [cx, cy, t] of cells) for (const ox of [-W, 0, W]) for (const oy of [-H, 0, H]) {
        const d = (jx - cx - ox) ** 2 + ((jy - cy - oy) * 0.55) ** 2;
        if (d < best) { second = best; best = d; tone = t; } else if (d < second) second = d;
      }
      const edge = Math.min(1, (Math.sqrt(second) - Math.sqrt(best)) / 6);   // 0 on a patch border
      const g = n[(y % 256) * 256 + (x % 256)];
      const pal = tone < 0.35 ? [196, 186, 150] : tone < 0.6 ? [150, 150, 112] : tone < 0.82 ? [118, 112, 92] : [92, 84, 70];
      const k = (0.86 + 0.28 * g) * (0.55 + 0.45 * edge), i = (y * W + x) * 4;
      col.data[i] = pal[0] * k; col.data[i + 1] = pal[1] * k; col.data[i + 2] = pal[2] * k; col.data[i + 3] = 255;
      const hv = (tone < 0.35 ? 0.35 : 0.6) * edge + g * 0.25;                // flaked patches sit lower
      hgt.data[i] = hgt.data[i + 1] = hgt.data[i + 2] = hv * 255; hgt.data[i + 3] = 255;
    }
  } else {
    // camphor: dark grey-brown, deep vertical furrows broken into short plates
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const g = n[(y % 256) * 256 + (x % 256)], g2 = n[((y * 3) % 256) * 256 + ((x * 2 + 50) % 256)];
      const u = x / W * 9 + (g - 0.5) * 2.2;
      const ridge = Math.pow(Math.abs(Math.sin(u * Math.PI)), 0.6);
      const plate = 0.75 + 0.25 * Math.sin((y / H) * 40 + Math.floor(u) * 2.3 + g2 * 3);
      const hv = ridge * plate * (0.7 + 0.3 * g2), i = (y * W + x) * 4, k = 0.35 + 0.65 * hv;
      col.data[i] = 92 * k; col.data[i + 1] = 80 * k; col.data[i + 2] = 68 * k; col.data[i + 3] = 255;
      hgt.data[i] = hgt.data[i + 1] = hgt.data[i + 2] = hv * 255; hgt.data[i + 3] = 255;
    }
  }
  ctx.putImageData(col, 0, 0); hctx.putImageData(hgt, 0, 0);
  const map = tex(c), normalMap = tex(normalFromHeight(hc, kind === 'plane' ? 3 : 5), { srgb: false });
  return { map, normalMap };
}

// one sprig per atlas cell (3 x 2 cells): 0,1 plane sprigs (mixed autumn colours), 2,3 plane
// sprigs gone browner, 4,5 camphor sprigs
const ATLAS = { cols: 3, rows: 2, cell: 256 };
function leafAtlas() {
  const { cols, rows, cell } = ATLAS, [c, ctx] = makeCanvas(cols * cell, rows * cell), r = rng(9);
  const plane = (x, y, s, ang, colr) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.beginPath();
    // palmate, five lobes, toothed: polar outline; the stalk is at the origin, the blade points to -y
    for (let i = 0; i <= 120; i++) {
      const th = (i / 120) * Math.PI * 2, lobes = Math.pow(Math.abs(Math.cos(th * 2.5)), 0.7);
      const tooth = 1 + 0.05 * Math.sin(th * 34);
      const rad = s * (0.42 + 0.58 * lobes) * tooth * (Math.sin(th) > 0.55 ? 0.45 : 1);   // notch at the stalk
      const px = Math.cos(th - Math.PI / 2) * rad, py = Math.sin(th - Math.PI / 2) * rad * 0.95 - s * 0.55;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
    const g = ctx.createRadialGradient(0, -s * 0.5, s * 0.1, 0, -s * 0.5, s);
    g.addColorStop(0, colr[0]); g.addColorStop(1, colr[1]); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(60,40,10,0.35)'; ctx.lineWidth = 1.2;                     // veins
    for (const a of [-1.1, -0.55, 0, 0.55, 1.1]) { ctx.beginPath(); ctx.moveTo(0, -s * 0.5); ctx.lineTo(Math.sin(a) * s * 0.85, -s * 0.5 - Math.cos(a) * s * 0.85); ctx.stroke(); }
    ctx.strokeStyle = '#5a4020'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -s * 0.5); ctx.stroke();   // stalk
    ctx.restore();
  };
  const camphor = (x, y, s, ang, colr) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(s * 0.32, -s * 0.25, s * 0.28, -s * 0.8, 0, -s);
    ctx.bezierCurveTo(-s * 0.28, -s * 0.8, -s * 0.32, -s * 0.25, 0, 0);
    const g = ctx.createLinearGradient(-s * 0.3, 0, s * 0.3, 0);
    g.addColorStop(0, colr[0]); g.addColorStop(0.5, colr[1]); g.addColorStop(1, colr[0]); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(200,220,150,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -s * 0.95); ctx.stroke();
    ctx.restore();
  };
  const autumn = [['#c9a43c', '#8f8a2e'], ['#d2a53a', '#b07a28'], ['#a9a440', '#6f7a2a'], ['#c08a32', '#8a5a22'], ['#9aa04a', '#5f6e2c']];
  const brown = [['#a8742c', '#6e4a1e'], ['#b88a3a', '#7a5524'], ['#8f6a30', '#5a4220']];
  for (let k = 0; k < cols * rows; k++) {
    const ox = (k % cols) * cell + cell / 2, oy = Math.floor(k / cols) * cell + cell - 6;
    ctx.save(); ctx.beginPath(); ctx.rect((k % cols) * cell, Math.floor(k / cols) * cell, cell, cell); ctx.clip();
    if (k < 4) {
      const pal = k < 2 ? autumn : brown;
      ctx.strokeStyle = '#4e3a22'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.quadraticCurveTo(ox + 10, oy - 90, ox - 6, oy - 150); ctx.stroke();
      const n = 3;
      for (let i = 0; i < n; i++) {
        const t = 0.35 + i * 0.3, ax = ox + (i % 2 ? 1 : -1) * 6, ay = oy - 150 * t;
        plane(ax, ay, 62 + r() * 18, (i % 2 ? 1 : -1) * (0.5 + r() * 0.4) + (i === n - 1 ? 0 : 0), pal[Math.floor(r() * pal.length)]);
      }
      plane(ox - 6, oy - 150, 66, (r() - 0.5) * 0.4, pal[Math.floor(r() * pal.length)]);
    } else {
      ctx.strokeStyle = '#4a3b26'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.quadraticCurveTo(ox - 8, oy - 120, ox + 4, oy - 230); ctx.stroke();
      for (let i = 0; i < 11; i++) {
        const t = 0.15 + i * 0.077, ay = oy - 230 * t, side = i % 2 ? 1 : -1;
        const young = r() < 0.12;
        camphor(ox + side * 3, ay, 46 + r() * 16, side * (0.7 + r() * 0.35), young ? ['#7a5a2e', '#a86a3a'] : ['#2f4a22', '#4e6e34']);
      }
      camphor(ox + 4, oy - 230, 50, 0, ['#35512a', '#58783a']);
    }
    ctx.restore();
  }
  const t = tex(c, { repeat: false }); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

// ---- wood geometry ---------------------------------------------------------------------------
// A curved, tapered tube along `pts` (array of [x,y,z]); radii per point; per-vertex wind data.
function tube(out, pts, radii, radial, windAt, base, vScale) {
  const n = pts.length, start = out.pos.length / 3;
  let ref = [0, 0, 1];
  let vAcc = 0;
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[Math.min(n - 1, i + 1)], o = pts[Math.max(0, i - 1)];
    let tx = q[0] - o[0], ty = q[1] - o[1], tz = q[2] - o[2]; const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
    // frame: b = t x ref, nrm = b x t (ref carried along, so the tube doesn't twist)
    let bx = ty * ref[2] - tz * ref[1], by = tz * ref[0] - tx * ref[2], bz = tx * ref[1] - ty * ref[0];
    let bl = Math.hypot(bx, by, bz); if (bl < 1e-4) { ref = [1, 0, 0]; bx = ty * ref[2] - tz * ref[1]; by = tz * ref[0] - tx * ref[2]; bz = tx * ref[1] - ty * ref[0]; bl = Math.hypot(bx, by, bz); }
    bx /= bl; by /= bl; bz /= bl;
    const nx = by * tz - bz * ty, ny = bz * tx - bx * tz, nz = bx * ty - by * tx; ref = [nx, ny, nz];
    if (i > 0) vAcc += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1], p[2] - pts[i - 1][2]);
    const w = windAt(i / (n - 1)), circ = Math.max(0.15, 2 * Math.PI * radii[0]);
    for (let k = 0; k <= radial; k++) {
      const a = (k / radial) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), r = radii[i];
      const dx = nx * ca + bx * sa, dy = ny * ca + by * sa, dz = nz * ca + bz * sa;
      out.pos.push(p[0] + dx * r, p[1] + dy * r, p[2] + dz * r); out.nrm.push(dx, dy, dz);
      out.uv.push((k / radial) * Math.max(1, Math.round(circ / 0.5)), vAcc / vScale);
      out.base.push(...base); out.br.push(...w);
    }
  }
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < radial; k++) {
    const a = start + i * (radial + 1) + k, b = a + radial + 1;
    out.idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
}

function grow(spec, twigsOut, out, leaves) {
  const S = SPECIES[spec.species], r = rng(spec.seed * 7919 + 13), h = spec.h;
  const R = (a, b) => a + (b - a) * r(), RI = (a, b) => Math.round(R(a, b));
  const base = [spec.x, spec.y, spec.z, h];
  const crownC = [spec.x, spec.y + h * S.crown, spec.z];
  // polyline growing from p along dir, bending toward `up` and sagging with weight
  const path = (p, dir, len, segs, up, sag, wobble) => {
    const pts = [p.slice()]; let d = dir.slice(), q = p.slice();
    for (let i = 1; i <= segs; i++) {
      d = [d[0] + (r() - 0.5) * wobble, d[1] + (r() - 0.5) * wobble + up - sag * (i / segs), d[2] + (r() - 0.5) * wobble];
      const l = Math.hypot(...d); d = d.map((v) => v / l);
      q = [q[0] + d[0] * len / segs, q[1] + d[1] * len / segs, q[2] + d[2] * len / segs]; pts.push(q);
    }
    return pts;
  };
  const along = (pts, t) => { const f = t * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), k = f - i; return pts[i].map((v, j) => v + (pts[i + 1][j] - v) * k); };
  const dirAt = (pts, t) => { const a = along(pts, Math.max(0, t - 0.05)), b = along(pts, Math.min(1, t + 0.05)); const d = b.map((v, j) => v - a[j]); const l = Math.hypot(...d) || 1; return d.map((v) => v / l); };
  const spread = (d, ang, around) => {
    // tilt direction d away from its axis by ang, rotated `around` radians about it
    const ref = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    let ax = [d[1] * ref[2] - d[2] * ref[1], d[2] * ref[0] - d[0] * ref[2], d[0] * ref[1] - d[1] * ref[0]];
    const al = Math.hypot(...ax); ax = ax.map((v) => v / al);
    const bx = [d[1] * ax[2] - d[2] * ax[1], d[2] * ax[0] - d[0] * ax[2], d[0] * ax[1] - d[1] * ax[0]];
    const c = Math.cos(around), s = Math.sin(around);
    const side = ax.map((v, j) => v * c + bx[j] * s);
    const out2 = d.map((v, j) => v * Math.cos(ang) + side[j] * Math.sin(ang)); const l = Math.hypot(...out2); return out2.map((v) => v / l);
  };
  // a street tree next to a wall grows its crown out over the street (spec.away: unit xz)
  const awayFrom = (d) => {
    if (!spec.away) return d;
    const k = d[0] * spec.away[0] + d[2] * spec.away[1];
    if (k >= 0.1) return d;
    const f = 0.1 - k, o = [d[0] + spec.away[0] * f * 1.6, d[1], d[2] + spec.away[1] * f * 1.6], l = Math.hypot(...o);
    return o.map((v) => v / l);
  };
  // trunk: a slight lean
  const lean = [R(-0.06, 0.06), 1, R(-0.06, 0.06)];
  const trunkPts = path([spec.x, spec.y, spec.z], lean.map((v) => v / Math.hypot(...lean)), h * S.trunkH + 0.25, 6, 0, 0, 0.06);
  const tr = S.trunkR * (h / 7.5) ** 0.8;
  tube(out, trunkPts, trunkPts.map((_, i) => tr * (1.25 - 0.45 * (i / (trunkPts.length - 1))) * (i === 0 ? 1.15 : 1)), 9, () => [0, 0, 0, 0], base, 1.6);
  const top = trunkPts[trunkPts.length - 1];
  const nL = RI(...S.limbs), rot0 = r() * 6.283;
  for (let li = 0; li < nL; li++) {
    const p1 = r(), ang = R(...S.limbAngle), around = rot0 + (li / nL) * 6.283 + R(-0.3, 0.3);
    const ld = awayFrom(spread([0, 1, 0], ang, around)), lenL = h * S.limbLen * R(0.85, 1.1);
    const limb = path(top.map((v, j) => v - (j === 1 ? 0.15 : 0)), ld, lenL, 6, S.up * 0.15, S.sag, 0.18);
    const rL = tr * 0.62, w1At = (t) => t * lenL / 3;
    tube(out, limb, limb.map((_, i) => rL * (1 - 0.65 * (i / (limb.length - 1)))), 7, (t) => [p1, 0, w1At(t), 0], base, 1.2);
    const nK = RI(...S.kids);
    for (let ki = 0; ki < nK; ki++) {
      const tk = 0.35 + 0.65 * (ki + r() * 0.6) / nK, at = along(limb, Math.min(1, tk)), p2 = r();
      const kd = awayFrom(spread(dirAt(limb, tk), R(...S.kidAngle), r() * 6.283)), lenK = h * S.kidLen * R(0.6, 1) * (1.15 - tk * 0.4);
      const kid = path(at, kd, lenK, 4, S.up * 0.3, S.sag * 1.5, 0.3);
      const w1 = w1At(tk), rK = rL * (0.55 - tk * 0.2);
      tube(out, kid, kid.map((_, i) => Math.max(0.012, rK * (1 - 0.7 * (i / (kid.length - 1))))), 5, (t) => [p1, p2, w1, t * 0.8], base, 1);
      const nT = RI(...S.twigs);
      for (let ti = 0; ti < nT; ti++) {
        const tt = 0.3 + 0.7 * (ti + r() * 0.7) / nT, at2 = along(kid, Math.min(1, tt));
        const td = spread(dirAt(kid, tt), R(0.5, 1.1), r() * 6.283), lenT = h * 0.13 * S.twigLen * R(0.7, 1.2) * 2;
        const twig = path(at2, td, lenT, 2, S.up * 0.4, S.sag * 2, 0.4);
        const w2 = tt * 0.8;
        tube(twigsOut, twig, [0.016, 0.011, 0.006].slice(0, twig.length), 3, (t) => [p1, p2, w1, w2 + t * 0.4], base, 1);
        // leaf sprigs along the outer part of the twig and at its tip
        if (spec.bare && r() < spec.bare) continue;
        const nC = RI(...S.cards);
        for (let ci = 0; ci < nC; ci++) {
          const tc = 0.25 + 0.75 * r(), cp = along(twig, tc);
          const jit = [R(-0.45, 0.45), R(-0.3, 0.35), R(-0.45, 0.45)].map((v) => v * S.card);
          leaves.push({ p: cp.map((v, j) => v + jit[j]), base, br: [p1, p2, w1, w2 + tc * 0.4], crown: crownC, phase: r(), size: S.card * R(0.75, 1.15),
            cell: (spec.species === 'plane' && r() < 0.35 ? S.cellsAlt : S.cells)[r() < 0.5 ? 0 : 1], spin: r() * 6.283, tilt: R(0.2, 1.1) });
        }
      }
    }
  }
}

// ---- shader hooks ----------------------------------------------------------------------------
function patchWood(shader) {
  Object.assign(shader.uniforms, windUniforms);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\nattribute vec4 aBase;\nattribute vec4 aBranch;\n${WIND_GLSL}`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>\ntransformed += windOffset(transformed, aBase, aBranch, vec2(0.0));`);
}
function patchLeaves(shader, depth = false) {
  Object.assign(shader.uniforms, windUniforms);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\nattribute vec4 aBase;\nattribute vec4 aBranch;\nattribute vec4 aLeaf;\nattribute vec3 aCrown;\nuniform float uLeafScale;\n${WIND_GLSL}`)
    .replace('#include <uv_vertex>', `#include <uv_vertex>
      #ifdef USE_MAP
        // atlas cell aLeaf.z (row 0 at the top of the canvas; the texture is flipped on upload)
        vMapUv = vec2((mod(aLeaf.z, ${ATLAS.cols}.0) + uv.x) / ${ATLAS.cols}.0, (${ATLAS.rows - 1}.0 - floor(aLeaf.z / ${ATLAS.cols}.0) + uv.y) / ${ATLAS.rows}.0);
      #endif`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>
      transformed *= uLeafScale;
      {
        mat3 im = mat3(instanceMatrix);
        vec3 anchor = instanceMatrix[3].xyz;
        vec3 wpos = anchor + im * transformed;
        vec3 off = windOffset(wpos, aBase, aBranch, vec2(position.y * aLeaf.w, aLeaf.x));
        transformed += transpose(im) * off / dot(im[0], im[0]);
      }`);
  if (!depth) {
    // crown-rounded normals: a canopy shades like a volume, not like a cloud of flat cards
    shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
      {
        mat3 im = mat3(instanceMatrix);
        vec3 out_ = normalize(instanceMatrix[3].xyz - aCrown + vec3(0.0, 0.6, 0.0));
        vec3 localOut = normalize(transpose(im) * out_);
        objectNormal = normalize(mix(objectNormal, localOut, 0.7));
      }`);
  }
}

// ---- the trees -------------------------------------------------------------------------------
// specs: [{ x, y, z, h, species: 'plane' | 'camphor', seed, bare?: 0..1 (fraction of twigs leafless) }]
export function createTrees(specs, { wetBoost = null } = {}) {
  const group = new THREE.Group(); group.name = 'trees';
  const atlas = leafAtlas();
  const mats = {};
  // one wood mesh and one leaf mesh per tree (shared materials), so trees out of view are culled
  specs.forEach((spec, ti) => {
    const species = spec.species, list = [spec];
    // twigs go in their own buffer and are appended last, so low quality can simply not draw them
    const wood = { pos: [], nrm: [], uv: [], base: [], br: [], idx: [] }, twigs = { pos: [], nrm: [], uv: [], base: [], br: [], idx: [] }, leaves = [];
    list.forEach((s) => grow(s, twigs, wood, leaves));
    const woodTris = wood.idx.length, off = wood.pos.length / 3;
    for (const k of ['pos', 'nrm', 'uv', 'base', 'br']) wood[k].push(...twigs[k]);
    for (const i of twigs.idx) wood.idx.push(i + off);
    // shuffled, so any prefix of the leaves is an even thinning of every crown (quality LOD)
    const shuf = rng(17 + ti);
    for (let i = leaves.length - 1; i > 0; i--) { const j = Math.floor(shuf() * (i + 1)); [leaves[i], leaves[j]] = [leaves[j], leaves[i]]; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(wood.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(wood.nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(wood.uv, 2));
    g.setAttribute('aBase', new THREE.Float32BufferAttribute(wood.base, 4));
    g.setAttribute('aBranch', new THREE.Float32BufferAttribute(wood.br, 4));
    g.setIndex(wood.idx); g.computeBoundingSphere();
    const M = mats[species] || (mats[species] = {});
    if (!M.wood) {
    const bark = barkTextures(species);
    const woodMat = new THREE.MeshStandardMaterial({ map: bark.map, normalMap: bark.normalMap, normalScale: new THREE.Vector2(1.2, 1.2), roughness: 0.92, metalness: 0 });
    woodMat.onBeforeCompile = (sh) => {
      patchWood(sh);
      if (wetBoost) {   // rain darkens bark and gives it a sheen
        sh.uniforms.wetBoost = wetBoost;
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float wetBoost;')
          .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.45, wetBoost * 0.8);\ndiffuseColor.rgb *= 1.0 - 0.35 * wetBoost;');
      }
    };
    woodMat.customProgramCacheKey = () => `tree-wood-${!!wetBoost}`;
    const wd = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    wd.onBeforeCompile = patchWood; wd.customProgramCacheKey = () => 'tree-wood-depth';
    const leafMat = new THREE.MeshStandardMaterial({
      map: atlas, alphaTest: 0.42, side: THREE.DoubleSide, roughness: species === 'camphor' ? 0.5 : 0.75, metalness: 0,
      emissive: new THREE.Color(species === 'camphor' ? 0x0a1206 : 0x1a1206), emissiveIntensity: 1,   // light through the leaves
    });
    leafMat.onBeforeCompile = (sh) => patchLeaves(sh, false);
    leafMat.customProgramCacheKey = () => 'tree-leaves';
    const ld = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: atlas, alphaTest: 0.42 });
    ld.onBeforeCompile = (sh) => patchLeaves(sh, true); ld.customProgramCacheKey = () => 'tree-leaves-depth';
    Object.assign(M, { wood: woodMat, woodDepth: wd, leaf: leafMat, leafDepth: ld });
    }
    const wm = new THREE.Mesh(g, M.wood); wm.name = `tree-wood-${species}-${ti}`;
    wm.userData.lod = { trunkTris: woodTris, allTris: wood.idx.length };
    wm.castShadow = true; wm.receiveShadow = true;
    wm.customDepthMaterial = M.woodDepth;
    group.add(wm);

    // leaf cards: a unit quad with its stalk at the origin, blade up (+y), in the xy plane
    const card = new THREE.PlaneGeometry(1, 1); card.translate(0, 0.5, 0);
    const N = leaves.length;
    const aBase = new Float32Array(N * 4), aBranch = new Float32Array(N * 4), aLeaf = new Float32Array(N * 4), aCrown = new Float32Array(N * 3);
    const im = new THREE.InstancedMesh(card, null, N), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), pv = new THREE.Vector3();
    leaves.forEach((L, i) => {
      // face outward from the crown, tilted up, spun about the stalk
      const out = pv.set(L.p[0] - L.crown[0], 0, L.p[2] - L.crown[2]);
      const yaw = Math.atan2(out.x, out.z);
      e.set(-L.tilt, yaw + (L.spin - 3.14) * 0.6, (L.spin % 1 - 0.5) * 1.2, 'YXZ'); q.setFromEuler(e);
      m4.compose(pv.set(...L.p), q, sc.setScalar(L.size)); im.setMatrixAt(i, m4);
      aBase.set(L.base, i * 4); aBranch.set(L.br, i * 4); aLeaf.set([L.phase, 0, L.cell, L.size], i * 4); aCrown.set(L.crown, i * 3);
    });
    card.setAttribute('aBase', new THREE.InstancedBufferAttribute(aBase, 4));
    card.setAttribute('aBranch', new THREE.InstancedBufferAttribute(aBranch, 4));
    card.setAttribute('aLeaf', new THREE.InstancedBufferAttribute(aLeaf, 4));
    card.setAttribute('aCrown', new THREE.InstancedBufferAttribute(aCrown, 3));
    im.material = M.leaf;
    im.customDepthMaterial = M.leafDepth;
    im.castShadow = true; im.receiveShadow = true; im.name = `tree-leaves-${species}-${ti}`;
    im.instanceMatrix.needsUpdate = true;
    // culled as a whole when out of view (bounds padded for the wind)
    im.computeBoundingSphere(); im.boundingSphere.radius += 1.5;
    g.boundingSphere.radius += 1.5;
    im.userData.lod = { all: N };
    group.add(im);
  });
  return {
    group,
    // quality step (renderer ladder): fewer leaf cards (each drawn a little larger) and no twigs
    // when the frame budget is tight
    setQuality(level) {
      const frac = level <= 1 ? 1 : level <= 3 ? 0.65 : 0.4;
      windUniforms.uLeafScale.value = 1 / Math.sqrt(frac) ** 0.6;
      group.children.forEach((c) => {
        if (c.isInstancedMesh) c.count = Math.max(1, Math.round(c.userData.lod.all * frac));
        else c.geometry.setDrawRange(0, level <= 3 ? c.userData.lod.allTris : c.userData.lod.trunkTris);
      });
    },
    update(t, wind, rain = 0, dir = null) {
      windUniforms.uWindTime.value = t; windUniforms.uWind.value = wind; windUniforms.uWindRain.value = rain;
      if (dir) windUniforms.uWindDir.value.set(dir[0], dir[1]);
    },
    stats() { const s = {}; group.children.forEach((c) => { s[c.name] = c.isInstancedMesh ? c.count : c.geometry.index.count / 3; }); return s; },
  };
}
