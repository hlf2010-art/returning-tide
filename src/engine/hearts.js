// The people Ji Bai might come to love: the relationship state. Pure (no three.js, no DOM).
// (Who they are, what they say and do is world/romance.js; the year they live in is engine/year.js.)
//   attraction   0..100, how drawn they are to him       trust   0..100, how far they rely on him
//   stage        stranger -> known -> close -> dating -> together; or 'over' (they left, or he did)
//   memories     what the two of them have actually done and said that mattered: only game code
//                adds to it (remember()); free conversation is told it and cannot change it
// Lives in life.flags.hearts, so it saves with the rest; absent in older saves until first used.
import { stamp } from './life.js';

export const ROMANCE = ['zhiwei', 'nanxing', 'gunian', 'yuan', 'kexin'];
export const STAGES = ['stranger', 'known', 'close', 'dating', 'together', 'over'];
const clamp = (v) => Math.max(0, Math.min(100, v));
export function hearts(L) { return (L.flags.hearts ||= {}); }
export function heart(L, id) {
  const h = (hearts(L)[id] ||= { stage: 'stranger', attraction: 20, trust: 20, met: null, memories: [], lastSeen: null, lastWrote: null, asked: 0, stoodUp: 0, mood: 'ok', over: null });
  if (!h.said) { h.events ||= {}; h.said = {}; h.unanswered ??= 0; h.declined ??= 0; h.quiet ??= null; h.day ??= null; h.doubt ??= 0; h.streak ??= 0; h.rift ??= null; }   // (the rules' fields: see below)
  return h;
}
export const stageOf = (L, id) => heart(L, id).stage;
export function meet(L, id) { const h = heart(L, id); if (h.met == null) { h.met = stamp(L); if (h.stage === 'stranger') h.stage = 'known'; } h.lastSeen = stamp(L); return h; }
// d: { attraction, trust } deltas; why: a short word for the record
export function feel(L, id, d = {}, why = '') {
  const h = heart(L, id); if (h.stage === 'over') return h;
  h.attraction = clamp(h.attraction + (d.attraction || 0)); h.trust = clamp(h.trust + (d.trust || 0));
  if (why) (h.log ||= []).push({ at: stamp(L), why, ...d }); if (h.log && h.log.length > 60) h.log.shift();
  return h;
}
// something that happened between them and stays: key is a short stable id ('first-coffee'), data plain values
export function remember(L, id, key, data = {}) { const h = heart(L, id); if (!h.memories.some((m) => m.key === key)) h.memories.push({ at: stamp(L), day: L.clock.day, key, ...data }); if (h.memories.length > 40) h.memories.shift(); return h; }
export const recalls = (L, id, key) => heart(L, id).memories.some((m) => m.key === key);
export function setStage(L, id, stage, why = '') { const h = heart(L, id); if (!STAGES.includes(stage)) return h; h.stage = stage; if (stage === 'over') h.over = { at: stamp(L), why }; return h; }
// who he is seeing (dating or together), if anyone
export const seeing = (L) => ROMANCE.filter((id) => ['dating', 'together'].includes(heart(L, id).stage));

