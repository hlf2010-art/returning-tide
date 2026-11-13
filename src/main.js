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
import { createConversation, computeDistanceGain } from './engine/conversation.js';
import { createHud } from './ui/hud.js';
import { createPouch, HELD_LAYER } from './world/pouch.js';
import { createMissionOne } from './missionOne.js';
import { pickTarget } from './engine/targeting.js';
import { createWeather } from './engine/weather.js';
import { createRain, RAIN_LAYER } from './world/rain.js';
import { weatherUniforms, ssrMask } from './world/materials.js';
import { underCover } from './world/layout.js';
import { colliders } from './world/layout.js';
import { crossing, addDynamicCollider } from './world/layout.js';
import { createTraffic } from './engine/traffic.js';
import { createVehicles } from './world/vehicles.js';
import { createSignals } from './world/signals.js';
import { createPedestrians } from './world/pedestrians.js';
import { loadPeople } from './world/people.js';
import { createRealNpcs } from './world/npcsReal.js';
import { createRealPedestrians } from './world/pedestriansReal.js';

const params = new URLSearchParams(location.search);
const canvas = document.getElementById('view');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(FOG_COLOR, 0.00085);
// Aerial perspective with height: the air near the street and the water is denser than the air at the
// skyline's tops, so towers rise out of the haze instead of fading uniformly. Applies to every fogged material.
THREE.ShaderChunk.fog_pars_vertex = THREE.ShaderChunk.fog_pars_vertex.replace('#ifdef USE_FOG', '#ifdef USE_FOG\n\tvarying float vFogY;');
THREE.ShaderChunk.fog_vertex = THREE.ShaderChunk.fog_vertex.replace('vFogDepth = - mvPosition.z;', 'vFogDepth = - mvPosition.z;\n\tvFogY = (inverse(viewMatrix) * mvPosition).y;');
THREE.ShaderChunk.fog_pars_fragment = THREE.ShaderChunk.fog_pars_fragment.replace('#ifdef USE_FOG', '#ifdef USE_FOG\n\tvarying float vFogY;');
THREE.ShaderChunk.fog_fragment = THREE.ShaderChunk.fog_fragment.replace('float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );',
  'float hd = fogDensity * mix(1.18, 0.9, smoothstep(0.0, 160.0, vFogY));\n\tfloat fogFactor = 1.0 - exp( - hd * hd * vFogDepth * vFogDepth );');
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
camera.layers.enable(HELD_LAYER); camera.layers.enable(RAIN_LAYER);
// Weather: clear <-> light drizzle only. Developer toggle F7 (dev builds / ?dev); ?weather=drizzle starts wet.
const weather = createWeather();
if (params.get('weather') === 'drizzle') weather.set('drizzle', { instant: true });
const HAZE_FOG = new THREE.Color(0.072, 0.108, 0.2), FOG_DENSITY = scene.fog.density, HAZE_DENSITY = 0.00028;
let weatherTime = 0, suUmbrella = 0;
const _pairPos = new THREE.Vector3(npcLayout.pairFocus.x, npcLayout.pairFocus.y, npcLayout.pairFocus.z);

