// Dev tool: relative cost of render features under software GL (a proxy, not a real-GPU number).
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const url = process.argv[2] || 'http://localhost:5173/';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.goto(url + '?q=0&nolock', { waitUntil: 'load' });
await page.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 180000 });
await page.evaluate(() => window.__bund.start());
const measure = async (label, view, setup) => {
  await page.evaluate(([x, z, yaw, pitch]) => window.__bund.player.teleport(x, z, yaw, pitch), view);
  if (setup) await page.evaluate(setup);
  // readPixels after each frame forces the GPU process to finish, so intervals are real
  const ms = await page.evaluate(() => new Promise((res) => {
    const gl = window.__bund.R.renderer.getContext(), px = new Uint8Array(4);
    let n = -3, t0 = 0;
    const f = () => { gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const t = performance.now(); n++; if (n === 0) t0 = t; if (n >= 3) res((t - t0) / n); else requestAnimationFrame(f); };
    requestAnimationFrame(f);
  }));
  console.log(`${label.padEnd(34)} ${ms.toFixed(0)} ms/frame`);
};
const E = -Math.PI / 2, vista = [11, 0, E + 0.18, 0.2], road = [-16, 2, Math.PI, 0.05], street = [-62, 1.5, E + 0.75, 0.05];
await measure('vista: baseline', vista);
await measure('road: baseline', road);
await measure('street: baseline', street);
const steps = (process.argv[3] || '').split(',').filter(Boolean);
for (const s of steps) {
  if (s === 'bloom') await measure('vista: bloom off', vista, () => { window.__bund.R.bloom.enabled = false; });
  if (s === 'lights') await measure('vista: +point lights off', vista, () => { window.__bund.scene.traverse((o) => { if (o.isPointLight) o.visible = false; }); });
  if (s === 'env') await measure('vista: +environment off', vista, () => { window.__bund.scene.environment = null; });
  if (s === 'road') await measure('road: (same toggles)', road);
  if (s === 'msaa') await measure('vista: +MSAA off', vista, () => window.__bund.R.setLevel(2));
  if (s === 'refl') await measure('vista: +river reflection off', vista, () => { window.__bund.noReflect = true; });
  if (s === 'half') await measure('vista: +half resolution', vista, () => window.__bund.R.setLevel(5));
}
await browser.close();
