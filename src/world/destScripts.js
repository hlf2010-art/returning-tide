// What is said in the two rooms a DiDi takes you up to (world/destinations.js builds the rooms and
// runs these). Pure data and rules, so they can be played in node (tests/skillScenes.test.mjs).
//   [who, zh, en] lines (a fourth element { drop: true } makes the arm drop its part on that line)
//   { ask: [answers] }  up to four, chosen with 1-4; the last is the silent one (and the default
//                       when he says nothing). An answer: { zh, en, d (how the friend feels), flag
//                       (remembered in life.flags[placeId + 'Said']), gain { ai, hw, product }
//                       (engine/skills.js experience), ach (an achievement), needs / else
//                       (world/skillChoices.js), then: [lines] }
// The robot-arm review is where Ji Bai is more than one kind of engineer: the bench answer (softer
// pads), the data answer (log it at a kilohertz), the sensing answer (a slip sensor and a small
// model on the controller), the vision answer (a grasp-point model), the product answer (does the
// customer need forty?). What he chose is armRoute(L), and the demo, the quest and his friends follow it.
import { nudge } from '../engine/life.js';
import { skillLevel } from '../engine/skills.js';
import { achieve } from '../engine/maker.js';
import { visible, award } from './skillChoices.js';

export const YINUO = [
  ['agent', '纪先生是吧？程小姐在里面等您。这套是顶层，三百二十平，整层就这一户。', "Mr Ji? Ms Cheng's inside. Top floor, three hundred and twenty square metres, the only flat on the floor."],
  ['yinuo', '来了。', 'You came.'],
  ['yinuo', '家里想让我在上海有个落脚的地方。他们看中的是这个景。', "My family want me to have somewhere in Shanghai. It's the view they're buying."],
  ['yinuo', '你是学设计的。除了景，这房子还有什么？', 'You studied design. Apart from the view, what is there to this place?'],
  { ask: [
    { zh: '窗框太粗，把江切成一格一格的。层高三米六，吊顶一做就压了。', en: "The mullions are too heavy, they cut the river into panels. And it's three point six metres: put a ceiling in and it'll feel low.", d: 3, flag: 'faults',
      then: [['yinuo', '……中介没说过这个。', "...The agent didn't mention that."], ['yinuo', '你还是这样，看东西先看毛病。', "You haven't changed. You always see the faults first."]] },
    { zh: '景是真的好。', en: 'The view really is good.', d: 0, then: [['yinuo', '嗯。所有人都这么说。', 'Mm. Everyone says that.']] },
    { zh: '你自己想住这儿吗？', en: 'Do you want to live here, though?', d: 2, flag: 'asked', then: [['yinuo', '……没人问过我这个。', "...Nobody's asked me that."]] },
    { zh: '（看江，不说话）', en: '(Look at the river. Say nothing.)', d: 1, then: [['yinuo', '你也不说话。', "You're not saying anything either."], ['yinuo', '那就好。中介说得够多了。', 'Good. The agent talks enough.']] },
  ] },
  ['agent', '程小姐，业主那边说价格还能谈，一点八个亿是挂牌价。', "Ms Cheng, the owner says there's room on the price. A hundred and eighty million is only the asking."],
  ['yinuo', '我再想想。', "I'll think about it."],
  ['yinuo', '你觉得呢？买不买？', 'What do you think? Should I buy it?'],
  { ask: [
    { zh: '别买。你要的不是一个景，是一个你自己选的地方。', en: "Don't. You don't need a view. You need somewhere you chose yourself.", d: 4, flag: 'own',
      then: [['yinuo', '……你回来才几天，就开始管我了。', "...You've been back, what, three days, and you're already telling me what to do."]] },
    { zh: '买。这个位置十年后只会更贵。', en: 'Buy it. This only goes up in ten years.', d: 0, flag: 'buy', then: [['yinuo', '你跟我爸一个口气。', 'You sound like my father.']] },
    { zh: '先租一年住住看。', en: 'Rent somewhere for a year first and see.', d: 2, flag: 'rent', then: [['yinuo', '租。程家的人租房子。', 'Rent. A Cheng, renting.'], ['yinuo', '……也不是不行。', '...Not impossible, I suppose.']] },
    { zh: '（不说话）', en: '(Say nothing.)', d: 1, then: [['yinuo', '好。你不说，我自己定。', "Fine. If you won't say, I'll decide myself."]] },
  ] },
  ['yinuo', '走吧。……我还要跟中介谈，你自己打车。', "Go on. ...I've still got to talk to the agent. Get yourself a car."],
];

