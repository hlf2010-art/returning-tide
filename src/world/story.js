// 回潮 Returning Tide: the main story and its quests (engine/quests.js runs them). Pure data and
// rules over life (L) and a context ({ player: {x, y, z} }), so the whole arc can be played in node.
//
// Ji Bai is back from the Bay Area with his savings and no plan he'll say out loud. His father
// wants him home in Nanjing to run R&D at the family's machining works. His friends pull him the
// other way: Mingxuan has a robot-arm team that needs him, Kai's makerspace has a bench for him.
// A new game is a year in five acts (engine/year.js); a game begun before the year existed keeps
// its six days. The quests here are numbered by the five acts either way:
//   Act I   新的开始  the first night on the Bund, Momo's set, the robot arm (Mingxuan, Zhou, the
//                     investor demo), Dad's offer; and, in a year, the first week at the firm
//   Act II-IV         the working year (world/careerStory.js: Donglan, the turning point, the road he takes)
//   Act V   最后的晚餐 dinner with Dad at the Peace Hotel's Jazz Bar (8 pm on the last day: Saturday
//                     13 November 2027, or day 6), then the river at the late-night lighting at ten,
//                     and one of six endings (what you chose, what you'd done, how he feels)
import { post, invite, stamp, nudge, relation, emit } from '../engine/life.js';
import { dinnerWork, dinnerAfter, workContext } from './work.js';
import { finalDay, isYear, lifeContext } from '../engine/year.js';
import { dayName } from './career.js';
import { YEAR_QUESTS, yearDinner, yearEnding, yearEpilogue, careerContext, COLLEAGUES } from './careerStory.js';

export const D = (day, h, m = 0) => day * 1440 + h * 60 + m;      // absolute minute
// the day of the dinner: the last day of the year (engine/year.js), or day 6 in a game begun before the year existed
const FD = (L, h, m = 0) => D(finalDay(L), h, m);
const kept = (L, id) => !!(L.invites.find((i) => i.id === id) || {}).kept;
const inv = (L, id) => L.invites.find((i) => i.id === id) || null;
const answered = (L, id) => { const i = inv(L, id); return !!i && i.status !== 'pending'; };
const lapsed = (L, id, by) => { const i = inv(L, id); return stamp(L) > by && !(i && i.kept); };
export const tookCall = (L, script) => (L.flags.calls || []).some((c) => c.script === script && !c.missed);
export const spokeSince = (L, who, since = 0) => ((L.flags.spoke || {})[who] || []).filter((t) => t >= since).length;
const onDeck = (ctx) => !!ctx && !!ctx.player && ctx.player.x > 6 && ctx.player.y > 2;
const atRail = (ctx) => !!ctx && !!ctx.player && ctx.player.x > 22.5 && ctx.player.y > 2;
const B = (zh, en) => ({ zh, en });
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// where things are, for the markers
export const PLACE = {
  rail: { x: 23.5, z: -2, label: B('江边栏杆', 'The river railing') },
  hotel: { x: -48, z: -209.5, label: B('和平饭店', 'Peace Hotel') },
  jazz: { x: -44, z: -211.5, label: B('爵士吧', 'Jazz Bar') },
  didi: { x: -3.2, z: -18.5, label: B('打车点', 'DiDi pickup') },
  deckNorth: { x: 18, z: -200, label: B('江边', 'By the river') },
};

