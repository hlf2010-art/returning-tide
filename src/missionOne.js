// Mission One, "The Wrong Handoff" (错交): glue between the pure mission state
// (engine/wrongHandoff.js), Old Lin's greeting interaction, the pouch item, and the HUD.
// main.js owns modes and keys; this module owns what the mission says and shows.
import { createWrongHandoff } from './engine/wrongHandoff.js';
import { T } from './world/text.js';

// Both measured in wall-clock time: they are about human key presses, not the simulation
// (which slows down when frames are long).
const HOLD_TIME = 0.9;        // seconds F must be held to break the seal (no accidental taps)
const INPUT_GUARD = 0.35;     // ignore E/F this long after a view opens (double presses, held keys)
const clock = () => performance.now() / 1000;
const $ = (id) => document.getElementById(id);
const L = T.mission.lines;

const STEP_TEXT = {
  collect: {
    zh: '到汉口路北侧的周记修表摊，取柜台上封好的文件袋。',
    en: "Collect the sealed pouch from the counter of Zhou's watch-repair stall, north side of Hankou Road.",
  },
  carrySealed: {
    zh: '把文件袋交给江边栏杆旁的老林。',
    en: 'Bring the pouch to Old Lin at the river railing.',
    hint: '<kbd>F</kbd> 看看文件袋 · Look at the pouch',
  },
  carryOpened: {
    zh: '把文件袋交给老林。封条已经破了。',
    en: 'Bring the pouch to Old Lin. The seal is broken.',
    hint: '<kbd>F</kbd> 再看一眼 · Look again',
  },
};
const OUTCOME = {
  sealed: {
    card: '封条完好，交到了老林手里 · Handed over with the seal intact',
    zh: '封条完好地交了出去。里面写的是什么，只有老林知道。',
    en: 'The seal went over intact. What the page says, only Old Lin knows.',
  },
  opened: {
    card: '封条已破，交到了老林手里 · Handed over with the seal broken',
    zh: '十月三十一日，老周失踪两天后，纸上签着他的名字。老林看见了撕开的封条。',
    en: '31 October: two days after Zhou went missing, a page signed in his name. And Old Lin saw the torn seal.',
  },
};

