// Walkthrough: something of your own. The night gimbal's week, in the game itself:
//   dusk on the promenade: lend it to Old Chen (what he says, his promise), to a passer-by taking
//   a photo, until the battery is flat; by daylight nobody can tell the difference
//   N: the notebook, to read; the desk in 612: write the day up, a firmware fix (version 2)
//   the bench in Yangpu: a hardware revision with three joints to solder (version 3)
//   the next evening: Old Chen notices what changed
//   day 6: the dinner, the gimbal on the table, what Dad reads off it, the ending's afterword
// (The rules themselves are tested in node: tests/studio.test.mjs.)
//   URL=http://localhost:4174/ OUT=<dir> UILANG=en|zh node tools/workwalk.mjs
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const url = process.env.URL || 'http://localhost:4174/', out = `${process.env.OUT || '.'}/`, lang = process.env.UILANG || 'en', zh = lang === 'zh';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
p.on('console', (m) => { if (m.type() === 'error' && !/ERR_CONNECTION_REFUSED|8790|11434/.test(m.text())) errors.push(m.text().slice(0, 200)); });
p.on('pageerror', (e) => errors.push(e.message));
await p.goto(`${url}?q=4&nolock&fresh&legacy&lang=${lang}&hour=17:40&crowd=0.5`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 300000 });
const ev = (f, a) => p.evaluate(f, a);
await ev(() => { window.__bund.start(); window.__bund.dtMax = 0.2; const s = document.createElement('style'); s.textContent = '#minimap,#dev,#tip{display:none!important}'; document.head.appendChild(s); });
await p.waitForTimeout(1500);
const prompt = () => ev(() => (document.getElementById('prompt').classList.contains('on') ? document.getElementById('prompt').innerText.replace(/\n/g, ' ') : ''));
const mode = (m, t = 90000) => p.waitForFunction((m) => window.__bund.mode === m, m, { timeout: t });
const studio = () => ev(() => JSON.parse(JSON.stringify(window.__bund.life.flags.studio || null)));
const setClock = (day, h, m = 0) => ev(([day, h, m]) => { const L = window.__bund.life; L.clock.day = day; window.__bund.setHour(h, m); }, [day, h, m]);
const idle = () => p.waitForFunction(() => !window.__bund.world.fieldTest.busy && !window.__bund.world.fieldTest.debug.state.queue.length && window.__bund.world.fieldTest.debug.state.said <= 0, null, { timeout: 120000 });
const shot = (name) => p.screenshot({ path: `${out}work-${name}${zh ? '-zh' : ''}.png`, timeout: 120000 });
const barks = [];
await p.exposeFunction('__bark', (t) => { if (t && barks[barks.length - 1] !== t) barks.push(t); });
await ev(() => { const el = document.getElementById('bark-text'); new MutationObserver(() => window.__bark(el.textContent)).observe(el, { childList: true, characterData: true, subtree: true }); });

// ---- 0. nothing built: nothing to lend, an empty notebook ----
await setClock(2, 17, 40);
await ev(() => window.__bund.player.teleport(19.6, 23.5, -Math.PI / 2, 0, 3)); await p.waitForTimeout(2500);
ok(!(await ev(() => !!window.__bund.world.fieldTest.actors.chen)), 'before the gimbal exists, nobody is waiting for it');
await p.keyboard.press('KeyN'); await mode('work'); await p.waitForTimeout(400);
ok(/empty|空的/.test(await ev(() => document.querySelector('#workbook .panel').innerText)), 'N: the notebook is empty');
await p.keyboard.press('Escape'); await mode('play');