// ---- the quests ----
const BASE_QUESTS = [
  // ======== Act I ========
  { id: 'first-night', act: 1, main: true, giver: 'me',
    title: B('外滩的第一晚', 'First night on the Bund'),
    summary: B('十年没回来了。先看看江，再去和平饭店住下。', 'Ten years away. Look at the river first, then check in at the Peace Hotel.'),
    start: () => true,
    steps: [
      { id: 'river', text: B('走到江边的栏杆，看看对岸', 'Walk to the river railing and look across'), target: PLACE.rail, done: (L, st, ctx) => atRail(ctx) || !!L.flags.sawRiver, onDone: (L) => { L.flags.sawRiver = true; } },
      { id: 'dad', text: B('接爸爸的电话', 'Take Dad\'s call'), done: (L) => tookCall(L, 'dad-arrival'), optional: true, fail: (L) => (L.flags.calls || []).some((c) => c.from === 'dad' && c.missed) },
      { id: 'key', text: B('在和平饭店前台拿房卡', 'Get your key card at the Peace Hotel\'s front desk'), target: PLACE.hotel, done: (L) => !!L.flags.hotelKey },
      { id: 'room', text: B('上六楼，看看 612', 'Go up to the sixth floor and see room 612'), target: PLACE.hotel, done: (L) => !!L.flags.room612 },
    ] },
  { id: 'momo-gig', act: 1, giver: 'momo',
    title: B('Momo 的演出', 'Momo\'s set'),
    summary: B('Momo 今晚在和平饭店爵士吧弹琴，给你留了位置。', 'Momo is playing the Peace Hotel Jazz Bar tonight and has kept you a seat.'),
    start: (L) => !!inv(L, 'momo-gig'),
    fail: (L) => { const i = inv(L, 'momo-gig'); return !!i && (i.status === 'declined' || i.status === 'missed' || lapsed(L, 'momo-gig', i.at + 120)); },
    steps: [
      { id: 'yes', invite: 'momo-gig', text: B('在微信上答应他', 'Say yes on WeChat'), done: (L) => (inv(L, 'momo-gig') || {}).status === 'accepted' },
      { id: 'there', text: (L) => B('九点半前到爵士吧', 'Be at the Jazz Bar by 9:30 pm'), target: PLACE.jazz, wait: (L) => (inv(L, 'momo-gig') || { at: 0 }).at - 20, done: (L) => kept(L, 'momo-gig') },
    ] },
  // (the robot arm and Dad's offer: the first week's two pulls, still open when the year moves on)
  { id: 'robot-arm', act: 1, main: true, giver: 'xuan',
    title: B('机械臂', 'The robot arm'),
    summary: (L) => (L.flags.demoDone ? B('演示成功了。王总想投。', 'The demo went well. Mr Wang wants in.') : B('明轩学长的团队做协作机械臂，原型卡住了，产品经理也跑了。', 'Mingxuan\'s friend Zhou runs a robot-arm start-up. The prototype is stuck and their product lead has quit.')),
    start: (L) => !!inv(L, 'xuan-arm'),
    steps: [
      { id: 'yes', optional: true, invite: 'xuan-arm', text: B('在微信上回复明轩：答应去看原型', 'Reply to Mingxuan on WeChat: say you\'ll look at the prototype'), done: (L) => (inv(L, 'xuan-arm') || {}).status === 'accepted' || kept(L, 'xuan-arm'), fail: (L) => ['declined', 'missed'].includes((inv(L, 'xuan-arm') || {}).status) },
      { id: 'review', optional: true, text: (L) => B(`${dayName(L, 2).zh}下午三点，陆家嘴 IFC 32 楼（滴滴或地铁 2 号线）`, `${cap(dayName(L, 2).en)}, 3 pm: IFC 32F in Lujiazui (DiDi, or Line 2 from East Nanjing Road)`), target: PLACE.didi, wait: (L) => (inv(L, 'xuan-arm') || { at: D(2, 15) }).at - 30, done: (L) => kept(L, 'xuan-arm'), fail: (L) => lapsed(L, 'xuan-arm', ((inv(L, 'xuan-arm') || {}).at || D(2, 15)) + 150) },
      { id: 'build', optional: true, text: B('去杨浦创客空间，把你的手艺练起来（做一件设备）', 'At the Yangpu makerspace, get your hands back in: build a gadget'), target: PLACE.didi, done: (L) => !!(L.flags.maker && L.flags.maker.gadgets && Object.keys(L.flags.maker.gadgets).length), fail: (L) => stamp(L) > D(5, 15) },
      { id: 'demo', optional: true, text: (L) => B(`${dayName(L, 5).zh}下午三点，投资人演示（IFC 32 楼）`, `${cap(dayName(L, 5).en)}, 3 pm: the investor demo (IFC 32F)`), target: PLACE.didi, wait: () => D(5, 14, 30), done: (L) => kept(L, 'xuan-demo'), fail: (L) => lapsed(L, 'xuan-demo', D(5, 17, 30)) },
    ],
    onComplete: (L) => { L.flags.demoDone = kept(L, 'xuan-demo'); } },
  { id: 'dads-offer', act: 1, main: true, giver: 'dad',
    title: B('父亲的提议', 'Dad\'s offer'),
    summary: B('爸爸在南京的厂要上新线，研发那层楼给你留着。', 'Dad\'s works in Nanjing is putting in a new line. He\'s keeping the R&D floor for you.'),
    start: (L) => stamp(L) >= D(2, 19) || tookCall(L, 'dad-plans'),
    steps: [
      { id: 'call', optional: true, text: B('接爸爸的电话', 'Take Dad\'s call'), done: (L) => tookCall(L, 'dad-plans'), fail: (L) => stamp(L) > D(4, 12) && !tookCall(L, 'dad-plans') },
      { id: 'ruoan', optional: true, text: B('和若安聊聊这件事（当面，或在微信上）', 'Talk it over with Ruoan (in person, or on WeChat)'),
        done: (L, st) => spokeSince(L, 'ruoan', st.started) >= 2, fail: (L) => stamp(L) > D(5, 19) },
      { id: 'coming', text: B('爸爸要来上海', 'Dad is coming to Shanghai'), done: (L) => !!inv(L, 'dad-dinner') },
    ],
    onComplete: () => {} },
  // ======== Act V ========
  { id: 'dinner', act: 5, main: true, giver: 'dad',
    title: B('和爸爸吃饭', 'Dinner with Dad'),
    summary: (L) => B(`${dayName(L, finalDay(L)).zh}晚上八点，和平饭店爵士吧。他订了位。`, `${cap(dayName(L, finalDay(L)).en)}, 8 pm, the Peace Hotel Jazz Bar. He's booked a table.`),
    start: (L) => !!inv(L, 'dad-dinner'),
    fail: (L) => !L.flags.dinnerStarted && stamp(L) > FD(L, 20, 45),
    onFail: (L) => { L.flags.dinnerChoice = 'missed'; post(L, 'dad', { from: 'dad', kind: 'text', text: '我等了你四十分钟。走了。' }); nudge(L, 'dad', -15, 'dinner:missed'); },
    steps: [
      { id: 'reply', text: B('回爸爸的消息', 'Answer Dad\'s message'), done: (L) => answered(L, 'dad-dinner') },
      { id: 'there', text: (L) => B(`${dayName(L, finalDay(L)).zh}晚上八点前到和平饭店爵士吧`, `Be at the Peace Hotel Jazz Bar by 8 pm on ${dayName(L, finalDay(L)).en}`), target: PLACE.jazz, wait: (L) => FD(L, 19, 40), done: (L) => !!L.flags.dinnerStarted },
      { id: 'talk', text: B('和他谈', 'Talk to him'), target: PLACE.jazz, done: (L) => !!L.flags.dinnerChoice },
    ] },
  { id: 'tide', act: 5, main: true, giver: 'me',
    title: B('回潮', 'The returning tide'),
    summary: B('晚上十点，外滩会换成深夜灯光，只留下轮廓。在江边看着它暗下来。', 'At ten the Bund goes over to its late-night lighting, just the outlines. Watch it dim from the river.'),
    start: (L) => !!L.flags.dinnerChoice,
    steps: [
      { id: 'river', text: B('十点前回到江边', 'Be back by the river before ten'), target: PLACE.deckNorth, wait: (L) => { const d = Math.floor(stamp(L) / 1440); return D(d, 21, 50); }, done: (L, st, ctx) => onDeck(ctx) },
      { id: 'lights', text: B('看灯光暗下来', 'Watch the lights dim'), target: PLACE.deckNorth, done: (L, st, ctx) => onDeck(ctx) && (!!L.flags.lightsOutSeen || stamp(L) % 1440 >= 22 * 60) },
    ],
    onComplete: (L) => { L.flags.ending = ending(L); emit(L, { type: 'ending', ending: L.flags.ending }); } },
];
// the year's own quests (Acts I-IV at work, somewhere to live, the watch-repairer) begin only in a year game,
// except the watch-repairer's, which any game with Mission One behind it shows as a side story
export const QUESTS = [...BASE_QUESTS, ...YEAR_QUESTS];

