// A whole year played in node, with everything the game does between the days (the integration test):
// work every day (src/world/career.js), the story beats, the agenda, romance (her scenes when she's about, her
// messages answered), the season plan on every long gap (engine/allot.js, as ui/season.js would apply it), what a
// launch leaves to decide, the character page built every day in both languages, every day's state through
// save -> load, and at the end the ending, its time variant and the afterword. Four ways of spending a year on
// three roads: each must finish without an error, and they must not all come out the same.
//   node tests/yearplay.test.mjs
import { createLife, stamp, skipTo, answerInvite, nudge, save, load } from '../src/engine/life.js';
import { initYear, career } from '../src/engine/year.js';
import { heart, meet, feel } from '../src/engine/hearts.js';
import { updateQuests } from '../src/engine/quests.js';
import { maker } from '../src/engine/maker.js';
import { studio } from '../src/engine/studio.js';
import { gainSkill } from '../src/engine/skills.js';
import { allot, seasonBudget, applySeason, candidates, profile, USES } from '../src/engine/allot.js';
import { setupThreads, deliverFollowUps, runAgenda } from '../src/world/agenda.js';
import { QUESTS, runStoryBeats, D, dinnerScript, ending, endingOf } from '../src/world/story.js';
import { runWork } from '../src/world/work.js';
import { todaysWork, arriveAtWork, playScene, workFull, rollover, runCareer } from '../src/world/career.js';
import { runRomance, sceneNow, startScene, endScene } from '../src/world/romance.js';
import { seasonAftermath, pendingChoices, choose, timeVariant, timeAfterword } from '../src/world/allotEvents.js';
import { profileView, nowLines, moodOf } from '../src/world/profileView.js';

