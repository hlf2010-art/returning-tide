// First-play tips: each shown once (remembered in this browser), one at a time, a few seconds each,
// and only when you're free (not in a conversation, a menu or a ride). Settings → General turns them
// off; turning them back on shows them again from the start.
import { getLang } from './i18n.js';

const T = (zh, en) => (getLang() === 'zh' ? zh : en);
const KEY = 'bund-tips', ON = 'bund-tips-on';
export const TIPS = {
  move: ['WASD 走 · Shift 快走 · 鼠标看 · E 和看着的人或东西互动', 'WASD to walk · Shift to hurry · the mouse to look · E to use whatever you\'re looking at'],
  phone: ['P 拿出手机：微信、支付宝、滴滴、淘宝、地图', 'P for your phone: WeChat, Alipay, DiDi, shopping, maps'],
  journal: ['J 打开日志：任务的每一步，身边的人对你的感觉', 'J opens your journal: each step of your quests, and how the people in your life feel about you'],
  map: ['M 打开地图（按住 Tab 看小地图）。在地图上点一个地方设路标。', 'M opens the map (hold Tab for the minimap). Click a place on the map to set a waypoint.'],
  talk: ['T 和身边的人聊天（打字或说话）', 'T to talk with someone near you (type, or speak)'],
  hour: ['城市跟着钟点变：灯光、人流、开门关门的店。晚上十点外滩换成深夜灯光。', 'The city follows the clock: the lights, the crowds, which shops are open. At ten the Bund goes over to its late-night lighting.'],
  moment: ['街上会发生一些小事。走近看看，也可以不管。', 'Small things happen on the street. Go and see, or let them be.'],
  cruise: ['浦江游览每个整点开船（10 点到 21 点），闸口买票。闸口旁的轮渡每15分钟一班过江到陆家嘴（6 点到 23 点，¥2）。', 'The river cruise sails on the hour, 10 am to 9 pm: buy a ticket at the gate. Beside it, the ferry crosses to Lujiazui every 15 minutes, 6 am to 11 pm, ¥2.'],
  shop: ['阿潮生煎：在柜台点单，等叫号，端了托盘找位子坐。', 'A-Chao Shengjian: order at the counter, wait for your number, take the tray to a seat.'],
  seat: ['坐着的时候：1–4 回答或选择，E 起身。', 'Sitting down: 1-4 to answer or choose, E to get up.'],
  lend: ['天黑了，云台在你口袋里。看着江边正在拍照的人按 E，借给他试试。', "It's dark, and the gimbal's in your pocket. Look at someone taking a photo by the river and press E to lend it."],
  page: ['听到的问题要写下来才改得了：和平饭店 612 的书桌，或杨浦的工作台。N 随时翻开本子看。', 'What you hear can only be fixed once it\'s written down: the desk in room 612, or your bench in Yangpu. N opens the notebook to read, anywhere.'],
  revise: ['本子的“问题”页：选最多两处改，做出下一版。硬件要去工作台，固件在书桌就行。', 'The notebook\'s Issues page: pick up to two changes and make the next version. Hardware needs the bench; firmware can be done at the desk.'],
};

export function createTips({ isFree }) {
  const el = document.createElement('div'); el.id = 'tip'; document.body.appendChild(el);
  let seen = {}, on = true;
  try { seen = JSON.parse(localStorage.getItem(KEY) || '{}'); on = localStorage.getItem(ON) !== '0'; } catch { /* private mode */ }
  const queue = []; let left = 0, gap = 0;
  const remember = () => { try { localStorage.setItem(KEY, JSON.stringify(seen)); } catch { /* */ } };
  const api = {
    get on() { return on; },
    // persist: false for a session-only switch (measurement tools)
    setOn(v, persist = true) { on = !!v; if (persist) { try { localStorage.setItem(ON, on ? '1' : '0'); } catch { /* */ } if (on) { seen = {}; remember(); } } if (!on) { queue.length = 0; el.classList.remove('on'); left = 0; } },
    // once ever: queued until you're free
    show(id) { if (!on || seen[id] || queue.includes(id) || !TIPS[id]) return; queue.push(id); },
    seen: (id) => !!seen[id],
    update(dt) {
      if (left > 0) { left -= dt; if (left <= 0) { el.classList.remove('on'); gap = 2.5; } return; }
      if (gap > 0) { gap -= dt; return; }
      if (!queue.length || !isFree()) return;
      const id = queue.shift(); seen[id] = true; remember();
      const [zh, en] = TIPS[id];
      el.innerHTML = `<small>${T('提示', 'Tip')}</small><span></span>`; el.querySelector('span').textContent = T(zh, en);
      el.classList.add('on'); left = 7.5;
    },
  };
  return api;
}