// ================= the rules =================
// They have their own lives, and they don't wait. Everything below is bookkeeping over the same
// state (world/romance.js says the words and decides when; world/romanceScenes.js puts them in the
// street). Tested in tests/hearts.test.mjs.
//   initiative    she writes first when she's free, isn't hurt, hasn't given up asking, and hasn't
//                 just written (mayWrite). overture() counts what she sends; if it's always her,
//                 oneSided() says so
//   availability  from her own day (the slot world/romance.js reads off her schedule: busy, asleep,
//                 out of town) and her mood: hurt and unsure of him, she isn't free for him
//   ignoring      ignored(): a message left unanswered, an invitation left to lapse, a no, a
//                 no-show, a silence (days without a word while she's waiting on him; three times
//                 as long if nothing is owed either way). Each costs, and they add up: after
//                 NATURE.asks of them she stops asking (quiet). He can still reach out (contact with his: true). If he
//                 doesn't within NATURE.patience playable days, she's gone: 'faded' if they were
//                 only getting to know each other, 'left' if they were seeing each other.
//                 Two no-shows and she leaves there and then
//   two at once   seeing two people is noticed (dayTick: NATURE.sees days of it, or at once if it
//                 is found out some other way: foundOut). What she does is hers: leave, have it
//                 out and make him choose (rift: two days to answer), or shrug, never commit
//                 herself, and cool. Nobody becomes 'together' with a man who's seeing someone else
//   stages        only from things that really happened: shared() records an event (once per key,
//                 with its memory); decide() records what he said he wanted ('step', 'commit',
//                 'slow', 'friends', 'end'); advance() moves known -> close -> dating -> together
//                 when nextStage() finds nothing missing. Feelings alone move nothing
//   the days      dayTick(L): once per playable day, moods settle, silences are counted, doubts grow
// The compressed year means weeks pass between playable days; patience is counted in playable
// days, the ones he could have used.
export const NATURE = {
  zhiwei: { asks: 2, patience: 2, two: 'confront', sees: 2, gap: 90 },    // gap: minutes she leaves between her own messages
  nanxing: { asks: 3, patience: 3, two: 'open', sees: 3, gap: 60 },
  gunian: { asks: 2, patience: 3, two: 'leave', sees: 2, gap: 120 },
  yuan: { asks: 3, patience: 4, two: 'confront', sees: 3, gap: 120 },
  kexin: { asks: 2, patience: 2, two: 'public', sees: 1, gap: 45 },
};
export const COST = {
  message: { trust: -2, attraction: -2 }, invite: { trust: -4, attraction: -3 }, declined: { attraction: -1 },
  'stood-up': { trust: -12, attraction: -6 }, silence: { trust: -3, attraction: -4 },
};
export const NEEDS = {                                               // what each step takes
  close: { shared: 2, trust: 26 },
  dating: { dates: 1, attraction: 32, trust: 26, said: 'step' },
  together: { dates: 2, attraction: 45, trust: 50, said: 'commit' },
};
// time spent together is itself something: what each kind of shared event adds, once ([attraction, trust])
export const WARMTH = { talk: [2, 2], help: [2, 3], call: [2, 3], outing: [3, 3], date: [3, 3], night: [4, 4] };
const N = (id) => NATURE[id] || NATURE.gunian;
const full = heart;
const meta = (L) => (hearts(L)._ ||= { day: L.clock.day });
export const isOver = (L, id) => heart(L, id).stage === 'over';
export const inLife = (L, id) => !['stranger', 'over'].includes(heart(L, id).stage);
export const isSeeing = (L, id) => ['dating', 'together'].includes(heart(L, id).stage);
export const eventsOf = (L, id, kind = null) => { const e = full(L, id).events; return kind ? e[kind] || 0 : Object.values(e).reduce((s, n) => s + n, 0); };

// ---- who writes, who answers ----
// he was there, he answered, he wrote. his: it was him who reached out, not her
export function contact(L, id, { his = false } = {}) {
  const h = full(L, id); if (h.stage === 'over' || h.stage === 'stranger') return h;
  h.day = L.clock.day; h.lastSeen = stamp(L);
  if (his) {
    h.streak = 0;
    if (h.quiet != null) { h.quiet = null; h.unanswered = Math.max(0, N(id).asks - 1); if (h.mood === 'ok') h.mood = 'cool'; }   // she'll answer; one more silence and she stops again
  }
  return h;
}
// she wrote, she asked
export function overture(L, id) { const h = full(L, id); h.asked += 1; h.lastWrote = stamp(L); h.streak += 1; return h; }
// he answered what she sent / said yes to what she asked
export function answered(L, id) { const h = full(L, id); h.unanswered = 0; h.declined = 0; return contact(L, id); }
export const oneSided = (L, id) => full(L, id).streak >= 6 && ['dating', 'together'].includes(heart(L, id).stage);
// her own day and her mood -> can he reach her, see her?   slot: { free, away } from her schedule
export function availability(L, id, slot = {}) {
  const h = full(L, id);
  if (h.stage === 'over') return { free: false, why: 'over' };
  if (slot.away) return { free: false, why: 'away' };
  if (h.mood === 'hurt' && h.trust < 40) return { free: false, why: 'mood' };
  if (slot.free === false) return { free: false, why: 'busy' };
  return { free: true, why: null };
}
// will she write first, now?   urgent: something she has to say whatever the mood (a conflict, a goodbye)
export function mayWrite(L, id, slot = {}, { urgent = false } = {}) {
  const h = full(L, id);
  if (h.stage === 'over') return false;
  if (slot.away || slot.free === false) return false;                 // asleep, in a meeting, no signal: later
  if (!urgent && (h.quiet != null || h.mood === 'hurt' || h.rift)) return false;
  return stamp(L) - (h.lastWrote ?? -1e9) >= (urgent ? 5 : N(id).gap);
}
// what he gets if he asks to see her: 'gone' | 'away' | 'mood' | 'busy' | 'yes'
export function askResult(L, id, slot = {}) {
  const a = availability(L, id, slot);
  return a.free ? 'yes' : a.why === 'over' ? 'gone' : a.why;
}

