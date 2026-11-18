// Something of your own: the night gimbal's week (src/engine/studio.js, src/world/work.js), the
// dinner's reading of it (src/world/story.js) and saves from before it existed. npm test.
import { readFileSync } from 'node:fs';
import { createLife, stamp, skipTo, save, load, relation, nudge, balance } from '../src/engine/life.js';
import { maker, buyPart, startBuild, finishBuild, missing, gainXp } from '../src/engine/maker.js';
import { hear, aiState, train, deploy, predictRun, canTrain, clipsCount, studio, hasProduct, rev, specs, isOpen, fieldTest, anonTester, regularTester, batteryLeft, goesLeft, canWrite, writePage, canFix, knownFixes, revise, setPrice, summary, tonight, unwritten, quotable, machined, eveningOf,
  ISSUES, FIXES, REGULARS, BASE, BOM1, HEAVY_AT, TEST_MINUTES } from '../src/engine/studio.js';
import { ISSUE_TEXT, FIX_TEXT, QUOTES, REG, quoteOf, WORK_QUESTS, runWork, EN_WORK, dinnerWork, dinnerAfter, epilogue, workContext, needsArm } from '../src/world/work.js';
import { updateQuests, questState } from '../src/engine/quests.js';
import { QUESTS, dinnerScript, ending, ENDINGS, storyContext, D } from '../src/world/story.js';
import { enText } from '../src/world/agendaEn.js';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };      // a "random" that isn't
const build = (L, q = 0.8) => { for (const [k, n] of Object.entries(missing(L, 'gimbal'))) buyPart(L, k, n); return finishBuild(L, startBuild(L, 'gimbal').build, q); };
const at = (L, day, h, m = 0) => skipTo(L, D(day, h, m));
const go = (L, t, o = {}) => fieldTest(L, t, { rnd: seq(0.9, 0.1), ...o });
const anon = (p) => anonTester(p, () => 0.9);                              // cares in their listed order

// ---- nothing yet ----
{
  const L = createLife();
  ok(!hasProduct(L) && summary(L).grade === 0 && go(L, anon('office')).kind === 'none', 'before it exists there is nothing to lend, and nothing to weigh');
  ok(dinnerWork(L).length === 0 && dinnerScript(L).filter((b) => !Array.isArray(b)).length === 3, 'the dinner is the dinner it was: three questions');
  ok(epilogue(L, 'stay') === null && workContext(L) === '' && !/gimbal/.test(storyContext(L, 'yuan')), 'the endings and your friends say nothing about it');
}

// ---- the content is all there, in both languages ----
{
  const two = (b) => b && typeof b.zh === 'string' && b.zh && typeof b.en === 'string' && b.en;
  ok(ISSUES.every((i) => two(ISSUE_TEXT[i].name) && two(ISSUE_TEXT[i].note({ grams: 1, minutes: 1 })) && QUOTES[i].length === 2 && QUOTES[i].every(two)), 'every issue has a name, a note and two remarks');
  ok(Object.keys(FIXES).every((f) => two(FIX_TEXT[f]) && ISSUES.includes(FIXES[f].solves)), 'every fix has words and solves a real issue');
  ok(ISSUES.every((i) => Object.values(FIXES).some((F) => F.solves === i && F.at !== 'works')), 'every issue has a fix he can make himself');
  ok(Object.entries(REGULARS).every(([id, R]) => R.cares.every((c) => two(REG[id].says[c]) && two(REG[id].noticed[c])) && ['intro', 'promise', 'same', 'late', 'like', 'who', 'dadSays', 'name', 'hours'].every((k) => two(REG[id][k])) && two(REG[id].dear(299))), 'the three regulars have a line for everything they care about, before and after');
  const src = readFileSync(new URL('../src/world/work.js', import.meta.url), 'utf8');
  const posted = [...src.matchAll(/(?:text|follow): (?:hasProduct\(L\) \? )?'([^']+)'(?: : '([^']+)')?/g)].flatMap((m) => [m[1], m[2]]).filter(Boolean);
  const missingEn = posted.filter((t) => !EN_WORK[t]);
  ok(posted.length >= 25 && !missingEn.length, `every message has its English (${posted.length} lines${missingEn.length ? `; missing: ${missingEn.join(' | ')}` : ''})`);
  ok(enText('拿去，别摔了。') === "Take it. Don't drop it." && enText('到了吗？外滩风大，你那件薄外套不够的。') !== '到了吗？外滩风大，你那件薄外套不够的。', 'the phone finds them (and still finds the old ones)');
}

