// Mission One, "The Wrong Handoff" (错交): one pickup, one item, one decision, two endings.
// Pure state, no DOM / three.js / audio, so it is unit-tested in node like conversation.js.
// Deliberately not a quest framework: the steps below are this mission's and nobody else's.
//
//   idle ──start()──> collect ──pickUp()──> carry ──handOver()──> complete
//                                            │  ▲
//                                    breakSeal() (once; sealed -> opened)
//
// Integration surface (also on window.__bund.mission):
//   start(source)  begin from idle; returns false otherwise
//   reset()        back to idle from anywhere (developer reset / chapter restart)
//   on('start' | 'change' | 'complete' | 'reset', fn) -> unsubscribe
//   'complete' payload: { outcome: 'sealed' | 'opened', seconds, source }

export const STEPS = ['idle', 'collect', 'carry', 'complete'];

export function createWrongHandoff({ now = () => Date.now() / 1000 } = {}) {
  let step = 'idle';
  let sealed = true;
  let outcome = null;
  let source = null;
  let startedAt = 0;
  let seconds = 0;
  const listeners = { start: new Set(), change: new Set(), complete: new Set(), reset: new Set() };

  const snapshot = () => ({ step, sealed, outcome, source, seconds });
  function emit(type, payload = snapshot()) {
    for (const fn of [...listeners[type]]) {
      try { fn(payload); } catch (err) { console.error(err); }   // a broken listener must not wedge the mission
    }
  }
  function go(next) { step = next; emit('change'); }

  return {
    start(from = 'game') {
      if (step !== 'idle') return false;
      sealed = true; outcome = null; source = from; startedAt = now(); seconds = 0;
      go('collect');
      emit('start');
      return true;
    },
    pickUp() {
      if (step !== 'collect') return false;
      go('carry');
      return true;
    },
    breakSeal() {
      if (step !== 'carry' || !sealed) return false;
      sealed = false;
      emit('change');
      return true;
    },
    handOver() {
      if (step !== 'carry') return null;
      outcome = sealed ? 'sealed' : 'opened';
      seconds = Math.max(0, now() - startedAt);
      go('complete');
      emit('complete');
      return outcome;
    },
    reset() {
      step = 'idle'; sealed = true; outcome = null; source = null; seconds = 0;
      emit('reset');
      emit('change');
    },
    on(type, fn) {
      if (!listeners[type]) throw new Error(`unknown mission event "${type}"`);
      listeners[type].add(fn);
      return () => listeners[type].delete(fn);
    },
    snapshot,
    get step() { return step; },
    get sealed() { return sealed; },
    get outcome() { return outcome; },
    get active() { return step === 'collect' || step === 'carry'; },
    get carrying() { return step === 'carry'; },
    get complete() { return step === 'complete'; },
  };
}
