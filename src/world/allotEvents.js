// What the seasons come to, in the world (engine/allot.js decides; this module says it and makes it so):
//   after a season    the people who were or weren't seen write; the project's next step is announced;
//                     a burnout is felt (and remembered)
//   the launch        the good: an offer, a promotion talk (if he told the firm), followers, customers.
//                     The bad, scaled by how visible it is: a knock-off on Taobao within weeks (he answers:
//                     open it up, patent it, out-ship it), a colleague's complaint to HR about moonlighting
//                     (nothing comes of it if he declared it), Mingxuan wanting a share, a big company's call.
//                     Gu Nian, the investor, hears of the batch and the launch: her fund wants a meeting,
//                     unless he is seeing her (then he gets her honest opinion, never her money)
//   the endings       the six stay; two variants are told over them when the year's time says so: "built
//                     it, but alone" and "wanted everything" (burnt out). And a paragraph for the afterword
//                     on where the year's evenings went
import { post, thread, nudge, relation } from '../engine/life.js';
import { leave, heart, NATURE, inLife, isSeeing } from '../engine/hearts.js';
import { isYear, career, standing, rep, fact, setTrack } from '../engine/year.js';
import { allot, profile, USES } from '../engine/allot.js';
import { PEOPLE as CAST } from './cast.js';
import { t } from './romance/kit.js';

const B = (zh, en) => ({ zh, en });
const name = (id, lang = 'zh') => (CAST[id] ? (lang === 'zh' ? CAST[id].short || CAST[id].name : (CAST[id].en || id).split(' ').pop()) : id);
function say(L, id, text) { thread(L, id, { title: CAST[id] ? CAST[id].name : id, members: ['me', id] }); post(L, id, { from: id, kind: 'text', text }); }
// Gu Nian invests in companies like his: if he is seeing her she won't, and says why; if not, her fund is interested
function guNian(L, what) {
  if (!isYear(L) || !inLife(L, 'gunian')) return null;
  const hers = isSeeing(L, 'gunian');
  if (what === 'batch') say(L, 'gunian', hers
    ? t('听说明轩的基金要看你的小批量。好事，去见。他们发来的任何文件，找律师看，别找我。', "I hear Mingxuan's fund wants to look at your small batch. Good. Take the meeting. Anything they send you, have a lawyer read it. Not me.")
    : t('听说你做出了第一批小批量。哪天要融资，材料发我们基金的投资经理，跟所有人一样走流程。我想对你公平，我只知道这一种办法。', "I hear you've made a first small batch. If you ever raise, send the deck to my fund's associate and go through the process like everyone else. I'd like to be fair to you, and that's the only way I know."));
  if (what !== 'launch') return null;
  say(L, 'gunian', hers
    ? t('恭喜。今天有三个人来问我你的公司，我都说不方便谈。这是实话，原因不止一个。', "Congratulations. Three people asked me about your company today, and I told each of them I can't discuss it. That's true for more than one reason.")
    : t('恭喜产品上市。我们基金想在别人之前见你。这次我会亲自在场。', "Congratulations on the launch. My fund would like to meet you before the others do. This time I'll be in the room myself."));
  return hers ? null : B('顾念的基金想见你', "Gu Nian's fund wants a meeting");
}

