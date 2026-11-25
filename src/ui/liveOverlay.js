// The liveliness overlay (L, or ?live): the numbers of world/liveliness.js in a corner, four times a
// second. And the hero-shot benchmark's panel (?bench): a start button, progress, and the result as
// JSON to copy and send back.
const css = (el, s) => { el.style.cssText = s; return el; };
const BOX = 'position:fixed;z-index:60;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#e8eef2;background:rgba(8,12,16,.78);border:1px solid rgba(255,255,255,.14);border-radius:8px;';

export function createLiveOverlay({ getLang = () => 'en' } = {}) {
  const el = css(document.createElement('div'), `${BOX}top:10px;left:10px;padding:8px 10px;pointer-events:none;white-space:pre;min-width:250px;display:none`);
  el.id = 'live-overlay';
  document.body.appendChild(el);
  let on = false, t = 0;
  const zh = () => getLang() === 'zh';
  function render(s) {
    if (!s) return;
    const Z = zh(), act = Object.entries(s.activities.list).sort((a, b) => b[1] - a[1]);
    const v = s.vehicles, a = s.audible;
    el.textContent = [
      Z ? '活力 · L 关闭' : 'LIVELINESS · L to hide',
      `${Z ? '视野内的人' : 'people in view'}  ${s.people.total}`,
      `  ${Z ? '近' : 'near'} ${s.people.near} · ${Z ? '中' : 'mid'} ${s.people.mid} · ${Z ? '远(卡片)' : 'impostor'} ${s.people.impostor}`,
      `${Z ? '车辆' : 'vehicles'}  ${v.total}  (taxi ${v.taxi} · car ${v.car} · NEV ${v.nev} · bus ${v.bus} · boat ${v.boat})`,
      `${Z ? '不同的活动' : 'activities'}  ${s.activities.count}`,
      ...act.slice(0, 8).map(([k, n]) => `  ${k} ${n}`),
      `${Z ? '听得见的声源' : 'audible sources'}  ${a.count}  ${Object.entries(a.kinds).map(([k, n]) => `${k} ${n}`).join(' · ')}`,
      `${Z ? '帧时间' : 'frame'}  avg ${s.frame.avgMs} ms · p95 ${s.frame.p95Ms} ms · ${s.frame.fps} fps · cpu ${s.frame.cpuMs} ms`,
      `${Z ? '绘制' : 'draw'}  ${s.draw.calls} calls · ${(s.draw.triangles / 1000).toFixed(0)}k tris`,
      s.where ? `${s.where.hour} · x ${s.where.x} z ${s.where.z}` : '',
    ].join('\n');
  }
  return {
    get on() { return on; },
    set(v) { on = !!v; el.style.display = on ? 'block' : 'none'; t = 0; },
    toggle() { this.set(!on); return on; },
    // per frame, after the frame is drawn: snapshot() is only called while the overlay is showing
    update(dt, snapshot) { if (!on) return; t -= dt; if (t > 0) return; t = 0.25; render(snapshot()); },
  };
}

// the benchmark panel: onStart() is called from the button's click (which also lets the sound start)
export function createBenchPanel({ onStart, getLang = () => 'en' }) {
  const zh = () => getLang() === 'zh';
  const el = css(document.createElement('div'), `${BOX}left:50%;top:50%;transform:translate(-50%,-50%);padding:18px 20px;width:min(640px,92vw);text-align:left;`);
  el.id = 'bench-panel';
  const h = css(document.createElement('div'), 'font-weight:600;font-size:14px;margin-bottom:8px');
  const p = css(document.createElement('div'), 'margin-bottom:12px;white-space:pre-wrap;color:#b9c4cc');
  const btn = css(document.createElement('button'), 'font:inherit;font-size:13px;padding:8px 16px;border-radius:6px;border:0;background:#e8c27a;color:#111;cursor:pointer');
  const out = css(document.createElement('textarea'), 'display:none;width:100%;height:260px;margin-top:12px;font:11px/1.4 ui-monospace,Menlo,monospace;background:#0b1015;color:#dfe8ee;border:1px solid #334;border-radius:6px;padding:8px;box-sizing:border-box');
  out.readOnly = true;
  const copy = css(document.createElement('button'), 'display:none;font:inherit;margin-top:8px;padding:6px 14px;border-radius:6px;border:0;background:#7ac0e8;color:#111;cursor:pointer');
  const again = css(document.createElement('button'), 'display:none;font:inherit;margin:8px 0 0 8px;padding:6px 14px;border-radius:6px;border:1px solid #556;background:transparent;color:#dfe8ee;cursor:pointer');
  el.append(h, p, btn, out, copy, again);
  const texts = () => (zh()
    ? { h: '回潮 · 四个固定镜头的基准测试', p: '四个固定镜头（南京东路近河南中路 18:00、海关大楼前的观景平台 17:45、汉口路路口 18:15、早上八点的外滩），每个先稳定几秒，再测 12 秒。大约需要一分半钟。测完后结果会显示在这里，请复制发回。测试期间不会存档。', go: '开始测试', copy: '复制结果', copied: '已复制', again: '再测一次' }
    : { h: 'Returning Tide · hero-shot benchmark', p: 'Four fixed shots (Nanjing Road East near Henan Road at 18:00, the promenade at the Customs House at 17:45, the Hankou Road crossing at 18:15, the Bund at 8 am). Each settles for a few seconds, then is measured for 12. About a minute and a half in all. The result appears here as text: copy it and send it back. Nothing is saved to your game while it runs.', go: 'Start the benchmark', copy: 'Copy the result', copied: 'Copied', again: 'Run it again' });
  const label = () => { const T = texts(); h.textContent = T.h; p.textContent = T.p; btn.textContent = T.go; copy.textContent = T.copy; again.textContent = T.again; };
  label();
  btn.addEventListener('click', () => { el.style.display = 'none'; onStart(); });
  again.addEventListener('click', () => { el.style.display = 'none'; onStart(); });
  copy.addEventListener('click', async () => {
    let done = false;
    try { await navigator.clipboard.writeText(out.value); done = true; } catch { /* older Safari, or no permission */ }
    if (!done) { out.focus(); out.select(); try { done = document.execCommand('copy'); } catch { done = false; } }
    copy.textContent = done ? texts().copied : texts().copy;
  });
  document.body.appendChild(el);
  return {
    el,
    ready() { label(); el.style.display = 'block'; btn.disabled = false; },
    loading() { btn.disabled = true; },
    // the finished run: its JSON, selectable and copyable
    result(json) {
      label();
      h.textContent += zh() ? ' · 完成' : ' · done';
      p.textContent = zh() ? '请复制下面的全部文字发回：' : 'Copy all of the text below and send it back:';
      btn.style.display = 'none'; out.style.display = 'block'; copy.style.display = 'inline-block'; again.style.display = 'inline-block';
      out.value = json; el.style.display = 'block';
      try { out.focus(); out.select(); } catch { /* */ }
    },
  };
}
