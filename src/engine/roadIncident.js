// People and your car: who gets out of the way, what they make of it, and what it costs. Pure (no
// three.js, no DOM), node-tested (tests/roadIncident.test.mjs); world/roadReactions.js puts it in the
// street (the dodges, the shouts, the horns, the onlookers, the officer).
//
// People see a car coming and get out of its way. Someone in the car's path, when it is less than
// ~2.5 s off and near enough to be noticed (30 m; eyes on a phone: 18 m; an older person: slower, so
// sooner), steps or jumps aside. Below HIT_KMH they always make it (the car is never stopped by someone stepping out
// of its way); above it they make it only if the time they need (reaction + the step) is less than
// the time they have. So the car only touches someone when it is going really fast (someone on a
// phone from ~45 km/h, an older person from ~40, anyone else from ~85), or creeps into someone who
// couldn't move.
//
// Tiers (what it comes to):
//   glare    they stepped aside in good time: a look, nothing said
//   startle  a close call, not slowing (10+ km/h) for someone on the zebra, or a touch below 8 km/h:
//            a jump back, a shout
//   scare    passing within ~2 s at 22+ km/h (12+ through a crowded zebra), or a touch at 8-30 km/h:
//            jumps, shouts, horns behind you, a passer-by who says they'll report you (a warning on
//            the record); on the zebra the camera there issues a ticket (¥200, 3 points)
//   hit      a touch at 30+ km/h by someone who couldn't get clear: they go down (and sit, shaken),
//            people gather and film, a witness calls it in, and a traffic officer comes on foot. The
//            driving stops for the day, there is a fine, points, the pedestrian's costs, the tow
// Numbers follow Chinese road law as applied in Shanghai: failing to yield at a crossing ¥200 and
// 3 points; speeding 10-20% over ¥200 and 1 point, 20-50% ¥200 and 6, 50%+ ¥1,500 and 12. The Bund's
// road is a 50 km/h road.
import { pay, stamp } from './life.js';
import { rep, fact, isYear } from './year.js';

export const ROAD = {
  look: 2.5, lookElder: 3.2,         // s: someone in the car's path moves once it's this close in time
  notice: 30, noticePhone: 18, noticeElder: 22,     // m: how far off they see it coming
  react: 0.55, reactPhone: 0.85, reactElder: 0.8,   // s before the first step
  jump: 2.6, jumpElder: 1.5,                        // m/s: the step / jump aside
  lunge: 6,                          // m/s: the most anyone moves, startled close up
  margin: 0.45,                      // m of air they leave between themselves and the car's side
  body: 0.3,                         // m: a person's radius
  hitKmh: 30,                        // below this nobody is ever hit: they always get out of the way
  touchSlow: 8,                      // km/h: a touch below this is a nudge (a startle)
  startleKmh: 4, zebraStartleKmh: 10, scareKmh: 22, scareZebraKmh: 12, crowded: 3,
  closeCall: 1.2,                    // s: dodging with less time than this is a close call
  limit: 50,                         // km/h on Zhongshan East 1st Road
  policeAfter: 9,                    // s after a hit before the officer turns up (he's at Hankou Road)
};
export const kmhOf = (v) => Math.abs(v) * 3.6;

