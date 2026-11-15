// Dev tool: clear -> drizzle -> clear in the real page. Screenshots + pixel statistics, covered
// places, skyline / notice readability, the rain loop in the real audio output (and its ducking),
// resource counts across repeated toggles, interaction / collision in the rain, and frame cost.
//   NODE_PATH=$(npm root -g) node tools/weathertest.mjs [url] [outDir]
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
const { chromium } = createRequire(import.meta.url)('playwright');
const [url = 'http://localhost:5173/', out = '.'] = process.argv.slice(2);
let failed = 0;
const ok = (c, msg) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`); if (!c) failed++; };
const info = (m) => console.log(`INFO  ${m}`);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url + '?q=3&nolock&dev', { waitUntil: 'load' });
await page.waitForFunction(() => window.__bund, null, { timeout: 180000 });
await page.evaluate(() => { window.__bund.freezeShow = true; });   // hold the light shows still (the Pearl's colours, LED façades): this compares looks
await page.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 240000 });
await page.click('#begin'); await page.waitForTimeout(2500);
const ev = (f, a) => page.evaluate(f, a);
const frames = (n = 3) => ev((n) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
const tp = async (x, z, yaw, pitch = 0) => { await ev(([x, z, y, p]) => window.__bund.player.teleport(x, z, y, p), [x, z, yaw, pitch]); await frames(4); };
const ff = (sec) => ev((sec) => { const w = window.__bund.weather; for (let i = 0; i < sec * 10; i++) w.update(0.1); }, sec);   // fast-forward the weather clock
const state = () => ev(() => {
  const b = window.__bund, r = b.R.renderer, rain = b.scene.getObjectByName('rain');
  let objects = 0; b.scene.traverse(() => objects++);
  const a = b.audio.census();
  const sky = b.scene.getObjectByName('sky');
  return { skyHaze: sky.material.uniforms.haze.value, target: b.weather.target, rain: b.weather.rain, haze: b.weather.haze, wet: b.weather.wet, fogD: b.scene.fog.density, fogC: b.scene.fog.color.getHex(),
    rainVisible: rain.visible, geos: r.info.memory.geometries, texs: r.info.memory.textures, programs: r.info.programs.length, objects, loops: a.loops, rainGain: a.rainGain };
});
const shot = async (name) => { await ev(() => { document.getElementById('hud').style.visibility = 'hidden'; }); await frames(4); await page.screenshot({ path: `${out}/wx-${name}.png` }); await ev(() => { document.getElementById('hud').style.visibility = ''; }); return `${out}/wx-${name}.png`; };
// pixel statistics in python (PIL): mean abs difference, region contrast, tinted-pixel counts
const py = (code) => JSON.parse(execFileSync('python3', ['-I', '-c', code]).toString());
const meanDiff = (a, b) => py(`
from PIL import Image, ImageChops, ImageStat; import json
a=Image.open('${a}').convert('L'); b=Image.open('${b}').convert('L')
print(json.dumps(ImageStat.Stat(ImageChops.difference(a,b)).mean[0]))`);
const contrast = (p, box) => py(`
from PIL import Image, ImageStat; import json
im=Image.open('${p}').convert('L').crop(tuple(${JSON.stringify(box)}))
print(json.dumps(ImageStat.Stat(im).stddev[0]))`);
const regionMean = (p, box) => py(`
from PIL import Image, ImageStat; import json
print(json.dumps(ImageStat.Stat(Image.open('${p}').convert('L').crop(tuple(${JSON.stringify(box)}))).mean[0]))`);
const tinted = (p, box) => py(`
from PIL import Image; import json
im=Image.open('${p}').convert('RGB').crop(tuple(${JSON.stringify(box)}))
px=list(im.get_flattened_data() if hasattr(im,'get_flattened_data') else im.getdata()); n=sum(1 for r,g,b in px if g > 120 and g > r + 60 and g > b + 60)
print(json.dumps(n / max(1, len(px))))`);

await ev(() => { window.__bund.freezeTraffic = true; });
const VISTA = [11, 0, -Math.PI / 2 + 0.18, 0.12], NOTICE = [22.9, 10.9, -Math.PI / 2 - 0.55, -0.05];
const base = await state();
info(`clear: fog ${base.fogD} #${base.fogC.toString(16)}, ${base.geos} geometries, ${base.texs} textures, ${base.programs} programs, ${base.objects} objects, ${base.loops} audio loops`);
ok(!base.rainVisible && base.rain === 0 && base.wet === 0, 'starts clear: no rain drawn, no extra wetness');

