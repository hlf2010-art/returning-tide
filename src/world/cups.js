// Takeaway coffee cups: the Manner cup and the Starbucks cup (props made for this game, see
// docs/props/). Each brand is built once (its label is a large painted canvas) and handed out as
// clones that share geometry, materials and texture, so a street full of coffee costs two textures.
//   cup(brand)           a new clone, origin at the base centre, label facing local +Z
//   holdCup(cup, hand, yaw, out)  place a cup in a hand: grip at the palm, upright, label facing out
import * as THREE from 'three';
import { createCoffeeCup } from './props/manner-cup.js';
import { createStarbucksCup } from './props/starbucks-cup.js';

const templates = {};
function template(brand) {
  if (!templates[brand]) templates[brand] = brand === 'starbucks' ? createStarbucksCup(THREE, { segments: 40 }) : createCoffeeCup(THREE, { segments: 36 });
  return templates[brand];
}

export function cup(brand = 'manner') {
  const t = template(brand), c = t.clone(true);
  c.userData.grip = c.getObjectByName('grip');
  c.userData.brand = brand;
  return c;
}

// hand: world position of the hand bone; yaw: which way the label should face (the person's
// facing); out: metres in front of the hand (the cup sits in the curl of the fingers, not on the bone)
const _f = new THREE.Vector3();
export function holdCup(c, hand, yaw, out = 0.035) {
  const gy = c.userData.grip ? c.userData.grip.position.y : 0.05;
  _f.set(Math.sin(yaw), 0, Math.cos(yaw));
  c.position.set(hand.x + _f.x * out, hand.y - gy, hand.z + _f.z * out);
  c.rotation.set(0, yaw, 0);
}
