// Dev tool: convert Microsoft Rocketbox avatars + animations (MIT licence) into compact GLBs for
// the game, using three.js's own FBXLoader / TGALoader / GLTFExporter in headless Chromium.
//
//   NODE_PATH=$(npm root -g) node tools/rocketbox/convert.mjs <srcDir> <outDir>
//
// <srcDir> holds one folder per avatar (its Export/*.fbx and Textures/*.tga flattened into it) and
// an anim/ folder of clip FBXs, all taken from https://github.com/microsoft/Microsoft-Rocketbox.
// Output: <role>.glb per character (mesh + textures, no animation) and anim-m.glb / anim-f.glb
// (skeleton + clips) shared by every avatar of that skeleton, plus clips.json (clip speeds).
import { createRequire } from 'module';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
const [src, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const THREE_DIR = new URL('../../node_modules/three/', import.meta.url).pathname;

// who plays whom (see README: casting from what the library offers)
export const CAST = [
  { role: 'lin', avatar: 'Business_Male_02', sex: 'm', greyHair: true },      // Old Lin: hair greyed for his age
  { role: 'su', avatar: 'Business_Female_03', sex: 'f' },                     // Ms. Su
  { role: 'p1', avatar: 'Male_Adult_09', sex: 'm' },
  { role: 'p2', avatar: 'Female_Adult_09', sex: 'f' },                        // (Female_Adult_03 wears a tank top: wrong for November)
  { role: 'p3', avatar: 'Male_Adult_10', sex: 'm' },
  { role: 'p4', avatar: 'Male_Adult_03', sex: 'm' },
  { role: 'player', avatar: 'Male_Adult_07', sex: 'm' },
  { role: 'p5', avatar: 'Business_Female_02', sex: 'f', greyHair: true },  // an older local woman (the library's oldest woman; hair greyed)                     // the player's own body (head hidden in first person)
];
const CLIPS = {
  m: { idle: 'm_idle_neutral_01', look: 'm_idle_look_around_01', talk1: 'm_gestic_talk_neutral_01', talk2: 'm_gestic_talk_relaxed_01', phone: 'm_cell_phone_textmessage', umbrella: 'm_umbrella_idle_01', walk: 'm_walk_neutral_01', jog: 'm_run_slow_01', wave: 'm_wave_01', shrug: 'm_gestic_shrug_01', angry: 'm_idle_angry_01' },
  f: { idle: 'f_idle_neutral_01', look: 'f_idle_look_around_01', talk1: 'f_gestic_talk_neutral_01', talk2: 'f_gestic_talk_relaxed_01', phone: 'f_cell_phone_textmessage', umbrella: 'f_umbrella_idle_01', umbrellaTalk: 'f_umbrella_talk_01', umbrellaListen: 'f_umbrella_listen_01', walk: 'f_walk_neutral_01', jog: 'f_run_slow_01', wave: 'f_wave_01', shrug: 'f_gestic_shrug_01', angry: 'f_gestic_talk_angry_01' },
};

// the player's own set: same skeleton as 'm', plus a proper run and the catch-your-breath idles
const PLAYER_CLIPS = { idle: 'm_idle_neutral_01', walk: 'm_walk_neutral_01', jog: 'm_run_slow_01', sprint: 'm_run_fast_01' };   // (the library's breathe idles are calm, so getting winded is procedural)
// ONLY=player converts just the player's avatar and clips and merges them into an existing people.json
const ONLY = process.env.ONLY || null;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('console', (m) => { if (!m.text().startsWith('THREE.FBXLoader')) console.log('[page]', m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.route('http://rb.local/**', (route) => {
  const p = new URL(route.request().url()).pathname;
  if (p === '/') return route.fulfill({ contentType: 'text/html', body: '<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>' });
  let file = null, type = 'application/octet-stream';
  if (p.startsWith('/three/')) { file = join(THREE_DIR, p.slice(7)); type = 'text/javascript'; }
  else if (p.startsWith('/src/')) { const rel = decodeURIComponent(p.slice(5)); file = join(src, rel); if (!existsSync(file)) file = join(src, rel.split('/')[0], basename(rel.replace(/\\/g, '/'))); }
  if (!file || !existsSync(file)) return route.fulfill({ status: 404, body: '' });
  return route.fulfill({ contentType: type, body: readFileSync(file) });
});
await page.goto('http://rb.local/');
await page.evaluate(async () => {
  const THREE = await import('three');
  const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
  const { TGALoader } = await import('three/addons/loaders/TGALoader.js');
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  const settle = (mgr) => new Promise((r) => { if (mgr.pending === 0) r(); else mgr.onLoad = r; });
  function managerFor(folder) {
    const mgr = new THREE.LoadingManager(); mgr.pending = 0;
    mgr.onStart = () => { mgr.pending++; };
    mgr.addHandler(/\.tga$/i, new TGALoader(mgr));
    mgr.setURLModifier((u) => (u.includes('/three/') || u.endsWith('.fbx')) ? u : `/src/${folder}/${u.replace(/\\/g, '/').split('/').pop()}`);
    return mgr;
  }
  // texture -> canvas (optionally recoloured) so the exporter can downscale / re-encode it
  function toCanvas(tex, recolor) {
    const img = tex.image, w = img.width, h = img.height, c = document.createElement('canvas');
    c.width = w; c.height = h; const ctx = c.getContext('2d');
    if (img.data) {                                         // DataTexture from TGALoader (RGBA)
      const id = new ImageData(new Uint8ClampedArray(img.data.buffer.slice(0)), w, h);
      ctx.putImageData(id, 0, 0);
      if (tex.flipY === false) { const t = document.createElement('canvas'); t.width = w; t.height = h; const tc = t.getContext('2d'); tc.translate(0, h); tc.scale(1, -1); tc.drawImage(c, 0, 0); return recolor ? recolor(t) : t; }
    } else ctx.drawImage(img, 0, 0);
    return recolor ? recolor(c) : c;
  }
  const grey = (c) => {                                     // hair: desaturate and lift towards silver
    const ctx = c.getContext('2d'), d = ctx.getImageData(0, 0, c.width, c.height);
    // salt-and-pepper rather than silver: half-way between his own colour and grey, slightly lifted
    for (let i = 0; i < d.data.length; i += 4) {
      const l = 0.3 * d.data[i] + 0.59 * d.data[i + 1] + 0.11 * d.data[i + 2], g = Math.min(255, 45 + l * 1.25);
      for (let k = 0; k < 3; k++) d.data[i + k] = d.data[i + k] * 0.45 + g * 0.55;
    }
    ctx.putImageData(d, 0, 0); return c;
  };
  function canvasTex(tex, { jpeg = true, recolor = null, srgb = true } = {}) {
    const t = new THREE.CanvasTexture(toCanvas(tex, recolor));
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.flipY = tex.flipY;
    t.userData.mimeType = jpeg ? 'image/jpeg' : 'image/png';
    return t;
  }

  window.convertAvatar = async (folder, greyHair) => {
    const mgr = managerFor(folder);
    const g = await new FBXLoader(mgr).loadAsync(`/src/${folder}/${folder}.fbx`);
    await settle(mgr); await new Promise((r) => setTimeout(r, 300));
    g.traverse((o) => {
      if (!o.isMesh) return;
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      const conv = ms.map((m) => {
        const hair = !!m.alphaMap || /opacity/i.test(m.name);
        const s = new THREE.MeshStandardMaterial({ name: m.name, roughness: /head/i.test(m.name) ? 0.55 : 0.78, metalness: 0 });
        if (m.map) s.map = canvasTex(m.map, { jpeg: !hair, recolor: hair && greyHair ? grey : null });
        if (m.normalMap) s.normalMap = canvasTex(m.normalMap, { srgb: false });
        if (hair) {
          if (m.alphaMap) s.alphaMap = canvasTex(m.alphaMap, { jpeg: false, srgb: false });
          s.alphaTest = 0.45; s.side = THREE.DoubleSide;
        }
        return s;
      });
      o.material = Array.isArray(o.material) ? conv : conv[0];
    });
    const glb = await new GLTFExporter().parseAsync(g, { binary: true, maxTextureSize: 1024, onlyVisible: false });
    return btoa(new Uint8Array(glb).reduce((s, b) => s + String.fromCharCode(b), ''));
  };

  window.convertAnims = async (folder, clipMap) => {
    const mgr = managerFor(folder), loader = new FBXLoader(mgr);
    const skel = await loader.loadAsync(`/src/${folder}/${folder}.fbx`);
    await settle(mgr);
    const meshes = []; skel.traverse((o) => { if (o.isMesh) meshes.push(o); });
    for (const m of meshes) m.parent.remove(m);              // skeleton only: clips bind to bone names
    const clips = [], speeds = {};
    for (const [name, file] of Object.entries(clipMap)) {
      const a = await loader.loadAsync(`/src/anim/${file}.fbx`);
      const clip = a.animations[0]; clip.name = name;
      // size: scale tracks are all 1; non-root positions are constant bone offsets; fingers only
      // matter where the hand grips something (phone, umbrella)
      const grips = /phone|umbrella/.test(name);
      clip.tracks = clip.tracks.filter((t) => {
        if (t.name.endsWith('.scale')) return false;
        if (t.name.endsWith('.position') && t.name !== 'Bip01.position') return false;
        if (!grips && /Finger/.test(t.name)) return false;
        return !/MotionExtractionHelper/.test(t.name);
      });
      // slow clips (idles, talking, phone, umbrella) resampled to 15 fps; walk / jog keep 30
      const gait = ['walk', 'jog', 'run', 'sprint'].includes(name);
      if (!gait) {
        clip.tracks = clip.tracks.map((t) => {
          const T = t.times[t.times.length - 1], n = Math.max(2, Math.round(T * 15) + 1), interp = t.createInterpolant(), size = t.getValueSize();
          const times = new Float32Array(n), values = new Float32Array(n * size);
          for (let i = 0; i < n; i++) { times[i] = (T * i) / (n - 1); values.set(interp.evaluate(times[i]), i * size); }
          return new t.constructor(t.name, times, values);
        });
      }
      const root = clip.tracks.find((t) => t.name === 'Bip01.position');
      if (root && gait) {
        // remove the forward drift (root motion along +Z); keep sway and bob. The game moves the body.
        const v = root.values, n = v.length / 3, z0 = v[2], z1 = v[n * 3 - 1], T = root.times[n - 1] || 1;
        speeds[name] = ((z1 - z0) / 100) / T;                // metres per second
        for (let i = 0; i < n; i++) v[i * 3 + 2] -= z0 + (z1 - z0) * (root.times[i] / T);
      }
      for (const t of clip.tracks) t.optimize();
      clips.push(clip);
    }
    const glb = await new GLTFExporter().parseAsync(skel, { binary: true, animations: clips, onlyVisible: false });
    return { b64: btoa(new Uint8Array(glb).reduce((s, b) => s + String.fromCharCode(b), '')), speeds, durations: Object.fromEntries(clips.map((c) => [c.name, +c.duration.toFixed(3)])) };
  };
});

const manifestPath = join(out, 'people.json');
const manifest = ONLY && existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8'))
  : { source: 'Microsoft Rocketbox (MIT): https://github.com/microsoft/Microsoft-Rocketbox', units: 'centimetres (scale 0.01 at runtime)', cast: {}, clips: {} };
for (const c of CAST) {
  if (ONLY && c.role !== ONLY) continue;
  const b64 = await page.evaluate(([f, g]) => window.convertAvatar(f, g), [c.avatar, !!c.greyHair]);
  const buf = Buffer.from(b64, 'base64');
  writeFileSync(join(out, `${c.role}.glb`), buf);
  manifest.cast[c.role] = { avatar: c.avatar, sex: c.sex, file: `${c.role}.glb`, bytes: buf.length };
  console.log(`${c.role}: ${c.avatar} -> ${(buf.length / 1e6).toFixed(2)} MB`);
}
const sets = [['m', 'Business_Male_02', CLIPS.m], ['f', 'Business_Female_03', CLIPS.f], ['player', 'Male_Adult_07', PLAYER_CLIPS]]
  .filter(([k]) => !ONLY || k === ONLY);
for (const [sex, folder, map] of sets) {
  const r = await page.evaluate(([f, m]) => window.convertAnims(f, m), [folder, map]);
  const buf = Buffer.from(r.b64, 'base64');
  writeFileSync(join(out, `anim-${sex}.glb`), buf);
  manifest.clips[sex] = { file: `anim-${sex}.glb`, bytes: buf.length, speeds: r.speeds, durations: r.durations, from: map };
  console.log(`anim-${sex}: ${Object.keys(map).length} clips -> ${(buf.length / 1e6).toFixed(2)} MB; speeds ${JSON.stringify(r.speeds)}`);
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
await browser.close();
