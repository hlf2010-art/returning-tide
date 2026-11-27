// Street dressing, as data (docs/living-city-architecture.md §6.5): where the shared bikes stand in
// their bays, the bins, the bollards that keep cars out of the pedestrian street, the utility
// cabinets, hydrants, street-name posts, enforcement cameras and the police post. Pure (no three.js):
// the crowd steps round the small ones (engine/crowd.js obstacles) and the drawing is world/dressing.js.
// Each placement is checked against the solid boxes and the small obstacles already there; one that
// would stand in something is left out, so a wrong guess here costs a missing bin, not a stuck crowd.
// Positions follow how Shanghai streets are dressed (bikes in painted bays at corners and metro exits,
// never on the Bund pavement; bollards at every opening of the pedestrian street), placed by eye.
import { L, NJ, colliders, BUND_ROW, KERB_ROW_X, bundTrees } from './layout.js';
import { PARASOLS } from './floodWall.js';

const h = NJ.henan;
// a row of things: from (x, z), n of them, step (dx, dz)
const row = (x, z, n, dx, dz, extra = {}) => Array.from({ length: n }, (_, i) => ({ x: x + dx * i, z: z + dz * i, ...extra }));

// shared bikes: operator colours (Meituan yellow, Hello blue, Didi's Qingju green); yaw: the bike's
// length runs along x at 0
export const BIKE_COLOURS = [0xf2c200, 0x1d7fe0, 0x2fae5a];
// (a bay is mostly one operator's, with a few of the others' left in it; Meituan's yellow most of all)
let bays = 0;
const bay = (x, z, n, dx, dz, yaw) => { const own = [0, 1, 0, 2, 0, 1][bays++ % 6]; return row(x, z, n, dx, dz).map((b, i) => ({ ...b, yaw: yaw + Math.sin(i * 2.7) * 0.12, colour: BIKE_COLOURS[(i * 7 + bays) % 5 === 0 ? (own + 1 + (i % 2)) % 3 : own] })); };
const BAYS = [
  ...bay(-90.4, -4.75, 10, 0.72, 0, 0.5), ...bay(-89, 4.75, 9, 0.72, 0, -0.5),            // Hankou Road, west of Manner
  ...bay(-54, -129.4, 12, 0.7, 0, 0.42),                                                    // Jiujiang Road
  ...bay(h.x1 + 1.4, -187.4, 9, 0, 0.66, 0), ...bay(h.x0 - 1.4, -187.4, 8, 0, 0.66, Math.PI),   // Henan Road, by the metro
  ...[['sichuan'], ['jiangxi'], ['fujian'], ['zhejiang']].flatMap(([id]) => { const c = NJ.cross.find((q) => q.id === id); return c ? bay(c.x0 + 1.3, NJ.z0 - 2.2, 9, 0, -0.66, 0) : []; }),
  ...(() => { const c = NJ.cross.find((q) => q.id === 'shandong'); return c ? bay(c.x1 - 1.3, NJ.z1 + 2.2, 9, 0, 0.66, Math.PI) : []; })(),
];

// The river side of Zhongshan East 1st Road, module by module (layout.js BUND_ROW, a tree at each start):
// two white art-deco planters chained together (the second now and then a bronze cabinet instead), a
// timber-topped granite bench on the walk side every other module, a hydrant at the kerb every fifth, a
// smart pole (cameras, a radio module) every sixth. As the real kerb was on 27 November 2026.
const KERB = BUND_ROW.flatMap((z0, j) => {
  const x = KERB_ROW_X, out = [{ kind: 'planter', x, z: z0 + 2.7, yaw: 0, r: 0.8 }];
  out.push(j % 4 === 2 ? { kind: 'bronze', x: x - 0.05, z: z0 + 5.3, yaw: 0, r: 0.6 } : { kind: 'planterEnd', x, z: z0 + 5.3, yaw: 0, r: 0.8 });
  if (j % 2 === 0) out.push({ kind: 'kerbBench', x: x + 1.55, z: z0 + 4.0, yaw: 0, r: 0.7 });
  if (j % 5 === 3) out.push({ kind: 'hydrant', x: L.eastCurbX + 0.42, z: z0 + 1.25, yaw: 0, r: 0.25 });
  if (j % 6 === 4) out.push({ kind: 'smartpole', x, z: z0 + 6.75, yaw: 0, r: 0.25 });
  return out;
});
// the trees' tripod stakes and pit grates: drawn, not checked (they stand in the tree's own footprint)
const STAKES = bundTrees.map((t) => ({ kind: 'stakes', x: t.x, z: t.z, yaw: 0, r: 0 }));

