// The Bund - Lujiazui ferry (金陵东路 → 东昌路 轮渡, the cross-river ferry Shanghai people actually take):
// pure, node-tested. In the game it leaves from the cruise pier on the promenade and lands you by West
// Lujiazui Road, a short walk from the roundabout. Times are game minutes past midnight.
// The real crossing runs from early morning to late evening every 10-20 minutes for ¥2; these figures
// are rounded (approximate), not a timetable.
export const FERRY = { first: 6 * 60, last: 23 * 60, every: 15, crossing: 8, fare: 2 };

// the next departure at or after `minute` (today), or null once the last has gone
export function nextFerry(minute) {
  if (minute <= FERRY.first) return FERRY.first;
  const k = Math.ceil((minute - FERRY.first) / FERRY.every), t = FERRY.first + k * FERRY.every;
  return t <= FERRY.last ? t : null;
}
export const ferryRunning = (minute) => nextFerry(minute) !== null;
