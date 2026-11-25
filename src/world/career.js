// 纪白的工作 / Ji Bai's working life: the rules that run the year's scenes (world/careerScenes.js,
// world/careerRoads.js), the calendar's consequences (a day at work, a day skipped, the months that
// pass in a night), where he lives, his start-up's books, and the messages all of it sets off.
// Pure (no three.js, no DOM), so the whole year can be played in node (tests/career.test.mjs).
// Everything is kept in life.flags.year (engine/year.js): year.work = { through, days, story, road }.
//
// For the other systems:
//   careerEvent(L, type, data)   something elsewhere that the office hears of (see below)
//   todaysWork(L)                where he is due today, if anywhere
//   rollover(L)                  call when the clock has reached a new day: closes the days gone by
//                                (absences), pays salary and rent (year.settle), the start-up's month
//   dayLabel / shortDate / passLine   the date, for screens and for the fade between days
import { post, thread, stamp, nudge, relation, receive, pay, balance } from '../engine/life.js';
import { isYear, year, DATES, FINAL_DAY, dateOf, actOf, isWorkday, gapText, settle, career, standing, setTrack, rep, setHome, fact, hurt } from '../engine/year.js';
import { feel, meet } from '../engine/hearts.js';
import { FIRM_SCENES, FIRM, NEWCO, WORKS, CLIENT, CAREER_NAMES } from './careerScenes.js';
import { ROADS, STARTUP_NAMES, STARTUP_PRODUCTS } from './careerRoads.js';
import { visible, award } from './skillChoices.js';

const B = (zh, en) => ({ zh, en });
const D = (day, h, m = 0) => day * 1440 + h * 60 + m;
const DAY_MS = 86400000, utc = ([y, mo, d]) => Date.UTC(y, mo - 1, d);
export { FIRM, NEWCO, WORKS, CLIENT, CAREER_NAMES, STARTUP_NAMES, STARTUP_PRODUCTS, FIRM_SCENES, ROADS };

// ---- English for every message this module sends (world/agendaEn.js looks here) ----
export const EN_CAREER = {};
const m = (zh, en) => { EN_CAREER[zh] = en; return zh; };
export const careerEn = (text) => EN_CAREER[text] || null;

// ---- state ----
export function work(L) { const Y = year(L); if (!Y) return null; return (Y.work ||= { through: Math.min(L.clock.day, Y.career.paidThrough || 1), days: {}, story: {}, road: null, absent: 0, applied: null, watch: {} }); }
export const story = (L) => (work(L) || { story: {} }).story;
const LIMBO = ['resigned', 'laidoff'];
export const inLimbo = (L) => isYear(L) && LIMBO.includes(career(L).track) && !!work(L).applied;
export const severance = (L) => Math.round(career(L).salary * 3.5 / 1000) * 1000;
export function canStay(L) { const S = story(L), st = career(L).standing; return S.memo === 'sign' || (!!S.review && st >= 40) || st >= 62; }
export const rating = (L) => { const st = career(L).standing; return st >= 68 ? 3 : st >= 45 ? 2 : 1; };
// the start-up's books
export const startup = (L) => (isYear(L) ? career(L).startup : null);
export const burn = (L) => { const s = startup(L); return s ? 18000 + (s.pay || 0) : 0; };
export const runway = (L) => { const s = startup(L), b = burn(L); return s && b ? Math.max(0, Math.floor(s.cash / b)) : 99; };
export const viable = (L) => { const s = startup(L); return !!s && !!s.customer && s.cash > 0 && !s.broke; };
const helpers = (L) => ({
  rel: (id) => relation(L, id).affinity, rep: () => rep(L, 'work'), canStay: () => canStay(L), severance: () => severance(L), rating: () => rating(L),
  su: () => { const s = startup(L) || {}; return { nameZh: s.nameZh || '你的公司', nameEn: s.name || 'Your company', cash: s.cash || 0, customer: s.customer || null }; },
  burn: () => burn(L), runway: () => runway(L), viable: () => viable(L),
});

// ---- the calendar on screen ----
const WK_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'], WK_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// "11 月 10 日 周二" / "Tue 10 Nov" (the year too, once it isn't the one the game began in)
export function shortDate(L, lang = 'zh', day = L.clock.day) {
  if (!isYear(L)) return lang === 'zh' ? `第 ${day} 天` : `Day ${day}`;
  const t = dateOf(L, day), yr = t.y !== 2026;
  return lang === 'zh' ? `${yr ? `${t.y} 年 ` : ''}${t.m} 月 ${t.d} 日 ${WK_ZH[t.w]}` : `${WK_EN[t.w]} ${t.d} ${MON_EN[t.m - 1]}${yr ? ` ${t.y}` : ''}`;
}
export const dayLabel = shortDate;
// a day named inside a sentence: "第 5 天" / "day 5" in a six-day game, "11 月 13 日（周五）" / "Friday 13 November" in a year
export function dayName(L, day) {
  if (!isYear(L)) return B(`第${['零', '一', '二', '三', '四', '五', '六', '七'][day] || day}天`, `day ${day}`);
  const t = dateOf(L, day), W = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return B(`${t.m} 月 ${t.d} 日（${WK_ZH[t.w]}）`, `${W[t.w]} ${t.d} ${M[t.m - 1]}`);
}
export function elapsed(L, fromDay, toDay) {
  if (!isYear(L)) return toDay - fromDay;
  const d = (n) => { const t = dateOf(L, n); return Date.UTC(t.y, t.m - 1, t.d); };
  return Math.round((d(toDay) - d(fromDay)) / DAY_MS);
}
// what the fade says when sleep (or a wait) carries him to absolute minute `to`: '' when it's just the next morning
export function passLine(L, to, lang = 'zh') {
  const toDay = Math.floor(to / 1440); if (!isYear(L) || toDay <= L.clock.day) return '';
  const days = elapsed(L, L.clock.day, toDay); if (days <= 1) return '';
  return `${gapText(days, lang)} · ${shortDate(L, lang, toDay)}`;
}

// ---- where he is due today ----
// -> { def (the scene), where: 'firm' | 'f32' | 'card', via: the DiDi / metro destination, done } or null
export function todaysWork(L, day = L.clock.day) {
  const Y = year(L); if (!Y || day < 2 || day >= FINAL_DAY || !isWorkday(L, day)) return null;
  const W = work(L), rec = W.days[day] || {};
  if (day <= 12) {
    if (W.applied && !rec.scene) return null;
    const def = FIRM_SCENES.find((s) => s.day === day);
    return def ? { def, where: 'firm', via: 'lujiazui', done: !!rec.scene } : null;
  }
  const t = Y.career.track, road = ROADS[t]; if (!road) return null;
  const n = W.road && W.road.track === t ? W.road.n : 0;
  const def = rec.scene ? road.find((s) => s.id === rec.scene) : road[n];
  if (!def) return null;
  return { def, where: t === 'consulting' ? 'firm' : t === 'startup' ? 'f32' : 'card', via: t === 'family' ? 'hongqiao' : 'lujiazui', done: !!rec.scene };
}
export const WORK_HOURS = { from: 7 * 60 + 30, late: 10 * 60 + 15, last: 17 * 60 + 30, out: 18 * 60 + 30 };
// he walks in. -> today's work with { late, tooLate }, or null when he isn't due anywhere
export function arriveAtWork(L) {
  const t = todaysWork(L); if (!t) return null;
  const W = work(L), rec = (W.days[L.clock.day] ||= {}), min = L.clock.minute, employed = t.where !== 'f32';
  if (!rec.came) {
    rec.came = stamp(L);
    if (min > WORK_HOURS.late && employed) { rec.late = true; standing(L, -2); fact(L, 'work', { what: 'late', scene: t.def.id }); }
    const hz = hurt(L);
    if (hz && employed) { rec.hurt = hz.level; standing(L, -hz.level); rep(L, 'work', -hz.level); fact(L, 'work', { what: 'came-in-hurt', level: hz.level }); }
  }
  return { ...t, late: !!rec.late, hurt: rec.hurt || 0, tooLate: !t.done && min >= WORK_HOURS.last };
}

