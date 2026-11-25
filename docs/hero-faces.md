# Close-up faces for the main characters

*Started 25 November 2026. The pipeline: `tools/characters/` (README there). The reasoning and budgets:
`docs/research-hero-characters.md`. Who these people are: `docs/characters.md` and the Character Bible.*

## Where it stands

- **Pipeline step 0 is running in the cloud**: Blender 5.3 as a Python module with MPFB2 2.0.18, driven by a JSON
  character sheet (`tools/characters/sheets/<id>.json`), producing Cycles close-ups and a head GLB, plus a three.js
  review page (`tools/characters/review.html`) with dialogue cameras, game-like light and face-shape sliders.
- **Ji Bai, prototype v1** (`sheets/jibai.json`): 180 cm, the face fitted by eye to `docs/jibai-reference.webp`,
  own eyes, brows, lashes, hair cards and 34 face shapes. Every slider is a guess; nothing is LOCKED.
- **Not reachable from the cloud machine:** MPFB's asset packs on static.makehumancommunity.org (skins, hair,
  eyes, the 52 ARKit face units, visemes). The build works without them; with them (on the owner's Mac, or if the
  host is allowed) the face shapes become the real ARKit 52 and lip sync gets its visemes.

## Order of the cast

Who gets a close-up head, in the order the camera needs them. Bodies stay what they are today until each head is
approved (Ji Bai's and Gu Nian's Hunyuan bodies, Rocketbox for the rest); the head is a separate mesh by design.

| # | Who | Reference | Why this order | Notes for the sheet |
|---|---|---|---|---|
| 1 | P01 Ji Bai | `docs/jibai-reference.webp` | mirrors, cutscenes, the character page | black, full, slightly wavy hair over the forehead (LOCKED); clean-shaven, defined jaw |
| 2 | F03 Gu Nian | `docs/gunian-reference.webp` | already has her own body; most dialogue among the five | long dark-brown wavy hair (the hardest groom); pearl earrings |
| 3 | F01 Xu Zhiwei | `docs/zhiwei-reference.jpg` (approved face) | his first engagement, every workday | short ash-blonde layered hair with dark roots; thin silver glasses (a separate mesh) |
| 4 | F04 Lin Yu'an | `docs/yuan-reference.jpg` (approved face) | oldest friend and a romance lead; in the most scenes of the six | shoulder-length dark hair with a slight wave; thin metal glasses |
| 5 | Ji Jianguo (father) | none yet | the final dinner at the Peace Hotel is the game's last close-up | needs an approved face first (OPEN) |
| 6 | F02 Shen Nanxing | none approved | romance lead | dark, full, short curly hair (LOCKED); face OPEN |
| 7 | F05 Tang Kexin | none approved | romance lead | the pink sporty look (LOCKED); face OPEN |
| 8-11 | Lu Mingxuan, Zhou Zimo, Han Zhixia, Cheng Yinuo | none approved | the friends; medium shots more than close-ups | could stay at 1.5-3 m quality (MPFB without the extra passes) |

Faces still OPEN in the Bible (Nanxing, Kexin, the father, the friends) need an approved portrait (front, three
quarter, profile) before a sheet is worth fitting: the owner picks, then an agent fits sliders to it.

## What each head needs after v1 (the human-eye passes)

1. **Likeness:** the owner compares the renders with the reference and says what is off (jaw, eyes, nose, lips);
   an agent moves the sliders. KeenTools FaceBuilder (~$18/month) if sliders can't get there.
2. **Skin (research step 3):** project the chosen portrait onto the head's UVs, a normal map and a roughness map,
   AO and cavity. v1 has procedural colour only (and only the colour reaches the GLB).
3. **Hair (step 4):** v1's cards are grown by a flow field; a person has to groom the silhouette.
4. **Eyes:** a painted iris, a tear line, an occlusion shell.
5. **Face shapes:** swap the 34 MakeHuman units for MPFB's `faceunits01` (52 ARKit) and add `visemes02`
   for lip sync (step 7), from the owner's Mac where the packs download.
6. **Export (step 8):** meshopt (gltfpack) and KTX2 textures; a shared skeleton with the body.

## Budgets (from the research doc) against Ji Bai v1

| | budget | v1 |
|---|---|---|
| head mesh | 8-12k triangles | 8.6k |
| hair | 5-12k | 10.2k (640 cards) |
| brows + lashes | (head budget) | 4.6k + 1.3k: brows could halve |
| eyes, mouth | | 2 × (0.95k ball + 0.95k cornea), 0.6k teeth and tongue |
| face shapes | head-only mesh | 34 on the 8.6k head |
| all of the head | 25-40k with the body | 29.2k (head only; the body is not built yet) |
| GLB | ≤ 5-8 MB per hero | 1.3 MB for the head, before meshopt and KTX2 |

Renders: `docs/hero-faces/jibai-v1-renders.jpg` (Cycles, with the reference), `jibai-v1-threejs.jpg` (the GLB in
the review page, Bund-at-dusk light, smiling). The GLB: `public/people/jibai/head.glb` (not used by the game yet).

## Ji Bai v1: honest read

- Close to the reference: the hair colour and fringe direction, brown eyes looking straight through the lids, a
  clean-shaven skin tone, a working set of face shapes (blinks, smile, jaw, brows) in Blender and in three.js.
- Off: the face is softer and wider than the sheet (the jaw needs more angle, the cheeks less fullness), the lips are
  pale and a little full, the skin is plastic (no texture pass yet), the hair is a dense mop of visible cards rather
  than the sheet's soft tousled volume, and the fringe hides most brow movement.
- Fixed on the way: MPFB's expression units load ten times too strong onto a baked mesh unless its scale factor
  (0.1) is set; the build sets it.
