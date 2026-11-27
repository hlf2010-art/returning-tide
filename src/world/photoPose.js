// People at the railing with a phone: the poses (laid over whatever the body is playing, after the
// mixer) and where the phone sits in the hands. Used by the full people near you (world/crowdView.js)
// and baked into the middle tier and the far cards (world/crowdBake.js, crowdView.js bakeImpostors).
//   land     a photo, landscape: both hands at the ends of the phone, up in front of the face
//   port     a photo, portrait: the right hand round its side, the left cradling it from below
//   one      a photo, portrait, one-handed (the right), a little lower
//   selfie   the right arm out and up, the screen toward the face (the river behind)
//   check    looking at what was taken: the texting clip, the phone in the right palm
//   lean     both hands on the railing's top rail, leaning a little to it (no phone)
// Everything is worked out in the person's own frame (forward +z, left +x, up +y about the feet; the
// root may be anywhere, turned any way). The poses are absolute (bones aimed at points), so the
// caller can blend them in by weight against the clip underneath: see blendPose.
import * as THREE from 'three';

export const PHONE_SIZE = [0.073, 0.152, 0.008];                        // a 6.1-inch phone, metres
export const PHONE_POSES = ['land', 'port', 'one', 'selfie'];
// the rail the lean is against, from the feet: how far in front, how high (promenade.js: top rail at deck + 1.17)
export const LEAN = { d: 0.52, h: 1.19 };

