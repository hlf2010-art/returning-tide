# 回潮 Returning Tide: handover

*Updated 25 November 2026 (release blockers revised the same day). This replaces the handover of 16 November (branch `phase4`, commit `d265f73`), whose paths,
branch names and git rules no longer apply. `README.md` is the full, current reference; this page is the map.*

## What it is

A first-person RPG and life sim set in contemporary Shanghai that runs in the browser (three.js + Vite, no framework).
Ji Bai (纪白), 27, back from the Bay Area, has a year to make a life of his own in Shanghai before a dinner with his
father at the Peace Hotel. The year is played as 17 days across five acts, with weeks passing between them.

Walkable area: Hankou Road, the northern Bund promenade, Jiujiang Road, Nanjing Road East from the Bund to Xizang Road,
the Peace Hotel and the AIA Building inside, Metro Line 2 (East Nanjing Road and Lujiazui stations, ridden under the
river), the ferry, and Lujiazui around IFC. A DiDi reaches further places (the Yangpu makerspace and others).

## Where to read

| Topic | Document |
|---|---|
| Everything in the build, controls, code layout, credits | `README.md` |
| The story's spine and the working life | `docs/year.md`, `docs/time.md` |
| Characters and relationships | `docs/characters.md`, `docs/relationships.md` |
| Crowds and traffic: plan and phases | `docs/living-city-architecture.md` (Phases 0 and 1 done, 2 to 5 not started), `docs/living-city*.md` |
| Places | `docs/lujiazui.md`, `docs/metro.md`, `docs/nanjing-road-shops.md` |
| Sound and music, with every licence | `docs/sound.md`, `docs/music.md` |
| Hero characters (next art pipeline) | `docs/research-hero-characters.md` |
| Fighting | `docs/fighting.md` |

## Run and check

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # the node suites in tests/
npm run build && npm run preview    # production build on :4173
npm run playtest     # tools/playtest.mjs against the preview build (headless Chromium)
```

## Before any public or commercial release

The release-blockers inventory (25 November 2026) listed five; four are fixed on `master`:

- **ElevenLabs free-plan audio:** gone. Every voice and the payment speakers are Kokoro (Apache-2.0); the beds and
  breathing are synthesised in code; the 22:00 sigh is layered Kokoro voices (`docs/sound.md`).
- **The Huracán:** replaced by the Corvina Strale, an invented marque and car modelled in code
  (`src/world/supercarModel.js`). No Lamborghini name remains.
- **Real brands:** car makers, phone apps, payment marks, cafés, banks, hotels and about 64 chain shops on Nanjing Road
  and in Lujiazui are invented (`src/ui/brands.js`, `src/world/njShops.js`). Heritage 老字号 shops on Nanjing Road
  keep their real names, as a place's history; review that choice before release.
- **Credits:** Settings → "Credits and licences" (`src/ui/credits.js`); `tests/credits.test.mjs` fails if a licensed
  asset ships uncredited or anything non-commercial is credited.

Still open:

- **Character art provenance:** the AI-made character sheets and the Hunyuan 3D models of Ji Bai and Gu Nian need
  their tools and terms recorded and checked.
- **The BYD Han model** (CC BY 4.0, badges removed) is credited; consider replacing it with an invented saloon.

## Working on the repo

- Develop on a branch and open a pull request into `master`.
- Keep `README.md` current when a feature changes; it is the reference other docs point to.
- Record the source and licence of every new asset next to it (a `CREDITS.md` in its folder, or `docs/sound.md` for
  audio) and add it to `src/ui/credits.js`.
