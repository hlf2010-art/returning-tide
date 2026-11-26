// Graphics settings (src/engine/gfx.js): presets, GPU detection, custom tweaks, the frame cap. npm test.
import { PRESETS, LOD, presetForGpu, resolve, tweak, shouldDraw, treeStep, loadGfx, saveGfx, CROWD_LEVELS, loadCrowd, saveCrowd, crowdCounts } from '../src/engine/gfx.js';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
ok(presetForGpu('ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 SUPER (0x00002702) Direct3D11 vs_5_0 ps_5_0, D3D11)') === 'ultra', 'RTX 4080 SUPER -> ultra');
ok(presetForGpu('ANGLE (Apple, ANGLE Metal Renderer: Apple M4, Unspecified Version)') === 'mac', 'Apple M4 (Chrome) -> mac');
ok(presetForGpu('Apple GPU') === 'mac', 'Safari\'s masked "Apple GPU" -> mac');
ok(presetForGpu('ANGLE (Apple, ANGLE Metal Renderer: Apple M4 Pro, Unspecified Version)') === 'high', 'Apple M4 Pro -> high');
ok(presetForGpu('ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Laptop GPU Direct3D11)') === 'high', 'RTX 4060 -> high, not ultra');
ok(presetForGpu('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)') === 'low', 'software GL -> low');
ok(presetForGpu('ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11)') === 'low', 'integrated Intel -> low');
for (const [k, p] of Object.entries(PRESETS)) {
  const g = resolve({ preset: k });
  ok(g.preset === k && g.scale === p.scale && g.lod === p.lod && LOD[g.lod], `preset ${k} resolves as itself`);
}
const ladder = ['low', 'mac', 'high', 'ultra'].map((k) => PRESETS[k]);
ok(ladder.every((p, i) => !i || (p.scale >= ladder[i - 1].scale && LOD[p.lod].crowd > LOD[ladder[i - 1].lod].crowd)), 'each preset draws at least as many pixels and more people than the one below');
const t = tweak(resolve({ preset: 'mac' }), 'scale', 1.1);
ok(t.preset === 'custom' && t.scale === 1.1 && t.lod === 'medium' && t.fps === 60, 'changing one setting keeps the rest and makes it custom');
ok(tweak(t, 'preset', 'ultra').scale === 1.25, 'choosing a preset again resets everything to it');
ok(resolve({ preset: 'custom', scale: 9, fps: 47, msaa: 3, shadows: 9, lod: 'x' }).scale === 1.5, 'out-of-range values are clamped');
const bad = resolve({ preset: 'custom', fps: 47, msaa: 3, shadows: 9, lod: 'x' });
ok(bad.fps === 60 && bad.msaa === 0 && bad.shadows === 2 && bad.lod === 'medium', 'and unknown ones fall back');
// the cap: 60 on a 60 Hz screen never drops a frame; 30 draws every other one
ok([16.4, 16.7, 17.0].every((d) => shouldDraw(d, 60)), '60 fps cap keeps every 60 Hz frame');
ok(!shouldDraw(16.7, 30) && shouldDraw(33.3, 30), '30 fps cap draws every other 60 Hz frame');
ok(shouldDraw(1, 0), 'no cap: always draw');
ok(treeStep(resolve({ preset: 'ultra' })) === 0 && treeStep(resolve({ preset: 'low' })) > 2, 'tree detail follows the level of detail');
// saved settings
const mem = new Map(), store = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
ok(loadGfx('Apple GPU', store).preset === 'mac' && loadGfx('Apple GPU', store).detected, 'first run: picked for the GPU');
saveGfx(t, store);
ok(loadGfx('RTX 4090', store).scale === 1.1 && loadGfx('RTX 4090', store).preset === 'custom', 'after that: what you chose, whatever the GPU says');
// Crowds: its own setting, saved on its own
const cs = new Map(), cstore = { getItem: (k) => cs.get(k) ?? null, setItem: (k, v) => cs.set(k, v) };
ok(loadCrowd(cstore) === 'medium', 'Crowds: medium until chosen');
ok(saveCrowd('low', cstore) && loadCrowd(cstore) === 'low' && !saveCrowd('huge', cstore) && loadCrowd(cstore) === 'low', 'Crowds: a choice is kept between sessions; nonsense is refused');
saveGfx(resolve({ preset: 'mac' }), cstore);
ok(loadGfx('Apple GPU', cstore).preset === 'mac' && loadCrowd(cstore) === 'low', 'Crowds: choosing it leaves the graphics preset as it was');
const lo = crowdCounts('medium', 'low'), me = crowdCounts('medium', 'medium'), hi = crowdCounts('medium', 'high');
ok(me.people === LOD.medium.people && me.throng === LOD.medium.throng && me.nearPeople === LOD.medium.nearPeople && me.mid === LOD.medium.mid, 'Crowds medium: the level of detail\'s own numbers');
ok(['people', 'throng', 'nearPeople', 'mid'].every((k) => lo[k] < me[k] && me[k] < hi[k]), 'Crowds low < medium < high for the throng, the crowd, the full people and the middle tier');
ok(lo.throng <= me.throng * 0.35 && lo.nearPeople >= 3 && Object.keys(CROWD_LEVELS).join() === 'low,medium,high', 'low is a real step down (about a third of the throng), never fewer than 3 full people');
console.log(failed ? `\n${failed} FAILED` : '\nall passed'); process.exit(failed ? 1 : 0);
