// Walkthrough: the living street (phase 4.3). Families with children in the crowd, umbrellas in the
// drizzle (held by the near people, over the far ones), the crowd's murmur rising with the people
// round you, and the three street moments end to end: the couple's photo with the Pearl, the lost
// visitor walked to the metro, the dropped phone given back.
//   URL=http://localhost:4174/ OUT=<dir> NODE_PATH=$(npm root -g) node tools/streetwalk.mjs
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const url = process.env.URL || 'http://localhost:4174/', out = process.env.OUT || '.';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
p.on('pageerror', (e) => errors.push(e.message));
await p.goto(`${url}?q=3&nolock&fresh&lang=en&crowd=0.6&moments&tod&hour=19:30`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 400000 });
const ev = (f, a) => p.evaluate(f, a);
await ev(() => { window.__bund.start(); window.__bund.dtMax = 0.25; const s = document.createElement('style'); s.textContent = '#minimap,#dev{display:none!important}'; document.head.appendChild(s); });
await p.waitForTimeout(2500);
const face = (x, z, pitch = -0.05) => ev(([x, z, pitch]) => { const b = window.__bund.player; b.yaw = Math.atan2(-(x - b.body.x), -(z - b.body.z)); b.pitch = pitch; }, [x, z, pitch]);
const tp = (x, z, yaw = 0, pitch = 0) => ev(([x, z, y, pt]) => window.__bund.player.teleport(x, z, y, pt), [x, z, yaw, pitch]);
const prompt = () => ev(() => { const e = document.getElementById('prompt'); return e.classList.contains('on') ? e.innerText.replace(/\n/g, ' ') : ''; });
const M = () => ev(() => window.__bund.life.flags.moments || {});
const quest = (id) => ev((id) => { window.__bund.updateStory(); const q = window.__bund.life.quests.list[id]; return q ? q.status : null; }, id);
const answer = async (k) => { await p.waitForFunction(() => document.querySelector('#ride-sub .ch') && !document.querySelector('#ride-sub .ch').classList.contains('hidden'), null, { timeout: 120000 }); await p.keyboard.press(k); };
const until = async (f, a, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(f, a)) return true; await p.waitForTimeout(400); } return false; };

// ---- families ----
const fam = await ev(() => { const c = window.__bund.world.crowd; const kids = c.agents.filter((a) => a.child); return { n: kids.length, roles: [...new Set(kids.map((k) => k.role))], parents: kids.every((k) => k.leader && k.leader.partner) }; });
ok(fam.n > 0 && fam.parents && fam.roles.every((r) => /^k/.test(r)), `${fam.n} children in the evening crowd (${fam.roles.join(', ')}), each with two parents`);
// stand by one on their walk and see them as a full person
const kid = await ev(() => { const k = window.__bund.world.crowd.agents.find((a) => a.child && !a.gone && a.leader.state === 'walk' && a.y > 2); return k ? { id: k.id, x: k.x, z: k.z } : null; });
if (kid) {
  await tp(kid.x - 4, kid.z + 1); await face(kid.x, kid.z, -0.15); await p.waitForTimeout(2500);
  const k2 = await ev((id) => { const a = window.__bund.world.crowd.agents[id]; const b = window.__bund.world.crowdView.bodyOf(a); return { near: !!b, child: b ? b.person.child : false, x: a.x, z: a.z, h: b ? b.person.bones.head.getWorldPosition(new window.__bund.THREE.Vector3()).y - a.y : 0, dp: Math.hypot(a.x - a.leader.x, a.z - a.leader.z) }; }, kid.id);
  await face(k2.x, k2.z, -0.15); await p.waitForTimeout(600);
  await p.screenshot({ path: `${out}/street-family.png` });
  ok(k2.near && k2.child && k2.h > 0.9 && k2.h < 1.45 && k2.dp < 2.5, `a child up close: a full person, head ${k2.h.toFixed(2)} m up (a child's height), ${k2.dp.toFixed(1)} m from a parent`);
} else ok(false, 'a family walking on the promenade to look at');

