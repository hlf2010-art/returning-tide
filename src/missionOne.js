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

const WITNESS_THOUGHT = {
  saw: { zh: '拎红纸袋的那个男人，从柜台边走开、过马路的样子，你记住了。', en: 'And the man with the red paper carrier, walking off from the counter and across the road: you remember him.' },
  missed: { zh: '你走近摊子的时候，好像有人从柜台边走开了。你那会儿只顾着看那个袋子。', en: 'As you came up to the stall, someone seemed to walk away from the counter. You only had eyes for the pouch.' },
};

// Choices are text-only (unvoiced). W/S or the wheel moves the highlight; E confirms.
const OFFER_OPTIONS = [{ id: 'accept', zh: '答应', en: 'Agree' }, { id: 'decline', zh: '先不了', en: 'Not now' }];
const OPENED_OPTIONS = [{ id: 'away', zh: '收好', en: 'Put it away' }];

// The pouch close-up is an object, not a menu (the logic we took from a short we studied: a choice
// becomes a thing in your hands, and the verbs are what you can do to that thing). A / D, the arrow
// keys or moving the mouse turns it over. What you can do depends on the side you are looking at:
//   front  the label. Take it as it is.
//   back   the flap. Take it, or unwind the string. With the string off: wind it back (reversible,
//          but never as neatly: Old Lin will see it was undone), or hold E to tear the seal (for good).
// To open it at all you have to turn it over and take the string off first: two beats, an intent
// and then the act, with a way back in between.
const OPT = {
  take: { id: 'take', zh: '原封拿走', en: 'Take it, sealed' },
  unwind: { id: 'unwind', zh: '解开绳子', en: 'Unwind the string' },
  rewind: { id: 'rewind', zh: '把绳子绕回去', en: 'Wind the string back' },
  break: { id: 'break', zh: '撕开封条', en: 'Break the seal', hold: true },
};
const FLIP_DRAG = 140;        // px of mouse movement that turns the pouch over

