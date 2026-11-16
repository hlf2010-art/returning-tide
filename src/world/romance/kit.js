// What the five people's own files (zhiwei.js, nanxing.js, gunian.js, yuan.js, kexin.js) are written
// with: bilingual text, messages, answers and their consequences. Pure (no three.js, no DOM).
//   t(zh, en)   a line that's stored in Chinese (a WeChat message, an invitation) and shown in
//               English through world/agendaEn.js: every one is registered here as it's written
//   B(zh, en)   a pair, for things shown in whichever language is on
//   [who, zh, en]            a spoken line in a scene ('nar' is the narrator: no name over it)
//   A(zh, en, fx, ...then)   an answer of his in a scene: what it does, what's said back
//   R(zh, en, fx, fzh, fen)  a reply chip on a message: what it does, what she writes back
//   fx: { a, t (attraction, trust), mem (a memory key), decide ('step' | 'commit' | 'slow' |
//         'friends' | 'end'), ev (a named consequence, see EVENTS) }; in a scene it may instead be
//         a function (L) => lines, for an answer whose outcome depends on how things stand
import { post, thread, invite, stamp } from '../../engine/life.js';
import { heart, hearts, feel, remember, recalls, decide, overture, isSeeing } from '../../engine/hearts.js';

export const EN_HEARTS = {};
export const t = (zh, en) => { EN_HEARTS[zh] = en; return zh; };
export const B = (zh, en) => ({ zh, en });
export const D = (day, h, m = 0) => day * 1440 + h * 60 + m;
export const tod = (L) => stamp(L) % 1440;
export const between = (L, from, to) => { const m = tod(L); return from <= to ? m >= from && m < to : m >= from || m < to; };
export const H = (h, m = 0) => h * 60 + m;

// a registry the people's files fill in (world/romance.js gathers them)
export const EVENTS = {};                 // name -> (L, who) => lines | void: consequences with more to them than two numbers
// the bookkeeping that isn't any one person's: which beats have fired, which scenes are done, what's new
export const meta = (L) => { const M = (hearts(L)._ ||= { day: L.clock.day }); M.fired ||= {}; M.done ||= {}; M.news ||= []; return M; };
export const fired = (L, id) => { const f = meta(L).fired[id]; return f == null || f < 0 ? null : f; };   // (-1: its moment passed unsaid)
export const done = (L, scene) => meta(L).done[scene] ?? null;
// something for the rest of the game to hear about (world/romance.js drains these: romanceEvent)
export const raise = (L, ev) => { (meta(L).raised ||= []).push(ev); };

// ---- when ----
export const memOf = (L, who, key) => heart(L, who).memories.find((m) => m.key === key) || null;
// so many minutes after something happened between them (null until it has)
export const after = (L, who, key, mins) => { const m = memOf(L, who, key); return m ? m.at + mins : null; };
// at h:m, `add` days after the day it happened
export const dayAfter = (L, who, key, h, m = 0, add = 1) => { const x = memOf(L, who, key); return x ? D(x.day + add, h, m) : null; };
export const afterBeat = (L, id, mins) => { const f = fired(L, id); return f == null ? null : f + mins; };
// tonight at h:m if there's still `lead` minutes' notice, otherwise tomorrow
export const tonightOr = (L, h, m = 0, lead = 45) => { const at = D(L.clock.day, h, m); return stamp(L) <= at - lead ? at : at + 1440; };
export const beatDay = (L, id, h, m = 0, add = 1) => { const f = fired(L, id); return f == null ? null : D(Math.floor(f / 1440) + add, h, m); };

// ---- consequences ----
export function applyFx(L, who, fx) {
  if (!fx) return null;
  if (typeof fx === 'function') return fx(L) || null;
  if (fx.a || fx.t) feel(L, who, { attraction: fx.a || 0, trust: fx.t || 0 }, fx.mem || fx.ev || 'said');
  if (fx.mem) remember(L, who, fx.mem);
  if (fx.decide) decide(L, who, fx.decide);
  if (fx.ev && EVENTS[fx.ev]) return EVENTS[fx.ev](L, who) || null;
  return null;
}
// ---- scenes ----
export const A = (zh, en, fx = null, ...then) => ({ zh, en, fx, then });
// (ui/sceneTalk.js calls run when he answers; what it returns, if anything, is said instead of `then`)
export const ask = (L, who, ...opts) => ({ ask: opts.filter(Boolean).map((o) => ({ zh: o.zh, en: o.en, then: o.then, run: () => applyFx(L, who, o.fx) })) });
// can the evening end upstairs? only where things already stand that way
export const mayStay = (L, who) => { const h = heart(L, who); return !h.rift && h.trust >= 50 && (isSeeing(L, who) || (!!(h.said || {}).step && h.attraction >= 55)); };

// "I live upstairs": an answer that ends the evening one way or the other (the cut-away is world/romanceScenes.js's)
export const upstairs = (who, yes, no) => (L) => { if (!mayStay(L, who)) return no; meta(L).night = who; return yes; };

// ---- messages ----
export function openThread(L, who, name) { return thread(L, who, { title: name, members: ['me', who], kind: 'person' }); }
export const R = (zh, en, fx = null, fzh = null, fen = null) => ({ text: t(zh, en), fx: fx || {}, ...(fzh ? { follow: t(fzh, fen) } : {}) });
// she writes. With replies it's something he can answer (and can leave unanswered: ttl minutes)
export function say(L, who, zh, en, replies = null, { ttl = 960 } = {}) {
  if (!L.threads[who]) openThread(L, who, who);
  const m = post(L, who, { from: who, kind: 'text', text: t(zh, en), ...(replies ? { replies, ttl } : {}) });
  if (replies) overture(L, who);
  return m;
}
// she asks him somewhere: def is one of her dates ({ title, place, text, yes, no: B pairs }); at: when
export function askOut(L, who, id, def, at, { by = 'her' } = {}) {
  if (!L.threads[who]) openThread(L, who, who);
  const inv = invite(L, { id: `h-${id}`, from: who, thread: who, title: t(def.title.zh, def.title.en), place: t(def.place.zh, def.place.en), at, deadline: at - 30,
    text: t(def.text.zh, def.text.en), yesText: t(def.yes.zh, def.yes.en), noText: t(def.no.zh, def.no.en), onAccept: 0, onDecline: 0, onMiss: 0, date: id, by });
  if (inv && by === 'her') overture(L, who);
  return inv;
}
export const invOf = (L, id) => L.invites.find((i) => i.id === `h-${id}`) || null;
// he said yes and it's the hour: she's there from twenty minutes before, and waits `wait` minutes
export const dateOn = (L, id, wait = 75) => { const i = invOf(L, id), now = stamp(L); return !!i && i.status === 'accepted' && !i.kept && !i.stood && now >= i.at - 20 && now <= i.at + wait; };
export { recalls };
