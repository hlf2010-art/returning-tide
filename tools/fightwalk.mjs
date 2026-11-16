// Walkthrough: the row outside the Peace Hotel (src/world/confrontation.js), in the game itself:
//   talk him down · shout for the hotel's security · 110 and the officers · fight and win (slip, counter)
//   · fight and lose (A&E, the statement, the fine or not) · the morning after (messages, the mirror, the doorman)
// The rules themselves are tested in node (tests/fight.test.mjs). The fight is driven by what he is
// doing, read off the game's own state each frame, not by fixed delays (software GL is slow).
//   URL=http://localhost:4184/ OUT=<dir> UILANG=en|zh ONLY=talk,security,police,win,lose node tools/fightwalk.mjs
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const url = process.env.URL || 'http://localhost:4184/', out = `${process.env.OUT || '.'}/`, lang = process.env.UILANG || 'en', zh = lang === 'zh';
const only = (process.env.ONLY || 'talk,security,police,win,lose').split(',');
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
p.on('console', (m) => { if (m.type() === 'error' && !/ERR_CONNECTION_REFUSED|8790|11434/.test(m.text())) errors.push(m.text().slice(0, 200)); });
p.on('pageerror', (e) => errors.push(e.message));
await p.goto(`${url}?q=4&nolock&fresh&lang=${lang}&hour=22:20`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 300000 });
const ev = (f, a) => p.evaluate(f, a);
await ev(() => { window.__bund.start(); window.__bund.dtMax = 0.25; const s = document.createElement('style'); s.textContent = '#minimap,#dev,#tip{display:none!important}'; document.head.appendChild(s); });
await p.waitForTimeout(1500);
const T = 600000;
const shot = (name) => p.screenshot({ path: `${out}fight-${name}${zh ? '-zh' : ''}.png`, timeout: 120000 });
const mode = (m) => p.waitForFunction((m) => window.__bund.mode === m, m, { timeout: T });
const life = () => ev(() => { const L = window.__bund.life; return JSON.parse(JSON.stringify({ fight: L.flags.fight || null, year: L.flags.year, clock: L.clock, wallet: { wechat: L.wallet.wechat, bank: L.wallet.bank }, hearts: L.flags.hearts || {}, threads: Object.fromEntries(Object.entries(L.threads).map(([k, t]) => [k, t.messages.slice(-4).map((m) => m.text)])) })); });
const subs = [];
await p.exposeFunction('__sub', (t) => { if (t && subs[subs.length - 1] !== t) subs.push(t); });
await ev(() => { for (const sel of ['#ride-sub .tx', '#bark-text', '#thought']) { const el = document.querySelector(sel); if (el) new MutationObserver(() => window.__sub(el.textContent)).observe(el, { childList: true, characterData: true, subtree: true }); } });
const NODES = { open: ['calm', 'shield', 'help', 'leave'], calm: ['face', 'cameras', 'threat', 'police'], shoved: ['open', 'shove', 'security', 'police'], threat: ['strike', 'guard', 'backdown'], help: ['security', 'police'] };
const C = 'window.__bund.world.confront';
// stand on Nanjing Road by the hotel at 22:20 on the given day, start the row, walk up to him, E
async function begin(day, companion = null) {
  await ev(([day, companion]) => { const b = window.__bund, L = b.life; L.clock.day = day; b.setHour(22, 20); b.dtMax = 0.25; b.player.teleport(-57.5, -206.3, Math.PI / 2, 0); b.world.confront.setCompanion(companion); }, [day, companion]);
  await mode('play'); await p.waitForTimeout(600);
  const started = await ev(() => window.__bund.world.confront.debug.start({ near: false }));
  await p.waitForFunction(() => window.__bund.world.confront.active === 'notice', null, { timeout: T });
  await ev(() => { const d = window.__bund.world.confront.debug.actors.drunk, pl = window.__bund.player, x = d.x + 2.2, z = d.z + 0.9; pl.teleport(x, z, Math.atan2(-(d.x - x), -(d.z - z)), -0.03); });
  await p.waitForFunction(() => window.__bund.target && window.__bund.target.id === 'confront:step', null, { timeout: T });
  return started;
}
async function answer(move) {
  await p.waitForFunction(() => window.__bund.world.confront.debug.asking, null, { timeout: T });
  const node = await ev(() => window.__bund.world.confront.debug.dispute.node);
  const i = NODES[node].indexOf(move); if (i < 0) throw new Error(`${move} is not on offer at ${node}`);
  await p.waitForTimeout(250); await p.keyboard.press(`Digit${i + 1}`);
  await p.waitForFunction(() => !window.__bund.world.confront.debug.asking, null, { timeout: T });
}
// wait for it to be over and applied; if the officers ask something on the way, give the first answer
async function ended() {
  for (;;) {
    const st = await p.waitForFunction(() => { const c = window.__bund.world.confront; if (window.__bund.mode === 'play' && c.last && (!c.active || c.active === 'end') && window.__bund.life.flags.fight.applied) return 'done'; return c.debug.asking && !c.debug.dispute.end ? null : c.debug.asking ? 'ask' : null; }, null, { timeout: T });
    if ((await st.jsonValue()) === 'done') return;
    await p.waitForTimeout(300); await p.keyboard.press('Digit1'); await p.waitForTimeout(600);
  }
}
// the fight, by what he's doing: `policy` runs in the page every frame and returns the keys to hold / tap
async function fight(policy) {
  await p.waitForFunction(() => window.__bund.world.confront.active === 'blows', null, { timeout: T });
  await ev((policy) => {
    const b = window.__bund; b.dtMax = 0.05;
    const key = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true }));
    const held = new Set(); let tap = null;
    const tick = () => {
      const c = b.world.confront, F = c.debug.fight;
      if (c.active !== 'blows' || !F || F.over) { for (const k of held) key('keyup', k); return; }
      if (tap) { key('keyup', tap); tap = null; }
      const H = F.him, Y = F.you, d = Math.hypot(H.x - Y.x, H.z - Y.z), late = H.act === 'windup' && H.dur - H.at < 0.22 && Y.act === 'ready';
      const want = new Set(); let press = null;
      if (policy === 'counter') { if (late) press = 'KeyD'; else if ((H.act === 'recover' || H.act === 'stagger') && Y.act === 'ready' && d < 1.12) press = 'KeyR'; if (d > 1.05 && H.act !== 'windup' && H.act !== 'strike') want.add('KeyW'); }
      else if (policy === 'guard') want.add('Space');
      for (const k of want) if (!held.has(k)) { key('keydown', k); held.add(k); }
      for (const k of [...held]) if (!want.has(k)) { key('keyup', k); held.delete(k); }
      if (press) { key('keydown', press); tap = press; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, policy);
}
const overBlows = () => p.waitForFunction(() => { const c = window.__bund.world.confront; return c.active !== 'blows'; }, null, { timeout: T });
const atAct = (act, frac) => p.waitForFunction(([act, frac]) => { const F = window.__bund.world.confront.debug.fight; return !F || F.over || (F.him.act === act && F.him.at >= F.him.dur * frac); }, [act, frac], { timeout: T, polling: 30 });

