// The real shops of East Nanjing Road (南京东路步行街), from the Bund to just past Henan Middle Road, where
// they stand (as of November 2026). world/nanjingRoad.js builds each one's frontage and signboard
// (world/shopSigns.js) and puts the right kind of room behind its glass (world/shopfronts.js). Frontages
// no shop is known for get an invented one in the street's manner. Sources, dates and what's uncertain:
// docs/nanjing-road-shops.md. Names and marks are their owners' trademarks.
//
// Where: d0..d1, metres west from the Bund along the street (OpenStreetMap, 2026), on side N or S (even
// numbers north: the Peace Hotel is No.20; odd south: the Swatch Art Peace Hotel, No.23). The game's
// blocks aren't all to scale (Jiangxi to Henan Road is 160 m on the ground, 96 m here), so distances map
// block by block.
//
// A shop: { zh, en, side, d0, d1, type (what it sells: picks the room, shopfronts.js ROOM_FOR), sign
// ({ style plaque|deco|brand|letters, fg, bg, font kai|wei|song|hei, logo (simple-icons path), width,
// h, at }), blade ({ text, bladeStyle plaque|neon, neon }), since, more (further signboards on the same
// building: [{ d, zh, en, sign }]), building ({ style, up, top }), front ({ top }: a taller glass front),
// room (force a room) }
import { siApple, siHuawei, siSamsung, siStarbucks, siAdidas, siNewbalance, siJordan } from 'simple-icons';

// real metres from the Bund -> the game's x (block edges: the Bund, Sichuan, Jiangxi and Henan Roads' kerbs)
const KNOTS = [[0, -34], [196, -284], [212, -296], [318, -389], [334, -401], [486, -497], [498, -513], [533, -548]];
export function xForMetres(d) {
  for (let i = 1; i < KNOTS.length; i++) {
    const [d0, x0] = KNOTS[i - 1], [d1, x1] = KNOTS[i];
    if (d <= d1 || i === KNOTS.length - 1) return x0 + (x1 - x0) * Math.min(1, Math.max(0, (d - d0) / (d1 - d0)));
  }
  return KNOTS[0][1];
}
// the street's blocks in game x (east end, west end)
const BLOCKS = [[-84, -284], [-296, -389], [-401, -492], [-518, -550]];   // (world/nanjingRoad.js's runs: Henan Road's corner buildings face Henan Road)