// ---- 1. the gimbal (building it is tools/makerwalk.mjs), and dusk on the promenade ----
await ev(() => { const L = window.__bund.life; const m = L.flags.maker ||= { xp: 120, parts: {}, gadgets: {}, builds: [], photos: [], shot: {}, achievements: [], followers: 3412, log: [] }; m.xp = Math.max(m.xp, 120); m.gadgets.gimbal = { at: 0, quality: 0.8, version: 1 }; });
await p.waitForFunction(() => !!window.__bund.world.fieldTest.actors.chen, null, { timeout: 60000 }); await p.waitForTimeout(2500);
let pr = await prompt();
ok(/Lend the gimbal|借给他试试/.test(pr), `Old Chen is opposite the Customs House: "${pr}"`);
await p.keyboard.press('KeyE');
await p.waitForFunction(() => window.__bund.world.fieldTest.debug.state.cur && window.__bund.world.fieldTest.debug.state.cur.lent, null, { timeout: 60000 }); await p.waitForTimeout(1800);
ok(await ev(() => window.__bund.world.fieldTest.actors.chen.prop.group.visible), 'it is in his hands');
await shot('lent');
await p.waitForFunction(() => (window.__bund.life.flags.studio || { tests: [] }).tests.length === 1, null, { timeout: 60000 }); await p.waitForTimeout(1200);
await shot('said');
await idle();
let S = await studio();
ok(S.tests[0].who === 'chen' && S.tests[0].kind === 'found' && S.tests[0].issue === 'heavy' && S.people.chen.promised === 3 && S.heardOf.ye, `he finds it heavy, asks you to bring it back changed, and tells you who's further along (${barks.length} lines)`);
ok(barks.some((t) => /heavy|沉/.test(t)) && barks.some((t) => /Bring it back|改了再拿来/.test(t)), 'what he said was on screen');
const clock0 = await ev(() => window.__bund.life.clock.minute);
ok(clock0 >= 17 * 60 + 48, 'a go takes eight minutes of the evening');
// the same version again: no
await p.keyboard.press('KeyE'); await p.waitForTimeout(1200); await idle();
ok(barks.some((t) => /Same one as yesterday|还是昨天那台/.test(t)) && (await studio()).tests.length === 1, 'the same version gets you nowhere');

// a passer-by at the railing, taking a photo
const agent = await ev(() => { const b = window.__bund, cv = b.world.crowdView; if (!cv) return null; const pp = b.player.body; const a = cv.nearAgents().filter((x) => !x.gone && x.kind !== 'guide' && !x.child && Math.abs(x.y - pp.y) < 1.2).sort((m, n) => Math.hypot(m.x - pp.x, m.z - pp.z) - Math.hypot(n.x - pp.x, n.z - pp.z))[0]; if (!a) return null; a.state = 'act'; a.act = 'photo'; a.wait = 120; a.vx = a.vz = 0; return { id: a.id, x: a.x, z: a.z, persona: a.persona }; });
if (agent) {
  await ev((a) => { const b = window.__bund; b.player.teleport(a.x - 1.9, a.z, -Math.PI / 2, 0.02, 3); }, agent); await p.waitForTimeout(1500);
  pr = await prompt();
  ok(/Lend the gimbal|借出去试试/.test(pr), `someone taking a photo at the railing: "${pr}"`);
  await p.keyboard.press('KeyE'); await p.waitForFunction(() => (window.__bund.life.flags.studio || { tests: [] }).tests.length === 2, null, { timeout: 60000 }); await idle();
  S = await studio();
  ok(S.tests[1].who === 'anon' && ['found', 'again'].includes(S.tests[1].kind), `a ${S.tests[1].persona}: ${S.tests[1].kind} (${S.tests[1].issue})`);
  await p.waitForTimeout(800); pr = await prompt();
  ok(!/Lend the gimbal|借出去试试/.test(pr), 'one go each: you can\'t ask the same person twice');
} else ok(false, 'no crowd near the railing to lend it to');
// the battery: version 1 has three goes in it
await ev(() => { const st = window.__bund.life.flags.studio; st.used = 95 - 10; });
await ev(() => window.__bund.player.teleport(19.6, 23.5, -Math.PI / 2, 0, 3)); await p.waitForTimeout(1200);
await ev(() => { window.__bund.life.flags.maker.gadgets.gimbal.version = 2; });            // (so Old Chen will take it again)
await p.keyboard.press('KeyE'); await p.waitForFunction(() => !!window.__bund.life.flags.studio.found.battery, null, { timeout: 60000 });
ok(/Flat|没电/.test(await ev(() => document.getElementById('thought').textContent)), 'the battery is flat: that one you find yourself');
await ev(() => { window.__bund.life.flags.maker.gadgets.gimbal.version = 1; window.__bund.life.flags.studio.people.chen.rev = 1; });
await p.waitForTimeout(2500);

