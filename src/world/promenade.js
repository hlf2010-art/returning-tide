// The raised waterfront promenade: granite deck, the broad stair up from the road,
// river railing, lamps, benches, planters.
import * as THREE from 'three';
import { L, deckLamps, DECK_LAMP_X, benches, planterIslands, telescope } from './layout.js';
import { batchSet, flush, Batch } from './geo.js';

const Y = L.deckY, FAR = 430;

export function lampGeometry(B, x, y, z) {
  B.granite.box(x, y, z, 0.56, 0.5, 0.56);
  B.granite.box(x, y + 0.5, z, 0.42, 0.14, 0.42);
  B.iron.cyl(x, y + 0.64, z, 0.13, 0.17, 1.9, 12);          // heavy fluted lower shaft
  B.iron.cyl(x, y + 2.54, z, 0.16, 0.16, 0.1, 12);
  B.iron.cyl(x, y + 2.64, z, 0.06, 0.1, 1.6, 10);
  B.iron.box(x, y + 3.86, z, 0.07, 0.07, 1.5);              // cross arm, along the river
  for (const s of [-1, 1]) {
    B.iron.cyl(x, y + 3.66, z + s * 0.68, 0.015, 0.015, 0.22, 6);
    B.lampGlass.add(new THREE.SphereGeometry(0.19, 12, 8), { x, y: y + 3.52, z: z + s * 0.68 });
    B.iron.cyl(x, y + 3.69, z + s * 0.68, 0.1, 0.16, 0.05, 10);
  }
  B.iron.cyl(x, y + 4.24, z, 0.05, 0.06, 0.12, 8);
  B.lampGlass.add(new THREE.SphereGeometry(0.24, 14, 10), { x, y: y + 4.52, z });
  B.iron.cyl(x, y + 4.74, z, 0.02, 0.12, 0.14, 8);
}

function tree(B, x, y, z, seed, { h = 3.4, spread = 2.1, leaf = 'leaf' } = {}) {
  let a = seed * 12.9898;
  const rnd = () => { a = Math.sin(a * 43758.5453 + 1.3) * 10000; return a - Math.floor(a); };
  B.bark.cyl(x, y, z, 0.12, 0.2, h * 0.7, 8);
  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * 6.283 + rnd(), len = h * 0.6, g = new THREE.CylinderGeometry(0.04, 0.1, len, 6);
    g.translate(0, len / 2, 0); g.rotateZ(0.5 + rnd() * 0.3); g.rotateY(ang);
    B.bark.add(g, { x, y: y + h * 0.62, z });
  }
  // canopy: a loose umbrella of soft clumps (sphere normals kept, so it shades smoothly)
  for (let i = 0; i < 13; i++) {
    const ang = rnd() * 6.283, rad = i < 2 ? 0.2 : spread * (0.3 + rnd() * 0.65);
    const r = spread * (0.3 + rnd() * 0.2);
    const g = new THREE.IcosahedronGeometry(r, 1), p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const j = 1 + Math.sin(p.getX(k) * 7.1 + p.getY(k) * 9.3 + p.getZ(k) * 5.7 + i * 2.0) * 0.14;
      p.setXYZ(k, p.getX(k) * j, p.getY(k) * j * 0.62, p.getZ(k) * j);
    }
    const lift = (1 - rad / (spread * 0.95)) * 0.9;
    B[leaf].add(g, { x: x + Math.cos(ang) * rad, y: y + h + 0.2 + lift + (rnd() - 0.5) * 0.5, z: z + Math.sin(ang) * rad });
  }
}
export { tree };

