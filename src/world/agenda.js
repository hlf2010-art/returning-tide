// What the friends do on their own: story beats keyed to the clock, background chatter, and
// reactions to what you do. Content (spoken WeChat Mandarin) plus small rules; the bookkeeping is
// engine/life.js. Each beat fires once. Replies the player can tap are offered per message.
import { post, invite, thread, stamp, nudge, relation, emit, answerInvite } from '../engine/life.js';
import { GROUP, PEOPLE } from './cast.js';

const D = (day, h, m = 0) => day * 1440 + h * 60 + m;           // absolute minute

export function setupThreads(L) {
  thread(L, GROUP.id, { title: GROUP.title, members: GROUP.members, kind: 'group' });
  for (const id of ['ruoan', 'xuan', 'zhixia', 'momo', 'yinuo', 'dad']) thread(L, id, { title: PEOPLE[id].name, members: ['me', id], kind: 'person' });
  // a little history so the chats don't start empty
  for (const [t, from, text] of [
    ['wuhu', 'zhixia', '下周谁有空，天马跑两圈'], ['wuhu', 'xuan', '我周末要飞深圳'], ['wuhu', 'momo', '[视频]'],
    ['dad', 'dad', '落地了说一声。'], ['ruoan', 'ruoan', '航班号发我一下'], ['ruoan', 'me', 'UA857，下午三点多到浦东'],
  ]) { const m = post(L, t, { from, kind: 'text', text }, { notify: false }); m.at -= 600; m.read = true; }
  for (const t of Object.values(L.threads)) t.unread = 0;
  L.flags.t0 = stamp(L);
}

// beats: { id, at (minutes after t0) or when(L), run(L) }
const BEATS = [
  { id: 'g1', at: 1.5, run: (L) => post(L, 'wuhu', { from: 'momo', kind: 'text', text: '白白落地了没？？' }) },
  { id: 'g2', at: 2.4, run: (L) => post(L, 'wuhu', { from: 'xuan', kind: 'text', text: '下午就到了，我让他先去外滩吹吹风，倒倒时差' }) },
  { id: 'g3', at: 3.2, run: (L) => {
    post(L, 'wuhu', { from: 'momo', kind: 'text', text: '吹啥风，晚上来和平饭店听我们弹琴😎' });
    invite(L, { id: 'momo-gig', from: 'momo', thread: 'wuhu', title: '和平饭店爵士吧 · Momo trio', place: '和平饭店 · 爵士吧', at: D(1, 21, 30), deadline: D(1, 21, 0),
      text: '今晚九点半，和平饭店爵士吧，给你留位置', onAccept: 6, onDecline: -2, onMiss: -6,
      yesText: '来，给我留个靠前的位置', noText: '今晚倒时差，下次一定' });
  } },
  { id: 'r1', at: 5, run: (L) => post(L, 'ruoan', { from: 'ruoan', kind: 'text', text: '到了吗？外滩风大，你那件薄外套不够的。', replies: [
    { text: '到了，确实冷。在海关大楼这边。', delta: 2, follow: '海关大楼？那正好，钟楼刚修完，你抬头看看。' },
    { text: '还行，不冷。', delta: 0, follow: '嘴硬。' },
  ] }) },
  { id: 'z1', at: 7, run: (L) => post(L, 'zhixia', { from: 'zhixia', kind: 'voice', text: '喂，沈既白，听说你那个手套专利的钱到账了？……别装，若安都跟我说了。周末来不来天马，带你跑两圈。还有——真的，你该换台车了，那台二手 Model 3 你还开着呢？', replies: [
    { text: '周末可以，车的事再说。', delta: 3, follow: '再说就是想。我认识保时捷浦东的一个顾问，人靠谱，回头推给你。', flag: 'carCurious' },
    { text: 'Model 3 挺好的。', delta: -1, follow: '……行，你开心就好。' },
  ] }) },
  { id: 'x1', at: 10, run: (L) => {
    post(L, 'xuan', { from: 'xuan', kind: 'text', text: '说正事。有个做机械臂的团队，创始人是我学长，产品经理跑了，原型卡住了。' });
    invite(L, { id: 'xuan-arm', from: 'xuan', thread: 'xuan', title: '机械臂团队 · 原型评审', place: '陆家嘴 IFC 二期 32F', at: D(2, 15, 0), deadline: D(2, 12, 0),
      text: '明天下午三点陆家嘴，你过来帮我看看？', onAccept: 6, onDecline: -3, onMiss: -5,
      yesText: '可以，把资料先发我', noText: '明天不行，有别的事' });
  } },
  { id: 'd1', at: 13, run: (L) => emit(L, { type: 'call', from: 'dad', script: 'dad-arrival' }) },
  { id: 'y1', at: 17, run: (L) => {
    post(L, 'yinuo', { from: 'yinuo', kind: 'text', text: '回国了也不说一声。' });
    invite(L, { id: 'yinuo-flat', from: 'yinuo', thread: 'yinuo', title: '北外滩 · 看房', place: '北外滩', at: D(3, 14, 0), deadline: D(2, 22, 0),
      text: '后天下午我在上海，家里让我看北外滩一套顶层，你学设计的，陪我去？', onAccept: 5, onDecline: -2, onMiss: -4,
      yesText: '好，地址发我', noText: '后天可能不行' });
  } },
];

