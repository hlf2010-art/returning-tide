// The city's sound by place (src/engine/soundscape.js): zones, falloff, the traffic bed, horns, reverb,
// chatter and the Customs House clock. npm test. (The Web Audio graph is checked in the browser.)
import { riverExposure, windExposure, trafficBed, hornRate, HORN, reverbAt, peopleNear, pickTalkers, clockChime, EAST_IS_RED, tuneSeconds, degreeHz, clockGain, CLOCK, paGain, METRO_PA, BOAT_HORN, payTokens, crowdPayment } from '../src/engine/soundscape.js';
import { existsSync } from 'node:fs';
import { L, NJ } from '../src/world/layout.js';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };

// the river
const rail = riverExposure(25, 0, 3), deck = riverExposure(10, 0, 3), road = riverExposure(-16, 0, 0.15), hankou = riverExposure(-60, 0, 0.15), nanjing = riverExposure(-300, NJ.zc, 0.15), behind = riverExposure(-60, 60, 0.15);
ok(rail === 1 && rail > deck && deck > road && road > hankou && hankou > nanjing && behind === 0, `the river is loudest at the railing and fades inland (${[rail, deck, road, hankou, nanjing].map((v) => v.toFixed(2)).join(' > ')}; behind the buildings ${behind})`);
ok(nanjing < 0.03, `halfway down Nanjing Road the river is gone (${nanjing.toFixed(3)})`);
ok(windExposure(20, 0, 3) > windExposure(-16, 0, 0.15) && windExposure(-16, 0, 0.15) > windExposure(-300, NJ.zc, 0.15), 'the wind: most on the promenade, less on the road, least down Nanjing Road');
ok(BOAT_HORN.minGap >= 120 && BOAT_HORN.perBoat <= 1 / 600, 'boat horns are rare (an emergency signal only on this stretch of the Huangpu)');

// the road
const none = trafficBed([], 0, 0), one = trafficBed([{ x: 10, z: 0, v: 10 }], 0, 0), many = trafficBed(Array.from({ length: 12 }, (_, i) => ({ x: 10, z: i * 6 - 30, v: 10 })), 0, 0);
ok(none.level === 0 && one.level > 0 && many.level > one.level && many.level < 1, `the bed follows the traffic: none ${none.level}, one car ${one.level.toFixed(2)}, twelve ${many.level.toFixed(2)}`);
const far = trafficBed([{ x: 300, z: 0, v: 12 }], 0, 0), idle = trafficBed([{ x: 10, z: 0, v: 0 }], 0, 0), bus = trafficBed([{ x: 10, z: 0, v: 0, bus: true }], 0, 0);
ok(far.level === 0 && idle.level > 0 && idle.level < one.level && bus.level > idle.level, 'far traffic adds nothing; an idling car a little; an idling bus more');
const mix = trafficBed([{ x: 5, z: 0, v: 12 }, { x: 60, z: 40, v: 2 }], 0, 0);
ok(Math.hypot(mix.x - 5, mix.z) < Math.hypot(mix.x - 60, mix.z - 40) && mix.count === 2, 'the bed sits nearer the louder, nearer vehicle; both counted');
ok(trafficBed([{ x: 5, z: 0, v: 12, active: false }], 0, 0).level === 0, 'parked (inactive) vehicles are silent');
const perMin = 20 * hornRate({ v: 3, waited: 0, model: 'sedan' }, 20) * 60;
ok(hornRate({ v: 3 }, HORN.range + 1) === 0 && hornRate({ waited: 10 }, 10) > hornRate({ waited: 0 }, 10) && perMin < 0.5, `horns are rare (${perMin.toFixed(2)} a minute from twenty cars moving), likelier from someone held up`);

// the arcades
const portico = reverbAt(-32.5, 27, 0.15), roadR = reverbAt(-16, 0, 0.15), hall = reverbAt(-48, -229, 0.15), stairTop = reverbAt(-484, -209.5, 0.15), stairFoot = reverbAt(-492, -209.5, -4.4);
ok(portico.wet > 0.2 && portico.id === 'customs-portico' && roadR.wet === 0, `under the Customs House portico your steps ring (${portico.wet}); out on the road they don't`);
ok(hall.wet > portico.wet && hall.id === 'peace-arcade', `the Peace Hotel's marble arcade rings more (${hall.wet})`);
ok(stairFoot.wet > stairTop.wet && stairFoot.id.startsWith('metro'), `down the metro stairs, more reverb the lower you go (${stairTop.wet.toFixed(2)} -> ${stairFoot.wet.toFixed(2)})`);
let edge = true; for (let x = -38; x < -30; x += 0.1) { const a = reverbAt(x, 27, 0.15).wet, b = reverbAt(x + 0.1, 27, 0.15).wet; if (Math.abs(a - b) > 0.05) edge = false; }
ok(edge, 'it fades in at the portico\'s edge (no jump)');

