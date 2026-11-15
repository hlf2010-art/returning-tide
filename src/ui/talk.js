// Talking to someone in your own words: type, or speak (Mandarin or English). They answer in
// character (engine/llm.js plays them, world/personas.js is who they are), out loud in their own
// voice (engine/voice.js), sentence by sentence as the reply comes in.
//   Enter    send what you typed                  Tab   speak (again to stop; it sends when you pause)
//   Esc      leave the conversation               中/EN which language you speak in
// Voice input is the browser's speech recognition (Chrome, Edge, Safari); without it you type.
import { systemPrompt, cannedReply, PERSONAS, finalReminder, replyOk, withReminder } from '../world/personas.js';
import { spoken, isZh } from '../engine/llm.js';
import { getLang } from './i18n.js';

const Z = (zh, en) => (getLang() === 'zh' ? zh : en);
const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export function createTalk({ llm, voice, getLife, save }) {
  const el = document.createElement('div'); el.id = 'talk';
  el.innerHTML = `<div class="who"></div><div class="log"></div>
    <div class="row"><button class="mic" title="Tab">🎙</button><input type="text" autocomplete="off" spellcheck="false" maxlength="200"><button class="lang"></button></div>
    <div class="hint"></div>`;
  document.body.appendChild(el);
  const $ = (s) => el.querySelector(s), input = $('input'), log = $('.log');
  const S = { open: false, id: null, persona: null, scene: null, at: null, history: [], busy: false, listening: false, rec: null, speakLang: getLang(), queue: [], speaking: false, onClose: null, turns: 0 };
  const hint = () => { $('.hint').textContent = Z(`回车发送 · Tab 说话${SR ? '' : '（此浏览器不支持语音输入）'} · Esc 离开 · ${llm.backend === 'canned' ? '未连接 AI：简单回应' : `AI：${llm.backend === 'server' ? '本地服务' : '浏览器内'}`}`, `Enter to send · Tab to speak${SR ? '' : ' (no voice input in this browser)'} · Esc to leave · ${llm.backend === 'canned' ? 'no AI connected: simple replies' : `AI: ${llm.backend === 'server' ? 'local server' : 'in the browser'}`}`); $('.lang').textContent = S.speakLang === 'zh' ? '中' : 'EN'; };
  function line(who, text, cls) { const d = document.createElement('div'); d.className = `l ${cls}`; d.innerHTML = `<b></b><span></span>`; d.querySelector('b').textContent = who; d.querySelector('span').textContent = text; log.appendChild(d); while (log.children.length > 6) log.removeChild(log.firstChild); log.scrollTop = 1e6; return d.querySelector('span'); }
  const name = () => (getLang() === 'zh' ? S.persona.zh : S.persona.en);

  // their voice, a sentence at a time
  function speakNext() {
    if (S.speaking || !S.queue.length) return;
    const t = S.queue.shift(); S.speaking = true;
    const lang = isZh(t) ? 'zh' : 'en';
    voice.say({ zh: lang === 'zh' ? t : null, en: lang === 'en' ? t : null, lang, who: S.persona.voice, sex: S.persona.sex, at: S.at ? S.at() : null, onEnd: () => { S.speaking = false; speakNext(); } })
      .then((h) => { if (!h) { S.speaking = false; speakNext(); } });
  }
  async function respond(said) {
    S.busy = true; el.classList.add('busy');
    const lang = said ? (isZh(said) ? 'zh' : 'en') : (S.persona.lang === 'en' ? 'en' : getLang() === 'zh' || S.persona.lang === 'zh' ? 'zh' : 'en');
    const sys = systemPrompt(S.id, S.scene(), { lang });
    const msgs = [{ role: 'system', content: sys }, ...S.history.slice(-8)];
    if (!said) msgs.push({ role: 'user', content: withReminder(S.id, lang, lang === 'zh' ? '（他走到你面前，像是想说话。你先开口，打个招呼。）' : '(He walks up to you and looks like he wants to talk. You speak first: a short greeting.)') });
    else msgs.push({ role: 'user', content: withReminder(S.id, lang, said) });
    const span = line(name(), '…', 'them');
    let spokenUpTo = 0;
    const flush = (text, final) => {
      // queue each finished sentence for the voice as soon as it's there
      const s = spoken(text, 400); span.textContent = s || '…';
      const re = /[^。！？!?.…]+[。！？!?.…]+/g; let m, last = 0;
      while ((m = re.exec(s))) last = m.index + m[0].length;
      const upTo = final ? s.length : last;
      if (upTo > spokenUpTo) { const chunk = s.slice(spokenUpTo, upTo).trim(); spokenUpTo = upTo; if (chunk) { S.queue.push(chunk); speakNext(); } }
      return s;
    };
    // the reply is checked (right language, not an echo of what he said); a second try, then a short canned answer
    let raw = await llm.chat(msgs, { onToken: (t) => { if (!S.retrying) flush(t, false); }, maxTokens: 140, ctx: { persona: S.id, said, first: !said } });
    if (llm.backend !== 'canned' && !replyOk(spoken(raw, 400), { lang, said })) {
      console.info('talk: rejected', JSON.stringify(spoken(raw, 400)));
      S.retrying = true; S.queue = []; voice.stopAll(); spokenUpTo = 0; span.textContent = '…';
      // the second try without the earlier turns: nothing pulling it back into the other language
      const retry = [msgs[0], { role: 'user', content: withReminder(S.id, lang, said || (lang === 'zh' ? '（打个招呼。）' : '(Say hello.)')) + (lang === 'zh' ? ' [必须用中文。]' : ' [Answer in English.]') }];
      raw = await llm.chat(retry, { maxTokens: 120, temperature: 0.6, ctx: { persona: S.id, said } });
      S.retrying = false;
      if (!replyOk(spoken(raw, 400), { lang, said })) raw = cannedReply(S.id, said, { first: !said, lang });
    }
    let reply = flush(raw, true);
    if (!reply) { reply = cannedReply(S.id, said, { first: !said, lang }); span.textContent = reply; S.queue.push(reply); speakNext(); }
    if (said) S.history.push({ role: 'user', content: said });
    S.history.push({ role: 'assistant', content: reply });
    S.turns++;
    // what was said is remembered with them (the last few lines)
    const l = getLife(); const mem = ((l.flags.talked ||= {})[S.id] ||= []);
    if (said) mem.push(`他：${said}`.slice(0, 80)); mem.push(`我：${reply}`.slice(0, 80)); while (mem.length > 8) mem.shift(); save && save();
    S.busy = false; el.classList.remove('busy');
  }
  function send() {
    const said = input.value.trim(); if (!said || S.busy) return;
    input.value = ''; line(Z('你', 'You'), said, 'me'); respond(said);
  }
  // speech recognition: the language you pick; what you say goes in the box; a pause sends it
  function listen(on) {
    if (!SR) return;
    if (!on) { if (S.rec) try { S.rec.stop(); } catch { /* stopped */ } return; }
    if (S.listening) return;
    const r = new SR(); S.rec = r; r.lang = S.speakLang === 'zh' ? 'zh-CN' : 'en-US'; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
    r.onresult = (e) => { let txt = ''; let fin = false; for (let i = e.resultIndex; i < e.results.length; i++) { txt += e.results[i][0].transcript; fin = fin || e.results[i].isFinal; } input.value = txt; if (fin) send(); };
    r.onend = () => { S.listening = false; el.classList.remove('listening'); };
    r.onerror = (e) => { S.listening = false; el.classList.remove('listening'); if (e.error === 'not-allowed') $('.hint').textContent = Z('麦克风权限被拒绝', 'Microphone permission was denied'); };
    try { r.start(); S.listening = true; el.classList.add('listening'); } catch { S.listening = false; }
  }
  $('.mic').addEventListener('click', () => listen(!S.listening));
  $('.lang').addEventListener('click', () => { S.speakLang = S.speakLang === 'zh' ? 'en' : 'zh'; hint(); });
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); send(); }
    else if (e.key === 'Escape') { e.preventDefault(); api.close(); }
    else if (e.key === 'Tab') { e.preventDefault(); listen(!S.listening); }
  });

  const api = {
    get open() { return S.open; }, get id() { return S.id; }, get busy() { return S.busy; }, get turns() { return S.turns; },
    // id: a key in PERSONAS; scene(): a sentence about where and when; at(): [x, y, z] of their mouth
    async start({ id, scene, at = null, onClose = null, greet = true, opener = null }) {
      if (S.open) return;
      S.open = true; S.id = id; S.persona = PERSONAS[id] || PERSONAS.office; S.scene = scene; S.at = at; S.onClose = onClose; S.turns = 0;
      S.speakLang = getLang(); S.queue = []; S.speaking = false;
      const mem = (getLife().flags.talked || {})[id] || [];
      S.history = mem.length ? [{ role: 'user', content: getLang() === 'zh' ? `（你们之前聊过：${mem.join(' / ')}）` : `(You've talked before: ${mem.join(' / ')})` }, { role: 'assistant', content: '嗯。' }] : [];
      log.innerHTML = ''; $('.who').textContent = name(); el.classList.add('on'); hint();
      await llm.ready(); hint();
      setTimeout(() => input.focus(), 50);
      if (opener) { line(name(), opener, 'them'); S.history.push({ role: 'assistant', content: opener }); }
      else if (greet) respond('');
    },
    close() {
      if (!S.open) return;
      S.open = false; listen(false); input.blur(); el.classList.remove('on', 'busy', 'listening');
      S.queue = []; voice.stopAll();
      const cb = S.onClose; S.onClose = null; cb && cb();
    },
    // (tools) say something as if typed
    say(text) { input.value = text; send(); },
    lastReply() { const s = log.querySelectorAll('.them span'); return s.length ? s[s.length - 1].textContent : ''; },
  };
  return api;
}
