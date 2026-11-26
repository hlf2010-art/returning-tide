// Dev tool: draw calls per frame at fixed views, attributed to the scene's top-level groups, and a
// screenshot of each view (the living-city Phase 0 before/after; docs/living-city-architecture.md §9).
//   node tools/drawprobe.mjs <url> <outDir> [view,view,...]
// Writes <outDir>/<view>.png and <outDir>/draws.json; prints a summary. The clock is held at 20:00.
import { createRequire } from 'module';
import { writeFileSync, mkdirSync } from 'fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const [url = 'http://localhost:4173/', out = '.', only = ''] = process.argv.slice(2);
// [x, z, yaw, pitch], as in §9
const VIEWS = {
  promenade: [16, -30, 0, 0],
  crossing: [-20, 3.5, -Math.PI / 2, 0.05],
  nanjing: [-60, -201, Math.PI / 2, 0],
  hankou: [-60, 1.5, -Math.PI / 2, 0.05],
};
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url + (url.includes('?') ? '&' : '?') + 'gfx=mac&hour=20&fresh&life=0&nolock&tips=0', { waitUntil: 'load' });
await page.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 240000 });
await page.evaluate(() => {
  const B = window.__bund; B.start(); B.dtMax = 0.25;
  // count every draw by the scene's top-level group it belongs to, and whether it is skinned
  const r = B.R.renderer, orig = r.renderBufferDirect.bind(r);
  B.__draws = null;
  r.renderBufferDirect = function (cam, scene, geo, mat, obj, group) {
    const D = B.__draws;
    if (D) {
      let o = obj; while (o.parent && o.parent.type !== 'Scene') o = o.parent;
      const k = o.name || o.type || '?';
      D.total++; D.by[k] = (D.by[k] || 0) + 1; if (obj.isSkinnedMesh) D.skinned++;
    }
    return orig(cam, scene, geo, mat, obj, group);
  };
});
await page.waitForTimeout(4000);
const names = only ? only.split(',') : Object.keys(VIEWS);
const result = {};
for (const n of names) {
  await page.evaluate(([x, z, yaw, pitch]) => window.__bund.player.teleport(x, z, yaw, pitch), VIEWS[n]);
  await page.waitForTimeout(3500);
  const frames = [];
  for (let k = 0; k < 6; k++) {
    frames.push(await page.evaluate(() => new Promise((res) => {
      const B = window.__bund; B.__draws = { total: 0, skinned: 0, by: {} };
      requestAnimationFrame(() => requestAnimationFrame(() => { const d = B.__draws; B.__draws = null; d.tris = B.R.renderer.info.render.triangles; res(d); }));
    })));
  }
  // a frame is two rAFs here: halve, and average over the samples
  const avg = (f) => Math.round(frames.reduce((s, d) => s + f(d), 0) / frames.length / 2);
  const keys = new Set(frames.flatMap((d) => Object.keys(d.by)));
  const by = Object.fromEntries([...keys].map((k) => [k, avg((d) => d.by[k] || 0)]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]));
  result[n] = { draws: avg((d) => d.total), skinned: avg((d) => d.skinned), by };
  await page.screenshot({ path: `${out}/${n}.png` });
  console.log(`${n}: ${result[n].draws} draws (${result[n].skinned} skinned)  top: ${Object.entries(by).slice(0, 6).map(([k, v]) => `${k} ${v}`).join(', ')}`);
}
writeFileSync(`${out}/draws.json`, JSON.stringify(result, null, 1));
console.log(errors.slice(0, 10).join('\n') || 'no page errors');
await browser.close();
