# 回潮 Returning Tide — Project Document

*Handover document, 16 November 2026. Branch `phase4` (worktree `/home/user/bund-rpg/bund-next`), fast-forwarded into local `master` (`/home/user/bund-rpg/bund-rpg`). Last commit: `d265f73`. Nothing has been pushed to a remote.*

---

## 1. Background

Returning Tide is a first-person RPG set in contemporary Shanghai that runs in the browser. It started as a single playable slice: Mission One, "The Wrong Handoff", on Hankou Road and the Bund at blue hour after rain. It has since grown in phases into a small open-world life sim around the northern Bund. The design goal is a grounded, believable city: real geography, the real November sun, real opening hours and real transit, with people who behave plausibly. The emphasis is on atmosphere and everyday life rather than combat.

## 2. Scope

**In scope (built):**
- The northern Bund:
  - Hankou Road, about 155 m of the promenade and Jiujiang Road.
  - Nanjing Road East as far as Henan Road.
  - The Peace Hotel (lobby, sixth floor, room 612, the Jazz Bar) and the AIA Building interior.
  - Metro Line 2 exits, with one stop to Lujiazui.
  - A river-cruise pier, a shengjian shop and Manner Coffee.
- Pudong's skyline across the Huangpu, as scenery.
- Systems:
  - Quests, dialogue and free-text talk through a local LLM.
  - A phone with chats, JD/Taobao shopping, DiDi rides and payments.
  - A makerspace where you build gadgets.
  - Buying and driving a Lamborghini Huracán.
  - Crowds, traffic, buses and the metro.
  - Weather (a drizzle) and a full time of day.
  - Saves, a map, gamepad support, first-play tips and a benchmark.
- Interface in both Chinese and English (zh/EN, one at a time).

**Out of scope / not planned:** multiplayer, combat, real money or paid services (all money is fictional), and mobile/touch play (the game is desktop with WebGL2).

## 3. Storyline

**Protagonist:** 沈既白 Shen Jibai, 23, from Nanjing.
- He has just graduated in industrial design in San Francisco.
- His father runs a precision-machining firm and wants him home to run the R&D floor. Jibai wants his own studio in Shanghai.
- He has one year and a budget to prove himself.
- His circle is five school friends, the "金陵五虎+1" group chat. Full cast: `docs/characters.md`.

**Mission One, 错交 "The Wrong Handoff":** Old Lin sends you to fetch a sealed pouch from the shuttered stall of Zhou, a missing watch-repairer. Inside is a stall-transfer agreement dated after Zhou disappeared, with the new holder's name left blank. Whether you break the seal is permanent and remembered.

**Main arc:** three acts with six endings, in `src/world/story.js`.
- **Act 1:** first night; a gig with Momo.
- **Act 2:** a robot-arm prototype from Xuan; Dad's offer.
- **Act 3:**
  - Dinner with Dad at the Jazz Bar. Your answer there can be: stay, go home, work together, stay silent, or not turn up.
  - "Tide", which picks the ending from your choices, deeds and affinity.

