// Mission One's single item: a sealed kraft document pouch left on Zhou's stall counter.
// Placeholder geometry (one thin box) wearing procedural canvas faces. It has two sides, and the
// close-up (missionOne.js) lets you turn it over:
//   front  the red-marker label, "from the family, for Mr Lin, do not open" (up on the counter)
//   back   the flap: a string wound figure-of-eight round two buttons, and a paper seal signed
//          across the flap's edge. Its states: wound (as left), unwound, rewound (wound back by
//          you: a plain wrap, never the neat figure-of-eight; Old Lin can tell), torn (opened).
// The same mesh appears on the counter (front up), held in front of the camera and in Old Lin's
// hand after the handoff (back out: what you did to it shows).
import * as THREE from 'three';
import { L, stall } from './layout.js';
import { makeCanvas, tex, grain, rng, FONT } from './canvas.js';
import { T } from './text.js';

const PW = 1024, PH = 720;              // pouch face canvas (aspect matches the box top)
export const HELD_LAYER = 2;            // camera.layers.enable(HELD_LAYER) in main. NOT 1: the river's mirror camera renders layer 1
const SIZE = { w: 0.34, h: 0.014, d: 0.24 };

function kraft(ctx, w, h, seed) {
  ctx.fillStyle = '#b08856'; ctx.fillRect(0, 0, w, h);
  const r = rng(seed);
  for (let i = 0; i < 900; i++) {                         // paper fibres
    ctx.strokeStyle = `rgba(${r() < 0.5 ? '90,60,30' : '220,190,140'},${0.05 + r() * 0.08})`;
    ctx.lineWidth = 1 + r() * 1.5;
    const x = r() * w, y = r() * h, a = r() * 6.283, l = 6 + r() * 26;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
  }
  // rain spots from the walk over
  for (let i = 0; i < 14; i++) {
    const x = r() * w, y = r() * h, s = 10 + r() * 30;
    const g = ctx.createRadialGradient(x, y, 0, x, y, s);
    g.addColorStop(0, 'rgba(70,45,20,0.18)'); g.addColorStop(1, 'rgba(70,45,20,0)');
    ctx.fillStyle = g; ctx.fillRect(x - s, y - s, s * 2, s * 2);
  }
}

function button(ctx, x, y) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(x + 3, y + 4, 30, 0, 7); ctx.fill();
  ctx.fillStyle = '#6d4b2a'; ctx.beginPath(); ctx.arc(x, y, 30, 0, 7); ctx.fill();
  ctx.strokeStyle = '#4a311a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, 22, 0, 7); ctx.stroke();
}

// The red marker label, in the same hand (Ma Shan Zheng, red) as the poster's scrawl.
function label(ctx) {
  ctx.save(); ctx.translate(560, 450); ctx.rotate(-0.07);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = `86px ${FONT.hand}`;
  ctx.shadowColor = 'rgba(160,10,10,0.35)'; ctx.shadowBlur = 4;
  ctx.fillStyle = 'rgba(196,22,22,0.9)';
  T.mission.label.forEach((s, i) => ctx.fillText(s, i * 14, i * 92));
  ctx.restore();
}

// the front: plain kraft and the label
export function drawPouchFront() {
  const [c, ctx] = makeCanvas(PW, PH);
  kraft(ctx, PW, PH, 17);
  ctx.save(); ctx.translate(-330, -250); label(ctx); ctx.restore();
  grain(ctx, PW, PH, 12, 61);
  return c;
}

