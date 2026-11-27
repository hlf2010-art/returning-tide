// Shared materials.
//  - `arch`: cheap unlit-plus-floodlight shader for all building masonry. Buildings never
//    pay for the scene's point lights; their golden wash is baked per vertex (`flood`).
//  - wet ground / props: MeshStandardMaterial lit by lamps + captured environment.
import * as THREE from 'three';
import { covers, NJ, L } from './layout.js';
import { peopleMirror, PEOPLE_MIRROR_GLSL } from './peopleReflect.js';
import { stoneTexture, fluteTexture, facadeAtlas, pavingTextures, sidewalkTextures, asphaltTextures, wetnessTexture } from './textures.js';
import { bundDoorTexture } from './surfaceDetail.js';

// three's ACES curve carries a built-in 1/0.6 exposure, so these read ~2x brighter on screen
export const FLOOD_COLOR = new THREE.Color(1.0, 0.5, 0.13);           // deep sodium gold, as the Bund's façade lighting reads at night (the reference photos)

const archVertex = /* glsl */ `
attribute float flood;
varying vec2 vUv; varying vec3 vN; varying float vFlood; varying vec3 vW;
#include <common>
#include <fog_pars_vertex>
void main() {
  vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vFlood = flood; vW = (modelMatrix * vec4(position, 1.0)).xyz;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const archFragment = /* glsl */ `