// ---- story beats the quests need (run alongside world/agenda.js) ----
export const STORY_BEATS = [
  // Dad tells you he's coming: after you've talked it over with Ruoan, or on the evening of day 5 regardless
  { id: 'dad-coming', when: (L) => { const q = (L.quests || { list: {} }).list['dads-offer']; return !!q && q.status === 'active' && (isYear(L) ? stamp(L) >= D(finalDay(L) - 1, 19) : (q.skipped.includes('ruoan') || spokeSince(L, 'ruoan', q.started) >= 2 || stamp(L) >= D(5, 19))); },
    run: (L) => {
      post(L, 'dad', { from: 'dad', kind: 'text', text: isYear(L) ? '下个月十三号我到上海，嘉定有个供应商要见。' : '我后天到上海，嘉定有个供应商要见。' });
      invite(L, { id: 'dad-dinner', from: 'dad', thread: 'dad', title: '和爸爸吃饭', place: '和平饭店 · 爵士吧', at: FD(L, 20, 0), deadline: FD(L, 18, 0),
        text: isYear(L) ? '十一月十三号，周六，晚上八点。和平饭店楼下那个爵士吧。我订了位。' : '周六晚上八点，你住的那个和平饭店，楼下那个爵士吧。我订了位。', onAccept: 4, onDecline: -6, onMiss: -8,
        yesText: '好，爸，我一定到。', noText: '那天……我可能有事。' });
    } },
  // whatever you said, he's coming anyway
  { id: 'dad-insists', when: (L) => ['declined', 'missed'].includes((inv(L, 'dad-dinner') || {}).status), run: (L) => post(L, 'dad', { from: 'dad', kind: 'text', text: '位子我订了。你来不来，自己看着办。' }) },
];
export function runStoryBeats(L) {
  const fired = (L.fired ||= {}), out = [];
  for (const b of STORY_BEATS) if (!fired[b.id] && b.when(L)) { fired[b.id] = stamp(L); b.run(L); out.push(b.id); }
  return out;
}

