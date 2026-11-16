// 一件自己的东西 / Something of your own: the words and the story-side rules of the night gimbal's
// week (engine/studio.js has the numbers). Pure data and rules over life, like world/story.js, so
// the whole week can be played in node (tests/studio.test.mjs).
//   what's wrong with it, in Ji Bai's notebook voice; what each fix is
//   what people say with it in their hands: passers-by, and the three who are there every evening
//     老陈   a retired lathe hand who photographs the Customs House clock on the hour, hands unsteady
//     小叶   shoots visitors' portraits on the promenade for a living
//     阿哲   livestreams his walk along the Bund at night
//   the side quest that teaches the loop; the messages it sets off; what Dad makes of it at the
//   dinner (he's a machinist: he reads the object, the notebook and the sums, in that order);
//   and what each ending adds about it afterwards
// All written in Chinese first, the way these people would say it, with English alongside.
import { post, thread, stamp } from '../engine/life.js';
import { gainFollowers } from '../engine/maker.js';
import { finalDay } from '../engine/year.js';
import { studio, hasProduct, rev, specs, summary, isOpen, hear, addToList, machined, eveningOf, todays, tonight, REGULARS, FIXES, HEAVY_AT } from '../engine/studio.js';

const B = (zh, en) => ({ zh, en });
const D = (day, h, m = 0) => day * 1440 + h * 60 + m;
const pl = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
export const PRODUCT = B('夜行云台', 'Night gimbal');

// ---- the notebook's words ----
export const ISSUE_TEXT = {
  heavy: { name: B('太沉', 'Too heavy'), note: (s) => B(`举不到一分钟手就酸。现在 ${s.grams} 克。`, `An arm aches inside a minute. ${s.grams} g as it stands.`) },
  battery: { name: B('电不够一晚上', "Won't last an evening"), note: (s) => B(`满电 ${s.minutes} 分钟。外滩的一个晚上，至少要两个半小时。`, `${s.minutes} minutes on a full charge. An evening on the Bund is two and a half hours at least.`) },
  grip: { name: B('握把打滑', 'The grip slips'), note: () => B('手冷、手上有汗、下小雨，都抓不住。', "Cold hands, damp hands, a drizzle: it won't stay put.") },
  clamp: { name: B('夹不住大手机', "The clamp won't take a big phone"), note: () => B('带壳的、大屏的都夹不牢，放上去是歪的。', 'Anything large or in a case sits crooked, or slides.') },
  boot: { name: B('开机太慢', 'Slow to start'), note: () => B('每次开机要校准八秒。想拍的那一下早过去了。', "Eight seconds of calibration every time. The moment's gone by then.") },
  hum: { name: B('电机有啸叫', 'The motors whine'), note: () => B('很细的吱吱声，录视频全收进去了。', "A thin high whine, and it's on every video.") },
  drift: { name: B('暗处画面会飘', 'It drifts in the dark'), note: () => B('灯一暗，地平线就慢慢歪。只有夜里看得出来。', 'When the light drops the horizon creeps. You only see it at night.') },
  fold: { name: B('放不进口袋', "Doesn't fit a pocket"), note: () => B('不能折。没背包的人不会带它出门。', "It doesn't fold. Nobody without a bag will take it out with them.") },
  wet: { name: B('接口怕水', 'The port lets water in'), note: () => B('充电口朝上敞着，一场小雨就进水。', 'The charging port faces up, open. One drizzle and it has water in it.') },
};
export const FIX_TEXT = {
  lighten: B('把支臂掏空，壳体减到 1.2 毫米', 'Hollow the arm; thin the shell to 1.2 mm'),
  cell: B('换 1200 mAh 的大电芯', 'A bigger 1200 mAh cell'),
  usbc: B('加 USB-C，可以边充边用', 'USB-C pass-through: run it off a power bank'),
  sleeve: B('握把套一层 TPU 软胶', 'A soft TPU sleeve on the grip'),
  clamp: B('弹簧夹加宽，垫上硅胶', 'A wider sprung clamp with silicone pads'),
  gasket: B('充电口加硅胶塞和密封圈', 'A silicone plug and an O-ring on the port'),
  hinge: B('支臂改成能折的（定位销）', 'A folding arm on a locating pin'),
  quickboot: B('固件：记住校准，一秒半开机', 'Firmware: remember the calibration, start in 1.5 s'),
  quiet: B('固件：把 PWM 调到耳朵听不见的频率', 'Firmware: move the PWM out of hearing'),
  filter: B('固件：重调姿态滤波', 'Firmware: retune the attitude filter'),
  alloy: B('铝合金支臂（要精密机加工，自己做不了）', "An aluminium arm (precision machining: not something you can make yourself)"),
};
// what a passer-by says with it in their hands, two ways each
export const QUOTES = {
  heavy: [B('好是好，就是沉。举一会儿手就酸了。', "It's nice, but it's heavy. My arm's going already."), B('这得有两个手机重了吧？', 'This must be twice the weight of my phone.')],
  battery: [B('诶，它闪红灯了。是不是快没电了？', "Oh, it's flashing red. Is it running out?"), B('拍一晚上撑得住吗？我看电掉得挺快。', "Would it last a whole evening? The battery's dropping fast.")],
  grip: [B('有点滑，我都不敢松手。', "It's slippery. I daren't loosen my hand."), B('手冷，抓不稳这个把。', "My hands are cold. I can't keep hold of the handle.")],
  clamp: [B('我手机带壳，夹不住，老往下滑。', "My phone's in a case and it won't grip. It keeps sliding down."), B('夹子太小了，大屏的放上去是歪的。', "The clamp's too small. A big phone sits crooked.")],
  boot: [B('等它开好，人家都走过去了。', "By the time it's on, they've walked past."), B('每次都要等它转一圈才能用啊？', 'It has to do that little spin every time before it works?')],
  hum: [B('你听，录进去了，吱——的一声。', "Listen. It's on the recording, that whine."), B('画面稳是稳，就是有个电流声。', "The picture's steady, but there's a whine on it.")],
  drift: [B('亮的地方挺稳，往暗处一转就慢慢歪了。', 'Steady where it\'s bright. Turn to the dark and it slowly tips.'), B('你看这条地平线，是斜的。', "Look at the horizon in this one. It's crooked.")],
  fold: [B('挺好用，可这个我没地方放啊。', 'It works well, but where would I put it?'), B('能折起来就好了，放不进口袋。', "If only it folded. It won't go in a pocket.")],
  wet: [B('这个口是敞着的？下雨怎么办。', "This port's just open? What about rain?"), B('外滩的雨说下就下，这个不防水吧。', "It rains without warning down here. This isn't sealed, is it?")],
  like: [B('诶，这个真稳。哪里有卖？', 'Oh, that is steady. Where can I get one?'), B('拍出来不糊了！你自己做的？出了告诉我。', "They're not blurry any more! You made this? Tell me when it's out.")],
  dear: [(p) => B(`东西是好东西……${p} 块？我再想想。`, `It's a good thing... ¥${p}? I'll think about it.`), (p) => B(`${p}？有点贵了，便宜点我就要。`, `¥${p}? Bit steep. Cheaper and I'd have one.`)],
  day: [B('大白天的，手机自己就够稳了吧。', "In broad daylight? A phone's steady enough on its own."), B('白天看不出区别。天黑了再来吧。', "Can't tell the difference in daylight. Try me after dark.")],
};
export const PERSONA_NAME = { visitor: B('游客', 'Tourist'), elder: B('老人家', 'An older passer-by'), office: B('上班族', 'Office worker'), youngMan: B('年轻人', 'Young man'), student: B('学生', 'Student'), me: B('我自己', 'Me'), momo: B('Momo', 'Momo'), zhixia: B('知夏', 'Zhixia'), stream: B('阿哲的直播间', "Zhe's stream"), fans: B('Momo 的评论区', "Momo's comments") };

