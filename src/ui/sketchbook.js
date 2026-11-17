// Ji Bai's notebook, open on the desk: cream pages, a spiral down the middle, his handwriting (Ma Shan
// Zheng for Chinese, Caveat for English: both SIL OFL, subset to the characters used, public/fonts/)
// and his pen-and-pencil drawings, drawn here as SVG with a hand-drawn wobble:
//   1  the first week back: the day, a few lines, the to-do list; the skyline from the window of 612
//   2  the night gimbal, before it exists: who it's for, what it must be; the side view, the axes, the
//      dimensions, the idea crossed out, the battery circled in red
//   3  the robot arm (once Mingxuan has asked): the questions to ask; a gripper, a speed curve
//   4  Dad's words; the Customs House clock
// ← → (or A D, or a click on a page) turn the pages, with the leaf turning over. ui/workbook.js opens it.
import { getLang } from './i18n.js';

const T = (zh, en) => (getLang() === 'zh' ? zh : en);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const INK = '#1f2c58', PEN = '#26262b', RED = '#b8322a';

let css = false;
function style() {
  if (css || typeof document === 'undefined') return; css = true;
  const s = document.createElement('style'); s.id = 'sketchbook-css';
  s.textContent = `
@font-face { font-family: 'JB Hand'; src: url('./fonts/hand-zh.woff2') format('woff2'); font-display: swap; }
@font-face { font-family: 'JB Hand En'; src: url('./fonts/hand-en.woff2') format('woff2'); font-display: swap; }
.sb-wrap { position: relative; display: flex; flex-direction: column; align-items: center; gap: 14px; user-select: none; }
.sb { container-type: inline-size; position: relative; width: min(94vw, calc(82vh * 1.56)); aspect-ratio: 1.56; perspective: 2400px; transform: rotateX(4deg); filter: drop-shadow(0 30px 40px rgba(0,0,0,0.45)); }
.sb .cover { position: absolute; inset: -1.4% -1.1%; border-radius: 1.4%; background: linear-gradient(135deg, #1e2633, #141a24); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06); }
.sb .pages { position: absolute; inset: 0; display: flex; }
.sb .pg { position: relative; width: 50%; height: 100%; overflow: hidden; background-color: #f3ecda;
  background-image: radial-gradient(rgba(60,70,110,0.16) 0.09vmin, transparent 0.12vmin), linear-gradient(90deg, rgba(0,0,0,0.0), rgba(0,0,0,0.0));
  background-size: calc(100% / 22) calc(100% / 28), 100% 100%; }
.sb .pg::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(120% 90% at 50% 45%, transparent 60%, rgba(120,95,50,0.16)); }
.sb .pg.l { border-radius: 1.2% 0 0 1.2%; box-shadow: inset -2.2vmin 0 2.4vmin -1.4vmin rgba(60,40,10,0.32); }
.sb .pg.r { border-radius: 0 1.2% 1.2% 0; box-shadow: inset 2.2vmin 0 2.4vmin -1.4vmin rgba(60,40,10,0.32); }
.sb .ring { position: absolute; left: 50%; top: 4%; bottom: 4%; width: 3.4%; transform: translateX(-50%); z-index: 5;
  background: radial-gradient(ellipse 45% 30% at 50% 50%, transparent 52%, #8d9297 56%, #e6e9ec 64%, #6f7378 72%, transparent 76%) 0 0 / 100% calc(100% / 17) repeat-y; }
.sb .in { position: absolute; inset: 0; }
.sb svg.sk { position: absolute; overflow: visible; }
.sb .h { position: absolute; white-space: pre; color: ${INK}; font-family: 'JB Hand', 'Ma Shan Zheng', 'Kaiti SC', 'STKaiti', 'KaiTi', cursive; line-height: 1.25; text-shadow: 0 0 0.6px rgba(31,44,88,0.45); }
.sb.en .h { font-family: 'JB Hand En', 'Caveat', 'Bradley Hand', 'Segoe Print', cursive; }
.sb .h.pen { color: ${PEN}; } .sb .h.red { color: ${RED}; }
.sb .leaf { position: absolute; top: 0; width: 50%; height: 100%; z-index: 4; transition: transform 0.31s cubic-bezier(.45,.05,.55,.95); }
.sb .leaf.r { left: 50%; transform-origin: 0 50%; } .sb .leaf.l { left: 0; transform-origin: 100% 50%; }
.sb .leaf > .pg { position: absolute; inset: 0; width: 100%; }
.sb .leaf .shade { position: absolute; inset: 0; pointer-events: none; transition: opacity 0.31s; }
.sb .leaf.r .shade { background: linear-gradient(90deg, rgba(40,25,5,0.35), rgba(40,25,5,0.05)); } .sb .leaf.l .shade { background: linear-gradient(270deg, rgba(40,25,5,0.35), rgba(40,25,5,0.05)); }
.sb-foot { font: 500 13px var(--ui, sans-serif); color: rgba(255,255,255,0.78); letter-spacing: 0.02em; display: flex; gap: 18px; align-items: center; }
.sb-foot button { all: unset; cursor: pointer; padding: 6px 14px; border-radius: 999px; background: rgba(255,255,255,0.16); box-shadow: inset 0 0 0 0.5px rgba(255,255,255,0.6); }
.sb-foot button:disabled { opacity: 0.3; cursor: default; }
.sb-foot .n { min-width: 46px; text-align: center; opacity: 0.8; }
.sb-x { position: absolute; right: -8px; top: -44px; }
`;
  document.head.appendChild(s);
}

