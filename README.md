# 回潮 Returning Tide — milestone 3: Mission One, “The Wrong Handoff”

First playable slice of a contemporary Shanghai RPG. First-person, blue hour, just after rain:
one short street (Hankou Road), ~155 m of the Bund promenade with two conversing residents, and Pudong across the Huangpu as scenery.

![Pudong from the river railing](docs/arrival.png)

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
| Shift | hurry (a run; run ~15 s flat out and you have to stop and catch your breath) |
| Space | jump (a short hop; barriers stay solid) |
| Mouse | look (click the page to capture the pointer) |
| E | the one interaction key: talk / read / look at the selected target; confirm the highlighted choice; **hold** on "break the seal" |
| W / S, ↑ / ↓, wheel | while talking or looking at the pouch: move the highlighted choice |
| Tab (hold) | minimap |
| P | your phone (Esc: back) |
| U | open / close your umbrella (once you've bought one and have it with you) |
| H | noise cancelling on / off (once you have the headphones with you) |
| 1–4 | in a DiDi: answer the driver (engage / short answer / change the subject / say nothing) |
| C | subtitles on / off |
| M | sound on / off (mutes ambience, footsteps, cues and voices) |
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
passers-by read as foreign visitors.

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
- **许若安 Xu Ruoan**, an architect restoring Bund buildings
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
  - Ruoan checks you're dressed for the river wind.
  - Zhixia sends a voice note about the circuit and about how you should buy a real car.
  - Xuan needs your eye on a robotics team's stuck prototype tomorrow at 3 pm.
  - Your father calls.
  - Yinuo asks you to look at a penthouse with her.
- Then the group chat keeps its own life.
- **Invitations have consequences:** accepting warms a friend and goes in your calendar,
  declining cools them a little, and letting one lapse unanswered costs more and they say so.
- **Friends react to the world:** buy a coffee at Manner on Hankou Road and Ruoan, who works on the
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
  in English through `world/agendaEn.js`. Names use given names in English (Mingxuan, Ruoan, Momo).
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

**Arriving.** Past the north end of the Bund the drive continues as passing light. Then a card
shows where you are, what it cost, and whether you kept an invitation there (on time means within
two hours: your friend is glad, and your relationship improves). The evening there passes, and a
DiDi brings you back to the Bund.

**What isn't there yet:**
- Those destinations aren't built, so the visit is told by the card rather than played.
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
- **The Jazz Bar's door** has the Old Jazz Band's 21:30 stand beside it. If you accepted Momo's
  invitation and turn up on time, you're in for his trio: a card, the evening passes, and he's glad.
- **The lift lobby** is guests only, with a guard. With your key, he tells you the sixth floor is
  being refitted (the hotel really is being renovated in 2026).
- **A staff-only door.** The desk staff tell you off if they're looking up when you try it; otherwise
  it's simply locked.

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
- Driving it.
- Vivian's own avatar: she uses the library's business-suited woman.

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
- **Stamina** (`src/engine/stamina.js`, node-tested): running spends it (~15 s from full); below 30%
  the run fades toward a jog; at zero you are winded: a forced 3.2 s stop bent over, hands toward
  your knees, breathing hard (the camera follows the body's head down), then walking only until 40%
  is back. Standing recovers faster than walking. Breathing is audible (procedural exhale / inhale
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
hard. Each of the two reacts according to who they are (persona: temper, politeness, language) and
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
above the subtitles, voiced through the browser's Mandarin / English voice when it is free (Old Lin
and Ms. Su's conversation has priority). **There is no browser voice for Shanghainese**, so her
lines are subtitle-only, labelled as such. Casting: the library has no older East Asian woman;
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
  and road only, with a per-pixel strength from each surface's wetness map: puddles mirror, damp
  stone glistens, more in the drizzle, none under cover; people and cars standing in front of a
  puddle occlude it (the mask carries the ground's depth). Costly: a full-scene normals render plus
  the ray march and blur; under software GL it roughly doubled frame time (not measured on a real
  GPU). So it runs on the top two quality steps only, the automatic quality ladder drops it when
  frames run slow, and `?ssr=0` turns it off. The pass's depth texture is 32-bit: its default
  16-bit depth made the Pudong towers z-fight into white-hot facades.
- **Height haze**: fog a little denser at street and river level than at the tops of the towers.
- **Floodlighting**: the Bund facades' wash is scalloped by fixtures every ~4 m at their feet,
  brighter and whiter low down, fading upward.
- **Bloom** slightly tighter (strength 0.36, threshold 0.94).

## Sound (procedural, no files, no music)

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
- Pause fades out then suspends; resume fades in. **M** still mutes everything. A gentle limiter
  sits on the output. Starting, pausing and Mission One restarts never add loops.
- Rain: one loop, driven by the weather (see above).

`tools/audiotest.mjs` records the game's real output (an AudioWorklet after the limiter) while
playing, writes each scenario as a WAV, and measures it.

## What is here

- Walk from Hankou Road out onto Zhongshan East 1st Road, up the stair, along the promenade.
- Barriers at both ends of the waterfront and a hoarding at the west end of Hankou Road mark the edges.
- Missing-person notice taped to a lamp post by the river hinting at Mission One.
- Two waterfront NPCs (`老林` / Old Lin and `苏女士` / Ms. Su) standing near the river railing beneath a promenade lamp, already conversing in Mandarin across three everyday-Shanghai exchanges with idle/listening/speaking gestures, non-repeating cadence, and a brief greeting interaction (`E`).
- Audio & speech note: recorded Mandarin/Shanghainese voice clips are not yet shipped, so `src/engine/dialogueAudio.js` implements WebAudio `PannerNode` positional attenuation ready for recorded clips and falls back to browser Mandarin speech synthesis (`window.speechSynthesis`, `zh-CN`), clearly labeled in the subtitle bar. Browser `speechSynthesis` playback requires an OS/browser `zh-CN` TTS voice and uses utterance-start scalar distance volume rather than true binaural panning.

## Layout of the code

```
src/main.js            boot, mode switching (entry / play / inspect / dialogue / pause), frame loop
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
src/ui/                HUD and stylesheet
tests/                 node tests for movement, collision, boundaries, conversation and Mission One state (npm test)
tools/                 headless screenshot / playtest / render-cost scripts (need Playwright installed globally:
                       NODE_PATH=$(npm root -g) node tools/playtest.mjs;
                       tools/looptest.mjs plays the whole interaction loop, both outcomes, with real key presses;
                       tools/langtest.mjs checks the language setting)
```

Everything is procedural (canvas textures, merged box/cylinder geometry, WebAudio synthesis; temporary Mandarin speech synthesis fallback for NPC lines).
The only third-party assets are three.js and three open-licensed fonts from Fontsource
(Noto Serif SC, Noto Sans SC, Ma Shan Zheng).

Useful URL switches: `?fresh` (new life, ignore the save), `?q=0..5` pins the render quality step (0 = best), `?body=0` hides your own
body, `?shadows=0`, `?ssr=0`, `?wind=calm|breeze|windy|gale`, `?nolock` uses
click-drag look instead of pointer lock, `?subs=0` starts with subtitles off.


## Credits

- People: Microsoft Rocketbox avatars (MIT).
- Photographed surfaces: Poly Haven (CC0), https://polyhaven.com
- **"Lamborghini Huracan LP-6104 2014"** by MdMahib, CC-BY-4.0:
  https://sketchfab.com/3d-models/lamborghini-huracan-lp-6104-2014-4b7b162bcb4f48849f30b1c25b3102a3
  (supplied for this project and used unmodified). Its material names (`CSR2_…`) suggest it was
  extracted from a commercial mobile game, so the uploader's right to license it is uncertain.
  Treat it as fine for a private build only.
- Manner and Starbucks cup props: made for this project (`docs/props/`).
