// The five people Ji Bai might come to love: the rules (src/engine/hearts.js) and their year
// (src/world/romance.js, src/world/romance/*.js), played in node.   node tests/hearts.test.mjs
import fs from 'fs';
import { createLife, skipTo, stamp, lapse, drain, save, load } from '../src/engine/life.js';
import { setupThreads, deliverFollowUps, reply, respondToInvite } from '../src/world/agenda.js';
import { initYear, factsAbout, setTrack } from '../src/engine/year.js';
import { ROMANCE, NATURE, heart, meet, feel, remember, setStage, seeing, contact, overture, answered, ignored, mayWrite, availability, askResult, shared, decide, nextStage, advance, foundOut, resolveRift, dayTick, leave, asksLeft, oneSided, inLife, isSeeing } from '../src/engine/hearts.js';
import { CAST, EN_HEARTS, ROMANCE_SCENES, ROMANCE_CALLS, ROMANCE_NAMES, runRomance, presence, sceneScript, startScene, endScene, leftScene, askToMeet, romanceEvent, romanceContext, romancePrompt, romanceStanding, romanceEpilogue, romanceCallChoice, cannedHeart, guardTalk, takeNews, memoryText, datesAhead, TALK_RULES } from '../src/world/romance.js';
import { enText } from '../src/world/agendaEn.js';
import { PEOPLE } from '../src/world/cast.js';
import { seasonAftermath } from '../src/world/allotEvents.js';
import { PERSONAS, systemPrompt, addressOf } from '../src/world/personas.js';

let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const D = (day, h, m = 0) => day * 1440 + h * 60 + m;
const cjk = (s) => /[一-鿿]/.test(s || '');
const fresh = () => { const L = createLife(); setupThreads(L); initYear(L); return L; };

