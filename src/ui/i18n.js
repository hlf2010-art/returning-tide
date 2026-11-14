// One language at a time. Every interface string lives here (or travels as a { zh, en } pair with
// the content it belongs to: dialogue, messages, mission text) and is shown in the language the
// player chose. What belongs to the world itself (street and shop signs, the notice on the lamp
// post, the label on the pouch) stays as it is in the world.
//   default: the browser's language (Chinese -> 中文, anything else -> English); remembered per
//   browser; ?lang=zh|en overrides (tools).
const KEY = 'bund-lang';
const listeners = new Set();
let lang = (() => {
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('lang') : null;
  if (q === 'zh' || q === 'en') return q;
  try { const s = localStorage.getItem(KEY); if (s === 'zh' || s === 'en') return s; } catch { /* no storage */ }
  return typeof navigator !== 'undefined' && /^zh/i.test(navigator.language || '') ? 'zh' : 'en';
})();

export const getLang = () => lang;
export function setLang(l) {
  if (l !== 'zh' && l !== 'en' || l === lang) return;
  lang = l;
  try { localStorage.setItem(KEY, l); } catch { /* no storage */ }
  document.documentElement.lang = l === 'zh' ? 'zh-CN' : 'en';
  applyStatic();
  for (const fn of listeners) fn(l);
}
export const onLang = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

// a { zh, en } pair (or a plain string, returned as is)
export const tr = (v) => (v == null ? '' : typeof v === 'string' ? v : (v[lang] ?? v.zh ?? v.en ?? ''));

