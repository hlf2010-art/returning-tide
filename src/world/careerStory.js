// The year as a story: the quests of Acts I-IV and the watch-repairer's side story (engine/quests.js
// runs them beside world/story.js's), the dinner of Act V made aware of the year, what each ending
// says after it, and what the people he talks to freely are told. Pure, like world/story.js.
import { stamp, relation } from '../engine/life.js';
import { isYear, year, career, rep, lifeContext, factsAbout, dateText, FINAL_DAY } from '../engine/year.js';
import { dinnerWork, dinnerAfter } from './work.js';
import { work, story, startup, viable, home, hasFlat, handoff, inLimbo, dayName, LISTINGS, FIRM, NEWCO, WORKS, CLIENT, STARTUP_PRODUCTS, ROADS, FIRM_SCENES, todaysWork } from './career.js';

const B = (zh, en) => ({ zh, en });
const D = (day, h, m = 0) => day * 1440 + h * 60 + m;
const DIDI = { x: -3.2, z: -18.5, label: B('打车点（或南京东路站，地铁 2 号线）', 'DiDi pickup (or East Nanjing Road station, Line 2)') };
const STALL = { x: -57, z: -5.7, label: B('汉口路 · 修表摊', "Hankou Road · the watch-repairer's stall") };
const sceneDone = (L, id) => Object.values(work(L).days).some((r) => r.scene === id);
const firmDay = (id) => FIRM_SCENES.find((s) => s.id === id).day;
const step = (id, text) => ({ id, optional: true, text, target: DIDI, wait: () => D(firmDay(id), 8, 30), done: (L) => sceneDone(L, id), fail: (L) => L.clock.day > firmDay(id) });
const TRACK_NAME = { consulting: B('留在迈芬', 'Staying at Marlowe Finch'), switched: B('屿深科技', 'Yushen Technology'), startup: B('自己的公司', 'A company of his own'), family: B('回厂', 'The family works'), resigned: B('辞职之后', 'After resigning'), laidoff: B('被裁之后', 'After the lay-off') };
const roadN = (L) => { const W = work(L), t = career(L).track; return W.road && W.road.track === t ? W.road.n : 0; };
const roadStep = (i) => ({ id: `r${i + 1}`, optional: true,
  text: (L) => { const r = ROADS[career(L).track]; return r && r[i] ? B(`${TRACK_NAME[career(L).track].zh} · ${r[i].title.zh}（工作日去上班）`, `${TRACK_NAME[career(L).track].en} · ${r[i].title.en} (go to work on a working day)`) : B('（这条路上没有这一步）', '(Not on this road)'); },
  target: DIDI, done: (L) => roadN(L) > i, fail: (L) => L.clock.day >= FINAL_DAY || (L.clock.day >= 13 && !ROADS[career(L).track] && !inLimbo(L)) });

