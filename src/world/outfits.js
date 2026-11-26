// Staff dressed from the bodies we already have (world/people.js). The Peace Hotel's security men on
// the doors and at the lifts are middle-aged men in dark suits: Old Lin's body (Rocketbox
// Business_Male_02, the library's middle-aged man in a suit) with his hair back to black and the navy
// suit taken to black, a coiled earpiece wire from the right ear into the collar, a small gold badge
// on the left lapel; the one at the lifts also wears glasses (so the two don't read as twins).
// The recoloured textures are made once per style and shared; the props hang off the skeleton's
// bones, placed from the skinned mesh itself (ear, lapel), so they follow the head and chest.
import * as THREE from 'three';

const made = new Map();                                    // `${style}:${material.uuid}` -> material
const lum = (r, g, b) => 0.3 * r + 0.59 * g + 0.11 * b;

// a copy of a material whose map has gone through fn(r, g, b, a) -> [r, g, b] for every pixel
function recolor(mat, style, fn) {
  const key = `${style}:${mat.uuid}`;
  if (made.has(key)) return made.get(key);
  const img = mat.map && mat.map.image;
  if (!img || typeof document === 'undefined') { made.set(key, mat); return mat; }
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height), px = d.data;
  for (let i = 0; i < px.length; i += 4) { const o = fn(px[i], px[i + 1], px[i + 2], px[i + 3]); if (o) { px[i] = o[0]; px[i + 1] = o[1]; px[i + 2] = o[2]; } }
  ctx.putImageData(d, 0, 0);
  // (a new texture, not mat.map.clone(): a clone shares the original's image source, so setting its image would
  // repaint everyone wearing the original)
  const src = mat.map, t = new THREE.CanvasTexture(c);
  t.flipY = src.flipY; t.colorSpace = src.colorSpace; t.wrapS = src.wrapS; t.wrapT = src.wrapT; t.channel = src.channel; t.anisotropy = src.anisotropy;
  t.offset.copy(src.offset); t.repeat.copy(src.repeat); t.needsUpdate = true;
  const m = mat.clone(); m.map = t; m.name = `${mat.name}:${style}`;
  made.set(key, m);
  return m;
}
const SUIT = {
  // the navy suit to near-black (cool), the white shirt, the skin of the hands and the black shoes as they were
  body: (r, g, b) => {
    const l = lum(r, g, b), mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0;
    if (r > b + 18 && r > 90) return null;                 // skin (the hands)
    if (l > 140 && sat < 0.2) return null;                 // the shirt
    if (b >= r + 6 || (l < 140 && sat < 0.35)) { const k = Math.min(255, l * 0.6); return [k * 0.96, k * 0.98, k * 1.04]; }
    return null;
  },
  // grey (Old Lin's) back to black: a middle-aged man's, the odd grey hair left in the highlights
  hair: (r, g, b) => { const l = lum(r, g, b), k = l < 150 ? 0.4 : 0.62; return [r * k + 4, g * k + 3, b * k + 3]; },
};

// points on the skinned body in the person's own frame (metres; +x his left, +y up, +z forward)
function bodyPoints(person, re) {
  const root = person.root, out = [];
  root.updateMatrixWorld(true);
  const toBody = new THREE.Matrix4().compose(root.position, root.quaternion, new THREE.Vector3(1, 1, 1)).invert(), v = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.isSkinnedMesh || !re.test(o.material.name)) return;
    o.skeleton.update();
    const n = o.geometry.attributes.position.count;
    for (let i = 0; i < n; i++) { o.getVertexPosition(i, v); o.localToWorld(v); out.push(v.clone().applyMatrix4(toBody)); }
  });
  return out;
}
// hang obj on a bone so that it sits at `at` (person's frame) facing his forward
function attach(person, boneName, obj, at, rotY = 0) {
  const root = person.root, bone = root.getObjectByName(boneName); if (!bone) return null;
  root.updateMatrixWorld(true);
  const body = new THREE.Matrix4().compose(root.position, root.quaternion, new THREE.Vector3(1, 1, 1));
  const want = body.multiply(new THREE.Matrix4().compose(at, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY), new THREE.Vector3(1, 1, 1)));
  const local = bone.matrixWorld.clone().invert().multiply(want);
  local.decompose(obj.position, obj.quaternion, obj.scale);
  bone.add(obj);
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = false; } });
  return obj;
}

