// Lights. Buildings are self-lit (see materials.js), so real lights only have to
// serve the wet ground and props. Per-pixel point lights are the most expensive
// thing in the frame, so every lamp is a *source* but only the nearest few get a
// real PointLight; the rest keep their halo and a cheap pool of light on the ground.
import * as THREE from 'three';
import { L, deckLamps, DECK_LAMP_X, roadLamps, ROAD_LAMP_WEST_OFFSET } from './layout.js';
import { glowTexture } from './canvas.js';

const WARM = new THREE.Color(1.0, 0.72, 0.42);
const POOL = 6;

export function createLighting(scene, lanterns) {
  const group = new THREE.Group(); group.name = 'lighting';
  group.add(new THREE.HemisphereLight(0x5578c8, 0x2a221c, 0.55));
  const sky = new THREE.DirectionalLight(0x6f8fd8, 0.35);      // the last of the sky, from over the river
  sky.position.set(0.6, 1, -0.2); group.add(sky);

  const inRange = (z) => z > L.zNorth - 30 && z < L.zSouth + 30;
  const sources = [], halos = [], pools = [];
  const source = (x, y, z, intensity, distance, color = WARM) => sources.push({ x, y, z, intensity, distance, color, d: 0 });
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
  for (const l of lanterns) { halos.push(l.x, l.y - 0.38, l.z + l.n * 0.4); source(l.x, l.y - 0.45, l.z + l.n * 0.55, 20, 20); }
  source(-69.2, 2.1, -L.street.halfW + 1.3, 9, 13, new THREE.Color(1.0, 0.85, 0.62));   // shop window spill
  for (const x of [-112, -134, -156]) halos.push(x, 4, x % 4 ? 6 : -6);                // lamps beyond the hoarding

  const lights = [];
  for (let i = 0; i < POOL; i++) { const l = new THREE.PointLight(WARM, 0, 30, 2); group.add(l); lights.push(l); }

  const hg = new THREE.BufferGeometry();
  hg.setAttribute('position', new THREE.Float32BufferAttribute(halos, 3));
  const hp = new THREE.Points(hg, new THREE.PointsMaterial({
    map: glowTexture(128), color: new THREE.Color(1.0, 0.66, 0.36).multiplyScalar(0.5), size: 2.4, sizeAttenuation: true,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: true,
  }));
  hp.name = 'halos'; hp.frustumCulled = false; group.add(hp);

  // Soft pools under every lamp: what distant lamps contribute once they lose their real light.
  const poolMat = new THREE.MeshBasicMaterial({
    map: glowTexture(128, [[0, 0.5], [0.4, 0.2], [1, 0]]), color: new THREE.Color(1.0, 0.68, 0.38).multiplyScalar(0.09),
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
    update(cam) {
      for (const s of sources) s.d = Math.hypot(s.x - cam.x, s.y - cam.y, s.z - cam.z);
      sources.sort((a, b) => a.d - b.d);
      const edge = sources.length > POOL ? sources[POOL].d : Infinity;
      for (let i = 0; i < POOL; i++) {
        const s = sources[i], l = lights[i];
        if (!s) { l.intensity = 0; continue; }
        const k = Math.min(1, Math.max(0, (edge - s.d) / (edge * 0.3)));
        l.position.set(s.x, s.y, s.z); l.color.copy(s.color); l.distance = s.distance; l.intensity = s.intensity * k;
      }
    },
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
