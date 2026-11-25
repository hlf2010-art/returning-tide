# Nanjing Road's real shops: what's in the game and where it comes from

*Researched 25 November 2026 (OpenStreetMap extract of November 2026, shop and news pages, Wikimedia
Commons photos of August 2022 and 2024). Data: `src/world/njShops.js`. Signs: `src/world/shopSigns.js`.*

## Rules checked

- **Sides.** Even street numbers are on the north side, odd numbers on the south, along the whole street
  (OpenStreetMap geometry; Huawei is described as diagonally opposite Apple, Samsung as facing it, and
  a 2024 photo shows SAMSUNG and HUAWEI reflected in Apple's glass). The game had Apple and Daimaru on
  the south side and Samsung and Huawei on the north, the wrong way round. Now fixed.
- **Distances** west from the Bund along the centreline: Sichuan Middle Road at 204 m, Jiangxi Middle
  Road at 326 m, Henan Middle Road at 486–498 m, Shandong Middle Road at 585 m, Shanxi South Road at
  744 m, Fujian Middle Road at 970 m, Zhejiang Middle Road at 1152 m, Xizang Middle Road at about 1526 m.
  The game's map ends about 35 m west of Henan Road, and its Jiangxi–Henan block is 96 m instead of
  160 m. Shops are placed block by block (`xForMetres`).

## In the game (Bund to just past Henan Road)

| Side | m from Bund | Shop | Notes |
|---|---|---|---|
| S | 40–79 | Blancpain, Swatch | Ground floor of the Swatch Art Peace Hotel (the old Palace Hotel). Omega is at 17 m, inside the hotel block the game draws separately |
| S | 110–124 | 穗月有礼 (gift shop), 雪羽の茶 (tea) | OSM, checked 2025-08 |
| S | 126–140 | 名创优品 MINISO | OSM |
| S | 148–162 | 中信银行 China CITIC Bank | OSM |
| S | 172–196 | 中国工商银行 ICBC, in 嘉陵大楼 (No.99) | On the Sichuan Road corner |
| N | 152–170 | 锦江都城经典酒店 Metropolo | OSM |
| N | 170–196 | 惠罗公司 Whiteaway Laidlaw (No.100, store since 1906) | Dark fascia with gold characters (pre-2020 photo). Current use unverified |
| N | 212–262 | 上海民族乐器一厂 store (No.114), in 慈安里大楼 | Last seen 2022 |
| N | 284–295 | POLO Sport | OSM |
| N | 295–303 | 泰康食品 Taikang Food (No.150) | Dark-grey fascia, gold characters, vertical sign (2022 photo) |
| N | 303–318 | 安踏 Anta, in 慈昌里大楼 | OSM. KAKAO Friends here closed by August 2022 |
| S | 212–256 | Peet's Coffee, New Balance, 沈大成 | 外滩·中央 / the old 中央商场 (OSM) |
| S | 268–318 | JORDAN 139 NANDONG, 林肯爵士乐上海中心 (Jazz at Lincoln Center), 光明悠焙, BOY LONDON | No.139; 美伦大楼 on the Jiangxi corner |
| N | 334–486 | 上海新世界新丸中心 NEW ONE (新世界大丸百货 until 1 January 2026) | Whole block. Ground floor: PRIME TIME (Rolex), Gucci, Dolce & Gabbana. Renovation 2026–27, open throughout |
| S | 334–410 | The Shanghai EDITION (华东电力大楼) | Hotel |
| S | 410–486 | 南京大楼: Starbucks, adidas, 华为全球旗舰店 (No.233) | Huawei's flagship has a white petal logo on the corner tower and a huge vertical LED screen, which the game doesn't have yet |
| N | 498– | Apple 南京东路 (No.300, Henderson Metropolitan) | Full-height glass wall, glowing logo. OSM puts the store's centre at 557 m, beyond the map's end; it's drawn in the 35 m that exist |
| S | 498– | 宏伊国际广场 Hongyi Plaza (No.299): Samsung, Pop Mart | Samsung began closing stores in China in August 2026; Shanghai wasn't named. Re-check before release |

Frontages with no known tenant still get an invented shop in the street's manner: S 79–110 m (beside
the shengjian shop, which is the game's own), N 40–152 m beyond the Peace Hotel (the 工联大厦 at
146 m, tenants unknown), N 262–284 m, S 256–268 m.

## West of the map (for when it's extended to Xizang Road)

