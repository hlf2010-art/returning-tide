// Buying the Strale (src/engine/carPurchase.js). npm test.
import { createLife, balance, stamp, skipTo, drain } from '../src/engine/life.js';
import { lead, contact, view, spec, payDeposit, choosePlate, payBalance, quote, stepPurchase, deliver, CAR, PLATE, auctionEligible } from '../src/engine/carPurchase.js';
import { initYear } from '../src/engine/year.js';
import { rng } from './util-rng.mjs';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
{
  const L = createLife(), b0 = balance(L, 'bank');
  ok(lead(L) && L.threads.zhixia.messages.some((m) => m.kind === 'card'), "Zhixia passes on the consultant's card");
  ok(!payDeposit(L).ok, 'no paying anything before you have even seen the car');
  ok(contact(L, stamp(L) + 60) && L.flags.carBuy.stage === 'booked', 'you message Vivian; she brings the demo car to Hankou Road in an hour');
  ok(drain(L).some((e) => e.type === 'car-appointment'), 'the world hears about the appointment');
  ok(view(L, { rode: true }) && spec(L, { colour: 'verde', interior: 'terra' }), 'you meet her at the car, ride along the Bund, pick Verde Mantis with terracotta leather');
  ok(!spec(L, { colour: 'pink', interior: 'terra' }), 'only real options');
  ok(payDeposit(L).ok && balance(L, 'bank') === b0 - CAR.deposit, `deposit ¥${CAR.deposit.toLocaleString()} by bank transfer`);
  const full = quote('full'), fin = quote('finance');
  ok(full.now > balance(L, 'bank'), `paying the rest in full (¥${full.now.toLocaleString()}) is more than the account holds (¥${balance(L, 'bank').toLocaleString()})`);
  ok(fin.now < balance(L, 'bank') && fin.monthly > 40_000 && fin.monthly < 70_000, `dealer finance: ¥${fin.now.toLocaleString()} now, ¥${fin.monthly.toLocaleString()} a month for ${fin.months} months`);
  const no = choosePlate(L, 'auction');
  ok(!no.ok && no.reason === 'not-eligible' && !auctionEligible(L) && L.flags.carBuy.stage === 'deposit', 'a Shanghai plate: refused. A week back from San Francisco with a Nanjing hukou, he has no residence permit or 36 months of Shanghai social insurance');
  ok(/36个月/.test(L.threads.vivian.messages.at(-1).text), 'and Vivian explains why (and mentions a company plate for later)');
  const pl = choosePlate(L, 'nanjing');
  ok(pl.ok && pl.won && drain(L).some((e) => e.type === 'ask-dad'), 'a Nanjing 苏A plate: no auction, but Dad gets involved');
  ok(!payBalance(L, 'full').ok, 'in full: refused, not enough in the account');
  const r = payBalance(L, 'finance');
  ok(r.ok && L.flags.carBuy.stage === 'paid', 'finance it: down payment made');
  ok(deliver(L) === null, 'delivery waits until the car is at the dealer');
  skipTo(L, L.flags.carBuy.deliverAt + 1);
  ok(stepPurchase(L).includes('delivery-due'), 'two weeks on: ready for delivery');
  const car = deliver(L);
  ok(car && car.plate.startsWith('苏A') && L.flags.car && L.inventory.some((i) => i.kind === 'car'), `delivered: ${car.en}, ${car.colour}, plate ${car.plate}`);
}
{
  // a year game: weeks pass between some playable days, so "about two weeks" is the first playable day
  // that far on by the calendar (day 7, January), not fourteen playable days (day 15, September)
  const L = createLife(); initYear(L); L.clock.day = 1;
  lead(L); contact(L, stamp(L)); view(L); spec(L, { colour: 'giallo', interior: 'nero' }); payDeposit(L); choosePlate(L, 'nanjing');
  ok(payBalance(L, 'finance').ok && Math.floor(L.flags.carBuy.deliverAt / 1440) === 7, `a year game: ordered on day 1 (9 November), delivered on day ${Math.floor(L.flags.carBuy.deliverAt / 1440)} (the first playable day two weeks on)`);
  skipTo(L, L.flags.carBuy.deliverAt + 1);
  ok(stepPurchase(L).includes('delivery-due') && deliver(L), 'and it is delivered then');
}
{
  // someone who is eligible (years of Shanghai social insurance): a fee, mostly a loss the first month
  let won = 0;
  for (let s = 1; s <= 300; s++) {
    const L = createLife(); L.flags.residencePermit = true; L.flags.shSocialMonths = 40; lead(L); contact(L, stamp(L)); view(L); spec(L, { colour: 'nero', interior: 'nero' }); payDeposit(L);
    if (choosePlate(L, 'auction', rng(s)).won) won++;
  }
  ok(won > 15 && won < 70, `the Shanghai auction is won about ${Math.round(PLATE.winRate * 100)}% of the time (${won}/300 first tries)`);
}
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