// ---- playing a scene ----
const HOOKS = {
  d2: { enter: (L) => { meet(L, 'zhiwei'); } },
  d12: { done: (L) => applyDecision(L) },
  s1: { done: (L) => { const s = startup(L), put = Math.min(300000, balance(L, 'bank')); if (s && !s.funded && put > 0) { const r = pay(L, { method: 'bank', amount: put, to: s.nameZh || '公司账户', memo: '实缴注册资本', kind: 'invest' }); if (r.ok) { r.entry.memoEn = 'Paid-in capital'; s.cash += put; s.funded = put; } } } },
  s2: { done: (L) => { const s = startup(L); if (s && s.customer === 'arm' && !s.deposit) { s.deposit = 30000; s.cash += 30000; s.owed = 50000; } } },
  s4: { enter: (L) => { const s = startup(L); if (!s || s.closed) return; s.closed = true;
    if (s.customer === 'works') { s.cash += 100000; s.contract = 200000; } else if (s.customer === 'arm') { s.cash += s.owed || 0; s.owed = 0; s.royalty = true; } else if (s.customer === 'donglan') { s.cash += 150000; s.owed = 150000; } } },
  c4: { done: (L) => { const c = career(L), S = story(L), g = rating(L), months = g === 3 ? 4 : g === 2 ? 2 : 1, amt = months * c.salary; if (S.bonus) return;
    const e = receive(L, { method: 'bank', amount: amt, from: FIRM.zh, memo: '年终奖' }); e.memoEn = 'Year-end bonus'; S.bonus = amt; S.rating = g; if (g === 3) c.title = 'manager'; fact(L, 'career', { what: 'bonus', months, rating: g }); } },
  n4: { done: (L) => { const S = story(L), c = career(L); if (S.bonus) return; const e = receive(L, { method: 'bank', amount: c.salary * 2, from: NEWCO.zh, memo: '年终奖' }); e.memoEn = 'Year-end bonus'; S.bonus = c.salary * 2; } },
};
export function applyAnswer(L, def, a) {
  const S = story(L);
  if (a.s) standing(L, a.s);
  if (a.r) rep(L, 'work', a.r);
  if (a.zw || a.za) feel(L, 'zhiwei', { trust: a.zw || 0, attraction: a.za || 0 }, `work:${def.id}`);
  for (const [id, n] of Object.entries(a.rel || {})) nudge(L, id, n, `work:${def.id}`);
  if (a.k) { if (Array.isArray(a.k)) S[a.k[0]] = a.k[1]; else S[a.k] = true; }
  if (a.cash) { if (a.cash > 0) receive(L, { method: 'bank', amount: a.cash, from: FIRM.zh, memo: def.title.zh }); else pay(L, { method: 'bank', amount: -a.cash, to: FIRM.zh, memo: def.title.zh }); }
  if (a.su) applyStartup(L, a.su);
  if (a.sk) award(L, a.sk, `work:${def.id}`);
  if (a.fx) a.fx(L, S);
  fact(L, 'said', { scene: def.id, title: def.title.en, en: a.en.length > 150 ? `${a.en.slice(0, 147)}...` : a.en, s: a.s || 0 }, def.cast || []);
}
function applyStartup(L, su) {
  const s = startup(L); if (!s) return;
  if (su.name) { const n = STARTUP_NAMES[su.name]; s.key = su.name; s.name = n.en; s.nameZh = n.zh; }
  if (su.product) s.product = su.product;
  if (su.customer) { s.customer = su.customer; s.owed = su.owed || 0; s.slow = !!su.slow; }
  if (su.hire) { s.hire = su.hire; s.pay = su.pay || 0; }
  if (su.invest) { s.cash += su.invest; s.investor = su.investor; }
  if (su.bootstrap) s.investor = 'none';
}
// one part of a scene as ui/sceneTalk.js plays it: the answers do their work when they're chosen
export function partScript(L, def, i) {
  const beats = (def.parts[i] ? def.parts[i](L, story(L), helpers(L)) : null) || [];
  return beats.map((b) => (Array.isArray(b) ? b : { ask: visible(L, b.ask).map((a) => { let done = false; return { zh: a.zh, en: a.en, get then() { if (!done) { done = true; applyAnswer(L, def, a); } return a.then || []; } }; }) }));
}
export function enterScene(L, def) { const W = work(L), rec = (W.days[L.clock.day] ||= {}); if (!rec.came) rec.came = stamp(L); if (!rec.entered) { rec.entered = def.id; const h = HOOKS[def.id]; if (h && h.enter) h.enter(L, story(L)); } return def.parts.length; }
export function finishScene(L, def) {
  const W = work(L), rec = (W.days[L.clock.day] ||= {}); if (rec.scene) return false;
  rec.scene = def.id;
  if (L.clock.day > 12) { const t = career(L).track; W.road = { track: t, n: (W.road && W.road.track === t ? W.road.n : 0) + 1 }; }
  const h = HOOKS[def.id]; if (h && h.done) h.done(L, story(L));
  fact(L, 'work', { what: 'day', scene: def.id, title: def.title.en }, def.cast || []);
  return true;
}
// he stays at his desk to the end of the day -> the minute to skip to
export function workFull(L) {
  const W = work(L), rec = (W.days[L.clock.day] ||= {});
  if (!rec.full) { rec.full = true; if (career(L).track !== 'startup' || L.clock.day <= 12) standing(L, 1); }
  return Math.max(stamp(L) + 20, D(L.clock.day, 18, 30));
}
// the whole of a scene in node: picks are the answers' indices, in order (default: the first)
export function playScene(L, def, picks = []) {
  const said = []; picks = picks.slice();
  const n = enterScene(L, def);
  for (let i = 0; i < n; i++) for (const b of partScript(L, def, i)) {
    if (Array.isArray(b)) { said.push(b); continue; }
    const a = b.ask[Math.min(b.ask.length - 1, picks.length ? picks.shift() : 0)]; said.push([null, a.zh, a.en]); said.push(...a.then);
  }
  finishScene(L, def);
  return said;
}
// every line a scene can show in the state the game is in now (for checks): [who, zh, en]
export function sceneLines(L, def) {
  const out = [];
  for (const p of def.parts) for (const b of p(L, story(L), helpers(L)) || []) {
    if (Array.isArray(b)) out.push(b); else for (const a0 of b.ask) for (const a of [a0, a0.else].filter(Boolean)) { out.push([null, a.zh, a.en]); out.push(...(a.then || [])); }
  }
  return out;
}

