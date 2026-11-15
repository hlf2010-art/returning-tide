// Where you can go in. Among a hundred arched doorways on the Bund, the few that open are marked the
// same way everywhere: a warm pool of light on the pavement in front of the door (with a real light
// in it), and, once the door is in view and within ~35 m, a small label floating over it
// ("Peace Hotel · go in"). The label hides behind buildings, fades with distance, and gives way to
// the usual E prompt when you're at the door. Closed doors (the shop after hours) aren't marked.
import * as THREE from 'three';
import { glowTexture } from './canvas.js';
import { L, METRO, PIER, DUMPLING, colliders } from './layout.js';
import { PEACE, AIA } from './interiors.js';
import { segmentHitsBox, BLOCKING_TAGS } from '../engine/targeting.js';
import { getLang } from '../ui/i18n.js';

const T = (zh, en) => (getLang() === 'zh' ? zh : en);
// x, z: the doorway; nx, nz: which way it faces (out to the street); y: the floor there
export function entranceList({ shopOpen = () => true, cruiseOpen = () => true, metroOpen = () => true } = {}) {
  const pdx = (PEACE.door[0] + PEACE.door[1]) / 2, adz = (AIA.door[0] + AIA.door[1]) / 2;
  return [
    { id: 'peace', name: ['和平饭店', 'Peace Hotel'], act: ['进去', 'go in'], x: pdx, z: PEACE.z1 + 0.6, nx: 0, nz: 1, y: L.curbH, w: 4.2 },
    { id: 'aia', name: ['友邦大厦', 'The AIA Building'], act: ['进去', 'go in'], x: L.facadeX + 0.4, z: adz, nx: 1, nz: 0, y: L.curbH, w: 3.6 },
    { id: 'shengjian', name: ['阿潮生煎', 'A-Chao Shengjian'], act: ['进店', 'go in'], x: (DUMPLING.x0 + DUMPLING.x1) / 2, z: DUMPLING.z0 - 0.2, nx: 0, nz: -1, y: L.curbH, w: 4, open: shopOpen },
    ...METRO.map((m) => ({ id: m.id, name: [`地铁 ${m.exit} 号口`, `Metro, Exit ${m.exit}`], act: ['下楼', 'down to Line 2'], x: m.top + Math.sign(m.top - m.bottom) * 0.8, z: (m.z0 + m.z1) / 2, nx: Math.sign(m.top - m.bottom), nz: 0, y: L.curbH, w: 3, open: metroOpen, glow: false })),
    { id: 'pier', name: ['浦江游览', 'River cruise'], act: ['码头', 'the pier'], x: PIER.x0 - 0.6, z: (PIER.z0 + PIER.z1) / 2, nx: -1, nz: 0, y: L.deckY, w: 4.5, open: cruiseOpen },
  ];
}

export function createEntrances({ scene, camera, list }) {
  const group = new THREE.Group(); group.name = 'entrances'; scene.add(group);
  // the light spilling out of each open door onto the pavement
  const poolMat = new THREE.MeshBasicMaterial({ map: glowTexture(128, [[0, 0.55], [0.45, 0.22], [1, 0]]), color: new THREE.Color(1.0, 0.78, 0.5).multiplyScalar(0.35), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const layer = document.createElement('div'); layer.id = 'entrance-labels'; document.body.appendChild(layer);
  const items = list.map((e) => {
    let pool = null;
    if (e.glow !== false) {
      pool = new THREE.Mesh(new THREE.PlaneGeometry(e.w * 1.6, 4.2).rotateX(-Math.PI / 2), poolMat);
      pool.position.set(e.x + e.nx * 1.6, e.y + 0.03, e.z + e.nz * 1.6); pool.rotation.y = Math.atan2(e.nx, e.nz); group.add(pool);
    }
    const el = document.createElement('div'); el.className = 'ent'; el.innerHTML = '<i>⇢</i><b></b><span></span>'; layer.appendChild(el);
    return { ...e, pool, el, seen: false, losT: 0, op: 0 };
  });
  // a light source at each door for the lamp pool (lighting.js picks the nearest few)
  const lights = list.filter((e) => e.glow !== false).map((e) => ({ x: e.x + e.nx * 1.2, y: e.y + 2.6, z: e.z + e.nz * 1.2, intensity: 7, distance: 9, color: new THREE.Color(1.0, 0.82, 0.58), on: () => !e.open || e.open() }));
  const _v = new THREE.Vector3();
  let lang = null;
  return {
    group, lights,
    // per frame: eye (camera position), near: the E prompt is showing (the label steps aside)
    update(dt, { eye, prompting = false, active = true }) {
      if (lang !== getLang()) { lang = getLang(); for (const it of items) { it.el.querySelector('b').textContent = T(...it.name); it.el.querySelector('span').textContent = T(...it.act); } }
      for (const it of items) {
        const open = !it.open || it.open();
        if (it.pool) it.pool.visible = open;
        const dx = it.x - eye.x, dz = it.z - eye.z, d = Math.hypot(dx, dz);
        // in front of the door (not behind its wall), within range, and nothing in the way (checked a few times a second)
        const facing = dx * it.nx + dz * it.nz < 0.5;
        let want = active && open && facing && d < 36 && d > 4.5 && !(prompting && d < 7);
        if (want) {
          it.losT -= dt;
          if (it.losT <= 0) { it.losT = 0.3; it.seen = !colliders.some((b) => BLOCKING_TAGS.has(b.tag) && segmentHitsBox(eye.x, eye.z, it.x + it.nx * 0.6, it.z + it.nz * 0.6, b, 0.4)); }
          want = it.seen;
        }
        _v.set(it.x, it.y + 3.2, it.z).project(camera);
        if (_v.z > 1 || Math.abs(_v.x) > 1.05 || Math.abs(_v.y) > 1.05) want = false;
        const target = want ? Math.min(1, (36 - d) / 8) : 0;
        it.op += (target - it.op) * Math.min(1, dt * 6);
        if (it.op < 0.02) { if (it.el.style.opacity !== '0') it.el.style.opacity = '0'; continue; }
        it.el.style.opacity = it.op.toFixed(2);
        it.el.style.transform = `translate(${((_v.x + 1) / 2 * innerWidth).toFixed(0)}px, ${((1 - _v.y) / 2 * innerHeight).toFixed(0)}px) translate(-50%, -100%) scale(${(0.85 + 0.25 * Math.max(0, 1 - d / 36)).toFixed(2)})`;
      }
    },
  };
}
