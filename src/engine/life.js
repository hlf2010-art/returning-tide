// The protagonist's life outside the street: pure (no three.js / DOM), node-tested, saved as JSON.
//   clock      day + minute of the day. Runs at TIME_RATE game seconds per real second while you
//              play; the sky stays at blue hour (there is no day/night cycle yet), so the clock is
//              the phone's, not the world's
//   wallet     WeChat Pay, Alipay, the bank account (trust allowance) and a card, with a ledger.
//              Fictional money: nothing here touches a real payment service
//   threads    chats (people, the group, services), messages, unread counts
//   relations  how each friend feels about you (affinity) and their mood today
//   invites    things you've been asked to: accept / decline / let lapse, each with consequences
//   calendar   appointments with a time and a place
//   inventory  what you own
//   outbox     events for the world to act on (a parcel arrives, a car is delivered, a call rings)
// Story beats and reactions live in world/agenda.js; this module is the bookkeeping.
export const TIME_RATE = 4;                       // game seconds per real second
export const START = { day: 1, minute: 16 * 60 + 20 };   // 4:20 pm: the low sun on the Bund, the sunset (about 4:55), then the floodlights at 5:10

export function createLife(seed = {}) {
  return {
    v: 1,
    clock: { day: START.day, minute: START.minute, sec: 0 },
    wallet: {
      wechat: 6_800, alipay: 12_400, bank: 1_850_000,
      card: { limit: 3_000_000, used: 0 },
      ledger: [],
    },
    threads: {}, order: [],
    relations: {}, invites: [], calendar: [], inventory: [], flags: { idsV: 2 },   // (a new game needs no id migration: see load)
    notifications: [], outbox: [], fired: {},
    ...seed,
  };
}

