// Ji Bai, all in one place (ui/profile.js draws it; node-tested in tests/profile.test.mjs): who he is and
// where he stands today, the three skills and the project, the quests, the money, his reputation, what
// he owns (things, the car, where he lives) and everyone he knows, as a map.
//   profileView(L, defs, lang) -> { me, skills, project, time, quests, money, rep, items, property, people }
import { stamp } from '../engine/life.js';
import { ROMANCE, heart } from '../engine/hearts.js';
import { isYear, year, career, actOf, dateText, dateOf, hurt } from '../engine/year.js';
import { skillsView } from '../engine/skills.js';
import { hasProduct, summary, rev } from '../engine/studio.js';
import { maker, BLUEPRINTS } from '../engine/maker.js';
import { journal } from '../engine/quests.js';
import { allot, profile, MILESTONES, USES } from '../engine/allot.js';
import { ME, PEOPLE, FRIENDS } from './cast.js';
import { FIRM, NEWCO, WORKS } from './careerScenes.js';
import { LISTINGS } from './career.js';

const pick = (lang) => (zh, en) => (lang === 'zh' ? zh : en);
// who each person is to him (the cast's roles are written in English)
const ROLE_ZH = {
  xuan: '风投分析师，陆家嘴', ruoan: '建筑师，外滩老楼修缮', momo: '爵士键盘手，120 万粉丝', zhixia: '电动车工程师，业余 GT 车手', yinuo: '家族办公室，艺术与地产',
  dad: '精密机加工厂，南京', mum: '心内科医生，鼓楼医院', kai: '杨浦创客空间', chen: '退休车工，拍海关大楼', ye: '外滩人像摄影师', zhe: '外滩夜间主播',
  zhiwei: '项目经理，陆家嘴', nanxing: '独立摄影师', gunian: '建筑师，外滩老楼修缮', yuan: '产品设计师，旧金山', kexin: '生活方式博主，小红书 18 万',
  zhou: '汉口路修表匠', vivian: '兰博基尼销售顾问', taoke: '分析师，迈芬', shaofeng: '高级顾问，迈芬', partner: '合伙人，迈芬', gu: '东澜理赔系统；后来屿深',
  feng: '东澜保险运营副总', agent: '房产中介', zhoumin: '修表匠的女儿',
};
const WORK = ['taoke', 'shaofeng', 'partner', 'gu', 'feng', 'kai', 'vivian'];
const FAMILY = ['dad', 'mum'];
const STAGE = { stranger: ['陌生', 'Stranger'], known: ['认识', 'Known'], close: ['亲近', 'Close'], dating: ['约会中', 'Dating'], together: ['在一起', 'Together'], over: ['结束了', 'Over'] };
const TRACK = { consulting: ['咨询顾问', 'Consultant'], resigned: ['已辞职', 'Resigned'], laidoff: ['被裁员', 'Laid off'], switched: ['跳槽', 'Changed jobs'], startup: ['创业', 'Founder'], family: ['回家里的厂', "At the family works"], legacy: ['刚回国', 'Just back'] };
const EMPLOYER = { firm: FIRM, [NEWCO.en]: NEWCO, [WORKS.en]: WORKS };

