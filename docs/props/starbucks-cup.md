# Starbucks takeaway hot cup

One standalone prop for the Shanghai Bund RPG, matched to the supplied photo
(`Starbucks_Coffee_Cup-with_cup_holders.jpeg`): plain white paper cup, white dome lid, and a smooth kraft
sleeve carrying the green face artwork. No liquid, steam or animation.
Sibling of `coffee-cup/` (Manner); the two share no code or imports.

## Usage

```js
import * as THREE from 'three';
import { createStarbucksCup } from './starbucks-cup/starbucks-cup.js';

const cup = createStarbucksCup(THREE);   // THREE.Group, metres, Y-up
cup.position.set(x, y, z);               // y = surface the cup stands on
scene.add(cup);
// cup.userData.dispose() frees geometry, materials and the sleeve texture.
```

Options (all optional): `sleeve` (true), `segments` (64), `anisotropy` (8), `castShadow` / `receiveShadow` (true),
`createCanvas(w, h)` (for non-DOM environments), `name` ('starbucks-cup'). `STARBUCKS_CUP_DIMENSIONS` is also exported.
Uses only the passed-in `THREE`; no imports.

Origin is the centre of the base (foot ring on y = 0, verified `box.min.y == 0`). The printed face is centred on
local **+Z**; the lid's sip opening is on the opposite side (**-Z**). The only artwork is the sleeve print, painted
procedurally on one 1536x430 canvas (no texture files): `SRGBColorSpace`, repeat wrapping and anisotropy 8, matching
`canvas.js` `tex()`; the kraft fibre grain uses the same seeded RNG as `canvas.js`. With `sleeve: false` the cup is plain white
(as in the photo, the cup itself carries no print). With no canvas available (plain Node) the sleeve falls back to flat kraft.

## Assumed dimensions (the photo gives proportions, not measurements; grande / 16 oz class)

| Part | Value |
|---|---|
| Base diameter | 63.6 mm |
| Body top diameter | 88 mm (wall slope ~0.096, measured from the photo) |
| Rim bead diameter | 92.6 mm |
| Lid brim ring diameter | 98.2 mm; dome 81 mm |
| Body height to rim top | 132 mm |
| Overall height (top of sip lip) | 146.7 mm (dome top 145.9 mm) |
| Sleeve | 70 mm tall (y 32 to 102 mm), 1.2 mm thick, ~79.5 mm outer diameter at mid |
| Sip opening | oval ~19 x 10 mm, thin flat lip, 27 mm toward the back |

Brim-full inner volume is roughly 470 mL. Heights were read off the photo (low camera, ~10 deg elevation, cup width as the scale)
and are good to a few percent at best.

## Grip

`cup.userData.grip` (also `cup.getObjectByName('grip')`) is an Object3D on the cup axis at **y = 0.067 m**
(middle of the sleeve, outer radius ~40 mm), orientation identical to the cup (Y up, face +Z).
Place the palm/finger centre at this anchor with the contact patch about 45-50 mm from the axis
(the NPC thermos sits 45 mm in front of the hand centre in `npcs.js`). Suggested: palm on local -X for a right hand,
+X for a left hand, fingers wrapping the back, so the face stays visible. Keep the cup upright when the NPC elbow rotates.
Nothing is attached to NPCs here.

## Counts

5 meshes (body, lid, sip lip, sip hole, sleeve; 4 without the sleeve), 5 geometries, 4 `MeshStandardMaterial`s
(paper, white lid, dark sip hole, kraft sleeve), 1 canvas texture (1536x430), ~7,700 triangles (default 64 segments).

## Sources

- The supplied photo: lid shape and colour, plain body, wall taper, sleeve height and position, and the face artwork.
  Used only as a visual reference; the artwork was traced by hand into vector polygons (`ART` in `starbucks-cup.js`, in the pixel
  coordinates of a zoom of the photo) and converted with the cylinder foreshortening undone. No photo pixels are used.
- `canvas.js`: texture settings and RNG. `npcs.js`: hand and thermos proportions.
  `lighting.js` / `renderer.js`: blue-hour light setup and ACES tone mapping used for the preview.

## Verification (headless Chromium, SwiftShader WebGL, three 0.187.0)

Checked numerically: base at y = 0, centred, identity transform, no NaN in geometry, counts above, sleeve texture is sRGB / repeat /
anisotropy 8, reported dimensions match the measured bounding box, `sleeve: true/false` and the no-canvas path run without throwing.
Checked visually, side by side with the photo, under neutral and blue-hour light (game hemisphere + sky directional + warm lamp,
ACES, exposure 1.15): front, rear 3/4 (sip opening), top, face close-up. Fixed during the pass: sip lip poked above the dome
silhouette (the photo shows no bump), ink too light, dome slightly short. `preview.png`: front and rear 3/4 under neutral light, 3/4 under blue hour.

## Limitations / untested

- The face artwork is a hand-traced approximation of the photo, not official artwork; the eyes and hair are close but not exact.
  The photo only shows the front, so the print stops at the right edge and the back of the sleeve is plain kraft.
- The sip opening's side and the exact lid details (the real lid has a flatter flange with a rolled edge, and some molded text) are
  not visible in the photo; the brim here is a simple rounded ring.
- Not modelled: sleeve seam or glue overlap, cup seam, sleeve edge bevel.
- Not tested inside the actual game (its environment map, fog, bloom, shadows or NPC attachment).
- Blue-hour check used a re-creation of `lighting.js`, not the game's captured environment.
- Real GPU, mobile and mipmap behaviour untested; only a software renderer was used.
- The Node fallback path was run only for "does not throw" and bounds.
