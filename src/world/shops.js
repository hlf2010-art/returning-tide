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
  // the back counter (slim: the baristas work in the aisle between it and the window), the
  // espresso machine, grinders, knock box, tamping mat, cups and lids, syrups
  const CT = y0 + 0.93, zc = zWall + 0.38;                                     // counter top, counter front
  add(new THREE.BoxGeometry(W - 0.3, 0.9, 0.36), black, x, y0 + 0.45, zWall + 0.2);
  add(new THREE.BoxGeometry(W - 0.3, 0.03, 0.4), white, x, CT - 0.015, zWall + 0.21);
  add(new THREE.BoxGeometry(W - 0.2, 0.01, D - 0.1), std({ color: 0x2a2b2c, roughness: 0.8 }), x, y0 + 0.005, zWall + D / 2);   // the floor behind the counter
  const steel = std({ color: 0xc8cacc, roughness: 0.22, metalness: 1 });
  const brushed = std({ color: 0xaeb2b6, roughness: 0.4, metalness: 1 });
  const rubber = std({ color: 0x151515, roughness: 0.85 });
  const porcelain = std({ color: 0xf6f5f1, roughness: 0.3 });
  const mx = x + 0.75;                                                         // the espresso machine: two groups, steam wands, cup warmer
  add(new THREE.BoxGeometry(0.78, 0.4, 0.3), brushed, mx, CT + 0.22, zWall + 0.2);
  add(new THREE.BoxGeometry(0.74, 0.17, 0.012), black, mx, CT + 0.33, zWall + 0.355);                // front panel
  for (const dx of [-0.18, 0.18]) {
    add(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 16).rotateX(Math.PI / 2), white, mx + dx, CT + 0.35, zWall + 0.363);   // pressure gauges
    add(new THREE.CylinderGeometry(0.045, 0.04, 0.05, 16), steel, mx + dx, CT + 0.17, zWall + 0.33);    // group heads
    add(new THREE.CylinderGeometry(0.04, 0.035, 0.035, 14), steel, mx + dx, CT + 0.13, zWall + 0.33);   // portafilters locked in
    add(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 8).rotateX(Math.PI / 2 - 0.25), black, mx + dx, CT + 0.11, zWall + 0.42);   // their handles
    add(new THREE.BoxGeometry(0.07, 0.03, 0.02), black, mx + dx, CT + 0.29, zWall + 0.37);             // shot buttons
  }
  for (const dx of [-0.36, 0.36]) add(new THREE.CylinderGeometry(0.007, 0.007, 0.2, 8).rotateX(0.35), steel, mx + dx, CT + 0.2, zWall + 0.38);   // steam wands
  add(new THREE.BoxGeometry(0.66, 0.025, 0.14), steel, mx, CT + 0.015, zWall + 0.33);                 // drip tray
  add(new THREE.BoxGeometry(0.74, 0.012, 0.26), steel, mx, CT + 0.425, zWall + 0.2);                  // cup warmer
  for (let i = 0; i < 8; i++) add(new THREE.CylinderGeometry(0.035, 0.028, 0.06, 12), porcelain, mx - 0.3 + (i % 4) * 0.2 + (i > 3 ? 0.08 : 0), CT + 0.46, zWall + 0.14 + (i > 3 ? 0.11 : 0));
  const beans = std({ color: 0x3a2214, roughness: 0.6 }), hopper = std({ color: 0x9a7a5a, roughness: 0.1, transparent: true, opacity: 0.55, depthWrite: false });
  for (const [gx, k] of [[x + 1.5, 1], [x + 1.82, 0.82]]) {                    // two grinders: the house blend and the single origin
    add(new THREE.BoxGeometry(0.17 * k, 0.06, 0.24 * k), black, gx, CT + 0.03, zWall + 0.22);
    add(new THREE.BoxGeometry(0.15 * k, 0.32 * k, 0.18 * k), black, gx, CT + 0.06 + 0.16 * k, zWall + 0.2);
    add(new THREE.BoxGeometry(0.04, 0.04, 0.06), brushed, gx, CT + 0.06 + 0.12 * k, zWall + 0.32);     // spout
    add(new THREE.CylinderGeometry(0.085 * k, 0.04 * k, 0.17 * k, 14), hopper, gx, CT + 0.06 + 0.32 * k + 0.085 * k, zWall + 0.2);
    add(new THREE.CylinderGeometry(0.07 * k, 0.04 * k, 0.1 * k, 14), beans, gx, CT + 0.06 + 0.32 * k + 0.05 * k, zWall + 0.2);
  }
  add(new THREE.BoxGeometry(0.16, 0.12, 0.16), rubber, x + 0.15, CT + 0.06, zWall + 0.24);             // knock box
  add(new THREE.CylinderGeometry(0.01, 0.01, 0.16, 8).rotateZ(Math.PI / 2), brushed, x + 0.15, CT + 0.11, zWall + 0.24);
  add(new THREE.BoxGeometry(0.2, 0.012, 0.16), rubber, x + 0.36, CT + 0.006, zWall + 0.27);             // tamping mat, tamper, a spare portafilter
  add(new THREE.CylinderGeometry(0.028, 0.028, 0.02, 14), steel, x + 0.33, CT + 0.022, zWall + 0.27);
  add(new THREE.CylinderGeometry(0.012, 0.016, 0.07, 10), black, x + 0.33, CT + 0.067, zWall + 0.27);
  add(new THREE.CylinderGeometry(0.04, 0.035, 0.03, 14), steel, x + 0.43, CT + 0.027, zWall + 0.25);
  // cups waiting on the pass, stacks of cups and lids, the syrups
  for (let i = 0; i < 3; i++) { const c = makeCup('manner'); c.position.set(x - 0.5 + i * 0.13, CT, zWall + 0.3); c.rotation.y = (i % 2 ? 0.3 : -0.2); g.add(c); }
  for (let i = 0; i < 3; i++) {
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.3, 14), porcelain); stack.position.set(x - 1.12 + i * 0.12, CT + 0.15, zWall + 0.14); g.add(stack);
  }
  add(new THREE.CylinderGeometry(0.048, 0.048, 0.12, 14), black, x - 0.78, CT + 0.06, zWall + 0.14);   // lids
  const syrups = [0x6b3a1f, 0xc79a3b, 0x8a1f2c, 0xe7d9b8];
  syrups.forEach((col, i) => { add(new THREE.CylinderGeometry(0.03, 0.03, 0.24, 10), std({ color: col, roughness: 0.15, transparent: true, opacity: 0.85 }), x - 1.85 + i * 0.08, CT + 0.12, zWall + 0.12); add(new THREE.CylinderGeometry(0.012, 0.012, 0.06, 8), black, x - 1.85 + i * 0.08, CT + 0.27, zWall + 0.12); });
  // the milk fridge under the counter (its steel door) and a towel over the rail
  add(new THREE.BoxGeometry(0.8, 0.7, 0.01), brushed, x + 0.75, y0 + 0.42, zc + 0.006);
  add(new THREE.BoxGeometry(0.3, 0.2, 0.01), std({ color: 0xe9e4d8, roughness: 0.9 }), x - 0.2, CT - 0.12, zc + 0.008);
  // glass, and the open hatch you order at
  const glass = std({ color: 0x9fb3bd, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.16, depthWrite: false });
  add(new THREE.BoxGeometry(W - 0.2, 2.1, 0.02), glass, x + 0.45, y0 + 1.95, zf - 0.02).scale.x = 0.78;
  add(new THREE.BoxGeometry(0.05, 2.1, 0.06), black, x - 1.05, y0 + 1.95, zf - 0.02);               // hatch post
  add(new THREE.BoxGeometry(1.0, 0.04, 0.3), white, x - 1.55, y0 + 1.06, zf + 0.08);               // hatch ledge, outside
  add(new THREE.BoxGeometry(1.0, 0.04, 0.12), white, x - 1.55, y0 + 1.06, zf - 0.07);               // and its sill inside
  // the order code on the ledge: a little acrylic stand with the QR you scan
  const qr = panel(0.1, 0.14, (c, w, h) => {
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#111';
    const n = 21, s = w * 0.8 / n, ox = w * 0.1, oy = w * 0.1;
    let seed = 7; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const finder = (a, b) => i >= a && i < a + 7 && j >= b && j < b + 7;
      const f = finder(0, 0) || finder(n - 7, 0) || finder(0, n - 7);
      const on = f ? (() => { const a = i < 7 ? i : i - (n - 7), b = j < 7 ? j : j - (n - 7); return a === 0 || a === 6 || b === 0 || b === 6 || (a > 1 && a < 5 && b > 1 && b < 5); })() : r() > 0.5;
      if (on) c.fillRect(ox + i * s, oy + j * s, s, s);
    }
    c.font = `700 ${h * 0.09}px ${FONT.sans}`; c.textAlign = 'center'; c.fillText('扫码点单', w / 2, h * 0.92);
  }, { emissive: 0.2, px: 160 });
  qr.position.set(x - 1.9, y0 + 1.16, zf + 0.12); qr.rotation.x = -0.15; g.add(qr);
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
    // where the baristas work (world/baristas.js): the aisle behind the window, the machine, the pass
    work: {
      y0, top: CT, zc, aisle: zWall + 0.6, zf,
      machine: mx, grinder: x + 1.5, tamp: x + 0.36, pass: x - 0.1, hatch: x - 1.45, qr: x - 1.9,
      sill: { y: y0 + 1.08, z: zf - 0.08 }, ledge: { x: x - 1.6, y: y0 + 1.08, z: zf + 0.06 },
      pitcherRest: { x: mx + 0.5, z: zWall + 0.28 },
    },
  };
}
