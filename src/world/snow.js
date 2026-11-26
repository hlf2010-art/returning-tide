// Snow near the player (Shanghai's rare winter snow and sleet: engine/climate.js): soft flakes in a box that follows the
// camera and wraps, drifting down slowly on the wind with a sway of their own, animated entirely in the vertex shader.
// Like the rain (world/rain.js) they fade close to the eye and far off, thin out when it's light, and never fall
// under a roof. It doesn't settle: Shanghai's snow rarely does, it wets the paving instead (engine/weather.js).
import * as THREE from 'three';
import { covers } from './layout.js';
import { RAIN_LAYER } from './rain.js';

const N = 2400;
const BOX = new THREE.Vector3(24, 12, 24);

export function createSnow() {
  const seed = new Float32Array(N * 4), pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) seed.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 4));
  const coverXZ = covers.map((c) => new THREE.Vector4(c.x0, c.x1, c.z0, c.z1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { time: { value: 0 }, snow: { value: 0 }, cam: { value: new THREE.Vector3() }, box: { value: BOX }, windOff: { value: new THREE.Vector2() },
      coverXZ: { value: coverXZ }, coverTop: { value: covers.map((c) => c.top) }, scale: { value: 600 } },
    vertexShader: /* glsl */ `
      #define NC ${covers.length}
      attribute vec4 seed;
      uniform float time, snow, scale; uniform vec3 cam, box; uniform vec2 windOff;
      uniform vec4 coverXZ[NC]; uniform float coverTop[NC];
      varying float vA;
      void main() {
        float fall = 0.7 + seed.w * 0.7;                                     // flakes: slow, each its own speed
        vec3 p;
        p.y = cam.y - box.y * 0.4 + mod(seed.y * box.y - time * fall, box.y);
        vec2 sway = vec2(sin(time * (0.6 + seed.x) + seed.z * 40.0), cos(time * (0.5 + seed.z) + seed.x * 30.0)) * 0.35;
        p.xz = cam.xz + mod(seed.xz * box.xz - cam.xz + windOff * (0.7 + seed.w * 0.6) + sway + box.xz * 0.5, box.xz) - box.xz * 0.5;
        float d = distance(p, cam);
        float a = smoothstep(0.8, 2.0, d) * (1.0 - smoothstep(9.0, 12.0, d));
        float pick = fract(sin(dot(seed.zw, vec2(12.9898, 78.233))) * 43758.5453);
        a *= step(pick, snow) * min(1.0, snow * 1.6);
        for (int i = 0; i < NC; i++) { vec4 c = coverXZ[i]; if (p.x > c.x && p.x < c.y && p.z > c.z && p.z < c.w && p.y < coverTop[i]) a = 0.0; }
        vA = a;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        gl_PointSize = (0.035 + seed.x * 0.04) * scale / max(0.5, -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() { if (vA < 0.004) discard; vec2 c = gl_PointCoord - 0.5; float r = dot(c, c) * 4.0; if (r > 1.0) discard; gl_FragColor = vec4(vec3(0.95, 0.97, 1.0), vA * (1.0 - r) * 0.85); }`,
  });
  const mesh = new THREE.Points(geo, mat);
  mesh.name = 'snow'; mesh.frustumCulled = false; mesh.visible = false; mesh.renderOrder = 5;
  mesh.layers.set(RAIN_LAYER);
  let lastT = 0;
  return {
    mesh,
    // wind: [dx, dz] the flakes' drift (m/s); viewH: the drawing height in pixels (for the flakes' size)
    update(time, snow, camera, { wind = null, viewH = 720 } = {}) {
      mesh.visible = snow > 0.002;
      const dt = Math.min(0.25, Math.max(0, time - lastT)); lastT = time;
      if (!mesh.visible) return;
      const u = mat.uniforms; u.time.value = time; u.snow.value = snow; u.cam.value.copy(camera.position); u.scale.value = viewH * 0.9;
      if (wind) { u.windOff.value.x += wind[0] * dt; u.windOff.value.y += wind[1] * dt; }
    },
  };
}
