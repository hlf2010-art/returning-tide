// The three bridges you see from the Bund, scenery only (never walkable):
//   外白渡桥 the Garden Bridge: the 1907 steel camelback truss over the mouth of Suzhou Creek at the
//            north end of the Bund, Broadway Mansions behind it; floodlit gold at night
//   南浦大桥 the Nanpu Bridge: far down the river to the south, the 1991 cable-stayed bridge with its two
//            H towers and the famous spiral ramp coming down on the Puxi side; strings of light at night
//   杨浦大桥 the Yangpu Bridge: far up the river to the north, the 1993 cable-stayed bridge with diamond
//            towers, the longest span of its day; white cable lights at night
// Real-ish in form and size (Nanpu towers 150 m, Yangpu 208 m, decks ~46 m over the water). Not real:
// their distances, pulled in (Nanpu ~3.3 km, Yangpu ~5 km in life) so the haze leaves something to see,
// and the river kept straight to them (it bends east past the North Bund).
// World frame: the river runs along z (north = -z), Puxi at x < 26, Pudong's bank at x = 470.
import * as THREE from 'three';
import { Batch } from './geo.js';
import { asLight } from './dayNight.js';
import { REFLECT_LAYER } from './sky.js';
import { L } from './layout.js';

export const BRIDGES = {
  garden: { x: -8, z: -870, creek: [-820, -900] },    // Zhongshan Road's line; Suzhou Creek between z -900 and -820
  nanpu: { z: 1480, towers: [44, 452], deck: 46, top: 150 },
  yangpu: { z: -1620, towers: [16, 480], deck: 48, top: 208 },
};

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const _z = V(0, 0, 1), _q = new THREE.Quaternion();
// a straight member from a to b: a box w wide (horizontal, across) and h deep
function member(batch, a, b, w = 1, h = w) {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length();
  if (len < 1e-3) return;
  const g = new THREE.BoxGeometry(w, h, len);
  d.normalize();
  // keep the width horizontal: yaw to the direction's heading, then pitch up to it
  const yaw = Math.atan2(d.x, d.z), pitch = -Math.asin(Math.max(-1, Math.min(1, d.y)));
  g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ')));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  batch.push(g);
}
const box = (batch, x0, x1, y0, y1, z0, z1) => batch.box((x0 + x1) / 2, y0, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0);

// ---- a cable-stayed bridge across the river (along x), at z ----
// tower(batch, x): the tower's shape; anchors(x, side): where the cables leave it (heights)
function cableStayed({ z, towers: [ta, tb], deck, top, width = 30, tower, cableTops, lamps, lights, steel, dark }) {
  const span = tb - ta, side = span * 0.42;
  const x0 = ta - side - 260, x1 = tb + side + 260;
  // the deck: a box girder, edge beams, the lamp line along both edges
  box(dark, x0, x1, deck - 3.2, deck, z - width / 2, z + width / 2);
  box(steel, x0, x1, deck - 0.6, deck + 1.1, z - width / 2 - 0.4, z - width / 2 + 0.4);
  box(steel, x0, x1, deck - 0.6, deck + 1.1, z + width / 2 - 0.4, z + width / 2 + 0.4);
  for (let x = x0; x <= x1; x += 18) for (const s of [-1, 1]) lamps.push(x, deck + 6, z + s * (width / 2 - 1.5));
  // approach piers out on the banks, and the tall piers under the side spans
  for (let x = x0 + 30; x < x1; x += 60) {
    if (x > ta + 20 && x < tb - 20) continue;                             // (the main span is clear over the water)
    box(dark, x - 2.5, x + 2.5, -3, deck - 3.2, z - 6, z + 6);
  }
  for (const tx of [ta, tb]) {
    tower(tx);
    // two planes of fanned stays, out over the main span and back over the side span
    const tops = cableTops(tx), n = tops.length;
    for (let i = 0; i < n; i++) {
      const out = (i + 1) / n;
      for (const dir of [-1, 1]) {
        const reach = (dir === (tx === ta ? 1 : -1) ? span / 2 - 6 : side) * out;
        for (const s of [-1, 1]) {
          const t = tops[i], from = V(tx, t.y, z + s * t.dz), to = V(tx + dir * reach, deck + 0.6, z + s * (width / 2 - 1));
          member(lights, from, to, 0.35);
        }
      }
    }
  }
  return { x0, x1 };
}

