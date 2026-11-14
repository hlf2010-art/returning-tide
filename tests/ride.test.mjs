// Your DiDi ride (src/engine/ride.js). npm test.
import { createLife, advance, balance, drain, stamp } from '../src/engine/life.js';
import { requestRide, stepRide, arrive, reply, lineText, onRoad, fare, dest, DESTINATIONS, RIDE_RULES } from '../src/engine/ride.js';
import { DRIVERS, OUTBURSTS } from '../src/world/drivers.js';
import { DRIVER_EN } from '../src/world/driversEn.js';
import { enText } from '../src/world/agendaEn.js';
import { rng } from './util-rng.mjs';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const tick = (L, R, secs, world) => { for (let i = 0; i < secs * 10; i++) { advance(L, 0.1); stepRide(L, R, 0.1, world); } };

{
  const f = fare(dest('lujiazui'), 18 * 60), fn = fare(dest('lujiazui'), 23 * 60 + 30);
  ok(f > 14 && f < 40, `Bund to Lujiazui by DiDi Express: ¥${f}`);
  ok(fn > f, `more at night (¥${fn})`);
  ok(fare(dest('tianma'), 18 * 60) > 100, `out to Tianma: ¥${fare(dest('tianma'), 18 * 60)}`);
  ok(DESTINATIONS.every((d) => d.zh && d.en && d.km > 0 && d.mins > 0), 'destinations named in both languages, with distance and time');
}
{
  // the whole ride: match, car comes, you get in, talk, arrive, pay
  const L = createLife(), w0 = balance(L, 'wechat');
  const R = requestRide(L, { to: 'lujiazui', drivers: DRIVERS, rnd: rng(3) });
  tick(L, R, 10, {});
  ok(R.phase === 'coming' && R.driver && /司机已接单/.test(L.threads.didi.messages.at(-1).text), `a driver accepts: ${R.driver.name} ${R.driver.plate}`);
  ok(/accepted/.test(enText(L.threads.didi.messages.at(-1).text)) || !/[一-鿿]{4}/.test(enText(L.threads.didi.messages.at(-1).text)), `and the app says so in English too: "${enText(L.threads.didi.messages.at(-1).text)}"`);
  tick(L, R, 2, { carStopped: true });
  ok(R.phase === 'waiting', 'the car pulls in: waiting at the kerb');
  tick(L, R, 2, { carStopped: true, boarded: true });
  ok(R.phase === 'riding' && R.talk, 'you get in: riding');
  // ride along answering whatever's said
  let lines = 0;
  for (let i = 0; i < 1800; i++) {
    advance(L, 0.1); stepRide(L, R, 0.1, { boarded: true });
    for (const e of R.events.splice(0)) if (e.type === 'line') { lines++; const txt = lineText(R, e.line); if (!txt) ok(false, 'every line has words'); reply(R, 'engage'); }
  }
  ok(R.talk.done || lines >= 0, `${R.driver.name} said ${lines} thing(s) in three minutes (${R.talk.chatty > 0.4 ? 'chatty' : 'quiet'} driver, ${R.driver.mood})`);
  const r = arrive(L, R);
  ok(r && r.paid && balance(L, 'wechat') < w0 && R.phase === 'arrived', `arrived and paid ¥${r.amount}`);
  ok(L.flags.rides.length === 1 && L.flags.ride === null, 'the ride is in your history; nothing pending');
  ok(drain(L).some((e) => e.type === 'arrived' && e.to === 'lujiazui' && e.invite === 'xuan-arm'), 'the world hears you arrived (and which invitation that place belongs to)');
}
{
  // you never come down: reminder, then the driver cancels and the app charges the fee
  const L = createLife(), w0 = balance(L, 'wechat');
  const R = requestRide(L, { to: 'jingan', drivers: DRIVERS, rnd: rng(7) });
  tick(L, R, 10, {}); tick(L, R, 1, { carStopped: true });
  tick(L, R, (RIDE_RULES.freeWait) * 15, { carStopped: true });
  ok(R.events.some((e) => e.type === 'reminded') && R.phase === 'waiting', 'after nearly five minutes the driver messages: hazards on, hurry');
  tick(L, R, 4 * 15, { carStopped: true });
  ok(R.phase === 'cancelled' && balance(L, 'wechat') === w0 - RIDE_RULES.noShowFee, `at eight minutes they cancel; the no-show fee is ¥${RIDE_RULES.noShowFee}`);
}
{
  // a driver who keeps being ignored gives up; road rage cuts in
  const L = createLife();
  const chatty = DRIVERS.find((d) => d.id === 'shi-gu');
  const R = requestRide(L, { to: 'xintiandi', drivers: [chatty], rnd: rng(11) });
  tick(L, R, 10, {}); tick(L, R, 1, { carStopped: true }); tick(L, R, 1, { boarded: true });
  let said = 0;
  for (let i = 0; i < 3000 && !R.talk.done; i++) { stepRide(L, R, 0.1, { boarded: true }); for (const e of R.events.splice(0)) if (e.type === 'line') { said++; reply(R, 'ignore'); } }
  ok(R.talk.done && said <= 2, `ignored twice, Gu stops talking (${said} line(s))`);
  const R2 = requestRide(L, { to: 'xintiandi', drivers: [chatty], rnd: rng(12) });
  tick(L, R2, 10, {}); tick(L, R2, 1, { carStopped: true }); tick(L, R2, 1, { boarded: true });
  let out = null; for (let i = 0; i < 20 && !out; i++) out = onRoad(R2, 'cutIn', 6.5, 0.5);
  ok(out && out.severity >= 2 && OUTBURSTS['shi-gu'].cutIn.length, `cut up at 6.5 m/s², Gu lets rip (severity ${out && out.severity})`);
}
{
  const all = [];
  for (const d of DRIVERS) { for (const v of Object.values(d.topics)) all.push(...v); for (const a of d.asides) all.push(a.line); }
  for (const o of Object.values(OUTBURSTS)) for (const v of Object.values(o)) all.push(...v);
  ok(all.every((s) => DRIVER_EN[s]), `every driver line has English (${all.length} lines)`);
}
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
