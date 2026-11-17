// People and your car (src/engine/roadIncident.js): who gets out of the way, the tiers, the costs.
import { ROAD, dodgePlan, classify, consequence, speeding, applyIncident, drivingSuspended, honkers, gatherSpots, incidentText, LINES, lineFor, shoutFor } from '../src/engine/roadIncident.js';
import { createLife, balance } from '../src/engine/life.js';
import { initYear, year } from '../src/engine/year.js';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const ms = (kmh) => kmh / 3.6;
// someone square in the car's path, `ahead` m from its centre
const plan = (kmh, ahead, side = 0, kind = null) => dodgePlan({ ahead, side, v: ms(kmh), kind });

// ---- getting out of the way ----
ok(plan(20, 30) === null, 'far up the road: nobody moves yet');
ok(plan(20, 6) && plan(20, 6).makes, 'at 20 km/h, someone 6 m ahead steps aside, and makes it');
ok(plan(20, 6, 2.5) === null, 'someone already clear of the car’s width: no need to move');
ok(plan(0.5, 3) === null && plan(5, -3) === null, 'creeping, or behind the car: nothing');
// below the hit speed, everyone makes it, even close up and on a phone
let always = true;
for (const kmh of [5, 10, 15, 20, 25, 29]) for (const a of [2.6, 3, 4, 6, 9]) for (const kind of [null, 'phone', 'elder']) { const p = plan(kmh, a, 0, kind); if (p && !p.makes) always = false; if (p && p.makes && p.react + p.need / p.speed > p.ttc + 0.2 && p.ttc > 0.2) always = false; }
ok(always, 'below 30 km/h nobody is ever caught: they always get clear in time');
// at speed: the moment they first notice the car (walking it in from far up the road)
const firstSeen = (kmh, kind = null, side = 0) => { for (let a = 60; a > 2; a -= 0.05) { const p = plan(kmh, a, side, kind); if (p) return p; } return null; };
for (const [kmh, kind, makes] of [[40, null, true], [60, null, true], [80, null, true], [35, 'phone', true], [35, 'elder', true], [50, 'phone', false], [50, 'elder', false], [100, null, false]]) {
  const p = firstSeen(kmh, kind);
  ok(p && p.makes === makes, `${kmh} km/h, ${kind || 'looking'}: seen ${p && p.ttc.toFixed(2)} s off, ${makes ? 'gets clear' : 'can’t get clear'}`);
}
ok(firstSeen(100, null, 1.2).makes, 'at the edge of the car’s path, one step does it, even at 100');
ok(plan(20, 5, 0.6).dir === 1 && plan(20, 5, -0.6).dir === -1, 'they step to the side they are already on');
const e = plan(45, 10, 0, 'elder'), y = plan(45, 10, 0);
ok(e && y && e.clearIn > y.clearIn, 'an older person needs longer to get clear');

// ---- tiers ----
ok(classify({ contact: true, kmh: 5 }) === 'startle', 'a touch at walking pace: a startle');
ok(classify({ contact: true, kmh: 20 }) === 'scare', 'a touch at 20: a scare');
ok(classify({ contact: true, kmh: 31 }) === 'hit' && classify({ contact: true, kmh: 29.9 }) !== 'hit', 'a real hit only from 30 km/h');
ok(classify({ kmh: 10, close: false }) === 'glare', 'stepping aside in good time: a glare');
ok(classify({ kmh: 10, close: true }) === 'startle', 'a close call: a jump and a shout');
ok(classify({ kmh: 15, zebra: true }) === 'startle' && classify({ kmh: 8, zebra: true }) === 'glare', 'not slowing for someone on the zebra: a shout (crawling up to them: a look)');
ok(classify({ kmh: 14, crowded: 4, zebra: true }) === 'scare' && classify({ kmh: 14, crowded: 1, zebra: true }) !== 'scare', 'through a crowded zebra at 14: a scare (not with one person on it)');
ok(classify({ kmh: 25 }) === 'scare', 'making people jump at 25+: a scare');

// ---- the law ----
ok(speeding(45)[0] === 0 && speeding(56)[1] === 1 && speeding(62)[1] === 6 && speeding(80)[0] === 1500 && speeding(80)[1] === 12, 'speeding on a 50 road: 10%/20%/50% bands');
const c35 = consequence('hit', { kmh: 35 });
ok(c35.fine === 200 && c35.points === 3 && c35.comp === 2100 && c35.tow === 200 && c35.total === 2500 && c35.suspend && c35.police, `a hit at 35: ¥200 + 3 points, ¥2,100 costs, ¥200 tow (¥${c35.total})`);
const c80 = consequence('hit', { kmh: 80 });
ok(c80.fine === 1700 && c80.points === 12 && c80.comp <= 6000, `a hit at 80: ¥${c80.fine}, ${c80.points} points, costs capped (¥${c80.comp})`);
ok(consequence('scare', { kmh: 20, zebra: true }).ticket && !consequence('scare', { kmh: 25, zebra: false }).ticket, 'a scare on the zebra: the camera’s ticket; off it, none');
ok(consequence('startle').total === 0 && consequence('glare').total === 0, 'startles and glares cost nothing');

