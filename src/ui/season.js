// The season plan (engine/allot.js): when weeks pass between two playable days, how were the evenings
// spent? The evenings are split between making things, one person, friends and family, business and
// rest; the preview says, before you commit, what that will come to. Then what happened, and whatever
// a launch leaves to decide (world/allotEvents.js).
//   createSeasonPlan({ getLife, save, hud }) -> { open(days, gapLabel, onDone), active, key(k) }
import { getLang } from './i18n.js';
import { allot, seasonBudget, previewSeason, applySeason, candidates, USES } from '../engine/allot.js';
import { isYear, career, standing } from '../engine/year.js';
import { hasProduct } from '../engine/studio.js';
import { PEOPLE as CAST } from '../world/cast.js';
import { seasonAftermath, pendingChoices, choose } from '../world/allotEvents.js';

const T = (zh, en) => (getLang() === 'zh' ? zh : en);
const P = (b) => (b ? T(b.zh, b.en) : '');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const USE = {
  make: { zh: '做东西', en: 'Making', sub: { zh: '工作台、代码、模型', en: 'The bench, code, models' }, ic: '⚙' },
  love: { zh: '陪一个人', en: 'One person', sub: { zh: '约会、见面、一起过', en: 'Dates, time together' }, ic: '♥' },
  friends: { zh: '朋友和家人', en: 'Friends & family', sub: { zh: '若安、Momo、明轩……还有爸', en: 'Ruoan, Momo, Mingxuan… and Dad' }, ic: '☺' },
  business: { zh: '生意', en: 'Business', sub: { zh: '投资人、客户、行业活动', en: 'Investors, clients, events' }, ic: '◆' },
  rest: { zh: '休息', en: 'Rest', sub: { zh: '睡觉、跑步、什么都不做', en: 'Sleep, a run, nothing at all' }, ic: '☾' },
};

const CSS = `
#season { position: fixed; inset: 0; z-index: 30; display: grid; place-items: center; background: rgba(3,5,10,0.5); font-family: var(--ui); }
#season.hidden { display: none; }
#season .panel { width: min(780px, 95vw); max-height: 90vh; overflow: auto; padding: 20px 24px 16px; border-radius: 22px; color: #fff; }
#season h2 { margin: 0; font: 600 20px var(--ui); letter-spacing: 0.02em; }
#season .sub { color: var(--muted, rgba(255,255,255,.72)); font-size: 13px; margin: 4px 0 14px; }
#season .budget { display: flex; gap: 10px; align-items: baseline; font-size: 13px; margin-bottom: 10px; }
#season .budget b { font-size: 22px; font-weight: 600; }
#season .left.zero { color: #b8f0c8; } #season .left.over { color: #ffb4a8; }
#season .rows { display: grid; gap: 6px; }
#season .row { display: grid; grid-template-columns: 26px 1fr auto 130px auto; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 14px; background: rgba(255,255,255,0.06); }
#season .row .ic { font-size: 16px; opacity: .85; text-align: center; }
#season .row .nm b { display: block; font-weight: 600; font-size: 14px; } #season .row .nm i { font-style: normal; font-size: 12px; color: rgba(255,255,255,.6); }
#season .row button, #season .who button, #season .acts button, #season .presets button, #season .opt { font: 500 13px var(--ui); color: #fff; background: rgba(255,255,255,0.10); border: 0.5px solid rgba(255,255,255,0.3); border-radius: 999px; padding: 4px 11px; cursor: pointer; }
#season .row button:hover, #season .who button:hover, #season .opt:hover { background: rgba(255,255,255,0.2); }
#season .row .n { min-width: 2.2em; text-align: center; font: 600 16px var(--ui); }
#season .bar { height: 6px; border-radius: 3px; background: rgba(255,255,255,0.12); overflow: hidden; } #season .bar span { display: block; height: 100%; background: var(--accent, #a9d6ff); }
#season .who { display: flex; flex-wrap: wrap; gap: 6px; padding: 2px 0 4px 36px; } #season .who button.on { background: var(--accent, #a9d6ff); color: #0d2236; }
#season .presets { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 6px; } #season .presets span { font-size: 12px; color: rgba(255,255,255,.6); align-self: center; }
#season .decl { display: flex; gap: 8px; align-items: center; font-size: 13px; margin: 8px 0 0; cursor: pointer; }
#season .pv { margin-top: 12px; padding: 10px 12px; border-radius: 14px; background: rgba(0,0,0,0.18); display: grid; gap: 4px; font-size: 13px; }
#season .pv .h { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: rgba(255,255,255,.55); }
#season .pv .good::before { content: '＋ '; color: #9fe6b4; } #season .pv .bad::before { content: '－ '; color: #ffb0a0; } #season .pv .neutral::before { content: '· '; color: #ddd; }
#season .acts { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; } #season .acts .go { background: var(--accent, #a9d6ff); color: #0d2236; font-weight: 600; padding: 7px 18px; }
#season .acts .go[disabled] { opacity: .45; cursor: default; }
#season .res { display: grid; gap: 6px; font-size: 14px; margin: 6px 0; } #season .res div::before { content: '— '; opacity: .6; }
#season .ch { margin-top: 14px; } #season .ch h3 { margin: 0 0 6px; font: 600 15px var(--ui); } #season .ch .opt { display: block; width: 100%; text-align: left; border-radius: 12px; margin: 4px 0; padding: 8px 12px; }
#season .ch .opt i { font-style: normal; display: block; font-size: 12px; color: rgba(255,255,255,.6); }
@media (max-width: 560px) { #season .row { grid-template-columns: 22px 1fr auto auto auto; } #season .row .bar { display: none; } }
`;

