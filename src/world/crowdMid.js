// The crowd's middle tier (docs/living-city-architecture.md §6.3): everyone nearby who isn't one of
// the few full people is drawn here, skinned on the GPU from the bake (world/crowdBake.js).
//   - one InstancedMesh per avatar per material (2-3), so a whole crowd of one avatar is 2-3 draw
//     calls however many there are; nothing is drawn for an avatar with nobody in view
//   - the avatar's own geometry and textures (shared with the full people: no new memory), its own
//     materials less the normal maps, lit by the scene's lights like everyone else
//   - per person: where they stand and face, which two frames of which clip and how far between
//     them, and a fade in and out (a screen-door dither, no blending) at the tier's edges
//   - each person's own look (world/crowdLooks.js): clothes and hair re-dyed per instance, their build
// No shadow-map casting: a soft blob underneath, as for the far crowd.
import * as THREE from 'three';
import { PEOPLE_LAYER } from './peopleReflect.js';
import { patchLook } from './crowdLooks.js';
import { phoneMesh, phoneCase } from './photoPose.js';

const VERT_PARS = /* glsl */ `
attribute vec4 skinIndex;
attribute vec4 skinWeight;
attribute vec4 iAnim;              // row A, row B, how far from A to B, fade
uniform highp sampler2D boneTex;
varying float vFade;
mat4 cmBone(float row, float b) {
  int x = int(b) * 3, y = int(row);
  vec4 r0 = texelFetch(boneTex, ivec2(x, y), 0), r1 = texelFetch(boneTex, ivec2(x + 1, y), 0), r2 = texelFetch(boneTex, ivec2(x + 2, y), 0);
  return mat4(r0.x, r1.x, r2.x, 0.0, r0.y, r1.y, r2.y, 0.0, r0.z, r1.z, r2.z, 0.0, r0.w, r1.w, r2.w, 1.0);
}
mat4 cmSkinAt(float row) {
  return skinWeight.x * cmBone(row, skinIndex.x) + skinWeight.y * cmBone(row, skinIndex.y)
       + skinWeight.z * cmBone(row, skinIndex.z) + skinWeight.w * cmBone(row, skinIndex.w);
}
`;

