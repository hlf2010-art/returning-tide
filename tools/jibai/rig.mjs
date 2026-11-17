// Rig the generated Ji Bai (a static mesh) with the game's Rocketbox Biped skeleton, so every clip the game
// plays on the player works on him unchanged.
//   1. his mesh into the Rocketbox mesh space: z up, centimetres, facing -y, scaled to the same 182 cm
//   2. the skeleton fitted to him: the RB bind pose, with each arm chain turned and scaled about the
//      shoulder to reach his fingertips, each leg chain about the hip to reach his ankles, and the spine
//      and head moved front/back to his body's middle; joints keep their own rotations' frames
//   3. weights: the RB body deformed into that fitted pose, then each of his vertices takes the blended
//      weights of its nearest RB vertices (normals agreeing), fingers to the hand, face to the head,
//      smoothed over his mesh, four influences
//   4. written as one GLB with the RB hierarchy (names, structure) so people.js and playerBody.js take it
import { Document, Accessor } from '@gltf-transform/core';
import * as THREE from 'three';
import { io, arr, newMeshPositions, surfaceSamples, allIndices } from './common.mjs';
import { shoulderEstimate } from './shoulder.mjs';

const [,, RB_FILE, NEW_FILE, OUT] = process.argv;
const A = await io.read(RB_FILE), B = await io.read(NEW_FILE);
// ---------- the RB skeleton ----------
const skin = A.getRoot().listSkins()[0], joints = skin.listJoints(), J = joints.length;
const ibmAcc = skin.getInverseBindMatrices(), IBM = joints.map((_, i) => new THREE.Matrix4().fromArray(ibmAcc.getElement(i, [])));
const Bm = IBM.map((m) => m.clone().invert());                                   // joint bind matrices in mesh space
const jIndex = new Map(joints.map((j, i) => [j, i])), byName = Object.fromEntries(joints.map((j, i) => [j.getName(), i]));
const sceneRoot = A.getRoot().listScenes()[0].listChildren()[0];
const meshNodeA = A.getRoot().listNodes().find((n) => n.getMesh());
const local = (n) => new THREE.Matrix4().compose(new THREE.Vector3(...n.getTranslation()), new THREE.Quaternion(...n.getRotation()), new THREE.Vector3(...n.getScale()));
const parentOf = new Map(); const walk = (n) => n.listChildren().forEach((c) => { parentOf.set(c, n); walk(c); }); walk(sceneRoot);
const worldRest = (n) => { let m = local(n); for (let p = parentOf.get(n); p; p = parentOf.get(p)) m = local(p).multiply(m); return m; };
// M: mesh space -> world at bind (the same for every joint if the rest pose is the bind pose)
const M = worldRest(joints[byName.Bip01_Pelvis]).multiply(IBM[byName.Bip01_Pelvis]);
const M2 = worldRest(joints[byName.Bip01_L_Hand]).multiply(IBM[byName.Bip01_L_Hand]);
const diff = M.elements.reduce((s, v, i) => s + Math.abs(v - M2.elements[i]), 0);
console.log('rest == bind:', diff.toFixed(4));
const pos = (i) => new THREE.Vector3().setFromMatrixPosition(Bm[i]);

