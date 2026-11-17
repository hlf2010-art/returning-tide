// Where Ji Bai's time goes (pure, node-tested: tests/allot.test.mjs). A year has only so many evenings;
// each one spent at the bench is one not spent with someone, or on someone who could fund him.
//   the ledger     hours by use (make, love, friends, business, rest, work) and by person, from the playable
//                  days (logTime) and from the seasons between the acts (applySeason)
//   energy         0..100. Long days drain it, rest and sleep bring it back; low energy lowers what
//                  everything yields; a season ended near empty is burnout (remembered: the dinner knows)
//   the season     when months pass between two playable days, he plans them: the evenings of the coming
//                  weeks split between making things, one person, friends and family, business, rest.
//                  previewSeason says what that will come to, before he commits; applySeason makes it so
//   the project    what his making comes to beyond the playable days: production-ready, a small batch,
//                  launched. A launch brings an offer, a promotion, followers: and the knock-offs, the
//                  colleague who reports him, the friend who wants a share (world/allotEvents.js)
//   network        the people who could back him, buy from him, vouch for him: built by business evenings
// Everything is in life.flags.allot, so it saves with the rest.
import { stamp, relation, nudge } from './life.js';
import { heart, feel, inLife, isSeeing, ROMANCE, NATURE } from './hearts.js';
import { gainSkill, skillLevel } from './skills.js';
import { studio, summary, hasProduct } from './studio.js';
import { isYear, career, standing } from './year.js';

export const USES = ['make', 'love', 'friends', 'business', 'rest'];
export const EVENING = 3;                                      // hours an evening holds
export const FRIENDS = ['xuan', 'yuan', 'momo', 'zhixia', 'yinuo', 'dad'];   // (world/cast.js FRIENDS, and Dad)
export const MILESTONES = [                                    // beyond the playable days' validated product
  { id: 'ready', hours: 60, product: 3, zh: '可量产的样机', en: 'A production-ready prototype' },
  { id: 'batch', hours: 120, hw: 3, list: 4, zh: '第一批小批量', en: 'A first small batch' },
  { id: 'launch', hours: 180, product: 4, network: 30, zh: '正式上市', en: 'Launched' },
];

export function allot(L) {
  return (L.flags.allot ||= { energy: 80, hours: { make: 0, love: 0, friends: 0, business: 0, rest: 0, work: 0 }, who: {}, seasons: [], made: 0, network: 10, milestones: {}, burnout: 0, declared: false, events: {} });
}
const clamp = (x, a = 0, b = 100) => Math.max(a, Math.min(b, x));
// what energy does to everything he makes or does: full at 60+, half at empty
export const yieldOf = (energy) => (energy >= 60 ? 1 : 0.5 + (energy / 60) * 0.5);

// ---- the playable days ----
// minutes of something (who: a person, for love and friends)
export function logTime(L, use, minutes, who = null) {
  const A = allot(L), h = minutes / 60;
  A.hours[use] = (A.hours[use] || 0) + h;
  if (who) { const w = (A.who[who] ||= { hours: 0, last: null }); w.hours += h; w.last = stamp(L); }
  if (use === 'make' || use === 'business' || use === 'work') A.energy = clamp(A.energy - h * 2.2);
  if (use === 'rest' || use === 'love' || use === 'friends') A.energy = clamp(A.energy + h * (use === 'rest' ? 6 : 2));
  if (use === 'make') A.made += h * yieldOf(A.energy);
  return A;
}
// a night's sleep: how many hours (a short one doesn't do it)
export function slept(L, hours = 8) { const A = allot(L); A.energy = clamp(A.energy + Math.max(0, hours - 3) * 6.5); return A.energy; }

