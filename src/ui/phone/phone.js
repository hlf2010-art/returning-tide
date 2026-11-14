// The protagonist's phone (DOM overlay). A view on engine/life.js: it reads the life state and
// dispatches actions; the world reacts to the life state elsewhere.
//   P raises / lowers it. While it's up the mouse works the screen and WASD still walks you
//   (slowly: eyes on the phone); Esc / Backspace goes back; Enter takes the obvious action.
// Screens: lock -> home -> 微信 (chats, a chat), 钱包 (balances, ledger), 日历, 电话 (recent calls),
// the Manner mini-program (order + pay), the pay sheet, calls (incoming / in progress).
import './phone.css';
import { stamp, clockText, markRead, unreadTotal, pay, balance, METHODS, preview } from '../../engine/life.js';
import { reply, respondToInvite } from '../../world/agenda.js';
import { PEOPLE, GROUP, ME } from '../../world/cast.js';
import { shape } from '../../engine/delivery.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
const person = (id) => PEOPLE[id] || { name: id === 'me' ? ME.name : id, short: id, color: '#777' };
const avatar = (id, size = '') => { const p = person(id); return `<div class="av ${size}" style="background:${id === 'me' ? '#2d6cdf' : p.color}">${esc((id === 'me' ? '白' : p.short || p.name).slice(0, 1))}</div>`; };
const ago = (L, at) => { const d = stamp(L) - at; if (d < 1) return '刚刚'; if (d < 60) return `${d}分钟前`; return clockText(at); };
const yuan = (n) => `¥${Math.abs(n).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`;

export const MANNER_MENU = [
  { id: 'americano', name: '美式', en: 'Americano', price: 10, desc: '冰/热' },
  { id: 'latte', name: '拿铁', en: 'Latte', price: 15, desc: '经典' },
  { id: 'oat', name: '燕麦拿铁', en: 'Oat latte', price: 18, desc: '燕麦奶' },
  { id: 'flatwhite', name: '澳白', en: 'Flat white', price: 18, desc: '双份浓缩' },
  { id: 'osmanthus', name: '桂花拿铁', en: 'Osmanthus latte', price: 20, desc: '秋季限定' },
];

