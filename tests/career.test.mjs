// The working year (src/world/career.js, careerScenes.js, careerRoads.js, careerStory.js) played in
// node: every day at work, down every road, to every ending; both languages present for every line;
// salary, rent and the months between; the flat; the watch-repairer; and a six-day game left alone.
//   node tests/career.test.mjs
import { readFileSync, existsSync } from 'node:fs';
import { createLife, stamp, skipTo, answerInvite, relation, nudge, save, load, balance } from '../src/engine/life.js';
import { initYear, isYear, finalDay, career, rep, year, lifeContext, injure, dateText, actOf } from '../src/engine/year.js';
import { heart } from '../src/engine/hearts.js';
import { updateQuests, journal, questState } from '../src/engine/quests.js';
import { setupThreads, reply, deliverFollowUps, runAgenda } from '../src/world/agenda.js';
import { enText } from '../src/world/agendaEn.js';
import { QUESTS, runStoryBeats, D, dinnerScript, ending, ENDINGS, endingOf, afterword, storyContext } from '../src/world/story.js';
import { epilogue, runWork } from '../src/world/work.js';
import { systemPrompt, PERSONAS } from '../src/world/personas.js';
import { work, story, todaysWork, arriveAtWork, playScene, sceneLines, workFull, rollover, runCareer, careerEvent, careerTexts, recordHandoff, zhouMinHere, zhouMinScript,
  shortDate, dayName, passLine, hasFlat, home, startup, viable, canStay, FIRM_SCENES, ROADS, CAREER_NAMES, inLimbo, LISTINGS } from '../src/world/career.js';
import { careerContext, CAREER_PERSONAS, yearEpilogue } from '../src/world/careerStory.js';

