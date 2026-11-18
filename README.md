# 回潮 Returning Tide — milestone 3: Mission One, “The Wrong Handoff”

First playable slice of a contemporary Shanghai RPG. First-person, blue hour, just after rain:
one short street (Hankou Road), ~155 m of the Bund promenade with two conversing residents, and Pudong across the Huangpu as scenery.

![Pudong from the river railing](docs/arrival.png)

## In this build

- **Time is the resource:** between the acts, weeks pass in a night, and you plan how the evenings went: making things, one person, friends and family, business, rest. A preview says what that will come to before you commit; energy and burnout; the gimbal's road to a launch (production-ready, a small batch, launched) and what a launch brings both ways (an offer, a promotion, followers; a Taobao knock-off, an HR complaint, a friend wanting equity, a big company's call). Two ending variants: "built it, but alone" and "wanted everything". See `docs/time.md`.
- **The character page (I):** who Ji Bai is today, his three skills and what he's made, quests in progress, money, reputation, his things, home, car and company, and everyone he knows on a relationship map.
- **Ji Bai's AI side in the story:** the robot-arm review and the investor demo follow what he proposed (log the data, a slip sensor and a model on the controller, a vision model, new pads); at the consultancy he builds a real reconciliation agent or mocks one up, decides where the bank's model runs, and fixes the redaction model.
- **The day starts at 4:20 pm:** the low sun on the Bund, the sunset at about 4:55, the floodlights from 5:10; time enough to cross to Lujiazui by Line 2 or the ferry first.