// ---- the seasons ----
// the weeks between two playable days and the evenings they hold (less the nights the job takes)
export function seasonBudget(L, days) {
  const weeks = days / 7, track = isYear(L) ? career(L).track : 'consulting';
  const overtime = track === 'consulting' || track === 'switched' ? Math.round(weeks) : track === 'family' ? Math.round(weeks * 2) : 0;
  return { days, weeks: +weeks.toFixed(1), evenings: Math.max(0, days - overtime), overtime };
}
// the people a season can be for: those in his life (met, not over)
export const candidates = (L) => ROMANCE.filter((id) => inLife(L, id));
// what a plan would come to: { lines: [{ kind, id?, tone: 'good'|'bad'|'neutral', zh, en }], energy, made, milestone }
export function previewSeason(L, plan, days) {
  const A = allot(L), B = seasonBudget(L, days), n = (u) => Math.max(0, plan[u] || 0), weeks = Math.max(1, B.weeks), out = [];
  const energy = clamp(A.energy + weeklyEnergy(plan, B) * weeks);
  const made = A.made + n('make') * EVENING * yieldOf(Math.min(A.energy, energy));
  const ms = nextMilestone(L, { made, network: A.network + networkGain(n('business')) });
  // the person
  for (const id of candidates(L)) {
    const h = heart(L, id), mine = plan.lover === id ? n('love') : 0, per = mine / weeks, seeing = isSeeing(L, id), pat = (NATURE[id] || {}).patience || 3;
    if (mine) out.push({ kind: 'love', id, tone: per >= 1 ? 'good' : 'neutral', zh: per >= 1 ? '每周都见：关系会往前走' : `${Math.round(weeks / Math.max(1, mine))} 周见一次：慢慢来`, en: per >= 1 ? 'Every week: it moves forward' : `Once every ${Math.round(weeks / Math.max(1, mine))} weeks: slowly` });
    else if (seeing) out.push({ kind: 'love', id, tone: 'bad', zh: weeks > pat * 2 ? `${Math.round(weeks)} 周不见：她可能会走` : `${Math.round(weeks)} 周不见：她会觉得被冷落`, en: weeks > pat * 2 ? `${Math.round(weeks)} weeks without seeing her: she may leave` : `${Math.round(weeks)} weeks without seeing her: she'll feel neglected` });
    else if (h.stage === 'close') out.push({ kind: 'love', id, tone: 'neutral', zh: '不见：会慢慢淡下去', en: 'Not seeing her: it will fade' });
  }
  const f = n('friends');
  out.push(f >= weeks ? { kind: 'friends', tone: 'good', zh: `朋友和家人：每人见 ${Math.max(1, Math.round(f / FRIENDS.length))} 次左右`, en: `Friends and family: about ${Math.max(1, Math.round(f / FRIENDS.length))} times each` }
    : f ? { kind: 'friends', tone: 'neutral', zh: '朋友和家人：偶尔见见，有人会觉得你变了', en: 'Friends and family: now and then; someone will say you have changed' }
      : { kind: 'friends', tone: 'bad', zh: `${Math.round(weeks)} 周没见朋友，也没给爸打电话`, en: `${Math.round(weeks)} weeks without seeing a friend, or calling Dad` });
  const nb = n('business');
  out.push(nb ? { kind: 'business', tone: nb >= weeks ? 'good' : 'neutral', zh: `人脉 ${Math.round(A.network)} → ${Math.round(A.network + networkGain(nb))}：投资人、客户、同行${nb >= weeks ? '会记得你' : '知道有你这个人'}`, en: `Network ${Math.round(A.network)} → ${Math.round(A.network + networkGain(nb))}: investors, clients, peers ${nb >= weeks ? 'will remember you' : 'know you exist'}` }
    : { kind: 'business', tone: 'bad', zh: '不见投资人和客户：机会会给别人', en: 'No investors, no clients: the chances go to someone else' });
  if (hasProduct(L) || n('make')) out.push(ms ? { kind: 'make', tone: 'good', zh: `做东西：能做到“${ms.zh}”`, en: `Making: you'll get to "${ms.en}"` } : { kind: 'make', tone: n('make') ? 'neutral' : 'bad', zh: n('make') ? `做东西：${Math.round(made)} 小时，离下一步还差一些` : '这段时间不做东西', en: n('make') ? `Making: ${Math.round(made)} hours, not yet the next step` : 'No making this season' });
  out.push({ kind: 'energy', tone: energy < 20 ? 'bad' : energy < 45 ? 'neutral' : 'good', zh: energy < 20 ? `精力 ${Math.round(energy)}：会透支` : energy < 45 ? `精力 ${Math.round(energy)}：累，做什么都打折扣` : `精力 ${Math.round(energy)}`, en: energy < 20 ? `Energy ${Math.round(energy)}: you'll burn out` : energy < 45 ? `Energy ${Math.round(energy)}: tired; everything yields less` : `Energy ${Math.round(energy)}` });
  return { lines: out, energy, made, milestone: ms, budget: B };
}
// what a week of a plan does to his energy: rest restores it, company a little, the bench, business and
// overtime take it (per week, so a plan that's sustainable for a month is sustainable for four)
export function weeklyEnergy(plan, B) {
  const w = Math.max(1, B.weeks), pw = (u) => Math.max(0, plan[u] || 0) / w;
  return 4 + 8 * pw('rest') + 2 * (pw('love') + pw('friends')) - 3 * (pw('make') + pw('business')) - 3 * (B.overtime / w);
}
export const networkGain = (evenings) => Math.round(18 * (1 - Math.exp(-evenings / 10)));
// the next milestone a state would reach (null if none new)
export function nextMilestone(L, { made = allot(L).made, network = allot(L).network } = {}) {
  const A = allot(L), validated = hasProduct(L) && summary(L).grade >= 3;
  if (!validated) return null;
  for (const m of MILESTONES) {
    if (A.milestones[m.id]) continue;
    if (made < m.hours) return null;
    if (m.product && skillLevel(L, 'product') < m.product) return null;
    if (m.hw && skillLevel(L, 'hw') < m.hw) return null;
    if (m.list && studio(L).list.length < m.list) return null;
    if (m.network && network < m.network) return null;
    return m;
  }
  return null;
}
// plan: { make, love, friends, business, rest (evenings), love: who? (as plan.lover) } -> what happened
export function applySeason(L, plan, days) {
  const A = allot(L), B = seasonBudget(L, days), n = (u) => Math.max(0, plan[u] || 0);
  const total = USES.reduce((s, u) => s + n(u), 0);
  if (total > B.evenings) return { ok: false, reason: 'over', budget: B };
  const p = previewSeason(L, plan, days), y = yieldOf(Math.min(A.energy, p.energy)), weeks = Math.max(1, B.weeks), events = [];
  // making: skills (the project decides the mix), and the project itself
  const mh = n('make') * EVENING * y;
  if (mh) {
    const ai = hasProduct(L) && studio(L).found.track ? 0.4 : 0.3;
    for (const [t, k] of [['hw', 0.6 - ai + 0.1], ['ai', ai], ['product', 0.2]]) { const r = gainSkill(L, t, Math.round(mh * 5 * k), 'season'); if (r.levelUp) events.push({ type: 'level', track: t, level: r.levelUp }); }
    A.made += mh;
  }
  // the one person (and everyone else he's seeing or close to, who wasn't chosen)
  for (const id of candidates(L)) {
    const mine = plan.lover === id ? n('love') : 0, seeing = isSeeing(L, id), pat = (NATURE[id] || {}).patience || 3;
    if (mine) { const k = Math.min(1, mine / weeks); feel(L, id, { attraction: Math.round(6 * k * y), trust: Math.round(8 * k) }, 'season-together'); events.push({ type: 'love', id, evenings: mine }); }
    else if (seeing) { feel(L, id, { attraction: -6, trust: -Math.round(4 + weeks) }, 'season-apart'); events.push({ type: 'apart', id, weeks, risk: weeks > pat * 2 }); }
    else if (heart(L, id).stage === 'close') feel(L, id, { attraction: -2, trust: -2 }, 'season-apart');
    if (mine) { const w = (A.who[id] ||= { hours: 0, last: null }); w.hours += mine * EVENING; w.last = stamp(L); }
  }
  // friends and family
  const f = n('friends'), each = f / FRIENDS.length;
  for (const id of FRIENDS) {
    const d = each <= 0 ? -(id === 'dad' ? 5 : 3) : each < weeks / 8 ? -1 : Math.min(6, Math.round(each * 2));   // (once in two months is barely keeping in touch)
    nudge(L, id, d, `season:${d > 0 ? 'together' : 'apart'}`);
    if (each) { const w = (A.who[id] ||= { hours: 0, last: null }); w.hours += each * EVENING; w.last = stamp(L); }
  }
  if (!f) events.push({ type: 'friends-apart', weeks });
  // business: the network, and the job notices client dinners
  const nb = n('business');
  A.network = clamp(A.network + networkGain(nb) - (nb ? 0 : 3));
  if (nb && isYear(L) && career(L).track === 'consulting') standing(L, Math.min(6, Math.round(nb / 3)), 'season-clients');
  // the ledger, energy, burnout
  for (const u of USES) A.hours[u] += n(u) * EVENING;
  A.hours.work += B.overtime * EVENING;
  A.energy = p.energy;
  if (A.energy < 20) { A.burnout += 1; events.push({ type: 'burnout', n: A.burnout }); A.energy = 35; }
  // the project's next step
  for (let ms = nextMilestone(L); ms; ms = nextMilestone(L)) { A.milestones[ms.id] = stamp(L); events.push({ type: 'milestone', id: ms.id }); }
  A.seasons.push({ at: stamp(L), days, plan: { ...plan }, energy: A.energy, events: events.map((e) => e.type) });
  return { ok: true, events, budget: B, preview: p };
}
// a profile of the year so far, for the journal and the endings: shares of the hours, the extremes
export function profile(L) {
  const A = allot(L), H = A.hours, sum = USES.reduce((s, u) => s + (H[u] || 0), 0) || 1;
  const share = Object.fromEntries(USES.map((u) => [u, (H[u] || 0) / sum]));
  const together = ROMANCE.some((id) => ['dating', 'together'].includes(heart(L, id).stage));
  const friendsWarm = FRIENDS.filter((id) => relation(L, id).affinity >= 55).length;
  return { share, hours: { ...H }, energy: A.energy, burnout: A.burnout, network: A.network, launched: !!A.milestones.launch, milestones: { ...A.milestones }, together, friendsWarm,
    alone: !!A.milestones.launch && !together && friendsWarm <= 1, everything: A.burnout >= 2 };
}
