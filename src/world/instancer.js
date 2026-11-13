// Draw-call economy for the crossing's moving things: parts that repeat (wheels, pedestrian
// limbs) are drawn as one InstancedMesh per shape. Each instance follows an invisible Object3D
// pivot, so the animation code still works with an ordinary hierarchy.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

export function createInstancer(name) {
  const group = new THREE.Group(); group.name = name;
  const kinds = new Map();                               // key -> { geometry, material, slots: [{ pivot, color }] }
  let meshes = null;
  return {
    group,
    // register a pivot that should draw `geometry` with `material` (same key = same InstancedMesh)
    add(key, geometry, material, pivot, color = null) {
      if (meshes) throw new Error('instancer already built');
      if (!kinds.has(key)) kinds.set(key, { geometry, material, slots: [] });
      kinds.get(key).slots.push({ pivot, color: color != null ? new THREE.Color(color) : null });
      return pivot;
    },
    build() {
      meshes = [];
      for (const [key, k] of kinds) {
        const m = new THREE.InstancedMesh(k.geometry, k.material, k.slots.length);
        m.name = `${name}-${key}`;
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        // bounds are recomputed from the instances every sync, so normal frustum culling works
        k.slots.forEach((s, i) => { if (s.color) m.setColorAt(i, s.color); });
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
        meshes.push({ m, slots: k.slots });
        group.add(m);
      }
    },
    // copy every pivot's world matrix into its instance (pivots of hidden owners collapse to nothing)
    sync() {
      for (const { m, slots } of meshes) {
        for (let i = 0; i < slots.length; i++) m.setMatrixAt(i, slots[i].pivot.visibleOwner === false ? HIDDEN : slots[i].pivot.matrixWorld);
        m.instanceMatrix.needsUpdate = true;
        m.computeBoundingSphere();
      }
    },
  };
}

// Merge meshes that never move relative to each other into one geometry. With `colors`, each
// source keeps its own colour as a vertex attribute so one material can draw them all.
export function mergeStatic(meshes, { colors = false, uv = false } = {}) {
  const geos = meshes.map((mesh) => {
    mesh.updateMatrix();
    let g = mesh.geometry.clone().applyMatrix4(mesh.matrix);
    if (g.index) g = g.toNonIndexed();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && !(uv && k === 'uv')) g.deleteAttribute(k);
    if (colors) {
      const c = mesh.userData.color || new THREE.Color(1, 1, 1), n = g.attributes.position.count, a = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    }
    return g;
  });
  return mergeGeometries(geos, false);
}
