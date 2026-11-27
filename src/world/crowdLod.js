// The middle tier's lighter people (docs/living-city-architecture.md §6.3, Phase 2b): each crowd avatar
// as ONE mesh of at most ~2,500 triangles with its textures packed into one 1024x512 image, so a
// whole crowd of one avatar is one draw call and about a third of the triangles. Made at load, in a
// few milliseconds an avatar, with the meshoptimizer simplifier three.js already ships (no new files
// to download, and any avatar added later gets one for free).
//   buildLod(avatarRoot, { tris }) -> { geometry, map } | null
//     geometry: position, normal, uv (into the atlas), skinIndex, skinWeight, tint (1 on the clothes:
//     where the coat colour goes), zone (world/crowdLooks.js, when the avatar has been marked); map: the atlas (a CanvasTexture, alpha cut-out for hair)
// The bones are the avatar's own (the first skinned mesh's skeleton), as the bake expects.
import * as THREE from 'three';
import { MeshoptSimplifier } from 'three/addons/libs/meshopt_simplifier.module.js';

export const lodReady = MeshoptSimplifier.ready;

// where each material's texture goes in the atlas (x, y, w, h in pixels of a 1024x512 image): the
// clothes get the most room, the face and the hair a quarter each, anything else (glasses) the rest
const W = 1024, H = 512, PAD = 3;
const SLOTS = { body: [0, 0, 512, 512], head: [512, 0, 256, 256], opacity: [768, 0, 256, 256], other: [512, 256, 256, 256], other2: [768, 256, 256, 256] };
const slotOf = (name, used) => {
  const k = /_body$/i.test(name) ? 'body' : /_head$/i.test(name) ? 'head' : /_opacity$|hair/i.test(name) ? 'opacity' : !used.has('other') ? 'other' : 'other2';
  return k;
};

