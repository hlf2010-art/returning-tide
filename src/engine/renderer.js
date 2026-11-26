// Renderer + post: HDR scene -> bloom (lamps, lit towers) -> ACES tone map.
// Quality steps down automatically if real frame time says the GPU can't keep up.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSRPass } from 'three/addons/postprocessing/SSRPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { createGradePass } from './grade.js';

// Each step is cheaper than the one before: anti-aliasing goes first, then resolution.
// ssr: screen-space reflections on the wet ground (about 2.5 scene renders), top two steps only
const SSR_LAYER = 3;                                   // ground meshes, for the reflection passes only
// shadows: how many lamps cast shadow maps (lighting.js)
// ao: ground-truth ambient occlusion (contact darkening where things meet: kerbs, walls, under cars,
// people's feet), top two steps only; smaa: edge anti-aliasing wherever MSAA is off
const LADDER = [
  { msaa: 4, scale: 1, ssr: true, shadows: 2, ao: true, refl: true }, { msaa: 2, scale: 1, ssr: true, shadows: 2, ao: true, refl: true }, { msaa: 0, scale: 1, shadows: 1, refl: true },
  { msaa: 0, scale: 0.8, shadows: 1 }, { msaa: 0, scale: 0.65, shadows: 0 }, { msaa: 0, scale: 0.5, shadows: 0 },
];

// With graphics settings (engine/gfx.js) the player's choices are the base, and when frames run long
// (and 'auto' is on) the renderer steps down from there: MSAA first, then AO and SSR, then resolution.
// `?q=<n>` (tools) still pins one LADDER step exactly.
function effective(g, drop) {
  const q = { msaa: g.msaa, scale: g.scale, ssr: g.ssr, shadows: g.shadows, ao: g.ao, bloom: g.bloom, refl: g.refl };
  if (drop >= 1) q.msaa = 0;
  if (drop >= 2) { q.ao = false; q.ssr = false; }
  if (drop >= 3) q.refl = false;
  if (drop >= 3) { q.scale = Math.max(0.5, g.scale * 0.85 ** (drop - 2)); q.shadows = Math.min(q.shadows, drop >= 5 ? 0 : 1); }
  return q;
}
const MAX_DROP = 7;

