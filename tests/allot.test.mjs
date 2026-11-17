// Where Ji Bai's time goes (engine/allot.js): the ledger, energy, the seasons between the acts, the project.
// Runs a few typical years (all making, all love, balanced, all business) and checks that each comes out
// different, and that what the preview promises is what happens.
import { createLife, relation } from '../src/engine/life.js';
import { initYear, setTrack } from '../src/engine/year.js';
import { heart, setStage, meet } from '../src/engine/hearts.js';
import { studio, summary } from '../src/engine/studio.js';
import { maker } from '../src/engine/maker.js';
import { gainSkill } from '../src/engine/skills.js';
import { allot, logTime, slept, seasonBudget, previewSeason, applySeason, nextMilestone, profile, yieldOf, networkGain, EVENING } from '../src/engine/allot.js';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };

// a Ji Bai at the end of act 1: a field-tested gimbal (version 3, eight people have used it), dating Nanxing
function fixture() {
  const L = createLife(); initYear(L);
  const m = maker(L); m.gadgets = { gimbal: { version: 3, quality: 0.9 } };
  const S = studio(L); S.found = { grip: 1, clamp: 1, boot: 1 }; S.fixes = [{ id: 'sleeve' }, { id: 'clamp' }, { id: 'quickboot' }];
  S.tests = Array.from({ length: 8 }, (_, i) => ({ who: 'anon', kind: 'ok', eve: i }));
  S.list = [{ who: 'a', units: 1 }, { who: 'b', units: 2 }, { who: 'c', units: 1 }, { who: 'd', units: 1 }];
  meet(L, 'nanxing'); setStage(L, 'nanxing', 'dating'); meet(L, 'zhiwei');
  L.clock.day = 6;
  return L;
}
const sumPlan = (p) => ['make', 'love', 'friends', 'business', 'rest'].reduce((s, u) => s + (p[u] || 0), 0);