// ---- on the record ----
{
  const L = createLife(); initYear(L);
  const w0 = balance(L, 'wechat');
  const r = applyIncident(L, 'scare', { kmh: 20, zebra: true });
  ok(r.ticketed && balance(L, 'wechat') === w0 - 200 && L.flags.carPoints === 3 && L.flags.carWarnings === 1, 'a scare on the zebra: ¥200 from WeChat, 3 points, a warning');
  const r2 = applyIncident(L, 'scare', { kmh: 20, zebra: true });
  ok(!r2.ticketed && L.flags.carWarnings === 2 && L.flags.carPoints === 3, 'a second straight after: the same notice (no second ticket), another warning');
  ok(year(L).rep.street < 50 && !drivingSuspended(L), 'street reputation dips; still allowed to drive');
  const w1 = balance(L, 'wechat');
  const h = applyIncident(L, 'hit', { kmh: 42, zebra: true, filmed: true });
  ok(h.paid === h.total && balance(L, 'wechat') === w1 - h.total, `a hit: ¥${h.total} paid by WeChat`);
  ok(L.flags.carHits === 1 && L.flags.carPoints === 6 && drivingSuspended(L), 'a hit: on the record, 3 more points, no driving until morning');
  ok(year(L).rep.online < 50 && year(L).facts.some((f) => f.type === 'car' && f.tier === 'hit'), 'filmed: online reputation too; a fact for the characters');
  ok(L.wallet.ledger.some((x) => x.memoEn && /accident/i.test(x.memoEn)) && L.flags.carIncidents.length === 3, 'ledger memos and the incidents list');
  L.clock.day += 1; L.clock.minute = 8 * 60 + 1;
  ok(!drivingSuspended(L), 'the next morning after 8: the car can be driven again');
  ok(/knocked down a pedestrian/.test(incidentText(L)), 'later text can refer to it');
}
{
  const L = createLife(); L.wallet.wechat = 50;
  const h = applyIncident(L, 'hit', { kmh: 31 });
  ok(h.paid === h.total && L.wallet.alipay < 12400, 'not enough in WeChat: Alipay pays');
  ok(applyIncident(createLife(), 'startle').paid === 0 && incidentText(createLife()) === '', 'startles leave no record');
}

// ---- who reacts ----
{
  const cars = [{ x: 0, z: 10 }, { x: 0, z: 25 }, { x: 0, z: 80 }, { x: 0, z: 5, active: false }];
  const h = honkers(cars, 0, 0, { rnd: () => 0.5 });
  ok(h.length === 2 && h[0].v.z === 10 && h[1].delay > h[0].delay && h[0].level > h[1].level, 'the two nearest running cars honk, a beat apart, the nearer louder');
  const ppl = Array.from({ length: 10 }, (_, i) => ({ x: i * 3, z: 1, phone: i === 4 }));
  const g = gatherSpots(ppl, 0, 0, { n: 6, rnd: () => 0.5 });
  ok(g.length === 6 && g.every((s) => Math.hypot(s.x, s.z) > 2.4 && Math.hypot(s.x, s.z) < 4.6), 'six onlookers, each with a spot 2.5-4.5 m round it');
  ok(g.filter((s) => s.film).length >= 3 && g.find((s) => s.p === ppl[4]).film, 'about half film it, whoever had a phone out among them');
}
// ---- the lines ----
{
  const all = [];
  const walk = (o) => { if (Array.isArray(o) && typeof o[0] === 'string') all.push(o); else if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object' && !o.wuu && !o.t) Object.values(o).forEach(walk); };
  walk(LINES);
  ok(all.length > 20 && all.every(([who, zh, en]) => /^[a-z]+$/.test(who) && /[一-鿿]/.test(zh) && en && !/[一-鿿]/.test(en)), `${all.length} voiced lines in [who, zh, en] form (tools/voice/extract.mjs)`);
  const a = shoutFor('startle', 'auntie', () => 0), v = shoutFor('scare', 'visitor', () => 0), o = shoutFor('startle', 'nobody', () => 0);
  ok(a.lang === 'wuu' && a.gloss && v.lang === 'en' && o && o.zh, 'Shanghainese for the aunties (subtitled), English for visitors, a fallback for anyone');
  ok(lineFor(LINES.cop).who === 'cop', 'the officer speaks as the cop');
}
console.log(failed ? `\n${failed} FAILED` : '\nall passed'); process.exit(failed ? 1 : 0);
