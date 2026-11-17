// The season plan (engine/allot.js), drawn as a night: every evening of the weeks that passed is a window
// in a tower across the river. Give an evening to something and its window lights in that colour: the
// bench's lamp gold, her rose, friends' blue, business jade, rest a drawn curtain; the job's overtime
// nights burn office-white whatever you do. Beside it, what it will come to, in Ji Bai's own hand. Then
// the weeks go by, line by line, and whatever a launch leaves to decide (world/allotEvents.js).
//   createSeasonPlan({ getLife, save, hud }) -> { open(days, gapLabel, onDone), active, key(k) }
import './fonts.js';
import { getLang } from './i18n.js';
import { allot, seasonBudget, previewSeason, applySeason, candidates, USES } from '../engine/allot.js';
import { isYear, career, standing } from '../engine/year.js';
import { hasProduct } from '../engine/studio.js';
import { PEOPLE as CAST } from '../world/cast.js';
import { seasonAftermath, pendingChoices, choose } from '../world/allotEvents.js';

const T = (zh, en) => (getLang() === 'zh' ? zh : en);
const P = (b) => (b ? T(b.zh, b.en) : '');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nm = (id) => (CAST[id] ? T(CAST[id].short || CAST[id].name, (CAST[id].en || id).replace(/ \(.*\)$/, '').split(' ').pop()) : id);
const USE = {
  make: { zh: '做东西', en: 'Making', sub: { zh: '工作台 · 代码 · 模型', en: 'bench · code · models' }, c: '#f2c26b' },
  love: { zh: '陪一个人', en: 'One person', sub: { zh: '约会 · 一起过', en: 'dates · time together' }, c: '#f08aa0' },
  friends: { zh: '朋友和家人', en: 'Friends & family', sub: { zh: '若安 · Momo · 明轩 · 爸', en: 'Ruoan · Momo · Mingxuan · Dad' }, c: '#8cc8f2' },
  business: { zh: '生意', en: 'Business', sub: { zh: '投资人 · 客户 · 同行', en: 'investors · clients · peers' }, c: '#8fd6b0' },
  rest: { zh: '休息', en: 'Rest', sub: { zh: '睡觉 · 跑步 · 发呆', en: 'sleep · a run · nothing' }, c: '#5a6aa6' },
};
const MARK = { good: '✓', bad: '✗', neutral: '～' };

