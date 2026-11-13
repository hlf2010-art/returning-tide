// Old Lin and Ms. Su as real people (Rocketbox avatars, see people.js), with the same interface as
// npcs.js: { group, chars, byId, getSpeakerPosition, update }. byId.lin.torso is a chest-mounted
// holder (metres, facing his front) so Mission One's pouch attaches exactly as before.
import * as THREE from 'three';
import { L, npcs as npcLayout } from './layout.js';
import { createPerson } from './people.js';

const std = (o) => new THREE.MeshStandardMaterial(o);
function wrapAngle(a) { let r = a; while (r > Math.PI) r -= Math.PI * 2; while (r < -Math.PI) r += Math.PI * 2; return r; }

export function createRealNpcs(people) {
  const group = new THREE.Group(); group.name = 'npcs';
  const chars = npcLayout.list.map((spec) => {
    const person = createPerson(people, spec.id);
    const root = person.root; root.name = `npc-${spec.id}`;
    root.position.set(spec.x, L.deckY, spec.z); root.rotation.y = spec.yaw;
    group.add(root);
    // the pouch's holder: follows the chest, oriented with the body (old torso frame: origin ~0.27 m below the chest bone)
    const torso = new THREE.Group(); torso.position.set(0, -0.27, 0);
    person.anchors.chest.add(torso); group.add(person.anchors.chest);
    const c = { id: spec.id, spec, root, person, torso, talkPick: 0, wasSpeaking: false, headOffset: new THREE.Vector3(spec.x, L.deckY + spec.height * 0.91, spec.z) };
    if (spec.id === 'su') {                                                   // her folding umbrella
      const umb = new THREE.Group(); umb.visible = false;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.72, 6), std({ color: 0x1a1a1a, roughness: 0.5 })); shaft.position.y = 0.36;
      const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.58, 0.3, 14, 1, true), std({ color: 0x6b2a36, roughness: 0.45, side: THREE.DoubleSide })); canopy.position.y = 0.7;
      umb.add(shaft, canopy); group.add(umb);
      c.umbrella = { holder: umb, canopy };
    }
    return c;
  });
  const byId = Object.fromEntries(chars.map((c) => [c.id, c]));
  const _e = new THREE.Euler(), _q = new THREE.Quaternion();

  function getSpeakerPosition(id) { const c = byId[id]; return c ? c.headOffset : npcLayout.pairFocus; }

  function update(t, dt, { activeSpeaker = null, interacting = false, playerPos = null, umbrella = 0 } = {}) {
    const k = Math.min(1, dt * 5.5);
    for (const c of chars) {
      const speaking = activeSpeaker === c.id;
      if (speaking && !c.wasSpeaking) c.talkPick = 1 - c.talkPick;            // a different gesture set each line
      c.wasSpeaking = speaking;
      let targetYaw = c.spec.yaw;
      if (interacting && playerPos) targetYaw = Math.atan2(playerPos.x - c.spec.x, playerPos.z - c.spec.z);
      c.root.rotation.y += wrapAngle(targetYaw - c.root.rotation.y) * k;
      const rain = c.umbrella && umbrella > 0.5;
      const state = rain ? (speaking ? 'umbrellaTalk' : 'umbrellaListen') : speaking ? (c.talkPick ? 'talk2' : 'talk1') : 'idle';
      c.person.play(state, 0.5);
      c.person.setUmbrella(c.umbrella ? umbrella : 0);
      c.person.update(dt);
      // live head position for voices / targeting
      c.person.bones.head.getWorldPosition(c.headOffset); c.headOffset.y += 0.08;
      if (c.umbrella) {
        const h = c.umbrella.holder;
        h.visible = umbrella > 0.02;
        if (h.visible) {
          h.position.copy(c.person.anchors.umbrella.position);
          h.quaternion.copy(_q.setFromEuler(_e.set(0.05, c.root.rotation.y, -0.12, 'YXZ')));   // leaning a little toward Old Lin
          const u = umbrella; c.umbrella.canopy.scale.set(0.15 + 0.85 * u, 0.5 + 0.5 * u, 0.15 + 0.85 * u);
        }
      }
    }
  }
  return { group, chars, byId, getSpeakerPosition, update };
}
