// A DiDi ride from start to finish: the app (ui/phone/didiApp.js), the ride's state and fare
// (engine/ride.js), the car and the cabin (world/didi.js), and what's said in it.
//   In the car: the driver's lines come up as subtitles, in the language you chose. When they
//   leave room for an answer, four replies show: 1 engage, 2 short, 3 change the subject,
//   4 say nothing (look out of the window). Not answering for a few seconds counts as saying
//   nothing. Nothing marks which remarks matter.
//   Past the north end of the Bund the car goes on into the city; that part of the drive is
//   passing light and the conversation. Then you're there: a card says where, what it cost, and
//   what came of it (an invitation kept); the evening there passes and a DiDi brings you back.
import { requestRide, stepRide, arrive, reply, lineText, onRoad, dest } from '../engine/ride.js';
import { DRIVERS, OUTBURSTS, REPLIES, TEMPER } from './drivers.js';
import { driverEn, DRIVER_NAME_EN } from './driversEn.js';
import { stamp, post, nudge, skipTo, pay } from '../engine/life.js';
import { fare } from '../engine/ride.js';
import { getLang, t } from '../ui/i18n.js';
import { enText } from './agendaEn.js';

const REPLY_KEYS = ['engage', 'short', 'change', 'ignore'];
const ANSWER_TIME = 7;                                   // s: no answer by then is an answer

