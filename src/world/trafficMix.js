// What drives along Zhongshan East 1st Road this evening: the seven hand-placed vehicles of the
// crossing (layout.js) plus enough more to make it the busy road it is, and the city buses.
// How many: the level of detail (graphics settings). Pure data; tests can use it too.
//
// Bus stops: the real stops on this stretch (Shanghai's bus network, checked for this game):
//   中山东一路汉口路(外滩)  routes 33, 55, 65
//   中山东一路南京东路(外滩) routes 33, 55, 65 and the night lines 305, 307, 317
// Each has a stop on both sides of the road. Exactly where along the kerb is placed by eye (far side
// of each junction, clear of the DiDi pickup and the hailing spots), not surveyed.
import { L, crossing } from './layout.js';

export const BUS_STOPS = [
  { id: 'hankou-s', name: '中山东一路汉口路(外滩)', en: 'Zhongshan E1 Rd / Hankou Rd (The Bund)', routes: ['33', '55', '65'], dir: 1, z: 46, kerbX: L.westCurbX + 1.6, side: -1 },
  { id: 'hankou-n', name: '中山东一路汉口路(外滩)', en: 'Zhongshan E1 Rd / Hankou Rd (The Bund)', routes: ['33', '55', '65'], dir: -1, z: -40, kerbX: L.eastCurbX - 1.6, side: 1 },
  { id: 'nanjing-s', name: '中山东一路南京东路(外滩)', en: 'Zhongshan E1 Rd / E Nanjing Rd (The Bund)', routes: ['33', '55', '65'], night: ['305', '307', '317'], dir: 1, z: -180, kerbX: L.westCurbX + 1.6, side: -1 },
  { id: 'nanjing-n', name: '中山东一路南京东路(外滩)', en: 'Zhongshan E1 Rd / E Nanjing Rd (The Bund)', routes: ['33', '55', '65'], night: ['305', '307', '317'], dir: -1, z: -232, kerbX: L.eastCurbX - 1.6, side: 1 },
];
// a stop's s on its lane (front bumper at the head of the stop)
export const stopS = (st) => st.z * st.dir + 6;

const CARS = [
  // [model, len, width, height, wheelbase, paint]  (generic: the street's sedan with a colour)
  ['taxi', 4.6, 1.78, 1.5, 2.82], ['taxi', 4.6, 1.78, 1.5, 2.82], ['taxi', 4.6, 1.78, 1.5, 2.82],
  ['sedan', 4.6, 1.78, 1.5, 2.82, 0xe8e8e6], ['sedan', 4.6, 1.78, 1.5, 2.82, 0x9aa0a6], ['sedan', 4.6, 1.78, 1.5, 2.82, 0x101216],
  ['sedan', 4.6, 1.78, 1.5, 2.82, 0xf2f2f0], ['sedan', 4.6, 1.78, 1.5, 2.82, 0x2a2e36],
  // ride-hail and private new-energy cars: BYD Hans (a real model, world/fleet.js) in the usual colours
  ['byd-han', 4.995, 1.91, 1.495, 2.92, 0xf1f1ef], ['byd-han', 4.995, 1.91, 1.495, 2.92, 0x16181c], ['byd-han', 4.995, 1.91, 1.495, 2.92, 0xb9bdc2],
  ['byd-han', 4.995, 1.91, 1.495, 2.92, 0x22324a], ['byd-han', 4.995, 1.91, 1.495, 2.92, 0xf1f1ef],
];
export const BUS = { model: 'bus', len: 12.0, width: 2.55, height: 3.15, wheelbase: 6.1 };

// lod.traffic: 0.6 (low) .. 1.7 (ultra); about 56 vehicles at 1.0, buses included: about 17 a lane-km
// at the evening peak, the hour's share below that (engine/traffic.js setDensity). The cars are
// instanced (world/fleet.js) and drawn as their lamps beyond 150 m, so numbers cost little to draw
// (docs/living-city-architecture.md D6; it was 22)
export function trafficSpecs(factor = 1, rnd = Math.random) {
  const out = crossing.vehicles.map((v) => ({ ...v }));
  const total = Math.max(out.length, Math.round(56 * factor));
  const nBus = factor < 0.8 ? 2 : factor < 1.5 ? 4 : 6;
  const lanes = crossing.lanes.map((l) => l.id);
  // spread the extras evenly over the 830 m loop in each lane, clear of what's there
  const occupied = Object.fromEntries(lanes.map((id) => [id, out.filter((v) => v.lane === id).map((v) => [v.s - v.len - 8, v.s + 8])]));
  const free = (lane, s, len) => occupied[lane].every(([a, b]) => s < a || s - len > b);
  const place = (spec, laneChoices) => {
    for (let k = 0; k < 40; k++) {
      const lane = laneChoices[Math.floor(rnd() * laneChoices.length)], s = -400 + rnd() * 780;
      if (!free(lane, s, spec.len)) continue;
      occupied[lane].push([s - spec.len - 8, s + 8]);
      out.push({ ...spec, lane, s });
      return true;
    }
    return false;
  };
  for (let b = 0; b < nBus; b++) place({ ...BUS, id: `bus${b}`, bus: true, route: ['55', '33', '65'][b % 3], v0: 9.5 }, b % 2 ? ['nb2'] : ['sb2']);
  let i = 0;
  while (out.length < total && i < 400) {
    const [model, len, width, height, wheelbase, paint] = CARS[i % CARS.length];
    place({ id: `x${i}`, model, len, width, height, wheelbase, paint }, lanes);
    i++;
  }
  return out;
}