export const YEAR_QUESTS = [
  // ======== Act I ========
  { id: 'act1-work', act: 1, main: true, giver: 'zhiwei',
    title: B('迈芬的第一周', 'The first week at Marlowe Finch'),
    summary: B('迈芬咨询，国金中心二期 28 层。项目是东澜保险的理赔 AI 助手，项目经理是许知微。工作日去上班；不去，是要算账的。', "Marlowe Finch, IFC Tower 2, 28th floor. The project is an AI claims assistant for Donglan Insurance; the engagement manager is Xu Zhiwei. Go to work on working days. Days you don't are counted."),
    start: (L) => isYear(L) && (stamp(L) >= D(1, 18, 5) || L.clock.day >= 2),
    steps: [
      step('d2', B('11 月 10 日（周二）上午九点半前，到陆家嘴国金中心二期 28 层报到', 'Tuesday 10 November, by 9:30 am: report to the 28th floor of IFC Tower 2 in Lujiazui')),
      step('d3', B('周三：客户启动会', "Wednesday: the client's kick-off")),
      step('d4', B('周四：方案评审', 'Thursday: the design review')),
      step('d5', B('周五：评测表', 'Friday: the evaluation sheet')),
      { id: 'week', text: B('把第一周过完', 'Get through the first week'), done: (L) => L.clock.day >= 7 || (L.clock.day === 6 && L.clock.minute >= 12 * 60) },
    ] },
  { id: 'act1-home', act: 1, giver: 'hr',
    title: B('找个住处', 'Somewhere to live'),
    summary: (L) => (hasFlat(L) ? B(`你租下了${LISTINGS[home(L).id].zh}，每月 ¥${home(L).rent.toLocaleString('en-US')}，房租跟着月份从银行卡走。`, `You have rented ${LISTINGS[home(L).id].en.toLowerCase()} at ¥${home(L).rent.toLocaleString('en-US')} a month. The rent leaves your bank account as the months pass.`)
      : B('公司订的和平饭店只到 12 月 9 日，之后每月 ¥36,000 要自己付。中介会在微信上找你。', 'The firm has the Peace Hotel booked only to 9 December. After that it is ¥36,000 a month, and yours to pay. A letting agent will find you on WeChat.')),
    start: (L) => isYear(L) && L.clock.day >= 2,
    steps: [
      { id: 'agent', text: B('等中介的消息（周三下午以后，看微信）', "Wait to hear from the letting agent (WeChat, from Wednesday afternoon)"), done: (L) => !!L.threads.agent || hasFlat(L) },
      { id: 'rent', optional: true, text: B('在微信上回中介，租下一套', 'Answer the agent on WeChat and take one of the flats'), done: (L) => hasFlat(L), fail: (L) => L.clock.day >= FINAL_DAY },
      { id: 'sleep', optional: true, text: B('回自己租的房子睡一晚（滴滴 → “我的住处”）', 'Spend a night in the flat you rent (DiDi → "My flat")'), target: DIDI, done: (L) => !!work(L).sleptHome, fail: (L) => L.clock.day >= FINAL_DAY || !hasFlat(L) },
    ] },
  // ======== Act II ========
  { id: 'act2-project', act: 2, main: true, giver: 'zhiwei',
    title: B('东澜', 'Donglan'),
    summary: (L) => { const S = story(L); return S.demo ? (S.report ? B('演示出了事，报告交了，试点上了线。剩下的，是谁来担。', 'The demonstration went wrong, the report is in, the pilot is live. What remains is who answers for it.') : B('演示出了事。客户要书面说明，合伙人要一个说得过去的数字。', 'The demonstration went wrong. The client wants it in writing; the partner wants a number that will pass.')) : B('一月十二号，给东澜的董事长现场演示，用他们自己抽的真案卷。', "On 12 January: a live demonstration for Donglan's chairman, on real files they choose themselves."); },
    start: (L) => isYear(L) && L.clock.day >= 7 && !work(L).applied,
    steps: [
      step('d7', B('1 月 11 日（周一）：演示前一天', 'Monday 11 January: the day before the demonstration')),
      step('d8', B('1 月 12 日（周二）：给东澜董事长的现场演示', "Tuesday 12 January: the live demonstration for Donglan's chairman")),
      step('d9', B('2 月 23 日（周二）：整改报告，谁来签', 'Tuesday 23 February: the remediation report, and who signs it')),
      step('d10', B('3 月 9 日（周二）：试点上线两周', 'Tuesday 9 March: two weeks into the pilot')),
      { id: 'spring', text: B('到四月', 'Reach April'), done: (L) => L.clock.day >= 11 },
    ] },
  // ======== Act III ========
  { id: 'act3-turning', act: 3, main: true, giver: 'me',
    title: B('转折', 'The turning point'),
    summary: (L) => { const S = story(L), t = career(L).track; return work(L).applied ? ({ consulting: B('你留下了。', 'You stayed.'), resigned: B('你辞了职。', 'You resigned.'), laidoff: S.gavePlace ? B('你把自己换进了名单，拿了补偿，走了。', 'You put yourself on the list in her place, took the package and left.') : B('你被裁了，拿了补偿。', 'You were laid off, with a package.'), switched: B('你去了屿深科技。', 'You left for Yushen Technology.') }[S.decided] || TRACK_NAME[t]) : B('总部要把上海的 AI 业务“优化”三成。名单周二下午出。留下、辞职、拿补偿走人，还是去别处：这一次得你自己定。', 'Head office is "optimising" thirty per cent of the Shanghai AI practice. The list is out on Tuesday afternoon. Stay, resign, take the package, or go elsewhere: this one is yours to decide.'); },
    start: (L) => isYear(L) && L.clock.day >= 11,
    steps: [
      step('d11', B('4 月 19 日（周一）：去公司', 'Monday 19 April: go to the office')),
      { id: 'decide', text: B('4 月 20 日（周二）：去公司，把话说定', 'Tuesday 20 April: go to the office and settle it'), target: DIDI, wait: () => D(12, 8, 30), done: (L) => !!work(L).applied },
    ] },
  // ======== Act IV ========
  { id: 'act4-road', act: 4, main: true, giver: 'me',
    title: B('立足', 'Building a life'),
    summary: (L) => { const c = career(L), s = startup(L), t = c.track;
      if (t === 'startup') return s && s.name ? B(`${s.nameZh}：${s.product ? STARTUP_PRODUCTS[s.product].zh : '还没定做什么'}。账上 ¥${Math.round(s.cash).toLocaleString('en-US')}${s.customer ? '，有了第一个客户' : '，还没有客户'}。`, `${s.name}: ${s.product ? STARTUP_PRODUCTS[s.product].en : 'what it makes is not yet decided'}. ¥${Math.round(s.cash).toLocaleString('en-US')} in the account${s.customer ? ', and a first customer' : ', and no customer yet'}.`) : B('国金中心 32 层，周学长借你的两张桌子。工作日去那儿，把公司办起来。', "IFC, 32nd floor: the two desks Zhou is lending you. Go there on working days and get the company started.");
      if (t === 'family') return B('高铁从虹桥走（滴滴 → 虹桥火车站）。工作日回厂里，看那条新线。', 'The trains go from Hongqiao (DiDi → Hongqiao Station). On working days, go back to the works and look at the new line.');
      if (t === 'switched') return B('屿深科技，世纪大道，14 层：自己说了算的产品。工作日去陆家嘴上班。', 'Yushen Technology, Century Avenue, 14th floor: a product that is yours to decide. Go to Lujiazui on working days.');
      if (t === 'consulting') return B('东澜二期。你带一块工作。工作日去 28 层。', "Donglan, phase two. A workstream of your own. The 28th floor, on working days.");
      return B('没有工作。明轩说 32 楼有两张空桌子；爸爸说厂里的系统一团糟。回哪一条消息，或者都不回，是你的事。', "No job. Mingxuan says there are two empty desks on the 32nd floor. Dad says the system at the works is a mess. Which message you answer, or neither, is up to you."); },
    start: (L) => isYear(L) && !!work(L).applied,
    steps: [
      { id: 'choose', optional: true, text: (L) => (inLimbo(L) ? B('想清楚接下来做什么（看微信：明轩，爸爸）', 'Decide what comes next (WeChat: Mingxuan, Dad)') : B(`这条路：${TRACK_NAME[career(L).track].zh}`, `The road: ${TRACK_NAME[career(L).track].en}`)), done: (L) => !inLimbo(L), fail: (L) => L.clock.day >= FINAL_DAY },
      roadStep(0), roadStep(1), roadStep(2), roadStep(3),
      { id: 'autumn', text: B('到十一月', 'Reach November'), done: (L) => L.clock.day >= FINAL_DAY || !!L.invites.find((i) => i.id === 'dad-dinner') },
    ] },
  // ======== the watch-repairer (Mission One's pouch, afterwards) ========
  { id: 'watch-repairer', giver: 'lin',
    title: B('修表匠', 'The missing watch-repairer'),
    summary: (L) => { const h = handoff(L), W = isYear(L) ? work(L).watch : {};
      if (W.result === 'saved') return B('老周找到了：昆山的医院，中风，五个月的“无名氏”。转让协议是他侄子仿的签名。因为你记得协议上的日期比他失踪晚两天，摊子保住了。', 'Old Zhou has been found: a hospital in Kunshan, a stroke, five months as "name unknown". His nephew forged the transfer. Because you remembered that its date was two days after he vanished, the stall is saved.');
      if (W.result === 'lost') return W.unmet ? B('汉口路的修表摊换了招牌：手机贴膜。老周后来怎样，你没有再听说。', "The stall on Hankou Road has a new sign: phone screen protectors. What became of Old Zhou, you never heard.") : B('老周找到了，人还在。摊子没保住：转让早就办完了，没有人能说清袋子里那张纸上写的是哪一天。', 'Old Zhou has been found, alive. The stall is gone: the transfer went through long ago, and nobody could say what date was on the page in that pouch.');
      return h.outcome === 'opened' ? B('你撕开过封条：一份摊位转让协议，签着老周的名字，日期是 10 月 31 日，比他失踪晚两天。老林看见了破掉的封条。', "You broke the seal: an agreement transferring the stall, signed in Old Zhou's name and dated 31 October, two days after he vanished. Old Lin saw the torn seal.") : B('封条完好地交给了老林。里面写的是什么，你不知道。', 'The seal went to Old Lin intact. What the page inside says, you do not know.'); },
    start: (L) => !!handoff(L),
    steps: [
      { id: 'handed', text: (L) => (handoff(L).outcome === 'opened' ? B('把文件袋交给了老林（封条已破）', 'Handed the pouch to Old Lin (seal broken)') : B('把文件袋交给了老林（封条完好）', 'Handed the pouch to Old Lin (seal intact)')), done: () => true },
      { id: 'daughter', optional: true, text: B('一月以后，汉口路的修表摊前有人在打听老周', "From January, someone is at the stall on Hankou Road asking after Old Zhou"), target: STALL, done: (L) => isYear(L) && !!work(L).watch.met, fail: (L) => !isYear(L) || L.clock.day >= 13 },
      { id: 'news', optional: true, text: B('等消息', 'Wait for news'), done: (L) => isYear(L) && !!work(L).watch.result && !work(L).watch.unmet, fail: (L) => !isYear(L) || !!work(L).watch.unmet || L.clock.day >= FINAL_DAY },
    ] },
];