export function profileView(L, defs = [], lang = 'zh') {
  const T = pick(lang), Y = isYear(L), c = career(L), act = actOf(L), A = allot(L), P = profile(L);
  // ---- who he is, today ----
  const emp = EMPLOYER[c.employer];
  const me = {
    name: T(ME.name, ME.en), age: ME.age, line: T(ME.line, ME.lineEn),
    date: Y ? dateText(L, lang) : T(`第 ${L.clock.day} 天`, `Day ${L.clock.day}`), act: act ? T(act.zh, act.en) : null,
    job: T(...(TRACK[c.track] || TRACK.legacy)), employer: emp ? T(emp.zh, emp.en) : c.startup ? (c.startup.nameZh && lang === 'zh' ? c.startup.nameZh : c.startup.name || '') : '',
    salary: c.salary || 0, standing: Y ? c.standing : null, hurt: hurt(L) ? T(hurt(L).what || '受伤', hurt(L).what || 'Hurt') : null, energy: Math.round(A.energy),
  };
  // ---- skills, the project ----
  const skills = skillsView(L, lang);
  const S = hasProduct(L) ? summary(L) : null;
  const project = {
    has: !!S, name: T('夜行云台', 'Night gimbal'), version: S ? rev(L) : 0, grade: S ? S.grade : 0, users: S ? S.hands : 0, list: S ? S.list : 0, price: S ? S.price : 0,
    steps: [{ id: 'validated', zh: '验证过的原型', en: 'A validated prototype', done: !!S && S.grade >= 3 }, ...MILESTONES.map((m) => ({ id: m.id, zh: m.zh, en: m.en, done: !!A.milestones[m.id] }))].map((s) => ({ id: s.id, text: T(s.zh, s.en), done: s.done })),
    built: Object.keys(maker(L).gadgets || {}).map((id) => ({ id, name: BLUEPRINTS[id] ? T(BLUEPRINTS[id].zh, BLUEPRINTS[id].en) : id })),
  };
  const time = { hours: Object.fromEntries(USES.map((u) => [u, Math.round(P.hours[u] || 0)])), work: Math.round(P.hours.work || 0), burnout: P.burnout, network: Math.round(A.network), seasons: A.seasons.length };
  // ---- quests ----
  const rows = journal(L, defs, lang);
  const quests = { active: rows.filter((r) => r.status === 'active').map((r) => ({ title: r.title, main: r.main, step: (r.steps.find((s) => s.current) || {}).text || '', done: r.steps.filter((s) => s.done).length, of: r.steps.length, tracked: r.tracked })),
    done: rows.filter((r) => r.status === 'done').length, failed: rows.filter((r) => r.status === 'failed').length };
  // ---- money ----
  const W = L.wallet, su = c.startup;
  const cash = W.wechat + W.alipay + W.bank;
  const money = { wechat: W.wechat, alipay: W.alipay, bank: W.bank, cardUsed: W.card.used, cardLimit: W.card.limit, company: su && su.cash != null ? su.cash : null,
    net: cash - W.card.used, rent: Y ? year(L).home.rent || 0 : 0, salary: c.salary || 0,
    recent: W.ledger.slice(-6).reverse().map((e) => ({ to: e.to, memo: lang === 'zh' ? e.memo : e.memoEn || e.memo, amount: e.amount, method: e.method, at: e.at, in: e.kind === 'income' || e.kind === 'salary' || e.amount < 0 })) };
  // ---- reputation ----
  const R = Y ? year(L).rep : { work: 50, street: 50, online: 50 };
  const rep = [
    { id: 'standing', name: T('公司里的位置', 'Standing at work'), v: Y ? c.standing : 50 },
    { id: 'work', name: T('业内口碑', 'Professional reputation'), v: R.work },
    { id: 'online', name: T('网上', 'Online'), v: R.online },
    { id: 'street', name: T('街头', 'On the street'), v: R.street },
    { id: 'network', name: T('人脉', 'Network'), v: Math.round(A.network) },
  ];
  // ---- what he owns ----
  const items = L.inventory.filter((i) => i.kind !== 'car').map((i) => ({ id: i.id, name: T(i.name || i.id, i.en || i.name || i.id), kind: i.kind || '', from: i.from || '' }));
  for (const g of project.built) items.unshift({ id: g.id, name: g.name, kind: 'made', from: T('自己做的', 'Made it himself') });
  const car = L.flags.car ? { name: T(L.flags.car.name, L.flags.car.en), plate: L.flags.car.plate, hex: L.flags.car.hex } : null;
  const H = Y ? year(L).home : { kind: 'hotel', rent: 0 };
  const listing = H.kind === 'flat' ? Object.values(LISTINGS).find((x) => x.rent === H.rent || x.where === H.where) : null;
  const property = {
    home: H.kind === 'flat' ? { name: listing ? T(listing.zh, listing.en) : H.where, rent: H.rent, size: listing ? listing.size : null, rented: true }
      : { name: T('和平饭店（公司搬迁补贴）', 'The Peace Hotel (on the relocation allowance)'), rent: H.rent || 0, size: null, rented: true },
    car, company: su ? { name: T(su.nameZh || su.name || '公司', su.name || su.nameZh || 'The company'), cash: su.cash ?? 0, funded: !!su.funded } : null,
  };
  // ---- the people ----
  const met = (id) => {
    if (ROMANCE.includes(id)) return heart(L, id).stage !== 'stranger';
    return !!(L.relations[id] || L.threads[id]);
  };
  const people = Object.keys(PEOPLE).filter((id) => PEOPLE[id].role && !['app', 'shop', 'coffee', 'human resources', 'letting agent'].includes(PEOPLE[id].role) && met(id)).map((id) => {
    const p = PEOPLE[id], rom = ROMANCE.includes(id), h = rom ? heart(L, id) : null, r = L.relations[id];
    const close = rom ? Math.round((h.attraction + h.trust) / 2 + ({ close: 15, dating: 25, together: 35 }[h.stage] || 0)) : r ? r.affinity : 50;
    const group = rom ? 'heart' : FAMILY.includes(id) ? 'family' : FRIENDS.includes(id) ? 'friend' : WORK.includes(id) ? 'work' : 'other';
    return { id, name: T(p.short || p.name, (p.en || id).replace(/ \(.*\)$/, '')), full: T(p.name, p.en), role: lang === 'zh' ? ROLE_ZH[id] || p.role : p.role, color: p.color, group,
      close: Math.max(0, Math.min(100, close)), stage: rom ? T(...STAGE[h.stage]) : null, over: rom && h.stage === 'over',
      hours: Math.round(((A.who[id] || {}).hours || 0) * 10) / 10, last: r && r.last ? r.last : h && h.lastSeen ? h.lastSeen : null };
  }).sort((a, b) => b.close - a.close);
  return { me, skills, project, time, quests, money, rep, items, property, people, now: stamp(L) };
}
export const GROUPS = { heart: ['感情', 'Romance', '#e07a8f'], family: ['家人', 'Family', '#d9b26a'], friend: ['朋友', 'Friends', '#7fb8e6'], work: ['工作', 'Work', '#9ad0a6'], other: ['其他', 'Others', '#b9b2c9'] };