// Someone at `ahead` metres along the car's direction of travel (from its centre) and `side` metres
// to its left, the car at `v` m/s (its speed, whichever way it's going). kind: 'phone' | 'elder' | null.
// -> null (not in the way, or not yet), or { ttc, gap, need, dir, clearIn, speed, react, makes, close }
//    dir: +1 step to the car's left, -1 to its right; speed: how fast they go aside (m/s)
export function dodgePlan({ ahead, side, v, halfLen = 2.23, halfW = 0.97, kind = null, pref = 0 }) {
  const sp = Math.abs(v); if (sp < 0.3) return null;
  const R = ROAD, gap = ahead - halfLen - R.body;
  if (gap < -0.2) return null;                                          // alongside or behind
  const clear = halfW + R.margin + R.body;
  if (Math.abs(side) >= clear) return null;                             // not in its path
  const ttc = Math.max(0, gap) / sp;
  const notice = kind === 'phone' ? R.noticePhone : kind === 'elder' ? R.noticeElder : R.notice;
  if (gap > notice || ttc > (kind === 'elder' ? R.lookElder : R.look)) return null;
  const dir = Math.abs(side) > 0.05 ? Math.sign(side) : (pref || 1);
  const need = clear - Math.abs(side) + 0.15;
  let react = kind === 'phone' ? R.reactPhone : kind === 'elder' ? R.reactElder : R.react;
  let speed = kind === 'elder' ? R.jumpElder : R.jump;
  const clearIn = react + need / speed;
  const slow = kmhOf(sp) < R.hitKmh, makes = slow || clearIn < ttc;
  // below the hit speed they always make it: startled close up, they move at once and fast
  if (slow && clearIn >= ttc) { react = Math.min(react, Math.max(0, ttc * 0.25)); speed = Math.min(R.lunge, Math.max(speed, need / Math.max(0.15, ttc - react))); }
  return { ttc, gap, need, dir, clearIn, speed, react, makes, close: ttc < R.closeCall };
}

// what a moment comes to: contact (the car touched them) or a dodge; crowded: people on the zebra
export function classify({ contact = false, kmh = 0, crowded = 0, close = false, zebra = false }) {
  const R = ROAD;
  if (contact) return kmh >= R.hitKmh ? 'hit' : kmh >= R.touchSlow ? 'scare' : 'startle';
  if (kmh >= R.scareKmh || (zebra && crowded >= R.crowded && kmh >= R.scareZebraKmh)) return 'scare';
  if (kmh >= R.startleKmh && close) return 'startle';
  if (zebra && kmh >= R.zebraStartleKmh) return 'startle';                // not slowing for someone on the zebra
  return 'glare';
}
export const TIER_RANK = { glare: 0, startle: 1, scare: 2, hit: 3 };

// the speeding part of a fine: [yuan, points]
export function speeding(kmh, limit = ROAD.limit) {
  const over = kmh / limit - 1;
  if (over >= 0.5) return [1500, 12];
  if (over >= 0.2) return [200, 6];
  if (over >= 0.1) return [200, 1];
  return [0, 0];
}
// what a tier costs: { fine, points, comp (the pedestrian's costs), tow, total, suspend (driving
// stopped until the next morning), ticket (a camera ticket) }
export function consequence(tier, { kmh = 0, zebra = true, limit = ROAD.limit } = {}) {
  const out = { fine: 0, points: 0, comp: 0, tow: 0, total: 0, suspend: false, ticket: false, police: false, report: false };
  if (tier === 'hit') {
    const [sf, sp] = speeding(kmh, limit);
    out.fine = 200 + sf; out.points = Math.min(12, 3 + sp);
    out.comp = Math.min(6000, 1800 + Math.max(0, Math.round(kmh - ROAD.hitKmh)) * 60);
    out.tow = 200; out.suspend = true; out.police = true; out.report = true;
  } else if (tier === 'scare') {
    out.report = true;
    if (zebra && kmh >= ROAD.scareZebraKmh) { out.fine = 200; out.points = 3; out.ticket = true; }
  }
  out.total = out.fine + out.comp + out.tow;
  return out;
}

// pay from WeChat, then Alipay, then the bank
export function payAny(L, amount, to, memo, memoEn, kind = 'fine') {
  for (const method of ['wechat', 'alipay', 'bank']) {
    const r = pay(L, { method, amount, to, memo, kind });
    if (r.ok) { r.entry.memoEn = memoEn; return r; }
  }
  return { ok: false };
}

// the next morning at 8, in absolute minutes
export const nextMorning = (L) => (L.clock.day + 1) * 1440 + 8 * 60;
export function drivingSuspended(L) { const f = L.flags.carHold; return !!(f && stamp(L) < f.until); }

