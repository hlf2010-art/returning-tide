// Dev tool: A/B frame cost of the crossing's traffic in one session (software GL proxy).
//   NODE_PATH=$(npm root -g) node tools/trafficperf.mjs [url]
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const url = process.argv[2] || 'http://localhost:5173/';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(url + '?q=0&nolock', { waitUntil: 'load' });
await page.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 240000 });
await page.evaluate(() => window.__bund.start());
const set = (on) => page.evaluate((on) => {
  const b = window.__bund;
  for (const n of ['traffic-vehicles', 'crossing-signals', 'crossing-pedestrians']) b.scene.getObjectByName(n).visible = on;
  b.freezeTraffic = !on;
}, on);
const measure = (view) => page.evaluate((v) => new Promise((res) => {
  const b = window.__bund; b.player.teleport(...v);
  const gl = b.R.renderer.getContext(), px = new Uint8Array(4);
  let n = -3, t0 = 0, calls = 0;
  const f = () => { gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const t = performance.now(); n++; if (n === 0) t0 = t; if (n > 0) calls = b.R.renderer.info.render.calls; if (n >= 4) res({ ms: (t - t0) / n, calls }); else requestAnimationFrame(f); };
  requestAnimationFrame(f);
}), view);
const views = { crossing: [-1.5, 13, Math.atan2(15.5, 15), 0.05], road: [-16, 2, Math.PI, 0.05], street: [-62, 1.5, -Math.PI / 2 + 0.75, 0.05] };
for (const [name, v] of Object.entries(views)) {
  const r = { on: [], off: [] };
  for (let k = 0; k < 3; k++) for (const on of [true, false]) { await set(on); r[on ? 'on' : 'off'].push(await measure(v)); }
  const med = (a) => a.map((x) => x.ms).sort((p, q) => p - q)[1];
  console.log(`${name.padEnd(9)} traffic on ${med(r.on).toFixed(0)} ms (${r.on[0].calls} calls)   off ${med(r.off).toFixed(0)} ms (${r.off[0].calls} calls)   ${(100 * (med(r.on) / med(r.off) - 1)).toFixed(1)}%`);
}
await browser.close();
