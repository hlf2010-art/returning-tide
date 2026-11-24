// Realistic people: Microsoft Rocketbox avatars and motion-captured animation (MIT licence,
// https://github.com/microsoft/Microsoft-Rocketbox), converted by tools/rocketbox/convert.mjs into
// public/people/*.glb. This module loads them and gives each person an animation rig:
//   - one base action at a time (idle, look, walk, jog, phone, talk..., umbrella...), crossfaded;
//   - walk / jog playback rate follows the simulated speed, so feet don't slide;
//   - an arm layer: while an umbrella is up, the umbrella clip drives that arm and the rest of the
//     body keeps walking (or standing);
//   - world-space anchors at the chest and both hands for props (pouch, umbrella, phone).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { createSprings } from './springs.js';

const ARM = (side) => new RegExp(`^Bip01_${side}_(Clavicle|UpperArm|Forearm|Hand|Finger)`);
const boneOf = (track) => track.name.slice(0, track.name.lastIndexOf('.'));

// The converter kept every material group of an avatar as its own glTF primitive, and the loader
// makes each one a separate SkinnedMesh with its own copy of the skeleton: 7-20 draw calls a person
// where 2-4 would do. Merge the pieces that share a material (and a parent and bones) into one mesh;
// the picture is the same (docs/living-city-architecture.md §6.1, item 0.1). Returns how many went.
export function mergeByMaterial(root) {
  const groups = new Map();
  root.traverse((o) => {
    if (!o.isSkinnedMesh || !o.geometry.index || o.geometry.morphAttributes.position) return;
    const key = `${o.parent.uuid}|${o.material.uuid}|${o.skeleton.bones.map((b) => b.uuid).join(',')}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(o);
  });
  let removed = 0;
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const first = list[0], names = Object.keys(first.geometry.attributes);
    const sameAttrs = list.every((m) => names.every((n) => m.geometry.attributes[n] === first.geometry.attributes[n]) && Object.keys(m.geometry.attributes).length === names.length);
    const sameBind = list.every((m) => m.bindMatrix.equals(first.bindMatrix) && m.matrix.equals(first.matrix));
    if (!sameAttrs || !sameBind) continue;                   // (pieces with their own vertices stay as they are)
    const idx = [];
    for (const m of list) { const ix = m.geometry.index.array, { start, count } = m.geometry.drawRange, end = Math.min(ix.length, start + (Number.isFinite(count) ? count : ix.length)); for (let i = start; i < end; i++) idx.push(ix[i]); }
    const g = new THREE.BufferGeometry();
    for (const n of names) g.setAttribute(n, first.geometry.attributes[n]);
    g.setIndex(idx);
    g.computeBoundingBox(); g.computeBoundingSphere();
    first.geometry = g; first.name = first.material.name || first.name;
    for (const m of list.slice(1)) { m.parent.remove(m); removed++; }
  }
  return removed;
}

export async function loadPeople(base = './people/') {
  const res = await fetch(`${base}people.json`);
  if (!res.ok) throw new Error(`people manifest: ${res.status}`);
  const manifest = await res.json();
  const loader = new GLTFLoader();
  const avatars = {}, clips = {};
  await Promise.all([
    ...Object.entries(manifest.cast).map(async ([role, c]) => {
      avatars[role] = (await loader.loadAsync(base + c.file)).scene;
      mergeByMaterial(avatars[role]);
      // the children's rig is the same Biped, named Bip02: rename it so the shared clips bind to it
      if (c.child) avatars[role].traverse((o) => { if (o.name.startsWith('Bip02')) o.name = o.name.replace('Bip02', 'Bip01'); });
    }),
    ...Object.entries(manifest.clips).map(async ([sex, c]) => { clips[sex] = (await loader.loadAsync(base + c.file)).animations; }),
  ]);
  // which hand each skeleton's umbrella clip raises (measured, not assumed)
  const umbrellaHand = {};
  for (const sex of Object.keys(clips)) {
    if (!clips[sex].some((c) => c.name === 'umbrella')) continue;       // the player's own set has none
    const role = Object.keys(manifest.cast).find((r) => manifest.cast[r].sex === sex);
    const probe = SkeletonUtils.clone(avatars[role]), mixer = new THREE.AnimationMixer(probe);
    const clip = clips[sex].find((c) => c.name === 'umbrella');
    mixer.clipAction(clip).play(); mixer.setTime(Math.min(1, clip.duration / 2)); probe.updateMatrixWorld(true);
    const y = (s) => probe.getObjectByName(`Bip01_${s}_Hand`).getWorldPosition(new THREE.Vector3()).y;
    umbrellaHand[sex] = y('L') > y('R') ? 'L' : 'R';
  }
  return { manifest, avatars, clips, umbrellaHand };
}
// walking with a phone: the texting clip's right arm, neck and head, layered over the walk
const PHONE_LAYER = /^Bip01_(R_(Clavicle|UpperArm|Forearm|Hand|Finger)|Neck|Head)/;

// A child plays the adults' clips: rotations carry over by bone name; the root's own movement (sway,
// bob, hip height) is scaled to the child's size, and strides are shorter, so steps come quicker.
function childClips(people, role) {
  const cache = people._kids || (people._kids = {});
  if (cache[role]) return cache[role];
  const sex = people.manifest.cast[role].sex;
  const adult = Object.keys(people.manifest.cast).find((r) => people.manifest.cast[r].sex === sex && !people.manifest.cast[r].child);
  const hip = (r) => { const b = people.avatars[r].getObjectByName('Bip01'); return b ? Math.abs(b.position.y) || 1 : 1; };
  const k = Math.max(0.4, Math.min(1, hip(role) / hip(adult)));
  const clips = people.clips[sex].map((c) => new THREE.AnimationClip(c.name, c.duration, c.tracks.map((t) => {
    if (t.name !== 'Bip01.position') return t;
    const v = Float32Array.from(t.values, (x) => x * k);
    return new t.constructor(t.name, t.times, v);
  })));
  const base = people.manifest.clips[sex].speeds, speeds = Object.fromEntries(Object.entries(base).map(([n, v]) => [n, v * k]));
  return (cache[role] = { clips, speeds, k });
}

// Every person made by createPerson, for cullPeople(): beyond PERSON_FAR they aren't drawn at all,
// and only those within PERSON_SHADOW cast a shadow (docs/living-city-architecture.md §6.1, 0.3-0.4).
export const PERSON_FAR = 120, PERSON_SHADOW = 30;   // (the spec says 18 m; 30 keeps daytime shadows on people across a street)
const LIVE = new Set(), _pp = new THREE.Vector3();
export function cullPeople(eye) {
  for (const P of LIVE) {
    if (!P.root.parent) { if ((P.gone = (P.gone || 0) + 1) > 1800) LIVE.delete(P); continue; }   // (a minute detached: let it go)
    P.gone = 0;
    P.root.getWorldPosition(_pp);
    const d = _pp.distanceTo(eye), near = d < PERSON_FAR, shade = d < PERSON_SHADOW;
    for (const m of P.meshes) {
      if (m.userData.cs === undefined) { m.userData.cs = m.castShadow; m.userData.v0 = m.visible; }   // what its owner asked for
      m.visible = m.userData.v0 && near;
      m.castShadow = m.userData.cs && shade;
    }
  }
}
export const livePeople = () => LIVE.size;

export function createPerson(people, role) {
  const cast = people.manifest.cast[role], sex = cast.sex, kid = cast.child ? childClips(people, role) : null;
  const speeds = kid ? kid.speeds : people.manifest.clips[sex].speeds, CLIPS = kid ? kid.clips : people.clips[sex];
  const root = SkeletonUtils.clone(people.avatars[role]);
  root.scale.setScalar(0.01);                                         // centimetres -> metres
  // Skinned bounds don't follow the pose, so each body gets a fixed sphere round its bind pose, half
  // as big again (raised arms, a seat, a stride): off-screen people are skipped like anything else,
  // in the shadow pass too. Distance and shadows are decided once a frame in cullPeople().
  const meshes = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.isSkinnedMesh) {
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      o.boundingSphere = o.geometry.boundingSphere.clone(); o.boundingSphere.radius *= 1.5;
      o.frustumCulled = true;
    } else o.frustumCulled = false;
    meshes.push(o);
  });
  const mixer = new THREE.AnimationMixer(root);
  const springs = createSprings(root);                                   // skirts, hair, hems that swing (tools/cloth/)
  const hand = people.umbrellaHand[sex], armRe = ARM(hand);
  const base = {}, arm = {};
  for (const clip of CLIPS) {
    // every clip split in two: the body without the umbrella arm, and that arm alone
    const body = new THREE.AnimationClip(`${clip.name}`, clip.duration, clip.tracks.filter((t) => !armRe.test(boneOf(t))));
    const armOnly = new THREE.AnimationClip(`${clip.name}:arm`, clip.duration, clip.tracks.filter((t) => armRe.test(boneOf(t))));
    base[clip.name] = mixer.clipAction(body); arm[clip.name] = mixer.clipAction(armOnly);
  }
  const umbArm = arm.umbrella;
  let current = null, umbrellaW = 0;
  function play(name, fade = 0.35) {
    if (!base[name]) name = 'idle';
    if (current === name) return;
    const next = base[name], nextArm = arm[name];
    // (an instant switch is a plain swap: a zero-length fade evaluated at a zero time step weighs every
    // action at nothing, and the skeleton drops to its bind pose: arms out, legs straight)
    if (fade > 0) {
      next.reset().setEffectiveWeight(1).fadeIn(fade).play();
      if (current) { base[current].fadeOut(fade); if (arm[current] !== umbArm) arm[current].fadeOut(fade); }
    } else {
      next.reset().setEffectiveWeight(1).play();
      if (current) { base[current].stop(); if (arm[current] !== umbArm) arm[current].stop(); }
    }
    nextArm.reset().setEffectiveWeight(1).play();
    current = name;
  }
  // stagger so the six people never move in lockstep
  const offset = Math.random() * 10;
  play('idle', 0); mixer.setTime(offset);
  umbArm.setEffectiveWeight(0).play();

  const bone = (n) => root.getObjectByName(n);
  const bones = { head: bone('Bip01_Head'), neck: bone('Bip01_Neck'), chest: bone('Bip01_Spine2'), L: bone('Bip01_L_Hand'), R: bone('Bip01_R_Hand') };
  const anchors = { chest: new THREE.Object3D(), head: new THREE.Object3D(), umbrella: new THREE.Object3D(), phone: new THREE.Object3D() };
  const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _hq = new THREE.Quaternion(), _hp = new THREE.Quaternion(), _hv = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  let headYaw = 0;
  // a flinch (engine/flinch.js) laid over whatever is playing: the torso turning (twist, rad, + =
  // to the left) and leaning back (lean, rad), shared between the lower and upper spine
  const spine = [[bone('Bip01_Spine1'), 0.45], [bone('Bip01_Spine2'), 0.55]].filter(([b]) => b);
  let flinch = null; const _fa = new THREE.Vector3(), _fq = new THREE.Quaternion();
  const phoneClip = CLIPS.find((c) => c.name === 'phone');
  const phoneLayer = phoneClip ? mixer.clipAction(new THREE.AnimationClip('phone:hold', phoneClip.duration, phoneClip.tracks.filter((t) => PHONE_LAYER.test(boneOf(t))))) : null;
  if (phoneLayer) { phoneLayer.play(); phoneLayer.setEffectiveWeight(0); phoneLayer.time = phoneClip.duration * (0.15 + Math.random() * 0.6); }
  const person = {
    springs,
    root, mixer, role, sex, speeds, anchors, bones, umbrellaHand: hand, child: !!kid, size: kid ? kid.k : 1,
    // the actions themselves (base: whole body but the umbrella arm; arm: that arm), for posing a
    // person at an exact moment of a clip (the crowd's impostor bake). (mixer.existingAction by name
    // finds nothing here: the clips aren't attached to the model)
    actions: { base, arm },
    get state() { return current; },
    play,
    // umbrella: 0..1 how far the umbrella arm has taken over
    setUmbrella(u) {
      umbrellaW = u;
      umbArm.setEffectiveWeight(u);
      if (current && arm[current] !== umbArm) arm[current].setEffectiveWeight(1 - u);
    },
    // 0..1: how far a phone is up in front of the face while walking
    // (blended by weight: the mixer averages layers by weight, so a large weight makes it dominate)
    setPhoneHold(w) {
      if (!phoneLayer) return;
      phoneLayer.setEffectiveWeight(w > 0.001 ? w * w * 12 : 0);
      const d = phoneClip.duration;                                     // stay in the stretch where the phone is up
      if (phoneLayer.time < d * 0.12 || phoneLayer.time > d * 0.88) phoneLayer.time = d * 0.12;
    },
    // pose: { twist, lean } from engine/flinch.js flinchPose(), or null
    setFlinch(pose) { flinch = pose; },
    // speed (m/s) drives walk / jog playback so the stride matches the ground
    setGait(speed) {
      if (current === 'walk') base.walk.timeScale = arm.walk.timeScale = THREE.MathUtils.clamp(speed / speeds.walk, 0.55, 1.7);
      if (current === 'jog') base.jog.timeScale = arm.jog.timeScale = THREE.MathUtils.clamp(speed / speeds.jog, 0.6, 1.4);
    },
    // look: world [x, z] to turn the head (and a little of the neck) toward, or null
    update(dt, look = null) {
      if (dt > 0) mixer.update(dt);                                       // (nothing moves in no time; see play)
      root.updateMatrixWorld(true);
      if (flinch && (Math.abs(flinch.twist) > 1e-3 || Math.abs(flinch.lean) > 1e-3)) {
        const ry = root.rotation.y;
        for (const [b, k] of spine) {
          b.parent.getWorldQuaternion(_hp).invert();
          b.quaternion.premultiply(_fq.setFromAxisAngle(_fa.set(0, 1, 0).applyQuaternion(_hp), flinch.twist * k));
          b.quaternion.premultiply(_fq.setFromAxisAngle(_fa.set(-Math.cos(ry), 0, Math.sin(ry)).applyQuaternion(_hp), flinch.lean * k));
          b.updateMatrixWorld(true);
        }
      }
      let want = 0;
      if (look) {
        bones.head.getWorldPosition(_hv);
        let d = Math.atan2(look[0] - _hv.x, look[1] - _hv.z) - root.rotation.y;
        while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
        want = Math.max(-1.2, Math.min(1.2, d));
      }
      headYaw += (want - headYaw) * Math.min(1, dt * 7);
      if (Math.abs(headYaw) > 0.005) {
        for (const [b, k] of [[bones.neck, 0.35], [bones.head, 0.65]]) {
          if (!b) continue;
          b.parent.getWorldQuaternion(_hp);
          const axis = _hv.copy(UP).applyQuaternion(_hp.invert());
          b.quaternion.premultiply(_hq.setFromAxisAngle(axis, headYaw * k));
        }
        root.updateMatrixWorld(true);
      }
      if (springs && dt > 0) springs.update(dt);
      const yaw = _q.setFromEuler(_e.set(0, root.rotation.y, 0));
      for (const [k, b] of [['chest', bones.chest], ['head', bones.head]]) { b.getWorldPosition(anchors[k].position); anchors[k].quaternion.copy(yaw); }
      bones[hand].getWorldPosition(anchors.umbrella.position); anchors.umbrella.quaternion.copy(yaw);
      bones.R.getWorldPosition(anchors.phone.position); bones.R.getWorldQuaternion(anchors.phone.quaternion);
      for (const a of Object.values(anchors)) a.updateMatrixWorld(true);
      return umbrellaW;
    },
  };
  LIVE.add({ root, meshes });
  return person;
}
