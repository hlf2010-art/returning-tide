// Pure movement + collision. No three.js, no DOM.
import { L, colliders, groundHeight } from '../world/layout.js';

export const WALK_SPEED = 2.2;
export const RUN_SPEED = 5.0;
// Weight: velocity chases the wish at different rates for speeding up and slowing down, a body
// at walking pace is slower still to wind up into a run, and there is little steering in the air.
export const ACCEL = 5.5;       // 1/s: ~0.55 s to walking pace
export const DECEL = 7.5;       // 1/s: a stop takes a step or so, not an instant
const RUN_UP = 0.3;             // acceleration factor above walking pace (~1 s from a walk to a run)
const AIR = 0.7;                // steering in the air
const MAX_STEP = 0.12; // metres per collision sub-step
const GRAVITY = 9.8;
export const JUMP_SPEED = 3.3; // ~0.55 m hop: for feel, not for clearing barriers (colliders ignore height)

export function createBody() {
  return { x: L.spawn.x, z: L.spawn.z, y: groundHeight(L.spawn.x, L.spawn.z), vx: 0, vz: 0, vy: 0, air: false, landed: false, impact: 0, hit: null };
}

// Push a circle (x,z,r) out of every collider. Returns the tag of the last thing touched.
export function resolve(p, r = L.radius) {
  let hit = null;
  for (let iter = 0; iter < 3; iter++) {
    let moved = false;
    for (let i = 0; i < colliders.length; i++) {
      const b = colliders[i];
      const cx = p.x < b.minX ? b.minX : p.x > b.maxX ? b.maxX : p.x;
      const cz = p.z < b.minZ ? b.minZ : p.z > b.maxZ ? b.maxZ : p.z;
      const dx = p.x - cx, dz = p.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-9) {
        const d = Math.sqrt(d2), push = r - d;
        p.x += (dx / d) * push; p.z += (dz / d) * push;
      } else {
        // centre is inside the box: leave through the nearest face
        const l = p.x - b.minX, rr = b.maxX - p.x, n = p.z - b.minZ, s = b.maxZ - p.z;
        const m = Math.min(l, rr, n, s);
        if (m === l) p.x = b.minX - r; else if (m === rr) p.x = b.maxX + r;
        else if (m === n) p.z = b.minZ - r; else p.z = b.maxZ + r;
      }
      hit = b.tag; moved = true;
    }
    if (!moved) break;
  }
  return hit;
}

// wishX/wishZ: desired direction in world space (length 0..1). cap: speed limit (m/s) from
// stamina (a winded body can't run, an exhausted one stops).
export function stepBody(body, wishX, wishZ, run, dt, jump = false, cap = Infinity) {
  const speed = Math.min(run ? RUN_SPEED : WALK_SPEED, cap);
  const tx = wishX * speed, tz = wishZ * speed;
  const cur = Math.hypot(body.vx, body.vz), tgt = Math.hypot(tx, tz);
  let rate = tgt > cur + 0.02 ? ACCEL * (cur > WALK_SPEED * 0.9 ? RUN_UP : 1) : DECEL;
  if (body.air) rate = AIR;
  const k = 1 - Math.exp(-rate * dt);
  body.vx += (tx - body.vx) * k;
  body.vz += (tz - body.vz) * k;

  body.pvx = body.vx; body.pvz = body.vz;                       // before collisions: how hard we hit things
  let dx = body.vx * dt, dz = body.vz * dt;
  const dist = Math.hypot(dx, dz);
  const n = Math.max(1, Math.ceil(dist / MAX_STEP));
  dx /= n; dz /= n;
  body.hit = null;
  const px = body.x, pz = body.z;
  for (let i = 0; i < n; i++) {
    body.x += dx; body.z += dz;
    const h = resolve(body);
    if (h) body.hit = h;
  }
  // velocity reflects what actually happened, so sliding along walls feels right
  if (dt > 0) { body.vx = (body.x - px) / dt; body.vz = (body.z - pz) / dt; }

  const gy = groundHeight(body.x, body.z);
  body.landed = false; body.impact = 0;
  if (!body.air && jump && dt > 0) { body.air = true; body.vy = JUMP_SPEED; }
  if (body.air) {
    body.vy -= GRAVITY * dt;
    body.y += body.vy * dt;
    if (body.y <= gy && body.vy <= 0) { body.impact = -body.vy; body.y = gy; body.vy = 0; body.air = false; body.landed = true; }
  } else body.y += (gy - body.y) * (1 - Math.exp(-18 * dt));
  return body;
}
