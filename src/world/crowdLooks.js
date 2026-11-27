// Everyone in the crowd dressed as themselves (2026-11-27, Mars: "everyone looks alike"). The library has a
// few dozen bodies; the street needs thousands of people. So on top of the body (public/people, Rocketbox)
// each person gets their own:
//   - clothes: the top (jacket, coat, jumper) and the bottom (trousers, skirt) re-dyed to a colour from what
//     Shanghai wears in late November (puffers, trench and camel coats, knitwear, denim), the cloth's own
//     folds and weave kept; some keep what the body came in
//   - hair: black, soft black, browns and the dyed teas and chestnuts of the city; grey to silver for the old
//   - height and build: a little taller or shorter, slimmer or broader
//   - things they wear and carry (full people, near you): scarves, beanies and caps, glasses, face masks,
//     backpacks and cross-body bags
// It is all one look per person (lookOf), the same at every distance: the full person (uniforms), the middle
// tier (per-instance attributes, world/crowdMid.js) and the far card (its top colour as the card's tint).
//
// How the dye knows what is a top and what is a bottom: each vertex of the body is marked by the bone that
// move it (markZones): spine, collarbones, arms and the collar are the top; the legs the bottom; hands and feet
// stay as they are; at the waist each texel goes with whichever of the two colours it is nearer. The hair is its own material. The shader takes the texel's brightness
// relative to the zone's average and paints the new colour at that brightness, so a crease stays a crease.
// Skin showing in a neckline is left alone.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { bodyPoints, attach, glasses as glassesMesh } from './outfits.js';

// ---- palettes (sRGB hex) ----
const TOPS_F = ['#1c1c1f', '#1c1c1f', '#e6dccb', '#b08a5e', '#c8b28a', '#232c45', '#7a7a7e', '#d4a5a5', '#6b2430', '#a9bcd6', '#eceae6', '#5d6043', '#5a4130', '#a3242c', '#a99ac2', '#a8c3b2', '#d9c7a5', '#3d3f45'];
const TOPS_M = ['#1c1c1f', '#1c1c1f', '#232c45', '#3a3b3f', '#7a7a7e', '#b08a5e', '#5d6043', '#2f4236', '#5a4130', '#6b2430', '#a39a7a', '#eceae6', '#a9bcd6', '#c8642a', '#b8902f', '#41526b', '#8c8c90'];
const TOPS_OLD = ['#3a3b3f', '#5a4130', '#232c45', '#6b2430', '#5d6043', '#7a7a7e', '#8a6b4e', '#4a3d52', '#9c8f7a', '#2f4236', '#a3242c'];
const TOPS_KID = ['#d23a35', '#f2c230', '#e98bb0', '#5aa0dc', '#4fa36a', '#f08a3c', '#eceae6', '#232c45', '#8f6cc2'];
const SUITS = ['#1c1c1f', '#232c45', '#3a3b3f', '#6f6f72', '#a39a7a', '#5a4130', '#2f3a4f', '#4a4d52'];
const SKIRTS = ['#1c1c1f', '#262e40', '#3a3b3f', '#4b3a2c', '#2b3a56', '#4a2a30', '#2f3a2f'];
const BOTTOMS = ['#3b4a66', '#262e40', '#1c1c1f', '#1c1c1f', '#3a3b3f', '#6f6f72', '#a8977a', '#4b3a2c', '#2b3a56'];
const BOTTOMS_F = [...BOTTOMS, '#cbbd9f', '#ddd3c0', '#5a4130'];
const HAIR = ['#141210', '#141210', '#1e1914', '#1e1914', '#2e2119', '#2e2119', '#4a3221', '#6a4228', '#7a4a2c', '#5c5048'];
const HAIR_M = ['#141210', '#141210', '#141210', '#1e1914', '#1e1914', '#2e2119', '#4a3221'];
const HAIR_OLD = ['#8a8884', '#b8b6b2', '#a09d98', '#6e6b67', '#c9c7c3'];
const SCARVES = ['#a3242c', '#d9c7a5', '#7a7a7e', '#232c45', '#b08a5e', '#e6dccb', '#3d5a40', '#c86a7a', '#1c1c1f', '#6b2430', '#d8a03a'];
const HATS = ['#1c1c1f', '#7a7a7e', '#e6dccb', '#6b2430', '#232c45', '#b08a5e', '#3d5a40', '#d4a5a5'];
const MASKS = ['#e9eef2', '#e9eef2', '#e9eef2', '#a9c6df', '#1c1c1f'];
const BAGS = ['#1c1c1f', '#1c1c1f', '#5a4130', '#8a6b4e', '#c8b28a', '#3a3b3f', '#232c45', '#a3242c', '#e6dccb'];
const FRAMES = ['#141414', '#141414', '#4a3326', '#8a8f96', '#6b4a2e'];

// sRGB hex -> linear [r, g, b] (what the shader works in)
const lin = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };   // (THREE.Color stores linear when colour management is on)
const hashOf = (id, k) => { const x = Math.sin(id * 127.1 + k * 311.7 + 0.5) * 43758.5453; return x - Math.floor(x); };
const pickOf = (arr, id, k) => arr[Math.floor(hashOf(id, k) * arr.length) % arr.length];

