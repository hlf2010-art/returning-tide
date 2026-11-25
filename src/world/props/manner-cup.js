// Standalone Manner takeaway coffee cup for the Bund RPG.
//
//   import * as THREE from 'three';
//   import { createCoffeeCup } from './coffee-cup.js';
//   const cup = createCoffeeCup(THREE);          // THREE.Group, metres, Y-up
//
// Origin = centre of the base (foot ring touches y = 0). The café's mark (Linger, invented for the game) faces local +Z.
// No game imports, no liquid/steam/animation. The label is drawn procedurally on a canvas
// (same approach and colour-space handling as the game's canvas.js `tex()` helper), so
// there are no image files to load. Written against three r187 (WebGL2, r152+ colour management).

// ---- Assumed dimensions (metres). The reference photo does not fix real sizes. -----------
const D = Object.freeze({
  height: 0.0838,          // base (y=0) to top of the cup's rolled rim
  wallBottomR: 0.0278, wallBottomY: 0.003,
  wallTopR: 0.0408, wallTopY: 0.0745,
  rimR: 0.0448,            // outer radius of the rolled rim bead
  lidR: 0.0482,            // outer radius of the lid skirt
  lidTopY: 0.0890,         // top of the lid's raised ring
  lidRecessY: 0.0868,      // lid's recessed centre (outer surface)
  heartZ: 0.016,           // stopper offset toward the logo side, as in the photo
});

export const COFFEE_CUP_DIMENSIONS = Object.freeze({
  ...D,
  height: D.height - 0.0075, wallTopY: D.wallTopY - 0.0075, lidTopY: D.lidTopY - 0.0075, lidRecessY: D.lidRecessY - 0.0075,
  baseDiameter: 2 * D.wallBottomR,
  bodyTopDiameter: 2 * D.wallTopR,
  rimDiameter: 2 * D.rimR,
  lidDiameter: 2 * D.lidR,
  gripHeight: 0.036,
});

const PAPER_HEX = 0xf6f4ef;
const PAPER_CSS = '#f6f4ef';
const INK_CSS = '#141414';