// --- baseline frames (twice, for the noise floor of moving water / lights) ---
await tp(...VISTA); const A = await shot('vista-clear'); await page.waitForTimeout(1500); const A2 = await shot('vista-clear-again');
await tp(...NOTICE); const NA = await shot('notice-clear');
const floor = meanDiff(A, A2);

// --- the transition, in steps, through the developer key ---
await page.keyboard.press('F7'); await frames(2);
ok((await state()).target === 'drizzle', 'F7 starts the drizzle');
let prev = 0, monotonic = true; const steps = [];
for (let i = 0; i < 8; i++) { await ff(2.5); const s = await state(); steps.push(s.rain.toFixed(2)); if (s.rain < prev - 1e-9) monotonic = false; prev = s.rain; }
info(`rain level every 2.5 s of weather time: ${steps.join(' ')}`);
ok(monotonic && Number(steps[0]) < 0.25 && Number(steps[7]) > 0.9, 'drizzle builds gradually');
await tp(...VISTA); await ff(4);
const mid = await state();
await ff(60);
const full = await state();
ok(full.rain === 1 && full.haze === 1 && full.wet === 1 && full.rainVisible, 'full drizzle: rain drawn, haze and wetness at full');
ok(full.fogD > base.fogD && full.fogD < base.fogD * 1.5, `haze is subtle (fog density ${base.fogD} -> ${full.fogD.toFixed(5)})`);
const D = await shot('vista-drizzle');
const dDiff = meanDiff(A, D);
// skyline band: Pudong towers across the river, upper middle of the frame
const SKY = [300, 90, 960, 250];
const cA = contrast(A, SKY), cD = contrast(D, SKY);
info(`skyline contrast (luma std dev): clear ${cA.toFixed(1)}, drizzle ${cD.toFixed(1)} (${(100 * (cD / cA - 1)).toFixed(0)}%)`);
ok(cD > cA * 0.7, 'skyline stays readable (contrast kept above 70%)');
await tp(...NOTICE); const ND = await shot('notice-drizzle');
// the poster itself: project its centre to the screen and take a box around it
const NBOX = await ev(() => {
  const b = window.__bund, f = b.scene.getObjectByName('clue-poster').getWorldPosition(new b.THREE.Vector3()).project(b.camera);
  const x = (f.x * 0.5 + 0.5) * innerWidth, y = (-f.y * 0.5 + 0.5) * innerHeight;
  return [Math.round(x - 45), Math.round(y - 70), Math.round(x + 45), Math.round(y + 70)];
});
const nA = contrast(NA, NBOX), nD = contrast(ND, NBOX);
info(`notice region contrast: clear ${nA.toFixed(1)}, drizzle ${nD.toFixed(1)}`);
ok(nD > nA * 0.8, 'the missing-person notice stays legible');
const tgt = await ev(() => window.__bund.target && window.__bund.target.id);
ok(tgt === 'notice', 'the notice is still targetable in the rain');
await page.keyboard.press('KeyE'); await frames(3);
ok((await ev(() => window.__bund.mode)) === 'inspect', 'and E still opens it');
await page.keyboard.press('KeyE'); await frames(3);