export function createPromenade(M) {
  const group = new THREE.Group(); group.name = 'promenade';
  const st = L.stair, hw = st.halfW;
  const B = batchSet(['deck', 'granite', 'iron', 'lampGlass', 'hedge', 'wood', 'steel', 'bark', 'leaf', 'binBlue', 'binGrey']);

  // deck surface (three slabs around the stair recess) and its granite body
  B.deck.floor(L.wallX, L.deckEdgeX, -FAR, -hw, Y, 4.8);
  B.deck.floor(L.wallX, L.deckEdgeX, hw, FAR, Y, 4.8);
  B.deck.floor(st.x1, L.deckEdgeX, -hw, hw, Y, 4.8);
  const depth = Y - L.waterY + 1.5;
  B.granite.box(14, Y - depth, -(FAR + hw) / 2, 24, depth - 0.01, FAR - hw);
  B.granite.box(14, Y - depth, (FAR + hw) / 2, 24, depth - 0.01, FAR - hw);
  B.granite.box((st.x1 + L.deckEdgeX) / 2, Y - depth, 0, L.deckEdgeX - st.x1, depth - 0.01, hw * 2);

  // the stair: 20 risers of 15 cm
  const run = (st.x1 - st.x0) / st.steps, rise = Y / st.steps;
  for (let i = 0; i < st.steps; i++) B.deck.box(st.x0 + (i + 0.5) * run, 0, 0, run, (i + 1) * rise, hw * 2, { tile: 4.8 });
  // parapets: along the road edge and down both sides of the stair
  for (const s of [-1, 1]) {
    const zc = s * (FAR + hw + 0.35) / 2, len = FAR - hw - 0.35;
    B.granite.box(L.wallX + 0.02, Y, zc, 0.36, 1.05, len);
    B.granite.box(L.wallX + 0.02, Y + 1.05, zc, 0.5, 0.1, len);
    B.granite.box(3.1, Y, zc, 1.8, 0.42, len);                   // hedge trough behind the parapet
    B.hedge.box(3.1, Y + 0.42, zc, 1.5, 0.5, len - 0.3);
    B.granite.box((st.x0 + st.x1) / 2 + 0.1, Y, s * (hw + 0.18), st.x1 - st.x0 + 0.2, 1.05, 0.36);
    B.granite.box((st.x0 + st.x1) / 2 + 0.1, Y + 1.05, s * (hw + 0.18), st.x1 - st.x0 + 0.3, 0.1, 0.5);
    B.granite.box(st.x1 + 0.2, Y, s * (hw + 0.18), 0.6, 1.3, 0.6);  // newel at the head of the stair
    B.granite.box(L.wallX - 0.05, 0, s * (hw + 0.18), 0.7, 1.25, 0.7); // and at its foot
  }

  // the road-side face of the retaining wall: plinth, piers, coping
  for (const s of [-1, 1]) {
    const zc = s * (FAR + hw + 0.7) / 2, len = FAR - hw - 0.7;
    B.granite.box(L.wallX - 0.1, 0, zc, 0.2, 0.6, len);
    B.granite.box(L.wallX - 0.08, Y - 0.3, zc, 0.3, 0.3, len);
    for (let z = hw + 3.4; z < FAR; z += 6) B.granite.box(L.wallX - 0.12, 0.6, s * z, 0.24, Y - 0.9, 0.8);
  }

  // river railing: plinth, posts, rails, pickets
  const rx = L.deckEdgeX + 0.08;
  B.granite.box(rx + 0.12, Y, 0, 0.5, 0.26, FAR * 2);
  B.iron.box(rx, Y + 1.14, 0, 0.11, 0.06, FAR * 2);
  B.iron.box(rx, Y + 1.04, 0, 0.05, 0.05, FAR * 2);
  B.iron.box(rx, Y + 0.38, 0, 0.05, 0.05, FAR * 2);
  for (let z = -FAR; z <= FAR; z += 2.4) {
    B.iron.box(rx, Y + 0.26, z, 0.1, 0.96, 0.1);
    if (Math.abs(z) < 200) B.iron.add(new THREE.SphereGeometry(0.07, 8, 6), { x: rx, y: Y + 1.26, z });
  }
  for (let z = -150; z <= 170; z += 0.16) B.iron.box(rx, Y + 0.4, z, 0.022, 0.64, 0.022);

  // lamps along the river
  for (const z of deckLamps) lampGeometry(B, DECK_LAMP_X, Y, z);

  // benches facing the water
  for (const b of benches) {
    for (const s of [-1, 1]) {
      B.iron.box(b.x - 0.02, Y, b.z + s * 0.95, 0.5, 0.42, 0.06);
      B.iron.box(b.x - 0.25, Y + 0.42, b.z + s * 0.95, 0.05, 0.46, 0.06, { rotY: 0 });
    }
    for (let k = 0; k < 4; k++) B.wood.box(b.x - 0.18 + k * 0.13, Y + 0.42, b.z, 0.11, 0.035, 2.1);
    for (let k = 0; k < 3; k++) B.wood.box(b.x - 0.27, Y + 0.52 + k * 0.13, b.z, 0.035, 0.1, 2.1);
  }

  // planter islands with a clipped hedge and a small tree each
  planterIslands.forEach((p, i) => {
    const cx = (p.x0 + p.x1) / 2, cz = (p.z0 + p.z1) / 2, w = p.x1 - p.x0, d = p.z1 - p.z0;
    B.granite.box(cx, Y, cz, w, 0.46, d);
    B.granite.box(cx, Y + 0.46, cz, w + 0.06, 0.06, d + 0.06);
    B.hedge.box(cx, Y + 0.52, cz, w - 0.7, 0.38, d - 0.7);
    tree(B, cx, Y + 0.5, cz + (i % 2 ? 1.5 : -1.5), i + 1, { h: 3.1, spread: 2.0 });
  });

  // coin telescope, pointed at Lujiazui
  const t = telescope;
  B.iron.cyl(t.x, Y, t.z, 0.16, 0.22, 0.12, 12); B.steel.cyl(t.x, Y + 0.12, t.z, 0.05, 0.06, 1.25, 10);
  B.steel.box(t.x, Y + 1.37, t.z, 0.2, 0.16, 0.22);
  for (const s of [-1, 1]) {
    const g = new THREE.CylinderGeometry(0.075, 0.06, 0.5, 12); g.rotateZ(Math.PI / 2 - 0.12);
    B.steel.add(g, { x: t.x + 0.12, y: Y + 1.58, z: t.z + s * 0.09 });
  }

  // paired litter bins at the head of the stair
  for (const s of [-1, 1]) {
    B.binGrey.box(st.x1 + 1.4, Y, s * (hw + 1.2) - 0.24, 0.42, 0.85, 0.42);
    B.binBlue.box(st.x1 + 1.4, Y, s * (hw + 1.2) + 0.24, 0.42, 0.85, 0.42);
    B.iron.box(st.x1 + 1.4, Y + 0.85, s * (hw + 1.2), 0.5, 0.05, 1.0);
  }

  const std = (o) => new THREE.MeshStandardMaterial(o);
  flush(B, {
    ...M, bark: std({ color: 0x3a3229, roughness: 0.9 }), leaf: std({ color: 0x2c4a2c, roughness: 0.8, emissive: 0x0b140a }),
    binBlue: std({ color: 0x1c4f8f, roughness: 0.5, metalness: 0.3 }), binGrey: std({ color: 0x3a3d40, roughness: 0.5, metalness: 0.3 }),
  }, group, 'prom-');
  return { group };
}
