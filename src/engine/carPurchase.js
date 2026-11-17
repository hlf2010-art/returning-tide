// Buying a car the way it actually happens for someone like Ji Bai in Shanghai: pure, node-tested.
// Not a shop: a lead from a friend, a sales consultant on WeChat, a demo car brought to you (上门试驾,
// white-glove test drives are normal at this end of the market), a spec, a deposit, the money, the plate
// problem, delivery. Money is in-game money (engine/life.js), never anything real.
//   lead        Zhixia passes on a consultant's WeChat card (only if you were curious about cars)
//   contacted   you message the consultant; they offer to bring the demo car to the Bund
//   booked      a time is set; the car is waiting on Hankou Road at that time
//   viewed      you met them at the car (and maybe rode along the Bund with them)
//   specced     colour and interior chosen
//   deposit     定金 paid; the order is placed with the factory allocation
//   plate       how the car will be registered. Registration follows the owner's hukou, not where
//               the car was bought:
//                 auction  the Shanghai private-plate auction (沪牌). Without a Shanghai hukou you
//                          need a Shanghai residence permit and 36 months of continuous Shanghai
//                          social insurance or tax to bid; Ji Bai, a week back from San
//                          Francisco with a Nanjing hukou, has neither, so it's refused
//                 nanjing  a 苏A plate in Nanjing, where his hukou is: the dealer's agent does the
//                          out-of-town registration while the car runs on temporary plates; blue
//                          out-of-town plates are barred from Shanghai's elevated roads at rush hour
//                 (later: a plate in the name of a Shanghai company, if he founds one)
//   paid        the balance: in full by bank transfer, or dealer finance (30% down)
//   delivered   handed over on the Bund; it's yours (inventory + flags.car)
import { stamp, pay, post, thread, own, emit, balance } from './life.js';
import { dateOf } from './year.js';
// (quote() is used before its definition below: function declarations are hoisted)

export const CAR = { id: 'huracan', zh: '兰博基尼 Huracán LP610-4', en: 'Lamborghini Huracán LP610-4', price: 2_680_000, deposit: 200_000 };
export const COLOURS = [
  { id: 'giallo', zh: '迈达斯黄', en: 'Giallo Midas (yellow)', hex: 0xe8b40f },
  { id: 'nero', zh: '诺克提斯黑', en: 'Nero Noctis (black)', hex: 0x0d0d0f },
  { id: 'bianco', zh: '伊卡洛斯白', en: 'Bianco Icarus (white)', hex: 0xeceeef },
  { id: 'verde', zh: '曼提斯绿', en: 'Verde Mantis (green)', hex: 0x6fbf2a },
];
export const INTERIORS = [
  { id: 'nero', zh: '黑色 Alcantara', en: 'Black Alcantara' },
  { id: 'terra', zh: '赤陶棕皮革', en: 'Terracotta leather' },
];
export const PLATE = { auctionFee: 95_000, winRate: 0.12, tempDays: 15, nanjingDays: 3, socialMonths: 36 };
// can this person bid in the Shanghai private-plate auction? (Shanghai hukou, or a residence permit and
// 36 months of Shanghai social insurance / tax)
export const auctionEligible = (L) => !!(L.flags.shanghaiHukou || (L.flags.residencePermit && (L.flags.shSocialMonths || 0) >= PLATE.socialMonths));
export const FINANCE = { down: 0.3, months: 36, rate: 0.0399 };
export const CONSULTANT = { id: 'vivian', name: 'Vivian 陈', en: 'Vivian Chen' };

const say = (L, text, from = CONSULTANT.id) => { thread(L, CONSULTANT.id, { title: CONSULTANT.name, members: ['me', CONSULTANT.id], kind: 'person' }); post(L, CONSULTANT.id, { from, kind: 'text', text }, { notify: from !== 'me' }); };
const P = (L) => (L.flags.carBuy ||= { stage: 'none', log: [] });
const mark = (L, stage) => { const b = P(L); b.stage = stage; b.log.push({ stage, at: stamp(L) }); return b; };
// `days` calendar days after the moment `from` (absolute minutes), as the game's clock counts it. The
// clock counts playable days, and in a year game weeks can pass between two of them (engine/year.js),
// so "two weeks" is the first playable day on or after that date, not fourteen playable days on
// (which would put the delivery ten months away, near the end of the year)
const DAY_MS = 86400000, msOf = (L, day) => { const t = dateOf(L, day); return Date.UTC(t.y, t.m - 1, t.d); };
export function afterDays(L, from, days) {
  const d0 = Math.floor(from / 1440), want = msOf(L, d0) + days * DAY_MS;
  let d = d0; while (msOf(L, d) < want) d++;
  return d * 1440 + (from - d0 * 1440);
}

