// Who a passer-by is has to match the body they walk in: a man is never given the office woman's
// voice and lines, nor a woman the old man's. Pure (node-tested: tests/streetPeople.test.mjs).
//   roleSex(role)          'f' | 'm' for an avatar role (public/people/people.json's cast)
//   personaFor(p, sex)     the street persona of that sex nearest to p (itself when it already fits)
//   sexOf(persona)         'f' | 'm' | null
// which avatars are women (tools/rocketbox/convert.mjs CAST and the named heroines)
export const FEMALE_ROLES = new Set(['su', 'p2', 'p5', 'c1', 'c2', 'c3', 'c4', 'c8', 'k1', 'gunian', 'zhiwei', 'yuan']);
export const roleSex = (role) => (role == null ? null : FEMALE_ROLES.has(role) ? 'f' : 'm');

export const PERSONA_SEX = {
  office: 'f', officeMan: 'm', youngMan: 'm', student: 'f', visitor: 'm', visitorF: 'f', elder: 'm', auntie: 'f',
  lin: 'm', su: 'f',
};
// the same kind of person, the other sex
const OTHER = { office: 'officeMan', officeMan: 'office', youngMan: 'office', student: 'youngMan', visitor: 'visitorF', visitorF: 'visitor', elder: 'auntie', auntie: 'elder' };
export const sexOf = (persona) => PERSONA_SEX[persona] || null;
export function personaFor(persona, sex) {
  if (!sex || !PERSONA_SEX[persona] || PERSONA_SEX[persona] === sex) return persona;
  return OTHER[persona] || persona;
}
