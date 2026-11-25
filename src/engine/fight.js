// A row on the street, and what it costs. Pure (no three.js, no DOM), node-tested (tests/fight.test.mjs).
// Fighting in this game is rare, ugly, short, and it follows you home. Three parts:
//
//   the dispute   a drunk man is giving someone a hard time. What you say moves his temper; most
//                 roads end without a blow (talked down, stood your ground, the hotel's security,
//                 110, walked away), a few end in one. createDispute / choices / disputeStep.
//   the blows     two people, a few exchanges. You: a jab, a cross, a guard, a slip to the side, backing
//                 off. Him: he telegraphs (wind-up -> strike -> recovery), flinches, staggers, backs
//                 off, gives up. Range, facing and timing decide what lands; wind and a little health on
//                 both sides. It ends when he backs down, you get away, you go down, or you are pulled
//                 apart. createFight / stepFight.
//   afterwards    injury (engine/year.js injure), the police when it went far or someone called
//                 (a statement, a warning, a fine, hours lost), reputation on the street, online (a
//                 bystander films) and at work, what anyone with you makes of it (engine/hearts.js),
//                 messages the next morning, and one 'fight' fact on the ledger. settle / applyOutcome
//                 / morningAfter. Everything is applied once; state lives in life.flags.fight.
//
// Conventions: positions are world metres (x, z); a heading h faces (sin h, cos h), so the player's
// heading is his view yaw + pi. Times are seconds. Health and wind run 0..100.
import { stamp, post, thread, pay, balance } from './life.js';
import { rep, injure, fact, isYear } from './year.js';
import { feel, remember, ROMANCE } from './hearts.js';

// ---------------------------------------------------------------------------------------------
// the dispute
// ---------------------------------------------------------------------------------------------
export const NODES = {
  open: ['calm', 'shield', 'help', 'leave'],          // what you can do when you first step in
  calm: ['face', 'cameras', 'threat', 'police'],      // he has turned on you, still talking
  shoved: ['open', 'shove', 'security', 'police'],    // you stood between them and he pushed you
  threat: ['strike', 'guard', 'backdown'],            // you squared up to him
  help: ['security', 'police'],                       // fetching someone
};
export const PEACEFUL = ['talked', 'stood', 'security', 'police', 'walked', 'passed'];
export const VIOLENT = ['won', 'broke', 'down', 'separated'];
export const OUTCOMES = [...PEACEFUL, ...VIOLENT];
const TENSION0 = 55, SNAP = 60;                        // above SNAP, calling the police sets him off

export function createDispute() { return { node: 'open', tension: TENSION0, path: [], shielded: false, shoves: 0, called: false, end: null }; }
export const choices = (D) => (D.end ? [] : NODES[D.node] || []);
// move: one of choices(D). Returns D.end once it's decided:
//   { outcome: 'talked'|'stood'|'security'|'police'|'walked', how }   it ends here, nobody hit
//   { fight: true, started: 'you'|'him', called }                     it comes to blows
export function disputeStep(D, move) {
  if (D.end || !choices(D).includes(move)) return null;
  D.path.push(move);
  const end = (outcome, how = move) => (D.end = { outcome, how, called: D.called });
  const blows = (started) => (D.end = { fight: true, started, called: D.called });
  switch (move) {
    case 'calm': D.tension -= 15; D.node = 'calm'; break;
    case 'shield': D.tension += 10; D.shielded = true; D.shoves += 1; D.node = 'shoved'; break;   // she gets behind you; he shoves you
    case 'help': D.node = 'help'; break;
    case 'leave': end('walked'); break;
    case 'face': D.tension -= 18; end('talked'); break;            // a way out that lets him keep his face
    case 'cameras': D.tension -= 5; end('talked'); break;          // he leaves because he has to, not because he wants to
    case 'threat': D.tension += 35; D.shoves += 1; D.node = 'threat'; break;
    case 'open': end('stood'); break;                              // hands open: you take the shove and don't give it back
    case 'backdown': D.tension -= 20; end('stood'); break;
    case 'security': end('security'); break;
    case 'police': D.called = true; if (D.tension > SNAP) blows('him'); else end('police'); break;   // already shoving: he goes for the phone
    case 'shove': blows('him'); break;                             // he pushed first; you pushed back; he swings
    case 'guard': blows('him'); break;
    case 'strike': blows('you'); break;                            // you threw the first punch
    default: return null;
  }
  return D.end;
}

