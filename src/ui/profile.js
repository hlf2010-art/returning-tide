// The character page (I). Not a dashboard: a night on the Bund. River ink and gold leaf in the Peace
// Hotel's Art Deco, Ji Bai himself standing in a floodlight on the left (ui/portrait.js), his name in
// brush with his seal, his energy as a tide gauge. Seven chapters on the right, each its own layout:
//   Ⅰ 此刻 Now          the date in numerals of the day, what's true of him in his own hand, the errand in hand as a letter
//   Ⅱ 手艺 Craft        three Deco medallions, his note on each, the road to a launch drawn as a metro line, where the time went
//   Ⅲ 心事 Errands      what he's in the middle of
//   Ⅳ 银钱 Money        his ledger, in his hand, with a red stamped balance
//   Ⅴ 名声 Name         what people say about him (a dial, and the words)
//   Ⅵ 家当 Belongings   home as a floor plan, the car with its plate, things in slots
//   Ⅶ 潮汐 The Tide     everyone he knows as lanterns on the river: nearer him = closer
// The data is world/profileView.js; this draws it.
//   createProfile({ getLife, defs, getPeople, onClose }) -> { open(tab), close(), key(k), get isOpen }
import './fonts.js';
import { getLang } from './i18n.js';
import { profileView, GROUPS, SKILL_NOTE, REP_SAY, tier, personNote, nowLines, daysBack, moodOf } from '../world/profileView.js';
import { createPortrait } from './portrait.js';

const T = (zh, en) => (getLang() === 'zh' ? zh : en);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = (n) => Math.round(n).toLocaleString('en-US');
const ROMAN = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ'];
const TABS = [['now', '此刻', 'Now'], ['craft', '手艺', 'Craft'], ['errands', '心事', 'Errands'], ['money', '银钱', 'Money'], ['name', '名声', 'Name'], ['things', '家当', 'Belongings'], ['tide', '潮汐', 'The Tide']];
const CN = '〇一二三四五六七八九';
const cnNum = (n) => (n < 10 ? CN[n] : n < 20 ? `十${n % 10 ? CN[n % 10] : ''}` : `${CN[Math.floor(n / 10)]}十${n % 10 ? CN[n % 10] : ''}`);
function bigDate(V) {
  const m = /(\d{4}) 年 (\d+) 月 (\d+) 日 (\S+)/.exec(V.me.date);
  if (getLang() === 'zh' && m) return { big: `${[...m[1]].map((d) => CN[+d]).join('')}年${cnNum(+m[2])}月${cnNum(+m[3])}日`, small: m[4] };
  const p = V.me.date.split(' '); return { big: p.slice(1).join(' '), small: p[0] };
}

// ---- small drawings ----
const ICON = {
  umbrella: 'M12 3a9 9 0 0 1 9 9H3a9 9 0 0 1 9-9zM12 12v7a2 2 0 0 1-4 0', headphones: 'M4 15v-3a8 8 0 0 1 16 0v3M4 15h3v5H4zM17 15h3v5h-3z',
  powerbank: 'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM12.5 8l-2 4h3l-2 4', tea: 'M5 9h14v11H5zM5 9l3-5h8l3 5M10 13h4',
  kettle: 'M6 20h12l-1-11H7zM9 9V6h6v3M17 11h2a2 2 0 0 1 0 4h-1.5', lidar: 'M4 12a8 8 0 0 1 8-8M7 12a5 5 0 0 1 5-5M10 12a2 2 0 1 0 4 0a2 2 0 1 0-4 0M12 14v6M8 20h8',
  battery: 'M3 8h16v9H3zM19 11v3h2v-3M7 11v3M10 11v3', printer: 'M5 4h14v16H5zM8 7h8M12 7v6M10 13h4M7 17h10', scarf: 'M7 3h10l-2 8 2 10h-4l-1-9-1 9H7l2-10z',
  coat: 'M9 3l3 3 3-3 5 3-2 4-2-1v12H8V9L6 10 4 6zM12 6v15', servo: 'M5 8h14v10H5zM12 8V5M10 5h4M9 13h6', lamp: 'M9 3h6l3 6H6zM12 9v11M8 21h8',
  sofa: 'M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3M3 11h18v6H3zM5 17v2M19 17v2', gimbal: 'M12 3v4M9 7h6v5H9zM12 12v3M8 15h8l-1 6H9z',
  crackcam: 'M4 8h4l2-2h4l2 2h4v11H4zM9 13a3 3 0 1 0 6 0a3 3 0 1 0-6 0', telemetry: 'M3 17l4-6 4 3 4-7 6 9M3 21h18', box: 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8',
};
const iconOf = (i) => ICON[i.id] || ICON[{ umbrella: 'umbrella', gift: 'tea', home: 'kettle', tool: 'printer', clothing: 'coat', furniture: 'lamp', part: 'servo' }[i.kind]] || ICON.box;
const svgIcon = (d, s = 30) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
// a Deco medallion: a sunburst, five arcs (the levels), the numeral
function medallion(level) {
  const rays = Array.from({ length: 36 }, (_, i) => { const a = (i / 36) * Math.PI * 2, r0 = i % 3 ? 62 : 56; return `<line x1="${(80 + Math.cos(a) * r0).toFixed(1)}" y1="${(80 + Math.sin(a) * r0).toFixed(1)}" x2="${(80 + Math.cos(a) * 70).toFixed(1)}" y2="${(80 + Math.sin(a) * 70).toFixed(1)}"/>`; }).join('');
  const arcs = [0, 1, 2, 3, 4].map((i) => { const a0 = -Math.PI / 2 + i * (Math.PI * 2 / 5) + 0.08, a1 = a0 + Math.PI * 2 / 5 - 0.16, r = 48;
    return `<path class="${i < level ? 'on' : ''}" d="M${(80 + Math.cos(a0) * r).toFixed(1)} ${(80 + Math.sin(a0) * r).toFixed(1)} A${r} ${r} 0 0 1 ${(80 + Math.cos(a1) * r).toFixed(1)} ${(80 + Math.sin(a1) * r).toFixed(1)}"/>`; }).join('');
  return `<svg class="medal" viewBox="0 0 160 160"><g class="rays">${rays}</g><circle cx="80" cy="80" r="40" class="disc"/><circle cx="80" cy="80" r="35" class="ring"/><g class="arcs">${arcs}</g><text x="80" y="94" text-anchor="middle">${ROMAN[Math.max(0, level - 1)] || '·'}</text></svg>`;
}
// a dial for a reputation: a half-sun of ticks, a needle
function dial(v) {
  const ticks = Array.from({ length: 21 }, (_, i) => { const a = Math.PI + (i / 20) * Math.PI, r0 = i % 5 ? 34 : 30; return `<line x1="${(44 + Math.cos(a) * r0).toFixed(1)}" y1="${(44 + Math.sin(a) * r0).toFixed(1)}" x2="${(44 + Math.cos(a) * 38).toFixed(1)}" y2="${(44 + Math.sin(a) * 38).toFixed(1)}"/>`; }).join('');
  const a = Math.PI + (Math.max(0, Math.min(100, v)) / 100) * Math.PI;
  return `<svg class="dial" viewBox="0 0 88 50"><g class="t">${ticks}</g><line class="n" x1="44" y1="44" x2="${(44 + Math.cos(a) * 31).toFixed(1)}" y2="${(44 + Math.sin(a) * 31).toFixed(1)}"/><circle cx="44" cy="44" r="3.2" class="hub"/></svg>`;
}
const CAR = '<svg viewBox="0 0 220 76" class="car"><path class="body" d="M10 54C12 44 30 40 52 37L86 24C102 17 138 17 158 26L188 37C200 39 208 45 208 53L208 58L10 58Z"/><path class="glass" d="M90 28L106 21C122 19 138 20 150 27L159 36L84 36Z"/><circle cx="56" cy="58" r="13" class="wheel"/><circle cx="168" cy="58" r="13" class="wheel"/><circle cx="56" cy="58" r="6" class="hub"/><circle cx="168" cy="58" r="6" class="hub"/></svg>';
const PLAN = {
  hotel: '<svg viewBox="0 0 200 130" class="plan"><rect x="8" y="8" width="184" height="114"/><rect x="18" y="40" width="60" height="70" class="f"/><rect x="18" y="40" width="60" height="16" class="f2"/><rect x="132" y="14" width="52" height="30" class="f"/><path d="M120 122a22 22 0 0 0-22-22v22" class="d"/><line x1="40" y1="8" x2="150" y2="8" class="w"/><rect x="140" y="80" width="44" height="34" class="f"/></svg>',
  flat: '<svg viewBox="0 0 200 130" class="plan"><rect x="8" y="8" width="184" height="114"/><line x1="120" y1="8" x2="120" y2="70"/><line x1="120" y1="92" x2="120" y2="122"/><rect x="130" y="14" width="54" height="64" class="f"/><rect x="18" y="80" width="64" height="30" class="f"/><rect x="18" y="16" width="40" height="22" class="f"/><path d="M60 122a20 20 0 0 0-20-20v20" class="d"/><line x1="30" y1="8" x2="110" y2="8" class="w"/></svg>',
};
const seal = () => `<div class="seal">${T('<span>纪</span><span>白</span>', '<span>J</span><span>B</span>')}</div>`;

