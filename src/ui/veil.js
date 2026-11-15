// A fade to black and back, for going somewhere (a lift, a ride, sleep). The world keeps running
// behind it; `during` runs while the screen is dark. Returns a promise that settles once it's clear.
export function createVeil() {
  const el = document.createElement('div'); el.id = 'veil'; document.body.appendChild(el);
  let busy = false;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  return {
    get busy() { return busy; },
    async cover(during, { down = 600, hold = 500, up = 700, line = '' } = {}) {
      if (busy) return false;
      busy = true;
      el.style.transitionDuration = `${down}ms`; el.dataset.line = line; el.classList.add('on');
      await wait(down + 30);
      try { await during?.(); } catch (e) { console.error(e); }
      await wait(hold);
      el.style.transitionDuration = `${up}ms`; el.classList.remove('on');
      await wait(up);
      busy = false; return true;
    },
  };
}