// ---------------------------------------------------------------------------------------------
// the blows
// ---------------------------------------------------------------------------------------------
export const FIGHT = {
  // you
  jab: { hitAt: 0.10, total: 0.38, dmg: 7, reach: 1.2, cost: 9 },
  cross: { hitAt: 0.26, total: 0.72, dmg: 15, reach: 1.15, cost: 18 },
  dodge: { total: 0.42, safe: [0.03, 0.34], dist: 0.75, cost: 12 },
  cone: 0.5,                 // rad: how squarely you must face him for a punch to land
  buffer: 0.22,              // s: a press a moment early still counts (never more than one queued)
  speed: 1.5, guardSpeed: 0.8, awaySpeed: 2.0, minDist: 0.7,
  regen: 16, guardRegen: 6, regenDelay: 0.45,
  block: 0.2, blockCost: 0.6, guardBreakAt: 8,
  hurt: 0.3, stagger: 0.7,
  glance: 0.4, counter: 1.3, counterFor: 0.9, tired: 0.5,
  chainRest: 0.3, chain: [1, 0.8, 0.5, 0.35],   // punches thrown one on top of another are arm punches: weaker each time, and from the third they move nobody
  away: { dist: 3.2, hold: 0.9 },
  // him: a heavy, drunk man. Slow hands, long recoveries, a short temper and not much wind.
  him: {
    speed: 1.15, backSpeed: 1.5, yieldSpeed: 0.55, range: 0.95, turn: 2.4, turnWind: 1.0,
    haymaker: { wind: 0.62, dmg: 27, reach: 1.3, cone: 0.6, recover: 0.85, cost: 26, push: 0.3 },
    shove: { wind: 0.42, dmg: 6, reach: 1.15, cone: 0.5, recover: 0.5, cost: 14, push: 0.9 },
    straight: { wind: 0.36, dmg: 13, reach: 1.2, cone: 0.42, recover: 0.5, cost: 14, push: 0.15 },
    strike: 0.14, missExtra: 0.3, flinch: 0.32, stagger: 0.9, backoff: 1.7, gassed: 2.3, cover: 0.6,
    regen: 4, breath: 35, stopBefore: 0.7, yieldAt: 35, nerve: 3, whiffs: 4,
  },
  separate: { seconds: 32, exchanges: 10 },
};
const wrap = (a) => { let r = a; while (r > Math.PI) r -= Math.PI * 2; while (r < -Math.PI) r += Math.PI * 2; return r; };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const bearing = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

// started: who threw the first blow ('him' swings at once; 'you' start with a punch already on its way)
// canStand(x, z): false where nobody can go (a wall, the kerb); rnd: his choices
export function createFight({ started = 'him', called = false, rnd = Math.random, canStand = null, you = {}, him = {} } = {}) {
  const F = {
    t: 0, over: null, how: null, started, called, rnd, canStand, exchanges: 0, cheap: 0,
    you: { x: 0, z: 0, h: 0, hp: 100, st: 100, act: 'ready', at: 0, dur: 0, hand: 'L', resolved: true, guard: false, dir: 0, buf: null, bufT: 0, rest: 1, chain: 0, counterT: 0, awayT: 0,
      thrown: 0, landed: 0, heavy: 0, took: 0, blocked: 0, slipped: 0, ...you },
    him: { x: 0, z: 1.5, h: Math.PI, hp: 100, st: 100, nerve: FIGHT.him.nerve, act: 'close', at: 0, dur: 0, attack: null, wait: started === 'him' ? 0.35 : 0.9, aim: 0, flinches: 0, whiffs: 0, quick: false, yielding: false,
      swings: 0, ...him },
  };
  if (started === 'you') F.you.buf = 'jab', F.you.bufT = 1;      // the first punch is yours, already thrown
  return F;
}

// inp: { f: -1..1 (toward / away along your view), h: your heading (omit: you face him), guard, away (held),
//        jab, cross (pressed this frame), dodge: -1 left | 1 right (pressed this frame) }
// Returns what happened, for the eyes and ears: tell, strike, swing, hit, whiff, dodge, react, guardbreak, spent, over.
export function stepFight(F, dt, inp = {}) {
  const ev = [];
  let left = Math.min(dt, 0.5), one = inp;
  while (left > 1e-9 && !F.over) {
    const h = Math.min(left, 1 / 120); left -= h;
    sub(F, h, one, ev);
    if (one === inp && (inp.jab || inp.cross || inp.dodge)) one = { ...inp, jab: false, cross: false, dodge: 0 };   // a press is one press
  }
  return ev;
}
const finish = (F, outcome, how, ev) => { if (F.over) return; F.over = outcome; F.how = how; ev.push({ type: 'over', outcome, how }); };
function moveTo(F, who, x, z) {
  if (F.canStand && !F.canStand(x, z)) { if (F.canStand(x, who.z)) z = who.z; else if (F.canStand(who.x, z)) x = who.x; else return false; }
  who.x = x; who.z = z; return true;
}
function himTo(F, act, dur, ev, why = null) {
  const H = F.him; H.act = act; H.at = 0; H.dur = dur;
  if (why) ev.push({ type: 'react', to: why });
}

