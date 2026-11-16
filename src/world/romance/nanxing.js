// 沈南星 Shen Nanxing, 26: an independent photographer who shoots the Bund after the lights go down.
// Spontaneous, awake until four, allergic to plans and to being owned.
//   Act I    the railing at night, a tripod, eight seconds of him as a shadow; ten o'clock, when
//            the floodlights drop; the Jazz Bar, where she tells him what she isn't good at
//   Act II   Chongming and no signal; a picture at two in the morning; Lisbon comes through
//   Act III  the print, and whether he asks her not to go
//   Act IV   the picture of him she took without asking; Lisbon, postcards at his four a.m.;
//            they ask her to stay on
//   Act V    Hongqiao arrivals, or another three months
import { stamp } from '../../engine/life.js';
import { heart, inLife, isSeeing, leave } from '../../engine/hearts.js';
import { hasProduct } from '../../engine/studio.js';
import { B, D, H, tod, between, say, R, A, ask, askOut, after, dayAfter, done, dateOn, upstairs, tonightOr } from './kit.js';

const W = 'nanxing';
const X = (zh, en) => [W, zh, en], N = (zh, en) => ['nar', zh, en];
const day = (L) => L.clock.day;
const onChongming = (L) => stamp(L) >= D(7, 6, 0) && stamp(L) < D(8, 18, 0);
const inLisbon = (L) => day(L) >= 14 && stamp(L) < D(16, 18, 30);

