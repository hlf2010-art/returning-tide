// The working year, Acts I-III: what is said at the firm, day by day. Pure data over life (the rules
// that run it are world/career.js; the four roads of Act IV are world/careerRoads.js).
// Written in Chinese first, the way a Lujiazui consulting floor talks (the English words are theirs:
// deck, PM, kick-off, offer), with English alongside.
//
// A scene: { id, day, title, place, cast: who is in the room, parts: [(L, S) => beats], absent(L, S) }
//   beats    [who, zh, en] lines (who null: Ji Bai, or what he notices), and { ask: [answers] }
//   answer   { zh, en, then: [lines], and what it does:
//              s    how the firm sees him (year.standing)      r    his name in the trade (rep 'work')
//              zw   Xu Zhiwei's trust (hearts.feel)            rel  { id: delta } colleagues and clients
//              k    'flag' or ['key', value], remembered in S (life.flags.year.work.story)
//              cash yuan into (+) or out of (-) the bank       fx   (L, S) => anything else }
//   absent   what happens to the day's decision if he isn't there
// Parts are functions so that a later part can follow from an earlier answer.
const B = (zh, en) => ({ zh, en });
export const FIRM = { zh: '迈芬咨询', en: 'Marlowe Finch', floor: 28, place: B('陆家嘴 · 国金中心二期 28 层 · 迈芬咨询', 'Lujiazui · IFC Tower 2, 28F · Marlowe Finch') };
export const CLIENT = B('东澜保险', 'Donglan Insurance');
export const NEWCO = B('屿深科技', 'Yushen Technology');
export const WORKS = B('纪氏精工', "Ji's Precision Works");
// who's who at work (names for the subtitles; the cards for free conversation are in world/career.js)
export const CAREER_NAMES = {
  zhiwei: ['许知微', 'Xu Zhiwei'], partner: ['贺维安', 'Raymond He'], taoke: ['陶可', 'Tao Ke'], shaofeng: ['邵峰', 'Shao Feng'],
  feng: ['冯总', 'Ms Feng'], gu: ['顾磊', 'Gu Lei'], chair: ['郑董', 'Chairman Zheng'], hr: ['HR 曹敏', 'HR (Cao Min)'],
  sheng: ['盛总', 'Mr Sheng'], planner: ['计划员老周', 'Zhou, the planner'], qin: ['老秦', 'Old Qin'], mum: ['妈妈', 'Mum'], dad: ['爸爸', 'Dad'],
  xuan: ['陆明轩', 'Mingxuan'], founder: ['周学长', 'Zhou'], engineer: ['工程师小唐', 'Tang, the engineer'], wang: ['王总', 'Mr Wang'], linyi: ['林一', 'Lin Yi'],
  zhoumin: ['周敏', 'Zhou Min'], operator: ['操作工', 'Operator'],
};
const heldOut = (S) => (S.leakKnown ? 86 : 71) + (S.timeline === 'pilot' ? 3 : 0);

