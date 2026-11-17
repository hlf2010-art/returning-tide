import * as THREE from 'three';
import { io, arr, newMeshPositions, surfaceSamples, allIndices } from './common.mjs';
// arm centreline (slice centroids of the separated arm, left side), its line, and the shoulder top above it
export function shoulderEstimate(P) {
  const n = P.length / 3, cents = [];
  for (let z = 95; z < 150; z += 1.5) {
    const xs = []; for (let i = 0; i < n; i++) { const pz = P[i * 3 + 2]; if (Math.abs(pz - z) < 0.75 && P[i * 3] > 0) xs.push(P[i * 3]); }
    if (xs.length < 8) continue; xs.sort((a, b) => a - b);
    // the largest gap (> 1.5 cm) splits torso from arm
    let g = -1, gx = 0; for (let k = 1; k < xs.length; k++) if (xs[k] - xs[k - 1] > Math.max(1.5, g)) { g = xs[k] - xs[k - 1]; gx = k; }
    if (g < 1.5) continue;
    const arm = xs.slice(gx); if (arm.length < 4) continue;
    cents.push({ z, x: (arm[0] + arm[arm.length - 1]) / 2, torsoEdge: xs[gx - 1], armIn: arm[0] });
  }
  const armpit = cents.reduce((m, c) => (c.z > m.z ? c : m), cents[0]);
  // line x(z) through the centroids from 12 cm below the armpit up to it
  const pts = cents.filter((c) => c.z > armpit.z - 14); const mz = pts.reduce((s, c) => s + c.z, 0) / pts.length, mx = pts.reduce((s, c) => s + c.x, 0) / pts.length;
  const slope = pts.reduce((s, c) => s + (c.z - mz) * (c.x - mx), 0) / pts.reduce((s, c) => s + (c.z - mz) ** 2, 0);   // dx/dz
  // shoulder top: the highest surface above the line, near the armpit's x
  let top = 0; const xT = armpit.torsoEdge + 2; for (let i = 0; i < n; i++) if (Math.abs(P[i * 3] - xT) < 1.2 && P[i * 3 + 2] > top && P[i * 3 + 2] < 165) top = P[i * 3 + 2];
  return { armpit, slope, mx, mz, top, n: cents.length };
}
if (process.argv[2]) {
  const A = await io.read(process.argv[2]), mesh = A.getRoot().listMeshes()[0];
  const S = surfaceSamples(arr(mesh.listPrimitives()[0].getAttribute('POSITION')), allIndices(mesh), 14);
  const f = (o) => JSON.stringify(o, (k, v) => (typeof v === 'number' ? +v.toFixed(1) : v));
  console.log('RB ', f(shoulderEstimate(S)), '(true joint 21, 142.8)');
  const B = await io.read(process.argv[3]); const nb = newMeshPositions(B); let H = 0; for (let i = 2; i < nb.P.length; i += 3) H = Math.max(H, nb.P[i]); for (let i = 0; i < nb.P.length; i++) nb.P[i] *= 182 / H;
  console.log('NEW', f(shoulderEstimate(nb.P)));
}
