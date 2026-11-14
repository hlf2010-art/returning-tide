// Renderer + post: HDR scene -> bloom (lamps, lit towers) -> ACES tone map.
// Quality steps down automatically if real frame time says the GPU can't keep up.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSRPass } from 'three/addons/postprocessing/SSRPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Each step is cheaper than the one before: anti-aliasing goes first, then resolution.
// ssr: screen-space reflections on the wet ground (about 2.5 scene renders), top two steps only
const SSR_LAYER = 3;                                   // ground meshes, for the reflection passes only
// shadows: how many lamps cast shadow maps (lighting.js)
const LADDER = [
  { msaa: 4, scale: 1, ssr: true, shadows: 2 }, { msaa: 2, scale: 1, ssr: true, shadows: 2 }, { msaa: 0, scale: 1, shadows: 1 },
  { msaa: 0, scale: 0.8, shadows: 1 }, { msaa: 0, scale: 0.65, shadows: 0 }, { msaa: 0, scale: 0.5, shadows: 0 },
];

export function createRenderer(canvas, scene, camera, { fixedLevel = null } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.info.autoReset = false;
  // shadow maps are drawn once per frame (main.js sets needsUpdate before the main render), not
  // again for every extra pass (river mirror, SSR) that renders the scene
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;            // (r187: PCFSoft is gone; softness comes from shadow.radius)
  renderer.shadowMap.autoUpdate = false;

  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  let level = fixedLevel ?? (dpr > 1.2 ? 1 : 0);            // hi-dpi screens need less MSAA
  const makeTarget = () => new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: LADDER[level].msaa });
  const composer = new EffectComposer(renderer, makeTarget());
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  // bloom a little tighter than before: lamps glow, they don't fog the frame
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.36, 0.7, 0.94);
  let ssr = null, ssrEnabled = true;                  // created once reflectors are known (setReflectors)
  function usePasses() {
    const want = !!(ssr && ssrEnabled && LADDER[level].ssr);
    composer.passes[0] = want ? ssr : renderPass;
    if (ssr) ssr.beautyRenderTarget.samples = LADDER[level].msaa;
  }
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  function resize() {
    const w = window.innerWidth, h = window.innerHeight, s = dpr * LADDER[level].scale;
    renderer.setPixelRatio(s); renderer.setSize(w, h, false);
    composer.setPixelRatio(s); composer.setSize(w, h);
    bloom.setSize(Math.round(w * s / 2), Math.round(h * s / 2));   // bloom from a half-size source: wide glow, a quarter of the cost
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  function setLevel(n) {
    level = Math.max(0, Math.min(LADDER.length - 1, n));
    composer.reset(makeTarget());
    usePasses();
    resize();
  }
  window.addEventListener('resize', resize);
  resize();

  // Measured in real time (not the clamped simulation step).
  let acc = 0, frames = 0, ms = 16.7, warmup = 4, slowWindows = 0, lastT = performance.now();
  function tick() {
    const now = performance.now(), real = (now - lastT) / 1000; lastT = now;
    if (real > 1) return;                                   // tab was hidden or a one-off hitch: ignore
    if (warmup > 0) { warmup -= real; return; }
    acc += real; frames++;
    if (acc < 2) return;
    ms = (acc / frames) * 1000; acc = 0; frames = 0;
    slowWindows = ms > 25 ? slowWindows + 1 : 0;            // below ~40 fps, twice running
    if (fixedLevel == null && slowWindows >= 2 && level < LADDER.length - 1) { slowWindows = 0; setLevel(level + 1); }
  }
  return {
    renderer, composer, bloom, resize, tick, setLevel,
    get ssr() { return ssr; },
    get reflections() { return composer.passes[0] === ssr; },
    setReflections(on) { ssrEnabled = !!on; usePasses(); },
    // Wet-ground reflections: `selects` are the ground meshes; each may carry userData.ssrMask, a
    // material that writes the per-pixel reflection strength (puddles strong, damp stone faint).
    setReflectors(selects) {
      const size = renderer.getDrawingBufferSize(new THREE.Vector2());
      ssr = new SSRPass({ renderer, scene, camera, width: size.x, height: size.y, selects });
      // SSRPass ships a 16-bit depth texture: with a 0.1 m..4.5 km camera that has no precision left at
      // the Pudong skyline, and the towers' layered surfaces z-fight (white-hot facades). Use 32-bit float.
      ssr.beautyRenderTarget.depthTexture.type = THREE.FloatType;
      ssr.thickness = 0.35; ssr.maxDistance = 60; ssr.opacity = 1; ssr.blur = true; ssr.infiniteThick = false;
      ssr.ssrMaterial.fragmentShader = ssr.ssrMaterial.fragmentShader.replace('float op=opacity;', 'float op=opacity*metalness;');
      ssr.ssrMaterial.needsUpdate = true;
      // The mask pass only draws the ground (its own layer). Its green channel holds the ground's view
      // depth, so anything standing in front of a puddle (people, cars) masks the reflection out.
      // (Normals must stay full-scene: the ray march checks the normal of whatever a ray hits.)
      for (const o of selects) o.layers.enable(SSR_LAYER);
      ssr.ssrMaterial.fragmentShader = ssr.ssrMaterial.fragmentShader.replace('if(metalness==0.) return;',
        'if(metalness==0.) return;\n\t\t\t\tfloat groundZ=texture2D(tMetalness,vUv).g; float vz=getViewZ(getDepth(vUv)); if(abs(groundZ-vz)>0.02*abs(vz)+0.05) return;');
      ssr.ssrMaterial.needsUpdate = true;
      const groundOnly = (fn) => { const m = camera.layers.mask; camera.layers.set(SSR_LAYER); try { fn(); } finally { camera.layers.mask = m; } };
      ssr._renderMetalness = function (r, _o, target) {
        const cc = r.getClearColor(new THREE.Color()), ca = r.getClearAlpha(), ac = r.autoClear, bg = scene.background, fog = scene.fog;
        r.setRenderTarget(target); r.autoClear = false; scene.background = null; scene.fog = null;
        r.setClearColor(0x000000, 0); r.clear();
        for (const c of this._selects) { c._ssrBackup = c.material; c.material = c.userData.ssrMask; }
        groundOnly(() => r.render(scene, camera));
        for (const c of this._selects) c.material = c._ssrBackup;
        r.autoClear = ac; scene.background = bg; scene.fog = fog; r.setClearColor(cc, ca);
      };
      usePasses(); resize();
    },
    get frameMs() { return ms; }, get level() { return level; }, get quality() { return LADDER[level]; },
  };
}
