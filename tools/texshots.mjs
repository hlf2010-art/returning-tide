// Dev tool: close-up shots of the surfaces you walk past (doors, walls, floors, signs, interiors), for
// checking textures and small details. Midday, no crowd or traffic, so nothing stands in front.
//   node tools/texshots.mjs <url> <outDir> [view,view,...] [--hour=12:00] [--scale=1]
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const opt = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const [url = 'http://localhost:4173/', out = '.', only = ''] = args;
const N = 0, S = Math.PI, E = -Math.PI / 2, W = Math.PI / 2;   // yaw: looking -z, +z, +x, -x
// [x, z, yaw, pitch, y?]
export const VIEWS = {
  peaceDoor: [-48, -207.5, N, 0.12], peaceDoorClose: [-47, -210.4, N + 0.2, 0.02], peaceWall: [-40, -210.2, N - 0.5, 0.05],
  aiaDoor: [-30.5, -145.5, W, 0.08], aiaDoorClose: [-32.6, -146.5, W - 0.3, 0.0],
  facadeA: [-31.5, -110, W + 0.5, 0.05], facadeB: [-31.5, -60, W + 0.6, 0.1], facadeLow: [-32.2, -170, W + 0.9, -0.15],
  pavement: [-31, -120, S, -0.7], promenade: [21, -30, S, -0.6],
  dumpling: [-145, -195.5, S, 0.05], dumplingIn: [-145, -184, N, 0.0],
  hankou: [-62, 1.5, E + 0.75, 0.05], hankouShop: [-66, 2, 0.55, 0.0], hankouWall: [-75, -5, E + 1.2, 0.0],
  nanjing: [-478, -198.5, E, 0.02], nanjingShop: [-430, -205.5, E - 0.9, 0.0], nanjingShop2: [-300, -196.5, E + 0.9, 0.0], nanjingFloor: [-400, -201, E, -0.75],
  lobby: [-48, -216, N, 0.05], lobbyHall: [-48, -228, N + 0.6, 0.1], lobbyFloor: [-52, -222, S + 0.4, -0.6],
  aiaLobby: [-36, -145.5, W, 0.05], jazz: [-44, -214.5, N - 0.6, 0.0],
  lifts: [-48, -239.5, N, 0.05], staffDoor: [-57, -232.5, W + 0.3, 0.0], aiaLifts: [-43.8, -145.5, W, 0.05],
};
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const scale = Number(opt.scale || 1);
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: scale });
const errors = [];
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`[error] ${m.text()}`); });
await page.goto(url + (url.includes('?') ? '&' : '?') + `q=0&nolock&fresh&life=0&gfx=${opt.gfx || 'mac'}&hour=${opt.hour || '12:00'}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 240000 });
await page.evaluate(() => { window.__bund.start(); window.__bund.freezeTraffic = true; });
await page.waitForTimeout(3000);
for (const n of (only ? only.split(',') : Object.keys(VIEWS))) {
  const v = VIEWS[n]; if (!v) { console.log('no view', n); continue; }
  await page.evaluate((a) => window.__bund.player.teleport(...a), v);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/${n}.png`, timeout: 180000 });
  console.log('shot', n);
}
const info = await page.evaluate(() => { const i = window.__bund.R.renderer.info; return { tex: i.memory.textures, geos: i.memory.geometries }; });
console.log(JSON.stringify(info));
console.log(errors.slice(0, 10).join('\n') || 'no console errors');
await browser.close();
