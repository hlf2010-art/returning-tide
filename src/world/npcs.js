// Two coherently styled waterfront NPCs near the Bund river railing, with
// articulated idle, listening, speaking, and greeting animations.
import * as THREE from 'three';
import { L, npcs as npcLayout } from './layout.js';

const std = (o) => new THREE.MeshStandardMaterial(o);

function wrapAngle(a) {
  let r = a;
  while (r > Math.PI) r -= Math.PI * 2;
  while (r < -Math.PI) r += Math.PI * 2;
  return r;
}

function buildCharacter(spec, M) {
  const isLin = spec.id === 'lin';
  const scale = spec.height / 1.7;
  const root = new THREE.Group();
  root.name = `npc-${spec.id}`;
  root.position.set(spec.x, L.deckY, spec.z);
  root.rotation.y = spec.yaw;
  root.scale.setScalar(scale);

  const skinMat = std({ color: isLin ? 0xd6a68a : 0xdfb195, roughness: 0.68, metalness: 0.02 });
  const coatMat = std({ color: isLin ? 0x24303e : 0xa98b6c, roughness: 0.85, metalness: 0.04 });
  const trimMat = std({ color: isLin ? 0x3f4650 : 0x5d242c, roughness: 0.88, metalness: 0.02 });
  const pantsMat = std({ color: isLin ? 0x1a1d23 : 0x18191e, roughness: 0.86, metalness: 0.02 });
  const hairMat = std({ color: isLin ? 0x35373c : 0x181517, roughness: 0.58, metalness: 0.05 });
  const eyeMat = std({ color: 0x121214, roughness: 0.35 });

  // Legs & shoes (soles at local y = 0)
  const legs = new THREE.Group();
  for (const s of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(s * 0.095, 0, s * 0.02);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.065, 0.23), M.rubber);
    shoe.position.set(0, 0.0325, 0.04);
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.043, 0.42, 10), pantsMat);
    shin.position.set(0, 0.25, 0);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.056, 0.44, 10), pantsMat);
    thigh.position.set(0, 0.66, 0);
    leg.add(shoe, shin, thigh);
    legs.add(leg);
  }
  root.add(legs);

  // Hips + coat lower skirt
  const hips = new THREE.Group();
  hips.position.set(0, 0.86, 0);
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.215, isLin ? 0.36 : 0.42, 14), coatMat);
  skirt.scale.set(1.14, 1, 0.8);
  skirt.position.set(0, -0.1, 0);
  hips.add(skirt);
  root.add(hips);

  // Upper torso
  const torso = new THREE.Group();
  torso.position.set(0, 0.02, 0);
  hips.add(torso);

  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.172, 0.148, 0.44, 14), coatMat);
  chest.scale.set(1.16, 1, 0.78);
  chest.position.set(0, 0.22, 0);
  torso.add(chest);

  // Collar / scarf / sweater / satchel details
  if (isLin) {
    const sweater = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.05, 0.16, 10), trimMat);
    sweater.scale.set(1.1, 1, 0.8);
    sweater.position.set(0, 0.36, 0.07);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.025, 8, 14), coatMat);
    collar.rotation.x = Math.PI / 2 - 0.18;
    collar.position.set(0, 0.43, 0.01);
    torso.add(sweater, collar);
    for (const by of [0.1, 0.22]) {
      const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 8), M.iron);
      btn.rotation.x = Math.PI / 2;
      btn.position.set(0, by, 0.125);
      torso.add(btn);
    }
  } else {
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.154, 0.156, 0.045, 14), coatMat);
    belt.scale.set(1.16, 1, 0.8);
    belt.position.set(0, 0.03, 0);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.048, 0.016), M.steel);
    buckle.position.set(0, 0.03, 0.126);
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.034, 8, 16), trimMat);
    scarf.rotation.x = Math.PI / 2 + 0.1;
    scarf.position.set(0, 0.425, 0.015);
    const drape = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.22, 0.028), trimMat);
    drape.position.set(-0.045, 0.31, 0.118);
    drape.rotation.z = 0.08;
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.56, 0.27), M.wood);
    strap.position.set(0.03, 0.19, 0.01);
    strap.rotation.z = -0.68;
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.24), M.wood);
    bag.position.set(0.21, -0.05, -0.02);
    torso.add(belt, buckle, scarf, drape, strap, bag);
  }

  // Neck + Head
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.45, 0.01);
  torso.add(headPivot);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.052, 0.1, 10), skinMat);
  neck.position.set(0, 0.045, 0);
  headPivot.add(neck);

  const head = new THREE.Group();
  head.position.set(0, 0.17, 0.005);
  headPivot.add(head);

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.102, 14, 12), skinMat);
  skull.scale.set(0.9, 1.12, 0.97);
  head.add(skull);

  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.034, 0.024), skinMat);
  nose.position.set(0, -0.006, 0.095);
  head.add(nose);

  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 6), eyeMat);
    eye.position.set(s * 0.033, 0.018, 0.087);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.007, 0.008), hairMat);
    brow.position.set(s * 0.033, 0.036, 0.088);
    head.add(eye, brow);
  }

  // Hair + glasses
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.106, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), hairMat);
  hairCap.scale.set(0.92, 1.06, 1.0);
  hairCap.position.set(0, 0.015, -0.012);
  hairCap.rotation.x = -0.18;
  head.add(hairCap);

  if (isLin) {
    const backHair = new THREE.Mesh(
      new THREE.SphereGeometry(0.101, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.56),
      hairMat,
    );
    backHair.scale.set(0.9, 1.0, 0.96);
    backHair.position.set(0, 0.008, -0.014);
    backHair.rotation.x = -0.62;
    head.add(backHair);

    const fw = 0.036, fh = 0.024, ft = 0.0036;
    for (const s of [-1, 1]) {
      const cx = s * 0.034;
      const topBar = new THREE.Mesh(new THREE.BoxGeometry(fw, ft, 0.005), M.iron);
      topBar.position.set(cx, 0.017 + fh * 0.5, 0.101);
      const botBar = new THREE.Mesh(new THREE.BoxGeometry(fw, ft, 0.005), M.iron);
      botBar.position.set(cx, 0.017 - fh * 0.5, 0.101);
      const outerBar = new THREE.Mesh(new THREE.BoxGeometry(ft, fh + ft, 0.005), M.iron);
      outerBar.position.set(cx + s * fw * 0.5, 0.017, 0.101);
      const innerBar = new THREE.Mesh(new THREE.BoxGeometry(ft, fh + ft, 0.005), M.iron);
      innerBar.position.set(cx - s * fw * 0.5, 0.017, 0.101);
      const temple = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.004, 0.088), M.iron);
      temple.position.set(s * 0.06, 0.024, 0.056);
      temple.rotation.y = s * -0.16;
      head.add(topBar, botBar, outerBar, innerBar, temple);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.028, ft, 0.005), M.iron);
    bridge.position.set(0, 0.022, 0.101);
    head.add(bridge);
  } else {
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.054, 10, 8), hairMat);
    bun.position.set(0, -0.025, -0.105);
    const bangs = new THREE.Mesh(new THREE.SphereGeometry(0.098, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), hairMat);
    bangs.scale.set(0.95, 1.0, 0.98);
    bangs.position.set(0, 0.022, 0.004);
    bangs.rotation.x = 0.14;
    head.add(bun, bangs);
  }

  // Articulated arms: local +x is character LEFT, -x is character RIGHT
  function buildArm(sideSign, holdThermos = false) {
    const shoulder = new THREE.Group();
    shoulder.position.set(sideSign * 0.205, 0.375, 0);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 8), coatMat);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.041, 0.26, 10), coatMat);
    upper.position.set(0, -0.13, 0);
    const elbow = new THREE.Group();
    elbow.position.set(0, -0.26, 0);
    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.032, 0.24, 10), coatMat);
    fore.position.set(0, -0.12, 0);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.033, 8, 8), skinMat);
    hand.scale.set(0.85, 1.15, 0.65);
    hand.position.set(0, -0.255, 0);
    elbow.add(fore, hand);
    if (holdThermos) {
      const thermos = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.2, 12), M.steel);
      thermos.position.set(0, -0.265, 0.045);
      thermos.rotation.x = Math.PI / 2 - 0.25;
      const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.038, 12), M.iron);
      capTop.position.set(0, -0.245, 0.135);
      capTop.rotation.x = Math.PI / 2 - 0.25;
      elbow.add(thermos, capTop);
    }
    shoulder.add(cap, upper, elbow);
    torso.add(shoulder);
    return { shoulder, elbow };
  }

  const leftArm = buildArm(1, isLin);
  const rightArm = buildArm(-1, false);

  // Ms. Su carries a folding umbrella; it only appears (and opens) in the drizzle
  let umbrella = null;
  if (!isLin) {
    const holder = new THREE.Group(); holder.position.set(0, -0.255, 0); leftArm.elbow.add(holder);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.72, 6), std({ color: 0x1a1a1a, roughness: 0.5 }));
    shaft.position.y = 0.36;
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.58, 0.3, 14, 1, true), std({ color: 0x6b2a36, roughness: 0.45, side: THREE.DoubleSide }));
    canopy.position.y = 0.7;
    holder.add(shaft, canopy); holder.visible = false;
    umbrella = { holder, canopy };
  }

  return {
    id: spec.id,
    spec,
    root,
    hips,
    torso,
    headPivot,
    leftArm,
    rightArm,
    umbrella,
    speakBlend: 0,
    interactBlend: 0,
    listenPhase: isLin ? 0.4 : 2.1,
    headOffset: new THREE.Vector3(spec.x, L.deckY + spec.height * 0.91, spec.z),
  };
}