export function createRideFlow({ getLife, didi, hud, audio, onMode, save, rnd = Math.random }) {
  let R = null, awaiting = null, answerT = 0, sub = null, subT = 0, interlude = 0, card = null;
  const el = (id) => document.getElementById(id);
  const say = (zh) => (getLang() === 'zh' ? zh : driverEn(zh));
  const name = () => (R ? (getLang() === 'zh' ? R.driver.name : DRIVER_NAME_EN[R.driver.name] || R.driver.name) : '');

  function show(speaker, text, secs = 4.5, choices = null) {
    sub = { speaker, text, choices }; subT = secs;
    const box = el('ride-sub'); if (!box) return;
    box.classList.add('on');
    box.querySelector('.sp').textContent = speaker;
    box.querySelector('.tx').textContent = text;
    const ch = box.querySelector('.ch');
    ch.innerHTML = choices ? choices.map((c, i) => `<span><kbd>${i + 1}</kbd>${c}</span>`).join('') : '';
    ch.classList.toggle('hidden', !choices);
  }
  const hide = () => { sub = null; const box = el('ride-sub'); if (box) box.classList.remove('on'); };

  function offer() {
    // one reply of each kind, picked fresh
    const pick = (k) => REPLIES[k][Math.floor(rnd() * REPLIES[k].length)];
    awaiting = REPLY_KEYS.map((k) => ({ how: k, zh: pick(k) }));
    answerT = ANSWER_TIME;
    show(name(), sub ? sub.text : '', ANSWER_TIME + 0.5, awaiting.map((a) => say(a.zh)));
  }
  function choose(i) {
    if (!awaiting) return false;
    const a = awaiting[i]; awaiting = null;
    reply(R, a.how);
    if (a.how !== 'ignore') { show(getLang() === 'zh' ? '你' : 'You', say(a.zh), 2.4); if (rnd() < 0.5) didi.glance(1.4); }
    else hide();
    return true;
  }

  return {
    get ride() { return R; },
    get active() { return !!R && !['arrived', 'cancelled'].includes(R.phase); },
    get inCar() { return didi.riding || didi.state === 'beyond'; },
    request(to) {
      if (this.active) return false;
      R = requestRide(getLife(), { to, drivers: DRIVERS, rnd });
      return true;
    },
    cancel() {
      if (!R || !['matching', 'coming', 'waiting'].includes(R.phase)) return;
      const L = getLife();
      if (R.phase === 'waiting') pay(L, { method: R.method, amount: 5, to: '滴滴出行', memo: '取消费', kind: 'ride' });
      R.phase = 'cancelled'; L.flags.ride = null; didi.cancel();
      post(L, 'didi', { from: 'didi', kind: 'text', text: '行程已取消' });
    },
    message(q) {
      if (!R || !R.driver) return;
      const L = getLife();
      post(L, 'didi', { from: 'me', kind: 'text', text: q.zh }, { notify: false });
      setTimeout(() => post(L, 'didi', { from: 'didi', kind: 'text', text: '师傅：好的' }), 2500);
    },
    // E at the rear door
    canBoard() { return R && R.phase === 'waiting' && didi.state === 'waiting'; },
    board() {
      if (!this.canBoard()) return false;
      didi.board(R.driver); onMode('ride'); audio && audio.cue && audio.cue('door');
      return true;
    },
    key(code) {
      if (card) { if (code === 'KeyE' || code === 'Enter' || code === 'Space') { this.closeCard(); return true; } return false; }
      if (!this.inCar) return false;
      const i = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(code);
      if (i >= 0) return choose(i);
      return false;
    },
    update(dt) {
      if (!R) return;
      const L = getLife();
      // the world's side of things
      for (const e of didi.events.splice(0)) {
        if (e.type === 'brake' && R.talk) {
          const out = onRoad(R, e.kind, e.brake, TEMPER[R.driver.mood] ?? 0.3);
          if (audio && audio.cue) audio.cue('carhorn');
          if (out) { const pool = OUTBURSTS[R.driver.id][out.kind]; awaiting = null; show(name(), say(pool[Math.min(pool.length - 1, out.severity - 1 + Math.floor(rnd() * 1.5)) % pool.length]), 3.2); }
        }
        if (e.type === 'left-bund') { interlude = 0.001; el('ride-interlude') && el('ride-interlude').classList.add('on'); }
      }
      if (R.phase === 'coming' && !didi.car && R.driver) {
        const got = didi.dispatch(R.driver.plate);
        if (got) R.car = got.model;
      }
      if (didi.car && didi.state === 'coming') R.etaMin = didi.distance() / 8 / 60 * 4;   // game minutes at ~8 m/s
      stepRide(L, R, dt, { carStopped: didi.state === 'waiting', boarded: this.inCar });
      for (const e of R.events.splice(0)) {
        if (e.type === 'line') { const text = say(lineText(R, e.line)); show(name(), text, 5); if (rnd() < 0.35) didi.glance(1.2); setTimeout(() => { if (R && R.talk && R.talk.awaiting) offer(); }, Math.min(3200, 900 + text.length * 40)); }
        if (e.type === 'cancelled') { didi.cancel(); }
      }
      if (awaiting) { answerT -= dt; if (answerT <= 0) choose(3); }
      if (sub && !awaiting) { subT -= dt; if (subT <= 0) hide(); }
      // past the Bund: the rest of the drive is passing light, then you're there
      if (interlude > 0) {
        interlude += dt;
        const d = dest(R.to), span = Math.min(45, 18 + d.mins);
        if (interlude > span && R.phase === 'riding') this.finish();
      }
    },
    finish() {
      const L = getLife(), d = dest(R.to);
      const res = arrive(L, R);
      awaiting = null; hide();
      // what came of it: an invitation for this place, kept if you came at about the right time
      let kept = null;
      const inv = d.invite && L.invites.find((i) => i.id === d.invite);
      if (inv && Math.abs(stamp(L) - inv.at) <= 120 && inv.status !== 'declined') {
        inv.status = 'accepted'; inv.kept = true; nudge(L, inv.from, 5, `kept:${inv.id}`); kept = inv;
        post(L, inv.thread || inv.from, { from: inv.from, kind: 'text', text: '今天谢了，改天请你吃饭。' });
      }
      // the evening there passes; a DiDi back to the Bund
      const stay = kept ? 120 : 45, back = fare(d, (L.clock.minute + stay) % 1440);
      skipTo(L, stamp(L) + stay + d.mins);
      pay(L, { method: R.method, amount: back, to: '滴滴出行', memo: `快车 → 外滩`, kind: 'ride' });
      card = { d, res, kept, back };
      const c = el('ride-card');
      if (c) {
        const zh = getLang() === 'zh';
        c.querySelector('.place').textContent = zh ? d.zh : d.en;
        c.querySelector('.line').textContent = kept
          ? (zh ? `你准时到了。${inv.title}。待了两个小时。` : `You made it on time: ${enText(inv.title)}. You stayed a couple of hours.`)
          : (zh ? '你在那边待了一会儿。' : 'You spent a while there.');
        c.querySelector('.fare').textContent = zh ? `车费 ¥${res.amount} · 回程 ¥${back}` : `Fare ¥${res.amount} · ride back ¥${back}`;
        c.querySelector('.back').textContent = zh ? '一辆滴滴把你送回了外滩。' : 'A DiDi brought you back to the Bund.';
        c.querySelector('.go').textContent = t('rideContinue');
        c.classList.add('on');
      }
      el('ride-interlude') && el('ride-interlude').classList.remove('on');
      interlude = 0;
      if (save) save();
    },
    closeCard() {
      card = null; el('ride-card') && el('ride-card').classList.remove('on');
      didi.end(); R = null; onMode('play-return');
    },
    get card() { return !!card; },
  };
}
