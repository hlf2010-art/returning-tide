// A police officer, dressed: one of the Rocketbox people in dark blue, a peaked cap and a reflective
// vest panel (there are no uniforms in the set). Shared by the row outside the Peace Hotel
// (world/confrontation.js) and the traffic officer who comes to an accident (world/roadReactions.js).
// a: { p (a person from people.js), h (heading) }; sets a.extra (the group added to the scene) and
// a.dress() (call after the pose each frame: cap and vest follow the head and chest).
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
export function dressPolice(scene, a, label = '警察') {
  a.p.root.traverse((o) => { if (o.isMesh && o.material && /body/i.test(o.material.name || '')) { o.material = o.material.clone(); o.material.color.setRGB(0.2, 0.25, 0.42); } });
  const g = new THREE.Group();
  const navy = new THREE.MeshStandardMaterial({ color: 0x141a2c, roughness: 0.7 });
  const cap = new THREE.Group();
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.098, 0.07, 14), navy); crown.position.y = 0.035;
  const peak = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.012, 14, 1, false, -Math.PI / 2.6, Math.PI / 1.3), new THREE.MeshStandardMaterial({ color: 0x08090c, roughness: 0.35 })); peak.position.set(0, 0.004, 0.075);
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.035), new THREE.MeshStandardMaterial({ color: 0xc9cdd3, metalness: 0.8, roughness: 0.4 })); badge.position.set(0, 0.04, 0.104);
  cap.add(crown, peak, badge);
  // the vest: a short tube round the chest, fluorescent with two reflective bands and 警察 (or 交警) POLICE on the front
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 192; const c = cv.getContext('2d');
  c.fillStyle = '#b9d21f'; c.fillRect(0, 0, 512, 192); c.fillStyle = '#d5d9de'; c.fillRect(0, 104, 512, 22); c.fillRect(0, 150, 512, 22);
  c.fillStyle = '#10131c'; c.textAlign = 'center'; c.font = '700 44px sans-serif'; c.fillText(label, 256, 50); c.font = '700 26px sans-serif'; c.fillText('POLICE', 256, 86);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const vm = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, emissive: new THREE.Color(0.05, 0.06, 0.01), side: THREE.DoubleSide });
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.2, 0.34, 18, 1, true), vm); tube.rotation.y = Math.PI; tube.scale.z = 0.72; tube.position.set(0, -0.05, 0.035);
  const vest = new THREE.Group(); vest.add(tube);
  g.add(cap, vest); scene.add(g); a.extra = g;
  a.dress = () => {
    a.p.bones.head.getWorldPosition(cap.position); cap.position.y += 0.15;
    cap.quaternion.setFromAxisAngle(UP, a.h); cap.position.x += Math.sin(a.h) * 0.02; cap.position.z += Math.cos(a.h) * 0.02;
    a.p.bones.chest.getWorldPosition(vest.position); vest.quaternion.setFromAxisAngle(UP, a.h);
  };
}