// ---- one person's look: { top, bottom, hair: [r, g, b, amount], h, w, acc: {...} } (amount 0: as the body came) ----
// a: { id, role, kind, abroad, child }; cast: people.json's entry for the role (sex, elder, teen, child)
export function makeLook(a, cast = {}) {
  const id = a.id | 0, f = cast.sex === 'f', kid = !!(a.child || cast.child), teen = !!cast.teen;
  const old = a.kind === 'elder' || !!cast.elder;
  const r = (k) => hashOf(id, k);
  const tops = kid ? TOPS_KID : old ? TOPS_OLD : f ? TOPS_F : TOPS_M;
  // the schoolboy keeps his uniform; otherwise most re-dyed, some as they came
  const keepTop = teen ? r(1) < 0.8 : r(1) < 0.16;
  let top = [...lin(pickOf(tops, id, 2)), keepTop ? 0 : 1];
  let bottom = [...lin(pickOf(cast.skirt ? SKIRTS : f && !old ? BOTTOMS_F : BOTTOMS, id, 3)), teen || r(4) < 0.3 ? 0 : 1];   // (a skirt's colour goes on the tights too: dark ones)
  // a suit is one cloth: jacket and trousers dyed together (its jacket's tails hang where the trousers are)
  if (cast.suit) { const c = lin(pickOf(SUITS, id, 2)), on = r(1) < 0.25 ? 0 : 1; top = [...c, on]; bottom = [...c, on]; }
  // hair: visitors from abroad keep their own; the fair-haired body (n5) dyed dark for a local
  let hair;
  if (old) hair = [...lin(pickOf(HAIR_OLD, id, 5)), 1];
  else if (a.abroad) hair = [0, 0, 0, 0];
  else hair = [...lin(pickOf(f ? HAIR : HAIR_M, id, 5)), cast.fair ? 1 : r(6) < 0.82 ? 1 : 0];
  // height and build (on top of the crowd's own 0.95-1.05 scale)
  const h = kid ? 1 : teen ? 0.93 + r(7) * 0.04 : old ? 0.94 + r(7) * 0.05 : 0.96 + r(7) * 0.08;
  const w = kid ? 1 : 0.93 + r(8) * 0.15 + (old && !f ? 0.03 : 0);
  // things they wear and carry
  const youngish = !old && !kid;
  const acc = {
    scarf: !kid && r(10) < (f ? 0.32 : 0.18) ? lin(pickOf(SCARVES, id, 11)) : null,
    hat: r(12) < (kid ? 0.2 : old ? 0.22 : 0.14) ? (kid || old || f || r(13) < 0.45 ? 'beanie' : 'cap') : null,
    hatColor: lin(pickOf(HATS, id, 14)),
    glasses: r(15) < (kid ? 0.05 : old ? 0.4 : 0.24) ? lin(pickOf(FRAMES, id, 16)) : null,
    mask: r(17) < (old ? 0.16 : 0.06) ? lin(pickOf(MASKS, id, 18)) : null,
    bag: r(19) < (teen || kid ? 0.6 : youngish ? (f ? 0.5 : 0.3) : 0.1) ? (teen || kid || (!f && r(20) < 0.7) || r(20) < 0.35 ? 'backpack' : 'cross') : null,
    bagColor: lin(pickOf(BAGS, id, 21)),
  };
  if (acc.hat && acc.scarf && r(22) < 0.5) acc.scarf = null;   // (not everyone bundled up at once)
  return { top, bottom, hair, h, w, acc };
}
export function lookOf(a, cast) { return a.look || (a.look = makeLook(a, cast)); }

