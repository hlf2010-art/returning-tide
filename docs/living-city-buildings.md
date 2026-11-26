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

*25 Nov 2026, visual review (a screenshot walk of the whole map, day, dusk, night and drizzle), fixed:*
- *Blade signs showed as black slabs (their faces sat inside the backing board).*
- *The ambient-occlusion pass streaked the sky (the sky sphere is now hidden for it).*
- *The grey "window card" boxes along Henan Road and Xizang Road, with sheared window patterns, are replaced by real façades from the street kit. Rows of blocks now stand behind both frontages west of Henan Road, open at the side streets, so Century Square and the side-street mouths look onto city instead of the river.*
- *The Xizang Road end: Nanjing West Road runs on west between New World City, with the Radisson New World's saucer-topped tower behind it, and People's Park's trees.*
- *Century Square has real plane trees.*
- *The paving is dry unless it has rained lately: no permanent puddles, no sunlit glare blob.*
- *At night the street is lit kerb to kerb by its shops and signs.*
- *The tram kiosks are real ticket booths.*
- *The metro exits carry lit Shanghai Metro boards instead of black panels.*
- *Umbrellas are domed and ribbed, held clear of heads.*
- *Shop rooms are turned per bay, so the same photo isn't repeated next to itself, and fashion shops no longer show a yarn shop.*
- *Flags on the Bund carry the five stars; Lujiazui's day glass is blue-grey rather than pastel.*

*Still open from that review:*
- *The Peace Hotel's lobby and the AIA lobby are done (below).*

