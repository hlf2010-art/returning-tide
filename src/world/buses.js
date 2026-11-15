// The city buses on Zhongshan East 1st Road and their stops (world/trafficMix.js BUS_STOPS).
// A bus coming up to one of its stops indicates, pulls in to the kerb (the same pull-in a DiDi uses,
// engine/traffic.js pickup), opens its doors for a short dwell, lets people off and on (the crowd's
// commuters waiting at the shelter), shuts its doors, waits for a gap in the lane behind and pulls
// out. Cars behind slow for it as it pulls in and pass once it's at the kerb.
// The stops: a steel shelter with a lit advert panel, the stop's name board and a route board.
import * as THREE from 'three';
import { BUS_STOPS, stopS } from './trafficMix.js';
import { makeCanvas, tex, FONT } from './canvas.js';
import { L } from './layout.js';

function boardTexture(st) {
  const [c, x] = makeCanvas(512, 1024);
  x.fillStyle = '#0d3b7a'; x.fillRect(0, 0, 512, 1024);
  x.fillStyle = '#fff'; x.textAlign = 'center';
  x.font = `800 44px ${FONT.sans}`; x.fillText(st.name.replace('(外滩)', ''), 256, 92);
  x.font = `700 40px ${FONT.sans}`; x.fillText('(外滩)', 256, 146);
  x.font = `500 24px ${FONT.sans}`; x.fillText(st.en, 256, 190);
  x.fillStyle = 'rgba(255,255,255,0.25)'; x.fillRect(40, 214, 432, 3);
  let y = 290;
  for (const r of st.routes) {
    x.fillStyle = '#fff'; x.fillRect(48, y - 52, 416, 84);
    x.fillStyle = '#0d3b7a'; x.font = `900 64px ${FONT.sans}`; x.textAlign = 'left'; x.fillText(`${r}`, 70, y + 12);
    x.font = `700 30px ${FONT.sans}`; x.fillText('路', 70 + x.measureText(r).width * 2.1 + 8, y + 8);
    x.textAlign = 'right'; x.font = `500 24px ${FONT.sans}`; x.fillText(st.dir > 0 ? '往南 southbound' : '往北 northbound', 446, y + 6);
    y += 112;
  }
  if (st.night) {
    x.fillStyle = '#ffd34a'; x.textAlign = 'center'; x.font = `700 30px ${FONT.sans}`; x.fillText('夜宵线 Night lines', 256, y + 6);
    x.font = `800 44px ${FONT.sans}`; x.fillText(st.night.join('  '), 256, y + 64);
  }
  x.fillStyle = 'rgba(255,255,255,0.6)'; x.font = `500 22px ${FONT.sans}`; x.textAlign = 'center'; x.fillText('上海公交 Shanghai Bus', 256, 990);
  return tex(c, { repeat: false });
}
function adTexture(k) {
  const [c, x] = makeCanvas(256, 512);
  const g = x.createLinearGradient(0, 0, 0, 512);
  const pal = [['#16213a', '#b8325a'], ['#0d2a2a', '#e0a83a'], ['#1d1238', '#4f8cff']][k % 3];
  g.addColorStop(0, pal[0]); g.addColorStop(1, pal[1]); x.fillStyle = g; x.fillRect(0, 0, 256, 512);
  x.fillStyle = 'rgba(255,255,255,0.92)'; x.textAlign = 'center';
  x.font = `900 46px ${FONT.sans}`; x.fillText(['上海', '外滩', '夜'][k % 3], 128, 200);
  x.font = `600 22px ${FONT.sans}`; x.fillText(['城市因你而美', 'THE BUND · 1843', '浦江游览'][k % 3], 128, 250);
  return tex(c, { repeat: false });
}

