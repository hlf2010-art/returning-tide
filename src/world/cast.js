// Who's who. The protagonist and the five friends he grew up with in Nanjing: data for the phone,
// the agenda and (later) their bodies in the world. Full profiles in docs/characters.md.
export const ME = {
  id: 'me', name: '纪白', en: 'Ji Bai', nick: '纪白', age: 27,
  line: '南京人，伯克利认知科学（人机交互、AI、产品），在硅谷做过几年，刚回国，在陆家嘴一家外资科技咨询公司做企业 AI 产品。',
  lineEn: 'From Nanjing; UC Berkeley cognitive science (HCI, AI, product); a few years in Silicon Valley; now at an international technology consulting firm in Lujiazui, on enterprise AI products.',
};

// voice: browser-speech profile (pitch / rate); avatar colour for the phone
export const PEOPLE = {
  xuan:   { name: '陆明轩', short: '明轩', en: 'Lu Mingxuan', role: 'VC analyst, Lujiazui', color: '#3f6fb5', voice: { pitch: 0.95, rate: 1.08 }, sex: 'm' },
  ruoan:  { name: '许若安', short: '若安', en: 'Xu Ruoan', role: 'architect, Bund restorations', color: '#7a9a6a', voice: { pitch: 1.08, rate: 1.0 }, sex: 'f' },
  momo:   { name: '周子墨', short: 'Momo', en: 'Zhou Zimo', role: 'jazz keys, 1.2M followers', color: '#c4703c', voice: { pitch: 1.0, rate: 1.15 }, sex: 'm' },
  zhixia: { name: '韩知夏', short: '知夏', en: 'Han Zhixia', role: 'EV engineer, amateur GT racer', color: '#b5463f', voice: { pitch: 1.05, rate: 1.12 }, sex: 'f' },
  yinuo:  { name: '程以诺', short: '以诺', en: 'Cheng Yinuo', role: 'family office, art & property', color: '#8a6aa8', voice: { pitch: 1.1, rate: 0.96 }, sex: 'f' },
  manner: { name: 'Manner Coffee', short: 'M', en: 'Manner Coffee (Hankou Rd)', role: 'coffee', color: '#151515', voice: { pitch: 1, rate: 1 } },
  vivian: { name: 'Vivian 陈', short: 'Vivian', en: 'Vivian Chen', role: 'sales consultant, Lamborghini Shanghai', color: '#b08a3c', voice: { pitch: 1.1, rate: 1.08 }, sex: 'f' },
  didi:   { name: '滴滴出行', short: '滴滴', en: 'DiDi', role: 'app', color: '#ff7a00', voice: { pitch: 1, rate: 1 } },
  jd:     { name: '京东', short: '京东', en: 'JD', role: 'shop', color: '#e1251b', voice: { pitch: 1, rate: 1 } },
  taobao: { name: '淘宝', short: '淘宝', en: 'Taobao', role: 'shop', color: '#ff5000', voice: { pitch: 1, rate: 1 } },
  dad:    { name: '爸', short: '爸', en: 'Dad (Ji Jianguo)', role: 'machining firm, Nanjing', color: '#6b6b6b', voice: { pitch: 0.82, rate: 0.92 }, sex: 'm' },
  kai:    { name: '阿凯', short: '阿凯', en: 'Kai', role: 'runs the Yangpu makerspace', color: '#4f7a6a', voice: { pitch: 0.95, rate: 1.05 }, sex: 'm' },
  chen:   { name: '老陈', short: '老陈', en: 'Old Chen', role: 'retired lathe hand; photographs the Customs clock', color: '#7a6a55', voice: { pitch: 0.85, rate: 0.92 }, sex: 'm' },
  ye:     { name: '小叶', short: '小叶', en: 'Xiao Ye', role: 'portrait photographer on the Bund', color: '#5a8a9a', voice: { pitch: 1.08, rate: 1.08 }, sex: 'f' },
  zhe:    { name: '阿哲', short: '阿哲', en: 'Zhe', role: 'livestreams the Bund at night', color: '#9a5a8a', voice: { pitch: 1.0, rate: 1.15 }, sex: 'm' },
  // the five he might come to love (world/romance.js and world/romance/*.js have who they are)
  zhiwei:  { name: '许知微', short: '知微', en: 'Xu Zhiwei', role: 'his project manager, Lujiazui', color: '#3d5a80', voice: { pitch: 1.02, rate: 1.1 }, sex: 'f' },
  nanxing: { name: '沈南星', short: '南星', en: 'Shen Nanxing', role: 'independent photographer', color: '#b0623a', voice: { pitch: 1.1, rate: 1.06 }, sex: 'f' },
  gunian:  { name: '顾念', short: '顾念', en: 'Gu Nian', role: 'architect, Bund restorations', color: '#5f7f6e', voice: { pitch: 1.0, rate: 0.98 }, sex: 'f' },
  yuan:    { name: '林予安', short: '予安', en: "Lin Yu'an", role: 'product designer, San Francisco', color: '#7d6b9e', voice: { pitch: 1.06, rate: 1.04 }, sex: 'f' },
  kexin:   { name: '唐可昕', short: '可昕', en: 'Tang Kexin', role: 'lifestyle creator, 180K on Xiaohongshu', color: '#c0507a', voice: { pitch: 1.14, rate: 1.12 }, sex: 'f' },
  mum:    { name: '妈', short: '妈', en: 'Mum (Zhou Lan)', role: 'cardiologist, Gulou Hospital, Nanjing', color: '#b56576', voice: { pitch: 1.05, rate: 0.98 }, sex: 'f' },
};
// the working year (world/career.js): colleagues, a client, the agent, the watch-repairer's daughter
Object.assign(PEOPLE, {
  taoke:    { name: '陶可', short: '陶可', en: 'Tao Ke', role: 'analyst, Marlowe Finch', color: '#6a8fb5', voice: { pitch: 1.1, rate: 1.08 }, sex: 'f' },
  shaofeng: { name: '邵峰', short: '邵峰', en: 'Shao Feng', role: 'senior consultant, Marlowe Finch', color: '#5a6a8a', voice: { pitch: 0.98, rate: 1.1 }, sex: 'm' },
  partner:  { name: '贺维安', short: 'Raymond', en: 'Raymond He', role: 'partner, Marlowe Finch', color: '#3d4a5c', voice: { pitch: 0.88, rate: 0.96 }, sex: 'm' },
  hr:       { name: '迈芬 HR', short: 'HR', en: 'Marlowe Finch HR', role: 'human resources', color: '#7a7a7a', voice: { pitch: 1, rate: 1 } },
  gu:       { name: '顾磊', short: '顾磊', en: 'Gu Lei', role: 'claims systems, Donglan; later Yushen', color: '#4f7a7a', voice: { pitch: 0.92, rate: 1.0 }, sex: 'm' },
  feng:     { name: '冯玉兰', short: '冯总', en: 'Feng Yulan', role: 'VP operations, Donglan Insurance', color: '#8a4a5a', voice: { pitch: 1.0, rate: 1.02 }, sex: 'f' },
  agent:    { name: '中介小吴', short: '小吴', en: 'Wu (letting agent)', role: 'letting agent', color: '#a07a3a', voice: { pitch: 1.05, rate: 1.15 }, sex: 'm' },
  zhoumin:  { name: '周敏', short: '周敏', en: 'Zhou Min', role: "the watch-repairer's daughter", color: '#7a5a8a', voice: { pitch: 1.06, rate: 0.98 }, sex: 'f' },
});
export const FRIENDS = ['xuan', 'ruoan', 'momo', 'zhixia', 'yinuo'];
export const GROUP = { id: 'wuhu', title: '金陵五虎+1', members: ['me', ...FRIENDS] };