// a line (or lines) of handwriting at (x, y) in page units (a page is 100 x 128), size in page units
const hw = (x, y, text, { size = 4.2, rot = null, cls = '', seed = 1, lh = 1.3 } = {}) => {
  const lines = String(text).split('\n');
  return lines.map((t, i) => { const r = rot ?? (((seed * 37 + i * 53) % 13) - 6) * 0.12, dx = (((seed * 11 + i * 29) % 7) - 3) * 0.12;
    return `<div class="h ${cls}" style="left:${x + dx}%;top:${(y + i * size * lh) / 1.28}%;font-size:calc(${size} * 0.5cqw);transform:rotate(${r}deg)">${esc(t)}</div>`; }).join('');
};
// an SVG drawing placed on a page: viewBox units match the page (100 x 128)
const sk = (inner, { x = 0, y = 0, w = 100, h = 128 } = {}) => `<svg class="sk" viewBox="${x} ${y} ${w} ${h}" style="left:${x}%;top:${y / 1.28}%;width:${w}%;height:${h / 1.28}%" preserveAspectRatio="none">${inner}</svg>`;
const DEFS = `<svg width="0" height="0" style="position:absolute"><defs>
  <filter id="sbRough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="0.55"/></filter>
  <filter id="sbPencil" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="8" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="0.4" result="d"/><feComposite in="d" in2="n" operator="in"/></filter>
  <pattern id="sbHatch" width="1.2" height="1.2" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><line x1="0" y1="0" x2="0" y2="1.2" stroke="${PEN}" stroke-width="0.22" opacity="0.55"/></pattern>
  <marker id="sbArrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="3.2" markerHeight="3.2" orient="auto-start-reverse"><path d="M0,0 L6,3 L0,6" fill="none" stroke="${INK}" stroke-width="1"/></marker>
</defs></svg>`;
const g = (inner, { ink = PEN, w = 0.38, f = 'sbRough', o = 0.9 } = {}) => `<g fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" filter="url(#${f})" opacity="${o}">${inner}</g>`;

