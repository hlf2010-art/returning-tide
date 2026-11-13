// Dev tool: record the game's real audio output (an AudioWorklet tapped after the limiter) while
// driving the page, save each scenario as a WAV, and measure it: loudness, clicks, footstep
// onsets, traffic direction, ducking under NPC speech, mission cues, pause / resume, restarts.
//   NODE_PATH=$(npm root -g) node tools/audiotest.mjs [url] [outDir]
// Speech itself cannot be captured: the TTS fallback is spoken by the OS, outside Web Audio.
import { createRequire } from 'module';
import { writeFileSync } from 'fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const [url = 'http://localhost:5173/', out = '.'] = process.argv.slice(2);
let failed = 0;
const ok = (c, msg) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`); if (!c) failed++; };
const info = (msg) => console.log(`INFO  ${msg}`);

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url + '?q=5&nolock&dev', { waitUntil: 'load' });
await page.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 240000 });
await page.click('#begin');
await page.waitForTimeout(3500);                                                 // master fade-in
const ev = (f, a) => page.evaluate(f, a);
const census = () => ev(() => window.__bund.audio.census());
const tp = (x, z, yaw, pitch = 0) => ev(([x, z, y, p]) => window.__bund.player.teleport(x, z, y, p), [x, z, yaw, pitch]);

// ---- capture ----
await ev(async () => {
  const a = window.__bund.audio, ctx = a.getContext();
  const code = `class Cap extends AudioWorkletProcessor {
    constructor() { super(); this.l = []; this.r = []; this.n = 0; this.f0 = -1; }
    process(inputs) {
      const i = inputs[0];
      if (i && i.length) {
        if (this.f0 < 0) this.f0 = currentFrame;
        this.l.push(i[0].slice()); this.r.push((i[1] || i[0]).slice()); this.n += i[0].length;
        if (this.n >= 4096) {
          const cat = (a) => { const o = new Float32Array(this.n); let k = 0; for (const b of a) { o.set(b, k); k += b.length; } return o; };
          this.port.postMessage({ l: cat(this.l), r: cat(this.r), frame: this.f0 });
          this.l = []; this.r = []; this.n = 0; this.f0 = -1;
        }
      }
      return true;
    }
  }
  registerProcessor('cap', Cap);`;
  await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([code], { type: 'application/javascript' })));
  const node = new AudioWorkletNode(ctx, 'cap', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: 'explicit' });
  const sink = ctx.createGain(); sink.gain.value = 0;
  a.output.connect(node); node.connect(sink).connect(ctx.destination);
  window.__cap = { on: false, chunks: [], marks: [] };
  node.port.onmessage = (e) => { if (window.__cap.on) window.__cap.chunks.push(e.data); };
});
const rec = async (name, fn) => {
  await ev(() => { window.__cap.chunks = []; window.__cap.marks = []; window.__cap.on = true; });
  await fn();
  await page.waitForTimeout(200);
  const seg = await ev(() => {
    window.__cap.on = false;
    const ch = window.__cap.chunks, sr = window.__bund.audio.getContext().sampleRate;
    const n = ch.reduce((s, c) => s + c.l.length, 0), L = new Float32Array(n), R = new Float32Array(n);
    let k = 0, gaps = 0, next = ch.length ? ch[0].frame : 0;
    for (const c of ch) { if (Math.abs(c.frame - next) > 1) gaps++; L.set(c.l, k); R.set(c.r, k); k += c.l.length; next = c.frame + c.l.length; }
    const b64 = (f) => { const i16 = new Int16Array(f.length); for (let j = 0; j < f.length; j++) i16[j] = Math.max(-32768, Math.min(32767, Math.round(f[j] * 32767))); let s = ''; const u8 = new Uint8Array(i16.buffer); for (let j = 0; j < u8.length; j += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(j, j + 0x8000)); return btoa(s); };
    return { sr, l: b64(L), r: b64(R), gaps, f0: ch.length ? ch[0].frame : 0, marks: window.__cap.marks };
  });
  const dec = (s) => { const b = Buffer.from(s, 'base64'); const i16 = new Int16Array(b.buffer, b.byteOffset, b.length / 2); return Float32Array.from(i16, (v) => v / 32767); };
  const L = dec(seg.l), R = dec(seg.r);
  writeWav(`${out}/audio-${name}.wav`, L, R, seg.sr);
  return { L, R, sr: seg.sr, gaps: seg.gaps, f0: seg.f0, marks: seg.marks, secs: L.length / seg.sr };
};
// a page-side marker stamped with the audio clock, to line states up with samples
const mark = (label) => ev((label) => { const c = window.__bund.audio.getContext(); window.__cap.marks.push({ label, frame: Math.round(c.currentTime * c.sampleRate) }); }, label);

function writeWav(path, L, R, sr) {
  const n = L.length, b = Buffer.alloc(44 + n * 4);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 4, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4); b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4); }
  writeFileSync(path, b);
}

// ---- analysis ----
const db = (x) => 20 * Math.log10(Math.max(1e-9, x));
const mono = (s) => Float32Array.from(s.L, (v, i) => (v + s.R[i]) / 2);
const rms = (a, i0 = 0, i1 = a.length) => { let e = 0; for (let i = i0; i < i1; i++) e += a[i] * a[i]; return Math.sqrt(e / Math.max(1, i1 - i0)); };
const peak = (a) => a.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
function biquad(a, type, f0, sr, q = 0.707) {            // RBJ cookbook
  const w = (2 * Math.PI * f0) / sr, c = Math.cos(w), al = Math.sin(w) / (2 * q);
  let b0, b1, b2; const a0 = 1 + al, a1 = -2 * c, a2 = 1 - al;
  if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; } else if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; } else { b0 = al; b1 = 0; b2 = -al; }
  const o = new Float32Array(a.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < a.length; i++) { const x = a[i], y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; o[i] = y; x2 = x1; x1 = x; y2 = y1; y1 = y; }
  return o;
}
const envDb = (a, sr, win = 0.02) => { const n = Math.floor(sr * win), o = []; for (let i = 0; i + n <= a.length; i += n) o.push(db(rms(a, i, i + n))); return o; };
function onsets(a, sr, { hp = 1500, win = 0.005, rise = 9, gap = 0.06 } = {}) {
  const e = envDb(biquad(a, 'hp', hp, sr), sr, win), out = [];
  let last = -1e9;
  for (let i = 4; i < e.length; i++) {
    const base = Math.min(e[i - 4], e[i - 3]);
    if (e[i] - base > rise && (i - last) * win > gap) { out.push(i * win); last = i; }
  }
  return out;
}
const maxStep = (a) => { let m = 0; for (let i = 1; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - a[i - 1])); return m; };
const bandRatio = (s, f, sr) => { const l = rms(biquad(s.L, 'bp', f, sr, 0.8)), r = rms(biquad(s.R, 'bp', f, sr, 0.8)); return db(l) - db(r); };

const c0 = await census();
info(`graph after start: ${c0.loops} looping sources, context ${c0.state}`);
ok(c0.state === 'running' && c0.loops > 0, 'audio context running after the Begin click; ambience loops built');

// 1. the bed, standing still on the promenade away from people and the road
await tp(14, 45, 0, 0); await page.waitForTimeout(1500);                       // a teleport moves the listener instantly: let it settle
const bed = await rec('bed-promenade', () => page.waitForTimeout(6000));
const bedM = mono(bed);
info(`bed: ${bed.secs.toFixed(1)} s captured, ${bed.gaps} gaps; RMS ${db(rms(bedM)).toFixed(1)} dBFS, peak ${db(peak(bedM)).toFixed(1)} dBFS`);
ok(bed.gaps === 0 && bed.secs > 5, 'continuous capture of the real output');
ok(db(rms(bedM)) > -45 && db(rms(bedM)) < -20, `ambience bed is present but restrained (${db(rms(bedM)).toFixed(1)} dBFS RMS)`);
ok(maxStep(bedM) < 0.05, `no clicks in the bed (largest sample step ${maxStep(bedM).toFixed(4)})`);
ok(onsets(bedM, bed.sr).length <= 1, 'no footsteps while standing still');

// 2. traffic placement: freeze the sim with a vehicle passing at speed near the east kerb,
//    then face north and south at the same spot; the street must swap ears
const passing = await ev(() => new Promise((res) => {
  const b = window.__bund; b.player.teleport(-3.4, 16, 0, 0);
  const t0 = performance.now();
  const f = () => {
    const v = b.traffic.vehicles.find((q) => q.active && q.v > 6 && Math.abs(q.z - 16) < 6 && q.x > -16);
    if (v) { b.freezeTraffic = true; res({ id: v.id, x: v.x, z: v.z, v: v.v }); } else if (performance.now() - t0 > 240000) res(null); else requestAnimationFrame(f);
  };
  f();
}));
ok(!!passing, `caught a vehicle passing close at speed (${passing && passing.id}, ${passing && passing.v.toFixed(1)} m/s)`);
await tp(-3.4, 16, 0, 0); await page.waitForTimeout(800);
const north = await rec('traffic-facing-north', () => page.waitForTimeout(3000));
await tp(-3.4, 16, Math.PI, 0); await page.waitForTimeout(800);
const south = await rec('traffic-facing-south', () => page.waitForTimeout(3000));
const nb = bandRatio(north, 500, north.sr), sb = bandRatio(south, 500, south.sr);
info(`tyre band (500 Hz) left-minus-right: facing north ${nb.toFixed(1)} dB, facing south ${sb.toFixed(1)} dB`);
ok(nb > 2 && sb < -2, 'traffic sits toward the street: left ear facing north, right ear facing south');
ok(db(rms(mono(north))) < -12, `a close passing car stays comfortable (${db(rms(mono(north))).toFixed(1)} dBFS RMS)`);
await ev(() => { window.__bund.freezeTraffic = false; });

// 3. footsteps: stone pavement, asphalt road, and standing still on each
const walk = async (name, x, z, yaw) => {
  await tp(x, z, yaw, 0); await page.waitForTimeout(600);
  const s0 = await census();
  const still = await rec(`${name}-still`, () => page.waitForTimeout(2500));
  const s1 = await census();
  const r = await rec(`${name}-walk`, async () => { await page.keyboard.down('KeyW'); await page.waitForTimeout(6000); await page.keyboard.up('KeyW'); await page.waitForTimeout(300); });
  const s2 = await census();
  return { still, walk: r, stillSteps: s1.steps.stone + s1.steps.asphalt - s0.steps.stone - s0.steps.asphalt, steps: s2.steps, before: s1.steps };
};
const stone = await walk('steps-stone', 0.5, -40, Math.PI);                       // east pavement, walking south
const asph = await walk('steps-asphalt', -40, 1, Math.PI / 2);                   // Hankou Road carriageway, walking west
for (const [label, w, kind] of [['stone', stone, 'stone'], ['asphalt', asph, 'asphalt']]) {
  const n = w.steps[kind] - w.before[kind], other = (kind === 'stone' ? w.steps.asphalt - w.before.asphalt : w.steps.stone - w.before.stone);
  const det = onsets(mono(w.walk), w.walk.sr, { gap: 0.12 }).length, stillDet = onsets(mono(w.still), w.still.sr, { gap: 0.12 }).length;   // heel + toe = one footfall
  info(`${label}: ${n} steps triggered, ${det} onsets heard in ${w.walk.secs.toFixed(1)} s; standing still: ${w.stillSteps} triggered, ${stillDet} heard`);
  ok(n >= 3 && other === 0, `${label}: walking triggers ${label} steps only (${n})`);
  ok(Math.abs(det - n) <= Math.max(1, n * 0.25), `${label}: the recording contains a footfall for each step (${det} onsets vs ${n})`);
  ok(w.stillSteps === 0 && stillDet === 0, `${label}: silence underfoot when standing still`);
  ok(db(peak(mono(w.walk))) < -6, `${label}: footsteps peak at ${db(peak(mono(w.walk))).toFixed(1)} dBFS (comfortable)`);
}
const hfRatio = (s) => db(rms(biquad(mono(s), 'hp', 2500, s.sr))) - db(rms(biquad(mono(s), 'bp', 900, s.sr, 0.7)));
info(`brightness (HF over mid, dB): stone ${hfRatio(stone.walk).toFixed(1)}, asphalt ${hfRatio(asph.walk).toFixed(1)}`);
ok(hfRatio(stone.walk) > hfRatio(asph.walk) + 2, 'stone steps are brighter than asphalt steps (audibly different surfaces)');

// 4. mission cues, by playing: F8, the stall, E to look, E to take it sealed; then F8 again,
//    E to look, S to "break the seal", hold E
await page.keyboard.press('F8'); await page.waitForTimeout(400);
await tp(-56.8, -4.3, 0, -0.42); await page.waitForTimeout(900);
await page.keyboard.press('KeyE'); await page.waitForTimeout(900);
const s3 = await census();
const collect = await rec('cue-collect', async () => { await mark('key'); await page.keyboard.press('KeyE'); await page.waitForTimeout(1500); });
await page.keyboard.press('F8'); await page.waitForTimeout(400);
await tp(-56.8, -4.3, 0, -0.42); await page.waitForTimeout(900);
await page.keyboard.press('KeyE'); await page.waitForTimeout(900);
await page.keyboard.press('KeyS'); await page.waitForTimeout(300);
const tear = await rec('cue-tear', async () => { await page.keyboard.down('KeyE'); await page.waitForFunction(() => window.__bund.mission1.view === 'opened', null, { timeout: 30000 }); await page.keyboard.up('KeyE'); await page.waitForTimeout(1400); });
const s4 = await census();
// breaking the seal at the counter also lifts the pouch: the second run plays both cues
ok(s4.cues.collect - s3.cues.collect === 2 && s4.cues.tear - s3.cues.tear === 1, 'cues fire exactly once per action from real key presses');
const cueStats = (s) => { const m = mono(s), on = onsets(m, s.sr, { hp: 2500, rise: 10, gap: 0.012, win: 0.004 }); return { peak: db(peak(m)), on: on.length, hf: hfRatio(s) }; };
const cs = cueStats(collect), ts = cueStats(tear);
info(`collect: peak ${cs.peak.toFixed(1)} dBFS, ${cs.on} transients, HF/mid ${cs.hf.toFixed(1)} dB; tear: peak ${ts.peak.toFixed(1)} dBFS, ${ts.on} transients, HF/mid ${ts.hf.toFixed(1)} dB`);
ok(cs.peak > -30 && cs.peak < -3 && ts.peak > -30 && ts.peak < -3, 'both cues clearly audible over the bed and below clipping');
ok(ts.on >= cs.on + 4, 'the seal break is granular (many transients); the pickup is a smooth slide (few)');
await page.keyboard.press('KeyE'); await page.waitForTimeout(500);

// 5. ducking under NPC speech: near Old Lin and Ms. Su, line up output level with whether someone is talking
await tp(21.4, -15.0, -Math.PI / 2, 0); await page.waitForTimeout(1000);
const duckRec = await rec('duck-near-npcs', async () => {
  for (let i = 0; i < 90; i++) { await ev(() => { const b = window.__bund, c = b.audio.getContext(); window.__cap.marks.push({ label: b.conversation.isSpeaking ? 1 : 0, frame: Math.round(c.currentTime * c.sampleRate) }); }); await page.waitForTimeout(160); }
});
{
  const m = mono(duckRec), sr = duckRec.sr, win = Math.floor(sr * 0.25);
  const lvl = (frame) => { const i = frame - duckRec.f0; return i > 0 && i + win < m.length ? db(rms(m, i, i + win)) : null; };
  const marks = duckRec.marks, on = [], off = [];
  for (let i = 2; i < marks.length - 2; i++) if (marks.slice(i - 2, i + 3).every((k) => k.label === marks[i].label)) { const v = lvl(marks[i].frame); if (v != null) (marks[i].label ? on : off).push(v); }
  const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  const env20 = envDb(m, sr, 0.02); let worst = 0; for (let i = 1; i < env20.length; i++) worst = Math.max(worst, env20[i - 1] - env20[i]);
  info(`near the pair over ${duckRec.secs.toFixed(0)} s: ${on.length} speaking / ${off.length} quiet state samples`);
  ok(worst < 8, `no abrupt drop: the steepest 20 ms fall is ${worst.toFixed(1)} dB`);
}
// same spot, steady states only: well into a long pause between exchanges (duck released)
// versus well into a spoken line (duck settled). Short gaps between lines stay ducked by design.
const settle = async (cond, ms) => { await page.waitForFunction(cond, null, { timeout: 300000 }); await page.waitForTimeout(ms); };
await settle(() => { const c = window.__bund.conversation; return c.state === 'exchange-pause' && c.pauseRemaining > 2.4; }, 1800);
const quietWin = await rec('duck-quiet', () => page.waitForTimeout(700));
const qState = await ev(() => window.__bund.conversation.state);
await settle(() => window.__bund.conversation.isSpeaking, 1800);
const speakWin = await rec('duck-speaking', () => page.waitForTimeout(700));
const sState = await ev(() => window.__bund.conversation.isSpeaking);
{
  const q = db(rms(mono(quietWin))), sp = db(rms(mono(speakWin)));
  info(`at the railing beside them: between exchanges ${q.toFixed(1)} dBFS (${qState}), during a line ${sp.toFixed(1)} dBFS (speaking=${sState}): ${(sp - q).toFixed(1)} dB`);
  ok(qState === 'exchange-pause' && sState && sp - q < -4 && sp - q > -9, 'environment drops 4-9 dB while they speak (room for the voices), never to silence');
}
const preDlg = await census();
await page.keyboard.press('KeyE'); await page.waitForTimeout(1500);
const dlg = await census();
ok((await ev(() => window.__bund.mode)) === 'dialogue' && dlg.duck < 0.6 && dlg.duck > 0.4, `greeting Old Lin: environment ducked to ${(20 * Math.log10(dlg.duck)).toFixed(1)} dB (was ${(20 * Math.log10(preDlg.duck)).toFixed(1)} dB)`);
await page.keyboard.press('KeyE'); await page.waitForTimeout(600);

// 6. pause / resume: a fade, not a cut; no new loops
const pr = await rec('pause-resume', async () => { await page.waitForTimeout(1500); await mark('pause'); await page.keyboard.press('Escape'); await page.waitForTimeout(1600); await page.keyboard.press('Escape'); await mark('resume'); await page.waitForTimeout(2500); });
{
  const m = mono(pr), sr = pr.sr, e = envDb(m, sr, 0.02);
  const pm = pr.marks.find((k) => k.label === 'pause'), i0 = Math.max(0, Math.floor((pm.frame - pr.f0) / (sr * 0.02)));
  const before = e.slice(Math.max(0, i0 - 10), i0).reduce((a, v) => a + v, 0) / 10, tail = e.slice(i0, i0 + 30);
  const fell = before - Math.min(...tail);
  let steepest = 0; for (let i = i0 + 1; i < i0 + 30 && i < e.length; i++) steepest = Math.max(steepest, e[i - 1] - e[i]);
  info(`pause: level fell ${fell.toFixed(1)} dB within 0.6 s; steepest 20 ms step ${steepest.toFixed(1)} dB; capture gaps while suspended: ${pr.gaps}`);
  ok(fell > 20, 'pausing fades the sound out');
  ok(steepest < 12, 'the fade is smooth (no hard cut)');
  ok(maxStep(m) < 0.08, 'no click at pause or resume');
}
const cPause = await census();
ok(cPause.state === 'running' && cPause.loops === c0.loops, `after resume: running, still ${cPause.loops} loops (no duplicates)`);

// 7. repeated restarts and pauses never duplicate loops
for (let i = 0; i < 4; i++) { await page.keyboard.press('F8'); await page.waitForTimeout(250); await page.keyboard.press('F9'); await page.waitForTimeout(250); }
for (let i = 0; i < 4; i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(700); await page.keyboard.press('Escape'); await page.waitForTimeout(700); }
await ev(() => window.__bund.audio.start());                                     // a second Begin must be harmless
await page.waitForTimeout(800);
const c5 = await census();
ok(c5.loops === c0.loops && c5.vehicleVoices === 7, `after 4 restarts, 4 pause/resume cycles and a repeated start: ${c5.loops} loops, ${c5.vehicleVoices} vehicle voices (unchanged)`);
ok(c5.state === 'running' && c5.pause > 0.95, 'and the sound is back at full level');

// 8. mute (M) silences, unmute restores
await page.keyboard.press('KeyM'); await page.waitForTimeout(900);
const mu = await rec('muted', () => page.waitForTimeout(1200));
await page.keyboard.press('KeyM'); await page.waitForTimeout(900);
ok(db(rms(mono(mu))) < -60, `M mutes the output (${db(rms(mono(mu))).toFixed(1)} dBFS)`);

ok(errors.length === 0, `no console errors (${errors.slice(0, 3).join(' | ')})`);
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
await browser.close();
process.exit(failed ? 1 : 0);
