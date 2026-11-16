// The year: Ji Bai has one year to establish a life of his own in Shanghai before the dinner with
// his father at the Peace Hotel. Pure (no three.js, no DOM), node-tested (tests/year.test.mjs).
// This is the life simulation's shared ground: every other system reads and writes through it.
//
//   calendar    a compressed year. The clock still counts playable days (life.clock.day) with their
//               real hours; each playable day stands on a real date, and between some of them weeks
//               pass (the night's sleep carries you across: "six weeks later"). 17 playable days:
//                 Act I   New Beginnings     days 1-6    November 2026
//                 Act II  Corporate Reality  days 7-10   January - March 2027
//                 Act III Turning Point      days 11-12  April 2027
//                 Act IV  Building a Life    days 13-16  June - October 2027
//                 Act V   The Final Dinner   day 17      Saturday 13 November 2027
//   career      who he works for, how they see him, what he's paid, which road he's on
//   reputation  at work, on the street (the police, the neighbourhood), online
//   health      injuries heal with days;   home   where he lives, what it costs
//   facts       the ledger of things that have really happened (validated game events). The
//               characters' free conversation is told these and may talk about them; it can never
//               add to them. Only game code calls fact().
// Everything lives in life.flags.year. A game begun before this existed has none: it keeps the old
// six-day arc (isYear(L) is false; finalDay(L) is 6), so those saves play on unchanged.
import { stamp, receive, pay } from './life.js';

export const FINAL_DAY = 17, LEGACY_FINAL_DAY = 6;
export const ACTS = [
  { n: 1, id: 'beginnings', from: 1, to: 6, zh: '第一幕 · 新的开始', en: 'Act I · New Beginnings' },
  { n: 2, id: 'corporate', from: 7, to: 10, zh: '第二幕 · 职场现实', en: 'Act II · Corporate Reality' },
  { n: 3, id: 'turning', from: 11, to: 12, zh: '第三幕 · 转折', en: 'Act III · Turning Point' },
  { n: 4, id: 'building', from: 13, to: 16, zh: '第四幕 · 立足', en: 'Act IV · Building a Life' },
  { n: 5, id: 'dinner', from: 17, to: 17, zh: '第五幕 · 最后的晚餐', en: 'Act V · The Final Dinner' },
];
// the date each playable day stands on: [year, month, day] (days 1-6 are one week in November)
export const DATES = {
  1: [2026, 11, 9], 2: [2026, 11, 10], 3: [2026, 11, 11], 4: [2026, 11, 12], 5: [2026, 11, 13], 6: [2026, 11, 14],
  7: [2027, 1, 11], 8: [2027, 1, 12], 9: [2027, 2, 23], 10: [2027, 3, 9],
  11: [2027, 4, 19], 12: [2027, 4, 20],
  13: [2027, 6, 7], 14: [2027, 7, 19], 15: [2027, 9, 6], 16: [2027, 10, 18],
  17: [2027, 11, 13],
};
const DAY_MS = 86400000, utc = ([y, m, d]) => Date.UTC(y, m - 1, d);
const WEEK_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'], WEEK_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const isYear = (L) => !!(L.flags && L.flags.year);
export const finalDay = (L) => (isYear(L) ? FINAL_DAY : LEGACY_FINAL_DAY);
// a new game: called once, when the life is created (main.js)
export function initYear(L) {
  if (L.flags.year) return L.flags.year;
  return (L.flags.year = { v: 1,
    career: { employer: 'firm', title: 'consultant', salary: 42000, standing: 50, track: 'consulting', startup: null, paidThrough: 1 },
    rep: { work: 50, street: 50, online: 50 },
    hurt: null,                                      // { level 1-3, what, day }
    home: { kind: 'hotel', rent: 0 },                // hotel (the Peace Hotel, on the firm's relocation allowance) | flat
    facts: [], seen: {} });
}
export const year = (L) => L.flags.year || null;

// ---- the calendar ----
export function dateOf(L, day = L.clock.day) {
  const known = DATES[Math.max(1, Math.min(isYear(L) ? FINAL_DAY : 6, day))], over = isYear(L) ? Math.max(0, day - FINAL_DAY) : Math.max(0, day - 6);
  const t = new Date(utc(known) + over * DAY_MS);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), w: t.getUTCDay() };
}
export function dateText(L, lang = 'zh', day = L.clock.day) {
  const t = dateOf(L, day);
  return lang === 'zh' ? `${t.y} 年 ${t.m} 月 ${t.d} 日 ${WEEK_ZH[t.w]}` : `${WEEK_EN[t.w]} ${t.d} ${MONTH_EN[t.m - 1]} ${t.y}`;
}
export const isWorkday = (L, day = L.clock.day) => { const w = dateOf(L, day).w; return w >= 1 && w <= 5; };
export const actOf = (L, day = L.clock.day) => (isYear(L) ? (ACTS.find((a) => day >= a.from && day <= a.to) || ACTS[ACTS.length - 1]) : null);
// how long passes in the night between this playable day and the next: days (1 = the next morning)
export function gapAfter(L, day = L.clock.day) {
  if (!isYear(L) || !DATES[day] || !DATES[day + 1]) return 1;
  return Math.round((utc(DATES[day + 1]) - utc(DATES[day])) / DAY_MS);
}
export function gapText(days, lang = 'zh') {
  if (days <= 1) return '';
  const w = Math.round(days / 7), mo = Math.round(days / 30);
  if (days < 12) return lang === 'zh' ? `${days} 天后` : `${days} days later`;
  if (days < 50) return lang === 'zh' ? `${w} 周后` : `${w} weeks later`;
  return lang === 'zh' ? `${mo} 个月后` : `${mo} months later`;
}

