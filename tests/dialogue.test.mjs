// Headless checks for waterfront NPC placement, Mandarin dialogue rules,
// conversation state machine, and positional attenuation (run: npm test).
import { L, npcs, colliders, groundHeight } from '../src/world/layout.js';
import { T, ALL_TEXT } from '../src/world/text.js';
import { createConversation, computeDistanceGain } from '../src/engine/conversation.js';
import { resolve } from '../src/engine/movement.js';

let failed = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failed++; };

// 1. Placement & colliders
{
  ok(npcs.list.length === 2, 'exactly two waterfront NPCs defined');
  for (const n of npcs.list) {
    const gy = groundHeight(n.x, n.z);
    ok(gy === L.deckY, `${n.id} stands on promenade deck (y=${gy})`);
    ok(n.x > L.wallX + 1 && n.x < L.deckEdgeX - 0.5 && n.z > L.zNorth + 1 && n.z < L.zSouth - 1, `${n.id} is inside playable bounds`);
  }
  const npcBoxes = colliders.filter((c) => c.tag === 'npc');
  ok(npcBoxes.length === 2, 'both NPCs have colliders');
  // Player standing just west of pair focus should be free of colliders
  ok(resolve({ x: 22.4, z: -15.0 }) === null, 'interaction spot west of NPCs is collision-free');
}

// 2. Dialogue script & font coverage
{
  const { exchanges, greetings, speakers } = T.dialogue;
  ok(exchanges.length === 3, 'three everyday Shanghai exchanges exist');
  ok(speakers.lin && speakers.su, 'both speaker labels exist');
  const shanghaineseMarkers = /[侬勿伊晓啦唻]/;
  let allChars = true;
  for (const ex of exchanges) {
    ok(ex.lines.length >= 3, `exchange "${ex.id}" has ${ex.lines.length} lines`);
    for (const ln of ex.lines) {
      if (shanghaineseMarkers.test(ln.text)) failed++, console.log(`FAIL  unexpected Shanghainese token in ${ln.id}`);
      for (const ch of ln.text) if (!ALL_TEXT.includes(ch)) allChars = false;
    }
  }
  ok(!shanghaineseMarkers.test(JSON.stringify(T.dialogue)), 'Mandarin-only dialogue when Shanghainese audio is unavailable');
  ok(allChars, 'all dialogue glyphs are included in ALL_TEXT font preloading string');
  ok(greetings.length >= 2, 'greetings support non-repetitive repeated interaction');
}

// 3. Distance attenuation curve
{
  const d0 = computeDistanceGain(0);
  const dRef = computeDistanceGain(2.5);
  const dMid = computeDistanceGain(6);
  const dFar = computeDistanceGain(12);
  const dMax = computeDistanceGain(18);
  const dOut = computeDistanceGain(30);
  ok(d0 === 1 && dRef === 1, 'gain is 1.0 within reference distance');
  ok(dMid < dRef && dMid > dFar && dFar > dMax, `gain decreases monotonically with distance (${dMid.toFixed(2)} > ${dFar.toFixed(2)} > ${dMax.toFixed(2)})`);
  ok(dMax === 0 && dOut === 0, 'gain reaches 0 at and beyond max audible distance');
}

// 4. Conversation state machine: continuous flow, non-repetition, varied pauses, no overlap
{
  let seed = 42;
  const rng = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  let activePlays = 0, overlaps = 0, playLog = [];
  const audio = {
    playLine(line, { onEnd }) {
      activePlays++;
      if (activePlays > 1) overlaps++;
      playLog.push({ id: line.id, speaker: line.speaker, end: onEnd });
    },
    stop() {
      activePlays = 0;
    },
  };
  let playerDist = 4.0;
  const conv = createConversation({
    exchanges: T.dialogue.exchanges,
    greetings: T.dialogue.greetings,
    audio,
    rng,
    getPlayerDistance: () => playerDist,
  });

  ok(conv.state === 'idle', 'starts idle before game begin');
  conv.start();
  ok(conv.state === 'speaking' && conv.currentLine !== null, 'immediately active in conversation when play begins');

  const seenExchanges = [];
  const pauseDurations = new Set();
  let lastEx = null;
  let prevState = conv.state;
  for (let i = 0; i < 36000; i++) {
    conv.update(1 / 30);
    if (conv.state !== prevState) {
      if (conv.state === 'line-pause' || conv.state === 'exchange-pause') {
        pauseDurations.add(conv.pauseRemaining.toFixed(3));
      }
      if (conv.state === 'speaking' && conv.exchangeId !== lastEx) {
        seenExchanges.push(conv.exchangeId);
        lastEx = conv.exchangeId;
      }
      prevState = conv.state;
    }
  }
  ok(overlaps === 0, 'never overlaps audio playback across 20 simulated minutes');
  ok(new Set(seenExchanges).size === 3, `cycled through all 3 exchanges (${seenExchanges.length} transitions)`);
  let consecDup = 0;
  for (let i = 1; i < seenExchanges.length; i++) if (seenExchanges[i] === seenExchanges[i - 1]) consecDup++;
  ok(consecDup === 0, 'no consecutive repetition of exchanges');
  ok(pauseDurations.size > 10, `pauses vary naturally (${pauseDurations.size} distinct pause durations observed)`);

  // 5. Audibility gating when far vs near
  const countBeforeFar = playLog.length;
  playerDist = 25.0;
  for (let i = 0; i < 600; i++) conv.update(1 / 30);
  ok(playLog.length === countBeforeFar, 'does not trigger audible speech outside max audible distance');
  playerDist = 4.0;
  for (let i = 0; i < 600; i++) conv.update(1 / 30);
  ok(playLog.length > countBeforeFar, 'resumes triggering audible speech when player is within audible distance');

  // 6. Interruption, greeting, exit pause, and repeated interaction
  const preGreet = conv.enterInteraction();
  ok(conv.state === 'interacting' && preGreet.speaker === 'lin', 'interacting pauses ambient conversation and triggers Old Lin greeting');
  ok(activePlays === 1, 'only greeting plays during interaction');

  // Let greeting finish speaking while still interacting
  for (let i = 0; i < 300; i++) conv.update(1 / 30);
  ok(conv.state === 'interacting' && !conv.isSpeaking && conv.currentLine.id === preGreet.id, 'after greeting finishes, stays in interacting state without auto-resuming ambient chatter');

  // Exit interaction -> must enter cooldown pause, NOT speak immediately
  conv.exitInteraction();
  ok(conv.state === 'resume-pause' && conv.currentLine === null && conv.pauseRemaining > 2.0, `exiting enters natural cooldown pause (${conv.pauseRemaining.toFixed(2)}s)`);
  conv.update(1.0);
  ok(conv.state === 'resume-pause', 'ambient conversation remains paused during cooldown');
  for (let i = 0; i < 150; i++) conv.update(1 / 30);
  ok(conv.state === 'speaking', 'ambient conversation resumes after the pause');

  // Repeated interaction
  const g2 = conv.enterInteraction();
  ok(conv.state === 'interacting' && g2.id !== preGreet.id, 'repeated interaction works and varies greeting');
  conv.exitInteraction();
  ok(conv.state === 'resume-pause', 'repeated exit restores cooldown pause cleanly');
}

console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
