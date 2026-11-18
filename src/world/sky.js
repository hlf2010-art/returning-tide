// Sky dome. The blue hour the game opens in (deep cobalt overhead, a last band of afterglow in the
// west behind the Bund, city haze over Pudong, slow drifting cloud), and from the clock
// (engine/timeOfDay.js): the deep night of a big city (never black: a brown-orange glow under the
// cloud), dawn glowing over Pudong, and a clear sunny November day (blue sky, a few white clouds).
import * as THREE from 'three';
// the sky's own uniforms, shared with whatever reflects it (world/facade.js): one set, set once per tick
export const SKY = { day: { value: 0 }, night: { value: 0 }, glow: { value: 1 }, side: { value: -1 }, haze: { value: 0 }, sunDir: { value: new THREE.Vector3(0, -1, 0) } };

export const FOG_COLOR = new THREE.Color(0.062, 0.105, 0.22);
const FOG_NIGHT = new THREE.Color(0.04, 0.045, 0.065), FOG_DAY = new THREE.Color(0.6, 0.71, 0.86);   // clear air: a pale blue distance, not grey
// the fog's colour at an hour: the blue hour's, the deep night's, the day's haze
export function fogColorAt(s, out = new THREE.Color()) { return out.copy(FOG_COLOR).lerp(FOG_NIGHT, s.night).lerp(FOG_DAY, s.daylight); }
export const REFLECT_LAYER = 1;   // far scenery that the river mirrors

export function createSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    uniforms: { time: { value: 0 }, haze: SKY.haze, day: SKY.day, glow: SKY.glow, side: SKY.side, night: SKY.night, sunDir: SKY.sunDir },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        vec4 p = projectionMatrix * mat4(mat3(viewMatrix)) * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */ `
      uniform float time, haze, day, glow, side, night; uniform vec3 sunDir; varying vec3 vDir;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
      void main() {
        vec3 d = normalize(vDir);
        float h = max(d.y, 0.0);
        // blue hour -> deep night (city glow) -> day (haze)
        vec3 zenith = mix(mix(vec3(0.006, 0.017, 0.07), vec3(0.004, 0.007, 0.02), night), vec3(0.09, 0.27, 0.66), day);
        vec3 mid = mix(mix(vec3(0.02, 0.058, 0.2), vec3(0.016, 0.022, 0.045), night), vec3(0.25, 0.46, 0.8), day);
        vec3 horizon = mix(mix(vec3(0.085, 0.15, 0.32), vec3(0.075, 0.062, 0.07), night), vec3(0.6, 0.72, 0.88), day);
        vec3 col = mix(horizon, mid, smoothstep(0.0, 0.22, h));
        col = mix(col, zenith, smoothstep(0.18, 0.95, h));
        vec2 flat2 = normalize(d.xz + 1e-5);
        // the twilight side: west at dusk (behind the Bund), east at dawn (over Pudong)
        float west = max(flat2.x * side, 0.0), east = max(flat2.x, 0.0);   // (east: Pudong, always)
        col += vec3(1.0, 0.36, 0.1) * pow(west, 3.0) * exp(-h * 5.0) * 0.75 * glow;         // afterglow
        col += vec3(0.6, 0.2, 0.34) * pow(west, 1.8) * exp(-h * 3.0) * 0.26 * glow;
        col += vec3(0.2, 0.15, 0.3) * east * exp(-h * 9.0) * 0.4 * (1.0 - day);            // Lujiazui haze
        // the sun through the haze: a soft disc and a wide bright halo, whiter as it climbs
        float sd = max(dot(d, sunDir), 0.0), up = smoothstep(-0.05, 0.1, sunDir.y);
        col += mix(vec3(1.0, 0.7, 0.4), vec3(1.0, 0.95, 0.85), smoothstep(0.05, 0.4, sunDir.y)) * (pow(sd, 900.0) * 3.0 + pow(sd, 24.0) * 0.32 + pow(sd, 4.0) * 0.1) * up * day;
        // cloud deck, lit pink from the west and violet from the city beneath; by night the city
        // lights it from below, by day it's a pale grey sheet
        vec2 cp = d.xz / (h + 0.12) * 0.55 + vec2(time * 0.004, time * 0.0015);
        float c = smoothstep(0.42, 0.8, fbm(cp * vec2(1.0, 1.5))) * smoothstep(0.02, 0.16, h);
        vec3 cloud = mix(vec3(0.035, 0.05, 0.11), vec3(0.75, 0.3, 0.22), pow(west, 1.5) * exp(-h * 1.6) * glow);
        cloud = mix(cloud, vec3(0.07, 0.055, 0.055) + vec3(0.04, 0.025, 0.015) * exp(-h * 2.0), night * (1.0 - glow));
        cloud += vec3(0.11, 0.07, 0.15) * east * exp(-h * 3.0) * (1.0 - day);
        cloud = mix(cloud, vec3(0.95, 0.96, 0.98) + vec3(0.25, 0.2, 0.12) * pow(sd, 8.0), day);   // a few white fair-weather clouds
        col = mix(col, cloud, c * mix(0.8, 0.22, day) * mix(1.0, smoothstep(0.35, 0.75, c), day));
        if (d.y < 0.0) col = mix(col, mix(vec3(0.03, 0.05, 0.09), vec3(0.55, 0.62, 0.7), day), smoothstep(0.0, -0.2, d.y));
        // drizzle: a thin grey-blue veil low on the horizon only; the zenith keeps its blue hour
        col = mix(col, mix(vec3(0.075, 0.11, 0.2), vec3(0.6, 0.62, 0.64), day), haze * 0.4 * (1.0 - smoothstep(0.0, 0.3, h)));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), mat);
  mesh.frustumCulled = false; mesh.renderOrder = -10; mesh.name = 'sky';
  mesh.layers.enable(REFLECT_LAYER);
  const u = mat.uniforms;
  return {
    mesh,
    update(t, haze = 0) { u.time.value = t; u.haze.value = haze; },
    // the hour (engine/timeOfDay.js todState)
    setTime(s) { u.day.value = s.daylight; u.glow.value = s.glow; u.side.value = s.side; u.night.value = s.night; u.sunDir.value.set(s.sun.x, s.sun.y, s.sun.z); },
  };
}
