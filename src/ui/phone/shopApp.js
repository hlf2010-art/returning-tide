// The phone's 京东 JD and 淘宝 Taobao apps (one module, two storefronts): browse, a product page with
// a real delivery estimate and where it should go, pay through the shared sheet, and an orders page
// that follows each parcel. Plain coloured tiles and the shops' names as text; no logos, no copied UI.
// The bookkeeping is engine/shopping.js; the courier at the kerb is world/courier.js.
import { CATALOGUE, SHOPS, ADDRESSES, item, eta, placeOrder, withMe, waitingAt } from '../../engine/shopping.js';
import { stamp, clockText } from '../../engine/life.js';

const STEP_NAMES = { placed: ['已下单', 'Ordered'], packed: ['已打包', 'Packed'], shipped: ['运输中', 'On its way'], out: ['派送中', 'Out for delivery'], delivered: ['已送达', 'Delivered'] };
const STEPS = ['placed', 'packed', 'shipped', 'out', 'delivered'];
const GLYPH = { umbrella: '☂', gadget: '◉', gift: '❦', home: '⌂', part: '⚙', tool: '▣', clothing: '⧉', furniture: '▭' };
const WEEK_ZH = ['日', '一', '二', '三', '四', '五', '六'], WEEK_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function createShopApp({ L, Z, esc, yuan, go, render, top, openSheet }) {
  // "today 19:40" / "tomorrow 09:50" / "Mon 16 Nov"
  function when(at) {
    const l = L(), dd = Math.floor(at / 1440) - l.clock.day, t = clockText(at);
    if (dd <= 0) return Z(`今天 ${t}`, `today ${t}`);
    if (dd === 1) return Z(`明天 ${t}`, `tomorrow ${t}`);
    const d = new Date(2026, 10, 14 + (Math.floor(at / 1440) - 1));
    return Z(`${d.getMonth() + 1}月${d.getDate()}日（周${WEEK_ZH[d.getDay()]}）`, `${WEEK_EN[d.getDay()]} ${d.getDate()} Nov`);
  }
  const nameOf = (c) => Z(c.name, c.en);
  const tile = (c, big = false) => `<div class="pimg ${big ? 'big' : ''}" style="--c:${SHOPS[c.shop].color}">${GLYPH[c.kind] || '▢'}</div>`;
  const head = (shop, title, extra = '') => `<div class="bar shopbar" style="--c:${SHOPS[shop].color}"><span class="back" data-act="back">‹</span>${title}${extra}</div>`;

  function shopView(l, t) {
    const shop = t.shop, S = SHOPS[shop];
    if (l.threads[shop]) l.threads[shop].unread = 0;
    const list = CATALOGUE.filter((c) => c.shop === shop).map((c) => {
      const at = eta(l, c.id), fast = c.express && at - stamp(l) < 60;
      return `<div class="prow" data-act="product" data-id="${c.id}">${tile(c)}<div class="mid"><div class="n">${esc(nameOf(c))}</div>
        <div class="pv">${fast ? `<span class="fast">${Z('秒送', 'Express')}</span>` : ''}${esc(Z(`预计${when(at)}送达`, `Arrives ${when(at)}`))}</div></div><div class="pr">¥${c.price.toLocaleString('en-US')}</div></div>`;
    }).join('');
    const n = (l.flags.orders || []).filter((o) => o.shop === shop && o.status !== 'delivered').length;
    return `<div class="view shop">${head(shop, Z(S.name, S.en), `<span class="orders-btn" data-act="orders" data-id="${shop}">${Z('订单', 'Orders')}${n ? ` · ${n}` : ''}</span>`)}<div class="scroll">${list}</div></div>`;
  }

  function productView(l, t) {
    const c = item(t.id), S = SHOPS[c.shop], at = eta(l, c.id);
    if (t.address == null) t.address = c.bulky ? 'hotel' : 'here';
    const addr = (k) => `<button class="${t.address === k ? 'on' : ''}" data-act="addr" data-id="${k}" ${c.bulky && k === 'here' ? 'disabled' : ''}>${esc(Z(ADDRESSES[k].zh, ADDRESSES[k].en))}</button>`;
    return `<div class="view shop">${head(c.shop, Z(S.name, S.en))}<div class="scroll product">
      ${tile(c, true)}<div class="pname">${esc(nameOf(c))}</div><div class="pprice">¥${c.price.toLocaleString('en-US')}</div>
      <div class="pmeta">${esc(Z(c.cat, c.catEn))}</div>
      <div class="pdel">${c.express && at - stamp(l) < 60 ? `<span class="fast">${Z('秒送', 'Express')}</span>` : ''}${esc(Z(`现在下单，预计${when(at)}送达`, `Order now: arrives ${when(at)}`))}</div>
      <div class="plabel">${Z('送到', 'Deliver to')}</div><div class="addr">${addr('here')}${addr('hotel')}</div>
      ${c.bulky ? `<div class="pnote">${Z('大件商品由酒店前台代收', 'Large items go to the hotel front desk')}</div>` : t.address === 'here' ? `<div class="pnote">${Z('快递员到了会在汉口路路口等你，记得下来取', 'The courier will wait for you at the Hankou Road corner. Go down and collect it')}</div>` : ''}
      <button class="btn go buy" data-act="buy" data-id="${c.id}">${Z('立即购买', 'Buy now')}</button></div></div>`;
  }

  function ordersView(l, t) {
    const shop = t.id;
    for (const k of shop ? [shop] : Object.keys(SHOPS)) if (l.threads[k]) l.threads[k].unread = 0;   // seen
    const rows = (l.flags.orders || []).filter((o) => !shop || o.shop === shop).slice().reverse().map((o) => {
      const k = STEPS.indexOf(o.status), names = o.items.map((id) => nameOf(item(id))).join(Z('、', ', '));
      const note = o.status === 'out' && o.address === 'here' ? Z(`快递员在汉口路路口等你（${clockText(o.waitUntil)}前）`, `Your courier is waiting at the Hankou Road corner (until ${clockText(o.waitUntil)})`)
        : o.status === 'delivered' ? (o.handed ? Z('已当面签收', 'Handed to you') : Z('在和平饭店前台', 'At the Peace Hotel front desk'))
          : Z(`预计${when(o.times.delivered)}送达`, `Arrives ${when(o.times.delivered)}`);
      return `<div class="order"><div class="on">${esc(names)}<span class="ot">¥${o.total.toLocaleString('en-US')}</span></div>
        <div class="track">${STEPS.map((s, i) => `<i class="${i <= k ? 'done' : ''}"></i>`).join('')}</div>
        <div class="os"><b>${Z(...STEP_NAMES[o.status])}</b> · ${esc(note)}</div></div>`;
    }).join('') || `<div class="pnote" style="padding:20px">${Z('还没有订单', 'No orders yet')}</div>`;
    const things = (list) => list.map((i) => `<span class="thing">${esc(Z(i.name, i.en))}</span>`).join('');
    const mine = withMe(l), desk = waitingAt(l, 'hotel');
    return `<div class="view shop">${head(shop || 'jd', Z('我的订单', 'My orders'))}<div class="scroll">${rows}
      ${mine.length ? `<div class="plabel">${Z('随身', 'With you')}</div><div class="things">${things(mine)}</div>` : ''}
      ${desk.length ? `<div class="plabel">${Z('和平饭店前台代收', 'Waiting at the Peace Hotel front desk')}</div><div class="things">${things(desk)}</div>` : ''}</div></div>`;
  }

  // taps inside these views; returns true when handled
  function act(a, id) {
    const t = top();
    if (a === 'product') { go('product', { id }); return true; }
    if (a === 'orders') { go('orders', { id }); return true; }
    if (a === 'addr') { t.address = id; render(); return true; }
    if (a === 'buy') {
      const c = item(id), address = t.address;
      openSheet({
        to: Z(SHOPS[c.shop].name, SHOPS[c.shop].en), amount: c.price, memo: c.name, memoEn: c.en, method: 'alipay',
        run: (method) => {
          const r = placeOrder(L(), { items: [c.id], method, address });
          if (r.ok) { go('orders', { id: c.shop }); }
          return r;
        },
      });
      return true;
    }
    return false;
  }
  return { views: { shop: shopView, product: productView, orders: ordersView }, act };
}