// ---- Act V: the dinner, a year on. The same table and the same four answers (world/story.js chooses the ending) ----
export function yearDinner(L) {
  const c = career(L), S = story(L), t = c.track, H = home(L), su = startup(L) || {}, demo = !!L.flags.demoDone, W = work(L);
  const told = !!(L.flags.toldDadStudio || L.flags.toldDadPlans);
  const out = [
    ['dad', '坐。菜我点好了，都是你小时候爱吃的。', "Sit down. I've ordered. The things you liked as a boy."],
    { ask: [
      { zh: '爸，你怎么突然来上海了？', en: 'Dad, why the sudden trip to Shanghai?', d: 0, then: [['dad', '嘉定有个供应商，顺路。', 'A supplier in Jiading. It was on the way.']] },
      { zh: '谢谢爸。', en: 'Thanks, Dad.', d: 2, then: [['dad', '嗯。', 'Mm.']] },
      { zh: '这儿挺贵的吧。', en: 'This place must cost a fortune.', d: -1, then: [['dad', H.kind === 'hotel' ? '你在楼上住了一年都不嫌贵，我请你吃顿饭，你倒嫌贵了。' : '一年吃一顿，吃得起。', H.kind === 'hotel' ? "You've lived upstairs for a year without minding the price, and you worry about one dinner?" : 'Once a year. I can afford it.']] },
      { zh: '（坐下，不说话）', en: '(Sit down. Say nothing.)', d: 0, then: [] },
    ] },
    ['dad', '一年了。你妈说你瘦了。', "A year. Your mother says you've lost weight."],
  ];
  const sil = { zh: '（喝口茶）', en: '(Drink some tea.)', d: 0, then: [] };
  if (t === 'consulting') {
    out.push(['dad', `你们那个公司，我托人打听过。四月裁了三成，把你留下了。${S.rating === 3 ? '年底还评了个优。' : ''}`, `That firm of yours: I had someone ask about it. They cut thirty per cent in April and kept you.${S.rating === 3 ? ' And gave you the top rating at the end of the year.' : ''}`]);
    if (S.worksCase === 'took') out.push(['dad', '你们公司来厂里报过价，带队的是你。厂里的成本，他们怎么知道得那么清楚？', 'Your firm came to the works with a quotation, and you led them. How did they know our costs so exactly?']);
    else if (S.worksCase === 'recused') out.push(['dad', '你们公司来厂里报价，老秦说你自己回避了。规矩是对的。', 'Your firm came to quote at the works. Old Qin says you kept yourself out of it. That was the proper thing.']);
    out.push({ ask: [
      S.review ? { zh: '留下不是因为听话。东澜那个项目，拒赔的每一单后面都有人看，是我坚持的。', en: "They didn't keep me for doing as I was told. On the Donglan project, a person reads every rejection. I was the one who held out for that.", d: 3, flag: 'toldDadYear', then: [['dad', '报告上的数是真是假，做厂的人最清楚。……这件事你做得对。', 'Whether the number on a report is true: nobody knows better than a man who runs a works. ...You did right.']] }
        : { zh: '这一年我学会了怎么在大公司里活下来。', en: 'This year I learned how to stay alive inside a big firm.', d: 0, then: [['dad', '活下来是本事。活成什么样，是另一回事。', 'Staying alive is a skill. What you become by it is another matter.']] },
      S.worksCase === 'took' ? { zh: '那件事是我不对。成本的数，我不该带进公司。', en: 'I was wrong there. I should never have carried those costs into the firm.', d: 1, then: [['dad', '……知道就好。', '...So long as you know it.']] }
        : { zh: '给别人打工，打得再好，名字也是别人的。这个我知道。', en: "Work for other people as well as you like, and the name on it is still theirs. I know that.", d: 1, then: [['dad', '知道就好。', 'So long as you know it.']] },
      sil,
    ] });
  } else if (t === 'resigned') {
    out.push(['dad', '听说你四月把工作辞了。没跟家里说。', 'I hear you resigned in April. And said nothing at home.']);
    out.push({ ask: [
      { zh: '他们要我在一份东西上签字，把错推给一个刚毕业的小姑娘。我没签。', en: "They wanted my signature on something that put the blame on a girl a year out of university. I didn't sign.", d: 3, flag: 'toldDadYear', then: [['dad', '……这个字不签是对的。可下回，先跟家里说一声。', '...Not signing was right. But next time, tell us first.']] },
      { zh: '不想做了。', en: "I'd had enough.", d: -1, then: [['dad', '不想做就不做。你今年二十八了。', "Had enough, so you stopped. You are twenty-eight this year."]] },
      sil,
    ] });
  } else if (t === 'laidoff') {
    out.push(['dad', '听说你们公司四月裁员，有你。你妈是从明轩他妈那儿听来的。', "I hear your firm laid people off in April and you were one. Your mother heard it from Mingxuan's mother."]);
    out.push({ ask: [
      S.gavePlace ? { zh: '名单上本来没有我。我把名额换给了组里一个刚毕业的。', en: "I wasn't on the list. I gave my place to someone on the team who was a year out of university.", d: 4, flag: 'toldDadYear', then: [['dad', '……（他看了你很久。）你妈知道了要骂你傻。我不骂。', "...(He looks at you for a long time.) Your mother will call you a fool when she hears. I won't."]] }
        : { zh: '有我。补偿拿了，没什么丢人的。', en: "I was. I took the package. There's no shame in it.", d: 1, then: [['dad', '厂里那年也裁过人。被裁的不丢人，裁人的才睡不着。', 'We had to let men go at the works one year. No shame for the ones let go. It is the one who does it who cannot sleep.']] },
      { zh: '不想提。', en: "I'd rather not talk about it.", d: -1, then: [['dad', '嗯。', 'Mm.']] },
      sil,
    ] });
  } else if (t === 'switched') {
    out.push(['dad', `换了家公司，做排产软件的。老秦在展会上拿过他们的单页。${S.qinLead === 'disclosed' ? '他说，你当场说了你是谁，没接他那个单。' : ''}`, `A new company. Scheduling software. Old Qin picked up their leaflet at the fair.${S.qinLead === 'disclosed' ? ' He says you told him then and there who you were, and would not take his order.' : ''}`]);
    out.push({ ask: [
      S.nFloor ? { zh: '排产这件事，我是在昆山的车间里跟了两周班才弄明白的。', en: 'I only understood scheduling after two weeks on a shop floor in Kunshan.', d: 3, flag: 'toldDadYear', then: [['dad', '……跟班。嗯。', '...On the floor. Mm.']] }
        : { zh: '产品现在是我说了算。', en: 'The product is mine to decide now.', d: 1, then: [['dad', '说了算，出了事也是你担。', 'Yours to decide, and yours to answer for.']] },
      ...(S.qinLead === 'sold' ? [{ zh: '老秦那个线索是我接的。我没说我是谁。', en: "I was the one who took Old Qin's enquiry. I didn't say who I was.", d: -2, then: [['dad', '瞒着自己家的人做生意。', 'Doing business with your own family behind a mask.']] }] : []),
      sil,
    ] });
  } else if (t === 'startup') {
    out.push(['dad', `你那个公司，${su.nameZh || '还没起名字的那个'}。执照我在网上查到了。${su.customer === 'works' ? '厂里那个检测工位，老秦现在离不开了。' : ''}${su.investor === 'dad' ? '借条我收着。' : ''}`, `That company of yours, ${su.name || 'the one without a name yet'}. I looked the licence up online.${su.customer === 'works' ? ' Old Qin cannot do without that inspection station now.' : ''}${su.investor === 'dad' ? ' I have your note in my drawer.' : ''}`]);
    out.push({ ask: [
      viable(L) ? { zh: '有客户，有人，账上有钱。不多，但是是挣来的。', en: "Customers, people, money in the account. Not much. But earned.", d: 3, flag: 'toldDadYear', then: [['dad', '……挣来的钱，一块是一块。', '...Earned money. Every yuan of it counts as one.']] }
        : { zh: '还没做起来。账上的钱撑不到明年夏天。', en: "It isn't standing yet. The money won't last to next summer.", d: 1, flag: 'toldDadYear', then: [['dad', '肯说实话。做厂的头三年，我也是这样。', 'You tell me the truth. For my first three years at the works it was the same.']] },
      ...(su.investor === 'wang-ratchet' ? [{ zh: '王总投了两百万，签了对赌。', en: 'Mr Wang put in two million. With a ratchet.', d: -1, then: [['dad', '对赌。……那不是投资，是借高利贷。', 'A ratchet. ...That is not investment. That is a loan shark.']] }]
        : su.investor === 'wang-clean' ? [{ zh: '王总投了一百万，没有对赌。', en: 'Mr Wang put in a million. No ratchet.', d: 1, then: [['dad', '别人肯拿真钱出来，说明不是你一个人觉得行。', 'Another man putting in real money means you are not the only one who thinks it can work.']] }] : []),
      sil,
    ] });
  } else if (t === 'family') {
    out.push(['dad', `这半年在厂里，辛苦了。${S.audit === 'frugal' ? '主机厂的订单续了三年。老秦逢人就说是小纪工的二维码。' : ''}`, `These six months at the works: you worked hard.${S.audit === 'frugal' ? " The carmaker has renewed for three years. Old Qin tells everyone it was young Engineer Ji's QR codes." : ''}`]);
    out.push({ ask: [
      { zh: '夜班的人教了我很多。', en: 'The night shift taught me a great deal.', d: 3, flag: 'toldDadYear', then: [['dad', '……你肯听他们说话，他们才肯教你。', '...They teach you because you are willing to hear them.']] },
      { zh: '系统的事还没完，至少还要半年。', en: "The system isn't finished. Six months more, at least.", d: 1, then: [['dad', '嗯。不急。', 'Mm. No hurry.']] },
      sil,
    ] });
  }
  if (demo) out.push(['dad', '明轩他爸跟我说过。去年你帮他们看的那个机械臂，在投资人面前演示得不错。', "Mingxuan's father told me. That robot arm you looked at for them last year did well in front of the investor."]);
  if (hasFlat(L)) { out.push(['dad', '租的房子住得惯吗？一个月多少？', 'The flat you rent: are you comfortable there? How much a month?'], [null, `${LISTINGS[H.id] ? LISTINGS[H.id].zh.replace(/ · /g, '') : '租的'}，¥${H.rent.toLocaleString('en-US')}。`, `${LISTINGS[H.id] ? LISTINGS[H.id].en : 'Rented'}. ¥${H.rent.toLocaleString('en-US')}.`], ['dad', '自己挣的钱付房租，踏实。', 'Rent paid out of money you earned yourself. That is solid ground.']); }
  else out.push(['dad', '在饭店住了一年。', 'A year, living in a hotel.'], [null, '（你没有接话。）', '(You let that pass.)']);
  out.push(...dinnerWork(L));
  if (t === 'family') out.push(['dad', '厂里的事，今天说定：你是帮我这半年，还是接下去。', 'The works. We settle it today: were you helping me for six months, or are you carrying on.']);
  else if (t === 'startup') out.push(['dad', '你那个公司，做得下去就做。做不下去，厂里那层楼还在。', 'That company of yours: if it can go on, go on with it. If it cannot, the floor at the works is still there.']);
  else out.push(['dad', told ? '你去年说在上海有自己的打算。我想了一年。厂里那层楼，还给你留着。' : '打工打得再好，也是给别人打。厂里那层楼，我还给你留着。新线开了一年，研发总得有人管。', told ? 'Last year you said you had plans of your own in Shanghai. I have thought about that for a year. The floor at the works is still yours.' : 'Work for other people as well as you like, it is still for other people. That floor at the works is still yours. The new line has been running a year. Someone has to run R&D.']);
  out.push(['dad', '我五十六了。不想再一个人撑着。', "I'm fifty-six. I don't want to carry it on my own any more."]);
  out.push({ get ask() {
    const dad = relation(L, 'dad').affinity, warm = dad >= 58;
    const basis = t === 'startup' ? viable(L) : t === 'family' ? (W.road && W.road.track === 'family' && W.road.n >= 2) : t === 'switched' ? (S.veto === 'human' || !!S.nFloor) : false;
    const canTogether = (demo || basis) && dad >= 55, own = basis && !(!basis && demo);
    const stay = dinnerAfter(L, 'stay', warm), hm = dinnerAfter(L, 'home', true), tog = dinnerAfter(L, canTogether ? 'together' : 'refused', true);
    const stayText = t === 'startup' ? B('我留在上海，把公司做下去。', "I'm staying in Shanghai to carry the company on.") : t === 'consulting' ? B('我想留在上海。这份工作我做得下去，也做得好。', 'I want to stay in Shanghai. I can do this job, and do it well.') : t === 'switched' ? B('我留在上海。这个产品，我想把它做完。', "I'm staying in Shanghai. I want to see this product through.") : t === 'family' ? B('爸，这半年我试过了。我还是要回上海，做我自己的事。', "Dad, I've given it six months. I still want to go back to Shanghai and do something of my own.") : B('我想留在上海。工作我会再找，或者自己做。', "I want to stay in Shanghai. I'll find work again, or make my own.");
    const homeText = t === 'family' ? B('好。我留在厂里。', "All right. I'm staying at the works.") : B('好。我跟你回南京。', "All right. I'll come home to Nanjing.");
    const togText = own && t === 'startup' ? B('让厂里做我们的标杆客户：先上一条线，做好了再铺开。我两边跑。', 'Let the works be our reference customer: one line first, and the rest when that one is right. I\'ll work between the two cities.')
      : own && t === 'family' ? B('厂里的数字化我接着做。但我要在上海留一个自己的小团队，也接别家的活。我两边跑。', "I'll go on with the digital side of the works. But I keep a small team of my own in Shanghai, and it takes other people's work too. I'll go between the two.")
        : own && t === 'switched' ? B('让厂里上我们的排产系统。实施我回避，方案我来把关。我两边跑。', "Put our scheduling system into the works. I stand aside from the contract and answer for the design. I'll go between the two cities.")
          : B('让厂里来做我们的机械臂。我两边跑。', "Let the works build our robot arm. I'll work between the two cities.");
    const togYes = own && t === 'startup' ? ['dad', '……把合同和报价发给老秦。按市价，不许打折。', '...Send Old Qin the contract and the price. Market price. No discount.'] : own && t === 'family' ? ['dad', '……别家的活。行。账分开算，厂里的事不许耽误。', "...Other people's work. Very well. Separate books, and the works is never kept waiting."] : own && t === 'switched' ? ['dad', '……让你们销售来报价。你回避，这是规矩。', '...Have your sales people quote. You stand aside. That is the rule.'] : ['dad', '……把方案发给我。下周带他们来厂里看看。', '...Send me the proposal. Bring them to the works next week.'];
    return [
      { zh: stayText.zh, en: stayText.en, d: -2, set: 'stay', flag: stay.flag,
        then: [...(warm ? [['dad', '……那就做好。别让人看笑话。钱不够，跟我说。', "...Then do it properly. Don't let anyone laugh at you. If money's short, tell me."]] : [['dad', '……随你。', '...Suit yourself.']]), ...stay.then] },
      { zh: homeText.zh, en: homeText.en, d: 6, set: 'home', flag: hm.flag, then: [['dad', '……好。你妈会高兴的。', '...Good. Your mother will be happy.'], ...hm.then] },
      { zh: togText.zh, en: togText.en, d: canTogether ? 4 : -2, set: canTogether ? 'together' : 'stay', flag: tog.flag,
        then: canTogether ? [togYes, ...tog.then] : tog.replace ? tog.then : [['dad', '你拿什么让我信？先把你自己的事做成再说。', 'What have you got to make me believe it? Get your own thing working first.']] },
      { zh: '（沉默）', en: '(Silence.)', d: -1, set: 'silent', then: [['dad', '你还是没想好。没关系。想好了，告诉我。', "You still haven't decided. That's all right. When you have, tell me."]] },
    ];
  } });
  out.push(['dad', '吃吧，菜要凉了。', "Eat. The food's getting cold."]);
  return out;
}

