# 回潮 Returning Tide — people (the protagonist and his friends)

## Canon status (Character Bible v2.2, 17 Nov 2026)

The shared Character Bible (Notion: Documents › Character Bible) decides who these people are. Its
labels are used here too: **LOCKED** (decided by the owner, or an approved Fxx face; never changed
without asking), **WORKING** (built or supported by older material, not yet confirmed), **PROPOSAL**
(story material open for discussion) and **OPEN** (undecided: not filled in by guesswork). When
sources disagree: the owner's recent decision > an approved Fxx Hero > older concept sheets > story
proposals.

| ID | Who | LOCKED | ADOPTED (decided 2026-11-18 under the owner's delegation; canon for the game until the owner says otherwise) | OPEN |
|---|---|---|---|---|
| P01 | 纪白 Ji Bai, 27 | 27, Nanjing, UC Berkeley cognitive science, AI/digital consulting in Shanghai; black, full, slightly wavy short hair; black jacket, white tee, loose dark trousers, white trainers | **180 cm** (the height his 3D model was built at; the old 178 cm concept figure is retired); born 1999, Nanjing Foreign Language School class of 2017, Berkeley 2017-2021, Silicon Valley 2021-2026; his father's business and the year's deadline | starting salary detail beyond the game's ¥42,000 |
| F01 | 许知微 Xu Zhiwei, 28 | 178 cm; product & industrial designer (not a brand/visual creative director); the F01 Approved Hero face (`docs/zhiwei-reference.jpg`): short light ash-blonde layered hair with dark roots, thin silver glasses, narrow almond eyes; black knitwear; cool, uncompromising | industrial design at the China Academy of Art, Hangzhou (2016-2020); straight into the product & design practice of Marlowe Finch (the game's invented consulting firm): connected appliances and medical devices with their apps, then enterprise AI; six years there; on his engagement she leads product design and runs delivery; from Hangzhou; no history with Ji Bai before his first day; Singapore in Act IV | an orthographic turnaround and her own 3D model (blocked on art, not on a decision) |
| F02 | 沈南星 Shen Nanxing, 26 | dark, full, short curly hair; an easy smile; photography as a way of seeing | 26, 165 cm, from Kunming; Lisbon | an approved face; family background |
| F03 | 顾念 Gu Nian, 29 | 29, 170 cm; tech investor & strategist, warm / exacting; the F03 face (`docs/gunian-reference.webp`); the ivory-suit look; she will not invest in a man she is dating (her own principle: declaring it to her LPs would be governance, not a ban), but she judges his product honestly | Fudan CS 2015-2019, two years as a hardware PM in Shenzhen, INSEAD (the Singapore campus is her family-office network), four years in venture; partner at a small fund in the AIA Building; tells her partners 11 Jan 2027, recuses from new deals that day, hands over to the end of March; **慢潮资本 Slow Tide Capital: an RMB fund** anchored by the Yangpu district guidance fund (hence registered and housed in Yangpu, upstairs from the makerspace), Hong Kong and Singapore family offices via Shanghai's QFLP scheme, a Beijing fund of funds; **first close ¥200 million (7 Jun 2027) against a ¥300 million target**; first investment (6 Sep 2027) AnBan 安伴, Song Chi's elder-care camera: temporal model, on-device, data from 100 consenting homes; her due diligence tested false alarms and missed falls; Xuhui flat; Act V is the original Act V | none open for the story |
| F04 | 林予安 Lin Yu'an, 27 | the canonical name; the old drafts' 许若安 Ruoan is the same person (one id, `yuan`); 27, 167 cm; architect & urban-space researcher; the F04 face (`docs/yuan-reference.jpg`): shoulder-length dark layered hair with a slight wave, thin metal glasses, dark blazer over black; calm, principled | his oldest friend (NFLS class of 2017); Tongji architecture 2017-2022; **San Francisco kept**: a J-1 visiting researcher at a UC Berkeley-affiliated urban-research centre 2022-2024, together with him in all but name; the J-1's two-year home-residency rule sent her home and keeps her from US work until autumn 2026, so the 2027 offer (a university-affiliated post, no H-1B lottery) is the first she could take; junior architect at a Bund heritage firm since 2024; her dissent on a lane renewal behind the Bund, won through the residents' consultation (留房留人); phase two as resident architect and community planner, or San Francisco; the lamp she sends for his flat | an orthographic turnaround and her own 3D model |
| F05 | 唐可昕 Tang Kexin, 25 | her name; energy, sport and lifestyle; the pink sporty look; never a flat always-happy character | 25, 160 cm; follower numbers; knows Momo | an approved face; real numbers; any earlier history with him |

The six friends are the game's built six (Ji Bai, Mingxuan and Momo; Yu'an, Zhixia and Yinuo). The older concept of "four men and two women" is retired. Of the five women he might love, only Lin Yu'an is also one of the six.

Bodies: only Ji Bai and Gu Nian have their own 3D models. Zhiwei is the Rocketbox woman `c4` (at 1.78 m
when standing), Lin Yu'an is `c1` (at 1.67 m) in every scene, friend or romance. Their phone avatars and
relationship-map cards are their approved faces (`public/people/zhiwei/`, `public/people/yuan/`).

Voices: when a recorded line's text changes, the old line stays in `tools/voice/lines.json` as
`DEPRECATED` (its recording is kept) and the new one is added as `VO_PENDING` (subtitles until
`tools/voice/generate.py` records it).

## The protagonist — 纪白 Ji Bai (old friends call him 白白 only to annoy him), 27

- **Home:** Nanjing, Gulou district. His father, 纪建国 Ji Jianguo, built a precision-manufacturing
  business (bearing housings, then EV drivetrain parts) from one workshop in Jiangning and expects
  him to take it over. His mother, 周岚 Zhou Lan, is a cardiologist at Gulou Hospital. An only child.
- **Education:** UC Berkeley, B.A. in Cognitive Science: human-computer interaction, AI, product
  development. He took the machine-learning and systems courses the CS majors took, and spent
  his evenings in the Invention Lab.
- **Before:** a few years in Silicon Valley's tech industry, building AI products end to end: the
  data pipelines, the models, getting them small enough to run on a device, and later the agents
  that act on a user's behalf. He came back with savings and some cashed-out stock, not a fortune.
- **Now:** he joins an international technology consulting firm in Lujiazui, working on enterprise
  AI products and digital transformation. (The firm is invented.)
- **What he can do (a 2026 kind of engineer):** three things at once, and the interesting work is
  where they meet (`src/engine/skills.js`):
  - *Software & AI* (软件与 AI): Python, firmware in C, data collection and labelling, training and
    evaluating small models, quantising them for on-device inference (an NPU, a microcontroller),
    multimodal models and agents. He lands strong here (level 4 of 5).
  - *Product* (产品): watching people use a thing, turning complaints into problems, deciding what
    not to build. He lands at level 3.
  - *Hardware* (硬件, the Maker XP): soldering, 3D printing, mechanisms, sensors. He was good at the
    bench at Berkeley and hasn't touched one in three years: he lands rusty (level 1), and the
    Yangpu makerspace is where it comes back.
  - Together: the robot arm's dropped parts (`src/world/destScripts.js`) can be answered at the
    bench (softer pads), with data (log the motors at a kilohertz), with a sensor and a model
    (a slip sensor in the fingertip, a small model on the controller), with vision (a grasp-point
    model), or as a product question (does the customer need forty a minute?). At the firm he
    builds a real agent for a bank's back office instead of a click-through, argues for models
    that run where the data lives, and puts evaluation before any number in a deck.
- **The premise:** he has given himself one year to establish a life of his own in Shanghai before
  a dinner with his father at the Peace Hotel. The year is played as 17 days in five acts
  (`src/engine/year.js`): New Beginnings, Corporate Reality, Turning Point, Building a Life, The
  Final Dinner. Founding a company is one road; staying in consulting, changing employers, going
  home to the family business and other choices are others.
- **Temperament:** quick, funny, impatient with anything slow. He fixes things that aren't his to
  fix. Generous without being careless. He hates being "the rich kid". Good with systems and worse
  with people he loves.
- **What he makes:** he still builds things in his spare time at a rented bench in Yangpu: hardware
  with software in it, the board and the model on the board. The night gimbal
  (`src/engine/studio.js`) is that side of him: optional, and his own.
- **Look:** tall and lean, 180 cm (adopted 2026-11-18; the old 178 cm is retired). Black, full, slightly
  wavy short hair; a black jacket, white tee, loose dark trousers, white trainers; a cheap steel watch he
  refuses to replace. (His own 3D body: below.)
- **Before he was twelve** he spent every summer at Old Zhou's watch-repair stall on Hankou Road.
  Old Zhou is missing. That is Mission One, and it stays a thread through the year.

### How he looks (`docs/jibai-reference.webp`, the character sheet)

Tall and lean, a clean-shaven Chinese face with a defined jaw; thick black hair, worn longer and tousled, falling over his forehead. His everyday outfit: a black zip-front work jacket (collar up a little), a plain white crew-neck tee, loose black trousers, white trainers, a black backpack, a dark-faced watch. Outfit variations on the sheet: business (black suit, tie, briefcase), smart casual (white shirt, chinos), streetwear (black hoodie, cargo trousers, cap), travel (beige jacket, shorts). Reading glasses at the laptop. Eight expressions: neutral, smile, laugh, serious, thinking, surprised, concerned, sad.

In the game: the character page shows the sheet's portrait (`public/people/jibai/hero.jpg`) and his face today from the expressions (`face-*.jpg`, chosen by `moodOf` in `src/world/profileView.js`). The 3D body (`public/people/player.glb`) is him: generated from the sheet's A-pose views with Hunyuan 3D and rigged with the game's Biped skeleton (`tools/jibai/`), so he walks, runs and holds his phone with the same clips as before; the character page's 3D view and the first-person body are this model.

## The five (Nanjing Foreign Language School, class of 2017; group chat: 「金陵五虎+1」, renamed weekly)

1. **陆明轩 Lu Mingxuan ("Xuan"), 27, venture capital.**
   - **Background:** son of a Nanjing property developer; an LSE graduate. He's an analyst at a
     Lujiazui fund and wants to be a partner by 30. He lives in a serviced apartment in Lujiazui.
   - **Personality:** smooth, connected, competitive with Jibai since they were 12. Loyal in a crisis,
     petty about restaurants.
   - **In play:** he introduces deals and people (the business-connection line). He asks Jibai to
     look at a startup's prototype (a favour that becomes a mission). He notices cars.
2. **林予安 Lin Yu'an, 27, architect and urban-space researcher** (Character Bible F04). The old
   drafts called her 许若安 Xu Ruoan: it is the same person, with one id (`yuan`), one chat and one
   body. She is also one of the five he might come to love (below), the only one who is a friend first.
   - **Background:** her parents are both professors at Southeast University. She studied
     architecture at Tongji, spent two years in San Francisco on an urban-research job while he was
     in the Bay (on a J-1 visiting-researcher visa, 2022-2024; its two-year home-residency rule is why she came home), and has been at a firm restoring Bund-era buildings since 2024. What she cares about is
     the people who live in old buildings and lanes, not nostalgia.
   - **Personality:** calm, principled, dry, observant; the moral compass and Ji Bai's oldest friend;
     the only one of the six who is not an heir. Some people assume there is more between them. What
     there was, in San Francisco, nobody in the group knows.
   - **In play:** she knows the Peace Hotel and AIA interiors professionally, which opens restricted
     doors. She gives opinions on any property he considers, and gets genuinely involved in
     furnishing it.
3. **周子墨 Zhou Zimo ("Momo"), 26, musician and content creator.**
   - **Background:** heir to a Nanjing pharmaceutical fortune. He dropped out of Berklee and plays
     keys in a jazz trio that sometimes sits in at the Peace Hotel's bar. He has 1.2 M followers.
   - **Personality:** charming, chaotic, kind, broke despite the money (his father cut him off).
   - **In play:** invites the player to gigs and parties, borrows things, crashes on sofas. He's the
     friend who posts your new car before you have parked it.
4. **韩知夏 Han Zhixia, 27, motorsport and EV engineering.**
   - **Background:** a family of auto-parts suppliers (a rival of Jibai's father, an old joke). She
     studied mechanical engineering at Tsinghua, races amateur GT at Shanghai International Circuit,
     and works on battery thermal systems at an EV start-up in Jiading.
   - **Personality:** direct, fiercely competent, competitive.
   - **In play:** she has opinions on Ferrari versus Porsche, arranges track days, and wants Jibai to
     co-build something (a race-telemetry device). She's a test-drive ally.
5. **程以诺 Cheng Yinuo, 27, family-office heir and art adviser.**
   - **Background:** her family owns logistics and cold chain businesses. She studied art history at
     the Courtauld, now runs the family office's art and real-estate portfolio, and splits her time
     between Shanghai and Hong Kong.
   - **Personality:** elegant, private, more serious than she lets on, and lonely.
   - **In play:** she knows the agents and the penthouses and opens doors to exclusive listings and
     helicopter charters. Her storyline is about what family money costs.

**How their lives move without the player:** each friend has an agenda of weekly beats (work
crises, dates, trips, a promotion, a fallout). The beats arrive as WeChat messages, voice notes,
calls, invitations and favours. Some are time-limited, and ignoring them has consequences
(friendship values drift, a missed party is talked about, a favour goes to someone else).
Purchases, places and other people feed back into what they say.

## The five he might come to love (`src/engine/hearts.js`, `src/world/romance.js`)

Gu Nian has her own model, from her character sheet (Hunyuan 3D, rigged as Ji Bai's: `public/people/gunian.glb`, `tools/jibai/README.md`): long dark wavy hair, a cream blazer, a silk camisole and wide cream trousers, pointed heels. Her scenes use it (`avatar: ['gunian', ...]`). Her character sheet is `docs/gunian-reference.webp`; its portrait and eight expressions (`public/people/gunian/`) are her phone avatar and her card on the character page's relationship map (her face follows where things stand: serious when they've only met, smiling when they're seeing each other, calm when it's over).

Each has a life, a schedule and ambitions of their own. They write first, ask him out, are busy,
disagree with him, and leave. Details and what is playable for each: `docs/relationships.md`.

- **许知微 Xu Zhiwei, 28, 178 cm** (F01). A product and industrial designer: she judges digital products,
  physical objects and whether people can really use them in the same breath. At his firm she leads
  product design on his first engagement and runs its delivery. China Academy of Art, industrial design, then six years in the firm's product & design practice. Cool and
  uncompromising; her standards are her own. Workplace chemistry, rivalry, trust. Look: the F01
  Approved Hero (`docs/zhiwei-reference.jpg`): short light ash-blonde layered hair with dark roots,
  thin silver metal-frame glasses, black knitwear, silver rings, headphones on the way home. Her
  sponsor is the partner, Raymond He (贺维安), the same man in her romance and at work.
- **沈南星 Shen Nanxing, 26.** Independent photographer. The city at night; freedom.
- **顾念 Gu Nian, 29, 170 cm** (F03). Tech investor and strategist. The long term; a conflict of interest.
  Slow Tide is an RMB fund: the Yangpu district guidance fund is its anchor (which is why it is registered
  and housed in Yangpu), Hong Kong and Singapore family offices come in through Shanghai's QFLP scheme,
  and its first close is ¥200 million against a ¥300 million target.
  - **Background:** Shanghai-born (a lane in Jing'an; her mother is a retired maths teacher).
    Computer science at Fudan, two years as a product manager at a Shenzhen hardware company, an
    MBA abroad (INSEAD). Now the youngest partner at a small early-stage fund upstairs in the AIA
    Building: early-stage innovation, consumer tech, new lifestyle ventures. In spring she leaves to
    raise a fund of her own, 慢潮资本 Slow Tide Capital, two rooms upstairs from the Yangpu
    makerspace. Her line: 「投资的不只是项目，也是人，以及一个更大的可能。」
  - **Personality** (the sheet's traits): intelligent, rational, empathetic, independent, strategic,
    emotionally reserved. Sharp and quick across a table, and she cares more about long-term,
    meaningful impact than a fast exit. In love she is slower and less sure of herself than in the
    boardroom; she shows care by paying attention, not by saying it. She is nobody's option.
  - **In play:** she is not one of his friends (she knows Mingxuan only as a junior analyst at
    another fund). They meet over a start-up's fall-detection camera that fails in the AIA lobby's
    evening light, and he tells her why. She is the one investor who will never put money into
    him while they are together (her own principle, stricter than any rule: declaring it to her
    investors would be a governance step, not a ban), and the one
    who tells him most honestly what is wrong with his deck. When his project reaches a small batch
    or launches (`src/world/allotEvents.js`), her fund wants a meeting, unless he is seeing her.
  - **Look:** long dark-brown wavy hair, soft almond eyes, pearl earrings; at work an ivory blazer
    over a pale champagne draped top, matching wide trousers, ivory pointed low heels; off duty a cream
    knit. (Her model stands 1.73 m with the heels.)
  - **Her year, against the Bible's five acts:** I the AIA lobby (she explains why she tests the camera
    downstairs: upstairs is lit like an operating theatre, homes are not); II Lujiazui from the railing,
    every lit window a bet; III the roadshow (Hong Kong, Singapore, Beijing), slow to answer, and her
    life does not pause for him; IV first close, the Jazz Bar, and her fund's first investment is the
    camera, with why it now works and her own due diligence; V unchanged from the original Act V (she
    asks the second time; her ending reads the dinner). Day 7 she tells her partners off screen
    (`disclosure_to_partner`); day 9 she tells him (`message_to_ji_bai`). After his small batch or
    launch she writes once each: a meeting if they are not together, only advice if they are.
- **林予安 Lin Yu'an, 27, 167 cm** (F04), his oldest friend (above). What was left unsaid in San
  Francisco. Her own fight over an old lane behind the Bund, an offer to go back to San Francisco for
  two years, and a September answer: San Francisco, or the lane. Advanced by honesty, not attendance.
- **唐可昕 Tang Kexin, 25.** Lifestyle creator (about 180K on Xiaohongshu, 90K on Douyin).
  Exposure and privacy.
