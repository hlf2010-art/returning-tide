// Dev tool: play Mission One "The Wrong Handoff" in the real page with real key presses:
// both branches, premature and repeated inputs, developer restart / reset.
//   NODE_PATH=$(npm root -g) node tools/missiontest.mjs [url] [outDir]
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
  const g = window.__bund, m = g.mission, m1 = g.mission1, line = g.conversation.currentLine;
  const mesh = (n) => g.scene.getObjectByName(n);
  return {
    mode: g.mode, step: m.step, sealed: m.sealed, outcome: m.outcome, offer: m1.offerPending, view: m1.view,
    nearNpc: g.nearNpc, nearPouch: g.nearPouch, line: line ? line.id : null,
    onStall: mesh('pouch-on-stall').visible, held: mesh('pouch-held').visible, atLin: mesh('pouch-lin').visible,
    x: g.player.body.x, z: g.player.body.z,
  };
});
const FADERS = ['prompt', 'toast', 'thought', 'mission-card', 'subtitle'];
const vis = (id) => page.evaluate(([i, f]) => { const e = document.getElementById(i); return !!e && !e.classList.contains('hidden') && getComputedStyle(e).display !== 'none' && (!f.includes(i) || e.classList.contains('on')); }, [id, FADERS]);
const text = (id) => page.evaluate((i) => document.getElementById(i).textContent, id);
const tp = (x, z, yaw, pitch = 0) => page.evaluate(([a, b, c, d]) => window.__bund.player.teleport(a, b, c, d), [x, z, yaw, pitch]);
const press = async (k, wait = 500) => { await page.keyboard.press(k); await page.waitForTimeout(wait); };
// Software GL runs far below real time and the sim clamps dt, so wait on state, not on clocks.
const until = async (fn, timeout = 30000) => { const t0 = Date.now(); let s; do { await page.waitForTimeout(150); s = await S(); } while (!fn(s) && Date.now() - t0 < timeout); return s; };
const atLin = () => tp(21.8, -15.0, -Math.PI / 2, -0.08);
const atStall = () => tp(-56.8, -4.3, 0, -0.42);
const shot = (n) => page.screenshot({ path: `${out}/m1-${n}.png` });

await page.goto(url + '?q=5&nolock&dev', { waitUntil: 'load' });
await page.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 180000 });
await page.click('#begin');
await page.waitForTimeout(1500);
let s = await S();
ok(s.mode === 'play' && s.step === 'idle' && !(await vis('objective')), 'game starts with Mission One idle and no objective shown');
ok(await vis('dev'), 'developer controls chip is shown with ?dev');

// --- premature: the stall before the mission exists ---
await atStall(); await page.waitForTimeout(900);
s = await S();
ok(!s.nearPouch && !s.onStall && !(await vis('prompt')), 'before the mission: no pouch on the counter, no prompt at the stall');
await press('KeyE'); await press('KeyF');
s = await S();
ok(s.mode === 'play' && s.step === 'idle', 'before the mission: E / F at the stall do nothing');

// --- the offer: greet Old Lin, step back once (decline), then agree ---
await atLin(); await page.waitForTimeout(900);
s = await S();
ok(s.nearNpc && (await text('prompt-text')).includes('Greet'), 'Old Lin: greet prompt');
await press('KeyE', 800);
s = await S();
ok(s.mode === 'dialogue' && s.line === 'm1-offer' && s.offer && await vis('sub-agree'), 'greeting Old Lin brings the offer, with an F Agree choice');
await shot('offer');
await press('KeyE', 800);
s = await S();
ok(s.mode === 'play' && s.step === 'idle' && !s.offer, 'E steps back: declined, mission not started');
await press('KeyF');
ok((await S()).step === 'idle', 'F outside the dialogue does not accept');
await press('KeyE', 800);
await press('KeyF', 800);
s = await S();
ok(s.step === 'collect' && s.line === 'm1-accept' && !s.offer && !(await vis('sub-agree')), 'F agrees: Lin gives the pickup instructions, choice disappears');
await press('KeyF', 300); await press('KeyF', 300);
ok((await S()).step === 'collect', 'repeated F after agreeing changes nothing');
await press('KeyE', 800);
s = await S();
ok(s.mode === 'play' && await vis('objective') && (await text('m-en')).includes("Zhou's watch-repair stall") && s.onStall, 'objective names the stall; pouch now lies on the counter');
await shot('objective');

// premature handover: back to Lin without the pouch
await press('KeyE', 800);
s = await S();
ok(s.line === 'm1-remind' && s.step === 'collect', 'greeting Lin before the pickup gets a reminder, nothing completes');
await press('KeyE', 600);

