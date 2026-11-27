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
import { PEOPLE_LAYER, PEOPLE_REFLECT_FAR } from './peopleReflect.js';

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

// The skin map toned to the character's skin: a multiplier on the skin only. On the whole map it lifted the dark
// scalp under the hair (about twice as bright) into a pale band at the hairline; the scalp, brows' shadow and the
// mouth's inside (dark texels) keep their colour.
function skinToned(src, tone, hair = null, neckCol = null, fade = false) {
  const m = src.clone();
  if (fade) { m.transparent = true; m.depthWrite = false; }
  const U = { uTone: { value: new THREE.Vector3(...tone) }, uNeckCol: { value: new THREE.Vector3(...(neckCol || [0, 0, 0])) } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uTone;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        float hSkin = smoothstep(0.06, 0.09, dot(diffuseColor.rgb, vec3(0.3, 0.55, 0.15)));
        diffuseColor.rgb *= mix(vec3(1.0), uTone, hSkin);`);
    // the dark scalp under kept hair: shaded as the same strands as the hair over it, so where the hair shell
    // stops short of the painted hairline the gap reads as short hair lying flat, not a bare grey band
    if (hair) strandPatch(sh, hair, 'hMask = 1.0 - smoothstep(0.06, 0.09, dot(diffuseColor.rgb, vec3(0.3, 0.55, 0.15)));', false);   // (runs before the tone)
    // the new neck's lowest centimetres take the old body's skin colour, so its cut edge (ragged, on an open
    // collar) melts into the old neck instead of showing as pale shards
    if (neckCol) {
      const F = fade ? ' varying float vNeckFade;' : '';
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float neckmix; attribute float neckcut; attribute vec3 neckrgb; varying float vNeckMix; varying float vNeckCut; varying vec3 vNeckRgb;' + (fade ? ' attribute float neckfade;' + F : ''))
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvNeckMix = neckmix; vNeckCut = neckcut; vNeckRgb = neckrgb;' + (fade ? ' vNeckFade = neckfade;' : ''));
      sh.fragmentShader = sh.fragmentShader.replace('uniform vec3 uTone;', 'uniform vec3 uTone; varying float vNeckMix; varying float vNeckCut; varying vec3 vNeckRgb;' + F)
        .replace('diffuseColor.rgb *= mix(vec3(1.0), uTone, hSkin);', (fade ? `if (vNeckCut < 0.0 || vNeckCut >= ${NECK_FADE.toFixed(4)}) discard;\n        diffuseColor.a = mix(1.0, smoothstep(0.0, ${NECK_FADE.toFixed(4)}, vNeckCut), clamp(vNeckFade, 0.0, 1.0)) * (1.0 - clamp(vNeckFade - 1.0, 0.0, 1.0));` : `if (vNeckCut < ${NECK_FADE.toFixed(4)}) discard;`) + '\n        diffuseColor.rgb *= mix(vec3(1.0), uTone, hSkin);\n        diffuseColor.rgb = mix(diffuseColor.rgb, vNeckRgb, vNeckMix);');
    }
  };
  m.customProgramCacheKey = () => (hair ? 'skin-toned-scalp' : 'skin-toned') + (neckCol ? '-neck' : '') + (fade ? '-fade' : '');
  return m;
}

// the new neck's last centimetres over the old one (head metres): drawn see-through, fading out downwards over
// the old neck brought just under it, so the two crossfade into one skin instead of meeting in a line
const NECK_FADE = 0.035;

// where a Rocketbox body's new neck ends (head metres): 3.5 cm under the top of what is left of the old neck in front
function cutYOf(newChin, newNose, oldNeckTop, nose, s) {
  return Math.min(newChin, newNose.y + (oldNeckTop - nose.y) / (100 * s) - 0.035);
}

// the old neck's vertices pulled in to just inside the new neck's surface (geo: the new skin, in the body's space,
// with its neckcut attribute: height over the new neck's end, head metres; chinUp: the chin's height over it)
// a Rocketbox texel of skin, not cloth: warm, and lighter than the dark browns of jackets and leather
function skinTexel(c) {
  const sat = (c[0] - c[2]) / Math.max(c[0], 0.01);
  return c[0] >= c[1] && c[1] >= c[2] && c[0] - c[2] >= 0.05 && 0.3 * c[0] + 0.55 * c[1] + 0.15 * c[2] >= 0.36 && sat <= 0.5;
}

function shrinkOldNeck(avatar, bone0, body, geo, chinUp) {
  const pos = geo.attributes.position, nc = geo.attributes.neckcut, w = new THREE.Vector3();
  const pts = [];
  let sx = 0, sy = 0, sxx = 0, sxy = 0, n = 0;
  for (let v = 0; v < pos.count; v++) {
    const c = nc.getX(v); if (c < -0.01 || c > chinUp + 0.03) continue;
    w.fromBufferAttribute(pos, v).applyMatrix4(body.matrixWorld);
    pts.push(w.x, w.y, w.z, c);
    sx += c; sy += w.y; sxx += c * c; sxy += c * w.y; n++;
  }
  if (n < 50) return;
  const k = (n * sxy - sx * sy) / Math.max(1e-9, n * sxx - sx * sx), y0 = (sy - k * sx) / n;   // world y = y0 + k * neckcut
  if (!(k > 0)) return;
  const yTop = y0 + k * chinUp, BIN = k * 0.005, NA = 32, nb = Math.max(1, Math.ceil((yTop - y0) / BIN));
  const binOf = (y) => THREE.MathUtils.clamp(Math.floor((y - y0) / BIN), 0, nb - 1);
  // per height, the neck's centre (the jaw and the ears left out: the points far from the median distance)
  const byBin = Array.from({ length: nb }, () => []);
  for (let i = 0; i < pts.length; i += 4) if (pts[i + 1] >= y0 - BIN && pts[i + 1] <= yTop) byBin[binOf(pts[i + 1])].push(pts[i], pts[i + 2]);
  const cen = [], rad = [], rawRad = [];
  for (let b = 0; b < nb; b++) {
    const a = byBin[b]; let cx = 0, cz = 0, m = a.length / 2;
    if (!m) { cen.push(b ? cen[b - 1] : null); rad.push(b ? rad[b - 1] : null); rawRad.push(b ? rawRad[b - 1] : null); continue; }
    for (let i = 0; i < a.length; i += 2) { cx += a[i]; cz += a[i + 1]; }
    cx /= m; cz /= m;
    for (let it = 0; it < 2; it++) {
      const d = []; for (let i = 0; i < a.length; i += 2) d.push(Math.hypot(a[i] - cx, a[i + 1] - cz));
      const med = [...d].sort((p, q) => p - q)[d.length >> 1];
      let nx = 0, nz = 0, nn = 0;
      for (let i = 0; i < a.length; i += 2) if (d[i >> 1] < med * 1.3) { nx += a[i]; nz += a[i + 1]; nn++; }
      if (nn) { cx = nx / nn; cz = nz / nn; }
    }
    const r = new Float32Array(NA);
    for (let i = 0; i < a.length; i += 2) {
      const dx = a[i] - cx, dz = a[i + 1] - cz, d = Math.hypot(dx, dz);
      const j = Math.floor((Math.atan2(dz, dx) / (2 * Math.PI) + 1) * NA) % NA;
      r[j] = Math.max(r[j], d);
    }
    const med = [...r].filter((x) => x > 0).sort((p, q) => p - q);
    const mr = med[med.length >> 1] || 0;
    const raw = Float32Array.from(r, (x) => x || mr);
    for (let j = 0; j < NA; j++) r[j] = Math.min(r[j] || mr, mr * 0.95);   // (no ears, no jaw)
    cen.push([cx, cz]); rad.push(r); rawRad.push(raw);
  }
  // first, the new neck's colour where it takes the old neck's (neckmix): the old skin's own texel under each of
  // its vertices (the nearest point on the old neck's triangles, at the same height and direction from the axis),
  // so the body's painted shading carries on up the new neck instead of one average colour meeting it in a line
  if (geo.attributes.neckrgb && geo.attributes.neckmix) {
    const tris = [], A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
    avatar.traverse((o) => {
      if (!o.isSkinnedMesh || o.skeleton.bones[0] !== bone0 || !o.geometry.index || !o.geometry.attributes.uv || o.name.startsWith('hero-')) return;
      const tex = texelReader(o.material, 1024); if (!tex) return;
      const op = o.geometry.attributes.position, ou = o.geometry.attributes.uv, ix = o.geometry.index.array;
      for (let t = 0; t < ix.length; t += 3) {
        A.fromBufferAttribute(op, ix[t]).applyMatrix4(o.matrixWorld); B.fromBufferAttribute(op, ix[t + 1]).applyMatrix4(o.matrixWorld); C.fromBufferAttribute(op, ix[t + 2]).applyMatrix4(o.matrixWorld);
        const cy = (A.y + B.y + C.y) / 3;
        if (cy < y0 - k * 0.06 || cy > yTop + k * 0.03) continue;
        const b = binOf(cy); if (!cen[b]) continue;
        const cx = (A.x + B.x + C.x) / 3 - cen[b][0], cz = (A.z + B.z + C.z) / 3 - cen[b][1];
        if (Math.hypot(cx, cz) > Math.max(...rad[b]) * 1.6) continue;
        tris.push({ a: A.clone(), b: B.clone(), c: C.clone(), i: [ix[t], ix[t + 1], ix[t + 2]], ou, tex, bin: b });
      }
    });
    // (by height: each vertex looks only at the triangles a few bins either side)
    const byTriBin = Array.from({ length: nb }, () => []);
    for (const T of tris) for (let d = -3; d <= 3; d++) if (T.bin + d >= 0 && T.bin + d < nb) byTriBin[T.bin + d].push(T);
    const nm = geo.attributes.neckmix, rgb = geo.attributes.neckrgb, tri = new THREE.Triangle(), q = new THREE.Vector3(), bc = new THREE.Vector3();
    const skinLike = (c) => c[0] >= c[2] && c[0] - c[2] > 0.03 && 0.3 * c[0] + 0.55 * c[1] + 0.15 * c[2] > 0.2;
    for (let v = 0; v < pos.count && tris.length; v++) {
      if (!(nm.getX(v) > 0)) continue;
      w.fromBufferAttribute(pos, v).applyMatrix4(body.matrixWorld);
      // (the old neck lies a little inside or outside: the nearest point on it from a ray out from the axis)
      let best = null, bd = Infinity;
      const vb = binOf(w.y);
      for (const T of (byTriBin[vb] && byTriBin[vb].length ? byTriBin[vb] : tris)) {
        tri.set(T.a, T.b, T.c); tri.closestPointToPoint(w, q);
        const d = q.distanceToSquared(w); if (d < bd) { bd = d; best = T; bc.copy(q); }
      }
      if (!best) continue;
      tri.set(best.a, best.b, best.c); const bary = tri.getBarycoord(bc, new THREE.Vector3());
      const u = bary.x * best.ou.getX(best.i[0]) + bary.y * best.ou.getX(best.i[1]) + bary.z * best.ou.getX(best.i[2]);
      const vv = bary.x * best.ou.getY(best.i[0]) + bary.y * best.ou.getY(best.i[1]) + bary.z * best.ou.getY(best.i[2]);
      // (a UV seam across the triangle: its corners' UVs far apart, the blend between them is somewhere else on the map)
      const span = Math.max(...best.i.map((i) => best.ou.getX(i))) - Math.min(...best.i.map((i) => best.ou.getX(i)));
      const c = best.tex(span > 0.25 ? best.ou.getX(best.i[0]) : u, span > 0.25 ? best.ou.getY(best.i[0]) : vv);
      if (!skinLike(c)) continue;
      rgb.setXYZ(v, ...c.map((x) => 1.15 * Math.pow(x, 2.2)));
    }
    rgb.needsUpdate = true;
  }
  const inv = new THREE.Matrix4(), yFade = y0 + k * NECK_FADE;
  avatar.traverse((o) => {
    if (!o.isSkinnedMesh || o.skeleton.bones[0] !== bone0 || !o.geometry.index || o.name.startsWith('hero-')) return;
    const op = o.geometry.attributes.position; let moved = false;
    const head = /head/i.test(o.material.name);
    // (skin, by its texel: only skin is moved under the new neck's end, never a collar)
    const tex = texelReader(o.material, 1024), ouv = o.geometry.attributes.uv;
    const isSkin = (v) => {
      if (!tex || !ouv) return head;
      const c = tex(ouv.getX(v), ouv.getY(v));
      return skinTexel(c);
    };   // (the old head's own primitives: all of it goes inside; clothes keep their shape)
    inv.copy(o.matrixWorld).invert();
    for (let v = 0; v < op.count; v++) {
      w.fromBufferAttribute(op, v).applyMatrix4(o.matrixWorld);
      if (w.y < y0 - k * 0.025 || w.y > yTop + k * (head ? 0.2 : 0.1)) continue;
      const b = binOf(w.y); if (!cen[b]) continue;
      const [cx, cz] = cen[b], dx = w.x - cx, dz = w.z - cz, r = Math.hypot(dx, dz);
      const j = Math.floor((Math.atan2(dz, dx) / (2 * Math.PI) + 1) * NA) % NA, Rs = rawRad[b] ? rawRad[b][j] : 0;
      if (!(Rs > 0) || r < 1e-6) continue;
      let nr;
      const under = Rs - k * 0.0015;   // (just under its skin)
      if (w.y <= yFade) {
        // under the new neck's fading end and below it: eased onto its surface, just inside, so the two
        // crossfade as one skin (in or out); clothes keep their shape
        if (head) { if (r <= under) continue; nr = under; }   // (the old head's own: all of it in, the jaw's underside too)
        else {
          if (r > Rs * 1.6 || !isSkin(v)) continue;   // (a collar)
          nr = r + (under - r) * THREE.MathUtils.smoothstep(w.y, y0 - k * 0.025, y0);
        }
      } else {
        // above it: inside it, out of sight
        const R = THREE.MathUtils.lerp(under, rad[b][j] * (head ? 0.75 : 0.9), THREE.MathUtils.smoothstep(w.y, yFade, yFade + k * 0.004));
        if (r <= R || (!head && r > R * (w.y > y0 + k * 0.04 ? 4 : 2.2))) continue;   // (a collar stays low)
        nr = R;
      }
      w.x = cx + dx * nr / r; w.z = cz + dz * nr / r;
      w.applyMatrix4(inv); op.setXYZ(v, w.x, w.y, w.z); moved = true;
    }
    if (moved) { op.needsUpdate = true; o.geometry.computeBoundingSphere(); }
    if (head) {
      // and cut level just over the fade, per pixel: a triangle of it from under the fade up to the jaw's corner
      // (where the new neck curves in) cut across the new skin as a dark sliver
      const h = new Float32Array(op.count);
      for (let v = 0; v < op.count; v++) h[v] = (w.fromBufferAttribute(op, v).applyMatrix4(o.matrixWorld).y - yFade) / k;
      o.geometry.setAttribute('oldcut', new THREE.BufferAttribute(h, 1));
      o.material = o.material.clone();
      const prev = o.material.onBeforeCompile;
      o.material.onBeforeCompile = (sh, r) => {
        if (prev) prev(sh, r);
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float oldcut; varying float vOldCut;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvOldCut = oldcut;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vOldCut;').replace('void main() {', 'void main() {\n  if (vOldCut > 0.004) discard;');
      };
      const key = o.material.customProgramCacheKey.bind(o.material);
      o.material.customProgramCacheKey = () => key() + '-oldcut';
    }
    // nothing of the old neck is needed above the new neck's dissolving end: those triangles go (the old head's
    // own primitives, all of them; the body's, only what lies on the neck, so a collar standing off it stays)
    {
      const ix = o.geometry.index.array, keep = [], c = new THREE.Vector3();
      for (let t = 0; t < ix.length; t += 3) {
        let lo = Infinity, hi = -Infinity; c.set(0, 0, 0);
        for (let j = 0; j < 3; j++) { w.fromBufferAttribute(op, ix[t + j]).applyMatrix4(o.matrixWorld); lo = Math.min(lo, w.y); hi = Math.max(hi, w.y); c.add(w); }
        // (wholly above the fade; of the old head's own, any reaching above it: its slivers poked out at the jaw)
        let drop = head ? lo > yFade + k * 0.008 || hi > yFade + k * 0.03 : lo > yFade + k * 0.008 && lo < yTop + k * 0.2;
        if (drop && !head) {
          c.divideScalar(3);
          const b = binOf(c.y), [cx, cz] = cen[b] || [c.x, c.z], dx = c.x - cx, dz = c.z - cz;
          const R = cen[b] ? rad[b][Math.floor((Math.atan2(dz, dx) / (2 * Math.PI) + 1) * NA) % NA] : 0;
          drop = R > 0 && Math.hypot(dx, dz) < R * 1.15;
        }
        if (!drop) keep.push(ix[t], ix[t + 1], ix[t + 2]);
      }
      if (keep.length < ix.length) { const g = o.geometry.clone(); g.setIndex(keep); o.geometry = g; }
    }
  });
  // the new neck's fading end, vertex by vertex (neckfade): over the old neck brought under it, it fades (1); where
  // nothing of the old body lies right under it (a gap behind a collar), fading would show the background through
  // it, so it stays solid (0); and where its foot flares out over a collar or off the old body, it is hidden (2)
  const nf = geo.attributes.neckfade;
  if (nf) {
    const near = Array.from({ length: nb }, () => []), A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
    avatar.traverse((o) => {
      if (!o.isSkinnedMesh || o.skeleton.bones[0] !== bone0 || !o.geometry.index || o.name.startsWith('hero-')) return;
      const op = o.geometry.attributes.position, ix = o.geometry.index.array, ouv = o.geometry.attributes.uv;
      const head = /head/i.test(o.material.name), tex = !head && ouv && texelReader(o.material, 1024);
      for (let t = 0; t < ix.length; t += 3) {
        A.fromBufferAttribute(op, ix[t]).applyMatrix4(o.matrixWorld); B.fromBufferAttribute(op, ix[t + 1]).applyMatrix4(o.matrixWorld); C.fromBufferAttribute(op, ix[t + 2]).applyMatrix4(o.matrixWorld);
        const lo = Math.min(A.y, B.y, C.y), hi = Math.max(A.y, B.y, C.y);
        if (hi < y0 - k * 0.03 || lo > yFade + k * 0.03) continue;
        let skin = true;
        if (tex) {
          const cs = [0, 1, 2].map((j) => tex(ouv.getX(ix[t + j]), ouv.getY(ix[t + j])));
          const c = [0, 1, 2].map((i) => (cs[0][i] + cs[1][i] + cs[2][i]) / 3);
          skin = skinTexel(c);
        }
        const T = { t: new THREE.Triangle(A.clone(), B.clone(), C.clone()), skin };
        for (let b = binOf(lo) - 4; b <= binOf(hi) + 4; b++) if (b >= 0 && b < nb) near[b].push(T);
      }
    });
    const q = new THREE.Vector3(), nrm = new THREE.Vector3(), nc2 = geo.attributes.neckcut;
    for (let v = 0; v < pos.count; v++) {
      const c = nc2.getX(v); if (c < -0.01 || c > NECK_FADE + 0.01) continue;
      w.fromBufferAttribute(pos, v).applyMatrix4(body.matrixWorld);
      const b = binOf(w.y); if (!cen[b]) continue;
      let ds = Infinity, rs = 0, dc = Infinity, rc = 0;
      for (const T of near[b]) {
        T.t.closestPointToPoint(w, q); const d = q.distanceTo(w) / k;
        if (T.skin) { if (d < ds) { ds = d; rs = Math.hypot(q.x - cen[b][0], q.z - cen[b][1]); } }
        else if (d < dc) { dc = d; rc = Math.hypot(q.x - cen[b][0], q.z - cen[b][1]); }
      }
      const r = Math.hypot(w.x - cen[b][0], w.z - cen[b][1]), off = THREE.MathUtils.smoothstep(ds, 0.012, 0.025);
      // (over a collar, or standing well out from the old body's skin, the flare at its foot: hidden; over a
      // gap: solid)
      // (only its foot spreading to the shoulders: the jaw's underside, facing down, and the nape, facing back,
      // stand off the old neck too, with nothing behind them, and stay solid; the avatar faces +z as it loads)
      nrm.fromBufferAttribute(geo.attributes.normal, v).transformDirection(body.matrixWorld);
      const foot = nrm.y > -0.3 && nrm.z > -0.5;
      nf.setX(v, dc < 0.03 && r > rc - k * 0.002 ? 2 : ds < 0.05 && rs < r && foot ? 1 + off : 1 - off);
    }
    nf.needsUpdate = true;
  }
}

// a geometry of just these triangles (its own compact copy of the vertices they use)
function compact(g, tris) {
  const map = new Map(), order = [];
  const idx = tris.map((v) => { if (!map.has(v)) { map.set(v, order.length); order.push(v); } return map.get(v); });
  const out = new THREE.BufferGeometry();
  for (const [name, at] of Object.entries(g.attributes)) {
    const n = at.itemSize, arr = new at.array.constructor(order.length * n);
    order.forEach((v, i) => { for (let k = 0; k < n; k++) arr[i * n + k] = at.getComponent(v, k); });
    out.setAttribute(name, new THREE.BufferAttribute(arr, n, at.normalized));
  }
  out.setIndex(idx);
  return out;
}

// The old sculpted hair under new long hair (dropHair) is crumpled shards, and where it is removed the jacket
// has a hole (the scan never had a jacket under it). In its place: one smooth dark sheet over the same ground,
// a height field around the spine (angle round the body, height) at the old hair's
// distance from the spine (its median), blurred, and drawn in a little, so the gaps between the new locks show dark hair
// lying on the jacket, never jacket or holes. Skinned like the nearest old-hair vertex. `geo` is the old hair
// (compacted, body mesh space), `bodyWorld` maps it to the avatar's space (centimetres, y up, face +z).
function underHairSheet(geo, bodyWorld, nose, inset = 1.5, cover = []) {
  const pos = geo.attributes.position, n = pos.count, w = new THREE.Vector3();
  const cx = nose.x, cz = nose.z - 9, DA = Math.PI / 72, DY = 1.5;
  const W = []; let y0 = Infinity, y1 = -Infinity;
  for (let v = 0; v < n; v++) {
    w.fromBufferAttribute(pos, v).applyMatrix4(bodyWorld); W.push(w.clone());
    y0 = Math.min(y0, w.y); y1 = Math.max(y1, w.y);
  }
  const cols = Math.round(2 * Math.PI / DA), rows = Math.ceil((y1 - y0) / DY) + 1;
  const bins = Array.from({ length: cols * rows }, () => []);
  const angOf = (p) => Math.atan2(p.x - cx, -(p.z - cz));   // 0 straight behind, ±π in front
  for (const p of W) {
    const c = ((Math.floor((angOf(p) + Math.PI) / DA) % cols) + cols) % cols, r = Math.floor((p.y - y0) / DY);
    bins[r * cols + c].push(Math.hypot(p.x - cx, p.z - cz));
  }
  let R = new Float32Array(cols * rows).fill(NaN);
  bins.forEach((b, i) => { if (b.length) { b.sort((x, y) => x - y); R[i] = b[Math.floor(0.5 * (b.length - 1))] - inset; } });
  // where the new locks lie, never above them: under their inner fifth, less 6 mm
  const lk = Array.from({ length: cols * rows }, () => []);
  for (const p of cover) {
    const r = Math.floor((p.y - y0) / DY);
    if (r < 0 || r >= rows) continue;
    lk[r * cols + (((Math.floor((angOf(p) + Math.PI) / DA) % cols) + cols) % cols)].push(Math.hypot(p.x - cx, p.z - cz));
  }
  lk.forEach((b, i) => { if (b.length > 2 && !Number.isNaN(R[i])) { b.sort((x, y) => x - y); R[i] = Math.min(R[i], b[Math.floor(0.2 * (b.length - 1))] - 0.6); } });
  // and ending 4.5 cm above the locks' ends (its own edge is hard; theirs is strands)
  for (let c = 0; c < cols; c++) {
    let rmin = -1;
    for (let r = 0; r < rows; r++) if (lk[r * cols + c].length > 2) { rmin = r; break; }
    if (rmin >= 0) for (let r = 0; r < Math.min(rows, rmin + 3); r++) R[r * cols + c] = NaN;
  }
  // close small holes (a cell with filled neighbours on both sides), then blur over the filled cells
  const at = (A, r, c) => (r < 0 || r >= rows ? NaN : A[r * cols + ((c % cols) + cols) % cols]);
  for (let pass = 0; pass < 2; pass++) {
    const S = R.slice();
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (!Number.isNaN(R[r * cols + c])) continue;
      const pairs = [[at(R, r, c - 1), at(R, r, c + 1)], [at(R, r - 1, c), at(R, r + 1, c)], [at(R, r, c - 2), at(R, r, c + 2)]];
      for (const [p, q] of pairs) if (!Number.isNaN(p) && !Number.isNaN(q)) { S[r * cols + c] = (p + q) / 2; break; }
    }
    R = S;
  }
  for (let pass = 0; pass < 4; pass++) {
    const S = R.slice();
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (Number.isNaN(R[r * cols + c])) continue;
      let sum = 0, k = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const q = at(R, r + dr, c + dc); if (!Number.isNaN(q)) { sum += q; k++; } }
      S[r * cols + c] = sum / k;
    }
    R = S;
  }
  // the sheet: a vertex per filled cell, quads (or the triangles of them that exist) between neighbours
  const inv = new THREE.Matrix4().copy(bodyWorld).invert();
  const vid = new Int32Array(cols * rows).fill(-1), P = [], Wp = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const rad = R[r * cols + c];
    if (Number.isNaN(rad)) continue;
    const a = -Math.PI + (c + 0.5) * DA, y = y0 + (r + 0.5) * DY, rr = Math.max(1, rad);
    const p = new THREE.Vector3(cx + Math.sin(a) * rr, y, cz - Math.cos(a) * rr);
    vid[r * cols + c] = Wp.length; Wp.push(p); P.push(p.clone().applyMatrix4(inv));
  }
  const idx = [];
  for (let r = 0; r + 1 < rows; r++) for (let c = 0; c < cols; c++) {
    const q = [vid[r * cols + c], vid[r * cols + (c + 1) % cols], vid[(r + 1) * cols + (c + 1) % cols], vid[(r + 1) * cols + c]];
    const tri = (i, j, k) => { if (i >= 0 && j >= 0 && k >= 0) idx.push(i, k, j); };
    if (q.every((i) => i >= 0)) { tri(q[0], q[1], q[2]); tri(q[0], q[2], q[3]); }   // (whole quads only: a lone triangle shows as a dark shard past the locks)
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(P.flatMap((p) => p.toArray()), 3));
  out.setIndex(idx);
  out.computeVertexNormals();
  // skinning from the nearest old-hair vertex
  const si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight;
  const SI = new Uint16Array(Wp.length * 4), SW = new Float32Array(Wp.length * 4);
  Wp.forEach((p, i) => {
    let best = 0, bd = Infinity;
    for (let v = 0; v < n; v++) { const d = p.distanceToSquared(W[v]); if (d < bd) { bd = d; best = v; } }
    for (let k = 0; k < 4; k++) { SI[i * 4 + k] = si.getComponent(best, k); SW[i * 4 + k] = sw.getComponent(best, k); }
  });
  out.setAttribute('skinIndex', new THREE.BufferAttribute(SI, 4));
  out.setAttribute('skinWeight', new THREE.BufferAttribute(SW, 4));
  return out;
}

// A sculpted hair shell, shaded as hair: fine strands running from the crown outward (light and dark hairs in
// the colour, rougher and smoother ones), a highlight that runs across the strands rather than a round glossy
// spot (Kajiya-Kay, from the key light), little specular otherwise, and strand-shaped gaps where the shell is
// seen edge on, so its silhouette breaks up into hair tips instead of a hard rubber edge.
// `nose` is the old nose tip in the avatar's space (centimetres, y up, face +z); bodyWorld maps the mesh there.
function hairFrame(nose, bodyWorld) {
  const inv = new THREE.Matrix4().copy(bodyWorld).invert();
  const crown = new THREE.Vector3(nose.x, nose.y + 14, nose.z - 9).applyMatrix4(inv);   // the whorl, behind the top
  const perCm = 1 / new THREE.Vector3().setFromMatrixScale(bodyWorld).x;                 // mesh units per centimetre
  const down = new THREE.Vector3(0, -1, 0).transformDirection(inv), front = new THREE.Vector3(0, 0, 1).transformDirection(inv);
  return { uCrown: { value: crown }, uPerCm: { value: perCm }, uDown: { value: down }, uFront: { value: front } };
}

// the strand shading, patched into a material's shaders. `maskGLSL` runs after the colour map and sets hMask
// (1 where this is hair); `shell` adds the edge-on gaps and the darker underside of a hair shell.
function strandPatch(sh, U, maskGLSL, shell) {
  Object.assign(sh.uniforms, U);
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nuniform vec3 uCrown; uniform float uPerCm;\nvarying vec3 vHairD; varying vec3 vHairT;')
    .replace('#include <skinnormal_vertex>', `#include <skinnormal_vertex>
      vec3 hT = position - uCrown; hT -= normal * dot(hT, normal); hT = normalize(hT + vec3(0.0, -0.35, 0.0) * length(hT));
      #ifdef USE_SKINNING
        hT = (skinMatrix * vec4(hT, 0.0)).xyz;
      #endif
      vHairT = normalize(normalMatrix * hT);
      // strands radiate from the crown: across them is the angle round it, along them the distance from it
      vHairD = (position - uCrown) / uPerCm;   // (the angle is taken per pixel: interpolated, it kinks at every triangle)`);
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', `#include <common>
      uniform vec3 uDown; uniform vec3 uFront;
      varying vec3 vHairD; varying vec3 vHairT;
      float hHash(float n) { return fract(sin(n) * 43758.5453); }
      // value noise that wraps every p cells (round the head, without a seam at the back)
      float hStrand(float x, float p) { float i = floor(x), f = fract(x); return mix(hHash(mod(i, p)), hHash(mod(i + 1.0, p)), smoothstep(0.0, 1.0, f)); }`)
    .replace('#include <map_fragment>', `#include <map_fragment>
      float hMask = 1.0;
      ${maskGLSL}
      // strand coordinate: 360 clumps round the head (about 6 per cm at the hairline, finer hairs inside), wobbling along their length
      vec2 hUV = vec2(atan(dot(vHairD, cross(uDown, uFront)), dot(vHairD, uFront)) / 6.2831853 + 0.5, length(vHairD));
      float hAlong = hUV.y;
      float hAcross = hUV.x * 360.0 + 0.5 * sin(hAlong * 0.7);
      // each octave fades to its mean once its strands are finer than about two pixels (no sparkle at a distance)
      float hW = fwidth(hUV.x * 360.0);
      float hS = 0.5 + 0.6 * (hStrand(hAcross, 360.0) - 0.5) * (1.0 - smoothstep(0.3, 0.7, hW))
                     + 0.4 * (hStrand(hAcross * 3.0 + 7.0, 1080.0) - 0.5) * (1.0 - smoothstep(0.3, 0.7, hW * 3.0));
      hS = clamp(0.5 + (hS - 0.5) * 1.25, 0.0, 1.0);
      diffuseColor.rgb *= mix(vec3(1.0), mix(0.58, 1.12, hS) * vec3(0.8, 0.84, 0.96), hMask);   // and a cooler, near-black brown
      ${shell ? `// the shell seen edge on: strand-shaped gaps, so the outline reads as hair tips
      float hFace = abs(dot(normalize(vNormal), normalize(vViewPosition)));
      if (hFace < 0.42 * hS - 0.04) discard;
      // its inside (seen through the open edges behind the ears and at the nape) is the shadowed underside of the hair
      if (!gl_FrontFacing) diffuseColor.rgb *= 0.4;` : `// hair lying flat on the scalp is shaded by the hair over it
      diffuseColor.rgb *= mix(1.0, 0.6, hMask);`}`)
    .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = clamp(roughnessFactor * mix(1.0, mix(1.15, 0.8, hS), hMask), 0.0, 1.0);`)
    .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
      #if NUM_DIR_LIGHTS > 0
      {
        vec3 hV = normalize(vViewPosition), hL = directionalLights[0].direction, hH = normalize(hL + hV);
        vec3 hTs = normalize(vHairT + normal * (hS - 0.5) * 0.35);      // a jittered shift per strand
        float tdh = dot(hTs, hH);
        float kk = pow(sqrt(max(0.0, 1.0 - tdh * tdh)), 90.0) * smoothstep(0.0, 0.3, dot(normal, hL));
        reflectedLight.directSpecular += directionalLights[0].color * kk * 0.22 * (0.4 + 0.9 * hS) * diffuseColor.rgb * 3.0 * hMask;
      }
      #endif`);
}

