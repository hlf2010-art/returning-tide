// Bumping into people, and what they do about it. Glue between engine/social.js (who bumped whom,
// how each one reacts), the people who react (crossing pedestrians in the traffic sim, Old Lin and
// Ms. Su), the HUD (a passing line of speech) and speech (Mandarin / English through the browser's
// voices when it is free; Shanghainese is subtitle-only, there is no browser voice for it).
import { detectBumps, react, SOCIAL } from '../engine/social.js';
import { pickBark } from './barks.js';

export const WHO = {
  auntie: { zh: '阿姨', en: 'Older woman' }, office: { zh: '路人', en: 'Passer-by' }, youngMan: { zh: '小伙子', en: 'Young man' },
  student: { zh: '学生', en: 'Student' }, elder: { zh: '老伯伯', en: 'Older man' }, visitor: { zh: '游客', en: 'Visitor' },
  lin: { zh: '老林', en: 'Old Lin' }, su: { zh: '苏女士', en: 'Ms. Su' },
};
const LANG = { zh: 'zh-CN', en: 'en-GB' };
const HEAR = 14;                       // m: further than this, you don't catch what was said

export function createBumps({ hud, audio, onPlayerBump = null, rnd = Math.random }) {
  const memo = new Map();              // pair -> last bump time
  const byPlayer = new Map();          // npc id -> times the player bumped them
  const log = [];                      // recent events, for tools / tests
  const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
  let lastBarkAt = -1e9;
  const lastSaid = new Map();          // npc id -> when they last said something about a bump
  const pitch = (id) => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return 0.93 + (h % 1000) / 1000 * 0.14; };

  // a word about a bump: only between you and someone (passers-by brushing past each other say nothing),
  // one at a time (3 s apart), and the same person not again for half a minute
  function say(t, actor, line, dist, other) {
    if (!line || other !== 'player') return;
    if (t - lastBarkAt < 3 || t - (lastSaid.get(actor.id) ?? -1e9) < 30) return;
    const b = pickBark(line, rnd);
    if (!b) return;
    log.push({ t, id: actor.id, persona: actor.persona, line, text: b.text, lang: b.lang });
    if (dist > HEAR) return;
    const who = WHO[actor.persona] || WHO.office;
    hud.bark({ speaker: who, text: { zh: b.zh, en: b.en }, gloss: b.gloss, lang: b.lang, toPlayer: other === 'player', who: `bump:${actor.persona}`, at: [actor.x, 1.6, actor.z], rate: pitch(actor.id) });
    lastBarkAt = t; lastSaid.set(actor.id, t);
  }

  // actors: [{ id, persona, x, z, vx, vz, r, apply(reaction, other) }], with the player as id 'player'
  function update(t, actors, listener) {
    const events = detectBumps(actors, t, memo).filter((e) => !(e.a.group && e.a.group === e.b.group));
    for (const e of events) {
      if (e.a.id !== 'player' && e.b.id !== 'player') {                 // two passers-by: no scene, maybe a glance
        if (rnd() < 0.3) { const me = e.other; me.apply && me.apply({ kind: 'look', line: null }, e.mover, t); }
        log.push({ t, id: e.a.id, kind: 'brush', with: e.b.id }); continue;
      }
      for (const [me, other] of [[e.a, e.b], [e.b, e.a]]) {
        if (me.id === 'player') continue;
        const fault = e.mover === me, isPlayer = other.id === 'player';
        let history = 0;
        if (isPlayer) {
          const times = (byPlayer.get(me.id) || []).filter((x) => t - x < SOCIAL.memory);
          history = times.length; times.push(t); byPlayer.set(me.id, times);
        }
        const r = react(me, { fault, hard: e.closing, byPlayer: isPlayer, history, busy: !!me.busy }, rnd);
        me.apply && me.apply(r, other, t);
        say(t, me, r.line, Math.hypot(me.x - listener.x, me.z - listener.z), isPlayer ? 'player' : other.id);
        log.push({ t, id: me.id, kind: r.kind, fault, hard: +e.closing.toFixed(2), with: other.id, history });
      }
      if (e.a.id === 'player' || e.b.id === 'player') {
        const npc = e.a.id === 'player' ? e.b : e.a;
        if (audio && audio.cue) audio.cue('bump');
        if (onPlayerBump) onPlayerBump({ npc: npc.id, closing: e.closing, playerAtFault: e.mover.id === 'player' });
      }
    }
    while (log.length > 60) log.shift();
    return events;
  }
  return { update, log, get lastBarkAt() { return lastBarkAt; }, byPlayer };
}
