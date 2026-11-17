// One thing of his own: the night gimbal, taken from a first build to something people want. Pure
// (no three.js, no DOM), node-tested (tests/studio.test.mjs). The words are in world/work.js.
//
// The loop, one evening at a time:
//   by day    revise it: hardware at the bench in Yangpu, firmware at a desk (the bench, or 612)
//   at dusk   put it in people's hands on the Bund. What bothers them is an ISSUE you didn't know
//             about; what no longer bothers them is how you know a fix worked. A gimbal for the
//             night can only be judged at night, and its battery only lasts so many people
//   at night  write the day up. Only what's written down can be fixed (you understand a problem
//             once you've put it in a sentence), and you choose what tomorrow is for
// The weights are set so that plastic can't do everything: hollowed out, with every other fix and
// USB-C it just comes in under what tired hands will hold (349 g), but then it won't run a working
// evening; with the big cell it runs all night and is too heavy for them again. The aluminium arm
// that would settle it needs a machine shop. (That is the conversation waiting at the dinner.)
// What it is, in numbers a machinist would ask for: grams, minutes of battery, how steady, what
// the parts cost. Fixes move them, and they pull against each other (a bigger cell is heavier).
// Everything lives in life.flags.studio, so it saves with the rest; a save from before this
// existed simply has none yet, and a gimbal built before is version 1.
import { stamp, pay, receive, balance } from './life.js';
import { maker, gainXp, level, PARTS, BLUEPRINTS } from './maker.js';

export const NIGHT_FROM = 17 * 60 + 10, NIGHT_TO = 23 * 60;        // floods on .. the promenade thins out
export const isDusk = (minute) => minute >= NIGHT_FROM && minute < NIGHT_TO;
export const BASE = { grams: 386, minutes: 95 };                  // version 1, as the blueprint builds it
export const HEAVY_AT = 350, HEAVY_FOR_ALL = 385, RUNTIME_OK = 150, STEADY_OK = 0.72;
export const TEST_MINUTES = 24;                                   // what one person's go takes out of the battery
export const MAX_PER_SESSION = 2;                                 // change two things at once at most, or you won't know which one worked
export const PRICES = [199, 299, 399, 499];
export const BOM1 = Object.entries(BLUEPRINTS.gimbal.parts).reduce((s, [k, n]) => s + PARTS[k].price * n, 0);
export const BATCH_FACTOR = 0.62;                                 // what fifty sets of parts cost against one (Dad's kind of number)

// what can be wrong with it (found in the field, never listed up front)
export const ISSUES = ['heavy', 'battery', 'grip', 'clamp', 'boot', 'hum', 'drift', 'fold', 'wet', 'track'];
// what can be done about it. at: 'bench' (hardware: Yangpu only) | 'desk' (firmware: the bench or
// the desk in 612) | 'works' (precision machining: not something he can make himself)
export const FIXES = {
  lighten: { solves: 'heavy', at: 'bench', hours: 2.5, cost: 0, grams: -70 },
  cell: { solves: 'battery', at: 'bench', hours: 1, cost: 79, bom: 20, grams: 34, minutes: 110, solder: true },   // (bom: it replaces the small cell)
  usbc: { solves: 'battery', at: 'bench', hours: 1.5, cost: 18, grams: 6, solder: true },
  sleeve: { solves: 'grip', at: 'bench', hours: 1.5, cost: 15, grams: 9 },
  clamp: { solves: 'clamp', at: 'bench', hours: 1.5, cost: 12, grams: 6 },
  gasket: { solves: 'wet', at: 'bench', hours: 1, cost: 3, grams: 2 },
  hinge: { solves: 'fold', at: 'bench', hours: 3, cost: 8, grams: 10, level: 3 },
  quickboot: { solves: 'boot', at: 'desk', hours: 1.5, cost: 0 },
  quiet: { solves: 'hum', at: 'desk', hours: 1.5, cost: 0 },
  filter: { solves: 'drift', at: 'desk', hours: 2, cost: 0 },
  alloy: { solves: 'heavy', at: 'works', hours: 0, cost: 0, grams: -38 },
  // the AI: an NPU module on the board (hardware), then a tracking model trained and shipped to it
  // (software: see train() / deploy() below). The model's own cost to the battery is the run's.
  npu: { solves: 'track', at: 'bench', hours: 2, cost: 189, bom: 189, grams: 12, minutes: -6, solder: true, level: 2, part: true },
};
// the people who are there every evening (world/fieldTest.js puts them on the promenade)
export const REGULARS = {
  chen: { cares: ['heavy', 'boot', 'grip', 'fold'], wtp: 299, from: 17 * 60 + 15, to: 19 * 60 + 45 },
  ye: { cares: ['clamp', 'drift', 'battery', 'track', 'hum'], wtp: 499, pro: true, from: 18 * 60 + 30, to: 21 * 60 + 45, order: 2, deposit: 200 },
  zhe: { cares: ['hum', 'battery', 'wet', 'track', 'fold'], wtp: 299, from: 20 * 60, to: 22 * 60 + 40 },
};
// passers-by, by the kind of person the crowd says they are
const ANON = {
  visitor: { cares: ['fold', 'clamp', 'heavy'], wtp: 399 },
  elder: { cares: ['heavy', 'grip', 'boot'], wtp: 199 },
  office: { cares: ['fold', 'boot', 'clamp'], wtp: 299 },
  youngMan: { cares: ['track', 'drift', 'hum', 'battery'], wtp: 399 },
  student: { cares: ['clamp', 'heavy', 'wet'], wtp: 199 },
};
export function anonTester(persona, rnd = Math.random) {
  const p = ANON[persona] ? persona : 'office', a = ANON[p];
  const cares = (rnd() < 0.35 ? [...a.cares.slice(1), a.cares[0]] : a.cares).slice(0, 2);     // a stranger has a minute: two things at most
  return { id: 'anon', persona: p, cares, wtp: a.wtp };
}
export const regularTester = (id) => ({ id, persona: id, cares: REGULARS[id].cares.slice(), wtp: REGULARS[id].wtp, pro: !!REGULARS[id].pro });

