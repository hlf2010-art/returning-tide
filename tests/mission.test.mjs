// Mission One "The Wrong Handoff": state machine, both outcomes, premature and repeated
// actions, restart, and the conversation hook it relies on (run: npm test).
import { createWrongHandoff } from '../src/engine/wrongHandoff.js';
import { createConversation } from '../src/engine/conversation.js';
import { T, ALL_TEXT } from '../src/world/text.js';
import { stall, colliders } from '../src/world/layout.js';
import { resolve } from '../src/engine/movement.js';

let failed = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failed++; };

function rig() {
  let clock = 100;
  const m = createWrongHandoff({ now: () => clock });
  const log = [];
  for (const ev of ['start', 'change', 'complete', 'reset']) m.on(ev, (p) => log.push([ev, p]));
  return { m, log, tick: (s) => { clock += s; }, count: (ev) => log.filter((e) => e[0] === ev).length };
}

// 1. premature interactions do nothing
{
  const { m, count } = rig();
  ok(m.step === 'idle' && !m.active, 'starts idle, not active');
  ok(m.pickUp() === false, 'cannot pick up before the mission starts');
  ok(m.breakSeal() === false, 'cannot break a seal you are not carrying');
  ok(m.handOver() === null, 'cannot hand over before starting');
  ok(count('change') === 0 && count('complete') === 0, 'premature calls emit nothing');
  m.start('test');
  ok(m.breakSeal() === false && m.sealed, 'cannot break the seal before picking the pouch up');
  ok(m.handOver() === null && m.step === 'collect', 'cannot hand over before the pickup');
}

// 2. branch A: keep it sealed
{
  const { m, log, tick, count } = rig();
  ok(m.start('lin') === true && m.step === 'collect', 'start -> collect');
  ok(m.start('lin') === false && count('start') === 1, 'repeated start is ignored');
  ok(m.pickUp() === true && m.step === 'carry' && m.sealed, 'pick up -> carrying, sealed');
  ok(m.pickUp() === false, 'repeated pickup is ignored');
  tick(185);
  ok(m.handOver() === 'sealed' && m.step === 'complete', 'hand over sealed -> complete / sealed');
  const done = log.filter((e) => e[0] === 'complete');
  ok(done.length === 1 && done[0][1].outcome === 'sealed' && done[0][1].seconds === 185 && done[0][1].source === 'lin', 'complete fires once with outcome, duration and source');
  ok(m.handOver() === null && m.breakSeal() === false && m.pickUp() === false && count('complete') === 1, 'repeated actions after completion do nothing');
}

// 3. branch B: break the seal
{
  const { m, count } = rig();
  m.start(); m.pickUp();
  ok(m.breakSeal() === false && m.sealed, 'the seal cannot be torn while the string is still wound over it');
  ok(m.unwind() === true && m.string === 'unwound', 'the string comes off first');
  ok(m.breakSeal() === true && !m.sealed && m.step === 'carry', 'break seal while carrying -> still carrying, unsealed');
  ok(m.breakSeal() === false && count('change') === 4, 'seal can only break once');
  ok(m.rewind() === false && m.unwind() === false, 'once the seal is torn the string no longer matters');
  ok(m.handOver() === 'opened' && m.outcome === 'opened', 'hand over opened -> complete / opened');
  ok(m.snapshot().sealed === false, 'snapshot records the broken seal');
}

// 4. restart from every step, then replay to the other ending
{
  for (const steps of [[], ['start'], ['start', 'pickUp'], ['start', 'pickUp', 'unwind', 'breakSeal'], ['start', 'pickUp', 'handOver']]) {
    const { m, count } = rig();
    for (const s of steps) m[s]();
    m.reset();
    ok(m.step === 'idle' && m.sealed && m.string === 'wound' && !m.witnessed && m.outcome === null && count('reset') === 1, `reset after [${steps.join(', ') || 'nothing'}] returns a clean idle mission`);
    m.start(); m.pickUp();
    const outcome = steps.includes('breakSeal') ? m.handOver() : (m.unwind(), m.breakSeal(), m.handOver());
    ok(outcome === (steps.includes('breakSeal') ? 'sealed' : 'opened'), '...and it can be completed again on the other branch');
  }
}