uniform sampler2D map; uniform sampler2D emissiveMap; uniform sampler2D grainMap; uniform float grainAmount;
uniform vec3 tint; uniform vec3 floodColor; uniform float floodGain; uniform float emissiveGain;
uniform vec3 skyAmbient; uniform vec3 groundAmbient;
uniform vec3 sunDir; uniform vec3 sunColor; uniform float todFlood, todWin, todDay;
varying vec2 vUv; varying vec3 vN; varying float vFlood; varying vec3 vW;
#include <common>
#include <fog_pars_fragment>
void main() {
  vec3 n = normalize(vN);
  vec3 albedo = texture2D(map, vUv).rgb * tint;
  // real stone grain (a photographed granite, world-space, ~1.6 m tile) as a ratio to its own blurred
  // average, so it adds texture without moving the tuned brightness (photoTextures.js sets it)
  if (grainAmount > 0.0) {
    vec2 gp = abs(n.y) > 0.7 ? vW.xz / 1.6 : vec2(abs(n.x) > abs(n.z) ? vW.z : vW.x, vW.y) / 1.6;
    float gl = dot(texture2D(grainMap, gp).rgb, vec3(0.3333)), ga = dot(texture2D(grainMap, gp, 7.0).rgb, vec3(0.3333));
    albedo *= mix(1.0, clamp(gl / max(ga, 0.02), 0.45, 1.7), grainAmount);
  }
  // ambient: blue dusk sky from above, warm street bounce from below, a breath of
  // directional sky from the river side so mouldings and columns keep their form
  vec3 amb = mix(groundAmbient, skyAmbient, n.y * 0.5 + 0.5);
  amb += skyAmbient * 0.5 * max(dot(n, normalize(vec3(0.7, 0.45, -0.3))), 0.0);
  // floodlights sit low and aim up: undersides catch more, top faces almost nothing
  float shape = n.y > 0.0 ? 1.0 - 0.85 * n.y : 1.0 - 0.25 * n.y;
  // real floodlighting: fixtures at the foot of the facade every ~4 m throw cones that widen and fade
  // upward, so the wash is scalloped and brightest near the base, a touch whiter close to the lamps
  float along = abs(n.x) > abs(n.z) ? vW.z : vW.x;
  float cell = fract(along / 4.1) - 0.5, h = max(vW.y, 0.0), spread = 0.16 + h * 0.03;
  float cone = exp(-cell * cell / (2.0 * spread * spread));
  float scallop = mix(0.6, 1.4, cone) * (1.0 - 0.3 * smoothstep(3.0, 30.0, h));
  vec3 fl = floodColor * mix(vec3(1.18, 1.06, 0.9), vec3(1.0), smoothstep(0.0, 9.0, h));
  vec3 col = albedo * (amb + fl * (min(vFlood, 1.12) * floodGain * todFlood * shape * scallop));
  // by day the sun (soft: November haze), no shadow of its own on the stone
  col += albedo * sunColor * max(dot(n, sunDir), 0.0);
  // lit windows: fewer late at night; by day only the odd lamp left on shows
  col += texture2D(emissiveMap, vUv).rgb * emissiveGain * todWin * (1.0 - 0.85 * todDay);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

const black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
black.needsUpdate = true;
const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
white.colorSpace = THREE.SRGBColorSpace; white.needsUpdate = true;

// The light on the stone, shared by every arch material and set from the clock (setArchLight):
// the blue hour's (the approved night look) by default
export const ARCH_LIGHT = {
  skyAmbient: { value: new THREE.Color(0.017, 0.027, 0.056) }, groundAmbient: { value: new THREE.Color(0.034, 0.027, 0.023) },
  sunDir: { value: new THREE.Vector3(0, -1, 0) }, sunColor: { value: new THREE.Color(0, 0, 0) },
  todFlood: { value: 1 }, todWin: { value: 1 }, todDay: { value: 0 },
};
const SKY_NIGHT = new THREE.Color(0.017, 0.027, 0.056), GROUND_NIGHT = new THREE.Color(0.034, 0.027, 0.023);
const SKY_DEEP = new THREE.Color(0.011, 0.014, 0.026), GROUND_DEEP = new THREE.Color(0.03, 0.024, 0.02);
const SKY_DAY = new THREE.Color(0.34, 0.35, 0.37), GROUND_DAY = new THREE.Color(0.25, 0.225, 0.19);
const SUN = new THREE.Color(1.0, 0.9, 0.76);
// from the hour (engine/timeOfDay.js todState)
export function setArchLight(s) {
  const A = ARCH_LIGHT;
  A.skyAmbient.value.copy(SKY_NIGHT).lerp(SKY_DEEP, s.night).lerp(SKY_DAY, s.daylight);
  A.groundAmbient.value.copy(GROUND_NIGHT).lerp(GROUND_DEEP, s.night).lerp(GROUND_DAY, s.daylight);
  const up = Math.max(0, Math.min(1, s.sun.y / 0.25));
  A.sunDir.value.set(s.sun.x, s.sun.y, s.sun.z);
  A.sunColor.value.copy(SUN).multiplyScalar(0.95 * up * s.daylight).lerp(new THREE.Color(1.0, 0.62, 0.36).multiplyScalar(0.5 * s.daylight), 1 - up);
  A.todFlood.value = s.floods; A.todWin.value = s.windows; A.todDay.value = s.daylight;
}

export function archMaterial({ map = white, emissiveMap = black, tint = 0xffffff, floodGain = 0.86, emissiveGain = 1.2 } = {}) {
  const m = new THREE.ShaderMaterial({
    vertexShader: archVertex, fragmentShader: archFragment, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      map: { value: null }, emissiveMap: { value: null }, grainMap: { value: null }, grainAmount: { value: 0 },
      tint: { value: new THREE.Color(tint) }, floodColor: { value: FLOOD_COLOR.clone() },
      floodGain: { value: floodGain }, emissiveGain: { value: emissiveGain },
    }]),
  });
  // night: little sky fill, so the floodlight's gold isn't washed out (photos: gold façades, dark sky);
  // shared, so the hour moves them all
  Object.assign(m.uniforms, ARCH_LIGHT);
  m.uniforms.map.value = map; m.uniforms.emissiveMap.value = emissiveMap; m.uniforms.grainMap.value = white;   // (merge() would have cloned the textures)
  return m;
}
const arch = archMaterial;

// Drizzle wetness, shared by the three exposed ground materials: 0 = the approved after-rain look,
// 1 = freshly rained on. Covered footprints (shop canopy, portico) never get the extra wetness.
export const weatherUniforms = {
  wetBoost: { value: 0 },
  groundDamp: { value: 0 },
  dayGround: { value: 0 },           // daylight 0..1: by day the ground shows its true, paler colour (the night look keeps it dark and glossy)           // 0 = dry stone (no rain lately: no puddles, matte), 1 = the after-rain look
  rainRipples: { value: 0 },          // 0..1: drizzle intensity, drives ripple density
  rippleTime: { value: 0 },           // seconds, frozen while paused
  coverXZ: { value: covers.map((c) => new THREE.Vector4(c.x0, c.x1, c.z0, c.z1)) },
};

