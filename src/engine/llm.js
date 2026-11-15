// What people say when you talk to them freely: a language model running on your own machine, never
// a paid service. Three ways, tried in this order (settings can pin one):
//   server   any OpenAI-compatible endpoint on your machine: Ollama (http://localhost:11434/v1,
//            e.g. `ollama run qwen2.5:7b`), LM Studio, llama.cpp's server. Streams the reply
//   browser  WebLLM in the page on WebGPU (Qwen2.5-1.5B-Instruct, ~1 GB, downloaded once when you
//            turn it on; cached by the browser after that)
//   canned   no model: short, polite, in-character replies picked by what you said (so the game
//            still works; it isn't a conversation)
// The model only ever sees the character card and the scene (world/personas.js), never anything
// outside the game.
const store = (() => { try { return window.localStorage; } catch { return null; } })();
const get = (k, d) => { try { return (store && store.getItem(k)) ?? d; } catch { return d; } };
const set = (k, v) => { try { store && store.setItem(k, v); } catch { /* private mode */ } };

export const LLM_DEFAULTS = { server: 'http://localhost:11434/v1', model: 'qwen2.5:7b', browserModel: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC' };

// tidy a model's reply into something a person would say out loud
export function spoken(text, max = 260) {
  let s = String(text || '')
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/^\s*[\w一-鿿· ]{1,16}[:：]\s*/, '')            // "Name: ..." prefixes
    .replace(/[*_#`>]+/g, '')                                       // markdown
    .replace(/[（(][^)）]{0,40}[)）]/g, '')                          // (stage directions)
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\s+/g, ' ').trim();
  if (/as an ai|language model|作为(一个)?(AI|人工智能|语言模型)/i.test(s)) s = '';
  if (s.length > max) { const cut = s.slice(0, max); const end = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('！'), cut.lastIndexOf('？'), cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! ')); s = end > max * 0.4 ? cut.slice(0, end + 1) : cut; }
  return s.replace(/^["“'‘]+|["”'’]+$/g, '').trim();
}
export const isZh = (s) => /[一-鿿]/.test(s || '');

export function createLLM({ canned }) {
  const S = { backend: 'canned', status: 'idle', progress: 0, engine: null, error: null };
  const conf = () => ({ mode: get('bund.ai', 'auto'), server: get('bund.aiServer', LLM_DEFAULTS.server), model: get('bund.aiModel', LLM_DEFAULTS.model), browserModel: get('bund.aiBrowserModel', LLM_DEFAULTS.browserModel), browserOn: get('bund.aiBrowser', '0') === '1' });
  async function probeServer(c) {
    try {
      const r = await fetch(`${c.server}/models`, { signal: AbortSignal.timeout(1200) });
      if (!r.ok) return false;
      const j = await r.json().catch(() => ({}));
      const ids = (j.data || []).map((m) => m.id);
      if (ids.length && !ids.includes(c.model)) S.serverModel = ids.find((id) => /qwen|glm|yi|deepseek|llama|mistral|gemma/i.test(id)) || ids[0];
      else S.serverModel = c.model;
      return true;
    } catch { return false; }
  }
  async function startBrowser(c) {
    if (!('gpu' in navigator)) { S.error = 'no WebGPU in this browser'; return false; }
    try {
      S.status = 'loading';
      const webllm = await import('@mlc-ai/web-llm');                       // its own chunk, loaded only when turned on
      S.engine = await webllm.CreateMLCEngine(c.browserModel, { initProgressCallback: (p) => { S.progress = p.progress || 0; S.status = `loading ${Math.round((p.progress || 0) * 100)}%`; } });
      S.status = 'ready'; return true;
    } catch (e) { S.error = String(e.message || e); S.status = 'failed'; return false; }
  }
  async function detect() {
    const c = conf();
    if (c.mode === 'off') { S.backend = 'canned'; return S.backend; }
    if ((c.mode === 'auto' || c.mode === 'server') && await probeServer(c)) { S.backend = 'server'; S.status = 'ready'; return S.backend; }
    if ((c.mode === 'browser' || (c.mode === 'auto' && c.browserOn)) && await startBrowser(c)) { S.backend = 'browser'; return S.backend; }
    S.backend = 'canned'; S.status = 'ready';
    return S.backend;
  }
  let detecting = null;
  const ready = () => (detecting ||= detect());
  return {
    get backend() { return S.backend; }, get status() { return S.status; }, get error() { return S.error; }, get progress() { return S.progress; },
    conf, ready,
    configure(o) { for (const [k, v] of Object.entries(o)) set(`bund.${k}`, String(v)); detecting = null; S.engine = null; return ready(); },
    // messages: [{ role: 'system'|'user'|'assistant', content }]; onToken(textSoFar) while it streams.
    // ctx: { persona, said } for the canned replies
    async chat(messages, { onToken = null, maxTokens = 160, temperature = 0.85, ctx = {} } = {}) {
      await ready();
      const c = conf();
      try {
        if (S.backend === 'server') {
          const r = await fetch(`${c.server}/chat/completions`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: S.serverModel || c.model, messages, max_tokens: maxTokens, temperature, top_p: 0.92, stream: !!onToken, presence_penalty: 0.4 }),
            signal: AbortSignal.timeout(60000),
          });
          if (!r.ok) throw new Error(`server ${r.status}`);
          if (!onToken) { const j = await r.json(); return j.choices[0].message.content; }
          const rd = r.body.getReader(), dec = new TextDecoder(); let buf = '', out = '';
          for (;;) {
            const { value, done } = await rd.read(); if (done) break;
            buf += dec.decode(value, { stream: true });
            let i; while ((i = buf.indexOf('\n')) >= 0) {
              const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
              if (!line.startsWith('data:')) continue; const d = line.slice(5).trim(); if (d === '[DONE]') continue;
              try { const t = JSON.parse(d).choices[0].delta.content; if (t) { out += t; onToken(out); } } catch { /* keep-alive */ }
            }
          }
          return out;
        }
        if (S.backend === 'browser' && S.engine) {
          if (!onToken) { const r = await S.engine.chat.completions.create({ messages, max_tokens: maxTokens, temperature }); return r.choices[0].message.content; }
          const chunks = await S.engine.chat.completions.create({ messages, max_tokens: maxTokens, temperature, stream: true }); let out = '';
          for await (const ch of chunks) { const t = ch.choices[0]?.delta?.content; if (t) { out += t; onToken(out); } }
          return out;
        }
      } catch (e) { S.error = String(e.message || e); console.warn('llm:', S.error); }
      const t = canned(ctx.persona, ctx.said || '', ctx);
      if (onToken) onToken(t);
      return t;
    },
  };
}
