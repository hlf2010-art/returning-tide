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
  zNorth: -262,      // playable extent along the waterfront: north past Nanjing Road and the Peace Hotel
  zSouth: 95,
  stair: { x0: 2, x1: 9.2, halfW: 6, steps: 20 },
  street: { halfW: 6.5, roadHalfW: 4, xEnd: -92 },  // Hankou Road
  spawn: { x: -85, z: 0.6, yaw: -Math.PI / 2 },      // yaw: facing +x
  eye: 1.68,
  radius: 0.36,
};

// Side streets running west off the Bund north of Hankou Road (the blocks between them: bund.js).
// Each is open from the Bund to a hoarding at xEnd; the carriageway is roadHalfW either side of zc.
//   Jiujiang Road  between No.16 and No.17 (the AIA Building)
//   Nanjing Road E between No.19 and No.20 (the Peace Hotel, whose main entrance is on it)
// Nanjing Road East has been a pedestrian street all the way to the Bund since 2020: no carriageway,
// paving wall to wall, out west past Henan Middle Road (world/nanjingRoad.js).
export const sideStreets = [
  { id: 'jiujiang', z0: -131, z1: -117, roadHalfW: 3.4, xEnd: -56 },
  { id: 'nanjing', z0: -212, z1: -190, roadHalfW: 5, xEnd: -548, pedestrian: true },
].map((s) => ({ ...s, zc: (s.z0 + s.z1) / 2 }));
export const inSideRoad = (x, z) => x < -28 && sideStreets.some((s) => !s.pedestrian && Math.abs(z - s.zc) < s.roadHalfW && x > s.xEnd - 1);

// Nanjing Road East out to Henan Middle Road (real distances approximated: the pedestrian extension
// runs about 500 m from the Bund to Henan Road). Cross streets (Sichuan, Jiangxi Middle Roads) are
// closed off a few metres in, like the other side streets.
export const NJ = {
  z0: -212, z1: -190, zc: -201, xWest: -548,
  henan: { x0: -513, x1: -497, xc: -505, walkTo: 30 },     // carriageway; its pavements are open 30 m each way
  cross: [{ id: 'sichuan', x0: -296, x1: -284 }, { id: 'jiangxi', x0: -401, x1: -389 }],
};
export const inHenan = (x, z) => x > NJ.henan.x0 && x < NJ.henan.x1 && Math.abs(z - NJ.zc) < 420;
// East Nanjing Road station (Lines 2 and 10), the two exits at Henan Road's north corners (Shanghai
// Metro's own descriptions): Exit 7, east side of Henan Rd, north of Nanjing Rd (signed for Tianjin Road
// and the Bund); Exit 2, west side of Henan Rd, north of Nanjing Rd (with a lift).
// Each: a stairwell open at one end, stairs down to a landing 4.6 m below the street.
export const METRO = [
  { id: 'exit7', exit: 7, x0: -494.4, x1: -483.2, z0: -211.3, z1: -207.7, top: -483.2, bottom: -492.8, lift: false },
  { id: 'exit2', exit: 2, x0: -527.8, x1: -516.6, z0: -211.3, z1: -207.7, top: -527.8, bottom: -518.2, lift: true },
];
export const METRO_DEPTH = 4.6;
// y on a metro stair / landing at (x, z), or null if not in a stairwell
export function metroGround(x, z) {
  for (const m of METRO) {
    if (x < m.x0 || x > m.x1 || z < m.z0 || z > m.z1) continue;
    const f = (x - m.top) / (m.bottom - m.top);                       // 0 at the top step, 1 at the bottom
    return f >= 1 ? -METRO_DEPTH : f <= 0 ? 0.15 : 0.15 - (0.15 + METRO_DEPTH) * f;
  }
  return null;
}

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
// Manner Coffee's takeaway shop on Hankou Road's north side (see world/shops.js)
export const manner = { x: -77.3, zWall: -6.48, depth: 0.85, width: 4.2 };
{
  const zf = manner.zWall + manner.depth, x = manner.x;
  manner.queue = [{ x: x - 1.55, z: zf + 0.5 }, { x: x - 2.35, z: zf + 0.78 }, { x: x - 3.1, z: zf + 0.95 }];
  manner.pickup = { x: x - 0.35, z: zf + 0.5 };
}
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
  // what the background pedestrians do when the drizzle starts. Every leg is on a pavement:
  // nobody leaves the crossing early or steps onto Zhongshan Road outside the zebra.
  rainSpots: {
    shelter: { via: [[-30.0, 16.0], [-30.4, 27.0]], spot: [-32.6, 27.0] },   // between the Customs portico's columns
    hankouCorner: [-30.6, 5.0],                                               // step out of Hankou Road onto Zhongshan's pavement
    cab: { west: [-28.75, -9.5], east: [-3.75, 13.0] },                       // kerbside, clear of the crossing, bikes and poles
  },
  // background pedestrians: crossing line, which west corner they use, wander targets, speed
  peds: [
    { id: 'p1', zc: -2.4, corner: -1, westWander: [-30.2, -11], eastWander: [-0.9, -12], speed: 1.32, look: 0, rain: 'umbrella', persona: 'youngMan', phoneHabit: 0.6, coffee: 0.3 },
    { id: 'p2', zc: -0.8, corner: 1, westWander: [-29.6, 15], eastWander: [-1.1, 9], speed: 1.12, look: 1, startEast: true, rain: 'shelter', persona: 'office', phoneHabit: 0.5, coffee: 0.35, startCup: 900 },   // a Starbucks from up the road
    { id: 'p3', zc: 0.9, corner: 1, westWander: [-40, 5.2], eastWander: [-0.8, 16], speed: 1.45, look: 2, rain: 'cab', persona: 'office', phoneHabit: 0.3, coffee: 0.6 },
    { id: 'p4', zc: 2.5, corner: -1, westWander: [-42, -5.2], eastWander: [-1.0, -7], speed: 0.62, look: 3, startEast: true, rain: 'umbrella', persona: 'elder', phoneHabit: 0.05 },  // elderly, slow
    // an older local woman on her way home with the shopping: brisk, and not one to be pushed about
    { id: 'p5', zc: 1.7, corner: 1, westWander: [-38, 5.4], eastWander: [-0.9, 4], speed: 1.0, look: 4, rain: 'umbrella', persona: 'auntie', phoneHabit: 0.15 },
  ],
};

