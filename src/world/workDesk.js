// The desk in room 612, at night: the notebook lies open on it, and the gimbal stands on its
// charger. E opens the notebook there (ui/workbook.js): write the day up, change the firmware.
// (The room and the desk are world/hotelUpper.js's; this only puts two things on it.)
import * as THREE from 'three';
import { SIX } from './hotelUpper.js';
import { getLang } from '../ui/i18n.js';
import { studio, hasProduct, canWrite } from '../engine/studio.js';
import { createGimbalProp } from './props/gimbal.js';

const T = (zh, en) => (getLang() === 'zh' ? zh : en);
const DESK = { x: -39.4, y: SIX.y + 0.78, z: SIX.room.z1 - 0.32 };

export function createWorkDesk({ scene, player, getLife, onOpen }) {
  const group = new THREE.Group(); group.name = 'work-desk'; group.visible = false; scene.add(group);
  // the notebook: a dark cover, two cream pages, a pen
  const cover = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.012, 0.23), new THREE.MeshStandardMaterial({ color: 0x1c2330, roughness: 0.8 }));
  cover.position.set(DESK.x + 0.12, DESK.y + 0.006, DESK.z - 0.04); cover.rotation.y = -0.1;
  const pages = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.006, 0.21), new THREE.MeshStandardMaterial({ color: 0xefe6cf, roughness: 0.9, emissive: 0x4a4030 }));
  pages.position.set(0, 0.009, 0); cover.add(pages);
  const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.14, 6), new THREE.MeshStandardMaterial({ color: 0x0d0d10, roughness: 0.4 }));
  pen.rotation.z = Math.PI / 2; pen.rotation.y = 0.5; pen.position.set(0.05, 0.016, 0.03); cover.add(pen);
  group.add(cover);
  const prop = createGimbalProp({ phone: false }); prop.group.position.set(DESK.x + 0.6, DESK.y + 0.06, DESK.z + 0.02); prop.group.rotation.y = 2.4; group.add(prop.group);
  let key = '';
  return {
    candidates() { return group.visible ? [{ id: 'wDesk', x: DESK.x, y: DESK.y + 0.1, z: DESK.z - 0.05, reach: 2.3, cone: 0.6 }] : []; },
    owns(id) { return id === 'wDesk'; },
    prompt() { const L = getLife(); return { target: T('书桌', 'The desk'), action: !hasProduct(L) ? T('翻开本子', 'Open the notebook') : canWrite(L).ok ? T('写今天的记录', "Write up today") : T('翻开本子（改固件）', 'Open the notebook (firmware)') }; },
    interact() { onOpen && onOpen(); return true; },
    update() {
      const b = player.body; group.visible = b.y > SIX.y - 1 && b.y < SIX.y + 3 && b.x > SIX.room.x0 - 3;
      if (!group.visible) return;
      const L = getLife(), on = hasProduct(L), k = on ? studio(L).fixes.map((f) => f.id).join() : '-';
      prop.group.visible = on;
      if (on && k !== key) { key = k; prop.setState(studio(L).fixes); }
    },
  };
}
