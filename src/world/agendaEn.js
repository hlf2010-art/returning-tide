// English for everything the friends, family and services say on the phone (world/agenda.js and
// the services). The messages are written, and stored, in Chinese, the way these people would
// write them; the phone shows this translation when the interface is in English.
import { EN_WORK } from './work.js';
import { EN_CAREER } from './career.js';
import { EN_HEARTS } from './romance.js';
import { EN_FIGHT } from '../engine/fight.js';
import { EN_ROAD } from './roadFallout.js';
export const EN = {
  // the days after (world/agenda.js BEATS, round two)
  '王总说下周约你吃饭，这次真要穿正式点了😂': "Mr Wang wants dinner with you next week. Dress properly this time 😂",
  "今天在和平饭店顶层测绘，屋顶的铜皮比图纸上老三十年。你那个612住得惯吗？": "Surveying the top of the Peace Hotel today. The copper on the roof is thirty years older than the drawings say. How's 612 treating you?",
  "住得惯，窗外就是江。": "Fine. The river's right outside.",
  "那是我们去年修的窗框。不客气。": "We restored those window frames last year. You're welcome.",
  "你在楼上？我下来请你喝咖啡。": "You're upstairs? I'll come and buy you a coffee.",
  "今天没空。改天，你欠我一杯。": "No time today. Another day. You owe me one.",
  "明晚来友邦大楼？我们在修大堂的天花，我带你进闸机里面看看，平时谁都进不去。": "Come to the AIA Building tomorrow night? We're restoring the lobby ceiling. I'll take you past the gates; nobody gets in there normally.",
  "友邦大楼 · 大堂天花": "AIA Building · the lobby ceiling",
  "友邦大楼（外滩17号）": "AIA Building (No.17, the Bund)",
  "明晚七点，友邦大楼大堂，我在闸机那儿等你。": "Tomorrow, seven, the AIA lobby. I'll be at the gates.",
  "好，七点见": "OK, see you at seven",
  "明晚不行": "Can't tomorrow night",
  "白白，帮个忙。我想给赛车做个数据记录仪：CAN总线读转速和刹车压力，GPS记圈速，再加个陀螺仪看G值。你会做吧？零件我出，送到你那个创客空间。": "Baibai, a favour. I want a data logger for my race car: revs and brake pressure off the CAN bus, GPS for lap times, a gyro for the g-forces. You can build that, right? I'll pay for the parts and send them to your makerspace.",
  "会。零件寄过来吧。": "Yes. Send the parts.",
  "就知道你行。闪送已经在路上了，杨浦那个空间对吧？": "Knew it. The courier's on the way. The Yangpu place, right?",
  "最近有点忙……": "I'm a bit busy right now...",
  "行吧，大忙人。": "Fine, Mr Busy.",
  "零件到了，阿凯签收的。图纸在你工作台上（要创客2级才看得懂，哈哈）。": "The parts arrived; Kai signed for them. The drawings are on your bench (you'll need Maker 2 to read them, ha).",
  "记录仪我装上了！数据太干净了。这周六天马跑一天，你来，开你的车。": "The logger's in! The data is so clean. Track day at Tianma this Saturday. Come, and bring your car.",
  "记录仪我装上了！这周六天马，你来。": "The logger's in! Tianma this Saturday. Come.",
  "天马赛车场 · 赛道日": "Tianma Circuit · track day",
  "天马赛车场": "Tianma Circuit",
  "周六早上十点，天马。": "Saturday, ten in the morning, Tianma.",
  "去！": "I'm in!",
  "这周不行": "Can't this week",
  "白白！！你房间几号？我今晚被房东锁门外了……就睡一晚沙发，明早就走，发誓": "Baibai!! What's your room number? My landlord locked me out tonight... just one night on the sofa, gone in the morning, I swear",
  "612，上来吧。前台我打招呼。": "612. Come up. I'll tell the front desk.",
  "你是我亲哥！！马上到": "You're my brother!! On my way",
  "自己找个酒店。": "Find yourself a hotel.",
  "……行，冷漠的资本家": "...Fine, heartless capitalist",
  "谢了兄弟🙏 你的充电器我先借走了，下次还你（大概）": "Thanks bro 🙏 I've borrowed your charger, will give it back (probably)",
  "我发了个视频：白白的车在外滩，配了我的钢琴。一晚上80万播放🔥 你多了好几千粉丝，不用谢": "I posted a video: Baibai's car on the Bund, with my piano over it. 800k plays overnight 🔥 You've got thousands of new followers. You're welcome",
  "周五客户和投资人都来看演示。学长说今天的主角是你那个模型，你来压个场？": "The customer and the investors are coming to the demo on Friday. Zhou says the star of the show is your model. Come and back us up?",
  // the morning after the review, if what he offered was software he'd write (world/story.js ARM_NEWS)
  "学长让我转给你：日志一跑就对上了，每次掉件前三十毫秒都是转腕的冲击峰。你那个抓取点模型今早上了，掉件率从一成二降到不到百分之一。": "Zhou asked me to pass this on: the logs matched straight away. Every drop comes thirty milliseconds after the peak jerk on the wrist turn. Your grasp-point model went on this morning, and drops are down from twelve per cent to under one.",
  "学长说你那个抓取点模型今早上了，掉件率从一成二降到不到百分之一。他问你半夜三点发代码是不是硅谷的习惯。": "Zhou says your grasp-point model went on this morning, and drops are down from twelve per cent to under one. He wants to know whether sending code at three in the morning is a Silicon Valley habit.",
  "小唐把压电薄膜贴进指尖了，你那个模型在单片机上跑，四毫秒一次。抹了油的件，一个没掉。学长说要请你吃饭。": "Tang has stuck the piezo film into the fingertips, and your model runs on the microcontroller, four milliseconds a pass. Oiled parts, and not one dropped. Zhou says dinner's on him.",
  "学长说换了指垫以后一个都没掉！周五客户和投资人都来看演示，你来压个场？": "Zhou says with the new pads it hasn't dropped a single one! The customer and the investors are coming to the demo on Friday. Come and back us up?",
  "机械臂演示日": "Robot-arm demo day",
  "周五下午三点，IFC 32楼。": "Friday, 3 pm, IFC 32nd floor.",
  "去": "I'll be there",
  "周五有事": "Busy on Friday",
  "上次谢了。学长说你那句话点醒他了。顾问的事你再想想？": "Thanks for last time. Zhou says what you said opened his eyes. Think about advising them again?",
  "有个做硬件的投资人想认识你，说看过你在硅谷做的产品。下周一起吃个饭？": "A hardware investor wants to meet you. He's seen what you shipped in the Valley. Dinner next week?",
  "可以，你约。": "Sure, set it up.",
  "好，我订个地方。别穿你那件工装外套。": "OK, I'll book somewhere. Don't wear that work jacket.",
  "先不用，我想自己先做点东西。": "Not yet. I want to build something of my own first.",
  "有骨气。那等你做出来。": "Respect. I'll wait till you've built it.",
  "我跟家里说了，不买。我想先自己找个小地方住。……他们不太高兴。": "I told my family: I'm not buying it. I want to find a small place of my own first. ...They're not happy.",
  "签了。家里很高兴。": "Signed. My family are delighted.",
  "我在看武康路的老公寓了。程家的人租房子，我妈差点没晕过去。": "I'm looking at old flats on Wukang Road. A Cheng renting: my mother nearly fainted.",
  "我自己定了。": "I decided myself.",
  "家里订了直升机，明晚飞外滩。我不想一个人去。": "My family booked a helicopter over the Bund tomorrow night. I don't want to go alone.",
  "夜航 · 外滩上空": "A night flight over the Bund",
  "浦东直升机停机坪": "Pudong heliport",
  "明晚八点，浦东停机坪。": "Tomorrow, eight pm, the Pudong heliport.",
  "我陪你": "I'll come with you",
  "白白，妈妈看到你朋友圈了，那个车……你爸还不知道。你自己注意安全，按时吃饭。": "Baibai, Mum saw your Moments. That car... your father doesn't know yet. Be careful, and eat properly.",
  "白白，到上海好几天了，吃得惯吗？有空给你爸打个电话，他嘴上不说，天天问我你怎么样。": "Baibai, you've been in Shanghai a few days now. Are you eating properly? Call your father when you can. He won't say it, but he asks me about you every day.",
  "在忙吗？": "Busy?",
  "不忙，爸。": "Not really, Dad.",
  "有点忙，你说。": "A bit. Go on.",
  "厂里新上了一条线，做电驱的壳体。研发那层楼空着，我给你留着。": "We've put in a new line at the factory, e-drive housings. The R&D floor is empty. I'm keeping it for you.",
  "我想在上海先做自己的工作室。": "I want to start my own studio in Shanghai first.",
  "过阵子回去看看。": "I'll come back and take a look soon.",
  "我还在想。": "I'm still thinking.",
  "……你自己的事，你自己想清楚。钱够不够？": "...Your life, you think it through. Do you have enough money?",
  "够。": "Yes.",
  "在美国攒的还在。": "What I saved in the States is still there.",
  "嗯。你妈让你按时吃饭。挂了。": "Mm. Your mother says eat properly. Bye.",
  "白白这张可以啊🔥": "Baibai, this one is good 🔥",
  "哪里拍的？我也要去": "Where was this? I want to go",
  "构图满分": "Perfect composition",
  "求原图！": "Send me the full-size!",
  "可以，摄影师上线了": "Look at you, the photographer",
  // history
  '下周谁有空，天马跑两圈': 'Who\'s free next week? A few laps at Tianma', '我周末要飞深圳': 'I\'m flying to Shenzhen this weekend', '[视频]': '[Video]',
  '到外滩来。海关钟下面……': 'Come to the Bund. Under the Customs clock...',
  '落地了说一声。': 'Let me know when you land.', '航班号发我一下': 'Send me your flight number', 'UA857，下午三点多到浦东': 'UA857, lands at Pudong just after 3 pm',
  // first evening
  '白白落地了没？？': 'Has Baibai landed??', '下午就到了，我让他先去外滩吹吹风，倒倒时差': 'Got in this afternoon. I told him to go stand on the Bund and shake off the jet lag',
  '吹啥风，晚上来和平饭店听我们弹琴😎': 'Forget the wind, come hear us play at the Peace Hotel tonight 😎',
  '今晚九点半，和平饭店爵士吧，给你留位置': '9:30 tonight, Peace Hotel Jazz Bar. I\'ll save you a seat',
  '今晚八点，和平饭店爵士吧，给你留位置': '8 tonight, Peace Hotel Jazz Bar. I\'ll save you a seat',
  '和平饭店爵士吧 · Momo trio': 'Peace Hotel Jazz Bar · Momo trio', '和平饭店 · 爵士吧': 'Peace Hotel · Jazz Bar',
  '来，给我留个靠前的位置': 'I\'m in. Save me one near the front', '今晚倒时差，下次一定': 'Jet-lagged tonight. Next time, promise',
  '到了吗？外滩风大，你那件薄外套不够的。': 'Here yet? It\'s windy on the Bund. That thin jacket of yours won\'t cut it.',
  '到了，确实冷。在海关大楼这边。': 'Here. It is cold. I\'m by the Customs House.', '海关大楼？那正好，钟楼刚修完，你抬头看看。': 'The Customs House? Perfect, the clock tower\'s just been restored. Look up.',
  '还行，不冷。': 'It\'s fine, not cold.', '嘴硬。': 'Liar.',
  '喂，纪白，听说你硅谷那家公司的股票套现了？……别装，予安都跟我说了。周末来不来天马，带你跑两圈。还有——真的，你该换台车了，那台二手 Model 3 你还开着呢？':
    'Hey, Ji Bai, heard you cashed out your stock from that Valley company? ...Don\'t play dumb, Yu\'an told me. Come to Tianma this weekend, I\'ll take you round a few laps. And seriously, you need a new car. Are you still driving that second-hand Model 3?',
  '周末可以，车的事再说。': 'Weekend works. We\'ll see about the car.', '再说就是想。我认识保时捷浦东的一个顾问，人靠谱，回头推给你。': '"We\'ll see" means yes. I know a consultant at Porsche in Pudong, she\'s solid. I\'ll send you her contact.',
  'Model 3 挺好的。': 'The Model 3 is fine.', '……行，你开心就好。': '...Sure. Whatever makes you happy.',
  '说正事。有个做机械臂的团队，创始人是我学长，产品经理跑了，原型卡住了。': 'Business. There\'s a robotic-arm team, the founder was a year above me at LSE. Their product lead quit and the prototype\'s stuck.',
  '明天下午三点陆家嘴，你过来帮我看看？': 'Tomorrow 3 pm in Lujiazui. Come take a look for me?', '今天下午三点陆家嘴，你过来帮我看看？': 'Today, 3 pm, in Lujiazui. Come take a look for me?', '机械臂团队 · 原型评审': 'Robotic arm team · prototype review', '陆家嘴 IFC 二期 32F': 'Lujiazui, IFC Tower 2, 32F',
  '可以，把资料先发我': 'OK. Send me the materials first', '明天不行，有别的事': 'Can\'t tomorrow, something on',
  '回国了也不说一声。': 'You\'re back and you didn\'t even tell me.', '北外滩 · 看房': 'North Bund · viewing a flat', '北外滩': 'North Bund',
  '后天下午我在上海，家里让我看北外滩一套顶层，你学设计的，陪我去？': 'I\'m in Shanghai the day after tomorrow. My family wants me to look at a penthouse on the North Bund. You studied design. Come with me?',
  '明天下午我在上海，家里让我看北外滩一套顶层，你学设计的，陪我去？': 'I\'m in Shanghai tomorrow afternoon. My family wants me to look at a penthouse on the North Bund. You studied design. Come with me?',
  '好，地址发我': 'Sure, send me the address', '后天可能不行': 'Might not work that day',
  // chatter
  '[视频] 今天排练的，这段solo我自己都想哭': '[Video] From rehearsal today. This solo makes even me want to cry', '开会开到现在，饭都没吃': 'Meetings until now. Haven\'t even eaten',
  '测试台又炸了一个电芯，没人受伤，就是心疼钱': 'Another cell blew on the test bench. Nobody hurt, just painful for the budget',
  '有人知道海关大楼钟每天几点敲吗，甲方问我我也不知道😂': 'Anyone know what times the Customs House clock chimes? The client asked and I have no idea 😂',
  '谁有静安那家生煎的电话，排队排疯了': 'Anyone have the number for that shengjian place in Jing\'an? The queue is insane', '刚落虹桥，雾好大': 'Just landed at Hongqiao. So foggy',
  '@纪白 你周末到底在不在上海': '@Ji Bai are you in Shanghai this weekend or not', '周末天马下雨就取消，别问了': 'If it rains at Tianma this weekend it\'s off. Don\'t ask',
  '[表情] 旺柴.gif': '[Sticker] doge.gif', '今天工地挖出来一块1920年代的地砖，开心一整天': 'Dug up a 1920s floor tile on site today. Happy all day',
  // reactions
  '好！门口报我名字就行，带你认识下我们鼓手': 'Great! Just give my name at the door. I\'ll introduce you to our drummer', '行吧……下次啊，下次不来就绝交': 'Fine... next time. Skip that too and we\'re done',
  '昨晚说好的呢？？位置给你留到十点': 'What happened last night?? I held your seat till ten', '资料晚点发你，NDA 先签一下哈': 'I\'ll send the deck later. Sign the NDA first',
  '好吧，那我先自己去': 'OK, I\'ll go on my own then', '昨天下午人呢？学长还问起你': 'Where were you yesterday afternoon? He asked about you',
  '嗯。我把地址和时间发你。': 'Mm. I\'ll send you the address and time.', '好。': 'OK.', '我自己去看了。': 'I went to see it myself.',
  '你是不是在汉口路那家Manner？我们工地的人天天去，燕麦拿铁不错。': 'Are you at the Manner on Hankou Road? The guys from our site go every day. The oat latte\'s good.',
  '怎么不接电话？': 'Why aren\'t you picking up?', '在忙？': 'Busy?',
  // default answers to invitations
  // the Huracán: Zhixia's card, Vivian
  '推给你，Vivian，人很实在，不会硬推销。你就说是我朋友。': "Here's Vivian. She's straight with people, no hard sell. Just say you're my friend.",
  '[名片] Vivian 陈': '[Contact card] Vivian Chen',
  '你好，我是知夏的朋友纪白，想了解一下 Huracán。': "Hi, I'm Ji Bai, a friend of Zhixia's. I'd like to know about the Huracán.",
  '纪先生您好！知夏跟我说过您～ 我们这边可以把试驾车开到您那边，外滩可以吗？': "Hello Mr Ji! Zhixia told me about you. We can bring the demo car to you. Would the Bund work?",
  '定金收到啦，合同我发您邮箱。配额已经帮您锁好，大概两周到店。': "Deposit received! I'll email you the contract. Your allocation is locked in; it should reach us in about two weeks.",
  '上牌的话，车在哪儿买不影响，跟着户口走。您是南京户口，我们这边可以帮您代办苏A，车先挂临牌。': "For the plate, it doesn't matter where you buy the car: registration follows your hukou. Yours is Nanjing, so we can register it on a 苏A plate for you. The car runs on temporary plates meanwhile.",
  '好，上苏A。': "OK, 苏A it is.", '拍沪牌不行吗？': "Couldn't I bid for a Shanghai plate?",
  '外地户口拍沪牌要有上海居住证，社保或个税连续满36个月。您刚回国，暂时还不够……以后在上海注册了公司，也可以用公司名义拍。这次先上苏A？': "Without a Shanghai hukou you need a Shanghai residence permit and 36 months of continuous social insurance or tax here to bid. You've only just come back, so not yet... If you set up a company in Shanghai later, it could bid in its own name. 苏A for now?",
  '好的，苏A我们的代办同事去南京办，交车前牌照就到。提醒您一下，外牌工作日早晚高峰不能上高架。': "Great. Our agent will register it in Nanjing; the plates will be here before delivery. Just a reminder: out-of-town plates can't use the elevated roads at weekday rush hours.",
  '恭喜！这个月的沪牌拍到了！': 'Congratulations! We won a Shanghai plate this month!',
  '这个月没拍到……先给您办临牌，下个月我们再拍。': "No luck at the auction this month... I'll get you temporary plates and we'll try again next month.",
  '苏A的话手续简单，我们帮您办，就是外牌高峰时段不能上高架，这个您要注意。': "苏A is simple, we'll handle the paperwork. Just remember out-of-town plates can't use the elevated roads at rush hour.",
  '全款。': 'In full.', '做金融吧。': "Let's finance it.",
  '尾款收到！我们准备交车～': "Balance received! We're getting her ready for delivery.",
  '好消息，这次沪牌拍到了！': 'Good news: we won a Shanghai plate this time!',
  '恭喜提车！以后有什么问题随时找我～': "Congratulations on your new car! Any questions at all, just message me.",
  '我到汉口路了，车停在海关大楼旁边的路边，我在车旁等您。可以开一圈～': "I'm on Hankou Road: the car's at the kerb by the Customs House and I'm beside it. You can take it for a drive.",
  '车到了！明天下午我们把车开到汉口路给您交车，您看几点方便？': "She's arrived! We'll bring her to Hankou Road for the handover. I'll be there with the key.",
  '银行余额不够全款……要不做金融？首付三成就行。': "The account doesn't cover paying in full... Shall we do finance? Just 30% down.",
  '？？？白白提车了？？？': '??? Baibai bought a CAR???', '我就说吧😎 周末天马，带上它。': 'Told you 😎 Tianma this weekend, bring it.', '……你爸知道吗': '...Does your dad know?',
  // DiDi
  '师傅：到了哈，我在路边打着双闪，你快点哦，这里不让停。': "Driver: I'm here, at the kerb with my hazards on. Be quick, you can't stop here.",
  '行程已取消': 'Ride cancelled', '师傅：好的': 'Driver: OK', '我在路口了，马上到': "I'm at the corner, coming now", '稍等我两分钟': 'Give me two minutes', '我穿深色外套': "I'm in a dark coat",
  '今天谢了，改天请你吃饭。': "Thanks for today. Dinner's on me sometime.",
  '好，到时候见。': 'OK, see you then.', '这次去不了，下次一定。': 'Can\'t make this one. Next time for sure.',
  // Dad
  '到上海了？': 'You\'re in Shanghai?', '到了，在外滩。': 'Yes, I\'m on the Bund.', '嗯，到了。': 'Mm, I\'m here.', '住哪儿？': 'Where are you staying?',
  '先住和平饭店几天。': 'The Peace Hotel, for a few days.', '朋友家。': 'At a friend\'s.', '……嗯。你妈让我问你吃饭了没有。': '...Mm. Your mother wants to know if you\'ve eaten.',
  '吃了。': 'I have.', '还没，等会儿吃。': 'Not yet, I will soon.',
  '钱的事你自己有数。你在美国攒的那点钱，别全扔在车上。有空回南京一趟，厂里的事我们当面谈。': 'You know your own mind about money. Don\'t throw everything you saved in America at a car. Come back to Nanjing when you can. We\'ll talk about the factory in person.',
  '知道了，爸。': 'Got it, Dad.', '我在上海有自己的打算。': 'I have my own plans in Shanghai.', '行。挂了。': 'Fine. I\'m hanging up.',
};

