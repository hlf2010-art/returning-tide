// The glass in the two lobbies you can walk into (world/interiors.js): the Peace Hotel's revolving door
// and its windows on the Bund, No.17's bronze doors and fanlight, the speed gates' wings and balustrades.
//
// Glass reflects about 4% of the light straight on and nearly all of it at a grazing angle (Fresnel), from
// either side, and lets the rest through. The reflection is not "part of the glass's opacity": a pane
// that is mostly see-through can still hold a bright mirror image. So the material here is drawn with
// premultiplied blending: what it reflects is added on top, and what is behind it is let through by
// (1 - F) × transmission, instead of one fixed opacity scaling both down together.
//
// What makes a shop window a mirror by day and a lit showcase by night is not the glass but the light on
// either side of it, and the eye adapting to the brighter side. The renderer doesn't model adaptation
// across a pane, so the material carries it:
//   - from the street by day, the lobby is ten or twenty times dimmer than the pavement: little of it gets
//     through to an eye set for daylight, and the street's reflection dominates;
//   - from inside by day, the street outside is bright through the glass and the faint reflection of the
//     room hardly shows;
//   - after dark it flips: from outside, the lit lobby glows through clear glass; from inside, the black
//     night barely comes through and the windows hold the lamplit room like dark mirrors.
// Seen from inside, the glass reflects the room itself: a cube map captured in each lobby (glass hidden),
// box-projected onto the room's walls so the reflection has the right parallax (the chandelier, the
// pillars and the desk sit where they should in the window, not at infinity). From outside it reflects the
// street (scene.environment). The gates' glass stands inside the lobby, so it always shows the room.
import * as THREE from 'three';
import { TOD } from './dayNight.js';

const ROOMS = [];   // { id, box: Box3, probe: Vector3, env, mats: [], inside, near, at }

// a lobby the glass belongs to: its room box (for the box projection and to tell inside from outside) and
// where to capture it from
export function lobbyRoom(id, { x0, x1, z0, z1, y0, y1, probe }) {
  const room = { id, box: new THREE.Box3(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1)), probe: new THREE.Vector3(...probe), env: null, mats: [], inside: 0, near: false, at: null };
  ROOMS.push(room);
  return room;
}

// clear glass for a room. interior: glass inside the room (seen from either side it shows the room). mirror: a
// silvered glass (a dressing or bathroom mirror): all reflection of the room, nothing through
export function lobbyGlass(room, { interior = false, mirror = false, roughness = 0.03, edge = 0x9db8b4, tint = 0xdedcd6 } = {}) {
  const U = {
    gTrans: { value: 1 }, gGain: { value: 1 }, gBox: { value: 0 }, gMirror: { value: mirror ? 1 : 0 },
    gBoxMin: { value: room.box.min }, gBoxMax: { value: room.box.max }, gProbe: { value: room.probe },
    gEdge: { value: new THREE.Color(edge) },
  };
  const m = mirror
    ? new THREE.MeshStandardMaterial({ color: tint, roughness: 0.02, metalness: 1, envMapIntensity: 1 })   // (a metal's specular is its colour: the silvering)
    : new THREE.MeshStandardMaterial({ color: 0x000000, roughness, metalness: 0, transparent: true, premultipliedAlpha: true, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1 });
  m.userData.lobbyGlass = { room, interior: interior || mirror, mirror, U };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGW;')
      .replace('#include <fog_vertex>', '#include <fog_vertex>\nvGW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    // the box projection: the reflected ray is followed to the room's walls, and the cube map is looked
    // up toward that point from where it was captured
    const pars = THREE.ShaderChunk.envmap_physical_pars_fragment.replace(
      'reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );',
      `reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
      if (gBox > 0.5) {
        vec3 rv = reflectVec, t1 = (gBoxMax - vGW) / rv, t2 = (gBoxMin - vGW) / rv, tf = max(t1, t2);
        float d = min(min(tf.x, tf.y), tf.z);
        if (d > 0.0) reflectVec = normalize(vGW + rv * d - gProbe);
      }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
      varying vec3 vGW;
      uniform float gTrans, gGain, gBox, gMirror; uniform vec3 gBoxMin, gBoxMax, gProbe, gEdge;`)
      .replace('#include <envmap_physical_pars_fragment>', pars)
      // what is reflected (three's own specular: the room or the street, and the lamps' and the sun's
      // highlights, already weighted by Fresnel for a dielectric) is added; what is behind is let through
      // by (1 - F) × the transmission. Premultiplied: rgb is the added light, alpha how much of what's
      // behind is held back.
      .replace('#include <opaque_fragment>', `
      if (gMirror > 0.5) { gl_FragColor = vec4(outgoingLight, 1.0); } else {
      float gNV = clamp(dot(geometryNormal, geometryViewDir), 0.0, 1.0);
      float gF = 0.04 + 0.96 * pow(1.0 - gNV, 5.0);
      float gT = (1.0 - gF) * gTrans * mix(0.9, 0.55, pow(1.0 - gNV, 3.0));   // (a pane seen edgewise is a long path through glass: greener, less through)
      float gA = clamp(1.0 - gT, 0.0, 1.0);
      vec3 gRefl = outgoingLight * gGain + gEdge * 0.012 * pow(1.0 - gNV, 2.0) * (0.3 + gGain);
      gl_FragColor = vec4(gRefl / max(gA, 1e-3), gA); }`);
  };
  m.customProgramCacheKey = () => (mirror ? 'lobby-mirror-v1' : 'lobby-glass-v1');
  room.mats.push(m);
  return m;
}

