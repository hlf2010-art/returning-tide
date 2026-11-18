// The first-person hand for holding things: what shooters call the viewmodel's hands. Ji Bai's own
// model (generated from his character sheet) has fingers that can't bend without tearing, so while he
// holds something his right hand is collapsed into the wrist and a properly skinned hand takes its place:
// the right hand of one of the Rocketbox people (MIT, already in the game; their fingers are rigged
// finger by finger), cut from its body at load, put where his hand bone is each frame and posed in a
// grip for the thing held (a cylindrical power grasp for a cup: four fingers round it, the thumb across).
//   const fp = createFpHand(people, 'p1'); scene/group.add(fp.root)
//   fp.update(jbHandBone, w)   w 0..1: how closed the grip is; places the hand on Ji Bai's hand bone
//   fp.palm(out) / fp.frame: where a held cup goes (world), after update
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const HAND = /^Bip01_R_(Hand|Finger\d*)$/, WRIST_CM = 7, SKIN_TINT = [1.2, 1.32, 1.55];
// how far each finger joint closes for a cup (radians: base, middle, tip); the thumb opposes it
export const GRIP = { fingers: [0.55, 0.75, 0.5], thumb: [0.3, 0.45, 0.35], spread: [0.06, 0.02, -0.03, -0.08] };

export function createFpHand(people, role = 'p1') {
  const src = people.avatars[role];
  const root = SkeletonUtils.clone(src); root.name = 'fp-hand';
  root.scale.setScalar(0.01);
  // keep only the triangles the right hand owns (and the wrist just above it), hide the rest of the body
  root.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    o.frustumCulled = false; o.castShadow = false; o.receiveShadow = true;
    const g = o.geometry.clone(), bones = o.skeleton.bones, J = g.attributes.skinIndex, W = g.attributes.skinWeight;
    // the hand, and the wrist a few cm up the forearm (it overlaps the end of his forearm: no gap at the join)
    const hi = bones.findIndex((b) => b.name === 'Bip01_R_Hand'), P = g.attributes.position;
    const hp = hi >= 0 ? new THREE.Vector3().setFromMatrixPosition(o.skeleton.boneInverses[hi].clone().invert()) : null;
    const handVert = new Uint8Array(J.count), v = new THREE.Vector3();
    for (let i = 0; i < J.count; i++) {
      let w = 0, arm = 0; for (let c = 0; c < 4; c++) { const b = bones[J.getComponent(i, c)]; if (!b) continue; if (HAND.test(b.name)) w += W.getComponent(i, c); else if (/^Bip01_R_Forearm/.test(b.name)) arm += W.getComponent(i, c); }
      const nearWrist = hp && (w + arm) > 0.5 && v.fromBufferAttribute(P, i).applyMatrix4(o.bindMatrix).distanceTo(hp) < WRIST_CM;
      handVert[i] = w > 0.35 || nearWrist ? 1 : 0;
    }
    const idx = g.index ? g.index.array : Array.from({ length: g.attributes.position.count }, (_, i) => i), keep = [];
    for (let t = 0; t < idx.length; t += 3) if (handVert[idx[t]] && handVert[idx[t + 1]] && handVert[idx[t + 2]]) keep.push(idx[t], idx[t + 1], idx[t + 2]);
    g.setIndex(keep); o.geometry = g;
    // his skin is lighter and pinker than this hand's: the material tinted to match (sampled from renders, tools/lab/hand.html)
    o.material = o.material.clone(); o.material.color.setRGB(...SKIN_TINT);
    if (!keep.length) o.visible = false;
  });
  const bone = (n) => root.getObjectByName(n);
  const hand = bone('Bip01_R_Hand');
  const fingers = [1, 2, 3, 4].map((k) => [bone(`Bip01_R_Finger${k}`), bone(`Bip01_R_Finger${k}1`), bone(`Bip01_R_Finger${k}2`)]);
  const thumb = [bone('Bip01_R_Finger0'), bone('Bip01_R_Finger01'), bone('Bip01_R_Finger02')];
  // the rest pose of the fingers (their bind), to pose from each frame
  const rest = new Map(); root.traverse((o) => { if (o.isBone) rest.set(o, o.quaternion.clone()); });
  const _m = new THREE.Matrix4(), _h = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
  root.updateMatrixWorld(true);
  // the hand's size against Ji Bai's, so his palm and this one match (set on the first update)
  let k = null;
  const span = (a, b) => a.getWorldPosition(new THREE.Vector3()).distanceTo(b.getWorldPosition(new THREE.Vector3()));
  const axisOf = { bend: 'z', spread: 'y' };   // Biped finger bones: they bend about their local z (checked in tools/lab/hand.html)
  return {
    root, hand, fingers, thumb,
    // jb: Ji Bai's hand bone (posed); jbKnuckle: his middle finger's base (for the size)
    // fDir (world): which way the fingers point; up: +1 / -1, which way the bend axis points (thumb up or down)
    update(jb, jbKnuckle, w = 1, sign = 1, fDir = null, up = 1) {
      if (k == null) { root.updateMatrixWorld(true); k = span(jb, jbKnuckle) / Math.max(1e-4, span(hand, fingers[1][0])); }
      // the grip: from the rest pose, every finger joint closes about its own bend axis
      for (const [b, q] of rest) b.quaternion.copy(q);
      fingers.forEach((ch, f) => ch.forEach((b, i) => { if (!b) return; _e.set(0, i === 0 ? GRIP.spread[f] * w : 0, sign * GRIP.fingers[i] * w); b.quaternion.multiply(_q.setFromEuler(_e)); }));
      thumb.forEach((b, i) => { if (b) { _e.set(0, 0, sign * GRIP.thumb[i] * w); b.quaternion.multiply(_q.setFromEuler(_e)); } });
      // put this hand bone exactly where his is (and his size): root = jbWorld * inverse(hand in root)
      root.position.set(0, 0, 0); root.quaternion.identity(); root.scale.setScalar(0.01); root.updateMatrixWorld(true);
      _h.copy(root.matrixWorld).invert().multiply(hand.matrixWorld);                 // the hand bone in the root's frame
      _m.copy(jb.matrixWorld).multiply(_h.invert());
      _m.decompose(root.position, root.quaternion, root.scale);
      root.scale.multiplyScalar(k);
      // (the scale is about the root: move it so the hand bone lands on his again)
      root.updateMatrixWorld(true);
      const at = jb.getWorldPosition(new THREE.Vector3()), now = hand.getWorldPosition(new THREE.Vector3());
      root.position.add(at.sub(now)); root.updateMatrixWorld(true);
      // stand the grip upright: the fingers along fDir (on from the forearm), their bend axis vertical, so the
      // cup in the ring stands straight; turned about the wrist
      if (fDir) {
        const qh = hand.getWorldQuaternion(new THREE.Quaternion());
        const x = fDir.clone().normalize(), z = new THREE.Vector3(0, up, 0).addScaledVector(x, -up * x.y).normalize(), y = new THREE.Vector3().crossVectors(z, x);
        const qd = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
        const d = qd.multiply(qh.invert()), piv = hand.getWorldPosition(new THREE.Vector3());
        root.position.sub(piv).applyQuaternion(d).add(piv); root.quaternion.premultiply(d); root.updateMatrixWorld(true);
      }
    },
    setVisible(v) { root.visible = v; },
  };
}