// Put a moment on the record: the money, the flags, the reputation, the facts. Returns what was
// applied ({ ...consequence, paid, ticketed, warned }). info: { kmh, zebra, filmed, where }
export function applyIncident(L, tier, { kmh = 0, zebra = true, filmed = false, where = 'Zhongshan East 1st Road at Hankou Road' } = {}) {
  const F = L.flags, now = stamp(L), c = consequence(tier, { kmh, zebra });
  const res = { ...c, tier, paid: 0, ticketed: false, warned: false };
  if (tier === 'glare' || tier === 'startle') return res;
  (F.carIncidents ||= []).push({ at: now, day: L.clock.day, tier, kmh: Math.round(kmh), zebra: !!zebra });
  if (F.carIncidents.length > 20) F.carIncidents.shift();
  if (tier === 'scare') {
    F.carWarnings = (F.carWarnings || 0) + 1; res.warned = true;
    // the crossing's camera: one ticket at a time (a second within two hours is the same notice)
    if (c.ticket && !(F.carTicketAt && now - F.carTicketAt < 120)) {
      const r = payAny(L, c.fine, '交管12123', '未礼让行人 罚款', 'Failing to yield to pedestrians: fine');
      if (r.ok) { res.paid += c.fine; F.carTicketAt = now; F.carPoints = (F.carPoints || 0) + c.points; res.ticketed = true; }
    }
    if (isYear(L)) { rep(L, 'street', -2, 'drove too fast through people at the Bund crossing'); fact(L, 'car', { tier, kmh: Math.round(kmh), where }); }
    return res;
  }
  // a hit
  const a = payAny(L, c.fine + c.tow, '上海市公安局交通警察总队', `交通事故 罚款 ${c.fine} + 拖车费 ${c.tow}`, `Traffic accident: fine ¥${c.fine} + tow ¥${c.tow}`);
  const b = payAny(L, c.comp, '行人（医药费）', '医药费 · 误工费', "The pedestrian's medical check and lost time", 'transfer');
  res.paid = (a.ok ? c.fine + c.tow : 0) + (b.ok ? c.comp : 0);
  F.carPoints = (F.carPoints || 0) + c.points;
  F.carHold = { until: nextMorning(L), why: 'accident' };
  F.carHits = (F.carHits || 0) + 1;
  if (isYear(L)) {
    rep(L, 'street', -10, 'knocked down a pedestrian on the zebra on the Bund in his Lamborghini');
    if (filmed) rep(L, 'online', -6, 'filmed by onlookers after hitting a pedestrian on the Bund');
    fact(L, 'car', { tier, kmh: Math.round(kmh), where, filmed: !!filmed, fine: c.fine, points: c.points });
  }
  return res;
}

// a line for whoever he talks to, if it has happened (empty otherwise)
export function incidentText(L) {
  const F = L.flags || {};
  if (F.carHits) return `He knocked down a pedestrian on the zebra on the Bund in his Lamborghini (they were shaken, not badly hurt); the traffic police fined him and he has ${F.carPoints || 0} points on his licence.`;
  if (F.carWarnings) return 'He has frightened pedestrians on the Bund crossing by driving his Lamborghini too fast; someone said they would report him.';
  return '';
}

// ---- who reacts ----
// the nearest `n` of `list` ([{ x, z, ... }]) within `r` of (x, z), skipping `skip`
export function nearest(list, x, z, { n = 4, r = 20, skip = null } = {}) {
  return list.filter((p) => p !== skip && Math.hypot(p.x - x, p.z - z) <= r).sort((p, q) => Math.hypot(p.x - x, p.z - z) - Math.hypot(q.x - x, q.z - z)).slice(0, n);
}
// Cars that honk: the one or two nearest (behind you, waiting), with a beat before each
// vehicles: [{ x, z, active, hidden }]; -> [{ v, delay, level }]
export function honkers(vehicles, x, z, { n = 2, r = 40, rnd = Math.random } = {}) {
  const near = vehicles.filter((v) => v.active !== false && !v.hidden && Math.hypot(v.x - x, v.z - z) <= r)
    .sort((p, q) => Math.hypot(p.x - x, p.z - z) - Math.hypot(q.x - x, q.z - z)).slice(0, n);
  let t = 0.5 + rnd() * 0.5;
  return near.map((v) => { const d = Math.hypot(v.x - x, v.z - z), out = { v, delay: t, level: Math.max(0.25, Math.min(1, 1.15 - d / r)) }; t += 0.7 + rnd() * 1.1; return out; });
}
// Onlookers for a hit: up to `n` people near enough, about half of them filming (whoever has a phone
// out first). people: [{ x, z, phone? }] -> [{ p, x, z, film }] with a spot each round (x, z) at
// 2.5-4.5 m, spread round the side they came from
export function gatherSpots(people, x, z, { n = 6, r = 26, rnd = Math.random } = {}) {
  const pick = nearest(people, x, z, { n, r });
  let films = 0;
  return pick.map((p, i) => {
    const a = Math.atan2(p.x - x, p.z - z) + (rnd() - 0.5) * 0.8, d = 2.6 + rnd() * 1.8;
    const film = !!p.phone || (films < Math.ceil(n / 2) && (i % 2 === 0));
    if (film) films++;
    return { p, x: x + Math.sin(a) * d, z: z + Math.cos(a) * d, film };
  });
}

