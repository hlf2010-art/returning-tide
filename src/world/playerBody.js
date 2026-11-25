// The player's own body, seen in first person: Ji Bai's own model (tools/jibai/: from his character sheet, on the Rocketbox Biped rig) with
// motion-captured idle / walk / jog / sprint (see tools/rocketbox/convert.mjs, clip set 'player').
//   - the gait clips are blended by speed and phase-locked to the controller's stride, so the legs
//     you see, the head bob and the footstep sounds all land on the same beat;
//   - walking backwards plays the walk in reverse; strafing turns the hips toward the motion;
//   - standing still, the head can look about before the body turns to follow;
//   - the head and hair are not drawn (the camera is inside them) but still cast a shadow;
//   - winded: the spine bends forward over the knees (the camera bends with it, headMotion.js).
import { cup as makeCup } from './cups.js';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { createSprings } from './springs.js';
import { spreadArms } from './people.js';
import { twoBone } from './driverPose.js';
import { createFpHand } from './fpHand.js';
export const FP_ROLE = 'p1';   // whose hand holds things in first person (world/fpHand.js)
export const CUP_SOCKET = [0.06, 0.045, 0];   // the cup's axis in the first-person hand's frame (m): toward the knuckles, out of the palm
let FP_SIGN = 1, FP_UP = 1;
export const FP_ACROSS = [0.9, 0.3];   // the fingers' direction: leftward, back toward the camera
export const setFpSign = (s, u = FP_UP) => { FP_SIGN = s; FP_UP = u; };

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

