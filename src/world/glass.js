// Glass that behaves like glass, for the panes in the lobbies and rooms: doors, windows, the AIA gates' wings and
// their balustrades.
//   - You see what's behind the pane, nearly all of it, plus a reflection of what's on your side. The two are
//     summed (blended ONE, ONE_MINUS_SRC_ALPHA), so the reflection is no weaker for the glass being clear. (Plain
//     transparency scales the reflection by the opacity, which leaves clear glass with almost none.)
//   - Fresnel (Schlick): little reflection looking straight through, nearly a mirror at a grazing angle, and less
//     seen through it there.
//   - The reflection is of the side you're standing on. Outside, it's the street: the captured environment, which
//     follows the hour. Inside, it's the room: its lamplit floor below and its ceiling above. So the brighter side
//     wins, as it does in life. By day, from the street the doors mirror the Bund and the hall is dim behind them,
//     while from the hall the windows are clear onto the river. At night the lit hall shows through from outside,
//     and from inside the dark panes give back the room.
// f0 is for two faces of plain glass (about 4% each); `through` is what the glass passes (a slight loss).
// The eye is adapted to the side it stands on, which a single exposure can't show. From the bright side, what lies
// beyond the glass looks dimmer and the reflection stands out more; that's applied by the hour (TOD.day) to which
// side you're on. Panes with the same room on both sides (`between`, e.g. the AIA gates) are left as they are.
import * as THREE from 'three';
import { TOD } from './dayNight.js';

const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
// The room's own reflection, when a probe has been taken (createRoomProbe): a cube map of the room from its middle,
// looked up box-projected (the reflected ray followed to the room's walls, floor or ceiling, and that point looked
// up from where the cube was taken), so the hall's lamps, pillars and floor sit where they should in the panes.
// Until then (or with none), a floor-to-ceiling gradient.
// box: { min: [x, y, z], max: [x, y, z] }, the room the pane belongs to (where "inside" is); proj: the room's
// surfaces for the projection (its real ceiling height), default box
// room: { floor: [r, g, b], ceil: [r, g, b] }, linear radiance of the room's lower and upper halves
export function sidedGlass({ box, proj = box, room, f0 = 0.08, through = 0.9, tint = [0.92, 0.97, 0.96], between = false, name = 'glass' }) {
  const m = new THREE.MeshStandardMaterial({ name, color: 0x000000, roughness: 0.03, metalness: 0, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false });   // (no fog: it would be added on top of the fogged scene behind)
  m.blending = THREE.CustomBlending; m.blendEquation = THREE.AddEquation;
  m.blendSrc = THREE.OneFactor; m.blendDst = THREE.OneMinusSrcAlphaFactor;
  m.blendSrcAlpha = THREE.OneFactor; m.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
  const U = {
    gBoxMin: { value: v3(box.min) }, gBoxMax: { value: v3(box.max) },
    gFloor: { value: v3(room.floor) }, gCeil: { value: v3(room.ceil) },
    gTint: { value: v3(tint) }, gF0: { value: f0 }, gThrough: { value: through }, gBetween: { value: between ? 1 : 0 }, gDay: TOD.day,
    gRoom: { value: null }, gHasRoom: { value: 0 }, gProbe: { value: new THREE.Vector3() }, gProjMin: { value: v3(proj.min) }, gProjMax: { value: v3(proj.max) },
  };
  m.userData.glass = U;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGWorld;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvGWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 gBoxMin, gBoxMax, gFloor, gCeil, gTint, gProbe, gProjMin, gProjMax; uniform float gF0, gThrough, gBetween, gDay, gHasRoom; uniform samplerCube gRoom; varying vec3 vGWorld;')
      .replace('#include <opaque_fragment>', `{
        vec3 gV = normalize( vViewPosition ), gN = normalize( normal );          // (normal faces the eye: two-sided)
        float cosT = clamp( dot( gN, gV ), 0.0, 1.0 );
        float F = gF0 + ( 1.0 - gF0 ) * pow( 1.0 - cosT, 5.0 );
        vec3 Rw = transformDirectionByInverseViewMatrix( reflect( - gV, gN ), viewMatrix );
        bool inside = all( greaterThan( cameraPosition, gBoxMin ) ) && all( lessThan( cameraPosition, gBoxMax ) );
        vec3 env = mix( gFloor, gCeil, smoothstep( -0.45, 0.45, Rw.y ) );
        if ( inside && gHasRoom > 0.5 ) {
          vec3 Rs = Rw + vec3( equal( Rw, vec3( 0.0 ) ) ) * 1e-4;
          vec3 tf = max( ( gProjMax - vGWorld ) / Rs, ( gProjMin - vGWorld ) / Rs );
          vec3 hit = vGWorld + Rw * max( 0.0, min( min( tf.x, tf.y ), tf.z ) );
          env = textureCube( gRoom, hit - gProbe ).rgb;
        }
        #ifdef USE_ENVMAP
          if ( ! inside ) env = getIBLRadiance( gV, gN, 0.02 );
        #endif
        // adaptation: inside by night (and outside by day) the far side dims and the reflection tells more
        float kT = inside ? mix( 0.45, 1.0, gDay ) : mix( 1.0, 0.5, gDay ), kR = inside ? mix( 3.0, 1.0, gDay ) : mix( 1.0, 2.2, gDay );
        kT = mix( kT, 1.0, gBetween ); kR = mix( kR, 1.0, gBetween );
        vec3 refl = env * min( 1.0, F * kR ) * gTint + reflectedLight.directSpecular;
        gl_FragColor = vec4( refl, 1.0 - ( 1.0 - F ) * gThrough * kT );
      }`);
  };
  m.customProgramCacheKey = () => 'sided-glass';
  return m;
}

// a probe of the room for the glass: a cube map rendered from `at` (with the panes themselves hidden), handed to
// every material given. take() renders it (a frame's hitch; call it once inside, again when the hour has moved on)
export function createRoomProbe(mats, at, size = 256) {
  const rt = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType, generateMipmaps: false });
  const cam = new THREE.CubeCamera(0.1, 200, rt); cam.position.set(at[0], at[1], at[2]);
  for (const m of mats) { m.userData.glass.gRoom.value = rt.texture; m.userData.glass.gProbe.value.set(at[0], at[1], at[2]); }
  return {
    taken: false, day: -1,
    take(renderer, scene) {
      const hidden = [];
      scene.traverse((o) => { if (o.isMesh && o.visible && mats.includes(o.material)) { o.visible = false; hidden.push(o); } });
      cam.update(renderer, scene);
      for (const o of hidden) o.visible = true;
      for (const m of mats) m.userData.glass.gHasRoom.value = 1;
      this.taken = true; this.day = Math.round(TOD.day.value);
    },
  };
}