function sub(F, h, inp, ev) {
  const Y = F.you, H = F.him, K = FIGHT, KH = K.him;
  F.t += h;
  let d = dist(Y, H), b = bearing(Y, H);
  if (inp.h != null) Y.h = inp.h; else Y.h = b;
  Y.counterT = Math.max(0, Y.counterT - h);

  // ---- you ----
  if (inp.jab) { Y.buf = 'jab'; Y.bufT = K.buffer; } else if (inp.cross) { Y.buf = 'cross'; Y.bufT = K.buffer; }
  if (Y.buf && (Y.bufT -= h) < 0 && Y.act !== 'ready') Y.buf = null;
  const away = !!inp.away && Y.act === 'ready';
  Y.guard = !!inp.guard && Y.act === 'ready' && !away;
  if (Y.act !== 'ready') {
    Y.at += h;
    if ((Y.act === 'jab' || Y.act === 'cross') && !Y.resolved && Y.at >= K[Y.act].hitAt * Y.slow) { Y.resolved = true; yourPunch(F, d, b, ev); }
    if (Y.act === 'dodge') {                                        // a step to the side, round him
      const v = K.dodge.dist / K.dodge.total * Y.dir;
      moveTo(F, Y, Y.x - Math.cos(b) * v * h, Y.z + Math.sin(b) * v * h);
    }
    if (Y.at >= Y.dur) { if (Y.act !== 'jab' && Y.act !== 'cross') Y.chain = 0; Y.act = 'ready'; Y.at = 0; Y.rest = 0; }
  }
  if (Y.act === 'ready') {
    Y.rest += h; if (Y.rest >= K.chainRest) Y.chain = 0;
    if (inp.dodge && !away) {
      if (Y.st >= K.dodge.cost * 0.6) { Y.act = 'dodge'; Y.at = 0; Y.dur = K.dodge.total; Y.dir = inp.dodge < 0 ? -1 : 1; Y.st = Math.max(0, Y.st - K.dodge.cost); Y.buf = null; ev.push({ type: 'dodge', dir: Y.dir }); }
      else ev.push({ type: 'spent' });
    } else if (Y.buf && !away) {
      const kind = Y.buf, P = K[kind]; Y.buf = null;
      if (Y.st < P.cost * 0.4) ev.push({ type: 'spent' });          // nothing left in the arms
      else {
        const tired = Y.st < P.cost;
        Y.act = kind; Y.at = 0; Y.slow = tired ? 1.4 : 1; Y.dur = P.total * Y.slow; Y.resolved = false; Y.tired = tired;
        Y.hand = kind === 'jab' ? 'L' : 'R'; Y.st = Math.max(0, Y.st - P.cost); Y.thrown += 1; Y.nth = Y.chain; Y.chain += 1;
        ev.push({ type: 'swing', kind, hand: Y.hand, tired });
      }
    }
  }
  if (Y.act === 'ready') {
    // feet: toward him or away, along where you're looking; backing off is quicker and gives up the guard
    const f = away ? -1 : clamp(inp.f || 0, -1, 1);
    if (f) {
      const sp = (away ? K.awaySpeed : Y.guard ? K.guardSpeed : K.speed) * (0.65 + 0.35 * Y.st / 100) * f;
      let nx = Y.x + Math.sin(Y.h) * sp * h, nz = Y.z + Math.cos(Y.h) * sp * h;
      const nd = Math.hypot(H.x - nx, H.z - nz);
      if (nd < K.minDist && nd < d) { nx = Y.x; nz = Y.z; }           // not through him
      moveTo(F, Y, nx, nz);
    }
    if (Y.rest > K.regenDelay) Y.st = Math.min(100, Y.st + (Y.guard ? K.guardRegen : K.regen) * h);
  }
  d = dist(Y, H); b = bearing(Y, H);
  if (away && d >= K.away.dist) { if ((Y.awayT += h) >= K.away.hold) return finish(F, 'broke', 'away', ev); } else Y.awayT = 0;

  // ---- him ----
  const hb = bearing(H, Y);                                        // where you are, from him
  H.at += h;
  const turn = (rate) => { H.h += clamp(wrap(hb - H.h), -rate * h, rate * h); };
  switch (H.act) {
    case 'close': {
      turn(KH.turn);
      H.st = Math.min(100, H.st + KH.regen * h);
      if (H.cover > 0) H.cover -= h;
      if (d > KH.range) { const s = Math.min(KH.speed * h, d - KH.range); moveTo(F, H, H.x + Math.sin(hb) * s, H.z + Math.cos(hb) * s); }
      if (d <= KH.range + 0.35 && (H.wait -= h) <= 0) {
        const r = F.rnd(), name = H.quick ? 'straight' : d < 0.8 || (Y.guard && r < 0.45) ? 'shove' : r < 0.62 ? 'haymaker' : r < 0.82 ? 'shove' : 'straight';
        const A = KH[name]; H.firm = H.quick; H.quick = false;                        // (the short one he comes back with can't be stopped)
        if (H.st < A.cost) { H.nerve -= 1; H.yielding = H.nerve <= 0 || H.hp <= KH.yieldAt; himTo(F, 'backoff', KH.gassed, ev, H.yielding ? 'yield' : 'gassed'); H.st = Math.min(100, H.st + KH.breath); break; }
        H.st -= A.cost; H.attack = name; H.swings += 1; himTo(F, 'windup', A.wind, ev); ev.push({ type: 'tell', attack: name, dur: A.wind });
      }
      break;
    }
    case 'windup':
      turn(KH.turnWind);
      if (H.at >= H.dur) { H.aim = H.h; himTo(F, 'strike', KH.strike, ev); hisStrike(F, ev); }
      break;
    case 'strike':
      if (H.at >= H.dur) himTo(F, 'recover', KH[H.attack].recover + (H.missed ? KH.missExtra : 0), ev);
      break;
    case 'recover': case 'flinch':
      if (H.at >= H.dur) { H.wait = H.quick ? 0.22 : 0.45 + F.rnd() * 0.6; if (H.act === 'recover') H.flinches = 0; himTo(F, 'close', 0, ev); }
      break;
    case 'stagger': {
      const s = 0.55 * h / KH.stagger; moveTo(F, H, H.x - Math.sin(hb) * s, H.z - Math.cos(hb) * s);   // a step back, off balance
      if (H.at >= H.dur) {
        H.flinches = 0;
        if (H.nerve <= 0 || H.hp <= KH.yieldAt) { H.yielding = true; himTo(F, 'backoff', KH.backoff, ev, 'yield'); }
        else { H.wait = 0.5 + F.rnd() * 0.5; himTo(F, 'close', 0, ev); }
      }
      break;
    }
    case 'backoff': {
      turn(KH.turn);
      if (d < 2.7) { const s = (H.yielding ? KH.yieldSpeed : KH.backSpeed) * h; moveTo(F, H, H.x - Math.sin(hb) * s, H.z - Math.cos(hb) * s); }   // hands up, he can't get away from you fast
      if (H.at >= H.dur) {
        if (H.yielding) return finish(F, 'won', Y.landed ? 'backed' : 'spent', ev);
        H.wait = 0.4 + F.rnd() * 0.5; himTo(F, 'close', 0, ev);
      }
      break;
    }
    default: break;
  }
  if (F.over) return;
  if (!H.yielding && (F.t >= K.separate.seconds || F.exchanges >= K.separate.exchanges) && H.act !== 'windup' && H.act !== 'strike') finish(F, 'separated', 'pulled', ev);
}

