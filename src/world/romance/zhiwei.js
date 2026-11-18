// 许知微 Xu Zhiwei, 28, 178 cm: a product and industrial designer (Character Bible F01, LOCKED), who
// leads product design on his first engagement at the firm and runs its delivery (her employer is
// WORKING: the firm is the game's choice, not the Bible's). Cool and uncompromising: she judges a
// thing by whether people can actually use it, on a screen or in the hand. Workplace chemistry,
// rivalry, trust, and what a career costs. Her face is the F01 Approved Hero (docs/zhiwei-reference.jpg). (Her scenes in the office itself belong to the office;
// here are her messages, the hours after work, and the two of them.)
//   Act I    she sizes him up: the pass and laptop in the Peace Hotel lobby, the kickoff, the
//            weekly report he can write for her or not, a drink she owes him at the Jazz Bar
//   Act II   the credit she let the partner give her; one senior-manager slot between them; ten
//            minutes by the river and her rule about colleagues; the ratings in March
//   Act III  the list; what his own road does to hers
//   Act IV   Singapore wants her for two years
//   Act V    she goes, or stays, or goes with something agreed between them
import { stamp } from '../../engine/life.js';
import { heart, inLife, shared, feel, leave, meet } from '../../engine/hearts.js';
import { fact, actOf, isWorkday, career, standing } from '../../engine/year.js';
import { hasProduct } from '../../engine/studio.js';
import { B, D, H, tod, say, R, A, ask, askOut, fired, done, dateOn, upstairs, recalls, openThread } from './kit.js';

const W = 'zhiwei';
const Z = (zh, en) => [W, zh, en], N = (zh, en) => ['nar', zh, en];
const said = (L, k) => !!(heart(L, W).said || {})[k];

