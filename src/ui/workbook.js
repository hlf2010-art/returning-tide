// The notebook: the night gimbal's week on four pages (engine/studio.js, world/work.js).
//   今晚 Tonight   how many evenings are left, who's out there, what was said today; write the day up
//   问题 Issues    what you've found wrong with it, and what can be done: pick up to two, make a version
//   记录 Pages     what you wrote, evening by evening
//   名单 List      who wants one; what you'd charge
// Opened at a desk (E at the desk in 612: write, firmware), at the bench in Yangpu (write, hardware
// and firmware), or from the journal's Work tab (read only). The clock stands still while it's open;
// making a version takes its hours through a fade, like the 3D printer does.
import { getLang } from './i18n.js';
import { clockText, stamp } from '../engine/life.js';
import { level, maker, solderJoint, solderWindow } from '../engine/maker.js';
import { studio, hasProduct, rev, specs, summary, isOpen, eveningOf, todays, quotable, unwritten, canWrite, writePage, knownFixes, revise, setPrice, goesLeft, batteryLeft,
  FIXES, PRICES, MAX_PER_SESSION, HEAVY_AT, RUNTIME_OK } from '../engine/studio.js';
import { PRODUCT, ISSUE_TEXT, FIX_TEXT, REG, PERSONA_NAME, quoteOf, speakerOf, tonightLines } from '../world/work.js';

const T = (zh, en) => (getLang() === 'zh' ? zh : en);
const P = (b) => (b ? (getLang() === 'zh' ? b.zh : b.en) : '');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
import { finalDay } from '../engine/year.js';
const DINNER = (L) => finalDay(L) * 1440 + 20 * 60;
const hoursText = (h) => T(`${h % 1 ? h.toFixed(1) : h} 小时`, `${h % 1 ? h.toFixed(1) : h} ${h === 1 ? 'hour' : 'hours'}`);
const whoName = (id) => P(REG[id] ? REG[id].name : PERSONA_NAME[id] || PERSONA_NAME.office);

