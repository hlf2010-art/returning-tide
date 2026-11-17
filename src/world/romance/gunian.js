// 顾念 Gu Nian, 29: a tech investor and strategist, a partner at a small early-stage fund upstairs in
// the AIA Building; Shanghai-born, an MBA from abroad. Sharp and rational across a table, slower and
// less sure of herself across a dinner. She will tell him what is wrong with his work; she will never
// put money into a man she is seeing. She is nobody's option.
//   Act I    the AIA lobby after hours, a start-up's camera that calls everyone who sits down a fall,
//            and would he sit down for it; one o'clock at Manner; the river cruise she has never taken
//   Act II   Lujiazui from the railing, every lit window a bet; "don't show me your gimbal, not yet";
//            and her question: where will he be in November? She is leaving to raise a fund of her own
//   Act III  the roadshow; she says she'll be slow, and why
//   Act IV   first close: Slow Tide Capital, upstairs from the Yangpu makerspace; a second key (to her
//            flat, never to the office); his deck, and four pages of honest notes
//   Act V    she asks the question the second time
import { pay, post } from '../../engine/life.js';
import { heart, inLife, isSeeing, feel } from '../../engine/hearts.js';
import { owns } from '../../engine/maker.js';
import { hasProduct } from '../../engine/studio.js';
import { career } from '../../engine/year.js';
import { B, D, H, tod, between, say, R, A, ask, askOut, dayAfter, afterBeat, done, dateOn, upstairs, t } from './kit.js';

const W = 'gunian';
const G = (zh, en) => [W, zh, en], N = (zh, en) => ['nar', zh, en];
const day = (L) => L.clock.day;
const roadshow = (L) => day(L) >= 11 && day(L) <= 12;
const building = (L) => hasProduct(L) || career(L).track === 'startup';

