// People talking among themselves, and now and then to you, in words nobody wrote in advance: when a
// language model is connected (engine/llm.js), new conversations are made up on the spot for the
// pairs you stand near, about ordinary things, and said aloud in their voices. Without one, the
// written lines carry on as before.
//   - Old Lin and Ms Su at the railing get new exchanges added to their rotation
//   - the two guests in the Peace Hotel's hall; the couple at the Jazz Bar's corner table
//   - sometimes someone near you says something to you (a tourist wants a photo taken, an auntie
//     has an opinion about your coat); T answers them in your own words
import { PERSONAS } from './personas.js';
import { spoken } from '../engine/llm.js';
import { getLang } from '../ui/i18n.js';

const TOPICS = ['the weather turning cold', 'what they had for dinner', 'prices going up', 'a grandchild', 'the boats on the river tonight', 'someone they both know', 'the Bund lights', 'work', 'a TV drama everyone is watching', 'the metro being crowded', 'hairy crab season', 'a new café on Nanjing Road'];
const pickOne = (a) => a[Math.floor(Math.random() * a.length)];

// a short exchange as JSON lines: [{ speaker, zh, en }]
export function parseExchange(raw, speakers) {
  const s = String(raw || ''), i = s.indexOf('['), j = s.lastIndexOf(']');
  if (i < 0 || j <= i) return null;
  try {
    const arr = JSON.parse(s.slice(i, j + 1));
    const out = arr.filter((l) => l && speakers.includes(l.speaker) && typeof l.zh === 'string' && l.zh.trim()).map((l) => ({ speaker: l.speaker, zh: spoken(l.zh, 120), en: spoken(l.en || '', 160) })).filter((l) => l.zh);
    return out.length >= 2 ? out.slice(0, 6) : null;
  } catch { return null; }
}
export function exchangePrompt(a, b, scene, topic) {
  return [
    { role: 'system', content: 'You write short, natural, everyday spoken dialogue for a game set on the Bund in Shanghai, November 2026. Real people, small talk, no drama, no plot twists, nothing about the player. Output only JSON.' },
    { role: 'user', content: `Two people talking: "${a.key}" is ${a.who}; "${b.key}" is ${b.who}. Where and when: ${scene}. They talk about ${topic}. Write 4 lines, alternating, starting with "${a.key}", each one or two short spoken sentences in natural Mandarin (with the fillers people use), plus an English translation. Output a JSON array only: [{"speaker":"${a.key}","zh":"...","en":"..."}, ...]` },
  ];
}

export function createAmbient({ llm, voice, hud, getLife, sceneText, convExchanges = null, getPeople }) {
  const S = { busy: false, cool: 25, playing: null, made: 0, approachCool: 90, opener: null, linSu: 0 };
  // play an exchange: each line in its speaker's voice, a subtitle if you're close
  function play(lines, who) {
    S.playing = { lines: lines.slice(), who };
    const next = () => {
      const l = S.playing && S.playing.lines.shift();
      if (!l) { S.playing = null; return; }
      const p = who[l.speaker], at = p.at();
      const near = (pp) => Math.hypot(pp.x - at[0], pp.z - at[2]) < 7;
      if (near(S.pp)) hud.bark({ speaker: { zh: PERSONAS[p.persona]?.zh || p.persona, en: PERSONAS[p.persona]?.en || p.persona }, text: { zh: l.zh, en: l.en || l.zh }, seconds: Math.max(2.5, l.zh.length / 4), voice: false });
      voice.say({ zh: l.zh, en: l.en, who: PERSONAS[p.persona]?.voice || p.persona, sex: PERSONAS[p.persona]?.sex, at, onEnd: () => setTimeout(next, 500 + Math.random() * 700) }).then((h) => { if (!h) setTimeout(next, 2500); });
    };
    next();
  }
  async function generate(pair) {
    S.busy = true;
    const [ka, kb] = pair.keys, a = { key: ka, who: pair.who[ka].card }, b = { key: kb, who: pair.who[kb].card };
    const raw = await llm.chat(exchangePrompt(a, b, sceneText(), pickOne(TOPICS)), { maxTokens: 420, temperature: 0.9 });
    S.busy = false;
    return parseExchange(raw, pair.keys);
  }
  return {
    get playing() { return !!S.playing; }, get made() { return S.made; },
    // someone said something to you just now: T answers them (main.js reads this)
    get opener() { return S.opener && performance.now() - S.opener.t < 9000 ? S.opener : null; },
    clearOpener() { S.opener = null; },
    async update(dt, pp, { talking = false } = {}) {
      S.pp = pp; S.cool -= dt; S.approachCool -= dt;
      if (llm.backend === 'canned' || talking || S.busy) return;
      const people = getPeople();
      // Lin and Su: a new exchange for their rotation now and then while you're around
      if (convExchanges && Math.hypot(pp.x - people.linSu.x, pp.z - people.linSu.z) < 16) {
        S.linSu += dt;
        if (S.linSu > 40 && S.made < 8) {
          S.linSu = 0;
          const lines = await generate({ keys: ['su', 'lin'], who: { su: { card: 'Ms Su (苏女士), a retired Shanghai schoolteacher in her sixties, warm, practical' }, lin: { card: 'Old Lin (老林), a retired Shanghai man in his sixties who comes to the railing every evening, few words, dry humour' } } });
          if (lines) { const id = `gen-${Date.now()}`; convExchanges.push({ id, generated: true, lines: lines.map((l, i) => ({ id: `${id}-${i}`, speaker: l.speaker, text: l.zh, en: l.en })) }); S.made++;
            const gen = convExchanges.filter((e) => e.generated); if (gen.length > 4) convExchanges.splice(convExchanges.indexOf(gen[0]), 1); }
        }
      }
      // the pairs indoors
      if (!S.playing && S.cool <= 0) {
        const pair = people.pairs.find((q) => q.near(pp));
        if (pair) {
          S.cool = 45 + Math.random() * 40;
          const lines = await generate(pair);
          if (lines && pair.near(S.pp)) { S.made++; play(lines, pair.who); }
        }
      }
      // someone says something to you
      if (S.approachCool <= 0 && !S.playing) {
        S.approachCool = 120 + Math.random() * 120;
        const near = people.talkables().filter((q) => ['visitor', 'auntie', 'elder', 'student', 'youngMan'].includes(q.persona) && Math.hypot(q.x - pp.x, q.z - pp.z) < 4.5);
        const q = near[0]; if (!q) return;
        const P = PERSONAS[q.persona], lang = P.lang === 'en' ? 'en' : 'zh';
        const raw = await llm.chat([{ role: 'system', content: `You are ${P.en}: ${P.card}. Shanghai, November 2026, on the Bund. ${sceneText()}` }, { role: 'user', content: `A young man is standing near you. Say one short, natural thing to him, the kind of thing strangers really say (ask him to take a photo of you, ask the way, comment on the weather or on what he's wearing or carrying). ${lang === 'zh' ? 'Mandarin, one sentence.' : 'English, one sentence.'} Only the words you say.` }], { maxTokens: 60, temperature: 0.95 });
        const line = spoken(raw, 120); if (!line) return;
        S.opener = { t: performance.now(), talkable: q, line };
        hud.bark({ speaker: { zh: P.zh, en: P.en }, text: { zh: line, en: line }, seconds: 4, voice: false });
        voice.say({ zh: lang === 'zh' ? line : null, en: lang === 'en' ? line : null, lang, who: P.voice, sex: P.sex, at: [q.x, q.y, q.z] });
        hud.toast(getLang() === 'zh' ? 'T 回答' : 'T to answer', 3);
      }
    },
  };
}