**Side content:** street moments (a lost visitor, a couple's photo, a dropped phone), Momo's gig and friend scenes.

## 4. Setting

The game takes place in mid-November 2026, at latitude 31.2° N.
- **Daylight:** sunrise about 6:25, sunset 4:55, dark by 5:40. The game opens at **17:42**.
- **Bund lighting:**
  - Façade floods come on around 17:10.
  - Late-night mode starts at 22:00: floods dim and Lujiazui's LED walls go off.
  - Floods go off at 00:30.
- **City hours:**
  - Nanjing Road shops: 10:00–22:00. Neon: until 23:00.
  - Metro: about 5:30–23:00.
- **Morning life:** tai chi on the promenade 5:45–8:15, plus dawn joggers.

Where the game departs from reality, it says so. For example, the real cruise piers are at Shiliupu, and some business names are invented.

## 5. Artistic style

- Photographic realism at dusk: hazy, wet, warm sodium and flood light against blue sky.
- Rendering: SSR reflections only in puddles (masked), restrained bloom and halos, and real sun shadows by day.
- People:
  - Microsoft Rocketbox avatars (MIT licence), including child avatars.
  - Distant crowds are drawn as baked impostors.
- Sound is mostly procedural. Voices are pre-recorded with Kokoro TTS. Robotic browser speech is off by default.
- Typography: Inter, Noto Sans/Serif SC and Ma Shan Zheng.
- A minimal HUD, subtitles, and a phone UI as the main menu metaphor.
- Real brand logos appear only for real brands (via simple-icons).

## 6. Tech stack

- **Engine and build:**
  - JavaScript (ES modules), three.js 0.187, Vite 8.
  - No framework. The DOM is used for the UI.
- **Talking to NPCs:**
  - In the browser: `@mlc-ai/web-llm`.
  - Or a local Ollama-compatible server. For development: llama-cpp-python serving qwen2.5-3b on :11434 under the alias `qwen2.5:7b`.
- **Voices:** Kokoro (Python 3.12 venv), pre-rendered offline with `tools/voice/`.
- **Tests:**
  - About 32 unit suites in Node: `npm test`.
  - Playwright walk-throughs in `tools/*walk.mjs` and `tools/*test.mjs`. These run in headless Chromium with SwiftShader, which is slow, so they need generous timeouts.
  - The `?q=` URL flag puts the game in measurement mode and pins the hour to 17:42, unless you also pass `&hour=` or `&tod`.
- **Packaging:** `OUT=<dir> bash tools/package.sh` produces `ReturningTide.zip` (about 117 MB). It includes Mac/Windows launchers and a tiny static server.
- **Running it:**
  - `npm run dev` serves on :5173.
  - `npx vite build`, then `npx vite preview --port 4174 --strictPort`, serves the build that the tools use.

## 7. Milestones

| Phase | Content | Status |
|---|---|---|
| M1–M3 | Mission One slice, interaction loop, signals and traffic, drizzle, phone, i18n | Done |
| Phase 2 (in M3 README) | Shopping, DiDi, northern Bund, Peace Hotel and AIA interiors, Jazz Bar, makerspace, Huracán, Manner Coffee, LLM talk | Done |
| Phase 3 | Crowds and impostors, buses, Nanjing Road to Henan Road, metro, graphics presets, night look | Done |
| 4.1 Story | Quest engine, three acts, six endings, journal (J), dinner with Dad | Done |
| 4.2 Time of day | `timeOfDay.js` drives sky, lights, shops, crowd, traffic and metro | Done |
| 4.3 Living street | Murmur, families, umbrellas, three street moments | Done |
| 4.4 Places | Shengjian shop, river cruise | Done |
| 4.5 Player basics | Map (M), gamepad, three save slots, tips, benchmark | Done |
| Bug-fix round | See §8 | Done, except the open issues in §9 |
| 5 Something of your own | The night gimbal's week: revise by day, lend it at dusk, write it up at night; three regulars; the dinner reads what you built; an afterword on each ending | Done (see §8a and §9) |

## 8. Completed (latest bug-fix round)

- **Pedestrians in the bind pose** (sliding with arms at 45° and straight legs, mostly when far away or paused). Fixed in `people.js`, `crowdView.js` and `dawn.js`:
  - The impostor bake now gets the people's animation actions directly.
  - An instant (zero-fade) animation swap no longer drops them into the bind pose.
- **Mirror-like roads and cars.** The SSR mask was being ignored; it is now patched (`renderer.js`). Puddles are smaller. Car paint and glass are no longer metallic.
- **Too much halo:** bloom lowered to 0.24 (less by day), lamp halos ×0.26.
- **NPC "sorry" chatter:**
  - Bumps between NPCs make no speech, only an occasional look.
  - People in the same group never react to each other.
  - Speech happens only when the player bumps someone, and is rate-limited.
- **Robotic voice:** the browser speech synthesizer is off unless you choose it. The setting "Voices for new lines" is Subtitles only (default) / Browser / Server.
- **Stamina:** about 45 s of running, with a visible bar (`stamina.js`, `hud.js`).
- **Unmarked entrances:** `world/entrances.js` adds a warm light pool and a floating label (visible within 36 m, hidden behind walls) at the Peace Hotel, AIA, the shengjian shop, the metro exits and the pier.
- **Pedestrians stuck at kerbs** (`engine/crowd.js`):
  - Walkers who reach a zebra crossing without having waited now go back to the wait-at-the-kerb step.
  - People blocked at planter corners sidestep around them.
  - In the node simulation, people stuck for more than 8 s dropped from 10 to 3.

## 8a. Completed (phase 5: something of your own)

Goal: give the days between story beats a purpose, make the evenings worth coming back to, and make the dinner with Dad weigh what the player actually built.

- **Rules** (`src/engine/studio.js`, pure): versions, nine issues found only in the field, ten fixes with costs in hours, yuan, grams and battery minutes, the battery's goes per evening, the regulars' memory and promises, the nightly page, the waiting list and price.
- **Words** (`src/world/work.js`): every issue, fix, remark and message in Chinese and English; Dad's reading at the dinner; an afterword for each of the six endings; the side quest `own-work`.
- **In the world**: lending on the promenade (`src/world/fieldTest.js`), the desk in 612 (`src/world/workDesk.js`), the notebook (`src/ui/workbook.js`, N), a *revise* entry on the bench panel, a Work tab in the journal, the gimbal on the dinner table.
- **Saves**: same format (`v: 1`); new state under `flags.studio`; a gimbal built earlier is version 1; nothing changes for a save with no gimbal.
- **Tests**: `tests/studio.test.mjs` (in `npm test`), `tools/workwalk.mjs` (English and Chinese).

## 9. Failed attempts, ongoing issues, known risks

- **3 followers still stuck** in `scratchpad/stuck.mjs`, around x≈−30, z≈2.6. Their `next` is null and they are trailing a group leader. Not yet investigated.
- **The kerb fix has not been verified in the browser.** The in-game stuck log (`scratchpad/stuck2.mjs`, which needs the preview on :4174) has not been rerun since the fix, and neither have streetwalk, traffictest and p3walk.
- **The full Playwright regression has not been rerun** after the last two commits. Earlier result: 17/22 passed, then the 5 failing suites passed on a rerun. The failures were timing flakiness under SwiftShader, not game bugs.
- **Flaky tools:** the walk-throughs are timing-sensitive. Wait on game state, not fixed delays.
- **The preview server dies** when the worker restarts. Restart it with nohup.
- **talkwalk needs the local LLM server running.** It fails otherwise.
- **No download URL can be produced.** The zip is delivered only as a file attachment.
- **Phase 5 has no recorded voices.** The new lines (the regulars, passers-by with the gimbal, Dad's reading at the dinner) show as subtitles only unless the player picks a voice for new lines; they have not been rendered with Kokoro.
- **Phase 5 has not been playtested by a person, or measured on a Mac M4.** See the hand-back report for what was measured instead.
- **Fidelity caveats** are documented in the README: invented business names, the pier location, the 22:00 late-night switch time.

## 10. Constraints

- Keep the user's personal details private. Never send them to outside services.
- Git: commit locally only. **No push, no PRs.** Fast-forwarding local master is OK: `git -C /home/user/bund-rpg/bund-rpg merge --ff-only phase4`.
- No paid services or APIs. In-game money is fictional only.
- Report results honestly: say what was and wasn't verified.
- Preserve the existing city layout, controls and missions. Don't regress them.
- Don't work around the denied permission for `gltf-transform`.
- Use real logos only for the brands that really appear.
- Desktop WebGL2 target; there is a "Mac M4" preset; the benchmark is in-game.

## 11. Next steps

1. Rebuild (`npx vite build`), start the preview on :4174 and run `stuck2.mjs`. Expect close to zero stuck agents.
2. Fix the remaining stuck followers, either by making followers re-target when their leader stops or by adding a stuck timer that nudges people around obstacles.
3. Rerun the regression: streetwalk, traffictest, p3walk, then the full tool suite. Fix any flakiness.
4. Update the README for the kerb fix. Commit, fast-forward master, run `tools/package.sh` and deliver the zip.
5. Wait for the next round of user playtest feedback. Their reports have mostly been about how the crowd looks and behaves.

## 12. Key files

- `src/main.js`: wiring.
- `src/engine/`: pure logic, mostly unit-tested.
  - `crowd.js`, `quests.js`, `timeOfDay.js`, `voice.js`, `stamina.js`, `llm.js`, `drive.js`, `studio.js`.
- `src/world/`: scene content.
  - `people.js`, `crowdView.js`, `story.js`, `entrances.js`, `cruise.js`, `dawn.js`, `bumps.js`, `materials.js`, `lighting.js`, `interiors.js`, `work.js`, `fieldTest.js`, `workDesk.js`.
- `src/ui/`: HUD, phone, i18n, talk, the notebook (`workbook.js`).
- `tests/*.test.mjs`: unit tests (`npm test`).
- `tools/*.mjs`: Playwright walk-throughs.
- `tools/package.sh`: builds the package.
- `README.md`: the detailed reference, about 1,250 lines, one section per system.
- `docs/characters.md`: the cast.
