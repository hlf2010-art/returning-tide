// Shared materials.
//  - `arch`: cheap unlit-plus-floodlight shader for all building masonry. Buildings never
//    pay for the scene's point lights; their golden wash is baked per vertex (`flood`).
//  - wet ground / props: MeshStandardMaterial lit by lamps + captured environment.
import * as THREE from 'three';
import { covers } from './layout.js';
import { stoneTexture, fluteTexture, facadeAtlas, pavingTextures, sidewalkTextures, asphaltTextures, wetnessTexture } from './textures.js';

// three's ACES curve carries a built-in 1/0.6 exposure, so these read ~2x brighter on screen
export const FLOOD_COLOR = new THREE.Color(1.0, 0.52, 0.18);

const archVertex = /* glsl */ `
attribute float flood;
varying vec2 vUv; varying vec3 vN; varying float vFlood;
#include <common>
#include <fog_pars_vertex>
void main() {
  vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vFlood = flood;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const archFragment = /* glsl */ `
uniform sampler2D map; uniform sampler2D emissiveMap;
uniform vec3 tint; uniform vec3 floodColor; uniform float floodGain; uniform float emissiveGain;
uniform vec3 skyAmbient; uniform vec3 groundAmbient;
varying vec2 vUv; varying vec3 vN; varying float vFlood;
#include <common>
#include <fog_pars_fragment>
void main() {
  vec3 n = normalize(vN);
  vec3 albedo = texture2D(map, vUv).rgb * tint;
  // ambient: blue dusk sky from above, warm street bounce from below, a breath of
  // directional sky from the river side so mouldings and columns keep their form
  vec3 amb = mix(groundAmbient, skyAmbient, n.y * 0.5 + 0.5);
  amb += skyAmbient * 0.5 * max(dot(n, normalize(vec3(0.7, 0.45, -0.3))), 0.0);
  // floodlights sit low and aim up: undersides catch more, top faces almost nothing
  float shape = n.y > 0.0 ? 1.0 - 0.85 * n.y : 1.0 - 0.25 * n.y;
  vec3 col = albedo * (amb + floodColor * (min(vFlood, 1.12) * floodGain * shape));
  col += texture2D(emissiveMap, vUv).rgb * emissiveGain;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

const black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
black.needsUpdate = true;
const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
white.colorSpace = THREE.SRGBColorSpace; white.needsUpdate = true;

export function archMaterial({ map = white, emissiveMap = black, tint = 0xffffff, floodGain = 0.6, emissiveGain = 1.2 } = {}) {
  const m = new THREE.ShaderMaterial({
    vertexShader: archVertex, fragmentShader: archFragment, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      map: { value: null }, emissiveMap: { value: null },
      tint: { value: new THREE.Color(tint) }, floodColor: { value: FLOOD_COLOR.clone() },
      floodGain: { value: floodGain }, emissiveGain: { value: emissiveGain },
      skyAmbient: { value: new THREE.Color(0.05, 0.08, 0.17) },
      groundAmbient: { value: new THREE.Color(0.075, 0.06, 0.05) },
    }]),
  });
  m.uniforms.map.value = map; m.uniforms.emissiveMap.value = emissiveMap;   // (merge() would have cloned the textures)
  return m;
}
const arch = archMaterial;

// Drizzle wetness, shared by the three exposed ground materials: 0 = the approved after-rain look,
// 1 = freshly rained on. Covered footprints (shop canopy, portico) never get the extra wetness.
export const weatherUniforms = {
  wetBoost: { value: 0 },
  coverXZ: { value: covers.map((c) => new THREE.Vector4(c.x0, c.x1, c.z0, c.z1)) },
};