const CSS = `
#profile { position: fixed; inset: 0; z-index: 29; color: var(--rt-gold-hi); font-family: var(--rt-serif); overflow: hidden;
  background: radial-gradient(120% 90% at 20% 70%, #12313a 0%, #0b1a20 38%, #06090c 78%), var(--rt-ink); }
#profile.hidden { display: none; }
#profile::before { content: ''; position: absolute; inset: 0; pointer-events: none; opacity: .5; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .6 0 0 0 0 .55 0 0 0 0 .45 0 0 0 .45 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>"); }
#profile .frame { position: absolute; inset: 14px; pointer-events: none; }
#profile .frame svg { position: absolute; width: 100%; height: 100%; overflow: visible; }
#profile .frame path, #profile .frame line { fill: none; stroke: var(--rt-gold); stroke-width: 1; vector-effect: non-scaling-stroke; opacity: .7; }
#profile .sun { position: absolute; left: 21%; top: 42%; width: 76vh; height: 76vh; transform: translate(-50%, -50%); opacity: .13; pointer-events: none; animation: rt-turn 240s linear infinite; }
#profile .sun line { stroke: var(--rt-gold-hi); stroke-width: .6; }
@keyframes rt-turn { to { transform: translate(-50%, -50%) rotate(360deg); } }
#profile .stage { position: absolute; left: 3%; top: 4%; bottom: 4%; width: 36%; }
#profile .art { position: absolute; inset: 0 0 12% 9%; overflow: hidden; --m1: linear-gradient(180deg, transparent 0, #000 14%, #000 62%, transparent 100%); --m2: linear-gradient(90deg, transparent 0, #000 16%, #000 80%, transparent 100%); -webkit-mask-image: var(--m1), var(--m2); -webkit-mask-composite: source-in; mask-image: var(--m1), var(--m2); mask-composite: intersect; }
#profile .art img { width: 100%; height: 100%; object-fit: cover; object-position: 58% 18%; filter: saturate(.82) contrast(1.06) brightness(.86); transform: scale(1.02); animation: rt-breathe 14s ease-in-out infinite alternate; }
#profile .art::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(11,26,32,.25), rgba(11,26,32,0) 30%, rgba(7,11,15,.75) 92%), linear-gradient(90deg, rgba(105,210,255,.18), transparent 40%, rgba(236,190,110,.22)); mix-blend-mode: multiply; }
#profile .art::before { content: ''; position: absolute; inset: 0; z-index: 1; background: radial-gradient(60% 50% at 85% 30%, rgba(236,190,110,.25), transparent 70%); mix-blend-mode: screen; pointer-events: none; }
@keyframes rt-breathe { to { transform: scale(1.06) translateY(-1%); } }
#profile .stage.three .art { display: none; } #profile .stage:not(.three) .portrait { display: none; }
#profile .view { position: absolute; right: 4%; top: 2%; z-index: 2; background: none; border: 1px solid var(--rt-gold-lo); color: var(--rt-gold); font: 11px var(--rt-thin); letter-spacing: .3em; padding: 4px 10px; cursor: pointer; }
#profile .view:hover { color: var(--rt-gold-hi); border-color: var(--rt-gold); }
#profile .mood { display: flex; align-items: center; gap: 16px; margin-top: 18px; }
#profile .mood .cameo { width: 74px; height: 92px; border-radius: 50% / 46%; overflow: hidden; box-shadow: 0 0 0 1px var(--rt-gold), 0 0 0 5px rgba(200,163,90,.15), 0 8px 24px rgba(0,0,0,.5); flex: none; }
#profile .mood .cameo img { width: 100%; height: 100%; object-fit: cover; filter: saturate(.85); }
#profile .mood .t { font: 11px var(--rt-thin); letter-spacing: .4em; color: var(--rt-gold); } #profile .mood .w { font-family: var(--rt-hand); font-size: 22px; color: #f1e2bd; margin-top: 4px; }
#profile .portrait { position: absolute; inset: 0 0 14% 0; } #profile .portrait canvas { width: 100%; height: 100%; display: block; cursor: grab; }
#profile .portrait.none::after { content: ''; position: absolute; left: 50%; bottom: 6%; width: 28%; height: 78%; transform: translateX(-50%); border-radius: 40% 40% 8% 8%; background: linear-gradient(#1c3a44, #081217); box-shadow: 0 0 60px rgba(105,210,255,.18); }
#profile .name { position: absolute; left: 8%; bottom: 3%; right: 0; }
#profile .name .zh { display: inline-block; font-family: 'JB Hand', var(--rt-serif); font-size: clamp(64px, 9.5vh, 112px); line-height: .9; color: #f4e6c4; text-shadow: 0 0 30px rgba(236,212,154,.25); letter-spacing: .04em; }
#profile.en .name .zh { font-family: var(--rt-deco); font-size: clamp(46px, 7vh, 80px); letter-spacing: .08em; }
#profile .name .lat { font-family: var(--rt-thin); letter-spacing: .6em; font-size: 13px; color: var(--rt-gold); margin: 10px 0 4px 4px; text-transform: uppercase; }
#profile .name .sub { font-size: 14px; color: rgba(236,212,154,.7); margin-left: 4px; letter-spacing: .08em; }
#profile .seal { display: inline-grid; vertical-align: top; margin: 6px 0 0 14px; grid-template-columns: 1fr; width: 34px; padding: 3px 0; background: var(--rt-seal); color: #f6e9d6; font: 700 15px/1.05 'RT Serif', serif; text-align: center; border-radius: 3px; transform: rotate(-4deg); box-shadow: 0 0 0 1px rgba(246,233,214,.25) inset, 0 2px 8px rgba(0,0,0,.4); opacity: .92; }
#profile .tidegauge { position: absolute; left: 0; top: 14%; bottom: 22%; width: 34px; }
#profile .tidegauge .col { position: absolute; left: 14px; top: 0; bottom: 0; width: 6px; border: 1px solid var(--rt-gold-lo); border-radius: 3px; overflow: hidden; }
#profile .tidegauge .col i { position: absolute; left: 0; right: 0; bottom: 0; background: linear-gradient(#7fe0ff, #2a7f95); box-shadow: 0 0 14px rgba(127,224,255,.6); }
#profile .tidegauge .tk { position: absolute; left: 8px; width: 6px; height: 1px; background: var(--rt-gold); opacity: .6; }
#profile .tidegauge .lb { position: absolute; left: 26px; top: 0; writing-mode: vertical-rl; font-size: 12px; letter-spacing: .35em; color: rgba(236,212,154,.75); }
#profile .tidegauge .v { position: absolute; left: 6px; bottom: -26px; font: 600 15px var(--rt-serif); color: #9fe6ff; }
#profile .page { position: absolute; left: 42%; right: 4%; top: 6%; bottom: 5%; display: grid; grid-template-rows: auto 1fr auto; }
#profile nav { display: flex; gap: 6px; align-items: flex-end; border-bottom: 1px solid var(--rt-gold-lo); padding-bottom: 10px; }
#profile nav .kc { font: 12px var(--rt-thin); border: 1px solid var(--rt-gold-lo); color: var(--rt-gold); border-radius: 3px; padding: 1px 6px; margin: 0 6px 8px; letter-spacing: 0; }
#profile nav button { flex: 1; background: none; border: 0; color: rgba(236,212,154,.42); cursor: pointer; padding: 2px 0 0; text-align: center; transition: color .25s; position: relative; }
#profile nav button b { display: block; font: 22px var(--rt-deco); line-height: 1.1; }
#profile nav button span { display: block; font-size: 13px; letter-spacing: .3em; margin-top: 3px; }
#profile.en nav button span { letter-spacing: .12em; font-size: 12px; text-transform: uppercase; font-family: var(--rt-thin); }
#profile nav button:hover { color: rgba(236,212,154,.75); }
#profile nav button.on { color: var(--rt-gold-hi); }
#profile nav button.on::after { content: ''; position: absolute; left: 30%; right: 30%; bottom: -11px; height: 3px; background: linear-gradient(90deg, transparent, var(--rt-gold-hi), transparent); }
#profile nav button.on::before { content: '◆'; position: absolute; left: 50%; top: -14px; transform: translateX(-50%); font-size: 8px; color: var(--rt-gold-hi); }
#profile .esc { position: absolute; right: 4%; top: 2.2%; font: 12px var(--rt-thin); letter-spacing: .3em; color: var(--rt-gold); cursor: pointer; background: none; border: 0; }
#profile .body { position: relative; overflow: auto; padding: 26px 4px 10px; scrollbar-width: thin; scrollbar-color: var(--rt-gold-lo) transparent; }
#profile .foot { border-top: 1px solid var(--rt-gold-lo); padding-top: 8px; display: flex; justify-content: space-between; font: 12px var(--rt-thin); letter-spacing: .25em; color: rgba(236,212,154,.5); }
#profile .rise > * { animation: rt-rise .6s cubic-bezier(.2,.8,.2,1) both; } ${Array.from({ length: 10 }, (_, i) => `#profile .rise > *:nth-child(${i + 1}) { animation-delay: ${i * 70}ms; }`).join(' ')}
@keyframes rt-rise { from { opacity: 0; transform: translateY(10px); } }
#profile .eyebrow { font: 12px var(--rt-thin); letter-spacing: .45em; color: var(--rt-gold); text-transform: uppercase; margin-bottom: 8px; }
#profile .hand { font-family: var(--rt-hand); color: #f1e2bd; }
#profile .rule { height: 14px; margin: 22px 0; background: center / 100% 1px no-repeat linear-gradient(90deg, transparent, var(--rt-gold-lo) 15%, var(--rt-gold-lo) 85%, transparent); position: relative; }
#profile .rule::after { content: '◇'; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -54%); font-size: 11px; color: var(--rt-gold); background: #0a161b; padding: 0 8px; }
/* Ⅰ now */
#profile .date { font-weight: 700; font-size: clamp(30px, 4.4vh, 46px); letter-spacing: .06em; color: #f4e6c4; }
#profile .date small { font: 400 15px var(--rt-thin); letter-spacing: .4em; color: var(--rt-gold); margin-left: 14px; vertical-align: middle; }
#profile .act { font-family: 'JB Hand', var(--rt-serif); font-size: 22px; color: var(--rt-gold); margin-top: 4px; } #profile.en .act { font-family: var(--rt-deco); font-size: 16px; letter-spacing: .14em; }
#profile .lines { margin-top: 18px; font-size: 26px; line-height: 1.5; } #profile.en .lines { font-size: 25px; }
#profile .lines div { animation: rt-write 1.1s steps(18) both; clip-path: inset(0 0 0 0); } ${Array.from({ length: 8 }, (_, i) => `#profile .lines div:nth-child(${i + 1}) { animation-delay: ${200 + i * 260}ms; }`).join(' ')}
@keyframes rt-write { from { clip-path: inset(0 100% 0 0); } }
#profile .letter { position: relative; margin-top: 4px; padding: 18px 22px 18px 24px; max-width: 560px; color: var(--rt-paper-ink); border-radius: 2px; transform: rotate(-.6deg);
  background: linear-gradient(180deg, rgba(255,255,255,.35), rgba(255,255,255,0) 30%), var(--rt-paper); box-shadow: 0 18px 40px rgba(0,0,0,.45); }
