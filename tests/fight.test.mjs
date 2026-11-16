// The row outside the Peace Hotel: the dispute, the blows, and what follows (src/engine/fight.js), and
// its words (src/world/fightText.js). node tests/fight.test.mjs
import { createLife, stamp, skipTo, balance, save, load } from '../src/engine/life.js';
import { initYear, year, hurt, factsAbout, rep } from '../src/engine/year.js';
import { heart, recalls } from '../src/engine/hearts.js';
import { NODES, PEACEFUL, VIOLENT, createDispute, choices, disputeStep, FIGHT, createFight, stepFight, fightSummary, injuryLevel, policeCome, policeVerdict, repDeltas, feelDeltas,
  settle, applyOutcome, morningMessages, morningAfter, mayBegin, isLate, fightState, fightContext, EN_FIGHT, INJURY, FINE, FINE_LIGHT, HOSPITAL_BILL } from '../src/engine/fight.js';
import { SAY, SAY_HELP, AFTER_MOVE, ALL_LINES, FIGHT_NAMES, aftermath, policeScene, verdictLines, closing, doormanLine, lostTime, POLICE_CALLED } from '../src/world/fightText.js';
import { enText } from '../src/world/agendaEn.js';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const lcg = (seed) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };
const newLife = () => { const L = createLife(); initYear(L); return L; };
const walk = (...moves) => { const D = createDispute(); let end = null; for (const m of moves) end = disputeStep(D, m); return { D, end }; };

// ---- the dispute: every road ----
{
  ok(walk('calm', 'face').end.outcome === 'talked' && walk('calm', 'cameras').end.outcome === 'talked', 'talked down: a way out for him, or the cameras');
  ok(walk('shield', 'open').end.outcome === 'stood' && walk('calm', 'threat', 'backdown').end.outcome === 'stood', 'stood your ground: shoved and not shoving back; or stepping back from the brink');
  ok(walk('help', 'security').end.outcome === 'security' && walk('shield', 'security').end.outcome === 'security', "the hotel's security, from two places");
  const p = walk('help', 'police'), p2 = walk('calm', 'police');
  ok(p.end.outcome === 'police' && p.end.called && p2.end.outcome === 'police', '110, and he leaves before they come');
  ok(walk('leave').end.outcome === 'walked', 'walking away is an answer');
  const f1 = walk('shield', 'shove').end, f2 = walk('calm', 'threat', 'strike').end, f3 = walk('calm', 'threat', 'guard').end, f4 = walk('shield', 'police').end;
  ok(f1.fight && f1.started === 'him' && f3.fight && f3.started === 'him', 'pushing back, or squaring up: he swings first');
  ok(f2.fight && f2.started === 'you', 'the first punch can be yours');
  ok(f4.fight && f4.started === 'him' && f4.called, 'calling 110 with his hands already on you sets him off (and they are already coming)');
  // every leaf of the tree is one or the other, and every peaceful outcome but passing by is reachable by talking
  const leaves = [];
  const go = (path) => { const { D, end } = walk(...path); if (end) return leaves.push({ path, end }); for (const m of choices(D)) go([...path, m]); };
  go([]);
  const got = new Set(leaves.filter((l) => !l.end.fight).map((l) => l.end.outcome));
  ok(leaves.length >= 12 && leaves.every((l) => l.end.fight || PEACEFUL.includes(l.end.outcome)), `${leaves.length} ways through, each ending in an outcome or in blows`);
  ok(['talked', 'stood', 'security', 'police', 'walked'].every((o) => got.has(o)) && leaves.filter((l) => l.end.fight).length === 4, 'five roads without a blow, four that come to one');
  ok(leaves.filter((l) => !l.end.fight).length > leaves.filter((l) => l.end.fight).length, 'most roads are peaceful');
  const D = createDispute(); ok(disputeStep(D, 'strike') === null && D.path.length === 0, "you can't do what isn't on offer");
  disputeStep(D, 'leave'); ok(disputeStep(D, 'calm') === null && choices(D).length === 0, 'once decided, it stays decided');
  ok(Object.values(NODES).flat().every((m) => SAY[m] && SAY[m][0] && SAY[m][1] && AFTER_MOVE[m]) && SAY_HELP.police && AFTER_MOVE.snap, 'every move has its words in both languages and something that follows');
  ok(Object.values(NODES).every((n) => n.length >= 2 && n.length <= 4), 'never more than four answers');
}