function midMaterial(src, boneTex, tinted, lod = false, ref = null) {
  const m = src.clone();
  m.normalMap = null;                                    // (flat cloth up close is fine at 7-30 m)
  m.vertexColors = false;
  m.onBeforeCompile = (shader) => {
    shader.uniforms.boneTex = { value: boneTex };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERT_PARS}`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        mat4 cmSkin = cmSkinAt(iAnim.x) * (1.0 - iAnim.z) + cmSkinAt(iAnim.y) * iAnim.z;
        objectNormal = normalize(mat3(cmSkin) * objectNormal);
        vFade = iAnim.w;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        transformed = (cmSkin * vec4(transformed, 1.0)).xyz;`);
    // (the lighter one-mesh person: the coat colour only where the clothes are)
    if (lod) shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float tint;')
      .replace('#include <color_vertex>', '#include <color_vertex>\n#ifdef USE_INSTANCING_COLOR\n vColor.xyz = mix(vec3(1.0), vColor.xyz, tint);\n#endif');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vFade;')
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        if (vFade < 0.999) { float dz = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))); if (dz >= vFade) discard; }`);
    if (ref) patchLook(shader, { instanced: true, ref });                // (the person's own clothes and hair: world/crowdLooks.js)
  };
  m.customProgramCacheKey = () => `crowdMid${tinted ? 't' : ''}${lod ? 'l' : ''}${ref ? 'k' : ''}|${src.type}`;
  return m;
}

export function createCrowdMid({ group, people, bake, roles, max = 150 }) {
  const byRole = {};
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
  for (const role of roles) {
    const b = bake[role]; if (!b) continue;
    const src = []; people.avatars[role].traverse((o) => { if (o.isSkinnedMesh) src.push(o); });
    const cap = Math.max(8, Math.min(max, 64));
    const R = { b, cap, n: 0, meshes: [], body: null };
    R.iAnim = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
    R.iMat = new THREE.InstancedBufferAttribute(new Float32Array(cap * 16), 16).setUsage(THREE.DynamicDrawUsage);
    R.ref = people.avatars[role].userData.zoneRef || null;             // (world/crowdLooks.js markZones, done by the crowd view)
    R.lk = R.ref ? ['iLkTop', 'iLkBot', 'iLkHair'].map(() => new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage)) : null;
    for (const s of src) {
      const g = new THREE.BufferGeometry();
      for (const [k, a] of Object.entries(s.geometry.attributes)) g.setAttribute(k, a);
      g.setIndex(s.geometry.index); g.setAttribute('iAnim', R.iAnim);
      const looks = !!(R.lk && g.attributes.zone);
      if (looks) setLook(g, R.lk);
      const body = /_body$/i.test(s.material.name || '');
      const mesh = new THREE.InstancedMesh(g, midMaterial(s.material, b.texture, body, false, looks ? R.ref : null), cap);
      mesh.instanceMatrix = R.iMat;
      if (body) { mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3).setUsage(THREE.DynamicDrawUsage); R.body = mesh; }
      mesh.count = 0; mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = true;
      mesh.renderOrder = s.renderOrder; mesh.name = 'crowd-mid';
      mesh.layers.enable(PEOPLE_LAYER); group.add(mesh); R.meshes.push(mesh);
    }
    byRole[role] = R;
  }
  function setLook(g, lk) { g.setAttribute('iLkTop', lk[0]); g.setAttribute('iLkBot', lk[1]); g.setAttribute('iLkHair', lk[2]); }
  const stats = { drawn: 0, roles: 0 };
  // the phones in people's hands (where the clip has one: world/crowdBake.js phones), all in one mesh
  const phones = phoneMesh(Math.max(32, max)); phones.count = 0; phones.name = 'crowd-mid-phones'; group.add(phones);
  let nPhones = 0; const _pm = new THREE.Matrix4(), _pw = new THREE.Matrix4();
  function grow(R) {                                       // (an avatar more popular than expected)
    const cap = Math.min(max, R.cap * 2); if (cap <= R.cap) return false;
    const a = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage); a.array.set(R.iAnim.array);
    const m = new THREE.InstancedBufferAttribute(new Float32Array(cap * 16), 16).setUsage(THREE.DynamicDrawUsage); m.array.set(R.iMat.array);
    R.iAnim = a; R.iMat = m;
    if (R.lk) R.lk = R.lk.map((o) => { const n = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage); n.array.set(o.array); return n; });
    for (const mesh of R.meshes) {
      mesh.geometry.setAttribute('iAnim', a); mesh.instanceMatrix = m;
      if (R.lk && mesh.geometry.attributes.iLkTop) setLook(mesh.geometry, R.lk);
      if (mesh.instanceColor) { const c = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3).setUsage(THREE.DynamicDrawUsage); c.array.set(mesh.instanceColor.array); mesh.instanceColor = c; }
    }
    R.cap = cap; return true;
  }
  // Phase 2b: swap an avatar's two or three meshes for its lighter one-mesh version (world/crowdLod.js):
  // one draw call and about a third of the triangles; the same bake, the same instance data
  function upgrade(role, lod) {
    const R = byRole[role]; if (!R || !lod || R.lod) return false;
    const src = R.body ? R.body.material : R.meshes[0].material;
    const base = new THREE.MeshStandardMaterial({ map: lod.map, roughness: src.roughness ?? 0.8, metalness: src.metalness ?? 0, alphaTest: 0.5, name: `${role}_lod` });
    const g = lod.geometry; g.setAttribute('iAnim', R.iAnim);
    const looks = !!(R.lk && g.attributes.zone);
    if (looks) setLook(g, R.lk);
    const mesh = new THREE.InstancedMesh(g, midMaterial(base, R.b.texture, true, true, looks ? R.ref : null), R.cap);
    mesh.instanceMatrix = R.iMat;
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(R.cap * 3).fill(1), 3).setUsage(THREE.DynamicDrawUsage);
    mesh.count = 0; mesh.visible = false; mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = true; mesh.name = 'crowd-mid';
    for (const old of R.meshes) { group.remove(old); old.material.dispose(); }   // (its geometry is the full person's own: kept)
    mesh.layers.enable(PEOPLE_LAYER); group.add(mesh); R.meshes = [mesh]; R.body = mesh; R.lod = lod;
    return true;
  }
  return {
    stats, upgrade,
    roles: () => Object.keys(byRole),
    has: (role) => !!byRole[role],
    clipsOf: (role) => byRole[role] && byRole[role].b,
    begin() { for (const k in byRole) byRole[k].n = 0; nPhones = 0; },
    // one person: x, y, z, yaw, size; clip (a baked name), t (0..1 through it), fade 0..1, coat (THREE.Color or null)
    push(role, x, y, z, yaw, size, clip, t, fade, coat, phoneId = 0) {
      const R = byRole[role]; if (!R) return false;
      if (R.n >= R.cap && !grow(R)) return false;
      const c = R.b.clips[clip] || R.b.clips.idle, f = (((t % 1) + 1) % 1) * c.frames, f0 = Math.floor(f);
      const i = R.n++;
      R.iAnim.setXYZW(i, c.row + f0, c.row + ((f0 + 1) % c.frames), f - f0, fade);
      _m.compose(_p.set(x, y, z), _q.setFromAxisAngle(_up, yaw), _s.set(size, size, size));
      _m.toArray(R.iMat.array, i * 16);
      if (R.body) R.body.instanceColor.setXYZ(i, coat ? coat.r : 1, coat ? coat.g : 1, coat ? coat.b : 1);
      if (c.phone && fade > 0.5 && nPhones < phones.instanceMatrix.count) {
        _pm.fromArray(R.b.phones, (c.row + f0) * 16);
        phones.setMatrixAt(nPhones, _pw.multiplyMatrices(_m, _pm));
        phones.setColorAt(nPhones, phoneCase(phoneId)); nPhones++;
      }
      return true;
    },
    // the look of the person just pushed (world/crowdLooks.js lookOf): clothes, hair, and their build (w: width)
    dress(role, look) {
      const R = byRole[role]; if (!R || !R.n || !look) return;
      const i = R.n - 1;
      if (R.lk) { R.lk[0].array.set(look.top, i * 4); R.lk[1].array.set(look.bottom, i * 4); R.lk[2].array.set(look.hair, i * 4); }
      if (look.w && look.w !== 1) { const e = R.iMat.array, o = i * 16; for (const k of [0, 1, 2, 8, 9, 10]) e[o + k] *= look.w; }
    },
    end() {
      let drawn = 0, used = 0;
      for (const k in byRole) {
        const R = byRole[k];
        for (const mesh of R.meshes) { mesh.count = R.n; mesh.visible = R.n > 0; }
        if (!R.n) continue;
        used++; drawn += R.n;
        R.iAnim.needsUpdate = true; R.iMat.needsUpdate = true;
        R.iAnim.clearUpdateRanges(); R.iAnim.addUpdateRange(0, R.n * 4);
        R.iMat.clearUpdateRanges(); R.iMat.addUpdateRange(0, R.n * 16);
        if (R.body) { R.body.instanceColor.needsUpdate = true; R.body.instanceColor.clearUpdateRanges(); R.body.instanceColor.addUpdateRange(0, R.n * 3); }
        if (R.lk) for (const a of R.lk) { a.needsUpdate = true; a.clearUpdateRanges(); a.addUpdateRange(0, R.n * 4); }
      }
      stats.drawn = drawn; stats.roles = used;
      phones.count = nPhones; phones.visible = nPhones > 0;
      if (nPhones) { phones.instanceMatrix.needsUpdate = true; phones.instanceColor.needsUpdate = true; }
    },
  };
}
