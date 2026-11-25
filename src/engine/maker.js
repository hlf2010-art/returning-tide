// Ji Bai builds things: pure (no three.js, no DOM), node-tested (tests/maker.test.mjs).
//   blueprints   what he can make, the parts each needs and the Maker level it takes
//   parts        bought on JD / Taobao (delivered like any order) or off the makerspace's shelf
//   building     at the bench in the Yangpu makerspace: print the housing, solder the board (a
//                steady hand: the better the joints, the better it works), tune it
//   Maker XP     from building, from the photo challenges, from fixing other people's machines;
//                levels unlock harder blueprints (perks)
//   followers    his own account: grows when Momo posts him, when he shares a good photo
//   achievements small milestones, shown once
// Everything is in the life's flags.maker, so it saves with the rest.
import { pay, stamp } from './life.js';

export const PARTS = {
  esp32: { zh: 'ESP32 开发板', en: 'ESP32 dev board', price: 45 },
  imu: { zh: '六轴陀螺仪 IMU', en: '6-axis IMU', price: 29 },
  gimbalMotor: { zh: '无刷云台电机', en: 'Brushless gimbal motor', price: 68 },
  lipo: { zh: '2S 锂电池', en: '2S LiPo battery', price: 59 },
  pla: { zh: 'PLA 耗材（空间提供）', en: 'PLA filament (the space has it)', price: 0 },
  gps: { zh: '10Hz GPS 模组', en: '10 Hz GPS module', price: 125 },
  canbus: { zh: 'CAN 总线收发模块', en: 'CAN bus transceiver', price: 39 },
  tof: { zh: 'ToF 激光测距模组（多点）', en: 'Multi-zone ToF laser ranging module', price: 899 },
  servo: { zh: '微型舵机', en: 'Micro servo', price: 35 },
  cam: { zh: '星光级摄像头模组', en: 'Starlight camera module', price: 59 },
  npu: { zh: '端侧 AI 模组（NPU）', en: 'Edge-AI module (NPU)', price: 189 },
};
export const BLUEPRINTS = {
  gimbal: { zh: '夜行云台', en: 'Night gimbal', level: 1, xp: 120, parts: { esp32: 1, imu: 1, gimbalMotor: 3, lipo: 1, pla: 1 },
    use: { zh: '三轴稳定：夜里也能拍清楚。解锁拍照模式（G）和外滩夜景挑战。', en: 'Three-axis stabilised: sharp photos at night. Unlocks photo mode (G) and the Bund-after-dark challenges.' } },
  lidar: { zh: '口袋激光雷达', en: 'Pocket LiDAR', level: 2, xp: 200, parts: { tof: 1, esp32: 1, lipo: 1, servo: 1, pla: 1 },
    use: { zh: '扫描建筑细节，生成点云。予安修复外滩老楼用得上。', en: 'Scans architectural detail into a point cloud. Yu\'an could use it for her Bund restorations.' } },
  // hardware and software at once: a camera and an NPU on one small board, and a model he trains on
  // Yu'an's own photographs of the Bund's old façades (Software & AI 4)
  crackcam: { zh: '裂缝识别相机', en: 'Crack-spotting camera', level: 2, ai: 4, xp: 220, parts: { esp32: 1, cam: 1, npu: 1, lipo: 1, pla: 1 },
    use: { zh: '对着外滩老楼的立面一扫，模型在板子上就把裂缝和空鼓标出来。予安修缮用得上：她拍的照片就是训练数据。', en: "Pan it across an old Bund façade and the model on the board marks the cracks and the hollow render. Yu\'an's restorations could use it: her own photographs are the training data." } },
  telemetry: { zh: '赛道数据记录仪', en: 'Race telemetry logger', level: 2, xp: 160, parts: { esp32: 1, gps: 1, imu: 1, canbus: 1, pla: 1 },
    use: { zh: '记录圈速、G 值、刹车点。知夏的天马赛车用。', en: 'Logs lap times, g-forces, braking points. For Zhixia\'s car at Tianma.' } },
};
export const LEVELS = [0, 100, 300, 600, 1000, 1600];
export const PERKS = {
  1: { zh: '基础制作：打印、焊接、调试', en: 'Basics: print, solder, tune' },
  2: { zh: '进阶电子：激光雷达、总线数据', en: 'Advanced electronics: LiDAR, bus data' },
  3: { zh: '更稳的手：焊接容错更大', en: 'A steadier hand: more room on every joint' },
  4: { zh: '飞起来：无人机图纸（即将）', en: 'Airborne: drone blueprints (coming)' },
};
export const ACHIEVEMENTS = {
  firstBuild: { zh: '第一件作品', en: 'First build' },
  cleanJoints: { zh: '一手好焊', en: 'Clean joints' },
  nightOwl: { zh: '外滩夜猫子', en: 'Night owl of the Bund' },
  allBund: { zh: '外滩全收集', en: 'The whole Bund' },
  fixer: { zh: '修好别人的机器', en: 'Fixed someone else\'s machine' },
  regular: { zh: '爵士吧常客', en: 'Jazz Bar regular' },
  driver: { zh: '提车上路', en: 'On the road' },
  famous: { zh: '一万粉丝', en: '10,000 followers' },
  scanner: { zh: '把外滩扫进电脑', en: 'The Bund, in points' },
};