// ---- what ignoring her costs ----
export function leave(L, id, why) { const h = full(L, id); if (h.stage === 'over') return { id, left: false }; const was = h.stage; setStage(L, id, 'over', why); h.over.was = was; h.rift = null; return { id, left: true, why, was }; }
// kind: 'message' | 'invite' | 'declined' | 'stood-up' | 'silence'   -> { id, kind, quiet?, left?, why? }
export function ignored(L, id, kind = 'message') {
  const h = full(L, id), out = { id, kind };
  if (h.stage === 'over' || h.stage === 'stranger') return out;
  feel(L, id, COST[kind] || COST.message, `ignored:${kind}`);
  if (kind === 'declined') { h.declined += 1; if (h.declined >= 3) h.unanswered = Math.max(h.unanswered, N(id).asks); }
  else if (kind === 'stood-up') { h.stoodUp += 1; h.unanswered += 1; h.mood = 'hurt'; if (h.stoodUp >= 2) return { ...out, ...leave(L, id, 'stood-up') }; }
  else { h.unanswered += 1; if (h.mood !== 'hurt') h.mood = 'cool'; }
  if (h.unanswered >= N(id).asks && h.quiet == null) { h.quiet = L.clock.day; out.quiet = true; }
  return out;
}
export const asksLeft = (L, id) => Math.max(0, N(id).asks - full(L, id).unanswered);

// ---- stages, from what really happened ----
// kind: 'talk' | 'help' | 'outing' | 'date' | 'night' | 'call'; key: the memory it leaves. Counted once per key
export function shared(L, id, kind, key, data = {}) {
  const h = full(L, id); if (h.stage === 'over') return h.stage;
  if (h.met == null) meet(L, id);
  if (!recalls(L, id, key)) { h.events[kind] = (h.events[kind] || 0) + 1; remember(L, id, key, { kind, ...data }); const w = WARMTH[kind] || WARMTH.talk; feel(L, id, { attraction: w[0], trust: w[1] }, `shared:${key}`); }
  contact(L, id);
  return advance(L, id);
}
export function nextStage(L, id) {
  const h = full(L, id), to = { known: 'close', close: 'dating', dating: 'together' }[h.stage];
  if (!to) return null;
  const need = NEEDS[to], missing = [], dates = (h.events.date || 0) + (h.events.night || 0);
  if (need.shared && eventsOf(L, id) < need.shared) missing.push('shared');
  if (need.dates && dates < need.dates) missing.push('dates');
  if (need.attraction && h.attraction < need.attraction) missing.push('attraction');
  if (need.trust && h.trust < need.trust) missing.push('trust');
  if (need.said && !h.said[need.said]) missing.push(need.said);
  if (to !== 'close' && h.rift) missing.push('rift');
  if (to !== 'close' && h.said.friends) missing.push('friends');
  if (to === 'together' && (seeing(L).some((x) => x !== id) || h.open)) missing.push('someone-else');
  return { to, missing };
}
export function advance(L, id) {
  for (let k = 0; k < 3; k++) { const n = nextStage(L, id); if (!n || n.missing.length) break; setStage(L, id, n.to, 'advance'); }
  return heart(L, id).stage;
}
// what he said he wanted: 'step' (more than friends), 'commit', 'slow' (not yet), 'friends', 'end'
export function decide(L, id, what) {
  const h = full(L, id); if (h.stage === 'over') return h.stage;
  if (what === 'end') { leave(L, id, 'ended'); return 'over'; }
  h.said[what] = stamp(L);
  if (what === 'step' || what === 'commit') delete h.said.friends;
  return advance(L, id);
}