export function createBridges() {
  const group = new THREE.Group(); group.name = 'bridges';
  const steel = new Batch(), dark = new Batch(), concrete = new Batch(), cables = new Batch(), gold = new Batch(), towerLit = new Batch();
  const lampPts = [], spiralPts = [], winPts = [];

  // ================= the Nanpu Bridge: H towers, and the spiral on the Puxi side =================
  {
    const N = BRIDGES.nanpu, z = N.z;
    const hTower = (tx) => {
      // two legs (a little batter) tied by a beam under the deck and a heavy beam at the top
      for (const s of [-1, 1]) {
        member(concrete, V(tx, -3, z + s * 19), V(tx, N.top, z + s * 15.5), 5.5, 7);
        member(towerLit, V(tx - 2.9, N.deck + 4, z + s * 17.6), V(tx - 2.9, N.top - 2, z + s * 15.6), 0.5);   // the lit edge (the Bund side)
      }
      box(concrete, tx - 3.5, tx + 3.5, N.deck - 9, N.deck - 3, z - 18, z + 18);
      box(concrete, tx - 3.5, tx + 3.5, N.top - 8, N.top, z - 17, z + 17);
      box(towerLit, tx - 3.8, tx - 3.4, N.top - 6, N.top - 2, z - 15, z + 15);
    };
    const tops = (tx) => Array.from({ length: 11 }, (_, i) => ({ y: N.top - 14 - i * 4.2, dz: 15.5 + i * 0.12 }));
    const { x0 } = cableStayed({ z, towers: N.towers, deck: N.deck, top: N.top, width: 30, tower: hTower, cableTops: tops, lamps: lampPts, lights: cables, steel, dark });
    // the spiral: the Puxi approach winds down two and a half turns round a central drum
    const cx = x0 - 70, cz = z + 10, R = 62, turns = 2.5, steps = 200;
    let prev = null;
    for (let i = 0; i <= steps; i++) {
      const f = i / steps, a = Math.PI / 2 + f * turns * Math.PI * 2, y = N.deck - f * (N.deck - 1);
      const p = V(cx + Math.cos(a) * R, y, cz + Math.sin(a) * R);
      if (prev) { member(dark, prev, p, 14, 2.6); }
      if (i % 3 === 0) { spiralPts.push(p.x, p.y + 5, p.z); }
      if (i % 9 === 0 && y > 4) box(dark, p.x - 1.6, p.x + 1.6, -2, y - 2.6, p.z - 1.6, p.z + 1.6);
      prev = p;
    }
    member(dark, V(cx + Math.cos(Math.PI / 2) * R, N.deck, cz + R), V(x0, N.deck - 1.6, z), 14, 2.6);      // into the deck
    concrete.cyl(cx, -3, cz, 9, 10, N.deck - 6, 16);
  }

  // ================= the Yangpu Bridge: diamond towers, the long span =================
  {
    const Y = BRIDGES.yangpu, z = Y.z;
    const diamond = (tx) => {
      // legs from narrow feet splay out to the deck, then lean in to meet in a spire: a diamond
      const kneeY = Y.deck - 4, headY = Y.top - 46;
      for (const s of [-1, 1]) {
        member(concrete, V(tx, -3, z + s * 9), V(tx, kneeY, z + s * 21), 5, 6.5);
        member(concrete, V(tx, kneeY, z + s * 21), V(tx, headY, z + s * 3), 5, 6.5);
        member(towerLit, V(tx - 2.7, kneeY + 3, z + s * 20.3), V(tx - 2.7, headY, z + s * 3.6), 0.5);
      }
      box(concrete, tx - 3.2, tx + 3.2, kneeY - 5, kneeY + 1, z - 21, z + 21);
      box(concrete, tx - 3.2, tx + 3.2, headY - 2, Y.top, z - 3.4, z + 3.4);
      box(towerLit, tx - 3.6, tx - 3.3, headY, Y.top - 1, z - 2.4, z + 2.4);
    };
    const tops = () => Array.from({ length: 16 }, (_, i) => ({ y: Y.top - 6 - i * 2.7, dz: 2.2 }));
    cableStayed({ z, towers: Y.towers, deck: Y.deck, top: Y.top, width: 32, tower: diamond, cableTops: tops, lamps: lampPts, lights: cables, steel, dark });
  }

  // ================= the Garden Bridge over Suzhou Creek, Broadway Mansions behind =================
  {
    const G = BRIDGES.garden, [cn, cs] = [G.creek[1], G.creek[0]];        // north and south banks (z)
    // Suzhou Creek: a dark strip of water from the river west, its embankments
    const creekMat = new THREE.MeshBasicMaterial({ color: 0x0b1820 });
    const creek = new THREE.Mesh(new THREE.PlaneGeometry(520, cs - cn), creekMat);
    creek.rotation.x = -Math.PI / 2; creek.position.set(L.deckEdgeX - 260, L.waterY + 0.05, (cn + cs) / 2); creek.name = 'suzhou-creek';
    group.add(creek);
    box(dark, -500, L.deckEdgeX, L.waterY, 1.2, cs, cs + 3); box(dark, -500, L.deckEdgeX, L.waterY, 1.2, cn - 3, cn);
    // the bridge: two spans north-south, a camelback Pratt truss down each side
    const x0 = G.x - 9, x1 = G.x + 9, zS = cs + 14, zN = cn - 14, mid = (zS + zN) / 2, deckY = 2.2;
    box(dark, x0 - 1, x1 + 1, deckY - 1.3, deckY, zN, zS);
    box(dark, x0 - 3, x1 + 3, -3, deckY - 1.3, mid - 2.5, mid + 2.5);                 // the pier in the creek
    for (const [a, b] of [[zN, mid], [mid, zS]]) {
      const n = 10, top = (k) => { const u = k / n; return deckY + 6 + 4.5 * Math.sin(Math.PI * u); };
      for (const x of [x0, x1]) {
        let pt = null, pb = null;
        for (let k = 0; k <= n; k++) {
          const zz = a + (b - a) * (k / n), t = V(x, top(k), zz), bot = V(x, deckY, zz);
          member(steel, bot, t, 0.5);                                                    // verticals
          if (pt) { member(steel, pt, t, 0.75); member(gold, V(x, pt.y + 0.5, pt.z), V(x, t.y + 0.5, t.z), 0.22); }   // top chord, its light line
          if (pb) member(steel, pb, bot, 0.7);                                           // bottom chord
          if (pt && k <= n / 2) member(steel, pb, t, 0.35); else if (pt) member(steel, pt, bot, 0.35);   // diagonals toward the middle
          pt = t; pb = bot;
        }
      }
      // portal bracing over the road at each end and across the top chord
      for (let k = 1; k < 10; k += 2) { const zz = a + (b - a) * (k / 10); member(steel, V(x0, top(k) - 0.4, zz), V(x1, top(k) - 0.4, zz), 0.4); }
    }
    // the road on to the north bank (Zhongshan Road → Daming Road) and the embankment lamps
    box(dark, x0 - 2, x1 + 2, -1, deckY - 1.3, zN - 70, zN);
    for (let zz = zN; zz <= zS; zz += 9) for (const x of [x0 - 0.3, x1 + 0.3]) lampPts.push(x, deckY + 4.2, zz);
    // Broadway Mansions (上海大厦, 1934): the stepped brick block on the north bank, warm windows
    const bx = G.x - 58, bz = cn - 85, steps = [[34, 30, 46], [28, 24, 62], [20, 18, 76]];
    for (const [w, d, h] of steps) box(dark, bx - w / 2, bx + w / 2, 0, h, bz - d / 2, bz + d / 2);
    for (const [w, d, h] of steps) for (let y = 6; y < h - 2; y += 3.6) for (let u = -w / 2 + 2; u < w / 2 - 1; u += 3) if (((u * 7 + y * 13) | 0) % 5 < 2) winPts.push(bx + u, y, bz + d / 2 + 0.3);
    // the old buildings along the north bank either side, low and dark
    for (const [x, w, h] of [[-150, 40, 26], [-210, 50, 34], [-280, 46, 22], [30, 30, 18]]) box(dark, x - w / 2, x + w / 2, 0, h, cn - 70, cn - 20);
  }

  // ---- the far banks the bridges land on (past where the Bund's own scenery ends) ----
  for (const [za, zb] of [[1150, 2100], [-2200, -1250]]) {
    box(dark, L.deckEdgeX - 400, L.deckEdgeX - 2, -3, 4, za, zb);                // Puxi: embankment and low city
    box(dark, 470, 1300, -3, 5, za, zb);                                         // Pudong
    for (let z = za; z < zb; z += 70) for (const [x, w] of [[-120, 50], [-260, 60], [640, 70], [820, 60]]) {
      const h = 20 + ((z * 13 + x * 7) & 63);
      box(dark, x - w / 2, x + w / 2, 0, h, z, z + 44);
      for (let y = 5; y < h - 3; y += 6) if (((y * 31 + z) & 7) < 3) winPts.push(x + (x < 0 ? w / 2 + 0.3 : -w / 2 - 0.3), y, z + 22);
    }
  }

  // ---- materials ----
  // structure: grey steel and concrete in daylight, a dark silhouette at night (the scene's own light)
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0xb8b6ae, roughness: 0.85 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x6d7275, roughness: 0.55, metalness: 0.35 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x55585a, roughness: 0.9 });
  // lights (on at dusk, off by day: dayNight.js), bright enough to carry through the haze
  const cableMat = asLight(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.1, 1.9) }), 'outline', 0.55);
  const towerMat = asLight(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.0, 1.4) }), 'floods', 0.5);
  const goldMat = asLight(new THREE.MeshBasicMaterial({ color: new THREE.Color(3.0, 2.2, 1.1) }), 'floods', 0.45);
  const pts = (arr, color, size, name, ch = 'lamps') => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    const m = asLight(new THREE.PointsMaterial({ color, size, sizeAttenuation: false }), ch, 0);
    const p = new THREE.Points(g, m); p.name = name; return p;
  };
  group.add(concrete.mesh(concreteMat, 'bridge-towers'), steel.mesh(steelMat, 'bridge-steel'), dark.mesh(darkMat, 'bridge-decks'),
    cables.mesh(cableMat, 'bridge-cables'), towerLit.mesh(towerMat, 'bridge-tower-lights'), gold.mesh(goldMat, 'garden-bridge-gold'),
    pts(lampPts, new THREE.Color(2.4, 1.9, 1.2), 2.2, 'bridge-lamps'), pts(spiralPts, new THREE.Color(2.6, 2.0, 1.2), 2.6, 'nanpu-spiral-lamps'),
    pts(winPts, new THREE.Color(1.6, 1.25, 0.8), 2, 'far-windows', 'windows'));
  group.traverse((o) => { o.layers.enable(REFLECT_LAYER); o.matrixAutoUpdate = false; o.updateMatrix(); });
  return { group };
}
