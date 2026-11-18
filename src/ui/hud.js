// DOM overlay: entry card, prompt, toasts. Deliberately tiny. One language at a time (ui/i18n.js):
// pass { zh, en } pairs; the chosen one is shown.
import { t, tr, getLang, onLang, applyStatic } from './i18n.js';
const $ = (id) => document.getElementById(id);

export function createHud() {
  let toastTimer = 0, thoughtTimer = 0, cardTimer = 0, lastSubKey = '', lastObjKey = '', lastStep = null, isReady = false;
  let missionStep = null, questStep = null;
  applyStatic();
  let placeTime = null;
  const placeSub = () => { if (placeTime) document.querySelector('#place [data-t="placeSub"], #place .kicker span:last-child').textContent = `${t('month')} · ${placeTime}`; };
  onLang(() => {                                       // the language changed: redraw what's on screen
    placeSub();
    if (isReady) $('begin').textContent = t('begin');
    lastSubKey = ''; if (lastStep) { lastObjKey = ''; hud.objective(lastStep); }
  });
  const hud = {
    ready(time) { if (time && $('entry-time')) $('entry-time').textContent = time; const b = $('begin'); isReady = true; b.disabled = false; b.removeAttribute('data-t'); b.textContent = t('begin'); b.focus(); const lb = $('load-bar'); if (lb) { lb.firstElementChild.style.width = '100%'; setTimeout(() => lb.classList.add('done'), 500); } },
    fail(err) { $('begin').removeAttribute('data-t'); $('begin').textContent = t('failed'); console.error(err); },
    begin(time) {
      placeTime = time || null; placeSub();
      $('entry').classList.add('leaving'); $('hud').classList.remove('hidden');
      setTimeout(() => $('entry').classList.add('hidden'), 1500);
      setTimeout(() => $('place').classList.add('on'), 900);
      setTimeout(() => $('place').classList.remove('on'), 7500);
      setTimeout(() => $('keys').classList.add('faded'), 14000);
    },
    show(id, on) { $(id).classList.toggle('hidden', !on); },
    // prompt(on, { target, action }) - the one thing E will do, and to what
    prompt(on, text) {
      if (on && text) {
        const t = typeof text === 'string' ? { target: '', action: text } : text;
        $('prompt-target').textContent = t.target || ''; $('prompt-text').textContent = t.action;
        $('prompt-key').textContent = t.key || 'E';
        // someone you could also talk to (T), alongside what E does
        const tk = $('prompt-talk'); if (tk) { tk.style.display = t.talk ? '' : 'none'; if (t.talk) tk.querySelector('span').textContent = `${getLang() === 'zh' ? '聊天' : 'Talk'} · ${t.talk}`; }
      }
      $('prompt').classList.toggle('on', !!on); $('reticle').classList.toggle('on', !!on);
    },
    // bark({ speaker, text, gloss, lang }): someone nearby says something in passing
    bark({ speaker = '', text = '', gloss = null, lang = 'zh', seconds = 3.2, voice = true, at = null, who = null, rate = 1 } = {}) {
      // and said aloud, in the speaker's own recorded voice (engine/voice.js), unless the caller voices it
      if (voice && this.voice && lang !== 'wuu') this.voice.say({ zh: typeof text === 'object' ? text.zh : text, en: typeof text === 'object' ? text.en : text, who: who || (typeof speaker === 'object' ? speaker.zh : speaker), at, rate, noSynth: true });
      const el = $('bark');
      // speaker / text / gloss may be { zh, en } pairs. Shanghainese: Chinese readers get the words
      // and a Mandarin gloss; English readers get the English, marked as said in Shanghainese.
      const zhUI = getLang() === 'zh';
      $('bark-who').textContent = lang === 'wuu' ? `${tr(speaker)} · ${t('shanghainese')}` : tr(speaker);
      $('bark-text').textContent = tr(text);
      $('bark-gloss').textContent = zhUI && gloss ? `（${gloss}）` : '';
      el.classList.add('on');
      clearTimeout(this._barkTimer); this._barkTimer = setTimeout(() => el.classList.remove('on'), seconds * 1000);
    },
    // a milestone: a banner across the top, once
    achievement(text, kicker = null) {
      let el = document.getElementById('achv'); if (!el) { el = document.createElement('div'); el.id = 'achv'; document.body.appendChild(el); }
      el.innerHTML = `<small></small><b></b>`; el.querySelector('small').textContent = kicker || (getLang() === 'zh' ? '成就解锁' : 'Achievement unlocked'); el.querySelector('b').textContent = text;
      el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
      clearTimeout(this._achvT); this._achvT = setTimeout(() => el.classList.remove('on'), 4200);
      this.audio && this.audio.cue && this.audio.cue('chime', 0, 1);
    },
    // stamina: a slim bar at the bottom while you run or recover; gone when it's full again
    stamina(level, show, out = false) {
      let el = document.getElementById('stamina');
      if (!el) { el = document.createElement('div'); el.id = 'stamina'; el.innerHTML = '<i></i>'; document.body.appendChild(el); }
      const k = Math.round(Math.max(0, Math.min(1, level)) * 200) / 200;
      if (k !== this._stK) { this._stK = k; el.firstChild.style.transform = `scaleX(${k})`; }
      el.classList.toggle('on', !!show); el.classList.toggle('low', k < 0.25 && !out); el.classList.toggle('out', !!out);
    },
    toast(text, seconds = 2.5) {
      const el = $('toast'); el.textContent = tr(text); el.classList.add('on');
      clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), seconds * 1000);
    },
    thought(zh, en) {
      const el = $('thought'); el.textContent = getLang() === 'zh' ? zh : en; el.classList.add('on');
      clearTimeout(thoughtTimer); thoughtTimer = setTimeout(() => el.classList.remove('on'), 9000);
    },
    subtitle(on, { speaker = '', text = '', source = '', interacting = false, showText = true, choices = null } = {}) {
      const key = `${!!on}|${!!interacting}|${!!showText}|${choices ? choices.index : '-'}|${speaker}|${source}|${text}`;
      if (key === lastSubKey) return;
      lastSubKey = key;
      const el = $('subtitle');
      el.classList.toggle('on', !!on);
      $('hud').classList.toggle('sub-on', !!on);                 // the thought line moves up out of its way
      el.classList.toggle('interacting', !!interacting);
      if (!on) return;
      $('sub-speaker').textContent = speaker;
      $('sub-source').textContent = source;
      const textEl = $('sub-text');
      textEl.textContent = showText ? text : '';
      textEl.classList.toggle('hidden', !showText || !text);
      const opts = $('sub-options'), choosing = !!(interacting && choices);
      $('sub-exit').classList.toggle('hidden', !interacting || choosing);
      opts.classList.toggle('hidden', !choosing);
      if (choosing) {
        opts.replaceChildren(...choices.options.map((o, i) => {
          const row = document.createElement('div'); row.className = `opt${i === choices.index ? ' sel' : ''}`;
          row.innerHTML = `<span class="mk">›</span> ${tr(o)}`; return row;
        }));
        const hint = document.createElement('div'); hint.className = 'opt-hint';
        hint.innerHTML = `<kbd>W</kbd>/<kbd>S</kbd> ${t('choose')} &nbsp; <kbd>E</kbd> ${t('confirm')}`;
        opts.append(hint);
      }
    },
    // Mission One objective panel. step: { zh, en, hint } or null to hide.
    // the tracked quest's next step: shown whenever Mission One isn't showing its own
    questObjective(step) { questStep = step; if (!missionStep) this.objective(null, true); },
    objective(step, fromQuest = false) {
      if (!fromQuest) missionStep = step;
      step = missionStep || questStep || null;
      lastStep = step;
      const key = step ? `${getLang()}|${step.zh}|${step.en}|${step.hint || ''}` : '';
      if (key === lastObjKey) return;
      const el = $('objective'), wasOn = !!lastObjKey;
      lastObjKey = key;
      el.classList.toggle('hidden', !step);
      if (!step) return;
      const head = $('objective').querySelector('.m-head');
      if (head) { const quest = step === questStep && !missionStep; head.querySelector('.m-num').textContent = quest ? (getLang() === 'zh' ? '任务' : 'Quest') : t('m1Num'); head.querySelector('.m-title').textContent = quest ? tr(step.title || { zh: '', en: '' }) : t('m1Title'); }
      $('m-step').textContent = tr(step);
      const h = $('m-hint'); h.classList.toggle('hidden', !step.hint); h.innerHTML = tr(step.hint) || '';
      if (wasOn) { el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }   // new step: brief flash
    },
    missionCard(outcome, seconds = 7) {
      const el = $('mission-card');
      clearTimeout(cardTimer);
      if (!outcome) { el.classList.remove('on'); return; }
      $('mc-outcome').textContent = tr(outcome); el.classList.add('on');
      cardTimer = setTimeout(() => el.classList.remove('on'), seconds * 1000);
    },
    clearThought() { clearTimeout(thoughtTimer); $('thought').classList.remove('on'); },
  };
  return hud;
}