// ---------- his mesh, in RB mesh space at 182 cm ----------
const nb = newMeshPositions(B); let H = 0; for (let i = 2; i < nb.P.length; i += 3) H = Math.max(H, nb.P[i]);
// as tall as the skeleton's own body (182 cm for the Rocketbox man, the woman's own height for hers), so the clips' hip height fits
const rbHeight = (() => { const m = A.getRoot().listMeshes()[0], a = m.listPrimitives()[0].getAttribute('POSITION'); let h = 0; const e = []; for (let i = 0; i < a.getCount(); i++) h = Math.max(h, a.getElement(i, e)[2]); return h; })();
const S = rbHeight / H; for (let i = 0; i < nb.P.length; i++) nb.P[i] *= S;
console.log('height', rbHeight.toFixed(1), 'cm');
const P = nb.P, N = nb.N, nV = P.length / 3;
const pts = (f) => { const out = []; for (let i = 0; i < nV; i++) if (f(P[i * 3], P[i * 3 + 1], P[i * 3 + 2])) out.push(new THREE.Vector3(P[i * 3], P[i * 3 + 1], P[i * 3 + 2])); return out; };
const mean = (a) => a.reduce((s, v) => s.add(v), new THREE.Vector3()).multiplyScalar(1 / Math.max(1, a.length));
const tip = { L: new THREE.Vector3(), R: new THREE.Vector3() };
for (let i = 0; i < nV; i++) { const x = P[i * 3]; if (x > tip.L.x) tip.L.set(x, P[i * 3 + 1], P[i * 3 + 2]); if (x < tip.R.x) tip.R.set(x, P[i * 3 + 1], P[i * 3 + 2]); }
const ankle = { L: mean(pts((x, y, z) => x > 2 && z > 6 && z < 12)), R: mean(pts((x, y, z) => x < -2 && z > 6 && z < 12)) };
const midY = (z0, z1, w = 9) => mean(pts((x, y, z) => Math.abs(x) < w && z > z0 && z < z1)).y;
// the RB fingertip and ankle (from the RB mesh: the farthest point out, and the ankle band's middle)
const rbMesh = A.getRoot().listMeshes()[0], rbPrim = rbMesh.listPrimitives()[0];
const rbP = arr(rbPrim.getAttribute('POSITION')), rbN = arr(rbPrim.getAttribute('NORMAL')), rbJ = arr(rbPrim.getAttribute('JOINTS_0')), rbW = arr(rbPrim.getAttribute('WEIGHTS_0'));
const used = new Uint8Array(rbP.length / 3); for (const p of rbMesh.listPrimitives()) { const ix = p.getIndices(); for (let i = 0; i < ix.getCount(); i++) used[ix.getScalar(i)] = 1; }
const rbTip = { L: new THREE.Vector3(), R: new THREE.Vector3() }; const rbAnk = { L: [], R: [] };
for (let i = 0; i < used.length; i++) { if (!used[i]) continue; const x = rbP[i * 3], y = rbP[i * 3 + 1], z = rbP[i * 3 + 2]; if (x > rbTip.L.x) rbTip.L.set(x, y, z); if (x < rbTip.R.x) rbTip.R.set(x, y, z); if (z > 6 && z < 12) (x > 2 ? rbAnk.L : x < -2 ? rbAnk.R : []).push(new THREE.Vector3(x, y, z)); }
const rbAnkle = { L: mean(rbAnk.L), R: mean(rbAnk.R) };
console.log('tips', tip.L.toArray().map((v) => v.toFixed(1)), 'rb', rbTip.L.toArray().map((v) => v.toFixed(1)), '| ankles', ankle.L.toArray().map((v) => v.toFixed(1)), 'rb', rbAnkle.L.toArray().map((v) => v.toFixed(1)));

