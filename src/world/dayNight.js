// How the hour reaches the materials. One set of shared values (TOD), set once per tick from
// engine/timeOfDay.js, read by every shader that cares:
//  - lights (lamp glass, neon, LED edges, halos): their colour scales with their channel; switched
//    off they fall back to a dull fixture (a grey version of themselves, lit by the daylight)
//  - glass (the self-lit window atlases of the towers): by night their lit floors, by day hazy glass
//    whose panels keep a trace of the atlas so the floors still read
import * as THREE from 'three';

export const TOD = {
  day: { value: 0 },           // daylight 0..1
  amb: { value: 0.07 },        // how much light falls on unlit things (0.07 at night .. 1 by day)
  lamps: { value: 1 }, floods: { value: 1 }, media: { value: 1 }, outline: { value: 1 },
  windows: { value: 1 }, signs: { value: 1 }, screens: { value: 1 }, shops: { value: 1 },
};
const LIGHTS = [];

// a light: colour = lit colour * on + a dull fixture (off, a grey) by the ambient light
export function asLight(m, ch = 'lamps', off = 0.22) {
  if (!m || !m.color || m.userData.tod) return m;
  m.userData.tod = 'light';
  LIGHTS.push({ m, base: m.color.clone(), ch, off: m.blending === THREE.AdditiveBlending ? 0 : off });
  return m;
}
// a self-lit window atlas: lit floors at night (fewer late), hazy glass by day
export function glassByDay(m, dayColor = [0.42, 0.46, 0.5]) {
  if (!m || m.userData.tod) return m;
  m.userData.tod = 'glass';
  const prev = m.onBeforeCompile, glass = { value: new THREE.Color(...dayColor) };
  m.onBeforeCompile = function (sh, r) {
    if (prev) prev.call(this, sh, r);
    Object.assign(sh.uniforms, { todDay: TOD.day, todWin: TOD.windows, todAmb: TOD.amb, todGlass: glass });
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float todDay, todWin, todAmb; uniform vec3 todGlass;')
      .replace('#include <map_fragment>', `#include <map_fragment>
      { float l = clamp(dot(diffuseColor.rgb, vec3(0.3, 0.55, 0.15)), 0.0, 1.0);
        diffuseColor.rgb = mix(diffuseColor.rgb * mix(0.35, 1.0, todWin), todGlass * todAmb * (0.72 + 0.7 * l), todDay); }`);
  };
  m.customProgramCacheKey = () => `tod-glass|${prev ? prev.toString() : ''}`;
  m.needsUpdate = true;
  return m;
}
// everything self-lit under `root` that reads as a light (brighter than white, or additive) and
// hasn't been given a role: a lamp on the given channel
export function autoLights(root, ch = 'lamps', off = 0.22) {
  root.traverse((o) => {
    const ms = !o.material ? [] : Array.isArray(o.material) ? o.material : [o.material];
    for (const m of ms) {
      if (!(m.isMeshBasicMaterial || m.isPointsMaterial) || m.userData.tod || m.userData.todSkip) continue;
      const c = m.color;
      if (Math.max(c.r, c.g, c.b) > 1.02 || m.blending === THREE.AdditiveBlending) asLight(m, ch, off);
    }
  });
}
// once per tick
export function applyDayNight(s) {
  TOD.day.value = s.daylight; TOD.amb.value = 0.07 + 0.93 * s.daylight;
  for (const k of ['lamps', 'floods', 'media', 'outline', 'windows', 'signs', 'screens', 'shops']) TOD[k].value = s[k];
  for (const L of LIGHTS) {
    const on = TOD[L.ch].value, k = L.off * (1 - on) * TOD.amb.value;
    L.m.color.copy(L.base).multiplyScalar(on); L.m.color.r += k; L.m.color.g += k; L.m.color.b += k;
  }
}
export const lightCount = () => LIGHTS.length;