// ---- what the model is told when you talk to someone (the free conversation knows the story) ----
export function storyContext(L, who) {
  const q = (L.quests || { list: {} }).list, out = [];
  const act = q.tide ? 3 : q['dads-offer'] || q['robot-arm'] ? 2 : 1;
  if (['ruoan', 'xuan', 'momo', 'yinuo', 'zhixia', 'dad', 'maker', 'founder', ...COLLEAGUES].includes(who)) {
    out.push('Ji Bai (纪白, the person talking to you) is 27, from Nanjing; UC Berkeley cognitive science (HCI, AI, product), then a few years in Silicon Valley tech; he has just moved to Shanghai to join an international technology consulting firm in Lujiazui, working on enterprise AI products.');
    if (act >= 2) out.push('His father has offered him the R&D floor at the family\'s precision-machining works in Nanjing and wants him home; Ji Bai hasn\'t decided.');
    if (q['robot-arm']) out.push(L.flags.demoDone ? 'The robot-arm start-up (Zhou\'s, introduced by Mingxuan) did well in its investor demo, partly thanks to Ji Bai.' : 'Mingxuan has pulled him into Zhou\'s robot-arm start-up, which needs a product lead.');
    if (inv(L, 'dad-dinner') && !L.flags.dinnerChoice) out.push('His father is coming to Shanghai and has booked dinner at the Peace Hotel Jazz Bar on Saturday at 8 pm.');
    if (L.flags.dinnerChoice) out.push(`At that dinner Ji Bai ${({ stay: 'told his father he is staying in Shanghai to build his own company', home: 'agreed to go home to Nanjing', together: 'proposed that the family works manufacture the robot arm, working between both cities', silent: 'could not give his father an answer', missed: 'never turned up' })[L.flags.dinnerChoice] || 'talked with his father'}.`);
    const w = workContext(L); if (w) out.push(w);
    const y = lifeContext(L); if (y) out.push(y);
    const cc = careerContext(L, who); if (cc) out.push(cc);                 // what has really happened this year, as far as this person would know it
    if (who === 'ruoan' && act >= 2) out.push('You (Ruoan) know him best of anyone; you think he should stop pleasing everyone and say what he wants, but you won\'t tell him what to choose.');
    if (who === 'dad') out.push('You are his father: proud, few words, you won\'t say you miss him.');
  }
  return out.join(' ');
}

