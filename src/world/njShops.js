// The real shops of East Nanjing Road (南京东路步行街), placed by street number on their side of the street.
// world/nanjingRoad.js builds each one's frontage and signboard (world/shopSigns.js) and puts the right
// kind of room behind its glass (world/shopfronts.js); frontages no real shop is placed on get an invented
// shop in the street's manner. Sources and what's uncertain: docs/nanjing-road-shops.md.
//
// Numbers run from the Bund westward; even numbers on the north side (the Peace Hotel is No.20), odd on the
// south (the Swatch Art Peace Hotel, No.23). The game's street is about to scale: the blocks between the
// cross streets map onto x linearly.
//
// A shop: { zh, en, no (street number), side 'N'|'S', w (frontage, m), type (what it sells, for the room:
// see shopfronts.js ROOM_FOR), sign: { style plaque|deco|brand|letters, fg, bg, font kai|wei|song|hei,
// logo (a simple-icons path) }, blade (a vertical sign: { text, bladeStyle neon|plaque, neon }), since,
// building ({ style, up, top }: the building's look), room (force a room) }
import { siApple, siHuawei, siSamsung } from 'simple-icons';

// the blocks: street numbers to the game's x (the façade line of the east end, the cross streets' kerbs)
const BLOCKS = [
  { n0: 0, n1: 99, x0: -34, x1: -284 },        // the Bund to Sichuan Middle Road
  { n0: 100, n1: 199, x0: -296, x1: -389 },    // Sichuan to Jiangxi Middle Road
  { n0: 200, n1: 299, x0: -401, x1: -497 },    // Jiangxi to Henan Middle Road
  { n0: 300, n1: 340, x0: -513, x1: -548 },    // west of Henan Road (the map ends ~35 m on)
];
export const xForNumber = (no) => {
  const b = BLOCKS.find((k) => no <= k.n1) || BLOCKS[BLOCKS.length - 1];
  return b.x0 + (b.x1 - b.x0) * Math.min(1, Math.max(0, (no - b.n0) / (b.n1 - b.n0)));
};
const blockOf = (x) => BLOCKS.find((k) => x <= k.x0 + 0.01 && x >= k.x1 - 0.01);

export const NJ_SHOPS = [
  // ---- Jiangxi Road to Henan Road ----
  { zh: '新世界大丸百货', en: 'Shanghai New World Daimaru', no: 228, side: 'N', w: 48, type: '百货', room: 'royal_esplanade', sign: { style: 'deco', bg: '#f3efe6', fg: '#2b2b2b', font: 'song' }, building: { style: 'classic', up: 28.8, top: true } },
  { zh: '', en: 'Apple 南京东路', no: 300, side: 'N', w: 30, type: '数码', room: 'phone_shop', sign: { style: 'letters', logo: siApple.path, fg: '#f5f5f7', width: 2.0, h: 2.0 }, building: { style: 'classic', up: 25.2, top: false } },
  { zh: '宏伊国际广场', en: 'Hongyi Plaza', no: 299, side: 'S', w: 40, type: '数码', room: 'phone_shop', sign: { style: 'brand', bg: '#1428a0', logo: siSamsung.path, logoFg: '#ffffff' }, building: { style: 'deco', up: 28.8, top: false } },
  { zh: '华为全球旗舰店', en: 'Huawei Global Flagship', no: 233, side: 'S', w: 44, type: '数码', room: 'phone_shop', sign: { style: 'brand', bg: '#c7000b', logo: siHuawei.path, logoFg: '#ffffff' }, building: { style: 'deco', up: 21.6, top: true } },
];

// where each shop goes: [{ dir (1 north side, -1 south), x0, x1, shop, building }], frontages not overlapping
export function placedShops(list = NJ_SHOPS) {
  const out = [];
  for (const side of ['N', 'S']) {
    const dir = side === 'N' ? 1 : -1;
    const mine = list.filter((s) => s.side === side).map((s) => ({ s, xc: xForNumber(s.no) })).sort((a, b) => b.xc - a.xc);
    let edge = Infinity;                                     // the west end of the last one placed
    for (const { s, xc } of mine) {
      const b = blockOf(xc); if (!b) continue;
      let x1 = Math.min(xc + s.w / 2, b.x0, edge), x0 = Math.max(x1 - s.w, b.x1);
      if (x1 - x0 < Math.min(8, s.w * 0.6)) continue;        // (no room left for it)
      x1 = Math.round(x1 * 100) / 100; x0 = Math.round(x0 * 100) / 100;
      out.push({ dir, x0, x1, shop: s, building: s.building || {} });
      edge = x0;
    }
  }
  return out;
}
