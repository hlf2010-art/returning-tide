// The protagonist's life: clock, money, chats, invitations, friends acting on their own. npm test.
import { createLife, advance, stamp, pay, balance, topUp, receive, post, unreadTotal, markRead, answerInvite, lapse, own, save, load, emit, drain, clockText, TIME_RATE } from '../src/engine/life.js';
import { setupThreads, runAgenda, reply, react, deliverFollowUps, respondToInvite, addVoicemail } from '../src/world/agenda.js';
import { isVideo, videoCaption, videoLength, videoStyle, videoNotes, voiceSecs } from '../src/ui/phone/media.js';
import { readFileSync } from 'node:fs';
import { rng } from './util-rng.mjs';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const play = (L, realSecs, step = 1, r = rng(1)) => { for (let s = 0; s < realSecs; s += step) { advance(L, step); runAgenda(L, r); deliverFollowUps(L); lapse(L).forEach((inv) => react(L, { type: 'invite', id: inv.id, status: 'missed', from: inv.from, thread: inv.thread })); } };
{
  const L = createLife();
  ok(clockText(L.clock.minute) === '16:20' && L.clock.day === 1, 'starts on day 1 at 16:20, before the sunset');
  advance(L, 60); ok(L.clock.minute === 16 * 60 + 20 + TIME_RATE, `a real minute is ${TIME_RATE} game minutes`);
  // money
  const w0 = balance(L, 'wechat');
  ok(pay(L, { method: 'wechat', amount: 15, to: 'Manner', memo: '拿铁' }).ok && balance(L, 'wechat') === w0 - 15, 'paying for a latte takes ¥15 from WeChat Pay');
  ok(!pay(L, { method: 'wechat', amount: 1e9, to: 'x' }).ok && balance(L, 'wechat') === w0 - 15, 'you cannot pay what you do not have (and nothing changes)');
  ok(topUp(L, 'wechat', 5000).ok && balance(L, 'wechat') === w0 - 15 + 5000, 'topping up from the bank');
  ok(pay(L, { method: 'card', amount: 2_000_000, to: 'Porsche' }).ok && balance(L, 'card') === 1_000_000, 'the card carries a large purchase');
  receive(L, { method: 'wechat', amount: 88, from: '周子墨', memo: '红包' });
  ok(L.wallet.ledger.length === 4 && L.wallet.ledger.at(-1).amount === 88, 'every movement is in the ledger');
}
{
  // friends act on their own, in order, without being prompted
  const L = createLife(); setupThreads(L);
  ok(unreadTotal(L) === 0 && L.threads.wuhu.messages.length > 0, 'chats start with a little history, nothing unread');
  play(L, 60 * 5);                         // five real minutes = 20 game minutes
  ok(unreadTotal(L) >= 6, `after a while, people have been in touch (${unreadTotal(L)} unread)`);
  ok(L.invites.some((i) => i.id === 'momo-gig') && L.invites.some((i) => i.id === 'xuan-arm'), 'invitations arrive: Momo\'s gig, Xuan\'s prototype review');
  ok(L.outbox.some((e) => e.type === 'call' && e.from === 'dad'), 'Dad calls');
  const zv = L.threads.zhixia.messages.find((m) => m.kind === 'voice');
  ok(zv && zv.replies && zv.replies.length === 2, 'Zhixia sends a voice note you can answer');
  reply(L, 'zhixia', zv.id, 0); play(L, 30);
  ok(L.flags.carCurious && L.threads.zhixia.messages.at(-1).from === 'zhixia', 'answering it moves things on (she follows up; the car thread starts)');
  ok(reply(L, 'zhixia', zv.id, 1) === null, 'a message can only be answered once');
  markRead(L, 'zhixia'); ok(L.threads.zhixia.unread === 0, 'reading a chat clears it');
  // invitations have consequences
  const a0 = L.relations.momo ? L.relations.momo.affinity : 50;
  respondToInvite(L, 'momo-gig', true); play(L, 30);
  ok(L.relations.momo.affinity > a0 && L.calendar.some((c) => c.id === 'momo-gig'), 'accepting Momo\'s invite warms him and goes in the calendar');
  ok(L.threads.wuhu.messages.some((m) => /报我名字/.test(m.text || '')), '... and he answers');
  const x0 = L.relations.xuan ? L.relations.xuan.affinity : 50;
  play(L, 60 * 60 * 6);                    // let the deadlines pass without answering Xuan
  const xi = L.invites.find((i) => i.id === 'xuan-arm');
  ok(xi.status === 'missed' && L.relations.xuan.affinity < x0, 'ignoring Xuan\'s invitation until it lapses costs you with him');
  ok(L.threads.xuan.messages.some((m) => /人呢/.test(m.text || '')), '... and he notices');
  const chatter = L.threads.wuhu.messages.filter((m) => !/白白|吹风|弹琴|报我名字/.test(m.text || '') && m.from !== 'me').length;
  ok(chatter >= 6, `the group chat has a life of its own (${chatter} messages)`);
}
{
  // reactions to the world, and saving
  const L = createLife(); setupThreads(L);
  pay(L, { method: 'wechat', amount: 15, to: 'Manner' }); react(L, { type: 'paid', to: 'Manner' }); play(L, 60);
  ok(L.threads.yuan.messages.some((m) => /Manner/.test(m.text || '')), 'buying a coffee on Hankou Road: Yu\'an, who works nearby, guesses where you are');
  emit(L, { type: 'parcel', item: 'x' }); const out = drain(L);
  ok(out.length === 1 && drain(L).length === 0, 'world events are handed over once');
  own(L, { kind: 'gadget', name: '口袋激光雷达' });
  const L2 = load(save(L));
  ok(L2 && L2.inventory.length === 1 && L2.wallet.wechat === L.wallet.wechat && L2.threads.yuan.messages.length === L.threads.yuan.messages.length && stamp(L2) === stamp(L), 'everything survives a save and load');
  ok(load('{"v":99}') === null && load('nonsense') === null, 'a bad or old save is refused, not half-loaded');
}
// the phone's media (ui/phone/media.js): Old Zhou's voicemail, video clips, and no synthetic speech
{
  const L = createLife(); setupThreads(L);
  const vm = L.threads.zhou && L.threads.zhou.messages[0];
  ok(vm && vm.kind === 'voice' && vm.meta.voicemail && voiceSecs(vm) === 9 && /海关钟/.test(vm.text), "a new game has Old Zhou's nine-second voicemail");
  ok(L.order[0] === 'zhou' && unreadTotal(L) === 0, 'it heads the chats, already seen but not played');
  ok(addVoicemail(L) === null && L.threads.zhou.messages.length === 1, 'only once');
  const old = createLife(); setupThreads(old); delete old.threads.zhou; old.order = old.order.filter((x) => x !== 'zhou');
  addVoicemail(old, { atEnd: true }); ok(old.order.at(-1) === 'zhou', 'an older save gets it at the bottom of the chats');
  const momo = { id: 'mv1', from: 'momo', kind: 'text', text: '[视频] 今天排练的，这段solo我自己都想哭' }, street = { id: 'mv2', from: 'zhixia', kind: 'text', text: '[视频] 这是不是纪白？？昨晚南京路' };
  ok(isVideo(momo) && isVideo({ id: 'x', from: 'momo', kind: 'text', text: '[视频]' }) && !isVideo({ kind: 'text', text: '看这个视频' }), 'a [视频] message is a clip');
  ok(videoCaption(momo.text) === '今天排练的，这段solo我自己都想哭' && videoCaption('[Video] Hi') === 'Hi', 'its caption is the rest of the message');
  ok(videoStyle(momo) === 'music' && videoStyle(street) === 'street', "Momo's rehearsal is music; a clip of you on Nanjing Road is the street");
  const len = videoLength(momo), notes = videoNotes(momo);
  ok(len >= 9 && len <= 15 && len === videoLength(momo), `a clip runs a steady ${len} s`);
  ok(notes.length > 10 && notes.every(([t, k]) => t >= 0 && t < len && k >= 0 && k <= 13), `the solo has ${notes.length} notes inside the clip, on the keyboard drawn`);
  const src = ['src/ui/phone/phone.js', 'src/ui/phone/media.js', 'src/ui/phone/didiApp.js', 'src/ui/phone/shopApp.js'].map((f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\/\/.*$/gm, '')).join('\n');
  ok(!/speechSynthesis|SpeechSynthesisUtterance/.test(src), 'the phone never uses the browser\'s synthetic speech');
}
// ---- old saves: 许若安 Ruoan and 林予安 Lin Yu'an are one person (Character Bible v2.2), id 'yuan' ----
{
  const raw = readFileSync(new URL('./fixtures/save-before-phase5.json', import.meta.url), 'utf8'), was = JSON.parse(raw);
  const L = load(raw), s = JSON.stringify(L);
  ok(!/"ruoan|ruoan[A-Z"-]/.test(s) && L.threads.yuan && L.threads.yuan.messages.length === was.threads.ruoan.messages.length && L.threads.yuan.title === '林予安' && L.order.filter((x) => x === 'yuan').length === 1, 'an old save: her chat, her relation and every id move to yuan; nothing written is lost');
  ok(L.threads.yuan.messages.map((m) => m.text).join() === was.threads.ruoan.messages.map((m) => m.text).join(), 'what she wrote stays as it was written');
  const both = { v: 1, order: ['ruoan', 'yuan', 'momo'], threads: { ruoan: { id: 'ruoan', title: '许若安', members: ['me', 'ruoan'], messages: [{ at: 10, from: 'ruoan', text: 'a' }, { at: 30, from: 'me', text: 'c' }], unread: 1 }, yuan: { id: 'yuan', title: '林予安', members: ['me', 'yuan'], messages: [{ at: 20, from: 'yuan', text: 'b' }], unread: 2 } },
    relations: { ruoan: { affinity: 61 } }, invites: [{ id: 'ruoan-aia', from: 'ruoan', thread: 'ruoan', kept: true }], flags: { ruoanLamp: true, spoke: { ruoan: [5], yuan: [7] }, hearts: { yuan: { stage: 'known' } } } };
  const M = load(JSON.stringify(both));
  ok(M.threads.yuan.messages.map((m) => m.text).join('') === 'abc' && M.threads.yuan.unread === 3 && !M.threads.ruoan && M.order.join() === 'yuan,momo', 'two chats for one person become one, in order');
  ok(M.relations.yuan.affinity === 61 && M.invites[0].id === 'yuan-aia' && M.invites[0].from === 'yuan' && M.flags.yuanLamp === true && M.flags.spoke.yuan.join() === '5,7' && M.flags.hearts.yuan.stage === 'known' && M.flags.idsV === 2, 'the friendship, the AIA evening, the lamp and the romance all carry over');
  ok(load(save(M)).threads.yuan.messages.length === 3, 'and a migrated save loads again unchanged');
}
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