// People's reflections (world/peopleReflect.js) in a ground material: added over the lit ground, the figure
// hiding a little of the ground's own light. wet: a GLSL expression (in the fragment's main) for how wet
// the stone is there, 0..1.
export function mirrorPeople(material, { wet = '0.0', key = 'plain', sheen = 1 } = {}) {
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    if (prev) prev.call(material, shader, renderer);
    Object.assign(shader.uniforms, peopleMirror);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPeopleWorld;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n  vPeopleWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${PEOPLE_MIRROR_GLSL}`)
      .replace('#include <opaque_fragment>', `{
        float pNoV = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
        vec4 pm = mirrorPeopleAt(roughnessFactor, pNoV, ${wet}, ${sheen.toFixed(2)});
        outgoingLight = outgoingLight * (1.0 - 0.85 * pm.a) + pm.rgb;
      }
      #include <opaque_fragment>`);
  };
  material.customProgramCacheKey = () => `people-mirror:${key}:${sheen}`;
  return material;
}

// Standing water lies flat: blend the paving normal away wherever roughness is very low.
function puddles(material, sheen = 1, slabs = false, lift = [1, 1, 1], wear = false) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.wetBoost = weatherUniforms.wetBoost;
    shader.uniforms.groundDamp = weatherUniforms.groundDamp;
    shader.uniforms.dayGround = weatherUniforms.dayGround;
    shader.uniforms.coverXZ = weatherUniforms.coverXZ;
    shader.uniforms.rainRipples = weatherUniforms.rainRipples;
    shader.uniforms.rippleTime = weatherUniforms.rippleTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vWetXZ;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n  vWetXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
      varying vec2 vWetXZ; uniform float wetBoost, groundDamp, dayGround, rainRipples, rippleTime; uniform vec4 coverXZ[${covers.length}];
      float rHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      // Raindrop rings: each cell of a jittered grid hosts one ring at a time, born at a random
      // moment, expanding and fading. Returns the surface slope (d height / d x, d height / d z).
      vec2 rippleSlope(vec2 p, float t, float density) {
        vec2 slope = vec2(0.0);
        for (int layer = 0; layer < 2; layer++) {
          float scale = layer == 0 ? 2.3 : 3.4;                         // ~0.43 m and ~0.29 m cells
          vec2 q = p * scale + float(layer) * 17.31;
          vec2 cell = floor(q), f = fract(q);
          float h = rHash(cell);
          if (h > density) continue;                                    // fewer active cells in lighter rain
          float life = fract(t * (0.75 + 0.5 * rHash(cell + 1.7)) + h * 7.0);
          vec2 c = 0.3 + 0.4 * vec2(rHash(cell + 3.1), rHash(cell + 7.7));
          vec2 d = f - c; float r = length(d) + 1e-4;
          float x = (r - life * 0.42) * 26.0;                            // ring front expanding to ~0.4 cell
          float wave = sin(x * 3.14159) * exp(-x * x * 0.5) * (1.0 - life) * (1.0 - life);
          slope += (d / r) * wave * scale;
        }
        return slope;
      }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      // dry ground: the puddle map's low spots fill back in to matte stone, a shade lighter, its fine
      // relief calmed (no foil-like glint in low sun); the after-rain look comes back with the rain
      roughnessFactor = mix(max(roughnessFactor, 0.86), roughnessFactor, groundDamp);
      diffuseColor.rgb *= mix(1.07, 1.0, groundDamp);
      diffuseColor.rgb *= mix(vec3(1.0), vec3(${lift.map((v) => v.toFixed(3)).join(', ')}), dayGround * (1.0 - 0.35 * groundDamp));
      normal = normalize(mix(nonPerturbedNormal, normal, mix(0.6, 1.0, groundDamp)));
      float exposed = 1.0;
      for (int i = 0; i < ${covers.length}; i++) { vec4 c = coverXZ[i]; if (vWetXZ.x > c.x && vWetXZ.x < c.y && vWetXZ.y > c.z && vWetXZ.y < c.w) exposed = 0.0; }
      float wetW = wetBoost * exposed;
      // damp, not glassy: dry patches lose ~30% of their roughness, nothing goes below 0.22 that wasn't already a puddle
      roughnessFactor = mix(roughnessFactor, max(roughnessFactor * 0.7, min(roughnessFactor, 0.22)), wetW);
      diffuseColor.rgb *= 1.0 - 0.14 * wetW;
      // a film of water fills the micro-relief: soften the fine normal detail so damp asphalt doesn't glitter
      normal = normalize(mix(normal, nonPerturbedNormal, 0.55 * wetW));
      float puddle = smoothstep(0.3, 0.1, roughnessFactor);
      normal = normalize(mix(normal, nonPerturbedNormal, puddle));
      // drizzle ripples: strong in standing water, faint on wet stone, only near the eye (no shimmer far off)
      if (rainRipples > 0.0) {
        float nearEye = 1.0 - smoothstep(9.0, 20.0, distance(vWetXZ, cameraPosition.xz));
        float k = rainRipples * exposed * nearEye * mix(0.12, 1.0, puddle);
        if (k > 0.001) {
          vec2 sl = rippleSlope(vWetXZ, rippleTime, 0.35 + 0.55 * rainRipples) * 0.08 * k;
          normal = normalize(normal + (viewMatrix * vec4(-sl.x, 0.0, -sl.y, 0.0)).xyz);
        }
      }
      diffuseColor.rgb *= mix(1.0, 0.55, puddle);`);

    if (wear) shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
      // An asphalt carriageway twenty years on: never one even grey. Big soft tonal drifts; rectangles of
      // newer, darker asphalt where it was dug up and patched; a utility trench filled in along a lane; crack
      // sealant laid in black snakes; the wheel paths of each lane darker and smoother; oil dripped down the
      // middle of each lane. All laid out in metres on the ground.
      float wHash(vec2 p) { return fract(sin(dot(p, vec2(27.17, 113.91))) * 43758.5453); }
      float wNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(wHash(i), wHash(i + vec2(1.0, 0.0)), f.x), mix(wHash(i + vec2(0.0, 1.0)), wHash(i + vec2(1.0, 1.0)), f.x), f.y); }
      float tarLine;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
      {
        vec2 p = vWetXZ;
        float drift = wNoise(p * 0.06) * 0.55 + wNoise(p * 0.21) * 0.3 + wNoise(p * 1.3) * 0.15;
        diffuseColor.rgb *= 0.82 + 0.34 * drift;
        // patches: on a 5 x 9 m grid, one cell in eleven, inset by a random margin
        vec2 cs = vec2(5.0, 9.0), cid = floor(p / cs), f = fract(p / cs);
        float ph = wHash(cid + 3.7);
        vec2 m0 = 0.08 + 0.3 * vec2(wHash(cid + 1.1), wHash(cid + 2.3)), m1 = 0.92 - 0.3 * vec2(wHash(cid + 4.9), wHash(cid + 6.1));
        float inP = step(ph, 0.09) * step(m0.x, f.x) * step(f.x, m1.x) * step(m0.y, f.y) * step(f.y, m1.y);
        float edgeP = inP * (1.0 - step(0.012, min(min(f.x - m0.x, m1.x - f.x) * cs.x, min(f.y - m0.y, m1.y - f.y) * cs.y)));
        diffuseColor.rgb *= mix(1.0, 0.76 + 0.1 * wNoise(p * 3.1), inP) * (1.0 - 0.3 * edgeP);
        // a trench along the road (z) in some 40 m stretches, 0.7 m wide, its seams dark
        float seg = floor(p.y / 41.0), sh = wHash(vec2(seg, 9.3));
        float tx = -26.5 + 21.0 * wHash(vec2(seg, 2.2)), dT = abs(p.x - tx);
        float inT = step(sh, 0.3) * step(dT, 0.35) * step(-28.0, p.x) * step(p.x, -4.0);
        diffuseColor.rgb *= mix(1.0, 0.76, inT) * (1.0 - 0.35 * step(sh, 0.3) * step(-28.0, p.x) * step(p.x, -4.0) * (1.0 - smoothstep(0.0, 0.03, abs(dT - 0.35))));
        // crack sealant: thin wandering black lines, here and there
        vec2 q = p * 0.45 + vec2(wNoise(p * 1.3), wNoise(p * 1.3 + 7.0)) * 0.5;
        float rdg = abs(wNoise(q) - 0.5);
        tarLine = (1.0 - smoothstep(0.001, 0.0035, rdg)) * smoothstep(0.66, 0.76, wNoise(p * 0.11 + 3.0));
        diffuseColor.rgb *= 1.0 - 0.4 * tarLine;
        // the main road's lanes: wheel paths darker, oil down the middle
        if (p.x > -28.0 && p.x < -4.0) {
          float lc = p.x < -16.0 ? (p.x < -23.2 ? -25.6 : (p.x < -19.6 ? -21.4 : -17.8)) : (p.x > -8.8 ? -6.4 : (p.x > -12.4 ? -10.6 : -14.2));
          float dx = abs(p.x - lc);
          float wheel = exp(-pow((dx - 0.85) / 0.28, 2.0));
          diffuseColor.rgb *= 1.0 - 0.1 * wheel;
          float oil = (1.0 - smoothstep(0.1, 0.35, dx)) * smoothstep(0.7, 0.85, wNoise(vec2(p.x * 5.0, p.y * 2.2)));
          diffuseColor.rgb *= 1.0 - 0.2 * oil;
        }
      }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = mix(roughnessFactor, 0.35, tarLine * 0.8);`);
    if (slabs) shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
      // Paving that has been walked on for twenty-five years: no two granite slabs quite the same shade, now
      // and then one replaced (paler, cleaner), blotches of old spills, flattened chewing gum, and the
      // stone polished smoother along the lines most feet take. The slabs are the photograph's (five to a
      // tile, 0.48 m), so every one is found from the map's uv; the rest is laid out in metres.
      float sHash(vec2 p) { return fract(sin(dot(p, vec2(41.31, 289.17))) * 15731.743); }
      float sNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(sHash(i), sHash(i + vec2(1.0, 0.0)), f.x), mix(sHash(i + vec2(0.0, 1.0)), sHash(i + vec2(1.0, 1.0)), f.x), f.y); }
      // how many feet cross here on Nanjing Road (0..1): either side of the golden belt and down the middle of
      // each half; nothing elsewhere
      float njFeet(vec2 xz) {
        if (xz.x > ${(L.facadeX).toFixed(1)} || xz.x < ${(NJ.xWest - 30).toFixed(1)} || xz.y < ${NJ.z0.toFixed(1)} || xz.y > ${NJ.z1.toFixed(1)}) return 0.0;
        float z = xz.y, w = 0.0;
        w += exp(-pow((z - ${(NJ.z0 + 6.2).toFixed(2)}) / 1.6, 2.0));
        w += exp(-pow((z - ${(NJ.zc + 1.6).toFixed(2)}) / 1.4, 2.0)) * 0.8;
        w += exp(-pow((z - ${(NJ.z1 - 3.4).toFixed(2)}) / 1.7, 2.0));
        return clamp(w * (0.75 + 0.5 * sNoise(xz * vec2(0.08, 0.6))), 0.0, 1.0);
      }
      float slabShade, slabNew, feetHere;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
      {
        vec2 sid = floor(vMapUv * 5.0 + 1e-3);
        float h = sHash(sid), h2 = sHash(sid + 17.7);
        slabNew = step(0.975, h2);                                          // one in forty relaid
        slabShade = mix(0.88 + 0.24 * h, 1.16 + 0.05 * h, slabNew);
        diffuseColor.rgb *= slabShade * vec3(1.0 + 0.03 * (h - 0.5), 1.0, 1.0 - 0.04 * (h - 0.5));
        // old spills and grime: big soft blotches, darker; less of it on a new slab
        float blot = sNoise(vWetXZ * 0.55) * 0.6 + sNoise(vWetXZ * 1.9) * 0.4;
        diffuseColor.rgb *= 1.0 - (1.0 - 0.6 * slabNew) * 0.16 * smoothstep(0.55, 0.85, blot);
        // gum: little dark discs on a 12 cm grid, a few per square metre, more where people walk
        feetHere = njFeet(vWetXZ);
        vec2 gq = vWetXZ / 0.12, gc = floor(gq);
        float gh = sHash(gc + 3.3);
        if (gh < 0.02 + 0.05 * feetHere) {
          vec2 gp = fract(gq) - (0.3 + 0.4 * vec2(sHash(gc + 5.1), sHash(gc + 8.9)));
          float gr = (0.11 + 0.12 * sHash(gc + 1.9));
          diffuseColor.rgb *= 1.0 - 0.45 * (1.0 - smoothstep(gr * 0.6, gr, length(gp)));
        }
        // the walking lines: feet darken stone a little (grease) as they polish it
        diffuseColor.rgb *= 1.0 - 0.07 * feetHere;
      }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor *= mix(0.92 + 0.16 * sHash(floor(vMapUv * 5.0 + 1e-3) + 4.4), 0.86, slabNew);
      roughnessFactor = mix(roughnessFactor, roughnessFactor * 0.62, feetHere);`);
  };
  return mirrorPeople(material, { wet: 'max(puddle, 0.5 * wetW)', key: `puddles${slabs ? '-slabs' : ''}${wear ? '-wear' : ''}-${lift.join('-')}`, sheen });
}

// Reflection strength for screen-space reflections, per pixel: standing water (low roughness in the
// wetness map) mirrors, damp stone barely glistens, more of both while it drizzles, none under cover.
export function ssrMask(material) {
  const rm = material.roughnessMap; rm.updateMatrix();
  return new THREE.ShaderMaterial({
    uniforms: { rough: { value: rm }, uvT: { value: rm.matrix }, wetBoost: weatherUniforms.wetBoost, coverXZ: weatherUniforms.coverXZ },
    vertexShader: `varying vec2 vUv; varying vec2 vXZ; varying float vViewZ; uniform mat3 uvT;
      void main() { vUv = (uvT * vec3(uv, 1.0)).xy; vXZ = (modelMatrix * vec4(position, 1.0)).xz; vec4 mv = modelViewMatrix * vec4(position, 1.0); vViewZ = mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec2 vUv; varying vec2 vXZ; varying float vViewZ; uniform sampler2D rough; uniform float wetBoost; uniform vec4 coverXZ[${covers.length}];
      void main() {
        float r = texture2D(rough, vUv).g;
        float exposed = 1.0;
        for (int i = 0; i < ${covers.length}; i++) { vec4 c = coverXZ[i]; if (vXZ.x > c.x && vXZ.x < c.y && vXZ.y > c.z && vXZ.y < c.w) exposed = 0.0; }
        float puddle = smoothstep(0.3, 0.12, r);
        float damp = (0.05 + 0.16 * wetBoost * exposed) * (1.0 - r);
        float m = max(puddle * (0.55 + 0.25 * wetBoost), damp);
        gl_FragColor = vec4(m, vViewZ, 0.0, 1.0);                       // g: the ground's view depth
      }`,
  });
}

export function createMaterials() {
  const M = {};
  const stone = stoneTexture();
  M.stone = arch({ map: stone });
  M.stoneDark = arch({ map: stone, tint: 0x6b6862 });
  M.flute = arch({ map: fluteTexture() });
  for (const s of ['classic', 'arched', 'rustic', 'deco', 'brick']) M[s] = arch(facadeAtlas(s));
  M.brick.uniforms.floodGain.value = 0.76;
  M.roof = arch({ tint: 0x1b1d22, floodGain: 0.2 });
  M.copper = arch({ tint: 0x5cc49c, floodGain: 1.25 });        // verdigris roofs: the Peace Hotel's pyramid is lit green, its own floods
  M.copper.uniforms.floodColor.value.setRGB(0.5, 1.0, 0.78);
  M.bronze = arch({ tint: 0x3a2c1c, floodGain: 0.7 });
  M.glassDark = arch({ tint: 0x0b0e14, floodGain: 0.1 });
  M.door = arch({ map: bundDoorTexture(), floodGain: 0.8 });     // the rusticated ground floors' closed doors (world/bund.js rusticDoors)

  const pave = pavingTextures(), walk = sidewalkTextures(), asph = asphaltTextures();
  // after rain: damp everywhere, puddles only in the low spots (about one part in eight), not glass-smooth
  const wetDeck = wetnessTexture(401, { puddle: 0.36, dry: 0.62, wet: 0.12 }), wetRoad = wetnessTexture(402, { puddle: 0.3, dry: 0.56, wet: 0.12 });
  wetDeck.repeat.set(1 / 2.2, 1 / 2.2); wetRoad.repeat.set(1 / 1.7, 1 / 1.7); // relative to each map's own metre scale: puddles a metre or two across, not whole lanes
  const std = (o) => new THREE.MeshStandardMaterial(o);
  M.deck = puddles(std({ map: pave.map, normalMap: pave.normalMap, roughnessMap: wetDeck, roughness: 1, metalness: 0, envMapIntensity: 1.0 }), 1, false, [2.4, 2.35, 2.3]);
  M.sidewalk = puddles(std({ map: walk.map, normalMap: walk.normalMap, roughnessMap: wetnessTexture(403, { puddle: 0.32, dry: 0.7, wet: 0.12 }), roughness: 1, metalness: 0 }), 1, true, [4.4, 4.4, 4.2]);
  M.sidewalk.roughnessMap.repeat.set(1 / 3, 1 / 3);
  M.asphalt = puddles(std({ map: asph.map, normalMap: asph.normalMap, normalScale: new THREE.Vector2(0.7, 0.7), roughnessMap: wetRoad, roughness: 1, metalness: 0 }), 0.35, false, [4.6, 4.2, 3.8], true);
  M.granite = mirrorPeople(std({ map: stone, color: 0x8d8a84, roughness: 0.55, metalness: 0 }));
  M.iron = std({ color: 0x141a17, roughness: 0.42, metalness: 0.7 });
  M.steel = std({ color: 0x9aa0a6, roughness: 0.3, metalness: 0.9 });
  // road paint, worn: chips knocked out where tyres run over it (alpha), grime in what is left
  const paintWear = (() => {
    if (typeof document === 'undefined') return null;
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
    const ctx = c.getContext('2d'), img = ctx.createImageData(S, S), d = img.data;
    let a = 7; const r = () => { a = (a * 16807) % 2147483647; return a / 2147483647; };
    for (let i = 0; i < S * S; i++) { const v = 200 + r() * 55; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
    for (let i = 0; i < 260; i++) {
      const x = r() * S, y = r() * S, rad = 0.6 + r() * r() * r() * 5;
      for (let yy = Math.floor(y - rad); yy <= y + rad; yy++) for (let xx = Math.floor(x - rad); xx <= x + rad; xx++) {
        if ((xx - x) ** 2 + (yy - y) ** 2 > rad * rad * (0.5 + 0.5 * r())) continue;
        const q = (((yy % S) + S) % S) * S + (((xx % S) + S) % S); d[q * 4 + 3] = 0;
      }
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
    return t;
  })();
  M.paint = std({ map: paintWear, alphaTest: paintWear ? 0.5 : 0, color: 0xd8d6cf, roughness: 0.55, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  M.paintYellow = std({ map: paintWear, alphaTest: paintWear ? 0.5 : 0, color: 0xc79a1e, roughness: 0.55, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  M.hedge = std({ color: 0x1c2e1a, roughness: 0.95 });
  M.wood = std({ color: 0x5a4030, roughness: 0.6 });
  M.rubber = std({ color: 0x0b0b0c, roughness: 0.8 });
  M.lampGlass = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.6, 0.9), fog: false });     // bright, without a bloom ball round every lamp
  return M;
}
