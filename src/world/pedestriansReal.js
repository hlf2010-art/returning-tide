// The four background pedestrians as real people (Rocketbox avatars, see people.js). Same
// contract as pedestrians.js: behaviour comes from engine/traffic.js, this only draws and animates.
import * as THREE from 'three';
import { groundHeight } from './layout.js';
import { createPerson } from './people.js';
import { addGlasses } from './glasses.js';
import { createFace } from './face.js';
const cupGeo = new THREE.CylinderGeometry(0.042, 0.033, 0.13, 12), lidGeo = new THREE.CylinderGeometry(0.044, 0.044, 0.012, 12);
const cupMat = new THREE.MeshStandardMaterial({ color: 0xf1efe9, roughness: 0.6 }), lidMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 });

// glasses: plenty of people here wear them (p5's come with her avatar)
const GLASSES = { p1: 'acetate', p2: 'rimless', p3: 'metal' };

// What's on a phone screen while someone walks: a vertical short video or drama episode (shifting
// colour, a figure, burnt-in subtitles, a progress bar) or a chat (bubbles scrolling). Generic: no
// app, no logo. Redrawn a few times a second, and only for screens near the camera.
function phoneScreen() {
  const c = document.createElement('canvas'); c.width = 72; c.height = 144;
  const ctx = c.getContext('2d'), tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.1, 1.1, 1.1) });
  let t = Math.random() * 100, hue = Math.random() * 360, last = -1;
  return {
    mat,
    draw(kind, dt) {
      t += dt; if (t - last < 0.2) return; last = t;
      if (kind === 'video') {
        const cut = Math.floor(t / 2.6);                                    // a cut every couple of seconds
        const h = (hue + cut * 47) % 360, g = ctx.createLinearGradient(0, 0, 0, 144);
        g.addColorStop(0, `hsl(${h},45%,${30 + 10 * Math.sin(t)}%)`); g.addColorStop(1, `hsl(${(h + 40) % 360},35%,14%)`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, 72, 144);
        ctx.fillStyle = `hsl(${(h + 180) % 360},25%,${55 + 8 * Math.sin(t * 2)}%)`;           // someone on screen
        const x = 36 + Math.sin(t * 0.8 + cut) * 10;
        ctx.beginPath(); ctx.arc(x, 58, 11, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x - 16, 70, 32, 40);
        ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(10, 116, 52 - (cut % 3) * 8, 4); ctx.fillRect(14, 123, 44, 4);   // subtitles
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(0, 140, 72, 2); ctx.fillStyle = '#fff'; ctx.fillRect(0, 140, ((t % 30) / 30) * 72, 2);
      } else {
        ctx.fillStyle = '#b9bcc0'; ctx.fillRect(0, 0, 72, 144);
        ctx.fillStyle = '#d4d6d9'; ctx.fillRect(0, 0, 72, 14);
        const off = (t * 6) % 22;
        for (let i = -1; i < 8; i++) {
          const y = 18 + i * 22 - off + 22, mine = (i + Math.floor(t * 6 / 22)) % 3 === 0, w = 26 + ((i * 37) % 20);
          ctx.fillStyle = mine ? '#7cc95a' : '#e4e6e8';
          ctx.fillRect(mine ? 66 - w : 6, y, w, 12);
        }
      }
      tex.needsUpdate = true;
    },
  };
}

const std = (o) => new THREE.MeshStandardMaterial(o);
const UMB_COLORS = { p1: 0x1d2a44, p2: 0x3a1420, p3: 0x202024, p4: 0x141416, p5: 0x4a3a6a };
// a bump reaction's gesture (engine/social.js kinds -> clips)
const GESTURE = { sorry: 'wave', fine: 'shrug', scold: 'angry', tut: 'look', look: 'look' };
const canopyGeo = new THREE.ConeGeometry(0.55, 0.3, 14, 1, true), shaftGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.72, 6);
const phoneGeo = new THREE.BoxGeometry(0.07, 0.145, 0.009), screenGeo = new THREE.PlaneGeometry(0.062, 0.128);
const phoneMat = std({ color: 0x101012, roughness: 0.3, metalness: 0.4 });
const screenMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.5, 1.8) });

// The Customs House portico stands on a plinth (0.40 m, then 0.75 m): the sheltering walker steps up onto it.
export function pedGround(x, z) {
  if (x > -34 && x < -31.0 && z > 18 && z < 36) return x < -31.2 && z > 18.4 && z < 35.6 ? 0.75 : 0.4;
  return groundHeight(x, z);
}