// ---- an evening: daylight, three goes, a flat battery ----
const L = createLife();
at(L, 2, 11); build(L);
ok(hasProduct(L) && rev(L) === 1 && specs(L).grams === BASE.grams && specs(L).minutes === BASE.minutes && specs(L).bom === BOM1 && BOM1 === 337, `version 1: ${specs(L).grams} g, ${specs(L).minutes} min, parts ¥${specs(L).bom}`);
ok(go(L, anon('elder')).kind === 'day' && summary(L).hands === 0, 'by daylight nobody can tell the difference (a gimbal for the night is judged at night)');
at(L, 2, 18);
const t1 = go(L, anon('elder')), t2 = go(L, anon('office')), t3 = go(L, anon('elder'));
ok(t1.kind === 'found' && t1.issue === 'heavy' && t2.kind === 'found' && t2.issue === 'fold' && t3.kind === 'again' && t3.issue === 'heavy', `three people: ${t1.issue} (new), ${t2.issue} (new), ${t3.issue} (again)`);
ok(goesLeft(L) === 0 && batteryLeft(L) === BASE.minutes - 3 * TEST_MINUTES, 'version 1 has three goes in it');
const t4 = go(L, anon('student'));
ok(t4.kind === 'dead' && t4.first && studio(L).found.battery.by === 'me', 'the fourth finds the battery flat: that one you find yourself');
ok(summary(L).hands === 3 && summary(L).grade === 2, 'three pairs of hands');
// ---- only what's written down can be fixed ----
ok(canFix(L, 'lighten').reason === 'unwritten' && canFix(L, 'sleeve').reason === 'unknown', 'you can\'t fix what you haven\'t heard, or haven\'t written down');
ok(unwritten(L).length === 3 && quotable(L).length === 3, 'three things heard, three remarks to choose a line from');
const w = writePage(L, { line: 0, plan: ['heavy', 'battery', 'fold'] });
ok(w.ok && w.page.hands === 3 && w.page.heard.length === 3 && w.page.line.issue === 'heavy' && w.page.plan.length === 2 && w.xp === 40, `the page: 3 people, 3 new things, a line underlined, two things for tomorrow (+${w.xp} XP)`);
ok(canWrite(L).reason === 'written' && quoteOf(w.page.line, L).zh === QUOTES.heavy[w.page.line.v].zh, 'one page an evening; the underlined line is what was said');
{ const M = load(save(L)); skipTo(M, stamp(M) + 20); M.flags.studio.used = 0; const more = go(M, anon('youngMan')); const c = canWrite(M), w2 = writePage(M);
  ok(more.issue === 'track' && c.ok && c.more && w2.ok && w2.xp === 10 && w2.page.heard.length === 4 && w2.page.line.issue === 'heavy' && canWrite(M).reason === 'written', 'something heard after you wrote: it goes onto the same page (the line you underlined stays)'); }
ok(canFix(L, 'lighten').ok && canFix(L, 'cell').ok && canFix(L, 'alloy').reason === 'works' && canFix(L, 'hinge').reason === 'level', 'now the fixes are open: the aluminium arm isn\'t his to make, the hinge needs Maker 3');
ok(canFix(L, 'lighten', 'desk').reason === 'where' && knownFixes(L).length === 5, 'hardware needs the bench');

// ---- the next day: a revision, and what it costs ----
at(L, 3, 10);
const w0 = balance(L, 'wechat');
ok(revise(L, ['lighten', 'cell', 'usbc']).reason === 'count', 'two changes at a sitting, no more');
const r2 = revise(L, ['lighten', 'cell'], 'bench', { quality: 0.9 });
ok(r2.ok && r2.rev === 2 && rev(L) === 2 && r2.hours === 3.5 && w0 - balance(L, 'wechat') === 79, `version 2: three and a half hours, ¥${w0 - balance(L, 'wechat')}`);
ok(specs(L).grams === 386 - 70 + 34 && specs(L).minutes === 205 && !isOpen(L, 'battery') && !isOpen(L, 'heavy'), `hollowed out, and the bigger cell eats half of what that saved: ${specs(L).grams} g, right at the limit (${HEAVY_AT})`);
ok(maker(L).gadgets.gimbal.quality > 0.8 && goesLeft(L) === 8, 'good joints, a full charge: eight goes tonight');