// your punch arrives: is he there, are you facing him, and what was he doing
function yourPunch(F, d, b, ev) {
  const Y = F.you, H = F.him, K = FIGHT, KH = K.him, kind = Y.act, P = K[kind];
  if (d > P.reach) return ev.push({ type: 'whiff', by: 'you', why: 'range' });
  if (Math.abs(wrap(Y.h - b)) > K.cone) return ev.push({ type: 'whiff', by: 'you', why: 'facing' });
  const open = H.act === 'recover' || H.act === 'flinch' || H.act === 'stagger';
  const stop = H.act === 'windup' && !H.firm && H.at < H.dur * KH.stopBefore;   // caught early in the wind-up
  const cheap = H.act === 'backoff' && H.yielding;                    // he had his hands up
  const covered = H.act === 'close' || (H.act === 'backoff' && !H.yielding) || (H.act === 'windup' && !stop);   // his shoulder is already coming round
  const counter = open && Y.counterT > 0;
  const arm = Y.nth >= 2;                                             // the third on the trot: no weight behind it
  let dmg = P.dmg * (Y.tired ? K.tired : 1) * (covered ? K.glance : 1) * (counter ? K.counter : 1) * K.chain[Math.min(Y.nth, K.chain.length - 1)];
  dmg = Math.round(dmg * 10) / 10;
  H.hp = Math.max(0, H.hp - dmg); Y.landed += 1; if (kind === 'cross' && !covered) Y.heavy += 1; if (cheap) F.cheap += 1;
  ev.push({ type: 'hit', on: 'him', kind, hand: Y.hand, dmg, glancing: covered || arm, counter, stop: stop && !arm, cheap });
  // a full punch into a man with his hands up, drunk and not braced for it: he goes down
  if (H.hp <= 0 || (cheap && kind === 'cross' && !arm)) { himTo(F, 'down', 0, ev, 'down'); return finish(F, 'won', 'dropped', ev); }
  if (cheap || arm || H.act === 'stagger' || H.act === 'strike' || (H.act === 'windup' && !stop)) return;   // already reeling, or his swing is coming anyway: you trade
  if (covered) {
    if (kind === 'cross' && H.act === 'close') himTo(F, 'flinch', KH.flinch, ev, 'flinch');
    return;
  }
  if (kind === 'cross') { H.nerve -= 1; himTo(F, 'stagger', KH.stagger, ev, 'stagger'); return; }
  // a jab that lands clean: he flinches. Stopped mid wind-up, he comes straight back with a short one.
  if (stop) { H.quick = true; himTo(F, 'flinch', KH.flinch, ev, 'flinch'); return; }
  if (H.flinches < 2) { H.flinches += 1; himTo(F, 'flinch', KH.flinch, ev, 'flinch'); }
  else { H.flinches = 0; H.wait = KH.cover; himTo(F, 'close', 0, ev, 'cover'); }   // he covers up: no jabbing him to pieces
}

