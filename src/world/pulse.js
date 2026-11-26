// The city's small pulse (docs/living-city-architecture.md §6.6): things that flash and drift, each
// group one draw call or none, all following the hour (engine/timeOfDay.js).
//   - phone flashes along the railing and the street: a few a second among people taking photos, after dark
//   - the enforcement cameras' white strobe at the junctions when a car goes through at night
//   - the police post's lamp turning slowly red and blue
//   - barges on the Huangpu, day and night, low and dark, with their running lights after dusk
//   - plane leaves coming down on Hankou Road (late November)
//   - the crowd answering the city: when the Bund's floodlights come up, half the railing raise their
//     phones for a minute and a half
// One instanced sprite mesh draws every glow (flashes, strobes, the police lamp, the barges' lights).
import * as THREE from 'three';
import { L, streetTrees } from './layout.js';

const MAX = 384;
function glowMaterial() {
  return new THREE.ShaderMaterial({
    fog: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog]),
    vertexShader: /* glsl */ `
      attribute vec4 iPos; attribute vec3 iCol;
      varying vec2 vUv; varying vec3 vCol;
      #include <common>
      #include <fog_pars_vertex>
      void main() {
        vec4 mv = viewMatrix * vec4(iPos.xyz, 1.0);
        float s = max(iPos.w, -mv.z * 0.004);
        mv.xy += position.xy * s; mv.z += s * 0.5;
        vUv = uv; vCol = iCol * min(1.0, iPos.w / s * 0.7 + 0.3);
        gl_Position = projectionMatrix * mv;
        vec4 mvPosition = mv;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vCol;
      #include <common>
      #include <fog_pars_fragment>
      void main() {
        float r = length(vUv - 0.5) * 2.0, a = exp(-r * r * 6.0) + 0.5 * exp(-r * r * 50.0);
        if (a < 0.01) discard;
        gl_FragColor = vec4(vCol, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
        gl_FragColor.rgb *= a;
      }`,
  });
}

// barges: [x of their lane, speed m/s (+ southward), where along the river they start]
const BARGES = [[120, 3.2, -300], [150, -2.6, 100], [175, 2.8, 420], [205, -3.4, -520], [235, 2.2, -60], [262, -2.9, 560], [300, 3.0, 250], [330, -2.4, -380]];
const RIVER_Z = 700;

