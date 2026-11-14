// Everyday online shopping: pure, node-tested, on top of engine/life.js.
// Two shops with the delivery rhythm people expect of them:
//   京东 JD      own logistics; most things same day (a few hours) when ordered before evening,
//               otherwise first thing next morning
//   淘宝 Taobao  marketplace sellers; packed and shipped by courier, 2-3 days
// Orders move through placed -> packed -> shipped -> out for delivery -> delivered, each with a
// time. "Out for delivery" sends a rider to wherever you are in the world (or the hotel concierge
// keeps it if you're not around); delivery puts the thing in your inventory.
// Catalogue entries are generic products with plausible prices; brands are left out on purpose.
import { pay, stamp, own, emit, post, thread } from './life.js';

export const SHOPS = {
  jd: { name: '京东', en: 'JD', color: '#e1251b', sameDayBefore: 19 * 60, sameDayHours: 3, nextMorning: 9 * 60 + 30 },
  taobao: { name: '淘宝', en: 'Taobao', color: '#ff5000', days: [2, 3] },
};

export const CATALOGUE = [
  { id: 'scarf', shop: 'taobao', cat: '服饰', name: '羊绒围巾 深灰', en: 'Cashmere scarf, charcoal', price: 459, kind: 'clothing' },
  { id: 'coat', shop: 'taobao', cat: '服饰', name: '羊毛大衣 藏青', en: 'Wool overcoat, navy', price: 2380, kind: 'clothing' },
  { id: 'umbrella', shop: 'jd', cat: '日用', name: '自动折叠伞', en: 'Automatic folding umbrella', price: 129, kind: 'umbrella' },
  { id: 'kettle', shop: 'jd', cat: '家电', name: '电热水壶 1.5L', en: 'Electric kettle, 1.5 L', price: 199, kind: 'home' },
  { id: 'lidar', shop: 'jd', cat: '数码', name: '手持激光雷达模块', en: 'Handheld LiDAR module', price: 3299, kind: 'part', build: 'scanner' },
  { id: 'servo', shop: 'taobao', cat: '数码', name: '高扭矩舵机 ×6', en: 'High-torque servos ×6', price: 864, kind: 'part', build: 'drone' },
  { id: 'battery', shop: 'jd', cat: '数码', name: '无人机电池 6S', en: '6S drone battery', price: 1150, kind: 'part', build: 'drone' },
  { id: 'printer', shop: 'jd', cat: '数码', name: '桌面3D打印机', en: 'Desktop 3D printer', price: 8999, kind: 'tool' },
  { id: 'headphones', shop: 'jd', cat: '数码', name: '降噪耳机', en: 'Noise-cancelling headphones', price: 2499, kind: 'gadget' },
  { id: 'sofa', shop: 'taobao', cat: '家居', name: '三人位布艺沙发', en: 'Three-seat fabric sofa', price: 6800, kind: 'furniture', bulky: true },
  { id: 'lamp', shop: 'taobao', cat: '家居', name: '落地灯 黄铜', en: 'Brass floor lamp', price: 1290, kind: 'furniture' },
  { id: 'tea', shop: 'jd', cat: '食品', name: '明前龙井 250g', en: 'Pre-Qingming Longjing tea, 250 g', price: 680, kind: 'gift' },
];

const STEPS = ['placed', 'packed', 'shipped', 'out', 'delivered'];
let seq = 0;

// when each step happens (absolute game minutes), from the shop's rhythm
export function schedule(shopId, placedAt, rnd = Math.random) {
  const S = SHOPS[shopId], day = Math.floor(placedAt / 1440), tod = placedAt % 1440;
  let deliver;
  if (shopId === 'jd') deliver = tod < S.sameDayBefore ? placedAt + S.sameDayHours * 60 + Math.floor(rnd() * 60) : (day + 1) * 1440 + S.nextMorning + Math.floor(rnd() * 90);
  else { const d = S.days[0] + Math.floor(rnd() * (S.days[1] - S.days[0] + 1)); deliver = (day + d) * 1440 + 10 * 60 + Math.floor(rnd() * 8 * 60); }
  const span = deliver - placedAt;
  return { placed: placedAt, packed: placedAt + Math.round(span * 0.12), shipped: placedAt + Math.round(span * 0.3), out: deliver - 45, delivered: deliver };
}

// order: { items: [catalogue ids], method, address } -> { ok, order?, reason? }
export function placeOrder(L, { items, method = 'alipay', address = '和平饭店 Peace Hotel（前台代收）' }, rnd = Math.random) {
  const lines = items.map((id) => CATALOGUE.find((c) => c.id === id)).filter(Boolean);
  if (!lines.length) return { ok: false, reason: 'empty' };
  const byShop = {};
  for (const l of lines) (byShop[l.shop] ||= []).push(l);
  const total = lines.reduce((s, l) => s + l.price, 0);
  const r = pay(L, { method, amount: total, to: Object.keys(byShop).map((k) => SHOPS[k].name).join(' + '), memo: lines.map((l) => l.name).join('、'), kind: 'shopping' });
  if (!r.ok) return r;
  const orders = Object.entries(byShop).map(([shop, ls]) => {
    const o = { id: `o${stamp(L)}${(seq++).toString(36)}`, shop, items: ls.map((l) => l.id), total: ls.reduce((s, l) => s + l.price, 0), address, status: 'placed', times: schedule(shop, stamp(L), rnd) };
    (L.flags.orders ||= []).push(o);
    return o;
  });
  return { ok: true, orders };
}

// move orders along; returns status changes. When an order goes out for delivery the world is
// asked to send a rider (emit 'parcel'); `here` says whether you're around to receive it.
export function stepOrders(L, { here = true } = {}) {
  const now = stamp(L), changes = [];
  for (const o of L.flags.orders || []) {
    let i = STEPS.indexOf(o.status);
    while (i < STEPS.length - 1 && now >= o.times[STEPS[i + 1]]) {
      i++; o.status = STEPS[i]; changes.push({ order: o, status: o.status });
      const S = SHOPS[o.shop], names = o.items.map((id) => CATALOGUE.find((c) => c.id === id).name).join('、');
      thread(L, o.shop, { title: `${S.name} · ${S.en}`, members: ['me', o.shop], kind: 'service' });
      const text = {
        packed: `您的订单已打包：${names}`, shipped: `您的订单已发货：${names}`,
        out: `快递员正在派送，预计45分钟内送达：${names}`, delivered: here ? `已签收：${names}` : `已由前台代收：${names}（${o.address}）`,
      }[o.status];
      if (text) post(L, o.shop, { from: o.shop, kind: 'text', text });
      if (o.status === 'out') emit(L, { type: 'parcel', order: o.id, items: o.items, bulky: o.items.some((id) => CATALOGUE.find((c) => c.id === id).bulky) });
      if (o.status === 'delivered') for (const id of o.items) { const c = CATALOGUE.find((x) => x.id === id); own(L, { kind: c.kind, id: c.id, name: c.name, en: c.en, from: S.name, build: c.build }); }
    }
  }
  return changes;
}

// the rider handed it over in person (a little earlier than the schedule)
export function handOver(L, orderId) {
  const o = (L.flags.orders || []).find((x) => x.id === orderId);
  if (!o || o.status === 'delivered') return false;
  o.times.delivered = stamp(L); o.status = 'out';
  stepOrders(L, { here: true });
  return true;
}