// ---- 1. talk him down ----
if (only.includes('talk')) {
  ok(await begin(3), 'late evening on Nanjing Road East: a man who won\'t let a woman go, under the lamp by the hotel');
  await shot('notice');
  ok(/Step in|上前/.test(await ev(() => document.getElementById('prompt').innerText)), 'E: step in');
  await p.keyboard.press('KeyE'); await mode('fight');
  await p.waitForFunction(() => window.__bund.world.confront.debug.asking, null, { timeout: T }); await shot('ask');
  ok((await ev(() => document.querySelectorAll('#ride-sub .ch span').length)) === 4, 'four things you can do: talk, stand between, fetch someone, walk away');
  await answer('calm'); await answer('face');
  await ended(); await p.waitForTimeout(800); await shot('talked');
  const L = await life(), f = L.year.facts.filter((x) => x.type === 'fight');
  ok(L.fight.result.outcome === 'talked' && !L.fight.result.blows && !L.year.hurt && f.length === 1 && f[0].blows === false, 'talked down: nobody hit, nobody hurt, one fact on the ledger');
  ok(L.year.rep.street === 54 && L.fight.result.police === null, 'the street thinks a little better of you; no police');
  ok(subs.some((t) => /Twenty million|两千万/.test(t)) && subs.some((t) => /Forget it|没意思/.test(t)) && subs.some((t) => /palms are wet|手心全是汗/.test(t)), 'what was said was on screen, and what it left you with');
}
// ---- 2. the hotel's security ----
if (only.includes('security')) {
  await begin(4); await p.keyboard.press('KeyE'); await mode('fight');
  await answer('help'); await answer('security');
  await p.waitForFunction(() => { const g = window.__bund.world.confront.debug.actors.guard; return g && g.arrived; }, null, { timeout: T }); await p.waitForTimeout(600); await shot('security');
  await ended();
  const L = await life();
  ok(L.fight.result.outcome === 'security' && !L.fight.result.blows && L.year.facts.filter((x) => x.type === 'fight').length === (only.includes('talk') ? 2 : 1), 'security came out of the hotel door and walked him to the corner');
  ok(subs.some((t) => /Not out here on the door|别在门口闹/.test(t)), 'the guard had his say');
}
// ---- 3. 110: you call, he leaves, two officers and a form ----
if (only.includes('police')) {
  await begin(5, { id: 'nanxing', as: 'witness', name: { zh: '南星', en: 'Nanxing' } }); await p.keyboard.press('KeyE'); await mode('fight');
  const t0 = (await life()).clock;
  await answer('calm'); await answer('police');
  await p.waitForFunction(() => !!window.__bund.world.confront.debug.actors.cop && window.__bund.mode === 'fight' && window.__bund.world.confront.debug.talking, null, { timeout: T }); await p.waitForTimeout(900); await shot('officers');
  await p.waitForFunction(() => window.__bund.world.confront.debug.asking, null, { timeout: T }); await p.keyboard.press('Digit1');
  await ended();
  const L = await life();
  ok(L.fight.result.outcome === 'police' && L.fight.result.police.verdict === 'statement' && L.fight.result.fine === 0, '110: he left before they came; a statement, no penalty');
  ok((L.clock.day * 1440 + L.clock.minute) - (t0.day * 1440 + t0.minute) >= 20, 'twenty minutes of the evening went on it');
  ok(L.hearts.nanxing && L.hearts.nanxing.trust === 23 && L.fight.result.companion.as === 'witness', 'whoever was with you saw how you handled it (her trust moved)');
}
// ---- 4. fight and win: he shoves, you shove back, he swings; slip it, hit him while he's open ----
if (only.includes('win')) {
  await begin(6); await p.keyboard.press('KeyE'); await mode('fight');
  await answer('shield'); await p.waitForTimeout(500); await shot('shoved');
  await answer('shove');
  await fight('counter');
  await p.waitForFunction(() => window.__bund.world.confront.active === 'blows', null, { timeout: T });
  await atAct('windup', 0.75); await shot('windup');
  await atAct('recover', 0.1); await shot('open');
  await atAct('stagger', 0.2); await shot('stagger');
  await overBlows(); await p.waitForTimeout(500); await shot('won');
  const S = await ev(() => { const F = window.__bund.world.confront.debug.fight; return { over: F.over, how: F.how, landed: F.you.landed, slipped: F.you.slipped, took: F.you.took, x: F.exchanges, t: F.t }; });
  ok(S.over === 'won' && S.landed >= 2 && S.slipped >= 2 && S.x <= 7, `slip, counter: he backs down (${JSON.stringify(S)})`);
  await ended();
  const L = await life(), R = L.fight.result;
  ok(R.outcome === 'won' && R.blows && R.started === 'him' && R.filmed && R.level >= 1 && L.year.hurt && L.year.hurt.level === R.level, 'won: filmed, and your knuckles know about it');
  ok(L.year.facts.filter((x) => x.type === 'fight').slice(-1)[0].blows === true, 'the ledger says it came to blows');
}
// ---- 5. fight and lose: you square up, do nothing, go down; A&E, the statement, the morning after ----
if (only.includes('lose')) {
  await begin(7, { id: 'zhiwei', as: 'target', name: { zh: '知微', en: 'Zhiwei' }, avatar: 'c8' }); await p.keyboard.press('KeyE'); await mode('fight');
  const w0 = (await life()).wallet;
  await answer('calm'); await answer('threat'); await answer('strike');
  await p.waitForFunction(() => window.__bund.world.confront.active === 'blows', null, { timeout: T });
  await ev(() => { window.__bund.dtMax = 0.05; });
  await p.waitForFunction(() => { const F = window.__bund.world.confront.debug.fight; return F.you.took >= 1; }, null, { timeout: T, polling: 30 }); await shot('hit');
  await ev(() => { window.__bund.dtMax = 0.25; });
  await overBlows(); await p.waitForTimeout(1500); await shot('down');
  await p.waitForFunction(() => window.__bund.world.confront.debug.asking, null, { timeout: T }); await shot('statement');
  ok((await ev(() => document.getElementById('fight-dark').classList.contains('on'))) && (await ev(() => document.querySelectorAll('#ride-sub .ch span').length)) === 3, 'you come round in A&E; an officer wants to know who started it (three answers)');
  await p.keyboard.press('Digit1');                                   // "I did."
  await ended(); await p.waitForTimeout(800); await shot('after');
  const L = await life(), R = L.fight.result;
  ok(R.outcome === 'down' && R.started === 'you' && R.level === 3 && L.year.hurt.level === 3 && R.hospital, 'down: stitches (an injury that lasts three nights)');
  ok(R.police.verdict === 'fine' && R.fine === 200 && w0.wechat + w0.bank - (L.wallet.wechat + L.wallet.bank) === 200 + 420, 'you threw the first punch and said so: the lighter fine, and the A&E bill');
  ok(L.clock.day === 8 && L.clock.minute > 120 && L.clock.minute < 420, `most of the night gone (${String(Math.floor(L.clock.minute / 60)).padStart(2, '0')}:${String(L.clock.minute % 60).padStart(2, '0')})`);
  ok(L.year.rep.work < 50 && L.hearts.zhiwei && L.hearts.zhiwei.memories.some((m) => m.key === 'fight'), 'work will hear; and she remembers it');
  ok(!(await ev(() => Object.keys(window.__bund.world.confront.debug.actors).length)), 'the people of the scene are gone');
  // the morning after
  await ev(() => { const b = window.__bund; b.setHour(8, 40); b.dtMax = 0.25; });
  await p.waitForFunction(() => window.__bund.life.flags.fight.morning && window.__bund.life.flags.fight.mirror, null, { timeout: T });
  const M = await life();
  ok(M.threads.momo.some((t) => /救护车/.test(t)) && M.threads.wuhu.some((t) => /视频/.test(t)) && M.threads.ruoan.some((t) => /冰敷/.test(t)) && M.threads['110'] && M.threads.zhiwei && M.threads.zhiwei.length === 1, 'morning: Momo, the group chat (the clip), Ruoan, the receipt, and her');
  ok(subs.some((t) => /In the mirror|镜子里/.test(t)), 'the mirror');
  await ev(() => window.__bund.player.teleport(-46.6, -208.2, Math.PI, 0));
  await p.waitForFunction(() => window.__bund.life.flags.fight.doorman, null, { timeout: T }); await p.waitForTimeout(400); await shot('doorman');
  ok(subs.some((t) => /your face|您这脸/.test(t)), 'the doorman sees your face');
  await ev(() => window.__bund.phone.toggle()); await p.waitForTimeout(900); await shot('phone'); await ev(() => window.__bund.phone.toggle());
}
ok(errors.length === 0, `no errors on the console${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log('fightwalk: all passed');