// ---------- fit ----------
const fit = Bm.map((m) => m.clone());                                           // fitted bind matrices (mesh space)
const descendants = (root) => { const out = []; const rec = (n) => { if (jIndex.has(n)) out.push(jIndex.get(n)); n.listChildren().forEach(rec); }; rec(joints[root]); return out; };
// turn + scale a chain about its first joint so `from` lands on `to`: positions scaled, frames only turned
function fitChain(rootName, from, to, pivotAt = null) {
  const r = byName[rootName], pivot = pivotAt || pos(r), a = from.clone().sub(pivot), b = to.clone().sub(pivot), k = b.length() / a.length();
  const q = new THREE.Quaternion().setFromUnitVectors(a.clone().normalize(), b.clone().normalize()), R = new THREE.Matrix4().makeRotationFromQuaternion(q);
  for (const i of descendants(r)) { const p = new THREE.Vector3().setFromMatrixPosition(fit[i]).sub(pivot).applyQuaternion(q).multiplyScalar(k).add(pivot); const rot = new THREE.Matrix4().extractRotation(fit[i]); fit[i] = R.clone().multiply(rot).setPosition(p); }
  console.log(rootName, 'scale', k.toFixed(3), 'turn', (2 * Math.acos(Math.min(1, Math.abs(q.w))) * 180 / Math.PI).toFixed(1) + '°');
}
// the spine, neck and head: front/back to his middle (his torso's own centre line, a little toward the back)
const shiftY = (name, dy) => { for (const i of descendants(byName[name])) { const p = new THREE.Vector3().setFromMatrixPosition(fit[i]); p.y += dy; fit[i].setPosition(p); } };
const rbS = surfaceSamples(rbP, allIndices(rbMesh), 14);
const depthMid = (Q, z0, z1, w) => { let lo = 1e9, hi = -1e9; for (let i = 0; i < Q.length / 3; i++) { const z = Q[i * 3 + 2]; if (z > z0 && z < z1 && Math.abs(Q[i * 3]) < w) { lo = Math.min(lo, Q[i * 3 + 1]); hi = Math.max(hi, Q[i * 3 + 1]); } } return (lo + hi) / 2; };
const slabs = [[86, 92, 6], [105, 112, 6], [125, 132, 6], [150, 155, 4]];
const dY = slabs.reduce((s, [a, b, w]) => s + depthMid(P, a, b, w) - depthMid(rbS, a, b, w), 0) / slabs.length;
for (let i = 1; i < P.length; i += 3) P[i] -= dY;                                 // his body moved front/back onto the RB's
console.log('front/back offset', dY.toFixed(2), 'cm (removed)');
if (false) {
const torsoY = midY(95, 125), rbTorsoY = (() => { const a = []; for (let i = 0; i < used.length; i++) if (used[i] && Math.abs(rbP[i * 3]) < 9 && rbP[i * 3 + 2] > 95 && rbP[i * 3 + 2] < 125) a.push(rbP[i * 3 + 1]); return a.reduce((s, v) => s + v, 0) / a.length; })();
shiftY('Bip01_Spine', torsoY - rbTorsoY);
const headY = midY(160, 175, 8), rbHeadY = (() => { const a = []; for (let i = 0; i < used.length; i++) if (used[i] && Math.abs(rbP[i * 3]) < 8 && rbP[i * 3 + 2] > 160 && rbP[i * 3 + 2] < 175) a.push(rbP[i * 3 + 1]); return a.reduce((s, v) => s + v, 0) / a.length; })();
shiftY('Bip01_Neck', headY - rbHeadY - (torsoY - rbTorsoY));
}
// his shoulders: the armpit estimate, calibrated on the RB body (whose joint is known)
// (on the RB body the same estimate lands ~1 cm out and ~1 cm above its true joint: its sparse mesh makes a live
// calibration noisy, so the offset is fixed)
const estNew = shoulderEstimate(P), rbUp = pos(byName.Bip01_L_UpperArm);
const sh = { x: estNew.armpit.x - 1.0, z: estNew.armpit.z - 1.0 };
console.log('shoulder joint', sh.x.toFixed(1), sh.z.toFixed(1), '(RB', rbUp.x.toFixed(1), rbUp.z.toFixed(1) + ')');
if (process.env.SHOULDER !== '0') for (const s of ['L', 'R']) { const i = byName[`Bip01_${s}_UpperArm`], p = pos(i), to = new THREE.Vector3(s === 'L' ? sh.x : -sh.x, p.y, sh.z), d = to.clone().sub(p); for (const k of descendants(i)) { const q = new THREE.Vector3().setFromMatrixPosition(fit[k]).add(d); fit[k].setPosition(q); } }
for (const s of ['L', 'R']) { const up = byName[`Bip01_${s}_UpperArm`]; const shp = new THREE.Vector3().setFromMatrixPosition(fit[up]); const from = rbTip[s].clone().sub(pos(up)).add(shp); fitChain(`Bip01_${s}_UpperArm`, from, tip[s], shp); }
for (const s of ['L', 'R']) fitChain(`Bip01_${s}_Thigh`, rbAnkle[s], ankle[s]);
// the palms: turn each forearm (and the hand on it) about its own axis so the bones' hand faces the way his
// mesh's hand does. His palm's normal: the flattest direction of the points around the palm (PCA)
function flatNormal(points) {
  const c = points.reduce((s, v) => s.add(v), new THREE.Vector3()).multiplyScalar(1 / points.length), C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const p of points) { const d = [p.x - c.x, p.y - c.y, p.z - c.z]; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) C[a][b] += d[a] * d[b]; }
  // smallest eigenvector: power iteration on (tr·I − C)
  const tr = C[0][0] + C[1][1] + C[2][2]; let v = new THREE.Vector3(1, 0.3, 0.2).normalize();
  for (let it = 0; it < 80; it++) { const w = new THREE.Vector3(tr * v.x - (C[0][0] * v.x + C[0][1] * v.y + C[0][2] * v.z), tr * v.y - (C[1][0] * v.x + C[1][1] * v.y + C[1][2] * v.z), tr * v.z - (C[2][0] * v.x + C[2][1] * v.y + C[2][2] * v.z)); v = w.normalize(); }
  return v;
}
const Kpre = Bm.map((_, i) => fit[i].clone().multiply(IBM[i]));
for (const s of ['L', 'R']) {
  const fo = byName[`Bip01_${s}_Forearm`], ha = byName[`Bip01_${s}_Hand`], f0 = new THREE.Vector3().setFromMatrixPosition(fit[fo]), h0 = new THREE.Vector3().setFromMatrixPosition(fit[ha]);
  const axis = h0.clone().sub(f0).normalize(), palm = h0.clone().addScaledVector(axis, 6);
  const mine = []; for (let i = 0; i < nV; i++) { const v = new THREE.Vector3(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); if (v.distanceTo(palm) < 5.5) mine.push(v); }
  const theirs = []; for (let i = 0; i < used.length; i++) { if (!used[i]) continue; const v = new THREE.Vector3(rbP[i * 3], rbP[i * 3 + 1], rbP[i * 3 + 2]), o = new THREE.Vector3(); for (let k = 0; k < 4; k++) { const wk = rbW[i * 4 + k]; if (wk) o.addScaledVector(v.clone().applyMatrix4(Kpre[rbJ[i * 4 + k]]), wk); } if (o.distanceTo(palm) < 5.5) theirs.push(o); }
  if (mine.length < 20 || theirs.length < 8) { console.log(s, 'palm: too few points', mine.length, theirs.length); continue; }
  const flat = (n) => n.clone().addScaledVector(axis, -n.dot(axis)).normalize(), a = flat(flatNormal(theirs)), b = flat(flatNormal(mine));
  let ang = Math.atan2(a.clone().cross(b).dot(axis), a.dot(b)); if (ang > Math.PI / 2) ang -= Math.PI; if (ang < -Math.PI / 2) ang += Math.PI;
  const MAXR = +(process.env.PALMMAX ?? 20) * Math.PI / 180, raw = ang; ang = Math.max(-MAXR, Math.min(MAXR, ang)); if (raw !== ang) console.log(s, 'palm roll capped from', (raw * 180 / Math.PI).toFixed(1) + '°');
  const q = new THREE.Quaternion().setFromAxisAngle(axis, ang), R = new THREE.Matrix4().makeRotationFromQuaternion(q);
  for (const i of descendants(fo)) { const p = new THREE.Vector3().setFromMatrixPosition(fit[i]).sub(f0).applyQuaternion(q).add(f0), rot = new THREE.Matrix4().extractRotation(fit[i]); fit[i] = R.clone().multiply(rot).setPosition(p); }
  console.log(s, 'palm roll', (ang * 180 / Math.PI).toFixed(1) + '°', `(${mine.length} / ${theirs.length} points)`);
}