// ---- IFC 32F: the prototype review ----
export function XUAN(L) {
  const rusty = !!L && skillLevel(L, 'hw') < 2;                 // he lands out of practice at the bench
  return [
    ['xuan', '白白！来来来。这是周学长，我们学校机械系的，现在做协作机械臂。', "Baibai! Come in. This is Zhou, a senior from our university, mechanical engineering. Cobots now."],
    ['founder', '你好你好。明轩说你在湾区做过产品。', 'Hi, hi. Mingxuan says you built products in the Bay Area.'],
    ['founder', '问题是这样：速度上到每分钟四十次，夹爪就开始掉件。电机、控制都查过了。客户月底要看演示。', "Here's the thing. Once we're up to forty picks a minute, the gripper starts dropping parts. We've been through the motors and the control loop. The customer wants a demo at the end of the month."],
    ['founder', '你看，就是这样。', 'Watch. There it goes.', { drop: true }],
    { ask: [
      { zh: '掉件都在转腕那一下。是加速度，不是夹力：指尖太硬，没有顺应。换软一点的指垫，或者把腕部的急转平滑掉。', en: "It always lets go on the wrist turn. That's acceleration, not grip: the fingertips are too stiff, there's no compliance. Softer pads, or smooth the jerk out of the wrist move.", d: 4, flag: 'fix', gain: { hw: 60 }, ach: 'fixer', why: 'fix:arm',
        then: [['founder', '……指垫。我们一直在加夹力。', '...The pads. We kept turning up the grip force.'], ['engineer', '我去拿硅胶的那套！', "I'll get the silicone set!"]] },
      { zh: '先别猜。把电机电流和夹爪位置按一千赫兹记下来，掉件一定对得上转腕那一下的冲击。采集脚本我今晚写给你。', en: "Don't guess. Log the motor currents and the gripper's position at a kilohertz, and the drops will line up with the jerk on the wrist turn. I'll write you the script tonight.", d: 3, flag: 'data', gain: { ai: 40 }, needs: { ai: 2 },
        then: [['founder', '……一千赫兹。我们一直是拿眼睛看的。', "...A kilohertz. We've been going on what we could see."], ['engineer', '控制器上有个调试串口，我现在就给你引出来！', "There's a debug port on the controller. I'll bring it out for you now!"]],
        else: { zh: '我得多看几次才敢说。', en: "I'd need to watch it a few more times.", d: 1, then: [['founder', '没问题，你随便看。', 'Sure. Take your time.']] } },
      { zh: '客户真的需要每分钟四十次吗？', en: 'Does the customer actually need forty a minute?', d: 2, flag: 'spec', gain: { product: 40 }, then: [['xuan', '……好问题。合同里写的是三十。', '...Good question. The contract says thirty.'], ['founder', '四十是我们自己加的……', 'Forty was our own idea...']] },
      { zh: '（看着它，不说话）', en: '(Watch it. Say nothing.)', d: 0, then: [['xuan', '他就这样，看东西不说话，说了就准。', "He's like this. Quiet while he looks, and then he's right."]] },
    ] },
    ['founder', '就算指垫换了，零件也不是一个样：有的带油，有的重心偏。一分钟四十次，换你是我，下一步怎么走？', "Even with new pads, the parts aren't all alike. Some come oily, some have the weight off-centre. Forty a minute: if you were me, what would you do next?"],
    { ask: [
      { zh: '指尖里埋一片滑移传感器，控制器上跑一个小模型：零件开始滑的那几毫秒，它把夹力收紧，稳住了再松。', en: 'Put a slip sensor in the fingertip and run a small model on the controller. In the few milliseconds when a part starts to slide, it tightens the grip, and eases off once the part is steady.', d: 3, flag: 'sense', gain: { ai: 40, hw: 30 }, needs: { ai: 3 },
        then: rusty
          ? [['engineer', '模型我信。可指尖谁来做？一平方厘米里面又要走线又要焊。', "The model I believe. But who builds the fingertip? That's wiring and soldering in a square centimetre."], ['xuan', '他。只是他自己还不知道。', "Him. He just doesn't know it yet."]]
          : [['engineer', '压电薄膜我抽屉里就有一卷。', "I've got a roll of piezo film in my drawer."], ['founder', '传感器我们装，模型你写？', 'We fit the sensor and you write the model?']] },
      { zh: '给它装上眼睛。托盘上方一个相机，训一个抓取点模型：每个零件挑最好夹的地方下手，不是每次都死抓正中间。', en: "Give it eyes. A camera over the tray and a grasp-point model, so it takes each part where it's easiest to hold instead of dead centre every time.", d: 3, flag: 'vision', gain: { ai: 40 }, needs: { ai: 3 },
        then: [['founder', '相机我们有，一直只拿来数个数。', "We've got a camera. We only ever used it for counting."], ['engineer', '那标注谁来做？几千张图呢。', "And who labels the pictures? There'll be thousands."], ['xuan', '他在湾区就是干这个的。标注这种事，他会让机器自己标。', "That's what he did in the Bay Area. Labelling, he'll get the machine to do it itself."]] },
      { zh: '先把指垫换了，看数据再说。一次只改一处。', en: 'Change the pads first and see what the numbers say. One change at a time.', d: 2, flag: 'onestep', gain: { product: 20 },
        then: [['founder', '一次只改一处。我们上个月一次改了五处。', 'One change at a time. Last month we changed five things at once.']] },
      { zh: '（不说话）', en: '(Say nothing.)', d: 0, then: [['founder', '……好，我们先自己试试。', "...All right. We'll try a few things ourselves first."]] },
    ] },
    ['xuan', '怎么样，有没有兴趣？他们缺一个懂产品又懂工程的人。', 'So, interested? They need someone who gets product and engineering both.'],
    { ask: [
      { zh: '可以先当顾问，帮你们把演示做出来。', en: 'I can advise for now. Get the demo working.', d: 3, flag: 'advisor', then: [['founder', '太好了！', 'Brilliant!'], ['xuan', '我就知道。', 'Knew it.']] },
      { zh: '我刚回来，还没想好要做什么。', en: "I've only just got back. I haven't decided what I'm doing.", d: 0, then: [['xuan', '理解，不急。', 'Fair enough. No rush.']] },
      { zh: '你是想让我帮你看这个项目值不值得投吧？', en: "You want me to tell you whether it's worth investing in, don't you?", d: 2, flag: 'saw', then: [['xuan', '被你看穿了。两件事都想。', "You've got me. Both, honestly."]] },
      { zh: '（不说话）', en: '(Say nothing.)', d: 0, then: [['xuan', '行，你回去想想。资料我发你。', "OK, think about it. I'll send you the deck."]] },
    ] },
    ['xuan', '晚上一起吃饭？……算了，你先回去倒时差。', "Dinner tonight? ...Actually no. Go home and sleep off the jet lag."],
  ];
}

