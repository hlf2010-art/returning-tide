// Every scripted line a character says, with who says it, for tools/voice/generate.py to voice.
// Reads the data modules (Lin and Su, the drivers, phone calls, bumps, the friends' scenes) and
// parses the rest of src/ for what people say inline: say(who, zh, en), hud.bark({ speaker, text }),
// [who, zh, en] script lines, T(zh, en) lines in Vivian's scenes. Template strings with numbers in
// them are left to the runtime voice. node tools/voice/extract.mjs > tools/voice/lines.json
import fs from 'fs';
import path from 'path';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import { T } from '../../src/world/text.js';
import { DRIVERS, OUTBURSTS } from '../../src/world/drivers.js';
import { DRIVER_EN } from '../../src/world/driversEn.js';
import { BARKS } from '../../src/world/barks.js';
import { CALLS } from '../../src/world/agenda.js';
import { enText } from '../../src/world/agendaEn.js';
import { AIA_TALK, AIA_EVENTS } from '../../src/world/aiaTalk.js';

const out = new Map();   // zh text -> { who, zh, en }
const cjk = /[一-鿿]/;
const add = (who, zh, en) => { if (!zh || !cjk.test(zh)) return; zh = zh.trim(); if (!out.has(zh)) out.set(zh, { who, zh, en: (en || '').trim() }); };

// ---- data ----
for (const ex of T.dialogue.exchanges) for (const l of ex.lines) add(l.speaker, l.text, l.en);
for (const g of Object.values(T.dialogue.greetings || {}).flat()) if (g && g.text) add(g.speaker || 'lin', g.text, g.en);
for (const l of Object.values(T.mission.lines || {}).flat()) if (l && l.text) add(l.speaker || 'lin', l.text, l.en);
for (const d of DRIVERS) {
  const walkLines = (o) => { if (!o) return; if (typeof o === 'string') add(`driver:${d.id}`, o, DRIVER_EN[o]); else if (Array.isArray(o)) o.forEach(walkLines); else if (typeof o === 'object') Object.values(o).forEach(walkLines); };
  walkLines(d.lines); walkLines(d.topics); walkLines(d.openers); walkLines(d.talk);
  walkLines(OUTBURSTS[d.id]);
}
for (const [kind, set] of Object.entries(BARKS)) for (const list of Object.values(set)) for (const b of list) {
  if (b.lang === 'wuu') continue;                                   // Shanghainese: subtitles only
  if (b.lang === 'en') add(`bump:${kind}`, b.zh, b.t); else add(`bump:${kind}`, b.t, b.en);
}
for (const c of Object.values(CALLS)) for (const l of c.lines) if (l.text && l.who !== 'me') add(l.who, l.text, l.en);
// the AIA lobby's agents and clients (Shanghainese is subtitles only)
for (const exs of [...Object.values(AIA_TALK), ...Object.values(AIA_EVENTS)]) for (const ex of exs) for (const [who, zh, en, lang] of ex) if (lang !== 'wuu') add(`aia:${who}`, zh, en);

