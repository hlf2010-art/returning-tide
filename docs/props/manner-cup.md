# Manner takeaway coffee cup

One standalone prop for the Shanghai Bund RPG: white tapered paper cup, black triangular MANNER mark,
translucent lid, red heart stopper. No liquid, steam or animation.

## Usage

```js
import * as THREE from 'three';
import { createCoffeeCup } from './coffee-cup/coffee-cup.js';

const cup = createCoffeeCup(THREE);   // THREE.Group, metres, Y-up
cup.position.set(x, y, z);            // y = surface the cup stands on
scene.add(cup);
// cup.userData.dispose() frees geometry, materials and the label texture.
```

Options (all optional): `segments` (48), `anisotropy` (8), `castShadow` / `receiveShadow` (true),
`createCanvas(w, h)` (for non-DOM environments), `name` ('manner-cup').
`COFFEE_CUP_DIMENSIONS` is also exported. Uses only the passed-in `THREE`; no imports.

Origin is the centre of the base (foot ring on y = 0, verified `box.min.y == 0`). The logo faces local **+Z**.
The label is painted procedurally on a canvas (no texture files); the texture uses `SRGBColorSpace`,
repeat wrapping and anisotropy 8, matching `canvas.js` `tex()`. Without any canvas (e.g. plain Node) the
cup falls back to plain white paper instead of throwing.

## Assumed dimensions (the photo gives no real measurements)

| Part | Value |
|---|---|
| Base diameter (wall bottom) | 55.6 mm |
| Body top diameter | 81.6 mm |
| Rim bead diameter | 89.6 mm |
| Lid skirt diameter | 96.4 mm |
| Body height to rim top | 76.3 mm |
| Lid top (raised ring) | 81.5 mm |
| Overall height incl. heart | 92.5 mm |
| Heart stopper | ~13 mm wide, 4 mm thick, 16 mm toward the logo side of centre |

Roughly an 8 oz class cup (~220 mL brim-full, estimated). Proportions (wall slope ~0.2, squat body,
logo ~31 mm wide) were taken from the photo; absolute size is a guess. Sanity check against `npcs.js`:
the NPC thermos is 68 mm in diameter and the cup is ~69 mm across at mid-body, so it suits those hands.

## Grip

`cup.userData.grip` (also `cup.getObjectByName('grip')`) is an Object3D on the cup axis at **y = 0.036 m**
(mid-body, cup radius ≈ 34.5 mm), orientation identical to the cup (Y up, logo +Z).
Put the palm/finger centre at this anchor with the contact patch roughly 45 mm from the axis
(the NPC thermos sits 45 mm in front of the hand centre in `npcs.js`). Suggested: palm on local −X for a
right hand, +X for a left hand, fingers wrapping the back. Keep fingers more than ~35° away from +Z
so the logo stays visible. Keep the cup upright when the NPC elbow rotates (counter-rotate it).
Nothing is attached to NPCs here.

## Counts

4 meshes (body, lid, stopper post, heart), 4 geometries, 3 `MeshStandardMaterial`s
(paper with label, translucent lid at 58% opacity, red stopper), 1 canvas texture (2048×720),
~5,300 triangles.

## Sources

- `references/manner-cup-reference.jpg` (Trip.com photo, see `PHOTO_SOURCE.txt`): shape, proportions, logo layout, lid and heart.
  Used as a visual reference only, not as a texture.
- `canvas.js`: texture colour space and settings. `npcs.js`: hand and thermos proportions.
  `lighting.js` / `renderer.js`: blue-hour light setup and ACES tone mapping used for the preview.

## Verification (headless Chromium, SwiftShader WebGL, three 0.187.0)

Checked numerically: base at y = 0, centred on the axis, identity transform, no NaN in geometry,
counts above, sRGB texture. Checked visually under neutral light and blue-hour light (game hemisphere +
sky directional + warm lamp, ACES, exposure 1.15): front, 3/4, back, top and logo close-up.
Fixed in the pass: label was also printing (mirrored) on the cup interior; cup body was ~10% too tall vs the photo.
`preview.png` shows front/3-4 under neutral light and 3/4 under blue hour.

## Limitations / untested

- Not tested inside the actual game (its environment map, fog, bloom, shadows or NPC attachment).
- Blue-hour check used a re-creation of `lighting.js`, not the game's captured environment.
- Real GPU, mobile and mipmap behaviour untested; only a software renderer was used.
- Translucent lid sorting against other transparent game objects is untested; the lid does not cast shadows.
- Not modelled: the tiny embossed lid text, back artwork, seam, cup-bottom printing, any yellow tint seen in the photo.
- The logo is a hand-built vector approximation (stroke letters), not the official artwork.
- The Node fallback path (no canvas) was run only for "does not throw" and bounds.