// ---- the regulars: a promise, the same version, the new one ----
at(L, 3, 17, 30);
const c1 = go(L, regularTester('chen'));
ok(c1.kind === 'found' && c1.issue === 'boot' && !c1.back && studio(L).people.chen.promised === eveningOf(L) + 1, 'Old Chen: light enough now, but it starts too slowly for the clock. "Bring it back when you\'ve changed it"');
ok(go(L, regularTester('chen')).kind === 'same' && studio(L).people.chen.promised != null, 'handing him the same version gets you nowhere (and isn\'t what you promised)');
ok(tonight(L).find((t) => t.id === 'chen').met && !tonight(L).find((t) => t.id === 'ye').met, 'tonight: who you know, who you don\'t');
at(L, 3, 19);
const y1 = go(L, regularTester('ye'));
ok(y1.kind === 'found' && y1.issue === 'clamp', 'Xiao Ye, who does this for a living, finds the clamp');
writePage(L, { line: 1 });
at(L, 3, 23, 30);
ok(revise(L, ['clamp'], 'desk').reason === 'where', 'the clamp is hardware: not at the hotel desk');
at(L, 4, 10);
ok(revise(L, ['clamp'], 'bench').ok && rev(L) === 3 && specs(L).grams === 356 && isOpen(L, 'heavy'), `version 3: the clamp. Six grams, and it is over the limit again (${specs(L).grams} g)`);
at(L, 4, 17, 30);
const c2 = go(L, regularTester('chen'));
ok(c2.back && c2.kept && c2.kind === 'again' && c2.issue === 'heavy' && c2.noticed.length === 0, 'you came back when you said; to his hands it is heavy again, and he says so');
at(L, 4, 19);
const y2 = go(L, regularTester('ye'));
ok(y2.noticed.includes('clamp') && y2.kind === 'found' && y2.issue === 'drift', `she notices the clamp, and finds the next thing (${y2.issue})`);
writePage(L, { line: 0 });
ok(revise(L, ['filter'], 'desk').ok && rev(L) === 4 && !isOpen(L, 'drift'), 'that night at the desk in 612: firmware, version 4');
// an evening of strangers
at(L, 5, 18);
const fifth = ['youngMan', 'office', 'visitor', 'student', 'youngMan', 'office'].map((p) => go(L, anon(p)).kind);
ok(fifth.join() === 'found,again,again,again,again,again' && summary(L).hands === 11, `the fifth evening, six strangers: ${fifth.join(', ')}`);
writePage(L, { line: 0 });
// a day late for Chen (he said the evening of day 5; you turn up on day 6)
at(L, 6, 17, 30);
const c3 = go(L, regularTester('chen'));
ok(c3.late && studio(L).people.chen.stood === 1, 'a day late: he waited, and says so');