export function createMissionOne({ hud, audio, pouch, npcs, isClueRead = () => false, onViewClosed = () => {} }) {
  const mission = createWrongHandoff();
  let offerPending = false;     // Old Lin has asked; waiting on a choice (agree / not now)
  let offerIndex = 0, offerShownAt = 0;
  let afterLineSaid = false;    // one outcome-specific greeting after completion, then normal ones
  let pendingThought = null;    // shown once the player steps back from the handoff
  let view = null;              // null | 'pickup' | 'opened'
  let viewOpenedAt = 0, holdStart = 0, hold = 0, holding = false, viewIndex = 0;
  let face = 'front', drag = 0;  // which side of the pouch the close-up shows
  const viewAge = () => clock() - viewOpenedAt;

  pouch.attachToLin(npcs);

  function objective() {
    if (mission.step === 'collect') return STEP_TEXT.collect;
    if (mission.step === 'carry') return mission.sealed ? STEP_TEXT.carrySealed : STEP_TEXT.carryOpened;
    return null;
  }
  function syncWorld() {
    const s = mission.step;
    pouch.setLook(mission.sealed ? mission.string : 'torn');
    pouch.show(s === 'collect' ? 'stall' : s === 'carry' ? 'held' : s === 'complete' ? 'lin' : 'none');
    hud.objective(objective());
  }
  mission.on('change', syncWorld);
  mission.on('complete', ({ outcome, witnessed }) => {
    const o = OUTCOME[outcome];
    hud.missionCard(o.card, 8);
    // the thought afterwards also says whether he saw who left it: so a player who missed the man
    // learns there was someone to see (and a second playthrough knows where to look)
    const w = witnessed ? WITNESS_THOUGHT.saw : WITNESS_THOUGHT.missed;
    pendingThought = { zh: `${o.zh}${w.zh}`, en: `${o.en} ${w.en}` };
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
      case 'carry': {
        const string = mission.string, out = mission.handOver();
        return out === 'sealed' && string === 'rewound' ? L.sealedRewound : L[out];   // he sees the string was undone
      }
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
  const zh = () => getLang() === 'zh';
  function sideText() {
    if (face === 'front') return zh() ? `
        <p>牛皮纸文件袋，一面朝上，干干净净，只有一张标签。</p>
        <p class="label">红色马克笔写着沪语：<em>“家属托付，交林先生。勿要拆。”</em></p>
        <p>${isClueRead() ? '同样的红色马克笔，同样粗重的笔迹，和老周寻人启事上那句“侬勿要再寻了”一模一样。' : '红色马克笔，笔画粗重，像毛笔写的。江边灯柱上那张启事上，也有红字。'}</p>` : `
        <p>A kraft document pouch, face up, clean but for one label.</p>
        <p class="label">In red marker, in Shanghainese: <i>From the family, for Mr Lin. Do not open.</i></p>
        <p>${isClueRead() ? 'The same red marker, the same heavy hand as the reply scrawled across Zhou\'s missing-person notice: <em>"Stop looking."</em>' : 'Red marker, a heavy, brush-like hand. There was red writing on the notice taped to the lamp by the river, too.'}</p>`;
    const s = mission.string;
    if (s === 'unwound') return zh() ? `
        <p>线从两颗纽扣上解下来了，垂在一边。</p>
        <p>封条还在，签名横跨封口。现在把线绕回去，还来得及。</p>
        <p class="discrepancy">再往下，就只能撕了。撕开了，谁都看得出来。</p>` : `
        <p>The string is off the two buttons, hanging loose.</p>
        <p>The seal is still there, the signature across the flap. You can still wind the string back.</p>
        <p class="discrepancy">Past this, the only way in is to tear it. And anyone will see that it was.</p>`;
    if (s === 'rewound') return zh() ? `
        <p>你把线绕了回去。绕得没有原来规整：不再是8字，只是松松缠了两圈，线头露在外面。</p>
        <p>封条完好。</p>` : `
        <p>You have wound the string back. Not as neatly as it was: no longer a figure-of-eight, just two slack turns, the end hanging out.</p>
        <p>The seal is whole.</p>`;
    return zh() ? `
        <p>封口这一面：一根线在两颗纽扣之间绕成8字，整整三圈，很规整，是会绕线的人绕的。</p>
        <p>封口上贴着一张封条，签了个“周”字，横跨纸边：一旦撕开，谁都看得出来。</p>` : `
        <p>The flap side: a string wound figure-of-eight between two buttons, three neat turns, by someone who knows how.</p>
        <p>A paper seal is pasted across the flap, signed 周 over its edge: once it is broken, anyone will see it was.</p>`;
  }
  function paperFor(kind) {
    const paper = $('pouch-paper');
    if (kind === 'opened') {
      const canvas = pouch.canvases.doc; canvas.classList.add('doc');
      if (paper.firstChild !== canvas) paper.replaceChildren(canvas);
      return;
    }
    let flip = paper.querySelector('.pouch-flip');
    if (!flip) {
      flip = document.createElement('div'); flip.className = 'pouch-flip';
      const f = document.createElement('div'); f.className = 'pf pf-front';
      const b = document.createElement('div'); b.className = 'pf pf-back';
      flip.append(f, b); paper.replaceChildren(flip);
    }
    const front = flip.querySelector('.pf-front'), back = flip.querySelector('.pf-back');
    const fc = pouch.canvases.front, bc = pouch.canvases[mission.sealed ? mission.string : 'torn'];
    if (front.firstChild !== fc) front.replaceChildren(fc);
    if (back.firstChild !== bc) back.replaceChildren(bc);
    flip.dataset.face = face;
  }
  function fillView(kind) {
    paperFor(kind);
    if (kind === 'opened') {
      $('pouch-h').textContent = zh() ? '摊位转让协议' : 'Stall transfer agreement';
      $('pouch-body').innerHTML = zh() ? `
        <p>转让的是汉口路上老周的修表摊，“连同柜台、工具及摊位使用权”。受让方一栏空着。</p>
        <p>落款是钢笔签的“周伯年”，上面按着红手印。日期：<b>2026年10月31日</b>。</p>
        <p class="discrepancy">可老周<b>10月29日</b>傍晚收摊后就没人见过他了。江边的启事这么写，老林也这么说。</p>
        <p>封条已经撕破，贴不回去了。</p>` : `
        <p>Zhou's stall on Hankou Road, "with counter, tools and right of use". The line for the new holder's name is blank.</p>
        <p>Signed 周伯年 in ink, a red thumbprint over it. Dated <b>31 October 2026</b>.</p>
        <p class="discrepancy">Nobody has seen Zhou since he packed up his stall at dusk on <b>29 October</b>. The notice by the river says so, and so does Old Lin.</p>
        <p>The seal is torn through. There is no pasting it back.</p>`;
    } else {
      $('pouch-h').innerHTML = zh() ? `文件袋<span>${face === 'front' ? '正面' : '封口'}</span>` : `Sealed pouch<span>${face === 'front' ? 'front' : 'the flap'}</span>`;
      $('pouch-body').innerHTML = sideText();
    }
    renderOptions();
    $('pouch-esc').textContent = kind === 'pickup' ? `Esc ${t('leaveIt')}` : '';
  }
  const viewOptions = () => {
    if (view === 'opened') return OPENED_OPTIONS;
    if (face === 'front') return [OPT.take];
    return mission.string === 'unwound' ? [OPT.rewind, OPT.break] : [OPT.take, OPT.unwind];
  };
  function renderOptions() {
    const box = $('pouch-options');
    box.replaceChildren(...viewOptions().map((o, i) => {
      const row = document.createElement('div');
      row.className = `opt${i === viewIndex ? ' sel' : ''}`;
      row.innerHTML = `<span class="mk">›</span> ${tr(o)}${o.hold ? ` <small>(${t('holdE')})</small> <i class="hold"><b></b></i>` : ''}`;
      return row;
    }));
    const multi = viewOptions().length > 1, turn = view === 'pickup';
    const turnHint = turn ? `<kbd>A</kbd>/<kbd>D</kbd> ${zh() ? '翻面' : 'turn over'} &nbsp; ` : '';
    $('pouch-hint').innerHTML = turnHint + (multi ? `<kbd>W</kbd>/<kbd>S</kbd> ${t('choose')} &nbsp; <kbd>E</kbd> ${t('confirm')}` : `<kbd>E</kbd> ${t('confirm')}`);
  }
  function openView(kind) {
    view = kind; viewOpenedAt = clock(); hold = 0; holding = false; viewIndex = 0; drag = 0;
    if (kind === 'pickup') face = 'front';
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
  // turn the pouch over (A / D, arrows, or enough mouse movement); only before it is opened
  function viewFlip() {
    if (view !== 'pickup' || holding) return false;
    face = face === 'front' ? 'back' : 'front'; viewIndex = 0; drag = 0;
    fillView('pickup');
    return true;
  }
  function viewDrag(dx) {
    if (view !== 'pickup' || holding) return;
    drag += dx;
    if (Math.abs(drag) >= FLIP_DRAG) viewFlip();
  }
  // E down / up inside the view. A plain option acts on press; a hold option needs E held.
  function viewPress(down) {
    if (!down) { holding = false; return; }
    if (!view || viewAge() < INPUT_GUARD || holding) return;
    const o = viewOptions()[viewIndex];
    if (!o) return;
    if (o.hold) { if (mission.sealed && mission.string === 'unwound') { holding = true; holdStart = clock(); } return; }
    if (o.id === 'unwind' || o.id === 'rewind') {
      if (mission[o.id]()) { audio.cue('string'); viewOpenedAt = clock(); viewIndex = 0; fillView('pickup'); }
      return;
    }
    if (o.id === 'take' && mission.pickUp()) audio.cue('collect');
    closeView();
  }

  function update() {
    if (!view) return;
    hold = holding ? clock() - holdStart : 0;
    const bar = document.querySelector('#pouch-options .hold b');
    if (bar) bar.style.width = `${Math.min(100, (hold / HOLD_TIME) * 100)}%`;
    const flip = document.querySelector('#pouch-paper .pouch-flip');
    if (flip) flip.style.setProperty('--tear', String(Math.min(1, hold / HOLD_TIME)));
    if (hold >= HOLD_TIME && mission.sealed) {
      // taken and torn in one go: the lift, then the rip a beat later
      const lifted = mission.step === 'collect' && mission.pickUp();
      if (lifted) audio.cue('collect');
      if (mission.breakSeal()) audio.cue('tear', lifted ? 0.22 : 0);
      holding = false;
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
    viewMove, viewPress, viewFlip, viewDrag, closeView, update, devStart,
    witness: () => mission.witness(),
    get collecting() { return mission.step === 'collect'; },
    dialogueMove, dialogueConfirm,
    get dialogueChoices() { return offerPending ? { options: OFFER_OPTIONS, index: offerIndex } : null; },
    get offerPending() { return offerPending; },
    get viewIndex() { return viewIndex; },
    get face() { return face; },
    get view() { return view; },
    get hold() { return hold; },
  };
}
