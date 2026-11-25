// Nanjing Road's great department stores (四大公司) as they stand: their corner towers, built stage by stage
// on top of the street builder's blocks (world/nanjingRoad.js). Each tower is a stack of stages, from the
// bottom: a square or octagonal shaft, a ring of columns round a core, a drum, a dome, a lantern, a
// spire, a flagpole. Materials are the street's batches (stone, copper, bronze, roof...), floodlit at
// night like the rest of the façades. What each building is: docs/nanjing-road-landmarks.md.
import * as THREE from 'three';

const oct = (r, h) => new THREE.CylinderGeometry(r, r, h, 8, 1).rotateY(Math.PI / 8);
// stages: [{ kind, w (across), h, mat, cols, flood, cap (a cornice slab on top: { out, h }) }]
//   box | oct | cyl      a shaft
//   colonnade            columns round a core (core: its width as a fraction), an entablature on top
//   dome                 half a sphere, squashed or stretched to h
//   cone                 a spire (8 sides)
//   pole                 a flagpole
export function tower(B, { x, z, y0 = 0, stages, flood = 0.9 }) {
  let y = y0;
  for (const s of stages) {
    const m = B[s.mat || 'stone'], w = s.w, h = s.h, f = { flood: s.flood ?? flood };
    if (s.kind === 'box') m.box(x, y, z, w, h, s.d || w, f);
    else if (s.kind === 'oct') m.add(oct(w / 2 / Math.cos(Math.PI / 8), h), { x, y: y + h / 2, z, ...f });
    else if (s.kind === 'cyl') m.add(new THREE.CylinderGeometry(w / 2, (s.w0 || w) / 2, h, 20, 1), { x, y: y + h / 2, z, ...f });
    else if (s.kind === 'colonnade') {
      const n = s.cols || 8, r = w / 2 - 0.25, core = B[s.coreMat || 'glassDark'];
      core.add(s.round ? new THREE.CylinderGeometry(w * (s.core || 0.55) / 2, w * (s.core || 0.55) / 2, h, 16, 1) : oct(w * (s.core || 0.55) / 2, h), { x, y: y + h / 2, z, ...f });
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + (s.phase || Math.PI / n);
        m.add(new THREE.CylinderGeometry(s.r || 0.2, (s.r || 0.2) * 1.12, h - 0.3, 10, 1), { x: x + Math.cos(a) * r, y: y + 0.15 + (h - 0.3) / 2, z: z + Math.sin(a) * r, ...f });
      }
      m.add(s.round ? new THREE.CylinderGeometry(w / 2 + 0.1, w / 2 + 0.1, 0.3, 20, 1) : oct(w / 2 / Math.cos(Math.PI / 8) + 0.1, 0.3), { x, y: y + h - 0.15, z, ...f });   // the entablature
      m.add(s.round ? new THREE.CylinderGeometry(w / 2, w / 2, 0.15, 20, 1) : oct(w / 2 / Math.cos(Math.PI / 8), 0.15), { x, y: y + 0.075, z, ...f });               // the base
    } else if (s.kind === 'dome') m.add(new THREE.SphereGeometry(w / 2, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), { x, y, z, sy: h / (w / 2), ...f });
    else if (s.kind === 'cone') m.add(new THREE.ConeGeometry(w / 2, h, s.sides || 8, 1), { x, y: y + h / 2, z, ...f });
    else if (s.kind === 'pole') m.add(new THREE.CylinderGeometry(0.04, 0.06, h, 6, 1), { x, y: y + h / 2, z, ...f });
    if (s.cap) { const c = s.cap; m.box(x, y + h - c.h, z, w + 2 * c.out, c.h, (s.d || w) + 2 * c.out, f); }
    y += h;
  }
  return y;
}
