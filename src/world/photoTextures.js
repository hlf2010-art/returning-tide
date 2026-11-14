// Photographed surfaces (Poly Haven, CC0: https://polyhaven.com/license), scaled to their real size
// and swapped in once they've loaded, so the game never waits on them. Until then (or if the files
// are missing) the procedural canvas textures stay. Each material's UVs are in "tiles" of its old
// texture's size (textures.js), so the photo's repeat is old tile size / photo's real size.
//   granite_tile     Hankou Road pavements: grey granite slabs   (photo covers ~2 m)
//   granite_tile_03  the promenade: large speckled slabs         (~3 m)
//   clean_asphalt    Zhongshan Road / Hankou Road carriageways    (~3 m)
//   granite_tile_04  fine stone grain laid over the Bund facades (world-space detail, ~1.5 m)
import * as THREE from 'three';

const BASE = './textures/';
const loader = new THREE.TextureLoader();

function load(name, { srgb, repeat, aniso }) {
  return new Promise((res) => {
    loader.load(`${BASE}${name}`, (t) => {
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = aniso;
      res(t);
    }, undefined, () => res(null));
  });
}

// set: { id, oldTile (m), photoTile (m) }
async function photoSet(id, oldTile, photoTile, aniso) {
  const rep = oldTile / photoTile;
  const [map, normalMap] = await Promise.all([
    load(`${id}_diff_1k.jpg`, { srgb: true, repeat: rep, aniso }),
    load(`${id}_nor_gl_1k.jpg`, { srgb: false, repeat: rep, aniso }),
  ]);
  return map && normalMap ? { map, normalMap } : null;
}

// M: the shared materials (world/materials.js). tone: a multiplier so the photographs sit at the
// brightness the night scene was tuned for (photos are shot in daylight, evenly lit).
export async function usePhotoSurfaces(M, renderer) {
  const aniso = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  const [walk, deck, road, grain] = await Promise.all([
    photoSet('granite_tile', 2.4, 2.0, aniso),
    photoSet('granite_tile_03', 4.8, 3.0, aniso),
    photoSet('clean_asphalt', 6, 3.0, aniso),
    load('granite_tile_04_diff_1k.jpg', { srgb: true, repeat: 1, aniso: Math.min(8, aniso) }),
  ]);
  const swap = (m, s, tone, ns = 1) => {
    if (!m || !s) return;
    m.map = s.map; m.normalMap = s.normalMap; m.normalScale.set(ns, ns); m.color.setScalar(tone); m.needsUpdate = true;
  };
  swap(M.sidewalk, walk, 0.62, 0.9);
  swap(M.deck, deck, 0.66, 0.8);
  swap(M.asphalt, road, 0.5, 0.8);
  // the facades: the photo's luminance as fine grain on every masonry material
  if (grain) for (const k of ['stone', 'stoneDark', 'flute', 'classic', 'arched', 'rustic', 'deco']) {
    const m = M[k]; if (!m || !m.uniforms || !m.uniforms.grainMap) continue;
    m.uniforms.grainMap.value = grain; m.uniforms.grainAmount.value = k === 'rustic' ? 0.5 : 0.38;
  }
  return { walk: !!walk, deck: !!deck, road: !!road, grain: !!grain };
}
