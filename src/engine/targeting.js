// Picks the ONE thing the player may interact with right now: within reach, roughly in front of
// the eye, and not hidden behind a wall or a person. Pure (no three.js), unit-tested in node.

// Collider tags tall enough to hide something at chest / head height. Low things (railings,
// benches, planters, parked cars, the stall cabinet) and thin posts don't block a glance.
export const BLOCKING_TAGS = new Set(['customs', 'hsbc', 'north-block', 'portico', 'hsbc-centre', 'wall', 'lion', 'npc', 'door', 'hoarding']);

// Does the XZ segment a->b cross the box? (slab test, ignoring the last `endTrim` metres)
export function segmentHitsBox(ax, az, bx, bz, box, endTrim = 0.25) {
  const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz);
  if (len < 1e-6) return false;
  const tMax = Math.max(0, 1 - endTrim / len);
  let t0 = 0, t1 = tMax;
  for (const [o, d, lo, hi] of [[ax, dx, box.minX, box.maxX], [az, dz, box.minZ, box.maxZ]]) {
    if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) return false; continue; }
    let a = (lo - o) / d, b = (hi - o) / d;
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, b);
    if (t0 > t1) return false;
  }
  return true;
}

/**
 * eye {x,y,z}, dir {x,y,z} (unit view direction)
 * candidates [{ id, x, y, z, reach, cone (cos of half-angle), ignore? (collider ids to skip), anyHeight? }]
 * colliders [{ minX, maxX, minZ, maxZ, tag, id?, y0?, y1? }]
 * Returns { id, dist, cos } for the single best visible candidate, or null.
 */
export function pickTarget(eye, dir, candidates, colliders = [], { blocks = (c) => BLOCKING_TAGS.has(c.tag) } = {}) {
  let best = null, bestScore = Infinity;
  for (const c of candidates) {
    const vx = c.x - eye.x, vy = c.y - eye.y, vz = c.z - eye.z, dist = Math.hypot(vx, vy, vz);
    if (dist > c.reach || dist < 1e-6) continue;
    if (!c.anyHeight && Math.abs(vy) > 2.4) continue;                             // a different level (deck vs street); anyHeight: things you look up at
    const cos = (vx * dir.x + vy * dir.y + vz * dir.z) / dist;
    if (cos < c.cone) continue;
    let hidden = false;
    for (const b of colliders) {
      if (!blocks(b) || (c.ignore && b.id && c.ignore.includes(b.id))) continue;
      if (b.y1 !== undefined && (eye.y > b.y1 + 0.3 || eye.y < b.y0)) continue;   // furniture on another floor
      if (segmentHitsBox(eye.x, eye.z, c.x, c.z, b)) { hidden = true; break; }
    }
    if (hidden) continue;
    // mostly "what am I looking at", a little "what is nearest"
    const score = (1 - cos) / (1 - c.cone) + 0.35 * (dist / c.reach);
    if (score < bestScore) { bestScore = score; best = { id: c.id, dist, cos }; }
  }
  return best;
}
