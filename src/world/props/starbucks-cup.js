// Standalone takeaway hot cup for the Bund RPG: Harbour Coffee, a café chain invented for the game
// (the file keeps its old name; the sleeve shows the game's own ring-and-waves mark).
//
//   import * as THREE from 'three';
//   import { createStarbucksCup } from './starbucks-cup.js';
//   const cup = createStarbucksCup(THREE);          // THREE.Group, metres, Y-up
//
// Origin = centre of the base (foot ring touches y = 0). The printed face on the sleeve is centred on
// local +Z; the lid's sip opening is on the opposite side (-Z). Plain white paper cup, white dome lid,
// smooth kraft sleeve with the café's ring-and-waves mark (optional). No liquid, steam or animation.
// The sleeve art is painted procedurally on one canvas (same colour-space handling as the game's
// canvas.js `tex()` helper), so there are no image files. No game imports. Written for three r187.
//
// Appearance target: the supplied photo (white dome lid, plain white cup, kraft sleeve with the face
// print). The artwork is a hand-traced vector approximation of that photo, not official artwork.

// ---- Assumed dimensions (metres): a "grande" (16 oz) class hot cup, proportions from the photo --
const D = Object.freeze({
  height: 0.1320,                     // base to top of the rolled rim
  wallBottomR: 0.0318, wallBottomY: 0.003,
  wallTopR: 0.0440, wallTopY: 0.1255,
  rimR: 0.0463,                       // outer radius of the rolled rim bead
  lidR: 0.0491,                       // widest radius of the lid's brim ring
  sipZ: -0.027,                       // sip opening centre, toward the back (-Z)
  sleeveY0: 0.032, sleeveY1: 0.102,   // sleeve bottom / top
  sleeveThickness: 0.0012,
});
const LID_DOME_TOP = D.height + 0.0139;   // top of the dome (centre)
const SIP_Y = D.height + 0.0136;          // dome height under the sip opening

const wallR = (y) => D.wallBottomR + (D.wallTopR - D.wallBottomR) * (y - D.wallBottomY) / (D.wallTopY - D.wallBottomY);
const sleeveRIn = (y) => wallR(y) + 0.0004;
const sleeveROut = (y) => sleeveRIn(y) + D.sleeveThickness;

export const STARBUCKS_CUP_DIMENSIONS = Object.freeze({
  ...D,
  baseDiameter: 2 * D.wallBottomR,
  bodyTopDiameter: 2 * D.wallTopR,
  rimDiameter: 2 * D.rimR,
  lidDiameter: 2 * D.lidR,
  lidDomeDiameter: 2 * 0.0405,
  sleeveOuterDiameterAtMid: 2 * sleeveROut((D.sleeveY0 + D.sleeveY1) / 2),
  overallHeight: SIP_Y + 0.0011,                // top of the sip lip (dome top is H + 13.9 mm)
  gripHeight: (D.sleeveY0 + D.sleeveY1) / 2,   // middle of the sleeve
});

const PAPER_HEX = 0xf5f5f3;
const LID_HEX = 0xf4f4f2;
const INK_CSS = '#124d42';            // dark teal-green print
const KRAFT_CSS = '#a67c55';