let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const CJK = /[㐀-鿿]/, BAD = /undefined|NaN|\[object|null/;
const problems = [];
const text = (b, where) => { if (!b || typeof b.zh !== 'string' || typeof b.en !== 'string' || !CJK.test(b.zh) || CJK.test(b.en) || BAD.test(b.zh + b.en)) problems.push(`${where}: ${JSON.stringify(b)}`); };

const STYLES = {
  maker: { make: 0.62, love: 0.06, friends: 0.06, business: 0.1, rest: 0.16 },
  lover: { make: 0.12, love: 0.42, friends: 0.2, business: 0.06, rest: 0.2 },
  balanced: { make: 0.3, love: 0.18, friends: 0.14, business: 0.2, rest: 0.18 },
  hustler: { make: 0.46, love: 0, friends: 0, business: 0.54, rest: 0 },
};
// the night gimbal, built and field-tested (what the playable week's bench and the Bund evenings make)
function buildGimbal(L) {
  const m = maker(L); m.gadgets = { ...(m.gadgets || {}), gimbal: { version: 3, quality: 0.85, at: stamp(L) } };
  const S = studio(L); S.found = { grip: 1, clamp: 1, boot: 1 }; S.fixes = [{ id: 'sleeve' }, { id: 'clamp' }, { id: 'quickboot' }];
  S.tests = Array.from({ length: 9 }, (_, i) => ({ who: 'anon', kind: 'ok', eve: i }));
  S.list = [{ who: 'a', units: 1 }, { who: 'b', units: 2 }, { who: 'c', units: 1 }, { who: 'd', units: 1 }];
}

function playYear({ style, road = 'consulting', lover = 'nanxing', end = 'stay' }) {
  const L = createLife(); setupThreads(L); initYear(L);
  const ctx = { player: { x: -80, y: 0.15, z: 0 } }, log = { seasons: [], lines: [], days: 0, errors: [] };
  const tick = () => { runStoryBeats(L); runAgenda(L, () => 0.5); runWork(L); runCareer(L); runRomance(L); deliverFollowUps(L); return updateQuests(L, QUESTS, stamp(L), ctx); };
  // the season plan, as ui/season.js applies it: the style's shares of the evenings, the person he's seeing
  function season(days, at) {
    const B = seasonBudget(L, days), share = STYLES[style], plan = { lover: candidates(L).includes(lover) ? lover : candidates(L)[0] || null };
    for (const u of USES) plan[u] = Math.floor(B.evenings * share[u]);
    if (!plan.lover) { plan.rest += plan.love; plan.love = 0; }
    plan.rest += B.evenings - USES.reduce((s, u) => s + plan[u], 0);
    const r = applySeason(L, plan, days);
    if (!r.ok) { log.errors.push(`season day ${at}: ${r.reason}`); return; }
    const lines = seasonAftermath(L, r.events); lines.forEach((b) => text(b, `${style}/${road} season ${at}`)); log.lines.push(...lines);
    for (let c = pendingChoices(L), n = 0; c.length && n < 5; c = pendingChoices(L), n++) { c[0].options.forEach((o) => { text(o, 'choice'); text(o.note, 'choice note'); }); choose(L, c[0].id, c[0].options[0].id); }
    log.seasons.push({ day: at, days, events: r.events.map((e) => e.type) });
  }
  const to = (d, h, m = 0) => { skipTo(L, D(d, h, m)); const r = rollover(L); if (r && r.days >= 14) season(r.days, d); tick(); tick(); return r; };
  // every day: the character page (both languages) and the save
  function check(d) {
    for (const lang of ['zh', 'en']) {
      const V = profileView(L, QUESTS, lang);
      if (!V.me.name || !V.skills.length || V.people.some((p) => !p.name || BAD.test(p.name))) log.errors.push(`profile ${lang} day ${d}`);
      nowLines(L, V, lang).forEach((l) => { if (BAD.test(l)) log.errors.push(`now line day ${d}: ${l}`); });
      if (!moodOf(L, V)) log.errors.push(`mood day ${d}`);
    }
    const s = save(L), back = load(s);
    if (save(back) !== s) log.errors.push(`save/load day ${d}`);
  }
  tick();
  if (style !== 'lover') buildGimbal(L);
  gainSkill(L, 'product', 300, 'year'); gainSkill(L, 'hw', 350, 'year');
  meet(L, lover); feel(L, lover, { attraction: 20, trust: 20 }, 'met');
  const d12 = { consulting: 0, startup: 1, family: 2 }[road];
  for (let d = 2; d <= 16; d++) {
    to(d, 9, 0); log.days++;
    if (d === 13 && road === 'startup') { const t = L.threads.xuan; if (t) for (const msg of t.messages) if (msg.replies && msg.replied == null) { const i = msg.replies.findIndex((r) => r.flag === 'goStartup'); if (i >= 0) msg.replied = i; } }
    const t = todaysWork(L);
    if (t) { const w = arriveAtWork(L); playScene(L, w.def, w.def.id === 'd12' ? [d12] : []); skipTo(L, workFull(L)); tick(); }
    // the evening: her scene if she's about and he's that kind of player
    if (style === 'lover' || style === 'balanced') { const id = sceneNow(L, lover); if (id) { try { startScene(L, id); endScene(L, id); } catch (e) { log.errors.push(`scene ${id}: ${e.message}`); } } }
    check(d);
  }
  // Act V: the dinner
  to(16, 19, 30);
  if (L.invites.find((i) => i.id === 'dad-dinner')) answerInvite(L, 'dad-dinner', true);
  to(17, 20, 0); L.flags.dinnerStarted = true; tick();
  const s = dinnerScript(L), asks = s.filter((b) => !Array.isArray(b)), choice = { stay: 0, home: 1, together: 2, open: 3 }[end];
  asks.forEach((b, i) => { const last = i === asks.length - 1, a = b.ask[last ? choice : 0]; nudge(L, 'dad', a.d || 0); if (a.flag) L.flags[a.flag] = true; if (last) L.flags.dinnerChoice = a.set; });
  ctx.player = { x: 18, y: 3, z: -200 }; skipTo(L, D(17, 21, 55)); tick(); skipTo(L, D(17, 22, 1)); tick();
  check(17);
  const id = ending(L), e = endingOf(L, id), v = timeVariant(L), aft = timeAfterword(L);
  if (!e) log.errors.push(`no ending for ${id}`); else { text(e.title, 'ending title'); text(e.text, 'ending text'); }
  if (v) { text(v.title, 'variant title'); text(v.text, 'variant text'); }
  if (aft) text(aft, 'afterword');
  return { L, log, id, variant: v && v.id, P: profile(L), h: heart(L, lover), track: career(L).track };
}

const runs = [];
for (const [style, road, end] of [['maker', 'consulting', 'stay'], ['lover', 'consulting', 'together'], ['balanced', 'startup', 'stay'], ['hustler', 'startup', 'home'], ['balanced', 'family', 'together'], ['maker', 'startup', 'open']]) {
  let r;
  try { r = playYear({ style, road, end }); } catch (err) { ok(false, `${style} on the ${road} road: threw ${err.stack.split('\n').slice(0, 3).join(' | ')}`); continue; }
  runs.push({ style, road, ...r });
  const ms = Object.keys(r.P.milestones).join('+') || 'none';
  ok(!r.log.errors.length, `${style} on the ${road} road: ${r.log.days} days, ${r.log.seasons.length} seasons, ending "${r.id}"${r.variant ? ` (${r.variant})` : ''}, project ${ms}, burnout ${r.P.burnout}, her: ${r.h.stage}${r.log.errors.length ? ` · ${r.log.errors.slice(0, 3).join('; ')}` : ''}`);
}
ok(runs.length === 6 && runs.every((r) => r.log.seasons.length >= 3), `every year meets its long gaps with a season plan (${runs.map((r) => r.log.seasons.length).join(', ')})`);
ok(runs.some((r) => r.P.milestones.launch), 'someone launches the gimbal');
ok(runs.some((r) => r.P.burnout >= 1), 'someone burns out');
ok(runs.some((r) => r.variant), `a time variant is told over an ending (${runs.map((r) => r.variant || '-').join(', ')})`);
ok(new Set(runs.map((r) => `${r.id}|${r.variant}|${!!r.P.milestones.launch}|${r.h.stage}`)).size >= 4, 'the years come out differently');
ok(!problems.length, `every season line, choice and ending in both languages${problems.length ? `: ${problems.slice(0, 4).join(' · ')}` : ''}`);
console.log(failed ? `\n${failed} FAILED` : '\nall passed'); process.exit(failed ? 1 : 0);
