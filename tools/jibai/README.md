# Ji Bai's 3D model

`public/people/player.glb` is Ji Bai made from his character sheet (`docs/jibai-reference.webp`, the A-pose views in
`docs/jibai-views/`) with Tencent Hunyuan 3D, then made a game character here:

1. `simplify.mjs IN.glb OUT.glb 0.05`: weld, simplify (meshoptimizer: ~1M → 50k triangles), textures to 2048 px JPEG.
2. `rig.mjs RB.glb SIMPLE.glb OUT.glb`: the Rocketbox Biped skeleton of the old player model (`RB.glb`, e.g.
   `git show 53515bd:public/people/player.glb`) fitted to him (arm chains turned and scaled to his fingertips, legs to
   his ankles, 182 cm so the root motion keeps his feet on the ground). His body is first moved front/back onto the
   Rocketbox body (slice depth midpoints); his shoulder joints are measured from his armpits (`shoulder.mjs`: the top of
   the arm where it separates from the torso, 1 cm in and down), and each forearm is turned about its axis so the
   hand bone faces the way his palm does (the flattest direction of the points around the palm), or he stands with
   his palms forward. Last, after the weights, each arm's bind is turned 4° outward (`ADDUCT`), so every clip (made for
   a bulkier body in a blazer) brings his arms that much closer to his sides. weights
   transferred from the Rocketbox body deformed into that pose (nearest vertices, normals agreeing; fingers to the hand,
   face to the head), smoothed; his neck and face skin on the head bone, so first person hides it with the head.
   Same bone names and hierarchy, so every clip in `anim-player.glb` / `anim-m.glb` plays on him unchanged.

Dependencies (not the game's): `npm i @gltf-transform/core@4 @gltf-transform/functions@4 @gltf-transform/extensions@4 meshoptimizer@0.22 three sharp`.
Then update `"bytes"` for `player` in `public/people/people.json`.

## Gu Nian (`public/people/gunian.glb`)

The same, on the Rocketbox woman's skeleton (the c4 model before springs, `git show cbe1775~1:public/people/c4.glb`), at her
height (173 cm): `NAME=GuNian PALMMAX=12 ADDUCT=0 SHOULDER=0 node rig.mjs c4.glb simple.glb gunian.glb`: her boxy blazer
has shoulder pads, so the skeleton keeps its own shoulders and the arms aren't drawn in; her small hands give an unreliable
palm direction, so its turn is capped. Then `tools/cloth/cloth.mjs gunian.glb gunian.glb gunian`. In people.json she is
`"named": true`, so the crowds never wear her.

## Fingers (`fingers.mjs`)

`node fingers.mjs player.glb player.glb` (run after `rig.mjs`, before or after `cloth.mjs`): the transferred finger
weights bound each of his fingers partly to its neighbours' bones (the Rocketbox fingers lie elsewhere), so any finger
pose tore the hand. The fitted finger bones don't sit inside his modelled fingers either, so the four fingers are bound
as one, in bands past the knuckle line on the middle finger's bones, and the thumb rides with the hand. First person
(`world/playerBody.js` gripCup) closes the hand round a cup with the middle finger's chain.

## Provenance (checked 25 November 2026)

What the repo and project notes record, and what they don't:

| Asset | Made from | Recorded | Not recorded |
|---|---|---|---|
| `docs/jibai-reference.webp`, `docs/gunian-reference.webp`, `docs/jibai-views/`, `docs/zhiwei-reference.jpg`, `docs/yuan-reference.jpg`, and the portraits and expressions in `public/people/{jibai,gunian,zhiwei,yuan}/` | character sheets supplied by the project owner (Character Bible v2.2, F01 to F04 cards; uploaded 17 November 2026) | that they are the owner's approved sheets | which image tool made them, on which plan, and under which terms; any embedded metadata (C2PA, XMP, EXIF) was stripped before they reached the repo |
| `public/people/player.glb`, `public/people/gunian.glb` | Tencent Hunyuan 3D, from the A-pose views, then simplified and rigged here | the tool's name | the version, and whether it ran as Tencent's hosted service (its service terms apply) or as the open weights (the Tencent Hunyuan 3D community licence: not for use in the EU, the UK or South Korea, and a separate licence above a monthly-user threshold; see `docs/research-hero-characters.md`) |
| `public/people/jibai/head.glb` | MPFB2 in Blender (`tools/characters/`) | open tools: MakeHuman assets are CC0, MPFB is GPL (the tool, not its output) | |

Before release: record the image tool, plan and terms for the sheets, and the Hunyuan route and version, here and in
`src/ui/credits.js`. The hero-face pipeline (`docs/hero-faces.md`) is replacing the faces with MPFB heads, which removes
the Hunyuan faces from close-ups; the Hunyuan bodies stay until it covers bodies too.
