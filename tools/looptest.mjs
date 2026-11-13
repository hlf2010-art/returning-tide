// Dev tool: the whole interaction loop in the real page, keyboard only (E, W/S, wheel, Esc):
// approach Old Lin -> accept -> inspect the pouch -> choose -> return -> outcome, both outcomes,
// plus target selection / line of sight, cancel and re-entry, repeats, pause mid-interaction and
// control restoration. (Supersedes the earlier missiontest.mjs, which used the retired F key.)
//   NODE_PATH=$(npm root -g) node tools/looptest.mjs [url] [outDir]
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const [url = 'http://localhost:5173/', out = '.'] = process.argv.slice(2);
let failed = 0;
const ok = (c, msg) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`); if (!c) failed++; };
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(e.message));

const S = () => page.evaluate(() => {
  const g = window.__bund, m = g.mission, m1 = g.mission1, line = g.conversation.currentLine, mesh = (n) => g.scene.getObjectByName(n);
  const vis = (id) => { const e = document.getElementById(id); return !!e && !e.classList.contains('hidden') && getComputedStyle(e).display !== 'none'; };
  const prompt = document.getElementById('prompt');
  return {
    mode: g.mode, target: g.target ? g.target.id : null, step: m.step, sealed: m.sealed, outcome: m.outcome,
    offer: m1.offerPending, choice: m1.dialogueChoices ? m1.dialogueChoices.index : null, view: m1.view, viewIndex: m1.viewIndex,
    line: line ? line.id : null, enabled: g.player.enabled, input: { ...g.player.input },
    x: g.player.body.x, z: g.player.body.z, yaw: g.player.yaw, pitch: g.player.pitch,
    prompt: prompt.classList.contains('on') ? `${document.getElementById('prompt-target').textContent} ${document.getElementById('prompt-text').textContent}` : '',
    subOptions: vis('sub-options') ? [...document.querySelectorAll('#sub-options .opt')].map((o) => o.classList.contains('sel')) : null,
    held: mesh('pouch-held').visible, atLin: mesh('pouch-lin').visible, onStall: mesh('pouch-on-stall').visible,
    card: document.getElementById('mission-card').classList.contains('on'), thought: document.getElementById('thought').textContent,
  };
});
const tp = (x, z, yaw, pitch = 0) => page.evaluate(([a, b, c, d]) => window.__bund.player.teleport(a, b, c, d), [x, z, yaw, pitch]);
const frames = (n = 2) => page.evaluate((n) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
const press = async (k, wait = 450) => { await page.keyboard.press(k); await frames(2); await page.waitForTimeout(wait); };
// look at a world point from (x, z) on the given level
const lookAt = async (x, z, tx, ty, tz, eyeY) => {
  const dx = tx - x, dz = tz - z, yaw = Math.atan2(-dx, -dz), pitch = Math.atan2(ty - eyeY, Math.hypot(dx, dz));
  await tp(x, z, yaw, pitch); await frames(3);
};
const LIN = { x: 23.55, y: 3 + 1.74 * 0.91 - 0.1, z: -15.62 }, DECK_EYE = 3 + 1.68;
const atLin = () => lookAt(21.8, -15.0, LIN.x, LIN.y, LIN.z, DECK_EYE);
const atStall = () => tp(-56.8, -4.3, 0, -0.42).then(() => frames(3));
// controls are back: free to walk, nothing held, camera where it was
async function restored(label, yawBefore) {
  await frames(3);
  const s = await S();
  const noJump = yawBefore == null || Math.abs(s.yaw - yawBefore) < 1e-6;
  const nothingHeld = Object.values(s.input).every((v) => !v);
  const x0 = s.x, z0 = s.z;
  // walk: forward, or backward if something solid is in front (the stall cabinet, a railing)
  let moved = false, key = '';
  for (const k of ['KeyW', 'KeyS']) {
    await page.keyboard.down(k);
    moved = await page.waitForFunction(([x0, z0]) => { const b = window.__bund.player.body; return Math.hypot(b.x - x0, b.z - z0) > 0.4; }, [x0, z0], { timeout: 12000 }).then(() => true).catch(() => false);
    await page.keyboard.up(k);
    if (moved) { key = k === 'KeyW' ? 'W' : 'S (W was against a solid prop)'; break; }
  }
  ok(s.mode === 'play' && s.enabled && nothingHeld && noJump && moved, `${label}: back to walking, no held keys, camera unmoved, ${key || 'NOT moving'}`);
}

await page.goto(url + '?q=5&nolock&dev', { waitUntil: 'load' });
await page.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 240000 });
await page.click('#begin'); await page.waitForTimeout(1200);
ok((await S()).mode === 'play', 'game running');

// ---- 1. one target at a time, never through people or walls ----
await lookAt(24.1, -12.5, LIN.x, LIN.y, LIN.z, DECK_EYE);
let s = await S();
ok(s.target === null && s.prompt === '', 'Old Lin hidden behind Ms. Su: no target, no prompt');
await press('KeyE');
ok((await S()).mode === 'play', 'E with no target does nothing');
await lookAt(22.2, -13.0, LIN.x, LIN.y, LIN.z, DECK_EYE);
s = await S();
ok(s.target === 'lin' && s.prompt.includes('老林') && s.prompt.includes('Talk'), `step aside: prompt names the target and the action ("${s.prompt}")`);
await tp(22.2, -13.0, Math.PI / 2, 0); await frames(3);
ok((await S()).target === null, 'turn away: target drops');
await lookAt(22.9, 10.9, 24.6 - 0.09, 4.52, 12 - 0.13, DECK_EYE);
s = await S();
ok(s.target === 'notice' && s.prompt.includes('寻人启事'), 'walk to the lamp post: the notice becomes the target');
await press('KeyE');
ok((await S()).mode === 'inspect', 'E reads the notice');
await press('KeyE', 700);
ok((await S()).mode === 'play', 'E puts it back');

// ---- 2. the offer: cancel, re-enter, guard against double presses, wheel choice ----
await atLin();
s = await S();
ok(s.target === 'lin', 'at the railing: Old Lin is the target');
const yaw0 = s.yaw;
await page.keyboard.press('KeyE'); await page.keyboard.press('KeyE');            // a double press
await frames(2); await page.waitForTimeout(200);
s = await S();
ok(s.mode === 'dialogue' && s.line === 'm1-offer' && s.step === 'idle' && s.offer, 'E opens the conversation with the offer; the second press of a double tap does not answer it');
ok(s.subOptions && s.subOptions.length === 2 && s.subOptions[0], 'two answers shown in the subtitle bar, "Agree" highlighted');
await page.screenshot({ path: `${out}/loop-offer.png` });
await page.mouse.move(640, 360); await page.mouse.wheel(0, 120); await frames(2);
ok((await S()).choice === 1, 'mouse wheel moves the highlight to "Not now"');
await press('KeyW');
ok((await S()).choice === 0, 'W moves it back');
await press('KeyS'); await press('KeyE', 600);
s = await S();
ok(s.mode === 'play' && s.step === 'idle' && !s.offer, '"Not now" + E: declined, conversation closed');
await restored('after declining', null);
await atLin(); await press('KeyE', 600);
ok((await S()).line === 'm1-offer', 're-entry: he asks again');
await page.keyboard.press('Escape'); await frames(2); await page.waitForTimeout(300);
ok((await S()).mode === 'play' && (await S()).step === 'idle', 'Esc steps back as well');
// repeated interaction: open / close five times
let cycles = 0;
for (let i = 0; i < 5; i++) { await atLin(); await press('KeyE', 500); if ((await S()).mode === 'dialogue') { await page.keyboard.press('Escape'); await frames(2); if ((await S()).mode === 'play') cycles++; } }
ok(cycles === 5, 'five open/close cycles in a row, each clean');
await atLin(); await press('KeyE', 600);
const yawDlg = (await S()).yaw;
await press('KeyE', 900);                                                          // "Agree" is highlighted
s = await S();
ok(s.step === 'collect' && s.line === 'm1-accept' && s.mode === 'dialogue' && s.subOptions === null, 'E agrees: Old Lin gives the instructions; no choices left');
const yawBeforeClose = (await S()).yaw;
await page.keyboard.down('KeyW'); await frames(2);                                // a key held while closing
await press('KeyE', 300);
s = await S();
const zHeld = s.z, xHeld = s.x;
await page.waitForTimeout(1200);
s = await S();
await page.keyboard.up('KeyW');
ok(s.mode === 'play' && Math.hypot(s.x - xHeld, s.z - zHeld) < 0.01, 'a key held through the close does not drive the player afterwards (until it is pressed again)');
await restored('after the instructions', null);
ok(Math.abs(yawBeforeClose - yawDlg) < 0.6 && yaw0 !== null, 'during the conversation the camera eased toward Old Lin (no snap)');

// ---- 3. inspect the pouch, cancel, re-enter, choose "break the seal" ----
await atStall();
s = await S();
ok(s.target === 'pouch' && s.prompt.includes('文件袋'), 'at the stall: the pouch is the only target');
await press('KeyE', 600);
s = await S();
ok(s.mode === 'pouch' && s.view === 'pickup' && s.viewIndex === 0, 'E opens the close-up, "Take it, sealed" highlighted');
await page.keyboard.press('Escape'); await frames(2);
s = await S();
ok(s.mode === 'play' && s.step === 'collect' && s.onStall, 'Esc leaves it on the counter');
await restored('after leaving the pouch', null);
await atStall(); await press('KeyE', 600); await press('KeyS');
ok((await S()).viewIndex === 1, 'S highlights "Break the seal"');
await page.keyboard.down('KeyE'); await page.waitForTimeout(250); await page.keyboard.up('KeyE'); await frames(2);
ok((await S()).sealed && (await S()).view === 'pickup', 'a tap on E does not break it');
await page.keyboard.down('KeyE');
await page.waitForFunction(() => window.__bund.mission1.view === 'opened', null, { timeout: 30000 });
await page.keyboard.up('KeyE'); await frames(2);
s = await S();
ok(s.view === 'opened' && !s.sealed && s.step === 'carry', 'holding E breaks the seal and shows the page');
await page.screenshot({ path: `${out}/loop-opened.png` });
await press('KeyE', 600);
s = await S();
ok(s.mode === 'play' && s.held, 'E puts it away; the torn pouch is in hand');
await restored('after the close-up', null);
await press('KeyE');
ok((await S()).mode === 'play', 'E with nothing targeted while carrying: nothing (no hidden second use of E)');

// ---- 4. return: the outcome-specific response ----
await atLin();
s = await S();
ok(s.prompt.includes('Hand over'), `back at the railing the prompt changes ("${s.prompt}")`);
await press('KeyE', 900);
s = await S();
ok(s.step === 'complete' && s.outcome === 'opened' && s.line === 'm1-opened' && s.atLin && s.card, 'hand over: Old Lin remarks on the torn seal; outcome "opened"');
await press('KeyE', 900);
ok((await S()).thought.includes('31 October'), 'stepping back: closing thought for the opened outcome');
await press('KeyE', 700);
ok((await S()).line === 'm1-after-opened', 'next greeting reflects the outcome');
await press('KeyE', 400); await atLin(); await press('KeyE', 700);
s = await S();
ok(s.line && s.line.startsWith('greet-') && s.step === 'complete', 'then ordinary greetings; it never completes twice');
await press('KeyE', 400);

// ---- 5. restart; the sealed outcome; pausing in the middle of things ----
await press('F8', 500);
await atLin(); await press('KeyE', 600); await press('KeyE', 700); await press('KeyE', 500);
ok((await S()).step === 'collect', 'F8 restart, accept again');
await atStall(); await press('KeyE', 600);
await page.evaluate(() => window.dispatchEvent(new Event('blur')));             // losing focus pauses (drag-look mode)
await frames(2);
s = await S();
ok(s.mode === 'pause' && s.view === null && s.step === 'collect' && s.onStall, 'pausing during the close-up cancels it; the pouch stays on the counter');
await press('Escape', 600);
await restored('after pause + resume', null);
await atStall(); await press('KeyE', 600); await press('KeyE', 600);              // re-enter, take it sealed
s = await S();
ok(s.step === 'carry' && s.sealed && s.held && s.mode === 'play', 're-entered and took it sealed');
await atLin(); await press('KeyE', 900);
s = await S();
ok(s.step === 'complete' && s.outcome === 'sealed' && s.line === 'm1-sealed' && s.atLin, 'sealed handover: Old Lin\'s sealed response; outcome "sealed"');
await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await frames(2);
ok((await S()).mode === 'pause', 'pausing during the outcome line closes the conversation');
await press('Escape', 600);
ok((await S()).thought.includes('only Old Lin knows'), 'the sealed closing thought still appears');
await restored('after the sealed handover', null);

ok(errors.length === 0, `no console errors (${errors.slice(0, 3).join(' | ')})`);
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
await browser.close();
process.exit(failed ? 1 : 0);
