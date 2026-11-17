// Ji Bai, all in one place (ui/profile.js draws it; node-tested in tests/profile.test.mjs): who he is and
// where he stands today, the three skills and the project, the quests, the money, his reputation, what
// he owns (things, the car, where he lives) and everyone he knows, as a map.
//   profileView(L, defs, lang) -> { me, skills, project, time, quests, money, rep, items, property, people }
import { stamp } from '../engine/life.js';
import { ROMANCE, heart } from '../engine/hearts.js';
import { isYear, year, career, actOf, dateText, hurt } from '../engine/year.js';
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
    built: Object.keys(maker(L).gadgets || {}).map((id) => (BLUEPRINTS[id] ? T(BLUEPRINTS[id].zh, BLUEPRINTS[id].en) : id)),
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
  const items = L.inventory.filter((i) => i.kind !== 'car').map((i) => ({ name: T(i.name || i.id, i.en || i.name || i.id), kind: i.kind || '', from: i.from || '' }));
  for (const g of project.built) items.unshift({ name: g, kind: 'made', from: T('自己做的', 'Made it himself') });
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