*26 Nov 2026, the AIA lobby (No.17, the North China Daily News Building, 1924; restored 1996 by Jan Hird Pokorny Associates; AIA's Shanghai home since May 1998) rebuilt, and given its working day:*
- *Researched again in depth on 26 Nov (Xinhua, AIA's own release, People's Daily, the Huangpu district media, The Paper, Shanghai Story Map, Sohu, Sina reprints and blogs, Frommer's, the ICAA). What the sources say of No.17:*
  - *Inside: "大理石地坪、墙面与金色马赛克穹庐顶" (Xinhua, 6 Aug 2025); white marble floors, black marble walls with gold mosaic, plaster relief ceilings (Shanghai Story Map; Chinese Wikipedia via 青年报 2013).*
  - *"一幅百寿图浮雕，在大堂格外醒目": a hundred seal-script forms of 寿, made when AIA opened the building (Xinhua 2025). It is now on the lobby's north wall. The game has no seal-script face, so the forms are drawn from the sign faces in varied cartouches.*
  - *Doric columns and a marble lintel at the door, the columns running through the two-storey base (a 2009 visitor; a 2017 blog; The Paper). They were wrongly placed inside on 26 Nov and are now outside, either side of the Bund door.*
  - *Two goddess statues just inside the door, destroyed in the Cultural Revolution (2009 blog; Shanghai Story Map). Nothing marks the spot now, so the invented empty niches are gone; an old client remembers them in passing.*
  - *"营业时间一楼可参观，不能拍照" (Sohu, 2025): the visitor event follows this rule.*
  - *History: AIA rented the ground-floor hall in 1928 and left in 1947. It applied to take the building back in 1993, leased the whole of it in 1996, renamed it 友邦大厦, refitted it for 18 months and opened it in May 1998. It renewed the lease on the whole building in July 2025 (AIA release; Xinhua). The 1931 date in a People's Daily advertorial conflicts with this, so the timeline wall uses 1928.*
  - *Not No.17: the eight mosaic panels of financial capitals and the zodiac dome belong to the HSBC Building at No.12 (Frommer's, ICAA). They are not used here.*
- *Not found anywhere, so the game's own: the lobby's plan, the reception, the gates and lifts (a modern head office's), the dome's mosaic pattern, the bronze lantern, the black-and-gold wall panelling's layout, the floor roundel, and the consultation corner.*
- *The talk follows the market as it stands: the guaranteed-rate cut of 1 Sept 2025 (traditional products 2.0%, participating 1.75%) that made participating policies the main thing sold; dividends that can't be promised; 2026's products for people with health conditions; MDRT, where AIA Life has had the most members in the world three years running.*
- *A wall over reception gives the firm's Shanghai history: 1919 (C. V. Starr's agency), 1992 (the first foreign insurer licensed after reform), 1998 (back at No.17), 2010 (Hong Kong listing, after leaving AIG), 2020 (AIA Life, the first wholly foreign-owned life insurer on the mainland).*
- *People (world/aiaLife.js, lines in world/aiaTalk.js), 9:00–19:00:*
  - *two consultations: a senior agent with a young couple, on critical illness (disclosing a thyroid nodule), medical cover beyond the company plan, and a budget of a tenth of income; and a Shanghai agent with a retired couple in Shanghainese, on increasing whole life for a grandson, cash values in the contract, cover after heart stents and the city's 沪惠保, and claims;*
  - *an employee-benefits manager meeting an HR director: group cover with families, flexible benefits, global medical;*
  - *an agent on the phone: an underwriting follow-up, online signing and the recorded sale (双录).*
- *Dress and voices: most of the agents are women, as most of the agency force is; they wear suits and a red lanyard with a staff card. Clients are in everyday clothes; the retired couple have grey hair. Mandarin lines are voiced with Kokoro and Shanghainese is subtitled, as elsewhere.*
- *No real policy is named. The company name is used because the building carries it: clear it before a commercial release, with the other brands.*
- *Things that happen now and then (GTA-style random events, world/aiaLife.js and AIA_EVENTS in world/aiaTalk.js):*
  - *a customer storms in, over a claim refused for non-disclosure or a surrender that paid back half; the guard steps in and the manager takes him through to a meeting room;*
  - *the young couple sign on the tablet and the agent can hardly keep still; a colleague teases her about MDRT;*
  - *a client asks about a commission rebate (illegal), and the agent hurries him outside to explain under her breath;*
  - *the recorded sale (双录) with the retired couple: Uncle has to answer the script in full, in Mandarin, and Auntie laughs at him;*
  - *a visitor photographs the gold dome and the guard sends her outside;*
  - *a delivery rider for upstairs is stopped at the gates;*
  - *an agent sounds out a young man by the door about joining (增员).*
  - *Not repeating: one at a time, each at most once per game day, drawn from a shuffled deck that is only reshuffled once every event has been seen; never the same event twice running; an event's variants take turns. All of this is kept in the save. The first event comes 35–70 s after you walk in, then one every 100–190 s. Walk out and the event is dropped: everyone goes back, and the visitors vanish.*
- *Speed gates (26 Nov) rebuilt as a modern head office has them:*
  - *a D-ended brushed-steel cabinet between each pair of lanes (before, the cabinets overlapped), with a black glass lid and a card pad;*
  - *tall curved glass wings that swing aside when a lane opens;*
  - *a face-recognition screen on a post at each entry (请刷脸通行 / 验证通过), red-cross and green-arrow lamps on the cabinet ends, and a light line along each lane;*
  - *glass balustrades with a steel handrail from the outer cabinets to the walls, where there had been nothing.*
- *Full check of the AIA lobby (26 Nov), every wall, corner, fitting and person, by day and by night, and every event run end to end. Fixed:*
  - *the receptionist stood inside the desk, which had 0.2 m to the wall: the desk moved forward;*
  - *she and the benefits manager were the same body side by side: she now wears a front-desk uniform (dark suit, red scarf);*
  - *she now keeps office hours (8:30–18:30);*
  - *the inner door leaves stood out into the room like loose glass panes: they now fold back against the wall;*
  - *the lifts had no buttons: steel architraves, amber floor displays and call buttons added;*
  - *the QR stand had no collider;*
  - *the consultation tables and chairs vanished after 19:00 with the people: furniture now stays, and only the cups, tablet and papers go;*
  - *seated clients reached out stiff-armed and their legs splayed out of the chairs: feet now rest under the knees, clients' hands in their laps, agents' on the table, and the clients sit nearer;*
  - *the directory listed outside tenants in a building AIA leases whole: it now lists AIA's own floors and the roof garden;*
  - *an English subtitle still had "Mr Wang" after she became a woman.*
- *Chairs and shadows (26 Nov):*
  - *The consultation chairs are proper club armchairs: rounded plinth, loose cushion, a reclined back with a stitched panel line, rolled arms, tapered walnut legs with brass cups, navy leather with grain and sheen.*
  - *By day the sun casts the shadows and the lamps' shadow slots are off, but indoors only the two nearest lamps cast at all, and at low quality nothing does. So furniture, columns, desks and people now sit on soft contact shadows (world/contactShadow.js), in both lobbies, at every quality.*
- *Why AIA: agents bring in about 85% of its new business value here, and protection is its core (AIA reporting via Chinese press).*

Sources: [Xinhua, 6 Aug 2025](http://www.news.cn/money/20250806/dd7961bc46974e17b0fb18ee873bef48/c.html), [AIA Life press release, 25 Jul 2025](https://www.aia.com.cn/zh-cn/aia/media/news/2025/20250725), [上海黄浦 on QQ News](https://news.qq.com/rain/a/20230124A00HHF00), [Shanghai Story Map](https://shanghaistorymap.com/places/north-china-daily-news-building/), [The Paper](https://www.thepaper.cn/newsDetail_forward_25836221), [Sohu, 3 Apr 2025](https://m.sohu.com/a/868811617_121247239/), [Sina blog, 2009](https://blog.sina.com.cn/s/blog_5caed31f0100b7i7.html), [Sina blog, 2017](https://blog.sina.com.cn/s/blog_7eb4315a0102wei7.html), [CLS on the rate cut](https://www.cls.cn/detail/2096535), [Beijing Daily on MDRT](https://xinwen.bjd.com.cn/content/s6694810ee4b07fbcccad8406.html), [字林大楼 (Wikipedia, Chinese)](https://zh.wikipedia.org/zh-cn/%E5%AD%97%E6%9E%97%E5%A4%A7%E6%A5%BC), [North China Daily News Building (Wikipedia)](https://en.wikipedia.org/wiki/North_China_Daily_News_Building), [Jan Hird Pokorny Associates](https://www.jhpokorny.com/projects/guilin), [Baidu Baike 字林大楼](https://baike.baidu.com/item/%E5%AD%97%E6%9E%97%E5%A4%A7%E6%A5%BC/2127046), [Yicai on AIA's 1992 licence](https://www.yicai.com/news/100007468.html), [NBD on AIA Life's 2020 conversion](https://www.nbd.com.cn/articles/2021-04-23/1713218.html), [Sina on AIA's history](https://finance.sina.cn/chanjing/gsxw/2019-05-10/detail-ihvhiews1085488.d.html).


*26 Nov 2026, the Peace Hotel lobby rebuilt from published descriptions of the 2007-10 restoration:*
- *An octagonal stained-glass laylight in warm yellows, geometric, on steel ribs (HBA: "octagonal stained glass ceiling with geometric patterns and warm yellow tones"; Arcplus: a double-layer steel octagonal skylight). It had been hidden above a plaster cap; it is now visible from the hall.*
- *The antique brass octagonal chandelier of black metal and translucent glass engraved with interlocking curves and V shapes (Gold Mantis).*
- *A silver-leaf relief of the Bund on the atrium's elevations (外滩景观银箔浮雕, Arcplus; Gold Mantis: "huge reliefs outlining the Bund in the era of the Republic of China"), here round the drum.*
- *Cream marble floors, with stones of other textures along the octagon's joints (Gold Mantis).*
- *Coffered-beam flat ceilings with simplified classical mouldings in pale tones over the arcades (井格梁平顶, 淡雅色调, Arcplus).*
- *Antique bronze openwork wall lights giving a dim, soft glow (古铜镂花壁灯, Arcplus).*
- *The glass peace dove given by the glass artist 施森彬 for the hotel's ninetieth year.*
- *Not from a source:* the pillars' form, the laylight's exact pattern, the inlay's stones and the Lalique-manner panels' motifs are the game's own, in the period's manner.

*26 Nov 2026, full check of the Peace Hotel lobby (every wall, corner, fitting and person, day and night). Fixed:*
- *The staff door's opening was cut at the wrong end of the west wall: a 2.4 m hole onto the street behind the guests, while the door itself stood on solid wall. It is now behind the door.*
- *The desks' walnut was one grain stretched across 8 m (rounded boxes had no metric UVs); now metric.*
- *A Lalique-manner panel overlapped the staff door's architrave and a sconce overlapped the other: both moved.*
- *The concierge wore a red track jacket: now a dark suit with the golden crossed keys of Les Clefs d'Or on his lapels. The front desk wears near-black with a gold name badge.*
- *The concierge's parcels hung in the air: a walnut shelf unit holds them.*
- *The lounge's armchairs were four rounded blocks: now proper club chairs in oxblood leather.*
- *The grand piano looked like a chaise longue (a solid slab, the lid raised at the tail). Rebuilt: the case with its straight and curved sides, open, with soundboard, gilt frame and strings; the lid hinged on the straight side on its stick; the keyboard with black keys, cheeks and fallboard; the music desk; legs on brass castors; the pedal lyre; a bench.*
- *The windows onto the Bund were bare holes: now bronze frames in three lights with a transom, a marble upstand, drapes tied back and a pelmet.*
- *The lifts had no call buttons: brass plates added.*
- *The drum's silver relief of the Bund read as blank blue panels: stronger relief, warmer, less mirror.*
- *The greetings said "good evening" at any hour: they now follow the time of day. The desk said the Jazz Bar began at 9:30 while the bar opens at 19:00 with the band from 20:00: the desk now says what the bar is doing at that hour.*
- *No.17's receptionist asked "which company?" in a building AIA has to itself: now "who are you here to see?".*

Sources: [HBA](https://hba.com/projects/fairmont-peace-hotel/), [Arcplus via The Paper](https://m.thepaper.cn/baijiahao_26000920), [Gold Mantis](https://www.goldmantis.com/case/250), [The Paper on the peace dove](https://www.thepaper.cn/newsDetail_forward_26059709), [Hospitality Design](https://hospitalitydesign.com/news/fairmont-peace-hotel-opens-in-shanghai/23575).

*26 Nov 2026, the Peace Hotel's lifts: who runs them (the research behind the lift lobby on master, world/interiors.js and world/lobbyGlass.js):*
- *Who presses the lift. Today nobody rides in the car. A guest writes that "there was always a member of the team eager to greet you and press the call button" (PointsWise). Another says staff were "pressing the elevator before we arrived at it" (Renae's World, 2026). Ctrip reviewers mention staff at the lift entrance and in the corridors. Inside, you tap your room card and press your floor yourself (Tripadvisor). The hotel did once have lift operators: 马 began at the hotel in 1964, aged 16, as one (China Daily, 2011). The old cage lift no longer runs (China Daily, 2015). The floors are numbered the British way, G then 1 (FLYERT); the 6th floor's lift line now reads "G · the lobby".*
- *Who they are. In 2015 the hotel set up a front-of-house team, the "Peace Ambassadors", in bespoke black tuxedos for the Art Deco lobby (Shanghai Daily, 21 Sep 2015). So the guard who stood at the lifts is gone; a Peace Ambassador waits by the call button.*
- *Fixed: the walnut pilasters stood in front of the two Lalique-manner panels between the lifts and split each in two. The panels now take the pilaster's place, which carries on above them.*

Sources: [PointsWise](https://pointswise.ca/fairmont-peace-hotel-shanghai-suite-review/), [Renae's World](https://renaesworld.com.au/fairmont-peace-hotel-shanghai-review-inside-the-legendary-luxury-hotel-on-the-bund/), [Ctrip reviews](https://wap.ctrip.com/html5/hotel/hoteldetail/dianping/375539.html), [Tripadvisor](https://www.tripadvisor.com/ShowUserReviews-g308272-d303020-r119284941-Fairmont_Peace_Hotel-Shanghai.html), [China Daily, 2011](https://covid-19.chinadaily.com.cn/life/2011-05/18/content_12533348.htm), [China Daily, 2015](https://www.chinadaily.com.cn/travel/2015-01/17/content_19337819_4.htm), [FLYERT](https://flyert.com.cn/forum.php?mobile=2&mod=viewthread&tid=4654926), [Shanghai Daily, 2015](https://archive.shine.cn/feature/mice/Stories-behind-upscale-hotel-uniforms/shdaily.shtml).

*26 Nov 2026, who is in the Peace Hotel's hall, and when (world/peaceGuests.js):*
- *Who may come in: "只有住店和餐饮的客人才可进入酒店" (only staying guests and diners), the desk told Jiemian (Jan 2024). Sightseers come on the hotel's paid museum tours, with sessions at 10:00, 11:00, 14:00 and 16:00 (China Daily via 163, Dec 2024; the hotel's museum page). Still, "大厅里，合影拍照的人络绎不绝" (a steady stream taking photos), and "前台办理入住和结账的中外宾客不断" (Chinese and foreign guests checking in and out without pause) (Chinanews, 2023). After 繁花 the hotel's searches rose 415% (Jiemian, 2024).*
- *Who stays: mostly couples, then people on their own, families and friends; few on business (Trip.com's November 2026 reviews; Oyster). Bellmen are at the door round the clock; check-in is from 15:00 and check-out by 12:00 (Fairmont). Breakfast is in the Jasmine Lounge, 7:00–10:30. The Jazz Bar is fullest from 21:00 to 23:00, and its suggested dress is retro or smart-casual (Sina, 2026). Cars set down on the Dianchi Road side, not on Nanjing Road (Fairmont).*
- *In the game: groups walk the hall between its places, the door, the desk, the octagon, the dove, the lifts and the Jazz Bar's door. Check-ins come with rolling cases, or with the bellman pushing his brass luggage cart. Check-outs come down from the lifts to settle at the desk and leave by the revolving door. A museum tour has a guide with a little red flag stopping under the dome and at the dove, where they take photos. Couples come in to photograph the hall; people dressed for the evening head to the Jazz Bar; guests come back from the Bund late at night. The groups are couples (some older), people alone, families with one or two children, a woman on business, friends together. How often they come follows the hour: the check-out rush before noon, the lull after, the check-in wave from three, the jazz crowd from six, quiet after half past eleven. The lounge's tables fill at breakfast and at afternoon tea (a tiered stand, tea). The desk staff and the doorman bow to them as they come up. People going up vanish by the lifts once you look away, and people coming down appear there only when you're not looking.*
- *Not from a source: the proportions and intervals, the routes, and which bodies play whom. The game's guests are its own crowd bodies, so faces repeat; the Friday qipao night isn't shown.*

*26 Nov 2026, what you hear in the Peace Hotel's hall (research):*
- *The Jasmine Lounge, off the octagon, has an antique Steinway, set at 45° in the middle of the room (Ctrip, 2020). Guests describe piano jazz at three in the afternoon from an older pianist (Qunar, 2017), and "intimate setting with piano music" (Tripadvisor). High tea runs 14:30–17:30 (SmartShanghai, 2020). The hotel's page today: "live jazz create a timeless setting for afternoon tea", and live jazz on Sundays (Fairmont). In the game an older pianist in black tie and glasses plays the lounge's grand piano from 14:30 to 17:30. The tunes are the game's own, written on the spot (engine/jazzPlayer.js, solo): the walking line in his left hand, a ballad tempo, his hands moving over the keys where the music is. Only the distance softens him in the open hall; outside the hotel he isn't heard.*
- *The Jazz Bar: the Old Jazz Band plays nightly (Fairmont), 19:00–23:30 with a second set about 21:30 and doors at 18:00 (Rachel Gouk, 2025; Sina, 2026), old songs among the standards (夜上海, 夜来香, 上海滩). At 19:00 the band walks in through the lobby under the octagon's stained glass (the band's manager, Tencent News, 2022). In the hall you hear it through the door, muffled (world/jazzBar.js). The game's hours for the band (20:00–00:30) are older than these sources.*
- *Recorded background music in the lobby, lift lobby or corridors: no source mentions any (in 2011 a music firm programmed the Jazz Bar and the mezzanine bar, not the lobby), so the game plays none there.*

Sources: [Fairmont: Jasmine Lounge](https://www.fairmont.com/en/hotels/shanghai/fairmont-peace-hotel/dining/jasmine-lounge.restaurant.html), [Fairmont: dining](https://www.fairmont.com/en/hotels/shanghai/fairmont-peace-hotel/dining.html), [Ctrip, 2020](https://gs.ctrip.com/html5/you/foods/fooddetail/2015074/5006420.html), [Qunar, 2017](https://touch.go.qunar.com/poi/11622598), [SmartShanghai](https://www.smartshanghai.com/venue/6201/Jasmine_Lounge), [Rachel Gouk, 2025](https://rachelgouk.com/?p=21515), [Sina, 2026](https://ent.sina.cn/2026-07-03/detail-inifnxny5581921.d.html), [Tencent News, 2022](https://news.qq.com/rain/a/20221009A00X8H00), [Prescriptive Music, 2011](https://rxmusic.com/company/news/welcome-to-fairmont-peace-hotel-in-shanghai-china/).

*26 Nov 2026, room 612 rebuilt (world/room612.js) from what guests and the restoration's designers describe of the hotel's rooms since 2010:*
- *The entry: vintage herringbone parquet (复古斜纹地板, Flyert 2024), with the minibar there (Flyert 2024). It holds a capsule coffee machine and tea (Flyert 2024–25), and there is a wardrobe.*
- *The room: a dark-gold carpet (暗金色底色的地毯; "地毯的图案" stays with guests, Flyert 2024/2025), here with an Art Deco lattice and fans. Walls in the hotel's soft "buff and blue-grey" scheme over a walnut-burl dado (HBA, 2009: "walnut burl grain wood paneling", "antique bronze and polished nickel"), with a cornice and a coffered ceiling ("original intricate cornices and coffers").*
- *A 2 m bed with a leather headboard (皮质的床头, Flyert 2024). Two pink glass table lamps (两只粉红琉璃台灯, Flyert 2025) with pale-yellow shades (浅黄色灯罩, Flyert 2024).*
- *A solid-wood desk (实木书桌) whose chair has a dark-red velvet back (暗红色天鹅绒靠背), and a brown corduroy sofa (咖啡色灯芯绒) (Flyert 2024). The television is hidden in a cabinet beside the sofa (Flyert 2024, 2025). Porcelain and oil paintings (Flyert 2025). A welcome letter by the fruit (PointsWise).*
- *Double-glazed windows that don't open (双层玻璃, 无法打开), and old-fashioned drapes tied back with bands (古朴, 绑带) (Flyert 2025). Here they are blue-grey with sheers, under a pelmet.*
- *The bathroom: a black marble floor and counter, white marble walls (黑色系 / 白色系, Flyert 2024). A free-standing tub on decorative legs in the middle (欧式带装饰腿, Jiemian 2017; PointsWise). A separate rain shower, two basins, the WC in its own room, and a small television in the marble by the tub (PointsWise). Robes and slippers.*
- *The windows, the mirrors and the shower's glass give back the room (world/lobbyGlass.js, as in the lobbies: Fresnel-weighted glass, and mirrors, on box-projected captures of the room and of the bathroom). The corridors are now green, as described (green walls, dark wooden doors, openwork sconces, Jiemian 2017).*
- *New things to do: make a coffee (4 minutes), read the welcome letter, and wash your face at the basin.*
- *And, since: a bath in the free-standing tub (half an hour; rested); the television, which rises from its cabinet and shows the game's own city news and tomorrow's weather; the bedside switch (all the lamps off or on); the drapes, drawn across or tied back; and the room phone to the concierge (desk set on the writing desk). The concierge can book a Kuaima to Lujiazui, Xintiandi or Jing'an (the pick-up on Zhongshan Road at Hankou Road) or put you through to in-room dining. Its three dishes are a club sandwich with tea, wontons and pan-fried buns, or Shanghai borscht with a pork cutlet; they are charged to the room and arrive with a knock about 25 minutes later, set on the desk to eat.*
- *The turndown (5–8 pm at the hotel, BolehMiles 2026; Flyert 2024: duvet corner folded, a glass of water, curtains drawn): from 18:30, while you're out, once a night. The drapes are drawn, only the bedside lamps left on, the duvet's corner turned back, water and a glass by the bed, a mat for the slippers, the hotel's booklet and a card with tomorrow's weather on the bed. Sleeping clears it. The weather is the month's usual range in Shanghai with a day's own swing, and keeps to skies the game can show. The menu, its prices and the news are the game's own.*
- *Not from a source: the headboard's form and colour, the carpet's pattern, the paintings' subjects, the drapes' colour, the layout within the room.*
- *Honest note: the real hotel's standard rooms (Deluxe 45 m², Fairmont 49 m²) look onto the courtyard or the city (Nanjing Road). River views come with the suites: the Signature Riverview and Nine Nations suites (178 m², the Nine Nations on 5F–7F) and the Sassoon Suite (Accor; Sohu 2021). The game keeps 612 on the Bund for its story. To be exact it would be a river-view suite (the desk's line says "江景房").*

Sources: [Flyert, 2024](https://flyert.com.cn/forum.php?mod=viewthread&tid=4559150), [Flyert, 2025](https://flyert.com.cn/forum.php?mod=viewthread&tid=4700515), [HBA press release, 2009](https://journaldespalaces.com/en/pressrelease-22701), [Hospitality Net, 2010](https://www.hospitalitynet.org/news/4047629), [Jiemian, 2017](https://www.jiemian.com/article/1063379.html), [PointsWise](https://pointswise.ca/fairmont-peace-hotel-shanghai-suite-review/), [Accor: Fairmont Peace Hotel](https://all.accor.com/hotel/A5G7/index.en.shtml), [Sohu, 2021](https://www.sohu.com/a/470520348_99990028).

- *The crowd reads as cloned (too few outfits; people walk in files along the parapet).*
- *Tram riders' arms pass through the window pillar.*
- *Pudong lights up before the Bund floods at 17:20.*
- *The Yangpu Bridge pulled into the centre of the Bund vista.*
- *Henan Road's street-name boards are blank.*

Sources: [apple.com.cn Nanjing East](https://www.apple.com.cn/retail/nanjingeast/), [Henderson Metropolitan](https://www.hld.com/en/properties-in-mainland-china/properties-for-lease/henderson-metropolitan), [The Bund (Wikipedia)](https://en.wikipedia.org/wiki/The_Bund), [thepaper.cn](https://www.thepaper.cn/newsDetail_forward_5700079).
