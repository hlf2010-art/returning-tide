// A Lamborghini Huracán LP 610-4 (2014), parked on Hankou Road by the south kerb, nose toward the
// Bund: the kind of car that is always parked somewhere near the Peace Hotel. It's the car the
// purchase journey will make yours.
// Model: "Lamborghini Huracan LP-6104 2014" by MdMahib on Sketchfab, CC-BY-4.0
// (https://sketchfab.com/3d-models/lamborghini-huracan-lp-6104-2014-4b7b162bcb4f48849f30b1c25b3102a3),
// supplied for this project; used as published (real scale, ~4.46 m). Loaded in the background:
// the street doesn't wait for it.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { addDynamicCollider } from './layout.js';

export const HURACAN_SPOT = { x: -40.6, z: 2.86 };            // Hankou Road, south kerb lane (kerb at z = 4), where people walk by

export function createHuracan(scene) {
  const group = new THREE.Group(); group.name = 'huracan'; scene.add(group);
  const collider = addDynamicCollider('car');
  const S = { root: null, wheels: [], lights: [] };
  const ready = new GLTFLoader().loadAsync('./models/huracan.glb').then((gltf) => {
    const root = gltf.scene;
    root.updateMatrixWorld(true);
    // which way is the front: from the front wheels to the rear ones
    const pos = (n) => { const o = root.getObjectByName(n); return o ? o.getWorldPosition(new THREE.Vector3()) : null; };
    const lf = pos('Wheel_02_LF_19'), lr = pos('Wheel_02_LR_20'), rf = pos('Wheel_02_RF_21');
    for (const n of ['Wheel_02_LF_19', 'Wheel_02_LR_20', 'Wheel_02_RF_21', 'Wheel_02_RR_22']) { const w = root.getObjectByName(n); if (w) S.wheels.push(w); }
    const fwd = lf && lr ? new THREE.Vector3().subVectors(lf, lr).setY(0).normalize() : new THREE.Vector3(0, 0, 1);
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
    spinWheels(dist) { for (const w of S.wheels) w.rotation.x = dist / 0.34; },
  };
}

function countTris(root) {
  let n = 0;
  root.traverse((o) => { if (o.isMesh) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
  return Math.round(n);
}