// ---- 2. the notebook, to read ----
await p.keyboard.press('KeyN'); await mode('work'); await p.waitForTimeout(500);
let txt = await ev(() => document.querySelector('#workbook .panel').innerText);
ok(/386 g/.test(txt) && /(evenings until|个晚上)/.test(txt) && !/Write it down|写下来/.test(txt), 'N: the notebook, read only: the numbers, the evenings left, what was said');
await shot('notebook');
await p.keyboard.press('Digit2'); await p.waitForTimeout(300);
ok(/Not written up yet|还没写下来/.test(await ev(() => document.querySelector('#workbook .body').innerText)), 'the issues are only notes until they are written up');
await p.keyboard.press('Escape'); await mode('play');

// ---- 3. the desk in 612: write the day up; firmware ----
await ev(() => { const L = window.__bund.life; L.flags.hotelKey = true; L.flags.room612 = true; (L.flags.studio.found.boot = { eve: 2, by: 'office', n: 1, noted: false }); });
await setClock(2, 22, 30);
await ev(() => window.__bund.player.teleport(-39.4, -227.2, Math.PI, -0.35, 23.5)); await p.waitForTimeout(2500);
pr = await prompt();
ok(/Write up today|写今天的记录/.test(pr), `at the desk in 612: "${pr}"`);
await shot('desk');
await p.keyboard.press('KeyE'); await mode('work'); await p.waitForTimeout(500);
await ev(() => { document.querySelector('#workbook [data-line="0"]').click(); }); await p.waitForTimeout(200);
await ev(() => { document.querySelector('#workbook [data-plan="heavy"]').click(); }); await p.waitForTimeout(200);
await shot('write');
await ev(() => document.querySelector('#workbook [data-act="write"]').click()); await p.waitForTimeout(600);
S = await studio();
ok(S.pages[2] && S.pages[2].line && S.pages[2].line.who === 'chen' && S.pages[2].plan[0] === 'heavy' && Object.values(S.found).every((f) => f.noted), 'the page is written: his line underlined, tomorrow planned, everything heard now understood');
await shot('issues');
ok(await ev(() => !document.querySelector('#workbook [data-pick="lighten"]') && !!document.querySelector('#workbook [data-pick="quickboot"]')), 'at the desk: firmware can be changed, hardware can\'t');
await ev(() => document.querySelector('#workbook [data-pick="quickboot"]').click()); await p.waitForTimeout(200);
await ev(() => document.querySelector('#workbook [data-act="make"]').click());
await p.waitForFunction(() => window.__bund.life.flags.maker.gadgets.gimbal.version === 2 && window.__bund.mode === 'work', null, { timeout: 60000 }); await p.waitForTimeout(1500);
ok((await ev(() => window.__bund.life.clock)).day === 3, 'version 2, an hour and a half later: past midnight');
await p.keyboard.press('Digit3'); await p.waitForTimeout(300); await shot('pages');
await p.keyboard.press('Escape'); await mode('play');