// Short hair with depth where the kept hair shell does not reach (behind the ears, the nape, under the fringe):
// shell fur. The scalp triangles of the new head (dark in its colour map) are copied in `layers` thin layers,
// each lifted off the skin and combed down along the hair's fall; a fragment survives on a layer only inside a
// strand that is long enough to reach it, and strands taper towards their tips. Painted, this hair read as a
// flat black stain on the skin.
function furShells(geo, srcMat, U, onScalp, layers = 12) {
  const texel = texelReader(srcMat), uv = geo.attributes.uv, pos = geo.attributes.position, nrm = geo.attributes.normal;
  if (!texel || !uv || !nrm || !geo.index) return null;
  const cm = U.uPerCm.value;                         // mesh units per centimetre
  const hair = new Float32Array(pos.count);
  for (let v = 0; v < pos.count; v++) {
    const [r, g, b] = texel(uv.getX(v), uv.getY(v)), l = 0.3 * r + 0.55 * g + 0.15 * b;   // sRGB, as painted
    hair[v] = onScalp(pos.getX(v), pos.getY(v), pos.getZ(v)) ? 1 - THREE.MathUtils.smoothstep(l, 0.27, 0.34) : 0;
  }
  const ix = geo.index.array, tris = [];
  for (let t = 0; t < ix.length; t += 3) if (hair[ix[t]] + hair[ix[t + 1]] + hair[ix[t + 2]] > 0.05) tris.push(ix[t], ix[t + 1], ix[t + 2]);
  if (!tris.length) return null;
  const used = [...new Set(tris)], at = new Map(used.map((v, i) => [v, i])), n = used.length;
  const P = new Float32Array(n * layers * 3), N = new Float32Array(n * layers * 3), L = new Float32Array(n * layers * 2), UV = new Float32Array(n * layers * 2);
  const SI = new Uint16Array(n * layers * 4), SW = new Float32Array(n * layers * 4), I = [];
  const p = new THREE.Vector3(), q = new THREE.Vector3(), t = new THREE.Vector3(), down = U.uDown.value, crown = U.uCrown.value;
  const lift = 0.32 * cm, comb = 0.75 * cm;          // a short cut: 3 mm thick, lying flat, combed about 7 mm
  for (let k = 0; k < layers; k++) {
    const f = (k + 1) / layers;
    used.forEach((v, i) => {
      p.fromBufferAttribute(pos, v); q.fromBufferAttribute(nrm, v).normalize();
      // the fall: away from the crown and down, along the skin
      t.copy(p).sub(crown).addScaledVector(down, 0.6 * p.distanceTo(crown)); t.addScaledVector(q, -t.dot(q)).normalize();
      p.addScaledVector(q, lift * f * (1.15 - 0.4 * f)).addScaledVector(t, comb * f * f);
      const o = (k * n + i);
      P.set([p.x, p.y, p.z], o * 3); N.set([q.x, q.y, q.z], o * 3); L.set([f, hair[v] > 0 ? 1 : 0], o * 2); UV.set([uv.getX(v), uv.getY(v)], o * 2);
      for (let c = 0; c < 4; c++) { SI[o * 4 + c] = geo.attributes.skinIndex.getComponent(v, c); SW[o * 4 + c] = geo.attributes.skinWeight.getComponent(v, c); }
    });
    for (const v of tris) I.push(k * n + at.get(v));
  }
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.BufferAttribute(P, 3));
  fg.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  fg.setAttribute('fur', new THREE.BufferAttribute(L, 2));
  fg.setAttribute('uv', new THREE.BufferAttribute(UV, 2));
  fg.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4));
  fg.setAttribute('skinWeight', new THREE.Float32BufferAttribute(SW, 4));
  fg.setIndex(I);
  const m = new THREE.MeshPhysicalMaterial({ name: 'scalp-fur', map: srcMat.map, color: new THREE.Color(0.055, 0.04, 0.034), roughness: 0.7,
    metalness: 0, specularIntensity: 0.2, envMapIntensity: 0.25, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    strandPatch(sh, U, '', false);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 fur; varying vec2 vFur;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFur = fur;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vFur;')
      .replace('float hMask = 1.0;', `float hMask = 1.0;
        {
          // where hair grows, per pixel from the head's painted scalp (per vertex, the hairline followed the
          // triangles in steps); then the hair's own colour, not the map's
          float fm = vFur.y * (1.0 - smoothstep(0.06, 0.09, dot(sampledDiffuseColor.rgb, vec3(0.3, 0.55, 0.15))));
          diffuseColor.rgb = diffuse;
          // fine clumps: about 1 per mm round the head; each its own length (shorter towards the hairline)
          vec2 fUV = vec2(atan(dot(vHairD, cross(uDown, uFront)), dot(vHairD, uFront)) / 6.2831853 + 0.5, length(vHairD));
          float fx = fUV.x * 900.0 + 2.0 * sin(fUV.y * 1.3), cell = floor(fx), fw = fwidth(fx);
          float len = (0.35 + 0.65 * hHash(mod(cell, 900.0) * 1.37 + 3.1)) * fm;
          if (vFur.x > len) discard;
          // a tapering strand (once strands are finer than a pixel, the layers' lengths alone thin it out)
          float w = mix(0.95, 0.3, vFur.x / max(len, 1e-3));
          w = mix(w, 1.0, smoothstep(0.5, 1.0, fw));
          if (abs(fract(fx) - 0.5) > 0.5 * w) discard;
          diffuseColor.rgb *= mix(0.35, 1.25, vFur.x) * (0.75 + 0.5 * hHash(mod(cell, 900.0) * 7.7));   // dark at the roots
        }`);
  };
  m.customProgramCacheKey = () => 'scalp-fur';
  return new THREE.SkinnedMesh(fg, m);
}

