// Put a new colour texture into a GLB without touching anything else (the rig, the weights, the cloth's bones):
//   node put_texture.mjs IN.glb OUT.glb new-albedo.png   (gltf-transform, sharp)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import sharp from 'sharp';
const [IN, OUT, PNG] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(IN);
const mat = doc.getRoot().listMaterials()[0], tex = mat.getBaseColorTexture();
const mime = tex.getMimeType();
const buf = mime === 'image/webp' ? await sharp(PNG).webp({ quality: 88 }).toBuffer() : mime === 'image/png' ? await sharp(PNG).png().toBuffer() : await sharp(PNG).jpeg({ quality: 90 }).toBuffer();
tex.setImage(new Uint8Array(buf));
await io.write(OUT, doc);
console.log('replaced', mime, buf.length, 'bytes');