// ---- covered places the rain must not reach (footprint + underside height) ----
// Only spaces with a roof you can see under: the sundries shop's canopy on Hankou Road and the
// Customs House's Doric portico. Everything else at street level is open to the sky.
export const covers = [
  { id: 'shop-canopy', x0: -71.7, x1: -66.7, z0: -6.5, z1: -5.48, top: 3.75 },
  { id: 'customs-portico', x0: -34.0, x1: -31.0, z0: 18.0, z1: 36.0, top: 13.35 },
  { id: 'peace-hall', x0: -60, x1: -35.4, z0: -244, z1: -212.6, top: 30 },     // the Peace Hotel's ground floor (world/interiors.js)
  { id: 'aia-lobby', x0: -47, x1: -34.6, z0: -152, z1: -139, top: 30 },        // the AIA lobby
  { id: 'northbund-flat', x0: 30, x1: 80, z0: -1380, z1: -1330, top: 400 },     // places a DiDi takes you (world/destinations.js)
  { id: 'ifc-32f', x0: 660, x1: 720, z0: 30, z1: 90, top: 400 },
  { id: 'yangpu-makers', x0: 290, x1: 335, z0: -2630, z1: -2590, top: 400 },
];   // (read at module load by materials.js and rain.js: everything with a roof is declared here)
export const underCover = (x, z, y = 0) => covers.some((c) => x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1 && y < c.top);

// ---- colliders: axis-aligned boxes in the XZ plane ----
// Optional y0..y1: the box only stands between those heights (furniture on one floor doesn't block
// the floor above it). Without them a box is a wall all the way up.
export const colliders = [];
function box(minX, maxX, minZ, maxZ, tag = 'solid') {
  colliders.push({ minX, maxX, minZ, maxZ, tag });
}
function around(x, z, hx, hz, tag) { box(x - hx, x + hx, z - hz, z + hz, tag); }

const S = L.street;
// Buildings
box(-140, L.facadeX, S.halfW, 48, 'customs');          // Customs House
box(-140, L.facadeX, 48, 140, 'hsbc');                 // HSBC Building
box(-140, L.facadeX, -117, -S.halfW, 'north-block');   // No.14, No.15, No.16 and the Hankou Rd north side
box(-140, L.facadeX, -190, -131, 'aia-block');          // No.17 (AIA) to No.19 (the lobby is carved out in world/interiors)
box(-140, L.facadeX, L.zNorth - 1, -212, 'peace-block');   // No.20, the Peace Hotel (likewise)
for (const st of sideStreets) box(st.xEnd - 1, st.xEnd, st.z0, st.z1, 'boundary');   // each side street ends at a hoarding
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
box(manner.x - manner.width / 2, manner.x + manner.width / 2, manner.zWall - 0.1, manner.zWall + manner.depth, 'shop');
for (const n of npcs.list) { around(n.x, n.z, 0.34, 0.34, 'npc'); colliders[colliders.length - 1].id = n.id; }   // id: so a target can ignore its own body
for (const p of crossing.vehPoles) around(p.x, p.z, 0.2, 0.2, 'signal');
for (const p of crossing.pedPoles) around(p.x, p.z, 0.1, 0.1, 'signal');

