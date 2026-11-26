// Curtain-wall glass for the towers seen up close (Lujiazui): instead of a flat tint by day, each
// pixel reflects the sky the sky dome draws (world/sky.js's own uniforms: the hour, the afterglow, the
// sun), weighted by Fresnel (the glass is dark and shows the floor behind it seen straight on, a mirror
// at a grazing angle), with
//  - a city mirrored below and along the horizon: a ragged skyline of dim towers, their windows lit
//    after dark (no real reflection is rendered; this is what a glass wall in a city shows),
//  - every panel set a hair off true (a few milliradians, by panel), so reflections break at the
//    joints the way real curtain walls do instead of sliding across one perfect mirror,
//  - opaque spandrel bands at the slabs, aluminium mullions lit by the day,
//  - the rooms behind: the window atlas (map) dimly by day, as the lit floors by night.
// UVs are the curtain atlas's: u = metres / 24 (16 bays of 1.5 m), v = metres / 100.8 (24 floors of 4.2 m).
import * as THREE from 'three';
import { TOD } from './dayNight.js';
import { SKY } from './sky.js';

// the sky as world/sky.js draws it (no clouds) and the city a glass wall shows: shared by both materials here
const GLSL = `
      float fh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      // the sky as world/sky.js draws it (gradient, afterglow, sun), without its clouds
      vec3 fSky(vec3 d) {
        float h = max(d.y, 0.0);
        vec3 zen = mix(mix(vec3(0.006, 0.017, 0.07), vec3(0.004, 0.007, 0.02), skNight), vec3(0.2, 0.33, 0.58), skDay);
        vec3 mid = mix(mix(vec3(0.02, 0.058, 0.2), vec3(0.016, 0.022, 0.045), skNight), vec3(0.38, 0.49, 0.65), skDay);
        vec3 hor = mix(mix(vec3(0.085, 0.15, 0.32), vec3(0.075, 0.062, 0.07), skNight), vec3(0.62, 0.66, 0.71), skDay);
        vec3 c = mix(mix(hor, mid, smoothstep(0.0, 0.22, h)), zen, smoothstep(0.18, 0.95, h));
        vec2 f2 = normalize(d.xz + 1e-5); float west = max(f2.x * skSide, 0.0);
        c += vec3(1.0, 0.36, 0.1) * pow(west, 3.0) * exp(-h * 5.0) * 0.75 * skGlow;
        float sd = max(dot(d, skSun), 0.0), up = smoothstep(-0.05, 0.1, skSun.y);
        c += mix(vec3(1.0, 0.7, 0.4), vec3(1.0, 0.95, 0.85), smoothstep(0.05, 0.4, skSun.y)) * (pow(sd, 1400.0) * 9.0 + pow(sd, 60.0) * 0.5 + pow(sd, 6.0) * 0.08) * up * skDay;
        c = mix(c, mix(vec3(0.075, 0.11, 0.2), vec3(0.6, 0.62, 0.64), skDay), skHaze * 0.4 * (1.0 - smoothstep(0.0, 0.3, h)));
        // a pale overcast sheet by day, so the high sky isn't a pure gradient
        c = mix(c, vec3(0.7, 0.72, 0.75) * (0.85 + 0.15 * fh(floor(d.xz / (h + 0.15) * 3.0))), 0.18 * skDay * smoothstep(0.05, 0.5, h));
        return c;
      }
      // what a tower's glass shows below and along the horizon: other towers, the street
      vec3 fCity(vec3 d, vec3 sky) {
        float az = atan(d.x, d.z) * 9.0, col = floor(az * 6.0), sky1 = 0.02 + 0.26 * pow(fh(vec2(col, 3.1)), 2.2) + 0.05 * fh(vec2(floor(az * 23.0), 7.7));
        float elev = d.y;
        if (elev > sky1) return sky;
        float shade = 0.75 + 0.5 * fh(vec2(col, 9.3));
        vec3 tower = mix(vec3(0.012, 0.016, 0.026), vec3(0.2, 0.235, 0.27) * shade, todDay) * mix(1.0, 1.0 + 0.4 * smoothstep(0.0, 0.12, sky1 - elev), todDay);
        // their windows after dark
        vec2 w = vec2(az * 90.0, elev * 130.0); float lit = step(0.9, fh(floor(w))) * step(0.3, fract(w.x)) * step(0.35, fract(w.y));
        tower += vec3(1.0, 0.82, 0.56) * lit * 0.22 * (1.0 - todDay) * todWin;
        vec3 street = mix(vec3(0.02, 0.022, 0.03), vec3(0.24, 0.245, 0.25), todDay);
        return elev < -0.06 ? mix(tower, street, smoothstep(-0.06, -0.3, elev)) : tower;
      }
`;

