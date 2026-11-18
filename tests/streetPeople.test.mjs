// A passer-by's persona (and so their voice and lines) matches the body they walk in (engine/streetPeople.js). npm test.
import { roleSex, personaFor, sexOf, PERSONA_SEX } from '../src/engine/streetPeople.js';
import { createCrowd } from '../src/engine/crowd.js';
import { PERSONAS } from '../src/world/personas.js';
import { PERSONAS as SOCIAL } from '../src/engine/social.js';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
ok(roleSex('p2') === 'f' && roleSex('p3') === 'm' && roleSex('gunian') === 'f', 'avatar sexes');
for (const p of Object.keys(PERSONA_SEX)) for (const s of ['m', 'f']) if (!['lin', 'su'].includes(p)) ok(sexOf(personaFor(p, s)) === s, `${p} on a ${s === 'm' ? 'man' : 'woman'} -> ${personaFor(p, s)}`);
for (const p of ['officeMan', 'visitorF']) ok(PERSONAS[p] && PERSONAS[p].sex === sexOf(p) && SOCIAL[p], `${p}: a talk card and a way of taking a bump`);
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const cr = createCrowd({ rnd, roles: ['p1', 'p2', 'p3', 'p4', 'p5', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'] });
const bad = cr.agents.filter((a) => sexOf(a.persona) && sexOf(a.persona) !== roleSex(a.role));
ok(cr.agents.length > 20 && bad.length === 0, `the crowd: every one of ${cr.agents.length} speaks as the body they're in (${bad.length} wrong)`);
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
