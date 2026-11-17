// Cloth and hair that move: spring bones (the VRM spring-bone method). tools/cloth/cloth.mjs adds chains of
// bones named Spring_* to a person's model (a skirt's ring, a ponytail, a trouser hem, a jacket's hem) and
// gives part of that cloth's weight to them; here each chain's tail swings with inertia, falls with gravity,
// springs back toward where the animation would hold it, and is pushed out of the legs and the body, so a
// skirt sways and is pushed by the knees, a ponytail swings, a wide trouser leg hangs and lags.
//   createSprings(root) -> null (no spring bones) | { update(dt), reset() }
// Each chain's settings are on its first bone's glTF extras (userData.spring): stiffness, drag, gravity,
// radius (of its tips), colliders (bone names, as capsules to the next bone, with radii).
// Cost: a handful of bones a person; people beyond SPRING_FAR from the viewer hold still.
import * as THREE from 'three';

let viewer = null;
export const SPRING_FAR = 30;
export function setSpringViewer(obj) { viewer = obj; }

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
const _pw = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const GRAVITY = new THREE.Vector3(0, -1, 0);

export function createSprings(root) {
  const chains = [];
  root.traverse((o) => {
    if (!o.isBone || !/^Spring_/.test(o.name) || (o.parent && /^Spring_/.test(o.parent.name))) return;
    const cfg = Object.assign({ stiffness: 1.2, drag: 0.35, gravity: 0.6, radius: 0.02, colliders: [] }, o.userData.spring || {});
    const joints = []; let b = o;
    while (b) {
      const next = b.children.find((c) => /^Spring_/.test(c.name) || /_tip$/.test(c.name));
      if (!next) break;
      joints.push({ bone: b, child: next, restQ: b.quaternion.clone(), axis: next.position.clone().normalize(), len: 0, tail: new THREE.Vector3(), prev: new THREE.Vector3() });
      b = next.isBone && /^Spring_/.test(next.name) ? next : null;
    }
    if (joints.length) chains.push({ cfg, joints, colliders: cfg.colliders.map((c) => ({ a: root.getObjectByName(c.bone), b: c.to ? root.getObjectByName(c.to) : null, r: c.r })).filter((c) => c.a) });
  });
  if (!chains.length) return null;
  let primed = false; const last = new THREE.Vector3();
  function prime() {
    root.updateMatrixWorld(true);
    for (const ch of chains) for (const j of ch.joints) {
      j.bone.quaternion.copy(j.restQ); j.bone.updateMatrixWorld(true);
      j.child.getWorldPosition(j.tail); j.prev.copy(j.tail); j.len = j.bone.getWorldPosition(_a).distanceTo(j.tail);
    }
    primed = true;
  }
  const caps = [];
  return {
    chains,
    reset() { primed = false; },
    update(dt) {
      root.getWorldPosition(_a);
      if (primed && _a.distanceTo(last) > 1.5) primed = false;                 // a teleport: no whip
      last.copy(_a);
      if (viewer) { viewer.getWorldPosition(_b); if (_a.distanceTo(_b) > SPRING_FAR) { primed = false; return; } }
      if (!primed) prime();
      dt = Math.min(dt, 1 / 30); if (dt <= 0) return;
      for (const ch of chains) {
        const { cfg } = ch;
        // the colliders, in world space this frame
        caps.length = 0;
        for (const c of ch.colliders) { const p0 = c.a.getWorldPosition(new THREE.Vector3()), p1 = c.b ? c.b.getWorldPosition(new THREE.Vector3()) : p0.clone(); caps.push({ p0, p1, r: c.r }); }
        for (const j of ch.joints) {
          const bone = j.bone, parent = bone.parent;
          parent.updateMatrixWorld(true);
          parent.matrixWorld.decompose(_p, _pw, _s);
          bone.quaternion.copy(j.restQ); bone.updateMatrixWorld(true);
          const head = bone.getWorldPosition(_a);
          // where the animation alone would hold the tail
          const restDir = _b.copy(j.axis).applyQuaternion(_q.copy(_pw).multiply(j.restQ)).normalize();
          // verlet: inertia (less drag), the pull back toward rest, gravity
          const next = _c.copy(j.tail).addScaledVector(_s.copy(j.tail).sub(j.prev), 1 - cfg.drag)
            .addScaledVector(restDir, cfg.stiffness * dt)
            .addScaledVector(GRAVITY, cfg.gravity * dt);
          // keep the length
          next.sub(head).normalize().multiplyScalar(j.len).add(head);
          // out of the body: capsules
          for (const cp of caps) {
            const seg = _s.copy(cp.p1).sub(cp.p0), l2 = seg.lengthSq(), t = l2 > 1e-8 ? Math.max(0, Math.min(1, next.clone().sub(cp.p0).dot(seg) / l2)) : 0;
            const closest = cp.p0.clone().addScaledVector(seg, t), d = next.clone().sub(closest), dist = d.length(), min = cp.r + cfg.radius;
            if (dist < min && dist > 1e-6) { next.copy(closest).addScaledVector(d, min / dist); next.sub(head).normalize().multiplyScalar(j.len).add(head); }
          }
          j.prev.copy(j.tail); j.tail.copy(next);
          // turn the bone so its axis points at the tail
          const want = _s.copy(next).sub(head).normalize();
          _q2.setFromUnitVectors(restDir, want);
          // world rotation = q2 * parentWorld * rest  ->  local = parentWorld^-1 * that
          const worldQ = _q.copy(_pw).multiply(j.restQ).premultiply(_q2);
          bone.quaternion.copy(_pw.clone().invert().multiply(worldQ));
          bone.updateMatrixWorld(true);
        }
      }
    },
  };
}
