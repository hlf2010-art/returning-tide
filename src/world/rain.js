// Light drizzle near the player: one LineSegments mesh, animated entirely in the vertex shader
// (no per-frame CPU work, nothing created or destroyed when the weather changes). Drops live in a
// box that follows the camera and wraps; they fade out close to the eye (never screen-filling)
// and far away, thin out with intensity, and never fall inside a covered place.
import * as THREE from 'three';
import { covers } from './layout.js';

export const RAIN_LAYER = 2;            // player camera only (the river's mirror camera renders layer 1)
const N = 1200;                          // at full drizzle; fewer are drawn at lower intensity
const BOX = new THREE.Vector3(22, 11, 22);

export function createRain() {
  const pos = new Float32Array(N * 2 * 3), seed = new Float32Array(N * 2 * 4), tip = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) {
    const s = [Math.random(), Math.random(), Math.random(), Math.random()];
    for (let v = 0; v < 2; v++) { seed.set(s, (i * 2 + v) * 4); tip[i * 2 + v] = v; }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));               // unused, positions come from seeds
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 4));
  geo.setAttribute('tip', new THREE.BufferAttribute(tip, 1));
  const coverXZ = covers.map((c) => new THREE.Vector4(c.x0, c.x1, c.z0, c.z1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: {
      time: { value: 0 }, rain: { value: 0 }, cam: { value: new THREE.Vector3() }, box: { value: BOX },
      coverXZ: { value: coverXZ }, coverTop: { value: covers.map((c) => c.top) },
      color: { value: new THREE.Color(0.62, 0.68, 0.8) },
    },
    vertexShader: /* glsl */ `
      #define NC ${covers.length}
      attribute vec4 seed; attribute float tip;
      uniform float time, rain; uniform vec3 cam, box;
      uniform vec4 coverXZ[NC]; uniform float coverTop[NC];
      varying float vA; varying vec3 vP;   // vP: world position (read only by the verification tool)
      void main() {
        float speed = 4.2 + seed.w * 1.6;                       // drizzle: small, slow drops
        vec2 wind = vec2(0.45, 0.15);                           // a breath off the river
        vec3 p;
        p.y = cam.y - box.y * 0.4 + mod(seed.y * box.y - time * speed, box.y);
        p.xz = cam.xz + mod(seed.xz * box.xz - cam.xz + wind * time + box.xz * 0.5, box.xz) - box.xz * 0.5;
        vec3 dir = normalize(vec3(wind.x, -speed, wind.y));
        vec3 head = p, tail = p - dir * 0.22;                     // short streak trailing upward
        p = tip > 0.5 ? tail : head;
        float d = distance(p, cam);
        float a = smoothstep(1.4, 2.6, d) * (1.0 - smoothstep(8.0, 10.5, d));
        float pick = fract(sin(dot(seed.xy, vec2(12.9898, 78.233))) * 43758.5453);   // independent of position
        a *= step(pick, rain);                                   // density: fewer drops in lighter rain
        a *= rain;
        for (int i = 0; i < NC; i++) {                         // the whole streak goes if either end is under a roof
          vec4 c = coverXZ[i];
          if (head.x > c.x && head.x < c.y && head.z > c.z && head.z < c.w && head.y < coverTop[i]) a = 0.0;
          if (tail.x > c.x && tail.x < c.y && tail.z > c.z && tail.z < c.w && tail.y < coverTop[i]) a = 0.0;
        }
        vA = a * (1.0 - tip);                                    // bright head, fading tail
        vP = p;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 color; varying float vA;
      void main() { if (vA < 0.004) discard; gl_FragColor = vec4(color, vA * 0.32); }`,
  });
  const mesh = new THREE.LineSegments(geo, mat);
  mesh.name = 'rain'; mesh.frustumCulled = false; mesh.visible = false; mesh.renderOrder = 5;
  mesh.layers.set(RAIN_LAYER);
  return {
    mesh,
    update(time, rain, camera) {
      mesh.visible = rain > 0.002;                               // zero cost when clear
      if (!mesh.visible) return;
      mat.uniforms.time.value = time; mat.uniforms.rain.value = rain; mat.uniforms.cam.value.copy(camera.position);
    },
  };
}
