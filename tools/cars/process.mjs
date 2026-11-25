// Real car models (Sketchfab, CC BY: see public/models/cars/CREDITS.md) made into traffic cars:
// scaled to the real car's length, nose to +z, centred on its footprint with the tyres on y = 0;
// the interior dropped (tinted glass hides it), materials assigned by part where the model came
// untextured, identical materials merged so a car is a handful of draw calls, simplified to a
// traffic budget, textures at most 1024 px.
//   node tools/cars/process.mjs <in.glb> <out.glb> <car id>     (also writes <out>-far.glb, ~6k triangles)
// Dependencies (not the game's): npm i @gltf-transform/core@4 @gltf-transform/functions@4
//   @gltf-transform/extensions@4 meshoptimizer@0.22 sharp draco3dgltf
import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, flatten, join, weld, simplify, prune, textureCompress, transformMesh, resample } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import draco3d from 'draco3dgltf';

// per car: real length (m), the triangle budget, and (for untextured models) what each material is
const CARS = {
  'byd-seal': { length: 4.80, tris: 42000, error: 0.004 },
  'byd-han': {
    length: 4.995, tris: 36000,
    // the model came with every material a default grey: assign by name; null drops the part (interior)
    parts: [
      [/^1_Body$/, 'paint'],
      [/^(1_Glass|insideglass|Alpha)$/, 'glass'],
      [/^(EXT_Tyre)$/, 'tyre'],
      [/^(EXT_Disc|brake_hole)$/, 'disc'],
      [/^BRAKE$/, 'caliper'],
      [/^(1_Plasitc_Chrome_Outside|1_Plasitc_Chrome_Outside_Chrome|Chrome|AO_EXT_Chrome|1_Light_Int_Chrome|Mirror)$/, 'chrome'],
      [/^(BlackRF|1_Int1_MenKuangBlack|SUSP_BLACK|default|material|material_32|Ao_Huise)$/, 'black'],
      [/^1_Light_IntRearLight$/, 'tail'],
      [/^(1_Light_Int|1_Light_Int_Cap|1_Light_Int_R2|Bulb)$/, 'lamp'],
      [/^logo5$/, 'keep'],
      [/./, null],                                                   // everything else: the cabin's insides
    ],
  },
};
const LOOK = {
  paint:   { color: [0.92, 0.92, 0.93], metal: 0.35, rough: 0.28 },
  glass:   { color: [0.035, 0.04, 0.045], metal: 0.4, rough: 0.06 },
  tyre:    { color: [0.04, 0.04, 0.045], metal: 0, rough: 0.9 },
  disc:    { color: [0.35, 0.35, 0.36], metal: 0.8, rough: 0.45 },
  caliper: { color: [0.12, 0.12, 0.13], metal: 0.4, rough: 0.5 },
  chrome:  { color: [0.62, 0.63, 0.66], metal: 1, rough: 0.22 },
  black:   { color: [0.035, 0.035, 0.04], metal: 0.1, rough: 0.35 },
  tail:    { color: [0.45, 0.03, 0.03], metal: 0.1, rough: 0.2, emissive: [0.35, 0.01, 0.01] },
  lamp:    { color: [0.85, 0.87, 0.9], metal: 0.6, rough: 0.12, emissive: [0.25, 0.25, 0.27] },
};

const [inp, out, id] = process.argv.slice(2);
const C = CARS[id]; if (!C) throw new Error(`no settings for ${id}`);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule() });
const doc = await io.read(inp), root = doc.getRoot();

// 1. parts by name (untextured models): drop the cabin, give the rest their look, name them for the game
if (C.parts) {
  const made = {};
  const mat = (kind) => {
    if (made[kind]) return made[kind];
    const L = LOOK[kind], m = doc.createMaterial(kind).setBaseColorFactor([...L.color, 1]).setMetallicFactor(L.metal).setRoughnessFactor(L.rough);
    if (L.emissive) m.setEmissiveFactor(L.emissive);
    return (made[kind] = m);
  };
  for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) {
    const name = p.getMaterial() ? p.getMaterial().getName() : '';
    const kind = (C.parts.find(([re]) => re.test(name)) || [null, null])[1];
    if (kind === null) { mesh.removePrimitive(p); p.dispose(); continue; }
    if (kind !== 'keep') p.setMaterial(mat(kind));
  }
}
await doc.transform(prune());

// 2. flatten the hierarchy, then scale, turn and place it
await doc.transform(flatten());
const scene = root.getDefaultScene() || root.listScenes()[0];
let b = getBounds(scene); const size = b.max.map((v, i) => v - b.min[i]);
const along = size[0] > size[2] ? 0 : 2;                              // its long axis
const k = C.length / size[along];
const holder = doc.createNode('car');
for (const n of scene.listChildren()) { scene.removeChild(n); holder.addChild(n); }
scene.addChild(holder);
holder.setScale([k, k, k]);
if (along === 0) holder.setRotation([0, Math.SQRT1_2, 0, Math.SQRT1_2]);   // long axis to z
b = getBounds(scene);
const cx = (b.min[0] + b.max[0]) / 2, cz = (b.min[2] + b.max[2]) / 2;
holder.setTranslation([-cx, -b.min[1], -cz]);
// bake every transform into the vertices: one node, metres, nose (assumed) toward +z
await doc.transform(flatten());
for (const n of root.listNodes()) {
  const mesh = n.getMesh(); if (!mesh) continue;
  transformMesh(mesh, n.getWorldMatrix());
  n.setMatrix([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}
for (const n of root.listNodes()) if (n.getParentNode && n.getParentNode()) { /* (flat already) */ }
for (const n of [...scene.listChildren()]) if (!n.getMesh() && n.listChildren().length) { for (const c of n.listChildren()) { n.removeChild(c); scene.addChild(c); } }

// 3. merge identical materials and everything that shares one, weld, simplify to the budget
await doc.transform(dedup(), join({ keepNamed: false }), weld(), prune());
let tris = 0; for (const m of root.listMeshes()) for (const p of m.listPrimitives()) tris += p.getIndices().getCount() / 3;
await MeshoptSimplifier.ready;
if (tris > C.tris) await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: C.tris / tris, error: C.error ?? 0.002, lockBorder: false }), prune());
await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024] }), resample(), dedup(), prune());

let after = 0; for (const m of root.listMeshes()) for (const p of m.listPrimitives()) after += p.getIndices().getCount() / 3;
b = getBounds(scene);
await io.write(out, doc);
// and a far version (beyond ~35 m: world/carModels' LOD), about 6k triangles
await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, 6000 / after), error: 0.05, lockBorder: false }), weld(), prune());
let far = 0; for (const m of root.listMeshes()) for (const p of m.listPrimitives()) far += p.getIndices().getCount() / 3;
await io.write(out.replace(/\.glb$/, '-far.glb'), doc);
console.log(id, `triangles ${Math.round(tris)} -> ${Math.round(after)} (far ${Math.round(far)})`, `primitives ${root.listMeshes().reduce((s, m) => s + m.listPrimitives().length, 0)}`, `materials ${root.listMaterials().map((m) => m.getName()).join(',')}`, `size ${b.max.map((v, i) => (v - b.min[i]).toFixed(2)).join(' x ')} m`);