export function createPhone({ getLife, calls, audio = null, onChange = null, onEvent = null }) {
  const root = document.createElement('div'); root.id = 'phone';
  root.innerHTML = '<div class="body"><div class="screen"><div class="island"></div><div class="status"></div><div class="host"></div><div class="homebar"></div></div></div>';
  document.body.appendChild(root);
  const banner = document.createElement('div'); banner.id = 'phone-banner'; document.body.appendChild(banner);
  const host = root.querySelector('.host'), statusEl = root.querySelector('.status'), island = root.querySelector('.island'), homebar = root.querySelector('.homebar');
  const S = { open: false, unlocked: false, stack: [{ s: 'lock' }], call: null, sheet: null, playing: null, liveText: '' };
  let bannerTimer = 0, lastNote = 0, statusKey = '', islandHtml = null;

  const L = () => getLife();
  const top = () => S.stack[S.stack.length - 1];
  const go = (s, arg = {}) => { S.stack.push({ s, ...arg }); render(); };
  const back = () => {
    if (S.sheet) { S.sheet = null; render(); return; }
    if (S.call) return;                                                     // hang up with the red button
    if (S.stack.length > 1) { S.stack.pop(); render(); } else close();
  };

  function setOpen(v) {
    if (S.open === v) return;
    S.open = v; root.classList.toggle('up', v);
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
    else if (t.s === 'manner') html = mannerView(l, t);
    else if (t.s === 'call') html = callView(l);
    host.innerHTML = html + (S.sheet ? sheetView(l) : '');
    if (t.s === 'chat') { const m = host.querySelector('.msgs'); if (m) m.scrollTop = m.scrollHeight; }
  }

  function lockView(l) {
    const d = new Date(2026, 10, 14 + (l.clock.day - 1));
    const notes = l.notifications.slice(-5).reverse().map((n) => `<div class="note" data-act="openThread" data-id="${esc(n.thread)}">${avatar(n.from)}<div><div class="t">微信 · ${esc(person(n.from).name)}</div><div class="p">${esc(n.text)}</div></div></div>`).join('');
    return `<div class="view lock"><div class="date">11月${d.getDate()}日 星期${WEEK[d.getDay()]}</div><div class="time">${clockText(l.clock.minute)}</div>
      <div class="notes">${notes}</div>${S.unlocking ? '<div class="face"></div>' : ''}<div class="hint" data-act="unlock" style="cursor:pointer">轻点或按 Enter 用面容解锁 · Tap or Enter to unlock</div></div>`;
  }
  function homeView(l) {
    const unread = unreadTotal(l);
    const app = (id, label, bg, glyph, badge = 0) => `<div class="app" data-act="app" data-id="${id}"><div class="ic" style="background:${bg}">${glyph}</div>${badge ? `<span class="badge">${badge}</span>` : ''}<span>${label}</span></div>`;
    return `<div class="view home"><div class="grid">
      ${app('chats', '微信', 'linear-gradient(160deg,#2bd46b,#05a845)', '◔◔', unread)}
      ${app('wallet', '钱包', 'linear-gradient(160deg,#2b2b2e,#000)', '¥')}
      ${app('calendar', '日历', '#fff;color:#e33', `<span style="color:#e33;font-size:24px">${l.clock.day + 13}</span>`)}
      ${app('recents', '电话', 'linear-gradient(160deg,#5ee47a,#22b24a)', '✆')}
      ${app('manner', 'Manner', 'linear-gradient(160deg,#1b1b1b,#3a3a3a)', '<span style="font-size:13px;letter-spacing:0.5px">MNR</span>')}
      </div>
      <div class="dock">${app('chats', '', 'linear-gradient(160deg,#2bd46b,#05a845)', '◔◔', 0)}${app('recents', '', 'linear-gradient(160deg,#5ee47a,#22b24a)', '✆')}${app('wallet', '', 'linear-gradient(160deg,#2b2b2e,#000)', '¥')}${app('calendar', '', '#fff', `<span style="color:#e33;font-size:20px">${l.clock.day + 13}</span>`)}</div></div>`;
  }
  function chatsView(l) {
    const rows = l.order.map((id) => l.threads[id]).filter(Boolean).map((t) => {
      const last = t.messages[t.messages.length - 1];
      const who = last && t.kind === 'group' && last.from !== 'me' ? `${person(last.from).short}: ` : '';
      const av = t.kind === 'group' ? `<div class="av" style="background:#5d6b82;font-size:12px">五虎</div>` : avatar(t.members.find((m) => m !== 'me'));
      return `<div class="row" data-act="openThread" data-id="${esc(t.id)}">${av}${t.unread ? `<span class="badge">${t.unread}</span>` : ''}<div class="mid"><div class="n">${esc(t.title)}</div><div class="pv">${esc(who + (last ? preview(last) : ''))}</div></div><div class="tm">${last ? ago(l, last.at) : ''}</div></div>`;
    }).join('');
    return `<div class="view"><div class="bar"><span class="back" data-act="back">‹</span>微信</div><div class="scroll">${rows}</div></div>`;
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
        const secs = Math.max(2, Math.round((m.text || '').length / 4)), bars = Array.from({ length: 9 }, (_, i) => `<i style="height:${4 + ((i * 7 + secs) % 11)}px"></i>`).join('');
        bub = `<div class="bub voice ${S.playing === m.id ? 'playing' : ''}" data-act="playVoice" data-id="${m.id}"><span>▶</span><span class="wave">${bars}</span><span>${secs}″</span></div>${m.transcribed ? `<div class="trans">${esc(m.text)}</div>` : `<div class="sys" data-act="transcribe" data-id="${m.id}" style="cursor:pointer;align-self:flex-start">转文字 · transcribe</div>`}`;
      } else if (m.kind === 'invite') {
        const inv = l.invites.find((i) => i.id === m.meta.invite) || {};
        const when = m.meta.at != null ? `${m.meta.at >= (l.clock.day + 1) * 1440 ? '明天 ' : ''}${clockText(m.meta.at)}` : '';
        bub = `<div class="card"><div class="k">邀请 · Invitation</div><div class="ti">${esc(m.meta.title)}</div><div class="pl">${esc(when)} · ${esc(m.meta.place)}</div>${m.text ? `<div style="margin-top:6px">${esc(m.text)}</div>` : ''}
          ${inv.status === 'pending' ? `<div class="act"><button class="btn go" data-act="invite" data-id="${esc(inv.id)}" data-yes="1">接受</button><button class="btn no" data-act="invite" data-id="${esc(inv.id)}" data-yes="0">婉拒</button></div>` : `<div class="st ${inv.status === 'accepted' ? '' : 'no'}">${{ accepted: '已接受 · accepted', declined: '已婉拒 · declined', missed: '已过期 · missed' }[inv.status] || ''}</div>`}</div>`;
      } else bub = `<div class="bub">${esc(m.text)}</div>`;
      if (!mine && m.replies && m.replied == null) pendingReplies = m;
      out += `<div class="m ${mine ? 'me' : ''}">${avatar(m.from)}<div>${t.kind === 'group' && !mine ? `<div class="who">${esc(person(m.from).short)}</div>` : ''}${bub}</div></div>`;
      return out;
    }).join('');
    const foot = pendingReplies
      ? `<div class="replies">${pendingReplies.replies.map((r, i) => `<button class="chip" data-act="reply" data-id="${pendingReplies.id}" data-i="${i}">${esc(r.text)}</button>`).join('')}</div>`
      : `<div class="compose">（回复会在需要时出现 · replies appear when there's something to answer）</div>`;
    return `<div class="view chat"><div class="bar"><span class="back" data-act="back">‹</span>${esc(t.title)}${t.kind === 'group' ? `<span class="sub">(${t.members.length})</span>` : ''}</div><div class="msgs">${msgs}</div>${foot}</div>`;
  }
  function walletView(l) {
    const acct = (k, label, bg) => `<div class="acct" style="background:${bg}"><div class="l">${label}</div><div class="v">${yuan(balance(l, k))}</div></div>`;
    const led = l.wallet.ledger.slice(-12).reverse().map((e) => `<div class="led"><span>${esc(e.to)}<br><small style="color:#999">${METHODS[e.method]} · ${clockText(e.at)} ${esc(e.memo)}</small></span><span class="a ${e.amount < 0 ? 'neg' : 'pos'}">${e.amount < 0 ? '−' : '+'}${yuan(e.amount)}</span></div>`).join('') || '<div class="led"><span style="color:#999">还没有交易 · no transactions yet</span></div>';
    return `<div class="view wallet"><div class="bar"><span class="back" data-act="back">‹</span>钱包 · Wallet</div><div class="scroll">
      ${acct('wechat', '微信支付 零钱', 'linear-gradient(135deg,#07c160,#05984b)')}${acct('alipay', '支付宝 余额', 'linear-gradient(135deg,#1677ff,#0b4fc4)')}
      ${acct('bank', '招商银行 储蓄卡 · 尾号 0731', 'linear-gradient(135deg,#a33,#6d1f1f)')}${acct('card', '信用卡 可用额度', 'linear-gradient(135deg,#333,#000)')}
      <div class="ledger">${led}</div><div class="sys" style="text-align:center;padding:4px 0 20px">游戏内虚拟资金 · in-game money only</div></div></div>`;
  }
  function calendarView(l) {
    const items = l.calendar.slice().sort((a, b) => a.at - b.at).map((c) => `<div class="row"><div class="av" style="background:${person(c.with).color}">${esc(person(c.with).short.slice(0, 1))}</div><div class="mid"><div class="n">${esc(c.title)}</div><div class="pv">第${c.at >= 1440 * (l.clock.day + 1) ? '二' : '一'}天 ${clockText(c.at)} · ${esc(c.place)}</div></div></div>`).join('');
    const pend = l.invites.filter((i) => i.status === 'pending').map((i) => `<div class="row" data-act="openThread" data-id="${esc(i.thread || i.from)}"><div class="av" style="background:#ccc">?</div><div class="mid"><div class="n">${esc(i.title)}</div><div class="pv">待回复 · waiting for your answer · ${esc(person(i.from).short)}</div></div></div>`).join('');
    return `<div class="view"><div class="bar"><span class="back" data-act="back">‹</span>日历 · Calendar</div><div class="scroll">${items || '<div class="row"><div class="mid"><div class="pv">暂无安排 · nothing planned</div></div></div>'}${pend}</div></div>`;
  }
  function recentsView(l) {
    const rows = (l.flags.calls || []).slice().reverse().map((c) => `<div class="row">${avatar(c.from)}<div class="mid"><div class="n" style="${c.missed ? 'color:#e33' : ''}">${esc(person(c.from).name)}</div><div class="pv">${c.missed ? '未接来电 · missed' : '微信语音通话 · voice call'}</div></div><div class="tm">${clockText(c.at)}</div></div>`).join('');
    return `<div class="view"><div class="bar"><span class="back" data-act="back">‹</span>电话 · Recents</div><div class="scroll">${rows || '<div class="row"><div class="mid"><div class="pv">没有通话记录</div></div></div>'}</div></div>`;
  }
  function mannerView(l, t) {
    if (t.done) return `<div class="view"><div class="bar"><span class="back" data-act="back">‹</span>MANNER COFFEE</div><div class="ok"><div class="big">☕</div><div>下单成功 · Order placed</div><div class="num">${t.done.num}</div><div style="color:#888;font-size:13px">${esc(t.done.item.name)} · 约 ${t.done.wait} 分钟 · about ${t.done.wait} min<br>做好会通知你，到窗口旁取 · we'll tell you when it's ready</div></div></div>`;
    const items = MANNER_MENU.map((m) => `<div class="item"><div><div class="nm">${m.name} <span style="font-weight:400;color:#999;font-size:12px">${m.en}</span></div><div class="ds">${m.desc}</div></div><div style="display:flex;gap:12px;align-items:center"><span class="pr">¥${m.price}</span><button class="add" data-act="mannerAdd" data-id="${m.id}">+</button></div></div>`).join('');
    return `<div class="view"><div class="bar"><span class="back" data-act="back">‹</span>MANNER COFFEE<span class="sub">汉口路店</span></div><div class="scroll menu">${items}<div class="sys" style="text-align:center;padding:10px">自带杯减5元 · bring your own cup, ¥5 off</div></div></div>`;
  }
  function sheetView(l) {
    const sh = S.sheet;
    if (sh.paying) return `<div class="sheet"><div class="face" style="border-color:#111"></div><div class="to">面容识别中… · Face ID</div></div>`;
    return `<div class="sheet"><div class="to">付款给 · Pay ${esc(sh.to)}</div><div class="amt">¥${sh.amount}</div><div class="to">${esc(sh.memo)}</div>
      <div class="meth" data-act="method"><span>付款方式 · Method</span><span>${METHODS[sh.method]}（${yuan(balance(l, sh.method))}）›</span></div>
      ${sh.error ? `<div class="to" style="color:#e33;margin-bottom:8px">${esc(sh.error)}</div>` : ''}
      <button class="btn go" style="width:100%;padding:12px 0;font-size:15px" data-act="confirmPay">确认付款 · Pay</button></div>`;
  }
  function callView(l) {
    const c = S.call, p = person(c.from);
    if (c.state === 'ringing') return `<div class="view call">${avatar(c.from)}<div class="nm">${esc(p.name)}</div><div class="kind">微信语音通话 · voice call</div>
      <div class="btns"><button class="rb red" data-act="decline">✕</button><button class="rb green" data-act="accept">✆</button></div></div>`;
    const line = c.script.lines[c.i];
    // your turn: what they just said stays on screen above your answers
    const prev = c.script.lines.slice(0, c.i).reverse().find((x) => x.who !== 'me');
    const body = !line ? '' : line.who === 'me'
      ? `${prev ? `<div class="line">${esc(prev.text)}</div>` : ''}<div class="choices">${line.choices.map((ch, i) => `<button class="chip" data-act="say" data-i="${i}">${esc(ch.text)}</button>`).join('')}</div>`
      : `<div class="line">${esc(line.text)}</div>`;
    const mm = Math.floor(c.secs / 60), ss = String(Math.floor(c.secs % 60)).padStart(2, '0');
    return `<div class="view call">${avatar(c.from)}<div class="nm">${esc(p.name)}</div><div class="kind">${mm}:${ss}</div>${c.said ? `<div class="line"><span class="me">${esc(c.said)}</span></div>` : ''}${body}
      <div class="btns"><button class="rb red" data-act="hangup">✕</button></div></div>`;
  }

  // ---- voices (browser speech, phrase by phrase; subtitles always) ----
  function speak(text, who, done) {
    const prof = (PEOPLE[who] && PEOPLE[who].voice) || { pitch: 1, rate: 1 };
    const synth = window.speechSynthesis, phrases = shape(text, prof);
    let i = 0;
    const next = () => {
      if (i >= phrases.length) { if (done) done(); return; }
      const ph = phrases[i++], est = Math.max(0.4, ph.text.length / 4.5) * 1000;
      if (!synth) { setTimeout(next, est + ph.pauseAfter * 1000); return; }
      const u = new SpeechSynthesisUtterance(ph.text); u.lang = 'zh-CN'; u.rate = Math.max(0.5, Math.min(1.6, ph.rate)); u.pitch = Math.max(0.1, Math.min(2, ph.pitch));
      let fired = false; const after = () => { if (fired) return; fired = true; setTimeout(next, ph.pauseAfter * 1000); };
      u.onend = after; u.onerror = () => setTimeout(after, est);
      setTimeout(after, est * 2.5);                                         // never hang on a silent engine
      try { synth.speak(u); } catch { setTimeout(after, est); }
    };
    next();
  }

  // ---- calls ----
  function ring(scriptId) {
    if (S.call) return false;
    const script = calls[scriptId]; if (!script) return false;
    S.call = { from: script.from, script, i: 0, secs: 0, state: 'ringing', ringFor: 0 };
    // it rings in your pocket: a banner and the ringtone; P brings the phone up to answer
    const p = person(script.from);
    banner.innerHTML = `<div class="av" style="background:${p.color}">${esc((p.short || p.name).slice(0, 1))}</div><div><div class="t">${esc(p.name)}</div><div class="p">微信语音通话 · incoming call</div></div><div class="k">P 接听</div>`;
    banner.classList.add('on'); clearTimeout(bannerTimer);
    if (S.open) render();
    if (audio && audio.cue) audio.cue('ring');
    return true;
  }
  function logCall(missed) { const l = L(); (l.flags.calls ||= []).push({ from: S.call.from, at: stamp(l), missed }); }
  function advanceCall() {
    const c = S.call; if (!c) return;
    const line = c.script.lines[c.i];
    if (!line) { setTimeout(() => { logCall(false); S.call = null; render(); if (onEvent) onEvent({ type: 'call-ended' }); }, 900); render(); return; }
    render();
    if (line.who !== 'me') speak(line.text, line.who, () => { if (S.call === c && c.script.lines[c.i] === line) { c.i++; c.said = ''; advanceCall(); } });
  }

  // ---- input ----
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const act = el.dataset.act, id = el.dataset.id, l = L();
    if (act === 'unlock') unlock();
    else if (act === 'back') back();
    else if (act === 'app') go(id === 'chats' ? 'chats' : id);
    else if (act === 'openThread') { if (!S.unlocked) { unlock(() => { S.stack = [{ s: 'home' }, { s: 'chats' }]; go('chat', { id }); }); } else go('chat', { id }); }
    else if (act === 'reply') { const t = top(); reply(l, t.id, id, +el.dataset.i); render(); }
    else if (act === 'invite') { respondToInvite(l, id, el.dataset.yes === '1'); render(); }
    else if (act === 'transcribe') { const m = findMsg(l, id); if (m) { m.transcribed = true; render(); } }
    else if (act === 'playVoice') { const m = findMsg(l, id); if (m && !S.playing) { S.playing = m.id; render(); speak(m.text, m.from, () => { S.playing = null; render(); }); } }
    else if (act === 'mannerAdd') { const item = MANNER_MENU.find((m) => m.id === id); S.sheet = { to: 'Manner 汉口路店', amount: item.price, memo: `${item.name} ${item.en}`, method: 'wechat', item }; render(); }
    else if (act === 'method') { const order = ['wechat', 'alipay', 'card']; S.sheet.method = order[(order.indexOf(S.sheet.method) + 1) % order.length]; S.sheet.error = ''; render(); }
    else if (act === 'confirmPay') confirmPay();
    else if (act === 'accept') { S.call.state = 'active'; render(); advanceCall(); }
    else if (act === 'decline') { logCall(true); const from = S.call.from; S.call = null; render(); if (onEvent) onEvent({ type: 'call-declined', from }); }
    else if (act === 'hangup') { logCall(false); S.call = null; render(); if (window.speechSynthesis) window.speechSynthesis.cancel(); }
    else if (act === 'say') { const c = S.call, line = c.script.lines[c.i], ch = line.choices[+el.dataset.i]; c.said = ch.text; if (onEvent) onEvent({ type: 'call-choice', from: c.from, choice: ch }); c.i++; advanceCall(); }
  });
  const findMsg = (l, id) => Object.values(l.threads).flatMap((t) => t.messages).find((m) => m.id === id);
  function unlock(then) {
    if (S.unlocked) { if (then) then(); return; }
    S.unlocking = true; render();
    setTimeout(() => { S.unlocking = false; S.unlocked = true; S.stack = [{ s: 'home' }]; if (then) then(); else render(); }, 700);
  }
  function confirmPay() {
    const sh = S.sheet, l = L();
    if (balance(l, sh.method) < sh.amount) { sh.error = '余额不足，换个方式 · not enough, try another method'; render(); return; }
    sh.paying = true; render();
    setTimeout(() => {
      const r = pay(l, { method: sh.method, amount: sh.amount, to: sh.to.startsWith('Manner') ? 'Manner' : sh.to, memo: sh.memo });
      S.sheet = null;
      if (r.ok && sh.item) {
        const num = String(100 + Math.floor(Math.random() * 800)), wait = 2 + Math.floor(Math.random() * 3);
        top().done = { num, item: sh.item, wait };
        if (onEvent) onEvent({ type: 'paid', to: 'Manner', item: sh.item, num, wait });
      }
      render();
    }, 900);
  }

  function key(e) {
    if (!S.open) return false;
    if (e.code === 'Escape' || e.code === 'Backspace') { e.preventDefault(); if (S.call && S.call.state === 'ringing') root.querySelector('[data-act="decline"]').click(); else back(); return true; }
    if (e.code === 'Enter') {
      e.preventDefault();
      const first = host.querySelector('[data-act="accept"], [data-act="confirmPay"], [data-act="unlock"], .chip, .btn.go');
      if (first) first.click();
      return true;
    }
    return false;
  }

  // called every frame: status bar, banners for new messages while the phone is down
  function update(dt) {
    const l = L();
    if (S.call && S.call.state === 'active') S.call.secs += dt;
    if (S.call && S.call.state === 'ringing') {
      S.call.ringFor += dt;
      if (S.call.ringFor > 22) { logCall(true); const from = S.call.from; S.call = null; banner.classList.remove('on'); render(); if (onEvent) onEvent({ type: 'call-declined', from }); }
      else if (Math.floor(S.call.ringFor / 2.2) !== Math.floor((S.call.ringFor - dt) / 2.2) && audio && audio.cue) audio.cue('ring');
    }
    status();
    const isl = S.call ? `<span>${esc(person(S.call.from).short)}</span><span class="dot"></span>` : S.liveText ? `<span>${esc(S.liveText)}</span><span class="dot"></span>` : '';
    if (isl !== islandHtml) { islandHtml = isl; island.innerHTML = isl; island.classList.toggle('live', !!isl); }   // only when it changes
    if (l.notifications.length > lastNote) {
      const n = l.notifications[l.notifications.length - 1]; lastNote = l.notifications.length;
      if (!S.open) {
        const p = person(n.from);
        banner.innerHTML = `<div class="av" style="background:${p.color}">${esc((p.short || p.name).slice(0, 1))}</div><div><div class="t">${esc(p.name)}${n.thread === GROUP.id ? ` · ${esc(GROUP.title)}` : ''}</div><div class="p">${esc(n.text)}</div></div><div class="k">P</div>`;
        banner.classList.add('on'); clearTimeout(bannerTimer); bannerTimer = setTimeout(() => banner.classList.remove('on'), 4200);
        if (audio && audio.cue) audio.cue('ping');
        S.lastThread = n.thread;
      } else if (top().s === 'chat' || top().s === 'chats' || top().s === 'home' || top().s === 'lock') render();
    }
  }

  return {
    get isOpen() { return S.open; }, get inCall() { return !!S.call; },
    toggle() { if (S.open) close(); else if (S.call) { banner.classList.remove('on'); setOpen(true); } else { open(); if (S.lastThread && S.unlocked && banner.classList.contains('on')) { S.stack = [{ s: 'home' }, { s: 'chats' }]; go('chat', { id: S.lastThread }); } } },
    open, close, ring, key, update, render,
    openManner() { open(); unlock(() => { S.stack = [{ s: 'home' }]; go('manner'); }); },
    setLive(text) { S.liveText = text || ''; },
  };
}