// a season's events -> lines for the card (B), and the messages that follow
export function seasonAftermath(L, events) {
  const A = allot(L), out = [];
  for (const e of events) {
    if (e.type === 'love') out.push(B(`和${name(e.id)}：${e.evenings} 个晚上`, `With ${name(e.id, 'en')}: ${e.evenings} evenings`));
    else if (e.type === 'apart') {
      const pat = (NATURE[e.id] || {}).patience || 3;
      if (e.risk && heart(L, e.id).trust < 10) {
        const r = leave(L, e.id, 'season-apart');
        if (r.left) { say(L, e.id, t('我想了很久。你一直很忙，我一直在等。我们就到这儿吧。', "I've thought about it for a long time. You're always busy, and I'm always waiting. Let's leave it here.")); out.push(B(`${name(e.id)}走了`, `${name(e.id, 'en')} has gone`)); fact(L, 'left', { why: 'time' }, [e.id]); }
      } else {
        say(L, e.id, e.weeks > pat * 2 ? t('你还记得我吗？', 'Do you still remember me?') : t('最近都见不到你。', "I hardly see you these days."));
        out.push(B(`${Math.round(e.weeks)} 周没见${name(e.id)}`, `${Math.round(e.weeks)} weeks without seeing ${name(e.id, 'en')}`));
      }
    } else if (e.type === 'friends-apart') {
      thread(L, 'dad', { title: '爸', members: ['me', 'dad'] });
      post(L, 'dad', { from: 'dad', kind: 'text', text: t('最近忙吧。有空打个电话。', "Busy, I expect. Call when you can.") });
      out.push(B('朋友和爸爸：几乎没见', 'Friends and Dad: hardly at all'));
    } else if (e.type === 'burnout') {
      say(L, 'momo', t('哥你上次睡满八小时是什么时候？说真的。', 'When did you last sleep eight hours? Seriously.'));
      out.push(B(e.n > 1 ? '又一次透支了' : '透支了：病了一个星期', e.n > 1 ? 'Burnt out again' : 'Burnt out: a week in bed'));
      fact(L, 'burnout', { n: e.n });
    } else if (e.type === 'milestone') {
      const M = { ready: B('样机可以量产了', 'The prototype is production-ready'), batch: B('第一批小批量做出来了', 'A first small batch is made'), launch: B('上市了', 'Launched') }[e.id];
      out.push(M);
      if (e.id === 'batch') say(L, 'xuan', t('听说你那个云台做出小批量了？哪天给我看看，我们基金对硬件一直有兴趣。', "Heard you've made a small batch of that gimbal? Show me some time. The fund's always been interested in hardware."));
      if (e.id === 'batch') guNian(L, 'batch');
      if (e.id === 'launch') out.push(...launch(L));
    } else if (e.type === 'level') out.push(B(`技能提升：${{ hw: '硬件', ai: '软件与 AI', product: '产品' }[e.track]} ${e.level}`, `Skill up: ${{ hw: 'Hardware', ai: 'Software & AI', product: 'Product' }[e.track]} ${e.level}`));
  }
  return out;
}

// how visible a launch is: 0..1 (network, the list, how good it is)
export const exposure = (L) => { const A = allot(L); return Math.min(1, A.network / 80 + (A.made > 220 ? 0.2 : 0)); };
// the launch: what it brings, both ways -> lines (B)
export function launch(L) {
  const A = allot(L), out = [], c = isYear(L) ? career(L) : null, x = exposure(L);
  A.events.launch = { x };
  // the good
  rep(L, 'work', 6, 'launch'); fact(L, 'launch', { x });
  out.push(B(`第一个月卖出 ${Math.round(80 + 400 * x)} 台`, `${Math.round(80 + 400 * x)} sold the first month`));
  if (c && c.track === 'startup' && c.startup) { c.startup.owed = (c.startup.owed || 0) + Math.round(60000 + 200000 * x); c.startup.customer ||= 'launch'; out.push(B('公司有了第一笔像样的收入', 'The company has its first real revenue')); }
  if (c && c.track === 'consulting' && A.declared) { standing(L, 8, 'launch-declared'); out.push(B('合伙人听说了，找你谈升职', 'The partner heard; there is talk of a promotion')); }
  // the bad, by exposure
  if (x >= 0.3) { A.events.knockoff = 'pending'; out.push(B('淘宝上出现了仿品，便宜一半', 'A knock-off on Taobao, at half the price')); }
  if (c && ['consulting', 'switched'].includes(c.track)) {
    if (A.declared) out.push(B('有同事向 HR 举报你兼职。你早就报备过，没事。', 'A colleague reported you to HR for moonlighting. You had declared it; nothing came of it.'));
    else { standing(L, -12, 'moonlighting'); thread(L, 'hr', { title: '迈芬 HR', members: ['me', 'hr'], kind: 'service' }); post(L, 'hr', { from: 'hr', kind: 'text', text: t('有同事反映你在外面有自己的生意，但没有报备。周一上午十点来一下。', "A colleague has told us you have a business of your own you didn't declare. Ten o'clock Monday, please.") }); out.push(B('有同事向 HR 举报你兼职，你没报备过', "A colleague reported you to HR for moonlighting. You hadn't declared it")); }
  }
  if (relation(L, 'xuan').affinity >= 55 && x >= 0.4) { say(L, 'xuan', t('恭喜！说真的，当初是我介绍你认识投资人的。给我留一点股份，不过分吧？', "Congratulations! Honestly, I introduced you to the investors. A little equity for me isn't too much to ask, is it?")); out.push(B('明轩想要一点股份', 'Mingxuan wants a little equity')); A.events.xuan = 'pending'; }
  const gu = guNian(L, 'launch'); if (gu) out.push(gu);
  if (A.network >= 50) { out.push(B('一家大厂打来电话：想收购，或者请你过去', 'A big company calls: they want to buy it, or hire you')); A.events.bigco = 'pending'; fact(L, 'offer', { from: 'bigco' }); }
  return out;
}
// the choices a launch leaves: [{ id, title, options: [{ id, zh, en, note }] }]
export function pendingChoices(L) {
  const E = allot(L).events, out = [];
  if (E.knockoff === 'pending') out.push({ id: 'knockoff', title: B('仿品怎么办？', 'What about the knock-off?'), options: [
    { id: 'open', ...B('开源：让大家都能做，你做最好的那个', 'Open-source it: anyone can make one; yours is the best'), note: B('名声 +，利润 −', 'reputation +, margin −') },
    { id: 'patent', ...B('申请专利、发律师函', 'Patent it, send the lawyers'), note: B('¥30,000，半年', '¥30,000, six months') },
    { id: 'outship', ...B('比他们更快：下一季多花时间做新版本', 'Out-ship them: more evenings on a new version next season'), note: B('下一季要多做东西', 'next season needs more making') }] });
  if (E.xuan === 'pending') out.push({ id: 'xuan', title: B('明轩要股份', 'Mingxuan wants equity'), options: [
    { id: 'give', ...B('给他 2%：没有他就没有那次见面', 'Give him 2%: without him, no meeting'), note: B('友情 +，股权 −', 'friendship +, equity −') },
    { id: 'no', ...B('请他吃饭，但股份不行', 'Buy him dinner, but no equity'), note: B('他会记得', 'he will remember') }] });
  if (E.bigco === 'pending') out.push({ id: 'bigco', title: B('大厂的电话', 'The big company'), options: [
    { id: 'sell', ...B('卖给他们', 'Sell to them'), note: B('一大笔钱，产品不再是你的', 'a lot of money; it is not yours any more') },
    { id: 'join', ...B('带着产品加入他们', 'Join them, with it'), note: B('稳定，但听别人的', 'secure, but someone else decides') },
    { id: 'no', ...B('谢谢，不了', 'Thank you, no'), note: B('继续自己做', 'keep going yourself') }] });
  return out;
}
export function choose(L, id, opt) {
  const A = allot(L), E = A.events; if (E[id] !== 'pending') return null;
  E[id] = opt;
  if (id === 'knockoff') { if (opt === 'open') rep(L, 'work', 8, 'open-source'); if (opt === 'patent') A.patent = true; if (opt === 'outship') A.outship = true; }
  if (id === 'xuan') nudge(L, 'xuan', opt === 'give' ? 8 : -8, `equity:${opt}`);
  if (id === 'bigco') { if (opt === 'sell' || opt === 'join') { fact(L, 'sold', { how: opt }); if (opt === 'join' && isYear(L)) setTrack(L, 'switched'); } }
  fact(L, 'choice', { id, opt });
  return opt;
}