// the shops' order updates and item names (engine/shopping.js)
import { CATALOGUE } from '../engine/shopping.js';
import { DRIVER_NAME_EN } from './driversEn.js';
const ITEM_EN = Object.fromEntries(CATALOGUE.map((c) => [c.name, c.en]));
const SHOP_EN = {
  您的订单已打包: 'Your order is packed', 您的订单已发货: 'Your order has shipped', '快递员正在派送，预计45分钟内送达': 'Out for delivery, arriving within 45 minutes',
  '快递员已到汉口路路口（Manner门口），请下楼取件': 'Your courier is at the Hankou Road corner, outside Manner. Please come and collect',
  已由前台代收: 'Signed for at the front desk', 已签收: 'Received', '联系不上您，快递已放和平饭店前台': 'Couldn\'t reach you, so it\'s at the Peace Hotel front desk',
};
// Manner's ready message is built per order
const DRINKS = { 美式: 'Americano', 拿铁: 'Latte', 燕麦拿铁: 'Oat latte', 澳白: 'Flat white', 桂花拿铁: 'Osmanthus latte' };
export function enText(text) {
  if (text == null) return text;
  if (EN[text]) return EN[text];
  if (EN_WORK[text]) return EN_WORK[text];                       // the gimbal's week (world/work.js)
  if (EN_CAREER[text]) return EN_CAREER[text];                   // the working year, the flat, the watch-repairer (world/career.js)
  if (EN_HEARTS[text]) return EN_HEARTS[text];                   // the five he might come to love (world/romance.js)
  if (EN_FIGHT[text]) return EN_FIGHT[text];                     // the morning after a row (engine/fight.js)
  if (EN_ROAD[text]) return EN_ROAD[text];                       // after he hit someone in the car (world/roadFallout.js)
  const m = /^您的(.+)已做好，取餐号 (\d+)/.exec(text);
  if (m) return `Your ${(DRINKS[m[1]] || 'order').toLowerCase()} is ready. Order No. ${m[2]}, collect at the window`;
  // DiDi's app
  let m2;
  if ((m2 = /^司机已接单：(\S+) · (.+)$/.exec(text))) return `Driver accepted: ${DRIVER_NAME_EN[m2[1]] || m2[1]} · ${m2[2]}`;
  if ((m2 = /^司机已到达上车点，请尽快上车（(.+)）$/.exec(text))) return `Your driver is at the pickup point. Please get in (${m2[1]})`;
  if ((m2 = /^乘客未上车，订单已取消，收取取消费 ¥(\S+)$/.exec(text))) return `You didn't come down, so the ride was cancelled. Cancellation fee ¥${m2[1]}`;
  if ((m2 = /^行程结束，已支付 ¥(\S+)。感谢乘坐，请为(\S+)评价$/.exec(text))) return `Trip complete, ¥${m2[1]} paid. Thanks for riding. Rate ${DRIVER_NAME_EN[m2[2]] || m2[2]}`;
  // Vivian's lines built with numbers
  let m3;
  if ((m3 = /^那就(\d+)点(\d+)在汉口路，车停在路边，我在车旁边等您。$/.exec(text))) return `Then ${m3[1]}:${m3[2]} on Hankou Road. The car will be at the kerb and I'll be waiting beside it.`;
  if ((m3 = /^尾款(\d+)万，可以全款转账，也可以做金融，首付三成，月供([\d,]+)。$/.exec(text))) return `The balance is ¥${(+m3[1] / 100).toFixed(2)} million. You can pay it in full by transfer, or finance it: 30% down, ¥${m3[2]} a month.`;
  if ((m3 = /^首付收到，金融合同签好了，月供 ¥([\d,]+)，(\d+)期。$/.exec(text))) return `Down payment received and the finance contract's signed: ¥${m3[1]} a month for ${m3[2]} months.`;
  // the shops' order updates: "<what happened>：<items>"
  const o = /^(.+?)：(.+)$/.exec(text);
  if (o && SHOP_EN[o[1]]) return `${SHOP_EN[o[1]]}: ${o[2].split('、').map((n) => ITEM_EN[n] || n).join(', ')}`;
  return text;
}
