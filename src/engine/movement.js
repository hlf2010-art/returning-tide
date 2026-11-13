// Pure movement + collision. No three.js, no DOM.
import { L, colliders, groundHeight } from '../world/layout.js';

export const WALK_SPEED = 2.5;
export const RUN_SPEED = 5.2;
const ACCEL = 14;      // how fast velocity chases the wish direction
const MAX_STEP = 0.12; // metres per collision sub-step
const GRAVITY = 9.8;
export const JUMP_SPEED = 3.3; // ~0.55 m hop: for feel, not for clearing barriers (colliders ignore height)

export function createBody() {
  return { x: L.spawn.x, z: L.spawn.z, y: groundHeight(L.spawn.x, L.spawn.z), vx: 0, vz: 0, vy: 0, air: false, landed: false, hit: null };
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

// wishX/wishZ: desired direction in world space (length 0..1).
export function stepBody(body, wishX, wishZ, run, dt, jump = false) {
  const speed = run ? RUN_SPEED : WALK_SPEED;
  const k = 1 - Math.exp(-ACCEL * dt);
  body.vx += (wishX * speed - body.vx) * k;
  body.vz += (wishZ * speed - body.vz) * k;

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
  body.landed = false;
  if (!body.air && jump && dt > 0) { body.air = true; body.vy = JUMP_SPEED; }
  if (body.air) {
    body.vy -= GRAVITY * dt;
    body.y += body.vy * dt;
    if (body.y <= gy && body.vy <= 0) { body.y = gy; body.vy = 0; body.air = false; body.landed = true; }
  } else body.y += (gy - body.y) * (1 - Math.exp(-18 * dt));
  return body;
}
