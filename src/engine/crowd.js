// The evening crowd on the Bund: who is where, where they're going, how they move. Pure (no
// three.js): world/crowdView.js draws them (near ones as full animated people, far ones as baked
// impostors), and tests/crowd.test.mjs checks the walking.
//
// People walk a network of lanes laid on the real walkable surfaces (the promenade deck, both
// pavements of Zhongshan East 1st Road, Hankou Road, the Nanjing Road pedestrian street, the stair
// up from the road) and cross the road only on the zebra at Hankou Road, on the green man.
// Each person has a trip: appear at an edge of the map (out of the player's sight), walk to a
// destination, perhaps stopping on the way at the river railing to photograph Pudong or take a
// selfie, and leave. Some just linger. Tour groups follow a guide with a flag.
// Moving: keep to the right of oncoming people, keep a personal space, step round the player and
// street furniture, never into a wall, a planter or the road.
import { L, deckLamps, DECK_LAMP_X, benches, planterIslands, telescope, lions, streetTrees, stall, colliders, groundHeight, roadLamps, ROAD_LAMP_WEST_OFFSET, crossing, NJ, METRO, inHenan } from '../world/layout.js';
import { BUS_STOPS } from '../world/trafficMix.js';

const DECK = L.deckY, CURB = L.curbH;
const BLOCK = new Set(['customs', 'hsbc', 'north-block', 'aia-block', 'peace-block', 'portico', 'hsbc-centre', 'wall', 'railing', 'planter', 'boundary', 'shop', 'bikes', 'shelter', 'nj-north', 'nj-south', 'metro']);