// his blow arrives
function hisStrike(F, ev) {
  const Y = F.you, H = F.him, K = FIGHT, A = K.him[H.attack];
  F.exchanges += 1; H.missed = false;
  ev.push({ type: 'strike', attack: H.attack });
  const d = dist(Y, H), off = Math.abs(wrap(H.aim - bearing(H, Y)));
  const slip = Y.act === 'dodge' && Y.at >= K.dodge.safe[0] && Y.at <= K.dodge.safe[1];
  if (slip || d > A.reach || off > A.cone) {
    H.missed = true; H.whiffs += 1;
    if (slip) { Y.slipped += 1; Y.counterT = K.counterFor + K.dodge.total - Y.at; }
    if (H.whiffs === K.him.whiffs) H.nerve -= 1;                      // swinging at air takes the heart out of him
    return ev.push({ type: 'whiff', by: 'him', attack: H.attack, slip, why: slip ? 'slip' : d > A.reach ? 'range' : 'facing' });
  }
  const push = (m) => { const hb = bearing(H, Y); moveTo(F, Y, Y.x + Math.sin(hb) * m, Y.z + Math.cos(hb) * m); };
  if (Y.guard) {
    const broke = Y.st < K.guardBreakAt;
    const dmg = Math.round(A.dmg * (broke ? 0.6 : K.block) * 10) / 10;
    Y.hp = Math.max(0, Y.hp - dmg); Y.st = Math.max(0, Y.st - A.dmg * K.blockCost); Y.blocked += 1; Y.rest = 0;
    push(A.push * (H.attack === 'shove' ? 0.7 : 0.4));
    ev.push({ type: 'hit', on: 'you', attack: H.attack, dmg, blocked: !broke, broke });
    if (broke) { ev.push({ type: 'guardbreak' }); Y.act = 'stagger'; Y.at = 0; Y.dur = K.stagger; Y.buf = null; }
  } else {
    Y.hp = Math.max(0, Y.hp - A.dmg); Y.took += 1; push(A.push);
    const heavy = H.attack === 'haymaker';
    Y.act = heavy ? 'stagger' : 'hurt'; Y.at = 0; Y.dur = heavy ? K.stagger : K.hurt; Y.buf = null; Y.resolved = true;
    ev.push({ type: 'hit', on: 'you', attack: H.attack, dmg: A.dmg, blocked: false });
  }
  if (Y.hp <= 0) finish(F, 'down', 'floored', ev);
}

// what the fight came to, in plain values (for settle)
export function fightSummary(F) {
  const Y = F.you, H = F.him;
  return { outcome: F.over, how: F.how, blows: true, started: F.started, called: !!F.called, landed: Y.landed, heavy: Y.heavy, cheap: F.cheap, took: Y.took, blocked: Y.blocked, slipped: Y.slipped,
    hp: Math.round(Y.hp), hisHp: Math.round(H.hp), seconds: Math.round(F.t * 10) / 10, exchanges: F.exchanges };
}

// ---------------------------------------------------------------------------------------------
// afterwards
// ---------------------------------------------------------------------------------------------
export const INJURY = {
  1: { zh: '指关节蹭破了皮，小臂上几块淤青', en: 'skinned knuckles and bruised forearms' },
  2: { zh: '眼眶青了一圈，嘴角裂了', en: 'a black eye and a split lip' },
  3: { zh: '眉骨缝了四针，半边脸肿着', en: 'four stitches over one eyebrow and a swollen face' },
};
export const FINE = 500, FINE_LIGHT = 200, HOSPITAL_BILL = 420;
// how badly you're hurt: 0 none .. 3 (a night per level to heal: engine/year.js)
export function injuryLevel(R) {
  if (!R.blows) return 0;
  if (R.outcome === 'down') return 3;
  if ((R.hp ?? 100) <= 55) return 2;
  return (R.took || 0) + (R.landed || 0) > 0 || (R.blocked || 0) >= 3 ? 1 : 0;
}
// do the police come? When someone called, when someone went down, when you were pulled apart, when it
// went on (blows given and taken add up), or when you hit a man who had stopped.
export function policeCome(R) {
  if (R.called) return true;
  if (!R.blows) return false;
  return R.outcome === 'down' || R.outcome === 'separated' || R.how === 'dropped' || (R.cheap || 0) > 0 || (R.landed || 0) + (R.heavy || 0) + (R.took || 0) >= 7;
}
// what they decide. statement: what you tell them: 'straight' | 'shade' (he started it, you only defended
// yourself) | 'little'. A phone was filming (R.filmed), so shading it only works when it's true.
//   -> { verdict: 'statement'|'warning'|'fine', fine, minutes, lied }
export function policeVerdict(R, statement = 'straight') {
  if (!policeCome(R)) return null;
  if (!R.blows) return { verdict: 'statement', fine: 0, minutes: 20, lied: false };
  const yours = R.started === 'you' || (R.cheap || 0) > 0 || (R.how === 'dropped' && (R.heavy || 0) >= 3);   // the worst of it was your doing
  let verdict = yours ? 'fine' : (R.landed || 0) > 0 ? 'warning' : 'statement', fine = verdict === 'fine' ? FINE : 0, lied = false;
  if (statement === 'straight' && verdict === 'fine') fine = FINE_LIGHT;                      // owning up counts for something
  if (statement === 'shade' && yours) { lied = true; if (R.filmed) fine = FINE; else { verdict = 'warning'; fine = 0; } }
  const minutes = { statement: 25, warning: 100, fine: 160 }[verdict] + (statement === 'little' ? 30 : 0);
  return { verdict, fine, minutes, lied };
}
// reputation: the street (the police, the neighbourhood), online (only if it was filmed), at work
export function repDeltas(R) {
  const v = R.police ? R.police.verdict : null, out = { street: 0, online: 0, work: 0 };
  const dirty = R.started === 'you' || (R.cheap || 0) > 0 || R.how === 'dropped';
  const clean = R.blows && !(R.landed > 0);                        // attacked, and never hit back
  out.street = { talked: 4, stood: 5, security: 2, police: 2, walked: -2, passed: 0, broke: 0, down: -1, separated: -3 }[R.outcome] ?? 0;
  if (R.outcome === 'won') out.street = dirty ? -3 : R.how === 'spent' ? 5 : 2;
  if (clean && R.outcome === 'separated') out.street = 1;
  out.street += { statement: 1, warning: -4, fine: -10 }[v] || 0;
  if (R.police && R.police.lied && R.filmed) out.street -= 4;
  if (R.filmed) {
    if (R.outcome === 'stood') out.online = 5;
    else if (R.outcome === 'talked') out.online = 2;
    else if (R.blows) out.online = dirty ? (R.started === 'you' ? -9 : -5) : clean ? 4 : R.outcome === 'down' ? 1 : R.outcome === 'separated' ? -3 : (R.landed || 0) <= 3 ? 3 : -2;
  }
  if (R.blows) {
    if (v === 'fine') out.work -= 8; else if (v === 'warning') out.work -= 2;
    if (R.filmed && dirty) out.work -= 6;
    if (injuryLevel(R) >= 2) out.work -= 1;                         // turning up with a black eye
  }
  return out;
}
// what someone who was with you makes of it. as: 'target' (she was the one he was bothering) | 'witness'
export function feelDeltas(R, as = 'witness') {
  const t = as === 'target', dirty = R.started === 'you' || (R.cheap || 0) > 0 || R.how === 'dropped';
  const pair = (w, x) => { const [a, b] = t ? x : w; return { attraction: a, trust: b }; };
  switch (R.outcome) {
    case 'talked': return pair([3, 5], [5, 9]);
    case 'stood': return pair([5, 5], [7, 10]);
    case 'security': return pair([0, 4], [1, 5]);
    case 'police': return pair([0, 3], [0, 4]);
    case 'walked': return pair([-3, -5], [-8, -14]);
    case 'passed': return pair([-2, -3], [-10, -16]);
    case 'won': return dirty ? pair([-4, -8], [-1, -4]) : pair([2, -2], [5, 3]);
    case 'broke': return pair([0, 1], [1, 2]);
    case 'down': return pair([1, 2], [3, 6]);
    case 'separated': return pair([-3, -6], [0, -3]);
    default: return { attraction: 0, trust: 0 };
  }
}

