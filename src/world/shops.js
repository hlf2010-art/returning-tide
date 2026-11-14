// Shopfronts on Hankou Road. Manner Coffee: the chain's official store list has a Hankou Road shop
// ("汉口路126店"; whether 126 is the street number isn't clear from the listing), so one stands
// here, on the first block in from the Bund. It's built the way their small takeaway shops are:
// a narrow glazed front, black steel, a white-tiled bright interior with the espresso machine on
// show, a menu lightbox, a hatch you order at, and a short queue. Signage is the name set in
// type; no logo artwork is reproduced. Prices are typical Manner prices, not a live menu.
import { cup as makeCup } from './cups.js';
import * as THREE from 'three';
import { makeCanvas, tex, FONT } from './canvas.js';
import { manner as M } from './layout.js';

const std = (o) => new THREE.MeshStandardMaterial(o);
const UI = '"Inter", "Noto Sans SC", sans-serif';
function panel(w, h, draw, { emissive = 0.4, px = 256, transparent = false } = {}) {
  const [c, ctx] = makeCanvas(Math.round(px * (w / h)), px);
  draw(ctx, c.width, c.height);
  const map = tex(c, { repeat: false });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), std({ map, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: emissive, roughness: 0.5, transparent }));
}

export const MANNER = M;

// returns { group, collider: {minX,maxX,minZ,maxZ}, hatch: {x,z}, queue: [{x,z}], light: {x,y,z} }
export function createManner(curbH, { x = MANNER.x, zWall = MANNER.zWall } = {}) {
  const g = new THREE.Group(); g.name = 'shop-manner';
  const D = MANNER.depth, W = MANNER.width, y0 = curbH, zf = zWall + D;          // zf: the glass line, out on the pavement
  const black = std({ color: 0x121314, roughness: 0.45, metalness: 0.6 });
  const white = std({ color: 0xf2f2ef, roughness: 0.35, emissive: 0xffffff, emissiveIntensity: 0.08 });
  const add = (geo, mat, px, py, pz) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); g.add(m); return m; };
  // the box of the shop, against the wall
  add(new THREE.BoxGeometry(W, 0.12, D), black, x, y0 + 3.0, zWall + D / 2);                 // roof / sign band base
  add(new THREE.BoxGeometry(0.1, 3.0, D), black, x - W / 2 + 0.05, y0 + 1.5, zWall + D / 2);  // side frames
  add(new THREE.BoxGeometry(0.1, 3.0, D), black, x + W / 2 - 0.05, y0 + 1.5, zWall + D / 2);
  add(new THREE.BoxGeometry(W, 0.9, 0.08), black, x, y0 + 0.45, zf - 0.04);                  // stall riser under the glass
  // the inside: white tiles, lit from above
  const tiles = panel(W - 0.2, 2.9, (c, w, h) => {
    c.fillStyle = '#f4f4f1'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 2;
    for (let yy = 0; yy < h; yy += h / 18) { c.beginPath(); c.moveTo(0, yy); c.lineTo(w, yy); c.stroke(); }
    for (let row = 0, yy = 0; yy < h; yy += h / 18, row++) for (let xx = (row % 2) * (w / 32); xx < w; xx += w / 16) { c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx, yy + h / 18); c.stroke(); }
    // the menu, mounted on the tiles
    c.fillStyle = '#111'; c.fillRect(w * 0.08, h * 0.08, w * 0.5, h * 0.3);
    c.fillStyle = '#fff'; c.font = `700 ${h * 0.032}px ${UI}`; c.textBaseline = 'top';
    const menu = [['美式 Americano', '10'], ['拿铁 Latte', '15'], ['燕麦拿铁 Oat Latte', '18'], ['澳白 Flat White', '18'], ['桂花拿铁 Osmanthus Latte', '20']];
    menu.forEach(([n, p], i) => { c.textAlign = 'left'; c.fillText(n, w * 0.1, h * (0.1 + i * 0.054)); c.textAlign = 'right'; c.fillText(p, w * 0.56, h * (0.1 + i * 0.054)); });
    c.fillStyle = 'rgba(255,255,255,0.6)'; c.textAlign = 'left'; c.font = `500 ${h * 0.022}px ${UI}`; c.fillText('自带杯减5元 · bring your own cup −¥5', w * 0.1, h * 0.375);
  }, { emissive: 0.32, px: 512 });
  tiles.position.set(x, y0 + 1.5, zWall + 0.02); g.add(tiles);
  // counter, espresso machine, grinder, cups
  add(new THREE.BoxGeometry(W - 0.3, 1.0, 0.45), black, x, y0 + 0.5, zWall + 0.3);
  add(new THREE.BoxGeometry(W - 0.3, 0.04, 0.5), white, x, y0 + 1.02, zWall + 0.3);
  const steel = std({ color: 0xc8cacc, roughness: 0.25, metalness: 1 });
  add(new THREE.BoxGeometry(0.8, 0.42, 0.4), steel, x + 0.7, y0 + 1.25, zWall + 0.28);
  for (const dx of [-0.2, 0.2]) add(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 10), black, x + 0.7 + dx, y0 + 1.08, zWall + 0.47);
  add(new THREE.CylinderGeometry(0.08, 0.1, 0.42, 12), black, x + 1.4, y0 + 1.25, zWall + 0.25);       // grinder
  for (let i = 0; i < 4; i++) { const c = makeCup('manner'); c.position.set(x - 0.9 + i * 0.12, y0 + 1.04, zWall + 0.42); c.rotation.y = (i % 2 ? 0.3 : -0.2); g.add(c); }   // cups waiting on the pass
  // glass, and the open hatch you order at
  const glass = std({ color: 0x9fb3bd, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.16, depthWrite: false });
  add(new THREE.BoxGeometry(W - 0.2, 2.1, 0.02), glass, x + 0.45, y0 + 1.95, zf - 0.02).scale.x = 0.78;
  add(new THREE.BoxGeometry(0.05, 2.1, 0.06), black, x - 1.05, y0 + 1.95, zf - 0.02);               // hatch post
  add(new THREE.BoxGeometry(1.0, 0.04, 0.3), white, x - 1.55, y0 + 1.06, zf + 0.08);               // hatch ledge, outside
  // the sign: the name set in type, white on black, lit
  const name = panel(W, 0.5, (c, w, h) => {
    c.fillStyle = '#0d0d0d'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff'; c.textBaseline = 'middle'; c.textAlign = 'center';
    c.font = `800 ${h * 0.46}px ${UI}`; c.fillText('MANNER COFFEE', w / 2, h * 0.52);
  }, { emissive: 0.9 });
  name.position.set(x, y0 + 3.35, zf + 0.01); g.add(name);
  const blade = panel(0.5, 0.5, (c, w, h) => {
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#0d0d0d'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `800 ${h * 0.2}px ${UI}`; c.fillText('MANNER', w / 2, h * 0.42); c.font = `600 ${h * 0.11}px ${FONT.sans}`; c.fillText('咖啡', w / 2, h * 0.66);
  }, { emissive: 0.8, px: 128 });
  blade.position.set(x + W / 2 + 0.05, y0 + 2.9, zf + 0.3); blade.rotation.y = Math.PI / 2; g.add(blade);
  // pavement: an A-frame with today's special
  const af = panel(0.55, 0.8, (c, w, h) => {
    c.fillStyle = '#1d1f1e'; c.fillRect(0, 0, w, h); c.fillStyle = '#f2ede2'; c.textAlign = 'center';
    c.font = `600 ${h * 0.07}px ${FONT.sans}`; c.fillText('今日推荐', w / 2, h * 0.18);
    c.font = `700 ${h * 0.1}px ${FONT.sans}`; c.fillText('桂花拿铁', w / 2, h * 0.36);
    c.font = `500 ${h * 0.06}px ${UI}`; c.fillText('Osmanthus latte', w / 2, h * 0.47); c.fillText('¥20', w / 2, h * 0.6);
  }, { emissive: 0.35, px: 200 });
  af.position.set(x + W / 2 + 0.5, y0 + 0.45, zf + 0.5); af.rotation.set(-0.18, -0.4, 0); g.add(af);
  g.traverse((o) => { if (o.isMesh && !o.material.transparent) { o.castShadow = true; o.receiveShadow = true; } });
  return {
    group: g,
    collider: { minX: x - W / 2, maxX: x + W / 2, minZ: zWall - 0.1, maxZ: zf },
    hatch: { x: x - 1.55, z: zf + 0.5 },                                        // where you stand to order
    queue: [{ x: x - 1.55, z: zf + 0.5 }, { x: x - 2.35, z: zf + 0.75 }, { x: x - 3.1, z: zf + 0.9 }],
    pickup: { x: x - 0.4, z: zf + 0.45 },
    light: { x, y: y0 + 2.7, z: zf + 1.1 },                                     // out over the pavement: a wash, not a hotspot on the tiles
  };
}