const wireMat = new THREE.MeshStandardMaterial({ color: 0xd9d4cc, roughness: 0.25, transparent: true, opacity: 0.7 });
const goldMat = new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 0.9, roughness: 0.3 });
const frameMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.4, metalness: 0.3 });

// the classic security earpiece: a clear coiled tube from the ear down behind the jaw into the collar
function earpiece(ear) {
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40, coil = t > 0.35 ? 0.0035 : 0;                         // the coiled stretch below the ear
    const x = ear.x + 0.006 + 0.012 * t + Math.cos(t * 70) * coil, y = ear.y - 0.17 * t, z = ear.z - 0.012 - 0.045 * Math.sin(t * Math.PI * 0.6) + Math.sin(t * 70) * coil;
    pts.push(new THREE.Vector3(x, y, z));
  }
  const g = new THREE.Group();
  const base = new THREE.Vector3().copy(ear);
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => p.sub(base)));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.0018, 5, false), wireMat));
  const bud = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 8, 6), wireMat); bud.position.set(0.004, 0, 0.004); g.add(bud);
  return g;
}
function glasses() {
  const g = new THREE.Group(), lens = new THREE.TorusGeometry(0.021, 0.0016, 4, 18);
  for (const s of [-1, 1]) { const r = new THREE.Mesh(lens, frameMat); r.scale.set(1.15, 0.85, 1); r.position.set(s * 0.032, 0, 0); g.add(r);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.0025, 0.0025, 0.1), frameMat); arm.position.set(s * 0.058, 0.003, -0.05); g.add(arm); }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.0025, 0.0025), frameMat); bridge.position.y = 0.006; g.add(bridge);
  return g;
}

// dress a person (made with createPerson from the 'lin' body) as the Peace Hotel's security
export function dressHotelSecurity(person, { glasses: specs = false } = {}) {
  person.root.traverse((o) => {
    if (!o.isMesh) return;
    if (/_body$/.test(o.material.name)) o.material = recolor(o.material, 'suit', SUIT.body);
    else if (/opacity/i.test(o.material.name)) o.material = recolor(o.material, 'hair-black', SUIT.hair);
  });
  // where his ear, eyes and left lapel are, from the mesh as it stands now
  const head = bodyPoints(person, /_head$/);
  if (head.length) {
    const top = head.reduce((m, p) => Math.max(m, p.y), -Infinity);
    const band = head.filter((p) => p.y < top - 0.105 && p.y > top - 0.15);
    const ear = band.reduce((m, p) => (p.x < m.x ? p : m), band[0]);   // his right: -x
    if (ear) attach(person, 'Bip01_Head', earpiece(ear), ear);
    if (specs) {
      const eyes = head.filter((p) => p.y < top - 0.085 && p.y > top - 0.12 && Math.abs(p.x) < 0.05);
      const front = eyes.reduce((m, p) => (p.z > m.z ? p : m), eyes[0]);
      if (front) attach(person, 'Bip01_Head', glasses(), new THREE.Vector3(0, front.y + 0.002, front.z - 0.006));
    }
    const body = bodyPoints(person, /_body/), neck = top - 0.25;
    const lapel = body.filter((p) => p.y < neck - 0.1 && p.y > neck - 0.16 && p.x > 0.07 && p.x < 0.12);
    const pin = lapel.reduce((m, p) => (p.z > m.z ? p : m), lapel[0]);
    if (pin) attach(person, 'Bip01_Spine2', new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.009, 0.003), goldMat), new THREE.Vector3(pin.x, pin.y, pin.z + 0.003));
  }
  person.outfit = 'hotelSecurity';
  return person;
}

