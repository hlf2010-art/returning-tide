// People's reflections in the paving. Polished granite and damp stone at night mirror the people walking
// on them: a dim, soft, upside-down figure under each, darkest at the feet. Screen-space reflections
// (engine/renderer.js, High lighting) can only mirror what's on the screen and only in puddles; this is a
// planar mirror of the people alone, so it works everywhere on the street and costs one extra, small
// render of the people (no buildings, no shadows), at a fraction of the screen's resolution.
//
// How: every person (world/people.js createPerson, the instanced crowd, Nanjing Road's throng) is on
// PEOPLE_LAYER as well as their own. Each frame a camera mirrored in the ground under the eye renders that
// layer alone into a small target; the ground materials (world/materials.js mirrorPeople) look it up
// where they are, blurred more the rougher the stone, stronger at a grazing angle (Fresnel) and wherever
// it's wet. Only ground within a hand's breadth of the mirror's height takes it (the deck 3 m up, seen
// from the street, doesn't).
import * as THREE from 'three';

export const PEOPLE_LAYER = 5;          // 1: the river's far scenery, 2: player camera only, 3: SSR ground
export const PEOPLE_REFLECT_FAR = 45;   // people further than this aren't drawn in the mirror (a few pixels)

// shared with every ground material that mirrors people (materials.js mirrorPeople)
export const peopleMirror = {
  tPeople: { value: null },
  peopleMatrix: { value: new THREE.Matrix4() },
  peopleOn: { value: 0 },               // 0 off (Lighting: Low, interiors, the mirror not drawn this frame)
  peopleY: { value: 0.15 },             // the mirror plane's height
  peopleTexel: { value: new THREE.Vector2(1 / 512, 1 / 256) },
};

const _cp = new THREE.Vector3(), _wp = new THREE.Vector3(), _v = new THREE.Vector3(), _look = new THREE.Vector3(), _t = new THREE.Vector3();
const _r = new THREE.Matrix4(), _n = new THREE.Vector3(0, 1, 0), _clear = new THREE.Color();

export function createPeopleReflection() {
  const target = new THREE.WebGLRenderTarget(16, 16, { type: THREE.HalfFloatType });
  target.texture.generateMipmaps = false;
  peopleMirror.tPeople.value = target.texture;
  const cam = new THREE.PerspectiveCamera();
  cam.layers.set(PEOPLE_LAYER);
  let scale = 0.5, on = true;
  return {
    target, camera: cam,
    get enabled() { return on; },
    // on/off (graphics settings), and the mirror's resolution as a share of the screen's
    set(enabled, s = scale) { on = !!enabled; scale = s; if (!on) peopleMirror.peopleOn.value = 0; },
    // mirror the people in the plane y = planeY, as seen from `camera`; before the main render
    render(renderer, scene, camera, planeY) {
      peopleMirror.peopleOn.value = 0;
      if (!on) return;
      _cp.setFromMatrixPosition(camera.matrixWorld);
      if (_cp.y < planeY + 0.2) return;
      const size = renderer.getDrawingBufferSize(_v), w = Math.max(64, Math.round(size.x * scale)), h = Math.max(32, Math.round(size.y * scale));
      if (target.width !== w || target.height !== h) target.setSize(w, h);
      peopleMirror.peopleTexel.value.set(1 / w, 1 / h);
      // the camera reflected in the plane, looking at the reflection of what it looks at (as world/river.js)
      _n.set(0, 1, 0);
      _wp.set(_cp.x, planeY, _cp.z);
      _v.subVectors(_wp, _cp).reflect(_n).negate().add(_wp);
      _r.extractRotation(camera.matrixWorld);
      _look.set(0, 0, -1).applyMatrix4(_r).add(_cp);
      _t.subVectors(_wp, _look).reflect(_n).negate().add(_wp);
      cam.position.copy(_v);
      cam.up.set(0, 1, 0).applyMatrix4(_r).reflect(_n);
      cam.lookAt(_t);
      cam.near = camera.near; cam.far = Math.min(camera.far, PEOPLE_REFLECT_FAR * 2);
      cam.updateMatrixWorld();
      cam.projectionMatrix.copy(camera.projectionMatrix);
      cam.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
      const M = peopleMirror.peopleMatrix.value;
      M.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
      M.multiply(cam.projectionMatrix).multiply(cam.matrixWorldInverse);
      const prev = renderer.getRenderTarget(), bg = scene.background, alpha = renderer.getClearAlpha();
      renderer.getClearColor(_clear);
      scene.background = null;                                  // (people on clear: alpha says where someone is)
      renderer.setRenderTarget(target);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
      renderer.render(scene, cam);
      renderer.setRenderTarget(prev);
      renderer.setClearColor(_clear, alpha);
      scene.background = bg;
      peopleMirror.peopleY.value = planeY;
      peopleMirror.peopleOn.value = 1;
    },
    dispose() { target.dispose(); },
  };
}

// put an object (and everything under it) in the mirror
export function reflectPeople(obj) { obj.traverse((o) => { if (o.isMesh) o.layers.enable(PEOPLE_LAYER); }); return obj; }

// GLSL for a ground material: `mirrorPeopleAt(roughness, NoV, wet, sheen)` -> rgb to add and how much of the
// ground's own light the figure hides (a). Declared in the fragment's common section.
export const PEOPLE_MIRROR_GLSL = /* glsl */ `
  uniform sampler2D tPeople; uniform mat4 peopleMatrix; uniform float peopleOn, peopleY; uniform vec2 peopleTexel;
  varying vec3 vPeopleWorld;
  vec4 mirrorPeopleAt(float rough, float NoV, float wet, float sheen) {
    if (peopleOn < 0.5 || abs(vPeopleWorld.y - peopleY) > 0.25) return vec4(0.0);
    vec4 pc = peopleMatrix * vec4(vPeopleWorld.x, peopleY, vPeopleWorld.z, 1.0);
    vec2 uv = pc.xy / pc.w;
    if (pc.w <= 0.0 || uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0);
    // blurred, mostly up and down (light on stone smears along the line of sight), more on rougher stone
    float spread = mix(1.5, 12.0, clamp(rough, 0.0, 1.0));
    vec2 dy = vec2(0.0, peopleTexel.y * spread), dx = vec2(peopleTexel.x * spread * 0.35, 0.0);
    vec4 c = texture2D(tPeople, uv) * 0.28
      + (texture2D(tPeople, uv + dy) + texture2D(tPeople, uv - dy)) * 0.2
      + (texture2D(tPeople, uv + 2.2 * dy) + texture2D(tPeople, uv - 2.2 * dy)) * 0.08
      + (texture2D(tPeople, uv + dx) + texture2D(tPeople, uv - dx)) * 0.08;
    // how much the stone mirrors: Schlick's Fresnel (F0 about 4% for stone), most at a grazing angle; honed
    // granite has a sheen even dry, damp stone and standing water far more. sheen: the material's own
    // (polished granite above 1, asphalt well below)
    float F = 0.04 + 0.96 * pow(1.0 - NoV, 5.0);
    float k = clamp((0.8 * F + 0.1) * sheen * mix(1.0, 2.2, wet) * mix(1.0, 0.6, clamp(rough - 0.5, 0.0, 0.5) * 2.0 * (1.0 - wet)), 0.0, 0.85);
    return vec4(c.rgb * k, c.a * k);
  }`;
