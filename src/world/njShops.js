// The real shops of East Nanjing Road (南京东路步行街), from the Bund to just past Henan Middle Road, where
// they stand (as of November 2026). world/nanjingRoad.js builds each one's frontage and signboard
// (world/shopSigns.js) and puts the right kind of room behind its glass (world/shopfronts.js). Frontages
// no shop is known for get an invented one in the street's manner. Sources, dates and what's uncertain:
// docs/nanjing-road-shops.md. The modern chains, banks and hotels appear under invented names and no shop shows a real logo; the
// old-established Chinese shops (老字号) keep their names in plain lettering.
//
// Where: d0..d1, metres west from the Bund along the street (OpenStreetMap, 2026), on side N or S (even
// numbers north: the Peace Hotel is No.20; odd south: the Swatch Art Peace Hotel, No.23). The game's
// blocks aren't all to scale (Jiangxi to Henan Road is 160 m on the ground, 96 m here), so distances map
// block by block.
//
// A shop: { zh, en, side, d0, d1, type (what it sells: picks the room, shopfronts.js ROOM_FOR), sign
// ({ style plaque|deco|brand|letters, fg, bg, font kai|wei|song|hei, logo (a 24 x 24 SVG path; none of the shops uses one now), width,
// h, at }), blade ({ text, bladeStyle plaque|neon, neon }), since, more (further signboards on the same
// building: [{ d, zh, en, sign }]), building ({ style, up, top }), front ({ top }: a taller glass front),
// room (force a room) }
import { njRuns } from './layout.js';

// real metres from the Bund -> the game's x (block edges: the Bund, Sichuan, Jiangxi and Henan Roads' kerbs)
const KNOTS = [[0, -34], [196, -284], [212, -296], [318, -389], [334, -401], [486, -497], [498, -513], [1511, -1526]];   // (west of Henan Road at full scale, to Xizang Road's kerb)
export function xForMetres(d) {
  for (let i = 1; i < KNOTS.length; i++) {
    const [d0, x0] = KNOTS[i - 1], [d1, x1] = KNOTS[i];
    if (d <= d1 || i === KNOTS.length - 1) return x0 + (x1 - x0) * Math.min(1, Math.max(0, (d - d0) / (d1 - d0)));
  }
  return KNOTS[0][1];
}
// the street's blocks in game x (east end, west end)

