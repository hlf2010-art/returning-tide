// The five people Ji Bai might come to love, and their own lives (the rules are engine/hearts.js; each
// person's words are in world/romance/<id>.js; world/romanceScenes.js puts them in the street).
// Pure (no three.js, no DOM): a whole year with any of them can be played in node
// (tests/hearts.test.mjs).
//   CAST                 who they are: name, role, ambition, the card the free conversation plays,
//                        their year act by act, their schedule, messages, dates, scenes, endings
//   runRomance(L)        the tick: days pass (silences, doubts), what he answered or left
//                        unanswered, invitations kept or missed, their own beats when they're free
//                        to write. Call it wherever world/agenda.js's runAgenda is called
//   presence(L, who)     where she is now and what's on there (a first meeting, a date he said yes to)
//   sceneScript / startScene / endScene / leftScene     playing a scene (world/romanceScenes.js)
//   askToMeet(L, who)    he asks to see her (the phone): yes with a time and a place, or why not
//   romanceEvent(L, id, type, data)   the rest of the game tells them something happened
//   romanceContext(L, who), romancePrompt(L, who), guardTalk(llm, ...)   what free conversation is
//                        told: the validated memories and facts, never invented ones
//   romanceStanding(L, who), romanceEpilogue(L)         for the journal and the ending card
// State: life.flags.hearts only (hearts._ is the bookkeeping), plus facts on the year's ledger.
import { post, stamp, skipTo, answerInvite } from '../engine/life.js';
import { logTime, slept } from '../engine/allot.js';
import { ROMANCE, heart, hearts, meet, feel, remember, recalls, seeing, contact, answered, ignored, mayWrite, availability, askResult, shared, foundOut, resolveRift, dayTick, leave, inLife, isSeeing, oneSided, standingOf } from '../engine/hearts.js';
import { isYear, fact, factsAbout, lifeContext, actOf, rep } from '../engine/year.js';
import { EN_HEARTS, EVENTS, meta, t, B, D, say, R, applyFx, openThread, askOut, invOf, done, tonightOr } from './romance/kit.js';
import zhiwei from './romance/zhiwei.js';
import nanxing from './romance/nanxing.js';
import gunian from './romance/gunian.js';
import yuan from './romance/yuan.js';
import kexin from './romance/kexin.js';