// ---- what people say ----
// [who, zh, en] lines (tools/voice/extract.mjs picks these up for the recorded voices). Shanghainese
// ({ wuu }) is subtitles only, as in world/barks.js.
export const LINES = {
  // jumping out of the way of a car that came too close
  startle: {
    office: [['passerby', '看着点！会不会开车啊！', 'Watch it! Can you even drive?'], ['passerby', '哎！慢点开！', 'Hey! Slow down!'], ['passerby', '有病吧，开这么近。', "Are you crazy? That close?"]],
    youngMan: [['passerby', '要死啊！', 'You trying to kill someone?'], ['passerby', '兄弟，看路！', 'Mate, watch the road!'], ['passerby', '开个跑车了不起啊？', 'Think a supercar makes you special?']],
    student: [['passerby', '吓死我了！', 'You scared me to death!'], ['passerby', '你没看到人啊？', "Didn't you see me?"]],
    elder: [['passerby', '慢点慢点！年纪轻轻开这么冲。', 'Slow down, slow down! So young, driving like that.'], ['passerby', '哎哟，吓我一跳。', 'Aiyo, you made me jump.']],
    auntie: [{ wuu: '要死快了！侬眼睛生勒啥地方啦？', gloss: '找死啊！你眼睛长在哪里？', en: 'Want to get someone killed? Where are your eyes?' }, { wuu: '开慢点呀！吓煞人了！', gloss: '开慢点啊！吓死人了！', en: 'Slow down! You scared me half to death!' }],
    visitor: [{ t: 'Whoa! Watch it!', zh: '哇！小心点！' }, { t: 'Hey! Slow down!', zh: '嘿！慢点！' }],
  },
  // a close one at speed: angrier, and someone says they'll report it
  scare: {
    office: [['passerby', '斑马线啊！你开那么快干什么！', "It's a zebra crossing! What are you doing going that fast?"], ['passerby', '差一点就撞上了！', 'You nearly hit someone!']],
    youngMan: [['passerby', '你疯了吧！斑马线上飙车！', "Are you mad? Racing over a zebra!"], ['passerby', '有钱了不起啊！慢点开！', 'Money makes you special? Slow down!']],
    student: [['passerby', '太吓人了，差点撞到人！', 'That was terrifying, you almost hit someone!']],
    elder: [['passerby', '作孽啊，开这么快，要出人命的！', "Shameful, driving that fast. Someone's going to get killed!"]],
    auntie: [{ wuu: '侬作死啊！斑马线浪向开噶快！', gloss: '你找死啊！斑马线上开这么快！', en: 'Have you lost your mind? That fast over a zebra!' }],
    visitor: [{ t: "Jesus! You nearly hit us!", zh: '天哪！你差点撞到我们！' }],
  },
  report: [['witness', '车牌我拍下来了，我要举报你。', "I've got your plate on video. I'm reporting you."], ['witness', '这种人就该让交警管管。我打12123举报。', 'People like you need the traffic police. I’m reporting it.'], ['witness', '拍下来了，等着吃罚单吧。', "Got it on camera. Expect a ticket."]],
  // after a hit
  hitShout: [['witness', '撞人了！撞人了！', "He's hit someone! He's hit someone!"], ['witness', '哎呀！撞到人了！', "Oh no! Someone's been hit!"]],
  victim: [['victim', '哎哟……我……我没事吧……', "Ow... I... am I all right..."], ['victim', '腿……腿磕了一下……', 'My leg... I banged my leg...'], ['victim', '吓死我了……', 'That scared the life out of me...']],
  witness: [['witness', '斑马线上开这么快，你眼睛长哪里去了！', 'That fast on a zebra crossing? Where were your eyes?'], ['witness', '先别动人，看看有没有事。', "Don't move them yet. See if they're hurt."], ['witness', '人还在斑马线上，你就冲过来了！', 'They were still on the crossing and you came straight at them!']],
  call: [['witness', '喂，110吗？外滩中山东一路汉口路这里，斑马线上撞人了。', "Hello, 110? Zhongshan East 1st Road at Hankou Road, on the Bund. Someone's been hit on the zebra crossing."], ['witness', '我已经报警了，你别想走。', "I've called the police. Don't even think about leaving."]],
  filming: [['onlooker', '拍下来，都拍下来。', 'Film it, film it all.'], ['onlooker', '兰博基尼撞人了……', 'A Lamborghini hit someone...']],
  cop: [
    ['cop', '谁的车？', 'Whose car is this?'],
    ['cop', '人怎么样？要不要叫120？', 'How is the pedestrian? Do we need an ambulance?'],
  ],
  victimOk: [['victim', '不用不用……就是腿磕了一下，吓坏了。', "No, no need... just banged my leg. It gave me a fright."]],
  copAfter: [
    ['cop', '还是去医院查一下，医药费你出。', "Get it checked at the hospital anyway. You're paying."],
    ['cop', '斑马线不让行人，还开这么快。驾驶证给我。', "Not yielding at a crossing, and that speed. Your licence."],
    ['cop', '车靠边，今天不能再开了。罚单在12123上处理。', "The car goes to the kerb. You're not driving again today. Deal with the ticket on 12123."],
  ],
  disperse: [['cop', '好了，都散了吧，别堵在路上。', "All right, move along, everyone. Don't block the road."]],
};
const T = (zh, en) => ({ zh, en });
// one line for a tier and a kind of person -> { who, zh, en, lang, gloss, text } (or null)
export function lineFor(pool, rnd = Math.random) {
  if (!pool || !pool.length) return null;
  const l = pool[Math.floor(rnd() * pool.length) % pool.length];
  if (Array.isArray(l)) return { who: l[0], zh: l[1], en: l[2], lang: 'zh', gloss: null, text: l[1] };
  if (l.wuu) return { who: 'auntie', zh: l.wuu, en: l.en, lang: 'wuu', gloss: l.gloss, text: l.wuu };
  return { who: 'tourist', zh: l.zh, en: l.t, lang: 'en', gloss: null, text: l.t };
}
export function shoutFor(tier, persona, rnd = Math.random) {
  const set = LINES[tier === 'scare' ? 'scare' : 'startle'];
  return lineFor(set[persona] || set.office, rnd);
}
// what the screen says about a hit's consequences
export function summaryText(res) {
  const pts = res.points, f = res.fine, c = res.comp, tw = res.tow;
  return T(`交警处理：未礼让行人${f > 200 ? '、超速' : ''}，罚款 ¥${f}，记 ${pts} 分；拖车费 ¥${tw}；行人医药费、误工费 ¥${c.toLocaleString('en-US')}，都已付清。今天不能再开车了，车停在路边，明早 8 点后才能开。`,
    `The traffic police: failing to yield to a pedestrian${f > 200 ? ', and speeding' : ''}. Fine ¥${f}, ${pts} points; tow ¥${tw}; the pedestrian's medical check and lost time ¥${c.toLocaleString('en-US')}, all paid. No more driving today: the car stays at the kerb until 8 tomorrow morning.`);
}
