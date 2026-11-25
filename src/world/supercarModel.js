// The Corvina Strale: the game's own mid-engined supercar (an invented marque, no real car's design or badges),
// built from code so nothing about it needs a licence. Nose toward +z, wheels named as world/huracan.js expects
// (Wheel_02_LF_19 ... RR_22), paint on materials named CarPaint, lamps on materials named Light*.
// Real-world scale: 4.52 m long, 1.96 m wide, 1.17 m tall, 2.62 m wheelbase, 0.34 m wheel radius.
import * as THREE from 'three';

export const STRALE = { length: 4.52, width: 1.96, height: 1.17, wheelbase: 2.62, track: 1.68, wheelR: 0.34 };

// a lofted body: rings of a rounded section along z, each ring from f(z) = { w, top, bot, n, lean }
// (half-width, top and bottom heights, squareness, how far the upper side leans in), capped at both ends
function loft(z0, z1, stations, f, segs = 40) {
  const pos = [], idx = [], ring = segs;
  const zs = []; for (let i = 0; i <= stations; i++) { const t = i / stations; zs.push(z0 + (z1 - z0) * (0.5 - 0.5 * Math.cos(Math.PI * t))); }
  for (const z of zs) {
    const { w, top, bot, n = 4, lean = 0.2, nb = 6 } = f(z), c = (top + bot) / 2, h = (top - bot) / 2;
    for (let j = 0; j < ring; j++) {
      const a = (j / ring) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), e = sa >= 0 ? n : nb;
      const x = w * Math.sign(ca) * Math.abs(ca) ** (2 / e) * (sa > 0 ? 1 - lean * sa : 1);
      const y = c + h * Math.sign(sa) * Math.abs(sa) ** (2 / e);
      pos.push(x, y, z);
    }
  }
  for (let i = 0; i < zs.length - 1; i++) for (let j = 0; j < ring; j++) {
    const a = i * ring + j, b = i * ring + (j + 1) % ring, c = a + ring, d = b + ring;
    idx.push(a, b, c, b, d, c);
  }
  // caps: a fan from each end ring's centre
  for (const [i, flip] of [[0, true], [zs.length - 1, false]]) {
    const k = pos.length / 3; let cy = 0; for (let j = 0; j < ring; j++) cy += pos[(i * ring + j) * 3 + 1]; pos.push(0, cy / ring, zs[i]);
    for (let j = 0; j < ring; j++) { const a = i * ring + j, b = i * ring + (j + 1) % ring; flip ? idx.push(k, b, a) : idx.push(k, a, b); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// a smooth value along z through control points (Catmull-Rom; points in either order)
const interp = (pts0, z) => {
  const pts = pts0[0][0] < pts0[pts0.length - 1][0] ? pts0 : pts0.slice().reverse();
  if (z <= pts[0][0]) return pts[0][1]; if (z >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  let i = 0; while (z > pts[i + 1][0]) i++;
  const p0 = pts[Math.max(0, i - 1)][1], p1 = pts[i][1], p2 = pts[i + 1][1], p3 = pts[Math.min(pts.length - 1, i + 2)][1];
  const t = (z - pts[i][0]) / (pts[i + 1][0] - pts[i][0]);
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
};

function wheel(name, front) {
  const R = STRALE.wheelR, w = front ? 0.25 : 0.3, g = new THREE.Group(); g.name = name;
  const tyreM = new THREE.MeshStandardMaterial({ name: 'Tyre', color: 0x111112, roughness: 0.92 });
  const rimM = new THREE.MeshStandardMaterial({ name: 'Rim', color: 0x8e9196, metalness: 0.9, roughness: 0.28 });
  const discM = new THREE.MeshStandardMaterial({ name: 'Disc', color: 0x7a7c80, metalness: 0.7, roughness: 0.45 });
  const caliperM = new THREE.MeshStandardMaterial({ name: 'Caliper', color: 0xb8892e, metalness: 0.3, roughness: 0.4 });
  const tyre = new THREE.Mesh(new THREE.TorusGeometry(R - 0.07, 0.075, 12, 36), tyreM); tyre.scale.z = w / 0.15; g.add(tyre);
  const tread = new THREE.Mesh(new THREE.CylinderGeometry(R, R, w, 36, 1, true), tyreM); tread.rotation.x = Math.PI / 2; g.add(tread);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.1, R - 0.1, w * 0.9, 28), rimM); barrel.rotation.x = Math.PI / 2; g.add(barrel);
  // the face: a hub and ten thin twisted spokes, on the outer side (+z here; turned outward below)
  const face = new THREE.Group(); face.position.z = w * 0.46; g.add(face);
  { const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.04, 16), rimM); hub.rotation.x = Math.PI / 2; face.add(hub); }
  for (let i = 0; i < 10; i++) {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.026, R - 0.13, 0.03), rimM);
    sp.geometry.translate(0, (R - 0.13) / 2 + 0.04, 0);
    sp.rotation.z = (i / 10) * Math.PI * 2 + (i % 2 ? 0.12 : -0.12); face.add(sp);
  }
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.15, R - 0.15, 0.03, 32), discM); disc.rotation.x = Math.PI / 2; disc.position.z = w * 0.15; g.add(disc);
  const cal = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.06), caliperM); cal.position.set(front ? -0.12 : 0.12, 0.08, w * 0.22); g.add(cal);
  g.rotation.y = Math.PI / 2;   // axle along x
  return g;
}

