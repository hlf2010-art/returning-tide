# Cloth and hair that move (spring bones)

`node tools/cloth/cloth.mjs public/people/<role>.glb [out.glb] [role]` adds chains of bones named `Spring_*` to a model and
gives part of the cloth's weight to them; `src/world/springs.js` swings them at runtime (inertia, gravity, a pull back to the
animated pose, pushed out of the legs and body), for anyone within 30 m of the camera.

What each avatar gets is `PARTS` in `cloth.mjs`:

| avatar | who | parts |
|---|---|---|
| c2 | Kexin / Yu'an / Taoke | knit dress skirt (10 chains × 2), ponytail |
| su | Feng Yulan | pencil skirt (stiff) |
| c4 | Zhiwei | ponytail, wide trouser legs |
| p5 | Zhiwei / Gu Nian (alternates) | wide trouser legs |
| p2, c3 | crowd / cast | cardigan hems |
| c1 | Yu'an | ponytail |
| player | Ji Bai | trouser legs, jacket hem (given at 96 cm) |
| gunian | Gu Nian (her own model) | long hair (3 chains, found by colour), wide trouser legs, blazer hem (89 cm) |

It refuses a model that already has springs: run it on the model without them (`git show <commit>:public/people/<role>.glb`).
Then update `"bytes"` in `public/people/people.json`. Dependencies: as `tools/jibai/README.md`.