- **Metro Line 2 (East Nanjing Road ⇄ Lujiazui), walked and ridden:** down Exit 7 or 2 (Henan Road) or Lujiazui's Exits 6 and 4 into a real concourse; with a bag, security stops you until it's been through the X-ray (E at the belt); E at a gate taps Alipay's transit code (¥3, charged on the way out); escalators (they carry you) or the stair down to an island platform behind screen doors; a real 8-car train every minute each way (5:30–23:00), the alert tone and announcements in Mandarin and English, doors that open on the left; ride it under the river (about 90 s): over every door a screen and a lit strip map of the whole line (this station red, the next green), printed line maps above the windows; individual stainless seats with the orange priority seats (爱心专座) at the car ends. Crowds follow the hour (a full car in the rush) (the morning and evening rush, a quiet midday); the stations shut their shutters after the last train (about 23:15 to 5:15). Commuters, riders and staff; procedural station and train sound. See `docs/metro.md`.
- **Getting around:** the Bund–Lujiazui ferry from the cruise pier (E at the green ferry board; every 15 min, 06:00–23:00, ¥2) and back from the ferry sign on West Lujiazui Road; DiDi as before.
- **The notebook:** E at the desk in 612 (or N) opens Ji Bai's notebook: handwriting and pen sketches (the first week, the night gimbal before it exists, the robot arm, Dad); ← → turn the pages.
- **The Huracán:** E at the parked car starts the purchase (Zhixia sends the dealer's card); Vivian offers a test drive ("Can I take it for a drive?"); a bought car is delivered on day 7 and drives from either side.
- **Voices:** every scripted line is recorded in Mandarin and English (1,491 clips, Kokoro-82M via `tools/voice/generate.py`); only lines made up at runtime (free conversation, lines with live numbers) fall back to subtitles. The browser's synthetic speech is never used.
- **Phone:** voice notes play with a progress bar (↑/↓ and Enter, or click), videos play in the chat, calls play their recorded lines.
- **Streets:** pedestrians look ahead and pass each other, use kerbs and crossings without sticking, and flinch when they do brush; Manner has two baristas at work; the buses are painted metal with glass and an interior.
- **UI:** Bund Deco (`src/ui/deco.css`, on the shared tokens in `src/ui/fonts.js`; icons in `src/ui/icons.js`), in the manner of the title screen, the character page and the season screen: river-night panels with a gold double rule, chamfered gold plaques for the main action, Cormorant / Noto Serif lettering spaced wide, Poiret One for small labels. It replaced the earlier liquid-glass layer; the phone keeps its own glass, as a 2026 phone would. Icons stand in where a word isn't needed.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
```

`npm run build && npm run preview` serves the production build on :4173.
Needs a desktop browser with WebGL2, a keyboard and a mouse.

## Controls

| | |
|---|---|
| W A S D / arrows | walk |
| Shift | hurry (a run; ~45 s flat out before you must stop and catch your breath; a slim bar shows your stamina) |
| Space | jump (a short hop; barriers stay solid) |
| Mouse | look (click the page to capture the pointer) |
| E | the one interaction key: talk / read / look at the selected target; confirm the highlighted choice; **hold** on "break the seal" |
| W / S, ↑ / ↓, wheel | while talking or looking at the pouch: move the highlighted choice |
| Tab (hold) | minimap |
| P | your phone (Esc: back) |
| U | open / close your umbrella (once you've bought one and have it with you) |
| H | noise cancelling on / off (once you have the headphones with you) |
| 1–4 | in a DiDi: answer the driver (engage / short answer / change the subject / say nothing); at a friend's place, answer them the same way |
| E (sat at a table) | stand up again (the Jazz Bar) |
| W / S, A / D, Space | at the wheel of your Huracán: throttle / brake (hold S once stopped to reverse), steer, handbrake |
| V · H · E | at the wheel: chase camera or the driver's seat · horn · get out (once stopped; it stays parked there) |
| T | talk to whoever you're looking at, in your own words (see *Talking to people*); in a DiDi, to the driver |
| Enter · Tab · Esc | in a conversation: send what you typed · speak instead (Mandarin or English; the 中/EN button picks) · leave |
| G | photo mode, once you've built the night gimbal (wheel or [ ] zoom, Space or click to shoot, G or Esc to lower) |
| E (at the bottom of the metro stairs) | at the entrance: Line 2 one stop to Lujiazui (¥3); at the exit sign: through the concourse and out of the other exit |
| Settings → Graphics | presets (Low / Mac M4 / High / Ultra), resolution, frame cap, detail and density, effects |
| C | subtitles on / off |
| M | the map (click a place for a waypoint) · **Shift+M** sound on / off |
| J | the journal: quests, their steps, waiting until a quest's time, the people in your life, and (the Work tab) where your own gimbal stands |
| I | the character page: overview, skills, quests, money, reputation, belongings and property, the people (a relationship map); ← → or 1-7 change tabs, I or Esc closes |
| N | your notebook, to read anywhere (you write in it at a desk: E at the desk in room 612, or at your bench in Yangpu); 1-4 turn its pages, Esc closes |
| E (looking at someone taking a photo, after dark) | lend them the night gimbal, once you've built it |
| Gamepad | left stick walk, right stick look, A act, B back, X jump, Y phone, LB journal, RB map, d-pad 1-4, Menu pause |
| Esc → Saves | three save slots: copy, load, export to a file, import |
| Esc | back out of an open conversation / close-up / notice; otherwise pause (Resume / Settings). With pointer lock the browser takes Esc: it releases the mouse and the game pauses, which also cancels any open interaction |

## Mission One — 错交 “The Wrong Handoff” (3–5 min)

Old Lin asks you to fetch a sealed document pouch that Zhou's family supposedly left on the counter of
Zhou's shuttered watch-repair stall on Hankou Road. The label is written in red marker, in Shanghainese,
in the same hand as the threat scrawled over Zhou's missing-person notice. Take it sealed, or select "break the seal" and hold **E**
to break the seal: inside is a stall-transfer agreement signed in Zhou's name and dated **31 October**,
two days after he was last seen (29 October, per the notice and Lin), with the new holder's name left
blank. Opening it is permanent: the torn seal shows in your hand, in Lin's hands, and Lin remarks on it.

| Step | Where | How |
|---|---|---|
| Offer | Old Lin, river railing | **E** talk → "Agree" highlighted, **E** confirms (**S** + **E** "Not now", or **Esc**: he asks again next time) |
| Collect | Zhou's stall, north side of Hankou Road | look at the pouch on the counter, **E** |
| Decide | close-up view | **E** "Take it, sealed" · **S** then hold **E** ~1 s "Break the seal" · **Esc** leave it |
| Deliver | Old Lin | **E** hand over → completion card, Lin keeps the pouch, closing thought |

Outcomes: `sealed` (agreement kept, contents unknown) or `opened` (discrepancy known, tampering visible).
Greeting Lin before the pickup gets a reminder; the stall has nothing on it before the mission starts.

**Temporary developer controls** (dev server, or any build with `?dev`): **F8** restart Mission One from
the pickup step, **F9** reset it to not-started. Both close any open view first.

**Integration surface** (`src/engine/wrongHandoff.js`, live instance at `window.__bund.mission`):

```js
mission.start(source)            // idle -> collect; false if already running/complete
mission.reset()                  // back to idle from any step (world + HUD follow)
mission.on('start' | 'change' | 'complete' | 'reset', fn)   // returns an unsubscribe fn
// 'complete' payload: { outcome: 'sealed' | 'opened', seconds, source }
mission.step / .sealed / .outcome / .snapshot()
```

## Interaction loop (one key)

**E** is the only interaction key. Walking about, the game picks **one** target, never two:
within reach, roughly in front of the eye, on the same level, and not hidden behind a wall or a
person (`src/engine/targeting.js`). The prompt names the target and what E will do
(`老林 Old Lin  交谈 · Talk`, `文件袋 Pouch  查看 · Look`, `寻人启事 Notice  查看 · Read`).

Input priority (`src/main.js`, first match wins, one key press = one action): global toggles
(M, C, F8/F9) → entry screen → pause → the open interaction (it alone owns E, W/S/wheel, Esc) →
walking (E acts on the selected target). Opening and closing any interaction goes through one pair
of helpers: movement off / on, held keys forgotten, the camera left where it is.

Loop: approach Old Lin → **E** → "Agree" (**E**) → the stall → **E** on the pouch → choose
("Take it, sealed" or hold **E** on "Break the seal") → back to Old Lin → **E** → his response
depends on the seal. The earlier extra "F: look at the carried pouch" is gone: the choice is made
once, at the counter.

**Voicing.** No line in the project has a recorded voice; all spoken lines use the existing
Mandarin TTS fallback and the existing subtitle bar. Mission One's seven lines for Old Lin
(`T.mission.lines`) are spoken that way like every other line. Everything else Mission One shows
is **text only, unvoiced**: the choice labels, prompts, the objective panel, the pouch and document
descriptions, the completion card and the closing thoughts.

## The Hankou Road crossing: signals and through traffic

The zebra at the foot of the promenade stair is now a working signal-controlled crossing on
Zhongshan East 1st Road: 7 vehicles in the two inner lanes each way (straight through only),
4 background pedestrians (one elderly and slow), Chinese-style signals (horizontal red-yellow-green
mast-arm heads with countdowns, red standing / green walking pedestrian heads with countdowns).

- **One authority** (`src/engine/traffic.js`, `createSignalController`): owns the vehicle aspect,
  the pedestrian aspect and every movement permission. Phases: green → green flashing (绿闪) →
  yellow → all-red (held until the junction box is empty) → walk → walk flashing → all-red
  (held until the crosswalk is empty, including the player) → green. All intervals live in
  `TRAFFIC_CONFIG`.
- **Vehicles**: Intelligent Driver Model car-following; smooth braking, safe queue spacing,
  staggered reaction-time departures; a once-per-yellow stop/go decision (stop if ≤ 3 m/s² will do);
  never pass the stop line without room beyond the junction; yield to anyone (player included)
  in or stepping into their lane; wheels turn with distance, brake lamps follow deceleration.
- **Pedestrians** step off only on a steady green figure, always finish crossing, and step round
  the player if blocked. The player is treated as a pedestrian.
- Vehicles leave and rejoin at the far ends of the road (≥ 320 m from anywhere the player can
  stand). The closure barriers keep the pavements and curb lanes; the inner lanes are open.
- The stop lines were on the wrong sides of the zebra for right-hand traffic; corrected.

**The four named EVs are procedural lookalikes, not licensed models.** No free, properly licensed
3D models of the NIO ET5, Li Auto L9, Luxeed R7 or AITO M9 exist (paid ones do, many "editorial use
only"; none of the R7 at all), and using the real brands in a released game also needs the makers'
trademark licences. So each is a lofted body (`src/world/carbody.js`, parameters in
`carModels.js`): published length / width / height / wheelbase / wheel size, the body type and
silhouette, and each car's light signature, read from press photographs. No logos; fictional green
Shanghai new-energy plates. They read as those cars at street distance; up close, lamp shapes,
panel seams and detailing are simplified. The taxis and dark sedan reuse the existing street car.

Tests: `npm test` (includes `tests/traffic.test.mjs`); in the browser
`tools/traffictest.mjs` (signals, meshes, brake lights, wheels, player crossing, pause),
`tools/vehicleshots.mjs` (each vehicle from three angles), `tools/trafficperf.mjs` (A/B cost).

## People (Microsoft Rocketbox, MIT)

Old Lin, Ms. Su and the four crossing pedestrians are photo-textured, rigged humans from
[Microsoft Rocketbox](https://github.com/microsoft/Microsoft-Rocketbox) (MIT licence, notice in
`public/people/LICENSE-Rocketbox.md`) with its motion-captured animation: idle, look-around,
talking gestures, phone texting, umbrella idle / talk / listen, walk and jog. Converted by
`tools/rocketbox/convert.mjs` (FBX -> GLB: textures 1024 px, root motion removed, fingers kept only
for gripping clips); ~29 MB in `public/people/`. Walk / jog playback follows the simulated speed (no
foot sliding); an arm layer lets an umbrella be held while walking. If the files fail to load, the
earlier hand-built figures are used. Casting is limited by the library: it has few East Asian
avatars and no older East Asian man, so Old Lin is a younger avatar with greyed hair, and two
passers-by read as foreign visitors. Since phase 4.3 two of its children (Female_Child_01,
Male_Child_01) walk with their families in the crowd.

## Weather: one light drizzle

Clear → light drizzle → clear, at the same blue hour. Developer toggle **F7** (dev server or
`?dev`); `?weather=drizzle` starts already wet. Not tied to the mission.

- **Rain near the player**: one `LineSegments` mesh (1,200 short streaks) animated in the vertex
  shader inside a box that follows the camera. Drops fade out within ~2 m of the eye (never
  screen-filling) and beyond ~10 m, thin out with intensity, and are never drawn under the shop
  canopy on Hankou Road or inside the Customs House portico (`covers` in `layout.js`). Hidden,
  and free, when clear.
- **Atmosphere**: fog density +33 % and a slightly greyer fog colour, plus a thin veil low on the
  sky's horizon; the zenith and the Pudong skyline keep their contrast.
- **Wet ground**: the deck, pavements and carriageways (not under the covers) darken a little and
  lose ~40 % of their roughness on dry patches; nothing new becomes a mirror. Builds over ~40 s of
  rain, dries over ~75 s after.
- **Ripples**: raindrop rings in the ground shader (strong in puddles, faint on wet stone, only near
  the eye, none under cover), visible as broken-up reflections.
- **People react**: one passer-by jogs under the Customs portico, one books a cab on their phone at
  the kerb, two put up umbrellas and walk on (nobody leaves a crossing early); Ms. Su opens her
  umbrella. Old Lin stays put (Mission One needs him at the railing). Everyone goes back to normal
  when it clears.
- **Sound**: one rain loop in the existing audio graph (part of the environment bus, so it still
  yields to NPC speech), muffled under cover.
- Every level returns exactly to the approved clear values; toggling creates nothing new.
  State: `src/engine/weather.js` (pure, `tests/weather.test.mjs`); browser checks:
  `tools/weathertest.mjs`.

## You, your friends, your phone

**You** are 沈既白 Shen Jibai, 23. You were born in Nanjing, where your father built a machining
firm. You studied industrial design and digital engineering in San Francisco and have been back
in China a week, with a patent fee in the bank and a year on your own terms. Every summer until
you were twelve you sat at Old Zhou's watch stall on Hankou Road. **Your friends** are five people
from your Nanjing middle-school class:
- **陆明轩 Lu Mingxuan**, a VC analyst in Lujiazui
- **林予安 Lin Yu'an** (the old drafts' 许若安 Ruoan: one person), an architect and urban-space researcher restoring Bund buildings; also one of the five he might come to love
- **周子墨 "Momo" Zhou Zimo**, a jazz keyboardist and creator
- **韩知夏 Han Zhixia**, an EV engineer and amateur racer
- **程以诺 Cheng Yinuo**, who runs her family office's art and property

Full profiles, and how their lives move without you, are in `docs/characters.md`.

**The phone** (P). It is an original design in the idiom of a current flagship (island, glass,
Face-ID unlock), not a copy of any real phone's interface. Apps carry the real service names as
text with original icons. While it's up the mouse works the screen and you can still walk slowly;
Esc goes back.
- **微信 (chats)**: your friends one by one, the group chat 「金陵五虎+1」 and services.
  - Text and **voice notes**: tap to hear them (the browser's voice, phrase by phrase), or
    transcribe them.
  - **Invitation cards**: accept or decline.
  - Quick replies appear when a message wants an answer, and your answer moves things on.
- **Calls**: they ring in your pocket (a banner and a ringtone; P to answer). The caller's lines
  play with subtitles and you choose what to say. Leave a call unanswered and it's missed, and the
  caller notices.
- **钱包 (wallet)**: WeChat Pay and Alipay balances, a bank account, a card and a ledger of every
  movement. **All money is fictional**; nothing here touches a real payment service.
- **日历 (calendar)**: what you've agreed to, and what's still waiting for an answer.
- **电话 (recents)** and **Manner**: the Hankou Road shop's ordering screen.

**Friends live without you** (`world/agenda.js`, node-tested).
- On your first evening:
  - Momo invites you to his trio's set at the Peace Hotel's Jazz Bar.
  - Yu'an checks you're dressed for the river wind.
  - Zhixia sends a voice note about the circuit and about how you should buy a real car.
  - Xuan needs your eye on a robotics team's stuck prototype tomorrow at 3 pm.
  - Your father calls.
  - Yinuo asks you to look at a penthouse with her.
- Then the group chat keeps its own life.
- **Invitations have consequences:** accepting warms a friend and goes in your calendar,
  declining cools them a little, and letting one lapse unanswered costs more and they say so.
- **Friends react to the world:** buy a coffee at Manner on Hankou Road and Yu'an, who works on the
  street, guesses where you are.
- **Saving:** the life state (clock, money, chats, relationships, calendar, inventory) saves to
  this browser's local storage and survives a reload; `?fresh` starts over.
- **Time:** the phone's clock runs (a real minute is four game minutes), but the sky stays at blue
  hour: there's no day/night cycle yet.

**Ordering a coffee**: walk up to Manner's hatch.
1. E opens the ordering screen; choose a drink.
2. Pay with WeChat Pay, Alipay or the card (Face-ID sheet, balance checked, ledger entry).
3. You get an order number; a couple of game minutes later the shop messages you that it's ready.
4. Collect at the hatch (the barista calls your number), and the cup is in your own right hand,
   visible as you walk. With the phone up, your hand holds the phone too.

Still to come in this brief:
- Online shopping (京东 / 淘宝) with a rider bringing the parcel to you in the world.
- DiDi rides, with the talkative drivers already written.
- The car purchase journey (a consultant, a showroom visit, specification, test drive, negotiation,
  delivery).
- The penthouse and helicopter journeys, then owned spaces you can furnish and host in.

## Language: 中文 or English, one at a time (`src/ui/i18n.js`)

Everything on screen is in **one language**, the one you chose. You can choose on the title screen
(中文 / EN, top right), or under **Settings** on the title screen or the pause menu. The choice is
remembered in the browser; the first time, the game follows the browser's language. Changing it
redraws whatever is already on screen, including an open phone, in place.
- **Interface strings** live in one table (`S` in `i18n.js`). Static markup binds with `data-t`.
- **Content** travels as `{ zh, en }` pairs with what it belongs to:
  - spoken lines (`world/text.js`) and passing remarks (`world/barks.js`)
  - Mission One's text and the notice
  - the phone's interface
- **Messages** are written and stored in Chinese, the way these people would write them, and read
  in English through `world/agendaEn.js`. Names use given names in English (Mingxuan, Yu'an, Momo).
- **What stays as-is:**
  - The world itself: shop signs, the bilingual Manner menu board, the lamp-post notice and the label
    on the pouch.
  - Brand names (Manner, Model 3) inside Chinese sentences, where people really say them that way.
  - The language names in the switch (中文 / English).
- **Shanghainese** remarks show in Chinese with a Mandarin gloss, or in English with a small "in
  Shanghainese" tag.
- `?lang=zh|en` overrides the setting, for tools. `tools/langtest.mjs` checks for stray characters
  of the other language on the title, settings, HUD and phone, the live switch, and that the choice
  survives a reload.

## Interface (HUD v3)

The title is cinematic: letterbox bars, the name set large, Inter for English and a heavy serif
for 回潮. A city status line runs along the bottom bar (coordinates, district, weather, the live
game clock). The palette is one neon gradient (magenta to cyan, the Bund's night) used only as
hairlines and accents, with a gold primary button. The pause and settings panels are glass over a
blurred city.

Quiet and contemporary: Inter with Noto Sans SC, translucent glass panels with hairline borders,
one warm accent, and nothing decorative or "Oriental".
- The interaction prompt is a pill under the reticle (key, target, action).
- Subtitles carry a speaker chip.
- A passing remark (a bump) sits lighter and higher than dialogue.
- Toasts are a pill at the top.
- The objective is a compact card that pulses when it changes.

Everything moves in short fades and slides (0.2–0.45 s, one easing curve) and respects reduced
motion.

**Minimap** (`src/ui/minimap.js`, `src/engine/minimapLogic.js`): a heading-up disc, bottom left,
drawn from the same layout data the colliders use.
- **Shows:** you, people nearby, and the mission target (pinned to the rim with its distance when
  it's off the map), plus north.
- **Appears when it helps:** a mission target exists and you're moving, you've just walked into a
  new area (Hankou Road, Zhongshan East 1st Road, the promenade, the Customs House), or you hold
  **Tab**.
- **Gets out of the way:** it hides while talking, reading or paused, and after ~5 s standing still.
  Short stops mid-walk don't make it flicker (node-tested).

## Shopping: JD and Taobao, and the courier at the kerb (`src/engine/shopping.js`, `src/ui/phone/shopApp.js`, `src/world/courier.js`, `src/world/belongings.js`)

Two shop apps on the phone, as plain coloured tiles with the shops' names as text (no logos, no
copied interface). Each product page quotes a real delivery time from the shop's rhythm:
- **JD** has same-day delivery before 19:00 and next morning after that. Small stock items go by
  express (秒送) within the hour, until 22:00.
- **Taobao** takes two or three days.

You choose where it goes:
- **Hankou Road, hand it to me.** This works the way it does in Shanghai. When the order is out for
  delivery, the courier parks his e-bike on the Hankou Road pavement by Manner (a generic scooter
  with a delivery box and the quilted handlebar cover they all use in November). He messages you
  to come down and collect, and he shows on the minimap. He waits on his phone, glances up the
  street, and looks at you and waves when you come close. **E** takes the parcel from him; it's in
  your hands for a moment, then it's yours. If you don't come within 30 game minutes, he leaves it
  at the Peace Hotel front desk and tells you so.
- **Peace Hotel front desk.** The desk signs for it and keeps it (bulky things always go there).
  Collecting from the desk comes with the Peace Hotel interior.

The phone's orders page shows a five-step track for each order, what you have with you, and what's
waiting at the desk. Payment is in-game money through the shared pay sheet.

What you buy does something:
- **Umbrella:** **U** opens it. The canopy is over your head (look up and you see its ribs), and
  the drizzle drums on it instead of on you.
- **Noise-cancelling headphones:** **H** hushes the city. Wind, traffic and the crowd go through a
  low-pass and drop away; speech, your phone and cues stay clear.
- **Everything else:** goes into your belongings (parts for later builds, a tea gift box, a coat).

Node-tested (`tests/shopping.test.mjs`):
- the shops' timings
- express only for small stock and only until 22:00
- the courier's wait, and the desk when you don't come
- handing over only once
- refused payments charge nothing
- bulky things never go to the kerb
- every shop message reads in English too

## DiDi rides (`src/engine/ride.js`, `src/world/didi.js`, `src/world/cabin.js`, `src/world/driverPose.js`, `src/world/rideFlow.js`)

**Calling a car.** Open DiDi on the phone and pick a destination: North Bund, Lujiazui IFC,
Jing'an Kerry Centre, Xintiandi or Tianma Circuit. Each shows the distance and a DiDi Express fare
(Shanghai pricing, with the night rate after 23:00).
- A driver accepts. The app shows their name, rating, car and plate, and you can send quick
  messages ("I'm at the corner").
- One of the real northbound cars in the Zhongshan Road traffic gets that plate. It works its way
  up, signals, and pulls in to the east kerb just north of Hankou Road with its hazards on.
- Check the plate on the back, walk to the rear door and press **E**.
- Free waiting is five minutes; then the driver messages you. At eight minutes they cancel and the
  app charges the no-show fee.

**In the car.** You sit in the rear right seat, where people sit in a Shanghai cab, and the mouse
looks around.
- The car's own body stays around you: its glass is made see-through, and its shell is cut open
  only where the cabin is. So the pillars, doors, roofline and the bonnet through the windscreen are
  the real car's.
- The interior is fitted to that model's curves (windscreen base, beltline, roof over each row):
  - seats in light Nappa leather (CC0 photographed leather) with side bolsters, piping and
    headrests on posts
  - a sculpted dashboard with a slim driver display and a big centre screen showing the route
  - a three-spoke wheel, rear-view mirror and sun visors
  - door cards with armrests, handles, speakers and a warm ambient strip
  - a centre console with a Manner cup in the holder
- The streetlamps sweep a little warm light through the cabin as you pass each one.
- **The driver is properly seated.** The avatars only have standing animations, so the sitting is
  posed every frame with two-bone IK: pelvis on the cushion, a slight recline, feet on the pedals,
  both hands on the rim at ten to two (they follow the wheel as it turns), elbows down and out. The
  head still turns to you when they talk.

**The driver.** Five drivers with their own moods, opinions and ways of talking, from chatty to
silent. Their lines come up as subtitles in your language.
- Answer with **1–4**: engage, short answer, change the subject, or say nothing. Not answering
  within a few seconds counts as saying nothing; ignore them twice and they stop talking.
- Now and then a remark carries a rumour, a place or a name. Nothing marks which ones matter, and
  some are wrong.
- On the way someone may step out looking at their phone, or a car may cut in. The car brakes
  hard, the horn goes, and the driver says what they think of it.

**Arriving.** Past the north end of the Bund the drive continues as passing light. Then:
- **If a friend asked you there, about now** (within two hours of the time), you walk in: Xuan's
  robot-arm review on IFC's 32nd floor, or Yinuo's viewing of a top-floor flat on the North Bund
  (see *Places a DiDi takes you* below).
- **Otherwise** a card shows where you are and what it cost; the evening there passes, and a DiDi
  brings you back to the Bund.

**Other people get DiDis too** (`src/world/hailers.js`, `src/engine/rideHail.js`). At two kerbs, the
west one by the AIA Building and the river side north of Hankou Road, someone comes out and waits
with their phone. A real car from the traffic is sent to them (the same pull-in yours uses). As it
comes up they look for it, check the plate and wave; it stops with its hazards on; they walk to the
rear door and get in, and it pulls away. A little later someone else comes out.

**What isn't there yet:**
- Jing'an, Xintiandi and Tianma are still told by the card, not built.
- The drivers' voices are subtitles only.

## The northern Bund: Jiujiang Road, the AIA Building, Nanjing Road, the Peace Hotel

The walkable Bund now runs north from Hankou Road past the AIA Building to Nanjing Road East and the
Peace Hotel (`L.zNorth` −262).
- **Side streets.** Jiujiang Road and Nanjing Road East are real side streets: carriageway,
  pavements both sides, kerbs and a zebra at the mouth. Each ends at a roadworks hoarding a little
  way in.
- **No. 17, the AIA Building (1924).** Granite neo-Renaissance: a two-storey rusticated base, five
  storeys behind a giant order, a heavy cornice, and the two baroque corner towers with small domes
  and lanterns. Its arched door on the Bund stands open.
- **No. 20, the Peace Hotel.** The green copper pyramid, and on Nanjing Road the main entrance: a
  bronze canopy, the name in bronze letters, a doorman, and a revolving door that turns as you go
  through.

### Inside the Peace Hotel (`src/world/interiors.js`)

**The building:**
- One great hall laid out as the original arcades meeting at the octagon: eight dark marble pillars
  with brass bases and capitals, and an inlaid octagon star in the marble floor (CC0 photographed
  marble).
- Above it, the octagonal drum with clerestory glazing and the stained-glass rotunda, lit from
  within.
- Walnut wainscot, cream plaster, brass, and frosted glass lights in the Lalique manner (ceiling
  coffers and wall fans).
- The hall's lamps join the light pool, so they're real lights when you're inside and cost nothing
  when you're not.

**People and places:**
- **The front desk.** They know you, because you told your father you're staying here. Your key card
  is 612, a river view.
- **The concierge** hands over whatever couriers left at the desk (the JD/Taobao orders sent to the
  hotel).
- **The Jasmine Lounge** runs along the Bund windows (round marble tables, a grand piano).
- **The Jazz Bar** is through a brass-framed door in the hall's south-east corner (see below).
- **The lift lobby** is guests only, with a guard. With your key card the lift takes you up to the
  sixth floor and your room (see below).
- **A staff-only door.** The desk staff tell you off if they're looking up when you try it; otherwise
  it's simply locked.

### Up the lifts: the sixth floor and room 612 (`src/world/hotelUpper.js`)

The floor is at its real height inside the building: the exterior's storeys put 6F at about 23.5 m.
- **The lift lobby**: two brass lifts, a console with flowers.
- **The corridor** runs south along the Bund side, with a patterned carpet runner, Art Deco sconces,
  old photographs of the hotel and numbered doors. Its southern half is hoarded off for a refit
  (knock on 610 and someone tells you they didn't order room service).
- **Room 612**: your key card opens it (the reader goes green and the door swings in, then closes
  behind you). Inside:
  - a king bed with a stepped walnut headboard and a welcome card on the pillow
  - bedside lamps, a desk under the television, a wardrobe
  - an armchair at one of two tall windows: the road and the promenade below, the river, Pudong
    lit up across it
  - the bathroom (wash your face)
- **The bed**: at night, sleep until 07:30; by day, lie down for forty minutes.
- **The lift** takes you back down to the hall. Every move is a short fade.

Floors above the street are new (`floors` in `src/world/layout.js`), and colliders can stand on one
storey only (`y0` / `y1`). So the hall's pillars don't block your room.

### The Jazz Bar (`src/world/jazzBar.js`, `src/engine/jazzScore.js`, `src/engine/jazzPlayer.js`)

Off the hall at the corner of the Bund and Nanjing Road, as the real one is: a low, dark, panelled
room with a small stage before a red curtain, a bar along the street wall with lit bottles, and
little marble tables with red lamps and guests at them.
- **Open 19:00–01:00; the band plays 20:00–00:30.** Before seven the door is shut.
- **The band is the game's own** (the real Old Jazz Band are real people; this isn't them): a
  piano trio.
  - The pianist and drummer sit at their instruments, posed every frame with two-bone IK.
  - The bassist stands at an upright bass.
  - Their hands follow what is actually being played:
    - the pianist's left hand on the comping chords, his right on the line, each at the right place
      on the keyboard
    - the drummer's stick on the ride cymbal, his brush on the snare
    - the bassist plucking each note, his left hand moving up and down the neck
- **The music is written and played live, with no recordings.**
  - `jazzScore.js` writes each tune from a set of chord changes (standard progressions, nobody's
    melody):
    - a walking bass with chromatic approach notes
    - the swung ride pattern, the hi-hat on two and four, brushes comping
    - rootless piano voicings
    - a head built from a two-bar motif, then swung solo choruses that breathe in phrases
  - `jazzPlayer.js` plays it through Web Audio:
    - a synthesised piano, a plucked upright bass and noise-based drums
    - a short room reverb, and applause between tunes
  - In the hall you hear it muffled through the door.
- **Momo's night** (if you accepted his invitation): tell the door his name and you're shown to the
  table he kept by the stage (E to sit, mouse to look around). On the second number he dedicates it
  to you, just back from San Francisco. Stay to the end of it and you were there: he's glad, and says
  so in the group chat.
- **A whisky sour** at the bar costs ¥128 from your phone's wallet and passes twenty minutes.

### Inside the AIA Building

- **The lobby:** granite, marble, linear light slots, and a tenant directory (fictional tenants
  apart from AIA itself).
- **Reception:** the receptionist explains the visitor process. Register on the mini-program and
  your host confirms, then your face opens the gates; they were put in last month. There's a visitor
  QR stand too.
- **The gates:** four glass-flap speed gates, wall to wall, with a guard.

**Getting past the gates:**
- **Tailgating.** An office worker comes in off the Bund every 35–60 s, badges through, and takes a
  lift. The guard watches the gates, but every so often he's on his phone. Slip through behind a
  worker while he's looking down and you're in; if he sees you, he walks you back.
- **Face scan.** Without a registration it fails.
- **The lifts** need a staff badge.

(Zhao the DiDi driver's rumour, that the guards were being replaced by face recognition, turns out
half true: the gates are new, the guard is still there.)

**Honest note:** both interiors follow published descriptions, not floor plans. The AIA lobby isn't
publicly documented, so it is plausible rather than accurate.

### People with somewhere to be (`src/world/walkers.js`)

Twelve walkers on the northern Bund, each with a purpose that sets their route and what they do on
it:
- **Tourists:** stroll the promenade and stop at the railing to photograph Pudong (phone up,
  sideways).
- **Shoppers:** come off Nanjing Road with paper shopping bags.
- **Hotel guests:** walk to the Peace Hotel's door and go in.
- **AIA staff:** leave work fast with their phones out, stopping to check them on the way to
  Nanjing Road.
- **Couples:** walk slowly side by side.

They slow down and step aside for you. They're simulated and drawn only within about 80 m of you,
and a new one starts out of sight whenever one finishes.

## People's voices (`src/engine/voice.js`, `tools/voice/`)

Every scripted line in the game has a real recorded voice. That's 202 lines, each in Mandarin and English: Old Lin and Ms Su, the DiDi drivers, passers-by, hotel staff, Vivian, your friends, Kai, your parents on the phone.
- **The voices are made offline** with [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M), an open neural speech model (Apache-2.0). The v1.1-zh model voices Mandarin and the v1.0 model voices English.
- **Each character has their own voice.** Since nobody here could listen to 150 candidates, the casting was done by measuring each voice's pitch and pace on a test sentence (`tools/voice/probe.json`). Lower, slower voices went to the older men. The cast is in `tools/voice/cast.json`.
- **They're checked by another model.** An independent speech recogniser (Whisper small) transcribed a random sample of the clips back:
  - Mandarin: median character error about 5%
  - English: median word error 0%, mean about 4%
  - The weakest clips are short exclamations (哦——, 诶——) and the odd homophone.
- **In the game,** the clips are positional, so they fade with distance and come from the speaker's side. Phone calls sound like a phone line.
- **Original or dubbed** (Settings → Voices):
  - *Original*: everyone speaks Mandarin, and the tourists speak English.
  - *Dubbed*: everyone speaks your language.
  - Subtitles are always in your language.
- **Lines nobody could record ahead of time** (lines with numbers in them, what an AI conversation says) are handled in order:
  1. the local voice server, if you run it and turn it on in Settings → *Voices for new lines* (`tools/voice/server.py`: the same model and cast, live on your machine; nothing is probed unless you turn it on)
  2. otherwise the browser's own speech, picking its most natural voice: Edge's "Natural" voices, macOS's Premium or Enhanced voices, or Google voices
- **To regenerate after changing lines:**
  - `node tools/voice/extract.mjs > tools/voice/lines.json` (finds every line and who says it)
  - `python tools/voice/generate.py` (voices only what's new)
- The 404 clips are 9 MB of MP3 in `public/voice/`.

## Talking to people in your own words (`src/engine/llm.js`, `src/world/personas.js`, `src/ui/talk.js`)

**Who you can talk to.** Look at someone and press **T**: passers-by, the hotel staff, the bartender, the AIA's reception and guard, your DiDi driver (from the back seat), Kai at the makerspace, and your friends once their scene is over.
- They stop and turn to you.
- **Type** (Enter) or **speak** (Tab) in Mandarin or English. They answer in character, in the language you used, out loud in their own voice, sentence by sentence as the reply arrives.
- They remember the last few things you said to them.

**WeChat.** You can also write to your friends (and Vivian, your dad, the group chat) in your own words, and they text back in character.

**Who talks among themselves.**
- Old Lin and Ms Su get new exchanges added to their rotation.
- The two guests in the Peace Hotel's hall and the couple at the Jazz Bar make conversation.
- Now and then someone near you says something to you (a tourist wants a photo, an auntie has an opinion). **T** answers them.

**The model is free and runs on your own machine. Nothing is sent to a paid service.** Settings → Free conversation AI:
- **Local server** (the default) is any OpenAI-compatible endpoint. With [Ollama](https://ollama.com) on the Mac mini:
  - Run `ollama pull qwen2.5:7b` once, then leave Ollama running.
  - The game finds it at `http://localhost:11434/v1`. The server address and model are editable in Settings.
  - A 7B model in Q4 takes about 5 GB of the 16 GB.
  - Ollama accepts pages served from localhost by default. If you serve the game from another address, set `OLLAMA_ORIGINS`.
- **In the browser** runs [WebLLM](https://github.com/mlc-ai/web-llm) (Qwen2.5-1.5B) on WebGPU in the page. It downloads about 1 GB once and works on Chrome on Apple silicon.
- **Off, or no model found:** short, polite canned replies in the right language. The game still works; it just isn't a conversation.
- The game looks for a model the first time you talk to someone, then at every start once it has found one, so a game without a model never probes a port it doesn't need.

**How the characters are kept in line.**
- Each kind of person has a character card: who they are, how they talk, what they'd know.
- The scene (time, place, weather, what you're carrying) is added each time.
- Staff are given real facts so they don't invent the Jazz Bar's hours.
- Every reply is checked: right language, not an echo of what you said, not the instructions parroted back. A bad reply gets one retry without the earlier turns, then a canned answer.

**Tested here** against llama.cpp's server with Qwen2.5 1.5B and 3B:
- The 3B model holds a sensible Mandarin conversation: the front desk calls you 沈先生, says the Jazz Bar opens at seven, and offers to hold a table.
- English questions after a Mandarin conversation needed the retry.
- 1.5B is usable but confused.
- **Use 7B on your Mac.**

**Voice input** is the browser's speech recognition (Chrome, Edge, Safari). It couldn't be tested here (no microphone), and without it you type.

## Real brands (`src/ui/brands.js`)

Real brand marks appear where the thing really is that brand:
- **On the phone:** WeChat, Alipay and Taobao app icons; the WeChat Pay, Alipay and Visa marks on the pay sheet and wallet.
- **On the cars:** the maker's name across the tail of the lookalike NIO, Li Auto, AITO and Luxeed. The bodies are still approximations.
- **Where they already were:** Lamborghini's own badges on the Huracán model you supplied, and the Starbucks and Manner cups you made.

The vector marks come from [Simple Icons](https://simpleicons.org) (CC0 data; the trademarks belong to their owners). DiDi, JD, Manner, UnionPay and China Merchants Bank aren't in that set, so they appear as their own name in their own colours rather than an invented symbol. This is fine for a private build; publishing the game would need the brand owners' permission.

## Building things: the Yangpu makerspace (`src/engine/maker.js`, `src/world/makerspace.js`)

Jibai designs and builds. He rents a bench in a converted factory on the Yangpu riverside: take a DiDi to *Yangpu riverside makerspace*, which you can always walk into.
- **The space:** brick and steel, hanging lamps, benches, two 3D printers (the print heads move), a CNC, a laser cutter, a pegboard of tools, a whiteboard of sketches, and Kai, who runs the place (T to talk).
- **The parts shelf** sells ESP32 boards, IMUs, gimbal motors, batteries, GPS and CAN modules, a multi-zone ToF sensor and servos, paid with WeChat Pay. Zhixia sends her own parts for the telemetry logger.
- **The bench** shows the blueprints, what each needs and the Maker level it takes. Building one goes:
  1. 3D-print the housing (forty minutes pass)
  2. solder six joints: press Space as a marker crosses a window, faster each joint
  3. tune it
  The joints decide the quality.
- **Blueprints:**
  - **Night gimbal** (Maker 1) unlocks photo mode.
  - **Pocket LiDAR** (Maker 2) scans architectural detail.
  - **Race telemetry logger** (Maker 2) is Zhixia's.
- **Maker XP** comes from building, from photos and from fixing other people's machines (Xuan's arm). Levels unlock harder blueprints and perks; at Maker 3 the soldering window widens.
- **Achievements** show as a banner, for example *First build*, *Clean joints*, *Night owl of the Bund*, *The whole Bund*, *Fixed someone else's machine* and *The Bund, in points*.

**Photo mode (G, with the gimbal).**
- **The viewfinder** has a thirds grid, the focal length (24–135 mm equivalent) and a stabiliser light that turns red if you swing too fast.
- **The challenge, the Bund after dark:** the Oriental Pearl, Shanghai Tower, the Customs House clock, the Peace Hotel's green roof, Old Lin and Ms Su, the Jazz Bar trio, a cruise boat, and your Huracán.
- **Scoring:** each shot is scored for the subject, how centred and how big it is, and how steady you were, up to three stars. A better shot of a subject earns XP.
- **Shots** go to the phone's **Photos** app as thumbnails. Share one to Moments for followers, and a friend will comment.

**The LiDAR** puts a *Scan* prompt at the AIA lobby's coffered ceiling, the Peace Hotel's stained-glass rotunda and the Customs House clock. A sweep of laser points settles over the spot, and the point cloud is saved.

**Your phone keeps track:**
- **Sketchbook:** what's coming up (your invitations), your Maker level and XP, followers, what you've built, how close you are to each friend, and achievements.
- **The minimap** marks Manner, the hotel, the DiDi pickup, the Jazz Bar (when it's open), your parked car, and the photo subjects you still need.

## The friends, after the first days (`src/world/agenda.js`, `src/world/friendScenes.js`)

Their lives keep moving on the phone, on the calendar, and in person. Every message has its English.
- **Yu'an** surveys the Peace Hotel's roof, then asks you to the AIA Building at 19:00 on day 4. She's at the gates with her site badge: go through with her and the guard nods you past, and she shows you the coffered ceiling she's restoring.
  - Scan it with the Pocket LiDAR and you've saved her team two weeks of measuring. She'll want to borrow it.
  - Without the LiDAR, she wishes someone had one.
- **Zhixia** wants a race-telemetry logger for her car (CAN bus, GPS, g-forces). Say yes and her parts arrive at the makerspace. Build it and she invites you to a track day at Tianma, told by the card: her lap time depends on how well you built it. If you own the Huracán, she drives it too.
- **Momo** gets locked out on night two. Let him crash and he's asleep in your armchair in 612 when you get back (E to wake him, T to talk). He borrows your charger. Later he posts your car to his followers, and so do yours, by thousands.
- **Xuan:** if you said you'd advise his senior's team, it's the arm's demo day at IFC. A second scene there: the arm doesn't drop a thing, an investor wants to know who you are, and dinner with him is set up for later.
- **Yinuo** tells you what she decided about the flat, which depends on what you said. Then she asks you to fly over the Bund with her by helicopter at night (the card, and what she said on the way down).
- **Home:** Mum's voice note (she's seen the car; your father doesn't know), and Dad's call about the empty R&D floor he's keeping for you.

## Places a DiDi takes you (`src/world/destinations.js`)

When a friend has asked you somewhere and you get there at about the right time, the ride ends with
you walking in. Each place is at its real height, with its own scene: lines as subtitles and, when
you're asked something, four answers (1–4, or say nothing). What you say changes how they feel about
you and is remembered. Leave by the lift and a DiDi brings you back to the Bund: time passes, and
the fare comes out of your wallet.

- **IFC, 32nd floor, Lujiazui** (Xuan's invitation). About 134 m up, in the tower south-east of the
  Pearl Tower, a robot-arm start-up's office: an open-plan floor with desks, a whiteboard and the
  prototype on its bench.
  - The arm runs a pick-and-place cycle and drops its part on the fast wrist turn. Watch it; **E**
    at the bench counts the drops.
  - Xuan introduces his senior, the founder, who explains: forty picks a minute, a customer demo
    at the end of the month.
  - What you say matters. Spot that it's acceleration and fingertip compliance, not grip, and they
    fit softer pads; after that it stops dropping parts. Ask whether the customer needs forty a
    minute, and the contract turns out to say thirty.
  - Then Xuan asks whether you're interested.
  - The west windows look back across the river at the Bund you came from: the same modelled
    street, lit.
- **A top-floor flat on the North Bund** (Yinuo's invitation). 160 m up, an empty show flat her
  family wants her to buy, with glass on two sides: the river running south between Hongkou and
  Pudong, and Lujiazui beyond.
  - The agent talks too much.
  - Yinuo asks what you see in it apart from the view, and then whether she should buy it.
  - The North Bund's streets are a distant set of lit blocks, built only for this view.

The geography is approximate: the flat is put about 1.1 km north of the Peace Hotel, and IFC is
nearer the Pearl Tower than it really is.

## Cars on the street

A **Lamborghini Huracán** is parked on Hankou Road by the south kerb, right where people walk, nose toward the Bund, with a
soft contact shadow. It is solid: you walk round it. It's the car the purchase journey will make
yours. The model is real scale (4.46 m, about 134k triangles, 11 MB, loaded in the background).

## Buying the Huracán (`src/engine/carPurchase.js`, `src/world/carSale.js`)

A journey, not a checkout, and the way it really works at this end of the Shanghai market.

1. **A friend's lead.** Tell Zhixia "we'll see about the car" and, a little later, she sends you a
   WeChat contact card for Vivian, a Lamborghini sales consultant ("just say you're my friend").
2. **The demo car comes to you.** Add Vivian and she offers to bring the demo car to the Bund (a
   door-to-door test drive, normal for buyers like this). Twenty minutes later the yellow Huracán on
   Hankou Road is her demo car, and she's waiting on the pavement beside it.
3. **At the car.** E to talk; answer with 1–4:
   - sit inside (the passenger seat; mouse to look round)
   - have her start the V10 (people on the pavement turn round)
   - choose the colour (Giallo Midas, Nero Noctis, Bianco Icarus, Verde Mantis) and the interior
     (black Alcantara or terracotta leather)
   - hear the price (about ¥2.68M on the road) and the finance terms
   - pay the ¥200,000 deposit by bank transfer
4. **On WeChat.** Vivian follows up with two decisions:
   - **The plate.** Registration follows the owner's hukou, not where the car was bought.
     - **苏A (Nanjing).** With a Nanjing hukou the realistic route is a 苏A plate: the dealer's agent
       registers it in Nanjing while the car runs on temporary plates. Blue out-of-town plates are
       barred from Shanghai's elevated roads at weekday rush hours.
     - **The Shanghai auction.** Ask about a Shanghai plate and Vivian explains that without a
       Shanghai hukou you need a residence permit and 36 months of continuous Shanghai social
       insurance or tax to bid at all. He's a week back from San Francisco, so not yet. A company in
       Shanghai could bid in its own name later. (For someone eligible, the auction costs about ¥95k
       and is won about 12% of the time; that path is modelled and tested.)
   - **The balance.** Paying ¥2.48M in full is more than your ¥1.65M account holds, so it's
     refused. Dealer finance is 30% down and about ¥55k a month for 36 months. (Your father said:
     don't throw the patent money at a car.)
5. **Delivery,** about two weeks after the order. Vivian brings it back to Hankou Road in your colour
   with your plate, hands you the key, and the engine starts. The group chat reacts ("??? Baibai
   bought a CAR???", "...Does your dad know?"). It stays parked there as yours.

All in-game money; every stage is node-tested (`tests/carpurchase.test.mjs`).

**What isn't there yet:**
- Vivian's own avatar: she uses the library's business-suited woman.

## Driving it (`src/engine/drive.js`, `src/engine/carAudio.js`, `src/world/driving.js`)

Once it's been delivered, the prompt at the driver's door (the left; it's left-hand drive) is
**Drive**.
- **The car** (`drive.js`, node-tested) is a kinematic bicycle model with the LP 610-4's numbers:
  - 0–100 km/h in about 3.1 s; about 1 g of braking; held to 162 km/h here
  - steering lock that eases off with speed; a handbrake that lets the rear step out a little
  - a seven-speed gearbox for the revs
- **The V10** (`carAudio.js`) is synthesised from its firing note (rpm ÷ 12): two detuned saws and a
  sub through a waveshaper, intake roar rising with the revs, a crackle on the overrun when you lift
  at high revs, and the tyres complaining when they slip.
- **Two views:** a chase camera that drops back a little with speed (the default), or **V** for the
  driver's seat in the model's own cabin, where the mouse looks round.
- **Where you can drive:** the roads that are here, which are Hankou Road, Zhongshan Road the length
  of the Bund, and Jiujiang and Nanjing Roads as far as they're built. The kerbs hold you off the
  pavement.
- **Other cars and people stop you.** You can bump into a car, but you never drive through anyone.
- **The traffic sees a car,** and queues behind you. People step round it and look at it.
- **E** (once you've stopped) gets you out. It stays parked where you left it, and that's saved.

The speed and gear show at the bottom right.

## People notice a nice car (`src/engine/sights.js`)

Pass the Huracán and you'll see what really happens on the Bund:
- **Most people look.** They slow a little and their heads follow it as they go by.
- **Some stop for a photo.** They stand a few metres off, turn to face it, and raise the phone to eye
  level, sideways (the arm is posed with IK). It takes a couple of seconds, sometimes with a flash,
  then they walk on.
- **It depends on who they are.** Young men, students and visitors are the ones with phones out;
  office workers sometimes; older people mostly just look.
- **It has to be ahead of you.** Nobody turns round to notice something behind them. Once someone
  has walked well away they can notice it again, but they're less likely to stop twice.

Node-tested (`tests/sights.test.mjs`).

## Coffee cups

The Manner cup and the Starbucks cup are props made for this game (see `docs/props/`). Each is
built once and shared as clones, so a street full of coffee costs two label textures.
- **Manner:** in your hand after you collect an order, in the hands of people coming back from a
  coffee run, and on Manner's pass.
- **Starbucks:** one office worker starts the evening with one from the store up Hankou Road.

## Manner Coffee, Hankou Road (`src/world/shops.js`)

Why here:
- Manner's official store list includes a Hankou Road shop ("汉口路126店"). The listing doesn't make
  clear whether 126 is the street number, so its exact spot on the road is approximate.
- The other chains named in the brief: Starbucks' Hankou Road shop (申大厦店, 汉口路266号, in
  2018-era listings) is several blocks west of this stretch and outside the map. No 7-Eleven or
  Subway could be confirmed on these blocks, so none are placed.

The front is built like Manner's small takeaway shops:
- a narrow glazed front in black steel
- a bright white-tiled interior with the espresso machine and grinder on show, cups on the pass
- a menu on the wall at typical Manner prices (not a live menu) and an order hatch with a ledge
- an A-frame with the seasonal osmanthus latte

The name is set in type; no logo artwork is reproduced. The shop is a light source like the lamps.

**Coffee runs** (`src/engine/errands.js`, node-tested). Some passers-by stop on the way. They:
1. join the queue (one at a time, in arrival order, nobody sharing a spot)
2. at the hatch, take out their phone to scan and pay, then have a word with the barista
3. step aside to wait on their phone
4. take the cup, and walk on with it in their hand for a while.

## Faces, voices and listening (`src/world/face.js`, `src/engine/delivery.js`)

**Faces.** Every Rocketbox avatar has facial bones (jaw, eyelids, eyebrows, eyes), now driven on top
of the body animation:
- blinks every 2–6 s, sometimes double
- a jaw that follows the speech, open on syllables and still in the pauses
- brows that lift on a question and knit when annoyed
- eyes that find who they're looking at (each other; you, when you're talking to them) and make
  small saccades away and back

**Voices.** Browser speech reads a whole sentence at one flat rate and pitch. Lines are now spoken
phrase by phrase:
- the pauses people leave (a breath at a comma, longer at a full stop, longest trailing off)
- a lift at the end of a question, a slower tail on "……", a catch on "——", a quicker clip on "！"
- a mood from the words (annoyed / tired / warm)
- a little drift so no two phrases match

The listener now listens: at natural pauses in the other's line, they sometimes nod and murmur "嗯"
(a procedural voiced hum, not a voice clip). It is still the browser's voice, and the limits are
honest: no emotional prosody beyond rate and pitch, and Shanghainese remains subtitle-only.

## First person: body, weight, breath

- **Your own body.** Look down and you see it: a Rocketbox avatar (`Male_Adult_07`, grey jacket,
  jeans) with motion-captured idle / walk / jog / sprint (`m_run_fast_01`). The gait clips are
  blended by speed and *phase-locked to the footstep rhythm*, so the legs you glimpse, the head bob
  and the footstep sounds land together. Walking backwards plays the walk in reverse; strafing turns
  the hips toward the motion; standing still, you can look ~35° round before the body turns to
  follow. The drawn body's head bone is collapsed (the eye is inside the head, and a hidden head
  would leave the collar open to look into); an undrawn copy in the same pose, head included, casts
  your shadow. The neck hangs just behind the eye whatever the clip does, so a sprint's forward lean
  never swings the collar into view.
- **Head motion** (`src/engine/headMotion.js`, node-tested): a bob per step (more when running), the
  side-to-side weight shift of each stride with a touch of roll, a lean into strafes and turns, a
  nod when braking and a tip back when speeding up, a spring-damped dip on landing, breathing that
  deepens with effort, and a little weight-shifting when standing.
- **Weight and momentum** (`movement.js`): speeding up (~0.4 s to walking pace) and stopping (a
  step or so) take time; winding up from a walk into a run takes about a second; little steering
  in the air. Walk 2.2 m/s, run 5.0 m/s; step cadence ~1.9/s walking, ~3/s running.
- **Stamina** (`src/engine/stamina.js`, node-tested): running spends it (~45 s from full; tuned for
  getting about a city, after players found 15 s too short); below 20% the run fades toward a jog; at
  zero you are winded: a forced 2 s stop bent over, hands toward your knees, breathing hard (the
  camera follows the body's head down), then a few seconds' walk until 45% is back. It comes back in
  18 s walking, 7 s standing. A slim bar at the bottom shows it while you run or recover. Breathing is audible (procedural exhale / inhale
  at the same rate the head moves) once you are working.

The library has no "out of breath" mocap (its breathe idles are calm), so the winded bend is a
procedural spine bend on top of the idle; the legs stay straight, so it reads as a stoop rather
than true hands-on-knees.

## Sharing the pavement: avoidance, bumps, reactions (`src/engine/social.js`, `src/world/bumps.js`)

People don't walk into each other on purpose: each walker looks ~3 s ahead along where it means to
go, and anyone it would pass too close to nudges it aside (keeping right in a head-on meeting, as
people do here) or slows it. In a node test of a busy 4 m pavement (16 people, both directions,
90 s) that is 3 contacts instead of 31. The crossing's pedestrians are solid to you now (before,
you could walk through them); they steer round you, but you can still walk or run into them.

A contact is noticed once per pair (then not again for 8 s), with who was moving into whom and how
hard. Only bumps that involve **you** get words: passers-by brushing past each other just glance (in a
real crowd nobody makes a scene of it), and people walking together (couples, families, a tour
group) never count as bumping each other. One line at a time (3 s apart), and the same person not
again for half a minute. Each of the two reacts according to who they are (persona: temper, politeness, language) and
who was at fault:
- whoever walked into someone almost always apologises;
- the one walked into mostly says "没事" / apologises anyway (very common), sometimes just looks or
  tuts, now and then says something; a hard knock makes them stagger a step;
- an older local woman (阿姨, p5) is the likeliest to say something, and says it in Shanghainese
  ("当心点呀！眼睛看看路好伐？"), shown with a Mandarin gloss;
- you: brushing someone is shrugged off more than running into them, and doing it again to the same
  person within ~40 s gets a sharper answer each time ("又是侬！侬拎拎清爽好伐？"). Old Lin takes it
  in good part; Ms. Su is shorter with you; a visitor apologises even when it was you.
They stop (never in the road), turn their head and body to whoever it was, and gesture (a raised
hand for sorry, a shrug, an annoyed gesture: Rocketbox `wave`, `gestic_shrug`, `idle_angry` /
`gestic_talk_angry`); you get a jolt and a soft cloth thud. What they say appears as a passing line
above the subtitles, in the recorded voice for that kind of person, pitched a little differently for
each individual so a crowd doesn't share one voice; never the browser's synthetic voice (a line
without a recording is subtitle-only). Shanghainese lines are subtitle-only, labelled as such. Casting: the library has no older East Asian woman;
p5 is its oldest woman (`Business_Female_02`, glasses, tweed jacket) with greyed hair.

**Eyes on a phone.** Walkers sometimes have their phone up while they walk (decided leg by leg;
some people much more than others): the right arm, neck and head take the texting pose over the
walk, the screen shows a vertical short video or drama (shifting colour, someone on screen, burnt-in
subtitles, a progress bar) or a chat, both generic with no app or logo, redrawn only near the camera.
They walk ~15% slower and look ahead less than a second, so they are the ones who bump into people
(a node test: half a busy crowd on phones doubles the bumps). Mostly they put it away to cross.

**Glasses.** Many people here wear them: p1 black acetate, p2 rimless, p3 thin metal, Ms. Su
rimless, p5 her own; fitted from each avatar's eye bones and parented to the head.

## Shadows

The lamps cast them. The nearest one or two lamps (deck lamps, road lamps, Hankou Road's wall
lanterns) also get a downward spot light with a 1024² shadow map, crossfaded against their point
light so handing a lamp's shadow to the next lamp as you walk never pops. Everything solid at street
level casts and receives: people (and your own body), cars, trees (leaves through an alpha-tested
depth material that sways with the wind), lamp posts, signals, street furniture. Two shadowed lamps
on the top two quality steps, one on the next two, none below; `?shadows=0` turns them off. Shadow
maps are drawn once per frame, not again for the river mirror or the reflection passes.

## The Oriental Pearl Tower (`src/world/skyline.js`)

The spheres are lit physically, not painted:
- **Glass:** they are a tinted mirror glass (metalness 0.85 with a clear coat) reflecting the
  captured environment: the sky, the Bund, the river.
- **Panels:** a diamond lattice of panels, each at its own slight angle (a per-panel normal map), so
  reflections break up panel by panel the way the real cladding does. Roughness varies a little
  from panel to panel.
- **Glow:** the lattice glows pink from inside, with LED points at the nodes, breathing slowly
  between pink and violet.

The columns are floodlit concrete:
- uplights at the podium and on the decks, fading with height
- a pink spill near the spheres
- light falling off toward each column's edges, so they read as round

The antenna mast is steel.

## Trees (`src/world/trees.js`, `src/world/wind.js`)

The big limbs grow out of the top of the trunk and flare to its width at the fork (the knuckle a
pollarded plane tree makes), so the crotch reads as one piece of wood, not a stick pushed into a pipe.

Grown procedurally, no image assets. **London planes** (法国梧桐) on Hankou Road: a clear trunk
pruned into the three-forked vase Shanghai's planes are known for, curved tapering limbs, branches
and twigs, mottled peeling bark (cream / olive / grey-brown patches, with a normal map), big
five-lobed toothed leaves in November yellows and ochres with some twigs already bare; crowns grow
out over the street, away from the walls. **Camphor laurels** (香樟) in the promenade planters:
short trunk, rounded evergreen crown, dark furrowed bark, small glossy elliptic leaves with the
odd reddish young one. Leaves are instanced alpha-tested cards (each a sprig drawn on a canvas atlas: ~1,900 sprig cards per plane tree, 3-4 leaves each; ~1,900 per camphor, ~12 small leaves
each), lit with crown-rounded normals
so a canopy shades like a volume; a little light comes through. Bark darkens and gets a sheen in
the rain.

**Wind** is hierarchical and runs on the GPU: the trunk leans and sways slowly (∝ height²); each
limb sways with its own phase; each branch moves faster and crosswise on top of its limb; each
leaf flutters about its stem with its own phase. Strength = the weather's wind × a gust field that
travels across the trees, so neighbouring trees don't move in step. The wind is a river breeze that
picks up in the drizzle; rain also weighs the leaves and branch tips down and knocks leaves as drops
land. You hear it too: the wind bed follows the wind, and a dry leaf rustle rises near the trees.
Developer control **F6** cycles wind: auto / calm / breeze / windy / gale (`?wind=gale` pins it).
Cost: one mesh per tree so trees out of view are culled; on the lower quality steps the crowns
thin out (65% / 40% of the cards, each drawn a little larger) and twigs are dropped. Under software
GL at the lowest step, a view down Hankou Road with three planes in frame costs ~40% more than
without trees, the deck view ~17%, a view without trees nothing (not a real-GPU figure).
`tests/body.test.mjs` checks a JS twin of the shader's wind function: the trunk's foot never moves,
motion grows trunk < limb < branch < leaf, two branches (and two trees) don't move in step, every
step up in wind moves everything further, rain weighs and knocks the leaves.

## Lighting

- **Wet-ground reflections**: screen-space reflections (three.js `SSRPass`) on the deck, pavements
  and road only, with a per-pixel strength from each surface's wetness map: puddles (a metre or two
  across, about one part in eight of the ground) reflect at about half strength, damp stone has a
  sheen; rays fade out by ~30 m. (Until phase 4's fixes the shader dropped the mask whenever distance
  attenuation was on, so every wet surface was a full mirror: that is fixed.) More in the drizzle, none under cover; people and cars standing in front of a
  puddle occlude it (the mask carries the ground's depth). Costly: a full-scene normals render plus
  the ray march and blur; under software GL it roughly doubled frame time (not measured on a real
  GPU). So it runs on the top two quality steps only, the automatic quality ladder drops it when
  frames run slow, and `?ssr=0` turns it off. The pass's depth texture is 32-bit: its default
  16-bit depth made the Pudong towers z-fight into white-hot facades.
- **Height haze**: fog a little denser at street and river level than at the tops of the towers.
- **Floodlighting**: the Bund facades' wash is scalloped by fixtures every ~4 m at their feet,
  brighter and whiter low down, fading upward.
- **Bloom** slightly tighter (strength 0.36, threshold 0.94).

## Sound (procedural, no files)

Everything is synthesised in Web Audio (`src/engine/audio.js`); no recordings are bundled.

- **Bed**: river wind (two filtered noise layers, slow unrelated gust cycles, drifting stereo) and
  the Huangpu lapping at the wall, placed out over the water.
- **Traffic toward the street**: each through-traffic vehicle carries its own tyre roar (and an
  engine note for the petrol taxis / sedan) at its position, rising with speed, dulled with
  distance; a low city wash sits west, behind the Bund buildings. Far ship horns, now and then.
- **Footsteps** on two surfaces: stone (pavement, stair, deck) and asphalt (carriageways); heel
  then toe, every parameter jittered, landing on the head-bob low point; none when standing still.
- **Mission One**: collecting the pouch (a kraft slide, a soft lift, the string ticking its button)
  and breaking the seal (a crack, an accelerating granular rip, the flap falling open).
- **Speech first**: while an NPC talks the environment eases down by up to 7 dB (about a second
  to settle; it never goes silent). Recorded voice clips and TTS are not ducked.
- Pause fades out then suspends; resume fades in. **Shift+M** still mutes everything. A gentle limiter
  sits on the output. Starting, pausing and Mission One restarts never add loops.
- Rain: one loop, driven by the weather (see above).
- **Indoors** the street is muffled (the hall, the AIA lobby), more so high up behind glass (your
  room, the destinations).
- **The Jazz Bar's trio**, written and played live (see *The Jazz Bar*): the only music, and it's in
  the world. You hear it from the stage when you're in the room, muffled through the door in the
  hall.
- **The Huracán's V10** while you drive it (see *Driving it*).

`tools/audiotest.mjs` records the game's real output (an AudioWorklet after the limiter) while
playing, writes each scenario as a WAV, and measures it.

## The living Bund: crowds, traffic, buses, Nanjing Road and the metro (phase 3)

**Graphics settings** (`src/engine/gfx.js`; Settings → Graphics). Presets: Low, **Mac M4** (Mac mini M4
class: 90% resolution, 60 fps cap, SMAA, one lamp shadow, no AO / wet reflections, medium density),
High, **Ultra** (RTX 4080 class: 125% resolution, no cap, MSAA 4×, AO, wet reflections, 2K river
reflection, the densest crowds and traffic). Chosen from the GPU the browser reports on first run;
change any one thing and it becomes Custom; saved per browser. Individually: render resolution
(50–150%), frame-rate cap (30 / 60 / 120 / none, held on the beat so 60 on a 120 Hz screen averages
60), level of detail and density, anti-aliasing, lamp shadows, ambient occlusion, wet-ground
reflections, bloom, river reflection resolution, and auto resolution (steps down by itself when frames
run long: MSAA, then AO and reflections, then resolution). Rendering settings apply at once; crowd and
traffic sizes on the next load (the panel offers the reload). The panel shows the GPU, live fps and the
pixels being drawn. `?gfx=low|mac|high|ultra` and `?lod=` override for a session.

**The crowd** (`src/engine/crowd.js` simulation, pure and tested; `src/world/crowdView.js` drawing).
About 380 people at medium detail (≈170 low, ≈610 high, ≈910 ultra): tourists from across China and
abroad, locals on their way somewhere, older couples, people waiting for buses, and tour groups
following a guide with a coloured flag (who talks to the group now and then: eight voiced lines), from
16 Rocketbox people in all (13 of them in the crowd: Chinese, East Asian, European and African visitors,
dressed for November). They walk a network of lanes
laid on the real walkable ground (the promenade's main and inner walks, both pavements of Zhongshan
Road, Hankou Road, the stair, Nanjing Road out to Henan Road, the metro stairs), keep to the right, give
each other room, step round you and the street furniture, never into a wall or onto the road except on
a zebra on the green man (the signal holds while stragglers finish crossing; cars yield to them).
Tourists stop at the river railing to photograph Pudong or take a selfie; tour groups gather there
round the guide; on Nanjing Road people stop at the shop windows and photograph the neon. Most people arrive up the metro stairs at Henan Road or from the ends of the
promenade, and new people only appear where you can't see them appear. The nearest 8–40 (by detail
level) are full Rocketbox people with motion-captured walks, phones raised for photos, the guide's flag
in hand and real shadows; you can bump into them and talk to them (T). Everyone further away is an
impostor: each avatar is photographed at load from 8 sides in 8 steps of its walk, plus standing and
phone poses, into one atlas (130 small renders at load: well under a second on a real GPU, about 30 s
in software rendering), and drawn as camera-facing cards lit by where they stand (the gold off the
façades, the promenade lamps, the night sky), with soft contact shadows. One draw call for all of them.

**Traffic and buses** (`src/world/trafficMix.js`, `src/world/buses.js`). About 22 vehicles on
Zhongshan Road at medium (13 low, 37 ultra): taxis, private cars in the colours Shanghai actually
drives, the four new-energy lookalikes, and city buses on routes 33, 55 and 65. Cars keep moving and
stop only for the signal and for people. Buses indicate and pull in at the real stops on this stretch,
中山东一路汉口路(外滩) and 中山东一路南京东路(外滩), in both directions (exact kerb positions placed by eye),
open their doors with a kerbside announcement (voiced: 车辆进站，请注意安全…), let commuters off and on,
close up, wait for a gap and pull out. The stops have shelters, lit advert panels and route boards (the Nanjing Road stop lists the
night lines 305, 307, 317). The bus is a generic 12 m electric single-decker, not any operator's livery.

**Nanjing Road East and the metro** (`src/world/nanjingRoad.js`, `src/world/henanTraffic.js`,
`src/world/metro.js`). Nanjing Road is now what it has been since 2020: a pedestrian street paved
wall to wall from the Bund about 500 m west to Henan Middle Road, lined with stone and art-deco
blocks, shop windows lit from inside (goods, rails, people browsing), the vertical neon blade signs the
street is known for, LED screens and lamp posts (shop names are invented in the street's style, not the
real tenants). The minimap now covers it all, with the metro exits marked. Sichuan and Jiangxi
Middle Roads cross it (closed off a few metres in); Henan Middle Road crosses at a signalised zebra with
its own traffic. At Henan Road's north corners are East Nanjing Road station's **Exit 7** (east side,
signed for Tianjin Road and the Bund) and **Exit 2** (west side), placed from Shanghai Metro's own
descriptions of the exits: stairwells under glass canopies with the Shanghai Metro mark, the station
name in Chinese and English, the Line 2 and Line 10 colours (Wikipedia's palette) and the exit number.
Walk down the stairs to the lit landing: **E** at the entrance takes Line 2 one stop under the river to
Lujiazui (¥3 on Alipay; out to the IFC), **E** at the exit sign goes through the concourse and up the
other exit. The station's insides and the trains aren't built: both go by the fade.

**Night look, from the reference photos.** Lujiazui is lit as it is at night: towers lit as
architecture rather than windows (gold slab lines, cool white slab lines, violet and green LED mesh),
cyan and magenta edge lines, the World Financial Center's blue edges, a sparkling line of LEDs up the
Shanghai Tower's twist and a scrolling "WELCOME TO SHANGHAI / 欢迎来到上海" band at its crown, an
animated LED pavilion at the Pearl's foot, the banks' own names lit on their roofs (中国银行, 震旦, DBS 星展银行,
citi 花旗银行), the convention centre's globes as teal glass lattices, and the Pearl changing colour
through the evening (pink, violet, deep blue, magenta). The Bund's floodlighting is a deeper sodium
gold with far less blue sky-fill on the stone (the photos: gold façades under a dark sky), and the Peace
Hotel's pyramid is lit green on its own floods. The river carries more cruise boats:
two or three decks of warm windows traced in LED strips drifting through colours.

**Performance, honestly.** Measured only here, on software rendering (SwiftShader, no GPU), where
these numbers say nothing about a real machine. Not measured on the Mac mini M4 or the RTX 4080 SUPER.
The presets are set from what the costs are expected to be: the far crowd is one instanced draw;
near people are skinned and cost the most, so their number is what the detail level mainly limits;
SSR and AO are off on Mac M4; auto resolution steps down if frames run long. If the Mac drops below
60, try Low or set the resolution to 80%.

## The story: quests, three acts, six endings (phase 4.1: `src/engine/quests.js`, `src/world/story.js`)

A data-driven quest engine (tested in `tests/quests.test.mjs`): each quest is a list of steps with a
`done` test on the life state, optional steps, a time to wait for, a place on the map and a way to
fail. The main arc runs in three acts over six days: the first night back, Kai's robot arm (the
makerspace), Dad's offer, and dinner with Dad at the Peace Hotel Jazz Bar on day 6 (his own avatar,
a sat-down conversation in recorded voices, 1-4 to answer). What you chose, what you built and how he
feels about you lead to one of six endings, shown on a card after the late-night lighting at ten.
**J** opens the journal: quests with their steps, track one (its next step is on screen and on the
minimap), wait until a quest's time, and the people in your life with how each feels about you.

## Something of your own: the night gimbal's week (phase 5: `src/engine/studio.js`, `src/world/work.js`, `src/world/fieldTest.js`, `src/ui/workbook.js`)

Between the story's appointments there used to be little to do. Now there is one thing, and it is
Jibai's: the night gimbal he can already build at the makerspace is version 1 of a product, and the
six days before the dinner with Dad are what he has to make it into something people want.

**The loop, one evening at a time**

- **By day, revise it.** Hardware at the bench in Yangpu (the bench panel has a *revise* entry);
  firmware at any desk. Two changes at a sitting at most ("or you won't know which one did the
  work"), each with a cost in hours, yuan, grams and battery minutes. A new cell means three joints
  to solder. Each sitting makes the next version.
- **At dusk, put it in people's hands.** After the floodlights come on (17:10) look at someone taking
  a photo at the railing and press **E** to lend it. A go takes eight minutes of the evening and
  twenty-four of the battery (version 1 has three goes in it). What bothers them is an *issue* you
  didn't know about: nine exist, none is listed in advance, and the maker can't see them himself.
  By daylight nobody can tell the difference, because a phone is steady enough by day.
- **At night, write it up.** At the desk in room 612 (or the bench): underline the one remark worth
  keeping, choose what tomorrow is for. Only what has been written down can be fixed.

**Three people are there every evening** and remember you: Old Chen (老陈), a retired lathe hand who
photographs the Customs House clock on the hour, 17:15 to 19:45; Xiao Ye (小叶), who shoots visitors'
portraits for a living, 18:30 to 21:45, facing the Pearl; Zhe (阿哲), who livestreams his walk,
20:00 to 22:40, at the Nanjing Road end. Each tells you where to find the next. They say what's
wrong, ask you to bring it back changed, and notice what you changed ("Lighter. ...You hollowed the
arm?"). Hand one the same version twice and you get nowhere; come back a day late and you hear
about it. When nothing bothers someone and the price suits them, their name goes on your list;
Xiao Ye insists on a deposit (in-game money). The morning after, they write.

**The numbers pull against each other.** Hollowed out, with every other fix and USB-C, it comes in
at 349 g, just under what tired hands will hold (350 g), but then it won't run a working evening;
with the 1200 mAh cell it runs all night and is too heavy for Old Chen again. The aluminium arm that
would settle it needs a machine shop.

**The dinner weighs what you built.** If you have the gimbal, there is one more question at the
table: put it on the table, or leave it in your pocket. Dad is a machinist. He reads the object
(how many times it has been reworked, the printed pin, the plastic arm), then your notebook (the
line you underlined, and who said it), then the sums (who wants one, what it sells for, what the
parts cost, what they would cost at fifty sets). How he feels moves by what is actually there: from
−1 ("a thing nobody has used: at the works we call that a sample") to +8. The last question and its
four answers are unchanged, and so are the six endings and how they are chosen; but his answer to
"I'm staying" is now read when the conversation gets there, after everything said and shown, and
with real work on the table he asks for the drawing of the arm. Each ending card adds a few lines
about what became of the gimbal; a day and a half later the arm arrives from Nanjing (−38 g).

**Friends:** Kai writes when the bench is free; Momo borrows it for a gig video; Mingxuan asks what
an investor would; Zhixia spots the bearing seat; Mum says Dad has been asking.

**Where it lives.** `life.flags.studio` (created the first time it's needed), inside the same v1
save; a gimbal built before this existed is version 1. The side quest is `own-work`, a new id.
Nothing changes for a save with no gimbal. `tests/studio.test.mjs` plays the week in node (the
rules, both languages present for every line, the dinner's reading, the afterwords, an old save);
`tools/workwalk.mjs` plays it in the game.

**Fidelity notes.** The three regulars and their hours are invented. The floodlight time is the
game's own (see *The hour*). The gimbal's weights, battery life and part prices are plausible
hobby-scale figures, not measurements of a real product.

## The hour: dusk, night, the late-night lighting, dawn, day (phase 4.2: `src/engine/timeOfDay.js`)

The clock (4 game seconds per real second) now drives the light. One pure function of the minute
(`todState`, tested in `tests/timeOfDay.test.mjs`) gives every system its share; the game opens at
5:42 pm in exactly the approved blue-hour look.

- **The sun** follows the real almanac for Shanghai in mid-November (31.2° N): it rises about 6:25 in
  the east over Pudong, is 40° up at noon in the south, sets about 4:55 behind the Bund. By day it is a
  soft disc in hazy sky, lights the stone and casts the shadows (one shadow map that follows you; the
  lamps' shadows stand down). November in Shanghai is often hazy: the day is pale, Pudong is grey glass.
- **Dusk to night**: the afterglow fades by 6:30 pm into a city night sky (never black: a brown-orange
  glow under the cloud). The street lamps come on as the light goes, the façade floods from about
  5:10 pm. *Sources:* reports give 7 pm for the lights in summer (China Daily, 2022); in November it is
  dark by 5:40, so the game lights them as the sky darkens.
- **10 pm, the late-night lighting.** Since the 2018 upgrade the Bund and Lujiazui have a late-night
  mode in which only the skyline's outlines stay lit (The Paper, 2025). The switch time is not
  published that we could find, so **10 pm is the game's choice**: the floods dim to a faint wash, the
  LED walls across the river go dark, the Pearl holds a dim glow, the outlines and rooftop names stay.
  If you're outdoors you get a notice and people near you say so (recorded voices). After half past
  midnight the floods are off; the lamps stay on all night.
- **Nanjing Road**: shops 10 am to 10 pm (closed ones go dark), the neon until 11, the LED screens 7 am
  to 11 pm. **The metro**: trains from about 5:30 am to about 11 pm; outside those the gates are shut.
- **People and traffic by the hour**: the crowd is biggest from 6:30 to 9:30 pm, thins after ten and
  is a handful at 3 am; traffic drops to about a third at night (each person and vehicle has a rank;
  those beyond the hour's share finish their walk or drive and don't come back). After a time skip
  (sleep, waiting) the change is immediate.
- **Dawn (about 5:45 to 8:15)**: joggers run the length of the promenade, and a tai chi group of eight
  practises on the deck facing the river, a teacher in front. The avatar set has no tai chi animation,
  so the form (the opening, and cloud hands) is posed by hand with arm IK over the idle: recognisable,
  not motion-captured.
- Indoors (the hotel, the flat, the makerspace) keeps its own light; the sky's only reaches in a little.
- Tools: `?hour=HH:MM` starts at that hour; measurement tools (`?q=`) keep the 5:42 pm look unless they
  pass `?tod` or `?hour`. `node tools/todshots.mjs` shoots the same views through the day.

## The living street: murmur, families, umbrellas, street moments (phase 4.3)

- **The crowd's murmur** (`tools/voice/walla.py`, `public/ambience/murmur.mp3`): a 34-second seamless
  loop made offline from Kokoro voices, 14 people (mostly Mandarin, a few English-speaking visitors,
  every one a different voice) saying everyday things at 5-20 m, farther ones quieter and duller, so no
  sentence stands out. Two copies play a hair apart in speed, one per ear. Its level follows how many
  people are round you and how near (the promenade at 8 pm is loud; Nanjing Road at 3 am is nearly
  silent); it goes through the same muffling indoors and ducks under speech like the rest of the bed.
- **Families**: some walkers are two parents and a child, the child on the other side of a parent.
  The children are Rocketbox's own child avatars (Female_Child_01, Male_Child_01, MIT); their rig is
  the same Biped under another name, so the adults' motion capture drives them, the hips' movement
  scaled to their size and their strides quicker. Couples are now two different people.
- **Umbrellas**: in the drizzle about six in ten people put one up, each at their own point as it gets
  heavier, and fold it when it stops: near people hold a real one (the umbrella-arm clip over their
  walk), far ones get a canopy over their card. Colours from black and navy to clear-ish grey.
- **Street moments** (`src/world/moments.js`): now and then, at the hours they'd happen, never in the
  middle of something else, at most one at a time and each once a day:
  - *A lost visitor* on Nanjing Road looking for Line 2: walk him to the nearer station entrance (he
    follows; a side quest), or tell him the way; on the Bund, someone asks for the shopping street.
  - *Take our photo*: a couple at the railing hand you their phone. You frame it yourself (Space or a
    click): both of them in, not too far, the Pearl behind; they tell you if you cut their heads off,
    and you see the shot they got.
  - *A dropped phone*: someone hurrying past drops theirs. Pick it up, find them (the marker), give it
    back; they may send you the price of a coffee on WeChat (in-game money).
  Each speaks in recorded voices. Off for measurement tools (`?q=`) unless `?moments`.
  `node tools/streetwalk.mjs` walks through all of it.

## Places: a shengjian shop and the river cruise (phase 4.4)

- **阿潮生煎 A-Chao Shengjian** (`src/world/dumpling.js`), on Nanjing Road East's south side, 66 m in
  from the Bund: a walk-in ground floor in the street's frontage (white tile, steel counters, the menu
  over the kitchen, two big iron pans of buns under wooden lids, red stools). The name is invented; the
  kind of place is everywhere in Shanghai. Order at the counter (1-5 add, Enter pays by Alipay, Esc
  cancels): 4 or 8 shengjian, beef vermicelli or curry beef soup, soy milk, at typical prices
  (¥4-22). The cook lifts the lid and calls it; take the tray, sit at a free table. Seated: 1 bite a
  small hole and sip the soup first (the way to do it), 2 pop one in whole (it's hot), 3 the soup; E
  gets up. Open 6:30 am to 9:30 pm; otherwise the roller shutter is down. A cashier, a cook and a diner
  (Rocketbox), recorded voices. What you ate is remembered (`life.flags.food`) for the story to use.
- **The Huangpu river cruise** (`src/world/cruise.js`, `src/engine/cruiseRoute.js`, tested): a pier at
  the south end of the promenade (a gate in the railing, a walkway out over the water at deck level)
  and a sightseeing boat, *Huichao* (invented), alongside it. Hourly sailings 10 am to 9 pm; ¥120 by
  phone at the gate (typical of a night cruise). Walk on; at the hour she sails, in the engine: north
  along the Bund side past Lujiazui, round, back along the Pudong side, round and in, about 5 minutes
  real (20 on the game clock). On the open top deck you can walk about: the boat carries you and turns
  you with it, the rails keep you in. An announcer on the boat's speakers (recorded), a ship's horn,
  the engine's throb and the wash, other passengers at the rails, strung lights and a warm deck light.
  E at the wheelhouse door skips to the end. Where the boat is depends only on the clock, so waiting
  (E at the gate when she's out) or skipping puts her in the right place.
  *Honestly:* the real Huangpu cruise piers are a little further south, at Shiliupu; the game puts one
  within reach. The route is shorter than a real cruise (they run 40-60 minutes up to the Yangpu
  Bridge and back).
  `node tools/placeswalk.mjs` orders a meal, eats it, and rides a full sailing.

## Player basics: map, gamepad, saves, tips, benchmark (phase 4.5)

- **The map (M)** (`src/ui/worldMap.js`): the whole walkable city north-up on one screen, painted from
  the same layout data as the minimap and the colliders: the Bund and its promenade, Nanjing Road to
  Henan Road, the river, the Pudong bank. Every place with its name (coffee, your hotel, DiDi, the
  metro's exits, the shengjian shop, the cruise pier, the Jazz Bar when it's open, your car), your
  quest's next step, you. Wheel or +/- zooms, drag or arrows pan, C centres on you. Click a place (or
  anywhere) to set a waypoint: it shows on the minimap with the distance until you get there.
  **Mute moved to Shift+M** (M is the map, as players expect); the settings toggle is unchanged.
- **Gamepad** (`src/engine/gamepad.js`, tested): any controller with the browser's standard mapping.
  The left stick walks (a full push or L3 / RT hurries), the right stick looks. A acts (E; it begins on
  the title screen and pays at the shop counter), B goes back (Esc), X jumps, Y the phone, LB the
  journal, RB or View the map, LT talks, R3 the photo mode, the d-pad answers 1-4, Menu pauses. The
  buttons are turned into the keys the game already knows, so every screen works the same.
- **Saves** (`src/ui/saves.js`, the pause menu): three slots. Your life saves itself to the slot you're
  playing (slot 1 is the old save, so nothing is lost); copy it to another slot, load a slot (the game
  restarts in it), export a slot to a .json file, import one into any slot (anything that isn't a save
  from this game is refused). All in this browser's local storage, as before; exporting is the way to
  keep a save safe or move it to another machine.
- **Where you can go in** (`src/world/entrances.js`): every door that opens (the Peace Hotel, the AIA
  Building, the shengjian shop, the metro exits, the cruise pier) has a warm pool of light on the
  pavement in front and, when it's in view within ~35 m, a small label over it ("Peace Hotel · go
  in") that hides behind buildings and gives way to the E prompt at the door. Closed doors aren't
  marked. Everything else on the Bund is façade.
- **First-play tips** (`src/ui/tips.js`): short tips, each once, one at a time, only when you're free:
  walking and acting, the journal, the phone, the map, talking, the hours, street moments, the cruise,
  the shop, sitting down. Settings → General → Tips turns them off (on again shows them from the start).
- **Benchmark** (Settings → Graphics → Benchmark, `src/engine/bench.js`, tested): a fixed 30-second
  camera route at 8 pm (the full crowd, every light on) down Hankou Road, over the crossing, up onto
  the promenade looking at Lujiazui, north along the river and round onto Nanjing Road, with your
  settings as they are (the automatic step-down is held off while it measures). It reports the
  average frame rate and the 1% low (the average of the slowest 1% of frames), with the resolution,
  the preset, any frame cap and the GPU. Your place and the clock are put back afterwards.
  *Honestly:* run here only on software rendering (about 4 fps, which says nothing about a real
  machine); the numbers for the Mac mini M4 and the RTX 4080 SUPER are yours to measure with it.
  `node tools/basicswalk.mjs` walks through all of this.

## What is here

- Walk from Hankou Road out onto Zhongshan East 1st Road, up the stair, along the promenade.
- Barriers at both ends of the waterfront and a hoarding at the west end of Hankou Road mark the edges.
- Missing-person notice taped to a lamp post by the river hinting at Mission One.
- Two waterfront NPCs (`老林` / Old Lin and `苏女士` / Ms. Su) standing near the river railing beneath a promenade lamp, already conversing in Mandarin across three everyday-Shanghai exchanges with idle/listening/speaking gestures, non-repeating cadence, and a brief greeting interaction (`E`).
- Audio & speech note: recorded Mandarin/Shanghainese voice clips are not yet shipped, so `src/engine/dialogueAudio.js` implements WebAudio `PannerNode` positional attenuation ready for recorded clips and falls back to browser Mandarin speech synthesis (`window.speechSynthesis`, `zh-CN`), clearly labeled in the subtitle bar. Browser `speechSynthesis` playback requires an OS/browser `zh-CN` TTS voice and uses utterance-start scalar distance volume rather than true binaural panning.

## Layout of the code

```
src/main.js            boot, mode switching (entry / play / inspect / dialogue / pause), frame loop
src/engine/studio.js, src/world/work.js   the night gimbal's week: rules (pure, node-tested) and words; world/fieldTest.js lends it on the promenade, ui/workbook.js is the notebook, world/workDesk.js the desk in 612
src/engine/            renderer + quality ladder, player input, movement + collision, audio, conversation + dialogueAudio
src/world/layout.js    every position, collider, NPC placement and ground-height function (single source of truth)
src/world/*.js         one module per part of the scene: sky, skyline, river, bund, promenade, street, lighting, clue, npcs
src/world/text.js      all in-world Chinese text, NPC dialogue and Mission One lines (also drives webfont preloading)
src/world/pouch.js     Mission One's item: procedural pouch / torn pouch / document canvases, one placeholder box mesh
src/engine/wrongHandoff.js  Mission One state (pure, node-tested): idle -> collect -> carry -> complete
src/missionOne.js      Mission One glue: Lin's lines, pouch close-up view, objective HUD, outcomes
src/engine/traffic.js  the crossing: signal controller (sole authority), IDM vehicles, pedestrians (pure, node-tested)
src/world/vehicles.js  through-traffic visuals (4 labelled placeholders + reused street cars)
src/world/signals.js   mast-arm vehicle heads, pedestrian heads, countdowns
src/world/pedestrians.js, instancer.js   background walkers; instancing / merging to keep draw calls down
src/world/playerBody.js, src/engine/headMotion.js, src/engine/stamina.js   first-person body, head motion, stamina
src/world/trees.js, src/world/wind.js     procedural plane / camphor trees and their wind
src/world/hotelUpper.js, jazzBar.js   the Peace Hotel's sixth floor and room 612; the Jazz Bar
src/engine/jazzScore.js, jazzPlayer.js   the trio's tunes (pure, tested) and their Web Audio playback
src/world/hailers.js   other people getting DiDis at two kerbs (engine/rideHail.js runs the wait)
src/world/destinations.js   IFC 32F and the North Bund flat: the scenes, the views, the ride back
src/engine/drive.js, carAudio.js, src/world/driving.js   driving the Huracán: the car (tested), its V10, the controls
src/ui/veil.js         the fade for going somewhere (a lift, sleep, a ride back)
src/engine/voice.js, tools/voice/   recorded voices per character (Kokoro-82M, offline), the live voice server
src/engine/llm.js, src/world/personas.js, src/ui/talk.js, src/world/ambient.js   free conversation with local models
src/ui/brands.js       real brand marks (Simple Icons) and wordmarks
src/engine/maker.js, src/world/makerspace.js, src/world/photoMode.js   building gadgets, the makerspace, photo mode (maker.js tested)
src/world/friendScenes.js   Yu'an at the AIA, Momo in 612, LiDAR scans
src/engine/gfx.js      graphics settings: presets, GPU detection, frame cap (tested)
src/engine/crowd.js, src/world/crowdView.js   the evening crowd (tested) and its near people / impostor atlas
src/world/trafficMix.js, buses.js   how much traffic, the bus stops; the buses and shelters
src/world/nanjingRoad.js, henanTraffic.js, metro.js   Nanjing Road to Henan Road, its traffic, the metro exits
src/engine/quests.js, src/world/story.js, src/ui/journal.js, sceneTalk.js, src/world/dinner.js   the story (quests tested)
src/engine/timeOfDay.js, src/world/dayNight.js, dawn.js   the hour (tested), how it reaches materials, dawn on the promenade
src/world/moments.js   street moments (side quests): the lost visitor, the couple's photo, the dropped phone
src/world/dumpling.js, src/world/cruise.js, src/engine/cruiseRoute.js   the shengjian shop; the river cruise (route tested)
src/ui/worldMap.js, saves.js, tips.js, src/engine/gamepad.js, bench.js   map, saves, tips, gamepad, benchmark (pad + bench tested)
tools/voice/walla.py   the crowd's murmur loop (Kokoro voices, offline)
src/ui/                HUD and stylesheet
tests/                 node tests for movement, collision, boundaries, conversation and Mission One state (npm test)
tools/                 headless screenshot / playtest / render-cost scripts (need Playwright installed globally:
                       NODE_PATH=$(npm root -g) node tools/playtest.mjs;
                       tools/looptest.mjs plays the whole interaction loop, both outcomes, with real key presses;
                       tools/langtest.mjs checks the language setting;
                       walkthroughs, each against a running build (URL=, OUT= for screenshots):
                       inwalk (the hotel and the AIA), upwalk (6F and room 612), jazzwalk (the bar,
                       Momo's night), hailwalk (other people's DiDis), destwalk (by DiDi to IFC 32F and
                       back; the North Bund flat), drivewalk (the Huracán), didiwalk, carwalk,
                       talkwalk (talking to people, against a running model server), makerwalk (build the
                       gimbal, photograph the Pearl), friendwalk (the days after: Yu'an, the LiDAR, Momo),
                       storywalk (the story to an ending), streetwalk (murmur, families, umbrellas, the three
                       moments), placeswalk (a meal at the shengjian shop, a full cruise), basicswalk (map,
                       gamepad, saves, tips, benchmark); todshots shoots the same views through the day)
```

Everything is procedural (canvas textures, merged box/cylinder geometry, WebAudio synthesis; temporary Mandarin speech synthesis fallback for NPC lines).
The only third-party assets are three.js and three open-licensed fonts from Fontsource
(Noto Serif SC, Noto Sans SC, Ma Shan Zheng).

Useful URL switches: `?fresh` (new life, ignore the save), `?hour=HH:MM` (start at that hour), `?tod` / `?moments` / `?tips`
(measurement tools keep the 5:42 pm look, no street moments and no tips unless asked), `?q=0..5` pins the render quality step (0 = best), `?gfx=` / `?lod=` a preset / detail level, `?crowd=<density>` (0 = none), `?traffic=<factor>`, `?body=0` hides your own
body, `?shadows=0`, `?ssr=0`, `?wind=calm|breeze|windy|gale`, `?nolock` uses
click-drag look instead of pointer lock, `?subs=0` starts with subtitles off.


## Credits

- People: Microsoft Rocketbox avatars (MIT), 16 of them: Old Lin, Ms. Su, you, and 13 passers-by and visitors (8 added for the evening crowd: Female_Adult_04, 07, 11, 14, Business_Female_04, Male_Adult_02, 04, 12).
- Photographed surfaces: Poly Haven (CC0), https://polyhaven.com
- **"Lamborghini Huracan LP-6104 2014"** by MdMahib, CC-BY-4.0:
  https://sketchfab.com/3d-models/lamborghini-huracan-lp-6104-2014-4b7b162bcb4f48849f30b1c25b3102a3
  (supplied for this project and used unmodified). Its material names (`CSR2_…`) suggest it was
  extracted from a commercial mobile game, so the uploader's right to license it is uncertain.
  Treat it as fine for a private build only.
- Manner and Starbucks cup props: made for this project (`docs/props/`).
- Voices: **Kokoro-82M** by hexgrad (Apache-2.0), v1.1-zh for Mandarin and v1.0 for English: https://huggingface.co/hexgrad/Kokoro-82M. The clips in `public/voice/` were generated with it.
- Brand marks: **Simple Icons** (CC0 data), https://simpleicons.org, including the Shanghai Metro mark on the station signs. The trademarks belong to their owners.
- Shanghai Metro line colours (Line 2 #82BF25, Line 10 lilac): Wikipedia's Shanghai Metro palette, not an official specification. Exit positions from Shanghai Metro's own descriptions of East Nanjing Road station's exits (as quoted by Chinese Wikipedia and Baidu Baike).
- In-browser model (optional): **WebLLM** (Apache-2.0) running Qwen2.5-1.5B-Instruct (Apache-2.0), downloaded by your browser when you turn it on. No model is bundled.
- Checked with, not shipped: llama.cpp / llama-cpp-python running Qwen2.5 1.5B and 3B (conversation tests), and faster-whisper running Whisper small (voice intelligibility).