export function createRealPedestrians(simPeds, people) {
  const group = new THREE.Group(); group.name = 'crossing-pedestrians';
  const _e = new THREE.Euler(), _q = new THREE.Quaternion();
  const list = simPeds.map((p) => {
    const person = createPerson(people, p.id);
    person.root.name = `person-${p.id}`;
    const umb = new THREE.Group(); umb.name = `umbrella-${p.id}`; umb.visible = false;
    const shaft = new THREE.Mesh(shaftGeo, std({ color: 0x1a1a1a, roughness: 0.5 })); shaft.position.y = 0.36;
    const canopy = new THREE.Mesh(canopyGeo, std({ color: UMB_COLORS[p.id] || 0x202024, roughness: 0.45, side: THREE.DoubleSide })); canopy.position.y = 0.7;
    umb.add(shaft, canopy);
    const phone = new THREE.Group(); phone.name = `phone-${p.id}`; phone.visible = false;
    const scr = phoneScreen();
    const screen = new THREE.Mesh(screenGeo, scr.mat); screen.position.z = 0.0052;
    phone.add(new THREE.Mesh(phoneGeo, phoneMat), screen);
    group.add(person.root, umb, phone);
    if (GLASSES[p.id]) addGlasses(person, GLASSES[p.id]);
    const cup = new THREE.Group(); cup.add(new THREE.Mesh(cupGeo, cupMat)); const lid = new THREE.Mesh(lidGeo, lidMat); lid.position.y = 0.07; cup.add(lid); cup.visible = false;
    group.add(cup);
    return { person, umb, canopy, phone, scr, cup, face: createFace(person), look: new THREE.Vector3() };
  });
  return {
    group,
    people: list.map((l) => l.person),
    update(sim, dt, camPos = null) {
      for (let i = 0; i < list.length; i++) {
        const { person, umb, canopy, phone, scr, cup, face, look } = list[i], p = sim[i], r = person.root;
        r.position.set(p.x, pedGround(p.x, p.z), p.z);
        let d = p.heading - r.rotation.y;                                          // turn smoothly, never snap
        while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
        r.rotation.y += d * Math.min(1, dt * 6);
        const speed = Math.hypot(p.vx, p.vz);
        let state;
        if (speed > 1.6) state = 'jog';
        else if (speed > 0.15) state = 'walk';
        else if (p.react === 'phoning') state = 'phone';
        else if (p.umbrella > 0.5) state = 'umbrella';
        else state = p.react === 'sheltered' || p.state === 'waiting' ? 'look' : 'idle';
        if (p.gesture && speed < 0.15 && p.pause > 0) state = GESTURE[p.gesture] || state;
        // a coffee run: phone out to scan and pay at the hatch, a word with the barista, then waiting on the phone
        if (p.errand && speed < 0.15) {
          const ph = p.errand.phase, et = p.errand.t;
          state = ph === 'order' ? (et < 3.5 ? 'phone' : 'talk1') : ph === 'collect' ? 'wave' : ph === 'queue' || ph === 'wait' ? 'phone' : state;
        }
        person.play(state, 0.4);
        person.setGait(speed);
        person.setUmbrella(state === 'phone' ? 0 : p.umbrella);
        person.setPhoneHold(state === 'walk' || state === 'look' || state === 'idle' ? p.phoneW : 0);
        person.update(dt, p.faceTo);
        if (camPos && r.position.distanceToSquared(camPos) < 400) {           // faces only matter up close
          if (p.faceTo) look.set(p.faceTo[0], r.position.y + 1.55, p.faceTo[1]);
          face.update(dt, { lookAt: p.faceTo ? look : null, speaking: p.errand && p.errand.phase === 'order' && p.errand.t > 3.5, annoyed: p.gesture === 'scold' && p.pause > 0 });
        }
        cup.visible = p.cup > 0 || (p.errand && p.errand.phase === 'collect' && p.errand.t > 0.8);
        if (cup.visible) { person.bones.L.getWorldPosition(cup.position); cup.position.y += 0.02; cup.rotation.set(0, r.rotation.y, 0); }
        // umbrella: in the raised hand, kept upright, opening with the simulation's amount
        const u = p.umbrella;
        umb.visible = u > 0.02;
        if (umb.visible) {
          umb.position.copy(person.anchors.umbrella.position);
          umb.quaternion.copy(_q.setFromEuler(_e.set(0.06, r.rotation.y, 0, 'YXZ')));
          canopy.scale.set(0.15 + 0.85 * u, 0.5 + 0.5 * u, 0.15 + 0.85 * u);
        }
        // phone: in the right palm, following the hand
        phone.visible = p.phone > 0.02 || p.phoneW > 0.3;
        if (phone.visible && camPos && r.position.distanceToSquared(camPos) < 100) scr.draw(p.phoneW > 0.3 ? p.phoneKind : 'chat', dt);
        if (phone.visible) {
          phone.position.copy(person.anchors.phone.position);
          phone.quaternion.copy(person.anchors.phone.quaternion);
          phone.translateY(-0.02); phone.translateZ(0.05);
        }
      }
    },
  };
}