// ---- Act III: the dinner. [who, zh, en] lines; { ask: [...] } answers with d (Dad's feelings), set, then ----
export function dinnerScript(L) {
  if (isYear(L)) return yearDinner(L);                                      // a year on: he knows what you did for a living, how it went, where you live (world/careerStory.js)
  const demo = !!L.flags.demoDone, told = !!(L.flags.toldDadStudio || L.flags.toldDadPlans);
  return [
    ['dad', '坐。菜我点好了，都是你小时候爱吃的。', 'Sit down. I\'ve ordered. The things you liked as a boy.'],
    { ask: [
      { zh: '爸，你怎么突然来上海了？', en: 'Dad, why the sudden trip to Shanghai?', d: 0, then: [['dad', '嘉定有个供应商，顺路。', 'A supplier in Jiading. It was on the way.']] },
      { zh: '谢谢爸。', en: 'Thanks, Dad.', d: 2, then: [['dad', '嗯。', 'Mm.']] },
      { zh: '这儿挺贵的吧。', en: 'This place must cost a fortune.', d: -1, then: [['dad', '你住在这儿都不嫌贵，我请你吃顿饭你倒嫌贵了。', 'You\'re staying here, and you worry about the price of dinner?']] },
      { zh: '（坐下，不说话）', en: '(Sit down. Say nothing.)', d: 0, then: [] },
    ] },
    ['dad', '你妈说你瘦了。视频里看出来的。', 'Your mother says you\'ve lost weight. She could see it on the video call.'],
    demo ? ['dad', '明轩他爸跟我说了。你们那个机械臂，在投资人面前演示得不错。', 'Mingxuan\'s father told me. That robot arm of yours did well in front of the investor.']
      : ['dad', '听说你这几天在陆家嘴、杨浦到处跑。忙什么呢？', 'I hear you\'ve been all over Lujiazui and Yangpu these last few days. Doing what?'],
    { ask: [
      { zh: '在帮朋友的团队做产品。我喜欢做这个。', en: 'Helping a friend\'s team with their product. I like this work.', d: 1, then: [['dad', '喜欢是一回事，能不能养活人是另一回事。', 'Liking it is one thing. Making a living from it is another.']] },
      { zh: '就是瞎忙。', en: 'Nothing much. Keeping busy.', d: -1, then: [['dad', '瞎忙最累。', 'Busy for nothing is the most tiring kind.']] },
      { zh: '爸，你厂里的精度，正是我们缺的。', en: 'Dad, the precision your works has is exactly what we\'re missing.', d: 3, flag: 'pitchedDad', then: [['dad', '……哦？说说看。', '...Oh? Go on.']] },
      { zh: '（喝口茶）', en: '(Drink some tea.)', d: 0, then: [] },
    ] },
    // what you've made, if you've made something (world/work.js): on the table, or left in your pocket
    ...dinnerWork(L),
    ['dad', told ? '你上次说想做自己的工作室。我想了很久。' : '厂里那层楼，我还给你留着。新线明年开，研发总得有人管。', told ? 'Last time you said you wanted your own studio. I\'ve thought about it a long while.' : 'That floor at the works is still yours. The new line starts next year. Someone has to run R&D.'],
    ['dad', '我五十五了。不想再一个人撑着。', 'I\'m fifty-five. I don\'t want to carry it on my own any more.'],
    // the answer. Read when the conversation reaches it, so how he takes it follows everything said
    // (and shown) at the table before it, as the ending does
    { get ask() {
      const dad = relation(L, 'dad').affinity, canTogether = demo && dad >= 55, warm = dad >= 58;
      const stay = dinnerAfter(L, 'stay', warm), home = dinnerAfter(L, 'home', true), tog = dinnerAfter(L, canTogether ? 'together' : 'refused', true);
      return [
        { zh: '我想留在上海，做我自己的公司。', en: 'I want to stay in Shanghai and build my own company.', d: -2, set: 'stay', flag: stay.flag,
          then: [...(warm ? [['dad', '……那就做好。别让人看笑话。钱不够，跟我说。', '...Then do it properly. Don\'t let anyone laugh at you. If money\'s short, tell me.']] : [['dad', '……随你。', '...Suit yourself.']]), ...stay.then] },
        { zh: '好。我跟你回南京。', en: 'All right. I\'ll come home to Nanjing.', d: 6, set: 'home', flag: home.flag, then: [['dad', '……好。你妈会高兴的。', '...Good. Your mother will be happy.'], ...home.then] },
        { zh: '让厂里来做我们的机械臂。我两边跑。', en: 'Let the works build our robot arm. I\'ll work between the two cities.', d: canTogether ? 4 : -2, set: canTogether ? 'together' : 'stay', flag: tog.flag,
          then: canTogether ? [['dad', '……把方案发给我。下周带他们来厂里看看。', '...Send me the proposal. Bring them to the works next week.'], ...tog.then]
            : tog.replace ? tog.then : [['dad', '你拿什么让我信？先把你自己的事做成再说。', 'What have you got to make me believe it? Get your own thing working first.']] },
        { zh: '（沉默）', en: '(Silence.)', d: -1, set: 'silent', then: [['dad', '你还是没想好。没关系。想好了，告诉我。', 'You still haven\'t decided. That\'s all right. When you have, tell me.']] },
      ];
    } },
    ['dad', '吃吧，菜要凉了。', 'Eat. The food\'s getting cold.'],
  ];
}

