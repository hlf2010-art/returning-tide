// Act IV · Building a Life (June - October 2027): four roads, four working days each. Pure data,
// in the form world/careerScenes.js describes; world/career.js picks the road from his track and
// the next scene from how far along it he is (so a road begun late is simply shorter).
//   consulting   he stayed: Donglan's second phase, a conflict of interest, a year-end review
//   switched     Yushen Technology: an in-house product, a planner on a night shift, his own number
//   startup      his own company, at two borrowed desks on IFC 32F beside the robot-arm team
//   family       back at his father's works in Nanjing: the line, Old Qin, an audit
// Extra answer fields here: su { cash, burn, customer, hire, ... } changes to the start-up's books;
// sk { ai, product, hw } is what the work teaches him (engine/skills.js), as in careerScenes.js.
import { FIRM, NEWCO, WORKS } from './careerScenes.js';
const B = (zh, en) => ({ zh, en });
const F32 = B('陆家嘴 · 国金中心二期 32 层 · 借来的两张桌子', 'Lujiazui · IFC Tower 2, 32F · two borrowed desks');
const YUSHEN = B('陆家嘴 · 世纪大道 · 屿深科技 14 层', 'Lujiazui · Century Avenue · Yushen Technology, 14F');
const NANJING = B('南京 · 江宁 · 纪氏精工 二楼办公室', "Nanjing · Jiangning · Ji's Precision Works, the upstairs office");
export const STARTUP_NAMES = { shoreline: B('岸线智能', 'Shoreline'), echo: B('回声工坊', 'Echo Works'), reed: B('一苇科技', 'One Reed') };
export const STARTUP_PRODUCTS = {
  qc: B('产线质检助手：看得懂缺陷，也说得清为什么判废', 'a quality-inspection assistant for production lines: it sees the defect and can say why it rejected the part'),
  claims: B('理赔复核助手：每一个拒赔建议都带着条款原文和一个人的签字', 'a claims-review assistant: every rejection it suggests comes with the clause itself and a person\'s signature'),
  console: B('设备对话台：操作工用一句话给机械臂和产线下任务', 'a talking console for machines: an operator gives the arm and the line their tasks in a sentence'),
};

