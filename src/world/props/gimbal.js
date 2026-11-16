// The night gimbal as an object: what's on the desk in 612, in a tester's hand, on the table in
// front of Dad. A dozen small boxes and cylinders (about 26 cm tall); it changes a little with what
// you've done to it (a soft sleeve on the grip, a folding arm). Origin: the middle of the grip.
import * as THREE from 'three';

export function createGimbalProp({ phone = true } = {}) {
  const g = new THREE.Group(); g.name = 'night-gimbal';
  const body = new THREE.MeshStandardMaterial({ color: 0x17181b, roughness: 0.55, metalness: 0.1 });
  const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x17181b, roughness: 0.55 });
  const motorMat = new THREE.MeshStandardMaterial({ color: 0x2c2f35, roughness: 0.35, metalness: 0.6 });
  const armMat = new THREE.MeshStandardMaterial({ color: 0x24262b, roughness: 0.5, metalness: 0.15 });
  const add = (geo, mat, x, y, z, rx = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); m.castShadow = true; g.add(m); return m; };
  add(new THREE.CylinderGeometry(0.017, 0.019, 0.12, 12), sleeveMat, 0, 0, 0);                    // the grip
  add(new THREE.CylinderGeometry(0.021, 0.021, 0.022, 14), motorMat, 0, 0.072, 0);                // yaw motor
  const arm = add(new THREE.BoxGeometry(0.012, 0.012, 0.07), armMat, 0, 0.088, -0.03);             // back along the arm
  const up = add(new THREE.BoxGeometry(0.012, 0.075, 0.012), armMat, 0, 0.122, -0.062);            // up
  add(new THREE.CylinderGeometry(0.019, 0.019, 0.02, 14), motorMat, 0, 0.155, -0.05, Math.PI / 2); // roll motor
  add(new THREE.BoxGeometry(0.075, 0.012, 0.012), armMat, 0.035, 0.155, -0.034);                   // across to the pitch motor
  add(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 14), motorMat, 0.072, 0.155, -0.012, 0, Math.PI / 2);
  const clamp = add(new THREE.BoxGeometry(0.02, 0.085, 0.012), body, 0, 0.155, 0.002);             // the clamp
  const led = add(new THREE.BoxGeometry(0.004, 0.004, 0.002), new THREE.MeshBasicMaterial({ color: 0x45e08a }), 0, 0.03, 0.019);
  const ph = add(new THREE.BoxGeometry(0.15, 0.072, 0.009), new THREE.MeshStandardMaterial({ color: 0x0b0c0f, roughness: 0.2, metalness: 0.5 }), 0, 0.155, 0.012);
  ph.visible = phone;
  return {
    group: g,
    // what's been done to it shows: the sleeve, the wider clamp, the hinge, the aluminium arm
    setState(fixes = []) {
      const has = (id) => fixes.some((f) => f.id === id);
      sleeveMat.color.setHex(has('sleeve') ? 0x4a4d52 : 0x17181b); sleeveMat.roughness = has('sleeve') ? 0.95 : 0.55;
      clamp.scale.y = has('clamp') ? 1.18 : 1;
      armMat.color.setHex(has('alloy') ? 0xa9adb3 : 0x24262b); armMat.metalness = has('alloy') ? 0.85 : 0.15; armMat.roughness = has('alloy') ? 0.32 : 0.5;
      arm.scale.x = up.scale.x = has('lighten') || has('alloy') ? 0.75 : 1;
    },
    setPhone(v) { ph.visible = !!v; },
    setLed(on, low = false) { led.visible = on; led.material.color.setHex(low ? 0xe0503a : 0x45e08a); },
  };
}