// ---- the endings ----
// a variant told over one of the six, when the year's time says so -> { title, text } | null
export function timeVariant(L) {
  if (!isYear(L)) return null;
  const P = profile(L);
  if (P.everything) return { id: 'everything', title: B('什么都想要', 'Wanted everything'), text: B('这一年你什么都想要：产品、生意、她、朋友、爸爸。结果你透支了不止一次。坐在这里的你，比一年前瘦了一圈。',
    'This year you wanted everything: the product, the business, her, your friends, your father. You burnt out more than once. The man at this table is thinner than he was a year ago.') };
  if (P.alone) return { id: 'alone', title: B('做出来了，但只有自己', 'Built it, but alone'), text: B('它上市了，卖得不错。可这一年的晚上几乎都给了工作台。发布那天，你在朋友圈刷到一条点赞，想分享给谁，翻了半天通讯录。',
    'It launched, and it sells. But this year\'s evenings nearly all went to the bench. The day it went out, you scrolled your contacts for someone to tell, for a long time.') };
  return null;
}
// where the year's evenings went: a paragraph for the afterword (B) or null
export function timeAfterword(L) {
  if (!isYear(L)) return null;
  const P = profile(L), h = P.hours, sum = USES.reduce((s, u) => s + (h[u] || 0), 0);
  if (sum < 30) return null;
  const pct = (u) => Math.round((h[u] || 0) / sum * 100);
  const top = USES.slice().sort((a, b) => (h[b] || 0) - (h[a] || 0))[0];
  const W = { make: B('工作台', 'the bench'), love: B('她', 'her'), friends: B('朋友和家人', 'friends and family'), business: B('投资人和客户', 'investors and clients'), rest: B('休息', 'rest') }[top];
  return B(`这一年工作以外的 ${Math.round(sum)} 个小时：做东西 ${pct('make')}%，陪她 ${pct('love')}%，朋友家人 ${pct('friends')}%，生意 ${pct('business')}%，休息 ${pct('rest')}%。最多的给了${W.zh}。`,
    `Of this year's ${Math.round(sum)} hours outside work: making ${pct('make')}%, with her ${pct('love')}%, friends and family ${pct('friends')}%, business ${pct('business')}%, rest ${pct('rest')}%. Most of it went to ${W.en}.`);
}