// ---- the zones: per vertex, how much it is top, bottom and hair (vec3, from the bones that move it), and per
// avatar each zone's average brightness and the top's and bottom's average colours ----
// (on the body's own material the neck and head are a collar or a hood: part of the top, skin there kept by the
// shader; the pelvis and lowest spine are the waist, where the shirt's hem and the trousers' band meet: half each,
// and there the texel's own colour decides which it belongs to)
function zoneOf(bone, out) {
  if (/Hand|Finger|Foot|Toe/i.test(bone)) return out.set(0, 0, 0);
  if (/Pelvis|^Bip01$|^Bip01_Spine$/i.test(bone)) return out.set(0.5, 0.5, 0);
  if (/Thigh|Calf|skirt|Spring_(?!hair)/i.test(bone)) return out.set(0, 1, 0);
  return out.set(1, 0, 0);
}
function pixelsOf(map, max = 256) {
  const img = map && map.image; if (!img || typeof document === 'undefined') return null;
  const w = Math.min(max, img.width || max), h = Math.min(max, img.height || max);
  try { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, w, h); return { d: x.getImageData(0, 0, w, h).data, w, h, flipY: map.flipY }; } catch { return null; }
}
const s2l = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
export function markZones(root) {
  if (root.userData.zoneRef) return root.userData.zoneRef;
  const lum = [0, 0, 0], cnt = [0, 0, 0], mean = [[0, 0, 0], [0, 0, 0]];
  const zb = new THREE.Vector3(), acc = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.isSkinnedMesh || o.geometry.attributes.zone) return;
    const g = o.geometry, n = g.attributes.position.count, name = o.material.name || '';
    const z = new Float32Array(n * 3);
    const hairy = /_opacity$|hair/i.test(name), body = /_body$/i.test(name);
    const si = g.attributes.skinIndex, sw = g.attributes.skinWeight, bones = o.skeleton.bones;
    for (let i = 0; i < n; i++) {
      if (hairy) { z[i * 3 + 2] = 1; continue; }
      if (!body) continue;
      acc.set(0, 0, 0);
      for (let c = 0; c < 4; c++) { const w = sw.getComponent(i, c); if (w > 0) acc.addScaledVector(zoneOf((bones[si.getComponent(i, c)] || {}).name || '', zb), w); }
      z[i * 3] = acc.x; z[i * 3 + 1] = acc.y;
    }
    g.setAttribute('zone', new THREE.BufferAttribute(z, 3));
    // the zones' average brightness and colour on their own texture, at their vertices' uvs (linear light, as the shader sees it)
    const px = pixelsOf(o.material.map), uv = g.attributes.uv;
    if (!px || !uv) return;
    for (let i = 0; i < n; i++) {
      const k = z[i * 3] > 0.95 ? 0 : z[i * 3 + 1] > 0.95 ? 1 : z[i * 3 + 2] > 0.5 ? 2 : -1; if (k < 0) continue;
      let u = uv.getX(i), v = uv.getY(i); u -= Math.floor(u); v -= Math.floor(v);
      const x = Math.min(px.w - 1, Math.floor(u * px.w)), y = Math.min(px.h - 1, Math.floor((px.flipY ? 1 - v : v) * px.h)), j = (y * px.w + x) * 4;
      if (px.d[j + 3] < 128) continue;
      const r = s2l(px.d[j]), gg = s2l(px.d[j + 1]), b = s2l(px.d[j + 2]);
      lum[k] += 0.2126 * r + 0.7152 * gg + 0.0722 * b; cnt[k]++;
      if (k < 2) { mean[k][0] += r; mean[k][1] += gg; mean[k][2] += b; }
    }
  });
  const ref = {
    lum: [0, 1, 2].map((k) => (cnt[k] ? Math.max(0.02, lum[k] / cnt[k]) : 0.2)),
    top: mean[0].map((v) => v / Math.max(1, cnt[0])), bottom: mean[1].map((v) => v / Math.max(1, cnt[1])),
  };
  // how sharply the waist's texels are told apart by colour: not at all when top and bottom are much the same colour
  const d = Math.hypot(ref.top[0] - ref.bottom[0], ref.top[1] - ref.bottom[1], ref.top[2] - ref.bottom[2]);
  ref.sep = d > 0.035 ? d * 0.3 : 0;
  root.traverse((o) => { if (o.isSkinnedMesh && /_body$/i.test(o.material.name || '') && o.geometry.attributes.zone && !o.geometry.userData.lkMask) o.geometry.userData.lkMask = zoneMask(o, ref); });
  root.userData.zoneRef = ref;
  return ref;
}