async function boot() {
  await loadFonts([
    [`900 40px ${FONT.serif}`, ALL_TEXT], [`500 40px ${FONT.serif}`, ALL_TEXT],
    [`700 40px ${FONT.sans}`, ALL_TEXT], [`40px ${FONT.hand}`, ALL_TEXT],
  ]);
  const M = createMaterials();
  const sky = createSky(), skyline = createSkyline(), river = createRiver();
  const bund = createBund(M), promenade = createPromenade(M), street = createStreet(M), clue = createClue();
  // real people (Microsoft Rocketbox, MIT) when their files load; the hand-built figures otherwise
  let people = null;
  try { people = await loadPeople('./people/'); } catch (err) { console.warn('people assets unavailable, using simple figures', err); }
  const npcs = people ? createRealNpcs(people) : createNpcs(M);
  const pouch = createPouch();
  const rain = createRain();
  // the signal-controlled crossing: one controller, through traffic, background pedestrians
  traffic = createTraffic({ geom: crossing, vehicles: crossing.vehicles, peds: crossing.peds });
  const vehicles = createVehicles(crossing.vehicles), signals = createSignals();
  const pedestrians = people ? createRealPedestrians(traffic.peds, people) : createPedestrians(traffic.peds);
  const vehicleBoxes = traffic.vehicles.map(() => addDynamicCollider('vehicle'));
  traffic.vehicles.forEach((v, i) => { v.ice = ['taxi', 'sedan'].includes(crossing.vehicles[i].model); });   // petrol engines get an engine note
  scene.add(sky.mesh, skyline.group, river.group, bund.group, promenade.group, street.group, clue.mesh, npcs.group, ...pouch.meshes,
    vehicles.group, signals.group, pedestrians.group, rain.mesh);
  const lighting = createLighting(scene, street.lanterns);
  scene.updateMatrixWorld(true);
  captureEnvironment(R.renderer, scene);
  world = { sky, skyline, river, bund, street, clue, lighting, npcs, pouch, vehicles, signals, pedestrians, vehicleBoxes, rain };
  // wet-ground reflections: deck, pavements and carriageways, each with its own per-pixel mask
  const reflectors = [];
  scene.traverse((o) => { if (o.isMesh && (o.material === M.deck || o.material === M.sidewalk || o.material === M.asphalt)) { o.userData.ssrMask = ssrMask(o.material); reflectors.push(o); } });
  if (params.get('ssr') !== '0') R.setReflectors(reflectors);
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
    onViewClosed: () => { if (mode === 'pouch') exitInteraction(); },
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
  // pausing cancels an open interaction (it can be re-entered afterwards)
  if (mode === 'inspect') closeInspect();
  if (mode === 'dialogue') closeDialogue();
  if (mode === 'pouch') closePouch();
  if (mode !== 'play') return;
  mode = 'pause'; player.enabled = false; audio.setPaused(true);
  if (conversation) conversation.setPaused(true);
  hud.show('pause', true); hud.prompt(false); hud.subtitle(false);
}
// Every interaction enters and leaves through these two, so controls always come back the same
// way: movement re-enabled, held keys forgotten, the camera left exactly where it is (no snap).
function enterInteraction(m) {
  mode = m; player.enabled = false; player.clearInput(); hud.prompt(false);
  target = null;
}
function exitInteraction() {
  mode = 'play'; player.enabled = true; player.clearInput();
}
function openInspect() {
  enterInteraction('inspect'); hud.subtitle(false); hud.show('inspect', true);
}
function closeInspect() {
  hud.show('inspect', false);
  exitInteraction();
  if (!clueRead) {
    clueRead = true;
    hud.thought('末班轮渡。金陵东路渡口，沿江往南。', 'The last ferry. Jinling East Road pier, south along the water.');
  }
}
function openDialogue() {
  if (mode !== 'play') return;
  enterInteraction('dialogue');
  // Mission One decides what Old Lin says (offer / reminder / handoff); null = ordinary greeting
  const line = mission1 ? mission1.greetLine() : null;
  if (conversation) conversation.enterInteraction(line);
}
function closeDialogue() {
  if (conversation) conversation.exitInteraction();
  hud.subtitle(false);
  exitInteraction();
  if (mission1) mission1.dialogueClosed();
}
// E inside the dialogue: answer Old Lin's request if he made one, otherwise step back
function confirmDialogue() {
  const r = mission1 ? mission1.dialogueConfirm() : 'close';
  if (r === 'accept') { const line = mission1.accept(); if (line && conversation) conversation.enterInteraction(line); }
  else if (r === 'decline' || r === 'close') closeDialogue();
}
function openPouch() {
  if (mode !== 'play' || !mission1) return;
  if (mission1.openPickup()) { enterInteraction('pouch'); hud.subtitle(false); }
}
function closePouch() { if (mission1) mission1.closeView(false); if (mode === 'pouch') exitInteraction(); }
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
// ---- input: one key press does exactly one thing ----
// Priority, first match wins:
//   1. global toggles that never touch the world: M sound, C subtitles, F8/F9 (dev builds)
//   2. entry screen: Enter begins
//   3. pause: Esc (drag-look mode) resumes; nothing else
//   4. an open interaction owns E, W/S (arrows, wheel) and Esc:
//        inspect  E or Esc closes
//        dialogue W/S moves the highlighted answer; E confirms it (or steps back); Esc steps back
//        pouch    W/S moves the highlight; E confirms / hold E on "break the seal"; Esc leaves it
//   5. walking about: E acts on the single selected target, if there is one
const CHOICE_KEYS = { KeyW: -1, ArrowUp: -1, KeyS: 1, ArrowDown: 1 };
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const k = e.code;
  if (k === 'KeyM') { hud.toast(audio.toggleMute() ? '静音 · Sound off' : '声音开 · Sound on', 1.6); return; }
  if (k === 'KeyC' && (mode === 'play' || mode === 'dialogue')) {
    subtitlesOn = !subtitlesOn;
    hud.toast(subtitlesOn ? '字幕开 · Subtitles on' : '字幕关 · Subtitles off', 1.6);
    return;
  }
  if ((k === 'F8' || k === 'F9') && devControls) { e.preventDefault(); devMission(k === 'F8'); return; }
  if (k === 'F7' && devControls) {
    e.preventDefault();
    hud.toast(weather.toggle() === 'drizzle' ? 'DEV · 小雨 · Drizzle coming in' : 'DEV · 转晴 · Clearing', 2.4);
    return;
  }
  if (mode === 'entry') { if (k === 'Enter') begin(); return; }
  if (mode === 'pause') { if (k === 'Escape' && noLock) play(); return; }
  if (mode === 'inspect') { if (k === 'KeyE' || (k === 'Escape' && noLock)) closeInspect(); return; }
  if (mode === 'dialogue') {
    if (k in CHOICE_KEYS) { if (mission1) mission1.dialogueMove(CHOICE_KEYS[k]); e.preventDefault(); }
    else if (k === 'KeyE') confirmDialogue();
    else if (k === 'Escape' && noLock) closeDialogue();
    return;
  }
  if (mode === 'pouch') {
    if (k in CHOICE_KEYS) { mission1.viewMove(CHOICE_KEYS[k]); e.preventDefault(); }
    else if (k === 'KeyE') mission1.viewPress(true);
    else if (k === 'Escape' && noLock) closePouch();
    return;
  }
  if (mode === 'play') {
    if (k === 'KeyE') interact();
    else if (k === 'Escape' && noLock) pause();
  }
});
window.addEventListener('keyup', (e) => { if (e.code === 'KeyE' && mission1) mission1.viewPress(false); });
window.addEventListener('wheel', (e) => {
  const d = Math.sign(e.deltaY);
  if (!d) return;
  if (mode === 'dialogue' && mission1) mission1.dialogueMove(d);
  else if (mode === 'pouch' && mission1) mission1.viewMove(d);
}, { passive: true });
window.addEventListener('blur', () => { if (mission1) mission1.viewPress(false); });
window.addEventListener('blur', () => { if ((mode === 'play' || mode === 'dialogue' || mode === 'pouch' || mode === 'inspect') && noLock) pause(); });

