// People on a pavement: avoidance, bumps, reactions (src/engine/social.js). npm test.
import { avoid, detectBumps, react, PERSONAS, SOCIAL, DISTRACTED } from '../src/engine/social.js';
import { rng } from './util-rng.mjs';
import { pickBark, BARKS } from '../src/world/barks.js';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const DT = 1 / 30;

function sim(agents, secs, { steer = true } = {}) {
  // (an agent with .phone walks with its eyes on the screen: DISTRACTED avoidance)
  let minGap = Infinity, contacts = 0; const memo = new Map();
  for (let t = 0; t < secs; t += DT) {
    for (const a of agents) {
      const dx = a.goal[0] - a.x, dz = a.goal[1] - a.z, d = Math.hypot(dx, dz);
      const want = d < 0.2 ? [0, 0] : [dx / d * a.speed, dz / d * a.speed];
      a.nv = steer ? avoid(a, want, agents, a.phone ? DISTRACTED : undefined) : want;
    }
    for (const a of agents) { a.vx = a.nv[0]; a.vz = a.nv[1]; a.x += a.vx * DT; a.z += a.vz * DT; a.track = a.track || []; a.track.push([a.x, a.z]); }
    for (let i = 0; i < agents.length; i++) for (let j = i + 1; j < agents.length; j++) minGap = Math.min(minGap, Math.hypot(agents[i].x - agents[j].x, agents[i].z - agents[j].z) - agents[i].r - agents[j].r);
    contacts += detectBumps(agents, t, memo).length;
  }
  return { minGap, contacts };
}
const walker = (id, x, z, gx, gz, speed = 1.3) => ({ id, x, z, r: 0.28, vx: 0, vz: 0, goal: [gx, gz], speed });