// ---- Lathe builder with per-strip normals (hard edges between strips, no axis artefacts) --
// Each strip is a polyline of [radius, y(, interior)]; a truthy 3rd value maps that point to a blank texture column. Normals are the average of adjacent segment normals
// *within* the strip only. Winding matches the (ty, -tx) normal convention for any direction.
function latheStrips(THREE, strips, segments, { uvU = 0, height = 1 } = {}) {
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
        uv.push(pts[i][2] ? 0.02 : j / segments + uvU, pts[i][1] / height);   // 3rd value = interior point -> blank texture column
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

// ---- Profiles ------------------------------------------------------------------------------
const BODY_RAW = [
  [ // underside + foot ring, tapered wall, rolled rim bead, inner wall
    [0, 0.0042], [0.0160, 0.0036], [0.0228, 0.0019], [0.0246, 0.0006], [0.0256, 0], [0.0268, 0],
    [0.0274, 0.0010], [D.wallBottomR, D.wallBottomY],
    [D.wallTopR, D.wallTopY],
    [0.0416, 0.0762], [0.0432, 0.0778], [0.0444, 0.0794], [D.rimR, 0.0808], [0.0444, 0.0822],
    [0.0434, 0.0832], [0.0422, D.height],
    [0.0408, 0.0830, 1], [0.0400, 0.0815, 1], [0.0397, 0.0795, 1], [0.0396, 0.0745, 1], [0.0268, 0.0048, 1],
  ],
  [[0.0268, 0.0048, 1], [0, 0.0048, 1]],                             // inner floor (interior stays plain white)
];

const LID_RAW = [
  [ // outer skin: hem, skirt, rounded shoulder, raised ring, chamfer, recessed centre
    [D.lidR, 0.0742], [D.lidR, 0.0820], [0.0481, 0.0852], [0.0478, 0.0870], [0.0471, 0.0882],
    [0.0461, 0.0889], [0.0450, D.lidTopY], [0.0432, D.lidTopY], [0.0422, 0.0888], [0.0410, 0.0877],
    [0.0400, 0.0870], [0.0390, D.lidRecessY], [0.0380, D.lidRecessY], [0, D.lidRecessY],
  ],
  [ // underside, following the outer shape 0.8 mm lower, then the inner skirt
    [0, 0.0860], [0.0380, 0.0860], [0.0390, 0.0860], [0.0400, 0.0862], [0.0412, 0.0869],
    [0.0424, 0.0880], [0.0432, 0.0882], [0.0450, 0.0882], [0.0458, 0.0880], [0.0463, 0.0872],
    [0.0464, 0.0868], [0.0463, 0.0850], [0.0462, 0.0742],
  ],
  [[0.0462, 0.0742], [D.lidR, 0.0742]],                              // hem edge
];

const STOPPER_RAW = [
  [[0.0070, D.lidRecessY], [0.0070, 0.0881], [0.0066, 0.0885], [0.0026, 0.0885]],   // disc
  [[0.0040, 0.0885], [0.0014, 0.0906], [0, 0.0906]],                                 // short neck
];

// The profiles above are drawn with a 71.5 mm wall; the photo's cup is squatter (wall slope ~0.2),
// so everything from the wall top upward is lowered by DY. Dimensions exported below are post-drop.
const DY = 0.0075;
const drop = (strips) => strips.map((st) => st.map((p) => (p[1] >= D.wallTopY ? [p[0], p[1] - DY, ...p.slice(2)] : p)));
const BODY_STRIPS = drop(BODY_RAW), LID_STRIPS = drop(LID_RAW), STOPPER_STRIPS = drop(STOPPER_RAW);

function heartGeometry(THREE) {
  const k = 0.0105, depth = 0.0040, s = new THREE.Shape();
  s.moveTo(0, -0.55 * k);
  s.bezierCurveTo(-0.15 * k, -0.40 * k, -0.62 * k, -0.10 * k, -0.62 * k, 0.18 * k);
  s.bezierCurveTo(-0.62 * k, 0.45 * k, -0.25 * k, 0.55 * k, 0, 0.30 * k);
  s.bezierCurveTo(0.25 * k, 0.55 * k, 0.62 * k, 0.45 * k, 0.62 * k, 0.18 * k);
  s.bezierCurveTo(0.62 * k, -0.10 * k, 0.15 * k, -0.40 * k, 0, -0.55 * k);
  const g = new THREE.ExtrudeGeometry(s, {
    depth, curveSegments: 12, bevelEnabled: true, bevelThickness: 0.00035, bevelSize: 0.00035, bevelSegments: 2,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

// ---- Label texture -------------------------------------------------------------------------
// Texture u = angle (centre of the image faces +Z), v = y / cup height, so the canvas covers the
// whole body (interior and rim stay paper white). Artwork is laid out in (arc metres, y) and
// warped onto the cone, so horizontals stay level around the cup and nothing is mirrored.
const STROKES = {  // cap height = 1, y up; widths in cap units
  M: { w: 0.92, p: [[[0, 0], [0, 1], [0.46, 0.14], [0.92, 1], [0.92, 0]]] },
  A: { w: 0.86, p: [[[0, 0], [0.43, 1], [0.86, 0]], [[0.15, 0.30], [0.71, 0.30]]] },
  N: { w: 0.78, p: [[[0, 0], [0, 1], [0.78, 0], [0.78, 1]]] },
  E: { w: 0.58, p: [[[0.58, 1], [0, 1], [0, 0], [0.58, 0]], [[0, 0.52], [0.50, 0.52]]] },
  R: { w: 0.68, p: [
    [[0, 0], [0, 1], [0.38, 1], ...Array.from({ length: 9 }, (_, i) => { const a = Math.PI / 2 - (i + 1) * Math.PI / 10; return [0.38 + 0.25 * Math.cos(a), 0.75 + 0.25 * Math.sin(a)]; }), [0.38, 0.5], [0, 0.5]],
    [[0.30, 0.5], [0.68, 0]],
  ] },
};

function paintLabel(ctx, W, H) {
  const D = COFFEE_CUP_DIMENSIONS;
  ctx.fillStyle = PAPER_CSS; ctx.fillRect(0, 0, W, H);
  const rAt = (y) => D.wallBottomR + (D.wallTopR - D.wallBottomR) * (y - D.wallBottomY) / (D.wallTopY - D.wallBottomY);
  const toPx = (x, y) => [(0.5 + x / (2 * Math.PI * rAt(y))) * W, (1 - y / D.height) * H];
  const pxPerM = W / (2 * Math.PI * 0.0345);
  const trace = (pts, close) => {            // subdivide so straight design lines bend with the cone
    ctx.beginPath();
    const n = pts.length, last = close ? n : n - 1;
    let first = true;
    for (let i = 0; i < last; i++) {
      const a = pts[i], b = pts[(i + 1) % n], steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.0004));
      for (let s = first ? 0 : 1; s <= steps; s++) {
        const [px, py] = toPx(a[0] + (b[0] - a[0]) * s / steps, a[1] + (b[1] - a[1]) * s / steps);
        if (first) { ctx.moveTo(px, py); first = false; } else ctx.lineTo(px, py);
      }
    }
    if (close) ctx.closePath();
  };
  ctx.strokeStyle = INK_CSS; ctx.fillStyle = PAPER_CSS; ctx.lineJoin = 'miter'; ctx.miterLimit = 3; ctx.lineCap = 'butt';

  void trace; void pxPerM; void STROKES;
  // Linger (a café invented for the game): its name in a thin ring, printed in one ink on the paper
  { const [cx, cy] = toPx(0, 0.040), R = 0.0125 * W / (2 * Math.PI * rAt(0.040));
    ctx.strokeStyle = INK_CSS; ctx.fillStyle = INK_CSS; ctx.lineWidth = R * 0.06;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.font = `600 ${Math.round(R * 0.42)}px "Cormorant Garamond", Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('LINGER', cx, cy); }
}

function makeCanvas(w, h, factory) {
  if (factory) return factory(w, h);
  if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  return null;
}

// ---- Public API ----------------------------------------------------------------------------
// options: { segments = 48, anisotropy = 8, castShadow = true, receiveShadow = true,
//            createCanvas = (w, h) => canvas, name = 'manner-cup' }
export function createCoffeeCup(THREE, options = {}) {
  const { segments = 48, anisotropy = 8, castShadow = true, receiveShadow = true, createCanvas, name = 'manner-cup' } = options;
  const group = new THREE.Group();
  group.name = name;

  // Label texture (falls back to plain white paper if no canvas exists, e.g. in Node)
  const W = 2048, H = 720;   // ~9.4 px/mm both ways
  let map = null;
  const canvas = makeCanvas(W, H, createCanvas);
  const ctx = canvas && canvas.getContext('2d');
  if (ctx) {
    paintLabel(ctx, W, H);
    map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;            // as canvas.js tex({ srgb: true })
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.anisotropy = anisotropy;
  }

  const paper = new THREE.MeshStandardMaterial({ color: map ? 0xffffff : PAPER_HEX, map, roughness: 0.62, metalness: 0 });
  const lidMat = new THREE.MeshStandardMaterial({
    color: 0xfff0e4, roughness: 0.22, metalness: 0, transparent: true, opacity: 0.58,
  });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2f22, roughness: 0.38, metalness: 0 });

  // UV u is offset by 0.5 so the label (painted at the image centre) sits on +Z.
  const body = new THREE.Mesh(latheStrips(THREE, BODY_STRIPS, segments, { uvU: 0.5, height: COFFEE_CUP_DIMENSIONS.height }), paper);
  body.name = 'cup-body';
  const lid = new THREE.Mesh(latheStrips(THREE, LID_STRIPS, segments), lidMat);
  lid.name = 'cup-lid';

  const stopper = new THREE.Group();
  stopper.name = 'heart-stopper';
  stopper.position.set(0, 0, D.heartZ);
  const post = new THREE.Mesh(latheStrips(THREE, STOPPER_STRIPS, 24), redMat);
  post.name = 'stopper-post';
  const heart = new THREE.Mesh(heartGeometry(THREE), redMat);
  heart.name = 'stopper-heart';
  heart.position.y = 0.0892 - DY + 0.55 * 0.0105;          // heart tip sits just inside the neck
  stopper.add(post, heart);

  body.castShadow = castShadow; body.receiveShadow = receiveShadow;
  post.castShadow = heart.castShadow = castShadow;
  post.receiveShadow = heart.receiveShadow = receiveShadow;
  lid.castShadow = false; lid.receiveShadow = false;   // translucent: don't cast an opaque shadow

  // Grip anchor: on the cup axis, mid-lower body (cup radius there ~34 mm).
  const grip = new THREE.Object3D();
  grip.name = 'grip';
  grip.position.set(0, COFFEE_CUP_DIMENSIONS.gripHeight, 0);

  group.add(body, lid, stopper, grip);
  group.userData.dimensions = COFFEE_CUP_DIMENSIONS;
  group.userData.grip = grip;
  group.userData.dispose = () => {
    for (const m of [body, lid, post, heart]) m.geometry.dispose();
    paper.dispose(); lidMat.dispose(); redMat.dispose(); if (map) map.dispose();
  };
  return group;
}
