// Everyday online shopping (src/engine/shopping.js). npm test.
import { createLife, advance, balance, owns, drain, skipTo, stamp } from '../src/engine/life.js';
import { placeOrder, stepOrders, handOver, schedule, CATALOGUE } from '../src/engine/shopping.js';
import { rng } from './util-rng.mjs';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
{
  const L = createLife(), a0 = balance(L, 'alipay');
  const r = placeOrder(L, { items: ['umbrella', 'scarf'], method: 'alipay' }, rng(2));
  ok(r.ok && r.orders.length === 2 && balance(L, 'alipay') === a0 - 129 - 459, 'one checkout, paid once, split into a JD and a Taobao order');
  const jd = r.orders.find((o) => o.shop === 'jd'), tb = r.orders.find((o) => o.shop === 'taobao');
  ok(jd.times.delivered - jd.times.placed <= 4 * 60, `JD before 7 pm: same evening (${((jd.times.delivered - jd.times.placed) / 60).toFixed(1)} h)`);
  ok(tb.times.delivered - tb.times.placed >= 1.5 * 1440, `Taobao: a couple of days (${((tb.times.delivered - tb.times.placed) / 1440).toFixed(1)} days)`);
  ok(['packed', 'shipped', 'out', 'delivered'].every((k, i, a) => i === 0 || jd.times[k] >= jd.times[a[i - 1]]), 'steps happen in order');
  // time passes
  let sawOut = false; const seen = new Set();
  for (let i = 0; i < 4 * 60 * 15; i++) { advance(L, 1); stepOrders(L).forEach((c) => seen.add(`${c.order.shop}:${c.status}`)); for (const e of drain(L)) if (e.type === 'parcel') sawOut = true; }
  ok(['jd:packed', 'jd:shipped', 'jd:out', 'jd:delivered'].every((k) => seen.has(k)), 'the JD order is packed, shipped, out for delivery and delivered');
  ok(sawOut, 'going out for delivery sends a rider into the world');
  ok(owns(L, 'umbrella').length === 1 && owns(L, 'clothing').length === 0, 'the umbrella is yours now; the scarf is still on its way');
  ok(L.threads.jd && L.threads.jd.messages.length >= 4, 'the shop keeps you posted in its chat');
  skipTo(L, stamp(L) + 4 * 1440); stepOrders(L, { here: false });
  ok(owns(L, 'clothing').length === 1 && /前台代收/.test(L.threads.taobao.messages.at(-1).text), 'not around when Taobao delivers: the hotel front desk signs for it');
}
{
  const L = createLife();
  const w0 = balance(L, 'wechat');
  const r = placeOrder(L, { items: ['printer'], method: 'wechat' });
  ok(!r.ok && r.reason === 'insufficient' && balance(L, 'wechat') === w0 && !(L.flags.orders || []).length, 'a ¥8,999 printer is more than the WeChat change: refused, nothing charged, no order');
  const r2 = placeOrder(L, { items: ['lidar'], method: 'card' });
  ok(r2.ok, 'a LiDAR module on the card: fine');
  advance(L, 60 * 15); stepOrders(L);                 // an hour later: on its way, not yet delivered
  ok(handOver(L, r2.orders[0].id) && owns(L, 'part').length === 1 && owns(L, 'part')[0].build === 'scanner', 'the rider hands it over early: in your inventory, ready for a build');
  // late JD orders arrive next morning
  const late = schedule('jd', 1 * 1440 + 21 * 60, rng(1));
  ok(Math.floor(late.delivered / 1440) === 2 && late.delivered % 1440 >= 9 * 60 + 30, 'JD after 7 pm: next morning');
  ok(CATALOGUE.every((c) => c.price > 0 && c.name && c.en), 'catalogue entries are complete');
}
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
