// The golden belt's bronze manhole covers. When the pedestrian street opened in 1999, the 37 drain covers
// down the 金带 were cast in bronze, each with a relief of one of Shanghai's buildings from a different
// period (CCTV's report on the opening, 21 Sept 1999). Here: 37 covers flush in the red granite, each one
// of eight reliefs drawn in silhouette (the Customs House, the Peace Hotel, the Park Hotel, the Pearl
// Tower, Jin Mao, a shikumen gate, the Exhibition Centre, Longhua Pagoda). The raised parts are worn
// bright by feet; green-brown patina stays in the hollows. One draw call.
import * as THREE from 'three';
import { NJ } from './layout.js';
import { makeCanvas, tex, normalFromHeight, rng } from './canvas.js';

export const COVER_R = 0.36;
// where they are: [x, z], down the belt from Henan Road to Xizang Road, a little off its centre line
export function njCovers() {
  const x0 = NJ.henan.x0 - 9, x1 = NJ.xWest + 8, n = 37, out = [], zb = NJ.zc - 1.3;
  for (let i = 0; i < n; i++) {
    const x = x0 - ((x0 - x1) * i) / (n - 1);
    out.push([x, zb + (i % 2 ? 1.05 : -1.05)]);              // (either side of the lamp posts' line)
  }
  return out;
}

const DESIGNS = 8, CELL = 256;
// one relief: a building in silhouette inside two rings, the date band round it. ctx draws white = high.
function relief(x, kind, cx, cy, R) {
  x.save(); x.translate(cx, cy);
  x.fillStyle = '#fff'; x.strokeStyle = '#fff';
  // rim, a ring of studs, an inner ring
  x.lineWidth = R * 0.07; x.beginPath(); x.arc(0, 0, R * 0.95, 0, Math.PI * 2); x.stroke();
  for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2; x.beginPath(); x.arc(Math.cos(a) * R * 0.84, Math.sin(a) * R * 0.84, R * 0.025, 0, Math.PI * 2); x.fill(); }
  x.lineWidth = R * 0.03; x.beginPath(); x.arc(0, 0, R * 0.74, 0, Math.PI * 2); x.stroke();
  // the ground line
  const g = R * 0.42, s = R / 100;
  x.fillRect(-R * 0.6, g, R * 1.2, R * 0.05);
  const rect = (a, b, w, h) => x.fillRect(a * s, g - (b + h) * s, w * s, h * s);
  const tri = (a, b, w, h) => { x.beginPath(); x.moveTo(a * s, g - b * s); x.lineTo((a + w) * s, g - b * s); x.lineTo((a + w / 2) * s, g - (b + h) * s); x.closePath(); x.fill(); };
  switch (kind) {
    case 0: // the Customs House: a block with its clock tower and spire
      rect(-50, 0, 100, 34); rect(-16, 34, 32, 30); rect(-11, 64, 22, 14); tri(-11, 78, 22, 20);
      x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(0, g - 49 * s, 7 * s, 0, Math.PI * 2); x.fill(); x.globalCompositeOperation = 'source-over';
      x.beginPath(); x.arc(0, g - 49 * s, 4 * s, 0, Math.PI * 2); x.fill(); break;
    case 1: // the Peace Hotel: a tall block and its pyramid roof
      rect(-46, 0, 92, 28); rect(-24, 28, 48, 34); tri(-24, 62, 48, 30); break;
    case 2: // the Park Hotel: stepped up to a narrow top
      rect(-30, 0, 60, 40); rect(-22, 40, 44, 22); rect(-15, 62, 30, 16); rect(-8, 78, 16, 10); break;
    case 3: // the Pearl Tower: three legs, two spheres, a mast
      for (const a of [-22, 22]) { x.beginPath(); x.moveTo(a * s, g); x.lineTo(a * 0.2 * s, g - 30 * s); x.lineTo((a * 0.2 + 4) * s, g - 30 * s); x.lineTo((a + 6) * s, g); x.closePath(); x.fill(); }
      rect(-3, 0, 6, 92); x.beginPath(); x.arc(0, g - 24 * s, 15 * s, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.arc(0, g - 62 * s, 10 * s, 0, Math.PI * 2); x.fill(); x.beginPath(); x.arc(0, g - 80 * s, 4 * s, 0, Math.PI * 2); x.fill(); break;
    case 4: // Jin Mao: a tapering pagoda-like tower
      for (let i = 0; i < 8; i++) rect(-14 + i * 1.4, i * 11, 28 - i * 2.8, 10);
      tri(-3, 88, 6, 10); break;
    case 5: // a shikumen gate: stone frame, pediment, the two doors
      rect(-30, 0, 60, 62); x.globalCompositeOperation = 'destination-out'; rect(-18, 0, 36, 44); x.globalCompositeOperation = 'source-over';
      rect(-16, 0, 15, 42); rect(1, 0, 15, 42); tri(-34, 62, 68, 18); break;
    case 6: // the Exhibition Centre: a wide hall and its tall gilded spire
      rect(-56, 0, 112, 20); rect(-26, 20, 52, 14); rect(-12, 34, 24, 16); rect(-6, 50, 12, 14); tri(-4, 64, 8, 32); break;
    default: // Longhua Pagoda: seven eaves
      for (let i = 0; i < 7; i++) { rect(-11 + i, i * 12, 22 - 2 * i, 9); rect(-16 + i, i * 12 + 9, 32 - 2 * i, 2.5); }
      tri(-2, 87, 4, 10);
  }
  x.restore();
}

