// Things on the street worth a look (a supercar at the kerb): pure, node-tested.
// People notice a sight once as they come up to it, and decide then, by who they are:
//   most take a look: they slow a little and their head follows it as they pass
//   some stop for a photo: a few metres off, turned to face it, phone up and sideways, a couple of
//   seconds, sometimes with the flash; then they walk on
// Older people mostly just look; young men, students and visitors are the ones with the phones out.
// Having walked well away (or having been about their business a minute and a half and come back),
// they can notice it again (less likely to stop twice).
export const INTEREST = {
  youngMan: { look: 0.9, photo: 0.45 }, student: { look: 0.9, photo: 0.5 }, visitor: { look: 0.95, photo: 0.6 },
  office: { look: 0.7, photo: 0.18 }, elder: { look: 0.65, photo: 0.03 }, auntie: { look: 0.75, photo: 0.07 },
};
export const SIGHT = { notice: 13, photoNear: 3.2, photoFar: 6.5, forget: 30, again: 90, flashChance: 0.35 };

// sight: { id, x, z }; p: a pedestrian from engine/traffic.js (x, z, vx, vz, persona, pause, faceTo ...)
// returns what changed: 'noticed' | 'photo' | null. Sets p.gaze (head target while walking) and, for a
// photo, p.pause / p.faceTo / p.faceFor / p.photo { t, dur, flashAt }.
export function noticeSights(p, sights, dt, rng = Math.random) {
  p.sightMemo ||= {};
  p.gaze = null;
  p.sightClock = (p.sightClock || 0) + dt;
  if (p.photo) {                                                    // mid-photo: the pause runs it
    p.photo.t += dt;
    if (p.photo.t >= p.photo.dur || p.pause <= 0) { p.photo = null; p.faceTo = null; }
    return null;
  }
  let changed = null;
  for (const s of sights) {
    const dx = s.x - p.x, dz = s.z - p.z, d = Math.hypot(dx, dz), m = p.sightMemo[s.id];
    if (d > SIGHT.forget || (m && d > 10 && p.sightClock - m.at > SIGHT.again)) { if (m) m.away = true; if (d > SIGHT.forget) continue; }
    const sp = Math.hypot(p.vx, p.vz), ahead = sp < 0.1 ? 1 : (dx * p.vx + dz * p.vz) / (d * sp);
    if (!m || m.away) {
      if (d < SIGHT.notice && ahead > -0.1) {
        const k = INTEREST[p.persona] || INTEREST.office, again = m ? 0.35 : 1;
        p.sightMemo[s.id] = { look: rng() < k.look, photo: rng() < k.photo * again, taken: false, away: false, at: p.sightClock };
        changed = 'noticed';
      }
      continue;
    }
    if (!m.look || d > SIGHT.notice) continue;
    p.gaze = [s.x, s.z];
    if (m.photo && !m.taken && d < SIGHT.photoFar && d > SIGHT.photoNear) {
      m.taken = true;
      const dur = 2.6 + rng() * 2.2;
      p.pause = dur; p.faceTo = [s.x, s.z]; p.faceFor = dur; p.phoneWalk = false;
      p.photo = { t: 0, dur, flashAt: rng() < SIGHT.flashChance ? dur * (0.5 + rng() * 0.25) : -1, of: s.id };
      changed = 'photo';
    }
  }
  return changed;
}

// speed while passing something worth a look: a little slower, head turned
export const gawkSpeed = (p) => (p.gaze ? 0.82 : 1);