// ---- someone it suits; the list; the price ----
{
  const M = load(save(L));                                                  // (a branch of this week)
  setPrice(M, 499);
  // (and in this branch he has done the AI: the NPU on the board, a model trained on twenty clips, shipped)
  { hear(M, 'track', 'ye'); M.flags.studio.found.track.noted = true; M.flags.studio.fixes.push({ id: 'npu', rev: rev(M), eve: eveningOf(M) }); aiState(M).clips.push(...Array.from({ length: 20 }, () => ({ eve: 0, who: 'anon', night: true })));
    M.flags.studio.used = 0; const t = train(M, { label: 'careful', size: 'small', precision: 'int8' }, 4); const d = deploy(M, t.index); M.flags.studio.used = 0;
    ok(t.ok && t.run.ok && d.ok && d.solves && !isOpen(M, 'track'), `the tracking model: ${Math.round(t.run.acc * 100)}% at night, ${t.run.ms} ms on the NPU: it follows people now`); }
  // everything Xiao Ye cares about is fixed in M: clamp, drift, battery (the real cell), tracking; hum isn't
  ok(go(M, regularTester('ye'), { minute: 19 * 60 }).issue === 'hum', 'her last complaint: the whine');
  writePage(M); revise(M, ['quiet'], 'desk');
  const b0 = balance(M, 'wechat');
  const y = go(M, regularTester('ye'), { minute: 19 * 60 });
  ok(y.kind === 'like' && y.listed && y.units === 2 && y.deposit === 400 && balance(M, 'wechat') - b0 === 400 && y.noticed.length === 3, 'nothing left to complain of: two units, and she insists on a deposit (in-game money)');
  ok(go(M, anon('student'), { minute: 19 * 60 }).issue === 'heavy', 'a student still finds it heavy');
  const dear = go(M, anon('youngMan'), { minute: 19 * 60 });
  ok(dear.kind === 'dear' && summary(M).tooDear === 1, 'a young man likes it, but not at ¥499');
  setPrice(M, 399);
  ok(go(M, anon('youngMan'), { minute: 19 * 60 }).listed && summary(M).list === 2 && summary(M).units === 3, 'at ¥399 he leaves his name');
  ok(summary(M).margin === 399 - specs(M).bom && specs(M).batch < specs(M).bom, `the sums: ¥399 against ¥${specs(M).bom} of parts (about ¥${specs(M).batch} at fifty sets)`);
}

// ---- the quest that teaches it ----
{
  const Q = createLife(), ctx = { player: { x: 0, y: 0, z: 0 } };
  const tick = () => updateQuests(Q, [...QUESTS, ...WORK_QUESTS], stamp(Q), ctx);
  tick(); ok(!questState(Q).list['own-work'], 'not on the first night');
  at(Q, 2, 9, 31); tick(); ok(questState(Q).list['own-work'].status === 'active' && questState(Q).tracked === 'first-night', 'it begins the morning of day 2, beside the story (a main quest stays tracked)');
  build(Q); at(Q, 2, 18); for (const p of ['elder', 'office', 'visitor']) go(Q, anon(p)); tick();
  ok(questState(Q).list['own-work'].step === 2, 'built, three people: next, write it up');
  writePage(Q); at(Q, 3, 10); revise(Q, ['lighten']); at(Q, 3, 18); go(Q, anon('elder')); tick();
  ok(questState(Q).list['own-work'].step === 5, 'a page, a second version, back out with it: the rest is up to you');
  Q.flags.dinnerChoice = 'stay'; tick();
  ok(questState(Q).list['own-work'].status === 'done', 'the dinner closes it, whatever version it reached');
  ok(WORK_QUESTS.every((q) => !QUESTS.some((s) => s.id === q.id)), 'a new quest id; the story\'s own are untouched');
}

// ---- messages ----
{
  const N = createLife(); N.threads.mum = { id: 'mum', title: '妈', members: [], kind: 'person', messages: [], unread: 0 };
  at(N, 2, 9, 31); ok(runWork(N).includes('w-kai1') && /打印机/.test(N.threads.kai.messages[0].text), 'Kai: the printers are free');
  build(N); at(N, 3, 16, 1); runWork(N);
  const m = N.threads.momo.messages.at(-1); ok(m.replies.length === 2 && m.replies[0].flag === 'lentMomo', 'Momo wants to borrow it');
  N.flags.lentMomo = true; runWork(N); at(N, 4, 9); const got = runWork(N);
  ok(got.includes('w-momo2') && studio(N).found.hum && studio(N).found.hum.by === 'momo', 'the morning after: he heard the whine before you did');
  at(N, 5, 20, 31); ok(runWork(N).includes('w-mum1'), 'Mum: Dad has been asking');
  ok(runWork(N).length === 0, 'each once');
}