// the header everyone shares: what it is tonight, in numbers
function specLine(L) {
  const sp = specs(L);
  const chip = (txt, bad) => `<span class="sp${bad ? ' bad' : ''}">${txt}</span>`;
  return `${chip(`${sp.grams} g`, sp.grams > HEAVY_AT)}${chip(T(`${sp.minutes} 分钟`, `${sp.minutes} min`), sp.minutes < RUNTIME_OK && !sp.usbc)}${chip(T(`稳定 ${Math.round(sp.steady * 100)}%`, `steadiness ${Math.round(sp.steady * 100)}%`), isOpen(L, 'drift'))}${chip(T(`零件 ¥${sp.bom}`, `parts ¥${sp.bom}`), false)}`;
}
// how long until the dinner, in evenings
function countdown(L) {
  if (L.flags.dinnerChoice || stamp(L) > DINNER(L)) return '';
  const left = finalDay(L) - eveningOf(L);
  return left <= 0 ? T('今晚八点，和爸爸吃饭。做到哪一版，就是哪一版。', 'Dinner with Dad is at eight tonight. Whatever version this is, it is the one he sees.')
    : T(`离和爸爸吃饭还有 ${left} 个晚上。`, `${left} ${left === 1 ? 'evening' : 'evenings'} until the dinner with Dad.`);
}
// a page, as written: what the evening came to
export function pageHtml(L, eve) {
  const pg = studio(L).pages[eve]; if (!pg) return '';
  const names = (ids, tx) => ids.map((i) => P(tx[i].name || tx[i])).join(T('；', '; '));
  const q = quoteOf(pg.line, L);
  return `<div class="page"><h4>${T(`第 ${eve} 天 · 第 ${pg.rev} 版`, `Day ${eve} · version ${pg.rev}`)}</h4>
    ${pg.hands ? `<p>${T(`借给了 ${pg.hands} 个人。`, `Lent to ${pg.hands} ${pg.hands === 1 ? 'person' : 'people'}.`)}${pg.liked ? T(`其中 ${pg.liked} 个什么都没挑。`, ` ${pg.liked} of them found nothing to complain of.`) : ''}</p>` : `<p>${T('今天没有拿出去。', "It didn't leave your pocket today.")}</p>`}
    ${pg.heard.length ? `<p>${T('新听到的：', 'New today: ')}${esc(names(pg.heard, ISSUE_TEXT))}${T('。', '.')}</p>` : ''}
    ${pg.fixes.length ? `<p>${T('改了：', 'Changed: ')}${esc(names(pg.fixes, FIX_TEXT))}${T('。', '.')}</p>` : ''}
    ${q ? `<blockquote>“${esc(P(q))}”<cite>${esc(P(speakerOf(pg.line)))}</cite></blockquote>` : ''}
    ${pg.plan.length ? `<p class="plan">${T('明天先做：', 'Tomorrow, first: ')}${esc(names(pg.plan, ISSUE_TEXT))}${T('。', '.')}</p>` : ''}</div>`;
}
// the journal's Work tab (read only): where it stands
export function workSummaryHtml(L) {
  if (!hasProduct(L)) return `<div class="wb-sum"><p class="empty">${T('你还没有做出自己的东西。夜行云台的图纸贴在杨浦创客空间的白板上。', "You haven't made anything of your own yet. The night gimbal is a sketch on the whiteboard at the Yangpu makerspace.")}</p></div>`;
  const s = summary(L), S = studio(L), cd = countdown(L);
  const pages = Object.keys(S.pages).map(Number).sort((a, b) => b - a);
  const issue = (i) => `<span class="is ${isOpen(L, i) ? 'open' : 'ok'}">${esc(P(ISSUE_TEXT[i].name))}</span>`;
  return `<div class="wb-sum"><h2>${esc(P(PRODUCT))} · ${T(`第 ${s.rev} 版`, `version ${s.rev}`)}</h2><div class="specs">${specLine(L)}</div>
    ${cd ? `<p class="cd">${cd}</p>` : ''}
    <div class="nums"><div><b>${s.hands}</b>${T('个人用过', s.hands === 1 ? 'person has tried it' : 'people have tried it')}</div><div><b>${s.evenings}</b>${T('个晚上', s.evenings === 1 ? 'evening out' : 'evenings out')}</div><div><b>${s.pages}</b>${T('页记录', s.pages === 1 ? 'page written' : 'pages written')}</div><div><b>${s.list}</b>${T('个人想要', s.list === 1 ? 'person wants one' : 'people want one')}</div></div>
    ${s.open.length + s.solved.length ? `<div class="iss">${s.open.map(issue).join('')}${s.solved.map(issue).join('')}</div>` : `<p class="empty">${T('还没有人告诉你它哪里不对。天黑以后，拿到江边去。', 'Nobody has told you what is wrong with it yet. Take it down to the river after dark.')}</p>`}
    ${unwritten(L).length ? `<p class="hint">${T(`有 ${unwritten(L).length} 件事还没写下来（612 的书桌，或工作台）。`, `${unwritten(L).length} ${unwritten(L).length === 1 ? 'thing' : 'things'} not written up yet (the desk in 612, or your bench).`)}</p>` : ''}
    ${pages.length ? pageHtml(L, pages[0]) : ''}
    <p class="hint">${T('白天改（硬件在杨浦的工作台，固件在书桌也行），天黑了拿到外滩给人用，夜里记下来。', 'Revise by day (hardware at the Yangpu bench; firmware can be done at a desk), put it in people\'s hands on the Bund after dark, write it up at night.')}</p></div>`;
}

