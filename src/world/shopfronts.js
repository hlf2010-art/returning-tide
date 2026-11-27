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
import { brushedTextures } from './surfaceDetail.js';
import { makeCanvas, tex, FONT } from './canvas.js';

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
  丝绸: 'witsand_woolshop', 时装: 'decor_shop', 鞋帽: 'decor_shop', 箱包: 'decor_shop', 运动: 'decor_shop', 书店: 'decor_shop',
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
  // the shop's light on the pavement in front of the glass, fading out over `reach` m; it spills a little
  // past the ends of the opening (`side` m each way), so neighbouring bays' pools run into each other
  // and no edge of it is ever a line
  function pool(F, ua, ub, y, reach = 4.0, side = 0.7) {
    ua -= side; ub += side;
    const p = [F.at(ua, y, 0.06), F.at(ub, y, 0.06), F.at(ub, y, reach), F.at(ua, y, reach)], uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
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
  function addFront(f, u0, u1, { y0 = 0.15, top = 4.1, doorAt = [], type = null, room: roomId = null, depth = 5, transom = 2.9 } = {}) {
    const F = frame(f), id = roomId || roomFor(type, rnd), ys = ROOMS[id].yaws;
    let yi = Math.floor(rnd() * ys.length);                 // each room along the front turned to another wall: no twin bays
    // a room behind the stretch of front from ua to ub (along the front), a little wider than it
    const roomOver = (ua, ub, d = depth) => {
      const sA = F.at(ua, 0, 0).dot(F.T), sB = F.at(ub, 0, 0).dot(F.T);
      return { id, s0: Math.min(sA, sB) - 0.5, s1: Math.max(sA, sB) + 0.5, y0, y1: top + 0.25, depth: d, yaw: ys[yi++ % ys.length] };
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
        pane(F, room, ba, bb, y0 + 0.32, top, 0.045); pool(F, ba, bb, y0 + 0.012);
        fbox(metal, F, f, cu, y0 + 0.32, 0.02, w, 0.06, 0.1);                                  // sill
        fbox(metal, F, f, cu, top - 0.07, 0.02, w, 0.09, 0.1);                                 // head
        if (transom != null && y0 + transom < top - 0.2) fbox(metal, F, f, cu, y0 + transom, 0.03, w, 0.07, 0.08);   // transom
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
      pane(F, dr, u - DOOR.half, u + DOOR.half, y0 + DOOR.h + 0.42, top, 0.045); pool(F, u - DOOR.half, u + DOOR.half, y0 + 0.012, 4.6);
      fbox(metal, F, f, u, y0 + DOOR.h + 0.05, 0.0, DOOR.half * 2 + 0.2, 0.37, 0.3);            // the operator box
      for (const e of [u - DOOR.half - 0.04, u + DOOR.half + 0.04]) fbox(metal, F, f, e, y0, 0.0, 0.1, DOOR.h + 0.42, 0.18);
      for (const e of [u - DOOR.leaf, u + DOOR.leaf]) fbox(metal, F, f, e, y0, 0.02, 0.05, DOOR.h + 0.05, 0.05);   // the fixed panels' stiles
      fbox(stone, F, f, u, y0 - 0.005, 0, DOOR.half * 2 + 0.3, 0.012, 0.6);
      const led = F.at(u + DOOR.half - 0.3, y0 + DOOR.h + 0.2, 0.31); lamp.box(led.x, led.y, led.z, 0.03, 0.03, 0.03);
      doors.push({ u, f, F, y0, open: 0, hold: 0, x: F.at(u, 0, 0).x, z: F.at(u, 0, 0).z });
    }
    return { id, yaw: ys[0] };
  }

  // ---- the meshes ----
  const group = new THREE.Group(); group.name = 'shopfronts';
  const leafFrameMat = new THREE.MeshStandardMaterial({ color: 0x23201c, metalness: 0.75, roughness: 0.32 });
  const leafGlassMat = new THREE.MeshStandardMaterial({ color: 0x0b1012, metalness: 0.0, roughness: 0.03, transparent: true, opacity: 0.22, depthWrite: false, envMapIntensity: 1.2 });
  let leafFrames = null, leafGlass = null, leafBands = null;
  // the light pools: warm, brightest at the glass, soft at the ends; added to the paving after dark
  const spillMat = new THREE.MeshBasicMaterial({ map: poolTexture(), color: new THREE.Color(0, 0, 0), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, toneMapped: true });
  const SPILL = new THREE.Color(1.0, 0.72, 0.42).multiplyScalar(0.13);
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
    // close up: the frames are brushed bronze, the risers polished granite (UVs are metres / 2: geo.js Batch.box)
    const br = brushedTextures(), brR = br.roughnessMap.clone(), brN = br.normalMap.clone(); brR.repeat.set(4, 4); brN.repeat.set(4, 4);
    const bronze = new THREE.MeshStandardMaterial({ color: 0x2a241d, metalness: 0.8, roughness: 0.7, roughnessMap: brR, normalMap: brN, normalScale: new THREE.Vector2(0.25, 0.25) });
    const riser = new THREE.MeshStandardMaterial({ color: 0x4a4642, metalness: 0.05, roughness: 0.16 });
    if (typeof document !== 'undefined') new THREE.TextureLoader().load('./textures/granite_tile_04_diff_1k.jpg', (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.3, 1.3); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; riser.map = t; riser.needsUpdate = true; });
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
    // the stickers every Nanjing Road door wears on its fixed panels, at eye height: the opening hours on one side,
    // the automatic-door and mind-the-glass notices on the other (they don't move with the leaves)
    if (doors.length && typeof document !== 'undefined') {
      const deco = new THREE.PlaneGeometry(0.3, 0.42);
      for (const [kind, side] of [['hours', -1], ['notice', 1]]) {
        const mat = new THREE.MeshStandardMaterial({ map: stickerTexture(kind), roughness: 0.6, transparent: true, emissive: 0xffffff, emissiveIntensity: 0.12, polygonOffset: true, polygonOffsetFactor: -2 });
        mat.emissiveMap = mat.map;
        const im = new THREE.InstancedMesh(deco, mat, doors.length); im.name = `shop-door-${kind}`; im.castShadow = false;
        doors.forEach((d, i) => { _q.setFromAxisAngle(UP, Math.atan2(d.F.n.x, d.F.n.z)); _p.copy(d.F.at(d.u + side * (DOOR.leaf + 0.62), d.y0 + 1.38, 0.032)); _m.compose(_p, _q, _s); im.setMatrixAt(i, _m); });
        im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); group.add(im);
      }
    }
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
        if (TOD.shops.value < 0.5) near = false;                               // (shut for the night: the doors stay closed)
        d.hold = near ? 1.6 : Math.max(0, d.hold - dt);
        const want = d.hold > 0 ? 1 : 0, o = d.open + Math.sign(want - d.open) * Math.min(Math.abs(want - d.open), dt / (want ? 0.85 : 1.3));
        if (o !== d.open) { d.open = o; d.moved = true; any = true; }
      }
      if (any) place(false);
    },
    get stats() { return { doors: doors.length, open: doors.filter((d) => d.open > 0.5).length, panes: Object.values(quads).reduce((s, q) => s + q.pos.length / 18, 0) }; },
  };
}