// what he did about the arm, from what he said at the review:
//   fix   'slip' (the fingertip sensor and its model) | 'vision' (the grasp-point model, from his
//         logs if he asked for them) | 'pads' | 'spec' (thirty a minute, not forty) | null
//   data  he asked for the kilohertz logs;  code  the fix is software he wrote
export function armRoute(L) {
  const s = (L && L.flags && L.flags.lujiazuiSaid) || [], has = (f) => s.includes(f);
  const fix = has('sense') ? 'slip' : has('vision') || has('data') ? 'vision' : has('fix') || has('onestep') ? 'pads' : has('spec') ? 'spec' : null;
  return { fix, data: has('data'), code: fix === 'slip' || fix === 'vision' };
}

// ---- demo day (if he said he'd advise): the arm runs clean in front of the customer and an investor ----
const DEMO_INTRO = {
  pads: ['founder', '王总，这位就是纪白，指垫的主意是他出的。', 'Mr Wang, this is Ji Bai. The pads were his idea.'],
  logs: ['founder', '王总，这位是纪白。相机上那个抓取点模型是他写的，训练数据是他的日志自己标出来的：每掉一次件，就是一条标签。', 'Mr Wang, this is Ji Bai. The grasp-point model on the camera is his, and the training data labelled itself from his logs: every dropped part was a label.'],
  vision: ['founder', '王总，这位是纪白。相机上那个抓取点模型是他写的，三个晚上，用的是我们自己的零件。', 'Mr Wang, this is Ji Bai. The grasp-point model on the camera is his. Three nights, on our own parts.'],
  slip: ['founder', '王总，这位是纪白。指尖里的滑移传感器，还有跑在上面的那个小模型，是他写的。', "Mr Wang, this is Ji Bai. The slip sensor in the fingertips, and the little model that runs on it: that's his."],
  spec: ['founder', '王总，这位是纪白。是他让我们回去翻合同：客户要的是三十，不是四十。', "Mr Wang, this is Ji Bai. He's the one who sent us back to the contract: the customer wants thirty, not forty."],
  none: ['founder', '王总，这位是纪白，这两周一直在帮我们。', "Mr Wang, this is Ji Bai. He's been helping us these two weeks."],
};
export function XUAN_DEMO(L) {
  const r = armRoute(L), intro = DEMO_INTRO[r.fix === 'vision' && r.data ? 'logs' : r.fix || 'none'];
  return [
    ['xuan', '来了！今天你也是主角。', 'You made it! You\'re part of the show today.'],
    intro,
    // where his side of it is tested in front of the money
    ...(r.fix === 'vision' ? [
      ['engineer', '第十七个是镀铬件，灯一照就反光……', 'Number seventeen is chrome. Under the lamp it shines...'],
      ['investor', '它停了一下。', 'It paused.'],
      ['founder', '没把握的时候它就放慢，换个角度再看一眼。这条规矩也是他定的。', "When it isn't sure it slows down and takes another look from a different angle. That rule was his too."],
    ] : r.fix === 'slip' ? [
      ['engineer', '这一批我故意抹了油。', 'I oiled this batch on purpose.'],
      ['investor', '……听见了吗？它自己收紧了。', '...Did you hear that? It tightened by itself.'],
    ] : []),
    r.code ? ['investor', '三十个件，一个没掉。年轻人，你是做硬件的，还是做算法的？', 'Thirty parts, not one dropped. Young man, are you hardware or algorithms?']
      : ['investor', '三十个件，一个没掉。年轻人，你是做硬件的？', 'Thirty parts, not one dropped. Young man, you do hardware?'],
    { ask: [
      { zh: '学认知科学的，在湾区做了几年 AI 产品。', en: 'Cognitive science. I spent a few years on AI products in the Bay Area.', d: 3, flag: 'pitch', then: [['investor', '你们那个产品我用过。有空聊聊，我请。', 'I\'ve used that product of yours. Let\'s talk sometime, my treat.']] },
      r.code ? { zh: '两样都沾。臂是他们做的，告诉它怎么夹的那段代码是我写的。', en: 'A bit of both. The arm is theirs. The code that tells it how to hold is mine.', d: 2, flag: 'both', gain: { product: 10 }, then: [['investor', '软硬都沾的人，现在不好找。', 'People who do both are hard to find these days.']] }
        : { zh: '我只是提了个建议。', en: 'I only made a suggestion.', d: 1, then: [['investor', '好的建议值钱。', 'Good suggestions are worth money.']] },
      { zh: '是他们团队做得好。', en: 'The team did the work.', d: 2, flag: 'modest', then: [['founder', '他太谦虚了。', 'He\'s being modest.']] },
      { zh: '（点点头，不说话）', en: '(Nod. Say nothing.)', d: 0, then: [['investor', '话不多，我喜欢。', 'Not a talker. I like that.']] },
    ] },
    // a model in the loop: what wins him the room, or what makes it harder
    ...(r.code ? [
      ['investor', '模型放在环路里。它错了怎么办？客户的产线上可没有你守着。', "A model in the loop. What happens when it's wrong? You won't be standing next to the customer's line."],
      { ask: [
        { zh: '它跑在臂自己的控制器上，八毫秒一次，不联网。没把握就放慢，放慢还不够就停下来叫人。每停一次都记下来，拿去训下一版。', en: "It runs on the arm's own controller: eight milliseconds a pass, no network. If it isn't sure it slows down, and if that isn't enough it stops and calls a person. Every stop is logged and goes into training the next version.", d: 3, flag: 'onDevice', gain: { ai: 30, product: 10 },
          then: [['investor', '……不联网，没把握就停下来叫人。这句话比三十个件值钱。', "...No network, and when it isn't sure it stops and calls a person. That's worth more than thirty parts."]] },
        { zh: '说实话，现在的数据只有我们自己这几种件。上客户的线之前，得在他们那儿采一个月的真数据。您投之前，最好知道这个。', en: "Honestly, so far the data is only our own handful of parts. Before it goes on a customer's line it needs a month of real data from theirs. Before you invest, you ought to know that.", d: 2, flag: 'month', gain: { product: 30 },
          then: [['investor', '头一回有人在演示当天劝我慢点投。', "That's the first time anyone has told me to slow down on demo day."], ['xuan', '（小声）你疯了？', '(Under his breath) Are you mad?'], ['investor', '一个月以后，你们再来找我。', 'Come and find me in a month.']] },
        { zh: '它会自己学。每夹一次，就准一点。', en: 'It learns by itself. Every pick makes it a little better.', d: 0, flag: 'hype',
          then: [['investor', '今年什么东西都说自己会学。把失败的那些给我看看。', 'Everything learns by itself this year. Show me the ones it got wrong.'], ['founder', '……失败的日志在这儿。', "...The failure logs are here."]] },
        { zh: '（看向周学长，不说话）', en: '(Look at Zhou. Say nothing.)', d: 0, then: [['founder', '我们会在客户现场加一个月的数据采集。', "We'll add a month of data collection at the customer's site."]] },
      ] },
    ] : []),
    ['xuan', '今晚庆功，必须来。', 'Celebration tonight. No excuses.'],
  ];
}
export const SCRIPTS = { 'yinuo-flat': () => YINUO, 'xuan-arm': (L) => XUAN(L), 'xuan-demo': (L) => XUAN_DEMO(L) };
export const NAMES = { investor: ['王总', 'Mr Wang'], agent: ['中介', 'Agent'], yinuo: ['程以诺', 'Yinuo'], xuan: ['陆明轩', 'Mingxuan'], founder: ['周学长', 'Zhou'], engineer: ['工程师', 'Engineer'] };
export const WHO = { yinuo: 'yinuo', xuan: 'xuan' };

// the answers he can give to an ask, as he is now (world/skillChoices.js)
export const answers = (L, ask) => visible(L, ask);
// he says it: how the friend feels, what's remembered, what it teaches. -> { gains, ach }
export function choose(L, placeId, who, a, i = 0) {
  const key = `${placeId}:${a.flag || i}`;
  if (a.d) nudge(L, who, a.d, key);
  if (a.flag) (L.flags[`${placeId}Said`] ||= []).push(a.flag);
  const gains = award(L, a.gain, a.why || key);
  const ach = a.ach ? achieve(L, a.ach) : null;
  return { gains, ach };
}
// what the arm shows when you look closer, once it's running clean
export function armNote(L) {
  const f = armRoute(L).fix;
  return f === 'vision' ? { zh: '相机先看一眼，挑好下手的地方再夹。一个都没掉。', en: 'The camera looks first and picks the best place to take hold. Not one dropped.' }
    : f === 'slip' ? { zh: '指尖一觉出滑，夹力就收紧。一个都没掉。', en: 'The moment the fingertips feel a slip, the grip tightens. Not one dropped.' }
      : { zh: '换了硅胶指垫以后，一个都没掉。', en: 'With the silicone pads on, it hasn’t dropped one.' };
}
