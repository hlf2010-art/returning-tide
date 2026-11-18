import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { textureCompress } from '@gltf-transform/functions';
import sharp from 'sharp';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const [,, inp, out, q = '82'] = process.argv;
const doc = await io.read(inp);
await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', quality: +q, slots: /^(?!normalTexture).*$/ }), textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 90, slots: /^normalTexture$/ }));
await io.write(out, doc);