// ---- Act III: what he decided, made real ----
export function applyDecision(L) {
  const W = work(L), S = W.story, c = career(L); if (W.applied || !S.decided) return null;
  W.applied = Math.min(L.clock.day, 12);
  S.taoke = S.gavePlace ? 'stays' : S.memo === 'sign' ? 'blamed' : 'laidoff';
  if (S.decided === 'consulting') setTrack(L, 'consulting', S.memo === 'sign' ? { title: 'senior consultant', salary: 48000 } : {});
  else if (S.decided === 'switched') setTrack(L, 'switched', { employer: NEWCO.en, title: 'AI product lead', salary: 52000 });
  else if (S.decided === 'resigned') setTrack(L, 'resigned', { salary: 0, title: null });
  else {
    const sev = S.noShow ? Math.round(c.salary * 2) : severance(L);
    const e = receive(L, { method: 'bank', amount: sev, from: FIRM.zh, memo: '离职补偿' }); e.memoEn = 'Severance'; S.severance = sev;
    setTrack(L, 'laidoff', { salary: 0, title: null });
  }
  return c.track;
}
export function beginStartup(L) {
  if (!inLimbo(L)) return false;
  setTrack(L, 'startup', { salary: 0, title: 'founder', employer: null, startup: { name: null, nameZh: null, key: null, product: null, cash: 0, customer: null, owed: 0, hire: null, pay: 0, investor: null, since: L.clock.day } });
  work(L).road = { track: 'startup', n: 0 }; return true;
}
export function beginFamily(L) {
  if (!inLimbo(L)) return false;
  setTrack(L, 'family', { salary: 30000, title: 'head of digital', employer: WORKS.en, startup: null });
  nudge(L, 'dad', 4, 'came-home-to-look'); work(L).road = { track: 'family', n: 0 }; return true;
}

// ---- somewhere to live ----
export const LISTINGS = {
  tilanqiao: { rent: 6200, where: 'Tilanqiao, Hongkou', zh: '虹口 · 提篮桥 · 老公房一室户', en: 'Tilanqiao, Hongkou · a one-room flat in an old walk-up', size: 38, floor: 3 },
  northbund: { rent: 12800, where: 'the North Bund', zh: '虹口 · 北外滩 · 高层一室一厅', en: 'The North Bund · a one-bedroom in a tower, river view', size: 56, floor: 22 },
  dianchi: { rent: 19500, where: 'Dianchi Road, behind the Bund', zh: '黄浦 · 滇池路 · 服务式公寓', en: 'Dianchi Road, behind the Bund · a serviced apartment', size: 62, floor: 9 },
};
export const home = (L) => (isYear(L) ? year(L).home : { kind: 'hotel', rent: 0 });
export const hasFlat = (L) => home(L).kind === 'flat';
// deposit of one month, the first month, half a month to the agent
export function rentFlat(L, id) {
  const F = LISTINGS[id]; if (!F || !isYear(L) || hasFlat(L)) return { ok: false, reason: 'no' };
  const upfront = Math.round(F.rent * 2.5), r = pay(L, { method: 'bank', amount: upfront, to: '房东 / 中介', memo: `押一付一 + 中介费 · ${F.zh}`, kind: 'rent' });
  if (!r.ok) return r;
  r.entry.memoEn = `Deposit, first month and agent's fee · ${F.en}`;
  setHome(L, 'flat', F.rent, F.where); const H = year(L).home; H.id = id; H.deposit = F.rent;
  return { ok: true, upfront, flat: F };
}

// ---- what elsewhere does to his name at work ----
//   'fight-seen'   { by?: colleague id, where? }   a colleague or a client saw him in a fight
//   'hurt'         { level 1-3 }                   he turned up visibly hurt (arriveAtWork does this by itself)
//   'online'       { delta, why }                  his name went round online, for better or worse
//   'praise'       { delta, why, from? }           someone the firm listens to spoke well of him
//   'absent'       { }                             he missed something he was due at
// -> { standing, rep } after it. Recorded in the ledger of facts; a message follows where one would.
export function careerEvent(L, type, data = {}) {
  if (!isYear(L)) return null;
  const c = career(L), employed = ['consulting', 'switched', 'family'].includes(c.track) || (L.clock.day <= 12 && !work(L).applied);
  if (type === 'fight-seen') { if (employed) { standing(L, -6); ensureThread(L, 'hr'); post(L, 'hr', { from: 'hr', kind: 'text', text: TX.hrFight }); } rep(L, 'work', -4); fact(L, 'work', { what: 'fight-seen', by: data.by || null, where: data.where || null }, data.by ? [data.by] : []); }
  else if (type === 'hurt') { const lv = Math.max(1, Math.min(3, data.level || 1)); if (employed) standing(L, -lv); rep(L, 'work', -lv); fact(L, 'work', { what: 'came-in-hurt', level: lv }); }
  else if (type === 'online') { const d = Math.max(-10, Math.min(10, data.delta || 0)); if (employed) standing(L, Math.round(d / 2)); rep(L, 'work', d); fact(L, 'work', { what: 'online', delta: d, why: data.why || '' }); }
  else if (type === 'praise') { const d = Math.max(0, Math.min(8, data.delta || 3)); if (employed) standing(L, d); rep(L, 'work', Math.ceil(d / 2)); fact(L, 'work', { what: 'praise', why: data.why || '' }, data.from ? [data.from] : []); }
  else if (type === 'absent') { if (employed) standing(L, -4); fact(L, 'work', { what: 'absent', why: data.why || '' }); }
  else return null;
  return { standing: c.standing, rep: rep(L, 'work') };
}