// `skinCut` (sRGB luminance): pixels of the shell lighter than this and skin-red are the old head's painted skin
// (a brown-haired head's locks run across it in its texture): they are cut away per pixel, so the locks keep
// their painted outline rather than the triangles' straight edges.
function strandHair(src, nose, bodyWorld, skinCut = 0) {
  const m = new THREE.MeshPhysicalMaterial({
    name: 'kept-hair', map: src.map, normalMap: src.normalMap || null, roughness: 0.72, metalness: 0,
    specularIntensity: 0.25, envMapIntensity: 0.35, side: THREE.DoubleSide, alphaTest: 0.5,
  });
  const U = hairFrame(nose, bodyWorld);
  const cut = skinCut ? `{ vec3 sc = sampledDiffuseColor.rgb; float sl = dot(sc, vec3(0.3, 0.55, 0.15));
      if (sl > ${Math.pow(skinCut, 2.2).toFixed(4)} && sc.r > sc.g * 1.12) discard; }` : '';
  m.onBeforeCompile = (sh) => strandPatch(sh, U, cut, true);
  m.customProgramCacheKey = () => 'kept-hair-strands' + skinCut;
  return m;
}

// A generated hair volume (build_hero.py's hair shell, for a cut the old body did not have): the same strand
// shading as kept hair, in the sheet's colour, darker towards the roots, and its lower edge (uv.y near 1)
// broken into strands of uneven length, so a bob ends in hair tips rather than a rim.
function hairShellMaterial(color, U) {
  const m = new THREE.MeshPhysicalMaterial({ name: 'hair-shell', color, roughness: 0.62, metalness: 0,
    specularIntensity: 0.3, envMapIntensity: 0.35, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vHairV;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHairV = uv.y; vHairE = uv.x;')
      .replace('varying float vHairV;', 'varying float vHairV; varying float vHairE;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vHairV; varying float vHairE;');
    strandPatch(sh, U, '', true);
    sh.fragmentShader = sh.fragmentShader.replace('float hMask = 1.0;', `float hMask = 1.0;
      {
        vec2 tUV = vec2(atan(dot(vHairD, cross(uDown, uFront)), dot(vHairD, uFront)) / 6.2831853 + 0.5, 0.0);
        float tc = floor(tUV.x * 1400.0);
        float tipAt = 0.88 + 0.12 * hHash(mod(tc, 1400.0) * 3.3 + 1.7) - 0.04 * hHash(mod(floor(tUV.x * 90.0), 90.0) + 9.1);
        if (vHairV > tipAt) discard;
        // the open edges (uv.x 1 there) thin out into separate strands
        if (vHairE > 0.2 + 0.75 * hHash(mod(tc, 1400.0) * 7.1 + 0.3)) discard;
        diffuseColor.rgb *= mix(0.55, 1.0, smoothstep(0.0, 0.35, vHairV));   // the roots are darker
      }`);
  };
  m.customProgramCacheKey = () => 'hair-shell';
  return m;
}

// Hair cards (build_hero.py's shell_cards): see-through strips carrying fine strands, over the dark hair shell.
// Cut out with alpha to coverage (soft strand edges without sorting), lit along the strands like the shell, with
// a little of its strand variation on top of the texture's own.
function hairCardMaterial(map, U) {
  const m = new THREE.MeshPhysicalMaterial({ name: 'hair-cards', map, alphaTest: 0.45, alphaToCoverage: true, side: THREE.DoubleSide,
    roughness: 0.55, metalness: 0, specularIntensity: 0.25, envMapIntensity: 0.3 });
  m.onBeforeCompile = (sh) => strandPatch(sh, U, 'hMask = 0.45;', false);
  m.customProgramCacheKey = () => 'hair-cards';
  return m;
}

// The Hunyuan-generated bodies (Ji Bai, Gu Nian) have smeared, washed-out faces: the texture detail is spread over
// thousands of UV islands (docs/research-hero-characters.md; one bad eye can be mended: tools/characters/repair_eyes.py). A close-up head built with
// tools/characters/build_hero.py takes the old head's place: the old head's triangles (skinned mostly to the head
// and neck bones) are dropped, and every part of the new head (skin with its face shapes, eyes, brows, lashes, hair
// cards) becomes a SkinnedMesh on the same skeleton, placed so its nose tip is where the old one was. Below the jaw
// the skin blends from the head bone to the neck bone so the throat bends with the neck. Returns the new meshes.
// read a material's colour map on the CPU: (u, v) -> [r, g, b] in 0..1 (sRGB, as painted)
function texelReader(material, max = 512) {
  const map = (Array.isArray(material) ? material[0] : material)?.map, img = map?.image;
  if (!img || typeof document === 'undefined') return null;
  const w = Math.min(max, img.width), h = Math.min(max, img.height);
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
    // (and saturated as skin is: a cream blouse is as warm and as light, but nearly white)
    const w = THREE.MathUtils.smoothstep(r - b, 0.04, 0.1) * THREE.MathUtils.smoothstep(l, 0.38, 0.5) * (r >= g ? 1 : 0)
      * THREE.MathUtils.smoothstep((r - b) / Math.max(r, 0.01), 0.12, 0.2);
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

// The Hunyuan bodies were rigged per vertex, and the copies of a vertex on either side of a UV seam got different
// skin weights: posed, the seam opens into a crack you see the background through (the dotted lines down his
// arms, the "scratch" across his left wrist). Every copy of a position gets the same weights, merged.
function weldSkin(g, id) {
  const si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
  if (!si || !sw) return 0;
  const groups = new Map();
  for (let v = 0; v < id.length; v++) (groups.get(id[v]) || groups.set(id[v], []).get(id[v])).push(v);
  let n = 0;
  for (const vs of groups.values()) {
    if (vs.length < 2) continue;
    const acc = new Map();
    for (const v of vs) for (let k = 0; k < 4; k++) { const w = sw.getComponent(v, k); if (w > 0) acc.set(si.getComponent(v, k), (acc.get(si.getComponent(v, k)) || 0) + w); }
    const top = [...acc].sort((a, b) => b[1] - a[1]).slice(0, 4), sum = top.reduce((t, [, w]) => t + w, 0) || 1;
    for (const v of vs) for (let k = 0; k < 4; k++) { si.setComponent(v, k, top[k] ? top[k][0] : 0); sw.setComponent(v, k, top[k] ? top[k][1] / sum : 0); }
    n += vs.length;
  }
  si.needsUpdate = sw.needsUpdate = true;
  return n;
}

// Hunyuan bakes leave shards: small triangles whose UVs fall across an island's edge onto other texels (skin, the
// white shirt), so light slivers dot the dark trousers and jacket. A triangle lighter than edge neighbours that
// are dark and agree with each other takes its own copy of its corners with the UV of the most typical neighbour:
// it is drawn the colour of the cloth around it. Borders between two real colours survive, because there the
// neighbours disagree.
export function cleanSpecks(root, { diff = 0.04, agree = 0.04, share = 2 / 3, passes = 6 } = {}) {
  let body = null;
  root.traverse((o) => { if (o.isSkinnedMesh && (!body || o.geometry.attributes.position.count > body.geometry.attributes.position.count)) body = o; });
  if (!body || !body.geometry.index) return 0;
  const texel = texelReader(body.material, 2048);
  if (!texel) return 0;
  const g = body.geometry, pos = g.attributes.position, uv = g.attributes.uv, ix = Array.from(g.index.array), T = ix.length / 3;
  // weld by position, so neighbours across UV seams count
  const id = new Int32Array(pos.count), seen = new Map();
  for (let v = 0; v < pos.count; v++) {
    const k = `${Math.round(pos.getX(v) * 1e3)},${Math.round(pos.getY(v) * 1e3)},${Math.round(pos.getZ(v) * 1e3)}`;
    if (!seen.has(k)) seen.set(k, seen.size); id[v] = seen.get(k);
  }
  weldSkin(g, id);
  const edges = new Map(), col = new Float32Array(T * 3), cuv = new Float32Array(T * 2);
  const B = [[1 / 3, 1 / 3], [0.6, 0.2], [0.2, 0.6], [0.2, 0.2], [0.45, 0.45], [0.45, 0.1], [0.1, 0.45]];
  for (let t = 0; t < T; t++) {
    const a = ix[t * 3], b = ix[t * 3 + 1], c = ix[t * 3 + 2];
    for (const [w0, w1] of B) {
      const w2 = 1 - w0 - w1, u = uv.getX(a) * w0 + uv.getX(b) * w1 + uv.getX(c) * w2, v = uv.getY(a) * w0 + uv.getY(b) * w1 + uv.getY(c) * w2;
      const px = texel(u, v); for (let j = 0; j < 3; j++) col[t * 3 + j] += px[j] / B.length;
    }
    cuv[t * 2] = (uv.getX(a) + uv.getX(b) + uv.getX(c)) / 3; cuv[t * 2 + 1] = (uv.getY(a) + uv.getY(b) + uv.getY(c)) / 3;
    for (const [p, q] of [[a, b], [b, c], [c, a]]) {
      const k = Math.min(id[p], id[q]) * 4194304 + Math.max(id[p], id[q]);
      (edges.get(k) || edges.set(k, []).get(k)).push(t);
    }
  }
  const nb = Array.from({ length: T }, () => []);
  for (const list of edges.values()) for (const t of list) for (const u of list) if (t !== u && !nb[t].includes(u)) nb[t].push(u);
  const dist = (t, r) => Math.max(Math.abs(col[t * 3] - r[0]), Math.abs(col[t * 3 + 1] - r[1]), Math.abs(col[t * 3 + 2] - r[2]));
  const med = (xs) => { xs.sort((p, q) => p - q); return xs[xs.length >> 1]; };
  const fix = new Map();
  for (let pass = 0; pass < passes; pass++) {
    for (let t = 0; t < T; t++) {
      const n = nb[t]; if (fix.has(t) || n.length < 2) continue;
      const ref = [0, 1, 2].map((j) => med(n.map((u) => col[u * 3 + j])));
      if (dist(t, ref) < diff) continue;
      // only light shards on dark cloth: a light trim one triangle wide (the jacket's hem) must stay
      const L = (r, g, b) => 0.3 * r + 0.55 * g + 0.15 * b;
      if (L(...ref) > 0.25 || L(col[t * 3], col[t * 3 + 1], col[t * 3 + 2]) < L(...ref) + diff) continue;
      const near = n.filter((u) => dist(u, ref) < agree);
      if (near.length < n.length * share) continue;
      const d = near.reduce((best, u) => (dist(u, ref) < dist(best, ref) ? u : best));
      fix.set(t, fix.has(d) ? fix.get(d) : d);
      for (let j = 0; j < 3; j++) col[t * 3 + j] = col[d * 3 + j];
    }
  }
  if (!fix.size) return 0;
  // new corners for the fixed triangles (every attribute copied, the UV collapsed to the dark neighbour's middle)
  const n0 = pos.count, add = fix.size * 3, ng = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(g.attributes)) {
    // (read through the attribute: glTF attributes can be interleaved or sit in a larger buffer)
    const S = attr.itemSize, arr = new (attr.isInterleavedBufferAttribute ? attr.data.array : attr.array).constructor((n0 + add) * S);
    const src = attr.isInterleavedBufferAttribute ? attr.data.array : attr.array, st = attr.isInterleavedBufferAttribute ? attr.data.stride : S, off = attr.offset || 0;
    for (let v = 0; v < n0; v++) for (let c = 0; c < S; c++) arr[v * S + c] = src[v * st + off + c];   // raw, not denormalized
    let k = n0;
    for (const t of fix.keys()) for (let j = 0; j < 3; j++, k++) for (let c = 0; c < S; c++) arr[k * S + c] = arr[ix[t * 3 + j] * S + c];
    ng.setAttribute(name, new THREE.BufferAttribute(arr, attr.itemSize, attr.normalized));
  }
  let k = n0;
  const nuv = ng.attributes.uv;
  for (const [t, d] of fix) for (let j = 0; j < 3; j++, k++) { nuv.setXY(k, cuv[d * 2], cuv[d * 2 + 1]); ix[t * 3 + j] = k; }
  ng.setIndex(ix); ng.groups = g.groups.map((x) => ({ ...x }));
  ng.boundingBox = g.boundingBox; ng.boundingSphere = g.boundingSphere;
  body.geometry = ng;
  return fix.size;
}

// Hang the arms a little further from the body (rad, + = out), laid over whatever pose the mixer just set: the
// Hunyuan bodies wear wider trousers than the Rocketbox bodies the clips were made for, and the hands of the idle
// pose sank into them (skin showing through the cloth as light specks on the thighs). The avatars face +z, so the
// left arm swings out about +z and the right about -z.
const _sa = new THREE.Vector3(), _sq = new THREE.Quaternion(), _sr = new THREE.Quaternion();
export function spreadArms(root, rad) {
  if (!rad) return;
  for (const s of ['L', 'R']) {
    const b = root.getObjectByName(`Bip01_${s}_UpperArm`);
    if (!b) continue;
    root.getWorldQuaternion(_sq); _sa.set(0, 0, 1).applyQuaternion(_sq);
    b.parent.getWorldQuaternion(_sq).invert(); _sa.applyQuaternion(_sq);
    b.quaternion.premultiply(_sr.setFromAxisAngle(_sa, s === 'L' ? rad : -rad));
  }
}

// Reaching (two-bone IK on the arm, laid over whatever clip is playing): the hand goes to a point in the world,
// the elbow bending in the plane the clip already has it in (or down and out, if the arm is straight), the
// upper arm then swung so shoulder-to-hand points at the target. w blends it in and out (0..1).
// The forearm's length is shoulder..elbow..wrist from the pose itself, so it fits any body.
const _ik = { s: new THREE.Vector3(), e: new THREE.Vector3(), h: new THREE.Vector3(), t: new THREE.Vector3(), a: new THREE.Vector3(), b: new THREE.Vector3(), n: new THREE.Vector3(),
  q: new THREE.Quaternion(), pq: new THREE.Quaternion(), wq: new THREE.Quaternion(), keep: new THREE.Quaternion(), keep2: new THREE.Quaternion() };
function rotateBoneWorld(bone, qWorld) {   // bone's world rotation premultiplied by qWorld, as a local rotation
  bone.getWorldQuaternion(_ik.wq); _ik.wq.premultiply(qWorld);
  bone.parent.getWorldQuaternion(_ik.pq).invert(); bone.quaternion.copy(_ik.pq.multiply(_ik.wq)); bone.updateMatrixWorld(true);
}
export function reachArm(root, side, target, w, pole = null) {
  if (!target || w <= 0.001) return;
  const up = root.getObjectByName(`Bip01_${side}_UpperArm`), fo = root.getObjectByName(`Bip01_${side}_Forearm`), ha = root.getObjectByName(`Bip01_${side}_Hand`);
  if (!up || !fo || !ha) return;
  const { s, e, h, t, a, b, n, q } = _ik;
  _ik.keep.copy(up.quaternion); _ik.keep2.copy(fo.quaternion);
  up.getWorldPosition(s); fo.getWorldPosition(e); ha.getWorldPosition(h); t.copy(target);
  const l1 = s.distanceTo(e), l2 = e.distanceTo(h), d = THREE.MathUtils.clamp(s.distanceTo(t), Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3);
  // 1. the elbow: bend it to the angle that puts the hand d from the shoulder
  a.subVectors(s, e).normalize(); b.subVectors(h, e).normalize();
  n.crossVectors(a, b);
  if (n.lengthSq() < 1e-6) { n.copy(pole || new THREE.Vector3(0, -1, 0)).cross(a); }
  n.normalize();
  const cur = Math.acos(THREE.MathUtils.clamp(a.dot(b), -1, 1)), want = Math.acos(THREE.MathUtils.clamp((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1));
  rotateBoneWorld(fo, q.setFromAxisAngle(n, want - cur));
  // 2. the upper arm: shoulder-to-hand onto shoulder-to-target
  ha.getWorldPosition(h);
  a.subVectors(h, s).normalize(); b.subVectors(t, s).normalize();
  rotateBoneWorld(up, q.setFromUnitVectors(a, b));
  // 3. the elbow's swing about that line: toward the pole (down and out by default) if one is given
  if (pole) {
    fo.getWorldPosition(e); const ax = b, el = a.subVectors(e, s), proj = el.sub(ax.clone().multiplyScalar(el.dot(ax))), pl = pole.clone().sub(ax.clone().multiplyScalar(pole.dot(ax)));
    if (proj.lengthSq() > 1e-6 && pl.lengthSq() > 1e-6) { proj.normalize(); pl.normalize(); let ang = Math.acos(THREE.MathUtils.clamp(proj.dot(pl), -1, 1)); if (n.crossVectors(proj, pl).dot(ax) < 0) ang = -ang; rotateBoneWorld(up, q.setFromAxisAngle(ax, ang)); }
  }
  if (w < 0.999) { up.quaternion.copy(_ik.keep.slerp(up.quaternion, w)); fo.quaternion.copy(_ik.keep2.slerp(fo.quaternion, w)); up.updateMatrixWorld(true); }
}

export function swapHead(avatar, headScene, { drop = ['Bip01_Head'], tint = null, keepHair = false, tone = null, hairLum = 0.42, conform = true, dropHair = false } = {}) {
  avatar.updateMatrixWorld(true);
  let body = null;
  avatar.traverse((o) => { if (o.isSkinnedMesh && (!body || o.geometry.attributes.position.count > body.geometry.attributes.position.count)) body = o; });
  if (!body) return [];
  const bones = body.skeleton.bones, bi = (n) => bones.findIndex((b) => b.name === n);
  const iHead = bi('Bip01_Head'), iNeck = bi('Bip01_Neck'), iSpine = Math.max(bi('Bip01_Spine2'), bi('Bip01_Spine1'));
  if (iHead < 0 || iNeck < 0) return [];
  // the dropped bones and everything under them (Rocketbox heads carry jaw, eye, brow and ponytail bones)
  const dropIdx = new Set();
  const under = (b) => { const i = bones.indexOf(b); if (i >= 0) dropIdx.add(i); for (const c of b.children) if (c.isBone) under(c); };
  for (const n of drop) { const i = bi(n); if (i >= 0) under(bones[i]); }
  // a body split into several primitives (Rocketbox: one per material, the face among them): the others lose
  // their head triangles too (only the largest is the body worked on below)
  if (!keepHair) avatar.traverse((o) => {
    if (!o.isSkinnedMesh || o === body || o.skeleton.bones[0] !== body.skeleton.bones[0] || !o.geometry.index) return;
    const og = o.geometry, osi = og.attributes.skinIndex, osw = og.attributes.skinWeight, oi = og.index.array, kept = [];
    const sh = (v) => { let t = 0; for (let k = 0; k < 4; k++) if (dropIdx.has(osi.getComponent(v, k))) t += osw.getComponent(v, k); return t; };
    for (let t = 0; t < oi.length; t += 3) if (!(sh(oi[t]) > 0.5 && sh(oi[t + 1]) > 0.5 && sh(oi[t + 2]) > 0.5)) kept.push(oi[t], oi[t + 1], oi[t + 2]);
    const ng2 = og.clone(); ng2.setIndex(kept); o.geometry = ng2;
  });
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
  // (an unconformed head reads the old neck too: its shape and colour, where the new neck's end blends into it)
  const neckTex = texel || (!conform ? texelReader(body.material) : null);
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
    return 0.3 * r + 0.55 * gg + 0.15 * bb < hairLum && !(r > gg * 1.25 && r > 0.3);   // dark, and not lip or shadowed skin red
    // (hairLum: a brown-haired head's lit locks are lighter than a black-haired one's)
  };
  const darkHair = (a, b, c) => {   // the hair itself, not a collar kept with it
    const [r, gg, bb] = texel((uv.getX(a) + uv.getX(b) + uv.getX(c)) / 3, (uv.getY(a) + uv.getY(b) + uv.getY(c)) / 3);
    return 0.3 * r + 0.55 * gg + 0.15 * bb < hairLum;
  };
  const skinSum = [0, 0, 0, 0], neckProfile = new Map();
  const ix = g.index.array, keep = [], hairTris = [];
  // not conformed, the new neck keeps its own length: the old neck skin below its end (and 1.5 cm into it) stays
  const neckEnd = conform ? -Infinity : nose.y + (baseY - newNose.y) * 100 * s + 1.5;
  const belowNewNeck = (a, b, c) => P[0].fromBufferAttribute(pos, a).add(P[1].fromBufferAttribute(pos, b)).add(P[2].fromBufferAttribute(pos, c)).divideScalar(3).applyMatrix4(body.matrixWorld).y < neckEnd;
  for (let t = 0; t < ix.length; t += 3) {
    const a = ix[t], b = ix[t + 1], c = ix[t + 2];
    const dropIt = !belowNewNeck(a, b, c) && ((share(a) > 0.5 && share(b) > 0.5 && share(c) > 0.5)
      // keepHair: the skin of the nape too (neck-weighted, it hides behind the old head but not behind the new one)
      || (texel && neckShare(a) > 0.5 && neckShare(b) > 0.5 && neckShare(c) > 0.5
        && P[0].fromBufferAttribute(pos, a).add(P[1].fromBufferAttribute(pos, b)).add(P[2].fromBufferAttribute(pos, c)).divideScalar(3).applyMatrix4(body.matrixWorld).y > nose.y - 12));
    if (dropIt && !isHair(a, b, c)) {
      if (neckTex) for (const q of [a, b, c]) {   // the old neck's shape, which the new neck takes on
        const w = P[0].fromBufferAttribute(pos, q).applyMatrix4(body.matrixWorld);
        if (w.y > oldChin + 0.5) continue;
        const k = Math.floor(w.y * 2), e = neckProfile.get(k) || { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity };
        e.x0 = Math.min(e.x0, w.x); e.x1 = Math.max(e.x1, w.x); e.z0 = Math.min(e.z0, w.z); e.z1 = Math.max(e.z1, w.z); neckProfile.set(k, e);
      }
      if (neckTex) {
        const col = neckTex(uv.getX(a), uv.getY(a));
        // (a Hunyuan head going whole, hair and all: its skin only, or the dark hair in the mean brightens the body's skin to white)
        const sk = !dropHair || (col[0] >= col[1] && col[1] >= col[2] && col[0] - col[2] > 0.06 && 0.3 * col[0] + 0.55 * col[1] + 0.15 * col[2] > 0.35 && (col[0] - col[2]) / col[0] > 0.15);
        if (sk) { skinSum[0] += col[0]; skinSum[1] += col[1]; skinSum[2] += col[2]; skinSum[3]++; }
      }
      continue;
    }
    if (dropIt && texel && darkHair(a, b, c)) hairTris.push(a, b, c); else keep.push(a, b, c);
  }
  // dropHair (a Hunyuan body under a new head with its own long hair): the old hair below the head goes too (the
  // locks down the back and over the shoulders: dark texels, above the hips, not the face). The holes it leaves in
  // the jacket are under the new hair's dark sheets (build_hero hair_sheets); `underHair` keeps it instead as a
  // matte dark layer (its sculpted locks are spiky past the new hair's edges, so not by default)
  const underHair = [];
  if (dropHair && neckTex && uv) {
    const k2 = [];
    for (let t = 0; t < keep.length; t += 3) {
      const a = keep[t], b = keep[t + 1], c = keep[t + 2];
      const cen = P[0].fromBufferAttribute(pos, a).add(P[1].fromBufferAttribute(pos, b)).add(P[2].fromBufferAttribute(pos, c)).divideScalar(3).applyMatrix4(body.matrixWorld);
      let dark = false;
      if (cen.y > nose.y - 75 && !inFace(cen)) {
        const [r, gg, bb] = neckTex((uv.getX(a) + uv.getX(b) + uv.getX(c)) / 3, (uv.getY(a) + uv.getY(b) + uv.getY(c)) / 3);
        dark = 0.3 * r + 0.55 * gg + 0.15 * bb < hairLum && !(r > gg * 1.25 && r > 0.3);
      }
      if (!dark) k2.push(a, b, c); else underHair.push(a, b, c);
    }
    keep.length = 0; keep.push(...k2);
  }
  const ng = g.clone(); ng.setIndex(keep); body.geometry = ng;
  // keepHair: the kept hair becomes its own mesh with a strand material (on the body's map it was one glossy,
  // rubbery shell)
  if (hairTris.length) {
    const hm = new THREE.SkinnedMesh(compact(g, hairTris), strandHair(body.material, nose, body.matrixWorld, hairLum > 0.42 ? hairLum - 0.06 : 0));
    hm.name = 'kept-hair'; hm.castShadow = true; hm.frustumCulled = false;
    body.parent.add(hm);
    hm.position.copy(body.position); hm.quaternion.copy(body.quaternion); hm.scale.copy(body.scale);
    hm.bind(body.skeleton, body.bindMatrix);
  }
  if (globalThis.__fit) console.log('FIT ' + JSON.stringify({ nose: nose.toArray(), newNose: newNose.toArray(), s, sx, sz }));   // (build_hero sheet game_fit)
  const toWorld = new THREE.Matrix4().makeTranslation(nose.x, nose.y, nose.z)
    .multiply(new THREE.Matrix4().makeScale(100 * s * sx, 100 * s, 100 * s * sz))
    .multiply(new THREE.Matrix4().makeTranslation(-newNose.x, -newNose.y, -newNose.z));
  const toBody = new THREE.Matrix4().copy(body.matrixWorld).invert().multiply(toWorld);
  if (underHair.length) {
    // (under the new locks: where they lie, the sheet lies just beneath them)
    const cover = [], w = new THREE.Vector3();
    headScene.traverse((o) => {
      if (!o.isMesh || !/hair-cards/.test(o.name)) return;
      const p = o.geometry.attributes.position;
      for (let v = 0; v < p.count; v += 2) cover.push(w.fromBufferAttribute(p, v).applyMatrix4(o.matrixWorld).applyMatrix4(toWorld).clone());
    });
    const ug = underHairSheet(compact(g, underHair), body.matrixWorld, nose, 1.5, cover);
    const um = new THREE.SkinnedMesh(ug, new THREE.MeshStandardMaterial({ name: 'under-hair', color: 0x0a0705, roughness: 1, metalness: 0, envMapIntensity: 0.3, side: THREE.DoubleSide }));
    um.name = 'under-hair'; um.castShadow = true; um.frustumCulled = false;
    body.parent.add(um);
    um.position.copy(body.position); um.quaternion.copy(body.quaternion); um.scale.copy(body.scale);
    um.bind(body.skeleton, body.bindMatrix);
  }
  // match the new skin to the old body's skin (the face's average colour against the new map's)
  let autoTint = null;
  // (or to a tone measured from the character's portrait: sRGB 0-255, the lit cheek)
  if ((tone || (neckTex && skinSum[3] > 50)) && !tint) {
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
  // Rocketbox bodies (unconformed): the old neck's top edge, where the head's triangles were cut away, is ragged,
  // and under the ears, where the old jaw was wider, it stuck out past the new neck in shards. It is trimmed
  // along the new jaw's line (from 1 cm under the chin, rising to the ears), on whichever primitive holds it,
  // and the new neck then reaches down over what is left of it.
  let oldNeckTop = -Infinity;
  if (!keepHair && !conform) {
    const parts = [];
    avatar.traverse((o) => { if (o.isSkinnedMesh && o.skeleton.bones[0] === bones[0] && o.geometry.index) parts.push(o); });
    const w = new THREE.Vector3();
    for (const o of parts) {
      const op = o.geometry.attributes.position, ki = o.geometry.index.array, kept = [];
      for (let t = 0; t < ki.length; t += 3) {
        w.set(0, 0, 0);
        for (let k = 0; k < 3; k++) w.add(P[0].fromBufferAttribute(op, ki[t + k]));
        w.divideScalar(3).applyMatrix4(o.matrixWorld);
        const jaw = oldChin - 1 + 0.9 * Math.max(0, nose.z - 2 - w.z);
        if (!(w.y > jaw && w.y < oldChin + 4 && Math.abs(w.x - nose.x) < 9 && w.z > nose.z - 18)) kept.push(ki[t], ki[t + 1], ki[t + 2]);
      }
      if (kept.length < ki.length) { const ng3 = o.geometry.clone(); ng3.setIndex(kept); o.geometry = ng3; }
      // (the top of what is left, in front)
      const ki2 = o.geometry.index.array;
      for (let i = 0; i < ki2.length; i++) {
        w.fromBufferAttribute(op, ki2[i]).applyMatrix4(o.matrixWorld);
        if (Math.abs(w.x - nose.x) < 2 && w.z > nose.z - 9 && w.y < oldChin + 1 && w.y > oldNeckTop) oldNeckTop = w.y;
      }
    }
  }
  // the rest of the body's skin (hands, wrists) takes the same tone as the new face
  if (tone && neckTex && skinSum[3] > 50) retintBodySkin(body, [0, 1, 2].map((i) => skinSum[i] / skinSum[3]), tone.map((c) => c / 255));
  // the old neck's colour as it is now drawn (after the retint), just under where the new neck ends
  let oldNeckCol = null;
  if (neckTex && !conform) {
    // where the old neck skin left in place starts (its trimmed top on a Rocketbox body; else the new neck's end)
    const lowY = Number.isFinite(oldNeckTop) ? oldNeckTop - 0.5 : neckProfile.size > 2 ? Math.min(...neckProfile.keys()) / 2 : neckEnd - 1.5;
    // on whichever primitive holds it (Rocketbox bodies: not the largest one)
    const parts = [];
    avatar.traverse((o) => { if (o.isSkinnedMesh && o.skeleton.bones[0] === bones[0] && o.geometry.index && o.geometry.attributes.uv) parts.push(o); });
    const sampleNeck = () => {
      const sum = [0, 0, 0, 0], w = new THREE.Vector3();
      for (const o of parts) {
        const t2 = texelReader(o.material); if (!t2) continue;
        const op = o.geometry.attributes.position, ou = o.geometry.attributes.uv, ki = o.geometry.index.array;
        for (let i = 0; i < ki.length; i++) {
          w.fromBufferAttribute(op, ki[i]).applyMatrix4(o.matrixWorld);
          if (w.y > lowY || w.y < lowY - 3 || Math.abs(w.x - nose.x) > 4 || w.z < nose.z - 9) continue;
          const c = t2(ou.getX(ki[i]), ou.getY(ki[i]));
          // skin only (not a brown leather collar: skin is lighter, and warm without being saturated)
          const sat = (c[0] - c[2]) / Math.max(c[0], 0.01);
          // (and on a Hunyuan body not an ivory or cream collar, which is as warm as skin but paler: less saturated)
          if (c[0] - c[2] < 0.06 || !(c[0] >= c[1] && c[1] >= c[2]) || 0.3 * c[0] + 0.55 * c[1] + 0.15 * c[2] < 0.38 || sat > 0.5 || (dropHair && sat < 0.2)) continue;
          sum[0] += c[0]; sum[1] += c[1]; sum[2] += c[2]; sum[3]++;
        }
      }
      return sum[3] > 10 ? [sum[0] / sum[3], sum[1] / sum[3], sum[2] / sum[3]] : null;
    };
    let nc = sampleNeck();
    // a body whose old face was another primitive gave no skin sample to retint it by above: its neck gives one
    if (nc && tone && !(skinSum[3] > 50)) { for (const o of parts) retintBodySkin(o, nc, tone.map((c) => c / 255)); nc = sampleNeck(); }
    // (a little darker for the Hunyuan bodies, whose skin has its shading baked in; lighter for the Rocketbox ones,
    // whose old neck renders lighter than its map: matched by eye)
    if (nc) oldNeckCol = nc.map((c) => (keepHair ? 0.8 : dropHair ? 1.05 : 1.15) * Math.pow(c, 2.2));
  }
  let eyeY = null;
  headScene.traverse((o) => { if (o.isMesh && /^eye-[lr]$/.test(o.name)) eyeY = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()).y; });
  const made = [], hw = new THREE.Vector3();
  let fadeNeck = null;
  headScene.traverse((o) => {
    if (!o.isMesh || (keepHair && /^hair/i.test(o.material.name))) return;
    const geo = o.geometry.clone();
    if (!keepHair && !conform && o.morphTargetDictionary !== undefined && geo.index) {
      // a Rocketbox body, its old neck trimmed under the new jaw above: the new neck reaches down over what is left
      const p = geo.attributes.position, ix = geo.index.array, up = [], w = new THREE.Vector3();
      // (as far up as the old neck reaches under the jaw, with 1.5 cm of overlap)
      const cutY = cutYOf(newChin, newNose, oldNeckTop, nose, s);
      // where it overlaps the old neck it tapers in by 25 %, under the old neck's skin, so its cut edge (ragged,
      // flaring towards the shoulders) stays hidden inside it
      const topY = cutY - 0.05, ring = [];   // (no taper now: the old neck is brought to meet it instead)

      for (let v = 0; v < p.count; v++) { w.fromBufferAttribute(p, v).applyMatrix4(o.matrixWorld); if (Math.abs(w.y - topY) < 0.004) ring.push(w.x, w.z); }
      if (ring.length > 8) {
        let cx = 0, cz = 0; for (let i = 0; i < ring.length; i += 2) { cx += ring[i]; cz += ring[i + 1]; }
        cx /= ring.length / 2; cz /= ring.length / 2;
        let rad = 0; for (let i = 0; i < ring.length; i += 2) rad = Math.max(rad, Math.hypot(ring[i] - cx, ring[i + 1] - cz));
        const inv = new THREE.Matrix4().copy(o.matrixWorld).invert();
        for (let v = 0; v < p.count; v++) {
          w.fromBufferAttribute(p, v).applyMatrix4(o.matrixWorld);
          if (w.y >= topY + 0.01) continue;
          const k = 1 - 0.25 * THREE.MathUtils.smoothstep(topY + 0.01 - w.y, 0, 0.02);
          const d = Math.hypot(w.x - cx, w.z - cz), nd = Math.min(d, rad) * k;
          if (d > 1e-6) { w.x = cx + (w.x - cx) * nd / d; w.z = cz + (w.z - cz) * nd / d; w.applyMatrix4(inv); p.setXYZ(v, w.x, w.y, w.z); }
        }
      }
      for (let t = 0; t < ix.length; t += 3) {
        let hi = -Infinity; for (let k = 0; k < 3; k++) hi = Math.max(hi, w.fromBufferAttribute(p, ix[t + k]).applyMatrix4(o.matrixWorld).y);
        if (hi > cutY) up.push(ix[t], ix[t + 1], ix[t + 2]);
      }
      geo.setIndex(up);
      // (and the triangles across the line are cut per pixel, level, not along their ragged edges: see skinToned)
      const nc = new Float32Array(p.count);
      for (let v = 0; v < p.count; v++) nc[v] = w.fromBufferAttribute(p, v).applyMatrix4(o.matrixWorld).y - cutY;
      geo.setAttribute('neckcut', new THREE.BufferAttribute(nc, 1));
    }
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
    // (conform: false keeps the new neck as built, over the old neck left under its end: on a neck whose old
    // profile is ragged, an open collar, the stretch folded it into shards)
    if (keepHair && conform && o.morphTargetDictionary !== undefined && neckProfile.size > 2) conformNeck(geo.attributes.position, body.matrixWorld, neckProfile, oldChin);
    const n = geo.attributes.position.count, sIdx = new Uint16Array(n * 4), sWt = new Float32Array(n * 4);
    const isSkin = o.morphTargetDictionary !== undefined;
    const longHair = /hair/i.test(o.name + o.material.name) && iSpine >= 0;
    for (let v = 0; v < n; v++) {
      // skin below the jaw bends with the neck; everything else follows the head
      let h = 1;
      const y = hw.fromBufferAttribute(o.geometry.attributes.position, v).applyMatrix4(o.matrixWorld).y;
      if (isSkin) {
        h = THREE.MathUtils.clamp((y - baseY) / Math.max(0.01, chinY - baseY), 0, 1);
        h = h * h * (3 - 2 * h);
      }
      if (longHair && y < baseY + 0.02) {
        // long hair below the head: from the head to the neck down to the jaw's base, then to the upper back,
        // so it lies on the shoulders rather than swinging through them with every turn of the head
        const t = THREE.MathUtils.clamp((baseY + 0.02 - y) / 0.12, 0, 1);
        if (t < 0.5) { const a = t * 2; sIdx[v * 4] = iHead; sWt[v * 4] = 1 - a; sIdx[v * 4 + 1] = iNeck; sWt[v * 4 + 1] = a; }
        else { const a = (t - 0.5) * 2; sIdx[v * 4] = iNeck; sWt[v * 4] = 1 - a; sIdx[v * 4 + 1] = iSpine; sWt[v * 4 + 1] = a; }
        continue;
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
    if (/hair-cards/i.test(o.name + mat.name) && mat.map) {
      mat = hairCardMaterial(mat.map, hairFrame(nose, body.matrixWorld));
    } else if (/hair-shell/i.test(o.name + mat.name)) {
      mat = hairShellMaterial(mat.color.clone(), hairFrame(nose, body.matrixWorld));
    } else if (/hair|brow|lash/i.test(o.name + mat.name)) {
      // thin dark ribbons: with the default specular, their grazing edges catch the sky and read as white fuzz
      mat = new THREE.MeshPhysicalMaterial({ name: mat.name, color: mat.color, map: mat.map, alphaTest: 0.35, alphaToCoverage: true,
        side: THREE.DoubleSide, roughness: 0.9, metalness: 0, specularIntensity: 0.06, envMapIntensity: 0.15 });
    } else if (/cornea/i.test(o.name + mat.name)) {
      mat = new THREE.MeshPhysicalMaterial({ name: 'cornea', transmission: 0, transparent: true, opacity: 0.12, roughness: 0.02, specularIntensity: 1, depthWrite: false });
    } else if (/teeth/i.test(o.name)) {
      // the side teeth sit in the cheeks' shadow: lit evenly they glint white through the closed lips' corners
      const p = o.geometry.attributes.position, sh = new Float32Array(p.count * 3);
      let xm = 1e-6; for (let v = 0; v < p.count; v++) xm = Math.max(xm, Math.abs(p.getX(v)));
      for (let v = 0; v < p.count; v++) {
        const k = 1 - 0.9 * THREE.MathUtils.smoothstep(Math.abs(p.getX(v)) / xm, 0.1, 0.5);
        sh[v * 3] = sh[v * 3 + 1] = sh[v * 3 + 2] = k;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(sh, 3));
      // and with the default specular their grazing sides mirror the sky as a grey glint even with a dark colour
      mat = new THREE.MeshPhysicalMaterial({ name: mat.name, color: mat.color, vertexColors: true, roughness: 0.6, metalness: 0,
        specularIntensity: 0.15, envMapIntensity: 0.1 });
    } else if (isSkin && mat.map && (tint || autoTint)) {
      let neckCol = null;
      if (tone && !conform) {   // the old neck (unconformed heads): the colour the new neck's cut edge blends to
        neckCol = oldNeckCol || tone.map((c) => Math.pow(c / 255, 2.2));
        const nm = new Float32Array(n);
        // (a body with its whole old neck up to the jaw, Rocketbox: the new neck takes its colour up to under the chin)
        if (keepHair) for (let v = 0; v < n; v++) nm[v] = 1 - THREE.MathUtils.smoothstep(sWt[v * 4], 0.2, 0.9);
        else for (let v = 0; v < n; v++) {
          hw.fromBufferAttribute(o.geometry.attributes.position, v).applyMatrix4(o.matrixWorld);
          const jaw = newChin + 0.7 * THREE.MathUtils.clamp(newNose.z - 0.02 - hw.z, 0, 0.16);   // (rising to the ears and the nape)
          nm[v] = 1 - THREE.MathUtils.smoothstep(hw.y, jaw - 0.03, jaw);
        }
        geo.setAttribute('neckmix', new THREE.BufferAttribute(nm, 1));
        // (its colour there: the old neck's at the same place, filled in by shrinkOldNeck on a Rocketbox body)
        const rgb = new Float32Array(n * 3); for (let v = 0; v < n; v++) rgb.set(neckCol, v * 3);
        geo.setAttribute('neckrgb', new THREE.BufferAttribute(rgb, 3));
        if (!geo.attributes.neckcut) geo.setAttribute('neckcut', new THREE.BufferAttribute(new Float32Array(n).fill(1), 1));
      }
      if (neckCol && !keepHair && geo.index) {
        // the new neck's end, fading out over the old neck: its own see-through mesh, drawn after the opaque ones
        const ix = geo.index.array, nc = geo.attributes.neckcut, tris = [];
        geo.setAttribute('neckfade', new THREE.BufferAttribute(new Float32Array(n).fill(1), 1));   // (0: no old skin under it, stays solid: shrinkOldNeck)
        for (let t = 0; t < ix.length; t += 3) if (Math.min(nc.getX(ix[t]), nc.getX(ix[t + 1]), nc.getX(ix[t + 2])) < NECK_FADE) tris.push(ix[t], ix[t + 1], ix[t + 2]);
        if (tris.length) {
          // (sharing the head's vertices, so the colours filled in later by shrinkOldNeck are its too)
          const fg = new THREE.BufferGeometry();
          for (const [name, at] of Object.entries(geo.attributes)) fg.setAttribute(name, at);
          fg.setIndex(tris);
          fadeNeck = [fg, skinToned(mat, tint || autoTint, null, neckCol, true)];
        }
      }
      mat = skinToned(mat, tint || autoTint, keepHair ? hairFrame(nose, body.matrixWorld) : null, neckCol);
    }   // (the tongue has no map: it keeps its own colour)
    const sm = new THREE.SkinnedMesh(geo, mat);
    sm.name = 'hero-' + o.name;
    if (o.morphTargetDictionary) { sm.morphTargetDictionary = { ...o.morphTargetDictionary }; sm.morphTargetInfluences = new Array(Object.keys(o.morphTargetDictionary).length).fill(0); }
    sm.castShadow = true; sm.frustumCulled = false;
    body.parent.add(sm);
    sm.position.copy(body.position); sm.quaternion.copy(body.quaternion); sm.scale.copy(body.scale);
    sm.bind(body.skeleton, body.bindMatrix);
    made.push(sm);
    if (fadeNeck) {
      const fm = new THREE.SkinnedMesh(...fadeNeck);
      fm.name = 'hero-neck-fade'; fm.castShadow = false; fm.frustumCulled = false;
      body.parent.add(fm);
      fm.position.copy(body.position); fm.quaternion.copy(body.quaternion); fm.scale.copy(body.scale);
      fm.bind(body.skeleton, body.bindMatrix);
      made.push(fm);
      fadeNeck = null;
    }
    if (keepHair && isSkin && mat.map) {
      // the scalp only: the face's own dark texels (lids, lip line, nostrils) are not hair
      const w = new THREE.Vector3();
      const onScalp = (x, y, z) => { w.set(x, y, z).applyMatrix4(body.matrixWorld); return w.y > nose.y + 5 || w.z < nose.z - 7; };
      const fur = furShells(geo, o.material, hairFrame(nose, body.matrixWorld), onScalp);
      if (fur) {
        fur.name = 'hero-scalp-fur'; fur.frustumCulled = false; fur.castShadow = false;
        body.parent.add(fur);
        fur.position.copy(body.position); fur.quaternion.copy(body.quaternion); fur.scale.copy(body.scale);
        fur.bind(body.skeleton, body.bindMatrix);
        made.push(fur);
      }
    }
    if (/teeth/i.test(o.name)) {
      // MakeHuman's head has no inside to the mouth: through the lips' corners (and an open mouth) you saw
      // straight out of the back of the head. A dark shell behind the teeth (only its far side is drawn) closes it.
      const bb = new THREE.Box3().setFromBufferAttribute(o.geometry.attributes.position);
      const c = bb.getCenter(new THREE.Vector3()), s = bb.getSize(new THREE.Vector3());
      const bg = new THREE.SphereGeometry(1, 24, 16);
      bg.scale(s.x * 0.75, s.y * 1.1, s.z * 1.1); bg.translate(c.x, c.y, c.z - s.z * 0.25);
      bg.applyMatrix4(new THREE.Matrix4().multiplyMatrices(toBody, o.matrixWorld));
      const nb = bg.attributes.position.count, bi = new Uint16Array(nb * 4), bw = new Float32Array(nb * 4);
      for (let v = 0; v < nb; v++) { bi[v * 4] = iHead; bw[v * 4] = 1; }
      bg.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(bi, 4));
      bg.setAttribute('skinWeight', new THREE.Float32BufferAttribute(bw, 4));
      const bag = new THREE.SkinnedMesh(bg, new THREE.MeshStandardMaterial({ name: 'mouth', color: 0x1c0d0b, roughness: 1, side: THREE.BackSide }));
      bag.name = 'hero-mouth'; bag.frustumCulled = false;
      body.parent.add(bag);
      bag.position.copy(body.position); bag.quaternion.copy(body.quaternion); bag.scale.copy(body.scale);
      bag.bind(body.skeleton, body.bindMatrix);
      made.push(bag);
    }
  });
  // Rocketbox bodies: what is left of the old neck is drawn in inside the new one, so its ragged top (wider than
  // the new neck at the sides and the back) never pokes out of it; under the new neck's end, where the new neck
  // dissolves (skinToned), it eases back to its own shape
  const skin = made.find((m) => m.geometry.attributes.neckcut && m.geometry.attributes.neckmix);
  // (not a Hunyuan body under new long hair: its old neck is one surface with the collar, and drawing it in tore the
  // collar into shards; there the new neck's crossfade onto it is enough)
  if (skin && !keepHair && !conform && Number.isFinite(oldNeckTop) && !dropHair) shrinkOldNeck(avatar, bones[0], body, skin.geometry, newChin - cutYOf(newChin, newNose, oldNeckTop, nose, s));
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
      if (c.head) swapHead(avatars[role], (await loader.loadAsync(base + c.head)).scene, { tint: c.headTint || null, keepHair: !!c.keepHair, tone: c.skinTone || null, hairLum: c.hairLum || 0.42, conform: c.conformNeck !== false, dropHair: !!c.dropHair });
      if (c.cleanSpecks) cleanSpecks(avatars[role]);
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
    const d = _pp.distanceTo(eye), near = d < PERSON_FAR, shade = d < PERSON_SHADOW, mirrored = d < PEOPLE_REFLECT_FAR;
    for (const a of P.acc) a.visible = d < ACCESSORY_FAR;
    for (const m of P.meshes) {
      if (m.userData.cs === undefined) { m.userData.cs = m.castShadow; m.userData.v0 = m.visible; }   // what its owner asked for
      m.visible = m.userData.v0 && near;
      m.castShadow = m.userData.cs && shade;
      if (mirrored) m.layers.enable(PEOPLE_LAYER); else m.layers.disable(PEOPLE_LAYER);   // in the paving's reflection (world/peopleReflect.js)
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
  const mixer = new THREE.AnimationMixer(root), armOut = (cast.armOut || 0) * Math.PI / 180;
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
  const reach = { R: { at: null, w: 0, pole: null, hand: null }, L: { at: null, w: 0, pole: null, hand: null } };
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
    // reach: a hand ('R' / 'L') to a world point (Vector3), weight 0..1 (see reachArm); pole: where the elbow
    // points; hand(bone, w): a last touch to the hand (a finger out to press a button, a palm turned up)
    setReach(side, at, w, { pole = null, hand = null } = {}) { const r = reach[side]; r.at = at; r.w = at ? w : 0; r.pole = pole; r.hand = hand; },
    // pose: { twist, lean } from engine/flinch.js flinchPose(), or null
    setFlinch(pose) { flinch = pose; },
    // speed (m/s) drives walk / jog playback so the stride matches the ground
    setGait(speed) {
      if (current === 'walk') base.walk.timeScale = arm.walk.timeScale = THREE.MathUtils.clamp(speed / speeds.walk, 0.55, 1.7);
      if (current === 'jog') base.jog.timeScale = arm.jog.timeScale = THREE.MathUtils.clamp(speed / speeds.jog, 0.6, 1.4);
    },
    // look: world [x, z] to turn the head (and a little of the neck) toward, or null
    update(dt, look = null) {
      if (dt > 0) { mixer.update(dt); spreadArms(root, armOut); }       // (nothing moves in no time; see play)
      if (reach.R.w > 0.001 || reach.L.w > 0.001) { root.updateMatrixWorld(true); for (const k of ['R', 'L']) { const r = reach[k]; if (r.w > 0.001) { reachArm(root, k, r.at, r.w, r.pole); if (r.hand) r.hand(bones[k], r.w); } } }
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
