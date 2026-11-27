// The evening crowd (src/engine/crowd.js) and the traffic mix (src/world/trafficMix.js): the walk network
// is all on walkable ground, people keep off the road except on the green man, nobody walks into a wall,
// tour groups stay together, buses get their stops, commuters get on and off. npm test.
import { createCrowd, buildNet, route, blocked, onRoad, nearRank, viewCos, NEAR_RANK } from '../src/engine/crowd.js';
import { trafficSpecs, BUS_STOPS, stopS } from '../src/world/trafficMix.js';
import { crossing, metroGround, METRO, METRO_DEPTH, groundHeight, NJ } from '../src/world/layout.js';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const net = buildNet();
ok(net.nodes.every((n) => route(net, net.nodes[0].id, n.id)), `every one of the ${net.nodes.length} walk nodes is reachable from every other`);
ok(net.nodes.every((n) => !blocked(n.x, n.z, 0.1)), 'no node stands inside a building, wall, planter or barrier');
ok(net.nodes.filter((n) => !n.id.startsWith('M') || n.id.endsWith('t')).every((n) => !onRoad(n.x, n.z)), 'no node is on a carriageway');
ok(net.rail.length >= 30, `${net.rail.length} photo spots along the river railing`);
// the metro stairs: the ground goes down to the landing
for (const m of METRO) {
  ok(Math.abs(groundHeight(m.top + Math.sign(m.top - m.bottom) * 0.5, (m.z0 + m.z1) / 2, 0.15) - 0.15) < 0.01 && Math.abs(metroGround(m.bottom, (m.z0 + m.z1) / 2) + METRO_DEPTH) < 0.01, `Exit ${m.exit}: street level at the top, ${METRO_DEPTH} m down at the landing`);
}
ok(Math.abs(groundHeight(NJ.henan.xc, NJ.zc, 0)) < 0.01 && Math.abs(groundHeight(-300, NJ.zc, 0) - 0.15) < 0.01, 'Henan Road is a carriageway; Nanjing Road is paved at kerb height (pedestrian)');
// a 3-minute evening at 30 fps
const c = createCrowd({ density: 1, rnd, roles: ['p1', 'p2', 'p3', 'p4', 'p5'] });
ok(c.agents.length >= 200 && c.tours.length >= 2, `${c.agents.length} people, ${c.tours.length} tour groups at medium detail`);
let inside = 0, redRoad = 0, crossed = 0, maxSpread = 0, rail = 0, waited = 0;
// stuck: wanting to walk (walking or crossing, or following someone who is on the move) and going
// nowhere (by where they actually got to, not the velocity they want) for more than 2 s
const still = new Map(), stuckAt = [];
for (let f = 0; f < 30 * 180; f++) {
  const t = f / 30;
  c.setSignal(t % 60 < 20 ? 'walk' : 'dont', 1 / 30); c.setSignal(t % 50 < 18 ? 'walk' : 'dont', 1 / 30, 'henan');
  for (const a of c.agents) { a._px = a.x; a._pz = a.z; }
  c.update(1 / 30, { player: { x: 17, z: -10 } });
  for (const a of c.agents) a._sp = Math.hypot(a.x - a._px, a.z - a._pz) * 30;
  for (const a of c.agents) {
    if (a.gone || a.inside) continue;                                    // (in a shop on Nanjing Road: out of sight, behind its doorway)
    const boss = a.kind === 'follower' ? a.group.guide : a.leader;
    if (t > 5 && (a.state === 'walk' || a.state === 'cross') && (!boss || boss._sp > 0.3) && a._sp < 0.12) {
      const s0 = (still.get(a) || 0) + 1 / 30; still.set(a, s0);
      if (s0 > 2 && s0 - 1 / 30 <= 2) stuckAt.push(`${a.kind} ${a.x.toFixed(1)},${a.z.toFixed(1)}`);
    } else still.delete(a);
    if (blocked(a.x, a.z, 0)) inside++;
    if (a.x > -100 && t % 60 > 32 && onRoad(a.x, a.z)) redRoad++;
    if (a.state === 'cross') crossed++;
    if (a.state === 'act' && a.x > 23) rail++;
    if (a.state === 'bus') waited++;
  }
  for (const g of c.tours) if (!g.guide.gone && g.guide.state === 'walk') for (const m of g.members) if (!m.gone) maxSpread = Math.max(maxSpread, Math.hypot(m.x - g.guide.x, m.z - g.guide.z));
}
ok(inside === 0, 'nobody ever stands inside a wall, a planter, a building or the railing');
ok(redRoad === 0, 'nobody is on Zhongshan Road 12 s into the red');
ok(crossed > 1000, 'people cross on the green man');
ok(rail > 1000, 'people stop at the railing for photos');
ok(maxSpread < 15, `tour groups stay together behind the guide (furthest ${maxSpread.toFixed(1)} m)`);
ok(waited > 0, 'commuters wait at the bus stops');
ok(stuckAt.length === 0, `nobody stands pinned (against a kerb, a planter, a wall, each other) wanting to walk for more than 2 s: ${stuckAt.length}${stuckAt.length ? ` (${stuckAt.slice(0, 4).join('; ')})` : ''}`);
ok(c.stats.bumps / 3 < 40, `people mostly see each other coming: ${(c.stats.bumps / 3).toFixed(0)} contacts a minute among ${c.count()} (it was ~120 when they only reacted at arm's length)`);
const st = BUS_STOPS[0], door = { x: -28.6, z: st.z };
for (const a of c.agents) if (a.kind === 'commuter' && !a.gone) { a.state = 'bus'; a.busStop = st.id; a.wait = 99; break; }
ok(c.board(st.id, door) >= 1, 'a bus at the stop takes on whoever was waiting');
{ const idle = c.agents.find((a) => !a.gone && a.kind === 'local' && !a.partner && !a.leader); idle.gone = true; idle.hold = 5; }
ok(c.alight(st.id, door, 2) >= 1, 'and lets people off');
// traffic mix
const mix = trafficSpecs(1, rnd), byLane = {};
ok(mix.length >= 20 && mix.filter((v) => v.bus).length >= 2, `${mix.length} vehicles at medium, ${mix.filter((v) => v.bus).length} of them buses`);
for (const v of mix) (byLane[v.lane] = byLane[v.lane] || []).push(v);
ok(Object.values(byLane).every((l) => l.sort((a, b) => b.s - a.s).every((v, i) => !i || l[i - 1].s - l[i - 1].len - v.s > 4)), 'nobody starts overlapping anybody in their lane');
ok(mix.filter((v) => v.bus).every((v) => ['sb2', 'nb2'].includes(v.lane)), 'buses run in the kerbside lanes');
ok(trafficSpecs(1.7, rnd).length > trafficSpecs(0.6, rnd).length, 'more traffic at higher detail');
ok(BUS_STOPS.every((s) => (s.dir > 0 ? stopS(s) - 12 <= s.z + 6 : true)) && BUS_STOPS.length === 4, 'four stops: Hankou Road and Nanjing Road, both directions');
ok(crossing.vehicles.every((v) => mix.find((m) => m.id === v.id)), "the crossing's own seven are all still there");
// families: with child avatars in the set, some walkers are two parents and a child, who stays by them
{
  let sd = 3; const r2 = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  const f = createCrowd({ density: 0.6, rnd: r2, roles: ['p1', 'p2', 'p3', 'c1', 'k1', 'k2'] });
  const kids = f.agents.filter((a) => a.child);
  ok(kids.length >= 3 && kids.every((k) => /^k/.test(k.role) && k.leader && k.leader.partner), `${kids.length} children, each with two parents`);
  ok(f.agents.filter((a) => !a.child).every((a) => !/^k/.test(a.role)), 'no child walks about on their own');
  const pairs = f.agents.filter((a) => a.partner && !a.leader);
  ok(pairs.length > 5 && pairs.every((a) => a.partner.role !== a.role), `${pairs.length} couples, none of them the same avatar twice`);
  let far = 0, n = 0, together = true;
  for (let i = 0; i < 30 * 60; i++) {
    f.update(1 / 30, {});
    for (const k of kids) {
      if (k.gone !== k.leader.gone) together = false;
      if (!k.gone && k.leader.state === 'walk') { n++; if (Math.hypot(k.x - k.leader.x, k.z - k.leader.z) > 2.5) far++; }
    }
  }
  ok(together && far / Math.max(1, n) < 0.03, `children keep within 2.5 m of their parent (${(100 * far / Math.max(1, n)).toFixed(1)}% of moments apart) and leave with them`);
}
// who becomes a full person: the nearest, but those in view first (world/crowdView.js)
{
  const cos = viewCos(68, 16 / 9);
  const ahead = nearRank(10, 0, 1, 0, cos), behind = nearRank(-10, 0, 1, 0, cos), side = nearRank(0, 10, 1, 0, cos), close = nearRank(-2, 0, 1, 0, cos);
  ok(ahead === 10 && behind === 10 * NEAR_RANK.behind && close === 2, `in view ranks by distance (${ahead}); behind you counts ${NEAR_RANK.behind}x as far (${behind}); within ${NEAR_RANK.always} m, any direction counts as near (${close})`);
  const edgeIn = nearRank(10 * Math.cos(1.2), 10 * Math.sin(1.2), 1, 0, cos) === 10, edgeOut = nearRank(10 * Math.cos(1.5), 10 * Math.sin(1.5), 1, 0, cos) > 10;   // 69 degrees off: in; 86: out
  ok(cos < Math.cos(Math.atan(Math.tan(34 * Math.PI / 180) * 16 / 9)) && edgeIn && edgeOut && side > 10, `the cone is a little wider than the view (half-width ${(Math.acos(cos) * 180 / Math.PI).toFixed(0)} degrees for a 68-degree, 16:9 camera)`);
  ok(nearRank(-10, 0, 0, 0, cos) === 10 && nearRank(-10, 0, 1, 0, cos, 12) === 12 * NEAR_RANK.behind, 'looking straight up or down: everyone ranks by distance; a given distance (height counted) is the one ranked');
  // a crowd mostly behind the camera: the nearest 16 by distance alone are all behind; by view, the ones in view come first
  const ppl = [...Array.from({ length: 30 }, (_, i) => ({ dx: -(4 + i * 0.3), dz: (i % 5) - 2 })), ...Array.from({ length: 8 }, (_, i) => ({ dx: 8 + i, dz: (i % 3) - 1 }))];
  const top = (score) => ppl.map((p) => [score(p), p]).sort((a, b) => a[0] - b[0]).slice(0, 16).filter(([, p]) => p.dx > 0).length;
  const byDist = top((p) => Math.hypot(p.dx, p.dz)), byView = top((p) => nearRank(p.dx, p.dz, 1, 0, cos));
  ok(byDist <= 1 && byView === 8, `a crowd mostly behind you: in view among the 16 full people, ${byDist} by distance alone, ${byView} by view`);
}
// the Bund's two moments: the floods coming on (phones go up on the deck), and 22:00 (the railing empties)
{
  let s3 = 11; const r3 = () => ((s3 = (s3 * 16807) % 2147483647) / 2147483647);
  const k = createCrowd({ density: 1.5, rnd: r3, roles: ['p1', 'p2', 'p3', 'p4', 'p5'] });
  k.setActive(1, { instant: true });
  for (let i = 0; i < 1800; i++) k.update(1 / 30, { player: { x: -300, z: 0 }, signal: 'walk' });
  const deckWalkers = k.agents.filter((a) => !a.gone && a.state === 'walk' && a.x > 9 && a.x < 26).length;
  const stopped = k.floodsOn({ share: 0.5, r: r3 });
  ok(deckWalkers > 5 && stopped > 0 && stopped <= deckWalkers, `floods on: ${stopped} of ${deckWalkers} walkers on the deck stop to photograph the lights`);
  for (let i = 0; i < 60; i++) k.update(1 / 30, { player: { x: -300, z: 0 }, signal: 'walk' });
  const shooting = k.agents.filter((a) => !a.gone && a.state === 'act' && (a.act === 'photo' || a.act === 'selfie') && a.x > 9).length;
  ok(shooting > 0, `and they're photographing (${shooting} with a phone up)`);
  for (let i = 0; i < 900; i++) k.update(1 / 30, { player: { x: -300, z: 0 }, signal: 'walk' });
  const atRail = k.agents.filter((a) => !a.gone && a.atRail && a.state === 'act');
  const n = k.lightsOut(r3);
  ok(n === atRail.length && atRail.every((a) => a.wait <= 303 && a.act !== 'photo' && a.act !== 'selfie'), `22:00: all ${n} at the railing lower their phones and leave within five minutes`);
  const left = new Set();
  for (let i = 0; i < 30 * 310; i += 3) { k.update(0.1, { player: { x: -300, z: 0 }, signal: 'walk' }); for (const a of atRail) if (a.gone || !a.atRail) left.add(a); }
  ok(atRail.every((a) => left.has(a)), `within five minutes every one of them has left the railing (${left.size} of ${atRail.length}; some may come back later as new visitors)`);
}