// ---- a new day: close the ones gone by, then the money ----
const EMPLOYER_ZH = { firm: FIRM.zh, [NEWCO.en]: NEWCO.zh, [WORKS.en]: WORKS.zh };
const monthsBetween = (a, b) => Math.max(0, Math.round((utc(DATES[Math.min(FINAL_DAY, b)]) - utc(DATES[Math.max(1, Math.min(FINAL_DAY, a))])) / DAY_MS / 30));
function closeDay(L, d, out) {
  const Y = year(L), W = work(L), S = W.story, rec = W.days[d] || {};
  if (d < 2 || d >= FINAL_DAY || !isWorkday(L, d)) return;
  if (d <= 12) {
    const def = FIRM_SCENES.find((s) => s.day === d); if (!def || (W.applied && W.applied < d)) return;
    if (!rec.scene) {
      def.absent && def.absent(L, S, helpers(L));
      if (!rec.came) { standing(L, d === 8 ? -12 : -8); rep(L, 'work', -3); feel(L, 'zhiwei', { trust: -3 }, `absent:${def.id}`); W.absent++; out.absent.push(d); fact(L, 'work', { what: 'absent', scene: def.id, title: def.title.en }); }
      else standing(L, -2);
    }
    if (d === 12) applyDecision(L);
    return;
  }
  const t = Y.career.track;
  if (rec.came || !ROADS[t]) return;
  const n = W.road && W.road.track === t ? W.road.n : 0; if (n >= ROADS[t].length) return;
  if (t !== 'startup') { standing(L, -6); rep(L, 'work', -2); }
  W.absent++; out.absent.push(d); fact(L, 'work', { what: 'absent', track: t });
}
export function rollover(L) {
  const Y = year(L); if (!Y) return null;
  const W = work(L), to = L.clock.day; if (to <= W.through) return null;
  const from = W.through, out = { from, to, days: elapsed(L, from, to), gap: '', act: null, paid: [], absent: [], notes: [] };
  for (let d = from; d < to; d++) closeDay(L, d, out);
  const led0 = L.wallet.ledger.length, months = monthsBetween(Y.career.paidThrough, to);
  out.paid = settle(L);
  for (const e of L.wallet.ledger.slice(led0)) if (EMPLOYER_ZH[e.to]) e.to = EMPLOYER_ZH[e.to];
  // the start-up's month: what it spends, what it's owed
  const s = Y.career.startup;
  if (s && Y.career.track === 'startup' && months > 0 && s.funded) {   // (nothing to spend before the company exists)
    const cost = burn(L) * months; s.cash -= cost; out.paid.push({ type: 'burn', amount: cost });
    if (s.owed && !s.slow) { s.cash += s.owed; out.paid.push({ type: 'revenue', amount: s.owed }); s.owed = 0; }
    if (s.cash < 0) {
      const need = -s.cash, r = pay(L, { method: 'bank', amount: need, to: s.nameZh || '公司账户', memo: '垫付公司开支', kind: 'invest' });
      if (r.ok) { r.entry.memoEn = "Covering the company's costs"; s.cash = 0; s.topped = (s.topped || 0) + need; out.paid.push({ type: 'topup', amount: need }); } else { s.broke = true; s.cash = 0; }
    }
  }
  // the relocation allowance ran to 9 December; after that the hotel is his to pay
  if (to >= 7 && Y.home.kind === 'hotel' && !Y.home.rent) { Y.home.rent = 36000; out.notes.push('hotel'); ensureThread(L, 'hr'); post(L, 'hr', { from: 'hr', kind: 'text', text: TX.hrHotel }); }
  if (out.absent.length && (out.absent.some((d) => d <= 12))) { ensureThread(L, 'proj'); post(L, 'proj', { from: 'zhiwei', kind: 'text', text: out.absent.includes(8) ? TX.absentDemo : TX.absent }); }
  const a0 = actOf(L, Math.min(from, FINAL_DAY)), a1 = actOf(L, Math.min(to, FINAL_DAY));
  if (a0 && a1 && a0.n !== a1.n) out.act = a1;
  out.gap = B(gapText(out.days, 'zh'), gapText(out.days, 'en'));
  W.through = to;
  return out;
}

// ---- Mission One's pouch, remembered (main.js tells us when it is handed over) ----
// extra: { saw (he watched the man who left it walk off: engine/witness.js), string ('wound' |
// 'rewound' | 'unwound': what the string looked like when Lin got it) }
export function recordHandoff(L, outcome, extra = {}) {
  if (L.flags.handoff || !['sealed', 'opened'].includes(outcome)) return L.flags.handoff || null;
  L.flags.handoff = { outcome, at: stamp(L), day: L.clock.day, saw: !!extra.saw, string: extra.string || 'wound' };
  if (isYear(L)) { rep(L, 'street', outcome === 'sealed' ? 3 : -2); fact(L, 'handoff', { outcome, saw: !!extra.saw }, ['lin']); }
  return L.flags.handoff;
}
export const handoff = (L) => L.flags.handoff || null;
// his daughter is at the stall from January to April (world/yearWorld.js puts her there)
export const zhouMinHere = (L) => isYear(L) && !!handoff(L) && L.clock.day >= 7 && L.clock.day <= 12 && !work(L).watch.met && L.clock.minute >= 8 * 60 && L.clock.minute < 20 * 60 + 30;
export function zhouMinScript(L) {
  const W = work(L).watch, opened = handoff(L).outcome === 'opened', saw = !!handoff(L).saw;
  // what he saw on Hankou Road: the man walking off from the counter with a red 申礼 carrier
  // (world/nephew.js). It is her cousin; she knows at once. It is not proof of the forgery (only the
  // date is), but it is enough for the police to stop the transfer: the stall is held, not saved.
  const SAW = { zh: '放袋子的人我看见了：一个三十来岁的男人，从柜台边走开，过了马路，手里拎着个红纸袋，上面印着“申礼”。', en: 'And I saw the man who left it: thirty-odd, walking off from the counter and across the road, carrying a red paper bag printed "Shenli".' };
  const COUSIN = ['zhoumin', '申礼……我堂哥就在申礼，管开新店。上个月他还问我爸，这个摊位卖不卖。', "Shenli... My cousin works for Shenli, opening their new shops. Only last month he was asking my father whether he'd sell this pitch."];
  const told = (how, street) => () => { W.met = stamp(L); W.told = how; if (street) rep(L, 'street', street); fact(L, 'watch', { what: 'met-daughter', told: how }, ['zhoumin']); };
  const wire = (a) => { let done = false; return { zh: a.zh, en: a.en, get then() { if (!done) { done = true; a.fx(); } return a.then; } }; };
  return [
    ['zhoumin', '你好……你认识这个摊子的老板吗？我是他女儿。我爸十月底就联系不上了。派出所立了案，可这边有人说，摊子已经“转让”了。', 'Excuse me... do you know the man who keeps this stall? I\'m his daughter. Nobody has been able to reach my father since the end of October. The police have opened a file, but people here tell me the stall has been "transferred".'],
    { ask: (opened ? [
      { zh: `十一月，我替江边的老林从这个摊子取过一个文件袋。我拆开看了：一份摊位转让协议，签的是你父亲的名字，日期是十月三十一号。受让人那一栏是空的。${saw ? SAW.zh : ''}`, en: `In November I fetched a pouch from this stall for Old Lin, down by the river. I opened it. It was an agreement to transfer the stall, signed in your father's name and dated the thirty-first of October. The line for the new holder was blank.${saw ? ` ${SAW.en}` : ''}`, fx: told('date', 4),
        then: [['zhoumin', '三十一号……那不是他签的。他二十九号晚上坐车去昆山我姑妈家，人没到。', "The thirty-first... then he didn't sign it. On the evening of the twenty-ninth he took the coach to my aunt's in Kunshan, and he never arrived."], ...(saw ? [COUSIN] : []), ['zhoumin', '你愿意把这些写下来，签个名字吗？我拿去派出所。', 'Would you write that down and sign it? I\'ll take it to the police station.'], [null, '（你在她的本子上写了半页，签了名，留了电话。）', '(You write half a page in her notebook, sign it, and leave your number.)']] },
      { zh: '我帮人从这儿取过一个袋子。别的不清楚。', en: "I collected a pouch from here for someone. I don't know more than that.", fx: told('little', 0),
        then: [['zhoumin', '……好。谢谢。要是想起什么，这是我的电话。', "...All right. Thank you. If anything comes back to you, here's my number."]] },
    ] : [
      ...(saw ? [{ zh: `十一月，我替江边的老林从这个摊子取过一个文件袋，封着的，我没拆。${SAW.zh.replace('放袋子的人我看见了', '但放袋子的人我看见了')}`, en: `In November I fetched a pouch from this stall for Old Lin, down by the river. It was sealed; I didn't open it. ${SAW.en.replace('And I saw', 'But I saw')}`, fx: told('saw', 3),
        then: [COUSIN, ['zhoumin', '“家属托付”……他也算家属。我爸不会托他的。', '"From the family"... He is family, I suppose. My father would never have asked him.'], ['zhoumin', '你愿意把看见的写下来，签个名字吗？我拿去派出所。', "Would you write down what you saw and sign it? I'll take it to the police station."], [null, '（你在她的本子上写了半页：时间，那个人，那个红纸袋。签了名，留了电话。）', '(You write half a page in her notebook: the time, the man, the red carrier. You sign it and leave your number.)']] }] : []),
      { zh: '十一月，我替江边的老林从这个摊子取过一个文件袋。封着的，标签上写：“家属托付，交林先生”。我没有拆。', en: 'In November I fetched a pouch from this stall for Old Lin, down by the river. It was sealed. The label said: "From the family, for Mr Lin." I didn\'t open it.', fx: told('sealed', 2),
        then: [['zhoumin', '家属？我就是家属。我没托过任何人。……袋子里是什么？', "The family? I am the family. I asked nobody to do anything. ...What was in it?"], [null, '（你不知道。封条交出去的时候是完好的。）', "(You don't know. The seal was whole when you handed it over.)"], ['zhoumin', '老林在哪儿？', 'Where is this Old Lin?'], [null, '（你指了指江边栏杆的方向。）', '(You point toward the river railing.)']] },
      { zh: '我帮人从这儿取过一个袋子。别的不清楚。', en: "I collected a pouch from here for someone. I don't know more than that.", fx: told('little', 0),
        then: [['zhoumin', '……好。谢谢。', '...All right. Thank you.']] },
    ]).map(wire) },
  ];
}
// how it came out, once the year has got there: 'saved' only if he read the date and told her;
// 'held' if he kept the seal but saw who left the pouch and told her that; otherwise 'lost'
export function watchResult(L) { const h = handoff(L); if (!h || !isYear(L)) return null; const W = work(L).watch; return W.result || null; }