// ---- 4. the bench in Yangpu: hardware, and three joints ----
await setClock(3, 10, 0);
ok(await ev(() => window.__bund.world.makerspace.arrive('yangpu')), 'to Yangpu');
await mode('play'); await p.waitForTimeout(2500);
await ev(() => window.__bund.player.teleport(316, -2610.2, 0, -0.3)); await p.waitForTimeout(1500);
await p.keyboard.press('KeyE'); await mode('build'); await p.waitForTimeout(500);
await ev(() => document.querySelector('#build [data-b="work"]').click()); await mode('work'); await p.waitForTimeout(500);
ok(/bench|工作台/.test(await ev(() => document.querySelector('#workbook .wh').textContent)), 'the bench\'s panel opens the notebook');
await p.keyboard.press('Digit2'); await p.waitForTimeout(300);
for (const id of ['lighten', 'cell']) { await ev((id) => document.querySelector(`#workbook [data-pick="${id}"]`).click(), id); await p.waitForTimeout(200); }
ok(!(await ev(() => { const b = document.querySelector('#workbook [data-pick="usbc"]'); b.click(); return document.querySelector('#workbook [data-pick="usbc"]').classList.contains('on'); })), 'two changes at a sitting, no more');
await shot('bench');
const w0 = await ev(() => window.__bund.life.wallet.wechat);
await ev(() => document.querySelector('#workbook [data-act="make"]').click()); await p.waitForTimeout(400);
ok(await ev(() => window.__bund.workbook.soldering), 'a new cell: three joints to solder');
for (let i = 0; i < 3; i++) { await p.waitForFunction(() => { const m = document.querySelector('#workbook .solder .mk'); return m && Math.abs(parseFloat(m.style.left) - 50) < 9; }, null, { timeout: 30000, polling: 16 }); await p.keyboard.press('Space'); await p.waitForTimeout(250); }
await p.waitForFunction(() => window.__bund.life.flags.maker.gadgets.gimbal.version === 3 && window.__bund.mode === 'work', null, { timeout: 60000 }); await p.waitForTimeout(1500);
const sp = await ev(() => ({ w: window.__bund.life.wallet.wechat, min: window.__bund.life.clock.minute, txt: document.querySelector('#workbook .specs').innerText }));
ok(w0 - sp.w === 79 && sp.min === 13 * 60 + 30 && /350 g/.test(sp.txt) && /205/.test(sp.txt), `version 3: ¥${w0 - sp.w}, three and a half hours, ${sp.txt.replace(/\n/g, ' ')}`);
await p.keyboard.press('Escape'); await mode('play');
await ev(() => { const b = window.__bund; b.world.makerspace.interact('kDoor'); }); await p.waitForTimeout(4000); await mode('play');

// ---- 5. the next evening: he notices ----
await setClock(3, 17, 40); barks.length = 0;
await ev(() => window.__bund.player.teleport(19.6, 23.5, -Math.PI / 2, 0, 3));
await p.waitForFunction(() => !!window.__bund.world.fieldTest.actors.chen, null, { timeout: 60000 }); await p.waitForTimeout(2500);
await p.keyboard.press('KeyE');
await p.waitForFunction(() => window.__bund.life.flags.studio.people.chen.tries === 2, null, { timeout: 60000 }); await idle();
S = await studio();
ok(S.people.chen.kept === 1 && barks.some((t) => /Lighter|轻了/.test(t)), `you came back when you said, and he notices: "${barks.find((t) => /Lighter|轻了/.test(t)) || ''}"`);
ok(S.tests[S.tests.length - 1].issue === 'grip', 'and finds the next thing (the grip)');

await p.keyboard.press('KeyJ'); await mode('journal'); await ev(() => document.querySelector('#journal [data-tab="work"]').click()); await p.waitForTimeout(400);
ok(/(version 3|第 3 版)/.test(await ev(() => document.querySelector('#journal .wb-sum').innerText)), 'J: the journal\'s Work tab shows where it stands');
await shot('journal'); await p.keyboard.press('KeyJ'); await mode('play');

