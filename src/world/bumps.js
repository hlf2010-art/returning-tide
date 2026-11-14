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

  function say(t, actor, line, dist, other) {
    if (!line) return;
    const b = pickBark(line, rnd);
    if (!b) return;
    log.push({ t, id: actor.id, persona: actor.persona, line, text: b.text, lang: b.lang });
    if (dist > HEAR) return;
    const who = WHO[actor.persona] || WHO.office;
    hud.bark({ speaker: `${who.zh} · ${who.en}`, text: b.text, gloss: b.gloss, lang: b.lang, toPlayer: other === 'player' });
    lastBarkAt = t;
    // a voice, if the browser has one free (the conversation's lines take precedence)
    if (synth && b.lang !== 'wuu' && !synth.speaking && !synth.pending) {
      try {
        const u = new SpeechSynthesisUtterance(b.text); u.lang = LANG[b.lang] || 'zh-CN';
        u.rate = actor.persona === 'auntie' || actor.persona === 'elder' ? 1.0 : 1.12;
        u.pitch = { auntie: 1.15, office: 1.05, youngMan: 0.95, elder: 0.85, lin: 0.88, su: 1.12 }[actor.persona] || 1;
        u.volume = Math.max(0.15, Math.min(1, 1.6 / Math.max(1, dist)));
        synth.speak(u);
      } catch { /* no voice: subtitles carry it */ }
    }
  }

  // actors: [{ id, persona, x, z, vx, vz, r, apply(reaction, other) }], with the player as id 'player'
  function update(t, actors, listener) {
    const events = detectBumps(actors, t, memo);
    for (const e of events) {
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