// ---- state ----
export function studio(L) {
  return (L.flags.studio ||= { v: 1, fixes: [], revs: [], found: {}, tests: [], used: 0, usedEve: -1, people: {}, list: [], price: 299, pages: {}, plan: [], dear: 0 });
}
export const gadget = (L) => (L.flags.maker && L.flags.maker.gadgets && L.flags.maker.gadgets.gimbal) || null;
export const hasProduct = (L) => !!gadget(L);
export const rev = (L) => { const g = gadget(L); return g ? g.version || 1 : 0; };
// the evening a moment belongs to: after midnight it's still last night
export const eveningOf = (L, at = stamp(L)) => Math.floor(at / 1440) - (at % 1440 < 5 * 60 ? 1 : 0);
const has = (S, id) => S.fixes.some((f) => f.id === id);

export function specs(L) {
  const S = studio(L), g = gadget(L), q = g ? g.quality ?? 0.6 : 0.6;
  let grams = BASE.grams, minutes = BASE.minutes, bom = BOM1;
  for (const f of S.fixes) { const F = FIXES[f.id]; grams += F.grams || 0; minutes += F.minutes || 0; bom += F.bom ?? F.cost ?? 0; }
  const m = shipped(L); if (m) minutes -= m.battery;                      // the model running costs battery
  const steady = Math.max(0, Math.min(1, 0.4 + 0.3 * q + (has(S, 'filter') ? 0.3 : 0)));
  return { grams, minutes, steady: +steady.toFixed(2), bom, usbc: has(S, 'usbc'), batch: Math.round((bom * BATCH_FACTOR) / 5) * 5 };
}
// is this still wrong with it? strict: for someone who works a whole evening without a power bank
export function isOpen(L, issue, { strict = false } = {}) {
  const S = studio(L), sp = specs(L);
  if (issue === 'heavy') return sp.grams > HEAVY_AT;
  if (issue === 'battery') return sp.minutes < RUNTIME_OK && !(sp.usbc && !strict);
  if (issue === 'drift') return sp.steady < STEADY_OK;
  if (issue === 'track') { const m = shipped(L); return !(has(S, 'npu') && m && m.ok); }
  return !S.fixes.some((f) => FIXES[f.id].solves === issue);
}
export const foundIssues = (L) => Object.keys(studio(L).found);
export const openIssues = (L) => foundIssues(L).filter((i) => isOpen(L, i));
export const solvedIssues = (L) => foundIssues(L).filter((i) => !isOpen(L, i));

// ---- the battery: one charge an evening (it charges overnight, and while you work on it) ----
function charge(L) { const S = studio(L), e = eveningOf(L); if (S.usedEve !== e) { S.usedEve = e; S.used = 0; } return S; }
export const batteryLeft = (L) => Math.max(0, specs(L).minutes - charge(L).used);
export const goesLeft = (L) => Math.floor(batteryLeft(L) / TEST_MINUTES);