export function buildLod(root, { tris = 2500 } = {}) {
  const meshes = []; root.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
  if (!meshes.length || typeof document === 'undefined') return null;
  // the atlas
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const cx = canvas.getContext('2d'); cx.fillStyle = '#808080'; cx.fillRect(0, 0, W, H);
  const used = new Map();
  for (const m of meshes) {
    const name = m.material.name || '', k = slotOf(name, used);
    if (used.has(k)) { if (used.get(k) !== m.material) continue; } else used.set(k, m.material);
    const img = m.material.map && m.material.map.image, [x, y, w, h] = SLOTS[k];
    if (k === 'opacity' || k.startsWith('other')) cx.clearRect(x, y, w, h);
    if (img) { try { cx.drawImage(img, x, y, w, h); } catch (e) { cx.fillStyle = '#' + m.material.color.getHexString(); cx.fillRect(x, y, w, h); } }
    else { cx.fillStyle = '#' + m.material.color.getHexString(); cx.fillRect(x, y, w, h); }
  }
  // one geometry from all the pieces, uvs moved into their slot
  let nv = 0, ni = 0;
  for (const m of meshes) { nv += m.geometry.attributes.position.count; ni += m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), si = new Uint16Array(nv * 4), sw = new Float32Array(nv * 4), tint = new Float32Array(nv), zone = new Float32Array(nv), idx = new Uint32Array(ni);
  let ov = 0, oi = 0;
  const seen = new Map();
  for (const m of meshes) {
    const g = m.geometry, a = g.attributes, n = a.position.count, name = m.material.name || '';
    let k = [...used.entries()].find(([, mat]) => mat === m.material)?.[0];
    if (!k) k = slotOf(name, seen);
    const [sx, sy, sw0, sh0] = SLOTS[k], u0 = (sx + PAD) / W, v0 = (sy + PAD) / H, us = (sw0 - 2 * PAD) / W, vs = (sh0 - 2 * PAD) / H;
    const body = k === 'body' ? 1 : 0;
    for (let i = 0; i < n; i++) {
      const o = ov + i;
      pos[o * 3] = a.position.getX(i); pos[o * 3 + 1] = a.position.getY(i); pos[o * 3 + 2] = a.position.getZ(i);
      if (a.normal) { nor[o * 3] = a.normal.getX(i); nor[o * 3 + 1] = a.normal.getY(i); nor[o * 3 + 2] = a.normal.getZ(i); }
      let u = a.uv ? a.uv.getX(i) : 0.5, v = a.uv ? a.uv.getY(i) : 0.5;
      u = u - Math.floor(u); v = v - Math.floor(v);              // (tiled uvs folded back: a seam at worst, at 8-30 m)
      // (glTF uvs run top-down, as the canvas does: the maps are flipY = false, and so is the atlas)
      uv[o * 2] = u0 + u * us; uv[o * 2 + 1] = v0 + v * vs;
      for (let c = 0; c < 4; c++) { si[o * 4 + c] = a.skinIndex.getComponent(i, c); sw[o * 4 + c] = a.skinWeight.getComponent(i, c); }
      tint[o] = body; zone[o] = a.zone ? a.zone.getX(i) : 0;
    }
    if (g.index) for (let j = 0; j < g.index.count; j++) idx[oi++] = g.index.getX(j) + ov;
    else for (let j = 0; j < n; j++) idx[oi++] = j + ov;
    ov += n;
  }
  // the avatars come as triangle soup (every triangle its own three vertices): weld the ones that are
  // the same vertex (same place, uv, normal, piece) so the simplifier can see the surface
  const key = new Map();
  for (let j = 0; j < ni; j++) {
    const v = idx[j];
    const k = `${pos[v * 3]},${pos[v * 3 + 1]},${pos[v * 3 + 2]},${uv[v * 2]},${uv[v * 2 + 1]},${Math.round(nor[v * 3] * 500)},${Math.round(nor[v * 3 + 1] * 500)},${Math.round(nor[v * 3 + 2] * 500)},${tint[v]},${zone[v]}`;
    let w = key.get(k); if (w === undefined) { w = v; key.set(k, v); }
    idx[j] = w;
  }
  // simplify, the normals and uvs weighing in so the face and the seams keep their shape. 'Permissive'
  // lets it collapse across the pieces' seams (without it the clothes' layers stop it near 8,000)
  const attrs = new Float32Array(nv * 6);
  for (let i = 0; i < nv; i++) { attrs[i * 6] = nor[i * 3]; attrs[i * 6 + 1] = nor[i * 3 + 1]; attrs[i * 6 + 2] = nor[i * 3 + 2]; attrs[i * 6 + 3] = uv[i * 2]; attrs[i * 6 + 4] = uv[i * 2 + 1]; attrs[i * 6 + 5] = tint[i]; }
  const target = Math.min(ni, Math.floor(tris) * 3), W8 = [0.2, 0.2, 0.2, 2, 2, 4];
  let out = MeshoptSimplifier.simplifyWithAttributes(idx, pos, 3, attrs, 6, W8, null, target, 0.02, [])[0];
  if (out.length > target * 1.15) out = MeshoptSimplifier.simplifyWithAttributes(idx, pos, 3, attrs, 6, W8, null, target, 0.02, ['Permissive'])[0];
  const [remap, unique] = MeshoptSimplifier.compactMesh(out);
  const take = (src, size, Ctor) => { const d = new Ctor(unique * size); for (let i = 0; i < remap.length; i++) { const t = remap[i]; if (t === 0xffffffff) continue; for (let c = 0; c < size; c++) d[t * size + c] = src[i * size + c]; } return d; };
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(take(pos, 3, Float32Array), 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(take(nor, 3, Float32Array), 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(take(uv, 2, Float32Array), 2));
  geometry.setAttribute('skinIndex', new THREE.BufferAttribute(take(si, 4, Uint16Array), 4));
  geometry.setAttribute('skinWeight', new THREE.BufferAttribute(take(sw, 4, Float32Array), 4));
  geometry.setAttribute('tint', new THREE.BufferAttribute(take(tint, 1, Float32Array), 1));
  if (meshes.some((m) => m.geometry.attributes.zone)) geometry.setAttribute('zone', new THREE.BufferAttribute(take(zone, 1, Float32Array), 1));   // (world/crowdLooks.js: what is a top, a bottom, hair)
  geometry.setIndex(new THREE.BufferAttribute(unique < 65536 ? new Uint16Array(out) : out, 1));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.9, 0), 1.2);
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 2;
  map.flipY = false;
  return { geometry, map, tris: out.length / 3, from: ni / 3 };
}