// ---- inline lines in the source ----
const FILE_SPEAKER = { 'carSale.js': 'vivian' }, LINE_FNS = new Set(['T', 'B']);
// the five's own files (src/world/romance/*.js) name their speaker by a variable: say(W, ...) is her
const HER_FILE = /^(zhiwei|nanxing|gunian|yuan|kexin)\.js$/;
const lit = (n) => (n && n.type === 'Literal' && typeof n.value === 'string' ? n.value : n && n.type === 'TemplateLiteral' && n.expressions.length === 0 ? n.quasis[0].value.cooked : null);
const tCall = (n) => (n && n.type === 'CallExpression' && n.callee.type === 'Identifier' && LINE_FNS.has(n.callee.name) && n.arguments.length >= 2 ? [lit(n.arguments[0]), lit(n.arguments[1])] : null);
const whoOf = (n) => { const t = tCall(n); if (t) return t[0]; const l = lit(n); if (l) return l; if (n && n.type === 'ObjectExpression') { const z = n.properties.find((p) => p.key && (p.key.name === 'zh' || p.key.value === 'zh')); return z ? lit(z.value) : null; } return null; };
function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : e.name.endsWith('.js') ? [path.join(dir, e.name)] : [])); }
for (const f of files('src')) {
  const src = fs.readFileSync(f, 'utf8');
  let ast; try { ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module' }); } catch { continue; }
  const base = path.basename(f);
  walk.full(ast, (n) => {
    if (n.type === 'CallExpression') {
      const name = n.callee.type === 'Identifier' ? n.callee.name : n.callee.type === 'MemberExpression' && n.callee.property.name;
      if (name === 'say' && n.arguments.length >= 3) {
        // say(who, zh, en) or say(label, whoKey, zh, en): the first Chinese literal is the line
        const args = n.arguments.map(lit), i = args.findIndex((x) => x && cjk.test(x) && x.length > 2 && !/^[\u4e00-\u9fff]{1,5}$/.test(x));
        if (i >= 1) add(i >= 2 && args[i - 1] && /^[a-z]+$/.test(args[i - 1]) ? args[i - 1] : whoOf(n.arguments[0]) || (HER_FILE.test(base) ? base.slice(0, -3) : base), args[i], args[i + 1]);
      }
      if (name === 'bark' && n.arguments[0] && n.arguments[0].type === 'ObjectExpression') {
        const p = (k) => n.arguments[0].properties.find((q) => q.key && q.key.name === k);
        const sp = p('speaker'), tx = p('text');
        const wk = p('who'); if (tx && tx.value.type === 'ObjectExpression') { const g = (k) => { const q = tx.value.properties.find((x) => x.key && x.key.name === k); return q && lit(q.value); }; add((wk && lit(wk.value)) || whoOf(sp && sp.value) || base, g('zh'), g('en')); }
        if (tx && tx.value.type === 'ConditionalExpression') for (const br of [tx.value.consequent, tx.value.alternate]) if (br.type === 'ObjectExpression') { const g = (k) => { const q = br.properties.find((x) => x.key && x.key.name === k); return q && lit(q.value); }; add((wk && lit(wk.value)) || whoOf(sp && sp.value) || base, g('zh'), g('en')); }
      }
    }
    if (n.type === 'ArrayExpression' && n.elements.length >= 3) {
      const [a, b, c] = n.elements.map(lit);
      if (a && /^[a-z]+$/.test(a) && b && cjk.test(b) && c && !cjk.test(c)) add(a, b, c);
    }
    if (n.type === 'ObjectExpression') {                               // a Xinyu voice note: { from, kind: 'voice', text }
      const g = (k) => { const q = n.properties.find((x) => x.key && x.key.name === k); return q && lit(q.value); };
      if (g('kind') === 'voice' && g('from')) { add(g('from'), g('text'), g('en')); const tq = n.properties.find((x) => x.key && x.key.name === 'text'); if (tq && tq.value.type === 'ConditionalExpression') { add(g('from'), lit(tq.value.consequent)); add(g('from'), lit(tq.value.alternate)); } }
    }
    if (n.type === 'Property' && n.key && n.key.name === 'text' && FILE_SPEAKER[base]) { const t = tCall(n.value); if (t) add(FILE_SPEAKER[base], t[0], t[1]); }
  });
}
// Shanghainese lines (the AIA lobby's) are subtitles only, however the source parse found them
for (const exs of [...Object.values(AIA_TALK), ...Object.values(AIA_EVENTS)]) for (const ex of exs) for (const [, zh, , lang] of ex) if (lang === 'wuu') out.delete(zh.trim());
const list = [...out.values()].map((l) => ({ ...l, en: l.en || (enText(l.zh) !== l.zh ? enText(l.zh) : '') }));
process.stdout.write(JSON.stringify(list, null, 1));
const by = {}; for (const l of list) by[l.who] = (by[l.who] || 0) + 1;
console.error(`${list.length} lines`, by);