const P = {
  id: W, name: B('沈南星', 'Shen Nanxing'), short: B('南星', 'Nanxing'), age: 26, sex: 'f', color: '#b0623a', avatar: ['c8', 'c2', 'c1'], voice: { pitch: 1.1, rate: 1.06 },
  role: B('独立摄影师，拍十点以后的外滩', 'Independent photographer; shoots the Bund after ten'),
  ambition: B('第一个个展；里斯本的三个月驻留', 'A first solo show; a three-month residency in Lisbon'),
  how: 'You met him at the Bund railing at night when he walked into an eight-second exposure of yours.',
  calls: B('纪白', 'Ji Bai'),
  card: 'Shen Nanxing (沈南星), 26, from Kunming; left a journalism MA unfinished and has lived five years in Shanghai as an independent photographer: magazine and brand shoots pay for a room in an old lane house near Suzhou Creek; her own project, "After Ten", is the Bund once the floodlights drop at ten and the people who work nights there; shoots on a battered full-frame camera and still keeps a film body; wants a first solo show and has applied for a three-month residency in Lisbon; spontaneous, warm, teasing, allergic to plans and to being owned; awake until four and asleep until noon; texts in bursts, sends a photo instead of an answer, vanishes for days on a shoot and comes back as if no time had passed',
  arc: {
    1: B('每晚在江边等十点。“十点以后”这组还差一半。', 'At the river every night, waiting for ten. "After Ten" is half finished.'),
    2: B('崇明拍候鸟；等里斯本的回信。', 'Shooting the winter birds on Chongming; waiting to hear from Lisbon.'),
    3: B('里斯本批了。七月走。', 'Lisbon said yes. She leaves in July.'),
    4: B('在里斯本。那边想让她再留三个月，带一个工作坊。', 'In Lisbon. They want her for another three months, to run a workshop.'),
    5: B('回上海，或者不回。', 'Back to Shanghai, or not.'),
  },
  schedule(L) {
    const m = tod(L);
    if (onChongming(L)) return { spot: null, doing: B('在崇明岛拍候鸟，没有信号', 'on Chongming Island shooting the winter birds, with no signal'), free: false, away: true };
    if (inLisbon(L)) return { spot: null, doing: B('在里斯本驻留（比上海晚七个小时）', 'on her residency in Lisbon (seven hours behind Shanghai)'), free: true, abroad: true };
    if (m >= H(4, 30) && m < H(11, 30)) return { spot: null, doing: B('睡着，手机静音', 'asleep with her phone on silent'), free: false };
    if (between(L, H(20, 40), H(23, 40)) && day(L) <= 13) return { spot: 'railNorth', doing: B('在江边的栏杆旁支着三脚架，等十点灯灭', 'at the river railing with her tripod up, waiting for the lights to drop at ten'), free: true };
    if (m >= H(23, 40) || m < H(4, 30)) return { spot: null, doing: B('在苏州河边的小房间里修片', 'editing in her room by Suzhou Creek'), free: true };
    return { spot: null, doing: B('在外面拍一个杂志的活', 'out on a magazine job'), free: true };
  },
  memories: {
    'n-rail': B('夜里在江边，他走进了她八秒的长曝光，成了画面里的一道影子。', 'At the river at night he walked into an eight-second exposure of hers and became a shadow in the frame.'),
    'saw-gimbal': B('她一眼认出他口袋里的云台是自己打印的。', 'She saw at a glance that the gimbal in his pocket was one he had printed himself.'),
    'n-ten': B('晚上十点，他替她挡着风，她拍到了泛光灯一下子灭掉的海关大楼。他是第一个陪她等完的人。', 'At ten at night he blocked the wind while she caught the Customs House at the moment the floodlights dropped. He was the first person to wait it out with her.'),
    'n-jazz': B('她在爵士吧拍完三重奏，坐下来喝了一杯，说自己不太会“在一起”。', 'After shooting the trio at the Jazz Bar she sat down for a drink and told him she isn\'t much good at "together".'),
    'told-year': B('他告诉了她：他有一年时间弄清楚自己想当哪个人。', 'He told her he has a year to find out which person he wants to be.'),
    'no-explaining': B('他说：消失不用解释，回来告诉他一声就行。', "He said: no need to explain a disappearance. Just tell him when she's back."),
    'n-print': B('她把那张八秒的照片放大洗出来送给了他，然后说：里斯本批了。', 'She gave him the eight-second picture, enlarged and printed by hand, and then told him Lisbon had come through.'),
    'lisbon-go': B('他说她该去里斯本，没有问“那我们呢”。', 'He told her she should go to Lisbon, and did not ask "what about us".'),
    'lisbon-stay': B('他问她能不能不去里斯本。她说不能，让他别这样问。', 'He asked whether she could not go to Lisbon. She said no, and not to ask her that.'),
    'photo-consent': B('她没问就拍了他靠着栏杆等人的样子，想拿去展出。他说：下次先问。', 'She photographed him waiting at the railing without asking and wanted to show it. He said: next time, ask first.'),
    'photo-signed': B('“十点以后”的最后一张是他：靠着栏杆，等她。他签了字。', 'The last picture in "After Ten" is of him, leaning on the railing, waiting for her. He signed the release.'),
    'kept-watch': B('她在里斯本的时候，他十点去老地方替她看了灯灭。', 'While she was in Lisbon he went to their place at ten and watched the lights drop for her.'),
    'nanxing-night': B('有一晚，她背着相机跟他上了楼。', 'One night she carried her camera upstairs with him.'),
  },
  lines: {
    accept: B('好。穿厚点，江边冷。', 'Good. Dress warm. The river is cold.'), decline: B('行吧。我自己去。', "Fine. I'll go by myself."), missed: B('没等到你回。我先拍了。', "You didn't answer. I went ahead and shot it."),
    stood: B('我在栏杆边站到灯灭。你没来。我不生气，我只是记性很好。', "I stood at the railing until the lights went. You didn't come. I'm not angry. I just have a good memory."),
    quiet: B('你不回，我就不发了。我这人不追。', "You don't answer, so I'll stop sending. I don't chase."),
    left: B('我想了想，我们还是算了。你需要一个每天都在的人，我需要一个不问我在哪儿的人。——照片你留着。', "I've thought about it, and let's leave it. You need someone who's there every day. I need someone who doesn't ask where I am. — Keep the photograph."),
    two: B('你还有别人，对吧。别紧张，我不是来吵架的。', "There's someone else, isn't there. Relax. I'm not here for a fight."),
    twoOpen: B('我说过我不太会“在一起”，所以我没资格管你。但我也不会把自己交给一个两头跑的人。我们就这样，不往前走了。', "I told you I'm no good at \"together\", so I've no right to police you. But I'm not handing myself to someone running between two people. We stay as we are. No further."),
    ended: B('好。照片我不删。', "All right. I'm not deleting the photographs."),
    fight: B('我看见了。你打架的样子比你上班的样子诚实。……但别再有下次，我不想拍你躺在地上。', "I saw. You're more honest in a fight than you are at work. ...But not again. I don't want to photograph you on the ground."),
    heard: B('听说你跟人动手了？脸没事吧，我还要拍的。', "I hear you were in a fight? Is your face all right? I still need it."),
    online: B('刷到你了。那个角度拍得真烂。', 'You came up in my feed. Terrible angle, whoever shot it.'),
    hurt: B('别动，让我看看。……肿了。冰敷，别用热的。我以前拍拳馆，知道。', "Hold still, let me look. ...It's swollen. Ice, not heat. I used to shoot at a boxing gym. I know."),
    onesided: B('喂，每次都是我先找你。你是不是把我当天气预报，等着它自己来？', "Hey. It's always me who writes first. Do you think I'm the weather forecast, that I just turn up?"),
    yes: B('来。', 'Come.'), busy: B('这两天在赶片子，眼睛都要瞎了。过两天。', "I'm on a deadline and going blind. In a couple of days."), mood: B('最近不想见人。不是你的问题。……也有一点是。', "I don't want to see people just now. It isn't you. ...It's a little bit you."), away: B('在山里拍片，没信号。回来找你。', "Out shooting with no signal. I'll find you when I'm back."), later: B('最近不行。等我回上海。', "Not just now. When I'm back in Shanghai."),
    hello: B('嘘。还有三分钟十点。站我左边。', "Shh. Three minutes to ten. Stand on my left."),
    morning: B('她走的时候没有叫醒你。枕头上放着一卷没冲的胶卷，上面用记号笔写着：别曝光。', "She didn't wake you when she left. On the pillow is a roll of undeveloped film with two words on it in marker pen: don't expose."),
    career: {
      resigned: B('辞了？恭喜。我辞职那天吃了三碗面。', "You quit? Congratulations. The day I quit I ate three bowls of noodles."),
      laidoff: B('被裁了也好。你白天那个人，我本来就不太喜欢。', "Laid off is no bad thing. I never much liked the daytime you."),
      startup: B('自己做了？那你以后也是凌晨四点睡的人了。欢迎。', "Out on your own? Then you'll be someone who goes to bed at four from now on. Welcome."),
      family: B('回南京。……南京也有江。不过我不拍长江，太宽了，装不进一张片子。', "Back to Nanjing. ...Nanjing has a river too. But I don't shoot the Yangtze. Too wide. It won't fit in a frame."),
      switched: B('换了家公司？你们上班的人，换来换去还是那张桌子。', "A new firm? You office people change jobs and end up at the same desk."),
    },
    canned: { zh: ['在暗房，手是湿的。等下。', '[图片] 看这个光。', '嗯？你说。', '哈哈，行。'], en: ["In the darkroom with wet hands. Hang on.", '[Photo] Look at this light.', 'Hm? Go on.', 'Ha. All right.'] },
  },
  dates: {
    'n-ten': { hm: [21, 40], needs: 'n-rail', days: [1, 10], title: B('十点，灯灭的时候', "Ten o'clock, when the lights go down"), place: B('外滩 · 海关大楼对面的栏杆', 'The Bund · the railing opposite the Customs House'), text: B('十点灯灭的时候我要拍海关大楼的钟，缺个人帮我挡风。九点四十，钟对面的栏杆。', "When the lights drop at ten I'm shooting the Customs House clock, and I need someone to block the wind. 9:40, the railing opposite the clock."), yes: B('我来挡。', "I'll be your windbreak."), no: B('今晚不行。', 'Not tonight.') },
    'n-jazz': { hm: [21, 30], needs: 'n-ten', days: [1, 13], title: B('拍完喝一杯', 'A drink after the shoot'), place: B('和平饭店 · 爵士吧', 'Peace Hotel · the Jazz Bar'), text: B('我给一本杂志拍爵士吧那个三重奏。拍完坐下来喝一杯，这次不用你当墙。九点半。', "I'm shooting the trio at the Jazz Bar for a magazine. A drink afterwards, and this time you're not a wall. Half nine."), yes: B('去。', "I'll be there."), no: B('去不了。', "I can't.") },
    'n-print': { title: B('老地方', 'The usual place'), place: B('外滩 · 北段的栏杆', 'The Bund · the railing, north end'), text: B('今晚十点，老地方。有东西给你。', 'Ten tonight, the usual place. I have something for you.'), yes: B('好。', 'OK.'), no: B('今晚不行。', 'Not tonight.') },
  },
  beats: [
    { id: 'n1', when: (L) => after(L, W, 'n-rail', 150), run: (L) => say(L, W, '[图片] 八秒。你是左边那道灰的。比我想的好看。', "[Photo] Eight seconds. You're the grey streak on the left. Better than I expected.", [
      R('发我原图。', 'Send me the original.', { a: 2 }, '原图要拿东西换。', 'Originals cost something.'),
      R('我只是个影子？', "I'm only a shadow?", { a: 3 }, '目前是。', 'For now.'),
    ]) },
    { id: 'n2', when: (L) => dayAfter(L, W, 'n-rail', 15, 0), until: () => D(10, 20, 0), run: (L) => askOut(L, W, 'n-ten', P.dates['n-ten'], tonightOr(L, 21, 40, 60)) },
    { id: 'n3', when: (L) => after(L, W, 'n-ten', 240), run: (L) => say(L, W, '[图片] 海关的钟，十点零一秒。左下角那个肩膀是你的。我不裁。', "[Photo] The Customs clock at one second past ten. The shoulder bottom left is yours. I'm not cropping it.") },
    { id: 'n4', when: (L) => dayAfter(L, W, 'n-ten', 16, 0), until: () => D(12, 20, 0), run: (L) => askOut(L, W, 'n-jazz', P.dates['n-jazz'], tonightOr(L, 21, 30, 60)) },
    { id: 'n5', urgent: true, when: () => D(7, 5, 30), until: () => D(7, 6, 0), if: (L) => inLife(L, W), run: (L) => say(L, W, '这两天在崇明拍候鸟，岛上没信号。别找我，明天傍晚回。', "On Chongming for two days shooting the winter birds. No signal on the island. Don't look for me. Back tomorrow evening.") },
    { id: 'n6', when: () => D(8, 19, 0), until: () => D(9, 2, 0), if: (L) => inLife(L, W), run: (L) => say(L, W, '[图片] 回来了。四千张，手冻裂了。你这两天干了什么，一件一件说。', '[Photo] Back. Four thousand frames and split knuckles. What have you been doing these two days? One thing at a time.', [
      R('加班。想你。', 'Working late. Missing you.', { a: 3 }, '后面两个字再说一遍。', 'Say the second part again.'),
      R('你不是说不用解释吗？我也不解释。', "You said no explaining. I'm not explaining either.", { a: 2 }, '学得真快。', 'Quick learner.'),
    ]) },
    { id: 'n7', when: () => D(9, 2, 20), until: () => D(9, 4, 20), if: (L) => inLife(L, W) && heart(L, W).stage !== 'known', run: (L) => { say(L, W, '睡了吗？', 'Are you asleep?'); say(L, W, '没事。就是冲出来一张片子，想第一个给你看。', "It's nothing. I've just developed a picture and wanted you to be the first to see it.", [
      R('醒着。发我。', "I'm awake. Send it.", { a: 3, t: 2 }, '[图片] 崇明，早上五点，一万只鸟同时起来。', '[Photo] Chongming, five in the morning, ten thousand birds getting up at once.'),
    ], { ttl: 600 }); } },
    { id: 'n8', when: () => D(10, 16, 0), until: () => D(10, 21, 20), if: (L) => inLife(L, W) && heart(L, W).stage !== 'known', run: (L) => askOut(L, W, 'n-print', P.dates['n-print'], D(10, 22, 0)) },
    { id: 'n8b', urgent: true, when: () => D(11, 13, 0), until: () => D(12, 23, 0), if: (L) => inLife(L, W) && !done(L, 'n-print'), run: (L) => say(L, W, '里斯本的驻留批了。七月走，三个月。告诉你一声。', 'The Lisbon residency came through. I leave in July, for three months. Just so you know.') },
    { id: 'n9', when: () => D(13, 23, 0), until: () => D(14, 3, 0), if: (L) => inLife(L, W) && heart(L, W).stage !== 'known', run: (L) => say(L, W, '走之前要交“十点以后”的最后一张。我选了你那张：你靠着栏杆等我，没发现我在拍。要展出，得你签个字。', 'Before I go I have to hand in the last picture for "After Ten". I\'ve chosen yours: you leaning on the railing waiting for me, with no idea I was shooting. To show it I need your signature.', [
      R('签。你拍的我信。', "I'll sign. I trust what you shoot.", { t: 5, a: 2, mem: 'photo-signed' }, '[图片] 就是这张。挂在最后一面墙上。', '[Photo] This one. It hangs on the last wall.'),
      R('你拍的时候没问我。', "You didn't ask when you took it.", { t: 2, a: -1, mem: 'photo-consent' }, '问了就不是那张了。……但你说得对，下次先问。这张你说了算：你不点头，我就撤。', "If I'd asked it wouldn't be that picture. ...But you're right. Next time I ask first. This one is yours to decide: no nod from you and I pull it."),
      R('不行。我不想被挂在墙上。', "No. I don't want to hang on a wall.", { t: -2 }, '好。撤了。换一张清洁工的。', "All right. It's out. I'll use one of a street cleaner."),
    ]) },
    { id: 'n10', when: () => D(14, 3, 30), until: () => D(14, 23, 0), if: (L) => inLife(L, W), run: (L) => say(L, W, '[图片] 里斯本，二十八路电车。这里晚上十点天还亮着，我有点不习惯。', "[Photo] Lisbon, the number 28 tram. It's still light here at ten at night. I can't get used to it.", [
      R('上海十点，灯刚灭。我在老地方替你看了。', 'Ten in Shanghai and the lights have just dropped. I watched them for you from our place.', { a: 3, t: 3, mem: 'kept-watch' }, '……别这样。我会想回去的。', "...Don't. I'll start wanting to come back."),
      R('好好拍。', 'Shoot well.', { t: 1 }, '嗯。', 'Mm.'),
    ]) },
    { id: 'n11', when: () => D(15, 4, 0), until: () => D(15, 23, 0), if: (L) => inLife(L, W), run: (L) => say(L, W, '他们想让我再留三个月，带一个工作坊。我还没回。', "They've asked me to stay another three months and run a workshop. I haven't answered.", [
      R('机会难得。你定，我都在。', "It's a rare chance. You decide. I'm here either way.", { t: 5 }, '“我都在”。你知道这三个字对我这种人有多危险吗。', '"Here either way." Do you know how dangerous that is to say to someone like me?'),
      R('回来吧。', 'Come back.', { a: 2, t: -2 }, '……你这句话我存着，不保证用。', "...I'll keep that sentence. I don't promise to use it."),
      R('你自己定。', 'Your decision.', { t: 1 }, '我知道是我定。我是想听你怎么说。', 'I know it is. I wanted to hear what you would say.'),
    ]) },
    { id: 'n12', urgent: true, when: () => D(16, 19, 30), until: () => D(17, 12, 0), if: (L) => inLife(L, W), run: (L) => { const why = P.end(L); if (why) leave(L, W, why); } },
  ],
  scenes: {
    'n-rail': { who: W, spot: 'railNorth', kind: 'talk', label: B('一个在拍长曝光的人', 'Someone shooting a long exposure'), action: B('走过去', 'Go closer'),
      on: (L) => heart(L, W).stage === 'stranger' && day(L) <= 10 && !onChongming(L) && between(L, H(20, 40), H(23, 40)),
      script: (L) => [
        N('三脚架支在栏杆边，快门线垂着。她没看取景器，在看表。', "A tripod at the railing, the cable release hanging. She isn't looking through the viewfinder. She's watching her watch."),
        X('别动。——你进画面了。', "Don't move. — You're in my frame."),
        X('八秒。……好了。可以动了。', 'Eight seconds. ...Done. You can move now.'),
        ask(L, W,
          A('抱歉，我没看见你在拍。', "Sorry, I didn't see you were shooting.", { t: 2 }, X('没事。长曝光里，站着不动的人是个影子，走过去的人就没了。你刚才是个影子。', "It's fine. In a long exposure, someone who stands still is a shadow and someone who walks through is gone. You were a shadow.")),
          A('那我是不是该收模特费？', 'Do I get a modelling fee?', { a: 4 }, X('收。一杯 Manner，分期付。', 'You do. One Manner coffee, payable in instalments.')),
          A('（凑过去看屏幕）', '(Lean in to see the screen.)', { a: 2 }, X('哎，凑这么近。……行吧，给你看。', "Hey, that's close. ...Fine. Look."))),
        ...(hasProduct(L) ? [X('等等，你口袋里那个是云台？握把是自己打印的吧，层纹都没磨。', "Wait, is that a gimbal in your pocket? You printed that grip yourself. You haven't even sanded the layer lines."),
          ask(L, W,
            A('自己做的。夜里拍视频用。', 'Made it myself. For shooting video at night.', { a: 3, t: 3, mem: 'saw-gimbal' }, X('做东西的人。难怪站得住八秒。', 'Someone who makes things. No wonder you could stand still for eight seconds.')),
            A('眼睛真毒。', 'Sharp eyes.', { a: 1, mem: 'saw-gimbal' }, X('吃这碗饭的。', "It's how I eat.")))] : []),
        X('我叫南星。每天晚上差不多这个点在这儿，等十点。', "I'm Nanxing. I'm here most nights about now, waiting for ten."),
        ask(L, W,
          A('十点有什么？', 'What happens at ten?', { a: 1 }, X('泛光灯灭一半。外滩卸了妆，那才是它。', 'Half the floodlights go off. The Bund takes its make-up off. That is the real one.')),
          A('纪白。刚搬回来，住那栋绿顶的。', 'Ji Bai. Just moved back. I live in the one with the green roof.', { t: 2 }, X('住和平饭店的人，半夜一个人来江边。有故事。', "A man who lives at the Peace Hotel, alone at the river at night. There's a story there."))),
        X('加个微信。照片出来发你——如果你这个影子好看的话。', "Add me on WeChat. I'll send you the picture — if your shadow turns out any good."),
      ] },
    'n-ten': { who: W, spot: 'railCustoms', kind: 'date', date: 'n-ten', startAt: H(21, 56), label: B('南星', 'Nanxing'), action: B('走过去', 'Go over'),
      on: (L) => dateOn(L, 'n-ten'),
      script: (L) => [
        X('来了。站这儿，上风口。对，就当一堵墙。', "You came. Stand here, upwind. That's it. Be a wall."),
        X('还有几分钟。跟我说话，别让我紧张。', "A few minutes to go. Talk to me. Don't let me get nervous."),
        ask(L, W,
          A('你天天拍这个，还紧张？', 'You shoot this every night and you still get nervous?', { a: 2 }, X('每天的灯灭得都不一样。有时候是一栋一栋灭，有时候是一下。我等的是一下。', "It's different every night. Sometimes they go building by building, sometimes all at once. I'm waiting for all at once.")),
          A('为什么是外滩？全世界的人都拍过了。', 'Why the Bund? The whole world has photographed it.', { t: 3 }, X('全世界拍的是亮着的。我拍它下班以后：清洁工，夜班保安，等末班车的人。', 'The whole world shoots it lit. I shoot it after it clocks off: the cleaners, the night guards, the people waiting for the last bus.')),
          A('（不说话，站稳）', '(Say nothing. Stand firm.)', { t: 2 }, X('……好墙。', '...Good wall.'))),
        N('钟敲了十下。对岸的大屏先黑，然后是这边：金色的泛光一层一层退下去，只剩轮廓。', 'The clock strikes ten. The screens across the river go dark first, then this side: the gold floodlight drains away floor by floor until only the outlines are left.'),
        X('……拿到了。', '...Got it.'),
        X('你知道吗，你是第一个陪我等完的人。别人站五分钟就开始看手机。', "Do you know, you're the first person who has waited it out with me. Everyone else is on their phone inside five minutes."),
        ask(L, W,
          A('下次还可以找我当墙。', 'You can book the wall again.', { a: 3, t: 2 }, X('墙不够。下次带你去拍。', "A wall isn't enough. Next time you're shooting with me.")),
          A('这算约会吗？', 'Is this a date?', { a: 4, decide: 'step' }, N('她笑出了声。', 'She laughs out loud.'), X('你们做产品的，什么都要先定义。……算。', 'You product people have to define everything first. ...Yes. It is.')),
          A('我明早还要上班。', "I've got work in the morning.", { a: -2 }, X('去吧，上班的人。', 'Off you go, working man.'))),
        X('走了。我去苏州河那边吃面。——不带你，你明天要上班。', "I'm off. Noodles by Suzhou Creek. — You're not invited. You have work tomorrow."),
      ] },
    'n-jazz': { who: W, spot: 'jazzTable', seat: true, kind: 'date', date: 'n-jazz', pass: 70, label: B('南星', 'Nanxing'), action: B('坐下', 'Sit down'),
      on: (L) => dateOn(L, 'n-jazz'),
      script: (L) => [
        N('她把相机放在桌上，镜头盖没盖。', 'She puts the camera on the table without its lens cap.'),
        X('拍完了。四十张里能用三张，算运气好。', 'Done. Three usable out of forty. A lucky night.'),
        X('轮到我问你。伯克利回来的，白天在陆家嘴给大公司做 AI，晚上一个人跑到江边站着——你到底想当哪个人？', 'My turn to ask. Back from Berkeley, building AI for big companies in Lujiazui by day, standing alone at the river by night — which of those people do you actually want to be?'),
        ask(L, W,
          A('还不知道。我有一年时间弄清楚。', "I don't know yet. I have a year to find out.", { t: 5, mem: 'told-year' }, X('一年。……那我也说一个：我申请了里斯本的驻留，三个月。批不批，春天知道。', "A year. ...Then here's mine: I've applied for a residency in Lisbon. Three months. I'll hear in the spring.")),
          A('晚上那个。', 'The night one.', { a: 3 }, X('我就知道。白天那个穿的鞋不对。', 'I knew it. The daytime one wears the wrong shoes.')),
          A('两个都要，不行吗？', 'Both. Is that not allowed?', { a: 1 }, X('行。就是会很累。', "It's allowed. It's just tiring."))),
        X('我先说清楚，我这个人不太会“在一起”。我会突然消失三天去拍东西，回来也不解释。', "Let me be straight with you. I'm not much good at \"together\". I vanish for three days to shoot something and I don't explain when I'm back."),
        ask(L, W,
          A('不用解释。回来告诉我一声就行。', "You don't have to explain. Just tell me when you're back.", { t: 7, a: 3, mem: 'no-explaining' }, X('……就这样？', "...That's all?"), X('那成交。', "Then it's a deal.")),
          A('三天不回消息，我会担心。', "Three days without a word and I'd worry.", { t: 2, a: -1 }, X('担心可以。别找。', "Worry if you like. Just don't come looking.")),
          A('那我们算什么？', 'Then what are we?', { a: -2 }, X('算两个今晚都不想回家的人。', "Two people who don't want to go home tonight."))),
        N('最后一首。贝斯手冲她点了点头。', 'The last number. The bass player nods to her.'),
        ask(L, W,
          A('我住楼上。上来看看江？', 'I live upstairs. Come up and see the river?', upstairs(W, [X('带路。——相机我自己背，不许碰。', "Lead the way. — I carry the camera. Hands off.")], [X('下次。今晚我想一个人走回去。', 'Next time. Tonight I want to walk home by myself.')])),
          A('我送你回苏州河。', "I'll walk you back to Suzhou Creek.", { t: 3 }, X('四十分钟的路。你确定？……走吧。', "It's a forty-minute walk. You're sure? ...Come on, then."))),
      ] },
    'n-print': { who: W, spot: 'railNorth', kind: 'date', date: 'n-print', label: B('南星', 'Nanxing'), action: B('走过去', 'Go over'),
      on: (L) => dateOn(L, 'n-print'),
      script: (L) => [
        X('给。那张八秒的，我放大了。银盐的，自己洗的。', "Here. The eight-second one, enlarged. Silver gelatin. I printed it myself."),
        X('还有件事。里斯本批了。七月走，三个月。', 'And something else. Lisbon came through. I leave in July. Three months.'),
        ask(L, W,
          A('太好了。你该去。', "That's wonderful. You should go.", { t: 6, mem: 'lisbon-go' }, X('……你都不问一句“那我们呢”。', '...You don\'t even ask "what about us".'), X('所以我才会想回来。', "Which is why I'll want to come back.")),
          A('三个月。那我们呢？', 'Three months. What about us?', { a: -1, t: 1 }, X('我们还是我们。我只是换个地方失踪。', "We're still us. I'll just be missing somewhere else.")),
          A('能不去吗？', 'Could you not go?', { t: -6, a: -3, mem: 'lisbon-stay' }, N('她把相机带子在手上绕了两圈。', 'She winds the camera strap twice round her hand.'), X('不能。别这样问我。', "No. Don't ask me that."))),
        ...(isSeeing(L, W) ? [ask(L, W,
          A('我等你回来。不找别人。', "I'll be here when you're back. There won't be anyone else.", { a: 2, t: 3, decide: 'commit' }, X('这话我没要求你说。', "I wasn't asking you to say that."), X('但我听见了。', 'But I heard it.')),
          A('走之前，多见几次。', "Let's see each other a lot before you go.", { a: 3 }, X('那你得学会熬夜。', "Then you'll have to learn to stay up late.")))] : []),
        N('十点。灯又灭了一次。这次她没有拍。', "Ten o'clock. The lights drop again. This time she doesn't shoot."),
      ] },
  },
  events: {},
  end(L) {
    const h = heart(L, W), back = isSeeing(L, W) && h.trust >= 55 && h.attraction >= 45 && !h.open;
    if (back) { h.settled = 'back'; say(L, W, '虹桥，刚落地。里斯本十点天还亮着，我受不了。今晚老地方，你当墙。', "Hongqiao. Just landed. In Lisbon it's still light at ten and I couldn't stand it. Our place tonight. You're the wall."); return null; }
    if (isSeeing(L, W)) { say(L, W, '我续了，再三个月，也许更久。纪白，别等我。——这句话我只说一次。', "I've extended. Another three months, maybe longer. Don't wait for me, Ji Bai. — I'll only say that once."); return 'residency'; }
    h.settled = 'abroad'; say(L, W, '[图片] 我续了三个月。这张是这里的十点。回上海的时候给你带一张明信片，如果我回的话。', "[Photo] I've extended for three months. This is ten o'clock here. I'll bring you a postcard when I'm back in Shanghai, if I come back.");
    return null;
  },
  epilogue(L, h) {
    if (h.stage === 'together') return B('南星十月回了上海。那张八秒的照片挂在她个展的第一面墙上，标题是《影子》。每晚十点，你还是那堵墙。', 'Nanxing came back to Shanghai in October. The eight-second picture hangs on the first wall of her solo show, under the title "Shadow". At ten every night you are still the wall.');
    if (h.stage === 'dating') return B('南星回了上海。她还是会消失三天，回来告诉你一声。', "Nanxing is back in Shanghai. She still vanishes for three days, and tells you when she's back.");
    if (h.stage === 'over' && h.over && h.over.why === 'residency') return B('南星留在了里斯本。偶尔在凌晨四点，你会收到一张没有字的照片。', 'Nanxing stayed in Lisbon. Now and then, at four in the morning, a photograph arrives with no words.');
    if (h.stage === 'over' && h.over && ['dating', 'together'].includes(h.over.was)) return B('那张八秒的照片还在你抽屉里。你是左边那道灰的。', "The eight-second picture is still in your drawer. You're the grey streak on the left.");
    return null;
  },
};
export default P;
