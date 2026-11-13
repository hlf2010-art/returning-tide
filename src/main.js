import '@fontsource/noto-serif-sc/500.css';
import '@fontsource/noto-serif-sc/900.css';
import '@fontsource/noto-sans-sc/500.css';
import '@fontsource/noto-sans-sc/700.css';
import '@fontsource/ma-shan-zheng/400.css';
import * as THREE from 'three';
import { createRenderer } from './engine/renderer.js';
import { createPlayer } from './engine/player.js';
import { createAudio } from './engine/audio.js';
import { L, npcs as npcLayout } from './world/layout.js';
import { FONT, loadFonts } from './world/canvas.js';
import { T, ALL_TEXT } from './world/text.js';
import { createMaterials } from './world/materials.js';
import { createSky, FOG_COLOR } from './world/sky.js';
import { createSkyline } from './world/skyline.js';
import { createRiver } from './world/river.js';
import { createBund } from './world/bund.js';
import { createPromenade } from './world/promenade.js';
import { createStreet } from './world/street.js';
import { createLighting, captureEnvironment } from './world/lighting.js';
import { createClue } from './world/clue.js';
import { createNpcs } from './world/npcs.js';
import { createDialogueAudio } from './engine/dialogueAudio.js';
import { createConversation } from './engine/conversation.js';
import { createHud } from './ui/hud.js';
import { createPouch, HELD_LAYER } from './world/pouch.js';
import { createMissionOne } from './missionOne.js';
import { crossing, addDynamicCollider } from './world/layout.js';
import { createTraffic } from './engine/traffic.js';
import { createVehicles } from './world/vehicles.js';
import { createSignals } from './world/signals.js';
import { createPedestrians } from './world/pedestrians.js';

const params = new URLSearchParams(location.search);
const canvas = document.getElementById('view');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(FOG_COLOR, 0.00085);
const camera = new THREE.PerspectiveCamera(68, 1, 0.1, 4500);
const R = createRenderer(canvas, scene, camera, { fixedLevel: params.has('q') ? Number(params.get('q')) : null });
const player = createPlayer(camera, canvas);
const audio = createAudio();
const hud = createHud();

let mode = 'boot';              // boot -> entry -> play <-> pause / inspect / dialogue / pouch
let noLock = params.has('nolock');
let subtitlesOn = params.get('subs') !== '0';
let world = null, clueRead = false, t = 0, last = performance.now();
let dialogueAudio = null, conversation = null, mission1 = null, traffic = null;
// Temporary developer controls for Mission One (F8 start, F9 reset): dev server or ?dev only.
const devControls = import.meta.env.DEV || params.has('dev');
camera.layers.enable(HELD_LAYER);
const _pairPos = new THREE.Vector3(npcLayout.pairFocus.x, npcLayout.pairFocus.y, npcLayout.pairFocus.z);

async function boot() {
  await loadFonts([
    [`900 40px ${FONT.serif}`, ALL_TEXT], [`500 40px ${FONT.serif}`, ALL_TEXT],
    [`700 40px ${FONT.sans}`, ALL_TEXT], [`40px ${FONT.hand}`, ALL_TEXT],
  ]);
  const M = createMaterials();
  const sky = createSky(), skyline = createSkyline(), river = createRiver();
  const bund = createBund(M), promenade = createPromenade(M), street = createStreet(M), clue = createClue();
  const npcs = createNpcs(M);
  const pouch = createPouch();
  // the signal-controlled crossing: one controller, through traffic, background pedestrians
  traffic = createTraffic({ geom: crossing, vehicles: crossing.vehicles, peds: crossing.peds });
  const vehicles = createVehicles(crossing.vehicles), signals = createSignals(), pedestrians = createPedestrians(traffic.peds);
  const vehicleBoxes = traffic.vehicles.map(() => addDynamicCollider('vehicle'));
  scene.add(sky.mesh, skyline.group, river.group, bund.group, promenade.group, street.group, clue.mesh, npcs.group, ...pouch.meshes,
    vehicles.group, signals.group, pedestrians.group);
  const lighting = createLighting(scene, street.lanterns);
  scene.updateMatrixWorld(true);
  captureEnvironment(R.renderer, scene);
  world = { sky, skyline, river, bund, street, clue, lighting, npcs, pouch, vehicles, signals, pedestrians, vehicleBoxes };
  dialogueAudio = createDialogueAudio({
    audio,
    camera,
    getSpeakerPosition: (id) => npcs.getSpeakerPosition(id),
    refDistance: npcLayout.audibility.refDistance,
    maxDistance: npcLayout.audibility.maxDistance,
  });
  conversation = createConversation({
    exchanges: T.dialogue.exchanges,
    greetings: T.dialogue.greetings,
    audio: dialogueAudio,
    getPlayerDistance: () => _pairPos.distanceTo(camera.position),
    maxAudibleDist: npcLayout.audibility.maxDistance,
  });
  mission1 = createMissionOne({
    hud, audio, pouch, npcs,
    isClueRead: () => clueRead,
    onViewClosed: () => { if (mode === 'pouch') { mode = 'play'; player.enabled = true; } },
  });
  document.getElementById('inspect-paper').appendChild(clue.canvas);
  player.update(0);
  R.renderer.compile(scene, camera);
  mode = 'entry';
  hud.ready();
}

