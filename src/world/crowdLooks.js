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
// moves it most (markZones): spine, collarbones, arms and the collar are the top; pelvis and legs the bottom;
// hands and feet stay as they are (one zone per triangle: no blend of shoe into trouser). The hair is its own material. The shader takes the texel's brightness
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
  const top = [...lin(pickOf(tops, id, 2)), keepTop ? 0 : 1];
  const bottom = [...lin(pickOf(f && !old ? BOTTOMS_F : BOTTOMS, id, 3)), teen || r(4) < 0.3 ? 0 : 1];
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

// ---- the zones: a float per vertex (0 as it is, 1 top, 2 bottom, 3 hair), and each zone's average brightness ----
// (on the body's own material the neck and head are a collar or a hood: part of the top; skin there is kept by the shader)
const ZONE_OF = (bone) => /Hand|Finger|Foot|Toe/i.test(bone) ? 0 : /Spine|Clavicle|UpperArm|Forearm|Neck|Head/i.test(bone) ? 1 : 2;
function pixelsOf(map, max = 256) {
  const img = map && map.image; if (!img || typeof document === 'undefined') return null;
  const w = Math.min(max, img.width || max), h = Math.min(max, img.height || max);
  try { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, w, h); return { d: x.getImageData(0, 0, w, h).data, w, h, flipY: map.flipY }; } catch { return null; }
}
const s2l = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
export function markZones(root) {
  if (root.userData.zoneRef) return root.userData.zoneRef;
  const sum = [0, 0, 0, 0], cnt = [0, 0, 0, 0];
  root.traverse((o) => {
    if (!o.isSkinnedMesh || o.geometry.attributes.zone) return;
    const g = o.geometry, n = g.attributes.position.count, name = o.material.name || '';
    const z = new Float32Array(n);
    const hairy = /_opacity$|hair/i.test(name), body = /_body$/i.test(name);
    const si = g.attributes.skinIndex, sw = g.attributes.skinWeight, bones = o.skeleton.bones;
    for (let i = 0; i < n; i++) {
      if (hairy) { z[i] = 3; continue; }
      if (!body) { z[i] = 0; continue; }
      let best = 0, bw = -1; for (let c = 0; c < 4; c++) { const w = sw.getComponent(i, c); if (w > bw) { bw = w; best = si.getComponent(i, c); } }
      z[i] = ZONE_OF((bones[best] && bones[best].name) || '');
    }
    g.setAttribute('zone', new THREE.BufferAttribute(z, 1));
    // the zone's average brightness on its own texture, at its vertices' uvs (linear light, as the shader sees it)
    const px = pixelsOf(o.material.map), uv = g.attributes.uv;
    if (!px || !uv) return;
    for (let i = 0; i < n; i += 2) {
      const k = z[i]; if (!k) continue;
      let u = uv.getX(i), v = uv.getY(i); u -= Math.floor(u); v -= Math.floor(v);
      const x = Math.min(px.w - 1, Math.floor(u * px.w)), y = Math.min(px.h - 1, Math.floor((px.flipY ? 1 - v : v) * px.h)), j = (y * px.w + x) * 4;
      if (px.d[j + 3] < 128) continue;
      sum[k] += 0.2126 * s2l(px.d[j]) + 0.7152 * s2l(px.d[j + 1]) + 0.0722 * s2l(px.d[j + 2]); cnt[k]++;
    }
  });
  const ref = [1, 2, 3].map((k) => (cnt[k] ? Math.max(0.02, sum[k] / cnt[k]) : 0.2));
  root.userData.zoneRef = ref;
  return ref;
}

