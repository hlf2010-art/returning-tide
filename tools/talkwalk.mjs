// Talking to people in your own words, against a running OpenAI-compatible model server (Ollama on
// your machine; here llama.cpp with a small Qwen): the front desk in Mandarin then English, a
// passer-by, Xuan on Xinyu; recorded voices for scripted lines. node tools/talkwalk.mjs (URL=, OUT=)
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const dir = (process.env.OUT || '.') + '/';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (/rejected|llm: failed/.test(m.text())) console.log('INFO ', m.text().slice(0, 240)); }); p.on('console', (m) => { if (m.type() === 'error' && !/favicon|ERR_CONNECTION_REFUSED|8790/.test(m.text())) errs.push(m.text().slice(0, 200)); });
let failed = 0; const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
await p.goto(`${process.env.URL || 'http://localhost:4173/'}?q=5&nolock&life=0&fresh&lang=zh`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 180000 });
await p.evaluate(() => window.__bund.start()); await p.waitForTimeout(2500);
await p.evaluate(() => { window.__bund.dtMax = 0.2; });
const backend = await p.evaluate(async () => { const l = window.__bund.llm; await l.ready(); return l.backend; });
ok(backend === 'server', `the model server is found (${backend})`);
const prompt = () => p.evaluate(() => document.getElementById('prompt').classList.contains('on') ? document.getElementById('prompt').innerText.replace(/\n/g, ' ') : '');
const waitReply = async (n) => { await p.waitForFunction((n) => { const s = document.querySelectorAll('#talk .them span'); return s.length >= n && !document.getElementById('talk').classList.contains('busy') && s[s.length - 1].textContent.length > 1; }, n, { timeout: 240000 }); return p.evaluate(() => { const s = document.querySelectorAll('#talk .them span'); return s[s.length - 1].textContent; }); };
// 1. the front desk at the Peace Hotel, with your key card question
await p.evaluate(() => window.__bund.player.teleport(-55.9, -227.6, Math.PI / 2, -0.08)); await p.waitForTimeout(2500);
let pr = await prompt(); ok(/T|聊天/.test(pr), `at the front desk: "${pr}"`);
await p.keyboard.press('KeyT'); await p.waitForTimeout(800);
ok(await p.evaluate(() => window.__bund.mode === 'talk'), 'T: talking');
let r = await waitReply(1); ok(/[一-鿿]/.test(r), `she greets you (Mandarin): "${r}"`);
await p.screenshot({ path: `${dir}talk-desk.png`, timeout: 120000 });
await p.keyboard.type('你好，请问爵士吧今晚几点开始？'); await p.keyboard.press('Enter');
r = await waitReply(2); ok(/[一-鿿]/.test(r), `asked in Mandarin, answered in Mandarin: "${r}"`);
await p.keyboard.type('Thanks. Is there somewhere good to eat nearby?'); await p.keyboard.press('Enter');
r = await waitReply(3); ok(/[a-zA-Z]{3,}/.test(r) && !/[一-鿿]{4,}/.test(r), `asked in English, answered in English: "${r}"`);
await p.screenshot({ path: `${dir}talk-desk2.png`, timeout: 120000 });
await p.keyboard.press('Escape'); await p.waitForTimeout(800);
ok(await p.evaluate(() => window.__bund.mode === 'play'), 'Esc: back to walking');
const mem = await p.evaluate(() => (window.__bund.life.flags.talked || {}).receptionist || []);
ok(mem.length >= 4, `she remembers what was said (${mem.length} lines)`);
// 2. Xinyu: write to Xuan
await p.keyboard.press('KeyP'); await p.waitForTimeout(600); await p.keyboard.press('Enter'); await p.waitForTimeout(1000);
await p.evaluate(() => document.querySelector('#phone [data-act="app"][data-id="chats"]').click()); await p.waitForTimeout(500);
await p.evaluate(() => document.querySelector('#phone [data-act="openThread"][data-id="xuan"]').click()); await p.waitForTimeout(600);
const n0 = await p.evaluate(() => window.__bund.life.threads.xuan.messages.length);
await p.evaluate(() => { const f = document.querySelector('#phone input.say'); f.focus(); });
await p.keyboard.type('明轩，周末有空吃饭吗？'); await p.keyboard.press('Enter');
await p.waitForFunction((n0) => { const m = window.__bund.life.threads.xuan.messages; return m.length >= n0 + 2 && m[m.length - 1].from === 'xuan'; }, n0, { timeout: 240000 });
const xr = await p.evaluate(() => window.__bund.life.threads.xuan.messages.at(-1).text);
ok(xr.length > 0, `Xuan texts back: "${xr}"`);
await p.screenshot({ path: `${dir}talk-wechat.png`, timeout: 120000 });
await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await p.keyboard.press('KeyP'); await p.waitForTimeout(800);
// 3. recorded voices: a scripted line plays from its clip
const vs = await p.evaluate(async () => { const v = window.__bund.voice; await new Promise((r) => setTimeout(r, 500)); await v.say({ zh: '沈先生，晚上好，欢迎回来。这是您的房卡，612，江景房。', en: "Good evening, Mr Shen, welcome back. Here's your key card: 612, a river-view room.", who: '前台' }); return v.stats; });
ok(vs.loaded && vs.size > 300 && vs.clips >= 1, `scripted lines play from recorded voices (${vs.size} clips; ${vs.clips} played; last: ${JSON.stringify(vs.last)})`);
const vstat = await p.evaluate(() => window.__bund.voice.stats); console.log(`INFO  voice: ${vstat.clips} recorded, ${vstat.server} server, ${vstat.synth} browser-synth`); ok(vstat.synth === 0, "no robotic browser voice unless chosen");
ok(errs.length === 0, `no errors (${errs.slice(0, 3).join(' | ')})`);
console.log(failed ? `${failed} FAILED` : 'all passed');
await b.close();
