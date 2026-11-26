// What you've bought, out in the world. Glue between engine/shopping.js (orders, the courier's
// window, what you own and where it is) and the street:
//   - the courier waits at the Hankou Road kerb (world/courier.js); E takes the parcel from him
//   - the parcel is in your hand for a moment; then it's yours
//   - an umbrella you have with you opens with U: a canopy over your head, the rain drums on it
//   - noise-cancelling headphones with you: H hushes the city (wind, traffic, the crowd)
// Anything left at the Peace Hotel front desk waits there (the phone's orders page says so).
import * as THREE from 'three';
import { createCourier, makeParcel } from './courier.js';
import { canopyGeometry } from './umbrella.js';
import { stepOrders, handOver, canUse, item } from '../engine/shopping.js';
import { t, tr } from '../ui/i18n.js';

const COURIER_LINES = [
  { zh: '纪先生是吧？您的快递，拿好。', en: 'Mr Ji? Your parcel. There you go.' },
  { zh: '尾号0731是吧？给，您的快递。', en: 'Number ending 0731? Here, your parcel.' },
  { zh: '您的快递，麻烦给个好评哈。', en: "Your parcel. A good rating would be great, thanks." },
];

export function createBelongings({ scene, people, camera, hud, audio, getLife, save }) {
  const courier = createCourier({ scene, people });
  // the parcel in your hand, briefly: held in front, low, like you'd carry a small box
  const parcel = makeParcel(); parcel.visible = false; scene.add(parcel);
  let parcelFor = 0, umbrellaUp = false, ancOn = false, hinted = {};
  // the umbrella over your head (first person: the canopy's underside and the shaft)
  const umb = new THREE.Group(); umb.visible = false; umb.name = 'player-umbrella';
  // the underside of a black umbrella at night: faint sheen from the street lights, eight silver ribs
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x1a1d24, roughness: 0.62, side: THREE.DoubleSide, emissive: new THREE.Color(0.018, 0.02, 0.028) });
  const canopy = new THREE.Mesh(canopyGeometry({ r: 0.62, h: 0.26, perRib: 6, rings: 8 }), canopyMat); canopy.position.y = 0.51;
  const ribPts = [];
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ribPts.push(0, 0.125, 0, Math.cos(a) * 0.6, -0.12, Math.sin(a) * 0.6); }
  const ribGeo = new THREE.BufferGeometry(); ribGeo.setAttribute('position', new THREE.Float32BufferAttribute(ribPts, 3));
  const ribs = new THREE.LineSegments(ribGeo, new THREE.LineBasicMaterial({ color: 0x80848c })); ribs.position.y = 0.375;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.9, 6), new THREE.MeshStandardMaterial({ color: 0x9a9ca2, metalness: 1, roughness: 0.3 })); shaft.position.y = -0.06;
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.014, 0.12, 8), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 })); handle.position.y = -0.55;
  umb.add(canopy, ribs, shaft, handle); scene.add(umb);
  let umbOpen = 0;

  // resume a courier who was waiting when the game was saved
  {
    const L = getLife();
    for (const o of L.flags.orders || []) if (o.status === 'out' && o.address === 'here' && !o.missed) courier.dispatch(o.id);
  }

  function hint(key, text) { if (hinted[key]) return; hinted[key] = true; hud.toast(text, 4); }

  return {
    courier,
    get umbrellaUp() { return umbrellaUp && umbOpen > 0.6; },
    get holdingParcel() { return parcelFor > 0; },
    // per frame, after the life clock moved; events: drained from the life outbox
    step(dt, events) {
      const L = getLife();
      stepOrders(L);
      for (const ev of events) {
        if (ev.type === 'courier') { courier.dispatch(ev.order); audio && audio.cue && audio.cue('ping'); }
        if (ev.type === 'courier-gone') courier.leave(ev.order);
      }
      if (canUse(L, 'umbrella')) hint('umbrella', t('hintUmbrella'));
      if (canUse(L, 'anc')) hint('anc', t('hintAnc'));
    },
    update(dt, playerBody, player) {
      courier.update(dt, playerBody, camera);
      parcelFor = Math.max(0, parcelFor - dt);
      // the parcel: in front of you, low, moving with you
      parcel.visible = parcelFor > 0;
      if (parcel.visible) {
        const yaw = player.yaw, fx = -Math.sin(yaw), fz = -Math.cos(yaw);
        parcel.position.set(camera.position.x + fx * 0.38 + Math.cos(yaw) * 0.08, camera.position.y - 0.62, camera.position.z + fz * 0.38 - Math.sin(yaw) * 0.08);
        parcel.rotation.set(0, yaw, 0);
      }
      // the umbrella: opens over half a second; held a little forward and to the right
      umbOpen += ((umbrellaUp ? 1 : 0) - umbOpen) * Math.min(1, dt * 6);
      umb.visible = umbOpen > 0.02;
      if (umb.visible) {
        const yaw = player.yaw, fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
        umb.position.set(camera.position.x + fx * 0.12 + rx * 0.1, camera.position.y + 0.3, camera.position.z + fz * 0.12 + rz * 0.1);
        umb.rotation.set(0, yaw, 0); umb.rotateX(-0.12);
        canopy.scale.set(0.2 + 0.8 * umbOpen, 0.6 + 0.4 * umbOpen, 0.2 + 0.8 * umbOpen); ribs.scale.copy(canopy.scale);
      }
    },
    // what E would do (the prompt), and doing it
    candidates() { return courier.waiting ? [{ id: 'courier', ...courier.focus, reach: 2.9, cone: 0.66 }] : []; },
    prompt(id) { return id === 'courier' ? { target: t('pCourier'), action: t('pTakeParcel') } : null; },
    interact(id) {
      if (id !== 'courier') return false;
      const L = getLife(), ids = courier.handOver();
      const names = [];
      for (const oid of ids) {
        const o = (L.flags.orders || []).find((x) => x.id === oid);
        if (handOver(L, oid) && o) names.push(...o.items.map((i) => tr({ zh: item(i).name, en: item(i).en })));
      }
      hud.bark({ speaker: { zh: '快递员', en: 'Courier' }, text: COURIER_LINES[Math.floor(Math.random() * COURIER_LINES.length)], seconds: 2.6 });
      if (names.length) { parcelFor = 3.2; setTimeout(() => hud.toast(t('gotParcel', names.join(t('listSep'))), 3.2), 900); }
      if (save) save();
      return true;
    },
    mapObjective() { return courier.waiting ? { x: courier.spot.x, z: courier.spot.z, label: t('pCourier') } : null; },
    // U: umbrella, H: headphones (only once you have them with you)
    key(code) {
      const L = getLife();
      if (code === 'KeyU' && canUse(L, 'umbrella')) { umbrellaUp = !umbrellaUp; hud.toast(t(umbrellaUp ? 'umbrellaOpen' : 'umbrellaClose'), 1.6); return true; }
      if (code === 'KeyH' && canUse(L, 'anc')) { ancOn = !ancOn; if (audio.setAnc) audio.setAnc(ancOn); hud.toast(t(ancOn ? 'ancOn' : 'ancOff'), 1.6); return true; }
      return false;
    },
  };
}
