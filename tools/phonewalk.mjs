// The phone plays what it's sent: Old Zhou's voicemail (the river wind and his words), a recorded
// voice note (keyboard), a video clip (Space, click, progress), a call with the caller's recorded
// voice, and never the browser's synthetic speech. node tools/phonewalk.mjs (URL=, OUT=)
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const OUT = (process.env.OUT || '.') + '/';
let failed = 0; const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1100, height: 800 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => { if (m.type() === 'error' && !/403|8790|11434|ERR_CONNECTION/.test(m.text())) errs.push(m.text().slice(0, 200)); });
// spy: nobody may touch speechSynthesis
await p.addInitScript(() => {
  window.__synthCalls = 0;
  if (window.speechSynthesis) { const s = window.speechSynthesis; const sp = s.speak.bind(s); s.speak = (u) => { window.__synthCalls++; return sp(u); }; }
  // count AudioBufferSource starts with a recorded buffer
  const st = AudioBufferSourceNode.prototype.start; window.__bufStarts = [];
  AudioBufferSourceNode.prototype.start = function (...a) { window.__bufStarts.push(this.buffer ? +this.buffer.duration.toFixed(2) : -1); return st.apply(this, a); };
});
await p.goto(`${process.env.URL || 'http://localhost:4173/'}?fresh&nolock&q=4&lang=${process.env.UILANG || 'en'}`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 180000 });
await p.evaluate(() => window.__bund.start()); await p.waitForTimeout(2000);
await p.evaluate(() => { const s = document.createElement('style'); s.textContent = '#minimap,#dev{display:none!important}'; document.head.appendChild(s); });
ok(await p.evaluate(() => window.__bund.audio.running), 'audio context running after start');
// open the phone with P, unlock with Enter, open WeChat
await p.keyboard.press('KeyP'); await p.waitForTimeout(700);
await p.keyboard.press('Enter'); await p.waitForTimeout(1200);
await p.click('#phone [data-act="app"][data-id="chats"] >> nth=0'); await p.waitForTimeout(500);
// swiftshader: a 3-D frame can block the page for seconds while the audio clock runs on; stop drawing the world for the phone checks
if (process.env.FREEZE) { await p.evaluate(() => window.__bund.R.renderer.setAnimationLoop(null)); await p.waitForTimeout(500); }
const rows = await p.$$eval('#phone .row .n', (els) => els.map((e) => e.textContent));
ok(rows.includes('Old Zhou'), `chats list has Old Zhou: ${rows.join(', ')}`);
await p.click('#phone .row[data-id="zhou"]'); await p.waitForTimeout(600);
// play the voicemail with a mouse click
const before = await p.evaluate(() => window.__bufStarts.length);
await p.click('#phone .bub.voice'); await p.waitForTimeout(1500);
const s1 = await p.evaluate(() => { const ph = document.querySelector('#phone .bub.voice'); const u = document.querySelector('#phone .bub.voice .prog u'); return { playing: ph.classList.contains('playing'), w: parseFloat(u.style.width) || 0, trans: (document.querySelector('#phone .trans') || {}).textContent, t: document.querySelector('#phone .bub.voice .vt').textContent }; });
const ctxT0 = await p.evaluate(() => window.__bund.audio.getContext().currentTime);
await p.waitForTimeout(1500);
const s2 = await p.evaluate(() => ({ w: parseFloat(document.querySelector('#phone .bub.voice .prog u').style.width) || 0, ct: window.__bund.audio.getContext().currentTime }));
ok(s1.playing, 'voicemail bubble shows playing');
ok(s2.w > s1.w && s1.w > 0, `progress bar advances (${s1.w}% -> ${s2.w}%), remaining ${s1.t}`);
ok(s2.ct > ctxT0, `audio clock advances (${ctxT0.toFixed(2)} -> ${s2.ct.toFixed(2)})`);
ok(await p.evaluate((n) => window.__bufStarts.length > n, before), 'a buffer source started (the river-wind voicemail cue)');
ok(/Customs clock/.test(s1.trans || ''), `transcript shown: "${s1.trans}"`);
await p.screenshot({ path: OUT + 'phone-voicemail.png', timeout: 120000 });
await p.waitForFunction(() => !document.querySelector('#phone .bub.voice.playing'), null, { timeout: 15000 }).catch(() => {});
ok(await p.evaluate(() => !document.querySelector('#phone .bub.voice.playing')), 'voicemail ends by itself');
// a recorded voice note: Zhixia's data logger note (has a real clip); keyboard: Enter plays the unheard note
await p.evaluate(() => {
  const L = window.__bund.life, t = L.threads.zhixia;
  t.messages.push({ id: 'mtestz2', at: L.clock.day * 1440 + L.clock.minute, read: false, from: 'zhixia', kind: 'voice', text: '白白，帮个忙。我想给赛车做个数据记录仪：CAN总线读转速和刹车压力，GPS记圈速，再加个陀螺仪看G值。你会做吧？零件我出，送到你那个创客空间。' });
  t.messages.push({ id: 'mtestvid', at: L.clock.day * 1440 + L.clock.minute, read: false, from: 'zhixia', kind: 'text', text: '[视频] 这是不是纪白？？昨晚南京路' });
});
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
await p.click('#phone .row[data-id="zhixia"]'); await p.waitForTimeout(600);
const n0 = await p.evaluate(() => window.__bufStarts.length);
// ↑ ↑ selects the voice note (the video is last), Enter plays
await p.keyboard.press('ArrowUp'); await p.keyboard.press('ArrowUp'); await p.waitForTimeout(100);
const selId = await p.evaluate(() => { const s = document.querySelector('#phone .sel'); return s && s.dataset.id; });
ok(selId === 'mtestz2', `arrow keys select the voice note (${selId})`);
await p.keyboard.press('Enter');
await p.waitForFunction(() => { const c = window.__bund.phone && document.querySelector('#phone .bub.voice.playing'); return !!c; }, null, { timeout: 8000 }).catch(() => {});
await p.waitForTimeout(2500);
const rec = await p.evaluate((n) => ({ starts: window.__bufStarts.slice(n), w: parseFloat((document.querySelector('[data-prog="mtestz2"]') || { style: {} }).style.width) || 0 }), n0);
ok(rec.starts.some((d) => d > 3), `recorded clip started (buffer durations ${rec.starts.join(', ')})`);
ok(rec.w > 0, `its progress bar moves (${rec.w}%)`);
ok(await p.evaluate(() => !document.querySelector('#phone .trans')), 'recorded note: no forced transcript');
await p.screenshot({ path: OUT + 'phone-voicenote.png', timeout: 120000 });
// the video: Space on it plays it; the canvas animates; progress moves
await p.keyboard.press('ArrowDown'); await p.waitForTimeout(100);
await p.keyboard.press('Space'); await p.waitForTimeout(400);
const px = () => p.evaluate(() => { const c = document.querySelector('#phone canvas[data-vid]'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) >>> 0; return h; });
const h1 = await px(); const v1 = await p.evaluate(() => parseFloat(document.querySelector('[data-prog="mtestvid"]').style.width) || 0);
await p.waitForTimeout(1500);
const h2 = await px(); const v2 = await p.evaluate(() => ({ w: parseFloat(document.querySelector('[data-prog="mtestvid"]').style.width) || 0, playing: document.querySelector('#phone .bub.vid').classList.contains('playing'), t: document.querySelector('#phone .bub.vid .vt').textContent }));
ok(v2.playing, 'video plays (Space)');
ok(h1 !== h2, 'video frames change');
ok(v2.w > v1, `video progress ${v1}% -> ${v2.w}% (${v2.t})`);
await p.screenshot({ path: OUT + 'phone-video.png', timeout: 120000 });
if (!(await p.evaluate(() => window.__bund.phone.media.isPlaying('mtestvid')))) { await p.click('#phone .bub.vid canvas'); await p.waitForTimeout(300); }   // (it may have run out during the slow screenshot)
ok(await p.evaluate(() => window.__bund.phone.media.isPlaying('mtestvid')), 'click plays the video');
await p.click('#phone .bub.vid canvas'); await p.waitForTimeout(300);
ok(await p.evaluate(() => !document.querySelector('#phone .bub.vid').classList.contains('playing')), 'click pauses the video');
// a call: Dad rings; answer with Enter; his recorded lines play down the line with subtitles; hang up
await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
await p.evaluate(() => window.__bund.phone.ring('dad-arrival'));
await p.waitForTimeout(400);
ok(await p.evaluate(() => !!document.querySelector('#phone [data-act="accept"]')), 'incoming call screen');
const c0 = await p.evaluate(() => window.__bufStarts.length);
await p.keyboard.press('Enter'); await p.waitForTimeout(3000);
const call = await p.evaluate((n) => ({ line: (document.querySelector('#phone .call .line') || {}).textContent, starts: window.__bufStarts.slice(n), time: document.querySelector('#phone [data-calltime]').textContent }), c0);
ok(!!call.line, `subtitle on screen: "${call.line}"`);
ok(call.starts.some((d) => d > 1), `caller's recorded voice started (${call.starts.join(', ')})`);
await p.waitForTimeout(1200);
const time2 = await p.evaluate(() => document.querySelector('#phone [data-calltime]').textContent);
ok(time2 !== '0:00', `call clock runs (${call.time} -> ${time2})`);
await p.screenshot({ path: OUT + 'phone-call.png', timeout: 120000 });
await p.click('#phone [data-act="hangup"]'); await p.waitForTimeout(300);
ok(await p.evaluate(() => !window.__bund.phone.inCall), 'hung up');
ok(await p.evaluate(() => window.__synthCalls === 0), `no speechSynthesis (${await p.evaluate(() => window.__synthCalls)})`);
ok(errs.length === 0, `no page errors ${errs.slice(0, 3).join(' | ')}`);
console.log(failed ? `${failed} failed` : 'all passed');
await b.close(); process.exit(failed ? 1 : 0);