// ---------- weights ----------
const FINGERS = process.env.FINGERS !== '0';                    // (fingers keep their own bones; FINGERS=0 ties them to the hand)
const remap = (name) => { const m = /^Bip01_([LR])_Finger/.exec(name); if (m && !FINGERS) return byName[`Bip01_${m[1]}_Hand`]; if (m) return byName[name]; if (!/^Bip01_([LR]_|Pelvis|Spine|Neck|Head$|Footsteps)/.test(name) && name !== 'Bip01') return byName.Bip01_Head; return byName[name]; };
const REMAP = joints.map((j) => remap(j.getName()));
const K = Bm.map((_, i) => fit[i].clone().multiply(IBM[i]));                   // RB bind -> fitted pose
const src = [];                                                                   // the RB body, deformed into the fitted pose
for (let i = 0; i < used.length; i++) {
  if (!used[i]) continue; const v = new THREE.Vector3(rbP[i * 3], rbP[i * 3 + 1], rbP[i * 3 + 2]), n = new THREE.Vector3(rbN[i * 3], rbN[i * 3 + 1], rbN[i * 3 + 2]);
  const out = new THREE.Vector3(), on = new THREE.Vector3(), w = {};
  for (let k = 0; k < 4; k++) { const wk = rbW[i * 4 + k]; if (!wk) continue; const j = rbJ[i * 4 + k]; out.addScaledVector(v.clone().applyMatrix4(K[j]), wk); on.addScaledVector(n.clone().transformDirection(K[j]), wk); const r = REMAP[j]; w[r] = (w[r] || 0) + wk; }
  src.push({ p: out, n: on.normalize(), w });
}
const CELL = 4, grid = new Map(), key = (x, y, z) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)},${Math.floor(z / CELL)}`;
src.forEach((s, i) => { const k = key(s.p.x, s.p.y, s.p.z); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); });
const W = new Array(nV); const v = new THREE.Vector3(), n = new THREE.Vector3();
for (let i = 0; i < nV; i++) {
  v.fromArray(P, i * 3); n.fromArray(N, i * 3);
  let cand = [];
  for (let r = 1; r <= 6 && cand.length < 10; r++) {
    cand = []; const cx = Math.floor(v.x / CELL), cy = Math.floor(v.y / CELL), cz = Math.floor(v.z / CELL);
    for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) for (let c = -r; c <= r; c++) { const l = grid.get(`${cx + a},${cy + b},${cz + c}`); if (l) for (const j of l) cand.push(j); }
  }
  const scored = cand.map((j) => { const s = src[j], d = s.p.distanceTo(v), agree = Math.max(0.05, (s.n.dot(n) + 0.6) / 1.6); return { j, s: agree / (d * d + 0.5) }; }).sort((a, b) => b.s - a.s).slice(0, 8);
  const w = {}; let tot = 0; for (const { j, s } of scored) for (const [b, x] of Object.entries(src[j].w)) { w[b] = (w[b] || 0) + x * s; tot += x * s; }
  for (const b in w) w[b] /= tot || 1; W[i] = w;
}
// smooth over his mesh's edges (twice), so seams in the transfer don't show as creases
const prim = nb.prim, idx = prim.getIndices(), nbr = Array.from({ length: nV }, () => new Set());
for (let t = 0; t < idx.getCount(); t += 3) { const a = idx.getScalar(t), b = idx.getScalar(t + 1), c = idx.getScalar(t + 2); nbr[a].add(b).add(c); nbr[b].add(a).add(c); nbr[c].add(a).add(b); }
for (let it = 0; it < 2; it++) {
  const next = W.map((w, i) => { const acc = {}; for (const [b, x] of Object.entries(w)) acc[b] = x * 0.5; const ns = [...nbr[i]]; for (const j of ns) for (const [b, x] of Object.entries(W[j])) acc[b] = (acc[b] || 0) + 0.5 * x / ns.length; return acc; });
  for (let i = 0; i < nV; i++) W[i] = next[i];
}
// the neck's skin goes with the head (first person hides the head by collapsing it; skin left on the neck
// bone would show at the bottom of the view): skin-coloured vertices from the base of the neck up
{
  const sharp = (await import('sharp')).default, tex = prim.getMaterial().getBaseColorTexture();
  const { data, info } = await sharp(Buffer.from(tex.getImage())).raw().toBuffer({ resolveWithObject: true });
  const UV = arr(prim.getAttribute('TEXCOORD_0')), neckZ = new THREE.Vector3().setFromMatrixPosition(fit[byName.Bip01_Neck]).z, head = byName.Bip01_Head;
  let moved = 0;
  for (let i = 0; i < nV; i++) {
    if (P[i * 3 + 2] < neckZ - 3) continue;
    const u = Math.min(info.width - 1, Math.max(0, Math.round(UV[i * 2] * (info.width - 1)))), v = Math.min(info.height - 1, Math.max(0, Math.round(UV[i * 2 + 1] * (info.height - 1))));
    const o = (v * info.width + u) * info.channels, r = data[o] / 255, g = data[o + 1] / 255, b = data[o + 2] / 255;
    const skinish = r > 0.3 && r > g * 1.04 && g > b * 1.02 && !(r > 0.85 && g > 0.82 && b > 0.78);
    const hairish = r < 0.22 && g < 0.22 && b < 0.22 && P[i * 3 + 2] > neckZ + 6;
    if (skinish || hairish) { W[i] = { [head]: 1 }; moved++; }
  }
  console.log('neck/head skin to the head bone:', moved);
}
const JW = new Uint16Array(nV * 4), WW = new Float32Array(nV * 4);
for (let i = 0; i < nV; i++) { const top = Object.entries(W[i]).sort((a, b) => b[1] - a[1]).slice(0, 4); const s = top.reduce((t, [, x]) => t + x, 0) || 1; top.forEach(([b, x], k) => { JW[i * 4 + k] = +b; WW[i * 4 + k] = x / s; }); }

// ---------- arms a little closer in: the RB clips hold the arms out for a bulky blazer; with the bind turned
// outward by ADDUCT degrees (after the weights, which need the true fit), every pose brings his arms in by as much
const ADDUCT = +(process.env.ADDUCT ?? 4) * Math.PI / 180;
for (const s of ['L', 'R']) {
  const up = byName[`Bip01_${s}_UpperArm`], pivot = new THREE.Vector3().setFromMatrixPosition(fit[up]), hand = new THREE.Vector3().setFromMatrixPosition(fit[byName[`Bip01_${s}_Hand`]]);
  let q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ADDUCT);
  if (Math.abs(hand.clone().sub(pivot).applyQuaternion(q).add(pivot).x) < Math.abs(hand.x)) q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -ADDUCT);
  const R = new THREE.Matrix4().makeRotationFromQuaternion(q);
  for (const i of descendants(up)) { const p = new THREE.Vector3().setFromMatrixPosition(fit[i]).sub(pivot).applyQuaternion(q).add(pivot), rot = new THREE.Matrix4().extractRotation(fit[i]); fit[i] = R.clone().multiply(rot).setPosition(p); }
}
// ---------- write: B's mesh + material, with the RB hierarchy and the fitted skin ----------
const doc = B, R = doc.getRoot(), buf = R.listBuffers()[0];
const scene = R.listScenes()[0]; for (const c of scene.listChildren()) scene.removeChild(c);
const NAME = process.env.NAME || 'JiBai', top = doc.createNode(NAME); scene.addChild(top);
const M_inv = M.clone().invert(), copy = new Map();
const worldFit = (i) => M.clone().multiply(fit[i]);                               // fitted joint -> world at bind
function clone(n, parent) {
  const c = doc.createNode(n.getName()); copy.set(n, c); parent.addChild(c);
  if (jIndex.has(n)) {
    const i = jIndex.get(n), p = parentOf.get(n), pw = p && jIndex.has(p) ? worldFit(jIndex.get(p)) : worldRest(p || sceneRoot);
    const l = pw.clone().invert().multiply(worldFit(i)), t = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(); l.decompose(t, q, s);
    c.setTranslation(t.toArray()).setRotation(q.toArray()).setScale([1, 1, 1]);
  } else c.setTranslation(n.getTranslation()).setRotation(n.getRotation()).setScale(n.getScale());
  n.listChildren().forEach((k) => { if (!k.getMesh()) clone(k, c); });
}
for (const c of sceneRoot.listChildren()) if (!c.getMesh()) clone(c, top);
const meshNode = doc.createNode(`${NAME.toLowerCase()}_mesh`).setMesh(nb.node.getMesh()).setRotation(meshNodeA.getRotation()).setTranslation(meshNodeA.getTranslation()); top.addChild(meshNode);
nb.node.setMesh(null);
const sk = doc.createSkin(`${NAME.toLowerCase()}_skin`); for (const j of joints) sk.addJoint(copy.get(j));
const ibmOut = new Float32Array(J * 16); fit.forEach((m, i) => ibmOut.set(m.clone().invert().elements, i * 16));
sk.setInverseBindMatrices(doc.createAccessor('ibm').setType(Accessor.Type.MAT4).setArray(ibmOut).setBuffer(buf));
sk.setSkeleton(copy.get(sceneRoot.listChildren().find((c) => c.getName() === 'Bip01')));
meshNode.setSkin(sk);
prim.setAttribute('POSITION', doc.createAccessor('pos').setType('VEC3').setArray(P).setBuffer(buf));
prim.setAttribute('NORMAL', doc.createAccessor('nrm').setType('VEC3').setArray(N).setBuffer(buf));
prim.setAttribute('JOINTS_0', doc.createAccessor('jnt').setType('VEC4').setArray(JW).setBuffer(buf));
prim.setAttribute('WEIGHTS_0', doc.createAccessor('wgt').setType('VEC4').setArray(WW).setBuffer(buf));
const mat = prim.getMaterial(); mat.setName(`${NAME.toLowerCase()}_body`).setRoughnessFactor(0.85).setMetallicFactor(0); for (const e of mat.listExtensions()) mat.setExtension(e.extensionName, null);
for (const e of R.listExtensionsUsed()) if (e.extensionName === 'KHR_materials_specular') e.dispose();
for (const n of R.listNodes()) if (!n.getMesh() && !n.listChildren().length && n.getName() === 'node_0') n.dispose();
await io.write(OUT, doc);
console.log('wrote', OUT, 'verts', nV, 'joints', J);
