// Texture memory (docs/living-city-architecture.md D5): a texture's size on the GPU is its width x
// height x 4 bytes, plus a third for mipmaps, whatever the file weighed. Safari reloads a tab that
// holds too much, so large textures that are never seen up close are drawn down once, at load,
// before they are first uploaded.
//   capTextures(root, max)        every texture of root's materials, at most max px on a side
//   dropMaps(root, keys)          leave out some maps entirely (e.g. normal maps on the crowd)
const KEYS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap', 'bumpMap', 'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap', 'specularIntensityMap', 'specularColorMap', 'sheenColorMap', 'transmissionMap', 'lightMap'];

function materialsOf(root) {
  const out = new Set();
  root.traverse((o) => { if (o.material) for (const m of Array.isArray(o.material) ? o.material : [o.material]) out.add(m); });
  return out;
}

const done = new WeakSet();
export function shrink(tex, max) {
  const im = tex && tex.image;
  if (!im || done.has(tex) || typeof document === 'undefined') return 0;
  const w = im.width || 0, h = im.height || 0;
  if (Math.max(w, h) <= max) return 0;
  const k = max / Math.max(w, h), nw = Math.max(1, Math.round(w * k)), nh = Math.max(1, Math.round(h * k));
  const c = document.createElement('canvas'); c.width = nw; c.height = nh;
  const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
  try { x.drawImage(im, 0, 0, nw, nh); } catch { return 0; }
  if (im.close) try { im.close(); } catch { /* */ }       // (an ImageBitmap: let it go now)
  tex.image = c; tex.needsUpdate = true; done.add(tex);
  return (w * h - nw * nh) * 4;
}

export function capTextures(root, max, keys = KEYS) {
  let saved = 0;
  for (const m of materialsOf(root)) for (const k of keys) if (m[k] && m[k].isTexture) saved += shrink(m[k], max);
  return saved;
}

export function dropMaps(root, keys) {
  let n = 0;
  for (const m of materialsOf(root)) for (const k of keys) if (m[k]) { m[k].dispose(); m[k] = null; m.needsUpdate = true; n++; }
  return n;
}
