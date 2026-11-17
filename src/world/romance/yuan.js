// 林予安 Lin Yu'an, 27, 167 cm (Character Bible F04, LOCKED): an architect and urban-space researcher, and
// the one person in Shanghai he has known since he was twelve. The old drafts called her 许若安 Ruoan:
// it is the same woman, one id ('yuan'), one chat; she is one of the five friends (world/agenda.js,
// world/friendScenes.js) and one of the five he might come to love (this file).
// WORKING (from the older material, kept until the owner decides): the two years in San Francisco while
// he was in the Bay, together in all but name; she came home first and he didn't ask her to stay.
// PROPOSAL: her own fight over an old lane behind the Bund; the San Francisco offer; the slow pace.
//   Act I    "So you really came back." His mug, on her desk for two years; a call from outside the site
//            about what San Francisco was
//   Act II   she files a dissent against her own team: the lane's residents are part of what's worth
//            keeping; an urban-research institute in San Francisco wants her back for two years
//   Act III  the scheme changes; her name is on the page that changed
//   Act IV   the octagon hall's glass roof, the river with nothing hidden, a tune from the Mission at the
//            Jazz Bar; the firm wants her to lead phase two, and September wants an answer
//   Act V    San Francisco and fog, or the lane behind the Bund
import { emit, stamp } from '../../engine/life.js';
import { heart, inLife, isSeeing, feel, remember, decide, meet, leave, shared } from '../../engine/hearts.js';
import { B, D, H, tod, between, say, R, A, ask, askOut, done, dateOn, upstairs, t, openThread } from './kit.js';

const W = 'yuan';
const Y = (zh, en) => [W, zh, en], N = (zh, en) => ['nar', zh, en];
const day = (L) => L.clock.day;
const inSF = (L) => { const h = heart(L, W); return day(L) >= 16 && (['distance', 'friend'].includes(h.settled) || (h.stage === 'over' && h.over && h.over.why === 'returned')); };

