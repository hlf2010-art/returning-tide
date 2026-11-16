// 唐可昕 Tang Kexin, 25: a Shanghai lifestyle creator, about 180K followers on Xiaohongshu and 90K on
// Douyin. Brand events, nights out, a life that is also her job; and what of his ends up in it.
//   Act I    he walks through her shot at the Jazz Bar (Momo's night, the brand nights): may she
//            keep the two seconds? Shengjian on Nanjing Road with no phone and no make-up
//   Act II   four hundred followers gone for telling the truth; a gossip account, and a brand that
//            would pay six figures for a "couple" series; a live stream where she says yes first
//   Act III  a Hangzhou agency offers to make her big, on their terms
//   Act IV   twenty pieces under her own name, or Hangzhou
//   Act V    the day of his dinner she posts nothing
import { stamp } from '../../engine/life.js';
import { heart, inLife, isSeeing, feel, remember, decide, leave } from '../../engine/hearts.js';
import { fact, rep, standing } from '../../engine/year.js';
import { gainFollowers } from '../../engine/maker.js';
import { B, D, H, tod, between, say, R, A, ask, askOut, dayAfter, done, dateOn, upstairs, recalls, tonightOr, raise } from './kit.js';

const W = 'kexin';
const K = (zh, en) => [W, zh, en], N = (zh, en) => ['nar', zh, en];
const day = (L) => L.clock.day;
const said = (L, k) => !!(heart(L, W).said || {})[k];
const barNight = (L) => [1, 3, 5, 7, 9].includes(day(L)) && between(L, H(20, 15), H(23, 30));
const inHangzhou = (L) => heart(L, W).settled === 'moved' || (heart(L, W).stage === 'over' && (heart(L, W).over || {}).why === 'moved');