// background chatter: who might say what, now and then (no story weight)
const CHATTER = [
  ['momo', '[视频] 今天排练的，这段solo我自己都想哭'], ['xuan', '开会开到现在，饭都没吃'], ['zhixia', '测试台又炸了一个电芯，没人受伤，就是心疼钱'],
  ['ruoan', '有人知道海关大楼钟每天几点敲吗，甲方问我我也不知道😂'], ['momo', '谁有静安那家生煎的电话，排队排疯了'], ['yinuo', '刚落虹桥，雾好大'],
  ['xuan', '@沈既白 你周末到底在不在上海'], ['zhixia', '周末天马下雨就取消，别问了'], ['momo', '[表情] 旺柴.gif'], ['ruoan', '今天工地挖出来一块1920年代的地砖，开心一整天'],
];

export function runAgenda(L, rnd = Math.random) {
  const t0 = L.flags.t0 ?? stamp(L), since = stamp(L) - t0;
  for (const b of BEATS) if (!L.fired[b.id] && since >= b.at) { L.fired[b.id] = stamp(L); b.run(L); }
  // chatter: one line every ~25-45 game minutes once the beats have started
  if (since > 20) {
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
  if (ev.type === 'paid' && ev.to === 'Manner' && !L.flags.firstManner) {
    L.flags.firstManner = true;
    (L.flags.pendingFollow ||= []).push({ at: stamp(L) + 3, thread: 'ruoan', from: 'ruoan', text: '你是不是在汉口路那家Manner？我们工地的人天天去，燕麦拿铁不错。' });
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
  'dad-arrival': { from: 'dad', lines: [
    { who: 'dad', text: '到上海了？' },
    { who: 'me', choices: [{ text: '到了，在外滩。', delta: 1 }, { text: '嗯，到了。', delta: 0 }] },
    { who: 'dad', text: '住哪儿？' },
    { who: 'me', choices: [{ text: '先住和平饭店几天。', delta: -1, flag: 'toldDadHotel' }, { text: '朋友家。', delta: 0 }] },
    { who: 'dad', text: '……嗯。你妈让我问你吃饭了没有。' },
    { who: 'me', choices: [{ text: '吃了。', delta: 0 }, { text: '还没，等会儿吃。', delta: 0 }] },
    { who: 'dad', text: '钱的事你自己有数。专利那笔钱，别全扔在车上。有空回南京一趟，厂里的事我们当面谈。' },
    { who: 'me', choices: [{ text: '知道了，爸。', delta: 2 }, { text: '我在上海有自己的打算。', delta: -2, flag: 'toldDadPlans' }] },
    { who: 'dad', text: '行。挂了。' },
  ] },
};