const CSS = `
#season { position: fixed; inset: 0; z-index: 30; font-family: var(--rt-serif); color: #f4e6c4; overflow: hidden;
  background: radial-gradient(90% 70% at 30% 100%, #13303a 0%, #0a161b 45%, #05080b 85%); }
#season.hidden { display: none; }
#season::before { content: ''; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(180deg, transparent 72%, rgba(40,80,95,.35) 100%); }
#season .sky { position: absolute; inset: 0; pointer-events: none; background-image: radial-gradient(1px 1px at 12% 18%, #fff8 50%, transparent 51%), radial-gradient(1px 1px at 38% 9%, #fff6 50%, transparent 51%), radial-gradient(1px 1px at 64% 22%, #fff5 50%, transparent 51%), radial-gradient(1.4px 1.4px at 82% 12%, #fff9 50%, transparent 51%); }
#season .hd { position: absolute; left: 5%; top: 5%; right: 5%; }
#season .hd .gap { font-family: 'JB Hand', var(--rt-serif); font-size: clamp(48px, 8vh, 88px); line-height: 1; color: #f4e6c4; text-shadow: 0 0 30px rgba(236,212,154,.2); }
#season.en .hd .gap { font-family: var(--rt-deco); font-size: clamp(36px, 6vh, 64px); letter-spacing: .05em; }
#season .hd .q { font-size: 20px; margin-top: 10px; color: rgba(244,230,196,.9); letter-spacing: .08em; }
#season .hd .why { font-size: 13px; margin-top: 6px; color: rgba(236,212,154,.6); letter-spacing: .06em; max-width: 640px; }
#season .tower { position: absolute; left: 6%; bottom: 0; width: 36%; display: flex; flex-direction: column; align-items: center; }
#season .crown { height: 34px; margin: 0 auto; width: calc(var(--tw) * .62); background: linear-gradient(#1b2a30, #121c21); clip-path: polygon(20% 100%, 30% 40%, 50% 0, 70% 40%, 80% 100%); }
#season .crown2 { height: 12px; width: calc(var(--tw) * .84); margin: 0 auto; background: #172429; }
#season .facade { position: relative; padding: 14px 16px 0; background: linear-gradient(90deg, #0f191d, #16252b 50%, #0f191d); box-shadow: 0 0 80px rgba(0,0,0,.6); display: grid; gap: 4px; grid-template-columns: repeat(7, var(--cw)); grid-auto-rows: var(--ch); align-content: end; }
#season .facade i { background: #0a1013; box-shadow: inset 0 0 0 1px rgba(255,255,255,.03); transition: background .35s, box-shadow .35s; }
#season .facade i.on { background: var(--c); box-shadow: 0 0 10px var(--c), inset 0 -6px 10px rgba(0,0,0,.25); }
#season .facade i.rest { background: linear-gradient(90deg, #2c3766 0 46%, #1b2140 46% 54%, #2c3766 54%); box-shadow: 0 0 6px rgba(90,106,166,.5); }
#season .facade i.ot { background: #dfeef6; box-shadow: 0 0 12px rgba(223,238,246,.7); }
#season .reflect { height: 54px; margin-top: 2px; opacity: .25; transform: scaleY(-1); filter: blur(2px); -webkit-mask-image: linear-gradient(transparent, #000); mask-image: linear-gradient(transparent, #000); overflow: hidden; }
#season .tlabel { position: absolute; left: 0; right: 0; bottom: 14px; text-align: center; font: 12px var(--rt-thin); letter-spacing: .4em; color: rgba(236,212,154,.6); pointer-events: none; }
#season .ctl { position: absolute; left: 46%; right: 5%; top: 22%; bottom: 4%; display: flex; flex-direction: column; gap: 10px; overflow: auto; scrollbar-width: none; }
#season .budget { display: flex; align-items: baseline; gap: 18px; border-bottom: 1px solid rgba(200,163,90,.3); padding-bottom: 8px; }
#season .budget b { font-weight: 600; font-size: 40px; color: #ecd49a; font-variant-numeric: oldstyle-nums; } #season .budget span { font: 12px var(--rt-thin); letter-spacing: .3em; color: var(--rt-gold); }
#season .budget .left { margin-left: auto; font-size: 15px; letter-spacing: .05em; font-family: var(--rt-serif); } #season .budget .left.zero { color: #b8f0c8; } #season .budget .left.over { color: #ffb4a8; }
#season .inks { display: grid; gap: 2px; }
#season .ink { display: grid; grid-template-columns: 18px 1fr auto auto auto; align-items: center; gap: 14px; padding: 4px 4px; border-bottom: 1px solid rgba(200,163,90,.1); }
#season .ink .sw { width: 11px; height: 11px; transform: rotate(45deg); background: var(--c); box-shadow: 0 0 10px var(--c); margin-left: 3px; }
#season .ink .nm b { display: block; font-weight: 700; font-size: 18px; letter-spacing: .06em; } #season .ink .nm i { font: normal 11px var(--rt-thin); letter-spacing: .2em; color: rgba(236,212,154,.6); text-transform: uppercase; }
#season .ink .n { font-weight: 600; font-size: 30px; min-width: 1.6em; text-align: center; color: #f4e6c4; font-variant-numeric: oldstyle-nums; }
#season .ink.off { opacity: .35; }
#season .chev { background: none; border: 1px solid rgba(200,163,90,.35); color: var(--rt-gold-hi); width: 30px; height: 30px; font: 16px var(--rt-serif); cursor: pointer; clip-path: polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px); }
#season .chev:hover { background: rgba(200,163,90,.18); }
#season .who { grid-column: 2 / -1; display: flex; flex-wrap: wrap; gap: 8px; padding: 2px 0 4px; }
#season .who button { background: none; border: 1px solid rgba(240,138,160,.4); color: #f4dbe1; font: 15px var(--rt-serif); padding: 2px 12px; cursor: pointer; border-radius: 2px; }
#season .who button.on { background: #b3352a; border-color: #b3352a; color: #fff3e8; box-shadow: 0 0 12px rgba(179,53,42,.5); }
#season .presets { font-size: 13px; color: rgba(236,212,154,.6); letter-spacing: .06em; padding-top: 6px; } #season .presets button { background: none; border: 0; color: var(--rt-gold-hi); font: 14px var(--rt-serif); cursor: pointer; padding: 0 4px; text-decoration: underline; text-decoration-color: rgba(200,163,90,.4); text-underline-offset: 4px; }
#season .note { position: relative; align-self: start; padding: 16px 20px 16px 22px; color: #23345e; transform: rotate(-.7deg); box-shadow: 0 16px 36px rgba(0,0,0,.5); flex: none; margin: 4px 0;
  background: repeating-linear-gradient(180deg, transparent 0 29px, rgba(43,42,51,.12) 29px 30px), var(--rt-paper); }
#season .note .h { font: 11px var(--rt-thin); letter-spacing: .45em; color: #6b5b3a; margin-bottom: 4px; }
#season .note div.l { font-family: var(--rt-hand); font-size: 20px; line-height: 30px; } #season .note .l b { font-weight: 400; display: inline-block; width: 1.3em; }
#season .note .good b { color: #2e7a44; } #season .note .bad b { color: #b3352a; } #season .note .neutral b { color: #8a7a4a; }
#season .decl { display: flex; gap: 10px; align-items: center; font-size: 14px; color: rgba(244,230,196,.85); cursor: pointer; } #season .decl input { accent-color: #c8a35a; width: 16px; height: 16px; }
#season .go { justify-self: end; background: linear-gradient(#e7c97f, #b48a3e); color: #1a1408; border: 0; font: 700 18px var(--rt-serif); letter-spacing: .2em; padding: 12px 34px; cursor: pointer; clip-path: polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0 50%); box-shadow: 0 0 30px rgba(236,212,154,.25); }
#season .go[disabled] { filter: grayscale(1) brightness(.5); cursor: default; }
#season .go small { display: block; font: 10px var(--rt-thin); letter-spacing: .3em; margin-top: 2px; }
#season .bottom { margin-top: auto; display: flex; align-items: center; gap: 20px; justify-content: space-between; }
#season .res { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; }
#season .res .in { width: min(760px, 90vw); }
#season .res .gap2 { font-family: 'JB Hand', var(--rt-serif); font-size: 60px; color: #f4e6c4; } #season.en .res .gap2 { font-family: var(--rt-deco); font-size: 42px; }
#season .res .lines { margin: 22px 0 10px; display: grid; gap: 12px; }
#season .res .lines div { font-size: 22px; letter-spacing: .04em; opacity: 0; animation: rt-in .9s ease forwards; }
#season .res .lines div::before { content: '◆'; font-size: 9px; color: var(--rt-gold); margin-right: 14px; vertical-align: 4px; }
@keyframes rt-in { from { opacity: 0; transform: translateY(8px); filter: blur(3px); } to { opacity: 1; transform: none; filter: none; } }
#season .doors { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-top: 26px; }
#season .doors h3 { grid-column: 1 / -1; margin: 0; font-weight: 700; font-size: 24px; color: #ecd49a; }
#season .door { position: relative; padding: 46px 18px 22px; background: linear-gradient(rgba(200,163,90,.12), rgba(200,163,90,.02)); border: 1px solid rgba(200,163,90,.4); border-radius: 90px 90px 2px 2px; color: #f4e6c4; cursor: pointer; text-align: center; font: 17px var(--rt-serif); line-height: 1.45; transition: background .25s, transform .25s; }
#season .door:hover { background: linear-gradient(rgba(200,163,90,.28), rgba(200,163,90,.06)); transform: translateY(-3px); }
#season .door::before { content: ''; position: absolute; top: 14px; left: 50%; width: 14px; height: 14px; transform: translateX(-50%) rotate(45deg); border: 1px solid var(--rt-gold); }
#season .door i { display: block; font: normal 12px var(--rt-thin); letter-spacing: .15em; color: rgba(236,212,154,.7); margin-top: 10px; }
#season .on2 { margin-top: 30px; animation: rt-in 1s ease 1.2s both; }
@media (max-width: 820px) { #season .tower { width: 40%; top: 36%; } #season .ctl { left: 48%; top: 30%; } }
`;

