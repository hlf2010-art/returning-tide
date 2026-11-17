# 回潮 Returning Tide — people (the protagonist and his friends)

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
- **Look:** 1.80 m, lean. Dark grey technical jacket, black jeans, white trainers, a cheap steel
  watch he refuses to replace. (The player body is Rocketbox Male_Adult_07; only his hands are seen.)
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
2. **许若安 Xu Ruoan, 27, architect.**
   - **Background:** her parents are both professors at Southeast University. She studied
     architecture at Tongji and is now a junior designer at a firm restoring Bund-era buildings.
   - **Personality:** dry, observant, the moral compass and Jibai's oldest friend. Some people assume
     there is more between them. There isn't, yet.
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

- **许知微 Xu Zhiwei, 28.** Project manager at his firm. Workplace chemistry, rivalry, trust.
- **沈南星 Shen Nanxing, 26.** Independent photographer. The city at night; freedom.
- **顾念 Gu Nian, 29.** Architect. Steadiness; the long term.
- **林予安 Lin Yu'an, 27.** From his San Francisco years. What was left unsaid.
- **唐可昕 Tang Kexin, 25.** Lifestyle creator (about 180K on Xiaohongshu, 90K on Douyin).
  Exposure and privacy.
