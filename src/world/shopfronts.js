// Shopfronts with real depth: what you see through the glass is a real shop, photographed.
//
// Behind each shop's windows is a box the size of the shop's ground floor (its width, about 4 m high,
// 5 m deep). The glass doesn't show a picture of it: for every pixel the shader follows your line of
// sight into that box, finds the wall, floor or ceiling it meets, and looks that point up in a 360-degree
// photograph taken inside a real shop (Poly Haven's CC0 interiors: tools/rooms/make.py turns them into
// cube maps in public/rooms/). Walk past and the room moves as a room does ("interior mapping", the
// way open-world games fill shop windows). The glass itself is glass: black, smooth, reflecting the sky
// and the street (the scene's environment) and catching the sun, the room's light coming through it.
//
// The fronts are built: a polished stone stall riser under the glass, a dark bronze frame with a transom
// and mullions, and at every way in (the crowd's shop doors, engine/crowd.js) an automatic sliding door:
// two glass leaves in frames with pull bars, fixed side panels, the operator's box above. The leaves slide
// open when someone comes up to the door (the crowd, the shoppers, you) and close behind them.
//
// Which photograph: the shop's sign says what it sells (world/nanjingRoad.js) and the room follows it;
// each photograph can be turned to show one of its walls as the back wall, so the same room isn't
// recognisable two doors down.
import * as THREE from 'three';
import { Batch } from './geo.js';
import { TOD } from './dayNight.js';

// the rooms, and which of their walls make a good back wall (0: the cube's +Z face, 1: +X, 2: -Z, 3: -X)
export const ROOMS = {
  phone_shop: { yaws: [1, 0] },
  decor_shop: { yaws: [0, 1, 2, 3] },
  witsand_woolshop: { yaws: [1, 3, 0] },
  museum_of_ethnography: { yaws: [0, 1, 2, 3] },
  comfy_cafe: { yaws: [0, 1, 2, 3] },
  warm_restaurant: { yaws: [0, 1, 3] },
  royal_esplanade: { yaws: [0, 3] },
};
const ROOM_FOR = {
  丝绸: 'witsand_woolshop', 时装: 'witsand_woolshop', 鞋帽: 'decor_shop', 箱包: 'decor_shop', 运动: 'decor_shop', 书店: 'decor_shop',
  钟表: 'museum_of_ethnography', 珠宝: 'museum_of_ethnography', 工艺美术: 'museum_of_ethnography', 纪念品: 'museum_of_ethnography', 茶庄: 'museum_of_ethnography',
  照相器材: 'phone_shop', 数码: 'phone_shop', 眼镜: 'phone_shop', 药房: 'phone_shop',
  糕团: 'comfy_cafe', 咖啡: 'comfy_cafe', 酒家: 'warm_restaurant', 生煎: 'warm_restaurant', 食品: 'warm_restaurant', 百货: 'royal_esplanade',
};
export const roomFor = (type, r = Math.random) => ROOM_FOR[type] || Object.keys(ROOMS)[Math.floor(r() * 6)];
export const yawFor = (room, r = Math.random) => { const y = ROOMS[room].yaws; return y[Math.floor(r() * y.length)]; };

const UP = new THREE.Vector3(0, 1, 0);
const DOOR = { half: 2.4, leaf: 1.2, h: 2.75, slide: 1.12 };   // the door unit: 4.8 m wide, two 1.2 m leaves

