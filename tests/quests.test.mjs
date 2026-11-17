// The quest engine (src/engine/quests.js) and the main story (src/world/story.js): every ending can be
// reached by playing the arc through. npm test.
import { createLife, stamp, skipTo, answerInvite, relation, nudge } from '../src/engine/life.js';
import { updateQuests, journal, currentStep, questState, track } from '../src/engine/quests.js';
import { QUESTS, STORY_BEATS, runStoryBeats, D, dinnerScript, ending, ENDINGS, storyContext, PLACE } from '../src/world/story.js';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };

// ---- the engine on a toy quest ----
{
  const L = createLife(); L.flags.go = false;
  const defs = [{ id: 't', main: true, title: { zh: '测试', en: 'Test' }, summary: { zh: '', en: '' }, start: (L) => L.flags.go,
    steps: [{ id: 'a', text: { zh: 'A', en: 'A' }, done: (L) => L.flags.a }, { id: 'b', text: { zh: 'B', en: 'B' }, optional: true, done: () => false, fail: (L) => L.flags.late }, { id: 'c', text: { zh: 'C', en: 'C' }, done: (L) => L.flags.c, target: { x: 1, z: 2 } }] }];
  ok(updateQuests(L, defs, 0).length === 0, 'a quest waits for its start condition');
  L.flags.go = true; let ev = updateQuests(L, defs, 1);
  ok(ev[0].type === 'start' && questState(L).tracked === 't', 'it starts and is tracked');
  L.flags.a = true; L.flags.late = true; L.flags.c = true; ev = updateQuests(L, defs, 2);
  ok(ev.map((e) => e.type).join(',') === 'step,skip,step,done', `several steps in one update, an optional one skipped (${ev.map((e) => e.type).join(',')})`);
  const j = journal(L, defs, 'en');
  ok(j[0].status === 'done' && j[0].steps.find((s) => s.id === 'b').skipped, 'the journal shows it done, the missed step marked');
}

// ---- the story, played through ----
function play({ demo = true, yuan = true, dadDelta = 0, choice = 0, miss = false } = {}) {
  const L = createLife();
  const ctx = { player: { x: -80, y: 0.15, z: 0 } };
  const tick = () => { runStoryBeats(L); return updateQuests(L, QUESTS, stamp(L), ctx); };
  tick();
  ctx.player = { x: 24, y: 3, z: 0 }; tick();                                           // the railing
  L.flags.calls = [{ from: 'dad', script: 'dad-arrival', missed: false }];
  L.flags.hotelKey = true; L.flags.room612 = true; tick();
  // Mingxuan's invitation, the review, a gadget, the demo
  L.invites.push({ id: 'xuan-arm', from: 'xuan', status: 'pending', at: D(2, 15), deadline: D(2, 12) }); tick();
  answerInvite(L, 'xuan-arm', true); skipTo(L, D(2, 15)); L.invites.find((i) => i.id === 'xuan-arm').kept = true; tick();
  // Dad's second call (day 2 evening), then Yu'an
  skipTo(L, D(2, 20)); L.flags.calls.push({ from: 'dad', script: 'dad-plans', missed: false }); tick();
  if (yuan) { L.flags.spoke = { yuan: [stamp(L) + 1, stamp(L) + 2] }; }
  skipTo(L, D(3, 10)); tick();
  if (demo) { L.flags.maker = { gadgets: { telemetry: { quality: 0.8 } } }; L.invites.push({ id: 'xuan-demo', from: 'xuan', status: 'accepted', at: D(5, 15), kept: true }); }
  skipTo(L, D(5, 19, 30)); tick(); tick();
  const di = L.invites.find((i) => i.id === 'dad-dinner');
  if (di) answerInvite(L, 'dad-dinner', true); tick();
  nudge(L, 'dad', dadDelta);
  if (miss) { skipTo(L, D(6, 21)); tick(); }
  else {
    skipTo(L, D(6, 20)); L.flags.dinnerStarted = true; tick();
    // the dinner: first answers neutral, then the choice
    const s = dinnerScript(L), asks = s.filter((b) => !Array.isArray(b));
    for (const a of asks.slice(0, -1)) nudge(L, 'dad', a.ask[0].d || 0);
    const last = asks[asks.length - 1].ask[choice]; nudge(L, 'dad', last.d || 0); L.flags.dinnerChoice = last.set; tick();
  }
  ctx.player = { x: 18, y: 3, z: -200 }; skipTo(L, D(6, 21, 55)); tick(); skipTo(L, D(6, 22, 1)); tick();
  return L;
}
{
  const L = play();
  const Q = questState(L).list;
  ok(['first-night', 'robot-arm', 'dads-offer', 'dinner', 'tide'].every((id) => Q[id] && Q[id].status === 'done'), `the main arc runs start to finish (${Object.entries(Q).map(([k, v]) => `${k}:${v.status}`).join(' ')})`);
  ok(L.flags.demoDone && !!L.invites.find((i) => i.id === 'dad-dinner'), 'the demo counts; Dad invites you to dinner after you talk to Yu\'an');
  ok(L.outbox.some((e) => e.type === 'ending'), `an ending is emitted (${L.flags.ending})`);
}
const endings = {
  together: play({ choice: 2, dadDelta: 10 }).flags.ending,
  stay: play({ choice: 0, dadDelta: 10 }).flags.ending,
  alone: play({ choice: 0, dadDelta: -20 }).flags.ending,
  home: play({ choice: 1 }).flags.ending,
  open: play({ choice: 3 }).flags.ending,
  apart: play({ miss: true }).flags.ending,
};
for (const [want, got] of Object.entries(endings)) ok(want === got && ENDINGS[got], `ending "${want}" reachable (${got}: ${ENDINGS[got] ? ENDINGS[got].title.en : '?'})`);
ok(play({ demo: false, choice: 2, dadDelta: 10 }).flags.ending !== 'together', 'without the demo, "make the arm at the works" doesn\'t convince him');
{
  const L = play({ yuan: false });
  ok(!!L.invites.find((i) => i.id === 'dad-dinner'), 'skipping Yu\'an: Dad still writes on the evening of day 5');
}
// journal and markers mid-arc
{
  const L = createLife(), ctx = { player: { x: -80, y: 0.15, z: 0 } };
  updateQuests(L, QUESTS, stamp(L), ctx);
  const c = currentStep(L, QUESTS);
  ok(c && c.step.id === 'river' && c.target === PLACE.rail, 'the first step points at the river railing');
  ok(journal(L, QUESTS, 'zh')[0].title === '外滩的第一晚', 'the journal speaks Chinese too');
  L.flags.calls = [{ from: 'dad', script: 'dad-arrival' }]; L.relations.yuan = { affinity: 60 };
  L.quests.list['dads-offer'] = { status: 'active', step: 1, started: 0, skipped: [] };
  ok(/R&D/.test(storyContext(L, 'yuan')) && /Yu\'an/.test(storyContext(L, 'yuan')), 'Yu\'an\'s free conversation is told what\'s going on');
  ok(storyContext(L, 'office') === '', 'a stranger isn\'t');
}
console.log(failed ? `\n${failed} FAILED` : '\nall passed'); process.exit(failed ? 1 : 0);