// ---- the walk network ----
// node: { id, x, z, w (half-width of the lane there: how far people spread across it) }
// edge kinds: 'walk', 'zebra' (only on the green man)
export function buildNet(extra = null) {
  const nodes = [], edges = [], by = {};
  const node = (id, x, z, w = 1) => { const n = { id, x, z, w, links: [] }; nodes.push(n); by[id] = n; return n; };
  const link = (a, b, kind = 'walk', sig = 'bund') => { const A = by[a], B = by[b]; const d = Math.hypot(A.x - B.x, A.z - B.z); A.links.push({ to: b, d, kind, sig }); B.links.push({ to: a, d, kind, sig }); edges.push([a, b, kind]); };
  const Z = [-258, -234, -210, -186, -162, -138, -114, -90, -66, -42, -14, 0, 16, 40, 64, 92];
  // promenade: the main walk (between the planters and the benches) and the inner walk by the hedge,
  // joined wherever no planter is in the way
  const planterAt = (z) => planterIslands.some((p) => z > p.z0 - 1.2 && z < p.z1 + 1.2);
  Z.forEach((z, i) => {
    node(`P${i}`, 17.6, z, 2.4); node(`I${i}`, 10.35, z, 0.3);
    if (!planterAt(z)) link(`P${i}`, `I${i}`);
    if (i) { link(`P${i - 1}`, `P${i}`); link(`I${i - 1}`, `I${i}`); }
  });
  // the river railing: photo spots between the lamps, clear of the telescope and the benches
  const rail = [];
  for (let z = -252; z <= 90; z += 6) {
    if (deckLamps.some((lz) => Math.abs(lz - z) < 2.5)) continue;
    if (z > -20 && z < -10) continue;                                // Old Lin and Ms. Su's spot
    if (Math.abs(z - telescope.z) < 1.5) continue;
    const id = `R${z}`; node(id, 24.15, z, 0.15); rail.push(id);
    let best = 0; Z.forEach((zz, i) => { if (Math.abs(zz - z) < Math.abs(Z[best] - z)) best = i; });
    link(id, `P${best}`);
  }
  // the stair down to the road's east pavement, then the pavement itself
  node('ST', 10.4, 0, 2.5); node('SB', 0.4, 0, 1.2);
  link('ST', 'I11'); link('ST', 'SB');
  // (past a bus shelter the walk narrows to the strip behind it)
  const eastStop = (z) => BUS_STOPS.some((st) => st.dir < 0 && Math.abs(z - st.z) < 6.5);
  const westStop = (z) => BUS_STOPS.some((st) => st.dir > 0 && Math.abs(z - st.z) < 6.5);
  const EZ = [...Z, ...BUS_STOPS.filter((st) => st.dir < 0).flatMap((st) => [st.z - 6, st.z + 6])].sort((a, b) => a - b);
  EZ.forEach((z, i) => { node(`E${i}`, eastStop(z) ? -0.5 : -1.0, z, eastStop(z) ? 0.4 : 1.4); if (i) link(`E${i - 1}`, `E${i}`); });
  const Eat = (z) => `E${EZ.indexOf(z)}`;
  link('SB', Eat(0));
  // across Zhongshan Road on the zebra at Hankou Road (the green man only)
  node('EK', -3.6, 1.2, 0.6); node('WK', -28.7, 1.2, 0.6);
  link(Eat(0), 'EK'); link('EK', 'WK', 'zebra');
  // the west pavement, along the bank fronts (round the bicycles parked by the kerb north of Hankou Road)
  const WZ = [-258, -234, -213.5, -188.5, -162, -138, -114, -90, -66, -42, -22, -11, 7, 18, 42, 66, 92, ...BUS_STOPS.filter((st) => st.dir > 0).flatMap((st) => [st.z - 6, st.z + 6])].sort((a, b) => a - b);
  WZ.forEach((z, i) => { const tight = (z >= -22 && z <= -11) || westStop(z); node(`W${i}`, tight ? -31.5 : -30.0, z, tight ? 0.25 : 0.6); if (i) link(`W${i - 1}`, `W${i}`); });
  const Wat = (z) => `W${WZ.indexOf(z)}`;
  link('WK', Wat(7));
  // waiting at the bus stops: under the shelter roof, by the seat
  // (in round the upstream end of the shelter's back wall, which runs st.z +- 3.75)
  for (const st of BUS_STOPS) {
    const id = `BS:${st.id}`, w = st.dir > 0, x = w ? L.westCurbX - 1.0 : L.eastCurbX + 1.0;
    node(id, x, st.z - 1.0, 1.2);
    node(`${id}:in`, w ? -31.0 : -1.0, st.z - 4.6, 0.2);
    const side = w ? Wat : Eat;
    link(id, `${id}:in`); link(`${id}:in`, side(st.z - 6)); link(`${id}:in`, side(st.z + 6));
  }
  // Hankou Road, both pavements to the hoarding
  const HX = [-31.0, -45, -60, -75, -90];
  HX.forEach((x, i) => {
    node(`HN${i}`, x, -4.6, 0.25); node(`HS${i}`, x, 5.9, 0.25);
    if (i) { link(`HN${i - 1}`, `HN${i}`); link(`HS${i - 1}`, `HS${i}`); }
  });
  link('HN0', Wat(-11)); link('HS0', Wat(7));
  // Nanjing Road East: a pedestrian street (since 2020) from the Bund west to Henan Middle Road
  const NX = [-30.5, -40, -50, -60, -70, -84, -110, -140, -170, -200, -230, -260, -290, -320, -350, -380, -395, -420, -450, -475, -490];
  const NZ = [-208.6, -201, -193.4];
  const wellAt = (x, z) => METRO.some((m) => x > m.x0 - 1 && x < m.x1 + 1 && z < m.z1 + 1);
  NX.forEach((x, i) => NZ.forEach((z, j) => {
    if (wellAt(x, z)) return;
    node(`N${i}_${j}`, x, z, 2.2);
    if (i && by[`N${i - 1}_${j}`]) link(`N${i - 1}_${j}`, `N${i}_${j}`);
    if (j && by[`N${i}_${j - 1}`]) link(`N${i}_${j - 1}`, `N${i}_${j}`);
  }));
  link('N0_0', Wat(-213.5)); link('N0_2', Wat(-188.5));
  const last = NX.length - 1;
  // shop windows on both sides: window-shopping, photographing the neon (people linger on Nanjing Road)
  const shops = [];
  for (let x = -46; x > -476; x -= 13) {
    if (NJ.cross.some((c) => x > c.x0 - 2 && x < c.x1 + 2)) continue;
    for (const [z, row] of [[NJ.z0 + 1.0, 0], [NJ.z1 - 1.0, 2]]) {
      let best = 0; NX.forEach((nx, i) => { if (Math.abs(nx - x) < Math.abs(NX[best] - x) && by[`N${i}_${row}`]) best = i; });
      if (!by[`N${best}_${row}`]) continue;
      const id = `S${Math.round(-x)}_${row}`; node(id, x, z, 0.5); link(id, `N${best}_${row}`); shops.push(id);
    }
  }
  // Exit 7 (east of Henan Road): the top of the stairs, and the landing at the bottom
  const m7 = METRO[0], m2 = METRO[1];
  node('M7t', m7.top + 1.0, -209.5, 0.6); node('M7b', m7.bottom - 0.6, -209.5, 0.8); link('M7t', 'M7b');
  link('M7t', `N${last - 1}_0`); link('M7t', `N${last - 1}_1`);
  // Henan Road: across on the zebra (its own signal), and along its pavements a little way
  const h = NJ.henan;
  node('HE', h.x1 + 0.45, NJ.zc + 1.5, 0.6); node('HW', h.x0 - 0.45, NJ.zc + 1.5, 0.6);
  link(`N${last}_1`, 'HE'); link('HE', 'HW', 'zebra', 'henan');
  node('HNE0', h.x1 + 0.8, -205, 0.3); node('HNE1', h.x1 + 0.8, -214, 0.3); node('HNE2', h.x1 + 2.2, NJ.z0 - h.walkTo + 2, 0.6);
  link(`N${last}_1`, 'HNE0'); link('HNE0', 'HNE1'); link('HNE1', 'HNE2');
  node('HSE0', h.x1 + 2.0, NJ.z1 + 1, 0.6); node('HSE1', h.x1 + 2.2, NJ.z1 + h.walkTo - 2, 0.6);
  link(`N${last}_2`, 'HSE0'); link(`N${last}_1`, 'HSE0'); link('HSE0', 'HSE1');
  // west of Henan Road: the stub of the street to the hoarding, Exit 2, the west pavements
  node('NW0', -520, -201, 1.6); node('NW1', -520, -193.4, 1.6); node('NW2', -536, -201, 1.6); node('NW3', -536, -193.4, 1.6); node('NW4', -545, -198, 2.5);
  link('HW', 'NW0'); link('NW0', 'NW1'); link('NW0', 'NW2'); link('NW1', 'NW3'); link('NW2', 'NW3'); link('NW2', 'NW4'); link('NW3', 'NW4');
  node('M2a', m2.top - 1.4, -205.2, 0.4); node('M2t', m2.top - 1.0, -209.5, 0.5); node('M2b', m2.bottom + 0.6, -209.5, 0.8);
  link('NW0', 'M2a'); link('NW2', 'M2a'); link('M2a', 'M2t'); link('M2t', 'M2b');
  node('HNW0', h.x0 - 0.9, -205, 0.3); node('HNW1', h.x0 - 0.9, -214, 0.3); node('HNW2', h.x0 - 2.2, NJ.z0 - h.walkTo + 2, 0.6);
  link('HW', 'HNW0'); link('HNW0', 'HNW1'); link('HNW1', 'HNW2');
  node('HSW0', h.x0 - 2.0, NJ.z1 + 1, 0.6); node('HSW1', h.x0 - 2.2, NJ.z1 + h.walkTo - 2, 0.6);
  link('HW', 'HSW0'); link('NW1', 'HSW0'); link('HSW0', 'HSW1');
  if (extra) extra({ node, link, by });
  return { nodes, edges, by, rail, shops, ends: { E0: Eat(-258), E15: Eat(92), W0: Wat(-258), W16: Wat(92) } };
}

