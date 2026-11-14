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
| C | Simplified Chinese subtitles on / off |
| M | sound on / off (mutes ambience, footsteps, cues and voices) |
| Esc | back out of an open conversation / close-up / notice; otherwise pause (click to return). With pointer lock the browser takes Esc: it releases the mouse and the game pauses, which also cancels any open interaction |

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

## Shadows

The lamps cast them. The nearest one or two lamps (deck lamps, road lamps, Hankou Road's wall
lanterns) also get a downward spot light with a 1024² shadow map, crossfaded against their point
light so handing a lamp's shadow to the next lamp as you walk never pops. Everything solid at street
level casts and receives: people (and your own body), cars, trees (leaves through an alpha-tested
depth material that sways with the wind), lamp posts, signals, street furniture. Two shadowed lamps
on the top two quality steps, one on the next two, none below; `?shadows=0` turns them off. Shadow
maps are drawn once per frame, not again for the river mirror or the reflection passes.

## Trees (`src/world/trees.js`, `src/world/wind.js`)

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
                       tools/looptest.mjs plays the whole interaction loop, both outcomes, with real key presses)
```

Everything is procedural (canvas textures, merged box/cylinder geometry, WebAudio synthesis; temporary Mandarin speech synthesis fallback for NPC lines).
The only third-party assets are three.js and three open-licensed fonts from Fontsource
(Noto Serif SC, Noto Sans SC, Ma Shan Zheng).

Useful URL switches: `?q=0..5` pins the render quality step (0 = best), `?body=0` hides your own
body, `?shadows=0`, `?ssr=0`, `?wind=calm|breeze|windy|gale`, `?nolock` uses
click-drag look instead of pointer lock, `?subs=0` starts with subtitles off.
