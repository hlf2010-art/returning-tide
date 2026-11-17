// What Ji Bai can do, in three tracks (pure, node-tested: tests/skills.test.mjs). He is a 2026 kind of
// engineer: not only hardware, the software and the AI that make it think, and the product sense that
// decides what it should be.
//   hw       硬件 Hardware: the bench (solder, print, mechanisms, electronics). The Maker XP of
//            engine/maker.js, which it is (the same number): he's rusty when he lands, it comes back
//   ai       软件与 AI Software & AI: firmware, data, models, the code that ties a device to them, agents
//            at work. Where he's strongest when he lands (Berkeley CogSci, the Valley's AI products)
//   product  产品 Product design: what to make and for whom, from watching people use things and
//            writing it down (field tests, notebook pages, talking to users)
// Each track has the same levels (engine/maker.js LEVELS). Some work needs two of them at once: the
// night gimbal's tracking is a model (ai) on a board (hw) that people actually want (product).
// Everything is in life.flags.skills (ai, product) and life.flags.maker.xp (hw), so it saves.
import { stamp } from './life.js';
import { maker, gainXp, LEVELS } from './maker.js';

export const TRACKS = {
  hw: { zh: '硬件', en: 'Hardware', what: { zh: '焊接、打印、结构、电路', en: 'Solder, print, mechanisms, circuits' } },
  ai: { zh: '软件与 AI', en: 'Software & AI', what: { zh: '固件、数据、模型、端侧部署、智能体', en: 'Firmware, data, models, on-device deployment, agents' } },
  product: { zh: '产品', en: 'Product', what: { zh: '用户、取舍、定义要做什么', en: 'Users, trade-offs, deciding what to make' } },
};
// where he starts (xp): strong in AI, a product person by training, out of practice at the bench
export const START = { ai: 650, product: 320 };
// what each level of AI and product unlocks (hardware's are engine/maker.js PERKS)
export const AI_PERKS = {
  1: { zh: '写脚本、读日志', en: 'Scripts, reading logs' },
  2: { zh: '数据管线：采集、标注、清洗', en: 'Data pipelines: collect, label, clean' },
  3: { zh: '训练小模型、评估、调参', en: 'Train small models, evaluate, tune' },
  4: { zh: '端侧部署：量化、NPU、实时推理', en: 'On-device: quantise, NPU, real-time inference' },
  5: { zh: '多模态与智能体：视觉 + 语言 + 动作', en: 'Multimodal and agents: vision + language + action' },
};
export const PRODUCT_PERKS = {
  1: { zh: '观察用户', en: 'Watching users' },
  2: { zh: '把抱怨写成问题', en: 'Turning complaints into problems' },
  3: { zh: '取舍：一次只改两处也知道改哪两处', en: 'Trade-offs: knowing which two things to change' },
  4: { zh: '定价与定位', en: 'Pricing and positioning' },
  5: { zh: '从一个人的需求看到一类人的', en: 'From one person\'s need to a kind of person\'s' },
};

export function skillState(L) {
  const f = L.flags;
  if (!f.skills) f.skills = { ai: START.ai, product: START.product, log: [] };
  return f.skills;
}
export function skillXp(L, track) { return track === 'hw' ? maker(L).xp : skillState(L)[track] || 0; }
export const levelOf = (xp) => LEVELS.filter((x) => xp >= x).length;
export function skillLevel(L, track) { return levelOf(skillXp(L, track)); }
export const nextAt = (xp) => LEVELS[levelOf(xp)] ?? null;
// more experience in a track: { xp, levelUp } (hardware goes through engine/maker.js gainXp, its achievements and all)
export function gainSkill(L, track, n, why = '') {
  if (track === 'hw') { const r = gainXp(L, n, why); return { xp: n, levelUp: r && r.levelUp ? r.levelUp : null, track }; }
  const S = skillState(L), before = levelOf(S[track] || 0);
  S[track] = (S[track] || 0) + n; S.log.push({ at: stamp(L), track, xp: n, why });
  if (S.log.length > 200) S.log.splice(0, S.log.length - 200);
  const after = levelOf(S[track]);
  return { xp: n, levelUp: after > before ? after : null, track };
}
// does he have what a piece of work needs? needs: { ai: 3, hw: 2 } -> { ok, short: [[track, need, have]] }
export function meets(L, needs = {}) {
  const short = Object.entries(needs).filter(([t, n]) => skillLevel(L, t) < n).map(([t, n]) => [t, n, skillLevel(L, t)]);
  return { ok: !short.length, short };
}
// the three, for a screen: [{ id, name, level, xp, next, what, perk }]
export function skillsView(L, lang = 'zh') {
  const P = (o) => (o ? (lang === 'zh' ? o.zh : o.en) : '');
  return Object.entries(TRACKS).map(([id, T]) => {
    const xp = skillXp(L, id), lv = levelOf(xp), perks = id === 'ai' ? AI_PERKS : id === 'product' ? PRODUCT_PERKS : null;
    return { id, name: P(T), what: P(T.what), level: lv, xp, next: nextAt(xp), perk: perks ? P(perks[lv]) : null };
  });
}
