import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import * as THREE from 'three';
export const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
export const arr = (acc) => { const n = acc.getCount(), k = acc.getElementSize(), out = new Float32Array(n * k), e = []; for (let i = 0; i < n; i++) { acc.getElement(i, e); for (let j = 0; j < k; j++) out[i * k + j] = e[j]; } return out; };
// landmarks of an A-posed body in RB mesh space (z up, cm, left = +x, forward = -y)
export function landmarks(P) {
  const n = P.length / 3; let H = -1e9; for (let i = 0; i < n; i++) H = Math.max(H, P[i * 3 + 2]);
  // crotch: highest z (below 0.6H) where nothing occupies |x|<1.5cm in the body's depth band
  let crotch = 0;
  for (let z = 0.3 * H; z < 0.6 * H; z += 0.25) { let hit = false; for (let i = 0; i < n; i++) { const pz = P[i * 3 + 2]; if (pz > z && pz < z + 0.6 && Math.abs(P[i * 3]) < 1.5) { hit = true; break; } } if (!hit) crotch = z; }
  // fingertips: the farthest point to each side
  const tip = { L: [0, 0, 0], R: [0, 0, 0] };
  for (let i = 0; i < n; i++) { const x = P[i * 3]; if (x > tip.L[0]) tip.L = [x, P[i * 3 + 1], P[i * 3 + 2]]; if (x < tip.R[0]) tip.R = [x, P[i * 3 + 1], P[i * 3 + 2]]; }
  // torso half-width at waist (0.55H) and chest just under the armpits (0.68H): the central run of occupied 1cm bins
  const halfWidth = (zc) => { const bins = new Set(); for (let i = 0; i < n; i++) { const pz = P[i * 3 + 2]; if (Math.abs(pz - zc) < 0.8) bins.add(Math.round(P[i * 3])); } let a = 0, b = 0; while (bins.has(a - 1) || bins.has(a - 2)) a--; while (bins.has(b + 1) || bins.has(b + 2)) b++; return (b - a) / 2; };
  return { H, crotch, tip, waist: halfWidth(0.55 * H), chest: halfWidth(0.68 * H), hips: halfWidth(crotch + 0.06 * H) };
}
export function newMeshPositions(doc) {
  // the generated mesh: y-up metres facing +z (after its node's +90° x rotation) -> RB mesh space (x, -z, y) cm
  const node = doc.getRoot().listNodes().find((n) => n.getMesh()); const prim = node.getMesh().listPrimitives()[0];
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...node.getTranslation()), new THREE.Quaternion(...node.getRotation()), new THREE.Vector3(...node.getScale()));
  const P = arr(prim.getAttribute('POSITION')), N = arr(prim.getAttribute('NORMAL')), n = P.length / 3, v = new THREE.Vector3(), nm = new THREE.Matrix3().getNormalMatrix(m);
  const out = new Float32Array(n * 3), outN = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { v.fromArray(P, i * 3).applyMatrix4(m); out[i * 3] = v.x * 100; out[i * 3 + 1] = -v.z * 100; out[i * 3 + 2] = v.y * 100; v.fromArray(N, i * 3).applyMatrix3(nm).normalize(); outN[i * 3] = v.x; outN[i * 3 + 1] = -v.z; outN[i * 3 + 2] = v.y; }
  return { P: out, N: outN, prim, node };
}
// dense points on a mesh's surface (so a low-poly body measures like a dense one)
export function surfaceSamples(P, I, per = 6) {
  const out = []; for (let t = 0; t < I.length; t += 3) { const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    for (let s = 0; s < per; s++) { let u = Math.random(), v = Math.random(); if (u + v > 1) { u = 1 - u; v = 1 - v; } const w = 1 - u - v; out.push(P[a] * w + P[b] * u + P[c] * v, P[a + 1] * w + P[b + 1] * u + P[c + 1] * v, P[a + 2] * w + P[b + 2] * u + P[c + 2] * v); } }
  return Float32Array.from(out);
}
export function allIndices(mesh) { const out = []; for (const p of mesh.listPrimitives()) { const ix = p.getIndices(); for (let i = 0; i < ix.getCount(); i++) out.push(ix.getScalar(i)); } return out; }
