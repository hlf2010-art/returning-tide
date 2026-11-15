// Going into East Nanjing Road station. You walk down the stairs of Exit 7 or Exit 2 yourself (so do
// the crowds); at the landing, the way in to the concourse:
//   E   take Line 2 one stop under the river to Lujiazui (the IFC; ¥3 on the Metro QR code)
//   E   (at the exit sign on the side wall) through the concourse and up the other exit
// The trains and the station's insides aren't built yet: both go by the fade, as a lift or a DiDi does.
import { METRO, METRO_DEPTH } from './layout.js';
import { getLang } from '../ui/i18n.js';
import { pay as lifePay } from '../engine/life.js';

const T = (zh, en) => (getLang() === 'zh' ? zh : en);

export function createMetro({ hud, audio, player, travel, getLife, save, arriveAt }) {
  const S = { rides: 0, throughs: 0, here: null };
  const landing = (m) => ({ x: m.bottom + Math.sign(m.bottom - m.top) * 0.9, z: (m.z0 + m.z1) / 2 });
  const targets = METRO.map((m) => {
    const l = landing(m);
    return [
      { id: `metro:${m.id}:in`, x: l.x + Math.sign(m.bottom - m.top) * 0.7, y: -METRO_DEPTH + 1.6, z: l.z, reach: 3.2, cone: 0.5 },
      // the exit sign on the landing's side wall (world/nanjingRoad.js puts it here)
      { id: `metro:${m.id}:thru`, x: (Math.min(m.bottom, m.top === m.x1 ? m.x0 : m.x1) + Math.max(m.bottom, m.top === m.x1 ? m.x0 : m.x1)) / 2 + (m.top === m.x1 ? 0.6 : -0.6), y: -METRO_DEPTH + 2.1, z: m.z0 + 0.1, reach: 3.0, cone: 0.55 },
    ];
  });
  const at = (id) => METRO.find((m) => id.startsWith(`metro:${m.id}`));
  function pay() {
    const L = getLife && getLife();
    if (L && L.wallet) { lifePay(L, { method: 'alipay', amount: 3, to: '上海地铁 Shanghai Metro', memo: '2号线 南京东路→陆家嘴', kind: 'transport' }); save && save(); }
    audio && audio.cue && audio.cue('chime', 0, 0.4);
  }
  return {
    stats: S,
    get here() { return S.here; },
    candidates() {
      const b = player.body; S.here = null;
      if (b.y > -METRO_DEPTH + 1.5) return [];
      for (let i = 0; i < METRO.length; i++) { const m = METRO[i]; if (b.x > m.x0 - 0.5 && b.x < m.x1 + 0.5 && b.z > m.z0 - 0.5 && b.z < m.z1 + 0.5) { S.here = m.id; return targets[i]; } }
      return [];
    },
    owns(id) { return id.startsWith('metro:'); },
    prompt(id) {
      if (id.endsWith(':in')) return { target: T('南京东路站 · 2号线', 'East Nanjing Rd · Line 2'), action: T('坐一站到陆家嘴（¥3）', 'One stop to Lujiazui (¥3)') };
      const m = at(id), other = METRO.find((o) => o !== m);
      return { target: T('站厅', 'Concourse'), action: T(`从${other.exit}号口出站`, `Out by Exit ${other.exit}`) };
    },
    interact(id) {
      const m = at(id);
      if (id.endsWith(':in')) {
        S.rides++; pay();
        hud.toast(T('刷码进站 · Metro大都会 · ¥3', 'Through the gates · Metro QR · ¥3'), 2.6);
        travel(() => { arriveAt('lujiazui', { method: 'metro' }); hud.toast(T('2号线 · 陆家嘴站 · 出站往国金中心', 'Line 2 · Lujiazui · out toward the IFC'), 3.4); }, { hold: 1600, line: T('2号线 · 南京东路 → 陆家嘴 · 1站 · 约3分钟', 'Line 2 · East Nanjing Rd → Lujiazui · 1 stop · ~3 min') });
        return true;
      }
      const other = METRO.find((o) => o !== m), l = landing(other);
      S.throughs++;
      travel(() => {
        // out at the other exit's landing, facing up its stairs
        const yaw = other.top > other.bottom ? -Math.PI / 2 : Math.PI / 2;
        player.teleport(l.x, l.z, yaw, 0, -METRO_DEPTH);
        hud.toast(T(`${other.exit}号口 · 南京东路 / 河南中路`, `Exit ${other.exit} · Nanjing Rd E / Henan Rd M`), 3);
      });
      return true;
    },
  };
}
