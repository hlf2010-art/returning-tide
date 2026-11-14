// Mission One, "The Wrong Handoff" (错交): glue between the pure mission state
// (engine/wrongHandoff.js), Old Lin's greeting interaction, the pouch item, and the HUD.
// main.js owns modes and keys; this module owns what the mission says and shows.
import { createWrongHandoff } from './engine/wrongHandoff.js';
import { T } from './world/text.js';
import { t, tr, getLang } from './ui/i18n.js';

// Both measured in wall-clock time: they are about human key presses, not the simulation
// (which slows down when frames are long).
const HOLD_TIME = 0.9;        // seconds E must be held on "break the seal" (no accidental taps)
const INPUT_GUARD = 0.35;     // ignore E this long after a view or a choice appears (double presses)
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
  },
  carryOpened: {
    zh: '把文件袋交给老林。封条已经破了。',
    en: 'Bring the pouch to Old Lin. The seal is broken.',
  },
};
const OUTCOME = {
  sealed: {
    card: { zh: '封条完好，交到了老林手里', en: 'Handed over with the seal intact' },
    zh: '封条完好地交了出去。里面写的是什么，只有老林知道。',
    en: 'The seal went over intact. What the page says, only Old Lin knows.',
  },
  opened: {
    card: { zh: '封条已破，交到了老林手里', en: 'Handed over with the seal broken' },
    zh: '十月三十一日，老周失踪两天后，纸上签着他的名字。老林看见了撕开的封条。',
    en: '31 October: two days after Zhou went missing, a page signed in his name. And Old Lin saw the torn seal.',
  },
};

// Choices are text-only (unvoiced). W/S or the wheel moves the highlight; E confirms.
const OFFER_OPTIONS = [{ id: 'accept', zh: '答应', en: 'Agree' }, { id: 'decline', zh: '先不了', en: 'Not now' }];
const PICKUP_OPTIONS = [{ id: 'take', zh: '原封拿走', en: 'Take it, sealed' }, { id: 'break', zh: '撕开封条', en: 'Break the seal', hold: true }];
const OPENED_OPTIONS = [{ id: 'away', zh: '收好', en: 'Put it away' }];