// ---- at dusk: someone tries it ----
// tester: { id: 'anon' | a regular's id, persona, cares: [issues, the first that's still wrong is what they say], wtp, pro }
// -> { kind, issue?, first?, v, noticed: [issues they complained of before that are gone now], listed?, deposit?, back?, kept?, late? }
//   kind  'none'   nothing to lend             'day'    it's daylight: a phone is steady enough by itself
//         'dead'   the battery's flat           'same'   a regular, and it's the version they tried already
//         'found'  something new                'again'  something you've heard before
//         'like'   nothing bothers them (and the price is all right: they want one)
//         'dear'   nothing bothers them but the price
export function fieldTest(L, tester, { minute = L.clock.minute, rain = 0, rnd = Math.random } = {}) {
  if (!hasProduct(L)) return { kind: 'none' };
  const S = charge(L), eve = eveningOf(L), r = rev(L), v = Math.floor(rnd() * 2);
  if (!isDusk(minute)) return { kind: 'day', v };
  const reg = tester.id !== 'anon' ? (S.people[tester.id] ||= { met: eve, tries: 0, rev: 0, said: [], promised: null, kept: 0, stood: 0, wechat: false, listed: false, liked: null }) : null;
  const log = (t) => { const e = { at: stamp(L), eve, rev: r, who: tester.id, persona: tester.persona, v, ...t }; S.tests.push(e); if (S.tests.length > 160) S.tests.shift(); return e; };
  const out = { v, back: !!(reg && reg.tries), noticed: [] };
  if (reg) {
    if (reg.tries && reg.rev >= r) { reg.last = eve; return { ...out, kind: 'same' }; }           // (what you promised was a changed one)
    if (reg.promised != null) { if (eve <= reg.promised) { reg.kept++; out.kept = true; } else { reg.stood++; out.late = true; } reg.promised = null; }
    out.noticed = reg.said.filter((i) => !isOpen(L, i, { strict: tester.pro }));
    if (tester.id === 'chen' && out.noticed.includes('fold')) S.pinTold = true;                 // the lathe hand has seen your printed pin
  }
  if (batteryLeft(L) < TEST_MINUTES) {
    const first = !S.found.battery;
    if (first) S.found.battery = { eve, by: 'me', n: 1, noted: false }; else S.found.battery.n++;
    log({ kind: 'dead', issue: 'battery' });
    return { ...out, kind: 'dead', issue: 'battery', first };
  }
  S.used += TEST_MINUTES;
  if (S.found.track && rnd() < CONSENT) { const A = aiState(L); A.clips.push({ eve, who: tester.id === 'anon' ? tester.persona : tester.id, night: true }); out.clip = true; }
  const cares = [...(rain > 0.3 ? ['grip', 'wet'] : []), ...tester.cares];
  if (specs(L).grams > HEAVY_FOR_ALL) cares.push('heavy');
  const issue = cares.find((i) => isOpen(L, i, { strict: tester.pro }));
  if (reg) { reg.tries++; reg.rev = r; reg.last = eve; }
  if (issue) {
    const first = !S.found[issue];
    if (first) S.found[issue] = { eve, by: tester.id === 'anon' ? tester.persona : tester.id, n: 1, noted: false }; else S.found[issue].n++;
    if (reg) { if (!reg.said.includes(issue)) reg.said.push(issue); reg.promised = eve + 1; }
    log({ kind: first ? 'found' : 'again', issue });
    return { ...out, kind: first ? 'found' : 'again', issue, first };
  }
  // nothing bothers them
  if (reg) { reg.wechat = true; reg.liked ??= eve; }
  if (S.price > tester.wtp) { S.dear++; log({ kind: 'dear' }); return { ...out, kind: 'dear' }; }
  if (reg && reg.listed) { log({ kind: 'like' }); return { ...out, kind: 'like', listed: false }; }
  const R = reg ? REGULARS[tester.id] : null, units = (R && R.order) || 1, deposit = R && R.deposit ? R.deposit * units : 0;
  S.list.push({ who: tester.id === 'anon' ? tester.persona : tester.id, at: stamp(L), eve, units, deposit });
  if (reg) reg.listed = true;
  if (deposit) { const e = receive(L, { method: 'wechat', amount: deposit, from: tester.id, memo: `夜行云台 定金 ×${units}` }); e.memoEn = `Night gimbal deposit ×${units}`; }
  log({ kind: 'like', listed: true });
  return { ...out, kind: 'like', listed: true, units, deposit };
}
// names that arrive without a go on the promenade (someone showed it on a stream, a friend's video)
export function addToList(L, who, n = 1) { const S = studio(L); for (let i = 0; i < n; i++) S.list.push({ who, at: stamp(L), eve: eveningOf(L), units: 1, deposit: 0 }); return S.list.length; }
// an issue someone tells you about rather than shows you (a friend who borrowed it)
export function hear(L, issue, by) { const S = studio(L); if (S.found[issue]) { S.found[issue].n++; return false; } S.found[issue] = { eve: eveningOf(L), by, n: 1, noted: false }; return true; }