// ---- the blows: timing windows ----
const setUp = (o = {}) => { const F = createFight({ rnd: lcg(5), ...o }); F.him.x = 0; F.him.z = 0.95; F.him.wait = 99; return F; };
const windup = (F, attack = 'haymaker') => { const H = F.him; H.act = 'windup'; H.attack = attack; H.at = 0; H.dur = FIGHT.him[attack].wind; H.firm = false; };
const run = (F, secs, inp = {}) => { const ev = []; for (let t = 0; t < secs - 1e-9; t += 1 / 120) ev.push(...stepFight(F, 1 / 120, inp)); return ev; };
{
  // the slip: only late in his wind-up
  const tryDodge = (before) => { const F = setUp(); windup(F); run(F, FIGHT.him.haymaker.wind - before); const ev = [...stepFight(F, 1 / 120, { dodge: 1 }), ...run(F, before + 0.2)]; return { F, ev }; };
  const good = tryDodge(0.2), early = tryDodge(0.55), none = (() => { const F = setUp(); windup(F); return { F, ev: run(F, 0.8) }; })();
  ok(good.ev.some((e) => e.type === 'whiff' && e.by === 'him' && e.slip) && good.F.you.hp === 100 && good.F.you.slipped === 1, 'a slip in the last third of a second of his wind-up: he hits air');
  ok(early.ev.some((e) => e.type === 'hit' && e.on === 'you') && early.F.you.hp === 100 - FIGHT.him.haymaker.dmg, 'too early and he has turned with you: it lands');
  ok(none.ev.some((e) => e.type === 'tell') === false && none.ev.some((e) => e.type === 'hit' && e.on === 'you' && !e.blocked) && none.F.you.act === 'stagger', 'standing there: the haymaker lands and you reel');
  ok(good.F.him.act === 'recover' && good.F.him.dur > FIGHT.him.haymaker.recover && good.F.you.counterT > 0, 'a miss leaves him open for longer, and you set to counter');
  // the counter
  const c = good.F; run(c, 0.25); const cev = [...stepFight(c, 1 / 120, { cross: true }), ...run(c, 0.4)];
  const hit = cev.find((e) => e.type === 'hit' && e.on === 'him');
  ok(hit && hit.counter && Math.abs(hit.dmg - FIGHT.cross.dmg * FIGHT.counter) < 0.06 && c.him.act === 'stagger' && c.him.nerve === FIGHT.him.nerve - 1, 'the cross after a slip: harder, and it staggers him');
  // the guard
  const g = setUp(); windup(g); const gev = run(g, 0.8, { guard: true });
  const bh = gev.find((e) => e.type === 'hit' && e.on === 'you');
  ok(bh && bh.blocked && Math.abs(g.you.hp - (100 - FIGHT.him.haymaker.dmg * FIGHT.block)) < 0.06 && g.you.st < 100 && g.you.act === 'ready', 'a held guard takes most of it, at a cost in wind');
  const gb = setUp(); gb.you.st = 4; windup(gb); const gbev = run(gb, 0.8, { guard: true });
  ok(gbev.some((e) => e.type === 'guardbreak') && gb.you.act === 'stagger', 'with no wind left the guard gives way');
  // range: stepping out of reach
  const r = setUp(); windup(r); const rev = run(r, 0.8, { f: -1 });
  ok(rev.some((e) => e.type === 'whiff' && e.by === 'him' && e.why === 'range') && r.you.hp === 100, 'stepping back out of reach works too');
  // facing: a punch thrown looking away misses
  const fc = setUp(); fc.him.act = 'recover'; fc.him.dur = 5; const fev = [...stepFight(fc, 1 / 120, { jab: true, h: 1.2 }), ...run(fc, 0.3, { h: 1.2 })];
  ok(fev.some((e) => e.type === 'whiff' && e.by === 'you' && e.why === 'facing') && fc.him.hp === 100, 'you have to be facing him');
  const far = setUp(); far.him.z = 2; far.him.act = 'recover'; far.him.dur = 5; const farev = [...stepFight(far, 1 / 120, { jab: true }), ...run(far, 0.3)];
  ok(farev.some((e) => e.type === 'whiff' && e.by === 'you' && e.why === 'range'), 'and close enough');
  // what he is doing decides what a punch does
  const cl = setUp(); const clev = [...stepFight(cl, 1 / 120, { jab: true }), ...run(cl, 0.3)];
  const gl = clev.find((e) => e.type === 'hit');
  ok(gl && gl.glancing && Math.abs(gl.dmg - FIGHT.jab.dmg * FIGHT.glance) < 0.06 && cl.him.act === 'close', 'a jab at a man who is set is a glancing thing');
  const st = setUp(); windup(st); run(st, 0.1); const stev = [...stepFight(st, 1 / 120, { jab: true }), ...run(st, 0.2)];
  ok(stev.some((e) => e.type === 'hit' && e.stop) && st.him.act === 'flinch' && st.him.quick, 'a jab early in his wind-up stops it; he comes straight back with a short one');
  const lt = setUp(); windup(lt); run(lt, 0.48); const ltev = [...stepFight(lt, 1 / 120, { jab: true }), ...run(lt, 0.4)];
  ok(ltev.some((e) => e.type === 'hit' && e.on === 'him' && e.glancing) && ltev.some((e) => e.type === 'hit' && e.on === 'you'), 'too late in it, you trade and lose the trade');
  // one press, one punch; a press a moment early is kept; no more than one
  const b = setUp(); b.him.act = 'recover'; b.him.dur = 9; stepFight(b, 1 / 120, { jab: true }); run(b, 0.25); stepFight(b, 1 / 120, { jab: true }); run(b, 0.6);
  ok(b.you.thrown === 2, 'a press just before the arm is back still counts');
  const h = setUp(); h.him.act = 'recover'; h.him.dur = 9; run(h, 1, { jab: true });
  ok(h.you.thrown >= 2 && h.you.thrown <= 3, 'holding it down is not a machine gun');
}
// ---- no button-mash; the ways it ends ----
const play = (policy, seed = 1, o = {}) => { const F = createFight({ rnd: lcg(seed), ...o }); for (let i = 0; i < 9000 && !F.over; i++) stepFight(F, 1 / 60, policy(F) || {}); return F; };
const dist = (F) => Math.hypot(F.him.x - F.you.x, F.him.z - F.you.z);
const late = (F) => F.him.act === 'windup' && F.him.dur - F.him.at < 0.2 && F.you.act === 'ready';
const POL = {
  nothing: () => ({}), mash: () => ({ jab: true }), block: () => ({ guard: true }), away: () => ({ away: true }),
  slip: (F) => (late(F) ? { dodge: 1 } : {}),
  counter: (F) => (late(F) ? { dodge: 1 } : (F.him.act === 'recover' || F.him.act === 'stagger') && F.you.act === 'ready' ? { cross: true, f: 1 } : { f: dist(F) > 1.1 ? 1 : 0 }),
  chase: (F) => (late(F) ? { dodge: 1 } : F.you.act === 'ready' && F.him.act !== 'close' && F.him.act !== 'windup' ? { cross: true, f: 1 } : { f: dist(F) > 1 ? 1 : 0 }),
};
{
  const seeds = [1, 7, 99, 1234];
  const all = (name, test) => seeds.every((s) => test(play(POL[name], s)));
  ok(all('counter', (F) => F.over === 'won' && F.how === 'backed' && F.exchanges <= 5 && F.t < 16 && F.you.took === 0), 'slip and counter: he backs down inside five exchanges');
  ok(all('slip', (F) => F.over === 'won' && F.how === 'spent' && F.you.landed === 0), 'never hitting him at all: he wears himself out');
  ok(all('mash', (F) => F.over === 'down'), 'hammering the jab gets you put on the ground');
  ok(all('nothing', (F) => F.over === 'down' && F.you.took >= 4 && F.you.took <= 9), 'doing nothing: down, after a handful of blows');
  ok(all('block', (F) => F.over === 'separated' && F.you.hp > 60), 'covering up until someone pulls you apart');
  ok(all('away', (F) => F.over === 'broke' && F.t < 5), 'backing off gets you out in a few seconds');
  const ch = createFight({ rnd: lcg(3) }); Object.assign(ch.him, { x: 0, z: 1, act: 'backoff', at: 0, dur: 5, yielding: true }); stepFight(ch, 1 / 120, { cross: true }); for (let i = 0; i < 60 && !ch.over; i++) stepFight(ch, 1 / 120, {});
  ok(ch.over === 'won' && ch.how === 'dropped' && ch.cheap === 1 && seeds.some((s) => play(POL.chase, s).how === 'dropped'), 'hitting a man whose hands are up puts him down (and that is on you)');
  const y = play(POL.counter, 3, { started: 'you' });
  ok(y.started === 'you' && y.you.thrown >= 1 && y.over === 'won', 'if you start it, the first punch is already on its way');
  ok(seeds.every((s) => { const F = play(POL.counter, s); return VIOLENT.includes(F.over) && F.t <= FIGHT.separate.seconds + 3; }), 'it is always over in half a minute');
  const big = createFight({ rnd: lcg(2) }); const evs = stepFight(big, 0.3, { jab: true });
  ok(evs.filter((e) => e.type === 'swing').length === 1 && Math.abs(big.t - 0.3) < 1e-6, 'a slow frame is still one press and the right amount of time');
  const S = fightSummary(play(POL.counter, 1));
  ok(S.blows && S.outcome === 'won' && S.landed === 3 && S.heavy === 3 && S.hp === 100 && JSON.stringify(S) === JSON.stringify(JSON.parse(JSON.stringify(S))), 'the summary is plain values');
}

