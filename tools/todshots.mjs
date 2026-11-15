// Dev tool: the same views through the day (engine/timeOfDay.js). Screenshots at fixed hours from
// the promenade (across to Pudong, and back at the Bund) and on Nanjing Road, plus what each system
// reports at that hour (exposure, lamps, crowd and traffic out, the metro, the dawn group).
//   NODE_PATH=$(npm root -g) node tools/todshots.mjs [url] [outDir] [hours]
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const [url = 'http://localhost:4174/', out = '.', hourList = '17:42,18:30,20:00,22:30,02:00,06:15,09:00,12:00,15:30'] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url + '?q=2&nolock&dev&fresh&life=0&crowd=0.35&tod', { waitUntil: 'load' });
await page.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 400000 });
await page.evaluate(() => { window.__bund.freezeShow = true; window.__bund.dtMax = 0.05; });
await page.click('#begin'); await page.waitForTimeout(2000);
const ev = (f, a) => page.evaluate(f, a);
const frames = (n = 3) => ev((n) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
const tp = async (x, z, yaw, pitch = 0) => { await ev(([x, z, y, p]) => window.__bund.player.teleport(x, z, y, p), [x, z, yaw, pitch]); await frames(4); };
const VIEWS = { pudong: [20, -12, -Math.PI / 2, 0.06], bund: [21, 12, Math.PI * 0.62, 0.12], nanjing: [-60, -201.5, Math.PI / 2, 0.04], taichi: [12.5, -66, -Math.PI / 2 - 0.25, -0.05], street: [-16, 30, Math.PI, 0.1], lobby: [-45, -224, 0.4, 0.05] };
const only = process.env.VIEWS ? process.env.VIEWS.split(',') : Object.keys(VIEWS);
for (const hm of hourList.split(',')) {
  const [h, m] = hm.split(':').map(Number);
  await ev(([h, m]) => window.__bund.setHour(h, m), [h, m]);
  for (const v of only) {
    await tp(...VIEWS[v]);
    await ev(([h, m]) => window.__bund.setHour(h, m), [h, m]);    // (hold the clock still)
    await frames(8);
    await ev(() => { document.getElementById('hud').style.visibility = 'hidden'; });
    await frames(2);
    const name = `${out}/tod-${hm.replace(':', '')}-${v}.png`;
    await page.screenshot({ path: name });
    await ev(() => { document.getElementById('hud').style.visibility = ''; });
  }
  const s = await ev(() => { const b = window.__bund, h = b.hour(); return { daylight: +h.daylight.toFixed(2), floods: +h.floods.toFixed(2), media: h.media, lamps: +h.lamps.toFixed(2), crowd: +h.crowd.toFixed(2), traffic: +h.traffic.toFixed(2), metro: h.metro, dawn: h.dawn, exposure: +b.R.renderer.toneMappingExposure.toFixed(2), sunShadow: b.world && b.world.lighting.sunShadow }; });
  console.log(`INFO  ${hm} ${JSON.stringify(s)}`);
}
console.log(errors.length ? `ERRORS ${errors.slice(0, 5).join(' | ')}` : 'no page errors');
await browser.close();
