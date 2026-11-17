// Ji Bai, standing in the character page: his own body (people/player.glb), idling, lit like the Bund
// at night (a warm floodlight from one side, the river's cold light behind). Drag to turn him.
//   createPortrait(getPeople) -> { el, start(), stop() }
import * as THREE from 'three';
import { createPerson } from '../world/people.js';

export function createPortrait(getPeople) {
  const el = document.createElement('div'); el.className = 'portrait';
  const canvas = document.createElement('canvas'); el.appendChild(canvas);
  let R = null, scene, cam, person = null, raf = 0, last = 0, yaw = -0.35, drag = null, spin = 0;
  function init() {
    const people = getPeople && getPeople();
    if (!people || !people.avatars.player) { el.classList.add('none'); return false; }
    R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    R.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); R.outputColorSpace = THREE.SRGBColorSpace;
    R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.15; R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene();
    cam = new THREE.PerspectiveCamera(24, 1, 0.1, 50);
    const key = new THREE.SpotLight(0xffcf8a, 60, 14, 0.5, 0.6, 1.6); key.position.set(-2.4, 4.2, 3.2); key.target.position.set(0, 1, 0); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
    const rim = new THREE.DirectionalLight(0x69d2ff, 2.6); rim.position.set(2.6, 2.4, -3.2);
    const rim2 = new THREE.DirectionalLight(0x9fb8ff, 0.8); rim2.position.set(-3, 1.6, -2.5);
    scene.add(key, key.target, rim, rim2, new THREE.HemisphereLight(0x3a5a68, 0x0a0806, 0.55));
    // a pool of light on wet stone
    const g = document.createElement('canvas'); g.width = g.height = 256; const x = g.getContext('2d');
    const rg = x.createRadialGradient(128, 128, 0, 128, 128, 128); rg.addColorStop(0, 'rgba(236,212,154,0.55)'); rg.addColorStop(0.45, 'rgba(200,163,90,0.18)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = rg; x.fillRect(0, 0, 256, 256);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1.6, 64), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(g), transparent: true, depthWrite: false }));
    floor.rotation.x = -Math.PI / 2; scene.add(floor);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.4, 48), new THREE.ShadowMaterial({ opacity: 0.55 })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.002; shadow.receiveShadow = true; scene.add(shadow);
    person = createPerson(people, 'player');
    person.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
    scene.add(person.root); person.play('idle', 0);
    canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, yaw }; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', (e) => { if (drag) yaw = drag.yaw + (e.clientX - drag.x) * 0.012; });
    canvas.addEventListener('pointerup', () => { drag = null; spin = performance.now(); });
    return true;
  }
  function size() {
    const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
    R.setSize(w, h, false); cam.aspect = w / h;
    // full figure, from slightly below the eye line: he stands a little taller than you
    const fit = Math.max(1.95 / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))), 1.0 / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.aspect));
    cam.position.set(0, 0.86, fit * 1.12 + 0.4); cam.lookAt(0, 0.93, 0); cam.updateProjectionMatrix();
  }
  function frame(t) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - last) / 1000 || 0); last = t;
    if (!drag && performance.now() - spin > 2500) yaw += (-0.35 - yaw) * Math.min(1, dt * 0.8);   // he turns back to you
    person.root.rotation.y = yaw; person.update(dt);
    if (canvas.width !== Math.round(el.clientWidth * R.getPixelRatio())) size();
    R.render(scene, cam);
  }
  return {
    el,
    start() { if (!R && !init()) return; size(); cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame); },
    stop() { cancelAnimationFrame(raf); raf = 0; },
  };
}
