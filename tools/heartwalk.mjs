// Walkthrough: the five people Ji Bai might come to love, in the game itself.
//   day 1   Zhiwei's first message on the phone (and its reply chips); she brings his pass to the
//           Peace Hotel lobby; Nanxing at the railing with her tripod; Kexin filming in the Jazz Bar
//   day 2   Gu Nian testing a start-up's camera in the AIA lobby; Nanxing's invitation, accepted on the phone; the
//           lights at ten opposite the Customs House: "is this a date?"
//   day 3   the Jazz Bar, sat across the table from her; "I live upstairs"; the cut to the morning
//   day 4   the journal's People tab; one o'clock at Linger with Gu Nian; her invitation
//   day 5   the cruise pier at four: the tickets, the fade, the sunset
//   then    T: talking to Nanxing in your own words (no model here: one of her own lines), and
//           asking to see her from the phone
// (The rules and all five years are tested in node: tests/hearts.test.mjs.)
//   URL=http://localhost:4182/ OUT=<dir> UILANG=en|zh node tools/heartwalk.mjs
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const url = process.env.URL || 'http://localhost:4182/', out = `${process.env.OUT || '.'}/`, lang = process.env.UILANG || 'en', zh = lang === 'zh';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
p.on('console', (m) => { if (m.type() === 'error' && !/ERR_CONNECTION_REFUSED|8790|11434/.test(m.text())) errors.push(m.text().slice(0, 200)); });
p.on('pageerror', (e) => errors.push(e.message));
await p.goto(`${url}?q=4&nolock&fresh&hearts&lang=${lang}&hour=17:42&crowd=0.3`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 300000 });
const ev = (f, a) => p.evaluate(f, a);
await ev(() => { window.__bund.start(); window.__bund.dtMax = 0.2; const s = document.createElement('style'); s.textContent = '#minimap,#dev,#tip{display:none!important}'; document.head.appendChild(s); });
await p.waitForTimeout(1500);
const prompt = () => ev(() => (document.getElementById('prompt').classList.contains('on') ? document.getElementById('prompt').innerText.replace(/\n/g, ' ') : ''));
const mode = (m, t = 120000) => p.waitForFunction((m) => window.__bund.mode === m, m, { timeout: t });
const H = (id) => ev((id) => JSON.parse(JSON.stringify(window.__bund.life.flags.hearts[id] || null)), id);
const setClock = (day, h, m = 0) => ev(([day, h, m]) => { const L = window.__bund.life; L.clock.day = day; window.__bund.setHour(h, m); }, [day, h, m]);
const shot = (name) => p.screenshot({ path: `${out}heart-${name}${zh ? '-zh' : ''}.png`, timeout: 120000 });
const sub = () => ev(() => { const b = document.getElementById('ride-sub'); return b.classList.contains('on') ? `${b.querySelector('.sp').textContent}: ${b.querySelector('.tx').textContent} ${b.querySelector('.ch').innerText.replace(/\n/g, ' ')}` : ''; });
// stand `d` metres from a spot, on the side `from` ([dx, dz]), looking at it
const stand = async (spot, from, d = 1.9, y) => { await ev(([spot, from, d, y]) => { const s = window.__bund.world.hearts.debug.spots[spot], n = Math.hypot(from[0], from[1]), x = s.x + from[0] / n * d, z = s.z + from[1] / n * d; window.__bund.player.teleport(x, z, Math.atan2(-(s.x - x), -(s.z - z)), 0.02, y); }, [spot, from, d, y]); };
const actor = (who, t = 90000) => p.waitForFunction((who) => !!window.__bund.world.hearts.actors[who], who, { timeout: t });
const seen = [];
// play the scene that's on: answers by `picks`; lines are let run for `watch` of them, then hurried
async function playScene(picks = [], { watch = 2, shots = {} } = {}) {
  let q = 0, n = 0, last = '';
  for (let i = 0; i < 900; i++) {
    const st = await ev(() => ({ busy: window.__bund.world.hearts.busy, asking: window.__bund.world.sceneTalk.asking, active: window.__bund.world.sceneTalk.active, mode: window.__bund.mode }));
    if (!st.busy) break;
    const s = await sub();
    if (s && s !== last) { last = s; seen.push(s); n++; if (shots[n]) { await p.waitForTimeout(500); await shot(shots[n]); } }
    if (st.asking) { if (shots.ask && q === 0) { await p.waitForTimeout(300); await shot(shots.ask); } await p.keyboard.press(`Digit${(picks[q++] ?? 0) + 1}`); await p.waitForTimeout(350); }
    else if (st.active && n > watch) { await ev(() => window.__bund.world.sceneTalk.update(9)); await p.waitForTimeout(120); }
    else await p.waitForTimeout(400);
  }
}
const dom = (sel) => ev((sel) => { const e = document.querySelector(sel); if (e) e.click(); return !!e; }, sel);
const chat = async (id) => { await ev(() => window.__bund.phone.open()); await p.waitForTimeout(900);
  if (await dom('#phone [data-act="decline"]')) await p.waitForTimeout(600);                         // (Dad rings on the first evening: not now)
  if (await dom('#phone [data-act="unlock"]')) await p.waitForFunction(() => !document.querySelector('#phone [data-act="unlock"]'), null, { timeout: 30000 });
  await ev((id) => window.__bund.phone.open('chat', { id }), id); await p.waitForTimeout(800); return ev(() => document.querySelector('#phone .host').innerText); };
