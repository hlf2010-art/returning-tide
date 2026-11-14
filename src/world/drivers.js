// DiDi drivers as people (content for engine/smallTalk.js). Spoken Mandarin as it's actually
// spoken: half-sentences, 嘛 / 呗 / 哎, interruptions (——), trailing off (……), a joke that
// doesn't land. Regional colour comes from who they are, not from caricature.
//
// Each topic has several lines; an `aside` is folded into a topic line in the same voice. Asides are
// 'intel' (true, opens something), 'false' (a rumour that won't hold up) or 'hollow' (nothing at
// all); nothing in the text marks which is which.
export const DRIVERS = [
  {
    id: 'shi-gu', name: '顾师傅', plate: '沪A·D7L192', car: 'BYD 汉 EV, dark grey', chatty: 0.75, mood: 'chatty',
    who: 'Gu, 58, Shanghainese, drove a Dazhong taxi for 22 years before switching to DiDi; drops Shanghainese words into his Mandarin, opinionated about everything',
    topics: {
      traffic: [
        '这条路啊，十一月一到，晚上全是来拍照的。外滩嘛，拍不厌的。',
        '你看前面这个，打着双闪停在那里——哎，侬停啥停啦。……不好意思啊，职业病。',
        '以前出租车好开，现在人人手机一点，车子嘛，多得来……',
      ],
      prices: [
        '生煎现在一客要二十几块了你晓得伐？我小时候……算了，说出来像老头子。',
        '油价我是不管了，电车嘛，充一次电三四十块，比以前省多了。就是充电桩要抢。',
      ],
      weather: [
        '今朝冷了嘛，江边风大。你穿得少了，小伙子。',
        '天气预报讲明天要落雨，我看不一定，上海的天，跟小姑娘的脾气一样。……这句话现在不能讲了是伐？',
      ],
      gossip: [
        '和平饭店晓得伐？老底子叫华懋饭店。我们那时候开出租，晚上停门口等客人，一等一个钟头。',
        '这边好多老房子都在修，修得交关漂亮，就是里面住啥人，我们就不晓得了。',
      ],
      kids: ['我女儿在美国读书，学什么……数据分析。我问她分析啥，她说讲了你也不懂。……那倒是。'],
    },
    asides: [
      { id: 'peace-side-door', kind: 'intel', topic: 'gossip', warmth: 2,
        line: '讲到和平饭店——上礼拜两点钟我送个客人，不走正门的，从滇池路那边侧门进去，门口有人等他。穿得山青水绿的，提只银色箱子。……我就开车，别的不晓得。' },
      { id: 'gu-noodles', kind: 'hollow', topic: 'prices', warmth: 1,
        line: '你要吃面，去我阿弟那边，云南路那家，葱油拌面……不是做广告啊，真的好吃。' },
    ],
  },
  {
    id: 'xiao-zhao', name: '赵师傅', plate: '沪A·F3K806', car: 'Tesla Model Y, white', chatty: 0.55, mood: 'cheerful',
    who: 'Zhao, 31, from Hefei, drives evenings after his day job selling software to factories; wants his own business; laughs at his own jokes',
    topics: {
      business: [
        '我白天卖软件，晚上开车。……不是缺钱啊，是——好吧，也缺。',
        '现在做生意，你得有个“故事”。投资人听故事的。我的故事就是，我还在开滴滴。哈哈。',
        '陆家嘴那帮人啊，我拉过好多，一上车就开会，耳机一戴，“对齐一下颗粒度”……我都会背了。',
      ],
      traffic: ['导航让我走这条，我不信它，但我还是走了。人跟导航，就是这种关系。'],
      football: ['昨天那场你看了吗？申花……算了，不说了，说了心痛。'],
      weather: ['合肥这时候比上海冷多了。上海这种冷是往骨头里钻的，你懂吧，湿冷。'],
    },
    asides: [
      { id: 'aia-new-guard', kind: 'false', topic: 'business', warmth: 1.5,
        line: '我有个客户在外滩那栋——就是十七号，友邦那个——他说下个月整个前台都换了，换成什么人脸识别，保安全撤。我是不太信，他喝多了说的。' },
      { id: 'zhao-startup', kind: 'intel', topic: 'business', warmth: 2.5,
        line: '我跟你说个事，你别笑——我们公司有个工程师自己做了个机械臂，给工厂用的，老板不要，他准备辞职单干。缺的就是懂设计的人。……你看我，跟乘客讲这个干什么。' },
    ],
  },
  {
    id: 'liu-jie', name: '刘师傅', plate: '沪A·DH0447', car: 'Li Auto L6, silver', chatty: 0.35, mood: 'tired',
    who: 'Liu, 44, from Zhoukou in Henan, has driven 11 hours today; quiet, polite, opens up about her son if asked',
    topics: {
      kids: [
        '我儿子明年中考……成绩还行，就是爱打游戏。你们年轻人小时候也这样吧？',
        '老家的人都觉得我在上海挺好的。挺好的，就是累。',
      ],
      traffic: ['……这个点堵，没办法。你急吗？急的话我走中山东二路。'],
      weather: ['今天还好，没下雨。下雨天单子多，但是路滑，心里不踏实。'],
    },
    asides: [
      { id: 'liu-quiet', kind: 'hollow', topic: 'kids', warmth: 1, line: '他说想学设计，我也不知道设计是干什么的。你知道吗？……哦，你就是学这个的？那挺好。' },
    ],
  },
  {
    id: 'ma-ge', name: '马师傅', plate: '沪A·D2X559', car: 'NIO ET5, blue', chatty: 0.65, mood: 'grumbly',
    who: 'Ma, 39, from Shandong, ex-army, used to drive for a property agency; complains about everything with affection',
    topics: {
      traffic: [
        '你看看，这电动车，红灯它也冲。……我不是说你啊。',
        '外滩这一块，不让停车，接人都得到路口那个点。你下回叫车，就定在汉口路口，别定在楼门口，司机找不着。',
      ],
      business: [
        '我以前给中介开车，拉看房的。那些人啊，看一套两千万的房子，跟买白菜一样。',
        '现在房子不好卖，可是好房子还是好卖。你懂我意思吧？好东西永远不愁。',
      ],
      gossip: ['静安那边有个大平层，挂了半年没卖掉，听说房东是个……算了算了，我嘴碎。'],
    },
    asides: [
      { id: 'ma-penthouse', kind: 'intel', topic: 'business', warmth: 2,
        line: '你要是真想看房——我就随口一说啊——北外滩有个顶层，业主急着出国，价格能谈。中介姓唐，我拉过她好几回，人挺实在。' },
      { id: 'ma-helipad', kind: 'false', topic: 'gossip', warmth: 1.5,
        line: '听说和平饭店楼顶以前能停直升机？我是不信，那楼顶尖的嘛，停哪儿？' },
    ],
  },
  {
    id: 'chen-mei', name: '陈师傅', plate: '沪A·DM1730', car: 'AITO M7, black', chatty: 0.2, mood: 'flat',
    who: 'Chen, 50, a former restaurant owner from Ningbo; drives in silence with Yue opera on low; answers questions in a few words',
    topics: {
      weather: ['嗯，冷了。'],
      traffic: ['快了。前面右转就到。'],
      prices: ['……以前我开饭店的。现在开车。都一样，赚辛苦钱。'],
    },
    asides: [],
  },
];

