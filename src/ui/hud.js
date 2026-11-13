// DOM overlay: entry card, prompt, toasts. Deliberately tiny.
const $ = (id) => document.getElementById(id);

export function createHud() {
  let toastTimer = 0, thoughtTimer = 0, cardTimer = 0, lastSubKey = '', lastObjKey = '';
  return {
    ready() { const b = $('begin'); b.disabled = false; b.textContent = 'Step out — 走出去'; b.focus(); },
    fail(err) { $('begin').textContent = 'Could not start (WebGL2 needed)'; console.error(err); },
    begin() {
      $('entry').classList.add('leaving'); $('hud').classList.remove('hidden');
      setTimeout(() => $('entry').classList.add('hidden'), 1500);
      setTimeout(() => $('place').classList.add('on'), 900);
      setTimeout(() => $('place').classList.remove('on'), 7500);
      setTimeout(() => $('keys').classList.add('faded'), 14000);
    },
    show(id, on) { $(id).classList.toggle('hidden', !on); },
    prompt(on, text) {
      if (on && text) $('prompt-text').textContent = text;
      $('prompt').classList.toggle('on', !!on); $('reticle').classList.toggle('on', !!on);
    },
    toast(text, seconds = 2.5) {
      const el = $('toast'); el.textContent = text; el.classList.add('on');
      clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), seconds * 1000);
    },
    thought(zh, en) {
      const el = $('thought'); el.innerHTML = '';
      const a = document.createElement('span'); a.className = 'zh'; a.textContent = zh;
      el.append(a, document.createTextNode(en)); el.classList.add('on');
      clearTimeout(thoughtTimer); thoughtTimer = setTimeout(() => el.classList.remove('on'), 9000);
    },
    subtitle(on, { speaker = '', text = '', source = '', interacting = false, showText = true, offer = false } = {}) {
      const key = `${!!on}|${!!interacting}|${!!showText}|${!!offer}|${speaker}|${source}|${text}`;
      if (key === lastSubKey) return;
      lastSubKey = key;
      const el = $('subtitle');
      el.classList.toggle('on', !!on);
      el.classList.toggle('interacting', !!interacting);
      if (!on) return;
      $('sub-speaker').textContent = speaker;
      $('sub-source').textContent = source;
      const textEl = $('sub-text');
      textEl.textContent = showText ? text : '';
      textEl.classList.toggle('hidden', !showText || !text);
      $('sub-exit').classList.toggle('hidden', !interacting);
      $('sub-agree').classList.toggle('hidden', !(interacting && offer));
    },
    // Mission One objective panel. step: { zh, en, hint } or null to hide.
    objective(step) {
      const key = step ? `${step.zh}|${step.en}|${step.hint || ''}` : '';
      if (key === lastObjKey) return;
      const el = $('objective'), wasOn = !!lastObjKey;
      lastObjKey = key;
      el.classList.toggle('hidden', !step);
      if (!step) return;
      $('m-zh').textContent = step.zh; $('m-en').textContent = step.en;
      const h = $('m-hint'); h.classList.toggle('hidden', !step.hint); h.innerHTML = step.hint || '';
      if (wasOn) { el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }   // new step: brief flash
    },
    missionCard(outcome, seconds = 7) {
      const el = $('mission-card');
      clearTimeout(cardTimer);
      if (!outcome) { el.classList.remove('on'); return; }
      $('mc-outcome').textContent = outcome; el.classList.add('on');
      cardTimer = setTimeout(() => el.classList.remove('on'), seconds * 1000);
    },
    clearThought() { clearTimeout(thoughtTimer); $('thought').classList.remove('on'); },
  };
}
