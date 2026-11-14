// DOM overlay: entry card, prompt, toasts. Deliberately tiny. One language at a time (ui/i18n.js):
// pass { zh, en } pairs; the chosen one is shown.
import { t, tr, getLang, onLang, applyStatic } from './i18n.js';
const $ = (id) => document.getElementById(id);

export function createHud() {
  let toastTimer = 0, thoughtTimer = 0, cardTimer = 0, lastSubKey = '', lastObjKey = '', lastStep = null, isReady = false;
  applyStatic();
  let placeTime = null;
  const placeSub = () => { if (placeTime) document.querySelector('#place [data-t="placeSub"], #place .kicker span:last-child').textContent = `${t('month')} · ${placeTime}`; };
  onLang(() => {                                       // the language changed: redraw what's on screen
    placeSub();
    if (isReady) $('begin').textContent = t('begin');
    lastSubKey = ''; if (lastStep) { lastObjKey = ''; hud.objective(lastStep); }
  });
  const hud = {
    ready(time) { if (time && $('entry-time')) $('entry-time').textContent = time; const b = $('begin'); isReady = true; b.disabled = false; b.removeAttribute('data-t'); b.textContent = t('begin'); b.focus(); },
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
      }
      $('prompt').classList.toggle('on', !!on); $('reticle').classList.toggle('on', !!on);
    },
    // bark({ speaker, text, gloss, lang }): someone nearby says something in passing
    bark({ speaker = '', text = '', gloss = null, lang = 'zh', seconds = 3.2 } = {}) {
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
    objective(step) {
      lastStep = step;
      const key = step ? `${getLang()}|${step.zh}|${step.en}|${step.hint || ''}` : '';
      if (key === lastObjKey) return;
      const el = $('objective'), wasOn = !!lastObjKey;
      lastObjKey = key;
      el.classList.toggle('hidden', !step);
      if (!step) return;
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
