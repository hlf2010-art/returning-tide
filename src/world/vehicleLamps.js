// Night traffic is lamps (docs/living-city-architecture.md D6, §5.3): every vehicle's head lamps,
// tail lamps (brighter while braking) and the pool its head lamps throw on the road, for the whole
// city in two draw calls. Beyond world/vehicles.js BODY_FAR the car itself isn't drawn at all: from
// the promenade the road 200 m off is a moving stream of white and red.
//   update(sources, eye, level)   sources: [{ list: sim vehicles, z: frame offset }], level: 0..1 (the
//                                 hour's lamps, engine/timeOfDay.js); nothing is drawn by day
import * as THREE from 'three';

const MAX = 512;
const HEAD = new THREE.Color(2.6, 2.4, 2.05), TAIL = new THREE.Color(1.5, 0.06, 0.03), BRAKE = new THREE.Color(3.6, 0.12, 0.05);

function spriteMaterial() {
  return new THREE.ShaderMaterial({
    fog: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { minPx: { value: 0.0016 } }]),
    vertexShader: /* glsl */ `
      attribute vec4 iPos;     // x, y, z, world size
      attribute vec3 iCol;
      uniform float minPx;
      varying vec2 vUv; varying vec3 vCol;
      #include <common>
      #include <fog_pars_vertex>
      void main() {
        vec4 mv = viewMatrix * vec4(iPos.xyz, 1.0);
        float s = max(iPos.w, -mv.z * minPx * 3.0);      // never smaller than a few pixels: far lamps stay lamps
        mv.xy += position.xy * s;
        mv.z += s * 0.5;                                   // (drawn a little toward you: not swallowed by its own lamp housing)
        vUv = uv; vCol = iCol * (iPos.w / s * 0.6 + 0.4);
        gl_Position = projectionMatrix * mv;
        vec4 mvPosition = mv;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vCol;
      #include <common>
      #include <fog_pars_fragment>
      void main() {
        float r = length(vUv - 0.5) * 2.0;
        float a = exp(-r * r * 5.0) + 0.6 * exp(-r * r * 40.0);
        if (a < 0.01) discard;
        gl_FragColor = vec4(vCol, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
        gl_FragColor.rgb *= a;
      }`,
  });
}

export function createVehicleLamps({ scene }) {
  const group = new THREE.Group(); group.name = 'vehicle-lamps'; scene.add(group);
  const quad = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry(); geo.index = quad.index; geo.attributes.position = quad.attributes.position; geo.attributes.uv = quad.attributes.uv;
  const iPos = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4).setUsage(THREE.DynamicDrawUsage);
  const iCol = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('iPos', iPos); geo.setAttribute('iCol', iCol); geo.instanceCount = 0;
  const sprites = new THREE.Mesh(geo, spriteMaterial()); sprites.frustumCulled = false; sprites.renderOrder = 5; sprites.name = 'vehicle-lamps';
  group.add(sprites);
  // the pools of light on the road ahead
  const poolTex = (() => {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 40, 2, 32, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 128); return new THREE.CanvasTexture(c);
  })();
  const poolGeo = new THREE.PlaneGeometry(3.2, 7).rotateX(-Math.PI / 2);
  const pools = new THREE.InstancedMesh(poolGeo, new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4, fog: true }), MAX / 4);
  pools.instanceMatrix.setUsage(THREE.DynamicDrawUsage); pools.frustumCulled = false; pools.count = 0; pools.name = 'vehicle-pools';
  for (let i = 0; i < MAX / 4; i++) pools.setColorAt(i, HEAD);
  group.add(pools);
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _up = new THREE.Vector3(0, 1, 0), _c = new THREE.Color();
  const stats = { lamps: 0, cars: 0 };
  let n = 0;
  function lamp(x, y, z, size, col, k) {
    if (n >= MAX || k < 0.02) return;
    iPos.setXYZW(n, x, y, z, size); iCol.setXYZ(n, col.r * k, col.g * k, col.b * k); n++;
  }
  return {
    group, stats,
    update(sources, eye, level = 1) {
      n = 0; let np = 0, cars = 0;
      if (level > 0.02) {
        for (const { list, z: oz = 0 } of sources) {
          for (const v of list) {
            if (!v.active || v.hidden) continue;
            const vx = v.x, vz = v.z + oz, dx = eye.x - vx, dz = eye.z - vz, d2 = dx * dx + dz * dz;
            if (d2 > 700 * 700) continue;
            const yaw = v.yaw || 0, fx = Math.sin(yaw), fz = Math.cos(yaw), rx = fz, rz = -fx;
            const d = Math.sqrt(d2) || 1, facing = (fx * dx + fz * dz) / d;          // 1: coming at you
            const hl = v.len / 2 - 0.08, hw = (v.width || 1.8) * 0.3, bus = !!v.bus;
            // (close by, the car's own lamp meshes carry it: the halo only, fainter)
            const near = Math.min(1, Math.max(0.3, (d - 5) / 25)), lv = level * near;
            const head = lv * Math.min(1, Math.max(0, (facing + 0.25) / 0.6)), tail = lv * Math.min(1, Math.max(0, (-facing + 0.25) / 0.6));
            const hy = bus ? 0.75 : 0.66, ty = bus ? 1.0 : 0.82, tc = v.braking ? BRAKE : TAIL;
            if (v.ebike) {                                    // an e-bike: one small lamp each end, no pool (world/ebikeView.js)
              const k = v.fade ?? 1;
              lamp(vx + fx * 0.66, 0.98, vz + fz * 0.66, 0.26, HEAD, head * k);
              lamp(vx - fx * 0.74, 0.62, vz - fz * 0.74, v.braking ? 0.26 : 0.2, tc, tail * k);
              cars++; continue;
            }
            for (const s of [-1, 1]) {
              lamp(vx + fx * (hl + 0.05) + rx * hw * s, hy, vz + fz * (hl + 0.05) + rz * hw * s, 0.42, HEAD, head);
              lamp(vx - fx * (hl + 0.05) + rx * hw * s, ty, vz - fz * (hl + 0.05) + rz * hw * s, v.braking ? 0.4 : 0.32, tc, tail);
            }
            if (bus) lamp(vx + fx * (hl + 0.05), 2.9, vz + fz * (hl + 0.05), 0.5, _c.setRGB(2.2, 1.1, 0.2), level * Math.max(0.3, head));   // (the route sign's amber)
            if (d2 < 160 * 160 && np < pools.instanceMatrix.count) {
              _p.set(vx + fx * (hl + 3.4), 0.03, vz + fz * (hl + 3.4)); _q.setFromAxisAngle(_up, yaw);
              pools.setMatrixAt(np, _m.compose(_p, _q, _s)); pools.setColorAt(np, _c.copy(HEAD).multiplyScalar(0.08 * level)); np++;
            }
            cars++;
          }
        }
      }
      geo.instanceCount = n; sprites.visible = n > 0;
      iPos.needsUpdate = iCol.needsUpdate = true; iPos.clearUpdateRanges(); iCol.clearUpdateRanges(); iPos.addUpdateRange(0, n * 4); iCol.addUpdateRange(0, n * 3);
      pools.count = np; pools.visible = np > 0; pools.instanceMatrix.needsUpdate = true; if (pools.instanceColor) pools.instanceColor.needsUpdate = true;
      stats.lamps = n; stats.cars = cars;
    },
  };
}
