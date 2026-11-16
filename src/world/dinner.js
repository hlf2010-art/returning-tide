// Act III: dinner with Dad at the Peace Hotel Jazz Bar (world/story.js has the words and the endings).
// From 7:30 pm on day 6 he's at the reserved table, early as always. E: sit down with him; the
// conversation runs at the table (1-4 to answer); what you decide is his to take back to Nanjing.
// When it's over he stays a while with his tea; when you leave the bar, so does he.
import * as THREE from 'three';
import { createPerson } from './people.js';
import { createSeatedPose, turn } from './driverPose.js';
import { L as LAYOUT } from './layout.js';
import { stamp } from '../engine/life.js';
import { D, dinnerScript } from './story.js';
import { getLang } from '../ui/i18n.js';
import { createGimbalProp } from './props/gimbal.js';
import { studio } from '../engine/studio.js';

const T = (zh, en) => (getLang() === 'zh' ? zh : en);
const Y0 = LAYOUT.curbH;
const CHAIR = { x: -40.58, z: -220.0 }, SEAT = { x: -42.05, z: -220.0, yaw: -1.34 };

export function createDinner({ scene, people, player, getLife, save, sceneTalk, onMode, hud }) {
  const frame = new THREE.Group(); frame.position.set(CHAIR.x, Y0, CHAIR.z); frame.rotation.y = -Math.PI / 2; frame.visible = false; scene.add(frame);
  let dad = null, pose = null;
  if (people && people.manifest.cast.dad) {
    dad = createPerson(people, 'dad'); dad.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    frame.add(dad.root); dad.play('idle', 0); dad.update(0);
    pose = createSeatedPose(dad, { recline: 0.08, elbows: 0.55 });
  }
  const cabin = { hip: new THREE.Vector3(0, 0.47, 0.0), pedals: [new THREE.Vector3(-0.13, 0.05, 0.42), new THREE.Vector3(0.14, 0.05, 0.46)],
    rimPoint(a, out) { return out.copy(frame.localToWorld(new THREE.Vector3(a * 0.2, 0.79, 0.34))); } };
  const S = { seated: false, done: false, gone: false };
  // what you made, on the table between you, once you've put it there (world/work.js)
  const onTable = createGimbalProp({ phone: false }); onTable.group.position.set(-41.42, Y0 + 0.745 + 0.06, -219.88); onTable.group.rotation.y = 0.9; onTable.group.visible = false; scene.add(onTable.group);
  const L0 = () => getLife();
  // is he here? day 6 from 7:30 pm, while the dinner quest wants you, until you've left after talking
  function here() {
    const l = L0(), q = (l.quests || { list: {} }).list.dinner, now = stamp(l);
    if (!q || S.gone) return false;
    if (q.status === 'failed') return false;
    return now >= D(6, 19, 30) && now <= D(6, 23, 0) && (q.status === 'active' || (q.status === 'done' && !S.leftBar));
  }
  const headPos = () => { const v = new THREE.Vector3(); if (dad && dad.bones.head) dad.bones.head.getWorldPosition(v); else v.set(CHAIR.x, Y0 + 1.25, CHAIR.z); return v; };
  function sit() {
    S.seated = true; player.teleport(SEAT.x, SEAT.z, SEAT.yaw, -0.08); onMode && onMode('seat');
    const l = L0(); l.flags.dinnerStarted = true; save && save();
    const h = headPos();
    sceneTalk.play(dinnerScript(l), { with: 'dad', at: () => [h.x, h.y, h.z], onDone: (set) => {
      const ll = L0(); ll.flags.dinnerChoice = set || 'silent'; S.done = true; save && save();
      hud && hud.toast(T('E 起身', 'E to stand up'), 3);
    } });
  }
  return {
    get here() { return here(); },
    get seated() { return S.seated; },
    candidates() {
      if (!here() || S.seated || S.done || !frame.visible) return [];
      const h = headPos();
      return [{ id: 'dinner:sit', x: h.x, y: h.y - 0.1, z: h.z, reach: 4.2, cone: 0.6 }];
    },
    owns(id) { return id === 'dinner:sit'; },
    prompt() { return { target: T('爸爸', 'Dad'), action: T('坐下', 'Sit down with him') }; },
    interact() { sit(); return true; },
    // the seat: E stands you up once the talk is over (not during it)
    canStand() { return !sceneTalk.active; },
    stood() { S.seated = false; },
    update(dt, pp) {
      const on = here();
      frame.visible = on && !!dad;
      const shown = on && !!L0().flags.showedWork;
      if (shown && !onTable.group.visible) onTable.setState(studio(L0()).fixes);
      onTable.group.visible = shown;
      if (on && pp && S.done && !S.seated && Math.hypot(pp.x - CHAIR.x, pp.z - CHAIR.z) > 14) { S.leftBar = true; S.gone = true; frame.visible = false; }
      if (!frame.visible || !dad) return;
      dad.root.position.set(0, 0, 0);
      const h = headPos(), look = sceneTalk.active || S.seated ? [pp.x, pp.z] : null;
      dad.update(dt * 0.5, look); frame.updateMatrixWorld(true); pose(cabin, frame);
      if (!look && dad.bones.head) turn(dad.bones.head, new THREE.Vector3(-1, -0.25, 0).normalize(), 0.3);   // down at his tea
    },
  };
}
