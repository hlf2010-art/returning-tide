// The first-person arm for holding things: what shooters call the viewmodel's arm. Ji Bai's own model
// (generated from his character sheet) has fingers that can't bend without tearing, so while he holds
// something his right forearm and hand fold away and this arm takes their place:
//   public/people/fp-arm.glb  the right forearm and hand of a Rocketbox man (MIT; rigged finger by
//                             finger), cut from the body in Blender with the skin baked to his tone
//                             (tools/blender/fp_arm.py); until it loads, the same is cut from the p1 man
// It is laid on his forearm bone each frame, the wrist turned so the grip stands upright, and the hand
// closed round the cup by a contact solve (as VR hand posing does it): each finger curls, joint by joint,
// until its skin meets the cup's surface; the thumb closes from the other side.
//   const fp = createFpHand(people);  group.add(fp.root)
//   fp.update(jbForearm, jbHand, w, fDir, up)   places it; then fp.socket(out) is the cup's base centre (world)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const ARM = /^Bip01_R_(Hand|Finger\d*)$/;
export const GRASP = 1.4;   // the most the four fingers close (radians at the base joint; the others in proportion)
export const CUP = { r: 0.041, gripY: 0.036, skin: 0.003 };     // the Manner cup at the grip (world/props/manner-cup.js)

function cut(src) {
  // (the fallback: the arm cut from a whole Rocketbox body at load)
  const root = SkeletonUtils.clone(src);
  root.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    const g = o.geometry.clone(), bones = o.skeleton.bones, J = g.attributes.skinIndex, W = g.attributes.skinWeight, keep = new Uint8Array(J.count);
    for (let i = 0; i < J.count; i++) { let w = 0; for (let c = 0; c < 4; c++) { const b = bones[J.getComponent(i, c)]; if (b && ARM.test(b.name)) w += W.getComponent(i, c); } keep[i] = w > 0.5 ? 1 : 0; }
    const idx = g.index ? g.index.array : Array.from({ length: g.attributes.position.count }, (_, i) => i), tri = [];
    for (let t = 0; t < idx.length; t += 3) if (keep[idx[t]] && keep[idx[t + 1]] && keep[idx[t + 2]]) tri.push(idx[t], idx[t + 1], idx[t + 2]);
    g.setIndex(tri); o.geometry = g; o.material = o.material.clone(); o.material.color.setRGB(1.2, 1.32, 1.55);
    if (!tri.length) o.visible = false;
  });
  return root;
}