// ---- messages (each once; kept in life.fired like world/agenda.js's) ----
const THREADS = {
  proj: { title: m('东澜项目组', 'Donglan project team'), members: ['me', 'zhiwei', 'taoke', 'shaofeng'], kind: 'group' },
  hr: { title: m('迈芬 HR', 'Marlowe Finch HR'), members: ['me', 'hr'], kind: 'service' },
  agent: { title: m('中介小吴', 'Wu, the letting agent'), members: ['me', 'agent'], kind: 'person' },
  gu: { title: m('顾磊', 'Gu Lei'), members: ['me', 'gu'], kind: 'person' },
  taoke: { title: m('陶可', 'Tao Ke'), members: ['me', 'taoke'], kind: 'person' },
  zhoumin: { title: m('周敏', 'Zhou Min'), members: ['me', 'zhoumin'], kind: 'person' },
  mum: { title: '妈', members: ['me', 'mum'], kind: 'person' },
};
function ensureThread(L, id) { const t = THREADS[id]; if (t && !L.threads[id]) thread(L, id, t); }
const TX = {
  absent: m('今天怎么没来？客户那边我替你顶了。下不为例。', "Where were you today? I covered for you with the client. Not again."),
  absentDemo: m('演示你没来。出事了。明天早上到我这儿来。', "You weren't at the demonstration. It went wrong. Come and see me first thing tomorrow."),
  hrHotel: m('提醒：入职安置住宿已于 12 月 9 日到期。和平饭店的长住价是 ¥36,000/月，之后将按月从你的银行卡扣除。如已另行租房，请到前台办理退房。', 'A reminder: your relocation accommodation ended on 9 December. The Peace Hotel\'s long-stay rate is ¥36,000 a month and will be charged to your bank card monthly from now on. If you have rented elsewhere, please check out at the front desk.'),
  hrFight: m('有同事反映在公司以外的场合看到你与人发生冲突。请注意，员工的个人行为同样代表公司形象。此事已记录。', 'A colleague has reported seeing you in an altercation outside the office. Please remember that an employee\'s personal conduct also reflects on the firm. This has been noted on file.'),
  rented: m('押金和首月房租收到了。地址和门锁密码发您了，今晚就能住。滴滴里搜“我的住处”。', 'Deposit and first month received. I\'ve sent you the address and the door code. You can sleep there tonight. In DiDi, look for "My flat".'),
  rentShort: m('纪先生，银行卡余额不够押一付一。您看看再联系我。', "Mr Ji, your bank balance doesn't cover the deposit and first month. Have a look and get back to me."),
};
const LIST_TEXT = m('纪先生您好，我是做北外滩和黄浦这一片的中介小吴，程小姐把您推给我的。听说您还住在饭店？我手上有三套，拎包入住：\n① 提篮桥 老公房一室户 38㎡ 三楼 ¥6,200/月\n② 北外滩 高层一室一厅 56㎡ 22 楼 江景 ¥12,800/月\n③ 滇池路 服务式公寓 62㎡ 9 楼 ¥19,500/月，走到外滩五分钟\n押一付一，中介费半个月。',
  "Hello Mr Ji, this is Wu. I'm a letting agent for the North Bund and Huangpu, and Ms Cheng passed me your contact. I hear you're still living in a hotel? I have three flats, ready to move into:\n① Tilanqiao, a one-room flat in an old walk-up, 38 m², third floor, ¥6,200 a month\n② The North Bund, a one-bedroom in a tower, 56 m², 22nd floor, river view, ¥12,800 a month\n③ Dianchi Road, a serviced apartment, 62 m², ninth floor, ¥19,500 a month, five minutes' walk from the Bund\nOne month's deposit, one month in advance, half a month's fee to me.");
