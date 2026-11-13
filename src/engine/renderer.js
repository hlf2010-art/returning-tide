// Renderer + post: HDR scene -> bloom (lamps, lit towers) -> ACES tone map.
// Quality steps down automatically if real frame time says the GPU can't keep up.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Each step is cheaper than the one before: anti-aliasing goes first, then resolution.
const LADDER = [
  { msaa: 4, scale: 1 }, { msaa: 2, scale: 1 }, { msaa: 0, scale: 1 },
  { msaa: 0, scale: 0.8 }, { msaa: 0, scale: 0.65 }, { msaa: 0, scale: 0.5 },
];

export function createRenderer(canvas, scene, camera, { fixedLevel = null } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.info.autoReset = false;

  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  let level = fixedLevel ?? (dpr > 1.2 ? 1 : 0);            // hi-dpi screens need less MSAA
  const makeTarget = () => new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: LADDER[level].msaa });
  const composer = new EffectComposer(renderer, makeTarget());
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.42, 0.75, 0.92);
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
    get frameMs() { return ms; }, get level() { return level; }, get quality() { return LADDER[level]; },
  };
}