// The body's zones painted into its own texture space (256 x 256: red the top, green the bottom), so the dye follows
// the cloth's printed edges and not the triangles': each texture island as the top or the bottom it mostly is; in an
// island that is both, each triangle in its bones' share, and at the waist (where the bones can't tell) each texel by whether its colour is nearer the top's or the bottom's, the odd speck voted away
// by its neighbours, the edge softened by a texel; then grown a few texels past the islands' edges for filtering.
const MS = 256;
function zoneMask(o, ref) {
  if (typeof document === 'undefined') return null;
  const g = o.geometry, uv = g.attributes.uv, z = g.attributes.zone, map = o.material.map; if (!uv || !map) return null;
  const flip = !!map.flipY, c = document.createElement('canvas'); c.width = c.height = MS;
  const x = c.getContext('2d', { willReadFrequently: true }); x.lineJoin = 'round'; x.lineWidth = 1.2;
  const idx = g.index, nt = idx ? idx.count / 3 : uv.count / 3, at = (k) => (idx ? idx.getX(k) : k);
  // the texture's islands (triangles joined where they share a point of the texture): a jacket is one island from
  // collar to hem, trousers another, so an island that is mostly top is all top (its hem too, whatever bone moves
  // it); only an island that is really both (a dress, a jumpsuit) is split, by the bones and then by colour
  const par = new Int32Array(nt).map((_, i) => i), find = (i) => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  const seen = new Map(), key = (v) => `${Math.round(uv.getX(v) * 4096)},${Math.round(uv.getY(v) * 4096)}`;
  for (let t = 0; t < nt; t++) for (let k = 0; k < 3; k++) { const kk = key(at(t * 3 + k)), o2 = seen.get(kk); if (o2 === undefined) seen.set(kk, t); else { const ra = find(t), rb = find(o2); if (ra !== rb) par[ra] = rb; } }
  const isl = new Map();
  for (let t = 0; t < nt; t++) {
    const a = at(t * 3), b = at(t * 3 + 1), cc = at(t * 3 + 2), r = find(t);
    const area = Math.abs((uv.getX(b) - uv.getX(a)) * (uv.getY(cc) - uv.getY(a)) - (uv.getX(cc) - uv.getX(a)) * (uv.getY(b) - uv.getY(a))) + 1e-9;
    const e = isl.get(r) || isl.set(r, { t: 0, b: 0 }).get(r);
    e.t += area * (z.getX(a) + z.getX(b) + z.getX(cc)); e.b += area * (z.getY(a) + z.getY(b) + z.getY(cc));
  }
  for (let t = 0; t < nt; t++) {
    const a = at(t * 3), b = at(t * 3 + 1), cc = at(t * 3 + 2), e = isl.get(find(t)), sh = e.t / Math.max(1e-9, e.t + e.b);
    let zt = (z.getX(a) + z.getX(b) + z.getX(cc)) / 3, zb = (z.getY(a) + z.getY(b) + z.getY(cc)) / 3, mixed = 0;
    if (sh > 0.72) { zt = zt + zb; zb = 0; } else if (sh < 0.28) { zb = zt + zb; zt = 0; } else mixed = 255;
    const col = `rgb(${Math.round(zt * 255)},${Math.round(zb * 255)},${mixed})`; x.fillStyle = x.strokeStyle = col;
    x.beginPath();
    for (const v of [a, b, cc]) { let u = uv.getX(v), w = uv.getY(v); u -= Math.floor(u); w -= Math.floor(w); const px = u * MS, py = (flip ? 1 - w : w) * MS; if (v === a) x.moveTo(px, py); else x.lineTo(px, py); }
    x.closePath(); x.fill(); x.stroke();
  }
  const img = x.getImageData(0, 0, MS, MS), d = img.data, tex = pixelsOf(map, MS);
  const N = MS * MS, share = new Float32Array(N).fill(-1);
  // the waist: by colour, where it is decisive
  if (tex && tex.w === MS && tex.h === MS && ref.sep > 0) {
    const T = ref.top, B = ref.bottom;
    for (let i = 0; i < N; i++) {
      const j = i * 4, zt = d[j] / 255, zb = d[j + 1] / 255; if (d[j + 3] < 128 || d[j + 2] < 128 || zt < 0.2 || zb < 0.2) continue;
      const r = s2l(tex.d[j]), gg = s2l(tex.d[j + 1]), bb = s2l(tex.d[j + 2]);
      const dT = Math.hypot(r - T[0], gg - T[1], bb - T[2]), dB = Math.hypot(r - B[0], gg - B[1], bb - B[2]);
      share[i] = Math.abs(dB - dT) > ref.sep * 0.4 ? (dB > dT ? 1 : 0) : (zt / (zt + zb) > 0.5 ? 1 : 0);
    }
    // a 5x5 vote, twice: specks go with their neighbours
    for (let pass = 0; pass < 2; pass++) {
      const nx = share.slice();
      for (let y = 0; y < MS; y++) for (let xx = 0; xx < MS; xx++) {
        const i = y * MS + xx; if (share[i] < 0) continue;
        let s1 = 0, n = 0;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const yy = y + dy, x2 = xx + dx; if (yy < 0 || yy >= MS || x2 < 0 || x2 >= MS) continue; const v = share[yy * MS + x2]; if (v < 0) continue; s1 += v; n++; }
        nx[i] = s1 * 2 > n ? 1 : 0;
      }
      share.set(nx);
    }
    for (let i = 0; i < N; i++) if (share[i] >= 0) { const j = i * 4, cl = (d[j] + d[j + 1]) / 255; d[j] = Math.round(share[i] * cl * 255); d[j + 1] = Math.round((1 - share[i]) * cl * 255); }
  }
  // grown past the islands' edges (so the texture's filtering never reads 'nothing' at a seam)
  for (let pass = 0; pass < 3; pass++) {
    const src = d.slice();
    for (let y = 0; y < MS; y++) for (let xx = 0; xx < MS; xx++) {
      const j = (y * MS + xx) * 4; if (src[j + 3] >= 128) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x2 = xx + dx, yy = y + dy; if (x2 < 0 || x2 >= MS || yy < 0 || yy >= MS) continue; const k = (yy * MS + x2) * 4; if (src[k + 3] >= 128) { d[j] = src[k]; d[j + 1] = src[k + 1]; d[j + 3] = 255; break; } }
    }
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.flipY = flip; t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter;
  t.wrapS = map.wrapS; t.wrapT = map.wrapT;
  return t;
}