export function buildStrale({ paint = 0xd8b23a } = {}) {
  const S = STRALE, half = S.width / 2, wb = S.wheelbase / 2;
  const root = new THREE.Group(); root.name = 'corvina-strale';
  const paintM = new THREE.MeshPhysicalMaterial({ name: 'CarPaint', color: paint, metalness: 0.55, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 });
  const glassM = new THREE.MeshPhysicalMaterial({ name: 'Glass', color: 0x0c1014, metalness: 0.2, roughness: 0.04, transparent: true, opacity: 0.82, clearcoat: 1 });
  const blackM = new THREE.MeshStandardMaterial({ name: 'Trim', color: 0x0b0b0c, roughness: 0.55, metalness: 0.2 });
  const carbonM = new THREE.MeshStandardMaterial({ name: 'Carbon', color: 0x18191b, roughness: 0.35, metalness: 0.4 });
  const headM = new THREE.MeshStandardMaterial({ name: 'Light_Head', color: 0xffffff, emissive: 0xeaf2ff, emissiveIntensity: 0.15 });
  const tailM = new THREE.MeshStandardMaterial({ name: 'Light_Tail', color: 0x400608, emissive: 0xff1a1a, emissiveIntensity: 0.15 });

  const arches = [{ z: wb, cy: S.wheelR, r: 0.42 }, { z: -wb, cy: S.wheelR, r: 0.43 }];
  // the body: a low wedge nose, a long flat deck, a cut-off tail; arches lifted over the wheels
  const topP = [[-2.27, 0.84], [-2.1, 0.9], [-1.5, 0.89], [-0.8, 0.86], [0.0, 0.83], [0.6, 0.79], [1.0, 0.79], [1.5, 0.74], [1.95, 0.6], [2.3, 0.42]];
  const wP = [[-2.27, 0.9], [-2.0, 0.97], [-1.3, 0.98], [0.5, 0.97], [1.4, 0.95], [1.9, 0.86], [2.3, 0.62]];
  const archY = (z) => { let y = 0.19; for (const a of arches) { const d = Math.abs(z - a.z); if (d < a.r) y = Math.max(y, a.cy + Math.sqrt(a.r * a.r - d * d) * 0.88); } return y; };
  const bodyF = (z) => ({ w: interp(wP, z), top: interp(topP, z), bot: Math.min(archY(z), interp(topP, z) - 0.12), n: 3.2, nb: 8, lean: 0.24 });
  const body = new THREE.Mesh(loft(-2.27, 2.3, 120, bodyF, 48), paintM); root.add(body);
  // the canopy: a steep screen, a short roof, glass falling over the engine to the tail
  const ghTop = [[-1.95, 0.9], [-1.2, 1.03], [-0.45, 1.165], [0.2, 1.12], [0.95, 0.8]];
  const ghW = [[-1.95, 0.52], [-0.8, 0.7], [0.4, 0.68], [0.95, 0.58]];
  const ghMesh = new THREE.Mesh(loft(-1.95, 0.95, 60, (z) => ({ w: interp(ghW, z), top: interp(ghTop, z), bot: interp(topP, z) - 0.05, n: 2.6, nb: 8, lean: 0.3 }), 40), glassM); root.add(ghMesh);
  for (let i = 0; i < 6; i++) {
    const z = -1.15 - i * 0.14, y = 1.0 - i * 0.017;
    const l = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.012, 0.05), blackM); l.position.set(0, y + 0.02, z); l.rotation.x = 0.2; root.add(l);
  }

  // side intakes behind the doors, a sill, a front splitter, a rear diffuser
  for (const s of [-1, 1]) {
    const sc = new THREE.Shape(); sc.moveTo(-0.25, 0.42); sc.lineTo(-0.5, 0.74); sc.lineTo(-1.05, 0.78); sc.lineTo(-0.95, 0.5); sc.closePath();
    const intake = new THREE.Mesh(new THREE.ExtrudeGeometry(sc, { depth: 0.02, bevelEnabled: false }), blackM); intake.geometry.rotateY(-Math.PI / 2);
    intake.position.x = s * 0.985; intake.rotation.z = s * 0.08; root.add(intake);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 1.7), carbonM); sill.position.set(s * (half - 0.02), 0.24, 0); root.add(sill);
    // mirrors on stalks
    const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.04), carbonM); stalk.position.set(s * 0.72, 0.86, 0.66); root.add(stalk);
    const mir = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.15), paintM); mir.position.set(s * 0.83, 0.88, 0.64); root.add(mir);
    // the lamps: a thin arrow of light either side of the nose, a light bar at the tail
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.05), headM); head.position.set(s * 0.5, interp(topP, 2.02) - 0.035, 2.02); head.rotation.set(-0.45, s * 0.42, 0); root.add(head);
    
  }
  const splitter = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.025, 0.2), carbonM); splitter.position.set(0, 0.18, 2.14); root.add(splitter);
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.07, 0.06), blackM); grille.position.set(0, 0.27, 2.26); root.add(grille);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.035, 0.04), tailM); tail.position.set(0, 0.73, -2.275); root.add(tail);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.16, 0.04), blackM); mesh.position.set(0, 0.52, -2.27); root.add(mesh);
  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 0.3), carbonM); diffuser.position.set(0, 0.23, -2.14); root.add(diffuser);
  for (const s of [-1, 1]) { const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.12, 16, 1, true), new THREE.MeshStandardMaterial({ name: 'Exhaust', color: 0x9a9a9a, metalness: 0.9, roughness: 0.3, side: THREE.DoubleSide })); pipe.rotation.x = Math.PI / 2; pipe.position.set(s * 0.12, 0.36, -2.28); root.add(pipe); }
  // the marque on the nose: a small gilt chevron (the invented Corvina mark)
  const mark = new THREE.Shape(); mark.moveTo(0, 0.05); mark.lineTo(0.05, 0); mark.lineTo(0.03, 0); mark.lineTo(0, 0.03); mark.lineTo(-0.03, 0); mark.lineTo(-0.05, 0); mark.closePath();
  const badge = new THREE.Mesh(new THREE.ExtrudeGeometry(mark, { depth: 0.01, bevelEnabled: false }), new THREE.MeshStandardMaterial({ name: 'Badge', color: 0xd6b25a, metalness: 1, roughness: 0.25 }));
  badge.position.set(0, interp(topP, 2.12) + 0.004, 2.12); badge.rotation.x = -Math.PI / 2 + 0.5; root.add(badge);
  // a dark floor so the underside never shows sky
  const floor = new THREE.Mesh(new THREE.BoxGeometry(S.width - 0.3, 0.04, 3.7), blackM); floor.position.y = 0.2; root.add(floor);

  // wheels (named for world/huracan.js: hub pivots are found from each wheel's own bounds)
  const wl = [['Wheel_02_LF_19', half - 0.14, wb, true], ['Wheel_02_LR_20', half - 0.12, -wb, false], ['Wheel_02_RF_21', -(half - 0.14), wb, true], ['Wheel_02_RR_22', -(half - 0.12), -wb, false]];
  for (const [n, x, z, front] of wl) {
    const holder = new THREE.Group(); holder.position.set(x, S.wheelR, z); root.add(holder);
    const w = wheel(n, front); if (x < 0) w.rotation.y = -Math.PI / 2; holder.add(w);
  }
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return root;
}
