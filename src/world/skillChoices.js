// What Ji Bai can say depends on what he can do (engine/skills.js): the shared rules for scripted
// answers that need a skill or teach one. Pure (node-tested: tests/skillScenes.test.mjs). Used by the
// scenes upstairs (world/destScripts.js) and the working year (world/career.js).
//   needs  { ai: 3, hw: 2 }   the answer is only offered if he has it (engine/skills.js meets)
//   else   { ...answer }      offered in its place when he hasn't (otherwise it is simply left out)
//   gain   { ai: 40, hw: 20 } experience it teaches (scenes upstairs); sk is the same at work
// An ask is shown with at most four answers (the keys are 1-4); the last is the silent one.
import { gainSkill, meets, TRACKS } from '../engine/skills.js';

export const MAX_ANSWERS = 4;
// the answers he can give, as he is now
export function visible(L, ask) {
  const out = [];
  for (const a of ask || []) {
    if (!a) continue;
    const ok = !a.needs || meets(L, a.needs).ok;
    if (ok) out.push(a); else if (a.else) out.push(a.else);
  }
  return out.length > MAX_ANSWERS ? [...out.slice(0, MAX_ANSWERS - 1), out[out.length - 1]] : out;
}
// experience in one or more tracks: -> [{ track, xp, levelUp }]
export function award(L, gains, why = '') {
  const out = [];
  for (const [t, n] of Object.entries(gains || {})) if (TRACKS[t] && n) out.push(gainSkill(L, t, n, why));
  return out;
}
// what a toast says about it: { zh, en } (hardware is still "Maker XP" on screen)
export function gainText(r) {
  const T = TRACKS[r.track], name = r.track === 'hw' ? { zh: '创客经验', en: 'Maker XP' } : { zh: `${T.zh}经验`, en: `${T.en} XP` };
  const up = r.levelUp ? { zh: ` · ${T.zh}升到 ${r.levelUp} 级`, en: ` · ${T.en} level ${r.levelUp}` } : { zh: '', en: '' };
  return { zh: `+${r.xp} ${name.zh}${up.zh}`, en: `+${r.xp} ${name.en}${up.en}` };
}