// once a frame: who is where, how light it is, which reflection each pane shows
export function updateLobbyGlass(dt, pp) {
  const day = TOD.day.value, k = Math.min(1, dt * 8);
  for (const room of ROOMS) {
    const b = room.box, inR = pp.x > b.min.x && pp.x < b.max.x && pp.z > b.min.z && pp.z < b.max.z && pp.y > b.min.y - 1 && pp.y < b.min.y + 3.5;   // (on its own storey: room 612 is over the hall)
    room.inside += ((inR ? 1 : 0) - room.inside) * (dt > 0 ? k : 1);
    const s = room.inside, haveEnv = !!room.env;
    for (const m of room.mats) {
      const { interior, U } = m.userData.lobbyGlass;
      let trans, gain;
      if (interior) { trans = 0.94; gain = 1.0; }
      else {
        // outside: day 0.3 through / reflection ×3.2, night 1.0 / ×1.0; inside: day 1.0 / ×0.8, night 0.3 / ×6
        const tOut = THREE.MathUtils.lerp(1.0, 0.3, day), gOut = THREE.MathUtils.lerp(1.0, 3.2, day);
        const tIn = THREE.MathUtils.lerp(0.3, 1.0, day), gIn = THREE.MathUtils.lerp(6.0, 0.8, day);
        trans = THREE.MathUtils.lerp(tOut, tIn, s); gain = THREE.MathUtils.lerp(gOut, gIn, s);
      }
      U.gTrans.value = trans; U.gGain.value = gain;
      // the room's own reflection when you're in it (or for the gates, always); the street's otherwise
      const useRoom = haveEnv && (interior || s > 0.5);
      const want = useRoom ? room.env : null;
      if (m.envMap !== want) { m.envMap = want; m.needsUpdate = true; }
      U.gBox.value = useRoom ? 1 : 0;
      m.envMapIntensity = useRoom ? 1.0 : 1.0;
    }
  }
}

// capture each room you're near (from its probe, the glass hidden) when you first come near it, and again
// when the light has changed (the hour, the floods): what the lobby glass reflects from inside
// (half a second after you come near: by then whatever draws the room, which may be another module's, is showing)
export function captureLobbies(renderer, scene, pp, force = false, dt = 1 / 60) {
  if (!renderer) return 0;
  let n = 0;
  const day = TOD.day.value;
  for (const room of ROOMS) {
    const b = room.box, near = pp.x > b.min.x - 6 && pp.x < b.max.x + 6 && pp.z > b.min.z - 6 && pp.z < b.max.z + 6 && pp.y > b.min.y - 2 && pp.y < b.min.y + 4;   // (not from the storey below: it isn't drawn from there)
    if (!near) { room.nearT = 0; continue; }
    room.nearT = (room.nearT || 0) + dt;
    if (!force && room.nearT < 0.5) continue;
    if (!force && room.env && room.at != null && Math.abs(room.at - day) < 0.15) continue;
    const rt = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
    const cam = new THREE.CubeCamera(0.1, 60, rt);   // (the far plane culls the rest of the city: only the room and the street outside it)
    cam.position.copy(room.probe);
    // (without the panes, and without people: whoever stood there would stay in the glass, frozen, after they'd
    // gone, and from inside you'd see your own headless first-person body in the window)
    const hidden = [];
    for (const r of ROOMS) for (const m of r.mats) { if (m.visible) { m.visible = false; hidden.push(m); } }
    for (const c of scene.children) { if (!c.visible) continue; let person = false; c.traverse((o) => { if (o.isSkinnedMesh) person = true; }); if (person) { c.visible = false; hidden.push(c); } }
    scene.updateMatrixWorld(true);
    cam.update(renderer, scene);
    for (const m of hidden) m.visible = true;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromCubemap(rt.texture).texture;
    rt.dispose(); pmrem.dispose();
    const old = room.env; room.env = env; room.at = day;
    for (const m of room.mats) if (m.envMap === old) { m.envMap = null; }   // (picked up again on the next update)
    if (old) old.dispose();
    n++;
  }
  return n;
}

export const lobbyRooms = () => ROOMS;