let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const CJK = /[㐀-鿿]/;
const bad = [];                                        // lines missing a language
const both = (zh, en, where) => { if (typeof zh !== 'string' || typeof en !== 'string' || !zh.trim() || !en.trim() || !CJK.test(zh) || CJK.test(en) || /undefined|NaN|\[object/.test(zh + en)) bad.push(`${where}: ${zh} | ${en}`); };
const checkLines = (lines, where) => { for (const [who, zh, en] of lines) { both(zh, en, where); if (who && !CAREER_NAMES[who]) bad.push(`${where}: no name for "${who}"`); } };
const checkJournal = (L, where) => { const zh = journal(L, QUESTS, 'zh'), en = journal(L, QUESTS, 'en'); zh.forEach((q, i) => { both(q.title, en[i].title, `${where} quest ${q.id}`); both(q.summary, en[i].summary, `${where} quest ${q.id} summary`); q.steps.forEach((s, j) => both(s.text, en[i].steps[j].text, `${where} quest ${q.id}/${s.id}`)); }); };
const seenScenes = new Set();

// ---- a year, played ----
// road: consulting | resigned | laidoff | switched | startup | family; picks: { sceneId: [answer indices] }
function playYear({ road = 'consulting', picks = {}, absent = [], rent = null, end = 'stay', dadDelta = 0, demo = false, pouch = null, tell = 0, check = false } = {}) {
  const L = createLife(); setupThreads(L); initYear(L);
  const ctx = { player: { x: -80, y: 0.15, z: 0 } }, log = { rolls: [], scenes: [] };
  const tick = () => { runStoryBeats(L); runAgenda(L, () => 0.5); runWork(L); runCareer(L); deliverFollowUps(L); return updateQuests(L, QUESTS, stamp(L), ctx); };
  const to = (d, h, m = 0) => { skipTo(L, D(d, h, m)); const r = rollover(L); if (r) log.rolls.push(r); tick(); tick(); return r; };
  const answer = (threadId, flag) => { const t = L.threads[threadId]; if (!t) return false; for (const msg of t.messages.slice().reverse()) if (msg.replies && msg.replied == null) { const i = msg.replies.findIndex((r) => r.flag === flag); if (i >= 0) { reply(L, threadId, msg.id, i); tick(); return true; } } return false; };
  tick();
  if (pouch) recordHandoff(L, pouch);
  if (demo) { L.invites.push({ id: 'xuan-arm', from: 'xuan', status: 'accepted', at: D(2, 15), kept: true }, { id: 'xuan-demo', from: 'xuan', status: 'accepted', at: D(5, 15), kept: true }); L.flags.maker = { gadgets: { telemetry: { quality: 0.8 } } }; }
  const d12 = { consulting: 0, resigned: 1, laidoff: 2, switched: 3, startup: 1, family: 2 }[road];
  for (let d = 2; d <= 16; d++) {
    to(d, 9, 0);
    if (d === 4 && rent) { to(4, 9, 5); answer('agent', rent); to(4, 9, 10); }
    if (d === 8 && pouch && tell != null && zhouMinHere(L)) { const s = zhouMinScript(L); checkLines(s.filter(Array.isArray), 'zhou min'); const a = s.find((b) => !Array.isArray(b)).ask[tell]; both(a.zh, a.en, 'zhou min'); checkLines(a.then, 'zhou min'); }
    if (d === 13 && road === 'startup') { answer('xuan', 'goStartup'); }
    if (d === 13 && road === 'family') { answer('dad', 'goFamily'); }
    const t = todaysWork(L);
    if (!t || absent.includes(d)) continue;
    const w = arriveAtWork(L);
    if (check) { checkLines(sceneLines(L, w.def), `scene ${w.def.id}`); both(w.def.title.zh, w.def.title.en, `title ${w.def.id}`); both(w.def.place.zh, w.def.place.en, `place ${w.def.id}`); }
    seenScenes.add(w.def.id);
    const p = picks[w.def.id] || (w.def.id === 'd12' ? [d12] : []);
    checkLines(playScene(L, w.def, p), `played ${w.def.id}`); log.scenes.push(w.def.id);
    skipTo(L, workFull(L)); tick();
    if (check) checkJournal(L, `day ${d}`);
  }
  // Act V
  to(16, 19, 30); tick();
  const di = L.invites.find((i) => i.id === 'dad-dinner'); if (di) answerInvite(L, 'dad-dinner', true);
  nudge(L, 'dad', dadDelta);
  if (end === 'apart') { to(17, 21, 0); }
  else {
    to(17, 20, 0); L.flags.dinnerStarted = true; tick();
    const s = dinnerScript(L), choice = { stay: 0, alone: 0, home: 1, together: 2, open: 3 }[end];
    const asks = s.filter((b) => !Array.isArray(b));
    asks.forEach((b, i) => {
      const last = i === asks.length - 1, list = b.ask, a = list[last ? choice : 0];
      if (check) for (const o of list) { both(o.zh, o.en, 'dinner answer'); checkLines(o.then, 'dinner reply'); }
      nudge(L, 'dad', a.d || 0); if (a.flag) L.flags[a.flag] = true; if (last) L.flags.dinnerChoice = a.set;
    });
    if (check) checkLines(s.filter(Array.isArray), 'dinner');
    tick();
  }
  ctx.player = { x: 18, y: 3, z: -200 }; skipTo(L, D(17, 21, 55)); tick(); skipTo(L, D(17, 22, 1)); tick();
  if (check) checkJournal(L, 'end');
  return { L, log };
}

// ---- 1. the calendar ----
{
  const L = createLife(); initYear(L);
  ok(shortDate(L, 'zh') === '11 月 9 日 周一' && shortDate(L, 'en') === 'Mon 9 Nov' && shortDate(L, 'zh', 7) === '2027 年 1 月 11 日 周一' && shortDate(L, 'en', 17) === 'Sat 13 Nov 2027', `the date for the screens: ${shortDate(L, 'zh')} / ${shortDate(L, 'en', 17)}`);
  ok(dayName(L, 5).en === 'Friday 13 November' && dayName(createLife(), 5).zh === '第五天' && dayName(createLife(), 6).en === 'day 6', 'a day named in a sentence is a date in a year game and "day 5" in a six-day one');
  skipTo(L, D(6, 22, 0)); work(L).through = 6;
  ok(passLine(L, D(7, 7, 30), 'zh') === '2 个月后 · 2027 年 1 月 11 日 周一' && passLine(L, D(7, 7, 30), 'en') === '2 months later · Mon 11 Jan 2027', `sleeping across a gap, the fade says: ${passLine(L, D(7, 7, 30), 'zh')} / ${passLine(L, D(7, 7, 30), 'en')}`);
  skipTo(L, D(2, 22, 0)); L.clock.day = 2; ok(passLine(L, D(3, 7, 30), 'zh') === '' && passLine(createLife(), D(3, 7, 30)) === '', 'an ordinary night, or a six-day game: nothing added');
}

// ---- 2. a first week, the gap, the money ----
{
  const L = createLife(); setupThreads(L); initYear(L); const b0 = L.wallet.bank;
  skipTo(L, D(2, 9, 10)); ok(rollover(L).days === 1 && !rollover(L), 'a new day is rolled over once');
  const t = todaysWork(L);
  ok(t && t.def.id === 'd2' && t.where === 'firm' && t.via === 'lujiazui', 'Tuesday 10 November: due at the firm in Lujiazui');
  const st0 = career(L).standing, zw0 = heart(L, 'zhiwei').trust;
  arriveAtWork(L); playScene(L, t.def, [0, 0]);
  ok(career(L).standing === st0 + 5 && heart(L, 'zhiwei').trust === zw0 + 5 && heart(L, 'zhiwei').stage === 'known' && story(L).evalChecked && todaysWork(L).done, 'the first day: answers move how the firm sees him and how far Xu Zhiwei trusts him; she is met');
  ok(year(L).facts.some((f) => f.type === 'said' && f.scene === 'd2') && year(L).facts.some((f) => f.type === 'work' && f.what === 'day'), 'what he said and that he was there go on the ledger of facts');
  skipTo(L, workFull(L)); ok(L.clock.minute === 18 * 60 + 30 && career(L).standing === st0 + 6, 'staying to 18:30 counts for something');
  // Wednesday skipped
  skipTo(L, D(4, 9, 0)); const r = rollover(L);
  ok(r.absent.join() === '3' && career(L).standing === st0 + 6 - 8 && story(L).timeline === 'agree' && L.threads.proj.messages.some((m) => /怎么没来/.test(m.text)), `a working day skipped costs him (standing ${career(L).standing}); the decision is made without him; his manager writes`);
  skipTo(L, D(4, 11, 0)); const late = arriveAtWork(L);
  ok(late.late && career(L).standing === st0 - 4, 'and coming in at eleven is noticed');
  // the weekend, then the night that carries him to January
  skipTo(L, D(6, 22, 0)); rollover(L); const bank6 = L.wallet.bank;
  skipTo(L, D(7, 7, 30)); const jan = rollover(L);
  ok(jan.days === 58 && jan.gap.en === '2 months later' && jan.act && jan.act.n === 2 && jan.paid.filter((p) => p.type === 'salary').length === 2 && L.wallet.bank === bank6 + 84000, `January: ${jan.gap.zh}, Act II, two months of salary (¥${L.wallet.bank - bank6})`);
  ok(L.wallet.ledger.some((e) => e.to === '迈芬咨询' && e.memo === '工资' && e.memoEn === 'Salary') && year(L).home.rent === 36000 && L.threads.hr.messages.some((m) => /36,000/.test(m.text)), 'the salary is from the firm by name; the relocation allowance is over and the hotel is now his to pay');
  skipTo(L, D(9, 7, 30)); const feb = rollover(L);
  ok(feb.paid.some((p) => p.type === 'rent' && p.amount === 36000), 'and by February the hotel has charged him');
  ok(b0 > 0, 'ok');
}

// ---- 3. a flat, through the agent on Xinyu ----
{
  const { L } = playYear({ rent: 'rentNorthbund', road: 'consulting' });
  const H = home(L);
  ok(hasFlat(L) && H.id === 'northbund' && H.rent === 12800 && L.wallet.ledger.some((e) => e.kind === 'rent' && e.amount === -32000) && L.threads.agent.messages.some((m) => /门锁密码/.test(m.text)), 'answering the agent rents the North Bund flat: deposit, first month and fee leave the bank');
  const rents = L.wallet.ledger.filter((e) => e.memo === '房租');
  ok(rents.length >= 10 && rents.every((e) => e.amount === -12800) && year(L).facts.some((f) => f.type === 'home'), `rent then leaves with the months (${rents.length} payments over the year)`);
  ok(L.threads.yuan.messages.some((m) => /灰色的家具/.test(m.text)), 'Yu\'an hears about it');
  ok(/rented flat in the North Bund/.test(lifeContext(L)), 'and the people he talks to are told where he lives');
}

// ---- 4. every road to every ending ----
const ROAD_LIST = ['consulting', 'switched', 'startup', 'family', 'resigned', 'laidoff'];
const ENDS = ['together', 'stay', 'alone', 'home', 'open', 'apart'];
const dadFor = { together: 30, stay: 30, alone: -40, home: 0, open: 0, apart: 0 };
for (const road of ROAD_LIST) {
  const got = {}, after = {};
  for (const end of ENDS) {
    const demo = end === 'together' && ['consulting', 'resigned', 'laidoff'].includes(road);   // those roads reach "together" through the robot arm
    const { L } = playYear({ road, end, dadDelta: dadFor[end], demo, check: end === 'stay' });
    got[end] = L.flags.ending;
    const e = endingOf(L, L.flags.ending), a = afterword(L, L.flags.ending, epilogue(L, L.flags.ending));
    if (e) both(e.text.zh, e.text.en, `ending ${road}/${end}`); else bad.push(`no ending text ${road}/${end}`);
    if (a) both(a.zh, a.en, `afterword ${road}/${end}`);
    after[end] = a;
    if (end === 'stay') {
      const want = { consulting: 'consulting', switched: 'switched', startup: 'startup', family: 'family', resigned: 'resigned', laidoff: 'laidoff' }[road];
      ok(career(L).track === want, `${road}: the year ends on that road (${career(L).track}; standing ${career(L).standing}, name in the trade ${rep(L, 'work')})`);
      const Q = questState(L).list;
      ok(['act1-work', 'act2-project', 'act3-turning', 'act4-road', 'dinner', 'tide'].every((id) => Q[id] && Q[id].status === 'done'), `${road}: Acts I to V run start to finish (${['act1-work', 'act2-project', 'act3-turning', 'act4-road', 'dinner', 'tide'].map((id) => `${id}:${(Q[id] || {}).status}`).join(' ')})`);
      if (ROADS[road]) ok(work(L).road && work(L).road.n === 4, `${road}: four working days of Act IV played`);
      else ok(inLimbo(L) && !todaysWork(L, 14), `${road}: no employer and no road taken; nothing is forced`);
      ok(L.outbox.some((x) => x.type === 'ending'), `${road}: an ending is emitted`);
    }
  }
  ok(ENDS.every((e) => got[e] === e), `${road}: all six endings reachable (${ENDS.map((e) => `${e}→${got[e]}`).join(', ')})`);
  ok(['together', 'stay', 'alone', 'home'].every((e) => after[e] && after[e].zh.length > 8), `${road}: the card has an afterword for the road (stay: "${after.stay ? after.stay.en.slice(0, 70) : ''}...")`);
}
ok([...FIRM_SCENES.map((s) => s.id), ...Object.values(ROADS).flat().map((s) => s.id)].every((id) => seenScenes.has(id)), `every scene was played (${seenScenes.size})`);

// ---- 5. the start-up: books, a customer, "together" without the robot arm ----
{
  const a = playYear({ road: 'startup', end: 'together', dadDelta: 30, picks: { s1: [2, 0], s2: [1, 0], s3: [2], s4: [0] } });
  const s = startup(a.L);
  ok(s.name === 'One Reed' && s.product === 'qc' && s.customer === 'works' && s.funded === 300000 && s.contract === 200000 && viable(a.L), `One Reed: quality inspection, the family works as its first customer, ¥${Math.round(s.cash).toLocaleString()} in the account`);
  ok(a.L.flags.ending === 'together' && !a.L.flags.demoDone && /One Reed/.test(afterword(a.L, 'together').en), '"together" is reached through the start-up, with no robot-arm demo behind it');
  ok(a.L.wallet.ledger.some((e) => e.memoEn === 'Paid-in capital' && e.amount === -300000) && a.log.rolls.some((r) => r.paid.some((p) => p.type === 'burn')), 'the paid-in capital left his bank; the company spends by the month');
  const b = playYear({ road: 'startup', end: 'together', dadDelta: 30, picks: { s1: [0, 1], s2: [3, 3], s3: [2], s4: [0] } });
  ok(!viable(b.L) && b.L.flags.ending !== 'together', 'with no customer it does not convince him');
  const c = playYear({ road: 'startup', end: 'stay', dadDelta: 30, picks: { s2: [0, 2], s3: [1] } });
  ok(startup(c.L).investor === 'wang-ratchet' && startup(c.L).hire === 'linyi' && startup(c.L).royalty && /start-up \(Shoreline\)/.test(lifeContext(c.L)), 'another way through: the arm team as customer, a dear hire, Mr Wang with a ratchet');
}

// ---- 6. Act III: what decides who may stay ----
{
  const sign = playYear({ road: 'consulting', picks: { d9: [2], d11: [1] } });
  ok(['senior consultant', 'manager'].includes(career(sign.L).title) && career(sign.L).salary === 48000 && story(sign.L).taoke === 'blamed' && relation(sign.L, 'taoke').affinity < relation(playYear({ road: 'consulting' }).L, 'taoke').affinity - 10, 'signing the memorandum keeps him and promotes him, and costs Tao Ke her name');
  const gave = playYear({ road: 'laidoff' });
  ok(story(gave.L).gavePlace && story(gave.L).taoke === 'stays' && story(gave.L).severance === 147000 && gave.L.threads.taoke.messages.some((m) => /是你，对不对/.test(m.text)), 'on the list in her place: N+3 paid, and she works it out');
  const low = playYear({ road: 'consulting', absent: [3, 4, 5, 7, 8], picks: { d2: [2, 2], d9: [3], d10: [3], d11: [2] } });
  ok(career(low.L).track === 'laidoff' && !story(low.L).gavePlace, `days skipped and nothing stood up for: he asks to stay and is laid off anyway (standing ${career(low.L).standing})`);
  const noShow = playYear({ road: 'consulting', absent: [12] });
  ok(work(noShow.L).applied === 12 && ['consulting', 'laidoff'].includes(career(noShow.L).track) && story(noShow.L).noShow, 'not turning up on the Tuesday: it is settled without him');
  const noGu = playYear({ road: 'switched', picks: { d3: [1, 1], d8: [1] } });
  ok(!story(noGu.L).guOffer && career(noGu.L).track !== 'switched', 'no offer from Gu Lei unless he earned it');
  const fam = playYear({ road: 'family', end: 'home' });
  ok(career(fam.L).employer === "Ji's Precision Works" && fam.L.wallet.ledger.some((e) => e.to === '纪氏精工' && e.memo === '工资'), 'the family road pays a salary from the works');
}

// ---- 7. what elsewhere does to his name at work ----
{
  const L = createLife(); setupThreads(L); initYear(L); skipTo(L, D(2, 9, 0)); rollover(L);
  const s0 = career(L).standing, r0 = rep(L, 'work');
  const e = careerEvent(L, 'fight-seen', { by: 'shaofeng', where: 'Hankou Road' });
  ok(e.standing === s0 - 6 && e.rep === r0 - 4 && L.threads.hr.messages.some((m) => /冲突/.test(m.text)) && careerEvent(L, 'nonsense') === null && careerEvent(createLife(), 'praise') === null, 'careerEvent: a fight seen by a colleague goes on file');
  injure(L, 2, 'a split lip'); arriveAtWork(L);
  ok(career(L).standing === s0 - 8 && work(L).days[2].hurt === 2, 'turning up hurt is noticed at the door');
  ok(careerEvent(L, 'praise', { delta: 4, why: 'a client letter' }).standing === s0 - 4, 'and praise counts too');
}

// ---- 8. the watch-repairer ----
{
  const opened = playYear({ pouch: 'opened', tell: null });
  // (the scene itself is played in the world; here its script is run as the game would)
  const play = (outcome, pick, extra) => { const L = createLife(); setupThreads(L); initYear(L); recordHandoff(L, outcome, extra); const tick = () => { runCareer(L); deliverFollowUps(L); updateQuests(L, QUESTS, stamp(L), { player: { x: 0, y: 0, z: 0 } }); };
    skipTo(L, D(8, 12, 0)); rollover(L); tick(); const here = zhouMinHere(L); const s = zhouMinScript(L); const a = s.find((b) => !Array.isArray(b)).ask[pick]; void a.then; tick();
    skipTo(L, D(13, 19, 30)); rollover(L); tick(); tick(); return { L, here }; };
  const a = play('opened', 0), b = play('sealed', 0), c = play('opened', 1);
  ok(a.here && work(a.L).watch.result === 'saved' && /摊子保住了/.test(a.L.threads.zhoumin.messages.at(-1).text) && rep(a.L, 'street') > rep(b.L, 'street'), 'seal broken, and he tells her the date on the page: the forged transfer is undone and the stall saved');
  ok(work(b.L).watch.result === 'lost' && /摊子没保住/.test(b.L.threads.zhoumin.messages.at(-1).text), 'seal intact: he can only say that he carried it; the stall is lost');
  ok(work(c.L).watch.result === 'lost', 'seal broken but he keeps what he read to himself: lost as well');
  // he saw the man who left the pouch (Mission One's courier): one more true thing he can say
  const d = play('sealed', 0, { saw: true }), e = play('sealed', 1, { saw: true }), f = play('opened', 0, { saw: true });
  const askOf = (outcome, extra) => { const L = createLife(); setupThreads(L); initYear(L); recordHandoff(L, outcome, extra); skipTo(L, D(8, 12, 0)); rollover(L); return zhouMinScript(L).find((b) => !Array.isArray(b)).ask; };
  ok(askOf('sealed', { saw: true }).length === 3 && askOf('sealed').length === 2 && askOf('opened', { saw: true }).length === 2, 'seeing him adds an answer to a sealed pouch; an opened one folds it into the date');
  ok(/申礼/.test(askOf('opened', { saw: true })[0].zh) && !/申礼/.test(askOf('opened')[0].zh), '...which then mentions the red Shenli carrier too');
  ok(work(d.L).watch.result === 'held' && /冻结/.test(d.L.threads.zhoumin.messages.at(-1).text) && rep(d.L, 'street') > rep(b.L, 'street'), 'seal intact but he saw and told: the transfer is frozen, the stall held (between saved and lost)');
  ok(work(e.L).watch.result === 'lost', 'seal intact, saw him, but chose to tell her about the seal only: still lost');
  ok(work(f.L).watch.result === 'saved', 'opened and saw: the date saves it, as before');
  const q = (L) => journal(L, QUESTS, 'en').find((x) => x.id === 'watch-repairer');
  ok(/frozen/.test(q(d.L).summary), 'the journal says the pitch is frozen');
  ok(q(a.L) && !q(a.L).main && q(a.L).status === 'done' && /stall is saved/.test(q(a.L).summary) && /stall is gone/.test(q(b.L).summary), 'the journal keeps it as a side story, with how it came out');
  ok(work(opened.L).watch.result === 'lost' && work(opened.L).watch.unmet && /new sign/.test(q(opened.L).summary), 'never going back to the stall: it simply changes hands');
  const old = createLife(); recordHandoff(old, 'sealed'); updateQuests(old, QUESTS, stamp(old), { player: { x: 0, y: 0, z: 0 } });
  ok(old.flags.handoff.outcome === 'sealed' && journal(old, QUESTS, 'zh').find((x) => x.id === 'watch-repairer') && recordHandoff(old, 'opened').outcome === 'sealed', 'a six-day game remembers the pouch too, and the first outcome stands');
}

// ---- 8b. the first evening is one path: little on the phone until the pouch and the hotel ----
{
  const { runRomance } = await import('../src/world/romance.js');
  const evening = ({ rail = null, room = null, gig = false } = {}) => {
    const L = createLife(); setupThreads(L); initYear(L);
    const t0 = L.flags.t0, calls = [], tick = () => { runStoryBeats(L); runAgenda(L, () => 0.5); runCareer(L); runRomance(L); deliverFollowUps(L); updateQuests(L, QUESTS, stamp(L), { player: { x: -80, y: 0.15, z: 0 } }); for (const e of L.outbox.splice(0)) if (e.type === 'call') calls.push({ ...e }); };
    for (let m = t0; m <= D(1, 23, 50); m += 2) {
      skipTo(L, m);
      if (rail != null && m >= t0 + rail) L.flags.sawRiver = true;
      if (room != null && m >= t0 + room && !L.flags.room612) { L.flags.room612 = true; L.flags.room612At = stamp(L); }
      if (gig) { const i = L.invites.find((x) => x.id === 'momo-gig'); if (i && i.status === 'pending') answerInvite(L, 'momo-gig', true); if (i && stamp(L) >= i.at + 30) i.kept = true; }
      tick();
    }
    return { L, t0, calls };
  };
  const a = evening({ rail: 4, room: 30, gig: true });
  const dadCall = a.calls.find((c) => c.script === 'dad-arrival');
  ok(dadCall && dadCall.at <= a.t0 + 6, `Dad rings when he reaches the railing (${dadCall && dadCall.at - a.t0} min in)`);
  ok(!a.L.threads.zhixia.messages.some((m) => /天马/.test(m.text)) && !a.L.invites.some((i) => i.id === 'yinuo-flat'), "Zhixia's car pitch and Yinuo's flat viewing wait for Tuesday");
  const gig = a.L.invites.find((i) => i.id === 'momo-gig');
  ok(gig && gig.at === D(1, 20, 0), "Momo's set is at eight, after check-in");
  ok(a.L.invites.some((i) => i.id === 'xuan-arm' && i.text.startsWith('明天')), 'with the set behind him, Mingxuan writes about the robot arm that night');
  const q = questState(a.L).list['act1-work'];
  ok(q && q.started <= a.t0 + 32, 'the first week at the firm begins in room 612');
  ok(!a.L.threads.wuhu.messages.some((m) => /排练|生煎|测试台|地砖|开会开到/.test(m.text)), 'no background chatter on the first evening');
  const b = evening();
  const late = b.calls.find((c) => c.script === 'dad-arrival');
  ok(late && late.at === b.t0 + 40, 'never at the railing: Dad still rings, forty game minutes in');
  ok(!b.L.invites.some((i) => i.id === 'xuan-arm'), 'no set: Mingxuan waits for the morning');
  const unread = Object.values(a.L.threads).reduce((n, t) => n + t.messages.filter((m) => m.from !== 'me' && m.at > a.t0 && m.at < D(1, 19, 30)).length, 0);
  ok(unread <= 12, `messages before 19:30 on the first evening: ${unread} (was 18)`);
  skipTo(b.L, D(2, 13, 0)); runAgenda(b.L, () => 0.5);
  ok(b.L.invites.some((i) => i.id === 'xuan-arm' && i.text.startsWith('今天')) && b.L.threads.zhixia.messages.some((m) => /天马/.test(m.text)), 'Tuesday: the robot arm (today, three) and Zhixia');
}

// ---- 9. free conversation is told the facts, and told to keep to them ----
{
  const { L } = playYear({ road: 'startup', end: 'stay', dadDelta: 30, rent: 'rentTilanqiao' });
  const forDad = storyContext(L, 'dad'), forTao = storyContext(L, 'taoke'), sys = systemPrompt('taoke', forTao, { lang: 'en' });
  ok(/November 2027/.test(forDad) && /start-up/.test(forDad) && /Things that have really happened/.test(forDad) && /rented flat/.test(forDad), 'his father is told the month, the road, the flat, and the ledger of what happened');
  ok(/Marlowe Finch/.test(forTao) && /he resigned/.test(forTao) && /he said: "/.test(forTao), 'a colleague is told what he said in the rooms she was in');
  ok(/do not invent/.test(sys) && /nothing you say changes/.test(sys) && PERSONAS.taoke && PERSONAS.partner && !CAREER_PERSONAS.zhiwei, 'the system prompt: only the listed facts, nothing invented, nothing changed (and Xu Zhiwei\'s card is not ours)');
  ok(storyContext(L, 'office') === '' && careerContext(createLife(), 'dad') === '', 'a stranger is told nothing; a six-day game adds nothing');
  const before = save(L); storyContext(L, 'dad'); careerContext(L, 'gu'); ok(save(L) === before, 'being told changes nothing in the game');
}

// ---- 10. both languages, everywhere ----
for (const [zh, en] of careerTexts()) { both(zh, en, 'message'); if (enText(zh) !== en) bad.push(`phone English missing: ${zh}`); }
for (const [id, p] of Object.entries(LISTINGS)) both(p.zh, p.en, `listing ${id}`);
for (const id of ENDS) { both(ENDINGS[id].title.zh, ENDINGS[id].title.en, `ending title ${id}`); }
ok(bad.length === 0, `every line, answer, quest step, message and ending has both languages (${bad.length ? `${bad.length} missing: ${bad.slice(0, 4).join(' || ')}` : 'checked'})`);

// ---- 11. a game begun before the year existed ----
{
  const fx = new URL('./fixtures/save-before-phase5.json', import.meta.url);
  const L = existsSync(fx) ? load(readFileSync(fx, 'utf8')) : createLife();
  const ctx = { player: { x: -80, y: 0.15, z: 0 } }, tick = () => { runStoryBeats(L); runCareer(L); return updateQuests(L, QUESTS, stamp(L), ctx); };
  const day0 = L.clock.day; tick();
  ok(!isYear(L) && finalDay(L) === 6 && rollover(L) === null && todaysWork(L) === null && runCareer(L).length === 0 && careerEvent(L, 'praise') === null && shortDate(L, 'en') === `Day ${day0}`, `an old six-day save (day ${day0}) is left alone by the year`);
  ok(!Object.keys(L.quests.list).some((id) => /^act\d/.test(id)), 'none of the year\'s quests begin in it');
  L.flags.calls = [{ from: 'dad', script: 'dad-arrival', missed: false }, { from: 'dad', script: 'dad-plans', missed: false }]; L.flags.hotelKey = true; L.flags.room612 = true; L.flags.sawRiver = true;
  skipTo(L, D(5, 19, 30)); tick(); tick();
  const di = L.invites.find((i) => i.id === 'dad-dinner'); ok(di && di.at === D(6, 20) && /后天/.test(L.threads.dad.messages.at(-2).text), 'its dinner is still on day 6');
  answerInvite(L, 'dad-dinner', true); skipTo(L, D(6, 20)); L.flags.dinnerStarted = true; tick();
  const s = dinnerScript(L), asks = s.filter((b) => !Array.isArray(b)), last = asks.at(-1).ask[1];
  ok(s.some((b) => Array.isArray(b) && /五十五了/.test(b[1])), 'and it is the old dinner');
  nudge(L, 'dad', last.d); L.flags.dinnerChoice = last.set; tick();
  ctx.player = { x: 18, y: 3, z: -200 }; skipTo(L, D(6, 21, 55)); tick(); skipTo(L, D(6, 22, 1)); tick();
  ok(L.flags.ending === 'home' && endingOf(L, 'home') === ENDINGS.home && yearEpilogue(L, 'home') === null && load(save(L)).v === 1, `which still reaches its ending (${L.flags.ending}) with the old text, and saves as v1`);
  const j = journal(L, QUESTS, 'en'); ok(j.find((q) => q.id === 'dinner').act === 5 && j.find((q) => q.id === 'first-night').act === 1, 'its quests are numbered by the five acts');
}
console.log(failed ? `\n${failed} FAILED` : '\nall passed'); process.exit(failed ? 1 : 0);
