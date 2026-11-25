// All in-world writing lives here so fonts can be preloaded for exactly these glyphs.
export const T = {
  hankou: '汉口路', hankouEn: 'HANKOU Rd.', zhongshan: '中山东一路', zhongshanEn: 'ZHONGSHAN Rd.(E-1)',
  east: '东', west: '西', south: '南', north: '北',
  hoarding: '文明施工　安全第一', hoardingSub: '前方施工　禁止通行', hoardingEn: 'CONSTRUCTION AHEAD · NO ENTRY',
  control: '交通管制', controlSub: '行人车辆请绕行', controlEn: 'ROAD CLOSED',
  shop: '阿芳烟纸店', shopOpen: '营业中', shopSub: '烟酒 · 饮料 · 杂货',
  stall: '周记修表', stallSub: '修表 · 换电池 · 配钥匙', stallClosed: '暂停营业',
  taxi: '出租', forHire: '空车',
  plates: ['沪A·D52817', '沪A·F09M33', '沪B·D88216', '沪A·DM7061'],   // fictional new-energy plates
  poster: {
    title: '寻人启事',
    lines: [
      '周伯年，男，67岁，身高约1.70米，戴眼镜，',
      '讲上海话。在汉口路摆修表摊三十余年。',
      '10月29日傍晚收摊后，在外滩海关大楼一带',
      '失去联系。当时身穿深灰色夹克，随身带',
      '一只棕色工具箱。',
      '如有线索，请与家属联系，必有重谢。',
    ],
    phone: '电话：138', phoneTail: '0417', date: '2026年11月2日',
    scrawl: ['侬勿要再寻了。', '想晓得，就乘', '末班轮渡。'],
    token: '轮渡', tokenSub: '金陵东路',
  },
  dialogue: {
    speakers: {
      lin: '老林',
      su: '苏女士',
    },
    exchanges: [
      {
        id: 'breeze',
        lines: [
          { id: 'breeze-1', speaker: 'su', text: '下过雨之后江风一下就凉了，早知道多带条围巾。', en: "After the rain the wind off the river turns cold so fast. Should've brought a scarf." },
          { id: 'breeze-2', speaker: 'lin', text: '十一月就这样，白天看着还暖和，一过五点天就暗下来了。', en: "That's November. Looks warm in the daytime, then after five it's dark." },
          { id: 'breeze-3', speaker: 'su', text: '我刚从南鲸送路走过来，地铁口那家糖炒栗子已经排起长队了。', en: 'I walked over from Nanjing Road just now. The chestnut place by the metro already has a queue.' },
          { id: 'breeze-4', speaker: 'lin', text: '那家做了很多年了，这个点买一袋揣兜里，刚好暖暖手。', en: "They've been there for years. Get a bag at this hour, keep it in your pocket, warms your hands." },
        ],
      },
      {
        id: 'dinner',
        lines: [
          { id: 'dinner-1', speaker: 'lin', text: '今晚打算回家自己做饭，还是在附近随便吃点？', en: 'Cooking at home tonight, or just grabbing something round here?' },
          { id: 'dinner-2', speaker: 'su', text: '加班到这个点就不折腾了，去巷口吃碗葱油拌面，再加个煎蛋。', en: "Working this late, I'm not making a fuss. Scallion-oil noodles at the corner, with a fried egg." },
          { id: 'dinner-3', speaker: 'lin', text: '天冷喝碗热汤更舒服，小馄饨配两只生煎也不错。', en: "When it's cold, hot soup's better. Little wontons and a couple of shengjian aren't bad either." },
          { id: 'dinner-4', speaker: 'su', text: '别说了，越说越饿，再吹会儿风我就去买单。', en: "Stop it, the more you talk the hungrier I get. Five more minutes of wind and I'm going." },
        ],
      },
      {
        id: 'walk',
        lines: [
          { id: 'walk-1', speaker: 'su', text: '对岸东方明珠刚才亮灯那一下，江面上全倒映出来了。', en: 'The Pearl Tower lights came on just now. The whole river lit up with it.' },
          { id: 'walk-2', speaker: 'lin', text: '我每天晚饭后都要沿外滩走这一段，透透气，比闷在屋里强。', en: 'I walk this stretch of the Bund every day after dinner. Fresh air beats sitting indoors.' },
          { id: 'walk-3', speaker: 'su', text: '待会儿你是坐公交回去，还是顺着江边一路走到渡口那边？', en: 'How are you getting back? Bus, or walking along the river all the way to the ferry?' },
          { id: 'walk-4', speaker: 'lin', text: '看时间吧，慢慢走过去，权当活动一下腿脚。', en: "Depends on the time. I'll take it slow, call it stretching my legs." },
        ],
      },
    ],
    greetings: [
      { id: 'greet-1', speaker: 'lin', text: '晚上好。刚下过雨，栏杆边风挺凉的，小心别着凉。', en: "Evening. It's just rained, the wind's cold by the railing. Don't catch a chill." },
      { id: 'greet-2', speaker: 'lin', text: '还在外滩逛呢？这会儿对岸的灯开得正好看。', en: 'Still wandering the Bund? The lights across the river are at their best right now.' },
      { id: 'greet-3', speaker: 'lin', text: '不急的话多吹吹风吧，夜里的江边比白天清净些。', en: "If you're not in a hurry, enjoy the breeze a bit. The river's quieter at night than in the day." },
    ],
  },
  // Mission One, "The Wrong Handoff". Spoken lines stay Mandarin (TTS fallback); the pouch
  // label is in Shanghainese, red marker, in the same hand as the scrawl on the notice.
  mission: {
    title: '错交', titleEn: 'The Wrong Handoff', number: '任务一', numberEn: 'Mission One',
    label: ['家属托付', '交林先生', '勿要拆。'],
    sealMark: '封', sealSign: '周',
    doc: {
      title: '摊位转让协议',
      lines: [
        '转让方：周伯年',
        '受让方：',
        '摊位：汉口路北侧 “周记修表” 摊位一处，',
        '连同柜台、工具及摊位使用权一并转让。',
        '双方自愿，签字即生效。',
      ],
      signLabel: '转让方签字：', sign: '周伯年',
      dateLabel: '日期：', date: '2026年10月31日',
    },
    lines: {
      offer: { id: 'm1-offer', speaker: 'lin', text: '你也在打听老周？二十九号傍晚他收了摊，就再没人见过他。他家里人托我取一样东西，我腿脚不方便，你能帮我跑一趟吗？', en: "You're asking about Old Zhou too? He packed up his stall at dusk on the twenty-ninth and nobody's seen him since. His family asked me to collect something. My legs aren't what they were. Could you go for me?" },
      accept: { id: 'm1-accept', speaker: 'lin', text: '汉口路往西，老周的修表摊，柜台上有个封好的文件袋。原样拿回来给我，别拆。', en: "West along Hankou Road, Old Zhou's watch stall. There's a sealed document pouch on the counter. Bring it back as it is. Don't open it." },
      remind: { id: 'm1-remind', speaker: 'lin', text: '就在汉口路北边，修表摊的柜台上。封好的那个。', en: 'North side of Hankou Road, on the counter of the watch stall. The sealed one.' },
      sealed: { id: 'm1-sealed', speaker: 'lin', text: '封得好好的，辛苦你了。他家里人会放心的。', en: 'Sealed, just as it should be. Thank you. His family will be relieved.' },
      sealedRewound: { id: 'm1-sealed-rewound', speaker: 'lin', text: '绳子松过，又绕回去了。……封条还在就好。辛苦你了。', en: "The string's been undone and wound back. ...The seal's still whole, and that's what matters. Thank you." },
      opened: { id: 'm1-opened', speaker: 'lin', text: '封条破了。……你看过了。那上面的日子，别跟别人提。', en: "The seal's broken. ...You've read it. The date on that page, don't mention it to anyone." },
      afterSealed: { id: 'm1-after-sealed', speaker: 'lin', text: '又碰到你了。上回那件事办妥了，多谢。', en: 'We meet again. That business went fine. Thank you.' },
      afterOpened: { id: 'm1-after-opened', speaker: 'lin', text: '还在这儿？江边风大，早点回去吧。', en: "Still here? The wind's strong by the river. Get home early." },
    },
  },
};
export const ALL_TEXT = JSON.stringify(T) + '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz·，。：.()-';
