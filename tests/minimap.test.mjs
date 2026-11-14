// Minimap visibility (src/engine/minimapLogic.js). npm test.
import { createMinimapState, updateMinimap, zoneAt, MAP } from '../src/engine/minimapLogic.js';
import { L } from '../src/world/layout.js';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const run = (s, secs, ctx) => { let flips = 0, last = s.shown; for (let t = 0; t < secs; t += 0.1) { updateMinimap(s, 0.1, ctx); if (s.shown !== last) { flips++; last = s.shown; } } return flips; };
{
  const s = createMinimapState();
  run(s, 10, { zone: 'hankou' });
  ok(!s.shown, 'standing still with nothing to do: no map');
  run(s, 3, { zone: 'hankou', objective: true, moving: true });
  ok(s.shown, 'on the way to a mission target: map');
  run(s, MAP.idleHide + 2, { zone: 'hankou', objective: true, moving: false });
  ok(!s.shown, 'stop for a while, even mid-mission: it steps aside');
  run(s, 2, { zone: 'hankou', objective: true, moving: true });
  ok(s.shown, 'walk on: back');
  run(s, 0.5, { mode: 'dialogue', zone: 'hankou', objective: true, moving: false });
  ok(!s.shown, 'in a conversation: gone at once');
  const t = createMinimapState(); run(t, 3, { zone: 'hankou' }); run(t, 2, { zone: 'zhongshan', moving: true });
  ok(t.shown, 'walking into a new area: it shows where you are');
  run(t, MAP.zoneShow + 2, { zone: 'zhongshan', moving: false });
  ok(!t.shown, '... then fades once you are standing about');
  const u = createMinimapState(); run(u, 1, { zone: 'hankou', held: true });
  ok(u.shown, 'hold the map key: always');
  // no flicker: walking with stop-start steps on a mission does not toggle it
  const v = createMinimapState(); let flips = 0;
  for (let k = 0; k < 40; k++) { flips += run(v, 0.6, { zone: 'hankou', objective: true, moving: true }); flips += run(v, 0.4, { zone: 'hankou', objective: true, moving: false }); }
  ok(flips <= 1, `stop-start walking does not make it flicker (${flips} change)`);
  ok(zoneAt(-60, 0, L) === 'hankou' && zoneAt(15, 0, L) === 'promenade' && zoneAt(-16, 0, L) === 'zhongshan', 'areas: Hankou Road, Zhongshan East 1st Road, the promenade');
}
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