export function maker(L) {
  return (L.flags.maker ||= { xp: 0, parts: {}, gadgets: {}, builds: [], photos: [], shot: {}, achievements: [], followers: 3412, log: [] });
}
export const level = (M) => LEVELS.filter((x) => M.xp >= x).length;
// Software & AI's level (engine/skills.js keeps it; read here without importing it: he lands at 650 xp)
const aiLevel = (L) => LEVELS.filter((x) => (((L.flags.skills || {}).ai) ?? 650) >= x).length;
export const nextLevelAt = (M) => LEVELS[level(M)] ?? null;

// returns what changed: { xp, levelUp, achievement? }
export function gainXp(L, n, why = '') {
  const M = maker(L), before = level(M);
  M.xp += n; M.log.push({ at: stamp(L), xp: n, why });
  const after = level(M);
  return { xp: n, levelUp: after > before ? after : 0 };
}
export function achieve(L, id) {
  const M = maker(L);
  if (!ACHIEVEMENTS[id] || M.achievements.includes(id)) return null;
  M.achievements.push(id); return ACHIEVEMENTS[id];
}
export function gainFollowers(L, n) {
  const M = maker(L); const before = M.followers; M.followers += n;
  return before < 10000 && M.followers >= 10000 ? achieve(L, 'famous') : null;
}

// parts: bought at the makerspace (paid now, in your hands) or delivered from JD / Taobao
export function addParts(L, parts) { const M = maker(L); for (const [k, n] of Object.entries(parts)) M.parts[k] = (M.parts[k] || 0) + n; }
export function buyPart(L, part, n = 1, method = 'wechat') {
  const P = PARTS[part]; if (!P) return { ok: false, reason: 'part' };
  if (P.price > 0) { const r = pay(L, { method, amount: P.price * n, to: '杨浦创客空间', memo: `${P.zh} ×${n}`, kind: 'purchase' }); if (!r.ok) return r; r.entry.memoEn = `${P.en} ×${n}`; }
  addParts(L, { [part]: n }); return { ok: true };
}
export function missing(L, id) {
  const M = maker(L), B = BLUEPRINTS[id], out = {};
  for (const [k, n] of Object.entries(B.parts)) { const have = k === 'pla' ? Infinity : (M.parts[k] || 0); if (have < n) out[k] = n - have; }
  return out;
}
export function canBuild(L, id) {
  const M = maker(L), B = BLUEPRINTS[id]; if (!B) return { ok: false, reason: 'blueprint' };
  if (M.gadgets[id]) return { ok: false, reason: 'built' };
  if (level(M) < B.level) return { ok: false, reason: 'level', need: B.level };
  if (B.ai && aiLevel(L) < B.ai) return { ok: false, reason: 'ai', need: B.ai };
  const miss = missing(L, id);
  return Object.keys(miss).length ? { ok: false, reason: 'parts', missing: miss } : { ok: true };
}
// the build itself: parts go in, three steps come back with how well they went (0..1 each)
export function startBuild(L, id) {
  const c = canBuild(L, id); if (!c.ok) return c;
  const M = maker(L);
  for (const [k, n] of Object.entries(BLUEPRINTS[id].parts)) if (k !== 'pla') M.parts[k] -= n;
  return { ok: true, build: { id, steps: [], startedAt: stamp(L) } };
}
// solder: a joint is good when you press inside the window; the window is wider at Maker 3+
export const solderWindow = (lvl) => (lvl >= 3 ? 0.22 : 0.15);
export function solderJoint(phase, lvl) { const d = Math.abs(phase - 0.5); const w = solderWindow(lvl); return d <= w ? 1 - (d / w) * 0.4 : Math.max(0, 0.4 - (d - w) * 2); }
export function finishBuild(L, build, quality) {
  const M = maker(L), B = BLUEPRINTS[build.id], q = Math.max(0, Math.min(1, quality));
  M.gadgets[build.id] = { at: stamp(L), quality: +q.toFixed(2), version: 1 };
  M.builds.push({ id: build.id, at: stamp(L), quality: +q.toFixed(2) });
  const got = gainXp(L, Math.round(B.xp * (0.6 + 0.4 * q)), `build:${build.id}`);
  const ach = [achieve(L, 'firstBuild'), q >= 0.85 ? achieve(L, 'cleanJoints') : null].filter(Boolean);
  return { ...got, quality: q, achievements: ach };
}
export const owns = (L, id) => !!maker(L).gadgets[id];

