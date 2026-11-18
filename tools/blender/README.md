# Blender tools

Blender runs here as a Python module (no window): `python -m venv .bvenv && .bvenv/bin/pip install bpy` (Blender 5.2),
then `.bvenv/bin/python -I tools/blender/<script>.py ...`.

- `fp_arm.py SRC.glb OUT.glb`: the first-person hand (`public/people/fp-arm.glb`): the right hand and 7 cm of wrist of
  a Rocketbox man (`public/people/p1.glb`, MIT), cut from the body, the elbow end capped, the skin texture tinted to
  Ji Bai's tone (only the colour texture, not the normal map). `world/fpHand.js` rebinds its skin on load (the glTF
  round trip leaves the inverse-bind matrices in other units than the mesh), lays it on his hand bone, and closes it
  round the cup: the fingers close together until the ring they make with the palm is the cup's size.
