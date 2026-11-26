// What the friends do on their own: story beats keyed to the clock, background chatter, and
// reactions to what you do. Content (spoken WeChat Mandarin) plus small rules; the bookkeeping is
// engine/life.js. Each beat fires once. Replies the player can tap are offered per message.
import { post, invite, thread, stamp, nudge, relation, emit, answerInvite } from '../engine/life.js';
import { maker, addParts, gainFollowers } from '../engine/maker.js';
import { GROUP, PEOPLE } from './cast.js';
import { armRoute } from './destScripts.js';

const D = (day, h, m = 0) => day * 1440 + h * 60 + m;           // absolute minute

export function setupThreads(L) {
  thread(L, GROUP.id, { title: GROUP.title, members: GROUP.members, kind: 'group' });
  for (const id of ['yuan', 'xuan', 'zhixia', 'momo', 'yinuo', 'dad']) thread(L, id, { title: PEOPLE[id].name, members: ['me', id], kind: 'person' });
  // a little history so the chats don't start empty
  for (const [t, from, text] of [
    ['wuhu', 'zhixia', '下周谁有空，天马跑两圈'], ['wuhu', 'xuan', '我周末要飞深圳'], ['wuhu', 'momo', '[视频]'],
    ['dad', 'dad', '落地了说一声。'], ['yuan', 'yuan', '航班号发我一下'], ['yuan', 'me', 'UA857，下午三点多到浦东'],
  ]) { const m = post(L, t, { from, kind: 'text', text }, { notify: false }); m.at -= 600; m.read = true; }
  for (const t of Object.values(L.threads)) t.unread = 0;
  addVoicemail(L);
  L.flags.t0 = stamp(L);
}
// Old Zhou's voicemail, the one that brought you to the Bund: nine seconds, mostly river wind. Nobody
// has recorded his voice, so the phone plays the wind and shows the words (ui/phone/media.js).
// atEnd: an older save gets it at the bottom of the chats instead of the top.
export function addVoicemail(L, { atEnd = false } = {}) {
  if (L.threads.zhou) return null;
  thread(L, 'zhou', { title: PEOPLE.zhou.name, members: ['me', 'zhou'], kind: 'person' });
  const m = post(L, 'zhou', { from: 'zhou', kind: 'voice', text: '到外滩来。海关钟下面……', meta: { voicemail: true, secs: 9, ambience: 'wind' } }, { notify: false });
  m.at = 18 * 60 + 3; m.read = true; L.threads.zhou.unread = 0;   // the evening of 29 October, before he vanished
  if (atEnd) L.order = [...L.order.filter((x) => x !== 'zhou'), 'zhou'];
  return m;
}

