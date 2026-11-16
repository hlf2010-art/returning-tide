// The journal (J): your quests (active, finished, missed) with their steps; track one (its next step
// shows on screen and on the minimap); wait until a quest's time; and the people in your life, with
// how each of them feels about you. Also the ending card when the story reaches one.
// In a year game (engine/year.js): the date instead of a day number, and a page for where his life
// stands: the job, how the firm sees him, pay and rent, the start-up's books, the watch-repairer.
import { journal, track, currentStep, txt } from '../engine/quests.js';
import { relation, clockText, stamp } from '../engine/life.js';
import { PEOPLE } from '../world/cast.js';
import { getLang } from './i18n.js';
import './year.css';
import { ACTS as YEAR_ACTS, isYear, career, rep, year, dateText, actOf } from '../engine/year.js';
import { shortDate, home, hasFlat, LISTINGS, startup, burn, runway, work, todaysWork, handoff, FIRM, inLimbo } from '../world/career.js';

const T = (zh, en) => (getLang() === 'zh' ? zh : en);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const ACTS = Object.fromEntries(YEAR_ACTS.map((a) => [a.n, [a.zh, a.en]]));      // the five acts (engine/year.js), for every kind of game
const yuan = (n) => `¥${Math.round(n).toLocaleString('en-US')}`;
const WHO = ['dad', 'ruoan', 'xuan', 'momo', 'zhixia', 'yinuo'];