// ---- Act III: what Dad makes of it ----
{
  const asks = (X) => dinnerScript(X).filter((b) => !Array.isArray(b));
  const A = createLife(); at(A, 2, 11); build(A, 0.5);                       // built once, never out of the building
  const a = asks(A);
  ok(a.length === 4 && a[2].ask[0].flag === 'showedWork' && a[2].ask[0].d <= 0 && a[2].ask[0].then.some((l) => /样件/.test(l[1])), `built and nothing else: "a sample, not a product" (${a[2].ask[0].d})`);
  ok(['stay', 'home', 'stay', 'silent'].join() === a[3].ask.map((o) => o.set).join(), 'the last question is the same four answers');
  const s = summary(L), b = asks(L)[2].ask[0];
  ok(s.grade === 3 && b.d >= 4 && b.then.some((l) => /一个一个/.test(l[1])) && b.then.some((l) => /6061/.test(l[1])) && b.then.some((l) => /画了线/.test(l[1])), `four versions, eleven hands, four pages: he reads all of it (${b.d >= 0 ? '+' : ''}${b.d}; grade ${s.grade})`);
  ok(b.then.every((l) => l.length === 3 && l[1] && l[2]) && b.then.filter((l) => l[0] === null).length >= 3, 'every line of it in both languages; you answer him');
  // the same answer, different work: what he says, and the ending
  const run = (X, show) => { relation(X, 'dad').affinity = 54; X.flags.dinnerStarted = true; const q = asks(X); if (show) { const o = q[2].ask[0]; nudge(X, 'dad', o.d); X.flags[o.flag] = true; } const o = q[q.length - 1].ask[0]; nudge(X, 'dad', o.d); if (o.flag) X.flags[o.flag] = true; X.flags.dinnerChoice = o.set; return { e: ending(X), then: o.then, X }; };
  const cold = run(load(save(A)), true), warm = run(load(save(L)), true), shy = run(load(save(L)), false);
  ok(cold.e === 'alone' && /随你/.test(cold.then[0][1]), '"I\'m staying", with a sample: "Suit yourself" (on your own)');
  ok(warm.e === 'stay' && /做好/.test(warm.then[0][1]) && /图纸/.test(warm.then[1][1]) && warm.X.flags.dadMachines, '"I\'m staying", with the real thing: "Then do it properly", and he asks for the arm\'s drawing (staying)');
  ok(shy.e === 'alone' && !shy.X.flags.dadMachines, 'the real thing left in your pocket: he never saw it');
  ok(needsArm(L) && dinnerAfter(warm.X, 'refused', true).replace, 'no demo, but your own thing on the table: "that one is yours"');
  // afterwards
  for (const id of Object.keys(ENDINGS)) { const e = epilogue(warm.X, id); ok(e && e.zh && e.en, `the "${id}" ending adds: ${e ? e.en.slice(0, 60) : '?'}...`); }
  // the afterwords read properly whoever is (or isn't) on the list
  { const variants = [warm.X, cold.X]; const one = load(save(warm.X)); one.flags.studio.list = [{ who: 'office', at: 0, eve: 5, units: 1, deposit: 0 }]; const many = load(save(warm.X)); many.flags.studio.list = [{ who: 'chen', at: 0, eve: 5, units: 1, deposit: 0 }, { who: 'ye', at: 0, eve: 5, units: 2, deposit: 400 }, { who: 'office', at: 0, eve: 5, units: 1, deposit: 0 }]; variants.push(one, many);
    const all = variants.flatMap((X) => Object.keys(ENDINGS).map((id) => epilogue(X, id))).filter(Boolean);
    const bad = all.filter((e) => /(^|[^0-9])0 个人| 0 people|\b1 people|\bundefined\b|NaN/.test(`${e.zh} ${e.en}`));
    ok(all.length === 24 && !bad.length, `24 afterwords across an empty list, one name and three: none says "0 people"${bad.length ? `: ${bad[0].en}` : ''}`); }
  warm.X.flags.ending = 'stay'; skipTo(warm.X, stamp(warm.X) + 10); runWork(warm.X); const g0 = specs(warm.X).grams; skipTo(warm.X, stamp(warm.X) + 2200);
  ok(runWork(warm.X).includes('w-arm') && specs(warm.X).grams === g0 - 38 && !isOpen(warm.X, 'heavy') && !machined(warm.X), `a day and a half later the arm comes back from Nanjing: ${specs(warm.X).grams} g`);
  ok(/version 4/.test(storyContext(L, 'yuan')) && storyContext(L, 'office') === '', 'your friends know what you\'re making; strangers don\'t');
}