// ---- the murmur ----
await tp(18, -5, 0); await p.waitForTimeout(4000);
const mur = await ev(() => ({ lvl: window.__bund.audio.crowdLevel, state: window.__bund.audio.census().state }));
ok(mur.lvl > 0.02, `the crowd's murmur is heard on the promenade at 7:30 pm (gain ${mur.lvl.toFixed(3)}, audio ${mur.state})`);

// ---- umbrellas ----
await ev(() => window.__bund.weather.set('drizzle', { instant: true }));
await p.waitForTimeout(6000);
await face(18, -40, -0.02);
await p.waitForTimeout(1500);
const um = await ev(() => { const w = window.__bund.world; const can = window.__bund.scene.getObjectByName('crowd-umbrellas'); let near = 0, nearAll = 0; for (const a of w.crowdView.nearAgents()) { nearAll++; const b = w.crowdView.bodyOf(a); if (b && b.umb.visible) near++; } return { far: can.count, near, nearAll, out: w.crowd.count() }; });
await p.screenshot({ path: `${out}/street-umbrellas.png` });
ok(um.far > um.out * 0.3 && um.near > 0, `drizzle: ${um.far} umbrellas over the far crowd (of ${um.out} out), ${um.near} of ${um.nearAll} near people with one up`);
await ev(() => window.__bund.weather.set('clear', { instant: true }));
await p.waitForTimeout(5000);
const um2 = await ev(() => window.__bund.scene.getObjectByName('crowd-umbrellas').count);
ok(um2 === 0, `clear again: umbrellas folded (${um2} up)`);

// ---- the couple's photo ----
await tp(18, -20, 0); await p.waitForTimeout(800);
ok(await ev(() => window.__bund.world.moments.force('photo')), 'a couple at the railing');
const cpl = await ev(() => { const c = window.__bund.world.moments.current; return { x: c.a.x, z: c.a.z, z2: c.b.z }; });
await tp(cpl.x - 4.6, (cpl.z + cpl.z2) / 2); await face(cpl.x, (cpl.z + cpl.z2) / 2, 0.02); await p.waitForTimeout(3500);
await face(cpl.x, (cpl.z + cpl.z2) / 2, 0.02); await p.waitForTimeout(800);
const pr1 = await prompt();
ok(/Take their photo/.test(pr1), `they ask; the prompt: "${pr1}"`);
await p.keyboard.press('KeyE'); await p.waitForTimeout(2500);
ok(await ev(() => window.__bund.world.moments.framing) && (await quest('m-photo')) === 'active', 'their phone in your hands: the viewfinder, the side quest "Take our photo"');
await face(cpl.x, (cpl.z + cpl.z2) / 2, 0.06); await p.waitForTimeout(800);
await p.screenshot({ path: `${out}/street-photo-frame.png` });
await p.keyboard.press('Space'); await p.waitForTimeout(1800);
const ph = await M();
ok(ph.photo === 'done' && ph.photoGood === 1, `a good shot (both of them, the Pearl behind): ${JSON.stringify({ photo: ph.photo, good: ph.photoGood })}`);
ok((await quest('m-photo')) === 'done', 'side quest done');
await p.screenshot({ path: `${out}/street-photo-card.png` });
await ev(() => window.__bund.world.moments.end());

