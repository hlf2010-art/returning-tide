// One target at a time: reach, view cone, line of sight, and the real waterfront layout.
import { pickTarget, segmentHitsBox } from '../src/engine/targeting.js';
import { colliders, npcs, L } from '../src/world/layout.js';

let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const look = (eye, t) => { const dx = t.x - eye.x, dy = t.y - eye.y, dz = t.z - eye.z, l = Math.hypot(dx, dy, dz); return { x: dx / l, y: dy / l, z: dz / l }; };
const C = (id, x, y, z, extra = {}) => ({ id, x, y, z, reach: 3.6, cone: 0.75, ...extra });

{ // basics
  const eye = { x: 0, y: 1.7, z: 0 };
  const a = C('a', 0, 1.5, -2), b = C('b', 0.6, 1.5, -2.2);
  ok(pickTarget(eye, look(eye, a), [a, b])?.id === 'a', 'looking at A picks A, even with B close by');
  ok(pickTarget(eye, look(eye, b), [a, b])?.id === 'b', 'turning to B switches to B');
  ok(pickTarget(eye, { x: 0, y: 0, z: 1 }, [a, b]) === null, 'looking away: nothing');
  ok(pickTarget(eye, look(eye, a), [{ ...a, z: -5 }]) === null, 'out of reach: nothing');
  ok(pickTarget(eye, look(eye, a), [{ ...a, y: 5 }]) === null, 'a different level: nothing');
  const wall = { minX: -2, maxX: 2, minZ: -1.1, maxZ: -0.9, tag: 'wall' };
  ok(pickTarget(eye, look(eye, a), [a], [wall]) === null, 'a wall between: nothing (no interacting through walls)');
  ok(pickTarget(eye, look(eye, a), [a], [{ ...wall, tag: 'bench' }])?.id === 'a', 'low furniture between: still reachable');
  const body = { minX: -0.3, maxX: 0.3, minZ: -2.3, maxZ: -1.7, tag: 'npc', id: 'a' };
  ok(pickTarget(eye, look(eye, a), [{ ...a, ignore: ['a'] }], [body])?.id === 'a', "a target's own body does not hide it");
  ok(segmentHitsBox(0, 0, 0, -2, { minX: -1, maxX: 1, minZ: -2.1, maxZ: -1.9 }, 0.25) === false, 'the last 25 cm before the target are not tested (its own support)');
  // never two at once, whatever the candidates
  let multi = 0;
  for (let i = 0; i < 2000; i++) {
    const cands = Array.from({ length: 4 }, (_, k) => C(`c${k}`, Math.random() * 4 - 2, 1 + Math.random(), -0.5 - Math.random() * 3));
    const r = pickTarget(eye, { x: 0, y: -0.1, z: -1 }, cands);
    if (r && cands.filter((c) => c.id === r.id).length !== 1) multi++;
  }
  ok(multi === 0, 'always exactly one result or none');
}

{ // the real promenade: Ms. Su stands between the player and Old Lin from the south-east
  const lin = npcs.list.find((n) => n.id === 'lin');
  const T = C('lin', lin.x, L.deckY + 1.6, lin.z, { ignore: ['lin'] });
  const behindSu = { x: 24.1, y: L.deckY + 1.68, z: -12.5 };
  ok(pickTarget(behindSu, look(behindSu, T), [T], colliders) === null, 'Old Lin hidden behind Ms. Su: no prompt');
  const aside = { x: 22.2, y: L.deckY + 1.68, z: -13.0 };
  ok(pickTarget(aside, look(aside, T), [T], colliders)?.id === 'lin', 'step aside: Old Lin is targetable');
  const westOfPair = { x: 21.8, y: L.deckY + 1.68, z: -15.0 };
  ok(pickTarget(westOfPair, look(westOfPair, T), [T], colliders)?.id === 'lin', 'from the usual spot west of the pair: targetable');
}
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
