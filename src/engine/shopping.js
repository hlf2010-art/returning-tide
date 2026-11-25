// Everyday online shopping: pure, node-tested, on top of engine/life.js.
// Two shops with the delivery rhythm people expect of them:
//   京东 JD      own logistics. Small things in stock nearby go by 秒送 (express: within the hour,
//               until 22:00); most things same day (a few hours) when ordered before evening,
//               otherwise first thing next morning
//   淘宝 Taobao  marketplace sellers; packed and shipped by courier, 2-3 days
// Orders move through placed -> packed -> shipped -> out for delivery -> delivered, each with a time.
// Where it goes:
//   here   to you on the Bund. The way it really goes: the courier parks his e-bike at the kerb on
//          Hankou Road and messages you to come and get it. You walk over; he hands it to you. Don't
//          come and, when his window is up, he leaves it at the Peace Hotel front desk.
//   hotel  the Peace Hotel front desk signs for it; it waits for you there (bulky things always).
// Catalogue entries are generic products with plausible prices; brands are left out on purpose.
import { pay, stamp, own, emit, post, thread } from './life.js';

export const SHOPS = {
  jd: { name: '鲸送', en: 'Jingsong', color: '#e1251b', sameDayBefore: 19 * 60, sameDayHours: 3, nextMorning: 9 * 60 + 30, expressUntil: 22 * 60, expressMin: [28, 50] },
  taobao: { name: '万集', en: 'Wanji', color: '#ff5000', days: [2, 3] },
};
export const ADDRESSES = {
  here: { zh: '外滩 汉口路（当面签收）', en: 'Hankou Road, the Bund (hand it to me)' },
  hotel: { zh: '和平饭店 前台代收', en: 'Peace Hotel front desk' },
};
export const COURIER_WAIT = 30;                     // game minutes he waits at the kerb before giving up

export const CATALOGUE = [
  { id: 'umbrella', shop: 'jd', cat: '日用', catEn: 'Everyday', name: '自动折叠伞 黑色', en: 'Automatic folding umbrella, black', price: 129, kind: 'umbrella', express: true, use: 'umbrella' },
  { id: 'headphones', shop: 'jd', cat: '数码', catEn: 'Electronics', name: '头戴式降噪耳机', en: 'Noise-cancelling headphones', price: 2499, kind: 'gadget', express: true, use: 'anc' },
  { id: 'powerbank', shop: 'jd', cat: '数码', catEn: 'Electronics', name: '充电宝 10000mAh', en: 'Power bank, 10,000 mAh', price: 149, kind: 'gadget', express: true },
  { id: 'tea', shop: 'jd', cat: '食品', catEn: 'Food', name: '明前龙井 250g 礼盒', en: 'Pre-Qingming Longjing tea, 250 g gift box', price: 680, kind: 'gift', express: true },
  { id: 'kettle', shop: 'jd', cat: '家电', catEn: 'Appliances', name: '电热水壶 1.5L', en: 'Electric kettle, 1.5 L', price: 199, kind: 'home' },
  { id: 'lidar', shop: 'jd', cat: '数码', catEn: 'Electronics', name: '手持激光雷达模块', en: 'Handheld LiDAR module', price: 3299, kind: 'part', build: 'scanner' },
  { id: 'battery', shop: 'jd', cat: '数码', catEn: 'Electronics', name: '无人机电池 6S', en: '6S drone battery', price: 1150, kind: 'part', build: 'drone' },
  { id: 'printer', shop: 'jd', cat: '数码', catEn: 'Electronics', name: '桌面3D打印机', en: 'Desktop 3D printer', price: 8999, kind: 'tool', bulky: true },
  { id: 'scarf', shop: 'taobao', cat: '服饰', catEn: 'Clothing', name: '羊绒围巾 深灰', en: 'Cashmere scarf, charcoal', price: 459, kind: 'clothing' },
  { id: 'coat', shop: 'taobao', cat: '服饰', catEn: 'Clothing', name: '羊毛大衣 藏青', en: 'Wool overcoat, navy', price: 2380, kind: 'clothing' },
  { id: 'servo', shop: 'taobao', cat: '数码', catEn: 'Electronics', name: '高扭矩舵机 ×6', en: 'High-torque servos ×6', price: 864, kind: 'part', build: 'drone' },
  { id: 'lamp', shop: 'taobao', cat: '家居', catEn: 'Home', name: '落地灯 黄铜', en: 'Brass floor lamp', price: 1290, kind: 'furniture', bulky: true },
  { id: 'sofa', shop: 'taobao', cat: '家居', catEn: 'Home', name: '三人位布艺沙发', en: 'Three-seat fabric sofa', price: 6800, kind: 'furniture', bulky: true },
];
export const item = (id) => CATALOGUE.find((c) => c.id === id);

const STEPS = ['placed', 'packed', 'shipped', 'out', 'delivered'];
let seq = 0;

// when each step happens (absolute game minutes), from the shop's rhythm
export function schedule(shopId, placedAt, rnd = Math.random, { express = false } = {}) {
  const S = SHOPS[shopId], day = Math.floor(placedAt / 1440), tod = placedAt % 1440;
  let deliver;
  if (shopId === 'jd' && express && tod < S.expressUntil) {
    deliver = placedAt + S.expressMin[0] + Math.floor(rnd() * (S.expressMin[1] - S.expressMin[0]));
    const span = deliver - placedAt;
    return { placed: placedAt, packed: placedAt + 3, shipped: placedAt + 8, out: deliver - Math.round(span * 0.45), delivered: deliver };
  }
  if (shopId === 'jd') deliver = tod < S.sameDayBefore ? placedAt + S.sameDayHours * 60 + Math.floor(rnd() * 60) : (day + 1) * 1440 + S.nextMorning + Math.floor(rnd() * 90);
  else { const d = S.days[0] + Math.floor(rnd() * (S.days[1] - S.days[0] + 1)); deliver = (day + d) * 1440 + 10 * 60 + Math.floor(rnd() * 8 * 60); }
  const span = deliver - placedAt;
  return { placed: placedAt, packed: placedAt + Math.round(span * 0.12), shipped: placedAt + Math.round(span * 0.3), out: deliver - 45, delivered: deliver };
}