// --- covered places, checked on the GPU: render ONLY the rain from straight above into a float
//     target whose pixels hold each drop fragment's world position, read it back, and test every
//     visible fragment against the roofs. Many moments in time, with the drop box centred on the roof.
const gpuCover = (cover, tag) => ev(([c, tag]) => {
  const b = window.__bund, T = b.THREE, r = b.R.renderer, mesh = b.scene.getObjectByName('rain'), mat = mesh.material;
  const dbg = new T.ShaderMaterial({ vertexShader: mat.vertexShader, uniforms: mat.uniforms, depthTest: false, depthWrite: false,
    fragmentShader: 'varying float vA; varying vec3 vP; void main(){ if (vA < 0.004) discard; gl_FragColor = vec4(vP, 1.0); }' });
  const S = 256, rt = new T.WebGLRenderTarget(S, S, { type: T.FloatType });
  const cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2, half = Math.max(c.x1 - c.x0, c.z1 - c.z0) / 2 + 4;
  const cam = new T.OrthographicCamera(-half, half, half, -half, 0.1, 200);
  cam.position.set(cx, 100, cz); cam.up.set(0, 0, -1); cam.lookAt(cx, 0, cz); cam.layers.enableAll(); cam.updateMatrixWorld();
  const prev = { m: mesh.material, v: mesh.visible, t: mat.uniforms.time.value, rain: mat.uniforms.rain.value, cam: mat.uniforms.cam.value.clone() };
  mesh.material = dbg; mesh.visible = true; mat.uniforms.rain.value = 1;
  const px = new Float32Array(S * S * 4);
  let inside = 0, aside = 0, total = 0;
  for (let k = 0; k < 60; k++) {
    mat.uniforms.time.value = 1000 + k * 0.37;
    // the drop box follows a "player" standing beside the roof, eye height
    mat.uniforms.cam.value.set(cx + (k % 3 - 1) * 2, (c.top > 5 ? 1.83 : 1.98), c.z1 + 1.5 + (k % 2));
    r.setRenderTarget(rt); r.setClearColor(0x000000, 0); r.clear(); r.render(mesh, cam);
    r.readRenderTargetPixels(rt, 0, 0, S, S, px);
    for (let i = 0; i < S * S; i++) {
      if (px[i * 4 + 3] < 0.5) continue;
      const x = px[i * 4], y = px[i * 4 + 1], z = px[i * 4 + 2];
      total++;
      const inFoot = x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1;
      if (inFoot && y < c.top) inside++;
      // the same footprint shifted sideways (open air), same heights
      const w = c.x1 - c.x0;
      if (x > c.x1 + 0.2 && x < c.x1 + 0.2 + Math.min(w, 3) && z > c.z0 && z < c.z1 && y < c.top) aside++;
    }
  }
  r.setRenderTarget(null);
  mesh.material = prev.m; mesh.visible = prev.v; mat.uniforms.time.value = prev.t; mat.uniforms.rain.value = prev.rain; mat.uniforms.cam.value.copy(prev.cam);
  rt.dispose(); dbg.dispose();
  return { inside, aside, total, tag };
}, [cover, tag]);
for (const c of [{ x0: -71.7, x1: -66.7, z0: -6.5, z1: -5.48, top: 3.75, name: 'shop canopy' }, { x0: -34.0, x1: -31.0, z0: 18.0, z1: 36.0, top: 13.35, name: 'Customs portico' }]) {
  const g = await gpuCover(c, c.name);
  info(`${c.name}: ${g.total} visible drop fragments sampled; ${g.inside} under the roof, ${g.aside} in the same-sized open patch beside it`);
  ok(g.aside > 50 && g.inside === 0, `no rain drawn under the ${c.name} (checked on the GPU)`);
}
await tp(-68.0, -1.6, 0.35, 0.3); await shot('canopy');                              // for a visual check
const under = await ev(() => { window.__bund.player.teleport(-69.2, -5.9, Math.PI, 0); return true; });
await frames(4); await page.waitForTimeout(2500);                                    // gain eases (0.4 s time constant)
const cov = await state();
await tp(-69.2, -3.0, Math.PI, 0); await page.waitForTimeout(2500);
const open = await state();
ok(under && cov.rainGain < open.rainGain * 0.75, `the rain loop is quieter under the canopy (${cov.rainGain.toFixed(3)} vs ${open.rainGain.toFixed(3)})`);