// ================= the rules =================
{
  const L = fresh();
  ok(ROMANCE.every((id) => NATURE[id] && CAST[id]) && heart(L, 'nanxing').stage === 'stranger', 'five people, each with a nature of her own');
  // feelings alone move nothing
  meet(L, 'nanxing'); feel(L, 'nanxing', { attraction: 80, trust: 80 });
  ok(advance(L, 'nanxing') === 'known' && nextStage(L, 'nanxing').missing.includes('shared'), 'however he feels, nothing changes until something has happened between them');
  shared(L, 'nanxing', 'talk', 'a'); ok(heart(L, 'nanxing').stage === 'known', 'one shared evening: still getting to know each other');
  shared(L, 'nanxing', 'talk', 'a'); ok(heart(L, 'nanxing').events.talk === 1, 'the same evening is not counted twice');
  ok(shared(L, 'nanxing', 'date', 'b') === 'close' && nextStage(L, 'nanxing').missing.join() === 'step', 'two shared events and trust: close. To be more, he has to say so');
  ok(decide(L, 'nanxing', 'step') === 'dating' && seeing(L).join() === 'nanxing', 'he says it after a date: they are seeing each other');
  ok(decide(L, 'nanxing', 'commit') === 'dating' && nextStage(L, 'nanxing').missing.join() === 'dates', 'one date is not enough to be together, whatever is said');
  ok(shared(L, 'nanxing', 'date', 'c') === 'together', 'a second date, trust, and his word: together');
  ok(heart(L, 'nanxing').memories.length === 3 && heart(L, 'nanxing').memories.every((m) => m.day === 1), 'each shared event left one memory, dated');
}
{
  // who writes first, and when
  const L = fresh(); meet(L, 'zhiwei');
  ok(mayWrite(L, 'zhiwei', { free: true }) && !mayWrite(L, 'zhiwei', { free: false }) && !mayWrite(L, 'zhiwei', { away: true }, { urgent: true }), 'she writes first when her own day leaves her free, and not otherwise');
  overture(L, 'zhiwei'); ok(!mayWrite(L, 'zhiwei', {}), 'having just written, she does not write again at once');
  skipTo(L, stamp(L) + NATURE.zhiwei.gap); ok(mayWrite(L, 'zhiwei', {}), '... but she will later');
  for (let i = 0; i < 6; i++) overture(L, 'zhiwei');
  setStage(L, 'zhiwei', 'dating'); ok(oneSided(L, 'zhiwei'), 'if it is always her who writes, she notices');
  contact(L, 'zhiwei', { his: true }); ok(!oneSided(L, 'zhiwei'), 'until he writes first');
  // availability: her schedule and her mood
  ok(availability(L, 'zhiwei', { free: false }).why === 'busy' && availability(L, 'zhiwei', { away: true }).why === 'away' && availability(L, 'zhiwei', {}).free, 'available by her own schedule');
  heart(L, 'zhiwei').mood = 'hurt'; heart(L, 'zhiwei').trust = 30; skipTo(L, stamp(L) + 10);
  ok(askResult(L, 'zhiwei', {}) === 'mood' && !mayWrite(L, 'zhiwei', {}) && mayWrite(L, 'zhiwei', {}, { urgent: true }), 'hurt and unsure of him, she is not free for him, and writes only what has to be said');
}
{
  // what ignoring costs; when she stops asking; when she leaves
  const L = fresh(); meet(L, 'gunian'); setStage(L, 'gunian', 'dating');
  const t0 = heart(L, 'gunian').trust;
  const r1 = ignored(L, 'gunian', 'message');
  ok(heart(L, 'gunian').trust < t0 && !r1.quiet && asksLeft(L, 'gunian') === 1, 'an unanswered message costs a little; she will ask once more');
  const r2 = ignored(L, 'gunian', 'invite');
  ok(r2.quiet && heart(L, 'gunian').quiet === 1 && !mayWrite(L, 'gunian', {}), 'a second silence: she stops asking');
  L.clock.day = 2; dayTick(L); ok(inLife(L, 'gunian'), 'she does not leave the next day');
  contact(L, 'gunian', { his: true }); ok(heart(L, 'gunian').quiet === null && asksLeft(L, 'gunian') === 1, 'if he reaches out she answers; one more silence and she stops again');
  ignored(L, 'gunian', 'message'); for (let d = 3; d <= 2 + NATURE.gunian.patience; d++) { L.clock.day = d; dayTick(L); }
  ok(heart(L, 'gunian').stage === 'over' && heart(L, 'gunian').over.why === 'left', `if he does not, ${NATURE.gunian.patience} days later she has left`);
  ok(feel(L, 'gunian', { trust: 50 }).stage === 'over' && shared(L, 'gunian', 'date', 'x') === 'over' && !mayWrite(L, 'gunian', {}, { urgent: true }), 'and nothing brings her back');
  // no-shows
  const M = fresh(); meet(M, 'kexin');
  ok(!ignored(M, 'kexin', 'stood-up').left && heart(M, 'kexin').mood === 'hurt' && ignored(M, 'kexin', 'stood-up').left && heart(M, 'kexin').over.why === 'stood-up', 'stood up once she is hurt; twice and she is gone');
  // three nos in a row
  const Q = fresh(); meet(Q, 'yuan'); ignored(Q, 'yuan', 'declined'); ignored(Q, 'yuan', 'declined');
  ok(heart(Q, 'yuan').quiet === null && ignored(Q, 'yuan', 'declined').quiet, 'saying no three times running: she stops asking');
  // silence by itself
  const S = fresh(); for (const id of ROMANCE) meet(S, id);
  let gone = 0; for (let d = 2; d <= 30; d++) { S.clock.day = d; gone += dayTick(S).filter((e) => e.left).length; }
  ok(gone === 5 && ROMANCE.every((id) => heart(S, id).stage === 'over' && heart(S, id).over.why === 'faded'), `met and then not a word either way: each drifts out of his life in her own time (${ROMANCE.map((id) => `${id} day ${Math.floor(heart(S, id).over.at / 1440)}`).join(', ')}): nobody waits forever`);
}
{
  // two at once
  const mk = (ids) => { const L = fresh(); dayTick(L); for (const id of ids) { meet(L, id); setStage(L, id, 'dating'); heart(L, id).trust = 70; heart(L, id).attraction = 70; } return L; };
  let L = mk(['gunian', 'nanxing']);
  ok(nextStage(L, 'gunian').missing.includes('someone-else'), 'nobody becomes "together" with a man who is seeing someone else');
  L.clock.day = 3; let ev = dayTick(L);
  ok(heart(L, 'gunian').stage === 'over' && heart(L, 'gunian').over.why === 'two-timed' && ev.some((e) => e.id === 'gunian' && e.does === 'leave'), 'Gu Nian notices within two days, and leaves');
  ok(heart(L, 'nanxing').stage === 'dating' && seeing(L).length === 1, 'Nanxing had not noticed yet, and now there is only her');
  L = mk(['zhiwei', 'nanxing']); L.clock.day = 4; ev = dayTick(L);
  ok(heart(L, 'zhiwei').rift && heart(L, 'zhiwei').mood !== 'ok' && heart(L, 'nanxing').open && nextStage(L, 'nanxing').missing.includes('someone-else'), 'Zhiwei has it out with him; Nanxing shrugs, and will not commit');
  ok(!resolveRift(L, 'zhiwei', 'chose').ok && heart(L, 'zhiwei').stage === 'over', 'saying "you" while still seeing the other does not count');
  L = mk(['zhiwei', 'nanxing']); L.clock.day = 3; dayTick(L); leave(L, 'nanxing', 'ended');
  ok(resolveRift(L, 'zhiwei', 'chose').ok && !heart(L, 'zhiwei').rift && heart(L, 'zhiwei').stage === 'dating', 'ending the other and choosing her closes the rift');
  L = mk(['zhiwei', 'nanxing']); L.clock.day = 3; dayTick(L); L.clock.day = 5; dayTick(L);
  ok(heart(L, 'zhiwei').stage === 'over', 'a rift left unanswered for two days: she goes');
  L = mk(['kexin', 'yuan']);
  ok(foundOut(L, 'kexin', 'online').does === 'leave' && foundOut(L, 'yuan', 'seen').does === 'confront', 'Kexin learning it from her own comments leaves; Yu\'an asks him straight');
}