// ---- the endings ----
export function ending(L) {
  const c = L.flags.dinnerChoice, dad = relation(L, 'dad').affinity;
  if (c === 'missed') return 'apart';
  if (c === 'together') return 'together';
  if (c === 'home') return 'home';
  if (c === 'silent') return 'open';
  return dad >= 55 ? 'stay' : 'alone';
}
export const ENDINGS = {
  together: { title: B('两岸', 'Both banks'), text: B('第二年春天，纪家的厂做出了第一批五十台机械臂。你一周在南京，一周在杨浦。爸爸学会了用微信发语音，第一条是：“图纸收到了。”',
    'The next spring your father\'s works turned out the first fifty arms. You spend a week in Nanjing, a week in Yangpu. Your father learns to send WeChat voice notes. The first one says: "Got the drawings."') },
  stay: { title: B('留下', 'Staying'), text: B('灯暗下来的时候，爸爸发来三个字：“注意身体。”你在杨浦租下了阿凯隔壁的那间厂房。上海的冬天比你记得的冷。',
    'As the lights dim, your father sends four words: "Look after your health." You rent the empty unit next to Kai\'s in Yangpu. Shanghai\'s winter is colder than you remember.') },
  alone: { title: B('一个人', 'On your own'), text: B('爸爸一个月没有打电话。若安说他会想通的。你在杨浦的厂房里装好了第一张工作台，那天晚上外滩的灯照常在十点暗下来。',
    'Your father doesn\'t call for a month. Ruoan says he\'ll come round. You set up your first bench in the Yangpu unit, and that night the Bund\'s lights dim at ten as they always do.') },
  home: { title: B('回南京', 'Home'), text: B('走的那天，大家在虹桥送你。Momo 在候车厅的钢琴上弹了一首歌。南京的研发楼很安静。你把外滩的照片贴在了工位上。',
    'The day you leave, they all see you off at Hongqiao. Momo plays a song on the station piano. The R&D floor in Nanjing is quiet. You pin a photo of the Bund above your desk.') },
  open: { title: B('潮未定', 'The tide hasn\'t turned'), text: B('灯暗了，江还在流。你还没想好，这也是一种答案。明天，外滩的灯会再亮。',
    'The lights dim; the river keeps moving. You haven\'t decided, and that\'s an answer of a kind. Tomorrow the Bund\'s lights will come on again.') },
  apart: { title: B('错过', 'Missed'), text: B('他等了你四十分钟。回南京的高铁上，他发来一张照片：爵士吧里那张空着的椅子。',
    'He waited forty minutes. From the train back to Nanjing he sends a photo: the empty chair at the Jazz Bar.') },
};

// the ending as the card shows it: in a year game the text is told without the old week's furniture
export function endingOf(L, id) { const e = ENDINGS[id]; if (!e) return null; const t = yearEnding(L, id); return t ? { title: e.title, text: t } : e; }
// what the card adds afterwards: the road he took this year (world/careerStory.js), then the thing he made (world/work.js epilogue, passed in)
export function afterword(L, id, made = null) {
  const y = yearEpilogue(L, id), parts = [y, made].filter(Boolean);
  if (!parts.length) return null;
  return B(parts.map((p) => p.zh).join(''), parts.map((p) => p.en).join(' '));
}