const LIST_AGAIN = m('纪先生，年后房源少了，那三套还都在，价格没动。饭店那边现在要您自己付了吧？\n① 提篮桥 ¥6,200 ② 北外滩 ¥12,800 ③ 滇池路 ¥19,500', "Mr Ji, there's less on the market after the New Year, but those three are all still free and the prices haven't moved. The hotel is on your own bill now, I imagine?\n① Tilanqiao ¥6,200 ② North Bund ¥12,800 ③ Dianchi Road ¥19,500");
const LIST_REPLIES = [
  { text: m('①，提篮桥那套。', '① The Tilanqiao one.'), flag: 'rentTilanqiao', follow: m('好的。老房子，楼梯陡，但是安静。合同今晚发您。', "Very good. An old building, steep stairs, but quiet. I'll send the contract tonight.") },
  { text: m('②，北外滩，要江景。', '② The North Bund. I want the river.'), flag: 'rentNorthbund', follow: m('好眼光，二十二楼，外滩和陆家嘴都看得见。合同今晚发您。', "A good eye. Twenty-second floor: you can see the Bund and Lujiazui both. I'll send the contract tonight.") },
  { text: m('③，滇池路。离上班近。', '③ Dianchi Road. Close to work.'), flag: 'rentDianchi', follow: m('好的，这套带保洁。合同今晚发您。', "Very good. That one comes with cleaning. I'll send the contract tonight.") },
  { text: m('先不租，再住一阵饭店。', "Not yet. I'll stay in the hotel a while longer."), follow: m('好的纪先生，想看房随时找我。', 'Of course, Mr Ji. Whenever you want to view, just say.') },
];
const RENT_FLAGS = { rentTilanqiao: 'tilanqiao', rentNorthbund: 'northbund', rentDianchi: 'dianchi' };
const trackIs = (L, ...t) => t.includes(career(L).track);
const at = (L, abs) => stamp(L) >= abs;
const since0 = (L) => stamp(L) - (L.flags.t0 ?? stamp(L));
// the first evening's work messages: in room 612 (the firm booked it), or from 19:30 if he hasn't gone up yet; then mins later
const firstEvening = (L, mins) => L.clock.day >= 2 || stamp(L) >= Math.min(L.flags.room612 ? (L.flags.room612At ?? stamp(L)) : Infinity, D(1, 19, 30)) + mins;
const BEATS = [
  // ---- Act I ----
  { id: 'c-hr1', when: (L) => firstEvening(L, 0), thread: 'hr', from: 'hr', text: m('纪白你好，欢迎加入迈芬。明天（周二）上午九点半到国金中心二期 28 层报到，找项目负责人许知微。地铁 2 号线，南京东路到陆家嘴，一站。公司为你在和平饭店订了三十晚，到 12 月 9 日；之后的住宿需要自理，建议尽早看房。', "Hello Ji Bai, and welcome to Marlowe Finch. Please report tomorrow (Tuesday) at 9:30 am to the 28th floor of IFC Tower 2 and ask for your engagement lead, Xu Zhiwei. It is one stop on Line 2, East Nanjing Road to Lujiazui. The firm has booked you thirty nights at the Peace Hotel, to 9 December. After that, accommodation is your own to arrange; we suggest you start looking soon.") },
  { id: 'c-proj1', when: (L) => firstEvening(L, 6), thread: 'proj', from: 'zhiwei', text: m('纪白，明天九点半。东澜的资料在共享盘，今晚不用看，先倒时差。', "Ji Bai: nine thirty tomorrow. The Donglan material is on the shared drive. Don't read it tonight. Sleep off the flight first.") },
  { id: 'c-wuhu-d2', when: (L) => at(L, D(2, 19, 30)) && L.clock.day === 2, thread: 'wuhu', from: 'xuan', text: m('白白今天第一天上班，就在我楼下四层。中午想找他吃饭，说在开会。', "Baibai's first day at work, and he's four floors below me. I tried to take him to lunch. In a meeting, apparently."), run: (L) => post(L, 'wuhu', { from: 'momo', kind: 'text', text: m('社畜白白。', 'Baibai the wage slave.') }) },
  { id: 'c-agent1', when: (L) => at(L, D(3, 16, 30)) && !hasFlat(L), thread: 'agent', from: 'agent', text: LIST_TEXT, replies: LIST_REPLIES },
  { id: 'c-agent2', when: (L) => L.clock.day >= 7 && at(L, D(7, 10, 0)) && !hasFlat(L) && !Object.keys(RENT_FLAGS).some((f) => L.flags[f]), thread: 'agent', from: 'agent', text: LIST_AGAIN, replies: LIST_REPLIES },
  { id: 'c-agent3', when: (L) => L.clock.day >= 13 && at(L, D(13, 10, 0)) && !hasFlat(L) && !Object.keys(RENT_FLAGS).some((f) => L.flags[f]), thread: 'agent', from: 'agent', text: m('纪先生，那三套还在。您在饭店已经住了七个月了。\n① 提篮桥 ¥6,200 ② 北外滩 ¥12,800 ③ 滇池路 ¥19,500', "Mr Ji, those three are still there. You've been in that hotel seven months now.\n① Tilanqiao ¥6,200 ② North Bund ¥12,800 ③ Dianchi Road ¥19,500"), replies: LIST_REPLIES },
  { id: 'c-yuan-flat', when: (L) => hasFlat(L) && stamp(L) >= (year(L).home.since || 0) * 1440 + 20 * 60, thread: 'yuan', from: 'yuan', text: m('听说你租房了？哪天我去看看。别又买一屋子灰色的家具。', "I hear you've rented a flat? I'll come and see it one day. Don't fill it with grey furniture again."), replies: [
    { text: m('来。帮我挑盏灯。', 'Come. Help me choose a lamp.'), delta: 2, flag: 'yuanLamp', follow: m('落地灯，暖光，放沙发边上。我明天让人送过去，算乔迁礼。', "A floor lamp, warm light, beside the sofa. I'll have one sent round tomorrow. Call it a housewarming present.") },
    { text: m('灰色怎么了。', "What's wrong with grey?"), delta: 0, follow: m('没怎么。跟你人一样。', 'Nothing. It suits you exactly.') },
  ] },
  // ---- Act II ----
  { id: 'c-wuhu-jan', when: (L) => at(L, D(7, 12, 30)), thread: 'wuhu', from: 'zhixia', text: m('新年第一场雪，天马封了。谁请我吃火锅。', 'First snow of the year and Tianma is shut. Somebody take me for hotpot.') },
  { id: 'c-mum-cny', when: (L) => at(L, D(8, 20, 30)), thread: 'mum', from: 'mum', kind: 'voice', text: m('白白，过年回不回来？你爸把你房间的空调修了，嘴上说是顺手。', "Baibai, are you coming home for New Year? Your father has had the air conditioning in your room mended. He says it was just while the man was there."), replies: [
    { text: m('回。二十九到。', "I'm coming. I'll be there on the twenty-ninth."), delta: 2, flag: 'cnyHome', follow: m('好，好。你爸嘴上不说，鱼已经订了。', "Good, good. He won't say so, but he has already ordered the fish.") },
    { text: m('项目走不开。初三回去待两天。', "I can't leave the project. I'll come on the third for two days."), delta: 0, flag: 'cnyShort', follow: m('……行。初三妈去车站接你。', "...All right. I'll meet you at the station on the third.") },
  ] },
  { id: 'c-cny-dad', when: (L) => !!L.flags.cnyHome, run: (L) => { nudge(L, 'dad', 3, 'home-for-new-year'); fact(L, 'family', { what: 'home-for-new-year' }, ['dad', 'mum']); } },
  { id: 'c-wuhu-feb', when: (L) => at(L, D(9, 13, 0)), thread: 'wuhu', from: 'momo', text: m('年后第一场演出，票卖了七成。谢谢各位（你们一个都没来）', 'First gig after the holiday and seventy per cent sold. Thank you all (not one of you came)') },
  { id: 'c-news-bad', when: (L) => at(L, D(10, 21, 0)) && story(L).review === false, thread: 'wuhu', from: 'momo', text: m('热搜上那个 AI 拒赔老太太的……不会是白白他们做的吧？？', "That thing that's trending, the AI that turned down the old lady's claim... that's not Baibai's lot, is it??"), run: (L) => post(L, 'wuhu', { from: 'xuan', kind: 'text', text: m('别乱说。@纪白 你还好吗', "Don't. @Ji Bai are you all right") }) },
  { id: 'c-news-good', when: (L) => at(L, D(10, 21, 0)) && story(L).review === true, thread: 'yuan', from: 'yuan', text: m('我妈住院的理赔这次四天就到账了，东澜的。客服说换了新系统。是你们做的那个？', "My mother's hospital claim came through in four days this time. Donglan. The helpline said there's a new system. Is that the one you built?"), replies: [
    { text: m('是。拒赔的那一半还是人在看。', 'It is. The rejections are still read by a person.'), delta: 2, follow: m('那就对了。', "Then it's as it should be.") },
    { text: m('嗯，运气好。', 'Mm. A bit of luck.'), delta: 0, follow: m('你就不能直接说“是我做的”。', 'You are incapable of simply saying "I made that".') },
  ] },
  // ---- Act III ----
  { id: 'c-gu-april', when: (L) => at(L, D(11, 19, 0)) && story(L).guOffer && !work(L).applied, thread: 'gu', from: 'gu', text: m('四月了。屿深的 offer 还在：AI 产品负责人，月薪五万二，期权另谈。周二给我个话。', "It's April. The Yushen offer stands: head of AI product, fifty-two thousand a month, options to be discussed. Give me a word on Tuesday.") },
  { id: 'c-dad-list', when: (L) => at(L, D(11, 20, 30)) && !work(L).applied, thread: 'dad', from: 'dad', text: m('听说你们公司在裁人。', "I hear your firm is letting people go."), replies: [
    { text: m('有这事。我还在想怎么办。', "It's true. I'm still thinking what to do."), delta: 1, follow: m('嗯。不行就回来。', "Mm. If it doesn't work out, come home.") },
    { text: m('没事，爸，轮不到我。', "It's fine, Dad. It won't get as far as me."), delta: 0, follow: m('嗯。', 'Mm.') },
  ] },
  { id: 'c-taoke-saved', when: (L) => story(L).taoke === 'stays' && at(L, D(12, 19, 0)), thread: 'taoke', from: 'taoke', text: m('HR 说我的名字从名单上拿掉了。他们不肯说为什么。……是你，对不对。', "HR say my name has come off the list. They won't tell me why. ...It was you. Wasn't it.") },
  { id: 'c-taoke-out', when: (L) => story(L).taoke === 'laidoff' && at(L, D(12, 19, 0)) && relation(L, 'taoke').affinity >= 50, thread: 'taoke', from: 'taoke', text: m('我今天办完手续了。谢谢你这半年教我的。', "I finished the paperwork today. Thank you for everything you taught me these six months.") },
  { id: 'c-shao-memo', when: (L) => story(L).memo === 'sign' && at(L, D(12, 19, 0)), thread: 'proj', from: 'shaofeng', text: m('听说备忘录你签了。聪明人。', 'I hear you signed the memorandum. Clever man.') },
  { id: 'c-xuan-startup', when: (L) => inLimbo(L) && at(L, D(12, 20, 0)), thread: 'xuan', from: 'xuan', text: m('听说你出来了。周学长 32 楼还有两张空桌子。你不是一直说企业 AI 都做歪了吗？自己做一个。我是认真的。', "I hear you're out. Zhou has two empty desks on the 32nd floor. Haven't you always said enterprise AI is being built all wrong? Build one yourself. I mean it."), replies: [
    { text: m('做。下个工作日我就去 32 楼。', "I'll do it. I'll be on the 32nd floor the next working day."), delta: 3, flag: 'goStartup', follow: m('好。执照我来办。到了先起名字。', "Good. I'll see to the licence. First job when you arrive: a name.") },
    { text: m('让我想几天。', 'Give me a few days.'), delta: 0, follow: m('行。桌子给你留着。', "Fine. The desks will keep.") },
  ] },
  { id: 'c-dad-family', when: (L) => inLimbo(L) && at(L, D(12, 21, 30)), thread: 'dad', from: 'dad', text: m('厂里新线的系统上了半年，一团糟。你回来看看。不是让你接班，是看看。', "The system on the new line has been in six months and it is a mess. Come home and look at it. I am not asking you to take over. Just to look."), replies: [
    { text: m('好。我回去看看。', "All right. I'll come and look."), delta: 4, flag: 'goFamily', follow: m('嗯。到了南京南，老秦接你。高铁从虹桥走。', 'Mm. Old Qin will meet you at Nanjing South. The trains go from Hongqiao.') },
    { text: m('爸，我想先在上海试试自己的事。', "Dad, I want to try something of my own in Shanghai first."), delta: -1, follow: m('……随你。', '...Suit yourself.') },
  ] },
  { id: 'c-go-startup', when: (L) => !!L.flags.goStartup && inLimbo(L), run: (L) => { beginStartup(L); } },
  { id: 'c-go-family', when: (L) => !!L.flags.goFamily && inLimbo(L), run: (L) => { beginFamily(L); } },
  { id: 'c-xuan-again', when: (L) => inLimbo(L) && L.clock.day >= 14 && at(L, D(14, 9, 0)) && !L.flags.goStartup, thread: 'xuan', from: 'xuan', text: m('桌子还空着。', 'The desks are still empty.'), replies: [
    { text: m('我来。', "I'm coming."), delta: 2, flag: 'goStartup', follow: m('早该来了。', 'About time.') },
    { text: m('再等等。', 'Not yet.'), delta: 0, follow: m('行。', 'Fine.') },
  ] },
  { id: 'c-gu-freelance', when: (L) => inLimbo(L) && L.clock.day >= 14 && at(L, D(14, 12, 0)), thread: 'gu', from: 'gu', text: m('有个小活：帮屿深评一下他们的排产模型，两周，三万。接吗？', "A small job, if you want it: an assessment of Yushen's scheduling model. Two weeks, thirty thousand. Will you take it?"), replies: [
    { text: m('接。', "I'll take it."), delta: 2, flag: 'freelance', follow: m('好。合同发你。', "Good. I'll send the contract.") },
    { text: m('先不接。', 'Not for now.'), delta: 0, follow: m('明白。', 'Understood.') },
  ] },
  { id: 'c-freelance-pay', when: (L) => !!L.flags.freelance, run: (L) => { const e = receive(L, { method: 'bank', amount: 30000, from: NEWCO.zh, memo: '咨询费' }); e.memoEn = 'Consulting fee'; rep(L, 'work', 2); fact(L, 'work', { what: 'freelance', for: NEWCO.en }); } },
  { id: 'c-gu-welcome', when: (L) => trackIs(L, 'switched') && at(L, D(12, 20, 0)), thread: 'gu', from: 'gu', text: m('欢迎。六月七号入职，世纪大道那栋楼，14 层。地铁还是陆家嘴站。', 'Welcome. You start on the seventh of June. The building on Century Avenue, 14th floor. Still Lujiazui station.') },
  { id: 'c-wuhu-out', when: (L) => inLimbo(L) && at(L, D(12, 22, 0)), thread: 'wuhu', from: 'momo', text: m('白白失业了？？来我直播间弹琴，打赏对半分', "Baibai's unemployed?? Come and play piano on my stream, we split the tips"), run: (L) => post(L, 'wuhu', { from: 'yuan', kind: 'text', text: m('@纪白 晚上出来吃饭。不许说“没事”。', '@Ji Bai dinner tonight. And you are not allowed to say "I\'m fine".') }) },
  // ---- Act IV ----
  { id: 'c-wuhu-jun', when: (L) => at(L, D(13, 18, 0)), thread: 'wuhu', from: 'yuan', text: m('梅雨。工地的图纸都发霉了。', 'Plum rains. The drawings on site have gone mouldy.') },
  { id: 'c-taoke-job', when: (L) => story(L).taoke === 'laidoff' && at(L, D(15, 12, 0)) && relation(L, 'taoke').affinity >= 50 && (startup(L) || {}).hire !== 'taoke', thread: 'taoke', from: 'taoke', text: m('我找到工作了，一家做医保审核的公司。面试官问我最大的教训是什么，我说：去重。', 'I\'ve found a job, with a company that audits medical-insurance claims. The interviewer asked what my biggest lesson was. I said: de-duplicate.') },
  { id: 'c-wuhu-sep', when: (L) => at(L, D(15, 19, 0)), thread: 'wuhu', from: 'yinuo', text: m('九月了，外滩的风终于不黏了。', "September. The wind on the Bund has finally stopped being sticky.") },
  { id: 'c-wuhu-oct', when: (L) => at(L, D(16, 13, 0)), thread: 'wuhu', from: 'xuan', text: m('十月了。@纪白 你爸是不是下个月来？', "October. @Ji Bai isn't your father coming next month?") },
  // ---- the watch-repairer ----
  { id: 'c-watch-saved', when: (L) => !!handoff(L) && work(L).watch.told === 'date' && at(L, D(13, 19, 0)), thread: 'zhoumin', from: 'zhoumin',
    text: m('我爸找到了。十月二十九号晚上，他在昆山的长途车站中风，身上没带证件，在医院当了五个月的“无名氏”。转让协议是我堂哥仿的签名，想把摊位卖给做纪念品的连锁店。派出所说，要不是有人记得协议上的日期比他失踪还晚两天，这案子立不住。摊子保住了。他说等能走路了，给你那块表换个新机芯，不收钱。',
      'My father has been found. On the evening of the twenty-ninth of October he had a stroke at the coach station in Kunshan with no papers on him, and for five months the hospital had him down as "name unknown". The transfer agreement was my cousin forging his signature, to sell the pitch to a souvenir chain. The police say that if somebody had not remembered the date on it was two days after he vanished, there would have been no case. The stall is saved. He says that when he can walk again he will put a new movement in that watch of yours, and not take a fen for it.'),
    run: (L) => { const W = work(L).watch; W.result = 'saved'; rep(L, 'street', 5); fact(L, 'watch', { what: 'stall-saved' }, ['zhoumin']); } },
  { id: 'c-watch-held', when: (L) => !!handoff(L) && work(L).watch.told === 'saw' && at(L, D(13, 19, 0)), thread: 'zhoumin', from: 'zhoumin',
    text: m('我爸找到了，在昆山的医院。十月二十九号晚上在长途车站中风，身上没证件，当了五个月的“无名氏”。人还在，会慢慢好。派出所照你写的去问了我堂哥：袋子是他放的，他认了；签字是不是他仿的，还在鉴定。申礼那边的转让被叫停了，摊位先冻结，等法院判。摊子还关着，可没有换主人。我爸说，等能走路了，要亲眼看看那张纸上写的是哪一天。',
      'My father has been found, in a hospital in Kunshan. He had a stroke at the coach station on the evening of the twenty-ninth of October, with no papers on him, and for five months he was "name unknown". He is alive and he will mend, slowly. The police went to my cousin with what you wrote: he admits he left the pouch; whether he forged the signature is still with the handwriting people. The transfer to Shenli has been stopped and the pitch frozen until the court decides. The stall is still shut, but it has not changed hands. My father says that when he can walk he wants to see with his own eyes what date is on that page.'),
    run: (L) => { const W = work(L).watch; W.result = 'held'; rep(L, 'street', 3); fact(L, 'watch', { what: 'stall-held' }, ['zhoumin']); } },
  { id: 'c-watch-lost', when: (L) => !!handoff(L) && ['sealed', 'little'].includes(work(L).watch.told) && at(L, D(13, 19, 0)), thread: 'zhoumin', from: 'zhoumin',
    text: m('我爸找到了，在昆山的医院。中风，当了五个月的“无名氏”。人还在，会慢慢好。摊子没保住：转让去年十一月就办完了。签字是我堂哥仿的，可街道说手续齐全，现在只能打官司。老林说，他也是被骗的。',
      'My father has been found, in a hospital in Kunshan. A stroke; five months as "name unknown". He is alive and he will mend, slowly. The stall is gone: the transfer went through last November. My cousin forged the signature, but the street office says the paperwork was in order, so now it is a matter for the courts. Old Lin says he was taken in as well.'),
    run: (L) => { const W = work(L).watch; W.result = 'lost'; fact(L, 'watch', { what: 'stall-lost' }, ['zhoumin']); } },
  { id: 'c-watch-unmet', when: (L) => !!handoff(L) && !work(L).watch.met && L.clock.day >= 13, run: (L) => { const W = work(L).watch; W.result = 'lost'; W.unmet = true; fact(L, 'watch', { what: 'stall-changed-hands' }); } },
];
export function runCareer(L) {
  if (!isYear(L)) return [];
  const fired = (L.fired ||= {}), out = []; work(L);
  for (const b of BEATS) {
    if (fired[b.id] || !b.when(L)) continue;
    fired[b.id] = stamp(L);
    if (b.thread) { ensureThread(L, b.thread); post(L, b.thread, { from: b.from, kind: b.kind || 'text', text: b.text, ...(b.replies ? { replies: b.replies } : {}) }); }
    b.run && b.run(L); out.push(b.id);
  }
  // a flat chosen on WeChat: the money goes, the keys come
  if (!hasFlat(L)) for (const [f, id] of Object.entries(RENT_FLAGS)) if (L.flags[f] && !L.flags[`${f}Done`]) {
    L.flags[`${f}Done`] = true; const r = rentFlat(L, id); ensureThread(L, 'agent');
    post(L, 'agent', { from: 'agent', kind: 'text', text: r.ok ? TX.rented : TX.rentShort }); out.push(r.ok ? 'rented' : 'rent-short');
    if (!r.ok) for (const k of Object.keys(RENT_FLAGS)) { delete L.flags[k]; delete L.flags[`${k}Done`]; }
    break;
  }
  return out;
}
// the story's own messages that only a year game sends (world/story.js posts them)
m('下个月十三号我到上海，嘉定有个供应商要见。', 'I am in Shanghai on the thirteenth of next month. A supplier in Jiading to see.');
m('十一月十三号，周六，晚上八点。和平饭店楼下那个爵士吧。我订了位。', 'Saturday the thirteenth of November, eight in the evening. The Jazz Bar downstairs at the Peace Hotel. I have booked a table.');
// every message text this module can send, for checks: [zh, en]
export const careerTexts = () => Object.entries(EN_CAREER);
