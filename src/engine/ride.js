// Your DiDi ride (滴滴快车), from tapping the app to getting out: pure, node-tested. The talk is
// engine/smallTalk.js; the drivers are world/drivers.js; the car itself is driven in the world
// (world/didi.js), which tells this module how far away it is and whether it has stopped.
//
//   matching   looking for a driver (a few seconds)
//   coming     a driver accepted: name, car, plate, ETA; the car works its way up Zhongshan Road
//   waiting    at the kerb with its hazards on. Free waiting is 5 minutes; the driver messages you
//              when they arrive and again if you're not there; at 8 minutes they cancel and the
//              app charges the no-show fee
//   riding     in the back seat. The driver talks, or doesn't; things happen on the road
//   arrived    the fare is charged; what you heard on the way stays with you
// Times are game minutes on the life clock (engine/life.js), so a ride costs the time it takes.
import { stamp, pay, post, thread, emit } from './life.js';
import { createTalk, stepTalk, answer, heard, roadEvent } from './smallTalk.js';

export const RIDE_RULES = { freeWait: 5, cancelAt: 8, noShowFee: 8, matchSecs: [3, 9] };

// where you can go: real places, real-ish road distances from the Bund at Hankou Road
export const DESTINATIONS = [
  { id: 'northbund', zh: '北外滩 白玉兰广场', en: 'North Bund, Sinar Mas Plaza', km: 2.6, mins: 11, invite: 'yinuo-flat' },
  { id: 'lujiazui', zh: '陆家嘴 国金中心', en: 'Lujiazui, IFC', km: 4.8, mins: 16, invite: ['xuan-arm', 'xuan-demo'], walkIn: true },   // you get out at IFC's kerb (world/lujiazui.js)
  { id: 'jingan', zh: '静安 嘉里中心', en: "Jing'an Kerry Centre", km: 5.9, mins: 22 },
  { id: 'xintiandi', zh: '新天地', en: 'Xintiandi', km: 3.4, mins: 14 },
  { id: 'tianma', zh: '天马赛车场', en: 'Tianma Circuit', km: 41, mins: 55, invite: 'zhixia-track' },
  { id: 'heliport', zh: '浦东 · 直升机停机坪', en: 'Pudong heliport', km: 9.5, mins: 24, invite: 'yinuo-heli' },
  { id: 'yangpu', zh: '杨浦滨江 · 创客空间', en: 'Yangpu riverside makerspace', km: 6.8, mins: 22, walkIn: true },
];
export const dest = (id) => DESTINATIONS.find((d) => d.id === id);

// DiDi Express in Shanghai, roughly: a starting fare that covers the first 3 km, then per km and
// per minute, more at night (23:00-05:00)
export function fare(d, minute = 18 * 60) {
  const night = minute >= 23 * 60 || minute < 5 * 60;
  const base = night ? 18 : 14, perKm = night ? 3.1 : 2.6, perMin = 0.5;
  return Math.round((base + Math.max(0, d.km - 3) * perKm + d.mins * perMin) * 10) / 10;
}

// matching: a driver you haven't just had, unless there's nobody else
export function pickDriver(drivers, last, rnd = Math.random) {
  const pool = drivers.filter((d) => d.id !== last);
  return pool[Math.floor(rnd() * pool.length)] || drivers[0];
}

export function requestRide(L, { to, drivers, rnd = Math.random, method = 'wechat' }) {
  const d = dest(to); if (!d) return null;
  const R = {
    phase: 'matching', to, quote: fare(d, L.clock.minute), method, t: 0,
    match: RIDE_RULES.matchSecs[0] + rnd() * (RIDE_RULES.matchSecs[1] - RIDE_RULES.matchSecs[0]),
    driver: null, eta: 0, arrivedAt: null, boardedAt: null, reminded: false, talk: null, lines: [], events: [], rnd, drivers,
  };
  L.flags.ride = { to, phase: 'matching' };
  return R;
}

const say = (L, text) => { thread(L, 'didi', { title: '快马出行', members: ['me', 'didi'], kind: 'service' }); post(L, 'didi', { from: 'didi', kind: 'text', text }); };

