// How people share a pavement: pure (no three.js / DOM), node-tested.
//
//  avoid()        anticipatory steering. Each walker looks a few seconds ahead along its intended
//                 velocity; anyone it would pass too close to nudges it sideways (keeping right, as
//                 people do in Shanghai) and, if it's head-on and close, slows it. People don't
//                 walk into each other on purpose.
//  detectBumps()  when they do touch anyway (a crowd, a corner, someone on their phone, the player
//                 barging through), one event per contact, with who was moving into whom and how hard.
//  react()        what each of the two does about it, from who they are (persona), who was at fault,
//                 how hard it was, and whether this has happened before. Mostly apologies; sometimes
//                 a look or a tut; now and then a few words, and an older local woman is the one
//                 most likely to say them, in Shanghainese.

export const SOCIAL = {
  look: 3.0,          // s: how far ahead a walker anticipates
  space: 0.35,        // m: personal space kept beyond the two bodies
  range: 7,           // m: who is considered at all
  keepRight: 0.35,    // bias toward passing on the right in a head-on meeting
  contact: 0.03,      // m of overlap that counts as a bump
  closing: 0.25,      // m/s: slower than this is brushing past, not a bump
  pairCooldown: 8,    // s before the same two people can bump "again"
  memory: 40,         // s an NPC remembers being bumped by the player
};

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// Eyes on a phone (messages, short videos, a drama episode): you notice people late and pass close.
export const DISTRACTED = { look: 0.7, space: 0, keepRight: 0, attention: 0.3 };

// a: { x, z, r }, want: [vx, vz] the velocity it intends, others: [{ x, z, vx, vz, r }]
// Returns the velocity to use this step.
export function avoid(a, want, others, { look = SOCIAL.look, space = SOCIAL.space, keepRight = SOCIAL.keepRight, attention = 1 } = {}) {
  const speed = Math.hypot(want[0], want[1]);
  if (speed < 1e-3) return [0, 0];
  const fx = want[0] / speed, fz = want[1] / speed;
  let sx = 0, sz = 0, brake = 0;
  for (const o of others) {
    if (o === a) continue;
    const px = o.x - a.x, pz = o.z - a.z, d = Math.hypot(px, pz);
    if (d > SOCIAL.range || d < 1e-4) continue;
    const ahead = (px * fx + pz * fz) / d;
    if (ahead < -0.2) continue;                                              // behind me: their problem
    const need0 = (a.r || 0.3) + (o.r || 0.3) + space;
    if (d < need0) {                                                          // already too close: ease apart
      const k = (1 - d / need0) * 2.5;
      sx -= px / d * k; sz -= pz / d * k;
      if (ahead > 0.3) brake = Math.max(brake, (1 - d / need0) * ahead);
    }
    const rvx = want[0] - (o.vx || 0), rvz = want[1] - (o.vz || 0), rv2 = rvx * rvx + rvz * rvz;
    const t = rv2 > 1e-6 ? clamp((px * rvx + pz * rvz) / rv2, 0, look) : 0;
    const cx = px - rvx * t, cz = pz - rvz * t, miss = Math.hypot(cx, cz);   // closest approach
    const need = (a.r || 0.3) + (o.r || 0.3) + space;
    if (miss >= need) continue;
    const urgency = (1 - miss / need) * (1 - t / (look + 0.01));
    // sideways away from where they'll be; dead ahead -> to my right (fx,fz) x up = (-fz, fx)?
    // In this world (x east, z south, y up) the walker's right-hand side is (-fz, fx).
    let ax = -cx, az = -cz;
    const lat = ax * -fz + az * fx;                                           // + = to my right
    const headOn = Math.abs((o.vx || 0) * fx + (o.vz || 0) * fz) > 0.3 && ((o.vx || 0) * fx + (o.vz || 0) * fz) < 0;
    let side = Math.sign(lat) || 1;
    if (headOn && Math.abs(lat) < keepRight * need) side = 1;                 // nearly dead ahead: keep right
    sx += -fz * side * urgency; sz += fx * side * urgency;
    if (t < 0.9 && ahead > 0.6) brake = Math.max(brake, urgency * (1 - t / 0.9));
  }
  const sl = Math.hypot(sx, sz);
  if (sl < 1e-6) return want;
  const k = Math.min(1.2, sl) * attention;                                  // turn at most ~50° (less, eyes on a phone)
  let vx = fx + sx / sl * k, vz = fz + sz / sl * k; const l = Math.hypot(vx, vz); vx /= l; vz /= l;
  const v = speed * (1 - 0.75 * Math.min(1, brake) * attention);
  return [vx * v, vz * v];
}