// ---- saves ----
{
  // a save from before any of this: a gimbal built (version 1), no studio state, the story mid-way
  const old = createLife(); at(old, 4, 15); build(old, 0.7); delete old.flags.studio; old.quests = { list: { 'first-night': { status: 'done', step: 4, started: 0, finished: 9, skipped: [] } }, tracked: null, log: [] };
  const json = save(old); ok(!/studio/.test(json) && JSON.parse(json).v === 1, 'an old save has no studio in it');
  const O = load(json);
  ok(O && rev(O) === 1 && summary(O).grade === 1 && specs(O).grams === BASE.grams, 'it loads: the gimbal you built is version 1');
  const ev = updateQuests(O, [...QUESTS, ...WORK_QUESTS], stamp(O), { player: { x: 0, y: 0, z: 0 } });
  ok(ev.some((e) => e.id === 'own-work' && e.type === 'start') && O.quests.list['own-work'].step === 1 && O.quests.list['first-night'].status === 'done', 'the new quest starts where you are; the old ones are as they were');
  ok(runWork(O).includes('w-kai1') && dinnerScript(O).length > 0, 'the messages and the dinner work on it');
  const again = load(save(O)); ok(again && again.v === 1 && again.flags.studio && again.flags.studio.v === 1, 'and it saves in the same format (v 1), the new state inside flags');
  // an old save with nothing built
  const bare = load(save(createLife())); ok(bare && dinnerScript(bare).filter((b) => !Array.isArray(b)).length === 3 && epilogue(bare, 'home') === null, 'a save with no gimbal: nothing changes');
}

// ---- a real save from before (tests/fixtures/save-before-phase5.json: written by the previous code on day 3) ----
{
  const F = load(readFileSync(new URL('./fixtures/save-before-phase5.json', import.meta.url), 'utf8'));
  ok(F && F.v === 1 && !F.flags.studio && F.flags.maker.gadgets.gimbal.version === 1 && F.clock.day === 3, 'the fixture loads: day 3, a gimbal built, no studio state');
  const was = JSON.stringify(Object.fromEntries(Object.entries(F.quests.list).map(([k, v]) => [k, [v.status, v.step]]))), cash = JSON.stringify(F.wallet), people = JSON.stringify(F.relations);
  const ev = updateQuests(F, [...QUESTS, ...WORK_QUESTS], stamp(F), { player: { x: 0, y: 0, z: 0 } }); runWork(F);
  const now = Object.fromEntries(Object.entries(F.quests.list).filter(([k]) => k !== 'own-work').map(([k, v]) => [k, [v.status, v.step]]));
  ok(JSON.stringify(now) === was && JSON.stringify(F.wallet) === cash && JSON.stringify(F.relations) === people, `its quests, money and friendships are exactly as they were (${Object.keys(now).join(', ')})`);
  ok(ev.filter((e) => e.type === 'start').map((e) => e.id).join() === 'own-work' && F.quests.list['own-work'].step === 1 && F.threads.kai, 'the only new things: the side quest (already at "lend it"), and a message from Kai');
  at(F, 3, 18); const t = go(F, regularTester('chen'));
  ok(t.kind === 'found' && rev(F) === 1 && summary(F).hands === 1, 'and the week can start from there');
  const G = load(save(F)); ok(G && G.v === 1 && G.flags.studio.tests.length === 1, 'it saves and loads again');
}