// --- rain in the real audio output, and NPC speech still comes first ---
await ev(async () => {
  const a = window.__bund.audio, ctx = a.getContext();
  const code = `class Cap extends AudioWorkletProcessor { constructor(){super();this.b=[];this.n=0;} process(i){const x=i[0];if(x&&x.length){this.b.push(x[0].slice());this.n+=x[0].length;if(this.n>=4096){const o=new Float32Array(this.n);let k=0;for(const c of this.b){o.set(c,k);k+=c.length;}this.port.postMessage(o);this.b=[];this.n=0;}}return true;} } registerProcessor('cap2',Cap);`;
  await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([code], { type: 'application/javascript' })));
  const node = new AudioWorkletNode(ctx, 'cap2'); const sink = ctx.createGain(); sink.gain.value = 0;
  a.output.connect(node); node.connect(sink).connect(ctx.destination);
  window.__capNode = node;
  window.__cap2 = { on: false, chunks: [] }; node.port.onmessage = (e) => { if (window.__cap2.on) window.__cap2.chunks.push(e.data); };
});
const hiss = (ms) => ev((ms) => new Promise((res) => {
  window.__cap2.chunks = []; window.__cap2.on = true;
  setTimeout(() => {
    window.__cap2.on = false;
    const ch = window.__cap2.chunks, n = ch.reduce((s, c) => s + c.length, 0), x = new Float32Array(n); let k = 0; for (const c of ch) { x.set(c, k); k += c.length; }
    // crude high band (first difference ~ +6 dB/oct above a few kHz) and full-band RMS
    let e = 0, h = 0; for (let i = 1; i < n; i++) { e += x[i] * x[i]; const d = x[i] - x[i - 1]; h += d * d; }
    res({ rms: 20 * Math.log10(Math.sqrt(e / n) + 1e-9), hi: 20 * Math.log10(Math.sqrt(h / n) + 1e-9) });
  }, ms);
}), ms);
await tp(14, 45, 0, 0); await page.waitForTimeout(1200);
const wetAudio = await hiss(2500);
await page.keyboard.press('F7'); await ff(200); await frames(3); await page.waitForTimeout(1500);
const dryAudio = await hiss(2500);
info(`output at the promenade: drizzle ${wetAudio.rms.toFixed(1)} dBFS (high band ${wetAudio.hi.toFixed(1)}), clear ${dryAudio.rms.toFixed(1)} dBFS (high band ${dryAudio.hi.toFixed(1)})`);
ok(wetAudio.hi - dryAudio.hi > 3, 'the rain loop is audible as added high-frequency hiss');
ok(wetAudio.rms - dryAudio.rms < 4 && wetAudio.rms < -18, 'and it stays restrained (overall level barely rises)');
await page.keyboard.press('F7'); await ff(200);
await ev(() => window.__bund.player.teleport(21.4, -15, -Math.PI / 2, 0)); await frames(4);
await page.waitForFunction(() => { const c = window.__bund.conversation; return c.state === 'exchange-pause' && c.pauseRemaining > 2.4; }, null, { timeout: 300000 });
await page.waitForTimeout(1800);
// people's recorded voices now play through the mix too (engine/voice.js): measure the environment
// bus after the duck, which is what has to step back
await ev(() => { const a = window.__bund.audio; a.output.disconnect(window.__capNode); a.getMusicBus().connect(window.__capNode); });
const q = await hiss(700);
await page.waitForFunction(() => window.__bund.conversation.isSpeaking, null, { timeout: 300000 }); await page.waitForTimeout(1800);
const sp = await hiss(700);
info(`beside the NPCs in drizzle, environment bus: between exchanges ${q.rms.toFixed(1)} dBFS, during a line ${sp.rms.toFixed(1)} dBFS`);
ok(sp.rms - q.rms < -3.5, 'rain and ambience still step back while they speak');

// --- back to clear: exact restoration ---
await page.keyboard.press('F7'); await ff(240); await frames(4); await page.waitForTimeout(3000);
const back = await state();
ok(back.target === 'clear' && back.rain === 0 && back.haze === 0 && back.wet === 0 && !back.rainVisible, 'clear again: levels at zero, rain not drawn');
ok(back.fogD === base.fogD && back.fogC === base.fogC && back.skyHaze === 0 && (await ev(() => window.__bund.weather && 1)) && back.wet === 0, 'fog density, fog colour, sky veil and ground wetness exactly back to the clear values');
ok(back.rainGain < 1e-3, `rain loop silent (${back.rainGain.toExponential(1)})`);
await tp(...VISTA); const R = await shot('vista-restored');
info(`whole-frame mean luma difference from the first clear frame: 1.5 s later ${floor.toFixed(2)}, drizzle ${dDiff.toFixed(2)}, restored ${meanDiff(A, R).toFixed(2)} (clouds / water / NPCs keep moving)`);
// the two regions the weather changes: wet deck (lower frame) and the hazy horizon band
const GROUND = [0, 400, 960, 540], HORIZON = [0, 200, 960, 300];
for (const [name, box] of [['deck', GROUND], ['horizon', HORIZON]]) {
  const a = regionMean(A, box), d = regionMean(D, box), r = regionMean(R, box);
  info(`${name} mean luma: clear ${a.toFixed(1)}, drizzle ${d.toFixed(1)}, restored ${r.toFixed(1)}`);
  ok(Math.abs(r - a) <= Math.max(1.0, Math.abs(d - a) * 0.25), `${name}: restored to the clear look`);
}