// ---- afterwards ----
const R = (o) => ({ outcome: 'won', how: 'backed', blows: true, started: 'him', landed: 3, heavy: 3, took: 0, hp: 100, hisHp: 50, filmed: true, ...o });
{
  ok(injuryLevel(R({})) === 1 && injuryLevel(R({ hp: 50, took: 2 })) === 2 && injuryLevel(R({ outcome: 'down', hp: 0 })) === 3 && injuryLevel({ outcome: 'stood', blows: false }) === 0 && injuryLevel(R({ landed: 0, took: 0, how: 'spent' })) === 0,
    'knuckles, a black eye, stitches; nothing if nobody touched anybody');
  ok(!policeCome(R({})) && policeCome(R({ outcome: 'separated' })) && policeCome(R({ outcome: 'down' })) && policeCome(R({ how: 'dropped' })) && policeCome(R({ cheap: 1 })) && policeCome(R({ called: true })) && policeCome(R({ landed: 4, heavy: 2, took: 1 })) && !policeCome({ outcome: 'talked', blows: false }),
    'the police come when someone called, someone went down, you were pulled apart, or it went on');
  ok(policeVerdict(R({}), 'straight') === null, 'a short one that nobody reported: no police');
  const v = (o, s) => policeVerdict(R({ outcome: 'separated', ...o }), s);
  ok(v({ landed: 0, heavy: 0 }).verdict === 'statement' && v({}).verdict === 'warning' && v({ started: 'you' }).verdict === 'fine', 'never hit back: a statement. Hit back: a warning. Started it: a fine');
  ok(v({ started: 'you' }, 'straight').fine === FINE_LIGHT && v({ started: 'you' }, 'little').fine === FINE && v({ started: 'you' }, 'shade').fine === FINE && v({ started: 'you' }, 'shade').lied, 'owning up is cheaper; shading it in front of a phone camera is not');
  ok(v({ started: 'you', filmed: false }, 'shade').verdict === 'warning' && !v({}, 'shade').lied, 'with nobody filming a lie can work; and "he started it" is no lie when he did');
  ok(v({}, 'little').minutes > v({}, 'straight').minutes && v({ started: 'you' }).minutes > v({}).minutes && policeVerdict({ outcome: 'police', blows: false, called: true }).verdict === 'statement', 'time lost: more for a fine, more for saying little; a form if you only called');
  const d = repDeltas(settle(R({ outcome: 'separated', started: 'you' }), { statement: 'shade' }));
  ok(d.street < -10 && d.online < 0 && d.work < -8, 'starting it, lying about it, on camera: the street, the internet and the office all know');
  ok(repDeltas(settle({ outcome: 'stood', filmed: true })).online === 5 && repDeltas(settle({ outcome: 'stood', filmed: false })).online === 0 && repDeltas(settle({ outcome: 'talked' })).street === 4 && repDeltas(settle({ outcome: 'walked' })).street < 0, 'the quiet roads move reputation too; online only if someone filmed');
  ok(feelDeltas({ outcome: 'walked' }, 'target').trust < feelDeltas({ outcome: 'walked' }, 'witness').trust && feelDeltas({ outcome: 'stood' }, 'target').trust >= 10 && feelDeltas(R({ started: 'you' }), 'witness').trust < 0 && feelDeltas(R({}), 'target').attraction > 0,
    'someone with you: it matters more if she was the one he was bothering; violence you started frightens her');
}
// applied once, everything in its place
{
  const L = newLife(); skipTo(L, 3 * 1440 + 22 * 60 + 30);
  const res = settle(R({ outcome: 'separated', hp: 48, took: 2 }), { statement: 'straight', companion: { id: 'zhiwei', as: 'witness' } });
  const cash0 = balance(L, 'wechat') + balance(L, 'bank'), street0 = rep(L, 'street');
  const a = applyOutcome(L, res), again = applyOutcome(L, res);
  ok(a && again === null && factsAbout(L, null, 'fight').length === 1, 'applied once: a second time changes nothing');
  const f = factsAbout(L, 'zhiwei', 'fight')[0];
  ok(f && f.outcome === 'separated' && f.blows && f.started === 'him' && f.police === 'warning' && f.hurt === 2 && f.filmed && f.who.includes('zhiwei'), 'one fact on the ledger, with who was there');
  ok(hurt(L) && hurt(L).level === 2 && hurt(L).what === INJURY[2].en, 'the injury is on him (engine/year.js)');
  ok(rep(L, 'street') === street0 + res.rep.street && res.rep.street < 0 && rep(L, 'work') < 50, 'reputation moved');
  ok(heart(L, 'zhiwei').trust === 20 + res.feel.trust && recalls(L, 'zhiwei', 'fight'), 'and she remembers');
  ok(balance(L, 'wechat') + balance(L, 'bank') === cash0 && res.fine === 0, 'a warning costs nothing but the evening');
  ok(res.minutes === 100 && fightState(L).morningAt === 4 * 1440 + 8 * 60 + 10, 'an hour and forty minutes; the morning after is tomorrow');
  ok(morningAfter(L).length === 0, 'nothing arrives that night');
  skipTo(L, 4 * 1440 + 8 * 60 + 30);
  const m = morningAfter(L), m2 = morningAfter(L);
  ok(m.length >= 5 && m2.length === 0, `the morning after: ${m.length} messages, once`);
  ok(L.threads.momo.messages.some((x) => /动手/.test(x.text)) && L.threads.wuhu.messages.some((x) => /视频/.test(x.text)) && L.threads.ruoan.messages.some((x) => /脸/.test(x.text)) && L.threads['110'] && L.threads.zhiwei.messages.length === 1, 'Momo has heard, the clip is in the group chat, Ruoan has seen your face, the receipt, and her');
  ok(/pulled apart/.test(fightContext(L)) && /warning/.test(fightContext(L)) && /Last night/.test(fightContext(L)), 'and a line for whoever he talks to');
  const back = load(save(L)); ok(back && back.flags.fight.applied && back.flags.fight.result.outcome === 'separated' && morningAfter(back).length === 0, 'it all survives a save (format v1)');
}
{
  // a fine and a hospital bill are paid; after midnight the morning is the same day's
  const L = newLife(); skipTo(L, 4 * 1440 + 20);
  const r1 = settle(R({ outcome: 'down', hp: 0, took: 5, landed: 1, started: 'you' }), { statement: 'little' });
  const cash0 = balance(L, 'wechat');
  applyOutcome(L, r1);
  ok(r1.hospital && r1.bill === HOSPITAL_BILL && r1.fine === FINE && balance(L, 'wechat') === cash0 - FINE - HOSPITAL_BILL && L.wallet.ledger.filter((e) => e.kind === 'fee' && e.memoEn).length === 2, 'the fine and the A&E bill are in the ledger');
  ok(hurt(L).level === 3 && r1.minutes === 160 + 30 + 150 && fightState(L).morningAt === 4 * 1440 + 490, 'stitches, most of the night, and the morning is today');
  // a peaceful road
  const L2 = newLife(); skipTo(L2, 2 * 1440 + 23 * 60);
  const r2 = applyOutcome(L2, settle({ outcome: 'talked', how: 'face', filmed: false }));
  ok(!hurt(L2) && r2.police === null && r2.minutes === 0 && rep(L2, 'street') === 54 && factsAbout(L2, null, 'fight')[0].blows === false, 'talked down: nobody hurt, nobody called, and still on the ledger');
  const L3 = newLife(); const r3 = applyOutcome(L3, settle({ outcome: 'police', how: 'called', called: true }, { statement: 'little' }));
  ok(r3.police.verdict === 'statement' && r3.minutes === 20 && r3.fine === 0, '110: a form and twenty minutes');
  // older saves (no year) take it without breaking
  const old = createLife(); ok(applyOutcome(old, settle({ outcome: 'stood' })) && !year(old) && !mayBegin(old), 'a save from before the year: nothing breaks, and it never starts by itself there');
}
// when it may begin
{
  const L = newLife();
  ok(isLate(22 * 60) && isLate(10) && !isLate(20 * 60) && !isLate(3 * 60), 'late evening: 21:40 to 00:40');
  skipTo(L, 1 * 1440 + 22 * 60); ok(!mayBegin(L), 'not on the first night');
  skipTo(L, 2 * 1440 + 15 * 60); ok(!mayBegin(L), 'not in the afternoon');
  skipTo(L, 2 * 1440 + 22 * 60); ok(mayBegin(L), 'the second evening, late: it may');
  fightState(L).seen = true; ok(!mayBegin(L), 'once a game');
}
// the words
{
  const two = (l) => Array.isArray(l) && l.length === 3 && FIGHT_NAMES[l[0]] && typeof l[1] === 'string' && l[1] && typeof l[2] === 'string' && l[2] && /[一-鿿…]/.test(l[1]) && !/[一-鿿]/.test(l[2]);
  ok(ALL_LINES.length > 45 && ALL_LINES.every(two), `${ALL_LINES.length} lines, each with a speaker, Chinese and English`);
  const results = [R({}), R({ how: 'spent', landed: 0 }), R({ how: 'dropped' }), R({ outcome: 'broke', how: 'away' }), R({ outcome: 'down', how: 'floored' }), R({ outcome: 'separated', how: 'pulled' }), R({ started: 'you' })];
  ok(results.every((r) => aftermath(r).length && aftermath(r).every(two)), 'every way the blows end has its lines');
  ok(results.every((r) => ['straight', 'shade', 'little'].every((s) => { const P = policeScene(r), V = policeVerdict({ ...r, called: true }, s); return P.before.every(two) && P.ask.length === 3 && P.ask.every((a) => a.zh && a.en) && verdictLines(r, V).every(two); })), 'the officers have something to say to every result and every statement');
  ok(POLICE_CALLED.before.every(two) && POLICE_CALLED.after.every(two) && POLICE_CALLED.ask.length === 2, 'and when you only called');
  const outs = [...PEACEFUL.map((o) => ({ outcome: o })), ...results].map((r) => settle(r));
  ok(outs.every((r) => closing(r)[0] && closing(r)[1] && doormanLine(r, r.level)[0] && doormanLine(r, r.level)[1]), 'every outcome leaves a thought, and the doorman a remark');
  ok(lostTime(settle(R({ outcome: 'down', hp: 0 })), '03:10')[1].includes('03:10') && lostTime(settle({ outcome: 'talked' }), '23:00')[0] === '', 'where the time went');
  const sent = new Set();
  for (const r of outs) for (const as of [null, 'target', 'witness']) for (const m of morningMessages({ ...r, companion: as ? { id: 'kexin', as } : null })) sent.add(m.text);
  const missing = [...sent].filter((t) => !EN_FIGHT[t] || enText(t) === t);
  ok(sent.size >= 18 && !missing.length, `every morning message has its English, and the phone finds it (${sent.size}${missing.length ? `; missing: ${missing.join(' | ')}` : ''})`);
  ok(morningMessages({ ...outs[0], companion: { id: 'yuan', as: 'target' }, companionWrites: false }).every((m) => m.thread !== 'yuan'), 'the romance system can write her message itself');
}
if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log('fight: all passed');