// interface strings
export const S = {
  title: { zh: '回潮', en: 'Returning Tide' },
  kicker: { zh: '上海 · 2026', en: 'Shanghai · 2026' },
  district: { zh: '黄浦区 · 外滩', en: 'Huangpu · The Bund' }, weatherNow: { zh: '12°C 雨后转阴 · 江风 4 级', en: '12°C · cloudy after rain · river wind F4' },
  chapter: { zh: '序章 · 抵达外滩', en: 'Prologue · Arriving at the Bund' },
  premise: {
    zh: '沈既白，二十三岁。南京人，在旧金山读了四年工业设计，回国一周。十二岁以前的每个暑假，他都坐在汉口路老周的修表摊边。一别十一年。然后是老周的一条语音：九秒，几乎全是江风。“到外滩来。海关钟下面……”之后再也打不通。',
    en: "Shen Jibai, 23. Born in Nanjing; four years of industrial design in San Francisco; back a week. Every summer until he was twelve he sat at Old Zhou's watch stall on Hankou Road. Eleven years away. Then a voicemail from Old Zhou: nine seconds, mostly river wind. \"Come to the Bund. Under the Customs clock...\" He hasn't picked up since.",
  },
  loading: { zh: '正在载入上海…', en: 'Loading Shanghai…' },
  begin: { zh: '走出去', en: 'Step out' },
  failed: { zh: '无法启动（需要 WebGL2）', en: 'Could not start (WebGL2 needed)' },
  settings: { zh: '设置', en: 'Settings' },
  language: { zh: '语言', en: 'Language' },
  subtitles: { zh: '字幕', en: 'Subtitles' },
  sound: { zh: '声音', en: 'Sound' },
  on: { zh: '开', en: 'On' }, off: { zh: '关', en: 'Off' },
  resume: { zh: '继续', en: 'Resume' },
  paused: { zh: '暂停', en: 'Paused' },
  controls: { zh: '操作', en: 'Controls' },
  close: { zh: '关闭', en: 'Close' },
  place: { zh: '外滩 · 汉口路', en: 'The Bund · Hankou Road' },
  placeSub: { zh: '十一月 · 17:42', en: 'November · 17:42' }, month: { zh: '十一月', en: 'November' },
  keys: [
    ['WASD', { zh: '走', en: 'walk' }], ['Shift', { zh: '快走', en: 'hurry' }], ['Space', { zh: '跳', en: 'jump' }],
    ['E', { zh: '互动', en: 'interact' }], ['Tab', { zh: '地图', en: 'map' }], ['P', { zh: '手机', en: 'phone' }],
    ['Esc', { zh: '菜单', en: 'menu' }],
  ],
  // toasts
  soundOff: { zh: '已静音', en: 'Sound off' }, soundOn: { zh: '声音已开', en: 'Sound on' },
  subsOn: { zh: '字幕已开', en: 'Subtitles on' }, subsOff: { zh: '字幕已关', en: 'Subtitles off' },
  dragLook: { zh: '按住鼠标拖动来环顾四周', en: 'Hold the mouse button and drag to look' },
  hoarding: { zh: '前方施工，此路不通', en: 'Roadworks ahead: no way through' },
  barriers: { zh: '交通管制，请绕行', en: 'Closed beyond the barriers' },
  // prompts
  pLin: { zh: '老林', en: 'Old Lin' }, pTalk: { zh: '交谈', en: 'Talk' }, pHandOver: { zh: '交还文件袋', en: 'Hand over the pouch' },
  pNotice: { zh: '寻人启事', en: 'Missing-person notice' }, pRead: { zh: '查看', en: 'Read' }, pReread: { zh: '再看一眼', en: 'Look again' },
  pPouch: { zh: '文件袋', en: 'Pouch' }, pLook: { zh: '查看', en: 'Look' },
  pOrder: { zh: '扫码点单', en: 'Order on your phone' }, pBeingMade: { zh: '正在制作', en: 'Being made' },
  pCollect: { zh: (n) => `取餐 ${n}`, en: (n) => `Collect order ${n}` },
  // dialogue
  stepBack: { zh: '结束对话', en: 'Step back' }, choose: { zh: '选择', en: 'choose' }, confirm: { zh: '确认', en: 'confirm' },
  holdE: { zh: '按住 E', en: 'hold E' }, leaveIt: { zh: '先放着', en: 'Leave it for now' }, putBack: { zh: '放回去', en: 'Put it back' },
  ttsRecorded: { zh: '实景录音', en: 'Recorded voice' }, ttsFallback: { zh: '语音合成', en: 'Synthesised voice' },
  ttsNoVoice: { zh: '语音合成（本机没有中文语音）', en: 'Synthesised voice (no Chinese voice on this device)' }, ttsNone: { zh: '仅字幕', en: 'Subtitles only' },
  shanghainese: { zh: '沪语', en: 'in Shanghainese' },
  // mission
  m1Num: { zh: '任务一', en: 'Mission One' }, m1Title: { zh: '错交', en: 'The Wrong Handoff' },
  m1Done: { zh: '任务完成', en: 'Mission complete' },
  devDrizzle: { zh: '开发 · 小雨将至', en: 'DEV · Drizzle coming in' }, devClear: { zh: '开发 · 转晴', en: 'DEV · Clearing' },
  mapStall: { zh: '修表摊', en: 'Watch stall' },
  // belongings
  pCourier: { zh: '快递员', en: 'Courier' }, pTakeParcel: { zh: '取快递', en: 'Take your parcel' },
  gotParcel: { zh: (n) => `收到：${n}`, en: (n) => `Got it: ${n}` }, listSep: { zh: '、', en: ', ' },
  hintUmbrella: { zh: '伞在手上了：按 U 撑伞', en: 'You have an umbrella now: U to open it' },
  hintAnc: { zh: '耳机在身上：按 H 开降噪', en: 'Headphones on you: H for noise cancelling' },
  umbrellaOpen: { zh: '撑伞', en: 'Umbrella up' }, umbrellaClose: { zh: '收伞', en: 'Umbrella down' },
  ancOn: { zh: '降噪已开', en: 'Noise cancelling on' }, ancOff: { zh: '降噪已关', en: 'Noise cancelling off' },
  // DiDi
  rideArrived: { zh: '已到达', en: 'Arrived' }, rideContinue: { zh: '继续', en: 'Continue' },
  pDidi: { zh: (p) => `滴滴 ${p}`, en: (p) => `DiDi ${p}` }, pGetIn: { zh: '上车', en: 'Get in' }, mapDidi: { zh: '你的车', en: 'Your ride' },
  rideHint: { zh: '1–4 回话 · 鼠标环顾', en: '1–4 to answer · mouse to look around' },
  // map areas
  areas: { hankou: { zh: '汉口路', en: 'Hankou Road' }, zhongshan: { zh: '中山东一路', en: 'Zhongshan Road (E-1)' }, promenade: { zh: '外滩观景平台', en: 'The Promenade' }, customs: { zh: '海关大楼', en: 'Customs House' } },
};

// a key from S (functions are called with args)
export function t(key, ...args) {
  const v = S[key]; if (v == null) return key;
  const x = typeof v === 'object' && !Array.isArray(v) ? (v[lang] ?? v.zh) : v;
  return typeof x === 'function' ? x(...args) : x;
}

// static markup: elements with data-t="key" get their text from S
export function applyStatic(root = typeof document !== 'undefined' ? document : null) {
  if (!root) return;
  for (const el of root.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
  const keys = root.getElementById ? root.getElementById('keys') : null;
  if (keys) keys.innerHTML = S.keys.map(([k, v]) => `<span><kbd>${k}</kbd>${tr(v)}</span>`).join('');
}
