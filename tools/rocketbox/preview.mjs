// Dev tool: render converted people GLBs playing chosen clips (sanity check of the conversion).
//   NODE_PATH=$(npm root -g) node tools/rocketbox/preview.mjs <glbDir> <out.png> [clip,clip,...]
import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
const [dir, outPng, clipList = 'idle,walk,jog,phone,umbrella,talk1'] = process.argv.slice(2);
const THREE_DIR = new URL('../../node_modules/three/', import.meta.url).pathname;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
page.on('console', (m) => console.log('[page]', m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.route('http://rb.local/**', (route) => {
  const p = new URL(route.request().url()).pathname;
  if (p === '/') return route.fulfill({ contentType: 'text/html', body: '<style>body{margin:0;background:#222}</style><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>' });
  const file = p.startsWith('/three/') ? join(THREE_DIR, p.slice(7)) : join(dir, p.slice(1));
  if (!existsSync(file)) return route.fulfill({ status: 404, body: '' });
  return route.fulfill({ contentType: p.endsWith('.js') ? 'text/javascript' : 'application/octet-stream', body: readFileSync(file) });
});
await page.goto('http://rb.local/');
await page.evaluate(async (clips) => {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const SkeletonUtils = await import('three/addons/utils/SkeletonUtils.js');
  const r = new THREE.WebGLRenderer({ antialias: true }); r.setSize(1500, 900); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
  document.body.appendChild(r.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x30343c);
  scene.add(new THREE.HemisphereLight(0xbcd0ff, 0x403830, 1.6)); const d = new THREE.DirectionalLight(0xffeedd, 2.2); d.position.set(2, 4, 3); scene.add(d);
  const cam = new THREE.PerspectiveCamera(30, 1500 / 900, 0.1, 100);
  const L = new GLTFLoader(), people = ['lin', 'su', 'p1', 'p2', 'p3', 'p4'], anims = {};
  for (const s of ['m', 'f']) anims[s] = (await L.loadAsync(`/anim-${s}.glb`)).animations;
  const sex = { lin: 'm', su: 'f', p1: 'm', p2: 'f', p3: 'm', p4: 'm' };
  const cl = clips.split(',');
  const mixers = [];
  for (let i = 0; i < people.length; i++) for (let j = 0; j < cl.length; j++) {
    const g = (await L.loadAsync(`/${people[i]}.glb`)).scene;
    const o = SkeletonUtils.clone(g); o.scale.setScalar(0.01);
    o.position.set((j - (cl.length - 1) / 2) * 0.95, 0, (i - 2.5) * -0.9 - 1);
    scene.add(o);
    const clip = anims[sex[people[i]]].find((c) => c.name === cl[j]);
    if (clip) { const m = new THREE.AnimationMixer(o); m.clipAction(clip).play(); m.setTime(0.37 * (j + 1)); mixers.push(m); }
  }
  cam.position.set(0, 6.2, 6.5); cam.lookAt(0, 0.4, -1.2);
  r.render(scene, cam);
  window.__done = true;
}, clipList);
await page.waitForFunction(() => window.__done, null, { timeout: 300000 });
await page.screenshot({ path: outPng });
await browser.close();