// where his life stands (a year game): read-only; everything here is the game's own state
function yearHtml(L) {
  const c = career(L), H = home(L), a = actOf(L), s = startup(L), W = work(L), t = todaysWork(L), h = handoff(L);
  const word = (v) => (v >= 70 ? T('很受器重', 'well regarded') : v >= 50 ? T('还不错', 'in good standing') : v >= 30 ? T('有点悬', 'under a cloud') : T('岌岌可危', 'hanging by a thread'));
  const job = { consulting: T(`迈芬咨询 · ${({ consultant: '顾问', 'senior consultant': '高级顾问', manager: '经理' })[c.title] || c.title}`, `${FIRM.en} · ${c.title}`), switched: T('屿深科技 · AI 产品负责人', 'Yushen Technology · AI product lead'),
    startup: s && s.name ? T(`${s.nameZh} · 创始人`, `${s.name} · founder`) : T('自己的公司（还没起名）', 'His own company (not yet named)'), family: T('纪氏精工 · 数字化负责人', "Ji's Precision Works · head of digital"),
    resigned: T('没有工作（四月辞职）', 'No job (resigned in April)'), laidoff: T('没有工作（四月被裁）', 'No job (laid off in April)') }[c.track] || c.track;
  const row = (k, v) => `<div class="row"><span>${esc(k)}</span><b>${v}</b></div>`, bar = (v) => `<span class="bar"><i style="width:${Math.max(2, Math.min(100, v))}%"></i></span>`;
  const employed = ['consulting', 'switched', 'family'].includes(c.track);
  return `<div class="yr">
    <h3>${esc(a ? T(a.zh, a.en) : '')}</h3>
    ${row(T('今天', 'Today'), esc(dateText(L, getLang())))}
    ${row(T('今天上班', 'Work today'), esc(t ? (t.done ? T('去过了', 'done') : `${T(t.def.title.zh, t.def.title.en)} · ${T(t.def.place.zh, t.def.place.en)}`) : inLimbo(L) ? T('没有要去的地方', 'nowhere to be') : T('不用上班', 'not a working day')))}
    <h3>${T('工作', 'Work')}</h3>
    ${row(T('现在', 'Now'), esc(job))}
    ${row(T('月薪', 'Salary'), c.salary ? `${yuan(c.salary)}${T(' / 月', ' a month')}` : T('没有', 'none'))}
    ${employed || (L.clock.day <= 12 && !W.applied) ? row(T('公司怎么看你', 'How the firm sees you'), `${bar(c.standing)}${esc(word(c.standing))}`) : ''}
    ${row(T('行内的名声', 'Your name in the trade'), `${bar(rep(L, 'work'))}${Math.round(rep(L, 'work'))}`)}
    ${row(T('街面上的名声', 'Your name on the street'), `${bar(rep(L, 'street'))}${Math.round(rep(L, 'street'))}`)}
    ${W.absent ? row(T('缺勤', 'Working days missed'), String(W.absent)) : ''}
    ${s ? `<h3>${esc(s.name ? T(s.nameZh, s.name) : T('公司', 'The company'))}</h3>
      ${row(T('账上', 'In the account'), yuan(s.cash))}${row(T('每月开支', 'Costs a month'), yuan(burn(L)))}${row(T('还能撑', 'Runway'), runway(L) >= 99 ? '—' : T(`${runway(L)} 个月`, `${runway(L)} ${runway(L) === 1 ? 'month' : 'months'}`))}
      ${row(T('客户', 'Customer'), esc(({ arm: T('周学长的机械臂团队', "Zhou's robot-arm team"), works: T('纪氏精工（爸爸的厂）', "Ji's Precision Works (Dad's)"), donglan: T('东澜保险', 'Donglan Insurance') })[s.customer] || T('还没有', 'none yet')))}
      ${row(T('团队', 'Team'), esc(({ taoke: T('陶可', 'Tao Ke'), tang: T('小唐（每周两天）', 'Tang (two days a week)'), linyi: T('林一', 'Lin Yi') })[s.hire] || T('只有你', 'only you')))}` : ''}
    <h3>${T('住处', 'Home')}</h3>
    ${row(T('住在', 'Living at'), esc(hasFlat(L) && LISTINGS[H.id] ? T(LISTINGS[H.id].zh, LISTINGS[H.id].en) : T('和平饭店 612', 'Peace Hotel, room 612')))}
    ${row(T('每月', 'A month'), H.rent ? yuan(H.rent) : T('公司安置（到 12 月 9 日）', "the firm's allowance (to 9 December)"))}
    ${row(T('银行存款', 'In the bank'), yuan(L.wallet.bank))}
    ${h ? `<h3>${T('修表匠', 'The watch-repairer')}</h3>${row(T('文件袋', 'The pouch'), h.outcome === 'opened' ? T('拆开看过', 'opened and read') : T('封条完好', 'seal intact'))}${W.watch.result ? row(T('后来', 'Afterwards'), W.watch.result === 'saved' ? T('人找到了，摊子保住了', 'found alive; the stall saved') : T('摊子易了主', 'the stall changed hands')) : ''}` : ''}
    <p>${T('工资和房租随月份从银行卡进出；工作日不去上班，是要算账的。这一页只是记录，改变它的是你做的事。', 'Salary and rent move through the bank as the months pass. A working day missed is counted. This page only records: what changes it is what you do.')}</p></div>`;
}
export function createJournal({ getLife, defs, onWait, onClose, work = null }) {
  const root = document.createElement('div'); root.id = 'journal'; root.className = 'hidden'; root.setAttribute('role', 'dialog');
  document.body.appendChild(root);
  const card = document.createElement('div'); card.id = 'ending-card'; document.body.appendChild(card);
  const S = { open: false, tab: 'quests', sel: null };
  function render() {
    const L = getLife(), lang = getLang(), rows = journal(L, defs, lang);
    if (!S.sel || !rows.find((r) => r.id === S.sel)) S.sel = (rows.find((r) => r.tracked) || rows[0] || {}).id || null;
    const sel = rows.find((r) => r.id === S.sel);
    const cur = currentStep(L, defs), now = stamp(L);
    const list = rows.map((r) => `<button class="q ${r.status}${r.id === S.sel ? ' sel' : ''}" data-q="${r.id}">
      <span class="kind${r.id === 'watch-repairer' ? ' side-story' : ''}">${r.main ? T('主线', 'Main') : r.id === 'watch-repairer' ? T('旁支故事', 'Side story') : T('支线', 'Side')}${r.tracked ? ` · ${T('追踪中', 'tracking')}` : ''}</span>
      <span class="name">${esc(r.title)}</span><span class="st">${{ active: '', done: T('完成', 'done'), failed: T('错过', 'missed') }[r.status]}</span></button>`).join('')
      || `<p class="empty">${T('还没有任务。', 'No quests yet.')}</p>`;
    let detail = '';
    if (sel) {
      const waitAt = sel.tracked && cur && cur.wait && cur.wait > now + 5 ? cur.wait : null;
      detail = `<div class="act">${sel.act ? esc(T(...ACTS[sel.act])) : ''}</div><h2>${esc(sel.title)}</h2><p class="sum">${esc(sel.summary)}</p>
        <ol class="steps">${sel.steps.map((s) => `<li class="${s.done ? 'done' : s.skipped ? 'skipped' : s.current ? 'current' : ''}">${esc(s.text)}${s.optional ? ` <i>${T('可选', 'optional')}</i>` : ''}</li>`).join('')}</ol>
        <div class="acts">${sel.status === 'active' && !sel.tracked ? `<button data-act="track" data-id="${sel.id}">${T('追踪', 'Track')}</button>` : ''}
        ${waitAt ? `<button data-act="wait" data-at="${waitAt}">${T(`等到 ${clockText(waitAt)}`, `Wait until ${clockText(waitAt)}`)}</button>` : ''}</div>`;
    }
    const people = WHO.map((id) => {
      const a = Math.round(relation(L, id).affinity), p = PEOPLE[id] || { name: id };
      const word = a >= 75 ? T('很亲近', 'close') : a >= 58 ? T('不错', 'warm') : a >= 42 ? T('一般', 'all right') : a >= 25 ? T('有点冷', 'cool') : T('很冷淡', 'cold');
      return `<div class="pp"><span class="pn">${esc(p.name || id)}</span><span class="bar"><i style="width:${Math.max(2, Math.min(100, a))}%"></i></span><span class="pw">${word}</span></div>`;
    }).join('');
    root.innerHTML = `<div class="panel">
      <div class="ph"><span>${T('日志', 'Journal')}</span><span class="clock">${isYear(L) ? dateText(L, getLang()) : T(`第 ${L.clock.day} 天`, `Day ${L.clock.day}`)} · ${clockText(L.clock.minute)}</span><button class="x" data-act="close" aria-label="close">✕</button></div>
      <div class="tabs"><button data-tab="quests" class="${S.tab === 'quests' ? 'on' : ''}">${T('任务', 'Quests')}</button><button data-tab="people" class="${S.tab === 'people' ? 'on' : ''}">${T('人', 'People')}</button>${work ? `<button data-tab="work" class="${S.tab === 'work' ? 'on' : ''}">${T('作品', 'Work')}</button>` : ''}${isYear(L) ? `<button data-tab="year" class="${S.tab === 'year' ? 'on' : ''}">${T('这一年', 'The year')}</button>` : ''}</div>
      ${S.tab === 'year' && isYear(L) ? yearHtml(L) : S.tab === 'quests' ? `<div class="cols"><div class="list">${list}</div><div class="detail">${detail}</div></div>` : S.tab === 'work' && work ? work(L) : `<div class="people">${people}<p class="hint">${T('你的选择、说的话、有没有赴约，都会改变他们对你的感觉。', 'What you choose, what you say, and whether you turn up all change how they feel about you.')}</p></div>`}
      <div class="foot">${T('J 关闭', 'J to close')}</div></div>`;
  }
  root.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.q) { S.sel = b.dataset.q; render(); return; }
    if (b.dataset.tab) { S.tab = b.dataset.tab; render(); return; }
    if (b.dataset.act === 'close') { api.close(); return; }
    if (b.dataset.act === 'track') { track(getLife(), b.dataset.id); render(); return; }
    if (b.dataset.act === 'wait') { const at = +b.dataset.at; api.close(); onWait && onWait(at); }
  });
  const api = {
    get isOpen() { return S.open; },
    open() { S.open = true; root.classList.remove('hidden'); render(); },
    close() { if (!S.open) return; S.open = false; root.classList.add('hidden'); onClose && onClose(); },
    toggle() { if (S.open) api.close(); else api.open(); },
    refresh() { if (S.open) render(); },
    // the ending: a card over the frozen frame, then the world goes on
    // after: what the ending adds about what you built (world/work.js), if anything
    ending(e, onDone, after = null) {
      card.innerHTML = `<div class="in"><div class="k">${T('结局', 'Ending')}</div><h1>${esc(T(e.title.zh, e.title.en))}</h1><p>${esc(T(e.text.zh, e.text.en))}</p>${after ? `<p class="after">${esc(T(after.zh, after.en))}</p>` : ''}
        <button class="mbtn primary" data-act="on">${T('继续在外滩走走', 'Keep walking the Bund')}</button></div>`;
      card.classList.add('on');
      card.querySelector('button').addEventListener('click', () => { card.classList.remove('on'); onDone && onDone(); }, { once: true });
    },
    get endingOpen() { return card.classList.contains('on'); },
  };
  return api;
}
export { txt };
