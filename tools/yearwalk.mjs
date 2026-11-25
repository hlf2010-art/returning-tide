// Walkthrough: the year. In the game itself:
//   the date on screen; Tuesday 10 November, the first day at Marlowe Finch (IFC 28F): the scene,
//   the desk, the lift home; a flat rented on WeChat, and the night in it that carries him to
//   January (the fade says how long, the salary arrives, the rent goes); the watch-repairer's
//   daughter at the stall; Tuesday 20 April, the crisis and what he does about it; the start-up's
//   founding day on 32F; Saturday 13 November 2027, the dinner, and an ending with its afterword.
//   Then, in a second game: a day at the family works played as a scene card.
// The days it does not walk through are played with the game's own rules (world.year.rules: the
// same functions the scenes use); the whole year is tested in node (tests/career.test.mjs).
//   URL=http://localhost:4183/ OUT=<dir> UILANG=en|zh node tools/yearwalk.mjs
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const url = process.env.URL || 'http://localhost:4183/', out = `${process.env.OUT || '.'}/`, lang = process.env.UILANG || 'en', zh = lang === 'zh';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
async function open() {
  const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('console', (m) => { if (m.type() === 'error' && !/ERR_CONNECTION_REFUSED|8790|11434/.test(m.text())) errors.push(m.text().slice(0, 200)); });
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(`${url}?q=4&nolock&fresh&lang=${lang}&tod`, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 300000 });
  // everything the HUD puts up (toasts, the chapter title, act banners) is queued behind the titles, so a check reads
  // what has been shown since the clock moved, not what happens to be up at that instant
  await p.evaluate(() => { window.__seen = []; const grab = () => { for (const id of ['toast', 'chapter-card', 'achv']) { const e = document.getElementById(id); const t = e && e.innerText.replace(/\n+/g, ' · ').trim(); if (t && window.__seen[window.__seen.length - 1] !== t) window.__seen.push(t); } };
    new MutationObserver(grab).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class'] }); });
  await p.evaluate(() => { window.__bund.start(); window.__bund.dtMax = 0.25; const s = document.createElement('style'); s.textContent = '#minimap,#dev,#tip{display:none!important}'; document.head.appendChild(s); });
  await p.waitForTimeout(2000);
  return p;
}
let p = await open();
const ev = (f, a) => p.evaluate(f, a);
const shot = (name) => p.screenshot({ path: `${out}year-${name}${zh ? '-zh' : ''}.png`, timeout: 120000 });
const mode = (m, t = 120000) => p.waitForFunction((m) => window.__bund.mode === m, m, { timeout: t });
const veilClear = () => p.waitForFunction(() => !document.getElementById('veil').classList.contains('on') && window.__bund.mode === 'play', null, { timeout: 120000 });
const toast = () => ev(() => document.getElementById('toast').textContent);
// has the HUD shown something matching re (since the last mark)? waits for the title queue
const mark = () => ev(() => { window.__mark = window.__seen.length; });
const shown = (re, timeout = 45000) => p.waitForFunction(([src, fl]) => window.__seen.slice(window.__mark || 0).find((t) => new RegExp(src, fl).test(t)), [re.source, re.flags], { timeout }).then((h) => h.jsonValue()).catch(() => ev(() => `(not seen; last: ${window.__seen.slice(-3).join(' | ')})`));
const prompt = () => ev(() => (document.getElementById('prompt').classList.contains('on') ? document.getElementById('prompt').innerText.replace(/\n/g, ' ') : ''));
const Y = () => ev(() => JSON.parse(JSON.stringify(window.__bund.life.flags.year)));
// the clock: set it, and let the game notice the new day (salary, rent, absences, messages)
const setClock = async (day, h, m = 0) => { await ev(([day, h, m]) => { const L = window.__bund.life; L.clock.day = day; window.__bund.setHour(h, m); }, [day, h, m]); await p.waitForFunction((day) => window.__bund.life.flags.year.work.through === day, day, { timeout: 60000 }); await p.waitForTimeout(700); await planSeason(); };
// a night across weeks opens the season plan (ui/season.js): take its default plan, as yearsmoke.mjs does
async function planSeason() { for (let k = 0; k < 3; k++) { if (await ev(() => window.__bund.mode) !== 'season') return; await ev(() => { const g = document.querySelector('#season [data-go]'); if (g) g.click(); }); for (let j = 0; j < 6; j++) { await p.waitForTimeout(400); const r = await ev(() => { const d = document.querySelector('#season [data-ch]'); if (d) { d.click(); return 1; } const c = document.querySelector('#season [data-close]'); if (c) { c.click(); return 2; } return 0; }); if (r !== 1) break; } await p.waitForTimeout(600); } }
// look at a point from where you stand (the prompt needs it in view)
const lookAt = (x, y, z) => ev(([x, y, z]) => { const b = window.__bund.player, c = window.__bund.camera.position; b.yaw = Math.atan2(-(x - b.body.x), -(z - b.body.z)); b.pitch = Math.atan2(y - c.y, Math.hypot(x - b.body.x, z - b.body.z)); }, [x, y, z]);
// answer the scene as it asks: pick(choices) -> 1..4
async function talk(pick, until, timeout = 600000) {
  const t0 = Date.now(); let n = 0;
  for (;;) {
    if (await ev(until)) return n;
    if (Date.now() - t0 > timeout) throw new Error('the scene did not finish');
    const ch = await ev(() => { const c = document.querySelector('#ride-sub .ch'); return c && !c.classList.contains('hidden') && window.__bund.world.sceneTalk.asking ? [...c.querySelectorAll('span')].map((s) => s.textContent) : null; });
    if (ch) { const k = pick(ch, n++); await p.keyboard.press(`Digit${k}`); await p.waitForTimeout(500); } else await p.waitForTimeout(350);
  }
}
// a working day played with the rules, not walked through
const quick = (day, picks) => ev(([day, picks]) => { const B = window.__bund, L = B.life, R = B.world.year.rules; L.clock.day = day; B.setHour(9, 0); R.rollover(L); R.runCareer(L); const t = R.arriveAtWork(L); if (!t) return null; R.playScene(L, t.def, picks || []); L.clock.minute = 18 * 60 + 30; R.workFull(L); return t.def.id; }, [day, picks]);

// ---- 1. the date ----
const chip = await shown(zh ? /第一幕.*11 月 9 日/ : /Act I.*New Beginnings.*9 Nov/i);
ok(zh ? /第一幕.*11 月 9 日/.test(chip) : /Act I.*New Beginnings.*9 Nov/i.test(chip), `the chapter title gives the act and the date: "${chip}"`);
await ev(() => window.__bund.updateStory());
await ev(() => window.__bund.world.year.handoff('opened'));                 // (Mission One, played to its end with the seal broken: tests/mission.test.mjs, tools/playtest.mjs)

// ---- 2. Tuesday 10 November: the first day at the firm ----
await mark(); await setClock(2, 9, 5);
const d2 = await shown(/Tue 10 Nov|11 月 10 日|Work today|今天上班/); ok(/Tue 10 Nov|11 月 10 日|Work today|今天上班/.test(d2), `a new day is announced: "${d2}"`);
await ev(() => window.__bund.world.dest.arrive('lujiazui', { method: 'metro', up: true }));   // (what the metro's gate does: world/metro.js)
await p.waitForFunction(() => window.__bund.world.year.here === 'firm', null, { timeout: 120000 }); await veilClear();
const at = await ev(() => ({ y: window.__bund.player.body.y, x: window.__bund.player.body.x }));
ok(Math.abs(at.y - 120) < 0.5 && at.x > 668 && at.x < 690, `out of the lift on IFC 28F (y ${at.y.toFixed(1)})`);
await p.waitForFunction(() => window.__bund.world.sceneTalk.active, null, { timeout: 120000 }); await p.waitForTimeout(1500);
await shot('firm-arrive');
const first = await ev(() => document.querySelector('#ride-sub .sp').textContent + ': ' + document.querySelector('#ride-sub .tx').textContent);
ok(zh ? /许知微/.test(first) : /Xu Zhiwei/i.test(first), `the first day's scene begins: "${first.slice(0, 90)}"`);
await ev(() => { window.__bund.dtMax = 0.6; });
let seenAsk = false;
const asks2 = await talk((ch) => { if (!seenAsk) { seenAsk = ch; } return 1; }, () => window.__bund.world.year.running === null && !!(window.__bund.life.flags.year.work.days[2] || {}).scene);
await shot('firm-floor');
let y = await Y();
ok(asks2 === 2 && y.work.days[2].scene === 'd2' && y.career.standing === 55 && y.work.story.evalChecked && Array.isArray(seenAsk) && seenAsk.length === 4, `two questions answered (the first with ${seenAsk.length} answers): standing ${y.career.standing}, he took on the evaluation sheet`);
ok(await ev(() => window.__bund.life.flags.hearts.zhiwei.stage === 'known' && window.__bund.life.flags.hearts.zhiwei.trust === 25), 'Xu Zhiwei is met; her trust moved through hearts.feel only');
ok((await ev(() => window.__bund.talkables().filter((q) => q.key.startsWith('firm:')).map((q) => q.persona))).includes('taoke'), 'with the meeting over, colleagues can be talked to freely');
// the desk
await ev(() => { const O = window.__bund.world.year.OFFICE; window.__bund.player.teleport(O.desk.x, O.desk.z + 1.5, 0, -0.3, O.y); }); await p.waitForTimeout(600);
await lookAt(682.2, 120.95, 46.95); await p.waitForTimeout(900);
const pd = await prompt(); ok(zh ? /工位/.test(pd) : /Your desk/.test(pd) && /18:30/.test(pd), `at his desk: "${pd}"`);
await shot('firm-desk');
await p.keyboard.press('KeyE'); await p.waitForFunction(() => window.__bund.life.clock.minute >= 18 * 60 + 30, null, { timeout: 60000 }); await veilClear();
y = await Y(); ok(y.work.days[2].full && y.career.standing === 56, 'E works him through to 18:30');
await ev(() => window.__bund.world.year.interact('yLift')); await p.waitForFunction(() => window.__bund.world.year.here === null, null, { timeout: 60000 }); await veilClear();
ok(await ev(() => window.__bund.player.body.y < 5 && window.__bund.life.wallet.ledger.some((e) => e.memoEn === 'Line 2, Lujiazui to East Nanjing Road')), 'the lift down, Line 2, the Bund again');

// ---- 3. a flat, and the night that crosses to January ----
await quick(3, [0, 0]); await quick(4, [0]); await quick(5, [0, 0]);
await ev(() => { const L = window.__bund.life; L.clock.day = 5; window.__bund.setHour(19, 0); });
await p.waitForFunction(() => !!window.__bund.life.threads.agent, null, { timeout: 60000 });
const offered = await ev(() => { const t = window.__bund.life.threads.agent, m = t.messages.find((x) => x.replies); return { n: m.replies.length, first: m.text.slice(0, 30) }; });
ok(offered.n === 4, `the letting agent has written with three flats (${offered.first}...)`);
await ev(() => { const L = window.__bund.life, t = L.threads.agent, m = t.messages.find((x) => x.replies); m.replied = 1; L.flags.rentNorthbund = true; });   // (the reply chip on the phone sets this flag: world/agenda.js reply())
await p.waitForFunction(() => window.__bund.life.flags.year.home.kind === 'flat', null, { timeout: 60000 });
y = await Y(); ok(y.home.id === 'northbund' && y.home.rent === 12800 && (await ev(() => window.__bund.life.wallet.ledger.some((e) => e.kind === 'rent' && e.amount === -32000))), 'the North Bund flat is his: deposit, first month and fee paid from the bank');
await setClock(6, 21, 40);
const bank6 = await ev(() => window.__bund.life.wallet.bank);
await ev(() => window.__bund.world.dest.arrive('home', { method: 'wechat' }));       // (what a DiDi to "My flat" does)
await p.waitForFunction(() => window.__bund.world.year.here === 'flat', null, { timeout: 120000 }); await veilClear(); await p.waitForTimeout(800);
await ev(() => { const F = window.__bund.world.year.FLATS; window.__bund.player.teleport(40.6, -703.4, 1.0, -0.1, F.y.northbund); }); await p.waitForTimeout(1200);
await shot('flat');
await ev(() => { const F = window.__bund.world.year.FLATS; window.__bund.player.teleport(39.2, -704.3, 1.0, -0.1, F.y.northbund); }); await p.waitForTimeout(600);
await lookAt(37.6, 70.6, -704.6); await p.waitForTimeout(900);
const pb = await prompt(); ok(zh ? /睡到早上/.test(pb) : /Sleep till morning/.test(pb), `in the flat: "${pb}"`);
await mark(); await p.keyboard.press('KeyE');
await p.waitForFunction(() => document.getElementById('veil').classList.contains('on') && /2027/.test(document.getElementById('veil').dataset.line), null, { timeout: 60000 });
const line = await ev(() => document.getElementById('veil').dataset.line); await p.waitForTimeout(700); await shot('gap');
ok(zh ? /2 个月后 · 2027 年 1 月 11 日 周一/.test(line) : /2 months later · Mon 11 Jan 2027/.test(line), `the fade says how long has passed: "${line}"`);
await veilClear(); await p.waitForFunction(() => window.__bund.life.flags.year.work.through === 7, null, { timeout: 60000 }); await p.waitForTimeout(600);
const jan = { bank: await ev(() => window.__bund.life.wallet.bank), toast: await shown(/84,000/), chip: await shown(zh ? /第二幕/ : /Act II/i) };
ok(jan.bank === bank6 + 2 * 42000 - 2 * 12800 && /84,000/.test(jan.toast) && /25,600/.test(jan.toast), `two months' salary in, two months' rent out: "${jan.toast}"`);
ok((zh ? /第二幕/ : /Act II/i).test(jan.chip) && (zh ? /1 月 11 日/ : /11 Jan/i).test(jan.chip), `Act II is announced with its date: "${jan.chip}"`);
await shot('january');
await ev(() => window.__bund.world.year.interact('yDoor')); await p.waitForFunction(() => window.__bund.world.year.here === null, null, { timeout: 60000 }); await veilClear();
// the journal: the date, the acts, the year's page
await p.keyboard.press('KeyJ'); await mode('journal'); await p.waitForTimeout(500);
const jr = await ev(() => ({ clock: document.querySelector('#journal .clock').textContent, names: [...document.querySelectorAll('#journal .q .name')].map((e) => e.textContent), kinds: [...document.querySelectorAll('#journal .q .kind')].map((e) => e.textContent) }));
ok(/2027/.test(jr.clock) && jr.names.includes(zh ? '东澜' : 'Donglan') && jr.names.includes(zh ? '修表匠' : 'The missing watch-repairer') && jr.kinds.some((k) => (zh ? /旁支故事/ : /Side story/).test(k)), `the journal: "${jr.clock}" · ${jr.names.join(' · ')}`);
await ev(() => document.querySelector('#journal [data-tab="year"]').click()); await p.waitForTimeout(400);
const yr = await ev(() => document.querySelector('#journal .yr').innerText);
ok(/12,800/.test(yr) && /42,000/.test(yr) && (zh ? /迈芬咨询/ : /Marlowe Finch/).test(yr), 'its page for the year: the job, the pay, the rent');
await shot('journal-year');
await p.keyboard.press('KeyJ'); await mode('play');

// ---- 4. the watch-repairer's daughter at the stall ----
await quick(7, [0, 0]);
await setClock(8, 12, 0);
await ev(() => window.__bund.player.teleport(-53.9, -4.4, 0, 0)); await p.waitForTimeout(2500);
await lookAt(-55.7, 1.65, -4.55); await p.waitForTimeout(1200);
const pz = await prompt(); ok(zh ? /修表摊/.test(pz) : /at the stall/.test(pz), `Hankou Road, January: "${pz}"`);
await shot('stall');
await p.keyboard.press('KeyE');
await talk(() => 1, () => !window.__bund.world.sceneTalk.active && !!window.__bund.life.flags.year.work.watch.met);
y = await Y(); ok(y.work.watch.told === 'date' && y.facts.some((f) => f.type === 'watch'), 'he tells her the date he read on the page (because the seal was broken)');

// ---- 5. to April: the crisis, and what he does about it ----
await quick(8, [0]); await quick(9, [0, 0]); await quick(10, [0, 0]); await quick(11, [0]);
await setClock(12, 9, 0);
await ev(() => window.__bund.world.dest.arrive('lujiazui', { method: 'metro', up: true }));
await p.waitForFunction(() => window.__bund.world.year.here === 'firm', null, { timeout: 120000 }); await veilClear();
let crisis = null;
await talk((ch) => { crisis = ch; return 2; }, () => !!window.__bund.life.flags.year.work.applied);
ok(crisis && crisis.length === 4 && (zh ? /辞职/.test(crisis[1]) : /resign/i.test(crisis[1])), `Tuesday 20 April, four ways out: ${crisis.map((c) => c.slice(0, 34)).join(' | ')}`);
await p.waitForTimeout(1200); await shot('crisis');
y = await Y(); ok(y.career.track === 'resigned' && y.career.salary === 0 && y.work.story.taoke === 'laidoff', `he resigns (track: ${y.career.track})`);
await p.waitForFunction(() => window.__bund.world.year.running === null, null, { timeout: 300000 });
await ev(() => window.__bund.world.year.interact('yLift')); await p.waitForFunction(() => window.__bund.world.year.here === null, null, { timeout: 60000 }); await veilClear();
// Mingxuan writes that evening; he says yes
await ev(() => { const L = window.__bund.life; L.clock.day = 12; window.__bund.setHour(20, 5); });
await p.waitForFunction(() => window.__bund.life.threads.xuan.messages.some((m) => m.replies && m.replies.some((r) => r.flag === 'goStartup')), null, { timeout: 60000 });
await ev(() => { window.__bund.life.flags.goStartup = true; });
await p.waitForFunction(() => window.__bund.life.flags.year.career.track === 'startup', null, { timeout: 60000 });
ok(true, 'Mingxuan offers the two desks on 32F; he says yes (never forced: tests/career.test.mjs plays the year without it)');

// ---- 6. June: the founding day, upstairs ----
await mark(); await setClock(13, 9, 0);
const june = await shown(/7 Jun 2027|6 月 7 日/i); ok(/7 Jun 2027|6 月 7 日/i.test(june), `June: "${june}"`);
await ev(() => window.__bund.world.dest.arrive('lujiazui', { method: 'metro', up: true }));
await p.waitForFunction(() => window.__bund.world.dest.here === 'lujiazui', null, { timeout: 120000 }); await veilClear();
await p.waitForFunction(() => window.__bund.world.year.running === 's1' && window.__bund.world.sceneTalk.active, null, { timeout: 120000 }); await p.waitForTimeout(1500);
await shot('startup-32f');
await talk((ch, n) => (n === 0 ? 3 : 1), () => window.__bund.world.year.running === null && !!(window.__bund.life.flags.year.work.days[13] || {}).scene);
y = await Y(); ok(y.career.startup.name === 'One Reed' && y.career.startup.product === 'qc' && y.career.startup.funded === 300000, `the company is founded on IFC 32F beside the robot-arm team: ${y.career.startup.name}, ¥${y.career.startup.cash.toLocaleString()} paid in`);
await ev(() => window.__bund.world.year.interact('yDesk32')); await p.waitForFunction(() => window.__bund.world.dest.here === null, null, { timeout: 60000 }); await veilClear();
ok(await ev(() => window.__bund.life.clock.minute >= 18 * 60 + 30 && window.__bund.player.body.y < 5), 'a day at the borrowed desk, then a car back to the Bund');
await quick(14, [1, 0]); await quick(15, [2]); await quick(16, [0]);
y = await Y(); ok(y.career.startup.customer === 'works' && y.career.startup.contract === 200000, 'by October the family works is its first paying customer');

// ---- 7. Saturday 13 November 2027: the dinner ----
await ev(() => { const L = window.__bund.life; L.flags.calls = [{ from: 'dad', script: 'dad-arrival' }, { from: 'dad', script: 'dad-plans' }]; L.relations.dad = { affinity: 62, mood: 'ok', last: 0 }; L.clock.day = 16; window.__bund.setHour(19, 30); });
await p.waitForFunction(() => window.__bund.life.invites.some((i) => i.id === 'dad-dinner'), null, { timeout: 60000 });
await ev(() => { const i = window.__bund.life.invites.find((x) => x.id === 'dad-dinner'); i.status = 'accepted'; });
await mark(); await setClock(17, 19, 50);
const nov = await ev(() => ({ q: Object.fromEntries(Object.entries(window.__bund.life.quests.list).map(([k, v]) => [k, v.status])) }));
nov.chip = await shown(zh ? /第五幕/ : /Act V/i);
ok((zh ? /第五幕/ : /Act V/i).test(nov.chip) && nov.q.dinner === 'active' && nov.q['act4-road'] === 'done', `the last day: "${nov.chip}"`);
await ev(() => window.__bund.player.teleport(-42.4, -218.4, Math.PI - 0.4, -0.05)); await p.waitForTimeout(2500);
await ev(() => { const b = window.__bund.player; b.yaw = Math.atan2(-(-40.58 - b.body.x), -(-220.0 - b.body.z)); b.pitch = -0.08; }); await p.waitForTimeout(1500);
ok((zh ? /坐下/ : /Sit down with him/).test(await prompt()), 'Dad is at the table in the Jazz Bar');
await p.keyboard.press('KeyE'); await mode('seat');
let sawYear = false, last = null;
const reads = [];
const watch = setInterval(async () => { try { const t = await ev(() => document.querySelector('#ride-sub .tx').textContent); if (t && reads[reads.length - 1] !== t) reads.push(t); } catch { /* closing */ } }, 700);
await talk((ch) => { last = ch; if (ch.some((c) => (zh ? /标杆客户/ : /reference customer/).test(c))) { sawYear = true; return 3; } return 1; }, () => !!window.__bund.life.flags.dinnerChoice);
clearInterval(watch);
await shot('dinner');
const knows = reads.some((t) => (zh ? /一苇科技/ : /One Reed/).test(t)), flatSaid = reads.some((t) => (zh ? /租的房子/ : /flat you rent/).test(t));
ok(sawYear && knows && flatSaid, `the dinner knows the year: his company by name, the flat he rents, and "together" offered through the start-up ("${last[2].slice(0, 60)}...")`);
ok(await ev(() => window.__bund.life.flags.dinnerChoice === 'together' && !window.__bund.life.flags.demoDone), 'he is convinced, with no robot-arm demo behind it');
await p.waitForFunction(() => !window.__bund.world.sceneTalk.active, null, { timeout: 120000 });
await p.keyboard.press('KeyE'); await mode('play');
await ev(() => { window.__bund.updateStory(); window.__bund.player.teleport(18, -200, -Math.PI / 2, 0.05, 3); window.__bund.setHour(21, 56); window.__bund.updateStory(); });
await p.waitForTimeout(800); await ev(() => { window.__bund.setHour(22, 1); }); await p.waitForTimeout(1200); await ev(() => window.__bund.updateStory());
await p.waitForFunction(() => document.getElementById('ending-card').classList.contains('on'), null, { timeout: 60000 });
const end = await ev(() => ({ h: document.querySelector('#ending-card h1').textContent, text: document.querySelector('#ending-card p').textContent, after: document.querySelector('#ending-card .after') ? document.querySelector('#ending-card .after').textContent : '' }));
ok((zh ? end.h === '两岸' : end.h === 'Both banks') && (zh ? /一苇科技/ : /One Reed/).test(end.after) && !(zh ? /机械臂/ : /fifty arms/).test(end.text), `the ending "${end.h}", told for the year, with its afterword: "${end.after.slice(0, 110)}..."`);
await shot('ending');
await ev(() => document.querySelector('#ending-card button').click()); await mode('play');
const saved = JSON.parse(await ev(() => { window.__bund.updateStory(); return JSON.stringify(window.__bund.life); }));
ok(saved.v === 1 && saved.flags.year.work.road.n === 4 && saved.flags.handoff.outcome === 'opened', 'it all saves in the same v1 format, under flags.year');
await p.close();

// ---- 8. another road: a day at the works in Nanjing, played over a card ----
p = await open();
await ev(() => { window.__bund.dtMax = 0.6; });
for (let d = 2; d <= 11; d++) if (![6].includes(d)) await quick(d, []);
await quick(12, [2]);
await ev(() => { const L = window.__bund.life; L.clock.day = 12; window.__bund.setHour(21, 40); });
await p.waitForFunction(() => window.__bund.life.threads.dad.messages.some((m) => m.replies && m.replies.some((r) => r.flag === 'goFamily')), null, { timeout: 60000 });
await ev(() => { window.__bund.life.flags.goFamily = true; });
await p.waitForFunction(() => window.__bund.life.flags.year.career.track === 'family', null, { timeout: 60000 });
await setClock(13, 8, 30);
await ev(() => window.__bund.world.dest.arrive('hongqiao', { method: 'wechat' }));   // (what a DiDi to Hongqiao Station does)
await p.waitForFunction(() => document.getElementById('year-card').classList.contains('on') && window.__bund.world.sceneTalk.active, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await shot('card-works');
const cardText = await ev(() => document.querySelector('#year-card h1').textContent);
ok((zh ? /南京 · 江宁/ : /Nanjing · Jiangning/).test(cardText), `a day that isn't built is played over a card: "${cardText}"`);
await talk(() => 1, () => !!document.querySelector('#year-card .acts button'));
await p.keyboard.press('KeyE');
await p.waitForFunction(() => !document.getElementById('year-card').classList.contains('on') && window.__bund.mode === 'play' && !document.getElementById('veil').classList.contains('on'), null, { timeout: 120000 });
y = await Y(); ok(y.work.road.n === 1 && y.work.story.fFloor && (await ev(() => window.__bund.life.clock.minute >= 20 * 60 && window.__bund.player.enabled)), 'the night shift chosen; the train back; the Bund in the evening');
ok(errors.length === 0, `no console errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nall passed'); process.exit(failed ? 1 : 0);