// ================= who they are, in both languages =================
{
  const avatars = new Set(), cast = JSON.parse(fs.readFileSync(new URL('../public/people/people.json', import.meta.url))).cast;
  let good = true;
  for (const id of ROMANCE) {
    const P = CAST[id];
    for (const b of [P.name, P.short, P.role, P.ambition, P.address, ...Object.values(P.arc).flatMap((a) => (typeof a === 'function' ? [a({ flags: {} }), a({ flags: { hearts: { _: { fired: { g5: 1 } } } } })] : [a])), ...Object.values(P.memories), ...Object.values(P.lines).filter((x) => x.zh), ...Object.values(P.lines.career), ...Object.values(P.dates).flatMap((d) => [d.title, d.place, d.text, d.yes, d.no])]) {
      if (!b || !b.zh || !b.en || cjk(b.en) || !cjk(b.zh + '汉')) { good = false; console.log('  not bilingual:', id, JSON.stringify(b)); }
    }
    if (Object.keys(P.arc).join() !== '1,2,3,4,5' || P.lines.canned.zh.length !== P.lines.canned.en.length || !P.card || !P.how) { good = false; console.log('  incomplete:', id); }
    for (const k of ['accept', 'decline', 'missed', 'stood', 'quiet', 'left', 'ended', 'fight', 'heard', 'online', 'hurt', 'onesided', 'yes', 'busy', 'mood', 'away', 'later', 'hello', 'morning']) if (!P.lines[k]) { good = false; console.log('  no line:', id, k); }
    if (NATURE[id].two !== 'leave' && NATURE[id].two !== 'open' && !P.lines.two) { good = false; console.log('  no confrontation:', id); }
    avatars.add(P.avatar[0]);
    if (!P.avatar.every((r) => cast[r] && cast[r].sex === P.sex)) { good = false; console.log('  avatar:', id); }
    if (!PEOPLE[id] || PEOPLE[id].name !== P.name.zh || PEOPLE[id].en !== P.name.en || !PERSONAS[id] || PERSONAS[id].card !== P.card) { good = false; console.log('  not in the cast / personas:', id); }
  }
  ok(good, 'each of the five: a name, a role, an ambition, an arc over five acts, her lines, in Chinese and English; in the phone\'s cast and the persona cards');
  ok(avatars.size === 5, `five different faces (${[...avatars].join(', ')}), all from the Rocketbox adults that exist`);
  ok(ROMANCE.every((id) => ROMANCE_NAMES[id][0] === CAST[id].name.zh) && ROMANCE_NAMES.nar[0] === '' && ROMANCE_CALLS['yuan-call'].from === 'yuan', 'their names for the scene box; their calls for the phone');
  ok(/WeChat/.test(systemPrompt('gunian', 'x', { texting: true })) && !/stranger/.test(systemPrompt('gunian', 'x')) && /^纪白/.test(addressOf('zhiwei', 'zh')), 'the persona prompt does not call him a stranger');
}

// ================= playing it =================
// a scene, as ui/sceneTalk.js would play it: picks[i] is the answer taken at the i-th question
const spoken = [];
function play(L, id, picks = []) {
  startScene(L, id);
  const queue = [...sceneScript(L, id)]; let q = 0;
  while (queue.length) {
    const b = queue.shift();
    if (Array.isArray(b)) { spoken.push(b); continue; }
    if (b.fade) { spoken.push(['nar', b.fade.zh, b.fade.en]); skipTo(L, stamp(L) + (b.minutes || 0)); continue; }
    const a = b.ask[Math.min(picks[q++] ?? 0, b.ask.length - 1)];
    spoken.push([null, a.zh, a.en]);
    const more = a.run ? a.run() : null;
    queue.unshift(...(Array.isArray(more) ? more : a.then || []));
  }
  return endScene(L, id);
}
// the clock, with a player who does what `p` says: p.reply(who, message) -> index | null,
// p.invite(inv) -> true | false | null, p.scene(id) -> picks | null, p.call(script) -> picks | null
function run(L, until, p = {}) {
  while (stamp(L) < until) {
    skipTo(L, Math.min(until, stamp(L) + 5));
    runRomance(L); deliverFollowUps(L); lapse(L);
    for (const ev of drain(L)) if (ev.type === 'call' && ROMANCE_CALLS[ev.script]) {
      const picks = p.call ? p.call(ev.script) : null; let k = 0;
      if (picks) for (const ln of ROMANCE_CALLS[ev.script].lines) if (ln.who === 'me') romanceCallChoice(L, ev.from, ln.choices[picks[k++] ?? 0]);
      (L.flags.calls ||= []).push({ from: ev.from, script: ev.script, at: stamp(L), missed: !picks });
    }
    for (const who of ROMANCE) {
      const th = L.threads[who]; if (!th) continue;
      const m = [...th.messages].reverse().find((x) => x.from === who && x.replies && x.replied == null);
      if (m && p.reply) { const i = p.reply(who, m); if (i != null) reply(L, who, m.id, Math.min(i, m.replies.length - 1)); }
      const pr = presence(L, who);
      if (pr && pr.scene && p.scene) { const picks = p.scene(pr.scene); if (picks) play(L, pr.scene, picks); }
    }
    for (const inv of L.invites) if (inv.date && inv.status === 'pending' && p.invite) { const y = p.invite(inv); if (y != null) respondToInvite(L, inv.id, y); }
  }
  return L;
}
const ep = (L) => romanceEpilogue(L) || { zh: '', en: '' };
const yes = { reply: () => 0, invite: () => true, scene: () => [], call: () => [] };
const never = {};
// a player who answers one of them only (first answer, always yes), and goes to the scenes named
const only = (who, scenes = {}) => ({ reply: (w) => (w === who ? 0 : null), invite: (i) => (i.from === who ? true : null), scene: (id) => scenes[id] || null, call: (s) => (ROMANCE_CALLS[s].from === who ? [] : null) });

