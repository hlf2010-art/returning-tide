// Drawing the evening crowd (engine/crowd.js).
//   near   the people closest to you (how many: graphics settings, level of detail) are full
//          Rocketbox people: skinned, motion-captured walk and idle, phones up for photos, the
//          guide's flag in hand, real shadows; you can bump into them and talk to them.
//   far    everyone else is an impostor: each avatar was photographed at load time from 8 sides in
//          8 steps of its walk (plus standing still) into one atlas, and is drawn as a camera-facing
//          card showing the right view and step. One draw call for the whole far crowd.
// Far figures are lit by where they stand: the gold wash off the Bund's façades, the promenade
// lamps, the blue of the night sky.
import * as THREE from 'three';
import { createPerson } from './people.js';
import { holdPhone } from './pedestriansReal.js';
import { twoBone } from './driverPose.js';
import { L, deckLamps, DECK_LAMP_X } from './layout.js';
import { flinchPose } from '../engine/flinch.js';

// a reaction to being bumped (engine/social.js kinds, set by main.js on a crowd person) -> clip
const GESTURE = { sorry: 'wave', fine: 'shrug', scold: 'angry', tut: 'look', look: 'look' };

const COLS = 10, ROWS = 8, CW = 48, CH = 96, GRID = 4;     // per avatar: 8 walk steps + standing + phone, 8 sides
const FRAME_W = 1.1, FRAME_H = 2.2;                        // the card in metres (people are ~1.6-1.9 m)

// ---- the impostor atlas: rendered once at load ----
export function bakeImpostors(renderer, people, roles) {
  const W = GRID * COLS * CW, H = Math.ceil(roles.length / GRID) * ROWS * CH;
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.UnsignedByteType, depthBuffer: true, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
  rt.texture.colorSpace = THREE.SRGBColorSpace;            // 8-bit sRGB storage: dark tones keep their steps
  rt.texture.anisotropy = 4;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6a6a6a, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(0.4, 1.2, 2); scene.add(key);
  // one column of the atlas per render: the 8 views of a pose stacked one above the other (an
  // orthographic camera, so stacking changes nothing), scissored to the column. 10 renders per avatar.
  const cam = new THREE.OrthographicCamera(-FRAME_W / 2, FRAME_W / 2, FRAME_H * ROWS, 0, -5, 5);
  cam.position.set(0, 0, 2); cam.lookAt(0, 0, 0); cam.position.set(0, 0, 2);
  const prevTarget = renderer.getRenderTarget(), prevClear = renderer.getClearColor(new THREE.Color()), prevAlpha = renderer.getClearAlpha();
  const prevTone = renderer.toneMapping, prevAuto = renderer.autoClear, prevShadow = renderer.shadowMap.enabled;
  renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.shadowMap.enabled = false;
  renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear();
  rt.scissorTest = true;
  const hips = new THREE.Vector3();
  const cells = {};
  const t0 = performance.now();
  roles.forEach((role, ri) => {
    const bx = ri % GRID, by = Math.floor(ri / GRID);
    cells[role] = [bx, by];
    const views = [];
    for (let k = 0; k < ROWS; k++) {
      const p = createPerson(people, role);
      p.root.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
      scene.add(p.root); views.push(p);
    }
    const clips = people.clips[views[0].sex];
    const walkDur = clips.find((c) => c.name === 'walk').duration;
    const poses = [];
    for (let f = 0; f < 8; f++) poses.push(['walk', walkDur * f / 8]);
    poses.push(['idle', 0.6], ['phone', (clips.find((c) => c.name === 'phone') || { duration: 2 }).duration * 0.4]);
    poses.forEach(([clip, time], col) => {
      // pose each view directly (no cross-fades: they run on the mixer's clock, which this jumps about)
      const name = clips.some((c) => c.name === clip) ? clip : 'idle';
      views.forEach((p, k) => {
        p.mixer.stopAllAction();
        for (const a of [p.actions.base[name], p.actions.arm[name]]) if (a) { a.reset(); a.setEffectiveWeight(1); a.play(); a.time = time; }
        p.mixer.update(0);
        p.root.rotation.set(0, k * Math.PI / 4, 0); p.root.position.set(0, 0, 0); p.root.updateMatrixWorld(true);
        p.bones.chest.getWorldPosition(hips);              // keep the body centred in its cell (walks can drift)
        p.root.position.set(-hips.x, k * FRAME_H, -hips.z); p.root.updateMatrixWorld(true);
      });
      const x = (bx * COLS + col) * CW, y = by * ROWS * CH;
      rt.viewport.set(x, y, CW, CH * ROWS); rt.scissor.set(x, y, CW, CH * ROWS);
      renderer.setRenderTarget(rt);
      renderer.render(scene, cam);
    });
    for (const p of views) { scene.remove(p.root); p.root.traverse((o) => { if (o.isSkinnedMesh) o.skeleton.dispose(); }); }
  });
  console.info(`crowd impostors: ${roles.length} avatars baked in ${Math.round(performance.now() - t0)} ms`);
  rt.scissorTest = false; rt.viewport.set(0, 0, W, H); rt.scissor.set(0, 0, W, H);
  renderer.setRenderTarget(prevTarget); renderer.setClearColor(prevClear, prevAlpha);
  renderer.toneMapping = prevTone; renderer.autoClear = prevAuto; renderer.shadowMap.enabled = prevShadow;
  return { texture: rt.texture, cells, size: [W, H], rt };
}

