// Graphics settings: what the renderer does, how many people and cars there are, how often it draws.
// Pure (no three.js); the renderer, the crowd, the traffic and the frame loop read it.
//   preset     low | mac (Mac mini M4 class) | high | ultra (RTX 4080 class) | custom
//   scale      render resolution, as a fraction of the screen's (capped device pixel ratio): 0.5 - 1.5
//   fps        frame-rate cap: 30 | 60 | 120 | 0 (no cap)
//   msaa       multisampling: 0 (SMAA instead) | 2 | 4
//   shadows    how many lamps cast shadow maps: 0 - 2
//   ao         ambient occlusion (contact shadows)      ssr   wet-ground reflections
//   bloom      glow round lights                        mirror   river reflection resolution (px)
//   lod        level of detail and density: low | medium | high | ultra (people, cars, distant detail)
//   auto       step the resolution down by itself when frames run long
// On first run the preset is picked from the GPU the browser reports; after that it's yours.
export const PRESETS = {
  low:   { scale: 0.7, fps: 30, msaa: 0, shadows: 0, ao: false, ssr: false, bloom: true, mirror: 512, lod: 'low', auto: true },
  mac:   { scale: 0.9, fps: 60, msaa: 0, shadows: 1, ao: false, ssr: false, bloom: true, mirror: 768, lod: 'medium', auto: true },
  high:  { scale: 1.0, fps: 60, msaa: 2, shadows: 2, ao: true, ssr: true, bloom: true, mirror: 1024, lod: 'high', auto: true },
  ultra: { scale: 1.25, fps: 0, msaa: 4, shadows: 2, ao: true, ssr: true, bloom: true, mirror: 2048, lod: 'ultra', auto: false },
};
// what each level of detail means in the world
export const LOD = {
  // rooms: the size of the shop-window photographs' cube faces (world/shopfronts.js)
  // people: the crowd's population at its busiest (a weekend evening; raised when Nanjing Road ran on to
  // Xizang Road); only those within ~30 m steer
  // round each other, the rest follow their lanes (engine/crowd.js), so it costs about what 380 did
  low:    { crowd: 0.45, people: 1200, nearPeople: 8, traffic: 0.6, farDetail: 0.6, trees: 0, rooms: 384 },
  medium: { crowd: 1.0, people: 3300, nearPeople: 16, traffic: 1.0, farDetail: 0.85, trees: 1, rooms: 512 },
  high:   { crowd: 1.6, people: 4300, nearPeople: 24, traffic: 1.35, farDetail: 1.0, trees: 1, rooms: 512 },
  ultra:  { crowd: 2.4, people: 5400, nearPeople: 40, traffic: 1.7, farDetail: 1.0, trees: 2, rooms: 512 },
};
export const FPS_CAPS = [30, 60, 120, 0];

// a preset for the GPU the browser names (WEBGL_debug_renderer_info)
export function presetForGpu(name = '') {
  const n = name.toLowerCase();
  if (/rtx\s*(4070|4080|4090|5070|5080|5090|3080|3090)|radeon rx 7[89]\d0/.test(n)) return 'ultra';
  if (/rtx|radeon rx|arc a7/.test(n)) return 'high';
  if (/apple m[1-9]( pro| max| ultra)/.test(n)) return 'high';
  if (/apple/.test(n)) return 'mac';
  if (/swiftshader|llvmpipe|software|microsoft basic/.test(n)) return 'low';
  if (/intel|uhd|iris|mali|adreno/.test(n)) return 'low';
  return 'mac';
}

export function resolve(saved = {}) {
  const base = PRESETS[saved.preset] || PRESETS.mac;
  const g = { ...base, ...(saved.preset === 'custom' ? saved : {}), preset: saved.preset || 'mac' };
  g.scale = Math.max(0.5, Math.min(1.5, +g.scale || 1));
  g.fps = FPS_CAPS.includes(+g.fps) ? +g.fps : 60;
  g.msaa = [0, 2, 4].includes(+g.msaa) ? +g.msaa : 0;
  g.shadows = Math.max(0, Math.min(2, Math.round(+g.shadows || 0)));
  g.mirror = [512, 768, 1024, 2048].includes(+g.mirror) ? +g.mirror : 1024;
  g.lod = LOD[g.lod] ? g.lod : 'medium';
  return g;
}
// change one thing: the preset becomes 'custom' (keeping everything else as it was)
export function tweak(g, key, value) {
  if (key === 'preset') return resolve({ preset: value });
  return resolve({ ...g, [key]: value, preset: 'custom' });
}
export const detail = (g) => LOD[g.lod];

// the frame-rate cap: given the time since the last drawn frame, draw this one?
export function shouldDraw(sinceLast, fps) {
  if (!fps) return true;
  return sinceLast >= 1000 / fps - 1.5;            // a little slack so 60 on a 60 Hz screen never skips
}

// the tree detail step (world/trees.js setQuality: 0 full .. 5 trunks only) for a level of detail
export const treeStep = (g, drop = 0) => Math.min(5, ({ ultra: 0, high: 0, medium: 1, low: 4 }[g.lod] ?? 1) + (drop >= 4 ? 2 : 0));

const KEY = 'bund.gfx';
export function loadGfx(gpuName, store = globalThis.localStorage) {
  let saved = null;
  try { saved = JSON.parse(store.getItem(KEY) || 'null'); } catch { saved = null; }
  if (!saved || !saved.preset) return { ...resolve({ preset: presetForGpu(gpuName) }), detected: true };
  return resolve(saved);
}
export function saveGfx(g, store = globalThis.localStorage) {
  try { store.setItem(KEY, JSON.stringify(g.preset === 'custom' ? { ...g, detected: undefined } : { preset: g.preset })); } catch { /* private mode */ }
}
