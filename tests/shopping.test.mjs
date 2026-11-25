// Everyday online shopping (src/engine/shopping.js). npm test.
import { createLife, advance, balance, owns, drain, skipTo, stamp } from '../src/engine/life.js';
import { placeOrder, stepOrders, handOver, schedule, eta, withMe, waitingAt, canUse, CATALOGUE, COURIER_WAIT } from '../src/engine/shopping.js';
import { enText } from '../src/world/agendaEn.js';
import { rng } from './util-rng.mjs';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const run = (L, minutes, sink = []) => { for (let i = 0; i < minutes * 15; i++) { advance(L, 1); stepOrders(L); sink.push(...drain(L)); } return sink; };
{
  // to the hotel: one checkout split by shop; JD same evening, Wanji a couple of days; the desk signs
  const L = createLife(), a0 = balance(L, 'alipay');
  const r = placeOrder(L, { items: ['kettle', 'scarf'], method: 'alipay', address: 'hotel' }, rng(2));
  ok(r.ok && r.orders.length === 2 && balance(L, 'alipay') === a0 - 199 - 459, 'one checkout, paid once, split into a JD and a Wanji order');
  const jd = r.orders.find((o) => o.shop === 'jd'), tb = r.orders.find((o) => o.shop === 'taobao');
  ok(jd.times.delivered - jd.times.placed <= 4 * 60 && jd.times.delivered - jd.times.placed > 60, `JD before 7 pm: same evening (${((jd.times.delivered - jd.times.placed) / 60).toFixed(1)} h)`);
  ok(tb.times.delivered - tb.times.placed >= 1.5 * 1440, `Wanji: a couple of days (${((tb.times.delivered - tb.times.placed) / 1440).toFixed(1)} days)`);
  ok(['packed', 'shipped', 'out', 'delivered'].every((k, i, a) => i === 0 || jd.times[k] >= jd.times[a[i - 1]]), 'steps happen in order');
  const ev = run(L, 4 * 60);
  ok(jd.status === 'delivered' && !ev.some((e) => e.type === 'courier'), 'the JD order reaches the hotel without sending anyone to the kerb');
  ok(waitingAt(L, 'hotel').some((i) => i.id === 'kettle') && !withMe(L).some((i) => i.id === 'kettle'), 'the kettle waits at the front desk, not in your hands');
  ok(L.threads.jd && L.threads.jd.messages.length >= 4, 'the shop keeps you posted in its chat');
  skipTo(L, stamp(L) + 4 * 1440); stepOrders(L);
  ok(owns(L, 'clothing').length === 1 && /前台代收/.test(L.threads.taobao.messages.at(-1).text), 'Wanji delivers to the hotel too');
}
{
  // JD express to "here": the courier waits at the kerb; you walk over; he hands it to you
  const L = createLife();
  const r = placeOrder(L, { items: ['umbrella'], method: 'wechat', address: 'here' }, rng(5));
  const o = r.orders[0], span = o.times.delivered - o.times.placed;
  ok(o.express && span >= 28 && span <= 50, `an umbrella by JD express: within the hour (${span} min)`);
  ok(eta(L, 'umbrella') - stamp(L) <= 50 && eta(L, 'kettle') - stamp(L) > 60, 'the product page quotes express for small stock items only');
  const ev = [];
  for (let m = 0; m < 60 && !ev.some((e) => e.type === 'courier'); m++) run(L, 1, ev);
  const c = ev.find((e) => e.type === 'courier');
  ok(c && c.order === o.id && o.status === 'out', 'out for delivery: a courier comes to the kerb and waits (not delivered yet)');
  ok(/请下楼取件/.test(L.threads.jd.messages.at(-1).text) && /Hankou/.test(enText(L.threads.jd.messages.at(-1).text)), 'he messages you where he is (and it reads in English too)');
  ok(handOver(L, o.id) && o.status === 'delivered' && canUse(L, 'umbrella'), 'you take it from him: the umbrella is in your hands, ready to open');
  ok(!handOver(L, o.id), 'he only hands it over once');
}
{
  // you never come: after his wait, the front desk has it
  const L = createLife();
  const r = placeOrder(L, { items: ['headphones'], method: 'card', address: 'here' }, rng(9));
  const o = r.orders[0];
  const ev = run(L, 60 + COURIER_WAIT + 5);
  ok(ev.some((e) => e.type === 'courier') && ev.some((e) => e.type === 'courier-gone'), 'he waited, then went');
  ok(o.status === 'delivered' && o.missed && waitingAt(L, 'hotel').some((i) => i.id === 'headphones') && !canUse(L, 'anc'), 'the headphones went to the Peace Hotel front desk');
  ok(/前台/.test(L.threads.jd.messages.at(-1).text), 'and he says so');
}
{
  const L = createLife();
  const w0 = balance(L, 'wechat');
  const r = placeOrder(L, { items: ['printer'], method: 'wechat' });
  ok(!r.ok && r.reason === 'insufficient' && balance(L, 'wechat') === w0 && !(L.flags.orders || []).length, 'a ¥8,999 printer is more than the Xinyu change: refused, nothing charged, no order');
  const r2 = placeOrder(L, { items: ['sofa'], method: 'card', address: 'here' });
  ok(r2.ok && r2.orders[0].address === 'hotel', 'a sofa never goes to the kerb: bulky things go to the hotel');
  const late = schedule('jd', 1 * 1440 + 21 * 60, rng(1));
  ok(Math.floor(late.delivered / 1440) === 2 && late.delivered % 1440 >= 9 * 60 + 30, 'JD after 7 pm: next morning');
  const lateX = schedule('jd', 1 * 1440 + 22 * 60 + 30, rng(1), { express: true });
  ok(Math.floor(lateX.delivered / 1440) === 2, 'no express after 22:00');
  ok(CATALOGUE.every((c) => c.price > 0 && c.name && c.en && c.catEn), 'catalogue entries are complete in both languages');
  for (const s of ['您的订单已打包：自动折叠伞 黑色', '已由前台代收：头戴式降噪耳机', '联系不上您，快递已放和平饭店前台：充电宝 10000mAh', '已签收：明前龙井 250g 礼盒'])
    ok(!/[一-鿿]/.test(enText(s)), `shop message in English: "${enText(s)}"`);
}
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
