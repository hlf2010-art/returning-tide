# Living city: the Bund's buildings, what's in and what's missing

*Audit of 25 November 2026 against master `aaaca17`. Read-only; nothing was changed. Code references are
as of that commit.*

## What the game covers

Zhongshan East 1st Road from z 95 to z −262, about 357 m (`layout.js:15-16, 30-43`): from the middle of
HSBC (No.12) north to just past the Peace Hotel (No.20). Walkable side streets: Hankou Road, about 58 m
in (`layout.js:18`); Jiujiang Road, a 22 m stub (`layout.js:31`); Nanjing Road East out to Henan Road plus
about 35 m (`layout.js:32, 39-43`). The promenade runs from x 2 to x 26.

## In the game

| Building | Detail |
|---|---|
| No.12 HSBC 汇丰银行大楼 (1923) | Façade with features: pavilion, colonnade, drum and dome, bronze lions (`bund.js:173-222`) |
| No.13 Customs House 江海关大楼 (1927) | Good: Doric portico, clock tower, four dials (`bund.js:132-171`) |
| No.14 Bank of Communications 交通银行 (1948) | Façade: art-deco piers, bronze door (`bund.js:224-245`) |
| No.15 Russo-Chinese Bank 华俄道胜银行 (1902) | Façade: Ionic order on a rusticated base (`bund.js:247-264`) |
| No.16 Bank of Taiwan 台湾银行 (1927) | Plain massing box (`bund.js:382`) |
| No.17 AIA / North China Daily News 字林大楼 (1924) | Proper model: façade, corner towers, lobby interior (`bund.js:309-340`; `interiors.js`) |
| No.19 Palace Hotel / Swatch Art Peace Hotel 汇中饭店 (1908) | Generic brick block with cupolas (`bund.js:385`) |
| No.20 Peace Hotel 沙逊大厦 (1929) | Generic art-deco block plus the green pyramid (`bund.js:342-350`); proper interiors: the hall, the Jazz Bar, the sixth-floor room |
| No.23 Bank of China 中国银行 (1937) | Generic block with a low roof cone (`bund.js:387-388`); just past the north edge, visible but not reachable |
| Nos.24–29 and the southern Nos.1–9 | Unnamed generic blocks (`bund.js:389-398`) |
| Garden Bridge 外白渡桥 (1907) | Proper truss model (`bridges.js:127-158`) |
| Broadway Mansions 上海大厦 (1934) | Three stacked boxes (`bridges.js:159-162`) |
| Nanpu 南浦大桥 (1991), Yangpu 杨浦大桥 (1993) | Good simplified models; distances pulled in on purpose (`bridges.js:8-10`) |
| Oriental Pearl, Shanghai Tower, SWFC, Jin Mao | Detailed (`skyline.js:142, 182, 229, 273`) |
| Convention Centre globes; Bank of China, Aurora, DBS and Citi towers | Boxes with name signs; an LED wall on the Citi tower (`skyline.js:488-491, 506, 524`) |

## Missing, ranked: near (the Bund row and the promenade)

1. **No.18, Chartered Bank 麦加利银行 (1923).** Inside the extents. Dropped and merged with No.19, although `layout.js:200` says "No.17 to No.19".
2. **The Chen Yi statue and square 陈毅像 (1993).** On the promenade opposite Nanjing Road, inside the extents.
3. **No.19 and No.23 rebuilt from the generic kit.** No.19 is the Nanjing Road corner; No.23 needs its Chinese-style hipped roof.
4. **Nos.24–29**: Yokohama Specie Bank (1924), Yangtze Insurance (1920), Jardine Matheson 怡和 (1922), Glen Line (1922), Banque de l'Indochine (1914). Visible as filler; the map would need extending to walk them.
5. **Huangpu Park 黄浦公园 (1886) and the Monument to the People's Heroes 人民英雄纪念塔 (1993, about 60 m).** Visible looking north; needs the map extended, or a backdrop. Nothing fills the row between z −430 and the creek at z −820.
6. **No.33, the former British Consulate 英国领事馆 (1873), and the Peninsula (2009).** Need extension.
7. **Astor House 浦江饭店 (1910) and the Russian Consulate 俄罗斯领事馆 (1916).** Beside the Garden Bridge; low dark boxes only (`bridges.js:164`).
8. **Nos.1–9** (Asia Building 1916, Shanghai Club 1910, Three on the Bund 1916 and others), **the Signal Tower 外滩信号台 (1907)** and **Rockbund / Yuanmingyuan Road.** All need extension; Rockbund isn't visible from the current area.

## Missing, ranked: distant (the classic view from the railing)