export const CAST = { zhiwei, nanxing, gunian, yuan, kexin };
export { EN_HEARTS, ROMANCE };
const SCENES = {};
for (const P of Object.values(CAST)) { Object.assign(EVENTS, P.events || {}); for (const [id, s] of Object.entries(P.scenes)) SCENES[id] = s; }
export const ROMANCE_SCENES = SCENES;
// their phone calls (main.js adds these to the phone's scripts)
export const ROMANCE_CALLS = Object.assign({}, ...Object.values(CAST).map((P) => P.calls || {}));
// who's speaking, for ui/sceneTalk.js ('nar': the narrator, no name)
export const ROMANCE_NAMES = { nar: ['', ''], ...Object.fromEntries(Object.values(CAST).map((P) => [P.id, [P.name.zh, P.short.en]])) };
const clockOf = (m) => `${String(Math.floor((m % 1440) / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

// ---- things anyone might come to remember (the rest of the game tells them: romanceEvent) ----
const GENERIC = {
  'saw-fight': B('她亲眼看见他跟人动了手。', 'She saw him in a fight with her own eyes.'),
  'heard-fight': B('她听说他跟人动了手。', 'She heard he had been in a fight.'),
  'he-took-credit': B('她的工作，功劳记在了他名下，他没有纠正。', "Her work went down under his name and he didn't correct it."),
  'shared-credit': B('他在人前把功劳分给了她。', 'In front of other people he gave her her share of the credit.'),
  'covered-for': B('她出岔子的时候，他替她顶了一次。', 'When she slipped, he covered for her.'),
  'car-hit': B('她听说他开车在外滩撞倒了一个行人。', 'She heard he knocked down a pedestrian on the Bund in his car.'),
  'car-hit-seen': B('她看了他开车在外滩斑马线撞倒行人的视频。', 'She watched the video of him knocking down a pedestrian on the Bund zebra crossing in his car.'),
  'seen-online': B('她在网上刷到了关于他的东西。', 'Something about him came up in her feed.'),
  'stood-up': B('他答应了却没有来。', "He said he'd come, and didn't."),
};
export const memoryText = (who, key) => (CAST[who] && CAST[who].memories[key]) || GENERIC[key] || null;
const LINES = {
  covered: B('今天的事，谢谢你替我挡了。我记着。', "Thank you for covering for me today. I won't forget it."),
  creditTaken: B('今天汇报，我做的那部分记在了你名下。你没有纠正。', "At today's review my part went down under your name. You didn't correct it."),
  creditShared: B('你在人前说那部分是我做的。……其实你可以不说的。谢谢。', "You said in front of everyone that part was mine. ...You needn't have. Thank you."),
  promoted: B('恭喜。——我是认真的，虽然打这两个字花了我十分钟。', 'Congratulations. — I mean it, though it took me ten minutes to type.'),
  gone: B('嗯。保重。', 'Mm. Take care.'),
  ask: B('这两天有空吗？想见你。', "Are you free in the next day or two? I'd like to see you."),
};

// ---- where she is ----
export const slotOf = (L, who) => CAST[who].schedule(L);
export function sceneNow(L, who) {
  for (const [id, s] of Object.entries(CAST[who].scenes)) if (!done(L, id) && s.on(L)) return id;
  return null;
}
// -> { who, spot, scene, seat, doing, free } or null (not anywhere he could walk to, or not in his life)
export function presence(L, who) {
  if (!isYear(L)) return null;
  const h = heart(L, who); if (h.stage === 'over') return null;
  const scene = sceneNow(L, who), slot = slotOf(L, who);
  if (scene) return { who, spot: SCENES[scene].spot, scene, seat: !!SCENES[scene].seat, doing: slot.doing, free: true };
  if (h.stage === 'stranger' || !slot.spot) return null;
  return { who, spot: slot.spot, scene: null, seat: false, doing: slot.doing, free: availability(L, who, slot).free };
}
// dates he's said yes to that haven't happened yet (for the map and the journal)
export function datesAhead(L) {
  const now = stamp(L);
  return L.invites.filter((i) => i.date && i.status === 'accepted' && !i.kept && !i.stood && now <= i.at + 75).map((i) => ({ who: i.from, id: i.date, at: i.at, spot: (SCENES[CAST[i.from].dates[i.date].scene || i.date] || {}).spot || null, title: CAST[i.from].dates[i.date].title }));
}

// ---- playing a scene ----
export const sceneScript = (L, id) => SCENES[id].script(L);
// as it begins: a scene that turns on an hour (the lights at ten) starts a few minutes before it
export function startScene(L, id) {
  const s = SCENES[id], m = stamp(L) % 1440;
  if (s.startAt != null && m < s.startAt && s.startAt - m <= 45) skipTo(L, stamp(L) - m + s.startAt);
  contact(L, s.who);
}
// it was played to the end: what it leaves behind. -> { who, cut: { line: B, until } | null }
export function endScene(L, id) {
  const s = SCENES[id], who = s.who, P = CAST[who], M = meta(L);
  M.done[id] = stamp(L);
  if (heart(L, who).stage === 'stranger') { meet(L, who); openThread(L, who, P.name.zh); }
  if (s.date) { const inv = invOf(L, s.date); if (inv) inv.kept = true; }
  shared(L, who, s.kind || 'talk', id);
  fact(L, s.kind === 'date' ? 'date' : 'met', { what: id }, [who]);
  if (s.pass) skipTo(L, stamp(L) + s.pass);
  logTime(L, ROMANCE.includes(who) ? 'love' : 'friends', 60 + (s.pass || 0), who);   // (engine/allot.js: where the year's time went)
  let cut = null;
  if (M.night === who) {
    shared(L, who, 'night', `${who}-night`); fact(L, 'night', {}, [who]);
    const now = stamp(L), tod = now % 1440;
    cut = { who, line: P.lines.morning, until: now - tod + (tod >= 5 * 60 ? 1440 : 0) + 7 * 60 + 20 };
  }
  M.night = null;
  return { who, cut };
}
// he walked off in the middle of it
export function leftScene(L, id) {
  const s = SCENES[id], M = meta(L);
  M.night = null;
  if (heart(L, s.who).stage === 'stranger') return;                   // someone he never quite met
  feel(L, s.who, { trust: -3, attraction: -2 }, 'walked-off');
  if (s.date) { const inv = invOf(L, s.date); if (inv) inv.kept = true; M.done[id] = stamp(L); }
}

// ---- she says something that isn't one of her beats ----
const later = (L, who, line, mins = 1) => { (L.flags.pendingFollow ||= []).push({ at: stamp(L) + mins, thread: who, from: who, text: t(line.zh, line.en) }); };
const TWO_REPLIES = () => [
  R('是。但我选你。', "It's true. But it's you I choose.", { ev: 'chose' }),
  R('是。我不想选。', "It's true. And I don't want to choose.", { ev: 'refused' }),
  R('不是你想的那样。', "It isn't what you think.", { ev: 'denied' }),
];
EVENTS.chose = (L, who) => {
  for (const other of seeing(L)) if (other !== who) { leave(L, other, 'ended'); const O = CAST[other]; if (O.lines.ended) say(L, other, O.lines.ended.zh, O.lines.ended.en); }
  const r = resolveRift(L, who, 'chose'); if (r.ok && CAST[who].lines.chosen) later(L, who, CAST[who].lines.chosen);
};
EVENTS.refused = (L, who) => { resolveRift(L, who, 'refused'); const P = CAST[who]; later(L, who, P.lines.twoGone || P.lines.left); };
EVENTS.denied = (L, who) => { feel(L, who, { trust: -6 }, 'denied'); later(L, who, B('那你想清楚了再回我。我等两天。', "Then answer me when you've thought it through. I'll wait two days.")); };
// what follows from something the rules decided: she stops asking, she goes, she's found out
function voice(L, r, out, line = null) {
  if (!r || !r.id || !CAST[r.id]) return;
  const P = CAST[r.id], lines = P.lines;
  if (line) later(L, r.id, line, 0);
  if (r.type === 'found-out') {
    if (r.does === 'leave') say(L, r.id, (lines.twoGone || lines.left).zh, (lines.twoGone || lines.left).en);
    else if (r.does === 'confront') say(L, r.id, lines.two.zh, lines.two.en, TWO_REPLIES(), { ttl: 1440 });
    else if (r.does === 'open') say(L, r.id, (lines.twoOpen || lines.two).zh, (lines.twoOpen || lines.two).en);
  } else if (r.left && r.why !== 'faded' && r.why !== 'two-timed') later(L, r.id, lines.left, line ? 2 : 0);
  else if (r.left && r.why === 'two-timed') later(L, r.id, lines.twoGone || lines.left, 0);
  else if (r.quiet) later(L, r.id, lines.quiet, line ? 2 : 0);
  if (r.left || r.quiet || r.type === 'found-out') out.push(r);
}

// ---- the tick ----
export function runRomance(L) {
  if (!isYear(L)) return [];
  const M = meta(L), now = stamp(L), out = [];
  M.stage ||= {}; M.spokeAt ||= {};
  for (const e of dayTick(L)) voice(L, e, out);
  // what he tapped in reply, and what he left unanswered
  for (const who of ROMANCE) {
    const th = L.threads[who]; if (!th) continue;
    const open = th.messages.slice(-12).filter((m) => m.from === who && m.replies && !m.hx);
    open.forEach((m, i) => {
      if (m.replied != null) { m.hx = 1; if (m.replied >= 0) { answered(L, who); applyFx(L, who, m.replies[m.replied].fx); } }
      else if (i < open.length - 1) { m.replied = -1; m.hx = 1; }                       // she's written again since: only the latest can be answered
      else if (now - m.at > (m.ttl || 960)) { m.replied = -1; m.hx = 1; voice(L, ignored(L, who, 'message'), out); }
    });
  }
  // invitations: yes, no, left to lapse, not turned up to
  for (const inv of L.invites) {
    if (!inv.date || !CAST[inv.from]) continue;
    const who = inv.from, lines = CAST[who].lines;
    if (inv.status === 'accepted' && !inv.hx) { inv.hx = 'a'; answered(L, who); if (inv.by !== 'him') later(L, who, lines.accept); }
    else if (inv.status === 'declined' && inv.hx !== 'd') { inv.hx = 'd'; contact(L, who); voice(L, ignored(L, who, 'declined'), out, lines.decline); }
    else if (inv.status === 'missed' && inv.hx !== 'm') { inv.hx = 'm'; voice(L, ignored(L, who, 'invite'), out, lines.missed); }
    if (inv.status === 'accepted' && !inv.kept && !inv.stood && now > inv.at + 75) { inv.stood = true; fact(L, 'stood-up', { what: inv.date }, [who]); remember(L, who, 'stood-up'); voice(L, ignored(L, who, 'stood-up'), out, lines.stood); }
  }
  // he wrote to her, or spoke to her, in his own words: that's him reaching out (what was said changes nothing)
  for (const who of ROMANCE) {
    const sp = (L.flags.spoke || {})[who], last = sp && sp.length ? sp[sp.length - 1] : null;
    if (last != null && last > (M.spokeAt[who] ?? -1)) { M.spokeAt[who] = last; if (inLife(L, who)) contact(L, who, { his: true }); }
  }
  // her calls: taken, or not
  const calls = L.flags.calls || [];
  for (let i = M.calls || 0; i < calls.length; i++) {
    const c = calls[i], P = CAST[c.from]; if (!P || !P.calls || !P.calls[c.script]) continue;
    if (c.missed) voice(L, ignored(L, c.from, 'message'), out); else { answered(L, c.from); shared(L, c.from, 'call', c.script); }
  }
  M.calls = calls.length;
  // what their own files raised for everyone else
  for (const ev of (M.raised || []).splice(0)) romanceEvent(L, null, ev.type, { ...ev, own: true });
  // their beats, when the minute has changed
  if (M.t !== now) {
    M.t = now;
    for (const who of ROMANCE) {
      const P = CAST[who], h = heart(L, who);
      // her own life, off screen and whatever stands between them: recorded once, never sent, never told
      // to the model (type 'timeline' is not in FACT_EN), so he learns of it only when she says so
      for (const o of P.offscreen || []) { const k = `${who}:${o.id}`; if (M.fired[k] == null && now >= o.at(L)) { M.fired[k] = now; o.run(L); } }
      if (h.stage === 'over') continue;
      const slot = slotOf(L, who);
      for (const b of P.beats) {
        if (M.fired[b.id] != null || (!b.first && h.stage === 'stranger')) continue;
        const due = b.when(L); if (due == null || now < due) continue;
        const until = b.until ? b.until(L) : due + 2880;
        if (until != null && now > until) { M.fired[b.id] = -1; continue; }
        if (!mayWrite(L, who, b.work ? { ...slot, free: true } : slot, { urgent: !!b.urgent })) continue;   // (work: something she'd send from her desk)
        if (b.if && !b.if(L)) { M.fired[b.id] = -1; continue; }
        M.fired[b.id] = now; b.run(L); heart(L, who).lastWrote = now; out.push({ id: who, type: 'beat', beat: b.id });
        break;                                                           // one thing at a time from each of them
      }
      if (oneSided(L, who) && M.fired[`${who}-1s`] == null && mayWrite(L, who, slot)) {
        M.fired[`${who}-1s`] = now; heart(L, who).streak = 0;
        say(L, who, P.lines.onesided.zh, P.lines.onesided.en, [R('你说得对。下次我先。', "You're right. Next time it's me first.", { t: 2 }), R('我以为你喜欢主动。', 'I thought you liked making the first move.', { a: -1 })]);
      }
    }
  }
  // a stage has changed: on the ledger, and for the screen
  for (const who of ROMANCE) {
    const st = heart(L, who).stage, was = M.stage[who] || 'stranger';
    if (st === was) continue;
    M.stage[who] = st;
    fact(L, 'heart', { what: st, ...(st === 'over' ? { why: heart(L, who).over.why } : {}) }, [who]);
    const n = { id: who, type: 'stage', stage: st, was, why: st === 'over' ? heart(L, who).over.why : null };
    M.news.push(n); if (M.news.length > 12) M.news.shift(); out.push(n);
  }
  return out;
}
export const takeNews = (L) => (L.flags.hearts && L.flags.hearts._ && L.flags.hearts._.news ? L.flags.hearts._.news.splice(0) : []);
// a call's answer was chosen (main.js: the phone's 'call-choice')
export function romanceCallChoice(L, from, choice) { if (CAST[from] && choice && choice.fx) applyFx(L, from, choice.fx); }

// ---- he asks to see her ----
function nextDate(L, who) {
  const P = CAST[who], day = L.clock.day;
  for (const [id, d] of Object.entries(P.dates)) {
    if (!d.hm || invOf(L, id) || done(L, d.scene || id)) continue;
    if ((d.needs && !done(L, d.needs)) || day < d.days[0] || day > d.days[1]) continue;
    return { id, def: d, at: d.tomorrow ? D(day + 1, d.hm[0], d.hm[1]) : tonightOr(L, d.hm[0], d.hm[1], 60) };
  }
  return null;
}
// -> { result: 'yes' | 'busy' | 'mood' | 'away' | 'later' | 'gone', invite? }
export function askToMeet(L, who) {
  const P = CAST[who]; if (!P || !inLife(L, who)) return { result: 'gone' };
  post(L, who, { from: 'me', kind: 'text', text: t(LINES.ask.zh, LINES.ask.en) }, { notify: false });
  const slot = slotOf(L, who);
  let result = askResult(L, who, slot);
  contact(L, who, { his: true });
  if (result === 'yes' && slot.abroad) result = 'later';
  const d = result === 'yes' ? nextDate(L, who) : null;
  if (result === 'yes' && !d) result = 'later';
  later(L, who, P.lines[result] || P.lines.later);
  if (result !== 'yes') return { result };
  const inv = askOut(L, who, d.id, d.def, d.at, { by: 'him' });
  if (inv) { answerInvite(L, inv.id, true); inv.hx = 'a'; answered(L, who); }
  return { result, invite: inv };
}

// ---- the rest of the game tells them something happened ----
// id: one of them, or null for everyone in his life. type:
//   'met'            another system introduced her (the office: Zhiwei)
//   'saw-fight'      she saw him fight        'heard-fight'   she heard about it
//   'credit-taken'   he took the credit for her work     'credit-shared'   he gave her her share
//   'covered-for'    he covered for her       'stood-up'      he didn't turn up to something of hers
//   'career-change'  data.track: 'resigned' | 'laidoff' | 'startup' | 'family' | 'switched'
//   'posted-online'  data: { by, couple, bad }: something with him in it is online
//   'promoted'       he was promoted          'hurt'          he's visibly hurt
//   'car-hit'        data: { level 0-3 }: he knocked someone down in the car (world/roadFallout.js)
// -> what each of them did about it
const FEEL = {
  'saw-fight': { zhiwei: [-1, -6], nanxing: [2, -3], gunian: [-4, -10], yuan: [0, -5], kexin: [-1, -4] },     // [attraction, trust]
  'heard-fight': { zhiwei: [0, -3], nanxing: [1, -1], gunian: [-2, -5], yuan: [0, -2], kexin: [0, -2] },
  'car-hit': { zhiwei: [-2, -6], nanxing: [-1, -4], gunian: [-4, -10], yuan: [-1, -5], kexin: [-2, -4] },
  career: { zhiwei: { resigned: [2, 0], startup: [3, 0], laidoff: [0, 3], family: [-3, 0], switched: [1, -2] }, nanxing: { startup: [4, 0], resigned: [2, 0] }, gunian: { family: [0, -2], startup: [1, 2] }, yuan: { laidoff: [0, 4], startup: [2, 0] }, kexin: { startup: [2, 0] } },
};
// he knocked someone down in the car (world/roadFallout.js): 'heard' (no video), 'seen' (a video going
// round), 'trending' (only Kexin says something different: it's her world)
const CAR = {
  zhiwei: { heard: B('听说你的车在外滩被拖走了，还有人受了伤？……你先把这事处理干净。', "I hear your car was towed off the Bund, and someone was hurt? ...Deal with it properly first."),
    seen: B('视频我看了。斑马线，科尔维纳，外滩。你知道这三个词放一起客户会怎么想吗？人没事就好。别再那样开车。', "I watched the video. A zebra crossing, a Corvina, the Bund. Do you know what a client makes of those three together? I'm glad they're all right. Don't drive like that again.") },
  nanxing: { heard: B('听说你开车撞了人。我以前跑社会新闻，这种事见多了，从没想过会是你。', "I hear you hit someone with the car. I used to cover local news; I've seen plenty of these. I never thought it would be you."),
    seen: B('那条视频我看了三遍。拍的人手很稳，你不太稳。被你撞的那个人还好吗？', "I watched that video three times. Whoever shot it had a steady hand. You didn't. Is the person you hit all right?") },
  gunian: { heard: B('明轩说你开车撞了人。人没事吧？我想听你自己说。', "Mingxuan says you hit someone with the car. Are they all right? I'd like to hear it from you."),
    seen: B('我看到视频了。先问一句：那个人怎么样了？……你是怎么想的，在外滩开那么快。', 'I saw the video. First: how is the person? ...What were you thinking, driving that fast on the Bund?') },
  yuan: { heard: B('听说你车出事了？撞到人了？你给我打个电话。', 'I hear something happened with the car? You hit someone? Call me.'),
    seen: B('纪白。视频都传到我们所的群里了。你没事吧？那个行人呢？你在湾区连黄灯都不抢的。', "Ji Bai. The video's reached our office chat. Are you all right? And the pedestrian? In the Bay Area you wouldn't even run an amber light.") },
  kexin: { heard: B('听说你在外滩撞了人？还好没人拍，不然你就火了。', "I hear you hit someone on the Bund? Lucky nobody filmed it, or you'd be famous."),
    seen: B('有人在小红书发了你的车和斑马线，还没火。我认识几个号，能压就压。但你得保证没有第二次。', "Someone posted your car and the zebra crossing on Xiaohongshu. It hasn't taken off yet. I know a few accounts; I'll keep it down if I can. But promise me there won't be a second time."),
    trending: B('你上热搜了，不是好的那种。“外滩科尔维纳撞人”。别发声明，别删评论。先去看看那个人，带点东西。拍不拍随你。', "You're trending, and not the good way. 'Corvina hits pedestrian on the Bund'. No statement, don't delete comments. Go and see the person first, take something. Whether you film it is up to you.") },
};
for (const who of Object.keys(CAR)) for (const l of Object.values(CAR[who])) t(l.zh, l.en);
export function romanceEvent(L, id, type, data = {}) {
  if (!isYear(L)) return [];
  const out = [], f = (who, d, why) => feel(L, who, { attraction: d[0], trust: d[1] }, why);
  const tell = (who, line, replies = null) => say(L, who, line.zh, line.en, replies);
  if (type === 'met') { if (CAST[id] && heart(L, id).stage === 'stranger') { meet(L, id); openThread(L, id, CAST[id].name.zh); out.push({ id, type }); } return out; }
  const ids = (id && CAST[id] ? [id] : ROMANCE).filter((w) => inLife(L, w));
  for (const who of ids) {
    const P = CAST[who], lines = P.lines;
    if (type === 'saw-fight' || type === 'heard-fight') { f(who, FEEL[type][who], type); remember(L, who, type); tell(who, type === 'saw-fight' ? lines.fight : lines.heard); }
    else if (type === 'credit-taken') { f(who, [-4, -12], type); heart(L, who).mood = 'hurt'; remember(L, who, 'he-took-credit'); tell(who, LINES.creditTaken); }
    else if (type === 'credit-shared') { f(who, [3, 8], type); remember(L, who, 'shared-credit'); tell(who, LINES.creditShared); }
    else if (type === 'covered-for') { f(who, [2, 8], type); remember(L, who, 'covered-for'); tell(who, LINES.covered); }
    else if (type === 'stood-up') { remember(L, who, 'stood-up'); voice(L, ignored(L, who, 'stood-up'), out, lines.stood); }
    else if (type === 'career-change') { const d = (FEEL.career[who] || {})[data.track]; if (d) f(who, d, `career:${data.track}`); if (who === 'zhiwei' && data.track !== 'consulting') heart(L, who).said.free = stamp(L); if (lines.career[data.track]) tell(who, lines.career[data.track]); }
    else if (type === 'promoted') { if (who === 'zhiwei') { f(who, [1, -2], type); tell(who, LINES.promoted); } }
    else if (type === 'hurt') { f(who, [0, 1], type); tell(who, lines.hurt); }
    else if (type === 'car-hit') {                                      // data: { level 0-3 } (engine/roadIncident.js virality)
      const lv = data.level || 0, base = FEEL['car-hit'][who];
      f(who, [base[0] - (lv >= 2 ? 1 : 0), base[1] - (lv >= 2 ? 2 : 0)], type); remember(L, who, lv ? 'car-hit-seen' : 'car-hit');
      const c = CAR[who]; tell(who, lv >= 2 && c.trending ? c.trending : lv ? c.seen : c.heard);
    }
    else if (type === 'posted-online') {
      if (data.by === who) continue;                                    // her own post: she knows
      if (data.by === 'kexin' && data.couple && isSeeing(L, who)) { voice(L, foundOut(L, who, 'online'), out); continue; }
      if (data.by === 'kexin' && !data.couple) continue;                // two seconds of a stranger in someone's vlog: nobody notices
      remember(L, who, 'seen-online'); if (data.bad) f(who, [0, -2], type); tell(who, lines.online);
    }
    out.push({ id: who, type });
  }
  if (type === 'posted-online' && !data.own) rep(L, 'online', data.bad ? -4 : 2, 'posted');
  return out;
}

// ---- what free conversation is told (and nothing it says changes anything) ----
const STAGE_EN = {
  known: 'You know each other. Nothing romantic has been said or done between you.',
  close: 'You have grown close. There is something between you that neither of you has put into words. You are not a couple.',
  dating: 'You are seeing each other. It is recent and not yet settled.',
  together: 'You are a couple.',
};
const WHY_EN = { faded: 'you lost touch: he stopped answering and you stopped writing', left: 'you ended it because he kept disappearing on you', 'stood-up': 'he stood you up twice and you ended it', 'two-timed': 'you found out he was seeing someone else and you ended it', ended: 'he ended it', residency: 'you stayed abroad on your residency and told him not to wait', moved: 'you moved away for work', returned: 'you went back to San Francisco' };
const FACT_EN = { date: (f) => `you spent time together (${f.what})`, night: () => 'you spent a night together', 'stood-up': () => 'he did not turn up to something you had arranged', 'covered-for': (f) => `he covered for you (${f.what || 'at work'})`, 'credit-shared': (f) => `he made sure you both had credit (${f.what || 'at work'})`, 'posted-online': (f) => `online: ${f.what || 'a post with him in it'}` };
const bucket = (v, words) => words[v >= 70 ? 3 : v >= 50 ? 2 : v >= 30 ? 1 : 0];
export function romanceContext(L, who) {
  const P = CAST[who]; if (!P || !isYear(L)) return '';
  const h = heart(L, who), slot = slotOf(L, who), a = actOf(L), s = [];
  if (h.stage === 'stranger') return 'You have never met this man: he is a stranger to you, and you know nothing about him.';
  s.push(`How you know him: ${P.how}`);
  if (h.stage === 'over') s.push(`It is over between you: ${WHY_EN[(h.over || {}).why] || 'it ended'}. You are civil and brief with him, and you do not reopen it.`);
  else {
    s.push(`Where things stand: ${STAGE_EN[h.stage]}`);
    s.push(`You are ${bucket(h.attraction, ['not drawn to him', 'a little curious about him', 'drawn to him', 'strongly drawn to him'])}, and you ${bucket(h.trust, ['do not trust him yet', 'are unsure how far to trust him', 'trust him', 'trust him deeply'])}.`);
    const said = h.said || {};
    if (said.friends) s.push('He has told you he would rather stay friends, and you accepted that.');
    else if (said.slow && h.stage !== 'together') s.push('He asked to take it slowly, and you agreed.');
    if (h.quiet != null) s.push('He has left your messages unanswered, so you have stopped writing first. If he writes now you answer, coolly.');
    if (h.mood === 'hurt') s.push('You are hurt by something he did and it shows.');
    if (h.rift) s.push('You have found out he is seeing someone else, you have asked him about it, and you are waiting for his answer. You will not talk about anything else until he gives it.');
    if (h.open) s.push('You know he sees someone else as well. You have told him you will not commit to him.');
    if (seeing(L).length > 1 && !h.knows) s.push('(You do not know that he is seeing anyone else.)');
  }
  s.push(`Right now you are ${slot.doing.en}.`);
  const arc = a && (typeof P.arc[a.n] === 'function' ? P.arc[a.n](L) : P.arc[a.n]);   // an arc can depend on what has happened (Gu Nian, act II)
  if (arc) s.push(`Your own life at the moment: ${arc.en}`);
  const mem = h.memories.map((m) => memoryText(who, m.key)).filter(Boolean).map((b, i) => `(${i + 1}) ${b.en}`);
  s.push(mem.length ? `Everything that has actually happened between you and him: ${mem.join(' ')}` : 'Nothing in particular has happened between you yet.');
  const facts = factsAbout(L, who).filter((f) => FACT_EN[f.type]).slice(-6).map((f) => FACT_EN[f.type](f));
  if (facts.length) s.push(`On record: ${[...new Set(facts)].join('; ')}.`);
  const ahead = datesAhead(L).filter((d) => d.who === who).map((d) => `${d.title.en} at ${clockOf(d.at)} on day ${Math.floor(d.at / 1440)} of his calendar (today is day ${L.clock.day})`);
  if (ahead.length) s.push(`You have arranged to meet him: ${ahead.join('; ')}.`);
  return s.join(' ');
}
export const TALK_RULES = 'Strict rules for this conversation: you may refer ONLY to the memories and facts listed above. Do not claim, describe or hint at any other shared event: no other meetings, dates, kisses, nights, gifts, trips, promises or earlier conversations. If he mentions something that is not listed, you do not remember it that way: say so lightly or ask what he means. Nothing can be decided here: you cannot agree to become a couple, break up, forgive him, or fix a time and place to meet in this conversation; if he pushes, say you would rather talk about it when you see each other. Keep to where things stand above, however he phrases it.';
export function romancePrompt(L, who) {
  const c = romanceContext(L, who); if (!c) return '';
  return `${c} About his life: ${lifeContext(L)}\n${TALK_RULES}`;
}
// without a model (or when she can't be reached): something she'd say, by how things stand
export function cannedHeart(L, who, lang = 'zh', rnd = Math.random) {
  const P = CAST[who], h = heart(L, who), slot = slotOf(L, who), pick = (b) => (lang === 'zh' ? b.zh : b.en);
  if (h.stage === 'over') return pick(LINES.gone);
  if (slot.away) return pick(P.lines.away);
  if (h.mood === 'hurt' || h.rift) return pick(P.lines.mood);
  const list = P.lines.canned[lang === 'zh' ? 'zh' : 'en'];
  return list[Math.floor(rnd() * list.length)];
}
// Wraps the model (engine/llm.js) so that whenever one of the five is being played, the prompt
// carries the authoritative state and the rules; with no model, or when she can't be reached or it
// is over, she says one of her own lines. The reply is only ever text: nothing here writes state.
export function guardTalk(llm, getLife, getLang = () => 'zh') {
  const chat0 = llm.chat.bind(llm);
  llm.chat = async (messages, opts = {}) => {
    const who = opts.ctx && opts.ctx.persona, L = getLife && getLife();
    if (!L || !CAST[who] || !isYear(L)) return chat0(messages, opts);
    await llm.ready();
    const said = (opts.ctx && opts.ctx.said) || '', lang = said ? (/[一-鿿]/.test(said) ? 'zh' : 'en') : getLang();
    const h = heart(L, who), slot = slotOf(L, who);
    if (llm.backend === 'canned' || h.stage === 'over' || slot.away) { const tx = cannedHeart(L, who, lang); if (opts.onToken) opts.onToken(tx); return tx; }
    const tidy = (m) => (m.role === 'user' && /^[（(](你们之前聊过|You've talked before)/.test(m.content) ? { ...m, content: m.content.replace(/我：[^/）)]*(\s*\/\s*)?/g, '') } : m);   // earlier free talk: keep what he said, not what the model made up
    const extra = romancePrompt(L, who);
    const msgs = messages[0] && messages[0].role === 'system' ? [{ ...messages[0], content: `${messages[0].content}\n${extra}` }, ...messages.slice(1).map(tidy)] : [{ role: 'system', content: extra }, ...messages.map(tidy)];
    return chat0(msgs, opts);
  };
  return llm;
}

// ---- for the journal and the phone ----
const STAGE_WORD = { stranger: B('还不认识', 'Not met'), known: B('认识', 'Acquainted'), close: B('走得近', 'Close'), dating: B('在约会', 'Seeing each other'), together: B('在一起', 'Together') };
const OVER_WORD = { faded: B('断了联系', 'Lost touch'), left: B('她离开了', 'She left'), 'stood-up': B('你两次没到，她走了', 'Stood up twice: she left'), 'two-timed': B('她知道了，走了', 'She found out, and left'), ended: B('你结束了', 'You ended it'), residency: B('她留在了里斯本', 'She stayed in Lisbon'), moved: B('她搬走了', 'She moved away'), returned: B('她回了旧金山', 'She went back to San Francisco') };
export function romanceStanding(L, who) {
  const P = CAST[who];
  if (!isYear(L)) return { id: who, name: P.name, role: P.role, met: false, over: false, stage: STAGE_WORD.stranger, line: null, now: null };
  const h = heart(L, who), st = standingOf(L, who);
  const stage = h.stage === 'over' ? (OVER_WORD[(h.over || {}).why] || B('结束了', 'Over')) : STAGE_WORD[h.stage];
  const ahead = datesAhead(L).find((d) => d.who === who), last = h.memories.length ? memoryText(who, h.memories[h.memories.length - 1].key) : null;
  const line = h.stage === 'over' ? last : h.rift ? B('她在等你一个答复。', 'She is waiting for your answer.') : h.quiet != null ? B('她不再先找你了。', 'She has stopped writing first.')
    : ahead ? B(`约好了：${ahead.title.zh} · ${clockOf(ahead.at)}`, `Arranged: ${ahead.title.en} · ${clockOf(ahead.at)}`) : last;
  return { id: who, name: P.name, role: P.role, ambition: P.ambition, met: h.stage !== 'stranger', over: h.stage === 'over', stage, line, now: h.stage === 'over' || h.stage === 'stranger' ? null : slotOf(L, who).doing, attraction: st.attraction, trust: st.trust, mood: st.mood };
}
// what the ending adds about them: the one he's with, or the one he lost
export function romanceEpilogue(L) {
  if (!isYear(L) || !L.flags.hearts) return null;
  const rank = (h) => (h.stage === 'together' ? 0 : h.stage === 'dating' ? 1 : h.stage === 'over' && h.over && ['dating', 'together'].includes(h.over.was) ? 2 : 3);
  const parts = ROMANCE.map((id) => [id, heart(L, id)]).filter(([, h]) => h.stage !== 'stranger').sort((a, b) => rank(a[1]) - rank(b[1]))
    .map(([id, h]) => CAST[id].epilogue(L, h)).filter(Boolean).slice(0, 2);
  return parts.length ? B(parts.map((p) => p.zh).join(''), parts.map((p) => p.en).join(' ')) : null;
}
export { hearts, recalls };
