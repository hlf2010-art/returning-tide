// What people say when they bump into each other (see engine/social.js for who says what, when).
// Short, ordinary, said in passing. lang: 'zh' Mandarin, 'wuu' Shanghainese (shown with a Mandarin
// gloss; no browser has a Shanghainese voice, so these are subtitle-only), 'en' English.
// Several variants per key so nobody repeats themselves; the caller picks one it hasn't used lately.
export const BARKS = {
  office: {
    sorry: [{ t: '不好意思。' }, { t: '抱歉抱歉。' }, { t: '哎，不好意思啊。' }],
    fine: [{ t: '没事没事。' }, { t: '没关系。' }],
    scold: [{ t: '看着点路。' }, { t: '哎——走路看着点啊。' }],
    'scold.again': [{ t: '你有完没完？' }, { t: '怎么又是你？' }],
  },
  young: {
    sorry: [{ t: '啊，sorry sorry。' }, { t: '不好意思哈。' }],
    fine: [{ t: '没事。' }, { t: '没事儿，没事儿。' }],
    scold: [{ t: '兄弟，看路啊。' }, { t: '急什么啊。' }],
    'scold.again': [{ t: '又来？故意的吧。' }, { t: '你有毛病啊。' }],
  },
  visitor: {
    sorry: [{ t: 'Oh — sorry!', lang: 'en' }, { t: 'Sorry, excuse me.', lang: 'en' }],
    fine: [{ t: 'No worries.', lang: 'en' }, { t: "It's fine.", lang: 'en' }],
    scold: [{ t: 'Hey — watch it.', lang: 'en' }],
    'scold.again': [{ t: 'Seriously?', lang: 'en' }],
  },
  elder: {
    sorry: [{ t: '哦，对不起。' }, { t: '哎，对不住啊。' }],
    fine: [{ t: '不要紧，不要紧。' }],
    scold: [{ t: '年轻人，慢点走。' }, { t: '走路不看路的啊？' }],
    'scold.again': [{ t: '你这个人怎么回事？' }],
  },
  // an older local woman (阿姨): Shanghainese
  auntie: {
    sorry: [{ t: '哦哟，对勿起对勿起。', lang: 'wuu', gloss: '哎哟，对不起对不起。' }, { t: '勿好意思噢。', lang: 'wuu', gloss: '不好意思哦。' }],
    fine: [{ t: '呒没事体。', lang: 'wuu', gloss: '没事。' }],
    scold: [
      { t: '当心点呀！眼睛看看路好伐？', lang: 'wuu', gloss: '小心点啊！眼睛看着路好不好？' },
      { t: '哎哟，侬哪能走路个啦？', lang: 'wuu', gloss: '哎哟，你怎么走路的？' },
      { t: '急吼吼个，做啥啦。', lang: 'wuu', gloss: '急急忙忙的，干什么呀。' },
    ],
    'scold.again': [
      { t: '又是侬！侬拎拎清爽好伐？', lang: 'wuu', gloss: '又是你！你清醒一点好不好？' },
      { t: '一趟两趟，侬故意个是伐？', lang: 'wuu', gloss: '一次两次，你是故意的吧？' },
    ],
  },
  lin: {
    sorry: [{ t: '哦，对不住。' }],
    fine: [{ t: '哎哟，慢点慢点，没事。' }],
    scold: [{ t: '小心点，我这把老骨头经不起撞。' }],
    'scold.again': [{ t: '你今天怎么毛毛躁躁的？' }],
  },
  su: {
    sorry: [{ t: '啊，不好意思。' }],
    fine: [{ t: '没事。' }],
    scold: [{ t: '诶——当心点。' }],
    'scold.again': [{ t: '……你是故意的吧？' }],
  },
};

// key 'auntie.scold.again' -> a line (avoiding the last one used for that key)
const last = new Map();
export function pickBark(key, rnd = Math.random) {
  const [persona, ...rest] = key.split('.'), kind = rest.join('.');
  const list = (BARKS[persona] && BARKS[persona][kind]) || null;
  if (!list || !list.length) return null;
  let i = Math.floor(rnd() * list.length);
  if (list.length > 1 && last.get(key) === i) i = (i + 1) % list.length;
  last.set(key, i);
  const b = list[i];
  return { text: b.t, lang: b.lang || 'zh', gloss: b.gloss || null };
}