// ======== the words: the page reads like the game, not a dashboard ========
const DAY_MS = 86400000;
// how many days he has been back (he landed on Monday 9 November 2026)
export function daysBack(L) { const t = dateOf(L); return Math.round((Date.UTC(t.y, t.m - 1, t.d) - Date.UTC(2026, 10, 9)) / DAY_MS) + 1; }
// a line in his own hand for each skill at each level (the notebook's voice)
export const SKILL_NOTE = {
  hw: ['', ['烙铁拿起来手还是抖的。七年没碰了。', "My hand still shakes on the iron. Seven years since I last held one."], ['焊点终于亮了。阿凯说“像样了”。', "The joints finally shine. Kai said: 'Now that's a joint.'"],
    ['结构、电路、电池，一个晚上能改一版。', 'Mechanism, circuit, battery: a version a night.'], ['可以开始想量产的事：公差、良率、供应商。', 'I can start thinking about production: tolerances, yield, suppliers.'], ['爸看了我的板子，没说话。点了点头。', 'Dad looked at my board and said nothing. Then he nodded.']],
  ai: ['', ['会写脚本，会看日志。', 'Scripts, logs.'], ['数据比模型重要。先把数据采好。', 'The data matters more than the model. Collect it properly first.'], ['小模型自己训得出来，也知道它哪里会错。', "I can train a small model myself, and I know where it'll go wrong."],
    ['模型塞进一块指甲大的芯片里，实时跑。这是我在湾区学会的。', 'A model squeezed onto a chip the size of a fingernail, running in real time. That I learned in the Bay.'], ['看得见、听得懂、会动手。下一代东西就长这样。', 'It sees, it understands, it acts. This is what the next things look like.']],
  product: ['', ['先看人怎么用，别急着说话。', "Watch how people use it before saying anything."], ['把抱怨写成问题。抱怨是礼物。', 'Turn complaints into problems. A complaint is a gift.'], ['一次只改两处，而且知道改哪两处。', 'Change two things at a time, and know which two.'],
    ['知道它该卖多少钱，卖给谁。', 'I know what it should cost, and who it is for.'], ['从一个人的需要，看见一类人的需要。', "From one person's need, I can see a kind of person's."]],
};
// what people say about him, by reputation (low / middling / high)
export const REP_SAY = {
  standing: { who: ['贺维安，合伙人', 'Raymond He, partner'], say: [['他人在，心不在。', "He's here, but his mind isn't."], ['还行。再看看。', "He's fine. Let's see."], ['下一个项目让纪白带。', 'Let Ji Bai lead the next one.']] },
  work: { who: ['行业里', 'In the trade'], say: [['那个从美国回来的？没听说做过什么。', "The one back from America? Haven't heard of anything he's done."], ['听说过，挺扎实的。', "I've heard of him. Solid."], ['做硬件 AI 的，找纪白聊聊。', 'Hardware and AI? Talk to Ji Bai.']] },
  online: { who: ['网上', 'Online'], say: [['（没有人在讨论他）', '(No one is talking about him)'], ['有人转了他的云台视频。', 'Someone shared his gimbal video.'], ['“求链接！”“哪里能买？”', '"Link please!" "Where can I buy one?"']] },
  street: { who: ['外滩上', 'On the Bund'], say: [['离那个人远点。', 'Stay away from that one.'], ['（路过的人不会多看他一眼）', '(Passers-by don\'t look twice)'], ['“就是他，晚上借云台给人拍照的那个。”', '"That\'s him. The one who lends people his gimbal at night."']] },
  network: { who: ['明轩', 'Mingxuan'], say: [['你得多出来见见人。', 'You need to get out and meet people.'], ['我那几个投资人都知道你了。', 'My investors all know who you are now.'], ['你现在的局，比我的还多。', 'You get invited to more than I do these days.']] },
};
export const tier = (v) => (v < 40 ? 0 : v < 65 ? 1 : 2);
// a line he'd write about someone, by who they are to him and how close
export function personNote(p, lang = 'zh') {
  const T = pick(lang), c = p.close;
  if (p.over) return T('都过去了。', "It's over.");
  if (p.group === 'heart') return c >= 75 ? T('想到她就想快点下班。', 'Thinking of her, I want the day to end.') : c >= 50 ? T('还想再见她。', 'I want to see her again.') : T('还不太了解她。', "I don't know her well yet.");
  if (p.group === 'family') return c >= 65 ? T('最近说话多了一点。', "We've been talking a bit more.") : c >= 45 ? T('该打个电话了。', "I should call.") : T('上次说话是什么时候？', 'When did we last talk?');
  if (p.group === 'friend') return c >= 65 ? T('有事第一个想到的人之一。', 'One of the first people I\'d call.') : c >= 45 ? T('老朋友。最近见得少。', "An old friend. We don't see much of each other lately.") : T('有点生疏了。', "We've drifted.");
  if (p.group === 'work') return c >= 60 ? T('靠得住。', 'Reliable.') : T('工作上的人。', 'Someone from work.');
  return c >= 60 ? T('点头之交，但他记得我。', 'Barely know him, but he remembers me.') : T('见过几次。', "We've met a few times.");
}
// "how he is now", a few lines, from what's true
export function nowLines(L, V, lang = 'zh') {
  const T = pick(lang), out = [], c = career(L);
  out.push(T(`回国第 ${daysBack(L)} 天。`, `Day ${daysBack(L)} back in Shanghai.`));
  if (c.track === 'consulting') out.push(T(`在${V.me.employer}做顾问。`, `A consultant at ${V.me.employer}.`));
  else if (c.track === 'startup') out.push(T('在做自己的公司。', 'Running his own company.'));
  else if (V.me.employer) out.push(T(`在${V.me.employer}。`, `At ${V.me.employer}.`));
  out.push(V.property.home.rent ? T(`住${V.property.home.name.split('·').pop().trim()}，月租 ¥${V.property.home.rent.toLocaleString('en-US')}。`, `Lives in ${V.property.home.name.split('·').pop().trim()}, ¥${V.property.home.rent.toLocaleString('en-US')} a month.`) : T('住在和平饭店，公司付的。', 'Living at the Peace Hotel, on the firm.'));
  const lover = V.people.find((p) => p.group === 'heart' && /约会|在一起|Dating|Together/.test(p.stage || ''));
  if (lover) out.push(T(`和${lover.name}${lover.stage === '在一起' ? '在一起' : '在约会'}。`, `${lover.stage === 'Together' ? 'With' : 'Seeing'} ${lover.name}.`));
  if (V.me.energy < 35) out.push(T('很累。', 'Tired. Very.'));
  if (V.project.has) out.push(T(`夜行云台，第 ${V.project.version} 版。`, `The night gimbal, version ${V.project.version}.`));
  return out;
}
