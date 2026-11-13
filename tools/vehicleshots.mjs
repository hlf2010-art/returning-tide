// Dev tool: photograph the crossing and each through-traffic vehicle from several angles.
//   NODE_PATH=$(npm root -g) node tools/vehicleshots.mjs [url] [outDir]
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const [url = 'http://localhost:5173/', out = '.'] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.goto(url + '?q=2&nolock', { waitUntil: 'load' });
await page.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 240000 });
await page.evaluate(() => window.__bund.start());
await page.waitForTimeout(1500);
const view = async (name, x, z, tx, ty, tz) => {
  await page.evaluate(([x, z, tx, ty, tz]) => {
    const b = window.__bund, dx = tx - x, dz = tz - z;
    b.player.teleport(x, z, Math.atan2(-dx, -dz), Math.atan2(ty - 1.83, Math.hypot(dx, dz)));
  }, [x, z, tx, ty, tz]);
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${out}/${name}.png` });
};
// overview of the crossing
await view('crossing-east', -1.5, 13, -17, 1.5, -2);
await view('crossing-west', -29.8, -9, -14, 1.5, 3);
// park each named vehicle on the open road and walk round it
const ids = (process.env.IDS || 'et5,l9,r7,m9,taxi-a').split(',');
await page.evaluate(() => { window.__bund.freezeTraffic = true; });
for (const id of ids) {
  const v = await page.evaluate((id) => {
    const t = window.__bund.traffic, v = t.vehicles.find((q) => q.id === id);
    // put it 30 m north of the crossing in its own lane, facing its direction of travel
    v.active = true; v.s = v.lane.dir > 0 ? -30 : 40 ; v.v = 0;
    window.__bund.freezeTraffic = false; t.update(0.0001); window.__bund.freezeTraffic = true;
    return { x: v.x, z: v.z, dir: v.lane.dir, len: v.len };
  }, id);
  // the other vehicles keep their places; clear this vehicle's lane neighbours out of shot
  const f = v.dir;                                     // nose points toward +z*dir
  await view(`${id}-front34`, v.x + 4.2, v.z + f * 5.5, v.x, 0.9, v.z);
  await view(`${id}-side`, v.x + 6.5, v.z, v.x, 0.9, v.z);
  await view(`${id}-rear34`, v.x - 3.5, v.z - f * 5.8, v.x, 0.9, v.z);
}
await browser.close();
