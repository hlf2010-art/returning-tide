// The protagonist's life: clock, money, chats, invitations, friends acting on their own. npm test.
import { createLife, advance, stamp, pay, balance, topUp, receive, post, unreadTotal, markRead, answerInvite, lapse, own, save, load, emit, drain, clockText, TIME_RATE } from '../src/engine/life.js';
import { setupThreads, runAgenda, reply, react, deliverFollowUps, respondToInvite } from '../src/world/agenda.js';
import { rng } from './util-rng.mjs';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const play = (L, realSecs, step = 1, r = rng(1)) => { for (let s = 0; s < realSecs; s += step) { advance(L, step); runAgenda(L, r); deliverFollowUps(L); lapse(L).forEach((inv) => react(L, { type: 'invite', id: inv.id, status: 'missed', from: inv.from, thread: inv.thread })); } };
{
  const L = createLife();
  ok(clockText(L.clock.minute) === '17:42' && L.clock.day === 1, 'starts on day 1 at 17:42, the blue hour');
  advance(L, 60); ok(L.clock.minute === 17 * 60 + 42 + TIME_RATE, `a real minute is ${TIME_RATE} game minutes`);
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
  ok(L.threads.ruoan.messages.some((m) => /Manner/.test(m.text || '')), 'buying a coffee on Hankou Road: Ruoan, who works nearby, guesses where you are');
  emit(L, { type: 'parcel', item: 'x' }); const out = drain(L);
  ok(out.length === 1 && drain(L).length === 0, 'world events are handed over once');
  own(L, { kind: 'gadget', name: '口袋激光雷达' });
  const L2 = load(save(L));
  ok(L2 && L2.inventory.length === 1 && L2.wallet.wechat === L.wallet.wechat && L2.threads.ruoan.messages.length === L.threads.ruoan.messages.length && stamp(L2) === stamp(L), 'everything survives a save and load');
  ok(load('{"v":99}') === null && load('nonsense') === null, 'a bad or old save is refused, not half-loaded');
}
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