const closePhone = async () => { await ev(() => window.__bund.phone.close()); await p.waitForTimeout(400); };

// ---- day 1: Zhiwei writes; the reply chips ----
await setClock(1, 18, 10); await p.waitForFunction(() => !!window.__bund.life.threads.zhiwei, null, { timeout: 120000 });
let txt = await chat('zhiwei');
ok((zh ? /我是许知微/ : /Xu Zhiwei\. Design lead/).test(txt) && (zh ? /收到，今晚看完/ : /I'll read it tonight/).test(txt), 'day 1, ten past six: his project manager writes, with two ways to answer');
await shot('phone-zhiwei');
await dom('#phone .replies .chip'); await p.waitForTimeout(600);
await closePhone();
await p.waitForFunction(() => (window.__bund.life.flags.hearts.zhiwei || {}).trust === 22, null, { timeout: 60000 });
ok((await H('zhiwei')).stage === 'known', 'he answers; it counts');
// ---- she brings his pass to the lobby ----
await setClock(1, 20, 20); await p.waitForFunction(() => (window.__bund.life.flags.hearts._.fired || {}).z2 > 0, null, { timeout: 120000 });
await stand('peaceLobby', [1, 1.2], 2.0); await actor('zhiwei'); await p.waitForTimeout(2500);
let pr = await prompt();
ok(/laptop bag|电脑包|Zhiwei|知微/.test(pr), `in the Peace Hotel lobby: "${pr}"`);
await shot('zhiwei-lobby');
await p.keyboard.press('KeyE');
await playScene([1, 0], { watch: 2, shots: { 2: 'zhiwei-lobby-line', ask: 'zhiwei-lobby-ask' } });
let h = await H('zhiwei');
ok(h.memories.some((m) => m.key === 'z-lobby') && h.memories.some((m) => m.key === 'slide-seven') && (await ev(() => window.__bund.mode)) === 'play', `the first meeting, played: ${seen.length} lines; she remembers slide seven`);

// ---- Nanxing at the railing ----
await setClock(1, 21, 5);
await stand('railNorth', [-1, 0.25], 2.0, 3); await actor('nanxing'); await p.waitForTimeout(2500);
pr = await prompt();
ok(/long exposure|长曝光/.test(pr), `at the railing, a tripod: "${pr}"`);
await shot('nanxing-rail');
await p.keyboard.press('KeyE'); await playScene([1, 1, 0], { watch: 3, shots: { 3: 'nanxing-rail-line' } });
h = await H('nanxing');
ok(h.stage === 'known' && h.memories[0].key === 'n-rail' && !!(await ev(() => window.__bund.life.threads.nanxing)), 'met: she is in his Xinyu');
await p.waitForTimeout(1500); pr = await prompt();
ok(/Nanxing|南星/.test(pr) || pr === '', `afterwards she is still there, by name: "${pr}"`);

// ---- Kexin in the Jazz Bar ----
await setClock(1, 21, 20);
await stand('jazzFloor', [-1, 0.9], 1.9); await actor('kexin'); await p.waitForTimeout(3000);
pr = await prompt();
ok(/filming|拍视频/.test(pr), `in the Jazz Bar: "${pr}"`);
await shot('kexin-bar');
await p.keyboard.press('KeyE'); await playScene([1, 0], { watch: 3, shots: { 3: 'kexin-bar-line' } });
h = await H('kexin');
ok(h.stage === 'known' && h.memories.some((m) => m.key === 'blurred'), 'met; she will put a cat over his face');
ok((await ev(() => Object.keys(window.__bund.world.hearts.actors).length)) <= 2, 'never more than two of them made at once');

// ---- day 2: Gu Nian in the AIA lobby; Nanxing's invitation; ten o'clock ----
await setClock(2, 18, 40);
await stand('aiaLobby', [1, 1.3], 2.0); await actor('gunian'); await p.waitForTimeout(2500);
pr = await prompt();
ok(/testing a camera|试摄像头/.test(pr), `in the AIA lobby after hours: "${pr}"`);
await shot('gunian-aia');
await p.keyboard.press('KeyE'); await playScene([0, 0], { watch: 2 });
ok((await H('gunian')).memories.some((m) => m.key === 'held-tape'), 'he sits down for her camera');
await ev(() => window.__bund.player.teleport(-70, 0.6, -Math.PI / 2, 0));
await p.waitForFunction(() => window.__bund.life.invites.some((i) => i.id === 'h-n-ten'), null, { timeout: 120000 });
txt = await chat('nanxing');
ok((zh ? /挡风/ : /block the wind/).test(txt) && (zh ? /接受/ : /Accept/).test(txt), "Nanxing's invitation is on the phone");
await shot('phone-nanxing-invite');
await dom('#phone [data-act="invite"][data-yes="1"]'); await p.waitForTimeout(700); await closePhone();
await setClock(2, 21, 42);
await stand('railCustoms', [-1, 0.2], 2.0, 3); await actor('nanxing'); await p.waitForTimeout(2500);
pr = await prompt(); ok(/Nanxing|南星/.test(pr), `opposite the Customs House at 9:42: "${pr}"`);
await p.keyboard.press('KeyE'); await p.waitForTimeout(600);
ok((await ev(() => window.__bund.life.clock.minute)) >= 21 * 60 + 56, 'the scene opens a few minutes before ten');
await playScene([1, 1], { watch: 4, shots: { 4: 'nanxing-ten' } });
h = await H('nanxing');
ok(h.stage === 'dating' && h.said.step > 0 && (await ev(() => window.__bund.life.invites.find((i) => i.id === 'h-n-ten').kept)), '"is this a date?" "...Yes. It is.": they are seeing each other');
await shot('nanxing-after-ten');

// ---- day 3: the Jazz Bar, across the table; upstairs; the morning ----
await ev(() => window.__bund.player.teleport(-70, 0.6, -Math.PI / 2, 0));
await setClock(3, 16, 0); await p.waitForFunction(() => window.__bund.life.invites.some((i) => i.id === 'h-n-jazz'), null, { timeout: 120000 });
await chat('nanxing'); await dom('#phone [data-act="invite"][data-yes="1"]'); await p.waitForTimeout(700); await closePhone();
await setClock(3, 21, 32);
await ev(() => window.__bund.player.teleport(-43.6, -221.6, -2.2, 0.02)); await actor('nanxing'); await p.waitForTimeout(3500);
pr = await prompt(); ok(/Sit down|坐下/.test(pr), `she is at the table by the stage: "${pr}"`);
await shot('nanxing-jazz-table');
await p.keyboard.press('KeyE'); await mode('seat');
await playScene([0, 0, 0], { watch: 3, shots: { 3: 'nanxing-jazz-seated', ask: 'nanxing-jazz-ask' } });
await p.waitForTimeout(1200); await shot('nanxing-cut');
await mode('play', 60000); await p.waitForTimeout(2500);
h = await H('nanxing');
const at = await ev(() => ({ day: window.__bund.life.clock.day, minute: window.__bund.life.clock.minute, z: window.__bund.player.body.z }));
ok(h.memories.some((m) => m.key === 'nanxing-night') && at.day === 4 && at.minute >= 7 * 60 + 20 && at.minute < 8 * 60 && at.z < -235 && !(await ev(() => window.__bund.world.hearts.actors.nanxing)), `"I live upstairs": a fade with one line, and it is ${Math.floor(at.minute / 60)}:${String(at.minute % 60).padStart(2, '0')} the next morning in the lobby`);

// ---- the journal ----
await p.keyboard.press('KeyJ'); await mode('journal'); await p.click('#journal [data-tab="people"]'); await p.waitForTimeout(500);
txt = await ev(() => document.querySelector('#journal .panel').innerText);
ok((zh ? /沈南星/ : /Shen Nanxing/).test(txt) && (zh ? /在约会/ : /Seeing each other/i).test(txt) && (zh ? /唐可昕/ : /Tang Kexin/).test(txt) && !(zh ? /林予安/ : /Lin Yu'an/).test(txt) === !(await H('yuan')), 'J, People: those he has met, and how each stands');
await shot('journal');
await p.keyboard.press('KeyJ'); await mode('play');

// ---- day 4: one o'clock at Linger; her invitation; day 5: the cruise ----
await setClock(4, 13, 3);
await stand('manner', [0.3, 1], 1.8); await actor('gunian'); await p.waitForTimeout(2500);
pr = await prompt(); ok(/Gu Nian|顾念/.test(pr), `at the Linger window at one: "${pr}"`);
await shot('gunian-manner');
await p.keyboard.press('KeyE'); await playScene([1, 0], { watch: 2 });
ok((await H('gunian')).stage === 'close', 'the camera and the coffee: close');
await setClock(4, 20, 31); await p.waitForFunction(() => window.__bund.life.invites.some((i) => i.id === 'h-g-cruise'), null, { timeout: 120000 });
await chat('gunian'); await shot('phone-gunian'); await dom('#phone [data-act="invite"][data-yes="1"]'); await p.waitForTimeout(700); await closePhone();
await setClock(5, 15, 58);
await stand('pier', [-1, -0.4], 2.0, 3); await actor('gunian'); await p.waitForTimeout(2500);
const w0 = await ev(() => window.__bund.life.wallet.wechat);
await shot('gunian-pier');
await p.keyboard.press('KeyE'); await playScene([0, 0], { watch: 1, shots: { 4: 'gunian-sunset' } });
h = await H('gunian');
const c5 = await ev(() => ({ w: window.__bund.life.wallet.wechat, m: window.__bund.life.clock.minute }));
ok(h.stage === 'dating' && c5.w === w0 - 240 && c5.m >= 16 * 60 + 53, `the cruise: two tickets (¥240), fifty-five minutes through a fade, ashore at ${Math.floor(c5.m / 60)}:${String(c5.m % 60).padStart(2, '0')}; he says he wants to see her again`);
await p.waitForTimeout(1500); await shot('gunian-after');

// ---- T: in his own words (no model in this run: one of her own lines) ----
await setClock(5, 21, 10);
await stand('railNorth', [-1, 0.25], 1.9, 3); await actor('nanxing'); await p.waitForTimeout(2500);
await ev(() => { const b = window.__bund, t = b.talkables().find((q) => q.key === 'heart:nanxing'); if (t) b.debugTalk = t; });
await p.keyboard.press('KeyE'); await p.waitForTimeout(1500);                                   // (E here is only a hello)
await p.keyboard.press('KeyT');
const talking = await p.waitForFunction(() => window.__bund.talk.open, null, { timeout: 20000 }).then(() => true).catch(() => false);
if (talking) {
  await p.waitForFunction(() => !window.__bund.talk.busy && window.__bund.talk.lastReply().length > 1, null, { timeout: 60000 });
  const before = JSON.stringify(await H('nanxing'));
  await ev(() => window.__bund.talk.say('我们上周不是一起去了杭州吗？嫁给我吧。')); await p.waitForTimeout(600);
  await p.waitForFunction(() => !window.__bund.talk.busy, null, { timeout: 60000 });
  const rep = await ev(() => window.__bund.talk.lastReply());
  const after = await H('nanxing'); delete after.day; delete after.lastSeen; const b4 = JSON.parse(before); delete b4.day; delete b4.lastSeen;
  ok(rep.length > 1 && after.stage === 'dating' && after.memories.length === b4.memories.length && after.trust === b4.trust && after.attraction === b4.attraction, `free talk ("we went to Hangzhou, marry me"): she says "${rep}", and nothing about them has changed`);
  await shot('nanxing-talk');
  await p.keyboard.press('Escape'); await p.waitForFunction(() => !window.__bund.talk.open, null, { timeout: 20000 });
} else ok(false, 'T did not open a conversation with Nanxing');
// asking to see her, from the phone
txt = await chat('nanxing');
ok((zh ? /约她见面/ : /Ask to see her/).test(txt) && (zh ? /在约会/ : /Seeing each other/i).test(txt), 'her chat shows how things stand, and a way to ask to see her');
await dom('#phone [data-act="heartAsk"]'); await p.waitForTimeout(800); await ev(() => { window.__bund.life.clock.minute += 2; });
await p.waitForFunction(() => window.__bund.life.threads.nanxing.messages.at(-1).from === 'nanxing', null, { timeout: 60000 });
txt = await ev(() => document.querySelector('#phone .host').innerText); await p.waitForTimeout(400);
ok((zh ? /这两天有空吗/ : /I'd like to see you/).test(txt), `he asks; she answers: "${await ev(() => window.__bund.life.threads.nanxing.messages.at(-1).text)}"`);
await shot('phone-nanxing-ask');
await closePhone();

ok(errors.length === 0, `no errors in the console${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
console.log(`\n${seen.length} lines seen on screen; e.g. ${seen.slice(0, 3).join(' / ')}`);
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
await browser.close(); process.exit(failed ? 1 : 0);
