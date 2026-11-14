// Dev tool: frame cost of this milestone's immersion features under software GL (a proxy, not a
// real-GPU number): lamp shadows, your own body, the trees. Same session, toggled in place.
//   NODE_PATH=$(npm root -g) node tools/immersionperf.mjs [url] [q]
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const url = process.argv[2] || 'http://localhost:5173/', q = process.argv[3] || '1';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.goto(url + `?q=${q}&nolock`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 300000 });
await page.evaluate(() => { window.__bund.start(); window.__bund.freezeTraffic = true; });
await page.waitForTimeout(2500);
const measure = (view) => page.evaluate((v) => new Promise((res) => {
  const b = window.__bund; b.player.teleport(...v);
  const gl = b.R.renderer.getContext(), px = new Uint8Array(4);
  let n = -3, t0 = 0, calls = 0;
  const f = () => { gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const t = performance.now(); n++; if (n === 0) t0 = t; if (n > 0) calls = b.R.renderer.info.render.calls; if (n >= 4) res({ ms: (t - t0) / n, calls }); else requestAnimationFrame(f); };
  requestAnimationFrame(f);
}), view);
const set = (k, on) => page.evaluate(([k, on]) => {
  const w = window.__bund.world;
  if (k === 'shadows') { window.__bund.R.renderer.shadowMap.enabled = on; window.__bund.scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { m.needsUpdate = true; }); }); }
  if (k === 'body') w.playerBody.setVisible(on);
  if (k === 'trees') w.trees.group.visible = on;
}, [k, on]);
const views = { street: [-58, -1, -Math.PI / 2 + 0.6, 0.15], deck: [16, -30, 0.2, 0.05], down: [-60, 0, 0, -1.1] };
for (const k of ['shadows', 'body', 'trees']) {
  for (const [name, v] of Object.entries(views)) {
    const r = { on: [], off: [] };
    for (let i = 0; i < 3; i++) for (const on of [true, false]) { await set(k, on); await page.waitForTimeout(300); r[on ? 'on' : 'off'].push(await measure(v)); }
    await set(k, true);
    const med = (a) => a.map((x) => x.ms).sort((p, q2) => p - q2)[1];
    console.log(`${k.padEnd(8)} ${name.padEnd(7)} on ${med(r.on).toFixed(0)} ms (${r.on[0].calls} calls)  off ${med(r.off).toFixed(0)} ms (${r.off[0].calls} calls)  ${(100 * (med(r.on) / med(r.off) - 1)).toFixed(0)}%`);
  }
}
await browser.close();
