// Dev tool: inspect a Rocketbox FBX (materials, maps, bones, units, clip tracks) in headless Chromium.
//   NODE_PATH=$(npm root -g) node tools/rocketbox/probe.mjs <srcDir> <avatarName> <animFile>
import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { join, basename } from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
const [src, avatar, anim] = process.argv.slice(2);
const THREE_DIR = new URL('../../node_modules/three/', import.meta.url).pathname;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('console', (m) => console.log('[page]', m.text()));
await page.route('http://rb.local/**', (route) => {
  const p = new URL(route.request().url()).pathname;
  let file = null, type = 'application/octet-stream';
  if (p === '/') return route.fulfill({ contentType: 'text/html', body: `<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>` });
  if (p.startsWith('/three/')) { file = join(THREE_DIR, p.slice(7)); type = 'text/javascript'; }
  else if (p.startsWith('/src/')) { const rel = decodeURIComponent(p.slice(5)); file = join(src, rel); if (!existsSync(file)) file = join(src, rel.split('/')[0], basename(rel.replace(/\\/g, '/'))); }
  if (!file || !existsSync(file)) { console.log('404', p); return route.fulfill({ status: 404, body: '' }); }
  return route.fulfill({ contentType: type, body: readFileSync(file) });
});
await page.goto('http://rb.local/');
const info = await page.evaluate(async ([avatar, anim]) => {
  const THREE = await import('three');
  const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
  const { TGALoader } = await import('three/addons/loaders/TGALoader.js');
  const mgr = new THREE.LoadingManager();
  mgr.addHandler(/\.tga$/i, new TGALoader(mgr));
  mgr.setURLModifier((u) => (u.startsWith('http://rb.local/three') || u.endsWith('.fbx')) ? u : `/src/${avatar}/${u.replace(/\\/g, '/').split('/').pop()}`);
  const g = await new FBXLoader(mgr).loadAsync(`/src/${avatar}/${avatar}.fbx`);
  await new Promise((r) => setTimeout(r, 1500));
  const out = { meshes: [], bones: 0, boneNames: [], bbox: null };
  g.traverse((o) => {
    if (o.isBone) { out.bones++; if (out.boneNames.length < 12) out.boneNames.push(o.name); }
    if (o.isMesh) {
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      out.meshes.push({ name: o.name, skinned: !!o.isSkinnedMesh, verts: o.geometry.attributes.position.count, mats: ms.map((m) => ({ type: m.type, name: m.name, map: m.map && m.map.name, normal: !!m.normalMap, spec: !!m.specularMap, alpha: !!m.alphaMap, transparent: m.transparent, opacity: m.opacity })) });
    }
  });
  const b = new THREE.Box3().setFromObject(g); out.bbox = [b.min.toArray().map((v) => +v.toFixed(2)), b.max.toArray().map((v) => +v.toFixed(2))];
  out.rootScale = g.scale.toArray();
  const a = await new FBXLoader(mgr).loadAsync(`/src/anim/${anim}`);
  const clip = a.animations[0];
  out.clip = { name: clip.name, duration: clip.duration, tracks: clip.tracks.length, sample: clip.tracks.slice(0, 6).map((t) => `${t.name} (${t.times.length} keys)`) };
  const rootPos = clip.tracks.find((t) => /position$/.test(t.name));
  if (rootPos) { const v = rootPos.values, n = v.length / 3; out.rootTrack = { name: rootPos.name, first: [v[0], v[1], v[2]].map((x) => +x.toFixed(2)), last: [v[n * 3 - 3], v[n * 3 - 2], v[n * 3 - 1]].map((x) => +x.toFixed(2)) }; }
  return out;
}, [avatar, anim]);
console.log(JSON.stringify(info, null, 1));
await browser.close();