// E while walking: act on the one selected target
function interact() {
  if (!target) return;
  if (target.id === 'lin') openDialogue();
  else if (target.id === 'pouch') openPouch();
  else if (target.id === 'notice') openInspect();
}
player.onStep = (surface, running, landing) => audio.step(surface, running, landing);
// If the browser kept the context suspended despite the Begin click, any later gesture wakes it.
for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, () => {
  const c = audio.getContext();
  if (c && c.state === 'suspended' && !audio.paused && mode !== 'pause') c.resume();
});

// ---- frame ----
let target = null, boundaryCooldown = 0;   // target: { id, dist, cos } or null
const debug = { noReflect: false, freezeTraffic: false };   // freezeTraffic: screenshot tool only
const _v = new THREE.Vector3(), _d = new THREE.Vector3();

function wrapAngle(a) {
  let r = a;
  while (r > Math.PI) r -= Math.PI * 2;
  while (r < -Math.PI) r += Math.PI * 2;
  return r;
}

// what the prompt says for each target: who / what, then the action E will take
const PROMPTS = {
  lin: () => ({ target: '老林 Old Lin', action: mission1 && mission1.mission.carrying ? '交还文件袋 · Hand over the pouch' : '交谈 · Talk' }),
  notice: () => ({ target: '寻人启事 Notice', action: clueRead ? '再看一眼 · Look again' : '查看 · Read' }),
  pouch: () => ({ target: '文件袋 Pouch', action: '查看 · Look' }),
};
const _player = { x: 0, z: 0, vx: 0, vz: 0 };
function updateTraffic(dt) {
  const b = player.body;
  _player.x = b.x; _player.z = b.z; _player.vx = b.vx; _player.vz = b.vz;
  // on the promenade deck the player is nowhere near the road
  traffic.update(dt, { player: b.y > 1 ? null : _player, rain: weather.rain });
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

  // weather (frozen while paused): every value is exactly the approved clear scene at 0
  if (mode !== 'pause') {
    weather.update(dt); weatherTime += dt;
    // Ms. Su opens her umbrella once it is properly drizzling, folds it when it has stopped
    const want = weather.rain > 0.3 ? 1 : weather.rain < 0.08 ? 0 : suUmbrella > 0.5 ? 1 : 0;
    suUmbrella = Math.max(0, Math.min(1, suUmbrella + (want ? dt : -dt) / 1.4));
  }
  world.rain.update(weatherTime, weather.rain, camera);
  weatherUniforms.wetBoost.value = weather.wet;
  weatherUniforms.rainRipples.value = weather.rain; weatherUniforms.rippleTime.value = weatherTime;
  scene.fog.density = FOG_DENSITY + HAZE_DENSITY * weather.haze;
  scene.fog.color.lerpColors(FOG_COLOR, HAZE_FOG, weather.haze);
  audio.setRain(weather.rain, underCover(player.body.x, player.body.z, player.body.y + L.eye));
  world.sky.update(t, weather.haze); world.skyline.update(t); world.river.update(t, dt); world.bund.update(t); world.street.update(t);
  world.lighting.update(camera.position);
  // environment yields to NPC speech: fully while in conversation, by audibility otherwise
  let speech = 0;
  if (conversation && conversation.isSpeaking) speech = mode === 'dialogue' ? 1 : computeDistanceGain(_pairPos.distanceTo(camera.position), npcLayout.audibility.refDistance, npcLayout.audibility.maxDistance);
  audio.update(mode === 'pause' ? 0 : dt, player.body.x, { z: player.body.z, vehicles: traffic ? traffic.vehicles : null, speech });
  if (dialogueAudio) dialogueAudio.updateListener();
  if (conversation) conversation.update(mode === 'pause' ? 0 : dt);
  world.npcs.update(t, mode === 'pause' ? 0 : dt, {
    activeSpeaker: conversation ? conversation.activeSpeaker : null,
    interacting: mode === 'dialogue',
    playerPos: player.body,
    umbrella: suUmbrella,
  });
  if (mission1) mission1.update();
  updateTraffic(mode === 'pause' || debug.freezeTraffic ? 0 : dt);
  world.pouch.update(camera, t);

  // interactables: ONE target at a time - within reach, in view, not hidden behind a wall or a person
  camera.getWorldDirection(_d);
  const npcDist = _pairPos.distanceTo(camera.position);           // subtitles still use the pair's distance
  target = null;
  if (mode === 'play') {
    const head = world.npcs.getSpeakerPosition('lin'), cf = world.clue.focus, pf = world.pouch.focus;
    const cands = [
      { id: 'lin', x: head.x, y: head.y - 0.1, z: head.z, reach: npcLayout.interactDistance, cone: 0.72, ignore: ['lin'] },
      { id: 'notice', x: cf.x, y: cf.y, z: cf.z, reach: 2.7, cone: 0.78 },
    ];
    if (mission1 && mission1.canPickUp()) cands.push({ id: 'pouch', x: pf.x, y: pf.y, z: pf.z, reach: 2.4, cone: 0.72 });
    target = pickTarget(camera.position, _d, cands, colliders);
  }
  if (target) hud.prompt(true, PROMPTS[target.id]());
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
      choices: mission1 ? mission1.dialogueChoices : null,
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
  get mode() { return mode; }, get target() { return target; },
  get nearClue() { return !!target && target.id === 'notice'; }, get nearNpc() { return !!target && target.id === 'lin'; },
  get clueRead() { return clueRead; }, get subtitlesOn() { return subtitlesOn; },
  get conversation() { return conversation; }, get dialogueAudio() { return dialogueAudio; },
  get npcs() { return world ? world.npcs : null; },
  // Mission One integration surface: mission.start(source) / reset() / on('start'|'complete'|...)
  get mission() { return mission1 ? mission1.mission : null; },
  get mission1() { return mission1; }, get nearPouch() { return !!target && target.id === 'pouch'; },
  get traffic() { return traffic; }, weather, THREE,                // THREE: for verification tools only
  get pedestrians() { return world ? world.pedestrians : null; },
  start() { noLock = true; if (mode === 'entry') begin(); },
}));

boot().catch((err) => { console.error(err); hud.fail(err); });