#profile .letter .t { font-weight: 700; font-size: 19px; } #profile .letter .s { font-family: var(--rt-hand); font-size: 21px; color: #23345e; margin-top: 6px; }
#profile .letter .wax { position: absolute; right: -12px; top: -12px; width: 40px; height: 40px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #d2483b, #8d211a 70%); box-shadow: 0 3px 8px rgba(0,0,0,.4); color: #f4d9c0; font: 700 14px/40px 'RT Serif'; text-align: center; }
#profile .plaques { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 26px; }
#profile .plaque { position: relative; padding: 14px 16px; text-align: center; clip-path: polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px); background: linear-gradient(rgba(200,163,90,.10), rgba(200,163,90,.03)); }
#profile .plaque::before { content: ''; position: absolute; inset: 4px; border: 1px solid var(--rt-gold-lo); clip-path: inherit; }
#profile .plaque b { display: block; font-weight: 600; font-size: 26px; color: #f4e6c4; } #profile .plaque span { font: 11px var(--rt-thin); letter-spacing: .35em; color: var(--rt-gold); }
/* Ⅱ craft */
#profile .medals { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
#profile .medal { width: 136px; display: block; margin: 0 auto; }
#profile .medal .rays line { stroke: var(--rt-gold); stroke-width: 1; opacity: .55; } #profile .medal .disc { fill: #0d1f25; stroke: var(--rt-gold); stroke-width: 1; } #profile .medal .ring { fill: none; stroke: var(--rt-gold-lo); }
#profile .medal .arcs path { fill: none; stroke: rgba(200,163,90,.2); stroke-width: 5; stroke-linecap: round; } #profile .medal .arcs path.on { stroke: var(--rt-gold-hi); filter: drop-shadow(0 0 4px rgba(236,212,154,.7)); }
#profile .medal text { font: 34px var(--rt-deco); fill: var(--rt-gold-hi); }
#profile .craft { text-align: center; } #profile .craft h4 { margin: 8px 0 2px; font-size: 19px; font-weight: 700; color: #f4e6c4; letter-spacing: .1em; }
#profile .craft .perk { font: 11px var(--rt-thin); letter-spacing: .25em; color: var(--rt-gold); text-transform: uppercase; min-height: 2.6em; }
#profile .craft .hand { font-size: 19px; line-height: 1.35; margin-top: 8px; }
#profile .craft .xp { font-size: 12px; color: rgba(236,212,154,.5); margin-top: 6px; letter-spacing: .1em; }
#profile .line { position: relative; display: flex; justify-content: space-between; margin: 18px 10px 4px; }
#profile .line::before { content: ''; position: absolute; left: 12px; right: 12px; top: 11px; height: 6px; border-radius: 3px; background: #2e6d8e; box-shadow: 0 0 12px rgba(46,109,142,.5); }
#profile .line .st { position: relative; width: 20%; text-align: center; font-size: 13px; color: rgba(236,212,154,.55); }
#profile .line .st i { display: block; width: 18px; height: 18px; margin: 2px auto 8px; border-radius: 50%; background: #0b1a20; border: 3px solid #8fb6c9; }
#profile .line .st.done { color: #f4e6c4; } #profile .line .st.done i { background: var(--rt-gold-hi); border-color: var(--rt-gold-hi); }
#profile .line .st.cur i { background: #e8423a; border-color: #ffd0c8; box-shadow: 0 0 0 5px rgba(232,66,58,.25); animation: rt-pulse 1.6s infinite; }
@keyframes rt-pulse { 50% { box-shadow: 0 0 0 9px rgba(232,66,58,.05); } }
#profile .ribbon { display: flex; height: 16px; border-radius: 2px; overflow: hidden; margin: 12px 0 8px; box-shadow: 0 0 0 1px var(--rt-gold-lo); }
#profile .ribbon i { display: block; height: 100%; }
#profile .keys { display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 14px; } #profile .keys span::before { content: ''; display: inline-block; width: 9px; height: 9px; transform: rotate(45deg); margin-right: 8px; background: var(--c); }
#profile .works { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 4px; }
/* Ⅲ errands */
#profile .err { display: grid; grid-template-columns: 46px 1fr; gap: 4px 14px; padding: 12px 0; border-bottom: 1px solid rgba(200,163,90,.14); }
#profile .err .rn { font: 28px var(--rt-deco); color: var(--rt-gold); text-align: center; line-height: 1.1; } #profile .err .t { font-weight: 700; font-size: 20px; color: #f4e6c4; }
#profile .err .t em { font: normal 11px var(--rt-thin); letter-spacing: .3em; color: #0b1a20; background: var(--rt-gold); padding: 1px 8px; margin-left: 10px; vertical-align: 3px; }
#profile .err .s { grid-column: 2; font-family: var(--rt-hand); font-size: 20px; color: #e9d6aa; }
#profile .err .dots { grid-column: 2; display: flex; gap: 6px; } #profile .err .dots i { width: 7px; height: 7px; transform: rotate(45deg); border: 1px solid var(--rt-gold); } #profile .err .dots i.on { background: var(--rt-gold); }
/* Ⅳ money */
#profile .money { display: grid; grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr); gap: 26px; align-items: start; }
#profile .slips { display: grid; gap: 10px; }
#profile .slip { display: grid; grid-template-columns: 6px 1fr auto; gap: 14px; align-items: baseline; padding: 10px 0; border-bottom: 1px solid rgba(200,163,90,.14); }
#profile .slip i { width: 6px; height: 22px; align-self: center; border-radius: 1px; } #profile .slip span { font-size: 15px; color: rgba(236,212,154,.8); letter-spacing: .1em; }
#profile .slip b { font-weight: 600; font-size: 28px; color: #f4e6c4; font-variant-numeric: oldstyle-nums; }
#profile .slip.total b { font-size: 38px; color: var(--rt-gold-hi); } #profile .slip.total span { color: var(--rt-gold); }
#profile .ledger { position: relative; padding: 22px 24px 30px 52px; color: var(--rt-paper-ink); transform: rotate(.5deg); box-shadow: 0 20px 44px rgba(0,0,0,.5);
  background: linear-gradient(90deg, transparent 38px, rgba(179,53,42,.45) 38px, rgba(179,53,42,.45) 39px, transparent 39px), repeating-linear-gradient(180deg, transparent 0 31px, rgba(43,42,51,.14) 31px 32px), var(--rt-paper); background-position: 0 0, 0 12px, 0 0; }
