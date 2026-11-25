# Hero faces (close-up heads from MPFB2)

The pipeline from `docs/research-hero-characters.md`, step 0 and a first pass of steps 2 to 4 and 8, for the
characters the camera gets close to. Plan and status for the cast: `docs/hero-faces.md`.

## Setup (once per machine)

```sh
python3 -m venv .bvenv && .bvenv/bin/pip install bpy            # Blender 5.3 as a Python module, no window
git clone --depth 1 https://github.com/makehumancommunity/mpfb2 ../mpfb2
mkdir -p ~/.bext/user_default && ln -s "$(cd ../mpfb2/src/mpfb && pwd)" ~/.bext/user_default/mpfb
```

MPFB2's repository carries the base mesh, every modelling target, the rigs and the MakeHuman expression units
(all CC0, `LICENSE.ASSETS.md` there). Its separate asset packs (skins, hair, clothes, eyes, the 52 ARKit face units
`faceunits01`, the visemes) come from static.makehumancommunity.org, which the cloud build machine can't reach;
the script works without them (below).

## Build

```sh
BLENDER_USER_EXTENSIONS=~/.bext .bvenv/bin/python -I tools/characters/build_hero.py \
    tools/characters/sheets/jibai.json /tmp/jibai --render --export [--blend] [--fast]
```

- the sheet (`sheets/<id>.json`): MPFB macros (sex, age, muscle, weight, proportions, ancestry), the height in
  metres (the height macro is fitted to it), face targets by path under MPFB's `data/targets` with weights, and
  skin, eye, brow and hair settings. Every number in a sheet is a guess until the owner has judged a render.
- `--render`: Cycles close-ups at 85 mm: `front`, `three-quarter`, `profile`, `medium`, and `expr-<name>` for the
  character sheet's eight expressions. About 1.5 minutes a frame on 4 CPU cores; `--fast` for quick looks.
- `--export`: `<id>-head.glb`: the head (cut at the base of the neck) with its face shapes, eyeballs and corneas,
  teeth, tongue, brows, lashes and hair cards; the skin's procedural colour, normal (pores) and roughness baked to textures on repacked UVs.
- `stats.json`: triangles per part and the GLB size.

What it builds, and what is still a stand-in:

| part | how | stand-in until |
|---|---|---|
| head shape | MPFB targets from the sheet | a human pass on the likeness (or KeenTools FaceBuilder) |
| face shapes | 34 MakeHuman expression units (asian set), renamed to their nearest ARKit names (`jawOpen`, `mouthSmile`, `eyeBlinkLeft`, ...) | the `faceunits01` pack (the real 52 ARKit shapes) and `visemes02` (lip sync) |
| eyes | own eyeball (iris, pupil, limbus) and a bulged clear cornea, aimed through the lids | a painted iris texture, a tear line and eye occlusion |
| brows, lashes | single thin ribbons grown on the skin (cheap enough to ship) | a hand check of shape and density |
| hair | alpha cards marched over the scalp along a flow field (base layer + clumps) | a human groom (the research doc's biggest time sink) |
| skin | procedural colour, cheek and nose warmth, under-eye shadow, stubble shadow, lips, pores and SSS; colour, normal and roughness maps in the GLB | the portrait projection, normal and roughness maps of step 3 |

## Review in the game's renderer

`npm run dev`, then `/tools/characters/review.html?glb=/people/jibai/head.glb`: dialogue, close-up, profile and
three-quarter cameras, four light setups (studio, Bund at dusk, office, night neon), the eight expressions, a slider
per face shape, blinks, eye darts and breathing.

## In the game

- `people.json`: `"head": "<id>/head.glb"` swaps a hero head onto a cast member's body at load (`swapHead` in
  `src/world/people.js`); `"keepHair": true` keeps the body's own sculpted hair and replaces only the skin.
- `/tools/characters/faces.html`: every face at dialogue distance, in the game's renderer and idle pose.
- `repair_eyes.py`: mends a Hunyuan texture whose one eye came out smeared by mirroring the good eye
  (`python3 tools/characters/repair_eyes.py public/people/gunian.glb out.glb --good left --preview /tmp`).