const S = (o) => o;   // (a shop)
export const NJ_SHOPS = [
  // ---- the Bund to Sichuan Middle Road ----
  // south: the rest of the Swatch Art Peace Hotel's ground floor (the old Palace Hotel, red brick and white bands), then
  // the shops of the 1990s blocks to the Jialing Building on the Sichuan Road corner
  S({ zh: '', en: 'BLANCPAIN', side: 'S', d0: 40, d1: 70, type: '钟表', sign: { style: 'letters', board: '#141414', font: 'song', fg: '#e7d6a8', width: 7.5 }, more: [{ d: 79, en: 'swatch', zh: '', sign: { style: 'brand', bg: '#ffffff', fg: '#e30613', width: 5 } }], building: { style: 'brick', up: 16.2, top: true } }),
  S({ zh: '穗月有礼', en: 'Shanghai gifts', side: 'S', d0: 110, d1: 117, type: '纪念品', sign: { style: 'plaque', bg: '#5e0f12', font: 'kai' } }),
  S({ zh: '雪羽の茶', en: 'Xueyu Tea', side: 'S', d0: 117, d1: 124, type: '咖啡', sign: { style: 'brand', bg: '#f4f1ea', fg: '#2f4a3a', font: 'wei' } }),
  S({ zh: '名创优品', en: 'MINISO', side: 'S', d0: 126, d1: 140, type: '纪念品', room: 'decor_shop', sign: { style: 'brand', bg: '#e8112d', fg: '#ffffff' } }),
  S({ zh: '中信银行', en: 'CHINA CITIC BANK', side: 'S', d0: 148, d1: 162, type: 'bank', room: 'royal_esplanade', sign: { style: 'brand', bg: '#c8102e', fg: '#ffffff' } }),
  S({ zh: '中国工商银行', en: 'ICBC', side: 'S', d0: 172, d1: 196, type: 'bank', room: 'royal_esplanade', sign: { style: 'brand', bg: '#c7000b', fg: '#ffffff' }, building: { style: 'classic', up: 21.6, top: true } }),
  // north: past the Peace Hotel, the Metropolo hotel, and the Whiteaway Laidlaw building (惠罗公司, 1906) on the corner
  S({ zh: '锦江都城经典酒店', en: 'METROPOLO JINJIANG', side: 'N', d0: 152, d1: 170, type: 'hotel', room: 'royal_esplanade', sign: { style: 'deco', bg: '#3b1a20', fg: '#f1e4d0', font: 'song' } }),
  S({ zh: '惠罗公司', en: 'WHITEAWAY LAIDLAW · SINCE 1906', side: 'N', d0: 170, d1: 196, type: '丝绸', since: '1906', sign: { style: 'deco', bg: '#1a1714', fg: '#d9b45f', font: 'song' }, building: { style: 'deco', up: 18, top: true } }),

  // ---- Sichuan to Jiangxi Middle Road ----
  // north: the Fu Li Building (慈安里大楼) on the Sichuan Road corner with the musical instrument factory's shop,
  // then POLO Sport, Taikang Food (泰康食品, a century-old food shop), Anta in the Ci Chang Li building on the Jiangxi corner
  S({ zh: '上海民族乐器一厂', en: 'Shanghai No.1 National Musical Instruments Factory', side: 'N', d0: 212, d1: 262, type: '工艺美术', since: '1958', sign: { style: 'plaque', bg: '#111010', font: 'kai' }, blade: { text: '民族乐器', bladeStyle: 'plaque' }, building: { style: 'classic', up: 14.4, top: true } }),
  S({ zh: '', en: 'POLO SPORT', side: 'N', d0: 284, d1: 295, type: '时装', sign: { style: 'brand', bg: '#0b2545', fg: '#ffffff', font: 'song' } }),
  S({ zh: '泰康食品', en: 'TAIKANG FOOD', side: 'N', d0: 295, d1: 303, type: '食品', room: 'comfy_cafe', since: '百年老字号', sign: { style: 'plaque', bg: '#2b2b2b', font: 'wei' }, blade: { text: '泰康食品', bladeStyle: 'plaque' } }),
  S({ zh: '安踏', en: 'ANTA', side: 'N', d0: 303, d1: 318, type: '运动', sign: { style: 'brand', bg: '#d7000f', fg: '#ffffff' }, building: { style: 'arched', up: 14.4, top: false } }),
  // south: the Central Arcade (中央商场, now Bund Central): Peet's, New Balance, Shen Dacheng's pastries, Jordan;
  // Jazz at Lincoln Center at No.139 with the Bright bakery; the Meilun Building on the Jiangxi corner
  S({ zh: '', en: "Peet's Coffee", side: 'S', d0: 212, d1: 228, type: '咖啡', sign: { style: 'brand', bg: '#3a1f17', fg: '#f3e6d1', font: 'song' } }),
  S({ zh: '', en: 'new balance', side: 'S', d0: 228, d1: 246, type: '运动', sign: { style: 'brand', bg: '#2a2a2c', fg: '#ffffff', logo: siNewbalance.path, logoFg: '#cf0a2c' } }),
  S({ zh: '沈大成', en: 'SHEN DA CHENG · 1875', side: 'S', d0: 246, d1: 256, type: '糕团', since: '1875', sign: { style: 'plaque', bg: '#141010', font: 'kai' }, blade: { text: '沈大成点心', bladeStyle: 'plaque' } }),
  S({ zh: '', en: 'JORDAN 139 NANDONG', side: 'S', d0: 268, d1: 284, type: '运动', sign: { style: 'letters', board: '#141414', fg: '#ffffff', logo: siJordan.path, width: 7 } }),
  S({ zh: '林肯爵士乐上海中心', en: 'JAZZ AT LINCOLN CENTER SHANGHAI', side: 'S', d0: 284, d1: 296, type: 'jazz', room: 'warm_restaurant', sign: { style: 'deco', bg: '#0c0c0d', fg: '#f4f4f4', font: 'song' } }),
  S({ zh: '光明悠焙', en: 'BRIGHT BAKERY', side: 'S', d0: 296, d1: 304, type: '糕团', sign: { style: 'brand', bg: '#f6efe3', fg: '#1d4f91', font: 'hei' } }),
  S({ zh: '', en: 'BOY LONDON', side: 'S', d0: 304, d1: 318, type: '时装', sign: { style: 'brand', bg: '#0d0d0d', fg: '#ffffff', font: 'song' }, building: { style: 'deco', up: 18, top: true } }),

  // ---- Jiangxi to Henan Middle Road ----
  // north: the whole block is the New World department store (新世界大丸 until 2026, now 新世界新丸中心 NEW ONE),
  // its ground floor Rolex (Prime Time), Gucci and Dolce & Gabbana
  S({ zh: '上海新世界新丸中心', en: 'NEW ONE', side: 'N', d0: 334, d1: 486, type: '百货', room: 'royal_esplanade', sign: { style: 'deco', bg: '#efe8da', fg: '#2b2b2b', font: 'song', width: 13, at: 402 },
    more: [{ d: 372, en: 'PRIME TIME · ROLEX', zh: '', sign: { style: 'letters', board: '#141414', font: 'song', fg: '#d8c58f', width: 7 } }, { d: 450, en: 'GUCCI', zh: '', sign: { style: 'letters', board: '#141414', font: 'song', fg: '#f2efe8', width: 5 } }, { d: 470, en: 'DOLCE & GABBANA', zh: '', sign: { style: 'letters', board: '#141414', font: 'song', fg: '#f2efe8', width: 7 } }],
    building: { style: 'classic', up: 28.8, top: true } }),
  // south: the East China Electric Power Building, now The Shanghai EDITION hotel; then the Nanjing Building (南京大楼,
  // 1935; once 老介福's) on the Henan corner: Starbucks, adidas and Huawei's global flagship
  S({ zh: '', en: 'THE SHANGHAI EDITION', side: 'S', d0: 334, d1: 410, type: 'hotel', room: 'royal_esplanade', sign: { style: 'letters', board: '#141414', font: 'song', fg: '#f3f0ea', width: 9, at: 399 }, building: { style: 'deco', up: 32.4, top: true } }),
  S({ zh: '华为', en: 'HUAWEI', side: 'S', d0: 410, d1: 486, type: '数码', room: 'phone_shop', sign: { style: 'letters', board: '#141414', fg: '#ffffff', logo: siHuawei.path, width: 7, at: 470 },
    more: [{ d: 421, zh: '星巴克', en: 'STARBUCKS', sign: { style: 'brand', bg: '#00704a', fg: '#ffffff', logo: siStarbucks.path, logoFg: '#ffffff', width: 6 } }, { d: 440, zh: '', en: 'adidas', sign: { style: 'letters', board: '#141414', fg: '#ffffff', logo: siAdidas.path, width: 5 } }],
    building: { style: 'deco', up: 25.2, top: true } }),

  // ---- west of Henan Road (the map runs ~35 m on) ----
  // north: Apple Nanjing East in the Henderson Metropolitan building (恒基名人购物中心), its glass wall and logo; Puma on the corner
  S({ zh: '', en: 'Apple 南京东路', side: 'N', d0: 498, d1: 533, type: '数码', room: 'phone_shop', sign: { style: 'letters', logo: siApple.path, fg: '#f5f5f7', width: 2.2, h: 2.2, at: 520 }, front: { top: 9.6 }, building: { style: 'deco', up: 25.2, top: false } }),
  // south: Hongyi Plaza (宏伊国际广场) with the Samsung store facing Apple, and Pop Mart
  S({ zh: '宏伊国际广场', en: 'HONGYI PLAZA', side: 'S', d0: 498, d1: 533, type: '数码', room: 'phone_shop', sign: { style: 'deco', bg: '#22262c', fg: '#f2f2f2', font: 'song', width: 8, at: 505 },
    more: [{ d: 522, zh: '', en: 'SAMSUNG', sign: { style: 'letters', board: '#141414', fg: '#ffffff', logo: siSamsung.path, width: 6 } }],
    building: { style: 'deco', up: 28.8, top: false } }),
];

