// Wait for someone to stop and photograph the Huracán; screenshot them doing it.
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const dir = (process.env.OUT || '.') + '/';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`${process.env.URL || 'http://localhost:5173/'}?q=4&nolock&life=0&fresh&lang=en`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 180000 });
await p.evaluate(() => window.__bund.start());
await p.waitForFunction(() => window.__bund.world.huracan.loaded, null, { timeout: 120000 });
await p.evaluate(() => { window.__bund.dtMax = 0.25; window.__bund.player.teleport(-33.5, 5.6, Math.PI / 2 - 0.15, -0.06); });   // west end of Hankou Rd pavement, looking down it toward the car
await p.evaluate(() => { const s = document.createElement('style'); s.textContent = '#hud,#minimap,#dev{display:none!important}'; document.head.appendChild(s); });
let looks = 0, photos = 0, shot = 0;
for (let i = 0; i < 200 && shot < 3; i++) {
  await p.waitForTimeout(1500);
  const st = await p.evaluate(() => window.__bund.traffic.peds.map((q) => ({ id: q.id, x: q.x, z: q.z, gaze: !!q.gaze, photo: q.photo ? +q.photo.t.toFixed(1) : -1, persona: q.persona })));
  for (const q of st) { if (q.gaze) looks++; }
  const ph = st.find((q) => q.photo >= 0.6);
  if (ph) {
    photos++;
    // stand a few metres off to the side, looking at them and the car
    await p.evaluate(([x, z]) => { const tx = (x - 40.6) / 2, tz = (z + 2.86) / 2; const cx = x + 2.6, cz = z + 2.2; window.__bund.player.teleport(cx, cz, Math.atan2(-(tx - cx), -(tz - cz)), -0.05); }, [ph.x, ph.z]);
    await p.waitForTimeout(700);
    await p.screenshot({ path: `${dir}sight-${shot++}.png`, timeout: 120000 });
    console.log('photo by', ph.id, ph.persona, ph.x.toFixed(1), ph.z.toFixed(1));
  }
}
console.log({ looks, photos, errors: errs.slice(0, 3) });
await b.close();
