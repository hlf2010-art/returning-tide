// Dev tool: the living city's cost at fixed views, for before/after comparisons
// (docs/living-city-architecture.md §9). Per view: draw calls and triangles per frame (all passes),
// the people and vehicles drawn, and memory: textures and geometry reachable from the scene
// (estimated from their sizes, as in §9), the GPU objects three.js holds, and the JS heap after a GC.
//   node tools/perfprobe.mjs <url> <out.json> [view,view,...] [extra query]
// The clock is held at 20:00, preset mac, as drawprobe.mjs.
import { createRequire } from 'module';
import { writeFileSync } from 'fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const [url = 'http://localhost:4173/', out = 'perf.json', only = '', extra = ''] = process.argv.slice(2);
const VIEWS = {
  promenade: [16, -30, 0, 0],
  crossing: [-20, 3.5, -Math.PI / 2, 0.05],
  nanjing: [-60, -201, Math.PI / 2, 0],
  hankou: [-60, 1.5, -Math.PI / 2, 0.05],
  road: [21, -60, Math.PI, 0.02],              // the promenade looking south down Zhongshan Road at night
};
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--expose-gc'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const cdp = await page.context().newCDPSession(page);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const t0 = Date.now();
await page.goto(url + (url.includes('?') ? '&' : '?') + 'gfx=mac&hour=20&fresh&life=0&nolock&tips=0' + (extra ? '&' + extra : ''), { waitUntil: 'load' });
await page.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 300000 });
const loadSec = (Date.now() - t0) / 1000;
await page.evaluate((DEEP) => {
  const B = window.__bund; B.start(); B.dtMax = 0.25;
  const r = B.R.renderer, orig = r.renderBufferDirect.bind(r);
  B.__draws = null;
  r.renderBufferDirect = function (cam, scene, geo, mat, obj, group) {
    const D = B.__draws;
    if (D) {
      let o = obj; while (o.parent && o.parent.type !== 'Scene') o = o.parent;
      const k0 = o.name || o.type || '?', k = (DEEP || '').split(',').includes(k0) ? `${k0}/${obj.name || (obj.parent && obj.parent.name) || obj.type}` : k0;
      D.total++; D.by[k] = (D.by[k] || 0) + 1; if (obj.isSkinnedMesh) D.skinned++;
      const rt = r.getRenderTarget(), pk = cam.isOrthographicCamera || (rt && rt.depthTexture && !rt.texture) ? 'shadow' : rt && B.world && B.world.river && rt === B.world.river.target ? 'mirror' : 'main';
      D.pass[pk] = (D.pass[pk] || 0) + 1; if (pk === 'mirror') D.mirror[k] = (D.mirror[k] || 0) + 1;
      const n = geo.index ? geo.index.count : geo.attributes.position ? geo.attributes.position.count : 0;
      D.tris += (obj.isMesh ? n / 3 : 0) * (geo.isInstancedBufferGeometry ? geo.instanceCount : obj.isInstancedMesh ? obj.count : 1);
    }
    return orig(cam, scene, geo, mat, obj, group);
  };
  // memory reachable from the scene, estimated from sizes (as in the architecture document, §9)
  B.__mem = () => {
    const texs = new Set(), attrs = new Set();
    const addTex = (t) => { if (t && t.isTexture) texs.add(t); };
    B.scene.traverse((o) => {
      if (o.geometry) {
        const g = o.geometry;
        for (const a of Object.values(g.attributes)) attrs.add(a.isInterleavedBufferAttribute ? a.data : a);
        if (g.index) attrs.add(g.index);
        for (const list of Object.values(g.morphAttributes || {})) for (const a of list) attrs.add(a);
      }
      if (o.isInstancedMesh) { attrs.add(o.instanceMatrix); if (o.instanceColor) attrs.add(o.instanceColor); }
      if (o.isSkinnedMesh && o.skeleton && o.skeleton.boneTexture) addTex(o.skeleton.boneTexture);
      const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const m of mats) {
        for (const v of Object.values(m)) addTex(v);
        if (m.uniforms) for (const u of Object.values(m.uniforms)) { const v = u && u.value; if (Array.isArray(v)) v.forEach(addTex); else addTex(v); }
      }
    });
    addTex(B.scene.environment); addTex(B.scene.background);
    let tex = 0, big = 0;
    for (const t of texs) {
      const im = t.image || {}; const w = im.width || (t.source && t.source.data && t.source.data.width) || 0, h = im.height || (t.source && t.source.data && t.source.data.height) || 0;
      const d = (im.depth || 1);
      const bpp = t.type === 1015 ? 16 : t.type === 1016 ? 8 : 4;    // Float / HalfFloat RGBA, else 8-bit
      const b = w * h * d * bpp * (t.generateMipmaps !== false && t.minFilter !== 1006 && t.minFilter !== 1003 ? 1.33 : 1);
      tex += b; if (b > 3e6) big++;
    }
    let geo = 0; for (const a of attrs) geo += a.array ? a.array.byteLength : 0;
    const info = B.R.renderer.info.memory;
    return { textures: texs.size, textureMB: Math.round(tex / 1048576), bigTextures: big, geometryMB: Math.round(geo / 1048576), glTextures: info.textures, glGeometries: info.geometries };
  };
}, process.env.DEEP || "");
await page.waitForTimeout(5000);
const names = only ? only.split(',') : Object.keys(VIEWS);
const result = { loadSec, views: {} };
for (const n of names) {
  await page.evaluate(([x, z, yaw, pitch]) => window.__bund.player.teleport(x, z, yaw, pitch), VIEWS[n]);
  await page.waitForTimeout(4000);
  const frames = [];
  for (let k = 0; k < 6; k++) {
    frames.push(await page.evaluate(() => new Promise((res) => {
      const B = window.__bund; B.__draws = { total: 0, skinned: 0, tris: 0, by: {}, pass: {}, mirror: {} };
      requestAnimationFrame(() => requestAnimationFrame(() => { const d = B.__draws; B.__draws = null; res(d); }));
    })));
  }
  const cpu = await page.evaluate(() => new Promise((res) => { const out = []; const tick = () => { out.push(window.__bund.lastCpu); if (out.length < 30) requestAnimationFrame(tick); else { out.sort((a, b) => a - b); res({ median: +out[15].toFixed(1), mean: +(out.reduce((s, v) => s + v, 0) / out.length).toFixed(1) }); } }; requestAnimationFrame(tick); }));
  const avg = (f) => Math.round(frames.reduce((s, d) => s + f(d), 0) / frames.length / 2);
  const keys = new Set(frames.flatMap((d) => Object.keys(d.by)));
  const by = Object.fromEntries([...keys].map((k) => [k, avg((d) => d.by[k] || 0)]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]));
  const crowd = await page.evaluate(() => { const w = window.__bund.world; const s = w.crowdView ? { ...w.crowdView.stats } : {}; if (w.fleet) s.fleet = { ...w.fleet.stats }; return s; });
  const live = await page.evaluate(() => { const s = window.__bund.live && window.__bund.live(); return s ? { people: s.people, vehicles: s.vehicles } : null; });
  const passes = Object.fromEntries(['main', 'shadow', 'mirror'].map((k) => [k, avg((d) => d.pass[k] || 0)]));
  const mk = new Set(frames.flatMap((d) => Object.keys(d.mirror)));
  const mirror = Object.fromEntries([...mk].map((k) => [k, avg((d) => d.mirror[k] || 0)]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 8));
  result.views[n] = { cpu, passes, mirror, draws: avg((d) => d.total), skinned: avg((d) => d.skinned), tris: avg((d) => d.tris), crowd, live, by };
  console.log(`${n}: ${result.views[n].draws} draws (${result.views[n].skinned} skinned), ${(result.views[n].tris / 1e6).toFixed(2)} M tris, cpu ${JSON.stringify(cpu)} passes ${JSON.stringify(passes)} crowd ${JSON.stringify(crowd)}\n   mirror: ${JSON.stringify(mirror)}\n   top: ${Object.entries(by).slice(0, 6).map(([k, v]) => `${k} ${v}`).join(', ')}`);
}
// memory after walking every view
await page.evaluate(() => window.gc && window.gc());
await cdp.send('HeapProfiler.collectGarbage');
const { metrics } = await cdp.send('Performance.getMetrics').catch(() => ({ metrics: [] }));
await cdp.send('Performance.enable');
const m2 = (await cdp.send('Performance.getMetrics')).metrics;
const heap = (m2.find((m) => m.name === 'JSHeapUsedSize') || {}).value || 0;
result.memory = { ...(await page.evaluate(() => window.__bund.__mem())), jsHeapMB: Math.round(heap / 1048576) };
console.log('memory', JSON.stringify(result.memory), 'load', loadSec.toFixed(1), 's');
writeFileSync(out, JSON.stringify(result, null, 1));
console.log(errors.slice(0, 10).join('\n') || 'no page errors');
await browser.close();