export function createSeasonPlan({ getLife, save, hud }) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const root = document.createElement('div'); root.id = 'season'; root.className = 'hidden'; root.setAttribute('role', 'dialog');
  root.innerHTML = '<div class="panel glass"></div>'; document.body.appendChild(root);
  const panel = root.firstChild;
  const S = { open: false, days: 0, gap: '', plan: null, step: 'plan', lines: [], done: null };

  function defaults(L) {
    const B = seasonBudget(L, S.days), e = B.evenings, who = candidates(L), seeing = who.find((id) => ['dating', 'together'].includes((L.flags.hearts || {})[id]?.stage));
    const p = { make: 0, love: 0, friends: 0, business: 0, rest: 0, lover: seeing || who[0] || null };
    const share = hasProduct(L) ? { make: 0.3, love: who.length ? 0.2 : 0, friends: 0.15, business: 0.15, rest: 0.2 } : { make: 0.15, love: who.length ? 0.25 : 0, friends: 0.2, business: 0.15, rest: 0.25 };
    for (const u of USES) p[u] = Math.floor(e * share[u]);
    p.rest += e - USES.reduce((s, u) => s + p[u], 0);
    return p;
  }
  const used = () => USES.reduce((s, u) => s + (S.plan[u] || 0), 0);
  function preset(kind) {
    const L = getLife(), e = seasonBudget(L, S.days).evenings, has = !!S.plan.lover;
    const shares = { make: { make: 0.65, love: has ? 0.08 : 0, friends: 0.05, business: 0.07, rest: 0.15 }, love: { make: 0.1, love: has ? 0.45 : 0, friends: 0.2, business: 0.05, rest: 0.2 },
      biz: { make: 0.25, love: has ? 0.08 : 0, friends: 0.05, business: 0.47, rest: 0.15 }, even: { make: 0.2, love: has ? 0.2 : 0, friends: 0.2, business: 0.2, rest: 0.2 } }[kind];
    for (const u of USES) S.plan[u] = Math.floor(e * shares[u]);
    S.plan.rest += e - used();
  }

  function render() {
    const L = getLife(); if (!S.open) return;
    if (S.step === 'result') return renderResult(L);
    const B = seasonBudget(L, S.days), left = B.evenings - used(), pv = previewSeason(L, S.plan, S.days), who = candidates(L);
    const c = isYear(L) ? career(L) : null, employed = c && ['consulting', 'switched'].includes(c.track) && hasProduct(L);
    const row = (u) => {
      const n = S.plan[u] || 0, max = Math.max(1, B.evenings), dis = u === 'love' && !who.length;
      return `<div class="row"${dis ? ' style="opacity:.45"' : ''}><span class="ic">${USE[u].ic}</span><span class="nm"><b>${P(USE[u])}</b><i>${dis ? T('现在没有这样一个人', 'No one like that right now') : P(USE[u].sub)}</i></span>
        <span class="n">${n}</span><span class="bar"><span style="width:${Math.round(n / max * 100)}%"></span></span>
        <span>${dis ? '' : `<button data-d="${u}:-5">−5</button> <button data-d="${u}:-1">−</button> <button data-d="${u}:1">+</button> <button data-d="${u}:5">+5</button>`}</span></div>` +
        (u === 'love' && who.length > 1 ? `<div class="who">${who.map((id) => `<button data-who="${id}" class="${S.plan.lover === id ? 'on' : ''}">${esc(T(CAST[id].short || CAST[id].name, (CAST[id].en || id).split(' ').pop()))}</button>`).join('')}</div>` : '');
    };
    panel.innerHTML = `<h2>${esc(S.gap)} · ${T('这段时间，晚上怎么过？', 'How did the evenings go?')}</h2>
      <div class="sub">${T(`${B.days} 天、大约 ${B.weeks} 周。一天就二十四小时：白天是工作的，晚上是你的。每个晚上只能给一件事。`, `${B.days} days, about ${B.weeks} weeks. A day has twenty-four hours: the days are the job's, the evenings are yours. Each evening goes to one thing.`)}</div>
      <div class="budget"><span>${T('晚上', 'Evenings')} <b>${B.evenings}</b></span>${B.overtime ? `<span>${T(`（另有 ${B.overtime} 个晚上加班）`, `(${B.overtime} more lost to overtime)`)}</span>` : ''}
        <span class="left ${left === 0 ? 'zero' : left < 0 ? 'over' : ''}">${left === 0 ? T('都安排好了', 'All placed') : left > 0 ? T(`还剩 ${left} 个`, `${left} left`) : T(`多了 ${-left} 个`, `${-left} too many`)}</span></div>
      <div class="presets"><span>${T('一键', 'Quick')}:</span><button data-p="make">${T('全力做东西', 'All in on making')}</button><button data-p="love">${T('把时间给人', 'Time for people')}</button><button data-p="biz">${T('跑生意', 'Chase the business')}</button><button data-p="even">${T('平均', 'Even')}</button></div>
      <div class="rows">${USES.map(row).join('')}</div>
      ${employed ? `<label class="decl"><input type="checkbox" data-decl ${allot(L).declared ? 'checked disabled' : ''}> ${T('向公司报备自己在做产品（合伙人不会高兴，但之后没人能拿这个说事）', 'Declare the side project to the firm (the partner won\'t love it, but nobody can use it against you later)')}</label>` : ''}
      <div class="pv"><span class="h">${T('会怎样', 'What it comes to')}</span>${pv.lines.map((l) => `<div class="${l.tone}">${l.id ? `${esc(T(CAST[l.id].short || CAST[l.id].name, (CAST[l.id].en || l.id).split(' ').pop()))}：` : ''}${esc(T(l.zh, l.en))}</div>`).join('')}</div>
      <div class="acts"><button class="go" data-go ${left !== 0 ? 'disabled' : ''}>${T('就这样过', "That's how they went")}</button></div>`;
  }
  function renderResult(L) {
    const ch = pendingChoices(L);
    panel.innerHTML = `<h2>${esc(S.gap)}</h2><div class="sub">${T('这段时间发生了这些：', 'This is what those weeks came to:')}</div>
      <div class="res">${S.lines.map((b) => `<div>${esc(P(b))}</div>`).join('') || `<div>${T('日子平平地过去了。', 'The days went by, quietly.')}</div>`}</div>
      ${ch.length ? `<div class="ch"><h3>${esc(P(ch[0].title))}</h3>${ch[0].options.map((o) => `<button class="opt" data-ch="${ch[0].id}:${o.id}">${esc(P(o))}<i>${esc(P(o.note))}</i></button>`).join('')}</div>` : ''}
      <div class="acts">${ch.length ? '' : `<button class="go" data-close>${T('继续', 'Go on')}</button>`}</div>`;
  }

  root.addEventListener('click', (e) => {
    const b = e.target.closest('button,input[data-decl]'); if (!b) return;
    const L = getLife();
    if (b.dataset.d) { const [u, d] = b.dataset.d.split(':'); const left = seasonBudget(L, S.days).evenings - used(); S.plan[u] = Math.max(0, (S.plan[u] || 0) + Math.min(+d, +d > 0 ? Math.max(0, left) : 999)); render(); return; }
    if (b.dataset.who) { S.plan.lover = b.dataset.who; render(); return; }
    if (b.dataset.p) { preset(b.dataset.p); render(); return; }
    if (b.dataset.decl != null) { if (b.checked) { allot(L).declared = true; standing(L, -3, 'declared'); save && save(); } render(); return; }
    if (b.dataset.go != null) {
      const r = applySeason(L, S.plan, S.days); if (!r.ok) return;
      S.lines = seasonAftermath(L, r.events); S.step = 'result'; save && save(); render(); return;
    }
    if (b.dataset.ch) { const [id, opt] = b.dataset.ch.split(':'); choose(L, id, opt); save && save(); render(); return; }
    if (b.dataset.close != null) close();
  });
  function close() { S.open = false; root.classList.add('hidden'); const d = S.done; S.done = null; d && d(); }
  return {
    get active() { return S.open; },
    open(days, gap, onDone) {
      const L = getLife(); S.days = days; S.gap = gap; S.plan = defaults(L); S.step = 'plan'; S.lines = []; S.done = onDone; S.open = true;
      root.classList.remove('hidden'); render();
    },
    key(k) { if (k === 'Enter') { const g = panel.querySelector('[data-go]:not([disabled]),[data-close]'); g && g.click(); } },
  };
}
