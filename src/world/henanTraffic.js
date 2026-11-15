// Henan Middle Road: two lanes each way crossing the Nanjing Road pedestrian street at a signalised
// zebra. The same traffic engine as Zhongshan Road (engine/traffic.js), run in the junction's own
// frame (z measured from the middle of the zebra) and drawn shifted into place. Cars stop on red,
// yield to anyone on the zebra, and the green man holds while people are still crossing.
import * as THREE from 'three';
import { NJ, crossing } from './layout.js';
import { createTraffic } from '../engine/traffic.js';
import { createVehicles } from './vehicles.js';
import { createSignals } from './signals.js';

const h = NJ.henan;
export const HENAN_GEOM = {
  stopS: -5.4, boxEndS: 5.6,
  crosswalk: { x0: h.x0 + 0.4, x1: h.x1 - 0.4, z0: -3.4, z1: 3.4 },
  road: { x0: h.x0, x1: h.x1 },
  entryS: -415, exitS: 415,
  lanes: [{ id: 'sb1', x: h.xc - 1.8, dir: 1 }, { id: 'sb2', x: h.xc - 5.4, dir: 1 }, { id: 'nb1', x: h.xc + 1.8, dir: -1 }, { id: 'nb2', x: h.xc + 5.4, dir: -1 }],
  openLanes: { x0: h.x0, x1: h.x1 },
  vehPoles: [{ x: h.x0 - 0.45, z: 8.6, armTo: h.xc - 3.6, faces: -1 }, { x: h.x1 + 0.45, z: -8.6, armTo: h.xc + 3.6, faces: 1 }],
  pedPoles: [{ x: h.x0 - 0.4, z: -4.45, faces: 1 }, { x: h.x1 + 0.45, z: 3.95, faces: -1 }],
  rainSpots: crossing.rainSpots,
};
const MIX = [
  ['taxi', 4.6, 1.78, 1.5, 2.82], ['sedan', 4.6, 1.78, 1.5, 2.82, 0xe8e8e6], ['nio-et5', 4.790, 1.960, 1.499, 2.888], ['taxi', 4.6, 1.78, 1.5, 2.82],
  ['sedan', 4.6, 1.78, 1.5, 2.82, 0x9aa0a6], ['li-l9', 5.218, 1.998, 1.800, 3.105], ['sedan', 4.6, 1.78, 1.5, 2.82, 0x101216], ['aito-m9', 5.230, 1.999, 1.800, 3.110],
  ['sedan', 4.6, 1.78, 1.5, 2.82, 0xf2f2f0], ['luxeed-r7', 4.956, 1.999, 1.656, 2.950], ['taxi', 4.6, 1.78, 1.5, 2.82], ['sedan', 4.6, 1.78, 1.5, 2.82, 0x2a2e36],
];
export function henanSpecs(factor = 1) {
  const n = Math.max(4, Math.round(12 * factor)), out = [];
  for (let i = 0; i < n; i++) {
    const [model, len, width, height, wheelbase, paint] = MIX[i % MIX.length], lane = HENAN_GEOM.lanes[i % 4].id;
    out.push({ id: `hn${i}`, model, len, width, height, wheelbase, paint, lane, s: -400 + ((i * 197) % 790) });
  }
  return out;
}

export function createHenanTraffic({ scene, factor = 1, addCollider }) {
  const specs = henanSpecs(factor);
  const traffic = createTraffic({ geom: HENAN_GEOM, vehicles: specs, peds: [] });
  const vehicles = createVehicles(specs), signals = createSignals(HENAN_GEOM);
  signals.group.name = 'henan-signals'; vehicles.group.name = 'henan-vehicles';   // (the Bund crossing's keep their own names)
  // drawn in the world: the junction's frame shifted south-north into place
  const frame = new THREE.Group(); frame.position.z = NJ.zc; frame.name = 'henan-traffic';
  frame.add(vehicles.group, signals.group); scene.add(frame);
  const wheels = vehicles.group.children.find((c) => c.name === 'traffic-wheels');
  if (wheels) { vehicles.group.remove(wheels); scene.add(wheels); }       // the wheel instancer already works in world matrices
  frame.updateMatrixWorld(true);
  const boxes = specs.map(() => addCollider('vehicle'));
  const _p = { x: 0, z: 0, vx: 0, vz: 0 }, _eye = { x: 0, z: 0 };
  return {
    traffic, vehicles, signals, group: frame,
    // player: world body (or null when far / up somewhere)
    update(dt, { player = null, eye = null, rain = 0 } = {}) {
      let pl = null;
      if (player && Math.abs(player.x - h.xc) < 40 && Math.abs(player.z - NJ.zc) < 60 && player.y < 1) { _p.x = player.x; _p.z = player.z - NJ.zc; _p.vx = player.vx || 0; _p.vz = player.vz || 0; pl = _p; }
      traffic.update(dt, { player: pl, rain });
      if (eye) { _eye.x = eye.x; _eye.z = eye.z - NJ.zc; }
      vehicles.update(traffic.vehicles, eye ? _eye : null);
      signals.update(traffic.controller);
      traffic.vehicles.forEach((v, i) => {
        const b = boxes[i];
        if (!v.active) { b.minX = b.maxX = b.minZ = b.maxZ = 1e6; return; }
        b.minX = v.x - v.width / 2; b.maxX = v.x + v.width / 2; b.minZ = v.z + NJ.zc - v.len / 2; b.maxZ = v.z + NJ.zc + v.len / 2;
      });
    },
    // for the engine sounds: the cars in world coordinates, heard only when you're near Henan Road
    worldVehicles(near = true) { return traffic.vehicles.map((v) => ({ ...v, z: v.z + NJ.zc, active: v.active && near })); },
  };
}