// ---- Lathe builder with per-strip normals (hard edges between strips, no axis artefacts) ----
// A strip is a polyline of [radius, y(, interior)]; a truthy 3rd value maps that point to a blank
// texture column. Winding matches the (ty, -tx) normal rule for any direction.
function latheStrips(THREE, strips, segments, { uvU = 0, vMin = 0, height = 1 } = {}) {
  const pos = [], nor = [], uv = [], idx = [];
  for (const pts of strips) {
    const segN = (a, b) => { const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1; return [ty / l, -tx / l]; };
    const n2 = pts.map((p, i) => {
      let nx = 0, ny = 0;
      if (i > 0) { const s = segN(pts[i - 1], p); nx += s[0]; ny += s[1]; }
      if (i < pts.length - 1) { const s = segN(p, pts[i + 1]); nx += s[0]; ny += s[1]; }
      const l = Math.hypot(nx, ny) || 1; return [nx / l, ny / l];
    });
    const base = pos.length / 3;
    for (let i = 0; i < pts.length; i++) {
      for (let j = 0; j <= segments; j++) {
        const phi = (j / segments) * Math.PI * 2, s = Math.sin(phi), c = Math.cos(phi);   // phi = 0 -> +Z
        pos.push(pts[i][0] * s, pts[i][1], pts[i][0] * c);
        nor.push(n2[i][0] * s, n2[i][1], n2[i][0] * c);
        uv.push(pts[i][2] ? 0.02 : j / segments + uvU, (pts[i][1] - vMin) / height);
      }
    }
    for (let i = 0; i < pts.length - 1; i++) {
      for (let j = 0; j < segments; j++) {
        const a = base + i * (segments + 1) + j, b = a + 1, c = a + segments + 1, d = c + 1;
        idx.push(a, b, c, b, d, c);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

// ---- Profiles (heights relative to the rim top H where it helps) ---------------------------
const H = D.height;
const BODY_STRIPS = [
  [ // underside + foot ring, gently tapered wall (slope ~0.096), rolled rim bead, inner wall
    [0, 0.0045], [0.0185, 0.0038], [0.0265, 0.0020], [0.0285, 0.0006], [0.0296, 0], [0.0308, 0],
    [0.0314, 0.0010], [D.wallBottomR, D.wallBottomY],
    [D.wallTopR, D.wallTopY],
    [0.0448, H - 0.0048], [0.0458, H - 0.0033], [D.rimR, H - 0.0018], [0.0458, H - 0.0006], [0.0446, H - 0.0001], [0.0436, H],
    [0.0428, H - 0.0004], [0.0422, H - 0.0014], [0.0418, H - 0.0030], [0.0416, H - 0.0065], [0.0295, 0.0048],
  ],
  [[0.0295, 0.0048], [0, 0.0048]],                                   // inner floor
];

const LID_STRIPS = [
  [ // outer skin: hem, rounded brim ring, groove, short tapered dome wall, convex top
    [0.0482, H - 0.0105], [0.0488, H - 0.0090], [D.lidR, H - 0.0065], [D.lidR, H - 0.0035], [0.0487, H - 0.0010],
    [0.0478, H + 0.0010], [0.0466, H + 0.0022], [0.0448, H + 0.0026], [0.0430, H + 0.0028], [0.0416, H + 0.0030],
    [0.0410, H + 0.0034], [0.0405, H + 0.0042], [0.0404, H + 0.0065], [0.0399, H + 0.0095], [0.0393, H + 0.0113],
    [0.0384, H + 0.0124], [0.0366, H + 0.0131], [0.0300, H + 0.0135], [0.0150, H + 0.0138], [0, LID_DOME_TOP],
  ],
  [ // underside (kept clear of the rim bead top at H), then inner skirt
    [0, H + 0.0130], [0.0300, H + 0.0126], [0.0360, H + 0.0121], [0.0376, H + 0.0113], [0.0390, H + 0.0102],
    [0.0395, H + 0.0065], [0.0397, H + 0.0036], [0.0412, H + 0.0022], [0.0432, H + 0.0016], [0.0450, H + 0.0014],
    [0.0462, H + 0.0008], [0.0471, H - 0.0008], [0.0474, H - 0.0030], [0.0474, H - 0.0105],
  ],
  [[0.0474, H - 0.0105], [0.0482, H - 0.0105]],                      // hem edge
];

// Sip opening (circular lathe, squashed to an oval by the group's z scale)
// thin flat lip (the photo's lid shows no bump on the dome silhouette) around a dark opening
const SIP_RING = [[[0.0095, 0], [0.0095, 0.0006], [0.0091, 0.0011], [0.0083, 0.0011], [0.0078, 0.0007], [0.0076, 0.0004]]];
const SIP_FLOOR = [[[0.0076, 0.0004], [0, 0.0004]]];

// ---- Sleeve artwork ------------------------------------------------------------------------
// Traced by hand from the supplied photo, in pixel coordinates of a 880x760 zoom of the sleeve
// (the zoom shows the sleeve from x 20 to 850 and y 30 to 710). cropToSleeve() undoes the cylinder
// foreshortening and converts to arc metres from the face centre and height above the base.
const CROP = { centreX: 435, halfWidth: 415, faceX: 335, top: 32, bottom: 708 };
const ART = {
  hairL: [[[65, 92], [63, 170], [67, 260], [74, 350], [88, 435], [114, 520], [154, 595], [210, 650], [300, 684]],
          [[300, 684], [252, 654], [204, 612], [165, 556], [138, 490], [120, 425], [110, 360], [104, 300], [103, 240], [104, 180], [105, 92]]],
  edgeL: [[[50, 92], [56, 260], [70, 400], [92, 520], [118, 635]], [[106, 628], [80, 520], [60, 400], [45, 260], [36, 92]]],
  bandR: [[[618, 98], [641, 180], [652, 280], [649, 380], [632, 470], [602, 552], [568, 618], [556, 672]],
          [[556, 672], [470, 680], [380, 684]],
          [[380, 684], [432, 652], [482, 602], [522, 540], [556, 470], [580, 400], [597, 330], [605, 260], [603, 190], [590, 140], [574, 112], [560, 96]]],
  stripes: [
    [[[700, 100], [718, 250], [736, 400], [718, 520], [694, 640]], [[630, 655], [662, 520], [676, 400], [668, 250], [648, 100]]],
    [[[770, 100], [782, 250], [792, 400], [778, 500], [756, 585]], [[722, 615], [744, 520], [758, 400], [742, 250], [722, 100]]],
    [[[850, 100], [852, 250], [850, 400], [838, 470]], [[796, 505], [808, 400], [802, 250], [792, 100]]],
  ],
  eyeL: [[[100, 160], [135, 142], [190, 138], [240, 158], [272, 200], [280, 262], [274, 326]], [[274, 326], [240, 312], [195, 300], [150, 292], [104, 288]]],
  slitL: [[[100, 208], [130, 192], [170, 188], [205, 206], [220, 243]], [[220, 243], [185, 232], [150, 234], [118, 244], [100, 252]]],
  eyeR: [[[600, 150], [560, 138], [500, 140], [440, 150], [395, 172], [366, 208], [360, 265], [368, 318], [382, 360]], [[382, 360], [404, 322], [445, 302], [500, 298], [555, 304], [600, 300]]],
  slitR: [[[432, 240], [465, 206], [515, 188], [560, 190], [580, 212]], [[580, 212], [545, 230], [495, 236], [455, 248], [432, 240]]],
  nose: [[[262, 440], [300, 424], [350, 422], [392, 432]], [[392, 432], [395, 447], [356, 463], [308, 464], [274, 454], [262, 440]]],
  mouth: [[[235, 505], [290, 512], [365, 515], [440, 503]], [[440, 503], [405, 545], [355, 578], [300, 576], [258, 540], [235, 505]]],
};

function spline(pts, n = 8) {          // Catmull-Rom through pts
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < n; s++) {
      const t = s / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

function rng(seed) {                    // same generator as canvas.js
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Texture u = angle (image centre faces +Z), v = (y - sleeve bottom) / sleeve height.
function paintSleeve(ctx, W, Hpx) {
  const y0 = D.sleeveY0, y1 = D.sleeveY1, rMid = sleeveROut((y0 + y1) / 2);
  ctx.fillStyle = KRAFT_CSS; ctx.fillRect(0, 0, W, Hpx);
  const thetaFace = Math.asin((CROP.faceX - CROP.centreX) / CROP.halfWidth);
  const cropToSleeve = ([px, py]) => {
    const th = Math.asin(Math.max(-0.995, Math.min(0.995, (px - CROP.centreX) / CROP.halfWidth)));
    return [rMid * (th - thetaFace), y0 + (CROP.bottom - py) / (CROP.bottom - CROP.top) * (y1 - y0)];
  };
  const toPx = ([x, y]) => [(0.5 + x / (2 * Math.PI * sleeveROut(y))) * W, (1 - (y - y0) / (y1 - y0)) * Hpx];
  const fillShape = (sides, color) => {
    const pts = sides.flatMap((s) => spline(s, 8));
    ctx.beginPath();
    pts.forEach((p, i) => { const [x, y] = toPx(cropToSleeve(p)); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  };
  void fillShape; void cropToSleeve; void thetaFace;
  // the café's own mark (Harbour Coffee, invented for the game): a ring with three waves inside, printed in one ink
  { const cx = W * 0.5, cy = Hpx * 0.5, R = Hpx * 0.3;
    ctx.strokeStyle = INK_CSS; ctx.lineWidth = Hpx * 0.035; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = Hpx * 0.03; ctx.lineCap = 'round';
    for (let k = -1; k <= 1; k++) { ctx.beginPath(); for (let i = 0; i <= 24; i++) { const t = i / 24, x = cx - R * 0.62 + t * R * 1.24, y = cy + k * R * 0.36 + Math.sin(t * Math.PI * 2) * R * 0.1; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); } }

  // Kraft fibre: sparse flecks, then fine per-pixel grain (same idea as canvas.js grain())
  const r = rng(7);
  for (let i = 0; i < W * Hpx / 90; i++) {
    const dark = r() < 0.7, a = 0.12 + r() * 0.22;
    ctx.fillStyle = dark ? `rgba(70,45,25,${a})` : `rgba(240,215,180,${a})`;
    ctx.fillRect(r() * W, r() * Hpx, 1 + r() * 2.2, 1 + r() * 1.6);
  }
  const img = ctx.getImageData(0, 0, W, Hpx), d = img.data, g = rng(11);
  for (let i = 0; i < d.length; i += 4) { const n = (g() - 0.5) * 16; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  ctx.putImageData(img, 0, 0);
}

function makeCanvas(w, h, factory) {
  if (factory) return factory(w, h);
  if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  return null;
}

// ---- Public API ----------------------------------------------------------------------------
// options: { segments = 64, sleeve = true, anisotropy = 8, castShadow = true, receiveShadow = true,
//            createCanvas = (w, h) => canvas, name = 'starbucks-cup' }
export function createStarbucksCup(THREE, options = {}) {
  const { segments = 64, sleeve = true, anisotropy = 8, castShadow = true, receiveShadow = true, createCanvas, name = 'starbucks-cup' } = options;
  const group = new THREE.Group();
  group.name = name;
  const textures = [];

  const paper = new THREE.MeshStandardMaterial({ color: PAPER_HEX, roughness: 0.6, metalness: 0 });
  const lidMat = new THREE.MeshStandardMaterial({ color: LID_HEX, roughness: 0.46, metalness: 0 });
  const holeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95, metalness: 0 });
  const sleeveMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0 });

  const body = new THREE.Mesh(latheStrips(THREE, BODY_STRIPS, segments), paper);
  body.name = 'cup-body';
  const lid = new THREE.Mesh(latheStrips(THREE, LID_STRIPS, segments), lidMat);
  lid.name = 'cup-lid';

  const sip = new THREE.Group();               // raised oval sip lip + dark opening, on the -Z side
  sip.name = 'sip-opening';
  sip.position.set(0, SIP_Y, D.sipZ);
  sip.scale.set(1, 1, 0.55);
  const sipRing = new THREE.Mesh(latheStrips(THREE, SIP_RING, 32), lidMat);
  const sipHole = new THREE.Mesh(latheStrips(THREE, SIP_FLOOR, 32), holeMat);
  sipRing.name = 'sip-lip'; sipHole.name = 'sip-hole';
  sip.add(sipRing, sipHole);

  const parts = [body, lid, sipRing, sipHole];
  let sleeveMesh = null;
  if (sleeve) {
    const y0 = D.sleeveY0, y1 = D.sleeveY1;
    const strips = [
      [[sleeveROut(y0), y0], [sleeveROut(y1), y1]],                               // outer face (printed)
      [[sleeveROut(y1), y1], [sleeveRIn(y1), y1]],                                // top edge
      [[sleeveRIn(y1), y1, 1], [sleeveRIn(y0), y0, 1]],                           // inside (blank)
      [[sleeveRIn(y0), y0], [sleeveROut(y0), y0]],                                // bottom edge
    ];
    const W = 1536, Hpx = Math.round(W * (y1 - y0) / (2 * Math.PI * sleeveROut((y0 + y1) / 2)));
    const canvas = makeCanvas(W, Hpx, createCanvas), ctx = canvas && canvas.getContext('2d');
    if (ctx) {
      paintSleeve(ctx, W, Hpx);
      const t = new THREE.CanvasTexture(canvas);      // same settings as canvas.js tex({ srgb: true })
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = anisotropy;
      textures.push(t);
      sleeveMat.map = t;
    } else sleeveMat.color.set(KRAFT_CSS);
    sleeveMesh = new THREE.Mesh(latheStrips(THREE, strips, segments, { uvU: 0.5, vMin: y0, height: y1 - y0 }), sleeveMat);
    sleeveMesh.name = 'cup-sleeve';
    parts.push(sleeveMesh);
  }

  for (const m of parts) { m.castShadow = castShadow; m.receiveShadow = receiveShadow; }

  // Grip anchor: on the cup axis at the middle of the sleeve.
  const grip = new THREE.Object3D();
  grip.name = 'grip';
  grip.position.set(0, STARBUCKS_CUP_DIMENSIONS.gripHeight, 0);

  group.add(body, lid, sip, grip);
  if (sleeveMesh) group.add(sleeveMesh);
  group.userData.dimensions = STARBUCKS_CUP_DIMENSIONS;
  group.userData.grip = grip;
  group.userData.dispose = () => {
    for (const m of parts) m.geometry.dispose();
    paper.dispose(); lidMat.dispose(); holeMat.dispose(); sleeveMat.dispose();
    for (const t of textures) t.dispose();
  };
  return group;
}
