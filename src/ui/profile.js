// The character page (I): Ji Bai, all in one place. Tabs: overview, skills, quests, money, reputation,
// belongings & property, and the people he knows as a map (closer to the middle = closer to him).
// The data is world/profileView.js; this only draws it.
//   createProfile({ getLife, defs, onClose }) -> { open(tab), close(), key(k), get isOpen }
import { getLang } from './i18n.js';
import { profileView, GROUPS } from '../world/profileView.js';

const T = (zh, en) => (getLang() === 'zh' ? zh : en);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const yuan = (n) => `¥${Math.round(n).toLocaleString('en-US')}`;
const TABS = [['overview', '概览', 'Overview'], ['skills', '技能', 'Skills'], ['quests', '任务', 'Quests'], ['money', '财富', 'Money'], ['rep', '声望', 'Reputation'], ['things', '物品与房产', 'Belongings'], ['people', '关系', 'People']];

const CSS = `
#profile { position: fixed; inset: 0; z-index: 29; display: grid; place-items: center; background: rgba(3,5,10,0.45); font-family: var(--ui); }
#profile.hidden { display: none; }
#profile .panel { width: min(980px, 96vw); height: min(680px, 92vh); display: grid; grid-template-rows: auto auto 1fr; border-radius: 24px; color: #fff; overflow: hidden; }
#profile .top { display: flex; gap: 16px; align-items: center; padding: 18px 22px 12px; }
#profile .av { width: 58px; height: 58px; border-radius: 50%; display: grid; place-items: center; font: 600 24px var(--ui); background: linear-gradient(140deg, #8cc6f7, #4f7fb8); box-shadow: inset 0 0.5px 0 rgba(255,255,255,.6), 0 4px 14px rgba(0,0,0,.25); flex: none; }
#profile .who h2 { margin: 0; font: 600 21px var(--ui); } #profile .who h2 small { font-weight: 400; font-size: 13px; color: rgba(255,255,255,.65); margin-left: 8px; }
#profile .who p { margin: 3px 0 0; font-size: 13px; color: rgba(255,255,255,.75); }
#profile .chips { margin-left: auto; display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
#profile .chip { font-size: 12px; padding: 4px 10px; border-radius: 999px; background: rgba(255,255,255,.1); border: 0.5px solid rgba(255,255,255,.25); white-space: nowrap; }
#profile .x { margin-left: 6px; font: 500 18px var(--ui); color: #fff; background: rgba(255,255,255,.1); border: 0.5px solid rgba(255,255,255,.3); border-radius: 50%; width: 32px; height: 32px; cursor: pointer; flex: none; }
#profile nav { display: flex; gap: 4px; padding: 0 18px 10px; overflow-x: auto; border-bottom: 0.5px solid rgba(255,255,255,.15); }
#profile nav button { font: 500 13px var(--ui); color: rgba(255,255,255,.8); background: none; border: 0; padding: 6px 12px; border-radius: 999px; cursor: pointer; white-space: nowrap; }
#profile nav button.on { background: var(--accent, #a9d6ff); color: #0d2236; }
#profile .body { overflow: auto; padding: 16px 22px 20px; font-size: 14px; line-height: 1.55; }
#profile .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
#profile .card { padding: 12px 14px; border-radius: 16px; background: rgba(255,255,255,.07); border: 0.5px solid rgba(255,255,255,.12); }
#profile .card h3 { margin: 0 0 8px; font: 600 12px var(--ui); letter-spacing: .14em; text-transform: uppercase; color: rgba(255,255,255,.6); }
#profile .card .big { font: 600 24px var(--ui); } #profile .muted { color: rgba(255,255,255,.6); font-size: 12px; }
#profile .kv { display: grid; grid-template-columns: 1fr auto; gap: 3px 12px; font-size: 13px; } #profile .kv span:nth-child(even) { text-align: right; font-variant-numeric: tabular-nums; }
#profile .meter { display: grid; grid-template-columns: 130px 1fr 36px; gap: 10px; align-items: center; margin: 6px 0; font-size: 13px; }
#profile .meter .bar { height: 7px; border-radius: 4px; background: rgba(255,255,255,.12); overflow: hidden; } #profile .meter .bar i { display: block; height: 100%; border-radius: 4px; background: var(--accent, #a9d6ff); }
#profile .meter b { font-weight: 600; text-align: right; font-variant-numeric: tabular-nums; }
#profile .lv { display: inline-flex; gap: 3px; } #profile .lv i { width: 14px; height: 6px; border-radius: 3px; background: rgba(255,255,255,.18); } #profile .lv i.on { background: var(--accent, #a9d6ff); }
#profile .steps { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; } #profile .steps span { font-size: 12px; padding: 3px 9px; border-radius: 999px; background: rgba(255,255,255,.08); } #profile .steps span.on { background: rgba(159,230,180,.25); color: #d8ffe4; }
#profile .q { padding: 10px 12px; border-radius: 14px; background: rgba(255,255,255,.06); margin-bottom: 8px; } #profile .q b { font-weight: 600; } #profile .q .main { font-size: 11px; color: #0d2236; background: #e8c27a; border-radius: 999px; padding: 1px 7px; margin-left: 6px; }
#profile .q .pg { height: 4px; border-radius: 2px; background: rgba(255,255,255,.12); margin-top: 6px; } #profile .q .pg i { display: block; height: 100%; background: #e8c27a; border-radius: 2px; }
#profile table { width: 100%; border-collapse: collapse; font-size: 13px; } #profile td { padding: 5px 4px; border-bottom: 0.5px solid rgba(255,255,255,.1); } #profile td.n { text-align: right; font-variant-numeric: tabular-nums; }
#profile .map { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 16px; align-items: start; }
#profile svg { width: 100%; height: auto; display: block; } #profile svg text { fill: #fff; font: 500 12px var(--ui); paint-order: stroke; stroke: rgba(10,14,22,.55); stroke-width: 3px; }
#profile svg .node { cursor: pointer; } #profile svg .node:hover circle.dot, #profile svg .node.sel circle.dot { stroke: #fff; stroke-width: 2.5; }
#profile .legend { display: flex; gap: 12px; flex-wrap: wrap; font-size: 12px; margin-bottom: 8px; } #profile .legend i { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 5px; vertical-align: -1px; }
#profile .plist { display: grid; gap: 6px; max-height: 470px; overflow: auto; } #profile .pp { display: grid; grid-template-columns: 10px 1fr auto; gap: 10px; align-items: center; padding: 7px 10px; border-radius: 12px; background: rgba(255,255,255,.06); cursor: pointer; }
#profile .pp.sel { background: rgba(169,214,255,.22); } #profile .pp i { width: 10px; height: 10px; border-radius: 50%; } #profile .pp small { display: block; color: rgba(255,255,255,.6); font-size: 12px; }
@media (max-width: 720px) { #profile .map { grid-template-columns: 1fr; } #profile .chips { display: none; } #profile .meter { grid-template-columns: 96px 1fr 32px; } }
`;