// the glass with a room behind it
function roomMaterial(cube) {
  const m = new THREE.MeshStandardMaterial({ color: 0x020203, roughness: 0.05, metalness: 0.0, envMapIntensity: 1.0 });
  m.userData.cube = { value: cube };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uRoom: m.userData.cube, todShops: TOD.shops, todDay: TOD.day });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aRoom; attribute vec3 aBox; attribute float aYaw;\nvarying vec4 vRoom; varying vec3 vBox; varying float vYaw; varying vec3 vWorldP;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvRoom = aRoom; vBox = aBox; vYaw = aYaw; vWorldP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform samplerCube uRoom; uniform float todShops, todDay;\nvarying vec4 vRoom; varying vec3 vBox; varying float vYaw; varying vec3 vWorldP;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      {
        // the room: s along the front (T), y up, z into the shop; your line of sight in the same terms
        vec3 T = vec3(vBox.x, 0.0, vBox.y), IN = cross(T, vec3(0.0, 1.0, 0.0));
        vec3 V = normalize(vWorldP - cameraPosition);
        vec3 o = vec3(dot(vWorldP, T), vWorldP.y, 0.0), d = vec3(dot(V, T), V.y, max(dot(V, IN), 1e-4));
        vec3 lo = vec3(vRoom.x, vRoom.z, 0.0), hi = vec3(vRoom.y, vRoom.w, vBox.z);
        vec3 tm = max((lo - o) / d, (hi - o) / d);
        vec3 h = o + d * min(min(tm.x, tm.y), tm.z);
        // looked up as the photographer saw it: from eye height just inside the glass, in the middle of
        // this stretch of window (so the floor you see is the floor ahead of the camera, not under it)
        vec3 q = h - vec3((lo.x + hi.x) * 0.5, lo.y + 1.55, 0.0);
        float a = vYaw * 1.5707963, cs = cos(a), sn = sin(a);
        vec3 room = texture(uRoom, vec3(cs * q.x + sn * q.z, q.y, -sn * q.x + cs * q.z)).rgb;
        // lit while the shops are open (a little brighter by day, to hold its own against the daylight)
        totalEmissiveRadiance += room * mix(0.85, 1.15, todDay) * (0.05 + 0.95 * todShops);
      }`);
  };
  m.customProgramCacheKey = () => 'shop-room';
  return m;
}
// a cube texture from one of tools/rooms/make.py's 3 x 2 sheets (faces in WebGL's order), at `size`
function loadRoom(url, size, done) {
  const img = new Image(); img.crossOrigin = 'anonymous';
  img.onload = () => {
    const n = img.width / 3, faces = [];
    for (let f = 0; f < 6; f++) {
      const c = document.createElement('canvas'); c.width = c.height = size;
      c.getContext('2d').drawImage(img, (f % 3) * n, Math.floor(f / 3) * n, n, n, 0, 0, size, size);
      faces.push(c);
    }
    const cube = new THREE.CubeTexture(faces); cube.colorSpace = THREE.SRGBColorSpace; cube.generateMipmaps = true; cube.minFilter = THREE.LinearMipmapLinearFilter; cube.needsUpdate = true;
    done(cube);
  };
  img.src = url;
}

export function createShopfronts({ base = './rooms/', size = 512, rnd = Math.random } = {}) {
  const cubes = {}, mats = {}, quads = {};   // (cubes: the loaded photographs)
  const metal = new Batch(), stone = new Batch(), lamp = new Batch(), spill = { pos: [], uv: [] };
  const doors = [];
  // (a black room until the photograph has loaded)
  const blank = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (blank) { blank.width = blank.height = 4; }
  const black = new THREE.CubeTexture(blank ? Array(6).fill(blank) : []); black.needsUpdate = !!blank;
  for (const id of Object.keys(ROOMS)) {
    mats[id] = roomMaterial(black); quads[id] = { pos: [], nrm: [], room: [], box: [], yaw: [] };
    if (blank) loadRoom(`${base}${id}.jpg`, size, (cube) => { cubes[id] = cube; mats[id].userData.cube.value = cube; });
  }
  // a face's frame: along-axis coordinate u, height y, offset off out from the façade plane
  const frame = (f) => {
    const n = f.axis === 'x' ? new THREE.Vector3(0, 0, f.out) : new THREE.Vector3(f.out, 0, 0);
    const T = new THREE.Vector3().crossVectors(n, UP);                       // along the front, the room's s axis
    const at = (u, y, off) => (f.axis === 'x' ? new THREE.Vector3(u, y, f.plane + f.out * off) : new THREE.Vector3(f.plane + f.out * off, y, u));
    return { n, T, at };
  };
  // a pane of glass with the room behind it, from u0 to u1 along the front, y0 to y1
  function pane(F, room, u0, u1, y0, y1, off) {
    const Q = quads[room.id], { n, T, at } = F;
    const p = [at(u0, y0, off), at(u1, y0, off), at(u1, y1, off), at(u0, y1, off)];
    const tri = [p[0], p[1], p[2], p[0], p[2], p[3]];
    const fixFace = new THREE.Vector3().subVectors(p[1], p[0]).cross(new THREE.Vector3().subVectors(p[2], p[0])).dot(n) < 0;
    for (const v of fixFace ? [p[0], p[2], p[1], p[0], p[3], p[2]] : tri) {
      Q.pos.push(v.x, v.y, v.z); Q.nrm.push(n.x, n.y, n.z);
      Q.room.push(room.s0, room.s1, room.y0, room.y1); Q.box.push(T.x, T.z, room.depth); Q.yaw.push(room.yaw);
    }
  }
  // the shop's light on the pavement in front of the glass, fading out over `reach` m
  function pool(F, ua, ub, y, reach = 3.2) {
    const p = [F.at(ua, y, 0.12), F.at(ub, y, 0.12), F.at(ub, y, reach), F.at(ua, y, reach)], uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
    const up = new THREE.Vector3().subVectors(p[1], p[0]).cross(new THREE.Vector3().subVectors(p[2], p[0])).y > 0;
    for (const k of up ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]) { spill.pos.push(p[k].x, p[k].y, p[k].z); spill.uv.push(...uv[k]); }
  }
  // a box in the face's frame (u along the front, y up from y, off out from the façade), size du x dy x doff
  const fbox = (b, F, f, u, y, off, du, dy, doff) => {
    const c = F.at(u, y, off + doff / 2);
    if (f.axis === 'x') b.box(c.x, y, c.z, du, dy, doff); else b.box(c.x, y, c.z, doff, dy, du);
  };

  // A shopfront on a façade. f: { axis: 'x' (the front runs along x, faces ±z) or 'z', plane (the façade's
  // z, or x), out (+1/-1: which way it faces) }; u0..u1 its extent along the front; doorAt: the ways in;
  // type: what the sign says it sells (picks the room). y0 the pavement.
  function addFront(f, u0, u1, { y0 = 0.15, top = 4.1, doorAt = [], type = null, room: roomId = null, depth = 5 } = {}) {
    const F = frame(f), id = roomId || roomFor(type, rnd), yaw = yawFor(id, rnd);
    // a room behind the stretch of front from ua to ub (along the front), a little wider than it
    const roomOver = (ua, ub, d = depth) => {
      const sA = F.at(ua, 0, 0).dot(F.T), sB = F.at(ub, 0, 0).dot(F.T);
      return { id, s0: Math.min(sA, sB) - 0.5, s1: Math.max(sA, sB) + 0.5, y0, y1: top + 0.25, depth: d, yaw };
    };
    const lo = Math.min(u0, u1), hi = Math.max(u0, u1);
    // the stretches of window between the doors
    const cuts = doorAt.filter((u) => u - DOOR.half > lo + 0.2 && u + DOOR.half < hi - 0.2).sort((a, b) => a - b);
    let a = lo + 0.35;
    const runs = [];
    for (const u of cuts) { if (u - DOOR.half - 0.1 - a > 0.8) runs.push([a, u - DOOR.half - 0.1]); a = u + DOOR.half + 0.1; }
    if (hi - 0.35 - a > 0.8) runs.push([a, hi - 0.35]);
    let room = null;
    for (const [ra, rb] of runs) {
      // bays of about 3.6 m with a stone pier between; every two or so share a room
      const bays = Math.max(1, Math.round((rb - ra) / 3.6)), per = Math.max(1, Math.floor(8.5 / ((rb - ra) / bays)));
      for (let i = 0; i < bays; i++) {
        const ba = ra + ((rb - ra) * i) / bays + (i ? 0.18 : 0), bb = ra + ((rb - ra) * (i + 1)) / bays - (i < bays - 1 ? 0.18 : 0), w = bb - ba, cu = (ba + bb) / 2;
        if (i % per === 0) room = roomOver(ra + ((rb - ra) * i) / bays, ra + ((rb - ra) * Math.min(bays, i + per)) / bays);
        fbox(stone, F, f, cu, y0, 0, w + 0.06, 0.32, 0.16);                                   // the stall riser
        pane(F, room, ba, bb, y0 + 0.32, top, 0.045); pool(F, ba - 0.2, bb + 0.2, y0 + 0.012);
        fbox(metal, F, f, cu, y0 + 0.32, 0.02, w, 0.06, 0.1);                                  // sill
        fbox(metal, F, f, cu, top - 0.07, 0.02, w, 0.09, 0.1);                                 // head
        fbox(metal, F, f, cu, y0 + 2.9, 0.03, w, 0.07, 0.08);                                  // transom
        for (const e of [ba + 0.03, bb - 0.03]) fbox(metal, F, f, e, y0 + 0.32, 0.02, 0.07, top - y0 - 0.32, 0.1);
        const m = Math.max(0, Math.round(w / 1.6) - 1);
        for (let k = 1; k <= m; k++) fbox(metal, F, f, ba + (w * k) / (m + 1), y0 + 0.32, 0.03, 0.045, top - y0 - 0.39, 0.07);
      }
    }
    // the doors: fixed side panels and the opening behind the leaves show the room; the operator's box
    // above; a stone threshold
    for (const u of cuts) {
      const dr = roomOver(u - DOOR.half, u + DOOR.half, depth + 1.5);
      pane(F, dr, u - DOOR.half, u + DOOR.half, y0, y0 + DOOR.h + 0.05, 0.02);
      pane(F, dr, u - DOOR.half, u + DOOR.half, y0 + DOOR.h + 0.42, top, 0.045); pool(F, u - DOOR.half - 0.2, u + DOOR.half + 0.2, y0 + 0.012, 3.8);
      fbox(metal, F, f, u, y0 + DOOR.h + 0.05, 0.0, DOOR.half * 2 + 0.2, 0.37, 0.3);            // the operator box
      for (const e of [u - DOOR.half - 0.04, u + DOOR.half + 0.04]) fbox(metal, F, f, e, y0, 0.0, 0.1, DOOR.h + 0.42, 0.18);
      for (const e of [u - DOOR.leaf, u + DOOR.leaf]) fbox(metal, F, f, e, y0, 0.02, 0.05, DOOR.h + 0.05, 0.05);   // the fixed panels' stiles
      fbox(stone, F, f, u, y0 - 0.005, 0, DOOR.half * 2 + 0.3, 0.012, 0.6);
      const led = F.at(u + DOOR.half - 0.3, y0 + DOOR.h + 0.2, 0.31); lamp.box(led.x, led.y, led.z, 0.03, 0.03, 0.03);
      doors.push({ u, f, F, y0, open: 0, hold: 0, x: F.at(u, 0, 0).x, z: F.at(u, 0, 0).z });
    }
    return { id, yaw };
  }

  // ---- the meshes ----
  const group = new THREE.Group(); group.name = 'shopfronts';
  const leafFrameMat = new THREE.MeshStandardMaterial({ color: 0x23201c, metalness: 0.75, roughness: 0.32 });
  const leafGlassMat = new THREE.MeshStandardMaterial({ color: 0x0b1012, metalness: 0.0, roughness: 0.03, transparent: true, opacity: 0.22, depthWrite: false, envMapIntensity: 1.2 });
  let leafFrames = null, leafGlass = null, leafBands = null;
  // the light pools: warm, brightest at the glass, soft at the ends; added to the paving after dark
  const spillMat = new THREE.MeshBasicMaterial({ map: poolTexture(), color: new THREE.Color(0, 0, 0), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, toneMapped: true });
  const SPILL = new THREE.Color(1.0, 0.72, 0.42).multiplyScalar(0.16);
  function build() {
    for (const [id, Q] of Object.entries(quads)) {
      if (!Q.pos.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(Q.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Q.nrm, 3));
      g.setAttribute('aRoom', new THREE.Float32BufferAttribute(Q.room, 4)); g.setAttribute('aBox', new THREE.Float32BufferAttribute(Q.box, 3)); g.setAttribute('aYaw', new THREE.Float32BufferAttribute(Q.yaw, 1));
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, mats[id]); mesh.name = `shop-room-${id}`; mesh.receiveShadow = false; group.add(mesh);
    }
    if (spill.pos.length) {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(spill.pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(spill.uv, 2));
      g.computeBoundingSphere();
      const pools = new THREE.Mesh(g, spillMat); pools.name = 'shop-light-pools'; pools.renderOrder = 1; group.add(pools);
    }
    const bronze = new THREE.MeshStandardMaterial({ color: 0x2a241d, metalness: 0.8, roughness: 0.34 });
    const riser = new THREE.MeshStandardMaterial({ color: 0x1f1d1c, metalness: 0.05, roughness: 0.18 });
    const led = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 2.2, 0.6) });
    if (metal.list.length) group.add(metal.mesh(bronze, 'shop-frames'));
    if (stone.list.length) group.add(stone.mesh(riser, 'shop-risers'));
    if (lamp.list.length) group.add(lamp.mesh(led, 'shop-door-leds'));
    // the door leaves: a frame (stiles, rails, a pull bar) and the glass, one instance per leaf
    const parts = [];
    const bar = (w, h, d, x, y, z) => parts.push(new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z));
    bar(0.05, DOOR.h, 0.04, -DOOR.leaf / 2 + 0.025, 0, 0); bar(0.05, DOOR.h, 0.04, DOOR.leaf / 2 - 0.025, 0, 0);
    bar(DOOR.leaf, 0.06, 0.04, 0, DOOR.h - 0.06, 0); bar(DOOR.leaf, 0.11, 0.04, 0, 0, 0);
    const fg = mergeGeos(parts), gg = new THREE.PlaneGeometry(DOOR.leaf - 0.1, DOOR.h - 0.17).translate(0, 0.11 + (DOOR.h - 0.17) / 2, 0);
    // the frosted safety band at eye height on the glass (防撞贴), and a second, lower one
    const band = mergeGeos([new THREE.BoxGeometry(DOOR.leaf - 0.1, 0.07, 0.002).translate(0, 1.42, 0.003), new THREE.BoxGeometry(DOOR.leaf - 0.1, 0.035, 0.002).translate(0, 0.95, 0.003)]);
    leafBands = new THREE.InstancedMesh(band, new THREE.MeshStandardMaterial({ color: 0xdfe4e6, roughness: 0.85, transparent: true, opacity: 0.55 }), Math.max(1, doors.length * 2)); leafBands.name = 'shop-door-bands';
    leafFrames = new THREE.InstancedMesh(fg, leafFrameMat, Math.max(1, doors.length * 2)); leafFrames.name = 'shop-door-leaves';
    leafGlass = new THREE.InstancedMesh(gg, leafGlassMat, Math.max(1, doors.length * 2)); leafGlass.name = 'shop-door-glass'; leafGlass.renderOrder = 2;
    for (const im of [leafFrames, leafGlass, leafBands]) { im.frustumCulled = false; im.castShadow = false; group.add(im); }
    place(true);
    return group;
  }
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
  function place(all) {
    doors.forEach((d, i) => {
      if (!all && !d.moved) return;
      const ang = Math.atan2(d.F.n.x, d.F.n.z); _q.setFromAxisAngle(UP, ang);
      for (const side of [-1, 1]) {
        // closed: the two leaves meet in the middle; open: each slides over its fixed panel
        const u = d.u + side * (DOOR.leaf / 2 + d.open * DOOR.slide);
        _p.copy(d.F.at(u, d.y0, 0.1));
        _m.compose(_p, _q, _s);
        const k = i * 2 + (side > 0 ? 1 : 0);
        leafFrames.setMatrixAt(k, _m); leafGlass.setMatrixAt(k, _m); leafBands.setMatrixAt(k, _m);
      }
      d.moved = false;
    });
    leafFrames.instanceMatrix.needsUpdate = true; leafGlass.instanceMatrix.needsUpdate = true; leafBands.instanceMatrix.needsUpdate = true;
  }

  return {
    group, doors, addFront, build, rooms: Object.keys(ROOMS),
    // per frame: people = a list of { x, z } (the crowd, the shoppers, you); only doors near `eye` are
    // looked at
    update(dt, people, eye) {
      if (!leafFrames || !dt) return;
      spillMat.color.copy(SPILL).multiplyScalar(TOD.shops.value * Math.max(0, 1 - TOD.day.value * 1.15));
      let any = false;
      for (const d of doors) {
        if (eye && Math.abs(d.x - eye.x) + Math.abs(d.z - eye.z) > 90) { if (d.open > 0) { d.open = 0; d.moved = true; any = true; } continue; }
        let near = false;
        for (const p of people) {
          const dx = p.x - d.x, dz = p.z - d.z;
          const along = d.f.axis === 'x' ? dx : dz, across = (d.f.axis === 'x' ? dz : dx) * d.f.out;
          if (Math.abs(along) < 1.9 && across > -1.5 && across < 2.6) { near = true; break; }
        }
        d.hold = near ? 1.6 : Math.max(0, d.hold - dt);
        const want = d.hold > 0 ? 1 : 0, o = d.open + Math.sign(want - d.open) * Math.min(Math.abs(want - d.open), dt / (want ? 0.85 : 1.3));
        if (o !== d.open) { d.open = o; d.moved = true; any = true; }
      }
      if (any) place(false);
    },
    get stats() { return { doors: doors.length, open: doors.filter((d) => d.open > 0.5).length, panes: Object.values(quads).reduce((s, q) => s + q.pos.length / 18, 0) }; },
  };
}

// the light pool: falling off away from the glass (v), and toward the two ends (u)
function poolTexture() {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const x = c.getContext('2d'), d = x.createImageData(64, 64);
  for (let j = 0; j < 64; j++) for (let i = 0; i < 64; i++) {
    const v = j / 63, u = i / 63, fall = Math.pow(1 - v, 3.2), ends = Math.min(1, Math.min(u, 1 - u) / 0.3);
    const k = Math.round(255 * fall * (0.15 + 0.85 * ends * ends)), o = (j * 64 + i) * 4;
    d.data[o] = d.data[o + 1] = d.data[o + 2] = k; d.data[o + 3] = 255;
  }
  x.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// (a few BoxGeometries into one; all non-indexed after toNonIndexed)
function mergeGeos(list) {
  const geos = list.map((g) => (g.index ? g.toNonIndexed() : g));
  const n = geos.reduce((s, g) => s + g.attributes.position.count, 0), pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3);
  let o = 0;
  for (const g of geos) { pos.set(g.attributes.position.array, o * 3); nrm.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  return out;
}