export function facadeGlass(map, { tint = [0.78, 0.86, 0.93], f0 = 0.3, frame = [0.62, 0.65, 0.68], spandrel = 0.2, body = [0.035, 0.042, 0.05], side = THREE.FrontSide, seed = 0 } = {}) {
  const m = new THREE.MeshBasicMaterial({ map, side });
  m.userData.tod = 'facade';                                   // (dayNight's helpers leave it alone)
  const U = { fTint: { value: new THREE.Color(...tint) }, fF0: { value: f0 }, fFrame: { value: new THREE.Color(...frame) }, fSpan: { value: spandrel }, fBody: { value: new THREE.Color(...body) }, fSeed: { value: seed } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U, { todDay: TOD.day, todWin: TOD.windows, todAmb: TOD.amb, skDay: SKY.day, skNight: SKY.night, skGlow: SKY.glow, skSide: SKY.side, skHaze: SKY.haze, skSun: SKY.sunDir });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFW; varying vec3 vFN; varying vec2 vFU;')
      .replace('#include <fog_vertex>', '#include <fog_vertex>\nvFW = (modelMatrix * vec4(transformed, 1.0)).xyz; vFN = normalize(mat3(modelMatrix) * normal); vFU = uv;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
      varying vec3 vFW; varying vec3 vFN; varying vec2 vFU;
      uniform float todDay, todWin, todAmb, skDay, skNight, skGlow, skSide, skHaze, fF0, fSpan, fSeed; uniform vec3 skSun, fTint, fFrame, fBody;
      ${GLSL}`)
      .replace('#include <map_fragment>', `
      #ifdef USE_MAP
      {
        // the atlas is 24 floors x 16 bays (100.8 m x 24 m); a tall tower would show the same pattern
        // every 100 m, so each repeat is shifted by whole bays and floors (seams stay on the frames)
        vec2 tl = floor(vMapUv), mUv = vMapUv;
        mUv.x += floor(fh(vec2(tl.y, tl.x + fSeed + 3.0)) * 16.0) / 16.0;
        mUv.y += floor(fh(vec2(tl.x, tl.y + fSeed + 5.0)) * 24.0) / 24.0;
        diffuseColor *= textureGrad(map, mUv, dFdx(vMapUv), dFdy(vMapUv));
      }
      #endif
      {
        vec3 V = normalize(vFW - cameraPosition), N = dot(vFN, vFN) > 1e-4 ? normalize(vFN) : -V;
        vec2 g = vFU * vec2(16.0, 24.0), cell = floor(g), fu = fract(g), fw = max(fwidth(g), vec2(1e-4));
        // how much of a panel a pixel covers: far off, the joints and tilts average out instead of shimmering
        float detail = 1.0 - smoothstep(0.18, 0.7, max(fw.x, fw.y));
        float h1 = fh(cell + fSeed), h2 = fh(cell.yx + fSeed + 17.0);
        vec3 T = normalize(vec3(-N.z, 0.0, N.x) + 1e-4);
        bool roof = abs(N.y) > 0.6;
        if (!roof) N = normalize(N + (T * (h1 - 0.5) * 0.022 + vec3(0.0, 1.0, 0.0) * (h2 - 0.5) * 0.016) * detail);
        // box-filtered lines: a mullion either side of each bay (4.5 % each), a transom at each floor (3 %)
        vec2 d2 = min(fu, 1.0 - fu);
        float mx = 1.0 - smoothstep(0.045 - fw.x, 0.045 + fw.x, d2.x), my = 1.0 - smoothstep(0.03 - fw.y, 0.03 + fw.y, fu.y);
        float mull = roof ? 0.0 : mix(0.09 + 0.03, max(mx, my), detail);
        float span = roof ? 0.0 : mix(fSpan, 1.0 - smoothstep(fSpan - fw.y, fSpan + fw.y, fu.y), detail);
        vec3 R = reflect(V, N);
        float ct = clamp(dot(-V, N), 0.0, 1.0), F = fF0 + (1.0 - fF0) * pow(1.0 - ct, 5.0);
        // (after dark the sky it mirrors is Shanghai's: lit from below, purple-orange low down)
        vec3 refl = fCity(R, fSky(R) * mix(1.7, 1.0, todDay) + vec3(0.06, 0.042, 0.05) * (1.0 - smoothstep(-0.05, 0.4, R.y)) * (1.0 - todDay)) * fTint;
        // the rooms behind the glass: the atlas, faint by day (lit offices only just show), the lit floors by night
        float l = dot(diffuseColor.rgb, vec3(0.3, 0.55, 0.15));
        float lw = smoothstep(0.1, 0.4, l) * (1.0 - todDay);
        vec3 inside = mix(diffuseColor.rgb * mix(0.35, 1.0, todWin) + fBody * 0.3 * (0.5 + h1) * (1.0 - todDay), fBody * todAmb * (0.7 + 0.6 * h1) + diffuseColor.rgb * 0.12 * smoothstep(0.25, 0.6, l), todDay);
        vec3 spanC = mix(fBody * 0.6, fBody * 1.6, todDay) * (0.9 + 0.2 * h2);
        vec3 c = mix(mix(inside, spanC, span), refl, mix(F, min(1.0, F * 1.6 + 0.08), span) * (1.0 - 0.7 * lw * (1.0 - span)));
        vec3 frameC = fFrame * todAmb * (0.55 + 0.45 * max(dot(vFN, normalize(skSun + vec3(0.0, 0.3, 0.0))), 0.0)) + fFrame * 0.04;
        c = mix(c, frameC, clamp(mull, 0.0, 1.0) * 0.85);
        if (roof) c = mix(vec3(0.02), vec3(0.3, 0.31, 0.32), todDay) * (0.8 + 0.3 * h1);
        diffuseColor.rgb = c;
      }`);
  };
  m.customProgramCacheKey = () => 'facade-glass-v4';
  return m;
}

// The far towers (world/skyline.js, seen from the Bund across the river). One map holds what each
// tower shows at night (lit floors, slab lines, LED mesh); the shader builds the rest from the UVs:
//  - with `grid` ([bays per u, floors per v]) the curtain wall itself: mullions at every bay, an
//    opaque spandrel at every slab, each panel set a hair off true so reflections break at the joints,
//    all box-filtered so far off they average into a tone instead of shimmering;
//  - by day the glass's own tint where it is seen straight on, the sky and the city it faces at an
//    angle (Fresnel), the sunny side lit and the far side in shade, aluminium frames catching the sun;
//  - after dark the unlit glass still mirrors the city-lit sky (Shanghai's low sky glows), so the
//    towers read as glass and as form, not as flat black cut-outs with lights on them;
//  - aerial haze: far and low towers drift toward the horizon colour, tops stand out clearer.
export function skylineGlass(m, dayColor = [0.46, 0.53, 0.6], f0 = 0.2, { grid = null, haze = 1 } = {}) {
  if (!m || m.userData.tod) return m;
  m.userData.tod = 'glass';
  const glass = { value: new THREE.Color(...dayColor) };
  if (grid && m.map) m.defines = { ...(m.defines || {}), SKY_GRID: 1 };
  const U = { fGrid: { value: new THREE.Vector2(...(grid || [1, 1])) }, fHaze: { value: haze } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U, { todDay: TOD.day, todWin: TOD.windows, todAmb: TOD.amb, todGlass: glass, skDay: SKY.day, skNight: SKY.night, skGlow: SKY.glow, skSide: SKY.side, skHaze: SKY.haze, skSun: SKY.sunDir, fF0: { value: f0 } });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFW; varying vec3 vFN;')
      .replace('#include <fog_vertex>', '#include <fog_vertex>\nvFW = (modelMatrix * vec4(transformed, 1.0)).xyz; vFN = normalize(mat3(modelMatrix) * normal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
      varying vec3 vFW; varying vec3 vFN;
      uniform float todDay, todWin, todAmb, skDay, skNight, skGlow, skSide, skHaze, fF0, fHaze; uniform vec3 todGlass, skSun; uniform vec2 fGrid;
      ${GLSL}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
      { float l = clamp(dot(diffuseColor.rgb, vec3(0.3, 0.55, 0.15)), 0.0, 1.0);
        vec3 V = normalize(vFW - cameraPosition), N0 = dot(vFN, vFN) > 1e-4 ? normalize(vFN) : -V, N = N0;   // (no normals: seen straight on)
        bool roof = abs(N0.y) > 0.6;
        float mullV = 0.0, mull = 0.0, span = 0.0, detail = 0.0, h1 = 0.5, h2 = 0.5;
        #if defined(SKY_GRID) && defined(USE_MAP)
        if (!roof) {
          vec2 g = vMapUv * fGrid, cell = floor(g), fu = fract(g), fw = max(fwidth(g), vec2(1e-4));
          detail = 1.0 - smoothstep(0.2, 0.75, max(fw.x, fw.y));
          h1 = fh(cell); h2 = fh(cell.yx + 17.0);
          vec3 T = normalize(vec3(-N0.z, 0.0, N0.x) + 1e-4);
          N = normalize(N0 + (T * (h1 - 0.5) * 0.007 + vec3(0.0, 1.0, 0.0) * (h2 - 0.5) * 0.005) * detail);   // (a few mrad: the city's reflection breaks at the joints, still reads as a reflection)
          float dx = min(fu.x, 1.0 - fu.x);
          mullV = mix(0.12, 1.0 - smoothstep(0.06 - fw.x, 0.06 + fw.x, dx), detail);
          float sl = 1.0 - smoothstep(0.16 - fw.y, 0.16 + fw.y, fu.y);
          span = mix(0.16, sl, detail);
          mull = max(mullV, mix(0.04, 1.0 - smoothstep(0.03 - fw.y, 0.03 + fw.y, abs(fu.y - 0.16)), detail));
        }
        #endif
        vec3 R = reflect(V, N);
        float F = fF0 + (1.0 - fF0) * pow(1.0 - clamp(dot(-V, N), 0.0, 1.0), 5.0);
        // by day: the glass's own colour, deeper and more saturated than a grey haze, the window grid kept,
        // the sunny side lit and the far side in shade, then the sky in it at a glancing angle
        float gg = dot(todGlass, vec3(0.33));
        vec3 deep = mix(vec3(gg), todGlass, 1.4);
        float sunlit = 0.62 + 0.75 * max(dot(N0, normalize(skSun)), 0.0);
        vec3 tint = deep * todAmb * (0.42 + 0.5 * l) * sunlit * (0.88 + 0.24 * h1);
        vec3 refl = fCity(R, fSky(R)) * mix(vec3(1.0), deep * 1.9, 0.85);   // (tinted glass tints what it mirrors)
        vec3 glassD = mix(tint, refl, clamp(F * 1.25 + 0.03, 0.0, 1.0));
        vec3 spanD = deep * todAmb * sunlit * 0.36 + refl * 0.14;
        vec3 frameD = mix(deep, vec3(0.62, 0.64, 0.67), 0.4) * todAmb * (0.3 + 0.5 * max(dot(N0, normalize(skSun)), 0.0));
        vec3 day = roof ? tint * 0.8 : mix(mix(glassD, spanD, span * 0.85), frameD, mull * 0.5);
        // after dark: the lit floors (mullions cross them), and where a floor is dark the glass mirrors
        // the city-lit sky and the towers around
        vec3 nsky = fSky(R) * 1.7 + vec3(0.06, 0.042, 0.05) * (1.0 - smoothstep(-0.05, 0.4, R.y)) * (1.0 - todDay);
        vec3 nrefl = fCity(R, nsky);
        vec3 lit = diffuseColor.rgb * mix(0.35, 1.0, todWin) * (1.0 - 0.45 * mullV * detail);
        float dark = 1.0 - smoothstep(0.08, 0.35, l);
        vec3 night = roof ? diffuseColor.rgb * 0.5 : lit + nrefl * clamp(F * 1.2 + 0.06, 0.0, 1.0) * dark * (1.0 - 0.4 * span) + vec3(0.016, 0.018, 0.024) * mull * detail * dark;
        vec3 c = mix(night, day, todDay);
        // aerial haze: distance thickens it, height thins it
        float dist = length(vFW - cameraPosition);
        vec3 hzC = fSky(normalize(vec3(V.x, 0.04, V.z))) * mix(1.6, 1.0, todDay) + vec3(0.05, 0.036, 0.045) * (1.0 - todDay);
        float hz = (1.0 - exp(-dist / 1400.0)) * (1.0 - 0.6 * smoothstep(20.0, 420.0, vFW.y)) * mix(0.42, 0.12, todDay) * fHaze;
        diffuseColor.rgb = mix(c, hzC, hz); }`);
  };
  m.customProgramCacheKey = () => 'skyline-glass-v5' + (grid ? 'g' : '');
  m.needsUpdate = true;
  return m;
}
