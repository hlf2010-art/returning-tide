import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, textureCompress, dedup, prune } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
const [,, inp, out, ratio] = process.argv;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inp);
await MeshoptSimplifier.ready;
const p0 = doc.getRoot().listMeshes()[0].listPrimitives()[0];
console.log('before', p0.getAttribute('POSITION').getCount(), p0.getIndices().getCount() / 3);
await doc.transform(dedup(), weld({}), simplify({ simplifier: MeshoptSimplifier, ratio: +ratio, error: 0.002, lockBorder: false }),
  textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [2048, 2048], quality: 88 }), prune());
const p = doc.getRoot().listMeshes()[0].listPrimitives()[0];
console.log('after', p.getAttribute('POSITION').getCount(), p.getIndices().getCount() / 3);
await io.write(out, doc);
