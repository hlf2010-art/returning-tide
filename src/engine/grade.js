// The last step on screen: what a camera adds. A soft vignette, a trace of lens fringing toward the
// corners, and fine film grain that moves (stronger in the shadows, where real sensors show it).
// All small: the point is that the image stops looking like clean CG, not that anyone notices.
// Runs after the output pass (display space), once, at screen resolution: a handful of texture reads.
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null }, time: { value: 0 },
    vignette: { value: 0.24 }, fringe: { value: 0.0016 }, grain: { value: 0.032 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float time, vignette, fringe, grain;
    varying vec2 vUv;
    float hash(vec2 p) { p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
    void main() {
      vec2 d = vUv - 0.5; float r2 = dot(d, d);
      // lens fringing: red and blue a hair apart, only toward the edges
      vec2 off = d * r2 * fringe * 4.0;
      vec3 c = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      // vignette
      c *= 1.0 - vignette * smoothstep(0.08, 0.62, r2 * 1.6);
      // grain: per pixel, re-rolled ~24 times a second, strongest in the darks
      float g = hash(gl_FragCoord.xy + floor(time * 24.0) * 17.31) - 0.5;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c += g * grain * (1.0 - smoothstep(0.0, 0.7, l));
      gl_FragColor = vec4(c, 1.0);
    }`,
};

export function createGradePass() {
  const pass = new ShaderPass(GradeShader);
  pass.name = 'grade';
  return pass;
}
