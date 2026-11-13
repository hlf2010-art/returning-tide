// The Huangpu. One big quad; the shader mirrors the far bank using a second, cheap
// render of only the far-scenery layer, then smears it into long vertical streaks.
import * as THREE from 'three';
import { L } from './layout.js';
import { Batch } from './geo.js';
import { REFLECT_LAYER } from './sky.js';

export function createRiver() {
  const group = new THREE.Group(); group.name = 'river';
  const target = new THREE.WebGLRenderTarget(1024, 512, { type: THREE.HalfFloatType });
  const mirrorCam = new THREE.PerspectiveCamera();
  mirrorCam.layers.set(REFLECT_LAYER);
  const texMatrix = new THREE.Matrix4();

  const mat = new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      tReflect: { value: null }, texMatrix: { value: texMatrix }, time: { value: 0 },
    }]),
    vertexShader: /* glsl */ `
      uniform mat4 texMatrix; varying vec4 vRefl; varying vec3 vWorld;
      #include <common>
      #include <fog_pars_vertex>
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz; vRefl = texMatrix * wp;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tReflect; uniform float time;
      varying vec4 vRefl; varying vec3 vWorld;
      #include <common>
      #include <fog_pars_fragment>
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      float waves(vec2 p, float fine) {
        float t = time;
        float h = noise(p * 0.09 + vec2(t * 0.05, t * 0.11)) * 1.0;        // tidal swell, running north
        h += noise(p * 0.31 + vec2(-t * 0.16, t * 0.21)) * 0.5;
        h += noise(p * 0.9 + vec2(t * 0.33, -t * 0.27)) * 0.25 * fine;     // chop fades with distance (no far-field sparkle)
        h += noise(p * 2.3 + vec2(t * 0.6, t * 0.5)) * 0.12 * fine * fine;
        return h;
      }
      void main() {
        vec3 toCam = cameraPosition - vWorld;
        float dist = length(toCam);
        vec3 V = toCam / dist;
        vec2 p = vWorld.xz;
        float e = 0.35 + dist * 0.004;
        float fine = exp(-dist / 140.0);
        float h0 = waves(p, fine);
        vec2 grad = vec2(waves(p + vec2(e, 0.0), fine) - h0, waves(p + vec2(0.0, e), fine) - h0) / e;
        vec3 n = normalize(vec3(-grad.x * 0.9, 1.0, -grad.y * 0.9));
        float fres = 0.03 + 0.97 * pow(1.0 - max(dot(V, n), 0.0), 4.0);
        // mirrored far bank, smeared mostly downward like light on moving water
        vec2 uv = vRefl.xy / vRefl.w;
        vec2 wob = n.xz * vec2(0.035, 0.2);
        vec3 refl = vec3(0.0);
        refl += texture2D(tReflect, uv + wob).rgb * 0.4;
        refl += texture2D(tReflect, uv + wob * vec2(0.5, 2.1) + vec2(0.0, 0.012)).rgb * 0.3;
        refl += texture2D(tReflect, uv + wob * vec2(-0.6, 3.4) + vec2(0.0, 0.03)).rgb * 0.3;
        vec3 deep = vec3(0.008, 0.02, 0.035);
        vec3 col = mix(deep, refl, fres);
        // crests pick up a touch of sky
        col += vec3(0.05, 0.08, 0.14) * smoothstep(1.25, 1.6, h0) * 0.35;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  mat.uniforms.tReflect.value = target.texture;
  mat.uniforms.texMatrix.value = texMatrix;      // UniformsUtils.merge clones; point back at the live matrix

  const water = new THREE.Mesh(new THREE.PlaneGeometry(1700, 3200), mat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(L.deckEdgeX + 850 - 4, L.waterY, 0);
  water.name = 'water';
  group.add(water);

  // ---- river traffic: slow, lit, far enough away to stay simple ----
  const boats = [];
  const hullMat = new THREE.MeshBasicMaterial({ color: 0x0b1018 });
  const cabinMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.05, 0.8, 0.5) });
  const lineMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 0.7, 1.2) });
  function boat({ x, z, len, speed, kind }) {
    const g = new THREE.Group(), hull = new Batch(), lights = new Batch(), trim = new Batch();
    if (kind === 'cruise') {
      hull.box(0, 0, 0, 9, 2.2, len);
      lights.box(0, 2.2, -2, 7.6, 2.4, len * 0.74); lights.box(0, 4.6, -4, 6.4, 2.2, len * 0.5);
      trim.box(0, 6.9, -4, 6.8, 0.25, len * 0.52); trim.box(0, 2.1, 0, 9.2, 0.25, len + 0.2);
      for (const sx of [-1, 1]) trim.box(sx * 3.3, 6.9, -4 + len * 0.26, 0.2, 5, 0.2);
    } else {
      hull.box(0, 0, 0, 12, 1.5, len); hull.box(0, 1.5, 4, 11, 1.4, len * 0.7);       // laden barge
      hull.box(0, 1.5, -len / 2 + 5, 7, 5, 7);
      lights.box(0, 4.6, -len / 2 + 5, 7.1, 1.2, 7.1);
      trim.box(0, 7, -len / 2 + 5, 0.3, 3, 0.3);
    }
    g.add(hull.mesh(hullMat), lights.mesh(cabinMat), trim.mesh(kind === 'cruise' ? lineMat : cabinMat));
    g.position.set(x, L.waterY, z);
    if (speed > 0) g.rotation.y = Math.PI;      // bow leads
    g.traverse((o) => { o.layers.enable(REFLECT_LAYER); o.matrixAutoUpdate = o === g; });
    group.add(g);
    boats.push({ g, speed });
  }
  boat({ x: 210, z: 160, len: 46, speed: -2.6, kind: 'cruise' });
  boat({ x: 330, z: -260, len: 70, speed: 3.4, kind: 'barge' });
  boat({ x: 120, z: -420, len: 58, speed: 2.2, kind: 'barge' });

  const _n = new THREE.Vector3(0, 1, 0), _v = new THREE.Vector3(), _t = new THREE.Vector3(), _r = new THREE.Matrix4();
  const _wp = new THREE.Vector3(0, L.waterY, 0), _cp = new THREE.Vector3(), _look = new THREE.Vector3();

  return {
    group, boats,
    update(t, dt) {
      mat.uniforms.time.value = t;
      for (const b of boats) {
        b.g.position.z += b.speed * dt;
        if (b.g.position.z > 700) b.g.position.z = -700; else if (b.g.position.z < -700) b.g.position.z = 700;
        b.g.position.y = L.waterY + Math.sin(t * 0.6 + b.speed) * 0.12;
      }
    },
    // Render the mirrored far scenery. Call once per frame before the main render.
    renderReflection(renderer, scene, camera) {
      _cp.setFromMatrixPosition(camera.matrixWorld);
      if (_cp.y < L.waterY) return;
      _wp.set(_cp.x, L.waterY, _cp.z);
      _v.subVectors(_wp, _cp).reflect(_n).negate().add(_wp);
      _r.extractRotation(camera.matrixWorld);
      _look.set(0, 0, -1).applyMatrix4(_r).add(_cp);
      _t.subVectors(_wp, _look).reflect(_n).negate().add(_wp);
      mirrorCam.position.copy(_v);
      mirrorCam.up.set(0, 1, 0).applyMatrix4(_r).reflect(_n);
      mirrorCam.lookAt(_t);
      mirrorCam.near = camera.near; mirrorCam.far = camera.far;
      mirrorCam.updateMatrixWorld();
      mirrorCam.projectionMatrix.copy(camera.projectionMatrix);
      mirrorCam.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
      texMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
      texMatrix.multiply(mirrorCam.projectionMatrix).multiply(mirrorCam.matrixWorldInverse);
      const prev = renderer.getRenderTarget();
      water.visible = false;
      renderer.setRenderTarget(target);
      renderer.clear();
      renderer.render(scene, mirrorCam);
      renderer.setRenderTarget(prev);
      water.visible = true;
    },
  };
}