// ---- mode changes ----
function lock() {
  if (noLock) return;
  try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch { /* handled by pointerlockerror */ }
}
function play() {
  mode = 'play'; player.enabled = true; audio.resume();
  if (conversation) conversation.setPaused(false);
  hud.show('pause', false);
}
function begin() {
  if (mode !== 'entry') return;
  audio.start(); lock(); play(); hud.begin();
  if (devControls) hud.show('dev', true);
  if (conversation && conversation.state === 'idle') conversation.start();
}
function pause() {
  if (mode === 'inspect') closeInspect(false);
  if (mode === 'dialogue') closeDialogue(false);
  if (mode === 'pouch') closePouch();
  if (mode !== 'play') return;
  mode = 'pause'; player.enabled = false;
  if (conversation) conversation.setPaused(true);
  hud.show('pause', true); hud.prompt(false); hud.subtitle(false);
}
function openInspect() {
  mode = 'inspect'; player.enabled = false; hud.prompt(false); hud.subtitle(false); hud.show('inspect', true);
}
function closeInspect(resume = true) {
  hud.show('inspect', false);
  if (resume) { mode = 'play'; player.enabled = true; } else mode = 'play';
  if (!clueRead) {
    clueRead = true;
    hud.thought('末班轮渡。金陵东路渡口，沿江往南。', 'The last ferry. Jinling East Road pier, south along the water.');
  }
}
function openDialogue() {
  if (mode !== 'play') return;
  mode = 'dialogue'; player.enabled = false; hud.prompt(false);
  // Mission One decides what Old Lin says (offer / reminder / handoff); null = ordinary greeting
  const line = mission1 ? mission1.greetLine() : null;
  if (conversation) conversation.enterInteraction(line);
}
function closeDialogue(resume = true) {
  if (conversation) conversation.exitInteraction();
  hud.subtitle(false);
  if (resume) { mode = 'play'; player.enabled = true; } else mode = 'play';
  if (mission1) mission1.dialogueClosed();
}
function acceptOffer() {
  const line = mission1 && mission1.accept();
  if (line && conversation) conversation.enterInteraction(line);
}
function openPouch(kind) {
  if (mode !== 'play' || !mission1) return;
  const opened = kind === 'pickup' ? mission1.openPickup() : mission1.openCarried();
  if (opened) { mode = 'pouch'; player.enabled = false; hud.prompt(false); hud.subtitle(false); }
}
function closePouch() { if (mission1) mission1.closeView(); if (mode === 'pouch') { mode = 'play'; player.enabled = true; } }
function devMission(start) {
  if (!mission1 || mode === 'boot' || mode === 'entry') return;
  if (mode === 'dialogue') closeDialogue();
  if (mode === 'inspect') closeInspect();
  if (mode === 'pouch') closePouch();
  if (start) mission1.devStart(); else mission1.mission.reset();
  hud.toast(start ? 'DEV · 任务一开始 · Mission One started' : 'DEV · 任务一重置 · Mission One reset', 2.4);
}

