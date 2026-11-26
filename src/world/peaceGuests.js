// The Peace Hotel hall's comings and goings (world/interiors.js runs it), after what the hotel and its visitors
// describe (docs/living-city-buildings.md):
//   - only staying guests and diners come in; sightseers come on the hotel's paid museum tours (10:00, 11:00, 14:00,
//     16:00), a guide leading a small group under the octagon's stained glass and to the peace dove
//   - the guests are mostly couples, then people on their own, families and friends together; a few on business
//   - check-out before noon, check-in from three: a bellman with his brass luggage cart, rolling cases
//   - breakfast (7:00-10:30) and afternoon tea (14:30-17:30) in the Jasmine Lounge; in the evening people dressed up
//     for the Jazz Bar; late at night guests coming back from the Bund
// Each group walks a route between the hall's places (the door, the front desk, the octagon, the dove, the lifts,
// the Jazz Bar's door), does what it came to do at each stop, and leaves: out through the revolving door, into the
// Jazz Bar, or up in the lifts. A group going up waits by the lifts and is gone the moment you look away; one
// coming down appears there only when you're not looking. The lounge's tables fill at mealtimes the same way.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createPerson } from './people.js';
import { createSeatedPose } from './driverPose.js';
import { dressReceptionist } from './outfits.js';

