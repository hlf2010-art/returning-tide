// The Gutzlaff Signal Tower (外滩信号台, 1907), at the Bund's south end where Yan'an Road meets the river:
// a slender rendered tower banded in red brick, a round balcony a third of the way up, a red-brick lantern
// stage at the top and a signal mast with its yard and rigging over it; at its foot, the two-storey signal
// station in red-and-white banded brick. Too far south to walk to (beyond the boundary at L.zSouth): you
// see it down the road and along the promenade, as on the photographs of 27 November 2026.
import * as THREE from 'three';
import { batchSet, flush } from './geo.js';
import { L } from './layout.js';

// where it stands: the river side of Zhongshan Road at Yan'an Road, on the game's shortened Bund
export const SIGNAL_TOWER = { x: -0.5, z: 352 };

export function createSignalTower() {
  const group = new THREE.Group(); group.name = 'signal-tower';
  const B = batchSet(['render', 'brick', 'iron', 'glass', 'white', 'mast']);
  const { x, z } = SIGNAL_TOWER, y0 = L.curbH, R = 1.65, H = 36;
  // the shaft: rendered cream, a red-brick band every 6 m (each a little proud), a slight taper
  B.render.cyl(x, y0, z, R * 0.93, R, H, 24);
  for (let k = 1; k <= 5; k++) B.brick.cyl(x, y0 + 4 + k * 5.6, z, R * (1 - k * 0.012) + 0.05, R * (1 - k * 0.012) + 0.05, 0.75, 24);
  // small slit windows up the shaft, one under each band
  for (let k = 1; k <= 5; k++) for (const a of [0.4, 2.4, 4.4]) {
    const r = R * (1 - k * 0.012) + 0.02;
    B.glass.add(new THREE.BoxGeometry(0.06, 0.9, 0.32), { x: x + Math.cos(a) * r, y: y0 + 2.2 + k * 5.6, z: z + Math.sin(a) * r, ry: -a });
  }
  // the round balcony at 12 m: a slab, a dark railing, brackets under it
  const by = y0 + 12;
  B.white.cyl(x, by, z, R + 1.5, R + 1.3, 0.35, 28);
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    B.iron.box(x + Math.cos(a) * (R + 1.42), by + 0.35, z + Math.sin(a) * (R + 1.42), 0.05, 1.0, 0.05);
    if (i % 4 === 0) B.white.add(new THREE.BoxGeometry(0.25, 0.9, 1.1), { x: x + Math.cos(a) * (R + 0.5), y: by - 0.45, z: z + Math.sin(a) * (R + 0.5), ry: -a });
  }
  B.iron.cyl(x, by + 1.32, z, R + 1.44, R + 1.44, 0.05, 28, { open: true });
  // the lantern stage: red brick, flared, a ring of small windows, a white cornice and a parapet
  const ty = y0 + H;
  B.brick.cyl(x, ty, z, R * 1.08, R * 0.93, 1.2, 24);
  B.brick.cyl(x, ty + 1.2, z, R * 1.05, R * 1.05, 2.4, 24);
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; B.glass.add(new THREE.BoxGeometry(0.06, 0.8, 0.4), { x: x + Math.cos(a) * R * 1.06, y: ty + 2.0, z: z + Math.sin(a) * R * 1.06, ry: -a }); }
  B.white.cyl(x, ty + 3.6, z, R * 1.25, R * 1.12, 0.3, 24);
  for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; B.iron.box(x + Math.cos(a) * R * 1.2, ty + 3.9, z + Math.sin(a) * R * 1.2, 0.04, 0.9, 0.04); }
  B.iron.cyl(x, ty + 4.78, z, R * 1.2, R * 1.2, 0.04, 20, { open: true });
  // the signal mast: a lattice of four legs braced, the yard across it, a topmast, stays down to the parapet
  const my = ty + 3.9, mh = 13;
  for (const [dx, dz] of [[-0.35, -0.35], [0.35, -0.35], [0.35, 0.35], [-0.35, 0.35]]) B.mast.cyl(x + dx * 0.6, my, z + dz * 0.6, 0.04, 0.06, mh, 6);
  for (let k = 0; k < 9; k++) for (const [dx, dz, ry] of [[0, -0.21, 0], [0.21, 0, Math.PI / 2], [0, 0.21, 0], [-0.21, 0, Math.PI / 2]]) B.mast.add(new THREE.BoxGeometry(0.42, 0.03, 0.03), { x: x + dx, y: my + 1 + k * 1.4, z: z + dz, ry });
  B.mast.cyl(x, my + mh, z, 0.03, 0.05, 4.5, 6);
  B.mast.add(new THREE.BoxGeometry(9.5, 0.12, 0.12), { x, y: my + mh - 1.2, z });            // the yard, across the river line
  B.mast.add(new THREE.BoxGeometry(0.08, 0.08, 3.6), { x, y: my + mh + 2.6, z });             // and a gaff above
  for (const sx of [-1, 1]) {
    const len = Math.hypot(4.6, mh - 1.2), g = new THREE.CylinderGeometry(0.012, 0.012, len, 3);
    g.rotateZ(sx * Math.atan2(4.6, mh - 1.2));
    B.mast.add(g, { x: x + sx * 2.3, y: my + (mh - 1.2) / 2, z });
  }
  // the station at its foot: two storeys of red-and-white banded brick, arched windows, a white cornice
  const s0 = z + 3.2, s1 = z + 15, sx0 = x - 3.4, sx1 = x + 4.2, sh = 8.4;
  for (let k = 0, yy = y0; yy < y0 + sh - 0.01; k++, yy += 0.42) (k % 2 ? B.white : B.brick).box((sx0 + sx1) / 2, yy, (s0 + s1) / 2, sx1 - sx0, Math.min(0.42, y0 + sh - yy), s1 - s0, { tile: 4 });
  B.white.box((sx0 + sx1) / 2, y0 + sh, (s0 + s1) / 2, sx1 - sx0 + 0.5, 0.5, s1 - s0 + 0.5);
  for (const zz of [s0 + 0.8, (s0 + s1) / 2 - 1.4, (s0 + s1) / 2 + 1.4, s1 - 0.8]) B.white.box((sx0 + sx1) / 2, y0 + sh + 0.5, zz, sx1 - sx0, 0.9, 0.5);   // the parapet's piers
  for (const fl of [0, 1]) for (let i = 0; i < 4; i++) {
    const zz = s0 + 1.8 + i * 2.8, yy = y0 + 1.1 + fl * 4;
    B.glass.box(sx0 - 0.03, yy, zz, 0.06, 2.3, 1.2);
    B.white.add(new THREE.CylinderGeometry(0.66, 0.66, 0.12, 14, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateY(Math.PI / 2), { x: sx0 - 0.05, y: yy + 2.3, z: zz });
  }
  B.glass.box(x - 1.67, y0, z, 0.06, 2.6, 1.3);                                                   // the tower's door, to the road
  const std = (o) => new THREE.MeshStandardMaterial(o);
  flush(B, {
    render: std({ color: 0xe8e0cc, roughness: 0.85 }), brick: std({ color: 0x8e3b2a, roughness: 0.9 }), white: std({ color: 0xece6d8, roughness: 0.8 }),
    iron: std({ color: 0x1b1d20, roughness: 0.5, metalness: 0.6 }), glass: std({ color: 0x1a222a, roughness: 0.15, metalness: 0.4 }), mast: std({ color: 0x2a2c2f, roughness: 0.5, metalness: 0.5 }),
  }, group, 'signal-');
  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { group };
}