// ---- the shader ----
// instanced: the look comes per instance (attributes iLkTop, iLkBot, iLkHair: rgb + amount); otherwise uniforms
const FRAG = /* glsl */ `
  {
    vec3 lkC = diffuseColor.rgb;
    float lkL = dot(lkC, vec3(0.2126, 0.7152, 0.0722));
#ifdef LK_HAIR
    diffuseColor.rgb = mix(lkC, mix(lkHair.rgb * clamp(lkL / lkRef.z, 0.3, 1.8), lkC, 0.05), lkHair.a);
#else
  #ifdef LK_MASK
    vec4 lkM = texture2D(lkMask, vMapUv); float zt = lkM.r, zb = lkM.g;
  #else
    float zt = vZone.x, zb = vZone.y;
  #endif
    float zc = zt + zb, topShare = zt / max(zc, 1e-3);
    // skin in a neckline or at a cuff stays skin (judged in gamma space, where skin sits in a narrow band)
    vec3 g = sqrt(max(lkC, 0.0)); float mx = max(g.r, max(g.g, g.b)), mn = min(g.r, min(g.g, g.b)), sat = (mx - mn) / max(mx, 1e-3);
    float gl = dot(g, vec3(0.3, 0.59, 0.11)), hue = (g.g - g.b) / max(g.r - g.b, 1e-3);
    float skin = (g.r > g.g && g.g > g.b) ? smoothstep(0.4, 0.47, gl) * smoothstep(0.14, 0.2, sat) * (1.0 - smoothstep(0.55, 0.62, sat)) * step(0.28, hue) * step(hue, 0.8) : 0.0;
    vec3 dT = mix(lkC, mix(lkTop.rgb * clamp(lkL / lkRef.x, 0.3, 1.8), lkC, 0.06), lkTop.a);
    vec3 dB = mix(lkC, mix(lkBot.rgb * clamp(lkL / lkRef.y, 0.3, 1.8), lkC, 0.06), lkBot.a);
    vec3 outC = mix(lkC, mix(dB, dT, topShare), smoothstep(0.35, 0.65, zc) * (1.0 - skin));
  #ifndef LK_MASK
    if (vZone.z > 0.5) outC = mix(lkC, mix(lkHair.rgb * clamp(lkL / lkRef.z, 0.3, 1.8), lkC, 0.05), lkHair.a);
  #endif
    diffuseColor.rgb = outC;
#endif
  }
`;
// mask: the body's zone texture (zoneMask); hair: the hair's material; neither: the zones per vertex (the one-mesh person)
export function patchLook(shader, { instanced = false, ref = null, uniforms = null, mask = null, hair = false } = {}) {
  const R = ref || { lum: [0.2, 0.2, 0.2], top: [0, 0, 0], bottom: [0, 0, 0], sep: 0 };
  const defs = `${mask ? '#define LK_MASK\n' : ''}${hair ? '#define LK_HAIR\n' : ''}`;
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>
attribute vec3 zone;
varying vec3 vZone;
${instanced ? 'attribute vec4 iLkTop; attribute vec4 iLkBot; attribute vec4 iLkHair; varying vec4 vLkTop; varying vec4 vLkBot; varying vec4 vLkHair;' : ''}`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>
vZone = zone;${instanced ? '\nvLkTop = iLkTop; vLkBot = iLkBot; vLkHair = iLkHair;' : ''}`);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `${defs}#include <common>
varying vec3 vZone;
uniform vec3 lkRef;${mask ? '\nuniform sampler2D lkMask;' : ''}
${instanced ? 'varying vec4 vLkTop; varying vec4 vLkBot; varying vec4 vLkHair;\n#define lkTop vLkTop\n#define lkBot vLkBot\n#define lkHair vLkHair' : 'uniform vec4 lkTop; uniform vec4 lkBot; uniform vec4 lkHair;'}`)
    .replace('#include <map_fragment>', `#include <map_fragment>\n${FRAG}`);
  shader.uniforms.lkRef = { value: new THREE.Vector3(...R.lum) };
  if (mask) shader.uniforms.lkMask = { value: mask };
  if (!instanced) {
    const U = uniforms || lookUniforms();
    shader.uniforms.lkTop = U.lkTop; shader.uniforms.lkBot = U.lkBot; shader.uniforms.lkHair = U.lkHair;
  }
}
// what a skinned mesh of the avatar needs to wear a look: { ref, mask, hair } (null: not a mesh that changes)
export function lookPartOf(mesh, ref) {
  const name = (mesh.material && mesh.material.name) || '';
  if (!ref || !mesh.geometry.attributes.zone) return null;
  if (/_opacity$|hair/i.test(name)) return { ref, hair: true, mask: null };
  if (/_body$/i.test(name)) return { ref, hair: false, mask: mesh.geometry.userData.lkMask || null };
  return null;
}
export const lookUniforms = () => ({ lkTop: { value: new THREE.Vector4(0, 0, 0, 0) }, lkBot: { value: new THREE.Vector4(0, 0, 0, 0) }, lkHair: { value: new THREE.Vector4(0, 0, 0, 0) } });