王开照相馆 (378, N, 1923), 邵万生 (414, N, 1852), 朵云轩 (422, N, 1900; black lacquered board, gold
calligraphy "朵雲軒"), 老凤祥银楼 总店 (432, N, 1848; long gilt relief fascia with a phoenix), 蔡同德堂
(450, N, 1882; double-eaved glazed porch, black board with gold characters), 亨达利 (456, N, moved here
in 2022), 老庙黄金 (462, N), 张小泉 (490, N, reopened 26 July 2026; giant scissors in a niche), 真老大房
(536, N, reopened October 2024), 第一医药商店 (616, N), 三阳南货店 and 沈大成's main shop (630 / 636, N),
永安百货 (635, S, Zhejiang Road corner), 宝大祥, 新雅粤菜馆 and 吴良材眼镜 (685 / 719 / 719-1, S),
上海时装商店 (690, N), 第一食品商店 (720, N), 上海床上用品商店 and 茂昌眼镜 (740 / 762), 第一百货 (830, N,
Xizang Road corner), M&M's World (829, S), 百联ZX创趣场 (340, N), 353广场 (353, S).

Not found on Nanjing Road East: 恒源祥, 开开, 回力. 培罗蒙 appears in a 2019 photo near Guizhou
Road with no number.

## Interiors and trademarks

The rooms seen through the glass are photographs of shops elsewhere (`public/rooms/CREDITS.md`),
matched by what each shop sells. 360-degree photos taken inside these shops, with their permission,
would drop straight in (`tools/rooms/make.py`). The shop names and marks (Apple, Huawei, Samsung,
Starbucks, adidas, New Balance and Jordan are drawn from simple-icons) belong to their owners. Clear
or replace them before any commercial release, as with the BYD badges (`public/models/cars/CREDITS.md`).

## Sources

OpenStreetMap (openstreetmap.org, extract of November 2026);
[Swatch Art Peace Hotel fact sheet](https://www.swatch-art-peace-hotel.com/sites/default/files/files/module/file-box/2021-11-factsheet-swatch-art-peace-hotel-cn.pdf);
[thepaper.cn 9138198](https://m.thepaper.cn/baijiahao_9138198);
[南京东路 (Wikipedia)](https://zh.wikipedia.org/wiki/南京东路_(上海市));
winshang.com news [676321](https://m.winshang.com/news676321.html), [673930](https://m.winshang.com/news673930.html),
[665330](https://m.winshang.com/news665330.html), [737883](https://m.winshang.com/news737883.html), [698229](https://m.winshang.com/news698229.html);
[Huawei Nanjing East Road](https://consumer.huawei.com/cn/retail/nanjingdonglu); [Apple Nanjing East](https://www.apple.com.cn/retail/nanjingeast/);
[Rolex dealer listing](https://www.rolex.com/rolex-dealers/shanghaixinyuwatchclockgroupltd-1718/rswi_133417-huangpu-mainlandchina);
[Jordan 139 Nandong](https://www.nike.com/retail/s/jordan-139-nandong);
Wikimedia Commons: [New World Daimaru 2022](https://commons.wikimedia.org/wiki/File:New_World_Daimaru-20221120.jpg),
[Laou Kai Fook building](https://commons.wikimedia.org/wiki/Category:Laou_Kai_Fook_Silk_Co._Mansion),
[Apple Nanjing East](https://commons.wikimedia.org/wiki/Category:Apple_Nanjing_East),
[Taikang Food 2022](https://commons.wikimedia.org/wiki/File:Taikang_Food_at_150_East_Nanjing_Road-20220828.jpg),
[Kakao Friends 2022](https://commons.wikimedia.org/wiki/File:Kakao_Friends_at_172_East_Nanjing_Road-20220828.jpg),
[Bright Bakery 2022](https://commons.wikimedia.org/wiki/File:Bright_Bakery_at_139_East_Nanjing_Road-20220828.jpg),
[Huiluo Company](https://commons.wikimedia.org/wiki/File:Huiluo_Company.jpg);
[citynewsservice 2025-09-29](https://www.citynewsservice.cn/articles/cns/hai-lights/hai-lights/rkl5jvjn);
[eastmoney 2026-07-29 (张小泉)](https://finance.eastmoney.com/a/202607293825258259.html);
[thepaper.cn 32574980 (江西中路 cluster)](https://m.thepaper.cn/newsDetail_forward_32574980).
