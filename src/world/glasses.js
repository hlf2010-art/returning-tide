// Glasses, fitted to a Rocketbox head from its own eye bones (Bip01_LEye / Bip01_REye), and
// parented to the head bone so they move with it. Lots of people in Shanghai wear them.
//   styles: 'acetate' (black, thicker), 'metal' (thin gold), 'gunmetal' (thin dark), 'rimless'
import * as THREE from 'three';
import { mergeStatic } from './instancer.js';

const FRAME = {
  acetate: { color: 0x141414, metal: 0.1, rough: 0.35, rim: 0.0032, w: 1.0 },
  metal: { color: 0xb08a4a, metal: 1.0, rough: 0.3, rim: 0.0011, w: 0.96 },
  gunmetal: { color: 0x3a3c40, metal: 1.0, rough: 0.35, rim: 0.0013, w: 0.98 },
  rimless: { color: 0x9a9a9a, metal: 1.0, rough: 0.3, rim: 0.0007, w: 0.95 },
};
const lensMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0, clearcoat: 1, depthWrite: false });
const mats = {};
const frameMat = (s) => mats[s] || (mats[s] = new THREE.MeshStandardMaterial({ color: FRAME[s].color, metalness: FRAME[s].metal, roughness: FRAME[s].rough }));

function build(style, eyeGap) {
  const F = FRAME[style], g = new THREE.Group();
  const lw = eyeGap * 0.82 * F.w, lh = lw * 0.72, bridge = eyeGap - lw;
  for (const side of [-1, 1]) {
    const cx = side * eyeGap / 2;
    // the rim: a rounded rectangle tube (not drawn for rimless, just its lower edge as a fine wire)
    const shape = new THREE.Shape(), r = lh * 0.42, x0 = -lw / 2, y0 = -lh / 2;
    shape.moveTo(x0 + r, y0); shape.lineTo(x0 + lw - r, y0); shape.quadraticCurveTo(x0 + lw, y0, x0 + lw, y0 + r);
    shape.lineTo(x0 + lw, y0 + lh - r); shape.quadraticCurveTo(x0 + lw, y0 + lh, x0 + lw - r, y0 + lh);
    shape.lineTo(x0 + r, y0 + lh); shape.quadraticCurveTo(x0, y0 + lh, x0, y0 + lh - r); shape.lineTo(x0, y0 + r); shape.quadraticCurveTo(x0, y0, x0 + r, y0);
    const pts = shape.getSpacedPoints(40).map((p) => new THREE.Vector3(p.x + cx, p.y, 0));
    if (style !== 'rimless') {
      const rim = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 48, F.rim, 5, true), frameMat(style));
      g.add(rim);
    }
    const lens = new THREE.Mesh(new THREE.ShapeGeometry(shape, 8), lensMat); lens.position.x = cx; lens.renderOrder = 2; g.add(lens);
    // temple arm, back toward the ear
    const arm = new THREE.Mesh(new THREE.BoxGeometry(F.rim * 1.6, F.rim * 2.2, 0.105), frameMat(style));
    arm.position.set(side * (eyeGap / 2 + lw / 2 + 0.002), lh * 0.22, -0.052); arm.rotation.y = side * 0.06; g.add(arm);
  }
  const br = new THREE.Mesh(new THREE.CylinderGeometry(F.rim * 0.9, F.rim * 0.9, bridge + 0.004, 6), frameMat(style));
  br.rotation.z = Math.PI / 2; br.position.y = lh * 0.18; g.add(br);
  // one mesh for the frame, one for the lenses: 2 draw calls a pair instead of 7
  const byMat = new Map();
  for (const o of [...g.children]) { if (!byMat.has(o.material)) byMat.set(o.material, []); byMat.get(o.material).push(o); g.remove(o); }
  for (const [mat, list] of byMat) { const m = new THREE.Mesh(mergeStatic(list), mat); m.renderOrder = list[0].renderOrder; g.add(m); }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = false; } });
  return g;
}

// person: from people.js createPerson (in its bind / current pose, root in the scene or not)
export function addGlasses(person, style = 'metal') {
  const root = person.root, head = person.bones.head;
  const L = root.getObjectByName('Bip01_LEye'), R = root.getObjectByName('Bip01_REye');
  if (!head || !L || !R) return null;
  root.updateMatrixWorld(true);
  const pl = L.getWorldPosition(new THREE.Vector3()), pr = R.getWorldPosition(new THREE.Vector3());
  const eyeGap = pl.distanceTo(pr);
  const g = build(style, eyeGap);
  // place in world (eyes' midpoint, a little in front, facing the way the face faces), then keep
  // that placement relative to the head bone
  const mid = pl.clone().add(pr).multiplyScalar(0.5);
  const right = pr.clone().sub(pl).normalize();                         // from left eye to right eye
  const fwd = new THREE.Vector3(0, 1, 0).cross(right).normalize();       // the way the face points
  if (fwd.dot(new THREE.Vector3(Math.sin(root.rotation.y), 0, Math.cos(root.rotation.y))) < 0) fwd.negate();
  // a right-handed basis x = the face's left, y = up, z = forward (the glasses are symmetric in x
  // and were built facing +z)
  const left = right.clone().negate(), up = new THREE.Vector3().crossVectors(fwd, left).normalize();
  const m = new THREE.Matrix4().makeBasis(left, up, fwd);
  const worldQ = new THREE.Quaternion().setFromRotationMatrix(m);
  const worldP = mid.add(fwd.multiplyScalar(eyeGap * 0.32));
  head.updateWorldMatrix(true, false);
  const inv = new THREE.Matrix4().copy(head.matrixWorld).invert();
  const local = new THREE.Matrix4().compose(worldP, worldQ, new THREE.Vector3(1, 1, 1)).premultiply(inv);
  local.decompose(g.position, g.quaternion, g.scale);
  g.name = `glasses-${style}`;
  head.add(g);
  if (person.accessories) person.accessories.push(g);      // (not drawn beyond a few metres: world/people.js cullPeople)
  return g;
}
