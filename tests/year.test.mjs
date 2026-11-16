// The year (src/engine/year.js) and the relationship state (src/engine/hearts.js). npm test.
import { createLife, skipTo, stamp, save, load } from '../src/engine/life.js';
import { initYear, isYear, finalDay, dateOf, dateText, actOf, gapAfter, gapText, settle, career, standing, setTrack, rep, injure, hurt, setHome, fact, factsAbout, once, lifeContext, isWorkday, ACTS, DATES, FINAL_DAY } from '../src/engine/year.js';
import { heart, meet, feel, remember, recalls, setStage, seeing, ROMANCE } from '../src/engine/hearts.js';
import { QUESTS, runStoryBeats, D } from '../src/world/story.js';
import { updateQuests } from '../src/engine/quests.js';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const old = createLife();
ok(!isYear(old) && finalDay(old) === 6 && settle(old).length === 0 && lifeContext(old) === '' && rep(old, 'work', 5) === 50, 'a game begun before the year existed keeps its six days, and the year leaves it alone');
const L = createLife(); initYear(L);
ok(isYear(L) && finalDay(L) === FINAL_DAY && ACTS.length === 5 && ACTS.every((a, i) => a.n === i + 1 && (i === 0 || a.from === ACTS[i - 1].to + 1)) && Object.keys(DATES).length === FINAL_DAY, 'a new game: five acts over seventeen playable days, no gaps');
ok(dateText(L, 'en') === 'Monday 9 November 2026' && /2026 年 11 月 9 日 周一/.test(dateText(L, 'zh')) && actOf(L).n === 1 && isWorkday(L), `it begins on ${dateText(L, 'en')}`);
ok(gapAfter(L, 1) === 1 && gapAfter(L, 6) === 58 && gapText(58, 'en') === '2 months later' && gapText(42, 'zh') === '6 周后' && gapText(1) === '', 'weeks pass in the night between acts');
L.clock.day = 17; ok(dateText(L, 'en') === 'Saturday 13 November 2027' && actOf(L).n === 5, 'the dinner is a year on: Saturday 13 November 2027');
L.clock.day = 1;
const b0 = L.wallet.bank; L.clock.day = 7; const paid = settle(L);
ok(paid.filter((p) => p.type === 'salary').length === 2 && L.wallet.bank - b0 === 2 * career(L).salary && settle(L).length === 0, 'two months of salary arrive with January (once)');
setHome(L, 'flat', 9800, 'Jing\'an'); L.clock.day = 9; const p2 = settle(L);
ok(p2.some((p) => p.type === 'rent') && p2.some((p) => p.type === 'salary'), 'rent goes out with the months too');
ok(standing(L, -12, 'the demo failed') === 38 && rep(L, 'street', -10, 'a fight') === 40 && setTrack(L, 'startup', { salary: 0, startup: { name: 'Tidewater' } }).track === 'startup' && setTrack(L, 'nonsense') === null, 'standing, reputation and the road he is on');
injure(L, 2, 'a split lip'); ok(hurt(L).level === 2, 'hurt'); L.clock.day = 11; settle(L); ok(hurt(L) === null, 'and healed two days on');
fact(L, 'date', { where: 'the Jazz Bar' }, ['nanxing']);
ok(factsAbout(L, 'nanxing', 'date').length === 1 && factsAbout(L, null, 'career').length === 1 && once(L, 'x') && !once(L, 'x'), 'what really happened is on the ledger; a scene happens once');
ok(/start-up \(Tidewater\)/.test(lifeContext(L)) && /rented flat/.test(lifeContext(L)), `what characters are told: ${lifeContext(L)}`);
// hearts
ok(ROMANCE.length === 5 && heart(L, 'gunian').stage === 'stranger' && meet(L, 'gunian').stage === 'known' && feel(L, 'gunian', { trust: 12, attraction: 5 }, 'coffee').trust === 32, 'five people; meeting one; a feeling moves');
remember(L, 'gunian', 'first-coffee', { where: 'Manner' }); remember(L, 'gunian', 'first-coffee');
ok(recalls(L, 'gunian', 'first-coffee') && heart(L, 'gunian').memories.length === 1 && setStage(L, 'gunian', 'dating').stage === 'dating' && seeing(L).join() === 'gunian', 'a memory is kept once; dating');
setStage(L, 'gunian', 'over', 'she left'); ok(feel(L, 'gunian', { trust: 50 }).trust === 32 && seeing(L).length === 0, 'once it is over, it is over');
const R = load(save(L)); ok(R.v === 1 && R.flags.year.career.track === 'startup' && R.flags.hearts.gunian.stage === 'over', 'it all saves in the same v1 format');
// the dinner moves with the calendar
{
  const N = createLife(); initYear(N); const ctx = { player: { x: 0, y: 0, z: 0 } };
  const tick = () => { runStoryBeats(N); updateQuests(N, QUESTS, stamp(N), ctx); };
  skipTo(N, D(2, 20)); N.flags.calls = [{ from: 'dad', script: 'dad-plans', missed: false }]; tick();
  skipTo(N, D(6, 21)); tick();
  ok(!N.invites.some((i) => i.id === 'dad-dinner') && !N.quests.list.dinner, 'a year game: no dinner on day 6');
  skipTo(N, D(16, 19, 30)); tick(); tick();
  const inv = N.invites.find((i) => i.id === 'dad-dinner');
  ok(inv && inv.at === D(17, 20) && N.quests.list.dinner && N.quests.list.dinner.status === 'active', 'Dad writes the evening before; the dinner is at eight on day 17');
}
console.log(failed ? `\n${failed} FAILED` : '\nall passed'); process.exit(failed ? 1 : 0);