export function createFpHand(people, role = 'p1') {
  const holder = new THREE.Group(); holder.name = 'fp-arm';
  let rig = null, ready = false;
  const install = (root) => {
    if (rig) holder.remove(rig.root);
    root.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = false; o.receiveShadow = true; } });
    const bone = (n) => root.getObjectByName(n);
    rig = {
      root, base: root.scale.clone(),
      fore: bone('Bip01_R_Forearm'), hand: bone('Bip01_R_Hand'),
      fingers: [1, 2, 3, 4].map((k) => [bone(`Bip01_R_Finger${k}`), bone(`Bip01_R_Finger${k}1`), bone(`Bip01_R_Finger${k}2`)]),
      thumb: [bone('Bip01_R_Finger0'), bone('Bip01_R_Finger01'), bone('Bip01_R_Finger02')],
      rest: new Map(), grip: null, k: null,
    };
    root.traverse((o) => { if (o.isBone) rig.rest.set(o, o.quaternion.clone()); });
    holder.add(root); ready = false;
  };
  if (people.avatars[role]) install(cut(people.avatars[role]));
  // (the Blender round trip leaves the skin's inverse-bind matrices in other units than its mesh: this rig's rest
  // pose is its bind pose, so the skin is bound again from the rest pose as loaded)
  const rebind = (root) => { root.updateMatrixWorld(true); root.traverse((o) => { if (o.isSkinnedMesh) { o.skeleton.calculateInverses(); o.bind(o.skeleton, new THREE.Matrix4()); /* (its raw vertices are already in the bones' space) */ } }); return root; };
  new GLTFLoader().loadAsync((typeof window !== 'undefined' && window.__fpArmUrl) || './people/fp-arm.glb').then((g) => install(rebind(g.scene))).catch(() => { /* keep the cut one */ });

  const _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _w = new THREE.Vector3(), _m = new THREE.Matrix4();
  // the hand's mesh: the skinned part with the most triangles (the export can carry small leftover parts)
  const skinned = () => { let s = null, best = 0; rig.root.traverse((o) => { if (o.isSkinnedMesh && o.visible) { const n = o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count; if (n > best) { best = n; s = o; } } }); return s; };
  const worldVert = (mesh, i, out) => {
    const P0 = mesh.geometry.attributes.position, J = mesh.geometry.attributes.skinIndex, Wt = mesh.geometry.attributes.skinWeight, bones = mesh.skeleton.bones, bi = mesh.skeleton.boneInverses;
    const b = new THREE.Vector3().fromBufferAttribute(P0, i).applyMatrix4(mesh.bindMatrix), m = new THREE.Matrix4(); out.set(0, 0, 0);
    for (let c = 0; c < 4; c++) { const w = Wt.getComponent(i, c); if (!w) continue; const k = J.getComponent(i, c); m.multiplyMatrices(bones[k].matrixWorld, bi[k]); out.addScaledVector(b.clone().applyMatrix4(m), w); }
    return out;
  };
  const resetPose = () => { for (const [b, q] of rig.rest) b.quaternion.copy(q); };

  // ---- the grip: solved once, in the hand's own frame ----
  function solve() {
    const mesh = skinned(); if (!mesh) return null;
    rig.root.position.set(0, 0, 0); rig.root.quaternion.identity(); rig.root.scale.copy(rig.base);
    resetPose(); rig.root.updateMatrixWorld(true);
    const bones = mesh.skeleton.bones, J = mesh.geometry.attributes.skinIndex, Wt = mesh.geometry.attributes.skinWeight, n = J.count;
    // each vertex's chain (0 thumb, 1-4 fingers) if a finger bone owns most of it; the palm's vertices
    const chainOf = new Int8Array(n).fill(-1), palm = [];
    const chains = [rig.thumb, ...rig.fingers];
    for (let i = 0; i < n; i++) {
      let best = -1, bw = 0;
      for (let c = 0; c < 4; c++) { const w = Wt.getComponent(i, c); if (w > bw) { bw = w; best = J.getComponent(i, c); } }
      const b = bones[best]; if (!b) continue;
      const ci = chains.findIndex((ch) => ch.includes(b)); if (ci >= 0 && bw > 0.5) chainOf[i] = ci;
      else if (b === rig.hand && bw > 0.7) palm.push(i);
    }
    // a vertex where the skin puts it (world): the bones' blend of its bind position (linear blend skinning)
    const P0 = mesh.geometry.attributes.position, bi = mesh.skeleton.boneInverses, _b = new THREE.Vector3(), _bm = new THREE.Matrix4();
    const posOf = (i, out) => {
      out.set(0, 0, 0); _b.fromBufferAttribute(P0, i).applyMatrix4(mesh.bindMatrix);
      for (let c = 0; c < 4; c++) { const w = Wt.getComponent(i, c); if (!w) continue; const k = J.getComponent(i, c); _bm.multiplyMatrices(bones[k].matrixWorld, bi[k]); out.addScaledVector(_w.copy(_b).applyMatrix4(_bm), w); }
      return out;
    };
    const centroid = (ids) => { const c = new THREE.Vector3(); for (const i of ids) c.add(posOf(i, _v)); return c.divideScalar(Math.max(1, ids.length)); };
    const tipIds = (ci) => { const ids = []; for (let i = 0; i < n; i++) if (chainOf[i] === ci) ids.push(i); return ids; };
    const ids = chains.map((_, ci) => tipIds(ci));
    // the palm's normal: the way the middle finger moves as it closes (about its local z)
    const mid = rig.fingers[1], before = centroid(ids[2]);
    const handPos = rig.hand.getWorldPosition(new THREE.Vector3()), f = mid[0].getWorldPosition(new THREE.Vector3()).sub(handPos).normalize();
    let sign = 1, moved = null;
    for (const s of [1, -1]) {
      resetPose(); mid.forEach((b) => b.quaternion.multiply(_q.setFromAxisAngle(_w.set(0, 0, 1), s * 0.5))); rig.root.updateMatrixWorld(true);
      const d = centroid(ids[2]).sub(before), dn = d.clone().addScaledVector(f, -d.dot(f));
      // the closing way is toward the palm, the side the thumb's base is on (bending back moves it as far)
      const palmSide = rig.thumb[0].getWorldPosition(new THREE.Vector3()).sub(handPos); palmSide.addScaledVector(f, -palmSide.dot(f));
      if (dn.dot(palmSide) > 0) { moved = dn; sign = s; }
    }
    resetPose(); rig.root.updateMatrixWorld(true);
    if (!moved) return null;
    const nrm = moved.normalize();
    // the model's units: the cup measured against this hand (wrist to middle knuckle is about 9.5 cm)
    const U = handPos.distanceTo(mid[0].getWorldPosition(new THREE.Vector3())) / 0.095, R = CUP.r * U, SKIN = CUP.skin * U;
    const axis = new THREE.Vector3().crossVectors(f, nrm).normalize();                  // the cup's axis direction
    // close the hand step by step; at each step fit a circle (in the plane across the cup's axis) to the
    // inside of the ring the palm and fingers make; stop once that ring is the cup's size: the cup's axis is
    // the circle's centre
    const RATIO = [1, 1.15, 0.8];
    const pose = (ch, t, s) => ch.forEach((b, j) => { if (b) { b.quaternion.copy(rig.rest.get(b)).multiply(_q.setFromAxisAngle(_w.set(0, 0, 1), s * t * RATIO[j])); } });
    const e1 = f.clone(), e2 = nrm.clone();                                              // the plane: along the hand, and out of the palm
    const pcAll = centroid(palm);
    // three points round the ring: the palm's middle, and the middle finger's first and last segments
    const segIds = (b) => { const out = []; for (let i = 0; i < n; i++) { let bw = 0, bb = -1; for (let c = 0; c < 4; c++) { const w = Wt.getComponent(i, c); if (w > bw) { bw = w; bb = J.getComponent(i, c); } } if (bones[bb] === b && bw > 0.6) out.push(i); } return out; };
    const s0 = segIds(mid[0]), s2 = segIds(mid[2]);
    // the palm where the cup rests: its knuckle half, on the palm's side (not the wrist or the back of the hand)
    const kn = mid[0].getWorldPosition(new THREE.Vector3()), hf = kn.distanceTo(handPos);
    const palmFront = palm.filter((i) => { posOf(i, _v); const a = _v.clone().sub(handPos).dot(f); return a > hf * 0.45 && _v.clone().sub(pcAll).dot(nrm) > 0; });
    const fit = () => {
      const p = [centroid(palmFront.length > 20 ? palmFront : palm), centroid(s0), centroid(s2)].map((v) => [v.dot(e1), v.dot(e2)]);
      const [ax, ay] = p[0], [bx, by] = p[1], [cx, cy] = p[2], d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
      if (Math.abs(d) < 1e-9) return null;
      const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
      const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
      return { cx: ux, cy: uy, r: Math.hypot(ax - ux, ay - uy) };
    };
    // the curl: the four fingers close together (a power grasp); the ring they make with the palm is measured
    // (from closed to open: the most closed curl whose ring still clears the cup, fingers on its surface)
    let t = GRASP, got = null;
    for (; t > 0.2; t -= 0.02) {
      rig.fingers.forEach((ch) => pose(ch, t, sign)); rig.root.updateMatrixWorld(true);
      got = fit(); if (got && got.r >= R + 0.011 * U) break;
    }
    const angles = { 0: t, 1: t, 2: t, 3: t };
    // the axis through the circle's centre (its height along the axis: the palm's middle)
    const pc = centroid(palm), along = pc.dot(axis);
    const centre = e1.clone().multiplyScalar(got ? got.cx : 0).addScaledVector(e2, got ? got.cy : 0).addScaledVector(axis, along);
    const distAxis = (p) => { _v.copy(p).sub(centre); return _v.addScaledVector(axis, -_v.dot(axis)).length(); };
    const minDist = (ci) => { let m = 1e9; for (const i of ids[ci]) m = Math.min(m, distAxis(posOf(i, _w))); return m; };
    // the thumb: whichever way brings it to the cup, until it touches
    let ts = 1, tt = 0;
    { const d0 = minDist(0); pose(rig.thumb, 0.3, 1); rig.root.updateMatrixWorld(true); const dp = minDist(0); pose(rig.thumb, 0.3, -1); rig.root.updateMatrixWorld(true); const dm = minDist(0); ts = dp < dm ? 1 : -1; if (Math.min(dp, dm) > d0) ts = 0; }
    if (ts) { for (; tt < 0.55; tt += 0.025) { pose(rig.thumb, tt, ts); rig.root.updateMatrixWorld(true); if (minDist(0) < R + SKIN) break; } tt = Math.max(0, tt - 0.025); }
    // the cup's base centre in the hand bone's frame (its axis up the hand's bend axis, centred at the grip height)
    rig.hand.updateMatrixWorld(true);
    const inv = _m.copy(rig.hand.matrixWorld).invert();
    const base = centre.clone().addScaledVector(axis, -CUP.gripY * U);
    const g = { sign, angles, thumb: [ts, tt], baseLocal: base.applyMatrix4(inv), axisLocal: axis.clone().transformDirection(inv), axisWorldRest: axis.clone() };
    resetPose();
    return g;
  }
  function applyGrip(w) {
    const g = rig.grip, RATIO = [1, 1.15, 0.8];
    rig.fingers.forEach((ch, fi) => ch.forEach((b, j) => { if (b) b.quaternion.copy(rig.rest.get(b)).multiply(_q.setFromAxisAngle(_w.set(0, 0, 1), g.sign * g.angles[fi] * RATIO[j] * w)); }));
    rig.thumb.forEach((b, j) => { if (b) b.quaternion.copy(rig.rest.get(b)).multiply(_q.setFromAxisAngle(_w.set(0, 0, 1), g.thumb[0] * g.thumb[1] * RATIO[j] * w)); });
  }

  const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _p = new THREE.Vector3();
  return {
    root: holder,
    get ready() { return !!(rig && rig.grip); },
    get hand() { return rig && rig.hand; },
    // jbHand, jbKnuckle: Ji Bai's posed hand bone and his middle finger's base; fDir: where the fingers should point (world);
    // up: +1/-1, which way the cup's axis (the hand's bend axis) points
    update(jbHand, jbKnuckle, w = 1, fDir = null, up = 1) {
      if (!rig || !rig.hand) return false;
      if (!ready) { rig.grip = solve(); ready = true; rig.k = null; }
      if (!rig.grip) return false;
      resetPose(); applyGrip(w);
      // this hand bone on his: root = jbHand * inverse(hand in root) (that carries his units too)
      rig.root.position.set(0, 0, 0); rig.root.quaternion.identity(); rig.root.scale.copy(rig.base); rig.root.updateMatrixWorld(true);
      _m.copy(rig.root.matrixWorld).invert().multiply(rig.hand.matrixWorld);
      new THREE.Matrix4().copy(jbHand.matrixWorld).multiply(_m.invert()).decompose(rig.root.position, rig.root.quaternion, rig.root.scale);
      rig.root.updateMatrixWorld(true);
      // then his size: his wrist to middle knuckle against this hand's, measured in the same place
      const a = jbHand.getWorldPosition(new THREE.Vector3()).distanceTo(jbKnuckle.getWorldPosition(new THREE.Vector3()));
      const b = rig.hand.getWorldPosition(new THREE.Vector3()).distanceTo(rig.fingers[1][0].getWorldPosition(new THREE.Vector3()));
      rig.root.scale.multiplyScalar(a / Math.max(1e-6, b)); rig.root.updateMatrixWorld(true);
      rig.root.position.add(jbHand.getWorldPosition(new THREE.Vector3()).sub(rig.hand.getWorldPosition(new THREE.Vector3()))); rig.root.updateMatrixWorld(true);
      // the wrist: turn the hand so the cup's axis stands upright (up) and the fingers point along fDir
      if (fDir) {
        rig.hand.getWorldQuaternion(_qa);
        const axisNow = rig.grip.axisLocal.clone().applyQuaternion(_qa);
        const target = new THREE.Vector3(0, up, 0);
        _qb.setFromUnitVectors(axisNow, target);
        // then about the upright axis, so the fingers face fDir
        const fNow = new THREE.Vector3(1, 0, 0).applyQuaternion(_qa).applyQuaternion(_qb); fNow.y = 0;
        const fWant = fDir.clone(); fWant.y = 0;
        if (fNow.lengthSq() > 1e-6 && fWant.lengthSq() > 1e-6) { fNow.normalize(); fWant.normalize(); const ang = Math.atan2(fNow.x * fWant.z - fNow.z * fWant.x, fNow.dot(fWant)); _qb.premultiply(new THREE.Quaternion().setFromAxisAngle(target, -ang)); }
        const qWorld = _qb.multiply(_qa);
        rig.hand.parent.getWorldQuaternion(_qa);
        rig.hand.quaternion.copy(_qa.invert().multiply(qWorld));
        rig.root.updateMatrixWorld(true);
      }
      return true;
    },
    // the cup's base centre and its axis (world), after update
    socket(outPos, outAxis) {
      rig.hand.updateMatrixWorld(true);
      outPos.copy(rig.grip.baseLocal).applyMatrix4(rig.hand.matrixWorld);
      if (outAxis) outAxis.copy(rig.grip.axisLocal).transformDirection(rig.hand.matrixWorld);
      return outPos;
    },
    setVisible(v) { holder.visible = v; },
  };
}
