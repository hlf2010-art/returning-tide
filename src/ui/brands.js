// Real brands' marks, where the thing really is that brand: the apps on your phone, how you pay,
// the cars. Vector marks from Simple Icons (CC0 data; the marks themselves belong to their owners;
// this is a private, non-commercial build). Brands Simple Icons doesn't carry (DiDi, JD, NIO, Li Auto,
// AITO, UnionPay, China Merchants Bank, Manner) appear as their own name in their own colours,
// a wordmark, not an invented symbol.
import { siWechat, siAlipay, siTaobao, siStarbucks, siLamborghini, siApplepay, siVisa, siMastercard, siShanghaimetro, siHsbc } from 'simple-icons';

const SI = { wechat: siWechat, alipay: siAlipay, taobao: siTaobao, starbucks: siStarbucks, lamborghini: siLamborghini, applepay: siApplepay, visa: siVisa, mastercard: siMastercard, shanghaimetro: siShanghaimetro, hsbc: siHsbc };
export const BRAND_COLOR = { wechat: '#07C160', alipay: '#1677FF', taobao: '#FF5000', jd: '#E1251B', didi: '#FF7A00', manner: '#111111', starbucks: '#006241', lamborghini: '#B6A272', unionpay: '#E21836', cmb: '#C8102E' };

// <svg> of a Simple Icons mark (24 x 24 viewBox), in a colour
export function mark(slug, color = '#fff', size = 26) {
  const i = SI[slug]; if (!i) return '';
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" role="img" aria-label="${i.title}"><path d="${i.path}" fill="${color}"/></svg>`;
}
// a wordmark for brands without a vector mark here
const WORD = {
  didi: '<span class="wm didi">DiDi</span>',
  jd: '<span class="wm jd">JD</span>',
  manner: '<span class="wm manner">MANNER</span>',
  unionpay: '<span class="wm up">银联</span>',
  cmb: '<span class="wm cmb">招商银行</span>',
};
// the app tile's glyph: the real mark if there is one, the wordmark otherwise
export const appGlyph = (slug, size = 30) => (SI[slug] ? mark(slug, '#fff', size) : WORD[slug] || '');
// a payment method's little logo (the pay sheet, the wallet)
export function payLogo(method, size = 18) {
  if (method === 'wechat') return `<span class="pl" style="background:${BRAND_COLOR.wechat}">${mark('wechat', '#fff', size)}</span>`;
  if (method === 'alipay') return `<span class="pl" style="background:${BRAND_COLOR.alipay}">${mark('alipay', '#fff', size)}</span>`;
  if (method === 'card') return `<span class="pl" style="background:#1a1f71">${mark('visa', '#fff', size)}</span>`;
  if (method === 'bank') return `<span class="pl" style="background:${BRAND_COLOR.cmb}"><span class="wm cmb" style="font-size:${Math.round(size * 0.5)}px">招行</span></span>`;
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
// a car maker's badge as it reads on the car (wordmarks; the Huracán's own model carries its badges)
export const CAR_BADGE = { 'nio-et5': 'NIO', 'li-l9': 'LI', 'aito-m9': 'AITO', 'luxeed-r7': 'LUXEED', taxi: '大众出租', sedan: null };
