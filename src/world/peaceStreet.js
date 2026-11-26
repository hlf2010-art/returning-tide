// Outside the Peace Hotel's door on Nanjing Road East: things to read, and people to talk to.
//   - the plaques on the façade beside the door: 全国重点文物保护单位 (the Bund's buildings, listed by the State Council
//     in November 1996) and 上海市优秀历史建筑 (Sassoon House, in Shanghai's first list, 1989). E reads one.
//   - a volunteer at the Bund end of the street, in a red cap and a 志愿者 armband (9:00-18:00): directions
//   - a street sweeper in sanitation orange with a bamboo broom, up and down the pavement (5:30-10:00, 17:30-21:00)
// (Lines are recorded: tools/voice/extract.mjs finds the [who, zh, en] arrays.)
import * as THREE from 'three';
import { createPerson } from './people.js';
import { groundHeight, L as LAYOUT, addDynamicCollider } from './layout.js';
import { dressVolunteer, dressSweeper } from './outfits.js';
import { getLang } from '../ui/i18n.js';

const T = (zh, en) => (getLang() === 'zh' ? zh : en);
const Y = LAYOUT.curbH;
export const STREET_NAMES = { volunteer: ['志愿者', 'Volunteer'], sweeper: ['环卫工人', 'Street sweeper'] };

