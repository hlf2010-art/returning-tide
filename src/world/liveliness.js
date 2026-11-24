// Liveliness, measured from the scene (engine/live.js does the counting): who and what the camera can
// actually see. "In view" means inside the camera's frustum and not behind one of the Bund's or Nanjing
// Road's buildings (their footprints in world/layout.js; a 2-D test, good enough at street level).
// The frame times come from main.js each frame; draw calls and triangles from the renderer.
import * as THREE from 'three';
import { colliders } from './layout.js';
import { segmentHitsBox } from '../engine/targeting.js';
import { LIVE, countPeople, countVehicles, frameWindow, audibleSummary } from '../engine/live.js';

const OCCLUDERS = new Set(['customs', 'hsbc', 'north-block', 'aia-block', 'peace-block', 'portico', 'hsbc-centre', 'nj-north', 'nj-south']);

// getSources() -> { people: [...], vehicles: [...], sounds: [{ id, kind, level }], where: {...} }
export function createLiveliness({ camera, renderer, getSources }) {
  const frames = frameWindow();
  const occ = colliders.filter((b) => OCCLUDERS.has(b.tag));
  const frustum = new THREE.Frustum(), m = new THREE.Matrix4(), v = new THREE.Vector3();
  function viewTest() {
    camera.updateMatrixWorld();
    m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(m);
    const ex = camera.position.x, ez = camera.position.z, high = camera.position.y > 40;
    return (x, y, z) => {
      if (!frustum.containsPoint(v.set(x, y, z))) return false;
      if (!high) for (const b of occ) if (segmentHitsBox(ex, ez, x, z, b, 0.6)) return false;
      return true;
    };
  }
  let last = null;
  return {
    // per frame: the time since the last frame and the main thread's time spent on this one (ms)
    frame(ms, cpuMs) { if (ms > 0 && ms < 2000) frames.push(ms, cpuMs); },
    get frames() { return frames.stats(); },
    snapshot() {
      const src = getSources();
      const inView = viewTest(), eye = camera.position;
      const p = countPeople(src.people || [], eye, inView);
      const veh = countVehicles(src.vehicles || [], eye, inView);
      const info = renderer.info.render;
      last = {
        people: { near: p.near, mid: p.mid, impostor: p.impostor, total: p.total },
        vehicles: veh,
        activities: { count: Object.keys(p.activities).length, list: p.activities },
        audible: audibleSummary(src.sounds || []),
        frame: frames.stats(),
        draw: { calls: info.calls, triangles: info.triangles },
        where: src.where || null,
        tiers: { midUnder: LIVE.mid, farUnder: LIVE.far },
      };
      return last;
    },
    get last() { return last; },
  };
}
