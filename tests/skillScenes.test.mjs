// What Ji Bai says where his three skills meet (engine/skills.js): the robot-arm review and the
// demo upstairs (world/destScripts.js), the morning after (world/story.js), the firm's AI work
// (world/careerScenes.js), and the rules for answers that need or teach a skill (world/skillChoices.js).
//   node tests/skillScenes.test.mjs
import { createLife, stamp, skipTo, relation } from '../src/engine/life.js';
import { skillXp, skillLevel, gainSkill } from '../src/engine/skills.js';
import { maker } from '../src/engine/maker.js';
import { initYear } from '../src/engine/year.js';
import { setupThreads } from '../src/world/agenda.js';
import { enText } from '../src/world/agendaEn.js';
import { runStoryBeats, D, storyContext, ARM_NEWS } from '../src/world/story.js';
import { XUAN, XUAN_DEMO, YINUO, SCRIPTS, armRoute, choose, answers, armNote } from '../src/world/destScripts.js';
import { visible, award, gainText } from '../src/world/skillChoices.js';
import { story, playScene, sceneLines, FIRM_SCENES, ROADS, CAREER_NAMES } from '../src/world/career.js';

let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const CJK = /[㐀-鿿]/, bad = [];
const both = (zh, en, where) => { if (typeof zh !== 'string' || typeof en !== 'string' || !CJK.test(zh) || CJK.test(en) || !en.trim()) bad.push(`${where}: ${zh} | ${en}`); };
const asks = (s) => s.filter((b) => !Array.isArray(b));
const flagged = (ask, flag) => ask.find((a) => a.flag === flag);

// ---- the rules ----
{
  const L = createLife();
  const ask = [{ zh: '甲', en: 'A', needs: { ai: 5 }, else: { zh: '乙', en: 'B' } }, { zh: '丙', en: 'C', needs: { hw: 3 } }, { zh: '丁', en: 'D' }];
  const v = visible(L, ask);
  ok(v.length === 2 && v[0].en === 'B' && v[1].en === 'D', 'an answer he can\'t give yet is replaced by its "else", or left out');
  gainSkill(L, 'ai', 400); gainSkill(L, 'hw', 300);
  ok(visible(L, ask).map((a) => a.en).join() === 'A,C,D', 'and offered once he can');
  ok(visible(L, [1, 2, 3, 4, 5, 6].map((i) => ({ zh: '话', en: `${i}` }))).map((a) => a.en).join() === '1,2,3,6', 'never more than four answers, and the silent last one is kept');
  const g = award(createLife(), { ai: 40, hw: 30, nonsense: 9 }, 'test');
  ok(g.length === 2 && g.find((r) => r.track === 'ai').xp === 40 && gainText(g.find((r) => r.track === 'hw')).en === '+30 Maker XP' && /Software & AI XP/.test(gainText(g[0]).en), 'experience goes to the named tracks; the toast names them');
}

