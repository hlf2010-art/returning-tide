// 顾念 Gu Nian, 29: an architect, Ruoan's team lead at the practice restoring the Bund's buildings.
// Steady, exact, says what she means and asks what he means. She is nobody's option.
//   Act I    the AIA lobby after hours, a tape he can hold the other end of; one o'clock at Manner;
//            the river cruise she has never taken, and the sunset after it
//   Act II   the Bund from the foundations up, and her question: where will he be in November?
//   Act III  the last three papers of her registration exam; she says she'll be slow, and why
//   Act IV   she passes; a studio of her own in a lane house in Hongkou; a second key
//   Act V    she asks the question the second time
import { pay, post } from '../../engine/life.js';
import { heart, inLife, isSeeing, feel } from '../../engine/hearts.js';
import { owns } from '../../engine/maker.js';
import { B, D, H, tod, between, say, R, A, ask, askOut, dayAfter, afterBeat, done, dateOn, upstairs, t } from './kit.js';

const W = 'gunian';
const G = (zh, en) => [W, zh, en], N = (zh, en) => ['nar', zh, en];
const day = (L) => L.clock.day;
const exams = (L) => day(L) >= 11 && day(L) <= 12;

const P = {
  id: W, name: B('顾念', 'Gu Nian'), short: B('顾念', 'Gu Nian'), age: 29, sex: 'f', color: '#5f7f6e', avatar: ['c4', 'p5', 'c1'], voice: { pitch: 1.0, rate: 0.98 },
  role: B('建筑师，外滩老建筑修缮；若安的组长', "Architect, restoring the Bund's old buildings; Ruoan's team lead"),
  ambition: B('考完一级注册建筑师，开一间自己的小事务所，修里弄', 'Finish her registration exams and open a small practice of her own, repairing lane houses'),
  how: "You are the team lead of his oldest friend Xu Ruoan at the conservation practice; you met him in the AIA Building lobby when you asked him to hold the end of a tape.",
  address: B('纪白', 'Ji Bai'),
  card: "Gu Nian (顾念), 29, Shanghai-born, grew up in a lane house in Hongkou; Tongji architecture, eight years at the conservation practice where Xu Ruoan is her junior, leading the survey of the AIA Building and Peace Hotel interiors; sitting the last papers of her registered-architect exam in May; wants a small practice of her own repairing lane houses for the people who still live in them; calm, exact, warm in a quiet way, says what she means and asks what you mean; ended a six-year relationship two years ago without a quarrel and has no interest in being anyone's option; writes in full sentences with punctuation; one flat white a day, at one o'clock, at the Manner on Hankou Road",
  arc: {
    1: B('白天量和平饭店，下班以后量友邦大楼的大堂。', 'Measuring the Peace Hotel by day and the AIA lobby after office hours.'),
    2: B('在虹口租下一个石库门的二楼，准备做自己的工作室。', 'She has rented the first floor of a lane house in Hongkou for a studio of her own.'),
    3: B('五月考一级注册建筑师的最后三门。晚上都在画图。', 'The last three papers of her registration exam are in May. She draws every evening.'),
    4: B('考过了。“顾念建筑修缮”挂牌；第一个自己签字的项目是山阴路的一栋里弄。', 'She has passed. "Gu Nian Building Repairs" has its sign up; the first job under her own signature is a lane house on Shanyin Road.'),
    5: B('她的日子是定的。她在等他说他的。', 'Her life is settled. She is waiting to hear his.'),
  },
  schedule(L) {
    const m = tod(L);
    if (m >= H(23) || m < H(6, 45)) return { spot: null, doing: B('睡了（她十一点睡）', 'asleep (she sleeps at eleven)'), free: false };
    if (m >= H(13) && m < H(13, 40)) return { spot: 'manner', doing: B('在汉口路的 Manner 窗口边，喝她每天那杯澳白', 'by the Manner window on Hankou Road with her one flat white of the day'), free: true };
    if (exams(L) && m >= H(19)) return { spot: null, doing: B('在家画图，备考（考前不太看手机）', 'at home drawing for her exam (she barely looks at her phone before it)'), free: false };
    if (day(L) <= 8 && between(L, H(18, 20), H(20, 40))) return { spot: 'aiaLobby', doing: B('在友邦大楼的大堂里测绘，趁楼里下了班', 'surveying the AIA Building lobby now the offices have emptied'), free: true };
    if (m >= H(8, 30) && m < H(18)) return { spot: null, doing: day(L) >= 13 ? B('在虹口的工作室，或者山阴路的工地上', 'at her studio in Hongkou, or on site at Shanyin Road') : B('在和平饭店楼上测绘，或者在事务所', 'surveying upstairs at the Peace Hotel, or at the practice'), free: true };
    return { spot: null, doing: B('在家，桌上摊着图纸', 'at home with drawings spread on the table'), free: true };
  },
  memories: {
    'g-aia': B('友邦大楼的大堂里，她请他帮忙按住卷尺的另一头。六米四二，和一九二四年的图纸差三公分。', 'In the AIA Building lobby she asked him to hold the other end of her tape. Six metres forty-two: three centimetres out from the 1924 drawings.'),
    'held-tape': B('他什么都没问，先走过去替她按住了卷尺。', 'He asked nothing and simply went over and held the tape for her.'),
    'g-manner': B('中午一点在汉口路的 Manner，她讲完了那三公分，然后直接问他：你自己怎么想？', 'One o\'clock at the Manner on Hankou Road: she finished the story of the three centimetres, then asked him straight out what he himself wanted.'),
    'same-building': B('他问她：修完以后，它还是原来那栋楼吗？她说：修的时候诚实，它就还是。', 'He asked whether a building is still the same one after it is restored. She said: if you are honest while you mend it, it is.'),
    'told-year': B('他告诉她：他想留在上海，但还拿不出能说服父亲的东西。', "He told her he wants to stay in Shanghai but doesn't yet have anything that would convince his father."),
    'g-cruise': B('她在上海住了二十九年，第一次坐黄浦江的游船，是和他。下船的时候是日落。', 'After twenty-nine years in Shanghai she took the river cruise for the first time, with him. They came ashore at sunset.'),
    'honest-mess': B('他说实话：他这一年很乱，怕耽误她。她说，乱可以，瞒不行。', "He told her the truth: his year is a mess and he's afraid of wasting her time. She said a mess she can take; hiding it she can't."),
    'g-night': B('晚上她带他从地基看外滩：海关大楼的台阶一百年沉了三级。她问他十一月以后人在哪儿。', 'One night she showed him the Bund from the foundations up: the Customs House has sunk three steps in a hundred years. She asked where he would be after November.'),
    'tell-first': B('他答应她：不管去哪儿，先告诉她，不是事后。', 'He promised her: wherever he ends up, he tells her first, not after.'),
    'said-shanghai': B('他说：十一月以后，他在上海。', 'He said that after November he will be in Shanghai.'),
    'studio-first': B('她在虹口的工作室，他是第一个看到的人。', 'He was the first person to see her studio in Hongkou.'),
    'g-key': B('她考过了一级注册建筑师，破例去了爵士吧，把工作室的第二把钥匙放在了桌上。', 'She passed her registration exams, made an exception and went to the Jazz Bar, and put the second key to her studio on the table.'),
    'the-key': B('他收下了她工作室的钥匙。规矩只有一条：有事当面说。', 'He took the key to her studio. There is one rule: if something is wrong, say it to her face.'),
    'gunian-night': B('有一晚她没有回虹口。', 'One night she did not go back to Hongkou.'),
  },
  lines: {
    accept: B('好。到时候见。', 'Good. See you then.'), decline: B('好。那下次。', 'All right. Another time.'), missed: B('你没有回，我就当是不方便。', "You didn't answer, so I took it that it wasn't convenient."),
    stood: B('我等了一个小时。你可以不来，但要说一声。我不喜欢猜。', "I waited an hour. You're free not to come, but tell me. I don't like guessing."),
    quiet: B('我问过两次了，不会问第三次。你想见我的时候，知道我在哪儿：每天一点，汉口路。', "I've asked twice and I won't ask a third time. If you want to see me you know where I am: one o'clock, Hankou Road, every day."),
    left: B('纪白，我想过了。我要的是一个知道自己在哪儿的人。你还不是。这不是你的错，但我不等了。祝你那顿饭顺利。', "Ji Bai, I've thought it through. I want someone who knows where he stands. You don't yet. That's no fault of yours, but I've stopped waiting. I hope the dinner goes well."),
    twoGone: B('若安告诉我了，你还在见别人。我不比较，也不竞争。祝你好。卷尺不用还了。', "Ruoan told me you're seeing someone else as well. I don't compare and I don't compete. I wish you well. Keep the tape."),
    ended: B('好。谢谢你告诉我，没有让我猜。', 'All right. Thank you for telling me, and not leaving me to guess.'),
    fight: B('我看见了。我不问谁先动的手。我只说一遍：我不跟用拳头解决事情的人在一起。', "I saw. I'm not asking who started it. I'll say this once: I don't stay with people who settle things with their fists."),
    heard: B('若安说你跟人动手了。你没事就好。……但我想听你自己说是怎么回事。', "Ruoan says you were in a fight. I'm glad you're all right. ...But I'd like to hear from you what happened."),
    online: B('有人把你的视频转给我了。我没看完。你想说的时候再说。', "Someone forwarded me a video of you. I didn't watch to the end. Tell me about it when you want to."),
    hurt: B('你受伤了。去过医院没有？没有的话，现在去。我可以陪你。', "You're hurt. Have you been to a hospital? If not, go now. I can come with you."),
    onesided: B('我发现每次都是我先找你。我不介意先开口，但我想知道你是不是也想找我。', "I notice it's always me who gets in touch first. I don't mind speaking first, but I'd like to know whether you want to find me too."),
    yes: B('可以。', 'Yes, I can.'), busy: B('这周在赶测绘报告。下周三以后可以。', "I'm finishing a survey report this week. After next Wednesday I can."), mood: B('我现在不太想见面。等我想清楚再找你。', "I'd rather not meet just now. I'll find you when I've thought things through."), away: B('我在苏州看一个项目，周末回。', "I'm in Suzhou looking at a project. Back at the weekend."), later: B('考完再说，好吗？', 'After the exam, all right?'),
    hello: B('你来了。等我把这口喝完。', "You came. Let me finish this."),
    morning: B('她七点就起了，把你桌上的图纸按大小叠好了。留了张便条：会九点开，我先走。钥匙在老地方。', "She was up at seven and had stacked the papers on your desk in order of size. A note: the meeting's at nine, I've gone ahead. The key's in the usual place."),
    career: {
      resigned: B('辞职了。你想清楚了就好。下一步是什么，想好了告诉我，没想好也告诉我。', "You've resigned. Good, if you've thought it through. Tell me what's next when you know. Tell me if you don't know, too."),
      laidoff: B('若安告诉我了。这不是你的问题。今晚来吃饭，我做。', "Ruoan told me. It isn't your doing. Come for supper tonight. I'll cook."),
      startup: B('自己做公司。好。我开工作室的时候，头三个月没睡过整觉。需要一张桌子的话，我这儿有。', "Your own company. Good. For the first three months of my studio I never slept a whole night. If you need a desk, I have one."),
      family: B('你决定回南京了。谢谢你告诉我。高铁一个小时。我算过了。', "So you've decided on Nanjing. Thank you for telling me. It's an hour by train. I've worked it out."),
      switched: B('换了公司。新的地方离外滩远吗？', 'A new firm. Is it far from the Bund?'),
    },
    canned: { zh: ['在工地，手上有灰。晚点回你。', '好。', '我想一下再回答你。', '你吃饭了吗？'], en: ["On site with dust on my hands. I'll answer later.", 'All right.', 'Let me think before I answer that.', 'Have you eaten?'] },
  },
  dates: {
    'g-cruise': { hm: [16, 0], tomorrow: true, needs: 'g-manner', days: [1, 10], title: B('黄浦江游船', 'The river cruise'), place: B('外滩 · 游船码头', 'The Bund · the cruise pier'), text: B('下午四点有空吗？我在上海住了二十九年，没坐过黄浦江的游船，嫌它太游客。想找个人陪我丢一次人。码头在江边南头。', "Are you free at four in the afternoon? Twenty-nine years in Shanghai and I've never taken the river cruise: too touristy. I'd like company while I embarrass myself. The pier is at the south end of the promenade."), yes: B('好，四点码头见。', 'Yes. Four, at the pier.'), no: B('那天下午不行。', "I can't that afternoon.") },
    'g-night': { hm: [20, 30], needs: 'g-cruise', days: [2, 13], title: B('从地基看外滩', 'The Bund, from the foundations up'), place: B('外滩 · 海关大楼对面的栏杆', 'The Bund · the railing opposite the Customs House'), text: B('八点半，海关大楼对面。我带你看外滩，按我的方式：从地基看起。', "Half past eight, opposite the Customs House. I'll show you the Bund my way: from the foundations up."), yes: B('好。', 'Yes.'), no: B('那晚不行。', "I can't that evening.") },
    'g-key': { title: B('考过了', 'She passed'), place: B('和平饭店 · 爵士吧', 'Peace Hotel · the Jazz Bar'), text: B('今晚九点，你楼下的爵士吧。我不太去酒吧，今天例外。', "Nine tonight, the Jazz Bar downstairs from you. I don't go to bars. Tonight is an exception."), yes: B('我订位。', "I'll book the table."), no: B('今晚不行。', 'Not tonight.') },
  },
  beats: [
    // Ruoan, the morning after (in her own chat)
    { id: 'g0', urgent: true, when: (L) => dayAfter(L, W, 'g-aia', 9, 40), run: (L) => { if (L.threads.ruoan) post(L, 'ruoan', { from: 'ruoan', kind: 'text', text: t('顾念今天问我你是谁。我说是个麻烦。她说“看着不像”。……你对我组长做了什么？', 'Gu Nian asked me today who you were. I said trouble. She said you didn\'t look it. ...What have you done to my team lead?') }); } },
    { id: 'g1', when: (L) => afterBeat(L, 'g0', 150), until: (L) => afterBeat(L, 'g0', 1440 * 3), if: (L) => !done(L, 'g-manner'), run: (L) => say(L, W, '昨天谢谢你帮我按卷尺。汉口路那家 Manner，我每天一点在。今天也在。', "Thank you for holding the tape yesterday. I'm at the Manner on Hankou Road at one every day. Today as well.") },
    { id: 'g2', when: (L) => (done(L, 'g-manner') ? Math.max(done(L, 'g-manner') + 300, D(Math.floor(done(L, 'g-manner') / 1440), 20, 30)) : null), until: () => D(10, 12, 0), run: (L) => askOut(L, W, 'g-cruise', P.dates['g-cruise'], D(day(L) + 1, 16, 0)) },
    { id: 'g3', when: (L) => dayAfter(L, W, 'g-cruise', 21, 30, 0), run: (L) => say(L, W, '今天回去以后我量了和平饭店的八角厅，抬头看了很久那个玻璃顶。想到你住在它楼上。', 'After we parted I went and measured the octagon hall at the Peace Hotel and stood a long time looking up at the glass. It occurred to me that you live above it.', [
      R('下次量的时候叫我，我给你按卷尺。', "Call me next time you measure. I'll hold the tape.", { a: 3, t: 2 }, '你已经是我用过最稳的一头了。', "You're already the steadiest end I've ever had."),
      R('那个顶是真的，还是后来修的？', 'Is that glass original, or restored?', { t: 2 }, '中间一圈是一九二九年的，外面两圈是我们补的。看得出来，才算修得诚实。', "The middle ring is 1929. The outer two are ours. If you can tell them apart, it's an honest repair."),
    ]) },
    { id: 'g4', when: (L) => { const c = done(L, 'g-cruise'); return c ? Math.max(D(7, 20, 0), D(Math.floor(c / 1440) + 1, 20, 0)) : null; }, until: () => D(10, 12, 0), run: (L) => askOut(L, W, 'g-night', P.dates['g-night'], D(day(L) + 1, 20, 30)) },
    { id: 'g5', when: () => D(9, 21, 30), until: () => D(10, 22, 0), if: (L) => inLife(L, W) && heart(L, W).stage !== 'known', run: (L) => say(L, W, '这周末我搬画图桌，从我妈家搬到新租的工作室：虹口，一个石库门的二楼。不是请你帮忙搬。是想让你第一个看。', "I'm moving my drawing table this weekend, from my mother's to the studio I've rented: Hongkou, the first floor of a lane house. I'm not asking you to carry it. I'd like you to be the first to see the place.", [
      R('我来搬，也来看。', "I'll carry, and I'll look.", { a: 3, t: 4, mem: 'studio-first' }, '那我多买一份生煎。', "Then I'll buy an extra box of shengjian."),
      R('这周末要加班。', "I'm working this weekend.", { t: -1 }, '好。那下次。', 'All right. Next time.'),
    ]) },
    { id: 'g6', urgent: true, when: () => D(11, 12, 10), until: () => D(11, 18, 30), if: (L) => inLife(L, W), run: (L) => say(L, W, '下个月考最后三门。考前我晚上都在画图，不太回消息。不是冷淡，是在考试。先跟你说一声。', "Last three papers next month. Until then I'm drawing every evening and slow to answer. It isn't coldness. It's an exam. I wanted you to know beforehand.", [
      R('好好考。考完第一顿饭我请。', "Do well. The first dinner after it is on me.", { t: 3 }, '好。考完第一顿归你。', "Good. The first dinner is yours."),
      R('需要有人帮你按卷尺吗？', 'Do you need someone to hold the tape?', { a: 3 }, '考场不让带人。心领了。', "They don't let you bring anyone in. But thank you."),
    ]) },
    { id: 'g7', urgent: true, when: () => D(13, 18, 30), until: () => D(13, 20, 20), if: (L) => inLife(L, W), run: (L) => { say(L, W, '过了。九门全过。', 'I passed. All nine papers.'); if (heart(L, W).stage !== 'known') askOut(L, W, 'g-key', P.dates['g-key'], D(13, 21, 0)); } },
    { id: 'g8', when: () => D(15, 12, 30), until: () => D(15, 22, 0), if: (L) => inLife(L, W), run: (L) => say(L, W, '第一个自己签字的项目：山阴路一栋里弄，三户人家，住了五十年。业主是个八十岁的阿婆，她问我，修完还认不认得出来。', 'The first job under my own signature: a lane house on Shanyin Road, three households, fifty years in it. The owner is eighty. She asked me whether she would still recognise it when I had finished.', [
      R('你怎么答的？', 'What did you tell her?', { t: 2, a: 2 }, '我说：修得诚实，就认得出。', 'I said: if the repair is honest, you will.'),
      R('恭喜，顾工。', 'Congratulations, Architect Gu.', { a: 2 }, '谢谢。再叫一遍。', 'Thank you. Say that again.'),
    ]) },
    { id: 'g9', urgent: true, when: () => D(16, 20, 30), until: () => D(17, 12, 0), if: (L) => inLife(L, W) && heart(L, W).stage !== 'known', run: (L) => say(L, W, '下个月你跟你爸吃那顿饭。我问第二遍：之后，你人在哪儿？', "Next month is your dinner with your father. I'm asking a second time: afterwards, where will you be?", [
      R('上海。', 'Shanghai.', { t: 4 }, '好。我听见了。', 'Good. I heard that.'),
      R('可能是南京。但我每周回来。', 'Possibly Nanjing. But I would be back every week.', { t: 3 }, '高铁一个小时。我算过了。可以。', "It's an hour by train. I've worked it out. That can be done."),
      R('还不知道。', "I still don't know.", { t: -5 }, '……好。那我等到那天晚上。只等到那天晚上。', '...All right. Then I wait until that evening. Only until that evening.'),
    ]) },
  ],
  scenes: {
    'g-aia': { who: W, spot: 'aiaLobby', kind: 'help', label: B('一个在量地面的人', 'Someone measuring the floor'), action: B('走过去', 'Go over'),
      on: (L) => heart(L, W).stage === 'stranger' && day(L) <= 8 && between(L, H(18, 20), H(20, 40)),
      script: (L) => [
        N('一个女人蹲在花岗岩地面上，卷尺的一头压在膝盖下面，另一头够不着墙。', 'A woman is crouched on the granite floor with one end of a tape under her knee. The other end will not quite reach the wall.'),
        G('不好意思——能帮我按住那头吗？墙角，贴地。', 'Excuse me — could you hold the other end? In the corner, flat to the floor.'),
        ask(L, W,
          A('（走过去按住）', '(Go over and hold it.)', { t: 4, mem: 'held-tape' }, G('谢谢。……六米四二。和一九二四年的图纸差三公分。', 'Thank you. ...Six metres forty-two. Three centimetres out from the 1924 drawings.')),
          A('用激光测距仪不是更快？', "Wouldn't a laser measure be quicker?", { a: 2 }, G('这面墙是弧的，激光只给我一条弦。麻烦你。', 'This wall is curved. A laser only gives me the chord. If you would.'), G('……六米四二。和一九二四年的图纸差三公分。', '...Six metres forty-two. Three centimetres out from the 1924 drawings.'))),
        G('三公分。要么是当年施工偷了懒，要么是这栋楼一百年里自己挪了位置。我赌后者。', "Three centimetres. Either the builders cut a corner, or this building has shifted by itself in a hundred years. My money's on the second."),
        ...(owns(L, 'lidar') ? [G('你包里那个是手持的激光雷达？若安说过，她有个朋友自己做了一台。', 'Is that a handheld LiDAR in your bag? Ruoan mentioned a friend of hers who built one himself.')] : []),
        ask(L, W,
          A('你是若安的同事？我是纪白，她朋友。', "You work with Ruoan? I'm Ji Bai, a friend of hers.", { t: 3 }, G('顾念。她的组长。——她说你是个麻烦。看着不像。', "Gu Nian. Her team lead. — She says you're trouble. You don't look it.")),
          A('楼会自己挪位置？', 'Buildings move by themselves?', { a: 2, t: 2 }, G('会。外滩是填出来的地，每栋楼都在慢慢往江里走。我们的工作，就是记下它走到哪儿了。', 'They do. The Bund is made ground, and every building on it is walking slowly into the river. Our job is to write down how far each has got.'), G('顾念。若安的组长。你是她那个朋友吧。', "Gu Nian. Ruoan's team lead. You must be that friend of hers."))),
        G('我每天一点在汉口路的 Manner。你要是路过，那三公分的事我可以讲完。', "I'm at the Manner on Hankou Road at one every day. If you're passing, I can tell you the rest about those three centimetres."),
      ] },
    'g-manner': { who: W, spot: 'manner', kind: 'outing', label: B('顾念', 'Gu Nian'), action: B('打个招呼', 'Say hello'),
      on: (L) => inLife(L, W) && !done(L, 'g-manner') && day(L) <= 10 && between(L, H(13), H(13, 40)),
      script: (L) => [
        G('你来了。我以为做咨询的人中午不出楼。', 'You came. I thought consultants never left the building at lunchtime.'),
        G('三公分的事。答案是两个都对：施工队少砌了一皮砖，楼又自己走了一公分半。', 'About the three centimetres. Both answers were right: the builders left out a course of bricks, and the building has walked the other centimetre and a half.'),
        ask(L, W,
          A('所以你的工作是给老房子做体检。', 'So your job is giving old buildings a check-up.', { a: 2, t: 2 }, G('差不多。区别是，我的病人不会说哪里疼。', "More or less. Except that my patients can't say where it hurts.")),
          A('你们修完以后，它还是原来那栋楼吗？', "When you've finished restoring it, is it still the same building?", { t: 4, a: 2, mem: 'same-building' }, N('她想了一下。', 'She thinks.'), G('这个问题我问了自己八年。现在的答案是：修的时候诚实，它就还是。', "I've asked myself that for eight years. My answer today: if you are honest while you mend it, it is."))),
        G('轮到你。若安说你家里有个厂，你爸等你回去。你自己怎么想？', 'Your turn. Ruoan says your family has a works and your father is waiting for you to come home. What do you think yourself?'),
        ask(L, W,
          A('我想留下。但我还拿不出能说服他的东西。', "I want to stay. But I don't yet have anything that would convince him.", { t: 6, mem: 'told-year' }, G('那就去做出来。这比想清楚容易。', "Then go and make it. That's easier than thinking it through.")),
          A('还没想好。', "I haven't decided.", { t: 2 }, G('没想好可以。别假装想好了就行。', "Not having decided is fine. Just don't pretend you have.")),
          A('我们才见第二面，你问得真直接。', "We've met twice. You're very direct.", { a: 2 }, G('我二十九了，没时间绕。你介意的话可以不答。', "I'm twenty-nine. I haven't time for the long way round. You needn't answer if you'd rather not."))),
        G('一点四十了，我得回工地。', "It's twenty to two. I'm due back on site."),
      ] },
    'g-cruise': { who: W, spot: 'pier', kind: 'date', date: 'g-cruise', label: B('顾念', 'Gu Nian'), action: B('走过去', 'Go over'),
      on: (L) => dateOn(L, 'g-cruise'),
      script: (L) => [
        G('准时。我喜欢准时的人。', 'On time. I like people who are on time.'),
        ask(L, W,
          A('船票我买了。', "I've got the tickets.", (L2) => { const r = pay(L2, { method: 'wechat', amount: 240, to: '浦江游览', memo: '游船票 ×2', kind: 'purchase' }); if (r.ok) r.entry.memoEn = 'Cruise tickets ×2'; feel(L2, W, { trust: 2 }, 'tickets'); return [G('那晚饭我请。公平。', "Then dinner is mine. Fair.")]; }),
          A('AA 吧？', 'Shall we split it?', (L2) => { const r = pay(L2, { method: 'wechat', amount: 120, to: '浦江游览', memo: '游船票', kind: 'purchase' }); if (r.ok) r.entry.memoEn = 'Cruise ticket'; feel(L2, W, { trust: 1 }, 'tickets'); return [G('AA。我喜欢账目清楚。', 'Split it. I like clean accounts.')]; })),
        { fade: B('游船绕了一圈，五十分钟。她指了一路：哪栋楼是谁设计的，哪栋她量过，哪栋的窗是去年换的。', 'The boat makes its loop: fifty minutes. She points the whole way: who designed which building, which ones she has measured, which had its windows replaced last year.'), minutes: 55 },
        N('下船的时候，太阳刚落到外滩的楼后面，江面是铜色的。', 'When you step ashore the sun has just gone behind the Bund, and the river is the colour of copper.'),
        G('好吧，我承认，不丢人。从水上看才知道，这一排楼是给江上的人看的。', 'All right, I admit it: not embarrassing. From the water you understand that this whole row was built to be seen from the river.'),
        G('我跟你说件事，你听了别有压力。我之前谈过一段，六年。分的时候很平静，平静到我们俩都害怕。', "I'm going to tell you something, and I don't want it to weigh on you. I was with someone for six years. When it ended it was so calm it frightened us both."),
        G('所以我现在不猜。喜欢就说，不合适也说。', "So I don't guess any more. If I like someone I say so. If it isn't right I say that too."),
        ask(L, W,
          A('那我也说：我想再见你。不是路过的那种。', "Then I'll say it too: I want to see you again. Not in passing.", { a: 5, t: 4, decide: 'step' }, N('她点点头，像确认了一个尺寸。', 'She nods, as if confirming a measurement.'), G('好。那下次算约会。', 'Good. Then next time is a date.')),
          A('我这一年很乱。我怕耽误你。', "My year's a mess. I'm afraid of wasting your time.", { t: 5, a: -1, mem: 'honest-mess' }, G('谢谢你说实话。乱可以，瞒不行。我们慢一点。', "Thank you for being honest. A mess I can take. Hiding it I can't. We'll go slowly.")),
          A('（看着江，不说话）', '(Look at the river. Say nothing.)', null, G('不急。你想好了告诉我。', 'No hurry. Tell me when you know.'))),
        N('泛光灯亮了。她抬头看了一眼海关的钟，对了对自己的表。', 'The floodlights come on. She glances up at the Customs clock and checks her watch against it.'),
      ] },
    'g-night': { who: W, spot: 'railCustoms', kind: 'date', date: 'g-night', label: B('顾念', 'Gu Nian'), action: B('走过去', 'Go over'),
      on: (L) => dateOn(L, 'g-night'),
      script: (L) => [
        G('看见海关大楼的台阶了吗？原来有九级，现在只露出六级。一百年，沉了三级。', 'See the Customs House steps? There were nine. Six show now. In a hundred years it has sunk three.'),
        G('我喜欢这个行当，就是因为它不许你急。', "That's why I like this trade. It doesn't let you hurry."),
        ask(L, W,
          A('你也这样看人？', 'Is that how you look at people too?', { a: 3 }, G('看人更慢。不过你，我量得差不多了。', "People take longer. Though I've nearly finished measuring you.")),
          A('我的行当正相反，慢一个月就过时了。', "Mine's the opposite. A month late and you're obsolete.", { t: 2 }, G('所以你需要一样不会过时的东西。……比如一栋楼。或者一个人。', "Then you need something that doesn't go out of date. ...A building, say. Or a person."))),
        G('我问你个实在的。十一月你跟你爸吃完那顿饭，人在哪儿？上海，还是南京？', 'A practical question. In November, after that dinner with your father, where will you be? Shanghai or Nanjing?'),
        ask(L, W,
          A('上海。', 'Shanghai.', { t: 3, mem: 'said-shanghai' }, G('好。我记下了。到时候我会问你第二遍。', "Good. I've made a note. I'll ask you again when the time comes.")),
          A('我不知道。但不管在哪儿，我会先告诉你，不是事后。', "I don't know. But wherever it is, I'll tell you first, not after.", { t: 8, mem: 'tell-first' }, N('她看着你。', 'She looks at you.'), G('这比“上海”好。我要的就是这个。', 'That\'s better than "Shanghai". That is what I was asking for.')),
          A('现在说这个太早了吧。', "It's a bit early for that, isn't it?", { t: -3 }, G('不早。我不想到了十一月，才发现自己是个备选。', "It isn't early. I don't want to find out in November that I was a fallback."))),
        N('她把围巾解下来一半，绕到你脖子上。“江边风大。你那件外套不够。”', 'She unwinds half her scarf and puts it round your neck. "It\'s windy by the river. That jacket isn\'t enough."'),
        ask(L, W,
          A('（握住她的手）', '(Take her hand.)', { a: 5, decide: 'step' }, G('……手是凉的。我的也是。扯平。', "...Your hand is cold. So is mine. We're even.")),
          A('谢谢。', 'Thank you.', { t: 1 }, G('不客气。', "You're welcome."))),
      ] },
    'g-key': { who: W, spot: 'jazzTable', seat: true, kind: 'date', date: 'g-key', pass: 70, label: B('顾念', 'Gu Nian'), action: B('坐下', 'Sit down'),
      on: (L) => dateOn(L, 'g-key'),
      script: (L) => [
        G('我不太来这种地方。今天例外：从今天起，我可以在图纸上签自己的名字了。', "I don't usually come to places like this. Today is an exception: from today I can sign drawings in my own name."),
        ask(L, W,
          A('顾工。', 'Architect Gu.', { a: 3 }, N('她笑了。', 'She laughs.'), G('再叫一遍。', 'Say that again.')),
          A('那你的工作室可以挂牌了。', 'Then your studio can put its sign up.', { t: 3 }, G('下个月。牌子是我自己画的，六个字：“顾念建筑修缮”。', 'Next month. I drew the sign myself. Six characters: "Gu Nian Building Repairs".'))),
        G('还有一件事。工作室我多配了一把钥匙。', 'One more thing. I had a second key cut for the studio.'),
        N('她把钥匙放在桌上，没有推过来。', "She puts the key on the table. She doesn't push it across."),
        ask(L, W,
          A('（拿起钥匙）我收下。', "(Pick up the key.) I'll take it.", { t: 6, a: 4, mem: 'the-key', decide: 'commit' }, G('……好。', '...Good.'), G('规矩只有一条：有事当面说。', "There's only one rule: if something is wrong, say it to my face.")),
          A('念念，我还没准备好。', "Niannian, I'm not ready yet.", { t: 3, decide: 'slow' }, N('她把钥匙收了回去，很平静。', 'She takes the key back, quite calmly.'), G('好。它不会过期。但我不会一直问。', "All right. It doesn't expire. But I won't keep asking.")),
          A('太快了吧。', "Isn't this rather fast?", { a: -3, t: -2 }, G('半年了，不快。……算了。当我没拿出来。', "It's been half a year. It isn't fast. ...Never mind. Forget I took it out."))),
        ask(L, W,
          A('今晚别回虹口了。', "Don't go back to Hongkou tonight.", upstairs(W, [G('……我明早九点要开会。闹钟你来定。', '...I have a meeting at nine. You set the alarm.')], [G('今天不。我想慢一点。', 'Not tonight. I want to go slowly.')])),
          A('我送你上车。', "I'll see you into a car.", { t: 2 }, G('好。到家告诉你。', "Thank you. I'll tell you when I'm home."))),
      ] },
  },
  events: {},
  end() { return null; },
  epilogue(L, h) {
    const c = L.flags.dinnerChoice;
    if (h.stage === 'together') return c === 'home' ? B('顾念算过了：南京到上海，高铁一个小时。每个周五晚上，她在虹桥站的出口等你，手里拿着两杯澳白。', "Gu Nian had worked it out: Nanjing to Shanghai is an hour by train. Every Friday evening she waits at the Hongqiao exit with two flat whites.")
      : B('那天晚上顾念在和平饭店的八角厅里等你，没有问结果，先看了看你的脸。工作室的钥匙还在你口袋里。', "That night Gu Nian was waiting in the octagon hall of the Peace Hotel. She didn't ask how it had gone. She looked at your face first. The key to her studio is still in your pocket.");
    if (h.stage === 'dating') return B('顾念的工作室挂了牌。那把钥匙还在她抽屉里。她说过，它不会过期。', 'Gu Nian\'s studio has its sign up. The second key is still in her drawer. It doesn\'t expire, she said.');
    if (h.stage === 'over' && h.over && h.over.why === 'two-timed') return B('若安有很久没在群里提过顾念。', "For a long time Ruoan doesn't mention Gu Nian in the group chat.");
    if (h.stage === 'over' && h.over && ['dating', 'together'].includes(h.over.was)) return B('每天下午一点，汉口路的 Manner 窗口边还是站着一个喝澳白的人。你没有再走过去。', "At one every afternoon someone still stands by the Manner window on Hankou Road with a flat white. You haven't walked over again.");
    return null;
  },
};
export default P;
