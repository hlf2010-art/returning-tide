// Turns an OpenStreetMap extract of Lujiazui into src/world/lujiazuiOsm.js: building footprints with
// their heights, the park, the lake, the Pearl's park, the roundabout's island, the Mingzhu Ring, the
// Apple plaza and store, the metro's entrances, all in the game's frame (x east, z south, metres).
// Data © OpenStreetMap contributors, ODbL 1.0 (https://www.openstreetmap.org/copyright).
//   curl -o /tmp/ljz.osm "https://api.openstreetmap.org/api/0.6/map?bbox=121.4920,31.2330,121.5060,31.2440"
//   node tools/osm/ljzosm.mjs /tmp/ljz.osm > src/world/lujiazuiOsm.js
// Heights: OSM's height, else its building:levels; else Wikidata's height or floors (P2048 / P1101) for an
// item whose coordinates fall in (or within 25 m of) the footprint (tools/osm/wikidata-lujiazui.json, a
// wikibase:box query over the same box); else a few recalled figures (RECALLED below); else a guess from
// the footprint and the neighbourhood, marked g: 1.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
const WD = JSON.parse(readFileSync(fileURLToPath(new URL('./wikidata-lujiazui.json', import.meta.url)), 'utf8'));
// recalled, not from a database: checked against nothing online, so marked in the output (src: 'recalled')
const RECALLED = { '时代金融中心': 269, '正大广场': 50, '上海国金中心商场': 30, 'GALA MALL': 24 };