#profile .ledger h5 { margin: 0 0 8px; font-size: 13px; letter-spacing: .4em; color: #6b5b3a; font-weight: 700; }
#profile .ledger .row { display: grid; grid-template-columns: 1fr auto; gap: 10px; font-family: var(--rt-hand); font-size: 19px; line-height: 32px; color: #23345e; }
#profile .ledger .row b { font-weight: 400; } #profile .ledger .row b.in { color: #2e6a3a; }
#profile .ledger .stamp { position: absolute; right: 18px; bottom: -16px; padding: 6px 12px; border: 2.5px solid rgba(179,53,42,.85); color: rgba(179,53,42,.9); font: 700 20px var(--rt-serif); transform: rotate(-8deg); border-radius: 4px; background: rgba(239,229,207,.6); mix-blend-mode: multiply; }
#profile .ledger .stamp small { display: block; font-size: 10px; letter-spacing: .3em; }
/* Ⅴ name */
#profile .say { display: grid; grid-template-columns: 92px 1fr; gap: 6px 20px; align-items: center; padding: 14px 0; border-bottom: 1px solid rgba(200,163,90,.14); }
#profile .dial { width: 88px; } #profile .dial .t line { stroke: var(--rt-gold); stroke-width: 1; opacity: .7; } #profile .dial .n { stroke: #f0d48a; stroke-width: 2; stroke-linecap: round; } #profile .dial .hub { fill: var(--rt-gold-hi); }
#profile .say q { font-style: italic; font-size: 22px; color: #f4e6c4; quotes: '“' '”'; } #profile .say .who { font: 12px var(--rt-thin); letter-spacing: .25em; color: var(--rt-gold); margin-top: 4px; text-transform: uppercase; }
#profile .say .lbl { font-size: 13px; text-align: center; color: rgba(236,212,154,.7); letter-spacing: .1em; margin-top: -4px; } #profile .say .lbl b { display: block; font: 600 20px var(--rt-serif); color: #f4e6c4; }
/* Ⅵ things */
#profile .estate { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; }
#profile .plan { width: 100%; max-width: 280px; } #profile .plan rect, #profile .plan line, #profile .plan path { fill: none; stroke: #b9d6e2; stroke-width: 1.3; } #profile .plan .f { fill: rgba(185,214,226,.08); stroke-width: .8; } #profile .plan .f2 { fill: rgba(185,214,226,.18); stroke-width: .8; }
#profile .plan .w { stroke: #7fe0ff; stroke-width: 3.5; } #profile .plan .d { stroke-dasharray: 3 3; }
#profile .blueprint { padding: 16px; background: linear-gradient(rgba(127,224,255,.05), rgba(127,224,255,.02)), repeating-linear-gradient(0deg, rgba(127,224,255,.06) 0 1px, transparent 1px 16px), repeating-linear-gradient(90deg, rgba(127,224,255,.06) 0 1px, transparent 1px 16px); border: 1px solid rgba(127,224,255,.2); }
#profile .blueprint .cap { font-size: 16px; color: #e4f3f8; margin-top: 8px; } #profile .blueprint .cap small { display: block; font-size: 12px; color: rgba(185,214,226,.7); letter-spacing: .08em; }
#profile .car { width: 100%; max-width: 300px; } #profile .car .body { fill: var(--c, #555); stroke: rgba(255,255,255,.4); stroke-width: .8; } #profile .car .glass { fill: rgba(10,20,26,.85); } #profile .car .wheel { fill: #0b0f12; stroke: #555; } #profile .car .hub { fill: #888; }
#profile .plate { display: inline-block; margin-top: 10px; padding: 3px 12px; border: 2px solid #e8eef4; border-radius: 4px; background: #1a4fb5; color: #fff; font: 700 17px 'RT Serif', sans-serif; letter-spacing: .12em; box-shadow: inset 0 0 0 1px #0d2e72; }
#profile .slots { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 10px; margin-top: 6px; }
#profile .slot { position: relative; aspect-ratio: 1; display: grid; place-items: center; color: var(--rt-gold-hi); clip-path: polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px); background: radial-gradient(circle at 50% 40%, rgba(200,163,90,.16), rgba(200,163,90,.03) 70%); }
#profile .slot::before { content: ''; position: absolute; inset: 3px; border: 1px solid var(--rt-gold-lo); clip-path: inherit; }
#profile .slot.made { color: #9fe6ff; background: radial-gradient(circle at 50% 40%, rgba(127,224,255,.18), rgba(127,224,255,.03) 70%); }
#profile .slot.empty { opacity: .35; } #profile .slot small { position: absolute; left: 6px; right: 6px; bottom: 6px; font-size: 11px; text-align: center; line-height: 1.2; color: rgba(236,212,154,.85); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#profile .slot svg { margin-bottom: 12px; }
/* Ⅶ the tide */
#profile .body.tide { padding: 0; overflow: hidden; } #profile .tidecv { position: absolute; inset: 0; width: 100%; height: 100%; display: block; cursor: crosshair; }
#profile .who { position: absolute; right: 8px; top: 18px; width: min(300px, 44%); padding: 18px 20px; background: linear-gradient(rgba(7,11,15,.82), rgba(7,11,15,.66)); border: 1px solid var(--rt-gold-lo); backdrop-filter: blur(6px); }
#profile .who h4 { margin: 0; font-weight: 700; font-size: 26px; color: #f4e6c4; } #profile .who .r { font-size: 13px; color: rgba(236,212,154,.7); margin: 2px 0 10px; }
#profile .who .st { font: 11px var(--rt-thin); letter-spacing: .35em; color: var(--rt-gold); text-transform: uppercase; } #profile .who .hand { font-size: 21px; margin: 10px 0 6px; }
#profile .who .k { display: flex; justify-content: space-between; font-size: 13px; color: rgba(236,212,154,.75); border-top: 1px solid rgba(200,163,90,.15); padding-top: 6px; margin-top: 6px; }
#profile .legend { position: absolute; left: 6px; bottom: 6px; display: flex; gap: 16px; font-size: 13px; color: rgba(236,212,154,.75); } #profile .legend i { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 6px; box-shadow: 0 0 8px currentColor; }
#profile .hint { position: absolute; left: 6px; top: 10px; font-family: var(--rt-hand); font-size: 18px; color: rgba(236,212,154,.6); }
@media (max-width: 860px) { #profile .stage { width: 100%; height: 36%; left: 0; top: 2%; } #profile .page { left: 4%; top: 38%; } #profile .medals, #profile .money, #profile .plaques { grid-template-columns: 1fr; } #profile nav button span { display: none; } }
`;

export function createProfile({ getLife, defs = [], getPeople = () => null, onClose = null }) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const root = document.createElement('div'); root.id = 'profile'; root.className = 'hidden'; root.setAttribute('role', 'dialog');
  const sunRays = Array.from({ length: 72 }, (_, i) => { const a = (i / 72) * Math.PI * 2; return `<line x1="${(50 + Math.cos(a) * (i % 2 ? 18 : 10)).toFixed(2)}" y1="${(50 + Math.sin(a) * (i % 2 ? 18 : 10)).toFixed(2)}" x2="${(50 + Math.cos(a) * 50).toFixed(2)}" y2="${(50 + Math.sin(a) * 50).toFixed(2)}"/>`; }).join('');
  // the frame: a hairline double border with stepped Deco corners and a fan at the top
  const corner = 'M0 64V18h8V8h10V0h46';
  root.innerHTML = `<svg class="sun" viewBox="0 0 100 100">${sunRays}<circle cx="50" cy="50" r="10" fill="none" stroke="#ecd49a" stroke-width=".4"/></svg>
    <div class="frame"><svg preserveAspectRatio="none"><path d="${corner}"/><path d="${corner}" transform="translate(6 6)"/></svg>
      <svg style="transform:scaleX(-1)"><path d="${corner}"/><path d="${corner}" transform="translate(6 6)"/></svg>
      <svg style="transform:scaleY(-1)"><path d="${corner}"/><path d="${corner}" transform="translate(6 6)"/></svg>
      <svg style="transform:scale(-1,-1)"><path d="${corner}"/><path d="${corner}" transform="translate(6 6)"/></svg></div>
    <div class="stage"></div><div class="page"><nav></nav><div class="body"></div><div class="foot"></div></div><button class="esc" data-x>ESC · ${'返回'}</button>`;
  document.body.appendChild(root);
  const stage = root.querySelector('.stage'), nav = root.querySelector('nav'), body = root.querySelector('.body'), foot = root.querySelector('.foot');
  const portrait = createPortrait(getPeople);
  const S = { open: false, tab: 'now', sel: null, V: null, three: false };
  let tide = null;

  function renderStage(V) {
    const e = V.me.energy;
    stage.innerHTML = `<div class="art"><img src="./people/jibai/hero.jpg" alt=""></div><button class="view" data-view>${S.three ? T('立 绘', 'ART') : '3D'}</button>`;
    stage.classList.toggle('three', !!S.three);
    stage.appendChild(portrait.el);
    stage.insertAdjacentHTML('beforeend', `<div class="tidegauge" title="${T('精力', 'Energy')}"><div class="col"><i style="height:${e}%"></i></div>${[0, 25, 50, 75, 100].map((p) => `<span class="tk" style="bottom:${p}%"></span>`).join('')}<span class="lb">${T('精力 · 潮位', 'ENERGY · TIDE')}</span><span class="v">${e}</span></div>
      <div class="name"><div class="zh">${esc(V.me.name)}</div>${seal()}<div class="lat">${T('JI BAI', 'JI BAI · 纪白')}</div><div class="sub">${T(`${V.me.age} 岁 · 回国第 ${daysBack(getLife())} 天`, `${V.me.age} · day ${daysBack(getLife())} back`)}</div></div>`);
  }
  function renderNav() {
    nav.innerHTML = `<span class="kc">A</span>${TABS.map(([id, zh, en], i) => `<button data-tab="${id}" class="${S.tab === id ? 'on' : ''}"><b>${ROMAN[i]}</b><span>${T(zh, en)}</span></button>`).join('')}<span class="kc">D</span>`;
    foot.innerHTML = `<span>${T('回 潮', 'RETURNING TIDE')}</span><span>${esc(S.V.me.date)}${S.V.me.act ? ` · ${esc(S.V.me.act)}` : ''}</span>`;
  }

  // ---- the chapters ----
  function now(V) {
    const d = bigDate(V), q = V.quests.active.find((x) => x.tracked) || V.quests.active[0];
    return `<div class="rise"><div><div class="date">${esc(d.big)}<small>${esc(d.small)}</small></div><div class="act">${esc(V.me.act || '')}</div></div>
      ${moodHtml(V)}
      <div class="lines hand">${nowLines(getLife(), V, getLang()).map((l) => `<div>${esc(l)}</div>`).join('')}</div>
      <div class="rule"></div>
      ${q ? `<div><div class="eyebrow">${T('手头的事', 'In hand')}</div><div class="letter"><div class="wax">${T('事', '✦')}</div><div class="t">${esc(q.title)}</div><div class="s">${esc(q.step)}</div></div></div>` : ''}
      <div class="plaques"><div class="plaque"><b>¥${num(V.money.net)}</b><span>${T('身家', 'WORTH')}</span></div><div class="plaque"><b>${esc((V.people[0] || {}).name || '—')}</b><span>${T('最亲近', 'CLOSEST')}</span></div><div class="plaque"><b>${V.rep[1].v}</b><span>${T('口碑', 'NAME')}</span></div></div></div>`;
  }
  // his face today (the expressions from his character sheet, public/people/jibai/)
  function moodHtml(V) {
    const m = moodOf(getLife(), V), W = { neutral: ['平常', 'As usual'], smile: ['心情不错', 'In a good mood'], laugh: ['很高兴', 'Happy'], serious: ['在想事情', 'Preoccupied'], thinking: ['在琢磨', 'Turning it over'], surprised: ['有点意外', 'Caught off guard'], concerned: ['有心事', 'Worried'], sad: ['有点难过', 'Low'] }[m];
    return `<div class="mood"><div class="cameo"><img src="./people/jibai/face-${m}.jpg" alt=""></div><div><div class="t">${T('今天的他', 'TODAY')}</div><div class="w">${T(W[0], W[1])}</div></div></div>`;
  }
  function craft(V) {
    const H = V.time.hours, sum = Object.values(H).reduce((a, b) => a + b, 0), lang = getLang();
    const U = [['make', '做东西', 'Making', '#c8a35a'], ['love', '陪她', 'With her', '#e07a8f'], ['friends', '朋友家人', 'Friends & family', '#7fb8e6'], ['business', '生意', 'Business', '#9ad0a6'], ['rest', '休息', 'Rest', '#6f7f99']];
    const cur = V.project.steps.findIndex((s) => !s.done);
    return `<div class="rise"><div class="medals">${V.skills.map((s) => { const n = SKILL_NOTE[s.id][s.level]; return `<div class="craft">${medallion(s.level)}<h4>${esc(s.name)}</h4><div class="perk">${esc(s.perk || s.what)}</div><div class="hand">${n ? esc(lang === 'zh' ? n[0] : n[1]) : ''}</div><div class="xp">${s.next ? `${num(s.xp)} / ${num(s.next)}` : T('已至极致', 'mastered')}</div></div>`; }).join('')}</div>
      <div class="rule"></div>
      <div><div class="eyebrow">${T('夜行云台 · 到上市的路', 'The night gimbal · the line to a launch')}</div>${V.project.has ? `<div class="line">${V.project.steps.map((s, i) => `<div class="st ${s.done ? 'done' : i === cur ? 'cur' : ''}"><i></i>${esc(s.text)}</div>`).join('')}</div>` : `<div class="hand" style="font-size:20px">${T('还没做出来。先去杨浦把它焊出来。', 'Not built yet. First, solder it together in Yangpu.')}</div>`}</div>
      ${V.project.built.length ? `<div style="margin-top:22px"><div class="eyebrow">${T('亲手做的', 'Made by hand')}</div><div class="works">${V.project.built.map((b) => `<div class="slot made" style="width:92px">${svgIcon(ICON[b.id] || ICON.box, 34)}<small>${esc(b.name)}</small></div>`).join('')}</div></div>` : ''}
      <div class="rule"></div>
      <div><div class="eyebrow">${T('时间都去哪儿了', 'Where the time went')}</div>${sum ? `<div class="ribbon">${U.map(([u, , , c]) => `<i style="width:${(H[u] / sum * 100).toFixed(1)}%;background:${c}"></i>`).join('')}</div><div class="keys">${U.map(([u, zh, en, c]) => `<span style="--c:${c}">${T(zh, en)} ${Math.round(H[u] / sum * 100)}%</span>`).join('')}</div>` : `<div class="hand" style="font-size:20px">${T('一年才刚开始。', 'The year has only just begun.')}</div>`}</div></div>`;
  }
  function errands(V) {
    const Q = V.quests;
    if (!Q.active.length) return `<div class="rise"><div class="hand" style="font-size:26px;margin-top:10px">${T('今晚没什么非做不可的事。走走吧。', 'Nothing that has to be done tonight. Take a walk.')}</div></div>`;
    return `<div class="rise">${Q.active.map((q, i) => `<div class="err"><div class="rn">${ROMAN[i] || '·'}</div><div class="t">${esc(q.title)}${q.main ? `<em>${T('主线', 'MAIN')}</em>` : ''}</div><div class="s">${esc(q.step)}</div><div class="dots">${Array.from({ length: q.of }, (_, k) => `<i class="${k < q.done ? 'on' : ''}"></i>`).join('')}</div></div>`).join('')}
      <div style="margin-top:16px;font-size:13px;color:rgba(236,212,154,.55);letter-spacing:.1em">${T(`已了结 ${Q.done} 件${Q.failed ? ` · 错过 ${Q.failed} 件` : ''} · 完整的记录在日志里（J）`, `${Q.done} settled${Q.failed ? ` · ${Q.failed} missed` : ''} · the full record is in the journal (J)`)}</div></div>`;
  }
  function money(V) {
    const M = V.money;
    const rows = M.recent.map((e) => `<div class="row"><span>${esc(e.to)}${e.memo ? ` · ${esc(e.memo)}` : ''}</span><b class="${e.in ? 'in' : ''}">${e.in ? '+' : '−'}${num(Math.abs(e.amount))}</b></div>`).join('');
    return `<div class="rise money"><div class="slips">
        <div class="slip total"><i style="background:var(--rt-gold-hi)"></i><span>${T('身家', 'Worth')}</span><b>¥${num(M.net)}</b></div>
        <div class="slip"><i style="background:#2aae67"></i><span>${T('微信', 'WeChat')}</span><b>${num(M.wechat)}</b></div>
        <div class="slip"><i style="background:#1677ff"></i><span>${T('支付宝', 'Alipay')}</span><b>${num(M.alipay)}</b></div>
        <div class="slip"><i style="background:#c8a35a"></i><span>${T('银行卡', 'Bank')}</span><b>${num(M.bank)}</b></div>
        <div class="slip"><i style="background:#b3352a"></i><span>${T('信用卡欠', 'Card owed')}</span><b>${num(M.cardUsed)}</b></div>
        ${M.company != null ? `<div class="slip"><i style="background:#4f8f7b"></i><span>${T('公司账上', 'In the company')}</span><b>${num(M.company)}</b></div>` : ''}
        <div style="margin-top:8px;font-size:14px;color:rgba(236,212,154,.7);line-height:1.8">${M.salary ? T(`每月工资 ¥${num(M.salary)}`, `Salary ¥${num(M.salary)} a month`) : T('没有工资', 'No salary')}<br>${M.rent ? T(`每月房租 ¥${num(M.rent)}`, `Rent ¥${num(M.rent)} a month`) : T('住处公司付', 'The firm pays for his room')}</div></div>
      <div class="ledger"><h5>${T('账 本', 'L E D G E R')}</h5>${rows || `<div class="row"><span>${T('还没花过钱。', 'Nothing spent yet.')}</span><b></b></div>`}<div class="stamp"><small>${T('结余', 'BALANCE')}</small>¥${num(M.net)}</div></div></div>`;
  }
  function name(V) {
    const lang = getLang();
    return `<div class="rise">${V.rep.map((r) => { const s = REP_SAY[r.id], q = s.say[tier(r.v)]; return `<div class="say"><div>${dial(r.v)}<div class="lbl"><b>${r.v}</b>${esc(r.name)}</div></div><div><q>${esc(lang === 'zh' ? q[0] : q[1])}</q><div class="who">— ${esc(lang === 'zh' ? s.who[0] : s.who[1])}</div></div></div>`; }).join('')}</div>`;
  }
  function things(V) {
    const P = V.property, n = Math.max(12, Math.ceil(V.items.length / 6) * 6);
    return `<div class="rise"><div class="estate">
        <div class="blueprint">${P.home.rent || /hotel|饭店/i.test(P.home.name) ? PLAN[/Peace Hotel|和平饭店/.test(P.home.name) ? 'hotel' : 'flat'] : PLAN.flat}<div class="cap">${esc(P.home.name)}<small>${P.home.size ? `${P.home.size} m² · ` : ''}${P.home.rent ? T(`月租 ¥${num(P.home.rent)}`, `¥${num(P.home.rent)} a month`) : T('公司付', 'paid by the firm')}</small></div></div>
        <div class="blueprint">${P.car ? `<div style="--c:${esc(P.car.hex)}">${CAR}</div><div class="cap">${esc(P.car.name)}</div><span class="plate">${esc(P.car.plate)}</span>` : `<div style="--c:rgba(185,214,226,.08);opacity:.6">${CAR}</div><div class="cap">${T('还没有车', 'No car yet')}<small>${T('地铁、轮渡、滴滴', 'The metro, the ferry, DiDi')}</small></div>`}</div>
        ${P.company ? `<div class="blueprint"><div class="cap" style="font-size:22px">${esc(P.company.name)}<small>${P.company.funded ? T('已融资', 'Funded') : T('还没融资', 'Not funded yet')} · ¥${num(P.company.cash)}</small></div></div>` : ''}</div>
      <div class="rule"></div><div class="eyebrow">${T('随身', 'Carried')} · ${V.items.length}</div>
      <div class="slots">${V.items.map((i) => `<div class="slot ${i.kind === 'made' ? 'made' : ''}" title="${esc(i.name)}${i.from ? ` · ${esc(i.from)}` : ''}">${svgIcon(iconOf(i), 34)}<small>${esc(i.name)}</small></div>`).join('')}${Array.from({ length: n - V.items.length }, () => '<div class="slot empty"></div>').join('')}</div></div>`;
  }
  function tideHtml(V) {
    const sel = V.people.find((p) => p.id === S.sel) || V.people[0];
    S.sel = sel ? sel.id : null;
    return `<canvas class="tidecv"></canvas><div class="hint">${T('越靠近他，越亲近。', 'The nearer him, the closer.')}</div>
      ${sel ? `<div class="who"><div class="st">${esc(T(GROUPS[sel.group][0], GROUPS[sel.group][1]))}${sel.stage ? ` · ${esc(sel.stage)}` : ''}</div><h4>${esc(sel.full)}</h4><div class="r">${esc(sel.role)}</div><div class="hand">${esc(personNote(sel, getLang()))}</div>
        <div class="k"><span>${T('潮位', 'Tide')}</span><span>${Math.round(sel.close)}</span></div><div class="k"><span>${T('一起的时间', 'Time together')}</span><span>${sel.hours ? T(`${sel.hours} 小时`, `${sel.hours} h`) : '—'}</span></div></div>` : ''}
      <div class="legend">${Object.entries(GROUPS).filter(([g]) => V.people.some((p) => p.group === g)).map(([, g]) => `<span style="color:${g[2]}"><i style="background:${g[2]}"></i><span style="color:rgba(236,212,154,.8)">${esc(T(g[0], g[1]))}</span></span>`).join('')}</div>`;
  }
  const CH = { now, craft, errands, money, name, things, tide: tideHtml };

  // ---- the tide: lanterns on the river ----
  function startTide(V) {
    stopTide();
    const cv = body.querySelector('.tidecv'); if (!cv) return;
    const ctx = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
    const order = ['heart', 'family', 'friend', 'work', 'other'], groups = order.filter((g) => V.people.some((p) => p.group === g));
    const span = (Math.PI * 2) / Math.max(1, groups.length);
    const L = [];
    groups.forEach((g, gi) => { const ps = V.people.filter((p) => p.group === g), a0 = -Math.PI / 2 - span / 2 + gi * span;
      ps.forEach((p, i) => L.push({ p, a: a0 + span * (ps.length === 1 ? 0.5 : 0.15 + 0.7 * (i / (ps.length - 1))), col: GROUPS[g][2], ph: Math.random() * 6.28 })); });
    let W = 0, H = 0, cx = 0, cy = 0, Rm = 0, hover = null, raf = 0;
    const fit = () => { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); cx = W * 0.4; cy = H * 0.52; Rm = Math.min(W * 0.38, H * 0.44); };
    const pos = (l, t) => { const r = Rm * (0.2 + 0.8 * (1 - l.p.close / 100)), bob = Math.sin(t * 0.0011 + l.ph) * 3; return [cx + Math.cos(l.a) * r, cy + Math.sin(l.a) * r * 0.62 + bob]; };
    const glow = (x, y, r, c, a) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c.replace(')', `,${a})`).replace('rgb', 'rgba')); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); };
    const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return `rgb(${n >> 16},${(n >> 8) & 255},${n & 255})`; };
    function draw(t) {
      raf = requestAnimationFrame(draw);
      if (cv.clientWidth !== W || cv.clientHeight !== H) fit();
      ctx.clearRect(0, 0, W, H);
      // the water: a sheen and ripples spreading from him
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Rm * 1.3); g.addColorStop(0, 'rgba(40,90,105,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (let k = 0; k < 5; k++) { const f = ((t * 0.00006 + k / 5) % 1), r = f * Rm * 1.15; ctx.strokeStyle = `rgba(160,220,235,${0.22 * (1 - f)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.62, 0, 0, 7); ctx.stroke(); }
      ctx.setLineDash([2, 6]); for (const [c, lb] of [[75, T('亲密', 'close')], [50, T('熟悉', 'known')], [25, T('疏远', 'distant')]]) { const r = Rm * (0.2 + 0.8 * (1 - c / 100)); ctx.strokeStyle = 'rgba(200,163,90,0.22)'; ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.62, 0, 0, 7); ctx.stroke(); ctx.fillStyle = 'rgba(200,163,90,0.45)'; ctx.font = '11px "RT Thin", serif'; ctx.fillText(lb, cx + r + 4, cy - 2); } ctx.setLineDash([]);
      // him
      glow(cx, cy, 46, 'rgb(236,212,154)', 0.45); ctx.fillStyle = '#fff3d6'; ctx.beginPath(); ctx.arc(cx, cy, 6, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(236,212,154,0.2)'; ctx.fillRect(cx - 1, cy + 8, 2, 40);
      ctx.font = '600 15px "RT Serif Latin", "RT Serif", serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#f4e6c4'; ctx.fillText(T('纪白', 'Ji Bai'), cx, cy - 16);
      // the lanterns, and their reflections
      for (const l of L) {
        const [x, y] = pos(l, t), c = rgb(l.col), big = 5 + l.p.close / 22, sel = l.p.id === S.sel, hov = hover === l;
        ctx.strokeStyle = l.col; ctx.globalAlpha = l.p.over ? 0.08 : 0.12 + l.p.close / 500; ctx.lineWidth = 0.8 + l.p.close / 50; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.quadraticCurveTo((cx + x) / 2, (cy + y) / 2 + 24, x, y); ctx.stroke(); ctx.globalAlpha = 1;
        const lit = l.p.over ? 0.15 : 0.55 + 0.15 * Math.sin(t * 0.003 + l.ph);
        glow(x, y + big * 3.4, big * 3, c, lit * 0.25);
        glow(x, y, big * (sel || hov ? 5.5 : 4), c, lit);
        ctx.fillStyle = l.p.over ? 'rgba(200,200,200,.4)' : '#fff8ea'; ctx.beginPath(); ctx.arc(x, y, big * 0.45, 0, 7); ctx.fill();
        if (sel) { ctx.strokeStyle = '#ecd49a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, big + 7, 0, 7); ctx.stroke(); }
        ctx.font = `${sel || hov ? 600 : 400} ${sel || hov ? 15 : 13}px "RT Serif Latin", "RT Serif", serif`; ctx.fillStyle = l.p.over ? 'rgba(236,212,154,.35)' : sel || hov ? '#fff3d6' : 'rgba(244,230,196,.85)'; ctx.fillText(l.p.name, x, y - big - 9);
      }
    }
    const pick = (e) => { const b = cv.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top, t = performance.now(); let best = null, bd = 26; for (const l of L) { const [lx, ly] = pos(l, t), d = Math.hypot(lx - x, ly - y); if (d < bd) { bd = d; best = l; } } return best; };
    cv.addEventListener('mousemove', (e) => { hover = pick(e); cv.style.cursor = hover ? 'pointer' : 'default'; });
    cv.addEventListener('click', (e) => { const l = pick(e); if (l) { S.sel = l.p.id; renderBody(false); } });
    fit(); raf = requestAnimationFrame(draw);
    tide = { stop: () => cancelAnimationFrame(raf) };
  }
  function stopTide() { if (tide) { tide.stop(); tide = null; } }

  function renderBody(animate = true) {
    stopTide();
    body.className = `body${S.tab === 'tide' ? ' tide' : ''}`;
    body.innerHTML = CH[S.tab](S.V);
    if (!animate) body.querySelectorAll('.rise').forEach((r) => r.classList.remove('rise'));
    if (S.tab === 'tide') startTide(S.V);
    body.scrollTop = 0;
  }
  function render() {
    if (!S.open) return;
    S.V = profileView(getLife(), defs, getLang());
    root.classList.toggle('en', getLang() !== 'zh');
    root.querySelector('.esc').textContent = `ESC · ${T('返回', 'BACK')}`;
    renderStage(S.V); renderNav(); renderBody();
  }
  const go = (tab) => { if (tab === S.tab) return; S.tab = tab; renderNav(); renderBody(); };
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab],[data-x],[data-view]'); if (!b) return;
    if (b.dataset.x != null) return api.close();
    if (b.dataset.view != null) { S.three = !S.three; renderStage(S.V); if (S.three) portrait.start(); else portrait.stop(); return; }
    if (b.dataset.tab) go(b.dataset.tab);
  });
  const api = {
    get isOpen() { return S.open; },
    open(tab = null) { if (tab) S.tab = tab; S.open = true; root.classList.remove('hidden'); render(); if (S.three) portrait.start(); },
    close() { if (!S.open) return; S.open = false; stopTide(); portrait.stop(); root.classList.add('hidden'); onClose && onClose(); },
    key(k) {
      if (k === 'KeyI' || k === 'Escape') return api.close();
      const i = TABS.findIndex(([id]) => id === S.tab);
      if (k === 'ArrowRight' || k === 'KeyD' || k === 'KeyE') go(TABS[(i + 1) % TABS.length][0]);
      if (k === 'ArrowLeft' || k === 'KeyA' || k === 'KeyQ') go(TABS[(i + TABS.length - 1) % TABS.length][0]);
      if (/^Digit[1-7]$/.test(k)) go(TABS[+k.slice(5) - 1][0]);
    },
  };
  return api;
}