// beats: { id, at (minutes after t0) or when (an absolute minute, or (L) => one), run(L) }
// The first evening is kept to one path (the river, Old Lin's pouch, the Peace Hotel, Momo's set): on day one
// only Momo's gig, Yu'an's hello and Dad's call (at the railing) reach the phone; the rest waits for Tuesday.
const gigKept = (L) => !!(L.invites.find((i) => i.id === 'momo-gig') || {}).kept;
const BEATS = [
  { id: 'g1', at: 1.5, run: (L) => post(L, 'wuhu', { from: 'momo', kind: 'text', text: '白白落地了没？？' }) },
  { id: 'g2', at: 2.4, run: (L) => post(L, 'wuhu', { from: 'xuan', kind: 'text', text: '下午就到了，我让他先去外滩吹吹风，倒倒时差' }) },
  { id: 'g3', at: 3.2, run: (L) => {
    post(L, 'wuhu', { from: 'momo', kind: 'text', text: '吹啥风，晚上来和平饭店听我们弹琴😎' });
    invite(L, { id: 'momo-gig', from: 'momo', thread: 'wuhu', title: '和平饭店爵士吧 · Momo trio', place: '和平饭店 · 爵士吧', at: D(1, 20, 0), deadline: D(1, 19, 40),
      text: '今晚八点，和平饭店爵士吧，给你留位置', onAccept: 6, onDecline: -2, onMiss: -6,
      yesText: '来，给我留个靠前的位置', noText: '今晚倒时差，下次一定' });
  } },
  { id: 'r1', at: 5, run: (L) => post(L, 'yuan', { from: 'yuan', kind: 'text', text: '到了吗？外滩风大，你那件薄外套不够的。', replies: [
    { text: '到了，确实冷。在海关大楼这边。', delta: 2, follow: '海关大楼？那正好，钟楼刚修完，你抬头看看。' },
    { text: '还行，不冷。', delta: 0, follow: '嘴硬。' },
  ] }) },
  { id: 'z1', when: D(2, 12, 30), run: (L) => post(L, 'zhixia', { from: 'zhixia', kind: 'voice', text: '喂，纪白，听说你硅谷那家公司的股票套现了？……别装，予安都跟我说了。周末来不来天马，带你跑两圈。还有——真的，你该换台车了，那台二手 Model 3 你还开着呢？', replies: [
    { text: '周末可以，车的事再说。', delta: 3, follow: '再说就是想。我认识保时捷浦东的一个顾问，人靠谱，回头推给你。', flag: 'carCurious' },
    { text: 'Model 3 挺好的。', delta: -1, follow: '……行，你开心就好。' },
  ] }) },
  // Mingxuan writes once Momo's set is over (he was in the group chat watching), or first thing on Tuesday
  { id: 'x1', when: (L) => (gigKept(L) ? stamp(L) : D(2, 8, 0)), run: (L) => {
    post(L, 'xuan', { from: 'xuan', kind: 'text', text: '说正事。有个做机械臂的团队，创始人是我学长，产品经理跑了，原型卡住了。' });
    invite(L, { id: 'xuan-arm', from: 'xuan', thread: 'xuan', title: '机械臂团队 · 原型评审', place: '陆家嘴 IFC 二期 32F', at: D(2, 15, 0), deadline: D(2, 12, 0),
      text: L.clock.day >= 2 ? '今天下午三点陆家嘴，你过来帮我看看？' : '明天下午三点陆家嘴，你过来帮我看看？', onAccept: 6, onDecline: -3, onMiss: -5,
      yesText: '可以，把资料先发我', noText: '明天不行，有别的事' });
  } },
  // Dad rings when he's at the railing looking across (or ten minutes in, if he never goes)
  { id: 'd1', when: (L) => (L.flags.sawRiver ? stamp(L) : (L.flags.t0 ?? 0) + 40), run: (L) => emit(L, { type: 'call', from: 'dad', script: 'dad-arrival' }) },
  { id: 'y1', when: D(2, 19, 0), run: (L) => {
    post(L, 'yinuo', { from: 'yinuo', kind: 'text', text: '回国了也不说一声。' });
    invite(L, { id: 'yinuo-flat', from: 'yinuo', thread: 'yinuo', title: '北外滩 · 看房', place: '北外滩', at: D(3, 14, 0), deadline: D(2, 22, 0),
      text: '明天下午我在上海，家里让我看北外滩一套顶层，你学设计的，陪我去？', onAccept: 5, onDecline: -2, onMiss: -4,
      yesText: '好，地址发我', noText: '后天可能不行' });
  } },
];