// where each shop goes: [{ dir (1: north side, -1: south), x0, x1, shop, building }], frontages not overlapping
export function placedShops(list = NJ_SHOPS) {
  const out = [];
  for (const side of ['N', 'S']) {
    const dir = side === 'N' ? 1 : -1;
    const mine = list.filter((s) => s.side === side).map((s) => ({ s, xa: xForMetres(s.d0), xb: xForMetres(s.d1) })).sort((a, b) => b.xa - a.xa);
    let edge = Infinity;
    for (const { s, xa, xb } of mine) {
      const blk = BLOCKS.find((b) => (xa + xb) / 2 <= b[0] + 0.01 && (xa + xb) / 2 >= b[1] - 0.01); if (!blk) continue;
      const x1 = Math.round(Math.min(xa, blk[0], edge) * 100) / 100, x0 = Math.round(Math.max(xb, blk[1]) * 100) / 100;
      if (x1 - x0 < 4) continue;
      // further signboards: their x
      const more = (s.more || []).map((m) => ({ ...m, x: xForMetres(m.d) }));
      out.push({ dir, x0, x1, shop: { ...s, signAt: s.sign && s.sign.at != null ? xForMetres(s.sign.at) : null, more }, building: s.building || {} });
      edge = x0;
    }
  }
  return out;
}