// --- branch B: open it ---
await atStall(); await page.waitForTimeout(1000);
s = await S();
ok(s.nearPouch && (await text('prompt-text')).includes('Pick up'), 'at the stall, looking at the counter: pick-up prompt');
await shot('stall');
await page.keyboard.press('KeyE'); await page.keyboard.press('KeyE');          // double press: guard keeps the view open
await page.waitForTimeout(150);
s = await S();
ok(s.mode === 'pouch' && s.view === 'pickup' && s.step === 'collect', 'E opens the pouch close-up; an immediate second E is ignored');
const body = await text('pouch-body');
ok(body.includes('勿要拆') && body.includes('red writing'), 'close-up shows the red-marker label and points back to the notice');
await shot('pickup-view');
await page.keyboard.press('Escape'); await page.waitForTimeout(400);
s = await S();
ok(s.mode === 'play' && s.step === 'collect' && s.onStall, 'Esc leaves it on the counter');
await press('KeyE', 900);
await page.keyboard.down('KeyF'); await page.waitForTimeout(250); await page.keyboard.up('KeyF');
await page.waitForTimeout(400);
s = await S();
ok(s.sealed && s.view === 'pickup', 'a short F tap does not break the seal');
await page.keyboard.down('KeyF');
s = await until((q) => q.view === 'opened');
await page.keyboard.up('KeyF');
ok(s.view === 'opened' && !s.sealed && s.step === 'carry', 'holding F breaks the seal: taken, opened, document shown');
const docText = await text('pouch-body');
ok(docText.includes('31 October') && docText.includes('29 October') && docText.includes('blank'), 'the document shows the concrete discrepancy (31st vs 29th, blank transferee)');
await shot('opened');
await press('KeyF', 300);
ok((await S()).sealed === false, 'F in the opened view does nothing more');
await press('KeyE', 700);
s = await S();
ok(s.mode === 'play' && s.held && !s.onStall && (await text('m-zh')).includes('封条已经破了'), 'put away: torn pouch held in view; objective notes the broken seal');
await shot('carry-opened');
await press('KeyF', 700);
s = await S();
ok(s.mode === 'pouch' && s.view === 'opened', 'F while carrying looks at it again');
await press('KeyE', 600);

await atLin(); await page.waitForTimeout(900);
ok((await text('prompt-text')).includes('Hand over'), 'at Lin while carrying: hand-over prompt');
await press('KeyE', 900);
s = await S();
ok(s.step === 'complete' && s.outcome === 'opened' && s.line === 'm1-opened' && s.atLin && !s.held, 'hand over: complete / opened; Lin holds the torn pouch and remarks on the seal');
ok(await vis('mission-card') && (await text('mc-outcome')).includes('seal broken') && !(await vis('objective')), 'completion card shown; objective cleared');
await shot('complete-opened');
await press('KeyE', 900);
ok(await vis('thought') && (await text('thought')).includes('31 October'), 'stepping back: closing thought for the opened branch');
await press('KeyE', 800);
ok((await S()).line === 'm1-after-opened', 'next greeting: Lin\'s cooler after-line');
await press('KeyE', 600); await press('KeyE', 800);
s = await S();
ok(s.line && s.line.startsWith('greet-') && s.step === 'complete', 'after that, ordinary greetings; no second completion');
await press('KeyE', 600);

// --- restart (F8) and branch A: keep it sealed ---
await press('F8', 600);
s = await S();
ok(s.step === 'collect' && s.sealed && s.onStall && !s.atLin && !s.held && await vis('objective'), 'F8 restarts: pouch back on the counter, sealed, Lin empty-handed');
await atStall(); await page.waitForTimeout(900);
await press('KeyE', 900);
ok((await text('pouch-keep-text')).includes('Take it'), 'pickup view offers "Take it, sealed"');
await press('KeyE', 700);
s = await S();
ok(s.mode === 'play' && s.step === 'carry' && s.sealed && s.held && (await vis('m-hint')), 'E takes it sealed: held in view, look-at hint shown');
await shot('carry-sealed');
await press('KeyF', 800);
s = await S();
ok(s.view === 'carry' && (await text('pouch-keep-text')).includes('Put it away'), 'F looks at the sealed pouch again (still a choice)');
await press('KeyE', 600);
await atLin(); await page.waitForTimeout(900);
await press('KeyE', 900);
s = await S();
ok(s.step === 'complete' && s.outcome === 'sealed' && s.line === 'm1-sealed' && s.atLin, 'hand over sealed: complete / sealed; Lin takes it intact');
ok((await text('mc-outcome')).includes('seal intact'), 'completion card for the sealed branch');
await shot('complete-sealed');
await press('KeyE', 900);
ok((await text('thought')).includes('only Old Lin knows'), 'closing thought for the sealed branch');

// --- reset mid-mission and mid-view ---
await press('F8', 500);
await atStall(); await page.waitForTimeout(900);
await press('KeyE', 700);
ok((await S()).mode === 'pouch', 'inside the pickup view again');
await press('F9', 600);
s = await S();
ok(s.mode === 'play' && s.step === 'idle' && !s.onStall && !s.held && !s.atLin && !(await vis('objective')) && !(await vis('pouch')), 'F9 mid-view: view closed, mission idle, item gone, HUD clean');
await atLin(); await page.waitForTimeout(800);
await press('KeyE', 800);
ok((await S()).line === 'm1-offer', 'after reset, Lin offers the job again');
await press('KeyE', 500);

// API for later integration
const api = await page.evaluate(() => {
  const m = window.__bund.mission, seen = [];
  const off = m.on('complete', (p) => seen.push(p.outcome));
  m.reset(); const started = m.start('chapter'); m.pickUp(); m.handOver(); off();
  const r = { started, seen, step: m.step };
  m.reset();
  return r;
});
ok(api.started && api.seen.join() === 'sealed' && api.step === 'complete', 'window.__bund.mission: start() / on("complete") / reset() work for integration');
ok(errors.length === 0, `no console errors (${errors.slice(0, 3).join(' | ')})`);
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
await browser.close();
process.exit(failed ? 1 : 0);