export function createWorkbook({ getLife, save, hud, audio = null, onClose = null, pass = null }) {
  const root = document.createElement('div'); root.id = 'workbook'; root.className = 'hidden'; root.setAttribute('role', 'dialog');
  document.body.appendChild(root);
  const S = { open: false, where: 'read', tab: 'tonight', line: null, plan: new Set(), pick: new Set(), solder: null, note: '' };
  const L0 = () => getLife();
  const can = () => S.where !== 'read';

  function tonightTab(L) {
    const St = studio(L), eve = eveningOf(L), tests = todays(L), qs = quotable(L), cw = canWrite(L), pg = St.pages[eve];
    const regs = tonightLines(L).filter((r) => r.met || (St.heardOf || {})[r.id]).map((r) => `<div class="rg"><b>${esc(P(r.name))}</b><span>${esc(P(r.hours))}</span><i>${r.met ? (r.overdue ? T('你说过会回去，没去', 'you said you\'d be back, and weren\'t') : r.promised ? T('说好了改完再给他试', 'you said you\'d bring it back changed') : r.tried >= rev(L) ? T(`试过第 ${r.tried} 版`, `has tried version ${r.tried}`) : T(`上次试的是第 ${r.tried} 版`, `last tried version ${r.tried}`)) : T('听说的，还没见过', 'heard of, not met')}</i></div>`).join('');
    const said = qs.map((t, i) => { const q = quoteOf(t, L); return `<label class="qt${S.line === i ? ' on' : ''}">${can() && cw.ok ? `<input type="radio" name="wb-line" data-line="${i}"${S.line === i ? ' checked' : ''}>` : ''}<span>“${esc(P(q))}”<cite>${esc(P(speakerOf(t)))}</cite></span></label>`; }).join('');
    let write = '';
    const page = pg ? `<div class="hd">${T('今天这一页', "Today's page")}</div>${pageHtml(L, eve)}` : '';
    if (pg && !(cw.ok && can())) write = page;
    else if (!can()) write = cw.ok ? `<p class="hint">${T('今天的还没写。在 612 的书桌或工作台上写。', "Today isn't written up yet. Do it at the desk in 612, or at your bench.")}</p>` : '';
    else if (cw.ok) {
      const open = Object.keys(St.found).filter((i) => isOpen(L, i));
      write = `<div class="hd">${cw.more ? T('写完以后又听到了新的：补上', 'You heard more after writing: add it') : T('写下今天这一页', 'Write up today')}</div>
        ${qs.length ? `<p class="hint">${T('画一句线：今天哪句话最该记住？', 'Underline one: which remark is the one to remember?')}</p>` : ''}
        ${open.length ? `<p class="hint">${T(`明天先做什么（最多 ${MAX_PER_SESSION} 件）：`, `What tomorrow is for (${MAX_PER_SESSION} at most):`)}</p><div class="pl">${open.map((i) => `<button class="tg${S.plan.has(i) ? ' on' : ''}" data-plan="${i}">${esc(P(ISSUE_TEXT[i].name))}</button>`).join('')}</div>` : ''}
        <button class="go" data-act="write">${cw.more ? T('补上', 'Add it') : T('写下来', 'Write it down')}</button>${page}`;
    } else if (cw.reason === 'empty') write = `<p class="hint">${T('今天还没什么可写的。天黑以后，把它借给江边拍照的人。', 'Nothing to write yet today. After dark, lend it to people taking photos by the river.')}</p>`;
    const dusk = L.clock.minute >= 17 * 60 + 10 && L.clock.minute < 23 * 60;
    return `<p class="cd">${countdown(L)}</p>
      <div class="row3"><div><b>${goesLeft(L)}</b>${T('今晚还能借出去几次', 'more goes in the battery tonight')}<small>${T(`还剩 ${batteryLeft(L)} 分钟`, `${batteryLeft(L)} min left`)}</small></div><div><b>${tests.filter((t) => t.kind !== 'dead').length}</b>${T('个人今天试过', 'tried it today')}</div><div><b>${clockText(L.clock.minute)}</b>${dusk ? T('天黑了，正是时候', "It's dark: now's the time") : L.clock.minute < 17 * 60 + 10 ? T('泛光灯 17:10 亮', 'The floodlights come on at 5:10') : T('江边的人快散了', 'The promenade is emptying')}</div></div>
      ${regs ? `<div class="hd">${T('每天傍晚都在的人', 'There every evening')}</div>${regs}` : ''}
      ${said ? `<div class="hd">${T('今天听到的', 'Said today')}</div><div class="qs">${said}</div>` : ''}${write}`;
  }
  function issuesTab(L) {
    const St = studio(L), found = Object.keys(St.found), sp = specs(L), where = S.where === 'read' ? 'bench' : S.where;
    if (!found.length) return `<p class="hint">${T('还没有人告诉你它哪里不对。做的人自己是看不出来的：天黑以后，拿到江边，借给正在拍照的人。', "Nobody has told you what's wrong with it yet. The person who made a thing can't see it: after dark, take it to the river and lend it to people taking photos.")}</p>`;
    const fixes = knownFixes(L, where);
    const rows = found.map((i) => {
      const f = St.found[i], open = isOpen(L, i), mine = fixes.filter((x) => x.solves === i);
      const fx = !f.noted ? `<div class="fx no">${T('还没写下来。先写今天的记录，才知道怎么改。', "Not written up yet. Write today's page first; then you'll know what to do about it.")}</div>`
        : mine.map((x) => {
          const done = x.can.reason === 'done', ok = x.can.ok, why = { where: T('要去杨浦的工作台', 'needs the bench in Yangpu'), level: T(`要创客 ${x.can.need} 级`, `needs Maker ${x.can.need}`), money: T('微信余额不够', 'not enough in WeChat Pay'), works: T('自己做不了', "can't be made here") }[x.can.reason] || '';
          const d = [x.at === 'works' ? '' : hoursText(x.hours), x.cost ? `¥${x.cost}` : '', x.grams ? `${x.grams > 0 ? '+' : '−'}${Math.abs(x.grams)} g` : '', x.minutes ? T(`+${x.minutes} 分钟`, `+${x.minutes} min`) : '', x.at === 'desk' ? T('固件', 'firmware') : x.at === 'bench' ? T('硬件', 'hardware') : ''].filter(Boolean).join(' · ');
          return `<div class="fx${done ? ' done' : ok ? '' : ' no'}">${can() && ok ? `<button class="tg${S.pick.has(x.id) ? ' on' : ''}" data-pick="${x.id}">${S.pick.has(x.id) ? '✓' : '+'}</button>` : `<span class="mk">${done ? '✓' : '·'}</span>`}<span class="fn">${esc(P(FIX_TEXT[x.id]))}<small>${d}${why && !done ? ` · ${why}` : ''}</small></span></div>`;
        }).join('');
      return `<div class="iss ${open ? 'open' : 'ok'}"><div class="ih"><b>${esc(P(ISSUE_TEXT[i].name))}</b><span>${open ? T(`${f.n} 个人说过`, `${f.n} ${f.n === 1 ? 'person' : 'people'} said so`) : T('改好了', 'put right')}</span></div>
        <p>${esc(P(ISSUE_TEXT[i].note(sp)))} <i>${f.by === 'me' ? T('你自己发现的', 'You found this one yourself') : `${T('最先说的：', 'First from: ')}${esc(whoName(f.by))}`}</i></p>${fx}</div>`;
    }).join('');
    const ids = [...S.pick], hrs = ids.reduce((a, id) => a + FIXES[id].hours, 0), cost = ids.reduce((a, id) => a + FIXES[id].cost, 0);
    const bar = !can() ? '' : `<div class="make">${ids.length ? `<span>${T(`第 ${rev(L) + 1} 版 · ${hoursText(hrs)}${cost ? ` · ¥${cost}` : ''}`, `Version ${rev(L) + 1} · ${hoursText(hrs)}${cost ? ` · ¥${cost}` : ''}`)}</span><button class="go" data-act="make">${T('做这一版', 'Make this version')}</button>`
      : `<span>${T(`一次最多改 ${MAX_PER_SESSION} 处：改多了，不知道是哪一处起的作用。${S.where === 'desk' ? '这张书桌上只能改固件。' : ''}`, `Change ${MAX_PER_SESSION} things at most at a sitting, or you won't know which one did the work.${S.where === 'desk' ? ' At this desk, firmware only.' : ''}`)}</span>`}</div>`;
    return rows + bar;
  }
  function pagesTab(L) {
    const pages = Object.keys(studio(L).pages).map(Number).sort((a, b) => b - a);
    return pages.length ? pages.map((e) => pageHtml(L, e)).join('') : `<p class="hint">${T('一页还没写。每天晚上在书桌上写一页：写下来的问题，才改得了。', 'Not a page yet. Write one each night at a desk: only what is written down can be fixed.')}</p>`;
  }
  function listTab(L) {
    const St = studio(L), s = summary(L);
    const rows = St.list.map((e) => `<div class="ls"><b>${esc(whoName(e.who))}</b><span>${T(`第 ${e.eve} 天`, `day ${e.eve}`)} · ${T(`${e.units || 1} 台`, `${e.units || 1} ${(e.units || 1) === 1 ? 'unit' : 'units'}`)}${e.deposit ? ` · ${T(`定金 ¥${e.deposit}`, `deposit ¥${e.deposit}`)}` : ''}</span></div>`).join('');
    const price = `<div class="hd">${T('卖多少', 'What you\'d charge')}</div><div class="pl">${PRICES.map((p) => (can() ? `<button class="tg${St.price === p ? ' on' : ''}" data-price="${p}">¥${p}</button>` : `<span class="tg${St.price === p ? ' on' : ''}">¥${p}</span>`)).join('')}</div>
      <p class="hint">${T(`零件 ¥${s.bom}（做五十台的量，大约 ¥${s.batch}）。${s.margin < 0 ? `现在卖一台亏 ¥${-s.margin}。` : `一台能剩 ¥${s.margin}。`}${s.tooDear ? `有 ${s.tooDear} 个人喜欢，但嫌贵。` : ''}`, `Parts ¥${s.bom} (about ¥${s.batch} at fifty sets). ${s.margin < 0 ? `At this price each one loses ¥${-s.margin}.` : `Each one leaves ¥${s.margin}.`}${s.tooDear ? ` ${s.tooDear} ${s.tooDear === 1 ? 'person' : 'people'} liked it but not the price.` : ''}`)}</p>`;
    return `${rows ? `<div class="hd">${T(`想要的人 · ${s.list} 人 ${s.units} 台${s.deposits ? ` · 定金 ¥${s.deposits}` : ''}`, `Who wants one · ${s.list} ${s.list === 1 ? 'name' : 'names'}, ${s.units} ${s.units === 1 ? 'unit' : 'units'}${s.deposits ? ` · deposits ¥${s.deposits}` : ''}`)}</div>${rows}` : `<p class="hint">${T('名单还是空的。一个人挑不出毛病、价钱也合适的时候，会问你哪里买。', "The list is empty. When someone finds nothing to complain of, and the price suits them, they'll ask where to buy one.")}</p>`}${price}
      <p class="hint">${T('游戏内虚拟资金。', 'In-game money only.')}</p>`;
  }
  function solderView(L) {
    const n = S.solder.joints.length, w = solderWindow(level(maker(L)));
    return `<div class="solder"><div class="t">${T(`焊第 ${n + 1} / 3 个焊点：标记进入绿色区域时按 空格`, `Joint ${n + 1} of 3: press Space as the marker crosses the green`)}</div>
      <div class="bar"><div class="win" style="left:${(0.5 - w) * 100}%;width:${w * 200}%"></div><div class="mk" style="left:${S.solder.phase * 100}%"></div></div>
      <div class="js">${S.solder.joints.map((q) => `<i class="${q > 0.85 ? 'g' : q > 0.5 ? 'o' : 'b'}"></i>`).join('')}</div></div>`;
  }
  function render() {
    const L = L0();
    if (!hasProduct(L)) { root.innerHTML = `<div class="panel"><div class="ph"><span>${T('本子', 'Notebook')}</span><button class="x" data-act="close">✕</button></div><p class="hint">${T('本子是空的。先在杨浦的创客空间把夜行云台做出来。', 'The notebook is empty. Build the night gimbal at the Yangpu makerspace first.')}</p></div>`; return; }
    const tabs = [['tonight', T('今晚', 'Tonight')], ['issues', T('问题', 'Issues')], ['pages', T('记录', 'Pages')], ['list', T('名单', 'List')]];
    const where = { desk: T('612 的书桌', 'the desk in 612'), bench: T('杨浦的工作台', 'your bench in Yangpu'), read: T('翻看', 'reading') }[S.where];
    const body = S.solder ? solderView(L) : S.tab === 'tonight' ? tonightTab(L) : S.tab === 'issues' ? issuesTab(L) : S.tab === 'pages' ? pagesTab(L) : listTab(L);
    root.innerHTML = `<div class="panel"><div class="ph"><span>${esc(P(PRODUCT))} · ${T(`第 ${rev(L)} 版`, `version ${rev(L)}`)}</span><span class="wh">${where}</span><button class="x" data-act="close" aria-label="close">✕</button></div>
      <div class="specs">${specLine(L)}</div>
      ${S.solder ? '' : `<div class="tabs">${tabs.map(([id, t]) => `<button data-tab="${id}" class="${S.tab === id ? 'on' : ''}">${t}${id === 'issues' && unwritten(L).length ? `<em>${unwritten(L).length}</em>` : ''}</button>`).join('')}</div>`}
      <div class="body">${body}</div>${S.note ? `<p class="note">${esc(S.note)}</p>` : ''}<div class="foot">${S.solder ? T('空格 焊', 'Space to solder') : T('Esc 合上', 'Esc to close')}</div></div>`;
  }
  function finish(quality) {
    const L = L0(), ids = [...S.pick], r = revise(L, ids, S.where === 'desk' ? 'desk' : 'bench', { quality });
    S.solder = null;
    if (!r.ok) { S.note = T('这一版做不了。', "That version can't be made."); render(); return; }
    S.pick.clear(); S.note = ''; save && save();
    const names = ids.map((id) => P(FIX_TEXT[id])).join(T('；', '; '));
    const done = () => { render(); hud && hud.toast(T(`第 ${r.rev} 版：${names} · +${r.xp} 创客经验${r.levelUp ? ` · 升到创客 ${r.levelUp}` : ''}`, `Version ${r.rev}: ${names} · +${r.xp} Maker XP${r.levelUp ? ` · Maker ${r.levelUp}` : ''}`), 5); };
    if (pass) { root.classList.add('hidden'); pass(Math.round(r.hours * 60), T(`改第 ${r.rev} 版 · ${hoursText(r.hours)}`, `Making version ${r.rev} · ${hoursText(r.hours)}`), () => { if (S.open) root.classList.remove('hidden'); done(); }); }
    else done();
  }
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab],[data-act],[data-plan],[data-pick],[data-price],[data-line]'); if (!b) { if (e.target === root && !S.solder) api.close(); return; }
    const L = L0();
    if (b.dataset.tab) { S.tab = b.dataset.tab; S.note = ''; render(); return; }
    if (b.dataset.line != null) { S.line = +b.dataset.line; render(); return; }
    if (b.dataset.plan) { const i = b.dataset.plan; if (S.plan.has(i)) S.plan.delete(i); else if (S.plan.size < MAX_PER_SESSION) S.plan.add(i); render(); return; }
    if (b.dataset.pick) { const i = b.dataset.pick; if (S.pick.has(i)) S.pick.delete(i); else if (S.pick.size < MAX_PER_SESSION) S.pick.add(i); else S.note = T(`一次最多改 ${MAX_PER_SESSION} 处。`, `${MAX_PER_SESSION} changes at a sitting, no more.`); render(); return; }
    if (b.dataset.price) { setPrice(L, +b.dataset.price); save && save(); render(); return; }
    if (b.dataset.act === 'close') { api.close(); return; }
    if (b.dataset.act === 'write') {
      const w = writePage(L, { line: S.line, plan: [...S.plan] }); if (!w.ok) return;
      S.line = null; S.plan.clear(); save && save(); audio && audio.cue && audio.cue('ping', 0, 0.3);
      hud && hud.toast(T(`写下了第 ${w.eve} 天这一页 · +${w.xp} 创客经验${w.levelUp ? ` · 升到创客 ${w.levelUp}` : ''}`, `Day ${w.eve} written up · +${w.xp} Maker XP${w.levelUp ? ` · Maker ${w.levelUp}` : ''}`), 4);
      if (w.page.heard.length) S.tab = 'issues';
      render(); return;
    }
    if (b.dataset.act === 'make' && S.pick.size) {
      if ([...S.pick].some((id) => FIXES[id].solder)) { S.solder = { joints: [], phase: 0, dir: 1, speed: 1 }; render(); } else finish(null);
    }
  });
  const api = {
    get isOpen() { return S.open; }, get where() { return S.where; }, get soldering() { return !!S.solder; },
    // where: 'desk' | 'bench' | 'read'
    open(where = 'read', tab = null) {
      const L = L0(); S.open = true; S.where = where; S.note = ''; S.pick.clear(); S.plan = new Set(studio(L).plan || []); S.line = null; S.solder = null;
      S.tab = tab || (where !== 'read' && unwritten(L).length ? 'tonight' : where === 'bench' ? 'issues' : 'tonight');
      root.classList.remove('hidden'); render();
    },
    close() { if (!S.open || S.solder) return; S.open = false; root.classList.add('hidden'); onClose && onClose(); },
    refresh() { if (S.open) render(); },
    key(code) {
      if (!S.open) return false;
      if (S.solder) {
        if (code === 'Space' || code === 'KeyE') {
          const q = solderJoint(S.solder.phase, level(maker(L0()))); S.solder.joints.push(q); audio && audio.cue && audio.cue(q > 0.6 ? 'ping' : 'bump', 0, 0.25); S.solder.speed = 1 + S.solder.joints.length * 0.15;
          if (S.solder.joints.length >= 3) finish(S.solder.joints.reduce((a, b) => a + b, 0) / 3); else render();
        }
        return true;
      }
      if (code === 'Escape' || code === 'KeyN') { api.close(); return true; }
      const i = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(code);
      if (i >= 0) { S.tab = ['tonight', 'issues', 'pages', 'list'][i]; render(); }
      return true;
    },
    update(dt) {
      if (!S.open || !S.solder) return;
      const s = S.solder; s.phase += s.dir * s.speed * dt; if (s.phase > 1) { s.phase = 1; s.dir = -1; } if (s.phase < 0) { s.phase = 0; s.dir = 1; }
      const mk = root.querySelector('.solder .mk'); if (mk) mk.style.left = `${s.phase * 100}%`;
    },
  };
  return api;
}