const PROPS = [
  ...KERB,
  // closed parasols outside the flood wall's cafés, furled, in the cafés' colours (world/floodWall.js)
  ...PARASOLS.map((p) => ({ kind: 'parasol', x: p.x, z: p.z, yaw: 0, colour: p.colour, r: 0.35 })),
  // two-compartment street bins: 可回收物 recyclable (blue) and 干垃圾 residual (black) (Shanghai sorts its rubbish)
  ...[[-66, -6.0], [-50, 6.0], [-62, NJ.z0 + 0.8], [-120, NJ.z1 - 0.8], [-180, NJ.z0 + 0.8], [-240, NJ.z1 - 0.8], [-350, NJ.z0 + 0.8], [-450, NJ.z1 - 0.8],
    [h.x1 + 1.2, NJ.z0 - 2.5], [h.x0 - 1.2, NJ.z1 + 2.5], [19.6, -12], [19.6, 10], [19.6, 48], [19.6, -100], [19.6, -160]].map(([x, z]) => ({ kind: 'bin', x, z, yaw: 0, r: 0.45 })),
  // bollards: across the pedestrian street's mouth on the Bund, and either side of the Henan Road zebra
  ...row(L.facadeX - 1.2, NJ.z0 + 1.6, 9, 0, 2.35, { kind: 'bollard', r: 0.24 }),
  ...[h.x0 - 0.6, h.x1 + 0.6].flatMap((x) => [...row(x, NJ.z0 + 0.9, 3, 0, 2.0), ...row(x, NJ.z1 - 0.9, 3, 0, -2.0)].map((b) => ({ ...b, kind: 'bollard', r: 0.24 }))),
  // utility cabinets against the building line
  ...[[-60, 5.95, Math.PI], [-84, 5.95, Math.PI], [-100, NJ.z0 + 0.9, 0], [-300, NJ.z1 - 0.9, Math.PI], [h.x1 + 1.0, -176, -Math.PI / 2]].map(([x, z, yaw]) => ({ kind: 'cabinet', x, z, yaw, r: 0.6 })),
  // hydrants at the kerb
  ...[[-54, -4.45], [-82, 4.45], [-200, NJ.z0 + 0.6], [h.x1 + 0.7, -182]].map(([x, z]) => ({ kind: 'hydrant', x, z, yaw: 0, r: 0.25 })),
  // street-name posts at the corners (blue, as Shanghai's are)
  ...[[L.westCurbX - 1.4, -4.7, Math.PI / 2], [L.westCurbX - 0.7, -116.4, Math.PI / 2], [h.x1 + 0.8, NJ.z0 - 1.0, 0], [h.x0 - 0.8, NJ.z1 + 1.0, Math.PI]].map(([x, z, yaw]) => ({ kind: 'signpost', x, z, yaw, r: 0.22 })),
  // enforcement cameras over the junctions (they flash white at night: world/pulse.js)
  ...[[L.westCurbX - 0.6, -26, 0], [L.eastCurbX + 0.6, 15, Math.PI], [h.x1 + 0.7, NJ.z0 - 4.0, Math.PI]].map(([x, z, yaw]) => ({ kind: 'camera', x, z, yaw, r: 0.25 })),
  // west of Henan Road to Xizang Road: bins every ~70 m along the frontages (alternate sides), bollards across
  // each cross street's mouth (no cars in the pedestrian street), a blue street-name post at each corner,
  // the odd utility cabinet
  ...Array.from({ length: 14 }, (_, i) => ({ kind: 'bin', x: -560 - i * 70, z: i % 2 ? NJ.z1 - 0.8 : NJ.z0 + 0.8, yaw: 0, r: 0.45 })),
  ...NJ.cross.filter((c) => c.x1 < -540 && !c.lane).flatMap((c) => (c.side ? [c.side] : ['N', 'S']).flatMap((sd) => {
    const z = sd === 'N' ? NJ.z0 - 1.4 : NJ.z1 + 1.4, n = Math.max(2, Math.floor((c.x1 - c.x0 - 3.2) / 1.6) + 1);   // (well clear of the corners)
    return [...row(c.x0 + 1.6, z, n, (c.x1 - c.x0 - 3.2) / Math.max(1, n - 1), 0, { kind: 'bollard', r: 0.24 }),
      { kind: 'signpost', x: c.x1 - 0.5, z: sd === 'N' ? NJ.z0 - 2.0 : NJ.z1 + 2.0, yaw: sd === 'N' ? 0 : Math.PI, r: 0.22 }];
  })),
  ...[[-640, NJ.z1 - 0.9, Math.PI], [-905, NJ.z0 + 0.9, 0], [-1210, NJ.z0 + 0.9, 0], [-1400, NJ.z1 - 0.9, Math.PI]].map(([x, z, yaw]) => ({ kind: 'cabinet', x, z, yaw, r: 0.6 })),
  // Nanjing Road's police post by Century Square (patrols on foot and bicycles work the street from it)
  { kind: 'police', x: -1068, z: NJ.z1 - 1.6, yaw: Math.PI, r: 1.5, box: [1.2, 1.4] },
  // a police post on the promenade, by the wall (its lamp turns slowly red and blue at night)
  { kind: 'police', x: L.wallX + 4.2, z: -64, yaw: -Math.PI / 2, r: 1.5, box: [1.2, 1.4] },
];

