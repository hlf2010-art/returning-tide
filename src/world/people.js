// Realistic people: Microsoft Rocketbox avatars and motion-captured animation (MIT licence,
// https://github.com/microsoft/Microsoft-Rocketbox), converted by tools/rocketbox/convert.mjs into
// public/people/*.glb. This module loads them and gives each person an animation rig:
//   - one base action at a time (idle, look, walk, jog, phone, talk..., umbrella...), crossfaded;
//   - walk / jog playback rate follows the simulated speed, so feet don't slide;
//   - an arm layer: while an umbrella is up, the umbrella clip drives that arm and the rest of the
//     body keeps walking (or standing);
//   - world-space anchors at the chest and both hands for props (pouch, umbrella, phone).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { createSprings } from './springs.js';
import { dropMaps, shrink } from './texCap.js';

const ARM = (side) => new RegExp(`^Bip01_${side}_(Clavicle|UpperArm|Forearm|Hand|Finger)`);
const boneOf = (track) => track.name.slice(0, track.name.lastIndexOf('.'));

// The converter kept every material group of an avatar as its own glTF primitive, and the loader
// makes each one a separate SkinnedMesh with its own copy of the skeleton: 7-20 draw calls a person
// where 2-4 would do. Merge the pieces that share a material (and a parent and bones) into one mesh;
// the picture is the same (docs/living-city-architecture.md §6.1, item 0.1). Returns how many went.
export function mergeByMaterial(root) {
  const groups = new Map();
  root.traverse((o) => {
    if (!o.isSkinnedMesh || !o.geometry.index || o.geometry.morphAttributes.position) return;
    const key = `${o.parent.uuid}|${o.material.uuid}|${o.skeleton.bones.map((b) => b.uuid).join(',')}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(o);
  });
  let removed = 0;
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const first = list[0], names = Object.keys(first.geometry.attributes);
    const sameAttrs = list.every((m) => names.every((n) => m.geometry.attributes[n] === first.geometry.attributes[n]) && Object.keys(m.geometry.attributes).length === names.length);
    const sameBind = list.every((m) => m.bindMatrix.equals(first.bindMatrix) && m.matrix.equals(first.matrix));
    if (!sameAttrs || !sameBind) continue;                   // (pieces with their own vertices stay as they are)
    const idx = [];
    for (const m of list) { const ix = m.geometry.index.array, { start, count } = m.geometry.drawRange, end = Math.min(ix.length, start + (Number.isFinite(count) ? count : ix.length)); for (let i = start; i < end; i++) idx.push(ix[i]); }
    const g = new THREE.BufferGeometry();
    for (const n of names) g.setAttribute(n, first.geometry.attributes[n]);
    g.setIndex(idx);
    g.computeBoundingBox(); g.computeBoundingSphere();
    first.geometry = g; first.name = first.material.name || first.name;
    for (const m of list.slice(1)) { m.parent.remove(m); removed++; }
  }
  return removed;
}

// Rocketbox hair is alpha-tested cards. With the glTF's MeshStandardMaterial every card seen edge-on
// lights up with a grey Fresnel sheen (a dark texture, F0 0.04 at grazing angles), which reads as
// grey plastic slabs over the hair at talking distance. Give the cards almost no specular, soft
// edges where the frame has MSAA (alpha to coverage), and, for the one avatar whose cards were
// authored untinted (grey-blonde over a golden head texture), the tint people.json gives it.
export function fixHair(root, tint = null) {
  const done = new Map();
  root.traverse((o) => {
    if (!o.isMesh || !/opacity/i.test(o.material.name)) return;
    const m = o.material;
    if (!done.has(m)) {
      const h = new THREE.MeshPhysicalMaterial({
        name: m.name, map: m.map, alphaMap: m.alphaMap, alphaTest: Math.max(0.5, m.alphaTest), side: THREE.DoubleSide,
        roughness: 0.85, metalness: 0, specularIntensity: 0.12, envMapIntensity: 0.35, alphaToCoverage: true,
        vertexColors: m.vertexColors,
      });
      if (tint) h.color.setRGB(tint[0], tint[1], tint[2]);
      // cards lying on the scalp are often wound inward: seen from outside, three.js lights their back face as if
      // it faced into the head, and they show as near-black slabs with hard edges. Every card is lit as facing out.
      h.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('gl_FrontFacing ? 1.0 : - 1.0', '1.0')); };
      h.customProgramCacheKey = () => 'hair-out';
      done.set(m, h);
    }
    if (!o.geometry.userData.hairNormals) outwardNormals(o.geometry);
    o.material = done.get(m);
  });
  // the painted hair on the scalp (the shell under the cards) is part of the head material, which is as glossy
  // as skin (roughness 0.55): grey and shiny between dark matte cards, it reads as streaks. Matte where the
  // head texture is dark (hair), as before where it's light (skin).
  root.traverse((o) => {
    if (!o.isMesh || /^hero-/.test(o.name) || !/_head$/i.test(o.material.name) || !o.material.map?.image) return;
    const m = o.material;
    if (!done.has(m)) done.set(m, matteHairShell(m));
    o.material = done.get(m);
  });
  return done.size;
}

// normals pointing away from the middle of the head (about 11 cm under the top of the hair, on its centre line):
// the usual trick for hair cards, which then shade like the volume of hair rather than like flat strips
function outwardNormals(geo) {
  geo.computeBoundingBox();
  const b = geo.boundingBox, cm = b.max.y - b.min.y > 5, c = new THREE.Vector3((b.min.x + b.max.x) / 2, b.max.y - (cm ? 11 : 0.11), (b.min.z + b.max.z) / 2);
  const p = geo.attributes.position, n = new Float32Array(p.count * 3), v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).sub(c).normalize(); n[i * 3] = v.x; n[i * 3 + 1] = v.y; n[i * 3 + 2] = v.z; }
  geo.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  geo.userData.hairNormals = true;
}

function matteHairShell(m) {
  const img = m.map.image;
  if (typeof document === 'undefined' || !img.width) return m;
  const w = Math.min(512, img.width), h = Math.min(512, img.height);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  if (m.map.flipY) { cx.translate(0, h); cx.scale(1, -1); }
  cx.drawImage(img, 0, 0, w, h);
  const d = cx.getImageData(0, 0, w, h).data, out = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const l = (0.3 * d[i * 4] + 0.55 * d[i * 4 + 1] + 0.15 * d[i * 4 + 2]) / 255;
    const hair = 1 - THREE.MathUtils.smoothstep(l, 0.36, 0.55);
    out[i * 4 + 1] = Math.round(255 * (0.55 + 0.37 * hair));   // roughness (G)
    out[i * 4 + 3] = Math.round(255 * (1 - 0.85 * hair));      // specular intensity (A)
    out[i * 4] = out[i * 4 + 2] = 255;
  }
  const t = new THREE.DataTexture(out, w, h, THREE.RGBAFormat);
  t.flipY = m.map.flipY; t.wrapS = m.map.wrapS; t.wrapT = m.map.wrapT; t.channel = m.map.channel;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
  const p = new THREE.MeshPhysicalMaterial({
    name: m.name, map: m.map, normalMap: m.normalMap, normalScale: m.normalScale, roughness: 1, roughnessMap: t,
    specularIntensity: 1, specularIntensityMap: t, metalness: 0, vertexColors: m.vertexColors, side: m.side,
  });
  return p;
}

// The Hunyuan-generated bodies (Ji Bai, Gu Nian) have smeared, washed-out faces: the texture detail is spread over
// thousands of UV islands (docs/research-hero-characters.md; one bad eye can be mended: tools/characters/repair_eyes.py). A close-up head built with
// tools/characters/build_hero.py takes the old head's place: the old head's triangles (skinned mostly to the head
// and neck bones) are dropped, and every part of the new head (skin with its face shapes, eyes, brows, lashes, hair
// cards) becomes a SkinnedMesh on the same skeleton, placed so its nose tip is where the old one was. Below the jaw
// the skin blends from the head bone to the neck bone so the throat bends with the neck. Returns the new meshes.
// read a material's colour map on the CPU: (u, v) -> [r, g, b] in 0..1 (sRGB, as painted)
function texelReader(material) {
  const map = (Array.isArray(material) ? material[0] : material)?.map, img = map?.image;
  if (!img || typeof document === 'undefined') return null;
  const w = Math.min(512, img.width), h = Math.min(512, img.height);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  if (map.flipY) { cx.translate(0, h); cx.scale(1, -1); }
  cx.drawImage(img, 0, 0, w, h);
  const d = cx.getImageData(0, 0, w, h).data;
  return (u, v) => {
    const x = Math.min(w - 1, Math.max(0, Math.floor((u - Math.floor(u)) * w))), y = Math.min(h - 1, Math.max(0, Math.floor((v - Math.floor(v)) * h)));
    const i = (y * w + x) * 4; return [d[i] / 255, d[i + 1] / 255, d[i + 2] / 255];
  };
}

// Recolour the skin texels of a body's colour map (warm and light: not hair, not cloth) from one mean colour to
// another, in linear light, feathered by how skin-like each texel is. A new texture: the source map is shared.
function retintBodySkin(body, from, to) {
  const m = Array.isArray(body.material) ? body.material[0] : body.material, img = m.map?.image;
  if (!img || typeof document === 'undefined') return;
  const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.drawImage(img, 0, 0);
  const id = cx.getImageData(0, 0, cv.width, cv.height), d = id.data;
  const lin = (c) => Math.pow(c, 2.2), k = [0, 1, 2].map((i) => lin(to[i]) / Math.max(0.01, lin(from[i])));
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, l = 0.3 * r + 0.55 * g + 0.15 * b;
    const w = THREE.MathUtils.smoothstep(r - b, 0.04, 0.1) * THREE.MathUtils.smoothstep(l, 0.38, 0.5) * (r >= g ? 1 : 0);
    if (w <= 0) continue;
    for (let c = 0; c < 3; c++) {
      const v = d[i + c] / 255, t = Math.pow(Math.min(1, lin(v) * k[c]), 1 / 2.2);
      d[i + c] = Math.round(255 * (v + (t - v) * w));
    }
  }
  cx.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.flipY = m.map.flipY; t.colorSpace = m.map.colorSpace; t.wrapS = m.map.wrapS; t.wrapT = m.map.wrapT; t.channel = m.map.channel;
  t.anisotropy = m.map.anisotropy;
  const nm = m.clone(); nm.map = t; body.material = nm;
}

// The new head's neck takes the shape of the old neck it replaces, so it fills the collar exactly: below the old
// chin each vertex is stretched down to where the old neck skin ended, then each half-centimetre slice is moved
// and scaled to the old slice's width and depth (blended in over the first 2 cm under the chin).
function conformNeck(pos, bodyWorld, profile, chin) {
  const toW = bodyWorld, toL = bodyWorld.clone().invert(), w = new THREE.Vector3();
  const keys = [...profile.keys()].sort((a, b) => a - b), lowY = keys[0] / 2;
  const W = []; let newLow = Infinity;
  for (let v = 0; v < pos.count; v++) { w.fromBufferAttribute(pos, v).applyMatrix4(toW); W.push(w.clone()); if (w.y < newLow) newLow = w.y; }
  if (!(newLow < chin - 1)) return;
  const stretch = (chin - lowY + 0.3) / (chin - newLow);
  for (const p of W) if (p.y < chin) p.y = chin - (chin - p.y) * stretch;
  // the new neck's own slices, after the stretch
  const mine = new Map();
  for (const p of W) {
    if (p.y > chin + 0.5) continue;
    const k = Math.floor(p.y * 2), e = mine.get(k) || { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity };
    e.x0 = Math.min(e.x0, p.x); e.x1 = Math.max(e.x1, p.x); e.z0 = Math.min(e.z0, p.z); e.z1 = Math.max(e.z1, p.z); mine.set(k, e);
  }
  const near = (m, k) => { if (m.has(k)) return m.get(k); let best = null, d = Infinity; for (const [kk, e] of m) if (Math.abs(kk - k) < d) { d = Math.abs(kk - k); best = e; } return best; };
  for (let v = 0; v < W.length; v++) {
    const p = W[v];
    if (p.y < chin) {
      const k = Math.floor(p.y * 2), o = near(profile, k), n = near(mine, k);
      const t = THREE.MathUtils.smoothstep(chin - p.y, 0, 2);
      if (o && n && n.x1 - n.x0 > 0.5 && n.z1 - n.z0 > 0.5) {
        const x = (o.x0 + o.x1) / 2 + (p.x - (n.x0 + n.x1) / 2) * (o.x1 - o.x0) / (n.x1 - n.x0);
        const z = (o.z0 + o.z1) / 2 + (p.z - (n.z0 + n.z1) / 2) * (o.z1 - o.z0) / (n.z1 - n.z0);
        p.x += (x - p.x) * t; p.z += (z - p.z) * t;
      }
    }
    p.applyMatrix4(toL); pos.setXYZ(v, p.x, p.y, p.z);
  }
  pos.needsUpdate = true;
}

export function swapHead(avatar, headScene, { drop = ['Bip01_Head'], tint = null, keepHair = false, tone = null } = {}) {
  avatar.updateMatrixWorld(true);
  let body = null;
  avatar.traverse((o) => { if (o.isSkinnedMesh && (!body || o.geometry.attributes.position.count > body.geometry.attributes.position.count)) body = o; });
  if (!body) return [];
  const bones = body.skeleton.bones, bi = (n) => bones.findIndex((b) => b.name === n);
  const iHead = bi('Bip01_Head'), iNeck = bi('Bip01_Neck');
  if (iHead < 0 || iNeck < 0) return [];
  const dropIdx = new Set(drop.map(bi).filter((i) => i >= 0));
  // the old head: bind-pose positions (in the body mesh's space) of the vertices that belong to it
  const g = body.geometry, pos = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
  const share = (v) => { let s = 0; for (let k = 0; k < 4; k++) if (dropIdx.has(si.getComponent(v, k))) s += sw.getComponent(v, k); return s; };
  const neckShare = (v) => { let s = 0; for (let k = 0; k < 4; k++) { const b = si.getComponent(v, k); if (b === iHead || b === iNeck) s += sw.getComponent(v, k); } return s; };
  const headOnly = (v) => { let s = 0; for (let k = 0; k < 4; k++) if (si.getComponent(v, k) === iHead) s += sw.getComponent(v, k); return s; };
  // (in the avatar's own space: centimetres, y up, the face looking down +z)
  // the nose tip: the front-most point on the centre line in the lower half of the head (the upper half holds
  // the fringe, which can stick out further than the nose)
  // When the body's colour map can be read, skin-coloured points only (hair is dark).
  const texel = keepHair ? texelReader(body.material) : null, uv = g.attributes.uv;
  const light = (v) => { if (!texel || !uv) return true; const [r, gg, bb] = texel(uv.getX(v), uv.getY(v)); return 0.3 * r + 0.55 * gg + 0.15 * bb > 0.5; };
  const old = new THREE.Vector3(), nose = new THREE.Vector3(-Infinity, 0, -Infinity);
  const mid = [];
  let yLo = Infinity, yHi = -Infinity, oldBack = Infinity;
  for (let v = 0; v < pos.count; v++) {
    if (headOnly(v) < 0.6) continue;
    old.fromBufferAttribute(pos, v).applyMatrix4(body.matrixWorld);
    if (Math.abs(old.x) >= 2) continue;
    yLo = Math.min(yLo, old.y); yHi = Math.max(yHi, old.y); oldBack = Math.min(oldBack, old.z);
    if (light(v)) mid.push(old.x, old.y, old.z);
  }
  const lit = [];   // every skin-coloured point of the old head, for its width
  for (let v = 0; v < pos.count; v++) if (headOnly(v) >= 0.6 && light(v)) { old.fromBufferAttribute(pos, v).applyMatrix4(body.matrixWorld); lit.push(old.x, old.y); }
  const yMid = texel ? Infinity : (yLo + yHi) / 2;
  for (let k = 0; k < mid.length; k += 3) if (mid[k + 1] < yMid && mid[k + 2] > nose.z) nose.set(mid[k], mid[k + 1], mid[k + 2]);
  let oldChin = nose.y;   // the lowest point of the face in front (5 cm behind the nose tip at most)
  for (let k = 0; k < mid.length; k += 3) if (mid[k + 2] > nose.z - 5 && mid[k + 1] < oldChin) oldChin = mid[k + 1];
  if (!Number.isFinite(nose.z)) return [];
  let oldHalf = 0;   // the old face's half width at mouth level (under the ears)
  for (let k = 0; k < lit.length; k += 2) if (Math.abs(lit[k + 1] - (nose.y - 3)) < 0.8) oldHalf = Math.max(oldHalf, Math.abs(lit[k] - nose.x));
  // the new head, in the body mesh's space (the head GLB is in metres, the avatars in centimetres)
  headScene.updateMatrixWorld(true);
  let newNose = new THREE.Vector3(-Infinity, 0, -Infinity), chinY = Infinity, baseY = Infinity, newHalf = 0, newBack = Infinity;
  const skinPts = [];
  headScene.traverse((o) => {
    if (!o.isMesh || o.morphTargetDictionary === undefined) return;
    const p = o.geometry.attributes.position, w = new THREE.Vector3();
    for (let v = 0; v < p.count; v++) {
      w.fromBufferAttribute(p, v).applyMatrix4(o.matrixWorld);
      if (Math.abs(w.x) < 0.02 && w.z > newNose.z) newNose.copy(w);
      if (w.y < baseY) baseY = w.y;
      if (w.z < newBack) newBack = w.z;
      skinPts.push(w.x, w.y, w.z);
    }
  });
  if (!Number.isFinite(newNose.z)) return [];
  let newChin = newNose.y;
  for (let k = 0; k < skinPts.length; k += 3) if (Math.abs(skinPts[k]) < 0.02 && skinPts[k + 2] > newNose.z - 0.05 && skinPts[k + 1] < newChin) newChin = skinPts[k + 1];
  for (let k = 0; k < skinPts.length; k += 3) if (Math.abs(skinPts[k + 1] - (newNose.y - 0.03)) < 0.008) newHalf = Math.max(newHalf, Math.abs(skinPts[k] - newNose.x));
  // a face as wide as the old one, so the kept hair and the collar still fit it
  // and as long from nose to chin (the Hunyuan faces are smaller than MPFB's under a larger skull)
  const s = nose.y - oldChin > 3 && newNose.y - newChin > 0.03 ? THREE.MathUtils.clamp((nose.y - oldChin) / ((newNose.y - newChin) * 100), 0.8, 1.15) : 1;
  const sx = oldHalf > 0 && newHalf > 0 ? THREE.MathUtils.clamp(oldHalf / (newHalf * 100 * s), 0.85, 1.12) : 1;
  // keepHair: and as deep as the old head inside its hair (about 1.5 cm of it on the centre line at the back),
  // so the hair shell has no empty space behind the ears
  const sz = keepHair && Number.isFinite(oldBack) ? THREE.MathUtils.clamp((nose.z - oldBack - 1.5) / ((newNose.z - newBack) * 100 * s), 0.9, 1.25) : 1;
  chinY = newNose.y - 0.075;
  // keepHair: the old hair stays (a sculpted shell reads better than cards), found by its dark texels; only the
  // skin goes, and everything in front of the face, whatever its colour (the old brows, lashes and painted eyes)
  const P = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const inFace = (c) => Math.abs(c.x - nose.x) < 6.5 && c.y < nose.y + 6.5 && c.z > nose.z - 8;
  const isHair = (a, b, c) => {
    if (!texel) return false;
    const cen = P[0].fromBufferAttribute(pos, a).add(P[1].fromBufferAttribute(pos, b)).add(P[2].fromBufferAttribute(pos, c)).divideScalar(3).applyMatrix4(body.matrixWorld);
    if (inFace(cen)) return false;
    const u = (uv.getX(a) + uv.getX(b) + uv.getX(c)) / 3, v = (uv.getY(a) + uv.getY(b) + uv.getY(c)) / 3;
    const [r, gg, bb] = texel(u, v);
    if (r - bb < 0.05) return true;   // neutral, not skin: a white shirt collar, grey cloth (kept, or the collar gets holes)
    return 0.3 * r + 0.55 * gg + 0.15 * bb < 0.42 && !(r > gg * 1.25 && r > 0.3);   // dark, and not lip or shadowed skin red
  };
  const skinSum = [0, 0, 0, 0], neckProfile = new Map();
  const ix = g.index.array, keep = [];
  for (let t = 0; t < ix.length; t += 3) {
    const a = ix[t], b = ix[t + 1], c = ix[t + 2];
    const dropIt = (share(a) > 0.5 && share(b) > 0.5 && share(c) > 0.5)
      // keepHair: the skin of the nape too (neck-weighted, it hides behind the old head but not behind the new one)
      || (texel && neckShare(a) > 0.5 && neckShare(b) > 0.5 && neckShare(c) > 0.5
        && P[0].fromBufferAttribute(pos, a).add(P[1].fromBufferAttribute(pos, b)).add(P[2].fromBufferAttribute(pos, c)).divideScalar(3).applyMatrix4(body.matrixWorld).y > nose.y - 12);
    if (dropIt && !isHair(a, b, c)) {
      if (texel) for (const q of [a, b, c]) {   // the old neck's shape, which the new neck takes on
        const w = P[0].fromBufferAttribute(pos, q).applyMatrix4(body.matrixWorld);
        if (w.y > oldChin + 0.5) continue;
        const k = Math.floor(w.y * 2), e = neckProfile.get(k) || { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity };
        e.x0 = Math.min(e.x0, w.x); e.x1 = Math.max(e.x1, w.x); e.z0 = Math.min(e.z0, w.z); e.z1 = Math.max(e.z1, w.z); neckProfile.set(k, e);
      }
      if (texel) { const col = texel(uv.getX(a), uv.getY(a)); skinSum[0] += col[0]; skinSum[1] += col[1]; skinSum[2] += col[2]; skinSum[3]++; }
      continue;
    }
    keep.push(a, b, c);
  }
  const ng = g.clone(); ng.setIndex(keep); body.geometry = ng;
  const toWorld = new THREE.Matrix4().makeTranslation(nose.x, nose.y, nose.z)
    .multiply(new THREE.Matrix4().makeScale(100 * s * sx, 100 * s, 100 * s * sz))
    .multiply(new THREE.Matrix4().makeTranslation(-newNose.x, -newNose.y, -newNose.z));
  const toBody = new THREE.Matrix4().copy(body.matrixWorld).invert().multiply(toWorld);
  // match the new skin to the old body's skin (the face's average colour against the new map's)
  let autoTint = null;
  // (or to a tone measured from the character's portrait: sRGB 0-255, the lit cheek)
  if ((tone || (texel && skinSum[3] > 50)) && !tint) {
    const lin = (c) => Math.pow(c, 2.2);
    const want = tone ? tone.map((c) => c / 255) : [0, 1, 2].map((i) => skinSum[i] / skinSum[3]);
    headScene.traverse((o) => {
      if (autoTint || !o.isMesh || o.morphTargetDictionary === undefined || !o.material.map) return;
      const m = texelReader(o.material), mean = [0, 0, 0];
      // the map's colour where the skin actually is: at the vertices' UVs, the face only (not lips, scalp or neck)
      const uvs = o.geometry.attributes.uv, pp = o.geometry.attributes.position, w = new THREE.Vector3();
      let n = 0;
      for (let v = 0; v < uvs.count; v++) {
        w.fromBufferAttribute(pp, v).applyMatrix4(o.matrixWorld);
        if (w.z < newNose.z - 0.06 || w.y > newNose.y + 0.05 || w.y < newNose.y - 0.06) continue;
        const c = m(uvs.getX(v), uvs.getY(v)); mean[0] += c[0]; mean[1] += c[1]; mean[2] += c[2]; n++;
      }
      if (n) autoTint = mean.map((x, i) => THREE.MathUtils.clamp(lin(want[i]) / Math.max(0.01, lin(x / n)), 0.4, 2.5));
    });
  }
  // the rest of the body's skin (hands, wrists) takes the same tone as the new face
  if (tone && texel && skinSum[3] > 50) retintBodySkin(body, [0, 1, 2].map((i) => skinSum[i] / skinSum[3]), tone.map((c) => c / 255));
  let eyeY = null;
  headScene.traverse((o) => { if (o.isMesh && /^eye-[lr]$/.test(o.name)) eyeY = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()).y; });
  const made = [], hw = new THREE.Vector3();
  headScene.traverse((o) => {
    if (!o.isMesh || (keepHair && /^hair/i.test(o.material.name))) return;
    const geo = o.geometry.clone();
    if (/lash/i.test(o.name) && geo.index && eyeY !== null) {
      // only the upper lashes: at game distances the lower row is a grey smudge under the eye
      const p = geo.attributes.position, ix = geo.index.array, up = [], w = new THREE.Vector3();
      for (let t = 0; t < ix.length; t += 3) {
        let y = 0; for (let k = 0; k < 3; k++) y += w.fromBufferAttribute(p, ix[t + k]).applyMatrix4(o.matrixWorld).y;
        if (y / 3 > eyeY) up.push(ix[t], ix[t + 1], ix[t + 2]);
      }
      geo.setIndex(up);
    }
    geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(toBody, o.matrixWorld));
    if (keepHair && o.morphTargetDictionary !== undefined && neckProfile.size > 2) conformNeck(geo.attributes.position, body.matrixWorld, neckProfile, oldChin);
    const n = geo.attributes.position.count, sIdx = new Uint16Array(n * 4), sWt = new Float32Array(n * 4);
    const isSkin = o.morphTargetDictionary !== undefined;
    for (let v = 0; v < n; v++) {
      // skin below the jaw bends with the neck; everything else follows the head
      let h = 1;
      if (isSkin) {
        const y = hw.fromBufferAttribute(o.geometry.attributes.position, v).applyMatrix4(o.matrixWorld).y;
        h = THREE.MathUtils.clamp((y - baseY) / Math.max(0.01, chinY - baseY), 0, 1);
        h = h * h * (3 - 2 * h);
      }
      sIdx[v * 4] = iHead; sWt[v * 4] = h; sIdx[v * 4 + 1] = iNeck; sWt[v * 4 + 1] = 1 - h;
    }
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(sIdx, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sWt, 4));
    // morph targets were exported as offsets in metres: scale them with the mesh
    for (const key of Object.keys(geo.morphAttributes)) {
      geo.morphAttributes[key] = geo.morphAttributes[key].map((a) => {
        const b = a.clone(), m3 = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().multiplyMatrices(toBody, o.matrixWorld));
        for (let v = 0; v < b.count; v++) { const t = new THREE.Vector3().fromBufferAttribute(b, v).applyMatrix3(m3); b.setXYZ(v, t.x, t.y, t.z); }
        return b;
      });
    }
    let mat = o.material;
    if (/hair|brow|lash/i.test(o.name + mat.name)) {
      // thin dark ribbons: with the default specular, their grazing edges catch the sky and read as white fuzz
      mat = new THREE.MeshPhysicalMaterial({ name: mat.name, color: mat.color, map: mat.map, alphaTest: 0.35, alphaToCoverage: true,
        side: THREE.DoubleSide, roughness: 0.9, metalness: 0, specularIntensity: 0.06, envMapIntensity: 0.15 });
    } else if (/cornea/i.test(o.name + mat.name)) {
      mat = new THREE.MeshPhysicalMaterial({ name: 'cornea', transmission: 0, transparent: true, opacity: 0.12, roughness: 0.02, specularIntensity: 1, depthWrite: false });
    } else if (isSkin && (tint || autoTint)) { mat = mat.clone(); mat.color.setRGB(...(tint || autoTint)); }
    const sm = new THREE.SkinnedMesh(geo, mat);
    sm.name = 'hero-' + o.name;
    if (o.morphTargetDictionary) { sm.morphTargetDictionary = { ...o.morphTargetDictionary }; sm.morphTargetInfluences = new Array(Object.keys(o.morphTargetDictionary).length).fill(0); }
    sm.castShadow = true; sm.frustumCulled = false;
    body.parent.add(sm);
    sm.position.copy(body.position); sm.quaternion.copy(body.quaternion); sm.scale.copy(body.scale);
    sm.bind(body.skeleton, body.bindMatrix);
    made.push(sm);
  });
  return made;
}

// lean (the low and medium levels of detail): the crowd's avatars (not the named cast, the player or
// the family) load without normal maps and with their hair and lashes texture at 512: about 15 MB
// less each on the GPU (docs/living-city-architecture.md D5); flatter cloth up close, the same at 5 m
export async function loadPeople(base = './people/', { lean = false } = {}) {
  const res = await fetch(`${base}people.json`);
  if (!res.ok) throw new Error(`people manifest: ${res.status}`);
  const manifest = await res.json();
  const loader = new GLTFLoader();
  const avatars = {}, clips = {};
  await Promise.all([
    ...Object.entries(manifest.cast).map(async ([role, c]) => {
      avatars[role] = (await loader.loadAsync(base + c.file)).scene;
      mergeByMaterial(avatars[role]);
      if (lean && !c.named && !['lin', 'su', 'player', 'dad'].includes(role)) {
        dropMaps(avatars[role], ['normalMap']);
        avatars[role].traverse((o) => { if (o.material && /_opacity$/i.test(o.material.name || '') && o.material.map) shrink(o.material.map, 512); });
      }
      fixHair(avatars[role], c.hairTint || null);
      if (c.head) swapHead(avatars[role], (await loader.loadAsync(base + c.head)).scene, { tint: c.headTint || null, keepHair: !!c.keepHair, tone: c.skinTone || null });
      // the children's rig is the same Biped, named Bip02: rename it so the shared clips bind to it
      if (c.child) avatars[role].traverse((o) => { if (o.name.startsWith('Bip02')) o.name = o.name.replace('Bip02', 'Bip01'); });
    }),
    ...Object.entries(manifest.clips).map(async ([sex, c]) => { clips[sex] = (await loader.loadAsync(base + c.file)).animations; }),
  ]);
  // which hand each skeleton's umbrella clip raises (measured, not assumed)
  const umbrellaHand = {};
  for (const sex of Object.keys(clips)) {
    if (!clips[sex].some((c) => c.name === 'umbrella')) continue;       // the player's own set has none
    const role = Object.keys(manifest.cast).find((r) => manifest.cast[r].sex === sex);
    const probe = SkeletonUtils.clone(avatars[role]), mixer = new THREE.AnimationMixer(probe);
    const clip = clips[sex].find((c) => c.name === 'umbrella');
    mixer.clipAction(clip).play(); mixer.setTime(Math.min(1, clip.duration / 2)); probe.updateMatrixWorld(true);
    const y = (s) => probe.getObjectByName(`Bip01_${s}_Hand`).getWorldPosition(new THREE.Vector3()).y;
    umbrellaHand[sex] = y('L') > y('R') ? 'L' : 'R';
  }
  return { manifest, avatars, clips, umbrellaHand };
}
// walking with a phone: the texting clip's right arm, neck and head, layered over the walk
const PHONE_LAYER = /^Bip01_(R_(Clavicle|UpperArm|Forearm|Hand|Finger)|Neck|Head)/;

// A child plays the adults' clips: rotations carry over by bone name; the root's own movement (sway,
// bob, hip height) is scaled to the child's size, and strides are shorter, so steps come quicker.
function childClips(people, role) {
  const cache = people._kids || (people._kids = {});
  if (cache[role]) return cache[role];
  const sex = people.manifest.cast[role].sex;
  const adult = Object.keys(people.manifest.cast).find((r) => people.manifest.cast[r].sex === sex && !people.manifest.cast[r].child);
  const hip = (r) => { const b = people.avatars[r].getObjectByName('Bip01'); return b ? Math.abs(b.position.y) || 1 : 1; };
  const k = Math.max(0.4, Math.min(1, hip(role) / hip(adult)));
  const clips = people.clips[sex].map((c) => new THREE.AnimationClip(c.name, c.duration, c.tracks.map((t) => {
    if (t.name !== 'Bip01.position') return t;
    const v = Float32Array.from(t.values, (x) => x * k);
    return new t.constructor(t.name, t.times, v);
  })));
  const base = people.manifest.clips[sex].speeds, speeds = Object.fromEntries(Object.entries(base).map(([n, v]) => [n, v * k]));
  return (cache[role] = { clips, speeds, k });
}

// Every person made by createPerson, for cullPeople(): beyond PERSON_FAR they aren't drawn at all,
// and only those within PERSON_SHADOW cast a shadow (docs/living-city-architecture.md §6.1, 0.3-0.4).
export const PERSON_FAR = 120, PERSON_SHADOW = 30, ACCESSORY_FAR = 25;   // (glasses and such: a few pixels beyond 25 m)   // (the spec says 18 m; 30 keeps daytime shadows on people across a street)
const LIVE = new Set(), _pp = new THREE.Vector3();
export function cullPeople(eye) {
  for (const P of LIVE) {
    if (!P.root.parent) { if ((P.gone = (P.gone || 0) + 1) > 1800) LIVE.delete(P); continue; }   // (a minute detached: let it go)
    P.gone = 0;
    P.root.getWorldPosition(_pp);
    const d = _pp.distanceTo(eye), near = d < PERSON_FAR, shade = d < PERSON_SHADOW;
    for (const a of P.acc) a.visible = d < ACCESSORY_FAR;
    for (const m of P.meshes) {
      if (m.userData.cs === undefined) { m.userData.cs = m.castShadow; m.userData.v0 = m.visible; }   // what its owner asked for
      m.visible = m.userData.v0 && near;
      m.castShadow = m.userData.cs && shade;
    }
  }
}
export const livePeople = () => LIVE.size;

export function createPerson(people, role) {
  const cast = people.manifest.cast[role], sex = cast.sex, kid = cast.child ? childClips(people, role) : null;
  const speeds = kid ? kid.speeds : people.manifest.clips[sex].speeds, CLIPS = kid ? kid.clips : people.clips[sex];
  const root = SkeletonUtils.clone(people.avatars[role]);
  root.scale.setScalar(0.01);                                         // centimetres -> metres
  // Skinned bounds don't follow the pose, so each body gets a fixed sphere round its bind pose, half
  // as big again (raised arms, a seat, a stride): off-screen people are skipped like anything else,
  // in the shadow pass too. Distance and shadows are decided once a frame in cullPeople().
  const meshes = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.isSkinnedMesh) {
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      o.boundingSphere = o.geometry.boundingSphere.clone(); o.boundingSphere.radius *= 1.5;
      o.frustumCulled = true;
    } else o.frustumCulled = false;
    meshes.push(o);
  });
  const mixer = new THREE.AnimationMixer(root);
  const springs = createSprings(root);                                   // skirts, hair, hems that swing (tools/cloth/)
  const hand = people.umbrellaHand[sex], armRe = ARM(hand);
  const base = {}, arm = {};
  for (const clip of CLIPS) {
    // every clip split in two: the body without the umbrella arm, and that arm alone
    const body = new THREE.AnimationClip(`${clip.name}`, clip.duration, clip.tracks.filter((t) => !armRe.test(boneOf(t))));
    const armOnly = new THREE.AnimationClip(`${clip.name}:arm`, clip.duration, clip.tracks.filter((t) => armRe.test(boneOf(t))));
    base[clip.name] = mixer.clipAction(body); arm[clip.name] = mixer.clipAction(armOnly);
  }
  const umbArm = arm.umbrella;
  let current = null, umbrellaW = 0;
  function play(name, fade = 0.35) {
    if (!base[name]) name = 'idle';
    if (current === name) return;
    const next = base[name], nextArm = arm[name];
    // (an instant switch is a plain swap: a zero-length fade evaluated at a zero time step weighs every
    // action at nothing, and the skeleton drops to its bind pose: arms out, legs straight)
    if (fade > 0) {
      next.reset().setEffectiveWeight(1).fadeIn(fade).play();
      if (current) { base[current].fadeOut(fade); if (arm[current] !== umbArm) arm[current].fadeOut(fade); }
    } else {
      next.reset().setEffectiveWeight(1).play();
      if (current) { base[current].stop(); if (arm[current] !== umbArm) arm[current].stop(); }
    }
    nextArm.reset().setEffectiveWeight(1).play();
    current = name;
  }
  // stagger so the six people never move in lockstep
  const offset = Math.random() * 10;
  play('idle', 0); mixer.setTime(offset);
  umbArm.setEffectiveWeight(0).play();

  const bone = (n) => root.getObjectByName(n);
  const bones = { head: bone('Bip01_Head'), neck: bone('Bip01_Neck'), chest: bone('Bip01_Spine2'), L: bone('Bip01_L_Hand'), R: bone('Bip01_R_Hand') };
  const anchors = { chest: new THREE.Object3D(), head: new THREE.Object3D(), umbrella: new THREE.Object3D(), phone: new THREE.Object3D() };
  const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _hq = new THREE.Quaternion(), _hp = new THREE.Quaternion(), _hv = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  let headYaw = 0;
  // a flinch (engine/flinch.js) laid over whatever is playing: the torso turning (twist, rad, + =
  // to the left) and leaning back (lean, rad), shared between the lower and upper spine
  const spine = [[bone('Bip01_Spine1'), 0.45], [bone('Bip01_Spine2'), 0.55]].filter(([b]) => b);
  let flinch = null; const _fa = new THREE.Vector3(), _fq = new THREE.Quaternion();
  const phoneClip = CLIPS.find((c) => c.name === 'phone');
  const phoneLayer = phoneClip ? mixer.clipAction(new THREE.AnimationClip('phone:hold', phoneClip.duration, phoneClip.tracks.filter((t) => PHONE_LAYER.test(boneOf(t))))) : null;
  if (phoneLayer) { phoneLayer.play(); phoneLayer.setEffectiveWeight(0); phoneLayer.time = phoneClip.duration * (0.15 + Math.random() * 0.6); }
  const person = {
    springs, accessories: [],
    root, mixer, role, sex, speeds, anchors, bones, umbrellaHand: hand, child: !!kid, size: kid ? kid.k : 1,
    // the actions themselves (base: whole body but the umbrella arm; arm: that arm), for posing a
    // person at an exact moment of a clip (the crowd's impostor bake). (mixer.existingAction by name
    // finds nothing here: the clips aren't attached to the model)
    actions: { base, arm },
    get state() { return current; },
    play,
    // umbrella: 0..1 how far the umbrella arm has taken over
    setUmbrella(u) {
      umbrellaW = u;
      umbArm.setEffectiveWeight(u);
      if (current && arm[current] !== umbArm) arm[current].setEffectiveWeight(1 - u);
    },
    // 0..1: how far a phone is up in front of the face while walking
    // (blended by weight: the mixer averages layers by weight, so a large weight makes it dominate)
    setPhoneHold(w) {
      if (!phoneLayer) return;
      phoneLayer.setEffectiveWeight(w > 0.001 ? w * w * 12 : 0);
      const d = phoneClip.duration;                                     // stay in the stretch where the phone is up
      if (phoneLayer.time < d * 0.12 || phoneLayer.time > d * 0.88) phoneLayer.time = d * 0.12;
    },
    // pose: { twist, lean } from engine/flinch.js flinchPose(), or null
    setFlinch(pose) { flinch = pose; },
    // speed (m/s) drives walk / jog playback so the stride matches the ground
    setGait(speed) {
      if (current === 'walk') base.walk.timeScale = arm.walk.timeScale = THREE.MathUtils.clamp(speed / speeds.walk, 0.55, 1.7);
      if (current === 'jog') base.jog.timeScale = arm.jog.timeScale = THREE.MathUtils.clamp(speed / speeds.jog, 0.6, 1.4);
    },
    // look: world [x, z] to turn the head (and a little of the neck) toward, or null
    update(dt, look = null) {
      if (dt > 0) mixer.update(dt);                                       // (nothing moves in no time; see play)
      root.updateMatrixWorld(true);
      if (flinch && (Math.abs(flinch.twist) > 1e-3 || Math.abs(flinch.lean) > 1e-3)) {
        const ry = root.rotation.y;
        for (const [b, k] of spine) {
          b.parent.getWorldQuaternion(_hp).invert();
          b.quaternion.premultiply(_fq.setFromAxisAngle(_fa.set(0, 1, 0).applyQuaternion(_hp), flinch.twist * k));
          b.quaternion.premultiply(_fq.setFromAxisAngle(_fa.set(-Math.cos(ry), 0, Math.sin(ry)).applyQuaternion(_hp), flinch.lean * k));
          b.updateMatrixWorld(true);
        }
      }
      let want = 0;
      if (look) {
        bones.head.getWorldPosition(_hv);
        let d = Math.atan2(look[0] - _hv.x, look[1] - _hv.z) - root.rotation.y;
        while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
        want = Math.max(-1.2, Math.min(1.2, d));
      }
      headYaw += (want - headYaw) * Math.min(1, dt * 7);
      if (Math.abs(headYaw) > 0.005) {
        for (const [b, k] of [[bones.neck, 0.35], [bones.head, 0.65]]) {
          if (!b) continue;
          b.parent.getWorldQuaternion(_hp);
          const axis = _hv.copy(UP).applyQuaternion(_hp.invert());
          b.quaternion.premultiply(_hq.setFromAxisAngle(axis, headYaw * k));
        }
        root.updateMatrixWorld(true);
      }
      if (springs && dt > 0) springs.update(dt);
      const yaw = _q.setFromEuler(_e.set(0, root.rotation.y, 0));
      for (const [k, b] of [['chest', bones.chest], ['head', bones.head]]) { b.getWorldPosition(anchors[k].position); anchors[k].quaternion.copy(yaw); }
      bones[hand].getWorldPosition(anchors.umbrella.position); anchors.umbrella.quaternion.copy(yaw);
      bones.R.getWorldPosition(anchors.phone.position); bones.R.getWorldQuaternion(anchors.phone.quaternion);
      for (const a of Object.values(anchors)) a.updateMatrixWorld(true);
      return umbrellaW;
    },
  };
  LIVE.add({ root, meshes, acc: person.accessories });
  return person;
}
