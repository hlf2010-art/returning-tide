import { icon } from './icons.js';
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

// the page says its language from the start, not only after a switch, so the zh-CN rules in the CSS apply
// on a first load in Chinese too (the title's weight and spacing, the menus' letter-spacing)
if (typeof document !== 'undefined') document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';

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
  // the title card the way a AAA title does it: one line you could put on a poster, then a back-of-the-box
  // logline (stakes, then the hook). The story itself is played, not narrated here. Facts as in the game:
  // he lands on Monday 9 November 2026 (world/agenda.js), he has given himself a year (docs/characters.md),
  // and Old Zhou has been missing since the evening of 29 October, eleven days (world/cast.js, agenda.js)
  tagline: { zh: '一年。一座城。一条九秒的语音。', en: 'One year. One city. One nine-second voicemail.' },
  premise: {
    zh: '2026 年 11 月，纪白落地上海。他给了自己一年：在这里闯出自己的人生，或者回南京，接下父亲的厂。陪他度过每个童年暑假的修表匠老周，已经失踪了十一天，只留下一条语音：“到外滩来。海关钟下面……”',
    en: "November 2026. Ji Bai lands in Shanghai with one year to build a life of his own, or go home to Nanjing and take over his father's factory. Old Zhou, the watchmaker who kept him every childhood summer, has been missing for eleven days. He left one voicemail: “Come to the Bund. Under the Customs clock…”",
  },


  loading: { zh: '正在载入上海…', en: 'Loading Shanghai…' },
  begin: { zh: '走出去', en: 'Step out' },
  failed: { zh: '无法启动（需要 WebGL2）', en: 'Could not start (WebGL2 needed)' },
  voices: { zh: '人物语音', en: 'Voices' }, voicesOriginal: { zh: '原声（普通话）', en: 'Original (Mandarin)' }, voicesDubbed: { zh: '配成我的语言', en: 'Dubbed (my language)' },
  ai: { zh: '自由对话 AI', en: 'Free conversation AI' }, aiAuto: { zh: '本地服务', en: 'Local server' }, aiBrowser: { zh: '浏览器内（下载约1GB）', en: 'In the browser (~1 GB download)' },
  aiServer: { zh: '服务地址 / 模型', en: 'Server / model' },
  voiceServer: { zh: '临时台词的声音', en: 'Voices for new lines' }, voiceServerOff: { zh: '只显示字幕', en: 'Subtitles only' }, voiceServerBrowser: { zh: '浏览器（机器音）', en: 'Browser (robotic)' }, voiceServerLocal: { zh: '本地语音服务', en: 'Local voice server' },
  settings: { zh: '设置', en: 'Settings' },
  language: { zh: '语言', en: 'Language' },
  tabGeneral: { zh: '通用', en: 'General' }, tabGraphics: { zh: '画面', en: 'Graphics' },
  gPreset: { zh: '预设', en: 'Preset' }, gLow: { zh: '低', en: 'Low' }, gMac: { zh: 'Mac M4', en: 'Mac M4' }, gHigh: { zh: '高', en: 'High' }, gUltra: { zh: '极致', en: 'Ultra' }, gCustom: { zh: '自定义', en: 'Custom' },
  gScale: { zh: '渲染分辨率', en: 'Render resolution' }, gFps: { zh: '帧率上限', en: 'Frame-rate cap' }, gNoCap: { zh: '不限', en: 'None' },
  gLod: { zh: '细节与密度', en: 'Detail & density' }, gMedium: { zh: '中', en: 'Medium' },
  gAA: { zh: '抗锯齿', en: 'Anti-aliasing' }, gShadows: { zh: '灯光阴影', en: 'Lamp shadows' }, gAO: { zh: '环境光遮蔽', en: 'Ambient occlusion' },
  gSSR: { zh: '湿地面反射', en: 'Wet-ground reflections' }, gBloom: { zh: '光晕', en: 'Bloom' }, gMirror: { zh: '江面倒影', en: 'River reflection' },
  gAuto: { zh: '自动降分辨率', en: 'Auto resolution' },
  gReload: { zh: '人流与车流在重新载入后改变', en: 'Crowds and traffic change after a reload' }, gReloadNow: { zh: '重新载入', en: 'Reload' },
  gHint: { zh: '首次运行按显卡自动选择；Mac mini M4 建议 “Mac M4”，RTX 4080 级别建议 “极致”。', en: 'Chosen for your GPU on first run. Mac mini M4: “Mac M4”. RTX 4080 class: “Ultra”.' },
  gStatus: { zh: (gpu, fps, ms, w, h, d) => `显卡：${gpu} · ${fps} fps（${ms} ms）· 画面 ${w}×${h}${d ? ` · 已自动降低 ${d} 级` : ''}`, en: (gpu, fps, ms, w, h, d) => `GPU: ${gpu} · ${fps} fps (${ms} ms) · drawing ${w}×${h}${d ? ` · auto stepped down ${d}` : ''}` },
  questNew: { zh: (t) => `新任务 · ${t}`, en: (t) => `New quest · ${t}` }, questDone: { zh: (t) => `完成 · ${t}`, en: (t) => `Done · ${t}` },
  questFailed: { zh: (t) => `错过了 · ${t}`, en: (t) => `Missed · ${t}` }, questNext: { zh: (t) => `下一步：${t}`, en: (t) => `Next: ${t}` },
  questWait: { zh: (c) => `等到 ${c}`, en: (c) => `Waiting until ${c}` },
  padOn: { zh: '手柄已连接 · A 互动 · B 返回 · Y 手机 · LB 日志 · RB 地图 · 菜单键 暂停', en: 'Controller connected · A interact · B back · Y phone · LB journal · RB map · Menu pause' },
  padOff: { zh: '手柄已断开', en: 'Controller disconnected' },
  saves: { zh: '存档', en: 'Saves' },
  tipsSetting: { zh: '新手提示', en: 'Tips' },
  musicSetting: { zh: '店里和车里的音乐', en: 'Music in shops and cars' },
  musicCredits: { zh: '音乐署名', en: 'Music credits' },
  benchmark: { zh: '性能测试', en: 'Benchmark' }, benchRun: { zh: '运行（约 30 秒）', en: 'Run (about 30 s)' },
  waypoint: { zh: '路标', en: 'Waypoint' }, waypointHere: { zh: '到了。', en: 'You\'re there.' },
  day: { zh: (n) => `第 ${n} 天`, en: (n) => `Day ${n}` },
  lateNightLights: { zh: '晚上十点 · 外滩换成深夜灯光：泛光暗下来，对岸的大屏熄了，只留下轮廓。', en: '10 pm · The Bund goes over to its late-night lighting: the floodlights dim, the LED walls across the river go dark, the outlines stay lit.' },
  subtitles: { zh: '字幕', en: 'Subtitles' },
  sound: { zh: '声音', en: 'Sound' },
  on: { zh: '开', en: 'On' }, off: { zh: '关', en: 'Off' },
  resume: { zh: '继续', en: 'Resume' },
  paused: { zh: '暂停', en: 'Paused' },
  controls: { zh: '操作', en: 'Controls' },
  close: { zh: '关闭', en: 'Close' },
  place: { zh: '外滩 · 汉口路', en: 'The Bund · Hankou Road' },
  placeSub: { zh: '十一月 · 15:00', en: 'November · 15:00' }, month: { zh: '十一月', en: 'November' },
  keys: [
    ['WASD', { zh: '走', en: 'walk' }], ['Shift', { zh: '快走', en: 'hurry' }], ['Space', { zh: '跳', en: 'jump' }],
    ['E', { zh: '互动', en: 'interact' }], ['M', { zh: '地图', en: 'map' }], ['P', { zh: '手机', en: 'phone' }], ['J', { zh: '日志', en: 'journal' }], ['I', { zh: '人物', en: 'character' }],
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
  areas: { hankou: { zh: '汉口路', en: 'Hankou Road' }, zhongshan: { zh: '中山东一路', en: 'Zhongshan Road (E-1)' }, promenade: { zh: '外滩观景平台', en: 'The Promenade' }, customs: { zh: '海关大楼', en: 'Customs House' }, nanjing: { zh: '南京东路步行街', en: 'Nanjing Road East' }, henan: { zh: '河南中路', en: 'Henan Road (M)' }, metro: { zh: '南京东路站', en: 'East Nanjing Rd Station' } },
};

