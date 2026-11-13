// Blue-hour sky dome: deep cobalt overhead, a last band of afterglow in the west
// (behind the Bund), city haze over Pudong in the east, slow drifting cloud.
import * as THREE from 'three';

export const FOG_COLOR = new THREE.Color(0.062, 0.105, 0.22);
export const REFLECT_LAYER = 1;   // far scenery that the river mirrors

export function createSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    uniforms: { time: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        vec4 p = projectionMatrix * mat4(mat3(viewMatrix)) * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */ `
      uniform float time; varying vec3 vDir;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
      void main() {
        vec3 d = normalize(vDir);
        float h = max(d.y, 0.0);
        vec3 zenith = vec3(0.006, 0.017, 0.07), mid = vec3(0.02, 0.058, 0.2), horizon = vec3(0.085, 0.15, 0.32);
        vec3 col = mix(horizon, mid, smoothstep(0.0, 0.22, h));
        col = mix(col, zenith, smoothstep(0.18, 0.95, h));
        vec2 flat2 = normalize(d.xz + 1e-5);
        float west = max(-flat2.x, 0.0), east = max(flat2.x, 0.0);
        col += vec3(1.0, 0.36, 0.1) * pow(west, 3.0) * exp(-h * 5.0) * 0.75;         // afterglow
        col += vec3(0.6, 0.2, 0.34) * pow(west, 1.8) * exp(-h * 3.0) * 0.26;
        col += vec3(0.2, 0.15, 0.3) * east * exp(-h * 9.0) * 0.4;                    // Lujiazui haze
        // cloud deck, lit pink from the west and violet from the city beneath
        vec2 cp = d.xz / (h + 0.12) * 0.55 + vec2(time * 0.004, time * 0.0015);
        float c = smoothstep(0.42, 0.8, fbm(cp * vec2(1.0, 1.5))) * smoothstep(0.02, 0.16, h);
        vec3 cloud = mix(vec3(0.035, 0.05, 0.11), vec3(0.75, 0.3, 0.22), pow(west, 1.5) * exp(-h * 1.6));
        cloud += vec3(0.11, 0.07, 0.15) * east * exp(-h * 3.0);
        col = mix(col, cloud, c * 0.8);
        if (d.y < 0.0) col = mix(col, vec3(0.03, 0.05, 0.09), smoothstep(0.0, -0.2, d.y));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), mat);
  mesh.frustumCulled = false; mesh.renderOrder = -10; mesh.name = 'sky';
  mesh.layers.enable(REFLECT_LAYER);
  return { mesh, update(t) { mat.uniforms.time.value = t; } };
}
