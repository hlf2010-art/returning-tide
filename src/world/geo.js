// Geometry batching: world pieces are merged per material to keep draw calls low.
// Every vertex carries a `flood` value = how much architectural floodlight it receives.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);

export class Batch {
  constructor() { this.list = []; }

  // geo: already in world space. flood: number or (x,y,z,nx,ny,nz) => number
  push(geo, flood = 0) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const pos = g.attributes.position, nor = g.attributes.normal, n = pos.count;
    const f = new Float32Array(n);
    if (typeof flood === 'function') {
      for (let i = 0; i < n; i++) f[i] = flood(pos.getX(i), pos.getY(i), pos.getZ(i), nor.getX(i), nor.getY(i), nor.getZ(i));
    } else f.fill(flood);
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', pos); out.setAttribute('normal', nor); out.setAttribute('uv', g.attributes.uv);
    out.setAttribute('flood', new THREE.BufferAttribute(f, 1));
    this.list.push(out);
    return this;
  }

  // Box by centre-x, bottom-y, centre-z. UVs are in metres / tile so textures keep scale.
  box(cx, y0, cz, w, h, d, { flood = 0, tile = 2, rotY = 0 } = {}) {
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv;
    // face order: +x -x +y -y +z -z, four verts each
    const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, (uv.getX(k) * dims[f][0]) / tile, (uv.getY(k) * dims[f][1]) / tile);
    }
    _m.compose(_p.set(cx, y0 + h / 2, cz), _q.setFromEuler(_e.set(0, rotY, 0)), _s);
    g.applyMatrix4(_m);
    return this.push(g, flood);
  }

  cyl(cx, y0, cz, rTop, rBot, h, seg = 16, { flood = 0, tileU = 1, tileV = 1, open = false } = {}) {
    const g = new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, open);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * tileU, uv.getY(i) * tileV);
    g.translate(cx, y0 + h / 2, cz);
    return this.push(g, flood);
  }

  // Any geometry + transform.
  add(geo, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, flood = 0 } = {}) {
    const g = geo.clone();
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
    g.applyMatrix4(_m);
    return this.push(g, flood);
  }

  // Vertical wall quad from a (left) to b (right) as seen from outside.
  // uv: [u0, v0, u1, v1]; flood: [bottom, top]
  wall(ax, az, bx, bz, y0, y1, uv = [0, 0, 1, 1], flood = [0, 0]) {
    const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len, nz = dx / len;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([
      ax, y0, az, bx, y0, bz, bx, y1, bz, ax, y0, az, bx, y1, bz, ax, y1, az], 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(6).fill([nx, 0, nz]).flat(), 3));
    const [u0, v0, u1, v1] = uv;
    g.setAttribute('uv', new THREE.Float32BufferAttribute([u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1], 2));
    const f = new Float32Array([flood[0], flood[0], flood[1], flood[0], flood[1], flood[1]]);
    const out = this.push(g, 0);
    this.list[this.list.length - 1].setAttribute('flood', new THREE.BufferAttribute(f, 1));
    return out;
  }

  // Horizontal quad facing up. uv in metres / tile.
  floor(x0, x1, z0, z1, y, tile = 2, flood = 0) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([
      x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z1, x1, y, z0, x0, y, z0], 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(6).fill([0, 1, 0]).flat(), 3));
    const u0 = x0 / tile, u1 = x1 / tile, v0 = -z1 / tile, v1 = -z0 / tile;
    g.setAttribute('uv', new THREE.Float32BufferAttribute([u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1], 2));
    return this.push(g, flood);
  }

  get empty() { return this.list.length === 0; }

  geometry() { return mergeGeometries(this.list, false); }

  mesh(material, name = '') {
    const m = new THREE.Mesh(this.geometry(), material);
    m.name = name; m.matrixAutoUpdate = false;
    this.list.length = 0;
    return m;
  }
}

// A set of named batches -> one mesh per material.
export function batchSet(names) {
  const o = {};
  for (const n of names) o[n] = new Batch();
  return o;
}
export function flush(batches, materials, group, prefix = '') {
  for (const k of Object.keys(batches)) {
    if (batches[k].empty) continue;
    if (!materials[k]) throw new Error(`no material for batch "${k}"`);
    group.add(batches[k].mesh(materials[k], prefix + k));
  }
}