// ---- photographs: the Bund after dark ----
// subject: where it is, the range it reads well from, how big in the frame it should be (fraction of
// the frame's height it should fill, at least)
export const PHOTO_TARGETS = [
  { id: 'pearl', zh: '东方明珠', en: 'The Oriental Pearl Tower', x: 640, y: 200, z: -42, h: 468, near: 300, far: 1400, min: 0.25 },
  { id: 'customs', zh: '海关大楼钟楼', en: 'The Customs House clock', x: -45, y: 50, z: 26, h: 30, near: 15, far: 160, min: 0.12 },
  { id: 'peace', zh: '和平饭店绿顶', en: 'The Peace Hotel\'s green roof', x: -43, y: 66, z: -243, h: 26, near: 25, far: 260, min: 0.08 },
  { id: 'shtower', zh: '上海中心', en: 'Shanghai Tower', x: 860, y: 316, z: 395, h: 632, near: 400, far: 1800, min: 0.3 },
  { id: 'linsu', zh: '江边的老林和苏女士', en: 'Old Lin and Ms Su by the river', x: 23.7, y: 4.4, z: -15, h: 1.7, near: 2, far: 18, min: 0.12 },
  { id: 'huracan', zh: '你的 Strale', en: 'Your Strale', x: 0, y: 0.6, z: 0, h: 1.2, near: 3, far: 25, min: 0.1, moving: true },
  { id: 'trio', zh: '爵士吧的三重奏', en: 'The Jazz Bar trio', x: -38, y: 1.3, z: -221.2, h: 1.6, near: 2, far: 12, min: 0.15 },
  { id: 'ferry', zh: '夜里的游船', en: 'A cruise boat at night', x: 0, y: 3, z: 0, h: 8, near: 40, far: 600, min: 0.03, moving: true },
];
// how a frame scores a subject: in frame, centred enough, big enough, sharp (a steady gimbal) -> 0..3
export function photoStars({ inFrame, offCentre, size, min, steady = 1, occluded = false }) {
  if (!inFrame || occluded || size < min * 0.5) return 0;
  let s = 1;
  if (size >= min) s++;
  if (offCentre < 0.35 && steady > 0.8) s++;
  return s;
}
export function recordPhoto(L, { target, stars, thumb = null }) {
  const M = maker(L), prev = M.shot[target] || 0, out = { xp: 0, achievements: [], followers: 0 };
  M.photos.push({ at: stamp(L), target, stars, thumb }); while (M.photos.length > 12) M.photos.shift();
  if (target && stars > prev) {
    M.shot[target] = stars;
    const g = gainXp(L, (stars - prev) * 25, `photo:${target}`); out.xp = g.xp; out.levelUp = g.levelUp;
    if (Object.keys(M.shot).length >= 3) { const a = achieve(L, 'nightOwl'); if (a) out.achievements.push(a); }
    if (PHOTO_TARGETS.every((t) => M.shot[t.id])) { const a = achieve(L, 'allBund'); if (a) out.achievements.push(a); }
  }
  return out;
}
// sharing a photo: likes from friends, followers by how good it is
export function sharePhoto(L, photo) {
  if (photo.shared) return null;
  photo.shared = true;
  const n = [5, 30, 120, 480][photo.stars || 0];
  const a = gainFollowers(L, n);
  return { followers: n, achievement: a };
}