// ---- the days after: each friend's own thread (when: a time on the calendar; if: only if) ----
const said = (L, key, flag) => (L.flags[`${key}Said`] || []).includes(flag);
BEATS.push(
  // Yu'an: on the job inside the Bund's old buildings; she gets you past the AIA's gates
  { id: 'r2', when: D(2, 10, 30), run: (L) => post(L, 'yuan', { from: 'yuan', kind: 'text', text: '今天在和平饭店顶层测绘，屋顶的铜皮比图纸上老三十年。你那个612住得惯吗？', replies: [
    { text: '住得惯，窗外就是江。', delta: 1, follow: '那是我们去年修的窗框。不客气。' },
    { text: '你在楼上？我下来请你喝咖啡。', delta: 3, follow: '今天没空。改天，你欠我一杯。' },
  ] }) },
  { id: 'r3', when: D(3, 19, 0), run: (L) => {
    post(L, 'yuan', { from: 'yuan', kind: 'text', text: '明晚来友邦大楼？我们在修大堂的天花，我带你进闸机里面看看，平时谁都进不去。' });
    invite(L, { id: 'yuan-aia', from: 'yuan', thread: 'yuan', title: '友邦大楼 · 大堂天花', place: '友邦大楼（外滩17号）', at: D(4, 19, 0), deadline: D(4, 17, 0),
      text: '明晚七点，友邦大楼大堂，我在闸机那儿等你。', onAccept: 4, onDecline: -2, onMiss: -3, yesText: '好，七点见', noText: '明晚不行' });
  } },
  // Zhixia: a race-telemetry logger for her car; the parts come to the makerspace; then Tianma
  { id: 'z2', when: D(2, 21, 0), run: (L) => post(L, 'zhixia', { from: 'zhixia', kind: 'voice', text: '白白，帮个忙。我想给赛车做个数据记录仪：CAN总线读转速和刹车压力，GPS记圈速，再加个陀螺仪看G值。你会做吧？零件我出，送到你那个创客空间。', replies: [
    { text: '会。零件寄过来吧。', delta: 4, flag: 'telemetryYes', follow: '就知道你行。闪送已经在路上了，杨浦那个空间对吧？' },
    { text: '最近有点忙……', delta: -2, follow: '行吧，大忙人。' },
  ] }) },
  { id: 'z3', when: D(2, 22, 0), if: (L) => L.flags.telemetryYes, run: (L) => { addParts(L, { esp32: 1, gps: 1, imu: 1, canbus: 1 }); post(L, 'zhixia', { from: 'zhixia', kind: 'text', text: '零件到了，阿凯签收的。图纸在你工作台上（要创客2级才看得懂，哈哈）。' }); } },
  { id: 'z4', when: D(3, 9, 0), if: (L) => maker(L).gadgets.telemetry, run: (L) => {
    post(L, 'zhixia', { from: 'zhixia', kind: 'text', text: '记录仪我装上了！数据太干净了。这周六天马跑一天，你来，开你的车。' });
    invite(L, { id: 'zhixia-track', from: 'zhixia', thread: 'zhixia', title: '天马赛车场 · 赛道日', place: '天马赛车场', at: D(6, 10, 0), deadline: D(5, 22, 0), text: '周六早上十点，天马。', onAccept: 5, onDecline: -3, onMiss: -4, yesText: '去！', noText: '这周不行' });
  } },
  { id: 'z4b', when: D(5, 9, 0), if: (L) => L.flags.telemetryYes && maker(L).gadgets.telemetry && !L.fired.z4, run: (L) => {
    post(L, 'zhixia', { from: 'zhixia', kind: 'text', text: '记录仪我装上了！这周六天马，你来。' });
    invite(L, { id: 'zhixia-track', from: 'zhixia', thread: 'zhixia', title: '天马赛车场 · 赛道日', place: '天马赛车场', at: D(6, 10, 0), deadline: D(5, 22, 0), text: '周六早上十点，天马。', onAccept: 5, onDecline: -3, onMiss: -4, yesText: '去！', noText: '这周不行' });
  } },
  // Momo: no bed tonight; and the video of your car
  { id: 'm2', when: D(2, 23, 30), run: (L) => post(L, 'momo', { from: 'momo', kind: 'text', text: '白白！！你房间几号？我今晚被房东锁门外了……就睡一晚沙发，明早就走，发誓', replies: [
    { text: '612，上来吧。前台我打招呼。', delta: 5, flag: 'momoCrash', follow: '你是我亲哥！！马上到' },
    { text: '自己找个酒店。', delta: -4, follow: '……行，冷漠的资本家' },
  ] }) },
  { id: 'm3', when: D(3, 10, 0), if: (L) => L.flags.momoCrash, run: (L) => post(L, 'momo', { from: 'momo', kind: 'text', text: '谢了兄弟🙏 你的充电器我先借走了，下次还你（大概）' }) },
  { id: 'm4', when: D(4, 12, 0), if: (L) => !!L.flags.car, run: (L) => {
    const a = gainFollowers(L, 3200);
    post(L, 'wuhu', { from: 'momo', kind: 'text', text: '我发了个视频：白白的车在外滩，配了我的钢琴。一晚上80万播放🔥 你多了好几千粉丝，不用谢' });
    if (a) L.flags.pendingAchievement = a;
  } },
  // Xuan: the demo, if you said you'd advise
  { id: 'x2', when: D(3, 10, 0), if: (L) => said(L, 'lujiazui', 'advisor'), run: (L) => {
    post(L, 'xuan', { from: 'xuan', kind: 'text', text: armRoute(L).code ? '周五客户和投资人都来看演示。学长说今天的主角是你那个模型，你来压个场？' : '学长说换了指垫以后一个都没掉！周五客户和投资人都来看演示，你来压个场？' });
    invite(L, { id: 'xuan-demo', from: 'xuan', thread: 'xuan', title: '机械臂演示日', place: '陆家嘴 IFC 二期 32F', at: D(5, 15, 0), deadline: D(5, 12, 0), text: '周五下午三点，IFC 32楼。', onAccept: 5, onDecline: -2, onMiss: -5, yesText: '去', noText: '周五有事' });
  } },
  { id: 'x2b', when: D(3, 10, 0), if: (L) => !said(L, 'lujiazui', 'advisor') && L.invites.some((i) => i.id === 'xuan-arm' && i.kept), run: (L) => post(L, 'xuan', { from: 'xuan', kind: 'text', text: '上次谢了。学长说你那句话点醒他了。顾问的事你再想想？' }) },
  { id: 'x3', when: D(6, 20, 0), run: (L) => post(L, 'xuan', { from: 'xuan', kind: 'text', text: '有个做硬件的投资人想认识你，说看过你在硅谷做的产品。下周一起吃个饭？', replies: [
    { text: '可以，你约。', delta: 2, flag: 'investorMeet', follow: '好，我订个地方。别穿你那件工装外套。' },
    { text: '先不用，我想自己先做点东西。', delta: 0, follow: '有骨气。那等你做出来。' },
  ] }) },
  // Yinuo: what she decided; a flight over the Bund
  { id: 'y2', when: D(3, 22, 0), if: (L) => L.invites.some((i) => i.id === 'yinuo-flat' && i.kept), run: (L) => {
    const s2 = L.flags.northbundSaid || [];
    const text = s2.includes('own') ? '我跟家里说了，不买。我想先自己找个小地方住。……他们不太高兴。' : s2.includes('buy') ? '签了。家里很高兴。' : s2.includes('rent') ? '我在看武康路的老公寓了。程家的人租房子，我妈差点没晕过去。' : '我自己定了。';
    post(L, 'yinuo', { from: 'yinuo', kind: 'text', text });
  } },
  { id: 'y3', when: D(5, 21, 0), run: (L) => {
    post(L, 'yinuo', { from: 'yinuo', kind: 'text', text: '家里订了直升机，明晚飞外滩。我不想一个人去。' });
    invite(L, { id: 'yinuo-heli', from: 'yinuo', thread: 'yinuo', title: '夜航 · 外滩上空', place: '浦东直升机停机坪', at: D(6, 20, 0), deadline: D(6, 12, 0), text: '明晚八点，浦东停机坪。', onAccept: 5, onDecline: -2, onMiss: -4, yesText: '我陪你', noText: '明晚不行' });
  } },
  // home: Mum's voice note; Dad wants to know the plan
  { id: 'mu1', when: D(3, 8, 30), run: (L) => { thread(L, 'mum', { title: '妈', members: ['me', 'mum'], kind: 'person' });
    post(L, 'mum', { from: 'mum', kind: 'voice', text: L.flags.car ? '白白，妈妈看到你朋友圈了，那个车……你爸还不知道。你自己注意安全，按时吃饭。' : '白白，到上海好几天了，吃得惯吗？有空给你爸打个电话，他嘴上不说，天天问我你怎么样。' }); } },
  { id: 'd2', when: D(4, 20, 0), run: (L) => emit(L, { type: 'call', from: 'dad', script: 'dad-plans' }) },
);