// what phones look like in people's hands: a case of some colour, a screen lit faintly (people near you
// get their own mesh, the middle tier one instanced mesh: phoneMesh)
const CASES = [0x1b1b1f, 0x1b1b1f, 0x1b1b1f, 0x2a2b30, 0xd9d6cf, 0xe9b8c0, 0x3d5f8a, 0x6b7f6a, 0xc8b18a, 0x8a1c25].map((c) => new THREE.Color(c));
export const phoneCase = (id) => CASES[((id * 2654435761) >>> 0) % CASES.length];
const PHONE_GEO = new THREE.BoxGeometry(...PHONE_SIZE);
let mats = null;
function phoneMats() {
  if (mats) return mats;
  const body = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.2 });
  const screen = new THREE.MeshStandardMaterial({ color: 0x0c0f14, roughness: 0.15, metalness: 0.1, emissive: 0x6f86a8, emissiveIntensity: 0.55 });
  // (box faces: +x -x +y -y +z -z; the screen is +z, toward the holder's eyes)
  return (mats = { body, screen, list: [body, body, body, body, screen, body] });
}
export function phoneMesh(count = 0) {
  const m = phoneMats();
  const mesh = count ? new THREE.InstancedMesh(PHONE_GEO, m.list, count) : new THREE.Mesh(PHONE_GEO, m.list.map((x) => (x === m.body ? x.clone() : x)));
  if (count) { mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3).fill(1), 3); mesh.frustumCulled = false; }
  mesh.castShadow = false;
  return mesh;
}

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _n = new THREE.Vector3();
const _q = new THREE.Quaternion(), _wq = new THREE.Quaternion(), _pq = new THREE.Quaternion();
function turnWorld(bone, axis, ang) {
  if (!bone || !ang) return;
  bone.getWorldQuaternion(_wq); _wq.premultiply(_q.setFromAxisAngle(axis, ang));
  bone.parent.getWorldQuaternion(_pq).invert(); bone.quaternion.copy(_pq.multiply(_wq)); bone.updateMatrixWorld(true);
}
function alignBone(bone, tip, want) {                                  // the line bone -> tip along want
  bone.getWorldPosition(_a); tip.getWorldPosition(_b); _c.subVectors(_b, _a).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(_c, _n.copy(want).normalize());
  const ax = new THREE.Vector3(q.x, q.y, q.z), s = ax.length(); if (s > 1e-6) turnWorld(bone, ax.divideScalar(s), 2 * Math.atan2(s, q.w));
}
// shoulder -> elbow -> wrist: the wrist to target, the elbow toward pole
function twoBone(up, mid, end, target, pole) {
  if (!up || !mid || !end) return;
  const s = new THREE.Vector3(), e = new THREE.Vector3(), h = new THREE.Vector3();
  up.getWorldPosition(s); mid.getWorldPosition(e); end.getWorldPosition(h);
  const l1 = s.distanceTo(e), l2 = e.distanceTo(h), d = THREE.MathUtils.clamp(s.distanceTo(target), Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3);
  const a = s.clone().sub(e).normalize(), b = h.clone().sub(e).normalize();
  const cur = Math.acos(THREE.MathUtils.clamp(a.dot(b), -1, 1)), want = Math.acos(THREE.MathUtils.clamp((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1));
  const n = new THREE.Vector3().crossVectors(a, b); if (n.lengthSq() < 1e-8) n.crossVectors(a, pole); n.normalize();
  turnWorld(mid, n, want - cur);
  end.getWorldPosition(h); const ax = target.clone().sub(s).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(h.sub(s).normalize(), ax);
  { const v = new THREE.Vector3(q.x, q.y, q.z), sn = v.length(); if (sn > 1e-6) turnWorld(up, v.divideScalar(sn), 2 * Math.atan2(sn, q.w)); }
  mid.getWorldPosition(e); const el = e.sub(s), pr = el.addScaledVector(ax, -el.dot(ax)), pl = pole.clone().addScaledVector(ax, -pole.dot(ax));
  if (pr.lengthSq() > 1e-8 && pl.lengthSq() > 1e-8) {
    pr.normalize(); pl.normalize(); let ang = Math.acos(THREE.MathUtils.clamp(pr.dot(pl), -1, 1));
    if (_n.crossVectors(pr, pl).dot(ax) < 0) ang = -ang; turnWorld(up, ax, ang);
  }
}

// the bones a pose touches (cached on the person)
function rig(person) {
  if (person._photoRig) return person._photoRig;
  const g = (n) => person.root.getObjectByName(`Bip01_${n}`);
  const side = (s) => ({
    up: g(`${s}_UpperArm`), fore: g(`${s}_Forearm`), hand: g(`${s}_Hand`),
    f: [0, 1, 2, 3, 4].map((k) => [g(`${s}_Finger${k}`), g(`${s}_Finger${k}1`), g(`${s}_Finger${k}2`)]),
  });
  const R = { spine: g('Spine'), spine1: g('Spine1'), head: g('Head'), neck: g('Neck'), R: side('R'), L: side('L') };
  R.ok = !!(R.R.up && R.R.hand && R.L.up && R.L.hand && R.head);
  R.all = [R.spine, R.spine1, R.neck, R.head, ...['R', 'L'].flatMap((s) => [R[s].up, R[s].fore, R[s].hand, ...R[s].f.flat()])].filter(Boolean);
  return (person._photoRig = R);
}

// a hand: wrist at W, the fingers along F, the palm facing N (toward what it holds); curls [base, mid, tip]
// per finger (index..little), the thumb's own; spread: the fingers fanned a little
function placeHand(H, W, F, N, { curl = [0.5, 0.6, 0.4], each = null, thumb = 0.4, thumbTo = null, pole }) {
  twoBone(H.up, H.fore, H.hand, W, pole);
  const knuckle = H.f[2][0]; if (!knuckle) return;
  alignBone(H.hand, knuckle, F);
  // roll about the fingers' line so the palm faces N: the palm normal is found from the thumb's side
  const thumbB = H.f[0][0], idx = H.f[1][0], lit = H.f[4][0];
  if (idx && lit) {
    H.hand.getWorldPosition(_a); knuckle.getWorldPosition(_b); const f = _b.clone().sub(_a).normalize();
    idx.getWorldPosition(_b); lit.getWorldPosition(_c);
    const across = _b.clone().sub(_c);                                   // little -> index, across the knuckles
    const palm = new THREE.Vector3().crossVectors(f, across).multiplyScalar(H === H._L ? 1 : -1);
    palm.addScaledVector(f, -palm.dot(f));
    const want = N.clone().addScaledVector(f, -N.dot(f));
    if (palm.lengthSq() > 1e-8 && want.lengthSq() > 1e-8) {
      palm.normalize(); want.normalize(); let ang = Math.acos(THREE.MathUtils.clamp(palm.dot(want), -1, 1));
      if (_n.crossVectors(palm, want).dot(f) < 0) ang = -ang; turnWorld(H.hand, f, ang);
    }
  }
  // fingers folding toward the palm: each finger's hinge is found once, from its base segment (it stays put
  // as the joints fold about it)
  const toward = N.clone().normalize();
  const hinge = (bone) => {
    const tip = bone && bone.children.find((c) => c.isBone); if (!tip) return null;
    bone.getWorldPosition(_a); tip.getWorldPosition(_b); const ax = new THREE.Vector3().crossVectors(_b.sub(_a).normalize(), toward);
    return ax.lengthSq() > 1e-6 ? ax.normalize() : null;
  };
  const fold = (chain, angs) => { const ax = hinge(chain[0]); if (ax) chain.forEach((b, j) => { if (b && angs[j]) turnWorld(b, ax, angs[j]); }); };
  for (let k = 1; k <= 4; k++) fold(H.f[k], (each && each[k - 1]) || curl);
  if (thumbB) {
    if (thumbTo && H.f[0][1]) alignBone(thumbB, H.f[0][1], thumbTo);
    fold([H.f[0][1], H.f[0][2]], [thumb, thumb * 0.8]);
  }
}

// person: from world/people.js createPerson, posed by its mixer this frame, root matrices up to date.
// opts.at: world [x, z] the camera points at (a photo) or null (straight ahead); opts.lean: { d, h } (LEAN)
// -> a Matrix4 (world) for the phone, or null when the pose has no phone
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export function applyPose(person, kind, opts = {}) {
  const R = rig(person); if (!R.ok) return null;
  R.R._L = R.L; R.L._L = R.L;
  const root = person.root; root.updateMatrixWorld(true);
  const yaw = root.rotation.y, s = person.size || 1;
  const fwd = V(Math.sin(yaw), 0, Math.cos(yaw)), left = V(Math.cos(yaw), 0, -Math.sin(yaw)), right = left.clone().negate(), up = V(0, 1, 0);
  const P = (base, f = 0, u = 0, r = 0) => base.clone().addScaledVector(fwd, f * s).addScaledVector(up, u * s).addScaledVector(right, r * s);
  const feet = root.getWorldPosition(V());
  // the camera's aim, kept within reach of the face (the body is turned roughly toward it already)
  let aim = fwd.clone();
  if (opts.at) { aim.set(opts.at[0] - feet.x, 0, opts.at[1] - feet.z); if (aim.lengthSq() < 1e-6) aim.copy(fwd); aim.normalize(); if (aim.dot(fwd) < 0.5) aim.lerp(fwd, 0.6).normalize(); }
  const eye = () => { const e = R.head.getWorldPosition(V()); return e.addScaledVector(fwd, 0.08 * s).addScaledVector(up, 0.07 * s); };

  if (kind === 'lean') {
    const L = opts.lean || LEAN;
    turnWorld(R.spine, left, 0.16); turnWorld(R.spine1, left, 0.08);   // (a positive turn about the left axis tips the chest forward)
    const rail = P(feet, L.d, L.h);
    for (const [H, sx] of [[R.R, 1], [R.L, -1]]) {
      const W = P(rail, -0.07, 0.035, sx * (0.2 + 0.03 * sx));
      placeHand(H, W, fwd.clone().addScaledVector(up, -0.35).addScaledVector(right, sx * 0.05), up.clone().negate(), { curl: [0.55, 0.9, 0.6], thumb: 0.25, pole: right.clone().multiplyScalar(sx).addScaledVector(up, -1).addScaledVector(fwd, -0.3) });
    }
    return null;
  }
  // ---- with a phone ----
  const e = eye();
  let C, along, face;
  if (kind === 'selfie') {
    C = P(e, 0.29, 0.06, 0.15);
    face = e.clone().sub(C).normalize();                              // the screen toward the face
  } else {
    const k = kind === 'one' ? 1 : 0;
    C = e.clone().addScaledVector(aim, (0.31 - 0.03 * k) * s).addScaledVector(up, (kind === 'land' ? -0.07 : -0.1 - 0.04 * k) * s).addScaledVector(right, (kind === 'one' ? 0.06 : 0.015) * s);
    face = e.clone().sub(C).normalize();
  }
  // the phone's long axis: across (landscape) or up the screen (portrait), square to the screen normal
  const upish = kind === 'land' ? right.clone() : up.clone();
  along = upish.addScaledVector(face, -upish.dot(face)).normalize();
  const across = new THREE.Vector3().crossVectors(along, face).normalize();   // (x of the phone)
  const back = face.clone().negate();                                         // toward the camera side
  const pole = (sx) => right.clone().multiplyScalar(sx * 0.9).addScaledVector(up, -1).addScaledVector(fwd, -0.2);
  if (kind === 'land') {
    const half = PHONE_SIZE[1] / 2;
    for (const [H, sx] of [[R.R, 1], [R.L, -1]]) {
      const end = C.clone().addScaledVector(along, sx * half);              // (along is the body's right)
      const F = up.clone().multiplyScalar(0.55).addScaledVector(back, 0.75).addScaledVector(along, -sx * 0.25).normalize();
      const W = end.clone().addScaledVector(along, sx * 0.028).addScaledVector(F, -0.062).addScaledVector(face, 0.004);
      placeHand(H, W, F, along.clone().multiplyScalar(-sx), { curl: [0.4, 0.7, 0.45], thumb: 0.25, thumbTo: up.clone().addScaledVector(face, 0.6).addScaledVector(along, -sx * 0.5), pole: pole(sx) });
    }
  } else {
    // the right hand behind the phone's lower right, palm to its back, the fingers up and across it, the
    // thumb round on to the screen (the shutter); for a two-handed portrait the left the same on the left
    const hands = kind === 'port' ? [[R.R, 1], [R.L, -1]] : [[R.R, 1]];
    for (const [H, sx] of hands) {
      const F = along.clone().multiplyScalar(0.8).addScaledVector(across, -sx * 0.5).normalize();
      const W = C.clone().addScaledVector(across, sx * 0.028).addScaledVector(along, -0.07).addScaledVector(face, -0.055);
      const pl = kind === 'selfie' ? right.clone().addScaledVector(up, -0.5).addScaledVector(fwd, -0.2) : pole(sx);
      placeHand(H, W, F, face, { curl: [0.25, 0.35, 0.3], thumb: 0.25, thumbTo: along.clone().multiplyScalar(0.6).addScaledVector(face, 0.7).addScaledVector(across, -sx * 0.3), pole: pl });
    }
  }
  const m = new THREE.Matrix4().makeBasis(across, along, face).setPosition(C);
  return m;
}

// the phone in the right palm (the texting clip): screen toward the eyes, along the fingers -> Matrix4 (world)
export function palmPhone(person) {
  const R = rig(person); if (!R.ok) return null;
  const yaw = person.root.rotation.y, fx = Math.sin(yaw), fz = Math.cos(yaw);
  const wrist = R.R.hand.getWorldPosition(V()), fin = R.R.f[2][0] ? R.R.f[2][0].getWorldPosition(V()) : wrist.clone().add(V(fx, 0.3, fz).multiplyScalar(0.08));
  const eye = R.head.getWorldPosition(V()).add(V(fx * 0.08, 0.06, fz * 0.08));
  const pos = wrist.clone().add(fin).multiplyScalar(0.5);
  const z = eye.clone().sub(pos).normalize(), y = fin.clone().sub(wrist);
  y.addScaledVector(z, -y.dot(z)); if (y.lengthSq() < 1e-6) y.set(fx, 0.6, fz).addScaledVector(z, -z.y * 0.6);
  y.normalize(); const x = new THREE.Vector3().crossVectors(y, z).normalize(); y.crossVectors(z, x).normalize();
  pos.addScaledVector(z, 0.012);
  return new THREE.Matrix4().makeBasis(x, y, z).setPosition(pos);
}

// blend a pose in by weight w (0..1) against the clip underneath: every touched bone slerped between
// the two. -> the phone's world matrix (or null). from: a palm phone matrix to ease out of (the check
// pose), so the phone travels with the hand instead of jumping
const _keep = new Map();
const _hi = new THREE.Matrix4(), _rel = new THREE.Matrix4(), _p1 = new THREE.Vector3(), _p2 = new THREE.Vector3(), _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _s1 = new THREE.Vector3();
export function blendPose(person, kind, w, opts = {}) {
  const R = rig(person); if (!R.ok || w <= 0.001) return null;
  if (w >= 0.999) return applyPose(person, kind, opts);
  for (const b of R.all) { let q = _keep.get(b); if (!q) _keep.set(b, (q = new THREE.Quaternion())); q.copy(b.quaternion); }
  const hand = R.R.hand;
  // the phone relative to the hand, in the clip (the palm) and in the pose
  const palm = opts.from || null;
  let relA = null;
  if (palm) { hand.updateMatrixWorld(true); relA = _rel.copy(_hi.copy(hand.matrixWorld).invert()).multiply(palm).clone(); }
  const m = applyPose(person, kind, opts);
  let relB = null;
  if (m) { hand.updateMatrixWorld(true); relB = _hi.copy(hand.matrixWorld).invert().multiply(m).clone(); }
  for (const b of R.all) b.quaternion.slerpQuaternions(_keep.get(b), b.quaternion, w);
  person.root.updateMatrixWorld(true);
  if (!relB) return null;
  const rel = relA ? (() => { relA.decompose(_p1, _q1, _s1); relB.decompose(_p2, _q2, _s1); return new THREE.Matrix4().compose(_p1.lerp(_p2, w), _q1.slerp(_q2, w), _s1.set(1, 1, 1)); })() : relB;
  hand.updateMatrixWorld(true);
  return new THREE.Matrix4().multiplyMatrices(hand.matrixWorld, rel);
}