// ---- the robot-arm review: every answer, what it teaches and what it sets ----
{
  const base = createLife(), s = XUAN(base), [diag, next, offer] = asks(s).map((b) => answers(base, b.ask));
  ok(asks(s).length === 3 && diag.length === 4 && next.length === 4 && offer.length === 4, 'three asks at the review, four answers each');
  ok(['fix', 'data', 'spec'].every((f) => flagged(diag, f)) && ['sense', 'vision', 'onestep'].every((f) => flagged(next, f)), 'the bench, the data, the product question; then the sensor, the camera, one change at a time');
  const pick = (ask, flag, L) => { const i = ask.findIndex((a) => a.flag === flag); return choose(L, 'lujiazui', 'xuan', ask[i], i); };
  // (a) data: Software & AI
  { const L = createLife(), ai0 = skillXp(L, 'ai'), x0 = relation(L, 'xuan').affinity;
    const r = pick(answers(L, asks(XUAN(L))[0].ask), 'data', L);
    ok(skillXp(L, 'ai') === ai0 + 40 && r.gains[0].track === 'ai' && L.flags.lujiazuiSaid.includes('data') && relation(L, 'xuan').affinity > x0, 'log it at a kilohertz: +40 Software & AI, remembered, and Mingxuan likes it');
    ok(armRoute(L).fix === 'vision' && armRoute(L).data && armRoute(L).code, 'the data route ends in a grasp-point model trained on what the logs labelled'); }
  // (b) sensing: Software & AI and hardware together
  { const L = createLife(), ai0 = skillXp(L, 'ai'), hw0 = maker(L).xp;
    pick(answers(L, asks(XUAN(L))[1].ask), 'sense', L);
    ok(skillXp(L, 'ai') === ai0 + 40 && maker(L).xp === hw0 + 30 && armRoute(L).fix === 'slip', 'a slip sensor and a model on the controller: both tracks, and the slip route'); }
  // (c) the bench: Maker XP and the achievement, as before
  { const L = createLife(); const r = pick(answers(L, asks(XUAN(L))[0].ask), 'fix', L);
    ok(maker(L).xp === 60 && r.ach && maker(L).achievements.includes('fixer') && maker(L).log.some((e) => e.why === 'fix:arm') && armRoute(L).fix === 'pads', 'softer pads: +60 Maker XP and "Fixed someone else\'s machine"'); }
  // (d) the product question
  { const L = createLife(), p0 = skillXp(L, 'product'); pick(answers(L, asks(XUAN(L))[0].ask), 'spec', L);
    ok(skillXp(L, 'product') === p0 + 40 && armRoute(L).fix === 'spec' && !armRoute(L).code, 'does the customer need forty? +40 Product'); }
  // rusty at the bench: the engineer asks who builds the fingertip
  { const rusty = flagged(asks(XUAN(createLife()))[1].ask, 'sense').then, L = createLife(); gainSkill(L, 'hw', 400);
    const handy = flagged(asks(XUAN(L))[1].ask, 'sense').then;
    ok(rusty.some((l) => l[0] === 'xuan' && /doesn't know it yet/.test(l[2])) && handy.some((l) => /piezo/.test(l[2])), 'the sensing answer reads differently when he\'s rusty at the bench'); }
  // without the AI, the old answer
  { const L = createLife(); L.flags.skills = { ai: 50, product: 0, log: [] };
    const d = answers(L, asks(XUAN(L))[0].ask), n = answers(L, asks(XUAN(L))[1].ask);
    ok(!flagged(d, 'data') && d.some((a) => /few more times/.test(a.en)) && n.length === 2, 'someone without the AI would only ask to watch it again'); }
  // the silent answer is the last one, everywhere
  for (const sc of [YINUO, XUAN(base), XUAN_DEMO(base)]) for (const b of asks(sc)) { const v = answers(base, b.ask); if (!/^\(/.test(v[v.length - 1].en)) bad.push(`not silent last: ${v[v.length - 1].en}`); }
}

// ---- the morning after, and the demo ----
function reviewed(flags) {
  const L = createLife(); setupThreads(L);
  L.invites.push({ id: 'xuan-arm', from: 'xuan', status: 'accepted', at: D(2, 15), kept: true });
  L.flags.lujiazuiSaid = flags.slice();
  return L;
}
{
  const L = reviewed(['data', 'vision', 'advisor']); skipTo(L, D(2, 23)); runStoryBeats(L);
  ok(!L.flags.armFix, 'nothing until the morning');
  const ai0 = skillXp(L, 'ai'); skipTo(L, D(3, 9, 5)); runStoryBeats(L);
  ok(L.flags.armFix === 'vision' && skillXp(L, 'ai') === ai0 + 50 && L.threads.xuan.messages.some((m) => m.text === ARM_NEWS.logs), 'the next morning: the logs matched, the model is on, +50 Software & AI');
  ok(Object.values(ARM_NEWS).every((t) => enText(t) !== t), 'the news has English on the phone');
  ok(/kilohertz/.test(storyContext({ ...L, quests: { list: { 'robot-arm': { status: 'active' } } } }, 'xuan')), 'his friends\' free conversation knows he wrote the fix');
  const P = reviewed(['fix', 'advisor']); skipTo(P, D(3, 9, 5)); runStoryBeats(P);
  ok(!P.flags.armFix && !P.fired['arm-model'], 'the bench route has no software to wait for');
  const demo = XUAN_DEMO(L), lines = demo.filter(Array.isArray);
  ok(lines.some((l) => /labelled itself/.test(l[2])) && lines.some((l) => /chrome/.test(l[2])) && asks(demo).length === 2, 'the demo shows the grasp-point model (and a chrome part that makes it pause), and asks about a model in the loop');
  const S = reviewed(['sense', 'advisor']), sd = XUAN_DEMO(S);
  ok(sd.filter(Array.isArray).some((l) => /oiled this batch/.test(l[2])) && /fingertips feel a slip/.test(armNote(S).en), 'the slip route: an oiled batch, and the grip tightens');
  const pads = XUAN_DEMO(reviewed(['fix', 'advisor']));
  ok(pads.filter(Array.isArray).some((l) => /pads were his idea/.test(l[2])) && asks(pads).length === 1, 'the pads route keeps the old demo');
  const loop = answers(L, asks(demo)[1].ask), ai1 = skillXp(L, 'ai'), p1 = skillXp(L, 'product');
  choose(L, 'lujiazui', 'xuan', loop[0], 0);
  ok(skillXp(L, 'ai') === ai1 + 30 && skillXp(L, 'product') === p1 + 10 && L.flags.lujiazuiSaid.includes('onDevice'), 'on the arm\'s own controller, no network, stops and calls a person: +30 Software & AI, +10 Product');
  choose(L, 'lujiazui', 'xuan', loop[1], 1);
  ok(L.flags.lujiazuiSaid.includes('month') && skillXp(L, 'product') === p1 + 40, 'a month of the customer\'s data before he invests: +30 Product');
  ok(SCRIPTS['xuan-demo'](L).length === demo.length && SCRIPTS['yinuo-flat']() === YINUO, 'the scripts are built for the life they play in');
}

// ---- the firm: an agent for a bank, where the model runs, evaluation before numbers ----
function firm(picks) {
  const L = createLife(); setupThreads(L); initYear(L);
  for (const id of ['d2', 'd3', 'd4', 'd5', 'd7', 'd8', 'd9', 'd10']) { const def = FIRM_SCENES.find((s) => s.id === id); skipTo(L, D(def.day, 9, 30)); playScene(L, def, picks[id] || []); }
  return L;
}
{
  const ai0 = skillXp(createLife(), 'ai'), p0 = skillXp(createLife(), 'product');
  const real = firm({ d4: [0, 0] });
  ok(story(real).bank === 'real' && story(real).bankHost === 'onprem' && story(real).evalHarness, 'a real agent on the bank\'s sandbox, the model in their machine room, evaluation first');
  ok(skillXp(real, 'ai') - ai0 >= 60 + 40 + 50 && skillLevel(real, 'ai') >= 4, `and he learns from it (Software & AI ${skillXp(real, 'ai')})`);
  const users = firm({ d4: [0, 1] }), mock = firm({ d4: [0, 2] });
  ok(story(users).bank === 'users' && skillXp(users, 'product') - p0 >= 50 && story(users).bankHost === 'onprem', 'half a day in their operations room first: Product, and the pilot is scoped by it');
  ok(story(mock).bank === 'mock' && !story(mock).bankHost && skillXp(mock, 'ai') < skillXp(real, 'ai'), 'a click-through: no follow-up question, and nothing learned');
  const def7 = FIRM_SCENES.find((s) => s.id === 'd7');
  ok(sceneLines(mock, def7).some((l) => /nothing at all behind/.test(l[2])) && sceneLines(real, def7).some((l) => /weekend version/.test(l[2])), 'two months on, the demo and the real thing come out differently');
  // the multimodal redaction needs Software & AI 5; below it, he says he needs help
  const def10 = FIRM_SCENES.find((s) => s.id === 'd10');
  const ask10 = (L) => { const S = story(L); const p = def10.parts[def10.parts.length - 1](L, S, {}); return visible(L, p.find((b) => !Array.isArray(b)).ask); };
  const low = createLife(), high = createLife(); initYear(low); initYear(high); gainSkill(high, 'ai', 400);
  ok(ask10(low).some((a) => /someone who knows vision models/.test(a.en)) && ask10(high).some((a) => /multimodal model reads each photograph/.test(a.en)), 'the multimodal redaction is his to offer only at Software & AI 5');
}

// ---- both languages, names for every speaker ----
for (const sc of [YINUO, XUAN(createLife()), XUAN_DEMO(reviewed(['data', 'vision'])), XUAN_DEMO(reviewed(['sense'])), XUAN_DEMO(reviewed(['spec'])), XUAN_DEMO(createLife())]) {
  for (const b of sc) {
    if (Array.isArray(b)) both(b[1], b[2], `line ${b[0]}`);
    else for (const a0 of b.ask) for (const a of [a0, a0.else].filter(Boolean)) { both(a.zh, a.en, 'answer'); for (const l of a.then) both(l[1], l[2], `reply ${l[0]}`); }
  }
}
for (const def of [...FIRM_SCENES, ...Object.values(ROADS).flat()]) for (const p of def.parts) {
  const L = createLife(); initYear(L);
  for (const b of p(L, story(L), { rel: () => 50, rep: () => 50, canStay: () => true, severance: () => 0, rating: () => 2, su: () => ({ nameZh: '公司', nameEn: 'Co', cash: 0, customer: null }), burn: () => 0, runway: () => 9, viable: () => true }) || []) {
    if (Array.isArray(b)) continue;
    for (const a of b.ask) if (a.sk) for (const t of Object.keys(a.sk)) if (!['ai', 'hw', 'product'].includes(t)) bad.push(`${def.id}: unknown track ${t}`);
  }
}
for (const l of sceneLines(firm({}), FIRM_SCENES.find((s) => s.id === 'd4'))) if (l[0] && !CAREER_NAMES[l[0]]) bad.push(`no name for ${l[0]}`);
ok(bad.length === 0, `every new line and answer has both languages, a named speaker and a known track (${bad.length ? bad.slice(0, 4).join(' || ') : 'checked'})`);
void stamp;
console.log(failed ? `\n${failed} FAILED` : '\nall passed'); process.exit(failed ? 1 : 0);