// ---- money that moves with the calendar: salary in, rent out, once per month that passes ----
// called when a new playable day begins (main.js, after sleep or a wait across midnight)
export function settle(L) {
  const Y = year(L); if (!Y) return [];
  const c = Y.career, out = [], day = Math.min(L.clock.day, FINAL_DAY);
  if (day <= c.paidThrough) return out;
  const months = Math.max(0, Math.round((utc(DATES[day]) - utc(DATES[Math.max(1, c.paidThrough)])) / DAY_MS / 30));
  c.paidThrough = day;
  for (let i = 0; i < months; i++) {
    if (c.salary > 0) { const e = receive(L, { method: 'bank', amount: c.salary, from: c.employer, memo: '工资' }); e.memoEn = 'Salary'; out.push({ type: 'salary', amount: c.salary }); }
    if (Y.home.rent > 0) { const r = pay(L, { method: 'bank', amount: Y.home.rent, to: '房东', memo: '房租', kind: 'rent' }); if (r.ok) { r.entry.memoEn = 'Rent'; out.push({ type: 'rent', amount: Y.home.rent }); } else out.push({ type: 'rent-short', amount: Y.home.rent }); }
  }
  if (Y.hurt && day - Y.hurt.day >= Y.hurt.level) Y.hurt = null;                       // a night per level, and it has healed
  return out;
}

// ---- career, reputation, health ----
const clamp = (v) => Math.max(0, Math.min(100, v));
export const career = (L) => (year(L) || { career: { employer: null, title: null, salary: 0, standing: 50, track: 'legacy', startup: null } }).career;
export function standing(L, delta, why = '') { const Y = year(L); if (!Y) return 50; Y.career.standing = clamp(Y.career.standing + delta); if (why) fact(L, 'work', { why, delta }); return Y.career.standing; }
export const TRACKS = ['consulting', 'resigned', 'laidoff', 'switched', 'startup', 'family'];
export function setTrack(L, track, patch = {}) { const Y = year(L); if (!Y || !TRACKS.includes(track)) return null; Object.assign(Y.career, patch, { track }); fact(L, 'career', { track }); return Y.career; }
// kind: 'work' | 'street' | 'online'
export function rep(L, kind, delta = 0, why = '') { const Y = year(L); if (!Y) return 50; if (delta) { Y.rep[kind] = clamp((Y.rep[kind] ?? 50) + delta); if (why) fact(L, 'rep', { kind, delta, why }); } return Y.rep[kind] ?? 50; }
export function injure(L, level, what = '') { const Y = year(L); if (!Y) return null; Y.hurt = { level: Math.max(1, Math.min(3, level)), what, day: L.clock.day }; fact(L, 'hurt', { level: Y.hurt.level, what }); return Y.hurt; }
export const hurt = (L) => (year(L) ? year(L).hurt : null);
export function setHome(L, kind, rent = 0, where = '') { const Y = year(L); if (!Y) return null; Y.home = { kind, rent, where, since: L.clock.day }; fact(L, 'home', { kind, where, rent }); return Y.home; }

// ---- the ledger of what has really happened ----
// type: a short word ('career', 'date', 'fight', 'work', ...); data: plain values; who: the people it involves
export function fact(L, type, data = {}, who = []) {
  const Y = year(L); if (!Y) return null;
  const f = { at: stamp(L), day: L.clock.day, type, who: [].concat(who), ...data };
  Y.facts.push(f); if (Y.facts.length > 240) Y.facts.shift();
  return f;
}
export const factsAbout = (L, who = null, type = null) => (year(L) ? year(L).facts.filter((f) => (!who || f.who.includes(who)) && (!type || f.type === type)) : []);
// once-only markers for scenes and beats (so nothing authored happens twice)
export function once(L, id) { const Y = year(L); if (!Y) return false; if (Y.seen[id]) return false; Y.seen[id] = stamp(L); return true; }
export const seen = (L, id) => !!(year(L) && year(L).seen[id]);
// a line for the model about where his life stands (world/story.js adds it to what characters know)
export function lifeContext(L) {
  const Y = year(L); if (!Y) return '';
  const c = Y.career, a = actOf(L), d = dateOf(L);
  const job = { consulting: `he works as a ${c.title} at an international technology consulting firm in Lujiazui`, resigned: 'he has resigned from the consulting firm', laidoff: 'he was laid off by the consulting firm', switched: `he now works at ${c.employer}`, startup: `he is building his own AI start-up${c.startup && c.startup.name ? ` (${c.startup.name})` : ''}`, family: "he has agreed to join his father's manufacturing business in Nanjing" }[c.track] || '';
  return `It is ${MONTH_EN[d.m - 1]} ${d.y} (${a ? a.en : ''}); ${job}; he lives ${Y.home.kind === 'hotel' ? 'at the Peace Hotel for now' : `in a rented flat${Y.home.where ? ` in ${Y.home.where}` : ''}`}${Y.hurt ? `; he is visibly hurt (${Y.hurt.what || 'bruised'})` : ''}.`;
}