function atlas() {
  const W = CELL * 4, H = CELL * 2;
  const [hc, h] = makeCanvas(W, H), [cc, c] = makeCanvas(W, H), r = rng(1999);
  h.fillStyle = '#404040'; h.fillRect(0, 0, W, H);
  for (let k = 0; k < DESIGNS; k++) relief(h, k, (k % 4) * CELL + CELL / 2, Math.floor(k / 4) * CELL + CELL / 2, CELL * 0.5);
  // colour from height: hollows dark with green-brown patina, raised parts polished by feet
  const hd = h.getImageData(0, 0, W, H).data, img = c.createImageData(W, H);
  for (let i = 0; i < W * H; i++) {
    const t = (hd[i * 4] - 64) / 191, n = r();
    const R = 74 + 120 * t + n * 14, G = 58 + 86 * t + n * 12 + (1 - t) * 10, B = 38 + 44 * t + n * 8;
    img.data.set([R, G, B, 255], i * 4);
  }
  c.putImageData(img, 0, 0);
  return { map: tex(cc, { repeat: false }), normalMap: tex(normalFromHeight(hc, 3), { srgb: false, repeat: false }) };
}

// y: the belt's top
export function createBronzeCovers(group, y) {
  if (typeof document === 'undefined') return null;
  const A = atlas();
  const disc = new THREE.CircleGeometry(COVER_R, 40).rotateX(-Math.PI / 2);
  const ring = new THREE.RingGeometry(COVER_R, COVER_R + 0.035, 40).rotateX(-Math.PI / 2);
  const parts = [];
  njCovers().forEach(([x, z], i) => {
    const k = i % DESIGNS, u0 = (k % 4) / 4, v0 = 1 - (Math.floor(k / 4) + 1) / 2;
    const g = disc.clone(), uv = g.attributes.uv;
    for (let j = 0; j < uv.count; j++) uv.setXY(j, u0 + uv.getX(j) / 4, v0 + uv.getY(j) / 2);
    g.translate(x, y, z); parts.push(g);
    const rg = ring.clone(), ruv = rg.attributes.uv;
    for (let j = 0; j < ruv.count; j++) ruv.setXY(j, u0 + 0.002, v0 + 0.002);   // (the frame: a plain hollow tone)
    rg.translate(x, y - 0.001, z); parts.push(rg);
  });
  const pos = [], uvs = [], idx = []; let base = 0;
  for (const g of parts) {
    pos.push(...g.attributes.position.array); uvs.push(...g.attributes.uv.array);
    for (const v of g.index.array) idx.push(v + base);
    base += g.attributes.position.count;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  const n = geo.attributes.normal; for (let j = 0; j < n.count; j++) n.setXYZ(j, 0, 1, 0);
  const tangentless = new THREE.MeshStandardMaterial({ map: A.map, normalMap: A.normalMap, normalScale: new THREE.Vector2(1.2, 1.2), metalness: 0.85, roughness: 0.38, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const mesh = new THREE.Mesh(geo, tangentless); mesh.name = 'nj-bronze-covers'; mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}
