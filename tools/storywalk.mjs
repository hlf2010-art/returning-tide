// Walkthrough: the main story. The journal, the first quest's steps, then (skipping the days between)
// dinner with Dad at the Jazz Bar, an answer, the river at ten, and the ending card.
//   URL=http://localhost:4173/ OUT=<dir> node tools/storywalk.mjs
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const url = process.env.URL || 'http://localhost:4173/', out = process.env.OUT || '.';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
p.on('pageerror', (e) => errors.push(e.message));
await p.goto(`${url}?q=4&nolock&fresh&legacy&lang=en`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 300000 });
const ev = (f, a) => p.evaluate(f, a);
await ev(() => { window.__bund.start(); window.__bund.dtMax = 0.25; const s = document.createElement('style'); s.textContent = '#minimap,#dev{display:none!important}'; document.head.appendChild(s); });
await p.waitForTimeout(2500);
await ev(() => window.__bund.updateStory());
const q0 = await ev(() => Object.keys(window.__bund.life.quests.list));
ok(q0.includes('first-night'), `the first quest has begun (${q0.join(', ')})`);
const obj = await ev(() => document.getElementById('m-step').textContent);
ok(/river railing/.test(obj), `on screen: "${obj}"`);
// the journal
await p.keyboard.press('KeyJ'); await p.waitForTimeout(800);
const jr = await ev(() => ({ open: !document.getElementById('journal').classList.contains('hidden'), text: document.querySelector('#journal .detail h2')?.textContent, mode: window.__bund.mode }));
ok(jr.open && jr.text === 'First night on the Bund' && jr.mode === 'journal', `J opens the journal on "${jr.text}"`);
await p.screenshot({ path: `${out}/story-journal.png` });
await p.keyboard.press('KeyJ'); await p.waitForTimeout(500);
ok(await ev(() => window.__bund.mode === 'play'), 'J closes it');
// the first step: the railing
await ev(() => window.__bund.player.teleport(23.6, -2, -Math.PI / 2, 0, 3)); await p.waitForTimeout(1500); await ev(() => window.__bund.updateStory());
ok(await ev(() => window.__bund.life.quests.list['first-night'].step >= 1), 'standing at the railing completes "look across"');
// skip ahead: the arc to Act III (the days between are tested in node: tests/quests.test.mjs)
await ev(() => {
  const L = window.__bund.life, D = (d, h, m = 0) => d * 1440 + h * 60 + m;
  L.flags.hotelKey = true; L.flags.room612 = true; L.flags.calls = [{ from: 'dad', script: 'dad-arrival' }, { from: 'dad', script: 'dad-plans' }];
  L.invites.push({ id: 'xuan-arm', from: 'xuan', status: 'accepted', kept: true, at: D(2, 15) }, { id: 'xuan-demo', from: 'xuan', status: 'accepted', kept: true, at: D(5, 15) });
  L.flags.maker = { gadgets: { telemetry: { quality: 0.8 } }, xp: 120 };
  L.relations.dad = { affinity: 66, mood: 'ok', last: 0 };
  L.clock.day = 5; L.clock.minute = 19 * 60 + 30;
  window.__bund.updateStory(); window.__bund.updateStory();
  const i = L.invites.find((x) => x.id === 'dad-dinner'); if (i) { i.status = 'accepted'; }
  L.clock.day = 6; L.clock.minute = 19 * 60 + 50;
  window.__bund.updateStory();
});
const st = await ev(() => Object.fromEntries(Object.entries(window.__bund.life.quests.list).map(([k, v]) => [k, `${v.status}:${v.step}`])));
ok(st.dinner && st.dinner.startsWith('active'), `Act III: dinner with Dad (${JSON.stringify(st)})`);
// the Jazz Bar: Dad at the reserved table
await ev(() => window.__bund.player.teleport(-42.4, -218.4, Math.PI - 0.4, -0.05)); await p.waitForTimeout(2500);
await ev(() => { const b = window.__bund.player; b.yaw = Math.atan2(-(-40.58 - b.body.x), -(-220.0 - b.body.z)); b.pitch = -0.08; }); await p.waitForTimeout(1500);
const pr = await ev(() => { const e = document.getElementById('prompt'); return e.classList.contains('on') ? e.innerText.replace(/\n/g, ' ') : ''; });
ok(/Sit down with him/.test(pr), `at the table: "${pr}"`);
await p.screenshot({ path: `${out}/story-dad.png` });
await p.keyboard.press('KeyE'); await p.waitForTimeout(1500);
ok(await ev(() => window.__bund.mode === 'seat' && window.__bund.life.flags.dinnerStarted), 'sat down with him; the conversation starts');
// answer: 2 (thanks), 3 (the precision), then 3 (make the arm at the works)
const answer = async (k) => { await p.waitForFunction(() => document.querySelector('#ride-sub .ch') && !document.querySelector('#ride-sub .ch').classList.contains('hidden'), null, { timeout: 120000 }); await p.keyboard.press(k); await p.waitForTimeout(800); };
await ev(() => { window.__bund.dtMax = 0.5; });
await answer('Digit2'); await answer('Digit3');
await p.screenshot({ path: `${out}/story-dinner.png` });
await answer('Digit3');
await p.waitForFunction(() => !!window.__bund.life.flags.dinnerChoice, null, { timeout: 120000 }).catch(() => {});
const choice = await ev(() => window.__bund.life.flags.dinnerChoice);
ok(choice === 'together', `the answer is heard: "${choice}" (the demo went well and he thinks well of you)`);
await p.waitForFunction(() => !window.__bund.world.sceneTalk.active, null, { timeout: 120000 });
await p.keyboard.press('KeyE'); await p.waitForTimeout(800);
ok(await ev(() => window.__bund.mode === 'play'), 'E stands you up once it\'s over');
// the river at ten
await ev(() => { window.__bund.updateStory(); window.__bund.player.teleport(18, -200, -Math.PI / 2, 0.05, 3); const L = window.__bund.life; L.clock.minute = 21 * 60 + 56; window.__bund.updateStory(); L.clock.minute = 22 * 60 + 1; });
await p.waitForTimeout(1500);
await ev(() => window.__bund.updateStory());
await p.waitForFunction(() => document.getElementById('ending-card').classList.contains('on'), null, { timeout: 30000 }).catch(() => {});
const end = await ev(() => ({ on: document.getElementById('ending-card').classList.contains('on'), h: document.querySelector('#ending-card h1')?.textContent, ending: window.__bund.life.flags.ending }));
ok(end.on && end.h === 'Both banks', `the ending: "${end.h}" (${end.ending})`);
await p.screenshot({ path: `${out}/story-ending.png` });
await ev(() => document.querySelector('#ending-card button').click()); await p.waitForTimeout(600);
ok(await ev(() => window.__bund.mode === 'play'), 'and the Bund goes on');
ok(!errors.length, `no errors (${errors.slice(0, 3).join(' | ')})`);
console.log(failed ? `${failed} FAILED` : 'all passed');
await browser.close();
process.exit(failed ? 1 : 0);
