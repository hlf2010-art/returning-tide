// The crowd's middle tier, baked (docs/living-city-architecture.md §6.3): each crowd avatar is posed
// once through a handful of clips at load, and every bone's skinning matrix for every frame is
// written into a float texture. A person in the middle tier (world/crowdMid.js) is then skinned in
// the vertex shader from that texture: no mixer, no skeleton, no per-person work beyond a few floats.
//   texture   one per avatar: a row per frame, 3 texels (a 3x4 matrix, row-major) per bone
//   clips     { name: { row, frames, dur, loop } }   row: the clip's first row in the texture
// The matrices map the avatar's bind-pose vertices straight to metres, relative to the person's feet
// (the root at the origin, unturned, at the avatar's 1:100 scale): the instance matrix only places,
// turns and sizes the person.
import * as THREE from 'three';
import { createPerson } from './people.js';

// what is baked, and how finely: [clip, seconds from, seconds long (null: all of it), frames]
// (walk and jog loop exactly; the long idles are sampled sparsely and played slowly, the shader
// blends neighbouring frames)
export const BAKE_CLIPS = [
  ['walk', 0, null, 30], ['jog', 0, null, 20],
  ['idle', 0, 8, 48], ['look', 0, null, 40], ['phone', 2, 8, 40], ['talk1', 0, 9, 54],
];

export function bakeBones(people, roles) {
  const t0 = performance.now();
  const out = {};
  const _m = new THREE.Matrix4(), _w = new THREE.Matrix4();
  for (const role of roles) {
    const p = createPerson(people, role);
    p.root.position.set(0, 0, 0); p.root.rotation.set(0, 0, 0);
    const meshes = []; p.root.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
    if (!meshes.length) continue;
    const skel = meshes[0].skeleton, bones = skel.bones, nb = bones.length;
    const ref = meshes[0];
    // the pieces must share bones and binding to share the bake (the converter writes them so)
    const shared = meshes.every((m) => m.skeleton.bones.length === nb && m.bindMatrix.equals(ref.bindMatrix));
    if (!shared) console.warn(`crowd bake: ${role} has pieces with their own binding; the middle tier draws them with the first's`);
    const clipsOf = Object.fromEntries(Object.entries(p.actions.base).map(([k, a]) => [k, a.getClip()]));
    const plan = [];
    let rows = 0;
    for (const [name, from, len, frames] of BAKE_CLIPS) {
      const clip = clipsOf[name] ? name : 'idle';
      const full = clipsOf[clip].duration, start = Math.min(from, Math.max(0, full - 0.5)), dur = len ? Math.min(len, full - start) : full;
      plan.push({ name, clip, start, dur, frames, row: rows });
      rows += frames;
    }
    const W = nb * 3, data = new Float32Array(W * rows * 4);
    for (const c of plan) {
      for (let f = 0; f < c.frames; f++) {
        const time = c.start + c.dur * f / c.frames;
        p.mixer.stopAllAction();
        for (const a of [p.actions.base[c.clip], p.actions.arm[c.clip]]) if (a) { a.reset(); a.setEffectiveWeight(1); a.play(); a.time = time; }
        p.mixer.update(0);
        p.root.updateMatrixWorld(true);
        // world = meshWorld * bindMatrixInverse * (boneWorld * boneInverse) * bindMatrix   (three's skinning)
        _w.multiplyMatrices(ref.matrixWorld, ref.bindMatrixInverse);
        for (let b = 0; b < nb; b++) {
          _m.multiplyMatrices(bones[b].matrixWorld, skel.boneInverses[b]).premultiply(_w).multiply(ref.bindMatrix);
          const e = _m.elements, o = ((c.row + f) * W + b * 3) * 4;
          // rows of the 3x4 (elements are column-major)
          data[o] = e[0]; data[o + 1] = e[4]; data[o + 2] = e[8]; data[o + 3] = e[12];
          data[o + 4] = e[1]; data[o + 5] = e[5]; data[o + 6] = e[9]; data[o + 7] = e[13];
          data[o + 8] = e[2]; data[o + 9] = e[6]; data[o + 10] = e[10]; data[o + 11] = e[14];
        }
      }
    }
    const texture = new THREE.DataTexture(data, W, rows, THREE.RGBAFormat, THREE.FloatType);
    texture.minFilter = texture.magFilter = THREE.NearestFilter; texture.generateMipmaps = false; texture.needsUpdate = true;
    out[role] = {
      texture, bones: nb, rows, sex: p.sex, child: p.child,
      speeds: p.speeds, clips: Object.fromEntries(plan.map((c) => [c.name, { row: c.row, frames: c.frames, dur: c.dur }])),
    };
    p.mixer.stopAllAction();
    for (const m of meshes) m.skeleton.dispose();
  }
  console.info(`crowd middle tier: ${Object.keys(out).length} avatars baked in ${Math.round(performance.now() - t0)} ms`);
  return out;
}
