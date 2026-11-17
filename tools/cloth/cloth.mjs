// Give a person's cloth and hair spring bones (src/world/springs.js moves them):
//   node tools/cloth/cloth.mjs public/people/c2.glb [out.glb]      (the avatar's parts are in PARTS below)
// Parts, each a set of chains of bones named Spring_* plus part of the cloth's weight on them:
//   skirt     a ring of chains from the hip line to the hem, around the legs (pushed by the thighs and calves)
//   hem       a jacket's or cardigan's lower band: a ring of short chains hanging from the hips
//   trousers  wide trouser legs: four short chains a leg, from below the knee to the hem
//   hair      a ponytail (or long hair at the back): one chain from where it leaves the head to its tip
// Works in the model's mesh space (Rocketbox: z up, centimetres, facing -y). Run it again on a fresh model:
// it refuses a model that already has springs. Dependencies (not the game's): see tools/jibai/README.md.
import { NodeIO, Accessor } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import * as THREE from 'three';

// what each avatar wears (cm, mesh space). A jacket's hem (hemZ) is given: wide trousers fool any measure of it
export const PARTS = {
  c2: [{ type: 'skirt', chains: 10, segs: 2, blend: 0.85, stiffness: 0.45, drag: 0.16, gravity: 0.35 }, { type: 'hair', blend: 1, stiffness: 0.3, drag: 0.14, gravity: 0.45 }],
  su: [{ type: 'skirt', chains: 8, segs: 1, blend: 0.55, stiffness: 1.0, drag: 0.28, gravity: 0.3, tight: true }],
  c4: [{ type: 'hair', blend: 1, stiffness: 0.3, drag: 0.14, gravity: 0.5 }, { type: 'trousers', blend: 0.7, stiffness: 0.6, drag: 0.2, gravity: 0.45 }],
  p5: [{ type: 'trousers', blend: 0.7, stiffness: 0.6, drag: 0.2, gravity: 0.45 }],
  p2: [{ type: 'hem', depth: 22, chains: 8, blend: 0.8, stiffness: 0.55, drag: 0.18, gravity: 0.4 }],
  c3: [{ type: 'hem', hemZ: 84, depth: 12, chains: 8, blend: 0.7, stiffness: 0.75, drag: 0.22, gravity: 0.35 }],
  c1: [{ type: 'hair', blend: 1, stiffness: 0.3, drag: 0.14, gravity: 0.5 }],
  player: [{ type: 'trousers', blend: 0.75, stiffness: 0.6, drag: 0.2, gravity: 0.45 }, { type: 'hem', hemZ: 96, depth: 9, chains: 8, blend: 0.6, stiffness: 0.9, drag: 0.26, gravity: 0.35 }],
  gunian: [{ type: 'hair', byColor: true, chains: 3, reach: 60, width: 17, blend: 1, stiffness: 0.35, drag: 0.16, gravity: 0.5 }, { type: 'trousers', blend: 0.75, stiffness: 0.55, drag: 0.2, gravity: 0.45 }, { type: 'hem', hemZ: 89, depth: 10, chains: 8, blend: 0.55, stiffness: 0.9, drag: 0.26, gravity: 0.35 }],
};

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const V = (a) => new THREE.Vector3(...a);
const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