// what the player can say back; one of each is offered, picked to fit the line
export const REPLIES = {
  engage: ['真的假的？', '那后来呢？', '哈哈，然后呢？', '您说的有道理。', '是吗？我还真不知道。'],
  short: ['嗯。', '是哦。', '还行。', '对。'],
  change: ['师傅，您开车开多久了？', '这附近有什么好吃的吗？', '您是哪里人啊？', '最近生意怎么样？'],
  ignore: ['（戴上耳机）', '（看着窗外）'],
};

// The road talks back. When the car has to brake hard for a jaywalker or someone cuts in, the
// driver reacts, mid-sentence if need be: severity 1 (mutter) .. 3 (properly shouting). Swearing
// is the ordinary street kind; nobody is attacked for who they are.
export const OUTBURSTS = {
  'shi-gu': {
    cutIn: ['哎哎哎——侬会不会开车啦！', '戆大！转弯灯不会打的啊？', '……侬眼睛瞎脱啦？！'],
    jaywalk: ['喂喂喂！红灯呀！侬命不要了啊！', '这种人……撞上去算谁的？算我的！', '哎哟——吓煞我了。'],
  },
  'xiao-zhao': {
    cutIn: ['兄弟，这不是赛道啊！', '我靠……你这变道比我老板变脸还快。', '行行行，你先，你先。'],
    jaywalk: ['哎——看车啊！', '你看看，低头看手机，路都不看……', '我刹得住，下一个司机未必。'],
  },
  'liu-jie': {
    cutIn: ['哎呀……我的天爷。', '……你急你先走嘛。'],
    jaywalk: ['哎呀妈呀——吓死我了。', '（深呼吸）……没事，没事。'],
  },
  'ma-ge': {
    cutIn: ['嘿！你这人怎么开车的！', '找死呢你！别让我追上你！', '……驾照买的吧？'],
    jaywalk: ['往哪儿走呢！红灯！', '你家人知道你这么过马路吗？！', '我真服了……'],
  },
  'chen-mei': {
    cutIn: ['（按了一下喇叭）', '……啧。'],
    jaywalk: ['（猛按喇叭）', '……作死。'],
  },
};
// how far each mood pushes a reaction up the scale
export const TEMPER = { grumbly: 0.8, chatty: 0.5, cheerful: 0.3, flat: 0.2, tired: 0.15 };
