// The protagonist's phone (DOM overlay). A view on engine/life.js: it reads the life state and
// dispatches actions; the world reacts to the life state elsewhere.
//   P raises / lowers it. While it's up the mouse works the screen and WASD still walks you
//   (slowly: eyes on the phone); Esc / Backspace goes back; Enter takes the obvious action.
// Screens: lock -> home -> 微信 (chats, a chat), 钱包 (balances, ledger), 日历, 电话 (recent calls),
// the Manner mini-program (order + pay), the pay sheet, calls (incoming / in progress).
import './phone.css';
import { stamp, clockText, markRead, unreadTotal, pay, balance, METHODS, preview, post } from '../../engine/life.js';
import { isYear, dateOf } from '../../engine/year.js';
import { incidentText } from '../../engine/roadIncident.js';
import { shortDate, elapsed } from '../../world/career.js';
import { storyContext } from '../../world/story.js';
import { reply, respondToInvite } from '../../world/agenda.js';
import { PEOPLE, GROUP, ME } from '../../world/cast.js';
import { createPhoneMedia, isVideo, videoCaption, videoLength, voiceSecs, fmtTime } from './media.js';
import { getLang, onLang } from '../i18n.js';
import { enText } from '../../world/agendaEn.js';
import { createShopApp } from './shopApp.js';
import { createDidiApp } from './didiApp.js';
import { systemPrompt, withReminder, replyOk, cannedReply } from '../../world/personas.js';
import { appGlyph, payLogo, BRAND_COLOR, mark } from '../brands.js';
import { maker, level, nextLevelAt, LEVELS, BLUEPRINTS, PHOTO_TARGETS, ACHIEVEMENTS, sharePhoto } from '../../engine/maker.js';
import { warmth } from '../../world/agenda.js';
import { spoken, isZh } from '../../engine/llm.js';
import { summary as workSummary, unwritten as workUnwritten } from '../../engine/studio.js';
import { ROMANCE } from '../../engine/hearts.js';
import { askToMeet, romanceStanding } from '../../world/romance.js';

