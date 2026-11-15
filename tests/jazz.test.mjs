// The trio's book (src/engine/jazzScore.js). npm test.
import { makeTune, BOOK, SWING } from '../src/engine/jazzScore.js';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const pc = (m) => ((m % 12) + 12) % 12;
for (let i = 0; i < BOOK.length; i++) {
  const t = makeTune(i, 3);
  const secs = t.beats * 60 / t.bpm;
  ok(secs > 60 && secs < 240, `${t.title}: ${t.bpm} bpm, ${t.bars} bars, ${secs.toFixed(0)} s`);
  const bass = t.events.filter((e) => e.part === 'bass');
  const ones = bass.filter((e) => Number.isInteger(e.t) && e.t % 4 === 0 && e.t < t.bars * 4);
  ok(ones.length === t.bars && ones.every((e) => pc(e.midi) === t.chordAt(e.t).root), '  the bass plays the root on one, every bar');
  ok(bass.every((e) => e.midi >= 33 && e.midi <= 55), '  the bass stays in the bass');
  const frac = (x) => +(x - Math.floor(x)).toFixed(4);
  const leads = t.events.filter((e) => e.part === 'lead');
  ok(leads.length > 40 && leads.every((e) => [0, +SWING.toFixed(4), 0.5].includes(frac(e.t))), `  the piano's line is swung (${leads.length} notes)`);
  ok(leads.every((e) => e.midi >= 62 && e.midi <= 86), '  in the right hand\'s range');
  const comps = t.events.filter((e) => e.part === 'comp');
  ok(comps.every((e) => { const c = t.chordAt(Math.max(0, Math.round(e.t) - (frac(e.t) === +SWING.toFixed(4) && Math.floor(e.t) % 4 === 3 ? -1 : 0))); return e.notes.length >= 3 && e.notes.length <= 4; }), '  comping: three- and four-note voicings');
  const strongLead = leads.filter((e) => Number.isInteger(e.t) && e.t < t.bars * 4);
  const onChord = strongLead.filter((e) => t.chordAt(e.t).tones.map((x) => (t.chordAt(e.t).root + x) % 12).includes(pc(e.midi))).length;
  ok(onChord / strongLead.length > 0.5, `  mostly chord tones on the beat (${(onChord / strongLead.length * 100).toFixed(0)}%)`);
  ok(t.events.every((e) => e.t >= 0 && e.t <= t.beats) && t.events.at(-1).part === 'end', '  everything inside the tune; it ends');
  const hats = t.events.filter((e) => e.part === 'hat');
  ok(hats.every((e) => e.t % 2 === 1), '  hi-hat on two and four');
}
{
  const a = JSON.stringify(makeTune(0, 5).events), b = JSON.stringify(makeTune(0, 5).events), c = JSON.stringify(makeTune(0, 6).events);
  ok(a === b && a !== c, 'the same night plays the same; another night, another solo');
}
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
