// A face that's alive, from the facial bones every Rocketbox avatar has (jaw, eyelids, eyebrows,
// eyes). Layered on top of whatever the body animation is doing, after the mixer:
//   - blinks: every 2-6 s, sometimes a double blink; slower and heavier when tired
//   - speaking: the jaw follows a syllable-rate envelope (~5 Hz, irregular), closing at pauses
//   - emphasis: brows lift on questions and stressed words, knit a little when annoyed
//   - eye contact: the eyes find whoever they're looking at and make small saccades away and back
// Bones are moved about world-meaningful axes (the head's own left/right axis), so the result
// doesn't depend on how each bone's local axes happen to be set up.
import * as THREE from 'three';

const _q = new THREE.Quaternion(), _p = new THREE.Quaternion(), _a = new THREE.Vector3(), _v = new THREE.Vector3(), _w = new THREE.Vector3();

export function createFace(person, rnd = Math.random) {
  const b = (n) => person.root.getObjectByName(n);
  const jaw = b('Bip01_MJaw');
  const lids = { top: [b('Bip01_LEyeBlinkTop'), b('Bip01_REyeBlinkTop')].filter(Boolean), bottom: [b('Bip01_LEyeBlinkBottom'), b('Bip01_REyeBlinkBottom')].filter(Boolean) };
  const brows = [b('Bip01_LInnerEyebrow'), b('Bip01_RInnerEyebrow'), b('Bip01_LOuterEyebrow'), b('Bip01_ROuterEyebrow'), b('Bip01_MMiddleEyebrow')].filter(Boolean);
  const inner = [b('Bip01_LInnerEyebrow'), b('Bip01_RInnerEyebrow')].filter(Boolean);
  const eyes = [b('Bip01_LEye'), b('Bip01_REye')].filter(Boolean);
  const browRest = new Map(brows.map((x) => [x, x.position.clone()]));
  let t = 0, nextBlink = 1 + rnd() * 3, blink = 0, blinkDir = 0, doubleBlink = false;
  let jawOpen = 0, syll = 0, browUp = 0, knit = 0, saccade = { yaw: 0, pitch: 0, t: 0 };

  // rotate a bone about a world axis (on top of its animated pose)
  function turn(bone, axis, angle) {
    if (!bone || !angle) return;
    bone.parent.getWorldQuaternion(_p);
    _a.copy(axis).applyQuaternion(_p.invert());
    bone.quaternion.premultiply(_q.setFromAxisAngle(_a, angle));
  }

  // s: { speaking 0..1 (a line is being voiced), pause (between phrases), question, annoyed,
  //      tired, lookAt: Vector3 | null }
  function update(dt, s = {}) {
    t += dt;
    const yaw = person.root.rotation.y;
    const side = _w.set(Math.cos(yaw), 0, -Math.sin(yaw));             // the head's left axis: + tips forward / down
    // blinks
    nextBlink -= dt;
    if (nextBlink <= 0 && blinkDir === 0) { blinkDir = 1; doubleBlink = rnd() < 0.18; nextBlink = (s.tired ? 1.5 : 2) + rnd() * 4; }
    const speed = s.tired ? 7 : 11;
    if (blinkDir === 1) { blink += dt * speed; if (blink >= 1) { blink = 1; blinkDir = -1; } }
    else if (blinkDir === -1) { blink -= dt * speed * 0.8; if (blink <= 0) { blink = 0; blinkDir = doubleBlink ? 1 : 0; doubleBlink = false; } }
    const lidClose = Math.max(blink, s.tired ? 0.25 : 0);
    for (const l of lids.top) turn(l, side, 0.55 * lidClose);
    for (const l of lids.bottom) turn(l, side, -0.18 * lidClose);
    // the jaw: open on syllables, closed in pauses; irregular, like speech
    if (s.speaking && !s.pause) {
      syll += dt * (4.2 + 1.6 * Math.sin(t * 1.7) + 0.8 * Math.sin(t * 5.3));
      const env = Math.max(0, Math.sin(syll * Math.PI * 2)) ** 0.7 * (0.55 + 0.45 * Math.sin(t * 2.3 + 1));
      jawOpen += (env - jawOpen) * Math.min(1, dt * 22);
    } else jawOpen += (0 - jawOpen) * Math.min(1, dt * 14);
    turn(jaw, side, 0.2 * jawOpen);
    // brows: up for questions and emphasis (and while listening with interest), together when annoyed
    const wantUp = (s.question ? 0.9 : 0) + (s.speaking ? 0.25 * Math.max(0, Math.sin(t * 1.3)) : 0);
    browUp += (wantUp - browUp) * Math.min(1, dt * 4);
    knit += ((s.annoyed ? 1 : 0) - knit) * Math.min(1, dt * 3);
    for (const br of brows) { br.position.copy(browRest.get(br)); }
    if (brows.length) {
      // brow bones are positioned in their parent's space; move them along the parent's view of world up
      for (const br of brows) {
        br.parent.getWorldQuaternion(_p); const up = _v.set(0, 1, 0).applyQuaternion(_p.invert());
        const s2 = br.parent.getWorldScale(new THREE.Vector3()).x || 1;
        br.position.addScaledVector(up, (0.0035 * browUp - (inner.includes(br) ? 0.002 * knit : 0)) / s2);
      }
    }
    // eyes: toward the target, with small saccades away and back
    saccade.t -= dt;
    if (saccade.t <= 0) { saccade = { yaw: (rnd() - 0.5) * (s.speaking ? 0.35 : 0.18), pitch: (rnd() - 0.5) * 0.12, t: 0.4 + rnd() * 2.2 }; }
    if (s.lookAt && eyes.length) {
      eyes[0].getWorldPosition(_v);
      let d = Math.atan2(s.lookAt.x - _v.x, s.lookAt.z - _v.z) - yaw;
      while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      const ey = THREE.MathUtils.clamp(d, -0.5, 0.5) + saccade.yaw * 0.5, ep = THREE.MathUtils.clamp(Math.atan2(s.lookAt.y - _v.y, Math.hypot(s.lookAt.x - _v.x, s.lookAt.z - _v.z)), -0.3, 0.3);
      for (const e of eyes) { turn(e, _v.set(0, 1, 0), ey); turn(e, side, -ep + saccade.pitch * 0.3); }
    }
    person.root.updateMatrixWorld(true);
  }
  return { update, get jaw() { return jawOpen; }, get blink() { return blink; }, bones: { jaw: !!jaw, lids: lids.top.length, brows: brows.length, eyes: eyes.length } };
}