// people
const crowd = [{ x: 1, z: 0 }, { x: 12, z: 0 }, { x: 30, z: 0 }, { x: 2, z: 0, gone: true }];
const pn = peopleNear(crowd, 0, 0);
ok(pn.count === 2 && Math.abs(pn.weight - ((1 - 1 / 24) + (1 - 12 / 24))) < 1e-9 && Math.abs(pn.level - pn.weight / 12) < 1e-9, `chatter counts the people near, nearer ones more (${pn.count} people, level ${pn.level.toFixed(3)})`);
ok(peopleNear([], 0, 0).level === 0 && peopleNear(Array.from({ length: 40 }, (_, i) => ({ x: (i % 8) - 4, z: Math.floor(i / 8) - 2 })), 0, 0).level > 2, 'nobody: silence; a crush: loud');
const folk = [
  { id: 1, x: 3, z: 0, state: 'walk' },                    // walking alone: not a talker
  { id: 2, x: 4, z: 0, state: 'act' },                     // standing at the rail
  { id: 3, x: 4.5, z: 0.5, state: 'act' },                 // right beside 2
  { id: 4, x: 8, z: 3, state: 'walk', partner: {} },       // a couple walking
  { id: 5, x: 30, z: 0, state: 'act' },                    // too far
  { id: 6, x: 0.5, z: 0, state: 'act' },                   // too close (that's you)
];
const tk = pickTalkers(folk, 0, 0, { n: 3 });
ok(tk.map((p) => p.id).join(',') === '2,4', `talkers: people standing or in company, 2-14 m off, not on top of each other (${tk.map((p) => p.id)})`);

// the clock
const q1 = clockChime(17 * 60 + 14.9, 17 * 60 + 15.1), q2 = clockChime(17 * 60 + 29.5, 17 * 60 + 30), q3 = clockChime(17 * 60 + 44.9, 17 * 60 + 45), hr = clockChime(17 * 60 + 59.8, 18 * 60);
ok(q1.sections === 1 && !q1.strikes && q2.sections === 2 && q3.sections === 3 && hr.sections === 4 && hr.strikes === 6, 'a quarter past: one section; half past: two; a quarter to: three; six o\'clock: the whole tune and six strokes');
ok(clockChime(12 * 60 - 0.5, 12 * 60).strikes === 12 && clockChime(13 * 60 - 0.5, 13 * 60).strikes === 1, 'twelve strokes at noon, one at one');
ok(clockChime(18 * 60 + 1, 18 * 60 + 14) === null, 'nothing between the quarters');
const night = clockChime(23 * 60 + 59.5, 24 * 60), late = clockChime(22 * 60 + 29.5, 22 * 60 + 30), ten = clockChime(22 * 60 - 0.5, 22 * 60), seven = clockChime(7 * 60 - 0.5, 7 * 60);
ok(night.sections === 0 && night.strikes === 12 && late === null && ten.sections === 4 && seven.sections === 4, 'after 22:00 the hours are struck without the tune, until 07:00');
ok(clockChime(17 * 60, 19 * 60) === null && clockChime(18 * 60, 17 * 60) === null, 'a jump in time (sleep, a ride) rings nothing');
ok(EAST_IS_RED.length === 4 && EAST_IS_RED.every((sec) => sec.reduce((s, [, b]) => s + b, 0) === 8), 'the tune: four sections, each four bars of 2/4');
ok(Math.abs(degreeHz(1) - CLOCK.bellHz) < 1e-9 && Math.abs(degreeHz(8) - 2 * CLOCK.bellHz) < 1e-9 && Math.abs(degreeHz(-6) * Math.pow(2, 3 / 12) - CLOCK.bellHz) < 1e-6, 'scale degrees: 1 is the tonic, 8 the octave, low 6 a minor third under');
ok(tuneSeconds() > 10 && tuneSeconds() < 30 && tuneSeconds(1) * 4 === tuneSeconds(), `the whole tune lasts ${tuneSeconds()} s`);
const atProm = clockGain(Math.hypot(CLOCK.x - 20, CLOCK.z - 10), 20, 10), atNj = clockGain(Math.hypot(CLOCK.x + 478, CLOCK.z + 198), -478, -198);
ok(atProm > 0.6 && atNj > 0 && atNj < 0.1, `the clock carries: ${atProm.toFixed(2)} on the promenade, ${atNj.toFixed(3)} at Henan Road`);
ok(paGain(0) > paGain(10) && paGain(METRO_PA.range) === 0, 'the station\'s announcements: loud at the stairwell, gone 55 m off');
// the counter's payment speaker: amounts read the Chinese way, and every piece has a recording
{
  const Z = { alipay: '支付宝到账', wechat: '微信收款', d0: '零', d1: '一', d2: '二', d3: '三', d4: '四', d5: '五', d6: '六', d7: '七', d8: '八', d9: '九', shi: '十', bai: '百', qian: '千', dian: '点', yuan: '元' };
  const say = (a, m) => payTokens(a, m).map((t) => Z[t]).join('');
  const cases = [[10, '支付宝到账十元'], [15, '支付宝到账十五元'], [25, '支付宝到账二十五元'], [105, '支付宝到账一百零五元'], [110, '支付宝到账一百一十元'], [128, '支付宝到账一百二十八元'],
    [1005, '支付宝到账一千零五元'], [1010, '支付宝到账一千零一十元'], [2008, '支付宝到账二千零八元'], [30.5, '支付宝到账三十点五元'], [0, '支付宝到账零元']];
  ok(cases.every(([a, w]) => say(a, 'alipay') === w), 'amounts read the Chinese way (十五, 一百零五, 一百一十, 三十点五)');
  ok(say(18, 'wechat') === '微信收款十八元', 'WeChat says 微信收款');
  let all = true; for (let a = 0; a < 10000; a += 7) for (const t of payTokens(a + 0.5)) if (!Z[t]) all = false;
  ok(all, 'every amount is made only of recorded pieces');
  ok(Object.keys(Z).every((id) => existsSync(new URL(`../public/ambience/pay/${id}.mp3`, import.meta.url))), 'every piece is on disk (tools/voice/paybox.py)');
  let r = 0; const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  ok(Array.from({ length: 200 }, () => crowdPayment(rnd)).every((p) => p.amount >= 12 && p.amount < 2000 && (p.method === 'alipay' || p.method === 'wechat')), 'a customer pays between ¥12 and ¥2,000, by Alipay or WeChat');
}
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