// Standing water lies flat: blend the paving normal away wherever roughness is very low.
function puddles(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.wetBoost = weatherUniforms.wetBoost;
    shader.uniforms.coverXZ = weatherUniforms.coverXZ;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vWetXZ;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n  vWetXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
      varying vec2 vWetXZ; uniform float wetBoost; uniform vec4 coverXZ[${covers.length}];`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      float exposed = 1.0;
      for (int i = 0; i < ${covers.length}; i++) { vec4 c = coverXZ[i]; if (vWetXZ.x > c.x && vWetXZ.x < c.y && vWetXZ.y > c.z && vWetXZ.y < c.w) exposed = 0.0; }
      float wetW = wetBoost * exposed;
      // damp, not glassy: dry patches lose ~40% of their roughness, nothing goes below 0.2 that wasn't already a puddle
      roughnessFactor = mix(roughnessFactor, max(roughnessFactor * 0.6, min(roughnessFactor, 0.2)), wetW);
      diffuseColor.rgb *= 1.0 - 0.14 * wetW;
      float puddle = smoothstep(0.3, 0.1, roughnessFactor);
      normal = normalize(mix(normal, nonPerturbedNormal, puddle));
      diffuseColor.rgb *= mix(1.0, 0.55, puddle);`);
  };
  return material;
}

export function createMaterials() {
  const M = {};
  const stone = stoneTexture();
  M.stone = arch({ map: stone });
  M.stoneDark = arch({ map: stone, tint: 0x6b6862 });
  M.flute = arch({ map: fluteTexture() });
  for (const s of ['classic', 'arched', 'rustic', 'deco', 'brick']) M[s] = arch(facadeAtlas(s));
  M.brick.uniforms.floodGain.value = 0.55;
  M.roof = arch({ tint: 0x1b1d22, floodGain: 0.2 });
  M.copper = arch({ tint: 0x58b090, floodGain: 0.75 });        // verdigris roofs
  M.bronze = arch({ tint: 0x3a2c1c, floodGain: 0.7 });
  M.glassDark = arch({ tint: 0x0b0e14, floodGain: 0.1 });

  const pave = pavingTextures(), walk = sidewalkTextures(), asph = asphaltTextures();
  const wetDeck = wetnessTexture(401), wetRoad = wetnessTexture(402, { puddle: 0.5, dry: 0.5, wet: 0.06 });
  wetDeck.repeat.set(1 / 6, 1 / 6); wetRoad.repeat.set(1 / 5, 1 / 5); // relative to each map's own metre scale
  const std = (o) => new THREE.MeshStandardMaterial(o);
  M.deck = puddles(std({ map: pave.map, normalMap: pave.normalMap, roughnessMap: wetDeck, roughness: 1, metalness: 0, envMapIntensity: 1.0 }));
  M.sidewalk = puddles(std({ map: walk.map, normalMap: walk.normalMap, roughnessMap: wetnessTexture(403, { puddle: 0.44, dry: 0.7 }), roughness: 1, metalness: 0 }));
  M.sidewalk.roughnessMap.repeat.set(1 / 9, 1 / 9);
  M.asphalt = puddles(std({ map: asph.map, normalMap: asph.normalMap, normalScale: new THREE.Vector2(0.7, 0.7), roughnessMap: wetRoad, roughness: 1, metalness: 0 }));
  M.granite = std({ map: stone, color: 0x8d8a84, roughness: 0.55, metalness: 0 });
  M.iron = std({ color: 0x141a17, roughness: 0.42, metalness: 0.7 });
  M.steel = std({ color: 0x9aa0a6, roughness: 0.3, metalness: 0.9 });
  M.paint = std({ color: 0xd8d6cf, roughness: 0.55, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  M.paintYellow = std({ color: 0xc79a1e, roughness: 0.55, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  M.hedge = std({ color: 0x1c2e1a, roughness: 0.95 });
  M.wood = std({ color: 0x5a4030, roughness: 0.6 });
  M.rubber = std({ color: 0x0b0b0c, roughness: 0.8 });
  M.lampGlass = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.3, 1.25), fog: false });
  return M;
}
