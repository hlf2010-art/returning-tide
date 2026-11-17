# Ji Bai's 3D model

`public/people/player.glb` is Ji Bai made from his character sheet (`docs/jibai-reference.webp`, the A-pose views in
`docs/jibai-views/`) with Tencent Hunyuan 3D, then made a game character here:

1. `simplify.mjs IN.glb OUT.glb 0.05`: weld, simplify (meshoptimizer: ~1M → 50k triangles), textures to 2048 px JPEG.
2. `rig.mjs RB.glb SIMPLE.glb OUT.glb`: the Rocketbox Biped skeleton of the old player model (`RB.glb`, e.g.
   `git show 53515bd:public/people/player.glb`) fitted to him (arm chains turned and scaled to his fingertips, legs to
   his ankles, spine and head to his body's middle, 182 cm so the root motion keeps his feet on the ground); weights
   transferred from the Rocketbox body deformed into that pose (nearest vertices, normals agreeing; fingers to the hand,
   face to the head), smoothed; his neck and face skin on the head bone, so first person hides it with the head.
   Same bone names and hierarchy, so every clip in `anim-player.glb` / `anim-m.glb` plays on him unchanged.

Dependencies (not the game's): `npm i @gltf-transform/core@4 @gltf-transform/functions@4 @gltf-transform/extensions@4 meshoptimizer@0.22 three sharp`.
Then update `"bytes"` for `player` in `public/people/people.json`.
