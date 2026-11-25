// Free conversation and voices: the pure parts (src/engine/llm.js, src/world/personas.js,
// src/world/ambient.js, src/engine/voice.js). npm test.
import { spoken, isZh } from '../src/engine/llm.js';
import { systemPrompt, cannedReply, PERSONAS, replyOk, finalReminder, addressOf } from '../src/world/personas.js';
import { parseExchange } from '../src/world/ambient.js';
import { voiceKey, rankVoices } from '../src/engine/voice.js';
import fs from 'fs';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
// what a model says, tidied into what a person says
ok(spoken('调酒师：嗯，今晚是Momo他们。（微笑）') === '嗯，今晚是Momo他们。', 'name prefixes and stage directions go');
ok(spoken('**Sure!** Here you go 😊') === 'Sure! Here you go', 'markdown and emoji go');
ok(spoken('As an AI language model, I cannot...') === '' && spoken('作为一个AI，我不能') === '', 'out-of-character replies are dropped (the caller falls back)');
ok(spoken('<think>reasoning</think>好的。') === '好的。', 'hidden reasoning is dropped');
ok(spoken('七点开门。 [前台自己说]') === '七点开门。' && spoken('Sure. 【note】') === 'Sure.', 'bracketed notes to itself are dropped');
ok(spoken('一。'.repeat(200), 30).length <= 30, 'long replies are cut at a sentence end');
ok(isZh('你好 hello') && !isZh('hello'), 'tells Mandarin from English');
// the character cards
const sys = systemPrompt('bartender', '21:40, a clear evening. The Peace Hotel Jazz Bar.', { lang: 'en' });
ok(/bartender/.test(sys) && /Reply in natural spoken English/.test(sys) && /Never mention being an AI/.test(sys), 'a system prompt: who, where, how, and in which language');
ok(/Xinyu/.test(systemPrompt('xuan', 'x', { texting: true })) && /old friend/.test(systemPrompt('xuan', 'x')), 'friends talk like friends; texting reads like texting');
ok(['driver:shi-gu', 'receptionist', 'visitor', 'yinuo', 'vivian'].every((k) => PERSONAS[k] && PERSONAS[k].voice), 'everyone you can talk to has a card and a voice');
ok(isZh(cannedReply('elder', '你好', { lang: 'zh' })) && !isZh(cannedReply('visitor', 'hello', { lang: 'en' })), 'without a model: short replies in the language spoken to them');
ok(/谢|客气|没事|应该/.test(cannedReply('office', '谢谢你', { lang: 'zh' })), 'and roughly the right reply (thanks -> you\'re welcome)');
// a small model's mistakes are caught: wrong language, an echo, him talking
ok(!replyOk('我刚从国外回来。', { lang: 'en', said: 'Is there somewhere to eat?' }) && replyOk('Sure, try the dumpling place on Jiujiang Road.', { lang: 'en', said: 'Is there somewhere to eat?' }), 'asked in English, a Mandarin reply is rejected');
ok(!replyOk('明轩，周末有空吃饭吗？最近天气挺好的', { lang: 'zh', said: '明轩，周末有空吃饭吗？' }) && replyOk('周六可以，你定地方。', { lang: 'zh', said: '明轩，周末有空吃饭吗？' }), 'an echo of what he said is rejected');
ok(addressOf('receptionist', 'zh') === '纪先生' && /纪白/.test(addressOf('xuan', 'zh')) && /stranger/.test(addressOf('visitor', 'en')), 'staff call him Mr Ji, friends Ji Bai, strangers nothing');
ok(/只以「前台」的身份/.test(finalReminder('receptionist', 'zh')) && /as Front desk only/.test(finalReminder('receptionist', 'en')), 'a final reminder: who, and in which language');
// generated exchanges between two people
const ex = parseExchange('Sure! ```json\n[{"speaker":"su","zh":"今天风大。","en":"Windy today."},{"speaker":"lin","zh":"是啊。","en":"It is."},{"speaker":"x","zh":"?","en":"?"}]\n```', ['su', 'lin']);
ok(ex && ex.length === 2 && ex[0].speaker === 'su' && ex[1].en === 'It is.', 'a generated exchange is parsed out of chatter, unknown speakers dropped');
ok(parseExchange('no json here', ['a', 'b']) === null && parseExchange('[{"speaker":"a","zh":"嗯"}]', ['a', 'b']) === null, 'nothing usable -> nothing played');
// voices: the game's key for a line is the generator's (tools/voice/generate.py)
// (lines marked VO_PENDING are new text awaiting a recording: subtitles until generate.py voices them;
// DEPRECATED ones are replaced lines whose recordings are kept, not deleted)
const allLines = JSON.parse(fs.readFileSync('tools/voice/lines.json', 'utf8')), lines = allLines.filter((l) => l.status !== 'VO_PENDING');
ok(allLines.every((l) => !l.status || ['VO_PENDING', 'DEPRECATED'].includes(l.status)), `voice line statuses are VO_PENDING or DEPRECATED only (${allLines.filter((l) => l.status === 'VO_PENDING').length} pending, ${allLines.filter((l) => l.status === 'DEPRECATED').length} deprecated)`);
let man = null; try { man = JSON.parse(fs.readFileSync('public/voice/manifest.json', 'utf8')); } catch { /* not generated yet */ }
if (man) {
  const zhHit = lines.filter((l) => man.clips[voiceKey('zh', l.zh)]).length, enHit = lines.filter((l) => l.en && man.clips[voiceKey('en', l.en)]).length;
  ok(zhHit === lines.length && enHit === lines.filter((l) => l.en).length, `every scripted line has its recorded voice: ${zhHit} Mandarin, ${enHit} English`);
  ok(Object.values(man.clips).every(([f]) => fs.existsSync(`public/voice/${f}`)), 'and every clip file is there');
} else console.log('INFO  voices not generated yet (tools/voice/generate.py)');
const vs = [{ name: 'Google 普通话（中国大陆）', lang: 'zh-CN' }, { name: 'Microsoft Xiaoxiao Online (Natural) - Chinese (Mainland)', lang: 'zh-CN' }, { name: 'Tingting', lang: 'zh-CN' }, { name: 'Sin-ji', lang: 'zh-HK' }, { name: 'Daniel', lang: 'en-GB' }];
ok(rankVoices(vs, 'zh')[0].name.includes('Natural') && !rankVoices(vs, 'zh').some((v) => v.lang === 'zh-HK' && rankVoices(vs, 'zh').indexOf(v) === 0), 'the browser fallback picks its most natural Mandarin voice (not Cantonese)');
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