1. **Shanghai IFC's two towers (about 260 and 250 m, 2010).** Generic boxes from the Bund. The real footprints are already in `lujiazuiOsm.js` but are only built while you're in Pudong.
2. **Aurora Plaza 震旦 (185 m, 2003) and Citigroup Tower 花旗 (2005).** Both misplaced next to the Pearl (`skyline.js:449-452`); the OSM data in the repo puts them about 600 m further south, at (641, 553) and (710, 614). Aurora's curved face to the Bund is missing.
3. **Bank of China Tower Pudong 中银大厦 (2000).** A sign on a plain box, without its characteristic form.
4. **The North Bund: White Magnolia Plaza 白玉兰 (320 m, 2017), Sinar Mas / W Hotel, the Cruise Terminal (2010).** Entirely absent.
5. **The Pudong riverfront: the Shangri-La and the riverside hotels.** Generic boxes.

## Misplaced or badly proportioned

- **The No.16 slot:** two generic blocks stand between No.15 and Jiujiang Road (`bund.js:382-383`); one building is invented.
- **The supertalls:** in the Bund view they sit about 400 m nearer and about 270 m north of their OSM positions (`skyline.js:441` against `lujiazuiLayout.js:529`). Deliberate, but they loom about 1.4× too large.
- **The Convention Centre globes:** drawn the same size; the real ones are about 50 m and 38 m (`skyline.js:506`).

## Nanjing Road East

- **Scope.** Every famous department store stands west of Henan Road, on the main pedestrian street, which is outside the map: the First Department Store (1936), the No.1 Food Store / Sun Sun (1926), Wing On (1918), Sincere (1917), Sun Ya, Laojiefu, the Fashion Store. The sightseeing tram also runs mainly on that stretch.
- **Inside the map** the flagships are placed fairly well (`nanjingRoad.js:238-243`). Apple is on the south side at the Henan Road corner (No.300, Henderson Metropolitan). Daimaru, Huawei in the Nanjing Building and Samsung in Hongyi Plaza look plausible; whether the Samsung store is still open wasn't checked.
- **Apple's building is wrong:** it uses the old-stone "classic" kit; the real store has a modern glass front.
- **Logos:** the flagship names are plain text panels (`nanjingRoad.js:38-46`). Apple shows the word "Apple" instead of its logo, although `lujiazuiBuild.js:159` already has `appleLogo()`.
- **Everything else is invented:** generic name syllables drawn at random (`nanjingRoad.js:6-7, 22-24`). The Bund-to-Jiangxi-Road stretch has no real tenants at all.
- **Shoppers:** people walk in through a doorway and vanish (`crowd.js` shop state; `crowdView.js`), then reappear 18–68 s later carrying nothing new. The only bag is one person's fixed tote (`pedestrians.js:10, 62`). No shop visits happen west of x −476.

### Fixes, ranked by impact

1. Extend the street west of Henan Road, with the big department stores. (*Done 25 Nov 2026: to Xizang Road, with the real shops: `docs/nanjing-road-shops.md`.*)
2. Model the Peace Hotel's Nanjing Road front and the Swatch hotel.
3. Give Apple a glass front and its logo.
4. Survey the real tenants from the Bund to Henan Road and use the real names.
5. Give shoppers bags when they come out. (*Started 25 Nov: the ride-hail shoppers in `world/shoppers.js` come out with one to three bags; the crowd's own shop visitors still don't.*)
6. Add the sightseeing tram.
7. More and bigger LED screens and rooftop signs: today only 12% of wide buildings get a screen, cycling four generic slides (`nanjingRoad.js:276`).
8. Street furniture: planters, benches, kiosks.
9. Vary the doorways, spaced every 13 m whatever the building (`nanjingRoad.js:212`).

*25 Nov 2026: the shop windows and doors are rebuilt (`world/shopfronts.js`): real 360-degree photographs of shop interiors (Poly Haven, CC0) seen through the glass with true depth (interior mapping), reflective glass, stone stall risers, bronze frames, automatic sliding doors that open for whoever walks up, warm light on the paving after dark. The photographs are of shops elsewhere; 360-degree photos taken inside real Nanjing Road shops would drop straight in (`tools/rooms/make.py`).*

Sources: [apple.com.cn Nanjing East](https://www.apple.com.cn/retail/nanjingeast/), [Henderson Metropolitan](https://www.hld.com/en/properties-in-mainland-china/properties-for-lease/henderson-metropolitan), [The Bund (Wikipedia)](https://en.wikipedia.org/wiki/The_Bund), [thepaper.cn](https://www.thepaper.cn/newsDetail_forward_5700079).
