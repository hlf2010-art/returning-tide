// Who's who. The protagonist and the five friends he grew up with in Nanjing: data for the phone,
// the agenda and (later) their bodies in the world. Full profiles in docs/characters.md.
export const ME = {
  id: 'me', name: '沈既白', en: 'Shen Jibai', nick: '既白', age: 23,
  line: '南京人，旧金山读完工业设计和数字工程，刚回国。会造东西。',
  lineEn: 'From Nanjing; just back from San Francisco (industrial design + digital engineering). Builds things.',
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
  dad:    { name: '爸', short: '爸', en: 'Dad (Shen Jianguo)', role: 'machining firm, Nanjing', color: '#6b6b6b', voice: { pitch: 0.82, rate: 0.92 }, sex: 'm' },
  kai:    { name: '阿凯', short: '阿凯', en: 'Kai', role: 'runs the Yangpu makerspace', color: '#4f7a6a', voice: { pitch: 0.95, rate: 1.05 }, sex: 'm' },
  chen:   { name: '老陈', short: '老陈', en: 'Old Chen', role: 'retired lathe hand; photographs the Customs clock', color: '#7a6a55', voice: { pitch: 0.85, rate: 0.92 }, sex: 'm' },
  ye:     { name: '小叶', short: '小叶', en: 'Xiao Ye', role: 'portrait photographer on the Bund', color: '#5a8a9a', voice: { pitch: 1.08, rate: 1.08 }, sex: 'f' },
  zhe:    { name: '阿哲', short: '阿哲', en: 'Zhe', role: 'livestreams the Bund at night', color: '#9a5a8a', voice: { pitch: 1.0, rate: 1.15 }, sex: 'm' },
  mum:    { name: '妈', short: '妈', en: 'Mum (Zhou Lan)', role: 'cardiologist, Gulou Hospital, Nanjing', color: '#b56576', voice: { pitch: 1.05, rate: 0.98 }, sex: 'f' },
};
export const FRIENDS = ['xuan', 'ruoan', 'momo', 'zhixia', 'yinuo'];
export const GROUP = { id: 'wuhu', title: '金陵五虎+1', members: ['me', ...FRIENDS] };