// shortest path (node ids) by Dijkstra; zebra edges carry a small penalty (people avoid crossing for nothing)
export function route(net, from, to) {
  const dist = { [from]: 0 }, prev = {}, open = new Set([from]);
  while (open.size) {
    let u = null; for (const k of open) if (u === null || dist[k] < dist[u]) u = k;
    open.delete(u);
    if (u === to) break;
    for (const e of net.by[u].links) {
      const nd = dist[u] + e.d + (e.kind === 'zebra' ? 25 : 0);
      if (dist[e.to] === undefined || nd < dist[e.to]) { dist[e.to] = nd; prev[e.to] = u; open.add(e.to); }
    }
  }
  if (dist[to] === undefined) return null;
  const out = [to]; while (out[0] !== from) out.unshift(prev[out[0]]);
  return out;
}

// where people come from and go to, and how many (weights)
export const ENDS = [
  { id: 'P0', w: 11, area: 'deck' }, { id: 'P15', w: 9, area: 'deck' }, { id: 'I0', w: 3, area: 'deck' }, { id: 'I15', w: 3, area: 'deck' },
  { id: 'E0', w: 2, area: 'east' }, { id: 'E15', w: 2, area: 'east' },
  { id: 'W0', w: 2, area: 'west' }, { id: 'W16', w: 2, area: 'west' },
  { id: 'HN4', w: 1, area: 'hankou' }, { id: 'HS4', w: 1, area: 'hankou' },
  { id: 'M7b', w: 12, area: 'nanjing' }, { id: 'M2b', w: 8, area: 'nanjing' }, { id: 'NW4', w: 5, area: 'nanjing' },
  { id: 'HNE2', w: 1.5, area: 'nanjing' }, { id: 'HSE1', w: 1.5, area: 'nanjing' }, { id: 'HNW2', w: 1.5, area: 'nanjing' }, { id: 'HSW1', w: 1.5, area: 'nanjing' },
];

// small things to step round: [x, z, r]
export function obstacles() {
  const o = [];
  for (const z of deckLamps) if (z > L.zNorth - 5 && z < L.zSouth + 5) o.push([DECK_LAMP_X, z, 0.45]);
  for (const b of benches) for (const dz of [-0.8, 0, 0.8]) o.push([b.x, b.z + dz, 0.6]);
  o.push([telescope.x, telescope.z, 0.5]);
  for (const l of lions) for (const dx of [-0.9, 0, 0.9]) o.push([l.x + dx, l.z, 0.8]);
  for (const t of streetTrees) o.push([t.x, t.z, 0.5]);
  o.push([stall.x, stall.z, 1.1]);
  for (const z of roadLamps) { o.push([L.westCurbX - 0.5, z + ROAD_LAMP_WEST_OFFSET, 0.35]); o.push([L.eastCurbX + 0.5, z, 0.35]); }
  for (const p of crossing.vehPoles) o.push([p.x, p.z, 0.4]);
  for (const p of crossing.pedPoles) o.push([p.x, p.z, 0.3]);
  return o;
}
// solid things, bucketed on a 10 m grid (rebuilt if colliders are added): a few hundred people check
// every step, so they only look at the boxes near them
let index = null, indexed = -1;
function buildIndex() {
  index = new Map(); indexed = colliders.length;
  for (const b of colliders) {
    if (!BLOCK.has(b.tag)) continue;
    for (let i = Math.floor((b.minX - 1) / 10); i <= Math.floor((b.maxX + 1) / 10); i++) for (let j = Math.floor((b.minZ - 1) / 10); j <= Math.floor((b.maxZ + 1) / 10); j++) {
      const k = i * 100003 + j; let c = index.get(k); if (!c) index.set(k, c = []); c.push(b);
    }
  }
}
export function blocked(x, z, r = 0.25) {
  if (indexed !== colliders.length) buildIndex();
  const c = index.get(Math.floor(x / 10) * 100003 + Math.floor(z / 10));
  if (c) for (const b of c) if (x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r) return true;
  return false;
}
// the carriageway: people only ever on it on the zebra
export const onRoad = (x, z) => (x > L.westCurbX + 0.15 && x < L.eastCurbX - 0.15) || (x < L.westCurbX && x > -100 && Math.abs(z) < L.street.roadHalfW - 0.1 && x < -31.5) || inHenan(x, z);

