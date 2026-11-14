// What people say when they bump into each other (see engine/social.js for who says what, when).
// Short, ordinary, said in passing. lang: 'zh' Mandarin, 'wuu' Shanghainese (shown with a Mandarin
// gloss; no browser has a Shanghainese voice, so these are subtitle-only), 'en' English.
// Several variants per key so nobody repeats themselves; the caller picks one it hasn't used lately.
export const BARKS = {
  office: {
    sorry: [{ t: '不好意思。' , en: 'Sorry.' }, { t: '抱歉抱歉。' , en: 'Sorry, sorry.' }, { t: '哎，不好意思啊。' , en: 'Oh, sorry about that.' }],
    fine: [{ t: '没事没事。' , en: "It's fine, it's fine." }, { t: '没关系。' , en: 'No problem.' }],
    scold: [{ t: '看着点路。' , en: "Watch where you're going." }, { t: '哎——走路看着点啊。' , en: "Hey, look where you're walking." }],
    'scold.again': [{ t: '你有完没完？' , en: 'Are you done yet?' }, { t: '怎么又是你？' , en: 'You again?' }],
  },
  young: {
    sorry: [{ t: '啊，sorry sorry。' , en: 'Ah, sorry sorry.' }, { t: '不好意思哈。' , en: 'Sorry!' }],
    fine: [{ t: '没事。' , en: 'No worries.' }, { t: '没事儿，没事儿。' , en: 'All good, all good.' }],
    scold: [{ t: '兄弟，看路啊。' , en: 'Mate, eyes on the road.' }, { t: '急什么啊。' , en: "What's the rush?" }],
    'scold.again': [{ t: '又来？故意的吧。' , en: "Again? That's on purpose." }, { t: '你有毛病啊。' , en: "What's wrong with you?" }],
  },
  visitor: {
    sorry: [{ t: 'Oh — sorry!', lang: 'en', zh: '哦——抱歉！' }, { t: 'Sorry, excuse me.', lang: 'en', zh: '抱歉，借过。' }],
    fine: [{ t: 'No worries.', lang: 'en', zh: '没事。' }, { t: "It's fine.", lang: 'en', zh: '没关系。' }],
    scold: [{ t: 'Hey — watch it.', lang: 'en', zh: '嘿——小心点。' }],
    'scold.again': [{ t: 'Seriously?', lang: 'en', zh: '你认真的吗？' }],
  },
  elder: {
    sorry: [{ t: '哦，对不起。' , en: "Oh, I'm sorry." }, { t: '哎，对不住啊。' , en: 'Ah, my apologies.' }],
    fine: [{ t: '不要紧，不要紧。' , en: 'Never mind, never mind.' }],
    scold: [{ t: '年轻人，慢点走。' , en: 'Slow down, young man.' }, { t: '走路不看路的啊？' , en: "Don't you look where you walk?" }],
    'scold.again': [{ t: '你这个人怎么回事？' , en: "What's the matter with you?" }],
  },
  // an older local woman (阿姨): Shanghainese
  auntie: {
    sorry: [{ t: '哦哟，对勿起对勿起。', lang: 'wuu', gloss: '哎哟，对不起对不起。' , en: 'Oh my, sorry, sorry.' }, { t: '勿好意思噢。', lang: 'wuu', gloss: '不好意思哦。' , en: 'Excuse me, dear.' }],
    fine: [{ t: '呒没事体。', lang: 'wuu', gloss: '没事。' , en: "It's nothing." }],
    scold: [
      { t: '当心点呀！眼睛看看路好伐？', lang: 'wuu', gloss: '小心点啊！眼睛看着路好不好？' , en: 'Careful! Use your eyes, will you?' },
      { t: '哎哟，侬哪能走路个啦？', lang: 'wuu', gloss: '哎哟，你怎么走路的？' , en: 'Aiyo, how do you even walk?' },
      { t: '急吼吼个，做啥啦。', lang: 'wuu', gloss: '急急忙忙的，干什么呀。' , en: 'All in a rush. What for?' },
    ],
    'scold.again': [
      { t: '又是侬！侬拎拎清爽好伐？', lang: 'wuu', gloss: '又是你！你清醒一点好不好？' , en: 'You again! Get it together, will you?' },
      { t: '一趟两趟，侬故意个是伐？', lang: 'wuu', gloss: '一次两次，你是故意的吧？' , en: "Once, twice... you're doing it on purpose, aren't you?" },
    ],
  },
  lin: {
    sorry: [{ t: '哦，对不住。' , en: 'Oh, my fault.' }],
    fine: [{ t: '哎哟，慢点慢点，没事。' , en: 'Whoa, easy, easy. No harm done.' }],
    scold: [{ t: '小心点，我这把老骨头经不起撞。' , en: "Careful. These old bones can't take a knock." }],
    'scold.again': [{ t: '你今天怎么毛毛躁躁的？' , en: 'Why are you so jumpy today?' }],
  },
  su: {
    sorry: [{ t: '啊，不好意思。' , en: 'Ah, sorry.' }],
    fine: [{ t: '没事。' , en: 'No worries.' }],
    scold: [{ t: '诶——当心点。' , en: 'Hey, careful.' }],
    'scold.again': [{ t: '……你是故意的吧？' , en: "...You're doing that on purpose, aren't you?" }],
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
  // text: what was said; zh / en: the subtitle in each interface language
  return { text: b.t, zh: b.zh || b.t, en: b.en || b.t, lang: b.lang || 'zh', gloss: b.gloss || null };
}
