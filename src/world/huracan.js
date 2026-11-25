// A Lamborghini Huracán LP 610-4 (2014), parked on Hankou Road by the south kerb, nose toward the
// Bund: the kind of car that is always parked somewhere near the Peace Hotel. It's the car the
// purchase journey will make yours.
// Model: "Lamborghini Huracan LP-6104 2014" by MdMahib on Sketchfab, CC-BY-4.0
// (https://sketchfab.com/3d-models/lamborghini-huracan-lp-6104-2014-4b7b162bcb4f48849f30b1c25b3102a3),
// supplied for this project; used as published (real scale, ~4.46 m). Loaded in the background:
// the street doesn't wait for it.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { capTextures } from './texCap.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { addDynamicCollider } from './layout.js';

export const HURACAN_SPOT = { x: -40.6, z: 2.86 };            // Hankou Road, south kerb lane (kerb at z = 4), where people walk by

// The model arrives as ~80 meshes; most share a material with others and never move relative to the
// body. Merged by material (the wheels left alone, they turn): about a third of the draw calls, the
// same picture, the same materials (lamps and paint are still found by name).
function mergeBody(root, keep) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), groups = new Map();
  const under = (o) => { for (let p = o; p; p = p.parent) if (keep.includes(p)) return true; return false; };
  root.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh || Array.isArray(o.material) || under(o) || o.geometry.morphAttributes.position) return;
    const key = `${o.material.uuid}|${Object.keys(o.geometry.attributes).sort().join(',')}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(o);
  });
  let removed = 0;
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const indexed = list.every((m) => m.geometry.index);
    const geos = list.map((m) => { let g = m.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld)); if (!indexed && g.index) g = g.toNonIndexed(); return g; });
    const merged = mergeGeometries(geos, false); if (!merged) continue;
    const m = new THREE.Mesh(merged, list[0].material); m.name = list[0].name; m.renderOrder = list[0].renderOrder;
    root.add(m);
    for (const o of list) { o.parent.remove(o); removed++; }
  }
  return removed;
}

export function createHuracan(scene) {
  const group = new THREE.Group(); group.name = 'huracan'; scene.add(group);
  const collider = addDynamicCollider('car');
  const S = { root: null, wheels: [], lights: [] };
  const ready = new GLTFLoader().loadAsync('./models/huracan.glb').then((gltf) => {
    const root = gltf.scene;
    capTextures(root, 2048);                                   // (two 4096 maps: 130 MB on the GPU for a parked car; world/texCap.js)
    root.updateMatrixWorld(true);
    // which way is the front: from the front wheels to the rear ones
    const pos = (n) => { const o = root.getObjectByName(n); return o ? o.getWorldPosition(new THREE.Vector3()) : null; };
    const lf = pos('Wheel_02_LF_19'), lr = pos('Wheel_02_LR_20'), rf = pos('Wheel_02_RF_21');
    // each wheel turns about its own axle: the model's wheel nodes have their origin elsewhere (the car's),
    // so each is hung from a pivot at its hub (the centre of its own bounds), the axle running left to right
    const axleW = lf && rf ? new THREE.Vector3().subVectors(rf, lf).normalize() : new THREE.Vector3(1, 0, 0);
    for (const n of ['Wheel_02_LF_19', 'Wheel_02_LR_20', 'Wheel_02_RF_21', 'Wheel_02_RR_22']) {
      const w = root.getObjectByName(n); if (!w) continue;
      const parent = w.parent, hub = new THREE.Box3().setFromObject(w).getCenter(new THREE.Vector3());
      const pivot = new THREE.Object3D(); pivot.name = `${n}-hub`; pivot.position.copy(parent.worldToLocal(hub.clone())); parent.add(pivot); pivot.updateMatrixWorld(true);
      pivot.attach(w);
      const q = parent.getWorldQuaternion(new THREE.Quaternion()).invert(), axle = axleW.clone().applyQuaternion(q).normalize();
      S.wheels.push({ pivot, axle });
    }
    const fwd = lf && lr ? new THREE.Vector3().subVectors(lf, lr).setY(0).normalize() : new THREE.Vector3(0, 0, 1);
    mergeBody(root, S.wheels.map((w) => w.pivot));
    // stand it on the ground, centred
    const box = new THREE.Box3().setFromObject(root), c = box.getCenter(new THREE.Vector3());
    root.position.set(-c.x, -box.min.y, -c.z);
    const holder = new THREE.Group(); holder.add(root);
    // turn the nose to +x (toward the Bund)
    holder.rotation.y = Math.atan2(1, 0) - Math.atan2(fwd.x, fwd.z);
    group.add(holder);
    group.position.set(HURACAN_SPOT.x, 0, HURACAN_SPOT.z);
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      const m = o.material;
      if (m && /Light/i.test(m.name || '')) { S.lights.push(m); m.emissiveIntensity = 0.15; }   // parked: lamps off (a glint of the DRL only)
      if (m && /CarPaint/i.test(m.name || '')) { m.envMapIntensity = 1.4; m.needsUpdate = true; }
    });
    // contact shadow: the dark under a parked car where no lamp reaches (a soft blob, not a shadow map)
    {
      const c = document.createElement('canvas'); c.width = 128; c.height = 256;
      const x = c.getContext('2d'), gr = x.createRadialGradient(64, 128, 10, 64, 128, 128);
      gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = gr; x.save(); x.scale(1, 1); x.fillRect(0, 0, 128, 256); x.restore();
      const t = new THREE.CanvasTexture(c);
      const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0.9 }));
      const sz = new THREE.Box3().setFromObject(holder).getSize(new THREE.Vector3());
      blob.rotation.x = -Math.PI / 2; blob.scale.set(sz.x + 0.5, Math.min(sz.z, 2.0) + 0.2, 1);    // length along x, body width (not the mirrors) along z
      blob.position.y = 0.012; blob.renderOrder = 1; group.add(blob);
    }
    // solid: the player walks round it
    const size = new THREE.Box3().setFromObject(holder).getSize(new THREE.Vector3());
    Object.assign(collider, { minX: HURACAN_SPOT.x - size.x / 2, maxX: HURACAN_SPOT.x + size.x / 2, minZ: HURACAN_SPOT.z - size.z / 2, maxZ: HURACAN_SPOT.z + size.z / 2 });
    S.root = root; S.size = size; S.rf = rf;
    return { size, triangles: countTris(root) };
  }).catch((err) => { console.warn('huracan: model not loaded', err); return null; });
  return {
    group, ready, collider,
    get loaded() { return !!S.root; },
    setLights(on) { for (const m of S.lights) m.emissiveIntensity = on ? 2.5 : 0.15; },
    get size() { return S.size || null; },
    // your colour, on delivery (the model's car-paint materials)
    setPaint(hex) { if (S.root) S.root.traverse((o) => { if (o.isMesh && /CarPaint|Coloured/i.test(o.material.name || '')) { o.material.color.setHex(hex); if (o.material.map) o.material.map = null; o.material.needsUpdate = true; } }); },
    spinWheels(dist) { for (const w of S.wheels) w.pivot.quaternion.setFromAxisAngle(w.axle, -dist / 0.34); },
  };
}

function countTris(root) {
  let n = 0;
  root.traverse((o) => { if (o.isMesh) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
  return Math.round(n);
}