// half-sizes of what each kind stands on, for the checks (and the player's collision for the big ones)
export const FOOT = { parasol: [0.2, 0.2], planter: [0.4, 0.78], planterEnd: [0.4, 0.78], bronze: [0.27, 0.45], kerbBench: [0.27, 0.95], smartpole: [0.12, 0.12], stakes: [0.1, 0.1], bike: [0.85, 0.28], bin: [0.42, 0.25], bollard: [0.12, 0.12], cabinet: [0.45, 0.25], hydrant: [0.15, 0.15], signpost: [0.1, 0.1], camera: [0.12, 0.12], police: [1.2, 1.4] };

function clear(x, z, hx, hz) {
  for (const b of colliders) {
    if (b.minX > 1e5) continue;                                  // (a dynamic one, not yet placed)
    if (x + hx > b.minX - 0.15 && x - hx < b.maxX + 0.15 && z + hz > b.minZ - 0.15 && z - hz < b.maxZ + 0.15) return false;
  }
  // not on a carriageway: the Bund road, Hankou Road's, Henan Road's
  if (x > L.westCurbX + 0.1 && x < L.eastCurbX - 0.1) return false;
  if (x < L.westCurbX && x > -100 && Math.abs(z) < L.street.roadHalfW) return false;
  if (x > h.x0 && x < h.x1 && Math.abs(z - NJ.zc) < 420) return false;
  return true;
}

// (tools: what was left out, and why it's worth a look)
export function dressingRejected() {
  const kept = new Set(dressingProps());
  return [...BAYS.map((b) => ({ kind: 'bike', ...b })), ...PROPS].filter((p) => ![...kept].some((k) => k.x === p.x && k.z === p.z && k.kind === p.kind));
}
let cache = null;
// everything that passes the checks: [{ kind, x, z, yaw, colour?, r }]
export function dressingProps() {
  if (cache) return cache;
  const out = [];
  for (const b of BAYS) { const [hx, hz] = FOOT.bike; const c = Math.abs(Math.cos(b.yaw)), s = Math.abs(Math.sin(b.yaw)); if (clear(b.x, b.z, hx * c + hz * s, hx * s + hz * c)) out.push({ kind: 'bike', ...b, r: 0 }); }
  for (const p of PROPS) { const [hx, hz] = FOOT[p.kind]; const c = Math.abs(Math.cos(p.yaw || 0)), s = Math.abs(Math.sin(p.yaw || 0)); if (clear(p.x, p.z, hx * c + hz * s, hx * s + hz * c)) out.push(p); }
  // a planter only hangs its chain to a planter that is there to take it
  for (const p of out) if (p.kind === 'planter' && !out.some((q) => q.kind === 'planterEnd' && q.x === p.x && Math.abs(q.z - p.z - 2.6) < 0.01)) p.kind = 'planterEnd';
  out.push(...STAKES);
  return (cache = out);
}
// for the crowd: [x, z, r] of the small things in the way (bays are boxes: dressingBoxes)
export const dressingObstacles = () => dressingProps().filter((p) => p.r > 0 && p.kind !== 'police').flatMap((p) => p.kind === 'planter' ? [[p.x, p.z, p.r], [p.x, p.z + 1.3, 0.5]] : [[p.x, p.z, p.r]]);   // (and a planter's chain)
// solid boxes for the bays and the police post: { minX, maxX, minZ, maxZ }
export function dressingBoxes() {
  const props = dressingProps(), boxes = [];
  const bikes = props.filter((p) => p.kind === 'bike');
  // a bay is one box round its bikes (consecutive bikes within 1 m of each other)
  let cur = null;
  for (const b of bikes) {
    const hx = 0.8, hz = 0.8;
    if (cur && Math.hypot(b.x - cur.lx, b.z - cur.lz) < 1.0) { cur.minX = Math.min(cur.minX, b.x - hx * 0.6); cur.maxX = Math.max(cur.maxX, b.x + hx * 0.6); cur.minZ = Math.min(cur.minZ, b.z - hz * 0.6); cur.maxZ = Math.max(cur.maxZ, b.z + hz * 0.6); cur.lx = b.x; cur.lz = b.z; }
    else { cur = { minX: b.x - hx * 0.6, maxX: b.x + hx * 0.6, minZ: b.z - hz * 0.6, maxZ: b.z + hz * 0.6, lx: b.x, lz: b.z }; boxes.push(cur); }
  }
  for (const p of props) if (p.kind === 'police' || p.kind === 'cabinet') { const [hx, hz] = FOOT[p.kind]; const c = Math.abs(Math.cos(p.yaw)), s = Math.abs(Math.sin(p.yaw)); const ax = hx * c + hz * s, az = hx * s + hz * c; boxes.push({ minX: p.x - ax, maxX: p.x + ax, minZ: p.z - az, maxZ: p.z + az }); }
  return boxes.map(({ minX, maxX, minZ, maxZ }) => ({ minX, maxX, minZ, maxZ }));
}
