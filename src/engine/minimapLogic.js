// When the minimap is on screen: pure, node-tested. It should be there when it helps (a mission
// with somewhere to go, a new place, finding your way) and gone when it doesn't (talking, reading,
// standing taking in the view).
//   update(s, dt, ctx) with ctx = { mode, moving, objective, zone, held }
//     mode: 'play' | 'dialogue' | 'inspect' | 'pause' | 'entry' | 'pouch'
//     moving: the player is walking; objective: a mission target exists; zone: a named area id;
//     held: the player is holding the map key
export const MAP = { idleHide: 5, zoneShow: 7, settle: 1.2 };

export function createMinimapState() { return { shown: false, idle: 0, zone: null, zoneFor: 0, since: 0 }; }

export function updateMinimap(s, dt, { mode = 'play', moving = false, objective = false, zone = null, held = false } = {}) {
  s.idle = moving ? 0 : s.idle + dt;
  if (zone !== s.zone) { if (s.zone !== null) s.zoneFor = MAP.zoneShow; s.zone = zone; }
  s.zoneFor = Math.max(0, s.zoneFor - dt);
  let want;
  if (mode !== 'play') want = false;                                     // talking, reading, paused: out of the way
  else if (held) want = true;
  else if (s.zoneFor > 0) want = true;                                   // just arrived somewhere new
  else if (objective && (moving || s.idle < MAP.idleHide)) want = true;  // on the way to something
  else want = moving && s.idle < 0.5 && s.shown;                          // keep it while you keep walking
  // a short hysteresis so a step's pause doesn't make it flicker
  s.since += dt;
  if (want !== s.shown && (s.since > MAP.settle || mode !== 'play' || held)) { s.shown = want; s.since = 0; }
  return s;
}

// Coarse named areas, for "you've arrived somewhere"
export function zoneAt(x, z, L) {
  if (x >= L.wallX) return 'promenade';
  if (x < -480 && x > -530 && z > -212 && z < -207 && x > -530) { if ((x > -494.5 && x < -483) || (x > -528 && x < -516.5)) return 'metro'; }
  if (x < -496 && x > -514) return 'henan';
  if (x < L.facadeX && z > -212.5 && z < -189.5) return 'nanjing';
  if (x < L.westCurbX - 6 && Math.abs(z) < L.street.halfW + 0.5) return 'hankou';
  if (x < L.facadeX + 2 && z > 17 && z < 36) return 'customs';
  return 'zhongshan';
}
