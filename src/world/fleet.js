// Real car models in the traffic (tools/cars/process.mjs, public/models/cars/, credits in
// public/models/cars/CREDITS.md). Every car of a model is drawn together: one InstancedMesh per part
// (paint, glass, tyres, chrome, lamps...) whatever the number of cars, so a dozen BYD Hans cost about
// what one does. Each car has its own paint (instance colour), brake lights and green new-energy plate.
// Two versions of each model: the full one within NEAR m of you, a lighter one beyond.
// The wheels are part of the body here and don't turn (a later step).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const NEAR = 38, MAX = 64;            // m to the lighter version; cars of one model at most
const TAIL_RUN = new THREE.Color(0.55, 0.02, 0.015), TAIL_BRAKE = new THREE.Color(4.2, 0.12, 0.06);
export const FLEET_MODELS = {
  'byd-han': { file: 'byd-han.glb', far: 'byd-han-far.glb', len: 4.995, width: 1.91, height: 1.495, wheelbase: 2.92 },
};
// fictional Shanghai new-energy plates (green), a few of them, front and back
const PLATES = ['沪A·D52817', '沪A·F09M33', '沪A·D7K160', '沪A·DF3389'];
function plateTexture() {
  const W = 256, H = 80 * PLATES.length, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  PLATES.forEach((t, i) => {
    const y = i * 80, g = x.createLinearGradient(0, y, 0, y + 80); g.addColorStop(0, '#f4f7f2'); g.addColorStop(0.45, '#9fd9a8'); g.addColorStop(1, '#2f9e55');
    x.fillStyle = g; x.fillRect(0, y, W, 80); x.strokeStyle = '#1a1a1a'; x.lineWidth = 4; x.strokeRect(3, y + 3, W - 6, 74);
    x.fillStyle = '#111'; x.font = '700 46px "Noto Sans SC", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t, W / 2, y + 42);
  });
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; return tex;
}

// One fleet for the whole city: the Bund road's traffic and Henan Road's share its models and its
// instanced parts (one load, one draw call per part for every car of a model on both roads).
let shared = null;
export function sharedFleet() { return shared || (shared = createFleet()); }

