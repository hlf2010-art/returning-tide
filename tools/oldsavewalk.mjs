// A save from before phase 5 (tests/fixtures/save-before-phase5.json, written by the previous code:
// day 3, the gimbal built, the story under way) loaded into the game as it is now: it boots, the
// story is where it was, the gimbal is version 1 and its week can begin; the slot saves again as v1.
//   URL=http://localhost:4174/ OUT=<dir> node tools/oldsavewalk.mjs
import { createRequire } from 'module';
import { readFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const url = process.env.URL || 'http://localhost:4174/', out = `${process.env.OUT || '.'}/`;
const fixture = readFileSync(new URL('../tests/fixtures/save-before-phase5.json', import.meta.url), 'utf8');
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.addInitScript((json) => { if (!localStorage.getItem('bund-life-v1')) localStorage.setItem('bund-life-v1', json); }, fixture);
const p = await ctx.newPage();
const errors = [];
p.on('console', (m) => { if (m.type() === 'error' && !/ERR_CONNECTION_REFUSED|8790|11434/.test(m.text())) errors.push(m.text().slice(0, 200)); });
p.on('pageerror', (e) => errors.push(e.message));
await p.goto(`${url}?q=4&nolock&lang=en&tod`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 300000 });
const ev = (f, a) => p.evaluate(f, a);
const was = JSON.parse(fixture);
await ev(() => { window.__bund.start(); window.__bund.dtMax = 0.2; }); await p.waitForTimeout(3000);
await ev(() => window.__bund.updateStory());
const now = await ev(() => { const L = window.__bund.life; return { v: L.v, day: L.clock.day, minute: L.clock.minute, quests: Object.fromEntries(Object.entries(L.quests.list).map(([k, v]) => [k, `${v.status}:${v.step}`])), wechat: L.wallet.wechat, bank: L.wallet.bank, gimbal: L.flags.maker.gadgets.gimbal, threads: Object.keys(L.threads).length, dad: L.relations.dad && L.relations.dad.affinity }; });
ok(now.v === 1 && now.day === was.clock.day && now.minute >= was.clock.minute, `the old save loads where it was left: day ${now.day}, ${Math.floor(now.minute / 60)}:${String(now.minute % 60).padStart(2, '0')}`);
ok(Object.entries(was.quests.list).every(([k, v]) => now.quests[k] && now.quests[k].startsWith(v.status)), `the story's quests are as they were (${JSON.stringify(now.quests)})`);
ok(now.quests['own-work'] === 'active:1', 'the new side quest has begun at "lend it" (the gimbal was already built)');
ok(now.wechat === was.wallet.wechat && now.bank === was.wallet.bank && now.gimbal.version === 1 && now.gimbal.quality === was.flags.maker.gadgets.gimbal.quality, 'money and the gimbal untouched: version 1');
await p.keyboard.press('KeyN'); await p.waitForFunction(() => window.__bund.mode === 'work', null, { timeout: 30000 }); await p.waitForTimeout(500);
ok(/version 1/i.test(await ev(() => document.querySelector('#workbook .ph').innerText)) && /386 g/.test(await ev(() => document.querySelector('#workbook .specs').innerText)), 'N: the notebook opens on it');
await p.screenshot({ path: `${out}oldsave-notebook.png`, timeout: 120000 });
await p.keyboard.press('Escape'); await p.waitForFunction(() => window.__bund.mode === 'play', null, { timeout: 30000 });
await p.keyboard.press('KeyJ'); await p.waitForFunction(() => window.__bund.mode === 'journal', null, { timeout: 30000 }); await p.waitForTimeout(500);
const j = await ev(() => [...document.querySelectorAll('#journal .q .name')].map((e) => e.textContent));
ok(j.includes('The robot arm') && j.includes('First night on the Bund') && j.includes('Something of your own'), `the journal lists them all (${j.join(' · ')})`);
await p.keyboard.press('KeyJ'); await p.waitForFunction(() => window.__bund.mode === 'play', null, { timeout: 30000 });
await p.keyboard.press('KeyP'); await p.waitForTimeout(1200);
ok(await ev(() => window.__bund.phone.isOpen), 'the phone opens'); await p.keyboard.press('KeyP'); await p.waitForTimeout(600);
await p.waitForTimeout(6000);                                                          // an autosave
const saved = JSON.parse(await ev(() => localStorage.getItem('bund-life-v1')));
ok(saved.v === 1 && saved.flags.studio && saved.flags.studio.v === 1 && saved.quests.list['own-work'], 'it autosaves in the same format (v 1), the new state inside flags');
ok(errors.length === 0, `no console errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nall passed'); process.exit(failed ? 1 : 0);