// world: { carDist (m to the pickup), carStopped (at the kerb), boarded (you're in) }
export function stepRide(L, R, dt, world = {}) {
  R.t += dt; const now = stamp(L), ev = (e) => R.events.push(e);
  switch (R.phase) {
    case 'matching':
      if (R.t >= R.match) {
        R.driver = pickDriver(R.drivers, L.flags.lastDriver, R.rnd);
        R.phase = 'coming'; L.flags.ride.phase = 'coming'; L.flags.lastDriver = R.driver.id;
        say(L, `司机已接单：${R.driver.name} · ${R.driver.plate}`);
        ev({ type: 'accepted', driver: R.driver.id });
      }
      break;
    case 'coming':
      if (world.carStopped) {
        R.phase = 'waiting'; R.arrivedAt = now; L.flags.ride.phase = 'waiting';
        say(L, `司机已到达上车点，请尽快上车（${R.driver.plate}）`);
        ev({ type: 'arrived' });
      }
      break;
    case 'waiting': {
      const waited = now - R.arrivedAt;
      if (world.boarded) {
        R.phase = 'riding'; R.boardedAt = now; L.flags.ride.phase = 'riding';
        R.talk = createTalk({ ...R.driver, topics: Object.keys(R.driver.topics) }, R.rnd);   // the talk engine wants topic names
        ev({ type: 'boarded', fee: waited > RIDE_RULES.freeWait });
        break;
      }
      if (!R.reminded && waited >= RIDE_RULES.freeWait - 1) {
        R.reminded = true;
        post(L, 'didi', { from: 'didi', kind: 'text', text: '师傅：到了哈，我在路边打着双闪，你快点哦，这里不让停。' });
        ev({ type: 'reminded' });
      }
      if (waited >= RIDE_RULES.cancelAt) {
        R.phase = 'cancelled'; L.flags.ride = null;
        pay(L, { method: R.method, amount: RIDE_RULES.noShowFee, to: '快马出行', memo: '司机等待超时 取消费', kind: 'ride' });
        say(L, `乘客未上车，订单已取消，收取取消费 ¥${RIDE_RULES.noShowFee}`);
        ev({ type: 'cancelled' });
      }
      break;
    }
    case 'riding': {
      const line = stepTalk(R.talk, dt);
      if (line) { R.lines.push(line); ev({ type: 'line', line }); }
      break;
    }
  }
  return R;
}

// the driver's line, as text (folding the aside in when there is one)
export function lineText(R, line) {
  if (line.aside) return R.driver.asides.find((a) => a.id === line.aside).line;
  const pool = R.driver.topics[line.topic] || [];
  const used = new Set(R.lines.filter((l) => l !== line && !l.aside && l.topic === line.topic).map((l) => l.text));
  const fresh = pool.filter((s) => !used.has(s));
  line.text = (fresh.length ? fresh : pool)[line.beat % Math.max(1, (fresh.length ? fresh : pool).length)];
  return line.text;
}

// you answer (or don't): 'engage' | 'short' | 'change' | 'ignore'
export function reply(R, how) { if (R.talk) answer(R.talk, how); }

// something happened on the road; returns the outburst { kind, severity } or null
export function onRoad(R, kind, brake, temper) { return R.talk ? roadEvent(R.talk, { kind, brake }, temper) : null; }

// you've arrived: pay, keep what you heard, tell the world
export function arrive(L, R) {
  if (R.phase !== 'riding') return null;
  const d = dest(R.to), extra = R.boardedAt - R.arrivedAt > RIDE_RULES.freeWait ? 2 : 0;
  const amount = Math.round((R.quote + extra) * 10) / 10;
  const p = pay(L, { method: R.method, amount, to: '快马出行', memo: `快车 → ${d.zh}`, kind: 'ride' });
  if (p.ok) p.entry.memoEn = `Kuaima Express to ${d.en}`;
  const got = heard(R.talk);
  L.flags.heard = [...new Set([...(L.flags.heard || []), ...got.map((h) => h.id)])];
  (L.flags.rides ||= []).push({ to: R.to, driver: R.driver.id, at: stamp(L), fare: amount, heard: got.map((h) => h.id), talked: R.talk.warmth > 0.5 });
  R.phase = 'arrived'; L.flags.ride = null;
  say(L, `行程结束，已支付 ¥${amount}。感谢乘坐，请为${R.driver.name}评价`);
  emit(L, { type: 'arrived', to: R.to, invite: d.invite || null });
  return { amount, heard: got, paid: p.ok };
}
