// Dev tool: the language setting. Only one language on screen at a time: entry card, settings,
// HUD, the phone. Switching in Settings changes everything already on screen and is remembered.
//   node tools/langtest.mjs [url] [outDir]
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const [url = 'http://localhost:5173/', out = '.'] = process.argv.slice(2);
let failed = 0;
const ok = (c, msg) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`); if (!c) failed++; };
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: 'en-GB' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const HAN = /[一-鿿]/, LATIN = /[A-Za-z]{3,}/;
// visible text of an element, minus what belongs to the world or to brands (Linger, Xinyu names in the zh UI are fine)
const text = (sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? e.innerText : ''; }, sel);

await page.goto(url + '?q=5&nolock&life=1', { waitUntil: 'load' });
await page.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 180000 });
let card = await text('#entry .card');
ok(!HAN.test(card), `English browser: the entry card is English only ("${card.slice(0, 40).replace(/\n/g, ' ')}…")`);
await page.screenshot({ path: `${out}/lang-entry-en.png` });

// switch on the title screen's quick toggle
await page.click('#entry .lang-quick [data-v="zh"]'); await page.waitForTimeout(300);
card = await text('#entry .card');
const cardNoBrand = card;
ok(HAN.test(card) && !LATIN.test(cardNoBrand), `中文: the entry card is Chinese only ("${card.slice(0, 20).replace(/\n/g, ' ')}…")`);
await page.screenshot({ path: `${out}/lang-entry-zh.png` });

// settings dialog in Chinese
await page.click('#entry [data-open-settings]'); await page.waitForTimeout(300);
const set = await text('#settings');
ok(HAN.test(set) && !/Language|Subtitles|Sound/.test(set), 'settings dialog follows the language');
await page.screenshot({ path: `${out}/lang-settings-zh.png` });
await page.click('#settings [data-close-settings]');

await page.click('#begin'); await page.waitForTimeout(1500);
const hud = await page.evaluate(() => ['place', 'objective', 'keys'].map((id) => document.getElementById(id).innerText).join(' | '));
ok(HAN.test(hud) && !/Mission|walk|Hankou/.test(hud), `HUD in Chinese ("${hud.replace(/\n/g, ' ').slice(0, 60)}")`);
await page.screenshot({ path: `${out}/lang-hud-zh.png` });

// phone in Chinese, then switch to English while it is open
await page.evaluate(() => { const L = window.__bund.life; window.__bund.life.clock.minute += 30; });
await page.waitForTimeout(2500);
await page.keyboard.press('KeyP'); await page.waitForTimeout(900);
await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
let ph = await text('#phone');
ok(HAN.test(ph) && !/Xinyu|Wallet|Calendar|unlock/.test(ph), 'phone home screen in Chinese');
await page.screenshot({ path: `${out}/lang-phone-zh.png` });
await page.evaluate(() => window.__bund.setLang('en'));
await page.waitForTimeout(600);
ph = await text('#phone');
ok(!HAN.test(ph), `switching to English re-renders the open phone ("${ph.replace(/\n/g, ' ').slice(0, 60)}")`);
// open the group chat: messages written in Chinese read in English
await page.evaluate(() => { const r = [...document.querySelectorAll('#phone [data-act="app"]')].find((e) => e.dataset.id === 'chats'); r && r.click(); });
await page.waitForTimeout(500);
await page.evaluate(() => { const r = document.querySelector('#phone [data-act="openThread"]'); r && r.click(); });
await page.waitForTimeout(700);
ph = await text('#phone');
ok(!HAN.test(ph) && ph.length > 40, `a chat read in English ("${ph.replace(/\n/g, ' ').slice(0, 80)}")`);
await page.screenshot({ path: `${out}/lang-phone-en.png` });
await page.keyboard.press('KeyP'); await page.waitForTimeout(500);
const hudEn = await page.evaluate(() => ['place', 'objective', 'keys'].map((id) => document.getElementById(id).innerText).join(' | '));
ok(!HAN.test(hudEn), `HUD switched to English ("${hudEn.replace(/\n/g, ' ').slice(0, 60)}")`);
await page.screenshot({ path: `${out}/lang-hud-en.png` });

// remembered
await page.goto(url + '?q=5&nolock', { waitUntil: 'load' });
await page.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 180000 });
ok(await page.evaluate(() => document.documentElement.lang) === 'en' && !HAN.test(await text('#entry .card')), 'the choice is remembered on reload');
ok(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
await browser.close();
process.exit(failed ? 1 : 0);