function impostorMaterial(atlas, size) {
  return new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { atlas: { value: null }, atlasSize: { value: new THREE.Vector2(...size) } }]),
    vertexShader: /* glsl */ `
      attribute vec4 iPos;        // x, y, z, heading
      attribute vec4 iCell;       // block x, block y, pose column, scale
      attribute vec3 iTint;
      uniform vec2 atlasSize;
      varying vec2 vUv; varying vec3 vTint;
      #include <common>
      #include <fog_pars_vertex>
      void main() {
        vec3 wp = iPos.xyz;
        vec3 toCam = cameraPosition - wp; toCam.y = 0.0;
        vec3 f = normalize(toCam + vec3(1e-4, 0.0, 0.0));
        vec3 r = vec3(f.z, 0.0, -f.x);
        float s = iCell.w;
        vec3 p = wp + r * position.x * s + vec3(0.0, position.y * s, 0.0);
        float rel = iPos.w - atan(f.x, f.z);
        float row = mod(floor(rel / (PI / 4.0) + 0.5), 8.0);
        vec2 cell = vec2(iCell.x * ${COLS}.0 + iCell.z, iCell.y * ${ROWS}.0 + row);
        vUv = (cell * vec2(${CW}.0, ${CH}.0) + uv * vec2(${CW}.0, ${CH}.0)) / atlasSize;
        vTint = iTint;
        vec4 mvPosition = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D atlas; varying vec2 vUv; varying vec3 vTint;
      #include <common>
      #include <fog_pars_fragment>
      void main() {
        vec4 c = texture2D(atlas, vUv);
        if (c.a < 0.5) discard;
        gl_FragColor = vec4(c.rgb / max(c.a, 0.001) * vTint, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
}

// the hour's part in it (setCrowdLight, from engine/timeOfDay.js)
const LT = { day: 0, floods: 1, lamps: 1, shops: 1, night: 0 };
export function setCrowdLight(s) { LT.day = s.daylight; LT.floods = s.floods; LT.lamps = s.lamps; LT.shops = s.shops; LT.night = s.night; }
// the light a figure stands in (rgb multiplier on the neutrally lit atlas): at night the sky, the
// floodlit façades, the lamps; by day the hazy daylight
export function lightAt(x, z, y) {
  const dk = 1 - 0.3 * LT.night;
  let r = 0.2 * dk, g = 0.22 * dk, b = 0.33 * dk;                           // blue night sky
  if (x < -20) { const k = Math.min(1, (-20 - x) / 12) * LT.floods; r += 0.62 * k; g += 0.42 * k; b += 0.18 * k; }   // floodlit façades
  if (y > 2) {                                                              // the promenade lamps
    let dz = 1e9; for (const lz of deckLamps) dz = Math.min(dz, Math.abs(lz - z));
    const d2 = dz * dz + (x - DECK_LAMP_X) ** 2, k = Math.exp(-d2 / 90) * LT.lamps;
    r += 0.7 * k + 0.1 * LT.lamps; g += 0.58 * k + 0.08 * LT.lamps; b += 0.4 * k + 0.06 * LT.lamps;
  } else if (x > L.eastCurbX - 1) { r += 0.22 * LT.lamps; g += 0.19 * LT.lamps; b += 0.15 * LT.lamps; }
  if (x < -36 && Math.abs(z + 201) < 13) { const k = Math.max(LT.shops, 0.3) * Math.max(LT.lamps, 0.4); r += 0.35 * k; g += 0.25 * k; b += 0.22 * k; }   // Nanjing Road's shop light
  if (LT.day > 0) { const d = LT.day; r += (1.0 - r) * d; g += (0.99 - g) * d; b += (0.96 - b) * d; }
  return [r, g, b];
}

const FLAG_COLORS = ['#e8302a', '#f4c51b', '#1d6fe0', '#e64ba0'];
function flagMesh(color) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.1, 5), new THREE.MeshStandardMaterial({ color: 0xc8c8c8, metalness: 0.8, roughness: 0.3 }));
  pole.position.y = 0.55; g.add(pole);
  const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(0.42, -0.13); shape.lineTo(0, -0.26); shape.lineTo(0, 0);
  const cloth = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color, roughness: 0.8, side: THREE.DoubleSide, emissive: new THREE.Color(color).multiplyScalar(0.25) }));
  cloth.position.set(0.008, 1.1, 0); g.add(cloth);
  g.userData.cloth = cloth;
  return g;
}

export function createCrowdView({ scene, renderer, people, crowd, roles, nearCount = 16, camera }) {
  const group = new THREE.Group(); group.name = 'crowd'; scene.add(group);
  const atlas = bakeImpostors(renderer, people, roles);
  // the far crowd: one instanced card per person
  const N = crowd.agents.length;
  const base = new THREE.PlaneGeometry(FRAME_W, FRAME_H); base.translate(0, FRAME_H / 2, 0);
  const geo = new THREE.InstancedBufferGeometry(); geo.index = base.index; geo.attributes.position = base.attributes.position; geo.attributes.uv = base.attributes.uv;
  const iPos = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4), iCell = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4), iTint = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
  for (const a of [iPos, iCell, iTint]) a.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('iPos', iPos); geo.setAttribute('iCell', iCell); geo.setAttribute('iTint', iTint);
  geo.instanceCount = 0;
  const mat = impostorMaterial(atlas.texture, atlas.size); mat.uniforms.atlas.value = atlas.texture;
  const far = new THREE.Mesh(geo, mat); far.frustumCulled = false; far.name = 'crowd-impostors';
  group.add(far);
  // soft contact shadows under the far figures
  const blobTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const blobs = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.9, 0.9).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), N);
  blobs.frustumCulled = false; blobs.count = 0; blobs.name = 'crowd-blobs'; group.add(blobs);
  const _m = new THREE.Matrix4();
  // umbrellas in the drizzle: most people have one (each decides at their own point as it gets
  // heavier, and folds it when it stops); the far figures get a canopy over the card
  const UMB_COLORS = ['#1b1b1f', '#1f2a44', '#6e1d29', '#d8d1c2', '#5a5f66', '#2f4a36', '#a8812e', '#1b1b1f', '#3b2f4f', '#b9c2c8'].map((c) => new THREE.Color(c));
  const hash = (i, k) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
  const uOpen = new Float32Array(N);
  const canopyGeo = new THREE.ConeGeometry(0.5, 0.26, 12, 1, true); canopyGeo.translate(0, -0.13, 0);
  const canopyMat = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0, side: THREE.DoubleSide });
  const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, N); canopies.frustumCulled = false; canopies.count = 0; canopies.name = 'crowd-umbrellas';
  for (let i = 0; i < N; i++) canopies.setColorAt(i, UMB_COLORS[0]);
  group.add(canopies);
  const _um = new THREE.Matrix4(), _uq = new THREE.Quaternion(), _us = new THREE.Vector3(), _up = new THREE.Vector3(), _ue = new THREE.Euler();
  let rain = 0;
  function umbrellaFor(a, dt) {
    const carries = !a.child && a.kind !== 'jogger' && hash(a.id, 1) < 0.62;
    const th = 0.14 + hash(a.id, 2) * 0.4;
    const want = carries && (rain > th || (uOpen[a.id] > 0.5 && rain > th - 0.1)) ? 1 : 0;
    uOpen[a.id] += Math.sign(want - uOpen[a.id]) * Math.min(Math.abs(want - uOpen[a.id]), dt / 1.4);
    return uOpen[a.id];
  }

  // the near people: skinned, from per-avatar pools
  const pools = {}, live = new Map();            // agent id -> body
  let made = 0; const cap = Math.max(nearCount * 2, nearCount + 8);
  const phoneMat = new THREE.MeshStandardMaterial({ color: 0x16161a, roughness: 0.3, metalness: 0.5 });
  function body(role) {
    const pool = pools[role] || (pools[role] = []);
    const free = pool.find((b) => !b.agent);
    if (free) return free;
    if (made >= cap) return null;
    made++;
    const person = createPerson(people, role);
    person.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const phone = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.15, 0.009), phoneMat); phone.visible = false;
    group.add(person.root, phone);
    const umb = new THREE.Group(); umb.visible = false;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.72, 6), phoneMat); shaft.position.y = 0.36;
    const cmat = new THREE.MeshStandardMaterial({ roughness: 0.45, side: THREE.DoubleSide });
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.3, 14, 1, true), cmat); canopy.position.y = 0.7; canopy.castShadow = true;
    umb.add(shaft, canopy); group.add(umb);
    const b = { person, phone, agent: null, flag: null, umb, canopy };
    pool.push(b);
    return b;
  }
  const flags = crowd.tours.map((t, i) => { const f = flagMesh(t.flag || FLAG_COLORS[i % 4]); group.add(f); return f; });
  const _e = new THREE.Vector3(), _t = new THREE.Vector3(), _p = new THREE.Vector3(), _h = new THREE.Vector3();
  function raise(b, tx, tz, up = 0) {
    const bones = b._bones || (b._bones = ['Bip01_R_UpperArm', 'Bip01_R_Forearm', 'Bip01_R_Hand'].map((n) => b.person.root.getObjectByName(n)));
    if (!bones[2]) return; b.person.bones.head.getWorldPosition(_e);
    const dx = tx - _e.x, dz = tz - _e.z, d = Math.hypot(dx, dz) || 1, fx = dx / d, fz = dz / d;
    _t.set(_e.x + fx * 0.32 - fz * 0.04, _e.y - 0.05 + up, _e.z + fz * 0.32 + fx * 0.04); _p.set(-fz * 0.8, -1, fx * 0.8).normalize();
    twoBone(bones[0], bones[1], bones[2], _t, _p);
  }
  let nearSet = new Set(), rankT = 0;
  const S = { near: 0, far: 0 };
  const view = {
    group, atlas, stats: S,
    setNearCount(n) { nearCount = n; },
    // who's near enough to be a full person (and to talk to, bump into)
    nearAgents() { return [...live.keys()].map((id) => crowd.agents[id]).filter(Boolean); },
    bodyOf(a) { return live.get(a.id) || null; },
    update(dt, eye, opts = {}) {
      rain = opts.rain || 0;
      // every quarter second: the nearest few become full people (with some hysteresis)
      rankT -= dt;
      if (rankT <= 0) {
        rankT = 0.25;
        const cand = [];
        for (const a of crowd.agents) if (!a.gone) { const d = Math.hypot(a.x - eye.x, a.z - eye.z, (a.y - eye.y) * 2); if (d < 44) cand.push([d - (nearSet.has(a.id) ? 4 : 0), a]); }
        cand.sort((p, q) => p[0] - q[0]);
        nearSet = new Set(cand.slice(0, nearCount).map(([, a]) => a.id));
        for (const [id, b] of live) if (!nearSet.has(id)) { b.agent = null; b.person.root.visible = false; b.phone.visible = false; b.umb.visible = false; live.delete(id); }
        for (const id of nearSet) if (!live.has(id)) {
          const a = crowd.agents[id], b = body(a.role);
          if (!b) { nearSet.delete(id); continue; }
          b.agent = a; live.set(id, b); b.person.root.visible = true; b.person.root.rotation.y = a.heading;
          b.person.root.scale.setScalar(0.01 * (a.scale || 1));                     // the same height as their card
        }
      }
      // full people
      for (const [id, b] of live) {
        const a = crowd.agents[id], root = b.person.root;
        if (a.gone) { b.agent = null; root.visible = false; b.phone.visible = false; b.umb.visible = false; live.delete(id); nearSet.delete(id); continue; }
        root.position.set(a.x, a.y, a.z);
        let dh = a.heading - root.rotation.y; while (dh > Math.PI) dh -= Math.PI * 2; while (dh < -Math.PI) dh += Math.PI * 2;
        root.rotation.y += dh * Math.min(1, dt * 6);
        const moving = a.v > 0.2;
        const act = a.state === 'act' ? a.act : null;
        const gesture = act === 'look' && a.gesture ? GESTURE[a.gesture] : null;
        b.person.play(moving ? (a.kind === 'jogger' && a.v > 1.6 ? 'jog' : 'walk') : gesture || (act === 'look' || a.kind === 'guide' ? 'look' : 'idle'), 0.35);
        b.person.setGait(a.v);
        const phoneWalk = moving && a.phone;
        b.person.setPhoneHold(phoneWalk ? 1 : 0);
        const u = umbrellaFor(a, dt);
        b.person.setUmbrella(u);
        // a bump: the shoulder swings back, a lean away, a glance at whoever it was (engine/flinch.js)
        const fp = a.flinch ? flinchPose(a.flinch) : null;
        b.person.setFlinch(fp);
        b.person.update(dt, fp && fp.look ? fp.look : a.faceTo || (Math.hypot(eye.x - a.x, eye.z - a.z) < 3.5 ? [eye.x, eye.z] : null));
        b.umb.visible = u > 0.02;
        if (b.umb.visible) {
          b.canopy.material.color.copy(UMB_COLORS[Math.floor(hash(a.id, 3) * UMB_COLORS.length)]);
          b.umb.position.copy(b.person.anchors.umbrella.position);
          b.umb.quaternion.setFromEuler(_ue.set(0.06, root.rotation.y, 0, 'YXZ'));
          b.canopy.scale.set(0.15 + 0.85 * u, 0.5 + 0.5 * u, 0.15 + 0.85 * u);
        }
        const photo = u < 0.3 && (act === 'photo' || act === 'selfie');
        if (act === 'photo') raise(b, a.x + 50, a.z);
        if (act === 'selfie') raise(b, a.x - 50, a.z, 0.18);
        b.phone.visible = photo || phoneWalk;
        if (b.phone.visible) { holdPhone(b.phone, b.person, root.rotation.y); if (act === 'photo') b.phone.rotateZ(Math.PI / 2); }
      }
      // the guides' flags: in the hand when near, held up above the card when far
      crowd.tours.forEach((t, i) => {
        const g = t.guide, f = flags[i], b = live.get(g.id);
        f.visible = !g.gone;
        if (b) { b.person.bones.R.getWorldPosition(_h); f.position.copy(_h); }
        else f.position.set(g.x + Math.cos(g.heading) * 0.25, g.y + 1.25, g.z - Math.sin(g.heading) * 0.25);
        f.rotation.y = g.heading + Math.PI / 2 + Math.sin(performance.now() / 600 + i) * 0.25;
      });
      // the far crowd
      let n = 0, nu = 0;
      for (const a of crowd.agents) {
        if (a.gone || live.has(a.id)) continue;
        const dx = a.x - eye.x, dz = a.z - eye.z;
        if (dx * dx + dz * dz > 330 * 330) continue;
        const c = atlas.cells[a.role] || [0, 0];
        const pose = a.v > 0.2 ? Math.floor(a.phase * 8) % 8 : a.state === 'act' && (a.act === 'photo' || a.act === 'selfie') ? 9 : 8;
        iPos.setXYZW(n, a.x, a.y, a.z, a.heading);
        iCell.setXYZW(n, c[0], c[1], pose, a.scale || 1);
        const [r, g, bl] = lightAt(a.x, a.z, a.y); iTint.setXYZ(n, r, g, bl);
        _m.makeTranslation(a.x, a.y + 0.02, a.z); blobs.setMatrixAt(n, _m);
        // an umbrella over the card: up in the raised hand, held a little forward
        const u = umbrellaFor(a, dt);
        if (u > 0.02) {
          const h = (a.child ? 1.35 : 2.02) * (a.scale || 1);
          _up.set(a.x + Math.sin(a.heading) * 0.08, a.y + h, a.z + Math.cos(a.heading) * 0.08);
          _us.set(0.15 + 0.85 * u, 0.5 + 0.5 * u, 0.15 + 0.85 * u);
          _um.compose(_up, _uq.setFromEuler(_ue.set(0.06, a.heading, 0, 'YXZ')), _us); canopies.setMatrixAt(nu, _um);
          canopies.setColorAt(nu, UMB_COLORS[Math.floor(hash(a.id, 3) * UMB_COLORS.length)]); nu++;
        }
        n++;
      }
      canopies.count = nu; if (nu) { canopies.instanceMatrix.needsUpdate = true; canopies.instanceColor.needsUpdate = true; }
      geo.instanceCount = n; blobs.count = n;
      iPos.needsUpdate = iCell.needsUpdate = iTint.needsUpdate = true; blobs.instanceMatrix.needsUpdate = true;
      iPos.clearUpdateRanges(); iCell.clearUpdateRanges(); iTint.clearUpdateRanges();
      iPos.addUpdateRange(0, n * 4); iCell.addUpdateRange(0, n * 4); iTint.addUpdateRange(0, n * 3);
      S.near = live.size; S.far = n;
    },
  };
  return view;
}