export async function addCloth(inFile, outFile, role) {
  const parts = PARTS[role]; if (!parts) throw new Error(`no parts for ${role}`);
  const doc = await io.read(inFile), R = doc.getRoot(), buf = R.listBuffers()[0];
  const skin = R.listSkins()[0], joints = skin.listJoints();
  if (joints.some((j) => /^Spring_/.test(j.getName()))) { console.log(role, 'already has springs'); return; }
  const ibmAcc = skin.getInverseBindMatrices(), IBM = joints.map((_, i) => new THREE.Matrix4().fromArray(ibmAcc.getElement(i, [])));
  const Bm = IBM.map((m) => m.clone().invert()), byName = Object.fromEntries(joints.map((j, i) => [j.getName(), i]));
  const jp = (name) => new THREE.Vector3().setFromMatrixPosition(Bm[byName[name]]);
  // the vertices: the skinned primitives share their attributes (Rocketbox) or there is one (Ji Bai)
  const prims = R.listMeshes().flatMap((m) => m.listPrimitives()).filter((p) => p.getAttribute('JOINTS_0'));
  const posAcc = prims[0].getAttribute('POSITION'), jAcc = prims[0].getAttribute('JOINTS_0'), wAcc = prims[0].getAttribute('WEIGHTS_0');
  if (prims.some((p) => p.getAttribute('POSITION') !== posAcc)) throw new Error('primitives with separate vertices: not handled');
  const n = posAcc.getCount(), P = [], JW = [], WW = [];
  for (let i = 0; i < n; i++) { P.push(V(posAcc.getElement(i, []))); JW.push(jAcc.getElement(i, [])); WW.push(wAcc.getElement(i, [])); }
  const used = new Uint8Array(n), hairy = new Uint8Array(n);   // hairy: on the head's or the hair cards' material
  for (const p of prims) { const ix = p.getIndices(), h = /head|opacity|hair/i.test((p.getMaterial() && p.getMaterial().getName()) || ''); for (let k = 0; k < ix.getCount(); k++) { used[ix.getScalar(k)] = 1; if (h) hairy[ix.getScalar(k)] = 1; } }
  const meshNode = R.listNodes().find((x) => x.getSkin() === skin);
  const M = new THREE.Matrix4();   // (bones' local transforms come from the mesh-space bind matrices: rest == bind)
  // extra weights to blend in: vertex -> { joint: w } and a factor
  const extra = new Map();
  const addW = (i, f, w) => { const e = extra.get(i); if (!e || e.f < f) extra.set(i, { f, w }); };
  const newJoints = [];   // { name, parent (joint index or new), pos (mesh space), tipOf? }
  function makeChain(name, parentName, points, cfg, colliders) {
    // points: mesh-space positions root .. tip. Bones at all but the tip; the tip is a node
    const ids = [];
    for (let k = 0; k < points.length - 1; k++) {
      const parent = k === 0 ? { body: byName[parentName] } : { spring: ids[k - 1] };
      newJoints.push({ name: `Spring_${name}_${k}`, parent, pos: points[k], extras: k === 0 ? { spring: { ...cfg, colliders } } : null, tip: k === points.length - 2 ? points[k + 1] : null });
      ids.push(newJoints.length - 1);
    }
    return ids;   // indices into newJoints
  }
  const legCols = (r1 = 0.075, r2 = 0.06) => ['L', 'R'].flatMap((s) => [{ bone: `Bip01_${s}_Thigh`, to: `Bip01_${s}_Calf`, r: r1 }, { bone: `Bip01_${s}_Calf`, to: `Bip01_${s}_Foot`, r: r2 }]);
  const legAxis = (s) => [jp(`Bip01_${s}_Thigh`), jp(`Bip01_${s}_Calf`), jp(`Bip01_${s}_Foot`)];
  const distSeg = (p, a, b) => { const ab = b.clone().sub(a), t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq())); return p.distanceTo(a.clone().addScaledVector(ab, t)); };
  const legDist = (p) => Math.min(...['L', 'R'].flatMap((s) => { const [a, b, c] = legAxis(s); return [distSeg(p, a, b), distSeg(p, b, c)]; }));
  const armDist = (p) => Math.min(...['L', 'R'].flatMap((s) => [distSeg(p, jp(`Bip01_${s}_UpperArm`), jp(`Bip01_${s}_Forearm`)), distSeg(p, jp(`Bip01_${s}_Forearm`), jp(`Bip01_${s}_Hand`)), distSeg(p, jp(`Bip01_${s}_Hand`), jp(`Bip01_${s}_Hand`).clone().add(jp(`Bip01_${s}_Hand`).clone().sub(jp(`Bip01_${s}_Forearm`)).setLength(18)))]));
  const pelvis = jp('Bip01_Pelvis'), knees = (jp('Bip01_L_Calf').z + jp('Bip01_R_Calf').z) / 2, ankles = (jp('Bip01_L_Foot').z + jp('Bip01_R_Foot').z) / 2;
  // a ring of chains around the body's axis between z0 (top) and z1 (bottom), on the given vertices
  function ring(name, verts, z0, z1, cfg, colliders, parentName = 'Bip01_Pelvis') {
    const K = cfg.chains, segs = cfg.segs || 1, cx = pelvis.x, cy = verts.reduce((s, i) => s + P[i].y, 0) / verts.length;
    const ang = (p) => Math.atan2(p.y - cy, p.x - cx);
    // the cloth's radius at each angle and height (the outermost vertices)
    const radiusAt = (a, z, dz = 3) => { let r = 0; for (const i of verts) { const p = P[i]; if (Math.abs(p.z - z) > dz) continue; let d = ang(p) - a; d = Math.atan2(Math.sin(d), Math.cos(d)); if (Math.abs(d) > Math.PI / K) continue; r = Math.max(r, Math.hypot(p.x - cx, p.y - cy)); } return r; };
    const chains = [];
    for (let k = 0; k < K; k++) {
      const a = (k / K) * Math.PI * 2, pts = [];
      for (let s = 0; s <= segs; s++) { const z = z0 + (z1 - z0) * (s / segs), r = (radiusAt(a, z) || radiusAt(a, z, 8) || 10) - 1.5; pts.push(new THREE.Vector3(cx + Math.cos(a) * r, cy + Math.sin(a) * r, z)); }
      chains.push({ a, ids: makeChain(`${name}${k}`, parentName, pts, cfg, colliders) });
    }
    for (const i of verts) {
      const p = P[i], t = (z0 - p.z) / (z0 - z1), f = cfg.blend * smooth(0, 0.55, t);
      if (f <= 0.01) continue;
      // between the two nearest chains, and along the chain's segments
      let a = ang(p); if (a < 0) a += Math.PI * 2; const u = (a / (Math.PI * 2)) * K, k0 = Math.floor(u) % K, k1 = (k0 + 1) % K, fa = u - Math.floor(u);
      const s = Math.max(0, Math.min(segs - 1e-6, t * segs)), seg = Math.floor(s);
      const w = {}; const put = (k, wt) => { const id = chains[k].ids[seg]; w[`n${id}`] = (w[`n${id}`] || 0) + wt; };
      put(k0, 1 - fa); put(k1, fa);
      addW(i, f, w);
    }
  }
  for (const part of parts) {
    const cfg = { stiffness: part.stiffness, drag: part.drag, gravity: part.gravity, radius: 0.015, chains: part.chains, segs: part.segs, blend: part.blend };
    if (part.type === 'skirt') {
      // skirt vertices: below the hips, away from both legs' bones (the cloth, not the legs inside it)
      const top = pelvis.z - 4, verts = [];
      for (let i = 0; i < n; i++) if (used[i] && P[i].z < top && P[i].z > knees - 30 && legDist(P[i]) > (part.tight ? 8.5 : 9.5) && armDist(P[i]) > 9) verts.push(i);
      const hem = Math.min(...verts.map((i) => P[i].z));
      console.log(role, 'skirt', verts.length, 'vertices, hip', top.toFixed(1), '→ hem', hem.toFixed(1));
      ring('skirt', verts, top, hem, cfg, legCols(part.tight ? 0.07 : 0.08, 0.06));
    } else if (part.type === 'hem') {
      // the garment's lowest band: the outermost vertices from its hem up `depth` cm (found: the lowest torso cloth above the thighs' middle)
      const torso = []; for (let i = 0; i < n; i++) if (used[i] && P[i].z > knees + 8 && P[i].z < pelvis.z + 30 && armDist(P[i]) > 13 && Math.abs(P[i].x - pelvis.x) < 27) torso.push(i);   // (not the arms or hands)
      // the hem: the lowest height where the cloth still wraps outside the legs (radius from the pelvis axis > legs' reach)
      const outer = torso.filter((i) => legDist(P[i]) > 6 && Math.hypot(P[i].x - pelvis.x, P[i].y - pelvis.y) > 12);
      const hem = part.hemZ ?? Math.min(...outer.map((i) => P[i].z)), z0 = hem + part.depth;
      // (a given hem: the band is the outermost cloth at each angle there, the jacket over the trousers)
      const band = part.hemZ == null ? outer.filter((i) => P[i].z < z0 + 2) : (() => { const inBand = torso.filter((i) => P[i].z > hem - 1.5 && P[i].z < z0 + 2), cy = inBand.reduce((t, i) => t + P[i].y, 0) / inBand.length, rOf = (i) => Math.hypot(P[i].x - pelvis.x, P[i].y - cy), aOf = (i) => Math.round(Math.atan2(P[i].y - cy, P[i].x - pelvis.x) * 12), mx = {}; for (const i of inBand) mx[aOf(i)] = Math.max(mx[aOf(i)] || 0, rOf(i)); return inBand.filter((i) => rOf(i) > mx[aOf(i)] - 2.5); })();
      console.log(role, 'hem', band.length, 'vertices,', z0.toFixed(1), '→', hem.toFixed(1));
      ring('hem', band, z0, hem, { ...cfg, segs: 1 }, [{ bone: 'Bip01_Pelvis', to: 'Bip01_Spine1', r: 0.11 }, ...legCols(0.085, 0.06)]);
    } else if (part.type === 'trousers') {
      for (const s of ['L', 'R']) {
        const [th, ca, fo] = legAxis(s), z0 = ca.z - 6, z1 = fo.z + 2, verts = [];
        for (let i = 0; i < n; i++) { const p = P[i]; if (!used[i] || p.z > z0 || p.z < z1 - 3 || (s === 'L' ? p.x < 0 : p.x > 0)) continue; const d = distSeg(p, ca, fo); if (d > 5.2 && d < 16) verts.push(i); }
        console.log(role, 'trouser leg', s, verts.length, 'vertices');
        // four chains around the leg: front, outside, back, inside
        const chains = [];
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * Math.PI * 2, dir = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
          const near = verts.filter((i) => { const d = P[i].clone().sub(ca); d.z = 0; return d.normalize().dot(dir) > 0.7; });
          const r = near.length ? near.reduce((m, i) => Math.max(m, Math.hypot(P[i].x - ca.x, P[i].y - ca.y)), 0) - 1.5 : 6;
          const root = new THREE.Vector3(ca.x + dir.x * r * 0.7, ca.y + dir.y * r * 0.7, z0), tip = new THREE.Vector3(fo.x + dir.x * r, fo.y + dir.y * r, z1);
          chains.push({ a, ids: makeChain(`leg${s}${k}`, `Bip01_${s}_Calf`, [root, tip], { ...cfg, segs: 1 }, [{ bone: `Bip01_${s}_Calf`, to: `Bip01_${s}_Foot`, r: 0.055 }, { bone: `Bip01_${s === 'L' ? 'R' : 'L'}_Calf`, to: `Bip01_${s === 'L' ? 'R' : 'L'}_Foot`, r: 0.06 }]) });
        }
        for (const i of verts) {
          const p = P[i], d = distSeg(p, ca, fo), loose = smooth(5.2, 9, d), t = (z0 - p.z) / (z0 - z1), f = part.blend * loose * smooth(0, 0.6, t);
          if (f <= 0.01) continue;
          let a = Math.atan2(p.y - ca.y, p.x - ca.x); if (a < 0) a += Math.PI * 2; const u = (a / (Math.PI * 2)) * 4, k0 = Math.floor(u) % 4, k1 = (k0 + 1) % 4, fa = u - Math.floor(u);
          addW(i, f, { [`n${chains[k0].ids[0]}`]: 1 - fa, [`n${chains[k1].ids[0]}`]: fa });
        }
      }
    } else if (part.type === 'hair') {
      // hair at the back, below the crown, beyond the skull: a ponytail, or long hair down the back
      if (part.byColor) {   // one material (a generated model): the hair is what's dark in the texture
        const sharp = (await import('sharp')).default, tex = prims[0].getMaterial().getBaseColorTexture();
        const { data, info } = await sharp(Buffer.from(tex.getImage())).raw().toBuffer({ resolveWithObject: true }), uv = prims[0].getAttribute('TEXCOORD_0'), e = [];
        for (let i = 0; i < n; i++) { uv.getElement(i, e); const x = Math.min(info.width - 1, Math.max(0, Math.round(e[0] * (info.width - 1)))), y = Math.min(info.height - 1, Math.max(0, Math.round(e[1] * (info.height - 1)))), o = (y * info.width + x) * info.channels; hairy[i] = (0.3 * data[o] + 0.59 * data[o + 1] + 0.11 * data[o + 2]) / 255 < 0.2 ? 1 : 0; }
      }
      const head = jp('Bip01_Head'), c = head.clone().add(new THREE.Vector3(0, 1.5, 4)), verts = [], reach = part.reach || 40, width = part.width || 10;
      for (let i = 0; i < n; i++) { const p = P[i]; if (used[i] && hairy[i] && p.y > head.y + 4 && distSeg(p, jp('Bip01_Neck'), head) > 8.5 && p.distanceTo(c) > 10.5 && p.z < head.z + 12 && p.z > head.z - reach && Math.abs(p.x - head.x) < width) verts.push(i); }
      if ((part.chains || 1) > 1 && verts.length >= 60) {
        // several chains side by side across the hair, each taking the vertices nearest it in x
        const K = part.chains, xs = verts.map((i) => P[i].x).sort((a, b) => a - b), cut = (q) => xs[Math.floor(q * (xs.length - 1))];
        const centres = Array.from({ length: K }, (_, k) => cut((k + 0.5) / K)), groups = centres.map(() => []);
        for (const i of verts) { let b = 0; for (let k = 1; k < K; k++) if (Math.abs(P[i].x - centres[k]) < Math.abs(P[i].x - centres[b])) b = k; groups[b].push(i); }
        const cols = [{ bone: 'Bip01_Head', r: 0.095 }, { bone: 'Bip01_Neck', to: 'Bip01_Spine2', r: 0.075 }, { bone: 'Bip01_Spine2', to: 'Bip01_Spine1', r: 0.13 }, { bone: 'Bip01_L_Clavicle', to: 'Bip01_L_UpperArm', r: 0.06 }, { bone: 'Bip01_R_Clavicle', to: 'Bip01_R_UpperArm', r: 0.06 }];
        const chains = groups.map((g, k) => {
          const top = g.reduce((b, i) => (P[i].z > b.z ? P[i] : b), P[g[0]]).clone(), tip = g.reduce((b, i) => (P[i].z < b.z ? P[i] : b), P[g[0]]).clone();
          const rootP = new THREE.Vector3(centres[k], Math.max(head.y + 6, top.y - 2), Math.min(top.z, head.z - 2)), mid = rootP.clone().lerp(tip, 0.5);
          return { rootP, tip, ids: makeChain(`hair${k}`, 'Bip01_Head', [rootP, mid, tip], { ...cfg, segs: 2 }, cols) };
        });
        console.log(role, 'long hair', verts.length, 'vertices in', K, 'chains,', chains.map((ch) => `${ch.rootP.z.toFixed(0)}→${ch.tip.z.toFixed(0)}`).join(' '));
        for (const i of verts) {
          // the two nearest chains in x, and along each one
          const order = chains.map((ch, k) => [k, Math.abs(P[i].x - ch.rootP.x)]).sort((a, b) => a[1] - b[1]), [k0, d0] = order[0], [k1, d1] = order[1] || order[0];
          const w = {}; let f = 0;
          for (const [k, wt] of [[k0, d1 / (d0 + d1 + 1e-6)], [k1, d0 / (d0 + d1 + 1e-6)]]) { const ch = chains[k], L = ch.tip.distanceTo(ch.rootP), t = Math.max(0, P[i].clone().sub(ch.rootP).dot(ch.tip.clone().sub(ch.rootP)) / (L * L)); const id = t < 0.5 ? ch.ids[0] : ch.ids[1]; w[`n${id}`] = (w[`n${id}`] || 0) + wt; f += wt * smooth(0, 0.25, t); }
          if (f > 0.01) addW(i, part.blend * f, w);
        }
        continue;
      }
      if (verts.length < 20) { console.log(role, 'hair: no ponytail found'); continue; }
      const rootP = verts.reduce((b, i) => (P[i].z > b.z ? P[i] : b), P[verts[0]]).clone(), tipP = verts.reduce((b, i) => (P[i].z < b.z ? P[i] : b), P[verts[0]]).clone();
      rootP.y -= 2; const mid = rootP.clone().lerp(tipP, 0.5);
      console.log(role, 'ponytail', verts.length, 'vertices,', rootP.z.toFixed(1), '→', tipP.z.toFixed(1));
      const ids = makeChain('hair', 'Bip01_Head', [rootP, mid, tipP], { ...cfg, segs: 2 }, [{ bone: 'Bip01_Head', r: 0.095 }, { bone: 'Bip01_Neck', to: 'Bip01_Spine2', r: 0.075 }, { bone: 'Bip01_Spine2', to: 'Bip01_Spine1', r: 0.12 }]);
      const L = tipP.distanceTo(rootP);
      for (const i of verts) { const t = Math.max(0, P[i].clone().sub(rootP).dot(tipP.clone().sub(rootP)) / (L * L)), f = part.blend * smooth(0, 0.25, t); if (f <= 0.01) continue; addW(i, f, t < 0.5 ? { [`n${ids[0]}`]: 1 } : { [`n${ids[1]}`]: 1 }); }
    }
  }
  if (!newJoints.length) { console.log(role, 'nothing added'); return; }
  // ---- the nodes, the skin's joints and inverse bind matrices ----
  const J0 = joints.length, nodes = [], bind = [];
  newJoints.forEach((nj, k) => {
    const parentBm = nj.parent.body != null ? Bm[nj.parent.body] : bind[nj.parent.spring];
    const rot = new THREE.Matrix4().extractRotation(parentBm), my = rot.clone().setPosition(nj.pos); bind.push(my);
    const local = parentBm.clone().invert().multiply(my), t = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(); local.decompose(t, q, s);
    const node = doc.createNode(nj.name).setTranslation(t.toArray()).setRotation([0, 0, 0, 1]);
    if (nj.extras) node.setExtras(nj.extras);
    const parentNode = nj.parent.body != null ? joints[nj.parent.body] : nodes[nj.parent.spring]; parentNode.addChild(node); nodes.push(node);
    if (nj.tip) { const tl = my.clone().invert().multiply(new THREE.Matrix4().makeTranslation(nj.tip.x, nj.tip.y, nj.tip.z)), tt = new THREE.Vector3().setFromMatrixPosition(tl); node.addChild(doc.createNode(`${nj.name}_tip`).setTranslation(tt.toArray())); }
    skin.addJoint(node);
  });
  const ibm = new Float32Array((J0 + newJoints.length) * 16); for (let i = 0; i < J0; i++) ibm.set(IBM[i].elements, i * 16); bind.forEach((m, k) => ibm.set(m.clone().invert().elements, (J0 + k) * 16));
  skin.setInverseBindMatrices(doc.createAccessor('ibm_springs').setType(Accessor.Type.MAT4).setArray(ibm).setBuffer(buf));
  // ---- the weights: blend in, keep four ----
  const JOut = new Uint16Array(n * 4), WOut = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const w = {}; for (let k = 0; k < 4; k++) if (WW[i][k] > 0) w[JW[i][k]] = (w[JW[i][k]] || 0) + WW[i][k];
    const e = extra.get(i);
    if (e) { for (const b in w) w[b] *= 1 - e.f; for (const [b, x] of Object.entries(e.w)) { const j = J0 + +b.slice(1); w[j] = (w[j] || 0) + x * e.f; } }
    const top = Object.entries(w).sort((a, b) => b[1] - a[1]).slice(0, 4), s = top.reduce((t, [, x]) => t + x, 0) || 1;
    top.forEach(([b, x], k) => { JOut[i * 4 + k] = +b; WOut[i * 4 + k] = x / s; });
  }
  const jNew = doc.createAccessor('joints_springs').setType('VEC4').setArray(JOut).setBuffer(buf), wNew = doc.createAccessor('weights_springs').setType('VEC4').setArray(WOut).setBuffer(buf);
  for (const p of prims) { p.setAttribute('JOINTS_0', jNew); p.setAttribute('WEIGHTS_0', wNew); }
  for (const old of [jAcc, wAcc, ibmAcc]) if (!old.listParents().some((x) => x !== R)) old.dispose();   // (the replaced data, not left in the file)
  await io.write(outFile || inFile, doc);
  console.log(role, `+${newJoints.length} spring bones, ${extra.size} vertices reweighted →`, outFile || inFile);
  void meshNode; void M;
}
if (process.argv[2]) {
  const file = process.argv[2], role = process.argv[4] || file.split('/').pop().replace(/\.glb$/, '');
  await addCloth(file, process.argv[3], role);
}
