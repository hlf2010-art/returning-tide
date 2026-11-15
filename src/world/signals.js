// Signal hardware for the Hankou Road crossing, in the Chinese style: horizontal three-lens
// vehicle heads (red-yellow-green, left to right as seen by the driver) on mast arms with a
// countdown display, and two-lens pedestrian heads (red standing figure over green walking
// figure) with their own countdown. All of it is driven by the one signal controller.
import * as THREE from 'three';
import { L, crossing } from './layout.js';
import { makeCanvas, tex } from './canvas.js';
import { mergeStatic } from './instancer.js';

const std = (o) => new THREE.MeshStandardMaterial(o);
const housingMat = std({ color: 0x15171a, roughness: 0.6, metalness: 0.4 });
const poleMat = std({ color: 0x8e959c, roughness: 0.45, metalness: 0.7 });
const LIT = { red: new THREE.Color(5, 0.18, 0.1), yellow: new THREE.Color(5, 2.6, 0.12), green: new THREE.Color(0.25, 4.2, 2.0) };
const DIM = { red: new THREE.Color(0.07, 0.012, 0.01), yellow: new THREE.Color(0.07, 0.045, 0.01), green: new THREE.Color(0.01, 0.06, 0.035) };

function figure(walking, color) {
  const [c, ctx] = makeCanvas(128, 128);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(64, 26, 11, 0, 7); ctx.fill();
  ctx.lineWidth = 16;
  const line = (a, b, cc, d) => { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(cc, d); ctx.stroke(); };
  if (walking) {
    line(62, 44, 58, 76); line(58, 76, 40, 108); line(58, 76, 80, 106);        // stride
    ctx.lineWidth = 11; line(62, 48, 44, 70); line(62, 48, 82, 66);
  } else {
    line(64, 44, 64, 78); line(64, 78, 54, 112); line(64, 78, 74, 112);        // standing
    ctx.lineWidth = 11; line(64, 48, 50, 80); line(64, 48, 78, 80);
  }
  return tex(c, { repeat: false });
}

// Two-digit countdown, LED-ish. Redrawn only when the value or colour changes.
function countdown(w, h) {
  const [c, ctx] = makeCanvas(128, Math.round(128 * (h / w)));
  const map = tex(c, { repeat: false });
  const mat = new THREE.MeshBasicMaterial({ map, color: 0xffffff });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  let key = '';
  mesh.set = (value, color) => {
    const k = `${value}|${color}`;
    if (k === key) return;
    key = k;
    ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, c.width, c.height);
    if (value != null) {
      ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `700 ${c.height * 0.86}px "DejaVu Sans Mono", Menlo, Consolas, monospace`;
      ctx.fillText(String(Math.min(99, value)).padStart(2, '0'), c.width / 2, c.height * 0.54);
    }
    map.needsUpdate = true;
    mat.color.setScalar(value == null ? 1 : 2.4);
  };
  mesh.set(null, '#000');
  return mesh;
}

export function createSignals(geom = crossing) {
  const group = new THREE.Group(); group.name = 'crossing-signals';
  const vehHeads = [], pedHeads = [];
  const poles = [], housings = [];                                              // static: merged into two meshes below

  for (const p of geom.vehPoles) {
    const H = 6.0, armY = 5.7, dir = Math.sign(p.armTo - p.x);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, H, 12), poleMat);
    pole.position.set(p.x, L.curbH + H / 2, p.z); poles.push(pole);
    const armLen = Math.abs(p.armTo - p.x) + 0.6;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, armLen, 10), poleMat);
    arm.rotation.z = Math.PI / 2; arm.position.set(p.x + dir * armLen / 2, armY, p.z); poles.push(arm);
    // the head hangs over the two through lanes, a countdown beside it
    const hx = p.armTo, hy = armY - 0.4;
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.44, 0.3), housingMat);
    head.position.set(hx, hy, p.z); housings.push(head);
    const lenses = {};
    // as seen by a driver facing the head: red on the left. Driver faces -p.faces (along z),
    // so the driver's left is +x when they face +z and -x when they face -z.
    const leftX = p.faces < 0 ? 1 : -1;
    ['red', 'yellow', 'green'].forEach((col, i) => {
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.15, 20), new THREE.MeshBasicMaterial({ color: DIM[col].clone() }));
      m.position.set(hx + leftX * (0.4 - i * 0.4), hy, p.z + p.faces * 0.16);
      m.rotation.y = p.faces > 0 ? 0 : Math.PI;
      const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.16, 14, 1, true, -Math.PI / 2, Math.PI), housingMat);
      visor.rotation.x = Math.PI / 2; visor.position.set(m.position.x, hy + 0.01, p.z + p.faces * 0.24);
      group.add(m); housings.push(visor); lenses[col] = m;
    });
    const cd = countdown(0.5, 0.36);
    cd.position.set(hx - leftX * 0.95, hy, p.z + p.faces * 0.16); cd.rotation.y = p.faces > 0 ? 0 : Math.PI;
    const cdBox = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.44, 0.28), housingMat);
    cdBox.position.set(cd.position.x, hy, p.z); housings.push(cdBox); group.add(cd);
    vehHeads.push({ lenses, cd });
  }

  const redFig = figure(false, '#ff2a1c'), greenFig = figure(true, '#22ff8a');
  for (const p of geom.pedPoles) {
    const H = 3.2;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, H, 10), poleMat);
    pole.position.set(p.x, L.curbH + H / 2, p.z); poles.push(pole);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.02, 0.36), housingMat);
    const y = L.curbH + 2.55;
    box.position.set(p.x + p.faces * 0.14, y, p.z); housings.push(box);
    const lens = (map, dy) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.28), new THREE.MeshBasicMaterial({ map, color: 0x111111 }));
      m.position.set(p.x + p.faces * 0.26, y + dy, p.z); m.rotation.y = p.faces * Math.PI / 2; group.add(m);
      return m;
    };
    const red = lens(redFig, 0.3), green = lens(greenFig, -0.02);
    const cd = countdown(0.28, 0.2);
    cd.position.set(p.x + p.faces * 0.26, y - 0.34, p.z); cd.rotation.y = p.faces * Math.PI / 2; group.add(cd);
    pedHeads.push({ red, green, cd });
  }

  group.add(new THREE.Mesh(mergeStatic(poles), poleMat), new THREE.Mesh(mergeStatic(housings), housingMat));
  let lastKey = '';
  return {
    group,
    update(ctl) {
      const blink = (ctl.time % 1) < 0.5;                                     // 1 Hz flashing
      const va = ctl.vehAspect, pa = ctl.pedAspect;
      const on = { red: va === 'red', yellow: va === 'yellow', green: va === 'green' || (va === 'green-flash' && blink) };
      const walk = pa === 'walk' || (pa === 'walk-flash' && blink);
      const vc = ctl.vehCountdown, pc = ctl.pedCountdown;
      const key = `${on.red}${on.yellow}${on.green}${walk}${pa}|${vc}|${pc}`;
      if (key === lastKey) return;
      lastKey = key;
      for (const h of vehHeads) {
        for (const col of ['red', 'yellow', 'green']) h.lenses[col].material.color.copy(on[col] ? LIT[col] : DIM[col]);
        h.cd.set(vc, on.red ? '#ff3020' : va === 'yellow' ? '#ffb000' : '#20ff80');
      }
      for (const h of pedHeads) {
        h.red.material.color.setScalar(pa === 'dont-walk' ? 3.2 : 0.08);
        h.green.material.color.setScalar(walk ? 3.2 : 0.08);
        h.cd.set(pc, '#20ff80');
      }
    },
  };
}
