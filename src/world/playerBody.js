// The player's own body, seen in first person: a Rocketbox avatar (Male_Adult_07, MIT) with
// motion-captured idle / walk / jog / sprint (see tools/rocketbox/convert.mjs, clip set 'player').
//   - the gait clips are blended by speed and phase-locked to the controller's stride, so the legs
//     you see, the head bob and the footstep sounds all land on the same beat;
//   - walking backwards plays the walk in reverse; strafing turns the hips toward the motion;
//   - standing still, the head can look about before the body turns to follow;
//   - the head and hair are not drawn (the camera is inside them) but still cast a shadow;
//   - winded: the spine bends forward over the knees (the camera bends with it, headMotion.js).
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const GAITS = ['walk', 'jog', 'sprint'];
const wrap = (a) => { let r = a; while (r > Math.PI) r -= Math.PI * 2; while (r < -Math.PI) r += Math.PI * 2; return r; };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// gait weights by speed (m/s): idle -> walk -> jog -> sprint, each pair crossfading over a range
export function gaitWeights(speed, walk, run) {
  const idle = 1 - smooth(0.05, 0.7, speed);
  const jogAt = walk + (run - walk) * 0.45;
  const wj = smooth(walk * 1.02, jogAt, speed), js = smooth(jogAt, run * 0.96, speed);
  const moving = 1 - idle;
  return { idle, walk: moving * (1 - wj), jog: moving * wj * (1 - js), sprint: moving * wj * js };
}