// ---- the three who are there every evening ----
export const REG = {
  chen: {
    name: B('老陈', 'Old Chen'), role: B('退休车工，每天傍晚来拍海关的钟', 'A retired lathe hand; photographs the Customs clock every evening'),
    hours: B('17:15 – 19:45 · 海关大楼对面的江边', '5:15 – 7:45 pm · the railing opposite the Customs House'),
    intro: B('小伙子，手里是什么？云台？……我手抖，拍那个钟总是糊。借我试试。', "What's that you've got, young man? A gimbal? ...My hands shake. That clock always comes out blurred. Let me try."),
    says: {
      heavy: B('稳是稳了，就是沉。我这手本来就抖，再举个秤砣，抖得更厉害。', "It's steady, I'll give you that. But it's heavy. My hands shake as it is; give them a weight to hold and they shake more."),
      boot: B('六点整敲钟。我按了开机，它在那儿转啊转，转好了，钟也敲完了。', 'The clock strikes on the hour. I pressed the button, it sat there spinning, and when it was ready the clock had finished.'),
      grip: B('江边风大，手是僵的。这个把太光，握不住。', "The wind off the river stiffens your hands. This handle's too smooth to hold."),
      fold: B('我出门就一个口袋。这个得拎着，像拎把榔头。', "I go out with one pocket. This I'd have to carry like a hammer."),
    },
    noticed: {
      heavy: B('轻了。……轻了不少。你把臂掏空了？', 'Lighter. ...A good deal lighter. You hollowed the arm?'),
      boot: B('嚯，一按就好。今天这个钟我拍到了。', 'Ha. On at a touch. I got the clock today.'),
      grip: B('这层胶好，不滑了。', "This rubber's good. It doesn't slip now."),
      fold: B('能折了。……这销子是打印的吧？磨两个月就旷了，要车一个钢的。', "It folds. ...That pin's printed, isn't it? Two months and it'll be sloppy. Turn one in steel."),
    },
    promise: B('我每天这个钟点都在。改了再拿来。', "I'm here this time every day. Bring it back when you've changed it."),
    same: B('还是昨天那台？没改就别给我了，我记性还没那么差。', "Same one as yesterday? Don't hand it over unchanged. My memory isn't that bad yet."),
    late: B('昨天等了你一刻钟。年轻人说话要算数。', 'I waited a quarter of an hour for you yesterday. A young man should keep his word.'),
    like: B('行了。我干了四十年车工，东西顺不顺手，一摸就知道。给我留一台，钱照付，别跟我客气。', "That'll do. Forty years on a lathe: I know by touch when a thing sits right. Keep one for me. And I'm paying, so don't argue."),
    dear: (p) => B(`东西是好的。${p} 块……我一个月退休金才多少。`, `It's a good piece of work. ¥${p}, though... on my pension?`),
    who: B('一个退休的老车工。每天傍晚在江边拍海关的钟。', 'A retired lathe hand. He photographs the Customs clock from the river every evening.'),
    dadSays: B('……干过活的人说的话，要听。', "...Listen to people who've worked with their hands."),
  },
  ye: {
    name: B('小叶', 'Xiao Ye'), role: B('在外滩给游客跟拍的摄影师', "Shoots visitors' portraits on the Bund for a living"),
    hours: B('18:30 – 21:45 · 往北走，东方明珠正对面那一段', '6:30 – 9:45 pm · north along the railing, facing the Pearl'),
    intro: B('你这个是自己做的？我天天在这儿给客人拍，手持拍到九点手就废了。给我试一条。', "You made that yourself? I shoot clients here every night. By nine my hands are done. Let me run a clip."),
    says: {
      clamp: B('我这手机带着镜头壳，你这夹子夹不住。客人的手机要是掉了，我赔不起。', "My phone lives in a lens case and your clamp won't hold it. If a client's phone hits the ground, I'm the one who pays."),
      drift: B('你看回放。走到暗的地方，地平线慢慢歪了。客人看不出来，我看得出来。', "Watch the playback. Into the dark and the horizon tips, slowly. A client won't see it. I do."),
      battery: B('我一晚上拍三个小时，这个撑不到一半。挂着充电宝拍？线会进画面的。', "I shoot three hours a night and this won't do half. Hang a power bank off it? The cable ends up in shot."),
      hum: B('视频里有吱吱声。我后期得一条一条去掉，没那个工夫。', "There's a whine on the video. I'd have to clean every clip in the edit. I haven't the time."),
    },
    noticed: {
      clamp: B('夹住了，甩都甩不掉。', "That holds. I couldn't shake it off if I tried."),
      drift: B('这回地平线是平的。', 'The horizon stays level this time.'),
      battery: B('拍了一整场，还剩两格。可以。', "A whole session and two bars left. That'll do."),
      hum: B('安静了。', 'Quiet now.'),
    },
    promise: B('我六点半以后都在这一段。改好了来找我，我是真想要一个。', "I'm on this stretch from half six. Find me when it's fixed. I do actually want one."),
    same: B('没改吧？那我不试了，客人等着呢。', "Not changed, is it? Then I'll pass. I've a client waiting."),
    late: B('昨天你没来。我还以为你不做了。', "You didn't come yesterday. I thought you'd given up."),
    like: B('我要两台，我和我搭档一人一台。定金现在转你。不收？不收我怎么知道你真会做出来。', "I'll take two, one for me and one for my partner. I'm sending the deposit now. No? Then how do I know you'll really make them?"),
    dear: (p) => B(`${p}？我一单才挣多少。四百多我认，再高不行。`, `¥${p}? Think what I make on a shoot. Four hundred-odd I'd pay. Not more.`),
    who: B('一个在外滩给人跟拍的摄影师。她靠这个吃饭。', 'A photographer who shoots portraits on the Bund. She earns her living with it.'),
    dadSays: B('靠它吃饭的人挑的毛病，最值钱。', 'The faults found by someone who earns a living with it are worth the most.'),
  },
  zhe: {
    name: B('阿哲', 'Zhe'), role: B('晚上在外滩边走边直播', 'Livestreams his walk along the Bund at night'),
    hours: B('20:00 – 22:40 · 靠南京路那一头', '8:00 – 10:40 pm · up at the Nanjing Road end'),
    intro: B('哥，你这是云台？我直播用的那个昨天摔了。借我播十分钟，直播间帮你喊一声。', "Is that a gimbal, mate? I dropped mine yesterday. Lend it to me for ten minutes on stream and I'll give you a shout-out."),
    says: {
      hum: B('直播间有人刷：“主播你那边什么东西在叫”。是你这电机。', 'Chat\'s asking: "what\'s that noise on your end?" It\'s your motors.'),
      battery: B('我一播三个小时。它半场就亮红灯了。', 'I stream three hours at a go. It went red before half-time.'),
      wet: B('上礼拜下小雨，我原来那个充电口进了水，直接黑屏。你这个口也是敞着的。', "Last week in the drizzle, water got in my old one's port and it just went black. Yours is wide open too."),
      fold: B('收工了我得骑车回去。这个塞不进包。', "I cycle home after. This won't go in my bag."),
    },
    noticed: {
      hum: B('没声了！直播间没人问了。', "Silent! Nobody in chat's asking now."),
      battery: B('播完了还有电。', "Stream's over and it's still got charge."),
      wet: B('加了个塞子，这就对了。', "A plug on the port. That's the way."),
      fold: B('能折，进包了。', "Folds. It's in the bag."),
    },
    promise: B('我八点以后在这头播。改了再来，哥。', "I'm streaming up this end from eight. Come back when it's sorted, mate."),
    same: B('还是那一版啊？那我先用自己的。', "Same version? I'll stick with my own for now."),
    late: B('昨晚还等你来着，哥。', 'I was looking out for you last night, mate.'),
    like: B('可以啊哥！家人们，这是这位哥自己做的，想要的扣 1。……你看，一排 1。', "Now we're talking! Everyone, this guy built this himself. Type 1 if you want one. ...Look at that. A wall of ones."),
    dear: (p) => B(`东西没毛病，可 ${p} 块，我直播间的人下不去手。`, `Nothing wrong with it. But my viewers won't go to ¥${p}.`),
    who: B('一个晚上在外滩做直播的。', 'Someone who livestreams on the Bund at night.'),
    dadSays: B('……直播。嗯。也是用的人。', '...Livestreams. Mm. He uses it, all the same.'),
  },
};
export const STRANGER = { who: B('外滩上一个不认识的人。', 'A stranger on the Bund.'), dadSays: B('不认识的人不会跟你客气。', 'A stranger has no reason to be kind.') };
export const WORK_NAMES = { chen: ['老陈', 'Old Chen'], ye: ['小叶', 'Xiao Ye'], zhe: ['阿哲', 'Zhe'] };