// 4b. the string is reversible but leaves a trace; seeing the courier is recorded once, at the stall
{
  const { m, log } = rig();
  ok(m.unwind() === false && m.witness() === false, 'nothing to unwind or witness before the mission starts');
  m.start('lin');
  ok(m.witness() === true && m.witnessed && m.witness() === false, 'seeing who left the pouch is recorded once');
  ok(m.unwind() === true && m.rewind() === true && m.string === 'rewound', 'unwound on the counter and wound back: rewound, not wound');
  ok(m.rewind() === false, 'a wound string cannot be rewound again');
  m.pickUp();
  ok(m.witness() === false, 'once you have the pouch there is no one left to see');
  ok(m.unwind() === true && m.rewind() === true && m.string === 'rewound', 'the string can be played with while carrying, too');
  ok(m.handOver() === 'sealed', 'a rewound string is still a sealed pouch');
  const done = log.filter((e) => e[0] === 'complete').at(-1)[1];
  ok(done.string === 'rewound' && done.witnessed === true, "the completion payload says how the string looked and whether he saw the courier");
}

// 5. a throwing listener cannot wedge the mission
{
  const m = createWrongHandoff();
  const off = m.on('change', () => { throw new Error('listener bug'); });
  const origErr = console.error; console.error = () => {};
  m.start(); m.pickUp();
  console.error = origErr;
  ok(m.step === 'carry', 'a broken listener does not stop the state from advancing');
  off();
  let threw = false; try { m.on('nope', () => {}); } catch { threw = true; }
  ok(threw, 'unknown event names are rejected');
}

// 6. text, placement, and the greeting hook
{
  const lines = Object.values(T.mission.lines);
  ok(lines.every((l) => l.speaker === 'lin' && l.id && l.text), 'all mission lines are Old Lin\'s, with ids');
  ok(!/[侬勿伊晓啦唻]/.test(lines.map((l) => l.text).join('')), 'spoken mission lines are Mandarin (TTS fallback)');
  ok(/勿/.test(T.mission.label.join('')), 'pouch label is in Shanghainese, like the scrawl on the notice');
  const all = JSON.stringify(T.mission);
  ok([...all].every((ch) => ALL_TEXT.includes(ch)), 'mission glyphs are in the font preload string');
  ok(T.mission.lines.offer.text.includes('二十九') && T.mission.doc.date.includes('10月31日'), 'Lin names the 29th; the document is dated the 31st');
  // the pickup spot in front of the stall is reachable
  ok(resolve({ x: stall.x + 0.2, z: stall.z + 1.25 }) === null, 'standing spot in front of the stall is collision-free');
  ok(colliders.some((c) => c.tag === 'stall'), 'the stall is still solid');

  const played = [];
  const conv = createConversation({ exchanges: T.dialogue.exchanges, greetings: T.dialogue.greetings, audio: { playLine: (l) => played.push(l.id), stop() {} }, rng: () => 0.3 });
  conv.start();
  const g = conv.enterInteraction(T.mission.lines.offer);
  ok(g.id === 'm1-offer' && conv.currentLine.id === 'm1-offer' && conv.state === 'interacting', 'enterInteraction(line) speaks a mission line through the greeting path');
  conv.enterInteraction(T.mission.lines.accept);
  ok(conv.currentLine.id === 'm1-accept' && played.at(-1) === 'm1-accept', 'a second line can follow while still interacting');
  conv.exitInteraction();
  ok(conv.state === 'resume-pause', 'stepping back returns to the ambient cooldown');
  const g2 = conv.enterInteraction();
  ok(T.dialogue.greetings.includes(g2), 'without a line it still picks an ordinary greeting');
}

console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