// Zhixia passes on the card (call when flags.carCurious is set)
export function lead(L) {
  const b = P(L); if (b.stage !== 'none') return false;
  mark(L, 'lead');
  post(L, 'zhixia', { from: 'zhixia', kind: 'text', text: '推给你，Vivian，人很实在，不会硬推销。你就说是我朋友。' });
  post(L, 'zhixia', { from: 'zhixia', kind: 'card', text: `[名片] ${CONSULTANT.name}`, meta: { contact: CONSULTANT.id } });
  return true;
}

// you message the consultant; they offer to bring the demo car to the Bund at `at` (absolute minutes)
export function contact(L, at) {
  const b = P(L); if (b.stage !== 'lead') return false;
  mark(L, 'contacted');
  say(L, '你好，我是知夏的朋友纪白，想了解一下 Huracán。', 'me');
  say(L, '纪先生您好！知夏跟我说过您～ 我们这边可以把试驾车开到您那边，外滩可以吗？');
  b.at = at;
  say(L, `那就${Math.floor(at / 60) % 24}点${String(at % 60).padStart(2, '0')}在汉口路，车停在路边，我在车旁边等您。`);
  mark(L, 'booked');
  emit(L, { type: 'car-appointment', at });
  return true;
}

// at the car: met (and maybe rode along the Bund)
export function view(L, { rode = false } = {}) {
  const b = P(L); if (b.stage !== 'booked') return false;
  b.rode = rode; mark(L, 'viewed');
  return true;
}

export function spec(L, { colour, interior }) {
  const b = P(L); if (b.stage !== 'viewed' && b.stage !== 'specced') return false;
  if (!COLOURS.find((c) => c.id === colour) || !INTERIORS.find((c) => c.id === interior)) return false;
  b.colour = colour; b.interior = interior; mark(L, 'specced');
  return true;
}

export function payDeposit(L) {
  const b = P(L); if (b.stage !== 'specced') return { ok: false, reason: 'stage' };
  const r = pay(L, { method: 'bank', amount: CAR.deposit, to: '兰博基尼上海', memo: `定金 ${CAR.zh}`, kind: 'car' });
  if (!r.ok) return r;
  r.entry.memoEn = `Deposit, ${CAR.en}`;
  mark(L, 'deposit'); b.orderedAt = stamp(L);
  say(L, '定金收到啦，合同我发您邮箱。配额已经帮您锁好，大概两周到店。');
  post(L, CONSULTANT.id, { from: CONSULTANT.id, kind: 'text', text: '上牌的话，车在哪儿买不影响，跟着户口走。您是南京户口，我们这边可以帮您代办苏A，车先挂临牌。', replies: [
    { text: '好，上苏A。', do: 'plate-nanjing' }, { text: '拍沪牌不行吗？', do: 'plate-auction' },
  ] });
  return { ok: true };
}