// ---- delivery riders: the game's (invented) delivery companies, as on Henan Road (world/ebikeView.js): the
// yellow one, Wanji 万集's orange and Jingsong 鲸送's blue (ui/brands.js); on the crowd body in the red track
// jacket ('p3'), the jacket re-dyed, and a helmet in the same colour (helmets are the law on Shanghai's e-bikes) ----
export const RIDER_BRANDS = {
  yellow: { jacket: [242, 194, 0], helmet: 0xf2c200, box: 0xf2c200 },
  wanji: { jacket: [242, 103, 42], helmet: 0xf2672a, box: 0x1a1a1a },
  jingsong: { jacket: [31, 127, 224], helmet: 0x1f7fe0, box: 0x1f7fe0 },
};
const helmetMats = {};
export function dressRider(person, brand = 'yellow') {
  const B = RIDER_BRANDS[brand] || RIDER_BRANDS.yellow, [hr, hg, hb] = B.jacket;
  person.root.traverse((o) => {
    if (!o.isMesh || !/_body$/.test(o.material.name)) return;
    // the red of the jacket to the brand's colour, keeping its shading; the rest as it was
    o.material = recolor(o.material, `rider-${brand}`, (r, g, b) => {
      if (!(r > g * 1.5 && r > b * 1.4 && r > 60)) return null;
      const k = Math.min(1.25, (0.3 * r + 0.59 * g + 0.11 * b) / 70);
      return [Math.min(255, hr * k), Math.min(255, hg * k), Math.min(255, hb * k)];
    });
  });
  const head = bodyPoints(person, /_head$/);
  if (head.length) {
    const top = head.reduce((m, p) => Math.max(m, p.y), -Infinity);
    const m = helmetMats[brand] || (helmetMats[brand] = new THREE.MeshStandardMaterial({ color: B.helmet, roughness: 0.35, metalness: 0.1 }));
    const g = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.135, 16, 10, 0, Math.PI * 2, 0, Math.PI / 1.85), m); shell.scale.set(1, 0.95, 1.12); g.add(shell);
    const peak = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.012, 0.06), frameMat); peak.position.set(0, 0.0, 0.14); g.add(peak);
    attach(person, 'Bip01_Head', g, new THREE.Vector3(0, top - 0.1, 0.005));
  }
  person.outfit = `rider-${brand}`;
  return person;
}

// ---- insurance agents (the AIA lobby, world/aiaLife.js): their own business clothes, and the company lanyard:
// a red ribbon round the neck down to a white staff card on the chest (red header band, a photo, a name) ----
const lanyardMat = new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.6 });
let badgeMat = null;
function badgeMaterial() {
  if (badgeMat) return badgeMat;
  if (typeof document === 'undefined') return (badgeMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f4 }));
  const c = document.createElement('canvas'); c.width = 64; c.height = 96; const x = c.getContext('2d');
  x.fillStyle = '#f7f7f5'; x.fillRect(0, 0, 64, 96); x.fillStyle = '#c8102e'; x.fillRect(0, 0, 64, 20);
  x.fillStyle = '#b9c2cc'; x.fillRect(18, 28, 28, 32); x.fillStyle = '#333'; x.fillRect(12, 68, 40, 5); x.fillRect(16, 78, 32, 4);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return (badgeMat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.4 }));
}
export function dressAgent(person) {
  const head = bodyPoints(person, /_head$/), body = bodyPoints(person, /_body/);
  if (!head.length || !body.length) return person;
  const top = head.reduce((m, p) => Math.max(m, p.y), -Infinity), neck = top - 0.25;
  // the front of the chest at a height: the forward-most point of the body near the middle
  const frontAt = (y, x0 = -0.04, x1 = 0.04) => { const pts = body.filter((p) => Math.abs(p.y - y) < 0.02 && p.x > x0 && p.x < x1); return pts.length ? pts.reduce((m, p) => (p.z > m.z ? p : m), pts[0]) : null; };
  const card = frontAt(neck - 0.3), collar = frontAt(neck - 0.02, -0.1, 0.1);
  if (!card || !collar) return person;
  const g = new THREE.Group(), cz = card.z + 0.012;
  // the ribbon: from either side of the collar down to the clip over the card
  for (const s of [-1, 1]) {
    const a = new THREE.Vector3(s * 0.07, collar.y, collar.z - 0.03), b = new THREE.Vector3(0, card.y + 0.05, cz), mid = a.clone().lerp(b, 0.5); mid.z += 0.03;
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 10, 0.006, 4, false), lanyardMat); tube.scale.set(1, 1, 1); g.add(tube);
  }
  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.085, 0.003), badgeMaterial()); badge.position.set(0, card.y, cz); g.add(badge);
  attach(person, 'Bip01_Spine2', g, new THREE.Vector3(0, 0, 0));
  person.outfit = 'agent';
  return person;
}
// grey hair for an older client: the hair texture taken toward silver, the darks lifted
export function greyHair(person) {
  person.root.traverse((o) => {
    if (o.isMesh && /opacity/i.test(o.material.name)) o.material = recolor(o.material, 'hair-grey', (r, g, b) => { const l = lum(r, g, b), k = 110 + l * 0.55; return [k, k, k * 1.02]; });
  });
  return person;
}