{
  const segs = [[-84, NJ.cross[0].x1], [NJ.cross[0].x0, NJ.cross[1].x1], [NJ.cross[1].x0, NJ.henan.x1 + 5], [NJ.henan.x0 - 5, NJ.xWest - 2]];
  for (const [a, b] of segs) { box(Math.min(a, b), Math.max(a, b), NJ.z0 - 22, NJ.z0, 'nj-north'); box(Math.min(a, b), Math.max(a, b), NJ.z1, NJ.z1 + 22, 'nj-south'); }
  for (const c of NJ.cross) { box(c.x0, c.x1, NJ.z0 - 9, NJ.z0 - 8, 'boundary'); box(c.x0, c.x1, NJ.z1 + 8, NJ.z1 + 9, 'boundary'); }
  // Henan Road's pavements: open 30 m each way, then fenced; the far sides are buildings
  const h = NJ.henan, w = h.walkTo;
  box(h.x1, h.x1 + 5, NJ.z0 - w - 1, NJ.z0 - w, 'boundary'); box(h.x1, h.x1 + 5, NJ.z1 + w, NJ.z1 + w + 1, 'boundary');
  box(h.x0 - 5, h.x0, NJ.z0 - w - 1, NJ.z0 - w, 'boundary'); box(h.x0 - 5, h.x0, NJ.z1 + w, NJ.z1 + w + 1, 'boundary');
  box(h.x1 + 5, h.x1 + 6, NJ.z0 - w - 1, NJ.z0, 'nj-north'); box(h.x1 + 5, h.x1 + 6, NJ.z1, NJ.z1 + w + 1, 'nj-south');
  box(h.x0 - 6, h.x0 - 5, NJ.z0 - w - 1, NJ.z0, 'nj-north'); box(h.x0 - 6, h.x0 - 5, NJ.z1, NJ.z1 + w + 1, 'nj-south');
  // the carriageway itself stays open (you cross it on the zebra); its far ends are out of reach
  box(h.x0, h.x1, NJ.z0 - w - 1, NJ.z0 - w, 'boundary'); box(h.x0, h.x1, NJ.z1 + w, NJ.z1 + w + 1, 'boundary');
  for (const m of METRO) {
    const open = m.top;                                               // the end you walk in at
    box(m.x0, m.x1, m.z0 - 0.12, m.z0, 'metro'); box(m.x0, m.x1, m.z1, m.z1 + 0.12, 'metro');
    if (open === m.x1) box(m.x0 - 0.12, m.x0, m.z0, m.z1, 'metro'); else box(m.x1, m.x1 + 0.12, m.z0, m.z1, 'metro');
  }
}

// Moving things (vehicles) keep their boxes here too; traffic updates them in place each frame.
export function addDynamicCollider(tag) {
  const b = { minX: 1e6, maxX: 1e6, minZ: 1e6, maxZ: 1e6, tag };   // parked far away until placed
  colliders.push(b);
  return b;
}

// ---- ground ----
// Floors above the street (the hotel's upper storey, rooms you are taken up to): regions at a height.
// groundHeight(x, z, y) stands you on the highest one under you that you are already at (within a
// step); without a y (or at street level) it is the street, so everything else is unaffected.
export const floors = [];   // { id, x0, x1, z0, z1, y }
export function addFloor(f) { floors.push(f); return f; }
export function floorAt(x, z, y) {
  let best = null;
  for (const f of floors) if (x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1 && f.y <= y + 0.6 && (!best || f.y > best.y)) best = f;
  return best;
}
export function groundHeight(x, z, y) {
  if (y > 2 && floors.length) { const f = floorAt(x, z, y); if (f) return f.y; }
  if (x < -480) { const m = metroGround(x, z); if (m != null) return m; if (inHenan(x, z)) return 0; }
  const st = L.stair;
  if (x >= L.wallX) {
    if (Math.abs(z) < st.halfW && x < st.x1) return (L.deckY * (x - st.x0)) / (st.x1 - st.x0);
    return L.deckY;
  }
  if (x < L.westCurbX) {
    // Hankou Road (and the side streets further north) run out through the west sidewalk
    if (Math.abs(z) < S.roadHalfW || inSideRoad(x, z)) return 0;
    return L.curbH;
  }
  if (x > L.eastCurbX) return L.curbH;
  return 0;
}

// Coarse "where am I" for footstep sounds etc.
export function surfaceAt(x, z) {
  if (x < -480 && metroGround(x, z) != null) return 'stairs';
  if (inHenan(x, z)) return 'road';
  if (x >= L.wallX) return Math.abs(z) < L.stair.halfW && x < L.stair.x1 ? 'stairs' : 'deck';
  if (x < L.westCurbX && Math.abs(z) >= S.roadHalfW && !inSideRoad(x, z)) return 'pavement';
  if (x > L.eastCurbX) return 'pavement';
  return 'road';
}