// background chatter: who might say what, now and then (no story weight)
const CHATTER = [
  ['momo', '[视频] 今天排练的，这段solo我自己都想哭'], ['xuan', '开会开到现在，饭都没吃'], ['zhixia', '测试台又炸了一个电芯，没人受伤，就是心疼钱'],
  ['yuan', '有人知道海关大楼钟每天几点敲吗，甲方问我我也不知道😂'], ['momo', '谁有静安那家生煎的电话，排队排疯了'], ['yinuo', '刚落虹桥，雾好大'],
  ['xuan', '@纪白 你周末到底在不在上海'], ['zhixia', '周末天马下雨就取消，别问了'], ['momo', '[表情] 旺柴.gif'], ['yuan', '今天工地挖出来一块1920年代的地砖，开心一整天'],
];

export function runAgenda(L, rnd = Math.random) {
  const t0 = L.flags.t0 ?? stamp(L), since = stamp(L) - t0;
  for (const b of BEATS) {
    if (L.fired[b.id]) continue;
    const w = typeof b.when === 'function' ? b.when(L) : b.when;
    const due = w != null ? stamp(L) >= w && (!b.until || stamp(L) <= b.until) : since >= b.at;
    if (due && (!b.if || b.if(L))) { L.fired[b.id] = stamp(L); b.run(L); }
  }
  // chatter: one line every ~25-45 game minutes, from Tuesday (the first evening has enough on it)
  if (since > 20 && L.clock.day >= 2) {
    L.flags.nextChat ??= stamp(L) + 25 + Math.floor(rnd() * 20);
    if (stamp(L) >= L.flags.nextChat) {
      const used = new Set(L.flags.chatUsed || []);
      const pool = CHATTER.map((c, i) => i).filter((i) => !used.has(i));
      if (pool.length) { const i = pool[Math.floor(rnd() * pool.length)]; used.add(i); L.flags.chatUsed = [...used]; post(L, 'wuhu', { from: CHATTER[i][0], kind: 'text', text: CHATTER[i][1] }); }
      L.flags.nextChat = stamp(L) + 25 + Math.floor(rnd() * 20);
    }
  }
}

