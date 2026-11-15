// A gamepad (the browser's "standard" mapping: Xbox / PlayStation / most others). The left stick
// walks (pushed all the way, or L3 / RT held, you hurry), the right stick looks. Buttons become the
// keys the game already knows, so every screen works the same:
//   A  E (interact / confirm; Enter on the title screen and at the shop counter)    B  Esc (back)
//   X  Space (jump)        Y  P (phone)        LB  J (journal)        RB / View  M (map)
//   LT  T (talk)           R3  G (photo)       D-pad  1-4 (answers: up 1, right 2, down 3, left 4)
//   Menu / Start  pause
// The mapping is pure (padEvents, stickMove) and tested; createGamepad polls and feeds the game.
export const BUTTONS = { 0: 'A', 1: 'B', 2: 'X', 3: 'Y', 4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT', 8: 'View', 9: 'Menu', 10: 'L3', 11: 'R3', 12: 'Up', 13: 'Down', 14: 'Left', 15: 'Right' };
const KEY = { A: 'KeyE', B: 'Escape', X: 'Space', Y: 'KeyP', LB: 'KeyJ', RB: 'KeyM', View: 'KeyM', LT: 'KeyT', R3: 'KeyG', Up: 'Digit1', Right: 'Digit2', Down: 'Digit3', Left: 'Digit4' };
const DEAD = 0.18;

// the key a button stands for, in this context (mode: the game's mode)
export function keyFor(name, mode) {
  if (name === 'A' && (mode === 'entry' || mode === 'menu')) return 'Enter';
  return KEY[name] || null;
}
// pressed: { [buttonName]: bool } now and before -> [{ type: 'down'|'up', code }] and a pause request
export function padEvents(prev, cur, mode) {
  const out = [];
  for (const name of Object.values(BUTTONS)) {
    const was = !!prev[name], is = !!cur[name];
    if (was === is) continue;
    if (name === 'Menu') { if (is) out.push({ type: 'pause' }); continue; }
    if (name === 'L3' || name === 'RT') continue;                 // (hurry: read with the stick)
    const code = keyFor(name, mode); if (code) out.push({ type: is ? 'down' : 'up', code });
  }
  return out;
}
// the left stick -> the walk keys (with a dead zone; a full push hurries)
export function stickMove(x, y, hurry = false) {
  const m = Math.hypot(x, y);
  if (m < DEAD) return { f: false, b: false, l: false, r: false, run: false };
  return { f: y < -0.35, b: y > 0.35, l: x < -0.35, r: x > 0.35, run: hurry || m > 0.93 };
}
// the right stick -> how far to turn this frame (radians), with a gentle curve for fine aiming
export function stickLook(x, y, dt) {
  const curve = (v) => (Math.abs(v) < DEAD ? 0 : Math.sign(v) * ((Math.abs(v) - DEAD) / (1 - DEAD)) ** 1.6);
  return { yaw: -curve(x) * 2.6 * dt, pitch: -curve(y) * 1.8 * dt };
}

export function createGamepad({ player, getMode, onPause, hud, t }) {
  let prev = {}, prevMove = null, connected = false;
  const send = (type, code) => window.dispatchEvent(new KeyboardEvent(type === 'down' ? 'keydown' : 'keyup', { code, key: code, bubbles: true }));
  window.addEventListener('gamepadconnected', (e) => {
    if (e.gamepad.mapping !== 'standard' && e.gamepad.buttons.length < 16) return;
    connected = true; hud && hud.toast(t('padOn'), 5);
  });
  window.addEventListener('gamepaddisconnected', () => { connected = false; hud && hud.toast(t('padOff'), 3); });
  return {
    get connected() { return connected; },
    update(dt) {
      if (!connected || !navigator.getGamepads) return;
      const pad = [...navigator.getGamepads()].find((g) => g && g.connected);
      if (!pad) return;
      const cur = {}; pad.buttons.forEach((b, i) => { if (BUTTONS[i]) cur[BUTTONS[i]] = b.pressed || b.value > 0.5; });
      for (const ev of padEvents(prev, cur, getMode())) { if (ev.type === 'pause') onPause && onPause(); else send(ev.type, ev.code); }
      prev = cur;
      // the sticks: walking only writes when it changes, so the keyboard still works alongside
      const mv = stickMove(pad.axes[0] || 0, pad.axes[1] || 0, cur.L3 || cur.RT), key = JSON.stringify(mv);
      if (key !== prevMove) { if (prevMove !== null || mv.f || mv.b || mv.l || mv.r) Object.assign(player.input, mv); prevMove = key; }
      if (player.enabled || player.lookOnly) {
        const lk = stickLook(pad.axes[2] || 0, pad.axes[3] || 0, dt);
        player.yaw += lk.yaw; player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch + lk.pitch));
      }
    },
  };
}