document.getElementById('begin').addEventListener('click', begin);
document.getElementById('pause').addEventListener('click', () => { lock(); if (noLock) play(); });
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) { if (mode === 'pause') play(); }
  else if (!noLock && (mode === 'play' || mode === 'inspect' || mode === 'dialogue' || mode === 'pouch')) pause();
});
document.addEventListener('pointerlockerror', () => {
  // Pointer lock refused (embedded frame, or re-requested too soon after Esc)
  if (mode === 'play' && !document.pointerLockElement) { noLock = true; hud.toast('按住鼠标拖动来环顾 · Hold the mouse button and drag to look', 5); }
});
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'KeyE') {
    if (mode === 'inspect') closeInspect();
    else if (mode === 'dialogue') closeDialogue();
    else if (mode === 'pouch') mission1.viewKeep();
    else if (mode === 'play' && nearNpc) openDialogue();
    else if (mode === 'play' && nearPouch) openPouch('pickup');
    else if (mode === 'play' && nearClue) openInspect();
  } else if (e.code === 'KeyF') {
    if (mode === 'dialogue' && mission1 && mission1.offerPending) acceptOffer();
    else if (mode === 'pouch') mission1.viewHold(true);
    else if (mode === 'play' && mission1 && mission1.mission.carrying) openPouch('carried');
  } else if ((e.code === 'F8' || e.code === 'F9') && devControls) {
    e.preventDefault();
    devMission(e.code === 'F8');
  } else if (e.code === 'KeyC' && (mode === 'play' || mode === 'dialogue')) {
    subtitlesOn = !subtitlesOn;
    hud.toast(subtitlesOn ? '字幕开 · Subtitles on' : '字幕关 · Subtitles off', 1.6);
  } else if (e.code === 'KeyM') {
    hud.toast(audio.toggleMute() ? '静音 · Sound off' : '声音开 · Sound on', 1.6);
  } else if (e.code === 'Escape' && noLock) {
    if (mode === 'dialogue') closeDialogue();
    else if (mode === 'pouch') closePouch();
    else if (mode === 'play' || mode === 'inspect') pause();
    else if (mode === 'pause') play();
  } else if (e.code === 'Enter' && mode === 'entry') begin();
});
window.addEventListener('keyup', (e) => { if (e.code === 'KeyF' && mission1) mission1.viewHold(false); });
window.addEventListener('blur', () => { if (mission1) mission1.viewHold(false); });
window.addEventListener('blur', () => { if ((mode === 'play' || mode === 'dialogue') && noLock) pause(); });
player.onStep = (surface, running) => audio.step(surface, running);

// ---- frame ----
let nearClue = false, nearNpc = false, nearPouch = false, boundaryCooldown = 0;
const debug = { noReflect: false, freezeTraffic: false };   // freezeTraffic: screenshot tool only
const _v = new THREE.Vector3(), _d = new THREE.Vector3();

function wrapAngle(a) {
  let r = a;
  while (r > Math.PI) r -= Math.PI * 2;
  while (r < -Math.PI) r += Math.PI * 2;
  return r;
}

const _player = { x: 0, z: 0, vx: 0, vz: 0 };
function updateTraffic(dt) {
  const b = player.body;
  _player.x = b.x; _player.z = b.z; _player.vx = b.vx; _player.vz = b.vz;
  // on the promenade deck the player is nowhere near the road
  traffic.update(dt, { player: b.y > 1 ? null : _player });
  world.vehicles.update(traffic.vehicles);
  world.pedestrians.update(traffic.peds, dt);
  world.signals.update(traffic.controller);
  traffic.vehicles.forEach((v, i) => {
    const box = world.vehicleBoxes[i];
    if (!v.active) { box.minX = box.maxX = box.minZ = box.maxZ = 1e6; return; }
    box.minX = v.x - v.width / 2; box.maxX = v.x + v.width / 2;
    box.minZ = v.z - v.len / 2; box.maxZ = v.z + v.len / 2;
  });
}

