// First-person controller: input -> movement.js (+ stamina.js) -> camera, with headMotion.js
// adding the bob, sway, lean, landing dip, breathing and the winded bend.
import { L, surfaceAt, groundHeight } from '../world/layout.js';
import { createBody, stepBody, WALK_SPEED, RUN_SPEED } from './movement.js';
import { createStamina, updateStamina, speedCap, canRun } from './stamina.js';
import { createHeadMotion, updateHead, cadence } from './headMotion.js';

const SENS = 0.0021, PITCH_LIMIT = 1.45;
const KEYS = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r', ShiftLeft: 'run', ShiftRight: 'run' };

export function createPlayer(camera, dom) {
  const body = createBody();
  const input = { f: false, b: false, l: false, r: false, run: false };
  const p = {
    body, input, yaw: L.spawn.yaw, pitch: 0.06, enabled: false,
    onStep: null,          // (surface, running) => void
    stride: 0, bob: 0,
    stamina: createStamina(), head: createHeadMotion(),
    speed: 0, forward: 0, lateral: 0,   // m/s, in the view's frame (for the body's gait)
    running: false,                     // the run is actually happening (key held, able, moving fast)
  };
  let prevYaw = p.yaw, prevFwd = 0;

  let jumpQueued = false;
  window.addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); if (!e.repeat && p.enabled) jumpQueued = true; }
    const k = KEYS[e.code]; if (k) { input[k] = true; if (e.code.startsWith('Arrow')) e.preventDefault(); } });
  window.addEventListener('keyup', (e) => { const k = KEYS[e.code]; if (k) input[k] = false; });
  window.addEventListener('blur', () => { for (const k in input) input[k] = false; });

  let dragging = false;
  dom.addEventListener('mousedown', () => { dragging = true; });
  window.addEventListener('mouseup', () => { dragging = false; });
  document.addEventListener('mousemove', (e) => {
    if (!p.enabled && !p.lookOnly) return;                // lookOnly: in a car, you can still turn your head
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
    const st = p.stamina;
    const wantRun = p.enabled && input.run && canRun(st) && !input.b;          // nobody sprints backwards
    // capScale < 1: eyes on the phone, a slow walk
    stepBody(body, wx, wz, wantRun && (p.capScale ?? 1) >= 1, dt, jumpQueued && p.enabled && st.winded <= 0, speedCap(st, WALK_SPEED, RUN_SPEED) * (p.capScale ?? 1));
    if (dt > 0) jumpQueued = false;
    if (body.landed && p.onStep) p.onStep(surfaceAt(body.x, body.z), true, true);
    const speed = body.air ? 0 : Math.hypot(body.vx, body.vz);   // no footfalls or bob in the air
    p.running = wantRun && speed > WALK_SPEED * 1.15;
    updateStamina(st, dt, { running: wantRun && speed > WALK_SPEED * 0.9, moving: speed > 0.4 });
    // velocity in the view's frame
    const sy = Math.sin(p.yaw), cy = Math.cos(p.yaw);
    p.forward = -sy * body.vx - cy * body.vz; p.lateral = cy * body.vx - sy * body.vz; p.speed = speed;
    // footfall rhythm: cadence rises with speed; a footfall lands where the bob bottoms out (stride ≡ 0.75)
    const before = p.stride;
    p.stride += cadence(speed) * dt;
    if (Math.floor(p.stride + 0.25) !== Math.floor(before + 0.25) && speed > 0.6 && p.onStep) p.onStep(surfaceAt(body.x, body.z), speed > WALK_SPEED * 1.3, false);
    p.bob += (Math.min(1, speed / WALK_SPEED) - p.bob) * Math.min(1, dt * 8);
    let yawRate = 0, accel = 0;
    if (dt > 0) {
      let d = p.yaw - prevYaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      yawRate = d / dt; accel = (p.forward - prevFwd) / dt;
    }
    prevYaw = p.yaw; prevFwd = p.forward;
    const h = updateHead(p.head, dt, {
      stride: p.stride, speed, walk: WALK_SPEED, run: RUN_SPEED, lateral: p.lateral, forwardAccel: accel,
      yawRate, impact: body.impact, breath: st.breath, winded: st.winded > 0, air: body.air,
    });
    // offsets are in the view's frame (yaw only): x right, z forward
    const ox = cy * h.x - sy * h.z, oz = -sy * h.x - cy * h.z;
    camera.position.set(body.x + ox, body.y + L.eye + h.y, body.z + oz);
    camera.rotation.set(Math.max(-1.55, Math.min(1.55, p.pitch + h.pitch)), p.yaw, h.rollOut, 'YXZ');
  };
  // Forget held movement / a queued jump (entering or leaving an interaction): keys still held
  // come back through the OS key-repeat, so nothing sticks and nothing carries over silently.
  p.clearInput = () => { for (const k in input) input[k] = false; jumpQueued = false; };
  p.teleport = (x, z, yaw = p.yaw, pitch = p.pitch) => {
    body.x = x; body.z = z; body.vx = body.vz = 0; body.vy = 0; body.air = false; body.y = groundHeight(x, z);
    p.yaw = yaw; p.pitch = pitch; prevYaw = yaw; prevFwd = 0;
  };
  return p;
}
