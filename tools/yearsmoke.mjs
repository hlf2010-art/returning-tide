// Dev tool: the year in the real page, fast: jump from day to day (the clock moved as a sleep would), click
// through each season plan the night opens (ui/season.js) as a player would, open and close the character page
// and the phone each day; fail on any console error or a screen that doesn't give play back.
//   node tools/yearsmoke.mjs [url] [outDir]        (a served build: npx vite preview --port 4190)
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const [url = 'http://localhost:4190/', out = '.'] = process.argv.slice(2);
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = []; p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await p.goto(`${url}?q=1&nolock&fresh&lang=zh`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 300000 });
await p.evaluate(() => { window.__bund.start(); window.__bund.dtMax = 0.25; });
await p.waitForTimeout(4000);
const mode = () => p.evaluate(() => window.__bund.mode);
ok(await mode() === 'play', 'the game starts');
const seen = { seasons: 0, choices: 0 };
for (const day of [2, 3, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]) {
  const e0 = errors.length;
  await p.evaluate((d) => { const L = window.__bund.life; L.clock.day = d; L.clock.minute = 8 * 60 + 30; L.clock.sec = 0; }, day);
  // the night's season plan, if this night crossed weeks: give it a few seconds to open
  const opened = await p.waitForFunction(() => window.__bund.mode === 'season', null, { timeout: 45000 }).then(() => true).catch(() => false);
  if (opened) {
    seen.seasons++;
    await p.evaluate(() => document.querySelector('#season [data-go]').click());
    for (let k = 0; k < 6; k++) {
      await p.waitForTimeout(400);
      const next = await p.evaluate(() => { const d = document.querySelector('#season [data-ch]'); if (d) { d.click(); return 'choice'; } const c = document.querySelector('#season [data-close]'); if (c) { c.click(); return 'close'; } return null; });
      if (next === 'choice') seen.choices++;
      if (next === 'close' || next === null) break;
    }
    await p.waitForTimeout(500);
    if (day === 7) await p.screenshot({ path: `${out}/yearsmoke-after-season.png`, timeout: 120000 }).catch(() => console.log('INFO  (screenshot skipped: slow renderer)'));
  }
  // the character page and the phone, open and shut
  await p.evaluate(() => { const B = window.__bund; B.profile.open('now'); });
  await p.waitForTimeout(300);
  await p.evaluate(() => { const B = window.__bund; for (const t of ['craft', 'tide']) B.profile.open(t); B.profile.close(); });
  await p.evaluate(() => { window.__bund.phone.toggle(); });
  await p.waitForTimeout(400);
  await p.evaluate(() => { window.__bund.phone.toggle(); });
  await p.waitForTimeout(300);
  const m = await mode(), s = await p.evaluate(() => { const L = window.__bund.life; return { day: L.clock.day, track: L.flags.year && L.flags.year.career.track, seasons: (L.flags.allot || { seasons: [] }).seasons.length, energy: Math.round((L.flags.allot || {}).energy || 0) }; });
  ok(m === 'play' && errors.length === e0, `day ${day}${opened ? ' (a season plan, clicked through)' : ''}: mode ${m}, ${s.seasons} seasons so far, energy ${s.energy}, road ${s.track}${errors.length > e0 ? ` · ${errors.slice(e0, e0 + 2).join(' | ')}` : ''}`);
}
ok(seen.seasons >= 5, `season plans met on the way: ${seen.seasons} (launch choices: ${seen.choices})`);
ok(!errors.length, `no console errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nall passed'); process.exit(failed ? 1 : 0);