// how to register it
export function choosePlate(L, how, rnd = Math.random) {
  const b = P(L); if (b.stage !== 'deposit') return { ok: false, reason: 'stage' };
  if (how === 'auction' && !auctionEligible(L)) {
    post(L, CONSULTANT.id, { from: CONSULTANT.id, kind: 'text', text: '外地户口拍沪牌要有上海居住证，社保或个税连续满36个月。您刚回国，暂时还不够……以后在上海注册了公司，也可以用公司名义拍。这次先上苏A？', replies: [
      { text: '好，上苏A。', do: 'plate-nanjing' },
    ] });
    return { ok: false, reason: 'not-eligible' };
  }
  if (how === 'auction') {
    const r = pay(L, { method: 'bank', amount: PLATE.auctionFee, to: '上海国拍', memo: '沪牌拍卖 保证金及成交价', kind: 'car' });
    if (!r.ok) return r;
    r.entry.memoEn = 'Shanghai plate auction';
    b.plate = { how, won: rnd() < PLATE.winRate, tries: 1 };
    say(L, b.plate.won ? '恭喜！这个月的沪牌拍到了！' : '这个月没拍到……先给您办临牌，下个月我们再拍。');
  } else if (how === 'nanjing') {
    b.plate = { how, won: true };
    say(L, '好的，苏A我们的代办同事去南京办，交车前牌照就到。提醒您一下，外牌工作日早晚高峰不能上高架。');
    emit(L, { type: 'ask-dad', why: 'nanjing-plate' });
  } else return { ok: false, reason: 'how' };
  mark(L, 'plate');
  const q = quote('finance');
  post(L, CONSULTANT.id, { from: CONSULTANT.id, kind: 'text', text: `尾款${((CAR.price - CAR.deposit) / 10000).toFixed(0)}万，可以全款转账，也可以做金融，首付三成，月供${q.monthly.toLocaleString('en-US')}。`, replies: [
    { text: '全款。', do: 'pay-full' }, { text: '做金融吧。', do: 'pay-finance' },
  ] });
  return { ok: true, won: b.plate.won };
}

// what the balance would be, both ways
export function quote(how) {
  const rest = CAR.price - CAR.deposit;
  if (how === 'finance') {
    const down = Math.max(0, Math.round(CAR.price * FINANCE.down) - CAR.deposit), loan = CAR.price - CAR.deposit - down;
    const r = FINANCE.rate / 12, n = FINANCE.months, monthly = Math.round(loan * r / (1 - Math.pow(1 + r, -n)));
    return { now: down, loan, monthly, months: n };
  }
  return { now: rest };
}

export function payBalance(L, how = 'full') {
  const b = P(L); if (b.stage !== 'plate') return { ok: false, reason: 'stage' };
  const q = quote(how);
  if (balance(L, 'bank') < q.now) return { ok: false, reason: 'insufficient', need: q.now };
  const r = pay(L, { method: 'bank', amount: q.now, to: '兰博基尼上海', memo: how === 'finance' ? '首付（汽车金融）' : '尾款', kind: 'car' });
  if (!r.ok) return r;
  r.entry.memoEn = how === 'finance' ? 'Down payment (dealer finance)' : 'Balance';
  b.paid = { how, ...q }; mark(L, 'paid');
  b.deliverAt = Math.max(afterDays(L, stamp(L), 3), afterDays(L, b.orderedAt || stamp(L), 14));
  say(L, how === 'finance' ? `首付收到，金融合同签好了，月供 ¥${q.monthly.toLocaleString('en-US')}，${q.months}期。` : '尾款收到！我们准备交车～');
  return { ok: true, ...q };
}

// time passes: the auction runs monthly; delivery happens when it's due
export function stepPurchase(L, rnd = Math.random) {
  const b = P(L), now = stamp(L), ev = [];
  if (b.plate && b.plate.how === 'auction' && !b.plate.won && now >= (b.plate.nextAt ??= now + 30 * 1440)) {
    b.plate.tries++; b.plate.nextAt = now + 30 * 1440;
    if (rnd() < PLATE.winRate) { b.plate.won = true; say(L, '好消息，这次沪牌拍到了！'); ev.push('plate-won'); }
  }
  if (b.stage === 'paid' && now >= b.deliverAt) ev.push('delivery-due');
  return ev;
}

export function deliver(L) {
  const b = P(L); if (b.stage !== 'paid' || stamp(L) < b.deliverAt) return null;   // not before it's at the dealer
  const colour = COLOURS.find((c) => c.id === b.colour), plate = b.plate.how === 'nanjing' ? '苏A·8J731' : b.plate.won ? '沪A·F0731' : '沪A·临时';
  const car = { kind: 'car', id: CAR.id, name: CAR.zh, en: CAR.en, colour: b.colour, hex: colour.hex, interior: b.interior, plate, where: 'me' };
  own(L, car); L.flags.car = car; mark(L, 'delivered');
  say(L, '恭喜提车！以后有什么问题随时找我～');
  emit(L, { type: 'car-delivered', car });
  return car;
}