// the plaques: one above the other on the stone pier just west of the door (behind the canopy's post), facing the street
const PLAQUES = [
  { id: 'national', x: -51.45, y: 1.86, w: 0.62, h: 0.42, bg: '#e9e4d8', fg: '#1b1b1b', rule: '#8a1c1c',
    lines: [['全国重点文物保护单位', 44, '#8a1c1c'], ['外 滩 建 筑 群', 64], ['和平饭店', 34], ['中华人民共和国国务院', 24], ['一九九六年十一月二十日公布', 22], ['上海市人民政府立', 22]],
    card: () => ({ place: T('全国重点文物保护单位 · 外滩建筑群', 'National Heritage Site · The Bund\'s historic buildings'),
      line: T('1996 年 11 月，国务院公布第四批全国重点文物保护单位，外滩沿江的这一排老建筑作为“外滩建筑群”整体列入，和平饭店是其中之一。',
        'In November 1996 the State Council named its fourth list of national heritage sites; the old buildings along the Bund were listed together as "the Bund\'s historic buildings", the Peace Hotel among them.') }) },
  { id: 'shanghai', x: -51.45, y: 1.3, w: 0.56, h: 0.4, bg: '#3a2a1c', fg: '#e3c88a', rule: '#c9a24a',
    lines: [['上海市优秀历史建筑', 40], ['和平饭店北楼', 52], ['（原沙逊大厦）', 30], ['建于 1929 年 · 公和洋行设计', 24], ['装饰艺术派风格', 24], ['上海市人民政府 一九八九年公布', 20]],
    card: () => ({ place: T('上海市优秀历史建筑 · 沙逊大厦', 'Shanghai Heritage Architecture · Sassoon House'),
      line: T('原为沙逊大厦，1929 年落成，公和洋行设计。钢框架结构，立面竖线挺拔，是装饰艺术派风格；转角塔楼顶上那座绿色铜皮金字塔顶约 19 米高。1989 年列入上海市第一批优秀历史建筑。',
        'Built as Sassoon House, finished in 1929 to designs by Palmer & Turner: a steel frame, a façade of tall vertical lines in the Art Deco manner, and on the corner tower the green copper pyramid, about 19 metres high. In 1989 it was in Shanghai\'s first list of heritage architecture.') }) },
];
function plaqueTex(p) {
  const c = document.createElement('canvas'); c.width = Math.round(p.w * 1000); c.height = Math.round(p.h * 1000); const x = c.getContext('2d'), W = c.width, H = c.height;
  x.fillStyle = p.bg; x.fillRect(0, 0, W, H); x.strokeStyle = p.rule; x.lineWidth = 8; x.strokeRect(14, 14, W - 28, H - 28); x.lineWidth = 2; x.strokeRect(26, 26, W - 52, H - 52);
  const total = p.lines.reduce((s, [, f]) => s + f * 1.45, 0); let y = (H - total) / 2;
  x.textAlign = 'center'; x.textBaseline = 'top';
  for (const [t, f, col] of p.lines) { x.fillStyle = col || p.fg; x.font = `${f > 40 ? 900 : 700} ${f}px "Songti SC","Noto Serif SC","SimSun",serif`; x.fillText(t, W / 2, y + f * 0.2); y += f * 1.45; }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// what they say
const VOL_HI = ['volunteer', '您好，需要帮忙吗？', 'Hello, can I help you?'];
const VOL_WC = ['volunteer', '外滩防汛墙上面的观景平台有公共厕所，从这里上去，往南走一点就到。', 'There are public toilets up on the promenade along the flood wall. Go up from here and walk a little way south.'];
const VOL_LJZ = ['volunteer', '坐地铁二号线，南京东路站上车，坐一站就到陆家嘴。想看江景的话，去金陵东路坐轮渡。', 'Line 2 from East Nanjing Road, one stop to Lujiazui. For the view of the river, take the ferry from Jinling Road East.'];
const VOL_HOTEL = ['volunteer', '大堂可以进去看看，很漂亮的。楼上是客房，就不好随便上去了。', 'You can go in and look round the lobby, it\'s beautiful. Upstairs is guest rooms, so not without a room.'];
const VOL_BIKE = ['volunteer', '步行街和外滩不能骑车。九江路、汉口路路口都有停车点，在画线的地方还车。', 'No cycling on the shopping street or the Bund. There are bays at the Jiujiang Road and Hankou Road corners; lock it inside the lines.'];
const VOL_BYE = ['volunteer', '好的，祝您玩得开心！', 'All right, enjoy your day!'];
const SW_MORNING = ['sweeper', '早啊。这条路一天要扫好几遍，人多嘛。', 'Morning. This road gets swept several times a day. It\'s the crowds.'];
const SW_EVENING = ['sweeper', '灯一亮，人又多起来了。你让一让，当心扫帚。', 'Once the lights come on, the crowds are back. Step aside a bit, mind the broom.'];
const SW_RAIN = ['sweeper', '下雨天人少，就是叶子粘在地上，不好扫。', 'Fewer people when it rains, but the wet leaves stick to the ground.'];
const SW_SORT = ['sweeper', '垃圾要分类啊，湿垃圾、干垃圾分开扔。', 'Sort your rubbish, mind: wet and dry in separate bins.'];
export const STREET_LINES = [VOL_HI, VOL_WC, VOL_LJZ, VOL_HOTEL, VOL_BIKE, VOL_BYE, SW_MORNING, SW_EVENING, SW_RAIN, SW_SORT];

export function createPeaceStreet({ scene, people, player, sceneTalk, onCard, getMinute, getRain = () => 0 }) {
  const group = new THREE.Group(); group.name = 'peace-street'; scene.add(group);
  // the plaques: a slab with a bevelled edge, the text, four bolt heads
  const bolt = new THREE.MeshStandardMaterial({ color: 0x8c8c86, metalness: 0.8, roughness: 0.35 });
  for (const p of PLAQUES) {
    const z = -212 + 0.02;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(p.w + 0.02, p.h + 0.02, 0.025), new THREE.MeshStandardMaterial({ color: p.bg, roughness: p.id === 'national' ? 0.5 : 0.35, metalness: p.id === 'national' ? 0 : 0.5 }));
    slab.position.set(p.x, Y + p.y, z + 0.0125); group.add(slab);
    if (typeof document !== 'undefined') { const face = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h), new THREE.MeshStandardMaterial({ map: plaqueTex(p), roughness: p.id === 'national' ? 0.55 : 0.32, metalness: p.id === 'national' ? 0 : 0.45 })); face.position.set(p.x, Y + p.y, z + 0.026); group.add(face); }
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), bolt); b.rotation.x = Math.PI / 2; b.position.set(p.x + dx * (p.w / 2 - 0.025), Y + p.y + dy * (p.h / 2 - 0.025), z + 0.027); group.add(b); }
  }

  // ---- the two people ----
  function person(role, x, z, h, dress) {
    if (!people || !people.manifest.cast[role]) return null;
    const p = createPerson(people, role); p.root.position.set(x, groundHeight(x, z, 2), z); p.root.rotation.y = h; p.play('idle', 0); p.update(0);
    p.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    group.add(p.root);
    const extra = dress(p);
    return { p, x, z, h, y: p.root.position.y, extra, box: addDynamicCollider('npc'), anim: 'idle', v: 0 };
  }
  const vol = person('c3', -36.6, -198.6, -Math.PI / 2 - 0.5, dressVolunteer);   // at the Bund end of the street, looking along it
  const sw = person('p3', -60, -191.6, Math.PI / 2, dressSweeper);
  const SWEEP = { x0: -96, x1: -40, z: -191.6 };
  const S = { swDir: 1, swPause: 0, t: 0 };
  const onDuty = (who) => { const m = getMinute(); return who === vol ? m >= 9 * 60 && m < 18 * 60 : (m >= 5 * 60 + 30 && m < 10 * 60) || (m >= 17 * 60 + 30 && m < 21 * 60); };
  const headOf = (a) => { const v = new THREE.Vector3(); const hb = a.p.bones && a.p.bones.head; if (hb) hb.getWorldPosition(v); else v.set(a.x, a.y + 1.6, a.z); return v; };
  const turnTo = (h, want, k) => { let d = want - h; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return h + d * Math.min(1, k); };
  let talking = null;
  function place(a, on, pp, dt) {
    const near = on && Math.hypot(pp.x - a.x, pp.z - a.z) < 70 && pp.y < 6;
    a.p.root.visible = near;
    const b = a.box;
    if (!near) { b.minX = b.maxX = 1e6; return false; }
    b.minX = a.x - 0.22; b.maxX = a.x + 0.22; b.minZ = a.z - 0.22; b.maxZ = a.z + 0.22; b.y0 = a.y - 0.5; b.y1 = a.y + 1.9;
    const d = Math.hypot(pp.x - a.x, pp.z - a.z), look = d < 4 || talking === a ? [pp.x, pp.z] : null;
    if (talking === a) a.h = turnTo(a.h, Math.atan2(pp.x - a.x, pp.z - a.z), dt * 4);
    a.p.play(a.anim, 0.3); a.p.setGait(a.v);
    a.y = groundHeight(a.x, a.z, a.y + 0.5); a.p.root.position.set(a.x, a.y, a.z); a.p.root.rotation.y = a.h;
    a.p.update(dt, look);
    return true;
  }
  return {
    group,
    update(dt, pp) {
      S.t += dt;
      if (talking && !sceneTalk.active) talking = null;
      if (vol) place(vol, onDuty(vol), pp, dt);
      if (sw && place(sw, onDuty(sw), pp, dt) && talking !== sw) {
        // slowly along the pavement, a few strokes here, a few steps on; turn at the ends
        if (S.swPause > 0) { S.swPause -= dt; sw.anim = 'idle'; sw.v = 0; if (sw.extra) sw.extra.rotation.y = Math.sin(S.t * 2.6) * 0.45; }
        else {
          const nx = sw.x + S.swDir * 0.55 * dt, blockedByYou = Math.hypot(pp.x - nx, pp.z - sw.z) < 1.1;
          if (!blockedByYou) { sw.x = nx; sw.anim = 'walk'; sw.v = 0.55; } else { sw.anim = 'idle'; sw.v = 0; }
          sw.h = turnTo(sw.h, S.swDir > 0 ? Math.PI / 2 : -Math.PI / 2, dt * 3);
          if (sw.extra) sw.extra.rotation.y *= 0.9;
          if (Math.random() < dt / 5) S.swPause = 3 + Math.random() * 5;
          if (sw.x > SWEEP.x1) S.swDir = -1; if (sw.x < SWEEP.x0) S.swDir = 1;
        }
      }
    },
    candidates() {
      const out = [];
      for (const p of PLAQUES) out.push({ id: `pstreet:plaque:${p.id}`, x: p.x, y: Y + p.y, z: -211.95, reach: 2.4, cone: 0.5 });
      if (sceneTalk.active) return out;
      for (const [k, a] of [['vol', vol], ['sw', sw]]) if (a && a.p.root.visible) { const h = headOf(a); out.push({ id: `pstreet:${k}`, x: h.x, y: h.y - 0.25, z: h.z, reach: 3, cone: 0.6 }); }
      return out;
    },
    owns: (id) => id.startsWith('pstreet:'),
    prompt(id) {
      if (id.startsWith('pstreet:plaque:')) { const p = PLAQUES.find((q) => id.endsWith(q.id)); return { target: p.id === 'national' ? T('文物保护标志', 'A heritage plaque') : T('优秀历史建筑铭牌', 'A heritage plaque'), action: T('看看', 'Read it') }; }
      if (id === 'pstreet:vol') return { target: T('志愿者', 'A volunteer'), action: T('问问', 'Ask her') };
      if (id === 'pstreet:sw') return { target: T('环卫工人', 'A street sweeper'), action: T('打个招呼', 'Say hello') };
      return null;
    },
    interact(id) {
      if (id.startsWith('pstreet:plaque:')) { const p = PLAQUES.find((q) => id.endsWith(q.id)); onCard && onCard({ ...p.card(), fare: '', back: '', kicker: T('铭牌', 'A plaque') }); return true; }
      const at = (a) => () => { const h = headOf(a); return [h.x, h.y, h.z]; };
      if (id === 'pstreet:vol' && vol) {
        talking = vol;
        sceneTalk.play([VOL_HI, { ask: [
          { zh: '附近哪里有洗手间？', en: 'Is there a toilet nearby?', then: [VOL_WC] },
          { zh: '去陆家嘴怎么走方便？', en: 'What\'s the easiest way to Lujiazui?', then: [VOL_LJZ] },
          { zh: '和平饭店可以进去参观吗？', en: 'Can I go into the Peace Hotel and look round?', then: [VOL_HOTEL] },
          { zh: '这附近能骑共享单车吗？', en: 'Can I ride a shared bike round here?', then: [VOL_BIKE] },
        ] }, VOL_BYE], { at: at(vol) });
        return true;
      }
      if (id === 'pstreet:sw' && sw) {
        talking = sw;
        const m = getMinute(), line = getRain() > 0.2 ? SW_RAIN : m < 12 * 60 ? (Math.random() < 0.6 ? SW_MORNING : SW_SORT) : (Math.random() < 0.6 ? SW_EVENING : SW_SORT);
        sceneTalk.play([line], { at: at(sw) });
        return true;
      }
      return false;
    },
  };
}
