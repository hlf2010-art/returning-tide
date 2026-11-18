# Blender tools

Blender runs here as a Python module (no window): `python -m venv .bvenv && .bvenv/bin/pip install bpy` (Blender 5.2),
then `.bvenv/bin/python -I tools/blender/<script>.py ...`.

- `fp_arm.py SRC.glb OUT.glb`: the first-person hand (`public/people/fp-arm.glb`): the right hand and 7 cm of wrist of
  a Rocketbox man (`public/people/p1.glb`, MIT), cut from the body, the elbow end capped, the skin texture tinted to
  Ji Bai's tone (only the colour texture, not the normal map). `world/fpHand.js` rebinds its skin on load (the glTF
  round trip leaves the inverse-bind matrices in other units than the mesh), lays it on his hand bone, and closes it
  round the cup: the fingers close together until the ring they make with the palm is the cup's size.
- `bund_kit.py OUT.glb`: the Bund's classical kit (`public/models/bund-kit.glb`): an Attic column base, a 24-flute
  tapering shaft, a Roman Doric capital, one metre of moulded cornice (fascia, cyma reversa, dentils, corona, cyma
  recta) and a vase baluster, each at a unit size. `world/bund.js` (`loadBundKit`, before the Bund is built) puts them
  where its colonnades and cornices go, scaled to each building; without the file the plain shapes stay.
- `jb_texture.py IN.png OUT.png` and `put_texture.mjs IN.glb OUT.glb PNG`: Ji Bai's colour texture cleaned (dark
  texels bled into the skin, the black padding round the skin islands, unbaked specks) and put back into the GLB
  without touching the rig.
