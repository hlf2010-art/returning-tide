// The last ferry (末班轮渡): the payoff of the line scrawled across Old Zhou's missing-person notice,
// "Stop looking. If you want to know, take the last ferry", and of the ferry token taped to its corner.
// Pure (no three.js, no DOM): world/cruise.js plays the script on arrival at Dongchang Road.
//
// Whoever wrote that line (the nephew, the same red marker as the pouch's label) meant it to read as
// "he went into the river". It points, without meaning to, at the one person who knows better: Old Fang,
// the deckhand on the Jinling Road boat, which Zhou rode home to Pudong every night for thirty years.
// On the 29th Zhou didn't take it. He came at six with his toolbox, said he was going to his sister's in
// Kunshan for a few days (where, the year tells later, he had a stroke at the coach station), and left the
// box with Fang: "if my nephew asks, you haven't seen me." Inside: his repair-ticket book, whose last
// page says the nephew wanted the transfer signed and he wouldn't; and a watch, long since mended,
// tagged for "Little Bai". Given to Zhou's daughter in the new year, the book saves the stall
// (world/career.js: watch.told 'book').
//
// Taken only on the 23:00 sailing, only once the notice has been read; saying nothing ends it for the
// night, and it can be tried again another night.
import { stamp, own } from '../engine/life.js';
import { FERRY } from '../engine/ferry.js';
import { fact } from '../engine/year.js';

const B = (zh, en) => ({ zh, en });
export const FANG = { zh: '老方', en: 'Old Fang' };
export const isLastSailing = (dep) => dep === FERRY.last;
export const hasBox = (L) => !!L.flags.zhouBox;
// the beat is due on this crossing: the last boat, the notice read, the box not yet his
export const lastFerryDue = (L, dep) => isLastSailing(dep) && !!L.flags.clueRead && !hasBox(L);

// he takes the box: in his things, on the year's ledger
export function takeBox(L) {
  if (hasBox(L)) return false;
  L.flags.zhouBox = { at: stamp(L), day: L.clock.day };
  own(L, { kind: 'keepsake', id: 'zhou-box', name: '老周的工具箱', en: "Old Zhou's toolbox" });
  own(L, { kind: 'keepsake', id: 'zhou-watch', name: '一块旧手表（“小白 · 取”）', en: 'An old watch, tagged "Little Bai, to collect"' });
  fact(L, 'ferry', { what: 'zhou-box' }, ['zhou']);
  return true;
}

const REVEAL = (warm) => [
  ...(warm ? [['fang', '小白？……老周天天讲的那个小白？长这么高了。', 'Little Bai? ...The Little Bai Zhou never stopped talking about? Look how tall you are.']] : []),
  ['fang', '老周坐我这条船，坐了三十年。每天收了摊，末班，回浦东。', 'Zhou rode this boat for thirty years. Every night, stall packed up, the last sailing home to Pudong.'],
  ['fang', '二十九号他没坐末班。六点钟就来了，拎着他那只工具箱，说去昆山他阿姐那儿住几天。', "On the twenty-ninth he didn't take the last one. He came at six with that toolbox of his and said he was off to his sister's in Kunshan for a few days."],
  ['fang', '箱子他不带，叫我替他收着。他讲：“阿侄要是来问，就讲没看见我。”', "He wouldn't take the box. Asked me to keep it. He said: \"If my nephew comes asking, you haven't seen me.\""],
  ['fang', '后来是有个年轻人来问过两回，拎只红纸袋。我讲没看见。', 'And a young fellow did come asking, twice, with a red paper bag. I said I hadn\'t seen him.'],
  ['fang', '启事上那行字我也看见了。“乘末班轮渡”……写字的人，是想叫人以为他跳了江。他没有。', 'I saw that line on the notice too. "Take the last ferry"... Whoever wrote it wants people to think he went into the river. He didn\'t.'],
  [null, '（老方从驾驶室底下拖出一只棕色的旧工具箱：镊子，表油，一本修理单，还有一块用手帕包着的旧手表，表带上缠着张纸条：“小白 · 取”。）', '(Old Fang drags a battered brown toolbox from under the wheelhouse: tweezers, watch oil, a book of repair tickets, and an old watch wrapped in a handkerchief, a slip of paper round its strap: "Little Bai, to collect".)'],
  [null, '（那是你十二岁那年摔坏的表。修好了，一直没人来取。）', "(It is the watch you broke the summer you were twelve. Mended, and never collected.)"],
  [null, '（修理单最后一页，十月二十九号，是老周的字：“阿侄又来，叫我签摊位转让。不签。去昆山阿姐处住几天。”）', '(The last page of the ticket book, 29 October, in Zhou\'s hand: "Nephew here again, wants me to sign over the stall. Won\'t. Going to my sister\'s in Kunshan a few days.")'],
  ['fang', '箱子你拿去，给他屋里人。我一个摇船的，派出所去不来。', "You take the box. Give it to his family. I'm a boatman; I can't be going to police stations."],
];

// the conversation on the deck at Dongchang Road ([who, zh, en] lines and one { ask })
export function lastFerryScript(L) {
  const wire = (a, fx) => { let done = false; return { ...a, get then() { if (!done) { done = true; fx && fx(); } return a.then; } }; };
  return [
    [null, '（末班船上没几个人。船靠了东昌路，收缆的老船工没急着下船，看了看你，又看了看你手里那枚轮渡筹码。）', '(Hardly anyone on the last boat. At Dongchang Road the old deckhand casting off doesn\'t hurry ashore. He looks at you, then at the ferry token in your hand.)'],
    ['fang', '金陵东路的老筹码。这种早不用了。哪里来的？', 'An old Jinling Road token. Nobody\'s used those for years. Where\'d you get it?'],
    { ask: [
      wire({ zh: '粘在老周的寻人启事上。有人在上面写：“想晓得，就乘末班轮渡。”', en: 'It was taped to Old Zhou\'s missing-person notice. Someone had written across it: "If you want to know, take the last ferry."', then: REVEAL(false) }, () => takeBox(L)),
      wire({ zh: '我小时候每个暑假都在老周的摊子上。他十月底不见了。', en: 'I spent every summer as a boy at Old Zhou\'s stall. He went missing at the end of October.', then: REVEAL(true) }, () => takeBox(L)),
      { zh: '（把筹码收起来，不说话）', en: '(Put the token away. Say nothing.)', then: [['fang', '……那就算了。夜里风大，早点回去。', '...Suit yourself. Windy out here at night. Get yourself home.']] },
    ] },
  ];
}
// what he thinks once it's over (the HUD's thought line)
export const AFTER = B('他没有跳江。他去了昆山。', "He didn't go into the river. He went to Kunshan.");
