// How hotel staff stand and greet (the Peace Hotel's lobby; world/interiors.js). What luxury hotels train for:
//   - where: beside the flow of people, never in it: by the lift bank, by the door, at the end of the desk, back
//     near the wall or a pilaster, the body turned about 45 degrees toward where guests come from, so they see
//     guests coming and guests see them without being faced down;
//   - the stance at rest: upright, weight even, feet a little apart, hands lightly clasped in front just below the
//     waist (right over left), chin level; not arms hanging, not hands in pockets or folded;
//   - the approach (the "10 and 5" rule, as Ritz-Carlton trains it, and Chinese hotels' 15-degree bow): when a
//     guest comes within about three metres they look up and meet the guest's eye, turn a little toward them;
//     at about a metre and a half, a small bow from the waist (hosts) or a nod (security), and a greeting; a
//     host may take half a step toward the guest, then steps back to the post once the guest has passed.
// This module is the shared part: the clasped hands, the bow, the look and turn and the half step, for any
// person with a post, reacting to whoever comes near: the player or the hotel's own guests.
import * as THREE from 'three';

const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _p = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

// the height of the hands at rest for this body (a little below the hips): from the head bone, once
function claspHeight(person) {
  if (person._claspY) return person._claspY;
  person.root.updateMatrixWorld(true);
  const h = person.bones.head ? person.bones.head.getWorldPosition(_v).y - person.root.position.y : 1.6;
  return (person._claspY = THREE.MathUtils.clamp(h * 0.585, 0.82, 1.0));
}

// hands clasped in front, right over left (w 0..1; skip an arm that is busy: pressing a button, gesturing)
export function claspHands(person, w, { skipR = false, skipL = false } = {}) {
  const r = person.root, y = r.rotation.y, fx = Math.sin(y), fz = Math.cos(y), lx = Math.cos(y), lz = -Math.sin(y), hy = claspHeight(person);
  const at = (f, l, u) => new THREE.Vector3(r.position.x + fx * f + lx * l, r.position.y + u, r.position.z + fz * f + lz * l);
  const pole = (s) => new THREE.Vector3(lx * s - fx * 0.6, -0.6, lz * s - fz * 0.6).normalize();   // elbows a little out and back
  if (!skipL) person.setReach('L', at(0.16, 0.03, hy), w, { pole: pole(1) }); else if (!person._keepL) person.setReach('L', null, 0);
  if (!skipR) person.setReach('R', at(0.185, -0.01, hy + 0.02), w, { pole: pole(-1) }); else if (!person._keepR) person.setReach('R', null, 0);
}

// a bow's lean at time t (s) into it: down over 0.35 s, held 0.3 s, up over 0.45 s; depth in radians
export function bowLean(t, depth) {
  if (t < 0 || t > 1.1) return 0;
  const k = t < 0.35 ? t / 0.35 : t < 0.65 ? 1 : 1 - (t - 0.65) / 0.45;
  return -depth * k * k * (3 - 2 * k);
}

const wrap = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

// a member of staff at a post. kind: 'host' (bows, may step forward), 'guard' (a nod, stays put), 'desk' (behind a
// counter: a nod, no step). onGreet(actor) is called once each time someone comes up to them.
export function createManner(person, { home, kind = 'host', notice = 3.2, greet = 1.7, step = 0, onGreet = null } = {}) {
  const seen = new Map();   // actor id -> { greeted, d }
  const depth = kind === 'host' ? 0.26 : 0.1;
  const S = { bowT: -1, focus: null, off: 0 };
  return {
    get busy() { return S.bowT >= 0 && S.bowT < 1.1; },
    // actors: [{ id, x, z, y? }], the player among them
    update(dt, actors, { look = true } = {}) {
      const r = person.root;
      // whom to attend to: the nearest within notice distance
      let focus = null, fd = Infinity;
      for (const a of actors) {
        if (a.y != null && Math.abs(a.y - r.position.y) > 2.5) continue;
        const d = Math.hypot(a.x - (home.x), a.z - (home.z));
        let m = seen.get(a.id); if (!m) { m = { greeted: false, d }; seen.set(a.id, m); }
        if (d > notice + 3) m.greeted = false;                          // gone: a fresh greeting next time
        const coming = d < m.d + 0.002; m.d = d;
        if (d < notice && d < fd) { fd = d; focus = a; }
        if (d < greet && !m.greeted && (coming || d < greet * 0.7)) { m.greeted = true; S.bowT = 0; S.focus = a; onGreet && onGreet(a); }
      }
      if (S.bowT >= 0) { S.bowT += dt; if (S.bowT > 1.4) { S.bowT = -1; } }
      const f = S.bowT >= 0 ? S.focus : focus;
      // turn a little toward them (more while greeting); back to the post's own angle otherwise
      const want = f ? home.yaw + wrap(Math.atan2(f.x - r.position.x, f.z - r.position.z) - home.yaw) * (S.bowT >= 0 ? 0.75 : kind === 'guard' ? 0.25 : 0.4) : home.yaw;
      r.rotation.y += wrap(want - r.rotation.y) * Math.min(1, dt * (S.bowT >= 0 ? 4 : 2));
      // the half step toward the guest while greeting, and back
      if (step > 0) {
        const wantOff = S.bowT >= 0 && S.bowT < 1.1 ? step : 0; S.off += (wantOff - S.off) * Math.min(1, dt * 3);
        const fy = home.yaw; r.position.x = home.x + Math.sin(fy) * S.off; r.position.z = home.z + Math.cos(fy) * S.off;
      }
      person.setFlinch({ twist: 0, lean: S.bowT >= 0 ? bowLean(S.bowT, depth) : 0 });
      claspHands(person, 1);
      person.update(dt, look && f ? [f.x, f.z] : null);
    },
  };
}