const P = {
  id: W, name: B('林予安', "Lin Yu'an"), short: B('予安', "Yu'an"), age: 27, sex: 'f', color: '#7a9a6a', avatar: ['c1', 'c2', 'c8'], height: 1.67, voice: { pitch: 1.08, rate: 1.0 },
  aliases: ['许若安', '若安', 'Ruoan'],
  role: B('建筑师、城市空间研究者；他最老的朋友', 'Architect and urban-space researcher; his oldest friend'),
  ambition: B('让一条老弄堂留住住在里面的人，而不只是留一张皮；然后，一个真正属于她的项目', 'To keep an old lane with its people in it, not just its skin; and then a project that is truly hers'),
  how: "You have been his friend since you were twelve, at Nanjing Foreign Language School, and you are one of the six in the group chat. For two years in San Francisco, while he was in the Bay, you were together without either of you ever calling it that; when your post there ended you came home to Shanghai, and he did not ask you to stay. Now he is back as well.",
  address: B('纪白', 'Ji Bai'),
  card: "Lin Yu'an (林予安), 27, 167 cm, from Nanjing (her parents are both professors at Southeast University); Ji Bai's oldest friend, from Nanjing Foreign Language School (class of 2017) and the group chat of six; studied architecture at Tongji, then two years in San Francisco on an urban-research job while he was in the Bay; for those two years they were together in all but name and neither of them said so; she came home first, he did not ask her to stay, and nobody in the group knows; now an architect and urban-space researcher at a firm restoring Bund-era buildings, who knows the Peace Hotel and AIA interiors professionally; she cares about the people who actually live in old buildings and lanes, not about nostalgia; calm, principled, dry, observant, the group's moral compass; the only one of the six who is not an heir, self-made without making anything of it; she gives and does not keep score, and it annoys her when he tries to settle up; teases him, worries about him; shoulder-length dark layered hair with a slight wave, thin metal-frame glasses, a dark blazer over black, a site badge on a lanyard; a little San Francisco English still in her Chinese",
  arc: {
    1: B('在外滩的老楼里测绘。组里在做一条老弄堂的改造方案，她跟组长意见不一样。', "Surveying inside the Bund's old buildings. Her team is drawing up a scheme for an old lane, and she disagrees with her team lead."),
    2: B('她交了反对意见：弄堂不能只留一张皮。旧金山的研究所来信，请她回去带两年项目。', "She has filed a dissent: the lane can't be kept as a skin. An institute in San Francisco has written asking her back to lead a project for two years."),
    3: B('方案改了，居民可以留下来。改过的那一页上有她的名字。旧金山九月要答复。', 'The scheme has changed and the residents can stay. Her name is on the page that changed. San Francisco wants an answer in September.'),
    4: B('事务所要她带弄堂二期。旧金山的位置还在等她。', "The firm wants her to lead the lane's second phase. The San Francisco post is still waiting for her."),
    5: B('旧金山，或者外滩后面那条弄堂。', 'San Francisco, or the lane behind the Bund.'),
  },
  schedule(L) {
    const m = tod(L);
    if (inSF(L)) {
      if (between(L, H(15), H(23, 20))) return { spot: null, doing: B('在旧金山，睡着（那边是半夜）', "in San Francisco, asleep (it's the middle of the night there)"), free: false, abroad: true };
      return { spot: null, doing: B('在旧金山（比上海晚十六个小时）', 'in San Francisco (sixteen hours behind Shanghai)'), free: true, abroad: true };
    }
    if (m >= H(0, 30) && m < H(7, 30)) return { spot: null, doing: B('睡了', 'asleep'), free: false };
    if (m >= H(8, 30) && m < H(18, 30)) return { spot: null, doing: B('在外滩的老楼里测绘，或者在事务所画图', "surveying inside the Bund's old buildings, or drawing at the firm"), free: true };
    return { spot: null, doing: B('下了班，在弄堂里拍门牌，或者在家画图', 'off work: photographing house numbers in the lanes, or drawing at home'), free: true };
  },
  memories: {
    'sf-years': B('旧金山的两年，他们都在湾区：日落区的公寓，N Judah，Ocean Beach 的雾，周日 Clement 街的早茶。他们从没说过那算什么。她先回了国，他没有留她。', "Two years in San Francisco while they were both in the Bay: the flat in the Sunset, the N Judah, the fog at Ocean Beach, Sunday dim sum on Clement Street. They never said what it was. She came home first, and he didn't ask her to stay."),
    'said-sorry': B('他承认了：她离开旧金山那天，他什么都没说。', 'He admitted it: the day she left San Francisco, he said nothing.'),
    'the-mug': B('他那只印着 GO BEARS 的马克杯，两年前被她装进箱子带回了上海，一直在她工位上。', 'His GO BEARS mug came back to Shanghai in her suitcase two years ago and has been on her desk ever since.'),
    'yuan-call': B('她在工地门口给他打电话，问了那句一直没问的话：旧金山那两年算什么。', 'She called him from outside the site and asked what had never been asked: what those two years in San Francisco were.'),
    'named-it': B('电话里，他终于说了：那两年是在一起。', 'On the phone he finally said it: those two years, they were together.'),
    'come-to-shanghai': B('她交反对意见那天，他说：居民会议，我去，听到最后。', "The day she filed her dissent he said: the residents' meeting, I'll come, and stay to the end."),
    'y-lobby': B('她在和平饭店八角厅的玻璃顶下面测绘，仰着头，脚边是仪器箱。', "She was surveying under the glass of the Peace Hotel's octagon hall, head tipped back, her instrument case at her feet."),
    'y-river': B('他陪她去看了江。她说：Ocean Beach 的雾里什么都看不见，这里什么都看得见，藏不住东西。', "He walked her to the river. She said: at Ocean Beach you couldn't see a thing for fog; here you can see everything, and nothing can hide."),
    'the-fog': B('他说他想那片雾。她说她分不清想的是雾，还是那时候的他们。', "He said he misses that fog. She said she can't tell whether it's the fog she misses or who they were in it."),
    'y-jazz': B('方案过了，她拿第一笔项目奖金请他在爵士吧喝酒。乐队奏了一首他们在 Mission 的小酒吧里听过的曲子。', 'The scheme went through and she bought him drinks at the Jazz Bar with her first project bonus. The band played a tune they had once heard in a small bar in the Mission.'),
    'y-last': B('九月，江边。她说旧金山可以回“好”，也可以回“不”，然后问他：这一年过完，你自己打算在哪儿？', 'September, at the river. She said she could write back yes to San Francisco, or no, and asked him: when this year is over, where do you mean to be?'),
    'asked-stay': B('他说了一句整话：上海。我想让你也在。', 'He said a whole sentence: Shanghai. And I want you here too.'),
    'let-go': B('他让她去：别为我回掉旧金山。', "He told her to go: don't turn San Francisco down for me."),
    'yuan-night': B('有一晚她没有回家。', 'One night she did not go home.'),
  },
  lines: {
    accept: B('好。别迟到。', "Good. Don't be late."), decline: B('行。那我回去画图。', "Fine. I'll go back to my drawings."), missed: B('没回。行吧，还是老样子。', 'No answer. All right. Same as ever.'),
    stood: B('我等了一个小时。纪白，你又是这样：人不来，话也不说。', "I waited an hour. You've done it again, Ji Bai: you don't come and you don't say."),
    quiet: B('我不发了。上一次也是我先停的，我有经验。', "I'll stop writing. I was the one who stopped last time too. I've had practice."),
    left: B('我们别再这样了。两年不说，回来了还是不说。我认了：有些话你就是说不出来。朋友还是朋友。保重。', "Let's not do this again. Two years of not saying it, and still not saying it now you're back. I accept it: there are things you simply can't say. Friends are still friends. Take care."),
    two: B('你身边有人了，是不是？直接说，我受得了。我受不了的是猜。', "There's someone with you now, isn't there? Just say it. I can take that. What I can't take is guessing."),
    chosen: B('……好。那我们把话说全。这次。', "...All right. Then let's finish our sentences. This time."),
    twoGone: B('明白了。谢谢你没让我猜到最后。群里我还是会说话的，别担心。', "Understood. Thank you for not making me guess to the end. I'll still talk in the group chat. Don't worry."),
    ended: B('行。至少这次你说了。', 'Fine. At least this time you said it.'),
    fight: B('我看见了。你以前连吵架都不会，现在学会动手了？上海把你怎么了。', "I saw that. You couldn't even argue, before. Now you've learned to use your fists? What has Shanghai done to you?"),
    heard: B('听说你跟人打架了？？你？那个在 BART 上被踩了脚还说 sorry 的人？', "I hear you were in a fight?? You? The man who said sorry when someone trod on his foot on BART?"),
    online: B('我在小红书上刷到你了。算法真行，连你都推给我。', 'You came up on my Xiaohongshu feed. Quite an algorithm, pushing even you at me.'),
    hurt: B('你脸怎么了。……别说没事。你每次说没事都是有事。', "What's happened to your face? ...Don't say it's nothing. Whenever you say that, it's something."),
    onesided: B('我发现了，这一年每次都是我先发。跟那两年一样。', "I've noticed: this whole year it's been me who writes first. Just like those two years."),
    yes: B('可以啊。', 'Sure.'), busy: B('这周在赶一个评审。周末？', "I've a design review this week. The weekend?"), mood: B('我现在不太想见你。让我缓缓。', "I don't much want to see you just now. Give me a while."), away: B('在苏州的工地，晚上回。', 'On a site in Suzhou. Back tonight.'), later: B('等这版图交了再说。', 'Ask me when these drawings are in.'),
    hello: B('你怎么找到我的。……算了，你一直找得到。', 'How did you find me? ...Never mind. You always could.'),
    morning: B('她比你醒得早，站在窗边看江。“原来你每天早上看的是这个。”', 'She was awake before you, standing at the window looking at the river. "So this is what you see every morning."'),
    career: {
      resigned: B('你辞了？……我交反对意见都没被开，你倒自己走了。还是你潇洒。', "You quit? ...I filed a dissent and kept my job, and you walked out of yours. You always did have more style."),
      laidoff: B('第一天最难受。第三天开始你会发现，早上不用开站会其实挺好。今晚来我这儿吃饭。', "The first day is the worst. By the third you find a morning without stand-up is rather nice. Come and eat at mine tonight."),
      startup: B('自己做了。……你在旧金山的时候就说过要做。我以为你忘了。', "Out on your own. ...You said you would, back in San Francisco. I thought you'd forgotten."),
      family: B('回南京。所以你回国，绕了一圈，还是回家了。', 'Back to Nanjing. So you came home to China and went the long way round to going home.'),
      switched: B('换公司了？新的那家开会说不说 circle back？', 'A new company? Do they say "circle back" in meetings at this one?'),
    },
    canned: { zh: ['哈。你还是老样子。', '在工地，等我从脚手架上下来。', '嗯，在听。', '回头说，要进地铁了。'], en: ['Ha. Same as ever.', "On site. Let me get down off the scaffolding.", "Mm. I'm listening.", 'Later. Heading into the station.'] },
  },
  dates: {
    'y-jazz': { hm: [21, 0], needs: 'y-river', days: [13, 15], title: B('第一笔奖金', 'The first bonus'), place: B('和平饭店 · 爵士吧', 'Peace Hotel · the Jazz Bar'), text: B('今晚请你喝酒。方案过了，我拿到今年第一笔项目奖金，不多。九点，你楼下。', "Drinks are on me tonight. The scheme went through and I've had the year's first project bonus. It isn't much. Nine, downstairs from you."), yes: B('好，九点。', 'OK. Nine.'), no: B('今晚不行。', 'Not tonight.') },
    'y-last': { title: B('江边', 'The river'), place: B('外滩 · 南京路口的栏杆', 'The Bund · the railing by Nanjing Road'), text: B('十点，江边，上次那个位置。我有话问你。', 'Ten, the river, where we stood last time. I have something to ask you.'), yes: B('我会到。', "I'll be there."), no: B('今晚不行。', 'Not tonight.') },
  },
  calls: {
    'yuan-call': { from: W, lines: [
      { who: W, text: t('喂。没吵醒你吧？我在工地门口，等人来开门。', "Hey. I haven't woken you? I'm outside the site, waiting for someone to unlock.") },
      { who: 'me', choices: [{ text: t('没有。正好醒着。', "No. I'm up.") }, { text: t('有点。但你说。', 'A bit. But go on.') }] },
      { who: W, text: t('我昨天路过黄河路一家点心店，排队的时候想起 Clement 街。我们从来没说过，旧金山那两年算什么。', 'Yesterday I walked past a dim sum place on Huanghe Road, and standing in the queue I thought of Clement Street. We never once said what those two years in San Francisco were.') },
      { who: 'me', choices: [
        { text: t('算在一起。是我没敢说。', "We were together. I was the one who didn't dare say it."), fx: { t: 8, a: 4, mem: 'named-it' } },
        { text: t('我以为不说，你走的时候就不会太难。', "I thought if we didn't say it, your leaving would be easier."), fx: { t: 5, a: 1, mem: 'named-it' } },
        { text: t('都过去了，予安。', "It's in the past, Yu'an."), fx: { a: -6, t: -2 } },
      ] },
      { who: W, text: t('……嗯。', '...Mm.') },
      { who: W, text: t('我不是来翻旧账的。就是不想它一直悬着。群里那几个，我一个字都没说过。', "I didn't call to go over old ground. I just didn't want it left hanging. I've never said a word about it to the others in the group.") },
      { who: 'me', choices: [{ text: t('那现在不悬着了。想打电话就打。', "Then it isn't hanging now. Call whenever you like."), fx: { t: 3 } }, { text: t('你最近好吗？', 'Are you all right?'), fx: { t: 2 } }] },
      { who: W, text: t('还行。组里在做外滩后面一条老弄堂的方案，我跟组长意见不一样。先这样，开门的人来了。', "Fine. My team's drawing up a scheme for an old lane behind the Bund, and I don't agree with my team lead. I'll let you go. Here's the man with the key.") },
    ] },
  },
  beats: [
    { id: 'y1', first: true, urgent: true, when: () => D(2, 23, 10), until: () => D(3, 12, 0), run: (L) => {
      meet(L, W); feel(L, W, { attraction: 25, trust: 18 }, 'history'); shared(L, W, 'outing', 'sf-years'); openThread(L, W, P.name.zh);
      say(L, W, '今天在和平饭店顶上测了一天，下来看见你站在江边。没叫你。', "I spent the day surveying the Peace Hotel's roof, and when I came down you were standing by the river. I didn't call out.");
      say(L, W, '所以你真的回来了。比我晚了两年。', 'So you really came back. Two years after me.', [
        R('回来了。你走的那天，我什么都没说。', 'I did. The day you left, I said nothing.', { t: 5, mem: 'said-sorry' }, '你送机都是踩着点到的。……算了。上海还住得惯吗？', "You turned up to see me off with a minute to spare. ...Never mind. Is Shanghai treating you all right?"),
        R('你还没睡？', "You're still up?", { t: 1 }, '画图，明早要交。你还是老样子，不接重点。', "Drawings, due in the morning. Same as ever: you never pick up the point."),
      ]); } },
    { id: 'y2', when: () => D(3, 13, 30), until: () => D(4, 14, 0), run: (L) => say(L, W, '[图片] 你那只 GO BEARS 的马克杯，两年前被我顺手装进箱子带回来了，一直在我工位上。还你，还是我接着用？', '[Photo] Your GO BEARS mug came home in my suitcase two years ago. It has been on my desk ever since. Do you want it back, or shall I keep using it?', [
      R('还我。', 'Give it back.', { t: 2, a: 1 }, '行，下次带给你。……桌上会空一块。', "Fine, I'll bring it next time. ...There'll be a gap on my desk."),
      R('你留着用。', 'Keep it. Use it.', { a: 3, mem: 'the-mug' }, '我一直在用。就是问问你要不要。', "I've been using it all along. I only asked to see whether you wanted it."),
      R('扔了吧。', 'Throw it out.', { a: -5, t: -3 }, '行。', 'Fine.'),
    ]) },
    { id: 'y3', when: () => D(5, 8, 0), until: () => D(5, 11, 0), if: (L) => inLife(L, W), run: (L) => { heart(L, W).lastWrote = stamp(L); emit(L, { type: 'call', from: W, script: 'yuan-call' }); } },
    { id: 'y4', urgent: true, when: () => D(8, 21, 0), until: () => D(9, 14, 0), if: (L) => inLife(L, W), run: (L) => say(L, W, '反对意见我交上去了：那条弄堂不能只留一张皮，把住在里面的人掏空。组长说我会后悔。', "I've filed my dissent: that lane can't be kept as a skin with the people scooped out of it. My team lead says I'll regret it.", [
      R('你还好吗？要不要见一面？', 'Are you all right? Shall we meet?', { t: 5 }, '不用。就是想有个人知道。——你是第一个。', "No need. I just wanted someone to know. — You're the first."),
      R('值得吗？工作要紧。', 'Is it worth it? Your job matters.', { t: -1 }, '你跟我组长说的一模一样。', 'You sound exactly like my team lead.'),
      R('居民会议哪天？我去。', "When's the residents' meeting? I'll come.", { a: 4, t: 2, mem: 'come-to-shanghai' }, '……周六下午两点。别来凑热闹。来了，就得听到最后。', "...Saturday at two. Don't come for the spectacle. If you come, you stay to the end."),
    ]) },
    { id: 'y5', when: () => D(10, 21, 30), until: () => D(11, 14, 0), if: (L) => inLife(L, W), run: (L) => say(L, W, '旧金山来信了：以前合作过的那家城市研究所，请我回去带一个社区更新的项目，两年。九月要答复。我还没想好。', "A letter from San Francisco: the urban-research institute I worked with wants me back to lead a community-renewal project. Two years. They want an answer by September. I haven't decided.", [
      R('去。至少认真想一想。', 'Go. At least think about it properly.', { a: 3, t: 2 }, '你这是替他们说话，还是替你自己？', 'Is that you speaking for them, or for yourself?'),
      R('这得你自己想清楚。这边的弄堂呢？', 'You need to think this through yourself. And the lane here?', { t: 4 }, '反对意见要是输了，这边就没什么可守的了。要是赢了，我走就是走到一半。我算过。', "If my dissent loses, there's nothing left here for me to protect. If it wins, leaving means leaving halfway. I've done the sums."),
    ]) },
    { id: 'y6', urgent: true, when: () => D(12, 9, 0), until: () => D(12, 14, 30), if: (L) => inLife(L, W), run: (L) => say(L, W, '决定下来了：方案改了，居民可以留下来。改过的那一页上，有我的名字。', 'The decision is in: the scheme has changed, and the residents can stay. My name is on the page that changed.') },
    { id: 'y7', urgent: true, when: () => D(13, 18, 40), until: () => D(13, 21, 0), if: (L) => inLife(L, W), run: (L) => say(L, W, '我在你那个饭店的八角厅，测玻璃顶。你以前说它像老电影。——确实像。', "I'm in the octagon hall of that hotel of yours, measuring the glass roof. You used to say it was like an old film. — It is.") },
    { id: 'y8', when: () => D(14, 18, 10), until: () => D(14, 20, 20), if: (L) => inLife(L, W) && heart(L, W).stage !== 'known', run: (L) => askOut(L, W, 'y-jazz', P.dates['y-jazz'], D(14, 21, 0)) },
    { id: 'y9', urgent: true, when: () => D(15, 19, 0), until: () => D(15, 21, 20), if: (L) => inLife(L, W) && heart(L, W).stage !== 'known', run: (L) => askOut(L, W, 'y-last', P.dates['y-last'], D(15, 22, 0)) },
    { id: 'y10', urgent: true, when: () => D(16, 9, 0), until: () => D(17, 12, 0), if: (L) => inLife(L, W), run: (L) => { const why = P.end(L); if (why) leave(L, W, why); } },
  ],
  scenes: {
    'y-lobby': { who: W, spot: 'peaceHall', kind: 'talk', label: B('予安', "Yu'an"), action: B('走过去', 'Go over'),
      on: (L) => inLife(L, W) && !done(L, 'y-lobby') && stamp(L) >= D(13, 18, 40) && stamp(L) <= D(13, 22, 0),
      script: (L) => [
        N('她站在八角厅的玻璃顶下面仰着头，脚边是全站仪的箱子。深色西装外套，细框眼镜，齐肩的头发有点乱。', 'She stands under the glass of the octagon hall with her head tipped back, the case of her survey instrument at her feet. Dark blazer, thin-framed glasses, her shoulder-length hair a little untidy.'),
        Y('嗨。', 'Hi.'),
        ask(L, W,
          A('嗨。……你在这儿干活？', "Hi. ...You're working here?", { a: 3 }, Y('玻璃顶九十多年了，有三块要换。换之前，我想把它原来的样子留下来。', "The glass roof is ninety-odd years old and three panes have to go. Before they do, I want a record of it as it was.")),
          A('（走过去抱了她一下）', '(Go over and put your arms round her.)', { a: 4, t: 2 }, N('她没有躲。', "She doesn't pull away."), Y('……你身上是酒店洗发水的味道。不是以前那个了。', '...You smell of hotel shampoo. Not the old one.')),
          A('方案的事，恭喜。', 'Congratulations on the scheme.', { t: 2 }, Y('不是我一个人赢的。居民会议上有个老太太说了一句话，比我写的二十页都管用。', "I didn't win it alone. An old lady at the residents' meeting said one sentence that did more than my twenty pages."))),
        Y('陪我去看江吧。画了一天图，眼睛得看点远的东西。', "Walk me to the river. I've been drawing all day. My eyes need something far away."),
        Y('我先把箱子存前台。江边见，南京路出去那一段。', "I'll leave the case at the desk. See you at the river, the stretch straight out from Nanjing Road."),
      ] },
    'y-river': { who: W, spot: 'railPeace', kind: 'date', label: B('予安', "Yu'an"), action: B('走过去', 'Go over'),
      on: (L) => inLife(L, W) && !!done(L, 'y-lobby') && !done(L, 'y-river') && stamp(L) <= D(13, 23, 40),
      script: (L) => [
        Y('天天在江边的楼里干活，很少停下来看。', "I work in these buildings by the river every day, and I hardly ever stop to look."),
        Y('Ocean Beach 的雾里什么都看不见，我们还每个周末去。这里什么都看得见。', "At Ocean Beach you couldn't see a thing for fog, and we went every weekend anyway. Here you can see everything."),
        ask(L, W,
          A('我想那片雾。', 'I miss that fog.', { a: 4, t: 2, mem: 'the-fog' }, Y('我也是。但我分不清想的是雾，还是那时候的我们。', "So do I. But I can't tell whether it's the fog I miss or who we were in it.")),
          A('看得见，不好吗？', "Isn't it good to be able to see?", { a: 1 }, Y('好。就是藏不住东西。', "It is. It's just that nothing can hide."))),
        Y('旧金山那边在等我答复。……我还没回。不全是因为工作。', "San Francisco is waiting for my answer. ...I haven't replied. It isn't all about work."),
        ask(L, W,
          A('予安，这次我不会什么都不说了。', "Yu'an, this time I won't say nothing.", { t: 5, a: 4, decide: 'step' }, Y('上次你什么都不说，我就走了。', 'Last time you said nothing, and I left.'),Y('……好。我们试试。把话说全的那种。', "...All right. Let's try. The kind where we finish our sentences.")),
          A('我们先做回朋友，好不好？', 'Shall we start by being friends again?', { t: 4, decide: 'slow' }, Y('我们一直是朋友。行。朋友可以一起吃早茶吗？', "We've always been friends. Fine. Can friends go for dim sum?")),
          A('我想先告诉你：我现在有别人了。', "I should tell you first: I'm with someone now.", { t: 6, a: -8, decide: 'friends' }, Y('……谢谢你告诉我。真的。比上次强。', '...Thank you for telling me. Truly. An improvement on last time.'))),
        N('一艘游船从北边开过来，灯一层一层的。她看了很久。', 'A cruise boat comes down from the north, lit deck by deck. She watches it for a long time.'),
      ] },
    'y-jazz': { who: W, spot: 'jazzTable', seat: true, kind: 'date', date: 'y-jazz', pass: 70, label: B('予安', "Yu'an"), action: B('坐下', 'Sit down'),
      on: (L) => dateOn(L, 'y-jazz'),
      script: (L) => [
        Y('今天组长请我吃饭，说他看错了。我没让他买单。', 'My team lead took me to lunch today and said he had been wrong. I didn\'t let him pay.'),
        Y('事务所想让我留下来带弄堂的二期。正式的，项目负责人。', "The firm wants me to stay and lead the lane's second phase. Properly, as project lead."),
        ask(L, W,
          A('你想留吗？', 'Do you want to?', { t: 4 }, Y('想。又怕是因为你才想。我得把这两件事分开。', "I do. And I'm afraid it's because of you. I need to pull those two things apart.")),
          A('留下。', 'Stay.', { a: 3, t: -1 }, Y('别这么快。上次你连一个字都没有，这次留我倒快。慢一点。', "Not so fast. Last time you hadn't a word for me, and now you're quick to keep me. Slow down.")),
          A('旧金山呢？', 'And San Francisco?', { t: 3 }, Y('九月二十号之前要回信。两年，带一个我做梦都想做的项目。', "I have to reply before the twentieth of September. Two years, leading the kind of project I've dreamt about."))),
        N('乐队在奏一首你们以前在 Mission 的小酒吧里听过的曲子。她也听出来了。', 'The band is playing a tune you both once heard in a small bar in the Mission. She has recognised it too.'),
        ask(L, W,
          A('（把手伸过去）', '(Reach across the table.)', { a: 4 }, N('她把手放了上来。', 'She puts her hand in yours.'), Y('……记得吗，那天你把啤酒洒在我电脑上。', '...Remember? That was the night you spilt beer on my laptop.')),
          A('我住楼上。', 'I live upstairs.', upstairs(W, [Y('……我知道。走吧。', '...I know. Come on.')], [Y('我知道。今天不上去。', "I know. I'm not coming up tonight.")])),
          A('（听完这首）', '(Listen to the end of it.)', { t: 2 }, N('你们谁都没说话，一直到最后一个音。', 'Neither of you says a word until the last note.'))),
      ] },
    'y-last': { who: W, spot: 'railPeace', kind: 'date', date: 'y-last', label: B('予安', "Yu'an"), action: B('走过去', 'Go over'),
      on: (L) => dateOn(L, 'y-last'),
      script: (L) => [
        Y('旧金山那边，我可以回“好”，也可以回“不”。', 'San Francisco. I can write back yes. I can write back no.'),
        Y('我不问你要不要我留下。我问的是：你这一年过完，自己打算在哪儿？', "I'm not asking whether you want me to stay. I'm asking: when this year of yours is over, where do you mean to be?"),
        ask(L, W,
          A('上海。我想让你也在。', 'Shanghai. And I want you here too.', (L2) => { const h = heart(L2, W); feel(L2, W, { attraction: 4, trust: 4 }, 'asked'); remember(L2, W, 'asked-stay'); decide(L2, W, 'commit');
            if (isSeeing(L2, W) && h.trust >= 58) { h.plan = 'stays'; return [Y('……那旧金山我回掉。两年，换一句整话。值。', "...Then I'll turn San Francisco down. Two years, for one whole sentence. Worth it.")]; }
            h.plan = 'open'; return [Y('这句话，在旧金山的时候说就好了。……我先去把第一年做完。然后再说。', "If only you'd said that in San Francisco. ...I'll go and do the first year. Then we'll see.")]; }),
          A('去吧。别为我回掉。', "Go. Don't turn it down for me.", (L2) => { feel(L2, W, { trust: 6 }, 'let-go'); remember(L2, W, 'let-go'); heart(L2, W).plan = 'returns'; return [Y('……你这次说了。说得很清楚。', '...This time you said it. And clearly.'), Y('谢谢。我会好好的。', "Thank you. I'll be all right.")]; }),
          A('我不知道。', "I don't know.", (L2) => { feel(L2, W, { trust: -4 }, 'no-answer'); heart(L2, W).plan = 'cold'; return [Y('嗯。那我的答案也有了。', 'Mm. Then I have my answer too.')]; })),
        N('十点。金色的灯一层一层退下去。她说，原来它也会下班。', "Ten o'clock. The gold light drains away floor by floor. So it clocks off too, she says."),
      ] },
  },
  events: {},
  end(L) {
    const h = heart(L, W);
    if (h.plan === 'stays') { h.settled = 'stays'; say(L, W, '旧金山我回掉了。弄堂二期我签了。你的杯子还在我桌上。', "I've turned San Francisco down and signed on for the lane's second phase. Your mug is still on my desk."); return null; }
    if (h.plan === 'open') { h.settled = 'distance'; say(L, W, '[图片] 旧金山，雾。到了。先做一年，然后我们再看，如果你那句话还作数。', "[Photo] San Francisco, fog. I'm here. One year first, and then we'll see, if that sentence of yours still stands."); return null; }
    if (h.plan === 'returns') { say(L, W, '[图片] 到了。雾还是那片雾。纪白，谢谢你这次把话说完了。', '[Photo] Landed. The same old fog. Thank you, Ji Bai, for finishing your sentence this time.'); if (isSeeing(L, W)) return 'returned'; h.settled = 'friend'; return null; }
    if (isSeeing(L, W) || h.plan === 'cold') { say(L, W, '到旧金山了。保重，纪白。', "I'm in San Francisco. Take care, Ji Bai."); return 'returned'; }
    h.settled = 'friend'; say(L, W, '[图片] 到旧金山了。Clement 街那家点心店还开着。下次你来，我请。群里我照样说话。', "[Photo] I'm in San Francisco. The dim sum place on Clement is still open. Next time you're over, my treat. I'll still be in the group chat.");
    return null;
  },
  epilogue(L, h) {
    if (h.settled === 'stays' && h.stage !== 'over') return B('予安回掉了旧金山。外滩后面那条弄堂的工地办公室里，她桌上放着一只印着 GO BEARS 的马克杯。', "Yu'an turned San Francisco down. On her desk in the site office in the lane behind the Bund stands a mug that says GO BEARS.");
    if (h.settled === 'distance' && h.stage !== 'over') return B('予安去旧金山做一年。她说会回来，如果你那句话还作数。你把那句话又说了一遍。', "Yu'an has gone to San Francisco for a year. She says she'll come back, if your sentence still stands. You say it to her again.");
    if (h.stage === 'over' && h.over && h.over.why === 'returned' && h.plan === 'returns') return B('予安去了旧金山。这一次你们把话说完了，雾里和雾外的都说了。', "Yu'an went to San Francisco. This time the two of you finished your sentences, the ones from inside the fog and the ones from outside it.");
    if (h.stage === 'over' && h.over && h.over.why !== 'faded') return B('你的马克杯最后还是被送到了和平饭店的前台。盒子里没有字条。', 'Your mug was left at the Peace Hotel front desk in the end. There was no note in the box.');
    return null;
  },
};
export default P;