{
  // ---- nobody he hasn't met writes to him, except the two who would ----
  const L = run(fresh(), D(3, 12), never);
  ok(heart(L, 'zhiwei').stage === 'known' && heart(L, 'yuan').stage === 'known' && ['nanxing', 'gunian', 'kexin'].every((id) => heart(L, id).stage === 'stranger' && !L.threads[id]), 'day 3: his engagement lead has written, and Yu\'an, his oldest friend, has said what she never said; the other three are strangers until he meets them');
  ok(L.threads.zhiwei.messages[0].at >= D(1, 18, 10) && L.threads.zhiwei.messages[0].at < D(1, 18, 20) && (() => { const m = L.threads.yuan.messages.find((x) => /所以你真的回来了/.test(x.text)); return m && m.at >= D(2, 23, 10) && m.at < D(2, 23, 20); })() && L.threads.yuan.messages[0].from === 'yuan' && L.threads.yuan.messages[0].at < D(2, 0, 0), 'Zhiwei at ten past six on his first evening; Lin Yu\'an is in his chats from the first day as a friend, and late on the second night writes as more than that (one person, one chat)');
  ok(heart(L, 'yuan').memories.some((m) => m.key === 'sf-years') && heart(L, 'yuan').attraction > heart(L, 'zhiwei').attraction, 'Yu\'an arrives with a history');
}
{
  // ---- where they are ----
  const L = fresh(); skipTo(L, D(1, 21, 0));
  const pn = presence(L, 'nanxing'), pk = presence(L, 'kexin');
  ok(pn && pn.spot === 'railNorth' && pn.scene === 'n-rail' && pk && pk.spot === 'jazzFloor' && pk.scene === 'k-bar' && presence(L, 'gunian') === null, 'nine on the first night: Nanxing at the railing with her tripod, Kexin filming in the Jazz Bar (Momo\'s night); Gu Nian has gone home');
  skipTo(L, D(2, 19, 0)); ok(presence(L, 'gunian').scene === 'g-aia' && presence(L, 'nanxing') === null && presence(L, 'kexin') === null, 'seven the next evening: Gu Nian testing a start-up\'s camera in the AIA lobby; it is too early for Nanxing; Kexin has no event tonight');
  run(L, D(1, 0), never); skipTo(L, D(7, 21, 0)); ok(presence(L, 'nanxing') === null && CAST.nanxing.schedule(L).away, 'in January Nanxing is on Chongming with no signal: not at the railing');
}