// ---- the playable days ----
{
  const L = fixture(), A = allot(L), e0 = A.energy;
  logTime(L, 'make', 180); ok(A.hours.make === 3 && A.energy < e0 && A.made > 0, `three hours at the bench: in the ledger, energy ${e0} -> ${A.energy.toFixed(1)}`);
  logTime(L, 'love', 120, 'nanxing'); ok(A.who.nanxing.hours === 2 && A.hours.love === 2, 'two hours with Nanxing, by name');
  const low = A.energy; slept(L, 4); const short = A.energy; slept(L, 8);
  ok(short - low < A.energy - short, `a short night does less than a full one (${(short - low).toFixed(1)} vs ${(A.energy - short).toFixed(1)})`);
  ok(yieldOf(80) === 1 && yieldOf(0) === 0.5 && yieldOf(30) === 0.75, 'tired, everything yields less');
}
// ---- the budget ----
{
  const L = fixture(), B = seasonBudget(L, 58);
  ok(B.evenings < 58 && B.overtime > 0, `two months at the consultancy: ${B.evenings} evenings of 58 days (${B.overtime} nights of overtime)`);
  setTrack(L, 'startup'); ok(seasonBudget(L, 58).overtime === 0, 'his own start-up: no one else takes his nights (they are all his)');
  const over = applySeason(fixture(), { make: 60 }, 58); ok(!over.ok && over.reason === 'over', 'you cannot plan more evenings than there are');
}
// ---- the preview is the truth ----
{
  const L = fixture(), plan = { make: 30, lover: null, love: 0, friends: 6, business: 0, rest: 8 };
  const p = previewSeason(L, plan, 58);
  ok(p.lines.some((l) => l.kind === 'love' && l.id === 'nanxing' && l.tone === 'bad'), 'all making and no Nanxing: the preview says she will feel it');
  ok(p.lines.some((l) => l.kind === 'business' && l.tone === 'bad'), 'and no investors: the preview says so');
  const t0 = heart(L, 'nanxing').trust; const r = applySeason(L, plan, 58);
  ok(r.ok && heart(L, 'nanxing').trust < t0 && r.events.some((e) => e.type === 'apart' && e.id === 'nanxing'), `and so it is: her trust ${t0} -> ${heart(L, 'nanxing').trust}`);
  ok(Math.abs(allot(L).energy - p.energy) < 1e-9 || allot(L).burnout > 0, 'the energy the preview showed is the energy he ends with');
}
// ---- four years ----
const PLANS = {
  maker: { make: 34, love: 0, friends: 2, business: 2, rest: 8 },
  lover: { make: 6, lover: 'nanxing', love: 20, friends: 10, business: 2, rest: 8 },
  balanced: { make: 16, lover: 'nanxing', love: 9, friends: 8, business: 7, rest: 6 },
  hustler: { make: 20, lover: null, love: 0, friends: 0, business: 22, rest: 0 },
};
const GAPS = [58, 42, 120]; // the three long gaps of the year (after acts 1, 2, 4: approx.)
const years = {};
for (const [name, plan0] of Object.entries(PLANS)) {
  const L = fixture(); gainSkill(L, 'hw', 400, 'test'); gainSkill(L, 'product', 400, 'test');
  const evs = [];
  for (const days of GAPS) {
    const B = seasonBudget(L, days), k = B.evenings / sumPlan(plan0), plan = { ...plan0 };
    for (const u of ['make', 'love', 'friends', 'business', 'rest']) plan[u] = Math.floor((plan0[u] || 0) * k);
    const r = applySeason(L, plan, days); if (!r.ok) console.log(name, r);
    evs.push(...r.events.map((e) => e.type)); L.clock.day += 2;
  }
  years[name] = { L, P: profile(L), evs, h: heart(L, 'nanxing') };
}
{
  const { maker: M, lover: Lo, balanced: B, hustler: H } = years;
  ok(M.P.milestones.ready && M.P.milestones.batch, `all making: production-ready and a small batch (${Object.keys(M.P.milestones)})`);
  ok(!M.P.launched, 'but without a network, no launch');
  ok(M.h.stage === 'dating' && M.h.trust < Lo.h.trust - 20, `and Nanxing: trust ${M.h.trust} against ${Lo.h.trust} for the year spent with her`);
  ok(!Lo.P.milestones.batch, 'all love: the gimbal stays a prototype');
  ok(relation(Lo.L, 'dad').affinity > relation(M.L, 'dad').affinity, `Dad: ${relation(Lo.L, 'dad').affinity} if you call, ${relation(M.L, 'dad').affinity} if you don't`);
  ok(H.P.network > B.P.network && B.P.network > M.P.network, `network: hustler ${H.P.network}, balanced ${B.P.network}, maker ${M.P.network}`);
  ok(H.P.burnout >= 1 && H.evs.includes('burnout'), `no rest all year: burnout (${H.P.burnout})`);
  ok(B.P.burnout === 0 && B.h.trust > M.h.trust, 'balanced: no burnout, and she is still there');
  const launchedAny = Object.values(years).filter((y) => y.P.launched).map((y) => Object.keys(years).find((k) => years[k] === y));
  ok(launchedAny.length >= 1 && !launchedAny.includes('lover'), `who launches: ${launchedAny.join(', ')}`);
  ok(new Set(Object.values(years).map((y) => JSON.stringify([y.P.launched, y.P.burnout > 0, y.h.trust > 60]))).size >= 3, 'four ways of spending the year, at least three different outcomes');
}
ok(networkGain(0) === 0 && networkGain(10) > networkGain(5) && networkGain(40) - networkGain(30) < networkGain(10) - networkGain(0), 'the first business dinners count most');
ok(summary(fixture()).grade >= 3 && nextMilestone(fixture(), { made: 70 }).id === 'ready', 'the fixture is field-tested; 70 hours more makes it production-ready');
console.log(failed ? `\n${failed} FAILED` : '\nall passed'); process.exit(failed ? 1 : 0);