const S = (o) => o;   // (a shop)
export const NJ_SHOPS = [
  // ---- the Bund to Sichuan Middle Road ----
  // south: the rest of the Swatch Art Peace Hotel's ground floor (the old Palace Hotel, red brick and white bands), then
  // the shops of the 1990s blocks to the Jialing Building on the Sichuan Road corner
  S({ zh: '', en: 'MONTVAL', side: 'S', d0: 40, d1: 70, type: '钟表', sign: { style: 'letters', board: '#141414', font: 'song', fg: '#e7d6a8', width: 7.5 }, more: [{ d: 79, en: 'tick', zh: '', sign: { style: 'brand', bg: '#ffffff', fg: '#e30613', width: 5 } }], building: { style: 'brick', up: 16.2, top: true } }),
  S({ zh: '沪礼', en: 'Shanghai gifts', side: 'S', d0: 110, d1: 117, type: '纪念品', sign: { style: 'plaque', bg: '#5e0f12', font: 'kai' } }),
  S({ zh: '云羽茶', en: 'Yunyu Tea', side: 'S', d0: 117, d1: 124, type: '咖啡', sign: { style: 'brand', bg: '#f4f1ea', fg: '#2f4a3a', font: 'wei' } }),
  S({ zh: '小物所', en: 'LITTLE THINGS', side: 'S', d0: 126, d1: 140, type: '纪念品', room: 'decor_shop', sign: { style: 'brand', bg: '#e8112d', fg: '#ffffff' } }),
  S({ zh: '江海银行', en: 'JIANGHAI BANK', side: 'S', d0: 148, d1: 162, type: 'bank', room: 'royal_esplanade', sign: { style: 'brand', bg: '#c8102e', fg: '#ffffff' } }),
  S({ zh: '东方实业银行', en: 'ORIENT INDUSTRIAL BANK', side: 'S', d0: 172, d1: 196, type: 'bank', room: 'royal_esplanade', sign: { style: 'brand', bg: '#c7000b', fg: '#ffffff' }, building: { style: 'classic', up: 21.6, top: true } }),
  // north: past the Peace Hotel, the Metropolo hotel, and the Whiteaway Laidlaw building (惠罗公司, 1906) on the corner
  S({ zh: '外滩都城酒店', en: 'BUND CITY HOTEL', side: 'N', d0: 152, d1: 170, type: 'hotel', room: 'royal_esplanade', sign: { style: 'deco', bg: '#3b1a20', fg: '#f1e4d0', font: 'song' } }),
  S({ zh: '惠罗公司', en: 'WHITEAWAY LAIDLAW · SINCE 1906', side: 'N', d0: 170, d1: 196, type: '丝绸', since: '1906', sign: { style: 'deco', bg: '#1a1714', fg: '#d9b45f', font: 'song' }, building: { style: 'deco', up: 18, top: true } }),

  // ---- Sichuan to Jiangxi Middle Road ----
  // north: the Fu Li Building (慈安里大楼) on the Sichuan Road corner with the musical instrument factory's shop,
  // then POLO Sport, Taikang Food (泰康食品, a century-old food shop), Anta in the Ci Chang Li building on the Jiangxi corner
  S({ zh: '上海民族乐器一厂', en: 'Shanghai No.1 National Musical Instruments Factory', side: 'N', d0: 212, d1: 262, type: '工艺美术', since: '1958', sign: { style: 'plaque', bg: '#111010', font: 'kai' }, blade: { text: '民族乐器', bladeStyle: 'plaque' }, building: { style: 'classic', up: 14.4, top: true } }),
  S({ zh: '', en: 'FIELD SPORT', side: 'N', d0: 284, d1: 295, type: '时装', sign: { style: 'brand', bg: '#0b2545', fg: '#ffffff', font: 'song' } }),
  S({ zh: '泰康食品', en: 'TAIKANG FOOD', side: 'N', d0: 295, d1: 303, type: '食品', room: 'comfy_cafe', since: '百年老字号', sign: { style: 'plaque', bg: '#2b2b2b', font: 'wei' }, blade: { text: '泰康食品', bladeStyle: 'plaque' } }),
  S({ zh: '跃动', en: 'YUEDONG', side: 'N', d0: 303, d1: 318, type: '运动', sign: { style: 'brand', bg: '#d7000f', fg: '#ffffff' }, building: { style: 'arched', up: 14.4, top: false } }),
  // south: the Central Arcade (中央商场, now Bund Central): Peet's, New Balance, Shen Dacheng's pastries, Jordan;
  // Jazz at Lincoln Center at No.139 with the Bright bakery; the Meilun Building on the Jiangxi corner
  S({ zh: '', en: 'Pier Coffee', side: 'S', d0: 212, d1: 228, type: '咖啡', sign: { style: 'brand', bg: '#3a1f17', fg: '#f3e6d1', font: 'song' } }),
  S({ zh: '', en: 'true step', side: 'S', d0: 228, d1: 246, type: '运动', sign: { style: 'brand', bg: '#2a2a2c', fg: '#ffffff', logoFg: '#cf0a2c' } }),
  S({ zh: '沈大成', en: 'SHEN DA CHENG · 1875', side: 'S', d0: 246, d1: 256, type: '糕团', since: '1875', sign: { style: 'plaque', bg: '#141010', font: 'kai' }, blade: { text: '沈大成点心', bladeStyle: 'plaque' } }),
  S({ zh: '', en: 'HIGH JUMP 139 NANDONG', side: 'S', d0: 268, d1: 284, type: '运动', sign: { style: 'letters', board: '#141414', fg: '#ffffff', width: 7 } }),
  S({ zh: '外滩爵士乐中心', en: 'BUND JAZZ CENTRE', side: 'S', d0: 284, d1: 296, type: 'jazz', room: 'warm_restaurant', sign: { style: 'deco', bg: '#0c0c0d', fg: '#f4f4f4', font: 'song' } }),
  S({ zh: '晨光悠焙', en: 'MORNING BAKERY', side: 'S', d0: 296, d1: 304, type: '糕团', sign: { style: 'brand', bg: '#f6efe3', fg: '#1d4f91', font: 'hei' } }),
  S({ zh: '', en: 'KID SOHO', side: 'S', d0: 304, d1: 318, type: '时装', sign: { style: 'brand', bg: '#0d0d0d', fg: '#ffffff', font: 'song' }, building: { style: 'deco', up: 18, top: true } }),

  // ---- Jiangxi to Henan Middle Road ----
  // north: the whole block is the New World department store (新世界大丸 until 2026, now 新世界新丸中心 NEW ONE),
  // its ground floor Rolex (Prime Time), Gucci and Dolce & Gabbana
  S({ zh: '新世纪商城', en: 'NEW CENTURY', side: 'N', d0: 334, d1: 486, type: '百货', room: 'royal_esplanade', sign: { style: 'deco', bg: '#efe8da', fg: '#2b2b2b', font: 'song', width: 13, at: 402 },
    more: [{ d: 372, en: 'FINE HOURS', zh: '', sign: { style: 'letters', board: '#141414', font: 'song', fg: '#d8c58f', width: 7 } }, { d: 450, en: 'CORSINI', zh: '', sign: { style: 'letters', board: '#141414', font: 'song', fg: '#f2efe8', width: 5 } }, { d: 470, en: 'ROSSI & MARE', zh: '', sign: { style: 'letters', board: '#141414', font: 'song', fg: '#f2efe8', width: 7 } }],
    building: { style: 'classic', up: 28.8, top: true } }),
  // south: the East China Electric Power Building, now The Shanghai EDITION hotel; then the Nanjing Building (南京大楼,
  // 1935; once 老介福's) on the Henan corner: Starbucks, adidas and Huawei's global flagship
  S({ zh: '', en: 'THE BUND HOUSE', side: 'S', d0: 334, d1: 410, type: 'hotel', room: 'royal_esplanade', sign: { style: 'letters', board: '#141414', font: 'song', fg: '#f3f0ea', width: 9, at: 399 }, building: { style: 'deco', up: 32.4, top: true } }),
  S({ zh: '华讯', en: 'HUAXUN', side: 'S', d0: 410, d1: 486, type: '数码', room: 'phone_shop', sign: { style: 'letters', board: '#141414', fg: '#ffffff', width: 7, at: 470 },
    more: [{ d: 421, zh: '港湾咖啡', en: 'HARBOUR COFFEE', sign: { style: 'brand', bg: '#00704a', fg: '#ffffff', logoFg: '#ffffff', width: 6 } }, { d: 440, zh: '', en: 'stride', sign: { style: 'letters', board: '#141414', fg: '#ffffff', width: 5 } }],
    building: { style: 'deco', up: 25.2, top: true } }),

  // ---- west of Henan Road (the map runs ~35 m on) ----
  // north: Puma on the corner, then Apple Nanjing East in the Henderson Metropolitan building (恒基名人购物中心), its glass wall and logo
  S({ zh: '', en: 'OCELOT', side: 'N', d0: 498, d1: 512, type: '运动', sign: { style: 'letters', board: '#141414', fg: '#ffffff', width: 6 } }),
  S({ zh: '', en: 'Lumen 南鲸送路', side: 'N', d0: 512, d1: 600, type: '数码', room: 'phone_shop', sign: { style: 'letters', fg: '#f5f5f7', width: 2.6, h: 2.6, at: 557 }, front: { top: 9.6 }, building: { style: 'deco', up: 25.2, top: false } }),
  // south: Hongyi Plaza (宏伊国际广场, No.299) with Pop Mart, and the Samsung store facing Apple
  S({ zh: '宏远广场', en: 'HONGYUAN PLAZA', side: 'S', d0: 498, d1: 580, type: '数码', room: 'phone_shop', sign: { style: 'deco', bg: '#22262c', fg: '#f2f2f2', font: 'song', width: 8, at: 505 },
    more: [{ d: 527, zh: '趣盒', en: 'FUN BOX', sign: { style: 'brand', bg: '#e50012', fg: '#ffffff', width: 6 } }, { d: 562, zh: '', en: 'ORBIT', sign: { style: 'letters', board: '#141414', fg: '#ffffff', width: 6 } }],
    building: { style: 'deco', up: 28.8, top: false } }),

  // ---- Shandong (south only) and Henan to Shanxi South Road ----
  // north: the Youngor Building, the Bailian ZX anime mall (No.340), the Tamashii Nations store, then three old
  // names toward the Shanxi Road corner: 王开照相馆 (1923), 邵万生 (1852), 朵云轩 (1900)
  S({ zh: '创趣场', en: 'ZX PLAY', side: 'N', d0: 618, d1: 660, type: '纪念品', room: 'royal_esplanade', sign: { style: 'brand', bg: '#111111', fg: '#ffe600', font: 'hei' }, more: [{ d: 650, zh: '', en: 'ARCADIA', sign: { style: 'brand', bg: '#1a5dbf', fg: '#ffffff', width: 4 } }], building: { style: 'deco', up: 21.6, top: true } }),
  S({ zh: '', en: 'HOBBY NATION', side: 'N', d0: 660, d1: 680, type: '纪念品', sign: { style: 'letters', board: '#141414', fg: '#f5c400', width: 9 } }),
  S({ zh: '王开照相馆', en: 'WANG KAI PHOTO · 1923', side: 'N', d0: 680, d1: 700, type: '照相器材', since: '1923', sign: { style: 'plaque', bg: '#121010', font: 'kai' }, blade: { text: '王开照相', bladeStyle: 'plaque' }, building: { style: 'arched', up: 14.4, top: true } }),
  S({ zh: '邵万生', en: 'SHAO WAN SHENG · 1852', side: 'N', d0: 700, d1: 716, type: '食品', room: 'museum_of_ethnography', since: '1852', sign: { style: 'plaque', bg: '#5e0f12', font: 'kai' }, blade: { text: '邵万生南货', bladeStyle: 'plaque', bg: '#5e0f12' } }),
  S({ zh: '朵云轩', en: 'DUO YUN XUAN · 1900', side: 'N', d0: 716, d1: 738, type: '工艺美术', since: '1900', sign: { style: 'plaque', bg: '#16110d', font: 'kai' }, building: { style: 'classic', up: 14.4, top: true } }),
  // south: past Shandong Road, the 353 building (353广场 / Mosaic Mall: H&M, Uniqlo, Levi's), then the Shengdena mall
  S({ zh: '南东广场', en: 'NANDONG PLAZA', side: 'S', d0: 590, d1: 690, type: '时装', room: 'royal_esplanade', sign: { style: 'deco', bg: '#2a2a2e', fg: '#ffffff', font: 'hei', width: 9, at: 610 },
    more: [{ d: 633, zh: '', en: 'K&L', sign: { style: 'brand', bg: '#e50010', fg: '#ffffff', width: 4 } }, { d: 650, zh: '衣品', en: 'BASICO', sign: { style: 'brand', bg: '#ed1d24', fg: '#ffffff', logoFg: '#ffffff', width: 6 } }, { d: 682, zh: '', en: 'Rivet', sign: { style: 'brand', bg: '#c41230', fg: '#ffffff', width: 4.5 } }],
    building: { style: 'deco', up: 25.2, top: true } }),
  S({ zh: '圣德商厦', en: 'SHENGDE', side: 'S', d0: 690, d1: 738, type: '时装', sign: { style: 'deco', bg: '#3a2a20', fg: '#f3e2c0', font: 'song' }, more: [{ d: 728, zh: '', en: 'TOY TOWN', sign: { style: 'brand', bg: '#ffcc00', fg: '#222222', width: 5 } }] }),

  // ---- Shanxi South Road to Fujian Middle Road ----
  // north: the gold and the medicine: 老凤祥银楼 总店 (1848; a long gilt fascia with its phoenix), 蔡同德堂 (1882;
  // its glazed double-eaved porch), 亨达利 clocks and watches, 老庙黄金; past the lane 五福弄 an ICBC branch; past
  // 石潭弄, Nike and 张小泉's scissors (reopened July 2026; giant scissors in a niche) at the Fujian corner
  S({ zh: '老凤祥银楼 总店', en: 'LAO FENG XIANG · 1848', side: 'N', d0: 760, d1: 800, type: '珠宝', since: '1848', sign: { style: 'plaque', bg: '#1a120a', fg: '#e8c26a', font: 'kai', width: 13 }, building: { style: 'arched', up: 18, top: true } }),
  S({ zh: '蔡同德堂', en: 'CAI TONG DE TANG · 1882', side: 'N', d0: 802, d1: 824, type: '药房', room: 'museum_of_ethnography', since: '1882', sign: { style: 'plaque', bg: '#111010', font: 'kai' }, blade: { text: '蔡同德堂', bladeStyle: 'plaque' } }),
  S({ zh: '亨达利钟表', en: 'HENG DA LI', side: 'N', d0: 824, d1: 836, type: '钟表', since: '1864', sign: { style: 'plaque', bg: '#0d2a55', fg: '#e9cf8a', font: 'wei' } }),
  S({ zh: '老庙黄金', en: 'LAOMIAO GOLD', side: 'N', d0: 836, d1: 850, type: '珠宝', sign: { style: 'brand', bg: '#b3121b', fg: '#f6d47a', font: 'song' } }),
  S({ zh: '东方实业银行', en: 'ORIENT INDUSTRIAL BANK', side: 'N', d0: 856, d1: 876, type: 'bank', room: 'royal_esplanade', sign: { style: 'brand', bg: '#c7000b', fg: '#ffffff' } }),
  S({ zh: '', en: 'VELOX', side: 'N', d0: 922, d1: 948, type: '运动', sign: { style: 'letters', board: '#141414', fg: '#ffffff', width: 6 } }),
  S({ zh: '张小泉', en: 'ZHANG XIAO QUAN · 1628', side: 'N', d0: 948, d1: 963, type: '工艺美术', since: '1628', sign: { style: 'plaque', bg: '#121212', font: 'kai' }, blade: { text: '张小泉刀剪', bladeStyle: 'plaque' }, building: { style: 'brick', up: 10.8, top: true } }),
  // south: the Loongstore mall, KFC, Yoshinoya, MINISO, Pizza Hut, Häagen-Dazs, the Radisson Hyland (No.505), Huawei
  S({ zh: '', en: 'DRAGON STORE', side: 'S', d0: 790, d1: 832, type: '时装', room: 'royal_esplanade', sign: { style: 'letters', board: '#141414', fg: '#e8d7a6', font: 'song', width: 9 }, building: { style: 'deco', up: 21.6, top: true } }),
  S({ zh: '炸鸡大王', en: 'FRY KING', side: 'S', d0: 836, d1: 852, type: '食品', room: 'comfy_cafe', sign: { style: 'brand', bg: '#c8102e', fg: '#ffffff', logoFg: '#ffffff' } }),
  S({ zh: '牛丼屋', en: 'GYUDON HOUSE', side: 'S', d0: 862, d1: 876, type: '食品', room: 'warm_restaurant', sign: { style: 'brand', bg: '#f39800', fg: '#ffffff' } }),
  S({ zh: '小物所', en: 'LITTLE THINGS', side: 'S', d0: 878, d1: 892, type: '纪念品', room: 'decor_shop', sign: { style: 'brand', bg: '#e8112d', fg: '#ffffff' } }),
  S({ zh: '披萨工坊', en: 'PIZZA WORKS', side: 'S', d0: 892, d1: 906, type: '食品', room: 'warm_restaurant', sign: { style: 'brand', bg: '#c8102e', fg: '#ffffff' } }),
  S({ zh: '雪域冰淇淋', en: 'NORDIC CREAM', side: 'S', d0: 920, d1: 934, type: '咖啡', sign: { style: 'brand', bg: '#2b1a4a', fg: '#e6d4a5', font: 'song' } }),
  S({ zh: '海仑宾馆', en: 'HAILUN HOTEL', side: 'S', d0: 934, d1: 950, type: 'hotel', room: 'royal_esplanade', sign: { style: 'deco', bg: '#1d1d1f', fg: '#f1e4d0', font: 'song' }, building: { style: 'deco', up: 54, top: true } }),
  S({ zh: '华讯', en: 'HUAXUN', side: 'S', d0: 950, d1: 963, type: '数码', room: 'phone_shop', sign: { style: 'letters', board: '#141414', fg: '#ffffff', width: 6 } }),

  // ---- Fujian to Zhejiang Middle Road ----
  // north: 真老大房 (1851) on the Fujian corner, KFC (No.558), Top Toy, Fila, the No.1 Dispensary (第一医药商店),
  // Zara, 三阳南货店 (1870) and 沈大成's main shop (1875) at the Zhejiang corner
  S({ zh: '真老大房', en: 'ZHEN LAO DA FANG · 1851', side: 'N', d0: 977, d1: 992, type: '糕团', since: '1851', sign: { style: 'plaque', bg: '#141010', font: 'kai' }, blade: { text: '真老大房', bladeStyle: 'plaque' }, building: { style: 'brick', up: 10.8, top: true } }),
  S({ zh: '炸鸡大王', en: 'FRY KING', side: 'N', d0: 1012, d1: 1028, type: '食品', room: 'comfy_cafe', sign: { style: 'brand', bg: '#c8102e', fg: '#ffffff', logoFg: '#ffffff' } }),
  S({ zh: '', en: 'PLAY BOX', side: 'N', d0: 1028, d1: 1040, type: '纪念品', sign: { style: 'brand', bg: '#ffffff', fg: '#111111' } }),
  S({ zh: '', en: 'MARINA SPORT', side: 'N', d0: 1042, d1: 1058, type: '运动', sign: { style: 'brand', bg: '#002d62', fg: '#ffffff' } }),
  S({ zh: '第一医药商店', en: 'SHANGHAI NO.1 DISPENSARY', side: 'N', d0: 1060, d1: 1080, type: '药房', room: 'museum_of_ethnography', sign: { style: 'deco', bg: '#0f3a2a', fg: '#f1e9d2', font: 'song' }, building: { style: 'classic', up: 18, top: true } }),
  S({ zh: '', en: 'NOVA', side: 'N', d0: 1082, d1: 1112, type: '时装', room: 'witsand_woolshop', sign: { style: 'letters', board: '#141414', fg: '#ffffff', font: 'song', width: 6 }, building: { style: 'classic', up: 21.6, top: false } }),
  S({ zh: '三阳南货店', en: 'SAN YANG · 1870', side: 'N', d0: 1112, d1: 1124, type: '食品', room: 'museum_of_ethnography', since: '1870', sign: { style: 'plaque', bg: '#5e0f12', font: 'kai' } }),
  S({ zh: '沈大成', en: 'SHEN DA CHENG · 1875', side: 'N', d0: 1124, d1: 1145, type: '糕团', since: '1875', sign: { style: 'plaque', bg: '#141010', font: 'kai' }, blade: { text: '沈大成', bladeStyle: 'plaque' } }),
  // south: Century Square opens off the street here (world/nanjingRoad.js); east of it, unknown frontages

  // south, on the Zhejiang corner: New Wing On (新永安大楼, 1933, 七重天), its prow to Nanjing Road, bridged to Wing On
  S({ zh: '七重天宾馆', en: 'SEVENTH HEAVEN HOTEL', side: 'S', d0: 1131, d1: 1145, type: 'hotel', room: 'royal_esplanade', landmark: 'newwingon', sign: { style: 'deco', bg: '#2a1c14', fg: '#f3e2c0', font: 'song', width: 10 },
    more: [{ d: 1138, zh: '七重天宾馆', en: '', sign: { style: 'letters', fg: '#ff2b2b', glow: '#ff1a1a', font: 'song', width: 11, h: 1.8, y: 38.8 } }] }),
  // ---- Zhejiang to Guangxi North Road ----
  // south: Wing On (永安百货, 1918) on the Zhejiang corner, Giordano in its ground floor; ICBC; the Baolong Tower with
  // 宝大祥 (children's goods), 新雅粤菜馆 (Cantonese, 1926) and 吴良材眼镜 (opticians)
  S({ zh: '永安百货', en: '', side: 'S', d0: 1159, d1: 1215, type: '百货', room: 'royal_esplanade', since: '1918', landmark: 'wingon', sign: { style: 'letters', fg: '#ff2b2b', glow: '#ff1a1a', font: 'song', width: 14, h: 3.2, y: 24.4, at: 1192 },
    more: [{ d: 1168, zh: '', en: 'MAISON LUNE', sign: { style: 'letters', board: '#141414', fg: '#ffffff', font: 'song', width: 4.5 } }, { d: 1188, zh: '', en: 'BELLE RIVE', sign: { style: 'letters', board: '#141414', fg: '#ffffff', font: 'song', width: 4.5 } }, { d: 1204, zh: '', en: 'CRYSTALLE', sign: { style: 'letters', board: '#141414', fg: '#ffffff', font: 'song', width: 5 } }] }),
  S({ zh: '东方实业银行', en: 'ORIENT INDUSTRIAL BANK', side: 'S', d0: 1222, d1: 1238, type: 'bank', room: 'royal_esplanade', sign: { style: 'brand', bg: '#c7000b', fg: '#ffffff' } }),
  S({ zh: '宝大祥', en: 'BAO DA XIANG', side: 'S', d0: 1248, d1: 1260, type: '时装', sign: { style: 'plaque', bg: '#5e0f12', font: 'wei' }, building: { style: 'deco', up: 43.2, top: true } }),
  S({ zh: '新雅粤菜馆', en: 'SUN YA · 1926', side: 'S', d0: 1260, d1: 1271, type: '酒家', since: '1926', sign: { style: 'plaque', bg: '#111010', font: 'kai' }, blade: { text: '新雅粤菜', bladeStyle: 'neon', neon: '#ff3b3b' } }),
  S({ zh: '吴良材眼镜', en: 'WU LIANG CAI', side: 'S', d0: 1271, d1: 1278, type: '眼镜', since: '1719', sign: { style: 'plaque', bg: '#0f2a4a', fg: '#e9cf8a', font: 'wei', width: 5.5 } }),
  // north: the Shanghai Fashion Store in the old Sincere building (先施公司, 1917), MINISO, Starbucks
  S({ zh: '上海时装商店', en: 'SHANGHAI FASHION STORE', side: 'N', d0: 1159, d1: 1249, type: '时装', room: 'royal_esplanade', landmark: 'sincere', sign: { style: 'letters', fg: '#b8892e', font: 'song', width: 11, h: 0.9, y: 7.15, at: 1180 },
    more: [{ d: 1163, zh: '江南之星', en: 'JIANGNAN INN', sign: { style: 'brand', bg: '#e60012', fg: '#ffffff', width: 4, h: 0.8, y: 15.2 } }] }),
  S({ zh: '小物所', en: 'LITTLE THINGS', side: 'N', d0: 1249, d1: 1262, type: '纪念品', room: 'decor_shop', sign: { style: 'brand', bg: '#e8112d', fg: '#ffffff' } }),
  S({ zh: '港湾咖啡', en: 'HARBOUR COFFEE', side: 'N', d0: 1262, d1: 1276, type: '咖啡', sign: { style: 'brand', bg: '#00704a', fg: '#ffffff', logoFg: '#ffffff' } }),

  // ---- Guangxi North to Guizhou Road ----
  // north: McDonald's, the No.1 Food Store (第一食品商店, the old Sun Sun, 1926), Pizza Hut; south: Subway
  S({ zh: '上海市第一食品商店', en: 'FIRST FOODHALL', side: 'N', d0: 1288, d1: 1338, type: '食品', room: 'royal_esplanade', landmark: 'sunsun', sign: { style: 'brand', bg: '#c8102e', fg: '#ffffff', font: 'hei', width: 11, at: 1318 },
    blade: { text: '第一食品商店', bladeStyle: 'plaque', bg: '#c8102e', fg: '#ffffff', at: -1305 },
    more: [{ d: 1295, zh: '汉堡站', en: 'Burger Stop', sign: { style: 'brand', bg: '#da291c', fg: '#ffc72c', logoFg: '#ffc72c', width: 5 } }, { d: 1331, zh: '披萨工坊', en: 'PIZZA WORKS', sign: { style: 'brand', bg: '#c8102e', fg: '#ffffff', width: 4.5 } }] }),
  S({ zh: '三明治车站', en: 'SUB STATION', side: 'S', d0: 1322, d1: 1338, type: '食品', room: 'comfy_cafe', sign: { style: 'brand', bg: '#008c15', fg: '#ffc600' } }),

  // ---- Guizhou Road to Xizang Middle Road ----
  // north: the Shanghai Bedding Store (1942), 茂昌眼镜, and the No.1 Department Store (第一百货, the old Sun Company,
  // 1936) on the Xizang corner; south: Shimao Festival City with M&M's World on the corner
  S({ zh: '上海床上用品商店', en: 'SHANGHAI BEDDING STORE · 1942', side: 'N', d0: 1350, d1: 1370, type: '百货', room: 'decor_shop', since: '1942', sign: { style: 'deco', bg: '#253b2f', fg: '#efe2c4', font: 'song' } }),
  S({ zh: '茂昌眼镜', en: 'MAO CHANG OPTICAL', side: 'N', d0: 1370, d1: 1385, type: '眼镜', sign: { style: 'plaque', bg: '#0f2a4a', fg: '#e9cf8a', font: 'wei' } }),
  S({ zh: '第一百货商业中心', en: 'NO.1 SHOPPING CENTER', side: 'N', d0: 1457, d1: 1511, type: '百货', room: 'royal_esplanade', landmark: 'sunco', sign: { style: 'brand', bg: '#f4f4f0', fg: '#1f9a46', font: 'hei', width: 13, h: 0.75, y: 4.85, at: 1478 },
    blade: { text: '第一百货', bladeStyle: 'plaque', bg: '#1f9a46', fg: '#ffffff', at: -1488 } }),
  S({ zh: '南京路节庆广场', en: 'FESTIVAL CITY', side: 'S', d0: 1420, d1: 1511, type: '百货', room: 'royal_esplanade', sign: { style: 'letters', board: '#141414', fg: '#f3f0ea', font: 'song', width: 10, at: 1440 },
    more: [{ d: 1495, zh: '', en: 'CANDY WORLD', sign: { style: 'brand', bg: '#6b3a1f', fg: '#ffd400', width: 6 } }], building: { style: 'deco', up: 64.8, top: true } }),
];

// where each shop goes: [{ dir (1: north side, -1: south), x0, x1, shop, building }], frontages not overlapping
export function placedShops(list = NJ_SHOPS) {
  const out = [];
  for (const side of ['N', 'S']) {
    const dir = side === 'N' ? 1 : -1;
    const mine = list.filter((s) => s.side === side).map((s) => ({ s, xa: xForMetres(s.d0), xb: xForMetres(s.d1) })).sort((a, b) => b.xa - a.xa);
    let edge = Infinity;
    for (const { s, xa, xb } of mine) {
      const blk = njRuns(dir).find((b) => (xa + xb) / 2 <= b[0] + 0.01 && (xa + xb) / 2 >= b[1] - 0.01); if (!blk) continue;
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