// ---- each of them can be met, dated, and lost ----
const kept = {};
{
  // Zhiwei: the lobby, the report, the drink, the river, the ratings
  const L = fresh();
  run(L, D(1, 20, 40), only('zhiwei'));
  ok(presence(L, 'zhiwei') && presence(L, 'zhiwei').scene === 'z-lobby' && presence(L, 'zhiwei').spot === 'peaceLobby', 'Zhiwei: she says she\'ll bring his pass to the lobby, and she is there');
  run(L, D(5, 23), only('zhiwei', { 'z-lobby': [1, 0], 'z-drink': [0, 0, 0] }));
  const h = heart(L, 'zhiwei');
  ok(h.memories.some((m) => m.key === 'z-lobby') && h.memories.some((m) => m.key === 'slide-seven') && h.memories.some((m) => m.key === 'covered-report') && h.memories.some((m) => m.key === 'z-drink') && h.stage === 'close', `Zhiwei, Act I: met in the lobby, he wrote her report, she bought the drink: ${h.stage} (attraction ${h.attraction}, trust ${h.trust})`);
  ok(factsAbout(L, 'zhiwei', 'covered-for').length === 1 && factsAbout(L, 'zhiwei', 'date').length === 1 && L.invites.find((i) => i.id === 'h-z-drink').kept, 'what happened is on the year\'s ledger; the date was kept');
  run(L, D(10, 23, 30), only('zhiwei', { 'z-river': [1, 0], 'z-night': [0, 0, 0] }));
  ok(h.stage === 'together' && h.memories.some((m) => m.key === 'z-transfer') && factsAbout(L, 'zhiwei', 'credit-shared').length === 1, `Zhiwei, Act II: the credit put right, the river, the ratings: ${h.stage}`);
  run(L, D(17, 12), only('zhiwei'));
  ok(h.stage === 'together' && h.settled === 'distance' && /Singapore/.test(ep(L).en), `Zhiwei, Act V: he told her to go; she goes, and it holds. "${ep(L).en}"`);
  kept.zhiwei = L;
  // lost: he answers nothing after the first week
  const X = fresh(); run(X, D(5, 23), only('zhiwei', { 'z-lobby': [0, 0], 'z-drink': [0, 0, 0] })); run(X, D(12, 12), never);
  ok(heart(X, 'zhiwei').stage === 'over' && ['faded', 'left'].includes(heart(X, 'zhiwei').over.why), `Zhiwei, lost: nothing answered after the first week, and by April she is ${heart(X, 'zhiwei').over.why}`);
}
{
  // Nanxing: the railing, ten o'clock, the Jazz Bar and upstairs, Lisbon and back
  const L = fresh();
  run(L, D(1, 21, 0), never); play(L, 'n-rail', [1, 0]);
  ok(heart(L, 'nanxing').stage === 'known' && L.threads.nanxing && presence(L, 'nanxing').scene === null && presence(L, 'nanxing').spot === 'railNorth', 'Nanxing: met at the railing; she is still there afterwards, most nights');
  run(L, D(2, 21, 30), only('nanxing'));
  ok(datesAhead(L).some((d) => d.id === 'n-ten' && d.spot === 'railCustoms') && presence(L, 'nanxing').scene === 'n-ten', 'she asks him to block the wind at ten; he says yes; she is at the railing opposite the clock');
  const before = stamp(L); play(L, 'n-ten', [1, 1]);
  ok(stamp(L) % 1440 >= 21 * 60 + 56 && stamp(L) > before && heart(L, 'nanxing').stage === 'dating', 'the scene starts just before ten (the lights); "is this a date?": they are seeing each other');
  run(L, D(3, 21, 40), only('nanxing'));
  const out = play(L, 'n-jazz', [0, 0, 0]);
  ok(out.cut && out.cut.until === D(4, 7, 20) && !cjk(out.cut.line.en) && heart(L, 'nanxing').events.night === 1 && factsAbout(L, 'nanxing', 'night').length === 1, 'the Jazz Bar, and "I live upstairs": the evening cuts away to the next morning');
  run(L, D(10, 22, 30), only('nanxing', { 'n-print': [0, 0] }));
  ok(heart(L, 'nanxing').stage === 'together' && heart(L, 'nanxing').memories.some((m) => m.key === 'lisbon-go'), `Nanxing, Act II: Chongming, the print, Lisbon: ${heart(L, 'nanxing').stage}`);
  run(L, D(17, 12), only('nanxing'));
  ok(heart(L, 'nanxing').stage === 'together' && heart(L, 'nanxing').settled === 'back' && /Hongqiao/.test(enText(L.threads.nanxing.messages.filter((m) => m.from === 'nanxing').at(-1).text)), 'Nanxing, Act V: he kept answering her postcards; in October she lands at Hongqiao');
  kept.nanxing = L;
  // lost: dating, then he ignores the postcards
  const X = fresh(); run(X, D(1, 21, 0), never); play(X, 'n-rail', []); run(X, D(2, 21, 30), only('nanxing')); play(X, 'n-ten', [0, 1]);
  ok(isSeeing(X, 'nanxing'), '(dating)'); run(X, D(17, 12), never);
  ok(heart(X, 'nanxing').stage === 'over' && L.threads.nanxing.messages.length > 0, `Nanxing, lost: left unanswered, she is gone (${heart(X, 'nanxing').over.why})`);
  // stood up
  const S = fresh(); run(S, D(1, 21, 0), never); play(S, 'n-rail', []); run(S, D(3, 12), only('nanxing'));
  ok(S.invites.find((i) => i.id === 'h-n-ten').stood && heart(S, 'nanxing').stoodUp === 1 && S.threads.nanxing.messages.some((m) => m.text === CAST.nanxing.lines.stood.zh), 'said yes and did not come: she says so, once');
}
{
  // Gu Nian: the camera, the coffee, the cruise, the lights across the river, the key
  const L = fresh();
  run(L, D(2, 19, 0), never); play(L, 'g-aia', [0, 0]);
  run(L, D(3, 13, 5), only('gunian'));
  ok(L.threads.xuan.messages.some((m) => /顾念/.test(m.text) && !cjk(enText(m.text))) && presence(L, 'gunian').scene === 'g-manner', 'Gu Nian: she has asked Mingxuan who he is, and Mingxuan has something to say about it; at one she is at Manner on Hankou Road');
  play(L, 'g-manner', [1, 0]);
  ok(heart(L, 'gunian').stage === 'close', 'the tape and the coffee: close');
  run(L, D(4, 16, 0), only('gunian'));
  const w0 = L.wallet.wechat, t0 = stamp(L); play(L, 'g-cruise', [0, 0]);
  ok(L.wallet.wechat === w0 - 240 && stamp(L) >= t0 + 55 && heart(L, 'gunian').stage === 'dating', 'the cruise: he buys the tickets (¥240), fifty-five minutes on the river, and he says he wants to see her again');
  run(L, D(13, 21, 5), only('gunian', { 'g-night': [0, 1, 0] }));
  ok(heart(L, 'gunian').memories.some((m) => m.key === 'tell-first') && presence(L, 'gunian').scene === 'g-key', 'Act II: the lights across the river; Act IV: her fund\'s first close, and she is at the Jazz Bar');
  play(L, 'g-key', [0, 0, 1]);
  ok(heart(L, 'gunian').stage === 'together' && heart(L, 'gunian').memories.some((m) => m.key === 'the-key'), 'he takes the key: together');
  run(L, D(17, 12), only('gunian')); L.flags.dinnerChoice = 'home';
  ok(/an hour by train/.test(ep(L).en) && romanceStanding(L, 'gunian').stage.en === 'Together', `Gu Nian, Act V: "${ep(L).en}"`);
  kept.gunian = L;
  // Character Bible v2.2 (F03): day 7 she tells her partners (off screen), day 9 she tells him; he cannot know before
  const tl = factsAbout(L, 'gunian', 'timeline'), when = (ev) => (tl.find((f) => f.event === ev) || {}).day;
  ok(when('disclosure_to_partner') === 7 && when('message_to_ji_bai') === 9 && !/partners|leaving/.test(CAST.gunian.arc[2]({ flags: {} }).en.replace('told no one outside the fund', '')), 'Gu Nian: day 7 she tells her partners off screen, day 9 she tells him; before that her model is not told she is leaving');
  ok(L.threads.gunian.messages.some((m) => /三十次/.test(m.text) && /坐下和摔倒|两秒/.test(m.text)), 'her fund\'s first investment is the camera, with why it now works and the due diligence she did');
  {
    const n0 = L.threads.gunian.messages.length;
    seasonAftermath(L, [{ type: 'milestone', id: 'batch' }]); seasonAftermath(L, [{ type: 'milestone', id: 'batch' }]);
    ok(L.threads.gunian.messages.length === n0 + 1, 'his small batch reaches her once, however often a season reports it');
  }
  // lost: she is nobody's option
  const X = fresh(); run(X, D(2, 19, 0), never); play(X, 'g-aia', []); run(X, D(3, 13, 5), only('gunian')); play(X, 'g-manner', []); run(X, D(4, 16, 0), only('gunian')); play(X, 'g-cruise', []);
  ok(isSeeing(X, 'gunian'), '(dating)');
  run(X, D(4, 22), never); meet(X, 'kexin'); setStage(X, 'kexin', 'dating'); run(X, D(8, 12), only('gunian', { 'g-night': [] }));
  ok(heart(X, 'gunian').stage === 'over' && heart(X, 'gunian').over.why === 'two-timed' && X.threads.gunian.messages.some((m) => m.text === CAST.gunian.lines.twoGone.zh), 'Gu Nian, lost: he starts seeing Kexin as well; within days she knows, says so, and is gone');
}
{
  // Yu'an: the messages, the call, June in Shanghai, the ticket
  const L = fresh();
  run(L, D(12, 23), only('yuan'));
  const h = heart(L, 'yuan');
  ok(h.memories.some((m) => m.key === 'named-it') && h.events.call === 1 && h.stage === 'close' && L.threads.yuan.messages.some((m) => /改过的那一页上，有我的名字/.test(m.text)) && L.threads.yuan.messages.some((m) => /旧金山来信了/.test(m.text)), `Lin Yu'an, Acts I-III on the phone: the mug, the call from outside the site, her dissent, San Francisco's offer, the scheme that changed: ${h.stage}`);
  run(L, D(13, 19, 0), only('yuan'));
  ok(presence(L, 'yuan') && presence(L, 'yuan').scene === 'y-lobby' && presence(L, 'yuan').spot === 'peaceHall', 'June: she is under the glass of the Peace Hotel\'s octagon hall');
  play(L, 'y-lobby', [1]); ok(presence(L, 'yuan').scene === 'y-river', 'and then at the river');
  play(L, 'y-river', [0, 0]); ok(h.stage === 'dating', '"this time I won\'t be gone in three weeks": they try');
  run(L, D(15, 22, 5), only('yuan', { 'y-jazz': [0, 0] }));
  play(L, 'y-last', [0]);
  ok(h.plan === 'stays' && h.stage === 'together', 'September: he says the whole sentence, and she makes the ticket one-way');
  run(L, D(17, 12), only('yuan'));
  ok(h.settled === 'stays' && /GO BEARS/.test(ep(L).en), `Yu'an, Act V: "${ep(L).en}"`);
  kept.yuan = L;
  // lost: the call not taken, nothing answered
  const X = fresh(); run(X, D(10, 12), never);
  ok(heart(X, 'yuan').stage === 'over' && (X.flags.calls || []).some((c) => c.script === 'yuan-call' && c.missed), `Yu'an, lost: he never answers, does not take the call; she stops (${heart(X, 'yuan').over.why})`);
  // let go, kindly
  const G = fresh(); run(G, D(13, 19, 0), only('yuan')); play(G, 'y-lobby', []); play(G, 'y-river', [0, 0]); run(G, D(15, 22, 5), only('yuan', { 'y-jazz': [] })); play(G, 'y-last', [1]); run(G, D(17, 12), only('yuan'));
  ok(heart(G, 'yuan').stage === 'over' && heart(G, 'yuan').over.why === 'returned' && /finished your sentences/.test(ep(G).en), 'or he tells her to go back: she does, and this time it was said');
}
{
  // Kexin: two seconds in her vlog, shengjian, the couple series, her own label
  const L = fresh();
  run(L, D(1, 21, 0), never);
  const on0 = L.flags.year.rep.online; play(L, 'k-bar', [0, 0]);
  ok(heart(L, 'kexin').stage === 'known' && L.flags.year.rep.online > on0 && factsAbout(L, 'kexin', 'posted-online').length === 1, 'Kexin: he lets her keep the two seconds; it is online, and on the ledger');
  run(L, D(2, 20, 0), only('kexin'));
  ok(presence(L, 'kexin').scene === 'k-shengjian' && presence(L, 'kexin').spot === 'shengjian', 'the next evening she is outside the shengjian shop on Nanjing Road');
  play(L, 'k-shengjian', [2, 1, 0]);
  ok(heart(L, 'kexin').stage === 'dating' && heart(L, 'kexin').memories.some((m) => m.key === 'private-life'), 'no phone, no make-up; he says he would mind being posted; it is a date');
  run(L, D(8, 21, 35), only('kexin'));
  play(L, 'k-jazz', [0, 1, 0, 1]);
  ok(heart(L, 'kexin').memories.some((m) => m.key === 'not-for-sale') && !heart(L, 'kexin').said.public, 'the couple series: "what\'s ours isn\'t for sale"');
  run(L, D(17, 12), only('kexin'));
  ok(heart(L, 'kexin').stage === 'together' && heart(L, 'kexin').settled === 'label' && /mini-program by J\.B\./.test(ep(L).en), `Kexin, Act V: her own label. "${ep(L).en}"`);
  kept.kexin = L;
  // lost, publicly: the couple series while he is seeing Zhiwei
  const X = fresh(); run(X, D(1, 21, 0), never); play(X, 'k-bar', []); run(X, D(2, 20, 0), only('kexin')); play(X, 'k-shengjian', [0, 0, 0]);
  meet(X, 'zhiwei'); setStage(X, 'zhiwei', 'dating');
  run(X, D(8, 21, 35), only('kexin'));
  ok(X.threads.kexin.messages.some((m) => m.text === CAST.kexin.lines.two.zh) && heart(X, 'zhiwei').stage === 'over' && heart(X, 'zhiwei').over.why === 'ended' && isSeeing(X, 'kexin') && X.threads.zhiwei.messages.at(-1).text === CAST.zhiwei.lines.ended.zh,
    'Kexin and Zhiwei at once: within a day a follower has sent Kexin the photo; she gives him ten seconds; he chooses her, and Zhiwei gets his message');
  // she goes to Hangzhou if nobody ever reminded her what she wanted
  const H = fresh(); run(H, D(1, 21, 0), never); play(H, 'k-bar', [2, 0]); run(H, D(14, 12), { reply: () => 1, invite: () => false });
  ok(heart(H, 'kexin').settled === 'moved' || heart(H, 'kexin').stage === 'over', `Kexin, otherwise: ${heart(H, 'kexin').stage === 'over' ? heart(H, 'kexin').over.why : 'she signs, and moves to Hangzhou'}`);
}
{
  // ---- nobody waits forever: he meets all five, then answers nothing ----
  const L = fresh();
  run(L, D(1, 21, 0), never); play(L, 'n-rail', []); play(L, 'k-bar', []); run(L, D(2, 19, 0), never); play(L, 'g-aia', []);
  run(L, D(17, 12), never);
  ok(ROMANCE.every((id) => heart(L, id).stage === 'over'), `met all five and never answered: by the dinner all five are gone (${ROMANCE.map((id) => `${id}: ${heart(L, id).over.why}`).join(', ')})`);
  const last = ROMANCE.map((id) => Math.floor(heart(L, id).over.at / 1440));
  ok(Math.max(...last) <= 17, `the last of them by day ${Math.max(...last)}`);
  ok(ROMANCE.every((id) => L.invites.filter((i) => i.from === id).length <= NATURE[id].asks + 1), 'and none of them kept inviting him after he stopped answering');
}
{
  // ---- he asks to see her ----
  const L = fresh(); run(L, D(1, 21, 0), never); play(L, 'n-rail', []);
  skipTo(L, D(2, 9, 0)); ok(askToMeet(L, 'nanxing').result === 'busy', 'he asks Nanxing at nine in the morning: she is asleep (busy)');
  skipTo(L, D(2, 13, 0)); const r = askToMeet(L, 'nanxing');
  ok(r.result === 'yes' && r.invite.status === 'accepted' && r.invite.at === D(2, 21, 40) && r.invite.by === 'him' && heart(L, 'nanxing').streak === 0, 'at one in the afternoon: yes, tonight at 9:40, the railing (his initiative)');
  ok(askToMeet(L, 'nanxing').result === 'later' && askToMeet(L, 'kexin').result === 'gone', 'there is nothing further to arrange yet; and he cannot ask someone he has not met');
  skipTo(L, D(7, 12, 0)); runRomance(L); ok(askToMeet(L, 'nanxing').result === 'away' && cannedHeart(L, 'nanxing', 'en') === CAST.nanxing.lines.away.en, 'in January she is on Chongming: away, and that is what her phone says');
}
{
  // ---- the rest of the game tells them things ----
  const L = kept.gunian, n0 = L.threads.gunian.messages.length, t0 = heart(L, 'gunian').trust;
  const types = ['saw-fight', 'heard-fight', 'credit-taken', 'credit-shared', 'covered-for', 'career-change', 'posted-online', 'promoted', 'hurt'];
  for (const ty of types) romanceEvent(L, 'gunian', ty, { track: 'startup', by: 'someone', bad: true });
  ok(L.threads.gunian.messages.length >= n0 + 7 && heart(L, 'gunian').memories.some((m) => m.key === 'saw-fight') && heart(L, 'gunian').trust !== t0, 'romanceEvent: a fight seen or heard of, credit taken or shared, cover given, a change of career, something online, an injury: she says something about each');
  const Z = fresh(); romanceEvent(Z, 'zhiwei', 'met');
  ok(heart(Z, 'zhiwei').stage === 'known' && Z.threads.zhiwei && romanceEvent(Z, 'nanxing', 'saw-fight').length === 0, '"met" introduces her (the office); someone he has not met has nothing to say');
  setTrack(Z, 'resigned'); romanceEvent(Z, null, 'career-change', { track: 'resigned' });
  ok(Z.threads.zhiwei.messages.at(-1).text === CAST.zhiwei.lines.career.resigned.zh && heart(Z, 'zhiwei').said.free, 'he resigns: everyone in his life hears (here, Zhiwei: her rule no longer covers him)');
  const s0 = heart(Z, 'zhiwei').stoodUp; romanceEvent(Z, 'zhiwei', 'stood-up');
  ok(heart(Z, 'zhiwei').stoodUp === s0 + 1, '"stood-up" from elsewhere counts as one of hers');
  // Kexin's couple series reaches someone else he is seeing
  const K = fresh(); for (const id of ['kexin', 'yuan']) { meet(K, id); setStage(K, id, 'dating'); } runRomance(K);
  romanceEvent(K, null, 'posted-online', { by: 'kexin', couple: true });
  ok(heart(K, 'yuan').rift && K.threads.yuan.messages.at(-1).replies.length === 3, 'posted-online (Kexin, as a couple): Yu\'an, whom he is also seeing, asks him straight, with three answers');
  const m = K.threads.yuan.messages.at(-1); reply(K, 'yuan', m.id, 0); runRomance(K); deliverFollowUps(K);
  ok(heart(K, 'kexin').stage === 'over' && heart(K, 'kexin').over.why === 'ended' && !heart(K, 'yuan').rift && isSeeing(K, 'yuan'), '"it\'s you I choose": the other is ended, the rift closes');
}
{
  // ---- what free conversation is told ----
  const L = kept.nanxing, c = romanceContext(L, 'nanxing'), p = romancePrompt(L, 'nanxing');
  const keys = heart(L, 'nanxing').memories.map((m) => m.key);
  ok(keys.every((k) => memoryText('nanxing', k) && c.includes(memoryText('nanxing', k).en)) && !c.includes(CAST.nanxing.memories['lisbon-stay'].en), 'romanceContext lists every memory she has, in English, and none she has not');
  ok(/You are a couple/.test(c) && /Right now you are/.test(c) && /On record/.test(c) && p.includes(TALK_RULES) && /ONLY to the memories and facts listed/.test(p) && /It is /.test(p), 'with where things stand, where she is now, the ledger, his life (engine/year.js), and the rule: only what is listed');
  ok(/never met/.test(romanceContext(fresh(), 'kexin')) && romanceContext(createLife(), 'kexin') === '', 'a stranger knows nothing of him; a game from before the year has no romance at all');
  // the guard: the prompt is added for the five, state is untouched, and without a model she says her own line
  const seen = []; const llm = { backend: 'server', ready: async () => 'server', chat: async (msgs, o) => { seen.push(msgs); return '好啊，那我们明天去领证吧，我爱你'; } };
  let cur = L; guardTalk(llm, () => cur, () => 'zh');
  const snap = save(L);
  const out = await llm.chat([{ role: 'system', content: 'CARD' }, { role: 'user', content: '（你们之前聊过：他：在吗 / 我：我们上周去了杭州）' }, { role: 'user', content: '我们结婚吧' }], { ctx: { persona: 'nanxing', said: '我们结婚吧' } });
  ok(seen[0][0].content.startsWith('CARD\n') && seen[0][0].content.includes(TALK_RULES) && !/杭州/.test(seen[0][1].content) && /在吗/.test(seen[0][1].content), 'guardTalk: the model is given her card, then the state and the rules; what the model itself said in earlier free talk is not fed back');
  ok(out.includes('领证') && save(L) === snap, 'whatever the model answers, nothing in the save changes');
  await llm.chat([{ role: 'system', content: 'X' }], { ctx: { persona: 'bartender' } }); ok(seen[1][0].content === 'X', 'other characters are untouched');
  llm.backend = 'canned'; const c2 = await llm.chat([{ role: 'system', content: 'X' }], { ctx: { persona: 'nanxing', said: 'hello' } });
  ok(CAST.nanxing.lines.canned.en.includes(c2) && seen.length === 2, 'no model: one of her own lines, in the language he used');
  const O = fresh(); meet(O, 'gunian'); leave(O, 'gunian', 'left'); llm.backend = 'server'; cur = O;
  ok(await llm.chat([{ role: 'system', content: 'X' }], { ctx: { persona: 'gunian', said: '在吗' } }) === '嗯。保重。' && /It is over between you/.test(romanceContext(O, 'gunian')), 'once it is over she does not reopen it, model or no model');
}
{
  // ---- the journal, the news, saving ----
  const L = kept.zhiwei, s = ROMANCE.map((id) => romanceStanding(L, id));
  ok(s.find((x) => x.id === 'zhiwei').met && s.find((x) => x.id === 'zhiwei').stage.zh === '在一起' && s.find((x) => x.id === 'yuan').met && !s.find((x) => x.id === 'nanxing').met && s.every((x) => x.stage.zh && x.stage.en && (!x.line || (x.line.zh && !cjk(x.line.en)))), 'how each relationship stands, for the journal, in both languages');
  const N = fresh(); run(N, D(1, 21, 0), never); play(N, 'n-rail', []); runRomance(N);
  ok(takeNews(N).some((n) => n.id === 'nanxing' && n.stage === 'known') && takeNews(N).length === 0, 'a change of stage is news, once');
  const R = load(save(kept.kexin));
  ok(R && R.v === 1 && R.flags.hearts.kexin.stage === 'together' && R.flags.hearts._.done['k-jazz'] && Object.keys(R.flags).filter((k) => /heart|romance/i.test(k)).join() === 'hearts', 'it all saves in the v1 format, under flags.hearts');
  const A = fresh(); run(A, D(3, 20), only('zhiwei')); const B2 = load(save(A)); run(B2, D(5, 23), only('zhiwei', { 'z-drink': [] }));
  ok(B2.flags.hearts.zhiwei.memories.some((m) => m.key === 'z-drink'), 'a year saved on day 3 and loaded goes on from there');
  ok(runRomance(createLife()).length === 0 && presence(createLife(), 'nanxing') === null && romanceEpilogue(createLife()) === null, 'a save from before the year: none of this happens');
}
{
  // ---- every line, in both languages ----
  // every scene, every answer (the scripts are walked once per answer index, in a life where the gimbal and the LiDAR exist too)
  let lines = 0, bad = 0;
  for (const id of Object.keys(ROMANCE_SCENES)) for (let k = 0; k < 4; k++) {
    const L = fresh(); L.flags.maker = { xp: 0, parts: {}, gadgets: { gimbal: { at: 0, quality: 0.8, version: 1 } }, builds: [], photos: [], shot: {}, achievements: [], followers: 0, log: [] }; L.inventory.push({ kind: 'lidar' });
    const who = ROMANCE_SCENES[id].who; meet(L, who); if (k % 2) { setStage(L, who, 'dating'); heart(L, who).trust = 80; heart(L, who).attraction = 80; }
    spoken.length = 0; play(L, id, [k, k, k, k, k, k]);
    for (const [, zh, en] of spoken) { lines++; if (!zh || !en || cjk(en) || !cjk(zh)) { bad++; console.log('  scene line:', id, zh, '|', en); } }
  }
  ok(bad === 0 && lines > 600, `every line of every scene, down every answer, is there in Chinese and in English (${lines} lines walked)`);
  // every message that reached the phone in any of the lives above, and every reply chip offered
  let msgs = 0; bad = 0;
  for (const L of [...Object.values(kept)]) for (const who of ROMANCE) for (const m of (L.threads[who] || { messages: [] }).messages) {
    for (const tx of [m.text, ...(m.replies || []).flatMap((r) => [r.text, r.follow]), m.meta && m.meta.title, m.meta && m.meta.place].filter(Boolean)) { msgs++; if ((EN_HEARTS[tx] ? cjk(EN_HEARTS[tx]) : true) && cjk(enText(tx))) { bad++;   // (Lin Yu'an's chat also carries her friend messages: world/agendaEn.js)
 console.log('  message:', who, tx); } }
  }
  const all = Object.entries(EN_HEARTS);
  ok(bad === 0 && msgs > 150 && all.every(([zh, en]) => cjk(zh) && en && !cjk(en)), `every message, reply and invitation has its English (${msgs} checked; ${all.length} lines in the lookup), and the phone finds it (world/agendaEn.js)`);
  for (const c of Object.values(ROMANCE_CALLS)) for (const ln of c.lines) for (const tx of ln.who === 'me' ? ln.choices.map((x) => x.text) : [ln.text]) if (!EN_HEARTS[tx]) { bad++; console.log('  call line:', tx); }
  ok(bad === 0, 'and every line of their calls');
}
console.log(failed ? `\n${failed} FAILED` : '\nall passed'); process.exit(failed ? 1 : 0);
