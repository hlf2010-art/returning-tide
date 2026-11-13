// All in-world writing lives here so fonts can be preloaded for exactly these glyphs.
export const T = {
  hankou: '汉口路', hankouEn: 'HANKOU Rd.', zhongshan: '中山东一路', zhongshanEn: 'ZHONGSHAN Rd.(E-1)',
  east: '东', west: '西', south: '南', north: '北',
  hoarding: '文明施工　安全第一', hoardingSub: '前方施工　禁止通行', hoardingEn: 'CONSTRUCTION AHEAD · NO ENTRY',
  control: '交通管制', controlSub: '行人车辆请绕行', controlEn: 'ROAD CLOSED',
  shop: '阿芳烟纸店', shopOpen: '营业中', shopSub: '烟酒 · 饮料 · 杂货',
  stall: '周记修表', stallSub: '修表 · 换电池 · 配钥匙', stallClosed: '暂停营业',
  taxi: '出租', forHire: '空车',
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
          { id: 'breeze-1', speaker: 'su', text: '下过雨之后江风一下就凉了，早知道多带条围巾。' },
          { id: 'breeze-2', speaker: 'lin', text: '十一月就这样，白天看着还暖和，一过五点天就暗下来了。' },
          { id: 'breeze-3', speaker: 'su', text: '我刚从南京东路走过来，地铁口那家糖炒栗子已经排起长队了。' },
          { id: 'breeze-4', speaker: 'lin', text: '那家做了很多年了，这个点买一袋揣兜里，刚好暖暖手。' },
        ],
      },
      {
        id: 'dinner',
        lines: [
          { id: 'dinner-1', speaker: 'lin', text: '今晚打算回家自己做饭，还是在附近随便吃点？' },
          { id: 'dinner-2', speaker: 'su', text: '加班到这个点就不折腾了，去巷口吃碗葱油拌面，再加个煎蛋。' },
          { id: 'dinner-3', speaker: 'lin', text: '天冷喝碗热汤更舒服，小馄饨配两只生煎也不错。' },
          { id: 'dinner-4', speaker: 'su', text: '别说了，越说越饿，再吹会儿风我就去买单。' },
        ],
      },
      {
        id: 'walk',
        lines: [
          { id: 'walk-1', speaker: 'su', text: '对岸东方明珠刚才亮灯那一下，江面上全倒映出来了。' },
          { id: 'walk-2', speaker: 'lin', text: '我每天晚饭后都要沿外滩走这一段，透透气，比闷在屋里强。' },
          { id: 'walk-3', speaker: 'su', text: '待会儿你是坐公交回去，还是顺着江边一路走到渡口那边？' },
          { id: 'walk-4', speaker: 'lin', text: '看时间吧，慢慢走过去，权当活动一下腿脚。' },
        ],
      },
    ],
    greetings: [
      { id: 'greet-1', speaker: 'lin', text: '晚上好。刚下过雨，栏杆边风挺凉的，小心别着凉。' },
      { id: 'greet-2', speaker: 'lin', text: '还在外滩逛呢？这会儿对岸的灯开得正好看。' },
      { id: 'greet-3', speaker: 'lin', text: '不急的话多吹吹风吧，夜里的江边比白天清净些。' },
    ],
  },
};
export const ALL_TEXT = JSON.stringify(T) + '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz·，。：.()-';