// ---- a whole week, played two ways ----
function week(diligent) {
  const W = createLife(), rnd = seq(0.9, 0.1, 0.6, 0.3, 0.7);
  at(W, 2, 11); build(W, 0.8);
  if (!diligent) return W;
  const crowd = ['elder', 'office', 'youngMan', 'student', 'visitor', 'office', 'youngMan', 'elder'];
  const evening = (day) => { at(W, day, 17, 30); fieldTest(W, regularTester('chen'), { rnd }); at(W, day, 19); fieldTest(W, regularTester('ye'), { rnd }); for (const p of crowd) { if (goesLeft(W) < 2) break; fieldTest(W, anonTester(p, rnd), { rnd }); } at(W, day, 20, 30); fieldTest(W, regularTester('zhe'), { rnd }); writePage(W, { line: 0 }); };
  const best = (where) => knownFixes(W, where).filter((f) => f.can.ok && isOpen(W, f.solves, { strict: true })).filter((f, i, a) => a.findIndex((x) => x.solves === f.solves) === i).slice(0, 2).map((f) => f.id);
  evening(2); let ids = best('desk'); if (ids.length) revise(W, ids, 'desk');
  for (const day of [3, 4, 5]) { at(W, day, 10); gainXp(W, 60); ids = best('bench'); if (ids.length) revise(W, ids, 'bench', { quality: 0.8 }); evening(day); ids = best('desk').filter((id) => FIXES[id].at === 'desk'); if (ids.length) revise(W, ids, 'desk'); }
  at(W, 6, 12); ids = best('bench'); if (ids.length) revise(W, ids, 'bench');
  return W;
}
{
  const hard = summary(week(true)), idle = summary(week(false));
  ok(idle.grade === 1 && idle.rev === 1 && idle.hands === 0, 'build it and leave it: version 1, nobody\'s hands');
  ok(hard.grade >= 3 && hard.rev >= 5 && hard.pages === 4 && hard.hands >= 12 && hard.solved.length >= 5, `work at it every evening: version ${hard.rev}, ${hard.hands} hands, ${hard.solved.length} things put right, ${hard.open.length} still open, ${hard.list} on the list (grade ${hard.grade})`);
  ok(hard.list >= 1, 'and by the dinner somebody wants one');
}

// ---- the AI loop: clips, a model, the NPU ----
{
  const L = createLife(); build(L); at(L, 2, 19);
  ok(canTrain(L, {}, 4).reason === 'unknown', 'no model before anyone has said it loses them');
  hear(L, 'track', 'ye');
  ok(canTrain(L, {}, 4).reason === 'unwritten', '...nor before it is written down');
  L.flags.studio.found.track.noted = true;
  ok(canTrain(L, {}, 4).reason === 'data', 'and it needs clips: at least four');
  let clips = 0; for (let k = 0; k < 12; k++) { L.flags.studio.used = 0; const r = fieldTest(L, anon('office'), { rnd: seq(0.1, 0.5) }); if (r.clip) clips++; }
  ok(clips >= 10 && clipsCount(L) === clips, `every go on the promenade adds a clip if they agree (${clips} of 12)`);
  const tiny = predictRun(L, { size: 'tiny', precision: 'int8', aiLevel: 4 }), base = predictRun(L, { size: 'base', precision: 'fp16', aiLevel: 4 }), small = predictRun(L, { size: 'small', precision: 'int8', aiLevel: 4 });
  ok(tiny.acc < small.acc && small.acc < base.acc && tiny.ms < small.ms && small.ms < base.ms && tiny.battery < base.battery, 'bigger is more accurate, slower and hungrier');
  ok(!tiny.ok && !base.ok && small.ok, `the trade-off: tiny misses people (${Math.round(tiny.acc * 100)}%), base at fp16 is too slow (${base.ms} ms), small int8 is right`);
  ok(predictRun(L, { label: 'careful', aiLevel: 4 }).acc > predictRun(L, { label: 'quick', aiLevel: 4 }).acc, 'careful labelling beats quick');
  ok(canTrain(L, { precision: 'int8' }, 3).reason === 'level', 'quantising for the NPU takes Software & AI 4');
  const a0 = balance(L, 'alipay'), t = train(L, { size: 'small', precision: 'int8' }, 4);
  ok(t.ok && a0 - balance(L, 'alipay') === t.run.gpu, `a run costs cloud GPU time (¥${t.run.gpu})`);
  ok(deploy(L, t.index).reason === 'npu' && isOpen(L, 'track'), 'no NPU on the board: nothing to run it on');
  L.flags.studio.fixes.push({ id: 'npu', rev: rev(L), eve: eveningOf(L) });
  const m0 = specs(L).minutes, d = deploy(L, t.index);
  ok(d.ok && d.solves && !isOpen(L, 'track') && specs(L).minutes === m0 - t.run.battery, `shipped as version ${d.rev}: it follows people; it costs ${t.run.battery} minutes of battery`);
}
console.log(failed ? `\n${failed} FAILED` : '\nall passed'); process.exit(failed ? 1 : 0);