// what was said, for the notebook and for Dad: a logged go (engine/studio.js tests[]) or a page's underlined line
export function quoteOf(t, L) {
  if (!t) return null;
  const R = REG[t.who], price = L ? studio(L).price : 299;
  if (t.kind === 'like') return R ? R.like : QUOTES.like[t.v || 0];
  if (t.kind === 'dear') return R ? R.dear(price) : QUOTES.dear[t.v || 0](price);
  if (t.kind === 'day') return QUOTES.day[t.v || 0];
  if (t.issue) return (R && R.says[t.issue]) || QUOTES[t.issue][t.v || 0];
  return null;
}
export const speakerOf = (t) => (REG[t.who] ? REG[t.who].name : PERSONA_NAME[t.persona] || PERSONA_NAME.office);

// ---- the side quest that teaches the loop (engine/quests.js; a new id, beside the story's) ----
const RAIL = { x: 23.5, z: 22, label: B('江边（天黑以后）', 'The river railing, after dark') };
const DIDI = { x: -3.2, z: -18.5, label: B('打车点', 'DiDi pickup') };
const HOTEL = { x: -48, z: -209.5, label: B('和平饭店 · 612 的书桌', 'Peace Hotel · the desk in 612') };
export const WORK_QUESTS = [
  { id: 'own-work', act: 1, giver: 'me',
    title: B('一件自己的东西', 'Something of your own'),
    summary: (L) => { const s = summary(L); return s.grade === 0 ? B('机械臂是别人的。你自己的那台云台，图纸还贴在阿凯的白板上。', "The robot arm is someone else's. Your own gimbal is still a sketch on Kai's whiteboard.")
      : B(`夜行云台，第 ${s.rev} 版。白天改，天黑了拿到外滩给人用，夜里记下来。和爸爸吃饭那天，做到哪一版就是哪一版。`, `The night gimbal, version ${s.rev}. Revise it by day, put it in people's hands on the Bund after dark, write it up at night. Whatever version it has reached by the dinner with Dad is the one he'll see.`); },
    start: (L) => hasProduct(L) || stamp(L) >= D(2, 9, 30),
    steps: [
      { id: 'build', text: B('去杨浦的创客空间，把夜行云台做出来', 'At the Yangpu makerspace, build the night gimbal'), target: DIDI, done: (L) => hasProduct(L) },
      { id: 'hands', text: (L) => B(`天黑以后，在江边找正在拍照的人，借给他们试试（${Math.min(3, summary(L).hands)}/3）`, `After dark, find people taking photos by the river and lend it to them (${Math.min(3, summary(L).hands)}/3)`), target: RAIL, done: (L) => summary(L).hands >= 3 },
      { id: 'page', text: B('回 612 的书桌（或工作台），把今天听到的记下来', "At the desk in 612 (or your bench), write up what you heard today"), target: HOTEL, done: (L) => summary(L).pages >= 1 },
      { id: 'rev2', text: B('照记下的问题改出第二版（硬件在工作台，固件在书桌也行）', 'Make a second version from your notes (hardware at the bench; firmware can be done at the desk)'), done: (L) => rev(L) >= 2 },
      { id: 'back', text: B('天黑以后，把新的一版再拿给人试', 'After dark, put the new version in someone\'s hands'), target: RAIL, done: (L) => studio(L).tests.some((t) => t.rev >= 2 && t.kind !== 'dead') },
      { id: 'table', text: (L) => B(`和爸爸吃饭之前，能改几版是几版（现在：第 ${rev(L)} 版）`, `Before the dinner with Dad, get it as far as you can (now: version ${rev(L)})`), done: (L) => !!L.flags.dinnerChoice },
    ] },
];

