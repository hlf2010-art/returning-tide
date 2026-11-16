// 林予安 Lin Yu'an, 27: from his San Francisco years. Two years together that neither of them ever
// named; he took the Shanghai job and was gone in three weeks. She writes first, from California.
//   Act I    "So you really went back." His mug; a call from Clement Street about what it was
//   Act II   her name is on the list this time; a Shanghai company wants her to come and look
//   Act III  she books the flight
//   Act IV   three months in Shanghai: the Peace Hotel's octagon hall, the river with nothing
//            hidden, a tune from the Mission at the Jazz Bar; a ticket that can be one-way
//   Act V    San Francisco and fog, or a south-facing flat in Jing'an
import { emit, stamp } from '../../engine/life.js';
import { heart, inLife, isSeeing, feel, remember, decide, meet, leave } from '../../engine/hearts.js';
import { B, D, H, tod, between, say, R, A, ask, askOut, done, dateOn, upstairs, t, openThread } from './kit.js';

const W = 'yuan';
const Y = (zh, en) => [W, zh, en], N = (zh, en) => ['nar', zh, en];
const day = (L) => L.clock.day;
const inShanghai = (L) => stamp(L) >= D(13, 18, 0) && day(L) <= 15;

const P = {
  id: W, name: B('林予安', "Lin Yu'an"), short: B('予安', "Yu'an"), age: 27, sex: 'f', color: '#7d6b9e', avatar: ['c1', 'c2', 'c8'], voice: { pitch: 1.06, rate: 1.04 },
  role: B('旧金山的产品设计师；他在湾区那几年的人', 'Product designer in San Francisco; the person from his Bay Area years'),
  ambition: B('排了三年的绿卡；一份不是替别人收尾的工作', "A green card three years in the queue; a job that isn't finishing other people's work"),
  how: "You and he were at UC Berkeley in the same year, and for two years in San Francisco you were together without either of you ever calling it that. He took a job in Shanghai and left within three weeks. Neither of you said what it had been.",
  calls: B('纪白', 'Ji Bai'),
  card: "Lin Yu'an (林予安), 27, from Chengdu; went to UC Berkeley the same year as Ji Bai (design and cognitive science), then product designer at an AI start-up in SoMa; for two years in San Francisco she and Ji Bai were together without ever naming it: a flat in the Sunset, the N Judah, fog at Ocean Beach, Sunday dim sum on Clement Street; funny, quick, proud, covers hurt with jokes; her green-card process ties her to the Bay Area; writes to him in her morning, which is his night; mixes English into her Chinese the way people do after ten years abroad",
  arc: {
    1: B('在旧金山。公司在裁人，她还在名单外面。', 'In San Francisco. The company is cutting people and she is not on the list yet.'),
    2: B('被裁了。上海有家公司请她去做设计负责人，先试三个月。', 'Laid off. A Shanghai company has asked her to come as design lead, three months on trial.'),
    3: B('订了六月的机票。绿卡排到一半：离境不能超过半年。', "She has booked a flight for June. Her green card is half done: she can't be out of the country more than six months."),
    4: B('在上海，试用三个月。公司想让她留下。机票可以改成单程。', 'In Shanghai on a three-month trial. The company wants her to stay. Her ticket can be made one-way.'),
    5: B('旧金山，或者静安。', "San Francisco, or Jing'an."),
  },
  schedule(L) {
    const m = tod(L);
    if (inShanghai(L)) {
      if (m >= H(0, 30) && m < H(7, 30)) return { spot: null, doing: B('在静安的短租公寓里睡着', "asleep in her short-let flat in Jing'an"), free: false };
      if (m >= H(9, 30) && m < H(18, 30)) return { spot: null, doing: B('在徐汇那家公司上班（试用期）', 'at work at the company in Xuhui (on trial)'), free: true };
      return { spot: null, doing: B('在上海，下了班，一个人到处走', 'in Shanghai, off work, walking about by herself'), free: true };
    }
    if (day(L) >= 16 && heart(L, W).settled === 'stays') return { spot: null, doing: B('在上海，静安新租的房子里', "in Shanghai, in the flat she has rented in Jing'an"), free: true };
    if (between(L, H(15), H(23, 20))) return { spot: null, doing: B('在旧金山，睡着（那边是半夜）', "in San Francisco, asleep (it's the middle of the night there)"), free: false, abroad: true };
    return { spot: null, doing: B('在旧金山（比上海晚十六个小时）', 'in San Francisco (sixteen hours behind Shanghai)'), free: true, abroad: true };
  },
  memories: {
    'sf-years': B('旧金山的两年：日落区的公寓，N Judah，Ocean Beach 的雾，周日 Clement 街的早茶。他们从没说过那算什么。他三个星期就走了。', "Two years in San Francisco: the flat in the Sunset, the N Judah, the fog at Ocean Beach, Sunday dim sum on Clement Street. They never said what it was. He was gone in three weeks."),
    'said-sorry': B('他承认了：走得太急，没好好跟她说。', 'He admitted it: he left in too much of a hurry to tell her properly.'),
    'the-mug': B('他那只印着 GO BEARS 的马克杯还在她那儿。她一直在用。', 'His GO BEARS mug is still at her place. She has been using it all along.'),
    'yuan-call': B('她从 Clement 街打来电话，问了那句一直没问的话：那两年算什么。', 'She called from Clement Street and asked what had never been asked: what those two years were.'),
    'named-it': B('电话里，他终于说了：那两年是在一起。', 'On the phone he finally said it: those two years, they were together.'),
    'come-to-shanghai': B('她被裁那天，他说：来上海吧。', 'The day she was laid off he said: come to Shanghai.'),
    'y-lobby': B('六月，她拖着行李箱站在和平饭店八角厅的玻璃顶下面。头发剪短了。', 'In June she stood under the glass of the Peace Hotel\'s octagon hall with her suitcase. Her hair was shorter.'),
    'y-river': B('他带她去看了江。她说：Ocean Beach 的雾里什么都看不见，这里什么都看得见，藏不住东西。', "He took her to see the river. She said: at Ocean Beach you couldn't see a thing for fog; here you can see everything, and nothing can hide."),
    'the-fog': B('他说他想那片雾。她说她分不清想的是雾，还是那时候的他们。', "He said he misses that fog. She said she can't tell whether it's the fog she misses or who they were in it."),
    'y-jazz': B('她拿到第一个月的人民币工资，请他在爵士吧喝酒。乐队奏了一首他们在 Mission 的小酒吧里听过的曲子。', 'With her first month\'s pay in yuan she bought him drinks at the Jazz Bar. The band played a tune they had once heard in a small bar in the Mission.'),
    'y-last': B('九月，江边。她说机票可以改成单程，然后问他：这一年过完，你自己打算在哪儿？', 'September, at the river. She said her ticket could be made one-way, and asked him: when this year is over, where do you mean to be?'),
    'asked-stay': B('他说了一句整话：上海。我想让你也在。', 'He said a whole sentence: Shanghai. And I want you here too.'),
    'let-go': B('他让她回去：别为我丢了排了三年的绿卡。', "He told her to go back: don't lose three years in the green-card queue for me."),
    'yuan-night': B('有一晚她没有回静安。', "One night she did not go back to Jing'an."),
  },
  lines: {
    accept: B('好。别迟到，我在上海不认路。', "Good. Don't be late. I don't know my way round Shanghai."), decline: B('行。那我自己逛。', "Fine. I'll wander by myself."), missed: B('没回。行吧，还是老样子。', 'No answer. All right. Same as ever.'),
    stood: B('我等了一个小时。纪白，你又是这样：人不来，话也不说。', "I waited an hour. You've done it again, Ji Bai: you don't come and you don't say."),
    quiet: B('我不发了。上一次也是我先停的，我有经验。', "I'll stop writing. I was the one who stopped last time too. I've had practice."),
    left: B('我们别再这样了。两年不说，一年不回。我认了：有些话你就是说不出来。保重。', "Let's not do this again. Two years of not saying it and a year of not answering. I accept it: there are things you simply can't say. Take care."),
    two: B('你身边有人了，是不是？直接说，我受得了。我受不了的是猜。', "There's someone with you now, isn't there? Just say it. I can take that. What I can't take is guessing."),
    chosen: B('……好。那我们把话说全。这次。', "...All right. Then let's finish our sentences. This time."),
    twoGone: B('明白了。谢谢你没让我猜到最后。', 'Understood. Thank you for not making me guess to the end.'),
    ended: B('行。至少这次你说了。', 'Fine. At least this time you said it.'),
    fight: B('我看见了。你以前连吵架都不会，现在学会动手了？上海把你怎么了。', "I saw that. You couldn't even argue, before. Now you've learned to use your fists? What has Shanghai done to you?"),
    heard: B('听说你跟人打架了？？你？那个在 BART 上被踩了脚还说 sorry 的人？', "I hear you were in a fight?? You? The man who said sorry when someone trod on his foot on BART?"),
    online: B('我在小红书上刷到你了。隔着太平洋。算法真行。', 'You came up on my Xiaohongshu feed. From across the Pacific. Quite an algorithm.'),
    hurt: B('你脸怎么了。……别说没事。你每次说没事都是有事。', "What's happened to your face? ...Don't say it's nothing. Whenever you say that, it's something."),
    onesided: B('我发现了，这一年每次都是我先发。跟那两年一样。', "I've noticed: this whole year it's been me who writes first. Just like those two years."),
    yes: B('可以啊。', 'Sure.'), busy: B('这周在赶一个评审。周末？', "I've a design review this week. The weekend?"), mood: B('我现在不太想见你。让我缓缓。', "I don't much want to see you just now. Give me a while."), away: B('在飞机上。', 'On a plane.'), later: B('隔着十六个小时呢。等我到上海再说。', "We're sixteen hours apart. Ask me when I'm in Shanghai."),
    hello: B('你怎么找到我的。……算了，你一直找得到。', 'How did you find me? ...Never mind. You always could.'),
    morning: B('她比你醒得早，站在窗边看江。“原来你每天早上看的是这个。”', 'She was awake before you, standing at the window looking at the river. "So this is what you see every morning."'),
    career: {
      resigned: B('你辞了？……我是被裁的，你是自己走的。还是你潇洒。', "You quit? ...I was laid off and you walked out. You always did have more style."),
      laidoff: B('欢迎加入。第一天最难受，第三天开始你会发现早上不用开站会其实很好。', "Welcome to the club. The first day is the worst. By the third you find a morning without stand-up is rather nice."),
      startup: B('自己做了。……你在伯克利的时候就说过要做。我以为你忘了。', "Out on your own. ...You said you would, back at Berkeley. I thought you'd forgotten."),
      family: B('回南京。所以你回国，绕了一圈，还是回家了。', 'Back to Nanjing. So you came home to China and went the long way round to going home.'),
      switched: B('换公司了？新的那家开会说不说 circle back？', 'A new company? Do they say "circle back" in meetings at this one?'),
    },
    canned: { zh: ['哈。你还是老样子。', '我这边刚起，等我喝口咖啡。', '嗯，在听。', '回头说，要进地铁了。'], en: ['Ha. Same as ever.', "I've only just got up. Coffee first.", "Mm. I'm listening.", 'Later. Heading into the station.'] },
  },
  dates: {
    'y-jazz': { hm: [21, 0], needs: 'y-river', days: [13, 15], title: B('第一个月工资', "First month's pay"), place: B('和平饭店 · 爵士吧', 'Peace Hotel · the Jazz Bar'), text: B('今晚请你喝酒。我拿到第一个月工资了，人民币，感觉像大富翁的钱。九点，你楼下。', "Drinks are on me tonight. I've had my first month's pay, in yuan. It feels like Monopoly money. Nine, downstairs from you."), yes: B('好，九点。', 'OK. Nine.'), no: B('今晚不行。', 'Not tonight.') },
    'y-last': { title: B('江边', 'The river'), place: B('外滩 · 南京路口的栏杆', 'The Bund · the railing by Nanjing Road'), text: B('十点，江边，上次那个位置。我有话问你。', 'Ten, the river, where we stood last time. I have something to ask you.'), yes: B('我会到。', "I'll be there."), no: B('今晚不行。', 'Not tonight.') },
  },
  calls: {
    'yuan-call': { from: W, lines: [
      { who: W, text: t('喂。没吵醒你吧？你那边是早上。', "Hey. I haven't woken you? It's morning for you.") },
      { who: 'me', choices: [{ text: t('没有。正好醒着。', "No. I'm up.") }, { text: t('有点。但你说。', 'A bit. But go on.') }] },
      { who: W, text: t('我今天路过 Clement 街那家点心店。排队的时候突然想起来：我们从来没说过，那两年算什么。', 'I walked past the dim sum place on Clement today. Standing in the queue it struck me: we never once said what those two years were.') },
      { who: 'me', choices: [
        { text: t('算在一起。是我没敢说。', "We were together. I was the one who didn't dare say it."), fx: { t: 8, a: 4, mem: 'named-it' } },
        { text: t('我以为不说，走的时候就不会太难。', "I thought if we didn't say it, leaving would be easier."), fx: { t: 5, a: 1, mem: 'named-it' } },
        { text: t('都过去了，予安。', "It's in the past, Yu'an."), fx: { a: -6, t: -2 } },
      ] },
      { who: W, text: t('……嗯。', '...Mm.') },
      { who: W, text: t('我不是来翻旧账的。就是不想它一直悬着。', "I didn't call to go over old ground. I just didn't want it left hanging.") },
      { who: 'me', choices: [{ text: t('那现在不悬着了。想打电话就打。', "Then it isn't hanging now. Call whenever you like."), fx: { t: 3 } }, { text: t('你过得好吗？', 'Are you all right?'), fx: { t: 2 } }] },
      { who: W, text: t('还行。公司在裁人，我还在名单外面。先这样，我要进地铁了。', "Fine. They're laying people off and I'm not on the list yet. I'll let you go. I'm heading into the station.") },
    ] },
  },
  beats: [
    { id: 'y1', first: true, urgent: true, when: () => D(2, 1, 20), until: () => D(3, 12, 0), run: (L) => {
      meet(L, W); feel(L, W, { attraction: 25, trust: 18 }, 'history'); remember(L, W, 'sf-years'); openThread(L, W, P.name.zh);
      say(L, W, '看到你朋友圈了。外滩。', 'Saw your Moments. The Bund.');
      say(L, W, '所以你真的回去了。', 'So you really went back.', [
        R('回了。走得太急，没好好跟你说。', 'I did. I left in too much of a hurry to tell you properly.', { t: 5, mem: 'said-sorry' }, '三个星期。你退租比跟我说话还快。……算了。上海怎么样？', "Three weeks. You gave up your lease faster than you talked to me. ...Never mind. How's Shanghai?"),
        R('你那边是早上？', 'Is it morning there?', { t: 1 }, '九点二十。BART 又晚点。你还是老样子，不接重点。', "Twenty past nine. BART is late again. Same as ever: you never pick up the point."),
      ]); } },
    { id: 'y2', when: () => D(3, 13, 30), until: () => D(4, 14, 0), run: (L) => say(L, W, '[图片] 你的马克杯还在我这儿。印着 GO BEARS 那个。寄给你，还是扔了？', '[Photo] Your mug is still here. The GO BEARS one. Shall I post it to you, or throw it out?', [
      R('寄给我。', 'Post it.', { t: 2, a: 1 }, '国际运费比杯子贵。……我寄。', "The postage costs more than the mug. ...I'll post it."),
      R('你留着用。', 'Keep it. Use it.', { a: 3, mem: 'the-mug' }, '我一直在用。就是问问你要不要。', "I've been using it all along. I only asked to see whether you wanted it."),
      R('扔了吧。', 'Throw it out.', { a: -5, t: -3 }, '行。', 'Fine.'),
    ]) },
    { id: 'y3', when: () => D(5, 8, 0), until: () => D(5, 11, 0), if: (L) => inLife(L, W), run: (L) => { heart(L, W).lastWrote = stamp(L); emit(L, { type: 'call', from: W, script: 'yuan-call' }); } },
    { id: 'y4', urgent: true, when: () => D(8, 2, 0), until: () => D(8, 14, 0), if: (L) => inLife(L, W), run: (L) => say(L, W, '名单这次有我了。早上十点开的会，十点十五电脑就登不进去了。', 'This time my name was on the list. The meeting was at ten. By a quarter past I couldn\'t log in.', [
      R('你还好吗？要不要通个电话？', 'Are you all right? Shall I call?', { t: 5 }, '不用。就是想有个人知道。——你是第一个。', "No need. I just wanted someone to know. — You're the first."),
      R('很快会有下家的。', "You'll have something else soon.", { t: -1 }, '谢谢你 LinkedIn 式的安慰。', 'Thank you for the LinkedIn-style comfort.'),
      R('来上海吧。', 'Come to Shanghai.', { a: 4, mem: 'come-to-shanghai' }, '……别乱说。我绿卡排到一半。', "...Don't say things like that. I'm halfway through my green card."),
    ]) },
    { id: 'y5', when: () => D(10, 1, 30), until: () => D(10, 14, 0), if: (L) => inLife(L, W), run: (L) => say(L, W, '有家上海的公司找我，做 AI 产品的设计负责人。让我六月过去，先待三个月，算试用。我还没答应。', "A Shanghai company has approached me: design lead on their AI products. They want me over in June for three months, as a trial. I haven't said yes.", [
      R('来。至少来看看。', 'Come. At least come and look.', { a: 3, t: 2 }, '你这是替公司说话，还是替你自己？', 'Is that you speaking for the company, or for yourself?'),
      R('这得你自己想清楚。绿卡怎么办？', 'You need to think this through yourself. What about the green card?', { t: 4 }, '离境超过半年就得重排。所以是三个月，不是六个月。我算过。', "More than six months out of the country and I go back to the start of the queue. Hence three months, not six. I've done the sums."),
    ]) },
    { id: 'y6', urgent: true, when: () => D(12, 9, 0), until: () => D(12, 14, 30), if: (L) => inLife(L, W), run: (L) => say(L, W, '机票订了。六月五号到浦东。别来接，我自己会坐磁悬浮。', "Flight's booked. I land at Pudong on the fifth of June. Don't meet me. I can manage the maglev by myself.") },
    { id: 'y7', urgent: true, when: () => D(13, 18, 40), until: () => D(13, 21, 0), if: (L) => inLife(L, W), run: (L) => say(L, W, '我在你那个饭店的大堂。你以前说它像老电影。——确实像。', 'I\'m in the lobby of that hotel of yours. You used to say it was like an old film. — It is.') },
    { id: 'y8', when: () => D(14, 18, 10), until: () => D(14, 20, 20), if: (L) => inLife(L, W) && heart(L, W).stage !== 'known', run: (L) => askOut(L, W, 'y-jazz', P.dates['y-jazz'], D(14, 21, 0)) },
    { id: 'y9', urgent: true, when: () => D(15, 19, 0), until: () => D(15, 21, 20), if: (L) => inLife(L, W) && heart(L, W).stage !== 'known', run: (L) => askOut(L, W, 'y-last', P.dates['y-last'], D(15, 22, 0)) },
    { id: 'y10', urgent: true, when: () => D(16, 9, 0), until: () => D(17, 12, 0), if: (L) => inLife(L, W), run: (L) => { const why = P.end(L); if (why) leave(L, W, why); } },
  ],
  scenes: {
    'y-lobby': { who: W, spot: 'peaceHall', kind: 'talk', label: B('予安', "Yu'an"), action: B('走过去', 'Go over'),
      on: (L) => inLife(L, W) && !done(L, 'y-lobby') && stamp(L) >= D(13, 18, 40) && stamp(L) <= D(13, 22, 0),
      script: (L) => [
        N('她站在八角厅的玻璃顶下面，仰着头，行李箱还在脚边。头发比在旧金山的时候短了。', 'She is standing under the glass of the octagon hall with her head tipped back, her suitcase still at her feet. Her hair is shorter than it was in San Francisco.'),
        Y('嗨。', 'Hi.'),
        ask(L, W,
          A('嗨。……你剪头发了。', "Hi. ...You've cut your hair.", { a: 3 }, Y('裁员那天剪的。总得有一样东西是我自己决定的。', 'The day of the layoff. Something had to be my own decision.')),
          A('（走过去抱了她一下）', '(Go over and put your arms round her.)', { a: 4, t: 2 }, N('她没有躲。', "She doesn't pull away."), Y('……你身上是酒店洗发水的味道。不是以前那个了。', '...You smell of hotel shampoo. Not the old one.')),
          A('路上顺利吗？', 'Was the journey all right?', null, Y('十三个小时，旁边的小孩哭了十一个。你还是老样子，先问流程。', 'Thirteen hours, and the child beside me cried for eleven. Same as ever: logistics first.'))),
        Y('带我去看江。你朋友圈发了一年了，我要看看是不是修过图。', "Take me to see the river. You've been posting it for a year. I want to know whether you've been retouching."),
        Y('我先把箱子存前台。江边见，南京路出去那一段。', "I'll leave the case at the desk. See you at the river, the stretch straight out from Nanjing Road."),
      ] },
    'y-river': { who: W, spot: 'railPeace', kind: 'date', label: B('予安', "Yu'an"), action: B('走过去', 'Go over'),
      on: (L) => inLife(L, W) && !!done(L, 'y-lobby') && !done(L, 'y-river') && stamp(L) <= D(13, 23, 40),
      script: (L) => [
        Y('没修图。比照片还过分。', "Not retouched. It's even more over the top than the photos."),
        Y('Ocean Beach 的雾里什么都看不见，我们还每个周末去。这里什么都看得见。', "At Ocean Beach you couldn't see a thing for fog, and we went every weekend anyway. Here you can see everything."),
        ask(L, W,
          A('我想那片雾。', 'I miss that fog.', { a: 4, t: 2, mem: 'the-fog' }, Y('我也是。但我分不清想的是雾，还是那时候的我们。', "So do I. But I can't tell whether it's the fog I miss or who we were in it.")),
          A('看得见，不好吗？', "Isn't it good to be able to see?", { a: 1 }, Y('好。就是藏不住东西。', "It is. It's just that nothing can hide."))),
        Y('我这次来是工作。三个月。……也不全是工作。', "I'm here for work. Three months. ...It isn't all work."),
        ask(L, W,
          A('予安，这次我不会三个星期就走。', "Yu'an, this time I won't be gone in three weeks.", { t: 5, a: 4, decide: 'step' }, Y('这次是我只待三个月。风水轮流转。', "This time I'm the one with three months. What goes around."), Y('……好。我们试试。把话说全的那种。', "...All right. Let's try. The kind where we finish our sentences.")),
          A('我们先做回朋友，好不好？', 'Shall we start by being friends again?', { t: 4, decide: 'slow' }, Y('朋友。行。朋友可以一起吃早茶吗？', 'Friends. Fine. Can friends go for dim sum?')),
          A('我想先告诉你：我现在有别人了。', "I should tell you first: I'm with someone now.", { t: 6, a: -8, decide: 'friends' }, Y('……谢谢你告诉我。真的。比上次强。', '...Thank you for telling me. Truly. An improvement on last time.'))),
        N('一艘游船从北边开过来，灯一层一层的。她看了很久。', 'A cruise boat comes down from the north, lit deck by deck. She watches it for a long time.'),
      ] },
    'y-jazz': { who: W, spot: 'jazzTable', seat: true, kind: 'date', date: 'y-jazz', pass: 70, label: B('予安', "Yu'an"), action: B('坐下', 'Sit down'),
      on: (L) => dateOn(L, 'y-jazz'),
      script: (L) => [
        Y('上海的公司，开会的时候没人说“let\'s circle back”。我有点感动。', 'At a Shanghai company nobody says "let\'s circle back" in meetings. I\'m rather moved.'),
        Y('他们想让我留下。正式的，设计总监。', 'They want me to stay. Properly. Design director.'),
        ask(L, W,
          A('你想留吗？', 'Do you want to?', { t: 4 }, Y('想。又怕是因为你才想。我得把这两件事分开。', "I do. And I'm afraid it's because of you. I need to pull those two things apart.")),
          A('留下。', 'Stay.', { a: 3, t: -1 }, Y('别这么快。上次你走得快，这次你留我也快。慢一点。', "Not so fast. You left quickly last time and now you're keeping me quickly. Slow down.")),
          A('绿卡呢？', 'And the green card?', { t: 3 }, Y('九月二十号之前得回去一趟，不然就废了。三年白排。', 'I have to be back before the twentieth of September or it lapses. Three years in the queue for nothing.'))),
        N('乐队在奏一首你们以前在 Mission 的小酒吧里听过的曲子。她也听出来了。', 'The band is playing a tune you both once heard in a small bar in the Mission. She has recognised it too.'),
        ask(L, W,
          A('（把手伸过去）', '(Reach across the table.)', { a: 4 }, N('她把手放了上来。', 'She puts her hand in yours.'), Y('……记得吗，那天你把啤酒洒在我电脑上。', '...Remember? That was the night you spilt beer on my laptop.')),
          A('我住楼上。', 'I live upstairs.', upstairs(W, [Y('……我知道。走吧。', '...I know. Come on.')], [Y('我知道。今天不上去。', "I know. I'm not coming up tonight.")])),
          A('（听完这首）', '(Listen to the end of it.)', { t: 2 }, N('你们谁都没说话，一直到最后一个音。', 'Neither of you says a word until the last note.'))),
      ] },
    'y-last': { who: W, spot: 'railPeace', kind: 'date', date: 'y-last', label: B('予安', "Yu'an"), action: B('走过去', 'Go over'),
      on: (L) => dateOn(L, 'y-last'),
      script: (L) => [
        Y('机票是十八号的。可以改成单程，也可以改成往返。', "My flight is on the eighteenth. I can make it one-way. I can make it a return."),
        Y('我不问你要不要我留下。我问的是：你这一年过完，自己打算在哪儿？', "I'm not asking whether you want me to stay. I'm asking: when this year of yours is over, where do you mean to be?"),
        ask(L, W,
          A('上海。我想让你也在。', 'Shanghai. And I want you here too.', (L2) => { const h = heart(L2, W); feel(L2, W, { attraction: 4, trust: 4 }, 'asked'); remember(L2, W, 'asked-stay'); decide(L2, W, 'commit');
            if (isSeeing(L2, W) && h.trust >= 58) { h.plan = 'stays'; return [Y('……那绿卡我不要了。三年，换一句整话。值。', "...Then I'll let the green card go. Three years, for one whole sentence. Worth it.")]; }
            h.plan = 'open'; return [Y('这句话，一年前说就好了。……我回去把那边收个尾。然后再说。', "If only you had said that a year ago. ...I'll go back and close things up over there. Then we'll see.")]; }),
          A('回去吧。别为我丢了三年。', "Go back. Don't lose three years for me.", (L2) => { feel(L2, W, { trust: 6 }, 'let-go'); remember(L2, W, 'let-go'); heart(L2, W).plan = 'returns'; return [Y('……你这次说了。说得很清楚。', '...This time you said it. And clearly.'), Y('谢谢。我会好好的。', "Thank you. I'll be all right.")]; }),
          A('我不知道。', "I don't know.", (L2) => { feel(L2, W, { trust: -4 }, 'no-answer'); heart(L2, W).plan = 'cold'; return [Y('嗯。那我的答案也有了。', 'Mm. Then I have my answer too.')]; })),
        N('十点。金色的灯一层一层退下去。她说，原来它也会下班。', "Ten o'clock. The gold light drains away floor by floor. So it clocks off too, she says."),
      ] },
  },
  events: {},
  end(L) {
    const h = heart(L, W);
    if (h.plan === 'stays') { h.settled = 'stays'; say(L, W, '单程。公司的 offer 我签了。静安，租了个朝南的。你的杯子我带回来了。', "One-way. I've signed the offer. A south-facing flat in Jing'an. I brought your mug back with me."); return null; }
    if (h.plan === 'open') { h.settled = 'distance'; say(L, W, '[图片] 旧金山，雾。到了。我在收尾：退租，卖车，跟律师谈绿卡。明年春天见，如果你那句话还作数。', "[Photo] San Francisco, fog. I'm here. Closing things up: the lease, the car, a talk with the lawyer about the green card. See you in the spring, if that sentence of yours still stands."); return null; }
    if (h.plan === 'returns') { say(L, W, '[图片] 到了。雾还是那片雾。纪白，谢谢你这次把话说完了。', '[Photo] Landed. The same old fog. Thank you, Ji Bai, for finishing your sentence this time.'); if (isSeeing(L, W)) return 'returned'; h.settled = 'friend'; return null; }
    if (isSeeing(L, W) || h.plan === 'cold') { say(L, W, '到旧金山了。保重，纪白。', "I'm back in San Francisco. Take care, Ji Bai."); return 'returned'; }
    h.settled = 'friend'; say(L, W, '[图片] 回旧金山了。Clement 街那家点心店还开着。下次你来，我请。', '[Photo] Back in San Francisco. The dim sum place on Clement is still open. Next time you are over, my treat.');
    return null;
  },
  epilogue(L, h) {
    if (h.settled === 'stays' && h.stage !== 'over') return B('予安的机票改成了单程。静安那间朝南的房子里，窗台上放着一只印着 GO BEARS 的马克杯。', "Yu'an made her ticket one-way. On the windowsill of the south-facing flat in Jing'an stands a mug that says GO BEARS.");
    if (h.settled === 'distance' && h.stage !== 'over') return B('予安回旧金山收尾去了。她说春天回来，如果你那句话还作数。你把那句话又说了一遍。', "Yu'an has gone back to San Francisco to close things up. She says she'll return in the spring, if your sentence still stands. You say it to her again.");
    if (h.stage === 'over' && h.over && h.over.why === 'returned') return B('予安回了旧金山。这一次你们把话说完了，雾里和雾外的都说了。', "Yu'an went back to San Francisco. This time the two of you finished your sentences, the ones from inside the fog and the ones from outside it.");
    if (h.stage === 'over' && h.over && h.over.why !== 'faded') return B('你的马克杯最后还是寄到了和平饭店的前台。盒子里没有字条。', 'Your mug arrived at the Peace Hotel front desk in the end. There was no note in the box.');
    return null;
  },
};
export default P;