const P = {
  id: W, name: B('唐可昕', 'Tang Kexin'), short: B('可昕', 'Kexin'), age: 25, sex: 'f', color: '#c0507a', avatar: ['c3', 'c2', 'c8'], voice: { pitch: 1.14, rate: 1.12 },
  role: B('生活方式博主，小红书 18 万 / 抖音 9 万', 'Lifestyle creator: 180K on Xiaohongshu, 90K on Douyin'),
  ambition: B('年底五十万粉；一个自己的小牌子，不再只替别人带货', "Half a million followers by the year's end; a small label of her own, not just selling other people's things"),
  how: 'You met him at the Peace Hotel Jazz Bar, where you were filming and he walked through your shot; you both know Momo (Zhou Zimo), whom you call 墨老师.',
  calls: B('纪白', 'Ji Bai'),
  card: "Tang Kexin (唐可昕), 25, from Suzhou, lives in Jing'an; a lifestyle and fashion creator with about 180,000 followers on Xiaohongshu and 90,000 on Douyin (her account is 可昕今天穿什么, \"What Kexin Wore Today\"); two years as a buyer's assistant at a department store before going full-time; earns from brand events, try-ons and night-out vlogs and works harder than anyone watching would guess; wants a small label of her own rather than being the face of other people's products; funny, quick, performs confidence, privately anxious about her numbers; since a follower found her building from a reflection in a window she never posts a place until she has left it and never shows where she lives; talks fast, with internet slang and the odd emoji in text; knows Momo from gigs and calls him 墨老师",
  arc: {
    1: B('一周三个品牌活动，一条夜生活 vlog。粉丝卡在十八万。', 'Three brand events a week and a night-out vlog. Stuck at 180,000 followers.'),
    2: B('说了一句实话，掉了四百个粉。有人愿意出六位数买她的“恋爱日常”。', 'She told the truth once and lost four hundred followers. Someone will pay six figures for her "love life".'),
    3: B('杭州的 MCN 要签她：搬过去，两年，内容他们定。', 'A Hangzhou agency wants to sign her: move there, two years, they decide the content.'),
    4: B('要么是自己的牌子“昕”，第一批二十件；要么是杭州。', 'Either her own label, "Xin", twenty pieces in the first run; or Hangzhou.'),
    5: B('她学会了有些日子什么都不发。', 'She has learned that on some days you post nothing.'),
  },
  schedule(L) {
    const m = tod(L);
    if (inHangzhou(L)) return { spot: null, doing: B('在杭州，MCN 的直播基地', "in Hangzhou, at the agency's streaming base"), free: true };
    if (m >= H(2) && m < H(9, 30)) return { spot: null, doing: B('睡着（她两点才卸完妆）', "asleep (it was two before her make-up was off)"), free: false };
    if (barNight(L)) return { spot: 'jazzFloor', doing: B('在和平饭店爵士吧拍今晚的素材', "at the Peace Hotel Jazz Bar filming tonight's material"), free: true };
    if (m >= H(10) && m < H(18)) return { spot: null, doing: B('在安福路拍穿搭，或者在家剪片子', 'shooting outfits on Anfu Road, or at home editing'), free: true };
    return { spot: null, doing: B('在某个品牌的活动上，笑着', "at some brand's event, smiling"), free: true };
  },
  memories: {
    'k-bar': B('在爵士吧，他从她的镜头前面走了过去，入镜两秒。她问他能不能留着。', 'At the Jazz Bar he walked through her shot: two seconds on camera. She asked whether she could keep them.'),
    'in-her-vlog': B('他让她留下了那两秒。评论区有人问“这个路人是谁”。', 'He let her keep the two seconds. Someone in the comments asked who the passer-by was.'),
    'blurred': B('他让她把脸挡上。她贴了一只小猫。', 'He asked her to cover his face. She stuck a cat on it.'),
    'said-no': B('他直接说了“别发”。她剪掉了，说会直接说“不”的人现在很少。', 'He said "please don\'t" outright. She cut it, and told him not many people just say no any more.'),
    'k-shengjian': B('她没化妆，没拿手机，带他在南京路吃了生煎。那顿不是内容，是她自己想吃。', "With no make-up and no phone out, she took him for shengjian on Nanjing Road. It wasn't content. She just wanted to eat."),
    'the-stalker': B('她告诉他：去年有人从她窗户的反光里认出了小区，在楼下等了三天。', 'She told him that last year someone worked out her compound from a reflection in her window and waited downstairs for three days.'),
    'private-life': B('他说他介意被拍到发上网。她答应：他出现在她账号上的每一秒，都先问他。', 'He told her he would mind being photographed and posted. She promised: every second of him on her account, she asks first.'),
    'ok-public': B('他说不介意被拍到跟她在一起。', "He said he wouldn't mind being photographed with her."),
    'truth-cost': B('她因为说了一句面霜不值那个价，掉了四百个粉。他说：掉的是该掉的。', "She lost four hundred followers for saying a face cream wasn't worth the price. He said: the ones who left were the ones who should."),
    'k-jazz': B('香水发布会散场以后，她脱了高跟鞋，告诉他有八卦号拍到了他们，品牌方想出六位数做“情侣日常”。', 'After the perfume launch she kicked off her heels and told him a gossip account had got the two of them, and a brand would pay six figures for a "couple" series.'),
    'couple-series': B('他答应陪她拍“情侣日常”。约法三章：不拍他公司，不拍他住哪儿，他说停就停。', 'He agreed to make the "couple" series with her. Three rules: his firm never appears, where he lives never appears, and when he says stop they stop.'),
    'not-for-sale': B('他说：我们的事不卖。她放弃了那六位数。', 'He said: what\'s ours isn\'t for sale. She turned the six figures down.'),
    'the-label': B('她想做自己的牌子，二十件衣服，一件一件卖。他说可以帮她搭小程序。她说给他百分之五。', 'She wants her own label: twenty pieces, sold one at a time. He offered to build her mini-program. She offered him five per cent.'),
    'said-yes-live': B('直播里有人问她是不是恋爱了，她说了“是”，然后才想起来没问他。', 'On a live stream someone asked whether she was in love. She said yes, and only then remembered she had not asked him.'),
    'her-own': B('杭州的 MCN 要签她的时候，他提醒她：你想做的是自己的牌子，不是他们的。', 'When the Hangzhou agency wanted to sign her, he reminded her that the label she wanted was her own, not theirs.'),
    'kexin-night': B('有一晚她从后门上了楼，因为大堂有人在拍。', 'One night she came upstairs by the back way, because someone was filming in the lobby.'),
  },
  lines: {
    accept: B('好耶。我不化妆去，你别吓到。', "Yay. I'm coming without make-up. Brace yourself."), decline: B('好吧～那我约别的局了。', "OK~ I'll find another plan then."), missed: B('已读不回是吧。行。', 'Read and no reply, is it. Right.'),
    stood: B('我在门口站了四十分钟，被认出来两次，合了三张影。你人呢？', 'I stood at the door for forty minutes, got recognised twice and posed for three photos. Where were you?'),
    quiet: B('不回就算了。我私信里每天有两百个人想跟我说话，不差你一个。', "Don't answer, then. Two hundred people a day want to talk to me in my DMs. I can spare you."),
    left: B('我们算了吧。我每天对着镜头假装被人喜欢，回到家不想再猜一个人到底喜不喜欢我。——放心，我不会发任何东西。', "Let's call it off. I pretend to be liked on camera all day. I don't want to come home and guess whether one person likes me. — Don't worry. I won't post a thing."),
    two: B('有粉丝私信我，说在外滩看见你跟别人。照片都发来了。你有十秒钟组织语言。', "A follower messaged me to say she saw you on the Bund with someone else. She sent the photo. You have ten seconds to find your words."),
    chosen: B('……行。这次我信。别让我在自己的评论区里知道第二次。', "...All right. This time I believe you. Don't let me learn it a second time from my own comments."),
    twoGone: B('评论区比我先知道你还有别人。我的工作就是被人看，我受不了连这个也是被人看着知道的。别找我了。', "My comments knew before I did that there was someone else. Being watched is my job. I can't bear to have learned this while being watched as well. Don't contact me."),
    ended: B('ok。我不会发任何东西，你放心。', "ok. I won't post a thing. Don't worry."),
    fight: B('我看见了！！你没事吧？？……旁边有人在拍，我让他删了，他不删我就让我十八万粉去找他。', "I saw!! Are you all right?? ...Someone was filming. I told him to delete it. If he won't, I'll send a hundred and eighty thousand followers to ask him."),
    heard: B('听说你跟人打起来了？有视频流出来吗？有的话先发我，我认识做公关的。', "I hear you got into a fight? Is there video out? If there is, send it to me first. I know people in PR."),
    online: B('你上热搜尾巴了。别回应，别点赞，别删。四十八小时就过去了，信我。', "You're on the tail end of the trending list. Don't respond, don't like anything, don't delete. It passes in forty-eight hours. Trust me."),
    hurt: B('你的脸！！别动，我包里有遮瑕。……不是，先去医院，然后遮瑕。', "Your face!! Hold still, I've concealer in my bag. ...No. Hospital first. Then concealer."),
    onesided: B('每次都是我先找你诶。我可是有十八万粉的人，给点面子。', "It's always me who writes first, you know. I have a hundred and eighty thousand followers. Have some respect."),
    yes: B('可以呀！', 'Yes!'), busy: B('这周三个活动两场直播，我是陀螺。下周！', "Three events and two streams this week. I'm a spinning top. Next week!"), mood: B('最近状态不好，不想见人。等我好了找你。', "I'm in a bad patch and don't want to see anyone. I'll find you when I'm better."), away: B('在外地拍东西，回来说～', "Out of town on a shoot. When I'm back~"), later: B('最近真的排不开，等我忙完这一波。', "I really can't fit it in just now. When this rush is over."),
    hello: B('嘘，我在录。……好了。你今天这件外套可以，谁挑的？', "Shh, I'm recording. ...Done. That jacket works today. Who picked it?"),
    morning: B('她走的时候戴着你的棒球帽，从后门。桌上留了一支用了一半的口红：押金，下次来取。', 'She left by the back way wearing your baseball cap. On the desk is a half-used lipstick: a deposit, to be collected next time.'),
    career: {
      resigned: B('辞职了？！那你现在可以出镜了对吧。——开玩笑的。恭喜，自由人。', "You quit?! So you can go on camera now, right? — Joking. Congratulations, free man."),
      laidoff: B('啊……抱抱。今晚请你吃好的，不拍，不发，我保证。', "Oh... come here. I'm buying you a proper dinner tonight. No filming, no posting. Promise."),
      startup: B('自己创业！！你缺不缺一个会带货的合伙人？我说真的。', "Your own company!! Do you need a partner who knows how to sell? I'm serious."),
      family: B('回南京接家里的厂。……那你以后是“厂二代”了，这个人设在小红书上很吃香的。', "Back to Nanjing to take over the family works. ...A \"factory heir\". That persona does very well on Xiaohongshu, you know."),
      switched: B('跳槽了？新公司管不管员工谈恋爱被拍？我先问清楚。', "A new job? Does the new firm mind its people being photographed on dates? I'd like that clear in advance."),
    },
    canned: { zh: ['在化妆，一只手回你', '哈哈哈哈', '等下，我在直播，下播说', '收到～'], en: ['Doing my make-up. Typing with one hand', 'Hahaha', "Hang on, I'm live. After the stream", 'Got it~'] },
  },
  dates: {
    'k-shengjian': { hm: [20, 0], needs: 'k-bar', days: [1, 12], title: B('吃生煎', 'Shengjian'), place: B('南京东路 · 生煎店门口', 'Nanjing Road East · outside the shengjian shop'), text: B('今天收工早。带你去吃生煎，南京路上那家。我做探店从来不拍它：拍了就要排队了。八点，店门口。', "I'm done early today. I'm taking you for shengjian, the place on Nanjing Road. I never film it for my food posts: if I did there'd be a queue. Eight, outside the shop."), yes: B('好，八点。', 'OK. Eight.'), no: B('今晚不行。', 'Not tonight.') },
    'k-jazz': { hm: [21, 30], needs: 'k-shengjian', days: [2, 13], title: B('发布会散场以后', 'After the launch'), place: B('和平饭店 · 爵士吧', 'Peace Hotel · the Jazz Bar'), text: B('今晚爵士吧有个香水的发布，我是嘉宾。结束以后那张桌子归我。来陪我坐到散场，不拍你。九点半。', "There's a perfume launch at the Jazz Bar tonight and I'm a guest. Afterwards the table is mine. Come and sit with me until closing. I won't film you. Half nine."), yes: B('我下来。', "I'll come down."), no: B('今晚不行。', 'Not tonight.') },
  },
  beats: [
    { id: 'k1', when: (L) => dayAfter(L, W, 'k-bar', 12, 30), run: (L) => {
      if (recalls(L, W, 'in-her-vlog')) say(L, W, '视频发了。你那两秒，评论区有人问“这个路人是谁”😂 我回的是“路人”。', 'The video is up. Your two seconds: someone in the comments asked "who\'s the passer-by" 😂 I answered "a passer-by".', [
        R('“路人”听着有点惨。', '"A passer-by" sounds a bit bleak.', { a: 3 }, '那升级成“朋友”？要申请的哦', 'An upgrade to "friend", then? You have to apply'),
        R('别再回了，让它沉下去。', "Don't answer any more. Let it sink.", { t: 2 }, '懂。已经不回了。', "Understood. I've stopped."),
      ]);
      else if (recalls(L, W, 'blurred')) say(L, W, '发了。小猫贴纸的点赞比我的脸还多，我有点受伤😂', 'Posted. The cat sticker got more likes than my face. I\'m a little hurt 😂');
      else say(L, W, '昨天那条我真剪了。成片里没有你，安心上班。', "I really did cut it. You're not in the finished video. Go to work in peace.");
    } },
    { id: 'k2', when: (L) => dayAfter(L, W, 'k-bar', 17, 30), until: () => D(10, 19, 0), run: (L) => askOut(L, W, 'k-shengjian', P.dates['k-shengjian'], tonightOr(L, 20, 0, 60)) },
    { id: 'k3', when: (L) => dayAfter(L, W, 'k-shengjian', 23, 10), until: () => D(12, 23, 0), run: (L) => say(L, W, '今天掉了四百个粉。就因为我说了一句那个面霜不值那个价。品牌方打电话骂了我二十分钟。', "I lost four hundred followers today. All because I said that face cream wasn't worth the price. The brand rang and shouted at me for twenty minutes.", [
      R('你说的是实话。掉的是该掉的。', 'You told the truth. The ones who left are the ones who should.', { t: 5, a: 2, mem: 'truth-cost' }, '……这句话我截图了。心情不好的时候看。', "...I've screenshotted that. For bad days."),
      R('数据会回来的。', "The numbers will come back.", { t: 1 }, '嗯。会吧。', 'Mm. I suppose.'),
    ]) },
    { id: 'k4', when: (L) => { const d0 = done(L, 'k-shengjian'); return d0 ? Math.max(D(8, 18, 0), D(Math.floor(d0 / 1440) + 1, 18, 0)) : null; }, until: () => D(12, 20, 30), run: (L) => askOut(L, W, 'k-jazz', P.dates['k-jazz'], tonightOr(L, 21, 30, 60)) },
    { id: 'k5', urgent: true, when: (L) => dayAfter(L, W, 'k-jazz', 21, 0), until: () => D(13, 10, 0), if: (L) => isSeeing(L, W), run: (L) => { remember(L, W, 'said-yes-live'); say(L, W, '今天直播有人问“你是不是恋爱了”。我说“是”。——然后才想起来没问你。对不起。', 'On the stream today someone asked "are you in love". I said "yes". — And only then remembered I hadn\'t asked you. Sorry.', [
      R('说得好。', 'Well said.', { a: 3, t: 2, decide: 'commit' }, '！！那我可以发那张你的手了？就手。', "!! Then may I post the one of your hand? Just the hand."),
      R('下次先问我。', 'Next time, ask me first.', { t: 2, ev: 'k-asked-first' }, '我知道。我错了。直播回放我剪了。', "I know. I was wrong. I've cut it from the replay."),
      R('我不想被说成谁的男朋友。', "I don't want to be described as anyone's boyfriend.", { a: -6, t: -2 }, '……好。知道了。', '...OK. Understood.'),
    ]); } },
    { id: 'k6', urgent: true, when: () => D(11, 20, 0), until: () => D(12, 23, 0), if: (L) => inLife(L, W), run: (L) => say(L, W, '杭州一家 MCN 要签我，包装成“沪上精致生活”的头部。条件是搬去杭州，两年，内容他们定。', 'A Hangzhou agency wants to sign me and build me into the top "refined Shanghai life" account. The terms: move to Hangzhou, two years, they decide the content.', [
      R('你想做的是自己的牌子，不是他们的。', 'The label you want is your own, not theirs.', { t: 6, a: 2, mem: 'her-own' }, '……你怎么总记得我随口说的话。', '...How do you always remember the things I say in passing?'),
      R('钱多就签。', 'If the money is good, sign.', { t: -3, a: -2 }, '连你也觉得我只值这个。', 'So you think that is all I am worth too.'),
      R('别走。', "Don't go.", { a: 2 }, '给我一个不走的理由。——算了，这话问得不公平。', "Give me a reason to stay. — No. That's not a fair thing to ask."),
    ]) },
    { id: 'k7', urgent: true, when: () => D(13, 12, 0), until: () => D(14, 12, 0), if: (L) => inLife(L, W), run: (L) => { const why = P.end(L); if (why) leave(L, W, why); } },
    { id: 'k8', when: () => D(15, 22, 30), until: () => D(16, 12, 0), if: (L) => inLife(L, W) && heart(L, W).settled === 'label', run: (L) => say(L, W, '[图片] 二十件，四十分钟卖完。我在仓库地上坐着哭了十分钟，妆全花了，没拍。', '[Photo] Twenty pieces, sold out in forty minutes. I sat on the warehouse floor and cried for ten. My make-up was everywhere. I didn\'t film it.', [
      R('我去接你。', "I'm coming to fetch you.", { a: 3, t: 3 }, '带纸巾。还有生煎。', 'Bring tissues. And shengjian.'),
      R('恭喜，唐老板。', 'Congratulations, Boss Tang.', { a: 2 }, '再叫一遍，我录下来当闹钟。', "Say that again. I'm recording it as my alarm."),
    ]) },
    { id: 'k9', when: () => D(16, 21, 0), until: () => D(17, 12, 0), if: (L) => isSeeing(L, W), run: (L) => say(L, W, '下个月你跟你爸吃饭那天，我什么都不发。那天是你的。', "The day of your dinner with your father next month, I'm posting nothing at all. That day is yours.") },
  ],
  scenes: {
    'k-bar': { who: W, spot: 'jazzFloor', kind: 'talk', label: B('一个在拍视频的女孩', 'A young woman filming'), action: B('走过去', 'Go over'),
      on: (L) => heart(L, W).stage === 'stranger' && barNight(L),
      script: (L) => [
        N('一个女孩举着手机在拍台上的三重奏，另一只手里的补光灯只有口红那么大。你正好从她镜头前面走了过去。', 'A young woman is filming the trio with her phone, a fill light no bigger than a lipstick in her other hand. You have just walked straight through her shot.'),
        K('哎——没事没事，你接着走。……等下，你回来。', "Oh — no, it's fine, carry on. ...Wait. Come back."),
        K('你刚才入镜了，两秒。侧脸，光正好。我能留着吗？不@你，不打名字。', "You were in shot just now, for two seconds. In profile, and the light was right. May I keep it? I won't tag you or name you."),
        ask(L, W,
          A('留吧。', 'Keep it.', { a: 3, ev: 'k-posted' }, K('爽快！发之前我给你看一眼。', "Easy! I'll show you before it goes up.")),
          A('把脸挡一下可以。', 'If you cover my face.', { t: 3, mem: 'blurred' }, K('行，贴只小猫。……你是第一个既不说“随便”也不说“不行”的。', "Done. I'll stick a cat on it. ...You're the first who has said neither \"whatever\" nor \"no\".")),
          A('别发。我在咨询公司上班，不方便。', "Please don't. I work at a consulting firm. It's awkward.", { t: 4, a: -1, mem: 'said-no' }, K('好，剪掉。——会直接说“不”的人现在很少了，我说真的。', "OK, it's cut. — Not many people just say no these days. I mean that."))),
        K('我是可昕。小红书上那个“可昕今天穿什么”，十八万粉。不算多，够养活自己。', 'I\'m Kexin. "What Kexin Wore Today" on Xiaohongshu. A hundred and eighty thousand followers. Not a lot. Enough to live on.'),
        ask(L, W,
          A('纪白。Momo 的朋友。', "Ji Bai. A friend of Momo's.", { t: 2 }, K('墨老师的朋友！那你就是那个“从硅谷回来的白白”。他直播里说过你。', 'A friend of Maestro Mo\'s! Then you\'re "Baibai, back from Silicon Valley". He has mentioned you on his stream.')),
          A('十八万人看你穿什么？', 'A hundred and eighty thousand people watch what you wear?', { a: 2 }, K('十八万人看我“怎么过”。穿什么只是门票。', 'A hundred and eighty thousand people watch how I live. The clothes are just the ticket in.'))),
        K('加个微信吧。放心，我不拉你进粉丝群。', "Let's add each other on WeChat. Don't worry, I won't put you in the fan group."),
      ] },
    'k-shengjian': { who: W, spot: 'shengjian', kind: 'date', date: 'k-shengjian', label: B('可昕', 'Kexin'), action: B('走过去', 'Go over'),
      on: (L) => dateOn(L, 'k-shengjian'),
      script: (L) => [
        N('她没化妆，棒球帽压得很低，手里已经端着两盒。', "She's wearing no make-up and a baseball cap pulled well down, and she's already holding two boxes."),
        K('先咬个小口，吸汤，再吃。烫到了我不负责。', 'Bite a small hole, drink the soup, then eat. I take no responsibility for burns.'),
        K('你发现没有，我今天没拿手机。', "Have you noticed? I haven't got my phone out."),
        ask(L, W,
          A('发现了。为什么？', 'I had. Why not?', { a: 3 }, K('因为这顿不是内容。是我自己想吃。', "Because this isn't content. I just wanted to eat.")),
          A('不拍一下？这光挺好。', "Not going to film? The light's rather good.", { a: -1, t: -1 }, K('……连你也这么说。不拍。', '...Not you as well. No.')),
          A('帽子压这么低，怕被认出来？', 'The cap is very low. Afraid of being recognised?', { t: 3, mem: 'the-stalker' }, K('去年有人从我窗户的反光里认出了小区，在楼下等了三天。从那以后，我住哪儿、吃哪儿，都晚一天再发。', 'Last year someone worked out my compound from a reflection in my window and waited downstairs for three days. Since then, where I live and where I eat goes up a day late.'))),
        K('问你个事，你要说实话。跟我走在一起，被人拍到发上网，你介意吗？', 'A question, and I want the truth. If someone photographed us together and it ended up online, would you mind?'),
        ask(L, W,
          A('不介意。', "I wouldn't mind.", { a: 4, mem: 'ok-public' }, K('真的？你们公司不管这个？……那我就不躲着走了。', "Really? Your firm doesn't police that? ...Then I'll stop walking in the shadows.")),
          A('介意。我想让我的生活是我自己的。', 'I would. I want my life to be my own.', { t: 5, mem: 'private-life' }, N('她点头，很认真。', 'She nods, quite seriously.'), K('好。那你出现在我这儿的每一秒，我都先问你。', 'All right. Then every second of you that appears on my account, I ask first.')),
          A('看拍成什么样。', 'It depends how I look.', { a: 1 }, K('实用主义者。行，我保证只留好看的角度。', 'A pragmatist. Fine. Flattering angles only, I promise.'))),
        K('吃完陪我走到地铁口。走慢点，我今天穿的是平底鞋，难得。', "Walk me to the metro when we've eaten. Slowly. I'm in flats for once."),
        ask(L, W,
          A('这算约会吗？', 'Is this a date?', { a: 4, decide: 'step' }, K('算呀。不然我为什么不化妆？给你看真的。', "Of course it is. Why else would I come without make-up? You're getting the real one.")),
          A('（陪她走）', '(Walk with her.)', { t: 2 }, N('一路上她讲了三个品牌方的坏话，讲得很好笑。', 'All the way there she is very funny about three of her brand clients.'))),
      ] },
    'k-jazz': { who: W, spot: 'jazzTable', seat: true, kind: 'date', date: 'k-jazz', pass: 70, label: B('可昕', 'Kexin'), action: B('坐下', 'Sit down'),
      on: (L) => dateOn(L, 'k-jazz'),
      script: (L) => [
        N('发布会刚散，桌上还留着品牌的小卡片。她把高跟鞋脱了，脚踩在椅子的横档上。', "The launch has just broken up; the brand's little cards are still on the table. She has slipped off her heels and hooked her feet on the rung of the chair."),
        K('我今晚笑了三个小时，脸是僵的。你摸。', "I've been smiling for three hours. My face has set. Feel."),
        ask(L, W,
          A('（碰了一下她的脸）', '(Touch her cheek.)', { a: 4 }, N('她没有躲。', "She doesn't move away."), K('……手凉。舒服。', "...Cold hands. That's nice.")),
          A('辛苦了。喝什么？', 'You must be worn out. What will you drink?', { t: 2 }, K('白水。镜头前那杯香槟我一口没咽，含着，吐了。', "Water. I didn't swallow a drop of that champagne on camera. Held it in my mouth and spat."))),
        K('有个事。有个八卦号拍到我们上次在生煎店门口，配的字是：“唐可昕新男友，疑似陆家嘴某咨询公司”。', 'There\'s something. A gossip account got us outside the shengjian shop. The caption: "Tang Kexin\'s new boyfriend, said to be at a Lujiazui consultancy".'),
        K('品牌方看到了，问我要不要干脆做一个“情侣日常”系列。六位数。', 'A brand has seen it. They\'re asking if I would simply make a "couple\'s daily life" series. Six figures.'),
        ask(L, W,
          A('做。我陪你拍。', "Do it. I'll make it with you.", { a: 3, ev: 'k-public' }, K('你确定？拍了就收不回来了。你们全组的人都会看到你给我拎包。', "You're sure? It can't be taken back. Your whole team will watch you carry my bag."), K('……好。约法三章：不拍你公司，不拍你住哪儿，你说停就停。', '...All right. Three rules: your firm never appears, where you live never appears, and when you say stop, we stop.')),
          A('不做。我们的事不卖。', "No. What's ours isn't for sale.", { t: 7, a: 2, mem: 'not-for-sale' }, N('她沉默了一会儿。', 'She is silent for a moment.'), K('六位数呢。……但你说“我们的事”的时候，我挺高兴的。不做。', 'It\'s six figures. ...But I liked hearing you say "ours". No series.')),
          A('这是你的工作，你定。', "It's your work. Your decision.", { t: -3, a: -1 }, K('这不是我一个人的事。……算了，我自己想。', "It isn't only mine to decide. ...Never mind. I'll think about it myself."))),
        K('我其实不想一辈子拍别人的东西。我想做自己的牌子，就二十件衣服，一件一件卖。', "I don't actually want to film other people's products all my life. I want my own label. Twenty pieces. Sold one at a time."),
        ask(L, W,
          A('要人帮你算账、搭小程序的话，我在。', "If you need someone to do the sums and build the mini-program, I'm here.", { t: 5, a: 3, mem: 'the-label' }, K('你？给我搭小程序？……那我得给你股份。百分之五，不能再多了。', "You? Build my mini-program? ...Then I'd have to give you equity. Five per cent. Not a point more.")),
          A('那就做。', 'Then do it.', { a: 2 }, K('说得轻巧。……不过听着挺舒服的。', 'Easy for you to say. ...Nice to hear, though.'))),
        ask(L, W,
          A('我住楼上。', 'I live upstairs.', upstairs(W, [K('我知道你住楼上，我做过功课的。——走后门，大堂有人在拍。', "I know you live upstairs. I do my research. — The back way. Someone's filming in the lobby.")], [K('今天不行，妆太厚了，卸要一个小时。下次。', "Not tonight. This much make-up takes an hour to get off. Next time.")])),
          A('我帮你叫车。', "I'll call you a car.", { t: 2 }, K('叫到后门。谢谢。', 'To the back door. Thank you.'))),
      ] },
  },
  events: {
    'k-posted': (L) => { remember(L, W, 'in-her-vlog'); rep(L, 'online', 2, 'two seconds in a vlog'); gainFollowers(L, 120); fact(L, 'posted-online', { by: W, what: 'two seconds of him in her Jazz Bar vlog' }, [W]); raise(L, { type: 'posted-online', by: W, couple: false }); },
    'k-public': (L) => { remember(L, W, 'couple-series'); heart(L, W).said.public = stamp(L); rep(L, 'online', 6, 'the couple series'); standing(L, -3); gainFollowers(L, 2400); fact(L, 'posted-online', { by: W, what: 'a "couple\'s daily life" series with him in it' }, [W]); raise(L, { type: 'posted-online', by: W, couple: true }); },
    'k-asked-first': (L) => { if (recalls(L, W, 'private-life')) feel(L, W, { trust: 2 }, 'kept-her-to-it'); },
  },
  // June: her own label, or Hangzhou
  end(L) {
    const h = heart(L, W), own = recalls(L, W, 'her-own') || recalls(L, W, 'the-label');
    if ((own && h.trust >= 40) || (h.stage === 'together')) { h.settled = 'label'; say(L, W, '没签。牌子的名字想好了，叫“昕”。第一批二十件，九月上。', 'I didn\'t sign. The label has a name: "Xin". Twenty pieces in the first run, out in September.'); if (recalls(L, W, 'the-label')) say(L, W, '你那百分之五还作数。小程序什么时候给我？', 'Your five per cent still stands. When do I get my mini-program?'); return null; }
    say(L, W, '签了。下个月搬杭州。上海的夜景，替我多看两眼。', "I've signed. I move to Hangzhou next month. Look at the Shanghai lights twice for me.");
    if (isSeeing(L, W)) return 'moved';
    h.settled = 'moved'; return null;
  },
  epilogue(L, h) {
    if (h.stage === 'together') return B('“昕”的第二批是四十件。详情页最下面有一行很小的字：小程序 by J.B.。和爸爸吃饭那天，可昕的账号一整天没有更新。', 'The second run of "Xin" was forty pieces. At the bottom of the product page, in very small type: mini-program by J.B. On the day of your dinner with your father, Kexin\'s account posted nothing all day.');
    if (h.stage === 'dating') return B('可昕的账号上偶尔出现一只手、半个肩膀。评论区猜了一年，没有人猜对。', "A hand turns up on Kexin's account now and then, or half a shoulder. The comments have been guessing for a year. Nobody has got it right.");
    if (h.stage === 'over' && h.over && h.over.why === 'moved') return B('可昕去了杭州。她的账号涨到了六十万，视频里的人笑得和以前一样好看。', "Kexin went to Hangzhou. Her account has reached six hundred thousand, and the person in the videos smiles as beautifully as ever.");
    if (h.stage === 'over' && h.over && ['dating', 'together'].includes(h.over.was)) return B('可昕没有发过任何关于你的东西。那支口红还在你桌上。', 'Kexin never posted a word about you. The lipstick is still on your desk.');
    return null;
  },
};
export default P;