export function createSeasonPlan({ getLife, save, hud }) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const root = document.createElement('div'); root.id = 'season'; root.className = 'hidden'; root.setAttribute('role', 'dialog');
  document.body.appendChild(root);
  const S = { open: false, days: 0, gap: '', plan: null, step: 'plan', lines: [], done: null };
  void hud;

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
    const L = getLife(), e = seasonBudget(L, S.days).evenings, has = !!S.plan.lover && candidates(L).length;
    const sh = { make: { make: 0.65, love: has ? 0.08 : 0, friends: 0.05, business: 0.07, rest: 0.15 }, love: { make: 0.1, love: has ? 0.45 : 0, friends: 0.2, business: 0.05, rest: 0.2 },
      biz: { make: 0.25, love: has ? 0.08 : 0, friends: 0.05, business: 0.47, rest: 0.15 }, even: { make: 0.2, love: has ? 0.2 : 0, friends: 0.2, business: 0.2, rest: 0.2 } }[kind];
    for (const u of USES) S.plan[u] = Math.floor(e * sh[u]);
    S.plan.rest += e - used();
  }
  // the windows: the overtime nights spread through the weeks, the plan's evenings in order between them
  function windows(B) {
    const n = B.evenings + B.overtime, seq = [];
    for (const u of USES) for (let i = 0; i < (S.plan[u] || 0); i++) seq.push(u);
    const out = [], ot = B.overtime, stride = ot ? n / ot : Infinity; let k = 0, o = 0;
    for (let i = 0; i < n; i++) { if (o < ot && i >= Math.floor(o * stride + stride / 2)) { out.push('ot'); o++; } else out.push(seq[k++] || null); }
    return out;
  }
  function towerHtml(B) {
    const cells = windows(B).map((u) => (u === 'ot' ? '<i class="ot"></i>' : u === 'rest' ? '<i class="rest"></i>' : u ? `<i class="on" style="--c:${USE[u].c}"></i>` : '<i></i>')).join('');
    const rows = Math.ceil((B.evenings + B.overtime) / 7), avail = Math.min(window.innerHeight * 0.56, 520), ch = Math.max(9, Math.min(34, Math.floor(avail / rows) - 4)), cw = Math.round(ch * 0.82);
    root.style.setProperty('--ch', `${ch}px`); root.style.setProperty('--cw', `${cw}px`); root.style.setProperty('--tw', `${cw * 7 + 24 + 32}px`);
    return `<div class="crown"></div><div class="crown2"></div><div class="facade">${cells}</div><div class="reflect"><div class="facade">${cells}</div></div><div class="tlabel">${T(`${B.evenings + B.overtime} 个晚上 · 一扇窗一个晚上`, `${B.evenings + B.overtime} EVENINGS · ONE WINDOW EACH`)}</div>`;
  }
  function render() {
    const L = getLife(); if (!S.open) return;
    root.classList.toggle('en', getLang() !== 'zh');
    if (S.step === 'result') return renderResult(L);
    const B = seasonBudget(L, S.days), left = B.evenings - used(), pv = previewSeason(L, S.plan, S.days), who = candidates(L);
    const c = isYear(L) ? career(L) : null, employed = c && ['consulting', 'switched'].includes(c.track) && hasProduct(L);
    const ink = (u) => {
      const off = u === 'love' && !who.length;
      return `<div class="ink${off ? ' off' : ''}" style="--c:${USE[u].c}"><span class="sw"></span><span class="nm"><b>${P(USE[u])}</b><i>${off ? T('现在没有这样一个人', 'no one like that now') : P(USE[u].sub)}</i></span>
        ${off ? '<span></span><span class="n">0</span><span></span>' : `<button class="chev" data-d="${u}:-1" title="−1 (Shift −5)">‹</button><span class="n">${S.plan[u] || 0}</span><button class="chev" data-d="${u}:1" title="+1 (Shift +5)">›</button>`}</div>` +
        (u === 'love' && who.length > 1 ? `<div class="who">${who.map((id) => `<button data-who="${id}" class="${S.plan.lover === id ? 'on' : ''}">${esc(nm(id))}</button>`).join('')}</div>` : '');
    };
    root.innerHTML = `<div class="sky"></div>
      <div class="hd"><div class="gap">${esc(S.gap)}</div><div class="q">${T('这段时间，晚上是怎么过的？', 'How did the evenings go?')}</div><div class="why">${T(`${B.days} 天，大约 ${B.weeks} 周。白天是工作的，晚上是你的。每个晚上只能给一件事。`, `${B.days} days, about ${B.weeks} weeks. The days belong to the job; the evenings are yours. Each one goes to one thing.`)}</div></div>
      <div class="tower">${towerHtml(B)}</div>
      <div class="ctl">
        <div class="budget"><b>${B.evenings}</b><span>${T('个晚上', 'EVENINGS')}</span>${B.overtime ? `<span>${T(`另有 ${B.overtime} 晚加班`, `+ ${B.overtime} OVERTIME`)}</span>` : ''}<span class="left ${left === 0 ? 'zero' : left < 0 ? 'over' : ''}">${left === 0 ? T('都安排好了', 'All placed') : left > 0 ? T(`还有 ${left} 个晚上没着落`, `${left} still unplaced`) : T(`多了 ${-left} 个`, `${-left} too many`)}</span></div>
        <div class="inks">${USES.map(ink).join('')}<div class="presets">${T('或者', 'Or')}: <button data-p="make">${T('全力做东西', 'all in on making')}</button>·<button data-p="love">${T('把时间给人', 'time for people')}</button>·<button data-p="biz">${T('跑生意', 'chase the business')}</button>·<button data-p="even">${T('平均', 'even')}</button></div></div>
        <div class="note"><div class="h">${T('会 怎 样', 'W H A T   C O M E S   O F   I T')}</div>${pv.lines.map((l) => `<div class="l ${l.tone}"><b>${MARK[l.tone]}</b>${l.id ? `${esc(nm(l.id))}：` : ''}${esc(T(l.zh, l.en))}</div>`).join('')}</div>
        <div class="bottom">${employed ? `<label class="decl"><input type="checkbox" data-decl ${allot(L).declared ? 'checked disabled' : ''}>${T('向公司报备自己在做产品', 'Declare the side project to the firm')}</label>` : '<span></span>'}<button class="go" data-go ${left !== 0 ? 'disabled' : ''}>${T('就这样过', 'SO IT WENT')}<small>ENTER</small></button></div>
      </div>`;
  }
  function renderResult(L) {
    const ch = pendingChoices(L);
    root.innerHTML = `<div class="sky"></div><div class="res"><div class="in"><div class="gap2">${esc(S.gap)}</div>
      <div class="lines">${(S.lines.length ? S.lines : [{ zh: '日子平平地过去了。', en: 'The days went by, quietly.' }]).map((b, i) => `<div style="animation-delay:${0.3 + i * 0.55}s">${esc(P(b))}</div>`).join('')}</div>
      ${ch.length ? `<div class="doors on2"><h3>${esc(P(ch[0].title))}</h3>${ch[0].options.map((o) => `<button class="door" data-ch="${ch[0].id}:${o.id}">${esc(P(o))}<i>${esc(P(o.note))}</i></button>`).join('')}</div>` : `<div class="on2" style="animation-delay:${0.6 + S.lines.length * 0.55}s"><button class="go" data-close>${T('继续', 'GO ON')}<small>ENTER</small></button></div>`}</div></div>`;
  }

  root.addEventListener('click', (e) => {
    const b = e.target.closest('button,input[data-decl]'); if (!b) return;
    const L = getLife();
    if (b.dataset.d) { const [u, d0] = b.dataset.d.split(':'); const d = +d0 * (e.shiftKey ? 5 : 1), left = seasonBudget(L, S.days).evenings - used(); S.plan[u] = Math.max(0, (S.plan[u] || 0) + (d > 0 ? Math.min(d, Math.max(0, left)) : d)); render(); return; }
    if (b.dataset.who) { S.plan.lover = b.dataset.who; render(); return; }
    if (b.dataset.p) { preset(b.dataset.p); render(); return; }
    if (b.dataset.decl != null) { if (b.checked) { allot(L).declared = true; standing(L, -3, 'declared'); save && save(); } render(); return; }
    if (b.dataset.go != null) { const r = applySeason(L, S.plan, S.days); if (!r.ok) return; S.lines = seasonAftermath(L, r.events); S.step = 'result'; save && save(); render(); return; }
    if (b.dataset.ch) { const [id, opt] = b.dataset.ch.split(':'); choose(L, id, opt); save && save(); render(); return; }
    if (b.dataset.close != null) close();
  });
  function close() { S.open = false; root.classList.add('hidden'); const d = S.done; S.done = null; d && d(); }
  return {
    get active() { return S.open; },
    open(days, gap, onDone) { const L = getLife(); S.days = days; S.gap = gap; S.plan = defaults(L); S.step = 'plan'; S.lines = []; S.done = onDone; S.open = true; root.classList.remove('hidden'); render(); },
    key(k) { if (k === 'Enter') { const g = root.querySelector('[data-go]:not([disabled]),[data-close]'); g && g.click(); } },
  };
}