// a door sticker, 300 x 420 mm, on clear film
function stickerTexture(kind) {
  const [c, x] = makeCanvas(256, 360);
  x.clearRect(0, 0, 256, 360);
  const round = (px, py, w, h, r) => { x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r); x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath(); };
  x.textAlign = 'center'; x.textBaseline = 'middle';
  if (kind === 'hours') {
    x.fillStyle = 'rgba(250,250,247,0.92)'; round(8, 8, 240, 220, 14); x.fill();
    x.fillStyle = '#222'; x.font = `700 30px ${FONT.sans}`; x.fillText('营业时间', 128, 46);
    x.font = `500 16px ${FONT.sans}`; x.fillText('OPENING HOURS', 128, 76);
    x.fillStyle = '#b81c22'; x.fillRect(40, 94, 176, 2);
    x.fillStyle = '#222'; x.font = `600 22px ${FONT.sans}`; x.fillText('周一至周日', 128, 124); x.font = `700 34px ${FONT.sans}`; x.fillText('10:00 – 22:00', 128, 166);
    x.font = `500 14px ${FONT.sans}`; x.fillStyle = '#555'; x.fillText('MON – SUN', 128, 200);
    x.fillStyle = 'rgba(250,250,247,0.92)'; round(78, 250, 100, 100, 10); x.fill();         // a payment QR card
    x.fillStyle = '#111'; for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) if ((i * 7 + j * 13 + i * j) % 3 === 0) x.fillRect(88 + i * 9, 260 + j * 9, 8, 8);
    for (const [a, b] of [[88, 260], [146, 260], [88, 318]]) { x.fillRect(a, b, 22, 22); x.fillStyle = '#fff'; x.fillRect(a + 4, b + 4, 14, 14); x.fillStyle = '#111'; x.fillRect(a + 8, b + 8, 6, 6); }
  } else {
    x.fillStyle = 'rgba(28,98,170,0.95)'; round(18, 10, 220, 150, 12); x.fill();
    x.fillStyle = '#fff'; x.font = `700 34px ${FONT.sans}`; x.fillText('自动门', 128, 60); x.font = `500 16px ${FONT.sans}`; x.fillText('AUTOMATIC DOOR', 128, 96);
    x.font = `500 18px ${FONT.sans}`; x.fillText('请慢行  ⇆', 128, 128);
    x.fillStyle = 'rgba(250,200,20,0.95)'; x.beginPath(); x.moveTo(128, 190); x.lineTo(218, 340); x.lineTo(38, 340); x.closePath(); x.fill();
    x.strokeStyle = '#111'; x.lineWidth = 6; x.stroke(); x.fillStyle = '#111'; x.font = `900 64px ${FONT.sans}`; x.fillText('!', 128, 290);
    x.font = `700 18px ${FONT.sans}`; x.fillText('小心玻璃', 128, 330);
  }
  return tex(c, { repeat: false });
}
// the light pool: brightest at the glass (v = 0) and falling off smoothly away from it, and toward the two
// ends (u), to nothing at every edge of the quad. Linear values (no sRGB decode, which would steepen the
// fall into a hard rim); the canvas's top row is v = 1 (flipY), so it is drawn from the far edge down.
function poolTexture() {
  if (typeof document === 'undefined') return null;
  const W = 64, H = 128, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'), d = x.createImageData(W, H);
  const sm = (a, b, t) => { const k = Math.min(1, Math.max(0, (t - a) / (b - a))); return k * k * (3 - 2 * k); };
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const v = 1 - j / (H - 1), u = i / (W - 1);
    // along: a soft exponential from the glass that eases to zero at the far edge
    const fall = Math.exp(-3.2 * v) * (1 - sm(0.45, 1, v));
    // across: full over the opening, rolling off over the spill at each end; a little wider further out
    const e = 0.2 + 0.06 * v, ends = sm(0, e, u) * sm(0, e, 1 - u);
    const k = Math.round(255 * fall * ends), o = (j * W + i) * 4;
    d.data[o] = d.data[o + 1] = d.data[o + 2] = k; d.data[o + 3] = 255;
  }
  x.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; return t;
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
