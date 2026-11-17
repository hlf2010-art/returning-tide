// The Bund - Lujiazui ferry's timetable (engine/ferry.js).
import { FERRY, nextFerry, ferryRunning } from '../src/engine/ferry.js';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
ok(nextFerry(17 * 60 + 42) === 17 * 60 + 45, 'at 17:42 the next boat is 17:45');
ok(nextFerry(18 * 60) === 18 * 60, 'on the quarter it leaves now');
ok(nextFerry(3 * 60) === FERRY.first, 'before the first boat: the first boat');
ok(nextFerry(23 * 60) === 23 * 60 && nextFerry(23 * 60 + 1) === null && !ferryRunning(23 * 60 + 30), 'the last boat is 23:00; after it, none');
ok(FERRY.fare === 2, 'the fare is ¥2');
console.log(failed ? `\n${failed} FAILED` : '\nall passed'); process.exit(failed ? 1 : 0);
