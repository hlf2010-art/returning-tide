// Saves (the pause menu): three slots. Your life autosaves to the slot you're playing; here you can
// copy it into another slot, load a slot (the game restarts in it), export a slot to a file and
// import one back (any slot). Stored in this browser's localStorage, as before (slot 1 is the old save).
import { getLang } from './i18n.js';

const T = (zh, en) => (getLang() === 'zh' ? zh : en);
export const SLOTS = [1, 2, 3];
export const slotKey = (n) => (n === 1 ? 'bund-life-v1' : `bund-life-v1:slot${n}`);
export function currentSlot() { try { const n = +localStorage.getItem('bund-slot'); return SLOTS.includes(n) ? n : 1; } catch { return 1; } }
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function createSaves({ getLife, serialize, deserialize, describe, onLoad }) {
  const root = document.createElement('div'); root.id = 'saves'; root.className = 'hidden'; root.setAttribute('role', 'dialog');
  document.body.appendChild(root);
  const file = document.createElement('input'); file.type = 'file'; file.accept = '.json,application/json'; file.style.display = 'none'; document.body.appendChild(file);
  let importTo = null, note = '';
  const read = (n) => { try { return localStorage.getItem(slotKey(n)); } catch { return null; } };
  const meta = (n) => { try { return JSON.parse(localStorage.getItem(`${slotKey(n)}:meta`) || '{}'); } catch { return {}; } };
  function write(n, text) { localStorage.setItem(slotKey(n), text); localStorage.setItem(`${slotKey(n)}:meta`, JSON.stringify({ savedAt: Date.now() })); }
  function render() {
    const cur = currentSlot();
    const rows = SLOTS.map((n) => {
      const raw = read(n), L = raw ? deserialize(raw) : null, m = meta(n), d = L ? describe(L) : null;
      const when = m.savedAt ? new Date(m.savedAt).toLocaleString(getLang() === 'zh' ? 'zh-CN' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '';
      return `<div class="slot${n === cur ? ' cur' : ''}"><div class="sl-h"><b>${T(`存档 ${n}`, `Slot ${n}`)}</b>${n === cur ? `<span class="tag">${T('正在玩', 'playing')}</span>` : ''}</div>
        <div class="sl-d">${d ? esc(d) : `<i>${T('空', 'Empty')}</i>`}${when ? `<small>${esc(T(`保存于 ${when}`, `Saved ${when}`))}</small>` : ''}</div>
        <div class="sl-a">${n !== cur ? `<button class="mbtn" data-a="copy" data-n="${n}">${T('存到这里', 'Save here')}</button>` : ''}${L && n !== cur ? `<button class="mbtn primary" data-a="load" data-n="${n}">${T('读取', 'Load')}</button>` : ''}
        ${L ? `<button class="mbtn" data-a="export" data-n="${n}">${T('导出', 'Export')}</button>` : ''}<button class="mbtn" data-a="import" data-n="${n}">${T('导入…', 'Import…')}</button></div></div>`;
    }).join('');
    root.innerHTML = `<div class="panel"><div class="ph"><span>${T('存档', 'Saves')}</span><button class="x" data-a="close" aria-label="close">✕</button></div>
      ${rows}<p class="sv-note">${esc(note || T('游戏会自动存到你正在玩的存档。读取别的存档会重新开始游戏。', 'The game saves itself to the slot you\'re playing. Loading another slot restarts the game in it.'))}</p></div>`;
  }
  root.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) { if (e.target === root) api.close(); return; }
    const n = +b.dataset.n;
    if (b.dataset.a === 'close') { api.close(); return; }
    if (b.dataset.a === 'copy') { write(n, serialize(getLife())); note = T(`已存到存档 ${n}。`, `Saved to slot ${n}.`); render(); return; }
    if (b.dataset.a === 'load') { try { localStorage.setItem('bund-slot', String(n)); } catch { /* */ } onLoad(n); return; }
    if (b.dataset.a === 'export') {
      const raw = read(n), L = raw && deserialize(raw); if (!raw) return;
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
      a.download = `returning-tide-slot${n}-day${L ? L.clock.day : 0}.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      note = T(`存档 ${n} 已导出。`, `Slot ${n} exported.`); render(); return;
    }
    if (b.dataset.a === 'import') { importTo = n; file.value = ''; file.click(); }
  });
  file.addEventListener('change', async () => {
    const f = file.files && file.files[0]; if (!f || !importTo) return;
    const text = await f.text(), L = deserialize(text);
    if (!L) { note = T('这个文件不是本游戏的存档。', 'That file isn\'t a save from this game.'); render(); return; }
    write(importTo, text);
    note = importTo === currentSlot() ? T(`已导入存档 ${importTo}（正在玩的这个）：读取它要重新开始。`, `Imported into slot ${importTo} (the one you're playing): restart to load it.`) : T(`已导入存档 ${importTo}。`, `Imported into slot ${importTo}.`);
    render();
  });
  const api = {
    get isOpen() { return !root.classList.contains('hidden'); },
    open() { note = ''; render(); root.classList.remove('hidden'); },
    close() { root.classList.add('hidden'); },
    // tools / the game: write the playing slot's timestamp alongside the autosave
    touched() { try { localStorage.setItem(`${slotKey(currentSlot())}:meta`, JSON.stringify({ savedAt: Date.now() })); } catch { /* */ } },
    importText(n, text) { const L = deserialize(text); if (!L) return false; write(n, text); render(); return true; },
  };
  return api;
}