export function createPlayerBody(people, { walk = 2.2, run = 5.0, fpRole = FP_ROLE } = {}) {
  const root = SkeletonUtils.clone(people.avatars.player);
  root.scale.setScalar(0.01);
  root.name = 'player-body';
  const armOut = (people.manifest.cast.player?.armOut || 0) * Math.PI / 180;
  let separateHead = false;
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.frustumCulled = false; o.castShadow = false; o.receiveShadow = true;
    // head and hair are not drawn at all: collapsed, the hair cards weighted between head and neck
    // stretch into slivers right in front of the eye (the shadow copy keeps them)
    if (/head|opacity/i.test(o.material.name)) { o.visible = false; separateHead = true; }
    if (/^hero-|^kept-hair$/.test(o.name)) o.visible = false;   // a swapped-in close-up head and its kept hair (people.js swapHead): the collar cap closes the neck
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
  // holding something up in the right hand (a cup, the phone): the texting clip's right arm only
  // (the camera owns the head), layered over whatever the legs are doing
  const holdClip = clips.phone ? new THREE.AnimationClip('hold', clips.phone.duration, clips.phone.tracks.filter((t) => /^Bip01_R_(Clavicle|UpperArm|Forearm|Hand)\b/.test(t.name) && !/Finger/.test(t.name))) : null;
  const hold = holdClip ? mixer.clipAction(holdClip) : null;
  if (hold) { hold.play(); hold.setEffectiveWeight(0); hold.time = holdClip.duration * 0.3; }
  // a cup: the right arm of the umbrella clip (a fist round an upright handle, thumb up, at the chest),
  // when the men's clip set raises the right hand; the fingers are closed in code (gripCup)
  const umb = people.umbrellaHand && people.umbrellaHand.m === 'R' && (people.clips.m || []).find((c) => c.name === 'umbrella');
  const cupClip = umb ? new THREE.AnimationClip('cupHold', umb.duration, umb.tracks.filter((t) => /^Bip01_R_(Clavicle|UpperArm|Forearm|Hand)\b/.test(t.name) && !/Finger/.test(t.name))) : null;
  const cupHold = cupClip ? mixer.clipAction(cupClip) : null;
  if (cupHold) { cupHold.play(); cupHold.setEffectiveWeight(0); cupHold.time = cupClip.duration * 0.3; }
  let holdW = 0, want = { cup: false, phone: false };


  // ---- a cup in the right hand ----
  // (the phone clip's finger tracks don't suit this rig's fingers and mangled the hand: none are used;
  // f runs along the palm to the knuckles, p from it toward the thumb's base, under the palm)
  const R = (n) => root.getObjectByName(n);
  const rHand = R('Bip01_R_Hand'), knuckle = R('Bip01_R_Finger2'), thumb0 = R('Bip01_R_Finger0');
  const gf = new THREE.Vector3(), gp = new THREE.Vector3(), ga = new THREE.Vector3(), gh = new THREE.Vector3(), gt = new THREE.Vector3(), gn = new THREE.Vector3();
  const _wq = new THREE.Quaternion(), _lq = new THREE.Quaternion(), _la = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  const grip = { centre: new THREE.Vector3(), ok: false };
  // turn bone b about a world axis by angle (its children follow)
  function turnWorld(b, axis, angle) {
    b.parent.getWorldQuaternion(_wq);
    _la.copy(axis).applyQuaternion(_wq.invert());
    b.quaternion.premultiply(_lq.setFromAxisAngle(_la, angle));
    b.updateMatrixWorld(true);
  }
  function frame() {
    rHand.getWorldPosition(gh); knuckle.getWorldPosition(gf); thumb0.getWorldPosition(gt);
    gf.sub(gh); const len = gf.length(); gf.normalize();
    gp.copy(gt).sub(gh); gp.addScaledVector(gf, -gp.dot(gf)).normalize();       // palm side, toward the thumb
    ga.crossVectors(gf, gp).normalize();                                          // the curl axis: + closes the hand
    return len;
  }
  // the cup held up in front of the chest, a little right, as you'd carry a coffee down the street:
  // the arm reaches there (two-bone IK), the forearm turns so the palm faces the cup, the hand settles,
  // the fingers and thumb close round it (tools/jibai/fingers.mjs gave the fingers clean weights)
  const upperR = R('Bip01_R_UpperArm'), foreR = R('Bip01_R_Forearm');
  const FING = [1, 2, 3, 4].map((k) => [R(`Bip01_R_Finger${k}`), R(`Bip01_R_Finger${k}1`), R(`Bip01_R_Finger${k}2`)]);
  const THMB = [R('Bip01_R_Finger0'), R('Bip01_R_Finger01'), R('Bip01_R_Finger02')];
  const CURL = [0.95, 1.0, 0.75], TCURL = [0, 0, 0];   // (the four fingers move as one on the middle finger's bones; the thumb stays: fingers.mjs)
  const HOLD = { fwd: 0.43, right: 0.14, down: 0.185 };          // in the camera's frame: out, right, down (m)          // where the hand goes, from the eye (m)
  const gF = new THREE.Vector3(), gR = new THREE.Vector3(), gT = new THREE.Vector3(), gPole = new THREE.Vector3(), gA = new THREE.Vector3(), gB = new THREE.Vector3(), gC = new THREE.Vector3();
  const fDes = new THREE.Vector3(), nDes = new THREE.Vector3(), _hq = new THREE.Quaternion();
  function curlChain(chain, angles, w) {
    chain.forEach((b, i) => {
      if (!b || !b.children.length) return;
      frame(); gn.copy(gp);                                                       // (the thumb's base lies under the palm: toward it is the palm's side)
      b.getWorldPosition(gA); (b.children.find((c) => c.isBone) || b.children[0]).getWorldPosition(gB);
      gC.subVectors(gB, gA).normalize(); gB.crossVectors(gC, gn);
      if (gB.lengthSq() < 1e-6) return;
      turnWorld(b, gB.normalize(), angles[i] * w);
    });
  }
  function gripCup(w, eye, viewYaw, camYaw = 0, camPitch = 0) {
    grip.ok = false;
    if (!rHand || !knuckle || !thumb0 || !upperR || !foreR || w <= 0) return;
    gF.set(Math.sin(viewYaw), 0, Math.cos(viewYaw)); gR.crossVectors(gF, UP).normalize();
    // 1. the arm: the hand to its place in the VIEW (as shooters place their viewmodel: fixed against the
    //    camera, so the cup sits in the same spot on screen wherever you look), blended in with w
    rHand.getWorldPosition(gh);
    { const cp = Math.cos(camPitch), sp = Math.sin(camPitch);
      gC.set(-Math.sin(camYaw) * cp, sp, -Math.cos(camYaw) * cp);                                   // the camera's forward
      gB.set(Math.cos(camYaw), 0, -Math.sin(camYaw));                                               // its right
      gA.crossVectors(gB, gC).normalize();                                                          // its up
      gT.copy(eye).addScaledVector(gC, HOLD.fwd).addScaledVector(gB, HOLD.right).addScaledVector(gA, -HOLD.down); }
    gT.lerpVectors(gh, gT, w);
    gPole.copy(UP).multiplyScalar(-1).addScaledVector(gR, 0.7).normalize();
    twoBone(upperR, foreR, rHand, gT, gPole);
    // 2. the hand's roll: the palm's side kept toward the cup (the clip already holds it close; a small
    //    turn of the forearm, never a half-turn, which the skin can't take)
    fDes.copy(gF).multiplyScalar(0.85).addScaledVector(gR, 0.25).addScaledVector(UP, 0.1).normalize();
    nDes.copy(gR).addScaledVector(gF, -0.2).normalize();
    frame(); gn.crossVectors(gf, gp).normalize();
    foreR.getWorldPosition(gA); rHand.getWorldPosition(gB); gC.subVectors(gB, gA).normalize();   // forearm axis
    const pn = gA.copy(gn).addScaledVector(gC, -gn.dot(gC)).normalize(), pd = gB.copy(nDes).addScaledVector(gC, -nDes.dot(gC)).normalize();
    const tw = Math.max(-0.5, Math.min(0.5, Math.atan2(gC.dot(new THREE.Vector3().crossVectors(pn, pd)), pn.dot(pd))));
    grip.tw = tw;
    turnWorld(foreR, gC, tw * w);
    // 3. the hand settles: fingers forward, palm to the cup (a small bend at the wrist now)
    frame(); _hq.setFromUnitVectors(gf, fDes);
    { const ax = new THREE.Vector3(_hq.x, _hq.y, _hq.z), s = ax.length(); grip.ha = 2 * Math.atan2(s, _hq.w); if (s > 1e-5) turnWorld(rHand, ax.divideScalar(s), 2 * Math.atan2(s, _hq.w) * w); }
    // 4. the hand itself: a properly rigged one (world/fpHand.js) takes the place of his, closed round the cup
    if (fp && fp.ready !== undefined && (rHand.scale.setScalar(1), rHand.updateMatrixWorld(true), fp.update(rHand, knuckle, w, gB.copy(gR).multiplyScalar(-FP_ACROSS[0]).addScaledVector(gF, -FP_ACROSS[1]).normalize(), FP_UP))) {
      // his own hand folds into the wrist (the first-person hand, world/fpHand.js, is in its place)
      fp.setVisible(true); rHand.scale.setScalar(0.001); rHand.updateMatrixWorld(true);
      fp.socket(grip.centre); grip.base = true;
    } else {
      for (const ch of FING) curlChain(ch, CURL, w);
      const len = frame();
      grip.centre.copy(gh).addScaledVector(gf, len * 0.6).addScaledVector(gp, 0.05);
    }
    grip.ok = true;
  }

  const bone = (n) => root.getObjectByName(n);
  root.remove(shadow);
  const group = new THREE.Group(); group.name = 'player'; group.add(root, shadow);
  const fp = createFpHand(people, fpRole);
  if (fp) { fp.setVisible(false); group.add(fp.root); }
  const bodyBones = bonesOf(root), shadowBones = bonesOf(shadow);
  const springs = createSprings(root);
  const head = bone('Bip01_Head'), shadowHead = shadow.getObjectByName('Bip01_Head');
  const spine = [bone('Bip01_Spine1'), bone('Bip01_Spine2'), bone('Bip01_Neck')];
  const shoulders = [bone('Bip01_L_UpperArm'), bone('Bip01_R_UpperArm')];
  // one-mesh models (Ji Bai's own): with the head collapsed, the T-shirt's neckline is an open hole to look down
  // into; a disc the colour of the shirt closes it, square to the neck (the Rocketbox body's collar closes itself)
  const cap = separateHead ? null : new THREE.Mesh(new THREE.CircleGeometry(0.085, 28), new THREE.MeshStandardMaterial({ color: 0xc4c1bb, roughness: 0.95, side: THREE.DoubleSide }));
  if (cap) { cap.name = 'collar-cap'; group.add(cap); }
  const _cn = new THREE.Vector3(), _cs = new THREE.Vector3(), _cz = new THREE.Vector3(0, 0, 1);

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

  let yaw = 0, init = false, bend = 0, lastX = 0, lastZ = 0, props = null;
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
    get yaw() { return yaw; }, grip,
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
      holdW += ((want.cup || want.phone ? 1 : 0) - holdW) * Math.min(1, dt * 5);
      const cupping = want.cup && !want.phone && cupHold;
      if (cupHold) {
        cupHold.setEffectiveWeight(cupping && holdW > 0.01 ? holdW * holdW * 12 : 0);
        const d = cupClip.duration; if (cupHold.time < d * 0.2 || cupHold.time > d * 0.8) cupHold.time = d * 0.2;
      }
      if (hold) {
        hold.setEffectiveWeight(!cupping && holdW > 0.01 ? holdW * holdW * 12 : 0);
        const d = holdClip.duration; if (hold.time < d * 0.12 || hold.time > d * 0.88) hold.time = d * 0.12;
      }
      mixer.update(dt);
      spreadArms(root, armOut);                                      // (people.json armOut: the hands clear the wide trousers)

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
      if (fp && !(want.cup && !want.phone && holdW > 0.05)) { fp.setVisible(false); if (rHand) rHand.scale.setScalar(1); if (foreR) foreR.scale.setScalar(1); }
      if (want.cup && !want.phone && holdW > 0.05) gripCup(Math.min(1, holdW), eye || head.getWorldPosition(new THREE.Vector3()), yaw, player.yaw, player.pitch);
      if (springs) springs.update(dt);                              // the jacket's hem, the trouser legs (tools/cloth/)
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
      if (cap) {
        spine[2].getWorldPosition(_cn); spine[1].getWorldPosition(_cs);
        const up = _cs.sub(_cn).multiplyScalar(-1).normalize();
        group.worldToLocal(cap.position.copy(_cn).addScaledVector(up, 0.045));
        cap.quaternion.setFromUnitVectors(_cz, up);
      }
    },
    setVisible(v) { group.visible = v; },
    // what's in the right hand: { cup, phone } (Manner's cup; the phone while its screen is up)
    setHold(h) { want = { cup: !!h.cup, phone: !!h.phone }; },
    // place the props in the palm, after update(); eye: camera position (the phone's screen faces it)
    placeProps(eye) {
      if (!props) {
        props = { cup: new THREE.Group(), phone: new THREE.Group() };
        props.cup.add(makeCup('manner'));                                   // your Manner cup (world/cups.js)
        const ph = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.152, 0.008), new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.3, metalness: 0.5 }));
        const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.144), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75, 0.8, 0.9) })); scr.position.z = 0.0045;
        props.phone.add(ph, scr);
        group.add(props.cup, props.phone);
        for (const g of [props.cup, props.phone]) g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      }
      const show = holdW > 0.6;
      props.cup.visible = show && want.cup && !want.phone; props.phone.visible = show && want.phone;
      if (!show) return;
      const hand = root.getObjectByName('Bip01_R_Hand'), finger = root.getObjectByName('Bip01_R_Finger2');
      hand.getWorldPosition(_v); const palm = _v.clone();
      if (finger) { finger.getWorldPosition(_v); palm.add(_v).multiplyScalar(0.5); }
      if (props.cup.visible) {                                             // in the curl of the right hand: the cup sits on the palm side (toward the body)
        if (grip.ok && grip.base) group.worldToLocal(props.cup.position.copy(grip.centre));                    // (the solved grip gives the cup's base)
        else if (grip.ok) { group.worldToLocal(props.cup.position.copy(grip.centre)); const gr = props.cup.children[0].userData.grip; props.cup.position.y -= (gr ? gr.position.y : 0.06) * 0.9; }
        else { props.cup.position.copy(palm); props.cup.position.y -= 0.03; }
        props.cup.rotation.set(0, yaw, 0);
      }
      if (props.phone.visible && eye) {
        const z = eye.clone().sub(palm).normalize(), fy = new THREE.Vector3(Math.sin(yaw), 0.6, Math.cos(yaw)).normalize();
        fy.addScaledVector(z, -fy.dot(z)).normalize(); const x = new THREE.Vector3().crossVectors(fy, z).normalize(); fy.crossVectors(z, x);
        props.phone.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, fy, z)); props.phone.position.copy(palm).addScaledVector(z, 0.012);
      }
    },
  };
}