// when an order would arrive if placed now (for the product page)
export function eta(L, id, rnd = () => 0.5) {
  const c = item(id); return schedule(c.shop, stamp(L), rnd, { express: !!c.express }).delivered;
}

// order: { items: [catalogue ids], method, address: 'here' | 'hotel' } -> { ok, orders?, reason? }
export function placeOrder(L, { items, method = 'alipay', address = 'hotel' }, rnd = Math.random) {
  const lines = items.map(item).filter(Boolean);
  if (!lines.length) return { ok: false, reason: 'empty' };
  const byShop = {};
  for (const l of lines) (byShop[l.shop] ||= []).push(l);
  const total = lines.reduce((s, l) => s + l.price, 0);
  const r = pay(L, { method, amount: total, to: Object.keys(byShop).map((k) => SHOPS[k].name).join(' + '), memo: lines.map((l) => l.name).join('、'), kind: 'shopping' });
  if (!r.ok) return r;
  r.entry.memoEn = lines.map((l) => l.en).join(', ');
  const orders = Object.entries(byShop).map(([shop, ls]) => {
    const bulky = ls.some((l) => l.bulky), express = ls.every((l) => l.express);
    const o = {
      id: `o${stamp(L)}${(seq++).toString(36)}${Math.floor(rnd() * 1e4).toString(36)}`, shop, items: ls.map((l) => l.id), total: ls.reduce((s, l) => s + l.price, 0),
      address: bulky ? 'hotel' : address, status: 'placed', times: schedule(shop, stamp(L), rnd, { express }), express, placedAt: stamp(L),
    };
    (L.flags.orders ||= []).push(o);
    return o;
  });
  return { ok: true, orders };
}

const names = (o) => o.items.map((id) => item(id).name).join('、');
function receive(L, o, where) {
  for (const id of o.items) { const c = item(id); own(L, { kind: c.kind, id: c.id, name: c.name, en: c.en, from: SHOPS[o.shop].name, build: c.build, use: c.use, where, order: o.id }); }
}

// move orders along; returns status changes. An order to 'here' that goes out for delivery asks the
// world for a courier at the kerb (emit 'courier'); it is only delivered when he hands it over
// (handOver) or, if you never come, at the front desk once his wait is up.
export function stepOrders(L) {
  const now = stamp(L), changes = [];
  for (const o of L.flags.orders || []) {
    let i = STEPS.indexOf(o.status);
    const S = SHOPS[o.shop];
    thread(L, o.shop, { title: S.name, members: ['me', o.shop], kind: 'service' });
    while (i < STEPS.length - 1) {
      const next = STEPS[i + 1];
      // waiting at the kerb for you: not delivered until handed over or given up on
      if (next === 'delivered' && o.address === 'here' && o.status === 'out') {
        if (now >= o.waitUntil) {
          o.address = 'hotel'; o.missed = true;
          post(L, o.shop, { from: o.shop, kind: 'text', text: `联系不上您，快递已放和平饭店前台：${names(o)}` });
          emit(L, { type: 'courier-gone', order: o.id });
        } else break;
      }
      if (now < o.times[next] && !(next === 'delivered' && o.missed)) break;
      i++; o.status = next; changes.push({ order: o, status: o.status });
      if (o.status === 'packed') post(L, o.shop, { from: o.shop, kind: 'text', text: `您的订单已打包：${names(o)}` });
      if (o.status === 'shipped') post(L, o.shop, { from: o.shop, kind: 'text', text: `您的订单已发货：${names(o)}` });
      if (o.status === 'out') {
        if (o.address === 'here') {
          o.waitUntil = now + COURIER_WAIT;
          post(L, o.shop, { from: o.shop, kind: 'text', text: `快递员已到汉口路路口（Linger门口），请下楼取件：${names(o)}` });
          emit(L, { type: 'courier', order: o.id, shop: o.shop, items: o.items });
        } else post(L, o.shop, { from: o.shop, kind: 'text', text: `快递员正在派送，预计45分钟内送达：${names(o)}` });
      }
      if (o.status === 'delivered') {
        if (!o.handed) { post(L, o.shop, { from: o.shop, kind: 'text', text: `已由前台代收：${names(o)}` }); receive(L, o, 'hotel'); }
      }
    }
  }
  return changes;
}

// the courier handed it to you in person
export function handOver(L, orderId) {
  const o = (L.flags.orders || []).find((x) => x.id === orderId);
  if (!o || o.status === 'delivered') return false;
  o.status = 'delivered'; o.handed = true; o.times.delivered = stamp(L);
  receive(L, o, 'me');
  post(L, o.shop, { from: o.shop, kind: 'text', text: `已签收：${names(o)}` }, { notify: false });
  return true;
}

// things you can pick up, use, or that are waiting for you somewhere
export const withMe = (L) => L.inventory.filter((i) => i.where === 'me' || i.where == null);
export const waitingAt = (L, where) => L.inventory.filter((i) => i.where === where);
export const canUse = (L, use) => withMe(L).some((i) => i.use === use);