// ---- at night: write the day up ----
export const todays = (L, eve = eveningOf(L)) => studio(L).tests.filter((t) => t.eve === eve);
export const quotable = (L, eve = eveningOf(L)) => todays(L, eve).filter((t) => t.kind !== 'dead');
export const unwritten = (L) => Object.entries(studio(L).found).filter(([, f]) => !f.noted).map(([k]) => k);
export function canWrite(L) {
  const S = studio(L), eve = eveningOf(L);
  if (!hasProduct(L)) return { ok: false, reason: 'none' };
  if (S.pages[eve]) return unwritten(L).length ? { ok: true, more: true } : { ok: false, reason: 'written' };   // (more: something heard after you wrote)
  if (!todays(L, eve).length && !S.revs.some((r) => r.eve === eve) && !unwritten(L).length) return { ok: false, reason: 'empty' };
  return { ok: true };
}
// line: which of today's remarks you underline (an index into quotable()), plan: what tomorrow is for
export function writePage(L, { line = null, plan = [] } = {}) {
  const c = canWrite(L); if (!c.ok) return c;
  const S = studio(L), eve = eveningOf(L), tests = todays(L, eve), fresh = unwritten(L);
  for (const k of fresh) S.found[k].noted = true;
  const q = quotable(L, eve)[line] || null;
  if (plan.length || !S.pages[eve]) S.plan = plan.filter((i) => S.found[i]).slice(0, MAX_PER_SESSION);
  const old = S.pages[eve] || null, ln = q ? { who: q.who, persona: q.persona, kind: q.kind, issue: q.issue || null, v: q.v } : null;
  const page = S.pages[eve] = { at: stamp(L), rev: rev(L), hands: tests.filter((t) => t.kind !== 'dead').length, heard: [...(old ? old.heard : []), ...fresh], liked: tests.filter((t) => t.kind === 'like' || t.kind === 'dear').length,
    fixes: S.revs.filter((r) => r.eve === eve).flatMap((r) => r.fixes), line: ln || (old && old.line) || null, plan: S.plan.length || !old ? S.plan.slice() : old.plan };
  const got = gainXp(L, (old ? 0 : 10) + 10 * fresh.length, 'page');
  return { ok: true, page, eve, ...got };
}
export function setPlan(L, plan) { const S = studio(L); S.plan = plan.filter((i) => S.found[i]).slice(0, MAX_PER_SESSION); return S.plan; }

