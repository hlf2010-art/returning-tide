// First-person controller: input -> movement.js -> camera.
import { L, surfaceAt, groundHeight } from '../world/layout.js';
import { createBody, stepBody, WALK_SPEED } from './movement.js';

const SENS = 0.0021, PITCH_LIMIT = 1.45;
const KEYS = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r', ShiftLeft: 'run', ShiftRight: 'run' };

export function createPlayer(camera, dom) {
  const body = createBody();
  const input = { f: false, b: false, l: false, r: false, run: false };
  const p = {
    body, input, yaw: L.spawn.yaw, pitch: 0.06, enabled: false,
    onStep: null,          // (surface, running) => void
    stride: 0, bob: 0,
  };

  let jumpQueued = false;
  window.addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); if (!e.repeat && p.enabled) jumpQueued = true; }
    const k = KEYS[e.code]; if (k) { input[k] = true; if (e.code.startsWith('Arrow')) e.preventDefault(); } });
  window.addEventListener('keyup', (e) => { const k = KEYS[e.code]; if (k) input[k] = false; });
  window.addEventListener('blur', () => { for (const k in input) input[k] = false; });

  let dragging = false;
  dom.addEventListener('mousedown', () => { dragging = true; });
  window.addEventListener('mouseup', () => { dragging = false; });
  document.addEventListener('mousemove', (e) => {
    if (!p.enabled) return;
    const locked = document.pointerLockElement === dom;
    if (!locked && !dragging) return;                       // drag-look is the fallback when pointer lock is unavailable
    const mx = e.movementX || 0, my = e.movementY || 0;
    if (Math.abs(mx) > 400 || Math.abs(my) > 400) return;   // discard the occasional bogus pointer-lock spike
    p.yaw -= mx * SENS;
    p.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, p.pitch - my * SENS));
  });

  p.update = (dt) => {
    let wx = 0, wz = 0;
    if (p.enabled) {
      const fwd = (input.f ? 1 : 0) - (input.b ? 1 : 0), side = (input.r ? 1 : 0) - (input.l ? 1 : 0);
      const s = Math.sin(p.yaw), c = Math.cos(p.yaw);
      wx = -s * fwd + c * side; wz = -c * fwd - s * side;
      const len = Math.hypot(wx, wz); if (len > 1) { wx /= len; wz /= len; }
    }
    stepBody(body, wx, wz, p.enabled && input.run, dt, jumpQueued && p.enabled);
    if (dt > 0) jumpQueued = false;
    if (body.landed && p.onStep) p.onStep(surfaceAt(body.x, body.z), true, true);
    // footfall rhythm + a small head bob that fades when you stop
    const speed = body.air ? 0 : Math.hypot(body.vx, body.vz);   // no footfalls or bob in the air
    const moving = Math.min(1, speed / WALK_SPEED);
    const before = p.stride;
    p.stride += speed * dt * 0.62;
    // a footfall lands where the head bob bottoms out (sin(2π·stride) = -1, i.e. stride ≡ 0.75)
    if (Math.floor(p.stride + 0.25) !== Math.floor(before + 0.25) && speed > 0.6 && p.onStep) p.onStep(surfaceAt(body.x, body.z), speed > WALK_SPEED * 1.3, false);
    p.bob += (moving - p.bob) * Math.min(1, dt * 8);
    const bobY = Math.sin(p.stride * Math.PI * 2) * 0.028 * p.bob;
    camera.position.set(body.x, body.y + L.eye + bobY, body.z);
    camera.rotation.set(p.pitch, p.yaw, 0, 'YXZ');
  };
  // Forget held movement / a queued jump (entering or leaving an interaction): keys still held
  // come back through the OS key-repeat, so nothing sticks and nothing carries over silently.
  p.clearInput = () => { for (const k in input) input[k] = false; jumpQueued = false; };
  p.teleport = (x, z, yaw = p.yaw, pitch = p.pitch) => {
    body.x = x; body.z = z; body.vx = body.vz = 0; body.vy = 0; body.air = false; body.y = groundHeight(x, z);
    p.yaw = yaw; p.pitch = pitch;
  };
  return p;
}