const P = {
  id: W, name: B('顾念', 'Gu Nian'), short: B('顾念', 'Gu Nian'), age: 29, sex: 'f', color: '#5f7f6e', avatar: ['gunian', 'c4', 'p5', 'c1'], voice: { pitch: 1.0, rate: 0.98 },
  role: B('科技投资人、战略顾问；一家早期基金的合伙人', 'Tech investor and strategist; a partner at an early-stage fund'),
  ambition: B('募一支自己的小基金，投那些真能让人过得更好的消费科技，而且投得久', 'Raise a small fund of her own and back consumer tech that makes people\'s lives genuinely better, for the long run'),
  how: "You are a partner at an early-stage fund upstairs in the AIA Building. You met him in its lobby after office hours: a start-up's fall-detection camera you were testing kept reporting a fall every time someone sat down, you asked him to sit on the sofa for it, and in a minute he told you what was wrong with it.",
  address: B('纪白', 'Ji Bai'),
  card: "Gu Nian (顾念), 29, Shanghai-born, grew up in a lane in Jing'an (her mother is a retired maths teacher); computer science at Fudan, two years as a product manager at a Shenzhen hardware company, an MBA abroad at INSEAD; now the youngest partner at a small early-stage fund with offices upstairs in the AIA Building on the Bund, investing in early-stage innovation, consumer tech and new lifestyle ventures; from spring she leaves to raise a small fund of her own, Slow Tide Capital (慢潮资本), with two rooms upstairs from the Yangpu riverside makerspace: consumer tech for how people actually live, the old, the lonely, the overworked; her line: 投资的不只是项目，也是人，以及一个更大的可能 (you never invest in a project alone, but in people, and in a larger possibility); intelligent, rational, strategic and quick in a pitch, values long-term, meaningful impact over a fast exit, empathetic about the people a product is for, fiercely independent; emotionally reserved: in love she is slower and less sure of herself than in the boardroom, and shows care by paying attention rather than saying it; she will never invest in a man she is seeing (she would have to declare it to her own investors, and he would get her money instead of her honest opinion), but she will tell him plainly what is wrong with his work; knows his friend Lu Mingxuan slightly, as a junior analyst at another fund; ended a six-year relationship two years ago without a quarrel and has no interest in being anyone's option; lives alone in Xuhui; writes in full sentences with punctuation; cream blazers, pearl earrings, a slim leather watch; one flat white a day, at one o'clock, at the Manner on Hankou Road",
  arc: {
    1: B('在一家小型早期基金做合伙人，办公室在友邦大楼楼上。这一季听了四十个路演，一个都没投。', 'A partner at a small early-stage fund upstairs in the AIA Building. Forty pitches this quarter, and she has backed none of them.'),
    2: B('她跟合伙人们摊牌了：她要出来，自己募一支基金。办公室看好了，在杨浦滨江，创客空间楼上。', 'She has told her partners she is leaving to raise a fund of her own. She has found the office: on the Yangpu riverside, upstairs from the makerspace.'),
    3: B('五月出去路演：香港、新加坡、北京，三周见二十六个出资人。晚上都在改材料。', 'In May she takes the fund on the road: Hong Kong, Singapore, Beijing, twenty-six investors in three weeks. She rewrites the deck every evening.'),
    4: B('首关两亿。“慢潮资本”挂了牌；第一笔投资，是那台当初分不清坐下和摔倒的摄像头。', 'First close: two hundred million yuan. Slow Tide Capital has its sign up, and its first investment is the camera that once couldn\'t tell sitting from falling.'),
    5: B('她的日子是定的。她在等他说他的。', 'Her life is settled. She is waiting to hear his.'),
  },
  schedule(L) {
    const m = tod(L);
    if (m >= H(23) || m < H(6, 45)) return { spot: null, doing: B('睡了（她十一点睡）', 'asleep (she sleeps at eleven)'), free: false };
    if (m >= H(13) && m < H(13, 40)) return { spot: 'manner', doing: B('在汉口路的 Manner 窗口边，喝她每天那杯澳白', 'by the Manner window on Hankou Road with her one flat white of the day'), free: true };
    if (roadshow(L) && m >= H(19)) return { spot: null, doing: B('在家改募资材料（这几天不太看手机）', 'at home rewriting her fund\'s deck (she barely looks at her phone these days)'), free: false };
    if (day(L) <= 8 && between(L, H(18, 20), H(20, 40))) return { spot: 'aiaLobby', doing: B('在友邦大楼的大堂里，趁楼里下了班，试一个创业项目的样机', 'in the AIA Building lobby now the offices have emptied, trying out a start-up\'s prototype'), free: true };
    if (m >= H(8, 30) && m < H(18)) return { spot: null, doing: day(L) >= 13 ? B('在杨浦的慢潮资本，或者在外面见创始人', 'at Slow Tide\'s office in Yangpu, or out meeting founders') : B('在友邦大楼楼上的基金，或者在陆家嘴听路演', 'at the fund upstairs in the AIA Building, or hearing pitches in Lujiazui'), free: true };
    return { spot: null, doing: B('在家，桌上摊着一摞商业计划书', 'at home with a stack of business plans on the table'), free: true };
  },
  memories: {
    'g-aia': B('下了班的友邦大楼大堂里，一台创业公司的跌倒监测摄像头，把每个坐下的人都报成了“跌倒”。她请他坐下试一次，它把他也报成了跌倒。', 'In the AIA Building lobby after hours, a start-up\'s fall-detection camera was reporting a fall every time someone sat down. She asked him to sit down for it, and it reported him too.'),
    'held-tape': B('他什么都没问，先走过去替她坐了下来。', 'He asked nothing, just went over and sat down for her.'),
    'g-manner': B('中午一点在汉口路的 Manner，她说创始人把光线问题叫作“边缘情况”，然后直接问他：你自己怎么想？', 'One o\'clock at the Manner on Hankou Road: she told him the founder had called the light problem an edge case, then asked him straight out what he himself wanted.'),
    'same-building': B('他问她，怎么分辨一个好的创始人和一场好的路演。她说：看演示坏掉的时候他做什么。大多数人解释，少数人去修。', 'He asked her how she tells a good founder from a good pitch. She said: watch what he does when the demo breaks. Most explain. A few go and fix it.'),
    'told-year': B('他告诉她：他想留在上海，但还拿不出能说服父亲的东西。', "He told her he wants to stay in Shanghai but doesn't yet have anything that would convince his father."),
    'g-cruise': B('她在上海住了二十九年，第一次坐黄浦江的游船，是和他。下船的时候是日落。', 'After twenty-nine years in Shanghai she took the river cruise for the first time, with him. They came ashore at sunset.'),
    'honest-mess': B('他说实话：他这一年很乱，怕耽误她。她说，乱可以，瞒不行。', "He told her the truth: his year is a mess and he's afraid of wasting her time. She said a mess she can take; hiding it she can't."),
    'g-night': B('晚上在江边，她带他按她的方式看陆家嘴：每一扇亮着的窗，都是有人下的一个注。她说别把他做的东西拿给她看，然后问他十一月以后人在哪儿。', 'One night by the river she showed him Lujiazui her way: every lit window is somebody\'s bet. She asked him not to show her what he builds, then asked where he would be after November.'),
    'tell-first': B('他答应她：不管去哪儿，先告诉她，不是事后。', 'He promised her: wherever he ends up, he tells her first, not after.'),
    'said-shanghai': B('他说：十一月以后，他在上海。', 'He said that after November he will be in Shanghai.'),
    'studio-first': B('杨浦那两间要做她基金办公室的屋子，他是第一个看到的人。就在他工作台的楼上。', 'He was the first to see the two rooms in Yangpu that would be her fund\'s office, right above his bench.'),
    'g-key': B('她的基金首关了。她破例去了爵士吧，把家里的第二把钥匙放在了桌上。不是办公室的。', 'Her fund made its first close. She made an exception and went to the Jazz Bar, and put the second key to her flat on the table. Not the office key.'),
    'the-key': B('他收下了她家的钥匙。规矩只有一条：有事当面说。', 'He took the key to her flat. There is one rule: if something is wrong, say it to her face.'),
    'gunian-night': B('有一晚她没有回徐汇。', 'One night she did not go home to Xuhui.'),
    'her-notes': B('他把材料发给了她。她回了四页意见，最后一句是：我不投，别问；第六页重写。', 'He sent her his deck. She sent back four pages of notes, ending: I\'m not investing, don\'t ask; rewrite page six.'),
    'asked-money': B('他问她会不会投他。她说不会：他们这样的时候不会，作为人情也永远不会。', 'He asked whether she would invest in him. She said no: not while they were like this, and never as a favour.'),
  },
  lines: {
    accept: B('好。到时候见。', 'Good. See you then.'), decline: B('好。那下次。', 'All right. Another time.'), missed: B('你没有回，我就当是不方便。', "You didn't answer, so I took it that it wasn't convenient."),
    stood: B('我等了一个小时。你可以不来，但要说一声。我不喜欢猜。', "I waited an hour. You're free not to come, but tell me. I don't like guessing."),
    quiet: B('我问过两次了，不会问第三次。你想见我的时候，知道我在哪儿：每天一点，汉口路。', "I've asked twice and I won't ask a third time. If you want to see me you know where I am: one o'clock, Hankou Road, every day."),
    left: B('纪白，我想过了。我要的是一个知道自己在哪儿的人。你还不是。这不是你的错，但我不等了。祝你那顿饭顺利。', "Ji Bai, I've thought it through. I want someone who knows where he stands. You don't yet. That's no fault of yours, but I've stopped waiting. I hope the dinner goes well."),
    twoGone: B('我听说了，你还在见别人。上海很小，知道这些事本来就是我的工作。我不比较，也不竞争。祝你好。那台摄像头，你当初说得对，这一点不变。', "I've heard you're seeing someone else as well. Shanghai is small, and knowing things is my job. I don't compare and I don't compete. I wish you well. You were right about that camera. That much doesn't change."),
    ended: B('好。谢谢你告诉我，没有让我猜。', 'All right. Thank you for telling me, and not leaving me to guess.'),
    fight: B('我看见了。我不问谁先动的手。我只说一遍：我不跟用拳头解决事情的人在一起。', "I saw. I'm not asking who started it. I'll say this once: I don't stay with people who settle things with their fists."),
    heard: B('明轩说你跟人动手了。你没事就好。……但我想听你自己说是怎么回事。', "Mingxuan says you were in a fight. I'm glad you're all right. ...But I'd like to hear from you what happened."),
    online: B('有人把你的视频转给我了。我没看完。你想说的时候再说。', "Someone forwarded me a video of you. I didn't watch to the end. Tell me about it when you want to."),
    hurt: B('你受伤了。去过医院没有？没有的话，现在去。我可以陪你。', "You're hurt. Have you been to a hospital? If not, go now. I can come with you."),
    onesided: B('我发现每次都是我先找你。我不介意先开口，但我想知道你是不是也想找我。', "I notice it's always me who gets in touch first. I don't mind speaking first, but I'd like to know whether you want to find me too."),
    yes: B('可以。', 'Yes, I can.'), busy: B('这周四上投委会，我在写备忘录。下周三以后可以。', "Investment committee on Thursday, and I'm writing the memo. After next Wednesday I can."), mood: B('我现在不太想见面。等我想清楚再找你。', "I'd rather not meet just now. I'll find you when I've thought things through."), away: B('我在深圳，陪一家投过的公司看工厂，周末回。', "I'm in Shenzhen, walking a factory floor with one of our companies. Back at the weekend."), later: B('等我忙完这一阵，好吗？', 'When this stretch is over, all right?'),
    hello: B('你来了。等我把这口喝完。', "You came. Let me finish this."),
    morning: B('她七点就起了。你桌上摊着工作台的笔记本，她合上了，没有翻。留了张便条：九点投委会，我先走。本子我没看，以后也不会。钥匙在老地方。', "She was up at seven. Your bench notebook was lying open on the desk; she closed it without reading it. A note: Investment committee at nine, I've gone ahead. I didn't read your notebook and I never will. The key's in the usual place."),
    career: {
      resigned: B('辞职了。你想清楚了就好。下一步是什么，想好了告诉我，没想好也告诉我。', "You've resigned. Good, if you've thought it through. Tell me what's next when you know. Tell me if you don't know, too."),
      laidoff: B('我听说了。我们这行，这种消息总是先到。这不是你的问题。今晚来吃饭，我做。', "I heard. In my line of work that kind of news arrives first. It isn't your doing. Come for supper tonight. I'll cook."),
      startup: B('自己做公司。好。两件事。第一，我不投你，我们这样的时候不投，别问。第二，材料还是发我。出资人会挑哪些刺，我先挑给你听。', "Your own company. Good. Two things. One: I won't invest in you, not while we're like this, so don't ask. Two: send me the deck anyway. Whatever investors will pick at, you'll hear it from me first."),
      family: B('你决定回南京了。谢谢你告诉我。高铁一个小时。我算过了。', "So you've decided on Nanjing. Thank you for telling me. It's an hour by train. I've worked it out."),
      switched: B('换了公司。offer 发我看看，条款我天天读。', 'A new firm. Send me the offer. I read terms for a living.'),
    },
    canned: { zh: ['在开投委会。晚点回你。', '好。', '我想一下再回答你。', '你吃饭了吗？'], en: ["In investment committee. I'll answer later.", 'All right.', 'Let me think before I answer that.', 'Have you eaten?'] },
  },
  dates: {
    'g-cruise': { hm: [16, 0], tomorrow: true, needs: 'g-manner', days: [1, 10], title: B('黄浦江游船', 'The river cruise'), place: B('外滩 · 游船码头', 'The Bund · the cruise pier'), text: B('下午四点有空吗？我在上海住了二十九年，没坐过黄浦江的游船，嫌它太游客。正好在看一个做游船票务的项目，想从乘客这边看看。这是一半的理由。码头在江边南头。', "Are you free at four in the afternoon? Twenty-nine years in Shanghai and I've never taken the river cruise: too touristy. I'm looking at a start-up that sells the tickets, and I'd like to see it from the passenger's side. That's half the reason. The pier is at the south end of the promenade."), yes: B('好，四点码头见。', 'Yes. Four, at the pier.'), no: B('那天下午不行。', "I can't that afternoon.") },
    'g-night': { hm: [20, 30], needs: 'g-cruise', days: [2, 13], title: B('对岸的灯', 'The lights across the river'), place: B('外滩 · 海关大楼对面的栏杆', 'The Bund · the railing opposite the Customs House'), text: B('八点半，海关大楼对面。我带你看陆家嘴，按我的方式看。', "Half past eight, opposite the Customs House. I'll show you Lujiazui, the way I see it."), yes: B('好。', 'Yes.'), no: B('那晚不行。', "I can't that evening.") },
    'g-key': { title: B('首关', 'First close'), place: B('和平饭店 · 爵士吧', 'Peace Hotel · the Jazz Bar'), text: B('今晚九点，你楼下的爵士吧。我不太去酒吧，今天例外。', "Nine tonight, the Jazz Bar downstairs from you. I don't go to bars. Tonight is an exception."), yes: B('我订位。', "I'll book the table."), no: B('今晚不行。', 'Not tonight.') },
  },
  beats: [
    // Mingxuan, the morning after (in his own chat): she asked him who Ji Bai is
    { id: 'g0', urgent: true, when: (L) => dayAfter(L, W, 'g-aia', 9, 40), run: (L) => { if (L.threads.xuan) post(L, 'xuan', { from: 'xuan', kind: 'text', text: t('顾念刚加我微信，问你是谁。顾念！友邦楼上那家基金的合伙人，去年否了我们两个项目，两个都被她说中了。兄弟，你到底对她做了什么？', 'Gu Nian just added me on WeChat to ask who you are. GU NIAN. The partner at the fund upstairs in the AIA Building. She turned down two of our deals last year and was right both times. Bro, what did you do to her?') }); } },
    { id: 'g1', when: (L) => afterBeat(L, 'g0', 150), until: (L) => afterBeat(L, 'g0', 1440 * 3), if: (L) => !done(L, 'g-manner'), run: (L) => say(L, W, '昨天谢谢你替我坐下。汉口路那家 Manner，我每天一点在。今天也在。', "Thank you for sitting down for me yesterday. I'm at the Manner on Hankou Road at one every day. Today as well.") },
    { id: 'g2', when: (L) => (done(L, 'g-manner') ? Math.max(done(L, 'g-manner') + 300, D(Math.floor(done(L, 'g-manner') / 1440), 20, 30)) : null), until: () => D(10, 12, 0), run: (L) => askOut(L, W, 'g-cruise', P.dates['g-cruise'], D(day(L) + 1, 16, 0)) },
    { id: 'g3', when: (L) => dayAfter(L, W, 'g-cruise', 21, 30, 0), run: (L) => say(L, W, '回去以后，我把你那天说的问题转给了那个创始人。他半夜回我：这人是谁？我说：一个住在和平饭店楼上、不收钱的人。', 'After we parted I sent the founder what you had said about his camera. He replied at midnight: who is this? I said: a man who lives above the Peace Hotel and doesn\'t charge.', [
      R('下次演示再坏，叫我。我去坐沙发。', "Next time a demo breaks, call me. I'll come and sit on the sofa.", { a: 3, t: 2 }, '你已经是我用过最好的测试员了。也是最便宜的。', "You're already the best tester I've ever had. And the cheapest."),
      R('你会投他吗？', 'Will you invest in him?', { t: 2 }, '还不会。如果他一个月里把它修好，而不是跟我解释它没坏，我就投。我投会修的人，不投会解释的人。', "Not yet. If he fixes it within a month, instead of explaining to me that it isn't broken, then yes. I back people who fix things, not people who explain them."),
    ]) },
    { id: 'g4', when: (L) => { const c = done(L, 'g-cruise'); return c ? Math.max(D(7, 20, 0), D(Math.floor(c / 1440) + 1, 20, 0)) : null; }, until: () => D(10, 12, 0), run: (L) => askOut(L, W, 'g-night', P.dates['g-night'], D(day(L) + 1, 20, 30)) },
    { id: 'g5', when: () => D(9, 21, 30), until: () => D(10, 22, 0), if: (L) => inLife(L, W) && heart(L, W).stage !== 'known', run: (L) => say(L, W, '我跟合伙人们说了：我要出来，自己募一支基金。办公室看好了，杨浦滨江一个老厂房的楼上，楼下就是创客空间。不是请你帮忙搬东西。是想让你第一个看。', "I've told my partners: I'm leaving to raise a fund of my own. I've found the office, upstairs in an old factory on the Yangpu riverside, right above the makerspace. I'm not asking you to carry anything. I'd like you to be the first to see it.", [
      R('我来看。', "I'll come and look.", { a: 3, t: 4, mem: 'studio-first' }, '那我多买一份生煎。……你的工作台就在楼下，这件事我想过。要么很方便，要么是个坏主意。到时候看。', "Then I'll buy an extra box of shengjian. ...I know your bench is downstairs. I've thought about that. It's either very convenient or a very bad idea. We'll see."),
      R('这周末要加班。', "I'm working this weekend.", { t: -1 }, '好。那下次。', 'All right. Next time.'),
    ]) },
    { id: 'g6', urgent: true, when: () => D(11, 12, 10), until: () => D(11, 18, 30), if: (L) => inLife(L, W), run: (L) => say(L, W, '下个月出去路演：香港、新加坡、北京，三周见二十六个出资人。这之前我晚上都在改材料，不太回消息。不是冷淡，是在募资。先跟你说一声。', "Next month I take the fund on the road: Hong Kong, Singapore, Beijing, twenty-six investors in three weeks. Until then I'm rewriting the deck every evening and slow to answer. It isn't coldness. It's fundraising. I wanted you to know beforehand.", [
      R('好好讲。回来第一顿饭我请。', "Go and win them over. The first dinner when you're back is on me.", { t: 3 }, '好。回来第一顿归你。', 'Good. The first dinner is yours.'),
      R('要不要先拿我练一遍？我演最难缠的那个出资人。', "Want to rehearse on me first? I'll play the worst investor in the room.", { a: 3 }, '……好。周四晚上，十分钟。别手下留情。', "...All right. Thursday evening, ten minutes. Don't go easy on me."),
    ]) },
    { id: 'g7', urgent: true, when: () => D(13, 18, 30), until: () => D(13, 20, 20), if: (L) => inLife(L, W), run: (L) => { say(L, W, '首关了。两亿，比我定的目标多两千万。', 'First close. Two hundred million yuan, twenty million more than I aimed for.'); if (heart(L, W).stage !== 'known') askOut(L, W, 'g-key', P.dates['g-key'], D(13, 21, 0)); } },
    // Act IV: what he builds is turning into a company. Her honest opinion, never her money
    { id: 'g10', when: () => D(14, 12, 40), until: () => D(14, 22, 0), if: (L) => inLife(L, W) && heart(L, W).stage !== 'known' && building(L), run: (L) => say(L, W, '明轩说，你在做的东西越来越像一家公司了。把材料发我。不是要投你，是想让你先从我这儿听到最难听的那部分。', "Mingxuan says what you're building is starting to look like a company. Send me your deck. Not so that I can invest: so that you hear the worst of it from me first.", [
      R('发你了。别手下留情。', "Sent. Don't go easy on me.", { t: 4, mem: 'her-notes' }, '四页意见，你自己看。最要紧的一条：第六页那个数字，你自己都不信，就别指望别人信。另外，我不投，别问。', "Four pages of notes. The one that matters: you don't believe the number on page six yourself, so don't expect anyone else to. And I'm not investing. Don't ask."),
      R('等它准备好了再给你看。', "I'll show you when it's ready.", { a: 1 }, '也对。出资人都是等东西准备好了才看的。我本来想当另一种人。', "Fair. Investors only see things once they're ready. I'd hoped to be the other kind of person."),
      R('你会投吗？', 'Would you invest?', { t: -2, mem: 'asked-money' }, '不会。我们这样的时候不会。真要投，我得先跟我的出资人报备我们俩的关系，到那时候你从我这儿拿到的是钱，不是实话。我更想给你后者。', "No. Not while we're like this. If I did, I'd first have to declare us to my own investors, and then what you'd get from me is money, not the truth. I'd rather give you the second."),
    ]) },
    { id: 'g8', when: () => D(15, 12, 30), until: () => D(15, 22, 0), if: (L) => inLife(L, W), run: (L) => say(L, W, '慢潮资本的第一笔投资签了：就是那台摄像头。他拿一百个真实家庭的晚上重新训练了模型，现在分得清坐下和摔倒了。他问我，当初是谁先指出问题的。我没告诉他。', "Slow Tide's first investment is signed: that camera. He retrained the model on evenings in a hundred real homes, and now it can tell sitting from falling. He asked me who first spotted the problem. I didn't tell him.", [
      R('为什么不告诉他？', "Why didn't you tell him?", { t: 2, a: 2 }, '因为那是你的事，不是我拿来做人情的。你哪天想认识他，我介绍。', "Because that's yours to tell, not mine to trade on. If you ever want to meet him, I'll introduce you."),
      R('恭喜，顾总。', 'Congratulations, Managing Partner Gu.', { a: 2 }, '别这么叫，听着像在开会。……算了，再叫一遍。', "Don't call me that. It sounds like a board meeting. ...Actually, say it again."),
    ]) },
    { id: 'g9', urgent: true, when: () => D(16, 20, 30), until: () => D(17, 12, 0), if: (L) => inLife(L, W) && heart(L, W).stage !== 'known', run: (L) => say(L, W, '下个月你跟你爸吃那顿饭。我问第二遍：之后，你人在哪儿？', "Next month is your dinner with your father. I'm asking a second time: afterwards, where will you be?", [
      R('上海。', 'Shanghai.', { t: 4 }, '好。我听见了。', 'Good. I heard that.'),
      R('可能是南京。但我每周回来。', 'Possibly Nanjing. But I would be back every week.', { t: 3 }, '高铁一个小时。我算过了。可以。', "It's an hour by train. I've worked it out. That can be done."),
      R('还不知道。', "I still don't know.", { t: -5 }, '……好。那我等到那天晚上。只等到那天晚上。', '...All right. Then I wait until that evening. Only until that evening.'),
    ]) },
  ],
  scenes: {
    'g-aia': { who: W, spot: 'aiaLobby', kind: 'help', label: B('一个在试摄像头的人', 'Someone testing a camera'), action: B('走过去', 'Go over'),
      on: (L) => heart(L, W).stage === 'stranger' && day(L) <= 8 && between(L, H(18, 20), H(20, 40)),
      script: (L) => [
        N('下了班，大堂的灯调暗了一半。一个穿米色西装的女人站在访客沙发旁边，手里的小摄像头隔一会儿就“嘀”一声。', "After hours the lobby lights are turned down by half. A woman in a cream blazer stands by the visitors' sofa, and the little camera in her hand beeps every so often."),
        G('不好意思——能帮我在那张沙发上坐一下吗？就是坐下，像平常那样。', 'Excuse me — would you sit down on that sofa for me? Just sit, the way you normally would.'),
        ask(L, W,
          A('（走过去坐下）', '(Go over and sit down.)', { t: 4, mem: 'held-tape' }, N('摄像头“嘀”了一声，屏幕上跳出红字：检测到跌倒。', 'The camera beeps. Red letters on its screen: FALL DETECTED.'), G('谢谢。今晚第十一次“跌倒”了。到现在为止，一个摔倒的人都没有。', "Thank you. That's the eleventh fall tonight. So far nobody has actually fallen.")),
          A('为什么？', 'Why?', { a: 2 }, G('这是给独居老人用的，人摔倒了会通知子女。创始人刚才在楼上演示得很完美。我想在更像普通人家的光线里再试一次。麻烦你。', "It's for old people who live alone: if they fall, it tells their children. The founder's demo upstairs was perfect. I wanted to try it again in light that's more like someone's home. If you would."), N('你坐下。摄像头“嘀”了一声：检测到跌倒。', 'You sit. The camera beeps: FALL DETECTED.'), G('第十一次了。到现在为止，一个摔倒的人都没有。', "That's the eleventh. So far nobody has actually fallen."))),
        ask(L, W,
          A('它是在亮堂堂的办公室里训练的吧。这么暗、这么暖的光，它没见过。', "It was trained in a bright office, wasn't it? It's never seen light this dim and this warm.", { t: 2, a: 2 }, G('他说在哪儿都能用。', 'He told me it works anywhere.'), G('……你的意思是，在他试过的地方都能用。', '...You mean it works anywhere he tried it.')),
          A('只看一两帧，坐下和摔倒是一样的。它得看前后那两秒。', 'In a frame or two, sitting down and falling look the same. It needs to watch the two seconds either side.', { t: 2, a: 2 }, G('这是我今晚听到的第一句有用的话。我跟创始人聊了两个小时。', "That's the first useful sentence I've heard all evening. And I had the founder for two hours."))),
        ...(owns(L, 'lidar') ? [G('你口袋里那个是激光雷达？哪家做的？……你自己？那我对你的意见更感兴趣了。', "Is that a LiDAR in your pocket? Who makes it? ...You do? Then I'm more interested in your opinion than I was a minute ago.")]
          : hasProduct(L) ? [G('你包里露出来的是个云台？握把是打印的。自己做的？……那你比楼上那位更有资格评价这台摄像头。', "Is that a gimbal in your bag? The grip's printed. Your own? ...Then you're better placed to judge this camera than the man upstairs.")] : []),
        ask(L, W,
          A('我是纪白，在陆家嘴做咨询。', "I'm Ji Bai. I'm a consultant in Lujiazui.", { t: 3 }, G('顾念。我做早期投资，这是我在看的一个项目。……做咨询的人一般只告诉我问题有多大，不告诉我出在哪儿。你是例外。', "Gu Nian. I make early-stage investments; this is a company I'm looking at. ...Consultants usually tell me how big a problem is, not where it is. You're an exception.")),
          A('你是投资人，不是创始人？', "You're the investor? Not the founder?", { a: 2, t: 2 }, G('创始人一个小时前赶高铁走了。投资人，就是最后留下来抱着样机的那个。', 'The founder left an hour ago to catch a train. The investor is the one left holding the prototype.'), G('顾念。楼上那家基金的合伙人。你呢？陌生人让你坐下，你就坐下的那种人？', 'Gu Nian. A partner at the fund upstairs. And you? The kind of man who sits down when a stranger asks?'))),
        G('我每天一点在汉口路的 Manner。你要是路过，跟我说说你会怎么改它。咖啡我请，这不算投资。', "I'm at the Manner on Hankou Road at one every day. If you're passing, tell me how you'd fix it. I'll buy the coffee. That doesn't count as an investment."),
      ] },
    'g-manner': { who: W, spot: 'manner', kind: 'outing', label: B('顾念', 'Gu Nian'), action: B('打个招呼', 'Say hello'),
      on: (L) => inLife(L, W) && !done(L, 'g-manner') && day(L) <= 10 && between(L, H(13), H(13, 40)),
      script: (L) => [
        G('你来了。我以为做咨询的人中午不出楼。', 'You came. I thought consultants never left the building at lunchtime.'),
        G('摄像头的事。我问了创始人光线的问题，他说那是“边缘情况”。可它要卖给的人，一大半就住在那种光里。', 'About the camera. I asked the founder about the light, and he called it an edge case. Most of the people it is meant for live in exactly that light.'),
        ask(L, W,
          A('所以你的工作，是决定该信哪个陌生人。', 'So your job is deciding which strangers to believe.', { a: 2, t: 2 }, G('差不多。他们都跟我说要改变世界。我得猜，等事情变得无聊以后，谁还在。', 'More or less. They all tell me they will change the world. I have to guess which of them will still be there once it gets boring.')),
          A('你怎么分辨一个好的创始人和一场好的路演？', 'How do you tell a good founder from a good pitch?', { t: 4, a: 2, mem: 'same-building' }, N('她想了一下。', 'She thinks.'), G('这个问题我问了自己六年。现在的答案是：看演示坏掉的时候他做什么。大多数人解释，少数人去修。', "I've asked myself that for six years. My answer today: watch what he does when the demo breaks. Most explain. A few go and fix it."))),
        G('轮到你。我问过陆明轩了，他说你家里有个厂，你爸等你回南京。你自己怎么想？', 'Your turn. I asked Lu Mingxuan about you. He says your family has a works in Nanjing and your father is waiting for you to come home. What do you think yourself?'),
        ask(L, W,
          A('我想留下。但我还拿不出能说服他的东西。', "I want to stay. But I don't yet have anything that would convince him.", { t: 6, mem: 'told-year' }, G('那就去做出来。光想清楚说服不了任何人。我从来没被一份计划书说服过，只被做出来的东西说服过。', "Then go and make it. Thinking it through never convinced anyone. I've never been won over by a business plan, only by things people actually built.")),
          A('还没想好。', "I haven't decided.", { t: 2 }, G('没想好可以。别假装想好了就行。我每天都在听人假装。', "Not having decided is fine. Just don't pretend you have. I listen to people pretending all day.")),
          A('我们才见第二面，你问得真直接。', "We've met twice. You're very direct.", { a: 2 }, G('我二十九了，每天要在四十分钟里判断一个人，没时间绕。你介意的话可以不答。', "I'm twenty-nine, and I spend my days making up my mind about people in forty minutes. I haven't time for the long way round. You needn't answer if you'd rather not."))),
        G('一点四十了，我两点有个路演。', "It's twenty to two. I have a pitch at two."),
      ] },
    'g-cruise': { who: W, spot: 'pier', kind: 'date', date: 'g-cruise', label: B('顾念', 'Gu Nian'), action: B('走过去', 'Go over'),
      on: (L) => dateOn(L, 'g-cruise'),
      script: (L) => [
        G('准时。我喜欢准时的人。', 'On time. I like people who are on time.'),
        ask(L, W,
          A('船票我买了。', "I've got the tickets.", (L2) => { const r = pay(L2, { method: 'wechat', amount: 240, to: '浦江游览', memo: '游船票 ×2', kind: 'purchase' }); if (r.ok) r.entry.memoEn = 'Cruise tickets ×2'; feel(L2, W, { trust: 2 }, 'tickets'); return [G('给我看看你是怎么买的。……点了四下。创始人跟我说是三下。', 'Show me how you bought them. ...Four taps. The founder told me three.'), G('晚饭我请。公平。', 'Then dinner is mine. Fair.')]; }),
          A('AA 吧？', 'Shall we split it?', (L2) => { const r = pay(L2, { method: 'wechat', amount: 120, to: '浦江游览', memo: '游船票', kind: 'purchase' }); if (r.ok) r.entry.memoEn = 'Cruise ticket'; feel(L2, W, { trust: 1 }, 'tickets'); return [G('AA。我喜欢账目清楚。', 'Split it. I like clean accounts.')]; })),
        { fade: B('游船绕了一圈，五十分钟。她指了一路，指的不是建筑，是钱：哪栋楼一九二几年是银行，对岸哪座塔十年里换了三个业主，哪一层是她投的第一家公司倒闭前的办公室。', 'The boat makes its loop: fifty minutes. She points the whole way, not at architecture but at money: which building was a bank in the 1920s, which tower across the river has had three owners in ten years, which floor held the first company she backed, before it went under.'), minutes: 55 },
        N('下船的时候，太阳刚落到外滩的楼后面，江面是铜色的。', 'When you step ashore the sun has just gone behind the Bund, and the river is the colour of copper.'),
        G('好吧，我承认，不丢人。从水上看才明白：这边是一百年前有人赌这座城市，对岸是三十年前有人赌。现在看两边都理所当然，当时都不是。', 'All right, I admit it: not embarrassing. From the water you see it. On this side people bet on this city a hundred years ago, over there thirty years ago. Both bets look obvious now. Neither was at the time.'),
        G('我跟你说件事，你听了别有压力。我之前谈过一段，六年。分的时候很平静，平静到我们俩都害怕。', "I'm going to tell you something, and I don't want it to weigh on you. I was with someone for six years. When it ended it was so calm it frightened us both."),
        G('工作上，我见两面就知道一家公司能不能走远。对一个人，我花了六年才看出来。所以我现在不猜：喜欢就说，不合适也说。', "At work, two meetings tell me whether a company will last. With him it took me six years. So I don't guess any more. If I like someone I say so. If it isn't right I say that too."),
        ask(L, W,
          A('那我也说：我想再见你。不是路过的那种。', "Then I'll say it too: I want to see you again. Not in passing.", { a: 5, t: 4, decide: 'step' }, N('她点点头，像在一份条款上签了字。', 'She nods, as if initialling a clause.'), G('好。那下次算约会。', 'Good. Then next time is a date.')),
          A('我这一年很乱。我怕耽误你。', "My year's a mess. I'm afraid of wasting your time.", { t: 5, a: -1, mem: 'honest-mess' }, G('谢谢你说实话。乱可以，瞒不行。我们慢一点。', "Thank you for being honest. A mess I can take. Hiding it I can't. We'll go slowly.")),
          A('（看着江，不说话）', '(Look at the river. Say nothing.)', null, G('不急。你想好了告诉我。', 'No hurry. Tell me when you know.'))),
        N('泛光灯亮了。她抬头看了一眼海关的钟，对了对手腕上那块细皮带的表。', 'The floodlights come on. She glances up at the Customs clock and checks it against the slim leather watch on her wrist.'),
      ] },
    'g-night': { who: W, spot: 'railCustoms', kind: 'date', date: 'g-night', label: B('顾念', 'Gu Nian'), action: B('走过去', 'Go over'),
      on: (L) => dateOn(L, 'g-night'),
      script: (L) => [
        G('看见对岸那两栋了吗？国金中心。我一半的白天在那里面听路演。晚上从这边看，每一扇亮着的窗，都是有人下的一个注。', 'See those two towers across the river? IFC. I spend half my days in there hearing pitches. From this side, at night, every lit window is somebody\'s bet.'),
        G('一百年前，银行都在我们身后这一排。后来钱过了江。钱每过几十年就换一次岸，留下来的是做事的人。', 'A hundred years ago the banks were all in this row behind us. Then the money crossed the river. Every few decades it changes banks. What stays are the people who build things.'),
        G('我喜欢这个行当，就是因为它不许你急。我投的东西，没有一个七年以内回本的。', "That's why I like this trade. It doesn't let you hurry. Nothing I've backed has paid back in under seven years."),
        ask(L, W,
          A('你也这样看人？', 'Is that how you look at people too?', { a: 3 }, G('看人更慢。不过你，我的尽调做得差不多了。', "People take longer. Though I've nearly finished my due diligence on you.")),
          A('我的行当正相反，慢一个月就过时了。', "Mine's the opposite. A month late and you're obsolete.", { t: 2 }, G('所以你需要一样不会过时的东西。……比如一家想做得久的公司。或者一个人。', "Then you need something that doesn't go out of date. ...A company meant to last, say. Or a person."))),
        G('还有一件事，我想先说清楚。明轩说你晚上在杨浦做东西。别拿给我看，至少现在别。我要是喜欢它，就会想投；我要是喜欢你，就不能投。', "One more thing, and I'd rather say it now. Mingxuan says you build things at night in Yangpu. Don't show me. Not yet. If I like it I'll want to invest in it, and if I like you, I can't."),
        G('我问你个实在的。十一月你跟你爸吃完那顿饭，人在哪儿？上海，还是南京？', 'A practical question. In November, after that dinner with your father, where will you be? Shanghai or Nanjing?'),
        ask(L, W,
          A('上海。', 'Shanghai.', { t: 3, mem: 'said-shanghai' }, G('好。我记下了。到时候我会问你第二遍。', "Good. I've made a note. I'll ask you again when the time comes.")),
          A('我不知道。但不管在哪儿，我会先告诉你，不是事后。', "I don't know. But wherever it is, I'll tell you first, not after.", { t: 8, mem: 'tell-first' }, N('她看着你。', 'She looks at you.'), G('这比“上海”好。我要的就是这个。', 'That\'s better than "Shanghai". That is what I was asking for.')),
          A('现在说这个太早了吧。', "It's a bit early for that, isn't it?", { t: -3 }, G('不早。我不想到了十一月，才发现自己是个备选。', "It isn't early. I don't want to find out in November that I was a fallback."))),
        N('她把米色的围巾解下来一半，绕到你脖子上。“江边风大。你那件外套不够。”', 'She unwinds half her cream scarf and puts it round your neck. "It\'s windy by the river. That jacket isn\'t enough."'),
        ask(L, W,
          A('（握住她的手）', '(Take her hand.)', { a: 5, decide: 'step' }, G('……手是凉的。我的也是。扯平。', "...Your hand is cold. So is mine. We're even.")),
          A('谢谢。', 'Thank you.', { t: 1 }, G('不客气。', "You're welcome."))),
      ] },
    'g-key': { who: W, spot: 'jazzTable', seat: true, kind: 'date', date: 'g-key', pass: 70, label: B('顾念', 'Gu Nian'), action: B('坐下', 'Sit down'),
      on: (L) => dateOn(L, 'g-key'),
      script: (L) => [
        G('我不太来这种地方。今天例外：从今天起，慢潮资本是真的了。我可以用自己的名字签投资协议了。', "I don't usually come to places like this. Today is an exception: as of today Slow Tide Capital is real. I can sign a term sheet in my own name."),
        ask(L, W,
          A('顾总。', 'Managing Partner Gu.', { a: 3 }, N('她笑了。', 'She laughs.'), G('再叫一遍。', 'Say that again.')),
          A('慢潮？为什么叫这个名字？', 'Slow Tide? Why that name?', { t: 3 }, G('出资人都嫌它不吉利，说钱要快。我说，潮水是慢，可它每天都来。我要投的就是这种东西。', 'My investors hate it. They say money should be quick. I told them the tide is slow, but it comes in every day. That is the kind of thing I want to back.'))),
        G('还有一件事。我多配了一把钥匙。', 'One more thing. I had a second key cut.'),
        N('她把钥匙放在桌上，没有推过来。', "She puts the key on the table. She doesn't push it across."),
        G('不是办公室的。那一把你永远拿不到，你知道为什么。这是我家的。', "Not to the office. You'll never have that one, and you know why. This one is my flat."),
        ask(L, W,
          A('（拿起钥匙）我收下。', "(Pick up the key.) I'll take it.", { t: 6, a: 4, mem: 'the-key', decide: 'commit' }, G('……好。', '...Good.'), G('规矩只有一条：有事当面说。', "There's only one rule: if something is wrong, say it to my face.")),
          A('念念，我还没准备好。', "Niannian, I'm not ready yet.", { t: 3, decide: 'slow' }, N('她把钥匙收了回去，很平静。', 'She takes the key back, quite calmly.'), G('好。它不会过期。但我不会一直问。', "All right. It doesn't expire. But I won't keep asking.")),
          A('太快了吧。', "Isn't this rather fast?", { a: -3, t: -2 }, G('大半年了，不快。……算了。当我没拿出来。', "It's been the best part of a year. It isn't fast. ...Never mind. Forget I took it out."))),
        ask(L, W,
          A('今晚别回徐汇了。', "Don't go back to Xuhui tonight.", upstairs(W, [G('……我明早九点要上投委会。闹钟你来定。', '...I have investment committee at nine. You set the alarm.')], [G('今天不。我想慢一点。', 'Not tonight. I want to go slowly.')])),
          A('我送你上车。', "I'll see you into a car.", { t: 2 }, G('好。到家告诉你。', "Thank you. I'll tell you when I'm home."))),
      ] },
  },
  events: {},
  end() { return null; },
  epilogue(L, h) {
    const c = L.flags.dinnerChoice;
    if (h.stage === 'together') return c === 'home' ? B('顾念算过了：南京到上海，高铁一个小时。每个周五晚上，她在虹桥站的出口等你，手里拿着两杯澳白。', "Gu Nian had worked it out: Nanjing to Shanghai is an hour by train. Every Friday evening she waits at the Hongqiao exit with two flat whites.")
      : B('那天晚上顾念在和平饭店的八角厅里等你，没有问结果，先看了看你的脸。她家的钥匙还在你口袋里。', "That night Gu Nian was waiting in the octagon hall of the Peace Hotel. She didn't ask how it had gone. She looked at your face first. The key to her flat is still in your pocket.");
    if (h.stage === 'dating') return B('慢潮资本在杨浦挂了牌。那把钥匙还在她抽屉里。她说过，它不会过期。', 'Slow Tide Capital has its sign up in Yangpu. The second key is still in her drawer. It doesn\'t expire, she said.');
    if (h.stage === 'over' && h.over && h.over.why === 'two-timed') return B('有很久，明轩在你面前不再提顾念。有一次话到嘴边，他又咽了回去。', "For a long time Mingxuan doesn't mention Gu Nian around you. Once he starts to, and then thinks better of it.");
    if (h.stage === 'over' && h.over && ['dating', 'together'].includes(h.over.was)) return B('每天下午一点，汉口路的 Manner 窗口边还是站着一个喝澳白的人。你没有再走过去。', "At one every afternoon someone still stands by the Manner window on Hankou Road with a flat white. You haven't walked over again.");
    return null;
  },
};
export default P;
