// A Rocketbox person sat at the wheel. Their clips are all standing ones, so the sitting is done
// here, every frame after the idle clip has been applied (it keeps the breathing and small shifts):
//   - the body is moved so the pelvis sits on the cushion
//   - the back reclines a little against the seat back
//   - legs: two-bone IK, feet on the pedals, knees up and forward
//   - arms: two-bone IK, hands on the rim at ten to two, elbows down and a little out; the hands
//     follow the wheel when it turns
//   - the head keeps whatever the person's own look-at gave it (glancing back at you when talking)
// Works in world space with the bones' own world transforms, so it doesn't care how the rig's
// local axes are oriented or that the model is in centimetres.
import * as THREE from 'three';

const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), v4 = new THREE.Vector3(), v5 = new THREE.Vector3();
const q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), q3 = new THREE.Quaternion();

// turn `bone` so that the direction to `child` points at `to` (all world space)
function aim(bone, child, to) {
  const bp = bone.getWorldPosition(v1), cp = child.getWorldPosition(v2);
  const cur = v3.subVectors(cp, bp), want = v4.subVectors(to, bp);
  if (cur.lengthSq() < 1e-10 || want.lengthSq() < 1e-10) return;
  q1.setFromUnitVectors(cur.normalize(), want.normalize());                 // world-space turn
  bone.getWorldQuaternion(q2);
  bone.parent.getWorldQuaternion(q3).invert();
  bone.quaternion.copy(q3.multiply(q1.multiply(q2)));                      // local = parent⁻¹ · turn · world
  bone.updateMatrixWorld(true);
}

// rotate a bone about a world axis
function turn(bone, axis, angle) {
  q1.setFromAxisAngle(axis, angle);
  bone.getWorldQuaternion(q2);
  bone.parent.getWorldQuaternion(q3).invert();
  bone.quaternion.copy(q3.multiply(q1.multiply(q2)));
  bone.updateMatrixWorld(true);
}

// two-bone IK: a (hip / shoulder) -> b (knee / elbow) -> c (ankle / wrist), c to `target`,
// the middle joint bending toward `pole` (a world direction)
const _t = new THREE.Vector3(), _d = new THREE.Vector3(), _p = new THREE.Vector3(), _m = new THREE.Vector3();
export function twoBone(a, b, c, target, pole) {
  const pa = a.getWorldPosition(new THREE.Vector3()), pb = b.getWorldPosition(new THREE.Vector3()), pc = c.getWorldPosition(new THREE.Vector3());
  const l1 = pa.distanceTo(pb), l2 = pb.distanceTo(pc);
  _d.subVectors(target, pa); let d = _d.length(); _d.normalize();
  d = Math.min(Math.max(d, Math.abs(l1 - l2) + 1e-4), l1 + l2 - 1e-4);
  const cosA = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  _p.copy(pole).addScaledVector(_d, -pole.dot(_d)).normalize();
  _m.copy(pa).addScaledVector(_d, l1 * cosA).addScaledVector(_p, l1 * sinA);   // where the knee / elbow goes
  aim(a, b, _m);
  _t.copy(pa).addScaledVector(_d, d);
  aim(b, c, _t);
}

export function createSeatedPose(person) {
  const bone = (n) => person.root.getObjectByName(n);
  const B = {
    pelvis: bone('Bip01_Pelvis'), spine: bone('Bip01_Spine'), spine1: bone('Bip01_Spine1'),
    L: { thigh: bone('Bip01_L_Thigh'), calf: bone('Bip01_L_Calf'), foot: bone('Bip01_L_Foot'), upper: bone('Bip01_L_UpperArm'), fore: bone('Bip01_L_Forearm'), hand: bone('Bip01_L_Hand') },
    R: { thigh: bone('Bip01_R_Thigh'), calf: bone('Bip01_R_Calf'), foot: bone('Bip01_R_Foot'), upper: bone('Bip01_R_UpperArm'), fore: bone('Bip01_R_Forearm'), hand: bone('Bip01_R_Hand') },
  };
  const ok = B.pelvis && B.L.thigh && B.R.upper && B.L.hand;
  const right = new THREE.Vector3(), fwd = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), pole = new THREE.Vector3(), grip = new THREE.Vector3();

  // cabin: from cabin.js (hip, pedals, rimPoint); frame: the cabin group (its world matrix)
  return function apply(cabin, frame) {
    if (!ok) return;
    const root = person.root;
    // seat the pelvis on the cushion (root is a child of the cabin group, unrotated within it)
    root.updateMatrixWorld(true);
    const pw = B.pelvis.getWorldPosition(v5), local = frame.worldToLocal(pw.clone());
    root.position.add(v1.subVectors(cabin.hip, local));
    root.updateMatrixWorld(true);
    // car axes in world space
    fwd.set(0, 0, 1).transformDirection(frame.matrixWorld); right.set(-1, 0, 0).transformDirection(frame.matrixWorld);
    // a little recline from the hips
    turn(B.spine, right, 0.1);
    // legs: feet to the pedals, knees forward and up
    for (const [s, i] of [['L', 0], ['R', 1]]) {
      const p = cabin.pedals[i].clone().applyMatrix4(frame.matrixWorld);
      pole.copy(fwd).add(up).normalize();
      twoBone(B[s].thigh, B[s].calf, B[s].foot, p, pole);
    }
    // arms: hands on the rim, ten to two; wrists a hand's width short of the rim
    for (const [s, a, side] of [['L', -1.0, 1], ['R', 1.0, -1]]) {
      cabin.rimPoint(a, grip);
      const shoulder = B[s].upper.getWorldPosition(v2);
      const toward = v3.subVectors(grip, shoulder).normalize();
      grip.addScaledVector(toward, -0.075);
      pole.set(0, -1, 0).addScaledVector(right, -side * 0.6).addScaledVector(fwd, -0.2).normalize();   // elbows down and out
      twoBone(B[s].upper, B[s].fore, B[s].hand, grip, pole);
    }
  };
}