// ---- the endings, a year on: the same six, told without the old week's furniture ----
const YEAR_ENDINGS = {
  together: B('第二年春天，你一周在南京，一周在上海。高铁上的一小时九分钟，你用来回消息。爸爸学会了用微信发语音，第一条是：“图纸收到了。”', 'The next spring you spend a week in Nanjing, a week in Shanghai. The hour and nine minutes on the train are for answering messages. Your father learns to send WeChat voice notes. The first one says: "Got the drawings."'),
  stay: B('灯暗下来的时候，爸爸发来四个字：“注意身体。”上海的冬天，比你去年记得的还要冷一点。', 'As the lights dim, your father sends four words: "Look after your health." Shanghai\'s winter is a little colder even than you remember from last year.'),
  alone: B('爸爸一个月没有打电话。若安说他会想通的。那天晚上，外滩的灯照常在十点暗下来。', "Your father doesn't call for a month. Ruoan says he'll come round. That night the Bund's lights dim at ten, as they always do."),
  home: B('走的那天，大家在虹桥送你。Momo 在候车厅的钢琴上弹了一首歌。你把一张外滩的照片贴在了厂里二楼的窗边。', 'The day you leave, they all see you off at Hongqiao. Momo plays a song on the station piano. You pin a photograph of the Bund beside the upstairs window at the works.'),
  open: B('灯暗了，江还在流。一年了，你还没想好，这也是一种答案。明天，外滩的灯会再亮。', "The lights dim; the river keeps moving. A year, and you still haven't decided, and that's an answer of a kind. Tomorrow the Bund's lights will come on again."),
  apart: B('他等了你四十分钟。回南京的高铁上，他发来一张照片：爵士吧里那张空着的椅子。', 'He waited forty minutes. From the train back to Nanjing he sends a photo: the empty chair at the Jazz Bar.'),
};
export const yearEnding = (L, id) => (isYear(L) ? YEAR_ENDINGS[id] || null : null);
// what the year adds to the card, by the road he took (world/story.js joins it to the gimbal's, from world/work.js)
export function yearEpilogue(L, id) {
  if (!isYear(L)) return null;
  const c = career(L), S = story(L), t = c.track, s = startup(L) || {}, H = home(L), nm = B(s.nameZh || '你的公司', s.name || 'your company');
  const g = id === 'stay' || id === 'alone' ? 'A' : id === 'home' ? 'H' : id === 'together' ? 'T' : id === 'open' ? 'O' : 'X';
  const by = {
    consulting: {
      A: S.rating === 3 ? B('第二年，你升了经理。东澜的理赔员工作台，被另外两家保险公司买了去。', "The next year you make manager. Two more insurers buy the adjusters' workbench you built for Donglan.") : B('第二年，你还在 28 层。东澜二期交付那天，全组在楼下吃了顿饭。', "The next year you are still on the 28th floor. The day Donglan's second phase is delivered, the whole team eats downstairs."),
      H: B('你在四月递了辞呈。交接清单写了十一页，最后一页是留给下一个人的：别在没见过的数据上报数。', 'In April you hand in your notice. The handover runs to eleven pages, and the last is for whoever comes next: never report a number on data the model has already seen.'),
      T: B('公司批了你每个月一周的远程。厂里的线上，多了一个不在任何报价单上的顾问。', 'The firm allows you one remote week a month. The line at the works acquires a consultant who appears on no quotation.'),
    },
    switched: {
      A: S.veto === 'human' ? B('第二年，“计划员说了算”写进了屿深产品手册的第一页。', 'The next year, "the planner has the last word" is on page one of Yushen\'s product manual.') : B('第二年，屿深融了 A+ 轮。昆山那家厂，换了别家的系统。', 'The next year Yushen raises its series A-plus. The plant in Kunshan has gone over to somebody else\'s system.'),
      H: B('你把期权协议退了回去。顾磊说：门还是给你留着。', 'You send the options agreement back unsigned. Gu Lei says: the door stays open.'),
      T: B('屿深的排产助手在纪氏精工上了线。合同上实施负责人那一栏，签的不是你的名字。这是规矩。', "Yushen's scheduling assistant goes live at Ji's Precision Works. The name on the contract as implementation lead is not yours. That is the rule."),
    },
    startup: {
      A: viable(L) ? B(`第二年，${nm.zh}有了第三个客户。32 楼那两张桌子，变成了六张。`, `The next year ${nm.en} has its third customer. The two desks on the 32nd floor have become six.`) : B(`${nm.zh}在第二年夏天停了。你把代码开了源，写了一篇很长的复盘。有四家公司看完来找你。`, `${nm.en} stops the following summer. You open the code and write a long account of what went wrong. Four companies read it and come looking for you.`),
      H: B(`${nm.zh}的执照你没有注销。它在抽屉里，和厂里的门禁卡放在一起。`, `You never cancel ${nm.en}'s licence. It is in a drawer, beside your pass for the works.`),
      T: B(`第二年春天，${nm.zh}的第一条线在纪氏精工跑满了三个月。老秦在验收单上签了字，又添了一句：误判，每天不到三件。`, `The next spring ${nm.en}'s first line has run three full months at Ji's Precision Works. Old Qin signs the acceptance sheet and adds a line of his own: false rejects, under three a day.`),
    },
    family: {
      A: B('你回上海那天，老秦送你到南京南。他问：系统坏了找谁？你把电话写在了他手心里。', 'The day you go back to Shanghai, Old Qin sees you to Nanjing South. Who do we ring when the system breaks, he asks. You write your number on the palm of his hand.'),
      H: B('副总的牌子挂上去了。夜班的人还是叫你小纪工。', "The deputy general manager's nameplate goes up. The night shift still call you young Engineer Ji."),
      T: B('厂里二楼的灯和上海的一盏灯，从此隔天亮着。韩家的活，你最后也接了。爸爸看了报价，说：别便宜他们。', "The light upstairs at the works and a light in Shanghai burn on alternate days from then on. In the end you take the Hans' work as well. Your father reads the quotation and says: don't go easy on them."),
    },
    limbo: {
      A: B('第二年春天，你还没有上班。你接零活，写东西，把这一年从头想了一遍。存款在变少。你不着急，也不是不着急。', "The next spring you still have no job. You take odd contracts, you write, you go through the year again from the beginning. The savings are going down. You aren't worried, and you aren't not worried."),
      H: B('回南京的车票是单程的。厂里的研发楼很安静。', 'The ticket to Nanjing is one way. The R&D floor at the works is very quiet.'),
      T: B('你没有公司，也没有头衔。爸爸说：那就从厂里那条线做起，做出来的东西算你的。', "You have no company and no title. Your father says: then start with that line at the works. What you make of it is yours."),
    },
  }[LIMBO_OR(t)] || {};
  const parts = [];
  if (by[g]) parts.push(by[g]);
  else if (g === 'O') parts.push(t === 'startup' ? B(`${nm.zh}的账，你明天还要对。`, `Tomorrow there are still ${nm.en}'s accounts to reconcile.`) : t === 'family' ? B('副总的牌子还在他的抽屉里。', "The nameplate is still in his drawer.") : B('周一，你照常要去上班，或者不去。', 'On Monday you will go to work as usual. Or not.'));
  if ((g === 'A' || g === 'T') && hasFlat(L) && LISTINGS[H.id]) parts.push(B(`${LISTINGS[H.id].zh.split(' · ').slice(1).join('')}，你续了一年。`, `You renew the lease on ${H.where} for another year.`));
  else if (g === 'A' && !hasFlat(L)) parts.push(B('和平饭店的 612，你终于退了房，开始找房子。', 'You finally check out of room 612 at the Peace Hotel and start looking for a flat.'));
  if (!parts.length) return null;
  return B(parts.map((p) => p.zh).join(''), parts.map((p) => p.en).join(' '));
}
function LIMBO_OR(t) { return t === 'resigned' || t === 'laidoff' ? 'limbo' : t; }