export function createNpcs(M) {
  const group = new THREE.Group();
  group.name = 'npcs';
  const chars = npcLayout.list.map((spec) => {
    const c = buildCharacter(spec, M);
    group.add(c.root);
    return c;
  });
  const byId = Object.fromEntries(chars.map((c) => [c.id, c]));

  function getSpeakerPosition(id) {
    const c = byId[id];
    return c ? c.headOffset : npcLayout.pairFocus;
  }

  const _q = new THREE.Quaternion(), _qw = new THREE.Quaternion(), _e = new THREE.Euler();
  // umbrella: 0..1, how far Ms. Su's umbrella is open (the drizzle); her left arm holds it up
  function update(t, dt, { activeSpeaker = null, interacting = false, playerPos = null, umbrella = 0 } = {}) {
    const k = Math.min(1, dt * 5.5);
    for (const c of chars) {
      const isSpeaking = activeSpeaker === c.id;
      const isLin = c.id === 'lin';
      c.speakBlend += ((isSpeaking ? 1 : 0) - c.speakBlend) * Math.min(1, dt * 6);
      c.interactBlend += ((interacting ? 1 : 0) - c.interactBlend) * Math.min(1, dt * 5);

      // Smooth yaw toward player when interacting, or back toward conversational partner
      let targetYaw = c.spec.yaw;
      if (interacting && playerPos) {
        targetYaw = Math.atan2(playerPos.x - c.spec.x, playerPos.z - c.spec.z);
      }
      c.root.rotation.y += wrapAngle(targetYaw - c.root.rotation.y) * k;

      // Subtle chest breathing and weight shift
      const breath = Math.sin(t * 1.55 + c.listenPhase);
      c.hips.position.y = 0.86 + breath * 0.004;
      c.torso.rotation.x = 0.025 * c.speakBlend + breath * 0.012;
      c.torso.rotation.z = Math.sin(t * 0.55 + c.listenPhase) * 0.015 * (1 - c.interactBlend * 0.5);

      // Head: attentive gaze + speaking nods + occasional river glance when quiet
      const riverGlance = !activeSpeaker && !interacting
        ? Math.max(0, Math.sin(t * 0.28 + c.listenPhase)) * (isLin ? 0.24 : -0.28)
        : 0;
      const speakNod = Math.sin(t * 4.4 + c.listenPhase) * 0.055 * c.speakBlend;
      const listenNod = !isSpeaking && activeSpeaker
        ? Math.max(0, Math.sin(t * 1.9 + c.listenPhase)) * 0.045
        : 0;
      const greetNod = interacting && isLin ? Math.sin(t * 3.0) * 0.04 * c.speakBlend : 0;

      const targetHeadYaw = riverGlance;
      const targetHeadPitch = speakNod + listenNod + greetNod + breath * 0.01;
      c.headPivot.rotation.y += (targetHeadYaw - c.headPivot.rotation.y) * Math.min(1, dt * 4);
      c.headPivot.rotation.x += (targetHeadPitch - c.headPivot.rotation.x) * Math.min(1, dt * 7);

      // Arms: relaxed idle + organic speaking gestures on right arm (and subtle left on Su)
      const beat1 = 0.5 + 0.5 * Math.sin(t * 4.8 + c.listenPhase);
      const beat2 = 0.5 + 0.5 * Math.sin(t * 7.3 + c.listenPhase * 1.7);

      // Right arm (main conversational gesture)
      const rIdleS = -0.07 + breath * 0.015;
      const rIdleE = -0.24;
      const rSpeakS = -0.34 - beat1 * 0.16;
      const rSpeakE = -0.78 - beat2 * 0.28;
      c.rightArm.shoulder.rotation.x = rIdleS + (rSpeakS - rIdleS) * c.speakBlend;
      c.rightArm.shoulder.rotation.z = -0.09 - 0.07 * beat1 * c.speakBlend;
      c.rightArm.elbow.rotation.x = rIdleE + (rSpeakE - rIdleE) * c.speakBlend;

      // Left arm (Lin steadies his thermos; Su adds light secondary balance gesture)
      if (isLin) {
        c.leftArm.shoulder.rotation.x = -0.14 - 0.04 * c.speakBlend;
        c.leftArm.shoulder.rotation.z = 0.1;
        c.leftArm.elbow.rotation.x = -0.45 - 0.08 * beat1 * c.speakBlend;
      } else {
        const lSpeakS = -0.2 - beat2 * 0.1;
        const lSpeakE = -0.52 - beat1 * 0.18;
        c.leftArm.shoulder.rotation.x = -0.06 + (lSpeakS + 0.06) * c.speakBlend;
        c.leftArm.shoulder.rotation.z = 0.09 + 0.04 * beat2 * c.speakBlend;
        c.leftArm.elbow.rotation.x = -0.22 + (lSpeakE + 0.22) * c.speakBlend;
        if (c.umbrella) {
          const w = Math.min(1, umbrella * 3);
          c.leftArm.shoulder.rotation.x += (-0.5 - c.leftArm.shoulder.rotation.x) * w;
          c.leftArm.shoulder.rotation.z += (0.16 - c.leftArm.shoulder.rotation.z) * w;
          c.leftArm.elbow.rotation.x += (-1.2 - c.leftArm.elbow.rotation.x) * w;
          const h = c.umbrella.holder;
          h.visible = umbrella > 0.02;
          if (h.visible) {
            c.root.updateMatrixWorld(true);
            h.parent.getWorldQuaternion(_q).invert();
            _qw.setFromEuler(_e.set(0.05, c.root.rotation.y, -0.12, 'YXZ'));          // upright, leaning a little toward Old Lin
            h.quaternion.copy(_q.multiply(_qw));
            const u = umbrella; c.umbrella.canopy.scale.set(0.15 + 0.85 * u, 0.5 + 0.5 * u, 0.15 + 0.85 * u);
          }
        }
      }
    }
  }

  return { group, chars, byId, getSpeakerPosition, update };
}