// ---- a front-desk receptionist's uniform: the coat taken to a dark suit (shirt and hands as they were) and a red silk
// scarf knotted at the throat, as corporate front desks in China often dress their staff; sets her apart from an
// agent in her own clothes on the same body ----
const scarfMat = new THREE.MeshStandardMaterial({ color: 0xb3122a, roughness: 0.45 });
export function dressReceptionist(person, { scarf = true, badge = false } = {}) {
  person.root.traverse((o) => { if (o.isMesh && /_body$/.test(o.material.name)) o.material = recolor(o.material, 'suit', SUIT.body); });
  const head = bodyPoints(person, /_head$/), body = bodyPoints(person, /_body/);
  if (head.length && body.length) {
    const top = head.reduce((m, p) => Math.max(m, p.y), -Infinity), neckY = top - 0.24;
    const ring = body.filter((p) => Math.abs(p.y - neckY) < 0.015);
    if (badge) {                                                       // a gold name badge on the left breast
      const fr = body.filter((p) => Math.abs(p.y - (neckY - 0.2)) < 0.02 && p.x > 0.05 && p.x < 0.12), pin = fr.length ? fr.reduce((m, p) => (p.z > m.z ? p : m), fr[0]) : null;
      if (pin) attach(person, 'Bip01_Spine2', new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.018, 0.003), goldMat), new THREE.Vector3(pin.x, pin.y, pin.z + 0.003));
    }
    if (scarf && ring.length > 6) {
      const cx = ring.reduce((a, p) => a + p.x, 0) / ring.length, cz = ring.reduce((a, p) => a + p.z, 0) / ring.length;
      const r = ring.reduce((a, p) => a + Math.hypot(p.x - cx, p.z - cz), 0) / ring.length + 0.012;
      const g = new THREE.Group();
      const band = new THREE.Mesh(new THREE.TorusGeometry(r, 0.014, 6, 24), scarfMat); band.rotation.x = Math.PI / 2; band.scale.set(1, 1.15, 1); band.position.set(cx, neckY, cz); g.add(band);
      const front = ring.reduce((m, p) => (p.z > m.z ? p : m), ring[0]);
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), scarfMat); knot.position.set(front.x + 0.02, neckY - 0.015, front.z + 0.015); g.add(knot);
      for (const s of [-1, 1]) { const tail = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.09, 0.006), scarfMat); tail.position.set(front.x + 0.02 + s * 0.02, neckY - 0.07, front.z + 0.012); tail.rotation.z = s * 0.35; g.add(tail); }
      attach(person, 'Bip01_Neck', g, new THREE.Vector3(0, 0, 0));
    }
  }
  person.outfit = 'receptionist';
  return person;
}

// ---- a hotel concierge: the coat (on the red track-jacket body, 'p3') taken to a dark charcoal suit, the white shirt
// as it was, and on each lapel the crossed golden keys that concierges of Les Clefs d'Or wear ----
export function dressConcierge(person) {
  person.root.traverse((o) => {
    if (!o.isMesh || !/_body$/.test(o.material.name)) return;
    o.material = recolor(o.material, 'concierge', (r, g, b) => {
      if (r > g * 1.5 && r > b * 1.4 && r > 60) { const k = Math.min(1, lum(r, g, b) / 120) * 34 + 10; return [k * 0.95, k, k * 1.08]; }   // the red jacket to charcoal
      if (r > 200 && g > 200 && b > 200) return null;                                                                                       // its white stripes: piping, kept
      return null;
    });
  });
  const head = bodyPoints(person, /_head$/), body = bodyPoints(person, /_body/);
  if (head.length && body.length) {
    const top = head.reduce((m, p) => Math.max(m, p.y), -Infinity), y = top - 0.25 - 0.13;
    for (const side of [-1, 1]) {
      const lap = body.filter((p) => Math.abs(p.y - y) < 0.02 && p.x * side > 0.06 && p.x * side < 0.12), pin = lap.length ? lap.reduce((m, p) => (p.z > m.z ? p : m), lap[0]) : null;
      if (!pin) continue;
      const keys = new THREE.Group();
      for (const a of [0.7, -0.7]) { const k = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.03, 0.002), goldMat); k.rotation.z = a; keys.add(k); const bow = new THREE.Mesh(new THREE.TorusGeometry(0.004, 0.0012, 4, 8), goldMat); bow.position.set(-Math.sin(a) * 0.016, Math.cos(a) * 0.016, 0); keys.add(bow); }
      attach(person, 'Bip01_Spine2', keys, new THREE.Vector3(pin.x, pin.y, pin.z + 0.004));
    }
  }
  person.outfit = 'concierge';
  return person;
}