// one language at a time: Z(zh, en) picks; X(text) translates what people wrote; nm(id) names them
const Z = (zh, en) => (getLang() === 'zh' ? zh : en);
const X = (text) => (getLang() === 'en' ? enText(text) : text);
const nm = (id) => { const p = PEOPLE[id]; if (id === 'me') return Z(ME.name, ME.en); return p ? Z(p.name, p.en === 'Dad (Ji Jianguo)' ? 'Dad' : p.en) : id; };
// English: given names (Mingxuan, Ruoan), as friends would; Momo stays Momo
const shortEn = (id, p) => (id === 'dad' ? 'Dad' : id === 'manner' ? 'Manner' : /^[A-Za-z]/.test(p.short) ? p.short : (p.en || '').split(' ').slice(1).join(' ') || p.en);
const short = (id) => { const p = PEOPLE[id]; return p ? Z(p.short, shortEn(id, p)) : id; };
const GROUP_NAME = () => Z(GROUP.title, 'The Jinling Five +1');
const METHOD = (k) => ({ wechat: Z('微信支付', 'WeChat Pay'), alipay: Z('支付宝', 'Alipay'), bank: Z('银行转账', 'Bank transfer'), card: Z('信用卡', 'Credit card') }[k]);
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function threadTitle(t) {
  if (t.kind === 'group') return GROUP_NAME();
  if (t.id === 'manner') return Z('Manner Coffee 汉口路店', 'Manner Coffee, Hankou Rd');
  if (PEOPLE[t.id]) return nm(t.id);
  return t.title;
}
function previewOf(m) {
  const secs = voiceSecs(m);
  if (m.kind === 'voice') return Z(`[语音] ${secs}″`, `[Voice] ${secs}″`);
  if (isVideo(m)) return Z(`[视频] ${videoCaption(m.text)}`, `[Video] ${videoCaption(X(m.text))}`).trim();
  if (m.kind === 'card') return Z('[名片]', '[Contact card]');
  if (m.kind === 'invite') return Z(`[邀请] ${m.meta && m.meta.title}`, `[Invitation] ${X(m.meta && m.meta.title)}`);
  return X(m.text);
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
const person = (id) => PEOPLE[id] || { name: id === 'me' ? ME.name : id, short: id, color: '#777' };
const LOGO_AV = { jd: 'jd', taobao: 'taobao', didi: 'didi', manner: 'manner' };
// people with a photograph (their character sheets: public/people/<id>/): the rest get a coloured initial
const PHOTO_AV = { me: './people/jibai/face-neutral.jpg', gunian: './people/gunian/face-smile.jpg' };
const avatar = (id, size = '') => { const p = person(id); if (LOGO_AV[id]) return `<div class="av logo ${size}" style="background:${BRAND_COLOR[LOGO_AV[id]]}">${appGlyph(LOGO_AV[id], 22)}</div>`; if (PHOTO_AV[id]) return `<div class="av photo ${size}" style="background-image:url('${PHOTO_AV[id]}')"></div>`; return `<div class="av ${size}" style="background:${id === 'me' ? '#2d6cdf' : p.color}">${esc(initial(id))}</div>`; };
const initial = (id) => { const p = person(id); if (getLang() === 'en') return id === 'me' ? 'J' : (PEOPLE[id] ? shortEn(id, PEOPLE[id]) : '?')[0]; return (id === 'me' ? '白' : p.short || p.name).slice(0, 1); };
const ago = (L, at) => { const d = stamp(L) - at; if (d < 1) return Z('刚刚', 'now'); if (d < 60) return Z(`${d}分钟前`, `${d} min ago`); return clockText(at); };
const yuan = (n) => `¥${Math.abs(n).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`;

export const MANNER_MENU = [
  { id: 'americano', name: '美式', en: 'Americano', price: 10, desc: '冰/热', descEn: 'Iced or hot' },
  { id: 'latte', name: '拿铁', en: 'Latte', price: 15, desc: '经典', descEn: 'The classic' },
  { id: 'oat', name: '燕麦拿铁', en: 'Oat latte', price: 18, desc: '燕麦奶', descEn: 'With oat milk' },
  { id: 'flatwhite', name: '澳白', en: 'Flat white', price: 18, desc: '双份浓缩', descEn: 'Double shot' },
  { id: 'osmanthus', name: '桂花拿铁', en: 'Osmanthus latte', price: 20, desc: '秋季限定', descEn: 'Autumn special' },
];

export function createPhone({ getLife, calls, audio = null, onChange = null, onEvent = null, ride = null, voice = null, llm = null }) {
  const root = document.createElement('div'); root.id = 'phone';
  root.innerHTML = '<div class="body"><div class="screen"><div class="island"></div><div class="status"></div><div class="host"></div><div class="homebar"></div></div></div>';
  document.body.appendChild(root);
  const banner = document.createElement('div'); banner.id = 'phone-banner'; document.body.appendChild(banner);
  const host = root.querySelector('.host'), statusEl = root.querySelector('.status'), island = root.querySelector('.island'), homebar = root.querySelector('.homebar');
  const S = { open: false, unlocked: false, stack: [{ s: 'lock' }], call: null, sheet: null, playing: null, liveText: '' };
  let bannerTimer = 0, lastNote = 0, statusKey = '', islandHtml = null;
  // voice notes, videos and the other side of a call (./media.js): recorded voices, never synthetic speech
  const media = createPhoneMedia({ audio, voice, enText, onChange: () => refreshMedia() });
  // what's playing, shown in place (a full redraw would replay the screen's slide-in)
  function refreshMedia() {
    if (!S.open) return;
    for (const el of host.querySelectorAll('[data-act="playVoice"], [data-act="playVideo"]')) {
      const on = media.isPlaying(el.dataset.id), m = findMsg(L(), el.dataset.id);
      el.classList.toggle('playing', on);
      const pi = el.querySelector('.pi'); if (pi) pi.innerHTML = on ? '<i></i><i></i>' : '▶';
      const vp = el.querySelector('.vplay'); if (vp) vp.textContent = on ? '' : '▶';
      if (m && m.played) el.querySelector('.unplayed')?.remove();
      if (!on && m && m.kind === 'voice') { const vt = el.querySelector('.vt'), u = el.querySelector('.prog u'); if (vt) vt.textContent = `${voiceSecs(m)}″`; if (u) u.style.width = '0'; }
    }
  }

  const L = () => getLife();
  const top = () => S.stack[S.stack.length - 1];
  const go = (s, arg = {}) => { S.stack.push({ s, ...arg }); S.sel = null; render(); };
  const shopApp = createShopApp({ L: () => getLife(), Z, esc, yuan, go: (s, arg) => go(s, arg), render: () => render(), top: () => top(), openSheet: (sh) => { S.sheet = sh; render(); } });
  const didiApp = createDidiApp({
    L: () => getLife(), Z, esc, go: (s, arg) => go(s, arg), render: () => render(), top: () => top(),
    getRide: () => (ride && ride.get ? ride.get() : null), onRequest: (id) => ride && ride.request(id), onCancel: () => ride && ride.cancel(), onMessage: (q) => ride && ride.message(q),
  });
  const SHOP_APPS = ['jd', 'taobao', 'didi'];                              // apps that notify as themselves, not through WeChat
  const back = () => {
    if (S.sheet) { S.sheet = null; render(); return; }
    if (S.call) return;                                                     // hang up with the red button
    if (S.stack.length > 1) { S.stack.pop(); S.sel = null; render(); } else close();
  };

  function setOpen(v) {
    if (S.open === v) return;
    S.open = v; root.classList.toggle('up', v); S.sel = null;
    if (v) { banner.classList.remove('on'); if (document.pointerLockElement) document.exitPointerLock(); }
    if (onChange) onChange(v);
    render();
  }
  const open = (screen = null, arg = {}) => { setOpen(true); if (screen && S.unlocked) { S.stack = [{ s: 'home' }]; go(screen, arg); } };
  const close = () => { if (S.call && S.call.state === 'active') return; setOpen(false); };

  // ---- rendering ----
  function status() {
    const l = L(), dark = ['lock', 'home', 'call'].includes(S.call ? 'call' : top().s);
    statusEl.style.color = dark ? '#fff' : '#111';
    homebar.classList.toggle('light', dark);
    const key = `${clockText(l.clock.minute)}|${dark}`;
    if (key === statusKey) return; statusKey = key;
    statusEl.innerHTML = `<span>${clockText(l.clock.minute)}</span><span class="right"><span class="bars"><i style="height:4px"></i><i style="height:6px"></i><i style="height:8px"></i><i style="height:10px"></i></span><span>5G</span><span class="batt"></span></span>`;
  }
  function render() {
    status();
    const l = L(), t = S.call ? { s: 'call' } : top();
    let html = '';
    if (t.s === 'lock') html = lockView(l);
    else if (t.s === 'home') html = homeView(l);
    else if (t.s === 'chats') html = chatsView(l);
    else if (t.s === 'chat') html = chatView(l, t.id);
    else if (t.s === 'wallet') html = walletView(l);
    else if (t.s === 'calendar') html = calendarView(l);
    else if (t.s === 'recents') html = recentsView(l);
    else if (t.s === 'photos') html = photosView(l);
    else if (t.s === 'sketch') html = sketchView(l);
    else if (t.s === 'manner') html = mannerView(l, t);
    else if (t.s === 'call') html = callView(l);
    else if (shopApp.views[t.s]) html = shopApp.views[t.s](l, t);
    else if (didiApp.views[t.s]) html = didiApp.views[t.s](l, t);
    if (media.isPlaying() && (t.s !== 'chat' || !S.open || (S.lastChat && S.lastChat !== t.id))) media.stop();      // a voice note or a clip plays while its chat is open
    const keep = t.s === 'chat' ? host.querySelector('.msgs') : null, atEnd = !keep || keep.scrollHeight - keep.scrollTop - keep.clientHeight < 40, was = keep ? keep.scrollTop : 0;
    host.innerHTML = html + (S.sheet ? sheetView(l) : '');
    if (t.s === 'chat') { const m = host.querySelector('.msgs'); if (m) m.scrollTop = atEnd || S.lastChat !== t.id ? m.scrollHeight : was; S.lastChat = t.id; } else S.lastChat = null;
    media.paint(host, (id) => findMsg(L(), id));
    markSel();
  }

  function lockView(l) {
    const yd = isYear(l) ? dateOf(l) : null, d = yd ? new Date(yd.y, yd.m - 1, yd.d) : new Date(2026, 10, 14 + (l.clock.day - 1));   // a year game stands on real dates (engine/year.js)
    const notes = l.notifications.slice(-5).reverse().map((n) => `<div class="note" data-act="openThread" data-id="${esc(n.thread)}">${avatar(n.from)}<div><div class="t">${SHOP_APPS.includes(n.from) ? esc(nm(n.from)) : `${Z('微信', 'WeChat')} · ${esc(nm(n.from))}`}</div><div class="p">${esc(X(n.text))}</div></div></div>`).join('');
    const date = Z(`${d.getMonth() + 1}月${d.getDate()}日 星期${WEEK[d.getDay()]}`, `${DAYS_EN[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`);
    return `<div class="view lock"><div class="date">${date}</div><div class="time">${clockText(l.clock.minute)}</div>
      <div class="notes">${notes}</div>${S.unlocking ? '<div class="face"></div>' : ''}<div class="hint" data-act="unlock" style="cursor:pointer">${Z('轻点或按 Enter 用面容解锁', 'Tap or press Enter to unlock')}</div></div>`;
  }
  function homeView(l) {
    const unread = unreadTotal(l) - SHOP_APPS.reduce((n, k) => n + ((l.threads[k] && l.threads[k].unread) || 0), 0), shopUnread = (k) => (l.threads[k] && l.threads[k].unread) || 0;
    const app = (id, label, bg, glyph, badge = 0) => `<div class="app" data-act="app" data-id="${id}"><div class="ic" style="background:${bg}">${glyph}</div>${badge ? `<span class="badge">${badge}</span>` : ''}<span>${label}</span></div>`;
    return `<div class="view home"><div class="grid">
      ${app('chats', Z('微信', 'WeChat'), BRAND_COLOR.wechat, appGlyph('wechat', 34), unread)}
      ${app('wallet', Z('钱包', 'Wallet'), 'linear-gradient(160deg,#2b2b2e,#000)', '¥')}
      ${app('calendar', Z('日历', 'Calendar'), '#fff;color:#e33', `<span style="color:#e33;font-size:24px">${isYear(l) ? dateOf(l).d : l.clock.day + 13}</span>`)}
      ${app('recents', Z('电话', 'Phone'), 'linear-gradient(160deg,#5ee47a,#22b24a)', '✆')}
      ${app('jd', Z('京东', 'JD'), BRAND_COLOR.jd, appGlyph('jd'), shopUnread('jd'))}
      ${app('taobao', Z('淘宝', 'Taobao'), BRAND_COLOR.taobao, appGlyph('taobao', 34), shopUnread('taobao'))}
      ${app('didi', Z('滴滴出行', 'DiDi'), BRAND_COLOR.didi, appGlyph('didi'), shopUnread('didi'))}
      ${app('manner', 'Manner', BRAND_COLOR.manner, appGlyph('manner'))}
      ${app('alipayApp', Z('支付宝', 'Alipay'), BRAND_COLOR.alipay, appGlyph('alipay', 34))}
      ${app('photos', Z('相册', 'Photos'), 'linear-gradient(160deg,#ffb347,#ff5e62 45%,#6a5acd)', '<span style="font-size:24px">✿</span>')}
      ${app('sketch', Z('速写本', 'Sketchbook'), 'linear-gradient(160deg,#f6f1e4,#e2d6b8)', '<span style="font-size:22px;color:#1d3a8a">✎</span>')}
      </div>
      <div class="dock">${app('chats', '', BRAND_COLOR.wechat, appGlyph('wechat', 30), 0)}${app('recents', '', 'linear-gradient(160deg,#5ee47a,#22b24a)', '✆')}${app('wallet', '', 'linear-gradient(160deg,#2b2b2e,#000)', '¥')}${app('calendar', '', '#fff', `<span style="color:#e33;font-size:20px">${isYear(l) ? dateOf(l).d : l.clock.day + 13}</span>`)}</div></div>`;
  }
  function chatsView(l) {
    const rows = l.order.map((id) => l.threads[id]).filter((t) => t && !SHOP_APPS.includes(t.id)).map((t) => {
      const last = t.messages[t.messages.length - 1];
      const who = last && t.kind === 'group' && last.from !== 'me' ? `${short(last.from)}: ` : '';
      const av = t.kind === 'group' ? `<div class="av" style="background:#5d6b82;font-size:12px">${Z('五虎', 'J5')}</div>` : avatar(t.members.find((m) => m !== 'me'));
      return `<div class="row" data-act="openThread" data-id="${esc(t.id)}">${av}${t.unread ? `<span class="badge">${t.unread}</span>` : ''}<div class="mid"><div class="n">${esc(threadTitle(t))}</div><div class="pv">${esc(who + (last ? previewOf(last) : ''))}</div></div><div class="tm">${last ? ago(l, last.at) : ''}</div></div>`;
    }).join('');
    return `<div class="view"><div class="bar"><span class="back" data-act="back">‹</span>${Z('微信', 'WeChat')}</div><div class="scroll">${rows}</div></div>`;
  }
  function chatView(l, id) {
    const t = l.threads[id]; if (!t) return '';
    markRead(l, id);
    let lastAt = -1e9, pendingReplies = null;
    const msgs = t.messages.map((m) => {
      let out = '';
      if (m.at - lastAt > 20) out += `<div class="sys">${clockText(m.at)}</div>`; lastAt = m.at;
      const mine = m.from === 'me';
      let bub;
      if (m.kind === 'voice') {
        const secs = voiceSecs(m), bars = Array.from({ length: 9 }, (_, i) => `<i style="height:${4 + ((i * 7 + secs) % 11)}px"></i>`).join(''), on = media.isPlaying(m.id);
        const label = m.meta && m.meta.voicemail ? Z('语音留言', 'Voicemail') : Z('语音', 'Voice message');
        bub = `<div class="bub voice ${on ? 'playing' : ''}" data-act="playVoice" data-id="${m.id}" data-nav="1" role="button" tabindex="0" aria-label="${esc(`${label} ${secs}″`)}" style="min-width:${Math.min(200, 96 + secs * 6)}px"><span class="pi">${on ? '<i></i><i></i>' : '▶'}</span><span class="wave">${bars}</span><span class="vt" data-ptime="${m.id}">${secs}″</span>${!mine && !m.played ? '<span class="unplayed"></span>' : ''}<span class="prog"><u data-prog="${m.id}"></u></span></div>${m.transcribed ? `<div class="trans">${esc(X(m.text))}</div>` : `<div class="sys" data-act="transcribe" data-id="${m.id}" style="cursor:pointer;align-self:flex-start">${Z('转文字', 'Transcribe')}</div>`}`;
      } else if (isVideo(m)) {                                                    // a clip: plays in the bubble (./media.js draws it)
        const on = media.isPlaying(m.id), cap = videoCaption(X(m.text)), dur = videoLength(m);
        bub = `<div class="bub vid ${on ? 'playing' : ''}" data-act="playVideo" data-id="${m.id}" data-nav="1" role="button" tabindex="0" aria-label="${esc(Z('视频', 'Video'))} ${fmtTime(dur)}"><canvas data-vid="${m.id}" width="352" height="468"></canvas><span class="vplay">${on ? '' : '▶'}</span>
          <div class="vbar"><span class="vt" data-ptime="${m.id}" data-kind="video">0:00 / ${fmtTime(dur)}</span><span class="track" data-act="seekVideo" data-id="${m.id}"><u data-prog="${m.id}"></u></span></div></div>${cap ? `<div class="bub vcap">${esc(cap)}</div>` : ''}`;
      } else if (m.kind === 'invite') {
        const inv = l.invites.find((i) => i.id === m.meta.invite) || {};
        const dayDiff = m.meta.at != null ? elapsed(l, l.clock.day, Math.floor(m.meta.at / 1440)) : 0;                 // real days (weeks can lie between playable days)
        const when = m.meta.at != null ? `${dayDiff === 1 ? Z('明天 ', 'Tomorrow ') : dayDiff === 2 ? Z('后天 ', 'In two days, ') : dayDiff > 2 && isYear(l) ? `${shortDate(l, getLang(), Math.floor(m.meta.at / 1440))} ` : ''}${clockText(m.meta.at)}` : '';
        bub = `<div class="card"><div class="k">${Z('邀请', 'Invitation')}</div><div class="ti">${esc(X(m.meta.title))}</div><div class="pl">${esc(when)} · ${esc(X(m.meta.place))}</div>${m.text ? `<div style="margin-top:6px">${esc(X(m.text))}</div>` : ''}
          ${inv.status === 'pending' ? `<div class="act"><button class="btn go" data-act="invite" data-id="${esc(inv.id)}" data-yes="1">${Z('接受', 'Accept')}</button><button class="btn no" data-act="invite" data-id="${esc(inv.id)}" data-yes="0">${Z('婉拒', 'Decline')}</button></div>` : `<div class="st ${inv.status === 'accepted' ? '' : 'no'}">${{ accepted: Z('已接受', 'Accepted'), declined: Z('已婉拒', 'Declined'), missed: Z('已过期', 'Missed') }[inv.status] || ''}</div>`}</div>`;
      } else if (m.kind === 'card') {                                          // a WeChat contact card
        const id = m.meta && m.meta.contact, added = !!(l.threads[id]);
        bub = `<div class="card contact"><div class="k">${Z('个人名片', 'Contact card')}</div><div class="ti">${esc(nm(id))}</div><div class="pl">${esc(Z('兰博基尼上海 · 销售顾问', 'Lamborghini Shanghai · Sales consultant'))}</div>
          ${added ? `<div class="st">${Z('已添加', 'Added')}</div>` : `<div class="act"><button class="btn go" data-act="addContact" data-id="${esc(id)}">${Z('添加到通讯录', 'Add contact')}</button></div>`}</div>`;
      } else bub = `<div class="bub">${esc(X(m.text))}</div>`;
      if (!mine && m.replies && m.replied == null) pendingReplies = m;
      out += `<div class="m ${mine ? 'me' : ''}">${avatar(m.from)}<div>${t.kind === 'group' && !mine ? `<div class="who">${esc(short(m.from))}</div>` : ''}${bub}</div></div>`;
      return out;
    }).join('');
    const foot = pendingReplies
      ? `<div class="replies">${pendingReplies.replies.map((r, i) => `<button class="chip" data-act="reply" data-id="${pendingReplies.id}" data-i="${i}">${esc(X(r.text))}</button>`).join('')}</div>`
      : (t.kind === 'person' || t.kind === 'group') && FREE_CHAT.has(id) && llm
        ? `<div class="compose free"><input class="say" data-thread="${esc(id)}" maxlength="200" placeholder="${esc(Z('发消息…（回车发送）', 'Message… (Enter to send)'))}" value="${esc(S.draft[id] || '')}"><button class="btn go" data-act="send" data-id="${esc(id)}">${Z('发送', 'Send')}</button></div>`
        : `<div class="compose">${Z('需要回复时会出现选项', 'Replies appear when there\'s something to answer')}</div>`;
    const typing = S.typing[id] ? `<span class="sub">${Z('对方正在输入…', 'typing…')}</span>` : '';
    // how they feel about you (life relation): a small gauge by the name of a friend or Dad
    const friend = t.kind === 'person' && ['ruoan', 'xuan', 'momo', 'zhixia', 'yinuo', 'dad'].includes(id);
    const aff = friend ? Math.round((l.relations[id] || { affinity: 50 }).affinity) : null;
    const gauge = friend ? `<span class="aff" title="${Z('关系', 'How they feel')}: ${aff}" style="display:inline-flex;align-items:center;gap:4px;margin-left:8px;font-size:10px;opacity:0.75">♥<i style="display:inline-block;width:34px;height:4px;border-radius:2px;background:rgba(127,127,127,0.35);overflow:hidden"><u style="display:block;height:100%;width:${Math.max(4, Math.min(100, aff))}%;background:#e7b96a"></u></i></span>` : '';
    // one of the five: how it stands, by her name; and, when nothing's waiting to be answered, a way to ask to see her
    const hs = t.kind === 'person' && ROMANCE.includes(id) ? romanceStanding(l, id) : null;
    const heartTag = hs && hs.met ? `<span class="htag${hs.over ? ' over' : ''}">${esc(Z(hs.stage.zh, hs.stage.en))}</span>` : '';
    const askRow = hs && hs.met && !hs.over && !pendingReplies && !(S.askedAt && S.askedAt[id] > stamp(l) - 90) ? `<div class="replies hask"><button class="chip" data-act="heartAsk" data-id="${esc(id)}">${Z('约她见面', 'Ask to see her')}</button></div>` : '';
    return `<div class="view chat"><div class="bar"><span class="back" data-act="back">‹</span>${esc(threadTitle(t))}${t.kind === 'group' ? `<span class="sub">(${t.members.length})</span>` : ''}${gauge}${heartTag}${typing}</div><div class="msgs">${msgs}</div>${askRow}${foot}</div>`;
  }
  // the camera roll: what you shot with the gimbal; share one to Moments
  function photosView(l) {
    const m = maker(l), shots = m.photos.slice().reverse();
    const grid = shots.length ? shots.map((p, i) => { const tg = PHOTO_TARGETS.find((x) => x.id === p.target); return `<div class="ph">${p.thumb ? `<img src="${p.thumb}">` : '<div class="noimg"></div>'}<div class="cap">${esc(tg ? Z(tg.zh, tg.en) : Z('随手一拍', 'Snapshot'))} ${'★'.repeat(p.stars || 0)}</div>${p.shared ? `<div class="sh">${Z('已分享', 'Shared')}</div>` : `<button class="btn go sm" data-act="sharePhoto" data-i="${m.photos.length - 1 - i}">${Z('分享到朋友圈', 'Share to Moments')}</button>`}</div>`; }).join('')
      : `<div class="sys" style="padding:20px;text-align:center">${Z('还没有照片。做好云台后按 G 拍照。', 'No photos yet. Build the gimbal, then G to shoot.')}</div>`;
    const list = PHOTO_TARGETS.map((t) => `<div class="ch ${m.shot[t.id] ? 'got' : ''}"><span>${esc(Z(t.zh, t.en))}</span><span>${m.shot[t.id] ? '★'.repeat(m.shot[t.id]) : '—'}</span></div>`).join('');
    return `<div class="view photos"><div class="bar"><span class="back" data-act="back">‹</span>${Z('相册', 'Photos')}</div><div class="scroll"><div class="grid2">${grid}</div>
      <div class="hd2">${Z('外滩夜拍', 'The Bund after dark')} · ${Object.keys(m.shot).length}/${PHOTO_TARGETS.length}</div>${list}</div></div>`;
  }
  // the sketchbook: what's on, how you're doing, what you've built, who you're close to
  function sketchView(l) {
    const m = maker(l), lv = level(m), nx = nextLevelAt(m), lo = LEVELS[lv - 1] || 0, pct = nx ? Math.round(((m.xp - lo) / (nx - lo)) * 100) : 100;
    const now = stamp(l);
    const goals = l.invites.filter((i) => (i.status === 'accepted' && !i.kept && i.at > now - 120) || i.status === 'pending').sort((a, b) => a.at - b.at)
      .map((i) => `<div class="gl"><b>${esc(X(i.title))}</b><span>${clockText(i.at)} · ${esc(X(i.place))}${i.status === 'pending' ? ` · ${Z('待回复', 'answer pending')}` : ''}</span></div>`).join('') || `<div class="sys">${Z('暂时没有约', 'Nothing arranged')}</div>`;
    const builds = Object.entries(BLUEPRINTS).map(([id, b]) => `<div class="bl ${m.gadgets[id] ? 'got' : ''}"><span>${esc(Z(b.zh, b.en))}</span><span>${m.gadgets[id] ? Z(`做好了 · ${Math.round(m.gadgets[id].quality * 100)}%`, `built · ${Math.round(m.gadgets[id].quality * 100)}%`) : Z(`创客 ${b.level}`, `Maker ${b.level}`)}</span></div>`).join('');
    const ws = workSummary(l), wu = ws.grade ? workUnwritten(l).length : 0;
    const work = ws.grade ? `<div class="bl got"><span>${Z(`夜行云台 · 第 ${ws.rev} 版`, `Night gimbal · version ${ws.rev}`)}</span><span>${Z(`${ws.hands} 人用过 · 名单 ${ws.list}`, `${ws.hands} tried it · ${ws.list} on the list`)}</span></div><div class="sys">${Z(`${ws.grams} 克 · ${ws.minutes} 分钟 · 还有 ${ws.open.length} 个问题${wu ? ` · ${wu} 条没写下来` : ''}（N 翻开本子）`, `${ws.grams} g · ${ws.minutes} min · ${ws.open.length} ${ws.open.length === 1 ? 'issue' : 'issues'} open${wu ? ` · ${wu} not written up` : ''} (N opens the notebook)`)}</div>` : '';
    const rel = ['ruoan', 'xuan', 'momo', 'zhixia', 'yinuo', 'dad'].map((id) => { const w = Math.max(0, Math.min(100, 50 + warmth(l, id))); return `<div class="rl"><span>${esc(nm(id))}</span><i><u style="width:${w}%"></u></i></div>`; }).join('');
    const ach = Object.entries(ACHIEVEMENTS).map(([id, a]) => `<span class="ac ${m.achievements.includes(id) ? 'got' : ''}">${esc(Z(a.zh, a.en))}</span>`).join('');
    return `<div class="view sketch"><div class="bar"><span class="back" data-act="back">‹</span>${Z('速写本', 'Sketchbook')}</div><div class="scroll">
      <div class="hd2">${Z('接下来', 'Coming up')}</div>${goals}
      <div class="hd2">${Z('创客', 'Maker')} ${lv} · ${m.xp} XP</div><div class="xp"><u style="width:${pct}%"></u></div><div class="sys">${Z(`粉丝 ${m.followers.toLocaleString()}`, `${m.followers.toLocaleString()} followers`)}</div>
      <div class="hd2">${Z('发明', 'Builds')}</div>${builds}${work}
      <div class="hd2">${Z('朋友', 'Friends')}</div>${rel}
      <div class="hd2">${Z('成就', 'Achievements')} ${m.achievements.length}/${Object.keys(ACHIEVEMENTS).length}</div><div class="acs">${ach}</div></div></div>`;
  }
  function walletView(l) {
    const acct = (k, label, bg) => `<div class="acct" style="background:${bg}"><div class="l">${payLogo(k, 16)} ${label}</div><div class="v">${yuan(balance(l, k))}</div></div>`;
    const memo = (e) => (getLang() === 'en' && e.memoEn ? e.memoEn : e.memo);
    const led = l.wallet.ledger.slice(-12).reverse().map((e) => `<div class="led"><span>${esc(e.to)}<br><small style="color:#999">${METHOD(e.method)} · ${clockText(e.at)} ${esc(memo(e))}</small></span><span class="a ${e.amount < 0 ? 'neg' : 'pos'}">${e.amount < 0 ? '−' : '+'}${yuan(e.amount)}</span></div>`).join('') || `<div class="led"><span style="color:#999">${Z('还没有交易', 'No transactions yet')}</span></div>`;
    return `<div class="view wallet"><div class="bar"><span class="back" data-act="back">‹</span>${Z('钱包', 'Wallet')}</div><div class="scroll">
      ${acct('wechat', Z('微信支付 零钱', 'WeChat Pay balance'), 'linear-gradient(135deg,#07c160,#05984b)')}${acct('alipay', Z('支付宝 余额', 'Alipay balance'), 'linear-gradient(135deg,#1677ff,#0b4fc4)')}
      ${acct('bank', Z('招商银行 储蓄卡 尾号 0731', 'China Merchants Bank debit ••0731'), 'linear-gradient(135deg,#a33,#6d1f1f)')}${acct('card', Z('信用卡 可用额度', 'Credit card, available'), 'linear-gradient(135deg,#333,#000)')}
      <div class="ledger">${led}</div><div class="sys" style="text-align:center;padding:4px 0 20px">${Z('游戏内虚拟资金', 'In-game money only')}</div></div></div>`;
  }
  function calendarView(l) {
    const dayName = (at) => { const dd = elapsed(l, l.clock.day, Math.floor(at / 1440)); return dd <= 0 ? Z('今天', 'Today') : dd === 1 ? Z('明天', 'Tomorrow') : dd > 2 && isYear(l) ? shortDate(l, getLang(), Math.floor(at / 1440)) : Z('后天', 'In two days'); };
    const items = l.calendar.slice().sort((a, b) => a.at - b.at).map((c) => `<div class="row">${avatar(c.with)}<div class="mid"><div class="n">${esc(X(c.title))}</div><div class="pv">${dayName(c.at)} ${clockText(c.at)} · ${esc(X(c.place))}</div></div></div>`).join('');
    const pend = l.invites.filter((i) => i.status === 'pending').map((i) => `<div class="row" data-act="openThread" data-id="${esc(i.thread || i.from)}"><div class="av" style="background:#ccc">?</div><div class="mid"><div class="n">${esc(X(i.title))}</div><div class="pv">${Z('待回复', 'Waiting for your answer')} · ${esc(short(i.from))}</div></div></div>`).join('');
    return `<div class="view"><div class="bar"><span class="back" data-act="back">‹</span>${Z('日历', 'Calendar')}</div><div class="scroll">${items || `<div class="row"><div class="mid"><div class="pv">${Z('暂无安排', 'Nothing planned')}</div></div></div>`}${pend}</div></div>`;
  }
  function recentsView(l) {
    const rows = (l.flags.calls || []).slice().reverse().map((c) => `<div class="row">${avatar(c.from)}<div class="mid"><div class="n" style="${c.missed ? 'color:#e33' : ''}">${esc(nm(c.from))}</div><div class="pv">${c.missed ? Z('未接来电', 'Missed call') : Z('微信语音通话', 'Voice call')}</div></div><div class="tm">${clockText(c.at)}</div></div>`).join('');
    const vm = l.threads.zhou ? l.threads.zhou.messages.filter((m) => m.kind === 'voice' && m.meta && m.meta.voicemail).map((m) => `<div class="row" data-act="openThread" data-id="zhou" style="cursor:pointer">${avatar(m.from)}<div class="mid"><div class="n">${esc(nm(m.from))}</div><div class="pv">${Z('语音留言', 'Voicemail')} · ${voiceSecs(m)}″${m.played ? '' : ` · ${Z('未听', 'not played')}`}</div></div><div class="tm">${clockText(m.at)}</div></div>`).join('') : '';
    return `<div class="view"><div class="bar"><span class="back" data-act="back">‹</span>${Z('最近通话', 'Recents')}</div><div class="scroll">${vm}${rows || (vm ? '' : `<div class="row"><div class="mid"><div class="pv">${Z('没有通话记录', 'No calls yet')}</div></div></div>`)}</div></div>`;
  }
  function mannerView(l, t) {
    if (t.done) return `<div class="view"><div class="bar"><span class="back" data-act="back">‹</span>MANNER COFFEE</div><div class="ok"><div class="big">☕</div><div>${Z('下单成功', 'Order placed')}</div><div class="num">${t.done.num}</div><div style="color:#888;font-size:13px">${esc(Z(t.done.item.name, t.done.item.en))} · ${Z(`约 ${t.done.wait} 分钟`, `about ${t.done.wait} min`)}<br>${Z('做好会通知你，到窗口旁取', 'We\'ll message you when it\'s ready to collect')}</div></div></div>`;
    const items = MANNER_MENU.map((m) => `<div class="item"><div><div class="nm">${Z(m.name, m.en)}</div><div class="ds">${Z(m.desc, m.descEn)}</div></div><div style="display:flex;gap:12px;align-items:center"><span class="pr">¥${m.price}</span><button class="add" data-act="mannerAdd" data-id="${m.id}">+</button></div></div>`).join('');
    return `<div class="view"><div class="bar"><span class="back" data-act="back">‹</span>MANNER COFFEE<span class="sub">${Z('汉口路店', 'Hankou Rd')}</span></div><div class="scroll menu">${items}<div class="sys" style="text-align:center;padding:10px">${Z('自带杯减5元', 'Bring your own cup: ¥5 off')}</div></div></div>`;
  }
  function sheetView(l) {
    const sh = S.sheet;
    if (sh.paying) return `<div class="sheet"><div class="face" style="border-color:#111"></div><div class="to">${Z('面容识别中…', 'Face ID…')}</div></div>`;
    return `<div class="sheet"><div class="to">${Z('付款给', 'Pay')} ${esc(sh.to)}</div><div class="amt">¥${sh.amount}</div><div class="to">${esc(Z(sh.memo, sh.memoEn || sh.memo))}</div>
      <div class="meth" data-act="method"><span>${Z('付款方式', 'Pay with')}</span><span>${payLogo(sh.method)} ${METHOD(sh.method)}（${yuan(balance(l, sh.method))}）›</span></div>
      ${sh.error ? `<div class="to" style="color:#e33;margin-bottom:8px">${esc(sh.error)}</div>` : ''}
      <button class="btn go" style="width:100%;padding:12px 0;font-size:15px" data-act="confirmPay">${Z('确认付款', 'Pay')}</button></div>`;
  }
  function callView(l) {
    const c = S.call, p = person(c.from);
    if (c.state === 'ringing') return `<div class="view call">${avatar(c.from)}<div class="nm">${esc(nm(c.from))}</div><div class="kind">${Z('微信语音通话', 'Voice call')}</div>
      <div class="btns"><button class="rb red" data-act="decline">✕</button><button class="rb green" data-act="accept">✆</button></div></div>`;
    const line = c.script.lines[c.i];
    // your turn: what they just said stays on screen above your answers
    const prev = c.script.lines.slice(0, c.i).reverse().find((x) => x.who !== 'me');
    const body = !line ? '' : line.who === 'me'
      ? `${prev ? `<div class="line">${esc(X(prev.text))}</div>` : ''}<div class="choices">${line.choices.map((ch, i) => `<button class="chip" data-act="say" data-i="${i}" data-nav="1">${esc(X(ch.text))}</button>`).join('')}</div>`
      : `<div class="line">${esc(X(line.text))}</div>`;
    const mm = Math.floor(c.secs / 60), ss = String(Math.floor(c.secs % 60)).padStart(2, '0');
    return `<div class="view call">${avatar(c.from)}<div class="nm">${esc(nm(c.from))}</div><div class="kind" data-calltime="1">${mm}:${ss}</div>${c.said ? `<div class="line"><span class="me">${esc(X(c.said))}</span></div>` : ''}${body}
      <div class="btns"><button class="rb red" data-act="hangup">✕</button></div></div>`;
  }

  // ---- voices: the caller's own recorded voice down a phone line, subtitles always (./media.js) ----
  function speak(text, who, done) { media.say(text, who, done); }

  // ---- calls ----
  function ring(scriptId) {
    if (S.call) return false;
    const script = calls[scriptId]; if (!script) return false;
    S.call = { from: script.from, script, scriptId, i: 0, secs: 0, state: 'ringing', ringFor: 0 };
    // it rings in your pocket: a banner and the ringtone; P brings the phone up to answer
    const p = person(script.from);
    banner.innerHTML = `<div class="av" style="background:${p.color}">${esc(initial(script.from))}</div><div><div class="t">${esc(nm(script.from))}</div><div class="p">${Z('微信语音通话', 'Incoming voice call')}</div></div><div class="k">${Z('P 接听', 'P to answer')}</div>`;
    banner.classList.add('on'); clearTimeout(bannerTimer);
    if (S.open) render();
    if (audio && audio.cue) audio.cue('ring');
    return true;
  }
  // the call's clock runs on screen (by the wall clock: a call goes on whatever the frame rate)
  function callClock() {
    const c = S.call; if (!c || c.state !== 'active') return;
    c.secs = (performance.now() - c.started) / 1000;
    const k = S.open && host.querySelector('[data-calltime]'), txt = `${Math.floor(c.secs / 60)}:${String(Math.floor(c.secs % 60)).padStart(2, '0')}`;
    if (k && k.textContent !== txt) k.textContent = txt;
  }
  setInterval(callClock, 500);
  function logCall(missed) { const l = L(); (l.flags.calls ||= []).push({ from: S.call.from, script: S.call.scriptId || null, at: stamp(l), missed }); }
  function advanceCall() {
    const c = S.call; if (!c) return;
    const line = c.script.lines[c.i];
    if (!line) { setTimeout(() => { if (S.call !== c) return; media.callEnd(); logCall(false); S.call = null; render(); if (onEvent) onEvent({ type: 'call-ended' }); }, 900); render(); return; }
    render();
    if (line.who !== 'me') speak(line.text, line.who, () => { if (S.call === c && c.script.lines[c.i] === line) { c.i++; c.said = ''; advanceCall(); } });
  }

  // ---- input ----
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const act = el.dataset.act, id = el.dataset.id, l = L();
    if (shopApp.act(act, id)) return;
    if (didiApp.act(act, id, el)) return;
    if (act === 'unlock') unlock();
    else if (act === 'back') back();
    else if (act === 'app') { if (id === 'jd' || id === 'taobao') go('shop', { shop: id }); else if (id === 'alipayApp') go('wallet'); else go(id); }
    else if (act === 'openThread' && id === 'didi') { const to = () => { S.stack = [{ s: 'home' }]; go('didi'); }; if (!S.unlocked) unlock(to); else to(); }
    else if (act === 'openThread' && SHOP_APPS.includes(id)) { const to = () => { S.stack = [{ s: 'home' }, { s: 'shop', shop: id }]; go('orders', { id }); }; if (!S.unlocked) unlock(to); else to(); }
    else if (act === 'openThread') { if (!S.unlocked) { unlock(() => { S.stack = [{ s: 'home' }, { s: 'chats' }]; go('chat', { id }); }); } else go('chat', { id }); }
    else if (act === 'reply') { const t = top(), c = reply(l, t.id, id, +el.dataset.i); render(); if (c && c.do && onEvent) onEvent({ type: 'reply-do', do: c.do, thread: t.id }); }
    else if (act === 'addContact') { if (onEvent) onEvent({ type: 'add-contact', id }); render(); }
    else if (act === 'invite') { respondToInvite(l, id, el.dataset.yes === '1'); render(); }
    else if (act === 'heartAsk') { (S.askedAt ||= {})[id] = stamp(l); askToMeet(l, id); render(); }
    else if (act === 'send') sendFree(id);
    else if (act === 'sharePhoto') {
      const p = maker(l).photos[+el.dataset.i]; const r = p && sharePhoto(l, p);
      if (r) {
        const tg = PHOTO_TARGETS.find((x) => x.id === p.target);
        const quips = ['白白这张可以啊🔥', '哪里拍的？我也要去', '构图满分', '求原图！', '可以，摄影师上线了'];
        setTimeout(() => post(l, 'wuhu', { from: ['momo', 'ruoan', 'zhixia', 'xuan'][Math.floor(Math.random() * 4)], kind: 'text', text: quips[Math.floor(Math.random() * quips.length)] }), 4000);
        if (onEvent) onEvent({ type: 'shared', followers: r.followers, achievement: r.achievement });
      }
      render();
    }
    else if (act === 'transcribe') { const m = findMsg(l, id); if (m) { m.transcribed = true; render(); } }
    else if (act === 'playVoice') { const m = findMsg(l, id); if (m) { const had = !!m.transcribed; media.toggleVoice(m); if (!!m.transcribed !== had) render(); else refreshMedia(); } }   // (no recording: the transcript opens)
    else if (act === 'seekVideo') { const m = findMsg(l, id), r = el.getBoundingClientRect(); if (m) { media.seek(m, (e.clientX - r.left) / Math.max(1, r.width)); refreshMedia(); } }
    else if (act === 'playVideo') { const m = findMsg(l, id); if (m) { media.playVideo(m); refreshMedia(); } }
    else if (act === 'mannerAdd') { const item = MANNER_MENU.find((m) => m.id === id); S.sheet = { to: 'Manner', amount: item.price, memo: item.name, memoEn: item.en, method: 'wechat', item }; render(); }
    else if (act === 'method') { const order = ['wechat', 'alipay', 'card']; S.sheet.method = order[(order.indexOf(S.sheet.method) + 1) % order.length]; S.sheet.error = ''; render(); }
    else if (act === 'confirmPay') confirmPay();
    else if (act === 'accept') { if (!S.call || S.call.state !== 'ringing') return; S.call.state = 'active'; S.call.started = performance.now(); banner.classList.remove('on'); media.callStart(); render(); advanceCall(); }
    else if (act === 'decline') { if (!S.call) return; logCall(true); const from = S.call.from; S.call = null; media.callEnd(); render(); if (onEvent) onEvent({ type: 'call-declined', from }); }
    else if (act === 'hangup') { if (!S.call) return; logCall(false); S.call = null; media.callEnd(); render(); }
    else if (act === 'say') { const c = S.call, line = c.script.lines[c.i], ch = line.choices[+el.dataset.i]; c.said = ch.text; if (onEvent) onEvent({ type: 'call-choice', from: c.from, choice: ch }); c.i++; advanceCall(); }
  });
  // ---- writing to a friend in your own words: they answer in character (engine/llm.js) ----
  const FREE_CHAT = new Set(['xuan', 'ruoan', 'momo', 'zhixia', 'yinuo', 'dad', 'vivian', 'wuhu']);
  for (const id of ROMANCE) FREE_CHAT.add(id);                              // the five he might come to love: what they're told is world/romance.js's (guardTalk)
  S.draft = {}; S.typing = {};
  root.addEventListener('input', (e) => { if (e.target.classList && e.target.classList.contains('say')) S.draft[e.target.dataset.thread] = e.target.value; });
  root.addEventListener('keydown', (e) => {
    if (!(e.target.classList && e.target.classList.contains('say'))) return;
    e.stopPropagation();                                                   // typing isn't walking
    if (e.key === 'Enter') { e.preventDefault(); sendFree(e.target.dataset.thread); }
    else if (e.key === 'Escape') { e.target.blur(); }
  });
  function sendFree(id) {
    const text = (S.draft[id] || '').trim(); if (!text) return;
    const l = L(); S.draft[id] = '';
    post(l, id, { from: 'me', kind: 'text', text }, { notify: false });
    { const sp = ((l.flags.spoke ||= {})[id] ||= []); sp.push(stamp(l)); while (sp.length > 40) sp.shift(); }   // for the quests (engine/quests.js)
    render(); focusSay(id);
    const t = l.threads[id];
    // in the group, whoever's named answers (or one or two who'd have something to say)
    const friends = ['xuan', 'ruoan', 'momo', 'zhixia', 'yinuo'];
    const named = friends.filter((f) => text.includes(PEOPLE[f].short) || text.includes(PEOPLE[f].name) || text.toLowerCase().includes((PEOPLE[f].en || '').split(' ').pop().toLowerCase()));
    const who = t.kind === 'group' ? (named.length ? named.slice(0, 2) : [friends[Math.floor(Math.random() * friends.length)]]) : [id];
    who.forEach((f, i) => setTimeout(() => answerAs(f, id), 900 + i * 2600));
  }
  async function answerAs(friend, threadId) {
    const l = L(), t = l.threads[threadId], lang = isZh(t.messages.filter((m) => m.from === 'me').slice(-1)[0]?.text) ? 'zh' : 'en';
    const now = clockText(stamp(l));
    const facts = [l.flags.car ? 'He has just bought a yellow Lamborghini Huracán (everyone knows).' : '', l.flags.hotelKey ? 'He is staying at the Peace Hotel on the Bund, room 612.' : '', incidentText(l),
      ...l.invites.filter((i) => i.from === friend).map((i) => `Your invitation to him (${i.title}): ${i.kept ? 'he came' : i.status}.`)].filter(Boolean).join(' ');
    const scene = `It is ${now}. You are not with him: you are wherever you would be at this hour (work, home, out). ${facts} ${storyContext(l, friend)}`;
    const sys = systemPrompt(friend, scene, { lang, texting: true }) + (t.kind === 'group' ? '\nThis is the friends\' group chat 金陵五虎+1; keep it short and in the group\'s joking tone.' : '');
    const hist = t.messages.filter((m) => m.kind === 'text' || m.kind === 'voice').slice(-12).map((m) => ({ role: m.from === friend ? 'assistant' : 'user', content: m.from === 'me' || m.from === friend ? m.text : `${short(m.from)}: ${m.text}` }));
    S.typing[threadId] = true; render(); focusSay(threadId);
    const said = hist.at(-1)?.content || '', msgs = [{ role: 'system', content: sys }, ...hist.slice(0, -1), { role: 'user', content: withReminder(friend, lang, said, { texting: true }) }];
    let raw = await llm.chat(msgs, { maxTokens: 90, ctx: { persona: friend, said } });
    if (llm.backend !== 'canned' && !replyOk(spoken(raw, 160), { lang, said })) { console.info('wechat: rejected', JSON.stringify(spoken(raw, 160))); } if (llm.backend !== 'canned' && !replyOk(spoken(raw, 160), { lang, said })) raw = await llm.chat([msgs[0], msgs[msgs.length - 1]], { maxTokens: 80, temperature: 0.6, ctx: { persona: friend, said } });
    S.typing[threadId] = false;
    const reply = replyOk(spoken(raw, 160), { lang, said }) ? spoken(raw, 160) : cannedReply(friend, said, { lang });
    post(l, threadId, { from: friend, kind: 'text', text: reply });
    render(); focusSay(threadId);
  }
  function focusSay(id) { const f = root.querySelector(`input.say[data-thread="${id}"]`); if (f && S.focusSay) { f.focus(); f.setSelectionRange(f.value.length, f.value.length); } }
  root.addEventListener('focusin', (e) => { if (e.target.classList && e.target.classList.contains('say')) S.focusSay = true; });
  root.addEventListener('focusout', (e) => { if (e.target.classList && e.target.classList.contains('say')) S.focusSay = false; });
  const findMsg = (l, id) => Object.values(l.threads).flatMap((t) => t.messages).find((m) => m.id === id);
  function unlock(then) {
    if (S.unlocked) { if (then) then(); return; }
    S.unlocking = true; render();
    setTimeout(() => { S.unlocking = false; S.unlocked = true; S.stack = [{ s: 'home' }]; if (then) then(); else render(); }, 700);
  }
  function confirmPay() {
    const sh = S.sheet, l = L();
    if (balance(l, sh.method) < sh.amount) { sh.error = Z('余额不足，换个付款方式', 'Not enough there. Try another way to pay'); render(); return; }
    sh.paying = true; render();
    setTimeout(() => {
      if (sh.run) {                                                           // the shop takes the payment with the order
        const r = sh.run(sh.method);
        if (!r.ok) { sh.paying = false; sh.error = Z('付款没有成功，换个方式试试', 'The payment didn\'t go through. Try another way to pay'); render(); return; }
        S.sheet = null; if (onEvent) onEvent({ type: 'ordered', orders: r.orders }); render(); return;
      }
      const r = pay(l, { method: sh.method, amount: sh.amount, to: sh.to, memo: sh.memo });
      if (r.ok && sh.memoEn) r.entry.memoEn = sh.memoEn;
      S.sheet = null;
      if (r.ok && sh.item) {
        const num = String(100 + Math.floor(Math.random() * 800)), wait = 2 + Math.floor(Math.random() * 3);
        top().done = { num, item: sh.item, wait };
        if (onEvent) onEvent({ type: 'paid', to: 'Manner', item: sh.item, num, wait });
      }
      render();
    }, 900);
  }

  // the keyboard: ↑ / ↓ pick a voice note, a clip or an answer; Enter takes it (or the obvious action:
  // an unheard voice note first, then a reply); Space plays / pauses; 1-9 pick an answer
  const navEls = () => [...host.querySelectorAll('[data-nav]')];
  const selKey = (el) => `${el.dataset.act}|${el.dataset.id || ''}|${el.dataset.i || ''}`;
  function markSel() {
    for (const el of host.querySelectorAll('.sel')) el.classList.remove('sel');
    if (!S.sel) return;
    const el = navEls().find((x) => selKey(x) === S.sel);
    if (el) { el.classList.add('sel'); el.scrollIntoView({ block: 'nearest' }); } else S.sel = null;
  }
  const mediaEls = () => navEls().filter((el) => el.dataset.act === 'playVoice' || el.dataset.act === 'playVideo');
  function key(e) {
    if (!S.open) return false;
    const typing = e.target && e.target.tagName === 'INPUT';
    if ((e.code === 'Escape' || e.code === 'Backspace') && !typing) { e.preventDefault(); if (S.call && S.call.state === 'ringing') root.querySelector('[data-act="decline"]').click(); else back(); return true; }
    if (typing && e.code === 'Escape') { e.target.blur(); return true; }
    if (typing && e.code !== 'Enter') return true;                          // typed into the message box, not walked on (the key still types)
    if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
      const list = navEls(); if (!list.length) return false;
      e.preventDefault();
      const i = list.findIndex((x) => selKey(x) === S.sel), n = i < 0 ? (e.code === 'ArrowUp' ? list.length - 1 : 0) : Math.max(0, Math.min(list.length - 1, i + (e.code === 'ArrowUp' ? -1 : 1)));
      S.sel = selKey(list[n]); markSel(); return true;
    }
    if (e.code === 'Space') {
      const sel = navEls().find((x) => selKey(x) === S.sel), m = sel && /^play/.test(sel.dataset.act) ? sel : mediaEls().pop();
      if (!m) return false;
      e.preventDefault(); m.click(); return true;
    }
    if (/^Digit[1-9]$/.test(e.code) && !S.sheet) {
      const chips = [...host.querySelectorAll('.chip')], c = chips[+e.code.slice(5) - 1];
      if (!c) return false;
      e.preventDefault(); c.click(); return true;
    }
    if (e.code === 'Enter') {
      e.preventDefault();
      const sel = !typing && navEls().find((x) => selKey(x) === S.sel);
      if (sel) { sel.click(); return true; }
      const unheard = !typing && !media.isPlaying() && mediaEls().filter((el) => { const m = findMsg(L(), el.dataset.id); return m && m.from !== 'me' && !m.played; }).pop();
      if (unheard) { unheard.click(); return true; }
      const first = host.querySelector('[data-act="accept"], [data-act="confirmPay"], [data-act="unlock"], .chip, .btn.go');
      if (first) first.click();
      return true;
    }
    return false;
  }

  // called every frame: status bar, banners for new messages while the phone is down
  let rideKey = '';
  function update(dt) {
    // the DiDi screen follows the ride (driver found, ETA, arrived) while it's open
    if (S.open && top().s === 'didi' && ride && ride.get) {
      const R = ride.get(), k = R ? `${R.phase}|${Math.round(R.etaMin || 0)}` : '-';
      if (k !== rideKey) { rideKey = k; if (getLife().threads.didi) getLife().threads.didi.unread = 0; render(); }
    }
    const l = L();
    if (S.call && S.call.state === 'active') callClock();
    if (S.call && S.call.state === 'ringing') {
      S.call.ringFor += dt;
      if (S.call.ringFor > 22) { logCall(true); const from = S.call.from; S.call = null; banner.classList.remove('on'); render(); if (onEvent) onEvent({ type: 'call-declined', from }); }
      else if (Math.floor(S.call.ringFor / 2.2) !== Math.floor((S.call.ringFor - dt) / 2.2) && audio && audio.cue) audio.cue('ring');
    }
    status();
    const isl = S.call ? `<span>${esc(short(S.call.from))}</span><span class="dot"></span>` : S.liveText ? `<span>${esc(S.liveText)}</span><span class="dot"></span>` : '';
    if (isl !== islandHtml) { islandHtml = isl; island.innerHTML = isl; island.classList.toggle('live', !!isl); }   // only when it changes
    if (l.notifications.length > lastNote) {
      const n = l.notifications[l.notifications.length - 1]; lastNote = l.notifications.length;
      if (!S.open) {
        const p = person(n.from);
        banner.innerHTML = `<div class="av" style="background:${p.color}">${esc(initial(n.from))}</div><div><div class="t">${esc(nm(n.from))}${n.thread === GROUP.id ? ` · ${esc(GROUP_NAME())}` : ''}</div><div class="p">${esc(X(n.text))}</div></div><div class="k">P</div>`;
        banner.classList.add('on'); clearTimeout(bannerTimer); bannerTimer = setTimeout(() => banner.classList.remove('on'), 4200);
        if (audio && audio.cue) audio.cue('ping');
        S.lastThread = n.thread;
      } else if (top().s === 'chat' || top().s === 'chats' || top().s === 'home' || top().s === 'lock') render();
    }
  }

  onLang(() => { statusKey = ''; islandHtml = null; if (S.open) render(); });
  return {
    get isOpen() { return S.open; }, get inCall() { return !!S.call; },
    toggle() { if (S.open) close(); else if (S.call) { banner.classList.remove('on'); setOpen(true); } else { open(); if (S.lastThread && S.unlocked && banner.classList.contains('on')) { S.stack = [{ s: 'home' }, { s: 'chats' }]; go('chat', { id: S.lastThread }); } } },
    open, close, ring, key, update, render,
    openManner() { open(); unlock(() => { S.stack = [{ s: 'home' }]; go('manner'); }); },
    setLive(text) { S.liveText = text || ''; },
    media,                                                                  // (verification hooks: what's playing, stats)
  };
}
