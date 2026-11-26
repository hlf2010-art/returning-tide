// Contact shadows: the soft darkening right under furniture and people, where the floor meets them (the light
// that can't get in there). Real-time shadow maps only come from the nearest lamps, and none at low quality, so
// without these a chair or a person indoors floats on the marble. One shared soft texture; static blobs are
// merged per group; moving ones follow their owner.
import * as THREE from 'three';

let tex = null;
function blobTexture() {
  if (tex) return tex;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,0.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  tex = new THREE.CanvasTexture(c);
  return tex;
}
const mats = new Map();
function blobMat(opacity) {
  const k = opacity.toFixed(2);
  if (!mats.has(k)) mats.set(k, new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: blobTexture(), transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
  return mats.get(k);
}
// a soft dark ellipse on the floor at y, w x d (m), turned by ry
export function contactShadow(parent, x, y, z, w, d, opacity = 0.45, ry = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), blobMat(opacity));
  m.position.set(x, y + 0.012, z); m.rotation.y = ry; m.renderOrder = 1; parent.add(m);
  return m;
}