export function createRenderer(canvas, scene, camera, { fixedLevel = null, gfx = null } = {}) {
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
  let G = gfx, drop = 0;                                     // settings, and how far auto has stepped down from them
  const Q = () => (fixedLevel == null && G ? effective(G, drop) : { bloom: true, ...LADDER[level] });
  const makeTarget = () => new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: Q().msaa });
  const composer = new EffectComposer(renderer, makeTarget());
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  // bloom a little tighter than before: lamps glow, they don't fog the frame
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.24, 0.45, 1.0);
  let ssr = null, ssrEnabled = true;                  // created once reflectors are known (setReflectors)
  function usePasses() {
    const want = !!(ssr && ssrEnabled && Q().ssr);
    composer.passes[0] = want ? ssr : renderPass;
    if (ssr) ssr.beautyRenderTarget.samples = Q().msaa;
  }
  // ambient occlusion from a twin of the camera that leaves out layer 2 (rain streaks, the held pouch)
  const aoCam = camera.clone();
  const gtao = new GTAOPass(scene, aoCam, 512, 512);
  gtao.blendIntensity = 0.7;
  gtao.updateGtaoMaterial({ radius: 0.55, distanceExponent: 1.4, thickness: 1.2, scale: 1, samples: 12 });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
  const gtaoRender = gtao.render.bind(gtao);
  // (the sky is a 1 m sphere round the eye drawn behind everything; the AO pass's own depth/normal render
  // ignores its depthWrite:false, so it is hidden for that render or it smears the sky with dark streaks)
  let sky = null;
  gtao.render = (...a) => {
    aoCam.copy(camera, false); aoCam.layers.mask = camera.layers.mask & ~(1 << 2);
    if (!sky || !sky.parent) sky = scene.getObjectByName('sky');
    const was = sky ? sky.visible : false; if (sky) sky.visible = false;
    try { gtaoRender(...a); } finally { if (sky) sky.visible = was; }
  };
  composer.addPass(gtao);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const smaa = new SMAAPass();
  composer.addPass(smaa);
  const grade = createGradePass();                    // vignette, a trace of lens fringing, film grain (engine/grade.js)
  composer.addPass(grade);
  function useLevelPasses() { const q = Q(); gtao.enabled = !!q.ao; smaa.enabled = !q.msaa; bloom.enabled = q.bloom !== false; }
  useLevelPasses();

  function resize() {
    const w = window.innerWidth, h = window.innerHeight, s = dpr * Q().scale;
    renderer.setPixelRatio(s); renderer.setSize(w, h, false);
    composer.setPixelRatio(s); composer.setSize(w, h);
    bloom.setSize(Math.round(w * s / 2), Math.round(h * s / 2));   // bloom from a half-size source: wide glow, a quarter of the cost
    gtao.setSize(Math.round(w * s), Math.round(h * s));
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  function rebuild() { composer.reset(makeTarget()); usePasses(); useLevelPasses(); resize(); }
  function setLevel(n) {
    if (G && fixedLevel == null) { drop = Math.max(0, Math.min(MAX_DROP, n)); level = drop; }
    else level = Math.max(0, Math.min(LADDER.length - 1, n));
    rebuild();
  }
  if (G && fixedLevel == null) level = 0;
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
    // below ~40 fps twice running (or well under the frame cap the player chose)
    const budget = G && G.fps ? Math.max(25, 1000 / G.fps * 1.35) : 25;
    slowWindows = ms > budget ? slowWindows + 1 : 0;
    if (fixedLevel != null || slowWindows < 2) return;
    slowWindows = 0;
    if (G) { if (G.auto && drop < MAX_DROP) setLevel(drop + 1); }
    else if (level < LADDER.length - 1) setLevel(level + 1);
  }
  return {
    renderer, composer, bloom, gtao, grade, resize, tick, setLevel,
    // new graphics settings: applied at once (auto starts again from the top)
    apply(g) { G = g; drop = 0; level = 0; slowWindows = 0; warmup = 3; rebuild(); },
    get gfx() { return G; }, get drop() { return drop; }, get dpr() { return dpr; },
    get pixels() { const s = dpr * Q().scale; return [Math.round(window.innerWidth * s), Math.round(window.innerHeight * s)]; },
    frame(t) { grade.uniforms.time.value = t; },
    get ssr() { return ssr; },
    get reflections() { return composer.passes[0] === ssr; },
    get peopleReflections() { return !!Q().refl; },     // (world/peopleReflect.js: drawn by main before the frame)
    setReflections(on) { ssrEnabled = !!on; usePasses(); },
    // Wet-ground reflections: `selects` are the ground meshes; each may carry userData.ssrMask, a
    // material that writes the per-pixel reflection strength (puddles strong, damp stone faint).
    setReflectors(selects) {
      const size = renderer.getDrawingBufferSize(new THREE.Vector2());
      ssr = new SSRPass({ renderer, scene, camera, width: size.x, height: size.y, selects });
      // SSRPass ships a 16-bit depth texture: with a 0.1 m..4.5 km camera that has no precision left at
      // the Pudong skyline, and the towers' layered surfaces z-fight (white-hot facades). Use 32-bit float.
      ssr.beautyRenderTarget.depthTexture.type = THREE.FloatType;
      // the mask sets how much each pixel reflects (puddles about half, damp stone a sheen); rays fade
      // out by ~30 m, so nearby cars, people, lamps and the façades across the road show in the puddles
      ssr.thickness = 0.35; ssr.maxDistance = 32; ssr.opacity = 1; ssr.blur = true; ssr.infiniteThick = false; ssr.fresnel = true; ssr.distanceAttenuation = true;
      // the reflection's strength comes from the per-pixel mask (the "metalness" target). Both places the
      // shader sets it: with distance attenuation on (the default) it's set a second time, and that one
      // used to drop the mask, which made every wet surface a full mirror
      ssr.ssrMaterial.fragmentShader = ssr.ssrMaterial.fragmentShader.replace('float op=opacity;', 'float op=opacity*metalness;').replace('op=opacity*attenuation;', 'op=opacity*metalness*attenuation;');
      if (!/opacity\*metalness\*attenuation/.test(ssr.ssrMaterial.fragmentShader)) console.warn('SSR: the mask patch did not apply (three.js changed)');
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
    get frameMs() { return ms; }, get level() { return level; }, get quality() { return Q(); },
  };
}
