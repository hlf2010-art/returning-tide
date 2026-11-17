// Ji Bai's three skills (engine/skills.js).
import { createLife } from '../src/engine/life.js';
import { skillLevel, gainSkill, meets, skillsView, START } from '../src/engine/skills.js';
import { maker } from '../src/engine/maker.js';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const L = createLife();
ok(skillLevel(L, 'ai') >= 4 && skillLevel(L, 'product') >= 3 && skillLevel(L, 'hw') <= 1, `he lands strong in AI (${skillLevel(L, 'ai')}) and product (${skillLevel(L, 'product')}), rusty at the bench (${skillLevel(L, 'hw')})`);
const r = gainSkill(L, 'hw', 120, 'first build'); ok(maker(L).xp === 120 && r.levelUp === 2, 'hardware is the Maker XP (and levels up with it)');
const a = gainSkill(L, 'ai', 400, 'a model'); ok(a.xp === 400 && skillLevel(L, 'ai') === levelOf(START.ai + 400), 'AI experience adds up');
function levelOf(x) { return [0, 100, 300, 600, 1000, 1600].filter((v) => x >= v).length; }
ok(meets(L, { ai: 3, hw: 2 }).ok && !meets(L, { hw: 4 }).ok && meets(L, { hw: 4 }).short[0][0] === 'hw', 'meets() says what a job needs and what is short');
ok(skillsView(L, 'en').length === 3 && skillsView(L, 'en')[1].name === 'Software & AI', 'three tracks for a screen');
console.log(failed ? `\n${failed} FAILED` : '\nall passed'); process.exit(failed ? 1 : 0);
