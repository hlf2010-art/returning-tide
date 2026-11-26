// After a hit (world/roadReactions.js, engine/roadIncident.js): what it does to his name and to the
// people in his life. How far it travels is engine/roadIncident.js virality():
//   0  no video: the five he might come to love hear about it (the towed yellow car is noticed)
//   1  a video goes round: they've seen it; the group chat has it within the hour; friends cool a little
//   2  it trends: the next morning his name online drops further, work hears of it, Dad writes
//      (an aunt forwarded it), the friends' families are passing it round
//   3  it makes the news: a news alert, and everything above, harder
// Doing it again pushes it further. Immediate effects now; the next morning's (trending, news, Dad,
// work) are kept in flags.carFallout and land on the first tick after 8 (runCarFallout).
// Messages are written and stored in Chinese; EN_ROAD has the English (world/agendaEn.js reads it).
import { stamp, post, nudge, thread } from '../engine/life.js';
import { isYear, rep, fact } from '../engine/year.js';
import { virality } from '../engine/roadIncident.js';
import { romanceEvent } from './romance.js';
import { careerEvent } from './career.js';
import { FRIENDS } from './cast.js';

export const EN_ROAD = {};
const m = (zh, en) => { EN_ROAD[zh] = en; return zh; };
const TX = {
  momo: m('[视频] 外滩斑马线，黄色兰博……这是白白吧？？', "[video] Bund zebra crossing, yellow Lambo... that's Baibai, isn't it??"),
  xuan: m('是他。@纪白 人怎么样？保险报了没？', "It's him. @Ji Bai how's the person? Have you called the insurance?"),
  zhixia: m('外滩限速五十。我在赛道上开两百都没撞过人。', "The Bund's a 50 road. I've done 200 on a track and never hit anyone."),
  again: m('又一次？？白白你认真的吗', 'Again?? Baibai, are you serious'),
  yinuo: m('我妈的牌友群都在转。你最近低调点。', "My mum's mahjong group is forwarding it. Keep your head down for a while."),
  dad: m('你二姑把视频发给我了。人家伤得重不重？该赔的赔，该道歉的上门道歉。车先别开了。', 'Your aunt sent me the video. How badly is the person hurt? Pay what you owe, and go and apologise in person. Leave the car alone for now.'),
  news: m('外滩一辆黄色科尔维纳在斑马线前撞倒行人，司机已被交警罚款记分。现场视频在网上流传，网友：有钱就能这么开？', "On the Bund, a yellow Corvina knocked down a pedestrian at a zebra crossing; the driver was fined and given points by the traffic police. Video from the scene is circulating online. Commenters: 'So money means you can drive like that?'"),
};
const morning = (L) => (L.clock.day + 1) * 1440 + 8 * 60;
const later = (L, mins, thread, from, text) => (L.flags.pendingFollow ||= []).push({ at: stamp(L) + mins, thread, from, text });

// the moment the officer has dealt with it. -> { level }
export function carFallout(L, { kmh = 0, filmed = false } = {}) {
  const F = L.flags, hits = F.carHits || 1, level = virality({ filmed, kmh, hits });
  F.carViral = Math.max(F.carViral || 0, level);
  if (!isYear(L)) return { level };
  fact(L, 'car-viral', { level, hits });
  romanceEvent(L, null, 'car-hit', { level });
  if (level >= 1) {
    for (const id of FRIENDS) nudge(L, id, -3, 'the video of the car on the Bund');
    if (hits >= 2) later(L, 20, 'wuhu', 'momo', TX.again);
    else { later(L, 25, 'wuhu', 'momo', TX.momo); later(L, 29, 'wuhu', 'xuan', TX.xuan); later(L, 36, 'wuhu', 'zhixia', TX.zhixia); }
  }
  if (level >= 2) (F.carFallout ||= []).push({ at: morning(L), level });
  return { level };
}

// the next morning: the trending list, the news, Dad, work
export function runCarFallout(L) {
  const due = (L.flags.carFallout || []).filter((f) => f.at <= stamp(L));
  if (!due.length) return 0;
  L.flags.carFallout = L.flags.carFallout.filter((f) => f.at > stamp(L));
  if (!isYear(L)) return due.length;
  for (const { level } of due) {
    const news = level >= 3;
    rep(L, 'online', news ? -14 : -8, news ? 'in the news: a Corvina hitting a pedestrian on the Bund' : 'trending: "Corvina hits pedestrian on the Bund"');
    if (news) rep(L, 'street', -4, 'recognised from the news');
    careerEvent(L, 'online', { delta: news ? -10 : -6, why: 'the video of him hitting a pedestrian on the Bund' });
    nudge(L, 'dad', news ? -10 : -6, 'the video of the car'); for (const id of FRIENDS) nudge(L, id, -2, 'it went everywhere');
    if (news) { thread(L, 'news', { title: '新闻推送', members: ['news'], kind: 'service' }); post(L, 'news', { from: 'news', kind: 'text', text: TX.news }); }
    post(L, 'wuhu', { from: 'yinuo', kind: 'text', text: TX.yinuo });
    later(L, 25, 'dad', 'dad', TX.dad);
  }
  return due.length;
}
