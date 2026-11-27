// The Corvina Strale's body: the Khronos "Car Concept" (CC BY 4.0, started from Unity Fan's CC0 concept car;
// credits in public/models/cars/CREDITS.md) made into the game's parked supercar.
//   node tools/cars/supercar.mjs <CarConcept.glb> public/models/cars/strale.glb
// What changes: every Khronos / 3D Commerce logo is removed (the licence excludes them: the emissive logo
// texture, the plate texture, the tyre-wall lettering in colour and relief), the material variants are
// dropped (the game paints it), the glass is plain tinted alpha instead of transmission (one less render
// pass for Safari), materials get the names world/huracan.js looks for (CarPaint, Light_*), the wheels the
// node names it turns (Wheel_02_LF_19 ...), the wipers and rims are thinned, textures at most 1024 px webp.
// Dependencies (not the game's): see tools/cars/process.mjs.
import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, weld, simplifyPrimitive, textureCompress } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const [inp, out] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inp), root = doc.getRoot();

// 1. one look: no variants; the alternative paints go with them
for (const e of root.listExtensionsUsed()) if (e.extensionName === 'KHR_materials_variants') e.dispose();
for (const m of root.listMaterials()) if (/Pearl|Graphite/.test(m.getName())) m.dispose();

// 2. materials: names the game uses, no logos, no transmission
const RENAME = { 'Paint 1 Carmine': 'CarPaint', 'Paint 2 Carmine': 'Trim_Gloss', Headlight: 'Light_Head', Brakelight: 'Light_Tail', Signallight: 'Light_Signal', '': 'Trim_Black' };
for (const m of root.listMaterials()) {
  const name = m.getName();
  if (name in RENAME) m.setName(RENAME[name]);
  // the logo texture is used as an emissive map on hardware, rims, mirrors and brakes: it would glow "KHRONOS"
  const em = m.getEmissiveTexture();
  if (em && m.getName() !== 'Dashboard') { m.setEmissiveTexture(null); m.setEmissiveFactor([0, 0, 0]); }
  if (m.getName() === 'License') { m.setBaseColorTexture(null); m.setBaseColorFactor([0.9, 0.9, 0.9, 1]); }   // the game draws its own plate
  if (m.getName() === 'Glass') {
    for (const ext of m.listExtensions()) m.setExtension(ext.extensionName, null);
    m.setBaseColorFactor([0.03, 0.035, 0.04, 0.62]).setAlphaMode('BLEND').setMetallicFactor(0).setRoughnessFactor(0.04);
  }
  if (m.getName() === 'CarPaint') m.setBaseColorFactor([0.82, 0.56, 0.035, 1]).setMetallicFactor(0.65).setRoughnessFactor(0.3);    // the yellow it's parked in (setPaint changes it)
}

// 3. tyre walls: the lettering block on each side (KHRONOS, 3D Commerce) painted out, in colour and relief
async function paintOut(tex, boxes, fill) {
  const img = sharp(Buffer.from(tex.getImage())), { width, height } = await img.metadata();
  const rects = boxes.map(([x0, y0, x1, y1]) => ({ input: { create: { width: Math.round((x1 - x0) * width), height: Math.round((y1 - y0) * height), channels: 3, background: fill } }, left: Math.round(x0 * width), top: Math.round(y0 * height) }));
  tex.setImage(new Uint8Array(await img.composite(rects).png().toBuffer())).setMimeType('image/png');
}
const LOGOS = [[0, 0.335, 0.085, 0.63], [0.93, 0.41, 0.99, 0.6]];
for (const m of root.listMaterials()) if (m.getName() === 'Tireside') {
  await paintOut(m.getBaseColorTexture(), LOGOS, { r: 30, g: 30, b: 30 });
  await paintOut(m.getNormalTexture(), LOGOS, { r: 128, g: 128, b: 255 });
}

// 4. nodes: wheels named for world/huracan.js; the loose engine block out (never seen)
const WHEELS = { WheelFrontL: 'Wheel_02_LF_19', WheelRearL: 'Wheel_02_LR_20', WheelFrontR: 'Wheel_02_RF_21', WheelRearR: 'Wheel_02_RR_22' };
for (const n of root.listNodes()) {
  if (WHEELS[n.getName()]) n.setName(WHEELS[n.getName()]);
  if (n.getName() === 'Engine') n.dispose();
}

// 5. fewer triangles where nobody looks closely: the wipers (24k), the rims' spokes (12k each), the brake pads
await MeshoptSimplifier.ready;
const THIN = [[/Wipers$/, 0.12, 0.002], [/Rim$/, 0.4, 0.0008], [/BrakePad$/, 0.3, 0.001], [/SeatsFrame1$/, 0.4, 0.002]];
await doc.transform(weld());
for (const n of root.listNodes()) {
  const rule = THIN.find(([re]) => re.test(n.getName())), mesh = n.getMesh();
  if (!rule || !mesh) continue;
  for (const p of mesh.listPrimitives()) simplifyPrimitive(p, { simplifier: MeshoptSimplifier, ratio: rule[1], error: rule[2], lockBorder: true });
}
await doc.transform(dedup(), prune(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024] }));   // (not quantized: world/huracan.js merges the body's meshes, which needs float positions)

let tris = 0; for (const m of root.listMeshes()) for (const p of m.listPrimitives()) tris += (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3;
const b = getBounds(root.listScenes()[0]);
await io.write(out, doc);
console.log(`strale: ${Math.round(tris)} triangles, ${root.listMaterials().length} materials, size ${b.max.map((v, i) => (v - b.min[i]).toFixed(2)).join(' x ')} m`);
