// Single source of truth for where things are. Pure data + pure functions:
// no three.js here, so collision and movement can be tested in node.
//
// Axes: +x = east (toward the river and Pudong), +y = up, +z = south.

export const L = {
  facadeX: -34,      // front face of the Bund buildings
  westCurbX: -28,    // west sidewalk: facadeX..westCurbX
  eastCurbX: -4,     // road: westCurbX..eastCurbX, east sidewalk: eastCurbX..wallX
  wallX: 2,          // promenade retaining wall
  deckEdgeX: 26,     // river railing
  deckY: 3,
  curbH: 0.15,
  waterY: -2.4,
  zNorth: -60,       // playable extent along the waterfront
  zSouth: 95,
  stair: { x0: 2, x1: 9.2, halfW: 6, steps: 20 },
  street: { halfW: 6.5, roadHalfW: 4, xEnd: -92 },  // Hankou Road
  spawn: { x: -85, z: 0.6, yaw: -Math.PI / 2 },      // yaw: facing +x
  eye: 1.68,
  radius: 0.36,
};

// ---- prop placement (shared by visuals and colliders) ----
export const deckLamps = [];          // z positions of promenade lamps (x = 24.6)
for (let z = -420; z <= 420; z += 24) deckLamps.push(z + 12);
export const DECK_LAMP_X = 24.6;
export const CLUE_LAMP_Z = 12;

export const roadLamps = [];          // tall street lights: east curb at z, west curb at z + 20
for (let z = -410; z <= 420; z += 36) roadLamps.push(z);
export const ROAD_LAMP_WEST_OFFSET = 20;

export const benches = [-24, 36, 60, 84].map((z) => ({ x: 21.4, z }));
export const planterIslands = [
  { x0: 11, x1: 14.2, z0: -50, z1: -38 },
  { x0: 11, x1: 14.2, z0: -30, z1: -18 },
  { x0: 11, x1: 14.2, z0: 20, z1: 32 },
  { x0: 11, x1: 14.2, z0: 44, z1: 56 },
  { x0: 11, x1: 14.2, z0: 68, z1: 80 },
];
export const telescope = { x: 25.0, z: -6 };
export const taxi = { x: -5.25, z: 24, yaw: Math.PI };   // northbound side, nose to the north
export const sedan = { x: -26.8, z: -31, yaw: 0 };
export const bikes = { x: -29.2, z0: -18.5, n: 6, gap: 0.62 };
export const stall = { x: -57, z: -5.7 };          // watch-repair stall, north sidewalk
export const streetTrees = [{ x: -46, z: 5.2 }, { x: -72, z: -5.2 }, { x: -64, z: 5.2 }];
export const lions = [{ x: -32.4, z: 76 }, { x: -32.4, z: 90 }];
export const npcs = {
  pairFocus: { x: 23.7, y: L.deckY + 1.48, z: -15.0 },
  audibility: { refDistance: 2.5, maxDistance: 18.0 },
  interactDistance: 3.6,
  list: [
    { id: 'lin', x: 23.55, z: -15.62, yaw: Math.atan2(0.3, 1.24), height: 1.74 },
    { id: 'su',  x: 23.85, z: -14.38, yaw: Math.atan2(-0.3, -1.24), height: 1.65 },
  ],
};