export const fightState = (L) => (L.flags.fight ||= { seen: false, applied: false, morning: false });
export const fightSeen = (L) => !!(L.flags.fight && L.flags.fight.seen);
// may the scene begin on its own? Once a game, in the year (older saves are left as they were), late in
// the evening, not on the first night.
export const LATE = { from: 21 * 60 + 40, to: 40 };                  // 21:40 - 00:40
export const isLate = (minute) => minute >= LATE.from || minute < LATE.to;
export function mayBegin(L, { minDay = 2 } = {}) { return isYear(L) && !fightSeen(L) && L.clock.day >= minDay && isLate(L.clock.minute); }

// Everything that follows from how it ended, worked out: R0 is { outcome, how, blows, started, called,
// filmed, ...fightSummary }, statement what you told the police, companion { id, as } if someone was
// with you. Returns the whole result (plain values; this is what onOutcome listeners get).
export function settle(R0, { statement = 'straight', companion = null } = {}) {
  const R = { how: null, blows: false, started: null, called: false, filmed: false, landed: 0, heavy: 0, cheap: 0, took: 0, blocked: 0, hp: 100, hisHp: 100, ...R0 };
  R.level = injuryLevel(R);
  R.police = policeVerdict(R, statement); R.statement = R.police && R.blows ? statement : null;
  R.hospital = R.outcome === 'down';
  R.fine = R.police ? R.police.fine : 0; R.bill = R.hospital ? HOSPITAL_BILL : 0;
  R.minutes = (R.police ? R.police.minutes : 0) + (R.hospital ? 150 : 0) + (R.outcome === 'security' ? 6 : 0);
  R.rep = repDeltas(R);
  R.companion = companion && companion.id ? { id: companion.id, as: companion.as === 'target' ? 'target' : 'witness' } : null;
  R.feel = R.companion ? feelDeltas(R, R.companion.as) : null;
  return R;
}
// Apply it to the life, once: the injury, the money, reputation, the heart of whoever was there, the fact
// on the ledger, and the morning after set up. Returns R, or null if it had already been applied.
export function applyOutcome(L, R) {
  const S = fightState(L);
  if (S.applied) return null;
  S.seen = true; S.applied = true; S.day = L.clock.day; S.at = stamp(L);
  S.morningAt = (L.clock.minute < 6 * 60 ? L.clock.day : L.clock.day + 1) * 1440 + 8 * 60 + 10;   // (after midnight, the morning is today's)
  if (R.level) injure(L, R.level, INJURY[R.level].en);
  for (const [amount, to, memo, memoEn] of [[R.fine, '黄浦公安分局', '治安罚款', 'Public-order fine'], [R.bill, '市一医院急诊', '急诊 · 清创缝合', 'A&E: wound closed, four stitches']]) {
    if (!(amount > 0)) continue;
    const r = pay(L, { method: balance(L, 'wechat') >= amount ? 'wechat' : 'bank', amount, to, memo, kind: 'fee' });
    if (r.ok) r.entry.memoEn = memoEn;
  }
  for (const k of ['street', 'online', 'work']) if (R.rep[k]) rep(L, k, R.rep[k]);
  if (R.companion) {
    feel(L, R.companion.id, R.feel, `fight:${R.outcome}`);
    if (ROMANCE.includes(R.companion.id)) remember(L, R.companion.id, 'fight', { outcome: R.outcome, as: R.companion.as, blows: R.blows, hurt: R.level });
  }
  S.result = JSON.parse(JSON.stringify(R));
  fact(L, 'fight', { outcome: R.outcome, how: R.how, where: 'Nanjing Road East, outside the Peace Hotel', against: 'a drunk stranger', blows: R.blows, started: R.started, landed: R.landed, took: R.took,
    hurt: R.level, police: R.police ? R.police.verdict : null, fine: R.fine, filmed: R.filmed, minutes: R.minutes }, R.companion ? [R.companion.id] : []);
  return R;
}