export function createProfile({ getLife, defs = [], onClose = null }) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const root = document.createElement('div'); root.id = 'profile'; root.className = 'hidden'; root.setAttribute('role', 'dialog');
  root.innerHTML = '<div class="panel glass"></div>'; document.body.appendChild(root);
  const panel = root.firstChild;
  const S = { open: false, tab: 'overview', sel: null };

  const meter = (name, v, max = 100) => `<div class="meter"><span>${esc(name)}</span><span class="bar"><i style="width:${Math.max(0, Math.min(100, v / max * 100))}%"></i></span><b>${Math.round(v)}</b></div>`;
  const lv = (n) => `<span class="lv">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;

  function tabOverview(V) {
    const top = V.people.slice(0, 4).map((p) => `<span class="chip" style="border-color:${p.color}">${esc(p.name)}${p.stage ? ` · ${esc(p.stage)}` : ''}</span>`).join(' ');
    const q = V.quests.active.find((x) => x.tracked) || V.quests.active[0];
    return `<div class="grid">
      <div class="card"><h3>${T('今天', 'Today')}</h3><div class="big">${esc(V.me.date)}</div><div class="muted">${esc(V.me.act || '')}</div>${meter(T('精力', 'Energy'), V.me.energy)}${V.me.hurt ? `<div class="muted">${T('伤', 'Hurt')}: ${esc(V.me.hurt)}</div>` : ''}</div>
      <div class="card"><h3>${T('工作', 'Work')}</h3><div class="big">${esc(V.me.job)}</div><div class="muted">${esc(V.me.employer)}${V.me.salary ? ` · ${T('月薪', 'monthly')} ${yuan(V.me.salary)}` : ''}</div>${V.me.standing != null ? meter(T('公司里的位置', 'Standing'), V.me.standing) : ''}</div>
      <div class="card"><h3>${T('财富', 'Money')}</h3><div class="big">${yuan(V.money.net)}</div><div class="muted">${T('现金和存款，扣除信用卡', 'Cash and savings, less the card')}</div></div>
      <div class="card"><h3>${T('技能', 'Skills')}</h3>${V.skills.map((s) => `<div class="kv"><span>${esc(s.name)}</span><span>${lv(s.level)}</span></div>`).join('')}</div>
      <div class="card"><h3>${T('正在做', 'In progress')}</h3>${q ? `<b>${esc(q.title)}</b><div class="muted">${esc(q.step)}</div>` : `<div class="muted">${T('没有进行中的任务', 'Nothing in progress')}</div>`}${V.project.has ? `<div class="steps">${V.project.steps.map((s) => `<span class="${s.done ? 'on' : ''}">${esc(s.text)}</span>`).join('')}</div>` : ''}</div>
      <div class="card"><h3>${T('身边的人', 'Closest')}</h3>${top || `<div class="muted">${T('还没认识谁', 'No one yet')}</div>`}</div>
    </div>`;
  }
  function tabSkills(V) {
    const H = V.time.hours, sum = Object.values(H).reduce((a, b) => a + b, 0) || 1;
    const U = { make: T('做东西', 'Making'), love: T('陪她', 'With her'), friends: T('朋友家人', 'Friends & family'), business: T('生意', 'Business'), rest: T('休息', 'Rest') };
    return `<div class="grid">${V.skills.map((s) => `<div class="card"><h3>${esc(s.name)}</h3><div class="big">${T('等级', 'Level')} ${s.level} ${lv(s.level)}</div><div class="muted">${esc(s.what)}</div>
        ${meter(T('经验', 'XP'), s.next ? s.xp : 1, s.next || 1)}<div class="muted">${s.next ? T(`下一级 ${s.next}`, `Next level at ${s.next}`) : T('满级', 'Top level')}${s.perk ? ` · ${esc(s.perk)}` : ''}</div></div>`).join('')}
      <div class="card"><h3>${T('作品', 'Things he has made')}</h3>${V.project.built.length ? V.project.built.map((b) => `<div>${esc(b)}</div>`).join('') : `<div class="muted">${T('还没有', 'Nothing yet')}</div>`}
        ${V.project.has ? `<div class="muted" style="margin-top:6px">${esc(V.project.name)} · ${T(`第 ${V.project.version} 版`, `version ${V.project.version}`)} · ${T(`${V.project.users} 人用过`, `${V.project.users} people have used it`)} · ${T(`${V.project.list} 人预订`, `${V.project.list} on the list`)}</div><div class="steps">${V.project.steps.map((s) => `<span class="${s.done ? 'on' : ''}">${esc(s.text)}</span>`).join('')}</div>` : ''}</div>
      <div class="card"><h3>${T('时间都去哪了', 'Where the time went')}</h3>${Object.keys(U).map((u) => meter(U[u], H[u] / sum * 100)).join('')}<div class="muted">${T(`工作以外共 ${Math.round(sum)} 小时（%）· 加班 ${V.time.work} 小时 · 透支 ${V.time.burnout} 次`, `${Math.round(sum)} hours outside work (%) · ${V.time.work} h at work · burnt out ${V.time.burnout}×`)}</div></div>
    </div>`;
  }
  function tabQuests(V) {
    const Q = V.quests;
    return `<div class="muted" style="margin-bottom:10px">${T(`进行中 ${Q.active.length} · 完成 ${Q.done} · 失败 ${Q.failed}`, `${Q.active.length} in progress · ${Q.done} done · ${Q.failed} failed`)}</div>
      ${Q.active.map((q) => `<div class="q"><b>${esc(q.title)}</b>${q.main ? `<span class="main">${T('主线', 'Main')}</span>` : ''}${q.tracked ? ` <span class="muted">· ${T('追踪中', 'tracked')}</span>` : ''}<div class="muted">${esc(q.step)}</div><div class="pg"><i style="width:${q.of ? Math.round(q.done / q.of * 100) : 0}%"></i></div></div>`).join('') || `<div class="muted">${T('没有进行中的任务。', 'Nothing in progress.')}</div>`}
      <div class="muted">${T('完整的任务记录在日志里（J）。', 'The full record is in the journal (J).')}</div>`;
  }
  function tabMoney(V) {
    const M = V.money;
    return `<div class="grid">
      <div class="card"><h3>${T('净资产（现金）', 'Net (cash)')}</h3><div class="big">${yuan(M.net)}</div><div class="kv" style="margin-top:6px"><span>${T('微信', 'WeChat')}</span><span>${yuan(M.wechat)}</span><span>${T('支付宝', 'Alipay')}</span><span>${yuan(M.alipay)}</span><span>${T('银行卡', 'Bank')}</span><span>${yuan(M.bank)}</span><span>${T('信用卡已用', 'Card used')}</span><span>−${yuan(M.cardUsed)} / ${yuan(M.cardLimit)}</span>${M.company != null ? `<span>${T('公司账上', 'In the company')}</span><span>${yuan(M.company)}</span>` : ''}</div></div>
      <div class="card"><h3>${T('每月', 'Each month')}</h3><div class="kv"><span>${T('工资', 'Salary')}</span><span>${M.salary ? `+${yuan(M.salary)}` : '—'}</span><span>${T('房租', 'Rent')}</span><span>${M.rent ? `−${yuan(M.rent)}` : T('公司付', 'paid by the firm')}</span></div></div>
      <div class="card" style="grid-column:1/-1"><h3>${T('最近的支出', 'Recent payments')}</h3>${M.recent.length ? `<table>${M.recent.map((e) => `<tr><td>${esc(e.to)}</td><td class="muted">${esc(e.memo || '')}</td><td class="n">${e.in ? '+' : '−'}${yuan(Math.abs(e.amount))}</td></tr>`).join('')}</table>` : `<div class="muted">${T('还没有', 'None yet')}</div>`}</div>
    </div>`;
  }
  function tabRep(V) {
    return `<div class="card">${V.rep.map((r) => meter(r.name, r.v)).join('')}<div class="muted" style="margin-top:6px">${T('50 是一般。公司里的位置决定升职和去留；口碑和人脉决定机会从哪来；街头名声是外滩上的人怎么看你。', '50 is ordinary. Standing decides promotion and whether you stay; reputation and network decide where chances come from; the street is how the Bund sees you.')}</div></div>`;
  }
  function tabThings(V) {
    const P = V.property;
    return `<div class="grid">
      <div class="card"><h3>${T('住的地方', 'Home')}</h3><b>${esc(P.home.name)}</b><div class="muted">${P.home.size ? `${P.home.size} m² · ` : ''}${P.home.rent ? T(`租 ${yuan(P.home.rent)}/月`, `rent ${yuan(P.home.rent)}/month`) : T('公司付', 'paid by the firm')}</div></div>
      <div class="card"><h3>${T('车', 'Car')}</h3>${P.car ? `<b><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${esc(P.car.hex)};margin-right:6px"></span>${esc(P.car.name)}</b><div class="muted">${esc(P.car.plate)}</div>` : `<div class="muted">${T('没有车（滴滴、地铁、轮渡）', 'No car (DiDi, the metro, the ferry)')}</div>`}</div>
      ${P.company ? `<div class="card"><h3>${T('公司', 'Company')}</h3><b>${esc(P.company.name)}</b><div class="muted">${P.company.funded ? T('已融资', 'Funded') : T('还没融资', 'Not yet funded')} · ${yuan(P.company.cash)}</div></div>` : ''}
      <div class="card" style="grid-column:1/-1"><h3>${T('物品', 'Things')} · ${V.items.length}</h3>${V.items.length ? `<table>${V.items.map((i) => `<tr><td>${esc(i.name)}</td><td class="muted n">${esc(i.from)}</td></tr>`).join('')}</table>` : `<div class="muted">${T('随身就一个手机。', 'Just a phone.')}</div>`}</div>
    </div>`;
  }
  // the map: him in the middle, each group in its own sector, closer = nearer the middle
  function mapSvg(V) {
    const W = 520, C = W / 2, order = ['heart', 'family', 'friend', 'work', 'other'], groups = order.filter((g) => V.people.some((p) => p.group === g));
    const span = (Math.PI * 2) / Math.max(1, groups.length), parts = [];
    for (const r of [80, 150, 220]) parts.push(`<circle cx="${C}" cy="${C}" r="${r}" fill="none" stroke="rgba(255,255,255,0.1)" stroke-dasharray="3 5"/>`);
    const nodes = [];
    groups.forEach((g, gi) => {
      const ps = V.people.filter((p) => p.group === g), a0 = -Math.PI / 2 + gi * span;
      ps.forEach((p, i) => {
        const a = a0 + span * (ps.length === 1 ? 0.5 : 0.12 + 0.76 * (i / (ps.length - 1))), r = 62 + (100 - p.close) * 1.75;
        nodes.push({ p, x: C + Math.cos(a) * r, y: C + Math.sin(a) * r, color: GROUPS[g][2] });
      });
      const la = a0 + span / 2; parts.push(`<text x="${C + Math.cos(la) * 246}" y="${C + Math.sin(la) * 246}" text-anchor="middle" style="font-size:11px;opacity:.6">${esc(T(GROUPS[g][0], GROUPS[g][1]))}</text>`);
    });
    for (const n of nodes) parts.push(`<line x1="${C}" y1="${C}" x2="${n.x.toFixed(1)}" y2="${n.y.toFixed(1)}" stroke="${n.color}" stroke-opacity="${n.p.over ? 0.15 : 0.25 + n.p.close / 200}" stroke-width="${(0.6 + n.p.close / 28).toFixed(1)}"${n.p.over ? ' stroke-dasharray="4 4"' : ''}/>`);
    parts.push(`<circle cx="${C}" cy="${C}" r="24" fill="url(#me)"/><text x="${C}" y="${C + 5}" text-anchor="middle" style="font-size:14px;font-weight:600">${esc(T('纪白', 'Ji Bai'))}</text>`);
    for (const n of nodes) parts.push(`<g class="node${S.sel === n.p.id ? ' sel' : ''}" data-p="${n.p.id}"><circle class="dot" cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${(7 + n.p.close / 14).toFixed(1)}" fill="${esc(n.p.color || n.color)}" stroke="${n.color}" stroke-width="1.5"${n.p.over ? ' opacity=".45"' : ''}/><text x="${n.x.toFixed(1)}" y="${(n.y + 22).toFixed(1)}" text-anchor="middle">${esc(n.p.name)}</text></g>`);
    return `<svg viewBox="0 0 ${W} ${W}" role="img" aria-label="${esc(T('关系图', 'Relationship map'))}"><defs><radialGradient id="me"><stop offset="0" stop-color="#cfe7ff"/><stop offset="1" stop-color="#4f7fb8"/></radialGradient></defs>${parts.join('')}</svg>`;
  }
  function tabPeople(V) {
    if (!V.people.length) return `<div class="muted">${T('还没认识谁。', 'No one yet.')}</div>`;
    const sel = V.people.find((p) => p.id === S.sel);
    return `<div class="legend">${Object.entries(GROUPS).filter(([g]) => V.people.some((p) => p.group === g)).map(([, g]) => `<span><i style="background:${g[2]}"></i>${esc(T(g[0], g[1]))}</span>`).join('')}<span class="muted">${T('越靠近中间越亲近', 'Nearer the middle = closer')}</span></div>
      <div class="map"><div>${mapSvg(V)}</div><div>
        ${sel ? `<div class="card" style="margin-bottom:10px"><h3>${esc(T(GROUPS[sel.group][0], GROUPS[sel.group][1]))}</h3><b style="font-size:17px">${esc(sel.full)}</b><div class="muted">${esc(sel.role)}</div>${meter(T('亲近', 'Closeness'), sel.close)}${sel.stage ? `<div class="kv"><span>${T('关系', 'Where it stands')}</span><span>${esc(sel.stage)}</span></div>` : ''}<div class="kv"><span>${T('一起度过', 'Time together')}</span><span>${sel.hours ? T(`${sel.hours} 小时`, `${sel.hours} h`) : '—'}</span></div></div>` : ''}
        <div class="plist">${V.people.map((p) => `<div class="pp${S.sel === p.id ? ' sel' : ''}" data-p="${p.id}"><i style="background:${GROUPS[p.group][2]}"></i><span><b>${esc(p.name)}</b><small>${esc(p.role)}</small></span><span class="muted">${p.stage ? esc(p.stage) : Math.round(p.close)}</span></div>`).join('')}</div>
      </div></div>`;
  }
  const TAB = { overview: tabOverview, skills: tabSkills, quests: tabQuests, money: tabMoney, rep: tabRep, things: tabThings, people: tabPeople };

  function render() {
    if (!S.open) return;
    const V = profileView(getLife(), defs, getLang());
    panel.innerHTML = `<div class="top"><div class="av">${esc(T('纪', 'JB'))}</div><div class="who"><h2>${esc(V.me.name)}<small>${T(`${V.me.age} 岁`, `${V.me.age}`)} · ${esc(V.me.job)}</small></h2><p>${esc(V.me.line)}</p></div>
      <div class="chips"><span class="chip">${esc(V.me.date)}</span><span class="chip">${T('精力', 'Energy')} ${V.me.energy}</span><span class="chip">${yuan(V.money.net)}</span></div><button class="x" data-x aria-label="${T('关闭', 'Close')}">×</button></div>
      <nav>${TABS.map(([id, zh, en]) => `<button data-tab="${id}" class="${S.tab === id ? 'on' : ''}">${T(zh, en)}</button>`).join('')}</nav>
      <div class="body">${TAB[S.tab](V)}</div>`;
  }
  root.addEventListener('click', (e) => {
    if (e.target === root) return api.close();
    const b = e.target.closest('[data-tab],[data-x],[data-p]'); if (!b) return;
    if (b.dataset.x != null) return api.close();
    if (b.dataset.tab) { S.tab = b.dataset.tab; render(); return; }
    if (b.dataset.p) { S.sel = S.sel === b.dataset.p ? null : b.dataset.p; const sc = panel.querySelector('.body').scrollTop; render(); panel.querySelector('.body').scrollTop = sc; }
  });
  const api = {
    get isOpen() { return S.open; },
    open(tab = null) { if (tab) S.tab = tab; S.open = true; root.classList.remove('hidden'); render(); },
    close() { if (!S.open) return; S.open = false; root.classList.add('hidden'); onClose && onClose(); },
    key(k) {
      if (k === 'KeyI' || k === 'Escape') return api.close();
      const i = TABS.findIndex(([id]) => id === S.tab);
      if (k === 'ArrowRight' || k === 'KeyD') { S.tab = TABS[(i + 1) % TABS.length][0]; render(); }
      if (k === 'ArrowLeft' || k === 'KeyA') { S.tab = TABS[(i + TABS.length - 1) % TABS.length][0]; render(); }
      if (/^Digit[1-7]$/.test(k)) { S.tab = TABS[+k.slice(5) - 1][0]; render(); }
    },
  };
  return api;
}