// ---- what the people he talks to freely are told (world/story.js adds it to storyContext) ----
export const COLLEAGUES = ['zhiwei', 'taoke', 'shaofeng', 'partner', 'feng', 'gu', 'hr', 'qin', 'sheng', 'zhoumin', 'mum'];
const standingWord = (v) => (v >= 70 ? 'very well regarded at work' : v >= 50 ? 'in reasonable standing at work' : v >= 30 ? 'under a cloud at work' : 'close to being managed out');
function factLine(L, f) {
  const when = dateText(L, 'en', f.day);
  if (f.type === 'said') return `On ${when} (${f.title}) he said: "${f.en}"`;
  if (f.type === 'career' && f.track) return `On ${when} his working life changed: ${f.track}.`;
  if (f.type === 'career' && f.what === 'bonus') return `On ${when} he got a year-end bonus of ${f.months} months' pay.`;
  if (f.type === 'home') return `On ${when} he moved into a rented flat in ${f.where} (¥${f.rent} a month).`;
  if (f.type === 'handoff') return `In November 2026 he carried a sealed pouch from a missing watch-repairer's stall to Old Lin on the Bund${f.outcome === 'opened' ? ', having broken the seal and read the page inside' : ', seal intact'}.`;
  if (f.type === 'watch') return `On ${when}: ${({ 'met-daughter': "he met the missing watch-repairer's daughter at the stall", 'stall-saved': "the watch-repairer was found alive and his stall saved, thanks to a date Ji Bai remembered", 'stall-lost': 'the watch-repairer was found alive but his stall had been lost', 'stall-changed-hands': "the watch-repairer's stall changed hands" })[f.what] || f.what}.`;
  if (f.type === 'work' && f.what === 'absent') return `On ${when} he did not turn up for work.`;
  if (f.type === 'work' && f.what === 'late') return `On ${when} he came in late.`;
  if (f.type === 'work' && f.what === 'came-in-hurt') return `On ${when} he came to work visibly hurt.`;
  if (f.type === 'work' && f.what === 'fight-seen') return `On ${when} someone from work saw him in a fight.`;
  if (f.type === 'family' && f.what === 'home-for-new-year') return 'He went home to Nanjing for the Spring Festival.';
  return null;
}
export function careerContext(L, who) {
  if (!isYear(L)) return '';
  const c = career(L), S = story(L), out = [];
  const work28 = ['zhiwei', 'taoke', 'shaofeng', 'partner', 'hr'].includes(who);
  if (work28) out.push(`You work with him at ${FIRM.en} (IFC Tower 2, 28F) on the ${CLIENT.en} AI claims-assistant project${work(L).applied ? `; since April: ${({ consulting: 'he stayed with the firm', resigned: 'he resigned', laidoff: 'he was laid off with a package', switched: `he left for ${NEWCO.en}` })[S.decided] || ''}` : ''}. He is ${standingWord(c.standing)}.`);
  if (who === 'gu' || who === 'feng') out.push(`You know him as the ${FIRM.en} consultant on your company's (${CLIENT.en}) AI claims project.`);
  if (who === 'dad' || who === 'mum' || who === 'qin') out.push(`The family business is ${WORKS.en} in Jiangning, Nanjing.`);
  const mine = factsAbout(L).filter((f) => f.type === 'career' || f.type === 'home' || (f.type === 'said' && (f.who || []).includes(who)) || (['dad', 'mum', 'ruoan', 'xuan'].includes(who) && ['family', 'watch', 'handoff'].includes(f.type)) || (work28 && f.type === 'work' && ['absent', 'late', 'came-in-hurt', 'fight-seen'].includes(f.what)));
  const lines = mine.slice(-7).map((f) => factLine(L, f)).filter(Boolean);
  if (lines.length) out.push(`Things that have really happened (the only events you may treat as having happened): ${lines.join(' ')}`);
  return out.join(' ');
}
// who they are, for free conversation (world/personas.js adds these; the five he might come to love are not ours)
export const CAREER_PERSONAS = {
  taoke: { zh: '陶可', en: 'Tao Ke', sex: 'f', voice: 'student', lang: 'zh', card: 'Tao Ke (陶可), 24, an analyst at Marlowe Finch in Lujiazui, a year out of Fudan; careful, overworked, anxious about mistakes, quietly funny; she looks up to Ji Bai and calls him by his name because he asked her to' },
  shaofeng: { zh: '邵峰', en: 'Shao Feng', sex: 'm', voice: 'bump:young', lang: 'zh', card: 'Shao Feng (邵峰), 31, a senior consultant at Marlowe Finch; quick, political, a good presenter, half rival and half ally to Ji Bai; teases him about Silicon Valley; wants to make manager' },
  partner: { zh: '贺维安', en: 'Raymond He', sex: 'm', voice: 'founder', lang: 'zh', card: 'Raymond He (贺维安), 46, the partner at Marlowe Finch who sold the Donglan engagement; polished, persuasive, protects revenue first, never raises his voice; calls him 小纪' },
  feng: { zh: '冯玉兰', en: 'Feng Yulan', sex: 'f', voice: 'bump:office', lang: 'zh', card: 'Feng Yulan (冯玉兰), 49, vice-president of operations at Donglan Insurance, the client; blunt, numerate, under pressure from her board, respects people who tell her the truth and makes them pay for it anyway' },
  gu: { zh: '顾磊', en: 'Gu Lei', sex: 'm', voice: 'maker', lang: 'zh', card: 'Gu Lei (顾磊), 38, an engineer who ran the claims system at Donglan Insurance and later moved to Yushen Technology; plain-spoken, practical, trusts people who ask for the worst data first' },
  zhoumin: { zh: '周敏', en: 'Zhou Min', sex: 'f', voice: 'bump:office', lang: 'zh', card: "Zhou Min (周敏), 34, a primary-school teacher from Suzhou, daughter of Zhou Bonian, the watch-repairer on Hankou Road who went missing at the end of October 2026; tired, polite, determined" },
  qin: { zh: '老秦', en: 'Old Qin', sex: 'm', voice: 'bump:elder', lang: 'zh', card: "Qin Weidong (老秦), 58, production manager at Ji's Precision Works in Nanjing, thirty years beside Ji Bai's father; blunt, loyal, sceptical of software, knew Ji Bai as a boy" },
};
export { rep, todaysWork, lifeContext, year };