// Lujiazui's areas (world/lujiazuiLayout.js ljzZone)
Object.assign(S.areas, { ring: { zh: '明珠环 · 人行天桥', en: 'The Mingzhu Ring' }, roundabout: { zh: '陆家嘴环岛', en: 'Lujiazui Roundabout' }, century: { zh: '世纪大道', en: 'Century Avenue' }, ifc: { zh: '国金中心', en: 'Shanghai IFC' },
  apple: { zh: 'Apple 浦东', en: 'Apple Pudong' }, green: { zh: '陆家嘴中心绿地', en: 'Lujiazui Central Green' }, ljzMetro: { zh: '陆家嘴站', en: 'Lujiazui Station' } });
// Line 2's stations, under the street (world/metro.js areaKey)
Object.assign(S.areas, { enrConc: { zh: '南京东路站 · 站厅', en: 'East Nanjing Rd · concourse' }, enrPlat: { zh: '南京东路站 · 2号线站台', en: 'East Nanjing Rd · Line 2' }, ljzConc: { zh: '陆家嘴站 · 站厅', en: 'Lujiazui · concourse' }, ljzPlat: { zh: '陆家嘴站 · 2号线站台', en: 'Lujiazui · Line 2' }, metroTrain: { zh: '地铁2号线 · 车厢', en: 'Line 2 · aboard' } });

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
  const KEY_ICON = { WASD: 'walk', Shift: 'run', Space: 'jump', E: 'hand', M: 'map', P: 'phone', J: 'book', Esc: 'menu' };
  if (keys) keys.innerHTML = S.keys.map(([k, v]) => `<span title="${tr(v)}"><kbd>${k}</kbd>${KEY_ICON[k] ? icon(KEY_ICON[k], tr(v)) : tr(v)}</span>`).join('');
}