export function createMissionOne({ hud, audio, pouch, npcs, isClueRead = () => false, onViewClosed = () => {} }) {
  const mission = createWrongHandoff();
  let offerPending = false;     // Old Lin has asked; waiting on F (agree) or E (step back)
  let afterLineSaid = false;    // one outcome-specific greeting after completion, then normal ones
  let pendingThought = null;    // shown once the player steps back from the handoff
  let view = null;              // null | 'pickup' | 'carry' | 'opened'
  let viewOpenedAt = 0, holdStart = 0, hold = 0, holding = false;
  const viewAge = () => clock() - viewOpenedAt;

  pouch.attachToLin(npcs);

  function objective() {
    if (mission.step === 'collect') return STEP_TEXT.collect;
    if (mission.step === 'carry') return mission.sealed ? STEP_TEXT.carrySealed : STEP_TEXT.carryOpened;
    return null;
  }
  function syncWorld() {
    const s = mission.step;
    pouch.setSealed(mission.sealed);
    pouch.show(s === 'collect' ? 'stall' : s === 'carry' ? 'held' : s === 'complete' ? 'lin' : 'none');
    hud.objective(objective());
  }
  mission.on('change', syncWorld);
  mission.on('complete', ({ outcome }) => {
    const o = OUTCOME[outcome];
    hud.missionCard(o.card, 8);
    pendingThought = o;
  });
  mission.on('reset', () => {
    offerPending = false; afterLineSaid = false; pendingThought = null;
    hud.missionCard(null); hud.clearThought();
    if (view) closeView();
  });
  syncWorld();

  // ---- Old Lin ----
  // What Lin says when greeted; null means "use an ordinary greeting".
  function greetLine() {
    switch (mission.step) {
      case 'idle': offerPending = true; return L.offer;
      case 'collect': return L.remind;
      case 'carry': return L[mission.handOver()];
      default:
        if (!afterLineSaid) { afterLineSaid = true; return mission.outcome === 'opened' ? L.afterOpened : L.afterSealed; }
        return null;
    }
  }
  function accept() {
    if (!offerPending || mission.step !== 'idle') return null;
    offerPending = false;
    mission.start('lin');
    return L.accept;
  }
  function dialogueClosed() {
    offerPending = false;                        // stepping back declines; Lin asks again next time
    if (pendingThought) { hud.thought(pendingThought.zh, pendingThought.en); pendingThought = null; }
  }

  // ---- the pouch, close up ----
  function fillView(kind) {
    const paper = $('pouch-paper');
    const canvas = kind === 'opened' ? pouch.canvases.doc : pouch.canvases[mission.sealed ? 'sealed' : 'torn'];
    canvas.classList.toggle('doc', kind === 'opened');
    if (paper.firstChild !== canvas) paper.replaceChildren(canvas);
    const sealedNow = kind !== 'opened';
    if (sealedNow) {
      $('pouch-h').innerHTML = 'Sealed pouch <span>文件袋</span>';
      $('pouch-body').innerHTML = `
        <p>Kraft envelope, string wound round two buttons. A paper seal is pasted across the flap and signed over: once it is broken, anyone will see it was.</p>
        <p class="label">The label, in red marker, in Shanghainese: <em>“家属托付，交林先生。勿要拆。”</em><br /><i>From the family, for Mr Lin. Do not open.</i></p>
        <p>${isClueRead()
          ? `The same red marker, the same heavy hand as the reply scrawled across Zhou's missing-person notice: <em>"Stop looking."</em>`
          : 'Red marker, a heavy, brush-like hand. There was red writing on the notice taped to the lamp by the river, too.'}</p>`;
    } else {
      $('pouch-h').innerHTML = 'Stall transfer agreement <span>摊位转让协议</span>';
      $('pouch-body').innerHTML = `
        <p>Zhou's stall on Hankou Road, "with counter, tools and right of use". The line for the new holder's name is blank.</p>
        <p>Signed 周伯年 in ink, a red thumbprint over it. Dated <b>31 October 2026</b>.</p>
        <p class="discrepancy">Nobody has seen Zhou since he packed up his stall at dusk on <b>29 October</b>. The notice by the river says so, and so does Old Lin.</p>
        <p>The seal is torn through. There is no pasting it back.</p>`;
    }
    $('pouch-keep-text').textContent = kind === 'pickup' ? '原封拿走 · Take it, sealed' : '收好 · Put it away';
    $('pouch-break').classList.toggle('hidden', !sealedNow);
    $('pouch-esc').textContent = kind === 'pickup' ? 'Esc 先放着 · Leave it for now' : '';
    $('pouch-hold').firstChild.style.width = '0%';
  }
  function openView(kind) {
    view = kind; viewOpenedAt = clock(); hold = 0; holding = false;
    fillView(kind);
    hud.show('pouch', true);
  }
  function closeView(notify = true) {
    if (!view) return;
    view = null; holding = false; hold = 0;
    hud.show('pouch', false);
    if (notify) onViewClosed();
  }

  // E inside the view: take it sealed (at the stall) or put it away.
  function viewKeep() {
    if (!view || viewAge() < INPUT_GUARD) return;
    if (view === 'pickup' && mission.pickUp()) audio.cue('collect');
    closeView();
  }
  function viewHold(down) {
    if (!down) { holding = false; return; }
    if (!view || view === 'opened' || viewAge() < INPUT_GUARD || !mission.sealed || holding) return;
    holding = true; holdStart = clock();
  }

  function update() {
    if (!view) return;
    hold = holding ? clock() - holdStart : 0;
    $('pouch-hold').firstChild.style.width = `${Math.min(100, (hold / HOLD_TIME) * 100)}%`;
    if (hold >= HOLD_TIME && mission.sealed) {
      // taken and torn in one go: the lift, then the rip a beat later
      const lifted = mission.step === 'collect' && mission.pickUp();
      if (lifted) audio.cue('collect');
      if (mission.breakSeal()) audio.cue('tear', lifted ? 0.22 : 0);
      openView('opened');
    }
  }

  // Start and reset for the developer keys / later chapter integration.
  function devStart() { mission.reset(); return mission.start('dev'); }

  return {
    mission,
    greetLine, accept, dialogueClosed,
    canPickUp: () => mission.step === 'collect',
    openPickup: () => { if (mission.step === 'collect' && !view) openView('pickup'); return view === 'pickup'; },
    openCarried: () => { if (mission.step === 'carry' && !view) openView(mission.sealed ? 'carry' : 'opened'); return !!view; },
    viewKeep, viewHold, closeView, update, devStart,
    get offerPending() { return offerPending; },
    get view() { return view; },
    get hold() { return hold; },
  };
}
