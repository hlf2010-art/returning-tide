// Dev tool: drive the real page (clicks, keys, mouse) and assert the milestone's behaviours.
//   NODE_PATH=$(npm root -g) node tools/playtest.mjs [url] [outDir]
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const [url = 'http://localhost:5173/', out = '.'] = process.argv.slice(2);
let failed = 0;
const ok = (c, msg) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`); if (!c) failed++; };
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(e.message));
const S = () => page.evaluate(() => { const g = window.__bund, b = g.player.body; return { mode: g.mode, x: b.x, y: b.y, z: b.z, yaw: g.player.yaw, pitch: g.player.pitch, near: g.nearClue, read: g.clueRead, hit: b.hit, locked: !!document.pointerLockElement, fps: 1000 / g.R.frameMs }; });
// "shown" = laid out and, for the fading HUD bits, switched on. (Checking computed opacity is
// flaky here: under software GL the fade may not have advanced a single frame yet.)
const FADERS = ['prompt', 'toast', 'thought', 'place', 'reticle'];
const vis = (id) => page.evaluate(([i, faders]) => { const e = document.getElementById(i); return !!e && getComputedStyle(e).display !== 'none' && !e.classList.contains('leaving') && (!faders.includes(i) || e.classList.contains('on')); }, [id, FADERS]);
const tp = (x, z, yaw, pitch = 0) => page.evaluate(([a, b, c, d]) => window.__bund.player.teleport(a, b, c, d), [x, z, yaw, pitch]);

await page.goto(url + '?q=5' + (process.env.NOLOCK ? '&nolock' : ''), { waitUntil: 'load' });
await page.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 180000 });
ok(await page.isEnabled('#begin'), 'entry screen: begin button enabled after load');
await page.click('#begin');
await page.waitForTimeout(1800);
let s = await S();
ok(s.mode === 'play', `clicking begin starts play (mode=${s.mode})`);
console.log(`INFO  pointer lock granted in this headless browser: ${s.locked}`);
const lockedRun = s.locked;
ok(await vis('hud'), 'HUD visible, entry card gone: ' + !(await vis('entry')));

// walking. Software GL renders far below real time and the sim clamps dt, so instead of
// timing we hold a key until the player has covered a distance (speeds are unit-tested in node).
const hold = async (keys, done, timeout = 40000) => {
  for (const k of keys) await page.keyboard.down(k);
  const t0 = Date.now(); let st;
  do { await page.waitForTimeout(250); st = await S(); } while (!done(st) && Date.now() - t0 < timeout);
  for (const k of keys) await page.keyboard.up(k);
  return st;
};
const x0 = s.x;
s = await hold(['KeyW'], (q) => q.x - x0 > 3);
ok(s.x - x0 > 3, `holding W walks east (${(s.x - x0).toFixed(2)} m)`);
const x1 = s.x;
s = await hold(['ShiftLeft', 'KeyW'], (q) => q.x - x1 > 6);
ok(s.x - x1 > 6, `Shift+W keeps going (${(s.x - x1).toFixed(2)} m)`);
const z1 = s.z;
s = await hold(['KeyD'], (q) => q.z - z1 > 1.2);
ok(s.z - z1 > 1.2, `D strafes right/south (${(s.z - z1).toFixed(2)} m)`);
const z2 = s.z;
s = await hold(['KeyA'], (q) => z2 - q.z > 1.0);
ok(z2 - s.z > 1.0, `A strafes left/north (${(z2 - s.z).toFixed(2)} m)`);
const x2 = s.x;
s = await hold(['KeyS'], (q) => x2 - q.x > 1.0);
ok(x2 - s.x > 1.0, `S backs up (${(x2 - s.x).toFixed(2)} m)`);

// mouse look
const yaw0 = s.yaw, pitch0 = s.pitch;
await page.mouse.move(640, 360);
if (!lockedRun) await page.mouse.down();
await page.mouse.move(760, 300, { steps: 6 });
if (!lockedRun) await page.mouse.up();
await page.waitForTimeout(300);
s = await S();
if (lockedRun) console.log('SKIP  mouse look under pointer lock: synthetic mouse moves carry no movementX/Y while locked; run with NOLOCK=1 to exercise the same handler');
else ok(s.yaw < yaw0 - 0.05 && s.pitch > pitch0 + 0.02, `mouse look (drag fallback, same handler as pointer lock) turns right and up (dyaw=${(s.yaw - yaw0).toFixed(3)}, dpitch=${(s.pitch - pitch0).toFixed(3)})`);

// collision in the live page: walk into the Customs House wall
await tp(-60, 3, Math.PI, 0);              // facing south (+z)
s = await hold(['ShiftLeft', 'KeyW'], (q) => q.hit === 'customs', 30000);
await page.waitForTimeout(600); s = await S();
ok(s.z < 6.5 - 0.3 && s.z > 5.9, `wall stops the player (z=${s.z.toFixed(2)}, wall at 6.50)`);

// stairs
await tp(0, 0, -Math.PI / 2, 0);
s = await hold(['ShiftLeft', 'KeyW'], (q) => q.x > 10.5, 40000);
ok(Math.abs(s.y - 3) < 0.05 && s.x > 9, `climbing the stair reaches the deck (x=${s.x.toFixed(1)}, y=${s.y.toFixed(2)})`);

// boundary + message
await tp(15, 92, Math.PI, 0);
s = await hold(['ShiftLeft', 'KeyW'], (q) => q.hit === 'boundary', 30000);
await page.waitForTimeout(500); s = await S();
ok(s.z < 95 && s.z > 94 && await vis('toast'), `south barrier holds (z=${s.z.toFixed(2)}) and a boundary notice shows`);
await page.screenshot({ path: `${out}/pt-boundary.png` });

// the clue
await tp(20, 20, 0, 0); await page.waitForTimeout(900);
ok(!(await S()).near && !(await vis('prompt')), 'no prompt when away from the notice');
await tp(22.9, 10.9, -Math.PI / 2 - 0.55, -0.05); await page.waitForTimeout(1200);
s = await S();
ok(s.near && await vis('prompt'), 'prompt appears when close and looking at the notice');
await page.keyboard.press('KeyE'); await page.waitForTimeout(700);
s = await S();
ok(s.mode === 'inspect' && await vis('inspect'), 'E opens the notice');
await page.screenshot({ path: `${out}/pt-inspect.png` });
const xi = s.x;
await page.keyboard.down('KeyW'); await page.waitForTimeout(1200); await page.keyboard.up('KeyW');
ok(Math.abs((await S()).x - xi) < 0.01, 'movement is frozen while reading');
await page.keyboard.press('KeyE'); await page.waitForTimeout(1500);
s = await S();
ok(s.mode === 'play' && s.read && !(await vis('inspect')) && await vis('thought'), 'E closes it; the Mission One hint line appears');
await page.screenshot({ path: `${out}/pt-thought.png` });

// pause / resume
if (lockedRun) {
  await page.evaluate(() => document.exitPointerLock()); await page.waitForTimeout(500);
  ok((await S()).mode === 'pause' && await vis('pause'), 'losing pointer lock (Esc) pauses');
  await page.screenshot({ path: `${out}/pt-pause.png` });
  await page.waitForTimeout(1300);
  await page.click('#resume'); await page.waitForTimeout(700);
  s = await S();
  ok(s.mode === 'play', `clicking the pause screen resumes (mode=${s.mode}, locked=${s.locked})`);
}
await page.keyboard.press('KeyM'); await page.waitForTimeout(900);
ok(await vis('toast'), 'M toggles sound with a notice');
const audioRunning = await page.evaluate(() => window.__bund.audio.running);
console.log(`INFO  WebAudio context running: ${audioRunning}`);
console.log(`INFO  software GL (SwiftShader) at lowest quality, 960x540: ${(await S()).fps.toFixed(1)} fps - not a real-GPU figure`);
ok(errors.length === 0, `no console errors (${errors.slice(0, 3).join(' | ')})`);
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
await browser.close();
process.exit(failed ? 1 : 0);