// ---- who they are ----
// kinds: tourist (domestic or from abroad), local (on their way somewhere), elder, couple, lingerer,
// guide (with a flag) and follower (in a tour group)
const ROLE_POOL = {
  domestic: ['p1', 'p3', 'p2', 'c1', 'c2', 'c3', 'c4'],
  abroad: ['p4', 'c5', 'c6', 'c7', 'c8'],
  local: ['p1', 'p2', 'p3', 'c1', 'c2', 'c3', 'c4'],
  elder: ['p5', 'p4'],
};
const pick = (a, rnd) => a[Math.floor(rnd() * a.length)];

export function createCrowd({ net = buildNet(), density = 1, rnd = Math.random, roles = null, areaWeights = null, groups = null } = {}) {
  const have = roles ? new Set(roles) : null;
  const rolesFor = (k) => { const a = ROLE_POOL[k].filter((r) => !have || have.has(r)); return a.length ? a : (roles || ['p1']); };
  const obs = obstacles();
  const ends = ENDS.map((e) => ({ ...e, id: (net.ends && net.ends[e.id]) || e.id })).filter((e) => net.by[e.id]);
  const stops = BUS_STOPS.map((st) => `BS:${st.id}`).filter((id) => net.by[id]);
  const W = ends.reduce((s, e) => s + e.w * ((areaWeights && areaWeights[e.area]) ?? 1), 0);
  const pickEnd = (not) => {
    for (let k = 0; k < 8; k++) {
      let x = rnd() * W;
      for (const e of ends) { x -= e.w * ((areaWeights && areaWeights[e.area]) ?? 1); if (x <= 0) { if (e.id !== not) return e; break; } }
    }
    return ends.find((e) => e.id !== not);
  };
  const agents = [];
  const N = Math.round(380 * density), nGroups = groups ?? Math.max(1, Math.round(2.5 * density));
  let nextId = 0;
  const make = (kind, extra = {}) => {
    const abroad = kind === 'tourist' && rnd() < 0.22;
    const role = kind === 'elder' ? pick(rolesFor('elder'), rnd) : pick(rolesFor(abroad ? 'abroad' : kind === 'local' || kind === 'commuter' ? 'local' : 'domestic'), rnd);
    const speed = kind === 'local' || kind === 'commuter' ? 1.25 + rnd() * 0.3 : kind === 'elder' ? 0.72 + rnd() * 0.12 : kind === 'follower' || kind === 'guide' ? 0.88 : 0.95 + rnd() * 0.25;
    const a = {
      id: nextId++, kind, role, abroad, speed, v: 0, x: 0, z: 0, y: CURB, heading: 0, vx: 0, vz: 0,
      path: null, i: 0, off: (rnd() - 0.5) * 2, state: 'walk', act: null, wait: 0, stops: 0, phase: rnd(),
      group: null, slot: null, phone: kind === 'local' && rnd() < 0.45, persona: abroad ? 'visitor' : kind === 'elder' ? 'elder' : kind === 'local' ? (rnd() < 0.5 ? 'office' : 'youngMan') : (rnd() < 0.5 ? 'student' : 'youngMan'),
      gone: false, hold: 0, scale: 0.95 + rnd() * 0.1, rank: rnd(), ...extra,
    };
    agents.push(a);
    return a;
  };
  const deckEnds = ['P0', 'P15'].map((id) => ends.find((e) => e.id === ((net.ends && net.ends[id]) || id))).filter(Boolean);
  function trip(a, { midway = false } = {}) {
    if (a.kind === 'jogger' && deckEnds.length === 2) {             // the length of the promenade and back off it
      const k = rnd() < 0.5 ? 0 : 1, p = route(net, deckEnds[k].id, deckEnds[1 - k].id);
      if (p && p.length > 1) {
        a.path = p; a.i = 1; a.via = null; a.done = false; a.startAt = null;
        const n0 = net.by[p[0]]; a.x = n0.x; a.z = n0.z;
        if (midway) { const j = 1 + Math.floor(rnd() * (p.length - 1)), A = net.by[p[j - 1]], B = net.by[p[j]], f = rnd(); a.x = A.x + (B.x - A.x) * f; a.z = A.z + (B.z - A.z) * f; a.i = j; }
        a.y = groundHeight(a.x, a.z, 9); a.state = 'walk'; a.wait = 0; a.gone = false;
        return;
      }
    }
    const from = a.startAt || pickEnd(null); a.startAt = null;
    if (a.kind === 'commuter' && from.id.startsWith('BS:')) a.kind = 'local';
    let to = pickEnd(from.id);
    if (a.kind === 'commuter' && stops.length && !from.id.startsWith('BS:')) to = { id: pick(stops, rnd) };
    // tourists on the deck often stop at the railing on the way
    let via = null;
    const deck = (id) => /^(P|I|R|ST)/.test(id);
    if ((a.kind === 'tourist' || a.kind === 'guide' || a.kind === 'lingerer') && rnd() < (a.kind === 'lingerer' ? 1 : 0.75)) via = pick(net.rail, rnd);
    // ... or a shop window on Nanjing Road, if the trip touches it (locals too, now and then)
    const nanjing = (id) => /^(N|M|NW|S)/.test(id);
    if (net.shops && net.shops.length && (nanjing(from.id) || nanjing(to.id)) && a.kind !== 'guide' && rnd() < (a.kind === 'local' ? 0.3 : a.kind === 'lingerer' ? 0.6 : 0.55)) via = pick(net.shops, rnd);
    let p = via ? [...(route(net, from.id, via) || []), ...(route(net, via, to.id) || []).slice(1)] : route(net, from.id, to.id);
    if (!p || p.length < 2) p = route(net, from.id, pickEnd(from.id).id) || [from.id];
    a.path = p; a.i = 1; a.via = via; a.done = false;
    const n0 = net.by[p[0]];
    a.x = n0.x; a.z = n0.z;
    a.y = deck(p[0]) ? DECK : CURB;
    if (midway && p.length > 2) {                                     // start somewhere along it (so the scene starts full)
      const k = 1 + Math.floor(rnd() * (p.length - 1)), A = net.by[p[k - 1]], B = net.by[p[k]], f = rnd();
      a.x = A.x + (B.x - A.x) * f; a.z = A.z + (B.z - A.z) * f; a.i = k;
      if (via && p.indexOf(via) < k) a.via = null;
    }
    a.y = groundHeight(a.x, a.z, 9);
    a.state = 'walk'; a.wait = 0; a.gone = false;
  }
  // tour groups: a guide and 6-11 followers
  const tours = [];
  for (let g = 0; g < nGroups; g++) {
    const guide = make('guide'), size = 6 + Math.floor(rnd() * 6);
    const tour = { guide, members: [], flag: ['#e8302a', '#f4c51b', '#1d6fe0', '#e64ba0'][g % 4], said: 0 };
    guide.group = tour; guide.speed = 0.85;
    for (let k = 0; k < size; k++) { const f = make('follower'); f.group = tour; f.slot = { back: 1.4 + (k % 4) * 0.9 + rnd() * 0.6, side: ((k % 3) - 1) * 0.9 + (rnd() - 0.5) * 0.6 }; tour.members.push(f); }
    tours.push(tour);
  }
  const kinds = ['tourist', 'tourist', 'tourist', 'tourist', 'local', 'local', 'couple', 'elder', 'lingerer', 'lingerer', 'tourist', 'commuter', 'tourist', 'couple'];
  while (agents.length < N) {
    const k = pick(kinds, rnd);
    if (k === 'couple') { const a = make('tourist'), b = make('tourist', { role: a.role === 'c1' ? 'p3' : a.role }); a.partner = b; b.partner = a; b.leader = a; b.speed = a.speed = 0.85; }
    else make(k);
  }
  // early-morning runners on the promenade (out only at dawn: setActive)
  const nJog = Math.round(12 * Math.min(1, density));
  for (let k = 0; k < nJog; k++) make('jogger', { speed: 2.5 + rnd() * 0.7, rank: 0, gone: true, hold: rnd() * 30, phone: false, persona: rnd() < 0.5 ? 'office' : 'youngMan' });
  for (const a of agents) if (!a.leader && a.kind !== 'follower' && a.kind !== 'jogger') trip(a, { midway: true });
  // beside someone, but never inside a wall: fall back to their own spot
  const besides = (a, o, dx, dz) => { const x = o.x + dx, z = o.z + dz; if (!blocked(x, z) && !onRoad(x, z)) { a.x = x; a.z = z; } else { a.x = o.x; a.z = o.z; } a.y = o.y; };
  for (const t of tours) for (const f of t.members) besides(f, t.guide, -0.6 - rnd() * 0.8, (rnd() - 0.5) * 1.6);
  for (const a of agents) if (a.leader) besides(a, a.leader, 0.6, 0.3);

  // spatial hash for neighbours
  const CELL = 2.5, grid = new Map();
  const key = (x, z) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
  function rebuild() { grid.clear(); for (const a of agents) { if (a.gone) continue; const k = key(a.x, a.z); let c = grid.get(k); if (!c) grid.set(k, c = []); c.push(a); } }
  function near(x, z, f) { const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const c = grid.get(`${cx + i},${cz + j}`); if (c) for (const o of c) f(o); } }

  const state = { pedAspect: 'dont', walkFor: 0, sig: { bund: { aspect: 'dont', walkFor: 0 }, henan: { aspect: 'dont', walkFor: 0 } } };
  // the hour: what share of the crowd is out (each person has a rank), and whether it's the joggers' hour
  const hour = { active: 1, dawn: false };
  const awake = (a) => (a.kind === 'jogger' ? hour.dawn : a.rank <= hour.active);
  // a target point for this agent now: the next node, spread across the lane (keep right)
  function target(a) {
    const n = net.by[a.path[a.i]], p = net.by[a.path[a.i - 1]] || n;
    let dx = n.x - p.x, dz = n.z - p.z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
    const right = [-dz, dx];                                         // heading (dx,dz): right-hand side is (-dz, dx)
    const spread = Math.min(n.w, p.w) * (0.35 + 0.65 * Math.abs(a.off)) * Math.sign(a.off || 1);
    const keep = Math.min(n.w, p.w) > 0.8 ? 0.45 : 0;                // keep right a little on wide walks
    return [n.x + right[0] * (spread + keep), n.z + right[1] * (spread + keep), n];
  }
  function arrive(a, n, dt) {
    // reached a node: an act at the railing, the zebra, or on to the next
    if (n.id.startsWith('S') && a.via === n.id) {                     // at a shop window: facing it
      a.via = null; a.state = 'act'; a.atRail = true; a.heading = n.z < NJ.zc ? Math.PI : 0;
      a.act = rnd() < 0.3 ? 'photo' : rnd() < 0.4 ? 'phone' : 'look';
      a.wait = a.kind === 'lingerer' ? 25 + rnd() * 50 : 5 + rnd() * 14;
      return;
    }
    if (n.id.startsWith('R') && a.via === n.id) {
      a.via = null; a.state = 'act'; a.heading = Math.PI / 2; a.atRail = true;
      const r = rnd();
      a.act = a.kind === 'guide' ? 'guide' : r < 0.55 ? 'photo' : r < 0.75 ? 'selfie' : 'look';
      a.wait = a.kind === 'lingerer' ? 40 + rnd() * 80 : a.kind === 'guide' ? 45 + rnd() * 25 : 6 + rnd() * 16;
      if (a.act === 'selfie') a.heading = -Math.PI / 2;
      a.stops++;
      return;
    }
    if (n.id.startsWith('BS:') && a.i === a.path.length - 1 && a.kind === 'commuter') {
      a.state = 'bus'; a.busStop = n.id.slice(3); a.wait = 90 + rnd() * 150; a.act = rnd() < 0.6 ? 'phone' : 'look';
      return;
    }
    const nxt = a.path[a.i + 1];
    const ze = nxt && net.by[n.id].links.find((e) => e.to === nxt && e.kind === 'zebra');
    if (ze) { a.state = 'kerb'; a.sig = ze.sig; return; }
    a.i++;
    if (a.i >= a.path.length) { a.gone = true; a.hold = 1 + rnd() * 6; }
  }
  const crowd = {
    net, agents, tours, state,
    // the hour (engine/timeOfDay.js): `share` of the crowd out, joggers at dawn. Those beyond their
    // hour finish their walk and don't come back; instant (after a time skip): gone at once, and
    // whoever's hour it is, out at once and already on their way
    setActive(share, { dawn = false, instant = false } = {}) {
      hour.active = share; hour.dawn = dawn;
      if (!instant) return;
      for (const a of agents) {
        if (a.kind === 'follower' || a.leader) continue;
        if (!awake(a)) { a.gone = true; a.hold = 1 + rnd() * 5; }
        else if (a.gone) { a.gone = false; trip(a, { midway: true }); }
      }
      for (const t of tours) for (const f of t.members) if (!t.guide.gone) besides(f, t.guide, -0.6 - rnd() * 0.8, (rnd() - 0.5) * 1.6);
      for (const a of agents) if (a.leader && !a.leader.gone) { a.gone = false; besides(a, a.leader, 0.6, 0.3); }
    },
    get active() { return hour.active; },
    // the signal at Hankou Road (traffic.controller.pedAspect) and how long the green man has been on
    setSignal(aspect, dt, id = 'bund') {
      const sg = state.sig[id] || (state.sig[id] = { aspect: 'dont', walkFor: 0 });
      sg.walkFor = aspect === 'walk' ? (sg.aspect === 'walk' ? sg.walkFor + dt : 0) : 0; sg.aspect = aspect;
      if (id === 'bund') { state.pedAspect = aspect; state.walkFor = sg.walkFor; }
    },
    update(dt, { player = null, canSpawnAt = null, others = null } = {}) {
      if (dt <= 0) return;
      rebuild();
      for (const a of agents) {
        const boss = a.kind === 'follower' ? a.group.guide : a.leader;
        if (boss && boss.gone && !a.gone) { a.gone = true; continue; }          // they leave together
        if (a.gone) {
          if (a.kind === 'follower' || a.leader) { if (!(a.group || {}).guide?.gone && !(a.leader || {}).gone) { a.gone = false; a.x = (a.leader || a.group.guide).x; a.z = (a.leader || a.group.guide).z; } continue; }
          a.hold -= dt; if (a.hold > 0) continue;
          if (!awake(a)) { a.hold = 2 + rnd() * 4; continue; }                // not their hour
          if (a.kind === 'jogger') { trip(a); continue; }
          const e = pickEnd(null);
          if (canSpawnAt && !canSpawnAt(net.by[e.id])) { a.hold = 0.5; continue; }
          a.startAt = e; trip(a);
          continue;
        }
        let tx, tz, speed = a.speed, n = null;
        if (a.kind === 'follower') {
          const g = a.group.guide, h = g.heading;
          if (g.state === 'act') {                                     // gathered round the guide at the railing
            a.state = 'act'; a.act = a.act || (rnd() < 0.6 ? 'photo' : rnd() < 0.5 ? 'selfie' : 'look');
            tx = Math.min(24.1, g.x - 0.4 - a.slot.back * 0.35); tz = g.z + a.slot.side * 2.4 + (a.slot.back - 2.5);
            a.heading = a.act === 'selfie' ? -Math.PI / 2 : Math.PI / 2;
          } else {
            a.state = 'walk'; a.act = null;
            tx = g.x - Math.sin(h) * a.slot.back + Math.cos(h) * a.slot.side; tz = g.z - Math.cos(h) * a.slot.back - Math.sin(h) * a.slot.side;
            // never wait about in the road behind a guide who is already off it
            if ((onRoad(tx, tz) || onRoad(a.x, a.z)) && !onRoad(g.x, g.z)) { tx = g.x; tz = g.z; }
          }
          const d = Math.hypot(tx - a.x, tz - a.z); speed = onRoad(a.x, a.z) ? 1.5 : d > 2 ? g.speed * 1.35 : d > 0.4 ? g.speed : 0;
          if (d > 9 && !onRoad(g.x, g.z)) besides(a, g, -Math.sin(g.heading) * 1.5, -Math.cos(g.heading) * 1.5);
        } else if (a.leader) {
          const l = a.leader; a.state = l.state; a.act = l.act;
          tx = l.x + Math.cos(l.heading) * 0.62; tz = l.z - Math.sin(l.heading) * 0.62;
          if (l.state === 'act') a.heading = l.heading;
          const d = Math.hypot(tx - a.x, tz - a.z); speed = onRoad(a.x, a.z) ? 1.5 : d > 1.2 ? l.speed * 1.3 : d > 0.15 ? l.speed : 0;
          if (d > 7) besides(a, l, tx - l.x, tz - l.z);
        } else if (a.state === 'act') {
          a.wait -= dt;
          if (a.wait <= 0) { a.state = 'walk'; a.act = null; if (a.atRail) { a.atRail = false; a.i = Math.min(a.i + 1, a.path.length - 1); } }
          tx = a.x; tz = a.z; speed = 0;
        } else if (a.state === 'bus') {
          // waiting at the stop; given up after a while (walk off somewhere)
          a.wait -= dt; tx = a.x; tz = a.z; speed = 0;
          if (a.wait <= 0) { a.kind = 'local'; a.startAt = { id: `BS:${a.busStop}` }; trip(a); }
        } else if (a.state === 'board') {
          tx = a.door.x; tz = a.door.z; speed = 1.25;
          if (Math.hypot(tx - a.x, tz - a.z) < 0.7) { a.gone = true; a.hold = 4 + rnd() * 10; a.kind = rnd() < 0.5 ? 'commuter' : 'local'; continue; }
        } else if (a.state === 'kerb') {
          // the green man, and enough of it left to get across (it lasts ~20 s; 23 m at 1.2 m/s)
          tx = a.x; tz = a.z; speed = 0;
          const sg = state.sig[a.sig || 'bund'];
          if (sg.aspect === 'walk' && sg.walkFor < 4) { a.state = 'cross'; a.i++; }
        } else {
          [tx, tz, n] = target(a);
          if (a.state === 'cross') speed = Math.max(a.speed, 1.2);
          const d = Math.hypot(tx - a.x, tz - a.z), pv = net.by[a.path[a.i - 1]];
          const passed = pv && ((n.x - a.x) * (n.x - pv.x) + (n.z - a.z) * (n.z - pv.z)) < 0;
          const last = a.i === a.path.length - 1;
          if (d < (last ? 2 : n.w > 0.65 ? 1.2 : 0.45) || passed) { if (a.state === 'cross') a.state = 'walk'; arrive(a, n, dt); if (a.state !== 'walk' && a.state !== 'cross') { tx = a.x; tz = a.z; speed = 0; } }
        }
        // on a carriageway without crossing (pushed off the kerb in a crowd, a partner left behind):
        // back to the nearest kerb at once
        const ld = a.kind === 'follower' ? a.group.guide : a.leader;
        let rescue = false;
        if (a.state !== 'cross' && !(ld && ld.state === 'cross') && onRoad(a.x, a.z)) {
          rescue = true; speed = 1.4; tz = a.z;
          if (inHenan(a.x, a.z)) tx = a.x < NJ.henan.xc ? NJ.henan.x0 - 0.4 : NJ.henan.x1 + 0.4;
          else if (a.x < L.westCurbX) tz = a.z < 0 ? -L.street.roadHalfW - 0.4 : L.street.roadHalfW + 0.4, tx = a.x;
          else tx = a.x < (L.westCurbX + L.eastCurbX) / 2 ? L.westCurbX - 0.4 : L.eastCurbX + 0.4;
        }
        // desired velocity toward the target
        let dx = tx - a.x, dz = tz - a.z; const d = Math.hypot(dx, dz);
        let vx = 0, vz = 0;
        if (d > 0.05 && speed > 0) { vx = dx / d * speed; vz = dz / d * speed; }
        // personal space: other people, the player, street furniture
        let sx = 0, sz = 0;
        const fx = d > 0.05 ? dx / d : Math.sin(a.heading), fz = d > 0.05 ? dz / d : Math.cos(a.heading);
        near(a.x, a.z, (o) => {
          if (o === a || o.gone) return;
          const ox = a.x - o.x, oz = a.z - o.z, od = Math.hypot(ox, oz);
          const mine = o === a.partner || (a.group && o.group === a.group);
          const rr = mine ? 0.55 : 0.85;
          if (od < rr && od > 1e-4) { const k = (rr - od) / rr * 1.6; sx += ox / od * k; sz += oz / od * k; }
          // someone coming the other way, ahead: ease to the right
          if (!mine && speed > 0 && od < 3.2 && od > 0.3 && (o.vx * fx + o.vz * fz) < -0.3 && (-ox * fx - oz * fz) > 0) { sx += -fz * 0.5; sz += fx * 0.5; }
        });
        if (others) for (const o of others) {
          const ox = a.x - o.x, oz = a.z - o.z; if (Math.abs(ox) > 1.2 || Math.abs(oz) > 1.2) continue;
          const od = Math.hypot(ox, oz); if (od < 1.0 && od > 1e-4) { const k = (1.0 - od) * 1.8; sx += ox / od * k; sz += oz / od * k; }
        }
        if (player) {
          const ox = a.x - player.x, oz = a.z - player.z, od = Math.hypot(ox, oz);
          if (od < 1.4 && od > 1e-4) { const k = (1.4 - od) / 1.4 * 2.4; sx += ox / od * k; sz += oz / od * k; }
          if (speed > 0 && od < 3 && (-ox * fx - oz * fz) > 0.2) { const side = (-ox * -fz + -oz * fx) > 0 ? -1 : 1; sx += -fz * side * 0.8; sz += fx * side * 0.8; }
        }
        for (const [ox0, oz0, r] of obs) {
          const ox = a.x - ox0, oz = a.z - oz0; if (Math.abs(ox) > r + 1 || Math.abs(oz) > r + 1) continue;
          const od = Math.hypot(ox, oz); if (od < r + 0.4 && od > 1e-4) { const k = (r + 0.4 - od) * 2.2; sx += ox / od * k; sz += oz / od * k; }
        }
        vx += sx * (speed > 0 ? 1 : 0.6); vz += sz * (speed > 0 ? 1 : 0.6);
        const vm = Math.hypot(vx, vz), cap = Math.max(speed * 1.25, 0.6);
        if (vm > cap) { vx *= cap / vm; vz *= cap / vm; }
        // smooth: people don't change velocity instantly
        const k = Math.min(1, dt * 3.2);
        a.vx += (vx - a.vx) * k; a.vz += (vz - a.vz) * k;
        let nx = a.x + a.vx * dt, nz = a.z + a.vz * dt;
        // never into a wall, a planter, the railing, a building; never onto the road except crossing
        // (or following your guide / partner over the zebra while the green man is still on)
        const lead = a.kind === 'follower' ? a.group.guide : a.leader;
        // (each zebra has its own green man: Zhongshan Road's at Hankou Road, Henan Road's at Nanjing Road)
        const zebra = (x, z) => (Math.abs(z - 1.2) < 2.2 && x > -28 && x < -4 ? 'bund' : Math.abs(z - NJ.zc - 1.5) < 2.2 && x > NJ.henan.x0 - 0.5 && x < NJ.henan.x1 + 0.5 ? 'henan' : null);
        const zb = lead && zebra(nx, nz);
        const mayCross = rescue || a.state === 'cross' || (zb && (lead.state === 'cross' || state.sig[zb].aspect === 'walk'));
        const bad = (x, z) => blocked(x, z) || (!mayCross && onRoad(x, z) && !onRoad(a.x, a.z));
        if (bad(nx, nz)) {
          if (!bad(nx, a.z)) nz = a.z;
          else if (!bad(a.x, nz)) nx = a.x;
          else { nx = a.x; nz = a.z; a.vx *= 0.3; a.vz *= 0.3; }
        }
        a.x = nx; a.z = nz;
        a.y = groundHeight(a.x, a.z, a.y + 0.5);
        a.v = Math.hypot(a.vx, a.vz);
        if (a.v > 0.15 && a.state !== 'act') a.heading = Math.atan2(a.vx, a.vz);
        a.phase = (a.phase + a.v * dt / 1.35) % 1;                     // one stride cycle ~1.35 m
      }
    },
    // a bus at this stop with its doors open: who was waiting gets on; some get off
    board(stopId, door) {
      let n = 0;
      for (const a of agents) if (!a.gone && a.state === 'bus' && a.busStop === stopId) { a.state = 'board'; a.door = door; n++; }
      return n;
    },
    alight(stopId, door, count) {
      let n = 0;
      for (const a of agents) {
        if (n >= count) break;
        if (!a.gone || a.kind === 'follower' || a.kind === 'guide' || a.leader || a.partner) continue;
        a.kind = 'local'; a.startAt = { id: `BS:${stopId}` }; trip(a);
        a.x = door.x + (rnd() - 0.5) * 0.6; a.z = door.z + (rnd() - 0.5) * 1.2; a.y = groundHeight(a.x, a.z, 1);
        n++;
      }
      return n;
    },
    // people on or about to step onto the carriageway, for engine/traffic.js
    onCarriageway() {
      const out = [];
      for (const a of agents) if (!a.gone && a.x > L.westCurbX - 1.2 && a.x < L.eastCurbX + 1.2 && Math.abs(a.z) < 6) out.push({ x: a.x, z: a.z, vx: a.vx, vz: a.vz, crossing: a.state === 'cross' || onRoad(a.x, a.z), crowd: a.id });
      return out;
    },
    onHenan() {
      const out = [];
      for (const a of agents) if (!a.gone && a.x > NJ.henan.x0 - 1.2 && a.x < NJ.henan.x1 + 1.2 && Math.abs(a.z - NJ.zc) < 8) out.push({ x: a.x, z: a.z - NJ.zc, vx: a.vx, vz: a.vz, crossing: a.state === 'cross' || inHenan(a.x, a.z), crowd: a.id });
      return out;
    },
    // for the tests and the minimap
    count() { return agents.filter((a) => !a.gone).length; },
  };
  return crowd;
}
