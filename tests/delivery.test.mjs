// Line delivery (src/engine/delivery.js). npm test.
import { shape, moodOf } from '../src/engine/delivery.js';
import { T } from '../src/world/text.js';
import { rng } from './util-rng.mjs';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const r = rng(3);
{
  const a = shape('下过雨之后江风一下就凉了，早知道多带条围巾。', { rate: 1, pitch: 1 }, { rnd: r });
  ok(a.length === 2 && a[0].pauseAfter >= 0.16 && a[0].pauseAfter <= 0.3 && a[1].pauseAfter === 0, `phrases split at the comma with a breath between (${a.map((p) => p.text).join(' | ')})`);
  const q = shape('待会儿你是坐公交回去，还是顺着江边一路走到渡口那边？', { rate: 1, pitch: 1 }, { rnd: r });
  ok(q.at(-1).question && q.at(-1).pitch > q[0].pitch, 'a question lifts at the end');
  const t = shape('封条破了。……你看过了。', { rate: 1, pitch: 1 }, { rnd: r });
  ok(t.some((p) => p.trailing && p.pauseAfter >= 0.55), `trailing off leaves a long pause (${t.map((p) => `${p.text}+${p.pauseAfter.toFixed(2)}s`).join(' ')})`);
  ok(t.find((p) => p.trailing).rate < 1, '... and slows down');
  const e = shape('哎——走路看着点啊！', { rate: 1, pitch: 1 }, { rnd: r });
  ok(e[0].interrupted && e[0].pauseAfter < 0.2, 'a dash is a catch in the voice, not a full pause');
  // every line in the game shapes cleanly: text survives intact, no empty phrases
  const all = [...T.dialogue.exchanges.flatMap((x) => x.lines), ...T.dialogue.greetings, ...Object.values(T.mission.lines)];
  const bad = all.filter((l) => { const s = shape(l.text, { rate: 1, pitch: 1 }, { rnd: r }); return s.some((p) => !p.text.trim()) || s.map((p) => p.text).join('').replace(/[，,、；：。.？?！!…—]/g, '') !== l.text.replace(/[，,、；：。.？?！!…—]/g, ''); });
  ok(!bad.length, `all ${all.length} game lines split without losing words${bad.length ? ': ' + bad.map((b) => b.id).join(', ') : ''}`);
  const bc = all.flatMap((l) => shape(l.text, { rate: 1, pitch: 1 }, { rnd: r })).filter((p) => p.backchannel).length;
  ok(bc >= 5, `there are natural places for the listener to say 嗯 (${bc})`);
  // no two phrases come out identical in rate (the drift)
  const rates = new Set(all.flatMap((l) => shape(l.text, { rate: 1, pitch: 1 }, { rnd: r })).map((p) => p.rate.toFixed(3)));
  ok(rates.size > 20, `rates vary phrase to phrase (${rates.size} distinct)`);
  ok(moodOf('别说了，越说越饿') === 'annoyed' && moodOf('那家做了很多年了，这个点买一袋揣兜里') === 'calm', 'a rough mood from the words');
}
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
