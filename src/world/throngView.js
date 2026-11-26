// Nanjing Road's throng, drawn (engine/throng.js decides who walks where): every person a camera-facing
// card from the far crowd's impostor atlas (world/crowdView.js bakeImpostors), the right side of them and
// the right step of their walk. Where they are is worked out in the vertex shader from the time and a few
// numbers each, so the whole throng is one draw call and nothing per person on the main thread.
// Faded in and out with a screen-door dither (no blending, no sorting): near the camera, where the
// simulated crowd takes over, and at the ends of each stretch of street.
import * as THREE from 'three';
import { THRONG, buildThrong } from '../engine/throng.js';
import { COLS, ROWS, CW, CH, FRAME_W, FRAME_H, coatOf, lightAt, crowdDaylight } from './crowdView.js';

const Y = 0.15;   // the pedestrian street's paving (world/layout.js groundHeight)

// keep in step with engine/throng.js throngAt and throngDistanceFade
const VERT = /* glsl */ `
  attribute vec4 iTrack;      // xEast, xWest, z, speed (signed; 0 stands)
  attribute vec4 iPhase;      // start, weave phase, stride phase, hash
  attribute vec4 iLook;       // atlas block x, block y, pose (-1/-2 walking, 8 standing, 9 photographing), heading
  attribute vec4 iCoat;       // coat tint rgb, scale
  uniform float uTime, uActive;
  uniform vec3 uLight;
  uniform vec2 atlasSize;
  uniform vec4 uFade;         // near in, near full, far start, far gone
  varying vec2 vUv; varying vec3 vTint; varying float vFade;
  #include <common>
  #include <fog_pars_vertex>
  float sm(float a, float b, float x) { float t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
  void main() {
    float len = iTrack.x - iTrack.y, v = iTrack.w, fade = clamp((uActive - iPhase.w) * 25.0, 0.0, 1.0);
    vec3 wp; float heading = iLook.w, pose = iLook.z;
    if (v == 0.0) { wp = vec3(iPhase.x, ${Y.toFixed(2)}, iTrack.z); }
    else {
      float av = abs(v), s = mod(iPhase.x + av * uTime, len);
      wp = vec3(v < 0.0 ? iTrack.x - s : iTrack.y + s, ${Y.toFixed(2)}, iTrack.z + 0.22 * sin(0.35 * uTime + iPhase.y));
      fade *= sm(0.0, ${THRONG.endFade.toFixed(1)}, s) * sm(0.0, ${THRONG.endFade.toFixed(1)}, len - s);
      heading = v < 0.0 ? -PI / 2.0 : PI / 2.0;
      pose = mod(floor(fract(iPhase.z + av * uTime / ${THRONG.stride.toFixed(2)}) * 8.0), 8.0);
    }
    float d = distance(cameraPosition.xz, wp.xz);
    fade *= sm(uFade.x, uFade.y, d) * (1.0 - sm(uFade.z, uFade.w, d));
    vFade = fade;
    if (fade < 0.01) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }   // (nothing to draw: off the screen)
    vec3 toCam = cameraPosition - wp; toCam.y = 0.0;
    vec3 f = normalize(toCam + vec3(1e-4, 0.0, 0.0));
    vec3 r = vec3(f.z, 0.0, -f.x);
    float sc = iCoat.w;
    vec3 p = wp + r * position.x * sc + vec3(0.0, position.y * sc, 0.0);
    float rel = heading - atan(f.x, f.z);
    float row = mod(floor(rel / (PI / 4.0) + 0.5), 8.0);
    vec2 cell = vec2(iLook.x * ${COLS}.0 + pose, iLook.y * ${ROWS}.0 + row);
    vUv = (cell * vec2(${CW}.0, ${CH}.0) + uv * vec2(${CW}.0, ${CH}.0)) / atlasSize;
    vTint = uLight * iCoat.rgb;
    vec4 mvPosition = viewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;
const FRAG = /* glsl */ `
  uniform sampler2D atlas; varying vec2 vUv; varying vec3 vTint; varying float vFade;
  #include <common>
  #include <fog_pars_fragment>
  void main() {
    if (vFade < 0.999) { float dz = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))); if (dz >= vFade) discard; }
    vec4 c = texture2D(atlas, vUv);
    if (c.a < 0.5) discard;
    gl_FragColor = vec4(c.rgb / max(c.a, 0.001) * vTint, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }`;

// atlas: crowdView's (texture, cells, size); roles: the avatars to dress them as (keys of atlas.cells)
export function createThrongView({ group, atlas, roles, count }) {
  const T = buildThrong({ count, roles: roles.length });
  const base = new THREE.PlaneGeometry(FRAME_W, FRAME_H); base.translate(0, FRAME_H / 2, 0);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index; geo.attributes.position = base.attributes.position; geo.attributes.uv = base.attributes.uv;
  const look = new Float32Array(T.n * 4), coat = new Float32Array(T.n * 4), c = new THREE.Color();
  for (let i = 0; i < T.n; i++) {
    const cell = atlas.cells[roles[T.look[i * 4]]] || [0, 0];
    look.set([cell[0], cell[1], T.look[i * 4 + 2], T.look[i * 4 + 3]], i * 4);
    coatOf(100000 + i, c); const ck = 0.45;                 // (the coat, paler, as the far crowd's cards)
    coat.set([1 - ck + ck * c.r, 1 - ck + ck * c.g, 1 - ck + ck * c.b, T.look[i * 4 + 1]], i * 4);
  }
  geo.setAttribute('iTrack', new THREE.InstancedBufferAttribute(T.track, 4));
  geo.setAttribute('iPhase', new THREE.InstancedBufferAttribute(T.phase, 4));
  geo.setAttribute('iLook', new THREE.InstancedBufferAttribute(look, 4));
  geo.setAttribute('iCoat', new THREE.InstancedBufferAttribute(coat, 4));
  geo.instanceCount = T.n;
  const mat = new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      atlas: { value: null }, atlasSize: { value: new THREE.Vector2(...atlas.size) },
      uTime: { value: 0 }, uActive: { value: 1 }, uLight: { value: new THREE.Vector3(1, 1, 1) },
      uFade: { value: new THREE.Vector4(THRONG.near[0], THRONG.near[1], THRONG.far[0], THRONG.far[1]) },
    }]),
    vertexShader: VERT, fragmentShader: FRAG,
  });
  mat.uniforms.atlas.value = atlas.texture;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false; mesh.name = 'nanjing-throng';
  group.add(mesh);
  let time = 0, active = 1;
  return {
    data: T, mesh,
    get time() { return time; }, get active() { return active; },
    // per frame: seconds passed, the share of the evening's people out (the simulated crowd's), the rain
    update(dt, share = 1, rain = 0) {
      time = (time + dt) % THRONG.wrap;
      active = Math.max(0, Math.min(1, share * (1 - 0.55 * rain)));
      // the street's light on them; after dark a little lower than the far crowd's cards, to sit with the
      // scene-lit people nearer (the atlas is lit evenly from the front: shirts would glow down the street)
      const l = lightAt(-300, NJ_ZC, 0), k = 0.72 + 0.28 * crowdDaylight();
      mat.uniforms.uTime.value = time; mat.uniforms.uActive.value = active; mat.uniforms.uLight.value.set(l[0] * k, l[1] * k, l[2] * k);
      mesh.visible = active > 0.005 && T.n > 0;
    },
    setCount(n) { geo.instanceCount = Math.max(0, Math.min(T.n, Math.round(n))); },
    dispose() { group.remove(mesh); geo.dispose(); mat.dispose(); },
  };
}
const NJ_ZC = -201;
