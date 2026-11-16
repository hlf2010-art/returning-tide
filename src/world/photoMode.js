// Photo mode, with the night gimbal Jibai built (engine/maker.js). G raises the phone on its gimbal:
// a viewfinder with thirds, the focal length, the stabiliser. Mouse frames the shot (the gimbal
// smooths it), wheel or [ ] zooms (24-135 mm equivalent), Space or a click takes it, G or Esc lowers it.
// Each shot is scored against the Bund-after-dark list (PHOTO_TARGETS): is the subject in the frame,
// near the centre, big enough, and was the gimbal steady; a better shot of a subject earns Maker XP.
// Shots go to the phone's camera roll (Photos), where you can share them (followers).
import * as THREE from 'three';
import { getLang } from '../ui/i18n.js';
import { PHOTO_TARGETS, photoStars, recordPhoto, maker, owns } from '../engine/maker.js';
import { colliders } from './layout.js';
import { segmentHitsBox, BLOCKING_TAGS } from '../engine/targeting.js';

const T = (zh, en) => (getLang() === 'zh' ? zh : en);
const FOV0 = 68;
const mmOf = (fov) => Math.round(24 * Math.tan((FOV0 * Math.PI) / 360) / Math.tan((fov * Math.PI) / 360));

export function createPhotoMode({ camera, renderer, player, hud, audio, getLife, save, getDynamic, onMode }) {
  // the gimbal as you've revised it (engine/studio.js): with the attitude filter retuned it holds a faster pan
  const tuned = () => ((getLife().flags.studio || { fixes: [] }).fixes.some((f) => f.id === 'filter') ? 1.5 : 1);
  const el = document.createElement('div'); el.id = 'viewfinder';
  el.innerHTML = `<div class="g"><i></i><i></i><i></i><i></i></div><div class="c tl"></div><div class="c tr"></div><div class="c bl"></div><div class="c br"></div>
    <div class="top"><span class="rec">● STAB</span><span class="mm"></span></div><div class="subj"></div><div class="flash"></div>
    <div class="hint"></div>`;
  document.body.appendChild(el);
  const S = { on: false, fov: FOV0, yawRate: 0, lastYaw: 0, lastPitch: 0, best: null, shots: 0 };
  const v = new THREE.Vector3(), top = new THREE.Vector3(), bot = new THREE.Vector3();
  const hint = () => { el.querySelector('.hint').textContent = T('空格 / 点击 拍照 · 滚轮 / [ ] 变焦 · G 或 Esc 收起', 'Space / click: shoot · wheel or [ ]: zoom · G or Esc: lower'); };
  // where each subject is right now (some move: your car, the boats)
  function subjects() {
    const dyn = getDynamic();
    return PHOTO_TARGETS.map((t) => {
      if (t.id === 'huracan') return dyn.car ? { ...t, x: dyn.car.x, z: dyn.car.z } : null;
      if (t.id === 'ferry') { const b = dyn.boats.slice().sort((a, c) => Math.hypot(a.x - camera.position.x, a.z - camera.position.z) - Math.hypot(c.x - camera.position.x, c.z - camera.position.z))[0]; return b ? { ...t, x: b.x, y: b.y + 3, z: b.z } : null; }
      return t;
    }).filter(Boolean);
  }
  // how the frame reads each subject -> the best one, with its stars
  function evaluate() {
    camera.updateMatrixWorld(); let best = null;
    for (const t of subjects()) {
      const d = Math.hypot(t.x - camera.position.x, t.y - camera.position.y, t.z - camera.position.z);
      if (d < t.near * 0.5 || d > t.far) continue;
      v.set(t.x, t.y, t.z).project(camera); if (v.z > 1 || v.z < -1) continue;
      top.set(t.x, t.y + t.h / 2, t.z).project(camera); bot.set(t.x, t.y - t.h / 2, t.z).project(camera);
      const inFrame = Math.abs(v.x) < 0.92 && Math.abs(v.y) < 0.92, size = Math.abs(top.y - bot.y) / 2, offCentre = Math.hypot(v.x, v.y);
      const occluded = d < 220 && colliders.some((b) => BLOCKING_TAGS.has(b.tag) && b.y1 === undefined && segmentHitsBox(camera.position.x, camera.position.z, t.x, t.z, b));
      const steady = Math.max(0, 1 - S.yawRate / (0.6 * tuned()));
      const stars = photoStars({ inFrame, offCentre, size, min: t.min, steady, occluded });
      if (stars && (!best || stars > best.stars || (stars === best.stars && offCentre < best.offCentre))) best = { t, stars, offCentre };
    }
    return best;
  }
  function shoot() {
    if (!S.on) return;
    S.pending = true;                                                       // captured right after the next render
    audio && audio.cue && audio.cue('shutter', 0, 1);
    const f = el.querySelector('.flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
  }
  function capture() {
    S.pending = false; S.shots++;
    const src = renderer.domElement, c = document.createElement('canvas'); c.width = 320; c.height = 180;
    const k = Math.max(320 / src.width, 180 / src.height), w = src.width * k, h = src.height * k;
    let thumb = null;
    try { c.getContext('2d').drawImage(src, (320 - w) / 2, (180 - h) / 2, w, h); thumb = c.toDataURL('image/jpeg', 0.72); } catch { /* tainted or lost */ }
    const best = S.best, l = getLife();
    const r = recordPhoto(l, { target: best ? best.t.id : null, stars: best ? best.stars : 0, thumb });
    save && save();
    const name = best ? T(best.t.zh, best.t.en) : T('随手一拍', 'A snapshot');
    hud.toast(`${name} ${best ? '★'.repeat(best.stars) + '☆'.repeat(3 - best.stars) : ''}${r.xp ? T(` · +${r.xp} 创客经验`, ` · +${r.xp} Maker XP`) : ''}`, 3);
    for (const a of r.achievements) setTimeout(() => hud.achievement && hud.achievement(T(a.zh, a.en)), 900);
  }
  function setOn(on) {
    if (on && !owns(getLife(), 'gimbal')) { hud.toast(T('先在创客空间做一个云台（杨浦滨江）', 'Build a gimbal at the makerspace first (Yangpu riverside)'), 3); return; }
    S.on = on; el.classList.toggle('on', on); hint();
    if (!on) { camera.fov = FOV0; camera.updateProjectionMatrix(); S.fov = FOV0; }
    S.lastYaw = player.yaw; S.lastPitch = player.pitch;
    onMode && onMode(on ? 'photo' : 'play');
  }
  window.addEventListener('wheel', (e) => { if (!S.on) return; S.fov = Math.max(14, Math.min(FOV0, S.fov * (e.deltaY > 0 ? 1.08 : 0.93))); }, { passive: true });
  window.addEventListener('mousedown', (e) => { if (S.on && e.button === 0) shoot(); });
  return {
    get on() { return S.on; }, get shots() { return S.shots; }, get best() { return S.best; },
    toggle() { setOn(!S.on); },
    key(code) {
      if (code === 'KeyG' || code === 'Escape') { setOn(false); return true; }
      if (code === 'Space') { shoot(); return true; }
      if (code === 'BracketRight') { S.fov = Math.max(14, S.fov * 0.9); return true; }
      if (code === 'BracketLeft') { S.fov = Math.min(FOV0, S.fov / 0.9); return true; }
      return false;
    },
    // per frame, while it's up: zoom, the gimbal's steadiness, what's in frame
    update(dt) {
      if (!S.on) return;
      camera.fov += (S.fov - camera.fov) * Math.min(1, dt * 8); camera.updateProjectionMatrix();
      let dy = player.yaw - S.lastYaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      const rate = (Math.abs(dy) + Math.abs(player.pitch - S.lastPitch)) / Math.max(dt, 1e-3);
      S.yawRate += (rate - S.yawRate) * Math.min(1, dt * 6); S.lastYaw = player.yaw; S.lastPitch = player.pitch;
      S.best = evaluate();
      el.querySelector('.mm').textContent = `${mmOf(camera.fov)} mm`;
      el.querySelector('.rec').classList.toggle('shaky', S.yawRate > 0.6 * tuned());
      el.querySelector('.subj').textContent = S.best ? `${T(S.best.t.zh, S.best.t.en)}  ${'★'.repeat(S.best.stars)}${'☆'.repeat(3 - S.best.stars)}` : '';
    },
    afterRender() { if (S.pending) capture(); },
    count() { return Object.keys(maker(getLife()).shot).length; },
  };
}