// ---- the shader ----
// instanced: the look comes per instance (attributes iLkTop, iLkBot, iLkHair: rgb + amount); otherwise uniforms
const FRAG = /* glsl */ `
  {
    vec3 lkC = diffuseColor.rgb;
    float lkL = dot(lkC, vec3(0.2126, 0.7152, 0.0722));
    vec4 lkT = vZone < 1.5 ? lkTop : vZone < 2.5 ? lkBot : lkHair;
    float lkR = vZone < 1.5 ? lkRef.x : vZone < 2.5 ? lkRef.y : lkRef.z;
    float lkA = lkT.a * step(0.5, vZone);
    // skin in a neckline or at a cuff stays skin (judged in gamma space, where skin sits in a narrow band)
    vec3 g = sqrt(max(lkC, 0.0)); float mx = max(g.r, max(g.g, g.b)), mn = min(g.r, min(g.g, g.b)), sat = (mx - mn) / max(mx, 1e-3);
    float gl = dot(g, vec3(0.3, 0.59, 0.11)), hue = (g.g - g.b) / max(g.r - g.b, 1e-3);
    float skin = (vZone < 1.5 && g.r > g.g && g.g > g.b) ? smoothstep(0.4, 0.47, gl) * smoothstep(0.14, 0.2, sat) * (1.0 - smoothstep(0.55, 0.62, sat)) * step(0.28, hue) * step(hue, 0.8) : 0.0;
    lkA *= 1.0 - skin;
    float k = clamp(lkL / max(lkR, 1e-3), 0.3, 1.8);
    diffuseColor.rgb = mix(lkC, mix(lkT.rgb * k, lkC, 0.06), lkA);
  }
`;
export function patchLook(shader, { instanced = false, ref = [0.2, 0.2, 0.2], uniforms = null } = {}) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>
attribute float zone;
flat varying float vZone;
${instanced ? 'attribute vec4 iLkTop; attribute vec4 iLkBot; attribute vec4 iLkHair; varying vec4 vLkTop; varying vec4 vLkBot; varying vec4 vLkHair;' : ''}`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>
vZone = zone;${instanced ? '\nvLkTop = iLkTop; vLkBot = iLkBot; vLkHair = iLkHair;' : ''}`);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>
flat varying float vZone;
uniform vec3 lkRef;
${instanced ? 'varying vec4 vLkTop; varying vec4 vLkBot; varying vec4 vLkHair;\n#define lkTop vLkTop\n#define lkBot vLkBot\n#define lkHair vLkHair' : 'uniform vec4 lkTop; uniform vec4 lkBot; uniform vec4 lkHair;'}`)
    .replace('#include <map_fragment>', `#include <map_fragment>\n${FRAG}`);
  shader.uniforms.lkRef = { value: new THREE.Vector3(...ref) };
  if (!instanced) {
    const U = uniforms || lookUniforms();
    shader.uniforms.lkTop = U.lkTop; shader.uniforms.lkBot = U.lkBot; shader.uniforms.lkHair = U.lkHair;
  }
}
export const lookUniforms = () => ({ lkTop: { value: new THREE.Vector4(0, 0, 0, 0) }, lkBot: { value: new THREE.Vector4(0, 0, 0, 0) }, lkHair: { value: new THREE.Vector4(0, 0, 0, 0) } });

// a material (a full person's own copy) that wears a look: the uniforms live on material.userData.look
export function lookMaterial(src, ref) {
  const m = src.clone(), U = lookUniforms(), prev = src.onBeforeCompile, prevKey = src.customProgramCacheKey;
  m.onBeforeCompile = (shader, r) => { if (prev && prev !== THREE.Material.prototype.onBeforeCompile) prev.call(m, shader, r); patchLook(shader, { ref, uniforms: U }); };
  m.customProgramCacheKey = () => `look|${prevKey ? prevKey.call(src) : ''}`;
  m.userData.look = U;
  return m;
}
export function setLookUniforms(U, look) {
  if (!U) return;
  U.lkTop.value.fromArray(look ? look.top : [0, 0, 0, 0]); U.lkBot.value.fromArray(look ? look.bottom : [0, 0, 0, 0]); U.lkHair.value.fromArray(look ? look.hair : [0, 0, 0, 0]);
}

// ---- what they wear and carry, made once per full body (fitted to it) and shown per person ----
const std = (roughness = 0.8) => new THREE.MeshStandardMaterial({ roughness, metalness: 0 });
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
  // glasses, at the eyes
  const eyes = head.filter((p) => p.y < top - 0.085 && p.y > top - 0.12 && Math.abs(p.x - hx) < 0.05);
  if (eyes.length) {
    const front = eyes.reduce((m, p) => (p.z > m.z ? p : m), eyes[0]), g = glassesMesh(), m = std(0.4);
    g.traverse((o) => { if (o.isMesh) o.material = m; });
    kit.glasses = { obj: attach(person, 'Bip01_Head', g, new THREE.Vector3(hx, front.y + 0.002, front.z - 0.006)), mat: m };
  }
  // a face mask over the nose and mouth: a curved panel the width of the face, pleated a little
  const face = head.filter((p) => p.y < top - 0.13 && p.y > top - 0.2);
  if (face.length > 8) {
    const fz = face.reduce((m, p) => Math.max(m, p.z), -Infinity), fx0 = face.reduce((m, p) => Math.min(m, p.x), Infinity), fx1 = face.reduce((m, p) => Math.max(m, p.x), -Infinity);
    const r = Math.max(0.05, (fx1 - fx0) / 2 * 0.95), th = 2.0, m = new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide });
    const panel = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, 0.078, 14, 3, true, -th / 2, th), m);
    kit.mask = { obj: attach(person, 'Bip01_Head', panel, new THREE.Vector3((fx0 + fx1) / 2, top - 0.168, fz - r + 0.012)), mat: m };
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
      const m = std(0.7), g = new THREE.Group();
      const pack = new THREE.Mesh(new RoundedBoxGeometry(0.29, 0.4, 0.14, 3, 0.04), m); pack.position.set(0, -0.04, -0.07); g.add(pack);
      const pocket = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.15, 0.04, 2, 0.015), m); pocket.position.set(0, -0.15, -0.145); g.add(pocket);
      for (const s of [-1, 1]) { const strap = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.012, 0.2), m); strap.position.set(s * Math.min(0.09, sx * 0.55), 0.17, 0.04); strap.rotation.x = 0.35; g.add(strap); }
      kit.backpack = { obj: attach(person, 'Bip01_Spine2', g, new THREE.Vector3(0, chestY, back - 0.005)), mat: m };
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
