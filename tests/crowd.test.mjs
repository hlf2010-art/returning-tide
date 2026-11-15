// The evening crowd (src/engine/crowd.js) and the traffic mix (src/world/trafficMix.js): the walk network
// is all on walkable ground, people keep off the road except on the green man, nobody walks into a wall,
// tour groups stay together, buses get their stops, commuters get on and off. npm test.
import { createCrowd, buildNet, route, blocked, onRoad } from '../src/engine/crowd.js';
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
for (let f = 0; f < 30 * 180; f++) {
  const t = f / 30;
  c.setSignal(t % 60 < 20 ? 'walk' : 'dont', 1 / 30); c.setSignal(t % 50 < 18 ? 'walk' : 'dont', 1 / 30, 'henan');
  c.update(1 / 30, { player: { x: 17, z: -10 } });
  for (const a of c.agents) {
    if (a.gone) continue;
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
console.log(failed ? `\n${failed} FAILED` : '\nall passed'); process.exit(failed ? 1 : 0);