// head-on, nearly the same line: both step aside, to their own right, and nobody touches
{
  const a = walker('a', 0, 0, 0, 20), b = walker('b', 0.05, 20, 0.05, 0);
  const r = sim([a, b], 20);
  ok(r.minGap > 0.1 && r.contacts === 0, `head-on: they pass without touching (closest ${r.minGap.toFixed(2)} m apart)`);
  // a walks south (+z): its right is -x (west). b walks north: its right is +x.
  const mid = (t, z) => t.reduce((best, p) => (Math.abs(p[1] - z) < Math.abs(best[1] - z) ? p : best));
  ok(mid(a.track, 10)[0] < -0.1 && mid(b.track, 10)[0] > 0.15, 'each keeps to their own right');
  ok(Math.abs(a.x) < 0.3 && Math.abs(a.z - 20) < 0.3 && Math.abs(b.z) < 0.3, 'and both still get where they were going');
  const c = walker('c', 0, 0, 0, 20), d = walker('d', 0.05, 20, 0.05, 0);
  ok(sim([c, d], 20, { steer: false }).contacts > 0, '(without steering they would have collided)');
}
// crossing paths at right angles, and overtaking someone slow
{
  const r = sim([walker('a', -10, 0, 10, 0), walker('b', 0, -10, 0, 10, 1.3)], 20);
  ok(r.minGap > 0.05 && r.contacts === 0, `paths crossing at right angles: no contact (closest ${r.minGap.toFixed(2)} m)`);
  const fast = walker('f', 0, 0, 0, 30, 1.6), slow = walker('s', 0.02, 3, 0.02, 30, 0.6);
  const o = sim([fast, slow], 25);
  ok(o.contacts === 0 && fast.z > slow.z + 2, `overtakes a slow walker without touching (gap ${o.minGap.toFixed(2)} m)`);
}
// a busy pavement: 16 people, both directions, 4 m wide, 90 s
{
  const r = rng(5), mk = () => {
    const ag = [];
    for (let i = 0; i < 16; i++) { const north = i % 2, x = r() * 4 - 2; ag.push(walker(`p${i}`, x, north ? 40 + r() * 30 : -r() * 30, x + (r() - 0.5), north ? -40 : 70, 1.0 + r() * 0.6)); }
    return ag;
  };
  const steer = sim(mk(), 90), none = sim(mk(), 90, { steer: false });
  ok(steer.contacts <= Math.max(1, none.contacts * 0.15), `busy pavement: ${steer.contacts} bumps with steering vs ${none.contacts} without`);
}
// people walking with their eyes on their phones bump into others more
{
  const r = rng(9), mk = (phones) => {
    const ag = [];
    for (let i = 0; i < 16; i++) { const north = i % 2, x = r() * 4 - 2; const w = walker(`p${i}`, x, north ? 40 + r() * 30 : -r() * 30, x + (r() - 0.5), north ? -40 : 70, 1.0 + r() * 0.6); w.phone = i < phones; if (w.phone) w.speed *= 0.8; ag.push(w); }
    return ag;
  };
  const none = sim(mk(0), 90), some = sim(mk(8), 90);
  ok(some.contacts > none.contacts, `half the crowd on their phones: more bumps (${none.contacts} -> ${some.contacts})`);
}
// contact events
{
  const memo = new Map();
  const a = { id: 'a', x: 0, z: 0, vx: 1.4, vz: 0, r: 0.3 }, b = { id: 'b', x: 0.55, z: 0, vx: 0, vz: 0, r: 0.3 };
  const e = detectBumps([a, b], 0, memo);
  ok(e.length === 1 && e[0].mover === a && e[0].other === b && Math.abs(e[0].closing - 1.4) < 1e-9, 'a walks into b: one bump, a was moving into b');
  ok(detectBumps([a, b], 2, memo).length === 0, 'the same contact is not a new bump a moment later');
  ok(detectBumps([a, b], 2 + SOCIAL.pairCooldown, memo).length === 1, 'but can be once some time has passed');
  const c = { id: 'c', x: 0, z: 0, vx: 0.1, vz: 0, r: 0.3 }, d = { id: 'd', x: 0.55, z: 0, vx: 0, vz: 0, r: 0.3 };
  ok(detectBumps([c, d], 0, new Map()).length === 0, 'drifting into someone very slowly is not a bump');
  const f = { id: 'f', x: 0, z: 0, vx: 1.4, vz: 0, r: 0.3 }, g = { id: 'g', x: 0.55, z: 0, vx: 1.5, vz: 0, r: 0.3 };
  ok(detectBumps([f, g], 0, new Map()).length === 0, 'walking close behind someone at the same pace is not a bump');
}
// reactions: statistics over many bumps
{
  const r = rng(11), N = 4000;
  const tally = (me, ctx) => { const t = {}; for (let i = 0; i < N; i++) { const x = react(me, ctx, r); t[x.kind] = (t[x.kind] || 0) + 1; } for (const k in t) t[k] /= N; return t; };
  const atFault = tally({ persona: 'office' }, { fault: true, hard: 1.2 });
  ok(atFault.sorry > 0.65, `whoever walked into someone apologises (${(atFault.sorry * 100).toFixed(0)}%)`);
  const npcNpc = tally({ persona: 'office' }, { fault: false, hard: 1.0 });
  ok((npcNpc.sorry || 0) + (npcNpc.fine || 0) > 0.7 && (npcNpc.scold || 0) < 0.1, `NPC bumped by NPC: mostly "sorry" / "it's fine" (${(((npcNpc.sorry || 0) + (npcNpc.fine || 0)) * 100).toFixed(0)}%), rarely words (${((npcNpc.scold || 0) * 100).toFixed(0)}%)`);
  const auntie = tally({ persona: 'auntie' }, { fault: false, hard: 1.3 });
  ok((auntie.scold || 0) > (npcNpc.scold || 0) * 3 && (auntie.scold || 0) > 0.15, `an older local woman is the likeliest to say something (${((auntie.scold || 0) * 100).toFixed(0)}%)`);
  ok(react({ persona: 'auntie' }, { fault: false, hard: 3, byPlayer: true, history: 2 }, () => 0.01).line === 'auntie.scold.again', '... and her words are her own (Shanghainese lines, escalating on a repeat)');
  const visitor = tally({ persona: 'visitor' }, { fault: false, hard: 1.0 });
  ok((visitor.scold || 0) < 0.05 && visitor.sorry > 0.6, `a visitor mostly apologises even when it wasn't them (${(visitor.sorry * 100).toFixed(0)}%)`);
  // the player: running into people is worse than brushing them, and doing it again is worse still
  const scold = (ctx) => tally({ persona: 'youngMan' }, { fault: false, byPlayer: true, ...ctx }).scold || 0;
  const s0 = scold({ hard: 0.8, history: 0 }), s1 = scold({ hard: 3.5, history: 0 }), s2 = scold({ hard: 3.5, history: 1 }), s3 = scold({ hard: 3.5, history: 3 });
  ok(s0 < s1 && s1 < s2 && s2 < s3, `player bumps escalate: brush ${(s0 * 100).toFixed(0)}% < run into ${(s1 * 100).toFixed(0)}% < again ${(s2 * 100).toFixed(0)}% < a third time ${(s3 * 100).toFixed(0)}%`);
  ok(react({ persona: 'office' }, { fault: false, hard: 3 }, () => 0.9).stagger === true && react({ persona: 'office' }, { fault: false, hard: 1 }, () => 0.9).stagger === false, 'a hard knock makes them stagger; a brush does not');
  ok(tally({ persona: 'lin' }, { fault: false, hard: 1.2, byPlayer: true }).scold < 0.15, 'Old Lin takes it in good part');
  ok(Object.values(PERSONAS).every((p) => p.temper >= 0 && p.temper <= 1 && p.polite >= 0 && p.polite <= 1), 'personas are well-formed');
}
// every reaction a persona can have has words to go with it, in the right language
{
  let missing = [];
  for (const [name, P] of Object.entries(PERSONAS)) for (const kind of ['sorry', 'fine', 'scold', 'scold.again']) {
    const b = pickBark(`${P.lines}.${kind}`); if (!b) missing.push(`${name}.${kind}`);
    else if (P.dialect === 'wuu' && !(b.lang === 'wuu' && b.gloss)) missing.push(`${name}.${kind} (not Shanghainese with a gloss)`);
  }
  ok(!missing.length, `every persona has lines for every reaction${missing.length ? ': missing ' + missing.join(', ') : ''}`);
  const seen = new Set(); for (let i = 0; i < 6; i++) seen.add(pickBark('auntie.scold').text);
  ok(seen.size >= 2, 'she does not say the same thing every time');
}
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