// everyone their own (2026-11-27): bodies shared out evenly, a couple or a group never two of the same body,
// and each person dressed in their own look (world/crowdLooks.js)
{
  const ALL = ['p1', 'p2', 'p3', 'p4', 'p5', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'k1', 'k2', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9', 'n10', 'e1', 'e2', 't1'];
  let sd = 11; const r4 = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  const v = createCrowd({ density: 1, rnd: r4, roles: ALL });
  const use = new Map(); for (const a of v.agents) use.set(a.role, (use.get(a.role) || 0) + 1);
  const grown = v.agents.filter((a) => !a.child), top = Math.max(...use.values());
  ok(use.size >= 26 && top / grown.length < 0.08, `${use.size} different bodies in a crowd of ${v.agents.length}; the most worn is ${top} (${(100 * top / grown.length).toFixed(1)}%)`);
  ok(v.agents.filter((a) => a.partner).every((a) => a.partner.role !== a.role), 'no couple are the same body');
  let same = 0; for (let i = 1; i < v.agents.length; i++) if (v.agents[i].role === v.agents[i - 1].role) same++;
  ok(same === 0, 'people made one after another (a tour group, a family) never share a body');
  const { makeLook } = await import('../src/world/crowdLooks.js');
  const L = v.agents.slice(0, 200).map((a) => makeLook(a, { sex: ['p2', 'p5', 'c1', 'c2', 'c3', 'c4', 'c8', 'k1', 'n1', 'n2', 'n3', 'n4', 'n5'].includes(a.role) ? 'f' : 'm', elder: /^e/.test(a.role), teen: a.role === 't1', child: !!a.child }));
  const tops = new Set(L.filter((l) => l.top[3]).map((l) => l.top.slice(0, 3).map((x) => x.toFixed(3)).join()));
  const blacks = L.filter((l) => l.top[3] && Math.max(...l.top.slice(0, 3)) < 0.02).length;
  ok(tops.size >= 14 && blacks / L.length < 0.2, `200 people wear ${tops.size} different tops; ${blacks} in black`);
  const acc = (k) => L.filter((l) => l.acc[k]).length;
  ok(acc('scarf') > 10 && acc('glasses') > 10 && acc('bag') > 20 && acc('hat') > 5 && acc('mask') > 2, `scarves ${acc('scarf')}, glasses ${acc('glasses')}, bags ${acc('bag')}, hats ${acc('hat')}, masks ${acc('mask')} among 200`);
  ok(L.every((l) => l.h > 0.9 && l.h < 1.06 && l.w > 0.9 && l.w < 1.12), 'heights and builds stay within a person (0.9-1.06 tall, 0.9-1.12 wide)');
  const again = makeLook(v.agents[5], { sex: 'm' }), first = makeLook(v.agents[5], { sex: 'm' });
  ok(JSON.stringify(again) === JSON.stringify(first), 'a look is the same every time for the same person (every tier draws them alike)');
}
console.log(failed ? `\n${failed} FAILED` : '\nall passed'); process.exit(failed ? 1 : 0);
