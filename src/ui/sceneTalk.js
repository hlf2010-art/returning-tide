// A sat-down conversation: lines spoken (recorded voices), then a choice of up to four answers (1-4;
// it waits for you) and their consequences. The same box as a DiDi ride's conversation (#ride-sub).
// Script: [who, zh, en] lines and { ask: [{ zh, en, d, set, flag, then: [[who, zh, en], ...] }] }.
//   d     how the person you're talking to (`with`) feels about it (life relation)
//   set   what you decided (handed to onDone)       flag   remembered in life.flags
import { nudge } from '../engine/life.js';
import { getLang } from './i18n.js';

const T = (zh, en) => (getLang() === 'zh' ? zh : en);

export function createSceneTalk({ voice = null, getLife, save, names = {} }) {
  const el = () => document.getElementById('ride-sub');
  let cur = null;   // { script, i, queue, wait, ask, with, at, onDone, set, speaking }
  function show(who, text, choices = null) {
    const box = el(); if (!box) return;
    box.classList.add('on');
    box.querySelector('.sp').textContent = who ? T(...(names[who] || [who, who])) : T('你', 'You');
    box.querySelector('.tx').textContent = text;
    const ch = box.querySelector('.ch'); ch.innerHTML = choices ? choices.map((c, i) => `<span><kbd>${i + 1}</kbd>${c}</span>`).join('') : ''; ch.classList.toggle('hidden', !choices);
  }
  const hide = () => { const box = el(); if (box) box.classList.remove('on'); };
  const lineSecs = (s) => Math.min(7.5, 2 + s.length * (getLang() === 'zh' ? 0.17 : 0.06));
  function next() {
    const c = cur; if (!c) return;
    if (c.queue.length) {
      const [who, zh, en] = c.queue.shift(); c.speaking = who; c.wait = lineSecs(T(zh, en)); show(who, T(zh, en));
      if (voice) voice.say({ zh, en, who, at: c.at ? c.at(who) : null, onEnd: () => { if (cur === c && c.speaking === who) c.wait = Math.min(c.wait, 0.6); } })
        .then((h) => { if (h && h.duration && cur === c) c.wait = Math.max(c.wait, h.duration + 0.5); });
      return;
    }
    if (c.i >= c.script.length) { const done = c.onDone, set = c.set; cur = null; hide(); done && done(set); return; }
    const beat = c.script[c.i++];
    if (Array.isArray(beat)) { c.queue.push(beat); next(); return; }
    c.ask = beat.ask; c.wait = Infinity;
    show(null, '', c.ask.map((a) => T(a.zh, a.en)));
  }
  function answer(i) {
    const c = cur; if (!c || !c.ask || !c.ask[i]) return false;
    const a = c.ask[i]; c.ask = null;
    const l = getLife();
    if (a.d && c.with) nudge(l, c.with, a.d, `scene:${a.set || a.flag || i}`);
    if (a.flag) l.flags[a.flag] = true;
    if (a.set) c.set = a.set;
    show(null, T(a.zh, a.en)); c.wait = lineSecs(T(a.zh, a.en)) * 0.7; c.speaking = null;
    const said = a.run ? a.run(l, a) : null;                           // an answer with consequences of its own (world/romance.js); it may give back what's said in reply
    c.queue.push(...(Array.isArray(said) ? said : a.then || []));
    save && save();
    return true;
  }
  return {
    get active() { return !!cur; },
    get asking() { return !!(cur && cur.ask); },
    get speaking() { return cur ? cur.speaking || null : null; },   // who is talking now (for whoever animates them)
    names,                                                          // who's who: other modules add their people (Object.assign)
    addNames(more) { Object.assign(names, more); },                    // more speakers (world/romanceScenes.js)
    // with: whose feelings the answers move; at(who) -> [x, y, z] for positional voices
    play(script, { with: who = null, at = null, onDone = null } = {}) { cur = { script, i: 0, queue: [], wait: 1.2, ask: null, with: who, at, onDone, set: null }; },
    key(code) { const i = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(code); return i >= 0 ? answer(i) : false; },
    update(dt) { if (!cur) return; if (cur.ask) return; cur.wait -= dt; if (cur.wait <= 0) next(); },
    stop() { cur = null; hide(); },
  };
}