// the player tapped a quick reply on a message
export function reply(L, threadId, msgId, choiceIdx) {
  const t = L.threads[threadId]; const m = t && t.messages.find((x) => x.id === msgId);
  if (!m || !m.replies || m.replied != null) return null;
  const c = m.replies[choiceIdx]; m.replied = choiceIdx;
  post(L, threadId, { from: 'me', kind: 'text', text: c.text }, { notify: false });
  if (c.delta) nudge(L, m.from, c.delta, `reply:${m.id}`);
  if (c.flag) L.flags[c.flag] = true;
  if (c.follow) (L.flags.pendingFollow ||= []).push({ at: stamp(L) + 1, thread: threadId, from: m.from, text: c.follow });
  return c;
}

// things the friends react to (events from the game or from answering invitations)
export function react(L, ev) {
  if (ev.type === 'invite') {
    const lines = {
      'momo-gig': { accepted: '好！门口报我名字就行，带你认识下我们鼓手', declined: '行吧……下次啊，下次不来就绝交', missed: '昨晚说好的呢？？位置给你留到十点' },
      'xuan-arm': { accepted: '资料晚点发你，NDA 先签一下哈', declined: '好吧，那我先自己去', missed: '昨天下午人呢？学长还问起你' },
      'yinuo-flat': { accepted: '嗯。我把地址和时间发你。', declined: '好。', missed: '我自己去看了。' },
    }[ev.id];
    if (lines && lines[ev.status]) (L.flags.pendingFollow ||= []).push({ at: stamp(L) + (ev.status === 'missed' ? 0 : 1), thread: ev.thread || ev.from, from: ev.from, text: lines[ev.status] });
  }
  if (ev.type === 'paid' && ev.to === 'Linger' && !L.flags.firstManner) {
    L.flags.firstManner = true;
    (L.flags.pendingFollow ||= []).push({ at: stamp(L) + 3, thread: 'yuan', from: 'yuan', text: '你是不是在汉口路那家Linger？我们工地的人天天去，燕麦拿铁不错。' });
  }
  if (ev.type === 'call-declined') (L.flags.pendingFollow ||= []).push({ at: stamp(L) + 2, thread: ev.from, from: ev.from, text: ev.from === 'dad' ? '怎么不接电话？' : '在忙？' });
}