// ---- messages the work sets off (alongside world/agenda.js; each once, kept in life.fired) ----
const regThread = (L, id) => thread(L, id, { title: REG[id].name.zh, members: ['me', id], kind: 'person' });
const morningAfter = (L, eve) => eve != null && (eveningOf(L) > eve) && L.clock.minute >= 8 * 60 + 30 && L.clock.minute < 23 * 60;
const BEATS = [
  // Kai: the bench is free (the morning of day 2), or, if it's already built, get it out of the building
  { id: 'w-kai1', when: (L) => stamp(L) >= D(2, 9, 30), run: (L) => { thread(L, 'kai', { title: '阿凯', members: ['me', 'kai'], kind: 'person' });
    post(L, 'kai', { from: 'kai', kind: 'text', text: hasProduct(L) ? '那台云台做得不错。光摆在台子上可惜了，天黑了拿去外滩，给拍照的人用用。' : '小纪，今天上午没人，两台打印机都空着。你那个云台的图纸还贴在白板上呢。' }); } },
  { id: 'w-kai2', when: (L) => rev(L) >= 2 && !!L.threads.kai, run: (L) => post(L, 'kai', { from: 'kai', kind: 'text', text: '改版了？这才像做产品的样子。记住，一次别改太多，不然不知道是哪一处起的作用。' }) },
  // Momo borrows it for a gig video
  { id: 'w-momo1', when: (L) => hasProduct(L) && stamp(L) >= D(3, 16, 0) && stamp(L) < D(finalDay(L), 12, 0), run: (L) => post(L, 'momo', { from: 'momo', kind: 'text', text: '白白，听说你做了个云台？？今晚演出借我拍一条，我给你@出来', replies: [
    { text: '拿去，别摔了。', delta: 3, flag: 'lentMomo', follow: '摔了我赔！（我没钱，但我赔）' },
    { text: '还没改好，好了第一个给你。', delta: 0, follow: '行，那我等正式版' },
  ] }) },
  { id: 'w-momo2', when: (L) => { if (L.flags.lentMomo && L.flags.lentMomoEve == null) L.flags.lentMomoEve = eveningOf(L); return morningAfter(L, L.flags.lentMomoEve); }, run: (L) => {
    if (isOpen(L, 'hum')) { hear(L, 'hum', 'momo'); post(L, 'momo', { from: 'momo', kind: 'text', text: '视频拍了，画面绝了。就是……有个吱吱声，我钢琴都盖不住。我先没发。' }); }
    else { const a = gainFollowers(L, 1800); addToList(L, 'fans', 3); if (a) L.flags.pendingAchievement = a; post(L, 'momo', { from: 'momo', kind: 'text', text: '视频发了，评论区一堆人问哪儿买。我说还没卖，是我兄弟做的。有三个人非要留名字。' }); }
  } },
  // Mingxuan asks the question an investor would
  { id: 'w-xuan1', when: (L) => hasProduct(L) && stamp(L) >= D(4, 11, 0) && stamp(L) < D(finalDay(L), 18, 0), run: (L) => post(L, 'xuan', { from: 'xuan', kind: 'text', text: '听说你在做云台？说句不好听的，这东西大厂三百块就能买到。你的凭什么？', replies: [
    { text: '大厂的是给白天做的。我这个是给外滩的晚上做的。', delta: 2, flag: 'pitchNight', follow: '……这句话可以写进BP。成本多少？算过了告诉我。' },
    { text: '我还不知道。先做出来再说。', delta: 0, follow: '行。知道了告诉我，我是认真问的。' },
  ] }) },
  // Zhixia sees the bearing seat (an engineer's eye: she tells you about the drift)
  { id: 'w-zhixia1', when: (L) => hasProduct(L) && stamp(L) >= D(5, 10, 0) && stamp(L) < D(finalDay(L), 18, 0), run: (L) => { hear(L, 'drift', 'zhixia');
    post(L, 'zhixia', { from: 'zhixia', kind: 'text', text: '把你那云台的轴拍个特写我看看。……轴承座是打印的？那是晃的。夜里画面是不是会飘？', replies: [
      { text: '会。你怎么知道的。', delta: 2, follow: '我天天跟公差打交道。先调滤波顶着，以后换金属座。' },
      { text: '还行吧。', delta: 0, follow: '嘴硬。' },
    ] }); } },
  // Mum: Dad has been asking
  { id: 'w-mum1', when: (L) => hasProduct(L) && !!L.threads.mum && stamp(L) >= D(5, 20, 30) && stamp(L) < D(finalDay(L), 19, 0), run: (L) => post(L, 'mum', { from: 'mum', kind: 'voice', text: '白白，你爸昨天问我，你在上海是不是在做什么东西。他不好意思自己问你。', replies: [
    { text: '做了个拍夜景用的云台。见面我拿给他看。', delta: 2, flag: 'toldMumWork', follow: '好，好。你带上。他嘴上不说，心里是想看的。' },
    { text: '没什么，瞎弄。', delta: 0, follow: '你呀，跟你爸一个样。' },
  ] }) },
  // the regulars, the morning after it finally suited them
  { id: 'w-chen', when: (L) => morningAfter(L, (studio(L).people.chen || {}).liked), run: (L) => { regThread(L, 'chen'); post(L, 'chen', { from: 'chen', kind: 'text', text: '[图片] 昨晚六点整的钟。没糊。我老伴说，这是我拍得最清楚的一张。' }); } },
  { id: 'w-ye', when: (L) => morningAfter(L, (studio(L).people.ye || {}).liked), run: (L) => { regThread(L, 'ye'); post(L, 'ye', { from: 'ye', kind: 'text', text: '昨晚那对客人的片子交了，一条没废。两台，我等你。' }); } },
  { id: 'w-zhe', when: (L) => morningAfter(L, (studio(L).people.zhe || {}).liked), run: (L) => { regThread(L, 'zhe'); addToList(L, 'stream', 4); const a = gainFollowers(L, 900); if (a) L.flags.pendingAchievement = a;
    post(L, 'zhe', { from: 'zhe', kind: 'text', text: '哥，昨晚直播间有人截屏问链接。我说还没开卖，先记了四个名字给你。' }); } },
  // after the dinner: the arm, turned at the works
  { id: 'w-arm', when: (L) => !!L.flags.dadMachines && !!L.flags.ending && stamp(L) >= (L.flags.dadMachinesAt ?? (L.flags.dadMachinesAt = stamp(L))) + 2160, run: (L) => { machined(L);
    post(L, 'dad', { from: 'dad', kind: 'text', text: '臂车好了。6061，壁厚一个二，四十一克。快递寄到和平饭店前台。' }); } },
];
export function runWork(L) {
  const fired = (L.fired ||= {}), out = [];
  for (const b of BEATS) if (!fired[b.id] && b.when(L)) { fired[b.id] = stamp(L); b.run(L); out.push(b.id); }
  return out;
}
// English for those messages (world/agendaEn.js looks here too)
export const EN_WORK = {
  '那台云台做得不错。光摆在台子上可惜了，天黑了拿去外滩，给拍照的人用用。': "That gimbal's a decent piece of work. Wasted on a bench, though. Take it down to the Bund after dark and let people who are taking photos use it.",
  '小纪，今天上午没人，两台打印机都空着。你那个云台的图纸还贴在白板上呢。': "Ji Bai, it's empty here this morning and both printers are free. Your gimbal sketch is still up on the whiteboard.",
  '改版了？这才像做产品的样子。记住，一次别改太多，不然不知道是哪一处起的作用。': "A new version? Now you're doing it properly. One thing: don't change too much at once, or you won't know which change did the work.",
  '白白，听说你做了个云台？？今晚演出借我拍一条，我给你@出来': "Baibai, I hear you've built a gimbal?? Lend it to me for tonight's set, I'll shoot a clip and tag you",
  '拿去，别摔了。': "Take it. Don't drop it.", '摔了我赔！（我没钱，但我赔）': "If I drop it I'll pay! (I have no money, but I'll pay)",
  '还没改好，好了第一个给你。': "It isn't right yet. You'll be the first when it is.", '行，那我等正式版': "OK, I'll wait for the real one",
  '视频拍了，画面绝了。就是……有个吱吱声，我钢琴都盖不住。我先没发。': "Shot the video. The picture's unreal. Only... there's a whine on it, and even my piano doesn't cover it. I haven't posted it.",
  '视频发了，评论区一堆人问哪儿买。我说还没卖，是我兄弟做的。有三个人非要留名字。': "Posted the video. The comments are full of people asking where to buy it. I said it isn't for sale yet, my mate made it. Three of them insisted on leaving their names.",
  '听说你在做云台？说句不好听的，这东西大厂三百块就能买到。你的凭什么？': "I hear you're making a gimbal? To be blunt, the big brands sell these for three hundred. What's yours got?",
  '大厂的是给白天做的。我这个是给外滩的晚上做的。': "Theirs are made for daytime. Mine's made for the Bund at night.",
  '……这句话可以写进BP。成本多少？算过了告诉我。': "...That line could go in a pitch deck. What does it cost to make? Tell me when you've worked it out.",
  '我还不知道。先做出来再说。': "I don't know yet. I'll build it first.", '行。知道了告诉我，我是认真问的。': "Fine. Tell me when you do. I'm asking seriously.",
  '把你那云台的轴拍个特写我看看。……轴承座是打印的？那是晃的。夜里画面是不是会飘？': "Send me a close-up of your gimbal's axis. ...The bearing seat's printed? Then it rocks. Does the picture drift at night?",
  '会。你怎么知道的。': 'It does. How did you know?', '我天天跟公差打交道。先调滤波顶着，以后换金属座。': 'I live with tolerances all day. Tune the filter to cover it for now; change to a metal seat later.',
  '还行吧。': "It's all right.", '嘴硬。': 'Stubborn.',
  '白白，你爸昨天问我，你在上海是不是在做什么东西。他不好意思自己问你。': "Baibai, your father asked me yesterday whether you're making something in Shanghai. He can't bring himself to ask you.",
  '做了个拍夜景用的云台。见面我拿给他看。': "A gimbal, for photographs at night. I'll show him when I see him.", '好，好。你带上。他嘴上不说，心里是想看的。': "Good, good. Bring it. He won't say so, but he wants to see it.",
  '没什么，瞎弄。': 'Nothing much. Just tinkering.', '你呀，跟你爸一个样。': 'You. Just like your father.',
  '[图片] 昨晚六点整的钟。没糊。我老伴说，这是我拍得最清楚的一张。': "[Photo] The clock at six sharp last night. Not blurred. My wife says it's the clearest one I've ever taken.",
  '昨晚那对客人的片子交了，一条没废。两台，我等你。': "Delivered last night's couple their clips. Not one wasted. Two units. I'm waiting.",
  '哥，昨晚直播间有人截屏问链接。我说还没开卖，先记了四个名字给你。': "Mate, people were screenshotting last night and asking for a link. I said it isn't on sale yet and took four names down for you.",
  '臂车好了。6061，壁厚一个二，四十一克。快递寄到和平饭店前台。': "The arm's turned. 6061, 1.2 wall, forty-one grams. Couriered to the Peace Hotel front desk.",
  '阿凯': 'Kai', '老陈': 'Old Chen', '小叶': 'Xiao Ye', '阿哲': 'Zhe',
};