function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; t += dt;
  if (!world) return;

  if (mode === 'entry') {             // a slow breath of camera movement behind the title
    player.yaw = L.spawn.yaw + Math.sin(t * 0.13) * 0.035;
    player.pitch = 0.1 + Math.sin(t * 0.09) * 0.02;
  } else if (mode === 'dialogue') {
    const targetPos = world.npcs.getSpeakerPosition('lin');
    const dx = targetPos.x - player.body.x;
    const dz = targetPos.z - player.body.z;
    const horiz = Math.hypot(dx, dz) || 1;
    const targetYaw = Math.atan2(-dx, -dz);
    const targetPitch = Math.max(-0.4, Math.min(0.4, Math.atan2(targetPos.y - (player.body.y + L.eye), horiz)));
    const lk = Math.min(1, dt * 4.5);
    player.yaw += wrapAngle(targetYaw - player.yaw) * lk;
    player.pitch += (targetPitch - player.pitch) * lk;
  }
  player.update(mode === 'pause' ? 0 : dt);

  world.sky.update(t); world.skyline.update(t); world.river.update(t, dt); world.bund.update(t); world.street.update(t);
  world.lighting.update(camera.position);
  audio.update(dt, player.body.x);
  if (dialogueAudio) dialogueAudio.updateListener();
  if (conversation) conversation.update(mode === 'pause' ? 0 : dt);
  world.npcs.update(t, mode === 'pause' ? 0 : dt, {
    activeSpeaker: conversation ? conversation.activeSpeaker : null,
    interacting: mode === 'dialogue',
    playerPos: player.body,
  });
  if (mission1) mission1.update();
  updateTraffic(mode === 'pause' || debug.freezeTraffic ? 0 : dt);
  world.pouch.update(camera, t);

  // interactables: missing-person notice + waterfront NPCs
  camera.getWorldDirection(_d);
  _v.copy(world.clue.focus).sub(camera.position);
  const clueDist = _v.length();
  nearClue = mode === 'play' && clueDist < 2.7 && _v.normalize().dot(_d) > 0.78;

  _v.copy(_pairPos).sub(camera.position);
  const npcDist = _v.length();
  nearNpc = mode === 'play' && npcDist < npcLayout.interactDistance && _v.normalize().dot(_d) > 0.55;

  nearPouch = false;
  if (mode === 'play' && mission1 && mission1.canPickUp()) {
    _v.copy(world.pouch.focus).sub(camera.position);
    nearPouch = _v.length() < 2.4 && _v.normalize().dot(_d) > 0.72;
  }

  if (nearClue) hud.prompt(true, clueRead ? '再看一眼 · Look again' : '查看启事 · Read the notice');
  else if (nearNpc) hud.prompt(true, mission1 && mission1.mission.carrying ? '交给老林 · Hand over the pouch' : '打招呼 · Greet');
  else if (nearPouch) hud.prompt(true, '拿起文件袋 · Pick up the pouch');
  else hud.prompt(false);

  // subtitles + interaction greeting bar
  const line = conversation ? conversation.currentLine : null;
  const audioStatus = dialogueAudio ? dialogueAudio.getStatus() : { labelZh: '', labelEn: '' };
  const sourceLabel = `${audioStatus.labelZh} · ${audioStatus.labelEn}`;
  if (mode === 'dialogue') {
    hud.subtitle(true, {
      speaker: line ? (T.dialogue.speakers[line.speaker] || '') : T.dialogue.speakers.lin,
      text: line ? line.text : '',
      source: sourceLabel,
      interacting: true,
      showText: subtitlesOn,
      offer: !!(mission1 && mission1.offerPending),
    });
  } else if (mode === 'play' && subtitlesOn && line && npcDist < npcLayout.audibility.maxDistance) {
    hud.subtitle(true, {
      speaker: T.dialogue.speakers[line.speaker] || '',
      text: line.text,
      source: sourceLabel,
      interacting: false,
      showText: true,
    });
  } else {
    hud.subtitle(false);
  }

  boundaryCooldown -= dt;
  if (mode === 'play' && player.body.hit === 'boundary' && boundaryCooldown < 0) {
    boundaryCooldown = 6;
    hud.toast(player.body.x < L.facadeX - 20 ? '前方施工，此路不通 · Hoarding: no way through' : '交通管制，请绕行 · Closed beyond the barriers', 3);
  }

  if (!debug.noReflect) world.river.renderReflection(R.renderer, scene, camera);
  R.renderer.info.reset();
  R.composer.render(dt);
  R.tick();
}
R.renderer.setAnimationLoop(frame);

// Small handle for automated checks and console poking; not used by the game itself.
window.__bund = debug;
Object.defineProperties(debug, Object.getOwnPropertyDescriptors({
  player, camera, scene, R, audio,
  get mode() { return mode; }, get nearClue() { return nearClue; }, get nearNpc() { return nearNpc; },
  get clueRead() { return clueRead; }, get subtitlesOn() { return subtitlesOn; },
  get conversation() { return conversation; }, get dialogueAudio() { return dialogueAudio; },
  get npcs() { return world ? world.npcs : null; },
  // Mission One integration surface: mission.start(source) / reset() / on('start'|'complete'|...)
  get mission() { return mission1 ? mission1.mission : null; },
  get mission1() { return mission1; }, get nearPouch() { return nearPouch; },
  get traffic() { return traffic; },
  start() { noLock = true; if (mode === 'entry') begin(); },
}));

boot().catch((err) => { console.error(err); hud.fail(err); });