// ---- the lost visitor, on Nanjing Road ----
const NJZ = -201.5;
await tp(-420, NJZ + 1, Math.PI / 2); await p.waitForTimeout(800);
ok(await ev(() => window.__bund.world.moments.force('lost')), 'a visitor, map in hand, on Nanjing Road');
const v = await ev(() => { const c = window.__bund.world.moments.current; return { x: c.a.x, z: c.a.z, variant: c.variant }; });
await tp(v.x - 2.6, v.z); await face(v.x, v.z, -0.02); await p.waitForTimeout(3000);
await face(v.x, v.z, -0.02); await p.waitForTimeout(600);
const pr2 = await prompt();
ok(v.variant === 'metro' && /Help him/.test(pr2), `he hails you (${v.variant}); the prompt: "${pr2}"`);
await p.keyboard.press('KeyE'); await p.waitForTimeout(800);
await answer('Digit1');
ok(await until(() => (window.__bund.life.flags.moments || {}).lost === 'walk'), 'you offer to walk him there');
ok((await quest('m-lost')) === 'active', 'side quest "A lost visitor": walk him to the station');
const to = (await M()).lostTo;
// walk there; he follows
let x = v.x - 2.6;
const dir = Math.sign(to.x - x);
while (Math.abs(to.x - x) > 3) {
  x += dir * Math.min(4, Math.abs(to.x - x)); await tp(x, NJZ + 0.5, dir < 0 ? Math.PI / 2 : -Math.PI / 2);
  await until((x) => { const c = window.__bund.world.moments.current; return !c || Math.abs(c.a.x - x) < 5; }, x, 30000);   // (he keeps up, whatever the frame rate)
}
await tp(to.x - dir * 2, to.z - 1.5); await p.waitForTimeout(500);
ok(await until(() => (window.__bund.life.flags.moments || {}).lost === 'arrived', null, 90000), 'he followed you to the entrance');
ok((await quest('m-lost')) === 'done', 'side quest done');
await p.screenshot({ path: `${out}/street-lost.png` });
await ev(() => window.__bund.world.moments.end());

// ---- the dropped phone ----
await tp(18, 40, 0, -0.1); await p.waitForTimeout(800);
const before = await ev(() => window.__bund.life.wallet ? JSON.stringify(window.__bund.life.wallet).length : 0);
ok(await ev(() => window.__bund.world.moments.force('phone')), 'someone hurrying past behind you');
ok(await until(() => { const c = window.__bund.world.moments.current; return c && !!c.phone; }, null, 90000), 'they overtake you and a phone drops on the stone');
const ph2 = await ev(() => { const c = window.__bund.world.moments.current; return { x: c.phone.position.x, z: c.phone.position.z }; });
await tp(ph2.x - 1.1, ph2.z + 0.2); await face(ph2.x, ph2.z, -0.95); await p.waitForTimeout(1200);
const pr3 = await prompt();
ok(/Pick it up/.test(pr3), `the prompt: "${pr3}"`);
await p.screenshot({ path: `${out}/street-phone.png` });
await p.keyboard.press('KeyE'); await p.waitForTimeout(1200);
ok((await quest('m-phone')) === 'active', 'side quest "A dropped phone": give it back');
const ow = await ev(() => { const c = window.__bund.world.moments.current; return { x: c.a.x, z: c.a.z }; });
await tp(ow.x - 2.2, ow.z); await face(ow.x, ow.z, 0.02); await p.waitForTimeout(1500);
const ow2 = await ev(() => { const c = window.__bund.world.moments.current; return { x: c.a.x, z: c.a.z }; });
await tp(ow2.x - 2.2, ow2.z); await face(ow2.x, ow2.z, 0.02); await p.waitForTimeout(800);
const pr4 = await prompt();
ok(/Give it back/.test(pr4), `the owner; the prompt: "${pr4}"`);
const w0 = await ev(() => window.__bund.life.wallet.ledger.length);
await p.keyboard.press('KeyE'); await p.waitForTimeout(800);
await answer('Digit2');
ok(await until(() => (window.__bund.life.flags.moments || {}).phone === 'returned'), 'given back');
const w1 = await ev(() => window.__bund.life.wallet.ledger.length);
ok((await quest('m-phone')) === 'done' && w1 > w0, `side quest done; a coffee's worth sent to you on Xinyu (${w1 - w0} new wallet entry)`);

ok(errors.length === 0, `no errors (${errors.slice(0, 3).join(' | ')})`);
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
await browser.close();
process.exit(failed ? 1 : 0);