// ---- what the model is told when you talk to someone (added to world/story.js storyContext) ----
export function workContext(L) {
  const s = summary(L); if (!s.grade) return '';
  return `He is also building a product of his own, a pocket phone gimbal for night photography: it is at version ${s.rev}, ${s.hands ? `${pl(s.hands, 'person')} on the Bund ${s.hands === 1 ? 'has' : 'have'} tried it` : 'nobody has tried it yet'}${s.list ? `, ${pl(s.list, 'name')} on his waiting list` : ''}${s.open.length ? `; still wrong with it: ${s.open.map((i) => ISSUE_TEXT[i].name.en.toLowerCase()).join(', ')}` : ''}.`;
}

// ---- Act III: what Dad makes of it (world/story.js puts this into the dinner) ----
// He would take the arm on at the works: when it's heavy, or still plastic after you've hollowed it
export const needsArm = (L) => hasProduct(L) && !studio(L).fixes.some((f) => f.id === 'alloy') && (specs(L).grams > HEAVY_AT - 20);
const lastLine = (L) => { const P = studio(L).pages; return Object.keys(P).map(Number).sort((a, b) => b - a).map((k) => P[k].line).find(Boolean) || null; };
// -> script beats: his question if Mum told him, then the choice to put it on the table (or not).
// What he says is read off the thing itself: the versions, whose hands, the fault he'd find
// himself, the notebook, who wants one, the sums. d: what it does to how he feels.
export function dinnerWork(L) {
  if (!hasProduct(L)) return [];
  const s = summary(L), S = studio(L), told = !!L.flags.toldMumWork, hinge = S.fixes.some((f) => f.id === 'hinge');
  const lines = [], say = (who, zh, en) => lines.push([who, zh, en]);
  let d = 0;
  say('dad', '（他拿起来，翻过去看了看底，又在手里掂了掂。）', '(He picks it up, turns it over to look at the base, weighs it in his hand.)');
  // the versions
  if (s.rev <= 1) say('dad', '第一版。', 'The first version.');
  else { say('dad', `改过 ${s.rev - 1} 回了。看得出来，这儿的孔挪过位置。`, `You've reworked it ${s.rev - 1 === 1 ? 'once' : s.rev - 1 === 2 ? 'twice' : `${s.rev - 1} times`}. I can see it: these holes have been moved.`); if (s.rev >= 3) d += 1; }
  // whose hands
  say('dad', '有人用过吗？', 'Has anyone used it?');
  if (s.hands === 0) { say(null, '还没有。', 'Not yet.'); say('dad', '没人用过的东西，厂里叫样件，不叫产品。', "A thing nobody has used: at the works we call that a sample. Not a product."); d -= 1; }
  else if (s.hands < 6) { say(null, `给 ${s.hands} 个人试过。`, `${pl(s.hands, 'person')} ${s.hands === 1 ? 'has' : 'have'} tried it.`); say('dad', '少了点。比没有强。', 'Not many. Better than none.'); }
  else { say(null, `${s.hands} 个人。外滩上，天黑以后，一个一个借出去的。`, `${s.hands} people. On the Bund after dark, lent out one at a time.`); say('dad', '……一个一个借的。', '...One at a time.'); d += 2; }
  // the fault he finds himself
  if (hinge) {
    say('dad', '这个销子是打印的。磨两个月就旷了。得车一个，淬火。', "This pin's printed. Two months of wear and it'll be sloppy. It wants turning in steel, and hardening.");
    if (S.pinTold) { say(null, '江边有个退休的老车工，也是这么说的。', 'There\'s a retired lathe hand down by the river who said exactly that.'); say('dad', '……那他是内行。', '...Then he knows his trade.'); d += 1; }
  }
  if (needsArm(L)) say('dad', S.fixes.some((f) => f.id === 'lighten') ? '臂掏空了，还是塑料。换成 6061，壁厚一个二，还能再轻四十克。' : '沉。这个臂是实心打印的吧。铝的，壁厚一个二，能轻一大截。',
    S.fixes.some((f) => f.id === 'lighten') ? "You've hollowed the arm, but it's still plastic. In 6061 with a 1.2 wall it would lose another forty grams." : "Heavy. This arm's printed solid, isn't it. In aluminium, 1.2 wall, it would lose a good deal.");
  else if (!hinge && s.open.includes('drift')) say('dad', '轴向有旷量。你自己晃晃。', "There's play along the axis. Rock it yourself.");
  else if (!hinge && s.open.length) { say('dad', `还有 ${s.open.length} 处毛病没改。你自己都记着吧？`, `${pl(s.open.length, 'fault')} still not put right. You've got them written down?`); say(null, '都记着。', 'All written down.'); }
  else if (!hinge && s.solved.length >= 3) { say('dad', '……挑不出大毛病。公差是塑料的公差，别的没什么。', "...I can't find much wrong with it. The tolerances are plastic's tolerances. Otherwise, nothing."); d += 2; }
  // the notebook
  if (s.pages >= 2) {
    say('dad', `（他翻了翻你的本子。）${s.pages} 页。每天都记？`, `(He leafs through your notebook.) ${s.pages} pages. Every day?`);
    const ln = lastLine(L), q = quoteOf(ln, L);
    if (q) { const R = REG[ln.who] || STRANGER; say('dad', `“${q.zh}”这句画了线。谁说的？`, `"${q.en}" You've underlined that. Who said it?`); say(null, R.who.zh, R.who.en); say('dad', R.dadSays.zh, R.dadSays.en); }
    d += 1;
  }
  // who wants one
  if (s.hands > 0) {
    say('dad', '有人要吗？', 'Does anyone want one?');
    if (s.list === 0) { say(null, '还没有。', 'Not yet.'); say('dad', '那就还不是生意。', "Then it isn't a business yet."); d -= 1; }
    else if (s.deposits > 0) { say(null, `名单上 ${s.list} 个人，一共 ${s.units} 台。有人付了定金。`, `${pl(s.list, 'name')} on the list, ${pl(s.units, 'unit')} between them. One has paid a deposit.`); say('dad', '付了钱的才算数。……有一个，也是数。', "Only the ones who've paid count. ...One is still a number."); d += 2; }
    else if (s.list >= 4) { say(null, `名单上 ${s.list} 个人。`, `${s.list} names on the list.`); say('dad', '留名字不是给钱。不过，是个开头。', "A name isn't money. Still, it's a start."); d += 1; }
    else { say(null, `${s.list} 个人留了名字。`, `${pl(s.list, 'person')} left ${s.list === 1 ? 'a name' : 'their names'}.`); say('dad', '嗯。', 'Mm.'); }
  }
  // the sums
  if (s.rev >= 2 || s.list) {
    say('dad', '卖多少？成本多少？', 'What do you sell it for? What does it cost you?');
    if (s.margin < 0) { say(null, `卖 ${s.price}，零件 ${s.bom}。`, `¥${s.price}. The parts come to ¥${s.bom}.`); say('dad', `卖一台亏一台。五十台的量，零件能谈到 ${s.batch}。这个账你还没算。`, `You lose money on every one. At fifty sets the parts come down to about ¥${s.batch}. You haven't done that sum yet.`); }
    else { say(null, `卖 ${s.price}，零件 ${s.bom}。`, `¥${s.price}. The parts come to ¥${s.bom}.`); say('dad', '单台就不亏。量上去还能降。账你算过了。', "It doesn't lose money even one at a time, and volume brings it down. You've done the sums."); d += 1; }
  }
  // what it comes to
  if (s.grade >= 4) { say('dad', '这东西，是用的人一句一句教你改出来的。……你在那边学的，原来是这个。', "The people who use this taught you how to make it, one remark at a time. ...So that is what you learned over there."); d += 2; }
  else if (s.grade === 3) { if (s.list) say('dad', '改了几版，有人用，有人要。……像回事了。', "Several versions. People using it, people wanting it. ...It's starting to look like something.");
    else say('dad', '改了几版，有人用过，毛病一条一条在改。……像回事了。', "Several versions, people have had it in their hands, the faults coming out one at a time. ...It's starting to look like something."); d += 1; }
  else if (s.grade === 2) say('dad', '才开了个头。开了头，就别放下。', "It's a beginning. Now you've begun, don't put it down.");
  else say('dad', '一个星期，一台样件。', 'One week. One sample.');
  d = Math.max(-2, Math.min(8, d));
  return [
    ...(told ? [['dad', '你妈说，你在上海做了个拍照用的东西。带来了吗？', "Your mother says you've made something in Shanghai. For taking photographs. Did you bring it?"]] : []),
    { ask: [
      { zh: '（把云台放到桌上）爸，你看看这个。', en: '(Put the gimbal on the table.) Dad, have a look at this.', d, flag: 'showedWork', then: lines },
      { zh: '（先不拿出来）', en: '(Leave it in your pocket.)', d: told ? -1 : 0, then: told ? [['dad', '……不想给我看，就算了。', "...If you'd rather not show me, never mind."]] : [] },
    ] },
  ];
}
// what he adds to his answer once you've chosen (set: stay | home | together | refused; warm: he's come round)
export function dinnerAfter(L, set, warm) {
  if (!L.flags.showedWork || !hasProduct(L)) return { then: [], flag: null };
  const s = summary(L), arm = needsArm(L);
  if (set === 'stay' && warm && arm) return { then: [['dad', '那个臂的图纸发我。厂里一下午的事。', "Send me the drawing for that arm. It's an afternoon's work for the shop."]], flag: 'dadMachines' };
  if (set === 'home' && s.grade >= 2) return { then: [['dad', '那个东西带回去。厂里有地方，接着做。', "Bring that thing with you. There's room at the works. Keep at it."]], flag: arm ? 'dadMachines' : null };
  if (set === 'together' && arm) return { then: [['dad', '你那个云台的臂，图纸一起带来。', 'And bring the drawing for the arm of that gimbal of yours.']], flag: 'dadMachines' };
  if (set === 'refused' && s.grade >= 3) return { then: [['dad', '机械臂是别人的事。桌上这个，才是你的。先把它做成。', "The robot arm is someone else's affair. The thing on this table is yours. Make that work first."]], replace: true, flag: null };
  return { then: [], flag: null };
}

