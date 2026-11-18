// Re-weight a rigged generated body's fingers to their own bones, by geometry.
//   node fingers.mjs IN.glb OUT.glb
// rig.mjs transfers weights from the nearest Rocketbox vertices; the Rocketbox fingers lie elsewhere than
// the generated hand's, so each finger ended up partly bound to its neighbours' bones, and any finger
// pose (a clip's, or closing the hand round a cup) tore the hand. Here, for every vertex the hand and
// fingers own, the bind-pose skeleton decides. The fitted Rocketbox finger bones don't sit inside his
// modelled fingers, so which finger a vertex is can't be told reliably: the four fingers move as one, in
// bands along the hand past the knuckle line on the middle finger's three bones (they close round a cup
// together), and the thumb stays with the hand. The share that belonged to the forearm is kept.
import { io, arr } from './common.mjs';
import * as THREE from 'three';

const [IN, OUT] = process.argv.slice(2);
const doc = await io.read(IN);
const root = doc.getRoot(), skin = root.listSkins()[0], joints = skin.listJoints();
const ibm = arr(skin.getInverseBindMatrices());
const idx = new Map(joints.map((j, i) => [j.getName(), i]));
const bindPos = (name) => { const i = idx.get(name); const m = new THREE.Matrix4().fromArray(ibm, i * 16).invert(); return new THREE.Vector3().setFromMatrixPosition(m); };

for (const S of ['L', 'R']) {
  const hand = idx.get(`Bip01_${S}_Hand`); if (hand == null) continue;
  const H = bindPos(`Bip01_${S}_Hand`);
  // segments: [a, b, joint index, parent joint index (for the blend across the joint)]
  const segs = []; let M = null;
  for (let k = 0; k <= 4; k++) {
    const names = [`Bip01_${S}_Finger${k}`, `Bip01_${S}_Finger${k}1`, `Bip01_${S}_Finger${k}2`];
    if (!names.every((n) => idx.has(n))) continue;
    const p = names.map(bindPos), tip = p[2].clone().add(p[2].clone().sub(p[1]).multiplyScalar(0.95));
    segs.push([H, p[0], hand, hand, true, k]);                                      // the palm, to this finger's base
    segs.push([p[0], p[1], idx.get(names[0]), hand, false, k]);
    segs.push([p[1], p[2], idx.get(names[1]), idx.get(names[0]), false, k]);
    segs.push([p[2], tip, idx.get(names[2]), idx.get(names[1]), false, k]);
    if (k === 2) { const kc = [1, 2, 3, 4].map((q) => bindPos(`Bip01_${S}_Finger${q}`)).reduce((a, b) => a.add(b), new THREE.Vector3()).multiplyScalar(0.25);
      const dir = kc.clone().sub(H).normalize(), k0 = kc.clone().sub(H).dot(dir);
      M = { dir, k: k0, j1: k0 + p[1].distanceTo(p[0]), j2: k0 + p[1].distanceTo(p[0]) + p[2].distanceTo(p[1]), b0: idx.get(names[0]), b1: idx.get(names[1]), b2: idx.get(names[2]) }; }
  }
  const own = new Set([hand, ...segs.map((s) => s[2])]);
  let changed = 0;
  for (const mesh of root.listMeshes()) for (const prim of mesh.listPrimitives()) {
    const J = prim.getAttribute('JOINTS_0'), W = prim.getAttribute('WEIGHTS_0'); if (!J || !W) continue;
    const P = prim.getAttribute('POSITION'), n = P.getCount(), v = new THREE.Vector3(), ab = new THREE.Vector3(), av = new THREE.Vector3();
    const j = [], w = [], pp = [];
    for (let i = 0; i < n; i++) {
      J.getElement(i, j); W.getElement(i, w);
      let mine = 0; for (let c = 0; c < 4; c++) if (own.has(j[c])) mine += w[c];
      if (mine < 0.05) continue;
      P.getElement(i, pp); v.fromArray(pp);
      // the nearest segment (and how far along it): a thumb's stays with the hand (rigid)
      let best = null, bd = Infinity, bt = 0;
      for (const s of segs) {
        ab.subVectors(s[1], s[0]); const L2 = ab.lengthSq() || 1e-6;
        const t = Math.max(0, Math.min(1, av.subVectors(v, s[0]).dot(ab) / L2));
        const d = av.subVectors(v, s[0]).addScaledVector(ab, -t).lengthSq();
        if (d < bd) { bd = d; best = s; bt = t; }
      }
      const add = new Map();
      if (best[5] === 0) add.set(hand, mine);
      else {
        // the four fingers as one (the bones don't sit in his fingers, so which finger can't be told):
        // bands along the hand past the knuckle line, on the middle finger's three bones
        const x = av.subVectors(v, H).dot(M.dir), bands = [[M.k, hand, M.b0], [M.j1, M.b0, M.b1], [M.j2, M.b1, M.b2]];
        let bone = hand, prev = hand, edge = -1e9;
        for (const [at, before, b] of bands) if (x > at - 0.9) { bone = b; prev = before; edge = at; }
        const f = edge > -1e9 ? Math.min(1, (x - (edge - 0.9)) / 1.8) : 1;          // across 1.8 cm round each joint
        add.set(bone, f * mine); if (f < 1) add.set(prev, (add.get(prev) || 0) + (1 - f) * mine);
      }
      // keep what wasn't the hand's (the forearm's share at the wrist), put the hand's share where it belongs
      const keep = new Map(); for (let c = 0; c < 4; c++) if (w[c] > 0 && !own.has(j[c])) keep.set(j[c], (keep.get(j[c]) || 0) + w[c]);
      for (const [b, x] of add) keep.set(b, (keep.get(b) || 0) + x);
      const top = [...keep].sort((a, b) => b[1] - a[1]).slice(0, 4), sum = top.reduce((s, x) => s + x[1], 0) || 1;
      const nj = [0, 0, 0, 0], nw = [0, 0, 0, 0]; top.forEach(([b, x], c) => { nj[c] = b; nw[c] = x / sum; });
      J.setElement(i, nj); W.setElement(i, nw); changed++;
    }
  }
  console.log(`${S} hand: ${segs.length} segments, ${changed} vertices re-weighted`);
}
await io.write(OUT, doc);
