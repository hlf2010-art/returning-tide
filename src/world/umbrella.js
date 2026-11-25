// An umbrella canopy as it really sits: a shallow dome on eight ribs, the fabric drawn taut along each rib
// and drooping a touch between them, so the hem runs in scallops (low at the rib tips, lifted between), a
// ferrule on top. Apex at the origin, the canopy hanging below it; r is the open radius (m), h the depth.
// Shared by the crowd, the Bund's pedestrians and the player's own umbrella.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const cache = new Map();
export function canopyGeometry({ r = 0.52, h = 0.24, ribs = 8, rings = 6, perRib = 4 } = {}) {
  const key = `${r}|${h}|${ribs}|${rings}|${perRib}`;
  if (cache.has(key)) return cache.get(key);
  const S = ribs * perRib, pos = [], idx = [];
  pos.push(0, 0, 0);                                                    // the apex
  for (let i = 1; i <= rings; i++) {
    const t = i / rings;
    for (let j = 0; j < S; j++) {
      const a = (j / S) * Math.PI * 2, between = 1 - Math.abs(Math.cos((ribs * a) / 2));   // 0 on a rib, 1 midway
      const rr = r * t * (1 - 0.055 * between * t);                     // the panel pulled in between ribs
      const y = -h * (0.82 * t * t + 0.18 * t) + 0.04 * between * t * t * t;   // the dome; the hem lifted between ribs
      pos.push(Math.cos(a) * rr, y, Math.sin(a) * rr);
    }
  }
  for (let j = 0; j < S; j++) idx.push(0, 1 + ((j + 1) % S), 1 + j);
  for (let i = 1; i < rings; i++) for (let j = 0; j < S; j++) {
    const a = 1 + (i - 1) * S + j, b = 1 + (i - 1) * S + ((j + 1) % S), c = 1 + i * S + j, d = 1 + i * S + ((j + 1) % S);
    idx.push(a, b, d, a, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const tip = new THREE.CylinderGeometry(0.006, 0.01, 0.07, 6); tip.translate(0, 0.03, 0); tip.deleteAttribute('uv');
  const out = mergeGeometries([g.toNonIndexed(), tip.toNonIndexed()]);
  out.computeBoundingSphere();
  cache.set(key, out);
  return out;
}