// --- repeated toggles: nothing accumulates ---
for (let i = 0; i < 12; i++) { await page.keyboard.press('F7'); await ff(3 + (i % 4) * 5); await frames(2); }
if ((await state()).target !== 'clear') await page.keyboard.press('F7');
await ff(300); await frames(4);
const after = await state();
info(`after 12 toggles: ${after.geos} geometries, ${after.texs} textures, ${after.programs} programs, ${after.objects} objects, ${after.loops} audio loops`);
ok(after.geos === back.geos && after.texs === back.texs && after.programs === back.programs && after.objects === base.objects && after.loops === base.loops, 'no geometries, textures, shader programs, scene objects or audio loops accumulate');
ok(after.fogD === base.fogD && after.rain === 0 && after.wet === 0, 'and it settles exactly clear');

// --- collision in the rain ---
await page.keyboard.press('F7'); await ff(60);
await tp(-60, 3, Math.PI, 0);
await page.keyboard.down('ShiftLeft'); await page.keyboard.down('KeyW');
await page.waitForFunction(() => window.__bund.player.body.hit === 'customs', null, { timeout: 30000 }).catch(() => {});
await page.keyboard.up('KeyW'); await page.keyboard.up('ShiftLeft');
const z = await ev(() => window.__bund.player.body.z);
ok(z < 6.3 && z > 5.9, `walls still stop the player in the rain (z=${z.toFixed(2)})`);

// --- frame cost: clear vs full drizzle, same views, same session ---
const cost = (view) => ev((v) => new Promise((res) => {
  const b = window.__bund; b.player.teleport(...v);
  const gl = b.R.renderer.getContext(), px = new Uint8Array(4); let n = -3, t0 = 0;
  const f = () => { gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const t = performance.now(); n++; if (n === 0) t0 = t; if (n >= 4) res((t - t0) / n); else requestAnimationFrame(f); };
  requestAnimationFrame(f);
}), view);
for (const [name, v] of [['vista', VISTA], ['street', [-62, 1.5, -Math.PI / 2 + 0.75, 0.05]]]) {
  const r = { clear: [], drizzle: [] };
  for (let k = 0; k < 3; k++) for (const wx of ['clear', 'drizzle']) { await ev((w) => window.__bund.weather.set(w, { instant: true }), wx); r[wx].push(await cost(v)); }
  const med = (a) => a.sort((p, q2) => p - q2)[1];
  info(`${name}: clear ${med(r.clear).toFixed(0)} ms/frame, drizzle ${med(r.drizzle).toFixed(0)} ms/frame (${(100 * (med(r.drizzle) / med(r.clear) - 1)).toFixed(1)}%) [software GL]`);
}
const calls = await ev(() => new Promise((res) => { const b = window.__bund; b.weather.set('drizzle', { instant: true }); requestAnimationFrame(() => requestAnimationFrame(() => { const on = b.R.renderer.info.render.calls; b.weather.set('clear', { instant: true }); requestAnimationFrame(() => requestAnimationFrame(() => res({ on, off: b.R.renderer.info.render.calls }))); })); }));
info(`draw calls: drizzle ${calls.on}, clear ${calls.off} (+${calls.on - calls.off})`);
ok(calls.on - calls.off <= 1, 'the drizzle costs at most one extra draw call');
ok(errors.length === 0, `no console errors (${errors.slice(0, 3).join(' | ')})`);
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
await browser.close();
process.exit(failed ? 1 : 0);