export function createPlayerBody(people, { walk = 2.2, run = 5.0 } = {}) {
  const root = SkeletonUtils.clone(people.avatars.player);
  root.scale.setScalar(0.01);
  root.name = 'player-body';
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.frustumCulled = false; o.castShadow = false; o.receiveShadow = true;
    // head and hair are not drawn at all: collapsed, the hair cards weighted between head and neck
    // stretch into slivers right in front of the eye (the shadow copy keeps them)
    if (/head|opacity/i.test(o.material.name)) o.visible = false;
  });
  // The eye sits where the head is, so the drawn body has its head bone collapsed to a point: that
  // closes the collar (an invisible head would leave a hole to look down into). Its shadow comes
  // from a second, undrawn copy in the same pose with the head in place.
  const shadow = SkeletonUtils.clone(people.avatars.player);
  shadow.scale.setScalar(0.01); shadow.name = 'player-shadow';
  const ghost = new Map();
  shadow.traverse((o) => {
    if (!o.isMesh) return;
    o.frustumCulled = false; o.castShadow = true; o.receiveShadow = false;
    const m = ghost.get(o.material) || o.material.clone();
    m.colorWrite = false; m.depthWrite = false; ghost.set(o.material, m); o.material = m;
  });
  root.add(shadow);   // (re-parented below: it shares the body's transform, not its scale)
  const bonesOf = (r) => { const out = []; r.traverse((o) => { if (o.isBone) out.push(o); }); return out; };
  const mixer = new THREE.AnimationMixer(root);
  const clips = Object.fromEntries(people.clips.player.map((c) => [c.name, c]));
  const act = {};
  for (const name of ['idle', ...GAITS]) {
    act[name] = mixer.clipAction(clips[name]);
    act[name].play(); act[name].setEffectiveWeight(0);
    if (name !== 'idle') act[name].timeScale = 0;             // driven by the stride, not by the clock
  }
  act.idle.setEffectiveWeight(1);

  const bone = (n) => root.getObjectByName(n);
  root.remove(shadow);
  const group = new THREE.Group(); group.name = 'player'; group.add(root, shadow);
  const bodyBones = bonesOf(root), shadowBones = bonesOf(shadow);
  const head = bone('Bip01_Head'), shadowHead = shadow.getObjectByName('Bip01_Head');
  const spine = [bone('Bip01_Spine1'), bone('Bip01_Spine2'), bone('Bip01_Neck')];
  const shoulders = [bone('Bip01_L_UpperArm'), bone('Bip01_R_UpperArm')];

  // where in each gait clip the left foot is planted (lowest), so stride 0.75 = left footfall
  const plant = {};
  {
    const probe = SkeletonUtils.clone(people.avatars.player), m = new THREE.AnimationMixer(probe), v = new THREE.Vector3();
    const foot = probe.getObjectByName('Bip01_L_Foot');
    for (const g of GAITS) {
      const a = m.clipAction(clips[g]); a.play(); let best = 0, low = Infinity;
      for (let i = 0; i < 48; i++) {
        m.setTime(clips[g].duration * i / 48); probe.updateMatrixWorld(true);
        foot.getWorldPosition(v); if (v.y < low) { low = v.y; best = i / 48; }
      }
      a.stop(); plant[g] = best;
    }
  }

  let yaw = 0, init = false, bend = 0, lastX = 0, lastZ = 0;
  const tune = { back: 0.05, backDown: 0.03, neckDrop: 0.1, headScale: 0.001 };   // where the neck sits relative to the eye (m)
  const _q = new THREE.Quaternion(), _p = new THREE.Quaternion(), _axis = new THREE.Vector3(), _v = new THREE.Vector3();

  // bend a bone about a world-space axis, on top of whatever the animation did
  function bendBone(b, axis, angle) {
    if (!b || !angle) return;
    b.parent.getWorldQuaternion(_p);
    const local = _axis.copy(axis).applyQuaternion(_p.invert());
    b.quaternion.premultiply(_q.setFromAxisAngle(local, angle));
  }

  return {
    root: group, body: root, shadow, mixer, tune,
    get yaw() { return yaw; },
    // player: the controller (body, yaw, pitch, stride, speed, forward, lateral, head, stamina)
    // eye: the camera position, read to hang the body from it, and moved when bent over
    update(dt, player, eye = null) {
      const b = player.body, viewYaw = player.yaw + Math.PI;       // the avatar faces +Z at yaw 0
      // first frame, or a teleport: no turning on the spot to catch up
      if (!init || Math.hypot(b.x - lastX, b.z - lastZ) > 1.5) { yaw = viewYaw; init = true; }
      lastX = b.x; lastZ = b.z;
      const speed = player.speed;
      // which way the hips face
      let target = yaw, reverse = false;
      if (speed > 0.3) {
        const moveYaw = Math.atan2(b.vx, b.vz);
        let d = wrap(moveYaw - viewYaw);
        if (Math.abs(d) > Math.PI * 0.55) { reverse = true; d = wrap(d + Math.PI); }   // backing up
        target = viewYaw + clamp(d, -0.85, 0.85);
        yaw += wrap(target - yaw) * (1 - Math.exp(-9 * dt));
      } else {
        // standing: the head looks about freely; past ~35° the body turns to catch up
        const off = wrap(viewYaw - yaw);
        if (Math.abs(off) > 0.6) yaw += wrap(viewYaw - Math.sign(off) * 0.12 - yaw) * (1 - Math.exp(-5 * dt));
      }
      // gait blend, phase-locked to the stride (two footfalls per clip cycle)
      const w = gaitWeights(speed, walk, run);
      act.idle.setEffectiveWeight(w.idle);
      for (const g of GAITS) {
        const a = act[g], d = clips[g].duration;
        a.setEffectiveWeight(w[g]);
        let ph = ((player.stride - 0.75) / 2 + plant[g]) % 1; if (ph < 0) ph += 1;
        a.time = (reverse ? 1 - ph : ph) * d;
      }
      mixer.update(dt);

      // stand the body under the eye (refined below, once the pose is known)
      const down = Math.max(0, -player.pitch), back = tune.back + tune.backDown * Math.min(1, down / 1.2);
      const fx = Math.sin(player.yaw), fz = Math.cos(player.yaw);   // the view's backward direction
      root.position.set(b.x + fx * back, b.y, b.z + fz * back);
      root.rotation.set(0, yaw, 0);
      head.scale.setScalar(1);
      root.updateMatrixWorld(true);

      // winded: bend forward from the waist, arms hanging toward the knees
      bend += ((player.head ? player.head.bend : 0) - bend) * Math.min(1, dt * 8);
      if (bend > 0.001) {
        const side = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));   // the body's left-hand axis (world): + bends forward
        bendBone(spine[0], side, 0.55 * bend); bendBone(spine[1], side, 0.35 * bend); bendBone(spine[2], side, 0.15 * bend);
        for (const s of shoulders) bendBone(s, side, -0.2 * bend);   // arms hang a little forward of straight down
        root.updateMatrixWorld(true);
      }
      // hang the body from the eye: the neck stays just behind and below it whatever the clip does
      // (a sprint leans forward, a walk sways), so the collar never swings in front of the camera
      // (bent over winded, the body leads and the camera follows it down: see headMotion.js)
      if (eye) {
        head.getWorldPosition(_v);
        const k = 1 - bend, dy = clamp(eye.y - tune.neckDrop - _v.y, -0.06, 0.06) * k;
        root.position.x += (eye.x + fx * back - _v.x) * k; root.position.z += (eye.z + fz * back - _v.z) * k; root.position.y += dy;
        root.updateMatrixWorld(true);
      }
      // bent over, the eye goes where the head went (just in front of the face)
      if (eye && bend > 0.001) {
        head.getWorldPosition(_v);
        const ex = _v.x - fx * 0.12, ey = _v.y + 0.07, ez = _v.z - fz * 0.12;
        eye.x += (ex - eye.x) * bend; eye.y += (ey - eye.y) * bend; eye.z += (ez - eye.z) * bend;
      }
      // the shadow copy takes the pose, head and all; then the drawn body loses its head
      shadow.position.copy(root.position); shadow.quaternion.copy(root.quaternion);
      for (let i = 0; i < bodyBones.length; i++) {
        const a = bodyBones[i], c = shadowBones[i];
        c.position.copy(a.position); c.quaternion.copy(a.quaternion); c.scale.copy(a.scale);
      }
      shadowHead.scale.setScalar(1);
      shadow.updateMatrixWorld(true);
      head.scale.setScalar(tune.headScale);
      head.updateMatrixWorld(true);
    },
    setVisible(v) { group.visible = v; },
  };
}