export function createBuses({ scene, traffic, vehicles, crowd = null, audio = null, announce = null }) {
  const group = new THREE.Group(); group.name = 'bus-stops'; scene.add(group);
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa1a8, metalness: 0.9, roughness: 0.35 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x2b3036, metalness: 0.6, roughness: 0.4 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fb4c0, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.22 });
  const lights = [];
  BUS_STOPS.forEach((st, k) => {
    // shelter on the pavement behind the kerb, facing the road
    const base = st.dir > 0 ? L.westCurbX - 1.5 : L.eastCurbX + 1.5;
    const g = new THREE.Group(); g.position.set(base, L.curbH, st.z);
    const len = 7.2, back = st.dir > 0 ? -1 : 1;                           // the back wall is away from the road
    for (const dz of [-len / 2, 0, len / 2]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.6, 0.08), steel); p.position.set(back * 0.75, 1.3, dz); g.add(p); }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.1, len + 0.4), roofMat); roof.position.set(0, 2.62, 0); g.add(roof);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.9, len - 1.3), glass); pane.position.set(back * 0.75, 1.15, -0.6); g.add(pane);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 2.6), steel); seat.position.set(back * 0.5, 0.48, -1.2); g.add(seat);
    // the lit advert panel at one end (both faces) and the route board at the other
    const ad = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.85, 1.2), new THREE.MeshBasicMaterial({ map: adTexture(k) }));
    ad.material.color.setScalar(1.5); ad.position.set(back * 0.75, 1.2, len / 2 - 0.6); g.add(ad);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.24), new THREE.MeshBasicMaterial({ map: boardTexture(st) }));
    board.material.color.setScalar(1.25); board.position.set(-back * 0.9, 1.45, -len / 2 - 0.15); board.rotation.y = st.dir > 0 ? Math.PI : 0;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.9, 8), steel); pole.position.set(-back * 0.9, 1.45, -len / 2 - 0.2); g.add(pole, board);
    // the stop's name along the roof edge facing the road
    const [nc, nx] = makeCanvas(1024, 96);
    nx.fillStyle = '#0d3b7a'; nx.fillRect(0, 0, 1024, 96); nx.fillStyle = '#fff'; nx.font = `800 52px ${FONT.sans}`; nx.textAlign = 'center'; nx.fillText(st.name, 512, 66);
    const name = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.42), new THREE.MeshBasicMaterial({ map: tex(nc, { repeat: false }) }));
    name.material.color.setScalar(1.3); name.position.set(-back * 0.96, 2.4, 0); name.rotation.y = -back * Math.PI / 2; g.add(name);
    group.add(g);
    lights.push({ x: base, y: 2.4, z: st.z, color: new THREE.Color(0.85, 0.92, 1.0), intensity: 3, distance: 7, out: true });
    st.door = { x: (st.dir > 0 ? L.westCurbX - 0.6 : L.eastCurbX + 0.6), z: st.z };
  });
  // which bus is doing what
  const state = new Map();                    // vehicle -> { stop, phase, t }
  const busIdx = traffic.vehicles.map((v, i) => (v.bus ? i : -1)).filter((i) => i >= 0);
  const S = { served: 0, boarded: 0, alighted: 0, log: [] };
  function laneClearBehind(v) {
    for (const o of v.lane.vehicles) {
      if (o === v || !o.active) continue;
      const gap = v.s - v.len - o.s;                                         // o behind v
      if (gap > -2 && gap < 14 + o.v * 2.2) return false;
    }
    return true;
  }
  return {
    group, lights, stats: S,
    update(dt) {
      if (dt <= 0) return;
      for (const i of busIdx) {
        const v = traffic.vehicles[i], vis = vehicles.list[i];
        let b = state.get(v);
        if (!v.active) { if (b) state.delete(v); vis.setDoors && vis.setDoors(0); continue; }
        if (!b) {
          // the next stop ahead on this side, far enough to pull in for it
          const st = BUS_STOPS.find((q) => q.dir === v.lane.dir && stopS(q) - v.s > 45 && stopS(q) - v.s < 140);
          if (!st || v.pickup) continue;
          b = { stop: st, phase: 'in', t: 0 }; state.set(v, b);
          v.pickup = { stopS: stopS(st), dx: st.kerbX - v.lane.x, state: 'approach', bus: true };
          v.v0Was = v.v0;
        }
        b.t += dt;
        const pk = v.pickup;
        vis.setBlink && vis.setBlink((b.phase === 'in' || b.phase === 'out' || b.phase === 'wait') && Math.floor(b.t * 2.6) % 2 === 0);
        if (b.phase === 'in' && pk && pk.state === 'parked') { b.phase = 'doors'; b.t = 0; S.log.push(`${v.id}@${b.stop.id}`); announce && announce(v, 'arrive'); }
        if (b.phase === 'doors') {
          vis.setDoors && vis.setDoors(Math.min(1, b.t / 1.2));
          if (b.t > 1.2 && !b.exchanged) {
            b.exchanged = true;
            if (crowd) { S.alighted += crowd.alight(b.stop.id, b.stop.door, 1 + Math.floor(Math.random() * 3)); S.boarded += crowd.board(b.stop.id, b.stop.door); }
            if (audio && audio.cue) audio.cue('chime', 0, 0.25);
          }
          if (b.t > 9 + (b.stop.night ? 2 : 0)) { b.phase = 'close'; b.t = 0; }
        }
        if (b.phase === 'close') { vis.setDoors && vis.setDoors(Math.max(0, 1 - b.t / 1.2)); if (b.t > 1.4) { b.phase = 'wait'; b.t = 0; } }
        if (b.phase === 'wait' && (laneClearBehind(v) || b.t > 12)) { if (pk) pk.state = 'go'; v.v0 = v.v0Was || 9.5; b.phase = 'out'; b.t = 0; S.served++; announce && announce(v, 'leave'); }
        if (b.phase === 'out' && (!pk || v.s > pk.stopS + 30)) { v.pickup = null; state.delete(v); }
      }
    },
  };
}
