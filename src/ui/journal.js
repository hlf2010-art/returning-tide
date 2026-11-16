// The journal (J): your quests (active, finished, missed) with their steps; track one (its next step
// shows on screen and on the minimap); wait until a quest's time; and the people in your life, with
// how each of them feels about you. Also the ending card when the story reaches one.
import { journal, track, currentStep, txt } from '../engine/quests.js';
import { relation, clockText, stamp } from '../engine/life.js';
import { PEOPLE } from '../world/cast.js';
import { getLang } from './i18n.js';
import { ROMANCE } from '../engine/hearts.js';
import { romanceStanding, romanceEpilogue } from '../world/romance.js';

const T = (zh, en) => (getLang() === 'zh' ? zh : en);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const ACTS = { 1: ['第一幕 · 回来', 'Act I · Back'], 2: ['第二幕 · 两条路', 'Act II · Two roads'], 3: ['第三幕 · 回潮', 'Act III · The returning tide'] };
const WHO = ['dad', 'ruoan', 'xuan', 'momo', 'zhixia', 'yinuo'];

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
      <span class="kind">${r.main ? T('主线', 'Main') : T('支线', 'Side')}${r.tracked ? ` · ${T('追踪中', 'tracking')}` : ''}</span>
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
    // the five he might come to love (world/romance.js): only those he's met; how each stands, and where she is now
    const met = ROMANCE.map((id) => romanceStanding(L, id)).filter((s) => s.met);
    const hearts = !met.length ? '' : `<h3 class="hh-t">${T('走近的人', 'Closer')}</h3>${met.map((s) => `<div class="hh${s.over ? ' over' : ''}"><div class="hn"><b>${esc(T(s.name.zh, s.name.en))}</b><span class="hs">${esc(T(s.stage.zh, s.stage.en))}</span></div>
      <div class="hr">${esc(T(s.role.zh, s.role.en))}</div>${s.line ? `<div class="hl">${esc(T(s.line.zh, s.line.en))}</div>` : ''}${s.now ? `<div class="hw">${T('现在：', 'Now: ')}${esc(T(s.now.zh, s.now.en))}</div>` : ''}
      ${s.over ? '' : `<div class="hb"><span>${T('吸引', 'Attraction')}</span><span class="bar"><i style="width:${Math.max(2, s.attraction)}%"></i></span><span>${T('信任', 'Trust')}</span><span class="bar"><i style="width:${Math.max(2, s.trust)}%"></i></span></div>`}</div>`).join('')}`;
    root.innerHTML = `<div class="panel">
      <div class="ph"><span>${T('日志', 'Journal')}</span><span class="clock">${T(`第 ${L.clock.day} 天`, `Day ${L.clock.day}`)} · ${clockText(L.clock.minute)}</span><button class="x" data-act="close" aria-label="close">✕</button></div>
      <div class="tabs"><button data-tab="quests" class="${S.tab === 'quests' ? 'on' : ''}">${T('任务', 'Quests')}</button><button data-tab="people" class="${S.tab === 'people' ? 'on' : ''}">${T('人', 'People')}</button>${work ? `<button data-tab="work" class="${S.tab === 'work' ? 'on' : ''}">${T('作品', 'Work')}</button>` : ''}</div>
      ${S.tab === 'quests' ? `<div class="cols"><div class="list">${list}</div><div class="detail">${detail}</div></div>` : S.tab === 'work' && work ? work(L) : `<div class="people">${people}${hearts}<p class="hint">${T('你的选择、说的话、有没有赴约，都会改变他们对你的感觉。', 'What you choose, what you say, and whether you turn up all change how they feel about you.')}</p></div>`}
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
      const rom = romanceEpilogue(getLife());                               // and about whoever he's with, or lost (world/romance.js)
      card.innerHTML = `<div class="in"><div class="k">${T('结局', 'Ending')}</div><h1>${esc(T(e.title.zh, e.title.en))}</h1><p>${esc(T(e.text.zh, e.text.en))}</p>${after ? `<p class="after">${esc(T(after.zh, after.en))}</p>` : ''}${rom ? `<p class="after">${esc(T(rom.zh, rom.en))}</p>` : ''}
        <button class="mbtn primary" data-act="on">${T('继续在外滩走走', 'Keep walking the Bund')}</button></div>`;
      card.classList.add('on');
      card.querySelector('button').addEventListener('click', () => { card.classList.remove('on'); onDone && onDone(); }, { once: true });
    },
    get endingOpen() { return card.classList.contains('on'); },
  };
  return api;
}
export { txt };
