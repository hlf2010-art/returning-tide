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
      $('bark-who').textContent = lang === 'wuu' ? `${speaker} · 沪语 Shanghainese (no voice)` : speaker;
      $('bark-text').textContent = text;
      $('bark-gloss').textContent = gloss ? `（${gloss}）` : '';
      el.classList.add('on');
      clearTimeout(this._barkTimer); this._barkTimer = setTimeout(() => el.classList.remove('on'), seconds * 1000);
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
          row.innerHTML = `<span class="mk">›</span> ${o.zh} · ${o.en}`; return row;
        }));
        const hint = document.createElement('div'); hint.className = 'opt-hint';
        hint.innerHTML = '<kbd>W</kbd>/<kbd>S</kbd> 选择 · choose &nbsp; <kbd>E</kbd> 确认 · confirm';
        opts.append(hint);
      }
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
