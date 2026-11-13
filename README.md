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
| Shift | hurry |
| Space | jump (a short hop; barriers stay solid) |
| Mouse | look (click the page to capture the pointer) |
| E | read notice / greet NPCs / pick up / take sealed / put away / step back |
| F | agree (when Old Lin asks) / look at the carried pouch / **hold** to break its seal |
| C | Simplified Chinese subtitles on / off |
| M | sound on / off |
| Esc | pause / step back from dialogue (click to return) |

## Mission One — 错交 “The Wrong Handoff” (3–5 min)

Old Lin asks you to fetch a sealed document pouch that Zhou's family supposedly left on the counter of
Zhou's shuttered watch-repair stall on Hankou Road. The label is written in red marker, in Shanghainese,
in the same hand as the threat scrawled over Zhou's missing-person notice. Take it sealed, or hold **F**
to break the seal: inside is a stall-transfer agreement signed in Zhou's name and dated **31 October**,
two days after he was last seen (29 October, per the notice and Lin), with the new holder's name left
blank. Opening it is permanent: the torn seal shows in your hand, in Lin's hands, and Lin remarks on it.

| Step | Where | How |
|---|---|---|
| Offer | Old Lin, river railing | **E** greet → **F** agree (**E** steps back; he asks again next time) |
| Collect | Zhou's stall, north side of Hankou Road | look at the pouch on the counter, **E** |
| Decide | close-up view | **E** take it sealed · hold **F** ~1 s to break the seal · **Esc** leave it |
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
src/ui/                HUD and stylesheet
tests/                 node tests for movement, collision, boundaries, conversation and Mission One state (npm test)
tools/                 headless screenshot / playtest / render-cost scripts (need Playwright installed globally:
                       NODE_PATH=$(npm root -g) node tools/playtest.mjs;
                       tools/missiontest.mjs plays both Mission One branches with real key presses)
```

Everything is procedural (canvas textures, merged box/cylinder geometry, WebAudio synthesis; temporary Mandarin speech synthesis fallback for NPC lines).
The only third-party assets are three.js and three open-licensed fonts from Fontsource
(Noto Serif SC, Noto Sans SC, Ma Shan Zheng).

Useful URL switches: `?q=0..5` pins the render quality step (0 = best), `?nolock` uses
click-drag look instead of pointer lock, `?subs=0` starts with subtitles off.
