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
  // Huangpu River cruise boats (浦江游览) at night: two or three decks of big warm windows, every edge
  // traced in LED strips that drift through colours, the top deck open with lights strung over it
  const lineMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 0.7, 1.2) });
  const lineMat2 = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 1.4, 1.8) });
  const winTex = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
    x.fillStyle = '#1a1210'; x.fillRect(0, 0, 256, 64);
    for (let i = 0; i < 16; i++) { const g = x.createLinearGradient(0, 8, 0, 56); g.addColorStop(0, '#fff3d8'); g.addColorStop(1, i % 5 === 2 ? '#e7a96a' : '#f6cf96'); x.fillStyle = g; x.fillRect(i * 16 + 2, 8, 12, 46); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t;
  })();
  const windowMat = new THREE.MeshBasicMaterial({ map: winTex }); windowMat.color.setScalar(1.25);
  function boat({ x, z, len, speed, kind, decks = 2, line = lineMat }) {
    const g = new THREE.Group(), hull = new Batch(), lights = new Batch(), trim = new Batch();
    if (kind === 'cruise') {
      hull.box(0, 0, 0, 10, 2.4, len);
      let y = 2.4;
      for (let d = 0; d < decks; d++) {
        const w = 9 - d * 0.8, l = len * (0.82 - d * 0.14), zc = -1.5 - d * 2;
        lights.box(0, y, zc, w, 2.5, l);
        trim.box(0, y + 2.5, zc, w + 0.3, 0.22, l + 0.3); trim.box(0, y - 0.05, zc, w + 0.5, 0.18, l + 0.5);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) trim.box(sx * (w / 2 + 0.1), y, zc + sz * (l / 2 + 0.1), 0.18, 2.6, 0.18);
        y += 2.7;
      }
      trim.box(0, 2.3, 0, 10.3, 0.22, len + 0.3);
      for (const sx of [-1, 1]) trim.box(sx * 3.2, y, -len * 0.1, 0.12, 2.2, 0.12);       // the mast for the strung lights
    } else {
      hull.box(0, 0, 0, 12, 1.5, len); hull.box(0, 1.5, 4, 11, 1.4, len * 0.7);       // laden barge
      hull.box(0, 1.5, -len / 2 + 5, 7, 5, 7);
      lights.box(0, 4.6, -len / 2 + 5, 7.1, 1.2, 7.1);
      trim.box(0, 7, -len / 2 + 5, 0.3, 3, 0.3);
    }
    if (kind === 'cruise') {
      // the cabins' sides: rows of windows (texture repeats along the length)
      const cab = lights.mesh(windowMat); cab.geometry.attributes.uv && (() => { const uv = cab.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * len / 8); })();
      g.add(hull.mesh(hullMat), cab, trim.mesh(line));
    } else g.add(hull.mesh(hullMat), lights.mesh(cabinMat), trim.mesh(cabinMat));
    g.position.set(x, L.waterY, z);
    if (speed > 0) g.rotation.y = Math.PI;      // bow leads
    g.traverse((o) => { o.layers.enable(REFLECT_LAYER); o.matrixAutoUpdate = o === g; });
    group.add(g);
    boats.push({ g, speed });
  }
  boat({ x: 210, z: 160, len: 46, speed: -2.6, kind: 'cruise' });
  boat({ x: 280, z: -120, len: 58, speed: 2.0, kind: 'cruise', decks: 3, line: lineMat2 });
  boat({ x: 360, z: 420, len: 40, speed: -1.7, kind: 'cruise', decks: 2, line: lineMat2 });
  boat({ x: 330, z: -260, len: 70, speed: 3.4, kind: 'barge' });
  boat({ x: 120, z: -420, len: 58, speed: 2.2, kind: 'barge' });

  const _n = new THREE.Vector3(0, 1, 0), _v = new THREE.Vector3(), _t = new THREE.Vector3(), _r = new THREE.Matrix4();
  const _wp = new THREE.Vector3(0, L.waterY, 0), _cp = new THREE.Vector3(), _look = new THREE.Vector3();

  return {
    group, boats,
    update(t, dt) {
      mat.uniforms.time.value = t;
      lineMat.color.setHSL((0.9 + t * 0.012) % 1, 0.85, 0.62).multiplyScalar(2.2);       // the LED outlines drift through colours
      lineMat2.color.setHSL((0.5 + t * 0.009) % 1, 0.85, 0.6).multiplyScalar(2.2);
      for (const b of boats) {
        b.g.position.z += b.speed * dt;
        if (b.g.position.z > 700) b.g.position.z = -700; else if (b.g.position.z < -700) b.g.position.z = 700;
        b.g.position.y = L.waterY + Math.sin(t * 0.6 + b.speed) * 0.12;
      }
    },
    // the reflection's resolution (graphics settings): width in pixels, half as tall
    setMirrorSize(w) { target.setSize(w, Math.round(w / 2)); },
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