// agents: [{ id, x, z, vx, vz, r }]; memo: Map of pair -> last time. Returns new contacts:
// [{ a, b, mover, other, closing }] where `mover` is the one moving into the other more.
export function detectBumps(agents, now, memo, { contact = SOCIAL.contact, closing = SOCIAL.closing, cooldown = SOCIAL.pairCooldown } = {}) {
  const out = [];
  for (let i = 0; i < agents.length; i++) for (let j = i + 1; j < agents.length; j++) {
    const a = agents[i], b = agents[j], px = b.x - a.x, pz = b.z - a.z, d = Math.hypot(px, pz);
    if (d > (a.r || 0.3) + (b.r || 0.3) - contact || d < 1e-6) continue;
    const nx = px / d, nz = pz / d;
    const va = (a.vx || 0) * nx + (a.vz || 0) * nz, vb = -((b.vx || 0) * nx + (b.vz || 0) * nz);   // each one's speed toward the other
    if (va + vb < closing) continue;
    const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
    if (now - (memo.get(key) ?? -1e9) < cooldown) continue;
    memo.set(key, now);
    out.push({ a, b, mover: va >= vb ? a : b, other: va >= vb ? b : a, closing: va + vb });
  }
  return out;
}

// Who someone is, for how they take a bump. temper: 0 placid .. 1 short-fused; polite: how readily
// they apologise even when it wasn't them; dialect: what they say it in.
export const PERSONAS = {
  office:  { temper: 0.25, polite: 0.8, dialect: 'zh', lines: 'office' },     // office worker, earbuds in
  student: { temper: 0.2, polite: 0.6, dialect: 'zh', lines: 'young' },
  youngMan:{ temper: 0.45, polite: 0.45, dialect: 'zh', lines: 'young' },
  visitor: { temper: 0.05, polite: 0.9, dialect: 'en', lines: 'visitor' },
  elder:   { temper: 0.35, polite: 0.5, dialect: 'zh', lines: 'elder' },     // older man, slow
  auntie:  { temper: 0.75, polite: 0.25, dialect: 'wuu', lines: 'auntie' },  // older local woman (阿姨)
  lin:     { temper: 0.1, polite: 0.7, dialect: 'zh', lines: 'lin' },
  su:      { temper: 0.3, polite: 0.6, dialect: 'zh', lines: 'su' },
};

// What one person does about a bump.
//   kinds: 'sorry' (apologise), 'fine' (it's fine / nod), 'look' (a glance, nothing said),
//          'tut' (a look and a click of the tongue), 'scold' (a few words), 'stagger' added as a flag
// me: { persona, id }, fault: true if I was the one moving into them, hard: closing speed (m/s),
// byPlayer: the other one is the player, history: how many times the player has bumped me lately.
export function react(me, { fault, hard, byPlayer = false, history = 0, busy = false }, rnd = Math.random) {
  const P = PERSONAS[me.persona] || PERSONAS.office;
  const stagger = hard > 1.6 && !fault;
  if (fault) {
    // the one who walked into someone almost always says sorry; a short-fused one in a hurry may not
    const r = rnd();
    if (r < 0.8 - P.temper * 0.3) return { kind: 'sorry', stagger: false, line: lineKey(P, 'sorry') };
    return { kind: r < 0.95 ? 'look' : 'tut', stagger: false, line: null };
  }
  // the one who got walked into: annoyance grows with temper, force, distraction, and repeats by the player
  let annoyed = P.temper * 0.55 + clamp((hard - 0.6) / 2.5, 0, 0.35) + (busy ? 0.1 : 0);
  if (byPlayer) annoyed += 0.08 + Math.min(3, history) * 0.3;
  annoyed = clamp(annoyed, 0, 1);
  const r = rnd();
  if (r < annoyed * annoyed) return { kind: 'scold', stagger, line: lineKey(P, 'scold', history) };
  if (r < annoyed) return { kind: rnd() < 0.5 ? 'tut' : 'look', stagger, line: null };
  // not annoyed: polite people apologise even when it wasn't them (very common), others shrug it off
  if (rnd() < P.polite) return { kind: 'sorry', stagger, line: lineKey(P, 'sorry') };
  return { kind: 'fine', stagger, line: lineKey(P, 'fine') };
}

function lineKey(P, kind, history = 0) {
  return `${P.lines}.${kind}${kind === 'scold' && history >= 2 ? '.again' : ''}`;
}