const P = {
  id: W, name: B('许知微', 'Xu Zhiwei'), short: B('知微', 'Zhiwei'), age: 28, sex: 'f', color: '#3d5a80', avatar: ['c4', 'c1'], height: 1.78, voice: { pitch: 1.02, rate: 1.1 },
  role: B('产品与工业设计师；他第一个项目的设计负责人，交付也是她带', 'Product and industrial designer; design lead on his first engagement, and she runs its delivery'),
  ambition: B('三十岁之前升高级经理，然后是合伙人', 'Senior manager before thirty; then partner'),
  how: 'You are a product and industrial designer, the design lead on his first engagement at the firm, and you run its delivery; he was hired from Silicon Valley at nearly your level, which you noticed. You have a rule about not getting close to colleagues.',
  address: B('纪白', 'Ji Bai'),
  card: 'Xu Zhiwei (许知微), 28, 178 cm, from Hangzhou; a product and industrial designer who judges digital products, physical objects and whether people can really use them in the same breath; studied industrial design at the China Academy of Art in Hangzhou (2016-2020) and joined the firm\'s product and design practice straight after, designing connected appliances and medical devices with their apps before moving onto enterprise AI; she and Ji Bai had never met before his first day; six years at the international technology consulting firm in Lujiazui where Ji Bai has just started, where she leads product design and runs delivery on his first engagement (an enterprise AI rollout for a large client); not a brand or visual creative director; her standards are her own and sharp, and she does not bend them to please a partner, a client or Ji Bai; still sketches objects (a hinge, a handle, a stool) in the margins of every deck; wants senior manager this cycle and partner after that, and her sponsor is the partner, Raymond He; cool, uncompromising, fast, dry, guarded, fair when it costs her; short light ash-blonde layered hair with dark roots, thin silver metal-frame glasses, black knitwear, silver rings, headphones round her neck on the way home; competitive with Ji Bai because he was hired from Silicon Valley at nearly her level; lives alone in a rented flat off Yuyuan Road and crosses the river on Line 2; her mother in Hangzhou sends her the CVs of suitable men; texts in short sentences with no emoji and the English work words Lujiazui uses (kickoff, deck, deadline)',
  arc: {
    1: B('带着八个月的客户，突然多了一个硅谷回来的“同级”。', 'Eight months into running the account, and suddenly a "peer" from Silicon Valley on her team.'),
    2: B('今年高级经理只有一个名额。评级在三月。', 'One senior-manager slot this year. Ratings in March.'),
    3: B('公司在裁人，她在名单的另一边：她是报名单的人。', 'The firm is cutting people, and she is on the other side of the list: she helps write it.'),
    4: B('新加坡办公室要她去带亚太的 AI 业务，两年。', 'The Singapore office wants her to run AI for Asia-Pacific. Two years.'),
    5: B('十二月，走还是不走。', 'December: go, or not.'),
  },
  schedule(L) {
    const m = tod(L), a = actOf(L);
    if (m >= H(23, 40) || m < H(7)) return { spot: null, doing: B('睡了', 'asleep'), free: false };
    if (isWorkday(L) && m >= H(9) && m < H(19, 30)) return { spot: 'office', doing: B('在陆家嘴的办公室，一个会接一个会', 'at the office in Lujiazui, in back-to-back meetings'), free: false };
    if (isWorkday(L) && m >= H(19, 30) && m < H(20, 10)) return { spot: null, doing: B('在二号线上，回浦西', 'on Line 2, heading back to Puxi'), free: true };
    if (a && a.n === 3) return { spot: null, doing: B('在家，对着一张她不想看的名单', 'at home, with a list she would rather not be reading'), free: true };
    return { spot: null, doing: B('在愚园路的家里，电脑还开着', 'at home off Yuyuan Road with the laptop still open'), free: true };
  },
  memories: {
    'z-lobby': B('第一晚，她顺路把门禁卡和电脑送到和平饭店大堂，把话说在了前头：对外的口径先过她。', 'The first night she brought his pass and laptop to the Peace Hotel lobby on her way home, and set the terms: anything going outside goes through her first.'),
    'slide-seven': B('他当面指出了第七页数据口径的错，她当晚改了。', 'He told her to her face that slide seven was wrong. She fixed it that night.'),
    'covered-report': B('她母亲突然来上海那晚，他替她写了客户周报。客户回了两个字：“清楚”。', "The night her mother turned up in Shanghai, he wrote the client's weekly report for her. The client replied with one word: \"Clear.\""),
    'z-drink': B('周五晚上，她在爵士吧请了他一杯，说是还人情，还说了她不跟同事走太近的规矩。', 'A Friday night: she bought him a drink at the Jazz Bar, to pay a debt, and told him her rule about colleagues.'),
    'told-year': B('他告诉了她：父亲给了他一年。', 'He told her his father has given him a year.'),
    'credit-row': B('她让合伙人以为他的评估模型是她做的，然后自己来说了。他没有轻轻放过。', "She let the partner think his evaluation model was hers, then came and said so herself. He didn't let it pass lightly."),
    'credit-fixed': B('她让合伙人以为他的评估模型是她做的，然后自己来说了，把他的名字写回了第一页。', "She let the partner think his evaluation model was hers, then came and said so herself, and put his name back on page one."),
    'z-river': B('加班以后在江边走了十分钟，对岸是他们公司的楼。高级经理只有一个名额，他们俩都在名单上。', "Ten minutes by the river after a late night, their firm's tower across the water. One senior-manager slot, and both of them on the list."),
    'z-night': B('评级出来那晚，她升了高级经理，在爵士吧请他喝酒。', 'The night the ratings came out and she made senior manager, she bought the drinks at the Jazz Bar.'),
    'z-transfer': B('他说愿意调组，这样她就不用给男朋友打分。她去跟 HR 报备了。', "He offered to move teams so she wouldn't be reviewing her boyfriend. She declared it to HR."),
    'zhiwei-night': B('有一晚她没有回愚园路。', 'One night she did not go home to Yuyuan Road.'),
    'sg-go': B('新加坡的位置，他让她去。她说，正因为他没留她，她才信他。', "Singapore: he told her to go. She said that was why she believed him, that he hadn't asked her to stay."),
    'sg-stay': B('新加坡的位置，他开口留她。她说他不能替她决定，但会把这句话算进去。', "Singapore: he asked her to stay. She said he couldn't decide it for her, but she would weigh it."),
    'he-took-credit': B('她的工作，功劳记在了他名下。', 'Her work went down under his name.'),
    'shared-credit': B('他在人前把功劳分给了她。', 'In front of other people, he gave her her share of the credit.'),
    'covered-for': B('她出岔子的时候，他替她顶了一次。', 'When she slipped, he covered for her.'),
  },
  lines: {
    accept: B('好。别迟到。', "Good. Don't be late."), decline: B('行。', 'Fine.'), missed: B('没回就是不来。知道了。', 'No answer means no. Understood.'),
    stood: B('我等了四十分钟。纪白，我的时间也是按小时计费的。', 'I waited forty minutes. My time is billed by the hour too, Ji Bai.'),
    quiet: B('看来你很忙。我不问了。有事工作群里说。', "You're busy, evidently. I'll stop asking. Anything else can go in the project chat."),
    left: B('我们到此为止。周一见面，还是同事。——这一点我做得到，希望你也是。', "This is where we stop. On Monday we're colleagues. — I can manage that. I hope you can."),
    two: B('有人看见你和别人在一起。我不听传话，我问你本人：是不是？', "Someone saw you with another woman. I don't deal in hearsay. I'm asking you: is it true?"),
    chosen: B('……好。这件事翻篇。只有这一次。', '...All right. We close this. Once.'),
    ended: B('收到。周一见，纪顾问。', 'Received. See you on Monday, Consultant Ji.'),
    twoGone: B('那就这样。你的评估表我会交给别人写，对你公平一点。', "Then that's that. I'll have someone else write your review. It's fairer to you."),
    fight: B('今天的事我看见了。你到底是谁？白天写评估模型，晚上跟人动手？', 'I saw what happened today. Who are you, exactly? Evaluation models by day and fists by night?'),
    heard: B('听说你跟人动手了。客户那边要是知道，我保不住你。', "I hear you were in a fight. If the client hears of it, I can't protect you."),
    online: B('周一全组都在传那条视频。你自己处理，别让它进客户的群。', "The whole team was passing that video round on Monday. Deal with it. Keep it out of the client's chat."),
    hurt: B('脸怎么了？……明天的会你别上了，我替你讲。不是商量。', "What happened to your face? ...You're not presenting tomorrow. I'll do it. That isn't a suggestion."),
    onesided: B('发现了吗，每次都是我先找你。我不习惯这样。', "Have you noticed it's always me who writes first? I'm not used to that."),
    yes: B('可以。', 'All right.'), busy: B('这周排满了。下周再说。', 'This week is full. Ask me next week.'), mood: B('最近不想谈工作以外的事。', "I don't want to talk about anything but work at the moment."), away: B('在飞机上。落地回。', "On a flight. I'll answer when I land."), later: B('现在不是时候。过阵子。', 'Not now. Later.'),
    hello: B('你怎么在这儿。……算了，正好。', "What are you doing here? ...Never mind. As it happens, good."),
    morning: B('她早上六点走的。走之前，把你的闹钟调早了十分钟。', 'She left at six. Before she went she set your alarm ten minutes earlier.'),
    career: {
      resigned: B('辞职信我看到了。……你走了，我的规矩就管不着你了。这句话你自己琢磨。', "I've seen your resignation. ...Once you're gone my rule doesn't cover you. Think about that sentence."),
      laidoff: B('名单我争过，没争下来。对不起。这不是你的问题，是预算的问题。——推荐信我来写。', "I fought the list and lost. I'm sorry. It was the budget, not you. — I'll write your reference."),
      startup: B('自己做公司？……Raymond 说你疯了。我没说话。我其实有点羡慕。', "Your own company? ...Raymond says you've lost your mind. I said nothing. The truth is I rather envy you."),
      family: B('回南京接厂。也好。至少有人知道自己一年后在哪儿。', "Home to Nanjing and the works. Fair enough. At least one of us knows where he'll be in a year."),
      switched: B('跳槽了。行。下次在客户那儿碰到，我不会手软。', "So you've jumped ship. Fine. When we meet across a client's table I won't go easy."),
    },
    canned: { zh: ['在开会。晚点说。', '嗯。还有别的事吗？', '材料发我邮箱。', '知道了。'], en: ["In a meeting. Later.", 'Mm. Anything else?', 'Put it in an email.', 'Noted.'] },
  },
  dates: {
    'z-drink': { hm: [21, 0], days: [2, 10], title: B('下班后喝一杯', 'A drink after work'), place: B('和平饭店 · 爵士吧', 'Peace Hotel · the Jazz Bar'), text: B('周五晚上九点，你楼下那个爵士吧。我请。', "Friday, nine, the jazz bar downstairs from you. I'm buying."), yes: B('好。周五见。', 'OK. See you Friday.'), no: B('周五不行，改天。', "Friday's no good. Another time.") },
    'z-river': { hm: [22, 30], needs: 'z-drink', days: [7, 12], title: B('江边十分钟', 'Ten minutes by the river'), place: B('外滩 · 海关大楼对面的栏杆', 'The Bund · the railing opposite the Customs House'), text: B('十点半，江边，海关大楼对面。陪我走十分钟。', 'Half ten, the river, opposite the Customs House. Walk with me for ten minutes.'), yes: B('我下去。', "I'll come down."), no: B('今晚不行。', 'Not tonight.') },
    'z-night': { title: B('评级出来了', 'The ratings are out'), place: B('和平饭店 · 爵士吧', 'Peace Hotel · the Jazz Bar'), text: B('今晚十点，老地方。我请。', 'Ten tonight, the usual place. On me.'), yes: B('好。', 'OK.'), no: B('今晚不行。', 'Not tonight.') },
  },
  beats: [
    // ---- Act I ----
    { id: 'z1', first: true, urgent: true, work: true, when: () => D(1, 18, 10), until: () => D(2, 9, 0), run: (L) => { meet(L, W); openThread(L, W, P.name.zh); say(L, W, '纪白？我是许知微，你这个项目的设计负责人，交付也归我管。明早九点半客户 kickoff，材料发你邮箱了，今晚看完。', "Ji Bai? Xu Zhiwei. Design lead on your project, and delivery is mine too. Client kickoff at 9:30 tomorrow. The deck is in your inbox. Read it tonight.", [
      R('收到，今晚看完。', "Got it. I'll read it tonight.", { t: 2 }, '好。', 'Good.'),
      R('刚落地，时差还没倒过来。明早路上看行吗？', "I've only just landed and I'm jet-lagged. Can I read it on the way in?", { t: -2 }, '九点二十，楼下。别让我在客户面前替你翻页。', "9:20, downstairs. Don't make me turn your pages for you in front of the client."),
    ]); } },
    { id: 'z2', urgent: true, when: () => D(1, 20, 20), until: () => D(1, 21, 0), run: (L) => say(L, W, '你住和平饭店？我回浦西顺路，把门禁卡和电脑带给你。九点半之前我在大堂。', "You're at the Peace Hotel? It's on my way back to Puxi. I'll bring your pass and laptop. I'll be in the lobby until half nine.") },
    { id: 'z2b', urgent: true, when: () => D(1, 21, 35), until: () => D(2, 8, 0), if: (L) => !!fired(L, 'z2') && !done(L, 'z-lobby'), run: (L) => say(L, W, '东西放前台了。明早别迟到。', "I've left them at the front desk. Don't be late tomorrow.") },
    { id: 'z3', when: () => D(2, 21, 10), until: () => D(3, 12, 0), run: (L) => { say(L, W, '今天你讲数据流那一页，客户 CTO 追问了三次，你都接住了。不错。', "Your data-flow slide today: the client's CTO came back at you three times and you held. Not bad.");
      say(L, W, '别得意。', "Don't let it go to your head.", [
        R('没得意。倒是你，全场只有你敢打断他。', "I'm not. You, though: you were the only one in the room who dared cut him off.", { a: 3 }, '那是经验。打断他，他才当你是平等的。', "That's experience. Interrupt him and he treats you as an equal."),
        R('那页是昨晚临时改的。下次早点让我看材料。', 'I rebuilt that slide last night. Let me see the deck earlier next time.', { t: 2, a: 1 }, '……行。周四的我今晚发你。', "...Fine. I'll send you Thursday's tonight."),
        R('谢谢许总。', 'Thank you, boss.', { a: -1 }, '别叫许总。', "Don't call me boss."),
      ]); } },
    { id: 'z4', when: () => D(3, 19, 40), until: () => D(3, 23, 30), run: (L) => say(L, W, '帮个忙。明早八点要交客户周报，我妈今晚突然来上海，我得去虹桥接她。初稿你能替我写吗？就这一次。', "I need a favour. The client's weekly report is due at eight tomorrow, and my mother has turned up in Shanghai tonight without warning. I have to fetch her from Hongqiao. Could you write the first draft for me? Just this once.", [
      R('发我模板，十二点前给你。', "Send me the template. You'll have it by midnight.", { ev: 'z-covered' }, '……谢了。我欠你一次。', '...Thank you. I owe you one.'),
      R('我今晚也有安排。写一半行吗？', "I've got plans tonight too. Can I do half?", { t: 2 }, '一半也行。结构你搭，数我来填。', 'Half will do. You build the structure, I fill in the numbers.'),
      R('这是项目负责人的活。', "That's the lead's job.", { t: -5, a: -2 }, '知道了。当我没问。', 'Understood. Forget I asked.'),
    ], { ttl: 240 }) },
    { id: 'z5', when: () => D(4, 22, 0), until: () => D(5, 18, 0), run: (L) => {
      if (recalls(L, W, 'covered-report')) say(L, W, '周报我一个字没改就发了。客户回了两个字：“清楚”。他上一次夸人是去年。', 'I sent the report without changing a word. The client replied with one: "Clear." The last time he praised anyone was last year.');
      else say(L, W, '这周你没掉链子。我说话算话：新人撑过第一周，我请一杯。', "You didn't drop anything this week. I keep my word: a new hire who survives week one gets a drink.");
      askOut(L, W, 'z-drink', P.dates['z-drink'], D(5, 21, 0)); } },
    // ---- Act II ----
    { id: 'z6', urgent: true, when: () => D(7, 20, 10), until: () => D(8, 12, 0), run: (L) => { say(L, W, '今天给合伙人过方案，你做的那个评估模型，我说的是“我们组做的”。Raymond 以为是我做的，我没纠正。', "At the partner review today I called your evaluation model \"the team's work\". Raymond assumed it was mine. I didn't correct him.");
      say(L, W, '想了一晚上。还是该告诉你。', "I've thought about it all evening. You should hear it from me.", [
        R('下次汇报，把名字写上就行。', "Next review, put the name on it. That's all.", { ev: 'z-credit-fix' }, '周四的材料我已经改了。第一页，你的名字。', "I've already changed Thursday's deck. Page one. Your name."),
        R('你是来道歉，还是来通知我？', 'Are you apologising, or informing me?', { a: 2, t: 1, mem: 'credit-row' }, '……道歉。我不太会。', "...Apologising. I'm not good at it."),
        R('没事，项目是你带的。', "It's fine. It's your engagement.", { a: -3, t: 1 }, '你不生气？……你应该生气的。', "You're not angry? ...You should be."),
      ]); } },
    { id: 'z7', when: () => D(8, 21, 30), until: () => D(8, 22, 20), if: (L) => heart(L, W).trust >= 28, run: (L) => { say(L, W, '还在加班。从我这层能看到你住的那栋楼的绿顶。', 'Still at the office. From this floor I can see the green roof of your hotel.'); askOut(L, W, 'z-river', P.dates['z-river'], D(8, 22, 30)); } },
    { id: 'z8', when: () => D(9, 21, 0), until: () => D(10, 12, 0), if: (L) => said(L, 'step') && inLife(L, W), run: (L) => say(L, W, '今天在电梯里你看了我三秒。小周看见了。——三秒太长。', 'You looked at me for three seconds in the lift today. Xiao Zhou saw. — Three seconds is too long.', [
      R('那两秒。', 'Two, then.', { a: 3 }, '一秒半。成交。', 'One and a half. Deal.'),
      R('我们到底在躲什么？', 'What exactly are we hiding from?', { t: -1 }, '躲的是别人的嘴。我升不升，不能跟你有关系。', "From other people's mouths. Whether I'm promoted can't have anything to do with you."),
    ]) },
    { id: 'z9', urgent: true, when: () => D(10, 20, 30), until: () => D(10, 21, 40), if: (L) => career(L).track === 'consulting', run: (L) => { say(L, W, '评级出来了。高级经理，是我。', "The ratings are out. Senior manager. It's me.");
      if (heart(L, W).trust >= 34 || said(L, 'step') || said(L, 'slow')) askOut(L, W, 'z-night', P.dates['z-night'], D(10, 22, 0)); } },
    // ---- Act III ----
    { id: 'z10', when: () => D(11, 20, 30), until: () => D(12, 22, 0), if: (L) => career(L).track === 'consulting', run: (L) => say(L, W, '下一期项目的名单今天报上去了。我报了你。组里有人问我为什么，我说：因为他会当面跟我说不。', "The staffing list for the next phase went up today. I put you on it. Someone on the team asked me why. I said: because he tells me no to my face.", [
      R('那我继续说。', "Then I'll keep saying it.", { a: 2, t: 3 }, '说吧。别在客户面前。', 'Do. Not in front of the client.'),
      R('谢谢你保我。', 'Thank you for keeping me.', { t: 2 }, '不是保你。是你值。两回事。', "I didn't keep you. You earned it. Different things."),
    ]) },
    // ---- Act IV ----
    { id: 'z11', urgent: true, when: () => D(13, 21, 0), until: () => D(14, 22, 0), run: (L) => say(L, W, '新加坡办公室要人去带亚太的 AI 业务。Raymond 推了我。年底走，两年。', "The Singapore office needs someone to run AI for Asia-Pacific. Raymond put my name forward. I'd leave at the end of the year. Two years.", [
      R('去。这是你等了六年的位置。', "Go. You've waited six years for this.", { ev: 'z-go' }, '……我以为你会留我。你没留。所以我才信你。', "...I thought you'd ask me to stay. You didn't. Which is why I believe you."),
      R('留下来。', 'Stay.', { ev: 'z-stay' }, '你不能替我做这个决定。……但我会把这句话算进去。', "You can't make this decision for me. ...But I'll weigh that."),
      R('这是你的事。', "That's your decision.", { t: -6, a: -4 }, '……知道了。', '...Understood.'),
    ]) },
    { id: 'z12', urgent: true, when: () => D(16, 20, 0), until: () => D(17, 12, 0), run: (L) => { const why = P.end(L); if (why) leave(L, W, why); } },
  ],
  scenes: {
    'z-lobby': { who: W, spot: 'peaceLobby', kind: 'talk', label: B('一个浅灰金短发、戴银框眼镜的女人', 'A woman with short ash-blonde hair and silver glasses'), action: B('走过去', 'Go over'),
      on: (L) => !!fired(L, 'z2') && !fired(L, 'z2b') && !done(L, 'z-lobby') && stamp(L) <= D(1, 21, 35),
      script: (L) => [
        N('她几乎和你平视：一米七八，浅灰金的短发，发根是深的，银色细框眼镜，黑色针织开衫，耳机挂在脖子上。', 'She looks at you almost level: a hundred and seventy-eight centimetres, short ash-blonde hair with dark roots, thin silver glasses, a black knit cardigan, headphones round her neck.'),
        Z('纪白？比照片上高。', 'Ji Bai? Taller than your photo.'),
        Z('门禁卡，电脑。密码贴在背面，回去就改掉。', "Your pass. Your laptop. The password's taped to the back. Change it the minute you get upstairs."),
        ask(L, W,
          A('谢谢。你每个新人都亲自送？', 'Thanks. Do you hand-deliver to every new hire?', { a: 3 }, Z('不送。你住得顺路，而且我想在明天之前看看，Raymond 花大价钱挖来的人长什么样。', 'No. You\'re on my way home, and I wanted a look at what Raymond paid so much for before tomorrow.')),
          A('辛苦了。明天的材料我看了，第七页的数据口径有问题。', "Thanks for coming. I've read tomorrow's deck. The data definition on slide seven is wrong.", { t: 5, a: 2, mem: 'slide-seven' }, Z('……哪里有问题？', '...Wrong how?'), N('她掏出手机，看了十秒。', 'She takes out her phone and reads for ten seconds.'), Z('你是对的。今晚我改。', "You're right. I'll fix it tonight.")),
          A('（接过来，点点头）', '(Take them. Nod.)', null, Z('话少。也好。', 'A man of few words. Fine by me.'))),
        Z('先说清楚：这个客户我带了八个月，他们只认我。你在硅谷怎么做事我不管，在这里，对外的口径先过我。', "One thing, so we're clear. I've run this client for eight months and they trust me. I don't care how you did things in the Valley. Here, anything that goes outside goes through me first."),
        ask(L, W,
          A('可以。但我有不同意见的时候，会当面跟你说。', "Fine. But when I disagree, I'll say it to your face.", { t: 4, a: 2 }, Z('当面说可以。别在客户面前说。', 'To my face is fine. Not in front of the client.')),
          A('项目你带，听你的。', "It's your engagement. Your call.", { t: 1, a: -1 }, Z('……这么好说话？我不太信。', "...That easy? I don't quite believe it.")),
          A('我是来做产品的，不是来抢客户的。', "I came to build the product, not to take your client.", { t: 3 }, Z('这话我记下了。', "I'll hold you to that."))),
        Z('九点二十，楼下。', '9:20. Downstairs.'),
      ] },
    'z-drink': { who: W, spot: 'jazzTable', seat: true, kind: 'date', date: 'z-drink', pass: 60, label: B('知微', 'Zhiwei'), action: B('坐下', 'Sit down'),
      on: (L) => dateOn(L, 'z-drink'),
      script: (L) => [
        N('她已经到了。外套搭在椅背上，面前一杯威士忌，没动。', "She's already there. Jacket over the back of the chair, a whisky in front of her, untouched."),
        Z('你迟到了两分钟。我数了。', "You're two minutes late. I counted."),
        // the industrial designer in her: if he has built the gimbal, she has already looked at it
        ...(hasProduct(L) ? [Z('你包里那个云台是你自己做的？握把太细了，手一出汗就会转。下一版加粗两毫米，前面收一点，拇指才有地方放。', "Is that gimbal in your bag your own? The grip's too thin: it'll turn the moment your hand sweats. Two millimetres thicker on the next one, and pull the front in so your thumb has somewhere to go.")] : []),
        ask(L, W,
          A('你下班以后也计时？', 'You keep time after hours too?', { a: 3 }, Z('职业病。坐。', 'Occupational hazard. Sit.')),
          A('电梯坏了。我住楼上。', 'The lift was out. I live upstairs.', { a: 2 }, Z('住楼上还迟到。', "You live upstairs and you're still late."), N('她笑了一下，很短。', 'She smiles. Briefly.')),
          A('抱歉。', 'Sorry.', null, Z('开玩笑的。坐。', "I'm joking. Sit."))),
        Z('问你个事。你在硅谷好好的，为什么回来做咨询？这行的人都想往你来的地方跑。', 'Tell me something. You were doing fine in the Valley. Why come back for consulting? Everyone in this business is trying to get to where you came from.'),
        ask(L, W,
          A('我爸给了我一年。一年后要么我有自己的东西，要么回南京接厂。', 'My father gave me a year. Either I have something of my own by the end of it, or I go home to Nanjing and take over the works.', { t: 6, mem: 'told-year' }, Z('……所以你也在倒计时。', "...So you're on a clock too."), Z('我的是三十岁之前升高级经理。升不上去，这行就没有我的位置了。', "Mine is senior manager before thirty. If I don't make it, there's no place for me in this business.")),
          A('那边做到头，也是给别人的产品拧螺丝。', "Over there, at the end of the day, I was tightening bolts on someone else's product.", { t: 3, a: 2 }, Z('这边也是。只不过螺丝是 PPT 做的。', 'Same here. Only the bolts are made of PowerPoint.')),
          A('说来话长。你呢，为什么做这个？', 'Long story. What about you? Why this?', { a: 1 }, Z('因为我擅长。擅长的事做久了，就分不清是不是喜欢了。', "Because I'm good at it. Do what you're good at for long enough and you can't tell whether you like it."))),
        N('台上换了一首慢的。她终于喝了一口。', 'The trio moves into something slow. She finally takes a sip.'),
        Z('我有个规矩：不跟同事走太近。走近了，评级的时候就说不清楚。', "I have a rule: I don't get close to colleagues. Get close, and nobody can read your rating straight."),
        ask(L, W,
          A('那今晚算什么？', "Then what's tonight?", { a: 5 }, Z('……算还你一个人情。', '...Tonight is me paying a debt.'), Z('规矩是我定的。例外也是我定。', 'I made the rule. I decide the exceptions.')),
          A('规矩挺好。我也不想被人说是靠关系。', "It's a good rule. I don't want anyone saying I got on through connections either.", { t: 4 }, Z('……嗯。难得有人听了不觉得我冷。', "...Mm. Not many people hear that and don't decide I'm cold.")),
          A('规矩是用来破的。', 'Rules are made to be broken.', { a: 1, t: -2 }, Z('这句话，你对几个人说过？', 'And how many people have you said that to?'))),
        Z('十点了。我明早还要陪我妈逛城隍庙。', "It's ten. I'm taking my mother round the City God Temple in the morning."),
        Z('纪白。……今晚的事，周一别在组里提。', "Ji Bai. ...Don't mention tonight at work on Monday."),
      ] },
    'z-river': { who: W, spot: 'railCustoms', kind: 'date', date: 'z-river', label: B('知微', 'Zhiwei'), action: B('走过去', 'Go over'),
      on: (L) => dateOn(L, 'z-river'),
      script: (L) => [
        N('对岸，你们公司那栋楼还亮着十几层。', "Across the river a dozen floors of your firm's tower are still lit."),
        Z('三十一层，靠右那一格。二十分钟前我关的灯。', 'Thirty-first floor, the window on the right. I turned that light off twenty minutes ago.'),
        Z('Raymond 今天找我了。高级经理今年只有一个名额。他说，我和你，他都看好。', "Raymond called me in today. There's one senior-manager slot this year. He says he rates us both."),
        ask(L, W,
          A('我才来两个月。这个位置是你的。', "I've been here two months. That slot is yours.", { t: 5 }, Z('我不要你让。让来的，我拿着不踏实。', "I don't want you standing aside. I couldn't hold it properly if it was handed to me.")),
          A('那就各凭本事。', 'Then may the better one win.', { a: 4, t: 2 }, N('她转过来看着你。', 'She turns to look at you.'), Z('好。这才像话。', "Good. That's more like it.")),
          A('我对升职没兴趣。一年后我可能就不在了。', "I'm not interested in promotion. In a year I may not even be here.", { t: 2, a: -1 }, Z('……这话别让 Raymond 听见。也别让我太早听见。', "...Don't let Raymond hear that. And I'd rather not have heard it this early myself."))),
        N('风从江上过来。她把手插进大衣口袋，往你这边站近了半步。', 'The wind comes in off the river. She pushes her hands into her coat pockets and stands half a step closer.'),
        Z('我的规矩你知道。可是这两个月我下了班，想找人说话的时候，想到的都是你。很烦。', "You know my rule. But for two months now, when I've left the office wanting someone to talk to, it's you I think of. It's annoying."),
        ask(L, W,
          A('那就别守规矩了。', 'Then stop keeping the rule.', { a: 5, decide: 'step' }, Z('……公司里不能有人知道。评级结束之前，一个字都不行。', '...Nobody at the firm can know. Not one word until the ratings are done.'), N('她的手从口袋里拿出来，碰了一下你的手背。就一下。', 'Her hand comes out of her pocket and touches the back of yours. Just once.')),
          A('我也是。但你说得对：评级之前，我们先别动。', "Same here. But you're right: until the ratings are done, let's leave it where it is.", { t: 6, decide: 'slow' }, Z('……你比我想的稳。好。那就等到三月。', "...You're steadier than I thought. All right. March, then.")),
          A('知微，我们还是做同事比较好。', "Zhiwei, I think we're better as colleagues.", { a: -8, t: 2, decide: 'friends' }, Z('……嗯。你说得对。走吧，我去坐地铁。', "...Mm. You're right. Come on. I've a train to catch."))),
        Z('十分钟到了。', "That's ten minutes."),
      ] },
    'z-night': { who: W, spot: 'jazzTable', seat: true, kind: 'date', date: 'z-night', pass: 70, label: B('知微', 'Zhiwei'), action: B('坐下', 'Sit down'),
      on: (L) => dateOn(L, 'z-night'),
      script: (L) => [
        Z('我请。从今天起我请得起了。', "I'm buying. As of today I can afford to."),
        Z('Raymond 宣布的时候，我第一个想告诉的人不是我妈。', "When Raymond announced it, the first person I wanted to tell wasn't my mother."),
        ask(L, W,
          A('是谁？', 'Who was it?', { a: 3 }, Z('明知故问。', "As if you didn't know.")),
          A('你妈要是知道，催你结婚会催得更紧。', "If your mother knew, she'd push you about marriage twice as hard.", { a: 2, t: 2 }, Z('她已经在催了。上周发了我三个“小伙子”的简历。带照片。', 'She already is. Last week she sent me the CVs of three "nice young men". With photographs.'))),
        Z('有件事要先说。升了以后，你的绩效归我打分。我们要是在一起，就是我给男朋友打分。', "One thing before anything else. Now I'm promoted, I write your review. If we're together, I'm reviewing my boyfriend."),
        ask(L, W,
          A('那我申请调组。产品那边一直想要我。', "Then I'll ask to move teams. The product group has wanted me for a while.", { t: 8, mem: 'z-transfer', decide: 'commit' }, Z('……你愿意为这个调组？', "...You'd move teams for this?"), N('她看了你很久。', 'She looks at you for a long time.'), Z('好。那我去跟 HR 报备。按规矩来。我们的规矩。', "All right. Then I'll declare it to HR. By the rules. Our rules.")),
          A('那就别让人知道。', 'Then nobody needs to know.', { a: 2, t: -4 }, Z('瞒不住的。瞒不住的事，我不做。', "It wouldn't stay hidden. I don't do things that can't stay hidden.")),
          A('也许现在不是时候。', "Maybe this isn't the time.", { decide: 'slow' }, Z('……嗯。也许你说得对。喝完这杯。', "...Mm. Perhaps you're right. Let's finish these."))),
        N('乐队收了最后一首。她没有看表。', "The band plays its last number. She doesn't look at her watch."),
        ask(L, W,
          A('（送她到门口，替她叫车）', '(Walk her to the door. Call her a car.)', { t: 3 }, Z('到家给你发消息。', "I'll text when I'm home.")),
          A('我住楼上。再坐一会儿？', 'I live upstairs. Stay a while?', upstairs(W, [Z('……就一会儿。', '...Just a while.')], [Z('今天不。——不是不想。', "Not tonight. — That isn't a no.")]))),
      ] },
  },
  events: {
    'z-covered': (L) => { feel(L, W, { trust: 8, attraction: 2 }, 'covered'); shared(L, W, 'help', 'covered-report'); fact(L, 'covered-for', { what: 'the weekly report' }, [W]); },
    'z-credit-fix': (L) => { feel(L, W, { trust: 6 }, 'credit'); shared(L, W, 'talk', 'credit-fixed'); fact(L, 'credit-shared', { what: 'the evaluation model' }, [W]); standing(L, 2); },
    'z-go': (L) => { feel(L, W, { trust: 8 }, 'singapore'); heart(L, W).said.go = stamp(L); shared(L, W, 'talk', 'sg-go'); },
    'z-stay': (L) => { feel(L, W, { attraction: 2, trust: -3 }, 'singapore'); heart(L, W).said.stay = stamp(L); shared(L, W, 'talk', 'sg-stay'); },
  },
  // December: what she does (her last message of the year; world/romance.js records how it ended)
  end(L) {
    const h = heart(L, W), tog = h.stage === 'together', dating = h.stage === 'dating';
    if (tog && h.said.stay && h.trust >= 70) { h.settled = 'stays'; say(L, W, '我跟 Raymond 说了，新加坡我不去。不是为你。——有一部分是。', "I've told Raymond I'm not taking Singapore. Not for you. — Partly for you."); }
    else if (tog) { h.settled = 'distance'; say(L, W, '机票订了，十二月二十号。两年，每个月我回来一次。春节你来新加坡，我带你吃肉骨茶。', "The flight's booked: the twentieth of December. Two years, and I'm back once a month. Come to Singapore at Spring Festival. I'll take you for bak kut teh."); }
    else if (dating) { say(L, W, '十二月走。纪白，我们差一点。——差的那一点，是我没等，还是你没追，我分不清。', "I leave in December. We nearly had it, Ji Bai. — Whether the missing part was me not waiting or you not coming after me, I can't tell."); return 'moved'; }
    else { h.settled = 'colleague'; say(L, W, '十二月去新加坡。走之前，把你那页数据流图教给新人。那是你留在这个项目上最好的东西。', "I'm off to Singapore in December. Before I go, teach the new hire your data-flow slide. It's the best thing you've left on this project."); }
    return null;
  },
  epilogue(L, h) {
    if (h.stage === 'together' && h.settled === 'stays') return B('知微没有去新加坡。她升了高级经理，你调了组，周五晚上你们还是坐爵士吧那张桌子。', "Zhiwei didn't take Singapore. She's a senior manager, you've moved teams, and on Friday nights the two of you still have that table at the Jazz Bar.");
    if (h.stage === 'together') return B('知微十二月去了新加坡。每个月最后一个周五，她的航班晚上九点落浦东。', "Zhiwei left for Singapore in December. On the last Friday of every month her flight lands at Pudong at nine in the evening.");
    if (h.stage === 'over' && h.over && h.over.was !== 'known') return B('知微去了新加坡。组里的人说她走之前改了你的评估表：往高了改。', 'Zhiwei went to Singapore. People on the team say that before she left she changed your review: upwards.');
    return null;
  },
};
export default P;