// the back: state 'wound' | 'unwound' | 'rewound' | 'torn'
export function drawPouch(state = 'wound') {
  if (state === true) state = 'torn'; else if (state === false) state = 'wound';
  const torn = state === 'torn';
  const [c, ctx] = makeCanvas(PW, PH);
  kraft(ctx, PW, PH, 31);
  const flapY = 300, tipX = PW / 2, tipY = 360;
  // the inside showing where the flap has been lifted
  if (torn) {
    ctx.fillStyle = '#5b4126'; ctx.beginPath(); ctx.moveTo(30, 40); ctx.lineTo(PW - 30, 40); ctx.lineTo(tipX, tipY - 40); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ece6d6'; ctx.fillRect(150, 52, PW - 300, 80);           // the edge of the page inside
    ctx.fillStyle = '#2b2b2b'; ctx.font = `900 34px ${FONT.serif}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(T.mission.doc.title, PW / 2, 96);
  }
  // flap
  ctx.save();
  if (torn) { ctx.translate(0, -26); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 18; }
  ctx.fillStyle = torn ? '#a57d4c' : '#a98150';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(PW, 0); ctx.lineTo(PW, 20); ctx.lineTo(tipX, flapY + 60); ctx.lineTo(0, 20); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(60,38,16,0.55)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, torn ? -6 : 20); ctx.lineTo(tipX, (torn ? flapY + 34 : flapY + 60)); ctx.lineTo(PW, torn ? -6 : 20); ctx.stroke();

  // string-and-button closure
  const b1 = [tipX, flapY + 18], b2 = [tipX, flapY + 150];
  button(ctx, ...b1); button(ctx, ...b2);
  ctx.strokeStyle = '#e8dcc0'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  if (state === 'wound') {
    for (let i = 0; i < 3; i++) {                                    // figure-of-eight, three turns
      ctx.beginPath();
      ctx.moveTo(b1[0] - 18 + i * 6, b1[1]); ctx.bezierCurveTo(b1[0] - 60, b1[1] + 60, b2[0] + 60, b2[1] - 60, b2[0] + 18 - i * 6, b2[1]);
      ctx.moveTo(b1[0] + 18 - i * 6, b1[1]); ctx.bezierCurveTo(b1[0] + 60, b1[1] + 60, b2[0] - 60, b2[1] - 60, b2[0] - 18 + i * 6, b2[1]);
      ctx.stroke();
    }
  } else if (state === 'rewound') {                                  // wound back in a hurry: a plain wrap, slack, the tail loose
    ctx.lineWidth = 5;
    for (let i = 0; i < 2; i++) {
      ctx.beginPath(); ctx.moveTo(b1[0] + 20, b1[1] + 4 + i * 5); ctx.quadraticCurveTo(b1[0] + 70 + i * 12, (b1[1] + b2[1]) / 2, b2[0] + 22, b2[1] - 6 + i * 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(b1[0] - 20, b1[1] + 6 + i * 4); ctx.quadraticCurveTo(b1[0] - 52 - i * 16, (b1[1] + b2[1]) / 2 + 10, b2[0] - 22, b2[1] - 4 + i * 5); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(b2[0], b2[1] + 24); ctx.bezierCurveTo(b2[0] + 40, b2[1] + 70, b2[0] - 30, b2[1] + 110, b2[0] + 30, b2[1] + 150); ctx.stroke();
  } else {                                                           // unwound, hanging loose
    ctx.beginPath(); ctx.moveTo(b2[0], b2[1]); ctx.bezierCurveTo(b2[0] + 80, b2[1] + 90, b2[0] - 40, b2[1] + 160, b2[0] + 60, PH - 30); ctx.stroke();
  }

  // the paper seal, pasted across the flap's edge and signed over
  const sx = tipX - 230, sw = 92, sy0 = flapY - 120, sy1 = flapY + 170;
  const strip = (y0, y1) => {
    ctx.fillStyle = '#efe7d2'; ctx.fillRect(sx - sw / 2, y0, sw, y1 - y0);
    ctx.fillStyle = 'rgba(180,20,20,0.85)'; ctx.font = `900 64px ${FONT.serif}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  };
  if (!torn) {
    strip(sy0, sy1);
    ctx.fillText(T.mission.sealMark, sx, sy0 + 62);
    ctx.strokeStyle = 'rgba(180,20,20,0.85)'; ctx.lineWidth = 4; ctx.strokeRect(sx - 38, sy0 + 24, 76, 76);
    ctx.save(); ctx.translate(sx + 6, flapY + 70); ctx.rotate(-0.25);   // signature across strip + kraft
    ctx.fillStyle = '#1a1a1a'; ctx.font = `92px ${FONT.hand}`; ctx.fillText(T.mission.sealSign, 0, 0);
    ctx.restore();
  } else {
    const cut = flapY + 40, r = rng(9);
    ctx.save(); ctx.translate(0, -26); strip(sy0, cut);               // upper half lifted with the flap
    ctx.fillText(T.mission.sealMark, sx, sy0 + 62);
    ctx.restore();
    strip(cut + 10, sy1);
    // ragged torn edges
    ctx.fillStyle = '#f8f3e6';
    for (const [y, dir] of [[cut - 26, 1], [cut + 10, -1]]) {
      ctx.beginPath(); ctx.moveTo(sx - sw / 2, y);
      for (let x = sx - sw / 2; x <= sx + sw / 2; x += 8) ctx.lineTo(x, y + dir * (2 + r() * 12));
      ctx.lineTo(sx + sw / 2, y); ctx.closePath(); ctx.fill();
    }
    ctx.save(); ctx.translate(sx + 6, flapY + 70); ctx.rotate(-0.25);   // the signature, now in two pieces
    ctx.beginPath(); ctx.rect(-200, cut - flapY - 60, 400, 400); ctx.clip();
    ctx.fillStyle = '#1a1a1a'; ctx.font = `92px ${FONT.hand}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(T.mission.sealSign, 0, 0);
    ctx.restore();
  }
  grain(ctx, PW, PH, 12, 77);
  return c;
}

// The page inside: a stall-transfer agreement. Transferee blank; dated 31 October.
export function drawDocument() {
  const W = 1024, H = 1448, D = T.mission.doc;
  const [c, ctx] = makeCanvas(W, H);
  ctx.fillStyle = '#efeadc'; ctx.fillRect(0, 0, W, H);
  // fold creases (it has been folded in three to fit the pouch)
  for (const y of [H / 3, (2 * H) / 3]) {
    const g = ctx.createLinearGradient(0, y - 10, 0, y + 10);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(60,50,30,0.16)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, y - 10, W, 20);
  }
  ctx.fillStyle = '#161616'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 82px ${FONT.serif}`; ctx.fillText(D.title, W / 2, 170);
  ctx.fillRect(110, 250, W - 220, 4);
  ctx.textAlign = 'left'; ctx.font = `500 40px ${FONT.serif}`;
  D.lines.forEach((ln, i) => ctx.fillText(ln, 110, 360 + i * 84));
  // the transferee line is left blank
  ctx.fillRect(300, 470, 420, 3);

  ctx.font = `500 40px ${FONT.serif}`;
  ctx.fillText(D.signLabel, 110, 1010);
  ctx.fillText(D.dateLabel, 110, 1170);
  // signature + date, by hand
  ctx.fillStyle = '#1b2440'; ctx.font = `88px ${FONT.hand}`;
  ctx.save(); ctx.translate(380, 1000); ctx.rotate(-0.05); ctx.fillText(D.sign, 0, 0); ctx.restore();
  ctx.font = `64px ${FONT.hand}`;
  ctx.save(); ctx.translate(250, 1172); ctx.rotate(-0.03); ctx.fillText(D.date, 0, 0); ctx.restore();
  // red thumbprint over the signature
  ctx.save(); ctx.translate(690, 1010); ctx.rotate(0.3);
  ctx.strokeStyle = 'rgba(190,20,30,0.7)'; ctx.lineWidth = 3;
  for (let i = 1; i < 11; i++) { ctx.beginPath(); ctx.ellipse(0, 0, i * 5.2, i * 7, 0, 0.3 + i * 0.12, 6.0 + i * 0.05); ctx.stroke(); }
  ctx.restore();
  ctx.fillStyle = 'rgba(190,20,30,0.1)'; ctx.beginPath(); ctx.ellipse(690, 1010, 60, 76, 0.3, 0, 7); ctx.fill();
  grain(ctx, W, H, 10, 55);
  return c;
}

export function createPouch() {
  const BACKS = ['wound', 'unwound', 'rewound', 'torn'];
  const canvases = { front: drawPouchFront(), doc: drawDocument() };
  for (const b of BACKS) canvases[b] = drawPouch(b);
  canvases.sealed = canvases.wound;                                 // (older names)
  const maps = Object.fromEntries(['front', ...BACKS].map((k) => [k, tex(canvases[k], { repeat: false, aniso: 8 })]));
  const paper = (m) => new THREE.MeshStandardMaterial({ map: m, emissive: 0xffffff, emissiveMap: m, emissiveIntensity: 0.3, roughness: 0.85 });
  const front = paper(maps.front), face = paper(maps.wound);       // face: the back, whose look changes
  const edge = new THREE.MeshStandardMaterial({ color: 0x8e6a3e, roughness: 0.9, emissive: 0x1e1408 });
  const geo = new THREE.BoxGeometry(SIZE.w, SIZE.h, SIZE.d);
  // the held copy draws over nearby walls instead of clipping into them (convex box + back-face
  // culling, so it stays correct without a depth test)
  const faceHeld = face.clone(), edgeHeld = edge.clone();
  for (const m of [faceHeld, edgeHeld]) { m.depthTest = false; m.depthWrite = false; m.fog = false; }
  const make = (name, f = face, e = edge, under = e) => {
    const m = new THREE.Mesh(geo, [e, e, f, under, e, e]);          // +y carries the face you see
    m.name = name; m.visible = false; return m;
  };

  // 1. on Zhou's stall counter, angled toward the pavement: label up, the flap underneath
  const onStall = make('pouch-on-stall', front, edge, face);
  const counterY = L.curbH + 1.05;
  onStall.position.set(stall.x + 0.22, counterY + SIZE.h / 2 + 0.001, stall.z + 0.08);
  onStall.rotation.y = 0.18;
  const focus = new THREE.Vector3(onStall.position.x, counterY + 0.05, onStall.position.z);

  // 2. held in front of the camera (lower right, face toward you)
  const held = make('pouch-held', faceHeld, edgeHeld);
  held.renderOrder = 10; held.frustumCulled = false;
  held.layers.set(HELD_LAYER);                                    // player camera only: not in the river's mirror pass
  const heldOffset = new THREE.Vector3(0.26, -0.25, -0.68);
  const heldRot = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.2, -0.28, -0.12));
  const _off = new THREE.Vector3();

  // 3. held flat against Old Lin's chest after the handoff, face out, so the seal (or the
  //    torn seal) stays readable above the subtitle bar and from along the railing
  const atLin = make('pouch-lin');
  atLin.scale.setScalar(0.82);
  atLin.position.set(0.02, 0.17, 0.155);
  atLin.rotation.set(Math.PI / 2 - 0.12, 0, 0.14);

  let look = 'wound';
  return {
    canvases, focus, meshes: [onStall, held, atLin],
    attachToLin(npcs) { const lin = npcs.byId.lin; if (lin && atLin.parent !== lin.torso) lin.torso.add(atLin); },
    // the back's look: 'wound' | 'unwound' | 'rewound' | 'torn'
    setLook(k) {
      if (!maps[k] || k === look) return; look = k;
      for (const f of [face, faceHeld]) { f.map = maps[k]; f.emissiveMap = maps[k]; f.needsUpdate = true; }
    },
    setSealed(s) { this.setLook(s ? (look === 'torn' ? 'wound' : look) : 'torn'); },
    get look() { return look; },
    // where: 'none' | 'stall' | 'held' | 'lin'
    show(where) { onStall.visible = where === 'stall'; held.visible = where === 'held'; atLin.visible = where === 'lin'; },
    update(camera, t) {
      if (!held.visible) return;
      _off.copy(heldOffset); _off.y += Math.sin(t * 1.7) * 0.004;
      held.position.copy(camera.position).add(_off.applyQuaternion(camera.quaternion));
      held.quaternion.copy(camera.quaternion).multiply(heldRot);
    },
  };
}