export const FIRM_SCENES = [
  // ================= Act I · day 2 · Tuesday 10 November =================
  { id: 'd2', day: 2, title: B('入职', 'First day'), place: FIRM.place, cast: ['zhiwei', 'taoke', 'shaofeng', 'partner'],
    parts: [
      () => [
        ['zhiwei', '纪白？我是许知微，这个项目的 PM。工牌和电脑在你桌上，IT 十点来装 VPN。', "Ji Bai? Xu Zhiwei. I'm the engagement manager on this one. Your badge and laptop are on your desk. IT will be round at ten to set up the VPN."],
        ['zhiwei', '先说项目。客户是东澜保险，做理赔的 AI 助手：理赔员上传病历和发票，模型读材料、对条款、给建议。合同签到明年三月。', 'The project first. The client is Donglan Insurance. An AI assistant for claims: the adjuster uploads the medical records and the invoices, the model reads them, checks them against the policy and makes a recommendation. The contract runs to March.'],
        ['zhiwei', '团队四个人。陶可，分析师，去年复旦毕业。邵峰，高级顾问，比你早来三年。合伙人是 Raymond，贺维安，你面试见过。', "Four of us. Tao Ke, analyst, out of Fudan last year. Shao Feng, senior consultant, three years ahead of you. The partner is Raymond, He Wei'an. You met him at interview."],
        ['taoke', '纪老师好！你在湾区做的那个产品，发布会我看了两遍。', 'Hello! That product you worked on in the Bay Area: I watched the launch twice.'],
        ['shaofeng', '欢迎。硅谷回来的，正好，我们的 deck 还缺几个英文单词。', 'Welcome. Back from the Valley. Perfect: our decks are a few English words short.'],
        { ask: [
          { zh: '叫我纪白就行。先把现在的东西给我看看，我少说多看。', en: "Just Ji Bai. Show me what there is first. I'll talk less and look more.", s: 2, zw: 2,
            then: [['zhiwei', '好。陶可，把评测表发他。', 'Good. Tao Ke, send him the evaluation sheet.']] },
          { zh: '英文单词管够。中文的条款，你们得教我。', en: "Plenty of English where that came from. The policy wording you'll have to teach me.", s: 1, rel: { shaofeng: 2, taoke: 1 },
            then: [['shaofeng', '行，开得起玩笑，能处。', "All right. He can take a joke. We'll get on."]] },
          { zh: '我在那边带过十二个人的产品线。有什么我直接上手。', en: "I ran a twelve-person product line over there. Whatever there is, I'll take it straight on.", s: -1, rel: { shaofeng: -2 },
            then: [['zhiwei', '这儿不一样。客户买的是我们的结论，不是功能。先看一周。', "It's different here. The client buys our conclusions, not features. Watch for a week first."]] },
          { zh: '（点点头）', en: '(Nod.)', then: [] },
        ] },
        ['partner', '小纪到了？好。东澜是我们今年在华东最重要的 AI 案子。做成了，后面还有三家保险公司在排队。', "Ji Bai's here? Good. Donglan is our most important AI engagement in East China this year. Get it right and there are three more insurers in the queue."],
        ['partner', '知微，下周三 kick-off 的材料，周五给我过一遍。', "Zhiwei, take me through the material for next Wednesday's kick-off on Friday."],
        ['zhiwei', '好的，Raymond。', 'Will do, Raymond.'],
      ],
      () => [
        ['zhiwei', '陶可那张评测表有四千多行，是模型在历史案卷上的对错。本来该有人逐条抽查，一直没人有空。', "Tao Ke's evaluation sheet has four thousand-odd rows: where the model was right and wrong on past claim files. Someone should have been spot-checking it. Nobody has had the time."],
        { ask: [
          { zh: '我来。这周之内抽五百条看完。', en: "I'll do it. Five hundred rows by the end of the week.", s: 3, zw: 3, rel: { taoke: 2 }, k: 'evalChecked',
            then: [['zhiwei', '第一天就揽活。行，周五告诉我你看到了什么。', 'Taking work on, on day one. All right. Tell me on Friday what you found.']] },
          { zh: '可以。但我想先见见客户的理赔员，看他们实际怎么用。', en: "Yes. But I'd like to meet the client's adjusters first and see how they would actually use it.", s: 2, zw: 2, k: 'metUsers',
            then: [['zhiwei', '做产品的习惯。周三 kick-off 之后，我给你约他们的顾工。', "A product person's habit. I'll get you time with their Mr Gu after Wednesday's kick-off."]] },
          { zh: '我刚来，先熟悉熟悉环境吧。', en: "I've only just arrived. Let me find my feet first.", s: -1, then: [['zhiwei', '也行。', 'Fine.']] },
        ] },
        ['zhiwei', '对了，三点到四点我跟客户通电话，你有事自己安排。六点半以后没人拦你下班，不过也没人六点半走。', "By the way, I'm on a call with the client from three to four, so that hour is yours. Nobody will stop you leaving after six thirty. Nobody leaves at six thirty either."],
      ],
    ],
    absent: () => {} },

  // ================= Act I · day 3 · Wednesday 11 November =================
  { id: 'd3', day: 3, title: B('客户启动会', 'The kick-off'), place: FIRM.place, cast: ['zhiwei', 'shaofeng', 'partner', 'feng', 'gu'],
    parts: [
      () => [
        ['feng', '贺总，客套话不说了。我们理赔中心三百二十个人，去年平均结案十一天，同业是六天。董事会给我的数，是明年年中降到七天。', "Mr He, let's skip the pleasantries. Three hundred and twenty people in our claims centre. Last year a claim took eleven days to close. The industry does it in six. The board's number for me is seven by the middle of next year."],
        ['partner', '冯总放心，我们的方案……', 'Ms Feng, rest assured, our proposal...'],
        ['feng', '方案我看过了。我要的是春节前，一月十二号，给我们董事长现场演示。真案卷，不是你们挑过的。', "I've read the proposal. What I want is a live demonstration for our chairman before Spring Festival, on the twelfth of January. Real files, not ones you've picked."],
        ['partner', '没问题。', 'No problem.'],
        ['zhiwei', '（压低声音）两个月。现在连数据脱敏都没做完。', "(Under her breath) Two months. We haven't even finished anonymising the data."],
        ['feng', '这位是新来的？硅谷回来的那位？你说说，两个月够不够。', "You're the new one? The one back from Silicon Valley? You tell me. Is two months enough?"],
        { ask: [
          { zh: '全量不够。两个月能做扎实的是一个险种：住院医疗，占你们案件量四成。先把这一个做好。', en: 'Not for everything. What two months can do properly is one line of business: inpatient medical, forty per cent of your volume. Do that one well first.', s: 3, r: 3, rel: { feng: 2, gu: 3, partner: -1 }, k: ['timeline', 'pilot'],
            then: [['feng', '……一个险种。贺总，你们的人比你敢说。行，就住院医疗。但一月十二号，一天不能晚。', '...One line. Mr He, your people are bolder than you are. Fine: inpatient medical. But the twelfth of January, and not a day later.'], ['partner', '（笑）年轻人，说话直。', '(Laughs) The young speak plainly.']] },
          { zh: '够。我们会全力以赴。', en: "It's enough. We'll give it everything we have.", s: 1, zw: -2, rel: { partner: 3 }, k: ['timeline', 'agree'],
            then: [['feng', '好。这句话我记住了。', "Good. I'll remember you said so."], ['zhiwei', '（散会后）“够”这个字，下次说之前先看我一眼。', '(Afterwards) Next time, before you say "enough", look at me first.']] },
          { zh: '不够。照现在的数据质量，一月十二号拿真案卷演示，会出事。', en: "It isn't. With the data in its present state, a demonstration on real files on the twelfth of January will go wrong.", s: -1, r: 1, zw: 2, rel: { feng: -1, partner: -4, gu: 2 }, k: ['timeline', 'push'],
            then: [['feng', '那你们签合同的时候怎么不说？', "Then why didn't you say so when you signed the contract?"], ['partner', '冯总，他刚来，情况还不熟。时间我来保证。', "Ms Feng, he has only just joined and doesn't know the ground yet. The date is my guarantee."]] },
          { zh: '（看向贺维安，不说话）', en: '(Look at Raymond. Say nothing.)', k: ['timeline', 'agree'], then: [['partner', '够的，冯总。', "It's enough, Ms Feng."]] },
        ] },
        ['gu', '（散会后）我是顾磊，理赔系统是我带人维护的。说句实话：我们的历史案卷，有三成是手写病历拍的照片。你们的模型认得出吗？', "(Afterwards) Gu Lei. My team keeps the claims system running. To be honest with you: thirty per cent of our past files are photographs of handwritten hospital notes. Can your model read those?"],
        { ask: [
          { zh: '现在认不出。你能不能给我一批最差的样本？越差越好。', en: 'Not yet. Can you get me a batch of the worst ones? The worse the better.', s: 1, rel: { gu: 3 }, k: 'worstSamples',
            then: [['gu', '越差越好。头一回有乙方这么跟我要东西。周五发你。', "The worse the better. That's the first time a vendor has asked me for that. You'll have them on Friday."]] },
          { zh: '技术上都能解决。', en: 'Technically it can all be solved.', rel: { gu: -2 }, then: [['gu', '……行。你们都这么说。', '...Right. You all say that.']] },
          { zh: '我回去问问团队。', en: "I'll ask the team.", then: [['gu', '好。', 'OK.']] },
        ] },
      ],
      (L) => ((L.invites.find((i) => i.id === 'yinuo-flat') || {}).status === 'accepted' && !(L.invites.find((i) => i.id === 'yinuo-flat') || {}).kept ? [
        ['zhiwei', '你下午要出去？', "You're going out this afternoon?"],
        { ask: [
          { zh: '两小时。朋友看房，我答应了的。会议纪要我晚上补上。', en: "Two hours. A friend is viewing a flat and I said I'd go. I'll write up the minutes tonight.", zw: 1, k: 'leaveD3', fx: (L2, S) => { S.excused = L2.clock.day; },
            then: [['zhiwei', '去吧。纪要十点前发我。', 'Go on. Minutes to me by ten.']] },
          { zh: '不去了。我跟朋友说一声。', en: "No. I'll let my friend know.", s: 1, then: [['zhiwei', '随你。', 'Up to you.']] },
        ] },
      ] : []),
    ],
    absent: (L, S) => { S.timeline = 'agree'; } },

  // ================= Act I · day 4 · Thursday 12 November =================
  { id: 'd4', day: 4, title: B('那一页是谁的', 'Whose page it is'), place: FIRM.place, cast: ['zhiwei', 'taoke', 'shaofeng', 'partner'],
    parts: [
      (L, S) => [
        ['shaofeng', '……所以我的建议是分两层：先用规则把条款拆成可以逐条检查的条件，模型只负责读材料、填条件。这样每一个结论都能追到条款原文。', '...so my proposal is two layers. Rules first, to break the policy wording into conditions that can be checked one by one. The model only reads the documents and fills the conditions in. That way every conclusion traces back to the wording itself.'],
        ['partner', '这个思路好。邵峰，这页放进 kick-off 之后的第一版方案，署你的名字。', 'I like this. Shao Feng, put this page into the first version of the design after kick-off, under your name.'],
        [null, '（这是你昨天夜里发在项目群里的那张图。一个字没改。）', '(It is the diagram you posted in the project chat last night. Not a word changed.)'],
        { ask: [
          { zh: '这页是我昨晚发在群里的。邵峰讲得比我清楚，署两个人的名字吧。', en: 'That page is the one I posted in the chat last night. Shao Feng explains it better than I do. Put both our names on it.', s: 2, r: 2, zw: 2, rel: { shaofeng: -3, partner: 1 }, k: ['credit', 'called'],
            then: [['partner', '哦？那就两个人。小纪，下次自己的东西自己讲。', 'Oh? Both names, then. Ji Bai, next time present your own work yourself.'], ['shaofeng', '……当然，本来就是一起讨论的。', '...Of course. We discussed it together anyway.']] },
          { zh: '（会上不说，会后找邵峰）下次用我的图，提前说一声。我不介意你讲，介意的是不知道。', en: "(Say nothing in the meeting; find Shao Feng afterwards.) Next time you use my diagram, tell me first. I don't mind you presenting it. I mind not knowing.", s: 1, rel: { shaofeng: 2 }, k: ['credit', 'private'],
            then: [['shaofeng', '……行，算我欠你一次。在这儿，会讲的人才有项目做。你早晚也得学。', '...All right. I owe you one. Round here the ones who can present are the ones who get the projects. You will have to learn it sooner or later.']] },
          { zh: '（什么都不说）', en: '(Say nothing at all.)', s: -1, k: ['credit', 'let'], then: [[null, '（你什么都没说。陶可看了你一眼。）', '(You say nothing. Tao Ke glances at you.)']] },
          { zh: '（会后告诉知微）那页是我的。我不想闹，但你应该知道。', en: "(Tell Zhiwei afterwards.) That page was mine. I don't want a scene, but you should know.", s: 1, zw: 2, k: ['credit', 'zhiwei'],
            then: [['zhiwei', '我知道，群消息我都看。Raymond 不看群。这种事还会有第二次，到时候你自己开口。', "I know. I read the chat. Raymond doesn't. There will be a second time, and then you open your own mouth."]] },
        ] },
        ['taoke', S.evalChecked ? '纪白，那张评测表你抽到哪儿了？我有个地方不太确定……明天能帮我看一眼吗？' : '纪白……那张评测表，我有个地方不太确定。明天能帮我看一眼吗？', S.evalChecked ? "Ji Bai, how far have you got with the evaluation sheet? There's something I'm not sure of... could you look at it with me tomorrow?" : "Ji Bai... the evaluation sheet. There's something I'm not sure of. Could you look at it with me tomorrow?"],
      ],
    ],
    absent: (L, S) => { S.credit = 'let'; } },

  // ================= Act I · day 5 · Friday 13 November =================
  { id: 'd5', day: 5, title: B('六百行', 'Six hundred rows'), place: FIRM.place, cast: ['zhiwei', 'taoke', 'shaofeng'],
    parts: [
      () => [
        ['taoke', '你看这一列。测试集里有六百多条，案卷号跟训练集是重的。我导数据的时候可能没去重。', 'Look at this column. Six hundred-odd rows in the test set have the same file numbers as the training set. I may not have de-duplicated when I exported.'],
        ['taoke', '要是真的，那 94% 的准确率就是虚的。我不敢跟知微姐说，周三刚跟客户报过这个数。', "If that's right, the 94 per cent isn't real. I daren't tell Zhiwei. We gave the client that number on Wednesday."],
        { ask: [
          { zh: '先别慌。今天下午我们俩把重的剔掉重跑，拿着真数去说。我陪你去。', en: "Don't panic yet. This afternoon the two of us strip the duplicates out and run it again, and then we go in with the real number. I'll come with you.", s: 2, zw: 3, rel: { taoke: 5 }, k: 'helpedTao', fx: (L, S) => { S.leakKnown = true; },
            then: [[null, '（重跑出来是 78%。）', '(Run again, it comes out at 78 per cent.)'], ['zhiwei', '……78。比我怕的好，比我们报的差。这事我去跟 Raymond 说，你们把去重脚本留好。', "...Seventy-eight. Better than I feared, worse than we reported. I'll take it to Raymond. Keep the de-duplication script safe, both of you."], ['zhiwei', '纪白，谢谢你没让她一个人扛。', 'Ji Bai. Thank you for not leaving her to carry it alone.']] },
          { zh: '这得你自己去说，越早越好。我可以帮你把话理顺。', en: 'This one you have to say yourself, and the sooner the better. I can help you get the words straight.', s: 1, rel: { taoke: 1 },
            then: [['taoke', '……好。我周末想想怎么说。', "...OK. I'll think over the weekend about how to say it."]] },
          { zh: '我今天三点楼上有事。周一再看？', en: "I've got something upstairs at three today. Monday?", rel: { taoke: -2 }, then: [['taoke', '好……没事，周一。', 'OK... no problem. Monday.']] },
        ] },
      ],
      () => [
        ['zhiwei', '第一周。说说你的感觉。', 'Your first week. Tell me how it seems to you.'],
        { ask: [
          { zh: '客户要的是结案天数，我们卖的是准确率。这两个数中间，隔着理赔员愿不愿意用。', en: "The client wants days-to-close. We're selling accuracy. Between those two numbers is whether an adjuster is willing to use the thing.", s: 2, zw: 3, k: 'sawAdoption',
            then: [['zhiwei', '……这句话你写下来。下周我要用。', "...Write that sentence down. I'm going to need it next week."]] },
          { zh: '节奏比我想的快，话比我想的绕。', en: 'Faster than I expected, and people talk in more circles than I expected.', zw: 1,
            then: [['zhiwei', '绕，是因为每句话都有人要负责。慢慢你也会绕。', 'They circle because somebody is answerable for every sentence. Give it time. You will too.']] },
          { zh: '挺好的。', en: "It's good.", then: [['zhiwei', '嗯。周一见。', 'Mm. See you Monday.']] },
        ] },
        ['zhiwei', '晚上团队吃饭，人均两百的那种，公司报销。来不来随你。', "Team dinner tonight, the two-hundred-a-head kind, on the firm. Come or don't, as you like."],
      ],
    ],
    absent: () => {} },

  // ================= Act II · day 7 · Monday 11 January 2027 =================
  { id: 'd7', day: 7, title: B('第三页上的数', 'The number on page three'), place: FIRM.place, cast: ['zhiwei', 'taoke', 'shaofeng', 'partner'],
    parts: [
      (L, S) => [
        ...(S.leakKnown
          ? [['zhiwei', '去重的事年前跟 Raymond 说了。他让我们对外口径先不动，把模型提上来再说。现在真数是 ' + heldOut(S) + '%。', `We told Raymond about the duplicates before the holiday. He said to leave what we tell the client alone and get the model up first. The real number is now ${heldOut(S)} per cent.`]]
          : [['taoke', '纪白，知微姐……测试集和训练集有六百多条是重的。我上周才确认。去掉以后，准确率是 ' + heldOut(S) + '%。', `Ji Bai, Zhiwei... six hundred-odd rows of the test set are also in the training set. I only confirmed it last week. Without them the accuracy is ${heldOut(S)} per cent.`],
            ['zhiwei', '……明天演示。你现在告诉我。', '...The demonstration is tomorrow. And you are telling me now.']]),
        ['zhiwei', '明天的 deck 第三页还写着 94%。Raymond 的意思是不改：“演示看的是效果，不是数字。”', 'Page three of tomorrow\'s deck still says 94 per cent. Raymond\'s view is that it stays. "A demonstration is about what they see, not the number."'],
        { ask: [
          { zh: '改成真数，旁边写清楚是怎么测的。我去跟 Raymond 说。说不通，就说是我坚持的。', en: "Change it to the real number, with how it was measured beside it. I'll tell Raymond. If he won't have it, say it was me who insisted.", r: 2, zw: 4, rel: { partner: -3 }, k: ['deck', 'true'],
            then: [['partner', '（电话里）……你知道这个数拿出去，冯玉兰会怎么压我们的尾款吗？行，改。出了事，你坐我旁边。', '(On the phone) ...Do you know what Feng Yulan will do to our final payment with that number in her hand? Fine. Change it. And if it goes wrong, you sit next to me.']] },
          { zh: '数字不动，但明天这一页我来讲：讲清楚这是哪一批数据上的结果。', en: 'Leave the number, but let me present that page tomorrow and say exactly which data it comes from.', s: 1, zw: 1, k: ['deck', 'framed'],
            then: [['zhiwei', '折中。行，你讲。', 'A compromise. All right. You present it.']] },
          { zh: '听 Raymond 的吧。', en: "Let's do as Raymond says.", s: 1, zw: -2, rel: { partner: 2 }, k: ['deck', '94'], then: [['zhiwei', '……好。', '...Fine.']] },
          { zh: '（沉默）', en: '(Silence.)', k: ['deck', '94'], then: [['zhiwei', '那就不改了。', "Then it stays as it is."]] },
        ] },
        ['shaofeng', '明天谁来操作？我建议我来，客户那边我熟。', "Who drives tomorrow? I'd suggest me. I know the client's people."],
        { ask: [
          { zh: '我来操作。出了问题，我知道怎么解释。', en: "I'll drive. If something goes wrong I know how to explain it.", s: 1, k: ['driver', 'me'], then: [['zhiwei', '行。邵峰坐客户旁边。', 'All right. Shao Feng sits beside the client.']] },
          { zh: '你来。我坐旁边盯日志。', en: "You drive. I'll sit beside you and watch the logs.", rel: { shaofeng: 2 }, k: ['driver', 'shao'], then: [['shaofeng', '放心。', 'Leave it to me.']] },
        ] },
      ],
    ],
    absent: (L, S) => { S.deck = '94'; S.driver = 'shao'; } },

  // ================= Act II · day 8 · Tuesday 12 January =================
  { id: 'd8', day: 8, title: B('演示', 'The demonstration'), place: FIRM.place, cast: ['zhiwei', 'shaofeng', 'partner', 'feng', 'gu', 'chair'],
    parts: [
      (L, S) => [
        ['feng', '郑董，这就是我跟您说的理赔助手。今天的案卷是早上我们自己从库里抽的，他们没见过。', "Chairman Zheng, this is the claims assistant I told you about. This morning's files we pulled from the archive ourselves. They haven't seen them."],
        ...(S.deck === 'true' ? [['partner', `先说明一点：在没见过的案卷上，目前的准确率是 ${heldOut(S)}%，测试方法在第三页。`, `One thing first: on files it has never seen, the accuracy today is ${heldOut(S)} per cent. How we measured it is on page three.`], ['chair', '嗯。肯报真数的乙方不多。', 'Mm. Not many vendors offer the real number.']]
          : S.deck === 'framed' ? [[null, '（第三页你讲了：94% 是在包含历史重复案卷的数据上测的，新案卷会低。冯总皱了皱眉，没有打断。）', '(You present page three: the 94 per cent was measured on data that included repeated past files, and new files will score lower. Ms Feng frowns and does not interrupt.)']]
            : [['partner', '准确率 94%，行业领先。', 'Accuracy of 94 per cent. Ahead of the industry.']]),
        [null, '（前两个案卷，模型读得又快又准。郑董点了点头。）', '(The first two files the model reads quickly and correctly. The chairman nods.)'],
        [null, '（第三个：七十三岁，髋关节置换，材料是手写病历的照片。模型的建议是“拒赔”，理由引了“条款第 14.3 条：既往症除外”。）', '(The third: seventy-three years old, a hip replacement, the documents photographs of handwritten notes. The model recommends REJECT, citing "clause 14.3: pre-existing conditions excluded".)'],
        ['gu', '……我们的条款没有 14.3 条。', '...Our policy has no clause 14.3.'],
        [null, '（投影上，这位老人的姓名和身份证号一字不差地亮着。脱敏没有生效。）', "(On the projector the old woman's name and ID number are there in full. The anonymising has not worked.)"],
        ['chair', '这是真人的身份证号吧？', "That is a real person's ID number, isn't it?"],
        { ask: [
          { zh: '（站起来）是。郑董，这是我们的问题，有两个：模型编了一条不存在的条款；脱敏在照片类材料上没生效。我现在把投影关掉。这一单要是照它的建议办，就是错拒。', en: "(Stand up.) Yes. Chairman, these are our faults, and there are two. The model has invented a clause that doesn't exist. And the anonymising failed on photographed documents. I'm turning the projector off now. If this claim were handled as it recommends, it would be a wrongful rejection.",
            s: 1, r: 5, zw: 3, rel: { gu: 4, feng: 1, partner: -3 }, k: ['demo', 'honest'],
            then: [['chair', '……至少有人说人话。冯总，这个东西，在他们说清楚之前，一单都不许上生产。', '...At least somebody here speaks plainly. Ms Feng, until they have explained themselves, this does not touch a single live claim.'], ['feng', '（对贺维安）贺总，一周之内，我要书面说明。', '(To Raymond) Mr He. A written account, within the week.']] },
          { zh: '郑董，这是测试环境的模拟数据，身份证号是生成的。条款编号是显示问题。', en: 'Chairman, this is simulated data in a test environment. The ID number is generated. The clause number is a display issue.', s: -2, r: -6, zw: -4, rel: { gu: -6, partner: 2 }, k: ['demo', 'spin'],
            then: [['gu', '（看着你）……早上的案卷是我亲手抽的。', '(Looking at you) ...I pulled this morning\'s files myself.'], ['chair', '顾工？', 'Mr Gu?'], ['gu', '……是真案卷，郑董。', '...They are real files, Chairman.'], [null, '（会议室里很安静。）', '(The room is very quiet.)']] },
          { zh: '（看向操作的人，不说话）', en: '(Look at whoever is driving. Say nothing.)', s: -2, r: -2, k: ['demo', 'silent'],
            then: [['shaofeng', '呃，这个……可能是版本的问题……', 'Er, this... it may be a version problem...'], ['chair', '贺总，你们自己知道它在说什么吗？', 'Mr He. Do your own people know what it is saying?']] },
        ] },
        ['partner', '都回公司。知微，今晚把事故经过写出来：谁抽的测试集，谁签的上线检查，一条一条写。', 'Everyone back to the office. Zhiwei, write up what happened, tonight. Who drew the test set, who signed the release checklist. Line by line.'],
        ['taoke', '（小声）上线检查是我签的……', '(Quietly) I signed the release checklist...'],
      ],
    ],
    absent: (L, S) => { S.demo = 'absent'; } },

  // ================= Act II · day 9 · Tuesday 23 February =================
  { id: 'd9', day: 9, title: B('整改报告', 'The remediation report'), place: FIRM.place, cast: ['zhiwei', 'taoke', 'shaofeng', 'partner'],
    parts: [
      () => [
        ['partner', '东澜没有解约，但尾款扣着。冯玉兰开了条件：三月一号试点上线，季度末之前，理赔中心人均结案量提两成。', "Donglan hasn't terminated, but they are holding the final payment. Feng Yulan has set her terms: the pilot goes live on the first of March, and cases closed per head go up by a fifth before the end of the quarter."],
        ['partner', '她要的做法是：模型置信度高的，直接出结论，不过人。包括拒赔。', 'The way she wants it done: where the model is confident, it issues the decision itself, with nobody in between. Rejections included.'],
        ['shaofeng', '技术上没问题。置信度九成以上的案子，错的不到百分之三。', 'No technical problem. Above ninety per cent confidence, fewer than three in a hundred are wrong.'],
        [null, '（百分之三。一个季度四万件住院理赔，过线的大概一半。六百个人，会收到一封没有人看过的拒赔通知。多数是老人。）', '(Three in a hundred. Forty thousand inpatient claims a quarter, about half of them over the line. Six hundred people will get a rejection letter that no person has read. Most of them old.)'],
        ['partner', '另外，整改报告里的准确率，写“经验证样本上 92%”。那两百个样本是知微他们一条条核过的，数是真的。', 'And in the remediation report the accuracy reads "92 per cent on a validated sample". Zhiwei\'s people checked those two hundred cases one by one. The number is real.'],
        ['zhiwei', '那两百条是挑过的，Raymond。全是打印件。', 'Those two hundred were chosen, Raymond. Every one of them is a typed document.'],
        ['partner', '所以才叫“经验证样本”。小纪，报告的技术部分你来签。', 'Which is why it says "validated sample". Ji Bai, you sign the technical section.'],
        { ask: [
          { zh: '我不签。拒赔必须过人，报告写全量上的真数。这两条我会写进给客户合规部的技术说明里，抄送你。', en: "I won't sign it. A rejection has to pass a person, and the report gives the real number on the full set. I'll put both in a technical note to the client's compliance department, copied to you.",
            s: -8, r: 6, zw: 5, rel: { partner: -8, taoke: 2, gu: 3, feng: -3 }, k: ['report', 'refuse'], fx: (L, S) => { S.review = true; },
            then: [['partner', '绕过合伙人直接写给客户合规，你知道在这一行叫什么吗？', 'Going round the partner, straight to the client\'s compliance people. Do you know what that is called in this business?'], ['zhiwei', '叫留痕，Raymond。他写，我也签。', "It's called a paper trail, Raymond. If he writes it, I sign it too."], ['partner', '……好。你们两个的名字，我记下了。', '...Very well. I have both your names.']] },
          { zh: '92% 可以写，后面加一句：手写材料上是 71%。自动通过可以，自动拒赔不行，拒赔留人工复核。这样我签。', en: 'The 92 can stay if the next sentence says: 71 per cent on handwritten documents. Automatic approval, yes. Automatic rejection, no: every rejection goes to a human reviewer. On those terms I sign.',
            s: -2, r: 3, zw: 3, rel: { partner: -2, feng: -1 }, k: ['report', 'appendix'], fx: (L, S) => { S.review = true; },
            then: [['partner', '……复核会吃掉一半的效率。', '...Review will eat half the gain.'], ['zhiwei', '也会吃掉全部的投诉。', 'And all of the complaints.'], ['partner', '行。附录里写，正文不动。', 'Fine. In an appendix. The main text stays as it is.']] },
          { zh: '我签。', en: "I'll sign.", s: 5, r: -3, zw: -5, rel: { partner: 5, shaofeng: 1 }, k: ['report', 'sign'],
            then: [['partner', '好。这才是做项目。', 'Good. That is how an engagement is run.'], [null, '（知微没有看你。）', '(Zhiwei does not look at you.)']] },
          { zh: '我需要一天。', en: 'I need a day.', s: -1, zw: -3, k: ['report', 'silent'],
            then: [['zhiwei', '没有一天了，报告今晚发。……我签吧，我是 PM。', "There isn't a day. The report goes tonight. ...I'll sign it. I'm the manager."], [null, '（知微一个人签了。）', '(Zhiwei signs it alone.)']] },
        ] },
      ],
      (L, S) => (S.review ? [
        ['shaofeng', '你清高。尾款要是拿不回来，年底大家的奖金你出？', "You can afford principles. If the final payment doesn't come in, are you paying everyone's bonus at the end of the year?"],
        { ask: [
          { zh: '奖金我赔不起。六百封错的拒赔信，公司也赔不起。', en: "I can't pay the bonuses. And the firm can't pay for six hundred wrongful rejection letters.", r: 1, rel: { shaofeng: -1 }, then: [['shaofeng', '……话都让你说了。', "...You've an answer for everything."]] },
          { zh: '我知道这钱是大家的。所以报告我今晚重写，不让你们返工。', en: "I know it's everyone's money. Which is why I'm rewriting the report myself tonight, so that none of you has to.", s: 1, rel: { shaofeng: 2 }, then: [['shaofeng', '……行吧。附录的数据我帮你拉。', "...All right. I'll pull the data for your appendix."]] },
        ] },
      ] : [
        ['taoke', '（茶水间）纪白……那百分之三里面的人，会有人帮他们再看一遍吗？', '(In the pantry) Ji Bai... the people in that three per cent. Will anyone look at theirs again?'],
        { ask: [
          { zh: '有申诉通道。', en: 'There is an appeals channel.', then: [['taoke', '……嗯。', '...Mm.']] },
          { zh: '……不会。', en: '...No.', rel: { taoke: 1 }, then: [['taoke', '我也觉得不会。', "I didn't think so either."]] },
        ] },
      ]),
    ],
    absent: (L, S) => { S.report = 'silent'; S.review = false; } },

  // ================= Act II · day 10 · Tuesday 9 March =================
  { id: 'd10', day: 10, title: B('根本原因', 'Root cause'), place: FIRM.place, cast: ['zhiwei', 'taoke', 'shaofeng', 'partner'],
    parts: [
      (L, S) => [
        ...(S.review ? [
          ['zhiwei', '试点两周。自动通过的那一半，结案从十一天降到四天。拒赔的全部过了人，复核组驳回了模型三十七单。', 'Two weeks of the pilot. The half that is approved automatically has gone from eleven days to four. Every rejection went past a person, and the review team overturned the model on thirty-seven.'],
          ['feng', '（电话免提）那三十七单要是发出去了，我现在就在监管局喝茶。……尾款这周走流程。', '(On speaker) If those thirty-seven had gone out, I would be taking tea at the regulator\'s by now. ...Your final payment goes into process this week.'],
        ] : [
          ['zhiwei', '看热搜了吗？“七旬老人髋关节手术被 AI 拒赔”。东澜的客服电话被打爆了。是试点第二周的单子。', 'Have you seen what\'s trending? "Seventy-year-old\'s hip operation rejected by AI." Donglan\'s hotline is jammed. It is a case from the second week of the pilot.'],
          ['partner', '总部风险委员会下周到。在那之前，谁都不许对外说一个字。', "The risk committee from head office arrives next week. Until then nobody says a word outside this room."],
        ]),
        ['partner', '一月演示的事故报告，总部要一个“根本原因”。上线检查是陶可签的，测试集也是她导的。', 'On the January incident, head office wants a "root cause". Tao Ke signed the release checklist, and she exported the test set.'],
        ['taoke', '……是我的错。', '...It was my mistake.'],
        { ask: [
          ...(S.evalChecked || S.helpedTao ? [{ zh: '那张表我十一月就看过。要写名字，把我的也写上。', en: 'I went through that sheet myself in November. If names are going on it, mine goes on too.', s: -3, r: 4, zw: 4, rel: { taoke: 8, partner: -2 }, k: ['blame', 'shared'],
            then: [['partner', '……你倒是不怕。行，写“流程”。总部问流程是谁的，是我的。', '...You are not easily frightened. Very well: "process". And when head office asks whose process, it is mine.']] }] : []),
          { zh: '检查表是她签的，流程是我们四个人的。去重没人复核，脱敏没人拿照片测过。根本原因写“流程”，写我们所有人。', en: "She signed the checklist. The process belonged to the four of us. Nobody reviewed the de-duplication. Nobody tested the anonymising on photographs. The root cause is the process, with all our names on it.", s: -2, r: 3, zw: 3, rel: { taoke: 6, partner: -2 }, k: ['blame', 'shared'],
            then: [['partner', '写“流程”，总部会问流程是谁的。是我的。……先这样报。', 'Write "process" and head office will ask whose process. Mine. ...Report it that way for now.']] },
          { zh: '事实是这样，就按事实写吧。', en: 'Those are the facts. Write it as it happened.', s: 2, zw: -3, rel: { taoke: -8 }, k: ['blame', 'tao'],
            then: [[null, '（陶可点了点头，回到工位，把耳机戴上了。）', '(Tao Ke nods, goes back to her desk and puts her headphones on.)']] },
          { zh: '（不说话）', en: '(Say nothing.)', rel: { taoke: -4 }, k: ['blame', 'tao'], then: [['partner', '那就这么写。', 'Then that is how it is written.']] },
        ] },
      ],
      (L, S, h) => (h.rel('gu') >= 53 ? [
        ['gu', '（电话）纪白，说个事，先别外传。我四月离开东澜，去屿深科技，做工厂排产软件的。他们要建 AI 产品线，缺一个负责人。我第一个想到你。', "(On the phone) Ji Bai, something for you, and keep it to yourself for now. I'm leaving Donglan in April for Yushen Technology. They make production-scheduling software for factories, they're building an AI product line, and they need someone to run it. You were the first person I thought of."],
        { ask: [
          { zh: '我现在答不了你。四月你再问我一次。', en: "I can't answer you now. Ask me again in April.", k: 'guOffer', then: [['gu', '好。四月我再问。', "Good. I'll ask again in April."]] },
          { zh: '我在这儿还有没做完的事。', en: "I've things here I haven't finished.", k: 'guOffer', then: [['gu', '明白。门给你留着。', "Understood. The door stays open."]] },
        ] },
      ] : []),
    ],
    absent: (L, S) => { S.blame = 'tao'; } },

  // ================= Act III · day 11 · Monday 19 April =================
  { id: 'd11', day: 11, title: B('名单', 'The list'), place: FIRM.place, cast: ['zhiwei', 'taoke', 'shaofeng', 'partner'],
    parts: [
      (L, S) => [
        ['zhiwei', '邮件都看到了。总部把中国区的 AI 业务并到新加坡，上海这边“优化”三成。名单周二下午出。', 'You have all seen the email. Head office is folding the China AI practice into Singapore, and Shanghai is to be "optimised" by thirty per cent. The list comes out on Tuesday afternoon.'],
        ['shaofeng', '三成。我们组四个人，那就是一个多一点。', 'Thirty per cent. There are four of us. So one, and a bit.'],
        ...(S.review
          ? [['partner', '（把你叫进小会议室）东澜续了二期，点名要你。可名单是按职级和司龄排的，你入职不到半年。', '(Calling you into the small meeting room) Donglan has signed a second phase and asked for you by name. But the list goes by grade and length of service, and you have been here less than six months.']]
          : [['partner', '（把你叫进小会议室）东澜被监管约谈了，回头要追我们的责任。风险委员会要一份“经验教训”备忘录，要有人签字。', '(Calling you into the small meeting room) The regulator has had Donglan in, and Donglan will come after us. The risk committee wants a "lessons learned" memorandum, and it wants a signature on it.']]),
        ['partner', S.blame === 'tao' ? '我可以保一个人。一月事故的根本原因已经写了陶可。你作为技术负责人，在备忘录上补个签字就行。她本来就在名单上。' : '我可以保一个人。条件是：备忘录上，一月事故的根本原因写“初级分析师评测失误”，你作为技术负责人签字。陶可本来就在名单上，多这一行少这一行，对她没区别。',
          S.blame === 'tao' ? 'I can protect one person. The root cause for January already names Tao Ke. All I need is your signature on the memorandum as technical lead. She is on the list in any case.' : 'I can protect one person. The condition: on the memorandum, the root cause for January reads "evaluation error by a junior analyst", and you sign as technical lead. Tao Ke is on the list in any case. One line more or less makes no difference to her.'],
        { ask: [
          { zh: '有区别。带着这一行出去，她下一份工作都找不到。我不签。', en: "It makes a difference. With that line on her file she won't get another job. I'm not signing.", s: -5, r: 4, zw: 4, rel: { partner: -5, taoke: 5 }, k: ['memo', 'refuse'],
            then: [['partner', '那明天下午，你自己看名单。', 'Then tomorrow afternoon you can read the list for yourself.']] },
          { zh: '我签。', en: "I'll sign.", s: 8, r: -5, zw: -6, rel: { partner: 5, taoke: -10 }, k: ['memo', 'sign'],
            then: [['partner', '明智。六月的晋升名单，我会写你。', 'Sensible. Your name will be on my promotion list in June.']] },
          { zh: '明天给你答复。', en: "You'll have my answer tomorrow.", k: ['memo', 'think'], then: [['partner', '明天中午之前。', 'Before noon.']] },
        ] },
        ['zhiwei', '他找你谈过了。我不问你怎么答的。你自己睡得着就行。', "He has talked to you. I'm not asking what you answered. So long as you can sleep."],
      ],
    ],
    absent: (L, S) => { S.memo = 'think'; } },

  // ================= Act III · day 12 · Tuesday 20 April: what he does about it =================
  { id: 'd12', day: 12, title: B('周二下午', 'Tuesday afternoon'), place: FIRM.place, cast: ['zhiwei', 'partner', 'hr', 'taoke'],
    parts: [
      (L, S, h) => {
        const stay = h.canStay(), sev = h.severance();
        return [
          ['hr', '纪白，请坐。公司的决定你应该听说了。今天谈的是你个人的安排。', "Ji Bai, have a seat. You'll have heard what the firm has decided. Today is about your own arrangements."],
          ...(stay
            ? [['partner', S.memo === 'sign' ? '你不在名单上。备忘录的事，我说到做到。' : S.review ? '你不在名单上。东澜二期点了你的名，我保不保你，你都得留下。' : '你不在名单上。这半年大家怎么看你，我心里有数。', S.memo === 'sign' ? 'You are not on the list. About the memorandum: I keep my word.' : S.review ? "You are not on the list. Donglan asked for you by name for phase two. Whether I protect you or not, you stay." : 'You are not on the list. I know well enough how people here have come to see you.']]
            : [['hr', `你在这次调整的范围内。公司提供 N+3 的补偿，一共 ¥${sev.toLocaleString('en-US')}。今天签，月底前到账。`, `You fall within this adjustment. The firm offers N plus three, ¥${sev.toLocaleString('en-US')} in all. Sign today and it is paid before the end of the month.`]]),
          { ask: [
            stay ? { zh: '我留下。', en: "I'm staying.", k: ['decided', 'consulting'],
              then: [['partner', '好。东澜二期周四排期。', 'Good. We schedule Donglan phase two on Thursday.'], ['zhiwei', '那周四的排期，你先跟我过一遍。', 'Then take me through Thursday\'s schedule first.']] }
              : { zh: '我想留下。给我一个季度，我把东澜二期谈回来。', en: 'I want to stay. Give me a quarter and I will bring Donglan back for a second phase.', k: ['decided', 'laidoff'],
                then: [['partner', '名单是总部批的，不是我。', 'Head office approved the list. Not I.'], ['hr', '协议在这儿。你看完再签。', "Here is the agreement. Read it through before you sign."]] },
            { zh: '我辞职。补偿不要，备忘录也不签。离职原因那一栏，我自己写。', en: "I resign. I don't want the package and I'm not signing any memorandum. The reason for leaving I will write in myself.", r: 3, zw: 2, k: ['decided', 'resigned'],
              then: [['hr', '……主动辞职是没有补偿的，你确定？', '...There is no compensation if you resign. You are sure?'], ['zhiwei', '辞职信别写太长。……你走了，会议室的白板谁擦。', "Don't make the letter long. ...With you gone, who wipes the whiteboard in the meeting room."]] },
            stay ? { zh: '把我换进名单。N+3 我签。我的名额，留给陶可。', en: "Put me on the list in her place. I'll sign for N plus three. My place goes to Tao Ke.", r: 4, zw: 3, rel: { taoke: 10 }, k: ['decided', 'laidoff'], fx: (L2, S2) => { S2.gavePlace = true; },
              then: [['partner', '你想清楚。你不在名单上。', 'Think. You are not on the list.'], ['hr', '……流程上可以。我去改。', '...It can be done, procedurally. I will change it.'], ['zhiwei', '签字之前把条款看完。竞业那一条，让他们划掉。', 'Read every clause before you sign. And make them strike out the non-compete.']] }
              : { zh: '方案我接受。N+3，今天签。', en: 'I accept. N plus three. I sign today.', k: ['decided', 'laidoff'],
                then: [['hr', '好。工牌和电脑周五前交还。', 'Good. Badge and laptop back by Friday.'], ['zhiwei', '签字之前把条款看完。竞业那一条，让他们划掉。', 'Read every clause before you sign. And make them strike out the non-compete.']] },
            S.guOffer ? { zh: '我已经接了屿深科技的 offer。做到月底，把东西交接完。', en: "I've accepted an offer from Yushen Technology. I'll work to the end of the month and hand everything over.", k: ['decided', 'switched'],
              then: [['partner', '……顾磊。行，好聚好散。', '...Gu Lei. Well. Let us part on good terms.'], ['zhiwei', '屿深。顾磊倒是会挑人。交接清单发我。', 'Yushen. Gu Lei knows how to pick them. Send me the handover list.']] }
              : { zh: '（沉默）', en: '(Silence.)', k: ['decided', stay ? 'consulting' : 'laidoff'],
                then: stay ? [['partner', '那就照旧。', 'Then we carry on as before.']] : [['hr', '协议你带回去看，周五前签。', 'Take the agreement home and read it. Sign by Friday.']] },
          ] },
        ];
      },
    ],
    absent: (L, S, h) => { S.decided = h.canStay() ? 'consulting' : 'laidoff'; S.noShow = true; } },
];