// ---- the signal-controlled crossing at Hankou Road / Zhongshan East 1st Road ----
// Right-hand traffic, straight through only. Travel coordinate along a lane: s = z * dir
// (dir +1 southbound / +z, dir -1 northbound / -z), so both directions share the numbers below.
export const crossing = {
  stopS: -5.4,                 // stop line (painted -5.6..-5.2 on each approach)
  boxEndS: 5.6,                // far edge of the junction box (the opposing stop line)
  crosswalk: { x0: -27.6, x1: -4.3, z0: -3.4, z1: 3.4 },
  road: { x0: L.westCurbX, x1: L.eastCurbX },
  entryS: -415, exitS: 415,    // where through traffic joins / leaves (>= 320 m from anywhere the player can stand)
  // the two inner lanes each way carry traffic; curb lanes keep their parked cars
  lanes: [
    { id: 'sb1', x: -17.8, dir: 1 }, { id: 'sb2', x: -21.4, dir: 1 },
    { id: 'nb1', x: -14.2, dir: -1 }, { id: 'nb2', x: -10.6, dir: -1 },
  ],
  openLanes: { x0: -23.2, x1: -8.8 },             // gap left in the closure barriers for them
  // Chinese-style mast-arm signals on the far right of each approach, ped heads at each kerb
  vehPoles: [
    { x: -28.45, z: 8.6, armTo: -19.6, faces: -1 },  // serves southbound (faces north, -z)
    { x: -3.55, z: -8.6, armTo: -12.4, faces: 1 },   // serves northbound (faces south, +z)
  ],
  pedPoles: [
    { x: -28.4, z: -4.45, faces: 1 },              // west kerb; its head faces east, across the road
    { x: -3.55, z: 3.95, faces: -1 },               // east kerb; faces west
  ],
  // through traffic. Dimensions (m) are the makers' published figures as I know them;
  // `model` selects the visual in world/vehicles.js. s = initial front-bumper position.
  vehicles: [
    { id: 'l9', model: 'li-l9', lane: 'sb1', s: -14, len: 5.218, width: 1.998, height: 1.800, wheelbase: 3.105 },
    { id: 'taxi-a', model: 'taxi', lane: 'sb1', s: -70, len: 4.6, width: 1.78, height: 1.5, wheelbase: 2.82 },
    { id: 'r7', model: 'luxeed-r7', lane: 'sb2', s: -150, len: 4.956, width: 1.999, height: 1.656, wheelbase: 2.950 },
    { id: 'et5', model: 'nio-et5', lane: 'nb1', s: -26, len: 4.790, width: 1.960, height: 1.499, wheelbase: 2.888 },
    { id: 'taxi-b', model: 'taxi', lane: 'nb1', s: -210, len: 4.6, width: 1.78, height: 1.5, wheelbase: 2.82 },
    { id: 'm9', model: 'aito-m9', lane: 'nb2', s: -95, len: 5.230, width: 1.999, height: 1.800, wheelbase: 3.110 },
    { id: 'sedan', model: 'sedan', lane: 'nb2', s: -300, len: 4.6, width: 1.78, height: 1.5, wheelbase: 2.82 },
  ],
  // background pedestrians: crossing line, which west corner they use, wander targets, speed
  peds: [
    { id: 'p1', zc: -2.4, corner: -1, westWander: [-30.2, -11], eastWander: [-0.9, -12], speed: 1.32, look: 0 },
    { id: 'p2', zc: -0.8, corner: 1, westWander: [-29.6, 15], eastWander: [-1.1, 9], speed: 1.12, look: 1, startEast: true },
    { id: 'p3', zc: 0.9, corner: 1, westWander: [-40, 5.2], eastWander: [-0.8, 16], speed: 1.45, look: 2 },
    { id: 'p4', zc: 2.5, corner: -1, westWander: [-42, -5.2], eastWander: [-1.0, -7], speed: 0.62, look: 3, startEast: true },  // elderly, slow
  ],
};

// ---- covered places the rain must not reach (footprint + underside height) ----
// Only spaces with a roof you can see under: the sundries shop's canopy on Hankou Road and the
// Customs House's Doric portico. Everything else at street level is open to the sky.
export const covers = [
  { id: 'shop-canopy', x0: -71.7, x1: -66.7, z0: -6.5, z1: -5.48, top: 3.75 },
  { id: 'customs-portico', x0: -34.0, x1: -31.0, z0: 18.0, z1: 36.0, top: 13.35 },
];
export const underCover = (x, z, y = 0) => covers.some((c) => x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1 && y < c.top);

// ---- colliders: axis-aligned boxes in the XZ plane ----
export const colliders = [];
function box(minX, maxX, minZ, maxZ, tag = 'solid') {
  colliders.push({ minX, maxX, minZ, maxZ, tag });
}
function around(x, z, hx, hz, tag) { box(x - hx, x + hx, z - hz, z + hz, tag); }

const S = L.street;
// Buildings
box(-140, L.facadeX, S.halfW, 48, 'customs');          // Customs House
box(-140, L.facadeX, 48, 140, 'hsbc');                 // HSBC Building
box(-140, L.facadeX, -140, -S.halfW, 'north-block');   // No.14, No.15 and the Hankou Rd north side
box(L.facadeX, -31.0, 17.5, 35.5, 'portico');
box(L.facadeX, -32.2, 68, 98, 'hsbc-centre');          // HSBC central pavilion          // Customs House portico plinth
for (const l of lions) around(l.x - 0.1, l.z, 1.4, 0.7, 'lion');