export function createPulse({ scene, getCrowd, getTraffic, cameras = [], police = [] }) {
  const group = new THREE.Group(); group.name = 'pulse'; scene.add(group);
  const quad = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry(); geo.index = quad.index; geo.attributes.position = quad.attributes.position; geo.attributes.uv = quad.attributes.uv;
  const iPos = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4).setUsage(THREE.DynamicDrawUsage);
  const iCol = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('iPos', iPos); geo.setAttribute('iCol', iCol); geo.instanceCount = 0;
  const glows = new THREE.Mesh(geo, glowMaterial()); glows.frustumCulled = false; glows.renderOrder = 6; glows.name = 'pulse-glows';
  group.add(glows);

  // barges: a low black hull with a wheelhouse aft, one instanced mesh
  const hull = (() => {
    const parts = [new THREE.BoxGeometry(9, 1.6, 62).translate(0, 0.4, 0), new THREE.BoxGeometry(7.6, 2.6, 6).translate(0, 2.2, -26), new THREE.BoxGeometry(8.4, 0.5, 44).translate(0, 1.45, 4)];
    const g = new THREE.BufferGeometry(), pos = [], nor = [];
    for (const p of parts) { const q = p.toNonIndexed(); pos.push(...q.attributes.position.array); nor.push(...q.attributes.normal.array); }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    return g;
  })();
  const barges = new THREE.InstancedMesh(hull, new THREE.MeshStandardMaterial({ color: 0x1b1d1f, roughness: 0.8, metalness: 0.1 }), BARGES.length);
  barges.instanceMatrix.setUsage(THREE.DynamicDrawUsage); barges.frustumCulled = false; barges.name = 'pulse-barges';
  group.add(barges);
  const B = BARGES.map(([x, v, z]) => ({ x, v, z }));

  // leaves: small quads tumbling down round Hankou Road's planes
  const LEAVES = 60;
  const leafGeo = new THREE.PlaneGeometry(0.07, 0.05);
  const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshStandardMaterial({ color: 0xa8742c, roughness: 0.9, side: THREE.DoubleSide }), LEAVES);
  leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage); leaves.frustumCulled = false; leaves.name = 'pulse-leaves';
  group.add(leaves);
  const rnd = Math.random;
  const leaf = () => { const t = streetTrees[Math.floor(rnd() * streetTrees.length)]; return { x: t.x + (rnd() - 0.5) * 5, y: 3 + rnd() * 5, z: t.z + (rnd() - 0.5) * 4, vy: 0.5 + rnd() * 0.5, ph: rnd() * 6, spin: 1 + rnd() * 3, rest: 0 }; };
  const LF = Array.from({ length: LEAVES }, () => { const l = leaf(); l.y = rnd() * 8; return l; });

  const flashes = [];                        // { x, y, z, t, kind }
  let flashAcc = 0, floodsWas = 0, raised = [], t = 0, glancing = [];
  const camState = cameras.map(() => ({ wait: 2 + rnd() * 6 }));
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _e = new THREE.Euler(), _up = new THREE.Vector3(0, 1, 0);
  const stats = { flashes: 0, glows: 0 };
  let n = 0;
  const glow = (x, y, z, size, r, g, b) => { if (n >= MAX) return; iPos.setXYZW(n, x, y, z, size); iCol.setXYZ(n, r, g, b); n++; };

  return {
    group, stats,
    emit(kind, x, y, z) { flashes.push({ kind, x, y, z, t: 0 }); },
    // a ship's horn (engine/audio.js onHorn): everyone within earshot near the river glances that way for
    // a few seconds, the nearer ones first; a far horn's place is out on the water (x, z), the cruise
    // boat's is the river opposite you (null)
    horn(x, z, eye) {
      const crowd = getCrowd && getCrowd(); if (!crowd || !eye) return;
      const hx = x ?? 60, hz = z ?? eye.z;
      for (const a of crowd.agents) {
        if (a.gone || a.inside || a.x < -45 || Math.abs(a.x - eye.x) + Math.abs(a.z - eye.z) > 90) continue;
        if (rnd() > 0.75) continue;                                   // (not everyone looks up)
        const delay = 0.2 + rnd() * 0.9;
        a.glance = { at: [hx + (rnd() - 0.5) * 40, hz + (rnd() - 0.5) * 40], from: t + delay, until: t + delay + 2.5 + rnd() * 2.5, now: t };
        glancing.push(a);
      }
    },
    update(dt, eye, hour) {
      t += dt; n = 0;
      if (glancing.length) glancing = glancing.filter((a) => { if (!a.glance) return false; a.glance.now = t; if (t < a.glance.until) return true; a.glance = null; return false; });
      const night = Math.max(hour.lamps || 0, 1 - (hour.daylight ?? 1));
      const crowd = getCrowd && getCrowd();
      // the crowd answers the floodlights: phones up along the rail for a minute and a half
      if (crowd && floodsWas < 0.5 && hour.floods >= 0.5) {
        raised = [];
        for (const a of crowd.agents) if (a.atRail && a.state === 'act' && a.act === 'look' && rnd() < 0.5) { a.act = 'photo'; a.photoAt = null; raised.push([a, t + 60 + rnd() * 60]); }
      }
      floodsWas = hour.floods;
      if (raised.length) raised = raised.filter(([a, until]) => { if (t < until) return true; if (a.atRail && a.state === 'act' && a.act === 'photo') a.act = 'look'; return false; });
      // phone flashes among those taking photos, after dark, within 160 m
      if (crowd && night > 0.3) {
        flashAcc += dt * (3 + 3 * night) * (raised.length ? 2 : 1);
        let tries = 0;
        while (flashAcc >= 1 && tries++ < 40) {
          const a = crowd.agents[Math.floor(rnd() * crowd.agents.length)];
          if (!a || a.gone || a.inside || a.state !== 'act' || (a.act !== 'photo' && a.act !== 'selfie')) continue;
          const dx = a.x - eye.x, dz = a.z - eye.z; if (dx * dx + dz * dz > 160 * 160) continue;
          const f = a.act === 'selfie' ? -1 : 1;
          flashes.push({ kind: 'flash', x: a.x + Math.sin(a.heading) * 0.35 * f, y: a.y + (a.child ? 1.1 : 1.5), z: a.z + Math.cos(a.heading) * 0.35 * f, t: 0 });
          flashAcc -= 1;
        }
        if (tries >= 40) flashAcc = 0;
      }
      // the cameras: a white strobe as a car goes through, at night
      const sources = getTraffic && getTraffic();            // [{ list: sim vehicles, z: frame offset }]
      if (night > 0.4 && sources) cameras.forEach((c, i) => {
        const st = camState[i]; st.wait -= dt;
        if (st.wait > 0) return;
        const busy = sources.some(({ list, z: oz = 0 }) => list.some((v) => v.active && v.v > 3 && Math.abs(v.z + oz - c.z) < 12 && Math.abs(v.x - c.x) < 14));
        st.wait = busy ? 3 + rnd() * 9 : 1;
        if (busy) { const hx = c.x + Math.cos(c.yaw) * 2.5, hz = c.z - Math.sin(c.yaw) * 2.5; flashes.push({ kind: 'strobe', x: hx, y: (c.y || 0) + 5.45, z: hz, t: 0 }); }
      });
      // draw the flashes
      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i]; f.t += dt;
        const life = f.kind === 'strobe' ? 0.12 : 0.09;
        if (f.t > life) { flashes.splice(i, 1); continue; }
        const k = 1 - f.t / life;
        if (f.kind === 'strobe') { glow(f.x, f.y, f.z, 2.2, 9 * k, 9 * k, 10 * k); glow(f.x, f.y - 5.2, f.z, 7, 0.7 * k, 0.7 * k, 0.8 * k); }
        else glow(f.x, f.y, f.z, 0.45, 7 * k, 7 * k, 7.5 * k);
      }
      stats.flashes = flashes.length;
      // the police post's lamp: red and blue, turning slowly, after dusk
      if (night > 0.2) for (const p of police) {
        const ph = t * 1.6, r = Math.max(0, Math.sin(ph)), b = Math.max(0, -Math.sin(ph));
        const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
        glow(p.x - fz * 0.25, p.y + 2.78, p.z + fx * 0.25, 0.6, 4 * r * night, 0.25 * r * night, 0.2 * r * night);
        glow(p.x + fz * 0.25, p.y + 2.78, p.z - fx * 0.25, 0.6, 0.2 * b * night, 0.4 * b * night, 4.5 * b * night);
      }
      // barges
      B.forEach((b, i) => {
        b.z += b.v * dt; if (b.z > RIVER_Z) b.z = -RIVER_Z; else if (b.z < -RIVER_Z) b.z = RIVER_Z;
        const yaw = b.v > 0 ? 0 : Math.PI, bob = Math.sin(t * 0.5 + i) * 0.08;
        _p.set(b.x, L.waterY + bob, b.z); _q.setFromAxisAngle(_up, yaw);
        barges.setMatrixAt(i, _m.compose(_p, _q, _s));
        if (night > 0.2) {
          const d = b.v > 0 ? 1 : -1, k = night;
          // masthead white forward, stern white, port red / starboard green (port is on the left facing forward)
          glow(b.x, L.waterY + 5.2, b.z + d * 20, 0.8, 3 * k, 3 * k, 2.8 * k);
          glow(b.x, L.waterY + 4.0, b.z - d * 27, 0.6, 2.4 * k, 2.4 * k, 2.2 * k);
          glow(b.x + d * 4.2, L.waterY + 3.5, b.z - d * 24, 0.5, 3 * k, 0.15 * k, 0.1 * k);
          glow(b.x - d * 4.2, L.waterY + 3.5, b.z - d * 24, 0.5, 0.15 * k, 3 * k, 0.6 * k);
          glow(b.x, L.waterY + 3.0, b.z - d * 23, 1.8, 0.5 * k, 0.4 * k, 0.25 * k);          // the wheelhouse windows
        }
      });
      barges.instanceMatrix.needsUpdate = true;
      // leaves (only when you're anywhere near Hankou Road)
      const nearHankou = eye.x < -20 && eye.x > -110 && Math.abs(eye.z) < 60;
      leaves.visible = nearHankou;
      if (nearHankou) {
        LF.forEach((l, i) => {
          if (l.rest > 0) { l.rest -= dt; if (l.rest <= 0) Object.assign(l, leaf()); }
          else { l.y -= l.vy * dt; l.ph += dt * l.spin; l.x += Math.sin(l.ph * 0.7) * 0.4 * dt + 0.15 * dt; l.z += Math.cos(l.ph * 0.5) * 0.3 * dt; if (l.y <= L.curbH + 0.01) { l.y = L.curbH + 0.01; l.rest = 4 + rnd() * 8; } }
          _p.set(l.x, l.y, l.z); _q.setFromEuler(_e.set(l.rest > 0 ? -Math.PI / 2 : l.ph, l.ph * 0.6, l.ph * 0.3));
          leaves.setMatrixAt(i, _m.compose(_p, _q, _s));
        });
        leaves.instanceMatrix.needsUpdate = true;
      }
      geo.instanceCount = n; glows.visible = n > 0;
      iPos.needsUpdate = iCol.needsUpdate = true; iPos.clearUpdateRanges(); iCol.clearUpdateRanges(); iPos.addUpdateRange(0, n * 4); iCol.addUpdateRange(0, n * 3);
      stats.glows = n;
    },
  };
}