const W = (x, z) => ({ x, z });
// the hall's places (the octagon's pillars stand at 6.2 m round (-48, -229); routes pass between them)
const AT = {
  street: W(-48, -207.5), door: W(-48, -211.6), inside: W(-48, -215.5), hallW: W(-52.2, -221.0),
  desk: [W(-55.7, -226.8), W(-55.7, -228.4), W(-55.7, -230.0)], westAisle: W(-55.4, -236.0),
  lifts: [W(-52.6, -241.6), W(-51.4, -242.0), W(-44.4, -241.8), W(-43.4, -241.4)],
  liftCross: W(-48, -239.0), octIn: W(-48, -224.6), dome: W(-48, -225.4), dove: W(-46.4, -229.6), doveShot: W(-44.6, -230.4),
  jazzApproach: W(-47.4, -224.4), jazzFront: W(-44.0, -224.2), jazzIn: W(-44.0, -221.6),
  bellPost: W(-45.4, -214.2),
};
const BELL_HOME = { ...AT.bellPost, yaw: -2.6 };
// who they are: bodies from the cast (world/people.js), as they're dressed (casual, smart-casual, a suit)
const PEOPLE = {
  youngM: ['c6', 'p1', 'c7'], youngF: ['c1', 'c8', 'c2'], olderM: ['c5'], olderF: ['c3'], bizF: ['p5'], kid: ['k1', 'k2'],
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const CASES = [0x1c1c1e, 0x9aa0a6, 0x24324e, 0x6a1f24, 0xb8a27a];

export function createPeaceGuests({ scene, people, Y0, player, getMinute, getDay }) {
  const group = new THREE.Group(); group.name = 'peace-guests'; scene.add(group);
  if (!people) return { update() {}, actors: () => [], inDoor: () => false, group };
  const yawNow = () => player.yaw || 0;
  // would you see this spot just now? (in front of you within ~60 degrees and 24 m)
  const seen = (x, z, pp) => { const dx = x - pp.x, dz = z - pp.z, d = Math.hypot(dx, dz); if (d > 24) return false; if (d < 1.5) return true; const fx = -Math.sin(yawNow()), fz = -Math.cos(yawNow()); return (dx * fx + dz * fz) / d > 0.45; };

  // ---- props: a rolling case, the bellman's brass cart, the tour guide's flag ----
  const brass = new THREE.MeshStandardMaterial({ color: 0xc89b4a, roughness: 0.3, metalness: 1 });
  const black = new THREE.MeshStandardMaterial({ color: 0x111112, roughness: 0.5 });
  function suitcase(color, big = Math.random() < 0.6) {
    const g = new THREE.Group(), h = big ? 0.66 : 0.52, w = big ? 0.44 : 0.38, d = 0.26;
    const body = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, 0.04), new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.15 })); body.position.y = h / 2 + 0.05; g.add(body);
    for (const sx of [-1, 1]) { const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.36, 6), brass); rod.position.set(sx * 0.1, h + 0.22, -d / 2 + 0.03); g.add(rod); }
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.025, 0.03), black); grip.position.set(0, h + 0.41, -d / 2 + 0.03); g.add(grip);
    for (const sx of [-1, 1]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 10), black); wh.rotation.z = Math.PI / 2; wh.position.set(sx * (w / 2 - 0.05), 0.03, -d / 2 + 0.04); g.add(wh); }
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return g;
  }
  function cart() {
    const g = new THREE.Group(), red = new THREE.MeshStandardMaterial({ color: 0x6e1414, roughness: 0.9 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 1.0), red); base.position.y = 0.2; g.add(base);
    for (const sx of [-0.29, 0.29]) for (const sz of [-0.47, 0.47]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 14), black); wh.rotation.z = Math.PI / 2; wh.position.set(sx, 0.07, sz); g.add(wh); }
    for (const sz of [-0.48, 0.48]) {                                                  // the brass hoops at either end, the rail over the top
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.014, 6, 20, Math.PI), brass); hoop.position.set(0, 0.22, sz); g.add(hoop);
      for (const sx of [-0.3, 0.3]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.5, 8), brass); post.position.set(sx, 0.96, sz); g.add(post); }
    }
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.0, 8), brass); rail.rotation.x = Math.PI / 2; rail.position.set(0, 1.71, 0); g.add(rail);
    const load = [];
    for (let i = 0; i < 3; i++) { const c = suitcase(pick(CASES), i < 2); c.rotation.x = -Math.PI / 2; c.position.set(i === 2 ? 0 : (i ? 0.13 : -0.13), 0.36 + (i === 2 ? 0.27 : 0), -0.2 + i * 0.12); c.scale.setScalar(0.9); g.add(c); load.push(c); }
    g.userData.load = load;
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return g;
  }
  function flag() {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.9, 6), black); pole.position.y = 0.45; g.add(pole);
    const tri = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.26, 0.08), new THREE.Vector2(0, 0.16)]);
    const f = new THREE.Mesh(new THREE.ShapeGeometry(tri), new THREE.MeshStandardMaterial({ color: 0xd12a2a, side: THREE.DoubleSide, roughness: 0.8 })); f.position.y = 0.72; g.add(f);
    return g;
  }

  // ---- a person in a group: a body, what they carry, where they're headed ----
  const pool = new Map();   // role -> [idle person]
  function body(role) {
    const free = (pool.get(role) || []).pop();
    if (free) { free.root.visible = true; return free; }
    const p = createPerson(people, role); p.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); group.add(p.root); p.play('idle', 0);
    p.role = role;
    return p;
  }
  function release(p) { p.root.visible = false; p.setPhoneHold && p.setPhoneHold(0); p.play('idle', 0.1); if (!pool.has(p.role)) pool.set(p.role, []); pool.get(p.role).push(p); }

  // ---- the bellman: at his post inside the door; he brings a check-in's luggage on the cart to the lifts ----
  const bell = (() => {
    const p = createPerson(people, 'c7'); p.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); group.add(p.root);
    dressReceptionist(p, { scarf: false, badge: true });   // (a dark uniform, the gold badge)
    p.root.position.set(BELL_HOME.x, Y0, BELL_HOME.z); p.root.rotation.y = BELL_HOME.yaw; p.play('idle', 0);
    const c = cart(); c.visible = false; group.add(c);
    return { p, cart: c, busy: null };
  })();

  // ---- groups ----
  const groups = [];
  let nextT = 6, lastTour = -1;
  // a group: members [{ p, off: [side, back], bag }], a plan of steps
  function makeGroup(kind, roles, plan, opts = {}) {
    const members = roles.map((role, i) => ({ p: body(role), off: [((i % 2) ? 0.55 : 0) - (i > 1 ? 0.3 : 0), i === 0 ? 0 : 0.6 + Math.floor((i - 1) / 2) * 0.6], bag: null, extra: null }));
    const g = { kind, members, plan, step: 0, t: 0, leader: members[0], ...opts };
    groups.push(g);
    return g;
  }
  const place = (g, w) => { for (const m of g.members) { m.p.root.position.set(w.x + (Math.random() - 0.5) * 0.4, Y0, w.z + (Math.random() - 0.5) * 0.4); } };
  function endGroup(g) {
    for (const m of g.members) { if (m.bag) { m.bag.removeFromParent(); m.bag = null; } if (m.extra) { m.extra.removeFromParent(); m.extra = null; } release(m.p); }
    if (g.bellman) { bell.busy = null; bell.cart.visible = false; }
    groups.splice(groups.indexOf(g), 1);
  }
  // steps: { go: [waypoints], speed } | { stay: secs, face: {x,z}, act } | { vanishUnseen: true } | { gone: true }
  function walkMember(m, tx, tz, dt, speed) {
    const r = m.p.root, dx = tx - r.position.x, dz = tz - r.position.z, d = Math.hypot(dx, dz);
    if (d < 0.08) { if (m.p.state === 'walk') m.p.play('idle', 0.25); return true; }
    if (m.p.state !== 'walk') m.p.play('walk', 0.25);
    const st = Math.min(d, speed * dt); r.position.x += dx / d * st; r.position.z += dz / d * st;
    const want = Math.atan2(dx, dz); let dy = want - r.rotation.y; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; r.rotation.y += dy * Math.min(1, dt * 7);
    m.p.setGait(speed);
    return false;
  }
  const faceTo = (m, x, z, dt) => { const r = m.p.root, want = Math.atan2(x - r.position.x, z - r.position.z); let dy = want - r.rotation.y; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; r.rotation.y += dy * Math.min(1, dt * 3); };

  function stepGroup(g, dt, pp) {
    const s = g.plan[g.step]; if (!s) { endGroup(g); return; }
    g.t += dt;
    if (s.go) {
      // the leader walks the route; the rest keep their places behind and beside, turned with the leader
      const L = g.leader, w = s.go[g.wp || 0], speed = s.speed || 1.05;
      const done = walkMember(L, w.x, w.z, dt, speed);
      const yaw = L.p.root.rotation.y, fx = Math.sin(yaw), fz = Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      for (const m of g.members) if (m !== L) { const [side, back] = m.off; walkMember(m, L.p.root.position.x - fx * back + rx * side, L.p.root.position.z - fz * back + rz * side, dt, speed * 1.12); }
      if (done) { g.wp = (g.wp || 0) + 1; if (g.wp >= s.go.length) { g.wp = 0; g.step++; g.t = 0; } }
    } else if (s.stay != null) {
      const f = s.face;
      g.members.forEach((m, i) => {
        if (f) faceTo(m, f.x + (s.spread ? (i - 1) * 0.6 : 0), f.z, dt);
        const clip = s.act === 'talk' ? (i === 0 ? 'talk1' : 'idle') : s.act === 'guide' ? (i === 0 ? 'talk2' : (i % 3 === 1 ? 'look' : 'idle')) : 'idle';
        if (m.p.state !== clip) m.p.play(clip, 0.4);
        if (s.photo) m.p.setPhoneHold(i % 2 === 0 ? 1 : 0); else if (!m.keepPhone) m.p.setPhoneHold(0);
      });
      if (g.t >= s.stay) { g.step++; g.t = 0; for (const m of g.members) m.p.setPhoneHold(0); }
    } else if (s.vanishUnseen) {
      // waiting for the lift: gone once nobody's looking (or after a long wait when you're far off)
      g.members.forEach((m) => { faceTo(m, m.p.root.position.x, -246, dt); if (m.p.state !== 'idle') m.p.play('idle', 0.3); });
      if (g.t > (s.min || 6) && !g.members.some((m) => seen(m.p.root.position.x, m.p.root.position.z, pp))) { g.step++; g.t = 0; }
    } else { g.step++; }
    // what they carry follows them: a case rolled behind at the right hand; the bellman's cart pushed ahead
    for (const m of g.members) {
      if (m.bag) { const r = m.p.root, y = r.rotation.y; m.bag.position.set(r.position.x - Math.sin(y) * 0.45 - Math.cos(y) * 0.28, Y0, r.position.z - Math.cos(y) * 0.45 + Math.sin(y) * 0.28); m.bag.rotation.set(m.p.state === 'walk' ? -0.32 : 0, y, 0); }
      if (m.extra) { const r = m.p.root, y = r.rotation.y; m.extra.position.set(r.position.x - Math.cos(y) * 0.18, Y0 + 1.25, r.position.z + Math.sin(y) * 0.18); m.extra.rotation.y = y; }
    }
  }

  // ---- what happens, by the hour ----
  const desk = () => pick(AT.desk), liftSpot = () => pick(AT.lifts);
  const UP = (extra = []) => [...extra, { go: [AT.westAisle, liftSpot()], speed: 1.0 }, { vanishUnseen: true, min: 7 }];
  function spawn(kind, m, pp) {
    const H = Math.floor(m / 60);
    const couple = () => (Math.random() < 0.18 ? [pick(PEOPLE.olderM), pick(PEOPLE.olderF)] : [pick(PEOPLE.youngM), pick(PEOPLE.youngF)]);
    const family = () => [pick(PEOPLE.youngM), pick(PEOPLE.youngF), 'k1', ...(Math.random() < 0.45 ? ['k2'] : [])];
    const party = () => { const r = Math.random(); return r < 0.4 ? couple() : r < 0.62 ? [pick([...PEOPLE.youngM, ...PEOPLE.youngF])] : r < 0.82 ? family() : r < 0.92 ? [pick(PEOPLE.bizF)] : [pick(PEOPLE.youngF), pick(PEOPLE.youngF)]; };
    if (kind === 'checkin') {
      // in from the street with their cases, to the desk, then up; the bellman takes the luggage if he's free
      const roles = party(), useBell = !bell.busy && roles.length > 1;
      const g = makeGroup('checkin', roles, [{ go: [AT.door, AT.inside, AT.hallW, desk()] }, { stay: 26 + Math.random() * 20, face: { x: -58, z: -228.4 }, act: 'talk' }, ...UP()]);
      place(g, AT.street);
      if (useBell) { g.bellman = true; bell.busy = g; bell.cart.visible = true; }
      else g.members.forEach((mm, i) => { if (i < 2 && mm.p.role[0] !== 'k') { mm.bag = suitcase(pick(CASES)); group.add(mm.bag); } });
    } else if (kind === 'checkout') {
      // down from the lifts (only where you're not looking), to the desk to settle, out through the door
      if (AT.lifts.some((w) => seen(w.x, w.z, pp))) return false;
      const roles = party();
      const g = makeGroup('checkout', roles, [{ go: [AT.westAisle, desk()] }, { stay: 18 + Math.random() * 14, face: { x: -58, z: -228.4 }, act: 'talk' }, { go: [AT.hallW, AT.inside, AT.door, AT.street] }]);
      place(g, liftSpot());
      g.members.forEach((mm, i) => { if (i < 2 && mm.p.role[0] !== 'k') { mm.bag = suitcase(pick(CASES)); group.add(mm.bag); } });
    } else if (kind === 'tour') {
      // the museum tour: a guide with a little flag, a handful following; the dome, the dove (photos), then upstairs
      const roles = ['c2', pick(PEOPLE.olderM), pick(PEOPLE.olderF), pick(PEOPLE.youngF), pick(PEOPLE.youngM)];
      const g = makeGroup('tour', roles, [{ go: [AT.door, AT.inside, AT.octIn], speed: 0.85 }, { stay: 30, face: AT.dome, act: 'guide', spread: true }, { go: [AT.doveShot], speed: 0.8 }, { stay: 22, face: AT.dove, photo: true }, { go: [AT.liftCross, liftSpot()], speed: 0.85 }, { vanishUnseen: true, min: 5 }]);
      place(g, AT.street);
      g.members[0].extra = flag(); group.add(g.members[0].extra);
    } else if (kind === 'photo') {
      // a couple come in to see the hall: a photo under the dome, one at the dove, then away
      const roles = couple();
      const g = makeGroup('photo', roles, [{ go: [AT.door, AT.inside, AT.octIn], speed: 0.9 }, { stay: 10, face: AT.dome }, { go: [AT.doveShot], speed: 0.8 }, { stay: 16, face: AT.dove, photo: true }, { go: [AT.octIn, AT.inside, AT.door, AT.street] }]);
      place(g, AT.street);
    } else if (kind === 'jazz') {
      // dressed for the evening, to the Jazz Bar's door
      const roles = couple();
      const g = makeGroup('jazz', roles, [{ go: [AT.door, AT.inside, AT.jazzApproach, AT.jazzFront, AT.jazzIn], speed: 0.95 }]);
      place(g, AT.street);
    } else if (kind === 'back') {
      // back from the Bund, up to bed
      const roles = Math.random() < 0.6 ? couple() : [pick([...PEOPLE.youngM, ...PEOPLE.youngF])];
      const g = makeGroup('back', roles, [{ go: [AT.door, AT.inside, AT.hallW] }, ...UP()]);
      place(g, AT.street);
    } else if (kind === 'out') {
      // out for the day or the evening: down and through the door
      if (AT.lifts.some((w) => seen(w.x, w.z, pp))) return false;
      const roles = party();
      const g = makeGroup('out', roles, [{ go: [AT.westAisle, AT.hallW, AT.inside, AT.door, AT.street] }]);
      place(g, liftSpot());
    }
    void H;
    return true;
  }
  // how often, by the hour (seconds between groups; real seconds in the hall) and what's likely
  function schedule(m) {
    const h = m / 60;
    if (h >= 7 && h < 10) return { every: 34, kinds: [['out', 3], ['checkout', 1], ['back', 1]] };
    if (h >= 10 && h < 12) return { every: 20, kinds: [['checkout', 5], ['out', 2], ['photo', 2]] };
    if (h >= 12 && h < 15) return { every: 36, kinds: [['photo', 3], ['out', 2], ['checkin', 1], ['back', 1]] };
    if (h >= 15 && h < 18) return { every: 18, kinds: [['checkin', 6], ['photo', 2], ['out', 1]] };
    if (h >= 18 && h < 21) return { every: 22, kinds: [['jazz', 4], ['out', 2], ['checkin', 2], ['back', 1], ['photo', 1]] };
    if (h >= 21 && h < 23.5) return { every: 28, kinds: [['back', 4], ['jazz', 2]] };
    return { every: 150, kinds: [['back', 1]] };
  }
  const weighted = (kinds) => { const tot = kinds.reduce((a, k) => a + k[1], 0); let r = Math.random() * tot; for (const [k, w] of kinds) { if ((r -= w) <= 0) return k; } return kinds[0][0]; };

  // ---- the Jasmine Lounge at mealtimes: people at the tables (breakfast, afternoon tea, an evening drink) ----
  const TABLES = [[-38.2, -230], [-38.4, -234.5], [-38.2, -238], [-41.5, -232], [-41.6, -236.4]];
  const seats = [];
  const teaMat = new THREE.MeshPhysicalMaterial({ color: 0xf6f4ee, roughness: 0.15, clearcoat: 1 });
  for (const [k, [tx, tz]] of TABLES.entries()) {
    const sets = [];
    for (const [s, yaw] of [[1, Math.PI], [-1, 0]]) {
      const frame = new THREE.Group(); frame.position.set(tx, Y0, tz + s * 0.85); frame.rotation.y = yaw; group.add(frame); frame.visible = false;
      sets.push({ frame, p: null, pose: null });
    }
    const things = new THREE.Group(); things.visible = false; group.add(things);
    const pot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), teaMat); pot.position.set(tx + 0.1, Y0 + 0.82, tz); things.add(pot);
    for (const dz of [-0.22, 0.22]) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.028, 0.05, 14), teaMat); cup.position.set(tx - 0.05, Y0 + 0.785, tz + dz); things.add(cup); const sauc = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.008, 16), teaMat); sauc.position.set(tx - 0.05, Y0 + 0.764, tz + dz); things.add(sauc); }
    const stand = new THREE.Group(); stand.position.set(tx - 0.18, Y0 + 0.76, tz); things.add(stand);   // the tiered stand of afternoon tea
    for (const [y, r] of [[0.04, 0.12], [0.16, 0.1], [0.27, 0.08]]) { const pl = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.9, 0.01, 18), teaMat); pl.position.y = y; stand.add(pl); }
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.32, 6), brass); rod.position.y = 0.16; stand.add(rod);
    seats.push({ k, sets, things, on: false, kind: null });
  }
  function seatPerson(set, role) {
    const p = createPerson(people, role); p.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); set.frame.add(p.root); p.play('idle', 0); p.update(0);
    set.p = p; set.pose = createSeatedPose(p, { recline: 0.06, elbows: 0.45 });
    const hands = { x: 0.15, y: 0.66, z: 0.27 };
    set.cabin = { hip: new THREE.Vector3(0, 0.53, -0.04), pedals: [new THREE.Vector3(0.13, 0.05, 0.5), new THREE.Vector3(-0.13, 0.05, 0.5)],
      rimPoint(a, out) { const w = new THREE.Vector3(-a * hands.x, hands.y, hands.z); set.frame.localToWorld(w); return out.copy(w); } };
  }
  function lounge(m, pp) {
    const h = m / 60, want = h >= 7 && h < 10.5 ? 2 : h >= 14.5 && h < 17.5 ? 3 : h >= 19 && h < 22 ? 1 : 0;
    const on = seats.filter((t) => t.on).length;
    // tables change only where you're not looking
    if (on < want) { const t = seats.find((q) => !q.on && !seen(TABLES[q.k][0], TABLES[q.k][1], pp)); if (t) {
      t.on = true; const pair = Math.random() < 0.75;
      const roles = Math.random() < 0.25 ? [pick(PEOPLE.olderM), pick(PEOPLE.olderF)] : [pick(PEOPLE.youngF), pick([...PEOPLE.youngM, ...PEOPLE.youngF, ...PEOPLE.bizF])];
      t.sets.forEach((st, i) => { if (i === 1 && !pair) return; if (!st.p) seatPerson(st, roles[i]); st.frame.visible = true; });
      t.things.visible = true; t.things.children[t.things.children.length - 1].visible = h >= 14.5 && h < 17.5;
    } }
    if (on > want) { const t = seats.find((q) => q.on && !seen(TABLES[q.k][0], TABLES[q.k][1], pp)); if (t) { t.on = false; t.things.visible = false; for (const st of t.sets) { st.frame.visible = false; if (st.p) { st.p.root.removeFromParent(); st.p = null; } } } }
  }

  // ---- the bellman's own walk with the cart ----
  function updateBell(dt) {
    const p = bell.p, r = p.root, g = bell.busy;
    let target = BELL_HOME;
    if (g && groups.includes(g)) { const L = g.leader.p.root.position, y = g.leader.p.root.rotation.y; target = { x: L.x - Math.sin(y) * 1.1 + Math.cos(y) * 0.7, z: L.z - Math.cos(y) * 1.1 - Math.sin(y) * 0.7 }; }
    else if (g) { bell.busy = null; bell.cart.visible = false; }
    const dx = target.x - r.position.x, dz = target.z - r.position.z, d = Math.hypot(dx, dz);
    if (d > 0.12) { if (p.state !== 'walk') p.play('walk', 0.25); const st = Math.min(d, 1.15 * dt); r.position.x += dx / d * st; r.position.z += dz / d * st; let dy = Math.atan2(dx, dz) - r.rotation.y; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; r.rotation.y += dy * Math.min(1, dt * 6); p.setGait(1.1); }
    else { if (p.state !== 'idle') p.play('idle', 0.3); if (!g) { let dy = BELL_HOME.yaw - r.rotation.y; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; r.rotation.y += dy * Math.min(1, dt * 2); } }
    if (bell.cart.visible) { const y = r.rotation.y; bell.cart.position.set(r.position.x + Math.sin(y) * 0.85, Y0, r.position.z + Math.cos(y) * 0.85); bell.cart.rotation.y = y; }
  }

  return {
    group,
    // anyone of theirs in the revolving door (it turns for them)
    inDoor(test) { return groups.some((g) => g.members.some((m) => test(m.p.root.position.x, m.p.root.position.z))); },
    // for the staff's manners: who's coming up to them
    actors() { const out = []; groups.forEach((g, gi) => g.members.forEach((m, i) => { if (i === 0) out.push({ id: `g${gi}:${g.kind}`, x: m.p.root.position.x, z: m.p.root.position.z }); })); return out; },
    get count() { return groups.length; },
    update(dt, pp) {
      const m = getMinute(), inHall = pp.y < Y0 + 4 && pp.z < -200 && pp.z > -255 && pp.x > -64 && pp.x < -30;
      group.visible = inHall || (pp.z < -195 && pp.z > -260 && pp.y < Y0 + 4);
      if (!group.visible) return;
      // a museum tour on the hour at 10, 11, 14 and 16
      const H = Math.floor(m / 60), mm = m % 60, day = getDay();
      if ([10, 11, 14, 16].includes(H) && mm < 6 && lastTour !== day * 100 + H && groups.length < 6) { lastTour = day * 100 + H; spawn('tour', m, pp); }
      nextT -= dt;
      if (nextT <= 0) { const sc = schedule(m); nextT = sc.every * (0.6 + Math.random() * 0.8); if (groups.length < 5) spawn(weighted(sc.kinds), m, pp); }
      for (const g of groups.slice()) stepGroup(g, dt, pp);
      for (const g of groups) for (const m2 of g.members) m2.p.update(dt, null);
      updateBell(dt); bell.p.update(dt, null);
      lounge(m, pp);
      for (const t of seats) if (t.on) for (const st of t.sets) if (st.p && st.frame.visible) { st.p.update(dt, null); st.frame.updateMatrixWorld(true); st.pose(st.cabin, st.frame); }
    },
  };
}
