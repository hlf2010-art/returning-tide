// The marks of the services and shops in the game's Shanghai. Every brand here is invented for the game, in the
// manner of the real thing it stands in for: Xinyu 信语 (chat and pay), YiPay 易付, Wanji 万集 and Jingsong 鲸送
// (shopping), Kuaima 快马 (ride-hailing), Linger (the coffee on Hankou Road), Harbour Coffee 港湾咖啡, Shenjiang
// Bank 申江银行, YinTong 银通 (the card network), and a plain circled M for the metro. The glyphs are simple
// shapes drawn for the game (24 x 24 paths); the slugs are the old ones, so callers don't change.
const G = (title, path) => ({ title, path });
const SI = {
  wechat: G('Xinyu', 'M8 3h8a6 6 0 0 1 6 6v3a6 6 0 0 1-6 6h-5.5l-5 3.6 1-4.3A6 6 0 0 1 2 12V9a6 6 0 0 1 6-6zM6.5 8.2v2l5.5 4 5.5-4v-2l-5.5 4z'),   // one bubble with a letter's fold (信, a letter)
  alipay: G('YiPay', 'M12 1a11 11 0 1 0 0 22 11 11 0 0 0 0-22zm4.6 5-3.3 5.2H16v1.6h-3v1.6h3v1.6h-3V19h-2v-3H8v-1.6h3v-1.6H8v-1.6h2.7L7.4 6h2.3L12 9.9 14.3 6z'),
  taobao: G('Wanji', 'M7 7V6a5 5 0 0 1 10 0v1h3l1 15H3L4 7zm2 0h6V6a3 3 0 0 0-6 0z'),
  starbucks: G('Harbour Coffee', 'M12 1a11 11 0 1 0 0 22 11 11 0 0 0 0-22zm0 2a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM5.5 9.2c1.1-.9 2.1-.9 3.2 0s2.1.9 3.3 0 2.1-.9 3.3 0 2.1.9 3.2 0v1.6c-1.1.9-2.1.9-3.2 0s-2.2-.9-3.3 0-2.2.9-3.3 0-2.1-.9-3.2 0zm0 4c1.1-.9 2.1-.9 3.2 0s2.1.9 3.3 0 2.1-.9 3.3 0 2.1.9 3.2 0v1.6c-1.1.9-2.1.9-3.2 0s-2.2-.9-3.3 0-2.2.9-3.3 0-2.1-.9-3.2 0z'),
  applepay: G('Phone pay', 'M8 1h8a2 2 0 0 1 2 2v18a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2zm0 3v15h8V4zm3 16.2v1.3h2v-1.3z'),
  visa: G('Card', 'M2 5h20v14H2zm0 3v3h20V8zm2 7v1.5h6V15z'),
  mastercard: G('Card', 'M2 5h20v14H2zm0 3v3h20V8zm2 7v1.5h6V15z'),
  shanghaimetro: G('Metro', 'M12 1a11 11 0 1 0 0 22 11 11 0 0 0 0-22zM6 17V7h2.2L12 12.4 15.8 7H18v10h-2.2v-6.4L12 15.8l-3.8-5.2V17z'),
  hsbc: G('Shenjiang Bank', 'M12 2 21 7v10l-9 5-9-5V7zm0 4-5 3v6l5 3 5-3V9z'),
};
export const BRAND_COLOR = { wechat: '#13A39C', alipay: '#2A6DF4', taobao: '#F2672A', jd: '#3B7DD8', didi: '#F5A623', manner: '#1d1d1f', starbucks: '#1E5C4F', corvina: '#B6A272', unionpay: '#B02A37', cmb: '#1F4E79' };

// <svg> of a mark (24 x 24 viewBox), in a colour
export function mark(slug, color = '#fff', size = 26) {
  const i = SI[slug]; if (!i) return '';
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" role="img" aria-label="${i.title}"><path d="${i.path}" fill="${color}" fill-rule="evenodd"/></svg>`;
}
// a wordmark for brands without a vector mark here
const WORD = {
  didi: '<span class="wm didi">快马</span>',
  jd: '<span class="wm jd">鲸送</span>',
  manner: '<span class="wm manner">LINGER</span>',
  unionpay: '<span class="wm up">银通</span>',
  cmb: '<span class="wm cmb">申江银行</span>',
};
// the app tile's glyph: the real mark if there is one, the wordmark otherwise
export const appGlyph = (slug, size = 30) => (SI[slug] ? mark(slug, '#fff', size) : WORD[slug] || '');
// a payment method's little logo (the pay sheet, the wallet)
export function payLogo(method, size = 18) {
  if (method === 'wechat') return `<span class="paylogo" style="background:${BRAND_COLOR.wechat}">${mark('wechat', '#fff', size)}</span>`;
  if (method === 'alipay') return `<span class="paylogo" style="background:${BRAND_COLOR.alipay}">${mark('alipay', '#fff', size)}</span>`;
  if (method === 'card') return `<span class="paylogo" style="background:#1a1f71">${mark('visa', '#fff', size)}</span>`;
  if (method === 'bank') return `<span class="paylogo" style="background:${BRAND_COLOR.cmb}"><span class="wm cmb" style="font-size:${Math.round(size * 0.5)}px">申江</span></span>`;
  return '';
}
// a mark drawn into a canvas (for textures in the world): slug, colour, background
export function markCanvas(slug, { color = '#fff', bg = null, size = 256, pad = 0.14 } = {}) {
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
  if (bg) { x.fillStyle = bg; x.fillRect(0, 0, size, size); }
  const i = SI[slug];
  if (i) { const p = new Path2D(i.path); const s = (size * (1 - 2 * pad)) / 24; x.translate(size * pad, size * pad); x.scale(s, s); x.fillStyle = color; x.fill(p); }
  return c;
}
// a maker's wordmark across the tail: the cars in traffic are lookalikes of no real maker, so they carry invented
// names (the taxi a plain 出租)
export const CAR_BADGE = { 'nio-et5': 'AURAE', 'li-l9': 'KUNLUN', 'aito-m9': 'TIANHENG', 'luxeed-r7': 'QINGYUN', taxi: '出租', sedan: null };
