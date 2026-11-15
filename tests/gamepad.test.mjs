// The gamepad mapping (src/engine/gamepad.js): buttons become the keys the game knows, the left
// stick walks (a full push hurries), the right stick looks, with dead zones. npm test.
import { padEvents, stickMove, stickLook, keyFor } from '../src/engine/gamepad.js';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const ev = padEvents({}, { A: true }, 'play');
ok(ev.length === 1 && ev[0].type === 'down' && ev[0].code === 'KeyE', 'A pressed: E down (interact)');
ok(padEvents({ A: true }, {}, 'play')[0].type === 'up', 'A released: E up (held E works, as for the pouch)');
ok(keyFor('A', 'entry') === 'Enter' && keyFor('A', 'menu') === 'Enter' && keyFor('B', 'play') === 'Escape' && keyFor('Y', 'play') === 'KeyP' && keyFor('RB', 'play') === 'KeyM' && keyFor('LB', 'play') === 'KeyJ', 'A begins / confirms at the counter; B back, Y phone, RB map, LB journal');
ok(['Up', 'Right', 'Down', 'Left'].map((d) => keyFor(d, 'seat')).join() === 'Digit1,Digit2,Digit3,Digit4', 'the d-pad answers 1-4');
const p = padEvents({}, { Menu: true }, 'play');
ok(p.length === 1 && p[0].type === 'pause' && padEvents({ Menu: true }, { Menu: true }, 'play').length === 0, 'Menu: one pause request per press');
ok(padEvents({}, { L3: true, RT: true }, 'play').length === 0, 'L3 / RT send no key (they hurry, with the stick)');
const s0 = stickMove(0.1, -0.12), s1 = stickMove(0, -0.6), s2 = stickMove(0.7, -0.7), s3 = stickMove(0, -0.6, true);
ok(!s0.f && !s0.l && !s0.r && !s0.b, 'inside the dead zone: still');
ok(s1.f && !s1.run && s2.f && s2.r && s2.run && s3.run, 'half forward: walk; a full diagonal push: hurry; L3 held: hurry');
const l0 = stickLook(0.1, 0.1, 1 / 60), l1 = stickLook(1, 0, 1 / 60), l2 = stickLook(0.5, 0, 1 / 60);
ok(l0.yaw === 0 && l0.pitch === 0 && l1.yaw < 0 && Math.abs(l1.yaw) > Math.abs(l2.yaw) * 2, 'look: dead zone, then a curve (fine aim near the centre, fast at the edge)');
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