// ---- the drawings ----
function skyline() {
  // the view from 612: the river, the Pearl, Jin Mao, the WFC, the Shanghai Tower; a little hatching
  return sk(g(`
    <path d="M6 96 Q30 94.5 52 96 T96 95.5"/><path d="M8 99 Q28 98 46 99.2 T94 98.6" opacity="0.6"/><path d="M14 102 q6 -0.6 12 0 M40 101.5 q8 -0.8 15 0 M66 102.4 q7 -0.5 13 0" opacity="0.45"/>
    <path d="M24 95 L24 58 M21 95 L24 70 L27 95 M18.5 95 L22.6 74"/><circle cx="24" cy="78" r="4.3"/><circle cx="24" cy="57" r="2.8"/><path d="M24 54 L24 40" /><circle cx="24" cy="49" r="1"/>
    <path d="M44 95 L44 64 L45.4 64 L45.4 56 L46.6 56 L46.6 50 L47.6 50 L47.6 45 L48.3 41 L49 45 L49 50 L50 50 L50 56 L51.2 56 L51.2 64 L52.6 64 L52.6 95"/>
    <path d="M60 95 L60 42 Q62.5 36 65 34 Q67.5 36 70 42 L70 95"/><path d="M63.3 37.6 h3.4 v2.6 h-3.4 z"/>
    <path d="M78 95 Q76.5 70 79 45 Q81 30 83 22 Q86 32 86.6 46 Q88 70 86.8 95"/><path d="M79.5 60 Q83 52 86.4 60" opacity="0.6"/><path d="M80 78 Q83.5 70 86.8 78" opacity="0.6"/>
    <path d="M30 95 v-20 h8 v20 M33 75 v-6 h3 v6 M10 95 v-14 h6 v14 M90 95 v-12 h5 v12 M55 95 v-16 h4 v16" opacity="0.7"/>`) +
    `<rect x="78.6" y="62" width="7" height="33" fill="url(#sbHatch)" opacity="0.7"/><rect x="60.4" y="70" width="9.2" height="25" fill="url(#sbHatch)" opacity="0.5"/><rect x="44.4" y="72" width="7.8" height="23" fill="url(#sbHatch)" opacity="0.5"/>` +
    g(`<path d="M30 46 L25.6 54" marker-end="url(#sbArrow)"/><path d="M74 17.5 L81.5 23" marker-end="url(#sbArrow)"/>`, { ink: INK, w: 0.3 }));
}
function gimbal() {
  // the night gimbal, side view: the handle (battery inside), the yaw motor, the arm, roll, pitch, the phone's clamp
  return sk(g(`
    <path d="M40 112 Q38 92 40.5 76 L51.5 76 Q54 92 52 112 Q46 116 40 112 Z"/>
    <path d="M41.5 98 h9 M41.3 102 h9.4 M41.4 106 h9.2" opacity="0.5"/><circle cx="46" cy="84" r="1.6"/><path d="M44.8 89 h2.4 v3 h-2.4 z"/>
    <circle cx="46" cy="71" r="4.2"/><circle cx="46" cy="71" r="1.4"/>
    <path d="M46 66.8 L46 58 Q46 54 50 54 L66 54"/><path d="M48.6 66.6 L48.6 60 Q48.6 56.6 52 56.6 L66 56.6" opacity="0.7"/>
    <circle cx="70" cy="55.3" r="4"/><circle cx="70" cy="55.3" r="1.2"/>
    <path d="M70 59.3 L70 66 L62 66 L62 70"/><circle cx="62" cy="73.4" r="3.4"/>
    <path d="M47 76 h30 v-9.5 h-30 z" transform="rotate(-8 62 72)"/><path d="M49 74.6 h26 v-6.7 h-26 z" transform="rotate(-8 62 72)" opacity="0.55"/>`) +
    `<rect x="40.6" y="94" width="10.8" height="16" fill="url(#sbHatch)" opacity="0.6"/>` +
    g(`<ellipse cx="46" cy="102" rx="9.5" ry="11" />`, { ink: RED, w: 0.42, o: 0.85 }) +
    g(`<path d="M37 64 q-5 7 0 14" marker-end="url(#sbArrow)"/><path d="M76 49 q6 6 1 13" marker-end="url(#sbArrow)"/><path d="M56 82 q6 4 12 0" marker-end="url(#sbArrow)"/>
       <path d="M30 76 L30 116 M28.6 76 h2.8 M28.6 116 h2.8"/><path d="M40 121 L80 121 M40 119.6 v2.8 M80 119.6 v2.8" opacity="0.8"/>`, { ink: INK, w: 0.3 }) +
    // a crossed-out idea: two axes, a brick
    g(`<path d="M8 22 h16 v10 h-16 z"/><circle cx="16" cy="18" r="2.2"/><path d="M16 15.8 v-4"/>`, { o: 0.7 }) + g(`<path d="M6 12 L27 35 M27 12 L6 35"/>`, { ink: RED, w: 0.45 }) +
    // folded, from above
    g(`<path d="M74 14 h10 q2 0 2 2 v14 q0 2 -2 2 h-10 q-2 0 -2 -2 v-14 q0 -2 2 -2 z"/><circle cx="79" cy="20" r="2"/><path d="M75 26 h8"/>`, { o: 0.75 }));
}
function gripper() {
  return sk(g(`
    <path d="M30 18 h40 v12 h-40 z"/><path d="M46 30 v8 h8 v-8"/><path d="M40 38 h20 v6 h-20 z"/>
    <path d="M42 44 L36 70 L41 70 L46 48"/><path d="M58 44 L64 70 L59 70 L54 48"/>
    <path d="M44 62 h12 v9 h-12 z"/>`) + `<rect x="35.6" y="66" width="5.6" height="4.2" fill="url(#sbHatch)"/><rect x="58.8" y="66" width="5.6" height="4.2" fill="url(#sbHatch)"/>` +
    g(`<ellipse cx="38.5" cy="68" rx="4.6" ry="3.6"/><ellipse cx="61.5" cy="68" rx="4.6" ry="3.6"/>`, { ink: RED, w: 0.4 }) +
    g(`<path d="M14 118 L14 88 M14 118 L88 118"/><path d="M14 116 L30 116 L44 94 L70 94 L84 116" /><path d="M44 94 L70 94" opacity="0"/>`, { w: 0.35 }) +
    g(`<path d="M44 94 q-2 -3 0 -6 M30 116 q-2 -4 1 -6" />`, { ink: RED, w: 0.35 }) +
    g(`<path d="M70 36 q10 -2 14 8" marker-end="url(#sbArrow)"/>`, { ink: INK, w: 0.3 }));
}
function pipeline() {
  // clips -> labels -> train -> int8 -> NPU -> on the gimbal; under it, accuracy against latency, three models
  const box = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2"/>`, arr = (x1, y1, x2, y2) => `<path d="M${x1} ${y1} L${x2} ${y2}" marker-end="url(#sbArrow)"/>`;
  return sk(g(`${box(6, 14, 22, 12)}${box(39, 14, 22, 12)}${box(72, 14, 22, 12)}${box(72, 38, 22, 12)}${box(39, 38, 22, 12)}${box(6, 38, 22, 12)}`) +
    g(`${arr(28, 20, 38, 20)}${arr(61, 20, 71, 20)}${arr(83, 26, 83, 37)}${arr(72, 44, 62, 44)}${arr(39, 44, 29, 44)}`, { ink: INK, w: 0.32 }) +
    g(`<path d="M12 120 L12 72 M12 120 L92 120"/>`, { w: 0.35 }) + g(`<rect x="12" y="74" width="40" height="22" fill="none" stroke-dasharray="1.6 1.2"/>`, { ink: '#2d7a2d', w: 0.35 }) +
    g(`<circle cx="22" cy="104" r="1.6"/><circle cx="40" cy="90" r="1.6"/><circle cx="74" cy="80" r="1.6"/>`, { w: 0.5 }) + g(`<ellipse cx="40" cy="90" rx="5" ry="4"/>`, { ink: RED, w: 0.4 }));
}
function clock() {
  // the Customs House's clock tower, quickly
  return sk(g(`<path d="M38 120 V70 h24 V120"/><path d="M41 70 V56 h18 V70"/><circle cx="50" cy="63" r="5"/><path d="M50 63 L50 60 M50 63 L52.4 64.2"/>
    <path d="M43 56 V48 h14 V56"/><path d="M45 48 L50 34 L55 48"/><path d="M50 34 V28"/>
    <path d="M42 78 v8 M47 78 v8 M53 78 v8 M58 78 v8 M42 92 v8 M47 92 v8 M53 92 v8 M58 92 v8" opacity="0.6"/><path d="M28 120 H72"/>`) + `<rect x="38.4" y="104" width="23.2" height="15.6" fill="url(#sbHatch)" opacity="0.5"/>`);
}
function hand() {
  return sk(g(`<g transform="translate(8 25) scale(0.8)"><path d="M18 112 q-2 -12 4 -18 l8 -8 q3 -2 4 1 l-4 6 l10 -2 q3 0 2 3 l-8 3 l9 1 q3 1 1 3 l-9 1 l7 2 q2 1 0 3 l-14 2 q-6 2 -10 3"/><path d="M26 84 l10 -14 h8 l-10 14 z"/></g>`, { o: 0.8 }));
}

function spreads(L) {
  const zh = getLang() === 'zh', arm = L && L.invites && L.invites.some((i) => i.id === 'xuan-arm');
  const out = [];
  out.push([
    hw(10, 10, T('11月8日 · 周日 · 晴，有风', 'Sun 8 Nov · clear, windy'), { size: 4.8, cls: 'pen', seed: 2 }) +
    hw(10, 24, T('回来了。外滩的风比记忆里冷。\n和平饭店 612，窗外就是陆家嘴。\n东方明珠还是那个粉色。\n十年没回来，城市长高了，\n我好像没有。', "Back. The wind on the Bund is colder\nthan I remember. Peace Hotel, 612:\nLujiazui right outside the window.\nThe Pearl is still that pink.\nTen years. The city got taller.\nI don't think I did."), { size: 4.4, seed: 3 }) +
    hw(10, 74, T('这周：', 'This week:'), { size: 4.6, cls: 'pen', seed: 5 }) +
    hw(12, 82, T('☐ 给爸回电话（别吵）\n☐ 若安 · 外滩工地\n☐ 知夏：周末天马跑两圈\n☐ 明轩 —— 机械臂原型？\n☑ Manner 燕麦拿铁', "☐ call Dad back (don't argue)\n☐ Ruoan · the site on the Bund\n☐ Zhixia: laps at Tianma, Sat\n☐ Mingxuan: the robot arm?\n☑ Manner, oat latte"), { size: 4.2, seed: 7 }),
    skyline() + hw(14, 8, T('从 612 的窗口', 'from the window of 612'), { size: 4.4, cls: 'pen', seed: 4 }) +
    hw(30, 33, T('东方明珠', 'the Pearl'), { size: 3.4, seed: 8 }) + hw(52, 15, T('上海中心 632m', 'Shanghai Tower 632 m'), { size: 3.2, seed: 9 }) +
    hw(14, 108, T('（晚上灯一亮，江上全是拍照的人。\n手机举得高高的，都在抖。）', "(When the lights come on, the river's\nlined with people taking photos,\nphones up high, all shaking.)"), { size: 3.8, seed: 6 }),
  ]);
  out.push([
    hw(10, 9, T('夜行云台', 'Night gimbal'), { size: 6.4, cls: 'pen', seed: 11 }) + hw(54, 11, T('（暂定）', '(working title)'), { size: 3.6, seed: 12 }) +
    hw(10, 23, T('江边拍照的人：手机举一晚上，\n手抖，夜景全糊。\n不要做又一个三轴大砖头。', "The people by the river: phones up\nall evening, hands shaking, every\nnight shot a blur. NOT another\nthree-axis brick."), { size: 4.2, seed: 13 }) +
    hw(10, 52, T('要的是 →', 'What it has to be →'), { size: 4.6, cls: 'pen', seed: 14 }) +
    hw(13, 60, T('1. 一只手，撑一个晚上\n2. < 300 g（越轻越好）\n3. 夜里稳：1/4 秒不糊\n4. Type-C，路边就能充', '1. one hand, one whole evening\n2. < 300 g (lighter = better)\n3. steady at night: 1/4 s, no blur\n4. USB-C, charge it anywhere'), { size: 4.2, seed: 15 }) +
    hw(52, 100, T('电池放哪？\n重心？？', 'where does the\nbattery go? CoG??'), { size: 4.2, cls: 'red', seed: 16 }) + hand(),
    gimbal() + hw(8, 40, T('两轴？不够。\n太像砖。', 'two axes? no.\ntoo brick.'), { size: 3.4, cls: 'red', seed: 17 }) +
    hw(70, 37, T('折叠后', 'folded'), { size: 3.4, seed: 18 }) +
    hw(19, 60, T('航向', 'Yaw'), { size: 3.4, seed: 19 }) + hw(79, 63, T('横滚', 'Roll'), { size: 3.4, seed: 20 }) + hw(58, 87, T('俯仰', 'Pitch'), { size: 3.4, seed: 21 }) +
    hw(16, 94, T('约 142', '≈ 142'), { size: 3.2, seed: 22 }) + hw(56, 121.6, T('手机夹 62–88', 'clamp 62–88'), { size: 3.2, seed: 23 }) +
    hw(58, 99, T('← 电池放手柄里，\n   重心低，手不累', '← battery in the handle:\n   low CoG, light on the wrist'), { size: 3.6, cls: 'red', seed: 24 }),
  ]);
  out.push([
    hw(10, 9, T('跟随模型 · 给夜行云台', 'A tracking model · for the night gimbal'), { size: 5.0, cls: 'pen', seed: 51 }) +
    hw(10, 22, T('它只会稳，不会跟。\n人一走动，尤其在暗处，就丢了。\n手机厂会做的事，我一个人也能做：\n一个小模型，跑在云台自己的板子上。', "It only steadies; it doesn't follow.\nOnce people walk, in the dark above all,\nit loses them. What phone makers do,\none person can do: a small model, on\nthe gimbal's own board."), { size: 4.0, seed: 52 }) +
    hw(10, 66, T('数据：江边借人试的时候录\n（先问，同意了才录）。\n夜里的素材才有用。', 'Data: record it as people try it\n(ask first; only if they say yes).\nOnly night footage is any use.'), { size: 4.0, seed: 53 }) +
    hw(10, 96, T('不上云：人脸不出这块板子。', 'Not in the cloud: faces never leave the board.'), { size: 4.2, cls: 'red', seed: 54 }),
    pipeline() + hw(8, 9, T('素材', 'clips'), { size: 3.3, seed: 55 }) + hw(42, 9, T('标注', 'labels'), { size: 3.3, seed: 56 }) + hw(75, 9, T('训练', 'train'), { size: 3.3, seed: 57 }) +
    hw(74, 52, T('int8 量化', 'int8'), { size: 3.2, seed: 58 }) + hw(42, 52, 'NPU', { size: 3.3, seed: 59 }) + hw(8, 52, T('上云台', 'on it'), { size: 3.3, seed: 60 }) +
    hw(14, 64, T('准确率', 'accuracy'), { size: 3.2, seed: 61 }) + hw(74, 121, T('延迟', 'latency'), { size: 3.2, seed: 62 }) +
    hw(18, 108, 'tiny', { size: 3.0, seed: 63 }) + hw(44, 84, 'small', { size: 3.0, cls: 'red', seed: 64 }) + hw(77, 74, 'base', { size: 3.0, seed: 65 }) + hw(54, 98, T('≥80%，≤50ms\n这一格里才跟得住', '≥80%, ≤50 ms:\nonly in this box\ndoes it keep up'), { size: 3.2, seed: 66 }),
  ]);
  if (arm) out.push([
    hw(10, 9, T('机械臂 · 明轩学长的团队', "The robot arm · Mingxuan's senior"), { size: 5.2, cls: 'pen', seed: 31 }) +
    hw(10, 22, T('明天下午三点，IFC 二期 32F。\n产品经理跑了，原型卡住了。\n客户月底要看演示。', "3 pm tomorrow, IFC Two, 32F.\nTheir product manager walked out;\nthe prototype is stuck. Customer\ndemo at the end of the month."), { size: 4.2, seed: 32 }) +
    hw(10, 54, T('先看，别急着说。', "Watch first. Don't talk yet."), { size: 4.6, cls: 'red', seed: 33 }) +
    hw(12, 64, T('· 每分钟多少次？\n· 掉的是什么件？多重？\n· 什么时候掉 —— 一直？\n  还是某一个动作？\n· 合同里写的是多少？', "· how many picks a minute?\n· what part drops? how heavy?\n· when does it drop: always,\n  or on one particular move?\n· what does the contract say?"), { size: 4.2, seed: 34 }),
    gripper() + hw(10, 8, T('夹爪', 'the gripper'), { size: 4.2, cls: 'pen', seed: 35 }) + hw(72, 46, T('指尖太硬？', 'fingertips\ntoo stiff?'), { size: 3.4, cls: 'red', seed: 36 }) +
    hw(16, 80, T('速度', 'speed'), { size: 3.4, seed: 37 }) + hw(70, 121, T('时间', 'time'), { size: 3.2, seed: 38 }) + hw(42, 86, T('转腕 — 急停？', 'the wrist turn: a jolt?'), { size: 3.4, cls: 'red', seed: 39 }),
  ]);
  out.push([
    hw(10, 14, T('爸说：', 'Dad said:'), { size: 4.6, cls: 'pen', seed: 41 }) + hw(14, 24, T('“你自己的事，你自己想清楚。”', '"Your life. You think it through."'), { size: 4.6, seed: 42 }) +
    hw(10, 46, T('想清楚了再写。', "I'll write it when I have."), { size: 4.2, seed: 43 }) + hw(10, 60, T('……', '...'), { size: 5, seed: 44 }),
    clock() + hw(16, 12, T('海关大楼，钟楼刚修完。\n整点会响《东方红》。', 'Customs House: the clock tower,\njust restored. It still chimes\non the hour.'), { size: 3.8, seed: 45 }),
  ]);
  void zh;
  return out;
}

export function createSketchbook({ audio = null } = {}) {
  style();
  let at = 0, busy = false, host = null, getL = null;
  function rustle() {
    const ctx = audio && audio.getContext && audio.getContext(), out = audio && audio.getMaster && audio.getMaster(); if (!ctx || !out) return;
    const n = Math.floor(ctx.sampleRate * 0.45), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) { const t = i / n; d[i] = (Math.random() * 2 - 1) * Math.pow(Math.sin(Math.PI * t), 1.5) * (0.6 + 0.4 * Math.sin(t * 40)); }
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), gn = ctx.createGain(); s.buffer = b; f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 0.6; gn.gain.value = 0.16;
    s.connect(f).connect(gn).connect(out); s.start();
  }
  const page = (side, html) => `<div class="pg ${side}"><div class="in">${html}</div></div>`;
  function render() {
    if (!host) return;
    const S = spreads(getL()), n = S.length; at = Math.max(0, Math.min(n - 1, at));
    host.innerHTML = `${DEFS}<div class="sb-wrap"><div class="sb ${getLang() === 'zh' ? 'zh' : 'en'}"><div class="cover"></div><div class="pages">${page('l', S[at][0])}${page('r', S[at][1])}</div><div class="ring"></div></div>
      <div class="sb-foot"><button data-sb="-1" ${at === 0 ? 'disabled' : ''}>←</button><span class="n">${at + 1} / ${n}</span><button data-sb="1" ${at === n - 1 ? 'disabled' : ''}>→</button><span>${T('← → 翻页 · Esc 合上', '← → to turn · Esc to close')}</span></div></div>`;
  }
  function turn(dir) {
    const S = spreads(getL()), n = S.length, to = at + dir;
    if (busy || to < 0 || to >= n || !host) return false;
    busy = true; rustle();
    const sb = host.querySelector('.sb'), pages = sb.querySelector('.pages');
    // forward: the right page folds in to the spine (the next right page is under it), then the next left
    // page unfolds from the spine over the old one. Back: the same the other way.
    const out = document.createElement('div'), inn = document.createElement('div');
    const [os, ns] = dir > 0 ? ['r', 'l'] : ['l', 'r'];
    out.className = `leaf ${os}`; out.innerHTML = `${page(os, S[at][dir > 0 ? 1 : 0])}<div class="shade" style="opacity:0"></div>`;
    inn.className = `leaf ${ns}`; inn.innerHTML = `${page(ns, S[to][dir > 0 ? 0 : 1])}<div class="shade" style="opacity:1"></div>`; inn.style.transform = 'scaleX(0)';
    pages.children[dir > 0 ? 1 : 0].innerHTML = `<div class="in">${S[to][dir > 0 ? 1 : 0]}</div>`;
    sb.appendChild(out); sb.appendChild(inn); void out.offsetWidth;
    out.style.transform = 'scaleX(0)'; out.querySelector('.shade').style.opacity = '1';
    setTimeout(() => { inn.style.transform = 'scaleX(1)'; inn.querySelector('.shade').style.opacity = '0'; }, 300);
    setTimeout(() => { at = to; busy = false; render(); }, 640);
    return true;
  }
  return {
    // draw into an element (the workbook's root or a tab's body)
    mount(el, getLife) { host = el; getL = getLife; render(); el.onclick = (e) => { const b = e.target.closest('[data-sb]'); if (b) { e.stopPropagation(); turn(+b.dataset.sb); return; } const pg = e.target.closest('.sb .pg'); if (pg) { e.stopPropagation(); turn(pg.classList.contains('r') ? 1 : -1); } }; },
    unmount() { if (host) host.onclick = null; host = null; },
    key(code) { if (code === 'ArrowRight' || code === 'KeyD') return turn(1) || true; if (code === 'ArrowLeft' || code === 'KeyA') return turn(-1) || true; return false; },
    get page() { return at; }, set page(v) { at = v; render(); },
    count: (L) => spreads(L).length,
  };
}