// ---- what each ending adds, afterwards (the six endings themselves are world/story.js's) ----
export function epilogue(L, id) {
  if (!hasProduct(L)) return null;
  const s = summary(L), S = studio(L), chen = S.list.some((e) => e.who === 'chen'), ye = S.list.some((e) => e.who === 'ye'), arm = !!L.flags.dadMachines;
  const g = s.grade;
  if (id === 'apart') return B('那台云台他没见到。它还在你外套口袋里，电是满的。', 'He never saw the gimbal. It is still in your jacket pocket, fully charged.');
  if (id === 'together') return g >= 3 ? B(`厂里腾出来的那条小线，先做的是你的云台支臂。${s.list ? `名单上的 ${s.list} 个人，在春天收到了货。` : ''}`, `The small line they cleared at the works turned your gimbal's arms first. ${s.list ? `${s.list === 1 ? 'The one person' : `The ${s.list} people`} on your list had ${s.list === 1 ? 'hers' : 'theirs'} by spring.` : ''}`.trim())
    : B('你那台云台停在了工作台的角上。机械臂的事太多，它排在后面。', "Your own gimbal sits at the corner of the bench. The robot arm takes everything; it waits its turn.");
  if (id === 'stay') return g >= 3 ? B(`${arm ? '一月，南京寄来一个盒子：二十根铝支臂，每根四十一克，没有附一个字。' : ''}杨浦的厂房里，第一批夜行云台装了箱。${chen ? '名单上第一个名字是老陈。他那台你没打算收钱，他硬塞了两百。' : ye ? '小叶的两台，你是自己送到江边去的。' : s.list ? `名单上的 ${s.list} 个人，一个一个发了货。` : '还没有人下单。头一台该拿给谁看，你心里有数。'}`,
      `${arm ? 'In January a box comes from Nanjing: twenty aluminium arms, forty-one grams each, and not a word with them. ' : ''}In the Yangpu unit the first batch of night gimbals goes into boxes. ${chen ? "The first name on the list is Old Chen's. You meant his to be free; he pushed two hundred yuan into your hand anyway." : ye ? "Xiao Ye's two you carry down to the river yourself." : s.list ? `The ${s.list === 1 ? 'one person' : `${s.list} people`} on the list ${s.list === 1 ? 'gets theirs' : 'get theirs, one parcel at a time'}.` : 'Nobody has ordered one yet. You know whose hands the first should go into.'}`)
    : g === 2 ? B(`工作台上那台云台停在第 ${s.rev} 版。还差什么，你本子上都写着。`, `The gimbal on your bench has stopped at version ${s.rev}. What it still lacks is all in your notebook.`)
      : B('厂房租下来了。那台只做了一版的云台，摆在窗台上。', 'The unit is rented. The gimbal, built once and never changed, sits on the windowsill.');
  if (id === 'alone') return g >= 3 ? B(`他没来电话。${ye ? '小叶的两台，你按时交了货。' : s.list ? `名单上的 ${s.list} 个人，你一个一个回了消息。` : '江边那几个人，还等着看下一版。'}至少这一件事，是做成了的。`, `He doesn't call. ${ye ? "Xiao Ye's two units go out on time." : s.list ? `You write to ${s.list === 1 ? 'the one person' : `the ${s.list} people`} on the list${s.list === 1 ? '' : ', one by one'}.` : 'The people by the river are still waiting to see the next version.'} This one thing, at least, you have made work.`)
    : B(`那台云台停在第 ${s.rev} 版。厂房里很安静，你一个人接着改。`, `The gimbal has stopped at version ${s.rev}. The unit is very quiet. You go on with it alone.`);
  if (id === 'home') return g >= 2 ? B(`云台的图纸跟着你回了南京。${s.list ? `名单上的 ${s.list} 个人，你一个一个回了消息：会晚一点，但会做出来。` : ''}厂里的老师傅看了一眼${arm ? '支臂' : '销子'}的图，说：“这个简单。”`,
      `The gimbal's drawings go home to Nanjing with you. ${s.list ? `You write to ${s.list === 1 ? 'the one person' : `the ${s.list} people`} on the list${s.list === 1 ? '' : ', one by one'}: it will be late, but it will be made. ` : ''}The old hand at the works glances at the drawing of the ${arm ? 'arm' : 'pin'} and says, "That's easy."`)
    : B('那台只做了一版的云台，你放进了行李箱的夹层。', 'The gimbal, built once and never changed, goes into the lining pocket of your suitcase.');
  if (id === 'open') return g >= 2 ? B('口袋里那台云台还有电。明天傍晚，老陈还会在海关钟的对面。', 'The gimbal in your pocket still has charge. Tomorrow at dusk Old Chen will be opposite the Customs clock again.')
    : B('口袋里那台云台，除了你，还没几个人用过。', 'Hardly anyone but you has used the gimbal in your pocket.');
  return null;
}

// ---- small things the screens say ----
export const tonightLines = (L) => tonight(L).map((t) => ({ ...t, name: REG[t.id].name, hours: REG[t.id].hours, role: REG[t.id].role }));
export const heardToday = (L) => todays(L).filter((t) => t.kind !== 'dead').length;
export { REGULARS, FIXES };