// ---- time ----
export const minuteOf = (L) => L.clock.minute;
export const stamp = (L) => L.clock.day * 1440 + L.clock.minute;          // absolute minutes
export const clockText = (m) => `${String(Math.floor((m % 1440) / 60)).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;
export function advance(L, realSeconds) {
  L.clock.sec += realSeconds * TIME_RATE;
  while (L.clock.sec >= 60) { L.clock.sec -= 60; L.clock.minute += 1; if (L.clock.minute >= 1440) { L.clock.minute -= 1440; L.clock.day += 1; } }
  return L;
}
export function skipTo(L, absMinute) {          // sleep, a ride, waiting for an appointment
  const now = stamp(L); if (absMinute <= now) return L;
  L.clock.day = Math.floor(absMinute / 1440); L.clock.minute = absMinute % 1440; L.clock.sec = 0;
  return L;
}

// ---- money ----
export const METHODS = { wechat: '微信支付', alipay: '支付宝', bank: '银行转账', card: '信用卡' };
export function balance(L, method) {
  if (method === 'card') return L.wallet.card.limit - L.wallet.card.used;
  return L.wallet[method] ?? 0;
}
// pay: { method, amount (yuan), to, memo, kind } -> { ok, reason?, entry? }
export function pay(L, { method = 'wechat', amount, to, memo = '', kind = 'purchase' }) {
  if (!(amount > 0)) return { ok: false, reason: 'amount' };
  if (balance(L, method) < amount) return { ok: false, reason: 'insufficient' };
  if (method === 'card') L.wallet.card.used += amount; else L.wallet[method] -= amount;
  const entry = { at: stamp(L), method, amount: -amount, to, memo, kind };
  L.wallet.ledger.push(entry);
  return { ok: true, entry };
}
export function receive(L, { method = 'wechat', amount, from, memo = '' }) {
  if (method === 'card') L.wallet.card.used = Math.max(0, L.wallet.card.used - amount); else L.wallet[method] += amount;
  const entry = { at: stamp(L), method, amount, to: from, memo, kind: 'income' };
  L.wallet.ledger.push(entry); return entry;
}
export function topUp(L, method, amount) {     // bank -> WeChat Pay / Alipay balance
  if (L.wallet.bank < amount) return { ok: false, reason: 'insufficient' };
  L.wallet.bank -= amount; L.wallet[method] += amount;
  L.wallet.ledger.push({ at: stamp(L), method, amount, to: '银行卡', memo: '充值 top-up', kind: 'transfer' });
  return { ok: true };
}

// ---- chats ----
let msgSeq = 0;
export function thread(L, id, { title, members = [], kind = 'person' } = {}) {
  if (!L.threads[id]) { L.threads[id] = { id, title: title || id, members, kind, messages: [], unread: 0 }; L.order.unshift(id); }
  return L.threads[id];
}
// msg: { from ('me' or a person id), kind: 'text'|'voice'|'invite'|'redpacket'|'location'|'system'|'call', text, meta }
export function post(L, threadId, msg, { notify = true } = {}) {
  const t = thread(L, threadId);
  const m = { id: `m${Date.now().toString(36)}${(msgSeq++).toString(36)}`, at: stamp(L), read: msg.from === 'me', ...msg };
  t.messages.push(m);
  if (msg.from !== 'me') { t.unread += 1; if (notify) L.notifications.push({ at: m.at, thread: threadId, from: msg.from, text: preview(m) }); }
  L.order = [threadId, ...L.order.filter((x) => x !== threadId)];
  return m;
}
export function markRead(L, threadId) { const t = L.threads[threadId]; if (t) { t.unread = 0; t.messages.forEach((m) => { m.read = true; }); } }
export const unreadTotal = (L) => Object.values(L.threads).reduce((s, t) => s + t.unread, 0);
export function preview(m) {
  return { voice: `[语音] ${Math.max(2, Math.round((m.text || '').length / 4))}″`, invite: `[邀请] ${m.meta && m.meta.title}`, redpacket: '[红包] 恭喜发财', location: `[位置] ${m.meta && m.meta.name}`, call: '[通话]' }[m.kind] || m.text;
}

// ---- people ----
export function relation(L, id) { return L.relations[id] || (L.relations[id] = { affinity: 50, mood: 'ok', last: 0 }); }
export function nudge(L, id, delta, why = '') {
  const r = relation(L, id); r.affinity = Math.max(0, Math.min(100, r.affinity + delta)); r.last = stamp(L);
  (L.flags.history ||= []).push({ at: stamp(L), id, delta, why });
  return r.affinity;
}

// ---- invitations and appointments ----
// invite: { id, from, title, place, at (abs minute), deadline (abs minute), thread, onAccept: delta, onDecline: delta, onMiss: delta }
export function invite(L, spec) {
  if (L.invites.some((i) => i.id === spec.id)) return null;
  const inv = { status: 'pending', ...spec };
  L.invites.push(inv);
  post(L, spec.thread || spec.from, { from: spec.from, kind: 'invite', text: spec.text || spec.title, meta: { invite: spec.id, title: spec.title, place: spec.place, at: spec.at } });
  return inv;
}
export function answerInvite(L, id, yes) {
  const inv = L.invites.find((i) => i.id === id);
  if (!inv || inv.status !== 'pending') return null;
  inv.status = yes ? 'accepted' : 'declined';
  nudge(L, inv.from, yes ? (inv.onAccept ?? 4) : (inv.onDecline ?? -2), `${inv.id}:${inv.status}`);
  if (yes) L.calendar.push({ id: inv.id, title: inv.title, place: inv.place, at: inv.at, with: inv.from, status: 'planned' });
  post(L, inv.thread || inv.from, { from: 'me', kind: 'text', text: yes ? (inv.yesText || '好，到时候见。') : (inv.noText || '这次去不了，下次一定。') }, { notify: false });
  return inv;
}
// invitations nobody answered before their deadline lapse (a quiet cost)
export function lapse(L) {
  const now = stamp(L), out = [];
  for (const inv of L.invites) if (inv.status === 'pending' && now > inv.deadline) { inv.status = 'missed'; nudge(L, inv.from, inv.onMiss ?? -4, `${inv.id}:missed`); out.push(inv); }
  return out;
}

// ---- things you own ----
export function own(L, item) { const it = { at: stamp(L), ...item }; L.inventory.push(it); return it; }
export const owns = (L, kind) => L.inventory.filter((i) => i.kind === kind);

// ---- the world's to-do list ----
export function emit(L, ev) { L.outbox.push({ at: stamp(L), ...ev }); }
export function drain(L) { const o = L.outbox; L.outbox = []; return o; }

// ---- saving ----
export const save = (L) => JSON.stringify(L);
export function load(json) {
  try { const L = JSON.parse(json); return L && L.v === 1 ? migrateIds(L) : null; } catch { return null; }
}
// ids renamed since a save was made. Character Bible v2.2: 许若安 Ruoan and 林予安 Lin Yu'an are one person,
// id 'yuan'. Her two chats become one (by time), and every key or id naming 'ruoan' names 'yuan' (where
// both exist they are merged). What people wrote stays as it was written: history is not rewritten.
const RENAMED = { ruoan: 'yuan' };
function mergeInto(a, b) {   // b into a
  if (Array.isArray(a) && Array.isArray(b)) { const c = [...a, ...b]; return c.every((x) => typeof x === 'number') ? c.sort((x, y) => x - y) : c; }   // (stamps stay in time order)
  if (typeof a === 'number' && typeof b === 'number') return a + b;
  if (a && b && typeof a === 'object' && typeof b === 'object') { for (const k of Object.keys(b)) a[k] = k in a ? mergeInto(a[k], b[k]) : b[k]; return a; }
  return a ?? b;
}
export function migrateIds(L) {
  if (!L || (L.flags && L.flags.idsV >= 2)) return L;
  for (const [from, to] of Object.entries(RENAMED)) {
    const th = L.threads || {};
    if (th[from]) {
      const a = th[from], b = th[to];
      if (b) { a.messages = [...a.messages, ...b.messages].sort((x, y) => (x.at || 0) - (y.at || 0)); a.unread = (a.unread || 0) + (b.unread || 0); }
      th[to] = a; delete th[from];
    }
    if (L.relations && L.relations[from]) { L.relations[to] = L.relations[from]; delete L.relations[from]; }   // (her romance never used its own)
    const re = new RegExp(`(^|[^A-Za-z])${from}(?=$|[^a-z])`, 'g'), fix = (s) => s.replace(re, `$1${to}`);
    const walk = (o, key) => {
      if (typeof o === 'string') return ['text', 'title', 'memo', 'memoEn', 'zh', 'en'].includes(key) ? o : fix(o);
      if (Array.isArray(o)) return o.map((v) => walk(v, key));
      if (!o || typeof o !== 'object') return o;
      for (const k of Object.keys(o)) {
        const v = walk(o[k], k), nk = fix(k);
        if (nk !== k) { delete o[k]; o[nk] = nk in o ? mergeInto(o[nk], v) : v; } else o[k] = v;
      }
      return o;
    };
    walk(L, null);
    if (Array.isArray(L.order)) L.order = [...new Set(L.order)];
    for (const t of Object.values(L.threads || {})) if (t && t.title === '许若安') t.title = '林予安';
  }
  (L.flags ||= {}).idsV = 2;
  return L;
}
