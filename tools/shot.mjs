// Dev tool: load the game headlessly, teleport to named views, save screenshots.
//   node tools/shot.mjs <url> <outDir> [view,view,...]
import { createRequire } from 'module';
// Playwright is expected globally (NODE_PATH=$(npm root -g)) or as a local devDependency.
const { chromium } = createRequire(import.meta.url)('playwright');
const [url = 'http://localhost:5173/', out = '.', only = ''] = process.argv.slice(2);
const E = -Math.PI / 2;
const VIEWS = {
  spawn: [-85, 0.6, E, 0.1], street: [-62, 1.5, E + 0.75, 0.05], stall: [-56.5, -2.2, 0.15, -0.08], shop: [-66, 2, 0.55, 0.0],
  corner: [-30, 0, E, 0.22], road: [-16, 2, Math.PI, 0.05], roadS: [-10, -20, 0.25, 0.12], stairs: [-2, 0, E, 0.3],
  vista: [11, 0, E + 0.18, 0.2], rail: [25, 20, E + 0.05, 0.12], clue: [22.6, 10.6, E - 0.6, -0.02], back: [22, 30, Math.PI / 2 + 0.2, 0.3],
  deckN: [16, 60, Math.PI + 0.25, 0.04], deckS: [14, -40, -0.15, 0.06], north: [-12, -52, Math.PI - 0.1, 0.02], hsbc: [-12, 80, Math.PI / 2 - 0.1, 0.32],
  customs: [-8, 27, Math.PI / 2, 0.45], water: [25.4, -20, E + 0.6, -0.12], hoarding: [-84, 0, Math.PI / 2, 0.02],
};
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
await page.goto(url + (url.includes('?') ? '&' : '?') + 'q=0&nolock', { waitUntil: 'load' });
await page.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 180000 });
const names = only ? only.split(',') : Object.keys(VIEWS);
if (names.includes('entry')) { await page.waitForTimeout(1500); await page.screenshot({ path: `${out}/entry.png` }); }
await page.evaluate(() => window.__bund.start());
await page.waitForTimeout(2500);
for (const n of names) {
  if (!VIEWS[n]) continue;
  await page.evaluate(([x, z, yaw, pitch]) => window.__bund.player.teleport(x, z, yaw, pitch), VIEWS[n]);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/${n}.png` });
}
const info = await page.evaluate(() => { const i = window.__bund.R.renderer.info; return { calls: i.render.calls, tris: i.render.triangles, geos: i.memory.geometries, tex: i.memory.textures, ms: window.__bund.R.frameMs }; });
console.log(JSON.stringify(info));
console.log(errors.slice(0, 20).join('\n') || 'no console errors');
await browser.close();