export function createFleet({ base = './models/cars/' } = {}) {
  const group = new THREE.Group(); group.name = 'fleet';
  const models = {};                 // id -> { near: [InstancedMesh], far: [...], plates: [InstancedMesh x PLATES], cars: [] }
  const plateTex = typeof document !== 'undefined' ? plateTexture() : null;
  const plateGeo = (() => {
    // one quad per plate variant (its strip of the texture), front and rear
    const geos = PLATES.map((_, i) => {
      const g = new THREE.PlaneGeometry(0.44, 0.14), uv = g.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setY(k, 1 - (i + 1 - uv.getY(k)) / PLATES.length);
      return g;
    });
    return geos;
  })();
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _up = new THREE.Vector3(0, 1, 0);
  const plateMats = [];

  function parts(scene, castShadow) {
    // each mesh of the processed model becomes an InstancedMesh; paint takes instance colours,
    // the tail lamps become unlit so braking can brighten them per car
    const out = [];
    scene.updateMatrixWorld(true);
    scene.traverse((o) => {
      if (!o.isMesh) return;
      let mat = o.material, kind = mat.name || '';
      if (kind === 'logo5') return;   // the maker's badges: left off (the car runs under an invented name)
      if (kind === 'tail') mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      else if (kind === 'paint') { mat = mat.clone(); mat.color.set(0xffffff); }
      const geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
      const im = new THREE.InstancedMesh(geo, mat, MAX); im.count = 0; im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.castShadow = castShadow && kind !== 'glass'; im.receiveShadow = true; im.name = `fleet-${kind || 'part'}`;
      im.userData.kind = kind;
      if (kind === 'paint' || kind === 'tail') { for (let i = 0; i < MAX; i++) im.setColorAt(i, new THREE.Color(1, 1, 1)); }
      out.push(im); group.add(im);
    });
    return out;
  }
  async function load(id) {
    const M = FLEET_MODELS[id], loader = new GLTFLoader();
    const [near, far] = await Promise.all([loader.loadAsync(base + M.file), loader.loadAsync(base + M.far)]);
    const rec = models[id];
    rec.near = parts(near.scene, true); rec.far = parts(far.scene, false);
    rec.plates = plateGeo.map((g, i) => {
      if (!plateMats[i]) plateMats[i] = new THREE.MeshBasicMaterial({ map: plateTex, toneMapped: true });
      const im = new THREE.InstancedMesh(g, plateMats[i], MAX * 2); im.count = 0; im.frustumCulled = false; im.name = `fleet-plate-${i}`; group.add(im); return im;
    });
    rec.ready = true;
  }
  return {
    group,
    models: FLEET_MODELS,
    // a model built in code (the street's generic sedan and the taxi, world/vehicles.js): its meshes
    // become instanced parts at once; no lighter version, no plates (it carries its own)
    addTemplate(id, scene) {
      if (models[id]) return;
      const rec = models[id] = { cars: [], ready: true, loading: Promise.resolve(), template: true };
      rec.near = parts(scene, true); rec.far = rec.near; rec.plates = [];
    },
    // a car of this model: returns its handle (the vehicle's group still carries position and children)
    add(id, { paint = 0xeeeeee } = {}) {
      const rec = models[id] || (models[id] = { cars: [], ready: false, loading: null });
      if (!rec.loading) rec.loading = load(id).catch((e) => { console.warn('fleet model', id, e); rec.failed = true; });
      const car = { id, n: rec.cars.length, paint: new THREE.Color(paint), braking: false, plate: rec.cars.length % PLATES.length };
      rec.cars.push(car);
      return car;
    },
    ready: (id) => !!(models[id] && models[id].ready),
    // per frame, after the vehicles are placed: cars = [{ car, obj (its group), visible }]
    sync(eye) {
      for (const rec of Object.values(models)) {
        if (!rec.ready) continue;
        let nNear = 0, nFar = 0;
        const counts = rec.plates.map(() => 0);
        for (const car of rec.cars) {
          const o = car.obj; if (!o || !car.visible) continue;
          o.updateMatrixWorld(); _m.copy(o.matrixWorld);
          const near = rec.template || !eye || Math.hypot(_m.elements[12] - eye.x, _m.elements[14] - eye.z) < NEAR;   // (eye in world coordinates)
          const set = near ? rec.near : rec.far, k = near ? nNear++ : nFar++;
          for (const im of set) {
            im.setMatrixAt(k, _m);
            if (im.userData.kind === 'paint') im.setColorAt(k, car.paint);
            else if (im.userData.kind === 'tail') im.setColorAt(k, car.braking ? TAIL_BRAKE : TAIL_RUN);
          }
          if (near && !rec.template) {
            // plates: front and rear, on the bumpers
            const M = FLEET_MODELS[car.id], pi = car.plate, pm = rec.plates[pi];
            for (const [z, ry] of [[M.len / 2 + 0.01, 0], [-M.len / 2 - 0.01, Math.PI]]) {
              _p.set(0, 0.45, z); _q.setFromAxisAngle(_up, ry);
              const local = new THREE.Matrix4().compose(_p, _q, _s);
              pm.setMatrixAt(counts[pi]++, local.premultiply(o.matrixWorld));
            }
          }
        }
        for (const im of rec.near) { im.count = nNear; im.visible = nNear > 0; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }
        if (rec.far !== rec.near) for (const im of rec.far) { im.count = nFar; im.visible = nFar > 0; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }
        rec.plates.forEach((im, i) => { im.count = counts[i]; im.visible = counts[i] > 0; im.instanceMatrix.needsUpdate = true; });
      }
    },
  };
}