// ---- by day: revise it ----
export function canFix(L, id, where = 'bench') {
  const S = studio(L), F = FIXES[id];
  if (!F || !hasProduct(L)) return { ok: false, reason: 'fix' };
  if (has(S, id)) return { ok: false, reason: 'done' };
  if (F.at === 'works') return { ok: false, reason: 'works' };
  const f = S.found[F.solves];
  if (!f) return { ok: false, reason: 'unknown' };
  if (!f.noted) return { ok: false, reason: 'unwritten' };
  if (F.at === 'bench' && where !== 'bench') return { ok: false, reason: 'where' };
  if (F.level && level(maker(L)) < F.level) return { ok: false, reason: 'level', need: F.level };
  if (F.cost > balance(L, 'wechat')) return { ok: false, reason: 'money' };
  return { ok: true };
}
// the fixes you know of (their issue is found), whatever stands in the way of each
export const knownFixes = (L, where = 'bench') => Object.keys(FIXES).filter((id) => studio(L).found[FIXES[id].solves]).map((id) => ({ id, ...FIXES[id], can: canFix(L, id, where) }));
// one sitting: up to two fixes -> the next version. quality: how the soldering went (0..1), if any
export function revise(L, ids, where = 'bench', { quality = null } = {}) {
  ids = [...new Set(ids)];
  if (!ids.length || ids.length > MAX_PER_SESSION) return { ok: false, reason: 'count' };
  for (const id of ids) { const c = canFix(L, id, where); if (!c.ok) return { ...c, id }; }
  const S = studio(L), g = gadget(L), cost = ids.reduce((s, id) => s + FIXES[id].cost, 0), hours = ids.reduce((s, id) => s + FIXES[id].hours, 0);
  if (cost > 0) { const p = pay(L, { method: 'wechat', amount: cost, to: '杨浦创客空间', memo: '改版用料', kind: 'purchase' }); if (!p.ok) return { ok: false, reason: 'money' }; p.entry.memoEn = 'Parts for a revision'; }
  g.version = (g.version || 1) + 1;
  const eve = eveningOf(L);
  for (const id of ids) S.fixes.push({ id, rev: g.version, eve });
  S.revs.push({ rev: g.version, at: stamp(L), eve, where, fixes: ids });
  if (quality != null) g.quality = +(((g.quality ?? 0.6) * 2 + Math.max(0, Math.min(1, quality))) / 3).toFixed(2);
  S.plan = S.plan.filter((i) => isOpen(L, i));
  S.usedEve = eve; S.used = 0;                                   // it's been on the charger while you worked
  const got = gainXp(L, 30 * ids.length, `rev:${g.version}`);
  return { ok: true, rev: g.version, hours, cost, ...got };
}
// Dad's works turn the arm in aluminium (after the dinner, if he offers)
export function machined(L) { const S = studio(L), g = gadget(L); if (!g || has(S, 'alloy')) return false; g.version = (g.version || 1) + 1; S.fixes.push({ id: 'alloy', rev: g.version, eve: eveningOf(L) }); S.revs.push({ rev: g.version, at: stamp(L), eve: eveningOf(L), where: 'works', fixes: ['alloy'] }); return true; }
export function setPrice(L, p) { const S = studio(L); if (PRICES.includes(p)) S.price = p; return S.price; }

// ---- what it all comes to (the journal, the dinner, the endings) ----
export function summary(L) {
  if (!hasProduct(L)) return { grade: 0, rev: 0, hands: 0, evenings: 0, pages: 0, fixes: 0, open: [], solved: [], list: 0, units: 0, deposits: 0, price: studio(L).price };
  const S = studio(L), sp = specs(L), real = S.tests.filter((t) => t.kind !== 'dead');
  const hands = real.filter((t) => t.who === 'anon').length + new Set(real.filter((t) => t.who !== 'anon').map((t) => t.who)).size;
  const evenings = new Set(real.map((t) => t.eve)).size, pages = Object.keys(S.pages).length;
  const open = openIssues(L), solved = solvedIssues(L), list = S.list.length;
  const units = S.list.reduce((s, e) => s + (e.units || 1), 0), deposits = S.list.reduce((s, e) => s + (e.deposit || 0), 0);
  const r = rev(L);
  const grade = r >= 4 && solved.length >= 5 && list >= 4 && pages >= 3 ? 4 : r >= 3 && hands >= 8 && solved.length >= 3 ? 3 : hands >= 3 || r >= 2 ? 2 : 1;
  return { grade, rev: r, hands, evenings, pages, fixes: S.fixes.length, open, solved, list, units, deposits, price: S.price, ...sp, margin: S.price - sp.bom, tooDear: S.dear };
}
// who to look for tonight: the regulars' hours, and who you told you'd be back
export function tonight(L) {
  const S = studio(L), eve = eveningOf(L);
  return Object.entries(REGULARS).map(([id, R]) => { const p = S.people[id]; return { id, from: R.from, to: R.to, met: !!p, promised: !!p && p.promised != null && p.promised <= eve, overdue: !!p && p.promised != null && p.promised < eve, tried: p ? p.rev : 0 }; });
}

