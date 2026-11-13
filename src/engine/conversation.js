// Pure conversation state machine for the two waterfront NPCs.
// No DOM, no Three.js, no browser audio APIs: safe to unit-test in Node.

export function computeDistanceGain(dist, refDist = 2.5, maxDist = 18.0) {
  if (!Number.isFinite(dist) || dist <= refDist) return 1;
  if (dist >= maxDist) return 0;
  const t = (dist - refDist) / (maxDist - refDist);
  const fade = 1 - t * t * (3 - 2 * t);
  return Math.max(0, Math.min(1, (refDist / dist) * fade));
}

export function estimateLineDuration(text) {
  const clean = (text || '').replace(/[，。！？、；：“”‘’\s]/g, '');
  const punct = (text || '').length - clean.length;
  return Math.max(2.2, clean.length * 0.21 + punct * 0.18 + 0.55);
}

const noopAudio = {
  playLine() {},
  stop() {},
};

export function createConversation({
  exchanges,
  greetings,
  audio = noopAudio,
  rng = Math.random,
  getPlayerDistance = () => 0,
  maxAudibleDist = 18.0,
} = {}) {
  let state = 'idle'; // idle | speaking | line-pause | exchange-pause | interacting | resume-pause
  let paused = false;
  let exchangeIdx = -1;
  let lastExchangeIdx = -1;
  let lineIdx = 0;
  let lastGreetingIdx = -1;
  let greetCount = 0;

  let currentLine = null;
  let speaking = false;
  let token = 0;
  let elapsedInLine = 0;
  let minLineDur = 0;
  let maxLineDur = 0;
  let pauseTimer = 0;
  let naturalDoneSignaled = false;

  const betweenLines = () => 0.55 + rng() * 0.6;
  const betweenExchanges = () => 2.8 + rng() * 2.0;
  const afterInteraction = () => 2.6 + rng() * 1.2;

  function pickNextExchange() {
    const candidates = [];
    for (let i = 0; i < exchanges.length; i++) {
      if (exchanges.length <= 1 || i !== lastExchangeIdx) candidates.push(i);
    }
    const idx = candidates[Math.floor(rng() * candidates.length) % candidates.length];
    lastExchangeIdx = idx;
    return idx;
  }

  function pickGreeting() {
    if (greetCount === 0 || greetings.length <= 1) {
      greetCount++;
      lastGreetingIdx = 0;
      return greetings[0];
    }
    const candidates = [];
    for (let i = 0; i < greetings.length; i++) {
      if (i !== lastGreetingIdx) candidates.push(i);
    }
    const idx = candidates[Math.floor(rng() * candidates.length) % candidates.length];
    lastGreetingIdx = idx;
    greetCount++;
    return greetings[idx];
  }

  function finishCurrentLine() {
    if (!speaking) return;
    speaking = false;
    if (state === 'interacting') {
      // Keep greeting text visible while interacting, but stop speaking animation.
      return;
    }
    if (state !== 'speaking') return;
    currentLine = null;
    const ex = exchanges[exchangeIdx];
    if (lineIdx + 1 < ex.lines.length) {
      lineIdx++;
      state = 'line-pause';
      pauseTimer = betweenLines();
    } else {
      state = 'exchange-pause';
      pauseTimer = betweenExchanges();
    }
  }

  function beginLine(line, isGreeting = false) {
    token++;
    const myToken = token;
    audio.stop();

    currentLine = line;
    speaking = true;
    elapsedInLine = 0;
    naturalDoneSignaled = false;
    const est = estimateLineDuration(line.text);
    // Guard against instant TTS failure/no-op in headless environments: wait at least ~80% of estimated duration
    // before auto-advancing if audio didn't naturally speak, or finish on real audio end if >= 0.45s.
    minLineDur = Math.max(1.2, est * 0.78);
    maxLineDur = est + 3.5;

    const dist = getPlayerDistance();
    const audible = isGreeting || dist < maxAudibleDist;
    if (audible) {
      audio.playLine(line, {
        isGreeting,
        estimatedDuration: est,
        onEnd: () => {
          if (token !== myToken) return;
          if (elapsedInLine >= 0.45) {
            finishCurrentLine();
          } else {
            // Audio ended instantaneously (e.g. missing OS TTS daemon); let natural cadence finish.
            naturalDoneSignaled = true;
          }
        },
      });
    } else {
      naturalDoneSignaled = true;
    }
  }

  function startExchange(forcedIdx = null, startLineIdx = 0) {
    exchangeIdx = forcedIdx != null ? forcedIdx : pickNextExchange();
    lastExchangeIdx = exchangeIdx;
    lineIdx = Math.max(0, Math.min(startLineIdx, exchanges[exchangeIdx].lines.length - 1));
    state = 'speaking';
    beginLine(exchanges[exchangeIdx].lines[lineIdx], false);
  }

  function start({ initialExchange = null, initialLine = 0 } = {}) {
    if (state !== 'idle') return;
    startExchange(initialExchange, initialLine);
  }

  // `line` lets a caller (Mission One) put its own words in Old Lin's mouth through the same
  // greeting path; without it a greeting is picked as before. Safe to call while interacting.
  function enterInteraction(line = null) {
    token++;
    audio.stop();
    state = 'interacting';
    const greeting = line || pickGreeting();
    beginLine(greeting, true);
    return greeting;
  }

  function exitInteraction() {
    if (state !== 'interacting') return;
    token++;
    audio.stop();
    speaking = false;
    currentLine = null;
    state = 'resume-pause';
    pauseTimer = afterInteraction();
  }

  function setPaused(nextPaused) {
    const p = !!nextPaused;
    if (p === paused) return;
    paused = p;
    if (paused) {
      token++;
      audio.stop();
      if (state === 'speaking') {
        // Recover cleanly on resume after a short pause rather than hanging mid-utterance.
        speaking = false;
        currentLine = null;
        state = 'line-pause';
        pauseTimer = 0.65;
      } else if (state === 'interacting') {
        speaking = false;
      }
    }
  }

  function update(dt) {
    if (paused || state === 'idle' || dt <= 0) return;

    if (state === 'speaking' || (state === 'interacting' && speaking)) {
      elapsedInLine += dt;
      if (naturalDoneSignaled && elapsedInLine >= minLineDur) {
        finishCurrentLine();
      } else if (elapsedInLine >= maxLineDur) {
        finishCurrentLine();
      }
      return;
    }

    if (state === 'line-pause' || state === 'exchange-pause' || state === 'resume-pause') {
      pauseTimer -= dt;
      if (pauseTimer <= 0) {
        if (state === 'line-pause' && exchangeIdx >= 0) {
          state = 'speaking';
          beginLine(exchanges[exchangeIdx].lines[lineIdx], false);
        } else {
          startExchange();
        }
      }
    }
  }

  return {
    start,
    update,
    enterInteraction,
    exitInteraction,
    setPaused,
    get state() { return state; },
    get paused() { return paused; },
    get currentLine() { return currentLine; },
    get activeSpeaker() { return speaking && currentLine ? currentLine.speaker : null; },
    get isSpeaking() { return speaking; },
    get exchangeId() { return exchangeIdx >= 0 ? exchanges[exchangeIdx].id : null; },
    get exchangeIndex() { return exchangeIdx; },
    get lineIndex() { return lineIdx; },
    get greetCount() { return greetCount; },
    get pauseRemaining() { return Math.max(0, pauseTimer); },
  };
}