// Exploration boundaries (visible barriers stand on these lines)
box(L.facadeX - 1, L.deckEdgeX + 1, L.zNorth - 1, L.zNorth, 'boundary');
box(L.facadeX - 1, L.deckEdgeX + 1, L.zSouth, L.zSouth + 1, 'boundary');
box(S.xEnd - 1, S.xEnd, -S.halfW, S.halfW, 'boundary');

// Promenade: retaining wall + hedge planter, stair cheeks, river railing
box(L.wallX - 0.3, 4.0, L.zNorth - 1, -L.stair.halfW, 'wall');
box(L.wallX - 0.3, 4.0, L.stair.halfW, L.zSouth + 1, 'wall');
box(L.wallX, L.stair.x1, -L.stair.halfW - 0.35, -L.stair.halfW, 'wall');
box(L.wallX, L.stair.x1, L.stair.halfW, L.stair.halfW + 0.35, 'wall');
box(L.deckEdgeX - 0.12, L.deckEdgeX + 1, L.zNorth - 1, L.zSouth + 1, 'railing');

for (const z of deckLamps) if (z > L.zNorth && z < L.zSouth) around(DECK_LAMP_X, z, 0.28, 0.28, 'lamp');
for (const z of roadLamps) {
  if (z <= L.zNorth - 30 || z >= L.zSouth) continue;
  around(L.westCurbX - 0.5, z + ROAD_LAMP_WEST_OFFSET, 0.2, 0.2, 'lamp');
  around(L.eastCurbX + 0.5, z, 0.2, 0.2, 'lamp');
}
for (const b of benches) around(b.x, b.z, 0.35, 1.15, 'bench');
for (const p of planterIslands) box(p.x0, p.x1, p.z0, p.z1, 'planter');
around(telescope.x, telescope.z, 0.3, 0.3, 'telescope');
around(taxi.x, taxi.z, 0.95, 2.35, 'car');
around(sedan.x, sedan.z, 0.95, 2.4, 'car');
box(bikes.x - 0.9, bikes.x + 0.9, bikes.z0 - 0.3, bikes.z0 + bikes.n * bikes.gap, 'bikes');
around(stall.x, stall.z, 1.0, 0.75, 'stall');
for (const t of streetTrees) around(t.x, t.z, 0.3, 0.3, 'tree');
for (const n of npcs.list) { around(n.x, n.z, 0.34, 0.34, 'npc'); colliders[colliders.length - 1].id = n.id; }   // id: so a target can ignore its own body
for (const p of crossing.vehPoles) around(p.x, p.z, 0.2, 0.2, 'signal');
for (const p of crossing.pedPoles) around(p.x, p.z, 0.1, 0.1, 'signal');

// Moving things (vehicles) keep their boxes here too; traffic updates them in place each frame.
export function addDynamicCollider(tag) {
  const b = { minX: 1e6, maxX: 1e6, minZ: 1e6, maxZ: 1e6, tag };   // parked far away until placed
  colliders.push(b);
  return b;
}

// ---- ground ----
export function groundHeight(x, z) {
  const st = L.stair;
  if (x >= L.wallX) {
    if (Math.abs(z) < st.halfW && x < st.x1) return (L.deckY * (x - st.x0)) / (st.x1 - st.x0);
    return L.deckY;
  }
  if (x < L.westCurbX) {
    // Hankou Road carriageway runs out through the west sidewalk
    if (Math.abs(z) < S.roadHalfW) return 0;
    return L.curbH;
  }
  if (x > L.eastCurbX) return L.curbH;
  return 0;
}

// Coarse "where am I" for footstep sounds etc.
export function surfaceAt(x, z) {
  if (x >= L.wallX) return Math.abs(z) < L.stair.halfW && x < L.stair.x1 ? 'stairs' : 'deck';
  if (x < L.westCurbX && Math.abs(z) >= S.roadHalfW) return 'pavement';
  if (x > L.eastCurbX) return 'pavement';
  return 'road';
}