export const ROADS = {
  // ---------------------------------------------------------------- staying, and rising
  consulting: [
    { id: 'c1', title: B('二期', 'Phase two'), place: FIRM.place, cast: ['zhiwei', 'partner', 'shaofeng', 'taoke'],
      parts: [(L, S) => [
        ['zhiwei', S.memo === 'sign' ? '东澜二期，理赔员工作台。你现在是高级顾问了，这一块你带。' : '东澜二期，理赔员工作台。职级没动，但这一块你带，对客户你就是负责人。', S.memo === 'sign' ? "Donglan, phase two: the adjusters' workbench. You are a senior consultant now. This workstream is yours." : "Donglan, phase two: the adjusters' workbench. Your grade hasn't moved, but the workstream is yours. To the client you are the lead."],
        ['zhiwei', '一期的使用率是三成四。理赔员宁可自己翻材料，也不点“采纳建议”。', "Adoption in phase one was thirty-four per cent. The adjusters would sooner go through the papers themselves than click 'accept'."],
        { ask: [
          { zh: '给我两周，我去理赔中心坐着，跟他们一起办案。先弄明白他们不信它哪一点。', en: "Give me two weeks. I'll sit in the claims centre and work cases with them. First I want to know exactly what they don't trust.", s: 2, r: 3, zw: 2, k: 'cShadow', sk: { product: 40 },
            then: [['zhiwei', '两周没有产出，Raymond 会问。我替你顶着。', "Two weeks without a deliverable and Raymond will ask. I'll hold him off."]] },
          { zh: '冯总要的是看板。先把使用率看板做出来，按人排名。', en: 'Ms Feng wants a dashboard. Build the adoption dashboard first, ranked by adjuster.', s: 2, r: -1, k: 'cDashboard',
            then: [['zhiwei', '排名。他们会点的，点完照样不信。', 'A ranking. They will click, then. And go on not trusting it.']] },
        ] },
        ['partner', '还有件事。南京有家做精密加工的要做数字化评估，八十万的案子。纪氏精工。……是你家的厂吧？', "One more thing. A precision-machining company in Nanjing wants a digital-transformation assessment. An eight-hundred-thousand engagement. Ji's Precision Works. ...That would be your family's, wouldn't it?"],
        { ask: [
          { zh: '是。这个案子我回避，报价和人选都别经过我。', en: "It is. I recuse myself. Neither the price nor the staffing should come anywhere near me.", r: 3, s: 1, k: ['worksCase', 'recused'],
            then: [['partner', '规矩人。行，我让邵峰去。', 'A man for the rules. Very well. I shall send Shao Feng.']] },
          { zh: '我可以牵线，但我爸那个人，PPT 超过十页他就不看了。让去的人带一个能上线的东西。', en: 'I can make the introduction. But my father stops reading at ten slides. Whoever goes should bring something that actually runs.', s: 2, k: ['worksCase', 'intro'],
            then: [['partner', '有意思。你写个提纲给邵峰。', 'Interesting. Write Shao Feng an outline.']] },
          { zh: '我来做。没有人比我更懂那个厂。', en: 'Give it to me. Nobody knows that works better than I do.', s: 3, r: -3, k: ['worksCase', 'took'],
            then: [['partner', '好。成本数据你最清楚，报价就好谈。', 'Good. You know their costs better than anyone, which makes the price easy to argue.'], [null, '（成本数据。你想起爸爸办公室里那只带锁的铁皮柜。）', "(Their costs. You think of the locked steel cabinet in your father's office.)"]] },
        ] },
      ]] },
    { id: 'c2', title: B('采纳率', 'The accept button'), place: FIRM.place, cast: ['zhiwei', 'partner', 'shaofeng'],
      parts: [(L, S) => [
        ...(S.cShadow ? [['zhiwei', '你那两周的笔记我看了。“它从不说自己不确定。”这一条，客户的理赔组长原话？', 'I read your notes from the two weeks. "It never says when it isn\'t sure." Is that the claims team leader\'s own words?'], [null, '（是原话。工作台改版以后，模型在没把握的地方会直说，并把那一页病历放到最前面。使用率到了六成一。）', '(Her own words. The redesigned workbench has the model say so where it is unsure and puts that page of the notes on top. Adoption has reached sixty-one per cent.)']]
          : [['zhiwei', '看板上线一个月，采纳率到了八成。抽查发现，一半是不看就点。', 'A month of the dashboard and the acceptance rate is eighty per cent. The spot check says half of those are clicked without reading.'], [null, '（排名让人学会了点按钮。）', '(A ranking has taught people to click a button.)']]),
        ['partner', '下个月行业峰会，“保险业的 AI 转型”，主讲我想放你。去了就是公司的脸。可知微说，交付这边离不开你。', 'The industry summit next month: "AI transformation in insurance". I want you as the keynote. You would be the face of the firm. But Zhiwei says delivery cannot spare you.'],
        { ask: [
          { zh: '我去讲。讲的就是这六个月我们错在哪儿。', en: "I'll speak. And what I'll speak about is where we went wrong these six months.", s: 2, r: 4, k: 'cKeynote',
            then: [['partner', '……错在哪儿。你把稿子先给我看。', '...Where we went wrong. I shall see the draft first.']] },
          { zh: '让邵峰去讲。交付我不能丢。', en: "Let Shao Feng give it. I can't leave delivery.", s: 1, zw: 3, rel: { shaofeng: 4 },
            then: [['shaofeng', '……你把台子让给我？', '...You are giving me the stage?'], ['zhiwei', '他是真的更会讲。', 'He really is the better speaker.']] },
          { zh: '我去。稿子您定。', en: "I'll go. You decide what's in the speech.", s: 3, rel: { partner: 3 }, zw: -1, k: 'cKeynote', then: [['partner', '好。', 'Good.']] },
        ] },
      ]] },
    { id: 'c3', title: B('四十个人', 'Forty people'), place: FIRM.place, cast: ['zhiwei', 'partner', 'feng'],
      parts: [() => [
        ['feng', '工作台的效果我认。结案六天半了。所以理赔中心明年编制减四十个人，方案你们来写，写成“AI 提效的自然结果”。', "I grant you the workbench works. Six and a half days to close. So the claims centre loses forty posts next year, and you will write the plan. Call it 'the natural result of AI efficiency'."],
        [null, '（那两周，你坐在其中几个人旁边。）', '(For two weeks you sat next to some of those people.)'],
        { ask: [
          { zh: '我可以写另一份：这四十个人转去做复核和疑难案件，把错拒率再降一半。算给您看，比裁掉省得多。', en: "I can write a different plan. Those forty move to review and to the hard cases, and the wrongful-rejection rate halves again. I'll show you the sums: it saves more than cutting them.", s: 1, r: 4, zw: 2, k: ['forty', 'redeploy'], sk: { product: 20 },
            then: [['feng', '……把数算清楚。算得过来，我拿去董事会。', '...Get the numbers straight. If they add up I will take it to the board.']] },
          { zh: '这是东澜自己的人事决定。我们只提供数据。', en: "That is Donglan's own staffing decision. We only supply the data.", s: 1, k: ['forty', 'data'], then: [['feng', '那就把数据给我。', 'Then give me the data.']] },
          { zh: '好，我来写。', en: "All right. I'll write it.", s: 3, r: -2, zw: -2, k: ['forty', 'wrote'], then: [['partner', '这就是二期的续约。', 'And there is our renewal for phase two.']] },
        ] },
      ]] },
    { id: 'c4', title: B('年终评议', 'Year-end review'), place: FIRM.place, cast: ['zhiwei', 'partner'],
      parts: [(L, S, h) => {
        const g = h.rating();
        return [
          ['partner', g === 3 ? '评级：超出预期。奖金四个月。明年升经理，名单我已经报了。' : g === 2 ? '评级：符合预期。奖金两个月。' : '评级：待改进。奖金一个月。你知道为什么。', g === 3 ? 'Rating: exceeds expectations. Four months\' bonus. Manager next year: your name has gone in.' : g === 2 ? "Rating: meets expectations. Two months' bonus." : "Rating: needs improvement. One month's bonus. You know why."],
          ['zhiwei', '我的评语只写了一句：“他会让客户听到他们不想听的话，然后把事情做成。”', 'My comment on you was one sentence: "He will make a client hear what they don\'t want to hear, and then get the thing done."'],
          ['partner', '明年新加坡那边要人，轮岗一年。去不去，过完年给我答复。', 'Singapore wants people next year. A year\'s rotation. Give me your answer after the holiday.'],
          { ask: [
            { zh: '谢谢。新加坡的事，我先跟家里说一声。', en: "Thank you. About Singapore: I'll talk to my family first.", k: 'cSingapore', then: [['partner', '应该的。', 'As you should.']] },
            { zh: '我想留在上海。这儿的事我才刚做出点样子。', en: "I'd rather stay in Shanghai. I've only just begun to get somewhere here.", zw: 1, then: [['partner', '也行。', 'As you wish.']] },
          ] },
        ];
      }] },
  ],

  // ---------------------------------------------------------------- another employer
  switched: [
    { id: 'n1', title: B('甲方', 'In-house'), place: YUSHEN, cast: ['gu', 'sheng'],
      parts: [() => [
        ['gu', '欢迎。这儿没有 deck，只有版本号。产品叫“排产助手”：中小工厂的计划员，每天早上靠 Excel 和电话排当天的生产，我们想让他问一句话就行。', 'Welcome. No decks here, only version numbers. The product is the scheduling assistant: in a mid-sized factory the planner builds the day\'s production every morning out of Excel and phone calls. We want that to be one question.'],
        ['sheng', '七月有工博会。我要一个能在展台上跑的演示，要炫。', 'There is the industry fair in July. I want a demo that runs on the stand, and I want it to dazzle.'],
        { ask: [
          { zh: '演示我做。但先给我两周，去一家客户的车间，跟计划员一起排两周的产。', en: "I'll build the demo. But first give me two weeks on a customer's shop floor, scheduling alongside their planner.", s: 1, r: 3, rel: { gu: 2 }, k: 'nFloor', sk: { product: 40 },
            then: [['sheng', '两周？……顾磊说你就是这种人。去吧，昆山那家注塑厂。', "Two weeks? ...Gu Lei said this is what you're like. Go on, then. The injection-moulding plant in Kunshan."]] },
          { zh: '明白。展会优先，演示我两周出来。', en: 'Understood. The fair comes first. You will have the demo in two weeks.', s: 3, k: 'nDemo', then: [['sheng', '这才对。', "That's more like it."]] },
        ] },
        ['gu', '销售的线索表你看一眼。……第十七行，南京，纪氏精工。', "Have a look at the sales leads. ...Row seventeen. Nanjing. Ji's Precision Works."],
      ]] },
    { id: 'n2', title: B('展台', 'The stand'), place: B('上海 · 国家会展中心 · 工博会', 'Shanghai · the exhibition centre · the industry fair'), cast: ['gu', 'qin'],
      parts: [(L, S) => [
        [null, S.nFloor ? '（展台上跑的是昆山那家厂的真实排产，脱了敏。计划员们围着看，问的都是内行话。）' : '（展台上的演示很炫。围着看的多是同行和学生。）', S.nFloor ? '(What runs on the stand is the Kunshan plant\'s real schedule, anonymised. Planners gather round it and ask the questions planners ask.)' : '(The demo on the stand dazzles. Most of the crowd round it are competitors and students.)'],
        ['qin', '小伙子，我问一句：插单你们怎么处理？我们厂一天插三回单，系统排的计划到中午就是废纸。', 'Young man, one question. Rush orders: what do you do with them? We get three a day. Whatever the system planned is waste paper by noon.'],
        [null, '（他胸牌上写着：纪氏精工 · 生产部 · 秦卫东。他没认出你。上次见他，你十四岁。）', "(His badge reads: Ji's Precision Works · Production · Qin Weidong. He doesn't know you. The last time he saw you, you were fourteen.)"],
        { ask: [
          { zh: '秦师傅，我是纪白，纪建国的儿子。这个单子我回避，我请同事跟您谈。但插单的问题，您说的是对的，我记下了。', en: "Mr Qin, I'm Ji Bai. Ji Jianguo's son. I'll stand aside from this one and ask a colleague to talk to you. But you're right about rush orders, and I've written it down.", r: 3, rel: { qin: 4, dad: 2 }, k: ['qinLead', 'disclosed'],
            then: [['qin', '……小白？！长这么高了。你爸知道你在这儿？', "...Little Bai?! Look at the height of you. Does your father know you're here?"], ['qin', '行，我不为难你。回去我跟你爸说，他儿子做的东西，问得倒是在点子上。', "All right, I won't make it awkward. I'll tell your father his son's product at least asks the right questions."]] },
          { zh: '插单我们有“冻结窗口”：两小时内的计划不动，之后的自动重排。我带您看。', en: 'For rush orders we have a frozen window: the next two hours never move, everything after is rescheduled automatically. Let me show you.', s: 2, rel: { qin: 1 }, k: ['qinLead', 'sold'],
            then: [['qin', '有点意思。留个电话，我回去跟我们老板说。', "Now that's something. Give me a number. I'll tell my boss."], [null, '（他的老板。你没有说。）', '(His boss. You do not say.)']] },
          { zh: '（让同事接待，自己走开）', en: '(Let a colleague take him. Walk away.)', k: ['qinLead', 'avoided'], then: [[null, '（你在展台后面站了十分钟。）', '(You stand behind the stand for ten minutes.)']] },
        ] },
      ]] },
    { id: 'n3', title: B('夜班', 'The night shift'), place: YUSHEN, cast: ['gu', 'sheng', 'planner'],
      parts: [() => [
        ['gu', '昆山出事了。排产助手把周四的急单全压到了夜班，夜班少两个人，模具温度没跟上，废了一批。', "Kunshan has gone wrong. The assistant put all of Thursday's rush orders onto the night shift. The night shift was two people short, the mould temperature didn't keep up, and a batch is scrap."],
        ['planner', '（电话）我当时点了“不同意”，系统让我填理由，填完它还是按自己的排。那我还填它干什么？', '(On the phone) I clicked "disagree". It made me type a reason, and then scheduled its own way regardless. So what was I typing for?'],
        ['sheng', '“全自动排产”是我们的卖点。加一个人工否决，卖点就没了。', '"Fully automatic scheduling" is what we sell. Add a human veto and there is nothing left to sell.'],
        { ask: [
          { zh: '计划员说了算，系统记下他为什么改。卖点换一个：“越用越像你们厂自己的老计划员”。这批废品，本来不该有。', en: 'The planner has the last word, and the system records why he changed it. Sell something else: "the longer you use it, the more it plans like your own best planner." This scrap should never have happened.', r: 4, rel: { gu: 3, sheng: -2 }, k: ['veto', 'human'], sk: { product: 30, ai: 20 },
            then: [['sheng', '……顾磊，你招的人，跟你一个脾气。给你们一个版本的时间。', '...Gu Lei, you hired a man with your own temper. You have one release to prove it.']] },
          { zh: '保留全自动，但加安全规则：人手不够的班次不排急单。', en: 'Keep it fully automatic, but add safety rules: no rush orders onto a short-handed shift.', s: 2, k: ['veto', 'rules'], then: [['gu', '规则能挡住这一次。下一次是我们想不到的。', 'A rule stops this one. The next one will be something we never thought of.']] },
          { zh: '盛总说得对，卖点不能动。让实施团队去培训他们。', en: 'Mr Sheng is right: the selling point stays. Have the implementation team train them.', s: 3, r: -3, rel: { gu: -3 }, k: ['veto', 'none'], then: [['planner', '（电话已经挂了。）', '(He has already hung up.)']] },
        ] },
      ]] },
    { id: 'n4', title: B('期权', 'Options'), place: YUSHEN, cast: ['gu', 'sheng'],
      parts: [(L, S) => [
        ['sheng', S.veto === 'human' ? '新版本上线两个月，续约率九成二。你那个“计划员说了算”，销售现在拿它当第一页。' : '这一年产品是立住了。昆山那家没续约，别的还行。', S.veto === 'human' ? 'Two months of the new release and renewals are at ninety-two per cent. Your "the planner has the last word" is now the first slide in every sales deck.' : 'The product has found its feet this year. Kunshan did not renew. The others are all right.'],
        ['sheng', '明年融 A+ 轮。给你千分之八的期权，四年归属。条件是签三年。', 'We raise a series A-plus next year. I am offering you options over 0.8 per cent, vesting over four years. The condition is that you sign for three.'],
        { ask: [
          { zh: '我签。', en: "I'll sign.", s: 3, k: ['options', 'signed'], then: [['gu', '那明年的路线图，咱俩这周定。', 'Then you and I settle next year\'s roadmap this week.']] },
          { zh: '期权我要，三年我得想想。月底前答复您。', en: 'I want the options. The three years I need to think about. You will have my answer by the end of the month.', k: ['options', 'thinking'], then: [['sheng', '月底。', 'The end of the month.']] },
        ] },
      ]] },
  ],

  // ---------------------------------------------------------------- his own company
  startup: [
    { id: 's1', title: B('两张桌子', 'Two desks'), place: F32, cast: ['xuan', 'founder', 'engineer'],
      parts: [
        () => [
          ['founder', '靠窗这两张桌子归你。网、打印机、咖啡机随便用。房租你别提，等你有了收入，请我们吃顿好的。', 'The two desks by the window are yours. Network, printer, coffee machine: help yourself. Don\'t mention rent. When you have revenue, buy us all a good dinner.'],
          ['xuan', '营业执照我找人三天办下来。公司叫什么？', 'I can get the business licence done in three days. What is the company called?'],
          { ask: [
            { zh: '岸线智能。站在岸上，看得见两边。', en: 'Shoreline. You stand on the bank and can see both sides.', su: { name: 'shoreline' }, then: [['xuan', '岸线。行，像个正经公司。', 'Shoreline. Fine. Sounds like a proper company.']] },
            { zh: '回声工坊。用的人说一句，东西改一版。', en: 'Echo Works. Someone who uses it says a thing, and the thing changes.', su: { name: 'echo' }, then: [['xuan', '工坊。投资人会以为你做手工皂。……行吧。', 'Works. Investors will think you make soap. ...Fine.']] },
            { zh: '一苇科技。一苇渡江：东西小，但真能过河。', en: 'One Reed. As in crossing the river on a single reed: small, but it does get you across.', su: { name: 'reed' }, then: [['founder', '这个好。我们学校校训旁边就刻着这句。', "I like that one. It's carved beside our university motto."]] },
          ] },
          ['xuan', '注册资本认缴一百万，先实缴三十万进公司账户。这是你自己的钱，想好。', 'Registered capital of a million, three hundred thousand of it paid in now, into the company account. It is your own money. Be sure.'],
          ['xuan', '然后是最要紧的：做什么？', 'And then the thing that matters most. What does it make?'],
          { ask: [
            { zh: '产线质检。模型看得出缺陷，更要说得清为什么判废：老师傅信了，才会用。', en: 'Quality inspection on production lines. A model that sees the defect and, more to the point, can say why it rejected the part. The old hands will only use it once they believe it.', su: { product: 'qc' }, sk: { ai: 20, hw: 20 },
              then: [['founder', '我们的机械臂末端正好缺一双眼睛。', 'The end of our arm happens to be missing a pair of eyes.'], ['xuan', '制造业，客单价高，回款慢。你爸那边……算了，你自己定。', "Manufacturing: big tickets, slow payers. Your father's place... never mind. Your call."]] },
            { zh: '理赔复核。把我在东澜没做成的那件事做完：每一个拒赔，后面都站着一个人。', en: 'Claims review. To finish what I could not finish at Donglan: behind every rejection, a person.', su: { product: 'claims' }, sk: { ai: 20, product: 20 },
              then: [['xuan', '保险公司采购要走半年。你的钱够烧到那时候吗？', 'An insurer takes six months to buy anything. Does your money last that long?']] },
            { zh: '设备对话台。操作工一句话，机械臂就知道干什么。先从周学长的臂做起。', en: "A talking console for machines. The operator says a sentence and the arm knows what to do. Starting with Zhou's arm.", su: { product: 'console' }, sk: { ai: 20, hw: 20 },
              then: [['founder', '那我就是你第一个客户了。先说好，我们也没钱。', "Then I am your first customer. Fair warning: we haven't any money either."]] },
          ] },
        ],
      ] },
    { id: 's2', title: B('第一张合同', 'The first contract'), place: F32, cast: ['xuan', 'founder', 'engineer'],
      parts: [
        (L, S, h) => [
          ['xuan', `${h.su().nameZh}，成立六周，账上还有 ¥${h.su().cash.toLocaleString('en-US')}。没有客户的公司不叫公司。你打算先卖给谁？`, `${h.su().nameEn}: six weeks old, ¥${h.su().cash.toLocaleString('en-US')} in the account. A company with no customer is not a company. Who do you sell to first?`],
          { ask: [
            { zh: '周学长。给机械臂做操作台，八万，下个月交付。钱不多，但他们明天就能用起来。', en: "Zhou. An operator console for the arm, eighty thousand, delivered next month. It isn't much money, but they can be using it tomorrow.", su: { customer: 'arm', owed: 80000 }, rel: { xuan: 2 },
              then: [['founder', '八万……行。先付三万，交付再付五万。', 'Eighty thousand... all right. Thirty now, fifty on delivery.'], ['engineer', '终于不用我半夜改示教程序了。', 'At last I can stop rewriting the teach program at midnight.']] },
            { zh: '（拿起电话）爸。厂里电驱壳体那条线，我想免费做三个月试点。做得好，再谈钱。', en: "(Pick up the phone.) Dad. The drive-housing line at the works. I want to run a pilot on it, three months, free. If it's any good, we talk about money.", su: { customer: 'works', owed: 0 }, rel: { dad: 3 }, k: 'askedDad',
              then: [['dad', '（电话）……免费的东西我不要。老秦说检测工位天天误判，你来看。看得好，按市价给。', "(On the phone) ...I don't take things for free. Old Qin says the inspection station misjudges parts every day. Come and look at it. If you fix it, I pay the market price."], ['xuan', '你爸比我见过的大多数投资人都上道。', 'Your father has better instincts than most investors I meet.']] },
            ...(h.rel('gu') >= 53 || h.rep() >= 55 ? [{ zh: '东澜。顾磊走之前把我推给了他们合规部：复核工具，三十万，采购流程三个月。', en: "Donglan. Before he left, Gu Lei put me in front of their compliance department. A review tool, three hundred thousand, and three months of procurement.", su: { customer: 'donglan', owed: 300000, slow: true },
              then: [['xuan', '三十万是好单子。三个月是你要自己扛的。', 'Three hundred thousand is a good contract. The three months you carry yourself.']] }] : []),
            { zh: '还没想好。先把产品做出来。', en: "I haven't decided. I'll build the product first.", then: [['xuan', '……产品是客户骂出来的，不是关起门做出来的。这句话还是你跟我说的。', '...A product is what customers shout it into being, not what you build with the door shut. You were the one who told me that.']] },
          ] },
        ],
        (L, S, h) => [
          ['xuan', '第二件事。你一个人撑不了多久。', "Second thing. You won't last long on your own."],
          { ask: [
            ...(h.rel('taoke') >= 55 ? [{ zh: '陶可。她数据做得细，吃过一次亏，再也不会漏。月薪一万八。', en: 'Tao Ke. She is careful with data, she has been burned once and will never let it happen again. Eighteen thousand a month.', su: { hire: 'taoke', pay: 18000 }, rel: { taoke: 6 },
              then: [['taoke', '（电话）……真的吗？我明天就能到。纪白，谢谢你。', '(On the phone) ...Really? I can be there tomorrow. Ji Bai. Thank you.']] }] : []),
            { zh: '小唐每周来两天，一万二。周学长同意了。', en: 'Tang, two days a week, twelve thousand. Zhou has agreed.', su: { hire: 'tang', pay: 12000 }, then: [['engineer', '两边的活我都干得过来。', 'I can manage both jobs.']] },
            { zh: '招一个大厂出来的算法，林一，月薪四万五。贵，但省我半年。', en: 'An algorithms engineer out of one of the big companies. Lin Yi, forty-five thousand a month. Dear, but she saves me six months.', su: { hire: 'linyi', pay: 45000 }, then: [['xuan', '四万五。你的跑道一下短了一半。', 'Forty-five thousand. Your runway just halved.']] },
            { zh: '先不招。我自己来。', en: "Nobody yet. I'll do it myself.", then: [['xuan', '那你就是公司的全部风险。', 'Then you are the whole of the company\'s risk.']] },
          ] },
        ],
      ] },
    { id: 's3', title: B('跑道', 'Runway'), place: F32, cast: ['xuan', 'founder', 'engineer', 'wang'],
      parts: [
        (L, S, h) => {
          const su = h.su(), months = h.runway();
          return [
            ['xuan', `账上 ¥${su.cash.toLocaleString('en-US')}，每个月烧 ¥${h.burn().toLocaleString('en-US')}。${months < 99 ? `还能撑 ${months} 个月。` : '暂时不慌。'}`, `¥${su.cash.toLocaleString('en-US')} in the account, ¥${h.burn().toLocaleString('en-US')} going out a month. ${months < 99 ? `That is ${months} ${months === 1 ? 'month' : 'months'}.` : 'No panic yet.'}`],
            ...(su.customer ? [[null, su.customer === 'works' ? '（厂里的试点：误判从每天四十件降到六件。老秦开始叫你“小纪工”。）' : su.customer === 'arm' ? '（周学长的操作工现在对着平板说话。上周现场出过一次错，你半夜过去改的。）' : '（东澜的合同还在法务。每周一封邮件：“流程中”。）', su.customer === 'works' ? '(The pilot at the works: false rejects down from forty a day to six. Old Qin has begun calling you "Engineer Ji".)' : su.customer === 'arm' ? "(Zhou's operators now talk to a tablet. It went wrong on site once last week. You went over at midnight and fixed it.)" : '(The Donglan contract is still with legal. One email a week: "in process".)']] : [[null, '（没有客户。产品越做越完整，没有一个人骂过它。）', '(No customer. The product grows more complete and nobody has yet sworn at it.)']]),
            ['wang', '小纪，机械臂演示那回我就说要请你吃饭。直说吧：两百万，占两成。条件是三年内营收到三千万，到不了，你的股份补给我。', "Ji Bai. I said I'd buy you dinner back at the arm demo. Plainly, then: two million for twenty per cent. The condition is thirty million in revenue within three years. Miss it and the difference comes out of your shares."],
            { ask: [
              { zh: '钱我要，对赌不签。一百万，占一成，没有对赌。不行就算了。', en: "I want the money and I won't sign the ratchet. One million for ten per cent, no ratchet. If not, we leave it.", su: { invest: 1000000, investor: 'wang-clean' }, r: 2,
                then: [['wang', '……有脾气。行，一百万，一成。我投的是你这个人。', '...Spirit. Very well: one million, ten per cent. It is you I am investing in.']] },
              { zh: '我签。两百万，两成。', en: "I'll sign. Two million, twenty per cent.", su: { invest: 2000000, investor: 'wang-ratchet' }, then: [['wang', '痛快。', 'A man who decides.'], ['xuan', '（小声）三千万。你知道那是多少条产线吗。', '(Quietly) Thirty million. Do you know how many production lines that is?']] },
              { zh: '谢谢王总。现在不融。我想先靠客户的钱活。', en: "Thank you, Mr Wang. Not now. I'd like to live on customers' money first.", su: { bootstrap: true }, r: 1,
                then: [['wang', '有骨气的我见多了，活下来的不多。活下来了，再来找我。', 'I have met plenty with backbone. Fewer who survived. Survive, and come and find me.']] },
              { zh: '（拿起电话）爸，我想跟你借五十万。', en: '(Pick up the phone.) Dad. I want to borrow five hundred thousand.', su: { invest: 500000, investor: 'dad' }, rel: { dad: -3 }, k: 'borrowedDad',
                then: [['dad', '（电话）……账号发我。借条要写。', '(On the phone) ...Send me the account number. And you write me a proper note for it.']] },
            ] },
          ];
        },
      ] },
    { id: 's4', title: B('续约', 'The renewal'), place: F32, cast: ['xuan', 'founder', 'engineer'],
      parts: [
        (L, S, h) => {
          const su = h.su(), ok = h.viable();
          return [
            ...(su.customer === 'works' ? [['dad', '（电话）试点到期了。老秦说要留。按市价，二十万一年，合同你发过来。……发票开专票。', "(On the phone) The pilot has run out. Old Qin says keep it. Market price: two hundred thousand a year. Send the contract. ...And a proper VAT invoice."]]
              : su.customer === 'arm' ? [['founder', '机械臂明年量产。操作台跟着臂一起卖，每台给你分成。这个合同，比八万大。', 'The arm goes into production next year. The console ships with every arm and you take a share of each. That contract is bigger than eighty thousand.']]
                : su.customer === 'donglan' ? [['xuan', '东澜的合同盖章了。三十万，首款十五万，今天到账。', 'Donglan has stamped the contract. Three hundred thousand, half of it up front, in the account today.']]
                  : [['xuan', '四个月了，还是没有客户。我说句难听的：这是个项目，还不是公司。', 'Four months and still no customer. I will say the hard thing: this is a project. It is not yet a company.']]),
            ['xuan', ok ? `账上 ¥${su.cash.toLocaleString('en-US')}。有客户，有人，有钱。……你真做出来了。` : `账上 ¥${su.cash.toLocaleString('en-US')}。年底之前得有个说法。`, ok ? `¥${su.cash.toLocaleString('en-US')} in the account. Customers, people, money. ...You have actually done it.` : `¥${su.cash.toLocaleString('en-US')} in the account. Something has to change before the year ends.`],
            { ask: [
              { zh: '明年做三家。一家一家做扎实，不追数。', en: 'Three customers next year. One at a time, done properly. No chasing numbers.', k: ['suPlan', 'steady'], then: [['founder', '跟我们做臂一个路子。慢，但是活着。', 'The way we build the arm. Slow, and alive.']] },
              { zh: '明年做三十家。现在不跑，就被大厂抄了。', en: "Thirty customers next year. If we don't run now, one of the giants copies us.", k: ['suPlan', 'fast'], then: [['xuan', '这句话我爱听。BP 我帮你改。', "That is what I like to hear. I'll help you redo the deck."]] },
              ...(ok ? [] : [{ zh: '……也许该停了。', en: '...Perhaps it is time to stop.', k: ['suPlan', 'stop'], then: [['xuan', '停不丢人。先别今天定，吃完那顿饭再说。', 'There is no shame in stopping. Only do not decide today. Have that dinner first.']] }]),
            ] },
          ];
        },
      ] },
  ],

  // ---------------------------------------------------------------- the family business
  family: [
    { id: 'f1', title: B('回厂', 'Back at the works'), place: NANJING, cast: ['dad', 'qin'],
      parts: [() => [
        ['dad', '这是新线，做电驱壳体。设备两千万，MES 系统两百万。你自己看。', 'The new line. Electric-drive housings. Twenty million in machines, two million in the MES. See for yourself.'],
        ['qin', '系统说我们上个月合格率 99.2%。实际返工的件堆了半个车间。它只认扫码，不认人拿去返修又放回来。', 'The system says our pass rate last month was 99.2 per cent. In fact the rework is stacked across half the shop. It only knows a scan. It doesn\'t know a man took the part away, reworked it and put it back.'],
        ['dad', '你在外面给别人做这个。给自己家做，会不会？', 'You do this for other people out there. Can you do it for your own family?'],
        { ask: [
          { zh: '先不动系统。给我两周，我跟夜班，从上料跟到包装，看数据是在哪一步开始说假话的。', en: "I won't touch the system yet. Give me two weeks on the night shift, from loading to packing, to see at which step the data starts to lie.", r: 2, rel: { qin: 5, dad: 2 }, k: 'fFloor', sk: { product: 30 },
            then: [['qin', '跟夜班？你爸当年也跟过。', 'The night shift? Your father worked it once, too.'], ['dad', '……工作服去仓库领。', '...Get overalls from the stores.']] },
          { zh: '我先把半年的数据导出来分析，一周给你一份报告。', en: "I'll export six months of data and analyse it first. You will have a report in a week.", rel: { qin: -2, dad: 0 }, k: 'fReport', sk: { ai: 20 },
            then: [['qin', '又是报告。', 'Another report.']] },
          { zh: '系统选型就错了。应该换一套。', en: 'The system was the wrong choice to begin with. It should be replaced.', rel: { dad: -4, qin: -1 }, k: 'fReplace',
            then: [['dad', '两百万，我签的字。你回来第一天，就说我签错了。', 'Two million. I signed for it. And on your first day back you tell me I signed wrong.']] },
        ] },
      ]] },
    { id: 'f2', title: B('胶带', 'Tape'), place: NANJING, cast: ['dad', 'qin', 'operator'],
      parts: [() => [
        ['qin', '视觉检测工位，昨天把好件判废了四十个，线停了三回。夜班的人拿胶带把相机贴上了。', 'The vision inspection station scrapped forty good parts yesterday and stopped the line three times. The night shift have put tape over the camera.'],
        ['operator', '不贴，这个月的计件就没了。纪工，你说怎么办。', "If we don't, there go this month's piece rates. Engineer Ji, you tell us what to do."],
        ['dad', '两百万的设备，贴胶带。谁贴的，报上来。', 'A two-million machine with tape on it. I want the names of whoever did it.'],
        { ask: [
          { zh: '爸，先别查人。他们贴得对：这个工位在误判。停它三天，我和秦师傅把光源和阈值重新标定，误判记在我头上，不扣他们计件。', en: "Dad, no names yet. They were right to tape it: the station is misjudging. Shut it for three days. Old Qin and I recalibrate the lighting and the thresholds. The false rejects go on my account, not on their piece rates.", r: 2, rel: { qin: 5, dad: 1 }, k: ['tape', 'workers'], sk: { hw: 30, ai: 30 },
            then: [['dad', '……三天。三天以后还误判，胶带你自己去贴。', '...Three days. And if it is still misjudging after three days, you can put the tape on yourself.'], ['operator', '纪工，夜里标定我留下帮你。', "Engineer Ji, I'll stay on tonight and help you calibrate."]] },
          { zh: '胶带撕掉，工位照开。今晚我来调参数。', en: "The tape comes off and the station keeps running. I'll tune the parameters tonight.", rel: { qin: -1, dad: 2 }, k: ['tape', 'tune'],
            then: [['qin', '照开，今晚又要停线。', 'Keep it running and the line stops again tonight.']] },
          { zh: '制度就是制度。谁贴的，按规定处理。', en: 'Rules are rules. Whoever did it is dealt with by the book.', rel: { qin: -5, dad: 2 }, r: -2, k: ['tape', 'rules'],
            then: [['operator', '……行。', '...Right.'], [null, '（第二天，夜班少了两个人。）', '(The next day the night shift is two men short.)']] },
        ] },
      ]] },
    { id: 'f3', title: B('九十天', 'Ninety days'), place: NANJING, cast: ['dad', 'qin'],
      parts: [() => [
        ['dad', '主机厂来审核了。九十天之内，每个壳体要能追到哪台机床、哪把刀、哪个人、哪一炉料。做不到，订单给韩家。', "The carmaker's auditors have been. Within ninety days every housing must trace back to its machine, its tool, its operator and its melt. If we cannot, the order goes to the Hans."],
        ['qin', '你原来那家公司来报过价。八百万，十个月。', 'That firm you used to work for sent a quotation. Eight million. Ten months.'],
        { ask: [
          { zh: '不用八百万。每个夹具贴二维码，每个工位一台平板，扫码绑定。土办法，六周，三十万以内。我带着夜班的人一起做。', en: 'It does not need eight million. A QR code on every fixture, a tablet at every station, scan to bind. Rough and ready: six weeks, under three hundred thousand. I do it with the night shift.', r: 4, rel: { dad: 5, qin: 3 }, k: ['audit', 'frugal'], sk: { product: 20, hw: 20 },
            then: [['dad', '……土办法。我那时候追料，是拿粉笔在毛坯上写炉号。', '...Rough and ready. In my day we traced a melt by chalking the heat number on the blank.'], ['qin', '平板别买太贵的，车间油大。', 'Don\'t buy dear tablets. The shop is oily.']] },
          { zh: '请专业公司做。这种事不能省，我去把价格谈下来。', en: "Bring in a proper firm. This is not a place to economise. I'll negotiate the price down.", rel: { dad: -1 }, k: ['audit', 'vendor'],
            then: [['dad', '十个月。九十天，你拿什么交？', 'Ten months. What do you hand over at ninety days?']] },
          { zh: '我一个人写一套。九十天够。', en: "I'll write one myself. Ninety days is enough.", rel: { dad: 1, qin: -1 }, k: ['audit', 'solo'],
            then: [['qin', '一个人写，出了问题半夜找谁？', 'One man writes it, and who do we ring at midnight when it breaks?']] },
        ] },
      ]] },
    { id: 'f4', title: B('二楼的灯', 'The light upstairs'), place: NANJING, cast: ['dad', 'qin', 'mum'],
      parts: [(L, S) => [
        ['qin', S.audit === 'frugal' ? '审核过了。主机厂的人拿手机扫了一个壳体，机床、刀号、操作工、炉号，全出来了。订单续了三年。' : S.audit === 'vendor' ? '审核延了期。主机厂给了宽限，订单分了三成给韩家。' : '审核过了，勉强。系统只有小纪一个人会修。', S.audit === 'frugal' ? "We passed the audit. Their man scanned a housing with his phone and there it all was: machine, tool number, operator, melt. The order is renewed for three years." : S.audit === 'vendor' ? 'The audit was put back. The carmaker gave us grace and thirty per cent of the order to the Hans.' : 'We passed. Just. And only young Ji can mend the system.'],
        ['dad', '（夜班，二楼办公室。他没开大灯。）这半年你做的，我都看着。', '(Night shift, the upstairs office. He has not put the main light on.) I have watched everything you did these six months.'],
        ['dad', '下个月去上海，嘉定有个供应商要见。到时候吃顿饭，把以后的事说定。', 'Next month I am in Shanghai to see a supplier in Jiading. We will have dinner then and settle what comes next.'],
        ['dad', '副总的牌子我让人做了。挂不挂，你自己说。', "I've had a deputy general manager's nameplate made. Whether it goes up is for you to say."],
        { ask: [
          { zh: '挂。', en: 'Put it up.', rel: { dad: 5 }, k: ['plate', 'yes'], then: [['dad', '……嗯。', '...Mm.'], ['mum', '（电话）你爸刚才给我打电话，一句话没说，就笑。', '(On the phone) Your father rang me just now. Didn\'t say a word. Just laughed.']] },
          { zh: '先不挂。爸，厂里的数字化我想接着做，但我想把它做成一家自己的小公司，也接别家的活。吃饭那天我跟你细说。', en: "Not yet. Dad, I want to go on with the digital side of the works. But I want to make it a small company of my own, one that takes other people's work as well. I'll lay it out for you at that dinner.", rel: { dad: 1 }, k: ['plate', 'own'],
            then: [['dad', '……别家。韩家的活你也接？', "...Other people's. The Hans' too?"], ['dad', '吃饭那天，你把账算给我看。', 'At that dinner, show me the sums.']] },
          { zh: '爸，让我想到吃饭那天。', en: 'Dad. Let me think until that dinner.', k: ['plate', 'unsure'], then: [['dad', '行。牌子放我抽屉里。', "All right. The plate stays in my drawer."]] },
        ] },
      ]] },
  ],
};
