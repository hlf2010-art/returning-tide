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
  return (hearts(L)[id] ||= { stage: 'stranger', attraction: 20, trust: 20, met: null, memories: [], lastSeen: null, lastWrote: null, asked: 0, stoodUp: 0, mood: 'ok', over: null });
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