const src = readFileSync(process.argv[2], 'utf8');
// the game's frame: the Oriental Pearl Tower (OSM way 40778038's centroid) is the skyline's PEARL at (640, -42)
export const LAT0 = 31.2419, LON0 = 121.49527, KX = 95190, KZ = 110860;
const X = (lon) => 640 + (lon - LON0) * KX, Z = (lat) => -42 - (lat - LAT0) * KZ;
const attr = (s, k) => { const m = s.match(new RegExp(`\\b${k}="([^"]*)"`)); return m ? m[1] : null; };
const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const tagsOf = (body) => { const t = {}; for (const m of body.matchAll(/<tag k="([^"]*)" v="([^"]*)"\s*\/>/g)) t[unesc(m[1])] = unesc(m[2]); return t; };
const nodes = new Map(), ntags = [];
for (const m of src.matchAll(/<node ([^>]*?)(\/>|>([\s\S]*?)<\/node>)/g)) {
  const id = attr(m[1], 'id'), p = [X(+attr(m[1], 'lon')), Z(+attr(m[1], 'lat'))]; nodes.set(id, p);
  if (m[3]) ntags.push({ id, p, t: tagsOf(m[3]) });
}
const ways = new Map();
for (const m of src.matchAll(/<way ([^>]*?)>([\s\S]*?)<\/way>/g)) {
  const nd = [...m[2].matchAll(/<nd ref="(\d+)"\s*\/>/g)].map((q) => q[1]);
  ways.set(attr(m[1], 'id'), { id: attr(m[1], 'id'), nd, t: tagsOf(m[2]), p: nd.map((n) => nodes.get(n)).filter(Boolean) });
}
const rels = [];
for (const m of src.matchAll(/<relation ([^>]*?)>([\s\S]*?)<\/relation>/g)) {
  const mem = [...m[2].matchAll(/<member type="(\w+)" ref="(\d+)" role="([^"]*)"\s*\/>/g)].map((q) => ({ type: q[1], ref: q[2], role: q[3] }));
  rels.push({ id: attr(m[1], 'id'), t: tagsOf(m[2]), mem });
}
const area = (p) => { let a = 0; for (let i = 0; i < p.length; i++) { const [x0, z0] = p[i], [x1, z1] = p[(i + 1) % p.length]; a += x0 * z1 - x1 * z0; } return a / 2; };
const cen = (p) => [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length];
const inside = (p, [x, z]) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, zi] = p[i], [xj, zj] = p[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
const ring = (w) => { let p = w.p.slice(); if (p.length > 2 && w.nd[0] === w.nd[w.nd.length - 1]) p.pop(); return p; };
const r1 = (v) => Math.round(v * 10) / 10;
const flat = (p) => p.flatMap(([x, z]) => [r1(x), r1(z)]);
const num = (v) => { if (v == null) return null; const f = parseFloat(String(v).replace(',', '.')); return Number.isFinite(f) ? f : null; };

// ---- buildings ----
const BOX = { x0: 470, x1: 1600, z0: -300, z1: 820 };
const SKIP_NAMES = /东方明珠|金茂大厦|上海环球金融中心|上海中心大厦/;      // the skyline's own models (world/skyline.js)
const out = [];
const cand = [];
for (const w of ways.values()) {
  const t = w.t;
  if (!(t.building || t['building:part'])) continue;
  if (t.building === 'roof' || t['building:part'] === 'roof' && !t.height) continue;
  if ((num(t.layer) ?? 0) < 0 || t.location === 'underground') continue;
  const p = ring(w); if (p.length < 3) continue;
  const c = cen(p); if (c[0] < BOX.x0 || c[0] > BOX.x1 || c[1] < BOX.z0 || c[1] > BOX.z1) continue;
  cand.push({ w, p, c, part: !!t['building:part'] && !t.building });
}
for (const r of rels) {                                                    // multipolygon buildings: their outer rings
  if (!(r.t.building && r.t.type === 'multipolygon')) continue;
  for (const m of r.mem) if (m.type === 'way' && m.role === 'outer' && ways.has(m.ref)) {
    const w = ways.get(m.ref), p = ring(w); if (p.length < 3) continue; const c = cen(p);
    if (c[0] < BOX.x0 || c[0] > BOX.x1 || c[1] < BOX.z0 || c[1] > BOX.z1) continue;
    cand.push({ w: { ...w, t: { ...r.t, ...w.t } }, p, c, part: false });
  }
}
const skipAreas = cand.filter((b) => !b.part && SKIP_NAMES.test(b.w.t.name || '')).map((b) => b.p);
const outlines = cand.filter((b) => !b.part), parts = cand.filter((b) => b.part);
for (const b of cand) {
  const t = b.w.t;
  if (skipAreas.some((s) => inside(s, b.c))) continue;
  const lv = num(t['building:levels']), h0 = num(t.height), minH = num(t.min_height) ?? (num(t['building:min_level']) != null ? num(t['building:min_level']) * 3.6 : 0);
  const hasParts = !b.part && parts.some((q) => inside(b.p, q.c));
  if (hasParts && h0 == null && lv == null) continue;                    // the parts draw it
  const kind = t.building || t['building:part'];
  let h = h0 ?? (lv != null ? lv * (kind === 'retail' || t.shop === 'mall' ? 4.6 : 3.7) : null), guessed = false, hs = h0 != null ? 'osm' : lv != null ? 'osm-levels' : '';
  if (h != null && RECALLED[t.name] && !h0 && t.shop === 'mall') { h = RECALLED[t.name]; hs = 'recalled'; }
  if (h == null) {                                                         // Wikidata: an item in (or by) the footprint
    let best = null, bd = 25;
    const tagged = t.wikidata && WD[t.wikidata], named = Object.entries(WD).find(([, e]) => t.name && (e.zh === t.name || (t['name:en'] && e.en === t['name:en'])));
    if (tagged && (tagged.height || tagged.floors)) best = { q: t.wikidata, e: tagged }; else if (named && (named[1].height || named[1].floors) && !b.part) best = { q: named[0], e: named[1] };
    if (!best) for (const [q, e] of Object.entries(WD)) { if (!(e.height || e.floors) || e.height > 400) continue; const pt = [X(e.lon), Z(e.lat)], d = inside(b.p, pt) ? 0 : Math.min(...b.p.map((v) => Math.hypot(v[0] - pt[0], v[1] - pt[1]))); if (d < bd && (d === 0 || !b.part)) { bd = d; best = { q, e }; } }
    if (best && Math.abs(area(b.p)) > 250) { h = best.e.height || best.e.floors * 4.3; hs = `wikidata:${best.q}`; }
  }
  if (h == null && RECALLED[t.name] != null) { h = RECALLED[t.name]; hs = 'recalled'; }
  if (h == null) {                                                          // a guess: deterministic by id, from size and place
    guessed = true; hs = 'guess'; const a = Math.abs(area(b.p)), rnd = ((+b.w.id * 2654435761) % 1000) / 1000;
    const core = b.c[0] > 780 && b.c[1] < 380;                              // the financial district north and east of the roundabout
    h = kind === 'tent' ? 6 : a < 250 ? 8 + rnd * 6 : kind === 'apartments' ? 70 + rnd * 40 : a < 600 ? 18 + rnd * 20 : core ? (a > 4000 ? 40 + rnd * 20 : 95 + rnd * 75) : (a > 4000 ? 30 + rnd * 15 : 45 + rnd * 50);
  }
  let p = b.p; if (area(p) < 0) p = p.slice().reverse();                  // anticlockwise in (x, z)
  out.push({ id: +b.w.id, n: t.name || '', en: t['name:en'] || t.alt_name || '', h: r1(h), min: r1(minH), kind, mat: t['building:material'] || t['building:facade:material'] || '', roof: t['roof:shape'] || '', part: b.part ? 1 : 0, g: guessed ? 1 : 0, hs, p: flat(p) });
}
out.sort((a, b) => a.id - b.id);

// ---- areas and points ----
const wayP = (id) => flat(ring(ways.get(String(id))));
const areas = {
  green: wayP(40779542),                                                   // 陆家嘴中心绿地 (leisure=park)
  pearlPark: wayP(47280263),                                               // 东方明珠公园
  island: wayP(165367190),                                                 // the roundabout's grass island
  applePlaza: wayP(166128036),                                             // the paved round plaza (highway=pedestrian area)
  appleStore: wayP(255624910),                                             // Lumen 浦东, level -2, underground
  ifcMall: wayP(526005642),                                                // 上海国金中心商场 (also among the buildings)
  ringBridge: flat(ways.get('48876367').p),                                // the Mingzhu Ring's centreline (bridge=yes footway)
};
const g = ring(ways.get('40779542'));
areas.lakes = [...ways.values()].filter((w) => w.t.natural === 'water' && w.p.length > 3 && inside(g, cen(ring(w)))).map((w) => flat(ring(w)));
const metro = {};
for (const n of ntags) if (n.t.railway === 'subway_entrance' && n.t.ref) metro[n.t.ref] = [r1(n.p[0]), r1(n.p[1])];

// a least-squares circle through points (Kasa): [cx, cz, r]
const fit = (p) => {
  let sx = 0, sz = 0, sxx = 0, szz = 0, sxz = 0, sxr = 0, szr = 0, sr = 0; const n = p.length, [mx, mz] = cen(p);
  for (const [x0, z0] of p) { const x = x0 - mx, z = z0 - mz, r = x * x + z * z; sx += x; sz += z; sxx += x * x; szz += z * z; sxz += x * z; sxr += x * r; szr += z * r; sr += r; }
  const A = [[sxx, sxz, sx], [sxz, szz, sz], [sx, sz, n]], B = [-sxr, -szr, -sr];
  const det = (M) => M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
  const D = det(A), sol = [0, 1, 2].map((k) => det(A.map((row, i) => row.map((v, j) => (j === k ? B[i] : v)))) / D);
  const cx = -sol[0] / 2, cz = -sol[1] / 2, r = Math.sqrt(cx * cx + cz * cz - sol[2]);
  return [r1(cx + mx), r1(cz + mz), r1(r)];
};
const rbt = [...ways.values()].filter((w) => w.t.junction === 'roundabout' && /陆家嘴环岛/.test(w.t.name || '')).flatMap((w) => w.p);
const points = { roundabout: fit(rbt), ring: fit(ways.get('48876367').p), applePlaza: fit(ring(ways.get('166128036'))), metro };

console.log(`// GENERATED by tools/osm/ljzosm.mjs: do not edit by hand.
// Lujiazui from OpenStreetMap: building footprints and heights, parks, water, the roundabout, the
// Mingzhu Ring, the Apple plaza and store, the metro's entrances, in the game's frame (x east, z south,
// metres; the Oriental Pearl Tower at (640, -42)). Extract of ${new Date().toISOString().slice(0, 10)}.
// Data © OpenStreetMap contributors, available under the Open Database Licence (ODbL 1.0):
// https://www.openstreetmap.org/copyright
// Buildings: { id: OSM way, n / en: names, h: top (m), min: base (m), kind, mat: facade material, roof,
// part: a building:part, g: height guessed (no height or levels in OSM), p: [x0, z0, x1, z1, ...] anticlockwise }
export const OSM_FRAME = { lat0: ${LAT0}, lon0: ${LON0}, kx: ${KX}, kz: ${KZ}, x0: 640, z0: -42 };
export const OSM_POINTS = ${JSON.stringify(points)};
export const OSM_AREAS = ${JSON.stringify(areas)};
export const OSM_BUILDINGS = [
${out.map((b) => '  ' + JSON.stringify(b)).join(',\n')},
];`);
console.error(`${out.length} buildings (${out.filter((b) => b.g).length} with guessed heights), ${areas.lakes.length} lakes, metro exits ${Object.keys(metro).join(',')}`);
