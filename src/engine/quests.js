// Quests: the story's bookkeeping. Pure (no three.js / DOM), node-tested, saved inside life (L.quests).
//
// A quest definition (content lives in world/story.js):
//   { id, act, main, giver, title: {zh, en}, summary: {zh, en} | (L) => {zh, en},
//     start(L) -> bool                   when it begins (checked every update until it does)
//     steps: [ { id, text: {zh, en} | (L) => {zh, en},
//                done(L, st, ctx) -> bool  finished? (several steps can finish in one update); ctx: { player }
//                fail?(L, st) -> bool    a step that can no longer be done (a missed time)
//                optional?               skipped rather than failing the quest when it fails
//                target?: {x, z, label} | (L) => ... | null   where to go (the minimap marker)
//                wait?: (L) => absolute minute    a time you can wait for (the journal offers it)
//                onDone?(L, st) } ],
//     onStart?(L), onComplete?(L, st), fail?(L, st) -> bool, onFail?(L, st) }
// State: L.quests = { list: { [id]: { status: 'active'|'done'|'failed', step, started, finished,
//   skipped: [] } }, tracked: id|null, log: [{ at, type, id, step }] }
// updateQuests() returns what happened ({ type: 'start'|'step'|'skip'|'done'|'fail', id, step }) for the
// HUD to announce.

const pick = (v, L) => (typeof v === 'function' ? v(L) : v);
export const txt = (v, L, lang) => { const o = pick(v, L); return o ? (typeof o === 'string' ? o : o[lang] ?? o.zh) : ''; };

export function questState(L) {
  if (!L.quests) L.quests = { list: {}, tracked: null, log: [] };
  return L.quests;
}

export function updateQuests(L, defs, now = 0, ctx = {}) {
  const Q = questState(L), events = [];
  const log = (type, id, step) => { const e = { at: now, type, id, step }; Q.log.push(e); if (Q.log.length > 200) Q.log.shift(); events.push(e); };
  for (const def of defs) {
    let st = Q.list[def.id];
    if (!st) {
      if (!def.start(L, ctx)) continue;
      st = Q.list[def.id] = { status: 'active', step: 0, started: now, finished: null, skipped: [] };
      def.onStart && def.onStart(L);
      log('start', def.id);
      if (!Q.tracked || (def.main && !(defs.find((d) => d.id === Q.tracked) || {}).main)) Q.tracked = def.id;
    }
    if (st.status !== 'active') continue;
    if (def.fail && def.fail(L, st, ctx)) {
      st.status = 'failed'; st.finished = now; def.onFail && def.onFail(L, st); log('fail', def.id);
      if (Q.tracked === def.id) Q.tracked = nextTracked(Q, defs);
      continue;
    }
    let guard = 0;
    while (st.step < def.steps.length && guard++ < 32) {
      const s = def.steps[st.step];
      if (s.fail && s.fail(L, st, ctx)) {
        if (s.optional) { st.skipped.push(s.id); log('skip', def.id, s.id); st.step++; continue; }
        st.status = 'failed'; st.finished = now; def.onFail && def.onFail(L, st); log('fail', def.id, s.id);
        break;
      }
      if (!s.done(L, st, ctx)) break;
      s.onDone && s.onDone(L, st);
      log('step', def.id, s.id); st.step++;
    }
    if (st.status === 'active' && st.step >= def.steps.length) {
      st.status = 'done'; st.finished = now; def.onComplete && def.onComplete(L, st); log('done', def.id);
    }
    if (st.status !== 'active' && Q.tracked === def.id) Q.tracked = nextTracked(Q, defs);
  }
  return events;
}
function nextTracked(Q, defs) {
  const active = defs.filter((d) => Q.list[d.id] && Q.list[d.id].status === 'active');
  return (active.find((d) => d.main) || active[0] || { id: null }).id;
}
export function track(L, id) { const Q = questState(L); if (Q.list[id] && Q.list[id].status === 'active') Q.tracked = id; return Q.tracked; }

// the journal: every quest that has started, newest first within active / done / failed
export function journal(L, defs, lang = 'zh') {
  const Q = questState(L);
  const rows = defs.filter((d) => Q.list[d.id]).map((d) => {
    const st = Q.list[d.id];
    return {
      id: d.id, act: d.act, main: !!d.main, giver: d.giver, status: st.status, tracked: Q.tracked === d.id, started: st.started,
      title: txt(d.title, L, lang), summary: txt(d.summary, L, lang),
      steps: d.steps.map((s, i) => ({ id: s.id, text: txt(s.text, L, lang), done: i < st.step && !st.skipped.includes(s.id), skipped: st.skipped.includes(s.id), current: st.status === 'active' && i === st.step, optional: !!s.optional }))
        .filter((s, i) => i <= st.step || st.status !== 'active'),
    };
  });
  const rank = { active: 0, done: 1, failed: 2 };
  return rows.sort((a, b) => rank[a.status] - rank[b.status] || (b.main - a.main) || b.started - a.started);
}
// where the tracked quest wants you to go next, and whether you can wait for its time
export function currentStep(L, defs) {
  const Q = questState(L), d = defs.find((x) => x.id === Q.tracked);
  if (!d) return null;
  const st = Q.list[d.id]; if (!st || st.status !== 'active') return null;
  const s = d.steps[st.step]; if (!s) return null;
  return { quest: d, step: s, target: pick(s.target, L) || null, wait: s.wait ? s.wait(L) : null };
}
