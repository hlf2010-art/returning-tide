// Lights. Buildings are self-lit (see materials.js), so real lights only have to
// serve the wet ground and props. Per-pixel point lights are the most expensive
// thing in the frame, so every lamp is a *source* but only the nearest few get a
// real PointLight; the rest keep their halo and a cheap pool of light on the ground.
import * as THREE from 'three';
import { L, deckLamps, DECK_LAMP_X, roadLamps, ROAD_LAMP_WEST_OFFSET } from './layout.js';
import { glowTexture } from './canvas.js';

const WARM = new THREE.Color(1.0, 0.72, 0.42);
const POOL = 6;
// Shadows: the nearest lamps (up to SHADOW_SLOTS) also get a downward SpotLight with a shadow map,
// crossfaded against their PointLight so handing a lamp's shadow to another lamp never pops.
// Night shadows come from the lamps, so they fan out from under each one, soft-edged.
export const SHADOW_SLOTS = 2;

export function createLighting(scene, lanterns, extra = []) {
  const group = new THREE.Group(); group.name = 'lighting';
  const hemi = new THREE.HemisphereLight(0x5578c8, 0x2a221c, 0.55);
  group.add(hemi);
  const sky = new THREE.DirectionalLight(0x6f8fd8, 0.35);      // the last of the sky, from over the river; by day, the sun
  sky.position.set(0.6, 1, -0.2); group.add(sky, sky.target);
  // by day the sun casts the shadows (the lamps' shadow slots stand down): a box round the eye
  sky.shadow.mapSize.set(2048, 2048); sky.shadow.bias = -0.0005; sky.shadow.normalBias = 0.04; sky.shadow.radius = 2;
  Object.assign(sky.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 500 });
  const NIGHT = { sky: new THREE.Color(0x5578c8), ground: new THREE.Color(0x2a221c), hemi: 0.55, dir: new THREE.Color(0x6f8fd8), dirI: 0.35 };
  const DEEP = { sky: new THREE.Color(0x34466e), ground: new THREE.Color(0x2a221c), hemi: 0.42 };
  const DAY = { sky: new THREE.Color(0xc4d0de), ground: new THREE.Color(0x7a6e60), hemi: 1.35, sun: new THREE.Color(1.0, 0.93, 0.82), low: new THREE.Color(1.0, 0.66, 0.42), sunI: 1.9 };
  const T = { day: 0, lamps: 1, sun: { x: 0, y: -1, z: 0 }, inside: 0 };
  let sunShadow = false;

  const inRange = (z) => z > L.zNorth - 30 && z < L.zSouth + 30;
  const sources = [], halos = [], pools = [];
  // out: a street / promenade lamp, which goes off by day (indoor lights stay on)
  const source = (x, y, z, intensity, distance, color = WARM, angle = 1.15, out = true) => sources.push({ x, y, z, intensity, distance, color, angle, out, d: 0, sw: 0 });
  for (const z of deckLamps) {
    halos.push(DECK_LAMP_X, L.deckY + 4.3, z);
    if (inRange(z)) { source(DECK_LAMP_X - 0.3, L.deckY + 4.3, z, 17, 30); pools.push(DECK_LAMP_X - 1.2, L.deckY, z, 13); }
  }
  for (const z of roadLamps) {
    const zw = z + ROAD_LAMP_WEST_OFFSET;
    halos.push(L.eastCurbX + 0.5, 8.1, z, L.westCurbX - 0.5, 8.1, zw);
    if (inRange(z)) { source(L.eastCurbX - 1.0, 8.0, z, 150, 55); pools.push(L.eastCurbX - 1.5, 0, z, 26); }
    if (inRange(zw)) { source(L.westCurbX + 1.0, 8.0, zw, 150, 55); pools.push(L.westCurbX + 1.5, 0, zw, 26); }
  }
  for (const l of lanterns) { halos.push(l.x, l.y - 0.38, l.z + l.n * 0.4); source(l.x, l.y - 0.45, l.z + l.n * 0.55, 20, 20, WARM, 1.35); }
  source(-69.2, 2.1, -L.street.halfW + 1.3, 9, 13, new THREE.Color(1.0, 0.85, 0.62), 1.4, false);   // shop window spill
  for (const e of extra) source(e.x, e.y, e.z, e.intensity, e.distance, e.color || WARM, e.angle || 1.3, !!e.out);
  for (const x of [-112, -134, -156]) halos.push(x, 4, x % 4 ? 6 : -6);                // lamps beyond the hoarding

  const lights = [];
  for (let i = 0; i < POOL; i++) { const l = new THREE.PointLight(WARM, 0, 30, 2); group.add(l); lights.push(l); }
  const slots = [];
  for (let i = 0; i < SHADOW_SLOTS; i++) {
    const sp = new THREE.SpotLight(WARM, 0, 30, 1.15, 0.75, 2);
    sp.castShadow = false;
    sp.shadow.mapSize.set(1024, 1024); sp.shadow.camera.near = 0.3; sp.shadow.bias = -0.0004; sp.shadow.normalBias = 0.03; sp.shadow.radius = 3;
    group.add(sp, sp.target);
    slots.push({ light: sp, src: null, w: 0 });
  }
  let shadowCount = 0;

  const hg = new THREE.BufferGeometry();
  hg.setAttribute('position', new THREE.Float32BufferAttribute(halos, 3));
  const haloColor = new THREE.Color(1.0, 0.66, 0.36).multiplyScalar(0.5);
  const hp = new THREE.Points(hg, new THREE.PointsMaterial({
    map: glowTexture(128), color: haloColor.clone(), size: 2.4, sizeAttenuation: true,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: true,
  }));
  hp.name = 'halos'; hp.frustumCulled = false; group.add(hp);

  // Soft pools under every lamp: what distant lamps contribute once they lose their real light.
  const poolColor = new THREE.Color(1.0, 0.68, 0.38).multiplyScalar(0.09);
  const poolMat = new THREE.MeshBasicMaterial({
    map: glowTexture(128, [[0, 0.5], [0.4, 0.2], [1, 0]]), color: poolColor.clone(),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
  });
  const pg = [], pu = [];
  for (let i = 0; i < pools.length; i += 4) {
    const [x, y, z, s] = pools.slice(i, i + 4), h = s / 2, yy = y + 0.17;
    pg.push(x - h, yy, z + h, x + h, yy, z + h, x + h, yy, z - h, x - h, yy, z + h, x + h, yy, z - h, x - h, yy, z - h);
    pu.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
  }
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute('position', new THREE.Float32BufferAttribute(pg, 3)); pgeo.setAttribute('uv', new THREE.Float32BufferAttribute(pu, 2));
  const poolMesh = new THREE.Mesh(pgeo, poolMat); poolMesh.name = 'light-pools'; group.add(poolMesh);
  scene.add(group);

  return {
    group, sources,
    // Hand the real lights to the lamps nearest the camera. Each light's strength also
    // falls to zero as it approaches the cut-off rank, so swaps never pop.
    update(cam, dt = 1 / 60) {
      // the sun's shadow box follows the eye, snapped to its texels so edges don't crawl
      if (sunShadow) {
        const step = 120 / 2048, sx = Math.round(cam.x / step) * step, sz = Math.round(cam.z / step) * step;
        sky.target.position.set(sx, 0, sz); sky.position.set(sx + T.sun.x * 250, Math.max(20, T.sun.y * 250), sz + T.sun.z * 250);
        sky.target.updateMatrixWorld();
      }
      // (lamps that are off by day give their real lights to the rooms)
      for (const s of sources) s.d = Math.hypot(s.x - cam.x, s.y - cam.y, s.z - cam.z) + (s.out && T.lamps < 0.02 ? 1e5 : 0);
      sources.sort((a, b) => a.d - b.d);
      // shadow slots: each wants one of the nearest lamps; a slot lets its lamp go (fading out)
      // before it takes another (fading in)
      const want = sources.slice(0, shadowCount);
      for (let i = 0; i < slots.length; i++) {
        const sl = slots[i];
        if (i >= shadowCount) { if (sl.src) { sl.src.sw = 0; sl.src = null; } sl.w = 0; continue; }
        if (!sl.src || (!want.includes(sl.src) && sl.w <= 0.001)) {
          if (sl.src) sl.src.sw = 0;
          sl.src = want.find((s) => !slots.some((o) => o.src === s)) || null; sl.w = 0;
        }
        if (!sl.src) continue;
        const target = want.includes(sl.src) ? 1 : 0;
        sl.w += Math.sign(target - sl.w) * Math.min(Math.abs(target - sl.w), dt / 0.6);
        sl.src.sw = sl.w;
      }
      const edge = sources.length > POOL ? sources[POOL].d : Infinity;
      for (let i = 0; i < POOL; i++) {
        const s = sources[i], l = lights[i];
        if (!s) { l.intensity = 0; continue; }
        const k = Math.min(1, Math.max(0, (edge - s.d) / (edge * 0.3)));
        l.position.set(s.x, s.y, s.z); l.color.copy(s.color); l.distance = s.distance; l.intensity = s.intensity * k * (1 - s.sw) * (s.out ? T.lamps : 1);
      }
      for (const sl of slots) {
        const l = sl.light, s = sl.src;
        if (!s || !l.castShadow) { l.intensity = 0; continue; }
        l.position.set(s.x, s.y, s.z); l.target.position.set(s.x, s.y - 10, s.z); l.target.updateMatrixWorld();
        l.color.copy(s.color); l.distance = s.distance; l.angle = s.angle; l.intensity = s.intensity * sl.w * (s.out ? T.lamps : 1);
        l.shadow.camera.far = s.distance;
      }
    },
    // how many lamps cast shadows (quality); changing it recompiles the lit materials once.
    // By day the sun takes over: one shadow map, the lamps' slots off.
    setShadowCount(n) {
      n = Math.max(0, Math.min(SHADOW_SLOTS, n));
      const sun = n > 0 && T.day > 0.35 && T.sun.y > 0.05 && T.inside < 0.5;
      if (n === shadowCount && sun === sunShadow) return;
      shadowCount = n; sunShadow = sun;
      sky.castShadow = sun;
      slots.forEach((sl, i) => { sl.light.castShadow = !sun && i < n; });
    },
    get sunShadow() { return sunShadow; },
    // the hour (engine/timeOfDay.js todState); inside: 0..1 how far indoors the player is (rooms keep
    // their own light, not the sky's)
    setTime(st, inside = 0) {
      T.day = st.daylight; T.lamps = st.lamps; T.sun = st.sun; T.inside = inside;
      const d = st.daylight * (1 - 0.75 * inside), up = Math.max(0, Math.min(1, st.sun.y / 0.25));
      hemi.color.copy(NIGHT.sky).lerp(DEEP.sky, st.night).lerp(DAY.sky, d);
      hemi.groundColor.copy(NIGHT.ground).lerp(DAY.ground, d);
      hemi.intensity = THREE.MathUtils.lerp(THREE.MathUtils.lerp(NIGHT.hemi, DEEP.hemi, st.night), DAY.hemi, d);
      if (d > 0.001 && st.sun.y > -0.02) {
        sky.color.copy(DAY.low).lerp(DAY.sun, up).lerp(NIGHT.dir, 1 - d);
        sky.intensity = THREE.MathUtils.lerp(NIGHT.dirI, DAY.sunI * (0.25 + 0.75 * up), d);
        if (!sunShadow) sky.position.set(st.sun.x, Math.max(0.05, st.sun.y), st.sun.z);
        if (!sunShadow) sky.target.position.set(0, 0, 0);
      } else { sky.color.copy(NIGHT.dir); sky.intensity = NIGHT.dirI * (1 - 0.4 * st.night); sky.position.set(0.6, 1, -0.2); sky.target.position.set(0, 0, 0); }
      sky.target.updateMatrixWorld();
      hp.material.color.copy(haloColor).multiplyScalar(st.lamps); hp.visible = st.lamps > 0.01;
      poolMat.color.copy(poolColor).multiplyScalar(st.lamps); poolMesh.visible = st.lamps > 0.01;
    },
    get shadowCount() { return shadowCount; },
    slots,
  };
}

// One-off capture of the surroundings from above the deck -> prefiltered environment.
export function captureEnvironment(renderer, scene) {
  const rt = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
  const cam = new THREE.CubeCamera(0.5, 4000, rt);
  cam.position.set(13, L.deckY + 5.5, 14);
  cam.update(renderer, scene);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromCubemap(rt.texture).texture;
  scene.environment = env; scene.environmentIntensity = 0.9;
  rt.dispose(); pmrem.dispose();
  return env;
}