// follow-ups queued by replies and reactions, delivered when due
export function deliverFollowUps(L) {
  const due = (L.flags.pendingFollow || []).filter((f) => f.at <= stamp(L));
  L.flags.pendingFollow = (L.flags.pendingFollow || []).filter((f) => f.at > stamp(L));
  for (const f of due) post(L, f.thread, { from: f.from, kind: 'text', text: f.text });
  return due.length;
}

// answer an invitation and let the friend respond
export function respondToInvite(L, id, yes) {
  const inv = answerInvite(L, id, yes);
  if (inv) react(L, { type: 'invite', id, status: inv.status, from: inv.from, thread: inv.thread });
  return inv;
}

// how warm each friend is right now (for the phone's contact view)
export const warmth = (L, id) => relation(L, id).affinity;

// phone calls: scripted lines with optional replies
export const CALLS = {
  'dad-plans': { from: 'dad', lines: [
    { who: 'dad', text: '在忙吗？' },
    { who: 'me', choices: [{ text: '不忙，爸。', delta: 1 }, { text: '有点忙，你说。', delta: 0 }] },
    { who: 'dad', text: '厂里新上了一条线，做电驱的壳体。研发那层楼空着，我给你留着。' },
    { who: 'me', choices: [{ text: '我想在上海先做自己的工作室。', delta: -1, flag: 'toldDadStudio' }, { text: '过阵子回去看看。', delta: 2 }, { text: '我还在想。', delta: 0 }] },
    { who: 'dad', text: '……你自己的事，你自己想清楚。钱够不够？' },
    { who: 'me', choices: [{ text: '够。', delta: 1 }, { text: '在美国攒的还在。', delta: 0 }] },
    { who: 'dad', text: '嗯。你妈让你按时吃饭。挂了。' },
  ] },
  'dad-arrival': { from: 'dad', lines: [
    { who: 'dad', text: '到上海了？' },
    { who: 'me', choices: [{ text: '到了，在外滩。', delta: 1 }, { text: '嗯，到了。', delta: 0 }] },
    { who: 'dad', text: '住哪儿？' },
    { who: 'me', choices: [{ text: '先住和平饭店几天。', delta: -1, flag: 'toldDadHotel' }, { text: '朋友家。', delta: 0 }] },
    { who: 'dad', text: '……嗯。你妈让我问你吃饭了没有。' },
    { who: 'me', choices: [{ text: '吃了。', delta: 0 }, { text: '还没，等会儿吃。', delta: 0 }] },
    { who: 'dad', text: '钱的事你自己有数。你在美国攒的那点钱，别全扔在车上。有空回南京一趟，厂里的事我们当面谈。' },
    { who: 'me', choices: [{ text: '知道了，爸。', delta: 2 }, { text: '我在上海有自己的打算。', delta: -2, flag: 'toldDadPlans' }] },
    { who: 'dad', text: '行。挂了。' },
  ] },
};