// a material (a full person's own copy) that wears a look: the uniforms live on material.userData.look
export function lookMaterial(src, part) {
  const m = src.clone(), U = lookUniforms(), prev = src.onBeforeCompile, prevKey = src.customProgramCacheKey;
  m.onBeforeCompile = (shader, r) => { if (prev && prev !== THREE.Material.prototype.onBeforeCompile) prev.call(m, shader, r); patchLook(shader, { ...part, uniforms: U }); };
  m.customProgramCacheKey = () => `look${part.mask ? 'm' : ''}${part.hair ? 'h' : ''}|${prevKey ? prevKey.call(src) : ''}`;
  m.userData.look = U;
  return m;
}
export function setLookUniforms(U, look) {
  if (!U) return;
  U.lkTop.value.fromArray(look ? look.top : [0, 0, 0, 0]); U.lkBot.value.fromArray(look ? look.bottom : [0, 0, 0, 0]); U.lkHair.value.fromArray(look ? look.hair : [0, 0, 0, 0]);
}

// ---- what they wear and carry, made once per full body (fitted to it) and shown per person ----
// a piece of a skinned mesh's surface as it stands now (person's frame), where keep(point, normal) says, lifted
// `lift` metres off it along its normals: { geometry (centred), at (where its centre goes) } or null
function surfaceShell(person, re, keep, lift) {
  const root = person.root; root.updateMatrixWorld(true);
  const toBody = new THREE.Matrix4().compose(root.position, root.quaternion, new THREE.Vector3(1, 1, 1)).invert();
  const out = [], a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.isSkinnedMesh || !re.test(o.material.name || '')) return;
    o.skeleton.update();
    const idx = o.geometry.index, nt = idx ? idx.count / 3 : o.geometry.attributes.position.count / 3, at = (k) => (idx ? idx.getX(k) : k);
    const P = (k, v) => { o.getVertexPosition(at(k), v); return o.localToWorld(v).applyMatrix4(toBody); };
    for (let t = 0; t < nt; t++) {
      P(t * 3, a); P(t * 3 + 1, b); P(t * 3 + 2, c);
      n.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a)); if (n.lengthSq() < 1e-14) continue; n.normalize();
      const m = e1.copy(a).add(b).add(c).multiplyScalar(1 / 3);
      if (keep(m, n)) out.push(a.clone(), b.clone(), c.clone(), n.clone());
    }
  });
  if (out.length < 24) return null;
  // smooth normals per corner (by place), so the lifted shell stays closed
  const key = (v) => `${Math.round(v.x * 2000)},${Math.round(v.y * 2000)},${Math.round(v.z * 2000)}`, acc = new Map();
  for (let i = 0; i < out.length; i += 4) for (let k = 0; k < 3; k++) { const kk = key(out[i + k]), v = acc.get(kk) || acc.set(kk, new THREE.Vector3()).get(kk); v.add(out[i + 3]); }
  const box = new THREE.Box3(); for (let i = 0; i < out.length; i += 4) for (let k = 0; k < 3; k++) box.expandByPoint(out[i + k]);
  const ctr = box.getCenter(new THREE.Vector3()), pos = new Float32Array((out.length / 4) * 9);
  let o2 = 0;
  for (let i = 0; i < out.length; i += 4) for (let k = 0; k < 3; k++) { const v = out[i + k], nn = acc.get(key(v)).clone().normalize(); pos[o2++] = v.x + nn.x * lift - ctr.x; pos[o2++] = v.y + nn.y * lift - ctr.y; pos[o2++] = v.z + nn.z * lift - ctr.z; }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geometry.computeVertexNormals();
  return { geometry, at: ctr };
}
const std = (roughness = 0.8) => new THREE.MeshStandardMaterial({ roughness, metalness: 0 });
// (fitting is a few tens of milliseconds a body; the first body of an avatar is fitted, the rest copy its kit: the same
// pieces on the same bones, each with its own material for its own colours)
const kitOf = new WeakMap();
export function accessoriesFor(person, avatar) {
  const proto = kitOf.get(avatar);
  if (!proto) { const kit = makeAccessories(person); kitOf.set(avatar, kit); return kit; }
  const kit = {};
  for (const [k, it] of Object.entries(proto)) {
    const bone = person.root.getObjectByName(it.obj.parent && it.obj.parent.name); if (!bone) continue;
    const obj = it.obj.clone(), mat = it.mat.clone();
    obj.traverse((o) => { if (o.isMesh && o.material === it.mat) o.material = mat; });
    obj.visible = false; bone.add(obj); kit[k] = { obj, mat };
  }
  return kit;
}
export function makeAccessories(person) {
  const kit = {};
  const head = bodyPoints(person, /_head$/), body = bodyPoints(person, /_body/);
  if (!head.length || !body.length) return kit;
  const top = head.reduce((m, p) => Math.max(m, p.y), -Infinity);
  const hx = head.reduce((s, p) => s + p.x, 0) / head.length, hz = head.reduce((s, p) => s + p.z, 0) / head.length;
  const skull = head.concat(bodyPoints(person, /_opacity$|hair/i)).filter((p) => Math.abs(p.x - hx) < 0.14 && Math.abs(p.z - hz) < 0.16);
  const crown = skull.reduce((m, p) => Math.max(m, p.y), -Infinity), band = skull.filter((p) => p.y > crown - 0.08);
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const p of band) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, rx = (x1 - x0) / 2 + 0.01, rz = (z1 - z0) / 2 + 0.012;
  // a knitted beanie: a dome over the skull and the hair, its turned-up cuff at the brow
  {
    const m = std(0.95), g = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2), m); dome.scale.set(rx, 0.115, rz); g.add(dome);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.045, 18, 1, true), m); cuff.scale.set(rx + 0.006, 1, rz + 0.006); cuff.position.y = 0.012; g.add(cuff);
    g.rotation.x = 0.12;
    kit.beanie = { obj: attach(person, 'Bip01_Head', g, new THREE.Vector3(cx, crown - 0.075, cz - 0.004)), mat: m };
  }
  // a baseball cap
  {
    const m = std(0.75), g = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), m); dome.scale.set(rx, 0.09, rz); g.add(dome);
    const peak = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.007, 16, 1, false, -Math.PI / 2, Math.PI), m); peak.scale.set(1, 1, 0.95); peak.position.set(0, 0.004, rz - 0.01); peak.rotation.x = 0.08; g.add(peak);
    kit.cap = { obj: attach(person, 'Bip01_Head', g, new THREE.Vector3(cx, crown - 0.06, cz)), mat: m };
  }
  // where the eyes, the nose and the lips are: from the face's own bones (the rig has them), else guessed from the skull
  const toBody = new THREE.Matrix4().compose(person.root.position, person.root.quaternion, new THREE.Vector3(1, 1, 1)).invert();
  const boneAt = (name) => { const b = person.root.getObjectByName(name); return b ? b.getWorldPosition(new THREE.Vector3()).applyMatrix4(toBody) : null; };
  const eL = boneAt('Bip01_LEye'), eR = boneAt('Bip01_REye'), lip = boneAt('Bip01_MBottomLip') || boneAt('Bip01_MJaw');
  const eyeY = eL && eR ? (eL.y + eR.y) / 2 : top - 0.1, eyeX = eL && eR ? (eL.x + eR.x) / 2 : hx;
  const lipY = lip ? lip.y : eyeY - 0.075;
  const frontAt = (y0, y1) => { const f = head.filter((p) => p.y > y0 && p.y < y1 && Math.abs(p.x - eyeX) < 0.03); return f.length ? f.reduce((m, p) => (p.z > m.z ? p : m), f[0]) : null; };
  // glasses, at the eyes
  const brow = frontAt(eyeY - 0.012, eyeY + 0.012);
  if (brow) {
    const g = glassesMesh(), m = std(0.4);
    g.traverse((o) => { if (o.isMesh) o.material = m; });
    kit.glasses = { obj: attach(person, 'Bip01_Head', g, new THREE.Vector3(eyeX, eyeY + 0.002, brow.z - 0.004)), mat: m };
  }
  // a face mask over the nose and mouth: the face's own surface from the bridge of the nose to under the chin and
  // across to the cheeks, lifted 5 mm off it (so it fits every face it goes on), its edge left as the triangles fall
  const y1 = eyeY - 0.026, y0 = lipY - 0.045, faceHalf = (() => { const f = head.filter((p) => Math.abs(p.y - (lipY + 0.02)) < 0.01); return f.length ? (f.reduce((m, p) => Math.max(m, p.x), -1) - f.reduce((m, p) => Math.min(m, p.x), 1)) / 2 : 0.07; })();
  const shell = surfaceShell(person, /_head$/, (p, n) => p.y > y0 && p.y < y1 && Math.abs(p.x - eyeX) < faceHalf * 0.86 && n.z > 0.15 && p.z > hz, 0.005);
  if (shell) {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.92, side: THREE.DoubleSide });
    kit.mask = { obj: attach(person, 'Bip01_Head', new THREE.Mesh(shell.geometry, m), shell.at), mat: m };
  }
  // a scarf: a thick band round the neck and an end hanging down the front
  const neckY = top - 0.24, ring = body.filter((p) => Math.abs(p.y - neckY) < 0.015);
  if (ring.length > 6) {
    const ncx = ring.reduce((a, p) => a + p.x, 0) / ring.length, ncz = ring.reduce((a, p) => a + p.z, 0) / ring.length;
    const nr = ring.reduce((a, p) => a + Math.hypot(p.x - ncx, p.z - ncz), 0) / ring.length + 0.02;
    const m = std(0.95), g = new THREE.Group();
    const wrap = new THREE.Mesh(new THREE.TorusGeometry(nr, 0.026, 8, 24), m); wrap.rotation.x = Math.PI / 2; wrap.scale.set(1.08, 1.2, 1.5); wrap.position.set(ncx, neckY - 0.01, ncz); g.add(wrap);
    const front = ring.reduce((mm, p) => (p.z > mm.z ? p : mm), ring[0]);
    const tail = new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.26, 0.018, 2, 0.006), m); tail.position.set(front.x + 0.035, neckY - 0.15, front.z + 0.03); tail.rotation.set(-0.08, 0, 0.06); g.add(tail);
    kit.scarf = { obj: attach(person, 'Bip01_Neck', g, new THREE.Vector3(0, 0, 0)), mat: m };
  }
  // a backpack on the shoulders, and a small bag worn across the body
  const chestY = neckY - 0.2, chest = body.filter((p) => Math.abs(p.y - chestY) < 0.03 && Math.abs(p.x) < 0.12);
  if (chest.length > 4) {
    const back = chest.reduce((m, p) => Math.min(m, p.z), Infinity), front = chest.reduce((m, p) => Math.max(m, p.z), -Infinity);
    const sx = body.filter((p) => Math.abs(p.y - (neckY - 0.06)) < 0.02).reduce((m, p) => Math.max(m, Math.abs(p.x)), 0.15);
    {
      const kz = Math.min(1.05, Math.max(0.7, top / 1.72)), m = std(0.7), g = new THREE.Group();
      const pack = new THREE.Mesh(new RoundedBoxGeometry(0.27 * kz, 0.37 * kz, 0.13 * kz, 3, 0.04 * kz), m); pack.position.set(0, -0.06 * kz, -0.058 * kz); g.add(pack);   // (its front against the back)
      const pocket = new THREE.Mesh(new RoundedBoxGeometry(0.2 * kz, 0.14 * kz, 0.04 * kz, 2, 0.015 * kz), m); pocket.position.set(0, -0.16 * kz, -0.128 * kz); g.add(pocket);
      // the straps: from the top of the pack, over the shoulder (its highest point there), down the front
      const O = new THREE.Vector3(0, chestY, back - 0.005);
      for (const sd of [-1, 1]) {
        const sh = body.filter((p) => Math.abs(p.x - sd * 0.1 * kz) < 0.025 && p.y < neckY - 0.02 && p.y > chestY);
        if (!sh.length) continue;
        const S = sh.reduce((mm, p) => (p.y > mm.y ? p : mm), sh[0]);
        const pts = [new THREE.Vector3(sd * 0.08 * kz, chestY + 0.13 * kz, back - 0.02), new THREE.Vector3(S.x, S.y + 0.014, S.z - 0.03), new THREE.Vector3(S.x, S.y + 0.012, S.z + 0.03), new THREE.Vector3(sd * 0.1 * kz, chestY - 0.04, front + 0.012)].map((v) => v.sub(O));
        const strap = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.012, 5, false), m); strap.scale.set(1, 1, 1); g.add(strap);
      }
      kit.backpack = { obj: attach(person, 'Bip01_Spine2', g, O), mat: m };
    }
    {
      const m = std(0.5), g = new THREE.Group();
      const B = new THREE.Vector3(Math.min(0.16, sx * 0.9), chestY - 0.38, (front + back) / 2 + 0.07);
      const bag = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.14, 0.06, 2, 0.02), m); bag.rotation.y = Math.PI / 2 - 0.35; g.add(bag);
      // the strap from the right shoulder, across the chest, to the bag on the left hip
      const a = new THREE.Vector3(-sx * 0.7, neckY - 0.03, (front + back) / 2).sub(B), mid = new THREE.Vector3(-0.02, chestY, front + 0.025).sub(B), b = new THREE.Vector3(0, 0.06, 0);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 12, 0.007, 4, false), m));
      kit.cross = { obj: attach(person, 'Bip01_Spine1', g, B), mat: m };
    }
  }
  for (const k in kit) if (kit[k].obj) kit[k].obj.visible = false; else delete kit[k];
  return kit;
}
const _c = new THREE.Color();
export function wearAccessories(kit, look) {
  if (!kit) return;
  const A = look ? look.acc : {};
  const show = (k, on, rgb) => { const it = kit[k]; if (!it) return; it.obj.visible = !!on; if (on && rgb) it.mat.color.copy(_c.setRGB(rgb[0], rgb[1], rgb[2])); };
  show('beanie', A.hat === 'beanie', A.hatColor); show('cap', A.hat === 'cap', A.hatColor);
  show('glasses', A.glasses, A.glasses); show('mask', A.mask, A.mask); show('scarf', A.scarf, A.scarf);
  show('backpack', A.bag === 'backpack', A.bagColor); show('cross', A.bag === 'cross', A.bagColor);
}

// the far card's tint: the top's colour (or the body's own, white) paled, as the card is the whole figure
const WHITE = [1, 1, 1];
export function cardTint(look, out) {
  const t = look && look.top[3] ? look.top : WHITE, k = 0.5;
  // (linear to a perceptual-ish multiplier: the atlas is sRGB, so lift the dark colours toward the middle)
  out[0] = 1 - k + k * Math.sqrt(t[0]); out[1] = 1 - k + k * Math.sqrt(t[1]); out[2] = 1 - k + k * Math.sqrt(t[2]);
  return out;
}