// ---- the morning after: who has heard, and what they send (zh as written; English in EN_FIGHT) ----
export const EN_FIGHT = {
  '昨晚和平饭店门口那事，吧台的小妹说是你？可以啊纪白。': 'That business outside the Peace Hotel last night. The girl on the bar says it was you? Not bad, Ji Bai.',
  '她说那人后来自己走了，没动手。难得。': 'She says he walked off in the end and nobody threw a punch. That takes some doing.',
  '听说昨晚你在和平饭店门口跟人动手了？？人没事吧': 'I hear you got into it with someone outside the Peace Hotel last night?? Are you all right?',
  '保安跟我说你昨晚是被救护车拉走的？？醒了回个话。': 'Security tells me you left in an ambulance last night?? Message me when you\'re up.',
  '[视频] 这是不是纪白？？昨晚南京路': '[video] Is this Ji Bai?? Nanjing Road, last night',
  '……是他。': '…That\'s him.',
  '评论区都在说是那个人先动的手。': 'The comments all say the other man swung first.',
  '你们公司的人刷到怎么办。先动手的是你，视频里看得清清楚楚。': 'What happens when someone at your firm scrolls past this? You swung first. It\'s all there in the video.',
  '[视频] 这个被推了都不还手的，是不是纪白': '[video] The one who gets shoved and doesn\'t shove back. Is that Ji Bai?',
  '是他！！评论区说“情绪稳定天花板”哈哈哈哈': 'It is!! Top comment: "the calmest man in Shanghai" hahaha',
  '你脸怎么了？谁告诉我的不重要。冰敷，别热敷。': 'What happened to your face? Never mind who told me. Ice, not heat.',
  '【警情回执】您报告的南京东路纠纷警情已处置完毕，感谢您的配合。': '[Incident receipt] The dispute you reported on Nanjing Road East has been dealt with. Thank you for your cooperation.',
  '【警情回执】南京东路纠纷已调解结案。请遵守法律，理性处理矛盾。': '[Incident receipt] The dispute on Nanjing Road East has been settled by mediation. Please keep within the law and settle differences calmly.',
  '【行政处罚告知】因殴打他人，依据《治安管理处罚法》对您处以罚款，款项已缴纳。该记录将依法留存。': '[Notice of penalty] For striking another person you have been fined under the Public Security Administration Punishments Law. The fine is paid. A record will be kept as the law requires.',
  '昨晚……谢谢你。到家了我才开始后怕。': 'Last night… thank you. It only started to frighten me once I was home.',
  '昨晚的事我想了一路。你处理得很好。': 'I thought about last night the whole way home. You handled it well.',
  '手还疼吗？以后能不动手就别动手。……不过谢谢你。': 'Does your hand still hurt? Don\'t fight if you can help it. …Thank you, though.',
  '手还疼吗？以后能不动手就别动手。': 'Does your hand still hurt? Don\'t fight if you can help it.',
  '昨晚我有点被吓到了。不是被他，是被你。': 'Last night frightened me a bit. Not him. You.',
  '醒了回我一下。医生怎么说？': 'Message me when you\'re awake. What did the doctor say?',
  '昨晚我自己打车回去的。到家了。': 'I got a car home by myself last night. I\'m back.',
  '昨晚那个女生，后来不知道怎么样了。': 'That girl last night. I keep wondering what happened to her.',
  '昨晚你那一下，我到现在还没缓过来。我们过两天再说吧。': 'I still haven\'t got over what you did last night. Let\'s talk in a couple of days.',
};
const GOOD = ['talked', 'stood', 'security', 'police'];
// what the morning brings: [{ thread, from, text, title? }]. Pure: the same result always sends the same.
export function morningMessages(R) {
  const out = [], say = (thread_, from, text, extra = {}) => out.push({ thread: thread_, from, text, ...extra });
  const dirty = R.started === 'you' || (R.cheap || 0) > 0 || R.how === 'dropped';
  // Momo plays the Jazz Bar: the staff tell him
  if (GOOD.includes(R.outcome)) { say('momo', 'momo', '昨晚和平饭店门口那事，吧台的小妹说是你？可以啊纪白。'); if (R.outcome === 'talked') say('momo', 'momo', '她说那人后来自己走了，没动手。难得。'); }
  else if (R.outcome === 'down') say('momo', 'momo', '保安跟我说你昨晚是被救护车拉走的？？醒了回个话。');
  else if (R.blows) say('momo', 'momo', '听说昨晚你在和平饭店门口跟人动手了？？人没事吧');
  // the clip goes round
  if (R.filmed && R.blows) {
    say('wuhu', 'zhixia', '[视频] 这是不是纪白？？昨晚南京路'); say('wuhu', 'xuan', '……是他。');
    say('wuhu', dirty ? 'xuan' : 'zhixia', dirty ? '你们公司的人刷到怎么办。先动手的是你，视频里看得清清楚楚。' : '评论区都在说是那个人先动的手。');
  } else if (R.filmed && R.outcome === 'stood') { say('wuhu', 'zhixia', '[视频] 这个被推了都不还手的，是不是纪白'); say('wuhu', 'momo', '是他！！评论区说“情绪稳定天花板”哈哈哈哈'); }
  if (R.level >= 2) say('yuan', 'yuan', '你脸怎么了？谁告诉我的不重要。冰敷，别热敷。');
  if (R.police) say('110', '110', { statement: '【警情回执】您报告的南京东路纠纷警情已处置完毕，感谢您的配合。', warning: '【警情回执】南京东路纠纷已调解结案。请遵守法律，理性处理矛盾。', fine: '【行政处罚告知】因殴打他人，依据《治安管理处罚法》对您处以罚款，款项已缴纳。该记录将依法留存。' }[R.police.verdict], { title: '110', kind: 'service' });
  // whoever was with you (unless the system that owns her has said it will write itself: R.companionWrites === false)
  if (R.companion && R.companionWrites !== false) {
    const id = R.companion.id, t = R.companion.as === 'target';
    const text = GOOD.includes(R.outcome) ? (t ? '昨晚……谢谢你。到家了我才开始后怕。' : '昨晚的事我想了一路。你处理得很好。')
      : R.outcome === 'down' ? '醒了回我一下。医生怎么说？'
        : R.outcome === 'walked' || R.outcome === 'passed' ? (t ? '昨晚我自己打车回去的。到家了。' : '昨晚那个女生，后来不知道怎么样了。')
          : dirty ? (t ? '昨晚你那一下，我到现在还没缓过来。我们过两天再说吧。' : '昨晚我有点被吓到了。不是被他，是被你。')
            : t ? '手还疼吗？以后能不动手就别动手。……不过谢谢你。' : '手还疼吗？以后能不动手就别动手。';
    say(id, id, text, { companion: true });
  }
  return out;
}
// called as the clock runs: the morning after, once. names: { id: title } for a thread that doesn't exist yet
export function morningAfter(L, names = {}) {
  const S = L.flags.fight;
  if (!S || !S.applied || S.morning || stamp(L) < S.morningAt) return [];
  S.morning = true;
  const msgs = morningMessages(S.result);
  for (const m of msgs) {
    if (!L.threads[m.thread]) thread(L, m.thread, { title: m.title || names[m.thread] || m.thread, members: ['me', m.from], kind: m.kind || 'person' });
    post(L, m.thread, { from: m.from, kind: 'text', text: m.text });
  }
  return msgs;
}
// a line for whoever he talks to afterwards (the model is told; it cannot add to it)
export function fightContext(L) {
  const S = L.flags.fight; if (!S || !S.applied) return '';
  const R = S.result, days = L.clock.day - S.day;
  const what = { talked: 'talked a drunk man out of bothering a young woman outside the Peace Hotel; nobody was hit', stood: 'stood between a drunk man and a young woman outside the Peace Hotel, was shoved, and did not hit back',
    security: 'fetched the hotel\'s security when a drunk man was bothering a young woman', police: 'called 110 when a drunk man was bothering a young woman outside the Peace Hotel',
    walked: 'saw a drunk man bothering a young woman outside the Peace Hotel and walked away', passed: 'walked past a drunk man bothering a young woman outside the Peace Hotel',
    won: `got into a fist fight with a drunk man outside the Peace Hotel${R.started === 'you' ? ' (Ji Bai threw the first punch)' : ' (the man swung first)'}; the man gave up`, broke: 'was attacked by a drunk man outside the Peace Hotel and got away from him',
    down: 'was knocked down by a drunk man outside the Peace Hotel and taken to hospital', separated: 'had a fist fight with a drunk man outside the Peace Hotel until they were pulled apart' }[R.outcome] || '';
  const law = R.police ? { statement: 'the police took a statement', warning: 'the police gave him a warning', fine: `the police fined him ¥${R.fine}` }[R.police.verdict] : '';
  return `${days <= 0 ? 'Tonight' : days === 1 ? 'Last night' : 'Some time ago'} he ${what}${law ? `; ${law}` : ''}${R.filmed && R.blows ? '; a bystander filmed it and the clip is online' : ''}.`;
}
