// The Controls page: every key and mouse action in one place, opened from the title screen and from
// the pause menu (Esc). Keyboard and mouse only for now; DEVICES is a list so a controller tab can be
// added later as another entry with its own sections, without touching the page.
import { getLang, onLang } from './i18n.js';

const T = (zh, en) => (getLang() === 'zh' ? zh : en);
// a row: [keys (each one a key cap; '+' joins keys pressed together, '/' separates alternatives), zh, en]
const KBM = [
  { zh: '走动', en: 'Moving', rows: [
    [['W', 'A', 'S', 'D'], '走（方向键也行）', 'Walk (the arrow keys work too)'],
    [['Shift'], '快走、跑：大约 45 秒后要停下喘口气，屏幕上的细条是体力', 'Hurry: about 45 s flat out before you must catch your breath; the slim bar is your stamina'],
    [['Space'], '跳一下', 'Jump (a short hop)'],
    [['Mouse'], '看四周。先点一下画面，鼠标才会被游戏接管', 'Look around. Click the page first so the game takes the mouse'],
    [['Tab'], '按住看小地图', 'Hold for the minimap'],
  ] },
  { zh: '和人与东西打交道', en: 'People and things', rows: [
    [['E'], '和看着的人说话、看看东西、用它；也是“确定”', 'Talk to, look at or use whatever you are looking at; also confirms a choice'],
    [['W', '/', 'S'], '对话或特写时选上一项、下一项（↑↓ 和滚轮也行）', 'In a conversation or close-up: move the highlighted choice (↑↓ and the wheel work too)'],
    [['T'], '用自己的话和看着的人聊（打字或说话）', 'Talk to whoever you are looking at in your own words (type or speak)'],
    [['Enter'], '聊天时发出你打的话', 'In a conversation: send what you typed'],
    [['1', '–', '4'], '坐着时（快马里、朋友家）选回答', 'When sitting (in a Kuaima, at a friend\'s place): choose an answer'],
    [['Esc'], '离开对话、特写或提示', 'Leave a conversation, close-up or notice'],
  ] },
  { zh: '随身的东西', en: 'Your things', rows: [
    [['P'], '手机：信语、易付、快马、购物、地图', 'Your phone: Xinyu, YiPay, Kuaima, shopping, maps'],
    [['J'], '日志：任务的每一步、身边的人', 'The journal: each step of your quests, the people in your life'],
    [['I'], '人物页（← → 或 1–7 换页）', 'The character page (← → or 1–7 change tabs)'],
    [['N'], '本子（1–4 翻页）', 'Your notebook (1–4 turn its pages)'],
    [['M'], '地图：点一个地方设路标', 'The map: click a place to set a waypoint'],
    [['U'], '撑伞、收伞（买了伞并带在身上时）', 'Open or close your umbrella (once you have one with you)'],
    [['H'], '降噪耳机开关（带着耳机时）', 'Noise cancelling on or off (with the headphones)'],
    [['G'], '拍照模式（做好云台后）：滚轮或 [ ] 变焦，空格或点击拍', 'Photo mode, once you have built the gimbal: wheel or [ ] to zoom, Space or click to shoot'],
  ] },
  { zh: '开车', en: 'Driving', rows: [
    [['W', '/', 'S'], '油门、刹车（停住后按住 S 倒车）', 'Throttle and brake (hold S once stopped to reverse)'],
    [['A', '/', 'D'], '转向', 'Steer'],
    [['Space'], '手刹', 'Handbrake'],
    [['V'], '车后视角或驾驶座', 'Chase camera or the driver\'s seat'],
    [['H'], '喇叭（上海市区禁鸣）', 'Horn (banned in central Shanghai)'],
    [['E'], '停稳后下车', 'Get out, once stopped'],
  ] },
  { zh: '南京路观光车', en: 'Nanjing Road tram', rows: [
    [['E'], '车停着时上车；停稳后下车', 'Get on while it is stopped; get off once it stops'],
    [['F'], '坐着直接到下一站（时间照样过去）', 'Ride straight on to the next stop (the time still passes)'],
  ] },
  { zh: '游戏', en: 'Game', rows: [
    [['Esc'], '暂停：继续、设置、存档、操作说明', 'Pause: resume, settings, saves, controls'],
    [['C'], '字幕开关', 'Subtitles on or off'],
    [['Shift', '+', 'M'], '声音开关', 'Sound on or off'],
    [['L'], '城市数据（人数、车辆、帧时间）', 'City statistics (people, vehicles, frame time)'],
  ] },
];
export const DEVICES = [{ id: 'kbm', zh: '键盘和鼠标', en: 'Keyboard & mouse', sections: KBM }];

const KEY_ZH = { Mouse: '鼠标', Space: '空格', Shift: 'Shift', Enter: 'Enter', Esc: 'Esc', Tab: 'Tab' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cap = (k) => (k === '/' || k === '+' || k === '–' ? `<span class="sep">${k === '/' ? T('或', 'or') : k}</span>` : `<kbd>${esc(getLang() === 'zh' ? KEY_ZH[k] || k : k)}</kbd>`);

export function createControlsHelp({ onClose } = {}) {
  const el = document.createElement('div');
  el.id = 'controls'; el.className = 'hidden'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
  document.body.appendChild(el);
  let device = DEVICES[0].id;
  function render() {
    const d = DEVICES.find((x) => x.id === device) || DEVICES[0];
    el.innerHTML = `<div class="panel">
      <div class="ph"><span>${esc(T('操作说明', 'Controls'))}</span><button class="x" data-close-controls aria-label="close">✕</button></div>
      ${DEVICES.length > 1 ? `<div class="tabs">${DEVICES.map((x) => `<button data-device="${x.id}" class="${x.id === device ? 'on' : ''}">${esc(T(x.zh, x.en))}</button>`).join('')}</div>` : `<div class="device">${esc(T(d.zh, d.en))}</div>`}
      <div class="cols">${d.sections.map((s) => `<section><h3>${esc(T(s.zh, s.en))}</h3>${s.rows.map(([keys, zh, en]) => `<div class="crow"><span class="keys">${keys.map(cap).join('')}</span><span class="what">${esc(T(zh, en))}</span></div>`).join('')}</section>`).join('')}</div>
      <div class="foot">${esc(T('随时按 Esc，在暂停菜单里再打开这一页。', 'Press Esc at any time and open this page again from the pause menu.'))}</div>
    </div>`;
  }
  el.addEventListener('click', (e) => {
    const t = e.target.closest('[data-device]');
    if (t) { device = t.dataset.device; render(); return; }
    if (e.target.closest('[data-close-controls]') || e.target === el) api.close();
  });
  onLang(() => { if (!el.classList.contains('hidden')) render(); });
  const api = {
    get isOpen() { return !el.classList.contains('hidden'); },
    open() { render(); el.classList.remove('hidden'); },
    close() { if (el.classList.contains('hidden')) return; el.classList.add('hidden'); if (onClose) onClose(); },
  };
  return api;
}