// ---- two at once ----
// how: 'noticed' (it shows), 'online' (it was posted), 'told' (he said so), 'seen'
export function foundOut(L, id, how = 'noticed') {
  const h = full(L, id), out = { id, type: 'found-out', how };
  if (h.stage === 'over' || h.knows) return { ...out, does: null };
  h.knows = stamp(L);
  const nature = N(id).two, does = nature === 'public' ? (how === 'online' ? 'leave' : 'confront') : nature;
  if (does === 'leave') { feel(L, id, { trust: -30, attraction: -10 }, 'two'); return { ...out, does, ...leave(L, id, 'two-timed') }; }
  if (does === 'confront') { feel(L, id, { trust: how === 'told' ? -8 : -15, attraction: -4 }, 'two'); h.mood = 'hurt'; h.rift = { why: 'two', day: L.clock.day }; }
  else { feel(L, id, { trust: -6 }, 'two'); h.open = true; }
  return { ...out, does };
}
// the rift is answered: 'chose' (her, and only her: he has to have ended the others) or anything else
export function resolveRift(L, id, choice) {
  const h = full(L, id); if (!h.rift) return { id, ok: false };
  if (choice === 'chose' && !seeing(L).some((x) => x !== id)) { h.rift = null; h.knows = null; h.doubt = 0; feel(L, id, { trust: 4 }, 'chose'); return { id, ok: true }; }
  return { id, ok: false, ...leave(L, id, 'two-timed') };
}

// ---- the days ----
// once per playable day (safe to call every tick): -> what happened [{ id, type: 'silence' | 'quiet' | 'left' | 'found-out', ... }]
export function dayTick(L) {
  const M = meta(L), out = [];
  while (M.day < L.clock.day) { M.day += 1; out.push(...oneDay(L, M.day)); }
  return out;
}
function oneDay(L, day) {
  const out = [];
  for (const id of ROMANCE) {
    const h = full(L, id); if (h.stage === 'stranger' || h.stage === 'over') continue;
    const n = N(id), last = h.day ?? Math.floor((h.met ?? stamp(L)) / 1440);
    h.mood = { hurt: 'cool', cool: 'ok', warm: 'ok' }[h.mood] || 'ok';
    // she had it out with him and he hasn't answered
    if (h.rift && day - h.rift.day >= 2) { out.push({ type: 'left', ...leave(L, id, 'two-timed') }); continue; }
    // she's stopped asking, and he hasn't come
    if (h.quiet != null) { if (day - h.quiet >= n.patience) { out.push({ type: 'left', ...leave(L, id, isSeeing(L, id) ? 'left' : 'faded') }); continue; } }
    else {
      // a silence is his when she's waiting on him (something of hers went unanswered): every `patience` days of it
      // counts again. With nothing owed either way, it takes three times as long to start counting
      const gap = day - last, step = h.unanswered > 0 ? n.patience : n.patience * 3;
      if (gap >= step && gap % step === 0) { const r = ignored(L, id, 'silence'); out.push({ type: r.left ? 'left' : r.quiet ? 'quiet' : 'silence', ...r }); if (r.left) continue; }
    }
    // seeing someone else as well
    const s = seeing(L);
    if (s.length >= 2 && s.includes(id)) {
      if (!h.knows) { h.doubt += 1; if (h.doubt >= n.sees) out.push(foundOut(L, id, 'noticed')); }
      else if (h.open) feel(L, id, { attraction: -3 }, 'shared');
    }
  }
  return out;
}
// how it stands, for the screens
export function standingOf(L, id) {
  const h = full(L, id), n = nextStage(L, id);
  return { stage: h.stage, attraction: h.attraction, trust: h.trust, mood: h.mood, quiet: h.quiet != null, rift: !!h.rift, dates: (h.events.date || 0) + (h.events.night || 0), shared: eventsOf(L, id), over: h.over, missing: n ? n.missing : [] };
}
