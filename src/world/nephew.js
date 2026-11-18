// Mission One's courier ("the nephew"): the man who left the pouch on Zhou's counter, there to be seen or not.
// Zhou's nephew (his daughter's cousin, a Zhou too, which is why "from the family" was not quite a
// lie to Old Lin), who works opening shops for the souvenir chain 申礼 and forged the transfer for
// it (world/career.js tells how that comes out). He waits at the counter until you are coming, then
// leaves the way engine/witness.js lays out. A red paper carrier from the chain, its name in
// white: the one red thing on the street apart from the pouch's label, so the eye that turns finds
// it. He is never named in play; Ji Bai can only say what he saw.
import * as THREE from 'three';
import { createPerson } from './people.js';
import { makeCanvas, tex, FONT } from './canvas.js';
import { L, stall } from './layout.js';
import { courierRoute, courierAt, WITNESS } from '../engine/witness.js';

export const CHAIN = { zh: '申礼', en: 'Shenli', full: { zh: '申礼 · 上海礼物', en: 'Shenli Gifts' } };

function carrier() {
  const [c, ctx] = makeCanvas(256, 288);
  ctx.fillStyle = '#b3202a'; ctx.fillRect(0, 0, 256, 288);
  ctx.fillStyle = '#f4ede0'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 92px ${FONT.serif}`; ctx.fillText(CHAIN.zh, 128, 120);
  ctx.font = `600 22px ${FONT.serif}`; ctx.fillText('SHENLI · GIFTS OF SHANGHAI', 128, 196);
  ctx.fillRect(40, 226, 176, 3);
  const face = new THREE.MeshStandardMaterial({ map: tex(c, { repeat: false }), roughness: 0.75 });
  const side = new THREE.MeshStandardMaterial({ color: 0x9e1c25, roughness: 0.8 });
  const g = new THREE.Group();
  const bag = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.38, 0.12), [side, side, side, side, face, face]);
  bag.position.y = -0.25; g.add(bag);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.007, 4, 12, Math.PI), new THREE.MeshStandardMaterial({ color: 0x6d1218, roughness: 0.7 }));
  handle.position.y = -0.06; g.add(handle);
  return g;
}

export function createNephew({ scene, people }) {
  if (!people) return { update() {}, reset() {}, seenFrom: () => null, get state() { return 'none'; } };
  const route = courierRoute(stall), Y = L.curbH;
  const group = new THREE.Group(); group.name = "m1-nephew"; scene.add(group);
  const person = createPerson(people, 'p3');
  person.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  group.add(person.root);
  const bag = carrier(); group.add(bag);
  const _h = new THREE.Vector3(), chest = new THREE.Vector3();

  // 'waiting' (at the counter) -> 'leaving' (walking off) -> 'gone' (round the corner); 'none' outside the mission
  let state = 'none', t = 0, x = route.wait[0], z = route.wait[1], heading = Math.PI;
  const hide = () => { person.root.visible = false; bag.visible = false; };
  hide();

  return {
    get state() { return state; },
    reset() { state = 'none'; t = 0; [x, z] = route.wait; heading = Math.PI; hide(); },
    // active: Mission One is at its pickup step; pp: the player's feet {x, z}
    update(dt, pp, active) {
      if (!active) { if (state !== 'none' && state !== 'gone') { state = 'gone'; hide(); } if (state === 'none') return; return; }
      if (state === 'none') state = 'waiting';
      if (state === 'gone') return;
      if (state === 'waiting' && Math.hypot(pp.x - stall.x, pp.z - stall.z) < WITNESS.trigger) { state = 'leaving'; t = 0; }
      let moving = false;
      if (state === 'leaving') {
        t += dt; const c = courierAt(route, t);
        moving = !c.done; x = c.x; z = c.z; heading = c.heading;
        if (c.done) { state = 'gone'; hide(); return; }
      } else heading = Math.PI;                                   // facing the counter (north, -z)
      const far = Math.hypot(pp.x - x, pp.z - z) > 90;
      person.root.visible = !far; bag.visible = !far;
      if (far) return;
      const root = person.root;
      root.position.set(x, Y, z);
      let a = heading - root.rotation.y; while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2;
      root.rotation.y += a * Math.min(1, dt * 6);
      person.play(moving ? 'walk' : 'idle', 0.3);
      person.setGait(moving ? route.speed : 0);
      person.update(dt, null);                                    // he does not look at you
      person.bones.R.getWorldPosition(_h); bag.position.copy(_h); bag.rotation.y = root.rotation.y;
    },
    // what engine/targeting.js aims at when asking "is he seen": chest height, or null when not there
    seenFrom() {
      if (state !== 'waiting' && state !== 'leaving') return null;
      chest.set(x, Y + 1.3, z); return chest;
    },
  };
}