// ---- 6. day 6: the dinner ----
await ev(() => {
  const L = window.__bund.life, D = (d, h, m = 0) => d * 1440 + h * 60 + m, st = L.flags.studio;
  L.flags.calls = [{ from: 'dad', script: 'dad-arrival' }, { from: 'dad', script: 'dad-plans' }];
  L.invites.push({ id: 'dad-dinner', from: 'dad', thread: 'dad', status: 'accepted', title: '和爸爸吃饭', place: '和平饭店 · 爵士吧', at: D(6, 20), deadline: D(6, 18) });
  L.relations.dad = { affinity: 54, mood: 'ok', last: 0 };
  // a week's work, in short: more hands, another page
  for (let i = 0; i < 7; i++) st.tests.push({ at: D(4, 18, i), eve: 4, rev: 3, who: 'anon', persona: 'office', v: 0, kind: 'again', issue: 'fold' });
  st.found.fold = { eve: 4, by: 'office', n: 7, noted: true }; st.pages[4] = { at: D(4, 23), rev: 3, hands: 7, heard: ['fold'], liked: 0, fixes: [], line: null, plan: [] };
});
await setClock(6, 19, 45);
await ev(() => { window.__bund.updateStory(); window.__bund.player.teleport(-42.4, -218.4, Math.PI - 0.4, -0.05); }); await p.waitForTimeout(2500);
await p.waitForFunction(() => window.__bund.world.dinner.here, null, { timeout: 60000 });
await ev(() => { const b = window.__bund.player; b.yaw = Math.atan2(-(-40.58 - b.body.x), -(-220.0 - b.body.z)); b.pitch = -0.08; window.__bund.dtMax = 0.5; }); await p.waitForTimeout(1500);
pr = await prompt();
ok(/Sit down with him|坐下/.test(pr), `Dad is at the table: "${pr}"`);
await p.keyboard.press('KeyE'); await mode('seat');
const asking = () => p.waitForFunction(() => window.__bund.world.sceneTalk.asking, null, { timeout: 180000 });
await asking(); await p.keyboard.press('Digit2');                                  // thanks, Dad
await asking(); await p.keyboard.press('Digit1');                                  // I like this work
await asking();
const choice = await ev(() => document.querySelector('#ride-sub .ch').innerText);
ok(/Put the gimbal on the table|把云台放到桌上/.test(choice), `a new question: "${choice.replace(/\n/g, ' ').slice(0, 80)}"`);
const lines = [];
await p.exposeFunction('__line', (t) => { if (t && lines[lines.length - 1] !== t) lines.push(t); });
await ev(() => { const el = document.querySelector('#ride-sub .tx'); new MutationObserver(() => window.__line(el.textContent)).observe(el, { childList: true, characterData: true, subtree: true }); });
await p.keyboard.press('Digit1'); await p.waitForTimeout(1500);
ok(await ev(() => window.__bund.life.flags.showedWork && window.__bund.scene.getObjectsByProperty('name', 'night-gimbal').some((g) => g.visible && Math.abs(g.position.x + 41.42) < 0.01)), 'it is on the table between you');
await p.waitForTimeout(6000); await shot('dinner');
await asking();
ok(lines.some((t) => /One at a time|一个一个借/.test(t)) && lines.some((t) => /6061/.test(t)) && lines.some((t) => /underlined|画了线/.test(t)), `he reads the thing, the notebook and the sums (${lines.length} lines)`);
console.log(lines.map((l) => `      ${l}`).join('\n'));
await p.keyboard.press('Digit1'); await p.waitForTimeout(1500);                     // I'm staying
await p.waitForFunction(() => !window.__bund.world.sceneTalk.active, null, { timeout: 120000 });
const fin = await ev(() => ({ c: window.__bund.life.flags.dinnerChoice, arm: !!window.__bund.life.flags.dadMachines, dad: window.__bund.life.relations.dad.affinity }));
ok(fin.c === 'stay' && fin.arm && lines.some((t) => /drawing for that arm|臂的图纸/.test(t)), `"I'm staying": he asks for the arm's drawing (he feels ${fin.dad})`);
// the river at ten, and the ending's afterword
await p.keyboard.press('KeyE'); await mode('play');
await ev(() => { window.__bund.updateStory(); window.__bund.player.teleport(18, -200, -Math.PI / 2, 0.05, 3); const L = window.__bund.life; L.clock.minute = 21 * 60 + 56; window.__bund.updateStory(); L.clock.minute = 22 * 60 + 1; });
await p.waitForTimeout(1500); await ev(() => window.__bund.updateStory());
await p.waitForFunction(() => document.getElementById('ending-card').classList.contains('on'), null, { timeout: 60000 }); await p.waitForTimeout(1500);
const card = await ev(() => ({ h: document.querySelector('#ending-card h1').textContent, after: document.querySelector('#ending-card .after')?.textContent || '' }));
ok(/Staying|留下/.test(card.h) && /(aluminium arms|铝支臂)/.test(card.after), `the ending "${card.h}" adds: "${card.after.slice(0, 90)}..."`);
await shot('ending');
ok(errors.length === 0, `no console errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nall passed'); process.exit(failed ? 1 : 0);