export function createMissionOne({ hud, audio, pouch, npcs, isClueRead = () => false, onViewClosed = () => {} }) {
  const mission = createWrongHandoff();
  let offerPending = false;     // Old Lin has asked; waiting on a choice (agree / not now)
  let offerIndex = 0, offerShownAt = 0;
  let afterLineSaid = false;    // one outcome-specific greeting after completion, then normal ones
  let pendingThought = null;    // shown once the player steps back from the handoff
  let view = null;              // null | 'pickup' | 'opened'
  let viewOpenedAt = 0, holdStart = 0, hold = 0, holding = false, viewIndex = 0;
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
      case 'idle': offerPending = true; offerIndex = 0; offerShownAt = clock(); return L.offer;
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
  // the offer's two answers, chosen inside Old Lin's subtitle bar
  function dialogueMove(d) { if (offerPending) offerIndex = Math.max(0, Math.min(OFFER_OPTIONS.length - 1, offerIndex + d)); }
  // E in the dialogue: 'accept' | 'decline' | 'close' | null (too soon after the offer appeared)
  function dialogueConfirm() {
    if (!offerPending) return 'close';
    if (clock() - offerShownAt < INPUT_GUARD) return null;
    return OFFER_OPTIONS[offerIndex].id;
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
    const zh = getLang() === 'zh';
    if (sealedNow) {
      $('pouch-h').textContent = zh ? '文件袋' : 'Sealed pouch';
      $('pouch-body').innerHTML = zh ? `
        <p>牛皮纸信封，线绕在两颗纽扣上。封口贴着一张封条，上面签了字：一旦撕开，谁都看得出来。</p>
        <p class="label">标签上，红色马克笔写着沪语：<em>“家属托付，交林先生。勿要拆。”</em></p>
        <p>${isClueRead() ? '同样的红色马克笔，同样粗重的笔迹，和老周寻人启事上那句“侬勿要再寻了”一模一样。' : '红色马克笔，笔画粗重，像毛笔写的。江边灯柱上那张启事上，也有红字。'}</p>` : `
        <p>Kraft envelope, string wound round two buttons. A paper seal is pasted across the flap and signed over: once it is broken, anyone will see it was.</p>
        <p class="label">The label, in red marker, in Shanghainese: <i>From the family, for Mr Lin. Do not open.</i></p>
        <p>${isClueRead()
          ? 'The same red marker, the same heavy hand as the reply scrawled across Zhou\'s missing-person notice: <em>"Stop looking."</em>'
          : 'Red marker, a heavy, brush-like hand. There was red writing on the notice taped to the lamp by the river, too.'}</p>`;
    } else {
      $('pouch-h').textContent = zh ? '摊位转让协议' : 'Stall transfer agreement';
      $('pouch-body').innerHTML = zh ? `
        <p>转让的是汉口路上老周的修表摊，“连同柜台、工具及摊位使用权”。受让方一栏空着。</p>
        <p>落款是钢笔签的“周伯年”，上面按着红手印。日期：<b>2026年10月31日</b>。</p>
        <p class="discrepancy">可老周<b>10月29日</b>傍晚收摊后就没人见过他了。江边的启事这么写，老林也这么说。</p>
        <p>封条已经撕破，贴不回去了。</p>` : `
        <p>Zhou's stall on Hankou Road, "with counter, tools and right of use". The line for the new holder's name is blank.</p>
        <p>Signed 周伯年 in ink, a red thumbprint over it. Dated <b>31 October 2026</b>.</p>
        <p class="discrepancy">Nobody has seen Zhou since he packed up his stall at dusk on <b>29 October</b>. The notice by the river says so, and so does Old Lin.</p>
        <p>The seal is torn through. There is no pasting it back.</p>`;
    }
    renderOptions();
    $('pouch-esc').textContent = kind === 'pickup' ? `Esc ${t('leaveIt')}` : '';
  }
  const viewOptions = () => (view === 'opened' ? OPENED_OPTIONS : PICKUP_OPTIONS);
  function renderOptions() {
    const box = $('pouch-options');
    box.replaceChildren(...viewOptions().map((o, i) => {
      const row = document.createElement('div');
      row.className = `opt${i === viewIndex ? ' sel' : ''}`;
      row.innerHTML = `<span class="mk">›</span> ${tr(o)}${o.hold ? ` <small>(${t('holdE')})</small> <i class="hold"><b></b></i>` : ''}`;
      return row;
    }));
    const multi = viewOptions().length > 1;
    $('pouch-hint').innerHTML = multi ? `<kbd>W</kbd>/<kbd>S</kbd> ${t('choose')} &nbsp; <kbd>E</kbd> ${t('confirm')}` : `<kbd>E</kbd> ${t('confirm')}`;
  }
  function openView(kind) {
    view = kind; viewOpenedAt = clock(); hold = 0; holding = false; viewIndex = 0;
    fillView(kind);
    hud.show('pouch', true);
  }
  function closeView(notify = true) {
    if (!view) return;
    view = null; holding = false; hold = 0;
    hud.show('pouch', false);
    if (notify) onViewClosed();
  }

  function viewMove(d) {
    if (!view || holding) return;
    const n = viewOptions().length, next = Math.max(0, Math.min(n - 1, viewIndex + d));
    if (next !== viewIndex) { viewIndex = next; renderOptions(); }
  }
  // E down / up inside the view. A plain option acts on press; a hold option needs E held.
  function viewPress(down) {
    if (!down) { holding = false; return; }
    if (!view || viewAge() < INPUT_GUARD || holding) return;
    const o = viewOptions()[viewIndex];
    if (o.hold) { if (mission.sealed) { holding = true; holdStart = clock(); } return; }
    if (o.id === 'take' && mission.pickUp()) audio.cue('collect');
    closeView();
  }

  function update() {
    if (!view) return;
    hold = holding ? clock() - holdStart : 0;
    const bar = document.querySelector('#pouch-options .hold b');
    if (bar) bar.style.width = `${Math.min(100, (hold / HOLD_TIME) * 100)}%`;
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
    viewMove, viewPress, closeView, update, devStart,
    dialogueMove, dialogueConfirm,
    get dialogueChoices() { return offerPending ? { options: OFFER_OPTIONS, index: offerIndex } : null; },
    get offerPending() { return offerPending; },
    get viewIndex() { return viewIndex; },
    get view() { return view; },
    get hold() { return hold; },
  };
}
