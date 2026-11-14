// A driver who talks (or doesn't): pure, node-tested.
//
// Drivers are people: a persona (where they're from, what they care about, how they talk), a mood
// for this shift, and opinions. Some start talking on their own; some stay quiet. Much of what
// they say goes nowhere, by design. The player can engage, give a short answer, change the
// subject, or ignore them, and is never made to answer (rides end; drivers give up).
//
// Now and then a remark carries something: a rumour, a place, a name, a business tip. It is told
// in the same voice and the same rhythm as everything else, as an aside inside an ordinary topic,
// at no fixed point in the conversation. Hollow rumours and plain wrong ones are told exactly the
// same way, so a line's weight is never signalled. Things only come up if the conversation keeps
// going; ignore a driver and whatever they knew stays in the car.
//
// driver: { id, chatty 0..1, mood: 'cheerful'|'tired'|'grumbly'|'chatty'|'flat', topics: [...],
//           asides: [{ id, kind: 'intel'|'hollow'|'false', topic, warmth }] }
export const TALK = {
  firstAfter: [5, 22],          // s into the ride before the first remark (if any)
  gap: [6, 18],                 // s between beats
  giveUpAfterIgnores: 2,        // ignored twice in a row -> they stop talking
  asideChance: 0.2,             // per eligible beat, once warm enough
  lapse: 0.1,                   // per beat: the talk just peters out (a call, a junction, the radio)
};

const MOOD = {                   // how a mood bends talkativeness and patience
  cheerful: { talk: 1.1, patience: 1.2 }, chatty: { talk: 1.35, patience: 1.4 }, tired: { talk: 0.55, patience: 0.7 },
  grumbly: { talk: 0.9, patience: 0.6 }, flat: { talk: 0.7, patience: 1 },
};

export function createTalk(driver, rnd = Math.random) {
  const m = MOOD[driver.mood] || MOOD.flat, chatty = Math.min(1, driver.chatty * m.talk);
  const starts = rnd() < chatty;
  return {
    driver, rnd, chatty, patience: m.patience, talking: starts, done: !starts, beat: 0, warmth: 0, ignoredRun: 0,
    next: TALK.firstAfter[0] + rnd() * (TALK.firstAfter[1] - TALK.firstAfter[0]),
    awaiting: false, topic: null, told: [], lines: [], subjectChanges: 0,
  };
}

const pick = (list, rnd) => list[Math.floor(rnd() * list.length)];

// advance time; returns what the driver says now: { topic, beat, aside? } or null.
// `aside` (when present) is an id the dialogue layer folds into the topic's line; the line itself
// looks like any other.
export function stepTalk(s, dt) {
  if (s.done || s.awaiting) return null;
  s.next -= dt;
  if (s.next > 0) return null;
  const d = s.driver;
  // a topic: usually carry on with the current one a beat, otherwise wander
  if (!s.topic || s.rnd() < 0.55) s.topic = pick(d.topics, s.rnd);
  let aside = null;
  const open = (d.asides || []).filter((a) => !s.told.includes(a.id) && s.warmth >= (a.warmth ?? 1.5));
  if (open.length && s.rnd() < TALK.asideChance) {
    const a = pick(open, s.rnd); aside = a.id; s.told.push(a.id);
    if (a.topic) s.topic = a.topic;                     // the aside rides on whatever it's about
  }
  s.awaiting = true;
  const line = { topic: s.topic, beat: s.beat++, ...(aside ? { aside } : {}) };
  s.lines.push(line); return line;
}

// the player's answer: 'engage' | 'short' | 'change' (another subject) | 'ignore'
export function answer(s, how, newTopic = null) {
  if (!s.awaiting) return s;
  s.awaiting = false;
  if (how === 'engage') { s.warmth += 1; s.ignoredRun = 0; }
  else if (how === 'short') { s.warmth += 0.2; s.ignoredRun = 0; }
  else if (how === 'change') { s.warmth += 0.6; s.ignoredRun = 0; s.subjectChanges++; s.topic = newTopic || pick(s.driver.topics.filter((t) => t !== s.topic), s.rnd) || s.topic; }
  else { s.ignoredRun += 1; s.warmth = Math.max(0, s.warmth - 0.5); }
  if (s.ignoredRun >= TALK.giveUpAfterIgnores) { s.done = true; return s; }
  // a chatty driver keeps going even on short answers; a quiet or tired one needs encouragement
  const k = how === 'engage' || how === 'change' ? 1 : how === 'short' ? 0.55 * s.patience : 0.35 * s.patience;
  if (how !== 'engage' && how !== 'change' && s.rnd() >= Math.min(0.9, s.chatty * k)) { s.done = true; return s; }
  if (s.rnd() < TALK.lapse) { s.done = true; return s; }
  s.next = TALK.gap[0] + s.rnd() * (TALK.gap[1] - TALK.gap[0]);
  return s;
}

// what the player learned on this ride, as they'd note it: intel and rumours look the same here;
// whether a rumour holds up is something the world finds out later
export function heard(s) {
  return (s.driver.asides || []).filter((a) => s.told.includes(a.id)).map((a) => ({ id: a.id }));
}

// Something happens on the road: { kind: 'cutIn' | 'jaywalk', brake: m/s² of hard braking }.
// Returns { kind, severity 1..3 } for the driver to react with, or null (they let it go). The
// outburst interrupts whatever was being said; the conversation then carries on, or it doesn't.
export function roadEvent(s, ev, temper = 0.3) {
  const hard = Math.min(1, Math.max(0, (ev.brake - 2) / 5));            // 2 m/s² nothing, 7+ as bad as it gets
  const heat = hard * 0.7 + temper * 0.6;
  if (s.rnd() > 0.25 + heat) return null;
  const severity = heat > 0.85 ? 3 : heat > 0.5 ? 2 : 1;
  s.outbursts = (s.outbursts || 0) + 1;
  if (s.awaiting) s.awaiting = false;                                    // cut off mid-line
  if (!s.done) {
    if (s.rnd() < 0.25 + 0.15 * severity) s.done = true;                 // sometimes the mood is gone after
    else s.next = Math.max(s.next, 3 + s.rnd() * 4);                     // otherwise a pause, then on
  }
  return { kind: ev.kind, severity };
}
