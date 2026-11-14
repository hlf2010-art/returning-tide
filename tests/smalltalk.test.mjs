// Ride small talk (src/engine/smallTalk.js). npm test.
import { createTalk, stepTalk, answer, heard, roadEvent } from '../src/engine/smallTalk.js';
import { DRIVERS, OUTBURSTS, TEMPER } from '../src/world/drivers.js';
import { rng } from './util-rng.mjs';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const ride = (driver, how, seed, secs = 360) => {   // a six-minute ride
  const r = rng(seed), s = createTalk(driver, r);
  for (let t = 0; t < secs; t += 0.5) { const line = stepTalk(s, 0.5); if (line) answer(s, typeof how === 'function' ? how(line, s) : how); }
  return s;
};
const TOPICS = ['weather', 'traffic', 'kids', 'football', 'prices', 'gossip', 'business'];
const tipster = { id: 'd1', chatty: 0.8, mood: 'chatty', topics: TOPICS, asides: [
  { id: 'peace-side-door', kind: 'intel', topic: 'gossip', warmth: 2 },
  { id: 'aia-new-guard', kind: 'false', topic: 'business', warmth: 1.5 },
  { id: 'brother-in-law-noodles', kind: 'hollow', topic: 'prices', warmth: 1 },
] };
{
  let starts = 0; for (let k = 0; k < 400; k++) if (createTalk({ chatty: 0.3, mood: 'flat', topics: ['x'] }, rng(k)).talking) starts++;
  ok(starts > 50 && starts < 130, `a quiet driver only sometimes starts talking (${starts}/400)`);
  let tired = 0, cheer = 0; for (let k = 0; k < 400; k++) { if (createTalk({ chatty: 0.6, mood: 'tired', topics: ['x'] }, rng(k)).talking) tired++; if (createTalk({ chatty: 0.6, mood: 'cheerful', topics: ['x'] }, rng(k)).talking) cheer++; }
  ok(tired < cheer * 0.7, `mood matters: a tired driver talks less than a cheerful one (${tired} vs ${cheer} of 400)`);
  const got = { engage: 0, ignore: 0, short: 0 };
  for (let k = 0; k < 200; k++) for (const how of Object.keys(got)) if (ride(tipster, how, k).told.includes('peace-side-door')) got[how]++;
  ok(got.engage > 40 && got.engage < 170, `engage and the real tip comes up sometimes, not always (${got.engage}/200)`);
  ok(got.ignore === 0, 'ignore the driver and it never does');
  ok(got.short < got.engage * 0.6, `short answers get there much less often (${got.short}/200)`);
  // no signalling: the beat at which an aside comes is spread out, and asides are just topics
  const beats = [];
  for (let k = 0; k < 300; k++) { const s = ride(tipster, 'engage', 1000 + k); s.lines.forEach((l) => { if (l.aside === 'peace-side-door') beats.push(l.beat); }); }
  const spread = new Set(beats).size;
  ok(spread >= 5, `the tip turns up at no fixed point in the conversation (seen at ${spread} different beats)`);
  const s = ride(tipster, 'engage', 7);
  ok(s.lines.every((l) => TOPICS.includes(l.topic)), 'every line is about an ordinary topic (an aside rides inside one)');
  // hollow and false rumours come up just as readily, and look the same in what you heard
  let real = 0, fake = 0, hollow = 0;
  for (let k = 0; k < 300; k++) { const r = ride(tipster, 'engage', 2000 + k); if (r.told.includes('peace-side-door')) real++; if (r.told.includes('aia-new-guard')) fake++; if (r.told.includes('brother-in-law-noodles')) hollow++; }
  ok(real > 20 && fake > real * 0.5 && hollow > real * 0.5, `unreliable and pointless asides are as common as real ones (real ${real}, false ${fake}, hollow ${hollow})`);
  ok(heard(ride(tipster, 'engage', 3)).every((h) => Object.keys(h).join() === 'id'), 'what you heard carries no "this one matters" flag');
  // ignoring is always allowed and always ends it
  const ign = ride({ ...tipster, mood: 'chatty', chatty: 1 }, 'ignore', 3);
  ok(ign.done && ign.lines.length <= 2, `ignored twice, even a chatterbox gives up (${ign.lines.length} lines)`);
  // changing the subject keeps the conversation going and moves it
  let ch = null; for (let k = 0; !ch || ch.lines.length < 4; k++) ch = ride(tipster, (line) => (line.beat % 2 ? 'change' : 'engage'), 11 + k);
  ok(ch.subjectChanges >= 2, `you can steer the talk elsewhere (${ch.subjectChanges} changes over ${ch.lines.length} beats)`);
  // and some rides are just rides
  let empty = 0; for (let k = 0; k < 200; k++) { const r = ride({ id: 'q', chatty: 0.5, mood: 'flat', topics: TOPICS, asides: [] }, 'engage', 3000 + k); if (r.told.length === 0) empty++; }
  ok(empty === 200, 'a driver with nothing to tell tells you nothing (and that is most drivers)');
}
// the road talks back
{
  const r = rng(77), react = (mood, brake) => { let n = 0, sev = 0; for (let k = 0; k < 500; k++) { const s = createTalk({ chatty: 0.5, mood, topics: ['x'] }, r); const o = roadEvent(s, { kind: 'jaywalk', brake }, TEMPER[mood]); if (o) { n++; sev += o.severity; } } return { n, sev: n ? sev / n : 0 }; };
  const mild = react('cheerful', 2.5), hard = react('cheerful', 7), grump = react('grumbly', 4), tired = react('tired', 4);
  ok(hard.n > mild.n && hard.sev > mild.sev, `a hard stop gets more, and louder, reactions than a gentle one (${mild.n}/500 avg ${mild.sev.toFixed(1)} -> ${hard.n}/500 avg ${hard.sev.toFixed(1)})`);
  ok(grump.sev > tired.sev && grump.n > tired.n, `a grumbly driver blows up more than a tired one (${grump.n} vs ${tired.n})`);
  const s = createTalk({ chatty: 1, mood: 'chatty', topics: ['traffic'] }, rng(5)); let line = null; for (let t = 0; t < 60 && !line; t += 0.5) line = stepTalk(s, 0.5);
  let o = null; for (let k = 0; k < 20 && !o; k++) o = roadEvent(s, { kind: 'cutIn', brake: 7 }, 0.8);
  ok(o && !s.awaiting, 'an outburst cuts the current line off');
  ok(DRIVERS.every((d) => OUTBURSTS[d.id] && OUTBURSTS[d.id].cutIn.length && OUTBURSTS[d.id].jaywalk.length && d.mood in TEMPER), 'every driver has their own way of losing their temper');
  ok(DRIVERS.every((d) => Object.keys(d.topics).length >= 3 && d.who && d.plate), 'every driver has a life: topics, a plate, a description');
}
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
