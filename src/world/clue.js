// The one thing you can inspect: a missing-person notice taped round a lamp post,
// with a second hand's answer scrawled across it. It points at Mission One and
// nothing more: no quest state is created.
import * as THREE from 'three';
import { L, DECK_LAMP_X, CLUE_LAMP_Z } from './layout.js';
import { makeCanvas, tex, grain, rng, FONT } from './canvas.js';
import { T } from './text.js';

export function drawPoster() {
  const W = 1024, H = 1448, P = T.poster;
  const [c, ctx] = makeCanvas(W, H);
  ctx.fillStyle = '#ece5d3'; ctx.fillRect(0, 0, W, H);
  // rain has got at it: soft tide marks and vertical runs
  const r = rng(7);
  for (let i = 0; i < 9; i++) {
    const x = r() * W, w = 30 + r() * 120, g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, 'rgba(120,105,80,0)'); g.addColorStop(0.5, `rgba(120,105,80,${0.05 + r() * 0.07})`); g.addColorStop(1, 'rgba(120,105,80,0)');
    ctx.fillStyle = g; ctx.fillRect(x, 0, w, H);
  }
  ctx.fillStyle = '#141414'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 168px ${FONT.serif}`;
  [...P.title].forEach((ch, i) => ctx.fillText(ch, W / 2 + (i - 1.5) * 196, 190));
  ctx.fillRect(90, 300, W - 180, 6);

  // photocopied portrait
  const px = W / 2 - 180, py = 350, pw = 360, ph = 430;
  ctx.fillStyle = '#b9b6ad'; ctx.fillRect(px, py, pw, ph);
  ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
  ctx.fillStyle = '#3b3d40'; ctx.beginPath(); ctx.ellipse(W / 2, py + ph + 60, 210, 190, 0, 0, 7); ctx.fill();          // jacket
  ctx.fillStyle = '#d9d5ca'; ctx.fillRect(W / 2 - 34, py + 250, 68, 80);                                                // neck
  ctx.fillStyle = '#c9c4b8'; ctx.beginPath(); ctx.moveTo(W / 2 - 60, py + 318); ctx.lineTo(W / 2, py + 380); ctx.lineTo(W / 2 + 60, py + 318); ctx.fill();
  ctx.fillStyle = '#dedad0'; ctx.beginPath(); ctx.ellipse(W / 2, py + 180, 92, 116, 0, 0, 7); ctx.fill();               // face
  ctx.fillStyle = '#77797b'; ctx.beginPath(); ctx.ellipse(W / 2, py + 96, 96, 52, 0, Math.PI, 0); ctx.fill();           // thinning grey hair
  ctx.fillRect(W / 2 - 97, py + 92, 16, 60); ctx.fillRect(W / 2 + 81, py + 92, 16, 60);
  ctx.strokeStyle = '#1e1e1e'; ctx.lineWidth = 7;                                                                       // glasses
  ctx.strokeRect(W / 2 - 74, py + 156, 60, 42); ctx.strokeRect(W / 2 + 14, py + 156, 60, 42);
  ctx.beginPath(); ctx.moveTo(W / 2 - 14, py + 172); ctx.lineTo(W / 2 + 14, py + 172); ctx.stroke();
  ctx.lineWidth = 4; ctx.strokeStyle = '#5a5650';
  ctx.beginPath(); ctx.moveTo(W / 2 - 4, py + 200); ctx.lineTo(W / 2 - 12, py + 236); ctx.lineTo(W / 2 + 6, py + 238); ctx.stroke();
  ctx.beginPath(); ctx.arc(W / 2, py + 252, 34, 0.25, Math.PI - 0.25); ctx.stroke();                                    // a small smile
  ctx.restore();
  ctx.strokeStyle = '#141414'; ctx.lineWidth = 4; ctx.strokeRect(px, py, pw, ph);

  ctx.fillStyle = '#161616'; ctx.textAlign = 'left'; ctx.font = `500 39px ${FONT.serif}`;
  P.lines.forEach((ln, i) => ctx.fillText(ln, 96, 850 + i * 62));
  ctx.font = `900 52px ${FONT.serif}`;
  ctx.fillText(P.phone, 96, 1262);
  ctx.fillText(P.phoneTail, 560, 1262);
  // the middle of the number has run in the rain
  const sm = ctx.createRadialGradient(455, 1262, 4, 455, 1262, 96);
  sm.addColorStop(0, 'rgba(40,40,44,0.78)'); sm.addColorStop(0.5, 'rgba(60,60,66,0.3)'); sm.addColorStop(1, 'rgba(60,60,66,0)');
  ctx.fillStyle = sm; ctx.fillRect(340, 1190, 240, 150);
  ctx.fillStyle = '#333'; ctx.font = `500 32px ${FONT.serif}`; ctx.textAlign = 'left'; ctx.fillText(P.date, 96, 1350);

  // the reply, in red marker, in Shanghainese
  ctx.save(); ctx.translate(130, 440); ctx.rotate(-0.11);
  ctx.textAlign = 'left'; ctx.font = `128px ${FONT.hand}`;
  ctx.shadowColor = 'rgba(160,10,10,0.35)'; ctx.shadowBlur = 5;
  ctx.fillStyle = 'rgba(196,22,22,0.86)';
  P.scrawl.forEach((s, i) => ctx.fillText(s, i * 30, i * 142));
  ctx.restore();

  // ferry token, taped on
  ctx.save(); ctx.translate(850, 1236);
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.arc(5, 7, 92, 0, 7); ctx.fill();
  ctx.fillStyle = '#1d7d84'; ctx.beginPath(); ctx.arc(0, 0, 90, 0, 7); ctx.fill();
  ctx.strokeStyle = '#bfe7e4'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 74, 0, 7); ctx.stroke();
  ctx.fillStyle = '#eafaf8'; ctx.textAlign = 'center'; ctx.font = `700 62px ${FONT.sans}`; ctx.fillText(P.token, 0, -8);
  ctx.font = `700 24px ${FONT.sans}`; ctx.fillText(P.tokenSub, 0, 44);
  ctx.rotate(-0.5); ctx.fillStyle = 'rgba(214,196,130,0.62)'; ctx.fillRect(-130, -26, 260, 52);
  ctx.restore();
  // tape, top and bottom
  ctx.fillStyle = 'rgba(214,196,130,0.6)'; ctx.fillRect(-20, 34, W + 40, 60); ctx.fillRect(-20, H - 96, W + 40, 60);
  grain(ctx, W, H, 14, 99);
  return c;
}

export function createClue() {
  const canvas = drawPoster();
  const map = tex(canvas, { repeat: false, aniso: 16 });
  const R = 0.162, h = 0.56, arc = (h * (1024 / 1448)) / R;
  // face the people coming up from the stair
  const facing = Math.atan2(-0.82, -0.57);                 // angle whose (sin, cos) points -x, a little -z
  const geo = new THREE.CylinderGeometry(R, R, h, 16, 1, true, facing - arc / 2, arc);
  const mat = new THREE.MeshStandardMaterial({ map, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.42, roughness: 0.75, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(DECK_LAMP_X, L.deckY + 1.52, CLUE_LAMP_Z);
  mesh.name = 'clue-poster';
  const focus = new THREE.Vector3(DECK_LAMP_X + Math.sin(facing) * R, L.deckY + 1.52, CLUE_LAMP_Z + Math.cos(facing) * R);
  return { mesh, canvas, focus };
}
