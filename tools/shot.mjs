// Dev tool: load the game headlessly, teleport to named views, save screenshots.
//   node tools/shot.mjs <url> <outDir> [view,view,...]
//   node tools/shot.mjs <url> <outDir> hero[:id,id]   the hero shots (engine/bench.js HERO_SHOTS): each at its
//       hour with the normal crowd and traffic and the Mac M4 preset; a clean frame (<id>.png), the same
//       with the liveliness overlay (<id>-live.png), and the numbers (hero.json; averaged over a few samples)
import { createRequire } from 'module';
// Playwright is expected globally (NODE_PATH=$(npm root -g)) or as a local devDependency.
const { chromium } = createRequire(import.meta.url)('playwright');
const [url = 'http://localhost:5173/', out = '.', only = ''] = process.argv.slice(2);
const out_dir = out;
const E = -Math.PI / 2;
const VIEWS = {
  spawn: [-85, 0.6, E, 0.1], street: [-62, 1.5, E + 0.75, 0.05], stall: [-56.5, -2.2, 0.15, -0.08], shop: [-66, 2, 0.55, 0.0],
  corner: [-30, 0, E, 0.22], road: [-16, 2, Math.PI, 0.05], roadS: [-10, -20, 0.25, 0.12], stairs: [-2, 0, E, 0.3],
  vista: [11, 0, E + 0.18, 0.2], rail: [25, 20, E + 0.05, 0.12], clue: [22.6, 10.6, E - 0.6, -0.02], back: [22, 30, Math.PI / 2 + 0.2, 0.3],
  deckN: [16, 60, Math.PI + 0.25, 0.04], deckS: [14, -40, -0.15, 0.06], north: [-12, -52, Math.PI - 0.1, 0.02], hsbc: [-12, 80, Math.PI / 2 - 0.1, 0.32],
  customs: [-8, 27, Math.PI / 2, 0.45], water: [25.4, -20, E + 0.6, -0.12], hoarding: [-84, 0, Math.PI / 2, 0.02],
};
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
const hero = only === 'hero' || only.startsWith('hero:');
if (hero) {
  // the normal crowd and traffic (no ?q), a known preset, a new life that saves nothing of note and gets no calls
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'gfx=mac&fresh&life=0&nolock&tips=0', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 240000 });
  await page.evaluate(() => { window.__bund.start(); window.__bund.dtMax = 0.25; });   // (software GL draws a few frames a second: let the world move on)
  await page.waitForTimeout(3000);
  const ids = only.startsWith('hero:') ? only.slice(5).split(',') : await page.evaluate(() => window.__bund.heroShots.map((s) => s.id));
  const out = {};
  for (const id of ids) {
    const shot = await page.evaluate((i) => window.__bund.heroShot(i), id);
    if (!shot) { console.log(`no hero shot ${id}`); continue; }
    await page.waitForTimeout(9000);                                                   // settle: the hour's lights, crowd and traffic
    const samples = [];
    for (let k = 0; k < 5; k++) { samples.push(await page.evaluate(() => window.__bund.live())); await page.waitForTimeout(700); }
    const mean = (f) => Math.round(samples.reduce((s, x) => s + f(x), 0) / samples.length * 10) / 10;
    const acts = {}; for (const x of samples) for (const [k, n] of Object.entries(x.activities.list)) acts[k] = Math.max(acts[k] || 0, n);
    const kinds = {}; for (const x of samples) for (const [k, n] of Object.entries(x.audible.kinds)) kinds[k] = Math.max(kinds[k] || 0, n);
    out[id] = { name: shot.name, hour: shot.hour.map((n) => String(n).padStart(2, '0')).join(':'),
      people: { near: mean((x) => x.people.near), mid: mean((x) => x.people.mid), impostor: mean((x) => x.people.impostor), total: mean((x) => x.people.total) },
      vehicles: { total: mean((x) => x.vehicles.total), taxi: mean((x) => x.vehicles.taxi), car: mean((x) => x.vehicles.car), nev: mean((x) => x.vehicles.nev), bus: mean((x) => x.vehicles.bus), boat: mean((x) => x.vehicles.boat) },
      activities: { distinct: mean((x) => x.activities.count), seen: acts }, audible: { sources: mean((x) => x.audible.count), kinds },
      draw: { calls: mean((x) => x.draw.calls), triangles: mean((x) => x.draw.triangles) }, frameMsSoftwareGL: mean((x) => x.frame.avgMs) };
    await page.evaluate(() => window.__bund.liveOverlay.set(false));
    await page.screenshot({ path: `${out_dir}/${id}.png` });
    await page.evaluate(() => window.__bund.liveOverlay.set(true));
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${out_dir}/${id}-live.png` });
    await page.evaluate(() => window.__bund.liveOverlay.set(false));
    console.log(id, JSON.stringify(out[id]));
  }
  (await import('fs')).writeFileSync(`${out_dir}/hero.json`, JSON.stringify(out, null, 1));
  const census = await page.evaluate(() => ({ audio: window.__bund.audio.census(), ambience: window.__bund.ambience.stats, reverb: window.__bund.ambience.reverb }));
  console.log(JSON.stringify(census));
  console.log(errors.filter((e) => !/GPU stall|WebGL|swiftshader|AudioContext was not allowed/i.test(e)).slice(0, 20).join('\n') || 'no console errors');
  await browser.close();
  process.exit(0);
}
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