// ---- the AI: data, a model, the NPU ----
// Once someone has said it loses them in the dark, every go on the promenade can be recorded (if they
// say yes: about three in four do). At a desk, the clips are labelled and a model trained (cloud GPU
// time, paid for), with three choices that pull against each other:
//   label      quick (1 h, noisier boxes) | careful (3 h)
//   size       tiny | small | base: accuracy against how fast it runs and what it costs the battery
//   precision  int8 (quantised for the NPU: fast, a little less accurate) | fp16 (slower, a bit more accurate)
// A run is judged on clips it didn't see: accuracy at night, latency on the NPU, battery. Shipped
// (a firmware version) it solves 'track' only if it's good enough to follow someone walking in the
// dark (ACC_OK, LAT_OK) and the NPU is on the board. Software & AI skill: training needs level 3,
// int8 on the NPU level 4; experience comes from every run and every shipped model.
export const CONSENT = 0.75, ACC_OK = 0.8, LAT_OK = 50;
export const MODEL = {
  tiny: { acc: 0.66, ms: 14, battery: 6, gpu: 12, hours: 1 },
  small: { acc: 0.75, ms: 28, battery: 12, gpu: 38, hours: 2 },
  base: { acc: 0.81, ms: 62, battery: 26, gpu: 140, hours: 4 },
};
export const LABEL = { quick: { acc: -0.03, hours: 1 }, careful: { acc: 0.03, hours: 3 } };
export const PRECISION = { int8: { acc: -0.015, ms: 1, battery: 1, ai: 4 }, fp16: { acc: 0, ms: 1.9, battery: 1.6, ai: 3 } };
export function aiState(L) { const S = studio(L); return (S.ai ||= { clips: [], runs: [], shipped: null }); }
export const clipsCount = (L) => aiState(L).clips.length;
export const shipped = (L) => { const A = (studio(L).ai || null); return A && A.shipped != null ? A.runs[A.shipped] || null : null; };
// what a run would come to (no randomness: the same choices on the same data give the same model)
export function predictRun(L, { label = 'careful', size = 'small', precision = 'int8', aiLevel = 3 } = {}) {
  const n = clipsCount(L), M = MODEL[size], P = PRECISION[precision], Lb = LABEL[label];
  const data = 0.14 * (1 - Math.exp(-n / 10));                          // more clips, better, with diminishing returns
  const acc = Math.max(0.3, Math.min(0.97, M.acc + data + Lb.acc + P.acc + 0.01 * Math.max(0, aiLevel - 3)));
  const ms = Math.round(M.ms * P.ms), battery = Math.round(M.battery * P.battery);
  return { acc: +acc.toFixed(3), ms, battery, gpu: M.gpu, hours: M.hours + Lb.hours, clips: n, ok: acc >= ACC_OK && ms <= LAT_OK };
}
export function canTrain(L, opts = {}, aiLevel = 3) {
  if (!hasProduct(L)) return { ok: false, reason: 'none' };
  if (!studio(L).found.track) return { ok: false, reason: 'unknown' };
  if (!studio(L).found.track.noted) return { ok: false, reason: 'unwritten' };
  if (clipsCount(L) < 4) return { ok: false, reason: 'data', need: 4 };
  if (aiLevel < 3) return { ok: false, reason: 'level', need: 3 };
  if (opts.precision === 'int8' && aiLevel < PRECISION.int8.ai) return { ok: false, reason: 'level', need: PRECISION.int8.ai };
  if (MODEL[opts.size || 'small'].gpu > balance(L, 'alipay')) return { ok: false, reason: 'money' };
  return { ok: true };
}
// train one: pays for the GPU time, logs the run -> { ok, run, index }
export function train(L, opts = {}, aiLevel = 3) {
  const c = canTrain(L, opts, aiLevel); if (!c.ok) return c;
  const r = predictRun(L, { ...opts, aiLevel }), p = pay(L, { method: 'alipay', amount: r.gpu, to: '云 GPU', memo: `训练 · ${opts.size || 'small'} · ${r.clips} 段素材`, kind: 'purchase' });
  if (!p.ok) return { ok: false, reason: 'money' };
  p.entry.memoEn = `Training · ${opts.size || 'small'} · ${r.clips} clips`;
  const A = aiState(L), run = { ...r, label: opts.label || 'careful', size: opts.size || 'small', precision: opts.precision || 'int8', at: stamp(L), eve: eveningOf(L) };
  A.runs.push(run);
  return { ok: true, run, index: A.runs.length - 1 };
}
// ship a run to the gimbal as a firmware version (the NPU must be on the board to run it)
export function deploy(L, index) {
  const A = aiState(L), run = A.runs[index], S = studio(L), g = gadget(L);
  if (!run || !g) return { ok: false, reason: 'run' };
  if (!has(S, 'npu')) return { ok: false, reason: 'npu' };
  if (A.shipped === index) return { ok: false, reason: 'done' };
  A.shipped = index; g.version = (g.version || 1) + 1;
  S.revs.push({ rev: g.version, at: stamp(L), eve: eveningOf(L), where: 'desk', fixes: ['model'], model: index });
  S.usedEve = eveningOf(L); S.used = 0;
  return { ok: true, rev: g.version, run, solves: run.ok };
}
